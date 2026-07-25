import { describe, it, expect } from 'vitest'
import { encodeConfig, decodeConfig, readHash, writeHash } from './url'
import { DEFAULTS } from './world'
import { generateMatrix } from './matrix'
import { mulberry32 } from './rng'

const params = { ...DEFAULTS, law: 'flat', beta: 0.25, types: 5, count: 1800, neighbors: 11.5 }
const matrix = generateMatrix('random', 5, mulberry32(11))

describe('universe sharing via the URL hash', () => {
  it('round-trips a complete configuration', () => {
    const decoded = decodeConfig(encodeConfig(params, matrix))
    expect(decoded).not.toBeNull()
    expect(decoded.params.law).toBe('flat')
    expect(decoded.params.beta).toBeCloseTo(0.25, 2)
    expect(decoded.params.types).toBe(5)
    expect(decoded.params.count).toBe(1800)
    expect(decoded.params.neighbors).toBeCloseTo(11.5, 1)
    expect(decoded.params.friction).toBeCloseTo(params.friction, 2)
    expect(decoded.params.wrap).toBe(true)
    for (let i = 0; i < matrix.length; i++) {
      expect(decoded.matrix[i]).toBeCloseTo(matrix[i], 2)
    }
  })

  it('keeps the wrap flag when it is off', () => {
    const decoded = decodeConfig(encodeConfig({ ...params, wrap: false }, matrix))
    expect(decoded.params.wrap).toBe(false)
  })

  it('produces a hash that survives a leading #', () => {
    const hash = encodeConfig(params, matrix)
    expect(decodeConfig(`#${hash}`)).not.toBeNull()
  })

  it('rejects anything that is not one of our hashes', () => {
    expect(decodeConfig('')).toBeNull()
    expect(decodeConfig('#section-2')).toBeNull()
    expect(decodeConfig(null)).toBeNull()
    expect(decodeConfig('pl=1-beta-30')).toBeNull()
    expect(decodeConfig('pl=9-beta-30-5-1800-115-85-100-1-00')).toBeNull() // wrong version
    expect(decodeConfig('pl=1-quatsch-30-5-1800-115-85-100-1-00')).toBeNull() // unknown law
  })

  it('rejects a matrix that does not match the type count', () => {
    const hash = encodeConfig(params, matrix)
    const broken = hash.replace(/-5-/, '-6-')
    expect(decodeConfig(broken)).toBeNull()
  })

  it('reads from a location object', () => {
    expect(readHash({ hash: `#${encodeConfig(params, matrix)}` })).not.toBeNull()
    expect(readHash({ hash: '' })).toBeNull()
    expect(readHash(undefined)).toBeNull()
  })

  it('replaces the hash instead of pushing history entries', () => {
    const calls = []
    const history = { replaceState: (a, b, url) => calls.push(url) }
    const location = { hash: '', pathname: '/app', search: '?x=1' }
    writeHash(history, location, params, matrix)
    expect(calls).toHaveLength(1)
    expect(calls[0].startsWith('/app?x=1#pl=1-')).toBe(true)

    // Writing the same universe again is a no-op.
    location.hash = `#${encodeConfig(params, matrix)}`
    writeHash(history, location, params, matrix)
    expect(calls).toHaveLength(1)
  })
})
