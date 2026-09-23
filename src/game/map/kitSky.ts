/**
 * kitSky.ts — Cloud Kingdom's painters (chapter 3, story-spec §10.2: "An
 * endless storm has grounded the baby pegasi"). Cloud banks and puff rows, a
 * far cloud sea, a rainbow bridge, the moored balloon, the dome cottage, the
 * pegasus stable, the wind-vane tower, Zephyr's sky castle, and the chapter's
 * baby pegasus — the tap creature on every sector and, curled up asleep, the
 * rescue on 3-3.
 *
 * Same rules as `kit.ts` (art-style §2–§5): flat cel fills, one plum outline
 * on everything mid- and foreground, gradients only in the sky and the far
 * cloud sea. A white cloud world reads washed out, so the clouds are CREAM
 * with a lilac shadow (never flat white) and the saturated colour lives in
 * the landmarks, the rainbows, balloons, kites, flags and candy trees.
 *
 * Space: sector units (SU), 1152 × 672. Every scatter is `seeded()`.
 */
import { SEC_W, SEC_H } from '@/game/restore/mask'
import { seeded, TAU, PI, sin, cos, clamp, lerp } from '@/game/duel/util'
import { type G2D, type Pot, INK, C, fill, ink, refInk, flower, twinkleAt, flagAt } from '@/game/map/kit'
import { drawItem, type ItemSpec } from '@/game/artItem'
import { CREATURE_ART, PROP_ART } from '@/game/artIds'

type Lobe = readonly [number, number, number]
const LW = 5

export const K = {
  skyTop: '#4dadff',
  skyMid: '#8fd0ff',
  skyLow: '#e0f3ff',
  sun: '#ffe36b',
  far: '#e6e8ff',
  farTop: '#f6f5ff',
  far2: '#d3e0ff',
  far2Top: '#e8efff',
  farIsle: '#bccef4',
  cloud: '#fff8f0',
  cloudShade: '#e3d0ff',
  wall: '#fff3ea',
  wallShade: '#f2d3e6',
  pink: '#ff7fbf',
  pinkShade: '#e2579f',
  pinkLite: '#ffc4e1',
  mint: '#3fe0ae',
  mintShade: '#22b58c',
  mintLite: '#aaf3dc',
  lemon: '#ffd34d',
  lemonShade: '#eaa63a',
  lemonLite: '#fff0a6',
  coral: '#ff7a8a',
  coralShade: '#e0566e',
  lilac: '#a77cff',
  hay: '#ffd45c',
  hayShade: '#eaa84a',
  hayDeep: '#c98a4a',
  dark: '#6a4a86',
  rainbow: ['#ff6fa8', '#ffa04d', '#ffd84d', '#52e685', '#56b6ff', '#a27bff'] as readonly string[]
}

/** Chapter 3's base tones, for the candy-floor check (§9.6.1): S ≥ 70 %, L 55–75 %. */
export const SKY_TONES: readonly string[] = [K.skyTop, K.pink, K.mint, K.lemon, K.coral, K.lilac, K.hay, ...K.rainbow]

/** A candy tree's three tones: base, shade, light. */
export type Tones = readonly [string, string, string]
export const PINK: Tones = [K.pink, K.pinkShade, K.pinkLite]
export const MINT: Tones = [K.mint, K.mintShade, K.mintLite]
export const LEMON: Tones = [K.lemon, K.lemonShade, K.lemonLite]

/* ---------------------------------------------------------------- helpers */

/** Stroke the current path twice as wide, then fill it: one plum outline
 *  around the UNION of every sub-path (inner overlaps are filled over). */
export const inkFill = (g: G2D, colour: string, w = LW): void => {
  // `refInk` so a creature's reference thins here too — this is the stroke
  // that lays a whole group's silhouette down (`kit.setRefInk`).
  g.lineWidth = w * 2 * refInk()
  g.strokeStyle = INK
  g.lineJoin = 'round'
  g.lineCap = 'round'
  g.stroke()
  g.fillStyle = colour
  g.fill()
}

const circles = (g: G2D, lobes: readonly Lobe[], dx = 0, dy = 0, k = 1): void => {
  g.beginPath()
  for (const [x, y, r] of lobes) {
    g.moveTo(x + dx * r + r * k, y + dy * r)
    g.arc(x + dx * r, y + dy * r, r * k, 0, TAU)
  }
}

const disc = (g: G2D, x: number, y: number, r: number, colour: string, w = 0): void => {
  g.beginPath()
  g.arc(x, y, r, 0, TAU)
  fill(g, colour)
  if (w) ink(g, w)
}

