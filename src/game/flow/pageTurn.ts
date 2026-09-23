/**
 * flow/pageTurn.ts — how a page of the storybook looks while it turns
 * (story-spec §8.28).
 *
 * Two places turn pages: a scene change (`flow/transition.ts`, which swings a
 * photograph of the frame that is leaving) and the map's own book
 * (`map/map.ts`, which swings the live page). They share the geometry and the
 * paper here, so a turn looks the same wherever it happens — which is the
 * whole point of the book.
 *
 * The model is a page hinged at the spine on its LEFT, swinging away from the
 * reader: at angle 0 it lies flat and covers its rect; at π/2 it is edge-on
 * and gone.
 *
 * IT IS A REAL TURN IN PERSPECTIVE, NOT A HORIZONTAL SQUEEZE. It used to be
 * `scale(cos a, 1)` with a gradient laid over it, and no amount of shading
 * ever made that look like paper: a squeezed rectangle keeps its full height
 * from the spine to the free edge, and a page leaning away from you does not.
 * The far edge is FURTHER, so it is SHORTER — and that single cue is what the
 * eye reads as depth.
 *
 * So `turnSlices` cuts the page into vertical strips and gives each one its
 * own height and position, from an actual projection: a column `u` of the way
 * across sits at depth `u·sin a`, is pulled toward the vanishing point by
 * `EYE / (EYE + depth)`, and lands at `u·cos a` times that. The page also
 * BOWS — real paper bellies toward the reader as it lifts, most of all
 * halfway over — which subtracts from the depth in the middle and is why the
 * belly comes up bigger and brighter than a flat plane would.
 *
 * The caller's part is the one thing this cannot do for it: the strips are
 * blitted from a picture of the page, so the page has to exist as a bitmap
 * first. `transition.ts` already had one (it swings a photograph of the frame
 * that is leaving); `map.ts` renders its live page to an offscreen canvas for
 * the few hundred milliseconds a turn lasts.
 */
import { cos, sin, PI } from '@/game/duel/util'
import { drawItem, type ItemSpec } from '@/game/artItem'

type G2D = CanvasRenderingContext2D

const INK = '#3A2340'
const PAPER = '#fff4e6'

/** Paper tips over once it is past upright: slow, then away. */
export const turnEase = (p: number): number => p * p * (3 - 2 * p)

/** The angle a page turned `p` (0..1) of the way stands at. */
export const turnAngle = (p: number): number => turnEase(Math.max(0, Math.min(1, p))) * (PI / 2)

/** How wide the page still is, as a fraction of flat. */
export const turnWidth = (p: number): number => cos(turnAngle(p))

/* ---------------------------- the projection ------------------------- */

/**
 * How far the reader's eye is from the page, in PAGE WIDTHS. Small enough
 * that the far edge visibly shortens; large enough that the page does not
 * bulge like a fish-eye. At 1.6 a page halfway over loses about a third of
 * its height at the free edge, which is what a real one does.
 */
const EYE = 1.6
/** How far the paper bellies toward the reader, in page widths, at its worst. */
const BOW = 0.09
/** Strips per turn. Enough that the tapering edge reads as a curve rather
 *  than a staircase, few enough that a turn is still ~36 blits a frame. */
const SLICES = 48

/** Paper is flat when it lies down and flat when it is edge-on; it bows most
 *  in between. Zero at both ends, one in the middle. */
const curlAt = (a: number): number => {
  const s = sin(a)
  return 4 * s * (1 - s)
}

/** Depth of the column `u` of the way across, in page widths. Away is +. */
const depthAt = (u: number, a: number): number => u * sin(a) - BOW * curlAt(a) * sin(PI * u)

/**
 * How lit a column is: < 0 in shadow, > 0 catching the light, as the fraction
 * of black or of warm white to lay over it.
 *
 * Read from the shape rather than invented: the gutter is a dark crease, the
 * belly of the curl turns toward the light, and the surface falls away into
 * shadow before the cut edge. Those are the five stops the old flat gradient
 * used, which were right — it was the geometry under them that was wrong.
 */
