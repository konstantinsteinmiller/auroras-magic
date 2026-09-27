/**
 * rig-cosmetics.ts — what Aurora wears (story-spec §9.7, C17, C31).
 *
 * Each item is a small named draw function hooked into the rig's draw order,
 * so it rides every pose — a rear, a victory hop, a portrait — and a head
 * item inherits the head's scale for free.
 *
 * PAINTED where a matrix carries one shape (art-roadmap's third-sweep test,
 * re-argued for the keepsakes 2026-09-24): the crown and the star (S6), and
 * now the pegasus wing (the flap is a rotation, the fold a rotation and a
 * scale; near and far are one wing's two colourings), the necklace's shell
 * (one shell, tinted three ways, each carried by a translate) and the scarf's
 * wrap and knot (a rotation to the neck). Every sparkle — the hoof trail, the
 * Pastel Dream's twinkles, the Pet Star's trail — is the sectors' painted
 * twinkle, tinted. What stays drawn is what is REBUILT per frame: the
 * necklace's cord (a curve through points the pose hands over), the scarf's
 * two tails (a spine carrying a travelling wave, the mane's own reason), and
 * the pearls, which are under the family's size floor.
 *
 *   slot       item (chapter)                  hook
 *   head       Flower Crown (1)                `afterHead`, head space
 *   neck       Seashell Necklace (2)           `afterMane`, rig space
 *              Cozy Winter Scarf (8)           `afterMane`, rig space
 *   back       Fluffy Pegasus Wings (3)        `beforeTorso` far + `afterMane` near
 *   trail      Sparkly Hoof-trail (4)          `afterRig`, stage space — a pooled emitter
 *   skin       Umbra Look (5)                  `skin`, a palette on her own shape
 *              Pastel Dream Theme (7)          `skin` + a few `afterRig` twinkles
 *   mane       Mane Color Palette (6)          `mane`, one of 8 swatches
 *   companion  Pet Star (9)                    `afterRig`, stage space
 *
 * Every hook is optional and any combination is valid; `equippedHooks()`
 * composes what is worn into one `PoseState` fragment, cached until the
 * wardrobe changes, and `equippedKey()` names it for baked portraits.
 */
import { S } from '@/game/duel/state'
import { COSMETICS, COSMETIC_SLOTS } from '@/game/campaign/tables'
import { FOES, guardianOf, type FoePalette } from '@/game/duel/foes'
import { TAU, PI, sin, cos, min, clamp, ease } from '@/game/duel/util'
import type { PoseState, RigAnchors } from '@/game/duel/chars'
import { drawItem, type ItemSpec } from '@/game/artItem'
import { ITEM_ART } from '@/game/artIds'
// The second shelf (§2.4 rule 20): the alternatives, in a module of their
// own. One import and six spreads down in the registry is the whole wiring —
// and the dependency runs ONE WAY, because a cycle between two modules of
// top-level `const` records is a TDZ crash at import time.
import {
  HEAD_DRAW_X, NECK_DRAW_X, BACK_DRAW_X, COMPANION_DRAW_X, TRAIL_DRAW_X, SKIN_PAL_X, TRAIL_STYLES,
  WORN_UNIT, wornStill, particleArt, thinInk
} from '@/game/cosmetics/rig-accessories'
import { TWINKLE_ART } from '@/game/map/kit'

type G2D = CanvasRenderingContext2D

const INK = '#3A2340'

/** A five-petal blossom at (x, y), radius r. */
const blossom = (g: G2D, x: number, y: number, r: number, petal: string, rot: number): void => {
  g.beginPath()
  for (let i = 0; i < 5; i++) {
    const a = rot + (i * TAU) / 5
    const px = x + cos(a) * r * 0.62
    const py = y + sin(a) * r * 0.62
    g.moveTo(px + r * 0.46, py)
    g.arc(px, py, r * 0.46, 0, TAU)
  }
  g.fillStyle = petal
  g.fill()
  g.lineWidth = 1.6
  g.strokeStyle = INK
  g.stroke()
  g.beginPath()
  g.arc(x, y, r * 0.3, 0, TAU)
  g.fillStyle = '#fff1a0'
  g.fill()
  g.lineWidth = 1.2
  g.stroke()
}

/**
 * The Flower Crown (ch1 keepsake): a leafy vine band over the forelock root
 * (head-local (1, -21)) with four blossoms and two leaves. Head space.
 */
export const drawFlowerCrown = (g: G2D): void => {
  if (!drawItem(g, CROWN_ART, CROWN_UNIT)) crownShape(g)
}

/** Head units per unit of the crown's painted box. */
const CROWN_UNIT = 20

const crownShape = (g: G2D): void => {
  g.lineJoin = g.lineCap = 'round'
  // The vine band, riding the top of the skull between the ears.
  g.beginPath()
  g.moveTo(-17, -12)
  g.quadraticCurveTo(-4, -30, 20, -17)
  g.lineWidth = 6
  g.strokeStyle = INK
  g.stroke()
  g.lineWidth = 3.4
  g.strokeStyle = '#4fbf4a'
  g.stroke()
  // Leaves.
  for (const [x, y, a] of [[-12, -21, -0.9], [14, -24, 0.5]] as const) {
    g.beginPath()
    g.ellipse(x, y, 5.5, 2.6, a, 0, TAU)
    g.fillStyle = '#6ee84a'
    g.fill()
    g.lineWidth = 1.4
    g.strokeStyle = INK
    g.stroke()
  }
  blossom(g, -14, -15, 5.5, '#ff8fc4', 0.2)
  blossom(g, -3, -24, 6.2, '#fff6fb', 0.9)
  blossom(g, 9, -24, 5.6, '#ffd34d', 0.4)
  blossom(g, 19, -17, 5, '#b58cff', 1.1)
}

/** The Flower Crown as a painted still, in head space (§9.7: a still on the
 *  rig — it rides the head's own transform, like the drawing did). */
export const CROWN_ART: ItemSpec = {
  ...ITEM_ART.crown, frames: 1,
  draw: (g, s) => {
    g.save()
    g.scale(s / CROWN_UNIT, s / CROWN_UNIT)
    crownShape(g)
    g.restore()
  }
}

/** One little scallop shell, hinge at (x, y), opening toward `a`. */
const scallop = (g: G2D, x: number, y: number, r: number, a: number, fill: string): void => {
  g.save()
  g.translate(x, y)
  // The painting hangs HINGE UP (`SHELL_HANG`), the way a shell on a string
  // is drawn; turned back by that much it opens toward `a` like the vector.
  g.save()
  g.rotate(a - SHELL_HANG)
  const painted = drawItem(g, NECKLACE_SHELL_ART, r, 0, fill)
  g.restore()
  if (!painted) {
    g.rotate(a)
    scallopShape(g, r, fill)
  }
  g.restore()
}

