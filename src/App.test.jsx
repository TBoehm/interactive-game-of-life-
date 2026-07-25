import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import App from './App'

describe('App UI', () => {
  it('renders all geometry modes', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: 'Quadrat' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Hexagon' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Dreieck' })).toBeTruthy()
    // The 3D button exists but is not clicked here: mounting it needs WebGL,
    // which jsdom does not provide.
    expect(screen.getByRole('button', { name: '3D' })).toBeTruthy()
  })

  it('shows the active rule and updates it when switching modes', () => {
    render(<App />)
    expect(screen.getByText('B3/S23')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Hexagon' }))
    expect(screen.getByText('B2o/S2m34H')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Dreieck' }))
    expect(screen.getByText('B456/S45')).toBeTruthy()
  })

  it('marks the selected mode active', () => {
    render(<App />)
    const hex = screen.getByRole('button', { name: 'Hexagon' })
    expect(hex.className).not.toContain('active')
    fireEvent.click(hex)
    expect(hex.className).toContain('active')
  })

  it('toggles play/pause', () => {
    render(<App />)
    const pause = screen.getByRole('button', { name: /Pause/ })
    fireEvent.click(pause)
    expect(screen.getByRole('button', { name: /Start/ })).toBeTruthy()
  })

  it('enables the step button only when paused', () => {
    render(<App />)
    const step = screen.getByRole('button', { name: /Schritt/ })
    expect(step.disabled).toBe(true) // running by default
    fireEvent.click(screen.getByRole('button', { name: /Pause/ }))
    expect(step.disabled).toBe(false)
  })

  it('updates the speed readout from the slider', () => {
    render(<App />)
    const slider = screen.getByRole('slider')
    fireEvent.change(slider, { target: { value: '30' } })
    expect(screen.getByText('30/s')).toBeTruthy()
  })

  it('toggles the fading control', () => {
    render(<App />)
    const btn = screen.getByRole('button', { name: /Fading/ })
    expect(btn.textContent).toContain('aus') // off by default
    fireEvent.click(btn)
    expect(screen.getByRole('button', { name: /Fading/ }).textContent).toContain('an')
  })

  it('opens the catalog with named patterns', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Katalog/ }))
    const dialog = screen.getByRole('dialog', { name: 'Musterkatalog' })
    expect(dialog).toBeTruthy()
    expect(within(dialog).getByText('Glider')).toBeTruthy()
    expect(within(dialog).getByText('Blinker')).toBeTruthy()
  })

  it('adapts the catalog to the current mode', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Hexagon' }))
    fireEvent.click(screen.getByRole('button', { name: /Katalog/ }))
    const dialog = screen.getByRole('dialog', { name: 'Musterkatalog' })
    expect(within(dialog).getByText('Hexagon')).toBeTruthy()
    expect(within(dialog).getAllByText('Flipper').length).toBeGreaterThan(0)
  })

  it('opens and closes the About modal', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Über/ }))
    expect(screen.getByRole('dialog')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Schließen' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('Particle Life mode', () => {
  // The 2D particle world renders through the canvas stub, so it can be mounted
  // here — unlike the WebGL modes.
  const enter = () => fireEvent.click(screen.getByRole('button', { name: 'Partikel' }))

  it('switches the whole app over to Particle Life', () => {
    const { container } = render(<App />)
    expect(screen.getByText(/Interaktives Game of Life/)).toBeTruthy()
    enter()
    expect(screen.getByText(/Interaktives Particle Life/)).toBeTruthy()
    // The law name also appears in the select, so read the stats line itself.
    expect(container.querySelector('.stats .rule').textContent).toContain('β-Zelt')
  })

  it('offers the particle-only controls', () => {
    render(<App />)
    enter()
    expect(screen.getByRole('button', { name: /Matrix würfeln|🎲 Matrix/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Spuren/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Torus/ })).toBeTruthy()
  })

  it('opens the matrix editor with one cell per type pair', () => {
    render(<App />)
    enter()
    fireEvent.click(screen.getByRole('button', { name: '🎛 Matrix' }))
    // The default preset has 6 types, plus the speed and parameter sliders.
    const cells = screen.getAllByRole('slider').filter((el) => el.className.includes('matrix-cell'))
    expect(cells).toHaveLength(36)
  })

  it('shows the universe catalog and loads a preset', () => {
    const { container } = render(<App />)
    enter()
    fireEvent.click(screen.getByRole('button', { name: /Katalog/ }))
    const dialog = screen.getByRole('dialog', { name: 'Universenkatalog' })
    expect(within(dialog).getByText('Jagdkette')).toBeTruthy()
    expect(within(dialog).getByText('Kristall')).toBeTruthy()

    const card = within(dialog).getByText('Kristall').closest('.catalog-item')
    fireEvent.click(within(card).getByRole('button', { name: 'Laden' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    // Kristall runs on the flat law with 4 types.
    const rule = container.querySelector('.stats .rule').textContent
    expect(rule).toContain('Konstant')
    expect(rule).toContain('4 Typen')
  })

  it('explains Particle Life rather than Conway in the About modal', () => {
    render(<App />)
    enter()
    fireEvent.click(screen.getByRole('button', { name: /Über/ }))
    expect(screen.getByText(/Was Particle Life ist und tut/)).toBeTruthy()
  })

  it('goes back to the Game of Life modes', () => {
    render(<App />)
    enter()
    fireEvent.click(screen.getByRole('button', { name: 'Quadrat' }))
    expect(screen.getByText('B3/S23')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Torus/ })).toBeNull()
  })
})
