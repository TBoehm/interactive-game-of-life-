import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { ParticleLife } from '../lib/particle/physics'
import { createWorld, substepsFor } from '../lib/particle/world'
import { typeColors } from '../lib/particle/palette'

// World units (= CSS pixels). Sized against the default camera distance so a
// particle reads as a dot, not a speck.
const POINT_SIZE = 6
const TRAIL_SIZE = 8
const STATS_MS = 100 // stats are read by React state, so throttle to ~10 Hz

// Particle Life in 3D, rendered with Three.js: the whole swarm is a single
// THREE.Points object whose position attribute is refilled from the
// simulation's px/py/pz arrays every frame. Camera, orbit interaction, resize
// and cleanup follow Game3DCanvas so both 3D modes feel identical.
export default function Particle3DCanvas({
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
  const mountRef = useRef(null)
  const simRef = useRef(null)
  const materialRef = useRef(null)
  const rafRef = useRef(0)
  const sizeRef = useRef({ w: 320, h: 320 })
  const colorsDirtyRef = useRef(true)
  const lastStatsRef = useRef(0)

  const paramsRef = useRef(params)
  const runningRef = useRef(running)
  const speedRef = useRef(speed)
  useEffect(() => {
    paramsRef.current = params
  }, [params])
  useEffect(() => {
    runningRef.current = running
  }, [running])
  useEffect(() => {
    speedRef.current = speed
  }, [speed])

  // The world is derived state: it depends on the params *and* on the current
  // canvas size, so it is rebuilt wherever either of them changes.
  function worldFromProps() {
    const { w, h } = sizeRef.current
    return createWorld('particle3d', w, h, paramsRef.current)
  }

  function emitStats(force = false) {
    const sim = simRef.current
    if (!sim) return
    const now = performance.now()
    if (!force && now - lastStatsRef.current < STATS_MS) return
    lastStatsRef.current = now
    onStats?.({
      time: sim.time,
      count: sim.count,
      types: paramsRef.current.types,
      activity: sim.activity,
    })
  }

  // ---- Setup (once) ---------------------------------------------------------
  useEffect(() => {
    const mount = mountRef.current
    const width = Math.max(320, mount.clientWidth)
    const height = Math.max(320, mount.clientHeight)
    sizeRef.current = { w: width, h: height }

    const sim = new ParticleLife(worldFromProps())
    sim.setMatrix(matrix)
    simRef.current = sim
    emitStats(true)

    let renderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true })
    } catch {
      // No WebGL (e.g. jsdom in tests): the simulation and the control signals
      // keep working, only the rendering is skipped.
      return undefined
    }
    renderer.setPixelRatio(window.devicePixelRatio || 1)
    renderer.setSize(width, height)
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0e1018)

    const span = Math.max(sim.world.w, sim.world.h, sim.world.d)
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, span * 20)
    camera.position.set(span * 0.65, span * 0.5, span * 0.8)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.5
    controls.target.set(0, 0, 0)

    let capacity = 0
    let positions = new Float32Array(0)
    let colors = new Float32Array(0)
    const geometry = new THREE.BufferGeometry()
    const material = new THREE.PointsMaterial({
      size: trails ? TRAIL_SIZE : POINT_SIZE,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: trails ? 0.85 : 1,
    })
    materialRef.current = material
    const points = new THREE.Points(geometry, material)
    points.frustumCulled = false
    scene.add(points)

    // Attributes are only ever grown: a shrinking particle count is handled by
    // the draw range, so a slider drag does not churn GPU buffers.
    function ensureCapacity(n) {
      if (n <= capacity) return
      capacity = n
      positions = new Float32Array(n * 3)
      colors = new Float32Array(n * 3)
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
      colorsDirtyRef.current = true
    }

    function writeColors() {
      const palette = typeColors(sim.world.types)
      for (let i = 0; i < sim.count; i++) {
        // A type may briefly exceed the palette while applyWorld remaps types.
        const c = palette[sim.type[i]] ?? palette[0]
        const j = i * 3
        colors[j] = c.r / 255
        colors[j + 1] = c.g / 255
        colors[j + 2] = c.b / 255
      }
      geometry.attributes.color.needsUpdate = true
    }

    function syncPoints() {
      const n = sim.count
      ensureCapacity(Math.max(1, n))
      // World coordinates are [0,w) x [0,h) x [0,d); center them so the swarm
      // sits around the origin the orbit camera looks at.
      const ox = sim.world.w * 0.5
      const oy = sim.world.h * 0.5
      const oz = sim.world.d * 0.5
      for (let i = 0; i < n; i++) {
        const j = i * 3
        positions[j] = sim.px[i] - ox
        positions[j + 1] = sim.py[i] - oy
        positions[j + 2] = sim.pz[i] - oz
      }
      geometry.attributes.position.needsUpdate = true
      if (colorsDirtyRef.current) {
        writeColors()
        colorsDirtyRef.current = false
      }
      geometry.setDrawRange(0, n)
    }
    syncPoints()

    function loop() {
      if (runningRef.current) {
        const substeps = substepsFor(speedRef.current)
        for (let s = 0; s < substeps; s++) sim.step()
      }
      syncPoints()
      controls.update()
      renderer.render(scene, camera)
      emitStats()
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    // Click (not drag) pulses the swarm. Unprojecting the pointer into the
    // volume would need a depth to pick, which no 2D gesture provides, so the
    // shove is applied at the center of the world.
    let downX = 0
    let downY = 0
    const onDown = (e) => {
      downX = e.clientX
      downY = e.clientY
    }
    const onUp = (e) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) >= 5) return
      sim.pulse(sim.world.w * 0.5, sim.world.h * 0.5, sim.world.d * 0.5, 60)
      emitStats(true)
    }
    renderer.domElement.addEventListener('pointerdown', onDown)
    renderer.domElement.addEventListener('pointerup', onUp)

    const onResize = () => {
      const w = Math.max(320, mount.clientWidth)
      const h = Math.max(320, mount.clientHeight)
      sizeRef.current = { w, h }
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
      // applyWorld rescales the particles into the new extent instead of
      // reseeding them, so a resize does not restart the simulation.
      sim.applyWorld(worldFromProps())
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', onResize)
      renderer.domElement.removeEventListener('pointerdown', onDown)
      renderer.domElement.removeEventListener('pointerup', onUp)
      controls.dispose()
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- Parameters, matrix, look ---------------------------------------------
  // Every parameter is fed through applyWorld, which keeps the particles alive.
  useEffect(() => {
    const sim = simRef.current
    if (!sim) return
    sim.applyWorld(worldFromProps())
    colorsDirtyRef.current = true
  }, [
    params.law,
    params.beta,
    params.types,
    params.count,
    params.neighbors,
    params.friction,
    params.force,
    params.wrap,
  ])

  // The matrix is owned by the app; applyWorld may have resized ours, so this
  // must run after the params effect above.
  useEffect(() => {
    simRef.current?.setMatrix(matrix)
  }, [matrix])

  // Real trails would need a fading frame buffer, which the Points path does not
  // have — this only fakes the softer look with bigger, translucent dots.
  useEffect(() => {
    const material = materialRef.current
    if (!material) return
    material.size = trails ? TRAIL_SIZE : POINT_SIZE
    material.opacity = trails ? 0.85 : 1
  }, [trails])

  // ---- Control signals ------------------------------------------------------
  useEffect(() => {
    if (stepSignal === 0) return
    simRef.current?.step()
    emitStats(true)
  }, [stepSignal]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (clearSignal === 0) return
    simRef.current?.clear()
    colorsDirtyRef.current = true
    emitStats(true)
  }, [clearSignal]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (reseedSignal === 0) return
    simRef.current?.reseed()
    colorsDirtyRef.current = true
    emitStats(true)
  }, [reseedSignal]) // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={mountRef} className="canvas-wrap canvas-3d" />
}
