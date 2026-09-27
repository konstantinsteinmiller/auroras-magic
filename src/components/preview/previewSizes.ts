/**
 * previewSizes.ts — the VS preview's DOM sizes, from its layout alone
 * (`previewHud.lay`, CSS px).
 *
 * The canvas and the DOM share ONE layout (`preview.ts`
 * `computePreviewLayout`), and that layout RESERVES room for each piece of
 * chrome at a size in `lay.u` (`PREVIEW_DOM` — the ribbon, the banner, the
 * medallion, the stars, the powers block's lines). Everything here draws a
 * piece at exactly its reservation, never bigger: a DOM element bigger than
 * its ratio is one that can overlap a unicorn (`tests/preview/layout.test.ts`
 * proves the reservations themselves never overlap).
 */
import type { PreviewLayout } from '@/game/preview/previewHud'
import { PREVIEW_DOM as D, powersHeight } from '@/game/preview/preview'
import { RUNE_IDS, RUNES } from '@/game/duel/config'
import { glyphSvgPath, GLYPH_INK, GLYPH_INK_W, GLYPH_COL_W } from '@/game/duel/glyph'
import { SPAN_Y } from '@/components/preview/ribbonFrame'
import { svgUrl } from '@/components/preview/previewParts'

/** The layout's unit, CSS px (before the first layout: the short side). */
export const unitOf = (lay: PreviewLayout): number => lay.u || Math.min(lay.w, lay.h) || 360

/** The name ribbon's BAND height. The reservation (`ribbonH`) is the whole
 *  ribbon, tails included, and the tails hang `SPAN_Y - 1` bands lower. */
export const ribbonHeight = (lay: PreviewLayout): number => (D.ribbonH * unitOf(lay)) / SPAN_Y

/** The chapter banner's band, the same way (`bannerH`, tails included). */
export const bannerHeight = (lay: PreviewLayout): number => (D.bannerH * unitOf(lay)) / SPAN_Y

/** The gap between two runes, as a share of a rune (`runeGap / runeIcon`). */
export const RUNE_GAP = D.runeGap / D.runeIcon

/** The rune grid's room: the block's reserved height (`box.h`) less the lines
 *  above the icons — the epithet (one line, or two where it may wrap) and the
 *  caption. A layout without `h` reserves one row (`powersHeight`). */
const iconRoom = (lay: PreviewLayout, h: number, epiLines: number): number => {
  const u = unitOf(lay)
  const hh = h > 0 ? h : powersHeight(u)
  return hh - (epiLines * D.epithetH + D.captionH + 2 * D.lineGap) * u
}

/**
 * The rune icons' edge for `n` icons in a block `w` × `h`: as many rows as
 * make the icons BIGGEST, never larger than the reserved size (`runeIcon`).
 * A wide landscape block keeps all of them on one row; the narrow, tall one
 * beside Aurora in portrait stacks them (twelve runes: three rows of four at
 * 27 px, where one row would be 9 px).
 */
export const runeSize = (lay: PreviewLayout, n: number, w: number, h = 0, epiLines = 1): number => {
  const most = D.runeIcon * unitOf(lay)
  if (n <= 0) return Math.floor(most)
  const room = Math.max(0, iconRoom(lay, h, epiLines))
  let best = 0
  for (let rows = 1; rows <= n; rows++) {
    const perRow = Math.ceil(n / rows)
    const byW = w / (perRow + RUNE_GAP * (perRow - 1))
    const byH = room / (rows + RUNE_GAP * (rows - 1))
    const s = Math.min(most, byW, rows === 1 ? Math.max(byH, most) : byH)
    if (s > best + 0.5) best = s
  }
  return Math.max(12, Math.floor(best))
}

/**
 * The foe's chips: side by side at `chipH` when the block is wide enough for
 * two, else one above the other — each then only as tall as the block's room
 * below the epithet allows, shared by as many chips as she shows (`n`: her
 * weakness, her strength and her magic can be three).
 */
export const chipLayout = (lay: PreviewLayout, w: number, h = 0, epiLines = 1, n = 2): { h: number; stacked: boolean } => {
  const u = unitOf(lay)
  const stacked = w < 0.62 * u
  const hh = h > 0 ? h : powersHeight(u)
  const k = Math.max(2, n)
  const room = (hh - (epiLines * D.epithetH + k * D.lineGap) * u) / k
  return { h: stacked ? Math.max(0.05 * u, Math.min(D.chipH * u, room)) : D.chipH * u, stacked }
}

/**
 * A rune's DRAWN glyph as a CSS `url()` — `RuneGlyph.vue`'s two strokes in its
 * own 100-unit box, so the painted rune (cut from exactly that box,
 * `artDraw.RUNE_BOX`) lands where the stroke was. The colours are the glyph's
 * own (`glyph.ts`, `config.RUNES`), as on every slot.
 */
const glyphCache = new Map<number, string>()
export const drawnGlyphUrl = (rune: number): string => {
  const hit = glyphCache.get(rune)
  if (hit) return hit
  const R = 30
  const d = glyphSvgPath(rune, 50, 50, R)
  const col = RUNES[rune]?.[0] ?? GLYPH_INK
  const stroke = (c: string, w: number): string =>
    `<path d="${d}" fill="none" stroke="${c}" stroke-width="${R * w}" stroke-linecap="round" stroke-linejoin="round"/>`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">${stroke(GLYPH_INK, GLYPH_INK_W)}${stroke(col, GLYPH_COL_W)}</svg>`
  const url = svgUrl(svg)
  glyphCache.set(rune, url)
  return url
}

/** The rune's i18n slug (`rune.<slug>`). */
export const runeSlug = (rune: number): string => RUNE_IDS[rune] ?? 'fire'