/** The shell at the origin, opening toward +x, radius `r`. */
const scallopShape = (g: G2D, r: number, fill: string): void => {
  g.beginPath()
  g.moveTo(0, 0)
  g.arc(0, 0, r, -0.95, 0.95)
  g.closePath()
  g.fillStyle = fill
  g.fill()
  g.lineWidth = 1.4
  g.strokeStyle = INK
  g.stroke()
  g.beginPath()
  for (const k of [-0.5, 0, 0.5]) {
    g.moveTo(0, 0)
    g.lineTo(cos(k) * r * 0.85, sin(k) * r * 0.85)
  }
  g.lineWidth = 0.9
  g.stroke()
}

/** How far the painted shell is turned from the vector's frame: a quarter
 *  turn, so its reference hangs hinge-up with the fan below. */
const SHELL_HANG = PI / 2
/** The necklace's shells are all this big; the reference is drawn at it and
 *  the CONTEXT scaled, so its ink scales with the shell on the bench. */
const SHELL_R = 7.2

/**
 * The necklace's scallop as a painted still, radius `s`, hinge up. ONE shell
 * for all three: they differ only in colour, which is the tinted region
 * (`tinted`), so the three are the same shell the way a real string of them
 * would be. The cord they hang on bends with her neck and stays drawn, and so
 * do the two pearls — under the size floor.
 */
export const NECKLACE_SHELL_ART: ItemSpec = {
  ...ITEM_ART.seashell,
  frames: 1,
  tinted: true,
  draw: (g0, s, _f, accent) => {
    const g = thinInk(g0)
    g.save()
    g.scale(s / SHELL_R, s / SHELL_R)
    g.rotate(SHELL_HANG)
    g.lineJoin = g.lineCap = 'round'
    scallopShape(g, SHELL_R, accent.base)
    g.restore()
  }
}

/**
 * The Seashell Necklace (ch2 keepsake): a string around the neck at its
 * collar, hanging a little toward the chest, with three shells and two pearls.
 * Rig space (facing +x), from the rig's anchors.
 */
export const drawSeashellNecklace = (g: G2D, a: RigAnchors): void => {
  const [dx, dy] = a.neckDir
  // Sit it low on the neck, clear of the head that is drawn over it.
  const cx = a.neckCollar[0] - dx * 14
  const cy = a.neckCollar[1] - dy * 14
  const nx = -dy
  const ny = dx
  const ax = cx + nx * 12
  const ay = cy + ny * 12
  const bx = cx - nx * 12
  const by = cy - ny * 12
  const kx = cx + 8
  const ky = cy + 11
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(ax, ay)
  g.quadraticCurveTo(kx, ky, bx, by)
  g.lineWidth = 3
  g.strokeStyle = INK
  g.stroke()
  g.lineWidth = 1.6
  g.strokeStyle = '#ffe3a3'
  g.stroke()
  const at = (u: number): [number, number] => [
    (1 - u) * (1 - u) * ax + 2 * (1 - u) * u * kx + u * u * bx,
    (1 - u) * (1 - u) * ay + 2 * (1 - u) * u * ky + u * u * by
  ]
  for (const [u, col] of [[0.28, '#ffc0cc'], [0.5, '#ff9f8a'], [0.72, '#bfefff']] as const) {
    const [x, y] = at(u)
    scallop(g, x, y, 7.2, 1.2, col)
  }
  for (const u of [0.39, 0.61]) {
    const [x, y] = at(u)
    g.beginPath()
    g.arc(x, y + 1, 1.8, 0, TAU)
    g.fillStyle = '#fff6fb'
    g.fill()
    g.lineWidth = 1
    g.strokeStyle = INK
    g.stroke()
  }
}

/** A pegasus wing's two colourings, `[fill, tip]`: the NEAR wing in full
 *  light, the FAR one lilac behind her — the painted strip's two panels. */
const WING_COLS = [['#fff6fb', '#ffb3d2'], ['#e2d6fa', '#c7a6ff']] as const

/** One fluffy wing: a rounded leading edge and three scalloped feathers,
 *  rooted at (x, y), sweeping up and back; `flap` 0..1 lifts it.
 *
 *  story-spec §8.20 kept the wings drawn because they "follow the rig's
 *  deformation". They do not: the shape never changes — the flap is a
 *  rotation, the fold a rotation and a scale, the root an anchor the pose
 *  hands over — so the shape is a painting and the matrix stays the game's. */
const wing = (g: G2D, x: number, y: number, s: number, flap: number, far: 0 | 1): void => {
  g.save()
  g.translate(x, y)
  g.rotate(0.22 + flap * 0.35)
  g.scale(s, s)
  if (!drawItem(g, PEGASUS_WING_ART, WORN_UNIT, far)) wingShape(g, WING_COLS[far][0], WING_COLS[far][1])
  g.restore()
}

/** The wing itself, rooted on the origin at rest. */
const wingShape = (g: G2D, fill: string, tip: string): void => {
  g.lineJoin = g.lineCap = 'round'
  g.beginPath()
  g.moveTo(0, 0)
  g.bezierCurveTo(-3, -20, -16, -36, -36, -40)
  g.quadraticCurveTo(-33, -31, -41, -26)
  g.quadraticCurveTo(-33, -19, -38, -12)
  g.quadraticCurveTo(-27, -9, -27, -1)
  g.quadraticCurveTo(-13, 5, 0, 0)
  g.closePath()
  g.fillStyle = fill
  g.fill()
  g.lineWidth = 2.4
  g.strokeStyle = INK
  g.stroke()
  // Coloured feather tips along the trailing edge.
  g.beginPath()
  g.moveTo(-36, -40)
  g.quadraticCurveTo(-33, -31, -41, -26)
  g.quadraticCurveTo(-33, -19, -38, -12)
  g.quadraticCurveTo(-27, -9, -27, -1)
  g.lineWidth = 4
  g.strokeStyle = tip
  g.stroke()
  // Two soft feather partings.
  g.beginPath()
  g.moveTo(-8, -6)
  g.quadraticCurveTo(-20, -14, -30, -20)
  g.moveTo(-6, -14)
  g.quadraticCurveTo(-18, -26, -28, -32)
  g.lineWidth = 1.2
  g.strokeStyle = INK
  g.stroke()
}

/** The pegasus wing as a painted strip: panel 1 the near wing's colours,
 *  panel 2 the far wing's — one wing, rooted on the origin at rest. */
export const PEGASUS_WING_ART: ItemSpec = wornStill(ITEM_ART.pegasusWing, 2, (g, f) =>
  wingShape(g, WING_COLS[f ? 1 : 0][0], WING_COLS[f ? 1 : 0][1]))

/** The wings' gentle flap: a slow breath at rest, a real flap on a hop — and
 *  nothing at all once she is down, when they fold back along her (`fold`). */
const flapOf = (a: RigAnchors): number =>
  (0.5 + 0.5 * sin(a.t * (2.2 + a.lift * 5)) * (0.25 + 0.75 * a.lift)) * (1 - a.lose)

