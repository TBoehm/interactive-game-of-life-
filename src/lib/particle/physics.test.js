import { describe, it, expect } from 'vitest'
import { ParticleLife } from './physics'
import { createWorld, updateWorld } from './world'
import { generateMatrix, symmetrize, isSymmetric } from './matrix'
import { forceFactory } from './law'
import { mulberry32 } from './rng'

function build(opts = {}, worldOpts = {}) {
  const world = createWorld('particle2d', 600, 400, { count: 400, types: 4, ...worldOpts })
  return new ParticleLife(world, { seed: 42, ...opts })
}

// Independent O(n^2) reference for one velocity update — no grid involved.
function bruteForceVelocities(sim, dt) {
  const { px, py, vx, vy, type, matrix, count } = sim
  const { w, h, rmax, wrap, types, force } = sim.world
  const F = forceFactory(sim.world.law, sim.world.beta)
  const friction = Math.pow(sim.world.friction, 60 * dt)
  const scale = rmax * force * dt
  const out = { vx: new Float32Array(count), vy: new Float32Array(count) }
  for (let i = 0; i < count; i++) {
    let ax = 0
    let ay = 0
    for (let j = 0; j < count; j++) {
      if (i === j) continue
      let dx = px[j] - px[i]
      let dy = py[j] - py[i]
      if (wrap) {
        if (dx > w / 2) dx -= w
        else if (dx < -w / 2) dx += w
        if (dy > h / 2) dy -= h
        else if (dy < -h / 2) dy += h
      }
      const r2 = dx * dx + dy * dy
      if (r2 === 0 || r2 > rmax * rmax) continue
      const r = Math.sqrt(r2)
      const f = F(matrix[type[i] * types + type[j]], r / rmax) / r
      ax += f * dx
      ay += f * dy
    }
    out.vx[i] = vx[i] * friction + ax * scale
    out.vy[i] = vy[i] * friction + ay * scale
  }
  return out
}

