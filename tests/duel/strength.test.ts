// Every foe's STRENGTH (owner, 2026-09-27; story-spec §6.6a): one visible
// weakness (×1.7) and one visible strength (×0.55), nothing hidden. The
// strength is a rune the player already owns, chosen per chapter — Wind and
// Nature first, the shapes children spam — and it is paid on the rune that
// CLOSES a hand, so the strong rune inside a combo costs nothing.
//
// The table's constraints are derived here from the unlock schedule
// (`campaign/tables.ts`), never hard-coded: a chest moved to another node
// re-checks every chapter.

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  CTR, FIRE, WIND, ICE, NATURE, WATER, RAINBOW, STRONG_MUL, WEAK_MUL, closingRune, closesOnStrength, elemMul,
  resolveSpell, type Rune
} from '@/game/duel/config'
import { FOES, FIRST_UMBRA, VERSUS_FOE, guardianOf, shadowOf, strongTo } from '@/game/duel/foes'
import {
  CHAPTER_COUNT, NODES_PER_CHAPTER, STRENGTH_FROM_NODE, duelSetup, newestRuneBy, nodeFoe, nodeIsBoss, runesHeldBy,
  strengthAt
} from '@/game/campaign/tables'
import { GLIMPSE_NODE } from '@/game/campaign/glimpse'
import { S } from '@/game/duel/state'
import { resetDuel, updateSim, onDuelEvent, duelTally } from '@/game/duel/sim'
import { castNow, STEP } from './forged'

const has = (mask: number, r: number): boolean => ((mask >>> r) & 1) === 1
const bits = (mask: number): number => {
  let n = 0
  for (let r = 0; r < 12; r++) if (has(mask, r)) n++
  return n
}
/** A chapter's first node, 0-based. */
const first = (c: number): number => c * NODES_PER_CHAPTER
/** The first node of chapter `c` where her strength is live, or −1. */
const firstLive = (c: number): number => {
  for (let n = first(c); n < first(c) + NODES_PER_CHAPTER; n++) if (strengthAt(n) >= 0) return n
  return -1
}
const chapterStrong = (c: number): number => FOES[shadowOf(c)]!.strong

describe('the strength table (§6.6a)', () => {
  it('is one per chapter: the Guardian shares her chapter\'s, node 0\'s Umbra chapter 1\'s, versus has none', () => {
    for (let c = 0; c < CHAPTER_COUNT; c++) {
      expect(FOES[guardianOf(c)]!.strong, `chapter ${c + 1}`).toBe(chapterStrong(c))
    }
    expect(FOES[FIRST_UMBRA]!.strong).toBe(chapterStrong(0))
    expect(FOES[VERSUS_FOE]!.strong).toBe(-1)
  })

  it('gives every chapter that has a live duel a strength — the exempt ones (element −1) included', () => {
    for (let c = 0; c < CHAPTER_COUNT; c++) {
      const live = first(c) + NODES_PER_CHAPTER - 1 >= STRENGTH_FROM_NODE
      if (!live) {
        expect(chapterStrong(c), `chapter ${c + 1} never shows one`).toBe(-1)
        continue
      }
      expect(chapterStrong(c), `chapter ${c + 1}`).toBeGreaterThanOrEqual(0)
    }
    // Rainbow Ridge, Sunken Sands and the Festival have no weakness, and still a strength.
    for (const c of [5, 6, 9]) {
      expect(FOES[shadowOf(c)]!.element).toBe(-1)
      expect(chapterStrong(c)).toBeGreaterThanOrEqual(0)
    }
  })

  it('is never that chapter\'s weakness, never Rainbow, and never her own element by accident of the counter graph', () => {
    for (let c = 0; c < CHAPTER_COUNT; c++) {
      const s = chapterStrong(c)
      if (s < 0) continue
      const el = FOES[shadowOf(c)]!.element
      if (el >= 0) expect(s, `chapter ${c + 1}: strength ≠ weakness`).not.toBe(CTR[el])
      // A Rainbow that closes a hand resolves into another rune (§6.20), so a
      // Rainbow strength could never be paid.
      expect(s, `chapter ${c + 1}`).not.toBe(RAINBOW)
    }
  })

  it('is a rune she already holds at the chapter\'s first live duel, on a first play', () => {
    for (let c = 0; c < CHAPTER_COUNT; c++) {
      const n = firstLive(c)
      if (n < 0) continue
      const s = chapterStrong(c)
      expect(has(runesHeldBy(n), s), `chapter ${c + 1}: rune ${s} held at node ${n + 1}`).toBe(true)
    }
  })

  it('is never the rune whose new-rune guide can be up there — the game never resists what it is teaching', () => {
    for (let c = 0; c < CHAPTER_COUNT; c++) {
      const n = firstLive(c)
      if (n < 0) continue
      expect(chapterStrong(c), `chapter ${c + 1}`).not.toBe(newestRuneBy(n))
    }
  })

  it('goes after Wind and Nature first, each in several of chapters 2–6, and rotates after that', () => {
    const early = [1, 2, 3, 4, 5].map(chapterStrong)
    // The first chapter that shows a strength resists one of the two.
    const firstShown = early.find((s) => s >= 0)
    expect([WIND, NATURE]).toContain(firstShown)
    expect(early.filter((s) => s === WIND).length, 'Wind in chapters 2–6').toBeGreaterThanOrEqual(2)
    expect(early.filter((s) => s === NATURE).length, 'Nature in chapters 2–6').toBeGreaterThanOrEqual(2)
    for (const s of early) expect([WIND, NATURE], 'chapters 2–6').toContain(s)
    // Chapters 7–10: other shapes, each once.
    const late = [6, 7, 8, 9].map(chapterStrong)
    for (const s of late) expect([WIND, NATURE], 'chapters 7–10').not.toContain(s)
    expect(new Set(late).size, 'chapters 7–10 rotate').toBe(late.length)
    // …so no rune is the wrong one in more than three chapters.
    const all = Array.from({ length: CHAPTER_COUNT }, (_, c) => chapterStrong(c)).filter((s) => s >= 0)
    for (const s of new Set(all)) expect(all.filter((x) => x === s).length, `rune ${s}`).toBeLessThanOrEqual(3)
  })
})

