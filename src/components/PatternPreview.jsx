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

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const colorStr = `rgb(${color.r},${color.g},${color.b})`
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
      const pad = 4
      const N = Math.max(maxX, maxY, maxZ) + 1 + pad * 2
      topo = create3DTopology(N, N, N, rule)
      const o = pad
      initIdx = cells.map(([x, y, z]) => ((o + z) * N + (o + y)) * N + (o + x))
      life = new Life(topo)

      const c = (N - 1) / 2
      const u = (BOX * 0.4) / N
      const proj = (x, y, z) => [
        BOX / 2 + (x - c - (z - c)) * u * 0.87,
        BOX / 2 + (x - c + (z - c)) * u * 0.5 - (y - c) * u,
      ]
      canvas.width = Math.round(BOX * dpr)
      canvas.height = Math.round(BOX * dpr)
      canvas.style.width = `${BOX}px`
      canvas.style.height = `${BOX}px`

      render = () => {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.fillStyle = '#0e1018'
        ctx.fillRect(0, 0, BOX, BOX)
        const { alive, nx, ny } = topo
        const list = []
        for (let i = 0; i < topo.size; i++) {
          if (!alive[i]) continue
          const x = i % nx
          const y = ((i / nx) | 0) % ny
          const z = (i / (nx * ny)) | 0
          list.push([x, y, z])
        }
        list.sort((a, b) => a[0] + a[2] - a[1] - (b[0] + b[2] - b[1]))
        const size = Math.max(3, u * 1.7)
        for (const [x, y, z] of list) {
          const [sx, sy] = proj(x, y, z)
          ctx.fillStyle = colorStr
          ctx.fillRect(sx - size / 2, sy - size / 2, size, size)
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
      life.spawnCells(initIdx, color)
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
  }, [kind, cells, color, moves])

  return <canvas ref={canvasRef} className="preview-canvas" />
}
