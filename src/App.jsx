import { useEffect, useState } from 'react'
import GameCanvas from './components/GameCanvas'
import Game3DCanvas from './components/Game3DCanvas'
import ParticleCanvas from './components/ParticleCanvas'
import Particle3DCanvas from './components/Particle3DCanvas'
import ParticleControls from './components/ParticleControls'
import MatrixEditor from './components/MatrixEditor'
import AboutModal from './components/AboutModal'
import CatalogModal from './components/CatalogModal'
import { TOPOLOGIES, DEFAULT_RULES } from './lib/topology'
import { WORLDS, DEFAULTS, isParticleKind } from './lib/particle/world'
import { LAWS } from './lib/particle/law'
import { DEFAULT_PRESET, findPreset, presetMatrix, presetGenerator } from './lib/particle/presets'
import { generateMatrix, resizeMatrix } from './lib/particle/matrix'
import { mulberry32, randomSeed } from './lib/particle/rng'
import { readHash, writeHash } from './lib/particle/url'

const ruleLabel = (rule) => rule.label

const START = findPreset(DEFAULT_PRESET)

// A shared link carries a whole universe. It is read once, before the first
// render, so opening one drops straight into the particle mode with those
// parameters instead of flashing the default world first.
const SHARED = typeof window === 'undefined' ? null : readHash(window.location)
const INITIAL_PARAMS = { ...DEFAULTS, ...START.params, ...(SHARED?.params ?? {}) }

