/**
 * dust.ts — the dust layer's pixels (story-spec §9.3–§9.4).
 *
 * THE COST MODEL, and why it differs from §9.4's first sketch. The dust's LOOK
 * never changes while a sector is open. It is the sector's own painting with
 * its colour drained, darkened with the plum ink and grained with noise. So
 * that look is composited ONCE, into the dust canvas, when the sector opens.
 * The brush then erases that canvas directly with `destination-out`. A frame
 * is two blits (colour, then dust) plus the few stamps the brush laid. §9.4
 * budgeted a live multiply + overlay every frame at ~1.5–2 ms. This does the
 * same composite once at open, then nothing per frame.
 *
 * The drain uses the `saturation` blend mode: a grey fill takes the
 * painting's hue and luminosity and zero saturation, so the dust keeps every
 * silhouette of the world underneath while losing all of its colour. That is
 * what makes the ≤ 20 % dust-saturation floor (§9.6.1) hold for ANY base
 * tone, which a plain multiply cannot promise.
 *
 * No `ctx.filter` anywhere, and no `getImageData` in the wipe path. The one
 * `putImageData` builds the noise tile once per session.
 */
import { SEC_W, SEC_H, cellRect, CELL } from '@/game/restore/mask'
import { seeded } from '@/game/duel/util'

type G2D = CanvasRenderingContext2D

/** The plum ink family (art-style §2) — the dust is tinted, never pure grey. */
export const DUST_INK = '#4a3656'
/** The multiply strength over the drained painting (§9.4 step 2a). */
export const DUST_INK_ALPHA = 0.72
export const NOISE_ALPHA = 0.35

export const makeCanvas = (w: number, h: number): HTMLCanvasElement => {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w))
  c.height = Math.max(1, Math.round(h))
  return c
}

/* ------------------------------- noise ------------------------------- */

let noise: HTMLCanvasElement | null = null
/**
 * The ONE shared tiled noise texture (`FX-NOISE`, §9.12), procedural until
 * painted art replaces it: two octaves of value noise, mid-grey centred so an
 * `overlay` pass grains the dust without shifting its average tone.
 */
export const noiseTile = (): HTMLCanvasElement => {
  if (noise) return noise
  const N = 256
  const c = makeCanvas(N, N)
  const g = c.getContext('2d')
  if (!g) return (noise = c)
  const r = seeded(4242)
  const lattice = (n: number): Float32Array => {
    const a = new Float32Array(n * n)
    for (let i = 0; i < a.length; i++) a[i] = r()
    return a
  }
  const L1 = lattice(16)
  const L2 = lattice(64)
  const sampleL = (L: Float32Array, n: number, x: number, y: number): number => {
    // Wrapping bilinear lookup, so the tile repeats seamlessly.
    const fx = (x / N) * n
    const fy = (y / N) * n
    const x0 = Math.floor(fx) % n
    const y0 = Math.floor(fy) % n
    const x1 = (x0 + 1) % n
    const y1 = (y0 + 1) % n
    const tx = fx - Math.floor(fx)
    const ty = fy - Math.floor(fy)
    const sx = tx * tx * (3 - 2 * tx)
    const sy = ty * ty * (3 - 2 * ty)
    const a = L[y0 * n + x0]! + (L[y0 * n + x1]! - L[y0 * n + x0]!) * sx
    const b = L[y1 * n + x0]! + (L[y1 * n + x1]! - L[y1 * n + x0]!) * sx
    return a + (b - a) * sy
  }
  const img = g.createImageData(N, N)
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const v = 0.62 * sampleL(L1, 16, x, y) + 0.38 * sampleL(L2, 64, x, y)
      const k = (y * N + x) * 4
      const c8 = Math.round(64 + v * 128)
      img.data[k] = img.data[k + 1] = img.data[k + 2] = c8
      img.data[k + 3] = 255
    }
  }
  g.putImageData(img, 0, 0)
  return (noise = c)
}

/* ------------------------------- stamp ------------------------------- */

const STAMP_PX = 96
/**
 * The pre-baked soft brush (§9.3.1): a radial gradient, opaque to `core`,
 * then a straight ramp to nothing. `mask.ts`'s `falloff` is the same curve,
 * which is what keeps the coverage model honest.
 */
