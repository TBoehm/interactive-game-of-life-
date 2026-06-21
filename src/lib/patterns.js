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