const hexRgb = (h: string): [number, number, number] => {
  const n = parseInt(h.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
/** Mix two #rrggbb colours (k = 0 → a, 1 → b). */
export const mix = (a: string, b: string, k: number): string => {
  if (k <= 0) return a
  const A = hexRgb(a)
  const B = hexRgb(b)
  const c = (i: number): number => Math.round(A[i]! + (B[i]! - A[i]!) * clamp(k, 0, 1))
  return `rgb(${c(0)},${c(1)},${c(2)})`
}

/* ------------------------------------------------------------------- sky */

export interface SkyKOpts {
  sun?: readonly [number, number]
  /** A soft rainbow behind everything: centre x, y and outer radius. */
  rainbow?: readonly [number, number, number]
  puffs?: readonly (readonly [number, number, number])[]
}

/** A soft sky cloud — unoutlined, lilac underneath (the far register). */
export const skyPuff = (g: G2D, x: number, y: number, s: number, a = 1): void => {
  const lobes: Lobe[] = [
    [x - 60 * s, y + 8 * s, 34 * s], [x - 18 * s, y - 12 * s, 44 * s], [x + 34 * s, y - 2 * s, 38 * s], [x + 72 * s, y + 12 * s, 26 * s]
  ]
  g.globalAlpha = 0.9 * a
  circles(g, lobes)
  fill(g, '#e7defc')
  g.globalAlpha = a
  circles(g, lobes, 0, -6 / 40, 0.9)
  fill(g, '#ffffff')
  g.globalAlpha = 1
}

/** The Cloud Kingdom's restored sky: a clear, deep blue lightening to the
 *  horizon, the sun, and an optional rainbow. */
export const skyK = (g: G2D, o: SkyKOpts): void => {
  const gr = g.createLinearGradient(0, 0, 0, 470)
  gr.addColorStop(0, K.skyTop)
  gr.addColorStop(0.55, K.skyMid)
  gr.addColorStop(1, K.skyLow)
  g.fillStyle = gr
  g.fillRect(0, 0, SEC_W, SEC_H)
  if (o.rainbow) {
    const [rx, ry, rr] = o.rainbow
    g.globalAlpha = 0.55
    g.lineWidth = 16
    for (let i = 0; i < K.rainbow.length; i++) {
      g.beginPath()
      g.arc(rx, ry, rr - 8 - i * 15, PI, TAU)
      g.strokeStyle = K.rainbow[i]!
      g.stroke()
    }
    g.globalAlpha = 1
  }
  if (o.sun) {
    const [sx, sy] = o.sun
    const glow = g.createRadialGradient(sx, sy, 30, sx, sy, 200)
    glow.addColorStop(0, 'rgba(255,240,170,0.9)')
    glow.addColorStop(1, 'rgba(255,240,170,0)')
    g.fillStyle = glow
    g.fillRect(sx - 210, sy - 210, 420, 420)
    disc(g, sx, sy, 56, K.sun)
  }
  for (const [x, y, s] of o.puffs ?? []) skyPuff(g, x, y, s)
}

/** The far cloud sea: two soft bands, lighter and bluer, never outlined. */
export const cloudSea = (g: G2D, y1: number, y2: number, seed: number): void => {
  const r = seeded(seed)
  for (const [y, base, top, big] of [[y1, K.far, K.farTop, 30], [y2, K.far2, K.far2Top, 40]] as const) {
    const lobes: Lobe[] = []
    for (let x = -30; x < SEC_W + 60; x += 46 + r() * 44) {
      const rad = big + r() * 30
      lobes.push([x, y + rad * 0.5 + (r() - 0.5) * 14, rad])
    }
    circles(g, lobes)
    g.rect(-40, y + 20, SEC_W + 80, SEC_H)
    fill(g, base)
    circles(g, lobes, -0.06, -0.2, 0.8)
    fill(g, top)
  }
}

/** A far floating island, flat and bluish, with optional castle spires. */
export const farIsle = (g: G2D, x: number, y: number, w: number, spires = 0): void => {
  g.fillStyle = K.farIsle
  for (let i = 0; i < spires; i++) {
    const sx = x + (i - (spires - 1) / 2) * w * 0.22
    const h = w * (0.34 + ((i * 7) % 3) * 0.08)
    g.beginPath()
    g.rect(sx - w * 0.05, y - h, w * 0.1, h)
    g.moveTo(sx - w * 0.08, y - h)
    g.lineTo(sx, y - h - w * 0.16)
    g.lineTo(sx + w * 0.08, y - h)
    g.fill()
  }
  g.beginPath()
  for (const [dx, dy, r] of [[-0.3, 0.02, 0.18], [-0.08, -0.05, 0.22], [0.18, -0.01, 0.19], [0.38, 0.04, 0.13]] as const) {
    g.moveTo(x + dx * w + r * w, y + dy * w)
    g.arc(x + dx * w, y + dy * w, r * w, 0, TAU)
  }
  g.moveTo(x - w * 0.48, y + w * 0.04)
  g.quadraticCurveTo(x - w * 0.1, y + w * 0.5, x + w * 0.1, y + w * 0.42)
  g.quadraticCurveTo(x + w * 0.3, y + w * 0.3, x + w * 0.5, y + w * 0.06)
  g.closePath()
  g.fill()
}

/* ---------------------------------------------------------------- clouds */

/**
 * An outlined cloud mass: puffs outlined once around their union, cream with
 * a lilac cel shadow under each puff. With `floor`, a body is filled from the
 * puffs' centres down to it (a hill, or the ground).
 */
export const cloud = (g: G2D, lobes: readonly Lobe[], floor = 0, col = K.cloud, shade = K.cloudShade, w = LW): void => {
  const shape = (): void => {
    circles(g, lobes)
    if (floor && lobes.length) {
      const a = lobes[0]!
      const b = lobes[lobes.length - 1]!
      g.moveTo(a[0], a[1])
      for (const l of lobes) g.lineTo(l[0], l[1])
      g.lineTo(b[0], floor)
      g.lineTo(a[0], floor)
      g.closePath()
    }
  }
  shape()
  inkFill(g, col, w)
  g.save()
  shape()
  g.clip()
  circles(g, lobes, 0.2, 0.45)
  fill(g, shade)
  circles(g, lobes, -0.04, -0.08, 0.93)
  fill(g, col)
  // A small lit crest on the biggest puffs.
  g.beginPath()
  for (const [x, y, r] of lobes) {
    if (r < 40) continue
    g.moveTo(x - r * 0.2 + r * 0.26, y - r * 0.55)
    g.ellipse(x - r * 0.2, y - r * 0.55, r * 0.26, r * 0.12, -0.3, 0, TAU)
  }
  fill(g, '#ffffff')
  g.restore()
}

/** A row of puffs from (x0, y0) to (x1, y1), bulging up by `bulge` in the
 *  middle, filled down to the sector's foot — the walkable cloud ground. */
export const cloudRow = (g: G2D, x0: number, y0: number, x1: number, y1: number, r: number, seed: number, bulge = 0): void => {
  const rnd = seeded(seed)
  const lobes: Lobe[] = []
  let x = x0
  while (x <= x1 + r) {
    const k = clamp((x - x0) / (x1 - x0), 0, 1)
    const rad = r * (0.75 + rnd() * 0.5)
    lobes.push([x, lerp(y0, y1, k) - bulge * 4 * k * (1 - k) + rad * 0.4, rad])
    x += r * (0.95 + rnd() * 0.45)
  }
  cloud(g, lobes, SEC_H + 20)
}

/** A small cloud tuft standing on the ground at (x, y), scale `s`. */
export const tuft = (g: G2D, x: number, y: number, s: number): void =>
  cloud(g, [[x - 40 * s, y - 24 * s, 25 * s], [x - 4 * s, y - 44 * s, 34 * s], [x + 34 * s, y - 26 * s, 27 * s], [x, y - 20 * s, 26 * s]])

/** A candy-floss tree: a soft stick and a round, two-toned canopy. */
export const puffTree = (g: G2D, x: number, y: number, s: number, t: Tones): void => {
  g.beginPath()
  g.roundRect(x - 9 * s, y - 96 * s, 18 * s, 98 * s, 8 * s)
  fill(g, C.trunk)
  ink(g, 4)
  const lobes: Lobe[] = [[x - 46 * s, y - 112 * s, 38 * s], [x, y - 146 * s, 50 * s], [x + 46 * s, y - 114 * s, 40 * s], [x, y - 102 * s, 42 * s]]
  circles(g, lobes)
  inkFill(g, t[0])
  g.save()
  circles(g, lobes)
  g.clip()
  circles(g, [[x + 36 * s, y - 80 * s, 50 * s], [x - 28 * s, y - 66 * s, 40 * s]])
  fill(g, t[1])
  circles(g, [[x - 24 * s, y - 166 * s, 26 * s], [x + 4 * s, y - 178 * s, 17 * s]])
  fill(g, t[2])
  g.restore()
  g.beginPath()
  for (const [dx, dy] of [[-36, -118], [20, -160], [44, -106]] as const) {
    g.moveTo(x + dx * s + 5 * s, y + dy * s)
    g.arc(x + dx * s, y + dy * s, 5 * s, 0, TAU)
  }
  fill(g, '#ffffff')
}

/** A 5-point star, flattened by `squash` (a stepping stone lies flat). */
export const star5 = (g: G2D, x: number, y: number, r: number, squash = 1): void => {
  g.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = -PI / 2 + (i * PI) / 5
    const rr = i & 1 ? r * 0.5 : r
    const px = x + cos(a) * rr
    const py = y + sin(a) * rr * squash
    if (i) g.lineTo(px, py)
    else g.moveTo(px, py)
  }
  g.closePath()
}

/** Golden star stepping stones along a list of points. */
export const starStones = (g: G2D, pts: readonly (readonly [number, number, number])[]): void => {
  for (const [x, y, r] of pts) {
    star5(g, x, y, r, 0.55)
    fill(g, K.lemon)
    ink(g, 3.5)
  }
}

/** Flowers and little stars sprinkled over the cloud, skipping `avoid` boxes. */
export const skyFlowers = (
  g: G2D, seed: number, n: number, y0: number, y1: number,
  avoid: readonly (readonly [number, number, number, number])[] = []
): void => {
  const r = seeded(seed)
  const cols = [K.pink, K.lemon, K.lilac, '#56b6ff']
  const hit = (x: number, y: number): boolean => avoid.some(([ax, ay, aw, ah]) => x > ax && x < ax + aw && y > ay && y < ay + ah)
  // Little lilac bumps: the cloud's texture, as grass tufts are the meadow's.
  g.beginPath()
  for (let i = 0; i < 24; i++) {
    const x = 20 + r() * (SEC_W - 40)
    const y = y0 + r() * (y1 - y0)
    const s = 7 + r() * 6
    if (hit(x, y)) continue
    g.moveTo(x - 2 * s, y)
    g.arc(x - s, y, s, PI, TAU)
    g.arc(x + s * 0.8, y, s * 0.8, PI, TAU)
  }
  g.lineWidth = 3.5
  g.strokeStyle = K.cloudShade
  g.lineCap = 'round'
  g.stroke()
  for (let i = 0; i < n; i++) {
    const x = 20 + r() * (SEC_W - 40)
    const y = y0 + r() * (y1 - y0)
    const size = 8 + r() * 6
    const rot = r() * TAU
    if (hit(x, y)) continue
    flower(g, x, y, size, cols[i % 4]!, rot)
  }
  for (let i = 0; i < 14; i++) {
    const x = 20 + r() * (SEC_W - 40)
    const y = y0 + r() * (y1 - y0)
    const size = 6 + r() * 5
    if (hit(x, y)) continue
    star5(g, x, y, size)
    fill(g, K.lemon)
    ink(g, 2)
  }
}

/** A slim pole (for flags and bunting) standing at (x, y), `h` tall. */
export const pole = (g: G2D, x: number, y: number, h: number): void => {
  g.beginPath()
  g.roundRect(x - 4, y - h, 8, h, 4)
  fill(g, C.trunk)
  ink(g, 3)
  disc(g, x, y - h - 3, 6, K.lemon, 3)
}

/* ------------------------------------------------------------- landmarks */

/** A moored hot-air balloon: envelope centre (x, y), radius R. Its striped
 *  ENVELOPE is the landmark (pot base + cream gores, pot shade in shadow). */
export const balloon = (g: G2D, x: number, y: number, R: number, pot: Pot): void => {
  const env = (): void => {
    g.beginPath()
    g.arc(x, y, R, (PI * 5) / 6, PI / 6)
    g.bezierCurveTo(x + R * 0.8, y + R * 0.85, x + R * 0.34, y + R * 1.02, x + R * 0.22, y + R * 1.22)
    g.lineTo(x - R * 0.22, y + R * 1.22)
    g.bezierCurveTo(x - R * 0.34, y + R * 1.02, x - R * 0.8, y + R * 0.85, x - R * cos(PI / 6), y + R * 0.5)
    g.closePath()
  }
  const gores = (a: string, b: string): void => {
    g.fillStyle = a
    g.fillRect(x - R * 1.2, y - R * 1.2, R * 2.4, R * 2.6)
    for (const [k, c] of [[0.74, b], [0.46, a], [0.17, b]] as const) {
      g.beginPath()
      g.ellipse(x, y + R * 0.15, R * k, R * 1.15, 0, 0, TAU)
      fill(g, c)
    }
  }
  // Ropes, then the basket, under the envelope's mouth.
  g.beginPath()
  for (const [a, b] of [[-0.22, -0.22], [-0.08, -0.08], [0.08, 0.08], [0.22, 0.22]] as const) {
    g.moveTo(x + a * R, y + R * 1.22)
    g.lineTo(x + b * R, y + R * 1.56)
  }
  ink(g, 3)
  const basket = (): void => {
    g.beginPath()
    g.roundRect(x - R * 0.27, y + R * 1.54, R * 0.54, R * 0.34, [4, 4, 12, 12])
  }
  basket()
  fill(g, C.trunk)
  g.save()
  basket()
  g.clip()
  g.beginPath()
  g.rect(x + R * 0.1, y + R * 1.5, R, R)
  fill(g, C.trunkShade)
  g.restore()
  basket()
  ink(g)
  g.beginPath()
  g.moveTo(x - R * 0.24, y + R * 1.68)
  g.lineTo(x + R * 0.24, y + R * 1.68)
  g.moveTo(x - R * 0.22, y + R * 1.78)
  g.lineTo(x + R * 0.22, y + R * 1.78)
  ink(g, 2.4)
  g.beginPath()
  g.roundRect(x - R * 0.31, y + R * 1.5, R * 0.62, R * 0.08, 5)
  fill(g, C.trunkShade)
  ink(g, 3.5)
  for (const d of [-1, 1]) {
    g.beginPath()
    g.ellipse(x + d * R * 0.33, y + R * 1.74, R * 0.06, R * 0.08, 0, 0, TAU)
    fill(g, '#f5d3a2')
    ink(g, 3)
  }
  // The envelope: gores, the shadow crescent, a glint.
  g.save()
  env()
  g.clip()
  gores(pot.base, K.cloud)
  g.beginPath()
  g.rect(x - R * 2, y - R * 2, R * 4, R * 4)
  g.arc(x - R * 0.3, y - R * 0.16, R * 1.04, 0, TAU, true)
  g.clip()
  gores(pot.shade, K.cloudShade)
  g.restore()
  g.beginPath()
  g.ellipse(x - R * 0.62, y - R * 0.42, R * 0.1, R * 0.24, 0.55, 0, TAU)
  fill(g, pot.lite)
  env()
  ink(g)
  g.beginPath()
  g.roundRect(x - R * 0.26, y + R * 1.12, R * 0.52, R * 0.12, 6)
  fill(g, K.lemon)
  ink(g, 3.5)
  g.beginPath()
  g.ellipse(x, y - R + 2, R * 0.16, R * 0.06, 0, 0, TAU)
  fill(g, K.lemon)
  ink(g, 3)
}

/** The envelope radius the reference's line weight is judged against — the
 *  biggest of the four balloons that drift over chapters 3 and 10. */
const MINI_BALLOON_UNIT = 34

/**
 * The mini balloon as a painted still — the drifting dots of colour the owner
 * pointed at in the Cloud Kingdom shot, flat-outlined vectors on a painted
 * sky. The drift, the bob and the chapter's colour stay the drawing's.
 */
export const MINI_BALLOON_ART: ItemSpec = {
  ...PROP_ART.miniBalloon, frames: 1, tinted: true,
  // Through a SCALE, not by handing the bench's size to the shape: `ink` sets
  // a width in the current transform, and a balloon drawn at the reference's
  // own radius comes back with hairline cords a painter faithfully paints.
  draw: (g, s, _f, accent) => {
    g.save()
    g.scale(s / MINI_BALLOON_UNIT, s / MINI_BALLOON_UNIT)
    miniBalloonShape(g, 0, 0, MINI_BALLOON_UNIT, accent.base)
    g.restore()
  }
}

/** A little far balloon (a live prop): cheap — one stripe, no shadow. */
export const miniBalloon = (g: G2D, x: number, y: number, R: number, col: string): void => {
  g.save()
  g.translate(x, y)
  const painted = drawItem(g, MINI_BALLOON_ART, R, 0, col)
  g.restore()
  if (!painted) miniBalloonShape(g, x, y, R, col)
}

/** The balloon's envelope, basket and two cords about (x, y), radius R. */
const miniBalloonShape = (g: G2D, x: number, y: number, R: number, col: string): void => {
  g.beginPath()
  g.moveTo(x - R * 0.2, y + R * 1.2)
  g.lineTo(x - R * 0.18, y + R * 1.5)
  g.moveTo(x + R * 0.2, y + R * 1.2)
  g.lineTo(x + R * 0.18, y + R * 1.5)
  ink(g, 2.4)
  g.beginPath()
  g.roundRect(x - R * 0.24, y + R * 1.46, R * 0.48, R * 0.32, 4)
  fill(g, C.trunk)
  ink(g, 3)
  const env = (): void => {
    g.beginPath()
    g.arc(x, y, R, (PI * 5) / 6, PI / 6)
    g.quadraticCurveTo(x + R * 0.5, y + R, x + R * 0.2, y + R * 1.2)
    g.lineTo(x - R * 0.2, y + R * 1.2)
    g.quadraticCurveTo(x - R * 0.5, y + R, x - R * cos(PI / 6), y + R * 0.5)
    g.closePath()
  }
  env()
  fill(g, col)
  g.save()
  env()
  g.clip()
  g.beginPath()
  g.ellipse(x, y + R * 0.15, R * 0.36, R * 1.15, 0, 0, TAU)
  fill(g, K.cloud)
  g.restore()
  env()
  ink(g, 3.5)
}

/** An arched rainbow from (x0, y) to (x1, y), rising `h` — a bridge you could
 *  walk. Returns its circle so a live shimmer can ride along it. */
export const rainbowBridge = (g: G2D, x0: number, x1: number, y: number, h: number, band = 14): { cx: number; cy: number; R: number; a0: number; a1: number } => {
  const c = (x1 - x0) / 2
  const R = (c * c + h * h) / (2 * h)
  const cx = (x0 + x1) / 2
  const cy = y - h + R
  const a = Math.asin(c / R)
  const a0 = -PI / 2 - a
  const a1 = -PI / 2 + a
  const W = band * K.rainbow.length
  g.save()
  g.lineCap = 'butt'
  g.beginPath()
  g.arc(cx, cy, R - W / 2, a0, a1)
  g.lineWidth = W + LW * 2
  g.strokeStyle = INK
  g.stroke()
  for (let i = 0; i < K.rainbow.length; i++) {
    g.beginPath()
    g.arc(cx, cy, R - band * (i + 0.5), a0, a1)
    g.lineWidth = band + 0.8
    g.strokeStyle = K.rainbow[i]!
    g.stroke()
  }
  g.beginPath()
  g.arc(cx, cy, R - band * 0.35, a0 + 0.04, a1 - 0.04)
  g.lineWidth = 3
  g.strokeStyle = 'rgba(255,255,255,0.75)'
  g.stroke()
  g.restore()
  return { cx, cy, R, a0, a1 }
}

/** Where a dome cottage's chimney smokes from. */
export const domeChimney = (x: number, y: number, w: number): readonly [number, number] =>
  [x + w * 0.34, y - w * 0.44 - w * 0.55 - 10]

/** A round cloud cottage standing at (x, y), `w` wide; its DOME roof is the
 *  landmark. */
export const domeCottage = (g: G2D, x: number, y: number, w: number, pot: Pot): void => {
  const h = w * 0.5
  const ry = y - h + w * 0.06
  const rw = w / 2 + w * 0.12
  const rh = w * 0.5
  // Chimney, behind the dome.
  const chx = x + w * 0.34
  const chy = ry - rh * 1.1
  g.beginPath()
  g.roundRect(chx - w * 0.07, chy, w * 0.14, rh * 0.6, 4)
  fill(g, K.coral)
  ink(g)
  g.beginPath()
  g.roundRect(chx - w * 0.09, chy - 10, w * 0.18, 16, 6)
  fill(g, K.coralShade)
  ink(g, 4)
  // Walls.
  const walls = (): void => {
    g.beginPath()
    g.roundRect(x - w / 2, y - h, w, h, [10, 10, 10, 10])
  }
  walls()
  fill(g, K.wall)
  g.save()
  walls()
  g.clip()
  g.beginPath()
  g.rect(x + w * 0.22, y - h, w, h)
  fill(g, K.wallShade)
  g.restore()
  walls()
  ink(g)
  // The dome, with a scalloped rim.
  const n = 7
  const step = (rw * 2) / n
  const roof = (): void => {
    g.beginPath()
    g.ellipse(x, ry, rw, rh, 0, PI, TAU)
    for (let k = 0; k < n; k++) g.arc(x + rw - (k + 0.5) * step, ry, step / 2, 0, PI)
    g.closePath()
  }
  roof()
  fill(g, pot.base)
  g.save()
  roof()
  g.clip()
  g.beginPath()
  g.ellipse(x + rw * 0.55, ry + rh * 0.1, rw * 0.62, rh * 1.1, 0, 0, TAU)
  fill(g, pot.shade)
  g.lineWidth = 3
  g.strokeStyle = pot.shade
  for (let row = 1; row < 4; row++) {
    const yy = ry - rh + row * rh * 0.27
    g.beginPath()
    for (let xx = x - rw; xx < x + rw * 0.2; xx += 26) {
      g.moveTo(xx + 13, yy)
      g.arc(xx, yy, 13, 0, PI)
    }
    g.stroke()
  }
  g.beginPath()
  g.ellipse(x - rw * 0.42, ry - rh * 0.6, rw * 0.2, rh * 0.09, -0.55, 0, TAU)
  fill(g, pot.lite)
  g.restore()
  roof()
  ink(g)
  star5(g, x, ry - rh - 10, 15)
  fill(g, K.lemon)
  ink(g, 3.5)
  // Door, window and a flower box.
  g.beginPath()
  g.roundRect(x - w * 0.3, y - h * 0.72, w * 0.24, h * 0.72, [w * 0.12, w * 0.12, 2, 2])
  fill(g, C.door)
  ink(g, 4)
  disc(g, x - w * 0.1, y - h * 0.36, 3.5, INK)
  const wy = y - h * 0.64
  g.beginPath()
  g.arc(x + w * 0.22, wy, w * 0.1, 0, TAU)
  fill(g, C.window)
  ink(g, 4)
  g.beginPath()
  g.moveTo(x + w * 0.22, wy - w * 0.1)
  g.lineTo(x + w * 0.22, wy + w * 0.1)
  g.moveTo(x + w * 0.12, wy)
  g.lineTo(x + w * 0.32, wy)
  ink(g, 3)
  g.beginPath()
  g.roundRect(x + w * 0.1, y - h * 0.3, w * 0.24, 12, 4)
  fill(g, C.trunk)
  ink(g, 3)
  for (let i = 0; i < 3; i++) flower(g, x + w * 0.14 + i * w * 0.08, y - h * 0.3 - 4, 8, i === 1 ? K.lemon : K.pink, i)
}

/** The top of the stable cupola's flag pole. */
export const stableFlag = (x: number, y: number, w: number): readonly [number, number] => [x, y - w * 0.94 - 104]

/** The pegasus stable at (x, y), `w` wide, with a stall annex to its right;
 *  its gambrel ROOFS are the landmark. */
export const stable = (g: G2D, x: number, y: number, w: number, pot: Pot): void => {
  const h = w * 0.46
  // The stall annex, behind the barn.
  const ax0 = x + w * 0.44
  const ax1 = x + w * 1.0
  const ah = h * 0.78
  const annex = (): void => {
    g.beginPath()
    g.moveTo(ax0, y)
    g.lineTo(ax0, y - ah - w * 0.1)
    g.lineTo(ax1, y - ah)
    g.lineTo(ax1, y)
    g.closePath()
  }
  annex()
  fill(g, K.wall)
  g.save()
  annex()
  g.clip()
  g.beginPath()
  g.rect(ax1 - w * 0.1, y - h * 2, w, h * 2)
  fill(g, K.wallShade)
  g.restore()
  annex()
  ink(g)
  const lean = (): void => {
    g.beginPath()
    g.moveTo(ax0 - 6, y - ah - w * 0.2)
    g.lineTo(ax1 + 18, y - ah - 8)
    g.quadraticCurveTo(ax1 + 26, y - ah + 8, ax1 + 12, y - ah + 10)
    g.lineTo(ax0 - 6, y - ah - w * 0.2 + 22)
    g.closePath()
  }
  lean()
  fill(g, pot.base)
  g.save()
  lean()
  g.clip()
  g.beginPath()
  g.rect(ax0, y - ah - w * 0.04, w, 40)
  fill(g, pot.shade)
  g.restore()
  lean()
  ink(g)
  // Two stalls with half doors.
  const stalls: [number, number][] = []
  for (const k of [0.3, 0.72]) {
    const sx = ax0 + (ax1 - ax0) * k
    stalls.push([sx, y - ah * 0.58])
    g.beginPath()
    g.roundRect(sx - 26, y - ah * 0.86, 52, ah * 0.5, [16, 16, 2, 2])
    fill(g, K.dark)
    ink(g, 4)
  }
  // A baby pegasus peeks out of the first stall; the second one is empty.
  const [px, py] = stalls[0]!
  g.save()
  g.beginPath()
  g.rect(px - 60, py - 80, 120, 80 + ah * 0.2)
  g.clip()
  pegHead(g, px - 4, py - 2, 0.62, 1, PEG.mint, 1)
  g.restore()
  for (const [sx] of stalls) {
    g.beginPath()
    g.roundRect(sx - 30, y - ah * 0.42, 60, ah * 0.42, 3)
    fill(g, C.door)
    ink(g, 4)
    g.beginPath()
    g.moveTo(sx - 26, y - ah * 0.38)
    g.lineTo(sx + 26, y - 4)
    g.moveTo(sx + 26, y - ah * 0.38)
    g.lineTo(sx - 26, y - 4)
    ink(g, 2.6)
  }
  // The barn.
  const walls = (): void => {
    g.beginPath()
    g.roundRect(x - w / 2, y - h, w, h, 8)
  }
  walls()
  fill(g, K.wall)
  g.save()
  walls()
  g.clip()
  g.beginPath()
  g.rect(x + w * 0.24, y - h, w, h)
  fill(g, K.wallShade)
  g.restore()
  walls()
  ink(g)
  const e = 22
  const top = y - h
  const roof = (): void => {
    g.beginPath()
    g.moveTo(x - w / 2 - e, top + 20)
    g.quadraticCurveTo(x - w / 2 - e + 2, top - w * 0.16, x - w * 0.36, top - w * 0.3)
    g.quadraticCurveTo(x - w * 0.2, top - w * 0.46, x, top - w * 0.48)
    g.quadraticCurveTo(x + w * 0.2, top - w * 0.46, x + w * 0.36, top - w * 0.3)
    g.quadraticCurveTo(x + w / 2 + e - 2, top - w * 0.16, x + w / 2 + e, top + 20)
    g.quadraticCurveTo(x, top + 2, x - w / 2 - e, top + 20)
    g.closePath()
  }
  // The cupola on the ridge (behind the roof's crest).
  const cy = top - w * 0.48
  g.beginPath()
  g.roundRect(x - 20, cy - 40, 40, 48, 4)
  fill(g, K.wall)
  ink(g, 4)
  g.beginPath()
  g.roundRect(x - 9, cy - 32, 18, 22, [9, 9, 2, 2])
  fill(g, K.dark)
  g.beginPath()
  g.moveTo(x - 30, cy - 36)
  g.quadraticCurveTo(x - 8, cy - 52, x, cy - 72)
  g.quadraticCurveTo(x + 8, cy - 52, x + 30, cy - 36)
  g.quadraticCurveTo(x, cy - 30, x - 30, cy - 36)
  g.closePath()
  fill(g, pot.shade)
  ink(g, 4)
  g.beginPath()
  g.moveTo(x, cy - 72)
  g.lineTo(x, cy - 104)
  ink(g, 3.5)
  roof()
  fill(g, pot.base)
  g.save()
  roof()
  g.clip()
  g.beginPath()
  g.rect(x + 12, top - w * 0.6, w, w * 0.7)
  fill(g, pot.shade)
  g.lineWidth = 3
  g.strokeStyle = pot.shade
  g.beginPath()
  for (const k of [0.12, 0.22]) {
    g.moveTo(x - w * 0.52, top - w * k + 10)
    g.quadraticCurveTo(x - w * 0.3, top - w * (k + 0.1), x, top - w * (k + 0.12))
  }
  g.stroke()
  g.beginPath()
  g.ellipse(x - w * 0.3, top - w * 0.33, w * 0.08, w * 0.025, -0.6, 0, TAU)
  fill(g, pot.lite)
  g.restore()
  roof()
  ink(g)
  // The hayloft door in the gable, hay spilling at its sill.
  const lx = x
  const ly = top - w * 0.2
  g.beginPath()
  g.roundRect(lx - w * 0.08, ly - w * 0.08, w * 0.16, w * 0.15, [w * 0.08, w * 0.08, 3, 3])
  fill(g, K.wall)
  ink(g, 4)
  g.beginPath()
  g.roundRect(lx - w * 0.055, ly - w * 0.055, w * 0.11, w * 0.11, [w * 0.055, w * 0.055, 2, 2])
  fill(g, K.dark)
  circles(g, [[lx - 10, ly + w * 0.05, 8], [lx + 2, ly + w * 0.045, 9], [lx + 13, ly + w * 0.05, 7]])
  fill(g, K.hay)
  // The big barn door with its braces, and the winged-heart sign.
  const dw = w * 0.3
  const dh = h * 0.72
  const door = (): void => {
    g.beginPath()
    g.roundRect(x - dw / 2, y - dh, dw, dh, [dw / 2, dw / 2, 2, 2])
  }
  door()
  fill(g, C.door)
  ink(g, 4)
  g.save()
  door()
  g.clip()
  g.beginPath()
  g.moveTo(x, y - dh)
  g.lineTo(x, y)
  g.moveTo(x - dw / 2, y - dh * 0.5)
  g.lineTo(x, y)
  g.moveTo(x, y - dh * 0.5)
  g.lineTo(x - dw / 2, y)
  g.moveTo(x + dw / 2, y - dh * 0.5)
  g.lineTo(x, y)
  g.moveTo(x, y - dh * 0.5)
  g.lineTo(x + dw / 2, y)
  g.moveTo(x - dw / 2, y - dh * 0.5)
  g.lineTo(x + dw / 2, y - dh * 0.5)
  ink(g, 3)
  g.restore()
  const hy = y - dh - 20
  for (const d of [-1, 1]) {
    g.beginPath()
    g.ellipse(x + d * 20, hy - 4, 14, 7, d * -0.5, 0, TAU)
    fill(g, K.cloud)
    ink(g, 2.6)
  }
  heart(g, x, hy, 12)
  fill(g, K.pink)
  ink(g, 3)
  // Round windows either side.
  for (const d of [-1, 1]) {
    const wx = x + d * w * 0.33
    const wy = y - h * 0.56
    g.beginPath()
    g.arc(wx, wy, w * 0.07, 0, TAU)
    fill(g, C.window)
    ink(g, 4)
    g.beginPath()
    g.moveTo(wx - w * 0.07, wy)
    g.lineTo(wx + w * 0.07, wy)
    ink(g, 3)
  }
}

/** A soft witch-hat cone roof on base (cx, by), `rw` half-wide, `h` tall —
 *  in the pot's colours, with a gold ball finial. */
export const cone = (g: G2D, cx: number, by: number, rw: number, h: number, pot: Pot): void => {
  const path = (): void => {
    g.beginPath()
    g.moveTo(cx - rw, by)
    g.quadraticCurveTo(cx - rw * 0.28, by - h * 0.32, cx, by - h)
    g.quadraticCurveTo(cx + rw * 0.28, by - h * 0.32, cx + rw, by)
    g.quadraticCurveTo(cx, by + rw * 0.24, cx - rw, by)
    g.closePath()
  }
  path()
  fill(g, pot.base)
  g.save()
  path()
  g.clip()
  g.beginPath()
  g.moveTo(cx + 2, by - h - 4)
  g.quadraticCurveTo(cx + rw * 0.2, by - h * 0.3, cx + rw * 0.3, by + rw)
  g.lineTo(cx + rw * 2, by + rw)
  g.lineTo(cx + rw * 2, by - h - 4)
  g.closePath()
  fill(g, pot.shade)
  g.beginPath()
  g.ellipse(cx - rw * 0.36, by - h * 0.22, rw * 0.08, h * 0.16, 0.42, 0, TAU)
  fill(g, pot.lite)
  g.lineWidth = 6
  g.strokeStyle = pot.lite
  g.beginPath()
  g.moveTo(cx - rw, by - 6)
  g.quadraticCurveTo(cx, by + rw * 0.24 - 12, cx + rw, by - 6)
  g.globalAlpha = 0.7
  g.stroke()
  g.globalAlpha = 1
  g.restore()
  path()
  ink(g)
  disc(g, cx, by - h - 5, 7, K.lemon, 3)
}

const TOWER_CONE = 130
/** The wind-vane tower's pivot (where the turning arrow sits). */
export const towerVane = (x: number, y: number, H: number): readonly [number, number] => [x, y - H - 28 - TOWER_CONE - 44]

/** The wind-vane tower standing at (x, y), `H` tall to its balcony; its
 *  cone ROOF is the landmark. */
export const windTower = (g: G2D, x: number, y: number, H: number, pot: Pot): void => {
  const top = y - H
  const body = (): void => {
    g.beginPath()
    g.moveTo(x - 64, y)
    g.quadraticCurveTo(x - 50, (y + top) / 2, x - 48, top)
    g.lineTo(x + 48, top)
    g.quadraticCurveTo(x + 50, (y + top) / 2, x + 64, y)
    g.closePath()
  }
  body()
  fill(g, K.wall)
  g.save()
  body()
  g.clip()
  g.beginPath()
  g.rect(x + 18, top, 80, H)
  fill(g, K.wallShade)
  const r = seeded(7)
  g.beginPath()
  for (let i = 0; i < 9; i++) {
    const bx = x - 40 + r() * 60
    const by = top + 30 + r() * (H - 60)
    g.roundRect(bx, by, 22, 11, 5)
  }
  fill(g, K.wallShade)
  g.restore()
  body()
  ink(g)
  for (const k of [0.55, 0.8]) {
    g.beginPath()
    g.roundRect(x - 15, y - H * k - 22, 30, 42, [15, 15, 3, 3])
    fill(g, C.window)
    ink(g, 4)
  }
  g.beginPath()
  g.roundRect(x - 26, y - 70, 52, 70, [26, 26, 2, 2])
  fill(g, C.door)
  ink(g, 4)
  disc(g, x + 14, y - 34, 3.5, INK)
  // The balcony ring with its little posts.
  g.beginPath()
  g.roundRect(x - 70, top - 8, 140, 20, 10)
  fill(g, K.lemon)
  ink(g, 4)
  g.beginPath()
  for (let i = 0; i < 7; i++) {
    const px = x - 60 + i * 20
    g.moveTo(px, top - 8)
    g.lineTo(px, top - 26)
  }
  g.moveTo(x - 66, top - 26)
  g.lineTo(x + 66, top - 26)
  ink(g, 3)
  const rb = top - 28
  const ch = TOWER_CONE
  cone(g, x, rb, 84, ch, pot)
  // The vane's mast and its fixed cross-arms (the arrow turns — a prop).
  g.beginPath()
  g.moveTo(x, rb - ch - 10)
  g.lineTo(x, rb - ch - 50)
  g.moveTo(x - 16, rb - ch - 26)
  g.lineTo(x + 16, rb - ch - 26)
  ink(g, 4)
  disc(g, x - 18, rb - ch - 26, 4, K.lemon, 2.4)
  disc(g, x + 18, rb - ch - 26, 4, K.lemon, 2.4)
}

/** A round castle tower from `top` down to `base`, with its cone roof. */
const roundTower = (g: G2D, cx: number, base: number, top: number, w: number, coneH: number, pot: Pot): void => {
  const body = (): void => {
    g.beginPath()
    g.roundRect(cx - w / 2, top, w, base - top, [6, 6, 0, 0])
  }
  body()
  fill(g, K.wall)
  g.save()
  body()
  g.clip()
  g.beginPath()
  g.rect(cx + w * 0.2, top, w, base - top)
  fill(g, K.wallShade)
  g.restore()
  body()
  ink(g)
  g.beginPath()
  g.roundRect(cx - w * 0.14, top + (base - top) * 0.22, w * 0.28, w * 0.4, [w * 0.14, w * 0.14, 3, 3])
  fill(g, C.window)
  ink(g, 4)
  g.beginPath()
  g.roundRect(cx - w / 2 - 6, top - 2, w + 12, 16, 8)
  fill(g, K.lemon)
  ink(g, 3.5)
  cone(g, cx, top + 2, w / 2 + 16, coneH, pot)
}

const OUTER = { dx: 250, top: 230, cone: 118 }
const INNER = { dx: 148, top: 300, cone: 146 }
const KEEP = { top: 252, cone: 196 }

/** The castle's flag-pole feet — outer towers, inner towers, then the keep
 *  (the keep's is last). */
export const castleFlags = (x: number, y: number): readonly (readonly [number, number])[] => [
  [x - OUTER.dx, y - OUTER.top + 2 - OUTER.cone - 11], [x + OUTER.dx, y - OUTER.top + 2 - OUTER.cone - 11],
  [x - INNER.dx, y - INNER.top + 2 - INNER.cone - 11], [x + INNER.dx, y - INNER.top + 2 - INNER.cone - 11],
  [x, y - KEEP.top + 2 - KEEP.cone - 11]
]

/**
 * Zephyr's sky castle, standing at (x, y): a keep under a tall cone, two
 * inner and two outer round towers, a crenellated curtain wall, a great
 * round gate and a rose window with the wind's swirl. Every ROOF is the
 * landmark.
 */
export const skyCastle = (g: G2D, x: number, y: number, pot: Pot): void => {
  // The curtain wall with rounded merlons.
  const wallTop = y - 128
  g.beginPath()
  g.rect(x - 250, wallTop, 500, 128)
  for (let wx = x - 236; wx <= x + 236; wx += 40) {
    g.moveTo(wx + 15, wallTop)
    g.arc(wx, wallTop, 15, 0, TAU)
  }
  inkFill(g, K.wall)
  g.save()
  g.beginPath()
  g.rect(x - 250, wallTop - 16, 500, 144)
  g.clip()
  g.beginPath()
  g.rect(x + 110, wallTop - 20, 200, 160)
  fill(g, K.wallShade)
  g.restore()
  for (const d of [-1, 1]) {
    for (const k of [0.3, 0.62]) {
      g.beginPath()
      g.arc(x + d * 250 * k + d * 40, y - 64, 13, 0, TAU)
      fill(g, C.window)
      ink(g, 3.5)
    }
  }
  // Outer and inner towers.
  for (const d of [-1, 1]) roundTower(g, x + d * OUTER.dx, y, y - OUTER.top, 96, OUTER.cone, pot)
  for (const d of [-1, 1]) roundTower(g, x + d * INNER.dx, y, y - INNER.top, 100, INNER.cone, pot)
  // The keep.
  const kt = y - KEEP.top
  const keep = (): void => {
    g.beginPath()
    g.roundRect(x - 104, kt, 208, 252, [8, 8, 0, 0])
  }
  keep()
  fill(g, K.wall)
  g.save()
  keep()
  g.clip()
  g.beginPath()
  g.rect(x + 40, kt, 120, 260)
  fill(g, K.wallShade)
  g.restore()
  keep()
  ink(g)
  g.beginPath()
  g.roundRect(x - 112, kt - 4, 224, 18, 9)
  fill(g, K.lemon)
  ink(g, 3.5)
  cone(g, x, kt + 2, 132, KEEP.cone, pot)
  // The rose window: the wind's double swirl in mint.
  const ry = y - 176
  g.beginPath()
  g.arc(x, ry, 36, 0, TAU)
  fill(g, C.window)
  ink(g)
  g.beginPath()
  g.arc(x - 9, ry - 4, 12, PI * 0.9, PI * 2.6)
  g.moveTo(x - 24, ry + 12)
  g.bezierCurveTo(x - 6, ry + 20, x + 16, ry + 14, x + 18, ry - 2)
  g.bezierCurveTo(x + 20, ry - 16, x + 6, ry - 18, x + 4, ry - 8)
  g.lineWidth = 11
  g.strokeStyle = INK
  g.lineCap = 'round'
  g.stroke()
  g.lineWidth = 6
  g.strokeStyle = K.mint
  g.stroke()
  // The great gate.
  const gw = 108
  const gh = 128
  const gate = (): void => {
    g.beginPath()
    g.roundRect(x - gw / 2, y - gh, gw, gh, [gw / 2, gw / 2, 0, 0])
  }
  g.beginPath()
  g.roundRect(x - gw / 2 - 12, y - gh - 12, gw + 24, gh + 12, [gw / 2 + 12, gw / 2 + 12, 0, 0])
  fill(g, K.lemon)
  ink(g, 4)
  gate()
  fill(g, C.door)
  g.save()
  gate()
  g.clip()
  g.beginPath()
  for (const k of [-0.25, 0, 0.25]) {
    g.moveTo(x + k * gw, y - gh)
    g.lineTo(x + k * gw, y)
  }
  ink(g, 3)
  g.beginPath()
  g.rect(x + 12, y - gh, gw, gh)
  g.globalAlpha = 0.18
  fill(g, INK)
  g.globalAlpha = 1
  g.restore()
  gate()
  ink(g)
  g.beginPath()
  for (const [sx, sy] of [[-30, -70], [30, -70], [-30, -30], [30, -30]] as const) {
    g.moveTo(x + sx + 4.5, y + sy)
    g.arc(x + sx, y + sy, 4.5, 0, TAU)
  }
  fill(g, K.lemon)
}

/** A star-lamp post at (x, y) — the glow is a live prop. */
export const lampPost = (g: G2D, x: number, y: number, h: number): void => {
  g.beginPath()
  g.roundRect(x - 5, y - h, 10, h, 5)
  fill(g, K.lemonShade)
  ink(g, 3.5)
  g.beginPath()
  g.arc(x, y - h - 14, 16, 0, TAU)
  fill(g, K.cloud)
  ink(g, 3.5)
  star5(g, x, y - h - 14, 10)
  fill(g, K.lemon)
  ink(g, 2)
}

/* --------------------------------------------------------- tap covers */

/** A round flower planter (a tap creature's hiding place). */
export const planter = (g: G2D, x: number, y: number, s: number): void => {
  circles(g, [[x - 36 * s, y - 80 * s, 26 * s], [x, y - 98 * s, 30 * s], [x + 36 * s, y - 80 * s, 26 * s], [x, y - 74 * s, 30 * s]])
  inkFill(g, C.moss)
  flower(g, x - 32 * s, y - 88 * s, 15 * s, K.pink, 0.3)
  flower(g, x + 4 * s, y - 110 * s, 16 * s, K.lemon, 1)
  flower(g, x + 36 * s, y - 86 * s, 14 * s, K.lilac, 2)
  const pot = (): void => {
    g.beginPath()
    g.moveTo(x - 58 * s, y - 66 * s)
    g.lineTo(x + 58 * s, y - 66 * s)
    g.quadraticCurveTo(x + 50 * s, y - 8 * s, x + 40 * s, y)
    g.lineTo(x - 40 * s, y)
    g.quadraticCurveTo(x - 50 * s, y - 8 * s, x - 58 * s, y - 66 * s)
    g.closePath()
  }
  pot()
  fill(g, K.coral)
  g.save()
  pot()
  g.clip()
  g.beginPath()
  g.rect(x + 18 * s, y - 70 * s, 60 * s, 80 * s)
  fill(g, K.coralShade)
  g.restore()
  pot()
  ink(g)
  g.beginPath()
  g.roundRect(x - 64 * s, y - 78 * s, 128 * s, 20 * s, 9 * s)
  fill(g, '#ffa3ae')
  ink(g, 4)
  heart(g, x - 4 * s, y - 34 * s, 11 * s)
  fill(g, K.cloud)
  ink(g, 2.6)
}

/** A round haystack (a tap creature's hiding place). */
export const haystack = (g: G2D, x: number, y: number, s: number): void => {
  const path = (): void => {
    g.beginPath()
    g.moveTo(x - 82 * s, y)
    g.bezierCurveTo(x - 86 * s, y - 74 * s, x - 42 * s, y - 112 * s, x, y - 112 * s)
    g.bezierCurveTo(x + 42 * s, y - 112 * s, x + 86 * s, y - 74 * s, x + 82 * s, y)
    g.quadraticCurveTo(x, y + 10 * s, x - 82 * s, y)
    g.closePath()
  }
  path()
  fill(g, K.hay)
  g.save()
  path()
  g.clip()
  g.beginPath()
  g.ellipse(x + 70 * s, y - 20 * s, 60 * s, 96 * s, 0, 0, TAU)
  fill(g, K.hayShade)
  g.beginPath()
  const r = seeded(19)
  for (let i = 0; i < 12; i++) {
    const hx = x - 64 * s + r() * 128 * s
    const hy = y - 90 * s + r() * 80 * s
    g.moveTo(hx, hy)
    g.quadraticCurveTo(hx + 6 * s, hy - 10 * s, hx + 14 * s, hy - 12 * s)
  }
  g.lineWidth = 3
  g.strokeStyle = K.hayDeep
  g.stroke()
  g.restore()
  path()
  ink(g)
  g.beginPath()
  for (const [dx, a] of [[-10, -0.5], [4, 0.1], [16, 0.6]] as const) {
    g.moveTo(x + dx * s, y - 110 * s)
    g.lineTo(x + dx * s + sin(a) * 22 * s, y - 110 * s - cos(a) * 22 * s)
  }
  ink(g, 4)
  g.lineWidth = 2
  g.strokeStyle = K.hay
  g.stroke()
}

/** A wicker basket of spare kites (a tap creature's hiding place). */
export const kiteBasket = (g: G2D, x: number, y: number, s: number): void => {
  const KB = [[-28, -0.3, K.pink, K.lemon], [24, 0.28, '#56b6ff', K.mint]] as const
  for (const [dx, a, c1, c2] of KB) {
    g.save()
    g.translate(x + dx * s, y - 76 * s)
    g.rotate(a)
    const d = (): void => {
      g.beginPath()
      g.moveTo(0, -72 * s)
      g.lineTo(22 * s, -40 * s)
      g.lineTo(0, 12 * s)
      g.lineTo(-22 * s, -40 * s)
      g.closePath()
    }
    d()
    fill(g, c1)
    g.beginPath()
    g.moveTo(0, -72 * s)
    g.lineTo(22 * s, -40 * s)
    g.lineTo(0, 12 * s)
    g.closePath()
    fill(g, c2)
    d()
    ink(g, 4)
    g.beginPath()
    g.moveTo(0, -72 * s)
    g.lineTo(0, 12 * s)
    g.moveTo(-22 * s, -40 * s)
    g.lineTo(22 * s, -40 * s)
    ink(g, 2.2)
    g.restore()
  }
  const body = (): void => {
    g.beginPath()
    g.moveTo(x - 70 * s, y - 74 * s)
    g.lineTo(x + 70 * s, y - 74 * s)
    g.lineTo(x + 58 * s, y)
    g.lineTo(x - 58 * s, y)
    g.closePath()
  }
  body()
  fill(g, C.trunk)
  g.save()
  body()
  g.clip()
  g.beginPath()
  g.rect(x + 26 * s, y - 80 * s, 60 * s, 90 * s)
  fill(g, C.trunkShade)
  g.restore()
  body()
  ink(g)
  g.beginPath()
  for (const k of [0.3, 0.6]) {
    g.moveTo(x - (70 - 12 * k) * s, y - 74 * s * (1 - k))
    g.lineTo(x + (70 - 12 * k) * s, y - 74 * s * (1 - k))
  }
  for (let i = -2; i <= 2; i++) {
    g.moveTo(x + i * 26 * s, y - 72 * s)
    g.lineTo(x + i * 22 * s, y - 2 * s)
  }
  ink(g, 2.4)
  g.beginPath()
  g.roundRect(x - 76 * s, y - 86 * s, 152 * s, 18 * s, 9 * s)
  fill(g, C.trunkShade)
  ink(g, 4)
  // The kites' tails hang out over the rim, bows and all.
  for (const [dx, , c1, c2] of KB) {
    const tx = x + dx * s * 1.5
    g.beginPath()
    g.moveTo(tx, y - 80 * s)
    g.quadraticCurveTo(tx - 10 * s, y - 60 * s, tx + 2 * s, y - 40 * s)
    ink(g, 2.4)
    for (const [by, c] of [[-62, c1], [-42, c2]] as const) {
      const bx = tx + (by === -62 ? -5 : 2) * s
      g.beginPath()
      g.moveTo(bx, y + by * s)
      g.lineTo(bx - 9 * s, y + (by - 6) * s)
      g.lineTo(bx - 9 * s, y + (by + 6) * s)
      g.closePath()
      g.moveTo(bx, y + by * s)
      g.lineTo(bx + 9 * s, y + (by - 6) * s)
      g.lineTo(bx + 9 * s, y + (by + 6) * s)
      g.closePath()
      fill(g, c)
      ink(g, 2)
    }
  }
}

/** A round mint cloud-hedge in a gold box (a tap creature's hiding place). */
export const topiary = (g: G2D, x: number, y: number, s: number): void => {
  const lobes: Lobe[] = [[x - 46 * s, y - 80 * s, 34 * s], [x, y - 110 * s, 46 * s], [x + 46 * s, y - 80 * s, 34 * s], [x, y - 70 * s, 42 * s]]
  circles(g, lobes)
  inkFill(g, K.mint)
  g.save()
  circles(g, lobes)
  g.clip()
  circles(g, [[x + 40 * s, y - 50 * s, 48 * s], [x - 30 * s, y - 36 * s, 34 * s]])
  fill(g, K.mintShade)
  circles(g, [[x - 20 * s, y - 136 * s, 22 * s]])
  fill(g, K.mintLite)
  g.restore()
  g.beginPath()
  for (const [dx, dy] of [[-40, -92], [10, -130], [40, -84], [-6, -80]] as const) {
    g.moveTo(x + dx * s + 6 * s, y + dy * s)
    g.arc(x + dx * s, y + dy * s, 6 * s, 0, TAU)
  }
  fill(g, K.pink)
  ink(g, 2.2)
  g.beginPath()
  g.roundRect(x - 52 * s, y - 46 * s, 104 * s, 46 * s, 8 * s)
  fill(g, K.lemon)
  ink(g)
  g.beginPath()
  g.rect(x + 18 * s, y - 42 * s, 30 * s, 38 * s)
  fill(g, K.lemonShade)
}

/** The straw nest's back (paint) — the rescue curls up in it. */
export const nestBack = (g: G2D, x: number, y: number, s: number): void => {
  g.beginPath()
  g.ellipse(x, y - 16 * s, 84 * s, 30 * s, 0, 0, TAU)
  fill(g, K.hayShade)
  ink(g)
  g.beginPath()
  g.ellipse(x, y - 12 * s, 70 * s, 20 * s, 0, 0, TAU)
  fill(g, K.hayDeep)
}

/** The nest's front rim — drawn again over the rescue so it sits IN it. */
export const nestFront = (g: G2D, x: number, y: number, s: number): void => {
  const rim = (): void => {
    g.beginPath()
    g.moveTo(x - 86 * s, y - 16 * s)
    g.bezierCurveTo(x - 80 * s, y + 20 * s, x + 80 * s, y + 20 * s, x + 86 * s, y - 16 * s)
    g.bezierCurveTo(x + 60 * s, y + 2 * s, x - 60 * s, y + 2 * s, x - 86 * s, y - 16 * s)
    g.closePath()
  }
  rim()
  fill(g, K.hay)
  ink(g)
  g.save()
  rim()
  g.clip()
  g.beginPath()
  for (let i = 0; i < 7; i++) {
    const hx = x - 66 * s + i * 22 * s
    g.moveTo(hx, y + 4 * s)
    g.quadraticCurveTo(hx + 8 * s, y - 2 * s, hx + 18 * s, y + 8 * s)
  }
  g.lineWidth = 3
  g.strokeStyle = K.hayShade
  g.stroke()
  g.restore()
}

/* ----------------------------------------------------------- live props */

/** A heart path at (x, y), `r` across its lobes. */
export const heart = (g: G2D, x: number, y: number, r: number): void => {
  g.beginPath()
  g.moveTo(x, y + r * 0.9)
  g.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.6, y - r * 1.3, x, y - r * 0.45)
  g.bezierCurveTo(x + r * 0.6, y - r * 1.3, x + r * 1.6, y - r * 0.2, x, y + r * 0.9)
  g.closePath()
}

