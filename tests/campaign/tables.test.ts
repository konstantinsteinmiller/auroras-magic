// The story's shape as data (story-spec §4.3, §6.12, §10.2): the node grid,
// who each node fights, what each boss chest holds. Position is identity.

import { describe, expect, it } from 'vitest'
import {
  CHAPTERS, CHAPTER_COUNT, NODES, NODES_PER_CHAPTER, COSMETICS, COSMETIC_SLOTS, GIFTS, LAST_BUILT_NODE,
  nodeChapter, nodePosInChapter, nodeIsBoss, nodeFoe, duelSetup
} from '@/game/campaign/tables'
import { FOES, shadowOf, guardianOf } from '@/game/duel/foes'
import { NATURE } from '@/game/duel/config'
import { NODE_COUNT } from '@/game/campaign/state'

describe('the node grid (C5)', () => {
  it('is 10 chapters × 5 nodes, node 5 of each its boss', () => {
    expect(CHAPTER_COUNT * NODES_PER_CHAPTER).toBe(NODE_COUNT)
    expect(NODES.length).toBe(NODE_COUNT)
    for (let n = 0; n < NODE_COUNT; n++) {
      expect(nodeChapter(n)).toBe(Math.floor(n / 5))
      expect(nodePosInChapter(n)).toBe(n % 5)
      expect(nodeIsBoss(n)).toBe(n % 5 === 4)
    }
  })

  it('fights a shadow clone on nodes 1–4 and the Guardian on node 5', () => {
    for (let n = 0; n < NODE_COUNT; n++) {
      const c = nodeChapter(n)
      expect(nodeFoe(n)).toBe(nodeIsBoss(n) ? guardianOf(c) : shadowOf(c))
    }
    expect(FOES[nodeFoe(4)]!.slug).toBe('briar')
  })

  it('lets the chapter magic in from node 3 (C14)', () => {
    expect(duelSetup(0).usesMagic).toBe(false)
    expect(duelSetup(1).usesMagic).toBe(false)
    expect(duelSetup(2).usesMagic).toBe(true)
    expect(duelSetup(4).usesMagic).toBe(true)
    expect(duelSetup(4).def).toBe(FOES[guardianOf(0)])
  })

  it('ships chapter 1 built, and only chapter 1', () => {
    expect(CHAPTERS.length).toBe(CHAPTER_COUNT)
    expect(CHAPTERS[0]!.built).toBe(true)
    expect(CHAPTERS.slice(1).every((c) => !c.built)).toBe(true)
    expect(LAST_BUILT_NODE).toBe(4)
    expect(CHAPTERS[0]!.newRune).toBe(NATURE)
  })

  it('gives each chapter either a new rune or a Signature Spell, never both', () => {
    for (const c of CHAPTERS) expect((c.newRune === null) !== (c.signatureSpell === null)).toBe(true)
    expect(CHAPTERS.map((c) => c.slug)).toEqual(Array.from({ length: 10 }, (_, i) => `c${i + 1}`))
  })
})

describe('the boss chests (§8.2, §10.13.C)', () => {
  it('holds a keepsake on boss nodes only — chapter 1 a Flower Crown', () => {
    for (let n = 0; n < NODE_COUNT; n++) expect(NODES[n]!.giftId === null).toBe(!nodeIsBoss(n))
    const g = GIFTS[NODES[4]!.giftId!]!
    expect(g.kind).toBe('cosmetic')
    expect(COSMETICS[g.cosmeticId!]!.slug).toBe('flowerCrown')
    expect(COSMETICS[g.cosmeticId!]!.slot).toBe('head')
  })

  it('ends on the versus unlock, and every cosmetic sits in a real slot', () => {
    expect(GIFTS[NODES[49]!.giftId!]).toEqual({ kind: 'feature', feature: 'versus' })
    for (const c of COSMETICS) expect(COSMETIC_SLOTS).toContain(c.slot)
  })
})
