// The duel's cached backdrop (`game/duel/backdrop.ts`).
//
// A cache can fail two ways, and both are silent on screen for a while:
//   1. STALE — something it holds changed and it kept blitting the old
//      picture (a spell's cleared patch that never shows, a sky that stops
//      following the score, a painting that never replaces its drawing).
//   2. USELESS — it recomposes every frame, so the frame pays for the live
//      backdrop AND a blit. The whole point is that a quiet frame is ONE blit.
// This pins both, by counting how often the backdrop is composed.
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Hoisted with the mocks: `backdrop.ts` subscribes to both events at import.
const h = vi.hoisted(() => ({
  calls: { sky: 0, wash: 0, isle: 0, page: 0, below: 0 },
  pageVersion: 0,
  islandPainted: true,
  artListener: null as (() => void) | null,
  resetListener: null as (() => void) | null
}))
const calls = h.calls

vi.mock('@/game/duel/arena', () => ({
  drawSky: () => { calls.sky++ },
  drawSkyWash: () => { calls.wash++ },
  drawIsland: () => { calls.isle++ },
  islandIsPainting: () => h.islandPainted
}))
vi.mock('@/game/duel/duelPage', () => ({
  drawDuelPage: () => { calls.page++; return true },
  drawDuelPageBelow: () => { calls.below++; return true },
  duelPageVersion: () => h.pageVersion,
  onDuelPageReset: (fn: () => void) => { h.resetListener = fn }
}))
vi.mock('@/game/art', () => ({
  onArtChanged: (fn: () => void) => { h.artListener = fn; return () => {} }
}))

/** A 2D context that records nothing and draws nothing. */
const fakeCtx = (): CanvasRenderingContext2D => {
  const noop = (): void => {}
  return new Proxy({ drawn: 0 } as unknown as CanvasRenderingContext2D, {
    get: (t, k) => (k in t ? (t as never)[k] : k === 'drawImage' ? () => { (t as { drawn: number }).drawn++ } : noop),
    set: () => true
  })
}
HTMLCanvasElement.prototype.getContext = (() => fakeCtx()) as never

import { S } from '@/game/duel/state'
import { applyLayout } from '@/game/duel/layout'
import { drawBackdrop, drawBackdropPad, releaseBackdrop } from '@/game/duel/backdrop'

const frame = (g: CanvasRenderingContext2D, t: number, foot = 900): void => {
  if (S.portrait) drawBackdropPad(g, t, foot)
  drawBackdrop(g, t, foot)
}
const composes = (): number => calls.sky
const blits = (g: CanvasRenderingContext2D): number => (g as unknown as { drawn: number }).drawn

beforeEach(() => {
  for (const k of Object.keys(calls) as (keyof typeof calls)[]) calls[k] = 0
  h.pageVersion = 0
  h.islandPainted = true
  releaseBackdrop()
  applyLayout(914, 411, 1.75)
  S.q = 0
  S.sky = 0.5
  S.theme = 0
  S.versus = false
})

describe('a quiet frame is one blit', () => {
  it('composes once, then only blits while nothing changes', () => {
    const g = fakeCtx()
    frame(g, 10)
    expect(composes()).toBe(1)
    for (let i = 1; i <= 30; i++) frame(g, 10)
    expect(composes()).toBe(1)
    expect(blits(g)).toBe(31)
  })

  it('does not follow the damped sky by less than a 64th', () => {
    const g = fakeCtx()
    S.sky = 0.5
    frame(g, 10)
    for (let i = 0; i < 20; i++) {
      S.sky += 0.0002
      frame(g, 10)
    }
    expect(composes()).toBe(1)
  })

  it('in portrait, the pad and the stage are one composition per frame', () => {
    applyLayout(411, 914, 1.75)
    const g = fakeCtx()
    frame(g, 10)
    frame(g, 10)
    expect(composes()).toBe(1)
    expect(calls.below).toBe(1)
    expect(blits(g)).toBe(4)
  })
})

describe('never stale', () => {
  it('re-composes when a spell marks the page', () => {
    const g = fakeCtx()
    frame(g, 10)
    h.pageVersion++
    frame(g, 10)
    expect(composes()).toBe(2)
  })

  it('follows the sky once it has moved a 64th', () => {
    const g = fakeCtx()
    frame(g, 10)
    S.sky += 1 / 50
    frame(g, 10)
    expect(composes()).toBe(2)
  })

  it('follows the clouds one device pixel at a time', () => {
    const g = fakeCtx()
    // The clouds drift 7 stage units a second; at rest scale k that is 7k
    // device px. Start mid-pixel, move a fifth of one, then a whole one.
    const pxAt = (px: number): number => px / (7 * S.vs * S.dpr)
    frame(g, pxAt(100.5))
    frame(g, pxAt(100.7))
    const before = composes()
    frame(g, pxAt(101.5))
    expect(before).toBe(1)
    expect(composes()).toBe(2)
  })

  it('re-composes when a painting arrives, the theme changes or the layout does', () => {
    const g = fakeCtx()
    frame(g, 10)
    h.artListener?.()
    frame(g, 10)
    S.theme = 3
    frame(g, 10)
    applyLayout(1280, 720, 1)
    frame(g, 10)
    expect(composes()).toBe(4)
  })

  it('lets go of the picture when the page resets', () => {
    const g = fakeCtx()
    frame(g, 10)
    h.resetListener?.()
    frame(g, 10)
    expect(composes()).toBe(2)
  })
})

describe('what stays live', () => {
  it('the drawn island sways, so it is drawn over the blit every frame', () => {
    h.islandPainted = false
    const g = fakeCtx()
    for (let i = 0; i < 5; i++) frame(g, 10)
    expect(composes()).toBe(1)
    expect(calls.isle).toBe(5)
  })

  it('the painted island is still, so it is in the cache', () => {
    const g = fakeCtx()
    for (let i = 0; i < 5; i++) frame(g, 10)
    expect(calls.isle).toBe(1)
  })

  it('a device off the thrift tier draws everything live, every frame', () => {
    S.q = 1
    const g = fakeCtx()
    for (let i = 0; i < 5; i++) frame(g, 10)
    expect(composes()).toBe(5)
    expect(calls.page).toBe(5)
    expect(blits(g)).toBe(0)
  })
})
