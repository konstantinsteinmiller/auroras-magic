// Chapters 4–10's magic (story-spec §6.3, §6.5, §6.7–§6.9, §6.11, §6.20),
// driven through the real sim at the scene's fixed 1/120 s step: Crystal
// Ward's reflect, Illusion's decoys, Rainbow's wildcard, Time's two-mode
// slow, Frost Lock, Moon's lifesteal, the Love finisher's gate, and the boss
// phases that lean on them.

import { beforeEach, describe, expect, it } from 'vitest'
import {
  FIRE, WIND, ICE, EARTH, NATURE, LIGHTNING, ILLUSION, RAINBOW, TIME, MOON, LOVE, SPELLS, resolveSpell, type Rune
} from '@/game/duel/config'
import { FOES, shadowOf, guardianOf } from '@/game/duel/foes'
import { S } from '@/game/duel/state'
import { resetDuel, updateSim, stops, foeRate, finisherOpen } from '@/game/duel/sim'
import { castNow } from './forged'

const STEP = 1 / 120
const run = (seconds: number): void => {
  for (let i = 0; i < Math.round(seconds / STEP); i++) updateSim(STEP)
}
/** Hold the foe: no thinking, no forming, an empty hand. */
const holdFoe = (): void => {
  S.eThink = 1e9
  S.eForm = 0
  S.equeue.length = 0
}
/** The player casts `q`, and its forge runs out: the spell has left (§8.37). */
const playerCasts = (...q: number[]): void => {
  S.queue.length = 0
  S.queue.push(...(q as Rune[]))
  castNow()
}
/** The foe casts `q` now, and its forge runs out: the spell has left. */
const foeCasts = (...q: number[]): void => {
  S.equeue.length = 0
  S.equeue.push(...(q as Rune[]))
  castNow(true)
}

beforeEach(() => {
  S.wins = 20
  S.losses = 0
  S.intro = 0
  S.pops.length = 0
  S.campaign.signaturesUnlocked = 0
  resetDuel({ foe: shadowOf(5), usesMagic: false, lossStreak: 0 }) // an exempt, neutral foe
})

describe('Crystal Ward — the reflect barrier (§6.5)', () => {
  it('stops every kind of spell', () => {
    for (const k of [0, 1, 2, 3, 4, 5]) expect(stops(4, k)).toBe(true)
  })

  it('resolves from Ice, Ice, Earth once unlocked, and raises guardK 4 for 5 s', () => {
    expect(resolveSpell([ICE, ICE, EARTH]).nameId).not.toBe('crystalWard')
    S.campaign.signaturesUnlocked = 0b01
    holdFoe()
    playerCasts(ICE, EARTH, ICE)
    expect(S.guardK).toBe(4)
    expect(S.guard).toBeCloseTo(5, 1)
  })

  it('sends a foe spell back at HALF its base damage and is spent on it', () => {
    S.campaign.signaturesUnlocked = 0b01
    holdFoe()
    playerCasts(ICE, ICE, EARTH)
    const ehp = S.ehp
    const hp = S.hp
    foeCasts(FIRE) // a fire bolt: 8 base (riders, if any, ride back with it)
    holdFoe()
    run(0.5) // it reaches Aurora's ward
    expect(S.hp).toBe(hp)
    expect(S.guard).toBe(0)
    expect(S.shots.some((s) => s.rf === 1 && s.dir > 0)).toBe(true)
    run(1.5)
    expect(ehp - S.ehp).toBeCloseTo(SPELLS['0']![2] * 0.5, 5)
  })

  it('a pierce goes straight through it (§6.8 rule 1)', () => {
    S.campaign.signaturesUnlocked = 0b01
    holdFoe()
    playerCasts(ICE, ICE, EARTH)
    const hp = S.hp
    foeCasts(LIGHTNING)
    holdFoe()
    run(1)
    expect(S.hp).toBeLessThan(hp)
    expect(S.guardK).toBe(4) // still standing: it never got to reflect
    expect(S.guard).toBeGreaterThan(0)
  })

  it('a reflected spell meeting a second Crystal Ward is only blocked — no ping-pong', () => {
    S.campaign.signaturesUnlocked = 0b01
    resetDuel({ foe: shadowOf(3), usesMagic: true, lossStreak: 0 }) // chapter 4: she has it too
    holdFoe()
    foeCasts(ICE, ICE, EARTH)
    holdFoe()
    expect(S.eGuardK).toBe(4)
    playerCasts(ICE, ICE, EARTH)
    const hp = S.hp
    const ehp = S.ehp
    playerCasts(FIRE)
    run(3)
    // Aurora's bolt bounced off the foe's ward, and off Aurora's own: blocked.
    expect(S.hp).toBe(hp)
    expect(S.ehp).toBe(ehp)
    expect(S.guard).toBe(0)
    expect(S.eGuard).toBe(0)
  })

  it('a chapter-4 foe from node 3 builds it as her defensive default (§6.13)', () => {
    resetDuel({ foe: shadowOf(3), usesMagic: true, lossStreak: 0 })
    S.queue.push(FIRE) // the player holds a rune: a combo is coming
    let at = -1
    for (let i = 0; i < 12 * 120 && at < 0; i++) {
      updateSim(STEP)
      S.hp = Math.max(S.hp, 60)
      if (S.eGuardK === 4 && S.eGuard > 0) at = i * STEP
    }
    expect(at).toBeGreaterThan(0)
    expect(at).toBeLessThan(9)
  })

  it("Terra's phase 2 holds her ward 7 s (§6.11)", () => {
    resetDuel({ foe: guardianOf(3), usesMagic: true, lossStreak: 0 })
    holdFoe()
    S.ePhase = 2
    foeCasts(ICE, ICE, EARTH)
    expect(S.eGuardK).toBe(4)
    expect(S.eGuard).toBeCloseTo(7, 1)
  })
})

