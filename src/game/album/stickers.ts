/**
 * album/stickers.ts — the creature sticker album's page model and its cells
 * (retention roadmap item 3).
 *
 * The album is a page of SILHOUETTES waiting to be filled in: one cell per
 * sector's tap creature (50) and one per chapter's rescue, and a cell a child
 * has not met yet is the same drawing in plum at a fifth of its alpha. That
 * is the whole loop — a shape you can see but have not found yet is an
 * invitation, where a blank square is a hole and a lock is a telling-off.
 *
 * A cell draws the creature with its OWN painter, never a second picture of
 * it: `tap.draw(g, 1, t)` is the very function the map runs when a child taps
 * the sector, so a sticker can never drift away from the creature it is of.
 * The painter draws its hiding place too — so a sticker is the creature
 * peeking out of its log, its bucket, its snowbank, which is exactly the
 * moment being collected. That hiding place goes through `tapCover`, so a met
 * cell is baked over a WINDOW of its sector's painting (`coverWindow`, B16 of
 * the 2026-09-24 audit): the painted creature peeks out of the painted
 * snowbank, not out of a vector one. With no painting decoded — or the art
 * layer off — the cover draws the vector prop, as it always has.
 *
 * BAKED, NEVER ANIMATED. Sixty cells running sixty sector painters on a frame
 * clock is not a thing this game can afford, and it is not a thing an album
 * wants: a sticker book is still. Each cell is drawn ONCE onto a canvas of
 * its own at a fixed instant and cached here; the DOM blits it and forgets
 * it. Nothing loops, so there is nothing for `reducedMotion` to settle.
 *
 * The met bits come from the campaign (`creatureMet`, `rescued`), never from
 * the map: the map is where a creature is MET, this is where it is counted,
 * and neither needs to know the other exists.
 */
import { S } from '@/game/duel/state'
import { creatureMet } from '@/game/campaign/controller'
import { CHAPTER_COUNT, NODES_PER_CHAPTER } from '@/game/campaign/tables'
import { sectorOf } from '@/game/map/sectors'
import type { TapCreature, RescueCollectible } from '@/game/map/sectorDef'
import { boxOf, inkPath, middleBox, type Box } from '@/game/album/measure'
import { makeCanvas } from '@/game/restore/dust'
import { onArtChanged, artState, spriteFor } from '@/game/art'
import { sectorArtId, sectorNodeOf } from '@/game/artIds'
import { withCoverLayer, type CoverLayer } from '@/game/map/tapCover'
import { paintSectorArt } from '@/game/map/sectorArt'
import { getPaintPick } from '@/game/campaign/bitset'
import { ref } from 'vue'

/** A tap creature, or the chapter's rescued friend (the gold-framed one). */
export type StickerKind = 'tap' | 'rescue'

export interface Sticker {
  /** Stable across renders and the cache's key — `tap:12`, `rescue:2`. */
  key: string
  kind: StickerKind
  /** The sector this creature lives on. */
  node: number
  chapter: number
}

/** One chapter's row: its five tap creatures, then its rescued friend. */
export interface AlbumPage {
  chapter: number
  cells: readonly Sticker[]
}

/**
 * The fallback frame, as a half-size in tap radii.
 *
 * Only reached when `measure.ts` cannot find the creature's ink — a painter
 * that draws the same thing at peek 0 and peek 1, or one that threw. Measured
 * over the cast, the ink reaches a median of 1.65 radii, so a frame that has
 * to guess guesses a little wider than that and crops the rest.
 */
const FRAME = 2.1

/** The instant every sticker is frozen at. Late enough that a creature with
 *  an idle cycle is mid-gesture rather than at the origin of it. */
export const STILL_T = 0.62

/** The unmet cell: the creature's own silhouette, in the game's plum rather
 *  than black (a black cut-out on cream reads as a hole punched in the page),
 *  at the alpha item 3 asks for. */
const GHOST = 'rgba(58, 35, 64, 0.2)'

/** Which node in chapter `c` hides its rescue, or -1. Chapter 10 has none —
 *  the finale IS the rescue — so its row is five cells, not six. */
