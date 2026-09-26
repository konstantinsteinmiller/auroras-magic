/**
 * previewDraw.ts — the duel VS preview's canvas (the DOM half is
 * `components/preview/*`; the clock and the layout are `preview.ts`).
 *
 * A cosy storybook spread split down a seam of warm light: Aurora's dawn on
 * one side (rose, peach, gold), the friendly night on the other (indigo into
 * violet, with the foe's own glow behind her), each duelist on a cloud
 * podium, and glitter — stars and hearts — thrown up by every beat.
 *
 * WHAT A FRAME COSTS (the contract's hard budget — the fill-bound low-end
 * Android is this game's known weak spot, PERF-LEDGER E3):
 *   • ONE full-screen blit: the static backdrop (both halves, the seam's
 *     light, bokeh, grain, vignette, the foe's glow) is baked ONCE per layout,
 *     art or foe into an offscreen canvas at the backing resolution —
 *     `duel/backdrop.ts`'s pattern — and blitted 1:1. While the halves sweep
 *     in (0.4 s) it is two half blits instead, over a paper fill.
 *   • On top: the rays (tier ≥ 1 only), two podiums (each a pre-baked sprite
 *     or its painting: one `drawImage`), the two rigs, the glitter, the VS
 *     shockwave, and the seam's flash / bloom (a pre-baked strip, one
 *     `drawImage`) while they last.
 *   • The glitter is ONE preallocated `Float32Array` pool, allocated at load,
 *     never per frame, drawn batched by colour: one path and one fill per
 *     colour, shapes shrinking out rather than fading (`fx.ts`'s rule), so
 *     there is no per-particle `globalAlpha` to break a batch. Its live cap
 *     follows the quality tier (`S.q` 0 → 24, 1 → 64, 2 → 110) and reduced
 *     motion (16).
 *   • Reduced motion: no shake, no turning rays, no overshoot, no hop, a
 *     softer flash; the halves fade in instead of sweeping.
 *
 * The particles roll their own seeded dice, never `Math.random`: the duel's
 * rules roll on that stream (`fx.ts`, "THE POOL'S DICE"), and a preview that
 * shifted it would change the first damage number of the duel it announces.
 */
import { S } from '@/game/duel/state'
import { drawUnicorn, type PoseState } from '@/game/duel/chars'
import { equippedHooks } from '@/game/cosmetics/rig-cosmetics'
import { spriteFor, onArtChanged } from '@/game/art'
import { drawItem } from '@/game/artItem'
import { reducedMotion } from '@/use/useAccessibility'
import {
  pv, halvesIn, heroIn, foeIn, hopAt, showAt, zoomAt, shakeAt, exitK, easeOutCubic,
  VS_AT, GO_AT, HERO_LAND, FOE_LAND, HERO_SHOW, FOE_SHOW, SKIP_TO, RIG_BOX
} from '@/game/preview/preview'
import {
  paintPreviewBackdrop, paintPreviewMoon, halfPath, PODIUM_ART, PODIUM_UNIT, drawPodium, VS_BACKDROP_KIND, VS_PODIUM_IDS,
  vsBackdropArtId, sparkle
} from '@/game/preview/previewArt'
import type { PreviewLayout } from '@/game/preview/previewHud'

type G2D = CanvasRenderingContext2D

const TAU = Math.PI * 2
const RIG_MID = (RIG_BOX.x0 + RIG_BOX.x1) / 2
/** The cream paper under the halves while they sweep in (`--am-paper`). */
const PAPER = '#FDF6E7'

/* ──────────────────────────────── art epoch ───────────────────────────── */

/** Bumped only by a painting THIS scene draws arriving (scoped invalidation). */
let artEpoch = 0
onArtChanged((c) => {
  if (!c || c.id.startsWith('vs-')) artEpoch++
})

/* ────────────────────────────── the backdrop bake ─────────────────────── */

let bake: HTMLCanvasElement | null = null
let kW = 0
let kH = 0
let kD = 0
let kTint = ''
let kEpoch = -1
let kImg: HTMLImageElement | null = null
let kFoeX = NaN

/** `#rgb` / `#rrggbb` → `r,g,b` (a bake-time helper; never per frame). */
const rgbOf = (hex: string): string => {
  let s = hex.replace('#', '')
  if (s.length === 3) s = s[0]! + s[0]! + s[1]! + s[1]! + s[2]! + s[2]!
  const n = parseInt(s.slice(0, 6), 16)
  return Number.isFinite(n) ? `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}` : '201,182,255'
}

