// The duel VS preview's clock and hand-off (`src/game/preview/preview.ts`,
// owner 2026-09-25): five seconds in front of every duel. What must hold, and
// is easy to break by accident:
//
//   • EXACTLY FIVE SECONDS from the first frame the show runs to `then()` —
//     at 60, 144 or 30 Hz, and on a ragged frame clock;
//   • the beats come in their order, each written ONCE (the DOM restarts its
//     CSS animations off them — a beat written twice is an animation twice);
//   • the five seconds are the time the VS screen is ON SCREEN (the owner
//     timed it by eye): the page turn INTO it counts, nothing waits before
//     it starts, and a stutter never stretches it (`STEP_CAP`) — while a
//     paused frame (an ad, a hidden tab, a menu) advances NOTHING;
//   • the announcement fires on the first running frame, the ticks and the
//     go on their thresholds, each once;
//   • SKIP: never the session's first preview, never before 1 s, straight to
//     the exit, which still plays;
//   • `then` never runs twice, and never after the preview was left or
//     replaced;
//   • the flash rises through the exit and fades off the duel's first frames.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/game/duel/audio', async (orig) => ({
  ...(await orig<typeof import('@/game/duel/audio')>()),
  sfx: vi.fn(),
  duckMusic: vi.fn()
}))
vi.mock('@/use/useAnalytics', async (orig) => ({
  ...(await orig<typeof import('@/use/useAnalytics')>()),
  track: vi.fn()
}))

import { S } from '@/game/duel/state'
import { sfx, duckMusic } from '@/game/duel/audio'
import { track } from '@/use/useAnalytics'
import { gotoScene } from '@/game/flow/scene'
import { dipTo, __flushTransition } from '@/game/flow/transition'
import { acquireAppPause } from '@/use/useGamePause'
import { reducedMotion } from '@/use/useAccessibility'
import { previewHud, type PreviewBeat } from '@/game/preview/previewHud'
import {
  beginPreview, updatePreview, previewFrame, skipPreview, cancelPreview, previewQa, __resetPreview, pv,
  campaignSpec, versusSpec, beatAt, BEATS, PT_TOTAL, HANDOFF_AT, HANDOFF_LEAD, SKIP_FROM, SKIP_TO, AFTER_FADE, FLASH_PEAK_REDUCED,
  drawableMask, runesOfMask, STEP_CAP, type PreviewSpec
} from '@/game/preview/preview'
import { STARTING_RUNES } from '@/game/campaign/tables'
import { FIRST_UMBRA, guardianOf } from '@/game/duel/foes'

const spec = (): PreviewSpec => campaignSpec(3, STARTING_RUNES)

/** Frames of `dt` until `then` has run (or `max` frames); how many it took. */
const runUntilDone = (dt: number | (() => number), then: { mock: { calls: unknown[] } }, max = 5000): number => {
  let n = 0
  while (!then.mock.calls.length && n < max) {
    updatePreview(typeof dt === 'function' ? dt() : dt)
    previewFrame(0, false)
    n++
  }
  return n
}

beforeEach(() => {
  __resetPreview()
  __flushTransition()
  vi.clearAllMocks()
  reducedMotion.value = false
  S.w = 1280
  S.h = 720
  gotoScene('map')
})
afterEach(() => {
  __resetPreview()
})

describe('the timeline, as pure functions', () => {
  it('names the beat at every threshold, in order', () => {
    const order = BEATS.map(([b]) => b)
    expect(order).toEqual(['enter', 'ribbons', 'vs', 'powers', 'hold', 'count1', 'count2', 'count3', 'go', 'exit', 'done'])
    for (let i = 0; i < BEATS.length; i++) {
      const [b, at] = BEATS[i]!
      expect(beatAt(at)).toBe(b)
      if (i) expect(beatAt(at - 0.001)).toBe(BEATS[i - 1]![0])
    }
    expect(BEATS.at(-1)![1]).toBe(HANDOFF_AT)
    expect(HANDOFF_AT).toBeCloseTo(PT_TOTAL - HANDOFF_LEAD, 9)
    expect(PT_TOTAL).toBe(5)
  })

  it('reads the runes she can draw off the save, the two she starts with always among them', () => {
    expect(runesOfMask(drawableMask(0))).toEqual(runesOfMask(STARTING_RUNES))
    expect(runesOfMask(drawableMask(1 << 5))).toEqual(runesOfMask(STARTING_RUNES | (1 << 5)))
  })
})

