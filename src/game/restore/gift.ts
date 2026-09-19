/**
 * gift.ts — the Standard Gift and the Stardust Brush, as small named shape
 * functions (story-spec §8.2–§8.4, §9.14), in the cel style of everything
 * else: flat fills, one plum outline, a light cap.
 *
 * The wrapping says what is inside before it opens (§8.2): a ROUND parcel
 * with a soft bow holds the Stardust Brush. The ribbon is the chapter's
 * accent (Whispering Woods: moss green), never a rune colour.
 *
 * Both draw around their own origin, in whatever space the caller has set
 * up; `s` is the gift's height / the brush's length in that space.
 */
import { TAU, PI, sin, cos, clamp, ease } from '@/game/duel/util'
import { drawItem, type ItemSpec } from '@/game/artItem'
import { ITEM_ART } from '@/game/artIds'

type G2D = CanvasRenderingContext2D

const INK = '#3A2340'
const PAPER = '#ffd9ee'
const PAPER_SHADE = '#f4b3d6'
const DOT = '#fff4fb'
const RIBBON = '#63e24a'
const RIBBON_SHADE = '#3fb84a'

export interface GiftPose {
  /** Rotation, radians (the idle shake). */
  rot: number
  /** 0 tied … 1 fully loose (the bow-untie beat). */
  untie: number
  /** Squash-and-stretch scale around the base. */
  squash: number
  /** The chapter's ribbon (§8.2); chapter 1's moss green when omitted. */
  ribbon?: string
  ribbonShade?: string
}

const line = (g: G2D, w: number): void => {
  g.lineWidth = w
  g.strokeStyle = INK
  g.lineJoin = g.lineCap = 'round'
  g.stroke()
}

/** One bow loop, from the knot outward. */
const loop = (g: G2D, dir: number, s: number, lift: number, droop: number): void => {
  g.beginPath()
  g.moveTo(0, 0)
  g.bezierCurveTo(dir * s * 0.22, -s * (0.34 + lift) + droop, dir * s * 0.52, -s * (0.22 + lift) + droop, dir * s * 0.34, -s * 0.02 + droop * 0.4)
  g.closePath()
}

/**
 * A painted item's panel for an opening beat: the tied (or shut) panel until
 * 30 % of the way, the open one after 70 %, a cross-fade between — so the
 * painting "opens" over the frames the drawing spends opening.
 */
const openFrame = (u: number): number => clamp((u - 0.3) / 0.4, 0, 1)

/** The Standard Gift, base at the origin, `s` tall. */
export const drawGift = (g: G2D, x: number, y: number, s: number, p: GiftPose): void => {
  const RB = p.ribbon ?? RIBBON
  g.save()
  g.translate(x, y)
  g.rotate(p.rot)
  g.scale(1 / Math.sqrt(p.squash), p.squash)
  if (!drawItem(g, GIFT_ART, s, openFrame(p.untie), RB)) giftShape(g, s, p.untie, RB, p.ribbonShade ?? RIBBON_SHADE)
  g.restore()
}