/** Sweep a wing back and tuck it in as the rig goes down. */
const fold = (g: G2D, x: number, y: number, lose: number): void => {
  if (!lose) return
  g.translate(x, y)
  g.rotate(lose * 0.6)
  g.scale(1 - lose * 0.14, 1 - lose * 0.14)
  g.translate(-x, -y)
}

/** The Fluffy Pegasus Wings (ch3 keepsake), far layer: behind the body. The
 *  wings root a little behind the withers, on the back, pegasus-sized. */
export const drawWingsFar = (g: G2D, a: RigAnchors): void => {
  const [x, y] = a.backWithers
  fold(g, x - 8, y - 2, a.lose)
  wing(g, x - 8, y - 2, 1.4, flapOf(a) * 0.9, 1)
}

/** …and the near layer, over the body AND the mane (drawn at `afterMane`). */
export const drawWingsNear = (g: G2D, a: RigAnchors): void => {
  const [x, y] = a.backWithers
  fold(g, x - 16, y + 6, a.lose)
  wing(g, x - 16, y + 6, 1.5, flapOf(a), 0)
}

/* ------------------------------ sparkles ------------------------------ */

/** Add a four-point sparkle to the current path (no beginPath). */
export const sparklePath = (g: G2D, x: number, y: number, r: number, rot: number): void => {
  for (let i = 0; i < 8; i++) {
    const a = rot + (i * PI) / 4
    const rr = i & 1 ? r * 0.36 : r
    const px = x + cos(a) * rr
    const py = y + sin(a) * rr
    if (i) g.lineTo(px, py)
    else g.moveTo(px, py)
  }
  g.closePath()
}

/** Ink the current path the rig's way: a plum outline, the fill on top. */
const inkFill = (g: G2D, fill: string, w: number): void => {
  g.lineWidth = w
  g.strokeStyle = INK
  g.stroke()
  g.fillStyle = fill
  g.fill()
}

/** A fixed little cluster of sparkles, `spots` as [dx, dy, r, colour index]
 *  from (x, y), mirrored by `f`, each twinkling on its own slow beat. Each
 *  one is the sectors' painted twinkle, tinted, once that has landed. */
const sparkleSet = (
  g: G2D, x: number, y: number, f: number, spots: readonly (readonly number[])[], cols: readonly string[],
  t: number, still: boolean
): void => {
  g.lineJoin = 'round'
  for (let c = 0; c < cols.length; c++) {
    g.beginPath()
    let any = false
    for (let i = 0; i < spots.length; i++) {
      const s = spots[i]!
      if (s[3] !== c) continue
      // Pops in, holds, shrinks out — and rests between (still: always on).
      const p = still ? 0.3 : (t * 0.55 + i * 0.37) % 1
      const k = still ? 0.85 : p < 0.6 ? sin((p / 0.6) * PI) : 0
      if (k < 0.05) continue
      const sx = x + f * s[0]!
      const sy = y + s[1]! - p * 8
      if (particleArt(g, TWINKLE_ART, sx, sy, s[2]! * k, 0.3 * i, cols[c]!)) continue
      sparklePath(g, sx, sy, s[2]! * k, 0.3 * i)
      any = true
    }
    if (any) inkFill(g, cols[c]!, 2.2)
  }
}

/* ------------------------ the Sparkly Hoof-trail ---------------------- */
/*
 * Chapter 4's keepsake: little sparkles that stream from her hooves — a
 * gentle trickle at rest, livelier while she rears, and a burst on every hop
 * and cast. A tiny pooled emitter of its own: a hard cap of 40 particles in
 * typed arrays, round-robin reuse, a seeded PRNG, no allocation per frame.
 * It ages on the rig's own clock (`a.t`), so a paused duel freezes it, and a
 * jump in that clock (a new scene) starts it over, pre-warmed.
 */
const TRAIL_MAX = 40
const TX = new Float32Array(TRAIL_MAX)
const TY = new Float32Array(TRAIL_MAX)
const TVX = new Float32Array(TRAIL_MAX)
const TVY = new Float32Array(TRAIL_MAX)
const TAGE = new Float32Array(TRAIL_MAX).fill(1)
const TLIFE = new Float32Array(TRAIL_MAX)
const TSIZE = new Float32Array(TRAIL_MAX)
const TROT = new Float32Array(TRAIL_MAX)
const TCOL = new Uint8Array(TRAIL_MAX)
/** Butter, candy pink, sky, white. */
const TRAIL_COLS = ['#fff09a', '#ffb3da', '#a6e4ff', '#ffffff'] as const
let trailNext = 0
let trailClock = Number.NaN
let trailLift = 0
let trailAcc = 0
let trailHoof = 0
let trailSeed = 7
/** The trail's own deterministic dice (no Math.random in a draw path). */
const trnd = (): number => ((trailSeed = (trailSeed * 16807) % 2147483647) - 1) / 2147483646

const trailSpawn = (x: number, y: number, vx: number, vy: number, life: number, size: number, age = 0): void => {
  const i = trailNext
  trailNext = (i + 1) % TRAIL_MAX
  TX[i] = x + vx * age
  TY[i] = y + vy * age
  TVX[i] = vx
  TVY[i] = vy
  TAGE[i] = age
  TLIFE[i] = life
  TSIZE[i] = size
  TROT[i] = trnd() * TAU
  TCOL[i] = (trnd() * TRAIL_COLS.length) | 0
}

/** Live particles right now (for tests and the frame budget). */
export const hoofTrailLive = (): number => {
  let n = 0
  for (let i = 0; i < TRAIL_MAX; i++) if (TAGE[i]! < TLIFE[i]!) n++
  return n
}
export const HOOF_TRAIL_MAX = TRAIL_MAX

/** One sparkle leaving a hoof, drifting up and back. */
const trailEmit = (a: RigAnchors, age: number): void => {
  const h = (trailHoof ^= 1) ? a.hoofFront : a.hoofHind
  trailSpawn(
    h[0] - a.facing * 4 + (trnd() - 0.5) * 14, h[1] - 2 - trnd() * 6,
    -a.facing * (10 + trnd() * 22), -(26 + trnd() * 30),
    0.9 + trnd() * 0.6, 6 + trnd() * 3.5, age
  )
}

const trailStep = (a: RigAnchors, dt: number): void => {
  const drag = 1 - min(1, 0.9 * dt)
  for (let i = 0; i < TRAIL_MAX; i++) {
    if (TAGE[i]! >= TLIFE[i]!) continue
    TAGE[i] = TAGE[i]! + dt
    TVX[i] = TVX[i]! * drag
    TVY[i] = TVY[i]! * drag - 10 * dt // they float, gently, upward
    TX[i] = TX[i]! + TVX[i]! * dt
    TY[i] = TY[i]! + TVY[i]! * dt
  }
  // A gentle stream at rest, livelier while she rears; none once she is down.
  trailAcc += (10 + 20 * a.lift) * (1 - a.lose) * dt
  while (trailAcc >= 1) {
    trailAcc -= 1
    trailEmit(a, 0)
  }
  // The burst: the rising edge of a hop or a cast.
  if (a.lift > 0.45 && trailLift <= 0.45 && a.lose < 0.5) {
    for (let k = 0; k < 12; k++) {
      const h = k & 1 ? a.hoofHind : a.hoofFront
      const ang = -PI / 2 + (trnd() - 0.5) * 2.4
      const sp = 45 + trnd() * 70
      trailSpawn(h[0], h[1] - 3, cos(ang) * sp, sin(ang) * sp, 0.6 + trnd() * 0.5, 7 + trnd() * 4)
    }
  }
  trailLift = a.lift
}

