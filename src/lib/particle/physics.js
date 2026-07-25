// Particle Life engine — the counterpart to engine.js.
//
// State lives in a struct-of-arrays layout (px/py/pz, vx/vy/vz, type), exactly
// as the Game of Life engine keeps alive/r/g/b in typed arrays. Every step:
//
//   1. rebuild the neighbor grid                     (grid.js)
//   2. per particle: damp velocity, then sum the forces of all neighbors
//      inside rmax, using the law from law.js and the matrix from matrix.js
//   3. in a *separate* loop, move every particle
//
// Step 3 must not be folded into step 2. If positions changed while forces are
// still being summed, particle i would see the already-moved particle j and the
// result would depend on iteration order — a subtly wrong, direction-biased
// simulation.
//
// Friction is applied as a per-step velocity multiplier. The user-facing value
// is defined per 1/60 s and converted with pow(friction, 60·dt), so the feel of
// the simulation does not change when dt does.

import { Grid } from './grid'
import { forceFactory } from './law'
import { mulberry32, randomSeed } from './rng'
import { generateMatrix, resizeMatrix, DEFAULT_GENERATOR } from './matrix'

export class ParticleLife {
  constructor(world, opts = {}) {
    this.seed = opts.seed ?? randomSeed()
    this.generator = opts.generator ?? DEFAULT_GENERATOR
    this.world = world
    this.time = 0
    this.steps = 0
    this.activity = 0

    this._allocate(world.count)
    this.matrix = opts.matrix
      ? Float32Array.from(opts.matrix)
      : generateMatrix(this.generator, world.types, mulberry32(this.seed ^ 0x9e3779b9))
    this.force = forceFactory(world.law, world.beta)
    this.grid = new Grid(world, world.count)
    this.seedParticles()
  }

  // Arrays are sized to `capacity` (the world's particle count) while `count`
  // says how many of them are currently alive. Clearing the world therefore
  // costs nothing and a click can bring particles back without reallocating —
  // the same "empty canvas, click to create" feel the Game of Life has.
  _allocate(capacity) {
    this.capacity = capacity
    this.count = capacity
    this.px = new Float32Array(capacity)
    this.py = new Float32Array(capacity)
    this.pz = new Float32Array(capacity)
    this.vx = new Float32Array(capacity)
    this.vy = new Float32Array(capacity)
    this.vz = new Float32Array(capacity)
    this.type = new Uint8Array(capacity)
  }

  // ---- Seeding --------------------------------------------------------------

  // Fill the world with `count` particles at random positions and types,
  // derived deterministically from the seed.
  seedParticles(from = 0) {
    const rng = mulberry32(this.seed)
    const { w, h, d, dims, types } = this.world
    // Advance the stream so appended particles do not repeat earlier draws.
    for (let i = 0; i < from * 4; i++) rng()
    for (let i = from; i < this.count; i++) {
      this.px[i] = rng() * w
      this.py[i] = rng() * h
      this.pz[i] = dims === 3 ? rng() * d : 0
      this.type[i] = (rng() * types) | 0
      this.vx[i] = 0
      this.vy[i] = 0
      this.vz[i] = 0
    }
    if (from === 0) {
      this.time = 0
      this.steps = 0
      this.activity = 0
    }
  }

  // New positions, same matrix — "shuffle the universe, keep its laws".
  // Also refills a world that was cleared.
  reseed(seed = randomSeed()) {
    this.seed = seed
    this.count = this.capacity
    this.seedParticles()
  }

  // New matrix, same positions — "keep the matter, change the laws".
  reroll(generator = this.generator, seed = randomSeed()) {
    this.generator = generator
    this.seed = seed
    this.matrix = generateMatrix(generator, this.world.types, mulberry32(seed ^ 0x9e3779b9))
  }

  setMatrix(matrix) {
    this.matrix = Float32Array.from(matrix)
  }

  clear() {
    this.vx.fill(0)
    this.vy.fill(0)
    this.vz.fill(0)
    this.count = 0
    this.time = 0
    this.steps = 0
    this.activity = 0
  }

  // ---- World changes --------------------------------------------------------

