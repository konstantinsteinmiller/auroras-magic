/**
 * THE STRENGTH'S CALLOUTS (§6.6a) — what the sim hands the HUD's popups
 * (`DuelPopups.vue`) when a spell lands. Not the multipliers (the rules
 * tests own those): only WHICH callout a hit wears, and over WHOM.
 *
 *   • a hand closing on her strength lands as `resistHit` over her — drawn
 *     as a shield and the number, no word;
 *   • her weakness still says "WEAK!", a plain rune a plain number;
 *   • a spell her Crystal Ward sends back lands on Aurora as a plain hit,
 *     never "WEAK!" and never resisted — neither flag belongs to that blow.
 *
 * …and the three colour-coded layers that tie a weak hit to the ×0.55 badge
 * (owner, 2026-09-27: "so the player sees the mistake faster"): the amber
 * closing slot's rule (`useDuelHud.resistWarnSlot`), the badge's flash on
 * the 'resisted' event (`hud.resistFlash`), and the canvas's amber pinned to
 * the `--am-resist` token.
 */
import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it } from 'vitest'
import { EARTH, FIRE, NATURE, NO_EASE, STRONG_MUL, WIND, type Rune } from '@/game/duel/config'
import { duelSetup, STRENGTH_FROM_NODE } from '@/game/campaign/tables'
import { S, type Pop } from '@/game/duel/state'
import { resetDuel, updateSim } from '@/game/duel/sim'
import { hits } from '@/game/duel/strengthLesson'
import { RESIST_INK } from '@/game/duel/resist'
import { hud, resistWarnSlot, syncHud } from '@/use/useDuelHud'
import { guardedLeft, popHalfEm, textEm } from '@/game/duel/popGuard'
import { castNow, STEP } from './forged'

const DAMAGE = ['hit', 'weakHit', 'resistHit']

const holdFoe = (): void => {
  S.eThink = 1e9
  S.eForm = 0
  S.equeue.length = 0
}

/** Chapter 2's first duel: weak to Nature, resisting Wind. */
const open = (): void => {
  S.wins = 20
  S.losses = 0
  S.intro = 0
  S.pops.length = 0
  S.campaign.runesUnlocked = 0xfff
  S.campaign.signaturesUnlocked = 0
  const setup = duelSetup(STRENGTH_FROM_NODE)
  resetDuel({ foe: setup.foe, usesMagic: false, lossStreak: 0, strong: setup.strong, ease: { ...NO_EASE } })
  holdFoe()
}

/** Cast `rune` alone and step until a damage number lands over side `v`. */
const landOn = (rune: number, v: 0 | 1): Pop | undefined => {
  S.queue.length = 0
  S.queue.push(rune as Rune)
  castNow(false, holdFoe)
  const hit = (): Pop | undefined => S.pops.find((p) => DAMAGE.includes(p.k) && p.v === v)
  for (let i = 0; i < 900 && !hit(); i++) {
    holdFoe()
    updateSim(STEP)
  }
  return hit()
}

beforeEach(open)

describe('the callout a landed spell wears (§6.6a)', () => {
  it('a hand closing on her strength: resisted, over her, carrying its ×0.55', () => {
    expect(S.eStrong).toBe(WIND)
    const p = landOn(WIND, 1)
    expect(p?.k).toBe('resistHit')
    expect(p?.p?.m).toBe(STRONG_MUL)
    expect(S.pops.some((q) => q.k === 'weakHit')).toBe(false)
  })

  it('her weakness still says WEAK!, a plain rune a plain number', () => {
    expect(landOn(NATURE, 1)?.k).toBe('weakHit')
    open()
    expect(landOn(FIRE, 1)?.k).toBe('hit')
  })

  it('a spell her Crystal Ward sends back lands on Aurora as a plain hit', () => {
    for (const rune of [NATURE, WIND]) {
      open()
      S.eGuard = 6
      S.eGuardK = 4
      const p = landOn(rune, 0)
      expect(S.pops.some((q) => q.k === 'reflected'), `rune ${rune}: bounced`).toBe(true)
      expect(p?.k, `rune ${rune}: over Aurora`).toBe('hit')
      expect(S.pops.some((q) => (q.k === 'weakHit' || q.k === 'resistHit') && q.v === 0), `rune ${rune}`).toBe(false)
    }
  })
})

