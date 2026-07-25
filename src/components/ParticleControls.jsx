import { LIMITS } from '../lib/particle/world'
import { LAWS } from '../lib/particle/law'
import { GENERATORS } from '../lib/particle/matrix'

// Second toolbar row, shown only in the particle modes. The Game of Life needs
// one rule and one speed; Particle Life has a continuous parameter space, and
// exploring it with sliders while the simulation keeps running is the whole
// point of the mode.

function Slider({ label, title, value, min, max, step, format, onChange }) {
  return (
    <label className="param" title={title}>
      <span className="param-name">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="param-val">{format(value)}</span>
    </label>
  )
}

export default function ParticleControls({ params, onParam, generator, onGenerator }) {
  return (
    <div className="particle-bar">
      <label className="param select" title="Das Kraftgesetz zwischen zwei Partikeln">
        <span className="param-name">Gesetz</span>
        <select value={params.law} onChange={(e) => onParam('law', e.target.value)}>
          {Object.entries(LAWS).map(([key, law]) => (
            <option key={key} value={key}>
              {law.label}
            </option>
          ))}
        </select>
      </label>

      <label className="param select" title="Nach welchem Muster neue Matrizen gewürfelt werden">
        <span className="param-name">Matrixart</span>
        <select value={generator} onChange={(e) => onGenerator(e.target.value)}>
          {Object.entries(GENERATORS).map(([key, name]) => (
            <option key={key} value={key}>
              {name}
            </option>
          ))}
        </select>
      </label>

      <Slider
        label="Typen"
        title="Anzahl der Farbklassen. Mehr Typen heißt mehr mögliche Rollen im Ökosystem."
        value={params.types}
        min={LIMITS.types[0]}
        max={LIMITS.types[1]}
        step={1}
        format={(v) => v}
        onChange={(v) => onParam('types', v)}
      />
      <Slider
        label="Partikel"
        title="Anzahl der Partikel. Die Reichweite wird automatisch nachgeführt, damit die Bildrate stabil bleibt."
        value={params.count}
        min={LIMITS.count[0]}
        max={LIMITS.count[1]}
        step={100}
        format={(v) => v}
        onChange={(v) => onParam('count', v)}
      />
      <Slider
        label="Reichweite"
        title="Mittlere Zahl der Nachbarn, die ein Partikel spürt. Daraus wird der Wirkradius berechnet."
        value={params.neighbors}
        min={LIMITS.neighbors[0]}
        max={LIMITS.neighbors[1]}
        step={0.5}
        format={(v) => v}
        onChange={(v) => onParam('neighbors', v)}
      />
      <Slider
        label="Reibung"
        title="Wie stark die Geschwindigkeit gedämpft wird. Hohe Werte heißt wenig Reibung und damit wildere Bewegung."
        value={params.friction}
        min={LIMITS.friction[0]}
        max={LIMITS.friction[1]}
        step={0.01}
        format={(v) => v.toFixed(2)}
        onChange={(v) => onParam('friction', v)}
      />
      <Slider
        label="β"
        title="Grenze zwischen Nahabstoßung und Anziehung. Klein heißt harte Kerne, groß heißt weiche Wolken."
        value={params.beta}
        min={LIMITS.beta[0]}
        max={LIMITS.beta[1]}
        step={0.01}
        format={(v) => v.toFixed(2)}
        onChange={(v) => onParam('beta', v)}
      />
      <Slider
        label="Kraft"
        title="Globaler Verstärkungsfaktor für alle Kräfte."
        value={params.force}
        min={LIMITS.force[0]}
        max={LIMITS.force[1]}
        step={0.1}
        format={(v) => v.toFixed(1)}
        onChange={(v) => onParam('force', v)}
      />

      <button
        className={params.wrap ? 'btn primary' : 'btn'}
        onClick={() => onParam('wrap', !params.wrap)}
        title="Welt als Torus: Partikel, die rechts hinauslaufen, kommen links wieder herein. Ausgeschaltet prallen sie an den Wänden ab."
      >
        ♾ Torus {params.wrap ? 'an' : 'aus'}
      </button>
    </div>
  )
}