/** Start over: an empty pool, then a second's worth of stream already under way. */
const trailRestart = (a: RigAnchors): void => {
  TAGE.fill(1)
  TLIFE.fill(0)
  trailAcc = 0
  trailLift = a.lift
  if (a.lose < 0.5) for (let k = 0; k < 10; k++) trailEmit(a, k * 0.1)
}

/** The portrait's still: a few sparkles rising into the frame's bottom edge,
 *  in front of her chest (the hooves are out of shot). */
const TRAIL_STILL: readonly (readonly number[])[] = [
  [12, 40, 5.5, 0], [30, 30, 4.5, 1], [-6, 50, 4.8, 2], [40, 48, 6, 3], [22, 56, 4, 0]
]

export const drawHoofTrail = (g: G2D, a: RigAnchors): void => {
  if (a.portrait) {
    sparkleSet(g, a.headStage[0], a.headStage[1], a.facing, TRAIL_STILL, TRAIL_COLS, a.t, true)
    return
  }
  const dt = a.t - trailClock
  if (!(dt >= 0 && dt < 0.5)) trailRestart(a)
  else if (dt > 0) trailStep(a, min(dt, 0.1))
  trailClock = a.t
  g.lineJoin = 'round'
  const ink = S.q ? 2.6 : 0
  for (let c = 0; c < TRAIL_COLS.length; c++) {
    g.beginPath()
    let any = false
    for (let i = 0; i < TRAIL_MAX; i++) {
      if (TCOL[i] !== c || TAGE[i]! >= TLIFE[i]!) continue
      const age = TAGE[i]!
      const k = age / TLIFE[i]!
      // Snaps in, then shrinks out rather than fading (art-style §6).
      const r = TSIZE[i]! * min(1, age * 16) * (k > 0.55 ? (1 - k) / 0.45 : 1)
      const rot = TROT[i]! + age * 2.5
      // Each sparkle is the sectors' painted twinkle, tinted; the pool, the
      // drift, the spin and the shrink stay the emitter's.
      if (particleArt(g, TWINKLE_ART, TX[i]!, TY[i]!, r, rot, TRAIL_COLS[c]!)) continue
      sparklePath(g, TX[i]!, TY[i]!, r, rot)
      any = true
    }
    if (!any) continue
    if (ink) {
      g.lineWidth = ink
      g.strokeStyle = INK
      g.stroke()
    }
    g.fillStyle = TRAIL_COLS[c]!
    g.fill()
  }
}

/**
 * A trail's STILL, for a photo card (retention item 16).
 *
 * Every trail in the game — this one and the three on the second shelf — is a
 * pooled emitter on a shared clock: the STREAM is the keepsake. A card is one
 * frozen frame, so asking the emitter for it would do two wrong things at
 * once: draw whatever happened to be in the pool at that instant, and restart
 * that pool, which the live diorama behind the album is still drawing from.
 *
 * So a still is its own little drawing — the same shapes, in the same
 * colours, settled around her hooves. Returns undefined for a slug with no
 * trail, exactly as the live registry does.
 */
const STILL_TRAIL: readonly (readonly number[])[] = [
  [-12, -8, 7], [-34, -22, 5.5], [-52, -42, 4.2], [-26, -48, 3.4], [-62, -16, 4.6], [-6, -30, 3.6]
]
const trailStill = (slug: string): ((g: G2D, a: RigAnchors) => void) | undefined => {
  const st = TRAIL_STYLES[slug]
  const shape = st ? st.shape : slug === 'hoofTrailVfx' ? sparklePath : null
  if (!shape) return undefined
  const cols = st ? st.cols : TRAIL_COLS
  const alpha = st ? st.alpha : 1
  // The same painted prop the live trail is routed through, if it has one.
  const art = st ? st.art : TWINKLE_ART
  const spins = st ? !!st.artSpins : true
  return (g: G2D, a: RigAnchors): void => {
    const [hx, hy] = a.hoofFront
    g.lineJoin = 'round'
    g.globalAlpha = alpha
    for (let c = 0; c < cols.length; c++) {
      g.beginPath()
      let any = false
      for (let i = 0; i < STILL_TRAIL.length; i++) {
        if (i % cols.length !== c) continue
        const s = STILL_TRAIL[i]!
        const px = hx + a.facing * s[0]!
        const py = hy + s[1]!
        if (art && particleArt(g, art, px, py, s[2]!, spins ? i * 0.8 : 0, cols[c]!)) continue
        shape(g, px, py, s[2]!, i * 0.8)
        any = true
      }
      if (any) inkFill(g, cols[c]!, 2.4)
    }
    g.globalAlpha = 1
  }
}

/* ----------------------------- the Pet Star --------------------------- */
/*
 * Chapter 9's keepsake: a small, chubby five-point star with a face, who
 * floats above her tail on a lazy figure-eight, blinks now and then, and
 * does a happy spin-and-hop whenever she casts or hops. A faint twinkle
 * trail follows it — its own path a moment ago, so it costs no state.
 */
const STAR_R = 14
/** The star's soft warm glow, baked once (a blur per frame costs far more). */
let glowCv: HTMLCanvasElement | null = null
const starGlow = (): HTMLCanvasElement | null => {
  if (glowCv || typeof document === 'undefined') return glowCv
  const cv = document.createElement('canvas')
  cv.width = cv.height = 64
  const g = cv.getContext('2d')
  if (!g) return null
  const gr = g.createRadialGradient(32, 32, 3, 32, 32, 32)
  gr.addColorStop(0, 'rgba(255, 236, 140, 0.9)')
  gr.addColorStop(0.45, 'rgba(255, 216, 74, 0.38)')
  gr.addColorStop(1, 'rgba(255, 216, 74, 0)')
  g.fillStyle = gr
  g.fillRect(0, 0, 64, 64)
  glowCv = cv
  return cv
}
let starSpin = -99
let starLift = 0
let starClock = Number.NaN

/** The star's float at time `t`, around the anchor (x, y), mirrored by `f`. */
const starX = (x: number, f: number, t: number): number => x + f * (-16 + sin(t * 1.15) * 8)
const starY = (y: number, t: number): number => y - 50 + sin(t * 2.3) * 5

