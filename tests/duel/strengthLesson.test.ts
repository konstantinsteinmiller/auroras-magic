/**
 * The strength lesson (story-spec §8.36a): once, early in her first duel with
 * a strength she owns, the foe holds still and a wordless demo shows that a
 * hand CLOSED on the strength lands weak (✕) and the same runes closed the
 * other way land in full (✓). It lets go on the right hand, or on its own.
 *
 * Pinned here: WHICH duel arms it (`campaign/strengthLesson.ts`), and where
 * that lands in a normal playthrough; the pair it shows is true in the rules;
 * in the real duel the foe is held, the right hand releases it, a wrong hand
 * lands resisted and the demo plays again, a lone rune is no try, and the
 * bail-outs; and the save flag's default for an old save.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { reseed } = vi.hoisted(() => {
  const SEED = 20260927
  let s = SEED
  Math.random = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
  return { reseed: (): void => { s = SEED } }
})

import { EARTH, FIRE, ICE, NATURE, PH_DUEL, WIND, closingRune, resolveSpell, type Rune } from '@/game/duel/config'
import { FOES, VERSUS_FOE, weakTo } from '@/game/duel/foes'
import { S } from '@/game/duel/state'
import { cast, duelTally, resetDuel, updateSim } from '@/game/duel/sim'
import { afk, hasteReadout } from '@/game/duel/director'
import {
  DEMO_HALF, SL, STRENGTH_LESSON, armStrengthLesson, strengthLessonState, strengthPair, strengthView
} from '@/game/duel/strengthLesson'
import { markStrengthTaught, strengthLessonDue, type StrengthLessonAsk } from '@/game/campaign/strengthLesson'
import { defaultCampaign, readCampaign, type CampaignState } from '@/game/campaign/state'
import { newRuneDue } from '@/game/campaign/newRune'
import {
  CHAPTER_COUNT, NODES_PER_CHAPTER, STARTING_RUNES, STRENGTH_FROM_NODE, duelSetup, nodeFoe, runesHeldBy, strengthAt
} from '@/game/campaign/tables'
import { earlyEase } from '@/game/campaign/easing'
import { forged, STEP } from './forged'

/** Chapter 2's second duel: where the lesson lands in a normal playthrough. */
const NODE = STRENGTH_FROM_NODE + 1

/** The campaign as she arrives at node `n` on a first play. */
const arriving = (n: number, taught = STARTING_RUNES): CampaignState => ({
  ...defaultCampaign(), furthestNode: n - 1, runesUnlocked: runesHeldBy(n), runesTaught: taught
})
/** The rule's question for node `n` with this campaign — nothing else up. */
const ask = (n: number, cs: CampaignState, over: Partial<StrengthLessonAsk> = {}): StrengthLessonAsk => ({
  strong: strengthAt(n), owned: (cs.runesUnlocked | STARTING_RUNES) >>> 0, taught: cs.strengthTaught, intro: false,
  versus: false, runeGuide: newRuneDue(n, cs), glimpse: false, help: false, ...over
})

describe('which duel teaches it (campaign/strengthLesson.ts)', () => {
  it('waits out 2-1, where Nature\'s guide is up, and lands on 2-2 once she has drawn Nature', () => {
    const at5 = arriving(STRENGTH_FROM_NODE)
    expect(strengthAt(STRENGTH_FROM_NODE), 'the first strength').toBe(WIND)
    expect(newRuneDue(STRENGTH_FROM_NODE, at5), 'Nature\'s guide is armed at 2-1').toBe(NATURE)
    expect(strengthLessonDue(ask(STRENGTH_FROM_NODE, at5)), 'deferred: one teacher at a time').toBe(false)
    const at6 = arriving(NODE, (STARTING_RUNES | (1 << NATURE)) >>> 0)
    expect(strengthLessonDue(ask(NODE, at6)), '2-2, Nature drawn').toBe(true)
    // A child who never drew Nature in 2-1 meets the guide again at 2-2, and
    // the lesson waits once more.
    expect(strengthLessonDue(ask(NODE, arriving(NODE))), 'Nature still undrawn').toBe(false)
  })

  it('fires once, never in versus or the first-duel lessons, and only for a strength she owns with another rune', () => {
    const cs = arriving(NODE, (STARTING_RUNES | (1 << NATURE)) >>> 0)
    expect(strengthLessonDue(ask(NODE, cs))).toBe(true)
    expect(markStrengthTaught(cs)).toBe(true)
    expect(markStrengthTaught(cs), 'already taught').toBe(false)
    expect(strengthLessonDue(ask(NODE, cs)), 'taught: never again').toBe(false)
    const fresh = arriving(NODE, (STARTING_RUNES | (1 << NATURE)) >>> 0)
    expect(strengthLessonDue(ask(NODE, fresh, { versus: true }))).toBe(false)
    expect(strengthLessonDue(ask(NODE, fresh, { intro: true }))).toBe(false)
    expect(strengthLessonDue(ask(NODE, fresh, { owned: runesHeldBy(NODE) & ~(1 << WIND) })), 'Wind not hers').toBe(false)
    expect(strengthLessonDue(ask(NODE, fresh, { owned: 1 << WIND })), 'nothing else to close on').toBe(false)
    expect(strengthLessonDue(ask(STRENGTH_FROM_NODE - 1, fresh, { runeGuide: -1 })), 'no strength live').toBe(false)
    // …and it stands aside for the other teachers.
    expect(strengthLessonDue(ask(NODE, fresh, { glimpse: true }))).toBe(false)
    expect(strengthLessonDue(ask(NODE, fresh, { help: true }))).toBe(false)
  })

  it('reads false from a save that predates it, and round-trips', () => {
    expect(defaultCampaign().strengthTaught).toBe(false)
    expect(readCampaign(null).strengthTaught).toBe(false)
    expect(readCampaign({ furthestNode: 12, runesUnlocked: 0xff }).strengthTaught, 'an old save').toBe(false)
    expect(readCampaign({ strengthTaught: 'yes' }).strengthTaught, 'junk').toBe(false)
    const cs = readCampaign({ strengthTaught: true })
    expect(cs.strengthTaught).toBe(true)
    expect(readCampaign(JSON.parse(JSON.stringify(cs))).strengthTaught).toBe(true)
  })
})

