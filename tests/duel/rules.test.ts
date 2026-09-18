// The duel's rules — spell matrix, the elemental ladder, damage, barriers,
// the end of a duel and the shop. Driven through the real sim (`updateSim` at
// the scene's fixed 1/120 s step), with the foe held still where a test needs
// a clean exchange.

import { beforeEach, describe, expect, it } from 'vitest'
import {
  SPELLS, WILD, spellFor, comboKey, elemMul, CTR, FOES, winCoins, rankPrice, MAX_RUNES,
  FIRE, WIND, ICE, EARTH, PH_DUEL, PH_WIN, PH_LOSE, RANK_BONUS
} from '@/game/duel/config'
import { S } from '@/game/duel/state'
import { resetDuel, updateSim, cast, buyRank, onDuelEvent } from '@/game/duel/sim'

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

beforeEach(() => {
  S.foe = 0
  S.coins = 0
  S.up = [0, 0, 0, 0]
  S.wins = 1 // not the eased first duel
  S.losses = 0
  S.intro = 0
  S.pops.length = 0
  resetDuel()
})

describe('the spell matrix', () => {
  it('keys a combination by its SORTED runes, so draw order never matters', () => {
    expect(comboKey([ICE, FIRE])).toBe('02')
    expect(spellFor([ICE, FIRE])).toBe(SPELLS['02'])
    expect(spellFor([FIRE, ICE])).toBe(SPELLS['02'])
  })

  it('every key is reachable — no combination longer than the hand', () => {
    for (const k of Object.keys(SPELLS)) expect(k.length).toBeLessThanOrEqual(MAX_RUNES)
  })

  it('falls back to WILD SURGE for an unlisted combination', () => {
    expect(spellFor([FIRE, FIRE, WIND])).toBe(WILD)
  })
})

describe('the elemental ladder', () => {
  it('is one 4-cycle: every element has exactly one counter', () => {
    expect([...CTR].sort()).toEqual([0, 1, 2, 3])
    for (let e = 0; e < 4; e++) expect(CTR[e]).not.toBe(e)
  })

  it('pays x1.7 for the counter, x0.55 for the same element, x1 otherwise', () => {
    expect(elemMul(EARTH, FIRE)).toBe(1.7)
    expect(elemMul(FIRE, FIRE)).toBe(0.55)
    expect(elemMul(WIND, FIRE)).toBe(1)
  })

  it('has no weakness to exploit on the first and the last rung', () => {
    expect(FOES[0]![1]).toBe(-1)
    expect(FOES[FOES.length - 1]![1]).toBe(-1)
    expect(elemMul(FIRE, -1)).toBe(1)
  })

  it('pays more further up — the reward curve outruns the difficulty curve', () => {
    for (let f = 1; f < FOES.length; f++) expect(winCoins(f)).toBeGreaterThan(winCoins(f - 1))
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
    expect(S.ehp).toBeCloseTo(100 - SPELLS['0']![2], 5)
  })

  it('element ranks scale the player\'s damage by +12% each', () => {
    holdFoe()
    S.up[FIRE] = 2
    S.queue.push(FIRE)
    cast()
    run(1)
    expect(S.ehp).toBeCloseTo(100 - 8 * (1 + 2 * RANK_BONUS), 5)
  })

  it('an EARTH WALL on the foe stops a bolt outright', () => {
    holdFoe()
    S.eGuard = 2
    S.eGuardK = 1 // earth: stops everything
    S.queue.push(FIRE)
    cast()
    run(1)
    expect(S.ehp).toBe(100)
    expect(S.pops.some((p) => p.k === 'blocked')).toBe(true)
  })

  it('an ICE PILLAR eats exactly one projectile, then shatters', () => {
    holdFoe()
    S.eGuard = 4
    S.eGuardK = 2
    S.queue.push(FIRE)
    cast()
    run(1)
    expect(S.ehp).toBe(100)
    expect(S.eGuard).toBe(0)
    S.queue.push(FIRE)
    cast()
    run(1)
    expect(S.ehp).toBeLessThan(100)
  })

  it('casting with an empty hand does nothing', () => {
    cast()
    expect(S.shots.length).toBe(0)
  })
})

describe('the end of a duel', () => {
  it('a win pays coins, climbs the ladder, and fires exactly one finish event', () => {
    holdFoe()
    const events: boolean[] = []
    const off = onDuelEvent((e, won) => { if (e === 'finish') events.push(!!won) })
    S.ehp = 1
    S.queue.push(FIRE)
    cast()
    run(2)
    off()
    expect(S.phase).toBe(PH_WIN)
    expect(S.coins).toBe(winCoins(0))
    expect(S.lastPay).toBe(winCoins(0))
    expect(S.foe).toBe(1)
    expect(events).toEqual([true])
  })

  it('a loss pays nothing and keeps the rung', () => {
    S.hp = 0.01
    S.burn = 5
    run(0.1)
    expect(S.phase).toBe(PH_LOSE)
    expect(S.coins).toBe(0)
    expect(S.foe).toBe(0)
  })

  it('the sky tracks the HP balance while the duel runs', () => {
    holdFoe()
    S.ehp = 20
    run(3)
    expect(S.sky).toBeGreaterThan(0.8)
  })

  it('a new duel resets the fight but not the meta-progress', () => {
    S.coins = 30
    S.foe = 2
    S.hp = 10
    S.phase = PH_WIN
    resetDuel()
    expect(S.phase).toBe(PH_DUEL)
    expect(S.hp).toBe(100)
    expect(S.coins).toBe(30)
    expect(S.foe).toBe(2)
  })
})

describe('the element shop', () => {
  it('prices each rank off the rank already held, and refuses what it cannot afford', () => {
    S.coins = 25
    expect(buyRank(FIRE, rankPrice)).toBe(true) // 10
    expect(S.coins).toBe(15)
    expect(buyRank(FIRE, rankPrice)).toBe(false) // 20 > 15
    expect(S.up[FIRE]).toBe(1)
    expect(buyRank(ICE, rankPrice)).toBe(true) // a fresh lane is 10 again
    expect(S.coins).toBe(5)
  })
})
