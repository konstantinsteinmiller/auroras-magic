// A PAINTED ISLAND IS REGISTERED BY THE GROUND UNDER THE FEET (arena.ts's
// `fitIsle`). Fitting the painting's bounding box tells you nothing about
// where its SURFACE is: a painter who crowns the island with a dome puts its
// highest point in the middle, where nobody stands, and the two duelists end
// up in mid-air either side of the pile — which is what Bubble Bay's first
// return did. So the vertical placement is read off the painting's own top
// edge at AX and UX, and these cases are the ones that got it wrong.

import { describe, expect, it } from 'vitest'
import { fitIsle } from '@/game/duel/arena'
import { AX, UX, GY } from '@/game/duel/config'

const W = 240
const H = 120

/** An RGBA buffer whose opaque pixels are wherever `solid(x, y)` says. */
const paint = (solid: (x: number, y: number) => boolean): Uint8ClampedArray => {
  const px = new Uint8ClampedArray(W * H * 4)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) if (solid(x, y)) px[(y * W + x) * 4 + 3] = 255
  }
  return px
}

/** Where the painting's own surface lands, in stage units, at stage x `sx`. */
const surfaceAt = (
  px: Uint8ClampedArray,
  fit: { dx: number; dy: number; dw: number },
  sx: number
): number => {
  const k = fit.dw / W
  const col = Math.round((sx - fit.dx) / k)
  for (let y = 0; y < H; y++) if (px[(y * W + col) * 4 + 3]! > 140) return fit.dy + y * k
  return Infinity
}

/** The shape the drawing has: one flat slab, the whole width, with a tail. */
const SLAB = paint((x, y) => (y >= 30 && y < 50) || (y >= 50 && Math.abs(x - W / 2) < 40))
/** The shape that broke it: a dome, highest in the middle, falling off at the
 *  ends — the crest is a ridge nobody can stand on. */
const DOME = paint((x, y) => {
  const u = (x - W / 2) / (W / 2)
  return y >= 30 + 60 * u * u && y < 108
})

describe('a painted island holds its duelists up', () => {
  it('stands both of them on a flat slab', () => {
    const fit = fitIsle(SLAB, W, H)
    expect(fit.ok).toBe(true)
    expect(surfaceAt(SLAB, fit, AX)).toBeCloseTo(GY, 0)
    expect(surfaceAt(SLAB, fit, UX)).toBeCloseTo(GY, 0)
  })

  it('stands both of them on a DOME, by seating it lower', () => {
    const fit = fitIsle(DOME, W, H)
    expect(fit.ok).toBe(true)
    // The fix: their own patches of ground are on the standing line, and the
    // crest is above them rather than the other way round.
    expect(surfaceAt(DOME, fit, AX)).toBeCloseTo(GY, 0)
    expect(surfaceAt(DOME, fit, UX)).toBeCloseTo(GY, 0)
    expect(surfaceAt(DOME, fit, 640)).toBeLessThan(GY)
  })

  it('accepts the dome a crown-anchored fit would have floated them over', () => {
    // What the old placement did: the painting's TOP edge on the drawn cap's
    // crown. On a dome that leaves the ends — where they stand — well below.
    const fit = fitIsle(DOME, W, H)
    const k = fit.dw / W
    const crownAnchored = { ...fit, dy: GY - 34 - 30 * k }
    expect(surfaceAt(DOME, crownAnchored, AX) - GY).toBeGreaterThan(22)
  })

  it('refuses a painting with no ground under a foot', () => {
    // The fit stretches the painting's BOX across the rim, so a foot can only
    // miss when the shape itself has a hole there: a stray fleck out at the
    // frame's edge widens the box, and the ground starts well inside it.
    const gap = paint((x, y) => (x < 4 && y > 60 && y < 64) || (x >= 70 && y >= 40))
    expect(fitIsle(gap, W, H).ok).toBe(false)
  })

  it('refuses a ramp, rather than burying one and floating the other', () => {
    const ramp = paint((x, y) => y >= 20 + (x / W) * 70)
    expect(fitIsle(ramp, W, H).ok).toBe(false)
  })

  it('refuses an empty frame', () => {
    expect(fitIsle(paint(() => false), W, H).ok).toBe(false)
  })
})
