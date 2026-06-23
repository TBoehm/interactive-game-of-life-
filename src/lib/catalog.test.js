import { describe, it, expect } from 'vitest'
import { CATALOG, lookup, describe as describeObj } from './catalog'
import { identifyObject } from './identify'

describe('catalog', () => {
  it('every entry self-identifies as its declared type', () => {
    const wrong = []
    for (const entry of CATALOG) {
      const info = identifyObject(entry.cells)
      if (info.type !== entry.type) wrong.push(`${entry.name}: ${info.type} (P${info.period})`)
    }
    expect(wrong).toEqual([])
  })

  it('has a unique canonical key per entry', () => {
    const seen = new Map()
    for (const entry of CATALOG) {
      expect(entry.canonical).toBeTruthy()
      expect(seen.has(entry.canonical)).toBe(false)
      seen.set(entry.canonical, entry.name)
    }
  })

  it('looks up common patterns by canonical key', () => {
    const glider = identifyObject([
      [1, 0],
      [2, 1],
      [0, 2],
      [1, 2],
      [2, 2],
    ])
    expect(lookup(glider.canonical)?.name).toBe('Glider')

    const blinker = identifyObject([
      [0, 0],
      [1, 0],
      [2, 0],
    ])
    expect(lookup(blinker.canonical)?.name).toBe('Blinker')

    const block = identifyObject([
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ])
    expect(lookup(block.canonical)?.name).toBe('Block')
  })

  it('describes a named object and an unnamed one', () => {
    const blinker = identifyObject([
      [0, 0],
      [1, 0],
      [2, 0],
    ])
    expect(describeObj(blinker)).toContain('Blinker')

    const unnamed = identifyObject([
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1],
      [1, 2],
    ])
    expect(describeObj(unnamed)).toBe('noch aktiv')
  })
})