/** Bake the backdrop if what it holds changed. Returns it (or null: no DOM). */
const ensureBake = (L: PreviewLayout, d: number, tint: string): HTMLCanvasElement | null => {
  const img = spriteFor(VS_BACKDROP_KIND, vsBackdropArtId(L.portrait))
  if (bake && kW === L.w && kH === L.h && kD === d && kTint === tint && kEpoch === artEpoch && kImg === img && kFoeX === L.foe.x) return bake
  if (typeof document === 'undefined') return null
  if (!bake) bake = document.createElement('canvas')
  const W = Math.max(1, Math.round(L.w * d))
  const H = Math.max(1, Math.round(L.h * d))
  if (bake.width !== W || bake.height !== H) {
    bake.width = W
    bake.height = H
  }
  const c = bake.getContext('2d')
  if (!c) return null
  c.setTransform(d, 0, 0, d, 0, 0)
  c.globalAlpha = 1
  c.globalCompositeOperation = 'source-over'
  if (img) c.drawImage(img, 0, 0, L.w, L.h)
  else paintPreviewBackdrop(c, L.w, L.h, L.portrait)
  // The moon over either: the painting is stretched to the screen and
  // nothing round is painted into it (`previewArt`'s header).
  paintPreviewMoon(c, L.w, L.h, L.portrait)
  // Her own glow, behind where she stands: the night takes her colour.
  const s = L.scale
  const fx = L.foe.x - RIG_MID * s
  const fy = L.foe.y - 96 * s
  const rgb = rgbOf(tint || '#c9b6ff')
  const fr = 190 * s
  const fg = c.createRadialGradient(fx, fy, 0, fx, fy, fr)
  fg.addColorStop(0, `rgba(${rgb},0.55)`)
  fg.addColorStop(0.45, `rgba(${rgb},0.22)`)
  fg.addColorStop(1, `rgba(${rgb},0)`)
  c.fillStyle = fg
  c.fillRect(fx - fr, fy - fr, fr * 2, fr * 2)
  // …and a warm one behind Aurora, so both stand in their own light.
  const hx = L.hero.x + RIG_MID * s
  const hy = L.hero.y - 96 * s
  const hg = c.createRadialGradient(hx, hy, 0, hx, hy, fr)
  hg.addColorStop(0, 'rgba(255,248,222,0.6)')
  hg.addColorStop(0.5, 'rgba(255,236,190,0.2)')
  hg.addColorStop(1, 'rgba(255,236,190,0)')
  c.fillStyle = hg
  c.fillRect(hx - fr, hy - fr, fr * 2, fr * 2)
  kW = L.w
  kH = L.h
  kD = d
  kTint = tint
  kEpoch = artEpoch
  kImg = img
  kFoeX = L.foe.x
  return bake
}

/* ─────────────────────────── small baked sprites ───────────────────────── */

/** A soft radial glow in `rgb`, 128 px, made once per colour. */
const glows = new Map<string, HTMLCanvasElement>()
const glow = (rgb: string): HTMLCanvasElement | null => {
  const hit = glows.get(rgb)
  if (hit) return hit
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const x = c.getContext('2d')
  if (!x) return null
  const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64)
  gr.addColorStop(0, `rgba(${rgb},1)`)
  gr.addColorStop(0.35, `rgba(${rgb},0.55)`)
  gr.addColorStop(1, `rgba(${rgb},0)`)
  x.fillStyle = gr
  x.fillRect(0, 0, 128, 128)
  glows.set(rgb, c)
  return c
}
const GLOW_WARM = '255,240,196'
const GLOW_DAWN = '255,190,214'
const GLOW_NIGHT = '201,182,255'

/** The seam's light as a strip (across its width: clear → cream → clear). */
let strip: HTMLCanvasElement | null = null
const seamStrip = (): HTMLCanvasElement | null => {
  if (strip) return strip
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = 8
  c.height = 64
  const x = c.getContext('2d')
  if (!x) return null
  const gr = x.createLinearGradient(0, 0, 0, 64)
  gr.addColorStop(0, 'rgba(255,236,170,0)')
  gr.addColorStop(0.3, 'rgba(255,232,168,0.6)')
  gr.addColorStop(0.5, 'rgba(255,253,244,1)')
  gr.addColorStop(0.7, 'rgba(255,232,168,0.6)')
  gr.addColorStop(1, 'rgba(255,236,170,0)')
  x.fillStyle = gr
  x.fillRect(0, 0, 8, 64)
  strip = c
  return c
}