describe('the gate (§6.6a)', () => {
  it('opens at chapter 2: never in the first duel, and not before she holds three runes', () => {
    expect(strengthAt(0)).toBe(-1)
    expect(STRENGTH_FROM_NODE).toBeGreaterThan(0)
    expect(bits(runesHeldBy(STRENGTH_FROM_NODE))).toBeGreaterThanOrEqual(3)
    for (let n = 0; n < STRENGTH_FROM_NODE; n++) expect(strengthAt(n), `node ${n + 1}`).toBe(-1)
    for (let n = STRENGTH_FROM_NODE; n < CHAPTER_COUNT * NODES_PER_CHAPTER; n++) {
      expect(strengthAt(n), `node ${n + 1}`).toBe(FOES[duelSetup(n).foe]!.strong)
      expect(strengthAt(n), `node ${n + 1}`).toBeGreaterThanOrEqual(0)
    }
    expect(strengthAt(-1)).toBe(-1)
    expect(strengthAt(CHAPTER_COUNT * NODES_PER_CHAPTER)).toBe(-1)
  })

  it('opens on a chapter boundary, after chapter 1\x27s teachers — so a foe\x27s own `strong` is what is live', () => {
    expect(STRENGTH_FROM_NODE % NODES_PER_CHAPTER).toBe(0)
    expect(STRENGTH_FROM_NODE).toBeGreaterThan(GLIMPSE_NODE)
    expect(nodeIsBoss(STRENGTH_FROM_NODE)).toBe(false)
    // Every node: what the campaign hands the duel is the foe's own field, so
    // the HUD, the preview and the art preload may read it off the foe.
    for (let n = 0; n < CHAPTER_COUNT * NODES_PER_CHAPTER; n++) {
      expect(strengthAt(n), `node ${n + 1}`).toBe(FOES[nodeFoe(n)]!.strong)
    }
    // The rune guide that can be up in its first duel teaches the same thing:
    // the chest's rune is her WEAKNESS there, never her strength.
    const def = FOES[nodeFoe(STRENGTH_FROM_NODE)]!
    expect(newestRuneBy(STRENGTH_FROM_NODE)).toBe(CTR[def.element])
  })

  it('is handed to the duel with the foe (`duelSetup`)', () => {
    expect(duelSetup(STRENGTH_FROM_NODE - 1).strong).toBe(-1)
    expect(duelSetup(STRENGTH_FROM_NODE).strong).toBe(WIND)
    expect(duelSetup(first(3)).strong).toBe(NATURE)
  })
})

