// What is printed on a storybook page behind its beats (story-spec §8.31).
//
// The decor has exactly one way to fail badly: crowding the beat cards, which
// are the only thing on a page a child is meant to look at. So the contract
// this pins is where a motif may NOT be, not what it looks like:
//
//   • never over a beat card or its badge;
//   • never over the coloured biome wash — marginalia is printed on paper;
//   • never off the page, and never piled on top of another motif;
//   • the same page draws the same way every time it is opened (seeded), and
//     two chapters do not draw the same page.
//
// The motifs are stroke-only line art, so a recording context that captures
// the transform of each one is enough to check all of it without a canvas.

import { describe, expect, it } from 'vitest'
import { drawPageDecor, type KeepOut } from '@/game/map/pageDecor'

interface Placed { x: number; y: number; r: number }

/**
 * A context that records where each motif landed. Every motif is drawn inside
 * one `save()`/`restore()` pair that translates to its centre and scales to
 * its radius, so the pair IS the motif's placement.
 */
const recorder = (): { g: CanvasRenderingContext2D; placed: Placed[] } => {
  const placed: Placed[] = []
  let cur: Placed | null = null
  let drew = false
  const g = {
    save: () => { cur = null; drew = false },
    restore: () => {
      if (cur && drew) placed.push(cur)
      cur = null
    },
    translate: (x: number, y: number) => { cur = { x, y, r: 0 } },
    rotate: () => {},
    scale: (s: number) => { if (cur) cur.r = s },
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arc: () => {},
    ellipse: () => {},
    quadraticCurveTo: () => {},
    stroke: () => { drew = true },
    fill: () => {},
    fillRect: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
    globalAlpha: 1,
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter'
  } as unknown as CanvasRenderingContext2D
  return { g, placed }
}

/** A landscape page the size the map draws one at, with its five beat cards
 *  where `SLOTS` puts them (map units × the scale a 1280-wide view uses).
 *  Page-LOCAL, like the bake: 0, 0 is the page's own corner. */
const PAGE = { w: 1240, h: 700 }
const MS = PAGE.w / 1600
const SLOTS = [
  [270, 600, 300, 175], [580, 320, 300, 175], [890, 600, 300, 175],
  [1190, 320, 300, 175], [1395, 610, 360, 210]
] as const

const cards = (): KeepOut[] => SLOTS.flatMap(([sxu, syu, w, h]) => [
  { x: sxu * MS, y: syu * MS, r: Math.hypot(w, h) * 0.5 * MS + 10 },
  { x: sxu * MS, y: (syu + h / 2) * MS, r: 42 }
])

const GROUND = PAGE.h * 0.62

const run = (c: number, built = true, keep = cards()): Placed[] => {
  const { g, placed } = recorder()
  drawPageDecor(g, PAGE.w, PAGE.h, c, built, false, keep, GROUND)
  return placed
}

describe('page marginalia (§8.31)', () => {
  it('draws a page worth of motifs on every chapter', () => {
    for (let c = 0; c < 10; c++) expect(run(c).length, `chapter ${c}`).toBeGreaterThanOrEqual(6)
  })

  it('never puts one over a beat card or its badge', () => {
    const keep = cards()
    for (let c = 0; c < 10; c++) {
      for (const m of run(c, true, keep)) {
        for (const k of keep) {
          expect(
            Math.hypot(m.x - k.x, m.y - k.y),
            `chapter ${c}: motif at ${m.x.toFixed(0)},${m.y.toFixed(0)}`
          ).toBeGreaterThanOrEqual(k.r + m.r)
        }
      }
    }
  })

  it('stays on the paper, off the biome wash', () => {
    for (let c = 0; c < 10; c++) for (const m of run(c)) expect(m.y, `chapter ${c}`).toBeLessThanOrEqual(GROUND)
  })

  it('stays inside the page, clear of the binding and the folded corners', () => {
    const margin = Math.min(PAGE.w, PAGE.h) * 0.075
    for (let c = 0; c < 10; c++) {
      for (const m of run(c)) {
        expect(m.x).toBeGreaterThanOrEqual(margin)
        expect(m.x).toBeLessThanOrEqual(PAGE.w - margin)
        expect(m.y).toBeGreaterThanOrEqual(margin)
      }
    }
  })

  it('never piles two motifs on the same spot', () => {
    for (let c = 0; c < 10; c++) {
      const p = run(c)
      for (let i = 0; i < p.length; i++) {
        for (let j = i + 1; j < p.length; j++) {
          expect(Math.hypot(p[i]!.x - p[j]!.x, p[i]!.y - p[j]!.y)).toBeGreaterThan(p[i]!.r + p[j]!.r)
        }
      }
    }
  })

  it('draws the same page every time it is opened, and a different one per chapter', () => {
    expect(run(3)).toEqual(run(3))
    expect(run(3)).not.toEqual(run(4))
  })

  it('carries fewer drawings rather than crowding a page with no room', () => {
    // One keep-out over the whole page: there is nowhere legal left.
    const whole: KeepOut[] = [{ x: PAGE.w / 2, y: PAGE.h / 2, r: Math.hypot(PAGE.w, PAGE.h) }]
    expect(run(0, true, whole)).toHaveLength(0)
  })

  it('gives a sleeping chapter its own quieter set', () => {
    expect(run(5, false).length).toBeGreaterThanOrEqual(6)
  })
})
