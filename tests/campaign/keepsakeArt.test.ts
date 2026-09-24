// The keepsakes' painted stills (story-spec §9.7; art-roadmap.md "2026-09-24 —
// paint-outstanding pass (wardrobe)").
//
// Three promises that rot silently:
//   • what a keepsake's draw functions ASK the art layer for is exactly what
//     `KEEPSAKE_WORN_ART` says — the schedule holds that list, so a seam the
//     list does not name is a painting that pops in, and a name no seam asks
//     for is a download nobody draws;
//   • a worn still's spec and its manifest sheet agree (panels, tint, file) —
//     or the slicer cuts panels nobody painted;
//   • a badge's REFERENCE never draws a painting, however the bench is set.

import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { S } from '@/game/duel/state'
import { defaultCampaign } from '@/game/campaign/state'
import { COSMETICS, COSMETIC_SLOTS, ALTERNATIVES } from '@/game/campaign/tables'
import { equippedHooks, outfitHooks } from '@/game/cosmetics/rig-cosmetics'
import {
  CROWN_ART, PET_STAR_ART, PEGASUS_WING_ART, NECKLACE_SHELL_ART, SCARF_WRAP_ART
} from '@/game/cosmetics/rig-cosmetics'
import {
  ACORN_CAP_ART, STAR_TIARA_ART, GOGGLES_ART, BOW_TIE_ART, MOON_PENDANT_ART, FLUTTER_ART, BEDROLL_ART, SATCHEL_ART,
  PET_CLOUD_ART, PET_FIREFLY_ART, VECTOR_ONLY_KEEPSAKES
} from '@/game/cosmetics/rig-accessories'
import { KEEPSAKE_ART } from '@/game/cosmetics/icons'
import { ITEM_ART, KEEPSAKE_WORN_ART, KEEPSAKE_ICON_SLUGS, keepsakeArtId, type ItemName } from '@/game/artIds'
import { ITEM_SHEETS } from '@/game/artSheet'
import { recordArtWants, setArtOverrides, type ArtWant } from '@/game/art'
import { NEUTRAL } from '@/game/artTint'
import type { ItemSpec } from '@/game/artItem'
import type { RigAnchors } from '@/game/duel/chars'
import { duelWants, wardrobeWants } from '@/game/artSchedule'

const idOf = (slug: string): number => COSMETICS.findIndex((c) => c.slug === slug)

/** Wear exactly `slug`, in its own slot. */
const wear = (slug: string): void => {
  const eq = [-1, -1, -1, -1, -1, -1, -1] as typeof S.campaign.giftsEquipped
  eq[COSMETIC_SLOTS.indexOf(COSMETICS[idOf(slug)]!.slot)] = idOf(slug)
  S.campaign.giftsEquipped = eq
}

/** A 2D context that draws nothing and answers everything. */
const nullCtx = (): CanvasRenderingContext2D => {
  const store: Record<string | symbol, unknown> = {}
  return new Proxy(store, {
    get: (o, k) => (k in o ? o[k] : () => undefined),
    set: (o, k, v) => {
      o[k] = v
      return true
    }
  }) as unknown as CanvasRenderingContext2D
}

/** A pose's anchors (stage space at the duel's Aurora spot), at time `t`. */
const anchors = (t: number, portrait: boolean, lift = 0): RigAnchors => ({
  neckCollar: [16, -97],
  neckDir: [0.3, -0.95],
  backWithers: [8, -102],
  tailBase: [-26, -80],
  t,
  lift,
  lose: 0,
  facing: 1,
  hoofFront: [425, 506],
  hoofHind: [373, 506],
  tailStage: [374, 422],
  bodyStage: [398, 426],
  headStage: [422, 384],
  portrait
})

/** Every painting the worn hooks ask for across a few frames, a hop and a
 *  portrait — recorded the way the schedule records a sector's painters. */
const askedWhileWorn = (slug: string): Set<string> => {
  wear(slug)
  const h = equippedHooks()
  const g = nullCtx()
  const wants: ArtWant[] = []
  for (const portrait of [false, true]) {
    for (const [t, lift] of [[3, 0], [3.2, 0], [3.4, 1], [3.6, 1], [9.9, 0]] as const) {
      const a = anchors(t, portrait, lift)
      wants.push(...recordArtWants(() => {
        h.afterHead?.(g)
        h.beforeTorso?.(g, a)
        h.afterMane?.(g, a)
        h.afterRig?.(g, a)
      }))
    }
  }
  // A photo card's frozen trail is the same keepsake too.
  const still = outfitHooks(S.campaign.giftsEquipped, 0, true)
  wants.push(...recordArtWants(() => still.afterRig?.(g, anchors(3, false))))
  return new Set(wants.map(([k, id]) => `${k}/${id}`))
}

