// Topology layer: defines grid geometry, neighbor relations and the default
// Life rule for each supported tessellation (square, hexagonal, triangular).
//
// Why this exists: Conway's Game of Life is tied to the *square* grid with its
// 8 neighbors and the B3/S23 rule. Other tessellations have a different number
// of neighbors, so the rule (and the resulting dynamics) must change too:
//
//   - Square    : 8 neighbors, classic totalistic B3/S23.
//   - Hexagonal : 6 neighbors. Research (Bays 2005) shows *totalistic* hex rules
//                 are poor — patterns collapse to dust. The genuinely Life-like
//                 hex rule is the isotropic NON-totalistic B2o/S2m34H (Callahan
//                 1997): birth/survival depend on the *arrangement* of neighbors
//                 (ortho/meta/para), not just the count. It has oscillators
//                 (flippers p2/4/8) and a 2c/4 spaceship, and is Turing-complete.
//   - Triangular: 12 neighbors (edge + vertex touching) — exactly Bays' (1994)
//                 triangular neighborhood. We use his validated GL rule
//                 "Life 4546" (B456/S45): bounded growth with gliders, the
//                 richest of his six triangular Life rules in oscillators.
//
// A topology exposes everything the engine and renderer need:
//   cols, rows, size, maxDegree, neighbors[], degree[], rule, geometry, and —
//   for non-totalistic hex — ring[] (6 cyclic neighbor slots) plus intBirth[64]
//   / intSurvive[64] lookup tables.

const SQRT3 = Math.sqrt(3)

export const TOPOLOGIES = {
  square: { label: 'Quadrat', neighbors: 8 },
  hex: { label: 'Hexagon', neighbors: 6 },
  triangle: { label: 'Dreieck', neighbors: 12 },
}

// Default rules per topology.
//   totalistic: { type:'totalistic', label, birth:[...], survival:[...] }
//   int-hex:    { type:'int-hex', label }  (isotropic non-totalistic, B2o/S2m34H)
export const DEFAULT_RULES = {
  square: { type: 'totalistic', label: 'B3/S23', birth: [3], survival: [2, 3] },
  hex: { type: 'int-hex', label: 'B2o/S2m34H' },
  // Bays Life 4546 (E4-5/F4-6): a validated triangular Game-of-Life rule.
  triangle: { type: 'totalistic', label: 'B456/S45', birth: [4, 5, 6], survival: [4, 5] },
}

export function createTopology(kind, cols, rows, cellPx, rule) {
  switch (kind) {
    case 'hex':
      return buildHex(cols, rows, cellPx, rule)
    case 'triangle':
      return buildTriangle(cols, rows, cellPx, rule)
    default:
      return buildSquare(cols, rows, cellPx, rule)
  }
}

// Pack a list of per-cell neighbor index arrays into flat typed arrays.
function packNeighbors(size, maxDegree, neighborLists) {
  const neighbors = new Int32Array(size * maxDegree).fill(-1)
  const degree = new Uint8Array(size)
  for (let i = 0; i < size; i++) {
    const list = neighborLists[i]
    degree[i] = list.length
    for (let k = 0; k < list.length; k++) neighbors[i * maxDegree + k] = list[k]
  }
  return { neighbors, degree }
}

// ---- Isotropic non-totalistic hex classification --------------------------
// A cell's 6 ring neighbors form a 6-bit mask (bit s = slot s is alive, slots
// in cyclic/angular order). For counts 2/3/4 the *arrangement* matters and is
// classified as ortho (o), meta (m) or para (p); counts 0/1/5/6 have a single
// form. Classification is rotation- and reflection-invariant.
function popcount6(m) {
  let c = 0
  for (let s = 0; s < 6; s++) if (m & (1 << s)) c++
  return c
}

// circular distance between two ring slots (1..3)
function circDist(a, b) {
  const d = Math.abs(a - b)
  return Math.min(d, 6 - d)
}

