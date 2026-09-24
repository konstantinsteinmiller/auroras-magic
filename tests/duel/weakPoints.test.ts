// Every ward has a weak point, and three rare spells linger (owner,
// 2026-09-23; story-spec §8.35). Driven through the real sim at the scene's
// fixed 1/120 s step, with the foe held still wherever a test needs a clean
// exchange — the same harness shape as `rules.test.ts`.

import { beforeEach, describe, expect, it } from 'vitest'
import {
  FIRE, WIND, ICE, EARTH, NATURE, WATER, LIGHTNING, PH_DUEL, PH_LOSE, SPELLS, LINGER_SECS, LINGER_SPELLS,
  resolveSpell, totalDamage, type Rune
} from '@/game/duel/config'
import { VERSUS_FOE, shadowOf } from '@/game/duel/foes'
import { S, type Shot } from '@/game/duel/state'
import { AFK_S } from '@/game/duel/director'
import { resetDuel, updateSim, cast, stops, seep, fromAbove, WEAK_POINTS, duelTally } from '@/game/duel/sim'
import { castNow, pressFoe } from './forged'

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
/** Give the foe a ward of flavour `gk`, long enough to outlast the test. */
const wardFoe = (gk: number, secs = 6, hits = 0): void => {
  S.eGuard = secs
  S.eGuardK = gk
  S.eGuardHits = hits
}
/** Cast `q` at a held foe — its forge runs out (§8.37) — and let it land;
 *  what came off her bar. */
const land = (q: number[], secs = 2.2): number => {
  const before = S.ehp
  S.queue.push(...(q as Rune[]))
  castNow()
  run(secs)
  return before - S.ehp
}
/** A foe's shot aimed at the player, pushed straight into the air. */
const incoming = (over: Partial<Shot>): void => {
  S.shots.push({
    x: 820, y: 330, tx: 400, r: FIRE as Rune, k: 0, dmg: 20, dot: 0, slow: 0, dir: -1, w: 0, p: 0, n: 1,
    delay: 0, life: 0, b: 20, ls: 0, sp: 0, rf: 0, ...over
  })
}

beforeEach(() => {
  S.wins = 5 // past onboarding
  S.losses = 0
  S.intro = 0
  S.pops.length = 0
  S.campaign.runesUnlocked = 0xfff
  S.campaign.signaturesUnlocked = 0
  // A NEUTRAL foe (versus Umbra's roster row has no element), so every number
  // below is the spell's own and no weakness multiplies it. Not versus: the
  // foe is still an NPC, just one held still.
  resetDuel({ foe: VERSUS_FOE, usesMagic: false, lossStreak: 0 })
  holdFoe()
})

describe('the weak-point table (§8.35)', () => {
  it('gives the owner\'s two examples exactly', () => {
    // "a water spell raining from above … penetrate earth wall with 50 %"
    expect(seep(1, 3, WATER)).toBe(0.5)
    expect(seep(1, 1, WATER)).toBe(0.5)
    // …from ABOVE: a water bolt thrown straight at the wall does not.
    expect(seep(1, 0, WATER)).toBe(0)
    // "the wind shield … still take 25 % damage from hard projectiles like
    // earth attacks or frost attacks"
    expect(seep(0, 0, EARTH)).toBe(0.25)
    expect(seep(0, 0, ICE)).toBe(0.25)
    expect(seep(0, 3, EARTH)).toBe(0.25)
    expect(seep(0, 0, FIRE)).toBe(0)
  })

  it('extends the same logic: fire melts a pillar, a rock cracks crystal, the bubble keeps its old two', () => {
    expect(seep(2, 0, FIRE)).toBe(0.5)
    expect(seep(2, 0, ICE)).toBe(0)
    expect(seep(4, 0, EARTH)).toBe(0.5)
    expect(seep(4, 0, FIRE)).toBe(0)
    for (let r = 0; r < 12; r++) for (const k of [0, 1, 3, 4]) expect(seep(3, k, r), `bubble ${r}/${k}`).toBe(0)
  })

  it('reads "from above" off the trajectory the duel already has: fields and heavies fall', () => {
    expect([0, 1, 2, 3, 4].map(fromAbove)).toEqual([false, true, false, true, false])
  })

  it('leaves every ward at least two answers, and none of them a full block of everything', () => {
    for (let gk = 0; gk <= 4; gk++) {
      // Lightning's pierce answers every ward (§6.8 rule 1); on top of it,
      // either a weak point or a kind of spell the ward never stopped.
      const weak = WEAK_POINTS.some((w) => w.ward === gk)
      const gap = [0, 1, 3, 4].some((k) => !stops(gk, k))
      expect(weak || gap, `ward ${gk}`).toBe(true)
    }
  })
})

