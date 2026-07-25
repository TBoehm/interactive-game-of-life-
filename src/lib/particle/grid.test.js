import { describe, it, expect } from 'vitest'
import { Grid } from './grid'
import { createWorld } from './world'
import { mulberry32 } from './rng'

// Brute force reference: every particle within rmax of `i`, honoring wrap.
function bruteForceNeighbors(px, py, count, world) {
  const { w, h, rmax, wrap } = world
  const out = []
  for (let i = 0; i < count; i++) {
    const near = []
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
      if (dx * dx + dy * dy <= rmax * rmax) near.push(j)
    }
    out.push(new Set(near))
  }
  return out
}

function randomCloud(world, count, seed) {
  const rng = mulberry32(seed)
  const px = new Float32Array(count)
  const py = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    px[i] = rng() * world.w
    py[i] = rng() * world.h
  }
  return { px, py }
}

describe('Grid', () => {
  it('finds every neighbor a brute force sweep finds (wrapping world)', () => {
    const world = createWorld('particle2d', 640, 400, { count: 500, neighbors: 8 })
    const { px, py } = randomCloud(world, world.count, 12345)
    const grid = new Grid(world, world.count)
    grid.build(px, py, null, world.count)

    const expected = bruteForceNeighbors(px, py, world.count, world)
    const scratch = new Int32Array(world.count)

    for (let i = 0; i < world.count; i++) {
      const n = grid.collect(grid.cellX(px[i]), grid.cellY(py[i]), 0, scratch)
      const found = new Set()
      for (let k = 0; k < n; k++) {
        const j = scratch[k]
        if (j === i) continue
        let dx = px[j] - px[i]
        let dy = py[j] - py[i]
        if (dx > world.w / 2) dx -= world.w
        else if (dx < -world.w / 2) dx += world.w
        if (dy > world.h / 2) dy -= world.h
        else if (dy < -world.h / 2) dy += world.h
        if (dx * dx + dy * dy <= world.rmax * world.rmax) found.add(j)
      }
      expect([...found].sort()).toEqual([...expected[i]].sort())
    }
  })

  it('finds every neighbor in a bounded world', () => {
    const world = createWorld('particle2d', 500, 500, { count: 300, wrap: false })
    const { px, py } = randomCloud(world, world.count, 999)
    const grid = new Grid(world, world.count)
    grid.build(px, py, null, world.count)

    const expected = bruteForceNeighbors(px, py, world.count, world)
    const scratch = new Int32Array(world.count)
    let checked = 0
    for (let i = 0; i < world.count; i++) {
      const n = grid.collect(grid.cellX(px[i]), grid.cellY(py[i]), 0, scratch)
      for (const j of expected[i]) {
        expect(Array.from(scratch.subarray(0, n))).toContain(j)
        checked++
      }
    }
    expect(checked).toBeGreaterThan(0)
  })

  it('treats opposite edges as adjacent when wrapping', () => {
    const world = createWorld('particle2d', 600, 600, { count: 2, neighbors: 6 })
    const px = Float32Array.from([1, world.w - 1])
    const py = Float32Array.from([300, 300])
    const grid = new Grid(world, 2)
    grid.build(px, py, null, 2)
    const scratch = new Int32Array(8)
    const n = grid.collect(grid.cellX(px[0]), grid.cellY(py[0]), 0, scratch)
    expect(Array.from(scratch.subarray(0, n))).toContain(1)
  })

  it('sorts every particle into exactly one cell', () => {
    const world = createWorld('particle2d', 800, 600, { count: 1000 })
    const { px, py } = randomCloud(world, world.count, 7)
    const grid = new Grid(world, world.count)
    grid.build(px, py, null, world.count)

    expect(grid.cellStart[grid.ncells]).toBe(world.count)
    const seen = new Set(Array.from(grid.order.subarray(0, world.count)))
    expect(seen.size).toBe(world.count)
  })

  it('works in three dimensions', () => {
    const world = createWorld('particle3d', 400, 400, { count: 400, neighbors: 10 })
    const rng = mulberry32(3)
    const px = new Float32Array(world.count)
    const py = new Float32Array(world.count)
    const pz = new Float32Array(world.count)
    for (let i = 0; i < world.count; i++) {
      px[i] = rng() * world.w
      py[i] = rng() * world.h
      pz[i] = rng() * world.d
    }
    const grid = new Grid(world, world.count)
    grid.build(px, py, pz, world.count)
    expect(grid.cellStart[grid.ncells]).toBe(world.count)

    const scratch = new Int32Array(world.count)
    const i = 0
    const n = grid.collect(grid.cellX(px[i]), grid.cellY(py[i]), grid.cellZ(pz[i]), scratch)
    const found = new Set(Array.from(scratch.subarray(0, n)))
    for (let j = 0; j < world.count; j++) {
      if (j === i) continue
      let dx = px[j] - px[i]
      let dy = py[j] - py[i]
      let dz = pz[j] - pz[i]
      if (dx > world.w / 2) dx -= world.w
      else if (dx < -world.w / 2) dx += world.w
      if (dy > world.h / 2) dy -= world.h
      else if (dy < -world.h / 2) dy += world.h
      if (dz > world.d / 2) dz -= world.d
      else if (dz < -world.d / 2) dz += world.d
      if (dx * dx + dy * dy + dz * dz <= world.rmax * world.rmax) expect(found).toContain(j)
    }
  })
})
