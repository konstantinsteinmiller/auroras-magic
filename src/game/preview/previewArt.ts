/**
 * previewArt.ts — the duel VS preview's paintable pieces, drawn (story-spec
 * §9.11; art-generation-pipeline). Phase 1 ships the DRAWINGS; the paintings
 * come later through the same round trip as every other family, and each
 * piece already has the ONE seam a painting would drop into:
 *
 *   id                 kind (proposed)  what it is                      the drawing
 *   ─────────────────  ───────────────  ──────────────────────────────  ─────────────────────
 *   vs-backdrop-land   page             the two halves, full-bleed,     `paintPreviewBackdrop`
 *   vs-backdrop-port   page             one picture per orientation     (w, h, portrait)
 *   vs-podium-dawn     island           Aurora's cloud-and-flower       `PODIUM_ART.dawn`
 *                                       pedestal, keyed                 (an `ItemSpec`)
 *   vs-podium-night    island           the foe's lilac cloud,          `PODIUM_ART.night`
 *                                       moon-silver sparkles, keyed
 *
 * WHY THOSE KINDS. The backdrop is full-bleed scenery with one picture per
 * orientation, which is what `page` already holds besides the chapters' own
 * pages (the front page, the cloth the book lies on) — sized like them, 16:9
 * and 9:16, stretched to the screen. A podium is what a duelist STANDS on:
 * the island's role, the island's size class, and the island's seating rule
 * (a painting is seated by the ground under the feet — the top surface here
 * is flat and level at y = 0 for exactly that reason). Both are registered
 * (`artIds.VS_PREVIEW_ART`, `artSheet.PREVIEW_SHEETS` and
 * `PREVIEW_BACKDROP_SHEETS`, `artDraw`), pointing at the painters below.
 *
 * The VS emblem, the two name ribbons and the boss crown are the DOM's
 * (`components/preview/*`), so their ids are listed here only for the loading
 * schedule (`PREVIEW_DOM_ART`), under the DOM chrome's kind, `worldUi`.
 *
 * STRETCH-SAFE. The backdrop is drawn in FRACTIONS of its box — the seam
 * (`SEAM_LAND` / `SEAM_PORT` below), the sun, the moon, the cloud banks —
 * so a 16:9 painting stretched onto a 19.5:9 phone keeps its seam exactly
 * where the drawing (and the layout) put it. Everything in it is soft (washes,
 * clouds, bokeh, paper), which is what survives a stretch.
 *
 * Not in either painting, and so drawn live over them (`previewDraw.ts`):
 * the foe's own glow (it is her palette's colour), the rays, the seam's
 * flash, the glitter, the podiums' halos (a halo on a keyed sheet is a darker
 * magenta that can never be cut away — the MAGENTA contract), the duelists.
 *
 * NOTHING ROUND IS PAINTED INTO THE BACKDROP. The painting is stretched to
 * the screen (`ensureBake`): 914 × 411 is 2.22:1 against the reference's
 * 16:9, 390 × 844 is 0.46 against 0.5625 — a quarter out either way. A soft
 * sky, a cloud, a haze and a pinprick star survive that; a moon, a sun's disc
 * and a bubble of light come back as ovals. So the MOON (and its halo) is
 * drawn live over either backdrop at a uniform scale (`paintPreviewMoon`),
 * and the reference (`paintPreviewBackdrop(…, ref)`) leaves out the sun's
 * disc and its rings of haze, the bokeh and the paper grain: the painted sun
 * is its bloom alone, and the painting brings its own paper. The drawing,
 * which is always drawn at the screen's own shape, keeps all of them.
 */
import type { ItemSpec } from '@/game/artItem'
import type { ArtKind, ArtWant } from '@/game/art'

type G2D = CanvasRenderingContext2D

/* ──────────────────────────────────── ids ─────────────────────────────── */

/** The proposed kinds (see the header). */
export const VS_BACKDROP_KIND: ArtKind = 'page'
export const VS_PODIUM_KIND: ArtKind = 'island'