  // Adopt a new world description without restarting the simulation where
  // possible: parameter tweaks keep every particle, a changed count grows or
  // shrinks the arrays, a changed type count remaps types and resizes the
  // matrix around its overlapping block.
  applyWorld(world) {
    const old = this.world
    this.world = world

    if (world.types !== old.types) {
      this.matrix = resizeMatrix(
        this.matrix,
        old.types,
        world.types,
        this.generator,
        mulberry32(this.seed ^ 0x85ebca6b),
      )
      const rng = mulberry32(this.seed ^ 0xc2b2ae35)
      for (let i = 0; i < this.count; i++) {
        if (this.type[i] >= world.types) this.type[i] = (rng() * world.types) | 0
      }
    }

    if (world.w !== old.w || world.h !== old.h || world.d !== old.d) {
      this._rescale(old, world)
    }

    if (world.count !== this.capacity) this._resizeCapacity(world.count)

    if (world.law !== old.law || world.beta !== old.beta) {
      this.force = forceFactory(world.law, world.beta)
    }

    this.grid.configure(world, Math.max(1, this.count))
    return this
  }

  _rescale(old, world) {
    const sx = world.w / old.w
    const sy = world.h / old.h
    const sz = old.d > 0 ? world.d / old.d : 1
    for (let i = 0; i < this.count; i++) {
      this.px[i] *= sx
      this.py[i] *= sy
      this.pz[i] *= sz
    }
  }

  _resizeCapacity(next) {
    const prev = this.capacity
    if (next === prev) return
    const wasFull = this.count === prev
    const keep = Math.min(prev, next)

    const resize = (src) => {
      const out = new Float32Array(next)
      out.set(src.subarray(0, keep))
      return out
    }
    this.px = resize(this.px)
    this.py = resize(this.py)
    this.pz = resize(this.pz)
    this.vx = resize(this.vx)
    this.vy = resize(this.vy)
    this.vz = resize(this.vz)
    const t = new Uint8Array(next)
    t.set(this.type.subarray(0, keep))
    this.type = t

    this.capacity = next
    // A world that was full stays full: dragging the slider up should add
    // particles, not leave holes. A cleared world stays cleared.
    const before = this.count
    this.count = wasFull ? next : Math.min(this.count, next)
    if (this.count > before) this.seedParticles(before)
  }

  // ---- Interaction ----------------------------------------------------------

  // Drop a blob of `n` particles of one type around (x, y).
  //
  // While the world is not yet full the blob activates unused slots, so an
  // emptied world can be repopulated click by click. Once the world is full,
  // particles are relocated instead of added: a click must never make the
  // simulation permanently slower, and a relocated particle is visually
  // indistinguishable from a newly born one.
  spawnBlob(x, y, z, n, type) {
    const { w, h, d, dims, types } = this.world
    const t = type ?? (Math.random() * types) | 0
    const radius = this.world.rmax * 2.5
    for (let k = 0; k < n; k++) {
      let i
      if (this.count < this.capacity) i = this.count++
      else if (this.count > 0) i = (Math.random() * this.count) | 0
      else break
      const ang = Math.random() * Math.PI * 2
      const rad = Math.sqrt(Math.random()) * radius
      let px = x + Math.cos(ang) * rad
      let py = y + Math.sin(ang) * rad
      let pz = dims === 3 ? z + (Math.random() * 2 - 1) * radius : 0
      px = px < 0 ? 0 : px >= w ? w - 0.001 : px
      py = py < 0 ? 0 : py >= h ? h - 0.001 : py
      pz = pz < 0 ? 0 : d > 0 && pz >= d ? d - 0.001 : pz
      this.px[i] = px
      this.py[i] = py
      this.pz[i] = pz
      this.vx[i] = 0
      this.vy[i] = 0
      this.vz[i] = 0
      this.type[i] = t
    }
    return t
  }

  // Radial shove around a point, falling off with distance. The Particle Life
  // answer to clicking a Game of Life grid: it disturbs without destroying.
  pulse(x, y, z, strength) {
    const reach = this.world.rmax * 10
    const reach2 = reach * reach
    const { dims } = this.world
    for (let i = 0; i < this.count; i++) {
      const dx = this.px[i] - x
      const dy = this.py[i] - y
      const dz = dims === 3 ? this.pz[i] - z : 0
      const r2 = dx * dx + dy * dy + dz * dz
      if (r2 < 1e-6 || r2 > reach2) continue
      const r = Math.sqrt(r2)
      const f = (strength * (1 - r / reach)) / r
      this.vx[i] += f * dx
      this.vy[i] += f * dy
      if (dims === 3) this.vz[i] += f * dz
    }
  }

