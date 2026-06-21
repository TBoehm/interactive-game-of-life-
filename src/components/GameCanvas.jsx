import { useEffect, useRef } from 'react'
import { Life } from '../lib/engine'
import { randomColor } from '../lib/color'
import { randomPattern, patternSize } from '../lib/patterns'
import { createTopology, cellAt } from '../lib/topology'

// Pixel size per cell, chosen per topology (hex/triangle look better larger).
const CELL_PX = { square: 8, hex: 12, triangle: 16 }

// Renders the simulation for any topology and handles click-to-spawn.
// Square uses a fast ImageData path; hex/triangle fill precomputed Path2D
// polygons for their live cells.
export default function GameCanvas({
  kind,
  rule,
  running,
  speed,
  stepSignal,
  clearSignal,
  randomSignal,
  onStats,
}) {
  const canvasRef = useRef(null)
  const lifeRef = useRef(null)
  const topoRef = useRef(null)
  const pathsRef = useRef(null) // Path2D[] for hex/triangle
  const offscreenRef = useRef(null) // {canvas, ctx, image} for square
  const rafRef = useRef(0)
  const lastStepRef = useRef(0)

  const runningRef = useRef(running)
  const speedRef = useRef(speed)
  useEffect(() => {
    runningRef.current = running
  }, [running])
  useEffect(() => {
    speedRef.current = speed
  }, [speed])

  const ruleKey = `${kind}:${rule.birth.join(',')}/${rule.survival.join(',')}`

  // ---- Spawning -------------------------------------------------------------
  function spawnAtCell(cellIndex) {
    const life = lifeRef.current
    const topo = topoRef.current
    if (!life || !topo) return
    const color = randomColor()

    if (topo.kind === 'square') {
      // Classic square patterns translate directly.
      const pattern = randomPattern()
      const { width, height } = patternSize(pattern)
      const cx = cellIndex % topo.cols
      const cy = (cellIndex / topo.cols) | 0
      life.spawnPattern(pattern.cells, cx - (width >> 1), cy - (height >> 1), color)
      return pattern.name
    }

    // Hex/triangle: square patterns are meaningless, so seed a small random
    // cluster (a "soup blob") around the clicked cell and let the rule evolve.
    const indices = new Set([cellIndex])
    const { neighbors, degree, maxDegree } = topo
    const base = cellIndex * maxDegree
    for (let k = 0; k < degree[cellIndex]; k++) {
      if (Math.random() < 0.7) indices.add(neighbors[base + k])
    }
    // a few second-ring cells for variety
    for (const i of Array.from(indices)) {
      const b2 = i * maxDegree
      for (let k = 0; k < degree[i]; k++) {
        if (Math.random() < 0.2) indices.add(neighbors[b2 + k])
      }
    }
    life.spawnCells(indices, color)
    return 'Cluster'
  }

  function spawnRandomLocation() {
    const topo = topoRef.current
    if (!topo) return
    spawnAtCell((Math.random() * topo.size) | 0)
  }

  // ---- Build / rebuild on topology or rule change ---------------------------
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const cellPx = CELL_PX[kind] ?? 8

    function gridDims(cssW, cssH) {
      if (kind === 'hex') {
        const r = cellPx
        const hexW = Math.sqrt(3) * r
        return {
          cols: Math.max(4, Math.floor(cssW / hexW)),
          rows: Math.max(4, Math.floor((cssH - 0.5 * r) / (1.5 * r))),
        }
      }
      if (kind === 'triangle') {
        const L = cellPx
        const h = (L * Math.sqrt(3)) / 2
        return {
          cols: Math.max(6, Math.floor(cssW / (L / 2))),
          rows: Math.max(6, Math.floor(cssH / h)),
        }
      }
      return {
        cols: Math.max(8, Math.floor(cssW / cellPx)),
        rows: Math.max(8, Math.floor(cssH / cellPx)),
      }
    }

    function buildGrid(seed) {
      const rect = canvas.parentElement.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      const cssW = Math.max(320, Math.floor(rect.width))
      const cssH = Math.max(320, Math.floor(rect.height))
      const { cols, rows } = gridDims(cssW, cssH)

      const topo = createTopology(kind, cols, rows, cellPx, rule)
      topoRef.current = topo

      canvas.width = Math.floor(cssW * dpr)
      canvas.height = Math.floor(cssH * dpr)
      canvas.style.width = `${cssW}px`
      canvas.style.height = `${cssH}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      if (kind === 'square') {
        const off = document.createElement('canvas')
        off.width = cols
        off.height = rows
        const octx = off.getContext('2d')
        offscreenRef.current = { canvas: off, ctx: octx, image: octx.createImageData(cols, rows) }
        pathsRef.current = null
      } else {
        // Precompute one Path2D per cell from the topology polygons.
        const paths = new Array(topo.size)
        for (let i = 0; i < topo.size; i++) {
          const pts = topo.polygons[i]
          const p = new Path2D()
          p.moveTo(pts[0], pts[1])
          for (let v = 2; v < pts.length; v += 2) p.lineTo(pts[v], pts[v + 1])
          p.closePath()
          paths[i] = p
        }
        pathsRef.current = paths
        offscreenRef.current = null
      }

      const life = new Life(topo)
      lifeRef.current = life
      if (seed) for (let i = 0; i < 3; i++) spawnRandomLocation()
      onStats?.({ generation: 0, population: life.population })
    }

    buildGrid(true)

    function render() {
      const life = lifeRef.current
      const topo = topoRef.current
      if (!life || !topo) return

      if (topo.kind === 'square') {
        const off = offscreenRef.current
        const { image } = off
        const data = image.data
        const { alive, r, g, b, size } = life
        for (let i = 0; i < size; i++) {
          const j = i * 4
          if (alive[i]) {
            data[j] = r[i]
            data[j + 1] = g[i]
            data[j + 2] = b[i]
            data[j + 3] = 255
          } else {
            data[j] = 14
            data[j + 1] = 16
            data[j + 2] = 24
            data[j + 3] = 255
          }
        }
        off.ctx.putImageData(image, 0, 0)
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(off.canvas, 0, 0, topo.canvasW, topo.canvasH)
        return
      }

      // Hex / triangle: fill live polygons over a dark background.
      const paths = pathsRef.current
      ctx.fillStyle = '#0e1018'
      ctx.fillRect(0, 0, topo.canvasW + cellPx, topo.canvasH + cellPx)
      const { alive, r, g, b, size } = life
      for (let i = 0; i < size; i++) {
        if (!alive[i]) continue
        ctx.fillStyle = `rgb(${r[i]},${g[i]},${b[i]})`
        ctx.fill(paths[i])
      }
    }

    function loop(ts) {
      const life = lifeRef.current
      if (life) {
        const interval = 1000 / speedRef.current
        if (runningRef.current && ts - lastStepRef.current >= interval) {
          life.step()
          lastStepRef.current = ts
          onStats?.({ generation: life.generation, population: life.population })
        }
        render()
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    const onResize = () => {
      buildGrid(false)
      render()
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', onResize)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, ruleKey])

  // ---- Control signals ------------------------------------------------------
  useEffect(() => {
    if (stepSignal === 0) return
    const life = lifeRef.current
    if (life) {
      life.step()
      onStats?.({ generation: life.generation, population: life.population })
    }
  }, [stepSignal]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (clearSignal === 0) return
    const life = lifeRef.current
    if (life) {
      life.clear()
      onStats?.({ generation: 0, population: 0 })
    }
  }, [clearSignal]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (randomSignal === 0) return
    const life = lifeRef.current
    if (life) {
      for (let i = 0; i < 6; i++) spawnRandomLocation()
      onStats?.({ generation: life.generation, population: life.population })
    }
  }, [randomSignal]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Click to spawn -------------------------------------------------------
  function handleClick(e) {
    const topo = topoRef.current
    const life = lifeRef.current
    if (!topo || !life) return
    const rect = canvasRef.current.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * topo.canvasW
    const py = ((e.clientY - rect.top) / rect.height) * topo.canvasH

    let index
    if (topo.kind === 'square') {
      const cellPx = CELL_PX.square
      const cx = Math.min(topo.cols - 1, Math.max(0, Math.floor(px / cellPx)))
      const cy = Math.min(topo.rows - 1, Math.max(0, Math.floor(py / cellPx)))
      index = cy * topo.cols + cx
    } else {
      index = cellAt(topo, px, py)
    }
    const label = spawnAtCell(index)
    onStats?.({
      generation: life.generation,
      population: life.population,
      lastPattern: label,
    })
  }

  return (
    <div className="canvas-wrap">
      <canvas ref={canvasRef} onClick={handleClick} />
    </div>
  )
}