describe('the pair it shows is true in the rules', () => {
  it('is two of her runes that HIT both ways round, each closing where the demo says', () => {
    for (let c = 1; c < CHAPTER_COUNT; c++) {
      const n = c * NODES_PER_CHAPTER
      const s = strengthAt(n)
      const owned = runesHeldBy(n)
      const p = strengthPair(s, owned, weakTo(FOES[nodeFoe(n)], owned))
      if (p < 0) continue
      expect((owned >>> p) & 1, `chapter ${c + 1}: hers`).toBe(1)
      for (const q of [[p, s], [s, p]]) {
        const sp = resolveSpell(q)
        expect(sp.kind !== 2 && sp.kind !== 5 && sp.dmg > 0, `chapter ${c + 1}: [${q}] hits`).toBe(true)
      }
      expect(closingRune([p, s])).toBe(s)
      expect(closingRune([s, p])).toBe(p)
    }
    // Chapter 2: Nature, Wind is a ward — nothing to see land — so the demo
    // pairs Wind with Fire: the spec's own "Fire, Wind" / "Wind, Fire".
    expect(strengthPair(WIND, runesHeldBy(NODE), NATURE)).toBe(FIRE)
    expect(strengthPair(WIND, STARTING_RUNES, NATURE), 'Wind not hers').toBe(-1)
  })
})