/** The gift's drawing at the origin: parcel, ribbon cross, bow (`u` = untie). */
const giftShape = (g: G2D, s: number, untie: number, RB: string, RBS: string): void => {
  const w = s * 0.92
  const h = s * 0.72
  const lw = Math.max(1.5, s * 0.045)
  // Parcel: a round-shouldered bundle.
  const body = (): void => {
    g.beginPath()
    g.roundRect(-w / 2, -h, w, h, h * 0.42)
  }
  body()
  g.fillStyle = PAPER
  g.fill()
  g.save()
  body()
  g.clip()
  g.beginPath()
  g.rect(w * 0.12, -h, w, h)
  g.fillStyle = PAPER_SHADE
  g.fill()
  g.beginPath()
  for (const [dx, dy] of [[-0.3, -0.72], [-0.28, -0.3], [0.3, -0.55], [0.04, -0.86], [0.34, -0.2]] as const) {
    g.moveTo(w * dx + s * 0.035, h * dy)
    g.arc(w * dx, h * dy, s * 0.035, 0, TAU)
  }
  g.fillStyle = DOT
  g.fill()
  // Ribbon cross.
  const rw = s * 0.12
  g.beginPath()
  g.rect(-rw / 2, -h, rw, h)
  g.rect(-w / 2, -h * 0.56 - rw / 2, w, rw)
  g.fillStyle = RB
  g.fill()
  g.beginPath()
  g.rect(rw * 0.1, -h, rw * 0.4, h)
  g.fillStyle = RBS
  g.fill()
  g.restore()
  body()
  line(g, lw)
  // Bow: two loops and two tails that slump as it unties.
  const u = clamp(untie, 0, 1)
  g.save()
  g.translate(0, -h)
  const droop = u * s * 0.3
  for (const dir of [-1, 1]) {
    loop(g, dir, s * (1 - u * 0.25), 0.02 - u * 0.2, droop)
    g.fillStyle = RB
    g.fill()
    line(g, lw)
    g.beginPath()
    g.moveTo(dir * s * 0.02, s * 0.02)
    g.quadraticCurveTo(dir * s * (0.12 + u * 0.2), s * (0.18 + u * 0.25), dir * s * (0.2 + u * 0.3), s * (0.22 + u * 0.3))
    g.lineWidth = s * 0.07
    g.strokeStyle = RB
    g.stroke()
  }
  g.beginPath()
  g.arc(0, 0, s * 0.07, 0, TAU)
  g.fillStyle = RBS
  g.fill()
  line(g, lw)
  g.restore()
}

/** The Standard Gift as a painted strip: tied, then untied (§9.11). */
export const GIFT_ART: ItemSpec = {
  ...ITEM_ART.gift, frames: 2, tinted: true,
  draw: (g, s, f, a) => giftShape(g, s, f, a.base, a.shade)
}

/**
 * The Magic Eraser's gift (§8.2): a SQUARE, corner-folded box — flat creases,
 * no bow. The shape swap from the round Brush parcel IS the "you've graduated
 * tools" beat, no words needed. Base at the origin, `s` tall; `untie` lifts
 * the folded corner flap.
 */
export const drawBoxGift = (g: G2D, x: number, y: number, s: number, p: GiftPose): void => {
  const RB = p.ribbon ?? RIBBON
  g.save()
  g.translate(x, y)
  g.rotate(p.rot)
  g.scale(1 / Math.sqrt(p.squash), p.squash)
  if (!drawItem(g, BOX_GIFT_ART, s, openFrame(p.untie), RB)) boxGiftShape(g, s, p.untie, RB, p.ribbonShade ?? RIBBON_SHADE)
  g.restore()
}

/** The box gift's drawing at the origin (`untie` lifts the corner flap). */
const boxGiftShape = (g: G2D, s: number, untie: number, RB: string, RBS: string): void => {
  const w = s * 0.82
  const h = s * 0.78
  const lw = Math.max(1.5, s * 0.045)
  const u = clamp(untie, 0, 1)
  g.beginPath()
  g.roundRect(-w / 2, -h, w, h, s * 0.05)
  g.fillStyle = '#fff1d6'
  g.fill()
  g.save()
  g.clip()
  g.beginPath()
  g.rect(w * 0.14, -h, w, h)
  g.fillStyle = '#f0d2c0'
  g.fill()
  // A flat band (no bow) and its crease.
  g.beginPath()
  g.rect(-w / 2, -h * 0.55 - s * 0.06, w, s * 0.12)
  g.fillStyle = RB
  g.fill()
  g.beginPath()
  g.rect(-w / 2, -h * 0.55 + s * 0.02, w, s * 0.04)
  g.fillStyle = RBS
  g.fill()
  g.restore()
  g.beginPath()
  g.roundRect(-w / 2, -h, w, h, s * 0.05)
  line(g, lw)
  // The folded corner flap, top right — it lifts as the box opens.
  const f = s * 0.26
  g.save()
  g.translate(w / 2, -h)
  g.rotate(-u * 0.9)
  g.beginPath()
  g.moveTo(0, 0)
  g.lineTo(-f, 0)
  g.lineTo(0, f)
  g.closePath()
  g.fillStyle = '#ffe3a3'
  g.fill()
  line(g, lw)
  g.restore()
  // A little star sticker.
  g.beginPath()
  for (let i = 0; i < 10; i++) {
    const a2 = -PI / 2 + (i * PI) / 5
    const rr = i & 1 ? s * 0.035 : s * 0.08
    if (i) g.lineTo(-w * 0.22 + cos(a2) * rr, -h * 0.28 + sin(a2) * rr)
    else g.moveTo(-w * 0.22 + cos(a2) * rr, -h * 0.28 + sin(a2) * rr)
  }
  g.closePath()
  g.fillStyle = '#ffd36b'
  g.fill()
  line(g, lw * 0.7)
}

