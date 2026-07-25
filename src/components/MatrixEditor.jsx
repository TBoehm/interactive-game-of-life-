import { useRef } from 'react'
import { at, clampEntry } from '../lib/particle/matrix'
import { typeColors, toCss } from '../lib/particle/palette'

const BG = { r: 14, g: 16, b: 24 } // --bg
const POS = { r: 255, g: 92, b: 74 }
const NEG = { r: 74, g: 148, b: 255 }
const DRAG_PX = 120 // drag distance that sweeps the whole -1..+1 range
const STEP = 0.1 // arrow-key increment

// Same coding as MatrixPreview: warm = attraction, cool = repulsion, zero
// nearly disappears into the background.
function entryCss(v) {
  const t = 0.08 + 0.92 * Math.min(1, Math.abs(v))
  const c = v < 0 ? NEG : POS
  const mix = (a, b) => Math.round(a + (b - a) * t)
  return `rgb(${mix(BG.r, c.r)},${mix(BG.g, c.g)},${mix(BG.b, c.b)})`
}

const label = (v) => {
  const s = v.toFixed(1)
  return s === '-0.0' ? '0.0' : s
}

// Fully controlled editor: it never keeps a matrix of its own, every gesture
// hands a fresh Float32Array up so the running simulation can swap it in live.
export default function MatrixEditor({ matrix, types, onChange, onClose }) {
  const drag = useRef(null)
  const css = toCss(typeColors(types))

  const emit = (i, j, v) => {
    const next = Float32Array.from(matrix)
    next[i * types + j] = clampEntry(v)
    onChange(next)
  }

  const onPointerDown = (e, i, j) => {
    if (e.button !== 0 && e.button !== undefined) return
    e.preventDefault()
    drag.current = { id: e.pointerId, i, j, y: e.clientY, from: at(matrix, types, i, j) }
    // Capture so the drag survives leaving the (small) cell box.
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  const onPointerMove = (e) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    // Up = more attraction, and always relative to the value we grabbed, so a
    // round trip lands back on the original number.
    emit(d.i, d.j, d.from + ((d.y - e.clientY) / DRAG_PX) * 2)
  }

  const onPointerUp = (e) => {
    if (drag.current?.id !== e.pointerId) return
    drag.current = null
    e.currentTarget.releasePointerCapture?.(e.pointerId)
  }

  const onKeyDown = (e, i, j) => {
    const dir = e.key === 'ArrowUp' ? 1 : e.key === 'ArrowDown' ? -1 : 0
    if (!dir) return
    e.preventDefault()
    emit(i, j, Math.round((at(matrix, types, i, j) + dir * STEP) * 10) / 10)
  }

  const columns = `20px repeat(${types}, minmax(0, 1fr))`
  const rows = []
  for (let i = 0; i < types; i++) {
    rows.push(
      <span
        key={`r${i}`}
        className="type-dot"
        style={{ background: css[i] }}
        title={`Typ ${i + 1}`}
      />,
    )
    for (let j = 0; j < types; j++) {
      const v = at(matrix, types, i, j)
      rows.push(
        <div
          key={`c${i}-${j}`}
          className="matrix-cell"
          role="slider"
          tabIndex={0}
          aria-label={`Typ ${i + 1} zu Typ ${j + 1}`}
          aria-valuemin={-1}
          aria-valuemax={1}
          aria-valuenow={v}
          style={{ background: entryCss(v) }}
          onPointerDown={(e) => onPointerDown(e, i, j)}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={() => emit(i, j, 0)}
          onKeyDown={(e) => onKeyDown(e, i, j)}
        >
          {label(v)}
        </div>,
      )
    }
  }

  return (
    <div className="matrix-editor">
      <button className="btn" onClick={onClose} aria-label="Schließen">
        ×
      </button>
      <p>
        Zeile = wer reagiert, Spalte = worauf. Rot zieht an, Blau stößt ab. Ziehen ändert den Wert,
        Doppelklick nullt ihn.
      </p>
      <div className="matrix-head" style={{ gridTemplateColumns: columns }}>
        <span />
        {css.map((c, j) => (
          <span key={j} className="type-dot" style={{ background: c }} title={`Typ ${j + 1}`} />
        ))}
      </div>
      <div className="matrix-grid" style={{ gridTemplateColumns: columns }}>
        {rows}
      </div>
    </div>
  )
}
