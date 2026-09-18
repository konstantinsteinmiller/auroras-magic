// The keepsakes on Aurora's rig (story-spec §9.7, C17): each slot's item
// hooks into its own draw-order slot, and nothing is worn by default.

import { beforeEach, describe, expect, it } from 'vitest'
import { S } from '@/game/duel/state'
import { defaultCampaign } from '@/game/campaign/state'
import { COSMETICS } from '@/game/campaign/tables'
import { equippedHooks, equippedKey } from '@/game/cosmetics/rig-cosmetics'

const idOf = (slug: string): number => COSMETICS.findIndex((c) => c.slug === slug)

beforeEach(() => {
  S.campaign = defaultCampaign()
})

describe('equipped hooks', () => {
  it('wears nothing on a fresh save', () => {
    const h = equippedHooks()
    expect(h.afterHead).toBeUndefined()
    expect(h.afterMane).toBeUndefined()
    expect(h.beforeTorso).toBeUndefined()
    expect(equippedKey()).toBe('-|-|-')
  })

  it('puts the crown on the head, the necklace at the neck, the wings on the back', () => {
    S.campaign.giftsEquipped = [idOf('flowerCrown'), idOf('seashellNecklace'), idOf('pegasusWings'), -1, -1, -1, -1]
    const h = equippedHooks()
    expect(typeof h.afterHead).toBe('function')
    expect(typeof h.afterMane).toBe('function') // the necklace and the near wing
    expect(typeof h.beforeTorso).toBe('function') // the far wing
    expect(equippedKey()).toBe('flowerCrown|seashellNecklace|pegasusWings')
  })

  it('ignores an item equipped in the wrong slot', () => {
    S.campaign.giftsEquipped = [idOf('pegasusWings'), -1, -1, -1, -1, -1, -1]
    expect(equippedHooks().afterHead).toBeUndefined()
  })
})