/** The star itself at the origin: the chubby body, a highlight, a face. */
export const drawStarBody = (g: G2D, r: number, blink: boolean, happy: boolean): void => {
  if (!drawItem(g, PET_STAR_ART, r, happy ? 2 : blink ? 1 : 0)) starShape(g, r, blink, happy)
}

const starShape = (g: G2D, r: number, blink: boolean, happy: boolean): void => {
  g.lineJoin = g.lineCap = 'round'
  g.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = -PI / 2 + (i * PI) / 5
    const rr = i & 1 ? r * 0.56 : r
    if (i) g.lineTo(cos(a) * rr, sin(a) * rr)
    else g.moveTo(cos(a) * rr, sin(a) * rr)
  }
  g.closePath()
  g.lineWidth = r * 0.36
  g.strokeStyle = INK
  g.stroke()
  g.fillStyle = '#ffd84a'
  g.fill()
  // A soft top-left highlight, inside the silhouette.
  g.beginPath()
  g.ellipse(-r * 0.3, -r * 0.34, r * 0.2, r * 0.12, -0.6, 0, TAU)
  g.fillStyle = '#fff6c2'
  g.fill()
  // Cheeks.
  g.globalAlpha = 0.75
  g.beginPath()
  g.ellipse(-r * 0.4, r * 0.22, r * 0.13, r * 0.08, 0, 0, TAU)
  g.moveTo(r * 0.53, r * 0.22)
  g.ellipse(r * 0.4, r * 0.22, r * 0.13, r * 0.08, 0, 0, TAU)
  g.fillStyle = '#ff9ec0'
  g.fill()
  g.globalAlpha = 1
  // Eyes: open with a glint, or the happy/blinking crescents.
  g.strokeStyle = INK
  if (blink || happy) {
    g.beginPath()
    for (let d = -1; d <= 1; d += 2) {
      const ex = d * r * 0.24
      if (happy) {
        g.moveTo(ex - r * 0.11, r * 0.03)
        g.quadraticCurveTo(ex, -r * 0.16, ex + r * 0.11, r * 0.03)
      } else {
        g.moveTo(ex - r * 0.11, -r * 0.02)
        g.quadraticCurveTo(ex, r * 0.08, ex + r * 0.11, -r * 0.02)
      }
    }
    g.lineWidth = r * 0.1
    g.stroke()
  } else {
    g.beginPath()
    g.ellipse(-r * 0.24, -r * 0.04, r * 0.1, r * 0.15, 0, 0, TAU)
    g.moveTo(r * 0.34, -r * 0.04)
    g.ellipse(r * 0.24, -r * 0.04, r * 0.1, r * 0.15, 0, 0, TAU)
    g.fillStyle = INK
    g.fill()
    g.beginPath()
    g.arc(-r * 0.21, -r * 0.1, r * 0.045, 0, TAU)
    g.moveTo(r * 0.315, -r * 0.1)
    g.arc(r * 0.27, -r * 0.1, r * 0.045, 0, TAU)
    g.fillStyle = '#fff'
    g.fill()
  }
  // A small smile.
  g.beginPath()
  g.arc(0, r * 0.12, r * 0.13, 0.25, PI - 0.25)
  g.lineWidth = r * 0.085
  g.stroke()
}

/** The Pet Star as a painted strip, one panel per face: eyes open, the
 *  blink, the happy grin of its spin. */
export const PET_STAR_ART: ItemSpec = {
  ...ITEM_ART.petStar, frames: 3,
  draw: (g, s, f) => starShape(g, s, f === 1, f === 2)
}

export const drawPetStar = (g: G2D, a: RigAnchors): void => {
  const t = a.t
  const f = a.facing
  let x: number
  let y: number
  let sp = 1
  if (a.portrait) {
    // The portrait: peeking in over her mane, beside her head.
    x = a.headStage[0] - f * 44
    y = a.headStage[1] - 26
  } else {
    // The happy spin: the rising edge of a hop or a cast, 0.75 s — only on
    // a running clock (a frozen one, reduced motion or a pause, never starts one).
    const ticking = t > starClock && t - starClock < 0.5
    if (!(t >= starClock && t - starClock < 0.5)) {
      starSpin = -99
      starLift = a.lift
    }
    starClock = t
    if (ticking && a.lift > 0.4 && starLift <= 0.4) starSpin = t
    starLift = a.lift
    sp = clamp((t - starSpin) / 0.75, 0, 1)
    x = starX(a.tailStage[0], f, t)
    y = starY(a.tailStage[1], t) - sin(sp * PI) * 14
    // The twinkle trail: where it floated a moment ago.
    if (S.q) {
      // The sparkle tier (item 17) carries the trail three beats further back.
      // Their own path, so the authored four keep exactly the alpha they had,
      // and they SHRINK in on `S.qx` rather than fading up — a trail that
      // faded in would break art-style.md §6 on the way to obeying it.
      // Each sparkle is the sectors' painted twinkle, tinted, once it has
      // landed — the alpha is set first so a painting takes it too.
      if (S.qx > 0.01) {
        g.globalAlpha = 0.4
        g.beginPath()
        let any = false
        for (let j = 5; j <= 7; j++) {
          const tj = t - j * 0.11
          const px = starX(a.tailStage[0], f, tj)
          const py = starY(a.tailStage[1], tj) + 2
          const r = STAR_R * (0.12 - (j - 5) * 0.03) * S.qx
          if (particleArt(g, TWINKLE_ART, px, py, r, tj * 3, '#fff4b8')) continue
          sparklePath(g, px, py, r, tj * 3)
          any = true
        }
        if (any) {
          g.fillStyle = '#fff4b8'
          g.fill()
        }
      }
      g.globalAlpha = 0.55
      g.beginPath()
      let any = false
      for (let j = 1; j <= 4; j++) {
        const tj = t - j * 0.11
        const px = starX(a.tailStage[0], f, tj)
        const py = starY(a.tailStage[1], tj) + 2
        const r = STAR_R * (0.34 - j * 0.05)
        if (particleArt(g, TWINKLE_ART, px, py, r, tj * 3, '#fff4b8')) continue
        sparklePath(g, px, py, r, tj * 3)
        any = true
      }
      if (any) {
        g.fillStyle = '#fff4b8'
        g.fill()
      }
      g.globalAlpha = 1
    }
  }
  g.translate(x, y)
  const glow = S.q ? starGlow() : null
  if (glow) g.drawImage(glow, -STAR_R * 2, -STAR_R * 2, STAR_R * 4, STAR_R * 4)
  g.rotate(sp < 1 ? ease(sp) * TAU * f : sin(t * 1.7) * 0.14)
  const blink = !a.portrait && (t * 0.29 + 0.4) % 1 < 0.045
  drawStarBody(g, STAR_R, blink, sp < 1)
}

/* -------------------------- the Cozy Winter Scarf --------------------- */
/*
 * Chapter 8's keepsake: a chunky knitted scarf in cranberry and cream
 * stripes, wrapped round the neck at the collar and knotted at the throat,
 * two fringed tails fluttering — gently at rest, more on a hop.
 */
