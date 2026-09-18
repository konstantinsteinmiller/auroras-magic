// The spellbook's reach and its "new" cue (story-spec §3.9.1, C15–C16).

import { beforeEach, describe, expect, it } from 'vitest'
import { S } from '@/game/duel/state'
import { defaultCampaign } from '@/game/campaign/state'
import { setBit } from '@/game/campaign/bitset'
import { COMBO_COUNT, comboEnumerationIndex, NATURE } from '@/game/duel/config'
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
  it('lists only what the player can draw: 4 + 10 + 20 combos of the frozen four', () => {
    expect(drawableMask()).toBe(0b1111)
    expect(reachableCount()).toBe(4 + 10 + 20)
    expect(isReachable(comboEnumerationIndex([0, NATURE]))).toBe(false)
  })

  it('grows when a chest gives a rune — never shrinks', () => {
    const before = reachableCount()
    S.campaign.runesUnlocked |= 1 << NATURE
    expect(reachableCount()).toBe(5 + 15 + 35)
    expect(reachableCount()).toBeGreaterThan(before)
    expect(isReachable(comboEnumerationIndex([0, NATURE]))).toBe(true)
  })

  it('sparkles for a discovery until its row has been seen', () => {
    const i = comboEnumerationIndex([0, 2])
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
