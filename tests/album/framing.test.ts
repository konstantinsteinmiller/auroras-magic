// What the album actually DRAWS — the framing of a sticker cell (item 3) and
// the composition of a photo card (item 16).
//
// A cell has to hold a creature that was authored for a 1152 × 672 sector,
// and the only number it has to go on is the creature's tap radius — a
// finger's target, not the drawing's box. `stickers.ts` frames 1.35 × that
// radius, and this is what says whether the guess holds across a cast of
// sixty: that the ink actually lands in the cell, fills it, and is not mostly
// cropped away.
//
// jsdom ships no 2D context, so the cell is drawn onto a RECORDER — a context
// that keeps the transform the real one would and writes down every point the
// painters path through it. It is not a picture, but it is the geometry, and
// the geometry is the thing being asserted.
//
// The recorder is a second, simpler implementation of the one `measure.ts`
// ships. That is the point: the frame it checks is the frame the album uses,
// arrived at another way.

import { describe, expect, it } from 'vitest'
import { S } from '@/game/duel/state'
import { defaultCampaign } from '@/game/campaign/state'
import { STILL_T, albumPages, drawableOf, stickerFrame, type Sticker } from '@/game/album/stickers'
import { currentPhoto, drawPhotoCard } from '@/game/album/photo'
import { COSMETIC_SLOTS, cosmeticsIn } from '@/game/campaign/tables'

type M = [number, number, number, number, number, number]

/**
 * A 2D context that draws nothing and remembers where it was asked to.
 *
 * Only INK counts. A path is held aside until something is done with it, and
 * a path handed to `clip()` is thrown away — chapter 3's pegasus masks itself
 * with a 480-unit rectangle before it draws a thing, and counting that as ink
 * would say the cell is three-quarters crop when nothing has been cropped.
 */
const recorder = (): { api: unknown; pts: [number, number][] } => {
  const pts: [number, number][] = []
  let pending: [number, number][] = []
  let used = false
  const commit = (): void => {
    if (used) return
    used = true
    for (const p of pending) pts.push(p)
  }
  const stack: M[] = []
  let m: M = [1, 0, 0, 1, 0, 0]
  const mul = (n: M): void => {
    m = [
      m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
      m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
      m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]
    ]
  }
  const add = (x: number, y: number): void => {
    const px = m[0] * x + m[2] * y + m[4]
    const py = m[1] * x + m[3] * y + m[5]
    if (Number.isFinite(px) && Number.isFinite(py)) pending.push([px, py])
  }
  const box = (x: number, y: number, w: number, h: number): void => { add(x, y); add(x + w, y + h) }
  const grad = { addColorStop: (): void => {} }
  const api = {
    save: (): void => { stack.push([...m] as M) },
    restore: (): void => { const p = stack.pop(); if (p) m = p },
    translate: (x: number, y: number): void => mul([1, 0, 0, 1, x, y]),
    scale: (x: number, y: number): void => mul([x, 0, 0, y, 0, 0]),
    rotate: (a: number): void => mul([Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0]),
    transform: (...n: M): void => mul(n),
    setTransform: (...n: unknown[]): void => {
      if (n.length === 6) m = n as M
      else if (n[0] && typeof n[0] === 'object') {
        const t = n[0] as DOMMatrix
        m = [t.a, t.b, t.c, t.d, t.e, t.f]
      } else m = [1, 0, 0, 1, 0, 0]
    },
    resetTransform: (): void => { m = [1, 0, 0, 1, 0, 0] },
    getTransform: () => ({ a: m[0], b: m[1], c: m[2], d: m[3], e: m[4], f: m[5] }),
    beginPath: (): void => { pending = []; used = false },
    closePath: (): void => {},
    moveTo: add,
    lineTo: add,
    quadraticCurveTo: (a: number, b: number, c: number, d: number): void => { add(a, b); add(c, d) },
    bezierCurveTo: (a: number, b: number, c: number, d: number, e: number, f: number): void => {
      add(a, b); add(c, d); add(e, f)
    },
    arcTo: (a: number, b: number, c: number, d: number): void => { add(a, b); add(c, d) },
    arc: (x: number, y: number, r: number): void => box(x - r, y - r, r * 2, r * 2),
    ellipse: (x: number, y: number, rx: number, ry: number): void => box(x - rx, y - ry, rx * 2, ry * 2),
    rect: box,
    roundRect: box,
    fillRect: (x: number, y: number, w: number, h: number): void => {
      const held = pending
      pending = []
      box(x, y, w, h)
      for (const p of pending) pts.push(p)
      pending = held
    },
    strokeRect: (x: number, y: number, w: number, h: number): void => {
      const held = pending
      pending = []
      box(x, y, w, h)
      for (const p of pending) pts.push(p)
      pending = held
    },
    clearRect: (): void => {},
    fill: commit,
    stroke: commit,
    clip: (): void => { pending = []; used = true },
    drawImage: (): void => {},
    createLinearGradient: () => grad,
    createRadialGradient: () => grad,
    createConicGradient: () => grad,
    createPattern: () => null,
    setLineDash: (): void => {},
    getLineDash: (): number[] => [],
    measureText: () => ({ width: 0 }),
    fillText: (): void => {},
    strokeText: (): void => {},
    getImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
    putImageData: (): void => {}
  }
  return { api, pts }
}

const SIZE = 128

