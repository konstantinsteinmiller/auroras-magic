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
/** The most it grows to (±10.7 units), for a drawing that reaches its edge. */
const SIDE_MAX = 2560

/**
 * The extent of `draw`, in units of its scale, with a little air round it
 * (`air`, a fraction of the larger side) so a painting's softer edge is not
 * clipped by its own box. Measured on anything visible (α > 8): the box must
 * hold the whole drawing, glints included.
 *
 * THE CANVAS GROWS UNTIL THE DRAWING FITS IN IT (2026-09-23). It was a fixed
 * 640 px — ±2.67 units — and the bookmark ribbon hangs 3.36 units below its
 * origin, so its box stopped at the canvas edge and both sides of the contract
 * honoured the short box: the slicer cut the painted V's two tips off flat,
 * and the renderer blitted what was left. A drawing that touches the edge is
 * measured again on a canvas twice the size; one that does not (116 of the 117
 * paintable drawables) comes out exactly as it always did.
 */
export const measureBox = (key: string, draw: Draw, air = 0.06): ArtBox => {
  const hit = boxes.get(key)
  if (hit) return hit
  let side = SIDE
  let x0 = 0, y0 = 0, x1 = -1, y1 = -1
  for (;;) {
    const cv = document.createElement('canvas')
    cv.width = cv.height = side
    const g = cv.getContext('2d', { willReadFrequently: true })
    if (!g) return { x: -1, y: -1, w: 2, h: 2 }
    g.translate(side / 2, side / 2)
    draw(g, S)
    const d = g.getImageData(0, 0, side, side).data
    x0 = side; y0 = side; x1 = -1; y1 = -1
    for (let y = 0; y < side; y++) {
      for (let x = 0; x < side; x++) {
        if (d[(y * side + x) * 4 + 3]! > 8) {
          if (x < x0) x0 = x
          if (x > x1) x1 = x
          if (y < y0) y0 = y
          if (y > y1) y1 = y
        }
      }
    }
    const edge = x1 >= 0 && (x0 === 0 || y0 === 0 || x1 === side - 1 || y1 === side - 1)
    if (!edge || side >= SIDE_MAX) break
    side *= 2
  }
  if (x1 < 0) return { x: -1, y: -1, w: 2, h: 2 }
  const pad = Math.max(x1 - x0, y1 - y0) * air
  const box = {
    x: (x0 - pad - side / 2) / S,
    y: (y0 - pad - side / 2) / S,
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
