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
import { CHARGE_S, foeCharge, foeTell, resetDuel, updateSim } from '@/game/duel/sim'
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

/** The foe's spells in the air. */
const hers = (): number => S.shots.filter((s) => s.dir < 0).length

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

describe('the foe\'s combo telegraph (§8.36)', () => {
  it('winds a full hand that will HIT up for CHARGE_S before it leaves — slots and horn say so', () => {
    open()
    hand([FIRE, FIRE], FIRE)
    expect(foeTell(), 'two runes of a hit: the softer glow').toBe(1)
    updateSim(DT)
    expect(S.equeue.length).toBe(MAX_RUNES)
    expect(S.eCharge, 'the wind-up began as the third rune landed').toBeGreaterThan(0)
    expect(foeTell(), 'full slots: the pulse').toBe(2)
    expect(foeCharge()).toBeGreaterThanOrEqual(0)
    let shots = hers()
    const t = untilRelease()
    // It left exactly as the wind-up ended — not a frame early, barely a frame late.
    expect(t, 'released after').toBeGreaterThanOrEqual(CHARGE_S - DT - 1e-9)
    expect(t).toBeLessThan(CHARGE_S + 3 * DT)
    // (Fire Rain is a heavy: it hangs over Aurora before it falls.)
    shots = hers() - shots
    expect(shots, 'her spell is in the air').toBe(1)
    expect(foeTell(), 'and the warning is gone with it').toBe(0)
    expect(foeCharge()).toBe(-1)
  })

  it('rises steadily through the wind-up', () => {
    open()
    hand([ICE, ICE], ICE)
    updateSim(DT)
    let last = -1
    while (S.eCharge > 0) {
      const k = foeCharge()
      expect(k).toBeGreaterThanOrEqual(last)
      last = k
      updateSim(DT)
    }
    expect(last).toBeGreaterThan(0.95)
  })

  it('warns of nothing for a hand that is a wall — and a wall still goes straight up', () => {
    open()
    // Two Ice: the pillar, a ward.
    S.equeue.length = 0
    S.equeue.push(ICE as Rune, ICE as Rune)
    expect(resolveSpell([ICE, ICE]).kind).toBe(2)
    expect(foeTell()).toBe(0)
    // A three-rune ward, from the whole alphabet she could hold.
    let ward: number[] | null = null
    for (let a = 0; a < 4 && !ward; a++) {
      for (let b = a; b < 4 && !ward; b++) {
        for (let c = b; c < 4 && !ward; c++) if (resolveSpell([a, b, c]).kind === 2) ward = [a, b, c]
      }
    }
    if (ward) {
      hand(ward.slice(0, 2), ward[2]!)
      updateSim(DT)
      expect(S.eCharge, 'no wind-up for a ward').toBe(0)
      expect(foeTell()).toBe(0)
    }
  })

  it('stops winding up when the hand stops being full', () => {
    open()
    hand([FIRE, FIRE], FIRE)
    updateSim(DT)
    expect(S.eCharge).toBeGreaterThan(0)
    S.equeue.length = 0
    updateSim(DT)
    expect(S.eCharge).toBe(0)
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
    S.eCharge = 0
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
