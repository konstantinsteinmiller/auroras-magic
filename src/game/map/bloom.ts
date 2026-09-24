/**
 * map/bloom.ts — a sector's Bloom (story-spec §8.8.5): the Twin Gift's only
 * payload. A few extra animated props layered onto a restored sector — tall
 * swaying flowers, a hopping bunny, a pair of pastel butterflies — and a
 * gentle sparkle. No power, no progress: the world is a little more alive.
 *
 * It is drawn by the map inside a sector's own clip and transform, in sector
 * units, and only for a sector the live-prop budget already covers (§9.5's
 * cap): extra props within the existing cap, never a new render path. Every
 * position comes from the sector's own seed, so a bloom looks the same on
 * every visit.
 */
import { SEC_W } from '@/game/restore/mask'
import { INK, C, flower, butterfly, fill, ink, twinklePainted, type G2D } from '@/game/map/kit'
import { seeded, sin, cos, TAU, PI } from '@/game/duel/util'
import { drawItem, type ItemSpec } from '@/game/artItem'
import { PROP_ART } from '@/game/artIds'

const PETALS = ['#ff8fc4', '#ffe36b', '#c9a6ff', '#8fd8ff', '#ffffff', '#ffb36b']

interface BloomLayout {
  flowers: [number, number, number, string][]
  sparks: [number, number, number][]
  hopY: number
  flyY: number
}

const layouts = new Map<number, BloomLayout>()

const layoutOf = (n: number): BloomLayout => {
  let l = layouts.get(n)
  if (l) return l
  const r = seeded(9001 + n * 131)
  const flowers: BloomLayout['flowers'] = []
  for (let i = 0; i < 7; i++) {
    flowers.push([60 + ((i + r() * 0.6) / 7) * (SEC_W - 120), 560 + r() * 80, 12 + r() * 6, PETALS[(r() * PETALS.length) | 0]!])
  }
  const sparks: BloomLayout['sparks'] = []
  for (let i = 0; i < 8; i++) sparks.push([60 + r() * (SEC_W - 120), 120 + r() * 440, r() * TAU])
  l = { flowers, sparks, hopY: 612 + r() * 24, flyY: 250 + r() * 120 }
  layouts.set(n, l)
  return l
}

/** A tall flower on a stem, swaying from its root. */
const tallFlower = (g: G2D, x: number, y: number, r: number, petal: string, t: number, i: number): void => {
  const sway = sin(t * 1.4 + i * 1.7) * 0.12
  const h = r * 3.2
  const tx = x + sin(sway) * h
  const ty = y - cos(sway) * h
  g.beginPath()
  g.moveTo(x, y)
  g.quadraticCurveTo(x + sway * h * 0.2, y - h * 0.5, tx, ty)
  g.lineWidth = 5
  g.strokeStyle = INK
  g.lineCap = 'round'
  g.stroke()
  g.lineWidth = 2.5
  g.strokeStyle = C.mossShade
  g.stroke()
  // One leaf, halfway up.
  g.beginPath()
  g.ellipse(x + 8, y - h * 0.42, 9, 4, -0.6, 0, TAU)
  fill(g, C.moss)
  ink(g, 2)
  // The HEAD is painted (`prop-flower-head`, tinted); the stem and its leaf
  // stay drawn — a hairline, and a leaf under the size floor.
  g.save()
  g.translate(tx, ty)
  g.rotate(t * 0.4 + i)
  const bloomed = drawItem(g, FLOWER_HEAD_ART, r, 0, petal)
  g.restore()
  if (!bloomed) flower(g, tx, ty, r, petal, t * 0.4 + i)
}

/** The radius a flower head is authored at, in SU — the middle of the
 *  Bloom's 12–18. */
const FLOWER_UNIT = 15

/**
 * The Bloom's tall-flower HEAD as a painted still, tinted: five round petals
 * and a butter centre. Every one of the seven wears its own petal colour
 * (the tint), turns slowly (a rotation) and sways on its stem (a translate).
 */
export const FLOWER_HEAD_ART: ItemSpec = {
  ...PROP_ART.flowerHead, frames: 1, tinted: true,
  draw: (g, s, _f, accent) => {
    g.save()
    g.scale(s / FLOWER_UNIT, s / FLOWER_UNIT)
    flower(g, 0, 0, FLOWER_UNIT, accent.base, 0)
    g.restore()
  }
}

