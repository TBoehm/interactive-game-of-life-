import { useState } from 'react'
import GameCanvas from './components/GameCanvas'

export default function App() {
  const [running, setRunning] = useState(true)
  const [speed, setSpeed] = useState(12) // generations per second
  const [stepSignal, setStepSignal] = useState(0)
  const [clearSignal, setClearSignal] = useState(0)
  const [randomSignal, setRandomSignal] = useState(0)
  const [stats, setStats] = useState({ generation: 0, population: 0, lastPattern: null })

  return (
    <div className="app">
      <header className="toolbar">
        <h1>
          <span className="dot" /> Interaktives Game of Life
        </h1>

        <div className="controls">
          <button
            className={running ? 'btn primary' : 'btn'}
            onClick={() => setRunning((r) => !r)}
          >
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
          <span>Gen <b>{stats.generation}</b></span>
          <span>Zellen <b>{stats.population}</b></span>
          {stats.lastPattern && (
            <span className="last">zuletzt: <b>{stats.lastPattern}</b></span>
          )}
        </div>
      </header>

      <main className="board">
        <GameCanvas
          running={running}
          speed={speed}
          stepSignal={stepSignal}
          clearSignal={clearSignal}
          randomSignal={randomSignal}
          onStats={setStats}
        />
      </main>

      <footer className="hint">
        Klicke auf eine freie Fläche, um ein zufälliges lebendes Gebilde in einer
        zufälligen Farbe zu erzeugen. Geborene Zellen erben die gemischte Farbe
        ihrer Nachbarn — bei Kollisionen verschmelzen die Farben.
      </footer>
    </div>
  )
}
