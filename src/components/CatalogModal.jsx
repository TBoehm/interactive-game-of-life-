import { CATALOG } from '../lib/catalog'

const GROUPS = [
  ['still', 'Stillleben'],
  ['oscillator', 'Oszillatoren'],
  ['spaceship', 'Raumschiffe'],
]

// Tiny SVG preview of a pattern's cells.
function Preview({ cells }) {
  let maxX = 0
  let maxY = 0
  for (const [x, y] of cells) {
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }
  const s = 7
  const w = (maxX + 1) * s
  const h = (maxY + 1) * s
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="preview">
      {cells.map(([x, y], i) => (
        <rect key={i} x={x * s} y={y * s} width={s - 1} height={s - 1} rx="1" />
      ))}
    </svg>
  )
}

export default function CatalogModal({ onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Musterkatalog"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="Schließen">
          ✕
        </button>

        <h2>Musterkatalog</h2>
        <p>
          Diese benannten Muster erkennt das Spiel im Pausemodus automatisch, wenn du mit der Maus
          über ein Objekt fährst (nur im Quadratmodus). Erkennung erfolgt über das Verhalten,
          unabhängig von Drehung, Spiegelung und Phase.
        </p>

        {GROUPS.map(([type, label]) => (
          <section key={type} className="catalog-group">
            <h3>{label}</h3>
            <div className="catalog-grid">
              {CATALOG.filter((e) => e.type === type).map((e) => (
                <div key={e.name} className="catalog-item">
                  <div className="catalog-preview">
                    <Preview cells={e.cells} />
                  </div>
                  <div className="catalog-name">{e.name}</div>
                  {e.type === 'oscillator' && (
                    <div className="catalog-meta">Periode {e.period}</div>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