describe('a weak point, in the duel (§8.35)', () => {
  it('rain soaks through an earth wall: a Water heavy lands at half, and the wall stands', () => {
    const open = land([WATER, WATER, WATER])
    resetDuel()
    holdFoe()
    wardFoe(1)
    const walled = land([WATER, WATER, WATER])
    expect(open).toBeGreaterThan(0)
    expect(walled).toBeCloseTo(open * 0.5, 5)
    expect(S.eGuard, 'the wall is still up').toBeGreaterThan(0)
    expect(duelTally.seep).toBe(1)
    // It does NOT say "blocked" — something got through, and she can see it.
    expect(S.pops.some((p) => p.k === 'blocked')).toBe(false)
  })

  it('an earth wall still stops a water BOLT outright', () => {
    wardFoe(1)
    expect(land([WATER])).toBe(0)
    expect(duelTally.seep).toBe(0)
  })

  it('a hard shot blows a quarter through a wind wall', () => {
    const open = land([EARTH, EARTH])
    resetDuel()
    holdFoe()
    wardFoe(0)
    const walled = land([EARTH, EARTH])
    expect(walled).toBeCloseTo(open * 0.25, 5)
    expect(S.eGuard).toBeGreaterThan(0)
  })

  it('fire melts through an ice pillar at half — and the pillar is spent', () => {
    const open = land([FIRE])
    resetDuel()
    holdFoe()
    wardFoe(2, 4)
    const walled = land([FIRE])
    expect(walled).toBeCloseTo(open * 0.5, 5)
    expect(S.eGuard).toBe(0)
  })

  it('a rock cracks a crystal ward: half comes through and NOTHING bounces back', () => {
    const open = land([EARTH, EARTH])
    resetDuel()
    holdFoe()
    wardFoe(4, 5)
    const walled = land([EARTH, EARTH], 0.6)
    expect(walled).toBeCloseTo(open * 0.5, 5)
    expect(S.eGuard, 'the crystal shattered').toBe(0)
    expect(S.shots.length, 'no reflected shot').toBe(0)
    expect(S.hp).toBe(S.hpMax)
  })

  it('any other spell still bounces off a crystal ward (§6.5 unchanged)', () => {
    wardFoe(4, 5)
    S.queue.push(FIRE as Rune)
    castNow()
    run(0.6)
    expect(S.ehp).toBe(S.ehpMax)
    expect(S.pops.some((p) => p.k === 'reflected')).toBe(true)
  })

  it('what comes through is damage only — the ward still took the riders', () => {
    // Wet Ball drawn Fire-then-Ice flies as ICE (hard), and carries a slow.
    wardFoe(0)
    const got = land([FIRE, ICE])
    expect(got).toBeCloseTo(SPELLS['0.2']![2] * 0.25, 5)
    expect(S.eSlow, 'no slow came through').toBe(0)
  })

  it('a pierce still goes straight through, whole (§6.8 rule 1)', () => {
    const open = land([LIGHTNING])
    resetDuel()
    holdFoe()
    wardFoe(1)
    expect(land([LIGHTNING])).toBeCloseTo(open, 5)
    expect(duelTally.seep).toBe(0)
  })

  it('a seep on the PLAYER still stops at the mercy floor', () => {
    S.guard = 6
    S.guardK = 0
    S.hp = S.hpMax * 0.1 + 0.5
    // A foe's Earth shot into the player's wind wall: a quarter of 80 is 20,
    // four times what is left above the floor.
    incoming({ r: EARTH as Rune, k: 0, dmg: 80, b: 80 })
    run(1)
    expect(duelTally.seep).toBe(1)
    expect(S.hp).toBeCloseTo(S.hpMax * 0.1, 5)
    expect(S.phase).toBe(PH_DUEL)
  })

  it('the foe does not throw her hand away for an earth wall a Water heavy would only halve', () => {
    // A tier-2 foe reads the player's slots (§6.13) — and, the player well
    // ahead, means to wall what she reads (§8.37's `wardWill`).
    resetDuel({ foe: shadowOf(7), usesMagic: false, lossStreak: 0 })
    pressFoe()
    const think = (queue: number[]): number[] => {
      S.queue.length = 0
      S.queue.push(...(queue as Rune[]))
      S.equeue.length = 0
      S.equeue.push(FIRE as Rune)
      S.eGuard = 0
      S.eThink = 0
      S.eForm = 0
      S.eRune = FIRE
      updateSim(STEP)
      return [...S.equeue]
    }
    // Against a Fire field she dumps her bolt to commit to a wall…
    expect(think([FIRE, FIRE])).toEqual([])
    expect(S.eRune).toBe(EARTH)
    // …against rain from above she keeps building.
    expect(think([WATER, WATER, WATER])).toEqual([FIRE])
  })
})