/** The Magic Eraser's box gift as a painted strip: shut, then flap lifted. */
export const BOX_GIFT_ART: ItemSpec = {
  ...ITEM_ART.boxGift, frames: 2, tinted: true,
  draw: (g, s, f, a) => boxGiftShape(g, s, f, a.base, a.shade)
}

/**
 * The Magic Eraser: a chunky rounded eraser block — pink rubber, a white
 * sleeve with a star — turned along its heading. Centred at (x, y).
 */
export const drawEraser = (g: G2D, x: number, y: number, s: number, angle: number): void => {
  g.save()
  g.translate(x, y)
  g.rotate(angle)
  if (!drawItem(g, ERASER_ART, s)) eraserShape(g, s)
  g.restore()
}

const eraserShape = (g: G2D, s: number): void => {
  const L = s * 0.62
  const W = s * 0.4
  const lw = Math.max(1.5, s * 0.035)
  g.beginPath()
  g.roundRect(-L / 2, -W / 2, L, W, W * 0.3)
  g.fillStyle = '#ff9ecf'
  g.fill()
  line(g, lw)
  g.beginPath()
  g.roundRect(-L * 0.12, -W / 2 - lw * 0.5, L * 0.46, W + lw, W * 0.12)
  g.fillStyle = '#fff6fb'
  g.fill()
  line(g, lw)
  g.beginPath()
  for (let i = 0; i < 10; i++) {
    const a2 = -PI / 2 + (i * PI) / 5
    const rr = i & 1 ? W * 0.1 : W * 0.24
    if (i) g.lineTo(L * 0.11 + cos(a2) * rr, sin(a2) * rr)
    else g.moveTo(L * 0.11 + cos(a2) * rr, sin(a2) * rr)
  }
  g.closePath()
  g.fillStyle = '#ffd36b'
  g.fill()
  line(g, lw * 0.7)
  // A highlight along the top edge.
  g.beginPath()
  g.moveTo(-L * 0.42, -W * 0.28)
  g.lineTo(-L * 0.18, -W * 0.28)
  g.lineWidth = lw
  g.strokeStyle = 'rgba(255,255,255,0.8)'
  g.stroke()
}

/** The Magic Eraser as a painted still, level, sleeve to the right. */
export const ERASER_ART: ItemSpec = { ...ITEM_ART.eraser, frames: 1, draw: (g, s) => eraserShape(g, s) }

export interface ChestPose {
  /** Rotation, radians (the idle rattle). */
  rot: number
  /** 0 shut … 1 lid thrown open. */
  open: number
  /** The clasp gem's flicker, 0..1. */
  gleam: number
}

/**
 * The Boss Chest (§8.2): large, ornate, hinged, with a glowing seam along the
 * lid and a clasp cut as the chapter's element gem (Whispering Woods: a leaf
 * gem). Base at the origin, `s` tall.
 */
