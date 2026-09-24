/**
 * Combat feedback (story-spec §8.36): the foe's combo telegraph, the second
 * of grace after a menu closes, and whose damage number is whose.
 *
 * The blind playtest (2026-09-24) watched the foe fill her three slots and
 * land a big spell with no warning: a full hand left on her next
 * quarter-second thought, so "full slots" was never on screen long enough to
 * mean anything. And a "−7" at the end of a duel could not be told apart.
 */
import { describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  let s = 20260924
  Math.random = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
})

import {
  AX, UX, GY, EARTH, FIRE, ICE, MAX_RUNES, NO_EASE, PH_DUEL, RUNES, resolveSpell, type Rune
} from '@/game/duel/config'
import { duelSetup } from '@/game/campaign/tables'
import { VERSUS_FOE } from '@/game/duel/foes'
import { S, type Shot } from '@/game/duel/state'
import { foeTell, resetDuel, updateSim } from '@/game/duel/sim'
import { RESUME_GRACE_S, foeMayRelease, noteResume } from '@/game/duel/director'

const DT = 1 / 120

const open = (node = 4): void => {
  S.wins = 20
  S.losses = 0
  S.intro = 0
  S.campaign.signaturesUnlocked = 0
  S.campaign.runesUnlocked = 0xf
  const { foe } = duelSetup(node)
  resetDuel({ foe, usesMagic: false, lossStreak: 0, ease: { ...NO_EASE } })
  S.eThink = 0
}

/** Hand her `q` with `next` one rune from forming, and let her think at once. */
const hand = (q: number[], next: number): void => {
  S.equeue.length = 0
  S.equeue.push(...(q as Rune[]))
  S.eRune = next
  S.eForm = 0.999
  S.eThink = 0
}

/** Seconds until she releases a spell (her queue empties), up to `cap`. */
const untilRelease = (cap = 4): number => {
  let t = 0
  while (t < cap && S.equeue.length > 0) {
    // She must not get a new rune in the meantime: freeze the forming.
    updateSim(DT)
    t += DT
  }
  return t
}

describe('the foe\'s tell before she casts (§8.36; the wind-up became the forge, §8.37)', () => {
  it('her slots glow for two runes of a hit, more for three — and the forge takes the hand', () => {
    open()
    hand([FIRE, FIRE], FIRE)
    expect(foeTell(), 'two runes of a hit: the softer glow').toBe(1)
    updateSim(DT)
    // Full, and on the same thought it goes into her forge — the 1.5 s
    // forge is the warning now, her runes flying out of her slots (§8.37).
    expect(S.eForge.t, 'forging').toBeGreaterThanOrEqual(0)
    expect(S.eForge.q.length).toBe(MAX_RUNES)
    expect(S.equeue.length, 'her slots emptied into it').toBe(0)
    expect(foeTell()).toBe(0)
    // A full hand she is HOLDING (her last spell still in the air) pulses.
    S.equeue.push(FIRE as Rune, FIRE as Rune, FIRE as Rune)
    expect(foeTell()).toBe(2)
    S.equeue.length = 0
  })

  it('warns of nothing for a hand that is a wall', () => {
    open()
    // Two Ice: the pillar, a ward.
    S.equeue.length = 0
    S.equeue.push(ICE as Rune, ICE as Rune)
    expect(resolveSpell([ICE, ICE]).kind).toBe(2)
    expect(foeTell()).toBe(0)
    S.equeue.length = 0
  })

  it('is never shown in local versus, where the right-hand slots are a person\'s', () => {
    resetDuel({ foe: VERSUS_FOE, usesMagic: false, lossStreak: 0, versus: true })
    S.equeue.push(FIRE as Rune, FIRE as Rune, FIRE as Rune)
    expect(foeTell()).toBe(0)
    S.equeue.length = 0
  })
})

describe('the second of grace after a menu closes (§8.36)', () => {
  it('holds her release — not her forming — for RESUME_GRACE_S, then lets her go', () => {
    open()
    // A full hand already wound up, and a menu closes just as she would throw.
    S.equeue.length = 0
    S.equeue.push(FIRE as Rune, FIRE as Rune, FIRE as Rune)
    noteResume()
    expect(foeMayRelease()).toBe(false)
    S.eThink = 0
    const t = untilRelease()
    expect(t, 'held for the grace').toBeGreaterThanOrEqual(RESUME_GRACE_S - 2 * DT)
    expect(t, 'and not much longer').toBeLessThan(RESUME_GRACE_S + 0.3)
    expect(foeMayRelease()).toBe(true)
  })

  it('lets her keep forming through it', () => {
    open()
    S.equeue.length = 0
    S.eRune = EARTH
    S.eForm = 0
    noteResume()
    for (let t = 0; t < 0.5; t += DT) updateSim(DT)
    expect(S.eForm + S.equeue.length, 'she formed').toBeGreaterThan(0)
  })
})

describe('whose damage number it is (§8.36)', () => {
  const shotAt = (onFoe: boolean, dmg: number): Shot => ({
    x: onFoe ? UX - 5 : AX + 5, y: GY - 90, tx: onFoe ? UX : AX, r: FIRE as Rune, k: 0, dmg, dot: 0, slow: 0,
    dir: onFoe ? 1 : -1, w: 0, p: 0, n: 1, delay: 0, life: 0, b: dmg, ls: 0, sp: 0, rf: 0
  })

  it('pops over the one who took it, and says which side that was', () => {
    open()
    S.eThink = 1e9
    S.pops.length = 0
    S.shots.push(shotAt(false, 7))
    updateSim(DT)
    const mine = S.pops.find((p) => p.k === 'hit')!
    expect(mine.v, 'Aurora took it').toBe(0)
    expect(mine.x).toBe(AX)
    S.pops.length = 0
    S.shots.push(shotAt(true, 7))
    // (The first blow's hit-stop holds the sim for a few frames.)
    for (let i = 0; i < 30 && S.shots.length; i++) updateSim(DT)
    const hersPop = S.pops.find((p) => p.k === 'hit' || p.k === 'weakHit')!
    expect(hersPop.v, 'the foe took it').toBe(1)
    expect(hersPop.x).toBe(UX)
    // A callout that is nobody's blow carries no side.
    expect(S.pops.every((p) => p.k === 'hit' || p.k === 'weakHit' || p.v === undefined)).toBe(true)
    expect(RUNES.length).toBe(12)
    expect(S.phase).toBe(PH_DUEL)
  })
})
