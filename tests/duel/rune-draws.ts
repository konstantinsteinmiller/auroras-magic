/**
 * Sloppy rune draws for the S0 measurement (story-spec §5.8, §5.11).
 *
 * One noise model, shared by `tools/rune-spike/measure.mjs` (the printed
 * confusion report) and `tests/duel/rune-alphabet.test.ts` (the gate that
 * runs with the normal suite). The model: random rotation 0–360°, aspect
 * 0.65–1.6, size 45–260 px, 0–7 px of jitter, densified like pointer events.
 * Deterministic for a given seed, so a test result is a fact, not a coin flip.
 */
import * as S from '@/game/duel/shapes'

const { PI, cos, sin } = Math
const TAU = PI * 2

export type Rnd = () => number
/** The project's Park–Miller stream (same as `util.seeded`), as a factory. */
export const stream = (seed: number): Rnd => {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}
const range = (rnd: Rnd, a: number, b: number): number => a + rnd() * (b - a)

/** Unit-space path → a stage-space stroke, densified like pointer events. */
export const realize = (
  unit: readonly number[],
  { rotDeg = 0, sx = 150, sy = 150, jitterAmp = 0 }: { rotDeg?: number; sx?: number; sy?: number; jitterAmp?: number },
  rnd: Rnd
): number[] => {
  const a = (rotDeg * PI) / 180
  const pts: number[] = []
  for (let i = 0; i < unit.length; i += 2) {
    const x = unit[i]!
    const y = unit[i + 1]!
    pts.push(640 + (x * cos(a) - y * sin(a)) * sx, 320 + (x * sin(a) + y * cos(a)) * sy)
  }
  const out: number[] = []
  for (let i = 2; i < pts.length; i += 2) {
    const x0 = pts[i - 2]!, y0 = pts[i - 1]!, x1 = pts[i]!, y1 = pts[i + 1]!
    for (let k = 0; k < 8; k++) out.push(x0 + ((x1 - x0) * k) / 8, y0 + ((y1 - y0) * k) / 8)
  }
  out.push(pts[pts.length - 2]!, pts[pts.length - 1]!)
  if (jitterAmp > 0) for (let i = 0; i < out.length; i++) out[i]! += (rnd() - 0.5) * 2 * jitterAmp
  return out
}

/** A circle drawn for `revs` revolutions. Players under- and over-shoot. */
const circleRevs = (revs: number): number[] => {
  const p: number[] = []
  for (let k = 0; k <= 128; k++) {
    const t = (k / 128) * TAU * revs
    p.push(cos(t), sin(t))
  }
  return p
}

/** What a player draws for each rune, keyed by slug, with the spread each one is measured over. */
export const DRAWN: Record<string, (rnd: Rnd) => number[]> = {
  fire: () => S.regularPolygon(3),
  wind: () => S.wave(2, 1),
  ice: () => S.zigzagZ(1),
  earth: () => S.regularPolygon(4),
  nature: () => S.chevron(),
  water: (rnd) => circleRevs(range(rnd, 0.8, 1.3)),
  lightning: (rnd) => S.spiral(range(rnd, 1.49, 2.01)),
  illusion: () => S.infinity(),
  rainbow: () => S.arc(180, 360),
  time: () => S.hourglassBowtie(),
  moon: () => S.star(5, 0.42),
  love: () => S.heart()
}

/** One sloppy draw of the rune `slug`. */
export const sloppy = (slug: string, rnd: Rnd): number[] => {
  const unit = DRAWN[slug]!(rnd)
  const rotDeg = range(rnd, 0, 360)
  const size = range(rnd, 45, 260)
  const aspect = range(rnd, 0.65, 1.6)
  return realize(unit, { rotDeg, sx: size, sy: size * aspect, jitterAmp: range(rnd, 0, 7) }, rnd)
}

/** Things a player does that are not runes. */
export const JUNK: Record<string, () => number[]> = {
  'straight swipe': () => Array.from({ length: 21 }, (_, i) => [640 + (i / 20) * 280, 320]).flat(),
  'diagonal swipe': () => Array.from({ length: 21 }, (_, i) => [520 + (i / 20) * 240, 200 + (i / 20) * 240]).flat(),
  'two-loop scribble': () =>
    Array.from({ length: 97 }, (_, k) => {
      const t = (k / 96) * TAU * 2
      return [640 + cos(t) * 90 + sin(t * 3) * 20, 320 + sin(t) * 90 + cos(t * 2) * 15]
    }).flat(),
  'tap / twitch': () => [640, 320, 642, 321]
}

/** One jittered junk stroke. */
export const junkDraw = (name: string, rnd: Rnd): number[] => {
  const jit = range(rnd, 0, 7)
  return JUNK[name]!().map((v) => v + (rnd() - 0.5) * 2 * jit)
}
