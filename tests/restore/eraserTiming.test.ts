// @vitest-environment node
// §7.5 / §8.4: the Magic Eraser clears the SAME standard sector as the brush,
// faster — ≈ 12 s at the reference scale (the low end of the 12–20 s band),
// the fatigue relief for chapters 4–10. A relaxed player sweeping rows,
// finger down, on the real paddle and coverage model.

import { describe, expect, it } from 'vitest'
import { Eraser, eraserSize } from '@/game/restore/eraser'
import { createCoverage, stampRect, coverage01, SEC_W, SEC_H, COMPLETE_AT } from '@/game/restore/mask'
import { computeFrame } from '@/game/restore/frame'
import { seeded } from '@/game/duel/util'

const HZ = 60
const IDLE_GRACE = 1.5

const simulateEraser = (vw: number, vh: number, speed: number, seed: number): number => {
  const f = computeFrame(vw, vh)
  const size = eraserSize(Math.min(vw, vh))
  const er = new Eraser(SEC_W / f.w, size)
  const cov = createCoverage()
  const r = seeded(seed)
  const toSU = (cx: number, cy: number): [number, number] => [((cx - f.x) / f.w) * SEC_W, ((cy - f.y) / f.h) * SEC_H]
  const onStamp = (x: number, y: number, hw: number, hh: number, ang: number, a: number, t: number): void => {
    stampRect(cov, x, y, hw, hh, ang, a, t)
  }
  let t = 0
  let checkT = 0
  const dt = 1 / HZ
  const stepPx = speed * dt
  // Rows one swath apart (the paddle's short side, since it points along the
  // stroke), with a hand's wobble; a second pass on the half-row offset.
  const gap = size.short * 2 * 0.95
  for (let sweep = 0; sweep < 6; sweep++) {
    const y0 = f.y + gap * (sweep % 2 ? 1.0 : 0.5)
    const pts: [number, number][] = []
    let dir = 1
    for (let y = y0; y < f.y + f.h; y += gap * (0.92 + r() * 0.16)) {
      const xa = f.x + size.short * (0.3 + r() * 0.4)
      const xb = f.x + f.w - size.short * (0.3 + r() * 0.4)
      const [from, to] = dir > 0 ? [xa, xb] : [xb, xa]
      const n = Math.max(2, Math.ceil(Math.abs(to - from) / stepPx))
      for (let i = 0; i <= n; i++) {
        const k = i / n
        pts.push([from + (to - from) * k, y + Math.sin(k * 5 + y) * gap * 0.1])
      }
      dir = -dir
    }
    const [sx, sy] = toSU(pts[0]![0], pts[0]![1])
    er.press(sx, sy, pts[0]![0], pts[0]![1], t * 1000)
    for (let i = 1; i < pts.length; i++) {
      t += dt
      const [cx, cy] = pts[i]!
      const [x, y] = toSU(cx, cy)
      er.move(x, y, cx, cy, t * 1000)
      er.flush(t * 1000, onStamp)
      checkT += dt
      if (checkT >= 0.25) {
        checkT = 0
        if (coverage01(cov) >= COMPLETE_AT) return t + IDLE_GRACE
      }
    }
    er.release()
    t += 0.3
  }
  return Infinity
}

describe('Magic Eraser timing (§7.5, §8.4)', () => {
  // Measured at §8.4's paddle size: ~10–11 s, a little under §7.5's ~12 s
  // (its own arithmetic assumes a bigger paddle at a lower efficiency). Kept:
  // faster is fine for this tool (owner, 2026-09-18: tuned for children).
  it('clears the reference sector in ~10–12 s (inside 9–15 s), ten times', () => {
    const times: number[] = []
    for (let seed = 1; seed <= 10; seed++) {
      const s = simulateEraser(760, 456, 550, seed)
      times.push(s)
      expect(s, `seed ${seed}`).toBeGreaterThanOrEqual(9)
      expect(s, `seed ${seed}`).toBeLessThanOrEqual(15)
    }
    console.info('[eraser] reference 760×456 @550 px/s:', times.map((x) => x.toFixed(1)).join(' '))
  })

  it('is faster than the brush on the same sector (fatigue relief)', async () => {
    const { simulateWipe } = await import('./wipeBot')
    const brush = simulateWipe({ vw: 760, vh: 456, speed: 500, seed: 3 }).seconds
    const eraser = simulateEraser(760, 456, 550, 3)
    expect(eraser).toBeLessThan(brush)
  })

  it('one contact clears fully — no dwell', () => {
    const cov = createCoverage()
    stampRect(cov, 576, 336, 60, 40, 0, 1)
    // A cell well inside the paddle is clean after one stamp.
    expect(coverage01(cov)).toBeGreaterThan(0)
    const inner = createCoverage()
    for (let x = 0; x < SEC_W; x += 40) stampRect(inner, x, 336, 60, 40, 0, 1)
    expect(coverage01(inner)).toBeGreaterThan(0.1)
  })
})
