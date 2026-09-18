/**
 * shapes.ts — the parametric geometry of every rune (story-spec §5.4, §5.14.1).
 *
 * ONE generator per rune family. The recogniser builds its templates from
 * these (`runes.ts` via `runeDefs.ts`), and the clean glyphs can draw the new
 * runes from the same functions, so a template and its picture cannot drift
 * apart.
 *
 * Every export is a pure function returning a flat unit-space
 * [x, y, x, y, …] polyline, roughly inside [-1, 1]². The recogniser scales
 * each one into its own unit box anyway (`vectorise`), so only the SHAPE
 * matters, not the size.
 *
 * `regularPolygon`, `zigzagZ` and `wave` are the jam build's `poly`, `zed`
 * and `wave`, moved here byte-for-byte. The four shipped runes depend on
 * them, and `tests/duel/rune-corpus.test.ts` fails if their output moves.
 * The eight new generators are the exact geometry that was measured in the S0
 * spike (`tools/rune-spike/`); change one only together with a re-measure.
 */
import { sin, cos, PI, TAU } from '@/game/duel/util'

/** Reversing the sample list covers the opposite drawing direction. */
export const reversePath = (p: readonly number[]): number[] => {
  const q: number[] = []
  for (let i = p.length - 2; i >= 0; i -= 2) q.push(p[i]!, p[i + 1]!)
  return q
}

/* ────────────────────────── the frozen four ────────────────────────── */

/**
 * A closed polygon whose corners lie on the unit circle (FIRE 3, EARTH 4).
 * No rotation argument: the matcher finds the optimal rotation itself.
 * `e < corners` closes the shape exactly once. Walking one edge further
 * retraces an edge and skews the normalised vector badly enough that
 * triangles scored higher against the square template than their own.
 */
export const regularPolygon = (corners: number): number[] => {
  const p: number[] = []
  const per = 96 / corners // points per edge, plenty before resampling
  for (let e = 0; e < corners; e++) {
    const a0 = e * (TAU / corners)
    const a1 = (e + 1) * (TAU / corners)
    for (let k = 0; k < per; k++) {
      const t = k / per
      p.push(cos(a0) + (cos(a1) - cos(a0)) * t, sin(a0) + (sin(a1) - sin(a0)) * t)
    }
  }
  return p
}

/**
 * A Z, the ICE primitive: across, back down the diagonal, across again. Two
 * hard corners, one stroke, no crossings. (A five-point star was miserable to
 * draw with a mouse, so the jam build made ICE a Z.)
 */
export const zigzagZ = (dir: number): number[] => {
  const V: [number, number][] = [
    [-1, -0.8],
    [1, -0.8],
    [-1, 0.8],
    [1, 0.8]
  ]
  if (dir < 0) V.reverse()
  const p: number[] = []
  for (let e = 0; e < 3; e++) {
    const [x0, y0] = V[e]!
    const [x1, y1] = V[e + 1]!
    // resample() walks by arc length, so a flat count per edge is fine.
    for (let k = 0; k < 40; k++) {
      const t = k / 40
      p.push(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)
    }
  }
  p.push(V[3]![0], V[3]![1])
  return p
}

/** A horizontal wavy line, the WIND primitive. */
export const wave = (humps: number, dir: number): number[] => {
  const p: number[] = []
  for (let i = 0; i <= 120; i++) {
    const t = i / 120
    const x = dir > 0 ? t * 2 - 1 : 1 - t * 2
    p.push(x, sin(t * PI * humps) * 0.55)
  }
  return p
}

/* ────────────────────────── the eight new runes ──────────────────────── */

/** WATER: a circle. A 64-gon is indistinguishable from a true circle at the
 *  recogniser's 32-point resample. */
export const circle = (): number[] => regularPolygon(64)

/**
 * NATURE: a leaf chevron, V. Two straight segments meeting at one apex.
 * Rotation invariance makes V, <, ∧ and > the same gesture, so a single
 * orientation is enough; `rotDeg` exists only for drawing it upright.
 */
export const chevron = (rotDeg = 0): number[] => {
  const a = (rotDeg * PI) / 180
  const raw: [number, number][] = [[-1, -1], [0, 1], [1, -1]]
  const rot = raw.map(([x, y]): [number, number] => [x * cos(a) - y * sin(a), x * sin(a) + y * cos(a)])
  const p: number[] = []
  for (let e = 0; e < 2; e++) {
    const [x0, y0] = rot[e]!
    const [x1, y1] = rot[e + 1]!
    for (let k = 0; k <= 40; k++) {
      const t = k / 40
      p.push(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)
    }
  }
  return p
}

