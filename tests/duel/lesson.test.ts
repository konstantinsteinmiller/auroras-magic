// The first duel's lesson (`game/duel/lesson.ts`), the locked-shape card and
// the rune chips' window — the three answers to the 2026-09-24 blind playtest,
// where every tester drew only the triangle, cast after every rune, and was
// told "no rune" for a circle.
//
// The lesson is pinned the way a child meets it, through the sim's own entry
// points (`strokeEnd`, `cast`, `updateSim`), never by poking its state:
//   triangle → cast shut → square guide → a wrong shape is not stored →
//   square stored → exactly 2 s of lightbox → cast open → the first cast is
//   the two-rune spell → and the foe held from the first frame to that cast.
import { beforeEach, describe, expect, it } from 'vitest'
import { S, load } from '@/game/duel/state'
import { EARTH, FIRE, NO_EASE, PH_DUEL, WATER } from '@/game/duel/config'
import { cast, castSide, lastPlayerCast, resetDuel, strokeEnd, updateSim } from '@/game/duel/sim'
import {
  CHIP_NODES, LESSON, LIGHTBOX_S, SQUARE_TRIES, STORED_S, castInvite, chipsDue, guideRune, lessonCastOpen, lockedHint
} from '@/game/duel/lesson'
import { afk, AFK_S } from '@/game/duel/director'
import { ALL_RUNES_MASK, recognise, recogniseLocked } from '@/game/duel/runes'
import { STARTING_RUNES } from '@/game/campaign/tables'
import { defaultCampaign } from '@/game/campaign/state'
import { __resetAnalytics, analyticsLog } from '@/use/useAnalytics'
import { getState } from '@/use/useGameState'
import { ONBOARDED_KEY } from '@/keys'
import { hud, syncHud } from '@/use/useDuelHud'
import { DRAWN, JUNK, junkDraw, realize, sloppy, stream } from './rune-draws'

const DT = 1 / 120
const step = (secs: number): void => {
  const n = Math.round(secs / DT)
  for (let i = 0; i < n; i++) updateSim(DT)
}

/** A clean stroke of rune `slug`, as a finger would report it. */
const shape = (slug: string, rot = 0): number[] =>
  realize(DRAWN[slug]!(stream(7)), { rotDeg: rot, sx: 120, sy: 120, jitterAmp: 0 }, stream(11))
const LINE = JUNK['straight swipe']!()
/** A circle, once round — a WATER bubble (an under-drawn one is a Rainbow arc). */
const CIRCLE = realize(
  Array.from({ length: 129 }, (_, k) => [Math.cos((k / 128) * Math.PI * 2), Math.sin((k / 128) * Math.PI * 2)]).flat(),
  { sx: 120, sy: 120 }, stream(3)
)

/** Lift a finger that drew `pts` (straight into the buffer, as the harnesses do). */
const draw = (pts: readonly number[]): void => {
  S.draw = 1
  S.pts.length = 0
  S.pts.push(...pts)
  strokeEnd()
}

const events = (): string[] => analyticsLog().map((r) => r.event)
const popped = (k: string): boolean => S.pops.some((p) => p.k === k)

/** A brand-new player on node 0, first time: the onboarding flag is on. */
const freshDuel = (): void => {
  S.campaign = defaultCampaign()
  S.intro = 1
  S.wins = S.losses = 0
  S.pops.length = 0
  resetDuel({ foe: 0, usesMagic: false, lossStreak: 0, ease: NO_EASE })
}

/** Is the foe doing anything at all? */
const foeStill = (): boolean => S.equeue.length === 0 && S.eForm === 0 && !S.shots.some((s) => s.dir < 0)

beforeEach(() => {
  __resetAnalytics()
})

