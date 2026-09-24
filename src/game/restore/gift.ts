/**
 * gift.ts — the Standard Gift and the Stardust Sponge, as small named shape
 * functions (story-spec §8.2–§8.4, §9.14), in the cel style of everything
 * else: flat fills, one plum outline, a light cap.
 *
 * The wrapping says what is inside before it opens (§8.2): a ROUND parcel
 * with a soft bow holds the Stardust Sponge. The ribbon is the chapter's
 * accent (Whispering Woods: moss green), never a rune colour.
 *
 * Both draw around their own origin, in whatever space the caller has set
 * up; `s` is the gift's height / the sponge's long side in that space.
 */
import { TAU, PI, sin, cos, clamp, ease } from '@/game/duel/util'
import { drawItem, type ItemSpec } from '@/game/artItem'
import { ITEM_ART } from '@/game/artIds'
import { spriteFor } from '@/game/art'
import { TWINKLE_ART } from '@/game/map/kit'

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

/** The Standard Gift, base at (x, y), `s` tall. */
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
 * The Stardust Sponge: a chunky butter-yellow bath sponge with a mint
 * scrubbing layer on top, a few round pores and a little gold star printed
 * on its side. Centred at (x, y), tilted by `angle`.
 *
 * It replaced a paintbrush (owner, 2026-09-19): a brush on a dusty picture
 * reads as "paint this", and the job is CLEANING. A sponge says so without a
 * word, and a squish says it louder:
 *   `press`  0 lifted … 1 pressed down: the sponge flattens and widens;
 *   `scrub`  a phase advanced by the distance scrubbed: while pressed, the
 *            sponge wobbles and rocks with it, so fast scrubbing LOOKS fast.
 */
export const drawSponge = (
  g: G2D, x: number, y: number, s: number, angle: number, t: number, press = 0, scrub = 0
): void => {
  const lw = Math.max(1.5, s * 0.035)
  const wob = press * sin(scrub * 2)
  g.save()
  g.translate(x, y)
  g.rotate(angle + press * 0.1 * sin(scrub))
  // Pressed: flatter and wider, the squish pumping with the scrub.
  const sq = press * (0.14 + 0.06 * wob)
  g.scale(1 + sq * 0.8, 1 - sq)
  if (!drawItem(g, SPONGE_ART, s)) spongeShape(g, s)
  g.restore()
  // A little four-point star twinkling at the corner. Its twinkle — the
  // pulse and the turn — is live either way; the STAR is the sectors'
  // painted twinkle (`prop-twinkle`, tinted), the same one every `twinkles`
  // on the map draws, so a painted sponge does not carry an inked vector
  // star on its corner.
  const k = 0.75 + 0.25 * sin(t * 9)
  const r = s * 0.1 * k
  g.save()
  g.translate(x + cos(angle) * s * 0.42, y - s * 0.3)
  g.rotate(t * 1.5)
  if (drawItem(g, TWINKLE_ART, r, 0, SPONGE_TWINKLE)) {
    g.restore()
    return
  }
  g.beginPath()
  for (let i = 0; i < 8; i++) {
    const a = (i * PI) / 4
    const rr = i & 1 ? r * 0.38 : r
    if (i) g.lineTo(cos(a) * rr, sin(a) * rr)
    else g.moveTo(rr, 0)
  }
  g.closePath()
  g.fillStyle = SPONGE_TWINKLE
  g.fill()
  line(g, lw * 0.8)
  g.restore()
}

/** The sponge's corner star — and the tool chip's (`WipeScene.vue`). */
export const SPONGE_TWINKLE = '#fff6b0'

