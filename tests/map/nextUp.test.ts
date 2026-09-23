// The "next up" peek after a restore (retention-roadmap.md item 6).
//
// The moment a sector turns to colour is the moment most likely to end a
// session, so the book shows where the story goes next. Everything worth
// pinning about it is a restraint rather than an effect: it must be silent at
// the finale (there is nothing after node 49 to point at), it must end on its
// own, and the first touch on the book must take it away — "nothing that
// blocks input; a child who taps through it must not be fighting a camera".

import { beforeEach, describe, expect, it } from 'vitest'
import { S } from '@/game/duel/state'
import { defaultCampaign } from '@/game/campaign/state'
import { setBit } from '@/game/campaign/bitset'
import { LAST_BUILT_NODE, FINALE_NODE, nodeChapter } from '@/game/campaign/tables'
import {
  mapResize, updateMap, focusMap, peekNextUp, peekingNextUp, mapPointerDown, showChapter, qaMap
} from '@/game/map/map'

const FRAME = 1 / 60
const run = (seconds: number): void => {
  for (let t = 0; t < seconds - 1e-9; t += FRAME) updateMap(FRAME)
}
/** The peek waits this long on the restored sector before it moves. */
const HOLD = 0.8
/** Node `n` lives on this page of the book (the front page is 0). */
const pageOf = (n: number): number => nodeChapter(n) + 1

beforeEach(() => {
  S.campaign = defaultCampaign()
  S.campaign.furthestNode = 20
  for (let n = 0; n <= 20; n++) S.campaign.sectorsDone = setBit(S.campaign.sectorsDone, n)
  mapResize(1280, 720)
})

describe('the peek after a restore', () => {
  it('points at the node after the one just restored', () => {
    focusMap(4)
    peekNextUp(4)
    expect(peekingNextUp()).toBe(5)
  })

  it('says nothing at the finale — there is no next node', () => {
    focusMap(FINALE_NODE)
    peekNextUp(FINALE_NODE)
    expect(peekingNextUp()).toBe(-1)
    run(2)
    expect(qaMap.page()).toBe(pageOf(FINALE_NODE))
  })

  it('says nothing past the last built node either', () => {
    peekNextUp(LAST_BUILT_NODE)
    expect(peekingNextUp()).toBe(-1)
  })

  it('opens the next chapter’s page when the next node is on one', () => {
    // Node 4 is chapter 1’s boss; node 5 opens chapter 2, a page over.
    focusMap(4)
    expect(qaMap.page()).toBe(pageOf(4))
    peekNextUp(4)
    // It holds a beat on the sector that was just restored…
    run(HOLD * 0.5)
    expect(qaMap.page()).toBe(pageOf(4))
    // …and then turns.
    run(HOLD)
    expect(qaMap.page()).toBe(pageOf(5))
  })

  it('does not turn a page when the next node is the next card along', () => {
    focusMap(1)
    peekNextUp(1)
    run(HOLD + 0.5)
    expect(qaMap.page()).toBe(pageOf(1))
    expect(qaMap.page()).toBe(pageOf(2))
  })

  it('ends on its own, without anybody tapping anything', () => {
    focusMap(1)
    peekNextUp(1)
    expect(peekingNextUp()).toBe(2)
    run(4)
    expect(peekingNextUp()).toBe(-1)
  })

  it('is taken away by the first touch on the book, before it moves anything', () => {
    focusMap(4)
    peekNextUp(4)
    run(HOLD * 0.5)
    mapPointerDown(400, 300, 0)
    expect(peekingNextUp()).toBe(-1)
    run(2)
    // The page the player was looking at is the page they still have.
    expect(qaMap.page()).toBe(pageOf(4))
  })

  it('is taken away by a chapter tab, too', () => {
    focusMap(4)
    peekNextUp(4)
    showChapter(0)
    expect(peekingNextUp()).toBe(-1)
  })
})