describe('the first duel\'s lesson', () => {
  it('teaches the triangle, then the square, then the stack — and only then the cast', () => {
    freshDuel()
    expect(S.introStep).toBe(LESSON.TRIANGLE)
    expect(guideRune()).toBe(FIRE)

    // A: the square first is not what the guide shows — refused, gently.
    draw(shape('earth'))
    expect(S.queue).toEqual([])
    expect(popped('tryTriangle')).toBe(true)
    expect(popped('notARune')).toBe(false)

    // …the triangle is stored, and the cast stays SHUT: every path is `castSide`.
    draw(shape('fire'))
    expect(S.queue).toEqual([FIRE])
    expect(S.introStep).toBe(LESSON.STORED)
    cast()
    castSide(false)
    expect(S.queue).toEqual([FIRE])
    expect(S.shots.length).toBe(0)
    expect(lessonCastOpen()).toBe(false)

    // "STORED! UP TO 3" reads, then B: the square's guide.
    step(STORED_S + 0.05)
    expect(S.introStep).toBe(LESSON.SQUARE)
    expect(guideRune()).toBe(EARTH)
    expect(events()).toContain('tutorial_square_shown')

    // The triangle again is NOT stored; neither is junk. Each is a nudge.
    S.pops.length = 0
    draw(shape('fire', 40))
    expect(S.queue).toEqual([FIRE])
    expect(popped('trySquare')).toBe(true)
    draw(LINE)
    expect(S.queue).toEqual([FIRE])
    cast()
    expect(S.queue).toEqual([FIRE])
    expect(S.shots.length).toBe(0)

    // The square lands in the SECOND slot.
    draw(shape('earth', 20))
    expect(S.queue).toEqual([FIRE, EARTH])
    expect(S.introStep).toBe(LESSON.LIGHTBOX)
    expect(events()).toEqual(expect.arrayContaining(['tutorial_square_done', 'tutorial_lightbox']))

    // C: the lightbox is EXACTLY two seconds, and the cast is shut through it.
    for (let i = 0; i < Math.round(LIGHTBOX_S / DT) - 1; i++) updateSim(DT)
    expect(S.introStep).toBe(LESSON.LIGHTBOX)
    cast()
    expect(S.queue).toEqual([FIRE, EARTH])
    updateSim(DT)
    expect(S.introStep).toBe(LESSON.CAST)
    expect(lessonCastOpen()).toBe(true)
    expect(events()).toContain('tutorial_cast_ready')

    // D: a stroke now is not stored (the first cast must be the two-rune
    // spell) — it re-invites the cast button instead.
    const inv = castInvite()
    draw(shape('fire'))
    expect(S.queue).toEqual([FIRE, EARTH])
    expect(castInvite()).toBeGreaterThan(inv)

    // The first cast is Fire + Earth, and it ends the lesson.
    cast()
    expect(S.shots.length).toBe(1)
    expect(lastPlayerCast()).toMatchObject({ key: '0.3', count: 2 })
    expect(S.intro).toBe(0)
    expect(S.introStep).toBe(LESSON.DONE)
  })

  it('holds the foe from the first frame to the first cast — and wakes her after it', () => {
    freshDuel()
    step(6)
    expect(foeStill()).toBe(true)
    draw(shape('fire'))
    step(STORED_S + 10)
    expect(foeStill()).toBe(true)
    draw(shape('earth'))
    step(LIGHTBOX_S + 12)
    expect(S.introStep).toBe(LESSON.CAST)
    expect(foeStill()).toBe(true)
    // …and the AFK rule has not been running underneath the lesson: she walks
    // into the fight with the mercy floor under her.
    expect(afk()).toBe(false)
    cast()
    expect(S.intro).toBe(0)
    step(4)
    expect(S.equeue.length > 0 || S.eForm > 0, 'the foe wakes after the first cast').toBe(true)
    expect(S.phase).toBe(PH_DUEL)
  })

  it('the AFK rule still works once the lesson is over', () => {
    freshDuel()
    draw(shape('fire'))
    step(STORED_S + 0.1)
    draw(shape('earth'))
    step(LIGHTBOX_S + 0.1)
    cast()
    step(AFK_S + 0.5)
    expect(afk()).toBe(true)
  })

  it('never deadlocks: a pause resumes where it was, a hand emptied under it starts over', () => {
    freshDuel()
    draw(shape('fire'))
    step(STORED_S + 0.1)
    draw(shape('earth'))
    // A pause is simply the sim not stepping: half the lightbox, a "pause",
    // then the other half — still exactly two seconds of lightbox in all.
    step(1)
    expect(S.introStep).toBe(LESSON.LIGHTBOX)
    step(1)
    expect(S.introStep).toBe(LESSON.CAST)
    // Anything that ever empties her slots mid-lesson sends it back to A
    // rather than waiting for a stroke it could no longer take.
    freshDuel()
    draw(shape('fire'))
    step(STORED_S + 0.1)
    S.queue.length = 0
    step(DT)
    expect(S.introStep).toBe(LESSON.TRIANGLE)
    draw(shape('fire'))
    expect(S.queue).toEqual([FIRE])
  })

  it('lets a child who cannot manage the square through, on the triangle, after a few tries', () => {
    freshDuel()
    draw(shape('fire'))
    step(STORED_S + 0.1)
    for (let i = 0; i < SQUARE_TRIES - 1; i++) draw(LINE)
    expect(S.introStep).toBe(LESSON.SQUARE)
    draw(LINE)
    expect(S.introStep).toBe(LESSON.CAST)
    expect(events()).toContain('tutorial_square_skipped')
    cast()
    expect(lastPlayerCast()).toMatchObject({ count: 1 })
    expect(S.intro).toBe(0)
  })

  it('a new duel starts an unfinished lesson over from the triangle', () => {
    freshDuel()
    draw(shape('fire'))
    step(STORED_S + 0.1)
    expect(S.introStep).toBe(LESSON.SQUARE)
    // Leave (or lose) and come back: the slots are empty, so the lesson is too.
    resetDuel({ foe: 0, usesMagic: false, lossStreak: 0, ease: NO_EASE })
    expect(S.introStep).toBe(LESSON.TRIANGLE)
    expect(S.queue).toEqual([])
  })

  it('runs once: the first cast saves it off, and a returning save or a replay never sees it', () => {
    freshDuel()
    draw(shape('fire'))
    step(STORED_S + 0.1)
    draw(shape('earth'))
    step(LIGHTBOX_S + 0.1)
    cast()
    expect(Number(getState(ONBOARDED_KEY, 0))).toBe(1)
    load()
    expect(S.intro).toBe(0)
    // The next duel (a replay of node 0, or any other): one rune, cast at once.
    resetDuel({ foe: 0, usesMagic: false, lossStreak: 0, ease: NO_EASE })
    expect(lessonCastOpen()).toBe(true)
    expect(guideRune()).toBe(-1)
    draw(shape('fire'))
    expect(S.queue).toEqual([FIRE])
    cast()
    expect(S.queue).toEqual([])
    expect(S.shots.length).toBe(1)
  })
})

