// The daily gift (retention-roadmap.md item 5): one small present a local
// calendar day, and NEVER a streak.
//
// What is pinned here is the whole safety argument for it. There is one
// number in the save (`giftDay`) and it is a latch, not a counter — so the
// interesting cases are all about the device clock, which on a child's tablet
// is wrong more often than anybody likes: midnight, a clock that was fixed
// and jumped BACKWARDS, and a brand-new profile that has nothing to be given
// yet. None of them may cost the player anything, and none may hand out two
// gifts in one day.

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { S } from '@/game/duel/state'
import { defaultCampaign } from '@/game/campaign/state'
import { setBit, hasBit } from '@/game/campaign/bitset'
import { localDay } from '@/game/campaign/session'
import { creatureMet } from '@/game/campaign/controller'
import { LAST_BUILT_NODE } from '@/game/campaign/tables'
import { isBloomed } from '@/use/useDuelRewards'
import {
  dailyGift, offerDailyGift, openDailyGift, withdrawDailyGift, __resetDailyGift, __dailyPool
} from '@/game/map/dailyGift'

/** The device's clock, fixed where the test wants it. Only `Date` is faked:
 *  the save's own debounce still runs on real timers. */
const atDate = (y: number, m: number, d: number): void => {
  vi.setSystemTime(new Date(y, m - 1, d, 10, 30, 0))
}

/** A save with sectors 0..`upTo` restored and no blooms or creatures met. */
const restoredThrough = (upTo: number): void => {
  S.campaign = defaultCampaign()
  S.campaign.furthestNode = upTo
  for (let n = 0; n <= upTo; n++) S.campaign.sectorsDone = setBit(S.campaign.sectorsDone, n)
}

/** Mark every restored sector as already bloomed. */
const bloomAll = (): void => {
  for (let n = 0; n <= LAST_BUILT_NODE; n++) {
    if (hasBit(S.campaign.sectorsDone, n)) S.campaign.blooms = setBit(S.campaign.blooms, n)
  }
}

/** …and every creature met. */
const meetAll = (): void => {
  for (let n = 0; n <= LAST_BUILT_NODE; n++) {
    if (hasBit(S.campaign.sectorsDone, n)) S.campaign.creaturesMet = setBit(S.campaign.creaturesMet, n)
  }
}

const open = (): ReturnType<typeof openDailyGift> => openDailyGift(200, 300, 0)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  atDate(2026, 9, 23)
  __resetDailyGift()
  restoredThrough(4)
})
afterEach(() => { vi.useRealTimers() })

describe('when a gift is put out', () => {
  it('waits beside the node the book opens on', () => {
    offerDailyGift(0)
    // Five sectors restored, so the next duel is node 5 — the card a player
    // returning to the map is looking at.
    expect(dailyGift.node).toBe(5)
  })

  it('not twice in one day, once it has been taken', () => {
    offerDailyGift(0)
    expect(open()).toBe('bloom')
    expect(dailyGift.node).toBe(-1)
    offerDailyGift(0)
    expect(dailyGift.node).toBe(-1)
  })

  it('but a gift merely SEEN is still there tomorrow — the latch moves on the open, not on the offer', () => {
    offerDailyGift(0)
    expect(S.campaign.giftDay).toBe(0)
    withdrawDailyGift()
    offerDailyGift(0)
    expect(dailyGift.node).toBeGreaterThanOrEqual(0)
    expect(S.campaign.giftDay).toBe(0)
  })

  it('again the next day, and the day after — with nothing owed for the days between', () => {
    offerDailyGift(0)
    expect(open()).toBe('bloom')
    atDate(2026, 9, 24)
    offerDailyGift(0)
    expect(dailyGift.node).toBeGreaterThanOrEqual(0)
    expect(open()).toBe('bloom')
    // A fortnight away, and the next visit is the same one small gift.
    atDate(2026, 10, 8)
    offerDailyGift(0)
    expect(dailyGift.node).toBeGreaterThanOrEqual(0)
    expect(open()).toBe('bloom')
    expect(S.campaign.giftDay).toBe(20261008)
  })

  it('a clock that jumped BACKWARDS gives a gift rather than withholding one', () => {
    offerDailyGift(0)
    expect(open()).toBe('bloom')
    expect(S.campaign.giftDay).toBe(20260923)
    // The tablet's date was wrong and got fixed: yesterday, after today.
    atDate(2026, 9, 20)
    offerDailyGift(0)
    expect(dailyGift.node).toBeGreaterThanOrEqual(0)
    // …and reporting it never produces a negative gap (`daysBetweenDays`).
    expect(open()).toBe('bloom')
    expect(S.campaign.giftDay).toBe(localDay())
  })

  it('never before there is something to give', () => {
    S.campaign = defaultCampaign()
    offerDailyGift(0)
    expect(dailyGift.node).toBe(-1)
    expect(S.campaign.giftDay).toBe(0)
  })

  it('never when every bloom AND every sticker is already held', () => {
    bloomAll()
    meetAll()
    offerDailyGift(0)
    expect(dailyGift.node).toBe(-1)
  })
})

describe('what it gives', () => {
  it('a bloom on a restored, unbloomed sector', () => {
    offerDailyGift(0)
    expect(open()).toBe('bloom')
    let blooms = 0
    for (let n = 0; n <= 4; n++) if (isBloomed(n)) blooms++
    expect(blooms).toBe(1)
  })

  it('only ever a sector that is restored and not bloomed already', () => {
    S.campaign.blooms = setBit(S.campaign.blooms, 0)
    S.campaign.blooms = setBit(S.campaign.blooms, 1)
    expect(__dailyPool('bloom', 0)).toEqual([2, 3, 4])
  })

  it('a STICKER once there is no unbloomed sector left', () => {
    bloomAll()
    offerDailyGift(0)
    expect(open()).toBe('sticker')
    let met = 0
    for (let n = 0; n <= 4; n++) if (creatureMet(n)) met++
    expect(met).toBe(1)
    // …with the game's own reveal beat: a sparkle on that sector and one line.
    expect(dailyGift.celebrate).toBeGreaterThanOrEqual(0)
    expect(dailyGift.say).toBe('daily.stickerToast')
  })

  it('a sticker only from a sector that is restored and unmet', () => {
    bloomAll()
    S.campaign.creaturesMet = setBit(S.campaign.creaturesMet, 0)
    expect(__dailyPool('sticker', 0)).toEqual([1, 2, 3, 4])
  })

  it('nothing at all on a second tap', () => {
    offerDailyGift(0)
    expect(open()).toBe('bloom')
    expect(open()).toBeNull()
  })

  it('prefers a sector on the page in view, so the child sees it happen', () => {
    restoredThrough(9)
    expect(__dailyPool('bloom', 1)).toEqual([5, 6, 7, 8, 9])
    expect(__dailyPool('bloom', 0)).toEqual([0, 1, 2, 3, 4])
    // A chapter with nothing to give falls back to the whole book rather than
    // to no gift.
    expect(__dailyPool('bloom', 7)).toHaveLength(10)
  })
})
