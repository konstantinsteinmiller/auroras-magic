// @vitest-environment node
// The questions the slicer asks before it cuts a painted strip
// (`tools/strip-guards.mjs`).
//
// Worth pinning because the failure they catch is SILENT and expensive:
// `portrait-umbra` came back with nine faces against the five it was briefed
// for, every stage of the pipeline did exactly what it was told with them, and
// the game drew one-and-a-half heads into every Umbra dialogue badge until
// somebody looked. Three more portraits turned out to be broken the same way.
//
// The guards live outside the slicer because `slice-sheets.mjs` RUNS on
// import — importing it to reach these would re-slice the catalogue.

import { describe, expect, it } from 'vitest'
// @ts-expect-error — a plain .mjs tool, called the way the slicer calls it
import { boundaryInk, countDrawings, stripRefusal } from '../../tools/strip-guards.mjs'

const W = 600
const H = 200

/** A keyed RGBA buffer: transparent everywhere (the magenta is already cut). */
const blank = (): Uint8ClampedArray => new Uint8ClampedArray(W * H * 4)

/** An opaque block. Clamped, because a write past the row end would wrap into
 *  the next one and quietly invent a drawing. */
const box = (d: Uint8ClampedArray, x0: number, y0: number, w: number, h: number): void => {
  for (let y = Math.max(0, y0); y < Math.min(H, y0 + h); y++) {
    for (let x = Math.max(0, x0); x < Math.min(W, x0 + w); x++) d[(y * W + x) * 4 + 3] = 255
  }
}

/** Blocks at the given [start, end) spans, all the same height. */
const spans = (...at: [number, number][]): Uint8ClampedArray => {
  const d = blank()
  for (const [a, b] of at) box(d, a, 40, b - a, 120)
  return d
}

/** `n` drawings, evenly spaced, each filling `fill` of its own panel. */
const strip = (n: number, fill = 0.6): Uint8ClampedArray => {
  const panel = W / n
  const w = Math.round(panel * fill)
  return spans(...Array.from({ length: n }, (_, i): [number, number] => {
    const a = Math.round(i * panel + (panel - w) / 2)
    return [a, a + w]
  }))
}

describe('a strip that can be cut', () => {
  it('passes when it holds the drawings it was asked for, spaced evenly', () => {
    for (const n of [2, 3, 4, 5]) {
      const d = strip(n)
      expect(countDrawings(d, W, H, W / n).drawings, `${n} panels`).toBe(n)
      expect(boundaryInk(d, W, H, n).worst, `${n} panels`).toBe(0)
      expect(stripRefusal(d, W, H, n, W / n), `${n} panels`).toBeNull()
    }
  })

  it('tolerates a strip that merely sits a few pixels off-centre', () => {
    // The fit normalisation corrects this much; it must not be refused.
    const d = spans([44, 164], [244, 364], [444, 564])
    expect(stripRefusal(d, W, H, 3, W / 3)).toBeNull()
  })
})

describe('a strip that cannot be cut', () => {
  it('refuses the WRONG NUMBER of drawings even when every cut lands in air', () => {
    // The `portrait-umbra` shape, and the whole reason counting is needed as
    // well as the boundary test: six drawings on a three-panel sheet, small
    // enough that both cuts (200, 400) fall in the gaps between them.
    const d = spans([20, 80], [120, 180], [220, 280], [320, 380], [420, 480], [520, 580])
    expect(boundaryInk(d, W, H, 3).worst).toBe(0)
    const why = stripRefusal(d, W, H, 3, W / 3)
    expect(why).toContain('6 drawings')
    expect(why).toContain('3 panels')
  })

  it('refuses drawings that straddle the cuts, even when the count is right', () => {
    // The `portrait-nova` shape: the right number, in the wrong places. Both
    // cuts blocked, so the message must also name a miscount as the likely
    // cause — that is the difference between "re-roll" and "re-roll and put
    // the number first".
    const d = spans([150, 250], [350, 450], [500, 580])
    expect(countDrawings(d, W, H, W / 3).drawings).toBe(3)
    const why = stripRefusal(d, W, H, 3, W / 3)
    expect(why).toContain('do not line up')
    expect(why).toMatch(/wrong NUMBER/)
  })

  it('names only the cuts that are actually blocked', () => {
    // One bad join out of two: the message points at it rather than at the
    // whole strip, and does NOT claim a miscount.
    const d = spans([150, 250], [320, 380], [500, 580])
    const why = stripRefusal(d, W, H, 3, W / 3)
    expect(why).toContain('cut 1 falls')
    expect(why).not.toMatch(/wrong NUMBER/)
  })

  it('refuses a RULED DIVIDER drawn down the sheet', () => {
    // Thin runs are dropped as specks, so a painted panel divider counted as
    // nothing and rode through as "3 drawings" — then the fit normalisation
    // dragged it into the neighbouring crops.
    const d = strip(3)
    for (let i = 1; i < 3; i++) box(d, Math.round(i * (W / 3)) - 1, 0, 2, H)
    expect(countDrawings(d, W, H, W / 3).ruled).toBe(2)
    expect(stripRefusal(d, W, H, 3, W / 3)).toContain('ruled line')
  })

  it('refuses one big picture where a strip was asked for', () => {
    const d = spans([20, W - 20])
    expect(stripRefusal(d, W, H, 3, W / 3)).toContain('1 drawing')
  })
})

describe('what it must never do', () => {
  it('accuses nothing when the sheet is blank — that is the key\'s complaint, not ours', () => {
    const d = blank()
    expect(countDrawings(d, W, H, W / 3).drawings).toBeNull()
    expect(stripRefusal(d, W, H, 3, W / 3)).toBeNull()
  })

  it('ignores a speck: a stray sparkle is neither a drawing nor a divider', () => {
    const d = strip(3)
    box(d, 5, 5, 2, 2)
    expect(countDrawings(d, W, H, W / 3).drawings).toBe(3)
    expect(countDrawings(d, W, H, W / 3).ruled).toBe(0)
    expect(stripRefusal(d, W, H, 3, W / 3)).toBeNull()
  })
})
