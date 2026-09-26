/**
 * ribbonFrame.ts — the shape of the VS preview's satin NAME RIBBONS, once,
 * for both art modes (`VsRibbon.vue`, `VsBanner.vue`; the `hpFrame.ts`
 * pattern).
 *
 * A ribbon is a storybook banner: a straight satin BAND with a selvedge
 * (gold for Aurora, moonlit silver for the night, gold on the paper chapter
 * banner) that carries the name, a little ornament at each end of the band
 * (her star, the night's crescent, a spark), and at each end a FORKED
 * SWALLOW-TAIL hanging a little lower, behind the band, joined to it by a dark
 * FOLD where the ribbon turns under.
 *
 * The band's length changes with the name — "AURORA" is six letters, a
 * transliterated name in Hindi or a Guardian's name in Russian is not — so
 * only the band's plain middle may stretch: both ends (tail, fold, the band's
 * end with its ornament) keep their shape at every length.
 *
 * Everything is in units of the BAND'S HEIGHT (`H` CSS px on screen), in
 * LOCAL coordinates: x from the left tail's tip (0) to the right one's
 * (`END`), y from the band's top (0) to its foot (1); the tails hang lower.
 *
 * Three readers, one geometry:
 *   · the DRAWN ribbon: `ribbonParts` → an SVG image (`drawnRibbonUrl`), laid
 *     on as a 9-slice `border-image` exactly as a painting would be — so the
 *     drawn and the painted ribbon are one code path, and one DOM element;
 *   · the REFERENCE the painter paints from (`RIBBON_ART[side].draw`, for the
 *     art bench's `WORLD_UI_SHEETS`): the same parts, thin-inked, with the
 *     band at its reference length `MID_REF`;
 *   · the PAINTED ribbon: `useArtImage('worldUi', RIBBON_IDS[side])` laid on
 *     by `ribbonBandStyle`, sliced at `SLICE_X` from each tip so the tails,
 *     folds and ornaments are never stretched and only the plain band is.
 */
import type { ItemSpec } from '@/game/artItem'
import {
  REF_INK, drawParts, markBox, mirrorX, partsSvg, readPalette, rectPts, roundPts, shift, sparkPts, starPts, crescentPts, svgUrl,
  type Box, type Part, type Pt, type TokenMap
} from '@/components/preview/previewParts'

export type RibbonSide = 'aurora' | 'foe' | 'banner'

/** The painted ribbons' art ids (`worldUi`), registered as
 *  `artIds.VS_PREVIEW_ART` / `artSheet.PREVIEW_SHEETS` (a test holds the two
 *  to each other). */
export const RIBBON_IDS = {
  aurora: 'vs-ribbon-aurora',
  foe: 'vs-ribbon-foe'
} as const

/* ─────────────────────────────────── the layout ─────────────────────────── */

/** How far each tail runs out past the band's end. */
export const TAIL = 0.82
/** How much lower than the band a tail hangs… */
export const DROP = 0.2
/** …and how much more it droops toward its tip. */
const SLANT = 0.06
/** The ribbon's full height, band top to the tails' tips, in H: the layout
 *  reserves THIS (`PREVIEW_DOM.ribbonH`, "tails included"). */
export const SPAN_Y = 1 + DROP + SLANT
/** The swallow-tail's notch, cut in from the tip. */
const NOTCH = 0.34
/** How far the tail tucks in behind the band (the fold's width). */
const FOLD = 0.26
/** The band's end zone: it holds the ornament and is the name's side
 *  padding. The slice falls `SLICE_AIR` past it, on plain band. */
export const CAP = 0.44
/** The selvedge along the band's top and foot. */
export const EDGE = 0.13
/** The band's plain middle in the REFERENCE, which the game then stretches. */
export const MID_REF = 1.8
/** The reference ribbon's full length, tip to tip. */
export const END = 2 * (TAIL + CAP) + MID_REF
/**
 * Plain satin the fixed end keeps past its end zone. The ornament fills
 * `CAP` — the star's tip came to 0.01 H of a slice at `TAIL + CAP` — and a
 * painter's ornament a little bigger, or a little further in, would be cut
 * and stretched across the middle as a gold smear. The HP frames' rule: each
 * slice sits well into plain rail. Invisible on the drawing, whose band is
 * plain there too; the name's padding stays `CAP`.
 */
