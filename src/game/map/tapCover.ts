/**
 * tapCover.ts — a tap creature's hiding place, cut out of the PAINTING
 * (story-spec §8.8 beat 2, S6).
 *
 * Every tap creature redraws the prop it peeks from behind ON TOP of itself,
 * so k = 0 looks like the prop alone. That prop belongs to the sector's
 * `paint()`, so on a painted sector it is already in the baked layer, painted —
 * and redrawing the vector over it put a second, crisp rowboat on top of the
 * painted one, sharing its outline by a few pixels. Two boats, one wave.
 *
 * So the renderer hands over the layer it just blitted and the cover comes out
 * of THAT: the vector's own alpha silhouette, filled with the layer's pixels.
 * Same shape, same brush as everything around it, nothing doubled. Handed no
 * layer — no painting decoded, or the art layer off — the drawing keeps
 * drawing, exactly as it always has.
 */
import { SEC_W, SEC_H } from '@/game/restore/mask'
import { makeCanvas } from '@/game/restore/dust'
import type { G2D } from '@/game/map/kit'

/** A cover draws one prop in sector units, and nothing else. */
type CoverFn = (g: G2D) => void

/** The baked static layer a sector's covers are cut from. */
export interface CoverLayer {
  /** The painting, baked at `res` pixels per sector unit. */
  cv: HTMLCanvasElement
  res: number
  /** Changes whenever `cv` is re-baked, so a stale stamp is never reused. */
  key: string
  /**
   * The sector point `cv`'s top-left corner shows, in SU — (0, 0) unless the
   * layer is a WINDOW onto the sector rather than the whole of it (an album
   * sticker bakes only the square it frames, `album/stickers.ts`).
   */
  ox?: number
  oy?: number
}

/** A box in sector units. */
interface Box { x: number; y: number; w: number; h: number }

interface Stamp extends Box {
  key: string
  cv: HTMLCanvasElement
}

/**
 * The silhouette is measured at a quarter size: this only has to find the
 * shape's box, and a full-sector readback per cover is not worth the few
 * sector units of slack that `PAD` gives back anyway.
 */
const MEASURE = 0.25
const PAD = 8

let live: CoverLayer | null = null

/**
 * Draw `body` with `src` as the layer every `tapCover` inside it cuts from.
 * Nesting restores the outer source, so the map — which draws a page of
 * sectors, each with its own bake — cannot leak one sector's layer into the
 * next one's cover.
 */
export const withCoverLayer = <T>(src: CoverLayer | null, body: () => T): T => {
  const was = live
  live = src
  try {
    return body()
  } finally {
    live = was
  }
}

const bounds = new WeakMap<CoverFn, Box | null>()
const stamps = new WeakMap<CoverFn, Stamp>()

/** The cover's box in sector units, measured once and kept forever — it is a
 *  property of the drawing, which never changes. `null` = nothing drawn, or no
 *  canvas to measure on. */
const boxOf = (cover: CoverFn): Box | null => {
  const hit = bounds.get(cover)
  if (hit !== undefined) return hit
  let box: Box | null = null
  const w = Math.ceil(SEC_W * MEASURE)
  const h = Math.ceil(SEC_H * MEASURE)
  const cv = makeCanvas(w, h)
  const g = cv.getContext('2d', { willReadFrequently: true })
  if (g) {
    g.setTransform(MEASURE, 0, 0, MEASURE, 0, 0)
    cover(g)
    g.setTransform(1, 0, 0, 1, 0, 0)
    try {
      const d = g.getImageData(0, 0, w, h).data
      let x0 = w
      let y0 = h
      let x1 = -1
      let y1 = -1
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (d[(y * w + x) * 4 + 3] === 0) continue
          if (x < x0) x0 = x
          if (x > x1) x1 = x
          if (y < y0) y0 = y
          if (y > y1) y1 = y
        }
      }
      if (x1 >= x0) {
        const bx = Math.max(0, x0 / MEASURE - PAD)
        const by = Math.max(0, y0 / MEASURE - PAD)
        box = {
          x: bx,
          y: by,
          w: Math.min(SEC_W, (x1 + 1) / MEASURE + PAD) - bx,
          h: Math.min(SEC_H, (y1 + 1) / MEASURE + PAD) - by
        }
      }
    } catch {
      // A tainted or unreadable canvas: no box, so the cover draws itself.
    }
  }
  bounds.set(cover, box)
  return box
}

const stampOf = (src: CoverLayer, cover: CoverFn): Stamp | null => {
  const box = boxOf(cover)
  if (!box) return null
  const ox = src.ox ?? 0
  const oy = src.oy ?? 0
  const key = `${src.key}@${src.res}@${ox},${oy}`
  const hit = stamps.get(cover)
  if (hit && hit.key === key) return hit
  // Snap to whole source pixels, so the painting is copied 1 : 1 rather than
  // resampled — a resample would soften the cover's edge against the layer it
  // is standing in, which is the one seam this whole exercise is closing.
  const r = src.res
  const x0 = Math.max(0, Math.floor((box.x - ox) * r))
  const y0 = Math.max(0, Math.floor((box.y - oy) * r))
  const x1 = Math.min(src.cv.width, Math.ceil((box.x + box.w - ox) * r))
  const y1 = Math.min(src.cv.height, Math.ceil((box.y + box.h - oy) * r))
  if (x1 <= x0 || y1 <= y0) return null
  const pw = x1 - x0
  const ph = y1 - y0
  const cv = hit && hit.cv.width === pw && hit.cv.height === ph ? hit.cv : makeCanvas(pw, ph)
  const g = cv.getContext('2d')
  if (!g) return null
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.globalAlpha = 1
  g.globalCompositeOperation = 'source-over'
  g.clearRect(0, 0, pw, ph)
  g.setTransform(r, 0, 0, r, -x0 - ox * r, -y0 - oy * r)
  cover(g)
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.globalCompositeOperation = 'source-in'
  g.drawImage(src.cv, x0, y0, pw, ph, 0, 0, pw, ph)
  g.globalCompositeOperation = 'source-over'
  const st: Stamp = { key, cv, x: ox + x0 / r, y: oy + y0 / r, w: pw / r, h: ph / r }
  stamps.set(cover, st)
  return st
}

/**
 * Is a PAINTED layer under what is being drawn right now? True only inside
 * `withCoverLayer` with a layer — i.e. while a tap creature or a rescue is
 * drawn over its sector's painting. For the few beats that lay a vector copy
 * of something the painting already has (the glowworm's lit crystal facet):
 * with this true they draw only their light.
 */
export const coverLayerLive = (): boolean => live !== null

/**
 * A tap creature's cover, in sector units on `g`. Every peek helper calls this
 * where it used to call `cover(g)`: painted, the prop comes out of the
 * painting; otherwise the drawing draws it.
 */
export const tapCover = (g: G2D, cover: CoverFn): void => {
  const src = live
  const st = src ? stampOf(src, cover) : null
  if (!st) {
    cover(g)
    return
  }
  g.drawImage(st.cv, st.x, st.y, st.w, st.h)
}
