import { useEffect, useRef } from 'react'
import { Life } from '../lib/engine'
import { randomColor } from '../lib/color'
import { randomPattern, patternSize } from '../lib/patterns'

const CELL_SIZE = 8 // device-independent pixels per cell

// Renders the simulation onto a <canvas> and handles click-to-spawn.
// The heavy lifting (engine, render loop) lives outside React's state so we
// never re-render per frame; React only drives the control props.
export default function GameCanvas({
  running,
  speed,
  stepSignal,
  clearSignal,
  randomSignal,
  onStats,
}) {
  const canvasRef = useRef(null)
  const offscreenRef = useRef(null)
  const lifeRef = useRef(null)
  const rafRef = useRef(0)
  const lastStepRef = useRef(0)

  // Keep the latest control values in refs so the animation loop (created once)
  // always sees current values without restarting.
  const runningRef = useRef(running)
  const speedRef = useRef(speed)
  useEffect(() => { runningRef.current = running }, [running])
  useEffect(() => { speedRef.current = speed }, [speed])

  // Spawn one random pattern in a random color at a given cell (centered).
  function spawnAt(cellX, cellY) {
    const life = lifeRef.current
    if (!life) return
    const pattern = randomPattern()
    const { width, height } = patternSize(pattern)
    const ox = cellX - (width >> 1)
    const oy = cellY - (height >> 1)
    life.spawn(pattern.cells, ox, oy, randomColor())
    return pattern
  }

  function spawnRandomLocation() {
    const life = lifeRef.current
    if (!life) return
    spawnAt(
      Math.floor(Math.random() * life.width),
      Math.floor(Math.random() * life.height),
    )
  }

  // ---- Setup: size the grid, build engine, start the loop -------------------
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    function buildGrid() {
      const rect = canvas.parentElement.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      const cssW = Math.max(320, Math.floor(rect.width))
      const cssH = Math.max(320, Math.floor(rect.height))
      const cols = Math.floor(cssW / CELL_SIZE)
      const rows = Math.floor(cssH / CELL_SIZE)

      canvas.width = Math.floor(cssW * dpr)
      canvas.height = Math.floor(cssH * dpr)
      canvas.style.width = `${cssW}px`
      canvas.style.height = `${cssH}px`

      // Offscreen buffer at grid resolution; we draw 1px per cell then scale up.
      const off = document.createElement('canvas')
      off.width = cols
      off.height = rows
      offscreenRef.current = {
        canvas: off,
        ctx: off.getContext('2d'),
        image: off.getContext('2d').createImageData(cols, rows),
      }

      const prev = lifeRef.current
      const life = new Life(cols, rows)
      lifeRef.current = life

      // Seed an initial structure so the board isn't empty on first load.
      if (!prev) {
        for (let i = 0; i < 3; i++) spawnRandomLocation()
      }
    }

    buildGrid()

    function render() {
      const life = lifeRef.current
      const off = offscreenRef.current
      if (!life || !off) return
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
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(off.canvas, 0, 0, canvas.width, canvas.height)
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
      buildGrid()
      render()
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', onResize)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- React-driven control signals -----------------------------------------
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
    const life = lifeRef.current
    if (!life) return
    const rect = canvasRef.current.getBoundingClientRect()
    const cellX = Math.floor(((e.clientX - rect.left) / rect.width) * life.width)
    const cellY = Math.floor(((e.clientY - rect.top) / rect.height) * life.height)
    const pattern = spawnAt(cellX, cellY)
    onStats?.({
      generation: life.generation,
      population: life.population,
      lastPattern: pattern?.name,
    })
  }

  return (
    <div className="canvas-wrap">
      <canvas ref={canvasRef} onClick={handleClick} />
    </div>
  )
}
