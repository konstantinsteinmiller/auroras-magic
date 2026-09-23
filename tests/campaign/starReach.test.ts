// @vitest-environment node
// Are the replay goals (retention item 4) REACHABLE by a child?
//
// `pnpm test:winrate` answers a different question — whether a child can
// still clear the node — and it answers it against a player who does not
// chase a goal at all. The risk a star introduces is the other one: a child
// who goes for it plays DIFFERENTLY (she holds a third rune before casting,
// or she reaches for one shape rather than the nearest), and a goal that
// turns a winnable duel into a lost one is a trap with a sparkle on it.
//
// So this runs §7.2's core child — 0.8 attempts a second, 85 % of them
// recognised — with the goal in mind, and asks two things of every goal
// shape: she meets it almost every duel, and she still WINS. Small samples
// on purpose: this is a floor, not a tuning table, and it has to be cheap
// enough to run in the ordinary suite.

import { describe, expect, it, vi } from 'vitest'

// The sim draws its dice from `Math.random` captured at import time, so it is
// seeded BEFORE anything imports — the same trick, and the same reason, as
// `tests/duel/winRate.test.ts`: two runs of this file measure the same duels.
vi.hoisted(() => {
  let s = 20260923
  Math.random = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
})

import { CTR, PH_DUEL, PH_WIN, type Rune } from '@/game/duel/config'
import { FOES } from '@/game/duel/foes'
import { duelSetup, runesHeldBy } from '@/game/campaign/tables'
import { earlyEase } from '@/game/campaign/easing'
import { S } from '@/game/duel/state'
import { defaultCampaign } from '@/game/campaign/state'
import { resetDuel, updateSim, cast, lastPlayerCast } from '@/game/duel/sim'
import { starGoal, starRune, castEarnsStar } from '@/game/campaign/stars'

const DT = 1 / 60
/** A duel not won in a minute is not going to be. */
const MAX_T = 90
const N = 40
/** §7.2's core child: seconds between attempts, and how often the shape she
 *  drew is the shape she meant. */
const BEAT = 1.25
const HAND = 0.85
/** How often she actually reaches for the rune the star wants. */
const AIM = 0.6

const kitOf = (node: number): number[] => {
  const held = runesHeldBy(node)
  const out: number[] = []
  for (let r = 0; r < 12; r++) if ((held >> r) & 1) out.push(r)
  return out
}

/** The rune a foe is weak to, straight off the table the goal reads. */
const counterOf = (foe: number): number => {
  const el = FOES[foe]?.element ?? -1
  return el >= 0 ? CTR[el] ?? -1 : -1
}

/** One duel, played by a child who is going for node `n`'s star. Returns
 *  whether she won, and whether the goal was met along the way. */
const chase = (n: number): { won: boolean; met: boolean } => {
  const { foe, usesMagic } = duelSetup(n)
  S.campaign = defaultCampaign()
  S.campaign.runesUnlocked = runesHeldBy(n)
  S.wins = n
  S.losses = 0
  S.intro = 0
  S.flow.node = n
  S.flow.mode = 'campaign'
  resetDuel({ foe, usesMagic, lossStreak: 0, ease: earlyEase(n) })
  const goal = starGoal(n)
  const kit = kitOf(n)
  // What she is aiming at: the rune the goal names, or -1 for the combo goal,
  // which is about HOW MANY she holds rather than which.
  const want = goal === 'combo' ? -1 : goal === 'rune' ? starRune(n) : counterOf(foe)
  const castAt = goal === 'combo' ? 3 : 2
  let met = false
  let clock = 0
  for (let t = 0; t < MAX_T; t += DT) {
    S.pops.length = 0
    clock += DT
    if (clock >= BEAT) {
      clock -= BEAT
      if (Math.random() < HAND) {
        const r = want >= 0 && Math.random() < AIM ? want : kit[(Math.random() * kit.length) | 0]!
        S.queue.push(r as Rune)
        if (S.queue.length >= castAt) {
          cast()
          const c = lastPlayerCast()
          const runes = c.key ? c.key.split('.').map(Number) : []
          if (castEarnsStar(n, runes, c.count, S.foe)) met = true
        }
      }
    }
    updateSim(DT)
    if (S.phase !== PH_DUEL) return { won: S.phase === PH_WIN, met }
  }
  return { won: false, met }
}

const sample = (n: number): { win: number; met: number } => {
  let win = 0
  let met = 0
  for (let i = 0; i < N; i++) {
    const r = chase(n)
    if (r.won) win++
    if (r.met) met++
  }
  return { win: win / N, met: met / N }
}

describe('a child who goes for the star', () => {
  // One of each goal shape early on, where the kit is small and the duel is
  // one a five-year-old is actually going to be replaying — then two late
  // bosses, where the fight is tight enough that a distracted hand shows.
  // The win floor is §7.2's own first-attempt bar for that band (boss
  // ≥ 75 % through chapter 6, ≥ 60 % after it); a replay is easier than a
  // first attempt, so passing at the first-attempt bar is the strict read.
  const cases: [number, string, number][] = [
    [1, 'combo', 0.75], [3, 'rune', 0.75], [9, 'counter', 0.75],
    [24, 'counter', 0.6], [39, 'counter', 0.6]
  ]

  for (const [node, shape, floor] of cases) {
    it(`meets node ${node + 1}'s ${shape} goal and still wins`, () => {
      expect(starGoal(node)).toBe(shape)
      const r = sample(node)
      if (process.env.STAR_REACH) console.info(`[star] node ${node} ${shape}: met ${(r.met * 100).toFixed(0)} % won ${(r.win * 100).toFixed(0)} %`)
      // She is aiming at it, so meeting it should be the ordinary outcome…
      expect(r.met, `node ${node} goal met`).toBeGreaterThanOrEqual(0.85)
      // …and chasing it must not cost her the duel.
      expect(r.win, `node ${node} still won`).toBeGreaterThanOrEqual(floor)
    }, 120_000)
  }
})
