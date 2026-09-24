// The canvas resolution controller (`game/renderScale.ts`).
//
// A fidelity cut that fires on the wrong device is worse than none: it is
// stored, so a strong machine blurred by one bad second stays blurred on
// every boot after. So what this file pins is mostly what must NOT happen:
//
//   1. A device holding its frame is never touched — nor one that is only
//      slow in bursts (a boot stall, a bake), nor one still at tier 1.
//   2. Frames that are no evidence (paused, hidden, a new scene settling)
//      never count.
//   3. A drop is one jump sized from the shortfall, never below the floor,
//      and it is remembered for the next boot.
//   4. The cap only goes DOWN live; a session that holds full speed earns the
//      NEXT boot one notch back.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const tracked: Record<string, unknown>[] = []
vi.mock('@/use/useAnalytics', () => ({
  track: (name: string, props: Record<string, unknown>) => {
    if (name === 'render_scale') tracked.push(props)
  }
}))

import { S } from '@/game/duel/state'
import {
  stepRenderScale, backingDpr, renderCap, __resetRenderScale, CEIL, FLOOR, SETTLE, WINDOW, EARN
} from '@/game/renderScale'

const KEY = 'am.renderCap'
const HZ60 = 1 / 60

/** `secs` of frames at interval `raw`; true if any of them dropped the cap. */
const run = (secs: number, raw: number, measuring = true, scene = 'duel'): boolean => {
  let dropped = false
  for (let t = 0; t < secs; t += raw) if (stepRenderScale(raw, measuring, scene)) dropped = true
  return dropped
}

beforeEach(() => {
  localStorage.clear()
  tracked.length = 0
  Object.defineProperty(window, 'devicePixelRatio', { value: 1.75, configurable: true })
  __resetRenderScale(CEIL)
  S.q = 0
  // Enter the scene and let it settle, as a real session does.
  run(SETTLE + 0.1, HZ60)
})

describe('who is left alone', () => {
  it('a device holding 60 fps keeps its full resolution', () => {
    expect(run(30, HZ60)).toBe(false)
    expect(backingDpr()).toBe(1.75)
  })

  it('a steady 30 fps is not a device that needs pixels taken away', () => {
    expect(run(30, 1 / 30)).toBe(false)
    expect(backingDpr()).toBe(1.75)
  })

  it('a slow device still at tier 1 loses its cheap cuts first, not its pixels', () => {
    S.q = 1
    expect(run(10, 0.2)).toBe(false)
    expect(renderCap()).toBe(CEIL)
  })

  it('one slow window between fast ones is a stall, not a device', () => {
    for (let i = 0; i < 5; i++) {
      run(WINDOW, 0.2)
      run(WINDOW * 2, HZ60)
    }
    expect(renderCap()).toBe(CEIL)
    expect(tracked).toHaveLength(0)
  })

  it('never counts a paused or hidden frame', () => {
    expect(run(20, 0.25, false)).toBe(false)
    expect(renderCap()).toBe(CEIL)
  })

  it('never counts the frames right after a scene changes', () => {
    // Just under the settle, then a new scene settles all over again.
    run(SETTLE - 0.2, 0.2, true, 'map')
    run(SETTLE - 0.2, 0.2, true, 'duel')
    expect(renderCap()).toBe(CEIL)
  })
})

describe('the drop', () => {
  it('a 5 fps device drops in one jump, sized from its shortfall', () => {
    expect(run(WINDOW * 2 + 0.3, 0.2)).toBe(true)
    // 1.75 × √(33.3 / 200) ≈ 0.71: the area shrinks by the whole shortfall.
    expect(backingDpr()).toBeCloseTo(0.71, 2)
    expect(localStorage.getItem(KEY)).toBe(String(renderCap()))
    expect(tracked).toEqual([{ cap: renderCap(), from: 1.75, medianMs: 200 }])
  })

  it('a device just over the line still moves by at least one notch', () => {
    run(WINDOW * 2 + 0.3, 0.05)
    expect(backingDpr()).toBeLessThanOrEqual(1.75 / 1.2 + 1e-9)
    expect(backingDpr()).toBeGreaterThan(1.3)
  })

  it('never goes below the floor, however slow the device', () => {
    for (let i = 0; i < 6; i++) run(SETTLE + WINDOW * 2 + 0.3, 0.5)
    expect(renderCap()).toBe(FLOOR)
    expect(run(20, 0.5)).toBe(false)
  })

  it('does not drop again while the resize it caused is settling', () => {
    run(WINDOW * 2 + 0.3, 0.2)
    const after = renderCap()
    expect(run(SETTLE - 0.1, 0.4)).toBe(false)
    expect(renderCap()).toBe(after)
  })

  it('a later boot starts at the cap this one settled on', () => {
    run(WINDOW * 2 + 0.3, 0.2)
    const learned = renderCap()
    __resetRenderScale()
    expect(renderCap()).toBe(learned)
  })

  it('ignores a stored cap that is out of range or not a number', () => {
    for (const bad of ['abc', '0.1', '9', '']) {
      localStorage.setItem(KEY, bad)
      __resetRenderScale()
      expect(renderCap()).toBe(CEIL)
    }
  })
})

describe('earning it back', () => {
  it('the cap never rises during the session it dropped in', () => {
    run(WINDOW * 2 + 0.3, 0.2)
    const low = renderCap()
    run(EARN * 2, HZ60)
    expect(renderCap()).toBe(low)
  })

  it('a session that holds full speed stores one notch sharper for the next boot', () => {
    __resetRenderScale(1)
    localStorage.setItem(KEY, '1')
    run(SETTLE + 0.1, HZ60)
    run(EARN + WINDOW * 2, HZ60)
    expect(renderCap()).toBe(1)
    expect(Number(localStorage.getItem(KEY))).toBeCloseTo(1.2, 5)
  })

  it('a slow window resets the count', () => {
    __resetRenderScale(1)
    localStorage.setItem(KEY, '1')
    run(SETTLE + 0.1, HZ60)
    run(EARN - 2, HZ60)
    run(WINDOW, 0.03)
    run(EARN - 2, HZ60)
    expect(localStorage.getItem(KEY)).toBe('1')
  })
})