/** One outlined twinkle at (x, y) — the shared painted star, or the drawing. */
export const sparkle = (g: G2D, x: number, y: number, r: number): void => {
  g.beginPath()
  if (twinkleAt(g, x, y, r, '#fffbe0')) return
  fill(g, '#fffbe0')
  ink(g, 2)
}

/** Twinkles winking at fixed spots — one path, one fill. */
export const twinkles = (g: G2D, pts: readonly (readonly [number, number, number])[], t: number, alive: number): void => {
  if (alive <= 0) return
  g.beginPath()
  let painted = false
  for (let i = 0; i < pts.length; i++) {
    const [x, y, r] = pts[i]!
    const k = Math.max(0, sin(t * 2.2 + i * 1.9))
    if (k > 0.05) painted = twinkleAt(g, x, y, r * k * alive, '#fffbe0')
  }
  // `twinkleAt` blits, or adds to the path: one fill still serves the whole
  // row when no painting has landed, which is what this function is for.
  if (!painted) fill(g, '#fffbe0')
}

/** The three wave shapes the pennant's strip is painted at, as the control
 *  point's offset in units of the flag's depth. */
const PENNANT_WAVES = [-0.35, 0, 0.35] as const
/** The pennant the reference is authored at: 1 long, 0.5 deep. */
const PENNANT_UNIT = { len: 1, h: 0.5 }

