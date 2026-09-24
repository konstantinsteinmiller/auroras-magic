/**
 * kitBay.ts — Bubble Bay's painters (chapter 2): sea, sand, rocks, palms,
 * shells, coral, boats, the lighthouse, the beach hut, the jetty; the bay's
 * live props; and its two creatures — the sea-unicorn foal (the tap
 * creature, story-spec §8.8) and the Singing Shell (the chapter's rescue).
 *
 * Same rules as `kit.ts` (art-style §2–§5): flat cel fills, one plum outline
 * on mid- and foreground shapes, gradients only in sky, water and glows, far
 * layers lighter, bluer and unoutlined. Base tones clear the candy floor
 * (saturation ≥ 70 %, lightness 55–75 %).
 */
import { SEC_W, SEC_H } from '@/game/restore/mask'
import { seeded, TAU, PI, sin, cos, clamp } from '@/game/duel/util'
import { type G2D, type Pot, INK, C, ink, fill, lumpy, twinkleAt, bubbleAt, flagAt, puffAt } from '@/game/map/kit'
import { tapCover } from '@/game/map/tapCover'
import { drawItem, type ItemSpec } from '@/game/artItem'
import { CREATURE_ART, PROP_ART } from '@/game/artIds'
import { NOTE_ART } from '@/game/map/kitFestival'

export type Pt = readonly [number, number]
type Lobe = readonly [number, number, number]

export const BAY = {
  seaFar: '#a8eef7',
  seaMid: '#62d8ee',
  sea: '#3fcfe6',
  seaDeep: '#27b4dc',
  seaLite: '#c4f6ff',
  isle: '#b3dcf3',
  sand: '#ffd373',
  sandShade: '#f5b458',
  sandWet: '#f7c264',
  castle: '#f9bf5e',
  rock: '#a390ee',
  rockShade: '#8472d8',
  rockLite: '#e2dbff',
  weed: '#4fe08a',
  weedShade: '#2fb87a',
  trunk: '#e8ad6e',
  trunkShade: '#c78652',
  plank: '#e6a46c',
  plankShade: '#bf7f52',
  wall: '#fffaf0',
  wallShade: '#f0dcd0',
  crab: '#ff7a59',
  shell: '#ff7fbf',
  shellLite: '#ffc0dc',
  coralPink: '#ff7fbf',
  coralPinkShade: '#e05aa0',
  coralOrange: '#ffa45c',
  coralOrangeShade: '#e8823a',
  coralLilac: '#a77cff',
  coralLilacShade: '#8558e8',
  coat: '#ffd9ec',
  coatShade: '#f5b5d6',
  muzzle: '#fff0f7',
  mane: '#62e6da',
  maneLilac: '#b99cff',
  horn: '#ffe08a',
  hornBand: '#f5b94f',
  iris: '#7a4fd1',
  blush: '#ff9eb5',
  pearl: '#fff6fb',
  pearlShade: '#e6cdf5',
  glass: '#c2f0ff',
  lamp: '#fff1a8'
}

/* ---------------------------------------------------------------- helpers */

/** A smooth open curve through `pts` (midpoint quadratics, as `brook`). */
export const curve = (g: G2D, pts: readonly Pt[], move = true): void => {
  if (move) g.moveTo(...pts[0]!)
  else g.lineTo(...pts[0]!)
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1]!
    const [bx, by] = pts[i]!
    g.quadraticCurveTo(ax, ay, (ax + bx) / 2, (ay + by) / 2)
  }
  g.lineTo(...pts[pts.length - 1]!)
}

/** `n` + 1 points along a cubic Bézier, from parameter u0 to u1. */
export const cubicPts = (p0: Pt, p1: Pt, p2: Pt, p3: Pt, u0: number, u1: number, n: number): Pt[] => {
  const out: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const u = u0 + ((u1 - u0) * i) / n
    const v = 1 - u
    out.push([
      v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0],
      v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1]
    ])
  }
  return out
}

/** Stroke the current path as a thick outlined band: plum under, colour on top. */
const band = (g: G2D, w: number, col: string, edge = 5): void => {
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.lineWidth = w + edge * 2
  g.strokeStyle = INK
  g.stroke()
  g.lineWidth = w
  g.strokeStyle = col
  g.stroke()
}

const ease = (k: number): number => {
  const u = clamp(k, 0, 1) - 1
  return 1 + 2.4 * u * u * u + 1.4 * u * u
}

/* ---------------------------------------------------------------- the sea */

/** The open sea from the horizon `y` down: lighter toward the horizon, no
 *  outline (a far layer), a few baked glints. */
export const sea = (g: G2D, y: number, seed: number): void => {
  const gr = g.createLinearGradient(0, y, 0, SEC_H)
  gr.addColorStop(0, BAY.seaFar)
  gr.addColorStop(0.3, BAY.seaMid)
  gr.addColorStop(1, BAY.seaDeep)
  g.fillStyle = gr
  g.fillRect(0, y, SEC_W, SEC_H - y)
  g.fillStyle = 'rgba(255,255,255,0.75)'
  g.fillRect(0, y - 1, SEC_W, 3)
  const r = seeded(seed)
  g.beginPath()
  for (let i = 0; i < 26; i++) {
    const k = r() ** 1.3
    const yy = y + 12 + k * (SEC_H - y - 12)
    const x = r() * SEC_W
    const w = 8 + k * 34
    g.moveTo(x - w, yy)
    g.quadraticCurveTo(x, yy - 4 - k * 4, x + w, yy)
  }
  g.lineWidth = 3
  g.lineCap = 'round'
  g.strokeStyle = 'rgba(255,255,255,0.55)'
  g.stroke()
}

/** Far islands on the horizon: [x, width, height] — unoutlined, pale. */
export const farIsles = (g: G2D, horizon: number, list: readonly Lobe[]): void => {
  g.beginPath()
  for (const [x, w, h] of list) {
    g.moveTo(x - w / 2, horizon + 1)
    g.bezierCurveTo(x - w * 0.36, horizon - h * 1.05, x + w * 0.18, horizon - h * 1.2, x + w / 2, horizon + 1)
    g.closePath()
  }
  fill(g, BAY.isle)
}

/** A sandy shore below the curve through `top` (run it past both page
 *  edges), outlined along the waterline, with a wet band and speckle. */
export const shore = (g: G2D, top: readonly Pt[], seed: number, col = BAY.sand): void => {
  const area = (): void => {
    g.beginPath()
    curve(g, top)
    g.lineTo(top[top.length - 1]![0], SEC_H + 20)
    g.lineTo(top[0]![0], SEC_H + 20)
    g.closePath()
  }
  area()
  fill(g, col)
  g.save()
  area()
  g.clip()
  g.beginPath()
  curve(g, top.map(([x, y]) => [x, y + 15] as const))
  g.lineWidth = 18
  g.strokeStyle = BAY.sandWet
  g.stroke()
  const r = seeded(seed)
  const y0 = Math.min(...top.map((p) => p[1]))
  g.beginPath()
  for (let i = 0; i < 44; i++) {
    const x = r() * SEC_W
    const y = y0 + 34 + r() * (SEC_H - y0 - 34)
    g.moveTo(x + 5, y)
    g.ellipse(x, y, 5, 3, 0, 0, TAU)
  }
  fill(g, BAY.sandShade)
  g.beginPath()
  for (let i = 0; i < 9; i++) {
    const x = r() * SEC_W
    const y = y0 + 50 + r() * (SEC_H - y0 - 50)
    const w = 18 + r() * 24
    g.moveTo(x - w, y)
    g.quadraticCurveTo(x, y - 8, x + w, y)
  }
  g.lineWidth = 3
  g.strokeStyle = BAY.sandShade
  g.stroke()
  g.restore()
  g.beginPath()
  curve(g, top)
  ink(g)
}

/** Points along the smooth curve `curve()` draws through `pts` (cached). */
const sampled = new WeakMap<readonly Pt[], Pt[]>()
export const samplesOf = (pts: readonly Pt[]): readonly Pt[] => {
  const hit = sampled.get(pts)
  if (hit) return hit
  const out: Pt[] = [pts[0]!]
  const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  out.push(mid(pts[0]!, pts[1]!))
  for (let i = 1; i < pts.length - 1; i++) {
    const a = mid(pts[i - 1]!, pts[i]!)
    const c = pts[i]!
    const b = mid(pts[i]!, pts[i + 1]!)
    for (let j = 1; j <= 10; j++) {
      const u = j / 10
      out.push([
        (1 - u) ** 2 * a[0] + 2 * (1 - u) * u * c[0] + u * u * b[0],
        (1 - u) ** 2 * a[1] + 2 * (1 - u) * u * c[1] + u * u * b[1]
      ])
    }
  }
  out.push(pts[pts.length - 1]!)
  sampled.set(pts, out)
  return out
}

/**
 * The wash lapping a shore — a live prop: a thin sheet of foam slides up the
 * sand and back, its front a soft wavy line. `spans` limits it to the open
 * stretches of beach (nothing painted stands in front of it there); it
 * tapers to nothing at each span's ends.
 */
export const lap = (
  g: G2D, top: readonly Pt[], t: number, alive: number, spans: readonly (readonly [number, number])[] = [[-1e4, 1e4]]
): void => {
  const s = samplesOf(top)
  const d = 7 + (alive > 0 ? (1 - cos(t * 1.1)) * 8 * alive : 0)
  const ph = alive > 0 ? t * 1.4 : 0
  const front = (i: number, a: number, b: number): number => {
    const x = s[i]![0]
    const k = clamp(Math.min((x - a) / 60, (b - x) / 60), 0, 1)
    return s[i]![1] + 3 + (d - 3 + sin(x * 0.05 + ph) * 3) * k
  }
  g.lineWidth = 4
  g.lineJoin = 'round'
  g.lineCap = 'round'
  g.strokeStyle = '#ffffff'
  for (const [a, b] of spans) {
    let i0 = -1
    let i1 = -1
    for (let i = 0; i < s.length; i++) {
      const x = s[i]![0]
      if (x < a || x > b) continue
      if (i0 < 0) i0 = i
      i1 = i
    }
    if (i0 < 0 || i1 <= i0) continue
    g.beginPath()
    for (let i = i0; i <= i1; i++) g.lineTo(s[i]![0], s[i]![1] + 3)
    for (let i = i1; i >= i0; i--) g.lineTo(s[i]![0], front(i, a, b))
    g.closePath()
    g.globalAlpha = 0.7
    fill(g, '#e4fbff')
    g.globalAlpha = 1
    g.beginPath()
    for (let i = i0; i <= i1; i++) g.lineTo(s[i]![0], front(i, a, b))
    g.stroke()
  }
}

const FOAM_R = [1, 1.3, 0.85, 1.15, 0.95, 1.25]
const FOAM_Y = [0, -0.35, 0.12, -0.22, 0.18, -0.1]
/** A soft lumpy foam collar at a waterline, `w` wide, centred on (x, y). */
export const foam = (g: G2D, x: number, y: number, w: number): void => {
  lumpy(g, foamLobes(x, y, w), '#ffffff', Math.min(3.5, 1.5 + w / 80))
}

/** The lobes a `w`-wide band of foam centred on (x, y) is made of. */
const foamLobes = (x: number, y: number, w: number): Lobe[] => {
  const r0 = clamp(w / 15, 4.5, 10)
  const n = Math.max(3, Math.round(w / (r0 * 1.5)))
  const lobes: Lobe[] = []
  for (let i = 0; i <= n; i++) {
    const r = r0 * FOAM_R[i % 6]! * (i === 0 || i === n ? 0.75 : 1)
    lobes.push([x - w / 2 + (i / n) * w, y + FOAM_Y[i % 6]! * r0, r])
  }
  return lobes
}

/**
 * A LIVE band of foam — the buoy's collar, drawn every frame in `props()` —
 * as the shared painted puff, white, one per lobe of `foam`'s own layout and
 * a little fuller so the lobes run together. False, with nothing drawn, when
 * the puff has not landed: the caller draws `foam`. (The foam in a sector's
 * `paint()` is in its painting; this is only for foam the props lay live.)
 */
const foamPuffs = (g: G2D, x: number, y: number, w: number): boolean => {
  for (const [lx, ly, r] of foamLobes(x, y, w)) if (!puffAt(g, lx, ly, r * 1.3, '#ffffff')) return false
  return true
}

/* ---------------------------------------------------------------- rocks */

/**
 * Paint a rock mass whose outline `path` builds: base lilac, a cel shade
 * band on the side away from the top-left light (the silhouette shifted
 * toward the light, laid back over a shade fill), a few stone seams, an
 * optional grass "icing" along `cap`, then the one plum outline.
 */