export const rescueNode = (c: number): number => {
  for (let i = 0; i < NODES_PER_CHAPTER; i++) {
    const n = c * NODES_PER_CHAPTER + i
    if (sectorOf(n).rescue) return n
  }
  return -1
}

/** The album, a chapter to a row. Pure: the met state is read per cell. */
export const albumPages = (): AlbumPage[] => {
  const pages: AlbumPage[] = []
  for (let c = 0; c < CHAPTER_COUNT; c++) {
    const cells: Sticker[] = []
    for (let i = 0; i < NODES_PER_CHAPTER; i++) {
      const n = c * NODES_PER_CHAPTER + i
      if (sectorOf(n).tap) cells.push({ key: `tap:${n}`, kind: 'tap', node: n, chapter: c })
    }
    const rn = rescueNode(c)
    if (rn >= 0) cells.push({ key: `rescue:${rn}`, kind: 'rescue', node: rn, chapter: c })
    pages.push({ chapter: c, cells })
  }
  return pages
}

/** Has this sticker been collected? A rescue is one bit per CHAPTER (the
 *  chapter has exactly one friend), a creature one bit per sector. */
export const stickerMet = (s: Sticker): boolean =>
  s.kind === 'rescue' ? ((S.campaign.rescued >>> s.chapter) & 1) === 1 : creatureMet(s.node)

/** How full the album is — the one number the page shows, as a fraction. */
export const albumCount = (): { met: number; total: number } => {
  let met = 0
  let total = 0
  for (const page of albumPages()) {
    for (const cell of page.cells) {
      total++
      if (stickerMet(cell)) met++
    }
  }
  return { met, total }
}

/** The creature a cell draws — its sector's tap creature, or its rescue. */
export const drawableOf = (s: Sticker): TapCreature | RescueCollectible | undefined =>
  s.kind === 'rescue' ? sectorOf(s.node).rescue : sectorOf(s.node).tap

/* ------------------------------- the bake ------------------------------ */

const cache = new Map<string, HTMLCanvasElement>()
/** The size everything in `cache` was baked at; a new one empties it. */
let cachePx = 0

/** Bumped when a creature's painting decodes, so the open album re-bakes its
 *  cells into the painted version instead of showing the drawing all session.
 *  Scoped to the two kinds a cell can contain (`scoped-art-invalidation`). */
export const stickerRev = ref(0)
onArtChanged((c) => {
  // A sector's painting landing re-bakes only that sector's MET cells — the
  // ones baked over a window of it (`coverWindow`).
  if (c && (c.kind === 'sectorThumb' || c.kind === 'sector')) {
    const n = sectorNodeOf(c.id)
    let dropped = false
    for (const k of [`tap:${n}:1`, `rescue:${n}:1`]) dropped = cache.delete(k) || dropped
    if (dropped) stickerRev.value++
    return
  }
  if (c && c.kind !== 'creature' && c.kind !== 'prop') return
  cache.clear()
  stickerRev.value++
})

/**
 * The window of node `n`'s PAINTING a met cell frames (`box`, SU), baked at
 * the cell's own `k` px per SU — the layer its hiding place is cut from.
 *
 * The full painting if it is still decoded (never fetched for this), else the
 * map's thumbnail; null while neither has decoded, when the cover draws the
 * vector prop. The pot is the one the child picked, as on the map.
 */
const coverWindow = (n: number, box: Box, size: number, k: number): CoverLayer | null => {
  const id = sectorArtId(n)
  const full = artState('sector', id) === true
  if (!full && artState('sectorThumb', id) !== true) {
    // Put the thumbnail on the wire: its arrival re-bakes this cell.
    spriteFor('sectorThumb', id, 'normal')
    return null
  }
  const cv = makeCanvas(size, size)
  const g = cv.getContext('2d')
  if (!g) return null
  const sec = sectorOf(n)
  const pick = getPaintPick(S.campaign.paintPicks, n)
  g.setTransform(k, 0, 0, k, -box.x * k, -box.y * k)
  const ok = paintSectorArt(g, n, sec, sec.pots[Math.max(0, pick - 1)]!, !full)
  g.setTransform(1, 0, 0, 1, 0, 0)
  return ok ? { cv, res: k, key: `album:${n}:${size}:${full ? 'full' : 'thumb'}:${pick}`, ox: box.x, oy: box.y } : null
}

