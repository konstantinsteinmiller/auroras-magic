// The duel's rules — the spell generator, the elemental graph, the foe
// roster, damage and barriers, the end of a duel, and the story's difficulty
// chain (story-spec §6). Driven through the real sim (`updateSim` at the
// scene's fixed 1/120 s step), with the foe held still where a test needs a
// clean exchange. No coins, no ranks, no shop (D3).

import { beforeEach, describe, expect, it } from 'vitest'
import {
  SPELLS, comboKey, resolveSpell, dominantRune, comboEnumerationIndex, comboFromIndex, COMBO_COUNT,
  elemMul, CTR, MAX_RUNES, FIRE, WIND, ICE, EARTH, NATURE, PH_DUEL, PH_WIN, PH_LOSE
} from '@/game/duel/config'
import { FOES, shadowOf, guardianOf, tierRate } from '@/game/duel/foes'
import { S } from '@/game/duel/state'
import { resetDuel, updateSim, cast, onDuelEvent, dreamDust, onboarding, foeRate } from '@/game/duel/sim'

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
const MOON = 10

beforeEach(() => {
  S.wins = 5 // past onboarding
  S.losses = 0
  S.intro = 0
  S.pops.length = 0
  resetDuel({ foe: 0, usesMagic: false, lossStreak: 0 })
})

describe('the spell generator (§6.2, §6.4)', () => {
  it('keys a combination by its SORTED, DELIMITED runes, so draw order never matters', () => {
    expect(comboKey([ICE, FIRE])).toBe('0.2')
    expect(comboKey([11, 1])).toBe('1.11')
    const a = resolveSpell([ICE, FIRE])
    const b = resolveSpell([FIRE, ICE])
    expect(a.key).toBe('0.2')
    expect(b.key).toBe('0.2')
    expect(a.nameId).toBe(b.nameId)
    expect(a.dmg).toBe(b.dmg)
  })

  it('keeps the golden 22 byte-identical: name, kind, and (below three runes) damage', () => {
    for (const [key, [nameId, kind, dmg]] of Object.entries(SPELLS)) {
      const q = key.split('.').map(Number)
      expect(q.length, key).toBeLessThanOrEqual(MAX_RUNES)
      const sp = resolveSpell(q)
      expect(sp.nameId, key).toBe(nameId)
      expect(sp.kind, key).toBe(kind)
      if (q.length < 3) expect(sp.dmg, key).toBe(dmg)
      else expect(sp.dmg, key).toBeGreaterThanOrEqual(dmg) // the combo bonus only ever lifts
    }
  })

  it('names a new rune by the generator, not by a key of its own', () => {
    const sp = resolveSpell([NATURE])
    expect(sp.nameId).toBeNull()
    expect(sp.dominant).toBe(NATURE)
    expect(sp.count).toBe(1)
  })

  it('lets the dominant rune lead; a tie goes to the last one drawn', () => {
    expect(dominantRune([FIRE, FIRE, WIND])).toBe(FIRE)
    expect(dominantRune([FIRE, ICE])).toBe(ICE)
    expect(dominantRune([ICE, FIRE])).toBe(FIRE)
    // A base-rune dominant keeps its golden name; the minority is a rider.
    expect(resolveSpell([FIRE, FIRE, WIND]).nameId).toBe('fireRain')
  })

  it('never makes three runes worse than 1.5x the best pair inside them (§6.16)', () => {
    for (let i = 90; i < COMBO_COUNT; i++) {
      const q = comboFromIndex(i)
      const sp = resolveSpell(q)
      if (![0, 1, 3, 4].includes(sp.kind) || sp.dmg <= 0) continue
      let best = 0
      for (let j = 0; j < 3; j++) best = Math.max(best, resolveSpell(q.filter((_, k) => k !== j)).dmg)
      expect(sp.dmg, q.join('.')).toBeGreaterThanOrEqual(best * 1.5 - 1e-9)
    }
  })

  it('enumerates all 454 combinations, one index each, round-tripping (§4.3.1)', () => {
    expect(COMBO_COUNT).toBe(454)
    const seen = new Set<string>()
    for (let i = 0; i < COMBO_COUNT; i++) {
      const q = comboFromIndex(i)
      expect(q.length).toBeGreaterThanOrEqual(1)
      expect(q.length).toBeLessThanOrEqual(3)
      expect(comboEnumerationIndex(q)).toBe(i)
      expect(comboEnumerationIndex([...q].reverse())).toBe(i)
      seen.add(comboKey(q))
    }
    expect(seen.size).toBe(COMBO_COUNT)
    expect(comboEnumerationIndex([12])).toBe(-1)
    expect(comboEnumerationIndex([0, 0, 0, 0])).toBe(-1)
  })
})

