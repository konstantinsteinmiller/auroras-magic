/**
 * vsMarks.ts — the VS preview's small drawn marks: the VS MEDALLION, a
 * Guardian's CROWN, the three COUNTDOWN STARS and the chapter banner's PIPS.
 *
 * Each is a list of parts (`previewParts.ts`) the DOM turns into one SVG
 * image on one element — a background, never an inline `<svg>` with a dozen
 * children — and the two that are paintable (the medallion, the crown) are
 * also the art bench's reference, drawn from the very same polygons
 * (`VS_MARK_ART`). A painting is laid over exactly the box its drawing
 * occupies (`emblemBox` / `crownBox`, = `markBox` on the reference), so the
 * two swap without drift.
 *
 * Every mark is WORDLESS: the medallion's "VS" is DOM type set over it
 * (`t('preview.vs')`, 21 locales), never part of the art.
 */
import type { ItemSpec } from '@/game/artItem'
import {
  REF_INK, circlePts, crescentPts, drawParts, markBox, partsSvg, readPalette, rectPts, roundPts, shift, softenPts,
  sparkPts, starPts, svgUrl, type Box, type Part, type Pt, type TokenMap
} from '@/components/preview/previewParts'

/** The two paintable marks' art ids (`worldUi`), registered as
 *  `artIds.VS_PREVIEW_ART` / `artSheet.PREVIEW_SHEETS` (a test holds the two
 *  to each other). */
export const MARK_IDS = {
  emblem: 'vs-emblem',
  crown: 'vs-crown'
} as const

/* ────────────────────────────────── the medallion ───────────────────────── */

/**
 * The VS medallion, in units of its radius (`lay.vs.r`): a scalloped gold
 * star-burst rim set with little pearls, a gold bevel, a cream-pink enamel
 * face, and two small unicorn horns crossed behind where the letters go —
 * Aurora's blossom pink and the night's lilac, one for each side. Two
 * twinkles catch the rim.
 */
export const emblemParts = (): Part[] => {
  const burst: Pt[] = []
  const N = 14
  for (let k = 0; k < N * 2; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / N
    const r = k % 2 ? 0.88 : 1.07
    burst.push([Math.cos(a) * r, Math.sin(a) * r])
  }
  const rim = softenPts(burst, 2)
  const parts: Part[] = [
    // The soft plum drop under the whole seal (drawn only).
    { pts: shift(rim, 0, 0.06), paint: 'drop', drawnOnly: true },
    { pts: rim, paint: 'rim', ink: 1 },
    { pts: circlePts(0, 0, 0.8, 48), paint: 'rimShade' }
  ]
  // A pearl on the rim toward each point of the burst.
  for (let k = 0; k < N; k++) {
    const a = -Math.PI / 2 + (k * 2 * Math.PI) / N
    parts.push({ pts: circlePts(Math.cos(a) * 0.9, Math.sin(a) * 0.9, 0.04, 10), paint: 'pearl' })
  }
  parts.push(
    { pts: circlePts(0, 0, 0.74, 48), paint: 'enamel', ink: 0.8 },
    { pts: crescentPts(0, 0, 0.74, 0, -0.13, 0.73), paint: 'enamelShade' },
    { pts: crescentPts(0, 0, 0.66, 0.07, 0.09, 0.65), paint: 'enamelLite' }
  )
  // Two little horns, crossed. Each is a slender cone with a round base and a
  // soft tip, and three slanted grooves for its spiral.
  const horn = (bx: number, by: number, tx: number, ty: number, paint: string): Part[] => {
    const len = Math.hypot(tx - bx, ty - by)
    const ux = (tx - bx) / len
    const uy = (ty - by) / len
    const nx = -uy
    const ny = ux
    const hw = 0.1
    const base: Pt[] = []
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI / 2 + (i * Math.PI) / 8
      base.push([bx + (nx * Math.sin(a) + ux * Math.cos(a)) * hw, by + (ny * Math.sin(a) + uy * Math.cos(a)) * hw])
    }
    const body = roundPts([...base, [tx, ty]], base.map(() => 0).concat([0.05]))
    const grooves: Part[] = [0.3, 0.5, 0.7].map((t) => {
      const w = hw * (1 - t) + 0.015
      const cx = bx + ux * len * t
      const cy = by + uy * len * t
      return {
        pts: [[cx + nx * w, cy + ny * w], [cx - nx * w + ux * 0.06, cy - ny * w + uy * 0.06]] as Pt[],
        paint: 'ink',
        line: true,
        ink: 0.55
      }
    })
    return [{ pts: body, paint, ink: 0.8 }, ...grooves]
  }
  parts.push(
    ...horn(0.42, 0.44, -0.46, -0.44, 'hornB'),
    ...horn(-0.42, 0.44, 0.46, -0.44, 'hornA'),
    { pts: sparkPts(0.74, -0.72, 0.15), paint: 'spark', ink: 0.6 },
    { pts: sparkPts(-0.8, 0.66, 0.1), paint: 'spark', ink: 0.6 }
  )
  return parts
}