const LIGHT: readonly (readonly [number, number])[] = [
  [0, -0.30], [0.10, -0.10], [0.34, 0.20], [0.74, -0.22], [1, -0.46]
]
const litAt = (u: number): number => {
  for (let i = 1; i < LIGHT.length; i++) {
    const [u1, v1] = LIGHT[i]!
    if (u > u1) continue
    const [u0, v0] = LIGHT[i - 1]!
    return v0 + ((v1 - v0) * (u - u0)) / (u1 - u0 || 1)
  }
  return LIGHT[LIGHT.length - 1]![1]
}

/** One vertical strip of a turning page: where to cut it, and where it lands. */
export interface TurnSlice {
  /** The strip's left and right edges in the SOURCE, 0..1 of its width. */
  u0: number
  u1: number
  dx: number
  dw: number
  dy: number
  dh: number
}

/**
 * The strips a page standing at angle `a` over the rect `(x, y, w, h)` breaks
 * into, spine-first. Each carries its own height, because that is the whole
 * point — a column further from the reader is a shorter column.
 */
export const turnSlices = (
  x: number, y: number, w: number, h: number, a: number, n = SLICES
): TurnSlice[] => {
  const cy = y + h / 2
  const ca = cos(a)
  /** Where column `u` lands, as a fraction of the flat width, and how much of
   *  its height survives the distance. */
  const at = (u: number): [number, number] => {
    const k = EYE / (EYE + depthAt(u, a))
    return [u * ca * k, k]
  }
  const out: TurnSlice[] = []
  let [px] = at(0)
  for (let i = 0; i < n; i++) {
    const u0 = i / n
    const u1 = (i + 1) / n
    const [nx] = at(u1)
    // The strip's own height comes from its MIDDLE, so a strip is never
    // taller than the column to its left and shorter than the one to its
    // right at the same time.
    const [, k] = at((u0 + u1) / 2)
    const dx = x + px * w
    // A hairline of overlap: neighbouring strips land at fractional pixels and
    // a gap between them reads as a scratch down the page.
    const dw = (nx - px) * w + 1
    const dh = h * k
    out.push({ u0, u1, dx, dw, dy: cy - dh / 2, dh })
    px = nx
  }
  return out
}

/**
 * Blit `src` — a picture of the whole page — as a turning page into `g`, and
 * hand back where its free edge ended up so the caller can dress it.
 * `sw`/`sh` are the source's own size, so a caller may pass a canvas at
 * device scale.
 */
/**
 * The paper's own light, as ONE gradient across the warped leaf.
 *
 * Shading each strip with a flat fill banded the page — forty-eight steps of
 * two per cent alpha are invisible on a busy picture and perfectly obvious on
 * an open sky. The stops are the same five; they are simply placed where the
 * PROJECTION puts them, which is what keeps the crease in the gutter and the
 * lit belly on the belly as the page leans over.
 */
const turnWash = (g: G2D, x0: number, x1: number, a: number): CanvasGradient => {
  const far = EYE / (EYE + depthAt(1, a))
  const span = cos(a) * far || 1
  const grad = g.createLinearGradient(x0, 0, x1, 0)
  const lift = sin(a)
  for (const [u, v0] of LIGHT) {
    const k = EYE / (EYE + depthAt(u, a))
    const t = Math.max(0, Math.min(1, (u * cos(a) * k) / span))
    const v = v0 * lift
    grad.addColorStop(
      t,
      v < 0 ? `rgba(24,12,34,${(-v).toFixed(3)})` : `rgba(255,248,236,${v.toFixed(3)})`
    )
  }
  return grad
}

/**
 * The leaf's outline: the top edge falling away, the cut edge, and the bottom
 * edge coming back. Every strip is a rectangle, so without this the tapering
 * top and bottom read as a STAIRCASE — each strip a step taller than the one
 * beside it. Clipping to the true silhouette turns those steps back into the
 * smooth curve they are sampling, and it means the strip count only has to be
 * high enough for the CONTENT to look continuous, not the edge.
 */
