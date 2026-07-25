// Interaction matrices — the Particle Life counterpart to patterns.js.
//
// The matrix is *the* genome of a universe: entry (i, j) says how strongly a
// particle of type i is drawn to (positive) or pushed away from (negative) a
// particle of type j. It is stored row-major in a Float32Array, so row i is the
// world as seen by type i.
//
// Asymmetry is the point. A[i][j] != A[j][i] means i chases j while j flees —
// action and reaction no longer cancel, which is exactly what keeps the system
// from settling into an equilibrium. The `symmetric` generator exists to make
// that visible by contrast: it produces calm, crystal-like matter.

export const GENERATORS = {
  random: 'Zufall',
  symmetric: 'Symmetrisch',
  chains: 'Ketten',
  snakes: 'Schlangen',
  sparse: 'Dünn',
  neutral: 'Neutral',
}

export const DEFAULT_GENERATOR = 'random'

export const at = (matrix, types, i, j) => matrix[i * types + j]

export function generateMatrix(kind, types, rng) {
  const n = types
  const m = new Float32Array(n * n)
  const uniform = () => rng() * 2 - 1

  switch (kind) {
    case 'neutral':
      return m

    case 'symmetric': {
      for (let i = 0; i < n; i++) {
        for (let j = i; j < n; j++) {
          const v = uniform()
          m[i * n + j] = v
          m[j * n + i] = v
        }
      }
      return m
    }

    case 'sparse': {
      for (let i = 0; i < n * n; i++) m[i] = rng() < 0.6 ? 0 : uniform()
      return m
    }

    // A directed ring: every type chases the next one, which in turn flees.
    // The classic recipe for hunting chains and travelling clumps.
    case 'chains': {
      for (let i = 0; i < n; i++) {
        const next = (i + 1) % n
        m[i * n + i] = 0.6 + rng() * 0.4
        m[i * n + next] = 0.5 + rng() * 0.5
        m[next * n + i] = -(0.5 + rng() * 0.5)
      }
      return m
    }

    // Like chains, but with strong self-cohesion and a weak random background,
    // which lets the chains grow into elongated, wriggling bodies.
    case 'snakes': {
      for (let i = 0; i < n * n; i++) m[i] = uniform() * 0.2
      for (let i = 0; i < n; i++) {
        const next = (i + 1) % n
        m[i * n + i] = 0.8 + rng() * 0.2
        m[i * n + next] = 0.6 + rng() * 0.4
        m[next * n + i] = -(0.2 + rng() * 0.3)
      }
      return m
    }

    default: {
      for (let i = 0; i < n * n; i++) m[i] = uniform()
      return m
    }
  }
}

// Average out the two directions of every pair. Momentum is conserved for a
// symmetric matrix, so this is also the switch that turns a lively universe
// into an inert one.
export function symmetrize(matrix, types) {
  const out = Float32Array.from(matrix)
  for (let i = 0; i < types; i++) {
    for (let j = i + 1; j < types; j++) {
      const v = 0.5 * (out[i * types + j] + out[j * types + i])
      out[i * types + j] = v
      out[j * types + i] = v
    }
  }
  return out
}

export function isSymmetric(matrix, types, eps = 1e-6) {
  for (let i = 0; i < types; i++) {
    for (let j = i + 1; j < types; j++) {
      if (Math.abs(matrix[i * types + j] - matrix[j * types + i]) > eps) return false
    }
  }
  return true
}

// Grow or shrink a matrix when the type count changes, keeping the overlapping
// block so the universe does not restart when the user drags the slider.
export function resizeMatrix(matrix, oldTypes, newTypes, kind, rng) {
  if (oldTypes === newTypes) return Float32Array.from(matrix)
  const fresh = generateMatrix(kind, newTypes, rng)
  const keep = Math.min(oldTypes, newTypes)
  for (let i = 0; i < keep; i++) {
    for (let j = 0; j < keep; j++) fresh[i * newTypes + j] = matrix[i * oldTypes + j]
  }
  return fresh
}

export function clampEntry(v) {
  return v < -1 ? -1 : v > 1 ? 1 : v
}

// Compact text form for URLs and the clipboard: two hex digits per entry.
export function encodeMatrix(matrix, types) {
  let s = ''
  for (let i = 0; i < types * types; i++) {
    const q = Math.round((clampEntry(matrix[i]) + 1) * 127.5)
    s += q.toString(16).padStart(2, '0')
  }
  return s
}

export function decodeMatrix(text, types) {
  if (typeof text !== 'string' || text.length !== types * types * 2) return null
  const m = new Float32Array(types * types)
  for (let i = 0; i < types * types; i++) {
    const q = parseInt(text.slice(i * 2, i * 2 + 2), 16)
    if (!Number.isFinite(q)) return null
    m[i] = q / 127.5 - 1
  }
  return m
}
