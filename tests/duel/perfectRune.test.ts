// @vitest-environment node
// The perfect-rune sparkle (retention-roadmap item 7).
//
// Three things are worth a test here and nothing else is:
//   1. the threshold classifies — above, below, and exactly on the line;
//   2. the threshold is a MEASUREMENT, not a taste: every rune in the
//      alphabet can earn it from a careful hand, care is what moves it, and
//      junk the recogniser let through can never fake it;
//   3. it is cosmetic. The same seed, the same strokes and the same duel come
//      out at the same health with the same winner whether the sparkle is
//      wired in or not — including the dice, which is the one way a purely
//      visual effect could still have moved the tuned win rates (§8.18).
//
// The duel draws its dice from `Math.random` captured at import time, so it is
// seeded BEFORE anything imports, exactly as `winRate.test.ts` does.
import { describe, expect, it, vi } from 'vitest'

const { reseed } = vi.hoisted(() => {
  const SEED = 20260923
  let s = SEED
  Math.random = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
  return { reseed: (): void => { s = SEED } }
})

import { ALL_RUNES_MASK, rawScore, recognise } from '@/game/duel/runes'
import { RUNE_DEFS } from '@/game/duel/runeDefs'
import { DRAWN, JUNK, junkDraw, realize, stream, type Rnd } from './rune-draws'
import { PERFECT_MARGIN, installPerfectSparkle, isPerfect, perfectSlot, perfectToken, resetPerfectMark } from '@/game/duel/perfect'
import { NO_EASE, PH_DUEL, PH_WIN } from '@/game/duel/config'
import { S } from '@/game/duel/state'
import { cast, resetDuel, strokeEnd, updateSim, type StrokeInfo } from '@/game/duel/sim'
import { resetFx } from '@/game/duel/fx'

const info = (over: Partial<StrokeInfo>): StrokeInfo =>
  ({ success: true, rune: 0, ec: 3, turn: 6.2, margin: 0, ...over })

describe('the perfect line', () => {
  it('classifies above, below and exactly on it', () => {
    expect(isPerfect(info({ margin: PERFECT_MARGIN + 0.02 }))).toBe(true)
    // On the line counts: a child who lands exactly there earned it.
    expect(isPerfect(info({ margin: PERFECT_MARGIN }))).toBe(true)
    expect(isPerfect(info({ margin: PERFECT_MARGIN - 1e-6 }))).toBe(false)
    expect(isPerfect(info({ margin: 0 }))).toBe(false)
  })

  it('is never earned by a stroke that was not a rune', () => {
    // A refused stroke reports the best-scoring rune it ALMOST was, so its
    // margin can be high; nothing about it is perfect.
    expect(isPerfect(info({ success: false, margin: PERFECT_MARGIN + 0.02 }))).toBe(false)
    expect(isPerfect(undefined)).toBe(false)
  })

  it('leaves the recogniser its whole range to work in', () => {
    // The margin tops out at 0.22 (score 1.0 against the 0.78 accept line).
    expect(PERFECT_MARGIN).toBeGreaterThan(0)
    expect(PERFECT_MARGIN).toBeLessThan(0.22)
  })
})

/* ──────────────────── the measurement behind the number ──────────────── */
//
// The shipped noise model only JITTERS a mathematically exact shape, which
// every hand scores ~1.0 on — it cannot tell care from carelessness at all.
// A real hand wanders off the line over the length of the stroke, so each
// draw below gets a smooth three-harmonic displacement of amplitude `w` shape
// widths on top of the jitter. `w` IS the hand.

