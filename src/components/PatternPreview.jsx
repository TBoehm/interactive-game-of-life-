import { useEffect, useRef } from 'react'
import { Life } from '../lib/engine'
import { createTopology, DEFAULT_RULES } from '../lib/topology'

const BOX = 116 // preview size in CSS pixels
const FPS = 7

// Animated 2D catalog preview: runs the real engine on a tiny grid so
// oscillators pulse and spaceships travel, drawn in the pattern's own color via
// the topology's cell polygons (square/hex/triangle). 3D previews use Preview3D.
export default function PatternPreview({ kind, cells, color, moves }) {
  const canvasRef = useRef(null)
  // Depend on primitive color channels, not the object identity: the parent
  // re-renders ~12x/s while the simulation runs and passes a fresh color object
  // each time, which would otherwise restart this effect and clear the
  // animation interval before it ever fires.
  const { r: cr, g: cg, b: cb } = color

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const spawnColor = { r: cr, g: cg, b: cb }
    const colorStr = `rgb(${cr},${cg},${cb})`
    const rule = DEFAULT_RULES[kind]

    let maxX = 0
    let maxY = 0
    for (const [x, y] of cells) {
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }

    const pad = moves ? 7 : 3
    const cols = maxX + 1 + pad * 2
    const rows = maxY + 1 + pad * 2
    let ox = pad
    let oy = pad
    // parity-sensitive placement (same rule as the live spawner)
    if (kind === 'hex' && oy & 1) oy += 1
    else if (kind === 'triangle' && (ox + oy) & 1) oy += 1

    const cellPx = 10
    const topo = createTopology(kind, cols, rows, cellPx, rule)
    const initIdx = cells.map(([x, y]) => (oy + y) * cols + (ox + x))
    const life = new Life(topo)

    const paths = new Array(topo.size)
    for (let i = 0; i < topo.size; i++) {
      const pts = topo.polygons[i]
      const p = new Path2D()
      p.moveTo(pts[0], pts[1])
      for (let v = 2; v < pts.length; v += 2) p.lineTo(pts[v], pts[v + 1])
      p.closePath()
      paths[i] = p
    }

    const W = topo.canvasW
    const H = topo.canvasH
    const scale = BOX / Math.max(W, H)
    canvas.width = Math.round(W * dpr)
    canvas.height = Math.round(H * dpr)
    canvas.style.width = `${W * scale}px`
    canvas.style.height = `${H * scale}px`

    const render = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.fillStyle = '#0e1018'
      ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = colorStr
      const { alive } = life
      for (let i = 0; i < topo.size; i++) {
        if (alive[i]) ctx.fill(paths[i])
      }
    }

    const spawn = () => {
      life.clear()
      life.spawnCells(initIdx, spawnColor)
    }
    // Square is toroidal, so spaceships loop on their own; bounded grids
    // (hex/triangle) re-center moving patterns periodically so they keep looping.
    const resetEvery = moves && kind !== 'square' ? 16 : 0

    spawn()
    render()
    let frame = 0
    const id = setInterval(() => {
      life.step()
      frame += 1
      if (resetEvery && frame % resetEvery === 0) spawn()
      render()
    }, 1000 / FPS)

    return () => clearInterval(id)
  }, [kind, cells, cr, cg, cb, moves])

  return <canvas ref={canvasRef} className="preview-canvas" />
}