/** The pennant's cloth about the hoist at the origin, `len` long and `h`
 *  deep, its trailing edge pushed by `wv`. */
const pennantShape = (g: G2D, len: number, h: number, wv: number, col: string, w: number): void => {
  g.beginPath()
  g.moveTo(0, 0)
  g.quadraticCurveTo(len * 0.5, wv - h * 0.1, len, h * 0.5 + wv * 0.5)
  g.quadraticCurveTo(len * 0.5, h + wv, 0, h)
  g.closePath()
  fill(g, col)
  ink(g, w)
}

/**
 * The pennant as a painted strip — the most-flown shape in the game, on
 * eighteen call sites across six chapters.
 *
 * Three panels, because the ripple is the ONE thing a transform cannot carry:
 * the wave is a control point, so the cloth genuinely changes shape as it
 * streams. Those three are its extremes and `drawItem` cross-fades between
 * them, exactly as a wing beat's are. The hoist angle, the length, the depth
 * and the colour stay the drawing's — and `len : h` differing per call site is
 * a non-uniform scale of a rectangle of cloth, which is invisible.
 */
export const PENNANT_ART: ItemSpec = {
  ...PROP_ART.pennant, frames: 3, tinted: true,
  draw: (g, s, f, accent) => {
    g.save()
    g.scale(s, s)
    const { len, h } = PENNANT_UNIT
    pennantShape(g, len, h, (PENNANT_WAVES[f] ?? 0) * h, accent.base, 0.09)
    g.restore()
  }
}