export const bakeStamp = (core: number): HTMLCanvasElement => {
  const c = makeCanvas(STAMP_PX, STAMP_PX)
  const g = c.getContext('2d')
  if (!g) return c
  const h = STAMP_PX / 2
  const gr = g.createRadialGradient(h, h, 0, h, h, h)
  gr.addColorStop(0, '#000')
  gr.addColorStop(Math.min(0.999, Math.max(0, core)), '#000')
  gr.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = gr
  g.fillRect(0, 0, STAMP_PX, STAMP_PX)
  return c
}

/* -------------------------------- dust ------------------------------- */

/**
 * Composite the dusty look of `colour` (plus anything `extra` paints, e.g.
 * the windmill's resting sails) into `dust`. Both canvases are the sector at
 * `res` px per SU.
 */
export const bakeDust = (
  dust: HTMLCanvasElement, colour: HTMLCanvasElement, res: number, seed: number,
  extra?: (g: G2D) => void
): void => {
  const g = dust.getContext('2d')
  if (!g) return
  const W = dust.width
  const H = dust.height
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.globalCompositeOperation = 'source-over'
  g.globalAlpha = 1
  g.clearRect(0, 0, W, H)
  g.drawImage(colour, 0, 0, W, H)
  if (extra) {
    g.save()
    g.scale(res, res)
    extra(g)
    g.restore()
  }
  // 1. Drain the colour: hue + luminosity of the painting, saturation 0.
  g.globalCompositeOperation = 'saturation'
  g.fillStyle = '#808080'
  g.fillRect(0, 0, W, H)
  // 2. Darken with the plum ink.
  g.globalCompositeOperation = 'multiply'
  g.globalAlpha = DUST_INK_ALPHA
  g.fillStyle = DUST_INK
  g.fillRect(0, 0, W, H)
  // 3. Soft darker smudges, so the dust reads as a layer lying ON the world,
  //    not as a filter over it.
  const r = seeded(seed)
  g.globalAlpha = 0.28
  for (let i = 0; i < 9; i++) {
    const x = r() * W
    const y = r() * H
    const rad = (0.12 + r() * 0.2) * W
    const gr = g.createRadialGradient(x, y, 0, x, y, rad)
    gr.addColorStop(0, '#2c2233')
    gr.addColorStop(1, 'rgba(44,34,51,0)')
    g.fillStyle = gr
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2)
  }
  // 4. Grain: the shared noise tile, offset per sector so neighbours differ.
  const pat = g.createPattern(noiseTile(), 'repeat')
  if (pat) {
    g.globalCompositeOperation = 'overlay'
    g.globalAlpha = NOISE_ALPHA
    g.translate(-((seed * 97) % 256), -((seed * 57) % 256))
    g.fillStyle = pat
    g.fillRect(0, 0, W + 256, H + 256)
    g.setTransform(1, 0, 0, 1, 0, 0)
  }
  g.globalCompositeOperation = 'source-over'
  g.globalAlpha = 1
}

/** Erase one stamp from the dust: centre (x, y), outer radius r, in SU. */
export const eraseStamp = (
  dust: HTMLCanvasElement, stampCv: HTMLCanvasElement, res: number,
  x: number, y: number, r: number, a: number
): void => {
  const g = dust.getContext('2d')
  if (!g || !(a > 0)) return
  g.globalCompositeOperation = 'destination-out'
  g.globalAlpha = Math.min(1, a)
  g.drawImage(stampCv, (x - r) * res, (y - r) * res, 2 * r * res, 2 * r * res)
  g.globalAlpha = 1
  g.globalCompositeOperation = 'source-over'
}

/**
 * A resumed save: erase each done cell, drawn as soft dabs tiled across it,
 * not as a hard rectangle. That way the resumed view reads as "brushed there",
 * not as a grid (§9.3).
 */
export const eraseCells = (dust: HTMLCanvasElement, stampCv: HTMLCanvasElement, res: number, cells: readonly number[], a = 1): void => {
  for (const cell of cells) {
    const [x, y] = cellRect(cell)
    for (let j = 0; j < 2; j++) {
      for (let i = 0; i < 2; i++) {
        eraseStamp(dust, stampCv, res, x + CELL * (0.25 + i * 0.5), y + CELL * (0.25 + j * 0.5), CELL * 0.62, a)
      }
    }
  }
}

/** Wipe the dust away entirely (the end of the reveal wave). */
export const clearDust = (dust: HTMLCanvasElement): void => {
  dust.getContext('2d')?.clearRect(0, 0, dust.width, dust.height)
}

/** The sector's pixel size at `res` px per SU. */
export const sectorPx = (res: number): [number, number] => [Math.round(SEC_W * res), Math.round(SEC_H * res)]