export const rockMass = (
  g: G2D, path: () => void, box: readonly [number, number, number, number], seed: number,
  shift: Pt = [26, 18], cap?: readonly Pt[], seams = 1
): void => {
  const [bx, by, bw, bh] = box
  path()
  fill(g, BAY.rockShade)
  g.save()
  path()
  g.clip()
  g.save()
  g.translate(-shift[0], -shift[1])
  path()
  fill(g, BAY.rock)
  g.restore()
  const r = seeded(seed)
  const n = Math.round(((bw * bh) / 9000) * seams)
  g.beginPath()
  const lites: number[] = []
  for (let i = 0; i < n; i++) {
    const x = bx + r() * bw
    const y = by + r() * bh
    const rx = 22 + r() * 26
    const ry = rx * (0.45 + r() * 0.2)
    g.moveTo(x + cos(0.12 * PI) * rx, y + sin(0.12 * PI) * ry)
    g.ellipse(x, y, rx, ry, 0, 0.12 * PI, 0.88 * PI)
    lites.push(x, y, rx, ry)
  }
  g.lineWidth = 4
  g.lineCap = 'round'
  g.strokeStyle = BAY.rockShade
  g.stroke()
  g.beginPath()
  for (let i = 0; i < lites.length; i += 8) {
    const x = lites[i]!
    const y = lites[i + 1]!
    const rx = lites[i + 2]!
    const ry = lites[i + 3]!
    g.moveTo(x + cos(1.2 * PI) * rx * 0.6, y - ry * 0.2 + sin(1.2 * PI) * ry * 0.6)
    g.ellipse(x, y - ry * 0.2, rx * 0.6, ry * 0.6, 0, 1.2 * PI, 1.55 * PI)
  }
  g.strokeStyle = BAY.rockLite
  g.stroke()
  if (cap) {
    const lobes: Lobe[] = []
    for (let i = 0; i < cap.length - 1; i++) {
      const [ax, ay] = cap[i]!
      const [ex, ey] = cap[i + 1]!
      const steps = Math.max(1, Math.round(Math.hypot(ex - ax, ey - ay) / 24))
      for (let j = 0; j < steps; j++) {
        const u = j / steps
        lobes.push([ax + (ex - ax) * u, ay + (ey - ay) * u + 6, 15 + ((i + j) % 3) * 3])
      }
    }
    lumpy(g, lobes, C.moss, 4)
    g.beginPath()
    for (let i = 0; i < lobes.length; i += 2) {
      const [x, y, rr] = lobes[i]!
      g.moveTo(x - rr * 0.2 + rr * 0.35, y - rr * 0.35)
      g.ellipse(x - rr * 0.2, y - rr * 0.35, rr * 0.35, rr * 0.18, -0.4, 0, TAU)
    }
    fill(g, C.mossLip)
  }
  g.restore()
  path()
  ink(g)
}

/** A rounded boulder standing on (x, y), w × h; `flip` mirrors its bump. */
export const boulder = (g: G2D, x: number, y: number, w: number, h: number, flip = 1): void => {
  const X = (u: number): number => x + u * w * flip
  const Y = (v: number): number => y - v * h
  const path = (): void => {
    g.beginPath()
    g.moveTo(X(-0.5), Y(0))
    g.bezierCurveTo(X(-0.56), Y(0.55), X(-0.36), Y(1.02), X(-0.06), Y(1))
    g.bezierCurveTo(X(0.12), Y(0.99), X(0.2), Y(0.86), X(0.28), Y(0.8))
    g.bezierCurveTo(X(0.48), Y(0.74), X(0.55), Y(0.34), X(0.5), Y(0))
    g.closePath()
  }
  rockMass(g, path, [x - w / 2, y - h, w, h], Math.round(x + y), [w * 0.14, h * 0.16], undefined, 1.6)
}

/** A lilac cliff mass: the closed outline `pts`, a grass cap along `cap`. */
export const cliff = (g: G2D, pts: readonly Pt[], seed: number, cap?: readonly Pt[]): void => {
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const x0 = Math.min(...xs)
  const y0 = Math.min(...ys)
  rockMass(
    g,
    () => {
      g.beginPath()
      curve(g, pts)
      g.closePath()
    },
    [x0, y0 + 30, Math.max(...xs) - x0, Math.max(...ys) - y0 - 30],
    seed,
    [34, 22],
    cap
  )
}

/* ---------------------------------------------------------------- flora */

/** A leaning palm standing on (x, y), scale `s`, `lean` −1..1. */
export const palm = (g: G2D, x: number, y: number, s: number, lean: number): void => {
  const tx = x + lean * 70 * s
  const ty = y - 220 * s
  const mx = x + lean * 6 * s
  const my = y - 120 * s
  g.beginPath()
  g.moveTo(x - 16 * s, y)
  g.quadraticCurveTo(mx - 12 * s, my, tx - 8 * s, ty)
  g.lineTo(tx + 8 * s, ty)
  g.quadraticCurveTo(mx + 12 * s, my, x + 16 * s, y)
  g.closePath()
  fill(g, BAY.trunk)
  ink(g)
  g.beginPath()
  for (let i = 1; i < 7; i++) {
    const u = i / 7
    const px = (1 - u) ** 2 * x + 2 * (1 - u) * u * mx + u * u * tx
    const py = (1 - u) ** 2 * y + 2 * (1 - u) * u * my + u * u * ty
    const hw = (15 - 7 * u) * s
    g.moveTo(px - hw + 2, py)
    g.quadraticCurveTo(px, py + 7 * s, px + hw - 2, py)
  }
  ink(g, 2.4)
  const fronds: readonly Pt[] = [[-2.95, 0.95], [-2.35, 1.05], [-1.8, 0.85], [-1.25, 0.9], [-0.6, 1.05], [0.05, 0.9]]
  for (const [a0, L] of fronds) {
    const a = a0 + lean * 0.12
    const len = 118 * s * L
    const px = tx + cos(a) * len * 0.62
    const py = ty + sin(a) * len * 0.62
    const ex = tx + cos(a) * len
    const ey = ty + sin(a) * len * 0.45 + len * 0.36
    const dx = ex - tx
    const dy = ey - ty
    const d = Math.hypot(dx, dy) || 1
    const nx = (-dy / d) * 24 * s * L
    const ny = (dx / d) * 24 * s * L
    const side = cos(a) < 0 ? -1 : 1
    g.beginPath()
    g.moveTo(tx, ty)
    g.quadraticCurveTo(px - nx * side, py - ny * side, ex, ey)
    g.quadraticCurveTo(px + nx * 0.4 * side, py + ny * 0.4 * side, tx, ty)
    fill(g, C.canopy)
    ink(g, 4)
    g.beginPath()
    g.moveTo(tx, ty)
    g.quadraticCurveTo(px, py, ex, ey)
    g.lineWidth = 3
    g.strokeStyle = C.canopyShade
    g.stroke()
  }
  g.beginPath()
  for (const [dx, dy] of [[-11, 10], [9, 12], [-1, 22]] as const) {
    g.moveTo(tx + dx * s + 10 * s, ty + dy * s)
    g.arc(tx + dx * s, ty + dy * s, 10 * s, 0, TAU)
  }
  fill(g, BAY.trunkShade)
  ink(g, 3)
}

/** Dune-grass tufts: [x, y, scale]. */
export const duneGrass = (g: G2D, list: readonly Lobe[]): void => {
  g.beginPath()
  for (const [x, y, s] of list) {
    for (let i = -2; i <= 2; i++) {
      const h = (34 - Math.abs(i) * 7) * s
      const bx = x + i * 7 * s
      g.moveTo(bx - 5 * s, y)
      g.quadraticCurveTo(bx + i * 2 * s, y - h * 0.6, bx + i * 7 * s, y - h)
      g.quadraticCurveTo(bx + i * 2 * s + 3 * s, y - h * 0.5, bx + 5 * s, y)
    }
  }
  fill(g, C.moss)
  ink(g, 3)
}

/** The canonical blade's width and height in SU: the proportions the
 *  reference is drawn at, and the units the clump's affine is built in. */
const KELP_W = 10.5
const KELP_H = 60

/**
 * ONE kelp blade, rooted at the origin and reaching 1 unit straight UP,
 * bowed out to one side — the blade, its plum edge and nothing else.
 */
const kelpShape = (g: G2D): void => {
  const X = (v: number): number => v / KELP_H
  g.beginPath()
  g.moveTo(X(-3), 0)
  g.bezierCurveTo(X(-KELP_W - 6), -0.35, X(KELP_W), -0.65, 0, -1)
  g.bezierCurveTo(X(KELP_W + 12), -0.62, X(KELP_W + 2), -0.3, X(5), 0)
  g.closePath()
  fill(g, BAY.weed)
  ink(g, 3 / KELP_H)
}

/**
 * A kelp blade as a painted still — the flattest vectors left standing on the
 * cove and the lagoon, and the ones the owner's screenshots show hardest
 * against the water.
 *
 * §4b kept kelp for one line — "each blade BENDS as it sways" — and a bend is
 * a SHEAR, which is half of what the palm crown already taught this family. So
 * one blade serves all seven: the clump sets its height, its width and the
 * lean of its tip, and the drawing's own affine carries the painting onto
 * them. The blade count and the height differ per call site because they are
 * per BLADE, which is why the sheet is a blade and not a clump.
 */
export const KELP_ART: ItemSpec = {
  ...PROP_ART.kelp, frames: 1,
  draw: (g, s) => {
    g.save()
    g.scale(s, s)
    kelpShape(g)
    g.restore()
  }
}

/** A clump of kelp at (x, y), `h` tall, swayed by `sway` SU — a live prop. */
export const kelp = (g: G2D, x: number, y: number, h: number, sway: number, n = 3): void => {
  let painted = false
  g.beginPath()
  for (let i = 0; i < n; i++) {
    const bx = x + (i - (n - 1) / 2) * 16
    const hh = h * (0.72 + 0.16 * ((i * 2) % 3))
    const sw = sway * (0.8 + i * 0.3) + (i - (n - 1) / 2) * 10
    const w = 9 + (i % 2) * 3
    // The blade under the affine that roots it here, stands it `hh` tall and
    // leans its tip `sw` over: the sway rides in the shear column, so a
    // painted blade bends exactly as far as the drawn one did at its tip.
    g.save()
    g.translate(bx, y)
    g.transform((KELP_H * w) / KELP_W, 0, -sw, hh, 0, 0)
    painted = drawItem(g, KELP_ART, 1)
    g.restore()
    if (painted) continue
    // A wavy blade: up one edge, down the other.
    g.moveTo(bx - 3, y)
    g.bezierCurveTo(bx - w - 6, y - hh * 0.35, bx + sw * 0.5 + w, y - hh * 0.65, bx + sw, y - hh)
    g.bezierCurveTo(bx + sw * 0.5 + w + 12, y - hh * 0.62, bx + w + 2, y - hh * 0.3, bx + 5, y)
    g.closePath()
  }
  if (painted) return
  fill(g, BAY.weed)
  ink(g, 3)
}

/* ---------------------------------------------------------- beach bits */

/** A five-armed starfish, rounded, lying on (x, y). */
export const starfish = (g: G2D, x: number, y: number, r: number, rot: number, col = BAY.coralOrange): void => {
  const tip = (i: number): Pt => {
    const a = rot + (i * TAU) / 5 - PI / 2
    return [x + cos(a) * r, y + sin(a) * r * 0.8]
  }
  g.beginPath()
  g.moveTo(...tip(0))
  for (let i = 0; i < 5; i++) {
    const a = rot + ((i + 0.5) * TAU) / 5 - PI / 2
    g.quadraticCurveTo(x + cos(a) * r * 0.2, y + sin(a) * r * 0.16, ...tip(i + 1))
  }
  g.closePath()
  fill(g, col)
  ink(g, 3)
  g.beginPath()
  for (let i = 0; i < 5; i++) {
    const [tx, ty] = tip(i)
    const px = x + (tx - x) * 0.5
    const py = y + (ty - y) * 0.5
    g.moveTo(px + 2.6, py)
    g.arc(px, py, 2.6, 0, TAU)
  }
  fill(g, '#ffe3c2')
}

/** A scallop shell: hinge at (x, y), fan `r`, turned `rot`. */
export const scallop = (g: G2D, x: number, y: number, r: number, rot: number, col = BAY.shell, lite = BAY.shellLite): void => {
  g.save()
  g.translate(x, y)
  g.rotate(rot)
  const n = 5
  const a0 = -PI + 0.5
  const a1 = -0.5
  const path = (): void => {
    g.beginPath()
    g.moveTo(0, 0)
    g.lineTo(cos(a0) * r * 0.92, sin(a0) * r * 0.92)
    for (let i = 0; i < n; i++) {
      const am = a0 + ((i + 0.5) / n) * (a1 - a0)
      const ae = a0 + ((i + 1) / n) * (a1 - a0)
      g.quadraticCurveTo(cos(am) * r * 1.16, sin(am) * r * 1.16, cos(ae) * r * 0.92, sin(ae) * r * 0.92)
    }
    g.closePath()
  }
  path()
  fill(g, col)
  g.beginPath()
  for (let i = 1; i < n; i++) {
    const a = a0 + (i / n) * (a1 - a0)
    g.moveTo(cos(a) * r * 0.2, sin(a) * r * 0.2)
    g.lineTo(cos(a) * r * 0.86, sin(a) * r * 0.86)
  }
  g.lineWidth = 2.2
  g.strokeStyle = lite
  g.stroke()
  path()
  ink(g, 3)
  g.beginPath()
  g.roundRect(-r * 0.26, -r * 0.1, r * 0.52, r * 0.2, 3)
  fill(g, col)
  ink(g, 2.4)
  g.restore()
}

/** Scatter scallops and starfish over a band, skipping `avoid` boxes. */
export const shells = (
  g: G2D, seed: number, n: number, y0: number, y1: number,
  avoid: readonly (readonly [number, number, number, number])[] = []
): void => {
  const r = seeded(seed)
  const cols = [BAY.shell, '#ffd34d', BAY.coralLilac, '#ffffff']
  for (let i = 0; i < n; i++) {
    const x = 30 + r() * (SEC_W - 60)
    const y = y0 + r() * (y1 - y0)
    const size = 11 + r() * 6
    const rot = (r() - 0.5) * 1.4
    if (avoid.some(([ax, ay, aw, ah]) => x > ax && x < ax + aw && y > ay && y < ay + ah)) continue
    if (i % 3 === 2) starfish(g, x, y, size * 1.2, rot, i % 2 ? BAY.coralOrange : BAY.coralPink)
    else scallop(g, x, y, size, rot, cols[i % 4]!, i % 4 === 3 ? BAY.shellLite : '#ffffff')
  }
}

