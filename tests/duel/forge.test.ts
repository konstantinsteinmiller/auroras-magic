/**
 * THE SPELL FORGE AND THE CAST LOCK (owner, 2026-09-24; story-spec §8.37).
 *
 * "The consumed runes are forging together into one spell flowing from the
 * rune slots into the unicorn's horn … a full 1.5 seconds of spell release
 * delay, meaning the player cannot release another spell until the current
 * one is cast and gone." On the real sim, at the scene's fixed 1/120 s step:
 * the forge's exact length on both sides, the lock and what ends it, drawing
 * through it, the refusal signal the HUD reads, the foe's forge as her
 * warning, reduced motion, versus, and the QA readout.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  let s = 20260924
  Math.random = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
})

import {
  AX, UX, GY, EARTH, FIRE, ICE, WIND, NO_EASE, PH_DUEL, PH_WIN, resolveSpell, type Rune
} from '@/game/duel/config'
import { VERSUS_FOE, shadowOf } from '@/game/duel/foes'
import { duelSetup } from '@/game/campaign/tables'
import { S, type Shot } from '@/game/duel/state'
import {
  cast, castBusy, castSide, foeTell, forgeReadout, lastPlayerCast, onDuelEvent, resetDuel, strokeEnd, strokeMove,
  strokeStart, updateSim
} from '@/game/duel/sim'
import { AFK_S, afk } from '@/game/duel/director'
import { BEAT, FORGE_S, MERGE_Y, hornGlow, mergeX, orbAt, runeAt } from '@/game/duel/forge'
import { DRAWN, realize, stream } from './rune-draws'
import { STEP, castNow, forged } from './forged'

/** Steps in a forge at the scene's step: 180. */
const FORGE_STEPS = Math.round(FORGE_S / STEP)
const run = (secs: number): void => {
  for (let i = 0; i < Math.round(secs / STEP); i++) updateSim(STEP)
}
const holdFoe = (): void => {
  S.eThink = 1e9
  S.eForm = 0
  S.equeue.length = 0
}
/** The side's spells in the air. */
const mine = (): Shot[] => S.shots.filter((s) => s.dir > 0)
const hers = (): Shot[] => S.shots.filter((s) => s.dir < 0)

/** A neutral foe, held still unless a test lets her go. */
const open = (versus = false): void => {
  S.wins = 20
  S.losses = 0
  S.intro = 0
  S.pops.length = 0
  S.campaign.runesUnlocked = 0xfff
  S.campaign.signaturesUnlocked = 0
  if (versus) resetDuel({ foe: VERSUS_FOE, usesMagic: false, lossStreak: 0, versus: true })
  else resetDuel({ foe: VERSUS_FOE, usesMagic: false, lossStreak: 0, ease: { ...NO_EASE } })
  holdFoe()
}

beforeEach(() => open())

