/**
 * A simulated player for the wipe, on the REAL brush and coverage model (no
 * canvas). Shared by the timing gate and `tools/wipe-timing`.
 *
 * The player sweeps the sector in rows, back and forth, with the finger
 * down, at a steady speed. Rows sit one core radius apart and wobble a
 * little; a real player's rows are messier than a raster, which §7.5's
 * `pathEfficiency = 0.5` budgets for. They stop brushing the moment the
 * progress RING fills — 85 % cleared, or §8.6's "it already looks clean",
 * whichever comes first — and the reveal fires 1.5 s later (C25). If a sweep
 * ends short of that, they lift, and sweep again on the half-row offset —
 * going back over what they missed, the way the dwell rule invites.
 */
import { Brush, brushSize } from '@/game/restore/brush'
import { createCoverage, stamp, coverage01, lookAt, finishProgress, SEC_W, SEC_H, STOPPED_AT } from '@/game/restore/mask'
import { computeFrame } from '@/game/restore/frame'
import { seeded } from '@/game/duel/util'

export interface BotOpts {
  vw: number
  vh: number
  /** Finger speed, CSS px/s. §7.5's "relaxed, cozy swipe" is 500. */
  speed: number
  seed: number
  /** Row spacing, in core radii. */
  rows?: number
}

export interface BotResult {
  /** Wipe start → reveal, seconds (includes the 1.5 s idle grace). */
  seconds: number
  /** When the ring filled — the moment the player may stop, s. */
  coverage85At: number
  sweeps: number
  frameW: number
  core: number
}

const HZ = 60
const IDLE_GRACE = 1.5

export const simulateWipe = (o: BotOpts): BotResult => {
  const f = computeFrame(o.vw, o.vh)
  const size = brushSize(Math.min(o.vw, o.vh))
  const brush = new Brush(SEC_W / f.w, size)
  const cov = createCoverage()
  const r = seeded(o.seed)
  const onStamp = (x: number, y: number, rad: number, core: number, a: number, _sp: number, t: number): void => {
    stamp(cov, x, y, rad, core, a, t)
  }
  const toSU = (cx: number, cy: number): [number, number] => [((cx - f.x) / f.w) * SEC_W, ((cy - f.y) / f.h) * SEC_H]

  let t = 0 // seconds
  let checkT = 0
  let sweeps = 0
  const dt = 1 / HZ
  const step = o.speed * dt
  const gap = (o.rows ?? 1) * size.core
  while (t < 120) {
    sweeps++
    // One sweep: rows top → bottom, alternating direction, finger down.
    const y0 = f.y + gap * (sweeps % 2 ? 0.55 : 1.05)
    const pts: [number, number][] = []
    let dir = 1
    for (let y = y0; y < f.y + f.h; y += gap * (0.9 + r() * 0.2)) {
      const xa = f.x + size.core * (0.3 + r() * 0.4)
      const xb = f.x + f.w - size.core * (0.3 + r() * 0.4)
      const [from, to] = dir > 0 ? [xa, xb] : [xb, xa]
      const n = Math.max(2, Math.ceil(Math.abs(to - from) / step))
      for (let i = 0; i <= n; i++) {
        const k = i / n
        pts.push([from + (to - from) * k, y + Math.sin(k * 6 + y) * gap * 0.12])
      }
      dir = -dir
    }
    const [sx, sy] = toSU(pts[0]![0], pts[0]![1])
    brush.press(sx, sy, pts[0]![0], pts[0]![1], t * 1000)
    for (let i = 1; i < pts.length; i++) {
      t += dt
      const [cx, cy] = pts[i]!
      const [x, y] = toSU(cx, cy)
      brush.move(x, y, cx, cy, t * 1000)
      brush.flush(t * 1000, cov, onStamp)
      checkT += dt
      if (checkT >= 0.25) {
        checkT = 0
        if (finishProgress(coverage01(cov), lookAt(cov, STOPPED_AT)) >= 1) {
          brush.release()
          return { seconds: t + IDLE_GRACE, coverage85At: t, sweeps, frameW: f.w, core: size.core }
        }
      }
    }
    brush.release()
    t += 0.3 // lift, look, go again
  }
  return { seconds: Infinity, coverage85At: Infinity, sweeps, frameW: f.w, core: size.core }
}
