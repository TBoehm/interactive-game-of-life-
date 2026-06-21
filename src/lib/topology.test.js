import { describe, it, expect } from 'vitest'
import { createTopology, cellAt, DEFAULT_RULES, TOPOLOGIES } from './topology'

function neighborSet(topo, i) {
  const s = new Set()
  for (let k = 0; k < topo.degree[i]; k++) s.add(topo.neighbors[i * topo.maxDegree + k])
  return s
}

describe.each(['square', 'hex', 'triangle'])('topology %s', (kind) => {
  const topo = createTopology(kind, 24, 24, 10, DEFAULT_RULES[kind])

  it('has the expected max degree', () => {
    expect(topo.maxDegree).toBe(TOPOLOGIES[kind].neighbors)
  })

  it('has a symmetric neighbor relation', () => {
    for (let i = 0; i < topo.size; i++) {
      for (const j of neighborSet(topo, i)) {
        expect(neighborSet(topo, j).has(i)).toBe(true)
      }
    }
  })

  it('never lists a cell as its own neighbor or out of range', () => {
    for (let i = 0; i < topo.size; i++) {
      for (const j of neighborSet(topo, i)) {
        expect(j).not.toBe(i)
        expect(j).toBeGreaterThanOrEqual(0)
        expect(j).toBeLessThan(topo.size)
      }
    }
  })

  it('reports a positive canvas size and one polygon per cell', () => {
    expect(topo.canvasW).toBeGreaterThan(0)
    expect(topo.canvasH).toBeGreaterThan(0)
    expect(topo.polygons.length).toBe(topo.size)
  })
})

describe('degree depends on topology', () => {
  it('square interior cell has 8 neighbors (toroidal: all do)', () => {
    const topo = createTopology('square', 10, 10, 10, DEFAULT_RULES.square)
    expect(topo.degree[55]).toBe(8)
  })

  it('hex interior cell has 6 neighbors', () => {
    const topo = createTopology('hex', 10, 10, 10, DEFAULT_RULES.hex)
    expect(topo.degree[5 * 10 + 5]).toBe(6)
  })

  it('triangle interior cell has 12 neighbors', () => {
    const topo = createTopology('triangle', 12, 12, 10, DEFAULT_RULES.triangle)
    expect(topo.degree[6 * 12 + 6]).toBe(12)
  })
})

describe('rule lookup tables', () => {
  it('builds birth/survival boolean tables from the rule', () => {
    const topo = createTopology('square', 8, 8, 10, { birth: [3], survival: [2, 3] })
    expect(Array.from(topo.birth)).toEqual([0, 0, 0, 1, 0, 0, 0, 0, 0])
    expect(Array.from(topo.survival)).toEqual([0, 0, 1, 1, 0, 0, 0, 0, 0])
  })
})

describe('cellAt hit-testing', () => {
  it('maps a point to the cell whose centroid is nearest (square)', () => {
    const topo = createTopology('square', 4, 4, 10, DEFAULT_RULES.square)
    expect(cellAt(topo, 5, 5)).toBe(0) // centroid of cell (0,0) is (5,5)
    expect(cellAt(topo, 15, 5)).toBe(1) // cell (1,0)
    expect(cellAt(topo, 5, 15)).toBe(4) // cell (0,1)
  })

  it('returns a valid in-range index for hex and triangle', () => {
    for (const kind of ['hex', 'triangle']) {
      const topo = createTopology(kind, 12, 12, 10, DEFAULT_RULES[kind])
      const i = cellAt(topo, topo.canvasW / 2, topo.canvasH / 2)
      expect(i).toBeGreaterThanOrEqual(0)
      expect(i).toBeLessThan(topo.size)
    }
  })
})