/** The sponge's drawing, centred at the origin, `s` across its long side. */
const spongeShape = (g: G2D, s: number): void => {
  const lw = Math.max(1.5, s * 0.035)
  const w = s * 0.9
  const h = s * 0.56
  const top = s * 0.16
  const body = (): void => {
    g.beginPath()
    g.roundRect(-w / 2, -h / 2, w, h, s * 0.14)
  }
  // The body, with its cel shadow along the lower right.
  body()
  g.fillStyle = '#ffe07a'
  g.fill()
  g.save()
  body()
  g.clip()
  g.beginPath()
  g.ellipse(w * 0.2, h * 0.55, w * 0.62, h * 0.55, -0.2, 0, TAU)
  g.fillStyle = '#f2c14e'
  g.fill()
  // The mint scrubbing layer along the top.
  g.beginPath()
  g.rect(-w / 2, -h / 2, w, top)
  g.fillStyle = '#9ff0cf'
  g.fill()
  g.beginPath()
  g.rect(-w / 2, -h / 2 + top * 0.62, w, top * 0.38)
  g.fillStyle = '#6fd6b0'
  g.fill()
  // Pores: a few soft round holes.
  g.fillStyle = '#e3aa3c'
  for (const [px, py, pr] of [[-0.3, 0.12, 0.045], [-0.08, 0.3, 0.035], [0.14, 0.08, 0.04], [0.32, 0.28, 0.03], [-0.36, 0.34, 0.03], [0.04, 0.42, 0.028]] as const) {
    g.beginPath()
    g.ellipse(w * px, h * py, s * pr, s * pr * 0.8, 0, 0, TAU)
    g.fill()
  }
  g.restore()
  body()
  line(g, lw)
  // The scrub layer's seam.
  g.beginPath()
  g.moveTo(-w / 2 + lw, -h / 2 + top)
  g.lineTo(w / 2 - lw, -h / 2 + top)
  g.lineWidth = lw * 0.7
  g.strokeStyle = INK
  g.stroke()
  // A small gold star printed on the side.
  g.beginPath()
  for (let i = 0; i < 10; i++) {
    const a2 = -PI / 2 + (i * PI) / 5
    const rr = i & 1 ? s * 0.035 : s * 0.08
    if (i) g.lineTo(-w * 0.18 + cos(a2) * rr, h * 0.16 + sin(a2) * rr)
    else g.moveTo(-w * 0.18 + cos(a2) * rr, h * 0.16 + sin(a2) * rr)
  }
  g.closePath()
  g.fillStyle = '#fff3b0'
  g.fill()
  line(g, lw * 0.6)
  // A highlight along the top-left.
  g.beginPath()
  g.moveTo(-w * 0.4, -h / 2 + top + lw * 1.6)
  g.lineTo(-w * 0.16, -h / 2 + top + lw * 1.6)
  g.lineWidth = lw
  g.strokeStyle = 'rgba(255,255,255,0.75)'
  g.stroke()
}

/** The Stardust Sponge as a painted still, level. Its twinkling star is not
 *  in it (that stays drawn), and neither is its squish (a transform). */
export const SPONGE_ART: ItemSpec = { ...ITEM_ART.sponge, frames: 1, draw: (g, s) => spongeShape(g, s) }

/**
 * The Twin Gift (§8.2): a SQUARE box in lilac with a gold ribbon cross and
 * bow — visibly not the round tool parcel, so it never reads as "a tool".
 * `loose` (0..1) opens the bow as the player holds it. Base at (x, y), `s`
 * tall.
 *
 * NO FILM STRIP ON ITS FRONT any more (paint-outstanding B15). It used to
 * carry one as its "this plays a video" mark, and the map has since put the
 * rewarded buttons' movie camera beside it (`MapScene.vue`, the `ad-mark`) —
 * two different video marks on one gift. The camera is the one every other
 * rewarded button wears, and it shows only where a video actually plays; the
 * strip claimed one everywhere.
 *
 * Painted (P8) as a 2-panel strip like the Standard Gift: tied, and the bow
 * at its loosest. The hold loosens it in steps (`twinGift.ts`), each a held
 * pose — 0, ¼, ½ and ¾ loose, and at the fourth step it bursts — so panel 1
 * is 0, panel 2 is ¾, and `twinFrame` cross-fades ¼ and ½ between them.
 */