describe('a shape she has not earned yet', () => {
  it('is named — icon, lock, "coming soon" — and nothing is stored', () => {
    freshDuel()
    S.intro = 0
    resetDuel({ foe: 0, usesMagic: false, lossStreak: 0, ease: NO_EASE })
    S.pops.length = 0
    draw(CIRCLE)
    expect(S.queue).toEqual([])
    expect(lockedHint()).toMatchObject({ rune: WATER })
    expect(popped('notARune')).toBe(false)
    expect(analyticsLog().find((r) => r.event === 'locked_rune')?.props).toMatchObject({ rune: WATER })
    // The card has a life of its own and goes — on the app's clock (`S.t`,
    // which stops with a pause), like the callouts.
    S.t += 2.2
    expect(lockedHint()).toBe(null)
  })

  it('is not claimed for junk, and a rune she owns is never named as locked', () => {
    freshDuel()
    S.intro = 0
    resetDuel({ foe: 0, usesMagic: false, lossStreak: 0, ease: NO_EASE })
    S.pops.length = 0
    draw(LINE)
    expect(lockedHint()).toBe(null)
    expect(popped('notARune')).toBe(true)
    draw(shape('fire'))
    expect(S.queue).toEqual([FIRE])
    expect(lockedHint()).toBe(null)
  })

  it('clears the SAME bar an owned rune does: the full alphabet would have stored it', () => {
    // Every stroke her runes refuse — sloppy draws of every rune, and junk —
    // is only ever named as a locked rune when the recogniser over ALL twelve
    // runes reads it as exactly that rune. No lower bar, no new false accepts.
    const rnd = stream(424242)
    const own = STARTING_RUNES
    let named = 0
    let refused = 0
    const strokes: number[][] = []
    for (const slug of Object.keys(DRAWN)) for (let i = 0; i < 40; i++) strokes.push(sloppy(slug, rnd))
    for (const name of Object.keys(JUNK)) for (let i = 0; i < 40; i++) strokes.push(junkDraw(name, rnd))
    for (const p of strokes) {
      if (recognise(p, own) >= 0) continue
      refused++
      const r = recogniseLocked(p, own)
      if (r < 0) continue
      named++
      expect(recognise(p, ALL_RUNES_MASK)).toBe(r)
      expect(((own >> r) & 1) === 0).toBe(true)
    }
    // Not vacuous: plenty were refused, and the circle-like ones were named.
    expect(refused).toBeGreaterThan(200)
    expect(named).toBeGreaterThan(40)
  })

  it('never names a triangle or a square drawn too badly to store as some locked rune', () => {
    // Sloppier than the recogniser's own corpus (twice the jitter, wilder
    // aspect), so that some ARE refused: that is the near-miss nudge's case,
    // and a child reaching for a shape she owns must never be told that a
    // different one is "coming soon". Measured: 35 refused, 0 named.
    const rnd = stream(5)
    let refused = 0
    let named = 0
    for (const slug of ['fire', 'earth']) {
      for (let i = 0; i < 2000; i++) {
        const size = 45 + rnd() * 215
        const p = realize(DRAWN[slug]!(rnd), { rotDeg: rnd() * 360, sx: size, sy: size * (0.5 + rnd() * 1.4), jitterAmp: 6 + rnd() * 10 }, rnd)
        if (recognise(p, STARTING_RUNES) >= 0) continue
        refused++
        if (recogniseLocked(p, STARTING_RUNES) >= 0) named++
      }
    }
    expect(refused, 'not vacuous: some must be refused').toBeGreaterThan(10)
    expect(named).toBe(0)
  })
})