describe('Illusion — the decoy (§6.3 kind 5, §6.8 rule 3)', () => {
  it('a pair summons a 1-hit decoy for 8 s; a triple a 2-hit one for 10 s', () => {
    holdFoe()
    playerCasts(ILLUSION, ILLUSION)
    expect(S.shots.length).toBe(0)
    expect([S.decoy, S.decoyN]).toEqual([1, 1])
    expect(S.decoyT).toBeCloseTo(8, 1)
    playerCasts(ILLUSION, ILLUSION, ILLUSION)
    expect(S.decoy).toBe(2) // overwritten, never stacked
    expect(S.decoyT).toBeCloseTo(10, 1)
  })

  it('swallows a whole spell — no HP, no rider — and a pierce does not get past it', () => {
    holdFoe()
    playerCasts(ILLUSION, ILLUSION, ILLUSION)
    const hp = S.hp
    foeCasts(FIRE, FIRE) // field + burn
    holdFoe()
    run(1)
    expect(S.hp).toBe(hp)
    expect(S.burn).toBe(0)
    foeCasts(LIGHTNING)
    holdFoe()
    run(1)
    expect(S.hp).toBe(hp)
    expect(S.decoy).toBe(0)
  })

  it('fades when its time is up', () => {
    holdFoe()
    playerCasts(ILLUSION, ILLUSION)
    run(8.2)
    expect(S.decoy).toBe(0)
    expect(S.decoyN).toBe(0)
  })

  it("Echo's phase 2 holds two decoys at once (§6.11)", () => {
    resetDuel({ foe: guardianOf(4), usesMagic: true, lossStreak: 0 })
    holdFoe()
    S.ePhase = 2
    foeCasts(ILLUSION, ILLUSION)
    foeCasts(ILLUSION, ILLUSION)
    expect(S.eDecoyN).toBe(2)
    expect(S.eDecoy).toBe(2)
  })
})

describe('Rainbow — the wildcard (§6.20)', () => {
  it('completes a golden spell: Fire, Fire, Rainbow is a Fire Rain', () => {
    const sp = resolveSpell([FIRE, FIRE, RAINBOW])
    expect(sp.nameId).toBe('fireRain')
    expect(sp.wild).toEqual([FIRE, FIRE, FIRE])
    expect(sp.lead).toBe(FIRE) // a Rainbow drawn last resolves before elements see it
  })

  it('tries each other rune and keeps the stronger; a tie goes to the one drawn last', () => {
    const sp = resolveSpell([NATURE, MOON, RAINBOW])
    const a = resolveSpell([NATURE, MOON, NATURE])
    const b = resolveSpell([NATURE, MOON, MOON])
    expect(sp.dmg).toBeCloseTo(Math.max(a.dmg, b.dmg) * 1, 5)
    const tie = resolveSpell([FIRE, ICE, RAINBOW])
    expect(tie.wild).toBeDefined()
  })

  it('alone it is its own modest colourless spell', () => {
    expect(resolveSpell([RAINBOW]).dmg).toBe(8)
    expect(resolveSpell([RAINBOW, RAINBOW, RAINBOW]).dmg).toBeLessThan(resolveSpell([FIRE, FIRE, FIRE]).dmg)
    expect(resolveSpell([RAINBOW]).wild).toBeUndefined()
  })
})

describe('Time — the two-mode slow (§6.7.7, F19)', () => {
  it('on the foe it throttles her hand by its own strength', () => {
    holdFoe()
    const base = foeRate()
    playerCasts(TIME, TIME) // hourglass field: slow 30 %
    run(1)
    expect(S.eSlow).toBeGreaterThan(0)
    expect(S.eSlowPct).toBeCloseTo(0.3, 5)
    expect(foeRate()).toBeCloseTo(Math.max(0.25, base * 0.7), 5)
  })

  it('on the player it never touches her hand: it shaves her guard instead', () => {
    holdFoe()
    playerCasts(WIND, WIND) // wind wall, 6 s — does not stop a field
    const g = S.guard
    foeCasts(TIME, TIME)
    holdFoe()
    run(0.6)
    expect(S.guard).toBeLessThan(g * 0.75)
    expect(S.queue.length).toBe(0)
  })

  it("Ember's phase 2 doubles the shave, to at most 60 % (§6.11)", () => {
    resetDuel({ foe: guardianOf(6), usesMagic: true, lossStreak: 0 })
    holdFoe()
    S.ePhase = 2
    playerCasts(WIND, WIND)
    foeCasts(TIME, TIME)
    holdFoe()
    const shot = S.shots.find((s) => s.dir < 0)!
    expect(shot.sp).toBeCloseTo(0.6, 5)
  })
})