export const vsBackdropArtId = (portrait: boolean): string => `vs-backdrop-${portrait ? 'port' : 'land'}`
export const VS_PODIUM_IDS = { dawn: 'vs-podium-dawn', night: 'vs-podium-night' } as const

/** The reference size of a backdrop painting: a true 16:9 / 9:16, the
 *  aspects a painter can be asked for by name (the wardrobe's reasoning). */
export const VS_BACKDROP_REF_LONG = 1152

/** The DOM's four painted marks (`components/preview/*`), for the schedule. */
export const PREVIEW_DOM_ART: readonly ArtWant[] = [
  ['worldUi', 'vs-ribbon-aurora'],
  ['worldUi', 'vs-ribbon-foe'],
  ['worldUi', 'vs-emblem'],
  ['worldUi', 'vs-crown']
]

/** Every painting the preview itself can show, both orientations. */
export const PREVIEW_CANVAS_ART: readonly ArtWant[] = [
  [VS_BACKDROP_KIND, vsBackdropArtId(false)],
  [VS_BACKDROP_KIND, vsBackdropArtId(true)],
  [VS_PODIUM_KIND, VS_PODIUM_IDS.dawn],
  [VS_PODIUM_KIND, VS_PODIUM_IDS.night]
]

/**
 * The seam between the halves, in FRACTIONS of the screen: a point and a
 * direction. Fractions, not pixels, so a painted backdrop stretched to any
 * screen keeps its seam exactly where the drawn one is — and the layout
 * (`preview.ts`) puts the VS emblem on that point. Landscape leans ~12° off
 * the vertical at 16:9; portrait runs down to the right, the foe's night above
 * it and Aurora's dawn below. Portrait's point sits a little under the
 * middle: the foe's half carries the banner and her crown, Aurora's the
 * countdown stars, and 0.52 is where the two stacks balance on every phone
 * and tablet shape.
 *
 * HERE, not in `preview.ts`, because this file is imported by the loading
 * schedule (`artSchedule.ts`), which runs before the game's code has arrived:
 * it must stay free of runtime imports.
 */
export const SEAM_LAND = { cx: 0.5, cy: 0.47, dx: -0.12, dy: 1 } as const
export const SEAM_PORT = { cx: 0.5, cy: 0.52, dx: 1, dy: 0.2 } as const

/* ───────────────────────────────── the palette ────────────────────────── */

/** The one ink (art-style.md §2): warm deep plum, never black. */
export const INK = '#3A2340'

/** Aurora's dawn, top → foot: rose, peach, butter, warm gold. */
const DAWN = ['#ffc3d3', '#ffd3c2', '#ffe5b4', '#ffd98e'] as const
/** The friendly night (`--am-moon-*`'s family), top → foot. */
const NIGHT = ['#2b2048', '#382a5c', '#46346c', '#503a74'] as const