  // ---- Simulation -----------------------------------------------------------

  step(dt = this.world.dt) {
    if (this.count === 0) return
    if (this.world.dims === 3) this._step3d(dt)
    else this._step2d(dt)
    this.time += dt
    this.steps++
  }

  _step2d(dt) {
    const { px, py, vx, vy, type, matrix, count, grid, force: F } = this
    const world = this.world
    const { w, h, rmax, wrap, types } = world
    grid.build(px, py, null, count)
    const { nx, ny, cellStart, order } = grid

    const friction = Math.pow(world.friction, 60 * dt)
    const scale = rmax * world.force * dt
    const rmax2 = rmax * rmax
    const halfW = w * 0.5
    const halfH = h * 0.5
    let activity = 0

    for (let i = 0; i < count; i++) {
      const xi = px[i]
      const yi = py[i]
      const row = type[i] * types
      const cx = grid.cellX(xi)
      const cy = grid.cellY(yi)
      let ax = 0
      let ay = 0

      for (let dy = -1; dy <= 1; dy++) {
        let gy = cy + dy
        if (wrap) {
          if (gy < 0) gy += ny
          else if (gy >= ny) gy -= ny
        } else if (gy < 0 || gy >= ny) continue

        for (let dx = -1; dx <= 1; dx++) {
          let gx = cx + dx
          if (wrap) {
            if (gx < 0) gx += nx
            else if (gx >= nx) gx -= nx
          } else if (gx < 0 || gx >= nx) continue

          const c = gx + gy * nx
          const end = cellStart[c + 1]
          for (let k = cellStart[c]; k < end; k++) {
            const j = order[k]
            if (j === i) continue
            let ddx = px[j] - xi
            let ddy = py[j] - yi
            if (wrap) {
              if (ddx > halfW) ddx -= w
              else if (ddx < -halfW) ddx += w
              if (ddy > halfH) ddy -= h
              else if (ddy < -halfH) ddy += h
            }
            const r2 = ddx * ddx + ddy * ddy
            if (r2 === 0 || r2 > rmax2) continue
            const r = Math.sqrt(r2)
            const f = F(matrix[row + type[j]], r / rmax) / r
            ax += f * ddx
            ay += f * ddy
          }
        }
      }

      const nvx = vx[i] * friction + ax * scale
      const nvy = vy[i] * friction + ay * scale
      vx[i] = nvx
      vy[i] = nvy
      activity += Math.sqrt(nvx * nvx + nvy * nvy)
    }

    this.activity = activity / count
    this._integrate2d(dt)
  }

  _integrate2d(dt) {
    const { px, py, vx, vy, count } = this
    const { w, h, wrap } = this.world
    for (let i = 0; i < count; i++) {
      let x = px[i] + vx[i] * dt
      let y = py[i] + vy[i] * dt
      if (wrap) {
        if (x < 0 || x >= w) x -= Math.floor(x / w) * w
        if (y < 0 || y >= h) y -= Math.floor(y / h) * h
      } else {
        if (x < 0) {
          x = 0
          vx[i] = -vx[i]
        } else if (x >= w) {
          x = w - 0.001
          vx[i] = -vx[i]
        }
        if (y < 0) {
          y = 0
          vy[i] = -vy[i]
        } else if (y >= h) {
          y = h - 0.001
          vy[i] = -vy[i]
        }
      }
      px[i] = x
      py[i] = y
    }
  }