describe('in the real duel', () => {
  let taught = 0
  const step = (secs: number): void => {
    for (let i = 0; i < Math.round(secs / STEP) && S.phase === PH_DUEL; i++) updateSim(STEP)
  }
  const open = (): boolean => {
    reseed()
    const { foe, usesMagic, strong } = duelSetup(NODE)
    S.wins = NODE
    S.losses = 0
    S.intro = 0
    S.pops.length = 0
    S.campaign.runesUnlocked = runesHeldBy(NODE)
    S.campaign.signaturesUnlocked = 0
    resetDuel({ foe, usesMagic, lossStreak: 0, ease: earlyEase(NODE), strong })
    taught = 0
    return armStrengthLesson({ onTaught: () => { taught++ } })
  }
  /** Step until the foe is held (she waits for a calm moment). */
  const held = (): void => {
    for (let t = 0; t < 40 && strengthLessonState().phase === SL.ARMED; t += STEP) updateSim(STEP)
    expect(strengthLessonState().phase, 'the lesson began').toBe(SL.HELD)
  }
  const hand = (q: number[]): void => { S.queue.push(...(q as Rune[])) }

  beforeEach(() => {
    S.flow.mode = 'campaign'
  })

  it('is refused in versus, during the first-duel lessons, and with no strength live', () => {
    resetDuel({ foe: VERSUS_FOE, usesMagic: false, lossStreak: 0, versus: true, strong: WIND })
    expect(armStrengthLesson({ onTaught: () => {} })).toBe(false)
    const { foe, usesMagic } = duelSetup(NODE)
    S.intro = 1
    resetDuel({ foe, usesMagic, lossStreak: 0, strong: WIND })
    expect(armStrengthLesson({ onTaught: () => {} })).toBe(false)
    S.intro = 0
    resetDuel({ foe, usesMagic, lossStreak: 0 })
    expect(armStrengthLesson({ onTaught: () => {} })).toBe(false)
  })

  it('holds the foe, and the right hand — the strength inside, another rune last — lets her go with a real hit', () => {
    expect(open()).toBe(true)
    held()
    expect(S.dur).toBeGreaterThanOrEqual(STRENGTH_LESSON.after - STEP)
    expect(S.strongCue, 'the badge pulses').toBe(true)
    expect(strengthLessonState().other, 'Wind\'s pair here').toBe(FIRE)
    // She forms nothing and casts nothing while held.
    const form = S.eForm
    const n = S.equeue.length
    step(2)
    expect(S.eForm).toBe(form)
    expect(S.equeue.length).toBe(n)
    expect(strengthView().demo, 'the demo is up').not.toBeNull()
    // The live mark on the hand she builds.
    hand([WIND])
    expect(strengthView().slot, 'a lone Wind closes on it').toBe(0)
    expect(strengthView().ok).toBe(false)
    expect(strengthView().demo, 'the demo steps aside').toBeNull()
    hand([FIRE])
    expect(strengthView().slot).toBe(1)
    expect(strengthView().ok, 'Wind, Fire: ✓').toBe(true)
    const hp = S.ehp
    cast()
    expect(taught, 'taught at the press').toBe(1)
    expect(strengthLessonState().phase).toBe(SL.YES)
    forged()
    step(1)
    expect(S.ehp, 'a real hit').toBeLessThan(hp)
    expect(duelTally.resisted, 'in full').toBe(0)
    expect(hasteReadout().pace, 'not counted as pace').toBe(0)
    step(STRENGTH_LESSON.yes + 0.1)
    expect(strengthLessonState().phase, 'she wakes').toBe(SL.DONE)
    expect(S.strongCue).toBe(false)
    const was = S.eForm + S.equeue.length
    step(STRENGTH_LESSON.wake + 2)
    expect(S.eForm + S.equeue.length, 'forming again').not.toBe(was)
  })

  it('a hand closed on the strength lands resisted and the demo plays again; a lone rune is no try', () => {
    open()
    held()
    step(DEMO_HALF + 0.1)
    expect(strengthLessonState().shownT).toBeGreaterThanOrEqual(DEMO_HALF)
    // A lone rune: nothing said, nothing counted.
    hand([FIRE])
    cast()
    expect(strengthView().slot).toBe(-1)
    forged()
    step(1)
    expect(strengthLessonState().fails).toBe(0)
    expect(strengthLessonState().phase).toBe(SL.HELD)
    // Fire, Wind: the ✕, the real ×0.55, and the demo again from the top.
    hand([FIRE, WIND])
    cast()
    expect(strengthView().slot).toBe(1)
    expect(strengthView().ok).toBe(false)
    forged()
    // Her spell in the air: the demo waits for it to land…
    expect(strengthView().demo).toBeNull()
    for (let t = 0; t < 3 && !strengthView().demo; t += STEP) updateSim(STEP)
    expect(duelTally.resisted).toBe(1)
    expect(strengthLessonState().fails).toBe(1)
    expect(strengthLessonState().phase, 'still held').toBe(SL.HELD)
    expect(taught).toBe(0)
    // …then plays again from the top.
    expect(strengthView().demo, 'the demo is back').not.toBeNull()
    expect(strengthLessonState().demoT, 'from the top').toBeLessThanOrEqual(2 * STEP)
  })

  it(`lets go after ${STRENGTH_LESSON.tries} wrong hands, and after ${STRENGTH_LESSON.bail} s, and saves it either way`, () => {
    open()
    held()
    step(DEMO_HALF + 0.1)
    for (let i = 0; i < STRENGTH_LESSON.tries; i++) {
      hand([FIRE, WIND])
      cast()
      forged()
      step(1)
    }
    expect(strengthLessonState().phase).toBe(SL.DONE)
    expect(taught).toBe(1)
    expect(S.strongCue).toBe(false)

    open()
    held()
    // Nobody touches anything: the hold ends on its own, and the AFK clock
    // never ran through it.
    step(STRENGTH_LESSON.bail + 0.1)
    expect(strengthLessonState().phase).toBe(SL.DONE)
    expect(taught).toBe(1)
    expect(afk(), 'not "away" the moment she wakes').toBe(false)
  })

  it('a hand that does not hit — a ward — is no try: no mark, no release, the demo carries on', () => {
    open()
    held()
    step(DEMO_HALF + 0.1)
    // Nature, Ice closes on Ice, not her strength — but it is a wall.
    expect(resolveSpell([NATURE, ICE]).kind, 'a ward').toBe(2)
    hand([NATURE, ICE])
    expect(strengthView().slot, 'no live ✓ on a hand that will not hit').toBe(-1)
    cast()
    expect(strengthView().slot, 'no verdict').toBe(-1)
    expect(strengthLessonState().phase, 'still held').toBe(SL.HELD)
    expect(taught).toBe(0)
    forged()
    step(0.1)
    expect(strengthView().demo, 'the demo is back').not.toBeNull()
    // …and a ward closed ON her strength is no wrong try either.
    expect(resolveSpell([NATURE, WIND]).kind).toBe(2)
    hand([NATURE, WIND])
    expect(strengthView().slot).toBe(-1)
    cast()
    forged()
    step(0.1)
    expect(strengthLessonState().fails).toBe(0)
    expect(strengthLessonState().phase).toBe(SL.HELD)
  })

  it('a wrong hand before she has seen the demo is not held against her', () => {
    open()
    held()
    hand([EARTH, WIND])
    cast()
    forged()
    step(1)
    expect(strengthLessonState().fails).toBe(0)
  })
})