/** A deterministic dice, so the reference and the game draw the same picture. */
const dice = (seed: number): (() => number) => {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

/* ─────────────────────────────── shape helpers ────────────────────────── */

/** A cloud bank along a baseline: overlapping puffs, one path, one fill. */
const cloudBank = (
  g: G2D, x0: number, x1: number, base: number, r0: number, r1: number, rnd: () => number, bottom: number
): void => {
  g.beginPath()
  g.moveTo(x0 - r1, bottom)
  let x = x0 - r1 * 0.5
  while (x < x1 + r1) {
    const r = r0 + (r1 - r0) * rnd()
    const y = base - r * (0.35 + 0.3 * rnd())
    g.moveTo(x + r, y)
    g.arc(x, y, r, 0, Math.PI * 2)
    x += r * (0.9 + 0.5 * rnd())
  }
  g.moveTo(x0 - r1, base)
  g.rect(x0 - r1, base - r0 * 0.2, x1 - x0 + 2 * r1, bottom - base + r0 * 0.2)
}

/**
 * The painter's reference draws the cloud banks SOFT — a blur, in the
 * reference only (`ref`). Its hard scallops came back as a cartoon: the first
 * landscape return ran a plum line along the top of every bump, though the
 * reference inks none of them (2026-09-25). A painter shown a hard edge draws
 * one; shown a soft mass, it paints a cloud.
 */
const refClouds = (m: number): string => `blur(${(m * 0.014).toFixed(1)}px)`

/** A four-point sparkle, centred, `r` its long arm. */
export const sparkle = (g: G2D, x: number, y: number, r: number): void => {
  const k = r * 0.28
  g.moveTo(x, y - r)
  g.quadraticCurveTo(x + k * 0.35, y - k * 0.35, x + r, y)
  g.quadraticCurveTo(x + k * 0.35, y + k * 0.35, x, y + r)
  g.quadraticCurveTo(x - k * 0.35, y + k * 0.35, x - r, y)
  g.quadraticCurveTo(x - k * 0.35, y - k * 0.35, x, y - r)
  g.closePath()
}

/** A five-point star, centred, `r` its outer radius. */
export const star5 = (g: G2D, x: number, y: number, r: number, rot = 0): void => {
  for (let i = 0; i < 10; i++) {
    const a = rot - Math.PI / 2 + (i * Math.PI) / 5
    const rr = i & 1 ? r * 0.46 : r
    if (i) g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
    else g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
  }
  g.closePath()
}

/**
 * A crescent moon: the disc at (x, y) radius `r`, less a bite of radius
 * `br` whose centre sits `d` away at angle `a` — one closed path, so it fills
 * (and later paints) as ONE shape, never a ring. Two arcs between the circles'
 * crossing points: the outer rim the long way round, the bite's edge back.
 */
export const crescent = (g: G2D, x: number, y: number, r: number, br: number, d: number, a: number): void => {
  const bx = x + Math.cos(a) * d
  const by = y + Math.sin(a) * d
  // Where the two circles cross (they always do for a crescent's numbers).
  const k = (r * r - br * br + d * d) / (2 * d)
  const h = Math.sqrt(Math.max(0, r * r - k * k))
  const mx = x + Math.cos(a) * k
  const my = y + Math.sin(a) * k
  const p1x = mx - Math.sin(a) * h
  const p1y = my + Math.cos(a) * h
  const p2x = mx + Math.sin(a) * h
  const p2y = my - Math.cos(a) * h
  const a1 = Math.atan2(p1y - y, p1x - x)
  const a2 = Math.atan2(p2y - y, p2x - x)
  const b1 = Math.atan2(p1y - by, p1x - bx)
  const b2 = Math.atan2(p2y - by, p2x - bx)
  g.moveTo(p1x, p1y)
  // The rim: from p1 to p2 through the side facing AWAY from the bite.
  g.arc(x, y, r, a1, a2, false)
  // The bite's edge: from p2 back to p1 through the side INSIDE the disc.
  g.arc(bx, by, br, b2, b1, true)
  g.closePath()
}

/** The half of a `w` × `h` box on one side of the seam, as a clip path. */
export const halfPath = (g: G2D, w: number, h: number, portrait: boolean, heroSide: boolean): void => {
  const n = portrait ? SEAM_PORT : SEAM_LAND
  const px = n.cx * w
  const py = n.cy * h
  let dx = n.dx * w
  let dy = n.dy * h
  const l = Math.hypot(dx, dy) || 1
  dx /= l
  dy /= l
  // The normal that points into Aurora's half: left in landscape, down in
  // portrait (the seam runs down its length / across its width).
  let nx = -dy
  let ny = dx
  const toHero = portrait ? ny > 0 : nx < 0
  if (toHero !== heroSide) {
    nx = -nx
    ny = -ny
  }
  const F = (w + h) * 2
  g.beginPath()
  g.moveTo(px - dx * F, py - dy * F)
  g.lineTo(px + dx * F, py + dy * F)
  g.lineTo(px + dx * F + nx * F, py + dy * F + ny * F)
  g.lineTo(px - dx * F + nx * F, py - dy * F + ny * F)
  g.closePath()
}

/* ─────────────────────────────── the backdrop ─────────────────────────── */

/** Where each half's light sits, in fractions: Aurora's low sun, the foe's moon. */
const SUN = { land: [0.24, 0.5], port: [0.3, 0.74] } as const
const MOON = { land: [0.9, 0.16], port: [0.1, 0.095] } as const

/**
 * The dawn half: rose sky to gold, a low soft sun behind where Aurora
 * stands, a bank of pink clouds along her foot, warm bokeh. `ref` (the
 * painter's reference) keeps only what survives a stretch: the sun is its
 * bloom, with no disc, no rings and no bokeh (see the header).
 */
const paintDawn = (g: G2D, w: number, h: number, portrait: boolean, ref = false): void => {
  const m = Math.min(w, h)
  const sky = g.createLinearGradient(0, portrait ? h * 0.35 : 0, 0, h)
  sky.addColorStop(0, DAWN[0])
  sky.addColorStop(0.42, DAWN[1])
  sky.addColorStop(0.78, DAWN[2])
  sky.addColorStop(1, DAWN[3])
  g.fillStyle = sky
  g.fillRect(0, 0, w, h)
  // The low sun: a wide warm bloom and a pale disc sitting in it.
  const [sx, sy] = portrait ? SUN.port : SUN.land
  const cx = sx * w
  const cy = sy * h
  const bloom = g.createRadialGradient(cx, cy, 0, cx, cy, m * 0.62)
  bloom.addColorStop(0, 'rgba(255,250,226,0.95)')
  bloom.addColorStop(0.28, 'rgba(255,238,184,0.6)')
  bloom.addColorStop(1, 'rgba(255,214,170,0)')
  g.fillStyle = bloom
  g.fillRect(0, 0, w, h)
  if (!ref) {
    g.fillStyle = 'rgba(255,251,236,0.85)'
    g.beginPath()
    g.arc(cx, cy, m * 0.1, 0, Math.PI * 2)
    g.fill()
    // Two rings of haze round the sun, the way a watercolour sun bleeds.
    g.strokeStyle = 'rgba(255,246,214,0.5)'
    g.lineWidth = m * 0.012
    g.beginPath()
    g.arc(cx, cy, m * 0.145, 0, Math.PI * 2)
    g.stroke()
    g.strokeStyle = 'rgba(255,246,214,0.25)'
    g.lineWidth = m * 0.008
    g.beginPath()
    g.arc(cx, cy, m * 0.2, 0, Math.PI * 2)
    g.stroke()
    // Bokeh: soft discs of light, more of them high up.
    const rnd = dice(portrait ? 311 : 131)
    const cols = ['rgba(255,252,238,0.42)', 'rgba(255,214,120,0.3)', 'rgba(255,170,200,0.28)', 'rgba(255,236,190,0.36)']
    for (let i = 0; i < 26; i++) {
      const r = m * (0.012 + 0.036 * rnd() * rnd())
      g.fillStyle = cols[i % cols.length]!
      g.beginPath()
      g.arc(rnd() * w, (portrait ? 0.35 + 0.6 * rnd() : 0.85 * rnd() * rnd()) * h, r, 0, Math.PI * 2)
      g.fill()
    }
  }
  // The cloud sea along her foot: a rosy back bank, a creamy front one.
  const crnd = dice(portrait ? 57 : 75)
  if (ref) g.filter = refClouds(m)
  g.fillStyle = 'rgba(255,183,206,0.9)'
  cloudBank(g, 0, w, h * 0.86, m * 0.05, m * 0.1, crnd, h + m)
  g.fill()
  g.fillStyle = '#fff2ec'
  cloudBank(g, 0, w, h * 0.95, m * 0.045, m * 0.085, crnd, h + m)
  g.fill()
  g.filter = 'none'
  // A blush of peach on the front bank's underside.
  const under = g.createLinearGradient(0, h * 0.9, 0, h)
  under.addColorStop(0, 'rgba(255,200,170,0)')
  under.addColorStop(1, 'rgba(255,190,160,0.55)')
  g.fillStyle = under
  g.fillRect(0, h * 0.9, w, h * 0.1)
}

/**
 * The friendly night: indigo into violet, a sky of little stars, a bank of
 * lilac clouds. Dreamy, never menacing — the same night the foe's HP frame is
 * made of. Its warm crescent moon is not here: it is round, so it is drawn
 * live over the backdrop, painted or drawn (`paintPreviewMoon`). `ref` leaves
 * out the bokeh (see the header).
 */
const paintNight = (g: G2D, w: number, h: number, portrait: boolean, ref = false): void => {
  const m = Math.min(w, h)
  const foot = portrait ? h * 0.62 : h
  const sky = g.createLinearGradient(0, 0, 0, foot)
  sky.addColorStop(0, NIGHT[0])
  sky.addColorStop(0.4, NIGHT[1])
  sky.addColorStop(0.75, NIGHT[2])
  sky.addColorStop(1, NIGHT[3])
  g.fillStyle = sky
  g.fillRect(0, 0, w, h)
  // Stars: pinpricks, then a few four-point twinkles.
  const rnd = dice(portrait ? 911 : 191)
  g.fillStyle = 'rgba(244,245,253,0.85)'
  g.beginPath()
  for (let i = 0; i < 90; i++) {
    const x = rnd() * w
    const y = rnd() * foot * 0.95
    const r = m * (0.0016 + 0.003 * rnd())
    g.moveTo(x + r, y)
    g.arc(x, y, r, 0, Math.PI * 2)
  }
  g.fill()
  g.fillStyle = 'rgba(220,224,245,0.9)'
  g.beginPath()
  for (let i = 0; i < 12; i++) sparkle(g, rnd() * w, rnd() * foot * 0.8, m * (0.008 + 0.012 * rnd()))
  g.fill()
  // Bokeh in lilac, silver and sky.
  if (!ref) {
    const cols = ['rgba(199,166,255,0.24)', 'rgba(220,224,245,0.2)', 'rgba(159,216,255,0.18)', 'rgba(255,158,207,0.14)']
    for (let i = 0; i < 22; i++) {
      const r = m * (0.012 + 0.034 * rnd() * rnd())
      g.fillStyle = cols[i % cols.length]!
      g.beginPath()
      g.arc(rnd() * w, rnd() * foot * 0.9, r, 0, Math.PI * 2)
      g.fill()
    }
  }
  // Lilac clouds along the night's foot.
  const crnd = dice(portrait ? 23 : 32)
  if (ref) g.filter = refClouds(m)
  g.fillStyle = 'rgba(107,85,160,0.95)'
  cloudBank(g, 0, w, foot * 0.88, m * 0.05, m * 0.1, crnd, foot + m)
  g.fill()
  g.fillStyle = 'rgba(145,122,200,0.95)'
  cloudBank(g, 0, w, foot * 0.97, m * 0.045, m * 0.085, crnd, foot + m)
  g.fill()
  g.filter = 'none'
}

/**
 * The night's MOON — a warm crescent in a soft halo — drawn LIVE over the
 * backdrop, whether that is the painting or the drawing (`ensureBake`).
 *
 * It is the one rigid round thing in the picture, and the painting is
 * stretched to the screen, so a painted moon would come back an oval on every
 * phone (see the header). Here it sits where the drawing always put it — the
 * night's top corner, in fractions of the screen — at a size taken from the
 * screen's SHORT side, so it is round at any shape. Clipped to the night's
 * half, so the halves' sweep-in carries it with them.
 */
export const paintPreviewMoon = (g: G2D, w: number, h: number, portrait: boolean): void => {
  const m = Math.min(w, h)
  const [mx, my] = portrait ? MOON.port : MOON.land
  const cx = mx * w
  const cy = my * h
  const mr = m * (portrait ? 0.05 : 0.07)
  g.save()
  halfPath(g, w, h, portrait, false)
  g.clip()
  const halo = g.createRadialGradient(cx, cy, mr * 0.6, cx, cy, mr * 4)
  halo.addColorStop(0, 'rgba(255,244,214,0.45)')
  halo.addColorStop(1, 'rgba(201,182,255,0)')
  g.fillStyle = halo
  g.fillRect(cx - mr * 4, cy - mr * 4, mr * 8, mr * 8)
  g.fillStyle = '#fff4d6'
  g.beginPath()
  crescent(g, cx, cy, mr, mr * 0.84, mr * 0.55, -0.6)
  g.fill()
  // A soft plum line on the inner edge only, the way a hand would ink it.
  g.strokeStyle = 'rgba(58,35,64,0.25)'
  g.lineWidth = mr * 0.06
  g.stroke()
  g.restore()
}

/** A tile of paper grain, made once. */
let grain: HTMLCanvasElement | null = null
const grainTile = (): HTMLCanvasElement | null => {
  if (grain) return grain
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 128
  const x = c.getContext('2d')
  if (!x) return null
  const rnd = dice(4242)
  for (let i = 0; i < 900; i++) {
    x.fillStyle = i & 1 ? 'rgba(58,35,64,0.07)' : 'rgba(255,250,236,0.09)'
    x.fillRect(rnd() * 128, rnd() * 128, 1 + rnd() * 1.4, 1 + rnd() * 1.4)
  }
  // A few fibres, the way a real page has them.
  x.strokeStyle = 'rgba(58,35,64,0.05)'
  x.lineWidth = 0.8
  for (let i = 0; i < 14; i++) {
    const px = rnd() * 128
    const py = rnd() * 128
    x.beginPath()
    x.moveTo(px, py)
    x.quadraticCurveTo(px + 6 * rnd(), py + 4 * rnd(), px + 10 * rnd() - 2, py + 8 * rnd() - 2)
    x.stroke()
  }
  grain = c
  return c
}

/**
 * THE backdrop, drawn: both halves in a `w` × `h` box at the origin, split by
 * the seam, with the seam's warm light, paper grain and a plum vignette.
 * Pure but for its size — the art bench renders the reference from this
 * very function at `VS_BACKDROP_REF_LONG` (with `ref`: only what survives
 * being stretched, see the header), and the game bakes it once per preview
 * layout (`previewDraw.ts`). The moon is not in it: `paintPreviewMoon` goes
 * on over it, painted or drawn.
 */
export const paintPreviewBackdrop = (g: G2D, w: number, h: number, portrait: boolean, ref = false): void => {
  g.save()
  halfPath(g, w, h, portrait, false)
  g.clip()
  paintNight(g, w, h, portrait, ref)
  g.restore()
  g.save()
  halfPath(g, w, h, portrait, true)
  g.clip()
  paintDawn(g, w, h, portrait, ref)
  g.restore()
  paintSeam(g, w, h, portrait, 1)
  // Paper grain over everything: it is one page of one book. Not in the
  // reference — a painter shown speckle paints noise, and brings its paper.
  const tile = ref ? null : grainTile()
  if (tile) {
    const p = g.createPattern(tile, 'repeat')
    if (p) {
      g.fillStyle = p
      g.fillRect(0, 0, w, h)
    }
  }
  // The vignette: plum, never black.
  const M = Math.max(w, h)
  const vg = g.createRadialGradient(w / 2, h / 2, M * 0.32, w / 2, h / 2, M * 0.78)
  vg.addColorStop(0, 'rgba(58,35,64,0)')
  vg.addColorStop(1, 'rgba(58,35,64,0.34)')
  g.fillStyle = vg
  g.fillRect(0, 0, w, h)
}

/**
 * The seam's band of warm light, with little sparkles strung along it.
 * `k` scales its width (the exit's bloom draws it wider, live).
 */
export const paintSeam = (g: G2D, w: number, h: number, portrait: boolean, k: number): void => {
  const n = portrait ? SEAM_PORT : SEAM_LAND
  const px = n.cx * w
  const py = n.cy * h
  const a = Math.atan2(n.dy * h, n.dx * w)
  const L = w + h
  const m = Math.min(w, h)
  const bw = m * 0.07 * k
  g.save()
  g.translate(px, py)
  g.rotate(a)
  const band = g.createLinearGradient(0, -bw, 0, bw)
  band.addColorStop(0, 'rgba(255,236,170,0)')
  band.addColorStop(0.35, 'rgba(255,230,160,0.55)')
  band.addColorStop(0.5, 'rgba(255,252,238,0.95)')
  band.addColorStop(0.65, 'rgba(255,230,160,0.55)')
  band.addColorStop(1, 'rgba(255,236,170,0)')
  g.fillStyle = band
  g.fillRect(-L, -bw, 2 * L, 2 * bw)
  g.fillStyle = '#fffaf0'
  g.fillRect(-L, -m * 0.0035, 2 * L, m * 0.007)
  // Sparkles strung along the light, gold and cream.
  const rnd = dice(portrait ? 77 : 707)
  g.beginPath()
  for (let x = -L * 0.5; x < L * 0.5; x += m * (0.05 + 0.05 * rnd())) {
    sparkle(g, x, (rnd() - 0.5) * bw * 0.9, m * (0.006 + 0.012 * rnd()))
  }
  g.fillStyle = '#fff6d0'
  g.fill()
  g.restore()
}

/* ───────────────────────────────── the podiums ────────────────────────── */

/**
 * A duelist's podium: a plump cloud cushion with a flat, level top she
 * stands on, drawn around the origin — the top's centre, where her hooves
 * go — at scale `s` (one of her stage units). Aurora's is a dawn cloud with
 * little flowers along its rim and gold stars tucked in its puffs; the foe's
 * is a lilac night cloud with moon-silver sparkles. Every width goes through
 * `s`, so the reference's lines are the game's lines at any size.
 *
 * `ref` is the painter's reference, which leaves out three things a painter
 * reads wrongly (the first rolls, 2026-09-25): the plum rim — a cloud has no
 * edge in life, and at half alpha over magenta it is a purple-pink ring; the
 * white lip on each puff, which came back as the gloss on a row of shiny
 * balls; and the top's deeper rim, which came back as the lip of a dish. The
 * top stays one pale oval.
 */
export const drawPodium = (g: G2D, s: number, night: boolean, ref = false): void => {
  const X = (v: number): number => v * s
  const body = night ? ['#f1ebff', '#cfc0f7', '#a893e6'] : ['#fff6f8', '#ffd0dd', '#f6a9c2']
  const top = night ? '#f7f3ff' : '#fffaf6'
  const rim = night ? '#e2d8ff' : '#ffe3ea'
  // The puffy underside: one silhouette of overlapping puffs under the top.
  const puffs: readonly (readonly [number, number, number])[] = [
    [-80, 14, 17], [-58, 24, 21], [-30, 31, 22], [0, 34, 23], [30, 31, 22], [58, 24, 21], [80, 14, 17]
  ]
  const outline = (): void => {
    g.beginPath()
    g.ellipse(0, 0, X(96), X(14), 0, 0, Math.PI * 2)
    for (const [x, y, r] of puffs) {
      g.moveTo(X(x + r), X(y))
      g.arc(X(x), X(y), X(r), 0, Math.PI * 2)
    }
    // Down to 18, not 14: at x ≈ ±15 the two middle puffs both start below
    // 14, and the gap showed as two dark notches under the top. Everywhere
    // else the puffs cover this band.
    g.rect(X(-96), 0, X(192), X(18))
  }
  const grad = g.createLinearGradient(0, X(-8), 0, X(58))
  grad.addColorStop(0, body[0]!)
  grad.addColorStop(0.45, body[1]!)
  grad.addColorStop(1, body[2]!)
  g.save()
  g.lineJoin = 'round'
  g.lineCap = 'round'
  // The soft ink first, wide, then the fill over its inner half: a drawn
  // line that is heavier underneath, where the cloud turns from the light.
  outline()
  if (!ref) {
    g.strokeStyle = INK
    g.globalAlpha = 0.5
    g.lineWidth = X(4.2)
    g.stroke()
    g.globalAlpha = 1
  }
  g.fillStyle = grad
  g.fill()
  // A lit lip along the top of each puff.
  if (!ref) {
    g.fillStyle = night ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.5)'
    g.beginPath()
    for (const [x, y, r] of puffs) {
      g.moveTo(X(x - r * 0.55), X(y - r * 0.35))
      g.arc(X(x - r * 0.15), X(y - r * 0.2), X(r * 0.45), Math.PI * 1.05, Math.PI * 1.75)
      g.closePath()
    }
    g.fill()
  }
  // The flat top she stands on, with a rim a shade deeper.
  g.beginPath()
  g.ellipse(0, 0, X(92), X(12), 0, 0, Math.PI * 2)
  g.fillStyle = ref ? top : rim
  g.fill()
  g.beginPath()
  g.ellipse(0, X(-1.5), X(84), X(8.5), 0, 0, Math.PI * 2)
  g.fillStyle = top
  g.fill()
  if (night) {
    // Moon-silver sparkles tucked into the puffs, and one small crescent.
    g.fillStyle = '#f4f5fd'
    g.beginPath()
    for (const [x, y, r] of [[-66, 26, 6], [-18, 38, 5], [44, 34, 6.5], [74, 18, 4.5], [8, 22, 3.5]] as const) sparkle(g, X(x), X(y), X(r))
    g.fill()
    g.fillStyle = '#fff4d6'
    g.beginPath()
    crescent(g, X(-40), X(20), X(6.5), X(5.4), X(3.4), -0.7)
    g.fill()
  } else {
    // Gold stars in the puffs…
    g.fillStyle = '#ffd76a'
    g.beginPath()
    for (const [x, y, r, a] of [[-64, 28, 5.5, 0.2], [36, 36, 6, -0.3], [72, 18, 4, 0.5]] as const) star5(g, X(x), X(y), X(r), a)
    g.fill()
    g.strokeStyle = 'rgba(185,129,44,0.8)'
    g.lineWidth = X(1)
    g.stroke()
    // …and little flowers along the front of the rim, with a leaf or two.
    g.fillStyle = '#9be8c4'
    g.beginPath()
    for (const [x, a] of [[-74, -0.6], [-26, 0.5], [22, -0.4], [66, 0.6]] as const) {
      g.ellipse(X(x + 5), X(7), X(5), X(2.2), a, 0, Math.PI * 2)
    }
    g.fill()
    const flower = (x: number, y: number, r: number, petal: string): void => {
      g.fillStyle = petal
      g.beginPath()
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / 5
        g.moveTo(X(x + Math.cos(a) * r * 0.62 + r * 0.5), X(y + Math.sin(a) * r * 0.62))
        g.arc(X(x + Math.cos(a) * r * 0.62), X(y + Math.sin(a) * r * 0.62), X(r * 0.5), 0, Math.PI * 2)
      }
      g.fill()
      g.fillStyle = '#ffd76a'
      g.beginPath()
      g.arc(X(x), X(y), X(r * 0.34), 0, Math.PI * 2)
      g.fill()
    }
    flower(-82, 6, 6.5, '#ffffff')
    flower(-52, 10, 5.5, '#ff9ecf')
    flower(-8, 11, 6, '#ffffff')
    flower(40, 10, 5.5, '#ffb7d5')
    flower(84, 5, 6, '#ff9ecf')
  }
  g.restore()
}