describe('the strength the player is shown (strongTo)', () => {
  const ALL = 0xfff

  it('is her strength, behind the same ownership gate as the weakness', () => {
    const bay = FOES[shadowOf(1)]!
    expect(strongTo(bay, ALL)).toBe(WIND)
    expect(strongTo(bay, ALL & ~(1 << WIND))).toBe(-1)
    expect(strongTo(bay, 1 << WIND)).toBe(WIND)
    for (const f of FOES) expect(strongTo(f, ALL), f.slug).toBe(f.strong)
  })

  it('shows nothing for no foe, the versus Umbra, or a chapter-1 foe', () => {
    expect(strongTo(undefined, ALL)).toBe(-1)
    expect(strongTo(FOES[VERSUS_FOE], ALL)).toBe(-1)
    for (const id of [FIRST_UMBRA, shadowOf(0), guardianOf(0)]) expect(strongTo(FOES[id], ALL)).toBe(-1)
  })

  it('never hides a live strength on a first play: she always holds it', () => {
    for (let n = 0; n < CHAPTER_COUNT * NODES_PER_CHAPTER; n++) {
      expect(strongTo(FOES[nodeFoe(n)], runesHeldBy(n)), `node ${n + 1}`).toBe(strengthAt(n))
    }
  })
})

describe('the multiplier (§6.6, §6.6a)', () => {
  it('pays the counter ×1.7 and the strength ×0.55; her own element is a plain ×1', () => {
    expect(WEAK_MUL).toBe(1.7)
    expect(STRONG_MUL).toBe(0.55)
    for (const f of FOES) {
      const s = f.strong
      if (f.element >= 0) {
        expect(elemMul(CTR[f.element]!, f.element, s), f.slug).toBe(1.7)
        if (f.element !== s) expect(elemMul(f.element, f.element, s), `${f.slug}: own element`).toBe(1)
      }
      if (s >= 0) expect(elemMul(s, f.element, s), `${f.slug}: strength`).toBe(0.55)
    }
    // No strength live: nothing is resisted, whatever her element.
    for (let r = 0; r < 12; r++) expect(elemMul(r, r)).toBe(1)
    expect(elemMul(WIND, -1, -1)).toBe(1)
  })
})

describe('the closing rune (§6.2 step 7)', () => {
  it('is the last rune drawn — the strong rune inside a hand costs nothing', () => {
    expect(closingRune([FIRE, WIND])).toBe(WIND)
    expect(closingRune([WIND, FIRE])).toBe(FIRE)
    expect(closesOnStrength([FIRE, WIND], WIND)).toBe(true)
    expect(closesOnStrength([WIND, FIRE], WIND)).toBe(false)
    expect(closesOnStrength([WIND, WIND, FIRE], WIND)).toBe(false)
    expect(closesOnStrength([WIND], WIND)).toBe(true)
    expect(closingRune([])).toBe(-1)
    expect(closesOnStrength([], WIND)).toBe(false)
    expect(closesOnStrength([WIND], -1)).toBe(false)
  })

  it('is what a closing Rainbow resolved into, the same element the weakness reads', () => {
    // Ice, Wind, Rainbow: the Rainbow completes the Blizzard (22), not the
    // Cyclone (16) — the hand closes as Ice.
    const sp = resolveSpell([ICE, WIND, RAINBOW])
    expect(sp.wild).toBeDefined()
    expect(closingRune([ICE, WIND, RAINBOW])).toBe(sp.lead)
    expect(sp.lead).toBe(ICE)
    expect(closesOnStrength([ICE, WIND, RAINBOW], WIND)).toBe(false)
    expect(closesOnStrength([ICE, WIND, RAINBOW], ICE)).toBe(true)
    // A hand of nothing but Rainbow is Rainbow, which no foe resists.
    expect(closingRune([RAINBOW, RAINBOW])).toBe(RAINBOW)
    for (const f of FOES) expect(closesOnStrength([RAINBOW], f.strong), f.slug).toBe(false)
  })
})

