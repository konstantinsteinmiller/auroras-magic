// The story's shape as data (story-spec §4.3, §6.12, §10.2): the node grid,
// who each node fights, what each boss chest holds. Position is identity.

import { describe, expect, it } from 'vitest'
import {
  CHAPTERS, CHAPTER_COUNT, NODES, NODES_PER_CHAPTER, COSMETICS, COSMETIC_SLOTS, GIFTS, LAST_BUILT_NODE, FIRST_GIFT_NODE,
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

  it('ships all ten chapters built (S4)', () => {
    expect(CHAPTERS.length).toBe(CHAPTER_COUNT)
    expect(CHAPTERS.every((c) => c.built)).toBe(true)
    expect(LAST_BUILT_NODE).toBe(49)
    expect(CHAPTERS.map((c) => c.newRune)).toEqual([NATURE, 5, 6, null, 7, 8, 9, null, 10, 11])
  })

  it('gives each chapter either a new rune or a Signature Spell, never both', () => {
    for (const c of CHAPTERS) expect((c.newRune === null) !== (c.signatureSpell === null)).toBe(true)
    expect(CHAPTERS.map((c) => c.slug)).toEqual(Array.from({ length: 10 }, (_, i) => `c${i + 1}`))
  })
})

describe('the boss chests (§8.2, §10.13.C)', () => {
  it('holds a keepsake on the bosses, the early node and the second shelf (§8.2, §2.4)', () => {
    // The Flower Crown moved forward to the second battle (owner,
    // 2026-09-21), so the wardrobe is not empty for a child's first five
    // duels. Every chapter's own keepsake is still its boss's — and since
    // rule 20's second shelf, the chapter's FOURTH node carries one too
    // (plus the second node of chapters 2, 4, 6 and 8).
    const second = new Set([3, 6, 8, 13, 16, 18, 23, 26, 28, 33, 36, 38, 43, 48])
    for (let n = 0; n < NODE_COUNT; n++) {
      const carries = n === FIRST_GIFT_NODE || second.has(n) || (nodeIsBoss(n) && nodeChapter(n) > 0)
      expect(NODES[n]!.giftId !== null, `node ${n}`).toBe(carries)
    }
    const g = GIFTS[NODES[FIRST_GIFT_NODE]!.giftId!]!
    expect(g.kind).toBe('cosmetic')
    expect(COSMETICS[g.cosmeticId!]!.slug).toBe('flowerCrown')
    expect(COSMETICS[g.cosmeticId!]!.slot).toBe('head')
  })

  it('gives every keepsake exactly once, and every slot a real choice (rule 20)', () => {
    // The wardrobe's whole promise: a slot is a CHOICE. Every slot the rig
    // can carry offers more than one thing, every keepsake is handed over
    // exactly once, and no chest hands out a keepsake nobody can wear.
    const given = new Map<number, number>()
    for (let n = 0; n < NODE_COUNT; n++) {
      const id = NODES[n]!.giftId
      if (id === null) continue
      const def = GIFTS[id]!
      if (def.kind !== 'cosmetic') continue
      given.set(def.cosmeticId!, (given.get(def.cosmeticId!) ?? 0) + 1)
    }
    expect(given.size, 'every keepsake is given').toBe(COSMETICS.length)
    for (const [id, times] of given) expect(times, COSMETICS[id]!.slug).toBe(1)
    for (const slot of COSMETIC_SLOTS) {
      const n = COSMETICS.filter((c) => c.slot === slot).length
      // The mane slot is the one exception: its single keepsake IS a choice
      // of eight swatches, which is where that slot's alternatives live.
      expect(n, slot).toBeGreaterThanOrEqual(slot === 'mane' ? 1 : 3)
    }
  })

  it('ends on the versus unlock, and every cosmetic sits in a real slot', () => {
    expect(GIFTS[NODES[49]!.giftId!]).toEqual({ kind: 'feature', feature: 'versus' })
    for (const c of COSMETICS) expect(COSMETIC_SLOTS).toContain(c.slot)
  })
})

describe('the tool in each gift (§8.4)', () => {
  it('is the Sunbeam in every boss chest, the Brush through chapter 3, the Eraser after', async () => {
    const { toolOf } = await import('@/game/campaign/tables')
    expect([0, 1, 2, 3].map(toolOf)).toEqual(['brush', 'brush', 'brush', 'brush'])
    expect([4, 9, 14, 49].map(toolOf)).toEqual(['sunbeam', 'sunbeam', 'sunbeam', 'sunbeam'])
    expect([10, 13].map(toolOf)).toEqual(['brush', 'brush'])
    expect([15, 18, 45].map(toolOf)).toEqual(['eraser', 'eraser', 'eraser'])
  })
})