/** A drawn podium, baked at its on-screen size (the island's own pattern). */
interface Pod { cv: HTMLCanvasElement | null; k: number }
const pods: { dawn: Pod; night: Pod } = { dawn: { cv: null, k: 0 }, night: { cv: null, k: 0 } }
/** The podium sprite's box, stage units: a margin round its drawing. */
const POD_X = 104
const POD_Y0 = -18
const POD_Y1 = 64
const podSprite = (night: boolean, k: number): HTMLCanvasElement | null => {
  const p = night ? pods.night : pods.dawn
  if (p.cv && p.k === k) return p.cv
  if (typeof document === 'undefined') return null
  const c = p.cv ?? document.createElement('canvas')
  const W = Math.ceil(2 * POD_X * k)
  const H = Math.ceil((POD_Y1 - POD_Y0) * k)
  c.width = W
  c.height = H
  const x = c.getContext('2d')
  if (!x) return null
  x.setTransform(1, 0, 0, 1, POD_X * k, -POD_Y0 * k)
  drawPodium(x, k, night)
  p.cv = c
  p.k = k
  return c
}

/* ─────────────────────────────── the glitter ──────────────────────────── */

/** Pool stride: x, y, vx, vy, age, life, size, shape, colour, rot, spin, grav. */
const ST = 12
const CAP = 110
const P = new Float32Array(CAP * ST)
let live = 0
/** Shapes: a dot, a four-point sparkle, a heart, a five-point star, confetti. */
const DOT = 0
const SPARK = 1
const HEART = 2
const STAR = 3
const CONF = 4
/** The glitter's colours: dawn, night, and the shared golds. Never black. */
const COLS = ['#fffaf0', '#ffd76a', '#ff9ecf', '#ffb36b', '#c7a6ff', '#dce0f5', '#9fd8ff', '#9ff0d0'] as const
const C_CREAM = 0
const C_GOLD = 1
const C_PINK = 2
const C_PEACH = 3
const C_LILAC = 4
const C_SILVER = 5
const C_SKY = 6
const C_MINT = 7
const DAWN_COLS = [C_CREAM, C_GOLD, C_PINK, C_PEACH] as const
const NIGHT_COLS = [C_LILAC, C_SILVER, C_SKY, C_CREAM] as const
const ALL_COLS = [C_CREAM, C_GOLD, C_PINK, C_LILAC, C_SKY, C_MINT, C_PEACH, C_SILVER] as const
const GO_COLS = [C_GOLD, C_CREAM, C_PINK] as const
const EXIT_COLS = [C_CREAM, C_GOLD] as const

/** The preview's own dice (see the header). */
let seed = 20260925
const rnd = (): number => (seed = (seed * 16807) % 2147483647) / 2147483647

/** The live cap now: the quality tier's, or reduced motion's. */
const budget = (): number => (reducedMotion.value ? 16 : S.q <= 0 ? 24 : S.q === 1 ? 64 : 110)

/** One particle into a free slot; dropped (not recycled) once the cap is met. */
const spawn = (
  x: number, y: number, vx: number, vy: number, life: number, size: number, shape: number, col: number, grav: number
): void => {
  if (live >= budget()) return
  for (let i = 0; i < CAP; i++) {
    const o = i * ST
    if (P[o + 5]! > 0) continue
    P[o] = x
    P[o + 1] = y
    P[o + 2] = vx
    P[o + 3] = vy
    P[o + 4] = 0
    P[o + 5] = life
    P[o + 6] = size
    P[o + 7] = shape
    P[o + 8] = col
    P[o + 9] = rnd() * TAU
    P[o + 10] = (rnd() - 0.5) * 6
    P[o + 11] = grav
    live++
    return
  }
}

/** A burst of `n` (scaled by the budget) from (x, y), speeds in CSS px/s. */
const burst = (
  x: number, y: number, n: number, v0: number, v1: number, cols: readonly number[], shapes: readonly number[],
  size: number, grav: number, up = 0, spread = TAU
): void => {
  const k = Math.max(3, Math.round((n * budget()) / 110))
  for (let i = 0; i < k; i++) {
    const a = -Math.PI / 2 + (rnd() - 0.5) * spread
    const v = v0 + (v1 - v0) * rnd()
    spawn(
      x, y, Math.cos(a) * v, Math.sin(a) * v - up, 0.7 + 0.8 * rnd(), size * (0.6 + 0.8 * rnd()),
      shapes[(rnd() * shapes.length) | 0]!, cols[(rnd() * cols.length) | 0]!, grav
    )
  }
}

const clearFx = (): void => {
  P.fill(0)
  live = 0
}

const stepFx = (dt: number): void => {
  if (dt <= 0) return
  const drag = Math.exp(-1.6 * dt)
  for (let i = 0; i < CAP; i++) {
    const o = i * ST
    const life = P[o + 5]!
    if (life <= 0) continue
    const age = P[o + 4]! + dt
    if (age >= life) {
      P[o + 5] = 0
      live--
      continue
    }
    P[o + 4] = age
    P[o + 2] = P[o + 2]! * drag
    P[o + 3] = P[o + 3]! * drag + P[o + 11]! * dt
    P[o] = P[o]! + P[o + 2]! * dt
    P[o + 1] = P[o + 1]! + P[o + 3]! * dt
    P[o + 9] = P[o + 9]! + P[o + 10]! * dt
  }
}