const wobble = (unit: readonly number[], w: number, rnd: Rnd): number[] => {
  const out = unit.slice()
  const n = unit.length / 2
  const ph: number[] = []
  for (let k = 0; k < 6; k++) ph.push(rnd() * Math.PI * 2)
  for (let i = 0; i < n; i++) {
    const s = i / (n - 1)
    let dx = 0
    let dy = 0
    for (let k = 0; k < 3; k++) {
      const a = w / (k + 1)
      dx += a * Math.sin(2 * Math.PI * (k + 1) * s + ph[k]!)
      dy += a * Math.sin(2 * Math.PI * (k + 1) * s + ph[k + 3]!)
    }
    out[i * 2] += dx
    out[i * 2 + 1] += dy
  }
  return out
}

/** Share of `n` draws of `slug` by a hand of wobble `w` that would sparkle. */
const sparkleRate = (slug: string, w: number, jitter: number, n: number, rnd: Rnd): number => {
  const range = (a: number, b: number): number => a + rnd() * (b - a)
  let hit = 0
  for (let i = 0; i < n; i++) {
    const size = range(80, 240)
    const stroke = realize(
      wobble(DRAWN[slug]!(rnd), w, rnd),
      { rotDeg: range(0, 360), sx: size, sy: size * range(0.8, 1.25), jitterAmp: jitter },
      rnd
    )
    if (recognise(stroke, ALL_RUNES_MASK) < 0) continue
    if (rawScore(stroke, ALL_RUNES_MASK)[1] - 0.78 >= PERFECT_MARGIN) hit++
  }
  return hit / n
}

describe('the threshold is a measurement', () => {
  const N = 120
  const CAREFUL = { w: 0.04, jitter: 1 }
  const SCRIBBLY = { w: 0.22, jitter: 7 }

  it('every rune in the alphabet can earn it from a careful hand', () => {
    // The alphabet is NOT uniform: a square scores far higher than a heart
    // however neatly either is drawn. A threshold that no chapter-12 rune can
    // ever reach would teach a child that her best heart is never good
    // enough, so every rune has to be able to land it — even rarely.
    const rnd = stream(31337)
    const unreachable = RUNE_DEFS
      .filter((d) => sparkleRate(d.slug, CAREFUL.w, CAREFUL.jitter, N, rnd) === 0)
      .map((d) => d.slug)
    expect(unreachable, 'runes that can never sparkle').toEqual([])
  })

  it('care is what moves it', () => {
    const rnd = stream(31337)
    let careful = 0
    let scribbly = 0
    for (const d of RUNE_DEFS) {
      careful += sparkleRate(d.slug, CAREFUL.w, CAREFUL.jitter, N, rnd)
      scribbly += sparkleRate(d.slug, SCRIBBLY.w, SCRIBBLY.jitter, N, rnd)
    }
    careful /= RUNE_DEFS.length
    scribbly /= RUNE_DEFS.length
    // A child drawing carefully hits it most of the time…
    expect(careful).toBeGreaterThan(0.6)
    // …and a scrappy stroke mostly does not. Both halves matter: a sparkle
    // nobody can earn teaches nothing, and one everybody earns every time
    // says nothing either.
    expect(scribbly).toBeLessThan(0.4)
    expect(careful / Math.max(scribbly, 1e-6)).toBeGreaterThan(2)
  })

  it('junk the recogniser let through can never fake it', () => {
    const rnd = stream(31337)
    let accepted = 0
    let best = -1
    for (const name of Object.keys(JUNK)) {
      for (let i = 0; i < 400; i++) {
        const stroke = junkDraw(name, rnd)
        if (recognise(stroke, ALL_RUNES_MASK) < 0) continue
        accepted++
        best = Math.max(best, rawScore(stroke, ALL_RUNES_MASK)[1] - 0.78)
      }
    }
    // A handful of swipes and scribbles do get through the accept line —
    // that is what the 5 % S0 budget is for. None of them is ever celebrated.
    expect(accepted).toBeGreaterThan(0)
    expect(best).toBeLessThan(PERFECT_MARGIN)
  })
})

/* ───────────────────── it does not touch the fight ───────────────────── */

const DT = 1 / 60

/** A deck of pre-made strokes, built from their OWN stream so that drawing
 *  them costs the duel's dice nothing and both runs get identical input. */