export const EMBLEM_TOKENS: TokenMap = {
  ink: '--am-ink', drop: '--am-vs-drop',
  rim: '--am-gold', rimShade: '--am-gold-foot', pearl: '--am-paper-raised',
  enamel: '--am-vs-enamel', enamelShade: '--am-vs-enamel-shade', enamelLite: '--am-paper-raised',
  hornA: '--am-magic-1', hornB: '--am-magic-2', spark: '--am-paper-raised'
}

/* ──────────────────────────────────── the crown ─────────────────────────── */

/**
 * A Guardian's crown, perched on her ribbon: in units of its width (1). Three
 * soft points with a pearl on each, a band with a rosy heart-cut gem between
 * two small lilac ones. Round everywhere — a storybook crown, not a regal one.
 */
export const crownParts = (): Part[] => {
  const body = roundPts([
    [-0.46, 0.34], [-0.48, 0.08], [-0.56, -0.34], [-0.24, -0.06], [0, -0.46],
    [0.24, -0.06], [0.56, -0.34], [0.48, 0.08], [0.46, 0.34]
  ], [0.07, 0.03, 0.05, 0.06, 0.05, 0.06, 0.05, 0.03, 0.07])
  return [
    { pts: shift(body, 0, 0.06), paint: 'drop', drawnOnly: true },
    { pts: body, paint: 'crown', ink: 1 },
    { pts: roundPts([[-0.2, -0.1], [0, -0.36], [0.02, -0.08]], 0.03), paint: 'crownLite' },
    { pts: roundPts(rectPts(-0.49, 0.08, 0.49, 0.34), 0.06), paint: 'crownShade', ink: 0.8 },
    { pts: circlePts(-0.56, -0.4, 0.075, 14), paint: 'pearl', ink: 0.7 },
    { pts: circlePts(0, -0.53, 0.08, 14), paint: 'pearl', ink: 0.7 },
    { pts: circlePts(0.56, -0.4, 0.075, 14), paint: 'pearl', ink: 0.7 },
    { pts: roundPts([[0, 0.1], [0.1, 0.21], [0, 0.32], [-0.1, 0.21]], 0.03), paint: 'gem', ink: 0.6 },
    { pts: circlePts(-0.29, 0.21, 0.05, 12), paint: 'gem2', ink: 0.5 },
    { pts: circlePts(0.29, 0.21, 0.05, 12), paint: 'gem2', ink: 0.5 }
  ]
}

export const CROWN_TOKENS: TokenMap = {
  ink: '--am-ink', drop: '--am-vs-drop',
  crown: '--am-gold', crownShade: '--am-gold-foot', crownLite: '--am-gold-lite',
  pearl: '--am-paper-raised', gem: '--am-vs-gem', gem2: '--am-magic-2'
}

/** The crown as a banner pip for a chapter's boss not yet reached: pale. */
const CROWN_OFF_TOKENS: TokenMap = {
  ink: '--am-ink', drop: '--am-vs-star-off',
  crown: '--am-vs-star-off', crownShade: '--am-vs-star-off', crownLite: '--am-vs-star-off',
  pearl: '--am-vs-star-off', gem: '--am-vs-star-off', gem2: '--am-vs-star-off'
}

/* ───────────────────────────────── stars and pips ───────────────────────── */

/** A countdown star, in units of its radius: a soft five-point star with a
 *  shade toward its foot and a glint. */
const starParts = (): Part[] => [
  { pts: starPts(0, 0.03, 1, 0.5), paint: 'star', ink: 1 },
  { pts: starPts(0.05, 0.16, 0.52, 0.26), paint: 'starShade' },
  { pts: sparkPts(-0.28, -0.22, 0.24), paint: 'starLite' }
]

