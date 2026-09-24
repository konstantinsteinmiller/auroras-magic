/**
 * The depth glimpse (story-spec §8.36): one early look at how the runes
 * answer each other. The playtest's gamer "exhausted the strategy space in a
 * minute" — nothing early showed that a rune could beat a ward the others
 * could not. So once, in node 2's first duel, the foe raises a wind wall and
 * a hint names the rune of HERS that gets through.
 *
 * Pinned here: the pairing is TRUE in the rules (`WEAK_POINTS`, `seep`), for
 * the runes she really holds at that node (`runesHeldBy`); the moment runs as
 * designed in the real duel; it happens once; and it never costs the child
 * model the duel — the foe does nothing at all while the hint is up.
 */
import { describe, expect, it, vi } from 'vitest'

const { reseed } = vi.hoisted(() => {
  const SEED = 20260925
  let s = SEED
  Math.random = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
  return { reseed: (): void => { s = SEED } }
})

import { CTR, FIRE, ICE, PH_DUEL, PH_WIN, resolveSpell, type Rune } from '@/game/duel/config'
import { duelSetup, runeForNode, runesHeldBy } from '@/game/campaign/tables'
import { earlyEase } from '@/game/campaign/easing'
import { FOES } from '@/game/duel/foes'
import { GLIMPSE_NODE, glimpseDue, __resetGlimpse } from '@/game/campaign/glimpse'
import { S } from '@/game/duel/state'
import { GLIMPSE, glimpseRuneFor, resetDuel, seep, stops, updateSim, cast, duelTally } from '@/game/duel/sim'

const DT = 1 / 60

const open = (glimpse: boolean, played = GLIMPSE_NODE): void => {
  const { foe, usesMagic } = duelSetup(GLIMPSE_NODE)
  S.wins = played
  S.losses = 0
  S.intro = 0
  S.campaign.signaturesUnlocked = 0
  S.campaign.runesUnlocked = runesHeldBy(GLIMPSE_NODE)
  resetDuel({ foe, usesMagic, lossStreak: 0, ease: earlyEase(GLIMPSE_NODE), glimpse })
}

const step = (secs: number, each?: () => void): void => {
  for (let t = 0; t < secs && S.phase === PH_DUEL; t += DT) {
    S.pops.length = 0
    updateSim(DT)
    each?.()
  }
}

describe('the pairing is true in the rules (§8.36)', () => {
  it('names Ice at node 2 — and nothing at node 0, where no rune of hers answers a wind wall', () => {
    expect(glimpseRuneFor(runesHeldBy(0)), 'Fire and Earth').toBe(-1)
    expect(glimpseRuneFor(runesHeldBy(GLIMPSE_NODE))).toBe(ICE)
    // What she holds there: Fire and Earth from the start, Ice from node 0's chest.
    expect(runeForNode(0)).toBe(ICE)
  })

  it('is what the wind wall really does: Fire blocked dead, Ice a quarter through', () => {
    const fire = resolveSpell([FIRE])
    const ice = resolveSpell([ICE])
    expect(GLIMPSE.ward).toBe(0)
    expect(stops(GLIMPSE.ward, fire.kind), 'the wall stops a Fire bolt').toBe(true)
    expect(seep(GLIMPSE.ward, fire.kind, FIRE), '…all of it').toBe(0)
    expect(stops(GLIMPSE.ward, ice.kind), 'it stops an Ice bolt too').toBe(true)
    expect(seep(GLIMPSE.ward, ice.kind, ICE), '…but a quarter gets through').toBe(0.25)
  })
})

describe('which duel shows it (campaign/glimpse.ts)', () => {
  it('is node 2, first play only, once a session', () => {
    __resetGlimpse()
    expect(glimpseDue(GLIMPSE_NODE, true), 'a replay').toBe(false)
    expect(glimpseDue(0, false)).toBe(false)
    expect(glimpseDue(1, false)).toBe(false)
    expect(glimpseDue(GLIMPSE_NODE, false)).toBe(true)
    expect(glimpseDue(GLIMPSE_NODE, false), 'a retry after a loss is the plain duel').toBe(false)
    __resetGlimpse()
  })
})