const turnPath = (slices: readonly TurnSlice[]): Path2D => {
  const p = new Path2D()
  const first = slices[0]!
  const last = slices[slices.length - 1]!
  // Through the MIDDLE of each strip, not round its corners: a path traced
  // corner to corner is the staircase itself, and clipping a staircase to a
  // staircase changes nothing.
  p.moveTo(first.dx, first.dy)
  for (const s of slices) p.lineTo(s.dx + s.dw / 2, s.dy)
  p.lineTo(last.dx + last.dw, last.dy)
  p.lineTo(last.dx + last.dw, last.dy + last.dh)
  for (let i = slices.length - 1; i >= 0; i--) {
    const s = slices[i]!
    p.lineTo(s.dx + s.dw / 2, s.dy + s.dh)
  }
  p.lineTo(first.dx, first.dy + first.dh)
  p.closePath()
  return p
}

export const drawTurned = (
  g: G2D, src: CanvasImageSource, sw: number, sh: number,
  x: number, y: number, w: number, h: number, a: number
): { x: number; y: number; h: number } => {
  const slices = turnSlices(x, y, w, h, a)
  g.save()
  g.beginPath()
  g.clip(turnPath(slices))
  for (const s of slices) {
    if (s.dw <= 0) continue
    g.drawImage(src, s.u0 * sw, 0, (s.u1 - s.u0) * sw, sh, s.dx, s.dy, s.dw, s.dh)
  }
  const end = slices[slices.length - 1]
  if (end) {
    g.fillStyle = turnWash(g, x, end.dx + end.dw, a)
    g.fillRect(x, y, end.dx + end.dw - x, h)
  }
  g.restore()
  const last = slices[slices.length - 1]
  return last
    ? { x: last.dx + last.dw - 1, y: last.dy, h: last.dh }
    : { x, y, h }
}

/**
 * The free edge of a turning page: the shadow it throws on the leaf beneath,
 * its lit lip, and the cut edge of the paper seen end-on.
 *
 * The page's own light is no longer here — `turnSlices` carries it, because a
 * gradient across a rectangle cannot follow a page that is no longer a
 * rectangle. What is left is everything that happens AT the edge, and it is
 * given the edge's own shortened height rather than the page's, or the shadow
 * hangs below a leaf that has risen above it.
 */
export const shadeTurnEdge = (
  g: G2D, ex: number, ey: number, eh: number, h: number, a: number
): void => {
  const lift = sin(a)
  // It reaches further and softens as the page stands up, the way a real
  // shadow does when its caster leaves the surface.
  const reach = Math.max(8, h * (0.06 + 0.1 * lift))
  const sh = g.createLinearGradient(ex, 0, ex + reach, 0)
  sh.addColorStop(0, `rgba(24,12,34,${(0.46 * Math.max(0.22, lift)).toFixed(3)})`)
  sh.addColorStop(0.45, `rgba(24,12,34,${(0.16 * Math.max(0.22, lift)).toFixed(3)})`)
  sh.addColorStop(1, 'rgba(24,12,34,0)')
  g.fillStyle = sh
  g.fillRect(ex, ey, reach, eh)

  // The lit lip, then the paper's edge seen end-on. A WARM sliver rather than
  // a hard ink rule: at this size a black line reads as a crack, and what a
  // turning page actually shows there is the cut edge of paper.
  const lip = Math.max(2, h * 0.006)
  const lg = g.createLinearGradient(ex - lip * 2.2, 0, ex, 0)
  lg.addColorStop(0, 'rgba(255,244,230,0)')
  lg.addColorStop(1, `rgba(255,252,244,${(0.9 * lift).toFixed(3)})`)
  g.fillStyle = lg
  g.fillRect(ex - lip * 2.2, ey, lip * 2.2, eh)
  const cut = Math.max(1, lip * 0.5)
  const eg = g.createLinearGradient(ex, 0, ex + cut, 0)
  eg.addColorStop(0, `rgba(246,232,214,${(0.55 + 0.35 * lift).toFixed(3)})`)
  eg.addColorStop(1, `rgba(58,35,64,${(0.35 + 0.3 * lift).toFixed(3)})`)
  g.fillStyle = eg
  g.fillRect(ex, ey, cut, eh)
}

