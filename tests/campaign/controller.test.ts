// The campaign controller (story-spec §4.8.1): the ONE writer of the story's
// progress. Driven by real duel events from the real sim.

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { S } from '@/game/duel/state'
import { resetDuel, updateSim, cast } from '@/game/duel/sim'
import { FIRE, NATURE, PH_WIN, PH_LOSE, comboEnumerationIndex } from '@/game/duel/config'
import { defaultCampaign } from '@/game/campaign/state'
import { hasBit } from '@/game/campaign/bitset'
import { duelSetup, COSMETICS } from '@/game/campaign/tables'
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

  it('a standard gift grants nothing (its payload is the tool)', () => {
    expect(onUnboxComplete(2)).toEqual({ rune: null, signature: null, cosmetic: null })
    expect(S.campaign.runesUnlocked).toBe(0b1111)
  })

  it('marks a dialogue seen once', () => {
    markDialogueSeen(0)
    expect(hasBit(S.campaign.dialoguesSeen, 0)).toBe(true)
    markDialogueSeen(-1)
  })
})