describe('the forge takes exactly 1.5 s of sim time, on both sides (§8.37)', () => {
  it('the player: the runes leave the slots at the press, the spell leaves the horn 180 steps later', () => {
    S.queue.push(FIRE as Rune, ICE as Rune)
    cast()
    expect(S.queue, 'the slots are free at once').toEqual([])
    expect(S.forge.t).toBe(0)
    expect(S.forge.q).toEqual([FIRE, ICE])
    expect(S.forge.lead).toBe(resolveSpell([FIRE, ICE]).lead)
    for (let i = 0; i < FORGE_STEPS - 1; i++) {
      holdFoe()
      updateSim(STEP)
    }
    expect(mine().length, 'one step short: still forging').toBe(0)
    expect(S.forge.t).toBeGreaterThan(FORGE_S - 2 * STEP)
    updateSim(STEP)
    expect(mine().length, 'at 1.5 s it leaves').toBe(1)
    expect(S.forge.t).toBe(-1)
    expect(S.forge.q).toEqual([])
  })

  it('the foe: the same 1.5 s, from her own slots to her own horn', () => {
    S.equeue.push(FIRE as Rune, FIRE as Rune)
    castSide(true)
    expect(S.equeue).toEqual([])
    expect(S.eForge.t).toBe(0)
    for (let i = 0; i < FORGE_STEPS - 1; i++) updateSim(STEP)
    expect(hers().length).toBe(0)
    updateSim(STEP)
    expect(hers().length).toBe(1)
    expect(S.eForge.t).toBe(-1)
  })

  it('is SIM time: a hit-stop holds the forge with everything else', () => {
    S.queue.push(FIRE as Rune)
    cast()
    run(0.5)
    const t = S.forge.t
    S.stop = 0.05
    for (let i = 0; i < 6; i++) updateSim(STEP)
    expect(S.forge.t, 'held').toBeCloseTo(t, 9)
    forged()
    expect(mine().length).toBe(1)
  })

  it('a ward rises, and a decoy stands up, at the end of its forge — not at the press', () => {
    S.queue.push(EARTH as Rune) // a lone Earth: a wall
    expect(resolveSpell([EARTH]).kind).toBe(2)
    cast()
    expect(S.guard).toBe(0)
    run(FORGE_S - 0.05)
    expect(S.guard, 'not yet').toBe(0)
    forged()
    expect(S.guard, 'up').toBeGreaterThan(0)
    S.queue.push(7 as Rune, 7 as Rune) // Illusion, Illusion: a decoy
    cast()
    expect(S.decoy).toBe(0)
    forged()
    expect(S.decoy).toBeGreaterThan(0)
  })
})

describe('the cast lock (§8.37)', () => {
  it('refuses a second cast until the shot is gone — and keeps her runes', () => {
    S.queue.push(FIRE as Rune)
    S.t = 10
    cast()
    // Mid-forge: she has drawn another rune and presses again.
    run(0.5)
    S.queue.push(ICE as Rune)
    S.t = 11
    cast()
    expect(S.castRefusedWhy).toBe('busy')
    expect(S.castRefusedAt).toBe(11)
    expect(S.queue, 'the rune stays in her slot').toEqual([ICE])
    expect(castBusy(false)).toBe(true)
    // Released, and still in the air: still locked.
    forged()
    expect(mine().length).toBe(1)
    S.t = 12
    cast()
    expect(S.castRefusedAt).toBe(12)
    expect(S.forge.t).toBe(-1)
    // Landed: the lock is gone, and the next cast forges.
    for (let i = 0; i < 240 && mine().length; i++) updateSim(STEP)
    expect(mine().length).toBe(0)
    expect(castBusy(false)).toBe(false)
    cast()
    expect(S.forge.t).toBe(0)
    expect(S.forge.q).toEqual([ICE])
  })

  it('holds through a heavy\'s whole hang before it falls', () => {
    S.queue.push(FIRE as Rune, FIRE as Rune, FIRE as Rune) // Fire Rain: hangs 1.7 s
    castNow()
    expect(mine()[0]!.delay).toBeGreaterThan(1.5)
    run(1.5)
    expect(castBusy(false), 'still hanging').toBe(true)
    run(0.4)
    expect(mine().length).toBe(0)
    expect(castBusy(false), 'fallen').toBe(false)
  })

  it('ends at the release for a ward or a decoy — nothing flies', () => {
    S.queue.push(EARTH as Rune)
    castNow()
    expect(castBusy(false)).toBe(false)
  })

  it('a shot a Crystal Ward sends back holds nobody\'s lock', () => {
    S.eGuard = 6
    S.eGuardK = 4
    S.queue.push(FIRE as Rune)
    castNow()
    for (let i = 0; i < 120 && !S.shots.some((s) => s.rf); i++) updateSim(STEP)
    expect(S.shots.some((s) => s.rf === 1 && s.dir < 0), 'coming back at her').toBe(true)
    expect(castBusy(false), 'her own spell is gone').toBe(false)
    expect(castBusy(true), 'and it is not the foe\'s either').toBe(false)
  })

  it('a shot that never lands lets go when it fizzles', () => {
    S.shots.push({
      x: AX + 59, y: GY - 170, tx: 1e6, r: FIRE as Rune, k: 0, dmg: 1, dot: 0, slow: 0, dir: 1, w: 0, p: 0, n: 1,
      delay: 0, life: 0, b: 1, ls: 0, sp: 0, rf: 0, lk: 1
    })
    expect(castBusy(false)).toBe(true)
    run(4.2)
    expect(castBusy(false)).toBe(false)
  })

  it('lets her DRAW through it: a rune drawn mid-forge is stored in the freed slot', () => {
    S.queue.push(FIRE as Rune, FIRE as Rune, FIRE as Rune)
    cast()
    run(0.3)
    const rnd = stream(37)
    const p = realize(DRAWN.fire!(rnd), { sx: 110, sy: 110 }, rnd)
    strokeStart(p[0]!, p[1]!)
    for (let i = 2; i < p.length; i += 2) strokeMove(p[i]!, p[i + 1]!)
    strokeEnd()
    expect(S.queue, 'stored').toEqual([FIRE])
    expect(S.forge.t, 'and the forge ran on').toBeGreaterThan(0.3 - 1e-9)
  })

  it('counts as activity for the AFK rule: a hanging heavy is not a player who left', () => {
    run(AFK_S - 2)
    S.queue.push(FIRE as Rune, FIRE as Rune, FIRE as Rune)
    cast()
    // The forge and the hang: 3.2 s of lock, and then 7 more quiet seconds.
    run(3.2 + 7)
    expect(afk(), 'idle only since the spell landed').toBe(false)
    run(3.6)
    expect(afk()).toBe(true)
  })
})

