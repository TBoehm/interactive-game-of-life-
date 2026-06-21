import { describe, it, expect } from 'vitest'
import { createFadeState, stepFade, easing, fadeDuration } from './fade'

// Minimal life-like object for the fade stepper.
function fakeLife(aliveArr, colors) {
  const size = aliveArr.length
  return {
    size,
    alive: Uint8Array.from(aliveArr),
    r: Uint8Array.from(colors.map((c) => c[0])),
    g: Uint8Array.from(colors.map((c) => c[1])),
    b: Uint8Array.from(colors.map((c) => c[2])),
  }
}

describe('stepFade', () => {
  it('eases live cells toward 1 and captures their color', () => {
    const life = fakeLife(
      [1, 0],
      [
        [100, 50, 10],
        [0, 0, 0],
      ],
    )
    const fs = createFadeState(2)
    stepFade(fs, life, 0.5)
    expect(fs.fade[0]).toBeCloseTo(0.5)
    expect(fs.r[0]).toBe(100)
    expect(fs.g[0]).toBe(50)
    expect(fs.b[0]).toBe(10)
    expect(fs.fade[1]).toBe(0)
    stepFade(fs, life, 0.5)
    expect(fs.fade[0]).toBeCloseTo(0.75)
  })

  it('eases a dead cell back toward 0 while keeping its last color', () => {
    const fs = createFadeState(1)
    stepFade(fs, fakeLife([1], [[200, 100, 0]]), 1) // fully alive
    expect(fs.fade[0]).toBe(1)
    stepFade(fs, fakeLife([0], [[0, 0, 0]]), 0.5) // now dead
    expect(fs.fade[0]).toBeCloseTo(0.5)
    expect(fs.r[0]).toBe(200) // color preserved for fade-out
  })
})

describe('easing', () => {
  it('is the clamped ratio of frame time to fade time', () => {
    expect(easing(50, 100)).toBeCloseTo(0.5)
    expect(easing(200, 100)).toBe(1)
    expect(easing(0, 100)).toBe(0)
    expect(easing(50, 0)).toBe(1)
  })
})

describe('fadeDuration', () => {
  it('is clamped to a brisk, visible range', () => {
    expect(fadeDuration(10)).toBe(45)
    expect(fadeDuration(1000)).toBe(160)
    expect(fadeDuration(200)).toBeCloseTo(90)
  })
})
