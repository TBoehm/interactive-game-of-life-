// Universe sharing through the URL hash.
//
// A Particle Life universe is fully described by a handful of numbers plus the
// matrix, so it fits in a link — no backend, no storage. The format is a
// dash-separated list of URL-safe tokens rather than base64 JSON, because it
// survives copy/paste in chat clients and stays readable enough to debug.
//
//   #pl=1-beta-30-6-3000-100-85-100-1-<matrix as hex>
//    ^  ^ ^    ^  ^ ^    ^   ^  ^   ^
//    |  | |    |  |  |    |   |  |   wrap (1/0)
//    |  | |    |  |  |    |   |  force x100
//    |  | |    |  |  |    |   friction x100
//    |  | |    |  |  |    neighbors x10
//    |  | |    |  |  count
//    |  | |    types
//    |  | beta x100
//    |  law
//    format version

import { encodeMatrix, decodeMatrix } from './matrix'
import { LAWS } from './law'
import { DEFAULTS } from './world'

const VERSION = '1'
const PREFIX = 'pl='

export function encodeConfig(params, matrix) {
  const parts = [
    VERSION,
    params.law,
    Math.round(params.beta * 100),
    params.types,
    params.count,
    Math.round(params.neighbors * 10),
    Math.round(params.friction * 100),
    Math.round(params.force * 100),
    params.wrap ? 1 : 0,
    encodeMatrix(matrix, params.types),
  ]
  return PREFIX + parts.join('-')
}

export function decodeConfig(hash) {
  if (typeof hash !== 'string') return null
  const raw = hash.replace(/^#/, '')
  if (!raw.startsWith(PREFIX)) return null
  const parts = raw.slice(PREFIX.length).split('-')
  if (parts.length !== 10 || parts[0] !== VERSION) return null

  const [, law, beta, types, count, neighbors, friction, force, wrap, matrixHex] = parts
  const n = Number(types)
  if (!LAWS[law] || !Number.isInteger(n) || n < 2 || n > 12) return null

  const matrix = decodeMatrix(matrixHex, n)
  if (!matrix) return null

  const num = (v, fallback, scale) => {
    const x = Number(v)
    return Number.isFinite(x) ? x / scale : fallback
  }

  return {
    params: {
      law,
      beta: num(beta, DEFAULTS.beta, 100),
      types: n,
      count: Math.round(num(count, DEFAULTS.count, 1)),
      neighbors: num(neighbors, DEFAULTS.neighbors, 10),
      friction: num(friction, DEFAULTS.friction, 100),
      force: num(force, DEFAULTS.force, 100),
      wrap: wrap !== '0',
    },
    matrix,
  }
}

export function readHash(location) {
  return decodeConfig(location?.hash ?? '')
}

// Replace the hash without adding a history entry — sharing should not hijack
// the back button.
export function writeHash(history, location, params, matrix) {
  const next = `#${encodeConfig(params, matrix)}`
  if (location.hash === next) return
  history.replaceState(null, '', location.pathname + location.search + next)
}
