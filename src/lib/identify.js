// Pattern identification for the square (Conway) grid.
//
// Identity is decided by *behavior*, not pixels: an isolated object is simulated
// forward under Conway's rule to find its period and (for spaceships) its
// translation. A canonical key, invariant under translation, the 8 dihedral
// (D4) symmetries and oscillator phase, is then used to look a name up in the
// catalog. So a Blinker matches regardless of orientation or phase, a Glider in
// any of its four diagonal directions, a Boat in any of its eight.

const MAX_PERIOD = 60
const POP_CAP = 1024

// Conway B3/S23 step over a Set of "x,y" coordinate keys (an unbounded plane).
function step(cells) {
  const counts = new Map()
  for (const key of cells) {
    const comma = key.indexOf(',')
    const x = +key.slice(0, comma)
    const y = +key.slice(comma + 1)
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue
        const k = `${x + dx},${y + dy}`
        counts.set(k, (counts.get(k) || 0) + 1)
      }
    }
  }
  const next = new Set()
  for (const [k, c] of counts) {
    if (c === 3 || (c === 2 && cells.has(k))) next.add(k)
  }
  return next
}

// Translate a coordinate list to the origin and return a stable key.
function normalizeList(list) {
  let minX = Infinity
  let minY = Infinity
  for (const [x, y] of list) {
    if (x < minX) minX = x
    if (y < minY) minY = y
  }
  const shifted = list.map(([x, y]) => [x - minX, y - minY])
  shifted.sort((a, b) => a[0] - b[0] || a[1] - b[1])
  return { key: shifted.map((p) => `${p[0]},${p[1]}`).join(' '), minX, minY, list: shifted }
}

function normalizeSet(cells) {
  const list = []
  for (const key of cells) {
    const comma = key.indexOf(',')
    list.push([+key.slice(0, comma), +key.slice(comma + 1)])
  }
  return normalizeList(list)
}

// The 8 dihedral transforms (rotations + reflections).
const TRANSFORMS = [
  ([x, y]) => [x, y],
  ([x, y]) => [-y, x],
  ([x, y]) => [-x, -y],
  ([x, y]) => [y, -x],
  ([x, y]) => [-x, y],
  ([x, y]) => [x, -y],
  ([x, y]) => [y, x],
  ([x, y]) => [-y, -x],
]

// Canonical key: the lexicographically smallest normalized key over every phase
// (shape list) and every D4 transform. Phase- and orientation-invariant.
function canonicalKey(phaseLists) {
  let best = null
  for (const list of phaseLists) {
    for (const t of TRANSFORMS) {
      const { key } = normalizeList(list.map(t))
      if (best === null || key < best) best = key
    }
  }
  return best
}

// Identify a relative-coordinate cell list ([[x,y], ...]).
// Returns { type, period, dx, dy, canonical } where type is one of
// 'still' | 'oscillator' | 'spaceship' | 'active' | 'died'.
export function identifyObject(relCells) {
  if (relCells.length === 0) return { type: 'died' }
  const startList = relCells.map(([x, y]) => [x, y])
  const orig = normalizeList(startList)
  let cur = new Set(orig.list.map((p) => `${p[0]},${p[1]}`))
  const phases = [orig.list]

  for (let g = 1; g <= MAX_PERIOD; g++) {
    cur = step(cur)
    if (cur.size === 0) return { type: 'died' }
    if (cur.size > POP_CAP) return { type: 'active' }
    const n = normalizeSet(cur)
    if (n.key === orig.key) {
      const dx = n.minX - orig.minX
      const dy = n.minY - orig.minY
      let type
      if (g === 1 && dx === 0 && dy === 0) type = 'still'
      else if (dx === 0 && dy === 0) type = 'oscillator'
      else type = 'spaceship'
      return { type, period: g, dx, dy, canonical: canonicalKey(phases) }
    }
    phases.push(n.list)
  }
  return { type: 'active' }
}

// ---- Connected components on the (toroidal) grid ---------------------------
// Flood-fills live cells via the topology's own neighbor lists and records
// each cell's coordinate *relative* to the component's start, unwrapping across
// the toroidal seam so the shape is contiguous.
export function components(life, topo) {
  const { size, neighbors, degree, maxDegree, cols, rows } = topo
  const { alive } = life
  const seen = new Uint8Array(size)
  const cellOf = new Int32Array(size).fill(-1)
  const comps = []

  for (let s = 0; s < size; s++) {
    if (!alive[s] || seen[s]) continue
    const id = comps.length
    const coords = new Map([[s, [0, 0]]])
    const stack = [s]
    seen[s] = 1
    cellOf[s] = id
    while (stack.length) {
      const cur = stack.pop()
      const cx = cur % cols
      const cy = (cur / cols) | 0
      const [rx, ry] = coords.get(cur)
      const base = cur * maxDegree
      for (let k = 0; k < degree[cur]; k++) {
        const nb = neighbors[base + k]
        if (nb < 0 || !alive[nb] || seen[nb]) continue
        seen[nb] = 1
        cellOf[nb] = id
        const nx = nb % cols
        const ny = (nb / cols) | 0
        let dx = nx - cx
        if (dx > 1) dx -= cols
        else if (dx < -1) dx += cols
        let dy = ny - cy
        if (dy > 1) dy -= rows
        else if (dy < -1) dy += rows
        coords.set(nb, [rx + dx, ry + dy])
        stack.push(nb)
      }
    }
    comps.push([...coords.values()])
  }
  return { comps, cellOf }
}