export const drawChest = (g: G2D, x: number, y: number, s: number, p: ChestPose, gem = '#5ce05a'): void => {
  g.save()
  g.translate(x, y)
  g.rotate(p.rot)
  if (drawItem(g, CHEST_ART, s, openFrame(p.open), gem)) {
    // The painting holds the chest; the clasp's flicker is a moment, not a
    // picture, so it stays drawn over it.
    if (p.gleam > 0.02) {
      g.beginPath()
      g.arc(-s * 0.02, -s * 0.64, s * 0.03, 0, TAU)
      g.globalAlpha *= p.gleam
      g.fillStyle = '#ffffff'
      g.fill()
    }
  } else chestShape(g, s, p, gem)
  g.restore()
}

const chestShape = (g: G2D, s: number, p: ChestPose, gem: string): void => {
  const w = s * 1.3
  const h = s * 0.62
  const lw = Math.max(1.5, s * 0.04)
  // Body.
  g.beginPath()
  g.roundRect(-w / 2, -h, w, h, s * 0.08)
  g.fillStyle = '#c98a5a'
  g.fill()
  line(g, lw)
  g.save()
  g.beginPath()
  g.roundRect(-w / 2, -h, w, h, s * 0.08)
  g.clip()
  g.beginPath()
  g.rect(w * 0.18, -h, w, h)
  g.fillStyle = '#9a6446'
  g.fill()
  // Gold straps.
  g.beginPath()
  g.rect(-w * 0.34, -h, w * 0.1, h)
  g.rect(w * 0.24, -h, w * 0.1, h)
  g.fillStyle = '#ffd36b'
  g.fill()
  g.restore()
  // The glowing seam, brighter as the lid lifts.
  const seam = 0.45 + 0.55 * Math.max(p.gleam, p.open)
  g.beginPath()
  g.rect(-w / 2 + lw, -h - lw, w - 2 * lw, lw * 2)
  g.fillStyle = `rgba(255, 246, 180, ${seam})`
  g.fill()
  // The lid, hinged at the back, swinging up.
  g.save()
  g.translate(0, -h)
  g.scale(1, 1 - p.open * 1.6)
  g.beginPath()
  g.moveTo(-w / 2, 0)
  g.quadraticCurveTo(-w / 2, -s * 0.42, 0, -s * 0.44)
  g.quadraticCurveTo(w / 2, -s * 0.42, w / 2, 0)
  g.closePath()
  g.fillStyle = '#d99a66'
  g.fill()
  line(g, lw)
  g.beginPath()
  g.rect(-w * 0.34, -s * 0.4, w * 0.1, s * 0.4)
  g.rect(w * 0.24, -s * 0.4, w * 0.1, s * 0.4)
  g.fillStyle = '#ffd36b'
  g.fill()
  g.restore()
  // The clasp: the chapter's element gem.
  g.beginPath()
  g.moveTo(0, -h - s * 0.1)
  g.lineTo(s * 0.09, -h + s * 0.02)
  g.lineTo(0, -h + s * 0.14)
  g.lineTo(-s * 0.09, -h + s * 0.02)
  g.closePath()
  g.fillStyle = gem
  g.fill()
  line(g, lw * 0.9)
  if (p.gleam > 0.02) {
    g.beginPath()
    g.arc(-s * 0.02, -h - s * 0.02, s * 0.03, 0, TAU)
    g.globalAlpha = p.gleam
    g.fillStyle = '#ffffff'
    g.fill()
    g.globalAlpha = 1
  }
}

/** The Boss Chest as a painted strip: shut, then lid thrown open. The clasp
 *  gem is the chapter's element colour, so it is tinted. */
export const CHEST_ART: ItemSpec = {
  ...ITEM_ART.chest, frames: 2, tinted: true,
  draw: (g, s, f, a) => chestShape(g, s, { rot: 0, open: f, gleam: 0 }, a.base)
}

/** The chest's idle rattle (§8.3): bigger and slower than the gift's shake. */
export const chestRattle = (t: number): number => {
  const cyc = t % 2.2
  return cyc < 0.5 ? (5 * PI / 180) * sin((cyc / 0.16) * TAU) * (1 - cyc / 0.5) : 0
}

