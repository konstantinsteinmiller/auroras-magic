// The campaign controller (story-spec §4.8.1): the ONE writer of the story's
// progress. Driven by real duel events from the real sim.

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { S } from '@/game/duel/state'
import { resetDuel, updateSim, cast } from '@/game/duel/sim'
import { FIRE, WIND, ICE, NATURE, PH_WIN, PH_LOSE, comboEnumerationIndex } from '@/game/duel/config'
import { defaultCampaign } from '@/game/campaign/state'
import { hasBit } from '@/game/campaign/bitset'
import { duelSetup, COSMETICS, STARTING_RUNES, FIRST_GIFT_NODE } from '@/game/campaign/tables'
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
/**
 * She lost. Taken straight to zero rather than burned there: the mercy floor
 * (§6.14b) now holds against a dot as well as a spell, so a burn cannot end a
 * duel while the player is still playing — and what these tests are about is
 * what the CAMPAIGN does with a loss, not how one is arrived at.
 */
const lose = (): void => {
  S.hp = 0
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
    // Chapter 1's boss gives no keepsake any more — the crown moved to the
    // second battle — but it is still the chest that hands over Nature.
    expect(g.cosmetic).toBeNull()
    expect((S.campaign.runesUnlocked >> NATURE) & 1).toBe(1)
    expect(S.campaign.giftsOwned, 'no keepsake from this chest').toBe(0)
    expect(onUnboxComplete(4)).toEqual({ rune: null, signature: null, cosmetic: null })
  })

  it('the first chests give the two early runes, once each (§8.30)', () => {
    // After the FIRST battle: Ice. After the third: Wind.
    expect(onUnboxComplete(0)).toEqual({ rune: ICE, signature: null, cosmetic: null })
    expect((S.campaign.runesUnlocked >> ICE) & 1).toBe(1)
    expect(onUnboxComplete(0)).toEqual({ rune: null, signature: null, cosmetic: null })
    // Node 1 carries the first keepsake now; it still owes no rune.
    expect(onUnboxComplete(1).rune).toBeNull()
    expect(onUnboxComplete(2)).toEqual({ rune: WIND, signature: null, cosmetic: null })
    expect(S.campaign.runesUnlocked).toBe(STARTING_RUNES | (1 << ICE) | (1 << WIND))
  })

  it('gives the first keepsake after the SECOND battle, not at the boss', () => {
    const g = onUnboxComplete(FIRST_GIFT_NODE)
    expect(COSMETICS[g.cosmetic!]!.slug).toBe('flowerCrown')
    expect(g.rune, 'the early keepsake node owes no rune').toBeNull()
    expect(g.signature, 'a signature stays a boss reward').toBeNull()
    expect(onUnboxComplete(FIRST_GIFT_NODE)).toEqual({ rune: null, signature: null, cosmetic: null })
  })

  it('still hands out every keepsake, none twice, once the crown moved', () => {
    const seen: number[] = []
    for (let n = 0; n < 50; n++) {
      const c = onUnboxComplete(n).cosmetic
      if (c !== null) seen.push(c)
    }
    expect(seen.length, 'every keepsake, across the story').toBe(COSMETICS.length)
    expect(new Set(seen).size, 'and never the same one twice').toBe(COSMETICS.length)
  })

  it('every other standard gift grants nothing (its payload is the tool)', () => {
    // The chests that carry something are node 1 (§8.2), every boss, and
    // the second shelf's fourteen (§2.4 rule 20) — these are the rest.
    for (const n of [5, 7, 11, 12, 15, 17, 20, 25, 30, 35, 40, 45, 47]) {
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