export const SLICE_AIR = 0.14
/** Where the painting is sliced, in from each tip: past the ornament, on plain band. */
export const SLICE_X = TAIL + CAP + SLICE_AIR
/** The drawn ribbon's plum line, in H (4 px on a 79 px band). */
export const RIBBON_INK = 0.05

/* ─────────────────────────────────── the parts ──────────────────────────── */

/** The left end's parts: its tail, the fold and the band's end ornament. The
 *  right end is the same, mirrored. */
const endParts = (side: RibbonSide): { drop: Part[]; behind: Part[]; front: Part[] } => {
  const xi = TAIL + FOLD
  const top = (x: number): number => DROP + SLANT * (1 - x / xi)
  // The notch's two edges, as x at a depth `o` (0 top … 1 foot) into the tail.
  const nx = (o: number): number => NOTCH * (o <= 0.5 ? o / 0.5 : (1 - o) / 0.5)
  const at = (o: number): Pt => [nx(o), top(nx(o)) + o]
  const tail = roundPts([
    [xi, DROP],
    [0, top(0)],
    [NOTCH, top(NOTCH) + 0.5],
    [0, top(0) + 1],
    [xi, DROP + 1]
  ], [0, 0.05, 0.04, 0.05, 0])
  // Selvedge along the tail's top and foot, and a satin sheen under the top.
  const edgeTop: Pt[] = [at(0.02), [xi, DROP], [xi, DROP + EDGE], at(EDGE)]
  const edgeFoot: Pt[] = [at(1 - EDGE), [xi, DROP + 1 - EDGE], [xi, DROP + 1], at(0.98)]
  const sheen: Pt[] = [at(EDGE + 0.07), [xi, DROP + EDGE + 0.07], [xi, DROP + EDGE + 0.18], at(EDGE + 0.18)]
  const fold: Pt[] = [[TAIL, 1], [xi, 1], [xi, top(xi) + 1]]
  const drop: Part[] = [
    { pts: shift(tail, 0, DROP_Y), paint: 'drop', drawnOnly: true },
    { pts: shift(fold, 0, DROP_Y), paint: 'drop', drawnOnly: true }
  ]
  const behind: Part[] = [
    { pts: tail, paint: 'tail' },
    { pts: sheen, paint: 'tailLite' },
    { pts: edgeTop, paint: 'tailEdge' },
    { pts: edgeFoot, paint: 'tailEdge' },
    // The tail's outline goes on over its stripes, so their ends tuck under it.
    { pts: [...tail, tail[0]!], paint: 'ink', line: true },
    // The fold: the ribbon's underside where it turns from the band to the tail.
    { pts: fold, paint: 'fold', ink: 1 }
  ]
  // The ornament, centred in the band's end zone.
  const cx = TAIL + CAP / 2 + 0.01
  const cy = 0.5
  const front: Part[] = side === 'aurora'
    ? [
        { pts: starPts(cx, cy + 0.015, 0.21, 0.1), paint: 'orn', ink: 0.8 },
        { pts: starPts(cx + 0.015, cy + 0.045, 0.12, 0.06), paint: 'ornShade' },
        { pts: sparkPts(cx - 0.05, cy - 0.04, 0.05), paint: 'ornLite' }
      ]
    : side === 'foe'
      ? [
          { pts: crescentPts(cx - 0.02, cy, 0.19, cx + 0.07, cy - 0.07, 0.16), paint: 'orn', ink: 0.8 },
          { pts: sparkPts(cx + 0.09, cy + 0.07, 0.065), paint: 'ornLite', ink: 0.5 }
        ]
      : [{ pts: sparkPts(cx, cy, 0.18), paint: 'orn', ink: 0.7 }]
  return { drop, behind, front }
}

/** How far below the ribbon its soft plum drop falls (drawn only), in H —
 *  inside the box's air, so the painting's box is the drawing's. */
const DROP_Y = 0.08

/**
 * The whole ribbon at a band length of `mid` (the plain middle, in H), in
 * paint order: tails and folds behind, then the band, then the ornaments.
 */
