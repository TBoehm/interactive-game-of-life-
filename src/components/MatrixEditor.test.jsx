import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MatrixEditor from './MatrixEditor'

const TYPES = 3
const base = () => Float32Array.from([0.9, -0.4, 0.2, 0.5, 0.7, -0.6, -0.1, 0.3, 0.8])

function setup(props = {}) {
  const onChange = vi.fn()
  const onClose = vi.fn()
  const matrix = base()
  const view = render(
    <MatrixEditor matrix={matrix} types={TYPES} onChange={onChange} onClose={onClose} {...props} />,
  )
  return { ...view, matrix, onChange, onClose }
}

describe('MatrixEditor', () => {
  it('renders one field per matrix entry', () => {
    const { container } = setup()
    expect(container.querySelectorAll('.matrix-cell')).toHaveLength(TYPES * TYPES)
  })

  it('double click zeroes exactly that entry and leaves the input untouched', () => {
    const { container, matrix, onChange } = setup()
    const idx = 1 * TYPES + 2 // row 1, column 2 -> -0.6
    fireEvent.doubleClick(container.querySelectorAll('.matrix-cell')[idx])

    expect(onChange).toHaveBeenCalledTimes(1)
    const next = onChange.mock.calls[0][0]
    expect(next).toBeInstanceOf(Float32Array)
    expect(next).not.toBe(matrix)
    expect(next[idx]).toBe(0)
    for (let k = 0; k < TYPES * TYPES; k++) {
      if (k !== idx) expect(next[k]).toBe(matrix[k])
    }
    expect(matrix[idx]).toBeCloseTo(-0.6, 5) // the prop was not mutated
  })

  it('dragging up raises the value, and stops once the pointer is released', () => {
    const { container, matrix, onChange } = setup()
    const idx = 1 // row 0, column 1 -> -0.4
    const cell = container.querySelectorAll('.matrix-cell')[idx]
    // jsdom has no pointer capture; the component calls it optionally.
    expect(cell.setPointerCapture).toBeUndefined()

    fireEvent.pointerDown(cell, { pointerId: 1, button: 0, clientY: 100 })
    fireEvent.pointerMove(cell, { pointerId: 1, clientY: 70 }) // 30px up = +0.5
    const next = onChange.mock.calls[0][0]
    expect(next[idx]).toBeCloseTo(0.1, 5)
    expect(next[0]).toBe(matrix[0])

    fireEvent.pointerMove(cell, { pointerId: 1, clientY: 10 }) // clamped at +1
    expect(onChange.mock.calls[1][0][idx]).toBe(1)

    fireEvent.pointerUp(cell, { pointerId: 1 })
    onChange.mockClear()
    fireEvent.pointerMove(cell, { pointerId: 1, clientY: 200 })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('arrow keys nudge a single entry', () => {
    const { container, matrix, onChange } = setup()
    fireEvent.keyDown(container.querySelectorAll('.matrix-cell')[0], { key: 'ArrowDown' })
    const next = onChange.mock.calls[0][0]
    expect(next[0]).toBeCloseTo(0.8, 5)
    expect(next[1]).toBe(matrix[1])
  })

  it('closes via the close button', () => {
    const { onClose } = setup()
    fireEvent.click(screen.getByLabelText('Schließen'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