describe('in the duel (§6.6a)', () => {
  const run = (seconds: number): void => {
    for (let i = 0; i < Math.round(seconds / STEP); i++) updateSim(STEP)
  }
  const holdFoe = (): void => {
    S.eThink = 1e9
    S.eForm = 0
    S.equeue.length = 0
  }
  /** Chapter 2's friend (Water; weak to Nature, strong against Wind), held. */
  const bay = (strong = WIND): void => {
    resetDuel({ foe: shadowOf(1), usesMagic: false, lossStreak: 0, strong })
    holdFoe()
  }
  const land = (q: number[], secs = 2.2): number => {
    const before = S.ehp
    S.queue.push(...(q as Rune[]))
    castNow()
    run(secs)
    return before - S.ehp
  }
  let events: string[] = []
  let off: (() => void) | null = null

  beforeEach(() => {
    S.wins = 5
    S.losses = 0
    S.intro = 0
    S.pops.length = 0
    S.campaign.runesUnlocked = 0xfff
    S.campaign.signaturesUnlocked = 0
    events = []
    off = onDuelEvent((e) => { events.push(e) })
  })
  afterEach(() => {
    off?.()
    off = null
  })

  it('takes the strength live from the campaign; none when omitted, none in versus, kept on a retry', () => {
    bay()
    expect(S.eStrong).toBe(WIND)
    resetDuel()
    expect(S.eStrong, 'a retry keeps it').toBe(WIND)
    resetDuel({ foe: shadowOf(1), usesMagic: false, lossStreak: 0 })
    expect(S.eStrong).toBe(-1)
    resetDuel({ foe: VERSUS_FOE, usesMagic: false, lossStreak: 0, versus: true, strong: WIND })
    expect(S.eStrong, 'versus is the plain fight').toBe(-1)
  })

  it('pays ×0.55 on a hand that CLOSES on it, and says so — the same spell closed on Fire pays in full', () => {
    bay()
    const closedOnFire = land([WIND, FIRE])
    expect(duelTally.resisted).toBe(0)
    expect(events).not.toContain('resisted')
    bay()
    events = []
    const closedOnWind = land([FIRE, WIND])
    expect(resolveSpell([FIRE, WIND]).key).toBe(resolveSpell([WIND, FIRE]).key)
    expect(closedOnFire).toBeGreaterThan(0)
    expect(closedOnWind).toBeCloseTo(closedOnFire * 0.55, 5)
    expect(duelTally.resisted).toBe(1)
    expect(events.filter((e) => e === 'resisted')).toHaveLength(1)
  })

  it('flags the shot as resisted, not as super-effective — and a weakness the other way round', () => {
    bay()
    S.queue.push(FIRE as Rune, WIND as Rune)
    castNow()
    const resisted = S.shots.find((s) => s.dir > 0)!
    expect(resisted.rs).toBe(1)
    expect(resisted.w).toBe(0)
    bay()
    S.queue.push(NATURE as Rune)
    castNow()
    const weak = S.shots.find((s) => s.dir > 0)!
    expect(weak.w).toBe(1)
    expect(weak.rs).toBe(0)
  })

  it('no longer resists her own element: a Water bolt on a Water foe lands as on a foe with none', () => {
    resetDuel({ foe: VERSUS_FOE, usesMagic: false, lossStreak: 0 })
    holdFoe()
    const neutral = land([WATER])
    bay()
    expect(land([WATER])).toBeCloseTo(neutral, 5)
    expect(duelTally.resisted).toBe(0)
  })

  it('without a live strength, nothing is resisted', () => {
    bay(-1)
    const plain = land([FIRE, WIND])
    bay(-1)
    expect(land([WIND, FIRE])).toBeCloseTo(plain, 5)
    expect(events).not.toContain('resisted')
  })

  it('a Crystal Ward bounces a resisted spell back at its base, and it is nobody\'s "resisted" on the way back', () => {
    bay()
    S.eGuard = 6
    S.eGuardK = 4
    S.queue.push(FIRE as Rune, WIND as Rune)
    castNow()
    run(0.6)
    const back = S.shots.find((s) => s.rf === 1)
    expect(back, 'it bounced').toBeDefined()
    expect(back!.rs).toBe(0)
    run(2)
    expect(duelTally.resisted).toBe(0)
    expect(events).not.toContain('resisted')
  })
})