/** The idle shake of an unopened gift (§8.3): ±4°, 90 ms period, three
 *  cycles, then a rest — it invites a tap without nagging. */
export const giftShake = (t: number): number => {
  const cyc = t % 1.6
  return cyc < 0.27 ? (4 * PI / 180) * sin((cyc / 0.09) * TAU) : 0
}

/**
 * The Stardust Brush: a wooden handle, a gold ferrule, and a soft tuft
 * tipped with a star. The TIP is at the origin, pointing along `angle`, with
 * the handle trailing behind it, so the brush always paints from where the
 * finger is.
 */
export const drawBrush = (g: G2D, x: number, y: number, s: number, angle: number, t: number): void => {
  const lw = Math.max(1.5, s * 0.035)
  g.save()
  g.translate(x, y)
  g.rotate(angle)
  if (!drawItem(g, BRUSH_ART, s)) brushShape(g, s)
  g.restore()
  // A little four-point star twinkling at the tip — live, painted or not.
  const k = 0.75 + 0.25 * sin(t * 9)
  const r = s * 0.12 * k
  g.save()
  g.translate(x, y)
  g.rotate(t * 1.5)
  g.beginPath()
  for (let i = 0; i < 8; i++) {
    const a = (i * PI) / 4
    const rr = i & 1 ? r * 0.38 : r
    if (i) g.lineTo(cos(a) * rr, sin(a) * rr)
    else g.moveTo(rr, 0)
  }
  g.closePath()
  g.fillStyle = '#fff6b0'
  g.fill()
  line(g, lw * 0.8)
  g.restore()
}

/** The brush's drawing, tip at the origin pointing +x: handle, ferrule, tuft. */
const brushShape = (g: G2D, s: number): void => {
  const lw = Math.max(1.5, s * 0.035)
  // Handle, trailing behind the tip along −x.
  g.beginPath()
  g.moveTo(-s * 0.36, -s * 0.05)
  g.lineTo(-s * 1.0, -s * 0.035)
  g.quadraticCurveTo(-s * 1.06, 0, -s * 1.0, s * 0.035)
  g.lineTo(-s * 0.36, s * 0.05)
  g.closePath()
  g.fillStyle = '#c98a5a'
  g.fill()
  line(g, lw)
  // Ferrule.
  g.beginPath()
  g.roundRect(-s * 0.4, -s * 0.075, s * 0.14, s * 0.15, s * 0.03)
  g.fillStyle = '#ffd36b'
  g.fill()
  line(g, lw)
  // Tuft.
  g.beginPath()
  g.moveTo(-s * 0.27, -s * 0.08)
  g.bezierCurveTo(-s * 0.14, -s * 0.2, -s * 0.02, -s * 0.1, 0, 0)
  g.bezierCurveTo(-s * 0.02, s * 0.1, -s * 0.14, s * 0.2, -s * 0.27, s * 0.08)
  g.closePath()
  g.fillStyle = '#e7d6ff'
  g.fill()
  line(g, lw)
  g.beginPath()
  g.moveTo(-s * 0.22, -s * 0.05)
  g.quadraticCurveTo(-s * 0.1, -s * 0.06, -s * 0.03, 0)
  g.strokeStyle = '#ffffff'
  g.lineWidth = lw
  g.stroke()
}

/** The Stardust Brush as a painted still, level, tip to the right. Its
 *  twinkling star is not in it: that stays drawn. */
export const BRUSH_ART: ItemSpec = { ...ITEM_ART.brush, frames: 1, draw: (g, s) => brushShape(g, s) }

/**
 * The Twin Gift (§8.2): a SQUARE box in lilac, a gold ribbon cross and bow,
 * and a little film-strip glyph on its front — the same in every locale, no
 * text. Visibly not the round tool parcel, so it never reads as "a tool".
 * `loose` (0..1) opens the bow as the player holds it. Base at the origin,
 * `s` tall.
 */