describe('ParticleLife', () => {
  it('reproduces a brute force force sweep exactly', () => {
    const sim = build()
    // Give the cloud some structure first so the comparison is not trivial.
    for (let i = 0; i < 20; i++) sim.step()
    const expected = bruteForceVelocities(sim, sim.world.dt)
    sim.step()
    for (let i = 0; i < sim.count; i++) {
      expect(sim.vx[i]).toBeCloseTo(expected.vx[i], 3)
      expect(sim.vy[i]).toBeCloseTo(expected.vy[i], 3)
    }
  })

  it('conserves momentum for a symmetric matrix without friction', () => {
    const sim = build()
    sim.setMatrix(symmetrize(generateMatrix('random', sim.world.types, mulberry32(1)), 4))
    expect(isSymmetric(sim.matrix, sim.world.types)).toBe(true)
    sim.world = { ...sim.world, friction: 1 }

    for (let i = 0; i < 200; i++) sim.step()

    const p = sim.momentum()
    // Reference scale: the total momentum if all particles moved in lockstep.
    const scale = sim.activity * sim.count
    expect(scale).toBeGreaterThan(0)
    expect(Math.hypot(p.x, p.y) / scale).toBeLessThan(0.01)
  })

  it('breaks momentum conservation for an asymmetric matrix — the engine of the system', () => {
    const sim = build()
    sim.world = { ...sim.world, friction: 1 }
    expect(isSymmetric(sim.matrix, sim.world.types)).toBe(false)

    for (let i = 0; i < 200; i++) sim.step()

    const p = sim.momentum()
    const scale = sim.activity * sim.count
    expect(Math.hypot(p.x, p.y) / scale).toBeGreaterThan(0.02)
  })

  it('normalizes friction against the step size', () => {
    const coarse = build()
    const fine = build()
    coarse.vx.fill(10)
    fine.vx.fill(10)
    // force = 0 isolates friction. A zero *matrix* would not: the short range
    // repulsion is matrix-independent by design, so close neighbors would still
    // push each other around.
    coarse.world = { ...coarse.world, force: 0 }
    fine.world = { ...fine.world, force: 0 }

    for (let i = 0; i < 50; i++) coarse.step(0.02) // 1 s
    for (let i = 0; i < 200; i++) fine.step(0.005) // 1 s

    expect(coarse.vx[0]).toBeCloseTo(fine.vx[0], 4)
  })

  it('is deterministic for a given seed', () => {
    const a = build({ seed: 7 })
    const b = build({ seed: 7 })
    for (let i = 0; i < 100; i++) {
      a.step()
      b.step()
    }
    expect(Array.from(a.px)).toEqual(Array.from(b.px))
    expect(Array.from(a.vy)).toEqual(Array.from(b.vy))
    expect(Array.from(a.type)).toEqual(Array.from(b.type))
  })

  it('stays finite and inside the world over a long run', () => {
    const sim = build({}, { count: 600, types: 6 })
    for (let i = 0; i < 3000; i++) sim.step()
    for (let i = 0; i < sim.count; i++) {
      expect(Number.isFinite(sim.px[i])).toBe(true)
      expect(Number.isFinite(sim.vy[i])).toBe(true)
      expect(sim.px[i]).toBeGreaterThanOrEqual(0)
      expect(sim.px[i]).toBeLessThan(sim.world.w)
      expect(sim.py[i]).toBeGreaterThanOrEqual(0)
      expect(sim.py[i]).toBeLessThan(sim.world.h)
    }
    expect(Number.isFinite(sim.activity)).toBe(true)
  })

  it('keeps particles inside a bounded world', () => {
    const sim = build({}, { wrap: false, count: 300 })
    for (let i = 0; i < 500; i++) sim.step()
    for (let i = 0; i < sim.count; i++) {
      expect(sim.px[i]).toBeGreaterThanOrEqual(0)
      expect(sim.px[i]).toBeLessThan(sim.world.w)
      expect(sim.py[i]).toBeGreaterThanOrEqual(0)
      expect(sim.py[i]).toBeLessThan(sim.world.h)
    }
  })

  it('advances time and step count', () => {
    const sim = build()
    sim.step(0.02)
    sim.step(0.02)
    expect(sim.steps).toBe(2)
    expect(sim.time).toBeCloseTo(0.04, 6)
  })

  it('grows and shrinks the particle count without restarting', () => {
    const sim = build({}, { count: 400 })
    for (let i = 0; i < 30; i++) sim.step()
    const keptX = sim.px[10]

    sim.applyWorld(updateWorld(sim.world, { count: 900 }))
    expect(sim.count).toBe(900)
    expect(sim.px[10]).toBe(keptX)
    expect(sim.px[800]).toBeGreaterThanOrEqual(0)

    sim.applyWorld(updateWorld(sim.world, { count: 300 }))
    expect(sim.count).toBe(300)
    expect(sim.px[10]).toBe(keptX)
    sim.step()
    expect(Number.isFinite(sim.px[10])).toBe(true)
  })

  it('resizes the matrix and remaps types when the type count changes', () => {
    const sim = build({}, { types: 4 })
    const before = sim.matrix[0]
    sim.applyWorld(updateWorld(sim.world, { types: 7 }))
    expect(sim.matrix.length).toBe(49)
    expect(sim.matrix[0]).toBeCloseTo(before, 6)

    sim.applyWorld(updateWorld(sim.world, { types: 3 }))
    expect(sim.matrix.length).toBe(9)
    for (let i = 0; i < sim.count; i++) expect(sim.type[i]).toBeLessThan(3)
    sim.step()
    expect(Number.isFinite(sim.px[0])).toBe(true)
  })

  it('rescales positions when the world is resized', () => {
    const sim = build()
    const before = sim.px[5] / sim.world.w
    sim.applyWorld(createWorld('particle2d', 1200, 800, { ...sim.world }))
    expect(sim.px[5] / sim.world.w).toBeCloseTo(before, 4)
  })

  it('clears the world and lets clicks repopulate it', () => {
    const sim = build({}, { count: 400 })
    sim.clear()
    expect(sim.count).toBe(0)
    expect(sim.capacity).toBe(400)

    sim.spawnBlob(100, 100, 0, 50, 1)
    expect(sim.count).toBe(50)
    sim.spawnBlob(200, 200, 0, 50, 2)
    expect(sim.count).toBe(100)

    sim.step()
    expect(Number.isFinite(sim.px[0])).toBe(true)

    // A cleared world stays cleared when unrelated parameters change.
    sim.applyWorld(updateWorld(sim.world, { friction: 0.9 }))
    expect(sim.count).toBe(100)

    sim.reseed(5)
    expect(sim.count).toBe(400)
  })

  it('spawnBlob relocates instead of growing once the world is full', () => {
    const sim = build({}, { count: 400 })
    expect(sim.count).toBe(sim.capacity)
    sim.spawnBlob(300, 200, 0, 60, 1)
    expect(sim.count).toBe(400)
  })

  it('spawnBlob gathers particles of one type around the click', () => {
    const sim = build()
    const t = sim.spawnBlob(300, 200, 0, 60, 2)
    expect(t).toBe(2)
    let near = 0
    for (let i = 0; i < sim.count; i++) {
      if (sim.type[i] === 2 && Math.hypot(sim.px[i] - 300, sim.py[i] - 200) < sim.world.rmax * 3) {
        near++
      }
    }
    expect(near).toBeGreaterThanOrEqual(50)
    expect(sim.count).toBe(400) // the click must not change the workload
  })

  it('pulse pushes nearby particles outward', () => {
    const sim = build()
    sim.vx.fill(0)
    sim.vy.fill(0)
    sim.px[0] = 300 + sim.world.rmax
    sim.py[0] = 200
    sim.pulse(300, 200, 0, 50)
    expect(sim.vx[0]).toBeGreaterThan(0)
  })

  it('runs in three dimensions', () => {
    const world = createWorld('particle3d', 500, 500, { count: 400, types: 5 })
    const sim = new ParticleLife(world, { seed: 3 })
    for (let i = 0; i < 200; i++) sim.step()
    for (let i = 0; i < sim.count; i++) {
      expect(Number.isFinite(sim.pz[i])).toBe(true)
      expect(sim.pz[i]).toBeGreaterThanOrEqual(0)
      expect(sim.pz[i]).toBeLessThan(world.d)
    }
    expect(sim.activity).toBeGreaterThan(0)
  })

  it('reroll changes the laws but keeps the matter in place', () => {
    const sim = build()
    for (let i = 0; i < 10; i++) sim.step()
    const x = Array.from(sim.px)
    const before = Array.from(sim.matrix)
    sim.reroll('random', 99)
    expect(Array.from(sim.px)).toEqual(x)
    expect(Array.from(sim.matrix)).not.toEqual(before)
  })

  it('reseed changes the matter but keeps the laws', () => {
    const sim = build()
    for (let i = 0; i < 10; i++) sim.step()
    const matrix = Array.from(sim.matrix)
    sim.reseed(1234)
    expect(Array.from(sim.matrix)).toEqual(matrix)
    expect(sim.time).toBe(0)
  })
})
