// The creature sticker album's page model (retention roadmap item 3).
//
// What is pinned here is the SHAPE of the page and where its met/unmet state
// comes from: a cell is met because a bit in the save says so, never because
// the map happened to animate a creature this session. The drawing itself is
// canvas work jsdom has no context for, so it is not asserted — but a cell
// that cannot be built at all (no creature on a sector) would show up as a
// missing cell here, which is the failure worth catching.

import { beforeEach, describe, expect, it } from 'vitest'
import { S } from '@/game/duel/state'
import { defaultCampaign, NODE_COUNT } from '@/game/campaign/state'
import { setBit } from '@/game/campaign/bitset'
import { CHAPTER_COUNT, NODES_PER_CHAPTER } from '@/game/campaign/tables'
import { sectorOf } from '@/game/map/sectors'
import { albumCount, albumPages, rescueNode, stickerMet, type Sticker } from '@/game/album/stickers'

const cellsOf = (kind: 'tap' | 'rescue'): Sticker[] =>
  albumPages().flatMap((p) => p.cells.filter((c) => c.kind === kind))

beforeEach(() => {
  S.campaign = defaultCampaign()
})

describe('the album page', () => {
  it('is one row per chapter, in chapter order', () => {
    const pages = albumPages()
    expect(pages).toHaveLength(CHAPTER_COUNT)
    expect(pages.map((p) => p.chapter)).toEqual([...Array(CHAPTER_COUNT).keys()])
  })

  it('holds one tap-creature cell per sector — all fifty', () => {
    const taps = cellsOf('tap')
    expect(taps).toHaveLength(NODE_COUNT)
    expect(taps.map((c) => c.node)).toEqual([...Array(NODE_COUNT).keys()])
  })

  it('holds one rescued friend per chapter that has one', () => {
    const rescues = cellsOf('rescue')
    // Chapter 10 has no rescue collectible — the finale IS the rescue — so the
    // 10-bit `rescued` mask is nine cells wide on the page, not ten. A tenth
    // appearing here means a chapter-10 rescue was authored and the album has
    // picked it up on its own, which is fine; a NINTH going missing is not.
    expect(rescues.length).toBeGreaterThanOrEqual(CHAPTER_COUNT - 1)
    for (const cell of rescues) {
      expect(sectorOf(cell.node).rescue).toBeTruthy()
      expect(Math.floor(cell.node / NODES_PER_CHAPTER)).toBe(cell.chapter)
    }
  })

  it('puts the chapter friend last in its row, after its five creatures', () => {
    for (const page of albumPages()) {
      const kinds = page.cells.map((c) => c.kind)
      const first = kinds.indexOf('rescue')
      if (first < 0) continue
      expect(first).toBe(kinds.length - 1)
      expect(kinds.filter((k) => k === 'rescue')).toHaveLength(1)
    }
  })

  it('rescueNode names a sector inside its own chapter, or nothing', () => {
    for (let c = 0; c < CHAPTER_COUNT; c++) {
      const n = rescueNode(c)
      if (n < 0) continue
      expect(Math.floor(n / NODES_PER_CHAPTER)).toBe(c)
      expect(sectorOf(n).rescue).toBeTruthy()
    }
  })

  it('every cell has a stable, unique key', () => {
    const keys = albumPages().flatMap((p) => p.cells.map((c) => c.key))
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('what a cell reads to know it has been collected', () => {
  it('a fresh save has met nothing at all', () => {
    for (const page of albumPages()) for (const cell of page.cells) expect(stickerMet(cell)).toBe(false)
    expect(albumCount().met).toBe(0)
  })

  it('a creature is met by its own bit in creaturesMet, and only its own', () => {
    S.campaign.creaturesMet = setBit(S.campaign.creaturesMet, 7)
    const taps = cellsOf('tap')
    expect(stickerMet(taps[7]!)).toBe(true)
    expect(stickerMet(taps[6]!)).toBe(false)
    expect(stickerMet(taps[8]!)).toBe(false)
    expect(albumCount().met).toBe(1)
  })

  it('a rescued friend is met by its CHAPTER bit in the rescued mask', () => {
    const friend = cellsOf('rescue').find((c) => c.chapter === 2)!
    expect(stickerMet(friend)).toBe(false)
    S.campaign.rescued = 1 << 2
    expect(stickerMet(friend)).toBe(true)
    // The chapter's own creatures are a different set of bits entirely.
    for (const cell of cellsOf('tap').filter((c) => c.chapter === 2)) expect(stickerMet(cell)).toBe(false)
  })

  it('counts every cell on the page, and only the met ones toward it', () => {
    const { total } = albumCount()
    expect(total).toBe(albumPages().reduce((n, p) => n + p.cells.length, 0))
    for (let n = 0; n < NODE_COUNT; n++) S.campaign.creaturesMet = setBit(S.campaign.creaturesMet, n)
    S.campaign.rescued = 0x3ff
    expect(albumCount().met).toBe(total)
  })

  it('reads a mangled bitset as "not met" rather than throwing', () => {
    // A blob a portal's cloud has chewed on. `%%%%` is not base64 at all, so
    // the bitset reader's own tolerance is what stands between a bad save and
    // an album that cannot be opened.
    S.campaign.creaturesMet = '%%%%'
    expect(() => albumCount()).not.toThrow()
    expect(albumCount().met).toBe(0)
  })
})
