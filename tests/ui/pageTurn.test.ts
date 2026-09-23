// The storybook's page turn (story-spec §8.28).
//
// The turn is the one transition in the game: every scene change, every story
// beat and every chapter of the map goes through it. Two things about it are
// load-bearing and easy to break:
//
//   • the SWAP still happens even when nothing draws. The scene switch rides
//     on the turn's first drawn frame (that is where the snapshot is taken),
//     so a frame that never draws — a hidden tab, a headless harness, a
//     browser that refuses the snapshot — must still run it, or the flow
//     stalls on a page nobody is turning;
//   • the chrome steps aside for it. Every scene's buttons are DOM over the
//     one canvas, and the turn swings a picture of the canvas alone.

import { describe, expect, it, beforeEach, vi } from 'vitest'
import { dipTo, fading, stepTransition, __flushTransition, DIP_PAGE } from '@/game/flow/transition'
import { turnAngle, turnWidth, turnEase, turnSlices } from '@/game/flow/pageTurn'
import { openOverlay } from '@/game/flow/scene'
import { flowHud } from '@/use/useFlow'
import { S } from '@/game/duel/state'

describe('the page, as it turns', () => {
  it('starts flat and ends edge-on, and never goes back on itself', () => {
    expect(turnWidth(0)).toBeCloseTo(1)
    expect(turnWidth(1)).toBeCloseTo(0)
    expect(turnAngle(0)).toBeCloseTo(0)
    expect(turnAngle(1)).toBeCloseTo(Math.PI / 2)
    let last = 1.0001
    for (let p = 0; p <= 1.0001; p += 0.05) {
      const w = turnWidth(p)
      expect(w).toBeLessThanOrEqual(last)
      last = w
    }
    // Slow at first, then away.
    expect(turnEase(0.25)).toBeLessThan(0.25)
    expect(turnEase(0.75)).toBeGreaterThan(0.75)
  })

  // THE FAR EDGE IS SHORTER. This is the whole difference between a page
  // turning and a page being squeezed, and it went unnoticed through two
  // rounds of "make it look 3D" because a squeeze and a turn have exactly the
  // same silhouette WIDTH — only the height gives it away.
  it('leans away: the free edge is shorter than the spine edge', () => {
    const s = turnSlices(0, 0, 800, 500, turnAngle(0.5))
    const first = s[0]!
    const last = s[s.length - 1]!
    expect(last.dh).toBeLessThan(first.dh * 0.9)
    // …and it shortens about the page's middle, not from the top.
    expect(first.dy + first.dh / 2).toBeCloseTo(last.dy + last.dh / 2, 3)
  })

  it('lies flat at rest: full height, full width, nothing warped', () => {
    const s = turnSlices(0, 0, 800, 500, 0)
    for (const q of s) expect(q.dh).toBeCloseTo(500, 3)
    expect(s[0]!.dx).toBeCloseTo(0, 3)
    expect(s[s.length - 1]!.dx + s[s.length - 1]!.dw - 1).toBeCloseTo(800, 3)
  })

  it('never tears, doubles back, or spills past its own rect', () => {
    for (const p of [0.15, 0.35, 0.5, 0.65, 0.85]) {
      const s = turnSlices(40, 10, 800, 500, turnAngle(p))
      let prev = -Infinity
      for (const q of s) {
        // Strips march one way only — a strip that starts left of the one
        // before it is a fold in the paper the projection never asked for.
        expect(q.dx).toBeGreaterThanOrEqual(prev - 1e-6)
        prev = q.dx
        expect(q.dw).toBeGreaterThan(0)
        // A hair OVER full height is correct, not a bug: the paper bows
        // toward the reader, and what is nearer is bigger. A couple of per
        // cent is the bow; more than that would be the projection inverting.
        expect(q.dh).toBeLessThanOrEqual(500 * 1.02)
        expect(q.dx).toBeGreaterThanOrEqual(40 - 1e-6)
        expect(q.dx + q.dw - 1).toBeLessThanOrEqual(40 + 800 + 1e-6)
      }
    }
  })
})

describe('the turn between scenes', () => {
  beforeEach(() => { __flushTransition() })

  it('holds input, hides the chrome, and swaps exactly once', () => {
    const swap = vi.fn()
    dipTo(swap, DIP_PAGE)
    expect(fading()).toBe(true)
    expect(flowHud.turning).toBe(true)
    expect(swap).not.toHaveBeenCalled()
    // Nothing draws (a hidden tab, a harness): the swap must still land.
    stepTransition(DIP_PAGE * 0.6)
    expect(swap).toHaveBeenCalledTimes(1)
    stepTransition(DIP_PAGE)
    expect(swap).toHaveBeenCalledTimes(1)
    expect(fading()).toBe(false)
    expect(flowHud.turning).toBe(false)
  })

  it('queues a second turn instead of dropping it', () => {
    const first = vi.fn()
    const second = vi.fn()
    dipTo(first)
    dipTo(second)
    expect(first).not.toHaveBeenCalled()
    __flushTransition()
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)
    expect(fading()).toBe(false)
    expect(flowHud.turning).toBe(false)
  })

  it('finishes whatever is in flight when a harness flushes it', () => {
    const swap = vi.fn()
    dipTo(swap)
    __flushTransition()
    expect(swap).toHaveBeenCalledTimes(1)
    expect(fading()).toBe(false)
  })

  // THE FREEZE (§8.32). An overlay holds the game paused, and the turn's
  // clock is only spent while the game runs. The turn also hides every scrap
  // of DOM chrome — including that overlay's own close button. Leave one open
  // across a turn and the player is holding the only key to a door that is
  // now on the other side of the wall: the owner hit exactly this by opening
  // the spellbook as the foe died.
  it('shuts whatever was standing on the page', () => {
    openOverlay('spellbook')
    expect(S.flow.overlay).toBe('spellbook')
    dipTo(vi.fn())
    expect(S.flow.overlay).toBeNull()
    expect(flowHud.overlay).toBeNull()
    __flushTransition()
  })

  it('shuts it for a turn that had to queue, too', () => {
    dipTo(vi.fn())
    openOverlay('options')
    dipTo(vi.fn())
    expect(S.flow.overlay).toBeNull()
    expect(flowHud.overlay).toBeNull()
    __flushTransition()
  })
})