export const drawTwinGift = (g: G2D, x: number, y: number, s: number, loose: number): void => {
  g.save()
  g.translate(x, y)
  if (!drawItem(g, TWIN_GIFT_ART, s, twinFrame(loose))) twinGiftShape(g, s, loose)
  g.restore()
}

/** The bow's loosest pose the gift is ever SEEN in — the hold's third step
 *  (¾); at the fourth it bursts. The strip's second panel is drawn there. */
const TWIN_LOOSEST = 0.75
const twinFrame = (loose: number): number => clamp(loose / TWIN_LOOSEST, 0, 1)

/** The Twin Gift's drawing, base at the origin: box, ribbon cross, bow. */
const twinGiftShape = (g: G2D, s: number, loose: number): void => {
  const lw = Math.max(1.5, s * 0.04)
  const w = s * 0.86
  const h = s * 0.7
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
}

/** The Twin Gift as a painted strip: tied, then the bow at its loosest. */
export const TWIN_GIFT_ART: ItemSpec = {
  ...ITEM_ART.twinGift, frames: 2,
  draw: (g, s, f) => twinGiftShape(g, s, f * TWIN_LOOSEST)
}

/**
 * The Sunbeam (§8.4): a little sun on a golden wand. The SUN is at the
 * origin — the beam leaves from it — with the wand trailing down-left.
 * `charge` is 0 while it gathers light after a shot and 1 when it is ready;
 * `swell` (0..1) is the slingshot's pull, and the sun grows with it.
 *
 * PAINTED AS TWO STILLS, with everything that MOVES kept the drawing's
 * (paint-outstanding P6; art-roadmap §4b's "paint the shape, keep what moves
 * it" — story-spec §8.20's old "continuous state" reason predates that rule):
 *   • `SUNBEAM_ART` — the wand with the sun on its tip, at rest. The pull and
 *     the charge grow the sun; the painting is grown with it, about the sun,
 *     and the wand grows along — a whole tool swelling as it is drawn back.
 *   • `SUNBEAM_RAYS_ART` — the ring of eight rays, round an EMPTY middle the
 *     sun covers. Their turn is a rotation and their lengthening (with the
 *     charge, and the pulse) a scale about the sun: at every length the game
 *     draws, the rays' inner ends stay under the disc (≤ 0.96 of its radius).
 *   • The HALO stays drawn: a wash with no edge, brightening with the charge.
 * The one thing the painting drops is the sun's slightly deeper gold while it
 * recharges — the smaller sun already says "not yet".
 *
 * Order, painted: halo, rays, then wand-and-sun — so the painted wand lies
 * over the rays where the drawn one lay under them. A wand in front of its
 * own sun's rays reads as holding it.
 */
export const drawSunbeam = (g: G2D, x: number, y: number, s: number, t: number, charge = 1, swell = 0): void => {
  const lw = Math.max(1.5, s * 0.035)
  const r = s * SUN_R * (1 + swell * 0.25) * (0.8 + 0.2 * charge)
  const ray = r * (1.25 + 0.35 * charge + 0.1 * sin(t * 6))
  const painted = !!spriteFor(SUNBEAM_ART.kind, SUNBEAM_ART.id)
  g.save()
  g.translate(x, y)
  if (!painted) wandShape(g, s, r, lw)
  // A soft halo that brightens as the light gathers.
  const halo = g.createRadialGradient(0, 0, r * 0.5, 0, 0, r * 2.4)
  halo.addColorStop(0, `rgba(255, 244, 190, ${0.55 * charge})`)
  halo.addColorStop(1, 'rgba(255, 244, 190, 0)')
  g.fillStyle = halo
  g.fillRect(-r * 2.4, -r * 2.4, r * 4.8, r * 4.8)
  // Eight rays, turning slowly; they lengthen as it charges.
  g.save()
  g.rotate(t * 0.8)
  if (!drawItem(g, SUNBEAM_RAYS_ART, ray / (SUN_R * RAY_REST))) raysShape(g, r, ray, lw)
  g.restore()
  // The sun itself (and, painted, the wand it sits on).
  if (!painted || !drawItem(g, SUNBEAM_ART, r / SUN_R)) sunShape(g, r, charge, lw)
  g.restore()
}