/**
 * The podium painting's unit, in stage units: its spec's `s` is px per
 * PODIUM_UNIT, so the game asks `drawItem(g, PODIUM_ART.dawn, s * PODIUM_UNIT)`.
 *
 * Not one stage unit, which is what the drawing takes: `artBox.measureBox`
 * measures a drawable at 120 px per unit on a canvas that stops growing at
 * ±10.7 units, and the podium is ±97 stage units wide — measured that way its
 * box was the whole canvas, so the bench drew a crop of it and the game would
 * have blitted the painting at a ninth of its size. At a hundred it measures
 * about 2.2 × 1 (`arena.islandArt`'s move: the spec scales, the drawing does
 * not change).
 */
export const PODIUM_UNIT = 100

/** The podiums as painted drop-ins: one panel each, the drawing above as
 *  the painter's reference (`drawPodium`'s `ref`). */
export const PODIUM_ART: { readonly dawn: ItemSpec; readonly night: ItemSpec } = {
  dawn: { kind: VS_PODIUM_KIND, id: VS_PODIUM_IDS.dawn, frames: 1, draw: (g, s) => drawPodium(g, s / PODIUM_UNIT, false, true) },
  night: { kind: VS_PODIUM_KIND, id: VS_PODIUM_IDS.night, frames: 1, draw: (g, s) => drawPodium(g, s / PODIUM_UNIT, true, true) }
}
