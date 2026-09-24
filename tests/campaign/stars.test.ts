// The replay stars (retention-roadmap.md item 4): one optional goal per node,
// a 50-bit bitset, and the campaign controller that decides it off REAL duel
// events from the real sim.
//
// The contract worth pinning is not "a star exists" — it is that every one of
// the fifty is winnable by a child on the run it is offered on. A goal that
// asks for a rune no chest has handed over yet, or for the counter to a foe
// that has no weakness, is a star nobody can earn: invisible, unreportable,
// and exactly the kind of quiet dead end a wordless game cannot explain away.

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { S } from '@/game/duel/state'
import { resetDuel, updateSim, cast, castBusy } from '@/game/duel/sim'
import { CTR, FIRE, WIND, NATURE, MAX_RUNES, PH_WIN, PH_LOSE, type Rune } from '@/game/duel/config'
import { FOES, guardianOf } from '@/game/duel/foes'
import { defaultCampaign, NODE_COUNT } from '@/game/campaign/state'
import { hasBit } from '@/game/campaign/bitset'
import {
  duelSetup, nodeChapter, nodeIsBoss, nodePosInChapter, runesHeldBy, newestRuneBy
} from '@/game/campaign/tables'
import { installCampaignController, lossStreakOf } from '@/game/campaign/controller'
import { starGoal, starRune, castEarnsStar, hasStar, awardStar, starsInChapter, starsHeld } from '@/game/campaign/stars'

const holds = (n: number, rune: number): boolean => ((runesHeldBy(n) >> rune) & 1) === 1

/* ───────────────────────────── the goal table ──────────────────────────── */

describe('the goal every node offers', () => {
  it('gives all fifty nodes exactly one goal', () => {
    for (let n = 0; n < NODE_COUNT; n++) {
      expect(['rune', 'combo', 'counter'], `node ${n}`).toContain(starGoal(n))
    }
  })

  it('never asks for a rune the chests have not handed over yet', () => {
    for (let n = 0; n < NODE_COUNT; n++) {
      if (starGoal(n) !== 'rune') continue
      const r = starRune(n)
      expect(r, `node ${n} asks for a rune`).toBeGreaterThanOrEqual(0)
      expect(holds(n, r), `node ${n} asks for rune ${r}, which is not in hand there`).toBe(true)
    }
  })

  it('never asks for a counter that is not in hand, or a foe with no weakness', () => {
    for (let n = 0; n < NODE_COUNT; n++) {
      if (starGoal(n) !== 'counter') continue
      const el = FOES[guardianOf(nodeChapter(n))]!.element
      const ctr = CTR[el]!
      expect(el, `node ${n}'s Guardian is exempt`).toBeGreaterThanOrEqual(0)
      expect(holds(n, ctr), `node ${n} asks for rune ${ctr}, which is not in hand there`).toBe(true)
    }
  })

  it('asks for a three-rune spell only where three runes fit the queue', () => {
    // A stretch, not a trick: `MAX_RUNES` is the queue's own ceiling, and two
    // runes are enough to fill it from the very first duel.
    expect(MAX_RUNES).toBe(3)
    for (let n = 0; n < NODE_COUNT; n++) {
      if (starGoal(n) !== 'combo') continue
      let kit = 0
      for (let r = 0; r < 12; r++) if (holds(n, r)) kit++
      expect(kit, `node ${n} has nothing to cast`).toBeGreaterThan(0)
    }
  })

  it('keeps a chapter varied: the boss never shares the shape before it', () => {
    for (let n = 0; n < NODE_COUNT; n++) {
      if (nodePosInChapter(n) !== 1 && nodePosInChapter(n) !== 2) continue
      expect(starGoal(n)).toBe('combo')
    }
    // Node 0 has had no chest at all, so it cannot want "the new rune".
    expect(newestRuneBy(0)).toBeNull()
    expect(starGoal(0)).toBe('combo')
  })

  it('is stable — the same node answers the same way every time', () => {
    for (let n = 0; n < NODE_COUNT; n++) expect(starGoal(n)).toBe(starGoal(n))
  })
})

