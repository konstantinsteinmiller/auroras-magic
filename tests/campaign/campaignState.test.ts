// @vitest-environment node
// `S.campaign` (story-spec §4.4): the defaults, a loader that survives any
// save, and the pending-gift derivation the boot flow reads.

import { describe, expect, it } from 'vitest'
import {
  defaultCampaign, readCampaign, pendingSectorNode, nextDuelNode, NODE_COUNT
} from '@/game/campaign/state'
import { setBit, emptyBitset, hasBit } from '@/game/campaign/bitset'
import { STARTING_RUNES } from '@/game/campaign/tables'
import { FIRE, EARTH } from '@/game/duel/config'

describe('CampaignState', () => {
  it('defaults to a fresh story: no node won, two runes in hand (§8.30)', () => {
    const c = defaultCampaign()
    expect(c.furthestNode).toBe(-1)
    // Fire to throw and Earth to hide behind; everything else is earned.
    expect(c.runesUnlocked).toBe(STARTING_RUNES)
    expect(STARTING_RUNES).toBe((1 << FIRE) | (1 << EARTH))
    expect(c.wipeCoverage).toBeNull()
    expect(c.giftsEquipped).toEqual([-1, -1, -1, -1, -1, -1, -1])
  })

  it('reads a fresh profile, junk and wrong types as the defaults', () => {
    for (const raw of [null, undefined, 42, 'x', [], { furthestNode: 'banana', sectorsDone: '%%%' }]) {
      const c = readCampaign(raw)
      expect(c.furthestNode).toBe(-1)
      expect(c.sectorsDone).toBe(emptyBitset(NODE_COUNT))
      expect(c.runesUnlocked & STARTING_RUNES).toBe(STARTING_RUNES)
    }
  })

  it('round-trips a real save through JSON unchanged', () => {
    const c = defaultCampaign()
    c.furthestNode = 12
    c.sectorsDone = setBit(c.sectorsDone, 11)
    c.wipeCoverage = emptyBitset(336)
    c.lossStreaks = { 12: 2 }
    const back = readCampaign(JSON.parse(JSON.stringify(c)))
    expect(back).toEqual(c)
  })

  it('clamps hand-edited numbers and never drops the starting pair', () => {
    const c = readCampaign({ furthestNode: 999, runesUnlocked: 0, lossStreaks: { 3: 99, x: 1, 80: 2 } })
    expect(c.furthestNode).toBe(NODE_COUNT - 1)
    expect(c.runesUnlocked).toBe(STARTING_RUNES)
    expect(c.lossStreaks).toEqual({ 3: 8 })
  })

  it('leaves a save from before the runes were earned with all four (§8.30)', () => {
    // Every profile that has played until now holds the old frozen four.
    // Nobody is taken back down to two.
    const c = readCampaign({ runesUnlocked: 0b1111, furthestNode: 3 })
    expect(c.runesUnlocked).toBe(0b1111)
  })

  it('finds the pending gift: won, not yet wiped', () => {
    const c = defaultCampaign()
    expect(pendingSectorNode(c)).toBeNull()
    c.furthestNode = 12
    expect(pendingSectorNode(c)).toBe(12)
    c.sectorsDone = setBit(c.sectorsDone, 12)
    expect(pendingSectorNode(c)).toBeNull()
    expect(nextDuelNode(c)).toBe(13)
  })

  it('knows the campaign is complete', () => {
    const c = defaultCampaign()
    c.furthestNode = 49
    c.sectorsDone = setBit(c.sectorsDone, 49)
    expect(pendingSectorNode(c)).toBeNull()
    expect(nextDuelNode(c)).toBe(49)
    expect(hasBit(c.sectorsDone, 49)).toBe(true)
  })
})