function classifyHexMask(mask) {
  const count = popcount6(mask)
  const on = []
  for (let s = 0; s < 6; s++) if (mask & (1 << s)) on.push(s)

  if (count === 2) {
    const d = circDist(on[0], on[1])
    return { count, letter: d === 1 ? 'o' : d === 2 ? 'm' : 'p' }
  }
  if (count === 4) {
    // classify by the two *dead* slots (complement of a count-2 arrangement)
    const off = []
    for (let s = 0; s < 6; s++) if (!(mask & (1 << s))) off.push(s)
    const d = circDist(off[0], off[1])
    return { count, letter: d === 1 ? 'o' : d === 2 ? 'm' : 'p' }
  }
  if (count === 3) {
    // gaps between consecutive live slots (cyclic) partition 6 into 3 parts
    const gaps = [on[1] - on[0], on[2] - on[1], 6 - on[2] + on[0]].sort((a, b) => a - b)
    if (gaps[0] === 2) return { count, letter: 'p' } // 2,2,2 alternating
    if (gaps[1] === 1) return { count, letter: 'o' } // 1,1,4 consecutive
    return { count, letter: 'm' } // 1,2,3
  }
  return { count, letter: '' }
}

// Build the 64-entry birth/survival lookup for B2o/S2m34H.
//   Birth:    2o
//   Survival: 2m, 3 (all), 4 (all)
function buildHexIntTables() {
  const intBirth = new Uint8Array(64)
  const intSurvive = new Uint8Array(64)
  for (let mask = 0; mask < 64; mask++) {
    const { count, letter } = classifyHexMask(mask)
    intBirth[mask] = count === 2 && letter === 'o' ? 1 : 0
    intSurvive[mask] = (count === 2 && letter === 'm') || count === 3 || count === 4 ? 1 : 0
  }
  return { intBirth, intSurvive }
}

// ---- Square (toroidal, 8 neighbors) ---------------------------------------
function buildSquare(cols, rows, s, rule) {
  const size = cols * rows
  const idx = (c, r) => r * cols + c
  const lists = new Array(size)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const list = []
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dc === 0 && dr === 0) continue
          const nc = (c + dc + cols) % cols
          const nr = (r + dr + rows) % rows
          list.push(idx(nc, nr))
        }
      }
      lists[idx(c, r)] = list
    }
  }
  const { neighbors, degree } = packNeighbors(size, 8, lists)

  const polygons = new Array(size)
  const centroidX = new Float32Array(size)
  const centroidY = new Float32Array(size)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * s
      const y = r * s
      polygons[idx(c, r)] = [x, y, x + s, y, x + s, y + s, x, y + s]
      centroidX[idx(c, r)] = x + s / 2
      centroidY[idx(c, r)] = y + s / 2
    }
  }

  return finalize({
    kind: 'square',
    cols,
    rows,
    size,
    maxDegree: 8,
    neighbors,
    degree,
    rule,
    canvasW: cols * s,
    canvasH: rows * s,
    polygons,
    centroidX,
    centroidY,
  })
}

// ---- Hexagonal (bounded, 6 neighbors, pointy-top odd-r offset) -------------
function buildHex(cols, rows, r, rule) {
  const size = cols * rows
  const inB = (c, rr) => c >= 0 && c < cols && rr >= 0 && rr < rows
  const idx = (c, rr) => rr * cols + c

  // redblobgames "odd-r" offset neighbor directions, in cyclic angular order
  // (E, NE, NW, W, SW, SE) so the slot index can drive non-totalistic rules.
  const dirsEven = [
    [1, 0],
    [0, -1],
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, 1],
  ]
  const dirsOdd = [
    [1, 0],
    [1, -1],
    [0, -1],
    [-1, 0],
    [0, 1],
    [1, 1],
  ]

  const lists = new Array(size)
  const ring = new Int32Array(size * 6).fill(-1)
  for (let rr = 0; rr < rows; rr++) {
    const dirs = rr & 1 ? dirsOdd : dirsEven
    for (let c = 0; c < cols; c++) {
      const cell = idx(c, rr)
      const list = []
      for (let s = 0; s < 6; s++) {
        const nc = c + dirs[s][0]
        const nr = rr + dirs[s][1]
        if (inB(nc, nr)) {
          const ni = idx(nc, nr)
          list.push(ni)
          ring[cell * 6 + s] = ni
        }
      }
      lists[cell] = list
    }
  }
  const { neighbors, degree } = packNeighbors(size, 6, lists)

  const hexW = SQRT3 * r
  const polygons = new Array(size)
  const centroidX = new Float32Array(size)
  const centroidY = new Float32Array(size)
  for (let rr = 0; rr < rows; rr++) {
    for (let c = 0; c < cols; c++) {
      const cx = hexW * (c + (rr & 1 ? 0.5 : 0)) + hexW / 2
      const cy = 1.5 * r * rr + r
      const pts = []
      for (let k = 0; k < 6; k++) {
        const ang = (Math.PI / 180) * (60 * k - 90)
        pts.push(cx + r * Math.cos(ang), cy + r * Math.sin(ang))
      }
      polygons[idx(c, rr)] = pts
      centroidX[idx(c, rr)] = cx
      centroidY[idx(c, rr)] = cy
    }
  }

  const extra = { ring }
  if (rule.type === 'int-hex') {
    const { intBirth, intSurvive } = buildHexIntTables()
    extra.nonTotalistic = true
    extra.intBirth = intBirth
    extra.intSurvive = intSurvive
  }

  return finalize({
    kind: 'hex',
    cols,
    rows,
    size,
    maxDegree: 6,
    neighbors,
    degree,
    rule,
    canvasW: hexW * (cols + 0.5),
    canvasH: 1.5 * r * rows + 0.5 * r,
    polygons,
    centroidX,
    centroidY,
    extra,
  })
}