/** LIGHTNING: an inward spiral of `turns` revolutions, radius 1 → 1 − `shrink`. */
export const spiral = (turns: number, shrink = 0.85): number[] => {
  const p: number[] = []
  const steps = 128
  for (let k = 0; k <= steps; k++) {
    const t = k / steps
    const a = t * TAU * turns
    const r = 1 - t * shrink
    p.push(cos(a) * r, sin(a) * r)
  }
  return p
}

/** RAINBOW: a circular arc from `startDeg` to `endDeg` (the rune uses the
 *  upper half, 180° → 360°, an arch opening downward). */
export const arc = (startDeg: number, endDeg: number): number[] => {
  const a0 = (startDeg * PI) / 180
  const a1 = (endDeg * PI) / 180
  const p: number[] = []
  const steps = 96
  for (let k = 0; k <= steps; k++) {
    const a = a0 + (a1 - a0) * (k / steps)
    p.push(cos(a), sin(a))
  }
  return p
}

/** ILLUSION: a figure-eight (Gerono lemniscate). It crosses itself exactly
 *  once, at the origin, which is what the crossing gate checks. */
export const infinity = (): number[] => {
  const p: number[] = []
  const steps = 128
  for (let k = 0; k <= steps; k++) {
    const t = (k / steps) * TAU
    p.push(cos(t), sin(t) * cos(t))
  }
  return p
}

/**
 * TIME: the hourglass as its TRUE outline, two triangles sharing the centre
 * pinch point and traced without lifting the pen. The "naive" X-style
 * hourglass (TL→BR→TR→BL) reads as FIRE 99.7 % of the time and is never
 * built.
 */
export const hourglassBowtie = (): number[] => {
  const V: [number, number][] = [[-1, -1], [0, 0], [1, -1], [1, 1], [0, 0], [-1, 1], [-1, -1]]
  const p: number[] = []
  for (let e = 0; e < V.length - 1; e++) {
    const [x0, y0] = V[e]!
    const [x1, y1] = V[e + 1]!
    for (let k = 0; k <= 20; k++) {
      const t = k / 20
      p.push(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)
    }
  }
  return p
}

/** MOON: a star with `points` tips, alternating radius 1 / `innerRatio`,
 *  joined by straight edges (the rune is `star(5, 0.42)`). */
export const star = (points: number, innerRatio: number): number[] => {
  const n = points * 2
  const V: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const r = i % 2 === 0 ? 1 : innerRatio
    const a = i * (TAU / n) - PI / 2
    V.push([cos(a) * r, sin(a) * r])
  }
  const p: number[] = []
  for (let i = 0; i < n; i++) {
    const [x0, y0] = V[i]!
    const [x1, y1] = V[(i + 1) % n]!
    for (let k = 0; k < 16; k++) {
      const t = k / 16
      p.push(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)
    }
  }
  return p
}

/**
 * LOVE: the sharp-cusp heart ("H1", story-spec §5.9). Two circular lobes whose
 * lower tangent points run in straight lines down to one sharp point. The
 * cusp between the lobes is a real notch, not a smooth curve. A smooth heart
 * reads as WIND 74 % of the time; an all-straight "spade" heart reads as
 * FIRE. This one measured 95.3 % correct with no leakage.
 */
export const heart = (): number[] => {
  const p: number[] = []
  const lobeR = 0.5
  const lobeCx = 0.5
  const lobeCy = -0.35
  const steps = 40
  // right lobe: half circle from the top-centre notch round to its tangent
  for (let k = 0; k <= steps; k++) {
    const a = PI * 0.5 + (k / steps) * PI
    p.push(lobeCx + cos(a) * lobeR, lobeCy + sin(a) * lobeR)
  }
  // straight line from the right lobe's bottom tangent down to the point
  const rightTangent: [number, number] = [lobeCx + cos(PI * 1.5) * lobeR, lobeCy + sin(PI * 1.5) * lobeR]
  const bottom: [number, number] = [0, 1]
  const steps2 = 24
  for (let k = 1; k <= steps2; k++) {
    const t = k / steps2
    p.push(rightTangent[0] + (bottom[0] - rightTangent[0]) * t, rightTangent[1] + (bottom[1] - rightTangent[1]) * t)
  }
  // and mirrored back up the left side
  for (let k = 1; k <= steps2; k++) {
    const t = k / steps2
    p.push(bottom[0] + (-rightTangent[0] - bottom[0]) * t, bottom[1] + (rightTangent[1] - bottom[1]) * t)
  }
  for (let k = 0; k <= steps; k++) {
    const a = PI * 1.5 + (k / steps) * PI
    p.push(-lobeCx + cos(a) * lobeR, lobeCy + sin(a) * lobeR)
  }
  return p
}
