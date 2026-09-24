/**
 * fit.ts — how a painting is laid into a box that is not its shape.
 *
 * ONE RULE: A PAINTING IS ONLY EVER SCALED UNIFORMLY. A box of a different
 * shape is answered by CROPPING (the painting covers the box and the part
 * that does not fit is simply not shown) or by CONTINUING it (mirrored
 * copies, for a surface with no layout of its own) — never by drawing it
 * `w` x `h` into a box of another aspect. A stretched painting does not look
 * like a different screen shape; it looks broken. A weave turns into
 * streaks, a round cap into an egg.
 *
 * Found on a phone held upright (2026-09-24): the cloth the book lies on is
 * one 1024 x 1024 painting and was drawn straight across the viewport, so on
 * a 467 x 948 phone its weave was pulled out 2x vertically — behind the
 * duel's HUD, its drawing pad and its button bar, which is most of the
 * screen.
 *
 * Pure (except `drawSheetTiled`, which only issues the draws), so the rule
 * is pinned by `tests/fit.test.ts`.
 */

type G2D = CanvasRenderingContext2D

/** Where a `sw` x `sh` source lands in a box: origin, size, and its ONE scale. */
export interface Fit { x: number; y: number; w: number; h: number; k: number }

/**
 * COVER: scale the source by one factor so it fills the `bw` x `bh` box,
 * cropping whichever axis is too long. `ax` / `ay` (0..1) choose which part
 * survives the crop: 0 keeps the left / top edge, 1 the right / bottom, 0.5
 * the middle.
 */
export const coverFit = (sw: number, sh: number, bw: number, bh: number, ax = 0.5, ay = 0.5): Fit => {
  const k = Math.max(bw / sw, bh / sh)
  const w = sw * k
  const h = sh * k
  return { x: (bw - w) * ax, y: (bh - h) * ay, w, h, k }
}

/** How a sheet covers a box by its height: one scale, and `n` copies across. */
export interface SheetTiling {
  /** The one scale, source px -> box px. */
  k: number
  /** One copy's width in the box. */
  tw: number
  /** How many copies, centred as a row; every odd one is mirrored. */
  n: number
  /** Left edge of the first copy (<= 0: the row is centred and cropped). */
  x0: number
}

/**
 * A SURFACE — cloth, paper — that shades from top to bottom and has no
 * layout across: fit its HEIGHT, so the whole top-to-bottom shading shows on
 * every screen, and cover the width with a centred row of copies, every
 * other one mirrored so each seam meets its own edge. On a portrait screen
 * that is one copy with its sides cropped; on a wide one, two or three.
 */
export const sheetTiling = (sw: number, sh: number, bw: number, bh: number): SheetTiling => {
  const k = bh / sh
  const tw = sw * k
  const n = Math.max(1, Math.ceil(bw / tw - 1e-6))
  return { k, tw, n, x0: (bw - n * tw) / 2 }
}

/** Draw `img` over the box (0, 0, bw, bh) by `sheetTiling`. No allocation. */
export const drawSheetTiled = (g: G2D, img: CanvasImageSource, sw: number, sh: number, bw: number, bh: number): void => {
  const k = bh / sh
  const tw = sw * k
  const n = Math.max(1, Math.ceil(bw / tw - 1e-6))
  const x0 = (bw - n * tw) / 2
  for (let i = 0; i < n; i++) {
    const x = x0 + i * tw
    if (i % 2 === 0) {
      g.drawImage(img, x, 0, tw, bh)
    } else {
      g.save()
      g.translate(x + tw, 0)
      g.scale(-1, 1)
      g.drawImage(img, 0, 0, tw, bh)
      g.restore()
    }
  }
}