describe('the refusal signal (§8.37) — the HUD\'s contract', () => {
  it('says empty, busy or lesson — for the player only', () => {
    expect(S.castRefusedAt).toBe(-1)
    expect(S.castRefusedWhy).toBe('')
    S.t = 1
    cast()
    expect([S.castRefusedAt, S.castRefusedWhy]).toEqual([1, 'empty'])
    S.queue.push(FIRE as Rune)
    cast()
    S.queue.push(FIRE as Rune)
    S.t = 2
    cast()
    expect([S.castRefusedAt, S.castRefusedWhy]).toEqual([2, 'busy'])
    // The foe's refusals are her own business.
    S.t = 3
    castSide(true)
    S.equeue.push(FIRE as Rune)
    castSide(true)
    castSide(true)
    expect(S.castRefusedAt).toBe(2)
    // The first duel's lesson holds the cast shut outside its cast beats.
    S.intro = 1
    resetDuel()
    holdFoe()
    S.queue.push(EARTH as Rune)
    S.t = 4
    cast()
    expect([S.castRefusedAt, S.castRefusedWhy]).toEqual([4, 'lesson'])
    expect(S.forge.t).toBe(-1)
    S.intro = 0
    resetDuel()
    expect([S.castRefusedAt, S.castRefusedWhy], 'a new duel starts clean').toEqual([-1, ''])
  })

  it('a frozen hand is busy, too', () => {
    open(true)
    S.frozen = 2
    S.queue.push(FIRE as Rune)
    cast()
    expect(S.castRefusedWhy).toBe('busy')
  })
})