describe('what it shows', () => {
  it('node 0: Umbra herself, her own epithet, her weakness — and no crown', () => {
    const s = campaignSpec(0, STARTING_RUNES)
    expect(s.foe).toBe(FIRST_UMBRA)
    expect(s.foeSide.name).toBe('duelist.umbra')
    expect(s.foeSide.epithet).toBe('preview.epithet.umbra')
    expect(s.foeSide.boss).toBe(false)
    expect(s.foeSide.chips.map((c) => c.kind)).toEqual(['weak'])
    expect(s.hero.name).toBe('duelist.aurora')
    expect(s.hero.runes).toEqual(runesOfMask(STARTING_RUNES))
    expect(s.chapter).toBe(0)
    expect(s.pos).toBe(0)
  })

  it('a Guardian: named for her place, crowned, her magic once it is in play', () => {
    const s = campaignSpec(4, STARTING_RUNES)
    expect(s.foe).toBe(guardianOf(0))
    expect(s.foeSide.epithet).toBe('preview.epithet.guardian')
    expect(s.foeSide.epithetArgs).toEqual({ place: 'chapter.c1' })
    expect(s.foeSide.boss).toBe(true)
    expect(s.foeSide.chips.map((c) => c.kind)).toEqual(['weak', 'magic'])
    expect(s.pos).toBe(4)
    // Chapter 1's standard foe (Umbra) before her chapter's magic is in play: the weakness alone.
    expect(campaignSpec(1, STARTING_RUNES).foeSide.chips.map((c) => c.kind)).toEqual(['weak'])
    expect(campaignSpec(1, STARTING_RUNES).foeSide.epithet).toBe('preview.epithet.umbra')
    // One of Umbra's friends (chapter 2's standard foe): "Umbra's friend".
    expect(campaignSpec(5, STARTING_RUNES).foeSide.epithet).toBe('preview.epithet.friend')
  })

  it('versus: player 1 and player 2, the same runes each, no chips', () => {
    const s = versusSpec(STARTING_RUNES | (1 << 5))
    expect(s.mode).toBe('versus')
    expect(s.hero.epithet).toBe('versus.player1')
    expect(s.foeSide.epithet).toBe('versus.player2')
    expect(s.foeSide.name).toBe('duelist.umbra')
    expect(s.foeSide.runes).toEqual(s.hero.runes)
    expect(s.foeSide.chips).toEqual([])
  })
})

