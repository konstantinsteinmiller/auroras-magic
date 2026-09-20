// What a spell LOOKS like (story-spec §8.31).
//
// The art table is data, so the things worth pinning are the promises the
// renderer makes about it:
//
//   • every one of the twelve elements has a look, and no two elements share
//     a silhouette they could be confused by;
//   • a cast knows what ELSE went into it (`mixRune`), which is what lets all
//     454 combinations read as combinations rather than as their lead rune;
//   • every golden spell with a name of its own flies with a flourish — the
//     test that keeps `SIG` in step with the spell matrix as it grows.

import { describe, expect, it } from 'vitest'
import { LOOK, ART_RUNES, lookOf, castLook, mixRune, bodyRadius, heft } from '@/game/duel/spellArt'
import { SPELLS, comboKey, FIRE, WIND, ICE, EARTH, WATER } from '@/game/duel/config'

describe('the element table (§8.31)', () => {
  it('covers every rune', () => {
    expect(LOOK).toHaveLength(ART_RUNES.length)
    for (const r of ART_RUNES) expect(lookOf(r), `rune ${r}`).toBeDefined()
  })

  it('gives each element its own silhouette', () => {
    // Half of these elements are a shade of blue, so the body IS the identity.
    expect(new Set(LOOK.map((l) => l.body)).size).toBe(LOOK.length)
  })

  it('answers for a rune that does not exist', () => {
    expect(lookOf(99)).toBe(lookOf(FIRE))
    expect(lookOf(-1)).toBe(lookOf(FIRE))
  })

  it('makes a heavy heavier everywhere at once', () => {
    expect(bodyRadius(3)).toBeGreaterThan(bodyRadius(1))
    expect(bodyRadius(1)).toBeGreaterThan(bodyRadius(0))
    expect(heft(3)).toBeGreaterThan(heft(1))
    expect(heft(1)).toBeGreaterThan(heft(0))
  })
})

describe('what else went into the cast', () => {
  it('is nothing, for a pure one', () => {
    expect(mixRune([FIRE], FIRE)).toBe(-1)
    expect(mixRune([FIRE, FIRE, FIRE], FIRE)).toBe(-1)
  })

  it('is the commonest rune that is not the lead', () => {
    // Lead is the LAST drawn (§6.2 step 7); the mix is what it was mixed with.
    expect(mixRune([ICE, ICE, FIRE], FIRE)).toBe(ICE)
    expect(mixRune([FIRE, ICE], ICE)).toBe(FIRE)
  })

  it('breaks a tie toward the one drawn first', () => {
    expect(mixRune([WIND, EARTH, FIRE], FIRE)).toBe(WIND)
  })

  it('never reports the lead as its own mix', () => {
    expect(castLook(FIRE, FIRE).mix).toBe(-1)
    expect(castLook(FIRE, ICE).mix).toBe(ICE)
  })
})

describe('the golden spells wear their own flourish', () => {
  it('one for every named spell that FLIES', () => {
    for (const [key, sp] of Object.entries(SPELLS)) {
      // Kind 2 is a barrier: it is a wall, not a shot, so it has no body to
      // wear a mark on. A single rune is the plain element, by design.
      if (sp[1] === 2 || !key.includes('.')) continue
      const lead = Number(key.split('.').pop())
      expect(castLook(lead, -1, key).mark, `${sp[0]} (${key})`).not.toBe('none')
    }
  })

  it('leaves every other combination the plain element look', () => {
    // A generated spell — three story runes — is its lead element and nothing
    // more. 454 combinations cannot each be hand-drawn.
    expect(castLook(WATER, -1, comboKey([5, 10, 11])).mark).toBe('none')
    expect(castLook(WATER, -1, '').mark).toBe('none')
  })

  it('keeps the element under the flourish', () => {
    // The mark decorates; it never replaces the silhouette the damage is
    // scaled by.
    expect(castLook(FIRE, -1, '0.0.0').body).toBe(lookOf(FIRE).body)
  })
})
