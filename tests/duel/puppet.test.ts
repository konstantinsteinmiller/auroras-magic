// THE PAINTED DUELIST (`duel/puppet.ts`). She is the rig of `chars.ts` with
// every piece painted, on the chibi's proportions (`chars.CHIBI`: the drawn
// rig's bones and poses on a big round head and a small round body — owner,
// 2026-09-25). What is her own: the rig geometry her reference sheets are
// drawn from must stay the rig's, the chibi must still rear up on a cast and
// lie down on the island, the painted face must be CALM at rest ("not an
// aroused or happy emotion, but a neutral one"), and the recolour that
// dresses every other character in Aurora's or Umbra's set must keep each
// painting's light and ink.

import { describe, expect, it } from 'vitest'
import { TQ_REF, faceOf, FACE } from '@/game/duel/puppet'
import { lookFor, __recolour, recolourRegions, blushOf, type RegionStats } from '@/game/duel/puppetBake'
import { CHIBI_TQ, drawUnicorn, __chibiRig, type PoseState, type RigAnchors } from '@/game/duel/chars'
import { AX, UX, GY } from '@/game/duel/config'
import { FOES, FIRST_UMBRA, shadowOf, guardianOf } from '@/game/duel/foes'

describe('the painted pieces are cut from the rig', () => {
  it("draws the torso's reference from the chibi rig's own three masses", () => {
    expect([...TQ_REF]).toEqual([...CHIBI_TQ])
  })
})

/** A 2D context that draws nothing: the anchors are arithmetic, not pixels. */
const fakeCtx = (): CanvasRenderingContext2D => {
  const store: Record<string | symbol, unknown> = {}
  return new Proxy(store, {
    get: (o, k) => (k in o ? o[k] : () => undefined),
    set: (o, k, v) => { o[k] = v; return true }
  }) as unknown as CanvasRenderingContext2D
}
/** The chibi's anchors in one pose (`collapse.test.ts`'s, on `CHIBI`). */
const chibiAt = (pose: PoseState, side: -1 | 1): RigAnchors => {
  let got: RigAnchors | null = null
  __chibiRig(true)
  try {
    drawUnicorn(fakeCtx(), side < 0 ? AX : UX, GY, side, {
      ...pose,
      afterRig: (_g, a) => {
        got = { ...a, hoofFront: [...a.hoofFront], hoofHind: [...a.hoofHind], bodyStage: [...a.bodyStage], headStage: [...a.headStage], tailStage: [...a.tailStage] }
      }
    }, 3.2)
  } finally {
    __chibiRig(false)
  }
  if (!got) throw new Error('afterRig never ran')
  return got
}

describe.each([['Aurora', -1], ['the foe', 1]] as const)('the chibi rig: %s', (_who, side) => {
  it('stands on the ground', () => {
    const a = chibiAt({ hp: 1 }, side)
    expect(Math.abs(a.hoofFront[1] - GY)).toBeLessThan(8)
    expect(Math.abs(a.hoofHind[1] - GY)).toBeLessThan(8)
  })

  it('rears up on a cast: the forehoof leaves the ground, the hind one stays', () => {
    const a = chibiAt({ hp: 1, cast: 1 }, side)
    expect(GY - a.hoofFront[1]).toBeGreaterThan(20)
    expect(Math.abs(a.hoofHind[1] - GY)).toBeLessThan(8)
  })

  it('lies down on the island, the head up and every hoof on the ground', () => {
    for (const l of [0, 0.5, 1]) {
      const a = chibiAt({ hp: 0, lose: l }, side)
      for (const [x] of [a.hoofFront, a.hoofHind, a.bodyStage, a.headStage, a.tailStage]) {
        expect(x).toBeGreaterThan(640 - 300)
        expect(x).toBeLessThan(640 + 300)
      }
      expect(a.headStage[1]).toBeLessThan(a.bodyStage[1])
    }
    const a = chibiAt({ hp: 0, lose: 1 }, side)
    expect(Math.abs(a.hoofFront[1] - GY)).toBeLessThan(12)
    expect(Math.abs(a.hoofHind[1] - GY)).toBeLessThan(12)
    expect(GY - a.bodyStage[1]).toBeLessThan(40)
  })
})

describe('the painted face', () => {
  it('maps a portrait face onto the five painted ones', () => {
    // Cheering: eyes shut, mouth open.
    expect(faceOf({ brow: 0.6, eye: 0, mouth: 1.2, blush: 0.5 })).toBe(FACE.cheer)
    // Sleepy and plain faces fall to the calm one, never a smile.
    expect(faceOf({ brow: 0, eye: 1, mouth: 0.05, blush: 0 })).toBe(FACE.neutral)
    expect(faceOf({ brow: 0.25, eye: 1, mouth: 1, blush: 0.25 })).toBe(FACE.neutral)
    expect(FACE.neutral).toBe(0)
  })
})

