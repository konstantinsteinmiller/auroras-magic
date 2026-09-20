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
import { turnAngle, turnWidth, turnEase } from '@/game/flow/pageTurn'
import { flowHud } from '@/use/useFlow'

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
})