describe('the elemental graph (§6.6)', () => {
  it('keeps the frozen four as one 4-cycle', () => {
    expect([...CTR.slice(0, 4)].sort()).toEqual([0, 1, 2, 3])
    for (let e = 0; e < 4; e++) expect(CTR[e]).not.toBe(e)
  })

  it('adds cycle B — Moon → Nature → Water → Lightning → Illusion → Moon — and exempts the rest', () => {
    expect(CTR[NATURE]).toBe(MOON)
    expect(CTR[5]).toBe(NATURE)
    expect(CTR[6]).toBe(5)
    expect(CTR[7]).toBe(6)
    expect(CTR[MOON]).toBe(7)
    for (const e of [8, 9, 11]) expect(CTR[e]).toBe(-1)
  })

  it('pays x1.7 for the counter, x0.55 for the same element, x1 otherwise or with no element', () => {
    expect(elemMul(EARTH, FIRE)).toBe(1.7)
    expect(elemMul(FIRE, FIRE)).toBe(0.55)
    expect(elemMul(WIND, FIRE)).toBe(1)
    expect(elemMul(MOON, NATURE)).toBe(1.7)
    expect(elemMul(FIRE, -1)).toBe(1)
  })
})

describe('the foe roster (§6.10–§6.12)', () => {
  it('holds a shadow clone and a Guardian per chapter, by position, then the versus Umbra', () => {
    expect(FOES.length).toBe(21)
    expect(FOES[20]).toMatchObject({ slug: 'umbra', hpMax: 100, element: -1, boss: false })
    for (let c = 0; c < 10; c++) {
      expect(FOES[shadowOf(c)]!.boss).toBe(false)
      expect(FOES[guardianOf(c)]!.boss).toBe(true)
      expect(FOES[shadowOf(c)]!.slug).toBe('shadow')
    }
    expect(FOES[guardianOf(0)]!.slug).toBe('briar')
    expect(FOES[guardianOf(9)]!.slug).toBe('umbra')
  })

  // S4 tuning on the real duel (tests/duel/winRate.test.ts, §7.2's core
  // child): a shadow 100 + 1 a chapter (flat 100 with no weakness), a
  // Guardian 115 + 2 a chapter, tiers every 3 chapters — one gentler where
  // there is no weakness to exploit — at 0.40 / 0.43 / 0.46 runes a second.
  it('grows HP gently by chapter, bosses more; tiers every 3 chapters, gentler with no weakness', () => {
    for (let c = 0; c < 10; c++) {
      const el = FOES[shadowOf(c)]!.element
      expect(FOES[shadowOf(c)]!.hpMax).toBe(el < 0 ? 100 : 100 + c)
      expect(FOES[guardianOf(c)]!.hpMax).toBe(115 + 2 * c)
      expect(FOES[shadowOf(c)]!.aiTier).toBe(Math.max(0, Math.min(2, Math.floor(c / 3)) - (el < 0 ? 1 : 0)))
    }
    ;[0.4, 0.43, 0.46].forEach((r, i) => expect(tierRate(i)).toBeCloseTo(r, 9))
    expect(FOES[guardianOf(0)]!.phase2).toBe('natureRider')
    expect(FOES[shadowOf(0)]!.element).toBe(NATURE)
  })
})

