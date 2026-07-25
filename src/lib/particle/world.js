// World layer: geometry and global parameters for a Particle Life universe —
// the counterpart to topology.js.
//
// World coordinates are simply CSS pixels of the canvas, so the renderer needs
// no transform and a resize can rescale positions proportionally.
//
// The one non-obvious piece is rmax. Instead of exposing an absolute radius we
// expose a *target neighbor count* and derive rmax from it:
//
//     neighbors = count · (area of the interaction disc) / (area of the world)
//
// Solving for rmax keeps the average number of interacting neighbors — and with
// it both the visual density and the cost per step — constant when the user
// drags the particle count slider. Without this, doubling the particles would
// quadruple the work and silently tank the frame rate.

import { LAWS, DEFAULT_LAW } from './law'

export const WORLDS = {
  particle2d: { label: 'Partikel', dims: 2 },
  particle3d: { label: 'Partikel 3D', dims: 3 },
}

export const PARTICLE_KINDS = Object.keys(WORLDS)

export function isParticleKind(kind) {
  return Object.prototype.hasOwnProperty.call(WORLDS, kind)
}

export const DEFAULTS = {
  law: DEFAULT_LAW,
  beta: 0.3,
  types: 6,
  count: 2200,
  // Target average neighbors within rmax. This is the single most important
  // knob for how the simulation *looks*: below ~10 particles only find a few
  // partners and the world stays a fine confetti of tiny clumps; around 18-20
  // they build structures several particle diameters wide, which is the shape
  // people recognize as Particle Life.
  neighbors: 18,
  friction: 0.85, // per 1/60 s, see physics.js
  force: 1,
  dt: 0.02,
  wrap: true,
}

// Slider ranges for the UI, kept next to the defaults so both stay in sync.
export const LIMITS = {
  types: [2, 12],
  count: [200, 20000],
  neighbors: [4, 24],
  friction: [0.5, 0.99],
  beta: [0.05, 0.6],
  force: [0.2, 3],
}

export const DEFAULT_LAWS = {
  particle2d: DEFAULT_LAW,
  particle3d: DEFAULT_LAW,
}

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v)

// Radius that yields the requested average neighbor count.
export function rmaxFor(dims, extent, count, neighbors) {
  const n = Math.max(1, count)
  if (dims === 3) {
    const volume = extent.w * extent.h * extent.d
    return Math.cbrt((3 * neighbors * volume) / (4 * Math.PI * n))
  }
  return Math.sqrt((neighbors * extent.w * extent.h) / (Math.PI * n))
}

export function createWorld(kind, cssW, cssH, opts = {}) {
  const spec = WORLDS[kind] ?? WORLDS.particle2d
  const dims = spec.dims
  // 2D fills the canvas; 3D is a cube, because an orbiting camera has no reason
  // to look at a box that is three times wider than it is deep.
  const side = Math.max(160, Math.floor(Math.min(cssW, cssH)))
  const w = dims === 3 ? side : Math.max(160, Math.floor(cssW))
  const h = dims === 3 ? side : Math.max(160, Math.floor(cssH))
  const d = dims === 3 ? side : 0

  const p = { ...DEFAULTS, ...opts }
  const types = Math.round(clamp(p.types, LIMITS.types[0], LIMITS.types[1]))
  const count = Math.round(clamp(p.count, LIMITS.count[0], LIMITS.count[1]))
  const neighbors = clamp(p.neighbors, LIMITS.neighbors[0], LIMITS.neighbors[1])

  // The grid needs at least three cells per axis, otherwise the 3x3 neighbor
  // sweep would visit the same cell twice on a wrapping world.
  const maxR = Math.min(w, h, dims === 3 ? d : Infinity) / 3
  const rmax = clamp(rmaxFor(dims, { w, h, d }, count, neighbors), 3, maxR)

  return {
    kind,
    dims,
    label: spec.label,
    w,
    h,
    d,
    wrap: p.wrap !== false,
    law: LAWS[p.law] ? p.law : DEFAULT_LAW,
    beta: clamp(p.beta, LIMITS.beta[0], LIMITS.beta[1]),
    friction: clamp(p.friction, LIMITS.friction[0], LIMITS.friction[1]),
    force: clamp(p.force, LIMITS.force[0], LIMITS.force[1]),
    dt: p.dt,
    types,
    count,
    neighbors,
    rmax,
  }
}

// The speed slider is shared with the Game of Life, where it means generations
// per second. Particles have no generations, so it maps to the number of
// simulation steps per rendered frame instead. Both canvases use this so they
// cannot drift apart.
export function substepsFor(speed) {
  const n = Math.round(speed / 8)
  return n < 1 ? 1 : n > 8 ? 8 : n
}

// Return a copy of `world` with `patch` applied, re-deriving everything that
// depends on the changed values (currently rmax).
export function updateWorld(world, patch) {
  return createWorld(world.kind, world.w, world.h, { ...world, ...patch })
}