/**
 * The book's spine down the left edge of a page, and the gutter shadow the
 * binding casts onto the paper. `x` is the page's left edge.
 */
export const drawSpine = (g: G2D, x: number, py: number, ph: number, band: number): void => {
  const w = Math.max(6, band)
  // THE BINDING OVERHANGS THE PAGE. A cover is cut larger than the leaves it
  // holds — the "squares" a binder leaves at head and tail — and a spine that
  // stops exactly level with the paper reads as a stripe someone drew beside
  // it. It also left the violet ending short of the page's own top and bottom
  // edges, with the head bands sitting out there on their own like offcuts.
  const over = Math.max(4, w * 0.55)
  const y = py - over
  const h = ph + over * 2
  g.save()
  // Rounded at head and tail on the outer side only, where the cloth wraps the
  // board; square where it meets the paper.
  g.beginPath()
  g.roundRect(x - w, y, w, h, [over, 0, 0, over])
  g.clip()
  // The binding is ROUND: light runs along its crest and falls away into the
  // joints on both sides. A flat fill between two ink rules reads as a printed
  // rectangle, which is what this was.
  const round = g.createLinearGradient(x - w, 0, x, 0)
  round.addColorStop(0, '#2c1d42')
  round.addColorStop(0.22, '#4a3468')
  round.addColorStop(0.46, '#6b4e8e')
  round.addColorStop(0.62, '#553a75')
  round.addColorStop(1, '#2a1a3c')
  g.fillStyle = round
  g.fillRect(x - w, y, w, h)
  // The crest highlight — a thin warm sheen where the cloth turns over. It
  // fades out at head and tail so the ends read as rolled rather than cut.
  const crest = g.createLinearGradient(x - w * 0.56, 0, x - w * 0.34, 0)
  crest.addColorStop(0, 'rgba(255,238,214,0)')
  crest.addColorStop(0.5, 'rgba(255,238,214,0.20)')
  crest.addColorStop(1, 'rgba(255,238,214,0)')
  g.fillStyle = crest
  g.fillRect(x - w * 0.56, y, w * 0.22, h)
  // HEAD AND TAIL BANDS sit at the ends of the PAGES, inside the cover's
  // squares — that is where a binder puts them, and it is what leaves the
  // violet running unbroken to the very top and bottom of the binding.
  const cap = Math.min(ph * 0.03, w * 1.2)
  for (const cy of [py, py + ph - cap]) {
    g.fillStyle = '#d8c3a4'
    g.fillRect(x - w * 0.7, cy, w * 0.7, cap)
    g.fillStyle = 'rgba(58,35,64,0.4)'
    g.fillRect(x - w * 0.7, cy, w * 0.7, Math.max(1, cap * 0.3))
  }
  // Stitches: paired, slightly slanted, and never on a perfect ladder — a
  // hand sewed these. The wobble is derived from the row, so it is stable.
  g.lineCap = 'round'
  const step = Math.max(18, ph / 14)
  for (const [inset, alpha] of [[0.34, 0.16], [0.5, 0.5]] as const) {
    g.strokeStyle = `rgba(255,244,230,${alpha})`
    g.lineWidth = Math.max(1.2, w * (inset === 0.5 ? 0.13 : 0.1))
    g.beginPath()
    let i = 0
    for (let sy = py + cap + step * 0.5; sy < py + ph - cap - step * 0.3; sy += step, i++) {
      const lean = ((i % 3) - 1) * w * 0.06
      g.moveTo(x - w * inset - lean, sy)
      g.lineTo(x - w * inset + lean, sy + step * 0.4)
    }
    g.stroke()
  }
  g.restore()
  // The gutter shadow falls on the PAPER, so it keeps the paper's own extent.
  const gut = g.createLinearGradient(x, 0, x + w * 2.2, 0)
  gut.addColorStop(0, 'rgba(24,12,34,0.3)')
  gut.addColorStop(1, 'rgba(24,12,34,0)')
  g.fillStyle = gut
  g.fillRect(x, py, w * 2.2, ph)
}

