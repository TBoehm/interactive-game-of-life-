import { describe, it, expect } from 'vitest'
import { identifyObject, components } from './identify'
import { Life } from './engine'
import { createTopology, DEFAULT_RULES } from './topology'

const D4 = [
  ([x, y]) => [x, y],
  ([x, y]) => [-y, x],
  ([x, y]) => [-x, -y],
  ([x, y]) => [y, -x],
  ([x, y]) => [-x, y],
  ([x, y]) => [x, -y],
  ([x, y]) => [y, x],
  ([x, y]) => [-y, -x],
]

describe('identifyObject', () => {
  it('recognizes a still life (block)', () => {
    const info = identifyObject([
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ])
    expect(info.type).toBe('still')
    expect(info.period).toBe(1)
  })

  it('recognizes a period-2 oscillator (blinker)', () => {
    const info = identifyObject([
      [0, 0],
      [1, 0],
      [2, 0],
    ])
    expect(info.type).toBe('oscillator')
    expect(info.period).toBe(2)
  })

  it('recognizes a spaceship (glider) with diagonal drift over period 4', () => {
    const info = identifyObject([
      [1, 0],
      [2, 1],
      [0, 2],
      [1, 2],
      [2, 2],
    ])
    expect(info.type).toBe('spaceship')
    expect(info.period).toBe(4)
    expect(Math.abs(info.dx)).toBe(1)
    expect(Math.abs(info.dy)).toBe(1)
  })

  it('reports an unsettled pattern as active', () => {
    // R-pentomino is a long-lived methuselah, not periodic within MAX_PERIOD
    const info = identifyObject([
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1],
      [1, 2],
    ])
    expect(info.type).toBe('active')
  })

  it('produces a canonical key invariant under all 8 D4 transforms', () => {
    const glider = [
      [1, 0],
      [2, 1],
      [0, 2],
      [1, 2],
      [2, 2],
    ]
    const keys = D4.map((t) => identifyObject(glider.map(t)).canonical)
    for (const k of keys) expect(k).toBe(keys[0])
  })

  it('gives the same canonical key for both blinker phases', () => {
    const a = identifyObject([
      [0, 0],
      [1, 0],
      [2, 0],
    ])
    const b = identifyObject([
      [0, 0],
      [0, 1],
      [0, 2],
    ])
    expect(a.canonical).toBe(b.canonical)
  })
})

describe('components', () => {
  it('separates disjoint live clusters', () => {
    const topo = createTopology('square', 20, 20, 8, DEFAULT_RULES.square)
    const life = new Life(topo)
    const idx = (x, y) => y * 20 + x
    // two blocks far apart
    life.spawnCells([idx(2, 2), idx(3, 2), idx(2, 3), idx(3, 3)], { r: 1, g: 1, b: 1 })
    life.spawnCells([idx(12, 12), idx(13, 12), idx(12, 13), idx(13, 13)], { r: 1, g: 1, b: 1 })
    const { comps, cellOf } = components(life, topo)
    expect(comps.length).toBe(2)
    expect(comps[0].length).toBe(4)
    expect(cellOf[idx(2, 2)]).not.toBe(cellOf[idx(12, 12)])
  })
})