describe('casting and resolution', () => {
  it('a FIRE BOLT flies, lands and takes 8 HP off a neutral foe', () => {
    holdFoe()
    S.queue.push(FIRE)
    cast()
    expect(S.queue).toEqual([])
    expect(S.shots.length).toBe(1)
    run(1)
    expect(S.shots.length).toBe(0)
    expect(S.ehp).toBeCloseTo(S.ehpMax - SPELLS['0']![2], 5)
  })

  it('the counter rune hits the chapter-1 shadow (Nature) for x1.7', () => {
    holdFoe()
    const before = S.ehp
    S.queue.push(MOON)
    cast()
    run(1.5)
    expect(before - S.ehp).toBeCloseTo(resolveSpell([MOON]).dmg * 1.7, 5)
  })

  it('an EARTH WALL on the foe stops a bolt outright', () => {
    holdFoe()
    S.eGuard = 2
    S.eGuardK = 1 // earth: stops everything
    S.queue.push(FIRE)
    cast()
    run(1)
    expect(S.ehp).toBe(S.ehpMax)
    expect(S.pops.some((p) => p.k === 'blocked')).toBe(true)
  })

  it('an ICE PILLAR eats exactly one projectile, then shatters', () => {
    holdFoe()
    S.eGuard = 4
    S.eGuardK = 2
    S.queue.push(FIRE)
    cast()
    run(1)
    expect(S.ehp).toBe(S.ehpMax)
    expect(S.eGuard).toBe(0)
    S.queue.push(FIRE)
    cast()
    run(1)
    expect(S.ehp).toBeLessThan(S.ehpMax)
  })

  it('casting with an empty hand does nothing', () => {
    cast()
    expect(S.shots.length).toBe(0)
  })
})

describe('the end of a duel', () => {
  it('a win ends the fight and fires exactly one finish event — and pays nothing (D3)', () => {
    holdFoe()
    const events: boolean[] = []
    const off = onDuelEvent((e, won) => { if (e === 'finish') events.push(!!won) })
    S.ehp = 1
    S.queue.push(FIRE)
    cast()
    run(2)
    off()
    expect(S.phase).toBe(PH_WIN)
    expect(S.foe).toBe(0) // the campaign, not the sim, decides what comes next
    expect(events).toEqual([true])
    expect('coins' in S).toBe(false)
  })

  it('a loss ends the fight where it stands', () => {
    S.hp = 0.01
    S.burn = 5
    run(0.1)
    expect(S.phase).toBe(PH_LOSE)
    expect(S.foe).toBe(0)
  })

  it('the sky tracks each side\'s HP share while the duel runs', () => {
    holdFoe()
    S.ehp = S.ehpMax * 0.2
    run(3)
    expect(S.sky).toBeGreaterThan(0.8)
  })

  it('a new duel resets the fight but not the meta-progress', () => {
    S.wins = 7
    S.hp = 10
    S.phase = PH_WIN
    resetDuel()
    expect(S.phase).toBe(PH_DUEL)
    expect(S.hp).toBe(S.hpMax)
    expect(S.wins).toBe(7)
    expect(S.foe).toBe(0)
    expect(S.landed).toBe(0)
  })
})

describe('the difficulty chain (§6.14–§6.15)', () => {
  it('Dream Dust eases 8 % per loss in a row, never below 0.6', () => {
    expect(dreamDust(0)).toBe(1)
    expect(dreamDust(1)).toBeCloseTo(0.92)
    expect(dreamDust(5)).toBeCloseTo(0.6)
    expect(dreamDust(8)).toBe(0.6)
    expect(dreamDust(-3)).toBe(1)
  })

  it('onboarding eases the first five duels', () => {
    expect(onboarding(0)).toBeCloseTo(0.7)
    expect(onboarding(5)).toBe(1)
    expect(onboarding(50)).toBe(1)
  })

  it('a duel starts from its node: foe, magic rule, HP per side, and dust', () => {
    resetDuel({ foe: guardianOf(0), usesMagic: true, lossStreak: 2 })
    expect(S.foe).toBe(guardianOf(0))
    expect(S.usesMagic).toBe(true)
    expect(S.ehpMax).toBe(115)
    expect(S.ehp).toBe(115)
    expect(S.hpMax).toBe(100)
    expect(S.dust).toBeCloseTo(0.84)
  })

  it('the foe\'s rate is the product of the chain, floored, and zero in a wind-up', () => {
    resetDuel({ foe: shadowOf(0), usesMagic: false, lossStreak: 3 })
    expect(foeRate()).toBeCloseTo(Math.max(0.25, tierRate(0) * 1 * dreamDust(3)))
    S.eWindup = 1
    expect(foeRate()).toBe(0)
    S.eWindup = 0
    S.dust = 0.01
    expect(foeRate()).toBe(0.25)
  })
})

