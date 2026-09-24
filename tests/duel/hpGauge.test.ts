// @vitest-environment node
// The duel's HP bars, as arithmetic (`game/duel/hpGauge.ts`).
//
// Testers: "no visible health numbers, just colour bars" and "my bar looked
// empty before the defeat". What is pinned here is exactly those two, plus the
// chip that makes a hit readable and the glow that warns a player she is low:
//   1. the fill is PROPORTIONAL, never reads empty above 0 HP, and is exactly
//      empty at 0 — the one rule that makes "empty" mean "lost";
//   2. the glow's three steps, on their lines, and never on the foe's bar;
//   3. the chip holds for its moment, then drains; a heal or a new duel
//      snaps it up.

import { describe, expect, it } from 'vitest'
import {
  gaugeFill, gaugeClip, lowLevel, barLowLevel, newGhost, resetGhost, stepGhost,
  MIN_SLIVER, MARKS, GHOST_HOLD, LOW_GLOW, LOW_PULSE
} from '@/game/duel/hpGauge'

describe('the fill', () => {
  it('maps HP to the share of the track it fills', () => {
    expect(gaugeFill(100, 100)).toBe(1)
    expect(gaugeFill(50, 100)).toBe(0.5)
    expect(gaugeFill(25, 100)).toBe(0.25)
    // The director's mercy floor: plainly a bar with something in it.
    expect(gaugeFill(10, 100)).toBe(0.1)
    // Per side (F18): a boss's bar is full at HER max.
    expect(gaugeFill(135, 135)).toBe(1)
    expect(gaugeFill(67.5, 135)).toBe(0.5)
  })

  it('never reads empty while there is HP left', () => {
    expect(gaugeFill(0.3, 100)).toBe(MIN_SLIVER)
    expect(gaugeFill(1e-6, 100)).toBe(MIN_SLIVER)
    expect(gaugeFill(3.9, 100)).toBe(MIN_SLIVER)
    expect(gaugeFill(4.1, 100)).toBeCloseTo(0.041)
    // The sliver is a sliver: under the mercy floor, well under a notch.
    expect(MIN_SLIVER).toBeGreaterThan(0.02)
    expect(MIN_SLIVER).toBeLessThan(0.1)
  })

  it('is exactly empty at 0, and clamps outside the range', () => {
    expect(gaugeFill(0, 100)).toBe(0)
    expect(gaugeFill(-5, 100)).toBe(0)
    expect(gaugeFill(Number.NaN, 100)).toBe(0)
    expect(gaugeFill(120, 100)).toBe(1)
  })

  it('draws a fill from its anchored end, as a clip', () => {
    expect(gaugeClip(1, 'left')).toBe('inset(0 0.00% 0 0)')
    expect(gaugeClip(0.25, 'left')).toBe('inset(0 75.00% 0 0)')
    expect(gaugeClip(0.25, 'right')).toBe('inset(0 0 0 75.00%)')
    expect(gaugeClip(0, 'right')).toBe('inset(0 0 0 100.00%)')
  })

  it('is notched at a quarter, a half and three quarters', () => {
    expect([...MARKS]).toEqual([0.25, 0.5, 0.75])
  })
})

describe('the low-health glow', () => {
  it('is off above 30 %', () => {
    expect(lowLevel(100, 100)).toBe(0)
    expect(lowLevel(31, 100)).toBe(0)
    expect(lowLevel(30.01, 100)).toBe(0)
  })

  it('glows, steady, at 30 % and down to 25 %', () => {
    expect(LOW_GLOW).toBe(0.3)
    expect(lowLevel(30, 100)).toBe(1)
    expect(lowLevel(27, 100)).toBe(1)
    expect(lowLevel(25, 100)).toBe(1)
  })

  it('pulses under 25 %, down to the last sliver', () => {
    expect(LOW_PULSE).toBe(0.25)
    expect(lowLevel(24.9, 100)).toBe(2)
    expect(lowLevel(10, 100)).toBe(2)
    expect(lowLevel(0.3, 100)).toBe(2)
  })

  it('stops at 0: nothing is left to look after, and the result card is coming', () => {
    expect(lowLevel(0, 100)).toBe(0)
  })

  it('is a share of HER max, like the fill', () => {
    expect(lowLevel(40, 135)).toBe(1)
    expect(lowLevel(33, 135)).toBe(2)
  })

  it('never lights the foe\'s bar, and only lights anything mid-duel', () => {
    expect(barLowLevel(10, 100, false, true)).toBe(0)
    expect(barLowLevel(10, 100, true, true)).toBe(2)
    expect(barLowLevel(10, 100, true, false)).toBe(0)
  })
})

describe('the damage chip', () => {
  const frames = (g: ReturnType<typeof newGhost>, hp: number, seconds: number, dt = 1 / 60): number => {
    let v = g.v
    for (let t = 0; t < seconds - 1e-9; t += dt) v = stepGhost(g, hp, dt)
    return v
  }

  it('holds where the hit took it from for the hold, then drains into the fill', () => {
    const g = newGhost(100)
    stepGhost(g, 80, 1 / 60)
    expect(frames(g, 80, GHOST_HOLD - 0.05)).toBe(100)
    // …then it goes, and is gone about half a second later.
    expect(frames(g, 80, 0.15)).toBeLessThan(100)
    expect(frames(g, 80, 0.6)).toBe(80)
  })

  it('restarts the hold on every hit, so a combo reads as one chunk', () => {
    const g = newGhost(100)
    stepGhost(g, 90, 1 / 60)
    frames(g, 90, 0.3)
    stepGhost(g, 75, 1 / 60)
    expect(frames(g, 75, 0.3)).toBe(100)
    expect(frames(g, 75, 1)).toBe(75)
  })

  it('stands still on a paused frame', () => {
    const g = newGhost(100)
    stepGhost(g, 60, 0)
    for (let i = 0; i < 100; i++) stepGhost(g, 60, 0)
    expect(g.v).toBe(100)
  })

  it('snaps up with a heal and with a new duel', () => {
    const g = newGhost(100)
    stepGhost(g, 40, 1 / 60)
    frames(g, 40, 2)
    expect(g.v).toBe(40)
    expect(stepGhost(g, 70, 1 / 60)).toBe(70)
    resetGhost(g, 135)
    expect(g.v).toBe(135)
    expect(stepGhost(g, 135, 1 / 60)).toBe(135)
  })
})