describe('the amber closing slot: the earliest warning (§6.6a)', () => {
  it('marks the slot that closes a HITTING hand on her strength, and only that', () => {
    const o = { sigs: 0 }
    // Fire, Wind: closes on Wind, a spell that flies at her — its last slot.
    expect(hits([FIRE, WIND], 0)).toBe(true)
    expect(resistWarnSlot([FIRE, WIND], WIND, o)).toBe(1)
    expect(resistWarnSlot([WIND], WIND, o)).toBe(hits([WIND], 0) ? 0 : -1)
    // The same runes the other way round close on Fire: no mark.
    expect(resistWarnSlot([WIND, FIRE], WIND, o)).toBe(-1)
    // A hand that closes on Wind but does not HIT (a ward) takes no ×0.55.
    const ward = [NATURE, WIND]
    expect(hits(ward, 0)).toBe(false)
    expect(resistWarnSlot(ward, WIND, o)).toBe(-1)
    expect(resistWarnSlot([EARTH, WIND], WIND, o)).toBe(hits([EARTH, WIND], 0) ? 1 : -1)
    // Nothing in hand, no strength shown, versus, or the lesson's own ✕ up.
    expect(resistWarnSlot([], WIND, o)).toBe(-1)
    expect(resistWarnSlot([FIRE, WIND], -1, o)).toBe(-1)
    expect(resistWarnSlot([FIRE, WIND], WIND, { versus: true })).toBe(-1)
    expect(resistWarnSlot([FIRE, WIND], WIND, { lesson: true })).toBe(-1)
  })

  it('the HUD mirrors it on the live hand, and drops it when another rune closes it', () => {
    S.queue.length = 0
    S.queue.push(FIRE as Rune, WIND as Rune)
    syncHud(0)
    expect(hud.resistSlot).toBe(1)
    S.queue.length = 0
    S.queue.push(WIND as Rune, FIRE as Rune)
    syncHud(0)
    expect(hud.resistSlot).toBe(-1)
  })
})

describe('the badge flash: the link (§6.6a)', () => {
  it('bumps on every resisted hit, and not on any other', () => {
    syncHud(0)
    const before = hud.resistFlash
    expect(landOn(FIRE, 1)?.k).toBe('hit')
    syncHud(0)
    expect(hud.resistFlash, 'a plain hit').toBe(before)
    open()
    expect(landOn(WIND, 1)?.k).toBe('resistHit')
    syncHud(0)
    expect(hud.resistFlash, 'a resisted hit').toBe(before + 1)
  })
})

describe('the canvas amber is the token', () => {
  it('RESIST_INK = --am-resist (theme.sass)', () => {
    const sass = readFileSync('src/assets/css/theme.sass', 'utf8')
    const m = /--am-resist:\s*(#[0-9A-Fa-f]{6})/.exec(sass)
    expect(m?.[1]?.toUpperCase()).toBe(RESIST_INK.toUpperCase())
  })
})

describe('the callout edge guard (popGuard.ts)', () => {
  it('reads a wider script as wider, and keeps a drifting number further in', () => {
    expect(textEm('КОМБО x2')).toBeGreaterThan(textEm('x2 COMBO'))
    expect(textEm('コンボ')).toBeGreaterThan(textEm('ABC'))
    expect(popHalfEm(4, true) - popHalfEm(4, false)).toBeCloseTo(1, 5)
  })

  it('clamps a callout between its own half-widths of both edges', () => {
    const half = popHalfEm(textEm('x2 COMBO'), false)
    expect(guardedLeft(612.34, half)).toBe(`clamp(${half}em, 612.3px, calc(100% - ${half}em))`)
  })
})
