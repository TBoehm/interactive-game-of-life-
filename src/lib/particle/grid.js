// Uniform grid for neighbor queries — the Particle Life counterpart to the
// precomputed neighbor tables in topology.js.
//
// The Game of Life can pack neighbors once and reuse them forever, because
// cells never move. Particles do move, so the neighborhood is rebuilt every
// step. The construction is a counting sort into cells of size >= rmax:
//
//   1. count how many particles land in each cell
//   2. prefix-sum the counts into start offsets
//   3. scatter the particle indices into `order`
//
// Afterwards the particles of one cell occupy a contiguous slice
// order[cellStart[c] .. cellStart[c+1]), which makes the neighbor sweep a
// linear scan over 9 (2D) or 27 (3D) slices with no allocation and good cache
// behaviour. Everything is O(n) per step.
//
// The class deliberately exposes its raw arrays instead of an iterator: the
// force loop in physics.js is the hot path of the whole simulation and must
// stay a plain nested for-loop.

export class Grid {
  constructor(world, capacity) {
    this.configure(world, capacity)
  }

  configure(world, capacity) {
    const { dims, w, h, d, rmax } = world
    this.dims = dims
    this.w = w
    this.h = h
    this.d = d
    this.wrap = world.wrap

    // Cell size is w / nx >= rmax, so a 3x3(x3) block always covers rmax.
    this.nx = Math.max(3, Math.floor(w / rmax))
    this.ny = Math.max(3, Math.floor(h / rmax))
    this.nz = dims === 3 ? Math.max(3, Math.floor(d / rmax)) : 1
    this.cw = w / this.nx
    this.ch = h / this.ny
    this.cd = dims === 3 ? d / this.nz : 1

    const ncells = this.nx * this.ny * this.nz
    this.ncells = ncells
    this.cellStart = new Int32Array(ncells + 1)
    this.cursor = new Int32Array(ncells)
    this.capacity = Math.max(1, capacity)
    this.order = new Int32Array(this.capacity)
    this.cellOf = new Int32Array(this.capacity)
    this.count = 0
  }

  ensureCapacity(capacity) {
    if (capacity > this.capacity) {
      this.capacity = capacity
      this.order = new Int32Array(capacity)
      this.cellOf = new Int32Array(capacity)
    }
  }

  cellX(x) {
    const i = (x / this.cw) | 0
    return i < 0 ? 0 : i >= this.nx ? this.nx - 1 : i
  }

  cellY(y) {
    const i = (y / this.ch) | 0
    return i < 0 ? 0 : i >= this.ny ? this.ny - 1 : i
  }

  cellZ(z) {
    const i = (z / this.cd) | 0
    return i < 0 ? 0 : i >= this.nz ? this.nz - 1 : i
  }

  build(px, py, pz, count) {
    this.ensureCapacity(count)
    this.count = count
    const { nx, ny, cellStart, cursor, cellOf, order, ncells } = this
    const nxy = nx * ny
    const is3d = this.dims === 3

    cursor.fill(0)
    for (let i = 0; i < count; i++) {
      const c = is3d
        ? this.cellX(px[i]) + this.cellY(py[i]) * nx + this.cellZ(pz[i]) * nxy
        : this.cellX(px[i]) + this.cellY(py[i]) * nx
      cellOf[i] = c
      cursor[c]++
    }

    let acc = 0
    for (let c = 0; c < ncells; c++) {
      cellStart[c] = acc
      acc += cursor[c]
      cursor[c] = cellStart[c]
    }
    cellStart[ncells] = acc

    for (let i = 0; i < count; i++) order[cursor[cellOf[i]]++] = i
  }

  // Collect the neighbors of one cell coordinate into `out` (an Int32Array
  // scratch buffer), returning how many were written. Only used by tests and
  // by the reference implementation they check against — the real force loop
  // inlines this walk.
  collect(cx, cy, cz, out) {
    const { nx, ny, nz, cellStart, order, wrap } = this
    const nxy = nx * ny
    const zLo = this.dims === 3 ? -1 : 0
    const zHi = this.dims === 3 ? 1 : 0
    let n = 0
    for (let dz = zLo; dz <= zHi; dz++) {
      let z = cz + dz
      if (wrap) z = z < 0 ? z + nz : z >= nz ? z - nz : z
      else if (z < 0 || z >= nz) continue
      for (let dy = -1; dy <= 1; dy++) {
        let y = cy + dy
        if (wrap) y = y < 0 ? y + ny : y >= ny ? y - ny : y
        else if (y < 0 || y >= ny) continue
        for (let dx = -1; dx <= 1; dx++) {
          let x = cx + dx
          if (wrap) x = x < 0 ? x + nx : x >= nx ? x - nx : x
          else if (x < 0 || x >= nx) continue
          const c = x + y * nx + z * nxy
          for (let k = cellStart[c]; k < cellStart[c + 1]; k++) out[n++] = order[k]
        }
      }
    }
    return n
  }
}
