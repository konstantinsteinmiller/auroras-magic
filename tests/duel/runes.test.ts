// The rune recogniser, ported verbatim from the jam build — pinned by
// behaviour so a future "tidy-up" cannot quietly change what a player's stroke
// turns into. GDD 3.3 / 6: rough shapes must be accepted, junk must not be.

import { describe, expect, it } from 'vitest'
import { recognise } from '@/game/duel/runes'
import { FIRE, WIND, ICE, EARTH } from '@/game/duel/config'
import { seeded } from '@/game/duel/util'

type Pt = [number, number]

/** Densify a polyline the way a pointer would report it. */
const trace = (pts: Pt[], per = 12): number[] => {
  const out: number[] = []
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = pts[i - 1]!
    const [c, d] = pts[i]!
    for (let k = 0; k < per; k++) out.push(a + ((c - a) * k) / per, b + ((d - b) * k) / per)
  }
  const last = pts[pts.length - 1]!
  out.push(last[0], last[1])
  return out
}

/** Add hand jitter of `amp` units, deterministically. */
const jitter = (p: number[], amp: number, seed = 7): number[] => {
  const r = seeded(seed)
  return p.map((v) => v + (r() - 0.5) * 2 * amp)
}

/** Rotate a closed ring of corners so the stroke starts at corner `s`. */
const startAt = (corners: Pt[], s: number): Pt[] => {
  const ring = [...corners.slice(s), ...corners.slice(0, s)]
  return [...ring, ring[0]!]
}

const C: Pt = [640, 320]
const tri = (r: number): Pt[] => [
  [C[0], C[1] - r],
  [C[0] + r * 0.87, C[1] + r * 0.5],
  [C[0] - r * 0.87, C[1] + r * 0.5]
]
const square = (r: number): Pt[] => [
  [C[0] - r, C[1] - r],
  [C[0] + r, C[1] - r],
  [C[0] + r, C[1] + r],
  [C[0] - r, C[1] + r]
]
const zed = (r: number): Pt[] => [
  [C[0] - r, C[1] - r * 0.8],
  [C[0] + r, C[1] - r * 0.8],
  [C[0] - r, C[1] + r * 0.8],
  [C[0] + r, C[1] + r * 0.8]
]
const wave = (r: number, humps = 2): Pt[] => {
  const p: Pt[] = []
  for (let i = 0; i <= 40; i++) {
    const t = i / 40
    p.push([C[0] - r + 2 * r * t, C[1] + Math.sin(t * Math.PI * humps) * r * 0.45])
  }
  return p
}

describe('recognise: the four runes', () => {
  it('reads a triangle as FIRE from every corner, both directions', () => {
    for (let s = 0; s < 3; s++) {
      expect(recognise(trace(startAt(tri(110), s)))).toBe(FIRE)
      expect(recognise(trace(startAt([...tri(110)].reverse(), s)))).toBe(FIRE)
    }
  })

  it('reads a square as EARTH from every corner, both directions', () => {
    for (let s = 0; s < 4; s++) {
      expect(recognise(trace(startAt(square(100), s)))).toBe(EARTH)
      expect(recognise(trace(startAt([...square(100)].reverse(), s)))).toBe(EARTH)
    }
  })

  it('reads a Z as ICE in both directions', () => {
    expect(recognise(trace(zed(110)))).toBe(ICE)
    expect(recognise(trace([...zed(110)].reverse()))).toBe(ICE)
  })

  it('reads a wavy line as WIND, left-to-right and right-to-left', () => {
    expect(recognise(trace(wave(120), 3))).toBe(WIND)
    expect(recognise(trace([...wave(120)].reverse(), 3))).toBe(WIND)
    expect(recognise(trace(wave(120, 3), 3))).toBe(WIND)
  })

  it('is size-invariant — a small rune and a big one are the same rune', () => {
    expect(recognise(trace(startAt(tri(45), 0)))).toBe(FIRE)
    expect(recognise(trace(startAt(tri(260), 0)))).toBe(FIRE)
    expect(recognise(trace(startAt(square(40), 1)))).toBe(EARTH)
  })

  it('forgives a shaky hand (GDD 3.3: rough shapes are accepted)', () => {
    expect(recognise(jitter(trace(startAt(tri(110), 1)), 6))).toBe(FIRE)
    expect(recognise(jitter(trace(startAt(square(100), 2)), 6))).toBe(EARTH)
    expect(recognise(jitter(trace(zed(110)), 5))).toBe(ICE)
  })
})

describe('recognise: what is NOT a rune', () => {
  it('rejects a straight swipe', () => {
    expect(recognise(trace([[500, 320], [780, 320]]))).toBe(-1)
    expect(recognise(trace([[520, 200], [760, 440]]))).toBe(-1)
  })

  it('rejects a circle (it scored 0.99 against the square templates before the corner test)', () => {
    const circle: Pt[] = []
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2
      circle.push([C[0] + Math.cos(a) * 100, C[1] + Math.sin(a) * 100])
    }
    expect(recognise(trace(circle, 3))).toBe(-1)
  })

  it('ignores a tap or a twitch', () => {
    expect(recognise([640, 320, 641, 321])).toBe(-1)
    expect(recognise(trace([[640, 320], [660, 330]], 4))).toBe(-1)
  })
})