const STAR_ON_TOKENS: TokenMap = {
  ink: '--am-ink', star: '--am-gold', starShade: '--am-gold-foot', starLite: '--am-paper-raised'
}
const STAR_OFF_TOKENS: TokenMap = {
  ink: '--am-ink', star: '--am-vs-star-off', starShade: '--am-vs-star-off', starLite: '--am-vs-star-off'
}

/** A chapter pip: a gold dot behind her, a pale one ahead, in units of its radius. */
const dotParts = (): Part[] => [
  { pts: circlePts(0, 0, 0.62, 20), paint: 'star', ink: 1.1 },
  { pts: circlePts(-0.18, -0.2, 0.18, 10), paint: 'starLite' }
]

/* ─────────────────────────────────── the images ─────────────────────────── */

/** The line the DOM draws the marks with, in each mark's own unit. */
const LINE = { emblem: 0.035, crown: 0.06, star: 0.13, dot: 0.2 } as const

const urlCache = new Map<string, string>()

const drawnUrl = (key: string, parts: () => Part[], tokens: TokenMap, box: Box, line: number): string | null => {
  const hit = urlCache.get(key)
  if (hit) return hit
  const pal = readPalette(tokens)
  if (!pal) return null
  const url = svgUrl(partsSvg(parts(), box, pal, line))
  urlCache.set(key, url)
  return url
}

let emblemBoxCache: Box | null = null
let crownBoxCache: Box | null = null
/** The medallion's box (units of its radius): the reference's extent plus air. */
export const emblemBox = (): Box => (emblemBoxCache ??= markBox(emblemParts(), REF_INK))
/** The crown's box (units of its width). */
export const crownBox = (): Box => (crownBoxCache ??= markBox(crownParts(), REF_INK))

export const drawnEmblemUrl = (): string | null => drawnUrl('emblem', emblemParts, EMBLEM_TOKENS, emblemBox(), LINE.emblem)
export const drawnCrownUrl = (): string | null => drawnUrl('crown', crownParts, CROWN_TOKENS, crownBox(), LINE.crown)

/** A countdown star, lit or not (drawn only: too small to be worth a painting). */
export const starUrl = (lit: boolean): string | null => {
  const parts = starParts()
  return drawnUrl(lit ? 'star-on' : 'star-off', () => parts, lit ? STAR_ON_TOKENS : STAR_OFF_TOKENS, markBox(parts, LINE.star), LINE.star)
}

export type PipKind = 'done' | 'now' | 'next'

/** A banner pip: a node behind her (gold dot), hers (a gold star), ahead
 *  (pale dot) — or, for the chapter's last node, the Guardian's crown. */
export const pipUrl = (kind: PipKind, boss: boolean): string | null => {
  if (boss) {
    const parts = crownParts()
    return drawnUrl(`pip-crown-${kind === 'next' ? 'off' : 'on'}`, () => parts,
      kind === 'next' ? CROWN_OFF_TOKENS : CROWN_TOKENS, markBox(parts, LINE.crown), LINE.crown * 1.6)
  }
  const parts = kind === 'now' ? starParts() : dotParts()
  const line = kind === 'now' ? LINE.star : LINE.dot
  return drawnUrl(`pip-${kind}`, () => parts, kind === 'next' ? STAR_OFF_TOKENS : STAR_ON_TOKENS, markBox(parts, line), line)
}

/* ──────────────────────────────── the references ────────────────────────── */

const markArt = (id: string, parts: () => Part[], tokens: TokenMap): ItemSpec => ({
  kind: 'worldUi',
  id,
  frames: 1,
  draw: (g, s) => {
    const pal = readPalette(tokens)
    if (!pal) return
    g.save()
    g.scale(s, s)
    drawParts(g, parts(), pal)
    g.restore()
  }
})

/**
 * The medallion (`s` = px per radius) and the crown (`s` = px per width) as
 * bench drawables, centred on the origin, for `artDraw.WORLD_UI_SPECS` /
 * `artSheet.WORLD_UI_SHEETS`. Brief for the painter: WORDLESS — no letters on
 * the medallion (the game sets "VS" over it in 21 languages); keep the
 * enamel's middle calm so the letters read on it.
 */
export const VS_MARK_ART: Readonly<Record<keyof typeof MARK_IDS, ItemSpec>> = {
  emblem: markArt(MARK_IDS.emblem, emblemParts, EMBLEM_TOKENS),
  crown: markArt(MARK_IDS.crown, crownParts, CROWN_TOKENS)
}