describe('the clock', () => {
  for (const hz of [60, 144, 30]) {
    it(`hands over exactly ${HANDOFF_AT} s after its first frame (the duel up at ${PT_TOTAL} s) at ${hz} Hz`, () => {
      const then = vi.fn()
      beginPreview(spec(), then)
      expect(S.flow.scene).toBe('preview')
      // The first running frame starts the show and adds nothing.
      updatePreview(1 / hz)
      expect(pv.started).toBe(true)
      expect(pv.pt).toBe(0)
      const frames = runUntilDone(1 / hz, then)
      expect(then).toHaveBeenCalledTimes(1)
      // The first frame that REACHES the hand-off (4.85 s is 698.4 frames at 144 Hz).
      expect(frames).toBe(Math.ceil(HANDOFF_AT * hz - 1e-6))
    })
  }

  it('never lets a stutter stretch the show — and skips at most STEP_CAP of a background gap', () => {
    // The frame loop clamps its own step at 0.25 s; the preview is handed the
    // REAL frame time, so a 0.6 s stutter is 0.6 s of show, not 0.25 — the
    // owner timed the first version at 8 s because every stutter stretched it.
    const then = vi.fn()
    beginPreview(spec(), then)
    updatePreview(1 / 60)
    updatePreview(0.6)
    expect(pv.pt).toBeCloseTo(0.6, 6)
    // A tab back from the background hands over minutes: at most STEP_CAP.
    updatePreview(90)
    expect(pv.pt).toBeCloseTo(0.6 + STEP_CAP, 6)
    expect(then).not.toHaveBeenCalled()
    // …and the rest of the show is exactly what is left of the five seconds.
    const rest = runUntilDone(1 / 60, then)
    expect(then).toHaveBeenCalledTimes(1)
    expect(rest).toBe(Math.round((HANDOFF_AT - 0.6 - STEP_CAP) * 60))
  })

  it('hands over on the first frame that reaches five seconds, however ragged the frames', () => {
    const then = vi.fn()
    beginPreview(spec(), then)
    updatePreview(0.016)
    const steps = [0.016, 0.033, 0.007, 0.05, 0.016, 0.021]
    let i = 0
    let t = 0
    const dts: number[] = []
    runUntilDone(() => {
      const dt = steps[i++ % steps.length]!
      dts.push(dt)
      t += dt
      return dt
    }, then)
    expect(t).toBeGreaterThanOrEqual(HANDOFF_AT - 1e-6)
    expect(t - dts.at(-1)!).toBeLessThan(HANDOFF_AT)
  })

  it('writes each beat once, in order', () => {
    const seen: PreviewBeat[] = [previewHud.beat]
    const then = vi.fn()
    beginPreview(spec(), then)
    seen.length = 0
    seen.push(previewHud.beat)
    let last = previewHud.beat
    updatePreview(1 / 60)
    while (!then.mock.calls.length) {
      updatePreview(1 / 60)
      if (previewHud.beat !== last) {
        last = previewHud.beat
        seen.push(last)
      }
    }
    expect(seen).toEqual(BEATS.map(([b]) => b))
  })

  it('advances nothing on a paused frame', () => {
    const then = vi.fn()
    beginPreview(spec(), then)
    updatePreview(1 / 60)
    for (let i = 0; i < 60; i++) updatePreview(1 / 60)
    const at = pv.pt
    const release = acquireAppPause()
    for (let i = 0; i < 600; i++) updatePreview(1 / 60)
    expect(pv.pt).toBe(at)
    previewFrame(0, true)
    expect(previewHud.paused).toBe(true)
    release()
    previewFrame(0, false)
    expect(previewHud.paused).toBe(false)
    updatePreview(1 / 60)
    expect(pv.pt).toBeGreaterThan(at)
    expect(then).not.toHaveBeenCalled()
  })

  it('starts on its first frame on screen, mid-turn — the turn INTO it is part of the five seconds', () => {
    // A turn switches the scene at once and swings the old page away over
    // the new one: the preview is on screen from that frame, so its clock is.
    const then = vi.fn()
    dipTo(() => beginPreview(spec(), then), 0.45)
    __flushTransition()
    dipTo(() => {}, 0.45)
    updatePreview(1 / 60)
    expect(pv.started).toBe(true)
    expect(sfx).toHaveBeenCalledWith('duelCall')
    for (let i = 0; i < 12; i++) updatePreview(1 / 60)
    expect(pv.pt).toBeCloseTo(12 / 60, 6)
    __flushTransition()
  })

  it('announces itself on its first running frame and counts down, each cue once', () => {
    const then = vi.fn()
    beginPreview(spec(), then)
    updatePreview(1 / 60)
    expect(sfx).toHaveBeenCalledWith('duelCall')
    expect(duckMusic).toHaveBeenCalledWith(2.2)
    runUntilDone(1 / 60, then)
    const cues = vi.mocked(sfx).mock.calls.map((c) => c.join(':'))
    expect(cues).toEqual(['duelCall', 'vsTick:0', 'vsTick:1', 'vsTick:2', 'vsGo'])
  })

  it('flashes through the exit and fades the flash off the duel', () => {
    const then = vi.fn()
    beginPreview(spec(), then)
    updatePreview(1 / 60)
    let prev = 0
    while (!then.mock.calls.length) {
      updatePreview(1 / 60)
      if (pv.pt < SKIP_TO) expect(previewHud.flash).toBe(0)
      else {
        expect(previewHud.flash).toBeGreaterThanOrEqual(prev)
        prev = previewHud.flash
      }
    }
    expect(previewHud.flash).toBeCloseTo(1, 5)
    // …then down to nothing over the duel's first frames.
    let t = 0
    while (previewHud.flash > 0 && t < 2) {
      previewFrame(1 / 60, false)
      t += 1 / 60
    }
    expect(previewHud.flash).toBe(0)
    expect(t).toBeLessThanOrEqual(AFTER_FADE + 1 / 30)
  })

  it('is softer under reduced motion', () => {
    reducedMotion.value = true
    const then = vi.fn()
    beginPreview(spec(), then)
    updatePreview(1 / 60)
    runUntilDone(1 / 60, then)
    expect(previewHud.flash).toBeCloseTo(FLASH_PEAK_REDUCED, 5)
  })

  it('reports how it went', () => {
    const then = vi.fn()
    beginPreview(spec(), then)
    updatePreview(1 / 60)
    runUntilDone(1 / 60, then)
    expect(track).toHaveBeenCalledWith('duel_preview', { nodeId: 3, mode: 'campaign', skipped: false, shownMs: Math.round(HANDOFF_AT * 1000) })
  })
})