/** A branching coral bush rooted at (x, y) — thick rounded fingers. */
export const branchCoral = (
  g: G2D, x: number, y: number, s: number, col: string, shade: string, seed: number, lite?: string
): void => {
  const r = seeded(seed)
  const segs: number[][] = []
  const grow = (x0: number, y0: number, a: number, len: number, d: number): void => {
    const x1 = x0 + cos(a) * len
    const y1 = y0 + sin(a) * len
    const bend = (r() - 0.5) * 0.6
    const cx = (x0 + x1) / 2 + cos(a + PI / 2) * len * bend
    const cy = (y0 + y1) / 2 + sin(a + PI / 2) * len * bend
    segs.push([x0, y0, cx, cy, x1, y1, (12 + d * 6) * s])
    if (d <= 0) return
    grow(x1, y1, a - 0.5 - r() * 0.3, len * 0.74, d - 1)
    grow(x1, y1, a + 0.5 + r() * 0.3, len * 0.74, d - 1)
    if (d === 2) grow(x1, y1, a + (r() - 0.5) * 0.3, len * 0.8, d - 2)
  }
  grow(x, y, -PI / 2, 62 * s, 2)
  const stroke = (col2: string, extra: number, dx = 0, dy = 0, k = 1): void => {
    g.lineCap = 'round'
    g.strokeStyle = col2
    for (const [x0, y0, cx, cy, x1, y1, w] of segs) {
      g.beginPath()
      g.moveTo(x0! + dx, y0! + dy)
      g.quadraticCurveTo(cx! + dx, cy! + dy, x1! + dx, y1! + dy)
      g.lineWidth = w! * k + extra
      g.stroke()
    }
  }
  stroke(INK, 10)
  stroke(col, 0)
  stroke(shade, 0, 4 * s, 2 * s, 0.35)
  if (lite) stroke(lite, 0, -4 * s, -1 * s, 0.2)
}

/** A sea fan: lumpy lobes on a short stem, veined. */
export const fanCoral = (g: G2D, x: number, y: number, s: number, col: string, shade: string): void => {
  const lobes: Lobe[] = [[x, y - 70 * s, 46 * s]]
  for (let i = 0; i < 7; i++) {
    const a = -PI + 0.3 + (i * (PI - 0.6)) / 6
    lobes.push([x + cos(a) * 64 * s, y - 40 * s + sin(a) * 70 * s, 22 * s])
  }
  lumpy(g, lobes, col, 4)
  g.beginPath()
  for (let i = 0; i < 7; i++) {
    const a = -PI + 0.3 + (i * (PI - 0.6)) / 6
    g.moveTo(x, y - 12 * s)
    g.quadraticCurveTo(x + cos(a) * 30 * s, y - 30 * s + sin(a) * 40 * s, x + cos(a) * 62 * s, y - 40 * s + sin(a) * 68 * s)
  }
  g.lineWidth = 3
  g.lineCap = 'round'
  g.strokeStyle = shade
  g.stroke()
  g.beginPath()
  g.roundRect(x - 7 * s, y - 16 * s, 14 * s, 18 * s, 4)
  fill(g, shade)
  ink(g, 3)
}

/** A brain-coral dome on (x, y), w × h, with wiggly grooves. */
export const brainCoral = (g: G2D, x: number, y: number, w: number, h: number, col: string, shade: string): void => {
  const path = (): void => {
    g.beginPath()
    g.moveTo(x - w / 2, y)
    g.bezierCurveTo(x - w / 2, y - h * 1.32, x + w / 2, y - h * 1.32, x + w / 2, y)
    g.closePath()
  }
  path()
  fill(g, col)
  g.save()
  path()
  g.clip()
  g.beginPath()
  g.ellipse(x + w * 0.34, y + h * 0.05, w * 0.36, h * 0.8, 0, 0, TAU)
  fill(g, shade)
  g.beginPath()
  for (let row = 0; row < 3; row++) {
    const yy = y - h * (0.25 + row * 0.25)
    const hw = (w / 2) * (1 - row * 0.2)
    g.moveTo(x - hw, yy)
    let up = 1
    for (let xx = -hw; xx < hw; xx += 14) {
      g.quadraticCurveTo(x + xx + 7, yy + up * 7, x + xx + 14, yy)
      up = -up
    }
  }
  g.lineWidth = 3
  g.strokeStyle = shade
  g.stroke()
  g.beginPath()
  g.ellipse(x - w * 0.18, y - h * 0.78, w * 0.12, h * 0.1, -0.4, 0, TAU)
  fill(g, '#ffffff')
  g.restore()
  path()
  ink(g)
}

/** A sea anemone: a cup and a crown of round-tipped fronds. */
export const anemone = (g: G2D, x: number, y: number, s: number, col: string, tip: string): void => {
  g.beginPath()
  for (let i = 0; i < 7; i++) {
    const a = -PI + 0.35 + (i * (PI - 0.7)) / 6
    g.moveTo(x + cos(a) * 8 * s, y - 16 * s)
    g.quadraticCurveTo(x + cos(a) * 20 * s, y - 20 * s + sin(a) * 20 * s, x + cos(a) * 26 * s, y - 16 * s + sin(a) * 34 * s)
  }
  band(g, 7 * s, col, 3.5)
  g.beginPath()
  for (let i = 0; i < 7; i++) {
    const a = -PI + 0.35 + (i * (PI - 0.7)) / 6
    const px = x + cos(a) * 26 * s
    const py = y - 16 * s + sin(a) * 34 * s
    g.moveTo(px + 4 * s, py)
    g.arc(px, py, 4 * s, 0, TAU)
  }
  fill(g, tip)
  g.beginPath()
  g.ellipse(x, y - 8 * s, 18 * s, 11 * s, 0, 0, TAU)
  fill(g, col)
  ink(g, 3.5)
}

/** A sandcastle of two towers on (x, y). */
export const sandcastle = (g: G2D, x: number, y: number, s: number): void => {
  const block = (bx: number, by: number, w: number, h: number): void => {
    g.beginPath()
    g.moveTo(bx - w / 2, by)
    g.lineTo(bx - w / 2, by - h - 10 * s)
    const n = 3
    const step = w / (n * 2 - 1)
    for (let i = 0; i < n * 2 - 1; i++) {
      const x0 = bx - w / 2 + i * step
      const up = i % 2 === 0
      g.lineTo(x0 + step, by - h - (up ? 10 * s : 0))
      if (i < n * 2 - 2) g.lineTo(x0 + step, by - h - (up ? 0 : 10 * s))
    }
    g.lineTo(bx + w / 2, by)
    g.closePath()
    fill(g, BAY.castle)
    ink(g, 3.5)
  }
  block(x - 40 * s, y, 36 * s, 74 * s)
  block(x + 40 * s, y, 36 * s, 74 * s)
  block(x, y, 70 * s, 44 * s)
  g.beginPath()
  g.moveTo(x - 12 * s, y)
  g.lineTo(x - 12 * s, y - 16 * s)
  g.arc(x, y - 16 * s, 12 * s, PI, 0)
  g.lineTo(x + 12 * s, y)
  fill(g, '#c98a4a')
  ink(g, 3)
  g.beginPath()
  g.moveTo(x + 40 * s, y - 84 * s)
  g.lineTo(x + 40 * s, y - 120 * s)
  ink(g, 3)
  g.beginPath()
  g.moveTo(x + 40 * s, y - 120 * s)
  g.lineTo(x + 66 * s, y - 111 * s)
  g.lineTo(x + 40 * s, y - 102 * s)
  g.closePath()
  fill(g, C.flowerPink)
  ink(g, 2.6)
  g.beginPath()
  for (const dx of [-40, 40]) {
    g.moveTo(x + dx * s + 5 * s, y - 44 * s)
    g.arc(x + dx * s, y - 44 * s, 5 * s, 0, TAU)
  }
  fill(g, '#c98a4a')
}

/** A bucket with a spade, on (x, y). */
export const bucket = (g: G2D, x: number, y: number, s: number, col: string): void => {
  g.beginPath()
  g.moveTo(x + 14 * s, y - 20 * s)
  g.lineTo(x + 46 * s, y - 72 * s)
  band(g, 5, '#ffd34d', 3)
  g.beginPath()
  g.ellipse(x + 50 * s, y - 80 * s, 10 * s, 14 * s, 0.55, 0, TAU)
  fill(g, '#ffd34d')
  ink(g, 3)
  g.beginPath()
  g.moveTo(x - 24 * s, y - 44 * s)
  g.lineTo(x - 18 * s, y)
  g.lineTo(x + 18 * s, y)
  g.lineTo(x + 24 * s, y - 44 * s)
  g.closePath()
  fill(g, col)
  ink(g, 3.5)
  g.beginPath()
  g.arc(x, y - 44 * s, 22 * s, PI, 0)
  ink(g, 3)
  g.beginPath()
  g.ellipse(x, y - 44 * s, 24 * s, 6 * s, 0, 0, TAU)
  fill(g, '#ffffff')
  ink(g, 3)
}

/** A striped parasol planted at (x, y) over a towel. */
export const parasol = (g: G2D, x: number, y: number, s: number, a: string, b: string, towel: string): void => {
  const mat = (): void => {
    g.beginPath()
    g.moveTo(x - 90 * s, y + 6 * s)
    g.lineTo(x + 50 * s, y + 6 * s)
    g.lineTo(x + 76 * s, y - 34 * s)
    g.lineTo(x - 56 * s, y - 34 * s)
    g.closePath()
  }
  mat()
  fill(g, towel)
  g.save()
  mat()
  g.clip()
  g.beginPath()
  for (let i = 0; i < 3; i++) {
    const x0 = x - 96 * s + i * 60 * s
    g.moveTo(x0, y + 10 * s)
    g.lineTo(x0 + 24 * s, y + 10 * s)
    g.lineTo(x0 + 54 * s, y - 40 * s)
    g.lineTo(x0 + 30 * s, y - 40 * s)
    g.closePath()
  }
  fill(g, '#ffffff')
  g.restore()
  mat()
  ink(g, 3.5)
  const px = x + 40 * s
  g.beginPath()
  g.moveTo(px, y - 10 * s)
  g.lineTo(px - 20 * s, y - 166 * s)
  band(g, 5, '#fff6e4', 3)
  const cx = px - 20 * s
  const cy = y - 160 * s
  const R = 104 * s
  const n = 5
  const dome = (): void => {
    g.beginPath()
    g.moveTo(cx - R, cy)
    g.quadraticCurveTo(cx - R * 0.92, cy - 70 * s, cx, cy - 74 * s)
    g.quadraticCurveTo(cx + R * 0.92, cy - 70 * s, cx + R, cy)
    for (let i = n - 1; i >= 0; i--) {
      const x0 = cx - R + (i * 2 * R) / n
      g.quadraticCurveTo(x0 + R / n, cy + 18 * s, x0, cy)
    }
    g.closePath()
  }
  dome()
  fill(g, a)
  g.save()
  dome()
  g.clip()
  g.beginPath()
  for (let i = 1; i < n; i += 2) {
    const x0 = cx - R + (i * 2 * R) / n
    g.moveTo(cx, cy - 80 * s)
    g.lineTo(x0, cy + 20 * s)
    g.lineTo(x0 + (2 * R) / n, cy + 20 * s)
    g.closePath()
  }
  fill(g, b)
  g.restore()
  dome()
  ink(g, 4)
  g.beginPath()
  g.arc(cx, cy - 78 * s, 7 * s, 0, TAU)
  fill(g, a)
  ink(g, 3)
}

/** A lifebuoy ring, centred (x, y). */
export const lifebuoy = (g: G2D, x: number, y: number, r: number): void => {
  g.beginPath()
  g.arc(x, y, r, 0, TAU)
  g.arc(x, y, r * 0.5, 0, TAU, true)
  fill(g, '#ffffff')
  g.save()
  g.clip()
  g.beginPath()
  for (let i = 0; i < 4; i++) {
    const a = (i * PI) / 2 + PI / 4
    g.moveTo(x, y)
    g.arc(x, y, r + 2, a - 0.4, a + 0.4)
    g.closePath()
  }
  fill(g, C.cap)
  g.restore()
  g.beginPath()
  g.arc(x, y, r, 0, TAU)
  g.moveTo(x + r * 0.5, y)
  g.arc(x, y, r * 0.5, 0, TAU)
  ink(g, 3.5)
}

/* ------------------------------------------------------------ buildings */

/** A striped beach hut on stilts at (x, y), `w` wide. Its ROOF, awning and
 *  wall stripes are the landmark. */