export const ribbonParts = (side: RibbonSide, mid = MID_REF): Part[] => {
  const end = 2 * (TAIL + CAP) + mid
  const x0 = TAIL
  const x1 = end - TAIL
  const { drop, behind, front } = endParts(side)
  const flip = (p: Part): Part => ({ ...p, pts: mirrorX(p.pts, end / 2) })
  const band = roundPts(rectPts(x0, 0, x1, 1), 0.03)
  return [
    ...drop, ...drop.map(flip),
    { pts: shift(band, 0, DROP_Y), paint: 'drop', drawnOnly: true },
    ...behind, ...behind.map(flip),
    { pts: band, paint: 'band' },
    // Satin: a deeper foot, a sheen just under the selvedge.
    { pts: rectPts(x0, 0.58, x1, 1 - EDGE), paint: 'bandFoot' },
    { pts: rectPts(x0, EDGE + 0.07, x1, EDGE + 0.18), paint: 'bandLite' },
    // The selvedge: lit along the top, in shade along the foot.
    { pts: rectPts(x0, 0, x1, EDGE), paint: 'edge' },
    { pts: rectPts(x0, 0.03, x1, 0.06), paint: 'edgeLite' },
    { pts: rectPts(x0, 1 - EDGE, x1, 1), paint: 'edgeShade' },
    // Where the selvedge is woven on: a fine seam either side.
    { pts: [[x0, EDGE], [x1, EDGE]], paint: 'ink', line: true, ink: 0.45 },
    { pts: [[x0, 1 - EDGE], [x1, 1 - EDGE]], paint: 'ink', line: true, ink: 0.45 },
    { pts: [...band, band[0]!], paint: 'ink', line: true },
    ...front, ...front.map(flip)
  ]
}

/* ────────────────────────────────── the palette ─────────────────────────── */

/** Each side's paint roles, as the `--am-*` tokens that colour them. */
export const RIBBON_TOKENS: Readonly<Record<RibbonSide, TokenMap>> = {
  aurora: {
    ink: '--am-ink', drop: '--am-vs-drop',
    tail: '--am-vs-rose-tail', tailLite: '--am-vs-rose-foot', tailEdge: '--am-gold-foot', fold: '--am-vs-rose-fold',
    band: '--am-vs-rose', bandFoot: '--am-vs-rose-foot', bandLite: '--am-vs-rose-lite',
    edge: '--am-gold', edgeLite: '--am-gold-lite', edgeShade: '--am-gold-foot',
    orn: '--am-gold', ornShade: '--am-gold-foot', ornLite: '--am-paper-raised'
  },
  foe: {
    ink: '--am-ink', drop: '--am-vs-drop',
    tail: '--am-vs-night-tail', tailLite: '--am-vs-night-foot', tailEdge: '--am-moon-silver-shade', fold: '--am-vs-night-fold',
    band: '--am-vs-night', bandFoot: '--am-vs-night-foot', bandLite: '--am-vs-night-lite',
    edge: '--am-moon-silver', edgeLite: '--am-moon-silver-lite', edgeShade: '--am-moon-silver-shade',
    orn: '--am-moon-silver', ornShade: '--am-moon-silver-shade', ornLite: '--am-moon-silver-lite'
  },
  banner: {
    ink: '--am-ink', drop: '--am-vs-drop',
    tail: '--am-paper-sunken', tailLite: '--am-parchment', tailEdge: '--am-gold-foot', fold: '--am-vs-paper-fold',
    band: '--am-paper', bandFoot: '--am-parchment', bandLite: '--am-paper-raised',
    edge: '--am-gold', edgeLite: '--am-gold-lite', edgeShade: '--am-gold-foot',
    orn: '--am-gold', ornShade: '--am-gold-foot', ornLite: '--am-paper-raised'
  }
}

/* ─────────────────────────────────── the slices ─────────────────────────── */

/**
 * How a ribbon image — the drawing or the painting, the same box either way —
 * is laid on the band as a `border-image`. The band's own box is the band
 * (height H, width = the name plus a `CAP` either side); the image overhangs
 * it by `out*` (the tails, the air) through `border-image-outset`, so the
 * layout never sees the tails.
 */
