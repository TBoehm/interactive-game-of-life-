import { describe, it, expect, vi } from 'vitest'
import { render, waitFor, fireEvent } from '@testing-library/react'
import ParticleCanvas from './ParticleCanvas'
import { DEFAULTS } from '../lib/particle/world'
import { generateMatrix } from '../lib/particle/matrix'
import { mulberry32 } from '../lib/particle/rng'

const params = { ...DEFAULTS, types: 4, count: 400 }
const matrix = generateMatrix('random', 4, mulberry32(1))

function setup(extra = {}) {
  const onStats = vi.fn()
  const utils = render(
    <ParticleCanvas
      params={params}
      matrix={matrix}
      running={true}
      speed={12}
      trails={false}
      stepSignal={0}
      clearSignal={0}
      reseedSignal={0}
      onStats={onStats}
      {...extra}
    />,
  )
  return { onStats, ...utils }
}

describe('ParticleCanvas', () => {
  it('mounts and reports simulation stats', async () => {
    const { onStats } = setup()
    await waitFor(() => expect(onStats).toHaveBeenCalled())
    const stats = onStats.mock.calls.at(-1)[0]
    expect(stats.count).toBe(400)
    expect(stats.types).toBe(4)
    expect(Number.isFinite(stats.activity)).toBe(true)
  })

  it('advances time while running', async () => {
    const { onStats } = setup()
    await waitFor(() => expect(onStats.mock.calls.at(-1)[0].time).toBeGreaterThan(0))
  })

  it('empties the world on the clear signal and refills it on click', async () => {
    const { onStats, rerender, container } = setup()
    await waitFor(() => expect(onStats).toHaveBeenCalled())

    rerender(
      <ParticleCanvas
        params={params}
        matrix={matrix}
        running={true}
        speed={12}
        trails={false}
        stepSignal={0}
        clearSignal={1}
        reseedSignal={0}
        onStats={onStats}
      />,
    )
    await waitFor(() => expect(onStats.mock.calls.at(-1)[0].count).toBe(0))

    fireEvent.click(container.querySelector('canvas'))
    await waitFor(() => expect(onStats.mock.calls.at(-1)[0].count).toBeGreaterThan(0))
  })

  it('survives a parameter change without losing the simulation', async () => {
    const { onStats, rerender } = setup()
    await waitFor(() => expect(onStats).toHaveBeenCalled())

    const next = { ...params, types: 6, friction: 0.9 }
    rerender(
      <ParticleCanvas
        params={next}
        matrix={generateMatrix('random', 6, mulberry32(2))}
        running={true}
        speed={12}
        trails={false}
        stepSignal={0}
        clearSignal={0}
        reseedSignal={0}
        onStats={onStats}
      />,
    )
    await waitFor(() => expect(onStats.mock.calls.at(-1)[0].types).toBe(6))
    expect(onStats.mock.calls.at(-1)[0].count).toBe(400)
  })
})