/* Which shapes each burst throws. */
const LAND_SHAPES = [SPARK, DOT, STAR] as const
const SLAM_SHAPES = [HEART, STAR, CONF, SPARK, HEART] as const
const GO_SHAPES = [STAR, SPARK, HEART] as const
const EXIT_SHAPES = [SPARK, DOT] as const

/* The shapes as unit polygons, rotated per particle into ONE path per colour. */
const HEART_PTS = new Float32Array(32)
for (let i = 0; i < 16; i++) {
  const t = (i / 16) * TAU
  // The classic heart curve, normalised to a unit-ish box, point down.
  const hx = 16 * Math.sin(t) ** 3
  const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))
  HEART_PTS[i * 2] = hx / 16
  HEART_PTS[i * 2 + 1] = hy / 16
}
const STAR_PTS = new Float32Array(20)
for (let i = 0; i < 10; i++) {
  const a = -Math.PI / 2 + (i * Math.PI) / 5
  const r = i & 1 ? 0.45 : 1
  STAR_PTS[i * 2] = Math.cos(a) * r
  STAR_PTS[i * 2 + 1] = Math.sin(a) * r
}
const SPARK_PTS = new Float32Array(16)
for (let i = 0; i < 8; i++) {
  const a = -Math.PI / 2 + (i * Math.PI) / 4
  const r = i & 1 ? 0.22 : 1
  SPARK_PTS[i * 2] = Math.cos(a) * r
  SPARK_PTS[i * 2 + 1] = Math.sin(a) * r
}
const CONF_PTS = new Float32Array([-1, -0.45, 1, -0.45, 1, 0.45, -1, 0.45])

const poly = (g: G2D, pts: Float32Array, x: number, y: number, r: number, rot: number): void => {
  const c = Math.cos(rot) * r
  const s = Math.sin(rot) * r
  const n = pts.length
  g.moveTo(x + pts[0]! * c - pts[1]! * s, y + pts[0]! * s + pts[1]! * c)
  for (let i = 2; i < n; i += 2) g.lineTo(x + pts[i]! * c - pts[i + 1]! * s, y + pts[i]! * s + pts[i + 1]! * c)
  g.closePath()
}

const drawFx = (g: G2D): void => {
  if (!live) return
  for (let c = 0; c < COLS.length; c++) {
    let any = false
    for (let i = 0; i < CAP; i++) {
      const o = i * ST
      if (P[o + 5]! <= 0 || P[o + 8] !== c) continue
      const k = P[o + 4]! / P[o + 5]!
      // Pop in over the first few frames, twinkle, and shrink out.
      const r = P[o + 6]! * Math.min(1, k * 8) * (1 - k * k) * (0.8 + 0.2 * Math.sin(P[o + 4]! * 14 + i))
      if (r < 0.3) continue
      if (!any) {
        g.beginPath()
        any = true
      }
      const x = P[o]!
      const y = P[o + 1]!
      const shape = P[o + 7]!
      if (shape === DOT) {
        g.moveTo(x + r * 0.5, y)
        g.arc(x, y, r * 0.5, 0, TAU)
      } else if (shape === SPARK) poly(g, SPARK_PTS, x, y, r, P[o + 9]! * 0.2)
      else if (shape === HEART) poly(g, HEART_PTS, x, y, r * 0.8, Math.sin(P[o + 9]!) * 0.35)
      else if (shape === STAR) poly(g, STAR_PTS, x, y, r, P[o + 9]!)
      else poly(g, CONF_PTS, x, y, r * 0.6, P[o + 9]!)
    }
    if (any) {
      g.fillStyle = COLS[c]!
      g.fill()
    }
  }
}

/* ────────────────────────────── the frame state ───────────────────────── */

/** How much of a show-off rear reaches the horn's orb (see `drawStage`). */
const SHOW_FORM = 0.22
/**
 * How far the show-off rears: a PRANCE, not the duel's full cast rear. The
 * layout reserves the STANDING rig (`preview.RIG_BOX`, up 206), and the
 * painted chibi rig (2026-09-25) rears its horn to 252 at a full cast — 46
 * stage units into the name ribbon above her, horn and glow poking through
 * it in landscape. About half the rear keeps the horn under the ribbon and
 * still reads as "look at me"; reduced motion gets less again.
 */
const SHOW_REAR = 0.5
const SHOW_REAR_REDUCED = 0.3
const HST: PoseState = { cast: 0, hurt: 0, hp: 1, win: 0, lose: 0, form: 0 }
const FST: PoseState = { cast: 0, hurt: 0, hp: 1, win: 0, lose: 0, form: 0, foe: 0 }

