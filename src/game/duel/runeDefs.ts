/**
 * runeDefs.ts — the recognition half of the rune table (story-spec §5.2–§5.6).
 *
 * The campaign's full `RuneDef` (§4.3) carries this record plus the fields
 * the campaign owns: unlock chapter and per-draw-length combat base. This
 * recognition half lives here, on the duel side, so `runes.ts` stays a pure
 * function of a stroke and a bitmask. It never imports campaign state.
 *
 * Position IS the permanent id. Append only; never reorder or remove, because
 * saves and i18n keys hold these ids.
 *
 * ENVELOPES — [ecMin, ecMax, turnMin, turnMax]
 *   Shape matching alone is far too generous: it will call a straight swipe
 *   WIND and a circle EARTH. So the winning template must also prove the
 *   stroke HAS the right structure. `ec` is the effective corner count and
 *   `turn` the total heading swing, both after three blur passes (`feat()` in
 *   `runes.ts`).
 *   - The frozen four: p5..p95 over 300 strokes per case, both clean-large
 *     and small-sloppy, then widened (the jam build's numbers, unchanged).
 *   - The eight new runes: the S0 spike's 12-class Monte Carlo, 300 sloppy
 *     draws per rune with random rotation, aspect 0.65–1.6, size 45–260 px and
 *     0–7 px of jitter.
 *
 *   Junk sits far outside all of them. A straight line turns 1.1–2.1 (every
 *   floor is ≥ 1.85), and a rough circle has ec 17.8–24.9. WATER claims that
 *   circle band and its floor (ec ≥ 18) sits above every frozen ceiling
 *   (≤ 17). A stroke therefore cannot pass WATER and a frozen rune at once:
 *   the circle cannot steal a triangle, square, Z or wave.
 */
import {
  regularPolygon, zigzagZ, wave, circle, chevron, spiral, arc, infinity,
  hourglassBowtie, star, heart, reversePath
} from '@/game/duel/shapes'

/** Every rune id, 0..11, in table order. */
export type RuneId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11

export interface RuneRecognition {
  id: RuneId
  /** Stable slug: save data and i18n keys (`rune.<slug>`). */
  slug: string
  /**
   * `ring` = a closed loop. It is templated at 8 start points × both
   * directions, because a player starts a triangle at any corner, or
   * mid-edge. `open` = a stroke with real ends, templated once per variant
   * per direction.
   */
  family: 'ring' | 'open'
  /**
   * Template generators. Each is called with `dir` = 1 and -1 and returns
   * that direction's unit-space path. More than one variant covers a spread
   * players actually draw: WIND's hump count, LIGHTNING's turn count.
   */
  variants: readonly ((dir: 1 | -1) => number[])[]
  env: readonly [ecMin: number, ecMax: number, turnMin: number, turnMax: number]
  /** Optional: |winding| (signed turn in revolutions) must lie in [min, max]. */
  windGate?: readonly [min: number, max: number]
  /** Optional: the stroke must cross itself exactly this many times. */
  crossingGate?: number
}

/** A closed shape's single variant, in either direction. */
const loop = (make: () => number[]) => (dir: 1 | -1): number[] => (dir > 0 ? make() : reversePath(make()))

export const RUNE_DEFS: readonly RuneRecognition[] = [
  // ── the four shipped runes (frozen: changing these fails rune-corpus.test.ts)
  { id: 0, slug: 'fire', family: 'ring', variants: [loop(() => regularPolygon(3))], env: [2, 9, 3.4, 9] },
  // WIND is the loosest because a shallow two-hump wave is genuinely close to
  // a line: it swings only 3.1 where a line swings 2.1, so the floor sits in
  // that narrow gap. The ceiling still keeps rough circles (17.8+) out.
  {
    id: 1,
    slug: 'wind',
    family: 'open',
    variants: [(d) => wave(2, d), (d) => wave(3, d), (d) => wave(4, d)],
    env: [3.5, 17, 2.7, 12]
  },
  { id: 2, slug: 'ice', family: 'open', variants: [(d) => zigzagZ(d)], env: [1.5, 6.5, 4, 8.8] },
  { id: 3, slug: 'earth', family: 'ring', variants: [loop(() => regularPolygon(4))], env: [4, 12.5, 3.6, 8] },

  // ── the story runes, one per chapter (ids never renumber)
  // ch 1 · NATURE · leaf V. Fenced between the straight-line floor and FIRE's
  // corner count.
  { id: 4, slug: 'nature', family: 'open', variants: [loop(() => chevron())], env: [1.1, 2.8, 1.85, 3.9] },
  // ch 2 · WATER · bubble ○. The winding gate keeps an over-rotated circle
  // (up to ~1.3 revolutions) from reading as a spiral.
  {
    id: 5,
    slug: 'water',
    family: 'ring',
    variants: [loop(circle)],
    env: [18, 30, 4.2, 8.0],
    windGate: [0, 1.3]
  },
  // ch 3 · LIGHTNING · spiral. One turn count measured only 65 % recall; the
  // spike's three (1.5 / 1.75 / 2.0) sat right on the 95 % line. Tight
  // spirals drawn small and shaky were failing. 2.05 in place of 2.0 lifts
  // recall to ~98 % while a round-and-round scribble stays ≤ 1 % false-accept.
  // A roomier-centred spiral reached 99.5 %, but it read the SCRIBBLE as
  // lightning 75–100 % of the time. Measured in tools/rune-spike (S0).
  {
    id: 6,
    slug: 'lightning',
    family: 'open',
    variants: [
      loop(() => spiral(1.5)),
      loop(() => spiral(1.75)),
      loop(() => spiral(1.9)),
      loop(() => spiral(2.05))
    ],
    env: [9, 30, 6.0, 16],
    windGate: [1.3, Infinity]
  },
  // ch 5 · ILLUSION · mirror ∞. The only rune that crosses itself.
  {
    id: 7,
    slug: 'illusion',
    family: 'ring',
    variants: [loop(infinity)],
    env: [10, 18.5, 7.0, 10.2],
    crossingGate: 1
  },
  // ch 6 · RAINBOW · arch ∩. The ONLY arc rune: ∩, C and U are one gesture
  // under rotation.
  { id: 8, slug: 'rainbow', family: 'open', variants: [loop(() => arc(180, 360))], env: [6, 30, 2.4, 5.2] },
  // ch 7 · TIME · hourglass (true bowtie outline). The fragile one: see
  // story-spec §5.11.5 for its fallback.
  { id: 9, slug: 'time', family: 'ring', variants: [loop(hourglassBowtie)], env: [5.5, 9.0, 8.5, 11.5] },
  // ch 9 · MOON · five-point star. Separated from EARTH by turn, not shape score.
  { id: 10, slug: 'moon', family: 'ring', variants: [loop(() => star(5, 0.42))], env: [5, 10, 9.5, 13] },
  // ch 10 · LOVE · sharp-cusp heart. ecMin 4, not the spike's 5: every miss
  // in the S0 re-measure sat at ec 4.1–5.0 (the §5.11.4 one-unit widening).
  { id: 11, slug: 'love', family: 'ring', variants: [loop(heart)], env: [4, 12.5, 9, 14.5] }
]

/** Bits 0–3: the four shipped runes, always known. The default active set. */
export const FROZEN_MASK = 0b1111
/** Every rune in the table. */
export const ALL_RUNES_MASK = (1 << RUNE_DEFS.length) - 1
