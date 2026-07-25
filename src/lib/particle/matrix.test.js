import { describe, it, expect } from 'vitest'
import {
  GENERATORS,
  generateMatrix,
  symmetrize,
  isSymmetric,
  resizeMatrix,
  encodeMatrix,
  decodeMatrix,
  at,
} from './matrix'
import { mulberry32 } from './rng'

const rng = () => mulberry32(2024)

describe('matrix generators', () => {
  it('produce a full n x n matrix inside [-1, 1] for every generator', () => {
    for (const kind of Object.keys(GENERATORS)) {
      const m = generateMatrix(kind, 6, rng())
      expect(m.length).toBe(36)
      for (const v of m) {
        expect(v).toBeGreaterThanOrEqual(-1)
        expect(v).toBeLessThanOrEqual(1)
      }
    }
  })

  it('random is asymmetric, symmetric is not', () => {
    expect(isSymmetric(generateMatrix('random', 6, rng()), 6)).toBe(false)
    expect(isSymmetric(generateMatrix('symmetric', 6, rng()), 6)).toBe(true)
  })

  it('neutral is all zeros', () => {
    const m = generateMatrix('neutral', 5, rng())
    expect(Array.from(m).every((v) => v === 0)).toBe(true)
  })

  it('sparse leaves most entries at zero', () => {
    const m = generateMatrix('sparse', 8, rng())
    const zeros = Array.from(m).filter((v) => v === 0).length
    expect(zeros).toBeGreaterThan(m.length * 0.3)
  })

  it('chains builds a directed ring: each type chases the next, which flees', () => {
    const n = 5
    const m = generateMatrix('chains', n, rng())
    for (let i = 0; i < n; i++) {
      const next = (i + 1) % n
      expect(at(m, n, i, next)).toBeGreaterThan(0)
      expect(at(m, n, next, i)).toBeLessThan(0)
    }
  })

  it('symmetrize averages both directions', () => {
    const n = 3
    const m = generateMatrix('random', n, rng())
    const s = symmetrize(m, n)
    expect(isSymmetric(s, n)).toBe(true)
    expect(at(s, n, 0, 1)).toBeCloseTo(0.5 * (at(m, n, 0, 1) + at(m, n, 1, 0)), 6)
    // The diagonal is untouched.
    expect(at(s, n, 2, 2)).toBeCloseTo(at(m, n, 2, 2), 6)
  })
})

describe('matrix resizing', () => {
  it('keeps the overlapping block when growing', () => {
    const m = generateMatrix('random', 3, rng())
    const bigger = resizeMatrix(m, 3, 6, 'random', rng())
    expect(bigger.length).toBe(36)
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) expect(at(bigger, 6, i, j)).toBeCloseTo(at(m, 3, i, j), 6)
    }
  })

  it('keeps the overlapping block when shrinking', () => {
    const m = generateMatrix('random', 6, rng())
    const smaller = resizeMatrix(m, 6, 2, 'random', rng())
    expect(smaller.length).toBe(4)
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) expect(at(smaller, 2, i, j)).toBeCloseTo(at(m, 6, i, j), 6)
    }
  })
})

describe('matrix encoding', () => {
  it('round-trips through the compact text form', () => {
    const m = generateMatrix('random', 5, rng())
    const decoded = decodeMatrix(encodeMatrix(m, 5), 5)
    expect(decoded).not.toBeNull()
    for (let i = 0; i < m.length; i++) expect(decoded[i]).toBeCloseTo(m[i], 2)
  })

  it('rejects text of the wrong length', () => {
    expect(decodeMatrix('abcd', 5)).toBeNull()
    expect(decodeMatrix(null, 5)).toBeNull()
  })
})
