// @vitest-environment node
// The Stardust Brush's feel, as numbers (story-spec §8.4): the radius rule,
// the dwell rule (a pass clears about half, coming back finishes it), the
// speed response, and one stamp batch per frame.

import { describe, expect, it } from 'vitest'
import {
  Brush, brushSize, speedFactor, A_FIRST, A_FINISH, SPACING, DWELL_WINDOW_MS
} from '@/game/restore/brush'
import { createCoverage, stamp, cellCover, cellAt, SEC_W, type Coverage } from '@/game/restore/mask'

const PER_PASS = 2 / SPACING

/** A brush in a view where 1 CSS px = 1 SU, short side 480 (the floor). */
const make = (): { b: Brush; cov: Coverage; laid: number[] } => {
  const b = new Brush(1, brushSize(480))
  const cov = createCoverage()
  const laid: number[] = []
  return { b, cov, laid }
}
const apply = (cov: Coverage, laid: number[]) =>
  (x: number, y: number, r: number, core: number, a: number, _sp: number, t: number): void => {
    laid.push(a)
    stamp(cov, x, y, r, core, a, t)
  }

/** One straight horizontal pass along y at `speed` px/s, flushed at 60 Hz. */
const pass = (b: Brush, cov: Coverage, laid: number[], y: number, t0: number, speed: number, x0 = 100, x1 = 700): number => {
  let t = t0
  b.press(x0, y, x0, y, t)
  const dt = 1000 / 60
  for (let x = x0; x <= x1; x += (speed * dt) / 1000) {
    t += dt
    b.move(x, y, x, y, t)
    b.flush(t, cov, apply(cov, laid))
  }
  b.release()
  return t
}

describe('Stardust Brush', () => {
  it('sizes by §8.4: a 36 px floor, 7 % of the short side above ~514 px, plus a 3 % feather', () => {
    expect(brushSize(320).core).toBe(36)
    expect(brushSize(514).core).toBeCloseTo(36, 0)
    expect(brushSize(720).core).toBeCloseTo(50.4)
    expect(brushSize(720).outer).toBeCloseTo(50.4 + 21.6)
  })

  it('solves its per-stamp strength so one pass clears 55 % and a return clears 98 %', () => {
    expect(1 - (1 - A_FIRST) ** PER_PASS).toBeCloseTo(0.55, 6)
    expect(1 - (1 - A_FINISH) ** PER_PASS).toBeCloseTo(0.98, 6)
  })

  it('rewards the slow stroke: full strength when lingering, 0.6× at a flick', () => {
    expect(speedFactor(0)).toBe(1)
    expect(speedFactor(200)).toBeCloseTo(0.8)
    expect(speedFactor(400)).toBeCloseTo(0.6)
    expect(speedFactor(4000)).toBeCloseTo(0.6)
  })

  it('settles a patch brushed once visibly part-clean — "come back and finish it"', () => {
    const { b, cov, laid } = make()
    pass(b, cov, laid, 300, 0, 300)
    const c = cellCover(cov, cellAt(400, 300))
    expect(c).toBeGreaterThan(0.3)
    expect(c).toBeLessThan(0.65)
  })

  it('finishes it with a return pass inside the 2.5 s window', () => {
    const { b, cov, laid } = make()
    const t = pass(b, cov, laid, 300, 0, 300)
    pass(b, cov, laid, 300, t + 400, 300)
    expect(cellCover(cov, cellAt(400, 300))).toBeGreaterThan(0.9)
  })

  it('treats a return AFTER the window as a fresh first pass', () => {
    const late = make()
    const t = pass(late.b, late.cov, late.laid, 300, 0, 300)
    pass(late.b, late.cov, late.laid, 300, t + DWELL_WINDOW_MS + 500, 300)
    const quick = make()
    const t2 = pass(quick.b, quick.cov, quick.laid, 300, 0, 300)
    pass(quick.b, quick.cov, quick.laid, 300, t2 + 400, 300)
    expect(cellCover(late.cov, cellAt(400, 300))).toBeLessThan(cellCover(quick.cov, cellAt(400, 300)))
  })

  it('polishes a spot clean when the brush rests on it', () => {
    const { b, cov, laid } = make()
    b.press(400, 300, 400, 300, 0)
    for (let t = 0; t <= 2500; t += 1000 / 60) b.flush(t, cov, apply(cov, laid))
    expect(cellCover(cov, cellAt(400, 300))).toBeGreaterThan(0.9)
  })

  it('lays stamps along the path, not per pointer event', () => {
    const { b, cov, laid } = make()
    b.press(100, 300, 100, 300, 0)
    // A burst of 40 coalesced samples over 30 px: one flush, a handful of stamps.
    for (let i = 1; i <= 40; i++) b.move(100 + i * 0.75, 300, 100 + i * 0.75, 300, i * 0.4)
    b.flush(16, cov, apply(cov, laid))
    expect(laid.length).toBeLessThanOrEqual(Math.ceil(30 / (SPACING * b.rCore)) + 1)
    expect(laid.length).toBeGreaterThan(0)
  })

  it('works in sector units whatever the screen size', () => {
    const b = new Brush(SEC_W / 400, brushSize(390))
    expect(b.rCore).toBeCloseTo(36 * (SEC_W / 400))
  })
})