describe('skip', () => {
  const second = (): ReturnType<typeof vi.fn> => {
    // The session's first preview, played out.
    const first = vi.fn()
    beginPreview(spec(), first)
    updatePreview(1 / 60)
    runUntilDone(1 / 60, first)
    const then = vi.fn()
    beginPreview(spec(), then)
    updatePreview(1 / 60)
    return then
  }

  it('never skips the session\'s first preview', () => {
    const then = vi.fn()
    beginPreview(spec(), then)
    updatePreview(1 / 60)
    for (let i = 0; i < 120; i++) updatePreview(1 / 60)
    expect(previewHud.skippable).toBe(false)
    expect(skipPreview()).toBe(false)
    expect(pv.pt).toBeLessThan(SKIP_TO)
  })

  it('skips a later one from 1 s in — straight to the exit, which still plays', () => {
    const then = vi.fn()
    beginPreview(spec(), then)
    updatePreview(1 / 60)
    runUntilDone(1 / 60, then)
    vi.clearAllMocks()
    const next = vi.fn()
    beginPreview(spec(), next)
    updatePreview(1 / 60)
    for (let i = 0; i < 30; i++) updatePreview(1 / 60)
    expect(skipPreview()).toBe(false)
    expect(previewHud.skippable).toBe(false)
    while (pv.pt < SKIP_FROM) updatePreview(1 / 60)
    expect(previewHud.skippable).toBe(true)
    expect(skipPreview()).toBe(true)
    expect(pv.pt).toBe(SKIP_TO)
    expect(previewHud.beat).toBe('exit')
    expect(previewHud.skippable).toBe(false)
    // The music comes back up for the exit, with the stars' sting.
    expect(duckMusic).toHaveBeenCalledWith(0)
    expect(sfx).toHaveBeenCalledWith('vsGo')
    // A second press does nothing more.
    expect(skipPreview()).toBe(false)
    expect(next).not.toHaveBeenCalled()
    const frames = runUntilDone(1 / 60, next)
    expect(frames).toBe(Math.round((HANDOFF_AT - SKIP_TO) * 60))
    expect(track).toHaveBeenLastCalledWith('duel_preview', expect.objectContaining({ skipped: true }))
  })

  it('a later one skipped is not skippable again until the next', () => {
    const then = second()
    while (pv.pt < SKIP_FROM) updatePreview(1 / 60)
    skipPreview()
    runUntilDone(1 / 60, then)
    expect(then).toHaveBeenCalledTimes(1)
  })
})

