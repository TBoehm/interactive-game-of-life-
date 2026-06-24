import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { Life } from '../lib/engine'
import { create3DTopology, DEFAULT_RULES } from '../lib/topology'

const BOX = 116
const FPS = 6

// 3D catalog preview rendered with a real isometric (orthographic) camera and
// lighting, so the pattern reads clearly as a rotating 3D object. The simulation
// runs on the same engine; the camera gently auto-rotates. Resilient to missing
// WebGL (e.g. jsdom in tests): it simply renders nothing in that case.
export default function Preview3D({ cells, color, moves }) {
  const mountRef = useRef(null)
  const { r: cr, g: cg, b: cb } = color

  useEffect(() => {
    const mount = mountRef.current
    const rule = DEFAULT_RULES.life3d

    let maxX = 0
    let maxY = 0
    let maxZ = 0
    for (const [x, y, z] of cells) {
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
      if (z > maxZ) maxZ = z
    }
    // moving patterns (spaceships) need room to travel before being recentered
    const pad = moves ? 7 : 2
    const N = Math.max(maxX, maxY, maxZ) + 1 + pad * 2
    const topo = create3DTopology(N, N, N, rule)
    const initIdx = cells.map(([x, y, z]) => ((pad + z) * N + (pad + y)) * N + (pad + x))
    const life = new Life(topo)
    const spawn = () => {
      life.clear()
      life.spawnCells(initIdx, { r: cr, g: cg, b: cb })
    }
    spawn()

    let renderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    } catch {
      return undefined // no WebGL (e.g. headless tests): render nothing
    }
    renderer.setPixelRatio(window.devicePixelRatio || 1)
    renderer.setSize(BOX, BOX)
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const extent = Math.max(maxX, maxY, maxZ) + 1
    const fr = extent * 0.66 + 1 + (moves ? 4 : 0)
    const camera = new THREE.OrthographicCamera(-fr, fr, fr, -fr, 0.1, 1000)
    camera.position.set(1, 0.82, 1).normalize().multiplyScalar(50)
    camera.lookAt(0, 0, 0)

    scene.add(new THREE.AmbientLight(0xffffff, 0.7))
    const dir = new THREE.DirectionalLight(0xffffff, 0.85)
    dir.position.set(1, 1.5, 0.8)
    scene.add(dir)

    const group = new THREE.Group()
    scene.add(group)

    const geometry = new THREE.BoxGeometry(0.86, 0.86, 0.86)
    const material = new THREE.MeshLambertMaterial({
      color: new THREE.Color(cr / 255, cg / 255, cb / 255),
    })
    const mesh = new THREE.InstancedMesh(geometry, material, topo.size)
    mesh.frustumCulled = false
    group.add(mesh)

    // center the pattern at the origin so it rotates in place
    const ox = pad + maxX / 2
    const oy = pad + maxY / 2
    const oz = pad + maxZ / 2
    const dummy = new THREE.Object3D()

    const sync = () => {
      const { alive } = life
      const { nx, ny } = topo
      let n = 0
      for (let i = 0; i < topo.size; i++) {
        if (!alive[i]) continue
        const x = i % nx
        const y = ((i / nx) | 0) % ny
        const z = (i / (nx * ny)) | 0
        dummy.position.set(x - ox, y - oy, z - oz)
        dummy.updateMatrix()
        mesh.setMatrixAt(n, dummy.matrix)
        n++
      }
      mesh.count = n
      mesh.instanceMatrix.needsUpdate = true
    }
    sync()

    let raf = 0
    let last = 0
    let prevT = 0
    let steps = 0
    const loop = (t) => {
      if (t - last >= 1000 / FPS) {
        life.step()
        steps += 1
        // recenter moving patterns so they keep looping inside the view
        if (moves && steps % 10 === 0) spawn()
        sync()
        last = t
      }
      const dt = prevT ? t - prevT : 16
      prevT = t
      group.rotation.y += dt * 0.0006
      renderer.render(scene, camera)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement)
    }
  }, [cells, cr, cg, cb, moves])

  return <div ref={mountRef} className="preview-canvas" style={{ width: BOX, height: BOX }} />
}