describe('the rune chips', () => {
  it('show on chapter 1\'s first three duels, first play only', () => {
    expect(CHIP_NODES).toBe(3)
    expect(chipsDue(0, -1)).toBe(true)
    expect(chipsDue(1, 0)).toBe(true)
    expect(chipsDue(2, 1)).toBe(true)
    expect(chipsDue(3, 2)).toBe(false)
    // A replay of a node already won is not a first few duels.
    expect(chipsDue(0, 0)).toBe(false)
    expect(chipsDue(2, 5)).toBe(false)
    // Not a campaign node at all (versus).
    expect(chipsDue(-1, -1)).toBe(false)
  })

  it('carry her KNOWN runes, and stay off while the lesson is teaching', () => {
    freshDuel()
    S.flow = { ...S.flow, scene: 'duel', node: 0, mode: 'campaign' }
    syncHud(0)
    expect(hud.chips).toBe(0)
    S.intro = 0
    syncHud(0)
    expect(hud.chips).toBe(STARTING_RUNES)
    // Node 1, with the Ice rune node 0's chest gave: three chips.
    S.flow = { ...S.flow, node: 1 }
    S.campaign.furthestNode = 0
    S.campaign.runesUnlocked = (1 << 2) >>> 0
    syncHud(0)
    expect(hud.chips).toBe((STARTING_RUNES | (1 << 2)) >>> 0)
    // Node 3: past the window.
    S.flow = { ...S.flow, node: 3 }
    S.campaign.furthestNode = 2
    syncHud(0)
    expect(hud.chips).toBe(0)
    S.flow = { ...S.flow, mode: 'campaign', node: -1 }
    S.campaign = defaultCampaign()
  })
})
