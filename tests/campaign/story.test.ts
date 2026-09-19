// The story's shape as data (story-spec §10.7–§10.10, §8.11): every node of
// all ten chapters has its beats; chapter 10's lead-up is the returning
// Guardians, not a filler creature; every text key exists in English; the
// finale unlocks wandering Umbra, who only ever visits a restored sector.

import { beforeEach, describe, expect, it } from 'vitest'
import { dialogueFor, thanksLines, STORY_KEYS } from '@/game/story/story'
import { CHAPTERS, FINALE_NODE, nodeIsBoss } from '@/game/campaign/tables'
import { S } from '@/game/duel/state'
import { defaultCampaign } from '@/game/campaign/state'
import { setBit, emptyBitset } from '@/game/campaign/bitset'
import { wanderOnMapOpen, wanderHome, greetWanderer, WANDER_LINES, __resetWanderer } from '@/game/map/wanderer'
import { mapHud } from '@/use/useMapHud'
import en from '@/i18n/locales/en'

const lookup = (key: string): unknown => key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], en)

describe('the dialogue of all ten chapters (§10.9, §10.10)', () => {
  it('every chapter opens with three bubbles, the second of them Umbra (§10.4)', () => {
    for (let c = 0; c < 10; c++) {
      const b = dialogueFor(c * 5)
      expect(b.length, `chapter ${c + 1}`).toBe(3)
      expect(b[1]!.speaker).toBe('umbra')
    }
  })

  it('every boss has a challenge and a thank-you; the finale thanks in four', () => {
    for (let n = 0; n < 50; n++) {
      if (!nodeIsBoss(n)) continue
      expect(dialogueFor(n).length, `node ${n}`).toBe(3)
      expect(thanksLines(n).length, `node ${n}`).toBe(n === FINALE_NODE ? 4 : 2)
    }
  })

  it('chapter 10’s lead-up is the returning Guardians, not a filler creature', () => {
    for (const n of [46, 47, 48]) {
      const b = dialogueFor(n)
      expect(b.length).toBe(2)
      expect(b.every((x) => x.speaker !== 'creature')).toBe(true)
    }
    // Chapters 1–9's standard nodes keep the shared templates (§10.8).
    expect(dialogueFor(16)[0]!.speaker).toBe('creature')
    expect(dialogueFor(16)[0]!.name).toBe(CHAPTERS[3]!.creature)
  })

  it('every story key exists in English, at most eight words', () => {
    expect(STORY_KEYS.length).toBeGreaterThan(80)
    for (const k of STORY_KEYS) {
      const s = lookup(k)
      expect(typeof s, k).toBe('string')
      expect((s as string).replace(/\{name\}/g, 'X').split(/\s+/).filter(Boolean).length, k).toBeLessThanOrEqual(8)
    }
    for (const k of WANDER_LINES) expect(typeof lookup(k), k).toBe('string')
    expect(typeof lookup('finale.line')).toBe('string')
  })
})

describe('wandering Umbra, after the finale (§8.11)', () => {
  beforeEach(() => {
    __resetWanderer()
    S.campaign = defaultCampaign()
    mapHud.visible = 0
  })

  it('stays away until the finale has been seen', () => {
    S.campaign.sectorsDone = setBit(emptyBitset(50), 3)
    wanderOnMapOpen()
    expect(wanderHome()).toBe(-1)
  })

  it('visits only a restored sector — on the page in view when it has one', () => {
    S.campaign.finaleSeen = true
    let done = emptyBitset(50)
    for (const n of [2, 3, 21, 22, 49]) done = setBit(done, n)
    S.campaign.sectorsDone = done
    mapHud.visible = 4
    for (let i = 0; i < 12; i++) {
      wanderOnMapOpen()
      expect([21, 22]).toContain(wanderHome())
    }
    mapHud.visible = 7 // nothing restored on this page: anywhere restored
    for (let i = 0; i < 12; i++) {
      wanderOnMapOpen()
      expect([2, 3, 21, 22, 49]).toContain(wanderHome())
    }
  })

  it('says her three lines in turn', () => {
    expect([greetWanderer(0), greetWanderer(1), greetWanderer(2), greetWanderer(3)]).toEqual([...WANDER_LINES, WANDER_LINES[0]])
  })
})