describe('Water and Lightning (§6.3, §6.8, §6.11, S3)', () => {
  const WATER = 5
  const LIGHTNING = 6

  it('the bubble ward catches bolts, fields and pushes — never a heavy', async () => {
    const { stops } = await import('@/game/duel/sim')
    expect([0, 1, 4].every((k) => stops(3, k))).toBe(true)
    expect(stops(3, 3)).toBe(false)
    expect(stops(3, 5)).toBe(false)
  })

  it('a bubble ward holds for exactly two hits', () => {
    holdFoe()
    S.queue.push(WATER, WATER)
    cast()
    expect(S.guardK).toBe(3)
    expect(S.guardHits).toBe(2)
    expect(S.guard).toBeGreaterThan(4)
    const bolt = (): void => {
      S.shots.push({ x: 820, y: 330, tx: 400, r: 2, k: 0, dmg: 8, dot: 0, slow: 0, dir: -1, w: 0, p: 0, n: 1, delay: 0, life: 0 })
      run(1)
    }
    bolt()
    expect(S.hp).toBe(S.hpMax)
    expect(S.guardHits).toBe(1)
    bolt()
    expect(S.hp).toBe(S.hpMax)
    expect(S.guard).toBe(0)
    bolt()
    expect(S.hp).toBe(S.hpMax - 8)
  })

  it('Lightning pierces every wall, earth included', () => {
    holdFoe()
    S.eGuard = 3
    S.eGuardK = 1
    const before = S.ehp
    S.queue.push(LIGHTNING)
    cast()
    expect(S.shots[0]!.p).toBe(1)
    run(1.5)
    expect(S.ehp).toBeLessThan(before)
    expect(S.pops.some((p) => p.k === 'pierced')).toBe(true)
  })

  it('a Tidal Wave leaves its caster a 1-hit ward for 2 s', () => {
    holdFoe()
    S.queue.push(WATER, WATER, WATER)
    cast()
    expect(S.guardK).toBe(3)
    expect(S.guardHits).toBe(1)
    expect(S.guard).toBeCloseTo(2, 5)
    run(2.2)
    expect(S.guard).toBeLessThanOrEqual(0)
    expect(S.guardHits).toBe(0)
  })

  it("Pearl's phase 2 opens a bubble ward when her wind-up ends", () => {
    resetDuel({ foe: guardianOf(1), usesMagic: true, lossStreak: 0 })
    holdFoe()
    S.ehp = S.ehpMax * 0.49
    run(0.05)
    expect(S.ePhase).toBe(2)
    expect(S.eGuard).toBeLessThanOrEqual(0)
    run(1.9)
    expect(S.eGuardK).toBe(3)
    expect(S.eGuardHits).toBe(2)
  })

  it("Zephyr's phase-2 bolts pierce", () => {
    resetDuel({ foe: guardianOf(2), usesMagic: true, lossStreak: 0 })
    S.ePhase = 2
    S.eWindup = 0
    S.guard = 3
    S.guardK = 1
    S.hp = 5 // an ICE BOLT in her hand is now a finisher: she throws it at once
    S.equeue.length = 0
    S.equeue.push(ICE as never)
    S.eThink = 0
    S.eForm = 0
    S.eRune = ICE
    run(0.05)
    const shot = S.shots.find((s) => s.dir < 0)
    expect(shot?.p).toBe(1)
  })

  it('every magic has its AI contract (all built at S4), and every boss a phase 2', async () => {
    const { AI_CONTRACTS } = await import('@/game/duel/foes')
    expect(AI_CONTRACTS.length).toBe(10)
    expect(AI_CONTRACTS.every((c) => c.built)).toBe(true)
    expect(Array.from({ length: 10 }, (_, c) => FOES[guardianOf(c)]!.phase2)).toEqual([
      'natureRider', 'wardOpen', 'pierceBolts', 'crystalLong', 'twoDecoys',
      'prismGlow', 'slowDouble', 'frostResist', 'lifestealUp', 'umbraFalter'
    ])
    // The two player-only magics are never cast by a foe (C14).
    expect(AI_CONTRACTS.filter((c) => c.aiOnly).map((c) => c.magic)).toEqual(['wildcard', 'frostLock'])
  })
})
