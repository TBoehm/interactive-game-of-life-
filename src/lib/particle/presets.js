// Curated universes — the Particle Life counterpart to patterns.js / catalog.js.
//
// A random matrix is usually boring: most rolls settle into an even soup. So
// the app never starts with one. It starts here, with parameter sets that are
// known to produce something worth watching.
//
// Two kinds of entries exist. Some carry a hand-written matrix whose structure
// is deliberate and readable — "type 1 orbits type 0" is visible in the
// numbers. Others name a generator plus a fixed seed, which keeps them
// reproducible without pretending they were designed entry by entry.
//
// Every preset was checked twice: numerically (it must stay lively without
// exploding — see presets.test.js) and visually, in a real browser, which is
// the only way to notice that a matrix produces beautiful wallpaper that never
// moves again. The descriptions below say what these actually do.

import { generateMatrix } from './matrix'
import { mulberry32 } from './rng'

// Core/shell pairs: an inner type that clings to itself, wrapped in a shell
// type that loves the core but pushes its own kind away — which is exactly how
// you get a membrane instead of a lump. Three such pairs share one world.
function cellsMatrix() {
  const n = 6
  const m = new Float32Array(n * n)
  // Cross-pair relations stay near zero rather than repulsive: a blanket
  // repulsion pushes the cells onto an even lattice where nothing ever meets,
  // and the world freezes into wallpaper.
  for (let p = 0; p < 3; p++) {
    const core = p * 2
    const shell = core + 1
    m[core * n + core] = 1.0
    m[core * n + shell] = 0.35
    m[shell * n + core] = 0.9
    m[shell * n + shell] = -0.7
    // A weak asymmetric link to the next pair keeps the cells drifting and
    // bumping into each other instead of settling.
    const other = ((p + 1) % 3) * 2
    m[core * n + other] = 0.25
    m[other * n + core] = -0.2
  }
  return m
}

// Every type sticks to its own kind and mildly rejects the rest. With the flat
// law the cohesion reaches all the way to rmax, which pulls each droplet into a
// hollow ring: the interior is pushed out by the short range repulsion while
// the rim is held together from every side.
function bubblesMatrix() {
  const n = 3
  const m = new Float32Array(n * n)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) m[i * n + j] = 1
      // Weak and *asymmetric* rejection between the kinds. Strong symmetric
      // repulsion would space the droplets out on a lattice where they never
      // touch; this way they keep drifting into and around each other.
      else m[i * n + j] = i < j ? -0.05 : -0.2
    }
  }
  return m
}

// One predator per prey, in a straight line rather than a ring: 0 hunts 1,
// 1 hunts 2, and the last one flees everything. Produces long chase columns.
function huntMatrix() {
  const n = 4
  const m = new Float32Array(n * n)
  for (let i = 0; i < n; i++) m[i * n + i] = 0.4
  for (let i = 0; i < n - 1; i++) {
    m[i * n + (i + 1)] = 0.9
    m[(i + 1) * n + i] = -0.8
  }
  return m
}