/** Where a wave offset of `wv` (in units of `h`) falls between the panels. */
const pennantFrame = (k: number): number =>
  Math.max(0, Math.min(2, (k - PENNANT_WAVES[0]) / (PENNANT_WAVES[1] - PENNANT_WAVES[0])))

/** A pennant on a pole top at (x, y): hanging at rest, streaming once alive. */
export const pennant = (g: G2D, x: number, y: number, len: number, h: number, col: string, t: number, alive: number, ph = 0): void => {
  const a = (1 - alive) * 1.2 + sin(t * 4 + ph) * 0.08 * alive
  const k = sin(t * 7 + ph) * 0.35 * alive
  g.save()
  g.translate(x, y)
  g.rotate(a)
  // The painting is authored half as deep as it is long; a call site's own
  // len : h is a squash of a rectangle of cloth, which nobody can see.
  g.save()
  g.scale(1, h / (len * PENNANT_UNIT.h))
  const painted = drawItem(g, PENNANT_ART, len, pennantFrame(k), col)
  g.restore()
  if (!painted) pennantShape(g, len, h, k * h, col, 3)
  g.restore()
}

/** Flags hung along a sagging line from (x0, y0) to (x1, y1). */
export const bunting = (
  g: G2D, x0: number, y0: number, x1: number, y1: number, sag: number,
  cols: readonly string[], n: number, t: number, alive: number
): void => {
  const mx = (x0 + x1) / 2
  const my = (y0 + y1) / 2 + sag * 2
  g.beginPath()
  g.moveTo(x0, y0)
  g.quadraticCurveTo(mx, my, x1, y1)
  ink(g, 2.6)
  for (let i = 1; i <= n; i++) {
    const k = i / (n + 1)
    const px = (1 - k) * (1 - k) * x0 + 2 * (1 - k) * k * mx + k * k * x1
    const py = (1 - k) * (1 - k) * y0 + 2 * (1 - k) * k * my + k * k * y1
    g.save()
    g.translate(px, py)
    g.rotate(sin(t * 3 + i * 1.3) * 0.3 * alive)
    if (!flagAt(g, 22, 26, cols[i % cols.length]!)) {
      g.beginPath()
      g.moveTo(-11, 0)
      g.lineTo(11, 0)
      g.lineTo(0, 26)
      g.closePath()
      fill(g, cols[i % cols.length]!)
      ink(g, 2.6)
    }
    g.restore()
  }
}

