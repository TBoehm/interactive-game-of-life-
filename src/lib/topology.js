// Topology layer: defines grid geometry, neighbor relations and the default
// Life rule for each supported tessellation (square, hexagonal, triangular).
//
// Why this exists: Conway's Game of Life is tied to the *square* grid with its
// 8 neighbors and the B3/S23 rule. Other tessellations have a different number
// of neighbors, so the rule (and the resulting dynamics) must change too:
//
//   - Square    : 8 neighbors, classic B3/S23.
//   - Hexagonal : 6 neighbors. B3/S23 mostly dies out, so we use B2/S34H,
//                 a known hexagonal Life-like rule that supports gliders.
//   - Triangular: 12 neighbors (edge + vertex touching). Less charted territory;
//                 the default rule below was tuned offline for lively, bounded
//                 behavior.
//
// A topology exposes everything the engine and renderer need:
//   cols, rows, size, maxDegree, neighbors[], degree[], rule {birth, survival},
//   geometry: canvasW, canvasH, polygons (pixel-space vertices per cell),
//   centroidX[], centroidY[] (for click hit-testing).

const SQRT3 = Math.sqrt(3)

export const TOPOLOGIES = {
  square: { label: 'Quadrat', neighbors: 8 },
  hex: { label: 'Hexagon', neighbors: 6 },
  triangle: { label: 'Dreieck', neighbors: 12 },
}

// Default Life rules per topology. birth/survival are arrays of neighbor counts.
export const DEFAULT_RULES = {
  square: { birth: [3], survival: [2, 3] }, // Conway B3/S23
  hex: { birth: [2], survival: [3, 4] }, // B2/S34H (hexagonal)
  triangle: { birth: [4, 5], survival: [3, 4, 5] }, // tuned offline for 12-neighborhood
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

  return finalize(
    'square',
    cols,
    rows,
    size,
    8,
    neighbors,
    degree,
    rule,
    cols * s,
    rows * s,
    polygons,
    centroidX,
    centroidY,
  )
}

// ---- Hexagonal (bounded, 6 neighbors, pointy-top odd-r offset) -------------
function buildHex(cols, rows, r, rule) {
  const size = cols * rows
  const inB = (c, rr) => c >= 0 && c < cols && rr >= 0 && rr < rows
  const idx = (c, rr) => rr * cols + c

  // redblobgames "odd-r" offset neighbor directions.
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
  for (let rr = 0; rr < rows; rr++) {
    const dirs = rr & 1 ? dirsOdd : dirsEven
    for (let c = 0; c < cols; c++) {
      const list = []
      for (const [dc, dr] of dirs) {
        const nc = c + dc
        const nr = rr + dr
        if (inB(nc, nr)) list.push(idx(nc, nr))
      }
      lists[idx(c, rr)] = list
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

  return finalize(
    'hex',
    cols,
    rows,
    size,
    6,
    neighbors,
    degree,
    rule,
    hexW * (cols + 0.5),
    1.5 * r * rows + 0.5 * r,
    polygons,
    centroidX,
    centroidY,
  )
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

  return finalize(
    'triangle',
    cols,
    rows,
    size,
    12,
    neighbors,
    degree,
    rule,
    cols * half + half,
    rows * h,
    polygons,
    centroidX,
    centroidY,
  )
}

function finalize(
  kind,
  cols,
  rows,
  size,
  maxDegree,
  neighbors,
  degree,
  rule,
  canvasW,
  canvasH,
  polygons,
  centroidX,
  centroidY,
) {
  // Boolean lookup tables indexed by live-neighbor count.
  const birth = new Uint8Array(maxDegree + 1)
  const survival = new Uint8Array(maxDegree + 1)
  for (const n of rule.birth) if (n <= maxDegree) birth[n] = 1
  for (const n of rule.survival) if (n <= maxDegree) survival[n] = 1
  return {
    kind,
    cols,
    rows,
    size,
    maxDegree,
    neighbors,
    degree,
    rule,
    birth,
    survival,
    canvasW,
    canvasH,
    polygons,
    centroidX,
    centroidY,
  }
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
