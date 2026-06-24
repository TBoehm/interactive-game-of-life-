import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import Preview3D from './Preview3D'
import { LIFE3D_PATTERNS } from '../lib/patterns'

describe('Preview3D', () => {
  it('mounts without crashing even when WebGL is unavailable (jsdom)', () => {
    // jsdom has no WebGL context; the component must catch that and render an
    // empty container rather than throwing (which would blank the page).
    const { container } = render(
      <Preview3D cells={LIFE3D_PATTERNS[0].cells} color={{ r: 100, g: 150, b: 200 }} />,
    )
    expect(container.querySelector('.preview-canvas')).toBeTruthy()
  })
})
