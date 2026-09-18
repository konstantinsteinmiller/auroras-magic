// @vitest-environment node
// §7.5 / §8.4: the boss sector — 4× a standard sector's area — cleared with
// the Sunbeam's aim-and-release sweeps in ~45 s (35–60 s acceptable).
//
// The Sunbeam's band is sized to the SECTOR, not to the finger, so unlike
// the brush its clear time does not drift with the screen: one bot, ten
// seeds, one band.

import { describe, expect, it } from 'vitest'
import { simulateSunbeam } from './sunbeamBot'
import { Sunbeam, exitDistance, MIN_PULL, BEAM_RECHARGE } from '@/game/restore/sunbeam'
import { SEC_W, SEC_H } from '@/game/restore/mask'

describe('Sunbeam timing (§7.5, §8.4)', () => {
  it('clears a boss sector in the 35–60 s band, around 45 s, ten times', () => {
    const times: number[] = []
    const shots: number[] = []
    for (let seed = 1; seed <= 10; seed++) {
      const r = simulateSunbeam({ seed })
      times.push(r.seconds)
      shots.push(r.sweeps)
      expect(r.seconds, `seed ${seed}`).toBeGreaterThanOrEqual(35)
      expect(r.seconds, `seed ${seed}`).toBeLessThanOrEqual(60)
    }
    const mean = times.reduce((s, x) => s + x, 0) / times.length
    console.info('[sunbeam] seconds:', times.map((t) => t.toFixed(1)).join(' '), '| shots:', shots.join(' '), '| mean', mean.toFixed(1))
    expect(mean).toBeGreaterThan(38)
    expect(mean).toBeLessThan(52)
  })

  it('stays in the band for a careless aimer and a quick one (reported)', () => {
    const careless = simulateSunbeam({ seed: 4, looks: 1 })
    const quick = simulateSunbeam({ seed: 4, aim: [0.7, 1.0] })
    console.info(`[sunbeam] careless ${careless.seconds.toFixed(1)} s / ${careless.sweeps} shots; quick ${quick.seconds.toFixed(1)} s / ${quick.sweeps} shots`)
    expect(careless.seconds).toBeLessThanOrEqual(75)
    expect(quick.seconds).toBeGreaterThanOrEqual(25)
  })
})

describe('Sunbeam slingshot', () => {
  it('fires the OTHER way from the pull, and only on a real pull', () => {
    const b = new Sunbeam(100)
    expect(b.aim(500, 300)).toBe(true)
    b.drag(500 - MIN_PULL * 100 * 0.5, 300)
    expect(b.release()).toBe(false)
    expect(b.state).toBe('ready')
    b.aim(500, 300)
    b.drag(440, 300) // pulled left → flies right
    expect(b.pull).toBeCloseTo(0.6)
    expect(b.release()).toBe(true)
    expect(b.dx).toBeCloseTo(1)
    expect(b.dy).toBeCloseTo(0)
  })

  it('caps the pull, travels to the edge, recharges, and refuses a press meanwhile', () => {
    const b = new Sunbeam(100)
    b.aim(100, 336)
    b.drag(-400, 336)
    expect(b.pull).toBe(1)
    b.release()
    expect(b.aim(10, 10)).toBe(false)
    const xs: number[] = []
    let landed = false
    for (let i = 0; i < 200 && !landed; i++) landed = b.step(1 / 60, i, (x) => xs.push(x))
    expect(landed).toBe(true)
    expect(Math.max(...xs)).toBeGreaterThanOrEqual(SEC_W)
    expect(b.state).toBe('recharge')
    expect(b.charge()).toBeCloseTo(0, 1)
    for (let i = 0; i < Math.ceil(BEAM_RECHARGE * 60) + 1; i++) b.step(1 / 60, i, () => {})
    expect(b.state).toBe('ready')
    expect(b.sweeps).toBe(1)
  })

  it('measures the distance to the sector edge along a heading', () => {
    expect(exitDistance(100, 100, 1, 0)).toBeCloseTo(SEC_W - 100)
    expect(exitDistance(100, 100, 0, -1)).toBeCloseTo(100)
    expect(exitDistance(0, 0, Math.SQRT1_2, Math.SQRT1_2)).toBeCloseTo(SEC_H * Math.SQRT2)
  })
})