/** The blade radius the reference's line weight is judged against. */
const PINWHEEL_UNIT = 26

/** ONE pinwheel blade, sweeping from the hub out to `r` along +x. */
const bladeShape = (g: G2D, r: number, col: string): void => {
  g.beginPath()
  g.moveTo(0, 0)
  g.lineTo(r, 0)
  g.quadraticCurveTo(cos(0.9) * r * 0.95, sin(0.9) * r * 0.95, 0, r * 0.22)
  g.closePath()
  fill(g, col)
  ink(g, 3)
}

/**
 * The pinwheel as ONE painted BLADE, not a wheel.
 *
 * A wheel of four blades takes two colours, and `artTint` carries one region —
 * but the four blades ARE the same blade at four quarter-turns, so the
 * repeated unit is painted once and the drawing turns it, alternating the two
 * colours exactly as its two fill passes did. The spin stays the transform.
 */
export const PINWHEEL_ART: ItemSpec = {
  ...PROP_ART.pinwheel, frames: 1, tinted: true,
  draw: (g, s, _f, accent) => {
    g.save()
    g.scale(s / PINWHEEL_UNIT, s / PINWHEEL_UNIT)
    bladeShape(g, PINWHEEL_UNIT, accent.base)
    g.restore()
  }
}

/** A pinwheel's four blades about (x, y) at angle `a` (its stick is paint). */
export const pinwheel = (g: G2D, x: number, y: number, r: number, a: number, c1: string, c2: string): void => {
  let painted = false
  g.save()
  g.translate(x, y)
  for (let i = 0; i < 4; i++) {
    g.save()
    g.rotate(a + (i * PI) / 2)
    painted = drawItem(g, PINWHEEL_ART, r, 0, i & 1 ? c2 : c1)
    g.restore()
    if (!painted) break
  }
  g.restore()
  if (!painted) {
    for (const pass of [0, 1]) {
      g.beginPath()
      for (const i of [pass, pass + 2]) {
        const b = a + (i * PI) / 2
        g.moveTo(x, y)
        g.lineTo(x + cos(b) * r, y + sin(b) * r)
        g.quadraticCurveTo(x + cos(b + 0.9) * r * 0.95, y + sin(b + 0.9) * r * 0.95, x + cos(b + PI / 2) * r * 0.22, y + sin(b + PI / 2) * r * 0.22)
        g.closePath()
      }
      fill(g, pass ? c2 : c1)
      ink(g, 3)
    }
  }
  disc(g, x, y, r * 0.16, K.lemon, 2.4)
}

/** A pinwheel's stick at (x, y) → hub height `h`. */
export const pinStick = (g: G2D, x: number, y: number, h: number): void => {
  g.beginPath()
  g.roundRect(x - 3.5, y - h, 7, h, 3)
  fill(g, K.cloud)
  ink(g, 3)
}

/** The diamond's height in the kite's own units, nose to tail-point. */
const KITE_UNIT = 90

/** The kite's LEFT half: the sail triangle, its two outer edges, the spine
 *  and its half of the crossbar. `lw` scales the line into the caller's
 *  transform (the live kite is drawn inside a `scale(s, s)`). */
const kiteHalfShape = (g: G2D, col: string, lw = 1): void => {
  g.beginPath()
  g.moveTo(0, -44)
  g.lineTo(-30, -8)
  g.lineTo(0, 46)
  g.closePath()
  fill(g, col)
  g.beginPath()
  g.moveTo(0, -44)
  g.lineTo(-30, -8)
  g.lineTo(0, 46)
  ink(g, 4 * lw)
  g.beginPath()
  g.moveTo(0, -44)
  g.lineTo(0, 46)
  g.moveTo(-30, -8)
  g.lineTo(0, -8)
  ink(g, 2 * lw)
}

/** Half a kite as a painted still — see `kite` for why it is a half. */
export const KITE_ART: ItemSpec = {
  ...PROP_ART.kite, frames: 1, tinted: true,
  draw: (g, s, _f, accent) => {
    g.save()
    g.scale(s / KITE_UNIT, s / KITE_UNIT)
    kiteHalfShape(g, accent.base)
    g.restore()
  }
}

/** A diamond kite at (x, y) on a string to (ax, ay), tilted, tail waving. */
export const kite = (
  g: G2D, x: number, y: number, s: number, c1: string, c2: string,
  tilt: number, tail: number, ax: number, ay: number
): void => {
  g.beginPath()
  g.moveTo(x, y + 6 * s)
  g.quadraticCurveTo((x + ax) / 2 + 30, (y + ay) / 2 + 60, ax, ay)
  g.lineWidth = 2
  g.strokeStyle = INK
  g.stroke()
  g.save()
  g.translate(x, y)
  g.rotate(tilt)
  g.scale(s, s)
  g.beginPath()
  g.moveTo(0, 46)
  for (let j = 1; j <= 3; j++) g.quadraticCurveTo(sin(tail + j) * 16, 46 + j * 22 - 11, sin(tail + j * 1.4) * 8, 46 + j * 22)
  ink(g, 2.4 / s)
  for (let j = 1; j <= 3; j++) {
    const bx = sin(tail + j * 1.4) * 8
    const by = 46 + j * 22
    g.beginPath()
    g.moveTo(bx, by)
    g.lineTo(bx - 10, by - 6)
    g.lineTo(bx - 10, by + 6)
    g.closePath()
    g.moveTo(bx, by)
    g.lineTo(bx + 10, by - 6)
    g.lineTo(bx + 10, by + 6)
    g.closePath()
    fill(g, j & 1 ? c1 : c2)
    ink(g, 2 / s)
  }
  // The SAIL: half a diamond, painted once and blitted twice — the second
  // mirrored — so one sheet wears every one of the seven colour pairs the two
  // kite sectors fly. The tail and the string above stay drawn: the tail's
  // bows are rebuilt per frame and the string reaches a call-site anchor.
  const half = (mirror: number, col: string): boolean => {
    g.save()
    g.scale(mirror, 1)
    const hit = drawItem(g, KITE_ART, KITE_UNIT, 0, col)
    g.restore()
    return hit
  }
  const painted = half(1, c1)
  if (painted) half(-1, c2)
  if (!painted) {
    kiteHalfShape(g, c1, 1 / s)
    g.save()
    g.scale(-1, 1)
    kiteHalfShape(g, c2, 1 / s)
    g.restore()
  }
  g.restore()
}

/** The arrow's length in SU, tail tip to head tip. */
const VANE_UNIT = (42 + 16) * 2

