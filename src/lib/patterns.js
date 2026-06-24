// Curated library of *non-static* Game of Life patterns: oscillators, spaceships,
// methuselahs and a gun. Still lifes are deliberately excluded so that every
// click produces something that visibly "lives" (moves, pulses or evolves).
//
// Each pattern stores its live cells as [x, y] offsets relative to (0, 0).

export const PATTERNS = [
  // ---- Oscillators ----------------------------------------------------------
  {
    name: 'Blinker',
    category: 'Oszillator',
    cells: [
      [0, 0],
      [1, 0],
      [2, 0],
    ],
  },
  {
    name: 'Toad',
    category: 'Oszillator',
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
    category: 'Oszillator',
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
    category: 'Oszillator',
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
    category: 'Oszillator',
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

  // ---- Spaceships -----------------------------------------------------------
  {
    name: 'Glider',
    category: 'Raumschiff',
    cells: [
      [1, 0],
      [2, 1],
      [0, 2],
      [1, 2],
      [2, 2],
    ],
  },
  {
    name: 'Lightweight Spaceship',
    category: 'Raumschiff',
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

  // ---- Methuselahs (small starts, long chaotic evolution) -------------------
  {
    name: 'R-Pentomino',
    category: 'Methuselah',
    cells: [
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1],
      [1, 2],
    ],
  },
  {
    name: 'Acorn',
    category: 'Methuselah',
    cells: [
      [1, 0],
      [3, 1],
      [0, 2],
      [1, 2],
      [4, 2],
      [5, 2],
      [6, 2],
    ],
  },
  {
    name: 'Diehard',
    category: 'Methuselah',
    cells: [
      [6, 0],
      [0, 1],
      [1, 1],
      [1, 2],
      [5, 2],
      [6, 2],
      [7, 2],
    ],
  },

  // ---- Gun (unbounded growth) ----------------------------------------------
  {
    name: 'Gosper Glider Gun',
    category: 'Gun',
    cells: [
      [0, 4],
      [0, 5],
      [1, 4],
      [1, 5],
      [10, 4],
      [10, 5],
      [10, 6],
      [11, 3],
      [11, 7],
      [12, 2],
      [12, 8],
      [13, 2],
      [13, 8],
      [14, 5],
      [15, 3],
      [15, 7],
      [16, 4],
      [16, 5],
      [16, 6],
      [17, 5],
      [20, 2],
      [20, 3],
      [20, 4],
      [21, 2],
      [21, 3],
      [21, 4],
      [22, 1],
      [22, 5],
      [24, 0],
      [24, 1],
      [24, 5],
      [24, 6],
      [34, 2],
      [34, 3],
      [35, 2],
      [35, 3],
    ],
  },
]

// Pick a random pattern. The Gosper gun grows without bound, so it appears less
// often to avoid flooding the board on accidental clicks.
export function randomPattern() {
  const weighted = PATTERNS.filter((p) => p.category !== 'Gun')
  const pool = Math.random() < 0.1 ? PATTERNS : weighted
  return pool[Math.floor(Math.random() * pool.length)]
}

// Hexagonal patterns for the non-totalistic rule B2o/S2m34H. Square patterns are
// meaningless here, so these were harvested and verified offline against the
// actual rule (flippers period 2, the documented 2c/4 spaceship, period-4
// oscillators). Coordinates are (col, row) offsets in odd-r offset coordinates
// and assume an EVEN-row origin (neighbor slots differ by row parity), so the
// spawner snaps the origin row to even.
export const HEX_PATTERNS = [
  {
    name: 'Flipper',
    category: 'Oszillator',
    cells: [
      [0, 0],
      [1, 0],
      [1, 1],
    ],
  },
  {
    name: 'Flipper',
    category: 'Oszillator',
    cells: [
      [0, 1],
      [0, 2],
      [0, 3],
    ],
  },
  {
    name: 'Flipper',
    category: 'Oszillator',
    cells: [
      [0, 1],
      [1, 0],
      [1, 2],
    ],
  },
  {
    name: 'Flipper',
    category: 'Oszillator',
    cells: [
      [0, 1],
      [1, 1],
      [2, 2],
    ],
  },
  {
    name: 'P4-Oszillator',
    category: 'Oszillator',
    cells: [
      [0, 0],
      [0, 1],
      [1, 2],
      [2, 2],
      [3, 2],
    ],
  },
  {
    name: 'P4-Oszillator',
    category: 'Oszillator',
    cells: [
      [0, 1],
      [0, 2],
      [0, 3],
      [1, 0],
      [1, 4],
    ],
  },
  {
    name: 'Raumschiff (2c/4)',
    category: 'Raumschiff',
    cells: [
      [0, 1],
      [1, 0],
      [2, 0],
      [3, 0],
      [3, 3],
      [4, 0],
    ],
  },
  {
    name: 'Raumschiff (2c/4)',
    category: 'Raumschiff',
    cells: [
      [0, 1],
      [0, 4],
      [1, 4],
      [2, 4],
      [3, 3],
      [3, 4],
    ],
  },
  {
    name: 'Raumschiff (2c/4)',
    category: 'Raumschiff',
    cells: [
      [0, 1],
      [1, 1],
      [1, 4],
      [2, 1],
      [3, 1],
      [4, 2],
    ],
  },
]

export function randomHexPattern() {
  return HEX_PATTERNS[Math.floor(Math.random() * HEX_PATTERNS.length)]
}

// Triangular patterns for Bays' rule "Life 4546" (B456/S45) on the 12-neighbor
// triangular grid. Harvested and verified offline against the actual rule
// (period-2 and period-3 oscillators, the 2c/8 spaceship). Coordinates are
// (col, row) and assume an origin where (col + row) is EVEN (the triangle
// orientation, up vs down, depends on that parity), so the spawner snaps the
// origin to even parity.
export const TRI_PATTERNS = [
  {
    name: 'Oszillator P2',
    category: 'Oszillator',
    cells: [
      [0, 1],
      [1, 1],
      [1, 2],
      [2, 2],
      [3, 2],
    ],
  },
  {
    name: 'Oszillator P2',
    category: 'Oszillator',
    cells: [
      [1, 1],
      [2, 1],
      [3, 1],
      [4, 0],
      [4, 1],
    ],
  },
  {
    name: 'Oszillator P2',
    category: 'Oszillator',
    cells: [
      [0, 1],
      [1, 0],
      [2, 0],
      [2, 1],
      [3, 1],
    ],
  },
  {
    name: 'Oszillator P3',
    category: 'Oszillator',
    cells: [
      [1, 1],
      [2, 0],
      [2, 1],
      [3, 1],
      [3, 2],
      [4, 1],
    ],
  },
  {
    name: 'Oszillator P3',
    category: 'Oszillator',
    cells: [
      [0, 1],
      [0, 2],
      [1, 1],
      [1, 2],
      [2, 1],
      [2, 2],
    ],
  },
  {
    name: 'Oszillator P3',
    category: 'Oszillator',
    cells: [
      [0, 2],
      [1, 1],
      [1, 2],
      [2, 2],
      [2, 3],
      [3, 2],
    ],
  },
  {
    name: 'Raumschiff (2c/8)',
    category: 'Raumschiff',
    cells: [
      [0, 1],
      [0, 2],
      [1, 1],
      [1, 2],
      [2, 3],
      [3, 1],
      [4, 1],
    ],
  },
  {
    name: 'Raumschiff (2c/8)',
    category: 'Raumschiff',
    cells: [
      [0, 1],
      [1, 1],
      [2, 3],
      [3, 1],
      [3, 2],
      [4, 1],
      [4, 2],
    ],
  },
]

export function randomTriPattern() {
  return TRI_PATTERNS[Math.floor(Math.random() * TRI_PATTERNS.length)]
}

// 3D patterns for Bays' rule "Life 5766" (B67/S567) on the 26-neighbor cubic
// grid. Harvested and verified offline. Life 5766 is a true Game-of-Life rule,
// so it has all the usual creature types: still lifes, oscillators and a glider
// (spaceship). The 3D Moore neighborhood is uniform, so unlike hex/triangle
// there is no parity constraint.
export const LIFE3D_PATTERNS = [
  {
    name: 'Block (Würfel)',
    category: 'Stillleben',
    cells: [
      [0, 0, 0],
      [0, 0, 1],
      [0, 1, 0],
      [0, 1, 1],
      [1, 0, 0],
      [1, 0, 1],
      [1, 1, 0],
      [1, 1, 1],
    ],
  },
  {
    name: 'Stillleben (3D)',
    category: 'Stillleben',
    cells: [
      [0, 1, 1],
      [1, 0, 1],
      [1, 1, 0],
      [1, 1, 2],
      [1, 2, 1],
      [1, 2, 2],
      [2, 0, 1],
      [2, 1, 0],
      [2, 1, 2],
      [2, 2, 1],
    ],
  },
  {
    name: 'Oszillator (klein)',
    category: 'Oszillator',
    cells: [
      [0, 0, 0],
      [0, 0, 1],
      [0, 0, 2],
      [0, 1, 0],
      [0, 1, 2],
      [0, 2, 1],
      [1, 0, 1],
      [1, 1, 1],
    ],
  },
  {
    name: 'Oszillator (Würfel)',
    category: 'Oszillator',
    cells: [
      [0, 1, 0],
      [0, 1, 1],
      [1, 0, 1],
      [1, 1, 0],
      [1, 1, 2],
      [1, 2, 1],
      [1, 2, 2],
      [2, 0, 1],
      [2, 1, 1],
    ],
  },
  {
    name: 'Oszillator (groß)',
    category: 'Oszillator',
    cells: [
      [0, 2, 1],
      [1, 1, 0],
      [1, 2, 0],
      [1, 2, 2],
      [1, 3, 1],
      [1, 3, 2],
      [2, 0, 1],
      [2, 1, 0],
      [2, 1, 2],
      [2, 2, 0],
      [2, 2, 3],
      [2, 3, 2],
      [3, 1, 1],
      [3, 1, 2],
      [3, 2, 2],
    ],
  },
  {
    name: 'Gleiter (3D)',
    category: 'Raumschiff',
    cells: [
      [0, 0, 0],
      [0, 0, 2],
      [0, 1, 0],
      [0, 1, 2],
      [1, 0, 1],
      [1, 0, 2],
      [1, 1, 1],
      [1, 1, 2],
      [2, 0, 1],
      [2, 1, 1],
    ],
  },
]

export function randomLife3dPattern() {
  return LIFE3D_PATTERNS[Math.floor(Math.random() * LIFE3D_PATTERNS.length)]
}

// Bounding-box dimensions of a pattern, so it can be centered on the click.
export function patternSize(pattern) {
  let maxX = 0
  let maxY = 0
  for (const [x, y] of pattern.cells) {
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }
  return { width: maxX + 1, height: maxY + 1 }
}
