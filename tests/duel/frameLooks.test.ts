// THE PAINTED LOOKS (`duel/frameRig.ts`, `chars.frameDressOf`). Every duelist
// draws as painted poses (owner, 2026-09-27): Aurora in her own colours or
// recoloured by a skin or a mane colour; Umbra herself as painted; Umbra's
// friends — every chapter's standard foe from 2 to 9 (owner, 2026-09-26:
// "variants of Umbra's model with different hair colours and other names") —
// as Umbra's strip in their own hair; a Guardian in whichever strip is nearer
// her coat, in her whole palette. A recoloured look needs its strip's region
// mask; Umbra as painted does not.

import { describe, expect, it } from 'vitest'
import { frameDressOf } from '@/game/duel/chars'
import { frameArtId, regionsArtId, hiArtId, hiRegionsArtId } from '@/game/duel/frameRig'
import { FRAME_DATA } from '@/game/duel/frameData'
import { FOES, FIRST_UMBRA, shadowOf, guardianOf } from '@/game/duel/foes'
import { lum } from '@/game/duel/puppet'
import { duelWants, planFor } from '@/game/artSchedule'
import { defaultCampaign } from '@/game/campaign/state'
import { NODES_PER_CHAPTER } from '@/game/campaign/tables'

const LAND = { portrait: false, clothInDuel: false }
const keys = (n: number): string[] => duelWants(n, defaultCampaign(), LAND).map(([k, i]) => `${k}/${i}`)
const MIDNIGHT = ['#3c4aa6', '#a9dcff'] as const

describe('what each duelist wears as painted poses', () => {
  it('Aurora as painted; a skin or a mane colour recolours HER strip; a portrait emote keeps the puppet', () => {
    expect(frameDressOf({}, -1)).toMatchObject({ who: 'aurora', look: null })
    const maned = frameDressOf({ mane: MIDNIGHT }, -1)!
    expect(maned.who).toBe('aurora')
    expect(maned.look?.mane).toBeTruthy()
    expect(maned.look?.coat).toBeUndefined()
    const skinned = frameDressOf({ skin: FOES[shadowOf(9)]!.pal }, -1)!
    expect(skinned.who).toBe('aurora')
    expect(skinned.look?.coat).toBeTruthy()
    expect(frameDressOf({ face: {} as never }, -1)).toBeNull()
  })

  it('Umbra herself, as painted — the first duel, chapters 1 and 10, and the finale', () => {
    for (const foe of [FIRST_UMBRA, shadowOf(0), shadowOf(9), guardianOf(9)]) {
      expect(frameDressOf({ foe }, 1)).toMatchObject({ who: 'umbra', look: null })
    }
  })

  it("each friend is Umbra's strip in her own hair only — eight different looks", () => {
    const seen = new Set<string>()
    for (let c = 1; c <= 8; c++) {
      const d = frameDressOf({ foe: shadowOf(c) }, 1)!
      expect(d.who).toBe('umbra')
      expect(d.look?.mane).toBeTruthy()
      expect(d.look?.coat).toBeUndefined()
      expect(d.look?.horn).toBeUndefined()
      expect(d.look?.hoof).toBeUndefined()
      seen.add(d.key)
    }
    expect(seen.size).toBe(8)
  })

  it("a Guardian wears the strip nearer her coat's light, in her own coat", () => {
    for (let c = 0; c < 9; c++) {
      const foe = FOES[guardianOf(c)]!
      const d = frameDressOf({ foe: guardianOf(c) }, 1)!
      expect(d.who).toBe(lum(foe.pal[0]) > 0.55 ? 'aurora' : 'umbra')
      expect(d.look?.coat).toBeTruthy()
    }
  })
})

