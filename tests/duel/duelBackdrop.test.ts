// The duel's backdrop — the sector's own page (`duelPage.ts`) — is drawn at
// ONE scale on every screen, and whatever part of it a screen shows, the
// island and both duelists are in it. Owner, 2026-09-24: "It should not
// stretch the background image vertically."

import { describe, expect, it } from 'vitest'
import { computeLayout, PORTRAIT_WIN } from '@/game/duel/layout'
import { PAGE_ON_STAGE, toSecX, toSecY } from '@/game/duel/duelPage'
import { SEC_W, SEC_H } from '@/game/restore/mask'
import { SW, SH, AX, UX, GY } from '@/game/duel/config'

const none = { top: 0, right: 0, bottom: 0, left: 0 }
const notch = { top: 47, right: 0, bottom: 34, left: 0 }

/** Phones upright, a tablet, a squat split screen, and the landscape set. */
const VIEWS: [number, number][] = [
  [320, 658], [360, 740], [390, 844], [412, 915], [430, 932], [467, 948],
  [768, 1024], [768, 820], [1280, 720], [844, 390], [1920, 1080], [2560, 1080]
]

/** What must never be cropped away: the island's blit box and both duelists
 *  with room for a fallen pose (±90, see `tests/duel/island.test.ts`). */
const ISLAND = { x0: 326, x1: 954, y0: 450, y1: 718 }
const DUELISTS = { x0: AX - 90, x1: UX + 90, y0: GY - 190, y1: GY }

describe('the page is laid on the stage at one scale', () => {
  it('covers the whole 1280x720 stage without stretching', () => {
    const P = PAGE_ON_STAGE
    expect(P.w / SEC_W).toBeCloseTo(P.h / SEC_H, 12)
    expect(P.x).toBeLessThanOrEqual(1e-9)
    expect(P.y).toBeLessThanOrEqual(1e-9)
    expect(P.x + P.w).toBeGreaterThanOrEqual(SW - 1e-9)
    expect(P.y + P.h).toBeGreaterThanOrEqual(SH - 1e-9)
  })

  it('maps a spell\'s landing point back onto the pixel of the page it hit', () => {
    // The cleared-dust mask is in sector units; if this mapping disagreed
    // with the draw, a blast would clear a patch off to one side of it.
    for (const [x, y] of [[0, 0], [640, 360], [AX, GY], [UX, GY - 120], [SW, SH]] as const) {
      const sx = toSecX(x)
      const sy = toSecY(y)
      expect(PAGE_ON_STAGE.x + sx * PAGE_ON_STAGE.k).toBeCloseTo(x, 9)
      expect(PAGE_ON_STAGE.y + sy * PAGE_ON_STAGE.k).toBeCloseTo(y, 9)
    }
    // One scale both ways: equal stage steps are equal sector steps.
    expect(toSecX(100) - toSecX(0)).toBeCloseTo(toSecY(100) - toSecY(0), 12)
  })
})

describe('every screen shows a crop of the page, never a squash', () => {
  it('draws the page on screen at the painting\'s own aspect', () => {
    for (const [w, h] of VIEWS) {
      const L = computeLayout(w, h, none)
      const P = PAGE_ON_STAGE
      // stage -> screen is `v + stage * vs`: ONE factor on both axes.
      const sw = P.w * L.vs
      const sh = P.h * L.vs
      expect(sw / sh, `${w}x${h}`).toBeCloseTo(SEC_W / SEC_H, 9)
    }
  })

  it('never shows past the painting\'s edges, and keeps the island and both duelists in the picture', () => {
    for (const ins of [none, notch]) for (const [w, h] of VIEWS) {
      const L = computeLayout(w, h, ins)
      const tag = `${w}x${h}${ins === notch ? ' notch' : ''}`
      // The stage rect the picture pane shows.
      const vis = {
        x0: (L.pane.x - L.vx) / L.vs,
        x1: (L.pane.x + L.pane.w - L.vx) / L.vs,
        y0: (L.pane.y - L.vy) / L.vs,
        y1: (L.pane.y + L.pane.h - L.vy) / L.vs
      }
      const P = PAGE_ON_STAGE
      expect(vis.x0, tag).toBeGreaterThanOrEqual(P.x - 1e-6)
      expect(vis.x1, tag).toBeLessThanOrEqual(P.x + P.w + 1e-6)
      expect(vis.y0, tag).toBeGreaterThanOrEqual(P.y - 1e-6)
      expect(vis.y1, tag).toBeLessThanOrEqual(P.y + P.h + 1e-6)
      for (const r of [ISLAND, DUELISTS]) {
        expect(r.x0, tag).toBeGreaterThanOrEqual(vis.x0 - 1e-6)
        expect(r.x1, tag).toBeLessThanOrEqual(vis.x1 + 1e-6)
        expect(r.y0, tag).toBeGreaterThanOrEqual(vis.y0 - 1e-6)
        expect(r.y1, tag).toBeLessThanOrEqual(vis.y1 + 1e-6)
      }
      if (L.portrait) expect(vis.y0, tag).toBeCloseTo(PORTRAIT_WIN.y0)
    }
  })
})
