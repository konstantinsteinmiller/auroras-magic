/**
 * artTint.ts — colour that the GAME decides, laid over a painting the painter
 * left neutral (story-spec §8.7's colour-me pots, §8.2's chapter ribbons and
 * clasp gems).
 *
 * A painted sector cannot know which pot the child will pick, and one gift
 * painting cannot know which chapter it is wrapped for. So the reference shows
 * that region in a pale, neutral lilac-grey (`NEUTRAL`), the prompt asks the
 * painter to keep it so, and the game multiplies its colour through a MASK of
 * it. Multiply keeps the painting's own shading: the light neutral becomes the
 * pot's colour, the painted shadow a darker shade of it.
 *
 * WHERE the mask is comes from two sources, and it needs both:
 *
 *   1. The procedural drawing says roughly where. It is rendered twice with
 *      two violently different accents (`ACCENT_A`, `ACCENT_B`), and every
 *      pixel that changed is the region — whatever shape language the drawing
 *      uses, with no hand-kept mask to drift out of date.
 *   2. The painting says exactly where. A painter follows the reference's
 *      composition, not its pixels: a roof comes back a few px lower, a ribbon
 *      a little wider. So the region reaches out over a search BAND that fades
 *      with distance, and inside it only paint as grey as the painter's own
 *      landmark is tinted. "As grey as" is measured, not assumed: the median
 *      chroma over the region is how neutral THIS painter's neutral came back,
 *      so a cream wall or a pale sky beside the roof — warmer than that — is
 *      left alone.
 *
 * A painter who ignored the brief and coloured the landmark anyway gets no
 * tint at all (`NEUTRAL_MAX`): the painting shows as painted, which is a wrong
 * colour choice rather than a muddied picture.
 */
type Draw = (g: CanvasRenderingContext2D) => void

/** The two accents the procedural region is derived from: far apart in every channel. */
export const ACCENT_A = { base: '#ff1010', shade: '#901010', lite: '#ff9090' } as const
export const ACCENT_B = { base: '#10ff10', shade: '#109010', lite: '#90ff90' } as const

/**
 * The neutral the reference shows the region in, and the painter is asked to
 * keep: a pale lilac-grey, light enough that a multiply lands near the pot's
 * own colour instead of darkening it.
 */
export const NEUTRAL = { base: '#e8e4ee', shade: '#cac4d6', lite: '#f8f6fb' } as const

/**
 * The most a landmark may come back coloured (median chroma) and still be
 * taken for the neutral. Past it the painter ignored the brief, and a tint
 * over a colour would muddy it.
 */
const NEUTRAL_MAX = 0.16

const canvas = (w: number, h: number): HTMLCanvasElement => {
  const cv = document.createElement('canvas')
  cv.width = Math.max(1, Math.round(w))
  cv.height = Math.max(1, Math.round(h))
  return cv
}

const pixels = (w: number, h: number, draw: Draw): Uint8ClampedArray => {
  const cv = canvas(w, h)
  const g = cv.getContext('2d', { willReadFrequently: true })
  if (!g) return new Uint8ClampedArray(cv.width * cv.height * 4)
  draw(g)
  return g.getImageData(0, 0, cv.width, cv.height).data
}

/** The procedural region, as one alpha byte per pixel. */
export const diffRegion = (w: number, h: number, drawA: Draw, drawB: Draw): Uint8Array => {
  const a = pixels(w, h, drawA)
  const b = pixels(w, h, drawB)
  const out = new Uint8Array(Math.round(w) * Math.round(h))
  for (let i = 0, p = 0; p < out.length; i += 4, p++) {
    const d = Math.abs(a[i]! - b[i]!) + Math.abs(a[i + 1]! - b[i + 1]!) + Math.abs(a[i + 2]! - b[i + 2]!)
    // Full-strength accent pixels differ by ~450; an anti-aliased edge by less.
    out[p] = Math.round(Math.min(1, d / 200) * Math.min(a[i + 3]!, b[i + 3]!))
  }
  return out
}

/**
 * Distance in px from the nearest pixel of `core` (a chamfer 3-4 transform:
 * two passes, within a few % of Euclidean), capped at `cap`. A round falloff,
 * where a separable max would leave square corners in the sky.
 */
export const distanceFrom = (core: Uint8Array, w: number, h: number, cap: number): Float32Array => {
  const d = new Float32Array(core.length)
  for (let i = 0; i < core.length; i++) d[i] = core[i] ? 0 : 1e9
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x
      let v = d[p]!
      if (x > 0) v = Math.min(v, d[p - 1]! + 3)
      if (y > 0) {
        v = Math.min(v, d[p - w]! + 3)
        if (x > 0) v = Math.min(v, d[p - w - 1]! + 4)
        if (x < w - 1) v = Math.min(v, d[p - w + 1]! + 4)
      }
      d[p] = v
    }
  }
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const p = y * w + x
      let v = d[p]!
      if (x < w - 1) v = Math.min(v, d[p + 1]! + 3)
      if (y < h - 1) {
        v = Math.min(v, d[p + w]! + 3)
        if (x < w - 1) v = Math.min(v, d[p + w + 1]! + 4)
        if (x > 0) v = Math.min(v, d[p + w - 1]! + 4)
      }
      d[p] = v
    }
  }
  for (let i = 0; i < d.length; i++) d[i] = Math.min(cap, d[i]! / 3)
  return d
}

