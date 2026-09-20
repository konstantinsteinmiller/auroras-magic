// @vitest-environment node
// §7.5 / §8.4: the boss sector — 4× a standard sector's area — cleared with
// the Sunbeam's aim-and-release shots in THREE of them (~10 s).
//
// Three is the whole contract, and it is gated from both ends:
//
//   • a SENSIBLE pattern — three shots fired from an edge, the way the guide
//     wedge invites — always finishes, deterministically, no bot luck in it.
//     This is the "should never need more than three" promise;
//   • no SINGLE shot can finish, however well aimed. A one-tap boss sector
//     would throw the tool away instead of fixing it.
//
// Between those two, the stochastic bot reports what a middling aimer really
// spends. The Sunbeam's fan is sized to the SECTOR, not to the finger, so
// unlike the brush its clear time does not drift with the screen.

import { describe, expect, it } from 'vitest'
import { simulateSunbeam } from './sunbeamBot'
import { Sunbeam, exitDistance, beamWidth, MIN_PULL, BEAM_W, BEAM_SPREAD, BEAM_RECHARGE } from '@/game/restore/sunbeam'
import { createCoverage, stamp, coverage01, COMPLETE_AT, SEC_W, SEC_H } from '@/game/restore/mask'

/** The stamp core the game bakes on a phone (36 / 48), as `sunbeamBot` uses. */
const CORE = 0.75

/** Fire one shot from (x, y) along (dx, dy) into `cov`, all the way through
 *  its recharge; returns the sector's clear share afterwards. */
const shoot = (
  b: Sunbeam, cov: ReturnType<typeof createCoverage>,
  x: number, y: number, dx: number, dy: number
): number => {
  b.aim(x, y)
  b.drag(x - dx * b.maxPull, y - dy * b.maxPull)
  expect(b.release()).toBe(true)
  let n = 0
  while (b.state !== 'ready' && n++ < 5000) {
    b.step(1 / 60, n, (sx, sy, r, _core, a, _sp, t) => stamp(cov, sx, sy, r, CORE, a, t))
  }
  return coverage01(cov)
}

describe('Sunbeam shot count (§7.5, §8.4)', () => {
  it('finishes a boss sector in three shots fired from an edge', () => {
    // Three ways a child who has seen the guide wedge would actually play it:
    // across, down, and fanned out from one spot on the rim.
    const patterns: [string, [number, number, number, number][]][] = [
      ['three across', [[0, SEC_H / 6, 1, 0], [0, SEC_H / 2, 1, 0], [0, SEC_H * 5 / 6, 1, 0]]],
      ['three down', [[SEC_W / 6, 0, 0, 1], [SEC_W / 2, 0, 0, 1], [SEC_W * 5 / 6, 0, 0, 1]]],
      ['a fan from the left rim', [[0, SEC_H / 2, 0.94, -0.34], [0, SEC_H / 2, 1, 0], [0, SEC_H / 2, 0.94, 0.34]]]
    ]
    for (const [name, shots] of patterns) {
      const cov = createCoverage()
      const b = new Sunbeam(300)
      const after = shots.map(([x, y, dx, dy]) => shoot(b, cov, x, y, dx, dy))
      console.info(`[sunbeam] ${name}: ${after.map((c) => (c * 100).toFixed(1)).join(' → ')} %`)
      expect(after[2], name).toBeGreaterThanOrEqual(COMPLETE_AT)
      expect(b.sweeps).toBe(3)
    }
  })

  it('cannot be finished in one shot, however well aimed', () => {
    // The best single shot there is: from the middle of an edge, straight down
    // the sector's long axis, so the fan has the most room to spread.
    const cov = createCoverage()
    const b = new Sunbeam(300)
    const after = shoot(b, cov, 0, SEC_H / 2, 1, 0)
    console.info(`[sunbeam] best single shot: ${(after * 100).toFixed(1)} %`)
    expect(after).toBeLessThan(COMPLETE_AT)
  })

  it('costs a middling aimer three or four shots, and about ten seconds', () => {
    const times: number[] = []
    const shots: number[] = []
    for (let seed = 1; seed <= 10; seed++) {
      const r = simulateSunbeam({ seed })
      times.push(r.seconds)
      shots.push(r.sweeps)
      expect(r.sweeps, `seed ${seed}`).toBeLessThanOrEqual(4)
      expect(r.seconds, `seed ${seed}`).toBeLessThanOrEqual(15)
    }
    const mean = times.reduce((s, x) => s + x, 0) / times.length
    const meanShots = shots.reduce((s, x) => s + x, 0) / shots.length
    console.info('[sunbeam] seconds:', times.map((t) => t.toFixed(1)).join(' '), '| shots:', shots.join(' '), '| mean', mean.toFixed(1), 's /', meanShots.toFixed(2), 'shots')
    expect(meanShots).toBeLessThanOrEqual(3.2)
    expect(mean).toBeLessThan(12)
  })

  it('never strands a careless aimer in the old double-digit grind (reported)', () => {
    const careless = simulateSunbeam({ seed: 4, looks: 1 })
    const quick = simulateSunbeam({ seed: 4, aim: [0.7, 1.0] })
    console.info(`[sunbeam] careless ${careless.seconds.toFixed(1)} s / ${careless.sweeps} shots; quick ${quick.seconds.toFixed(1)} s / ${quick.sweeps} shots`)
    expect(careless.sweeps).toBeLessThanOrEqual(9)
    expect(quick.sweeps).toBeLessThanOrEqual(4)
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

describe('Sunbeam fan', () => {
  it('leaves the staff at the throat width and widens with the distance', () => {
    expect(beamWidth(0)).toBe(BEAM_W)
    expect(beamWidth(-50)).toBe(BEAM_W)
    expect(beamWidth(100)).toBeCloseTo(BEAM_W + 200 * BEAM_SPREAD)
    expect(beamWidth(1e6)).toBe(SEC_H)
  })

  it('stamps wider the further out it gets, and keeps the overlap even', () => {
    const b = new Sunbeam(300)
    b.aim(0, SEC_H / 2)
    b.drag(-300, SEC_H / 2)
    b.release()
    const hits: [number, number][] = []
    let n = 0
    while (b.state === 'firing' && n++ < 5000) b.step(1 / 60, n, (x, _y, r) => hits.push([x, r]))
    expect(hits.length).toBeGreaterThan(4)
    // Radii climb, and every stamp's centre sits well inside the one before
    // it — no scalloped edge where the fan opens out.
    for (let i = 1; i < hits.length; i++) {
      expect(hits[i]![1]).toBeGreaterThanOrEqual(hits[i - 1]![1])
      expect(hits[i]![0] - hits[i - 1]![0]).toBeLessThan(hits[i - 1]![1])
    }
    expect(hits.at(-1)![1]).toBeGreaterThan(hits[0]![1] * 2)
  })
})
