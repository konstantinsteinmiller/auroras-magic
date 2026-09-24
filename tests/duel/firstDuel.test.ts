/**
 * The first duel's half bars (owner, 2026-09-25; `campaign/easing.ts`
 * `duelHpScale`).
 *
 * Node 0 is a stranger's first fight, right after the prologue shows Umbra
 * dusting the meadow. It should end while it is still new, so Aurora and
 * Umbra both start it with half their health. What must stay true:
 *
 *   • BOTH bars are halved, together, so it is the fight that was tuned,
 *     only shorter. Umbra's chapter-1 easing still applies on top;
 *   • only node 0. Every other node, and local versus, is untouched;
 *   • a retry of it is short too (a bare `resetDuel()` re-runs the duel);
 *   • it is still a fight. The lesson's own Magma Shard does not end it on
 *     its own, so the child still gets to play once the lessons are over;
 *   • it really is faster: the same player finishes it in less time.
 *
 * `Math.random` is pinned, as in `director.test.ts`.
 */
import { describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  let s = 20260925
  Math.random = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
})

import { EARTH, FIRE, HP_MAX, PH_DUEL, PH_WIN, type Rune } from '@/game/duel/config'
import { duelSetup, LAST_BUILT_NODE } from '@/game/campaign/tables'
import { earlyEase, duelHpScale, FIRST_DUEL_HP } from '@/game/campaign/easing'
import { VERSUS_FOE } from '@/game/duel/foes'
import { S } from '@/game/duel/state'
import { resetDuel, updateSim, cast, castBusy } from '@/game/duel/sim'

const DT = 1 / 60

/** Node `n`'s duel as `startDuel` starts it, lessons off, at `scale`. */
const start = (n: number, scale = duelHpScale(n)): void => {
  S.intro = 0
  S.wins = 20
  S.losses = 0
  const setup = duelSetup(n)
  resetDuel({ foe: setup.foe, usesMagic: setup.usesMagic, lossStreak: 0, ease: earlyEase(n), versus: false, hpScale: scale })
}

describe('the first duel\'s half bars', () => {
  it('start Aurora and Umbra both at half', () => {
    start(0, 1)
    const fullFoe = S.ehpMax
    start(0)
    expect(S.hpMax).toBe(HP_MAX * FIRST_DUEL_HP)
    expect(S.ehpMax).toBe(Math.round(fullFoe * FIRST_DUEL_HP))
    expect([S.hp, S.ehp]).toEqual([S.hpMax, S.ehpMax])
  })

  it('are the first duel\'s alone', () => {
    expect(duelHpScale(0)).toBe(FIRST_DUEL_HP)
    for (let n = 1; n <= LAST_BUILT_NODE; n++) expect(duelHpScale(n), `node ${n}`).toBe(1)
    start(1)
    expect(S.hpMax).toBe(HP_MAX)
  })

  it('survive a retry', () => {
    start(0)
    const bars = [S.hpMax, S.ehpMax]
    S.hp = 3
    resetDuel()
    expect([S.hpMax, S.ehpMax]).toEqual(bars)
    expect(S.hp).toBe(S.hpMax)
  })

  it('never reach local versus', () => {
    resetDuel({ foe: VERSUS_FOE, usesMagic: false, lossStreak: 0, versus: true, hpScale: 0.5 })
    expect([S.hpMax, S.ehpMax]).toEqual([HP_MAX, HP_MAX])
  })

  it('leave a fight after the lesson: its Magma Shard alone does not end it', () => {
    start(0)
    // Hold Umbra, as the lesson does until its last cast lands.
    S.eThink = 99
    S.queue.push(FIRE as Rune, EARTH as Rune)
    cast()
    for (let t = 0; t < 4 && S.phase === PH_DUEL; t += DT) {
      S.eThink = 99
      updateSim(DT)
    }
    expect(S.phase).toBe(PH_DUEL)
    expect(S.ehp, 'the shard landed').toBeLessThan(S.ehpMax)
    expect(S.ehp, 'and she is still standing').toBeGreaterThan(0)
  })

  it('end sooner for the same player', () => {
    /** A steady player: Fire + Earth whenever her hand is free. */
    const secondsToWin = (scale: number): number => {
      start(0, scale)
      let t = 0
      for (; t < 180 && S.phase === PH_DUEL; t += DT) {
        S.pops.length = 0
        if (!castBusy(false) && !S.queue.length) {
          S.queue.push(FIRE as Rune, EARTH as Rune)
          cast()
        }
        updateSim(DT)
      }
      expect(S.phase, `scale ${scale}`).toBe(PH_WIN)
      return t
    }
    const full = secondsToWin(1)
    const half = secondsToWin(FIRST_DUEL_HP)
    expect(half).toBeLessThan(full * 0.75)
  })
})
