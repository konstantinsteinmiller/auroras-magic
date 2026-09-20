// The spellbook's reach and its "new" cue (story-spec §3.9.1, C15–C16).

import { beforeEach, describe, expect, it } from 'vitest'
import { S } from '@/game/duel/state'
import { defaultCampaign } from '@/game/campaign/state'
import { setBit } from '@/game/campaign/bitset'
import { COMBO_COUNT, comboEnumerationIndex, FIRE, EARTH, ICE, NATURE } from '@/game/duel/config'
import { STARTING_RUNES } from '@/game/campaign/tables'
import { bookHud, isReachable, isNewCombo, markViewed, refreshBook, drawableMask } from '@/use/useBook'

const reachableCount = (): number => {
  let n = 0
  for (let i = 0; i < COMBO_COUNT; i++) if (isReachable(i)) n++
  return n
}

beforeEach(() => {
  S.campaign = defaultCampaign()
  refreshBook()
})

describe('the spellbook', () => {
  it('lists only what the player can draw: 2 + 3 + 4 combos of the starting pair (§8.30)', () => {
    expect(drawableMask()).toBe(STARTING_RUNES)
    expect(reachableCount()).toBe(2 + 3 + 4)
    expect(isReachable(comboEnumerationIndex([FIRE, NATURE]))).toBe(false)
    // Ice is earned after the first battle, so it is not in the book yet.
    expect(isReachable(comboEnumerationIndex([ICE]))).toBe(false)
  })

  it('grows when a chest gives a rune — never shrinks', () => {
    const before = reachableCount()
    S.campaign.runesUnlocked |= 1 << ICE
    expect(reachableCount()).toBe(3 + 6 + 10)
    expect(reachableCount()).toBeGreaterThan(before)
    expect(isReachable(comboEnumerationIndex([FIRE, ICE]))).toBe(true)
    S.campaign.runesUnlocked |= 1 << NATURE
    expect(reachableCount()).toBe(4 + 10 + 20)
    expect(isReachable(comboEnumerationIndex([FIRE, NATURE]))).toBe(true)
  })

  it('sparkles for a discovery until its row has been seen', () => {
    const i = comboEnumerationIndex([FIRE, EARTH])
    expect(bookHud.hasNew).toBe(false)
    S.campaign.combosSeen = setBit(S.campaign.combosSeen, i)
    refreshBook()
    expect(isNewCombo(i)).toBe(true)
    expect(bookHud.hasNew).toBe(true)
    markViewed(i)
    expect(isNewCombo(i)).toBe(false)
    expect(bookHud.hasNew).toBe(false)
  })

  it('does not sparkle for a discovery the player cannot draw any more', () => {
    const i = comboEnumerationIndex([NATURE])
    S.campaign.combosSeen = setBit(S.campaign.combosSeen, i)
    refreshBook()
    expect(bookHud.hasNew).toBe(false)
  })
})
