/**
 * A simulated player for the boss sector's Sunbeam, on the REAL beam and
 * coverage model (no canvas). Shared by the timing gate.
 *
 * The player is purposeful but not a solver: before each shot they glance
 * at a handful of possible shots — start in some dusty spot, fire in some
 * direction — and take the one that crosses the most dust. Each shot costs
 * an aim (press, pull back, let go: 1.1–1.8 s, a child's pace), the band's
 * travel, and the 0.6 s the Sunbeam needs to gather its light again. They
 * stop the moment the ring reports ≥ 85 %, and the reveal fires 1.5 s later.
 */
import { Sunbeam, BEAM_W, BEAM_RECHARGE, exitDistance } from '@/game/restore/sunbeam'
import { createCoverage, stamp, coverage01, isCellDone, SEC_W, SEC_H, CELL, CELLS, GRID_W, COMPLETE_AT } from '@/game/restore/mask'
import { seeded } from '@/game/duel/util'

export interface BeamBotOpts {
  seed: number
  /** Shots considered before each one taken (1 = aims at random dust). */
  looks?: number
  /** Aim time range, seconds. */
  aim?: [number, number]
}

export interface BeamBotResult {
  seconds: number
  sweeps: number
  /** Mean clear share each shot added. */
  perSweep: number
}

const HZ = 60
const IDLE_GRACE = 1.5
/** The stamp's core share the game bakes on a phone (36 / 48). */
const CORE = 0.75

export const simulateSunbeam = (o: BeamBotOpts): BeamBotResult => {
  const cov = createCoverage()
  const beam = new Sunbeam(300)
  const r = seeded(o.seed)
  const looks = o.looks ?? 6
  const [aimLo, aimHi] = o.aim ?? [1.1, 1.8]
  const onStamp = (x: number, y: number, rad: number, _core: number, a: number, _sp: number, t: number): void => {
    stamp(cov, x, y, rad, CORE, a, t)
  }
  /** Dusty cells within the band's clear half-width of the shot's path. */
  const gain = (x: number, y: number, dx: number, dy: number): number => {
    const len = exitDistance(x, y, dx, dy)
    let n = 0
    for (let c = 0; c < CELLS; c++) {
      if (isCellDone(cov, c)) continue
      const cx = (c % GRID_W + 0.5) * CELL - x
      const cy = (((c / GRID_W) | 0) + 0.5) * CELL - y
      const along = cx * dx + cy * dy
      if (along < -CELL * 0.5 || along > len) continue
      if (Math.abs(cx * dy - cy * dx) < BEAM_W * 0.45) n++
    }
    return n
  }
  const dusty = (): number[] => {
    const out: number[] = []
    for (let c = 0; c < CELLS; c++) if (!isCellDone(cov, c)) out.push(c)
    return out
  }

  let t = 0
  let sweeps = 0
  const dt = 1 / HZ
  while (t < 240) {
    t += aimLo + r() * (aimHi - aimLo)
    const pool = dusty()
    let best: [number, number, number, number] | null = null
    let bestGain = -1
    for (let i = 0; i < looks; i++) {
      const c = pool[(r() * pool.length) | 0]!
      const x = Math.min(SEC_W - 1, Math.max(1, (c % GRID_W + r()) * CELL))
      const y = Math.min(SEC_H - 1, Math.max(1, (((c / GRID_W) | 0) + r()) * CELL))
      const a = r() * Math.PI * 2
      const g = gain(x, y, Math.cos(a), Math.sin(a))
      if (g > bestGain) {
        bestGain = g
        best = [x, y, Math.cos(a), Math.sin(a)]
      }
    }
    const [x, y, dx, dy] = best!
    beam.aim(x, y)
    beam.drag(x - dx * 200, y - dy * 200)
    beam.release()
    sweeps++
    while (beam.state === 'firing') {
      t += dt
      beam.step(dt, t * 1000, onStamp)
    }
    if (coverage01(cov) >= COMPLETE_AT) {
      return { seconds: t + IDLE_GRACE, sweeps, perSweep: coverage01(cov) / sweeps }
    }
    t += BEAM_RECHARGE
    while (beam.state !== 'ready') beam.step(dt, t * 1000, onStamp)
  }
  return { seconds: Infinity, sweeps, perSweep: coverage01(cov) / sweeps }
}
