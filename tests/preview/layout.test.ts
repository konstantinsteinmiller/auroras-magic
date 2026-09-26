// The duel VS preview's layout (`src/game/preview/preview.ts`
// `computePreviewLayout`): ONE function places the canvas's duelists and
// podiums AND the DOM's ribbons, powers, VS emblem, banner and skip glyph.
// The DOM sizes itself with the `PREVIEW_DOM` ratios of `lay.u`, so these are
// the boxes it will actually take up. What must hold on every screen the
// game ships to:
//
//   • nothing overlaps anything else — ribbon, crown, VS emblem, countdown
//     stars, heads, podiums, powers blocks, banner, skip glyph;
//   • everything stays on screen;
//   • the unicorns are BIG: 40–45 % of the height in landscape;
//   • each stands on her own side of the seam, facing the other.

import { describe, expect, it } from 'vitest'
import {
  computePreviewLayout, PREVIEW_DOM, RIG_BOX, PODIUM_BOX, powersHeight
} from '@/game/preview/preview'
import type { PreviewLayout } from '@/game/preview/previewHud'

interface Box { name: string; x: number; y: number; w: number; h: number }

const D = PREVIEW_DOM

/** Every box the preview puts on screen, CSS px. */
const boxesOf = (l: PreviewLayout): Box[] => {
  const u = l.u
  const s = l.scale
  const ribH = D.ribbonH * u
  const alignX = (p: PreviewLayout['heroPowers']): number =>
    p.align === 'start' ? p.x : p.align === 'end' ? p.x - p.w : p.x - p.w / 2
  // Aurora faces +x: her authored box as is. The foe is its mirror.
  const heroRig: Box = { name: 'hero rig', x: l.hero.x + RIG_BOX.x0 * s, y: l.hero.y - RIG_BOX.up * s, w: (RIG_BOX.x1 - RIG_BOX.x0) * s, h: (RIG_BOX.up + RIG_BOX.down) * s }
  const foeRig: Box = { name: 'foe rig', x: l.foe.x - RIG_BOX.x1 * s, y: l.foe.y - RIG_BOX.up * s, w: (RIG_BOX.x1 - RIG_BOX.x0) * s, h: (RIG_BOX.up + RIG_BOX.down) * s }
  const mid = (RIG_BOX.x0 + RIG_BOX.x1) / 2
  const podium = (name: string, cx: number, y: number): Box =>
    ({ name, x: cx - PODIUM_BOX.half * s, y: y + PODIUM_BOX.top * s, w: 2 * PODIUM_BOX.half * s, h: (PODIUM_BOX.depth - PODIUM_BOX.top) * s })
  return [
    { name: 'banner', x: l.banner.x - l.banner.w / 2, y: l.banner.y - (D.bannerH * u) / 2, w: l.banner.w, h: D.bannerH * u },
    { name: 'hero ribbon', x: l.heroRibbon.x - l.heroRibbon.w / 2, y: l.heroRibbon.y - ribH / 2, w: l.heroRibbon.w, h: ribH },
    // The foe may be a boss: her crown pokes up above the ribbon.
    { name: 'foe ribbon+crown', x: l.foeRibbon.x - l.foeRibbon.w / 2, y: l.foeRibbon.y - ribH / 2 - D.crownPoke * u, w: l.foeRibbon.w, h: ribH + D.crownPoke * u },
    { name: 'vs', x: l.vs.x - l.vs.r, y: l.vs.y - l.vs.r, w: 2 * l.vs.r, h: 2 * l.vs.r },
    { name: 'stars', x: l.vs.x - (D.starsW * u) / 2, y: l.vs.y + l.vs.r + D.starsGap * u, w: D.starsW * u, h: D.starsH * u },
    { name: 'hero powers', x: alignX(l.heroPowers), y: l.heroPowers.y, w: l.heroPowers.w, h: l.heroPowers.h },
    { name: 'foe powers', x: alignX(l.foePowers), y: l.foePowers.y, w: l.foePowers.w, h: l.foePowers.h },
    heroRig,
    foeRig,
    podium('hero podium', l.hero.x + mid * s, l.hero.y),
    podium('foe podium', l.foe.x - mid * s, l.foe.y),
    { name: 'skip', x: l.skip.x - l.skip.r, y: l.skip.y - l.skip.r, w: 2 * l.skip.r, h: 2 * l.skip.r }
  ]
}

