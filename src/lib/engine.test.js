import { describe, it, expect } from 'vitest'
import { Life } from './engine'
import { createTopology, DEFAULT_RULES } from './topology'

// Helper: square topology with Conway rules.
function squareLife(cols, rows) {
  const topo = createTopology('square', cols, rows, 8, DEFAULT_RULES.square)
  return new Life(topo)
}

function liveSet(life) {
  const s = new Set()
  for (let i = 0; i < life.size; i++) if (life.alive[i]) s.add(i)
  return s
}

const WHITE = { r: 200, g: 200, b: 200 }

describe('Conway rules on the square grid', () => {
  it('blinker oscillates with period 2', () => {
    const life = squareLife(5, 5)
    const idx = (x, y) => y * 5 + x
    // horizontal blinker centered at (2,2)
    life.spawnCells([idx(1, 2), idx(2, 2), idx(3, 2)], WHITE)

    life.step() // -> vertical
    expect(liveSet(life)).toEqual(new Set([idx(2, 1), idx(2, 2), idx(2, 3)]))

    life.step() // -> horizontal again
    expect(liveSet(life)).toEqual(new Set([idx(1, 2), idx(2, 2), idx(3, 2)]))
  })

  it('block is a still life', () => {
    const life = squareLife(6, 6)
    const idx = (x, y) => y * 6 + x
    const block = [idx(2, 2), idx(3, 2), idx(2, 3), idx(3, 3)]
    life.spawnCells(block, WHITE)
    life.step()
    expect(liveSet(life)).toEqual(new Set(block))
    expect(life.population).toBe(4)
  })

  it('glider returns to its shape shifted by (1,1) after 4 generations', () => {
    const life = squareLife(16, 16)
    const idx = (x, y) => y * 16 + x
    const glider = [
      [1, 0],
      [2, 1],
      [0, 2],
      [1, 2],
      [2, 2],
    ]
    const ox = 5
    const oy = 5
    life.spawnCells(
      glider.map(([x, y]) => idx(ox + x, oy + y)),
      WHITE,
    )

    for (let i = 0; i < 4; i++) life.step()

    const expected = new Set(glider.map(([x, y]) => idx(ox + x + 1, oy + y + 1)))
    expect(liveSet(life)).toEqual(expected)
  })

  it('tracks generation count and population', () => {
    const life = squareLife(6, 6)
    const idx = (x, y) => y * 6 + x
    life.spawnCells([idx(1, 2), idx(2, 2), idx(3, 2)], WHITE)
    expect(life.generation).toBe(0)
    expect(life.population).toBe(3)
    life.step()
    expect(life.generation).toBe(1)
    expect(life.population).toBe(3)
  })

  it('clear() empties the board and resets the generation', () => {
    const life = squareLife(6, 6)
    life.spawnCells([0, 1, 2], WHITE)
    life.step()
    life.clear()
    expect(life.population).toBe(0)
    expect(life.generation).toBe(0)
    expect(liveSet(life).size).toBe(0)
  })
})

describe('color inheritance with blending', () => {
  it('a newborn cell averages the colors of its 3 parents', () => {
    const life = squareLife(6, 6)
    const idx = (x, y) => y * 6 + x
    // Three cells around the empty corner (1,1); their only common dead
    // neighbour with exactly 3 live neighbours is (1,1).
    life.spawnCells([idx(0, 0)], { r: 30, g: 0, b: 0 })
    life.spawnCells([idx(1, 0)], { r: 0, g: 60, b: 0 })
    life.spawnCells([idx(0, 1)], { r: 0, g: 0, b: 90 })

    life.step()

    const born = idx(1, 1)
    expect(life.alive[born]).toBe(1)
    expect(life.r[born]).toBe(10) // (30+0+0)/3
    expect(life.g[born]).toBe(20) // (0+60+0)/3
    expect(life.b[born]).toBe(30) // (0+0+90)/3
  })

  it('surviving cells keep their own color', () => {
    const life = squareLife(6, 6)
    const idx = (x, y) => y * 6 + x
    const block = [idx(2, 2), idx(3, 2), idx(2, 3), idx(3, 3)]
    life.spawnCells(block, { r: 12, g: 34, b: 56 })
    life.step()
    for (const i of block) {
      expect(life.r[i]).toBe(12)
      expect(life.g[i]).toBe(34)
      expect(life.b[i]).toBe(56)
    }
  })
})

describe('non-square topologies run with their own rules', () => {
  it('hex births a cell with exactly 2 live neighbors (B2)', () => {
    // B2/S34: a dead hex with 2 live neighbors must be born.
    const topo = createTopology('hex', 8, 8, 10, DEFAULT_RULES.hex)
    const life = new Life(topo)
    // pick a cell, light two of its neighbors -> the cell should be born,
    // and crucially each lit neighbor has only 1 neighbor so it dies (S needs 3+).
    const cell = 3 * 8 + 3
    const base = cell * topo.maxDegree
    const n0 = topo.neighbors[base]
    const n1 = topo.neighbors[base + 1]
    life.spawnCells([n0, n1], WHITE)
    expect(life.alive[cell]).toBe(0)
    life.step()
    expect(life.alive[cell]).toBe(1)
  })

  it('triangle engine advances without error and stays bounded', () => {
    const topo = createTopology('triangle', 30, 30, 10, DEFAULT_RULES.triangle)
    const life = new Life(topo)
    const seed = []
    for (let i = 0; i < topo.size; i += 3) seed.push(i)
    life.spawnCells(seed, WHITE)
    for (let i = 0; i < 50; i++) life.step()
    expect(life.population).toBeGreaterThanOrEqual(0)
    expect(life.population).toBeLessThanOrEqual(topo.size)
    expect(life.generation).toBe(50)
  })
})
