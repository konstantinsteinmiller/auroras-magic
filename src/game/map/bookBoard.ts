/**
 * bookBoard.ts — the BOOK AS AN OBJECT, painted (paint-outstanding.md P9;
 * art-roadmap.md step 1's promised "book cover/binding"): the cover board cut
 * larger than the page, and the pale block of leaves showing in its margin.
 * `map.ts` `drawBoard` draws the same two things in vector and calls
 * `drawBoardArt` first.
 *
 * ONE PAINTING, STRETCHED — the HP frames' precedent (`hpFrame.ts`
 * `paintedSlices`). The book is every shape a screen can be: ~1.8:1 held
 * sideways, ~0.55:1 held upright, and its margin (`over`) is 9–25 px of it.
 * No one picture can be that, so the painting is a frame around a HOLE (the
 * page covers the middle) and is laid on as a 9-slice: the four corners at
 * their own size, each side stretched along its length only. That works
 * because everything along a side is the same all the way along — the board's
 * cloth is plain, and the leaves' striations run PARALLEL to the edge, so a
 * stretch along the edge is invisible in them. The brief says so three ways,
 * as the HP frames' did.
 *
 * The hole is inset from the page's own edge (`HOLE_IN`), so the leaves run a
 * little way UNDER the page: the page card's free corners are rounded, and a
 * hole cut to the page's square box would show the cloth through those two
 * corners.
 *
 * What stays drawn, and why: the contact SHADOW under the book (a blurred
 * wash with no edge — nothing to paint); the page CARD's plum edge (`drawCard`
 * — a hairline that must follow the page rect exactly at any aspect, and the
 * page's own painting is clipped to it); and the thumbnail MOUNTS
 * (`drawSector` — a 3–6 px white or butter band whose colour is the node's
 * state, ui-design-system.md §9.7's "small, repeated, recolours by state").
 */
import { itemBox, type ItemSpec } from '@/game/artItem'
import { spriteFor } from '@/game/art'
import { CHROME_ART } from '@/game/artIds'

type G2D = CanvasRenderingContext2D

/* ─────────────────────────── the layout, in units of `over` ────────────── */

/** The page the reference frames: any size would do — the game stretches it —
 *  so it is kept small, which spends the 256 px frame cap on the corners. */
export const PAGE_W = 6
export const PAGE_H = 3.6
/** The board's free corners (`drawBoard`: `30 ms` over a margin of `19 ms`). */
export const CORNER_R = 30 / 19
/** How far the block of leaves shows past the page (`drawBoard`'s `lip`). */
export const LIP = 0.58
/** How far the leaves run on under the page before the hole starts. */
export const HOLE_IN = 0.6
/** One leaf's edge to the next (`drawBoard`: `3.4 ms`). */
const STEP = 3.4 / 19
/**
 * Where the four slices cut, measured in from the board's outer edge. Past
 * the rounded corner (1.58) and past the leaves' end under the page
 * (1 + 0.6) with room to spare, so a painting that lands a few percent off
 * the reference still slices on plain board and plain leaves.
 */
export const SLICE = 2.3

/* ───────────────────────────── the reference drawing ───────────────────── */

/** The reference's colours: the drawn board's (`drawBoard`). */
const BOARD_LIT = '#5d4382'
const BOARD_MID = '#43305f'
const BOARD_DEEP = '#2d1f42'
const LEAVES = '#efe2cb'
const LEAF_EDGE = 'rgba(96,74,60,0.3)'

/** A rounded rect square on the LEFT (the bound edge), added to the path. */
const boardRect = (g: G2D, x: number, y: number, w: number, h: number, r: number): void => {
  g.roundRect(x, y, w, h, [0, r, r, 0])
}

/**
 * The board and the leaves round a page at (0, 0, PAGE_W, PAGE_H), in units
 * of `over`, with the hole left EMPTY — never painted, so on the reference
 * sheet it is the magenta ground and in the game it is whatever the page
 * covers. Even-odd fills throughout: an erase would punch the sheet's own
 * magenta out too.
 */