export const drawTwinGift = (g: G2D, x: number, y: number, s: number, loose: number): void => {
  const lw = Math.max(1.5, s * 0.04)
  const w = s * 0.86
  const h = s * 0.7
  g.save()
  g.translate(x, y)
  // The box.
  g.beginPath()
  g.roundRect(-w / 2, -h, w, h, s * 0.07)
  g.fillStyle = '#cdb8ff'
  g.fill()
  line(g, lw)
  g.save()
  g.beginPath()
  g.roundRect(-w / 2, -h, w, h, s * 0.07)
  g.clip()
  g.beginPath()
  g.rect(w * 0.2, -h, w, h)
  g.fillStyle = '#b39cf5'
  g.fill()
  // The ribbon cross.
  g.beginPath()
  g.rect(-w * 0.07, -h, w * 0.14, h)
  g.rect(-w / 2, -h * 0.58, w, h * 0.14)
  g.fillStyle = '#ffd36b'
  g.fill()
  g.restore()
  // The film strip, on the lower-left panel: sprockets and a play arrow.
  const fx = -w * 0.36
  const fy = -h * 0.36
  const fw = w * 0.24
  const fh = h * 0.28
  g.beginPath()
  g.roundRect(fx, fy, fw, fh, s * 0.02)
  g.fillStyle = '#3A2340'
  g.fill()
  g.fillStyle = '#fff4fb'
  for (let i = 0; i < 3; i++) {
    const hx = fx + fw * (0.16 + i * 0.28)
    g.fillRect(hx, fy + fh * 0.08, fw * 0.14, fh * 0.14)
    g.fillRect(hx, fy + fh * 0.78, fw * 0.14, fh * 0.14)
  }
  g.beginPath()
  g.moveTo(fx + fw * 0.38, fy + fh * 0.32)
  g.lineTo(fx + fw * 0.68, fy + fh * 0.5)
  g.lineTo(fx + fw * 0.38, fy + fh * 0.68)
  g.closePath()
  g.fill()
  // The bow: the loops lift and spread as it loosens, the tails droop.
  g.save()
  g.translate(0, -h)
  const u = clamp(loose, 0, 1)
  for (const dir of [-1, 1]) {
    g.save()
    g.rotate(dir * u * 0.5)
    loop(g, dir, s * (1 + u * 0.15), u * 0.12, u * s * 0.06)
    g.fillStyle = '#ffd36b'
    g.fill()
    line(g, lw)
    g.restore()
  }
  g.beginPath()
  g.arc(0, 0, s * 0.065, 0, TAU)
  g.fillStyle = '#e8b340'
  g.fill()
  line(g, lw)
  g.restore()
  g.restore()
}

/**
 * The Sunbeam (§8.4): a little sun on a golden wand. The SUN is at the
 * origin — the beam leaves from it — with the wand trailing down-left.
 * `charge` is 0 while it gathers light after a shot and 1 when it is ready;
 * `swell` (0..1) is the slingshot's pull, and the sun grows with it.
 */