const SCARF_A = '#e0485a'
const SCARF_B = '#fff1da'
const SCARF_A_BACK = '#b73a4e'
const SCARF_B_BACK = '#ead8bf'
/** A tail's spine, reused: 7 points. */
const SP = new Float32Array(14)
const SEGS = 6

/** Path a strip along the spine from point j0 to j1, half-width `hw`. */
const stripPath = (g: G2D, j0: number, j1: number, hw: number): void => {
  g.beginPath()
  for (let pass = 0; pass < 2; pass++) {
    const s = pass ? -1 : 1
    for (let q = 0; q <= j1 - j0; q++) {
      const j = pass ? j1 - q : j0 + q
      const ja = Math.max(0, j - 1)
      const jb = Math.min(SEGS, j + 1)
      const dx = SP[jb * 2]! - SP[ja * 2]!
      const dy = SP[jb * 2 + 1]! - SP[ja * 2 + 1]!
      const l = Math.hypot(dx, dy) || 1
      const w = hw * (1 + (j / SEGS) * 0.15) // a touch wider toward the fringe
      const px = SP[j * 2]! - (dy / l) * w * s
      const py = SP[j * 2 + 1]! + (dx / l) * w * s
      if (q || pass) g.lineTo(px, py)
      else g.moveTo(px, py)
    }
  }
  g.closePath()
}

/** One fringed tail from (x, y), hanging at angle `a0`, fluttering. */
const scarfTail = (
  g: G2D, x: number, y: number, a0: number, len: number, hw: number,
  t: number, ph: number, amp: number, ca: string, cb: string
): void => {
  let px = x
  let py = y
  SP[0] = px
  SP[1] = py
  for (let j = 1; j <= SEGS; j++) {
    const f = j / SEGS
    const aa = a0 + amp * sin(t * 3.3 + ph - f * 3.4) * (0.2 + f)
    px += (cos(aa) * len) / SEGS
    py += (sin(aa) * len) / SEGS
    SP[j * 2] = px
    SP[j * 2 + 1] = py
  }
  // The fringe: four tassels off the end, along the last segment.
  const ex = SP[SEGS * 2]!
  const ey = SP[SEGS * 2 + 1]!
  const dx = ex - SP[SEGS * 2 - 2]!
  const dy = ey - SP[SEGS * 2 - 1]!
  const l = Math.hypot(dx, dy) || 1
  const ux = dx / l
  const uy = dy / l
  g.beginPath()
  for (let k = 0; k < 4; k++) {
    const o = (k / 3 - 0.5) * hw * 2.1
    const bx = ex - uy * o
    const by = ey + ux * o
    const w = sin(t * 5 + k * 1.7 + ph) * 1.2
    g.moveTo(bx, by)
    g.lineTo(bx + ux * 6 - uy * w, by + uy * 6 + ux * w)
  }
  g.lineCap = 'round'
  g.lineWidth = 4.4
  g.strokeStyle = INK
  g.stroke()
  // The strip: one silhouette, one fill, then the cream stripes over it.
  stripPath(g, 0, SEGS, hw)
  inkFill(g, ca, 4.6)
  for (let j = 1; j < SEGS; j += 2) {
    stripPath(g, j, j + 1, hw)
    g.fillStyle = cb
    g.fill()
  }
  // The tassels' own colour, over their outline.
  g.beginPath()
  for (let k = 0; k < 4; k++) {
    const o = (k / 3 - 0.5) * hw * 2.1
    const bx = ex - uy * o
    const by = ey + ux * o
    const w = sin(t * 5 + k * 1.7 + ph) * 1.2
    g.moveTo(bx, by)
    g.lineTo(bx + ux * 6 - uy * w, by + uy * 6 + ux * w)
  }
  g.lineWidth = 1.8
  g.strokeStyle = cb
  g.stroke()
}

/**
 * The scarf at (cx, cy): the wrap lies across the neck along (nx, ny) —
 * the unit vector from the nape to the throat — with its two tails knotted
 * on the throat side. `lift` 0..1 livens the flutter.
 */
export const drawScarfAt = (g: G2D, cx: number, cy: number, nx: number, ny: number, t: number, lift: number): void => {
  const W = SCARF_W
  const H = SCARF_H
  // Down the neck, toward the chest.
  const dx = -ny
  const dy = nx
  const kx = cx + nx * W * 0.58 + dx * H * 0.2
  const ky = cy + ny * W * 0.58 + dy * H * 0.2
  const amp = 0.09 + 0.36 * lift
  g.lineJoin = 'round'
  // The back tail, blown back over the shoulder, then the front one down the chest.
  scarfTail(g, kx, ky, PI / 2 + 0.85, 30, 5.4, t, 1.3, amp * 1.25, SCARF_A_BACK, SCARF_B_BACK)
  scarfTail(g, kx, ky, PI / 2 - 0.22, 34, 6, t, 0, amp, SCARF_A, SCARF_B)
  // The wrap and its knot: ONE shape turned to the neck — a painted still.
  // The tails above are rebuilt every frame along a travelling wave (the
  // mane's reason for staying drawn), so they stay the game's.
  g.save()
  g.translate(cx, cy)
  g.rotate(Math.atan2(ny, nx))
  const painted = drawItem(g, SCARF_WRAP_ART, WORN_UNIT)
  if (!painted) wrapShape(g)
  g.restore()
  if (painted) return
  // The knot over the tails' roots.
  g.beginPath()
  g.ellipse(kx, ky, 6.6, 5.6, 0.4, 0, TAU)
  inkFill(g, SCARF_A, 3.6)
}

/** The wrap's size: half its length along the neck, and its depth. */
const SCARF_W = 19
const SCARF_H = 15

/** The wrap in its own frame — the neck's normal along +x, centred on the
 *  origin: a chunky pill striped across its length. */
const wrapShape = (g: G2D): void => {
  const W = SCARF_W
  const H = SCARF_H
  // The wrap: a chunky pill round the neck, striped across its length. No
  // clip: the stripes sit inside the pill's straight run, and the roll's
  // band follows its rounded ends exactly.
  const r = H / 2
  const e = W - r
  g.beginPath()
  g.roundRect(-W, -r, W * 2, H, r)
  inkFill(g, SCARF_A, 5)
  g.fillStyle = SCARF_B
  g.fillRect(-W * 0.6, -r, W * 0.4, H)
  g.fillRect(W * 0.2, -r, W * 0.4, H)
  // A soft roll: the lower edge a shade deeper…
  const y0 = r * 0.44
  const a0 = Math.asin(y0 / r)
  g.beginPath()
  g.arc(-e, 0, r, PI - a0, PI / 2, true)
  g.arc(e, 0, r, PI / 2, a0, true)
  g.closePath()
  g.globalAlpha = 0.16
  g.fillStyle = INK
  g.fill()
  g.globalAlpha = 1
  // …and a knit rib across the middle.
  g.beginPath()
  for (let x = -W + 3; x < W - 3; x += 5.2) {
    g.moveTo(x, 0)
    g.lineTo(x + 2.2, 0)
  }
  g.lineWidth = 1.3
  g.strokeStyle = 'rgba(58,35,64,0.45)'
  g.stroke()
}

