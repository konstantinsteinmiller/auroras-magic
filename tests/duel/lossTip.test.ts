/**
 * The duel polish from the second blind playtest (2026-09-24):
 *
 *  - the loss card's ONE tip (`duel/lossTip.ts`), chosen from what happened
 *    in that duel — played through the real sim, so the counters are the ones
 *    the card will read;
 *  - the foe's "almost there!" gold shimmer rule (`hpGauge.foeAlmost`);
 *  - chapter 1's softened foe (`foes.ts`): moonlit, gentle, and ONLY her.
 */
import { describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  let s = 20260924
  Math.random = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
})

import { EARTH, FIRE, NO_EASE, PH_DUEL, PH_LOSE, type Rune } from '@/game/duel/config'
import { S } from '@/game/duel/state'
import { castSide, resetDuel, updateSim } from '@/game/duel/sim'
import { duelSetup, nodeFoe } from '@/game/campaign/tables'
import { FOES, FIRST_UMBRA, guardianOf, shadowOf } from '@/game/duel/foes'
import { ALMOST, barLowLevel, foeAlmost } from '@/game/duel/hpGauge'
import { GENERAL, LOSS_TIP_RUNES, duelTally, lossTip, lossTipKey, pickLossTip, type LossTipId } from '@/game/duel/lossTip'
import en from '@/i18n/locales/en'

const DT = 1 / 60
const NODE = 12

const fresh = (): void => {
  S.intro = 0
  S.wins = 20
  S.losses = 0
  S.campaign.signaturesUnlocked = 0
  S.campaign.runesUnlocked = 0xfff
  resetDuel({ foe: duelSetup(NODE).foe, usesMagic: false, lossStreak: 0, ease: { ...NO_EASE } })
}
const run = (seconds: number): void => {
  for (let t = 0; t < seconds && S.phase === PH_DUEL; t += DT) {
    S.pops.length = 0
    updateSim(DT)
  }
}
/** Put `hand` in her slots and press CAST, then let the forge and the flight
 *  run out, so the next press is not refused by the cast lock. */
const castHand = (hand: number[]): void => {
  S.queue.length = 0
  for (const r of hand) S.queue.push(r as Rune)
  castSide(false)
  run(2.6)
}
/** Put the phone down until the foe finishes her. */
const goQuiet = (): void => run(120)

describe('pickLossTip — first match wins', () => {
  const t = (casts: number, walls: number, multi: number, quiet: boolean) => ({ casts, walls, multi, quiet })
  it('never raised a wall → the square blocks', () => {
    expect(pickLossTip(t(0, 0, 0, true), 1)).toBe('block')
    expect(pickLossTip(t(6, 0, 4, true), 1)).toBe('block')
  })
  it('walled, but only ever single runes → two make it stronger', () => {
    expect(pickLossTip(t(5, 1, 0, true), 1)).toBe('stack')
  })
  it('walled and stacked, and went quiet → keep drawing', () => {
    expect(pickLossTip(t(5, 1, 2, true), 1)).toBe('keepDrawing')
  })
  it('none of those → a general tip, turning with each loss', () => {
    const a = pickLossTip(t(5, 1, 2, false), 1)
    const b = pickLossTip(t(5, 1, 2, false), 2)
    expect(GENERAL).toContain(a)
    expect(GENERAL).toContain(b)
    expect(a).not.toBe(b)
  })
  it('every tip has an English line and a rune to show', () => {
    const ids: LossTipId[] = ['block', 'stack', 'keepDrawing', ...GENERAL]
    const tips = (en as { result: { tip: Record<string, string> } }).result.tip
    for (const id of ids) {
      expect(lossTipKey(id)).toBe(`result.tip.${id}`)
      expect(tips[id], id).toBeTruthy()
      expect(LOSS_TIP_RUNES[id].length, id).toBeGreaterThan(0)
    }
    expect(LOSS_TIP_RUNES.block).toEqual([EARTH])
  })
})

describe('the tally, played through the real sim', () => {
  it('single Fire bolts and then the phone put down → "block"', () => {
    fresh()
    castHand([FIRE])
    castHand([FIRE])
    expect(duelTally()).toMatchObject({ casts: 2, walls: 0, multi: 0 })
    goQuiet()
    expect(S.phase).toBe(PH_LOSE)
    expect(duelTally().quiet, 'the AFK rule was in force').toBe(true)
    expect(lossTip()).toBe('block')
  })

  it('an Earth Wall and single runes → "stack"', () => {
    fresh()
    castHand([EARTH])
    castHand([FIRE])
    expect(duelTally()).toMatchObject({ casts: 2, walls: 1, multi: 0 })
    goQuiet()
    expect(S.phase).toBe(PH_LOSE)
    expect(lossTip()).toBe('stack')
  })

  it('a wall and a two-rune spell, then quiet → "keep drawing"', () => {
    fresh()
    castHand([EARTH])
    castHand([FIRE, EARTH])
    expect(duelTally()).toMatchObject({ casts: 2, walls: 1, multi: 1 })
    goQuiet()
    expect(S.phase).toBe(PH_LOSE)
    expect(lossTip()).toBe('keepDrawing')
  })

  it('starts over with every duel (a retry is a new tally)', () => {
    fresh()
    castHand([EARTH])
    castHand([FIRE, EARTH])
    fresh()
    expect(duelTally()).toEqual({ casts: 0, walls: 0, multi: 0, quiet: false })
  })

  it('a refused press (nothing in hand) counts as no cast', () => {
    fresh()
    S.queue.length = 0
    castSide(false)
    expect(S.castRefusedWhy).toBe('empty')
    expect(duelTally().casts).toBe(0)
  })
})