describe('a duel loads each strip, and a region mask only for a recolour', () => {
  const node = (chapter: number): number => chapter * NODES_PER_CHAPTER

  it.runIf(!!FRAME_DATA.umbra?.regions)("a friend's duel: Umbra's strip and its mask", () => {
    for (let c = 1; c <= 8; c++) {
      const k = keys(node(c))
      expect(k).toContain(`rig/${frameArtId('umbra')}`)
      expect(k).toContain(`rig/${regionsArtId('umbra')}`)
    }
  })

  it.runIf(!!FRAME_DATA.umbra)('Umbra herself: her strip, no mask', () => {
    for (const c of [0, 9]) {
      const k = keys(node(c))
      expect(k).toContain(`rig/${frameArtId('umbra')}`)
      expect(k).not.toContain(`rig/${regionsArtId('umbra')}`)
    }
  })

  it.runIf(!!FRAME_DATA.aurora?.regions && !!FRAME_DATA.umbra?.regions)("a Guardian's duel: her strip and its mask, no piece set", () => {
    for (let c = 0; c < 9; c++) {
      const foe = FOES[guardianOf(c)]!
      const who = lum(foe.pal[0]) > 0.55 ? 'aurora' : 'umbra'
      const k = keys(node(c) + NODES_PER_CHAPTER - 1)
      expect(k).toContain(`rig/${frameArtId(who)}`)
      expect(k).toContain(`rig/${regionsArtId(who)}`)
      expect(k.some((x) => x.includes('duelist-'))).toBe(false)
    }
  })
})

// THE SHARP STRIPS (owner, 2026-09-27: "just too blurry" — the VS screen, the
// tent, very large screens): every frame again within 512 px, same rig and
// matrices, queued right behind a duel's and the tent's first screen on a
// device the render controller has not throttled.
describe('the sharp strips', () => {
  it.runIf(!!FRAME_DATA.aurora?.hi)('are the same frames at twice the scale, each within 512 px', () => {
    for (const who of ['aurora', 'umbra'] as const) {
      const set = FRAME_DATA[who]!
      const hi = set.hi!
      expect(Object.keys(hi.rects).sort()).toEqual(Object.keys(set.rects).sort())
      expect(hi.px).toBeCloseTo(set.px * 2, 5)
      for (const r of Object.values(hi.rects)) expect(Math.max(r[2]!, r[3]!)).toBeLessThanOrEqual(512)
      for (const r of Object.values(set.rects)) expect(Math.max(r[2]!, r[3]!)).toBeLessThanOrEqual(256)
    }
  })

  it.runIf(!!FRAME_DATA.aurora?.hi)("a duel queues its duelists' sharp strips NEXT, never in the hold", () => {
    const save = { ...defaultCampaign(), prologueSeen: true, introSeen: true }
    const n = 1 * NODES_PER_CHAPTER + NODES_PER_CHAPTER - 1 // a Guardian: a recolour
    const p = planFor({ scene: 'duel', node: n }, save, { ...LAND, sharpRig: true })
    const next = p.next.map(([k, i]) => `${k}/${i}`)
    const hold = p.hold.map(([k, i]) => `${k}/${i}`)
    expect(next).toContain(`rig/${hiArtId('aurora')}`)
    for (const k of hold) expect(k).not.toMatch(/-hi$/)
    const who = lum(FOES[guardianOf(1)]!.pal[0]) > 0.55 ? 'aurora' : 'umbra'
    expect(next).toContain(`rig/${hiArtId(who)}`)
    expect(next).toContain(`rig/${hiRegionsArtId(who)}`)
    // a throttled device never asks for them
    const low = planFor({ scene: 'duel', node: n }, save, { ...LAND, sharpRig: false })
    for (const k of [...low.hold, ...low.next, ...low.soon, ...low.ahead]) expect(k[1]).not.toMatch(/-hi$/)
  })

  it.runIf(!!FRAME_DATA.aurora?.hi)("the tent queues Aurora's sharp strip and mask", () => {
    const save = { ...defaultCampaign(), prologueSeen: true, introSeen: true }
    const next = planFor({ scene: 'wardrobe', node: -1 }, save, { ...LAND, sharpRig: true }).next.map(([k, i]) => `${k}/${i}`)
    expect(next).toContain(`rig/${hiArtId('aurora')}`)
    expect(next).toContain(`rig/${hiRegionsArtId('aurora')}`)
  })
})