/**
 * The box a cell frames, in sector units — measured once per creature and
 * kept for the session, because it is a property of the drawing.
 *
 * A TAP creature is measured as the difference between its painter at peek 0
 * and at peek 1: peek 0 is its hiding place alone, so the difference is the
 * creature itself. The hiding place is deliberately left out — it is a log,
 * a boulder, a hedge, sometimes three times the creature's size, and framing
 * on it would put a picture of a log in the album. The cell crops it, which
 * is what a sticker cut out of a scene looks like.
 *
 * A RESCUE has no hiding place; it lies under the dust. Its whole drawing is
 * the collectible, so its whole drawing is framed.
 *
 * Squared up around its own middle, with a tenth of a margin so nothing sits
 * flush against the border.
 */
const frames = new WeakMap<object, Box>()
const frameOf = (s: Sticker, def: TapCreature | RescueCollectible): Box => {
  const hit = frames.get(def)
  if (hit) return hit
  const full = inkPath((g) => def.draw(g, 1, STILL_T))
  const ink = s.kind === 'rescue' ? boxOf(full) : middleBox(inkPath((g) => def.draw(g, 0, STILL_T)), full)
  let half = def.r * FRAME
  let cx = def.x
  let cy = def.y
  if (ink && ink.w > 0 && ink.h > 0) {
    cx = ink.x + ink.w / 2
    cy = ink.y + ink.h / 2
    // Clamped against the tap radius either way: a measurement is only ever
    // as good as the painter it read, and a frame that collapses onto one
    // stray point (or opens onto half the sector) is worse than the guess.
    half = Math.min(def.r * 3, Math.max(def.r * 0.6, Math.max(ink.w, ink.h) * 0.55))
  }
  const box: Box = { x: cx - half, y: cy - half, w: half * 2, h: half * 2 }
  frames.set(def, box)
  return box
}

/**
 * Sticker `s` on a square canvas of `px` device pixels, baked once and kept.
 * Null where there is no creature, or no 2D context (tests, SSR).
 *
 * The met and unmet bakes are separate entries on purpose: meeting a creature
 * is a once-ever event, so the ghost it replaces is dead weight for a few
 * kilobytes, and keeping both means the swap costs nothing at the moment it
 * has to look instant.
 */
export const bakeSticker = (s: Sticker, px: number, met: boolean): HTMLCanvasElement | null => {
  const size = Math.max(1, Math.round(px))
  if (size !== cachePx) {
    cache.clear()
    cachePx = size
  }
  const key = `${s.key}:${met ? 1 : 0}`
  const hit = cache.get(key)
  if (hit) return hit
  const def = drawableOf(s)
  if (!def) return null
  const cv = makeCanvas(size, size)
  const g = cv.getContext('2d')
  if (!g) return null
  const box = frameOf(s, def)
  const k = size / box.w
  // A ghost is a silhouette: its hiding place's shape is the same cut from a
  // painting or drawn, so only a met cell pays for the window.
  const layer = met ? coverWindow(s.node, box, size, k) : null
  g.save()
  g.scale(k, k)
  g.translate(-box.x, -box.y)
  withCoverLayer(layer, () => def.draw(g, 1, STILL_T))
  g.restore()
  if (!met) {
    // `source-in` multiplies the fill by what is already there, so one
    // translucent plum rectangle IS the silhouette at its alpha: the shape
    // survives, every colour inside it goes.
    g.globalCompositeOperation = 'source-in'
    g.fillStyle = GHOST
    g.fillRect(0, 0, size, size)
    g.globalCompositeOperation = 'source-over'
  }
  cache.set(key, cv)
  return cv
}

/** Test seam: forget every bake (the art hook does this on its own). */
export const clearStickerBakes = (): void => {
  cache.clear()
  cachePx = 0
}

/** The cell `s` frames, in sector units — for the framing spec. */
export const stickerFrame = (s: Sticker): Box | null => {
  const def = drawableOf(s)
  return def ? frameOf(s, def) : null
}
