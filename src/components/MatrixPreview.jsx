import { useEffect, useRef } from 'react'
import { at } from '../lib/particle/matrix'
import { typeColors } from '../lib/particle/palette'

const BG = { r: 14, g: 16, b: 24 } // --bg
const POS = { r: 255, g: 92, b: 74 } // attraction reads as warm
const NEG = { r: 74, g: 148, b: 255 } // repulsion reads as cool
const STRIP = 6 // px along the left/top edge for the type color bars

// Blend towards the sign's color, so a zero entry stays nearly background and
// the eye only picks up what actually pulls or pushes.
function entryCss(v) {
  const t = 0.08 + 0.92 * Math.min(1, Math.abs(v))
  const c = v < 0 ? NEG : POS
  const mix = (a, b) => Math.round(a + (b - a) * t)
  return `rgb(${mix(BG.r, c.r)},${mix(BG.g, c.g)},${mix(BG.b, c.b)})`
}

// Heatmap thumbnail of an interaction matrix: row i is the world as seen by
// type i, so the left bar labels the reacting type and the top bar the type
// being reacted to.
export default function MatrixPreview({ matrix, types, size = 96 }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !matrix || !types) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(size * dpr)
    canvas.height = Math.round(size * dpr)
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = `rgb(${BG.r},${BG.g},${BG.b})`
    ctx.fillRect(0, 0, size, size)

    const cell = (size - STRIP) / types
    const gap = cell > 4 ? 1 : 0
    const colors = typeColors(types)

    for (let i = 0; i < types; i++) {
      const { r, g, b } = colors[i]
      ctx.fillStyle = `rgb(${r},${g},${b})`
      ctx.fillRect(0, STRIP + i * cell, STRIP - 1, cell - gap)
      ctx.fillRect(STRIP + i * cell, 0, cell - gap, STRIP - 1)
    }

    for (let i = 0; i < types; i++) {
      for (let j = 0; j < types; j++) {
        ctx.fillStyle = entryCss(at(matrix, types, i, j))
        ctx.fillRect(STRIP + j * cell, STRIP + i * cell, cell - gap, cell - gap)
      }
    }
  }, [matrix, types, size])

  return (
    <div className="matrix-preview">
      <canvas ref={canvasRef} />
    </div>
  )
}
