import { onBeforeUnmount, ref, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue'
import { onArtChanged, spriteFor } from '@/game/art'
import { drawItem, itemBox, type ItemSpec } from '@/game/artItem'
import type { ArtBox } from '@/game/artBox'

/**
 * A painted ITEM for the DOM — TINTED, where `useArtImage` can only hand over
 * the file as it is.
 *
 * The canvas tints a painting by multiplying a colour through its neutral
 * region (`artTint`, via `drawItem`); an `<img>` or an SVG `<image>` cannot.
 * So the tinted still is baked ONCE per (painting, colour) into a canvas and
 * handed to the DOM as a data URL. The paint pots are the case it exists for
 * (`UnboxScene.vue`): one neutral jar, three colours a sector. An untinted
 * item comes back as the file's own URL, exactly as `useArtImage` would.
 *
 * With the art layer off, or before the painting has decoded, every entry is
 * `null` and the caller keeps drawing its SVG — the same contract every
 * painter keeps. It re-reads when THIS painting lands or the flag flips.
 */

const baked = new Map<string, string>()
/** Three pots a sector and a chip's star: a handful of bakes is plenty. */
const BAKES_KEPT = 24

/** Frame 0 of `spec`'s painting, `colour` multiplied through its tinted
 *  region; the file itself when it takes no colour. Null: no painting. */
export const itemArtUrl = (spec: ItemSpec, colour?: string): string | null => {
  const img = spriteFor(spec.kind, spec.id)
  if (!img) return null
  if (!spec.tinted || !colour) return img.src
  const key = `${spec.kind}/${spec.id}|${colour}|${img.src}`
  const hit = baked.get(key)
  if (hit) return hit
  const box = itemBox(spec)
  const H = img.naturalHeight
  const cv = document.createElement('canvas')
  cv.width = Math.max(1, Math.round(img.naturalWidth / spec.frames))
  cv.height = Math.max(1, H)
  const g = cv.getContext('2d')
  if (!g) return img.src
  // One frame of the strip, at the painting's own resolution: the box lands
  // exactly on the canvas, so nothing is resampled but the tint.
  const k = H / box.h
  g.translate(-box.x * k, -box.y * k)
  drawItem(g, spec, k, 0, colour)
  let url: string
  try {
    url = cv.toDataURL('image/png')
  } catch {
    return img.src
  }
  baked.delete(key)
  baked.set(key, url)
  while (baked.size > BAKES_KEPT) baked.delete(baked.keys().next().value!)
  return url
}

/**
 * `spec`'s painting in each of `colours`, as data URLs (null while it is
 * drawn), and the BOX it was painted into — in units of the drawing's scale,
 * so the caller places it where its own drawing was.
 */
export const useItemArt = (
  spec: ItemSpec, colours: MaybeRefOrGetter<readonly (string | undefined)[]>
): { urls: Ref<(string | null)[]>; box: Ref<ArtBox | null> } => {
  const urls = ref<(string | null)[]>([])
  const box = ref<ArtBox | null>(null)
  const read = (): void => {
    const next = toValue(colours).map((c) => itemArtUrl(spec, c))
    urls.value = next
    // Measured only once there is something to place: `itemBox` draws.
    box.value = next.some((u) => u) ? itemBox(spec) : null
  }
  read()
  // The count as well as the colours: `[]` and `[undefined]` join alike, and
  // an empty list is how a caller says "not now" without probing the file.
  watch(() => { const c = toValue(colours); return `${c.length}:${c.join('|')}` }, read)
  const off = onArtChanged((c) => {
    if (!c || (c.kind === spec.kind && c.id === spec.id)) read()
  })
  onBeforeUnmount(off)
  return { urls, box }
}

/**
 * Where a painting cut from `box` lands when its drawing is drawn at scale
 * `s` about (x, y) — as the attributes of an SVG `<image>`.
 */
export const imageAt = (
  box: ArtBox, s: number, x: number, y: number
): { x: number; y: number; width: number; height: number } =>
  ({ x: x + box.x * s, y: y + box.y * s, width: box.w * s, height: box.h * s })
