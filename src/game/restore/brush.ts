/**
 * brush.ts — the Stardust Brush (story-spec §8.4, §9.3.1–§9.3.2).
 *
 * Pointer samples land in a small buffer as they arrive; `flush()` is called
 * ONCE per frame and turns the buffered path into a short line of stamps. A
 * burst of coalesced `pointermove` events costs one batch, not one
 * composite each (§9.3.2).
 *
 * THE FEEL, as numbers (§8.4):
 *   • core radius `max(36, 7 % of the view's short side)` CSS px, plus a soft
 *     feather of 3 % of the short side;
 *   • DWELL: one pass over a patch clears ~55 % of its dust; coming back over
 *     it within 2.5 s clears the rest. A patch brushed once and left alone
 *     settles visibly half-clean, which is the "come back and finish it"
 *     scrub;
 *   • SPEED: strength × `1 − 0.4·clamp(speed / 400 px·s⁻¹)` — a slow,
 *     lingering stroke clears more per pixel than a flick. Holding still
 *     keeps dabbing, so resting the brush on a spot polishes it clean.
 *
 * The pass arithmetic: stamps are laid every `SPACING × core` along the
 * path, so a point on a stroke's centre line sits under `2 / SPACING` of them.
 * Per-stamp strength is solved from that count, so a pass clears the stated
 * share whatever the brush's size.
 *
 * Pure: no canvas. `onStamp` receives every stamp in sector units; the
 * caller paints it AND accounts it (`mask.ts`, passing `t` so the dwell
 * clocks advance), from the same numbers.
 */
import { cellAt, isReturnVisit, type Coverage } from '@/game/restore/mask'

/** Stamp spacing along the path, as a share of the core radius. */
export const SPACING = 0.3
const PER_PASS = 2 / SPACING
/** First pass clears 55 % of what is there. */
export const A_FIRST = 1 - Math.pow(1 - 0.55, 1 / PER_PASS)
/** A return pass inside the window clears (practically) the rest. */
export const A_FINISH = 1 - Math.pow(1 - 0.98, 1 / PER_PASS)
/** The rolling window a return pass must land in, ms. */
export const DWELL_WINDOW_MS = 2500
/** Holding still: one dab this often, ms. */
export const HOLD_DAB_MS = 70
/** Speed at which the strength floor (0.6×) is reached, CSS px/s. */
export const SPEED_FULL = 400

export interface BrushSize {
  /** Core radius, CSS px. */
  core: number
  /** Core + feather, CSS px. */
  outer: number
}

/** §8.4's radius rule for a view whose short side is `shortSide` CSS px. */
export const brushSize = (shortSide: number): BrushSize => {
  const core = Math.max(36, 0.07 * shortSide)
  return { core, outer: core + 0.03 * shortSide }
}

export const speedFactor = (speedCss: number): number =>
  1 - 0.4 * Math.min(1, Math.max(0, speedCss / SPEED_FULL))

export type StampFn = (x: number, y: number, r: number, core: number, a: number, speedCss: number, t: number) => void

/**
 * One brush in one view. `suPerCss` converts the screen's CSS px into sector
 * units; it changes on resize, never mid-stroke in practice.
 */
export class Brush {
  down = false
  /** Last position that received a stamp, SU. */
  private sx = 0
  private sy = 0
  /** Latest pointer position, SU / CSS px. */
  x = 0
  y = 0
  private cx = 0
  private cy = 0
  private lastT = 0
  private lastDab = 0
  /** Smoothed pointer speed, CSS px/s. */
  speed = 0
  /** Samples since the last flush: x, y (SU), cssX, cssY, t (ms). */
  private buf: number[] = []
  /** Stamps laid over the brush's lifetime (telemetry: strokes). */
  strokes = 0

  constructor (public suPerCss: number, public size: BrushSize) {}

  get rCore (): number { return this.size.core * this.suPerCss }
  get rOuter (): number { return this.size.outer * this.suPerCss }
  get coreFrac (): number { return this.size.core / this.size.outer }

  press (x: number, y: number, cssX: number, cssY: number, t: number): void {
    this.down = true
    this.strokes++
    this.x = this.sx = x
    this.y = this.sy = y
    this.cx = cssX
    this.cy = cssY
    this.lastT = t
    this.lastDab = -1e9 // the first flush dabs where the finger landed
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

  /**
   * Turn the buffered path into stamps. `now` is the frame's clock in ms;
   * `cov` supplies the dwell history. Returns the number of stamps laid.
   */
  flush (now: number, cov: Coverage, onStamp: StampFn): number {
    if (!this.down) return 0
    let laid = 0
    const step = SPACING * this.rCore
    const b = this.buf
    for (let i = 0; i < b.length; i += 5) {
      const x = b[i]!
      const y = b[i + 1]!
      const t = b[i + 4]!
      // Speed from the CSS-px path, smoothed so one jittery sample can't swing
      // the strength or the scrub sound.
      const dtS = Math.max(1, t - this.lastT) / 1000
      const inst = Math.hypot(b[i + 2]! - this.cx, b[i + 3]! - this.cy) / dtS
      this.speed += (Math.min(inst, 4000) - this.speed) * Math.min(1, dtS * 14)
      this.cx = b[i + 2]!
      this.cy = b[i + 3]!
      this.lastT = t
      this.x = x
      this.y = y
      // Walk from the last stamp toward this sample, one stamp per `step`.
      let dx = x - this.sx
      let dy = y - this.sy
      let d = Math.hypot(dx, dy)
      while (d >= step) {
        this.sx += (dx / d) * step
        this.sy += (dy / d) * step
        this.dab(this.sx, this.sy, t, cov, onStamp)
        laid++
        dx = x - this.sx
        dy = y - this.sy
        d = Math.hypot(dx, dy)
      }
    }
    b.length = 0
    // Resting or creeping: keep dabbing where the brush is.
    if (now - this.lastDab >= HOLD_DAB_MS) {
      if (now - this.lastT > 60) this.speed *= 0.5
      this.sx = this.x
      this.sy = this.y
      this.dab(this.x, this.y, now, cov, onStamp)
      laid++
    }
    return laid
  }

  private dab (x: number, y: number, t: number, cov: Coverage, onStamp: StampFn): void {
    this.lastDab = t
    // A RETURN pass: this spot was brushed recently, but the brush went away
    // and came back. The centre cell decides, so one stamp has one strength.
    const c = cellAt(x, y)
    const a = c >= 0 && isReturnVisit(cov, c, t, DWELL_WINDOW_MS) ? A_FINISH : A_FIRST
    onStamp(x, y, this.rOuter, this.coreFrac, a * speedFactor(this.speed), this.speed, t)
  }
}