const strokeDeck = (slug: string, n: number): number[][] => {
  const rnd = stream(777)
  const out: number[][] = []
  for (let i = 0; i < n; i++) {
    out.push(realize(DRAWN[slug]!(rnd), { rotDeg: i * 37, sx: 150, sy: 150, jitterAmp: 1 }, rnd))
  }
  return out
}

interface Run {
  /** Both duelists' health, every frame. */
  hp: number[]
  won: boolean
  sparkles: number
}

/** One scripted duel: a rune every 1.1 s, cast on the second one. */
const runDuel = (deck: readonly number[][], sparkle: boolean): Run => {
  reseed()
  resetPerfectMark()
  resetFx()
  // What `resetDuel` does NOT own, because it belongs to the session rather
  // than to the fight: the onboarding flag (with it on, the foe does not
  // think at all), the lifetime win count the difficulty ramp reads, and the
  // callouts left on screen. Without these the second arm fights a different
  // foe and the comparison is about the ramp, not about the sparkle.
  S.intro = 0
  S.wins = S.losses = 0
  S.pops.length = 0
  const stop = sparkle ? installPerfectSparkle() : null
  resetDuel({ foe: 0, usesMagic: true, lossStreak: 0, ease: NO_EASE })
  const hp: number[] = []
  let t = 0
  let next = 0.6
  let i = 0
  while (S.phase === PH_DUEL && t < 100) {
    if (t >= next) {
      next += 1.1
      // Straight into the buffer: `strokeMove` would spray sparkle trails and
      // spend the duel's dice on them, which is the harness talking, not the
      // feature under test.
      S.draw = 1
      S.pts.length = 0
      S.pts.push(...deck[i++ % deck.length]!)
      strokeEnd()
      if (S.queue.length >= 2) cast()
    }
    updateSim(DT)
    t += DT
    hp.push(S.hp, S.ehp)
  }
  stop?.()
  return { hp, won: S.phase === PH_WIN, sparkles: perfectToken() }
}

describe('the sparkle is cosmetic', () => {
  it('leaves the same seed at the same health with the same winner', () => {
    const deck = strokeDeck('fire', 24)
    const withSparkle = runDuel(deck, true)
    const without = runDuel(deck, false)

    // Without this the whole comparison is vacuous.
    expect(withSparkle.sparkles, 'the scripted strokes must actually sparkle').toBeGreaterThan(3)
    expect(without.sparkles).toBe(0)

    expect(withSparkle.won).toBe(without.won)
    expect(withSparkle.hp.length).toBe(without.hp.length)
    expect(withSparkle.hp).toEqual(without.hp)
  })

  it('marks the slot the rune landed in', () => {
    reseed()
    resetPerfectMark()
    resetFx()
    const stop = installPerfectSparkle()
    resetDuel({ foe: 0, usesMagic: false, lossStreak: 0, ease: NO_EASE })
    const deck = strokeDeck('fire', 3)
    for (let i = 0; i < 3; i++) {
      S.draw = 1
      S.pts.length = 0
      S.pts.push(...deck[i]!)
      strokeEnd()
      expect(perfectToken()).toBe(i + 1)
      expect(perfectSlot()).toBe(i)
    }
    stop()
  })

  it('writes nothing into the duel state', () => {
    // The guarantee, stated as a grep: no rule can read a flag that is not
    // there. `perfect.ts` owns two module-local integers and nothing else.
    reseed()
    resetPerfectMark()
    resetDuel({ foe: 0, usesMagic: false, lossStreak: 0, ease: NO_EASE })
    const before = Object.keys(S).sort()
    const stop = installPerfectSparkle()
    S.draw = 1
    S.pts.length = 0
    S.pts.push(...strokeDeck('fire', 1)[0]!)
    strokeEnd()
    stop()
    expect(perfectToken()).toBe(1)
    expect(Object.keys(S).sort()).toEqual(before)
  })
})
