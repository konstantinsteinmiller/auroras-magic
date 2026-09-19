/**
 * artItem.ts — how a painted ITEM stands in for its drawing (story-spec §9.11,
 * S6): the gifts and the boss chest, the two tools, the wardrobe tent, and
 * the two keepsakes that are stills on Aurora's rig.
 *
 * An item is a small strip: `frames` panels side by side, one per state the
 * drawing animates BETWEEN (a gift tied and untied, a chest shut and open, the
 * pet star's open eyes, blink and grin). The motion around those states — the
 * shake, the squash, the rattle, the float — is still the drawing's own
 * transform, applied to the painting exactly as it was to the vectors. A
 * fractional frame cross-fades two panels, so a lid "opens" over the few
 * frames the drawing spends opening it.
 *
 * The painting is blitted into the drawing's own BOX (`artBox.ts`), measured
 * from the same `draw` the bench rendered the reference from: the painting
 * lands the size the drawing was, at any scale, with no hand-kept constant.
 *
 * A tinted item (the chapter's ribbon, the clasp gem) is baked ONCE per colour
 * into a strip of its own (`artTint.ts`), so a frame costs one `drawImage`
 * whatever the tint.
 */
import { spriteFor, type ArtKind } from '@/game/art'
import { measureBox, type ArtBox } from '@/game/artBox'
import { accentMask, multiplyMasked, ACCENT_A, ACCENT_B, NEUTRAL } from '@/game/artTint'

type G2D = CanvasRenderingContext2D

export interface Accent { base: string; shade: string; lite: string }

export interface ItemSpec {
  kind: ArtKind
  id: string
  /** Panels in the strip. */
  frames: number
  /**
   * The drawing of panel `f`, around the origin at scale `s` (whatever the
   * game's painter takes: a gift's height, a star's radius), in the `accent`
   * colours where the game tints it. This is the reference the painting was
   * made from — the bench renders it, the box is measured from it, and the
   * tint mask is derived from it.
   */
  draw: (g: G2D, s: number, f: number, accent: Accent) => void
  /** A region of it takes a colour the game picks (`NEUTRAL` in the reference). */
  tinted?: boolean
}

/** The box every panel of `spec` is painted into, in units of its scale. */
export const itemBox = (spec: ItemSpec): ArtBox =>
  measureBox(`${spec.kind}/${spec.id}`, (g, s) => {
    for (let f = 0; f < spec.frames; f++) spec.draw(g, s, f, NEUTRAL)
  })

interface Tinted { img: HTMLImageElement; cv: HTMLCanvasElement }
const tinted = new Map<string, Tinted>()
const TINTS_KEPT = 16

/** The strip with `colour` multiplied through its neutral region, baked once. */
const tintedStrip = (spec: ItemSpec, img: HTMLImageElement, colour: string): HTMLCanvasElement => {
  const key = `${spec.kind}/${spec.id}|${colour}`
  const hit = tinted.get(key)
  if (hit && hit.img === img) return hit.cv
  const W = img.naturalWidth
  const H = img.naturalHeight
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const g = cv.getContext('2d')
  if (!g) return cv
  g.drawImage(img, 0, 0)
  const box = itemBox(spec)
  const fw = W / spec.frames
  const k = H / box.h
  for (let f = 0; f < spec.frames; f++) {
    const drawIn = (accent: Accent) => (m: G2D): void => {
      m.translate(-box.x * k, -box.y * k)
      spec.draw(m, k, f, accent)
    }
    const mask = accentMask(
      `${key}#${f}|${img.src}`, fw, H,
      (m) => m.drawImage(img, f * fw, 0, fw, H, 0, 0, fw, H),
      drawIn(ACCENT_A), drawIn(ACCENT_B),
      Math.max(1, H * 0.025)
    )
    multiplyMasked(g, mask, colour, f * fw, 0, fw, H)
  }
  // The mask's band can reach past the painting's own edge: keep only what
  // the painting covers, so no tint lands on transparent ground.
  g.globalCompositeOperation = 'destination-in'
  g.drawImage(img, 0, 0)
  g.globalCompositeOperation = 'source-over'
  tinted.delete(key)
  tinted.set(key, { img, cv })
  while (tinted.size > TINTS_KEPT) tinted.delete(tinted.keys().next().value!)
  return cv
}

/**
 * Draw `spec`'s painting instead of its drawing, at scale `s` in the current
 * transform. `frame` may be fractional: 0.4 is panel 0 with 40 % of panel 1
 * over it. Returns false — and draws nothing — when there is no painting (the
 * art layer is off, or the file has not decoded, or does not exist), which is
 * the caller's cue to draw the vectors as before.
 */
export const drawItem = (g: G2D, spec: ItemSpec, s: number, frame = 0, colour?: string): boolean => {
  const img = spriteFor(spec.kind, spec.id)
  if (!img) return false
  const strip = spec.tinted && colour ? tintedStrip(spec, img, colour) : img
  const box = itemBox(spec)
  const W = spec.tinted && colour ? strip.width : img.naturalWidth
  const H = spec.tinted && colour ? strip.height : img.naturalHeight
  const fw = W / spec.frames
  const f = Math.max(0, Math.min(spec.frames - 1, frame))
  const f0 = Math.floor(f)
  const t = f - f0
  const dx = box.x * s
  const dy = box.y * s
  const dw = box.w * s
  const dh = box.h * s
  if (t < 0.02 || f0 + 1 >= spec.frames) {
    g.drawImage(strip, Math.round(f) * fw, 0, fw, H, dx, dy, dw, dh)
    return true
  }
  const a = g.globalAlpha
  g.globalAlpha = a * (1 - t)
  g.drawImage(strip, f0 * fw, 0, fw, H, dx, dy, dw, dh)
  g.globalAlpha = a * t
  g.drawImage(strip, (f0 + 1) * fw, 0, fw, H, dx, dy, dw, dh)
  g.globalAlpha = a
  return true
}

/** Test seam. */
export const __resetItemTints = (): void => { tinted.clear() }
