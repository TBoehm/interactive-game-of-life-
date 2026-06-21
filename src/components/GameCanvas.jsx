import { useEffect, useRef } from 'react'
import { Life } from '../lib/engine'
import { randomColor } from '../lib/color'
import { randomPattern, randomHexPattern, randomTriPattern, patternSize } from '../lib/patterns'
import { createTopology, cellAt } from '../lib/topology'
import { createFadeState, stepFade, easing, fadeDuration } from '../lib/fade'

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
  fade,
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
  const fadeRef = useRef(null) // per-cell fade state for cross-fading
  const rafRef = useRef(0)
  const lastStepRef = useRef(0)
  const lastFrameRef = useRef(0)

  const runningRef = useRef(running)
  const speedRef = useRef(speed)
  const fadeRefProp = useRef(fade)
  useEffect(() => {
    runningRef.current = running
  }, [running])
  useEffect(() => {
    speedRef.current = speed
  }, [speed])
  useEffect(() => {
    fadeRefProp.current = fade
  }, [fade])

  const ruleKey = `${kind}:${rule.label}`

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

    // Hex (B2o/S2m34H) and triangle (Bays Life 4546) both spawn real creatures
    // harvested offline. Their coordinates are parity-sensitive: hex assumes an
    // even-row origin; triangle assumes an even (col+row) origin (which fixes
    // the up/down triangle orientation). Snap the origin accordingly.
    const pattern = topo.kind === 'hex' ? randomHexPattern() : randomTriPattern()
    const { width, height } = patternSize(pattern)
    const cx = cellIndex % topo.cols
    const cy = (cellIndex / topo.cols) | 0
    const ox = cx - (width >> 1)
    let oy = cy - (height >> 1)
    if (topo.kind === 'hex') {
      if (oy & 1) oy -= 1
    } else if ((ox + oy) & 1) {
      oy -= 1
    }
    const indices = []
    for (const [dx, dy] of pattern.cells) {
      const col = ox + dx
      const row = oy + dy
      if (col >= 0 && col < topo.cols && row >= 0 && row < topo.rows) {
        indices.push(row * topo.cols + col)
      }
    }
    life.spawnCells(indices, color)
    return pattern.name
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
      fadeRef.current = createFadeState(topo.size)
      if (seed) for (let i = 0; i < 3; i++) spawnRandomLocation()
      onStats?.({ generation: 0, population: life.population })
    }

    buildGrid(true)

    // Background color (matches --bg), used as the fade floor.
    const BG = [14, 16, 24]

    function render(k) {
      const life = lifeRef.current
      const topo = topoRef.current
      const fs = fadeRef.current
      if (!life || !topo || !fs) return
      stepFade(fs, life, k)
      const { fade, r, g, b } = fs
      const { size } = life

      if (topo.kind === 'square') {
        const off = offscreenRef.current
        const data = off.image.data
        for (let i = 0; i < size; i++) {
          const f = fade[i]
          const j = i * 4
          data[j] = BG[0] + (r[i] - BG[0]) * f
          data[j + 1] = BG[1] + (g[i] - BG[1]) * f
          data[j + 2] = BG[2] + (b[i] - BG[2]) * f
          data[j + 3] = 255
        }
        off.ctx.putImageData(off.image, 0, 0)
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(off.canvas, 0, 0, topo.canvasW, topo.canvasH)
        return
      }

      // Hex / triangle: fill cells, blended toward the background by fade.
      const paths = pathsRef.current
      ctx.fillStyle = '#0e1018'
      ctx.fillRect(0, 0, topo.canvasW + cellPx, topo.canvasH + cellPx)
      for (let i = 0; i < size; i++) {
        const f = fade[i]
        if (f < 0.02) continue
        const cr = (BG[0] + (r[i] - BG[0]) * f) | 0
        const cg = (BG[1] + (g[i] - BG[1]) * f) | 0
        const cb = (BG[2] + (b[i] - BG[2]) * f) | 0
        ctx.fillStyle = `rgb(${cr},${cg},${cb})`
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
        const dt = lastFrameRef.current ? ts - lastFrameRef.current : 16
        lastFrameRef.current = ts
        render(fadeRefProp.current ? easing(dt, fadeDuration(interval)) : 1)
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    const onResize = () => {
      buildGrid(false)
      render(1)
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