const paintBoard = (g: G2D): void => {
  const hole = (): void => {
    g.rect(HOLE_IN, HOLE_IN, PAGE_W - HOLE_IN * 2, PAGE_H - HOLE_IN * 2)
  }
  // The board: plain book-cloth, lit along the top and deeper toward the foot
  // — a VERTICAL light, so the 9-slice stretches it without a seam.
  const lit = g.createLinearGradient(0, -1, 0, PAGE_H + 1)
  lit.addColorStop(0, BOARD_LIT)
  lit.addColorStop(0.5, BOARD_MID)
  lit.addColorStop(1, BOARD_DEEP)
  g.beginPath()
  boardRect(g, -1, -1, PAGE_W + 2, PAGE_H + 2, CORNER_R)
  hole()
  g.fillStyle = lit
  g.fill('evenodd')
  // The leaves, and their striation: a ring of concentric edges, every one
  // parallel to the board's own edge all the way round.
  g.save()
  g.beginPath()
  boardRect(g, -LIP, -LIP, PAGE_W + LIP * 2, PAGE_H + LIP * 2, CORNER_R)
  hole()
  g.clip('evenodd')
  g.fillStyle = LEAVES
  g.fillRect(-LIP, -LIP, PAGE_W + LIP * 2, PAGE_H + LIP * 2)
  g.strokeStyle = LEAF_EDGE
  g.lineWidth = 0.05
  g.beginPath()
  for (let d = STEP; d < LIP + HOLE_IN; d += STEP) {
    boardRect(g, -LIP + d, -LIP + d, PAGE_W + (LIP - d) * 2, PAGE_H + (LIP - d) * 2, Math.max(0.2, CORNER_R - d * 0.5))
  }
  g.stroke()
  g.restore()
}

/** The bench's handle on it (`artSheet` `worldui-book-board`): `s` px per
 *  `over`, the board centred on the origin like every item. */
export const BOOK_BOARD_ART: ItemSpec = {
  ...CHROME_ART.board,
  frames: 1,
  draw: (g, s) => {
    g.save()
    g.scale(s, s)
    g.translate(-PAGE_W / 2, -PAGE_H / 2)
    paintBoard(g)
    g.restore()
  }
}

/* ─────────────────────────────── the painted board ─────────────────────── */

/**
 * The painted board round the page rect (x, y, w, h) whose margin is `over`
 * px, or false — drawing nothing — while there is no painting.
 *
 * The painting's box is `itemBox`'s (the reference's extent plus its air),
 * the box the slicer cut; the board's outer edge sits one `over` outside the
 * page, so each side's air and `SLICE` map straight onto screen px.
 */
export const drawBoardArt = (g: G2D, x: number, y: number, w: number, h: number, over: number): boolean => {
  const img = spriteFor(CHROME_ART.board.kind, CHROME_ART.board.id)
  if (!img) return false
  const W = img.naturalWidth
  const H = img.naturalHeight
  if (!W || !H) return false
  const box = itemBox(BOOK_BOARD_ART)
  // The board's outer edge in the drawing's centred units, and the air
  // outside it on each side.
  const ox = PAGE_W / 2 + 1
  const oy = PAGE_H / 2 + 1
  const air = { l: -ox - box.x, t: -oy - box.y, r: box.x + box.w - ox, b: box.y + box.h - oy }
  const kx = W / box.w
  const ky = H / box.h
  // Source slices (image px) and destination widths (screen px), per side.
  const sl = (air.l + SLICE) * kx
  const sr = (air.r + SLICE) * kx
  const st = (air.t + SLICE) * ky
  const sb = (air.b + SLICE) * ky
  const dl = (air.l + SLICE) * over
  const dr = (air.r + SLICE) * over
  const dt = (air.t + SLICE) * over
  const db = (air.b + SLICE) * over
  const x0 = x - over - air.l * over
  const y0 = y - over - air.t * over
  const x1 = x + w + over + air.r * over
  const y1 = y + h + over + air.b * over
  const mw = x1 - x0 - dl - dr
  const mh = y1 - y0 - dt - db
  if (mw <= 0 || mh <= 0) return false
  const smw = W - sl - sr
  const smh = H - st - sb
  // The four sides first, each reaching a pixel under its corners, then the
  // corners over them: no hairline seam where a stretched side meets one.
  const lap = 1
  g.drawImage(img, sl, 0, smw, st, x0 + dl - lap, y0, mw + lap * 2, dt)
  g.drawImage(img, sl, H - sb, smw, sb, x0 + dl - lap, y1 - db, mw + lap * 2, db)
  g.drawImage(img, 0, st, sl, smh, x0, y0 + dt - lap, dl, mh + lap * 2)
  g.drawImage(img, W - sr, st, sr, smh, x1 - dr, y0 + dt - lap, dr, mh + lap * 2)
  g.drawImage(img, 0, 0, sl, st, x0, y0, dl, dt)
  g.drawImage(img, W - sr, 0, sr, st, x1 - dr, y0, dr, dt)
  g.drawImage(img, 0, H - sb, sl, sb, x0, y1 - db, dl, db)
  g.drawImage(img, W - sr, H - sb, sr, sb, x1 - dr, y1 - db, dr, db)
  return true
}