/** The sun's radius at rest (charged, no pull), in units of `s`. */
const SUN_R = 0.2
/** The rays' tips at rest (charged, mid-pulse), in units of the sun's radius. */
const RAY_REST = 1.6

/** The wand, from under a sun of radius `r` down-left, `s` the tool's size. */
const wandShape = (g: G2D, s: number, r: number, lw: number): void => {
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
}

/** Eight rays round a sun of radius `r`, their tips at `ray`. */
const raysShape = (g: G2D, r: number, ray: number, lw: number): void => {
  g.beginPath()
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
}

/** The sun's disc and its highlight, radius `r`. */
const sunShape = (g: G2D, r: number, charge: number, lw: number): void => {
  g.beginPath()
  g.arc(0, 0, r, 0, TAU)
  g.fillStyle = charge >= 1 ? '#ffe45c' : '#f7c94a'
  g.fill()
  line(g, lw)
  g.beginPath()
  g.arc(-r * 0.3, -r * 0.32, r * 0.3, 0, TAU)
  g.fillStyle = 'rgba(255, 255, 255, 0.75)'
  g.fill()
}

/** The Sunbeam as a painted still: the wand and its sun, charged, at rest.
 *  Its rays are a sheet of their own (they turn); its halo stays drawn. */
export const SUNBEAM_ART: ItemSpec = {
  ...ITEM_ART.sunbeam, frames: 1,
  draw: (g, s) => {
    const lw = Math.max(1.5, s * 0.035)
    wandShape(g, s, s * SUN_R, lw)
    sunShape(g, s * SUN_R, 1, lw)
  }
}

/** The Sunbeam's eight rays as a painted still, round an empty middle. */
export const SUNBEAM_RAYS_ART: ItemSpec = {
  ...ITEM_ART.sunbeamRays, frames: 1,
  draw: (g, s) => raysShape(g, s * SUN_R, s * SUN_R * RAY_REST, Math.max(1.5, s * 0.035))
}

let arenaGiftOn = false
let arenaRibbon: { ribbon: string; ribbonShade: string; gem?: string } | null = null
let arenaBox = false
let arenaChest = false
/** Show (or clear) the gift in the arena. The duel's renderer asks
 *  `arenaGiftShown()` each frame; the scene sets it on a win that earned one,
 *  wrapped in that chapter's ribbon (§8.2) — square when it holds the Magic
 *  Eraser, and the BOSS CHEST on a boss (paint-outstanding B7): the map card
 *  and the cleaning both show the chest for a boss, so a parcel dropping onto
 *  the island was a third, different gift for the same win. */
export const setArenaGift = (
  on: boolean, ribbon?: { ribbon: string; ribbonShade: string; gem?: string }, box = false, chest = false
): void => {
  arenaGiftOn = on
  arenaRibbon = ribbon ?? null
  arenaBox = box
  arenaChest = chest
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
  if (arenaChest) {
    // The chest takes no squash of its own: the landing's is a transform.
    g.save()
    g.translate(x, yy)
    g.scale(1 / Math.sqrt(squash), squash)
    drawChest(g, 0, 0, 96, {
      rot: u > FALL + 0.4 ? chestRattle(u) * 0.6 : 0, open: 0, gleam: 0.5 + 0.5 * sin(t * 4)
    }, arenaRibbon?.gem)
    g.restore()
    return
  }
  ;(arenaBox ? drawBoxGift : drawGift)(g, x, yy, 96, { rot: u > FALL + 0.4 ? giftShake(u) * 0.6 : 0, untie: 0, squash, ribbon: arenaRibbon?.ribbon, ribbonShade: arenaRibbon?.ribbonShade })
}
