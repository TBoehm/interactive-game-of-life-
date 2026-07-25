// Seedable pseudo random number generator (mulberry32).
//
// Particle Life universes are worth sharing, so every random decision — start
// positions, types and the interaction matrix — must be reproducible from a
// single 32 bit seed. Math.random() cannot do that.

export function mulberry32(seed) {
  let a = seed >>> 0
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// A fresh seed for "roll the dice" actions.
export function randomSeed() {
  return (Math.random() * 4294967296) >>> 0
}

// Seeds travel in the URL hash, so keep them short and case insensitive.
export function seedToString(seed) {
  return (seed >>> 0).toString(36)
}

export function seedFromString(text) {
  const n = parseInt(text, 36)
  return Number.isFinite(n) ? n >>> 0 : null
}