export const beachHut = (g: G2D, x: number, y: number, w: number, pot: Pot): void => {
  const k = w / 170
  const floor = y - 30 * k
  const h = 124 * k
  const L = x - w / 2
  const top = floor - h
  // Stilts and the deck.
  g.beginPath()
  for (const dx of [-0.4, 0, 0.4]) g.rect(x + dx * w - 7 * k, floor, 14 * k, y - floor)
  fill(g, BAY.plankShade)
  ink(g, 3.5)
  g.beginPath()
  g.roundRect(L - 18 * k, floor - 4 * k, w + 36 * k, 14 * k, 4)
  fill(g, BAY.plank)
  ink(g, 4)
  // Walls: white planks with the pot's stripes.
  const wall = (): void => {
    g.beginPath()
    g.rect(L, top, w, h)
  }
  wall()
  fill(g, BAY.wall)
  g.save()
  wall()
  g.clip()
  g.beginPath()
  const sw = w / 7
  for (let i = 1; i < 7; i += 2) g.rect(L + i * sw, top, sw, h)
  fill(g, pot.lite)
  g.beginPath()
  g.rect(x + w * 0.24, top, w, h)
  g.globalAlpha = 0.16
  fill(g, INK)
  g.globalAlpha = 1
  g.restore()
  wall()
  ink(g)
  // The door and a porthole.
  g.beginPath()
  g.roundRect(x - 2 * k, floor - 84 * k, 44 * k, 84 * k, [20 * k, 20 * k, 2, 2])
  fill(g, pot.shade)
  ink(g, 4)
  g.beginPath()
  g.arc(x + 20 * k, floor - 58 * k, 9 * k, 0, TAU)
  fill(g, BAY.glass)
  ink(g, 3)
  g.beginPath()
  g.arc(x + 34 * k, floor - 34 * k, 3.2 * k, 0, TAU)
  fill(g, INK)
  g.beginPath()
  g.arc(x - 44 * k, floor - 70 * k, 17 * k, 0, TAU)
  fill(g, BAY.glass)
  ink(g, 3.5)
  g.beginPath()
  g.ellipse(x - 49 * k, floor - 75 * k, 6 * k, 4 * k, -0.6, 0, TAU)
  fill(g, '#ffffff')
  lifebuoy(g, x - 44 * k, floor - 26 * k, 15 * k)
  // The roof.
  const roof = (): void => {
    g.beginPath()
    g.moveTo(L - 24 * k, top + 12 * k)
    g.quadraticCurveTo(x - 30 * k, top - 64 * k, x, top - 80 * k)
    g.quadraticCurveTo(x + 30 * k, top - 64 * k, x + w / 2 + 24 * k, top + 12 * k)
    g.closePath()
  }
  roof()
  fill(g, pot.base)
  g.save()
  roof()
  g.clip()
  g.beginPath()
  g.rect(x + 6 * k, top - 90 * k, w, 110 * k)
  fill(g, pot.shade)
  g.beginPath()
  g.ellipse(x - 34 * k, top - 34 * k, 22 * k, 7 * k, -0.6, 0, TAU)
  fill(g, pot.lite)
  g.restore()
  roof()
  ink(g)
  // The scalloped awning under the eaves.
  g.beginPath()
  const n = 8
  const aw = w + 40 * k
  g.moveTo(L - 20 * k, top + 10 * k)
  for (let i = 0; i < n; i++) {
    const x0 = L - 20 * k + (i * aw) / n
    g.quadraticCurveTo(x0 + aw / n / 2, top + 36 * k, x0 + aw / n, top + 10 * k)
  }
  g.closePath()
  fill(g, pot.base)
  ink(g, 3.5)
  g.beginPath()
  for (let i = 0; i < n; i += 2) {
    const x0 = L - 20 * k + (i * aw) / n + aw / n / 2
    g.moveTo(x0 + 4 * k, top + 20 * k)
    g.arc(x0, top + 20 * k, 4 * k, 0, TAU)
  }
  fill(g, '#ffffff')
  // A pennant on the ridge.
  g.beginPath()
  g.moveTo(x, top - 80 * k)
  g.lineTo(x, top - 116 * k)
  ink(g, 3)
  g.beginPath()
  g.moveTo(x, top - 116 * k)
  g.lineTo(x + 28 * k, top - 107 * k)
  g.lineTo(x, top - 98 * k)
  g.closePath()
  fill(g, pot.lite)
  ink(g, 2.6)
}

/** Where a lighthouse's lamp sits, for its beam. */
export const lampOf = (x: number, y: number, s: number): Pt => [x, y - 300 * s - 40 * s]

/** A lighthouse standing at (x, y): its STRIPES, gallery and cap are the landmark. */
export const lighthouse = (g: G2D, x: number, y: number, s: number, pot: Pot): void => {
  const H = 300 * s
  const bw = 60 * s
  const tw = 40 * s
  const top = y - H
  const body = (): void => {
    g.beginPath()
    g.moveTo(x - bw, y)
    g.lineTo(x - tw, top)
    g.lineTo(x + tw, top)
    g.lineTo(x + bw, y)
    g.closePath()
  }
  const right = (): void => {
    g.beginPath()
    g.moveTo(x + bw * 0.3, y + 4)
    g.lineTo(x + tw * 0.3, top - 4)
    g.lineTo(x + tw + 10, top - 4)
    g.lineTo(x + bw + 10, y + 4)
    g.closePath()
  }
  const stripes = (): void => {
    g.beginPath()
    for (let i = 0; i < 3; i++) {
      const yb = y - H * (0.1 + i * 0.3)
      g.rect(x - bw - 10, yb - H * 0.14, 2 * bw + 20, H * 0.14)
    }
  }
  body()
  fill(g, BAY.wall)
  g.save()
  body()
  g.clip()
  stripes()
  fill(g, pot.base)
  right()
  g.clip()
  body()
  fill(g, BAY.wallShade)
  stripes()
  fill(g, pot.shade)
  g.restore()
  g.save()
  body()
  g.clip()
  g.beginPath()
  for (let i = 0; i < 3; i++) {
    const yb = y - H * (0.1 + i * 0.3) - H * 0.07
    const u = (y - yb) / H
    const hx = x - bw + (bw - tw) * u + 14 * s
    g.moveTo(hx + 5 * s, yb)
    g.ellipse(hx, yb, 5 * s, H * 0.045, 0, 0, TAU)
  }
  fill(g, pot.lite)
  g.restore()
  body()
  ink(g)
  // Door and windows.
  g.beginPath()
  g.roundRect(x - 16 * s, y - 50 * s, 32 * s, 50 * s, [16 * s, 16 * s, 2, 2])
  fill(g, C.door)
  ink(g, 4)
  g.beginPath()
  for (const v of [0.45, 0.75]) {
    g.moveTo(x + 11 * s, y - H * v)
    g.arc(x, y - H * v, 11 * s, 0, TAU)
  }
  fill(g, BAY.glass)
  ink(g, 3.5)
  // The gallery.
  g.beginPath()
  g.roundRect(x - tw - 18 * s, top - 10 * s, 2 * (tw + 18 * s), 16 * s, 5 * s)
  fill(g, pot.base)
  ink(g, 4)
  g.beginPath()
  g.moveTo(x - tw - 14 * s, top - 10 * s)
  g.lineTo(x - tw - 14 * s, top - 30 * s)
  g.lineTo(x + tw + 14 * s, top - 30 * s)
  g.lineTo(x + tw + 14 * s, top - 10 * s)
  for (let i = 1; i < 6; i++) {
    const px = x - tw - 14 * s + (i * 2 * (tw + 14 * s)) / 6
    g.moveTo(px, top - 30 * s)
    g.lineTo(px, top - 10 * s)
  }
  ink(g, 3)
  // The lantern room.
  g.beginPath()
  g.roundRect(x - tw * 0.72, top - 70 * s, tw * 1.44, 62 * s, 6 * s)
  fill(g, BAY.glass)
  ink(g, 4)
  g.beginPath()
  g.moveTo(x - tw * 0.24, top - 70 * s)
  g.lineTo(x - tw * 0.24, top - 8 * s)
  g.moveTo(x + tw * 0.24, top - 70 * s)
  g.lineTo(x + tw * 0.24, top - 8 * s)
  ink(g, 3)
  // The cap.
  const cap = (): void => {
    g.beginPath()
    g.moveTo(x - tw - 8 * s, top - 64 * s)
    g.quadraticCurveTo(x - tw * 0.6, top - 118 * s, x, top - 122 * s)
    g.quadraticCurveTo(x + tw * 0.6, top - 118 * s, x + tw + 8 * s, top - 64 * s)
    g.closePath()
  }
  cap()
  fill(g, pot.base)
  g.save()
  cap()
  g.clip()
  g.beginPath()
  g.rect(x + 8 * s, top - 130 * s, 80 * s, 70 * s)
  fill(g, pot.shade)
  g.beginPath()
  g.ellipse(x - 16 * s, top - 100 * s, 12 * s, 5 * s, -0.5, 0, TAU)
  fill(g, pot.lite)
  g.restore()
  cap()
  ink(g)
  g.beginPath()
  g.arc(x, top - 128 * s, 9 * s, 0, TAU)
  fill(g, pot.lite)
  ink(g, 3)
}

/** The lighthouse's lamp and turning beam — a live prop. Dark at rest. */
export const beam = (g: G2D, lx: number, ly: number, t: number, alive: number): void => {
  if (alive <= 0) return
  const c = cos(t * 0.9)
  const L = 560 * c
  const spread = 20 + 70 * Math.abs(c)
  g.globalAlpha = alive * 0.4 * Math.abs(c)
  g.beginPath()
  g.moveTo(lx, ly - 12)
  g.lineTo(lx + L, ly - spread)
  g.lineTo(lx + L, ly + spread)
  g.lineTo(lx, ly + 12)
  g.closePath()
  fill(g, '#fff7c2')
  g.globalAlpha = alive * (0.45 + 0.2 * Math.abs(c))
  g.beginPath()
  g.arc(lx, ly, 34, 0, TAU)
  fill(g, BAY.lamp)
  g.globalAlpha = alive
  g.beginPath()
  g.arc(lx, ly, 15, 0, TAU)
  fill(g, '#fffbe6')
  g.globalAlpha = 1
}

/** A narrow harbour house on (x, y), w × h, with a pitched roof. */
export const house = (g: G2D, x: number, y: number, w: number, h: number, wall: string, roof: string): void => {
  g.beginPath()
  g.rect(x - w / 2, y - h, w, h)
  fill(g, wall)
  ink(g, 4)
  g.beginPath()
  g.moveTo(x - w / 2 - 8, y - h + 4)
  g.lineTo(x, y - h - w * 0.62)
  g.lineTo(x + w / 2 + 8, y - h + 4)
  g.closePath()
  fill(g, roof)
  ink(g, 4)
  g.beginPath()
  const rows = Math.max(1, Math.floor((h - 26) / 30))
  for (let i = 0; i < rows; i++) g.roundRect(x - 8, y - h + 12 + i * 30, 16, 18, 4)
  fill(g, BAY.glass)
  ink(g, 2.6)
}

/** Bunting strung from (x0, y0) to (x1, y1), sagging `sag`. */
export const bunting = (g: G2D, x0: number, y0: number, x1: number, y1: number, sag: number, cols: readonly string[]): void => {
  const mx = (x0 + x1) / 2
  const my = (y0 + y1) / 2 + sag
  g.beginPath()
  g.moveTo(x0, y0)
  g.quadraticCurveTo(mx, my, x1, y1)
  ink(g, 2.4)
  const n = Math.max(3, Math.round(Math.hypot(x1 - x0, y1 - y0) / 34))
  for (let i = 1; i < n; i++) {
    const u = i / n
    const px = (1 - u) ** 2 * x0 + 2 * (1 - u) * u * mx + u * u * x1
    const py = (1 - u) ** 2 * y0 + 2 * (1 - u) * u * my + u * u * y1
    // The CORD is a bezier through the points the sector hands over, so it has
    // no shape to paint; each flag on it does, and it is the same flag at
    // every station. The painting is threaded along the same curve.
    g.save()
    g.translate(px, py)
    const painted = flagAt(g, 20, 20, cols[i % cols.length]!)
    g.restore()
    if (painted) continue
    g.beginPath()
    g.moveTo(px - 10, py)
    g.lineTo(px + 10, py)
    g.lineTo(px, py + 20)
    g.closePath()
    fill(g, cols[i % cols.length]!)
    ink(g, 2.2)
  }
}

/** A lamp post on (x, y). */
export const lampPost = (g: G2D, x: number, y: number, h: number): void => {
  g.beginPath()
  g.rect(x - 5, y - h, 10, h)
  fill(g, '#6d8bff')
  ink(g, 3)
  g.beginPath()
  g.roundRect(x - 13, y - h - 30, 26, 30, 6)
  fill(g, BAY.lamp)
  ink(g, 3.5)
  g.beginPath()
  g.moveTo(x - 18, y - h - 30)
  g.quadraticCurveTo(x, y - h - 50, x + 18, y - h - 30)
  g.closePath()
  fill(g, '#6d8bff')
  ink(g, 3)
}

/** A wooden crate on (x, y), `w` square. */
export const crate = (g: G2D, x: number, y: number, w: number): void => {
  g.beginPath()
  g.roundRect(x - w / 2, y - w, w, w, 4)
  fill(g, BAY.plank)
  ink(g, 4)
  g.beginPath()
  g.moveTo(x - w / 2 + 6, y - w + 6)
  g.lineTo(x + w / 2 - 6, y - 6)
  g.moveTo(x - w / 2, y - w / 2)
  g.lineTo(x + w / 2, y - w / 2)
  ink(g, 2.6)
}

/** A barrel on (x, y). */
export const barrel = (g: G2D, x: number, y: number, s: number): void => {
  g.beginPath()
  g.moveTo(x - 24 * s, y)
  g.quadraticCurveTo(x - 34 * s, y - 34 * s, x - 24 * s, y - 68 * s)
  g.lineTo(x + 24 * s, y - 68 * s)
  g.quadraticCurveTo(x + 34 * s, y - 34 * s, x + 24 * s, y)
  g.closePath()
  fill(g, BAY.plank)
  ink(g, 4)
  g.beginPath()
  g.moveTo(x - 29 * s, y - 20 * s)
  g.lineTo(x + 29 * s, y - 20 * s)
  g.moveTo(x - 29 * s, y - 48 * s)
  g.lineTo(x + 29 * s, y - 48 * s)
  g.lineWidth = 6 * s
  g.strokeStyle = BAY.coralLilac
  g.stroke()
  ink(g, 2.4)
}