/**
 * The wrap and its knot as a painted still, in the wrap's frame (the neck's
 * normal along +x): the knot sits where `drawScarfAt` ties it, (0.58 W,
 * 0.2 H) down the neck. NO TAILS and no fringe — they flutter on a wave the
 * game rebuilds every frame, and are drawn under this.
 */
export const SCARF_WRAP_ART: ItemSpec = wornStill(ITEM_ART.scarfWrap, 1, (g) => {
  wrapShape(g)
  g.beginPath()
  g.ellipse(SCARF_W * 0.58, SCARF_H * 0.2, 6.6, 5.6, 0.4, 0, TAU)
  inkFill(g, SCARF_A, 3.6)
})

/** The scarf on the rig: low on the neck like the necklace, clear of the head. */
export const drawWinterScarf = (g: G2D, a: RigAnchors): void => {
  const [dx, dy] = a.neckDir
  drawScarfAt(g, a.neckCollar[0] - dx * 15, a.neckCollar[1] - dy * 15, -dy, dx, a.t, a.lift)
}

/* -------------------------------- skins ------------------------------- */

const UMBRA_PAL = FOES[guardianOf(9)]!.pal
/**
 * The Umbra Look (ch5, C31): Umbra's matte night coat, violet rim and
 * neon-cyan streaks, worn on Aurora's own round shape — no dread aura, no
 * half-lidded eye (the rig's side decides those, not the skin). Two friendly
 * touches keep it cute rather than spooky: a soft cornflower eye instead of
 * Umbra's glow, and a pink blush that actually shows on the dark coat.
 */
export const UMBRA_LOOK: FoePalette = [
  UMBRA_PAL[0], UMBRA_PAL[1], UMBRA_PAL[2], UMBRA_PAL[3], UMBRA_PAL[4],
  UMBRA_PAL[5], UMBRA_PAL[6], '#6f9dff', UMBRA_PAL[8], '#ff8fcf'
]

/**
 * The Pastel Dream Theme (ch7): a pastel-rainbow coat — every form's three
 * cel bands become sky rim, lilac shadow and blush-pink light — a
 * cotton-candy mane, a pearly horn, lilac hooves; and a few twinkles
 * popping in and out around her.
 */
export const PASTEL_DREAM: FoePalette = [
  '#ffe8f5', '#dcc8ff', '#a8eedc', '#ffaedb', '#a8e4ff', '#fdf4ff', '#c9a6f0', '#5b3f8f', '#ffd0f0', '#ff8fc6'
]
const DREAM_COLS = ['#ffb3de', '#b4f2dc', '#d9c2ff', '#b0e2ff', '#fff3a6'] as const
/** Around her silhouette, from the barrel's centre (rig units, facing +x). */
const DREAM_SPOTS: readonly (readonly number[])[] = [
  [-74, -12, 6.5, 0], [-52, -66, 5.5, 1], [62, 6, 5.5, 2], [80, -52, 6, 3], [-14, -100, 5, 4], [34, 60, 5, 1], [-66, 52, 5.5, 2]
]
/** In a portrait: around the head. */
const DREAM_SPOTS_HEAD: readonly (readonly number[])[] = [
  [-40, -40, 7, 0], [50, -30, 6, 2], [58, 20, 7, 3], [-50, 10, 6, 1], [4, -64, 5.5, 4]
]
export const drawDreamTwinkles = (g: G2D, a: RigAnchors): void => {
  if (a.portrait) sparkleSet(g, a.headStage[0], a.headStage[1], a.facing, DREAM_SPOTS_HEAD, DREAM_COLS, a.t, true)
  else sparkleSet(g, a.bodyStage[0], a.bodyStage[1], a.facing, DREAM_SPOTS, DREAM_COLS, a.t, false)
}

/* ------------------------ the Mane Color Palette ---------------------- */

/** A swatch's micro-glyph: every mane colour carries a shape (§3.11). */
export type SwatchGlyph = 'star' | 'flower' | 'leaf' | 'drop' | 'heart' | 'dot' | 'diamond' | 'moon'
export interface ManeSwatch {
  /** The mane's `[base, streak]`, `'rainbow'`, or null = the skin's own. */
  mane: readonly [string, string] | 'rainbow' | null
  glyph: SwatchGlyph
  /** Its colour's name, read aloud (an i18n key). */
  label: string
}
/**
 * The 8 swatches (C17, §2.4): `art-style.md`'s four mane-streak hues as the
 * template, plus four more — six of the eight are not pink. Position is the
 * saved `maneSwatch`; never reorder. Swatch 0 is her own (the skin's) mane.
 */
export const MANE_SWATCHES: readonly ManeSwatch[] = [
  { mane: null, glyph: 'star', label: 'paint.sunshell' },
  { mane: ['#c7a6ff', '#f1e6ff'], glyph: 'flower', label: 'paint.lavender' },
  { mane: ['#8fe8c6', '#e2fff2'], glyph: 'leaf', label: 'paint.mint' },
  { mane: ['#9fd8ff', '#e6f5ff'], glyph: 'drop', label: 'paint.skyblue' },
  { mane: ['#ff9ecf', '#ffe2f1'], glyph: 'heart', label: 'paint.rose' },
  { mane: ['#ff9466', '#ffd9a0'], glyph: 'dot', label: 'paint.sunrise' },
  { mane: 'rainbow', glyph: 'diamond', label: 'paint.rainbow' },
  { mane: ['#3c4aa6', '#a9dcff'], glyph: 'moon', label: 'paint.midnight' }
]

/* ------------------------------ the registry -------------------------- */

const HEAD_DRAW: Readonly<Record<string, (g: G2D) => void>> = {
  flowerCrown: drawFlowerCrown,
  ...HEAD_DRAW_X
}
const NECK_DRAW: Readonly<Record<string, (g: G2D, a: RigAnchors) => void>> = {
  seashellNecklace: drawSeashellNecklace,
  winterScarf: drawWinterScarf,
  ...NECK_DRAW_X
}
const BACK_DRAW: Readonly<Record<string, readonly [(g: G2D, a: RigAnchors) => void, (g: G2D, a: RigAnchors) => void]>> = {
  pegasusWings: [drawWingsFar, drawWingsNear],
  ...BACK_DRAW_X
}
/** The companion and the trail used to be two `slug === '…'` comparisons in
 *  `composeHooks`, which is a registry with room for exactly one item. */