const overlap = (a: Box, b: Box): boolean =>
  a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5

/** A rig standing on her own podium is meant to touch it. */
const allowed = (a: string, b: string): boolean => {
  const pair = [a, b].sort().join('|')
  return pair === 'hero podium|hero rig' || pair === 'foe podium|foe rig'
}

const SCREENS: readonly (readonly [number, number, string])[] = [
  [1280, 720, 'desktop 16:9'],
  [914, 411, 'phone landscape'],
  [390, 844, 'phone portrait'],
  [768, 1024, 'tablet portrait'],
  [1920, 1080, 'full HD'],
  // …and the shapes between them, so a tweak for one cannot break the next.
  [1024, 768, 'tablet landscape'],
  [844, 390, 'phone landscape, tall notch'],
  [360, 640, 'small phone portrait'],
  [2560, 1080, 'ultrawide']
]

describe('the preview layout', () => {
  for (const [w, h, what] of SCREENS) {
    describe(`${w}x${h} (${what})`, () => {
      const l = computePreviewLayout(w, h)
      const boxes = boxesOf(l)
      const powH = powersHeight(l.u)

      it('overlaps nothing', () => {
        const bad: string[] = []
        for (let i = 0; i < boxes.length; i++) {
          for (let j = i + 1; j < boxes.length; j++) {
            const a = boxes[i]!
            const b = boxes[j]!
            if (a.w <= 0 || b.w <= 0 || allowed(a.name, b.name)) continue
            if (overlap(a, b)) bad.push(`${a.name} × ${b.name}`)
          }
        }
        expect(bad).toEqual([])
      })

      it('keeps everything on screen', () => {
        for (const b of boxes) {
          expect(b.x, `${b.name} left`).toBeGreaterThanOrEqual(-0.5)
          expect(b.y, `${b.name} top`).toBeGreaterThanOrEqual(-0.5)
          expect(b.x + b.w, `${b.name} right`).toBeLessThanOrEqual(w + 0.5)
          expect(b.y + b.h, `${b.name} bottom`).toBeLessThanOrEqual(h + 0.5)
        }
      })

      it('gives every DOM block room to exist', () => {
        expect(l.heroRibbon.w).toBeGreaterThan(D.ribbonH * l.u * 1.6)
        expect(l.foeRibbon.w).toBeGreaterThan(D.ribbonH * l.u * 1.6)
        expect(l.banner.w).toBeGreaterThan(0.18 * Math.min(w, 1200))
        // A powers block holds at least an epithet, a caption and one row of
        // icons, and three icons abreast.
        for (const p of [l.heroPowers, l.foePowers]) {
          expect(p.h).toBeGreaterThanOrEqual(powH - 0.5)
          expect(p.w).toBeGreaterThanOrEqual(3 * (D.runeIcon + D.runeGap) * l.u)
        }
      })

      it('stands each duelist on her own side of the seam, facing the other', () => {
        const side = (x: number, y: number): number => Math.sign((x - l.seam.x) * l.seam.dy - (y - l.seam.y) * l.seam.dx)
        const hs = side(l.hero.x, l.hero.y - 40 * l.scale)
        const fs = side(l.foe.x, l.foe.y - 40 * l.scale)
        expect(hs).not.toBe(0)
        expect(fs).toBe(-hs)
        // Aurora is the left one of the two; the foe faces her from the right.
        expect(l.hero.x).toBeLessThan(l.foe.x)
        if (l.portrait) expect(l.foe.y).toBeLessThan(l.hero.y)
      })

      if (w > h) {
        it('draws the unicorns big: 40–45 % of the height', () => {
          const rig = (l.hero.y - l.hero.head) / h
          expect(rig).toBeGreaterThanOrEqual(0.36)
          expect(rig).toBeLessThanOrEqual(0.45)
        })
      } else {
        it('draws the unicorns as big as the stack allows: over a fifth of the height', () => {
          expect((l.hero.y - l.hero.head) / h).toBeGreaterThanOrEqual(0.22)
        })
      }
    })
  }

  it('respects a safe-area notch', () => {
    const l = computePreviewLayout(844, 390, { top: 0, right: 0, bottom: 21, left: 47 })
    for (const b of boxesOf(l)) {
      expect(b.x, b.name).toBeGreaterThanOrEqual(47 - 0.5)
      expect(b.y + b.h, b.name).toBeLessThanOrEqual(390 - 21 + 0.5)
    }
  })
})
