// The dress-up photo card (retention roadmap item 16).
//
// Two things are worth pinning and both are about the SAVE rather than the
// drawing: a card is a recipe string that must survive a round trip through a
// portal's cloud store, and it must never be longer than the field that holds
// it — a blob a portal truncates is a blob that comes back as junk. The third
// is the six-slot ring, which exists so that a seventh photo is never a
// refusal.

import { beforeEach, describe, expect, it } from 'vitest'
import { S } from '@/game/duel/state'
import { defaultCampaign, readCampaign, PHOTO_SLOTS, PHOTO_RECIPE_MAX, NODE_COUNT } from '@/game/campaign/state'
import { setBit } from '@/game/campaign/bitset'
import { COSMETIC_SLOTS, COSMETICS } from '@/game/campaign/tables'
import { MANE_SWATCHES } from '@/game/cosmetics/rig-cosmetics'
import { analyticsLog, __resetAnalytics } from '@/use/useAnalytics'
import {
  PHOTO_POSES, RECIPE_TAG, currentPhoto, decodePhoto, encodePhoto, photoSlots, photosFull, takePhoto,
  type PhotoRecipe
} from '@/game/album/photo'

const RECIPE: PhotoRecipe = { node: 23, pose: 2, mane: 5, equipped: [0, -1, 4, -1, 9, 12, -1] }

const shots = () => analyticsLog().filter((r) => r.event === 'photo_taken')

beforeEach(() => {
  S.campaign = defaultCampaign()
  __resetAnalytics()
})

describe('the recipe string', () => {
  it('round-trips every field it carries', () => {
    const out = decodePhoto(encodePhoto(RECIPE))
    expect(out).toEqual(RECIPE)
  })

  it('carries its version tag, so a later shape can refuse an older card', () => {
    expect(encodePhoto(RECIPE).startsWith(`${RECIPE_TAG}|`)).toBe(true)
    expect(decodePhoto(encodePhoto(RECIPE).replace(RECIPE_TAG, 'a9'))).toBeNull()
  })

  it('never writes more characters than the save field holds', () => {
    // The worst case in every field at once, and then the whole grid of
    // sensible ones: the cap is a promise about the format, not about one
    // lucky outfit.
    const worst = encodePhoto({
      node: NODE_COUNT - 1,
      pose: PHOTO_POSES - 1,
      mane: MANE_SWATCHES.length - 1,
      equipped: COSMETIC_SLOTS.map(() => 31)
    })
    expect(worst.length).toBeLessThanOrEqual(PHOTO_RECIPE_MAX)
    for (let node = 0; node < NODE_COUNT; node++) {
      for (let pose = 0; pose < PHOTO_POSES; pose++) {
        const s = encodePhoto({
          node,
          pose,
          mane: node % MANE_SWATCHES.length,
          equipped: COSMETIC_SLOTS.map((_, i) => (node + i) % COSMETICS.length)
        })
        expect(s.length).toBeLessThanOrEqual(PHOTO_RECIPE_MAX)
      }
    }
  })

  it('clamps anything out of range rather than storing it', () => {
    const wild = encodePhoto({ node: 999, pose: 99, mane: -4, equipped: [999, -999, 1.7, NaN, 3, 3, 3] })
    const out = decodePhoto(wild)!
    expect(out.node).toBe(NODE_COUNT - 1)
    expect(out.pose).toBe(PHOTO_POSES - 1)
    expect(out.mane).toBe(0)
    expect(out.equipped).toEqual([31, -1, 1, -1, 3, 3, 3])
  })

  it('refuses junk instead of drawing something wrong', () => {
    for (const junk of [
      '', 'hello', 'a1', 'a1|1|1|1', 'a1|1|1|1|0,0,0', 'a1|x|1|1|0,0,0,0,0,0,0', 'a1|1|1|1|0,0,0,0,0,0,x',
      'a1|-1|0|0|0,0,0,0,0,0,0', `a1|1|1|1|0,0,0,0,0,0,0|${'x'.repeat(PHOTO_RECIPE_MAX)}`
    ]) {
      expect(decodePhoto(junk), junk).toBeNull()
    }
  })

  it('refuses anything longer than the cap outright', () => {
    expect(decodePhoto('a'.repeat(PHOTO_RECIPE_MAX + 1))).toBeNull()
  })
})