const COMPANION_DRAW: Readonly<Record<string, (g: G2D, a: RigAnchors) => void>> = {
  petStar: drawPetStar,
  ...COMPANION_DRAW_X
}
const TRAIL_DRAW: Readonly<Record<string, (g: G2D, a: RigAnchors) => void>> = {
  hoofTrailVfx: drawHoofTrail,
  ...TRAIL_DRAW_X
}
const SKIN_PAL: Readonly<Record<string, FoePalette>> = {
  umbraSkin: UMBRA_LOOK,
  pastelTheme: PASTEL_DREAM,
  ...SKIN_PAL_X
}

/** The equipped item's index in a slot, or -1. */
export const equippedIn = (slot: typeof COSMETIC_SLOTS[number]): number =>
  S.campaign.giftsEquipped[COSMETIC_SLOTS.indexOf(slot)] ?? -1

/** The head slot's draw function, if something is equipped there. */
export const equippedHeadDraw = (): ((g: G2D) => void) | undefined => {
  const id = equippedIn('head')
  const def = id >= 0 ? COSMETICS[id] : undefined
  return def && def.slot === 'head' ? HEAD_DRAW[def.slug] : undefined
}

/**
 * The slug worn in a slot of ANY outfit.
 *
 * An outfit is just the seven cosmetic ids — usually `S.campaign.giftsEquipped`,
 * but a photo card (retention item 16) redraws her from the outfit its RECIPE
 * names, which may be nothing like what she has on today. Everything below
 * that used to read the save directly reads an outfit instead, and the live
 * helpers pass the save's own.
 */
const slugOf = (eq: readonly number[], slot: typeof COSMETIC_SLOTS[number]): string | undefined => {
  const id = eq[COSMETIC_SLOTS.indexOf(slot)] ?? -1
  const def = id >= 0 ? COSMETICS[id] : undefined
  return def && def.slot === slot ? def.slug : undefined
}

/** The slug equipped in a slot right now, or undefined. */
const slugIn = (slot: typeof COSMETIC_SLOTS[number]): string | undefined =>
  slugOf(S.campaign.giftsEquipped, slot)

/** A swatch index from anywhere (a save, a recipe), clamped into the row. */
const swatchOf = (i: number): number => {
  const n = i | 0
  return n >= 0 && n < MANE_SWATCHES.length ? n : 0
}

/** The saved swatch, clamped (a hand-edited save can hold anything). */
export const maneSwatchIndex = (): number => swatchOf(S.campaign.maneSwatch)

/** The mane override an outfit wears, if the Mane Color Palette is on in it
 *  and a swatch other than her own is picked. */
const maneWorn = (eq: readonly number[], swatch: number): ManeSwatch['mane'] =>
  slugOf(eq, 'mane') === 'colorPicker' ? MANE_SWATCHES[swatch]!.mane : null

/** The mane `[base, streak]` a swatch 0 shows: the worn skin's own. */
export const ownManeColours = (): readonly [string, string] => {
  const skin = slugIn('skin')
  const pal = skin ? SKIN_PAL[skin] : undefined
  return pal ? [pal[3], pal[4]] : ['#ffcc33', '#ffee99']
}

type Hooks = Pick<PoseState, 'afterHead' | 'headItem' | 'afterMane' | 'beforeTorso' | 'afterTorso' | 'afterRig' | 'skin' | 'mane'>

/** The last composed hooks, and what they were composed from. */
let hooks: Hooks | null = null
const hooksFrom = new Int16Array(8)

const composeHooks = (eq: readonly number[], swatch: number, still: boolean): Hooks => {
  const head = slugOf(eq, 'head')
  const neck = slugOf(eq, 'neck')
  const back = slugOf(eq, 'back')
  const skin = slugOf(eq, 'skin')
  const wings = back ? BACK_DRAW[back] : undefined
  const necklace = neck ? NECK_DRAW[neck] : undefined
  const near = wings?.[1]
  const trailSlug = slugOf(eq, 'trail')
  const companionSlug = slugOf(eq, 'companion')
  const trail = trailSlug ? (still ? trailStill(trailSlug) : TRAIL_DRAW[trailSlug]) : undefined
  const star = companionSlug ? COMPANION_DRAW[companionSlug] : undefined
  const dream = skin === 'pastelTheme'
  const mane = maneWorn(eq, swatch)
  return {
    afterHead: head ? HEAD_DRAW[head] : undefined,
    headItem: head ?? undefined,
    // The near wing lies over the mane; the neck item goes on last, on top.
    afterMane: near || necklace
      ? (g: G2D, a: RigAnchors): void => {
          near?.(g, a)
          necklace?.(g, a)
        }
      : undefined,
    beforeTorso: wings?.[0],
    afterTorso: undefined,
    // Stage space, after the whole rig: twinkles, then the trail, then the
    // star in front of everything.
    afterRig: trail || star || dream
      ? (g: G2D, a: RigAnchors): void => {
          if (dream) {
            g.save()
            drawDreamTwinkles(g, a)
            g.restore()
          }
          if (trail) {
            g.save()
            trail(g, a)
            g.restore()
          }
          if (star) {
            g.save()
            star(g, a)
            g.restore()
          }
        }
      : undefined,
    skin: skin ? SKIN_PAL[skin] : undefined,
    mane: mane ?? undefined
  }
}

/**
 * Everything Aurora wears, as the rig's draw hooks and palette (§9.7).
 * Spread into a `PoseState` wherever she is drawn — the duel, the wardrobe,
 * a portrait. Every key is always present (undefined when nothing is worn
 * there), so `Object.assign` onto a reused pose also takes things OFF.
 * Composed once per wardrobe change, not per frame.
 */
export const equippedHooks = (): Hooks => {
  const eq = S.campaign.giftsEquipped
  let same = hooks !== null
  for (let i = 0; i < 7; i++) {
    const v = eq[i] ?? -1
    if (hooksFrom[i] !== v) {
      same = false
      hooksFrom[i] = v
    }
  }
  const sw = maneSwatchIndex()
  if (hooksFrom[7] !== sw) {
    same = false
    hooksFrom[7] = sw
  }
  if (!same || !hooks) hooks = composeHooks(eq, sw, false)
  return hooks
}

/**
 * The same composition for an outfit that is NOT the one she has on — a photo
 * card's recipe (retention item 16), which names the seven cosmetic ids and
 * the mane swatch it was taken in.
 *
 * Uncached on purpose: `equippedHooks` is called once per frame and caches for
 * that; this is called once per card bake, and a second cache keyed on seven
 * ids would cost more than the compose it saves. `still` swaps every pooled
 * emitter for its frozen twin — see `trailStill`.
 */
export const outfitHooks = (equipped: readonly number[], swatch: number, still = false): Hooks =>
  composeHooks(equipped, swatchOf(swatch), still)

/**
 * A key naming everything that changes how she looks (for caches of baked
 * portraits): every slot's item, and the mane swatch while the palette is
 * worn.
 */
export const equippedKey = (): string => {
  const slots = COSMETIC_SLOTS.map((s) => slugIn(s) ?? '-').join('|')
  return slugIn('mane') === 'colorPicker' ? `${slots}#${maneSwatchIndex()}` : slots
}
