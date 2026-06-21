import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { Life } from '../lib/engine'
import { create3DTopology } from '../lib/topology'
import { randomColor } from '../lib/color'
import { randomLife3dPattern } from '../lib/patterns'

const GRID = 26 // nx = ny = nz
const SPACING = 1 // distance between cell centers
const CUBE = 0.82 // cube edge (< spacing leaves gaps so depth reads)

// 3D Game of Life (Bays' rule 5766) rendered with Three.js: one instanced cube
// per live cell, orbit-controlled camera. The simulation reuses the same
// topology-agnostic engine as the 2D modes; only rendering and interaction
// differ.
export default function Game3DCanvas({
  rule,
  running,
  speed,
  stepSignal,
  clearSignal,
  randomSignal,
  onStats,
}) {
  const mountRef = useRef(null)
  const lifeRef = useRef(null)
  const topoRef = useRef(null)
  const meshRef = useRef(null)
  const threeRef = useRef(null)
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

  // ---- Spawning -------------------------------------------------------------
  // Either a harvested oscillator, or a dense random blob (which under Life 5766
  // reliably settles into a large, churning 3D structure).
  function spawnAt(cx, cy, cz) {
    const life = lifeRef.current
    const topo = topoRef.current
    if (!life || !topo) return
    const color = randomColor()
    const inB = (x, y, z) => x >= 0 && x < topo.nx && y >= 0 && y < topo.ny && z >= 0 && z < topo.nz
    const indexOf = (x, y, z) => (z * topo.ny + y) * topo.nx + x
    const idxs = []
    let name

    if (Math.random() < 0.5) {
      const pattern = randomLife3dPattern()
      for (const [dx, dy, dz] of pattern.cells) {
        if (inB(cx + dx, cy + dy, cz + dz)) idxs.push(indexOf(cx + dx, cy + dy, cz + dz))
      }
      name = pattern.name
    } else {
      // dense 5^3 blob centered on (cx, cy, cz)
      for (let dz = -2; dz <= 2; dz++) {
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            if (Math.random() < 0.5 && inB(cx + dx, cy + dy, cz + dz)) {
              idxs.push(indexOf(cx + dx, cy + dy, cz + dz))
            }
          }
        }
      }
      name = 'Blob'
    }
    life.spawnCells(idxs, color)
    return name
  }

  function spawnRandomLocation() {
    const topo = topoRef.current
    if (!topo) return
    const r = (lo, hi) => lo + ((Math.random() * (hi - lo)) | 0)
    return spawnAt(r(4, topo.nx - 4), r(4, topo.ny - 4), r(4, topo.nz - 4))
  }

  // ---- Setup (once) ---------------------------------------------------------
  useEffect(() => {
    const mount = mountRef.current
    const topo = create3DTopology(GRID, GRID, GRID, rule)
    topoRef.current = topo
    lifeRef.current = new Life(topo)

    const width = Math.max(320, mount.clientWidth)
    const height = Math.max(320, mount.clientHeight)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0e1018)

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000)
    const span = GRID * SPACING
    camera.position.set(span * 0.95, span * 0.75, span * 1.15)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio || 1)
    renderer.setSize(width, height)
    mount.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.6
    controls.target.set(0, 0, 0)

    scene.add(new THREE.AmbientLight(0xffffff, 0.65))
    const dir = new THREE.DirectionalLight(0xffffff, 0.9)
    dir.position.set(1, 1.4, 0.8)
    scene.add(dir)
    const dir2 = new THREE.DirectionalLight(0x88aaff, 0.35)
    dir2.position.set(-1, -0.6, -0.8)
    scene.add(dir2)

    // faint wireframe box marking the simulation bounds
    const box = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(span, span, span)),
      new THREE.LineBasicMaterial({ color: 0x2c3450 }),
    )
    scene.add(box)

    const geometry = new THREE.BoxGeometry(CUBE, CUBE, CUBE)
    const material = new THREE.MeshLambertMaterial({ vertexColors: false })
    const mesh = new THREE.InstancedMesh(geometry, material, topo.size)
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    mesh.count = 0
    mesh.frustumCulled = false
    scene.add(mesh)
    meshRef.current = mesh

    threeRef.current = { scene, camera, renderer, controls, box }

    const offset = (GRID - 1) / 2
    const dummy = new THREE.Object3D()
    const color = new THREE.Color()

    function syncInstances() {
      const life = lifeRef.current
      const { alive, r, g, b, size } = life
      const { nx, ny } = topo
      let n = 0
      for (let i = 0; i < size; i++) {
        if (!alive[i]) continue
        const x = i % nx
        const y = ((i / nx) | 0) % ny
        const z = (i / (nx * ny)) | 0
        dummy.position.set((x - offset) * SPACING, (y - offset) * SPACING, (z - offset) * SPACING)
        dummy.updateMatrix()
        mesh.setMatrixAt(n, dummy.matrix)
        color.setRGB(r[i] / 255, g[i] / 255, b[i] / 255)
        mesh.setColorAt(n, color)
        n++
      }
      mesh.count = n
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    }

    // initial seed
    for (let i = 0; i < 4; i++) spawnRandomLocation()
    syncInstances()
    onStats?.({ generation: 0, population: lifeRef.current.population })

    function loop(ts) {
      const life = lifeRef.current
      if (runningRef.current && ts - lastStepRef.current >= 1000 / speedRef.current) {
        life.step()
        lastStepRef.current = ts
        syncInstances()
        onStats?.({ generation: life.generation, population: life.population })
      }
      controls.update()
      renderer.render(scene, camera)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    // click (not drag) spawns a creature at a random location
    let downX = 0
    let downY = 0
    const onDown = (e) => {
      downX = e.clientX
      downY = e.clientY
    }
    const onUp = (e) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) < 5) {
        const name = spawnRandomLocation()
        syncInstances()
        onStats?.({
          generation: lifeRef.current.generation,
          population: lifeRef.current.population,
          lastPattern: name,
        })
      }
    }
    renderer.domElement.addEventListener('pointerdown', onDown)
    renderer.domElement.addEventListener('pointerup', onUp)

    const onResize = () => {
      const w = Math.max(320, mount.clientWidth)
      const h = Math.max(320, mount.clientHeight)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    // expose syncInstances for the control-signal effects
    threeRef.current.sync = syncInstances

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', onResize)
      renderer.domElement.removeEventListener('pointerdown', onDown)
      renderer.domElement.removeEventListener('pointerup', onUp)
      controls.dispose()
      geometry.dispose()
      material.dispose()
      box.geometry.dispose()
      box.material.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- Control signals ------------------------------------------------------
  useEffect(() => {
    if (stepSignal === 0) return
    const life = lifeRef.current
    if (life) {
      life.step()
      threeRef.current?.sync?.()
      onStats?.({ generation: life.generation, population: life.population })
    }
  }, [stepSignal]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (clearSignal === 0) return
    const life = lifeRef.current
    if (life) {
      life.clear()
      threeRef.current?.sync?.()
      onStats?.({ generation: 0, population: 0 })
    }
  }, [clearSignal]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (randomSignal === 0) return
    const life = lifeRef.current
    if (life) {
      for (let i = 0; i < 4; i++) spawnRandomLocation()
      threeRef.current?.sync?.()
      onStats?.({ generation: life.generation, population: life.population })
    }
  }, [randomSignal]) // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={mountRef} className="canvas-wrap canvas-3d" />
}
