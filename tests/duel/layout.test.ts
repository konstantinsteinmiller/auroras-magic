// Where the stage sits and where the player draws — pure, no DOM. The HUD and
// the canvas both read this, so the two can never disagree about the layout.

import { describe, expect, it } from 'vitest'
import { computeLayout, PORTRAIT_WIN } from '@/game/duel/layout'
import { BOX, SW, SH } from '@/game/duel/config'

const none = { top: 0, right: 0, bottom: 0, left: 0 }

describe('landscape — the jam build\'s letterbox', () => {
  it('fits and centres the 1280x720 stage', () => {
    const L = computeLayout(1920, 1080, none)
    expect(L.portrait).toBe(false)
    expect(L.vs).toBeCloseTo(1.5)
    expect(L.vx).toBeCloseTo(0)
    expect(L.vy).toBeCloseTo(0)
  })

  it('letterboxes a wider screen at the sides', () => {
    const L = computeLayout(844, 390, none) // a phone held sideways
    expect(L.vs).toBeCloseTo(390 / SH)
    expect(L.vx).toBeGreaterThan(0)
    expect(L.vx * 2 + SW * L.vs).toBeCloseTo(844)
  })

  it('invites strokes in the central box (GDD 3.2)', () => {
    const L = computeLayout(1280, 720, none)
    expect(L.zone).toEqual(BOX)
  })
})

describe('portrait — the duel window over a drawing pad', () => {
  it('frames the duel window to the width on the smallest supported phone (320x658)', () => {
    const L = computeLayout(320, 658, none)
    expect(L.portrait).toBe(true)
    expect(L.vs).toBeCloseTo(320 / (PORTRAIT_WIN.x1 - PORTRAIT_WIN.x0))
    // The window's left edge sits on the screen's left edge.
    expect(L.vx + PORTRAIT_WIN.x0 * L.vs).toBeCloseTo(0)
    // …and its top sits right under the HUD band.
    expect(L.vy + PORTRAIT_WIN.y0 * L.vs).toBeCloseTo(L.topBand)
  })

  it('leaves a usable drawing pad between the stage and CAST', () => {
    for (const [w, h] of [[320, 658], [360, 740], [390, 844], [430, 932]] as const) {
      const L = computeLayout(w, h, none)
      expect(L.zonePx.h, `${w}x${h}`).toBeGreaterThanOrEqual(96)
      expect(L.zonePx.y + L.zonePx.h).toBeLessThanOrEqual(h - L.bottomBar)
    }
  })

  it('shrinks the window rather than lose the pad on a squat portrait', () => {
    const L = computeLayout(768, 820, none)
    expect(L.zonePx.h).toBeGreaterThanOrEqual(96)
  })

  it('keeps clear of the safe-area insets', () => {
    const inset = { top: 44, right: 0, bottom: 34, left: 0 }
    const L = computeLayout(390, 844, inset)
    expect(L.topBand).toBeGreaterThan(44)
    expect(L.bottomBar).toBeGreaterThan(34)
  })

  it('maps the pad into stage units consistently with its pixels', () => {
    const L = computeLayout(360, 740, none)
    expect(L.vx + L.zone.x * L.vs).toBeCloseTo(L.zonePx.x)
    expect(L.vy + L.zone.y * L.vs).toBeCloseTo(L.zonePx.y)
    expect(L.zone.w * L.vs).toBeCloseTo(L.zonePx.w)
  })
})
