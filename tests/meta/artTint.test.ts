// @vitest-environment node
// S6 — the colour-me tint over a painting (story-spec §8.7, §9.11). The mask
// is arithmetic over two pixel arrays, so it is pinned here without a canvas:
// what the painter's neutral landmark gets, what the warm wall and the pale
// sky beside it do NOT get, and what happens when the painter coloured the
// landmark anyway.

import { describe, expect, it } from 'vitest'
import { maskAlpha, distanceFrom, liftTint, NEUTRAL } from '@/game/artTint'

const W = 40
const H = 20

/** A painting, one colour per column band. */
const paint = (at: (x: number, y: number) => [number, number, number]): Uint8ClampedArray => {
  const d = new Uint8ClampedArray(W * H * 4)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const [r, g, b] = at(x, y)
      const i = (y * W + x) * 4
      d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255
    }
  }
  return d
}

/** The drawing's landmark: columns 10–19. */
const region = (): Uint8Array => {
  const r = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) for (let x = 10; x < 20; x++) r[y * W + x] = 255
  return r
}

const GREY: [number, number, number] = [232, 228, 238] // the neutral
const CREAM: [number, number, number] = [255, 244, 214] // a warm wall
const SKY: [number, number, number] = [196, 204, 255] // a pale sky
const at = (m: Uint8ClampedArray, x: number, y = 10): number => m[y * W + x]!

describe('the colour-me mask', () => {
  it('tints the landmark where the painter put it, even a few px off the drawing', () => {
    // The painter drew it 3 px to the right: columns 13–22.
    const art = paint((x) => (x >= 13 && x < 23 ? GREY : CREAM))
    const m = maskAlpha(region(), art, W, H, 6)
    expect(at(m, 15)).toBe(255)
    expect(at(m, 21)).toBeGreaterThan(80) // the drift, inside the band
    expect(at(m, 11)).toBe(0) // the drawing's region, but painted cream
    expect(at(m, 30)).toBe(0) // far outside the band
  })

  it('leaves a warm wall and a pale sky beside it alone', () => {
    const art = paint((x) => (x >= 10 && x < 20 ? GREY : x < 10 ? SKY : CREAM))
    const m = maskAlpha(region(), art, W, H, 6)
    for (const x of [7, 8, 9, 20, 21, 22]) expect(at(m, x), `x=${x}`).toBe(0)
    for (const x of [10, 14, 19]) expect(at(m, x)).toBe(255)
  })

  it('adapts to the cast the painter gave the neutral', () => {
    // A warmer grey than asked for: still the landmark, still tinted.
    const warm: [number, number, number] = [236, 226, 214]
    const art = paint((x) => (x >= 10 && x < 20 ? warm : [120, 200, 90]))
    expect(at(maskAlpha(region(), art, W, H, 6), 15)).toBe(255)
  })

  it('tints nothing when the painter coloured the landmark anyway', () => {
    const art = paint((x) => (x >= 10 && x < 20 ? [240, 120, 160] : GREY))
    const m = maskAlpha(region(), art, W, H, 6)
    expect(m.every((v) => v === 0)).toBe(true)
  })

  it('never tints the dark ink', () => {
    const art = paint((x, y) => (y === 10 ? [58, 35, 64] : GREY))
    const m = maskAlpha(region(), art, W, H, 6)
    expect(at(m, 15, 10)).toBe(0)
    expect(at(m, 15, 5)).toBe(255)
  })

  it('fades the band with distance, round rather than square', () => {
    const core = new Uint8Array(W * H)
    core[10 * W + 20] = 1
    const d = distanceFrom(core, W, H, 99)
    expect(d[10 * W + 20]).toBe(0)
    expect(d[10 * W + 25]).toBeCloseTo(5, 0)
    // The diagonal is ~7.07, not the square metric's 5.
    expect(d[15 * W + 25]!).toBeGreaterThan(6.4)
    expect(d[15 * W + 25]!).toBeLessThan(7.6)
  })

  it('lifts a colour so the neutral times it gives the colour back', () => {
    expect(liftTint(NEUTRAL.base)).toBe('rgb(255, 255, 255)')
    const m = /rgb\((\d+), (\d+), (\d+)\)/.exec(liftTint('#7a5cd0'))!
    const n = [0xe8, 0xe4, 0xee]
    const back = [1, 2, 3].map((k, i) => Math.round((Number(m[k]) * n[i]!) / 255))
    expect(back).toEqual([0x7a, 0x5c, 0xd0])
  })
})
