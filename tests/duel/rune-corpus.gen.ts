/**
 * The frozen rune corpus: 525 fixed strokes that pin what the recogniser does
 * with the four shipped runes (story-spec §5.10).
 *
 * WHY IT EXISTS
 *   The four shipped runes (FIRE △, WIND ~, ICE Z, EARTH □) are signed off.
 *   The story extension adds eight more runes to the same recogniser, and
 *   every one of them is a chance to move a boundary the four depend on. The
 *   hand-picked cases in `runes.test.ts` check that the obvious strokes still
 *   work; this corpus checks the whole neighbourhood around them. That covers
 *   small and large strokes, squashed ones, rotated ones, shaky ones, strokes
 *   drawn backwards or started mid-edge, plus junk that must stay junk.
 *   Classifying all of it and freezing the answers turns "the four did not
 *   change" into a fixture diff a reviewer can see.
 *
 * DETERMINISM
 *   Everything comes from one `seeded(7)` stream, consumed in a fixed order.
 *   The same code on any machine produces the same 525 strokes, bit for bit.
 *   If you change anything here, regenerate the fixture in the same commit
 *   (see `rune-corpus.test.ts`) and say why in the message.
 *
 * The shapes are drawn as a PLAYER would draw them: a few corners joined by
 * straight pointer moves, densified the way pointer events arrive. They are
 * deliberately NOT the recogniser's own templates; the corpus would be
 * circular if it were.
 */
import { seeded } from '@/game/duel/util'

export type CorpusBucket = 'fire' | 'wind' | 'ice' | 'earth' | 'junk'
export interface CorpusStroke {
  bucket: CorpusBucket
  /** Flat [x, y, x, y, …] in stage coordinates, as `sim.ts` would collect it. */
  stroke: number[]
}

type Pt = [number, number]
const TAU = Math.PI * 2
const CX = 640
const CY = 320

/** Densify a polyline the way a pointer reports it (same as `runes.test.ts`). */
const trace = (pts: readonly Pt[], per = 10): number[] => {
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

/** Corners of a regular polygon on the unit circle, first corner at the top. */
const polygon = (n: number): Pt[] => {
  const out: Pt[] = []
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i / n) * TAU
    out.push([Math.cos(a), Math.sin(a)])
  }
  return out
}

/** Close a ring of corners, starting at corner `s`, optionally reversed. */
const ring = (corners: readonly Pt[], s: number, reverse: boolean): Pt[] => {
  const c = reverse ? [...corners].reverse() : [...corners]
  const r = [...c.slice(s % c.length), ...c.slice(0, s % c.length)]
  return [...r, r[0]!]
}

const ZED: Pt[] = [[-1, -0.8], [1, -0.8], [-1, 0.8], [1, 0.8]]

const waveLine = (humps: number): Pt[] => {
  const p: Pt[] = []
  for (let i = 0; i <= 40; i++) {
    const t = i / 40
    p.push([-1 + 2 * t, Math.sin(t * Math.PI * humps) * 0.45])
  }
  return p
}

/* The sweep: 5 sizes × 5 rotations × 5 jitter amplitudes = 125 per rune.
   Aspect, direction and start corner rotate with the index, so every one of
   the 125 strokes of a rune differs in several ways at once. */
const SIZES = [45, 80, 130, 190, 260] as const
const ROTATIONS = [0, 37, 111, 203, 290] as const
const JITTERS = [0, 1.5, 3, 5, 7] as const
const ASPECTS = [1, 0.7, 1.35, 0.85, 1.6] as const

/** Build the whole corpus. Pure and deterministic: call it as often as needed. */
export const buildRuneCorpus = (): CorpusStroke[] => {
  const rnd = seeded(7)
  const out: CorpusStroke[] = []

  /** Place unit-space points on the stage, then shake them. */
  const place = (unit: readonly Pt[], size: number, aspect: number, rotDeg: number, amp: number): number[] => {
    const a = (rotDeg * Math.PI) / 180
    const ca = Math.cos(a)
    const sa = Math.sin(a)
    const pts: Pt[] = unit.map(([x, y]) => {
      const sx = x * size
      const sy = y * size * aspect
      return [CX + sx * ca - sy * sa, CY + sx * sa + sy * ca]
    })
    const dense = trace(pts)
    return dense.map((v) => v + (rnd() - 0.5) * 2 * amp)
  }

  const shapeFor = (bucket: Exclude<CorpusBucket, 'junk'>, i: number): Pt[] => {
    const reverse = i % 2 === 1
    switch (bucket) {
      case 'fire':
        return ring(polygon(3), i % 3, reverse)
      case 'earth':
        return ring(polygon(4), i % 4, reverse)
      case 'ice':
        return reverse ? [...ZED].reverse() : ZED
      case 'wind': {
        const w = waveLine(2 + (i % 3))
        return reverse ? w.reverse() : w
      }
    }
  }

  for (const bucket of ['fire', 'wind', 'ice', 'earth'] as const) {
    let i = 0
    for (const size of SIZES) {
      for (const rot of ROTATIONS) {
        for (const amp of JITTERS) {
          out.push({ bucket, stroke: place(shapeFor(bucket, i), size, ASPECTS[i % 5]!, rot, amp) })
          i++
        }
      }
    }
  }

  // 25 junk strokes: things a player does that are not runes.
  const junk = (unit: readonly Pt[], size: number, aspect: number, rot: number, amp: number): void => {
    out.push({ bucket: 'junk', stroke: place(unit, size, aspect, rot, amp) })
  }
  // 8 swipes at assorted lengths and angles.
  for (let k = 0; k < 8; k++) junk([[-1, 0], [1, 0]], 60 + k * 25, 1, k * 23, k % 4)
  // 6 circles: 3 radii × 2 directions. Rejected by design while only the four
  // shipped runes are active.
  for (const r of [50, 110, 200]) {
    const c: Pt[] = []
    for (let k = 0; k <= 48; k++) {
      const a = (k / 48) * TAU
      c.push([Math.cos(a), Math.sin(a)])
    }
    junk(c, r, 1, 0, 1.5)
    junk([...c].reverse(), r, 0.9, 40, 1.5)
  }
  // 4 taps and twitches.
  out.push({ bucket: 'junk', stroke: [640, 320, 641, 321] })
  out.push({ bucket: 'junk', stroke: [640, 320, 643, 318, 645, 322] })
  junk([[-1, 0], [1, 0.2]], 12, 1, 0, 0.5)
  junk([[0, 0], [1, 1], [0, 1]], 14, 1, 0, 0.5)
  // 7 scribbles: loops, zig-zag scrawls and a random walk.
  for (let k = 0; k < 4; k++) {
    const s: Pt[] = []
    const loops = 2 + k
    for (let j = 0; j <= 96; j++) {
      const t = (j / 96) * TAU * loops
      s.push([Math.cos(t) + Math.sin(t * 3) * 0.2, Math.sin(t) + Math.cos(t * 2) * 0.15])
    }
    junk(s, 70 + k * 30, 1, k * 50, 2)
  }
  for (let k = 0; k < 3; k++) {
    const w: Pt[] = [[0, 0]]
    for (let j = 0; j < 14; j++) {
      const [x, y] = w[w.length - 1]!
      w.push([x + (rnd() - 0.5) * 0.9, y + (rnd() - 0.5) * 0.9])
    }
    junk(w, 90 + k * 40, 1, 0, 1)
  }
  return out
}