describe('the press is the cast the child made (§8.37)', () => {
  it('the spellbook, the lesson and the first-cast beat hear it at the press; the name shows during the forge', () => {
    let casts = 0
    const off = onDuelEvent((e) => { if (e === 'cast') casts++ })
    S.pops.length = 0
    S.queue.push(FIRE as Rune, EARTH as Rune)
    cast()
    off()
    expect(casts).toBe(1)
    expect(lastPlayerCast().key).toBe(resolveSpell([FIRE, EARTH]).key)
    const name = S.pops.find((p) => p.k === 'spell')
    expect(name, 'the spell name rises at the press').toBeDefined()
    expect([name!.x, name!.y]).toEqual([640, 250])
    // The foe's rises a line below, so two at once never sit on each other.
    S.equeue.push(FIRE as Rune)
    castSide(true)
    const hersName = S.pops.filter((p) => p.k === 'spell').at(-1)!
    expect(hersName.y - name!.y).toBeGreaterThanOrEqual(60)
    expect(mine().length).toBe(0)
  })

  it('a Frost Lock landing mid-forge takes the forge with the hand', () => {
    S.campaign.signaturesUnlocked = 0b10
    resetDuel({ foe: shadowOf(7), usesMagic: true, lossStreak: 0 })
    holdFoe()
    S.queue.push(ICE as Rune, WIND as Rune, ICE as Rune) // Frost Lock
    cast()
    run(0.3)
    // She starts hers 0.3 s after: the ice lands while hers still forges.
    S.equeue.push(FIRE as Rune, FIRE as Rune, FIRE as Rune)
    castSide(true)
    run(0.2)
    expect(S.eForge.t).toBeGreaterThan(0)
    forged()
    expect(S.eFrozen).toBeGreaterThan(0)
    expect(S.eForge.t, 'her forge is gone').toBe(-1)
    run(2)
    expect(hers().length, 'and nothing ever left her horn').toBe(0)
  })

  it('a duel that ends mid-forge releases nothing', () => {
    S.queue.push(FIRE as Rune)
    cast()
    run(0.4)
    S.ehp = 0.1
    run(0.1)
    expect(S.phase).toBe(PH_WIN)
    expect(S.forge.t).toBe(-1)
    run(2)
    expect(S.shots.length).toBe(0)
  })
})

describe('the foe\'s forge IS her warning (§8.37 replaces §8.36\'s wind-up)', () => {
  const letGo = (node: number): void => {
    S.campaign.runesUnlocked = 0xf
    const { foe } = duelSetup(node)
    resetDuel({ foe, usesMagic: false, lossStreak: 0, ease: { ...NO_EASE } })
  }

  it('a full hand that will hit goes into her forge on her next thought, and leaves 1.5 s later', () => {
    letGo(4)
    S.equeue.push(FIRE as Rune, FIRE as Rune)
    expect(foeTell(), 'two runes of a hit: the soft glow').toBe(1)
    S.equeue.push(FIRE as Rune)
    expect(foeTell(), 'full').toBe(2)
    S.eThink = 0
    S.eForm = 0
    updateSim(STEP)
    expect(S.eForge.t, 'forging').toBeGreaterThanOrEqual(0)
    expect(S.eForge.q).toEqual([FIRE, FIRE, FIRE])
    expect(S.equeue, 'her slots emptied').toEqual([])
    expect(foeTell(), 'the forge is the warning now').toBe(0)
    let t = STEP
    while (S.eForge.t >= 0 && t < 3) {
      updateSim(STEP)
      t += STEP
    }
    expect(t).toBeCloseTo(FORGE_S + STEP, 6)
    expect(hers().length).toBe(1)
  })

  it('obeys the same lock: a full hand waits until her last spell is gone', () => {
    letGo(4)
    S.equeue.push(FIRE as Rune)
    castNow(true)
    expect(hers().length).toBe(1)
    S.equeue.push(ICE as Rune, ICE as Rune, ICE as Rune)
    S.eThink = 0
    S.eForm = 0
    updateSim(STEP)
    expect(S.eForge.t, 'locked: no second forge while her bolt flies').toBe(-1)
    expect(S.equeue.length).toBe(3)
    expect(foeTell(), 'she holds a full hand — the slots say so').toBeGreaterThanOrEqual(0)
    for (let i = 0; i < 120 && hers().length; i++) updateSim(STEP)
    for (let i = 0; i < 40 && S.eForge.t < 0; i++) updateSim(STEP)
    expect(S.eForge.t, 'and then she forges it').toBeGreaterThanOrEqual(0)
  })

  it('reads the player\'s forge as a blow coming, and stands a wall up in time', () => {
    letGo(4)
    S.hp = 100
    S.equeue.push(EARTH as Rune) // a lone Earth: her wall
    S.eForm = 0
    S.eRune = -1
    S.eThink = 0
    S.queue.push(FIRE as Rune)
    cast()
    updateSim(STEP)
    expect(S.eForge.t, 'she answers the forge at once').toBeGreaterThanOrEqual(0)
    expect(S.eForge.kind).toBe(2)
    const ehp = S.ehp
    for (let i = 0; i < 300 && S.phase === PH_DUEL && !S.pops.some((p) => p.k === 'blocked'); i++) updateSim(STEP)
    expect(S.pops.some((p) => p.k === 'blocked'), 'her wall stopped it').toBe(true)
    expect(S.ehp).toBe(ehp)
  })
})