export const drawSunbeam = (g: G2D, x: number, y: number, s: number, t: number, charge = 1, swell = 0): void => {
  const lw = Math.max(1.5, s * 0.035)
  const r = s * 0.2 * (1 + swell * 0.25) * (0.8 + 0.2 * charge)
  g.save()
  g.translate(x, y)
  // The wand.
  g.save()
  g.rotate(PI * 0.75)
  g.beginPath()
  g.roundRect(r * 0.7, -s * 0.045, s * 0.72, s * 0.09, s * 0.045)
  g.fillStyle = '#ffd36b'
  g.fill()
  line(g, lw)
  g.beginPath()
  g.roundRect(r * 0.7 + s * 0.12, -s * 0.06, s * 0.08, s * 0.12, s * 0.02)
  g.fillStyle = '#c98a5a'
  g.fill()
  line(g, lw * 0.8)
  g.restore()
  // A soft halo that brightens as the light gathers.
  const halo = g.createRadialGradient(0, 0, r * 0.5, 0, 0, r * 2.4)
  halo.addColorStop(0, `rgba(255, 244, 190, ${0.55 * charge})`)
  halo.addColorStop(1, 'rgba(255, 244, 190, 0)')
  g.fillStyle = halo
  g.fillRect(-r * 2.4, -r * 2.4, r * 4.8, r * 4.8)
  // Eight rays, turning slowly; they lengthen as it charges.
  g.save()
  g.rotate(t * 0.8)
  g.beginPath()
  const ray = r * (1.25 + 0.35 * charge + 0.1 * sin(t * 6))
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU
    const w = PI / 11
    g.moveTo(cos(a - w) * r * 0.9, sin(a - w) * r * 0.9)
    g.lineTo(cos(a) * ray, sin(a) * ray)
    g.lineTo(cos(a + w) * r * 0.9, sin(a + w) * r * 0.9)
  }
  g.fillStyle = '#ffb63b'
  g.fill()
  line(g, lw * 0.8)
  g.restore()
  // The sun itself.
  g.beginPath()
  g.arc(0, 0, r, 0, TAU)
  g.fillStyle = charge >= 1 ? '#ffe45c' : '#f7c94a'
  g.fill()
  line(g, lw)
  g.beginPath()
  g.arc(-r * 0.3, -r * 0.32, r * 0.3, 0, TAU)
  g.fillStyle = 'rgba(255, 255, 255, 0.75)'
  g.fill()
  g.restore()
}

let arenaGiftOn = false
let arenaRibbon: { ribbon: string; ribbonShade: string } | null = null
let arenaBox = false
/** Show (or clear) the gift in the arena. The duel's renderer asks
 *  `arenaGiftShown()` each frame; the scene sets it on a win that earned one,
 *  wrapped in that chapter's ribbon (§8.2) — and square when it holds the
 *  Magic Eraser. */
export const setArenaGift = (on: boolean, ribbon?: { ribbon: string; ribbonShade: string }, box = false): void => {
  arenaGiftOn = on
  arenaRibbon = ribbon ?? null
  arenaBox = box
}
export const arenaGiftShown = (): boolean => arenaGiftOn

/**
 * The gift dropping into the arena during the victory flourish (§3.2.2
 * step 2): it falls onto the island, bounces once, and settles. `t` is
 * seconds since the win; the gift's base lands at (x, y).
 */
export const drawArenaGift = (g: G2D, x: number, y: number, t: number): void => {
  if (t <= 0.25) return
  const u = t - 0.25
  const FALL = 0.45
  let yy = y
  let squash = 1
  if (u < FALL) {
    const k = u / FALL
    yy = y - (1 - k * k) * 520
  } else {
    const b = u - FALL
    // One small bounce, and a squash on each landing.
    const hop = b < 0.3 ? sin((b / 0.3) * PI) * 26 : 0
    yy = y - hop
    squash = b < 0.12 ? 1 - 0.18 * sin((b / 0.12) * PI) : b > 0.3 && b < 0.4 ? 1 - 0.1 * sin(((b - 0.3) / 0.1) * PI) : 1
  }
  const glow = clamp((u - FALL) / 0.4, 0, 1)
  if (glow > 0) {
    // A soft halo under it once it has landed — "this is yours".
    g.save()
    g.globalAlpha = 0.5 * ease(glow) * (0.8 + 0.2 * sin(t * 4))
    const gr = g.createRadialGradient(x, y - 40, 5, x, y - 40, 110)
    gr.addColorStop(0, '#fff6c8')
    gr.addColorStop(1, 'rgba(255,246,200,0)')
    g.fillStyle = gr
    g.fillRect(x - 110, y - 150, 220, 220)
    g.restore()
  }
  ;(arenaBox ? drawBoxGift : drawGift)(g, x, yy, 96, { rot: u > FALL + 0.4 ? giftShake(u) * 0.6 : 0, untie: 0, squash, ribbon: arenaRibbon?.ribbon, ribbonShade: arenaRibbon?.ribbonShade })
}
