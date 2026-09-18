// @vitest-environment node
// The one bit-packing encoding every enumerable set in `S.campaign` uses
// (story-spec §4.5.1). Round-trips at the boundary sizes, and tolerance of the
// junk a mangled cloud save can hand back.

import { describe, expect, it } from 'vitest'
import {
  emptyBitset, hasBit, setBit, countBits, packBits, unpackBits, getPaintPick, setPaintPick
} from '@/game/campaign/bitset'

describe('bitset', () => {
  it('round-trips every bit at the boundary sizes', () => {
    for (const bits of [1, 7, 8, 49, 50, 335, 336, 453, 454]) {
      let b = emptyBitset(bits)
      expect(countBits(b)).toBe(0)
      for (let i = 0; i < bits; i += 3) b = setBit(b, i)
      for (let i = 0; i < bits; i++) expect(hasBit(b, i), `${bits}:${i}`).toBe(i % 3 === 0)
      expect(countBits(b)).toBe(Math.ceil(bits / 3))
    }
  })

  it('is the size the save budget assumes', () => {
    // C9: 336 coverage cells → 42 bytes → 56 base64 chars; 50 sectors → 12.
    expect(emptyBitset(336)).toHaveLength(56)
    expect(emptyBitset(50)).toHaveLength(12)
    expect(emptyBitset(100)).toHaveLength(20)
  })

  it('clears a bit, and grows a short string instead of losing a write', () => {
    let b = setBit(emptyBitset(8), 3)
    b = setBit(b, 3, false)
    expect(countBits(b)).toBe(0)
    const grown = setBit(emptyBitset(8), 49)
    expect(hasBit(grown, 49)).toBe(true)
  })

  it('reads junk as "not set" and never throws', () => {
    for (const junk of ['', '!!!', '%%%%', null as unknown as string, undefined as unknown as string]) {
      expect(hasBit(junk, 0)).toBe(false)
      expect(countBits(junk)).toBe(0)
      expect(getPaintPick(junk, 3)).toBe(0)
    }
    expect(hasBit(emptyBitset(8), -1)).toBe(false)
    expect(hasBit(emptyBitset(8), 400)).toBe(false)
  })

  it('packs and unpacks a whole set', () => {
    const want = (i: number) => (i * 7) % 5 === 0
    const out = unpackBits(packBits(336, want), new Uint8Array(336))
    for (let i = 0; i < 336; i++) expect(out[i]).toBe(want(i) ? 1 : 0)
  })

  it('stores every paint pick value at the first and last sectors', () => {
    for (const sector of [0, 1, 48, 49]) {
      for (const v of [0, 1, 2, 3] as const) {
        let b = emptyBitset(100)
        // Neighbours must survive a write next to them.
        b = setPaintPick(b, sector ^ 1, 3)
        b = setPaintPick(b, sector, v)
        expect(getPaintPick(b, sector)).toBe(v)
        expect(getPaintPick(b, sector ^ 1)).toBe(3)
      }
    }
  })
})