/**
 * A folded corner — the page's own "turn me" handle, at the bottom of its
 * outer edge. `dir` 1 folds the bottom-right corner (turn forward), -1 the
 * bottom-left (turn back). `k` 0..1 lifts it (a press, or the idle hint).
 */
export const drawDogEar = (
  g: G2D, x: number, y: number, w: number, h: number, dir: 1 | -1, size: number, k: number,
  paper = PAPER, art: CanvasImageSource | null = null
): void => {
  const s = size * (1 + 0.28 * k)
  const cx = dir > 0 ? x + w : x
  const cy = y + h
  g.save()
  g.beginPath()
  g.moveTo(cx, cy - s)
  g.lineTo(cx, cy)
  g.lineTo(cx - dir * s, cy)
  g.closePath()
  g.fillStyle = 'rgba(24,12,34,0.18)'
  g.fill()
  g.beginPath()
  g.moveTo(cx, cy - s)
  g.lineTo(cx - dir * s, cy)
  g.lineTo(cx - dir * s * 0.12, cy - s * 0.12)
  g.closePath()
  if (art) {
    // THE FOLD IS THE PAGE, TURNED OVER. A flat cream triangle read as a white
    // sticker taped to a painted meadow, and even the page's average colour is
    // a guess at what happens to be under that one corner. So the corner is
    // the page's own picture MIRRORED about the crease — which is both exactly
    // what a folded corner shows and, for free, always the page's own colours.
    g.save()
    g.clip()
    const j = dir > 0 ? cx + cy - s : cx - cy + s
    g.transform(0, -dir, -dir, 0, j, dir * j)
    g.drawImage(art, x, y, w, h)
    g.restore()
    // The back of a sheet is the side the light did not reach through — a
    // wash, not a coat: too much of it and the page's colour is gone again.
    g.fillStyle = 'rgba(255,248,236,0.3)'
    g.fill()
  } else {
    g.fillStyle = paper
    g.fill()
  }
  g.lineWidth = Math.max(1.5, s * 0.06)
  g.strokeStyle = INK
  g.stroke()
  g.restore()
}

/** How long the ribbon is, in units of its width — the shape both the
 *  drawing and the painting are built to. */
const RIBBON = 3.2

/**
 * The ribbon's shape, hanging from the origin: `w` across, `RIBBON × w` long,
 * notched at the foot. Drawn with no sway — that is the caller's shear, so a
 * PAINTED ribbon sways exactly as the drawn one does.
 */
export const bookmarkShape = (g: G2D, w: number): void => {
  const len = w * RIBBON
  g.beginPath()
  g.moveTo(-w / 2, -w * 0.6)
  g.lineTo(w / 2, -w * 0.6)
  g.lineTo(w / 2, len)
  g.lineTo(0, len - w * 0.55)
  g.lineTo(-w / 2, len)
  g.closePath()
}

/** The bench's handle on the ribbon. Its whole body takes the chapter's
 *  colour, so the reference is drawn in the neutral the game tints. */
export const BOOKMARK_ART: ItemSpec = {
  kind: 'worldUi',
  id: 'bookmark',
  frames: 1,
  tinted: true,
  draw: (g, s, _f, accent) => {
    bookmarkShape(g, s)
    g.fillStyle = accent.base
    g.fill()
    g.lineWidth = Math.max(1.5, s * 0.12)
    g.strokeStyle = INK
    g.stroke()
  }
}

/** The ribbon that marks the reader's place, hanging over a page's top edge. */
export const drawBookmark = (g: G2D, x: number, y: number, len: number, w: number, colour: string, t: number): void => {
  const sway = sin(t * 1.6) * w * 0.08
  g.save()
  // The sway as a SHEAR about the ribbon's top, so the painting bends the
  // same way the drawing did rather than sliding sideways as a rigid block.
  g.translate(x, y)
  g.transform(1, 0, sway / Math.max(1, len), 1, 0, 0)
  if (!drawItem(g, BOOKMARK_ART, w, 0, colour)) {
    bookmarkShape(g, w)
    g.fillStyle = colour
    g.fill()
    g.lineWidth = Math.max(1.5, w * 0.12)
    g.strokeStyle = INK
    g.stroke()
  }
  g.restore()
}