/** Where a cell's ink lands, in cell pixels, at the frame the album chose. */
const inCell = (s: Sticker, peek: number): [number, number][] => {
  const box = stickerFrame(s)!
  const def = drawableOf(s)!
  const r = recorder()
  const g = r.api as CanvasRenderingContext2D
  g.scale(SIZE / box.w, SIZE / box.h)
  g.translate(-box.x, -box.y)
  def.draw(g, peek, STILL_T)
  return r.pts
}

/** The creature alone: what peek 1 inks that peek 0 did not. A tap creature's
 *  painter splices it between the two halves of its hiding place, so head and
 *  tail cancel. A rescue has no hiding place — all of it is the creature. */
const creature = (s: Sticker): [number, number][] => {
  const full = inCell(s, 1)
  if (s.kind === 'rescue') return full
  const base = inCell(s, 0)
  let head = 0
  while (head < base.length && base[head]![0] === full[head]![0] && base[head]![1] === full[head]![1]) head++
  let tail = 0
  const max = Math.min(base.length - head, full.length - head)
  while (
    tail < max &&
    base[base.length - 1 - tail]![0] === full[full.length - 1 - tail]![0] &&
    base[base.length - 1 - tail]![1] === full[full.length - 1 - tail]![1]
  ) tail++
  return full.slice(head, full.length - tail)
}

const bounds = (pts: readonly [number, number][]) => {
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const [x, y] of pts) {
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y)
  }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 }
}

const every = (): Sticker[] => albumPages().flatMap((p) => p.cells)

describe('a cell frames its creature', () => {
  it('has a frame for every single cell in the album', () => {
    for (const s of every()) {
      const box = stickerFrame(s)
      expect(box, s.key).not.toBeNull()
      expect(box!.w, s.key).toBeGreaterThan(0)
      expect(box!.w, s.key).toBeCloseTo(box!.h, 6)
    }
  })

  it('finds ink for every creature in the cast', () => {
    for (const s of every()) expect(creature(s).length, s.key).toBeGreaterThan(8)
  })

  it('holds the whole creature inside the cell', () => {
    // A tolerance of a few pixels, not of a limb: bezier handles bound their
    // own curve a little wide, and a line drawn ON the frame is half a stroke
    // width past it.
    const SLACK = 4
    for (const s of every()) {
      const b = bounds(creature(s))
      expect(b.x0, `${s.key} left`).toBeGreaterThan(-SLACK)
      expect(b.y0, `${s.key} top`).toBeGreaterThan(-SLACK)
      expect(b.x1, `${s.key} right`).toBeLessThan(SIZE + SLACK)
      expect(b.y1, `${s.key} bottom`).toBeLessThan(SIZE + SLACK)
    }
  })

  it('fills the cell with it rather than parking it in a corner', () => {
    // The frame is square and the creature is not, so only its longer side
    // can fill the cell — that side is what this asks about.
    //
    // `measure.ts` rounds the shared prefix DOWN to a whole point when a
    // cover's last coordinate half-matches the creature's first, so its box
    // can carry one stray point of the hiding place and come out a little
    // wide. Generous is the safe direction for a frame, and it is why the
    // floor here is not the 0.91 the frame's own arithmetic would give.
    for (const s of every()) {
      const b = bounds(creature(s))
      expect(Math.max(b.w, b.h) / SIZE, s.key).toBeGreaterThan(0.75)
    }
  })
})

describe('a photo card', () => {
  // The card draws a whole sector painting and the rig on top of it, through
  // code paths jsdom cannot rasterise. What can be asserted is that the whole
  // composition RUNS — every keepsake hook, every pooled emitter's still —
  // and that it lands inside the card rather than off the side of it.
  const W = 240
  const H = 160

  const card = (): [number, number][] => {
    const r = recorder()
    drawPhotoCard(r.api as CanvasRenderingContext2D, W, H, currentPhoto())
    return r.pts
  }

  it('draws the sector and her on top of it, without throwing', () => {
    S.campaign = defaultCampaign()
    expect(card().length).toBeGreaterThan(200)
  })

  it('draws her wearing everything at once, with every emitter frozen', () => {
    S.campaign = defaultCampaign()
    S.campaign.giftsOwned = 0x7fffffff
    // One keepsake in every slot, and then each of the four trails in turn:
    // a trail is a pooled emitter in the live game, and a card asks it for a
    // still instead — the one place the still could crash is here.
    const eq = COSMETIC_SLOTS.map((sl) => cosmeticsIn(sl)[0] ?? -1)
    S.campaign.giftsEquipped = [...eq] as typeof S.campaign.giftsEquipped
    expect(card().length).toBeGreaterThan(200)
    const trail = COSMETIC_SLOTS.indexOf('trail')
    for (const id of cosmeticsIn('trail')) {
      const worn = [...eq]
      worn[trail] = id
      S.campaign.giftsEquipped = worn as typeof S.campaign.giftsEquipped
      expect(() => card(), `trail ${id}`).not.toThrow()
    }
  })

  it('keeps the whole composition inside the card', () => {
    S.campaign = defaultCampaign()
    const pts = card()
    const inside = pts.filter(([x, y]) => x > -W && x < W * 2 && y > -H && y < H * 2).length
    // A sector is drawn cover-fit, so it overhangs the card by design; what
    // must not happen is ink a whole card-width away, which is what a rig
    // placed in the wrong space looks like.
    expect(inside / pts.length).toBeGreaterThan(0.9)
  })
})
