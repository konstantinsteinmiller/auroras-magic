// THE PAINTED LOOKS (`duel/frameRig.ts`). Aurora and Umbra draw as their
// painted poses, and Umbra's friends — every chapter's standard foe from 2 to
// 9 (owner, 2026-09-26: "variants of Umbra's model with different hair colours
// and other names") — as Umbra's poses in their own hair. A friend's duel
// must therefore load Umbra's strip AND her hair mask; nobody else needs the mask.

import { describe, expect, it } from 'vitest'
import { frameLookOf } from '@/game/duel/chars'
import { frameLook, frameArtId, hairArtId } from '@/game/duel/frameRig'
import { FRAME_DATA } from '@/game/duel/frameData'
import { FOES, FIRST_UMBRA, shadowOf, guardianOf } from '@/game/duel/foes'
import { duelWants } from '@/game/artSchedule'
import { defaultCampaign } from '@/game/campaign/state'
import { NODES_PER_CHAPTER } from '@/game/campaign/tables'

const LAND = { portrait: false, clothInDuel: false }
const keys = (n: number): string[] => duelWants(n, defaultCampaign(), LAND).map(([k, i]) => `${k}/${i}`)

describe('who draws as which painted look', () => {
  it('Aurora in her own colours; a skin, a mane or a portrait emote keeps the puppet', () => {
    expect(frameLookOf({}, -1)).toBe('aurora')
    expect(frameLookOf({ mane: 'rainbow' }, -1)).toBeNull()
    expect(frameLookOf({ face: {} as never }, -1)).toBeNull()
  })

  it('Umbra herself, in the first duel and in chapters 1 and 10', () => {
    expect(frameLookOf({ foe: FIRST_UMBRA }, 1)).toBe('umbra')
    expect(frameLookOf({ foe: shadowOf(0) }, 1)).toBe('umbra')
    expect(frameLookOf({ foe: shadowOf(9) }, 1)).toBe('umbra')
  })

  it("each friend wears Umbra's strip in her own mane and streak — eight different looks", () => {
    const looks = new Set<string>()
    for (let c = 1; c <= 8; c++) {
      const foe = FOES[shadowOf(c)]!
      const look = frameLookOf({ foe: shadowOf(c) }, 1)
      expect(look).toBe(frameLook('umbra', [foe.pal[3], foe.pal[4]]))
      looks.add(look!)
    }
    expect(looks.size).toBe(8)
  })

  it('a Guardian keeps her recoloured puppet; the finale boss is Umbra herself', () => {
    for (let c = 0; c < 9; c++) expect(frameLookOf({ foe: guardianOf(c) }, 1)).toBeNull()
    expect(frameLookOf({ foe: guardianOf(9) }, 1)).toBe('umbra')
  })
})

describe("a friend's duel loads Umbra's strip and her hair mask", () => {
  const node = (chapter: number): number => chapter * NODES_PER_CHAPTER

  it.runIf(!!FRAME_DATA.umbra?.hair)('chapters 2–9: the strip and the mask', () => {
    for (let c = 1; c <= 8; c++) {
      const k = keys(node(c))
      expect(k).toContain(`rig/${frameArtId('umbra')}`)
      expect(k).toContain(`rig/${hairArtId('umbra')}`)
    }
  })

  it.runIf(!!FRAME_DATA.umbra)('Umbra herself: her strip, no mask', () => {
    for (const c of [0, 9]) {
      const k = keys(node(c))
      expect(k).toContain(`rig/${frameArtId('umbra')}`)
      expect(k).not.toContain(`rig/${hairArtId('umbra')}`)
    }
  })
})
