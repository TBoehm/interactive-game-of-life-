import { describe, it, expect } from 'vitest'
import { forceFactory, LAWS } from './law'

describe('force laws', () => {
  const beta = 0.3

  it('beta law: repulsion below beta, zero at beta, peak in the middle, zero at rmax', () => {
    const F = forceFactory('beta', beta)
    expect(F(1, 0)).toBeCloseTo(-1, 6)
    expect(F(1, beta)).toBeCloseTo(0, 6)
    expect(F(0.7, (1 + beta) / 2)).toBeCloseTo(0.7, 6)
    expect(F(1, 1)).toBeCloseTo(0, 6)
  })

  it('beta law: the close range repulsion ignores the matrix entry', () => {
    const F = forceFactory('beta', beta)
    for (const a of [-1, -0.3, 0, 0.5, 1]) {
      expect(F(a, 0.1)).toBeCloseTo(0.1 / beta - 1, 6)
    }
  })

  it('beta law: attraction flips sign with the matrix entry', () => {
    const F = forceFactory('beta', beta)
    const r = 0.65
    expect(F(1, r)).toBeGreaterThan(0)
    expect(F(-1, r)).toBeLessThan(0)
    expect(F(1, r)).toBeCloseTo(-F(-1, r), 6)
  })

  it('flat law: constant attraction across the band', () => {
    const F = forceFactory('flat', beta)
    expect(F(0.4, 0.35)).toBeCloseTo(0.4, 6)
    expect(F(0.4, 0.99)).toBeCloseTo(0.4, 6)
    expect(F(0.4, 0.05)).toBeCloseTo(0.05 / beta - 1, 6)
  })

  it('inverse law: falls off like 1/r', () => {
    const F = forceFactory('inverse', beta)
    expect(F(1, beta)).toBeCloseTo(1, 6)
    expect(F(1, 2 * beta)).toBeCloseTo(0.5, 6)
    expect(F(1, 4 * beta)).toBeCloseTo(0.25, 6)
  })

  it('falls back to the beta law for unknown types and invalid beta', () => {
    const fallback = forceFactory('nonsense', 5)
    const reference = forceFactory('beta', 0.3)
    expect(fallback(0.5, 0.7)).toBeCloseTo(reference(0.5, 0.7), 6)
  })

  it('exposes a label for every law', () => {
    for (const law of Object.values(LAWS)) {
      expect(typeof law.label).toBe('string')
      expect(law.label.length).toBeGreaterThan(0)
    }
  })
})