/** A coil of rope on (x, y). */
export const ropeCoil = (g: G2D, x: number, y: number, r: number): void => {
  g.beginPath()
  g.ellipse(x, y - r * 0.4, r, r * 0.45, 0, 0, TAU)
  fill(g, '#ffe3a8')
  ink(g, 3.5)
  g.beginPath()
  g.ellipse(x, y - r * 0.44, r * 0.66, r * 0.28, 0, 0, TAU)
  g.moveTo(x + r * 0.34, y - r * 0.46)
  g.ellipse(x, y - r * 0.46, r * 0.34, r * 0.14, 0, 0, TAU)
  ink(g, 2.4)
}

/* ----------------------------------------------------------------- boats */

export interface BoatCols { hull: string; stripe: string; sail: string; sailBand: string; jib: string }

/** A sailboat afloat at waterline (x, y), facing `dir`. */
export const sailboat = (g: G2D, x: number, y: number, s: number, c: BoatCols, dir = 1): void => {
  g.save()
  g.translate(x, y)
  if (dir < 0) g.scale(-1, 1)
  g.beginPath()
  g.rect(-5 * s, -206 * s, 10 * s, 190 * s)
  fill(g, BAY.plank)
  ink(g, 3.5)
  const main = (): void => {
    g.beginPath()
    g.moveTo(-9 * s, -196 * s)
    g.quadraticCurveTo(-64 * s, -110 * s, -92 * s, -36 * s)
    g.lineTo(-9 * s, -32 * s)
    g.closePath()
  }
  main()
  fill(g, c.sail)
  g.save()
  main()
  g.clip()
  g.beginPath()
  for (let i = 0; i < 3; i++) g.rect(-100 * s, (-172 + i * 52) * s, 100 * s, 22 * s)
  fill(g, c.sailBand)
  g.restore()
  main()
  ink(g)
  g.beginPath()
  g.moveTo(9 * s, -184 * s)
  g.quadraticCurveTo(46 * s, -104 * s, 76 * s, -36 * s)
  g.lineTo(9 * s, -34 * s)
  g.closePath()
  fill(g, c.jib)
  ink(g, 4)
  g.beginPath()
  g.moveTo(0, -206 * s)
  g.lineTo(26 * s, -198 * s)
  g.lineTo(0, -190 * s)
  g.closePath()
  fill(g, C.flowerPink)
  ink(g, 2.6)
  const hull = (): void => {
    g.beginPath()
    g.moveTo(-96 * s, -24 * s)
    g.lineTo(108 * s, -36 * s)
    g.bezierCurveTo(96 * s, -4 * s, 70 * s, 16 * s, 34 * s, 16 * s)
    g.lineTo(-54 * s, 16 * s)
    g.bezierCurveTo(-82 * s, 16 * s, -96 * s, 0, -96 * s, -24 * s)
    g.closePath()
  }
  hull()
  fill(g, c.hull)
  g.save()
  hull()
  g.clip()
  g.beginPath()
  g.moveTo(-100 * s, -16 * s)
  g.lineTo(110 * s, -28 * s)
  g.lineTo(110 * s, -40 * s)
  g.lineTo(-100 * s, -40 * s)
  g.closePath()
  fill(g, c.stripe)
  g.beginPath()
  g.rect(-100 * s, 4 * s, 220 * s, 20 * s)
  g.globalAlpha = 0.18
  fill(g, INK)
  g.globalAlpha = 1
  g.restore()
  hull()
  ink(g)
  g.beginPath()
  for (const px of [-40, 0, 40]) {
    g.moveTo((px + 6) * s, -6 * s)
    g.arc(px * s, -6 * s, 6 * s, 0, TAU)
  }
  fill(g, BAY.glass)
  ink(g, 2.6)
  g.restore()
  foam(g, x + 6 * s * dir, y + 14 * s, 200 * s)
}

/**
 * The three colourways the three far boats actually fly (`sectorsC2`), and
 * the three panels of `BOAT_ART` — in this order.
 *
 * A boat takes five colours per call site and `artTint` carries ONE neutral
 * region, so a tinted sheet cannot serve them. But three colourways is three
 * PANELS of one strip, which is one generation and one file: the strip is the
 * same machinery a wing beat uses, pointed at colour instead of time. A sector
 * that ever invents a fourth simply keeps its drawing.
 */
export const FAR_BOAT_LOOKS: readonly BoatCols[] = [
  { hull: C.cap, stripe: '#ffffff', sail: '#ffffff', sailBand: '#ffd34d', jib: '#ffffff' },
  { hull: '#6d8bff', stripe: '#ffffff', sail: '#ffffff', sailBand: C.flowerPink, jib: '#ffffff' },
  { hull: '#ffd34d', stripe: '#ffffff', sail: '#ffffff', sailBand: '#3ee3d4', jib: '#ffffff' }
]

/** The scale every far boat is flown at, and the hull length it gives in SU —
 *  what the reference's line weight is judged against. */
const BOAT_S = 0.3
const BOAT_UNIT = 204 * BOAT_S

/** The far boat's three colourways side by side — one painting, three looks. */
export const BOAT_ART: ItemSpec = {
  ...PROP_ART.boat, frames: 3,
  draw: (g, s, f) => {
    g.save()
    g.scale(s / BOAT_UNIT, s / BOAT_UNIT)
    farBoatShape(g, 0, 0, BOAT_S, FAR_BOAT_LOOKS[f] ?? FAR_BOAT_LOOKS[0]!, 1)
    g.restore()
  }
}

/** A far-off sailboat, cheap enough to bob every frame: no clips, six fills. */
export const farBoat = (g: G2D, x: number, y: number, s: number, c: BoatCols, dir = 1): void => {
  const look = FAR_BOAT_LOOKS.findIndex((l) => l.hull === c.hull && l.sailBand === c.sailBand)
  if (look >= 0) {
    g.save()
    g.translate(x, y)
    g.scale(dir, 1)
    const painted = drawItem(g, BOAT_ART, 204 * s, look)
    g.restore()
    if (painted) return
  }
  farBoatShape(g, x, y, s, c, dir)
}

const farBoatShape = (g: G2D, x: number, y: number, s: number, c: BoatCols, dir: number): void => {
  const X = (u: number): number => x + u * s * dir
  const Y = (v: number): number => y + v * s
  g.beginPath()
  g.moveTo(X(-8), Y(-196))
  g.quadraticCurveTo(X(-62), Y(-110), X(-92), Y(-36))
  g.lineTo(X(-8), Y(-32))
  g.closePath()
  fill(g, c.sail)
  ink(g, 2.6)
  g.beginPath()
  g.moveTo(X(8), Y(-184))
  g.quadraticCurveTo(X(46), Y(-104), X(76), Y(-36))
  g.lineTo(X(8), Y(-34))
  g.closePath()
  fill(g, c.sailBand)
  ink(g, 2.6)
  g.beginPath()
  g.moveTo(x, Y(-206))
  g.lineTo(x, Y(-24))
  ink(g, 3)
  g.beginPath()
  g.moveTo(X(-96), Y(-24))
  g.lineTo(X(108), Y(-36))
  g.bezierCurveTo(X(96), Y(-4), X(70), Y(16), X(34), Y(16))
  g.lineTo(X(-54), Y(16))
  g.bezierCurveTo(X(-82), Y(16), X(-96), Y(0), X(-96), Y(-24))
  g.closePath()
  fill(g, c.hull)
  ink(g, 3)
  g.beginPath()
  g.ellipse(X(6), Y(16), 104 * s, 9 * s + 2, 0, 0, TAU)
  fill(g, '#ffffff')
  ink(g, 2)
}

/** A rowboat afloat at (x, y) facing `dir`, oars shipped. */
export const rowboat = (g: G2D, x: number, y: number, s: number, hullCol: string, dir = 1): void => {
  g.save()
  g.translate(x, y)
  if (dir < 0) g.scale(-1, 1)
  g.beginPath()
  g.ellipse(4 * s, -30 * s, 74 * s, 12 * s, -0.05, 0, TAU)
  fill(g, '#9a6446')
  ink(g, 4)
  g.beginPath()
  g.moveTo(-40 * s, -58 * s)
  g.lineTo(34 * s, -14 * s)
  band(g, 6 * s, BAY.plank, 3)
  g.beginPath()
  g.ellipse(36 * s, -12 * s, 8 * s, 14 * s, 1.0, 0, TAU)
  fill(g, BAY.plank)
  ink(g, 3)
  const hull = (): void => {
    g.beginPath()
    g.moveTo(-76 * s, -30 * s)
    g.quadraticCurveTo(0, -20 * s, 84 * s, -38 * s)
    g.bezierCurveTo(74 * s, -6 * s, 50 * s, 12 * s, 20 * s, 12 * s)
    g.lineTo(-40 * s, 12 * s)
    g.bezierCurveTo(-64 * s, 12 * s, -76 * s, -6 * s, -76 * s, -30 * s)
    g.closePath()
  }
  hull()
  fill(g, hullCol)
  g.save()
  hull()
  g.clip()
  g.beginPath()
  g.moveTo(-80 * s, -18 * s)
  g.quadraticCurveTo(0, -8 * s, 90 * s, -26 * s)
  g.lineTo(90 * s, -16 * s)
  g.quadraticCurveTo(0, 2 * s, -80 * s, -8 * s)
  g.closePath()
  fill(g, '#ffffff')
  g.beginPath()
  g.rect(-90 * s, 2 * s, 190 * s, 20 * s)
  g.globalAlpha = 0.18
  fill(g, INK)
  g.globalAlpha = 1
  g.restore()
  hull()
  ink(g)
  g.restore()
  foam(g, x + 4 * s * dir, y + 10 * s, 160 * s)
}

/** A plank jetty from x0 to x1, deck top at y, posts down `depth` into the water. */
export const jetty = (g: G2D, x0: number, x1: number, y: number, depth: number): void => {
  g.beginPath()
  for (let x = x0 + 30; x <= x1 - 12; x += 76) g.roundRect(x - 10, y - 4, 20, depth + 4, 4)
  fill(g, BAY.plankShade)
  ink(g, 3.5)
  for (let x = x0 + 30; x <= x1 - 12; x += 76) foam(g, x, y + depth, 40)
  g.beginPath()
  g.roundRect(x0, y - 22, x1 - x0, 26, 6)
  fill(g, BAY.plank)
  ink(g)
  g.beginPath()
  for (let x = x0 + 28; x < x1 - 8; x += 28) {
    g.moveTo(x, y - 20)
    g.lineTo(x, y + 2)
  }
  g.lineWidth = 2.4
  g.strokeStyle = BAY.plankShade
  g.stroke()
  // Bollards.
  g.beginPath()
  for (const x of [x0 + 60, x1 - 30]) g.roundRect(x - 9, y - 44, 18, 24, 7)
  fill(g, '#6d8bff')
  ink(g, 3)
}

/** A boardwalk quay across the page foot from y down: planks seen from
 *  above, widening toward the viewer, behind a stone kerb. */
export const quay = (g: G2D, y: number, seed: number): void => {
  g.beginPath()
  g.rect(-10, y, SEC_W + 20, SEC_H - y + 10)
  fill(g, BAY.plank)
  const r = seeded(seed)
  g.beginPath()
  let yy = y + 10
  for (let row = 0; yy < SEC_H; row++) {
    const h = 16 + row * 7
    g.moveTo(0, yy + h)
    g.lineTo(SEC_W, yy + h)
    for (let x = r() * 120; x < SEC_W; x += 150 + r() * 80) {
      g.moveTo(x, yy + 3)
      g.lineTo(x, yy + h - 3)
    }
    yy += h
  }
  g.lineWidth = 3
  g.strokeStyle = BAY.plankShade
  g.stroke()
  g.beginPath()
  g.roundRect(-10, y - 8, SEC_W + 20, 20, 6)
  fill(g, C.stone)
  ink(g)
  g.beginPath()
  for (let x = 40; x < SEC_W; x += 96) {
    g.moveTo(x, y - 6)
    g.lineTo(x, y + 10)
  }
  ink(g, 2.4)
}

/* ------------------------------------------------------------ live props */

/** Bubbles rising from (x, y), `h` high — a live prop (none at rest). */
export const bubbles = (g: G2D, x: number, y: number, h: number, t: number, alive: number, n = 4): void => {
  if (alive <= 0) return
  g.globalAlpha = alive
  let painted = false
  g.beginPath()
  for (let i = 0; i < n; i++) {
    const k = (t * 0.32 + i / n) % 1
    const bx = x + sin(k * 7 + i * 2) * 9
    const by = y - k * h
    const r = (4 + (i % 3) * 2.5) * (0.6 + k * 0.6)
    painted = bubbleAt(g, bx, by, r, '#e1fcff')
    if (painted) continue
    g.moveTo(bx + r, by)
    g.arc(bx, by, r, 0, TAU)
  }
  if (!painted) {
    g.fillStyle = 'rgba(225,252,255,0.55)'
    g.fill()
    g.lineWidth = 2.4
    g.strokeStyle = '#ffffff'
    g.stroke()
  }
  g.globalAlpha = 1
}

/** Four-point twinkles on the water at `pts` — a live prop. */
export const twinkles = (g: G2D, pts: readonly Pt[], t: number, alive: number, size = 10): void => {
  if (alive <= 0) return
  g.globalAlpha = alive
  g.beginPath()
  let painted = false
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i]!
    const r = size * Math.max(0, sin(t * 2.1 + i * 1.9))
    if (r < 1) continue
    painted = twinkleAt(g, x, y, r, '#ffffff')
  }
  if (!painted) fill(g, '#ffffff')
  g.globalAlpha = 1
}

