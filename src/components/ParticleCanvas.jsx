import { useEffect, useRef } from 'react'
import { ParticleLife } from '../lib/particle/physics'
import { createWorld, substepsFor } from '../lib/particle/world'
import { typeColors, toCss } from '../lib/particle/palette'

// 2D renderer for Particle Life, built like GameCanvas: the component owns the
// simulation in a ref, drives it from a single requestAnimationFrame loop and
// reacts to the same style of signal props.
//
// Two rendering details matter for performance. Particles are drawn as small
// squares (fillRect) rather than circles — at three pixels the difference is
// invisible and arc() is several times slower. And the loop is nested by type
// so fillStyle is set once per type instead of once per particle.
//
// Trails are the counterpart to the Game of Life's cross-fade: instead of
// clearing the canvas, the previous frame is dimmed by drawing a translucent
// background over it, which leaves a short comet tail behind every particle.

const BG = '#0e1018'
const BG_TRAIL = 'rgba(14, 16, 24, 0.3)'

export default function ParticleCanvas({
  params,
  matrix,
  running,
  speed,
  trails,
  stepSignal,
  clearSignal,
  reseedSignal,
  onStats,
}) {
  const canvasRef = useRef(null)
  const simRef = useRef(null)
  const colorsRef = useRef([])
  const rafRef = useRef(0)

  const runningRef = useRef(running)
  const speedRef = useRef(speed)
  const trailsRef = useRef(trails)
  const paramsRef = useRef(params)
  const matrixRef = useRef(matrix)
  const statsRef = useRef(onStats)

  useEffect(() => {
    runningRef.current = running
  }, [running])
  useEffect(() => {
    speedRef.current = speed
  }, [speed])
  useEffect(() => {
    trailsRef.current = trails
  }, [trails])
  useEffect(() => {
    statsRef.current = onStats
  }, [onStats])

  // ---- Build once, then keep the simulation alive across every change -------
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let lastStats = 0
    let frames = 0
    let fpsWindow = 0
    let fps = 0

    function measure() {
      const rect = canvas.parentElement.getBoundingClientRect()
      return {
        cssW: Math.max(320, Math.floor(rect.width)),
        cssH: Math.max(320, Math.floor(rect.height)),
      }
    }

    function fitCanvas(cssW, cssH) {
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.floor(cssW * dpr)
      canvas.height = Math.floor(cssH * dpr)
      canvas.style.width = `${cssW}px`
      canvas.style.height = `${cssH}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const { cssW, cssH } = measure()
    fitCanvas(cssW, cssH)
    const world = createWorld('particle2d', cssW, cssH, paramsRef.current)
    const sim = new ParticleLife(world, { matrix: matrixRef.current })
    simRef.current = sim
    colorsRef.current = toCss(typeColors(world.types))

    function render() {
      const s = simRef.current
      if (!s) return
      const { w, h, types, rmax } = s.world
      ctx.fillStyle = trailsRef.current ? BG_TRAIL : BG
      ctx.fillRect(0, 0, w, h)

      const dot = Math.max(2, Math.min(5, Math.round(rmax / 7)))
      const half = dot / 2
      const colors = colorsRef.current
      const { px, py, type, count } = s
      for (let t = 0; t < types; t++) {
        ctx.fillStyle = colors[t] ?? '#fff'
        for (let i = 0; i < count; i++) {
          if (type[i] !== t) continue
          ctx.fillRect(px[i] - half, py[i] - half, dot, dot)
        }
      }
    }

    function loop(ts) {
      const s = simRef.current
      if (s) {
        if (runningRef.current) {
          const steps = substepsFor(speedRef.current)
          for (let i = 0; i < steps; i++) s.step()
        }
        render()

        frames++
        if (ts - fpsWindow >= 500) {
          fps = Math.round((frames * 1000) / (ts - fpsWindow))
          frames = 0
          fpsWindow = ts
        }
        if (ts - lastStats >= 100) {
          lastStats = ts
          statsRef.current?.({
            time: s.time,
            count: s.count,
            types: s.world.types,
            activity: s.activity,
            fps,
          })
        }
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    // A resize rescales the world; applyWorld moves the particles along with
    // it instead of restarting, mirroring how GameCanvas preserves its grid.
    function onResize() {
      const size = measure()
      fitCanvas(size.cssW, size.cssH)
      const s = simRef.current
      if (!s) return
      s.applyWorld(createWorld('particle2d', size.cssW, size.cssH, paramsRef.current))
      render()
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', onResize)
      simRef.current = null
    }
  }, [])

  // ---- Parameter changes ----------------------------------------------------
  useEffect(() => {
    paramsRef.current = params
    const sim = simRef.current
    if (!sim) return
    sim.applyWorld(createWorld('particle2d', sim.world.w, sim.world.h, params))
    colorsRef.current = toCss(typeColors(sim.world.types))
  }, [params])

  // Runs after the parameter effect on purpose: when the type count changes the
  // app hands down a matching matrix, which must win over the one applyWorld
  // resized internally.
  useEffect(() => {
    matrixRef.current = matrix
    const sim = simRef.current
    if (sim && matrix && matrix.length === sim.world.types ** 2) sim.setMatrix(matrix)
  }, [matrix])

  // ---- Control signals ------------------------------------------------------
  useEffect(() => {
    if (stepSignal === 0) return
    simRef.current?.step()
  }, [stepSignal])

  useEffect(() => {
    if (clearSignal === 0) return
    simRef.current?.clear()
  }, [clearSignal])

  useEffect(() => {
    if (reseedSignal === 0) return
    simRef.current?.reseed()
  }, [reseedSignal])

  // ---- Interaction ----------------------------------------------------------
  function handleClick(e) {
    const sim = simRef.current
    if (!sim) return
    const rect = canvasRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * sim.world.w
    const y = ((e.clientY - rect.top) / rect.height) * sim.world.h
    if (e.shiftKey || sim.count === 0) sim.spawnBlob(x, y, 0, 80)
    else sim.pulse(x, y, 0, sim.world.rmax * 4)
  }

  return (
    <div className="canvas-wrap">
      <canvas ref={canvasRef} onClick={handleClick} />
    </div>
  )
}
