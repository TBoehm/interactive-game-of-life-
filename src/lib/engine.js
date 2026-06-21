// Topology-agnostic Game of Life engine with per-cell color inheritance.
//
// It runs on any tessellation described by a `topology` object (see topology.js):
// the step function reads each cell's precomputed neighbor indices and applies
// that topology's birth/survival rule. Works identically for square (8 nb),
// hexagonal (6 nb) and triangular (12 nb) grids.
//
// Color replication: a cell born this generation takes the *average* color of
// its live neighbors (the cells that triggered its birth); survivors keep their
// own color. On the square grid (birth = exactly 3) this averages 3 parents;
// on other grids it averages however many neighbors the rule required.

export class Life {
  constructor(topology) {
    this.setTopology(topology)
  }

  setTopology(topology) {
    this.topo = topology
    const size = topology.size
    this.size = size
    this.alive = new Uint8Array(size)
    this.r = new Uint8Array(size)
    this.g = new Uint8Array(size)
    this.b = new Uint8Array(size)
    this._alive = new Uint8Array(size)
    this._r = new Uint8Array(size)
    this._g = new Uint8Array(size)
    this._b = new Uint8Array(size)
    this.generation = 0
    this.population = 0
  }

  clear() {
    this.alive.fill(0)
    this.r.fill(0)
    this.g.fill(0)
    this.b.fill(0)
    this.generation = 0
    this.population = 0
  }

  // Set explicit cell indices alive with a color (used for hex/triangle and any
  // index-based spawning).
  spawnCells(indices, color) {
    for (const i of indices) {
      if (i < 0 || i >= this.size) continue
      this.alive[i] = 1
      this.r[i] = color.r
      this.g[i] = color.g
      this.b[i] = color.b
    }
    this.population = this._countPopulation()
  }

  // Spawn a square-grid pattern (list of [dx, dy]) at an origin, wrapping on the
  // toroidal square grid. Only meaningful for the square topology.
  spawnPattern(cells, originX, originY, color) {
    const { cols, rows } = this.topo
    const indices = []
    for (const [dx, dy] of cells) {
      const x = (((originX + dx) % cols) + cols) % cols
      const y = (((originY + dy) % rows) + rows) % rows
      indices.push(y * cols + x)
    }
    this.spawnCells(indices, color)
  }

  step() {
    if (this.topo.nonTotalistic) {
      this._stepNonTotalistic()
      return
    }
    const { alive, r, g, b, size } = this
    const { neighbors, degree, maxDegree, birth, survival } = this.topo
    const nAlive = this._alive
    const nr = this._r
    const ng = this._g
    const nb = this._b
    let population = 0

    for (let i = 0; i < size; i++) {
      const base = i * maxDegree
      const deg = degree[i]
      let count = 0
      let sr = 0
      let sg = 0
      let sb = 0
      for (let k = 0; k < deg; k++) {
        const j = neighbors[base + k]
        if (alive[j]) {
          count++
          sr += r[j]
          sg += g[j]
          sb += b[j]
        }
      }

      if (alive[i]) {
        if (survival[count]) {
          nAlive[i] = 1
          nr[i] = r[i]
          ng[i] = g[i]
          nb[i] = b[i]
          population++
        } else {
          nAlive[i] = 0
        }
      } else if (birth[count]) {
        nAlive[i] = 1
        nr[i] = (sr / count) | 0
        ng[i] = (sg / count) | 0
        nb[i] = (sb / count) | 0
        population++
      } else {
        nAlive[i] = 0
      }
    }

    this.alive = nAlive
    this.r = nr
    this.g = ng
    this.b = nb
    this._alive = alive
    this._r = r
    this._g = g
    this._b = b
    this.generation++
    this.population = population
  }

  // Isotropic non-totalistic step (hex B2o/S2m34H). Uses the 6 cyclic ring
  // slots: birth/survival are decided by a 64-entry lookup over the live-neighbor
  // arrangement (the bit pattern), not just the count. Born cells average the
  // color of their live ring neighbors.
  _stepNonTotalistic() {
    const { alive, r, g, b, size } = this
    const { ring, intBirth, intSurvive } = this.topo
    const nAlive = this._alive
    const nr = this._r
    const ng = this._g
    const nb = this._b
    let population = 0

    for (let i = 0; i < size; i++) {
      const base = i * 6
      let mask = 0
      let count = 0
      let sr = 0
      let sg = 0
      let sb = 0
      for (let s = 0; s < 6; s++) {
        const j = ring[base + s]
        if (j >= 0 && alive[j]) {
          mask |= 1 << s
          count++
          sr += r[j]
          sg += g[j]
          sb += b[j]
        }
      }

      if (alive[i]) {
        if (intSurvive[mask]) {
          nAlive[i] = 1
          nr[i] = r[i]
          ng[i] = g[i]
          nb[i] = b[i]
          population++
        } else {
          nAlive[i] = 0
        }
      } else if (intBirth[mask]) {
        nAlive[i] = 1
        nr[i] = (sr / count) | 0
        ng[i] = (sg / count) | 0
        nb[i] = (sb / count) | 0
        population++
      } else {
        nAlive[i] = 0
      }
    }

    this.alive = nAlive
    this.r = nr
    this.g = ng
    this.b = nb
    this._alive = alive
    this._r = r
    this._g = g
    this._b = b
    this.generation++
    this.population = population
  }

  _countPopulation() {
    let p = 0
    for (let i = 0; i < this.size; i++) p += this.alive[i]
    return p
  }
}