describe('the hand-off', () => {
  it('runs `then` once, and never again', () => {
    const then = vi.fn()
    beginPreview(spec(), then)
    updatePreview(1 / 60)
    runUntilDone(1 / 60, then)
    for (let i = 0; i < 600; i++) updatePreview(1 / 60)
    expect(previewQa.finish()).toBe(false)
    expect(skipPreview(true)).toBe(false)
    expect(then).toHaveBeenCalledTimes(1)
    expect(previewHud.beat).toBe('done')
    expect(previewHud.live).toBe(false)
  })

  it('never runs it once the preview was left', () => {
    const then = vi.fn()
    beginPreview(spec(), then)
    updatePreview(1 / 60)
    for (let i = 0; i < 100; i++) updatePreview(1 / 60)
    // A harness jump, a queued page turn: the scene is taken away.
    gotoScene('map')
    previewFrame(1 / 60, false)
    expect(previewHud.live).toBe(false)
    for (let i = 0; i < 600; i++) updatePreview(1 / 60)
    expect(previewQa.finish()).toBe(false)
    expect(then).not.toHaveBeenCalled()
  })

  it('…even if it comes back to the scene without a new begin', () => {
    const then = vi.fn()
    beginPreview(spec(), then)
    updatePreview(1 / 60)
    cancelPreview()
    gotoScene('preview', 3)
    for (let i = 0; i < 600; i++) updatePreview(1 / 60)
    expect(then).not.toHaveBeenCalled()
  })

  it('a new begin replaces the old `then`', () => {
    const a = vi.fn()
    const b = vi.fn()
    beginPreview(spec(), a)
    updatePreview(1 / 60)
    beginPreview(spec(), b)
    updatePreview(1 / 60)
    runUntilDone(1 / 60, b)
    expect(a).not.toHaveBeenCalled()
    expect(b).toHaveBeenCalledTimes(1)
  })

  it('the QA seam: hold freezes the clock at a point, finish hands over at once without a flash', () => {
    const then = vi.fn()
    beginPreview(spec(), then)
    previewQa.hold(1.6)
    updatePreview(1 / 60)
    for (let i = 0; i < 600; i++) updatePreview(1 / 60)
    expect(pv.pt).toBeCloseTo(1.6, 6)
    previewFrame(0, false)
    expect(previewQa.state().held).toBe(true)
    expect(previewHud.paused).toBe(true)
    expect(previewHud.beat).toBe('powers')
    // Behind the clock: it jumps back.
    previewQa.hold(0.3)
    expect(pv.pt).toBeCloseTo(0.3, 6)
    expect(previewHud.beat).toBe('enter')
    previewQa.release()
    updatePreview(1 / 60)
    expect(pv.pt).toBeGreaterThan(0.3)
    expect(previewQa.finish()).toBe(true)
    expect(then).toHaveBeenCalledTimes(1)
    expect(previewHud.flash).toBe(0)
  })
})

describe('the DOM\'s pause mirror', () => {
  it('holds the DOM\'s animations until the clock runs, then runs them with it — a page turn included', () => {
    const then = vi.fn()
    dipTo(() => beginPreview(spec(), then), 0.45)
    __flushTransition()
    expect(previewHud.paused).toBe(true)
    dipTo(() => {}, 0.45)
    previewFrame(1 / 60, false)
    expect(previewHud.paused).toBe(true)
    // The first frame on screen starts the clock, turn or no turn, and the
    // DOM's animations run with it…
    updatePreview(1 / 60)
    previewFrame(1 / 60, false)
    expect(previewHud.paused).toBe(false)
    // …and a real pause still holds everything.
    previewFrame(1 / 60, true)
    expect(previewHud.paused).toBe(true)
    __flushTransition()
  })
})
