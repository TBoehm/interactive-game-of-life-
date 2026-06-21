import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent, waitFor } from '@testing-library/react'
import GameCanvas from './GameCanvas'
import { DEFAULT_RULES } from '../lib/topology'

function setup(overrides = {}) {
  const onStats = vi.fn()
  const props = {
    kind: 'square',
    rule: DEFAULT_RULES.square,
    running: false,
    speed: 12,
    stepSignal: 0,
    clearSignal: 0,
    randomSignal: 0,
    onStats,
    ...overrides,
  }
  const utils = render(<GameCanvas {...props} />)
  return { onStats, props, ...utils }
}

const lastStat = (onStats) => onStats.mock.calls.at(-1)[0]

describe('GameCanvas', () => {
  it('renders a canvas and reports initial stats', async () => {
    const { onStats, container } = setup()
    expect(container.querySelector('canvas')).toBeTruthy()
    await waitFor(() => expect(onStats).toHaveBeenCalled())
  })

  it('spawns a named pattern when clicking on the square grid', async () => {
    const { onStats, container } = setup()
    fireEvent.click(container.querySelector('canvas'), { clientX: 400, clientY: 300 })
    await waitFor(() => {
      expect(onStats.mock.calls.some(([s]) => typeof s.lastPattern === 'string')).toBe(true)
    })
  })

  it('fills via the random signal and empties via the clear signal', async () => {
    const { onStats, rerender, props } = setup()

    rerender(<GameCanvas {...props} randomSignal={1} />)
    await waitFor(() => expect(lastStat(onStats).population).toBeGreaterThan(0))

    rerender(<GameCanvas {...props} randomSignal={1} clearSignal={1} />)
    await waitFor(() => expect(lastStat(onStats).population).toBe(0))
  })

  it('advances one generation on the step signal', async () => {
    const { onStats, rerender, props } = setup()
    await waitFor(() => expect(onStats).toHaveBeenCalled())
    rerender(<GameCanvas {...props} stepSignal={1} />)
    await waitFor(() => expect(lastStat(onStats).generation).toBe(1))
  })

  it('mounts the hexagonal topology (Path2D path) without throwing', async () => {
    const { onStats, container } = setup({ kind: 'hex', rule: DEFAULT_RULES.hex })
    expect(container.querySelector('canvas')).toBeTruthy()
    await waitFor(() => expect(onStats).toHaveBeenCalled())
  })

  it('mounts the triangular topology without throwing', async () => {
    const { onStats, container } = setup({ kind: 'triangle', rule: DEFAULT_RULES.triangle })
    expect(container.querySelector('canvas')).toBeTruthy()
    await waitFor(() => expect(onStats).toHaveBeenCalled())
  })
})