describe('who wears which set, in what colours', () => {
  it('draws Aurora exactly as painted, and Umbra only lifted toward her model', () => {
    expect(lookFor('aurora', null, null, '', 0)).toBeNull()
    const u = lookFor('umbra', FOES[FIRST_UMBRA]!.pal, null, '', 0)!
    // Her coat by gain, her near-black painted horn onto her model's violet;
    // nothing else of her moves.
    expect(u.lift).toBeDefined()
    expect(u.horn).toBeDefined()
    expect(u.coat ?? u.mane ?? u.hoof).toBeUndefined()
  })

  it("keeps Umbra's painted coat on her shadow clones and changes their mane", () => {
    const l = lookFor('umbra', FOES[shadowOf(4)]!.pal, null, '', 0)!
    expect(l.coat).toBeUndefined()
    expect(l.hoof).toBeUndefined()
    expect(l.mane).toBeDefined()
  })

  it('recolours a Guardian whole', () => {
    const l = lookFor('umbra', FOES[guardianOf(0)]!.pal, null, '', 0)!
    expect(l.coat && l.mane && l.horn && l.hoof).toBeTruthy()
  })

  it('takes a mane swatch over the painted mane', () => {
    const l = lookFor('aurora', null, ['#ff9ecf', '#ffe2f1'], '', 0)!
    expect(l.coat).toBeUndefined()
    expect(l.mane![0][0]).toBeCloseTo(1, 2)
  })
})

describe('the recolour keeps the painting', () => {
  // A 40-pixel "torso", four times over: eight coat pixels in three shades,
  // two of ink.
  const COAT: number[][] = [[255, 243, 222], [255, 243, 222], [250, 236, 214], [250, 236, 214], [241, 222, 200], [241, 222, 200], [255, 250, 238], [255, 243, 222]]
  const INK = [58, 35, 64]
  const buf = (): Uint8ClampedArray => {
    const d = new Uint8ClampedArray(40 * 4)
    for (let k = 0; k < 4; k++) [...COAT, INK, INK].forEach((c, i) => { d.set([...c, 255], (k * 10 + i) * 4) })
    return d
  }

  it('moves the coat onto a new colour and leaves the ink alone', () => {
    const d = buf()
    const target = [0x3d / 255, 0x38 / 255, 0x74 / 255] as const
    __recolour(d, 40, 1, 'aurora', 'torso', { key: 'x', coat: target })
    // The typical coat pixel lands on the target.
    expect(Math.abs(d[0]! - 0x3d)).toBeLessThan(12)
    expect(Math.abs(d[2]! - 0x74)).toBeLessThan(12)
    // Its shading survives: the shaded pixel is darker than the typical one.
    expect(d[16]!).toBeLessThan(d[0]!)
    // The ink is the painter's.
    expect([d[32], d[33], d[34]]).toEqual(INK)
  })

  it('carries a near coat by gain, keeping the painting\'s own colour', () => {
    const d = buf()
    const before = [d[16]!, d[17]!, d[18]!]
    __recolour(d, 40, 1, 'aurora', 'torso', { key: 'y', coat: [0.95, 0.88, 0.9] })
    // Every channel moved, and the pixel kept its own balance of them.
    expect(d[16]).not.toBe(before[0])
    expect(d[16]! - d[18]!).toBeGreaterThan(0)
    expect([d[32], d[33], d[34]]).toEqual(INK)
  })
})

// THE CHEEK OF A RECOLOURED UMBRA (art QA, 2026-09-27). Her blush was kept as
// painted, so Briar and the dark Guardians wore Umbra's lilac cheek as a hard
// purple patch. Her masks now carry a soft blush WEIGHT (red channel) over the
// coat, and the cheek takes a rose made from the look's NEW coat.
describe('a recoloured cheek is a rose of the new coat', () => {
  const plum = { ls: 0.357, lmax: 0.44, cr: 0.35, cg: 0.254, mean: [0.444, 0.321, 0.497] as [number, number, number] }
  const ST: RegionStats = { coat: plum, hair: null, horn: null, hoof: null }
  const BROWN = [0x8a / 255, 0x5a / 255, 0x3c / 255] as const
  // two pixels of Umbra's painted cheek: coat, then blush (label 1, weight 0 / 1)
  const run = (weight: number): number[] => {
    const d = new Uint8ClampedArray([126, 99, 136, 255, 158, 116, 147, 255])
    const m = new Uint8ClampedArray([0, 50, 0, 255, weight, 50, 0, 255])
    recolourRegions(d, 2, 1, m, ST, { key: 'b', coat: BROWN })
    return [...d]
  }
  it('is rosier and lighter than the coat, and never lilac on brown', () => {
    const d = run(255)
    const coat = d.slice(0, 3), cheek = d.slice(4, 7)
    expect(cheek[0]! - cheek[1]!).toBeGreaterThan(coat[0]! - coat[1]!) // rosier
    expect(cheek[0]!).toBeGreaterThan(coat[0]!) // lighter in red
    expect(cheek[0]!).toBeGreaterThan(cheek[2]!) // red over blue: not lilac
  })
  it('is only the coat where the mask carries no weight', () => {
    const d = run(0)
    // no rose laid on: the cheek is the new coat, lit as it was painted
    expect(d[4]! - d[5]!).toBeLessThan(run(255)[4]! - run(255)[5]!)
  })
  it('takes its colour from the coat it sits on', () => {
    const b = blushOf(BROWN), n = blushOf([0.24, 0.29, 0.51])
    expect(b[0]).toBeGreaterThan(b[2]) // warm on brown
    expect(n[2]).toBeGreaterThan(b[2]) // cooler on navy
  })
})