/** A gull about the origin, wings at `flap` (−1 down … 1 up). */
export const gullShape = (g: G2D, flap: number): void => {
  const wy = -12 * flap
  g.beginPath()
  g.moveTo(-30, wy)
  g.quadraticCurveTo(-14, -14 + wy * 0.3, 0, 0)
  g.quadraticCurveTo(14, -14 + wy * 0.3, 30, wy)
  g.quadraticCurveTo(14, -5 + wy * 0.2, 0, 6)
  g.quadraticCurveTo(-14, -5 + wy * 0.2, -30, wy)
  fill(g, '#ffffff')
  ink(g, 2.6)
}

/** The gull's wingspan in SU at `s` = 1 — `drawItem`'s scale for one. */
export const GULL_UNIT = 60

/** The gull as a painted strip: wings down, level, up. */
export const GULL_ART: ItemSpec = {
  ...PROP_ART.gull, frames: 3,
  draw: (g, s, f) => {
    g.save()
    g.scale(s / GULL_UNIT, s / GULL_UNIT)
    gullShape(g, f - 1)
    g.restore()
  }
}

/** A gull, wings at `flap` (−1 down … 1 up). */
export const gull = (g: G2D, x: number, y: number, s: number, flap: number): void => {
  g.save()
  g.translate(x, y)
  g.scale(s, s)
  if (!drawItem(g, GULL_ART, GULL_UNIT, flap + 1)) gullShape(g, flap)
  g.restore()
}

/** Two gulls gliding about (x, y) — a live prop (they arrive with the colour). */
export const gulls = (g: G2D, x: number, y: number, t: number, alive: number, span = 140): void => {
  if (alive <= 0) return
  g.globalAlpha = alive
  for (let i = 0; i < 2; i++) {
    const gx = x + sin(t * 0.22 + i * 2.4) * span + i * 70
    const gy = y + sin(t * 0.5 + i * 1.7) * 18 + i * 34
    gull(g, gx, gy, 0.9 - i * 0.2, sin(t * 3.4 + i * 1.3))
  }
  g.globalAlpha = 1
}

/**
 * A crab standing on the origin: `awake` opens its eyes, `wave` (0…1) lifts
 * its right claw, `step` (−1…1) shuffles its legs.
 */
export const crabShape = (g: G2D, awake: boolean, wave: number, step: number): void => {
  const by = -14
  g.beginPath()
  for (const d of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const lx = d * (8 + i * 7)
      g.moveTo(lx, by + 4)
      g.lineTo(lx + d * 9, (i % 2 ? step : -step) * 3)
    }
  }
  band(g, 3.5, BAY.crab, 2.4)
  for (const d of [-1, 1]) {
    const ax = d * 34
    const ay = by - (14 + (d > 0 ? wave * 10 : 0))
    g.beginPath()
    g.moveTo(d * 16, by)
    g.quadraticCurveTo(d * 30, by, ax, ay + 8)
    band(g, 5, BAY.crab, 2.4)
    g.beginPath()
    g.moveTo(ax, ay + 2)
    g.arc(ax, ay, 10, 0.4 + (d > 0 ? wave * 0.5 : 0), TAU - 0.4)
    g.closePath()
    fill(g, BAY.crab)
    ink(g, 3)
  }
  g.beginPath()
  g.ellipse(0, by, 24, 15, 0, 0, TAU)
  fill(g, BAY.crab)
  ink(g, 3.5)
  g.beginPath()
  g.moveTo(-8, by - 12)
  g.lineTo(-9, by - 24)
  g.moveTo(8, by - 12)
  g.lineTo(9, by - 24)
  ink(g, 3)
  g.beginPath()
  g.arc(-9, by - 26, 6, 0, TAU)
  g.moveTo(15, by - 26)
  g.arc(9, by - 26, 6, 0, TAU)
  fill(g, '#ffffff')
  ink(g, 2.4)
  g.beginPath()
  if (awake) {
    g.arc(-8, by - 26, 2.6, 0, TAU)
    g.moveTo(12.6, by - 26)
    g.arc(10, by - 26, 2.6, 0, TAU)
    fill(g, INK)
  } else {
    g.moveTo(-12, by - 26)
    g.lineTo(-6, by - 26)
    g.moveTo(6, by - 26)
    g.lineTo(12, by - 26)
    ink(g, 2)
  }
  g.beginPath()
  g.arc(0, by + 1, 6, 0.3, PI - 0.3)
  ink(g, 2.4)
}

/** The crab's claw-to-claw span in SU at `s` = 1. */
export const CRAB_UNIT = 88

/**
 * The crab as a painted strip: asleep, awake with its claw down, claw raised.
 *
 * The leg SHUFFLE is baked at rest in all three. It is ±3 SU on six leg tips
 * at 14 rad/s — too fast and too small to be worth three more panels, and the
 * scuttle a player actually sees is the crab crossing the sand, which is the
 * drawing's own transform either way.
 */
export const CRAB_ART: ItemSpec = {
  ...PROP_ART.crab, frames: 3,
  draw: (g, s, f) => {
    g.save()
    g.scale(s / CRAB_UNIT, s / CRAB_UNIT)
    crabShape(g, f > 0, f > 1 ? 1 : 0, 0)
    g.restore()
  }
}

/** A crab on the sand at (x, y): asleep at rest, scuttling and waving alive. */
export const crab = (g: G2D, x: number, y: number, s: number, t: number, alive: number, run = 50): void => {
  const wave = alive > 0 ? Math.max(0, sin(t * 1.5)) * alive : 0
  g.save()
  g.translate(x + (alive > 0 ? sin(t * 0.7) * run * alive : 0), y)
  g.scale(s, s)
  if (!drawItem(g, CRAB_ART, CRAB_UNIT, alive > 0 ? 1 + wave : 0)) {
    crabShape(g, alive > 0, wave, alive > 0 ? sin(t * 14) * alive : 0)
  }
  g.restore()
}

/** A little fish about the origin, nose to the right, level. */
export const fishShape = (g: G2D, col: string): void => {
  g.beginPath()
  g.moveTo(-12, 0)
  g.lineTo(-26, -10)
  g.lineTo(-24, 10)
  g.closePath()
  fill(g, col)
  ink(g, 2.4)
  g.beginPath()
  g.ellipse(0, 0, 16, 10, 0, 0, TAU)
  fill(g, col)
  ink(g, 2.6)
  g.beginPath()
  g.arc(7, -2, 2.6, 0, TAU)
  fill(g, INK)
}

/** The fish's tail-to-nose length in SU. */
export const FISH_UNIT = 42

/** The fish as a painted still — the LEAP is the drawing's own arc and tilt.
 *  Its body is the colour-me region: each lagoon picks its own fish. */
export const FISH_ART: ItemSpec = {
  ...PROP_ART.fish, frames: 1, tinted: true,
  draw: (g, s, _f, accent) => {
    g.save()
    g.scale(s / FISH_UNIT, s / FISH_UNIT)
    fishShape(g, accent.base)
    g.restore()
  }
}

/** A little fish leaping an arc from (x, y) over `span` — a live prop. */
export const fishJump = (
  g: G2D, x: number, y: number, span: number, h: number, t: number, period: number, alive: number, col: string
): void => {
  if (alive <= 0) return
  const u = ((t / period) % 1) * 2.4 - 0.4
  g.globalAlpha = alive
  // Splash rings where it leaves and lands.
  for (const [sx, k] of [[x, u + 0.4], [x + span, u - 1]] as const) {
    if (k < 0 || k > 0.4) continue
    const q = k / 0.4
    g.globalAlpha = alive * (1 - q)
    g.beginPath()
    g.ellipse(sx, y, 10 + q * 30, 4 + q * 9, 0, 0, TAU)
    g.lineWidth = 3
    g.strokeStyle = '#ffffff'
    g.stroke()
  }
  g.globalAlpha = alive
  if (u >= 0 && u <= 1) {
    const fx = x + u * span
    const fy = y - sin(u * PI) * h
    g.save()
    g.translate(fx, fy)
    g.rotate(Math.atan2(-cos(u * PI) * PI * h, span))
    if (!drawItem(g, FISH_ART, FISH_UNIT, 0, col)) fishShape(g, col)
    g.restore()
  }
  g.globalAlpha = 1
}

/** A striped bell buoy afloat at (x, y), rocking and blinking — a live prop. */
/** The buoy's width in SU — it is drawn at one fixed size, in one place. */
const BUOY_UNIT = 54

/**
 * The channel buoy as a painted still — the one thing standing on the open
 * water of 2-2, and a hard-outlined vector on a painted sea.
 *
 * Its bob and its lean are the drawing's transform, its LAMP GLOW is
 * alpha-pulsed and stays drawn over the painting, and so does the ring of
 * foam at its waterline, which is drawn outside the lean.
 */
export const BUOY_ART: ItemSpec = {
  ...PROP_ART.buoy, frames: 1,
  draw: (g, s) => {
    g.save()
    g.scale(s / BUOY_UNIT, s / BUOY_UNIT)
    buoyShape(g)
    g.restore()
  }
}

export const buoy = (g: G2D, x: number, y: number, t: number, alive: number): void => {
  const a = alive > 0 ? sin(t * 1.4) * 0.14 * alive : 0
  const dy = alive > 0 ? sin(t * 1.4 + 1) * 3 * alive : 0
  g.save()
  g.translate(x, y + dy)
  g.rotate(a)
  if (!drawItem(g, BUOY_ART, BUOY_UNIT)) buoyShape(g)
  if (alive > 0) {
    g.globalAlpha = alive * (0.4 + 0.35 * Math.max(0, sin(t * 3)))
    g.beginPath()
    g.arc(0, -66, 18, 0, TAU)
    fill(g, BAY.lamp)
    g.globalAlpha = 1
  }
  g.restore()
  if (!foamPuffs(g, x, y + 5, 66)) foam(g, x, y + 5, 66)
}

/** The buoy itself about its waterline: the banded body, its lamp housing
 *  and the collar round its foot. No glow — that pulses. */
const buoyShape = (g: G2D): void => {
  const body = (): void => {
    g.beginPath()
    g.moveTo(-19, -8)
    g.lineTo(-10, -60)
    g.lineTo(10, -60)
    g.lineTo(19, -8)
    g.closePath()
  }
  body()
  fill(g, '#ffffff')
  // The red bands, as quads on the tapering body (no clip: this runs per frame).
  const xl = (yy: number): number => -19 + ((-8 - yy) / 52) * 9
  g.beginPath()
  for (const [y0, y1] of [[-46, -30], [-18, -8]] as const) {
    g.moveTo(xl(y0), y0)
    g.lineTo(-xl(y0), y0)
    g.lineTo(-xl(y1), y1)
    g.lineTo(xl(y1), y1)
    g.closePath()
  }
  fill(g, C.cap)
  body()
  ink(g, 4)
  g.beginPath()
  g.roundRect(-7, -74, 14, 15, 4)
  fill(g, BAY.lamp)
  ink(g, 3)
  g.beginPath()
  g.ellipse(0, -5, 27, 10, 0, 0, TAU)
  fill(g, C.cap)
  ink(g, 4)
}

/** Soft ripple rings spreading on still water at (x, y) — a live prop. */
export const ripples = (g: G2D, x: number, y: number, w: number, t: number, alive: number): void => {
  if (alive <= 0) return
  g.lineWidth = 3
  g.strokeStyle = '#ffffff'
  for (let i = 0; i < 2; i++) {
    const k = (t * 0.3 + i * 0.5) % 1
    g.globalAlpha = alive * 0.8 * (1 - k)
    g.beginPath()
    g.ellipse(x, y, w * (0.4 + k * 0.6), w * 0.12 * (0.4 + k * 0.6), 0, 0, TAU)
    g.stroke()
  }
  g.globalAlpha = 1
}

/* ----------------------------------------------------- hiding places */

/** A tall sea stack in the water at (x, y), w × h, grass and sea-pinks on top. */
export const seaStack = (g: G2D, x: number, y: number, w: number, h: number): void => {
  const path = (): void => {
    g.beginPath()
    g.moveTo(x - w / 2, y)
    g.bezierCurveTo(x - w * 0.62, y - h * 0.4, x - w * 0.36, y - h * 0.55, x - w * 0.46, y - h * 0.8)
    g.bezierCurveTo(x - w * 0.52, y - h * 1.02, x + w * 0.1, y - h * 1.08, x + w * 0.38, y - h * 0.94)
    g.bezierCurveTo(x + w * 0.6, y - h * 0.76, x + w * 0.4, y - h * 0.5, x + w * 0.52, y - h * 0.3)
    g.quadraticCurveTo(x + w * 0.62, y - h * 0.1, x + w / 2, y)
    g.closePath()
  }
  rockMass(g, path, [x - w / 2, y - h, w, h], 7, [w * 0.22, h * 0.08], [[x - w * 0.6, y - h * 0.9], [x - w * 0.1, y - h * 1.04], [x + w * 0.5, y - h * 0.92]], 2)
  g.beginPath()
  for (const [dx, dy] of [[-0.3, -0.98], [0.02, -1.06], [0.3, -0.96]] as const) {
    g.moveTo(x + w * dx + 7, y + h * dy)
    g.arc(x + w * dx, y + h * dy, 7, 0, TAU)
  }
  fill(g, C.flowerPink)
  ink(g, 2.4)
  foam(g, x, y, w + 30)
}