describe('the lingering spells (§8.35)', () => {
  it('are three named three-rune spells: an element twice, and one Nature', () => {
    const want: [number[], string, number][] = [
      [[FIRE, FIRE, NATURE], 'wildfire', FIRE],
      [[ICE, ICE, NATURE], 'frostbite', ICE],
      [[EARTH, NATURE, NATURE], 'bramble', NATURE]
    ]
    for (const [q, name, look] of want) {
      for (const order of [q, [...q].reverse()]) {
        const sp = resolveSpell(order)
        expect(sp.nameId, order.join('.')).toBe(name)
        expect(sp.linger).toEqual([1.7, LINGER_SECS])
        expect(sp.lingerLook).toBe(look)
      }
    }
    expect(LINGER_SPELLS).toHaveLength(3)
    // Nothing else lingers — except where a Rainbow completes one of the
    // three, which is exactly what a Rainbow does with a named spell (§6.20).
    const lingering: string[] = []
    for (let a = 0; a < 12; a++) {
      for (let b = a; b < 12; b++) {
        for (let c = b; c < 12; c++) {
          const sp = resolveSpell([a, b, c])
          if (sp.linger) lingering.push(sp.wild ? `${sp.key}→${sp.nameId}` : sp.key)
        }
      }
    }
    expect(lingering.filter((k) => !k.includes('→'))).toEqual(['0.0.4', '2.2.4', '3.4.4'])
    expect(lingering.filter((k) => k.includes('→'))).toEqual(['0.4.8→wildfire', '2.4.8→frostbite', '3.4.8→bramble'])
  })

  it('do a bit more than a three-rune hit — over twenty seconds', () => {
    const fireRain = SPELLS['0.0.0']![2]
    for (const lg of LINGER_SPELLS) {
      const total = totalDamage({ dmg: lg.dmg, linger: lg.riders.linger })
      expect(total / fireRain, lg.nameId).toBeGreaterThanOrEqual(1.1)
      expect(total / fireRain, lg.nameId).toBeLessThanOrEqual(1.3)
    }
  })

  it('tick for twenty seconds and then stop — exactly their number, in versus where nothing scales it', () => {
    resetDuel({ foe: VERSUS_FOE, usesMagic: false, lossStreak: 0, versus: true })
    // Drawn Nature-then-Fire-Fire: the lead is FIRE, the spell is Wildfire.
    S.queue.push(NATURE as Rune, FIRE as Rune, FIRE as Rune)
    castNow()
    run(0.8)
    expect(S.eLinger).toBeGreaterThan(LINGER_SECS - 0.5)
    const hit = S.ehpMax - S.ehp
    run(LINGER_SECS + 1)
    expect(S.eLinger).toBeLessThanOrEqual(0)
    expect(S.ehpMax - S.ehp).toBeCloseTo(4 + 1.7 * LINGER_SECS, 3)
    expect(hit).toBeLessThan(10)
  })

  it('refresh rather than stack', () => {
    resetDuel({ foe: VERSUS_FOE, usesMagic: false, lossStreak: 0, versus: true })
    S.queue.push(NATURE as Rune, FIRE as Rune, FIRE as Rune)
    castNow()
    // 3.5 s, and the second cast's own 1.5 s forge: five seconds between
    // the two landings.
    run(3.5)
    S.queue.push(NATURE as Rune, FIRE as Rune, FIRE as Rune)
    castNow()
    run(0.8)
    expect(S.eLinger, 'the clock restarted').toBeGreaterThan(LINGER_SECS - 0.5)
    expect(S.eLingerRate, 'one rate, not two').toBeCloseTo(1.7, 9)
    run(LINGER_SECS + 1)
    // Two hits, and 25 s of ONE linger (5 before the refresh, 20 after).
    expect(S.ehpMax - S.ehp).toBeCloseTo(8 + 1.7 * (LINGER_SECS + 5), 0)
  })

  it('wash off with Water — the victim casts anything with Water in it', () => {
    // A field hangs over its target and falls (`delay`).
    incoming({ r: FIRE as Rune, k: 1, dmg: 4, b: 4, delay: 0.3, lg: 1.7, lgT: LINGER_SECS, lgR: FIRE })
    run(0.5)
    expect(S.linger).toBeGreaterThan(0)
    expect(S.lingerLook).toBe(FIRE)
    S.queue.push(WATER as Rune)
    castNow()
    expect(S.linger).toBe(0)
  })

  it('cannot take a player who is still playing past the mercy floor', () => {
    S.hp = S.hpMax * 0.1 + 1
    S.linger = LINGER_SECS
    S.lingerRate = 6
    S.lingerLook = ICE
    // Present: she casts now and then, so the AFK rule never lifts the floor.
    for (let i = 0; i < 4; i++) {
      S.queue.push(WIND as Rune)
      cast()
      run(2)
    }
    expect(S.hp).toBeCloseTo(S.hpMax * 0.1, 5)
    expect(S.phase).toBe(PH_DUEL)
  })

  it('…and does finish one who has put the phone down (the AFK rule)', () => {
    S.hp = S.hpMax * 0.1 + 1
    S.linger = LINGER_SECS
    S.lingerRate = 6
    // Held at the floor until the idle clock runs out, then finished — the
    // trade eases the foe's scale while she is that far ahead, so allow it
    // a few seconds past the threshold.
    run(AFK_S + 6)
    expect(S.phase).toBe(PH_LOSE)
  })

  it('are only their hit when a crystal ward sends them back', () => {
    resetDuel({ foe: VERSUS_FOE, usesMagic: false, lossStreak: 0, versus: true })
    S.eGuard = 5
    S.eGuardK = 4
    S.queue.push(NATURE as Rune, FIRE as Rune, FIRE as Rune)
    castNow()
    run(3)
    expect(S.pops.some((p) => p.k === 'reflected')).toBe(true)
    expect(S.linger, 'no linger came back with it').toBe(0)
    expect(S.eLinger).toBe(0)
  })

  it('the foe, cast by her, lands on the player like any spell', () => {
    // castSide(true) is the right-hand duelist's cast — here the NPC's hand.
    S.equeue.push(ICE as Rune, ICE as Rune, NATURE as Rune)
    castNow(true)
    run(1)
    expect(S.linger).toBeGreaterThan(0)
    expect(S.lingerLook).toBe(ICE)
  })
})
