import { describe, it, expect } from 'vitest'
import { PRESETS, DEFAULT_PRESET, findPreset, presetMatrix, presetGenerator } from './presets'
import { createWorld } from './world'
import { ParticleLife } from './physics'
import { GENERATORS } from './matrix'

// Run a preset headless and report what the simulation actually does. Particle
// counts are scaled down so the suite stays fast — stability does not depend on
// the population size, only on the parameters.
function run(preset, steps = 400) {
  const world = createWorld('particle2d', 900, 600, { ...preset.params, count: 700 })
  const sim = new ParticleLife(world, { seed: 1, matrix: presetMatrix(preset) })
  for (let s = 0; s < steps; s++) sim.step()
  return sim
}

describe('presets', () => {
  it('are well formed', () => {
    const ids = new Set()
    for (const p of PRESETS) {
      expect(p.id).toMatch(/^[a-z]+$/)
      expect(ids.has(p.id)).toBe(false)
      ids.add(p.id)
      expect(p.name.length).toBeGreaterThan(0)
      expect(p.description.length).toBeGreaterThan(20)
      expect(p.params.types).toBeGreaterThanOrEqual(2)
      expect(Object.keys(GENERATORS)).toContain(presetGenerator(p))
    }
    expect(ids.has(DEFAULT_PRESET)).toBe(true)
  })

  it('build a matrix of the right size, inside the valid range', () => {
    for (const p of PRESETS) {
      const m = presetMatrix(p)
      expect(m.length).toBe(p.params.types ** 2)
      for (const v of m) {
        expect(v).toBeGreaterThanOrEqual(-1)
        expect(v).toBeLessThanOrEqual(1)
      }
    }
  })

  it('are reproducible', () => {
    for (const p of PRESETS) {
      expect(Array.from(presetMatrix(p))).toEqual(Array.from(presetMatrix(p)))
    }
  })

  // The two failure modes a preset can have: freezing solid or blowing up.
  it('stay alive and bounded', () => {
    for (const p of PRESETS) {
      const sim = run(p)
      expect(Number.isFinite(sim.activity), `${p.id} activity is not finite`).toBe(true)
      expect(sim.activity, `${p.id} froze`).toBeGreaterThan(0.02)
      expect(sim.activity, `${p.id} exploded`).toBeLessThan(500)
      for (let i = 0; i < sim.count; i++) {
        expect(Number.isFinite(sim.px[i])).toBe(true)
        expect(sim.px[i]).toBeGreaterThanOrEqual(0)
        expect(sim.px[i]).toBeLessThan(sim.world.w)
      }
    }
  })

  it('sort themselves the way their descriptions claim', () => {
    const calm = run(findPreset('ruhe')).activity
    const moving = run(findPreset('ringe')).activity
    const wild = run(findPreset('sturm')).activity
    expect(moving).toBeGreaterThan(calm)
    expect(wild).toBeGreaterThan(moving)
  })

  it('findPreset falls back to the default for unknown ids', () => {
    expect(findPreset('gibtsnicht').id).toBe(DEFAULT_PRESET)
    expect(findPreset('sturm').id).toBe('sturm')
  })
})