export const PRESETS = [
  {
    id: 'zellen',
    name: 'Zellen',
    meta: 'Struktur',
    description:
      'Drei Kern-Hülle-Paare. Der Kern hält sich selbst zusammen, die Hülle liebt den Kern und meidet ihresgleichen — daraus wird eine Membran statt eines Klumpens.',
    params: { law: 'beta', beta: 0.3, types: 6, count: 2200, neighbors: 20, friction: 0.85 },
    matrix: cellsMatrix,
  },
  {
    id: 'jagdkette',
    name: 'Jagdkette',
    meta: 'Bewegung',
    description:
      'Jeder Typ jagt den nächsten, der davor flieht. Diese Asymmetrie ist der Motor: die Gebilde kommen nie zur Ruhe, sondern wandern als Kolonnen durch die Welt.',
    params: { law: 'beta', beta: 0.3, types: 4, count: 2200, neighbors: 20, friction: 0.86 },
    matrix: huntMatrix,
  },
  {
    id: 'wuermer',
    name: 'Würmer',
    meta: 'Bewegung',
    description:
      'Starker Selbstzusammenhalt plus gerichteter Ring: die Klumpen ziehen sich in die Länge und kriechen als Schlangen umher.',
    params: { law: 'beta', beta: 0.3, types: 6, count: 2000, neighbors: 18, friction: 0.88 },
    matrix: { generator: 'snakes', seed: 20260725 },
  },
  {
    id: 'ringe',
    name: 'Ringe',
    meta: 'Struktur',
    description:
      'Gerichteter Ring über alle Typen. Wo die Kette sich schließt, bilden sich rotierende Räder und Wirbel.',
    params: { law: 'beta', beta: 0.28, types: 5, count: 2200, neighbors: 19, friction: 0.87 },
    matrix: { generator: 'chains', seed: 4711 },
  },
  {
    id: 'blasen',
    name: 'Blasen',
    meta: 'Struktur',
    description:
      'Jeder Typ mag nur sich selbst und meidet die anderen. Es entstehen hunderte hohle Ringe in drei Farben, die langsam durcheinander treiben — außen hält die Anziehung sie zusammen, innen drückt die Nahabstoßung sie auf.',
    params: { law: 'flat', beta: 0.32, types: 3, count: 2400, neighbors: 20, friction: 0.84 },
    matrix: bubblesMatrix,
  },
  {
    id: 'kristall',
    name: 'Kristall',
    meta: 'Ruhe',
    description:
      'Symmetrische Matrix mit konstanter Kraft: Anziehung und Abstoßung heben sich paarweise auf, der Impuls bleibt erhalten. Das Ergebnis ist erstarrte, gitterartige Materie — der Gegenbeweis dafür, dass die Asymmetrie das Leben macht.',
    params: { law: 'flat', beta: 0.35, types: 4, count: 2600, neighbors: 20, friction: 0.75 },
    matrix: { generator: 'symmetric', seed: 1312 },
  },
  {
    id: 'oekosystem',
    name: 'Ökosystem',
    meta: 'Vielfalt',
    description:
      'Neun Typen, rein zufällige Beziehungen. Es entstehen mehrere Strukturarten nebeneinander, die um Platz und Material konkurrieren.',
    params: { law: 'beta', beta: 0.3, types: 9, count: 2800, neighbors: 18, friction: 0.85 },
    matrix: { generator: 'random', seed: 987654321 },
  },
  {
    id: 'sturm',
    name: 'Sturm',
    meta: 'Chaos',
    description:
      'Kaum Reibung, große Reichweite, starke Kräfte. Nichts hält lange zusammen, alles strömt.',
    params: {
      law: 'inverse',
      beta: 0.25,
      types: 6,
      count: 2400,
      neighbors: 20,
      friction: 0.96,
      force: 1.6,
    },
    matrix: { generator: 'random', seed: 55555 },
  },
  {
    id: 'ruhe',
    name: 'Ruhe',
    meta: 'Ruhe',
    description:
      'Viel Reibung, schwache Kräfte. Die Strukturen bewegen sich zäh und behalten ihre Form — gut, um einzelne Gebilde in Ruhe anzuschauen.',
    params: {
      law: 'beta',
      beta: 0.35,
      types: 5,
      count: 2200,
      neighbors: 20,
      friction: 0.62,
      force: 0.8,
    },
    matrix: { generator: 'random', seed: 24680 },
  },
]

export const DEFAULT_PRESET = 'zellen'

export function findPreset(id) {
  return PRESETS.find((p) => p.id === id) ?? PRESETS.find((p) => p.id === DEFAULT_PRESET)
}

// Build the matrix belonging to a preset. Hand-written ones come from their
// factory, generated ones are re-derived from generator + seed, so a preset is
// always exactly reproducible.
export function presetMatrix(preset) {
  if (typeof preset.matrix === 'function') return preset.matrix()
  const { generator, seed } = preset.matrix
  return generateMatrix(generator, preset.params.types, mulberry32(seed))
}

export function presetGenerator(preset) {
  return typeof preset.matrix === 'function' ? 'random' : preset.matrix.generator
}