describe('Frost Lock (§6.5)', () => {
  it('Wind, Ice, Ice (once unlocked) walls her off and freezes the foe for 2.5 s', () => {
    S.campaign.signaturesUnlocked = 0b10
    resetDuel({ foe: shadowOf(7), usesMagic: true, lossStreak: 0 })
    S.equeue.push(FIRE, FIRE)
    playerCasts(ICE, WIND, ICE)
    expect(S.guardK).toBe(1) // earth-strength: stops everything
    expect(S.eFrozen).toBeCloseTo(2.5, 5)
    expect(S.equeue.length).toBe(0) // her hand is discarded
    run(2)
    expect(S.equeue.length).toBe(0) // a frozen foe does nothing at all
    expect(S.eForm).toBe(0)
    run(0.6)
    expect(S.eFrozen).toBe(0)
    expect(S.eFreezeCd).toBeGreaterThan(5)
    playerCasts(ICE, WIND, ICE)
    expect(S.eFrozen).toBe(0) // not again inside the cooldown
  })

  it("Glace, in her phase 2, shrugs it off in 1.5 s (§6.11)", () => {
    S.campaign.signaturesUnlocked = 0b10
    resetDuel({ foe: guardianOf(7), usesMagic: true, lossStreak: 0 })
    S.ePhase = 2
    playerCasts(ICE, WIND, ICE)
    expect(S.eFrozen).toBeCloseTo(1.5, 5)
  })

  it('no foe ever holds it: it is player-only (C14)', () => {
    for (const f of FOES) expect(f.sigs & 0b10).toBe(0)
  })
})

describe('Moon — lifesteal (§6.7.9)', () => {
  it('a landed hit heals its caster a share of the damage', () => {
    holdFoe()
    S.hp = 50
    playerCasts(MOON) // moon bolt: 7, lifesteal 30 %
    run(1)
    expect(S.hp).toBeCloseTo(50 + 7 * 0.3, 5)
  })

  it("Nova's phase 2 raises her lifesteal by 15 points (§6.11)", () => {
    resetDuel({ foe: guardianOf(8), usesMagic: true, lossStreak: 0 })
    holdFoe()
    S.ePhase = 2
    foeCasts(MOON, MOON)
    const shot = S.shots.find((s) => s.dir < 0)!
    expect(shot.ls).toBeCloseTo(0.55, 5)
  })
})

describe('Love — the finisher and its gate (§6.9)', () => {
  it('is closed at 3 hits and full HP: the triple softly becomes the double', () => {
    holdFoe()
    S.hitsLanded = 3
    expect(finisherOpen(false)).toBe(false)
    playerCasts(LOVE, LOVE, LOVE)
    expect(S.shots[0]!.k).toBe(1) // heart combo, a field
    expect(S.usedFinisher).toBe(false)
  })

  it('opens at 4 hits landed, or at ≤ 30 % HP — and only once per duel', () => {
    holdFoe()
    S.hitsLanded = 4
    expect(finisherOpen(false)).toBe(true)
    S.hp = 60
    playerCasts(LOVE, LOVE, LOVE)
    expect(S.shots[0]!.k).toBe(3) // the heavy
    expect(S.shots[0]!.dmg).toBe(40)
    expect(S.hp).toBe(85) // +25 flat
    expect(S.usedFinisher).toBe(true)
    S.shots.length = 0
    playerCasts(LOVE, LOVE, LOVE)
    expect(S.shots[0]!.k).toBe(1) // spent: the double again
    resetDuel()
    S.hp = 30
    expect(finisherOpen(false)).toBe(true)
  })

  it("Umbra alone reaches for it, in her phase 3 at a quarter HP (§6.11, §6.13)", () => {
    resetDuel({ foe: guardianOf(9), usesMagic: true, lossStreak: 0 })
    S.eThink = 1e9
    S.ehp = S.ehpMax * 0.45
    run(0.05)
    expect(S.ePhase).toBe(2)
    S.ehp = S.ehpMax * 0.2
    run(0.05)
    expect(S.ePhase).toBe(3)
    expect(S.eWindup).toBeGreaterThan(1.5)
    // Past the wind-up she forms hearts.
    S.eThink = 1e9
    run(2)
    S.eRune = -1
    S.equeue.length = 0
    S.eForm = 0.99
    run(0.1)
    expect(S.equeue).toEqual([LOVE])
  })
})
