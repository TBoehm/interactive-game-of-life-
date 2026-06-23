// Catalog of the most common named Conway patterns. Each entry stores live-cell
// coordinates; the canonical key (used for recognition) is derived from those
// coordinates with the same pipeline used at runtime, so the database can never
// drift out of sync with the identifier.
//
// Sources: the usual "ash" objects that dominate random-soup censuses
// (LifeWiki / Catagolue): still lifes, oscillators and small spaceships.

import { identifyObject } from './identify'

const RAW = [
  // ---- Still lifes ----
  {
    name: 'Block',
    type: 'still',
    cells: [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ],
  },
  {
    name: 'Tub',
    type: 'still',
    cells: [
      [1, 0],
      [0, 1],
      [2, 1],
      [1, 2],
    ],
  },
  {
    name: 'Boat',
    type: 'still',
    cells: [
      [0, 0],
      [1, 0],
      [0, 1],
      [2, 1],
      [1, 2],
    ],
  },
  {
    name: 'Ship',
    type: 'still',
    cells: [
      [0, 0],
      [1, 0],
      [0, 1],
      [2, 1],
      [1, 2],
      [2, 2],
    ],
  },
  {
    name: 'Beehive',
    type: 'still',
    cells: [
      [1, 0],
      [2, 0],
      [0, 1],
      [3, 1],
      [1, 2],
      [2, 2],
    ],
  },
  {
    name: 'Loaf',
    type: 'still',
    cells: [
      [1, 0],
      [2, 0],
      [0, 1],
      [3, 1],
      [1, 2],
      [3, 2],
      [2, 3],
    ],
  },
  {
    name: 'Pond',
    type: 'still',
    cells: [
      [1, 0],
      [2, 0],
      [0, 1],
      [3, 1],
      [0, 2],
      [3, 2],
      [1, 3],
      [2, 3],
    ],
  },
  {
    name: 'Barge',
    type: 'still',
    cells: [
      [1, 0],
      [0, 1],
      [2, 1],
      [1, 2],
      [3, 2],
      [2, 3],
    ],
  },
  {
    name: 'Long Boat',
    type: 'still',
    cells: [
      [1, 0],
      [0, 1],
      [2, 1],
      [1, 2],
      [3, 2],
      [2, 3],
      [3, 3],
    ],
  },

  // ---- Oscillators ----
  {
    name: 'Blinker',
    type: 'oscillator',
    cells: [
      [0, 0],
      [1, 0],
      [2, 0],
    ],
  },
  {
    name: 'Toad',
    type: 'oscillator',
    cells: [
      [1, 0],
      [2, 0],
      [3, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
  },
  {
    name: 'Beacon',
    type: 'oscillator',
    cells: [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
      [2, 2],
      [3, 2],
      [2, 3],
      [3, 3],
    ],
  },
  {
    name: 'Pulsar',
    type: 'oscillator',
    cells: [
      [2, 0],
      [3, 0],
      [4, 0],
      [8, 0],
      [9, 0],
      [10, 0],
      [0, 2],
      [5, 2],
      [7, 2],
      [12, 2],
      [0, 3],
      [5, 3],
      [7, 3],
      [12, 3],
      [0, 4],
      [5, 4],
      [7, 4],
      [12, 4],
      [2, 5],
      [3, 5],
      [4, 5],
      [8, 5],
      [9, 5],
      [10, 5],
      [2, 7],
      [3, 7],
      [4, 7],
      [8, 7],
      [9, 7],
      [10, 7],
      [0, 8],
      [5, 8],
      [7, 8],
      [12, 8],
      [0, 9],
      [5, 9],
      [7, 9],
      [12, 9],
      [0, 10],
      [5, 10],
      [7, 10],
      [12, 10],
      [2, 12],
      [3, 12],
      [4, 12],
      [8, 12],
      [9, 12],
      [10, 12],
    ],
  },
  {
    name: 'Pentadecathlon',
    type: 'oscillator',
    cells: [
      [2, 0],
      [7, 0],
      [0, 1],
      [1, 1],
      [3, 1],
      [4, 1],
      [5, 1],
      [6, 1],
      [8, 1],
      [9, 1],
      [2, 2],
      [7, 2],
    ],
  },

  // ---- Spaceships ----
  {
    name: 'Glider',
    type: 'spaceship',
    cells: [
      [1, 0],
      [2, 1],
      [0, 2],
      [1, 2],
      [2, 2],
    ],
  },
  {
    name: 'Lightweight Spaceship (LWSS)',
    type: 'spaceship',
    cells: [
      [0, 0],
      [3, 0],
      [4, 1],
      [0, 2],
      [4, 2],
      [1, 3],
      [2, 3],
      [3, 3],
      [4, 3],
    ],
  },
  {
    name: 'Middleweight Spaceship (MWSS)',
    type: 'spaceship',
    cells: [
      [2, 0],
      [0, 1],
      [4, 1],
      [5, 2],
      [0, 3],
      [5, 3],
      [1, 4],
      [2, 4],
      [3, 4],
      [4, 4],
      [5, 4],
    ],
  },
]

// German labels for the four behavioral types.
export const TYPE_LABEL = {
  still: 'Stillleben',
  oscillator: 'Oszillator',
  spaceship: 'Raumschiff',
  active: 'noch aktiv',
  died: 'instabil',
}

// Build the catalog: derive each entry's canonical key + period from its cells.
export const CATALOG = RAW.map((entry) => {
  const info = identifyObject(entry.cells)
  return { ...entry, period: info.period, canonical: info.canonical, info }
})

const BY_KEY = new Map()
for (const entry of CATALOG) {
  if (entry.canonical && !BY_KEY.has(entry.canonical)) BY_KEY.set(entry.canonical, entry)
}

// Look up a name by canonical key. Returns the catalog entry or null.
export function lookup(canonical) {
  return (canonical && BY_KEY.get(canonical)) || null
}

// Describe an identified object as a short, hyphen-free label.
export function describe(info) {
  const named = lookup(info.canonical)
  const typeLabel = TYPE_LABEL[info.type] || 'unbekannt'
  if (named) {
    if (info.type === 'oscillator') return `${named.name} · Oszillator P${info.period}`
    if (info.type === 'spaceship') return `${named.name} · Raumschiff`
    return `${named.name} · ${typeLabel}`
  }
  if (info.type === 'still') return 'Stillleben (unbenannt)'
  if (info.type === 'oscillator') return `Oszillator P${info.period} (unbenannt)`
  if (info.type === 'spaceship') return `Raumschiff P${info.period} (unbenannt)`
  return typeLabel
}
