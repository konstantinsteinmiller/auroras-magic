/**
 * The director's contract (`duel/director.ts`, §6.14b).
 *
 * The win-rate harness cannot see this. It measures whether a SKILLED-ENOUGH
 * child clears a node, and a child who was never going to die does not change
 * that number — so every assertion here is about the player the harness does
 * not model: the one who is losing badly.
 *
 * Three promises, and each is the kind a seven-year-old notices:
 *   1. a player who is playing is never killed, however badly it is going;
 *   2. a player who has put the phone down IS finished off, so the mercy
 *      floor cannot be used to idle out a duel;
 *   3. the two health bars stay near each other, so the fight looks close.
 *
 * `Math.random` is pinned, as in `winRate.test.ts`, so a tuning change moves
 * these numbers for a reason rather than by luck.
 */
import { describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  let s = 20260921
  Math.random = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
})

import { NO_EASE, PH_DUEL, type Rune } from '@/game/duel/config'
import { duelSetup } from '@/game/campaign/tables'
import { S } from '@/game/duel/state'
import { resetDuel, updateSim, cast } from '@/game/duel/sim'
import { AFK_S } from '@/game/duel/director'

const DT = 1 / 60

/** A node deep enough that its foe can really hit back. */
const NODE = 12

interface Run {
  /** Lowest the player's health ever got, as a fraction of her maximum. */
  minHp: number
  /** Did the duel end, and how. */
  ended: boolean
  won: boolean
  /** The largest gap between the two health bars, 0..1. */
  maxGap: number
}

/**
 * Play `seconds` of a duel as a player who is TERRIBLE but present: she casts
 * a single weak rune every `beat` seconds and never counters. `present`
 * false is the same player with her hands off the phone.
 */
const play = (seconds: number, present: boolean, beat = 1.4): Run => {
  const setup = duelSetup(NODE)
  S.wins = 20
  S.losses = 0
  S.intro = 0
  S.campaign.signaturesUnlocked = 0
  S.campaign.runesUnlocked = 0xfff
  resetDuel({ foe: setup.foe, usesMagic: false, lossStreak: 0, ease: { ...NO_EASE } })
  let clock = 0
  let minHp = 1
  let maxGap = 0
  for (let t = 0; t < seconds; t += DT) {
    S.pops.length = 0
    clock += DT
    if (present && clock >= beat) {
      clock -= beat
      // One rune, cast alone: about the weakest thing a player can do.
      S.queue.push(0 as Rune)
      cast()
    }
    updateSim(DT)
    const mine = S.hp / S.hpMax
    const hers = S.ehp / S.ehpMax
    if (mine < minHp) minHp = mine
    if (Math.abs(mine - hers) > maxGap) maxGap = Math.abs(mine - hers)
    if (S.phase !== PH_DUEL) {
      return { minHp, ended: true, won: S.phase !== PH_DUEL && S.hp > 0, maxGap }
    }
  }
  return { minHp, ended: false, won: false, maxGap }
}

describe('the duel director (§6.14b)', () => {
  it('never lets a present player be killed, however badly she plays', () => {
    const r = play(90, true)
    // She is alive, and she never even reached zero on the way.
    expect(S.hp, 'health at the end').toBeGreaterThan(0)
    expect(r.minHp, 'lowest health all duel').toBeGreaterThan(0)
    // And she was genuinely under pressure — this is not a foe who missed.
    expect(r.minHp, 'she should have been pushed down near the floor').toBeLessThan(0.55)
  })

  it('finishes off a player who has put the phone down', () => {
    // Long enough to pass the idle threshold several times over.
    const r = play(AFK_S + 80, false)
    expect(r.ended, 'the duel ended').toBe(true)
    expect(S.hp, 'she was finished off').toBe(0)
  })

  it('keeps the two health bars near each other', () => {
    const r = play(60, true)
    // Without the director a weak player is lapped: the foe sits near full
    // while she is on the floor. The trade keeps that gap bounded.
    expect(r.maxGap, 'largest gap between the bars').toBeLessThan(0.85)
  })
})
