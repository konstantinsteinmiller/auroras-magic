/**
 * The director's contract (`duel/director.ts`, §6.14b).
 *
 * The win-rate harness cannot see this. It measures whether a SKILLED-ENOUGH
 * child clears a node, and a child who was never going to die does not change
 * that number — so every assertion here is about the player the harness does
 * not model: the one who is losing badly.
 *
 * Three promises, and each is the kind a seven-year-old notices:
 *   1. a player who is playing is never killed, however badly it is going;
 *   2. a player who has put the phone down IS finished off, so the mercy
 *      floor cannot be used to idle out a duel;
 *   3. the two health bars stay near each other, so the fight looks close.
 *
 * `Math.random` is pinned, as in `winRate.test.ts`, so a tuning change moves
 * these numbers for a reason rather than by luck.
 */
import { describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  let s = 20260921
  Math.random = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
})

import { CTR, EARTH, FIRE, NO_EASE, PH_DUEL, resolveSpell, type Rune } from '@/game/duel/config'
import { duelSetup, runeForNode } from '@/game/campaign/tables'
import { earlyEase } from '@/game/campaign/easing'
import { FOES, VERSUS_FOE, guardianOf } from '@/game/duel/foes'
import { S } from '@/game/duel/state'
import { resetDuel, updateSim, cast, foeRate, foeRush, strokeStart, strokeEnd } from '@/game/duel/sim'
import { AFK_S, HASTE, hasteLevel, hasteReadout, hasteTarget, press } from '@/game/duel/director'

const DT = 1 / 60

/** A node deep enough that its foe can really hit back. */
const NODE = 12

interface Run {
  /** Lowest the player's health ever got, as a fraction of her maximum. */
  minHp: number
  /** Did the duel end, and how. */
  ended: boolean
  won: boolean
  /** The largest gap between the two health bars, 0..1. */
  maxGap: number
}

/**
 * Play `seconds` of a duel as a player who is TERRIBLE but present: she casts
 * a single weak rune every `beat` seconds and never counters. `present`
 * false is the same player with her hands off the phone.
 */
const play = (seconds: number, present: boolean, beat = 1.4): Run => {
  const setup = duelSetup(NODE)
  S.wins = 20
  S.losses = 0
  S.intro = 0
  S.campaign.signaturesUnlocked = 0
  S.campaign.runesUnlocked = 0xfff
  resetDuel({ foe: setup.foe, usesMagic: false, lossStreak: 0, ease: { ...NO_EASE } })
  let clock = 0
  let minHp = 1
  let maxGap = 0
  for (let t = 0; t < seconds; t += DT) {
    S.pops.length = 0
    clock += DT
    if (present && clock >= beat) {
      clock -= beat
      // One rune, cast alone: about the weakest thing a player can do.
      S.queue.push(0 as Rune)
      cast()
    }
    updateSim(DT)
    const mine = S.hp / S.hpMax
    const hers = S.ehp / S.ehpMax
    if (mine < minHp) minHp = mine
    if (Math.abs(mine - hers) > maxGap) maxGap = Math.abs(mine - hers)
    if (S.phase !== PH_DUEL) {
      return { minHp, ended: true, won: S.phase !== PH_DUEL && S.hp > 0, maxGap }
    }
  }
  return { minHp, ended: false, won: false, maxGap }
}

describe('the duel director (§6.14b)', () => {
  it('never lets a present player be killed, however badly she plays', () => {
    const r = play(90, true)
    // She is alive, and she never even reached zero on the way.
    expect(S.hp, 'health at the end').toBeGreaterThan(0)
    expect(r.minHp, 'lowest health all duel').toBeGreaterThan(0)
    // And she was genuinely under pressure — this is not a foe who missed.
    expect(r.minHp, 'she should have been pushed down near the floor').toBeLessThan(0.55)
  })

  it('finishes off a player who has put the phone down', () => {
    // Long enough to pass the idle threshold several times over.
    const r = play(AFK_S + 80, false)
    expect(r.ended, 'the duel ended').toBe(true)
    expect(S.hp, 'she was finished off').toBe(0)
  })

  it('keeps the two health bars near each other', () => {
    const r = play(60, true)
    // Without the director a weak player is lapped: the foe sits near full
    // while she is on the floor. The trade keeps that gap bounded.
    expect(r.maxGap, 'largest gap between the bars').toBeLessThan(0.85)
  })
})