describe('what a cast has to be', () => {
  const comboNode = 1
  const runeNode = 3
  const bossNode = 9

  it('a combo node wants the full queue and nothing less', () => {
    expect(starGoal(comboNode)).toBe('combo')
    expect(castEarnsStar(comboNode, [FIRE, FIRE, FIRE], 3, 0)).toBe(true)
    expect(castEarnsStar(comboNode, [FIRE, FIRE], 2, 0)).toBe(false)
    expect(castEarnsStar(comboNode, [FIRE], 1, 0)).toBe(false)
  })

  it('a rune node wants the rune the last chest gave, anywhere in the spell', () => {
    expect(starGoal(runeNode)).toBe('rune')
    expect(starRune(runeNode)).toBe(WIND)
    expect(castEarnsStar(runeNode, [WIND], 1, 0)).toBe(true)
    expect(castEarnsStar(runeNode, [FIRE, WIND], 2, 0)).toBe(true)
    expect(castEarnsStar(runeNode, [FIRE, FIRE, FIRE], 3, 0)).toBe(false)
  })

  it('a boss wants the rune its Guardian is weak to, judged on the LIVE foe', () => {
    expect(starGoal(bossNode)).toBe('counter')
    const foe = guardianOf(nodeChapter(bossNode))
    expect(CTR[FOES[foe]!.element]).toBe(NATURE)
    expect(castEarnsStar(bossNode, [NATURE], 1, foe)).toBe(true)
    expect(castEarnsStar(bossNode, [FIRE, FIRE], 2, foe)).toBe(false)
    // An exempt foe has no counter, so no cast can ever satisfy one.
    expect(castEarnsStar(bossNode, [NATURE], 1, guardianOf(5))).toBe(false)
  })
})

/* ──────────────────────────────── the save ─────────────────────────────── */

describe('the stars bitset', () => {
  beforeEach(() => { S.campaign = defaultCampaign() })

  it('sets one bit, counts per chapter, and is idempotent', () => {
    expect(awardStar(7)).toBe(true)
    expect(hasStar(7)).toBe(true)
    expect(hasBit(S.campaign.stars, 7)).toBe(true)
    expect(starsInChapter(1)).toBe(1)
    expect(starsHeld()).toBe(1)
    // A second award changes nothing and reports nothing.
    expect(awardStar(7)).toBe(false)
    expect(starsHeld()).toBe(1)
  })

  it('refuses a node outside the book', () => {
    expect(awardStar(-1)).toBe(false)
    expect(awardStar(NODE_COUNT)).toBe(false)
    expect(starsHeld()).toBe(0)
  })
})

/* ───────────────────── the controller, on the real duel ────────────────── */

const STEP = 1 / 120
const run = (s: number): void => { for (let i = 0; i < Math.round(s / STEP); i++) updateSim(STEP) }

/** Start node `n`'s duel as the flow would. The foe is frozen out of it, so
 *  what is measured is the goal and not the fight. */
const duelAt = (n: number, mode: 'campaign' | 'versus' = 'campaign'): void => {
  const setup = duelSetup(n)
  S.flow.node = n
  S.flow.mode = mode
  resetDuel({ foe: setup.foe, usesMagic: setup.usesMagic, lossStreak: lossStreakOf(n) })
  S.eThink = 1e9
  S.equeue.length = 0
}
/** Cast exactly these runes, then take the foe down. */
const winWith = (...runes: Rune[]): void => {
  S.queue.push(...runes)
  cast()
  // The cast lock (story-spec §8.37): the next spell waits for this one to
  // forge, leave and land — the foe's bar is topped up so it cannot end it.
  for (let i = 0; i < 1200 && castBusy(false); i++) {
    S.ehp = S.ehpMax
    updateSim(STEP)
  }
  S.ehp = 1
  // (A boss past her phase shift: a 1.5 s forge is long enough for Pearl's
  // wind-up to end in a bubble ward that would catch the finishing bolt.)
  S.ePhase = Math.max(S.ePhase, 2)
  S.queue.push(FIRE)
  cast()
  run(3)
  expect(S.phase).toBe(PH_WIN)
}