beforeAll(() => {
  // The recorder only runs with the layer on; nothing here ever fetches.
  setArtOverrides(true, false)
})

beforeEach(() => {
  S.campaign = defaultCampaign()
})

describe('what a worn keepsake draws', () => {
  it('asks the art layer for exactly the paintings the schedule holds for it', () => {
    for (const c of COSMETICS) {
      const want = new Set((KEEPSAKE_WORN_ART[c.slug] ?? []).map((a) => `${a.kind}/${a.id}`))
      expect(askedWhileWorn(c.slug), c.slug).toEqual(want)
    }
  })

  it('paints every shelf badge, from a sheet of its own or from what she wears', () => {
    expect(VECTOR_ONLY_KEEPSAKES).toEqual([])
    for (const c of COSMETICS) {
      const own = (KEEPSAKE_ICON_SLUGS as readonly string[]).includes(c.slug)
      expect(own || (KEEPSAKE_WORN_ART[c.slug]?.length ?? 0) > 0, c.slug).toBe(true)
    }
  })
})

describe('the worn stills and their sheets', () => {
  const SPECS: Partial<Record<ItemName, ItemSpec>> = {
    crown: CROWN_ART, petStar: PET_STAR_ART, pegasusWing: PEGASUS_WING_ART, seashell: NECKLACE_SHELL_ART,
    scarfWrap: SCARF_WRAP_ART, acornCap: ACORN_CAP_ART, starTiara: STAR_TIARA_ART, goggles: GOGGLES_ART,
    bowTie: BOW_TIE_ART, moonPendant: MOON_PENDANT_ART, butterflyWing: FLUTTER_ART, packBedroll: BEDROLL_ART,
    packSatchel: SATCHEL_ART, petCloud: PET_CLOUD_ART, petFirefly: PET_FIREFLY_ART
  }

  it('agree on the file, the panel count and the tint', () => {
    const cosmetic = ITEM_SHEETS.filter((s) => s.kind === 'cosmetic')
    expect(cosmetic.map((s) => s.name).sort()).toEqual(Object.keys(SPECS).sort())
    for (const s of cosmetic) {
      const spec = SPECS[s.name as ItemName]!
      expect(spec.id, s.title).toBe(ITEM_ART[s.name as ItemName].id)
      expect(spec.kind).toBe('cosmetic')
      expect(spec.frames, s.title).toBe(s.frames)
      expect(!!spec.tinted, s.title).toBe(!!s.tinted)
    }
  })

  it('draw their references from the drawing alone', () => {
    const g = nullCtx()
    for (const spec of [...Object.values(SPECS), ...Object.values(KEEPSAKE_ART)]) {
      for (let f = 0; f < spec!.frames; f++) {
        expect(recordArtWants(() => spec!.draw(g, 120, f, NEUTRAL)), spec!.id).toEqual([])
      }
    }
  })
})

describe('the schedule', () => {
  const LAND = { portrait: false, clothInDuel: false }
  const keys = (w: readonly ArtWant[]): string[] => w.map(([k, i]) => `${k}/${i}`)

  it('holds a worn keepsake\'s paintings for the duel she wears it in', () => {
    for (const c of COSMETICS) {
      wear(c.slug)
      const hold = keys(duelWants(3, S.campaign, LAND))
      for (const a of KEEPSAKE_WORN_ART[c.slug] ?? []) expect(hold, c.slug).toContain(`${a.kind}/${a.id}`)
    }
  })

  it('holds the whole second shelf in the wardrobe, owned or not — it stands there in full colour', () => {
    const hold = keys(wardrobeWants(defaultCampaign(), LAND))
    for (const id of ALTERNATIVES) {
      const slug = COSMETICS[id]!.slug
      const shelf = (KEEPSAKE_ICON_SLUGS as readonly string[]).includes(slug)
        ? [`cosmetic/${keepsakeArtId(slug)}`]
        : (KEEPSAKE_WORN_ART[slug] ?? []).map((a) => `${a.kind}/${a.id}`)
      expect(shelf.length, slug).toBeGreaterThan(0)
      for (const k of shelf) expect(hold, slug).toContain(k)
    }
  })
})