export default function App() {
  const [kind, setKind] = useState(SHARED ? 'particle2d' : 'square')
  const [running, setRunning] = useState(true)
  const [speed, setSpeed] = useState(12) // generations per second / steps per frame
  const [stepSignal, setStepSignal] = useState(0)
  const [clearSignal, setClearSignal] = useState(0)
  const [randomSignal, setRandomSignal] = useState(0)
  const [stats, setStats] = useState({ generation: 0, population: 0, lastPattern: null })
  const [showAbout, setShowAbout] = useState(false)
  const [showCatalog, setShowCatalog] = useState(false)
  const [fade, setFade] = useState(false)

  // ---- Particle Life state --------------------------------------------------
  const [params, setParams] = useState(INITIAL_PARAMS)
  const [matrix, setMatrix] = useState(() => SHARED?.matrix ?? presetMatrix(START))
  const [generator, setGenerator] = useState(() => presetGenerator(START))
  const [showMatrix, setShowMatrix] = useState(false)

  const particle = isParticleKind(kind)
  const rule = DEFAULT_RULES[kind]

  // Keep the hash in sync, debounced so dragging a slider does not hammer the
  // history API.
  useEffect(() => {
    if (!particle) return undefined
    const id = setTimeout(() => writeHash(window.history, window.location, params, matrix), 300)
    return () => clearTimeout(id)
  }, [particle, params, matrix])

  function setParam(key, value) {
    if (key === 'types' && value !== params.types) {
      setMatrix((m) => resizeMatrix(m, params.types, value, generator, mulberry32(randomSeed())))
    }
    setParams((prev) => ({ ...prev, [key]: value }))
  }

  function rerollMatrix() {
    setMatrix(generateMatrix(generator, params.types, mulberry32(randomSeed())))
  }

  function loadPreset(id) {
    const preset = findPreset(id)
    setParams({ ...DEFAULTS, ...preset.params })
    setMatrix(presetMatrix(preset))
    setGenerator(presetGenerator(preset))
    setShowCatalog(false)
    if (!isParticleKind(kind)) setKind('particle2d')
  }

  function switchKind(next) {
    setKind(next)
    setStats(
      isParticleKind(next)
        ? { time: 0, count: 0, types: params.types, activity: 0, fps: 0 }
        : { generation: 0, population: 0, lastPattern: null },
    )
    if (!isParticleKind(next)) setShowMatrix(false)
  }

  return (
    <div className="app">
      <header className="toolbar">
        <h1>
          <span className="dot" />{' '}
          {particle ? 'Interaktives Particle Life' : 'Interaktives Game of Life'}
        </h1>

        <div className="modes">
          {Object.entries(TOPOLOGIES).map(([key, t]) => (
            <button
              key={key}
              className={kind === key ? 'mode active' : 'mode'}
              onClick={() => switchKind(key)}
              title={`${t.label} · ${t.neighbors} Nachbarn · ${ruleLabel(DEFAULT_RULES[key])}`}
            >
              {t.label}
            </button>
          ))}
          <span className="mode-sep" aria-hidden="true" />
          {Object.entries(WORLDS).map(([key, w]) => (
            <button
              key={key}
              className={kind === key ? 'mode active' : 'mode'}
              onClick={() => switchKind(key)}
              title={`${w.label} · Anziehung und Abstoßung zwischen Farbklassen`}
            >
              {w.label}
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
            title={
              particle
                ? 'Einen Simulationsschritt weiter (nur im Pausemodus)'
                : 'Eine Generation weiter (nur im Pausemodus)'
            }
          >
            ⏭ Schritt
          </button>
          <button
            className="btn"
            onClick={() => setRandomSignal((s) => s + 1)}
            title={
              particle ? 'Partikel neu verteilen, Matrix behalten' : 'Zufällige Gebilde setzen'
            }
          >
            ✨ Zufall
          </button>
          {particle && (
            <button
              className="btn"
              onClick={rerollMatrix}
              title="Neue Matrix würfeln, Partikel behalten"
            >
              🎲 Matrix
            </button>
          )}
          <button className="btn" onClick={() => setClearSignal((s) => s + 1)}>
            🗑 Leeren
          </button>
          <button
            className={fade ? 'btn primary' : 'btn'}
            onClick={() => setFade((f) => !f)}
            title={
              particle
                ? 'Bewegungsspuren hinter den Partikeln'
                : 'Sanftes Ein und Ausblenden der Zellen (gegen hartes Flackern)'
            }
          >
            {particle ? `💫 Spuren ${fade ? 'an' : 'aus'}` : `🌫 Fading ${fade ? 'an' : 'aus'}`}
          </button>
          {particle && (
            <button
              className={showMatrix ? 'btn primary' : 'btn'}
              onClick={() => setShowMatrix((v) => !v)}
              title="Die Beziehungsmatrix direkt bearbeiten"
            >
              🎛 Matrix
            </button>
          )}
          <button
            className="btn"
            onClick={() => setShowCatalog(true)}
            title={particle ? 'Vorbereitete Universen' : 'Alle bekannten Muster'}
          >
            📖 Katalog
          </button>
          <button
            className="btn"
            onClick={() => setShowAbout(true)}
            title="Was simuliert das hier?"
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

        {particle && (
          <ParticleControls
            params={params}
            onParam={setParam}
            generator={generator}
            onGenerator={setGenerator}
          />
        )}

        <div className="stats">
          {particle ? (
            <>
              <span className="rule" title="Kraftgesetz zwischen zwei Partikeln">
                {params.types} Typen · <b>{LAWS[params.law].label}</b>
              </span>
              <span>
                Zeit <b>{(stats.time ?? 0).toFixed(1)}s</b>
              </span>
              <span>
                Partikel <b>{stats.count ?? 0}</b>
              </span>
              <span title="Mittlere Geschwindigkeit — wie lebendig die Welt gerade ist">
                Aktivität <b>{(stats.activity ?? 0).toFixed(1)}</b>
              </span>
              {stats.fps > 0 && (
                <span className="last">
                  <b>{stats.fps}</b> fps
                </span>
              )}
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </header>

      <main className="board">
        {kind === 'particle2d' && (
          <ParticleCanvas
            params={params}
            matrix={matrix}
            running={running}
            speed={speed}
            trails={fade}
            stepSignal={stepSignal}
            clearSignal={clearSignal}
            reseedSignal={randomSignal}
            onStats={setStats}
          />
        )}
        {kind === 'particle3d' && (
          <Particle3DCanvas
            params={params}
            matrix={matrix}
            running={running}
            speed={speed}
            trails={fade}
            stepSignal={stepSignal}
            clearSignal={clearSignal}
            reseedSignal={randomSignal}
            onStats={setStats}
          />
        )}
        {kind === 'life3d' && (
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
        )}
        {!particle && kind !== 'life3d' && (
          <GameCanvas
            kind={kind}
            rule={rule}
            running={running}
            speed={speed}
            fade={fade}
            stepSignal={stepSignal}
            clearSignal={clearSignal}
            randomSignal={randomSignal}
            onStats={setStats}
          />
        )}

        {particle && showMatrix && (
          <MatrixEditor
            matrix={matrix}
            types={params.types}
            onChange={setMatrix}
            onClose={() => setShowMatrix(false)}
          />
        )}
      </main>

      <footer className="hint">
        {particle ? (
          <>
            Jede Farbe ist eine Klasse, und eine Matrix legt fest, wie stark sich je zwei Klassen
            anziehen oder abstoßen. Weil diese Beziehungen <b>nicht wechselseitig</b> sein müssen —
            Rot jagt Blau, während Blau vor Rot flieht — kommt das System nie zur Ruhe: es entstehen
            Zellen, Membranen, Würmer und Jagdketten, die niemand programmiert hat. <b>Klick</b>{' '}
            stupst die Partikel an, <b>Umschalt+Klick</b> setzt einen Tropfen neuer Partikel. Über{' '}
            <b>🎛 Matrix</b> änderst du die Beziehungen live, über <b>📖 Katalog</b> lädst du
            vorbereitete Universen. Der Link in der Adresszeile enthält immer das aktuelle
            Universum.
          </>
        ) : (
          <>
            Klicke auf eine freie Fläche, um ein zufälliges lebendes Gebilde in einer zufälligen
            Farbe zu erzeugen. Geborene Zellen erben die gemischte Farbe ihrer Nachbarn; bei
            Kollisionen verschmelzen die Farben. Über die Modi oben wechselst du zwischen{' '}
            <b>Quadrat</b> (8 Nachbarn, Conway), <b>Hexagon</b> (6 Nachbarn), <b>Dreieck</b> (12
            Nachbarn) und <b>3D</b> (26 Nachbarn, Bays Life 5766); jede Geometrie nutzt ihre eigene,
            dazu passende Regel. Im 3D Modus drehst du die Ansicht per Maus.
          </>
        )}
        <span className="credit">
          {' · Agentic Pairing & mehr: '}
          <a href="https://toboehm.de" target="_blank" rel="noopener noreferrer">
            toboehm.de
          </a>
        </span>
      </footer>

      {showAbout && <AboutModal kind={kind} onClose={() => setShowAbout(false)} />}
      {showCatalog && (
        <CatalogModal kind={kind} onClose={() => setShowCatalog(false)} onLoadPreset={loadPreset} />
      )}
    </div>
  )
}