describe('the moment, in the real duel', () => {
  it('raises a wind wall, holds the foe still, blocks Fire, lets Ice through, and lets her go', () => {
    reseed()
    open(true)
    expect(S.glimpse, 'armed').toBe(1)
    expect(S.glimpseRune).toBe(ICE)
    // She waits for her moment: some seconds in, nothing in the air.
    let t = 0
    while (S.glimpse === 1 && t < 20) {
      S.pops.length = 0
      updateSim(DT)
      t += DT
    }
    expect(S.glimpse, 'the ward is up').toBe(2)
    expect(t).toBeGreaterThanOrEqual(GLIMPSE.after - DT)
    expect(S.eGuard).toBeGreaterThan(0)
    expect(S.eGuardK, 'a wind wall').toBe(0)
    // The foe presses nothing while it stands.
    const form = S.eForm
    const hand = S.equeue.length
    const theirs = (): number => S.shots.filter((s) => s.dir < 0).length
    const inAir = theirs()
    step(1.5)
    expect(S.eForm, 'no forming').toBe(form)
    expect(S.equeue.length, 'no new rune').toBe(hand)
    expect(theirs(), 'no new spell').toBeLessThanOrEqual(inAir)
    // Her likely spell, a Fire bolt: blocked, the foe untouched.
    let hp = S.ehp
    S.queue.push(FIRE as Rune)
    cast()
    step(0.8)
    expect(S.ehp, 'Fire is blocked').toBe(hp)
    expect(S.glimpse).toBe(2)
    // The rune the hint names: through.
    hp = S.ehp
    const seeps = duelTally.seep
    S.queue.push(ICE as Rune)
    cast()
    step(0.5)
    expect(duelTally.seep, 'Ice found the gap').toBe(seeps + 1)
    expect(S.ehp, 'and it hurt her').toBeLessThan(hp)
    expect(S.glimpse, 'the hint says yes').toBe(3)
    // The yes beat, then the foe wakes — after a breath — and fights on.
    step(GLIMPSE.yes + 0.05)
    expect(S.glimpse).toBe(4)
    const was = S.eForm + S.equeue.length
    step(GLIMPSE.wake + 1.5)
    expect(S.eForm + S.equeue.length, 'she is forming again').not.toBe(was)
  })

  it('ends when the ward runs out, even if she never found it — and never comes back', () => {
    reseed()
    open(true)
    step(GLIMPSE.after + GLIMPSE.secs + 3)
    expect(S.glimpse).toBe(4)
    // The whole rest of the duel: no second glimpse ward.
    step(30)
    expect(S.glimpse === 4 || S.phase !== PH_DUEL).toBe(true)
  })

  it('never arms when the campaign did not ask for it', () => {
    open(false)
    expect(S.glimpse).toBe(0)
    step(12)
    expect(S.glimpse).toBe(0)
  })
})

/**
 * THE CHILD MODELS of `winRate.test.ts` at node 2, with and without the
 * glimpse. The foe does nothing while the hint is up, so it can only give
 * the child time; what this pins is that it never TAKES a duel from her, and
 * that the foe really cast nothing during it.
 */
describe('it never costs a child the duel', () => {
  interface Player { beat: number; hand: number; counter: number; single?: number; idle?: number }
  const CORE: Player = { beat: 1.25, hand: 0.85, counter: 0.5 }
  const YOUNG: Player = { beat: 2, hand: 0.62, counter: 0.12, single: 0.3, idle: 0.15 }
  const kit = [FIRE, 3, ICE]

  const duel = (p: Player, glimpse: boolean): { won: boolean; castDuring: number } => {
    open(glimpse)
    const el = FOES[S.foe]!.element
    const counter = el >= 0 && kit.includes(CTR[el]!) ? CTR[el]! : -1
    const solo = counter >= 0 && [2, 5].includes(resolveSpell([counter, counter]).kind)
    let clock = 0
    let castDuring = 0
    for (let t = 0; t < 150; t += DT) {
      S.pops.length = 0
      clock += DT
      if (clock >= p.beat) {
        clock -= p.beat
        const away = p.idle !== undefined && Math.random() < p.idle
        if (!away && Math.random() < p.hand) {
          const r = counter >= 0 && Math.random() < p.counter ? counter : kit[(Math.random() * kit.length) | 0]!
          if (r === counter && solo && S.queue.length) cast()
          S.queue.push(r as Rune)
          const impatient = p.single !== undefined && Math.random() < p.single
          if (S.queue.length >= 2 || impatient || (r === counter && solo)) cast()
        }
      }
      const held = S.glimpse === 2 || S.glimpse === 3
      const before = S.eCastAnim
      updateSim(DT)
      // A cast of hers restarts her cast pose.
      if (held && S.eCastAnim > before + 1e-9) castDuring++
      if (S.phase !== PH_DUEL) return { won: S.phase === PH_WIN, castDuring }
    }
    return { won: false, castDuring }
  }

  it('wins as often with it as without, for the core child and the small child', () => {
    const N = 120
    for (const [name, p] of [['core', CORE], ['young', YOUNG]] as const) {
      reseed()
      let off = 0
      for (let i = 0; i < N; i++) if (duel(p, false).won) off++
      reseed()
      let on = 0
      let during = 0
      for (let i = 0; i < N; i++) {
        const r = duel(p, true)
        if (r.won) on++
        during += r.castDuring
      }
      expect(during, `${name}: the foe cast while the hint was up`).toBe(0)
      // Noise at n = 120 is a few points either way; a real cost would be more.
      expect(on / N, `${name}: with ${on}/${N}, without ${off}/${N}`).toBeGreaterThanOrEqual(off / N - 0.05)
      if (p === CORE) expect(on / N, 'core child, with it').toBeGreaterThanOrEqual(0.9)
    }
  }, 120_000)
})
