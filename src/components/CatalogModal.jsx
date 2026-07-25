import { CATALOG } from '../lib/catalog'
import { HEX_PATTERNS, TRI_PATTERNS, LIFE3D_PATTERNS } from '../lib/patterns'
import { hslToRgb } from '../lib/color'
import { TOPOLOGIES } from '../lib/topology'
import { WORLDS, isParticleKind } from '../lib/particle/world'
import { PRESETS, presetMatrix } from '../lib/particle/presets'
import PatternPreview from './PatternPreview'
import Preview3D from './Preview3D'
import MatrixPreview from './MatrixPreview'

// Build a uniform { name, cells, moves, meta } list for the current mode.
function itemsFor(kind) {
  if (kind === 'hex') {
    return HEX_PATTERNS.map((p) => ({
      name: p.name,
      cells: p.cells,
      moves: p.category === 'Raumschiff',
      meta: p.category,
    }))
  }
  if (kind === 'triangle') {
    return TRI_PATTERNS.map((p) => ({
      name: p.name,
      cells: p.cells,
      moves: p.category === 'Raumschiff',
      meta: p.category,
    }))
  }
  if (kind === 'life3d') {
    return LIFE3D_PATTERNS.map((p) => ({
      name: p.name,
      cells: p.cells,
      moves: p.category === 'Raumschiff',
      meta: p.category || 'Oszillator',
    }))
  }
  return CATALOG.map((e) => ({
    name: e.name,
    cells: e.cells,
    moves: e.type === 'spaceship',
    meta:
      e.type === 'oscillator'
        ? `Oszillator P${e.period}`
        : e.type === 'spaceship'
          ? 'Raumschiff'
          : 'Stillleben',
  }))
}

// The particle modes share the modal but not the content: a universe is
// described by its matrix, so the preview is a heat map and the card carries a
// button that loads the whole parameter set.
function PresetCatalog({ label, onLoadPreset, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Universenkatalog"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="Schließen">
          ✕
        </button>

        <h2>
          Universenkatalog · <span className="accent">{label}</span>
        </h2>
        <p>
          Vorbereitete Beziehungsmatrizen samt Parametern. Die Vorschau zeigt die Matrix: eine Zeile
          ist ein Typ, eine Spalte das, worauf er reagiert — rot zieht an, blau stößt ab. Ein Klick
          auf „Laden“ übernimmt das Universum, danach kannst du es über 🎛 Matrix weiter verändern.
        </p>

        <div className="catalog-grid preset-grid">
          {PRESETS.map((preset) => (
            <div key={preset.id} className="catalog-item preset-item">
              <div className="catalog-preview">
                <MatrixPreview
                  matrix={presetMatrix(preset)}
                  types={preset.params.types}
                  size={104}
                />
              </div>
              <div className="catalog-name">{preset.name}</div>
              <div className="catalog-meta">
                {preset.meta} · {preset.params.types} Typen
              </div>
              <p className="preset-desc">{preset.description}</p>
              <button className="btn" onClick={() => onLoadPreset(preset.id)}>
                Laden
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function CatalogModal({ kind, onClose, onLoadPreset }) {
  if (isParticleKind(kind)) {
    return (
      <PresetCatalog label={WORLDS[kind].label} onLoadPreset={onLoadPreset} onClose={onClose} />
    )
  }

  const items = itemsFor(kind)
  const label = TOPOLOGIES[kind].label

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

        <h2>
          Musterkatalog · <span className="accent">{label}</span>
        </h2>
        <p>
          {kind === 'square'
            ? 'Diese benannten Muster erkennt das Spiel im Pausemodus, wenn du mit der Maus über ein Objekt fährst. Jede Vorschau läuft live: Oszillatoren pulsieren, Raumschiffe fliegen.'
            : `Muster, die im Modus ${label} per Klick erscheinen. Jede Vorschau läuft live in der zum Modus passenden Regel; jedes Muster in eigener Farbe.`}
        </p>

        <div className="catalog-grid">
          {items.map((item, i) => {
            const color = hslToRgb((i * 360) / items.length, 0.72, 0.6)
            return (
              <div key={`${item.name}-${i}`} className="catalog-item">
                <div className="catalog-preview">
                  {kind === 'life3d' ? (
                    <Preview3D cells={item.cells} color={color} moves={item.moves} />
                  ) : (
                    <PatternPreview
                      kind={kind}
                      cells={item.cells}
                      color={color}
                      moves={item.moves}
                    />
                  )}
                </div>
                <div className="catalog-name">{item.name}</div>
                {item.meta && <div className="catalog-meta">{item.meta}</div>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
