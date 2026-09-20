// The runes are earned (story-spec §8.30), and the foe fights with the ones
// the player holds.
//
// Two rules the duel has to keep, and neither is visible from the outside
// until a child meets a shape she has never been shown:
//
//   • she starts with two, and a chest gives the rest on a fixed schedule;
//   • the foe may only reach for runes the player holds — plus her own
//     chapter's magic, the rune that chapter's chest is about to give, which
//     is how a chapter introduces it.

import { beforeEach, describe, expect, it } from 'vitest'
import { FIRE, WIND, ICE, EARTH, NATURE, ILLUSION, PH_DUEL, type Rune } from '@/game/duel/config'
import { shadowOf, guardianOf, FOES } from '@/game/duel/foes'
import { S } from '@/game/duel/state'
import { resetDuel, updateSim } from '@/game/duel/sim'
import { defaultCampaign } from '@/game/campaign/state'
import { STARTING_RUNES, EARLY_RUNES, runeForNode, CHAPTERS } from '@/game/campaign/tables'

const STEP = 1 / 120

/** Every rune the foe reaches for over `seconds` of a real duel. */
const foeReaches = (foe: number, usesMagic: boolean, seconds = 45): Set<number> => {
  resetDuel({ foe, usesMagic, lossStreak: 0 })
  const seen = new Set<number>()
  for (let i = 0; i < Math.round(seconds / STEP); i++) {
    updateSim(STEP)
    if (S.eRune >= 0) seen.add(S.eRune)
    for (const r of S.equeue) seen.add(r)
    // Keep her fighting: a duel that ends stops telling us anything.
    if (S.phase !== PH_DUEL) resetDuel({ foe, usesMagic, lossStreak: 0 })
    S.hp = S.hpMax
    S.ehp = S.ehpMax
  }
  return seen
}

beforeEach(() => {
  S.campaign = defaultCampaign()
  S.wins = 20
  S.losses = 0
  S.intro = 0
  S.versus = false
})

describe('the schedule', () => {
  it('starts her with two runes: one to throw, one to hide behind', () => {
    expect(STARTING_RUNES).toBe((1 << FIRE) | (1 << EARTH))
    expect(defaultCampaign().runesUnlocked).toBe(STARTING_RUNES)
  })

  it('gives the third after the first battle and the fourth after the third', () => {
    expect(EARLY_RUNES[0]).toBe(ICE)
    expect(EARLY_RUNES[2]).toBe(WIND)
    expect(runeForNode(0)).toBe(ICE)
    expect(runeForNode(1)).toBeNull()
    expect(runeForNode(2)).toBe(WIND)
    expect(runeForNode(3)).toBeNull()
    // The fifth comes with the chapter's boss chest, as every chapter's does.
    expect(runeForNode(4)).toBe(NATURE)
    expect(runeForNode(4)).toBe(CHAPTERS[0]!.newRune)
  })

  it('hands one over at the end of every chapter that has one to give', () => {
    for (let c = 0; c < 10; c++) {
      expect(runeForNode(c * 5 + 4), `chapter ${c + 1}`).toBe(CHAPTERS[c]!.newRune)
      // The two Signature-Spell chapters give a spell instead: twelve runes,
      // ten chapters, one schedule.
      if (CHAPTERS[c]!.newRune === null) expect(CHAPTERS[c]!.signatureSpell).not.toBeNull()
    }
  })
})

describe('the foe fights with the player\'s runes (§8.30)', () => {
  it('reaches only for the two a new player holds', () => {
    const seen = foeReaches(shadowOf(0), false)
    expect(seen.size).toBeGreaterThan(0)
    for (const r of seen) expect([FIRE, EARTH], `rune ${r}`).toContain(r)
  })

  it('takes up each rune as the player earns it', () => {
    S.campaign.runesUnlocked = STARTING_RUNES | (1 << ICE)
    const seen = foeReaches(shadowOf(0), false)
    for (const r of seen) expect([FIRE, EARTH, ICE], `rune ${r}`).toContain(r)
    expect(seen.has(ICE)).toBe(true)
  })

  it('may show the chapter\'s own magic — the rune its chest is about to give', () => {
    // Chapter 5's Echo leans on Illusion from node 3 (§6.13); the player is
    // given Illusion at that chapter's boss chest.
    const c = 4
    const foe = guardianOf(c)
    expect(FOES[foe]!.magic).toBe(ILLUSION)
    S.campaign.runesUnlocked = STARTING_RUNES | (1 << ICE) | (1 << WIND) | (1 << NATURE)
    const allowed = [FIRE, EARTH, ICE, WIND, NATURE, ILLUSION]
    for (const r of foeReaches(foe, true)) expect(allowed, `rune ${r}`).toContain(r)
  })

  it('never reaches for a rune from a chapter the player has not reached', () => {
    // Chapter 10's Umbra, met by a player who somehow arrived with two runes:
    // she may use her own chapter's magic and nothing else that is unearned.
    const foe = guardianOf(9)
    const magic = FOES[foe]!.magic
    for (const r of foeReaches(foe, true, 30)) {
      const ok = r === FIRE || r === EARTH || r === magic
      expect(ok, `rune ${r} is not the player's, nor her chapter's magic`).toBe(true)
    }
  })

  it('leaves her scripted contracts alone — versus holds the whole kit', () => {
    S.campaign.runesUnlocked = 0xfff
    const seen = foeReaches(guardianOf(3), true)
    for (const r of seen) expect(r as Rune).toBeGreaterThanOrEqual(0)
    expect(seen.size).toBeGreaterThan(1)
  })
})
