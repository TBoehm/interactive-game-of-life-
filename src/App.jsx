import { useState } from 'react'
import GameCanvas from './components/GameCanvas'
import Game3DCanvas from './components/Game3DCanvas'
import AboutModal from './components/AboutModal'
import CatalogModal from './components/CatalogModal'
import { TOPOLOGIES, DEFAULT_RULES } from './lib/topology'

const ruleLabel = (rule) => rule.label

export default function App() {
  const [kind, setKind] = useState('square')
  const [running, setRunning] = useState(true)
  const [speed, setSpeed] = useState(12) // generations per second
  const [stepSignal, setStepSignal] = useState(0)
  const [clearSignal, setClearSignal] = useState(0)
  const [randomSignal, setRandomSignal] = useState(0)
  const [stats, setStats] = useState({ generation: 0, population: 0, lastPattern: null })
  const [showAbout, setShowAbout] = useState(false)
  const [showCatalog, setShowCatalog] = useState(false)
  const [fade, setFade] = useState(false)
  const [recognize, setRecognize] = useState(true)

  const rule = DEFAULT_RULES[kind]

  return (
    <div className="app">
      <header className="toolbar">
        <h1>
          <span className="dot" /> Interaktives Game of Life
        </h1>

        <div className="modes">
          {Object.entries(TOPOLOGIES).map(([key, t]) => (
            <button
              key={key}
              className={kind === key ? 'mode active' : 'mode'}
              onClick={() => setKind(key)}
              title={`${t.label} · ${t.neighbors} Nachbarn · ${ruleLabel(DEFAULT_RULES[key])}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="controls">
          <button className={running ? 'btn primary' : 'btn'} onClick={() => setRunning((r) => !r)}>
            {running ? '⏸ Pause' : '▶ Start'}
          </button>
          <button
            className="btn"
            onClick={() => setStepSignal((s) => s + 1)}
            disabled={running}
            title="Eine Generation weiter (nur im Pausemodus)"
          >
            ⏭ Schritt
          </button>
          <button className="btn" onClick={() => setRandomSignal((s) => s + 1)}>
            ✨ Zufall
          </button>
          <button className="btn" onClick={() => setClearSignal((s) => s + 1)}>
            🗑 Leeren
          </button>
          <button
            className={fade ? 'btn primary' : 'btn'}
            onClick={() => setFade((f) => !f)}
            title="Sanftes Ein und Ausblenden der Zellen (gegen hartes Flackern)"
          >
            🌫 Fading {fade ? 'an' : 'aus'}
          </button>
          <button
            className={recognize ? 'btn primary' : 'btn'}
            onClick={() => setRecognize((r) => !r)}
            title="Im Pausemodus über ein Objekt fahren zeigt seinen Namen (nur Quadrat)"
          >
            🔍 Muster {recognize ? 'an' : 'aus'}
          </button>
          <button
            className="btn"
            onClick={() => setShowCatalog(true)}
            title="Alle bekannten Muster"
          >
            📖 Katalog
          </button>
          <button
            className="btn"
            onClick={() => setShowAbout(true)}
            title="Was simuliert dieses Spiel?"
          >
            ℹ Über
          </button>

          <label className="speed">
            Tempo
            <input
              type="range"
              min="1"
              max="60"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
            />
            <span className="speed-val">{speed}/s</span>
          </label>
        </div>

        <div className="stats">
          <span className="rule" title="Regel für Geburt und Überleben sowie Nachbarzahl">
            {TOPOLOGIES[kind].neighbors} Nb · <b>{ruleLabel(rule)}</b>
          </span>
          <span>
            Gen <b>{stats.generation}</b>
          </span>
          <span>
            Zellen <b>{stats.population}</b>
          </span>
          {stats.lastPattern && (
            <span className="last">
              zuletzt: <b>{stats.lastPattern}</b>
            </span>
          )}
        </div>
      </header>

      <main className="board">
        {kind === 'life3d' ? (
          <Game3DCanvas
            rule={rule}
            running={running}
            speed={speed}
            fade={fade}
            stepSignal={stepSignal}
            clearSignal={clearSignal}
            randomSignal={randomSignal}
            onStats={setStats}
          />
        ) : (
          <GameCanvas
            kind={kind}
            rule={rule}
            running={running}
            speed={speed}
            fade={fade}
            recognize={recognize}
            stepSignal={stepSignal}
            clearSignal={clearSignal}
            randomSignal={randomSignal}
            onStats={setStats}
          />
        )}
      </main>

      <footer className="hint">
        Klicke auf eine freie Fläche, um ein zufälliges lebendes Gebilde in einer zufälligen Farbe
        zu erzeugen. Geborene Zellen erben die gemischte Farbe ihrer Nachbarn; bei Kollisionen
        verschmelzen die Farben. Über die Modi oben wechselst du zwischen <b>Quadrat</b> (8
        Nachbarn, Conway), <b>Hexagon</b> (6 Nachbarn), <b>Dreieck</b> (12 Nachbarn) und <b>3D</b>{' '}
        (26 Nachbarn, Bays Life 5766); jede Geometrie nutzt ihre eigene, dazu passende Regel. Im 3D
        Modus drehst du die Ansicht per Maus.
        <span className="credit">
          {' · Agentic Pairing & mehr: '}
          <a href="https://toboehm.de" target="_blank" rel="noopener noreferrer">
            toboehm.de
          </a>
        </span>
      </footer>

      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
      {showCatalog && <CatalogModal kind={kind} onClose={() => setShowCatalog(false)} />}
    </div>
  )
}
