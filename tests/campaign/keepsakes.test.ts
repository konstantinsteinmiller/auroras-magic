// The keepsakes on Aurora's rig (story-spec §9.7, C17): each slot's item
// hooks into its own draw-order slot, and nothing is worn by default.

import { beforeEach, describe, expect, it } from 'vitest'
import { S } from '@/game/duel/state'
import { defaultCampaign } from '@/game/campaign/state'
import { COSMETICS, COSMETIC_SLOTS } from '@/game/campaign/tables'
import {
  equippedHooks, equippedKey, drawHoofTrail, drawPetStar, hoofTrailLive, HOOF_TRAIL_MAX,
  MANE_SWATCHES, UMBRA_LOOK, PASTEL_DREAM, ownManeColours
} from '@/game/cosmetics/rig-cosmetics'
import { drawUnicorn, type RigAnchors } from '@/game/duel/chars'

const idOf = (slug: string): number => COSMETICS.findIndex((c) => c.slug === slug)

/** Wear these slugs (each in its own slot), nothing else. */
const wear = (...slugs: string[]): void => {
  const eq = [-1, -1, -1, -1, -1, -1, -1] as typeof S.campaign.giftsEquipped
  for (const s of slugs) eq[COSMETIC_SLOTS.indexOf(COSMETICS[idOf(s)]!.slot)] = idOf(s)
  S.campaign.giftsEquipped = eq
}

/** A 2D context that draws nothing and records every fill colour. */
const fakeCtx = (): { g: CanvasRenderingContext2D; fills: string[] } => {
  const fills: string[] = []
  const store: Record<string | symbol, unknown> = {}
  const g = new Proxy(store, {
    get: (o, k) => (k in o ? o[k] : () => undefined),
    set: (o, k, v) => {
      if (k === 'fillStyle') fills.push(String(v))
      o[k] = v
      return true
    }
  }) as unknown as CanvasRenderingContext2D
  return { g, fills }
}

/** A standing pose's anchors, stage space at the duel's Aurora spot. */
const anchors = (t: number, lift = 0): RigAnchors => ({
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
  portrait: false
})

beforeEach(() => {
  S.campaign = defaultCampaign()
})

