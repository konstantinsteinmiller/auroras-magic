// The first duel's two lessons (`game/duel/lesson.ts`), the locked-shape card
// and the rune chips' window — the answers to the 2026-09-24 blind playtests.
// Run 2's finding: all four testers learned the square as an INGREDIENT, never
// as the SHIELD, and all four said the foe's hits came "from nowhere". So the
// first lesson is now the block, the second the two-rune combo.
//
// The lessons are pinned the way a child meets them, through the sim's own
// entry points (`strokeEnd`, `cast`, `updateSim`), never by poking their state:
//   LESSON 1  the foe forges a spell at Aurora and holds it at its last moment
//             → only the square is stored → cast → the wall rises → the held
//             spell is let go into it → BLOCKED, and she is untouched
//   LESSON 2  triangle → square → exactly 2 s of lightbox → cast → the combo
//             (Fire + Earth = Magma Shard), through the forge
// and the foe held from her release to lesson 2's cast.
import { beforeEach, describe, expect, it } from 'vitest'
import { S, load, save } from '@/game/duel/state'
import { EARTH, FIRE, MAX_RUNES, NO_EASE, PH_DUEL, WATER } from '@/game/duel/config'
import { cast, castSide, lastPlayerCast, resetDuel, strokeEnd, updateSim } from '@/game/duel/sim'
import { FORGE_S, WARD_FORGE_S } from '@/game/duel/forge'
import {
  BLOCKED_S, CHIP_NODES, FOE_HAND, HOLD_AT, LESSON, LIGHTBOX_S, SQUARE_TRIES, STORED_S, TRIES, WAIT_MAX, WALL_BEAT,
  castInvite, chipsCaptionDue, chipsDue, guideFlare, guideRune, lessonCastOpen, lockedHint
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
/** Step until `pred` holds (or `cap` seconds pass); returns the seconds taken. */
const until = (pred: () => boolean, cap = 20): number => {
  let t = 0
  while (!pred() && t < cap) {
    updateSim(DT)
    t += DT
  }
  return t
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
const propsOf = (ev: string): Record<string, unknown> | undefined => analyticsLog().find((r) => r.event === ev)?.props
const popped = (k: string): boolean => S.pops.some((p) => p.k === k)
/** The foe's spells in the air. */
const hers = (): number => S.shots.filter((s) => s.dir < 0).length

/** A brand-new player on node 0, first time: the onboarding flag is on. */
const freshDuel = (): void => {
  S.campaign = defaultCampaign()
  S.intro = 1
  S.wins = S.losses = 0
  S.pops.length = 0
  S.versus = false
  // …and saved as such: the save layer outlives a test.
  save()
  resetDuel({ foe: 0, usesMagic: false, lossStreak: 0, ease: NO_EASE })
}

/** Lesson 1 played through as a child plays it, up to lesson 2's triangle. */
const passLesson1 = (): void => {
  draw(shape('earth'))
  cast()
  until(() => S.introStep === LESSON.BLOCKED)
  until(() => S.introStep === LESSON.TRIANGLE)
}

beforeEach(() => {
  __resetAnalytics()
})

describe('lesson 1: the block', () => {
  it('the foe forges a spell at Aurora through her own slots — and holds it at its last moment', () => {
    freshDuel()
    expect(S.introStep).toBe(LESSON.BLOCK)
    expect(guideRune(), 'the square traces itself on the pad').toBe(EARTH)
    expect(events()).toContain('tutorial_block_shown')
    // Her hand fills, rune by rune, in her own slots…
    until(() => S.equeue.length >= 1)
    expect(S.equeue[0]).toBe(FOE_HAND[0])
    // …and she casts it: the runes leave her slots into her forge (§8.37).
    until(() => S.eForge.t >= 0)
    expect([...S.eForge.q]).toEqual([...FOE_HAND])
    expect(S.equeue.length).toBe(0)
    // HELD at its last moment, however long the child takes. No time pressure.
    step(20)
    expect(S.eForge.t).toBeCloseTo(FORGE_S - HOLD_AT, 6)
    expect(hers()).toBe(0)
    expect(S.hp).toBe(S.hpMax)
    expect(S.phase).toBe(PH_DUEL)
  })

  it('stores only the square; the cast stays shut until it is in her hand', () => {
    freshDuel()
    S.pops.length = 0
    draw(shape('fire'))
    expect(S.queue).toEqual([])
    expect(popped('trySquare')).toBe(true)
    expect(popped('notARune')).toBe(false)
    draw(LINE)
    expect(S.queue).toEqual([])
    expect(lessonCastOpen()).toBe(false)
    // A tap on the empty cast button: refused as 'empty' — and the guide
    // flares all the same (the POLISH shake's partner on the pad).
    const t0 = S.t
    cast()
    expect(S.castRefusedWhy).toBe('empty')
    expect(guideFlare(t0)).toBeGreaterThan(0.9)
    draw(shape('earth', 20))
    expect(S.queue).toEqual([EARTH])
    expect(S.introStep).toBe(LESSON.BLOCK_CAST)
    expect(lessonCastOpen()).toBe(true)
    expect(propsOf('tutorial_block_square')).toMatchObject({ helped: false })
    // A stroke now is not stored: the hand is the lesson's. The button invites.
    const inv = castInvite()
    draw(shape('earth'))
    expect(S.queue).toEqual([EARTH])
    expect(castInvite()).toBeGreaterThan(inv)
  })

  it('cast → the wall rises → the held spell is let go into it → BLOCKED, and she is untouched', () => {
    freshDuel()
    until(() => S.eForge.t >= FORGE_S - HOLD_AT - 1e-6)
    draw(shape('earth'))
    cast()
    // Her cast is the Earth Wall, through the forge like every cast.
    expect(S.introStep).toBe(LESSON.BLOCK_WAIT)
    expect([...S.forge.q]).toEqual([EARTH])
    expect(events()).toContain('tutorial_block_cast')
    // The foe waits while her wall forges — a ward's 0.4 s, the snap-up the
    // fight itself has now (§8.37), not the 1.5 s of a spell that hits.
    step(WARD_FORGE_S - 0.1)
    expect(S.guard).toBe(0)
    expect(S.eForge.t).toBeGreaterThan(0)
    expect(hers()).toBe(0)
    // The wall is up at 0.4 s; WALL_BEAT later the foe's forge runs out and her spell leaves.
    const rose = until(() => S.guard > 0)
    expect(rose).toBeLessThanOrEqual(0.1 + DT)
    expect(S.guardK).toBe(1)
    expect(S.eForge.t, 'her spell is still held at the horn').toBeCloseTo(FORGE_S - HOLD_AT, 6)
    until(() => hers() > 0, WALL_BEAT + HOLD_AT + 0.2)
    expect(hers()).toBe(1)
    // …and it breaks on the wall — which is still standing when it lands.
    let wallAtBlock = -1
    until(() => {
      if (popped('blocked') && wallAtBlock < 0) wallAtBlock = S.guard
      return S.introStep === LESSON.BLOCKED
    })
    expect(S.introStep).toBe(LESSON.BLOCKED)
    expect(wallAtBlock).toBeGreaterThan(0)
    expect(S.hp).toBe(S.hpMax)
    expect(hers()).toBe(0)
    expect(events()).toContain('tutorial_block_done')
    // The celebration (on the sim's clock, which the block's hit-stop holds
    // for a moment), then lesson 2.
    expect(guideRune()).toBe(-1)
    const cheer = until(() => S.introStep !== LESSON.BLOCKED)
    expect(cheer).toBeGreaterThanOrEqual(BLOCKED_S - DT)
    expect(cheer).toBeLessThan(BLOCKED_S + 0.3)
    expect(S.introStep).toBe(LESSON.TRIANGLE)
    expect(guideRune()).toBe(FIRE)
  })

  it('a quick child: the wall can be up before the foe has even finished her hand', () => {
    freshDuel()
    draw(shape('earth'))
    cast()
    until(() => S.introStep === LESSON.BLOCKED, 15)
    expect(S.introStep).toBe(LESSON.BLOCKED)
    expect(S.hp).toBe(S.hpMax)
  })
})

describe('lesson 2: the combo', () => {
  it('triangle → square → exactly 2 s of lightbox → cast → Fire + Earth, forged', () => {
    freshDuel()
    passLesson1()
    expect(S.introStep).toBe(LESSON.TRIANGLE)
    // The square first is not what the guide shows — refused, gently.
    S.pops.length = 0
    draw(shape('earth'))
    expect(S.queue).toEqual([])
    expect(popped('tryTriangle')).toBe(true)
    // The triangle is stored, and the cast stays SHUT: every path is `castSide`.
    draw(shape('fire'))
    expect(S.queue).toEqual([FIRE])
    expect(S.introStep).toBe(LESSON.STORED)
    cast()
    castSide(false)
    expect(S.queue).toEqual([FIRE])
    expect(S.forge.t).toBe(-1)
    expect(S.castRefusedWhy).toBe('lesson')
    // "STORED! UP TO 3" reads, then the square's guide.
    step(STORED_S + 0.05)
    expect(S.introStep).toBe(LESSON.SQUARE)
    expect(guideRune()).toBe(EARTH)
    expect(events()).toContain('tutorial_square_shown')
    // The triangle again is NOT stored; neither is junk.
    S.pops.length = 0
    draw(shape('fire', 40))
    expect(S.queue).toEqual([FIRE])
    expect(popped('trySquare')).toBe(true)
    draw(LINE)
    expect(S.queue).toEqual([FIRE])
    // The square lands in the SECOND slot.
    draw(shape('earth', 20))
    expect(S.queue).toEqual([FIRE, EARTH])
    expect(S.introStep).toBe(LESSON.LIGHTBOX)
    expect(events()).toEqual(expect.arrayContaining(['tutorial_square_done', 'tutorial_lightbox']))
    // The lightbox is EXACTLY two seconds, and the cast is shut through it.
    for (let i = 0; i < Math.round(LIGHTBOX_S / DT) - 1; i++) updateSim(DT)
    expect(S.introStep).toBe(LESSON.LIGHTBOX)
    cast()
    expect(S.queue).toEqual([FIRE, EARTH])
    updateSim(DT)
    expect(S.introStep).toBe(LESSON.CAST)
    expect(lessonCastOpen()).toBe(true)
    expect(events()).toContain('tutorial_cast_ready')
    // A stroke now is not stored; it re-invites the cast.
    const inv = castInvite()
    draw(shape('fire'))
    expect(S.queue).toEqual([FIRE, EARTH])
    expect(castInvite()).toBeGreaterThan(inv)
    // The cast is Fire + Earth, it ends the lessons — and it FORGES (§8.37).
    cast()
    expect(lastPlayerCast()).toMatchObject({ key: '0.3', count: 2 })
    expect(S.intro).toBe(0)
    expect(S.introStep).toBe(LESSON.DONE)
    expect([...S.forge.q]).toEqual([FIRE, EARTH])
    expect(S.shots.some((s) => s.dir > 0)).toBe(false)
    step(FORGE_S + DT)
    expect(S.shots.some((s) => s.dir > 0), 'the Magma Shard leaves the horn').toBe(true)
  })

  it('holds the foe from her release to lesson 2\'s cast — and wakes her after it', () => {
    freshDuel()
    passLesson1()
    const still = (): boolean => S.equeue.length === 0 && S.eForm === 0 && S.eForge.t < 0 && hers() === 0
    step(8)
    expect(still()).toBe(true)
    draw(shape('fire'))
    step(STORED_S + 10)
    expect(still()).toBe(true)
    draw(shape('earth'))
    step(LIGHTBOX_S + 12)
    expect(S.introStep).toBe(LESSON.CAST)
    expect(still()).toBe(true)
    // …and the AFK rule has not been running underneath the lessons.
    expect(afk()).toBe(false)
    cast()
    expect(S.intro).toBe(0)
    step(4)
    expect(S.equeue.length > 0 || S.eForm > 0 || S.eForge.t >= 0, 'the foe wakes after the lessons').toBe(true)
    expect(S.phase).toBe(PH_DUEL)
  })
})

describe('the AFK guard', () => {
  it('never fires in any beat of either lesson, however long she takes', () => {
    freshDuel()
    step(AFK_S + 5)
    expect(afk(), 'BLOCK').toBe(false)
    draw(shape('earth'))
    step(AFK_S + 5)
    expect(afk(), 'BLOCK_CAST').toBe(false)
    cast()
    until(() => S.introStep === LESSON.TRIANGLE)
    step(AFK_S + 5)
    expect(afk(), 'TRIANGLE').toBe(false)
    draw(shape('fire'))
    step(STORED_S + 0.1)
    step(AFK_S + 5)
    expect(afk(), 'SQUARE').toBe(false)
    draw(shape('earth'))
    step(LIGHTBOX_S + AFK_S + 5)
    expect(afk(), 'CAST').toBe(false)
  })

  it('works again once the lessons are over', () => {
    freshDuel()
    passLesson1()
    draw(shape('fire'))
    step(STORED_S + 0.1)
    draw(shape('earth'))
    step(LIGHTBOX_S + 0.1)
    cast()
    // (Her own spell forging and flying counts as being here.)
    step(FORGE_S + 1 + AFK_S + 0.5)
    expect(afk()).toBe(true)
  })
})

describe('the ways out: no beat can hold a child forever', () => {
  it('lesson 1: after five wrong tries the square is placed in her slot for her', () => {
    freshDuel()
    for (let i = 0; i < TRIES - 1; i++) draw(i % 2 ? LINE : shape('fire'))
    expect(S.introStep).toBe(LESSON.BLOCK)
    expect(S.queue).toEqual([])
    draw(LINE)
    expect(S.queue).toEqual([EARTH])
    expect(S.introStep).toBe(LESSON.BLOCK_CAST)
    expect(propsOf('tutorial_block_square')).toMatchObject({ tries: TRIES, helped: true })
  })

  it('lesson 1: five strokes instead of a cast, and the lesson casts the wall for her', () => {
    freshDuel()
    draw(shape('earth'))
    for (let i = 0; i < TRIES; i++) draw(shape('fire'))
    expect(S.introStep).toBe(LESSON.BLOCK_CAST)
    updateSim(DT)
    expect(S.introStep).toBe(LESSON.BLOCK_WAIT)
    expect(propsOf('tutorial_block_cast')).toMatchObject({ auto: true })
    until(() => S.introStep === LESSON.BLOCKED)
    expect(S.hp).toBe(S.hpMax)
  })

  it('lesson 1: a wall that never comes gives up after WAIT_MAX and moves on, the held spell put away', () => {
    freshDuel()
    until(() => S.eForge.t >= FORGE_S - HOLD_AT - 1e-6)
    draw(shape('earth'))
    cast()
    // Something takes her forge away before the wall can rise.
    S.forge.t = -1
    S.forge.q.length = 0
    step(WAIT_MAX + 0.1)
    expect(S.introStep).toBe(LESSON.TRIANGLE)
    expect(propsOf('tutorial_block_skipped')).toMatchObject({ why: 'noWall' })
    step(3)
    expect(hers()).toBe(0)
    expect(S.eForge.t).toBe(-1)
    expect(S.hp).toBe(S.hpMax)
  })

  it('lesson 2: five wrong tries at the triangle and it is placed for her', () => {
    freshDuel()
    passLesson1()
    for (let i = 0; i < TRIES; i++) draw(LINE)
    expect(S.queue).toEqual([FIRE])
    expect(S.introStep).toBe(LESSON.STORED)
    expect(propsOf('tutorial_helped')).toMatchObject({ step: LESSON.TRIANGLE })
  })

  it('lesson 2: a child who cannot manage the square is let through on the triangle', () => {
    freshDuel()
    passLesson1()
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

  it('lesson 2: five strokes instead of the cast, and the lesson casts the combo for her', () => {
    freshDuel()
    passLesson1()
    draw(shape('fire'))
    step(STORED_S + 0.1)
    draw(shape('earth'))
    step(LIGHTBOX_S + 0.1)
    for (let i = 0; i < TRIES; i++) draw(shape('fire'))
    expect(S.intro).toBe(1)
    updateSim(DT)
    expect(S.intro).toBe(0)
    expect(lastPlayerCast()).toMatchObject({ key: '0.3', count: 2 })
  })

  it('a pause resumes where it was; a hand emptied under a beat steps back', () => {
    freshDuel()
    passLesson1()
    draw(shape('fire'))
    step(STORED_S + 0.1)
    draw(shape('earth'))
    // A pause is simply the sim not stepping: half the lightbox, a "pause",
    // then the other half — still exactly two seconds of lightbox in all.
    step(1)
    expect(S.introStep).toBe(LESSON.LIGHTBOX)
    step(1)
    expect(S.introStep).toBe(LESSON.CAST)
    // Anything that empties her slots mid-lesson sends it back to the beat
    // that fills them rather than waiting for a stroke it could never take.
    S.queue.length = 0
    step(DT)
    expect(S.introStep).toBe(LESSON.TRIANGLE)
    // …in lesson 1 too.
    freshDuel()
    draw(shape('earth'))
    expect(S.introStep).toBe(LESSON.BLOCK_CAST)
    S.queue.length = 0
    step(DT)
    expect(S.introStep).toBe(LESSON.BLOCK)
    draw(shape('earth'))
    expect(S.queue).toEqual([EARTH])
  })

  it('a new duel starts an unfinished lesson over from the block — her held spell with it', () => {
    freshDuel()
    until(() => S.eForge.t >= 0)
    draw(shape('earth'))
    resetDuel({ foe: 0, usesMagic: false, lossStreak: 0, ease: NO_EASE })
    expect(S.introStep).toBe(LESSON.BLOCK)
    expect(S.queue).toEqual([])
    expect(S.equeue).toEqual([])
    expect(S.eForge.t).toBe(-1)
    // …and plays again from the top.
    until(() => S.eForge.t >= 0)
    expect([...S.eForge.q]).toEqual([...FOE_HAND])
  })
})

describe('first time only', () => {
  it('lesson 2\'s cast saves it off; a returning save or a replay never sees either lesson', () => {
    freshDuel()
    passLesson1()
    draw(shape('fire'))
    step(STORED_S + 0.1)
    draw(shape('earth'))
    step(LIGHTBOX_S + 0.1)
    cast()
    expect(Number(getState(ONBOARDED_KEY, 0))).toBe(1)
    load()
    expect(S.intro).toBe(0)
    // The next duel (a replay of node 0, or any other): one rune, cast at once,
    // and the foe plays her own game from the first frame.
    resetDuel({ foe: 0, usesMagic: false, lossStreak: 0, ease: NO_EASE })
    expect(lessonCastOpen()).toBe(true)
    expect(guideRune()).toBe(-1)
    draw(shape('fire'))
    expect(S.queue).toEqual([FIRE])
    cast()
    expect(S.queue).toEqual([])
    expect(S.forge.t).toBeGreaterThanOrEqual(0)
    step(FORGE_S + DT)
    expect(S.shots.some((s) => s.dir > 0)).toBe(true)
  })

  it('the lesson 1 wall does not end the onboarding — only lesson 2\'s cast does', () => {
    freshDuel()
    passLesson1()
    expect(S.intro).toBe(1)
    expect(Number(getState(ONBOARDED_KEY, 0))).toBe(0)
  })

  it('never runs in versus, and the win-rate harness (intro off) sees none of it', () => {
    freshDuel()
    S.intro = 0
    resetDuel({ foe: 0, usesMagic: false, lossStreak: 0, ease: NO_EASE })
    expect(S.introStep).not.toBe(LESSON.BLOCK_WAIT)
    draw(shape('fire'))
    expect(S.queue).toEqual([FIRE])
    S.intro = 1
    resetDuel({ foe: 0, usesMagic: false, lossStreak: 0, versus: true })
    expect(lessonCastOpen()).toBe(true)
    expect(guideRune()).toBe(-1)
    draw(shape('fire'))
    expect(S.queue).toEqual([FIRE])
    S.intro = 0
    S.versus = false
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

  it('wear their "Your runes" caption in the first duel they appear in only', () => {
    expect(chipsCaptionDue(0, -1)).toBe(true)
    expect(chipsCaptionDue(1, 0)).toBe(false)
    expect(chipsCaptionDue(2, 1)).toBe(false)
    expect(chipsCaptionDue(0, 0)).toBe(false)
    expect(chipsCaptionDue(-1, -1)).toBe(false)
  })

  it('carry her KNOWN runes, and stay off while the lessons are teaching', () => {
    freshDuel()
    S.flow = { ...S.flow, scene: 'duel', node: 0, mode: 'campaign' }
    syncHud(0)
    expect(hud.chips).toBe(0)
    expect(hud.chipsCaption).toBe(false)
    S.intro = 0
    syncHud(0)
    expect(hud.chips).toBe(STARTING_RUNES)
    expect(hud.chipsCaption, 'the first duel: captioned').toBe(true)
    // Node 1, with the Ice rune node 0's chest gave: three chips, no caption.
    S.flow = { ...S.flow, node: 1 }
    S.campaign.furthestNode = 0
    S.campaign.runesUnlocked = (1 << 2) >>> 0
    syncHud(0)
    expect(hud.chips).toBe((STARTING_RUNES | (1 << 2)) >>> 0)
    expect(hud.chipsCaption).toBe(false)
    // Node 3: past the window.
    S.flow = { ...S.flow, node: 3 }
    S.campaign.furthestNode = 2
    syncHud(0)
    expect(hud.chips).toBe(0)
    S.flow = { ...S.flow, mode: 'campaign', node: -1 }
    S.campaign = defaultCampaign()
  })
})

// Keep the lesson's scripted hand honest: three runes, one cast.
it('the foe\'s lesson hand is a full hand that hits', () => {
  expect(FOE_HAND.length).toBe(MAX_RUNES)
})
