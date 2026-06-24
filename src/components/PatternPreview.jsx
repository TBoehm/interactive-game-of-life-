import { useEffect, useRef } from 'react'
import { Life } from '../lib/engine'
import { createTopology, create3DTopology, DEFAULT_RULES } from '../lib/topology'

const BOX = 116 // preview size in CSS pixels
const FPS = 7

// Animated catalog preview: runs the real engine on a tiny grid so oscillators
// pulse and spaceships travel, drawn in the pattern's own color. 2D modes draw
// the topology's cell polygons; the 3D mode uses a lightweight isometric
// projection (no WebGL, so many previews can run at once).
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
    let maxZ = 0
    for (const c of cells) {
      if (c[0] > maxX) maxX = c[0]
      if (c[1] > maxY) maxY = c[1]
      if (c.length > 2 && c[2] > maxZ) maxZ = c[2]
    }

    let life
    let render
    let initIdx
    let topo

    if (kind === 'life3d') {
      const pad = 3
      const N = Math.max(maxX, maxY, maxZ) + 1 + pad * 2
      topo = create3DTopology(N, N, N, rule)
      const o = pad
      initIdx = cells.map(([x, y, z]) => ((o + z) * N + (o + y)) * N + (o + x))
      life = new Life(topo)

      // Center the projection on the pattern (not the padded grid) and scale by
      // the pattern's own extent so it fills the preview box.
      const cx = pad + maxX / 2
      const cy = pad + maxY / 2
      const cz = pad + maxZ / 2
      const extent = Math.max(maxX, maxY, maxZ) + 1
      const u = (BOX * 0.62) / (extent + 1.5)
      const proj = (x, y, z) => [
        BOX / 2 + (x - cx - (z - cz)) * u * 0.87,
        BOX / 2 + (x - cx + (z - cz)) * u * 0.5 - (y - cy) * u,
      ]
      canvas.width = Math.round(BOX * dpr)
      canvas.height = Math.round(BOX * dpr)
      canvas.style.width = `${BOX}px`
      canvas.style.height = `${BOX}px`

      const s = u * 0.92
      const shade = (k) => `rgb(${(cr * k) | 0},${(cg * k) | 0},${(cb * k) | 0})`
      const face = (pts, k) => {
        ctx.fillStyle = shade(k)
        ctx.beginPath()
        ctx.moveTo(pts[0], pts[1])
        for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1])
        ctx.closePath()
        ctx.fill()
      }

      render = () => {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.fillStyle = '#0e1018'
        ctx.fillRect(0, 0, BOX, BOX)
        const { nx, ny } = topo
        const { alive } = life
        const list = []
        for (let i = 0; i < topo.size; i++) {
          if (!alive[i]) continue
          const x = i % nx
          const y = ((i / nx) | 0) % ny
          const z = (i / (nx * ny)) | 0
          list.push([x, y, z])
        }
        // painter's order: draw far (back, lower) cells first
        list.sort((a, b) => a[0] + a[2] - a[1] - (b[0] + b[2] - b[1]))
        const w = s * 0.87
        for (const [x, y, z] of list) {
          const [px, py] = proj(x, y, z)
          // top face (lightest), then left, then right (darkest) -> reads as a cube
          face([px, py - s, px + w, py - s * 0.5, px, py, px - w, py - s * 0.5], 1)
          face([px - w, py - s * 0.5, px, py, px, py + s, px - w, py + s * 0.5], 0.66)
          face([px, py, px + w, py - s * 0.5, px + w, py + s * 0.5, px, py + s], 0.46)
        }
      }
    } else {
      const pad = moves ? 7 : 3
      const cols = maxX + 1 + pad * 2
      const rows = maxY + 1 + pad * 2
      let ox = pad
      let oy = pad
      // parity-sensitive placement (same rule as the live spawner)
      if (kind === 'hex' && oy & 1) oy += 1
      else if (kind === 'triangle' && (ox + oy) & 1) oy += 1

      const cellPx = 10
      topo = createTopology(kind, cols, rows, cellPx, rule)
      initIdx = cells.map(([x, y]) => (oy + y) * cols + (ox + x))
      life = new Life(topo)

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

      render = () => {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.fillStyle = '#0e1018'
        ctx.fillRect(0, 0, W, H)
        ctx.fillStyle = colorStr
        const { alive } = life
        for (let i = 0; i < topo.size; i++) {
          if (alive[i]) ctx.fill(paths[i])
        }
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
