// @vitest-environment node
// `S.campaign` (story-spec §4.4): the defaults, a loader that survives any
// save, and the pending-gift derivation the boot flow reads.

import { describe, expect, it } from 'vitest'
import {
  defaultCampaign, readCampaign, pendingSectorNode, nextDuelNode, NODE_COUNT,
  PHOTO_SLOTS, PHOTO_RECIPE_MAX, SESSIONS_MAX
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

// The retention pass's own fields (retention-roadmap.md items 1, 3, 4, 5, 16).
// They land together and are read by five different features, so the contract
// they share — "an older blob reads as a fresh one, and junk never escapes the
// reader" — is pinned once, here.
describe('the retention fields', () => {
  it('defaults to a profile that has never played and collected nothing', () => {
    const c = defaultCampaign()
    expect(c.lastPlayedDay).toBe(0)
    expect(c.sessions).toBe(0)
    expect(c.giftDay).toBe(0)
    expect(c.creaturesMet).toBe(emptyBitset(NODE_COUNT))
    expect(c.photos).toEqual([])
  })

  it('reads a save written before they existed as that same fresh profile', () => {
    // No schema bump: a schema-2 blob from last week simply has none of them.
    const c = readCampaign({ furthestNode: 7, sectorsDone: emptyBitset(NODE_COUNT) })
    expect(c.furthestNode).toBe(7)
    expect(c.lastPlayedDay).toBe(0)
    expect(c.sessions).toBe(0)
    expect(c.creaturesMet).toBe(emptyBitset(NODE_COUNT))
    expect(c.photos).toEqual([])
  })

  it('clamps junk days, junk counters and junk bitsets', () => {
    const c = readCampaign({
      lastPlayedDay: 'yesterday', sessions: -12, giftDay: 1e30,
      creaturesMet: '%%%'
    })
    expect(c.lastPlayedDay).toBe(0)
    expect(c.sessions).toBe(0)
    expect(c.giftDay).toBe(99991231)
    expect(c.creaturesMet).toBe(emptyBitset(NODE_COUNT))
  })

  it('holds the session counter under its ceiling', () => {
    expect(readCampaign({ sessions: SESSIONS_MAX * 10 }).sessions).toBe(SESSIONS_MAX)
  })

  it('keeps a real day and a real count', () => {
    const c = readCampaign({ lastPlayedDay: 20260923, sessions: 12, giftDay: 20260922 })
    expect(c.lastPlayedDay).toBe(20260923)
    expect(c.sessions).toBe(12)
    expect(c.giftDay).toBe(20260922)
  })

  it('clamps an oversized photo album to its slots, oldest first', () => {
    const many = Array.from({ length: PHOTO_SLOTS + 4 }, (_, i) => `p${i}`)
    const c = readCampaign({ photos: many })
    expect(c.photos).toHaveLength(PHOTO_SLOTS)
    expect(c.photos[0]).toBe('p0')
  })

  it('drops photo entries that are not short strings', () => {
    // `String({})` would store "[object Object]" as a card the album then
    // tries to draw; a dropped entry is the only safe reading.
    const c = readCampaign({ photos: ['ok', {}, null, 42, '', ['x'], 'fine'] })
    expect(c.photos).toEqual(['ok', 'fine'])
  })

  it('truncates a photo recipe rather than storing an image in the blob', () => {
    const c = readCampaign({ photos: ['x'.repeat(5000)] })
    expect(c.photos[0]).toHaveLength(PHOTO_RECIPE_MAX)
  })

  it('reads a photos field that is not an array as no photos', () => {
    for (const raw of [{ photos: 'p0' }, { photos: 42 }, { photos: { 0: 'p0' } }, { photos: null }]) {
      expect(readCampaign(raw).photos).toEqual([])
    }
  })

  it('round-trips the new fields through JSON unchanged', () => {
    const c = defaultCampaign()
    c.lastPlayedDay = 20260923
    c.sessions = 3
    c.giftDay = 20260922
    c.creaturesMet = setBit(c.creaturesMet, 4)
    c.photos = ['a1', 'b2']
    expect(readCampaign(JSON.parse(JSON.stringify(c)))).toEqual(c)
  })
})