let lastGen = -1
let lastPt = 0
let lastVt = 0
let driftAcc = 0

const crossed = (a: number, b: number, at: number): boolean => a < at && b >= at

/** New preview, or the clock went back (a QA hold behind it): start clean. */
const resetFrame = (): void => {
  clearFx()
  seed = 20260925
  lastPt = pv.pt
  lastVt = pv.vt
  driftAcc = 0
}

/** Thresholds the clock crossed since the last frame: the bursts. */
const beats = (L: PreviewLayout, a: number, b: number): void => {
  const u = L.u
  const s = L.scale
  if (crossed(a, b, HERO_LAND)) {
    burst(L.hero.x + RIG_MID * s, L.hero.y, 14, u * 0.25, u * 0.6, DAWN_COLS, LAND_SHAPES, u * 0.028, u * 0.7, u * 0.2, 2.4)
  }
  if (crossed(a, b, FOE_LAND)) {
    burst(L.foe.x - RIG_MID * s, L.foe.y, 14, u * 0.25, u * 0.6, NIGHT_COLS, LAND_SHAPES, u * 0.028, u * 0.7, u * 0.2, 2.4)
  }
  if (crossed(a, b, VS_AT)) {
    // The fanfare's hit: hearts, stars and confetti out of the emblem.
    burst(L.vs.x, L.vs.y, 44, u * 0.5, u * 1.35, ALL_COLS, SLAM_SHAPES, u * 0.03, u * 0.9, 0)
  }
  if (crossed(a, b, GO_AT)) {
    burst(L.vs.x, L.vs.y + L.vs.r + u * 0.045, 26, u * 0.35, u * 0.9, GO_COLS, GO_SHAPES, u * 0.03, u * 0.6, u * 0.25, 2.8)
  }
  if (crossed(a, b, SKIP_TO)) {
    // The exit: sparkles all along the seam as it blooms.
    const n = 12
    for (let i = 0; i < n; i++) {
      const t = (i / (n - 1) - 0.5) * (L.w + L.h) * 0.6
      burst(L.seam.x + L.seam.dx * t, L.seam.y + L.seam.dy * t, 3, u * 0.1, u * 0.35, EXIT_COLS, EXIT_SHAPES, u * 0.026, -u * 0.1, 0)
    }
  }
}

/** The ambient glitter: a slow drift of sparkles on each side, once both are in. */
const drift = (L: PreviewLayout, dt: number, pt: number): void => {
  if (pt < 0.6 || pt > SKIP_TO + 0.2) return
  driftAcc += dt * (reducedMotion.value ? 3 : 9)
  while (driftAcc >= 1) {
    driftAcc -= 1
    const hero = rnd() < 0.5
    const x = hero ? rnd() * L.seam.x : L.seam.x + rnd() * (L.w - L.seam.x)
    const y = L.portrait ? (hero ? L.seam.y + rnd() * (L.h - L.seam.y) : rnd() * L.seam.y) : L.h * (0.15 + 0.8 * rnd())
    const cols = hero ? DAWN_COLS : NIGHT_COLS
    spawn(x, y, (rnd() - 0.5) * L.u * 0.04, -L.u * (0.03 + 0.05 * rnd()), 1.6 + 1.4 * rnd(), L.u * (0.012 + 0.014 * rnd()),
      rnd() < 0.7 ? SPARK : DOT, cols[(rnd() * cols.length) | 0]!, 0)
  }
}

/* ─────────────────────────────────── drawing ──────────────────────────── */

/** The rays from the VS: soft wedges of light, slowly turning (tier ≥ 1). */
let rayGrad: CanvasGradient | null = null
let rayKey = -1
const RAYS = 14
const drawRays = (g: G2D, L: PreviewLayout, a: number, turn: number): void => {
  const R = Math.hypot(L.w, L.h)
  if (!rayGrad || rayKey !== R) {
    rayGrad = g.createRadialGradient(0, 0, L.vs.r * 0.6, 0, 0, R * 0.7)
    rayGrad.addColorStop(0, 'rgba(255,248,224,1)')
    rayGrad.addColorStop(0.35, 'rgba(255,236,196,0.45)')
    rayGrad.addColorStop(1, 'rgba(255,236,196,0)')
    rayKey = R
  }
  g.save()
  g.translate(L.vs.x, L.vs.y)
  g.rotate(turn)
  g.globalAlpha = a
  // SCREEN, not add: light over the night, and over the bright dawn a warm
  // lift rather than stripes burned to white.
  g.globalCompositeOperation = 'screen'
  g.beginPath()
  const half = (Math.PI / RAYS) * 0.42
  for (let i = 0; i < RAYS; i++) {
    const t = (i / RAYS) * TAU
    g.moveTo(0, 0)
    g.lineTo(Math.cos(t - half) * R, Math.sin(t - half) * R)
    g.lineTo(Math.cos(t + half) * R, Math.sin(t + half) * R)
    g.closePath()
  }
  g.fillStyle = rayGrad
  g.fill()
  g.restore()
}