const chromaOf = (r: number, g: number, b: number): number => (Math.max(r, g, b) - Math.min(r, g, b)) / 255

/** Dark paint is ink or deep shadow: a multiply would barely move it, and
 *  an outline is not the region. */
const lit = (r: number, g: number, b: number): boolean => Math.max(r, g, b) >= 90

/**
 * The tint mask from a region and the painting's pixels, `w` × `h`, as alpha
 * bytes. Pure arithmetic — the test seam for everything above.
 */
export const maskAlpha = (region: Uint8Array, art: Uint8ClampedArray, w: number, h: number, band: number): Uint8ClampedArray => {
  const out = new Uint8ClampedArray(region.length)
  const core = new Uint8Array(region.length)
  for (let p = 0; p < region.length; p++) core[p] = region[p]! > 128 ? 1 : 0
  const seen: number[] = []
  for (let p = 0, i = 0; p < core.length; p++, i += 4) {
    if (core[p] && art[i + 3]! > 200 && lit(art[i]!, art[i + 1]!, art[i + 2]!)) seen.push(chromaOf(art[i]!, art[i + 1]!, art[i + 2]!))
  }
  if (!seen.length) return out
  seen.sort((a, b) => a - b)
  const c0 = seen[Math.floor(seen.length / 2)]!
  if (c0 > NEUTRAL_MAX) return out
  const lo = c0 + 0.035
  const hi = c0 + 0.09
  const dist = distanceFrom(core, w, h, band + 1)
  for (let p = 0, i = 0; p < core.length; p++, i += 4) {
    const near = core[p] ? 1 : Math.max(0, 1 - dist[p]! / band)
    if (near <= 0 || !lit(art[i]!, art[i + 1]!, art[i + 2]!)) continue
    const grey = Math.max(0, Math.min(1, (hi - chromaOf(art[i]!, art[i + 1]!, art[i + 2]!)) / (hi - lo)))
    out[p] = Math.round(255 * near * grey)
  }
  return out
}

const masks = new Map<string, HTMLCanvasElement>()
const MASKS_KEPT = 8

/**
 * The tint mask for a painting, `w` × `h` px: white, with the strength of the
 * tint in its alpha. `paint` draws the painting into a `w` × `h` canvas;
 * `drawA`/`drawB` draw the procedural drawing at the same size in the two
 * accents. `band` is the search band's reach in px. Cached by `key` (the
 * caller puts the painting's identity in it), least-recently-used first out.
 */
export const accentMask = (
  key: string, w: number, h: number, paint: Draw, drawA: Draw, drawB: Draw, band: number
): HTMLCanvasElement => {
  const hit = masks.get(key)
  if (hit) {
    masks.delete(key)
    masks.set(key, hit)
    return hit
  }
  const W = Math.max(1, Math.round(w))
  const H = Math.max(1, Math.round(h))
  const alpha = maskAlpha(diffRegion(W, H, drawA, drawB), pixels(W, H, paint), W, H, band)
  const out = canvas(W, H)
  const go = out.getContext('2d')
  if (go) {
    const m = go.createImageData(W, H)
    for (let p = 0, i = 0; p < alpha.length; p++, i += 4) {
      m.data[i] = m.data[i + 1] = m.data[i + 2] = 255
      m.data[i + 3] = alpha[p]!
    }
    go.putImageData(m, 0, 0)
  }
  masks.set(key, out)
  while (masks.size > MASKS_KEPT) masks.delete(masks.keys().next().value!)
  return out
}

/**
 * `hex` divided by the neutral, per channel: the colour that, MULTIPLIED over
 * the neutral base, gives `hex` back. Without the lift every tinted region
 * comes out ~9 % darker than its pot.
 */
export const liftTint = (hex: string): string => {
  const n = Number.parseInt(NEUTRAL.base.slice(1), 16)
  const c = Number.parseInt(hex.replace('#', '').slice(0, 6), 16)
  if (!Number.isFinite(c)) return hex
  const ch = (s: number): number => Math.min(255, Math.round((((c >> s) & 255) * 255) / ((n >> s) & 255)))
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`
}

let scratch: HTMLCanvasElement | null = null

/**
 * Multiply `colour` through `mask` over what is already drawn in the
 * rectangle given. Only the tinted pixels change; the caller restores alpha
 * (a `destination-in` with the painting) when the target has transparency.
 */
export const multiplyMasked = (
  g: CanvasRenderingContext2D, mask: HTMLCanvasElement, colour: string, x: number, y: number, w: number, h: number
): void => {
  if (!scratch) scratch = canvas(mask.width, mask.height)
  if (scratch.width !== mask.width || scratch.height !== mask.height) {
    scratch.width = mask.width
    scratch.height = mask.height
  }
  const s = scratch.getContext('2d')
  if (!s) return
  s.globalCompositeOperation = 'copy'
  s.drawImage(mask, 0, 0)
  s.globalCompositeOperation = 'source-in'
  s.fillStyle = liftTint(colour)
  s.fillRect(0, 0, scratch.width, scratch.height)
  g.save()
  g.globalCompositeOperation = 'multiply'
  g.drawImage(scratch, x, y, w, h)
  g.restore()
}

/** Test seam: forget every cached mask. */
export const __resetTints = (): void => { masks.clear() }