/** The bloom-critter: a small white bunny hopping to and fro. */
const bunny = (g: G2D, y: number, t: number, seed: number): void => {
  const HOP = 0.62
  const span = 26
  const lane = 9
  const k = (t / HOP + seed) % (span * 2)
  const i = Math.floor(k)
  const u = k - i
  const out = i < span
  const step = out ? i + u : span * 2 - (i + u)
  const x = 200 + (step / span) * (SEC_W - 400) + sin(seed) * 60
  const lift = sin(u * PI) * 26
  const squash = 1 + 0.12 * sin(u * PI)
  g.save()
  g.translate(x, y - lift + (Math.floor(seed) % 2) * lane)
  g.scale(out ? 1 : -1, 1)
  // Shadow.
  g.beginPath()
  g.ellipse(0, lift, 16 - lift * 0.2, 4, 0, 0, TAU)
  g.fillStyle = 'rgba(58,35,64,0.18)'
  g.fill()
  g.scale(1 / squash, squash)
  if (!drawItem(g, BUNNY_ART, BUNNY_UNIT)) bunnyShape(g, lift)
  g.restore()
}

/** Ear tip to foot at rest, in SU — the bunny's own height. */
const BUNNY_UNIT = 53

/**
 * The Bloom's bunny as a painted still: it hops to and fro across the grass,
 * and every part of that — the hop, the squash, the turn at each end — is a
 * transform of one constant bunny (§4b's mover rule). Its ears flop by a few
 * degrees with the hop in the drawing; the painting holds them at rest. Its
 * contact shadow stays drawn, under it: a shadow on the magenta is welded to
 * the sprite.
 */
export const BUNNY_ART: ItemSpec = {
  ...PROP_ART.bunny, frames: 1,
  draw: (g, s) => {
    g.save()
    g.scale(s / BUNNY_UNIT, s / BUNNY_UNIT)
    bunnyShape(g, 0)
    g.restore()
  }
}

/** The bunny itself, feet on the origin, facing right; `lift` flops the ears. */
const bunnyShape = (g: G2D, lift: number): void => {
  // Tail, body, head.
  g.beginPath()
  g.arc(-15, -12, 6, 0, TAU)
  fill(g, '#ffffff')
  ink(g, 2.2)
  g.beginPath()
  g.ellipse(0, -12, 16, 12, 0, 0, TAU)
  fill(g, '#fff6fb')
  ink(g, 2.4)
  g.beginPath()
  g.arc(13, -24, 10, 0, TAU)
  fill(g, '#fff6fb')
  ink(g, 2.4)
  // Ears, a little floppy with the hop.
  for (const [ex, lean] of [[9, -0.25], [16, 0.15]] as const) {
    g.save()
    g.translate(ex, -32)
    g.rotate(lean - lift * 0.006)
    g.beginPath()
    g.ellipse(0, -10, 4.5, 11, 0, 0, TAU)
    fill(g, '#fff6fb')
    ink(g, 2.2)
    g.beginPath()
    g.ellipse(0, -10, 2, 7, 0, 0, TAU)
    fill(g, '#ffb3d2')
    g.restore()
  }
  g.beginPath()
  g.arc(17, -26, 1.8, 0, TAU)
  fill(g, INK)
  g.beginPath()
  g.arc(22, -22, 1.6, 0, TAU)
  fill(g, '#ff8fb8')
}

/** A four-point twinkle. */
const twinkle = (g: G2D, x: number, y: number, r: number): void => {
  g.beginPath()
  for (let i = 0; i < 8; i++) {
    const a = (i * PI) / 4
    const rr = i & 1 ? r * 0.3 : r
    if (i) g.lineTo(x + cos(a) * rr, y + sin(a) * rr)
    else g.moveTo(x + rr, y)
  }
  g.closePath()
  g.fill()
}

/** Draw sector `n`'s bloom, in sector units, at time `t`. */
export const drawBloom = (g: G2D, n: number, t: number): void => {
  const l = layoutOf(n)
  l.flowers.forEach(([x, y, r, p], i) => tallFlower(g, x, y, r, p, t, i))
  bunny(g, l.hopY, t, n * 3.7 + 1.3)
  butterfly(g, SEC_W * 0.34, l.flyY, t, 3 + n, '#c9a6ff', 1)
  butterfly(g, SEC_W * 0.66, l.flyY - 40, t, 5 + n, '#8fd8ff', 1)
  // The gentle sparkle: each twinkle breathes on its own phase.
  g.save()
  g.fillStyle = '#fffbe0'
  for (const [x, y, ph] of l.sparks) {
    const k = 0.5 + 0.5 * sin(t * 2.2 + ph)
    g.globalAlpha = 0.25 + 0.65 * k
    // The shared painted twinkle once it has landed (B8); this star's own
    // straight-edged drawing otherwise.
    if (twinklePainted(g, x + sin(t * 0.5 + ph) * 6, y, 6 + 6 * k, '#fffbe0')) continue
    twinkle(g, x + sin(t * 0.5 + ph) * 6, y, 6 + 6 * k)
  }
  g.restore()
}
