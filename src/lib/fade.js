// Smooth fade state for rendering. The simulation advances in discrete
// generations, which makes cells pop in and out abruptly. To soften that, each
// cell keeps a `fade` value (0..1) that is eased toward its target every render
// frame (1 when alive, 0 when dead), so generations cross-fade. Live cells also
// capture their current color, so a cell that just died keeps fading out in the
// color it last had.

export function createFadeState(size) {
  return {
    fade: new Float32Array(size),
    r: new Uint8Array(size),
    g: new Uint8Array(size),
    b: new Uint8Array(size),
  }
}

// Ease every cell's fade toward its alive/dead target by factor k (0..1, the
// fraction of the remaining distance to cover this frame).
export function stepFade(fs, life, k) {
  const { fade, r, g, b } = fs
  const { alive, r: lr, g: lg, b: lb, size } = life
  for (let i = 0; i < size; i++) {
    if (alive[i]) {
      r[i] = lr[i]
      g[i] = lg[i]
      b[i] = lb[i]
      fade[i] += (1 - fade[i]) * k
    } else {
      fade[i] -= fade[i] * k
    }
  }
}

// Per-frame easing factor: cover the gap to the target over roughly `fadeMs`,
// derived from the time since the last frame. Clamped to [0, 1].
export function easing(dtMs, fadeMs) {
  if (fadeMs <= 0) return 1
  const k = dtMs / fadeMs
  return k < 0 ? 0 : k > 1 ? 1 : k
}

// Fade duration tied to the generation interval: long enough to be visible,
// short enough not to smear fast oscillators.
export function fadeDuration(stepIntervalMs) {
  const d = stepIntervalMs * 0.9
  return d < 90 ? 90 : d > 320 ? 320 : d
}