describe('equipped hooks', () => {
  it('wears nothing on a fresh save', () => {
    const h = equippedHooks()
    expect(h.afterHead).toBeUndefined()
    expect(h.afterMane).toBeUndefined()
    expect(h.beforeTorso).toBeUndefined()
    expect(h.afterRig).toBeUndefined()
    expect(h.skin).toBeUndefined()
    expect(h.mane).toBeUndefined()
    expect(equippedKey()).toBe('-|-|-|-|-|-|-')
  })

  it('puts the crown on the head, the necklace at the neck, the wings on the back', () => {
    S.campaign.giftsEquipped = [idOf('flowerCrown'), idOf('seashellNecklace'), idOf('pegasusWings'), -1, -1, -1, -1]
    const h = equippedHooks()
    expect(typeof h.afterHead).toBe('function')
    expect(typeof h.afterMane).toBe('function') // the necklace and the near wing
    expect(typeof h.beforeTorso).toBe('function') // the far wing
    expect(equippedKey()).toBe('flowerCrown|seashellNecklace|pegasusWings|-|-|-|-')
  })

  it('ignores an item equipped in the wrong slot', () => {
    S.campaign.giftsEquipped = [idOf('pegasusWings'), -1, -1, -1, -1, -1, -1]
    expect(equippedHooks().afterHead).toBeUndefined()
  })

  it('wires every keepsake to something the rig draws', () => {
    for (const c of COSMETICS) {
      S.campaign = defaultCampaign()
      S.campaign.maneSwatch = 3
      wear(c.slug)
      const h = equippedHooks()
      const worn = Object.values(h).filter((v) => v !== undefined)
      expect(worn.length, c.slug).toBeGreaterThan(0)
      expect(equippedKey(), c.slug).toContain(c.slug)
    }
  })

  it('hangs the scarf at the neck, sharing the slot with the necklace', () => {
    wear('winterScarf')
    expect(typeof equippedHooks().afterMane).toBe('function')
    expect(equippedKey()).toBe('-|winterScarf|-|-|-|-|-')
  })

  it('draws the hoof-trail and the pet star after the rig, in stage space', () => {
    wear('hoofTrailVfx')
    expect(typeof equippedHooks().afterRig).toBe('function')
    wear('petStar')
    expect(typeof equippedHooks().afterRig).toBe('function')
  })

  it('makes a skin a palette only: Umbra Look, or the Pastel Dream with its twinkles', () => {
    wear('umbraSkin')
    expect(equippedHooks().skin).toBe(UMBRA_LOOK)
    expect(equippedHooks().afterRig).toBeUndefined()
    wear('pastelTheme')
    expect(equippedHooks().skin).toBe(PASTEL_DREAM)
    expect(typeof equippedHooks().afterRig).toBe('function')
  })

  it('takes the mane colour from the picked swatch, only while the palette is worn', () => {
    S.campaign.maneSwatch = 3
    expect(equippedHooks().mane).toBeUndefined() // not worn
    wear('colorPicker')
    expect(equippedHooks().mane).toEqual(MANE_SWATCHES[3]!.mane)
    expect(equippedKey()).toBe('-|-|-|-|-|colorPicker|-#3')
    S.campaign.maneSwatch = 0 // her own mane
    expect(equippedHooks().mane).toBeUndefined()
    expect(equippedKey()).toBe('-|-|-|-|-|colorPicker|-#0')
    S.campaign.maneSwatch = 6
    expect(equippedHooks().mane).toBe('rainbow')
    S.campaign.maneSwatch = 99 // a hand-edited save: her own mane
    expect(equippedHooks().mane).toBeUndefined()
  })

  it('composes once per wardrobe change, not per frame', () => {
    wear('petStar', 'winterScarf')
    const a = equippedHooks()
    expect(equippedHooks()).toBe(a)
    wear('petStar')
    expect(equippedHooks()).not.toBe(a)
  })

  it('names any combination distinctly for the portrait cache', () => {
    wear('umbraSkin', 'winterScarf', 'petStar', 'hoofTrailVfx', 'colorPicker')
    S.campaign.maneSwatch = 5
    const k = equippedKey()
    expect(k).toBe('-|winterScarf|-|petStar|hoofTrailVfx|colorPicker|umbraSkin#5')
    S.campaign.maneSwatch = 4
    expect(equippedKey()).not.toBe(k)
  })
})

describe('mane swatches', () => {
  it('offers 8, each with its own micro-glyph and name (§3.11)', () => {
    expect(MANE_SWATCHES).toHaveLength(8)
    expect(new Set(MANE_SWATCHES.map((s) => s.glyph)).size).toBe(8)
    expect(new Set(MANE_SWATCHES.map((s) => s.label)).size).toBe(8)
    expect(MANE_SWATCHES[0]!.mane).toBeNull() // swatch 0 is her own
  })

  it('keeps at least half of them away from pink (§2.4)', () => {
    const hue = (hex: string): number => {
      const n = parseInt(hex.slice(1), 16)
      const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255) as [number, number, number]
      const mx = Math.max(r, g, b)
      const d = mx - Math.min(r, g, b)
      if (!d) return 0
      const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
      return (h * 60 + 360) % 360
    }
    const pink = MANE_SWATCHES.filter((s) => Array.isArray(s.mane) && (hue(s.mane[0]) > 300 || hue(s.mane[0]) < 5))
    expect(pink.length).toBeLessThanOrEqual(4)
  })

  it("shows swatch 0 as the worn skin's own mane", () => {
    expect(ownManeColours()).toEqual(['#ffcc33', '#ffee99'])
    wear('umbraSkin')
    expect(ownManeColours()).toEqual([UMBRA_LOOK[3], UMBRA_LOOK[4]])
  })
})

