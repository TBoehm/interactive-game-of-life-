// Game of Life simulation engine with per-cell color and color inheritance.
//
// Colors replicate by inheritance: when a dead cell is born (exactly 3 live
// neighbours), the newborn cell takes the *average* color of those 3 parents.
// Surviving cells keep their own color. As a result each spawned structure
// carries its own hue, and when two structures collide their colors blend
// organically. The grid is toroidal (edges wrap), so spaceships fly forever.

export class Life {
  constructor(width, height) {
    this.resize(width, height)
  }

  resize(width, height) {
    this.width = width
    this.height = height
    this.size = width * height
    this.alive = new Uint8Array(this.size)
    this.r = new Uint8Array(this.size)
    this.g = new Uint8Array(this.size)
    this.b = new Uint8Array(this.size)
    // Scratch buffers for the next generation (double buffering).
    this._alive = new Uint8Array(this.size)
    this._r = new Uint8Array(this.size)
    this._g = new Uint8Array(this.size)
    this._b = new Uint8Array(this.size)
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

  // Place a pattern's live cells with the given color. Coordinates wrap around
  // the toroidal grid. Existing live cells in the footprint are overwritten.
  spawn(cells, originX, originY, color) {
    const { width, height } = this
    for (const [dx, dy] of cells) {
      const x = ((originX + dx) % width + width) % width
      const y = ((originY + dy) % height + height) % height
      const i = y * width + x
      this.alive[i] = 1
      this.r[i] = color.r
      this.g[i] = color.g
      this.b[i] = color.b
    }
    this.population = this._countPopulation()
  }

  // Advance one generation.
  step() {
    const { width, height, alive, r, g, b } = this
    const nAlive = this._alive
    const nr = this._r
    const ng = this._g
    const nb = this._b
    let population = 0

    for (let y = 0; y < height; y++) {
      const yUp = (y - 1 + height) % height
      const yDn = (y + 1) % height
      for (let x = 0; x < width; x++) {
        const xLt = (x - 1 + width) % width
        const xRt = (x + 1) % width

        // Indices of the 8 neighbours (toroidal).
        const n0 = yUp * width + xLt
        const n1 = yUp * width + x
        const n2 = yUp * width + xRt
        const n3 = y * width + xLt
        const n4 = y * width + xRt
        const n5 = yDn * width + xLt
        const n6 = yDn * width + x
        const n7 = yDn * width + xRt

        const count =
          alive[n0] + alive[n1] + alive[n2] + alive[n3] +
          alive[n4] + alive[n5] + alive[n6] + alive[n7]

        const i = y * width + x

        if (alive[i]) {
          // Survival: 2 or 3 neighbours. Keep own color.
          if (count === 2 || count === 3) {
            nAlive[i] = 1
            nr[i] = r[i]
            ng[i] = g[i]
            nb[i] = b[i]
            population++
          } else {
            nAlive[i] = 0
          }
        } else if (count === 3) {
          // Birth: average the color of the 3 live parents.
          let sr = 0
          let sg = 0
          let sb = 0
          if (alive[n0]) { sr += r[n0]; sg += g[n0]; sb += b[n0] }
          if (alive[n1]) { sr += r[n1]; sg += g[n1]; sb += b[n1] }
          if (alive[n2]) { sr += r[n2]; sg += g[n2]; sb += b[n2] }
          if (alive[n3]) { sr += r[n3]; sg += g[n3]; sb += b[n3] }
          if (alive[n4]) { sr += r[n4]; sg += g[n4]; sb += b[n4] }
          if (alive[n5]) { sr += r[n5]; sg += g[n5]; sb += b[n5] }
          if (alive[n6]) { sr += r[n6]; sg += g[n6]; sb += b[n6] }
          if (alive[n7]) { sr += r[n7]; sg += g[n7]; sb += b[n7] }
          nAlive[i] = 1
          nr[i] = (sr / 3) | 0
          ng[i] = (sg / 3) | 0
          nb[i] = (sb / 3) | 0
          population++
        } else {
          nAlive[i] = 0
        }
      }
    }

    // Swap buffers.
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

  // Sprinkle several random patterns across the board.
  seedRandom(spawnFn, count) {
    for (let n = 0; n < count; n++) spawnFn()
  }

  _countPopulation() {
    let p = 0
    for (let i = 0; i < this.size; i++) p += this.alive[i]
    return p
  }
}