/** The arrow at full stretch about its pivot: shaft, head and fletched tail. */
const vaneShape = (g: G2D): void => {
  const L = 42
  g.beginPath()
  g.moveTo(-L, 0)
  g.lineTo(L, 0)
  ink(g, 4)
  g.beginPath()
  g.moveTo(L + 16, 0)
  g.lineTo(L - 4, -11)
  g.lineTo(L - 4, 11)
  g.closePath()
  fill(g, K.lemon)
  ink(g, 3)
  g.beginPath()
  g.moveTo(-(L - 6), 0)
  g.lineTo(-(L + 12), -16)
  g.quadraticCurveTo(-(L + 4), 0, -(L + 12), 16)
  g.closePath()
  fill(g, K.pink)
  ink(g, 3)
  disc(g, 0, 0, 6, K.lemon, 2.4)
}

/**
 * The weather vane's arrow as a painted still — the thing on top of the
 * landmark a whole sector is named after.
 *
 * §4b kept it because it "narrows with `cos a`… foreshortening of a 3-D arrow,
 * not a rotation of a 2-D one". Both halves are true and the conclusion does
 * not follow: the drawing multiplies every X by `cos a` and leaves every Y
 * alone, which is `g.scale(c, 1)` of this one arrow — and a negative `c` is
 * the flip it already did. A foreshortening is a matrix like any other.
 */
export const VANE_ART: ItemSpec = {
  ...PROP_ART.vane, frames: 1,
  draw: (g, s) => {
    g.save()
    g.scale(s / VANE_UNIT, s / VANE_UNIT)
    vaneShape(g)
    g.restore()
  }
}

/** The weather vane's arrow about (x, y), turned `a` about the mast — seen
 *  from the side, so it narrows and flips as it swings round. */
export const vane = (g: G2D, x: number, y: number, a: number): void => {
  const c = cos(a)
  const L = 42
  // Edge-on, `c` is zero and the painting has no width to blit: the arrow is
  // meant to disappear there, and the drawing's own pivot dot went with it.
  g.save()
  g.translate(x, y)
  g.scale(c, 1)
  const painted = drawItem(g, VANE_ART, VANE_UNIT)
  g.restore()
  if (painted) return
  g.beginPath()
  g.moveTo(x - L * c, y)
  g.lineTo(x + L * c, y)
  ink(g, 4)
  g.beginPath()
  g.moveTo(x + (L + 16) * c, y)
  g.lineTo(x + (L - 4) * c, y - 11)
  g.lineTo(x + (L - 4) * c, y + 11)
  g.closePath()
  fill(g, K.lemon)
  ink(g, 3)
  g.beginPath()
  g.moveTo(x - (L - 6) * c, y)
  g.lineTo(x - (L + 12) * c, y - 16)
  g.quadraticCurveTo(x - (L + 4) * c, y, x - (L + 12) * c, y + 16)
  g.closePath()
  fill(g, K.pink)
  ink(g, 3)
  disc(g, x, y, 6, K.lemon, 2.4)
}

/** A little cream dove about the origin, facing right, flapping (`flap` −1…1). */
export const doveShape = (g: G2D, flap: number): void => {
  g.beginPath()
  g.moveTo(24, -4)
  g.lineTo(32, -2)
  g.lineTo(24, 2)
  g.closePath()
  fill(g, K.lemon)
  ink(g, 2)
  g.beginPath()
  g.ellipse(0, 0, 16, 9, 0, 0, TAU)
  g.moveTo(26, -4)
  g.arc(18, -4, 8, 0, TAU)
  g.moveTo(-12, -2)
  g.lineTo(-26, -8)
  g.lineTo(-24, 4)
  g.closePath()
  inkFill(g, K.cloud, 2.4)
  g.beginPath()
  g.moveTo(4, -4)
  g.quadraticCurveTo(-2, -4 - 20 * flap, -14, -2 - 18 * flap)
  g.quadraticCurveTo(-8, 0, 4, -4)
  g.closePath()
  fill(g, '#f1e6ff')
  ink(g, 2.4)
  disc(g, 20, -6, 1.8, INK)
}

/** The dove's beak-to-tail length in SU at `s` = 1. */
export const DOVE_UNIT = 58

/** The dove as a painted strip: wing down, level, up. */
export const DOVE_ART: ItemSpec = {
  ...PROP_ART.dove, frames: 3,
  draw: (g, s, f) => {
    g.save()
    g.scale(s / DOVE_UNIT, s / DOVE_UNIT)
    doveShape(g, f - 1)
    g.restore()
  }
}

/** A little cream dove, flapping (`flap` −1…1), facing `dir`. */
export const dove = (g: G2D, x: number, y: number, s: number, flap: number, dir: number): void => {
  g.save()
  g.translate(x, y)
  g.scale(s * dir, s)
  if (!drawItem(g, DOVE_ART, DOVE_UNIT, flap + 1)) doveShape(g, flap)
  g.restore()
}

/* ------------------------------------------------------ the baby pegasus */

/** A baby pegasus's colours: coat, coat shadow, mane, wing. */
export interface PegLook { coat: string; shade: string; mane: string; wing: string }

export const PEG = {
  pink: { coat: '#ffd3e8', shade: '#f4a8cc', mane: '#56b6ff', wing: '#fffaf6' },
  mint: { coat: '#cbf7e7', shade: '#93e0c6', mane: '#ff8fc4', wing: '#fffaf6' },
  peach: { coat: '#ffe2c6', shade: '#f5bd8f', mane: '#a77cff', wing: '#fffaf6' },
  lemon: { coat: '#fff2b3', shade: '#f2d27a', mane: '#ff7fbf', wing: '#fffaf6' },
  lilac: { coat: '#e8dcff', shade: '#c5adf4', mane: '#ffc83d', wing: '#fffaf6' },
  /** The rescue: a sky-blue baby with a sunny mane. */
  sky: { coat: '#d5edff', shade: '#a6cff2', mane: '#ffc83d', wing: '#fffaf6' }
} satisfies Record<string, PegLook>

/** A pegasus's pose: `up` 0 curled asleep → 1 standing; `wings` 0 folded →
 *  1 spread; `flap` added to the wing angle; `eye` 0 closed → 1 open;
 *  `dim` 0 → 1 fades it toward a sleepy dusk. */
export interface PegPose { up: number; wings: number; flap: number; eye: number; dim?: number }

const IRIS = '#7a4fd1'
const BLUSH = '#ff9eb5'
const HOOF = '#e0a96b'
const DUSK = '#8a80b0'

const wingShape = (g: G2D): void => {
  g.beginPath()
  g.moveTo(6, -2)
  g.bezierCurveTo(-10, -26, -42, -32, -60, -18)
  g.quadraticCurveTo(-66, -4, -52, -2)
  g.quadraticCurveTo(-52, 11, -37, 6)
  g.quadraticCurveTo(-33, 19, -19, 10)
  g.quadraticCurveTo(-10, 17, -1, 8)
  g.quadraticCurveTo(8, 5, 6, -2)
  g.closePath()
}

/** A wing rooted at (x, y), pointing back and raised by `a`, scale `k`;
 *  with `tip`, its flight feathers take that tone. */
const wing = (g: G2D, x: number, y: number, a: number, k: number, col: string, w: number, tip?: string): void => {
  g.save()
  g.translate(x, y)
  g.rotate(a)
  g.scale(k, k)
  wingShape(g)
  fill(g, col)
  if (tip) {
    g.save()
    wingShape(g)
    g.clip()
    g.beginPath()
    g.moveTo(8, 2)
    g.quadraticCurveTo(-30, -6, -70, -12)
    g.lineTo(-70, 30)
    g.lineTo(8, 30)
    g.closePath()
    fill(g, tip)
    g.restore()
  }
  wingShape(g)
  ink(g, w / k)
  g.beginPath()
  g.moveTo(-19, 8)
  g.quadraticCurveTo(-24, -2, -22, -10)
  g.moveTo(-37, 4)
  g.quadraticCurveTo(-42, -6, -40, -14)
  ink(g, (w * 0.5) / k)
  g.restore()
}

/** The head in its own space: centre (0, 0), facing +x. */
const headLocal = (g: G2D, look: PegLook, eye: number, w: number): void => {
  circles(g, [[-16, -20, 12], [-25, -7, 12], [-27, 8, 10], [-21, 20, 8]])
  inkFill(g, look.mane, w)
  g.beginPath()
  g.moveTo(-15, -17)
  g.quadraticCurveTo(-15, -40, -6, -45)
  g.quadraticCurveTo(3, -34, 3, -21)
  g.closePath()
  fill(g, look.coat)
  ink(g, w)
  g.beginPath()
  g.moveTo(-10, -21)
  g.quadraticCurveTo(-10, -34, -6, -38)
  g.quadraticCurveTo(-1, -31, -1, -22)
  g.closePath()
  fill(g, '#ffb3d2')
  g.beginPath()
  g.moveTo(27, 0)
  g.arc(0, 0, 27, 0, TAU)
  g.moveTo(40, 12)
  g.ellipse(21, 12, 19, 15, 0, 0, TAU)
  inkFill(g, look.coat, w)
  circles(g, [[3, -24, 10], [-8, -27, 9]])
  inkFill(g, look.mane, w)
  if (eye > 0.15) {
    g.beginPath()
    g.ellipse(9, -2, 7.5, 10 * eye, 0, 0, TAU)
    fill(g, IRIS)
    ink(g, w * 0.5)
    g.beginPath()
    g.ellipse(10, -1, 4.5, 6 * eye, 0, 0, TAU)
    fill(g, INK)
    disc(g, 6.5, -2 - 5 * eye, 2.8, '#ffffff')
    disc(g, 12, -2 + 5 * eye, 1.4, '#ffffff')
    g.beginPath()
    g.moveTo(15, -2 - 8 * eye)
    g.lineTo(19.5, -2 - 11 * eye)
    g.moveTo(12, -2 - 10 * eye)
    g.lineTo(14, -2 - 14 * eye)
    ink(g, w * 0.45)
  } else {
    g.beginPath()
    g.arc(9, -6, 7, PI * 0.15, PI * 0.85)
    ink(g, w * 0.55)
  }
  g.globalAlpha = 0.6
  g.beginPath()
  g.ellipse(10, 13, 7, 4.5, 0, 0, TAU)
  fill(g, BLUSH)
  g.globalAlpha = 1
  disc(g, 33, 9, 2, INK)
  g.beginPath()
  g.arc(26, 16, 5, PI * 0.2, PI * 0.8)
  ink(g, w * 0.45)
}

const dimLook = (look: PegLook, d: number): PegLook =>
  d <= 0 ? look : { coat: mix(look.coat, DUSK, d), shade: mix(look.shade, DUSK, d), mane: mix(look.mane, DUSK, d), wing: mix(look.wing, DUSK, d) }

/** Just a pegasus's head at (x, y) — peeking out of a stall, say. */
export const pegHead = (g: G2D, x: number, y: number, s: number, dir: number, look: PegLook, eye: number): void => {
  g.save()
  g.translate(x, y)
  g.scale(s * dir, s)
  headLocal(g, look, eye, LW / s)
  g.restore()
}

/**
 * The chapter's chibi baby pegasus, feet at (x, y), scale `s`, facing `dir`
 * (1 right, −1 left). Head as big as the barrel, stubby legs, a soft mane
 * and two feathered wings (art-style §3). Every part is interpolated by the
 * pose, so a sleeper can wake and stand up smoothly.
 */
export const babyPegasus = (g: G2D, x: number, y: number, s: number, dir: number, look0: PegLook, p: PegPose): void => {
  g.save()
  g.translate(x, y)
  g.scale(dir, 1)
  const painted = drawItem(g, PEGASUS_ART, PEG_UNIT * s, pegFrame(p), look0.coat)
  g.restore()
  if (painted) return
  g.save()
  g.translate(x, y)
  g.scale(s * dir, s)
  pegasusShape(g, s, dimLook(look0, (p.dim ?? 0) * 0.5), p)
  g.restore()
}