  _step3d(dt) {
    const { px, py, pz, vx, vy, vz, type, matrix, count, grid, force: F } = this
    const world = this.world
    const { w, h, d, rmax, wrap, types } = world
    grid.build(px, py, pz, count)
    const { nx, ny, nz, cellStart, order } = grid
    const nxy = nx * ny

    const friction = Math.pow(world.friction, 60 * dt)
    const scale = rmax * world.force * dt
    const rmax2 = rmax * rmax
    const halfW = w * 0.5
    const halfH = h * 0.5
    const halfD = d * 0.5
    let activity = 0

    for (let i = 0; i < count; i++) {
      const xi = px[i]
      const yi = py[i]
      const zi = pz[i]
      const row = type[i] * types
      const cx = grid.cellX(xi)
      const cy = grid.cellY(yi)
      const cz = grid.cellZ(zi)
      let ax = 0
      let ay = 0
      let az = 0

      for (let dz = -1; dz <= 1; dz++) {
        let gz = cz + dz
        if (wrap) {
          if (gz < 0) gz += nz
          else if (gz >= nz) gz -= nz
        } else if (gz < 0 || gz >= nz) continue

        for (let dy = -1; dy <= 1; dy++) {
          let gy = cy + dy
          if (wrap) {
            if (gy < 0) gy += ny
            else if (gy >= ny) gy -= ny
          } else if (gy < 0 || gy >= ny) continue

          for (let dx = -1; dx <= 1; dx++) {
            let gx = cx + dx
            if (wrap) {
              if (gx < 0) gx += nx
              else if (gx >= nx) gx -= nx
            } else if (gx < 0 || gx >= nx) continue

            const c = gx + gy * nx + gz * nxy
            const end = cellStart[c + 1]
            for (let k = cellStart[c]; k < end; k++) {
              const j = order[k]
              if (j === i) continue
              let ddx = px[j] - xi
              let ddy = py[j] - yi
              let ddz = pz[j] - zi
              if (wrap) {
                if (ddx > halfW) ddx -= w
                else if (ddx < -halfW) ddx += w
                if (ddy > halfH) ddy -= h
                else if (ddy < -halfH) ddy += h
                if (ddz > halfD) ddz -= d
                else if (ddz < -halfD) ddz += d
              }
              const r2 = ddx * ddx + ddy * ddy + ddz * ddz
              if (r2 === 0 || r2 > rmax2) continue
              const r = Math.sqrt(r2)
              const f = F(matrix[row + type[j]], r / rmax) / r
              ax += f * ddx
              ay += f * ddy
              az += f * ddz
            }
          }
        }
      }

      const nvx = vx[i] * friction + ax * scale
      const nvy = vy[i] * friction + ay * scale
      const nvz = vz[i] * friction + az * scale
      vx[i] = nvx
      vy[i] = nvy
      vz[i] = nvz
      activity += Math.sqrt(nvx * nvx + nvy * nvy + nvz * nvz)
    }

    this.activity = activity / count
    this._integrate3d(dt)
  }

  _integrate3d(dt) {
    const { px, py, pz, vx, vy, vz, count } = this
    const { w, h, d, wrap } = this.world
    for (let i = 0; i < count; i++) {
      let x = px[i] + vx[i] * dt
      let y = py[i] + vy[i] * dt
      let z = pz[i] + vz[i] * dt
      if (wrap) {
        if (x < 0 || x >= w) x -= Math.floor(x / w) * w
        if (y < 0 || y >= h) y -= Math.floor(y / h) * h
        if (z < 0 || z >= d) z -= Math.floor(z / d) * d
      } else {
        if (x < 0) {
          x = 0
          vx[i] = -vx[i]
        } else if (x >= w) {
          x = w - 0.001
          vx[i] = -vx[i]
        }
        if (y < 0) {
          y = 0
          vy[i] = -vy[i]
        } else if (y >= h) {
          y = h - 0.001
          vy[i] = -vy[i]
        }
        if (z < 0) {
          z = 0
          vz[i] = -vz[i]
        } else if (z >= d) {
          z = d - 0.001
          vz[i] = -vz[i]
        }
      }
      px[i] = x
      py[i] = y
      pz[i] = z
    }
  }

  // Total momentum — the invariant used by the tests: with a symmetric matrix
  // and no friction it must stay constant, because every pair then pushes both
  // partners equally hard in opposite directions.
  momentum() {
    let mx = 0
    let my = 0
    let mz = 0
    for (let i = 0; i < this.count; i++) {
      mx += this.vx[i]
      my += this.vy[i]
      mz += this.vz[i]
    }
    return { x: mx, y: my, z: mz }
  }
}