/** A curling wave standing on the water at (x, y), w × h, breaking toward `dir`. */
export const curlWave = (g: G2D, x: number, y: number, w: number, h: number, dir = 1): void => {
  g.save()
  g.translate(x, y)
  if (dir < 0) g.scale(-1, 1)
  const body = (): void => {
    g.beginPath()
    g.moveTo(-w / 2, 6)
    g.bezierCurveTo(-w * 0.26, 0, -w * 0.12, -h * 0.94, w * 0.14, -h)
    g.bezierCurveTo(w * 0.34, -h * 1.02, w * 0.42, -h * 0.74, w * 0.3, -h * 0.6)
    g.bezierCurveTo(w * 0.22, -h * 0.5, w * 0.26, -h * 0.2, w / 2, 6)
    g.closePath()
  }
  body()
  fill(g, BAY.sea)
  g.save()
  body()
  g.clip()
  g.beginPath()
  g.moveTo(-w * 0.3, 10)
  g.bezierCurveTo(-w * 0.14, -h * 0.1, -w * 0.02, -h * 0.72, w * 0.16, -h * 0.8)
  g.lineWidth = h * 0.16
  g.strokeStyle = BAY.seaLite
  g.stroke()
  g.beginPath()
  g.ellipse(w * 0.36, -h * 0.2, w * 0.2, h * 0.5, 0, 0, TAU)
  fill(g, BAY.seaDeep)
  g.restore()
  g.beginPath()
  g.moveTo(-w / 2, 6)
  g.bezierCurveTo(-w * 0.26, 0, -w * 0.12, -h * 0.94, w * 0.14, -h)
  g.bezierCurveTo(w * 0.34, -h * 1.02, w * 0.42, -h * 0.74, w * 0.3, -h * 0.6)
  g.bezierCurveTo(w * 0.22, -h * 0.5, w * 0.26, -h * 0.2, w / 2, 6)
  ink(g)
  // The foam crest and its curl.
  lumpy(g, [[-w * 0.06, -h * 0.9, 13], [w * 0.08, -h * 0.99, 15], [w * 0.22, -h * 0.97, 14], [w * 0.32, -h * 0.82, 12]], '#ffffff', 3.5)
  g.beginPath()
  g.arc(w * 0.28, -h * 0.74, h * 0.1, PI * 0.9, PI * 2.6)
  ink(g, 3)
  g.restore()
  foam(g, x, y + 4, w * 1.05)
}

/* ------------------------------------------------- the sea-unicorn foal */

/** The sea-unicorn foal, its neck rising from (x, y), facing `dir`. `blow`
 *  0..1 purses its mouth into an "o". */
export const seaFoal = (g: G2D, x: number, y: number, s: number, dir: number, blow: number): void => {
  g.save()
  g.translate(x, y)
  if (dir < 0) g.scale(-1, 1)
  const painted = drawItem(g, SEA_FOAL_ART, SEA_FOAL_UNIT * s, blow > 0.3 ? 1 : 0)
  if (!painted) seaFoalShape(g, s, blow)
  g.restore()
}

/** Horn tip (-134) to the neck's cut (+12) at scale 1 — the foal's own height
 *  in SU, which the SIZE clause and the line weight are judged against. */
const SEA_FOAL_UNIT = 146

/**
 * The sea-foal's two moments, side by side (`CREATURE_ART.seaFoal`): the
 * mouth shut as she rises, then rounded to blow her bubble ring. One look, so
 * nothing is tinted — the bay dresses every foal the same.
 */
export const SEA_FOAL_ART: ItemSpec = {
  ...CREATURE_ART.seaFoal, frames: 2,
  draw: (g, s, f) => {
    const k = s / SEA_FOAL_UNIT
    g.save()
    g.scale(k, k)
    seaFoalShape(g, 1, f)
    g.restore()
  }
}

/** The foal itself, neck-base at the origin, facing +x, in its own units. */
const seaFoalShape = (g: G2D, s: number, blow: number): void => {
  const S = (v: number): number => v * s
  // The fin ear, behind the head.
  g.beginPath()
  g.moveTo(S(-12), S(-86))
  g.quadraticCurveTo(S(-36), S(-98), S(-30), S(-122))
  g.quadraticCurveTo(S(-10), S(-110), S(2), S(-94))
  g.closePath()
  fill(g, BAY.mane)
  ink(g, 3.5)
  g.beginPath()
  g.moveTo(S(-10), S(-92))
  g.lineTo(S(-24), S(-110))
  g.moveTo(S(-4), S(-96))
  g.lineTo(S(-12), S(-110))
  g.lineWidth = 2.4
  g.strokeStyle = '#ffffff'
  g.stroke()
  // Mane locks down the back of the neck.
  lumpy(g, [[S(-26), S(-30), S(14)], [S(-30), S(-56), S(16)], [S(-22), S(-82), S(16)]], BAY.mane, 4)
  g.beginPath()
  g.arc(S(-32), S(-54), S(7), 0, TAU)
  fill(g, BAY.maneLilac)
  // Neck.
  g.beginPath()
  g.moveTo(S(-22), S(12))
  g.bezierCurveTo(S(-24), S(-18), S(-22), S(-44), S(-10), S(-62))
  g.lineTo(S(16), S(-52))
  g.bezierCurveTo(S(14), S(-30), S(16), S(-8), S(22), S(12))
  g.closePath()
  fill(g, BAY.coat)
  ink(g)
  g.beginPath()
  for (const [dx, dy, r] of [[-6, -20, 4], [4, -34, 3.2], [-8, -40, 2.6]] as const) {
    g.moveTo(S(dx + r), S(dy))
    g.arc(S(dx), S(dy), S(r), 0, TAU)
  }
  fill(g, BAY.mane)
  // Head.
  const head = (): void => {
    g.beginPath()
    g.ellipse(S(4), S(-72), S(30), S(27), 0, 0, TAU)
  }
  head()
  fill(g, BAY.coat)
  g.save()
  head()
  g.clip()
  g.beginPath()
  g.ellipse(S(4), S(-40), S(34), S(16), 0, 0, TAU)
  fill(g, BAY.coatShade)
  g.restore()
  head()
  ink(g)
  // Muzzle, nostril and mouth.
  g.beginPath()
  g.ellipse(S(28), S(-60), S(18), S(14), 0.15, 0, TAU)
  fill(g, BAY.muzzle)
  ink(g, 4)
  g.beginPath()
  g.arc(S(38), S(-65), S(2.3), 0, TAU)
  fill(g, INK)
  g.beginPath()
  if (blow > 0.3) {
    g.arc(S(44), S(-53), S(3 + 2 * blow), 0, TAU)
    fill(g, '#ff8fb0')
    ink(g, 2.4)
  } else {
    g.arc(S(33), S(-58), S(6), 0.4, PI - 0.7)
    ink(g, 2.4)
  }
  // The eye: big, glossy, two catch-lights, two lashes.
  g.beginPath()
  g.ellipse(S(8), S(-76), S(8.5), S(10.5), 0, 0, TAU)
  fill(g, INK)
  g.beginPath()
  g.ellipse(S(8.6), S(-73.6), S(6.4), S(7.4), 0, 0, TAU)
  fill(g, BAY.iris)
  g.beginPath()
  g.ellipse(S(9), S(-73), S(3.4), S(4.4), 0, 0, TAU)
  fill(g, INK)
  g.beginPath()
  g.arc(S(11), S(-80), S(3.2), 0, TAU)
  g.moveTo(S(7.4), S(-70))
  g.arc(S(5.8), S(-70), S(1.6), 0, TAU)
  fill(g, '#ffffff')
  g.beginPath()
  g.moveTo(S(0), S(-83))
  g.lineTo(S(-6), S(-87))
  g.moveTo(S(3), S(-86))
  g.lineTo(S(-1), S(-92))
  ink(g, 2.4)
  g.globalAlpha = 0.55
  g.beginPath()
  g.ellipse(S(19), S(-62), S(6), S(3.5), 0, 0, TAU)
  fill(g, BAY.blush)
  g.globalAlpha = 1
  // Horn, then the forelock over its root.
  g.beginPath()
  g.moveTo(S(-6), S(-94))
  g.quadraticCurveTo(S(4), S(-114), S(14), S(-134))
  g.quadraticCurveTo(S(15), S(-112), S(12), S(-96))
  g.closePath()
  fill(g, BAY.horn)
  ink(g, 3.5)
  g.beginPath()
  g.moveTo(S(-2), S(-104))
  g.quadraticCurveTo(S(6), S(-101), S(13), S(-106))
  g.moveTo(S(3), S(-115))
  g.quadraticCurveTo(S(9), S(-113), S(13), S(-117))
  g.lineWidth = 2.6
  g.strokeStyle = BAY.hornBand
  g.stroke()
  g.beginPath()
  g.ellipse(S(-8), S(-94), S(13), S(8), -0.5, 0, TAU)
  fill(g, BAY.maneLilac)
  ink(g, 3)
}

/** The ring's half-height it is authored at, in SU. */
const RING_UNIT = 24

/** A bubble ring about the origin, half-height `r`: a see-through torus —
 *  its skin between two ellipses, the hole open — and one highlight. */
const bubbleRingShape = (g: G2D, r: number, skin: string): void => {
  g.beginPath()
  g.ellipse(0, 0, r * 0.8, r, 0, 0, TAU)
  g.moveTo(r * 0.42, 0)
  g.ellipse(0, 0, r * 0.42, r * 0.58, 0, 0, TAU)
  g.fillStyle = skin
  g.fill('evenodd')
  g.lineWidth = 2.6
  g.strokeStyle = INK
  g.stroke()
  g.beginPath()
  g.ellipse(-r * 0.5, -r * 0.5, r * 0.12, r * 0.2, 0.5, 0, TAU)
  fill(g, '#ffffff')
}

/**
 * The sea-foal's BUBBLE RING as a painted still (2-x taps): one torus of
 * soap-skin with its middle open, which the foal blows and which swells as it
 * drifts off — a scale and a translate. Drawn OPAQUE (the game's is 85 %
 * skin): a see-through reference over magenta is a pink one.
 */
export const BUBBLE_RING_ART: ItemSpec = {
  ...PROP_ART.bubbleRing, frames: 1,
  draw: (g, s) => {
    g.save()
    g.scale(s / RING_UNIT, s / RING_UNIT)
    bubbleRingShape(g, RING_UNIT, '#cdf7ff')
    g.restore()
  }
}

/** A bubble ring (a soap-bubble torus), centred (x, y). */
export const bubbleRing = (g: G2D, x: number, y: number, r: number, a: number): void => {
  if (a <= 0) return
  g.globalAlpha = a
  g.save()
  g.translate(x, y)
  const blown = drawItem(g, BUBBLE_RING_ART, r)
  g.restore()
  if (blown) {
    g.globalAlpha = 1
    return
  }
  g.beginPath()
  g.ellipse(x, y, r * 0.8, r, 0, 0, TAU)
  g.moveTo(x + r * 0.42, y)
  g.ellipse(x, y, r * 0.42, r * 0.58, 0, 0, TAU)
  g.fillStyle = 'rgba(205,247,255,0.85)'
  g.fill('evenodd')
  g.lineWidth = 2.6
  g.strokeStyle = INK
  g.stroke()
  g.beginPath()
  g.ellipse(x - r * 0.5, y - r * 0.5, r * 0.12, r * 0.2, 0.5, 0, TAU)
  fill(g, '#ffffff')
  g.globalAlpha = 1
}

/** Where and how a foal peeks: its neck base when out (x, y), facing `dir`,
 *  scale `s`; `waterY` is the line it rises from; `rise` how far below it
 *  hides; `lean` a sideways slide as it comes out. */
export interface PeekSpot { x: number; y: number; dir: number; s: number; waterY: number; rise: number; lean?: number }

/**
 * The tap creature's draw (§8.8 beat 2): the foal rises from the water
 * behind its hiding prop, whose FRONT `front` redraws on top (so k = 0 is
 * the prop alone), then blows a bubble ring.
 */
export const peekFoal = (g: G2D, p: PeekSpot, k: number, t: number, front: (g: G2D) => void): void => {
  const e = ease(k)
  const lean = (p.lean ?? 0) * e
  const fy = p.y + (1 - e) * p.rise
  if (k > 0.001) {
    g.save()
    g.beginPath()
    g.rect(p.x - 300, p.waterY - 600, 600, 600)
    g.clip()
    seaFoal(g, p.x + lean, fy, p.s, p.dir, clamp((k - 0.45) * 3, 0, 1))
    g.restore()
  }
  tapCover(g, front)
  if (k <= 0.5) return
  const u = clamp((k - 0.5) / 0.5, 0, 1)
  const mx = p.x + lean + p.dir * 46 * p.s
  const my = fy - 53 * p.s
  const d = u * (0.7 + 0.3 * ((t * 0.9) % 1))
  bubbleRing(g, mx + p.dir * (18 + 62 * d) * p.s, my - (6 + 40 * d) * p.s, (10 + 22 * d) * p.s, u)
  g.globalAlpha = u
  g.beginPath()
  for (let i = 0; i < 2; i++) {
    const q = (d + i * 0.4) % 1
    const bx = mx + p.dir * (10 + 40 * q) * p.s
    const by = my - (20 + 70 * q) * p.s
    if (bubbleAt(g, bx, by, 5, '#e1fcff')) continue
    g.moveTo(bx + 5, by)
    g.arc(bx, by, 5, 0, TAU)
  }
  g.fillStyle = 'rgba(225,252,255,0.7)'
  g.fill()
  g.lineWidth = 2
  g.strokeStyle = INK
  g.stroke()
  g.globalAlpha = 1
}

/* ------------------------------------------------------ the Singing Shell */

const note = (g: G2D, x: number, y: number, s: number, col: string): void => {
  // The shared painted note (`prop-note`, the carousel's): its head is 9 of
  // its 18 units across, this one's 7.5 · s.
  g.save()
  g.translate(x, y)
  const sung = drawItem(g, NOTE_ART, 15 * s, 0, col)
  g.restore()
  if (sung) return
  g.beginPath()
  g.moveTo(x + 6 * s, y - 2 * s)
  g.lineTo(x + 6 * s, y - 26 * s)
  g.quadraticCurveTo(x + 18 * s, y - 20 * s, x + 16 * s, y - 10 * s)
  ink(g, 2.8)
  g.beginPath()
  g.ellipse(x, y, 7.5 * s, 5.5 * s, -0.4, 0, TAU)
  fill(g, col)
  ink(g, 2.4)
}

