// The adaptive quality controller (retention-roadmap item 17).
//
// The tier itself is taste; two things about it are not, and they are what
// this file exists to pin:
//
//   1. A DEVICE THAT CANNOT HOLD THE FRAME NEVER ENTERS TIER 2. Not for a
//      frame, not on a lucky lull, not from below. And it leaves the moment
//      the frame slows, without waiting for a dwell.
//   2. NOTHING POPS. Every renderer reads `S.qx`, never `S.q > 1`, and `qx`
//      may not move more than one ramp-step per frame in either direction —
//      so the grass grows in and the glow widens instead of arriving between
//      two frames.
//
// A third thing is worth a test because it was the whole reason the
// controller needed a second signal: tier 2 must be reachable on a 60 Hz
// display, where the frame INTERVAL is 16.7 ms however fast the device is.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const tracked: { tier: unknown; fdt: unknown }[] = []
vi.mock('@/use/useAnalytics', () => ({
  track: (name: string, props: Record<string, unknown>) => {
    if (name === 'quality_tier') tracked.push(props as { tier: unknown; fdt: unknown })
  }
}))

import { S } from '@/game/duel/state'
import { reducedMotion } from '@/use/useAccessibility'
import {
  stepQuality, __resetQuality, SPARKLE_DWELL, SPARKLE_ENTER, SPARKLE_RAMP
} from '@/game/duel/quality'

/** A 60 Hz frame: the interval a vsync-capped display reports no matter how
 *  much headroom the device has. */
const HZ60 = 1 / 60

/** Run `n` frames of a device whose every frame costs `work` seconds. */
const run = (n: number, work: number, raw = HZ60): void => {
  for (let i = 0; i < n; i++) stepQuality(raw, work, raw)
}

/** Frames of a fast device until the tier flips, so a test can look at the
 *  instant it happened without hard-coding how long the smoother takes. */
const climb = (): void => {
  for (let i = 0; i < 2000 && S.q < 2; i++) stepQuality(HZ60, 0.0009, HZ60)
  expect(S.q).toBe(2)
}

beforeEach(() => {
  __resetQuality()
  reducedMotion.value = false
  tracked.length = 0
})

describe('tier 2 is earned, on the only signal that can see headroom', () => {
  it('a strong device on a 60 Hz panel reaches it — the interval never could', () => {
    // 0.9 ms of work inside a 16.7 ms frame: eight tenths of the budget spare,
    // and an interval that reads exactly the same as a device with none.
    run(SPARKLE_DWELL + 60, 0.0009)
    expect(S.q).toBe(2)
    // The pre-tier-2 rule on its own would have said "no headroom here".
    expect(S.fdt).toBeGreaterThan(0.015)
  })

  it('takes at least the full dwell, so a lull between two casts cannot buy it', () => {
    // At least: the smoother has to walk `fw` down from its seed to the line
    // before the counter even starts, which is exactly the caution wanted.
    run(SPARKLE_DWELL - 1, 0.0009)
    expect(S.q).toBe(1)
    run(240, 0.0009)
    expect(S.q).toBe(2)
  })

  it('a device sitting right at the entry line never climbs', () => {
    run(SPARKLE_DWELL * 3, SPARKLE_ENTER + 0.0001)
    expect(S.q).toBe(1)
  })
})

describe('a device that cannot hold the frame never enters tier 2', () => {
  it('a 12 ms frame is refused however long it runs', () => {
    run(SPARKLE_DWELL * 4, 0.012)
    expect(S.q).toBe(1)
  })

  it('an almost-qualifying device that keeps stumbling never accumulates', () => {
    // 179 cheap frames, then one that blows the budget — forever. The dwell
    // counter must reset on the bad frame rather than remembering the run
    // before it, and the smoothed average must not be allowed to hide it.
    for (let i = 0; i < 12; i++) {
      run(SPARKLE_DWELL - 1, 0.0009)
      run(1, 0.02)
      expect(S.q).toBe(1)
    }
  })

  it('slipping frames veto the tier even when the CPU side looks cheap', () => {
    // The work is trivial; the interval says the loop is missing vsync anyway
    // — GPU backpressure, which no CPU-side number can see.
    run(SPARKLE_DWELL * 3, 0.0009, 0.0225)
    expect(S.q).toBe(1)
  })

  it('leaves within three frames once frames overrun, with no dwell of its own', () => {
    climb()
    let n = 0
    while (S.q > 1 && n++ < 10) stepQuality(HZ60, 0.02, HZ60)
    expect(S.q).toBe(1)
    expect(n).toBeLessThanOrEqual(3)
  })

  it('leaves at once when the smoothed work crosses the line', () => {
    climb()
    // Not one overrun frame — a device that has simply got busier. No frame
    // here trips the per-frame check; the average is what takes the tier.
    run(60, 0.0098)
    expect(S.q).toBe(1)
  })

  it('survives an isolated stall, so the tier does not breathe all session', () => {
    // Measured on a real desktop: one GC-sized frame every fifteen seconds
    // used to drop the tier and start the three-second climb again. A stall
    // is forgiven inside a second and a bit, so anything rarer than that is
    // a hiccup and the tier rides it out; three inside that window is not,
    // and the test above proves those still take it.
    climb()
    for (let i = 0; i < 30; i++) {
      run(119, 0.0009)
      stepQuality(HZ60, 0.05, HZ60)
    }
    expect(S.q).toBe(2)
    expect(S.qx).toBe(1)
  })

  it('a 144 Hz device with no room left is refused, at a work figure a 60 Hz '
    + 'device would have been given the tier for', () => {
    // 5 ms of work is a third of a 60 Hz frame and three quarters of a 144 Hz
    // one. The threshold is read against the budget this display actually has.
    run(600, 0.005, 1 / 144)
    expect(S.q).toBe(1)
    __resetQuality()
    run(600, 0.005, HZ60)
    expect(S.q).toBe(2)
  })

  it('is never a rescue: a device in thrift climbs through 1, never past it', () => {
    run(120, 0.03, 0.04)
    expect(S.q).toBe(0)
    // The first qualifying frames start tier 1's dwell, not tier 2's — and the
    // tier that appears at the end of it is 1. (The smoother has to walk the
    // dip out of both averages before the count even begins.)
    run(SPARKLE_DWELL + 40, 0.0009)
    expect(S.q).toBe(1)
    climb()
  })

  it('reduced motion holds at the authored look', () => {
    reducedMotion.value = true
    run(SPARKLE_DWELL * 3, 0.0009)
    expect(S.q).toBe(1)
    expect(S.qx).toBe(0)
  })

  it('reduced motion turned on mid-duel ramps the sparkle back out', () => {
    run(SPARKLE_DWELL + 200, 0.0009)
    expect(S.qx).toBe(1)
    reducedMotion.value = true
    stepQuality(HZ60, 0.0009, HZ60)
    expect(S.q).toBe(1)
    expect(S.qx).toBeLessThan(1)
    run(200, 0.0009)
    expect(S.qx).toBe(0)
  })
})