/** The seam's light, live: `a` its alpha, `wide` its width in `u`; `add`
 *  lays it on additively (the exit's bloom), else as warm paint (the flash
 *  as the halves meet, which must stay gold rather than burn to white). */
const drawSeamLight = (g: G2D, L: PreviewLayout, a: number, wide: number, add = true): void => {
  const sp = seamStrip()
  if (!sp || a <= 0.01) return
  const len = L.w + L.h
  const bw = L.u * wide
  g.save()
  g.translate(L.seam.x, L.seam.y)
  g.rotate(Math.atan2(L.seam.dy, L.seam.dx))
  g.globalAlpha = Math.min(1, a)
  g.globalCompositeOperation = add ? 'lighter' : 'source-over'
  g.drawImage(sp, -len, -bw / 2, 2 * len, bw)
  g.restore()
}

/** One podium where it stands, painted if its painting has decoded, else its
 *  baked drawing; a soft halo under it either way (never in the painting). */
const drawPodiumAt = (g: G2D, cx: number, y: number, s: number, night: boolean, d: number): void => {
  const halo = glow(night ? GLOW_NIGHT : GLOW_DAWN)
  if (halo) {
    g.globalAlpha = 0.55
    g.drawImage(halo, cx - 130 * s, y - 34 * s, 260 * s, 110 * s)
    g.globalAlpha = 1
  }
  g.save()
  g.translate(cx, y)
  // The painting's spec takes px per `PODIUM_UNIT` stage units (`previewArt`).
  if (!drawItem(g, night ? PODIUM_ART.night : PODIUM_ART.dawn, s * PODIUM_UNIT)) {
    const k = Math.round(s * d * 100) / 100
    const cv = podSprite(night, k)
    if (cv) g.drawImage(cv, -POD_X * s, POD_Y0 * s, cv.width / d, cv.height / d)
    else drawPodium(g, s, night)
  }
  g.restore()
}

/** A duelist, `x` her hooves, at the layout's scale. */
const drawRig = (g: G2D, x: number, y: number, s: number, side: number, st: PoseState, t: number): void => {
  g.save()
  g.translate(x, y)
  g.scale(s, s)
  drawUnicorn(g, 0, 0, side, st, t)
  g.restore()
}

/** Everything that stands on one half: its podium (and, with it, the half's
 *  own sweep offset while the halves come in). */
const drawStage = (g: G2D, L: PreviewLayout, d: number, pt: number, vt: number): void => {
  const s = L.scale
  const reduced = reducedMotion.value
  const hs = reduced ? easeOutCubic((pt - 0.1) / 0.45) : heroIn(pt)
  const fs = reduced ? easeOutCubic((pt - 0.2) / 0.45) : foeIn(pt)
  const hop = reduced ? 0 : 14
  // Podiums ride in with their halves.
  const k = halvesIn(pt)
  const off = reduced ? 0 : (1 - k) * L.w
  drawPodiumAt(g, L.hero.x + RIG_MID * s - off, L.hero.y, s, false, d)
  drawPodiumAt(g, L.foe.x - RIG_MID * s + off, L.foe.y, s, true, d)
  // The duelists slide in from their own edges and hop onto their marks.
  // A gentle breathing glow at the horn — a twinkle, not a spell charging.
  // The show-off adds only a little: `chars.ts` draws `form` as a solid orb
  // at the horn's tip (alpha `form + rear·0.3`, radius `4 + 8·form`), and at
  // the duel's forming weight it read as a lollipop on a rearing rig at this
  // size. SHOW_FORM keeps it a glint.
  const breathe = 0.12 + 0.08 * Math.sin(vt * 2.2)
  HST.cast = showAt(pt, HERO_SHOW) * (reduced ? SHOW_REAR_REDUCED : SHOW_REAR)
  HST.form = Math.min(1, breathe + HST.cast * SHOW_FORM + exitK(pt) * 0.35)
  // What Aurora wears (the wardrobe, C17) she wears onto the podium too.
  Object.assign(HST, equippedHooks())
  FST.foe = pv.spec?.foe ?? 0
  FST.cast = showAt(pt, FOE_SHOW) * (reduced ? SHOW_REAR_REDUCED : SHOW_REAR)
  FST.form = Math.min(1, 0.12 + 0.08 * Math.sin(vt * 2.2 + 1.3) + FST.cast * SHOW_FORM + exitK(pt) * 0.35)
  if (hs > 0) {
    const from = -(RIG_BOX.x1 + 40) * s
    const x = from + (L.hero.x - from) * hs
    drawRig(g, x, L.hero.y - hopAt(pt, HERO_LAND) * hop * s, s, -1, HST, vt)
  }
  if (fs > 0) {
    const from = L.w + (RIG_BOX.x1 + 40) * s
    const x = from + (L.foe.x - from) * fs
    drawRig(g, x, L.foe.y - hopAt(pt, FOE_LAND) * hop * s, s, 1, FST, vt + 0.7)
  }
}

