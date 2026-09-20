// The campaign controller (story-spec §4.8.1): the ONE writer of the story's
// progress. Driven by real duel events from the real sim.

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { S } from '@/game/duel/state'
import { resetDuel, updateSim, cast } from '@/game/duel/sim'
import { FIRE, WIND, ICE, NATURE, PH_WIN, PH_LOSE, comboEnumerationIndex } from '@/game/duel/config'
import { defaultCampaign } from '@/game/campaign/state'
import { hasBit } from '@/game/campaign/bitset'
import { duelSetup, COSMETICS, STARTING_RUNES } from '@/game/campaign/tables'
import { installCampaignController, onUnboxComplete, markDialogueSeen, isReplay, lossStreakOf } from '@/game/campaign/controller'

const STEP = 1 / 120
const run = (s: number): void => { for (let i = 0; i < Math.round(s / STEP); i++) updateSim(STEP) }

/** Start node `n`'s duel as the flow would. */
const duelAt = (n: number): void => {
  const setup = duelSetup(n)
  S.flow.node = n
  S.flow.mode = 'campaign'
  resetDuel({ foe: setup.foe, usesMagic: setup.usesMagic, lossStreak: lossStreakOf(n) })
  S.eThink = 1e9
  S.equeue.length = 0
}
const win = (): void => {
  S.ehp = 1
  S.queue.push(FIRE)
  cast()
  run(2)
  expect(S.phase).toBe(PH_WIN)
}
const lose = (): void => {
  S.hp = 0.01
  S.burn = 5
  run(0.1)
  expect(S.phase).toBe(PH_LOSE)
}

let off: () => void = () => {}
beforeEach(() => {
  S.campaign = defaultCampaign()
  S.wins = 5
  S.intro = 0
  off = installCampaignController()
})
afterEach(() => off())

describe('the campaign controller', () => {
  it('a win on the next node advances furthestNode', () => {
    duelAt(0)
    win()
    expect(S.campaign.furthestNode).toBe(0)
    expect(isReplay(0)).toBe(true)
    expect(isReplay(1)).toBe(false)
  })

  it('a loss there adds Dream Dust, capped at 8; the win clears it', () => {
    for (let i = 0; i < 10; i++) {
      duelAt(0)
      lose()
    }
    expect(lossStreakOf(0)).toBe(8)
    expect(S.campaign.furthestNode).toBe(-1)
    duelAt(0)
    expect(S.dust).toBeCloseTo(0.6)
    win()
    expect(lossStreakOf(0)).toBe(0)
    expect('0' in S.campaign.lossStreaks).toBe(false)
  })

  it('a replay touches nothing — no progress, no dust (C24)', () => {
    S.campaign.furthestNode = 2
    duelAt(1)
    lose()
    expect(lossStreakOf(1)).toBe(0)
    duelAt(1)
    win()
    expect(S.campaign.furthestNode).toBe(2)
  })

  it('records a first cast in the spellbook, once', () => {
    duelAt(0)
    S.queue.push(FIRE, FIRE)
    cast()
    expect(hasBit(S.campaign.combosSeen, comboEnumerationIndex([FIRE, FIRE]))).toBe(true)
  })

  it('a boss chest grants the chapter rune and keepsake at the unbox — once', () => {
    const g = onUnboxComplete(4)
    expect(g.rune).toBe(NATURE)
    expect(g.signature).toBeNull()
    expect(COSMETICS[g.cosmetic!]!.slug).toBe('flowerCrown')
    expect((S.campaign.runesUnlocked >> NATURE) & 1).toBe(1)
    expect((S.campaign.giftsOwned >> g.cosmetic!) & 1).toBe(1)
    expect(onUnboxComplete(4)).toEqual({ rune: null, signature: null, cosmetic: null })
  })

  it('the first chests give the two early runes, once each (§8.30)', () => {
    // After the FIRST battle: Ice. After the third: Wind.
    expect(onUnboxComplete(0)).toEqual({ rune: ICE, signature: null, cosmetic: null })
    expect((S.campaign.runesUnlocked >> ICE) & 1).toBe(1)
    expect(onUnboxComplete(0)).toEqual({ rune: null, signature: null, cosmetic: null })
    expect(onUnboxComplete(1)).toEqual({ rune: null, signature: null, cosmetic: null })
    expect(onUnboxComplete(2)).toEqual({ rune: WIND, signature: null, cosmetic: null })
    expect(S.campaign.runesUnlocked).toBe(STARTING_RUNES | (1 << ICE) | (1 << WIND))
  })

  it('every other standard gift grants nothing (its payload is the tool)', () => {
    for (const n of [1, 3, 5, 6, 7, 8, 11, 23, 48]) {
      expect(onUnboxComplete(n), `node ${n}`).toEqual({ rune: null, signature: null, cosmetic: null })
    }
    expect(S.campaign.runesUnlocked).toBe(STARTING_RUNES)
  })

  it('hands out all twelve runes across the story, and never twice (§8.30)', () => {
    let held = STARTING_RUNES
    const given: number[] = []
    for (let n = 0; n < 50; n++) {
      const g = onUnboxComplete(n)
      if (g.rune === null) continue
      expect((held >> g.rune) & 1, `rune ${g.rune} given twice`).toBe(0)
      held |= 1 << g.rune
      given.push(g.rune)
    }
    // Two to start, ten earned: every rune in the game, each exactly once.
    expect(given).toHaveLength(10)
    expect(held).toBe(0xfff)
    // The cadence the owner asked for: after the 1st, 3rd and 5th battles.
    expect(given.slice(0, 3)).toEqual([ICE, WIND, NATURE])
  })

  it('marks a dialogue seen once', () => {
    markDialogueSeen(0)
    expect(hasBit(S.campaign.dialoguesSeen, 0)).toBe(true)
    markDialogueSeen(-1)
  })
})
