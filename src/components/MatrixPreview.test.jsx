import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import MatrixPreview from './MatrixPreview'

const matrix4 = Float32Array.from([
  1, -1, 0, 0.5, -0.5, 0.25, 0, -0.75, 0, 0, 0, 0, 0.1, 0.2, 0.3, 0.4,
])

describe('MatrixPreview', () => {
  it('mounts a sized canvas for a 4x4 matrix', () => {
    const { container } = render(<MatrixPreview matrix={matrix4} types={4} />)
    const canvas = container.querySelector('.matrix-preview canvas')
    expect(canvas).toBeTruthy()
    expect(canvas.style.width).toBe('96px')
    expect(canvas.width).toBeGreaterThan(0)
  })

  it('honours the size prop and survives the densest grid (12 types)', () => {
    const { container } = render(
      <MatrixPreview matrix={new Float32Array(12 * 12)} types={12} size={64} />,
    )
    const canvas = container.querySelector('canvas')
    expect(canvas.style.height).toBe('64px')
  })
})
