// The one-way Step-1 → schema-2 migration (story-spec §4.7): never crash on
// the old shape, merge what S1 already wrote, and drop the currency (D3).

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => {
  localStorage.clear()
  vi.resetModules()
})
afterEach(async () => {
  const { flushPersist } = await import('@/use/useGameState')
  flushPersist()
  localStorage.clear()
})

const boot = async () => {
  const gs = await import('@/use/useGameState')
  const { migrateToSchema2 } = await import('@/game/campaign/migrate')
  const { readCampaign } = await import('@/game/campaign/state')
  const bits = await import('@/game/campaign/bitset')
  const { comboEnumerationIndex } = await import('@/game/duel/config')
  return { ...gs, migrateToSchema2, readCampaign, ...bits, comboEnumerationIndex }
}

describe('migrateToSchema2', () => {
  it('stamps a fresh profile schema 2 with the four single runes known', async () => {
    const m = await boot()
    m.migrateToSchema2()
    expect(m.getState('am_schema', 0)).toBe(2)
    const cs = m.readCampaign(m.getState('am_campaign', null))
    for (const r of [0, 1, 2, 3]) expect(m.hasBit(cs.combosSeen, r)).toBe(true)
    expect(m.hasBit(cs.combosSeen, 4)).toBe(false)
    // Known at the migration = not "new" in the spellbook.
    expect(cs.combosViewed).toBe(cs.combosSeen)
    expect(cs.furthestNode).toBe(-1)
  })

  it('drops the coins and ranks, and folds the old discoveries in', async () => {
    const m = await boot()
    m.setStates({ am_coins: 900, am_upgrades: [1, 2, 0, 0], am_ladder: 3, am_spells_seen: { '03': 1, '122': 1, 'x': 1, '45': 1 } })
    m.migrateToSchema2()
    expect(m.getState('am_coins', 'gone')).toBe('gone')
    expect(m.getState('am_upgrades', 'gone')).toBe('gone')
    expect(m.getState('am_spells_seen', 'gone')).toBe('gone')
    // The ladder is frozen, never turned into campaign progress (F24).
    expect(m.getState('am_ladder', 0)).toBe(3)
    const cs = m.readCampaign(m.getState('am_campaign', null))
    expect(cs.furthestNode).toBe(-1)
    expect(m.hasBit(cs.combosSeen, m.comboEnumerationIndex([0, 3]))).toBe(true)
    expect(m.hasBit(cs.combosSeen, m.comboEnumerationIndex([1, 2, 2]))).toBe(true)
    // '45' is not a Step-1 key (ids 0–3 only): ignored, not misread as [4, 5].
    expect(m.hasBit(cs.combosSeen, m.comboEnumerationIndex([4, 5]))).toBe(false)
  })

  it('MERGES into an S1 campaign rather than overwriting it', async () => {
    const m = await boot()
    const done = m.setBit(m.emptyBitset(50), 0)
    m.setStates({ am_campaign: { furthestNode: 0, sectorsDone: done, paintPicks: m.emptyBitset(100) } })
    m.migrateToSchema2()
    const cs = m.readCampaign(m.getState('am_campaign', null))
    expect(cs.furthestNode).toBe(0)
    expect(m.hasBit(cs.sectorsDone, 0)).toBe(true)
  })

  it('is idempotent: a second run changes nothing', async () => {
    const m = await boot()
    m.migrateToSchema2()
    const before = JSON.stringify(m.getState('am_campaign', null))
    m.setStates({ am_coins: 5 }) // a stray write after the migration
    m.migrateToSchema2()
    expect(JSON.stringify(m.getState('am_campaign', null))).toBe(before)
    expect(m.getState('am_coins', 0)).toBe(5)
  })

  it('never throws on junk', async () => {
    const m = await boot()
    m.setStates({ am_campaign: 'not an object', am_spells_seen: 42 })
    expect(() => m.migrateToSchema2()).not.toThrow()
    expect(m.readCampaign(m.getState('am_campaign', null)).furthestNode).toBe(-1)
  })
})
