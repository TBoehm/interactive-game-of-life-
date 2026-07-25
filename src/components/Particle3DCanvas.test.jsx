import { describe, it, expect, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import Particle3DCanvas from './Particle3DCanvas'
import { DEFAULTS } from '../lib/particle/world'

const TYPES = 4

function makeMatrix(types) {
  const m = new Float32Array(types * types)
  for (let i = 0; i < m.length; i++) m[i] = (i % 3) - 1
  return m
}

function setup(overrides = {}) {
  const onStats = vi.fn()
  const props = {
    params: { ...DEFAULTS, types: TYPES, count: 400 },
    matrix: makeMatrix(TYPES),
    running: false,
    speed: 24,
    trails: false,
    stepSignal: 0,
    clearSignal: 0,
    reseedSignal: 0,
    onStats,
    ...overrides,
  }
  const utils = render(<Particle3DCanvas {...props} />)
  return { onStats, props, ...utils }
}

const lastStat = (onStats) => onStats.mock.calls.at(-1)[0]

describe('Particle3DCanvas', () => {
  // jsdom has no WebGL context; like Preview3D the component must survive that.
  // The simulation itself is plain typed-array math and keeps working, so the
  // prop wiring can still be exercised here.
  it('mounts without WebGL and reports stats', async () => {
    const { onStats, container } = setup()
    expect(container.querySelector('.canvas-wrap')).toBeTruthy()
    await waitFor(() => expect(onStats).toHaveBeenCalled())
    const s = lastStat(onStats)
    expect(s.types).toBe(TYPES)
    expect(s.count).toBe(400)
    expect(s.time).toBe(0)
  })

  it('advances on the step signal and empties on the clear signal', async () => {
    const { onStats, rerender, props } = setup()
    await waitFor(() => expect(onStats).toHaveBeenCalled())

    rerender(<Particle3DCanvas {...props} stepSignal={1} />)
    await waitFor(() => expect(lastStat(onStats).time).toBeGreaterThan(0))

    rerender(<Particle3DCanvas {...props} stepSignal={1} clearSignal={1} />)
    await waitFor(() => expect(lastStat(onStats).count).toBe(0))
  })

  it('survives changed params and a new matrix without restarting the simulation', async () => {
    const { onStats, rerender, props } = setup()
    rerender(<Particle3DCanvas {...props} stepSignal={1} />)
    await waitFor(() => expect(lastStat(onStats).time).toBeGreaterThan(0))
    const time = lastStat(onStats).time

    rerender(
      <Particle3DCanvas
        {...props}
        stepSignal={2}
        params={{ ...props.params, types: 6, count: 600, friction: 0.9 }}
        matrix={makeMatrix(6)}
        trails
      />,
    )

    // applyWorld adopts the new world instead of rebuilding the simulation, so
    // the clock keeps running across the change.
    await waitFor(() => expect(lastStat(onStats).types).toBe(6))
    expect(lastStat(onStats).count).toBe(600)
    expect(lastStat(onStats).time).toBeGreaterThan(time)
  })
})
