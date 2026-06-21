import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from './App'

describe('App UI', () => {
  it('renders the three geometry modes', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: 'Quadrat' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Hexagon' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Dreieck' })).toBeTruthy()
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

  it('opens and closes the About modal', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Über/ }))
    expect(screen.getByRole('dialog')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Schließen' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