/** Wing tip (-116) to the hooves (0) at scale 1 — the foal's own height in SU. */
const PEG_UNIT = 116

/**
 * WHICH PANEL A POSE IS ON. The pegasus has the widest range of any creature
 * in the game — it uncurls from a nest, stands, opens its wings and then beats
 * them — so it is the one sheet with four panels: the curled sleeper, standing
 * with its wings folded, and the two ends of a wing-beat. `up` walks the first
 * two; once it is standing, `wings` opens them and `flap` beats them, and
 * `drawItem` cross-fades the beat exactly as the prop family's birds do.
 */
const pegFrame = (p: PegPose): number => {
  const up = clamp(p.up, 0, 1)
  if (up < 0.999) return up
  return 1 + clamp(p.wings, 0, 1) * (1 + (clamp(p.flap / 0.45, -1, 1) + 1) / 2)
}

/**
 * The baby pegasus (`CREATURE_ART.babyPegasus`): chapter 3's tap creature AND
 * its rescue, so one sheet serves both. The COAT is the tinted region — the
 * five stalls each keep their own foal, and the rescue is a sixth — and the
 * mane, the wings and the hooves are the same on every one of them.
 */
export const PEGASUS_ART: ItemSpec = {
  ...CREATURE_ART.babyPegasus, frames: 4, tinted: true,
  draw: (g, sz, f, accent) => {
    const k = sz / PEG_UNIT
    g.save()
    g.scale(k, k)
    const look: PegLook = { coat: accent.base, shade: accent.shade, mane: PEG.pink.mane, wing: PEG.pink.wing }
    pegasusShape(g, 1, look, {
      up: f < 1 ? f : 1,
      wings: f < 1 ? 0 : clamp(f - 1, 0, 1),
      flap: f < 2 ? 0 : (clamp(f - 2, 0, 1) * 2 - 1) * 0.45,
      eye: 1
    })
    g.restore()
  }
}

/** The pegasus itself, hooves at the origin, facing +x, in its own units. */
const pegasusShape = (g: G2D, s: number, look: PegLook, p: PegPose): void => {
  const up = clamp(p.up, 0, 1)
  const w = LW / s
  const by = lerp(-22, -42, up)
  const brx = lerp(38, 33, up)
  const bry = lerp(20, 23, up)
  const hx = lerp(36, 27, up)
  const hy = lerp(-32, -80, up)
  const tilt = lerp(0.36, -0.05, up)
  const rx = lerp(0, -4, up)
  const ry = by - bry * 0.62
  const wa = lerp(-0.12, 1.15, p.wings) + p.flap
  const wk = lerp(0.64, 1.02, p.wings)
  // The far wing, once it lifts clear of the back.
  if (p.wings > 0.05) wing(g, rx + 9, ry - 3, wa + 0.3, wk * 0.9, look.shade, w)
  // The tail, curling round the sleeper or swishing behind the stander.
  circles(g, [
    [lerp(-40, -37, up), lerp(-20, -46, up), 12], [lerp(-32, -47, up), lerp(-8, -35, up), 10], [lerp(-14, -45, up), lerp(-3, -22, up), 8]
  ])
  inkFill(g, look.mane, w)
  // Legs grow out from under the barrel as it stands.
  const legBot = by * (1 - up)
  const legs = legBot - by > 6
  if (legs) {
    g.beginPath()
    for (const lx of [-20, 14]) g.roundRect(lx - 6.5, by, 13, legBot - by, 6.5)
    inkFill(g, look.shade, w)
  }
  g.beginPath()
  g.ellipse(0, by, brx, bry, 0, 0, TAU)
  if (legs) for (const lx of [-10, 24]) g.roundRect(lx - 6.5, by, 13, legBot - by, 6.5)
  inkFill(g, look.coat, w)
  if (legs && up > 0.6) {
    g.beginPath()
    for (const lx of [-10, 24]) g.roundRect(lx - 6.5, legBot - 7, 13, 7, [0, 0, 6.5, 6.5])
    fill(g, HOOF)
  }
  g.save()
  g.beginPath()
  g.ellipse(0, by, brx, bry, 0, 0, TAU)
  g.clip()
  g.beginPath()
  g.ellipse(8, by + bry * 0.95, brx * 1.05, bry * 0.5, 0, 0, TAU)
  fill(g, look.shade)
  g.restore()
  // The near wing, then the head over the wing's root.
  wing(g, rx, ry, wa, wk, look.wing, w, look.shade)
  g.save()
  g.translate(hx, hy)
  g.rotate(tilt)
  headLocal(g, look, p.eye, w)
  g.restore()
  g.restore()
}

/** A small pegasus flying across the sky (a cheap live prop). */
/**
 * The three pegasus looks the two sky sectors actually fly, and the three
 * panels of `FLYER_ART` — in this order.
 *
 * A look is FOUR colours and `artTint` carries one region, so the panels are
 * spent on colour rather than on the wing beat. That is the trade, said out
 * loud: a flyer is about a twenty-fifth of the scene wide and glides past in
 * a few seconds, so a still pegasus in the right colours beats a flapping
 * vector one on brushwork. Three sheets of three panels would buy the beat
 * back, and the cap is waived if it ever matters.
 */
export const FLYER_LOOKS: readonly PegLook[] = [PEG.pink, PEG.lemon, PEG.mint]

/** The scale the sky flies its biggest flyer at, and the span it gives. */
const FLYER_S = 0.9
const FLYER_UNIT = 90 * FLYER_S

export const FLYER_ART: ItemSpec = {
  ...PROP_ART.flyer, frames: 3,
  draw: (g, s, f) => {
    g.save()
    g.scale(s / FLYER_UNIT, s / FLYER_UNIT)
    g.scale(FLYER_S, FLYER_S)
    flyerShape(g, 0, FLYER_LOOKS[f] ?? FLYER_LOOKS[0]!, 3.6 / FLYER_S)
    g.restore()
  }
}

export const flyer = (g: G2D, x: number, y: number, s: number, flap: number, dir: number, look: PegLook): void => {
  g.save()
  g.translate(x, y)
  // The painting is one of three looks; a fourth simply keeps its drawing.
  const panel = FLYER_LOOKS.indexOf(look)
  if (panel >= 0) {
    g.save()
    g.scale(dir, 1)
    const painted = drawItem(g, FLYER_ART, 90 * s, panel)
    g.restore()
    if (painted) { g.restore(); return }
  }
  g.scale(s * dir, s)
  flyerShape(g, flap, look, 3.6 / s)
  g.restore()
}

/** The flyer's body in its own units: wings, mane, coat, eye. */
const flyerShape = (g: G2D, flap: number, look: PegLook, w: number): void => {
  wing(g, 4, -12, 0.9 + flap + 0.3, 0.75, look.shade, w)
  circles(g, [[-30, -4, 9], [-38, 4, 7]])
  inkFill(g, look.mane, w)
  g.beginPath()
  g.ellipse(0, 0, 28, 16, 0, 0, TAU)
  g.moveTo(40, -18)
  g.arc(26, -18, 14, 0, TAU)
  g.moveTo(45, -10)
  g.ellipse(36, -10, 9, 8, 0, 0, TAU)
  for (const lx of [-16, 16]) {
    g.moveTo(lx + 8, 12)
    g.ellipse(lx, 12, 8, 6, 0.3, 0, TAU)
  }
  inkFill(g, look.coat, w)
  circles(g, [[16, -30, 8], [10, -20, 7]])
  inkFill(g, look.mane, w)
  wing(g, -2, -10, 0.9 + flap, 0.8, look.wing, w, look.shade)
  disc(g, 29, -20, 2.6, INK)
}

/* ── the little shapes a live prop repeats: a heart, a five-point star ── */

/** A heart of radius 1 about the origin, in `col`. */
const heartShape = (g: G2D, col: string): void => {
  heart(g, 0, 0, 1)
  fill(g, col)
  ink(g, 0.24)
}

/** A heart as a painted still — the joy burst's rising hearts, and the
 *  festival banner's charm. Its float, its swell and its fade stay drawn. */
export const HEART_ART: ItemSpec = {
  ...PROP_ART.heart, frames: 1, tinted: true,
  draw: (g, s, _f, accent) => {
    g.save()
    g.scale(s, s)
    heartShape(g, accent.base)
    g.restore()
  }
}

/** One heart of radius `r` in `col` — painted if its sheet has landed. */
export const heartAt = (g: G2D, x: number, y: number, r: number, col: string): boolean => {
  g.save()
  g.translate(x, y)
  const hit = drawItem(g, HEART_ART, r, 0, col)
  g.restore()
  return hit
}

/**
 * A five-point star as a painted still.
 *
 * NOT the four-point `prop-twinkle`: that sheet's prompt rules a five-pointed
 * star out in as many words, because a twinkle with five points is the wrong
 * glimmer everywhere else in the game. This is the finial on the wind-vane
 * tower, and it is a star.
 *
 * The seam is at the live call site, not inside `star5` — `star5` builds a
 * bare path that two dozen `paint()` shapes fill for themselves.
 */
export const STAR_ART: ItemSpec = {
  ...PROP_ART.star, frames: 1, tinted: true,
  draw: (g, s, _f, accent) => {
    g.save()
    g.scale(s, s)
    star5(g, 0, 0, 1)
    fill(g, accent.base)
    ink(g, 0.18)
    g.restore()
  }
}

/** One five-point star of radius `r` in `col` — painted if its sheet has
 *  landed; otherwise it leaves `star5`'s path for the caller to fill. */
export const star5At = (g: G2D, x: number, y: number, r: number, col: string): boolean => {
  g.save()
  g.translate(x, y)
  const hit = drawItem(g, STAR_ART, r, 0, col)
  g.restore()
  if (!hit) star5(g, x, y, r)
  return hit
}

/** Hearts rising and twinkles winking around a happy creature at (x, y). */
export const joy = (g: G2D, x: number, y: number, t: number, a: number): void => {
  if (a <= 0) return
  for (let i = 0; i < 3; i++) {
    const k = (t * 0.55 + i / 3) % 1
    g.globalAlpha = a * (1 - k)
    const hx = x + (i - 1) * 34 + sin(k * 6 + i) * 10
    const hr = 9 * (1 - k * 0.3)
    if (heartAt(g, hx, y - k * 70, hr, K.pink)) continue
    heart(g, hx, y - k * 70, hr)
    fill(g, K.pink)
    ink(g, 2.2)
  }
  g.globalAlpha = a
  g.beginPath()
  let lit = false
  for (let i = 0; i < 4; i++) {
    const r = 9 * Math.max(0, sin(t * 3 + i * 1.6))
    if (r > 0.5) lit = twinkleAt(g, x + cos(i * 1.7) * 76, y + 40 + sin(i * 2.3) * 34, r, '#fff6b0')
  }
  if (!lit) fill(g, '#fff6b0')
  g.globalAlpha = 1
}

/** Three sleepy "z" marks drifting up from a sleeper's head at (x, y). */
export const zzz = (g: G2D, x: number, y: number, t: number, a: number): void => {
  if (a <= 0) return
  g.globalAlpha = a
  g.beginPath()
  for (let i = 0; i < 3; i++) {
    const r = 6 + i * 3
    const zx = x + i * 16
    const zy = y - i * 22 + sin(t * 1.6 + i) * 3
    g.moveTo(zx - r, zy - r)
    g.lineTo(zx + r, zy - r)
    g.lineTo(zx - r, zy + r)
    g.lineTo(zx + r, zy + r)
  }
  g.lineWidth = 7
  g.strokeStyle = INK
  g.lineJoin = 'round'
  g.lineCap = 'round'
  g.stroke()
  g.lineWidth = 3.4
  g.strokeStyle = '#c7a6ff'
  g.stroke()
  g.globalAlpha = 1
}