/**
 * The Singing Shell, the chapter's rescue (§8.8 beat 3): a pearly spiral
 * shell lying on (x, y). k = 0: shut, asleep and dim; k = 1: its lip open,
 * awake and glowing, singing little notes.
 */
export const singingShell = (g: G2D, x: number, y: number, s: number, k: number, t: number): void => {
  const o = ease(k)
  const S = (v: number): number => v * s
  if (k > 0) {
    g.globalAlpha = 0.25 * k
    g.beginPath()
    g.arc(x, y - S(40), S(84), 0, TAU)
    fill(g, '#fff4fb')
    g.globalAlpha = 0.35 * k
    g.beginPath()
    g.arc(x, y - S(40), S(60), 0, TAU)
    fill(g, '#ffe3f4')
    g.globalAlpha = 1
  }
  g.globalAlpha = 0.25
  g.beginPath()
  g.ellipse(x + S(6), y, S(50), S(9), 0, 0, TAU)
  fill(g, INK)
  g.globalAlpha = 1
  g.save()
  g.translate(x, y)
  const painted = drawItem(g, SHELL_ART, SHELL_UNIT * s, k < 0.5 ? 0 : 1)
  g.restore()
  if (!painted) shellShape(g, x, y, s, k, o)
  if (k > 0.2) shellNotes(g, x + S(36), y - S(30), s, k, t)
}

/** Spire tip (-98) to the foot of the body whorl (0) at scale 1. */
const SHELL_UNIT = 98

/**
 * The Singing Shell's two states (`CREATURE_ART.singingShell`): asleep under
 * the dust, then awake and singing. The HALO, the contact shadow on the sand
 * and the notes drifting out of its lip stay drawn — a wash, a shadow the
 * painting must not carry, and a particle stream.
 */
export const SHELL_ART: ItemSpec = {
  ...CREATURE_ART.singingShell, frames: 2,
  draw: (g, sz, f) => {
    const k = sz / SHELL_UNIT
    g.save()
    g.scale(k, k)
    shellShape(g, 0, 0, 1, f, ease(f))
    g.restore()
  }
}

/** Notes drifting up out of the shell's lip at (lx, ly). */
const shellNotes = (g: G2D, lx: number, ly: number, s: number, k: number, t: number): void => {
  const S = (v: number): number => v * s
  const cols = [C.flowerPink, BAY.coralLilac, '#3ee3d4']
  for (let i = 0; i < 3; i++) {
    const u = (t * 0.45 + i / 3) % 1
    g.globalAlpha = clamp((k - 0.2) * 2, 0, 1) * (u < 0.15 ? u / 0.15 : 1 - (u - 0.15) / 0.85)
    note(g, lx + S(14 + u * 56 + sin(u * 6 + i * 2) * 9), ly - S(20 + u * 90), s * 1.35, cols[i]!)
  }
  g.globalAlpha = 1
}

/** The shell itself — the drawing the painting stands in for. */
const shellShape = (g: G2D, x: number, y: number, s: number, k: number, o: number): void => {
  const S = (v: number): number => v * s
  // The spire: whorls stacked up and to the left, smallest first.
  const whorls: readonly (readonly [number, number, number, number])[] = [
    [-40, -92, 7, 6], [-32, -82, 13, 9], [-20, -68, 21, 13]
  ]
  for (let i = 0; i < whorls.length; i++) {
    const [dx, dy, rx, ry] = whorls[i]!
    g.beginPath()
    g.ellipse(x + S(dx), y + S(dy), S(rx), S(ry), -0.5, 0, TAU)
    fill(g, i % 2 ? BAY.pearl : BAY.pearlShade)
    ink(g, 3)
  }
  // The body whorl.
  const body = (): void => {
    g.beginPath()
    g.ellipse(x, y - S(30), S(40), S(30), -0.15, 0, TAU)
  }
  body()
  fill(g, BAY.pearl)
  g.save()
  body()
  g.clip()
  g.beginPath()
  g.ellipse(x + S(10), y - S(4), S(44), S(16), 0, 0, TAU)
  fill(g, BAY.pearlShade)
  g.beginPath()
  g.arc(x - S(4), y - S(10), S(40), PI * 1.15, PI * 1.7)
  g.lineWidth = S(5)
  g.strokeStyle = '#c9f4f0'
  g.stroke()
  g.beginPath()
  g.arc(x - S(4), y - S(10), S(30), PI * 1.1, PI * 1.6)
  g.strokeStyle = '#e4d6ff'
  g.stroke()
  g.restore()
  body()
  ink(g)
  // The lip: a slit asleep, a flared pink bell awake.
  const lx = x + S(36)
  const ly = y - S(30)
  g.beginPath()
  g.ellipse(lx, ly, S(6 + 12 * o), S(16 + 12 * o), -0.15, 0, TAU)
  fill(g, '#ffd3ea')
  ink(g, 3.5)
  g.beginPath()
  g.ellipse(lx + S(1), ly, S(2 + 8 * o), S(10 + 9 * o), -0.15, 0, TAU)
  fill(g, '#ff8fc0')
  // The face.
  g.beginPath()
  const ey = y - S(30)
  if (k < 0.5) {
    g.moveTo(x - S(14), ey)
    g.quadraticCurveTo(x - S(9), ey + S(4), x - S(4), ey)
    g.moveTo(x + S(6), ey)
    g.quadraticCurveTo(x + S(11), ey + S(4), x + S(16), ey)
  } else {
    g.moveTo(x - S(14), ey + S(2))
    g.quadraticCurveTo(x - S(9), ey - S(6), x - S(4), ey + S(2))
    g.moveTo(x + S(6), ey + S(2))
    g.quadraticCurveTo(x + S(11), ey - S(6), x + S(16), ey + S(2))
  }
  ink(g, 2.6)
  g.beginPath()
  if (k < 0.5) g.arc(x + S(1), ey + S(10), S(3), 0.2, PI - 0.2)
  else g.ellipse(x + S(1), ey + S(12), S(4), S(5), 0, 0, TAU)
  if (k < 0.5) ink(g, 2.2)
  else {
    fill(g, '#ff8fb0')
    ink(g, 2.2)
  }
  g.globalAlpha = 0.5
  g.beginPath()
  g.ellipse(x - S(18), ey + S(8), S(5), S(3), 0, 0, TAU)
  g.moveTo(x + S(25), ey + S(8))
  g.ellipse(x + S(20), ey + S(8), S(5), S(3), 0, 0, TAU)
  fill(g, BAY.blush)
  g.globalAlpha = 1
  // Asleep: dimmed under a plum veil.
  if (k < 1) {
    g.globalAlpha = 0.34 * (1 - clamp(k * 1.5, 0, 1))
    body()
    g.moveTo(lx + S(18), ly)
    g.ellipse(lx, ly, S(6 + 12 * o), S(16 + 12 * o), -0.15, 0, TAU)
    for (const [dx, dy, rx, ry] of whorls) {
      g.moveTo(x + S(dx + rx), y + S(dy))
      g.ellipse(x + S(dx), y + S(dy), S(rx), S(ry), -0.5, 0, TAU)
    }
    fill(g, INK)
    g.globalAlpha = 1
  }

  g.globalAlpha = 1
}

/* ------------------------------------------------------- Pearl's clam */

/** Where the giant pearl sits in a clam hinged at (x, y), fan radius R. */
export const pearlOf = (x: number, y: number, R: number): readonly [number, number, number] => [x, y - R * 0.3, R * 0.3]

/** A giant open clam hinged at (x, y), fan radius R: its FAN and bowl are
 *  the landmark; the giant pearl sits between. */
export const clam = (g: G2D, x: number, y: number, R: number, pot: Pot): void => {
  const n = 9
  const a0 = -PI + 0.3
  const a1 = -0.3
  const fan = (): void => {
    g.beginPath()
    g.moveTo(x, y)
    g.lineTo(x + cos(a0) * R * 0.94, y + sin(a0) * R * 0.94)
    for (let i = 0; i < n; i++) {
      const am = a0 + ((i + 0.5) / n) * (a1 - a0)
      const ae = a0 + ((i + 1) / n) * (a1 - a0)
      g.quadraticCurveTo(x + cos(am) * R * 1.1, y + sin(am) * R * 1.1, x + cos(ae) * R * 0.94, y + sin(ae) * R * 0.94)
    }
    g.closePath()
  }
  fan()
  fill(g, pot.base)
  g.save()
  fan()
  g.clip()
  g.beginPath()
  for (let i = 1; i < n; i += 2) {
    const b0 = a0 + (i / n) * (a1 - a0)
    const b1 = a0 + ((i + 1) / n) * (a1 - a0)
    g.moveTo(x, y)
    g.lineTo(x + cos(b0) * R * 1.2, y + sin(b0) * R * 1.2)
    g.lineTo(x + cos(b1) * R * 1.2, y + sin(b1) * R * 1.2)
    g.closePath()
  }
  fill(g, pot.lite)
  g.beginPath()
  g.moveTo(x + R * 0.1, y - R * 1.2)
  g.lineTo(x + R * 1.2, y - R * 1.2)
  g.lineTo(x + R * 1.2, y + 10)
  g.lineTo(x + R * 0.1, y + 10)
  g.closePath()
  g.globalAlpha = 0.28
  fill(g, pot.shade)
  g.globalAlpha = 1
  g.beginPath()
  g.arc(x, y, R * 0.98, a0, a1)
  g.lineWidth = R * 0.08
  g.strokeStyle = pot.shade
  g.stroke()
  g.restore()
  fan()
  ink(g, 6)
  // The pearl's baked glow, then the pearl.
  const [px, py, pr] = pearlOf(x, y, R)
  const glow = g.createRadialGradient(px, py, pr * 0.6, px, py, pr * 2.4)
  glow.addColorStop(0, 'rgba(255,246,252,0.9)')
  glow.addColorStop(1, 'rgba(255,246,252,0)')
  g.fillStyle = glow
  g.beginPath()
  g.arc(px, py, pr * 2.4, 0, TAU)
  g.fill()
  const pearl = (): void => {
    g.beginPath()
    g.arc(px, py, pr, 0, TAU)
  }
  pearl()
  fill(g, BAY.pearl)
  g.save()
  pearl()
  g.clip()
  g.beginPath()
  g.arc(px + pr * 0.35, py + pr * 0.3, pr * 0.95, 0, TAU)
  fill(g, BAY.pearlShade)
  g.beginPath()
  g.arc(px - pr * 0.1, py - pr * 0.05, pr * 0.8, PI * 0.9, PI * 1.6)
  g.lineWidth = pr * 0.16
  g.strokeStyle = '#ffd6ee'
  g.stroke()
  g.beginPath()
  g.arc(px - pr * 0.1, py - pr * 0.05, pr * 0.6, PI * 0.95, PI * 1.55)
  g.strokeStyle = '#d6f6ff'
  g.stroke()
  g.beginPath()
  g.ellipse(px - pr * 0.4, py - pr * 0.45, pr * 0.2, pr * 0.13, -0.6, 0, TAU)
  fill(g, '#ffffff')
  g.restore()
  pearl()
  ink(g, 5)
  // The bowl in front.
  const bowl = (): void => {
    g.beginPath()
    g.moveTo(x - R * 0.86, y - R * 0.1)
    for (let i = 0; i < 7; i++) {
      const x0 = x - R * 0.86 + (i * R * 1.72) / 7
      g.quadraticCurveTo(x0 + (R * 1.72) / 14, y - R * 0.2, x0 + (R * 1.72) / 7, y - R * 0.1)
    }
    g.bezierCurveTo(x + R * 0.8, y + R * 0.22, x + R * 0.4, y + R * 0.3, x, y + R * 0.3)
    g.bezierCurveTo(x - R * 0.4, y + R * 0.3, x - R * 0.8, y + R * 0.22, x - R * 0.86, y - R * 0.1)
    g.closePath()
  }
  bowl()
  fill(g, pot.base)
  g.save()
  bowl()
  g.clip()
  g.beginPath()
  g.rect(x - R, y + R * 0.08, R * 2, R * 0.4)
  fill(g, pot.shade)
  g.beginPath()
  for (let i = -3; i <= 3; i++) {
    g.moveTo(x + i * R * 0.22, y - R * 0.12)
    g.quadraticCurveTo(x + i * R * 0.24, y + R * 0.1, x + i * R * 0.16, y + R * 0.3)
  }
  g.lineWidth = 3
  g.strokeStyle = pot.lite
  g.stroke()
  g.restore()
  bowl()
  ink(g, 6)
}

/** The pearl's glow pulsing and sparkles circling it — a live prop. */
export const pearlGlow = (g: G2D, px: number, py: number, pr: number, t: number, alive: number): void => {
  if (alive <= 0) return
  const p = 0.5 + 0.5 * sin(t * 1.6)
  g.globalAlpha = alive * (0.1 + 0.1 * p)
  g.beginPath()
  g.arc(px, py, pr * (1.5 + 0.25 * p), 0, TAU)
  fill(g, '#ffffff')
  g.globalAlpha = 1
  for (let i = 0; i < 4; i++) {
    const a = t * 0.6 + (i * TAU) / 4
    GLOW_PTS[i]![0] = px + cos(a) * pr * 1.6
    GLOW_PTS[i]![1] = py + sin(a) * pr * 1.1
  }
  twinkles(g, GLOW_PTS, t, alive, 11)
}
const GLOW_PTS: [number, number][] = [[0, 0], [0, 0], [0, 0], [0, 0]]