describe('the controller awards the star', () => {
  let off: () => void = () => {}
  beforeEach(() => {
    S.campaign = defaultCampaign()
    S.wins = 5
    S.intro = 0
    off = installCampaignController()
  })
  afterEach(() => off())

  it('a three-rune spell and a win earns node 1 its star', () => {
    S.campaign.furthestNode = 0
    duelAt(1)
    winWith(FIRE, FIRE, FIRE)
    expect(hasStar(1)).toBe(true)
  })

  it('the same win without the spell earns nothing', () => {
    S.campaign.furthestNode = 0
    duelAt(1)
    winWith(FIRE)
    expect(hasStar(1)).toBe(false)
  })

  it('a LOSS with the goal met earns nothing — it is win-and-do, not do', () => {
    S.campaign.furthestNode = 0
    duelAt(1)
    S.queue.push(FIRE, FIRE, FIRE)
    cast()
    S.hp = 0
    run(0.2)
    expect(S.phase).toBe(PH_LOSE)
    expect(hasStar(1)).toBe(false)
  })

  it('a REPLAY earns it — which is the whole point of the feature (C24)', () => {
    S.campaign.furthestNode = 9
    duelAt(3)
    expect(starGoal(3)).toBe('rune')
    winWith(WIND)
    expect(hasStar(3)).toBe(true)
    // …and the replay still grants no progress.
    expect(S.campaign.furthestNode).toBe(9)
  })

  it('a boss star wants the counter rune', () => {
    S.campaign.furthestNode = 8
    duelAt(9)
    winWith(NATURE)
    expect(hasStar(9)).toBe(true)
  })

  it('versus leaves the stars alone (C18)', () => {
    S.campaign.furthestNode = 0
    duelAt(1, 'versus')
    S.queue.push(FIRE, FIRE, FIRE)
    cast()
    S.ehp = 1
    S.queue.push(FIRE)
    cast()
    run(2)
    expect(hasStar(1)).toBe(false)
  })

  it('a goal half-met in an ABANDONED duel does not leak into the next one', () => {
    S.campaign.furthestNode = 0
    duelAt(1)
    // She casts the three-rune spell… and the duel is walked out of.
    S.queue.push(FIRE, FIRE, FIRE)
    cast()
    run(0.2)
    expect(hasStar(1)).toBe(false)
    // A fresh attempt at the same node, won with a single rune.
    duelAt(1)
    winWith(FIRE)
    expect(hasStar(1)).toBe(false)
  })

  it('does not hand a node its neighbour star', () => {
    S.campaign.furthestNode = 4
    duelAt(1)
    winWith(FIRE, FIRE, FIRE)
    expect(hasStar(1)).toBe(true)
    expect(hasStar(0)).toBe(false)
    expect(hasStar(2)).toBe(false)
  })
})

describe('the goals a boss falls back to', () => {
  it('chapter 1 asks for a rune, because Moon is forty nodes away', () => {
    // Briar is weak to Moon (rune 10), which no chest gives until node 44.
    expect(nodeIsBoss(4)).toBe(true)
    expect(holds(4, CTR[FOES[guardianOf(0)]!.element]!)).toBe(false)
    expect(starGoal(4)).toBe('rune')
  })

  it('an exempt Guardian asks for a rune too', () => {
    for (const n of [29, 34, 49]) {
      expect(FOES[guardianOf(nodeChapter(n))]!.element).toBe(-1)
      expect(starGoal(n)).toBe('rune')
    }
  })
})
