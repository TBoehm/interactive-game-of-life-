// Force laws — the Particle Life counterpart to the birth/survival rules in
// topology.js.
//
// Every law is a function F(a, r) that returns the *radial* force between two
// particles, where `a` is the interaction matrix entry (how the first particle
// feels about the second, in [-1, 1]) and `r` is their distance divided by
// rmax, so r is always in [0, 1]. Positive means attraction, negative means
// repulsion.
//
// All three laws share the same short range repulsion below beta. It is
// deliberately *independent* of the matrix: that is what makes a randomly
// rolled matrix safe to run — particles can never collapse into each other, no
// matter how attractive they find one another.
//
// Historical note: only 'beta' is continuous. 'flat' jumps to zero at r = 1 and
// 'inverse' jumps at r = beta, exactly as in the original implementations they
// are modelled after. In practice those steps are harmless (they act like a
// contact force), and smoothing them away would change the look these laws are
// picked for.

export const LAWS = {
  // Tom Mohr's tent: rises from 0 at beta, peaks at (1+beta)/2, back to 0 at 1.
  // The default: continuous, forgiving, rich in cell-like structures.
  beta: { type: 'beta', label: 'β-Zelt' },
  // CodeParade's "flat force": constant attraction across the whole band.
  // Produces harder edged, more crystalline structures.
  flat: { type: 'flat', label: 'Konstant' },
  // Hunar Ahmad's 1/d falloff: strongest close up, long soft tail. Gooey.
  inverse: { type: 'inverse', label: '1/d' },
}

export const DEFAULT_LAW = 'beta'

// Build the force function for a law. Returned as a closure so the hot loop in
// physics.js stays monomorphic — it calls one small function, never a switch.
export function forceFactory(lawType, beta) {
  const b = beta > 0.001 && beta < 0.999 ? beta : 0.3
  switch (lawType) {
    case 'flat':
      return function flatForce(a, r) {
        if (r < b) return r / b - 1
        return a
      }
    case 'inverse':
      return function inverseForce(a, r) {
        if (r < b) return r / b - 1
        return (a * b) / r
      }
    default:
      return function betaForce(a, r) {
        if (r < b) return r / b - 1
        return a * (1 - Math.abs(1 + b - 2 * r) / (1 - b))
      }
  }
}
