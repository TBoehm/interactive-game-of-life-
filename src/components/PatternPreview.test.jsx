import { describe, it, expect, vi, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import PatternPreview from './PatternPreview'
import { Life } from '../lib/engine'

afterEach(() => vi.useRealTimers())

describe('PatternPreview', () => {
  it('keeps animating (steps the simulation on an interval) across parent re-renders', () => {
    vi.useFakeTimers()
    const spy = vi.spyOn(Life.prototype, 'step')
    const props = {
      kind: 'square',
      cells: [
        [0, 0],
        [1, 0],
        [2, 0],
      ],
      moves: false,
    }
    const { rerender } = render(<PatternPreview {...props} color={{ r: 10, g: 20, b: 30 }} />)
    // simulate a parent re-render handing a *new* color object (same values):
    // the animation effect must NOT restart and clear its interval.
    rerender(<PatternPreview {...props} color={{ r: 10, g: 20, b: 30 }} />)
    spy.mockClear()
    vi.advanceTimersByTime(600)
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})
