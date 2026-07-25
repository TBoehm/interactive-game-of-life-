// Type colors. Reuses the project's HSL helper so particles and Game of Life
// structures share one visual language.
//
// Hues are spread evenly around the wheel; lightness alternates between
// neighboring types so that adjacent hues stay distinguishable even at 12
// types (the same trick the original C++ implementation uses).

import { hslToRgb } from '../color'

export function typeColors(types) {
  const out = []
  for (let i = 0; i < types; i++) {
    out.push(hslToRgb((i * 360) / types, 0.78, i % 2 ? 0.68 : 0.55))
  }
  return out
}

export function toCss(colors) {
  return colors.map((c) => `rgb(${c.r},${c.g},${c.b})`)
}