export interface RibbonSlices {
  /** The image's box in local units (the reference at `MID_REF`, with air). */
  box: Box
  /** Slice lines, as fractions of the image's width: from its left, from its right. */
  sliceL: number
  sliceR: number
  /** The widths the two fixed end columns are drawn at, in H. */
  widthL: number
  widthR: number
  /** The image's overhang past the band's box, in H: top, right, bottom, left. */
  outT: number
  outR: number
  outB: number
  outL: number
  /** The band's padding either side of the name, in H. */
  pad: number
}

const slicesCache = new Map<RibbonSide, RibbonSlices>()

export const ribbonSlices = (side: RibbonSide): RibbonSlices => {
  const hit = slicesCache.get(side)
  if (hit) return hit
  // Measured on the REFERENCE's thin line: that is what the slicer cuts.
  const b = markBox(ribbonParts(side), REF_INK)
  const right = b.x + b.w
  const s: RibbonSlices = {
    box: b,
    sliceL: (SLICE_X - b.x) / b.w,
    sliceR: (right - (END - SLICE_X)) / b.w,
    widthL: SLICE_X - b.x,
    widthR: right - (END - SLICE_X),
    outT: -b.y,
    outR: right - (END - TAIL),
    outB: b.y + b.h - 1,
    outL: TAIL - b.x,
    pad: CAP
  }
  slicesCache.set(side, s)
  return s
}

/**
 * The band's style for an image `src` (a CSS `url(...)`) at a band height of
 * `h` CSS px: the 9-slice with the two ends at their own size and only the
 * plain middle stretched.
 */
export const ribbonBandStyle = (side: RibbonSide, h: number, src: string): Record<string, string> => {
  const s = ribbonSlices(side)
  const px = (v: number): string => `${(v * h).toFixed(2)}px`
  const pc = (v: number): string => `${(v * 100).toFixed(3)}%`
  return {
    borderImageSource: src,
    borderImageSlice: `0 ${pc(s.sliceR)} 0 ${pc(s.sliceL)} fill`,
    borderImageWidth: `0 ${px(s.widthR)} 0 ${px(s.widthL)}`,
    borderImageOutset: `${px(s.outT)} ${px(s.outR)} ${px(s.outB)} ${px(s.outL)}`,
    borderImageRepeat: 'stretch',
    paddingLeft: px(s.pad),
    paddingRight: px(s.pad)
  }
}

/* ───────────────────────────────── the drawing ──────────────────────────── */

const drawnCache = new Map<RibbonSide, string>()

/**
 * The DRAWN ribbon as a CSS `url()`: the reference geometry at the game's own
 * line weight, in the side's tokens. Null where no stylesheet can be read.
 */
export const drawnRibbonUrl = (side: RibbonSide): string | null => {
  const hit = drawnCache.get(side)
  if (hit) return hit
  const pal = readPalette(RIBBON_TOKENS[side])
  if (!pal) return null
  const url = svgUrl(partsSvg(ribbonParts(side), ribbonSlices(side).box, pal, RIBBON_INK))
  drawnCache.set(side, url)
  return url
}

/* ──────────────────────────────── the reference ─────────────────────────── */

/**
 * The two paintable ribbons as bench drawables (for `artDraw.WORLD_UI_SPECS`
 * / `artSheet.WORLD_UI_SHEETS`). `s` is px per H. Centred on the origin like
 * every item. The paint is read from the tokens at draw time — the bench runs
 * inside the app, with `theme.sass` loaded.
 *
 * WHAT TO ASK THE PAINTER FOR: the band's middle PLAIN — even satin, the
 * selvedge running straight, no stitch pattern, no highlight that moves — for
 * the same reason the HP rail's is: the game stretches it to the name.
 */
const ribbonArt = (side: 'aurora' | 'foe'): ItemSpec => ({
  kind: 'worldUi',
  id: RIBBON_IDS[side],
  frames: 1,
  draw: (g, s) => {
    const pal = readPalette(RIBBON_TOKENS[side])
    if (!pal) return
    g.save()
    g.scale(s, s)
    g.translate(-END / 2, -0.5)
    drawParts(g, ribbonParts(side), pal)
    g.restore()
  }
})

export const RIBBON_ART: Readonly<Record<'aurora' | 'foe', ItemSpec>> = {
  aurora: ribbonArt('aurora'),
  foe: ribbonArt('foe')
}
