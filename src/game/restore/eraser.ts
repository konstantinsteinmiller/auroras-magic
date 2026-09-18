/**
 * eraser.ts — the Magic Eraser (story-spec §8.4, §7.5): the standard tool
 * from chapter 4 on, after the chapter-3 boss chest. The "confident and fast"
 * tool for a player who has had their ASMR chapters.
 *
 *   • SHAPE: a flat-edged rounded paddle whose long axis turns to the stroke's
 *     heading (the "shaped debris flies point-first" convention in `fx.ts`);
 *   • SIZE: long half-extent `max(46, 9 % of the view's short side)` CSS px,
 *     the short one 65 % of that — a squarish paddle, not a blade;
 *   • NO DWELL: one contact clears fully. NO SPEED RESPONSE either — the
 *     skill dimension is deliberately gone.
 *
 * Same shape of API as the Brush (`press`/`move`/`release`/`flush`), so the
 * restore loop drives either. Pure: no canvas; `onStamp` receives each paddle
 * stamp in sector units, and the caller paints and accounts it.
 */

/** Stamp spacing along the path, as a share of the short half-extent. */
export const SPACING = 0.3
/** Holding still: one stamp this often, ms. */
export const HOLD_DAB_MS = 90

export interface EraserSize {
  /** Half-extents, CSS px: along the heading, and across it. */
  long: number
  short: number
}

/** §8.4's size rule for a view whose short side is `shortSide` CSS px. */
export const eraserSize = (shortSide: number): EraserSize => {
  const long = Math.max(46, 0.09 * shortSide)
  return { long, short: long * 0.65 }
}

/** One paddle stamp: centre, half-extents (SU), heading (rad), strength, time. */
export type PaddleFn = (x: number, y: number, hw: number, hh: number, ang: number, a: number, t: number) => void

export class Eraser {
  down = false
  x = 0
  y = 0
  private sx = 0
  private sy = 0
  private lastDab = 0
  /** The paddle's heading, rad — eased toward the stroke's direction. */
  ang = 0
  /** Smoothed pointer speed, CSS px/s (for the scrub sound only). */
  speed = 0
  private cx = 0
  private cy = 0
  private lastT = 0
  private buf: number[] = []
  strokes = 0

  constructor (public suPerCss: number, public size: EraserSize) {}

  get hw (): number { return this.size.long * this.suPerCss }
  get hh (): number { return this.size.short * this.suPerCss }

  press (x: number, y: number, cssX: number, cssY: number, t: number): void {
    this.down = true
    this.strokes++
    this.x = this.sx = x
    this.y = this.sy = y
    this.cx = cssX
    this.cy = cssY
    this.lastT = t
    this.lastDab = -1e9
    this.speed = 0
    this.buf.length = 0
  }

  move (x: number, y: number, cssX: number, cssY: number, t: number): void {
    if (!this.down) return
    this.buf.push(x, y, cssX, cssY, t)
  }

  release (): void {
    this.down = false
    this.buf.length = 0
  }

  /** Turn the buffered path into paddle stamps. Returns how many were laid. */
  flush (now: number, onStamp: PaddleFn): number {
    if (!this.down) return 0
    let laid = 0
    const step = SPACING * this.hh
    const b = this.buf
    for (let i = 0; i < b.length; i += 5) {
      const x = b[i]!
      const y = b[i + 1]!
      const t = b[i + 4]!
      const dtS = Math.max(1, t - this.lastT) / 1000
      const inst = Math.hypot(b[i + 2]! - this.cx, b[i + 3]! - this.cy) / dtS
      this.speed += (Math.min(inst, 4000) - this.speed) * Math.min(1, dtS * 14)
      this.cx = b[i + 2]!
      this.cy = b[i + 3]!
      this.lastT = t
      this.x = x
      this.y = y
      let dx = x - this.sx
      let dy = y - this.sy
      let d = Math.hypot(dx, dy)
      if (d > 1) {
        // Turn the long axis toward the heading, the short way round.
        const want = Math.atan2(dy, dx)
        let da = want - this.ang
        da = Math.atan2(Math.sin(da), Math.cos(da))
        this.ang += da * 0.5
      }
      while (d >= step) {
        this.sx += (dx / d) * step
        this.sy += (dy / d) * step
        this.lastDab = t
        onStamp(this.sx, this.sy, this.hw, this.hh, this.ang, 1, t)
        laid++
        dx = x - this.sx
        dy = y - this.sy
        d = Math.hypot(dx, dy)
      }
    }
    b.length = 0
    if (now - this.lastDab >= HOLD_DAB_MS) {
      if (now - this.lastT > 60) this.speed *= 0.5
      this.sx = this.x
      this.sy = this.y
      this.lastDab = now
      onStamp(this.x, this.y, this.hw, this.hh, this.ang, 1, now)
      laid++
    }
    return laid
  }
}
