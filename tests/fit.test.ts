// A painting is only ever scaled UNIFORMLY (`src/game/fit.ts`). A box of
// another shape is answered by cropping or by continuing the painting — never
// by drawing it `w` x `h`. The cloth behind every scene used to be drawn
// that way, and a phone held upright pulled its weave out 2x vertically.

import { describe, expect, it } from 'vitest'
import { coverFit, sheetTiling, drawSheetTiled } from '@/game/fit'

/** Every box shape a player can hold, portrait to ultra-wide. */
const BOXES: [number, number][] = [
  [320, 658], [360, 740], [390, 844], [412, 915], [467, 948], [768, 1024],
  [1000, 1000], [1280, 720], [844, 390], [1920, 1080], [2560, 1080], [1280, 746.67]
]
/** The shapes the game paints: a sector, the cloth, a portrait page. */
const SOURCES: [number, number][] = [[1152, 672], [1024, 1024], [631, 1152]]

describe('coverFit — one scale, and the whole box is covered', () => {
  it('never scales the two axes differently', () => {
    for (const [sw, sh] of SOURCES) for (const [bw, bh] of BOXES) {
      const f = coverFit(sw, sh, bw, bh)
      const tag = `${sw}x${sh} into ${bw}x${bh}`
      expect(f.w / sw, tag).toBeCloseTo(f.h / sh, 12)
      expect(f.k, tag).toBeCloseTo(f.w / sw, 12)
    }
  })

  it('covers the box, cropping only the axis that is too long', () => {
    for (const [sw, sh] of SOURCES) for (const [bw, bh] of BOXES) {
      const f = coverFit(sw, sh, bw, bh)
      const tag = `${sw}x${sh} into ${bw}x${bh}`
      expect(f.x, tag).toBeLessThanOrEqual(1e-9)
      expect(f.y, tag).toBeLessThanOrEqual(1e-9)
      expect(f.x + f.w, tag).toBeGreaterThanOrEqual(bw - 1e-9)
      expect(f.y + f.h, tag).toBeGreaterThanOrEqual(bh - 1e-9)
      // One axis fits exactly; nothing is scaled up further than it must be.
      expect(Math.min(Math.abs(f.w - bw), Math.abs(f.h - bh)), tag).toBeLessThan(1e-9)
    }
  })

  it('lets the anchor choose which part of the crop survives', () => {
    const left = coverFit(1152, 672, 400, 900, 0, 0.5)
    const right = coverFit(1152, 672, 400, 900, 1, 0.5)
    expect(left.x).toBeCloseTo(0)
    expect(right.x + right.w).toBeCloseTo(400)
    const mid = coverFit(1152, 672, 400, 900)
    expect(mid.x + mid.w / 2).toBeCloseTo(200)
  })
})

describe('sheetTiling — the cloth fits its height and is never stretched', () => {
  it('portrait: one copy, its sides cropped, centred', () => {
    const t = sheetTiling(1024, 1024, 467, 948)
    expect(t.n).toBe(1)
    expect(t.k).toBeCloseTo(948 / 1024)
    expect(t.tw).toBeCloseTo(948)
    expect(t.x0 + t.tw / 2).toBeCloseTo(467 / 2)
  })

  it('wide: a centred row of copies that covers the width', () => {
    for (const [bw, bh] of BOXES) {
      const t = sheetTiling(1024, 1024, bw, bh)
      const tag = `${bw}x${bh}`
      expect(t.tw / 1024, tag).toBeCloseTo(t.k, 12)
      expect(t.k, tag).toBeCloseTo(bh / 1024, 12)
      expect(t.x0, tag).toBeLessThanOrEqual(1e-9)
      expect(t.x0 + t.n * t.tw, tag).toBeGreaterThanOrEqual(bw - 1e-9)
      expect(t.x0 + (t.n * t.tw) / 2, tag).toBeCloseTo(bw / 2)
      // No wasted copy: one fewer would not cover.
      expect((t.n - 1) * t.tw, tag).toBeLessThan(bw)
    }
  })

  it('draws every copy at the sheet\'s own aspect, mirroring every other one', () => {
    for (const [bw, bh] of BOXES) {
      const draws: { w: number; h: number; flipped: boolean }[] = []
      let flip = 1
      const stack: number[] = []
      const g = {
        save: () => { stack.push(flip) },
        restore: () => { flip = stack.pop() ?? 1 },
        translate: () => {},
        scale: (sx: number) => { flip *= Math.sign(sx) },
        drawImage: (_img: unknown, _x: number, _y: number, w: number, h: number) => {
          draws.push({ w, h, flipped: flip < 0 })
        }
      } as unknown as CanvasRenderingContext2D
      drawSheetTiled(g, {} as CanvasImageSource, 1024, 1024, bw, bh)
      const t = sheetTiling(1024, 1024, bw, bh)
      expect(draws.length, `${bw}x${bh}`).toBe(t.n)
      draws.forEach((d, i) => {
        expect(d.w / d.h, `${bw}x${bh} copy ${i}`).toBeCloseTo(1, 12)
        expect(d.flipped, `${bw}x${bh} copy ${i}`).toBe(i % 2 === 1)
      })
    }
  })
})