describe('the restore to the authored look', () => {
  // The bug this pass found: the old rule asked the frame INTERVAL whether
  // there was room, and on a 60 Hz panel the interval is 16.7 ms whatever the
  // device is doing — so a session that dipped once during boot spent the rest
  // of its life in thrift. These pin that it cannot happen again.
  const bootDip = (): void => {
    run(60, 0.05, 0.05)
    expect(S.q).toBe(0)
  }

  it('a 60 Hz device with the budget to spare comes back', () => {
    bootDip()
    run(SPARKLE_DWELL + 60, 0.0009)
    expect(S.q).toBeGreaterThanOrEqual(1)
    expect(S.fdt).toBeGreaterThan(0.015) // the old rule would still say no
  })

  it('a device that genuinely cannot afford the authored look stays down', () => {
    bootDip()
    run(SPARKLE_DWELL * 4, 0.014)
    expect(S.q).toBe(0)
  })

  it('is rationed, so a struggling device settles instead of breathing', () => {
    // Fall over, come back, fall over… Past the ration the controller stops
    // offering, and the session stays in thrift rather than flickering.
    for (let i = 0; i < 5; i++) {
      run(60, 0.05, 0.05)
      run(SPARKLE_DWELL + 60, 0.0009)
    }
    run(60, 0.05, 0.05)
    run(SPARKLE_DWELL * 3, 0.0009)
    expect(S.q).toBe(0)
  })
})

describe('nothing pops', () => {
  it('the mix never moves more than one ramp-step in a frame, either way', () => {
    const step = HZ60 / SPARKLE_RAMP
    let prev = S.qx
    const watch = (n: number, work: number, raw = HZ60): void => {
      for (let i = 0; i < n; i++) {
        stepQuality(raw, work, raw)
        expect(Math.abs(S.qx - prev)).toBeLessThanOrEqual(step + 1e-9)
        prev = S.qx
      }
    }
    watch(SPARKLE_DWELL + 260, 0.0009) // all the way in
    expect(S.qx).toBe(1)
    watch(300, 0.02) // …and all the way back out
    expect(S.qx).toBe(0)
  })

  it('the tier arrives before the look does — a full ramp, not a frame', () => {
    climb()
    expect(S.qx).toBeLessThan(0.02) // flipped this very frame
    run(Math.ceil(SPARKLE_RAMP * 60) - 3, 0.0009)
    expect(S.qx).toBeLessThan(1)
    run(5, 0.0009)
    expect(S.qx).toBe(1)
  })

  it('the mix stays inside 0..1 whatever the frames do', () => {
    for (let i = 0; i < 2000; i++) {
      stepQuality(HZ60, i % 7 === 0 ? 0.03 : 0.0009, HZ60)
      expect(S.qx).toBeGreaterThanOrEqual(0)
      expect(S.qx).toBeLessThanOrEqual(1)
    }
  })
})

describe('the analytics event', () => {
  it('fires once per tier the session settles on, never per frame', () => {
    run(SPARKLE_DWELL + 400, 0.0009)
    expect(tracked.map(t => t.tier)).toEqual([1, 2])
    run(400, 0.02)
    expect(tracked.map(t => t.tier)).toEqual([1, 2, 1])
  })

  it('carries the frame time that decided it', () => {
    run(200, 0.0009)
    expect(tracked).toHaveLength(1)
    expect(tracked[0]!.fdt).toBeCloseTo(HZ60, 3)
  })

  it('does not report a tier the controller only passed through', () => {
    // A handful of frames at 2, then straight back down: 30 frames of hold
    // are required before a tier counts as somewhere the session settled.
    climb()
    run(5, 0.0009)
    run(3, 0.02)
    expect(S.q).toBe(1)
    expect(tracked.map(t => t.tier)).toEqual([1])
  })
})