describe('what a photo is taken OF', () => {
  it('stands her in front of the last place she brought back', () => {
    S.campaign.sectorsDone = setBit(setBit(S.campaign.sectorsDone, 1), 12)
    expect(currentPhoto().node).toBe(12)
  })

  it('falls back to the first sector when nothing is restored yet', () => {
    expect(currentPhoto().node).toBe(0)
  })

  it('takes what she is wearing right now', () => {
    S.campaign.giftsEquipped = [3, -1, -1, -1, -1, -1, 2]
    S.campaign.maneSwatch = 4
    const now = currentPhoto()
    expect(now.equipped).toEqual([3, -1, -1, -1, -1, -1, 2])
    expect(now.mane).toBe(4)
  })

  it('cycles the pose, so six cards are not one card six times', () => {
    const poses: number[] = []
    for (let i = 0; i < PHOTO_POSES; i++) {
      poses.push(currentPhoto().pose)
      takePhoto()
    }
    expect(new Set(poses).size).toBe(PHOTO_POSES)
  })
})

describe('the six slots', () => {
  it('fills them one at a time, oldest first', () => {
    for (let i = 0; i < PHOTO_SLOTS; i++) {
      expect(takePhoto()).toBe(i)
      expect(S.campaign.photos).toHaveLength(i + 1)
    }
    expect(photosFull()).toBe(true)
  })

  it('lets the seventh photo in: the oldest leaves, nothing is refused', () => {
    // A different keepsake before each shot, so the six cards are six distinct
    // strings and the ring can actually be watched turning.
    const take = (head: number): string => {
      S.campaign.giftsEquipped = [head, -1, -1, -1, -1, -1, -1]
      takePhoto()
      return S.campaign.photos[S.campaign.photos.length - 1]!
    }
    const first = take(0)
    const rest = [1, 2, 3, 4, 5].map(take)
    expect(S.campaign.photos).toEqual([first, ...rest])
    expect(photosFull()).toBe(true)

    const seventh = take(6)
    expect(S.campaign.photos).toHaveLength(PHOTO_SLOTS)
    expect(S.campaign.photos).toEqual([...rest, seventh])
    expect(S.campaign.photos.includes(first)).toBe(false)
  })

  it('reports the slot it landed in, once per photo', () => {
    takePhoto()
    takePhoto()
    expect(shots().map((r) => r.props.slot)).toEqual([0, 1])
  })

  it('never stores a string the save reader would truncate', () => {
    S.campaign.sectorsDone = setBit(S.campaign.sectorsDone, NODE_COUNT - 1)
    S.campaign.giftsEquipped = [31, 31, 31, 31, 31, 31, 31]
    S.campaign.maneSwatch = MANE_SWATCHES.length - 1
    for (let i = 0; i < PHOTO_SLOTS + 3; i++) takePhoto()
    for (const s of S.campaign.photos) expect(s.length).toBeLessThanOrEqual(PHOTO_RECIPE_MAX)
    // And the save's own reader hands every one of them straight back.
    const back = readCampaign(JSON.parse(JSON.stringify(S.campaign)))
    expect(back.photos).toEqual(S.campaign.photos)
  })

  it('always shows six places, filled or not', () => {
    expect(photoSlots()).toHaveLength(PHOTO_SLOTS)
    expect(photoSlots().every((s) => s === null)).toBe(true)
    takePhoto()
    expect(photoSlots()[0]).toBe(S.campaign.photos[0])
    expect(photoSlots()[1]).toBeNull()
  })

  it('shows a mangled card as an empty place rather than a broken one', () => {
    S.campaign.photos = ['a1|nonsense']
    expect(photoSlots()[0]).toBeNull()
  })
})