// ---- Triangular (bounded, 12 neighbors: edge + vertex touching) ------------
// Up-triangle when (c + r) is even. The 12-neighborhood per triangular CA
// literature: same row c±1, c±2; and 3/5 cells in the rows above/below
// depending on orientation (symmetric overall).
function buildTriangle(cols, rows, L, rule) {
  const size = cols * rows
  const inB = (c, r) => c >= 0 && c < cols && r >= 0 && r < rows
  const idx = (c, r) => r * cols + c
  const isUp = (c, r) => ((c + r) & 1) === 0

  const lists = new Array(size)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const list = []
      const same = [c - 2, c - 1, c + 1, c + 2]
      for (const nc of same) if (inB(nc, r)) list.push(idx(nc, r))
      if (isUp(c, r)) {
        // up-triangle: 3 above, 5 below
        for (const nc of [c - 1, c, c + 1]) if (inB(nc, r - 1)) list.push(idx(nc, r - 1))
        for (const nc of [c - 2, c - 1, c, c + 1, c + 2])
          if (inB(nc, r + 1)) list.push(idx(nc, r + 1))
      } else {
        // down-triangle: 5 above, 3 below
        for (const nc of [c - 2, c - 1, c, c + 1, c + 2])
          if (inB(nc, r - 1)) list.push(idx(nc, r - 1))
        for (const nc of [c - 1, c, c + 1]) if (inB(nc, r + 1)) list.push(idx(nc, r + 1))
      }
      lists[idx(c, r)] = list
    }
  }
  const { neighbors, degree } = packNeighbors(size, 12, lists)

  const h = (L * SQRT3) / 2
  const half = L / 2
  const polygons = new Array(size)
  const centroidX = new Float32Array(size)
  const centroidY = new Float32Array(size)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x0 = c * half
      const yTop = r * h
      const yBot = (r + 1) * h
      let pts
      if (isUp(c, r)) {
        pts = [x0, yBot, x0 + L, yBot, x0 + half, yTop]
      } else {
        pts = [x0, yTop, x0 + L, yTop, x0 + half, yBot]
      }
      polygons[idx(c, r)] = pts
      centroidX[idx(c, r)] = (pts[0] + pts[2] + pts[4]) / 3
      centroidY[idx(c, r)] = (pts[1] + pts[3] + pts[5]) / 3
    }
  }

  return finalize({
    kind: 'triangle',
    cols,
    rows,
    size,
    maxDegree: 12,
    neighbors,
    degree,
    rule,
    canvasW: cols * half + half,
    canvasH: rows * h,
    polygons,
    centroidX,
    centroidY,
  })
}

function finalize(t) {
  const topo = { ...t, ...(t.extra || {}) }
  delete topo.extra
  // Totalistic lookup tables indexed by live-neighbor count.
  if (t.rule.birth && t.rule.survival) {
    const birth = new Uint8Array(t.maxDegree + 1)
    const survival = new Uint8Array(t.maxDegree + 1)
    for (const n of t.rule.birth) if (n <= t.maxDegree) birth[n] = 1
    for (const n of t.rule.survival) if (n <= t.maxDegree) survival[n] = 1
    topo.birth = birth
    topo.survival = survival
  }
  return topo
}

// Nearest-centroid hit test. Exact for square/hex; good enough for triangle.
export function cellAt(topo, x, y) {
  let best = -1
  let bestD = Infinity
  const { centroidX, centroidY, size } = topo
  for (let i = 0; i < size; i++) {
    const dx = centroidX[i] - x
    const dy = centroidY[i] - y
    const d = dx * dx + dy * dy
    if (d < bestD) {
      bestD = d
      best = i
    }
  }
  return best
}