describe('the foe\'s "almost there!" shimmer (hpGauge.foeAlmost)', () => {
  it('lights under a quarter of HER health, in a duel, and only on a foe', () => {
    expect(ALMOST).toBe(0.25)
    expect(foeAlmost(24, 100, false, true)).toBe(true)
    expect(foeAlmost(1, 130, false, true)).toBe(true)
    expect(foeAlmost(25, 100, false, true)).toBe(false)
    expect(foeAlmost(60, 100, false, true)).toBe(false)
    // Knocked out: nothing left to shimmer, and the result is coming.
    expect(foeAlmost(0, 100, false, true)).toBe(false)
    // Not in a duel (the win pose, the result card).
    expect(foeAlmost(10, 100, false, false)).toBe(false)
    // Local versus: the right-hand bar is player 2's — her red glow, not gold.
    expect(foeAlmost(10, 100, true, true)).toBe(false)
    expect(barLowLevel(10, 100, true, true)).toBe(2)
  })
  it('is measured against a boss\'s own maximum', () => {
    expect(foeAlmost(30, 135, false, true)).toBe(true)
    expect(foeAlmost(34, 135, false, true)).toBe(false)
  })
})

describe('chapter 1\'s softened foe', () => {
  /** Is this hex colour a green — the "glowing green eyes" the parent saw? */
  const green = (hex: string): boolean => {
    const s = hex.replace('#', '')
    const c = s.length === 3 ? s.split('').map((ch) => parseInt(ch + ch, 16)) : [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16))
    const [r, g, b] = c as [number, number, number]
    return g > r + 30 && g > b + 30
  }
  const lum = (hex: string): number => {
    const s = hex.replace('#', '')
    const c = s.length === 3 ? s.split('').map((ch) => parseInt(ch + ch, 16)) : [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16))
    return (0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!) / 255
  }
  it('has no green anywhere, a coat lifted off black, and the gentle face', () => {
    const f = FOES[shadowOf(0)]!
    for (const c of f.pal) expect(green(c), c).toBe(false)
    expect(lum(f.pal[0]), 'coat').toBeGreaterThan(lum(FOES[shadowOf(1)]!.pal[0]))
    expect(f.gentle).toBe(true)
  })
  it('is the only one: later chapters keep their menace, and the roster its rules', () => {
    for (let c = 1; c < 10; c++) {
      expect(FOES[shadowOf(c)]!.gentle, `shadow ${c}`).toBeFalsy()
      expect(FOES[guardianOf(c)]!.gentle, `guardian ${c}`).toBeFalsy()
    }
    expect(FOES[guardianOf(0)]!.gentle).toBeFalsy()
    // Chapter 2's standard foe (one of Umbra's friends) wears Umbra's black coat.
    expect(FOES[shadowOf(1)]!.pal[0]).toBe('#213')
    // A recolour only: the rules of chapter 1's standard foe are untouched —
    // she is Umbra now (owner, 2026-09-26), not a shadow clone.
    const f = FOES[shadowOf(0)]!
    expect([f.slug, f.hpMax, f.aiTier, f.boss]).toEqual(['umbra', 100, 0, false])
  })
})

// The first duel is Umbra herself (owner, 2026-09-24): the prologue shows her
// dusting the meadow, and the fight is Aurora answering her.
describe('the first duel\'s Umbra', () => {
  it('is Umbra by name and by look, with the gentle face', () => {
    const f = FOES[FIRST_UMBRA]!
    expect(nodeFoe(0)).toBe(FIRST_UMBRA)
    expect(f.slug).toBe('umbra')
    expect(f.pal).toEqual(FOES[guardianOf(9)]!.pal)
    expect(f.gentle).toBe(true)
  })
  it('fights by chapter 1\'s shadow\'s rules, so the first duel plays as it was tuned', () => {
    const { slug: _s, pal: _p, gentle: _g, ...rules } = FOES[FIRST_UMBRA]!
    const { slug: _s0, pal: _p0, gentle: _g0, ...shadowRules } = FOES[shadowOf(0)]!
    expect(rules).toEqual(shadowRules)
    // Not the finale's Umbra: no phase 2, no Love finisher.
    expect(FOES[FIRST_UMBRA]!.phase2).toBeNull()
    // Nodes 1–3 still fight the moonlit shadow.
    for (const n of [1, 2, 3]) expect(nodeFoe(n)).toBe(shadowOf(0))
  })
})