/** The VS's shockwave ring (0.90 → 1.40) and the flash disc at its heart. */
const drawShock = (g: G2D, L: PreviewLayout, pt: number): void => {
  const k = (pt - VS_AT) / 0.5
  if (k < 0 || k >= 1) return
  const r = L.vs.r * (1 + 2.6 * easeOutCubic(k))
  const a = (1 - k) ** 1.4
  const disc = glow(GLOW_WARM)
  if (disc && k < 0.5) {
    const dr = L.vs.r * (1.4 + 2 * k)
    g.globalAlpha = (1 - k * 2) * (reducedMotion.value ? 0.5 : 0.9)
    g.drawImage(disc, L.vs.x - dr * 1.6, L.vs.y - dr * 1.6, dr * 3.2, dr * 3.2)
  }
  g.globalAlpha = a
  g.lineWidth = L.u * (0.035 * (1 - k) + 0.006)
  g.strokeStyle = '#ffd76a'
  g.beginPath()
  g.arc(L.vs.x, L.vs.y, r, 0, TAU)
  g.stroke()
  g.lineWidth = L.u * (0.012 * (1 - k) + 0.003)
  g.strokeStyle = '#fffaf0'
  g.beginPath()
  g.arc(L.vs.x, L.vs.y, r * 0.93, 0, TAU)
  g.stroke()
  // A ring of little sparkles riding the wave.
  g.fillStyle = '#fff6d0'
  g.beginPath()
  for (let i = 0; i < 10; i++) {
    const t = (i / 10) * TAU + 0.3
    sparkle(g, L.vs.x + Math.cos(t) * r, L.vs.y + Math.sin(t) * r, L.u * 0.014 * (1 - k * 0.6))
  }
  g.fill()
  g.globalAlpha = 1
}

/** One half of the bake, clipped to its side of the seam and carried `off`
 *  px sideways — the sweep in. */
const sweptHalf = (g: G2D, bk: HTMLCanvasElement, L: PreviewLayout, off: number, hero: boolean): void => {
  g.save()
  g.translate(off, 0)
  halfPath(g, L.w, L.h, L.portrait, hero)
  g.clip()
  g.drawImage(bk, 0, 0, L.w, L.h)
  g.restore()
}

/* ─────────────────────────────── the warm-up ───────────────────────────── */

/**
 * THE DUELISTS' ONE-TIME BAKES, TAKEN BEFORE THEY ENTER. The first time a
 * look is drawn — a foe's palette over the painted pieces (`puppetBake.ts`),
 * a tinted part (`artTint.ts`) — it is baked once: measured on the built
 * bundle (2026-09-25) at 110–210 ms a rig on a desktop before the painted-rig
 * session made it cheaper, several times that on a weak phone. Left to the
 * first real draw, it landed in the ENTRANCE: the duelists slide in at pt
 * 0.1–0.65, under the fanfare's build-up, and they hitched there. The bakes
 * are keyed by piece and look, never by size, so drawing each rig once onto a
 * 4 px scratch surface fills the very cache the stage then blits from.
 *
 * One rig per frame, in the frames before they enter (`pt` < `HERO_IN`, the
 * page turn into the preview), so each bake is one frame, never two stacked
 * into one. Usually there is nothing left to bake: `preview.warmDuelists`
 * bakes both looks in idle slices while the dialogue or the map is up. A rig
 * painting that decodes meanwhile asks for another pass; a warm rig redraws
 * from the cache, which costs nothing worth measuring.
 */
let warmCv: HTMLCanvasElement | null = null
let warmGen = -1
let warmed = 0
onArtChanged((c) => {
  if (!c || c.kind === 'rig') warmed = 0
})
/** When the hero starts to slide in (`preview.heroIn`): the warm-up's window. */
const HERO_IN = 0.1
/** One rig's off-screen draw. */
const warmStep = (vt: number): void => {
  if (warmGen !== pv.gen) {
    warmGen = pv.gen
    warmed = 0
  }
  if (warmed >= 2 || typeof document === 'undefined') return
  if (!warmCv) {
    warmCv = document.createElement('canvas')
    warmCv.width = warmCv.height = 4
  }
  const c = warmCv.getContext('2d')
  if (!c) return
  c.setTransform(0.01, 0, 0, 0.01, 2, 2)
  if (warmed === 0) {
    // The same look the stage will draw: her wardrobe decides her colours.
    Object.assign(HST, equippedHooks())
    drawUnicorn(c, 0, 0, -1, HST, vt)
  } else {
    FST.foe = pv.spec?.foe ?? 0
    drawUnicorn(c, 0, 0, 1, FST, vt)
  }
  warmed++
}

