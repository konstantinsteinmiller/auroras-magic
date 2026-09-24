/**
 * glove.ts — the "put your finger here" GLOVE (paint-outstanding.md P3): the
 * white cartoon hand with its index finger out that shows a child the way on
 * — the front page's rainbow swipe (`map.ts` `drawWayOn`) and the intro's
 * rune beat, where it rides the tip of the rune drawing itself
 * (`intro.ts` `drawRuneTrace`).
 *
 * ONE STILL SERVES BOTH, because the hand never changes shape: the swipe
 * moves it with a translate, tips it with a rotate and presses it with a
 * scale, and the intro only translates it. That is the roadmap's rule — paint
 * the shape, keep what moves it — so the painting is carried by exactly the
 * transform the drawing was. What stays drawn is everything that is not the
 * hand: the ribbon, the press ripples, the soft shadow under it on the paper
 * and the sparkles it sheds.
 *
 * Pulled out of `map.ts` so the art bench can render its reference from the
 * game's own painter (as `tent.ts` and `badge.ts` are), and so the intro can
 * wear it without importing the map.
 */
import { drawItem, type ItemSpec } from '@/game/artItem'
import { CHROME_ART } from '@/game/artIds'
import { TAU } from '@/game/duel/util'

type G2D = CanvasRenderingContext2D

/** The book's plum ink (a canvas cannot read `--am-ink`). */
const INK = '#3A2340'

/**
 * The drawn glove, its fingertip at (0, 0), pointing up, `u` a finger's
 * width. Drawn as one silhouette: every part stroked fat in ink first, then
 * every part filled over it, so the outline runs round the whole hand and
 * never between its parts. `ink` scales the line (the bench's reference
 * thins it — an evenly inked reference comes back an evenly inked sticker).
 */
export const paintGlove = (g: G2D, u: number, ink = 1): void => {
  const parts = (): void => {
    // The index finger, rounded at its tip.
    g.beginPath()
    g.roundRect(-0.46 * u, 0, 0.92 * u, 2.5 * u, 0.46 * u)
    g.moveTo(0, 0)
    // The three curled fingers, as knuckles along the palm's top.
    g.moveTo(1.2 * u, 2.05 * u)
    g.arc(0.8 * u, 2.05 * u, 0.4 * u, 0, TAU)
    g.moveTo(1.8 * u, 2.2 * u)
    g.arc(1.42 * u, 2.2 * u, 0.38 * u, 0, TAU)
    g.moveTo(2.3 * u, 2.45 * u)
    g.arc(1.96 * u, 2.45 * u, 0.34 * u, 0, TAU)
    // The palm.
    g.moveTo(2.25 * u, 3.1 * u)
    g.ellipse(0.9 * u, 3.1 * u, 1.35 * u, 1.05 * u, 0, 0, TAU)
    // The thumb, reaching up the index finger's side.
    g.moveTo(-0.2 * u, 2.2 * u)
    g.ellipse(-0.55 * u, 2.65 * u, 0.36 * u, 0.62 * u, -0.6, 0, TAU)
  }
  const cuff = (): void => {
    g.beginPath()
    g.roundRect(0.05 * u, 3.75 * u, 1.75 * u, 0.75 * u, 0.3 * u)
  }
  const w = Math.max(2, u * 0.2) * ink
  g.lineJoin = 'round'
  g.lineWidth = w * 2
  g.strokeStyle = INK
  parts()
  g.stroke()
  cuff()
  g.stroke()
  g.fillStyle = '#ffffff'
  parts()
  g.fill()
  g.fillStyle = '#d9c8ff'
  cuff()
  g.fill()
  // The creases between the curled fingers, and the nail's shine.
  g.lineWidth = w * 0.7
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(1.12 * u, 2.2 * u)
  g.lineTo(1.1 * u, 2.6 * u)
  g.moveTo(1.72 * u, 2.4 * u)
  g.lineTo(1.68 * u, 2.75 * u)
  g.stroke()
  g.beginPath()
  g.ellipse(-0.08 * u, 0.42 * u, 0.13 * u, 0.2 * u, 0, 0, TAU)
  g.fillStyle = 'rgba(58,35,64,0.12)'
  g.fill()
}

/** How much of the drawn line the reference keeps (see `paintGlove`). */
const REF_INK = 0.5

/** The bench's handle on it (`artSheet` `worldui-show-glove`): drawn at `s` =
 *  a finger's width, fingertip at the origin — the same origin the game
 *  places it by, so the painting lands where the drawing's fingertip was. */
export const GLOVE_ART: ItemSpec = {
  ...CHROME_ART.glove,
  frames: 1,
  draw: (g, s) => paintGlove(g, s, REF_INK)
}

/**
 * The glove at the current transform, `u` a finger's width: the painting when
 * it has decoded, the drawing otherwise. Returns whether it was the painting,
 * so a caller that dresses the drawn one differently (the intro's pad) can
 * tell.
 */
export const drawGlove = (g: G2D, u: number): boolean => {
  if (drawItem(g, GLOVE_ART, u)) return true
  paintGlove(g, u)
  return false
}