describe('the hoof-trail emitter', () => {
  it('streams at rest, bursts on a hop, and never passes its cap', () => {
    const { g } = fakeCtx()
    drawHoofTrail(g, anchors(10)) // a new clock: starts over, pre-warmed
    const warm = hoofTrailLive()
    expect(warm).toBeGreaterThan(0)
    for (let f = 1; f <= 60; f++) drawHoofTrail(g, anchors(10 + f / 60))
    expect(hoofTrailLive()).toBeGreaterThan(3)
    // Hop, hop, hop: bursts on every rising edge, the pool stays capped.
    let peak = 0
    for (let f = 0; f < 240; f++) {
      drawHoofTrail(g, anchors(11 + f / 60, f % 20 < 10 ? 1 : 0))
      peak = Math.max(peak, hoofTrailLive())
    }
    expect(peak).toBeLessThanOrEqual(HOOF_TRAIL_MAX)
    expect(peak).toBeGreaterThan(12)
  })

  it('freezes with a paused clock and dies out once she is down', () => {
    const { g } = fakeCtx()
    drawHoofTrail(g, anchors(50))
    const n = hoofTrailLive()
    for (let f = 0; f < 30; f++) drawHoofTrail(g, anchors(50)) // paused
    expect(hoofTrailLive()).toBe(n)
    for (let f = 1; f <= 180; f++) drawHoofTrail(g, { ...anchors(50 + f / 60), lose: 1 })
    expect(hoofTrailLive()).toBe(0)
  })

  it('draws a still in a portrait without touching the pool', () => {
    const { g, fills } = fakeCtx()
    drawHoofTrail(g, anchors(90))
    const n = hoofTrailLive()
    drawHoofTrail(g, { ...anchors(1.3), portrait: true })
    expect(hoofTrailLive()).toBe(n)
    expect(fills.length).toBeGreaterThan(0)
  })
})

describe('the pet star', () => {
  it('draws in the duel and in a portrait', () => {
    const { g, fills } = fakeCtx()
    drawPetStar(g, anchors(3))
    drawPetStar(g, anchors(3.02, 1)) // the happy spin
    drawPetStar(g, { ...anchors(1.3), portrait: true })
    expect(fills).toContain('#ffd84a')
  })
})

describe('the rig with keepsakes', () => {
  it('hands afterRig stage-space anchors that follow the pose', () => {
    const { g } = fakeCtx()
    let rest: RigAnchors | null = null
    const copy = (a: RigAnchors): RigAnchors => ({
      ...a,
      hoofFront: [...a.hoofFront],
      hoofHind: [...a.hoofHind],
      tailStage: [...a.tailStage],
      headStage: [...a.headStage]
    })
    drawUnicorn(g, 400, 508, -1, { afterRig: (_, a) => (rest = copy(a)) }, 1)
    expect(rest).not.toBeNull()
    const r = rest! as RigAnchors
    // Standing: the near fore hoof is in front of her, on the ground.
    expect(r.hoofFront[0]).toBeGreaterThan(400)
    expect(Math.abs(r.hoofFront[1] - 508)).toBeLessThan(8)
    expect(r.hoofHind[0]).toBeLessThan(400)
    expect(r.tailStage[0]).toBeLessThan(r.headStage[0])
    expect(r.facing).toBe(1)
    let reared: RigAnchors | null = null
    drawUnicorn(g, 400, 508, -1, { cast: 1, afterRig: (_, a) => (reared = copy(a)) }, 1)
    // A cast rears her up: the fore hoof leaves the ground.
    expect((reared! as RigAnchors).hoofFront[1]).toBeLessThan(r.hoofFront[1] - 10)
    // The foe side mirrors.
    let foe: RigAnchors | null = null
    drawUnicorn(g, 880, 508, 1, { afterRig: (_, a) => (foe = copy(a)) }, 1)
    expect((foe! as RigAnchors).hoofFront[0]).toBeLessThan(880)
    expect((foe! as RigAnchors).facing).toBe(-1)
  })

  it('paints a skin on her own rig and keeps her default palette without one', () => {
    const plain = fakeCtx()
    drawUnicorn(plain.g, 0, 0, -1, {}, 1)
    expect(plain.fills).toContain('#fec')
    const umbra = fakeCtx()
    drawUnicorn(umbra.g, 0, 0, -1, { skin: UMBRA_LOOK }, 1)
    expect(umbra.fills).toContain(UMBRA_LOOK[0])
    expect(umbra.fills).not.toContain('#fec')
  })

  it('recolours the mane from a swatch', () => {
    const { g, fills } = fakeCtx()
    drawUnicorn(g, 0, 0, -1, { mane: ['#123456', '#abcdef'] }, 1)
    expect(fills).toContain('#123456')
    expect(fills).toContain('#abcdef')
    expect(fills).not.toContain('#fc3')
  })
})