/**
 * The preview's frame, in device pixels (the frame loop's `drawPreview(g)`).
 * Also steps the glitter by the picture's own clock, so a paused or held
 * frame is a frozen one.
 */
export const drawPreview = (g: G2D): void => {
  const L = pv.lay
  const d = S.dpr || 1
  const pt = pv.pt
  const vt = pv.vt
  const reduced = reducedMotion.value
  if (pv.gen !== lastGen || pt < lastPt - 1e-6) {
    lastGen = pv.gen
    resetFrame()
  }
  const dv = Math.max(0, Math.min(0.1, vt - lastVt))
  beats(L, lastPt, pt)
  drift(L, dv, pt)
  stepFx(dv)
  lastPt = pt
  lastVt = vt

  const bk = ensureBake(L, d, pv.spec?.foeSide.tint ?? '')
  // Before they enter: the duelists' bakes, one rig a frame (above).
  if (pv.pt < HERO_IN) warmStep(vt)
  // The exit zooms the whole composition about the VS; the slam shakes it.
  const z = zoomAt(pt)
  const sh = shakeAt(pt, reduced)
  const tx = L.vs.x * (1 - z) + sh
  const ty = L.vs.y * (1 - z) + sh * 0.5
  g.setTransform(d * z, 0, 0, d * z, d * tx, d * ty)
  g.globalAlpha = 1
  g.globalCompositeOperation = 'source-over'

  // 1 · the halves: swept in from the sides over paper, then one blit.
  const k = halvesIn(pt)
  if (k < 1 || !bk) {
    g.fillStyle = PAPER
    g.fillRect(-L.w, -L.h, L.w * 3, L.h * 3)
  }
  if (bk) {
    if (k >= 1) g.drawImage(bk, 0, 0, L.w, L.h)
    else if (reduced) {
      g.globalAlpha = k
      g.drawImage(bk, 0, 0, L.w, L.h)
      g.globalAlpha = 1
    } else {
      const off = (1 - k) * L.w
      sweptHalf(g, bk, L, -off, true)
      sweptHalf(g, bk, L, off, false)
    }
  }
  // 2 · the seam flashes gold as the halves meet.
  const fk = (pt - 0.12) / 0.6
  if (fk > 0 && fk < 1) drawSeamLight(g, L, Math.sin(Math.PI * fk) * (reduced ? 0.45 : 0.85), 0.06 + 0.12 * fk, false)
  // 3 · the rays, once the VS is down (tier ≥ 1).
  if (S.q >= 1 && pt > VS_AT) {
    const ra = Math.min(1, (pt - VS_AT) / 0.35) * (0.42 + 0.4 * exitK(pt))
    drawRays(g, L, ra, reduced ? 0.2 : 0.2 + vt * 0.07)
  }
  // 4 · the podiums and the duelists.
  drawStage(g, L, d, pt, vt)
  // 5 · the glitter, the VS's shockwave.
  drawFx(g)
  drawShock(g, L, pt)
  // 6 · the exit: the seam blooms into warm light and the light fills the page
  //     (the DOM's cream-gold flash rises over all of it).
  const ek = exitK(pt)
  if (ek > 0) {
    drawSeamLight(g, L, 0.5 + 0.5 * ek, 0.12 + 1.4 * ek * ek)
    const disc = glow(GLOW_WARM)
    if (disc) {
      const R = Math.hypot(L.w, L.h) * (0.3 + 0.7 * ek)
      g.globalAlpha = ek * (reduced ? 0.4 : 0.65)
      g.globalCompositeOperation = 'lighter'
      g.drawImage(disc, L.vs.x - R, L.vs.y - R, R * 2, R * 2)
      g.globalCompositeOperation = 'source-over'
      g.globalAlpha = 1
    }
  }
  g.setTransform(1, 0, 0, 1, 0, 0)
}

/** Let the big canvases go (the preview is over and its flash has faded). */
export const releasePreviewCanvas = (): void => {
  bake = null
  kW = kH = kD = 0
  kImg = null
  pods.dawn.cv = pods.night.cv = null
  rayGrad = null
  clearFx()
}

/** Test / QA seam: how many glitter particles are alive, and the cap. */
export const __previewFx = (): { live: number; cap: number } => ({ live, cap: budget() })