describe('reduced motion keeps the timing (§8.37)', () => {
  it('the same 1.5 s: the runes fade in place, no orb, and the horn fades in to the release', () => {
    const P = { x: 0, y: 0, s: 0, a: 0 }
    const O = { x: 0, y: 0, r: 0 }
    for (let u = 0; u <= 1; u += 0.01) {
      runeAt(u, 1, 3, 124, 110, false, true, P)
      expect([P.x, P.y, P.s]).toEqual([124, 110, 1])
      orbAt(u, false, true, O)
      expect(O.r).toBe(0)
    }
    runeAt(0, 0, 1, 60, 110, false, true, P)
    expect(P.a).toBe(1)
    runeAt(BEAT.fly, 0, 1, 60, 110, false, true, P)
    expect(P.a, 'gone by the time the orb would be born').toBe(0)
    expect(hornGlow(1, true)).toBe(1)
    expect(hornGlow(1, false)).toBe(1)
    expect(hornGlow(0.05, true)).toBe(0)
    // The sim never reads the setting: the release is the same step either way.
  })

  it('in motion: every rune arrives where the orb is born, and the orb pours into the horn', () => {
    const P = { x: 0, y: 0, s: 0, a: 0 }
    const O = { x: 0, y: 0, r: 0 }
    for (const e of [false, true]) {
      for (let i = 0; i < 3; i++) {
        runeAt(BEAT.fly, i, 3, e ? 1220 - 64 * i : 60 + 64 * i, 110, e, false, P)
        expect(P.x, `side ${+e} rune ${i}`).toBeCloseTo(mergeX(e), 6)
        expect(P.y).toBeCloseTo(MERGE_Y, 6)
      }
      orbAt(BEAT.fly, e, false, O)
      expect(O.x).toBeCloseTo(mergeX(e), 6)
      expect(O.r).toBeGreaterThan(10)
      orbAt(BEAT.flow - 1e-6, e, false, O)
      expect(O.x).toBeCloseTo(e ? UX - 59 : AX + 59, 1)
      expect(O.y).toBeCloseTo(GY - 170, 1)
    }
  })
})

describe('local versus: both players forge, each on her own lock (§6.19, §8.37)', () => {
  it('two casts at once forge side by side, leave together, and lock separately', () => {
    open(true)
    S.queue.push(FIRE as Rune)
    S.equeue.push(ICE as Rune)
    cast()
    castSide(true)
    expect(S.forge.t).toBe(0)
    expect(S.eForge.t).toBe(0)
    const r = forgeReadout()
    expect(r.player.forging && r.foe.forging).toBe(true)
    for (let i = 0; i < FORGE_STEPS; i++) updateSim(STEP)
    expect(mine().length).toBe(1)
    expect(hers().length).toBe(1)
    // Player 2 is locked while her bolt flies; player 1's lock is her own.
    S.equeue.push(FIRE as Rune)
    castSide(true)
    expect(S.eForge.t).toBe(-1)
    expect(S.equeue).toEqual([FIRE])
    expect(S.castRefusedWhy, 'player 2 writes no refusal of player 1\'s').not.toBe('busy')
  })
})

describe('the QA readout (window.__forge)', () => {
  it('names the side, how far, and the spell', () => {
    expect(forgeReadout().side).toBeNull()
    S.queue.push(FIRE as Rune, FIRE as Rune)
    cast()
    run(0.75)
    const r = forgeReadout()
    expect(r.side).toBe('player')
    expect(r.progress).toBeCloseTo(0.5, 2)
    expect(r.spell).toBe(resolveSpell([FIRE, FIRE]).key)
    expect(r.runes).toEqual([FIRE, FIRE])
    expect(r.player.busy).toBe(true)
    expect(r.foe.forging).toBe(false)
  })
})