/**
 * THE HASTE (owner, 2026-09-23; story-spec §8.35): an always-running
 * controller on the foe's forming speed. It follows how easily the player is
 * winning — her lead, where the lead is heading, and how much faster than
 * §7.2's core child she casts — with no ceiling but a readability limit, and
 * it bleeds away the moment the foe draws level. And it must never find the
 * children the rest of this file protects.
 */
describe('the haste (§8.35)', () => {
  /** A duel against a big-bar Guardian: a bar deep enough that a fast player
   *  cannot simply finish her first. */
  const open = (versus = false): void => {
    S.wins = 20
    S.losses = 0
    S.intro = 0
    S.campaign.signaturesUnlocked = 0
    S.campaign.runesUnlocked = 0xfff
    if (versus) resetDuel({ foe: VERSUS_FOE, usesMagic: false, lossStreak: 0, versus: true })
    else resetDuel({ foe: guardianOf(6), usesMagic: false, lossStreak: 0, ease: { ...NO_EASE } })
    S.ehpMax = S.ehp = 600
  }
  /** Hold her: she thinks about nothing and casts nothing. */
  const hold = (): void => {
    S.eThink = 1e9
    S.equeue.length = 0
  }
  /** A player casting three Earth runes every `every` seconds for `secs`
   *  seconds — 1.8 s is the fast grown-up (1.67 runes a second). The foe is
   *  held throughout, so she lands nothing and the player's lead only grows.
   *  Calls `each` after every step. */
  const outpace = (secs: number, every = 1.8, each?: () => void): void => {
    let clock = 0
    for (let t = 0; t < secs; t += DT) {
      hold()
      clock += DT
      if (clock >= every) {
        clock -= every
        S.queue.push(EARTH as Rune, EARTH as Rune, EARTH as Rune)
        cast()
      }
      updateSim(DT)
      each?.()
    }
  }

  it('wants more the further ahead she is, the faster she is heading away, and the faster she casts', () => {
    const fast = 1.6
    let last = hasteTarget(-0.5, 0, fast)
    let biggest = 0
    for (let lead = -0.5; lead <= 1; lead += 0.005) {
      const w = hasteTarget(lead, 0, fast)
      expect(w, `lead ${lead.toFixed(3)}`).toBeGreaterThanOrEqual(last - 1e-12)
      biggest = Math.max(biggest, w - last)
      last = w
    }
    // Continuous: no step in the lead is a jump in the haste.
    expect(biggest, 'largest step for a 0.005 change in the lead').toBeLessThan(0.1)
    // Heading away is answered early; being caught is answered early too.
    expect(hasteTarget(0.1, 0.02, fast)).toBeGreaterThan(hasteTarget(0.1, 0, fast))
    expect(hasteTarget(0.1, -0.02, fast)).toBeLessThan(hasteTarget(0.1, 0, fast))
    // The faster she casts, the more — continuously, from the design pace up.
    last = 1
    for (let pace = 0; pace <= 3; pace += 0.05) {
      const w = hasteTarget(0.3, 0, pace)
      expect(w, `pace ${pace.toFixed(2)}`).toBeGreaterThanOrEqual(last - 1e-12)
      last = w
    }
    expect(hasteTarget(0.3, 0, HASTE.designPace)).toBe(1)
  })

  it('wants nothing from a player no faster than the child the game was tuned for, however far ahead', () => {
    for (const lead of [0.1, 0.3, 0.6, 1]) expect(hasteTarget(lead, 0.05, HASTE.designPace * 0.99)).toBe(1)
  })

  it('wants nothing once the foe is level or ahead, whatever the trend', () => {
    for (const lead of [0, -0.01, -0.2, -0.8]) expect(hasteTarget(lead, 0.3, 3)).toBe(1)
  })

  it('has no 2× cap: a faster player meets a faster foe, up to the readability limit only', () => {
    open()
    let fastest = 1
    outpace(12, 1.8, () => { fastest = Math.max(fastest, hasteReadout().boost) })
    const grownUp = fastest
    open()
    fastest = 1
    outpace(12, 1.2, () => { fastest = Math.max(fastest, hasteReadout().boost) })
    expect(grownUp, 'a fast grown-up').toBeGreaterThan(2)
    expect(fastest, 'a faster one still').toBeGreaterThan(grownUp + 0.5)
    // The chain × the LARGER of the trade's press and the haste — never both.
    expect(foeRush()).toBeCloseTo(Math.max(1 + 1.6 * press(), hasteReadout().boost), 9)
    // …and a superhuman six runes a second meets the SAFETY limit: no rune
    // forms in less than `minForm`, so her ghost rune can still be read.
    open()
    outpace(10, 0.5)
    expect(foeRate() * foeRush(), 'wanted').toBeGreaterThan(1 / HASTE.minForm)
    S.eForm = 0
    S.eRune = FIRE
    S.eThink = 1e9
    updateSim(DT)
    expect(S.eForm / DT, 'formed, runes a second').toBeLessThanOrEqual(1 / HASTE.minForm + 1e-9)
  })

  it('comes on gently and goes off fast — never a jump', () => {
    open()
    let up = 0
    let prev = 1
    outpace(12, 1.8, () => {
      up = Math.max(up, hasteReadout().boost - prev)
      prev = hasteReadout().boost
    })
    expect(up, 'largest rise in one frame').toBeLessThan(0.08)
    const high = hasteReadout().boost
    expect(high).toBeGreaterThan(2)
    // The foe draws level (and nothing more is in the air): within half a
    // second most of it is gone, within a second and a half all of it.
    S.shots.length = 0
    S.ehp = S.ehpMax * (S.hp / S.hpMax)
    for (let t = 0; t < 0.5; t += DT) {
      hold()
      updateSim(DT)
    }
    expect(hasteReadout().boost - 1, 'after 0.5 s').toBeLessThan((high - 1) * 0.35)
    for (let t = 0; t < 1; t += DT) {
      hold()
      updateSim(DT)
    }
    expect(hasteReadout().boost, 'after 1.5 s').toBeLessThan(1.05)
  })

  /**
   * THE OVERKILL CHECK. A fast player builds the haste up, then stops
   * attacking — still THERE, touching the screen every two seconds, so the
   * AFK rule never lifts the floor — and the foe, no longer held, catches up
   * and goes past. Speed must not become a run: from the moment her bar is
   * ahead of the player's, the haste is all but gone.
   */
  it('a hasted foe who catches up does not run the player over', () => {
    open()
    S.ehpMax = S.ehp = 160
    outpace(6, 1.8)
    expect(hasteReadout().boost).toBeGreaterThan(1.8)
    // Let her go.
    S.eThink = 0
    let worst = 1
    let led = 0
    let caught = false
    let clock = 0
    for (let t = 0; t < 60 && S.phase === PH_DUEL; t += DT) {
      S.pops.length = 0
      clock += DT
      if (clock >= 2) {
        clock -= 2
        // A tap: present, and no rune at all.
        strokeStart(640, 300)
        strokeEnd()
      }
      updateSim(DT)
      const lead = S.ehp / S.ehpMax - S.hp / S.hpMax
      if (lead > 0.05) {
        caught = true
        worst = Math.max(worst, hasteReadout().boost)
      }
      led = Math.max(led, lead)
    }
    expect(caught, 'the foe did catch up').toBe(true)
    expect(led, 'and went well past').toBeGreaterThan(0.2)
    expect(worst, 'the haste while she led').toBeLessThan(1.1)
    expect(S.hp, 'and the floor held').toBeGreaterThan(0)
  })

  it('never comes on in local versus', () => {
    open(true)
    let most = 1
    outpace(12, 1.2, () => { most = Math.max(most, hasteReadout().boost) })
    expect(S.ehp, 'player 1 really was running away with it').toBeLessThan(S.ehpMax * 0.75)
    expect(most).toBe(1)
    expect(hasteLevel()).toBe(0)
    expect(foeRush()).toBe(1)
  })

  /**
   * THE PROMISE. The children of `winRate.test.ts` — the core 7–10-year-old
   * and the small child under nine — play whole duels across the story. The
   * small child casts slower than the design pace and never sees the haste;
   * the core child casts AT it and sees a breath of it in her quickest
   * seconds, under the trade's own press.
   */
  it('stays at or near nothing for the children, across the story', () => {
    const CORE = { beat: 1.25, hand: 0.85, counter: 0.5, single: 0, idle: 0 }
    const YOUNG = { beat: 2, hand: 0.62, counter: 0.12, single: 0.3, idle: 0.15 }
    const owned = (n: number): number[] => {
      const held = new Set<number>([FIRE, EARTH])
      for (let k = 0; k < n; k++) {
        const r = runeForNode(k)
        if (r !== null) held.add(r)
      }
      return [...held]
    }
    const seen = { young: { max: 1, sum: 0, t: 0 }, core: { max: 1, sum: 0, t: 0 } }
    let duels = 0
    for (const p of [CORE, YOUNG]) {
      const acc = p === YOUNG ? seen.young : seen.core
      for (const node of [0, 4, 7, 12, 22, 34, 44, 49]) {
        const { foe, usesMagic } = duelSetup(node)
        const kit = owned(node)
        const el = FOES[foe]!.element
        const counter = el >= 0 && kit.includes(CTR[el]!) ? CTR[el]! : -1
        const solo = counter >= 0 && [2, 5].includes(resolveSpell([counter, counter]).kind)
        for (let i = 0; i < 12; i++) {
          S.wins = p === YOUNG ? node : 20
          S.losses = 0
          S.intro = 0
          S.campaign.signaturesUnlocked = 0
          S.campaign.runesUnlocked = kit.reduce((m, r) => m | (1 << r), 0)
          resetDuel({ foe, usesMagic, lossStreak: 0, ease: earlyEase(node) })
          duels++
          let clock = 0
          for (let t = 0; t < 150 && S.phase === PH_DUEL; t += DT) {
            S.pops.length = 0
            clock += DT
            if (clock >= p.beat) {
              clock -= p.beat
              if (!(Math.random() < p.idle) && Math.random() < p.hand) {
                const r = counter >= 0 && Math.random() < p.counter ? counter : kit[(Math.random() * kit.length) | 0]!
                if (r === counter && solo && S.queue.length) cast()
                S.queue.push(r as Rune)
                if (S.queue.length >= 2 || Math.random() < p.single || (r === counter && solo)) cast()
              }
            }
            updateSim(DT)
            const b = hasteReadout().boost
            acc.max = Math.max(acc.max, b)
            acc.sum += b * DT
            acc.t += DT
          }
        }
      }
    }
    expect(duels).toBe(192)
    expect(seen.young.max, 'the small child: the haste at its highest').toBeLessThan(1.1)
    expect(seen.core.sum / seen.core.t, 'the core child: the haste on average').toBeLessThan(1.08)
    expect(seen.core.max, 'the core child: at its highest').toBeLessThan(1.8)
  })
})
