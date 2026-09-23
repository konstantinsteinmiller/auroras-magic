// The front page's way on (owner, 2026-09-23).
//
// The front page is where the book lies open when nothing has opened it
// anywhere else — above all right after the very first duel, which a cold
// boot goes straight into. Its only way on was a folded corner, and the owner
// sat on the cover "forever" because he never saw it. What is pinned here:
//
//   • an untouched front page turns itself, after 8 s, to the page the player
//     is up to — her waiting gift's, or her next node's;
//   • ONCE a session: a player carried off the cover and back again is not
//     carried off a second time;
//   • never for a player who has turned a page by hand — she knows the way,
//     and the wardrobe lives on that page, so being there is her choice;
//   • a touch is not idleness: the clock waits for the page to be let alone.

import { beforeEach, describe, expect, it } from 'vitest'
import { S } from '@/game/duel/state'
import { defaultCampaign } from '@/game/campaign/state'
import { setBit } from '@/game/campaign/bitset'
import { nodeChapter } from '@/game/campaign/tables'
import {
  mapResize, updateMap, focusMap, mapPointerDown, mapPointerUp, showChapter, qaMap, __resetWayOn
} from '@/game/map/map'

const FRAME = 1 / 60
const run = (seconds: number): void => {
  for (let t = 0; t < seconds - 1e-9; t += FRAME) updateMap(FRAME)
}
/** Node `n` lives on this page of the book (the front page is 0). */
const pageOf = (n: number): number => nodeChapter(n) + 1

/** Open the book at its front page, the way the flow does after a duel
 *  that never focused it: no turn, nothing in flight. */
const onFrontPage = (): void => {
  qaMap.toPage(0)
  run(1)
  expect(qaMap.page()).toBe(0)
  expect(qaMap.turn()).toBeNull()
}

beforeEach(() => {
  S.campaign = defaultCampaign()
  // Node 0 won, its gift waiting — the player's first map.
  S.campaign.furthestNode = 0
  S.flow.scene = 'map'
  mapResize(1280, 720)
  focusMap(0)
  __resetWayOn()
})

describe('an untouched front page', () => {
  it('shows its way on, and turns itself to the waiting gift after 8 s', () => {
    onFrontPage()
    expect(qaMap.way().on).toBe(true)
    run(6.5)
    expect(qaMap.page()).toBe(0)
    run(1.6)
    expect(qaMap.page()).toBe(pageOf(0))
    expect(qaMap.way().autoUsed).toBe(true)
  })

  it('goes to the next node\'s page when no gift is waiting', () => {
    S.campaign.furthestNode = 6
    for (let n = 0; n <= 6; n++) S.campaign.sectorsDone = setBit(S.campaign.sectorsDone, n)
    onFrontPage()
    run(8.2)
    run(0.6)
    expect(qaMap.page()).toBe(pageOf(7))
  })

  it('does it once a session: back on the cover, it stays', () => {
    onFrontPage()
    run(8.8)
    expect(qaMap.page()).toBe(pageOf(0))
    onFrontPage()
    run(20)
    expect(qaMap.page()).toBe(0)
    // …though the swipe still shows her the way.
    expect(qaMap.way().on).toBe(true)
  })

  it('waits while a finger is on the page, and counts again from its release', () => {
    onFrontPage()
    run(7)
    mapPointerDown(400, 300, 0)
    run(3)
    expect(qaMap.page()).toBe(0)
    mapPointerUp(400, 300, 50)
    run(7)
    expect(qaMap.page()).toBe(0)
    run(1.8)
    expect(qaMap.page()).toBe(pageOf(0))
  })
})

describe('a player who has turned a page herself', () => {
  it('is never carried off the front page, and sees no swipe', () => {
    // A chapter tab is a turn by hand as much as a drag or a corner is.
    showChapter(0)
    run(1)
    showChapter(-1)
    run(1)
    expect(qaMap.page()).toBe(0)
    expect(qaMap.way().handTurned).toBe(true)
    expect(qaMap.way().on).toBe(false)
    run(20)
    expect(qaMap.page()).toBe(0)
  })
})

describe('anywhere but the map', () => {
  it('keeps no clock: the wardrobe and the duel are not the cover', () => {
    onFrontPage()
    S.flow.scene = 'wardrobe'
    run(20)
    expect(qaMap.page()).toBe(0)
    expect(qaMap.way().on).toBe(false)
    // Back on the map, it starts from nothing again.
    S.flow.scene = 'map'
    run(0.1)
    expect(qaMap.way().t).toBeLessThan(0.2)
  })
})
