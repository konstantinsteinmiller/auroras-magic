/**
 * artBox.ts — the BOX contract for painted items (art-generation-pipeline
 * LAYERS.md § the box contract): the rectangle, in a drawable's own units,
 * that the bench renders the reference into and the renderer blits the
 * painting back into. The two getting out of step makes every painted part the
 * wrong size, everywhere, invisibly — so there are no hand-kept constants:
 * both sides MEASURE the same procedural drawing with `measureBox`, and one
 * cache answers for the whole session.
 *
 * A drawable is described by `draw(g, s)`: it draws around the origin of the
 * current transform at scale `s` (a gift's height, a star's radius, px per
 * head unit — whatever the game's own painter takes). The box comes back in
 * units of `s`, so `blitBox(g, img, box, s)` works at any size.
 */
export interface ArtBox {
  x: number
  y: number
  w: number
  h: number
}

type Draw = (g: CanvasRenderingContext2D, s: number) => void

const boxes = new Map<string, ArtBox>()
/** The measuring canvas: 120 px per unit, origin in the middle. */
const S = 120
const SIDE = 640

/**
 * The extent of `draw`, in units of its scale, with a little air round it
 * (`air`, a fraction of the larger side) so a painting's softer edge is not
 * clipped by its own box. Measured on anything visible (α > 8): the box must
 * hold the whole drawing, glints included.
 */
export const measureBox = (key: string, draw: Draw, air = 0.06): ArtBox => {
  const hit = boxes.get(key)
  if (hit) return hit
  const cv = document.createElement('canvas')
  cv.width = cv.height = SIDE
  const g = cv.getContext('2d', { willReadFrequently: true })
  if (!g) return { x: -1, y: -1, w: 2, h: 2 }
  g.translate(SIDE / 2, SIDE / 2)
  draw(g, S)
  const d = g.getImageData(0, 0, SIDE, SIDE).data
  let x0 = SIDE, y0 = SIDE, x1 = -1, y1 = -1
  for (let y = 0; y < SIDE; y++) {
    for (let x = 0; x < SIDE; x++) {
      if (d[(y * SIDE + x) * 4 + 3]! > 8) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
    }
  }
  if (x1 < 0) return { x: -1, y: -1, w: 2, h: 2 }
  const pad = Math.max(x1 - x0, y1 - y0) * air
  const box = {
    x: (x0 - pad - SIDE / 2) / S,
    y: (y0 - pad - SIDE / 2) / S,
    w: (x1 - x0 + 1 + 2 * pad) / S,
    h: (y1 - y0 + 1 + 2 * pad) / S
  }
  boxes.set(key, box)
  return box
}

/** Draw a painting into `box` at scale `s`, in the current transform. */
export const blitBox = (g: CanvasRenderingContext2D, img: CanvasImageSource, box: ArtBox, s: number): void => {
  g.drawImage(img, box.x * s, box.y * s, box.w * s, box.h * s)
}
