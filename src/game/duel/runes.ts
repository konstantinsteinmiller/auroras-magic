/**
 * Rune recognition — a compact $1 Unistroke Recognizer with the Protractor
 * (optimal cosine distance) extension, as recommended by GDD 3.3.
 *
 * Ported unchanged from the jam build, then made data-driven over
 * `RUNE_DEFS` (story-spec §5) so the story runes can join without touching
 * the four shipped ones. `tests/duel/rune-corpus.test.ts` pins the four
 * stroke by stroke.
 *
 * The classic $1 is rotation-invariant but NOT invariant to where you started
 * drawing a closed shape: a triangle begun at a different corner is a cyclic
 * shift of the point sequence, which $1 scores as a different gesture. Rather
 * than special-case that, every start point and both directions are generated
 * as separate templates at load. A few dozen templates cost nothing and make
 * the recogniser dramatically more forgiving, which GDD 3.3 and 6 both insist
 * on.
 *
 * WHICH RUNES ARE LIVE
 *   `recognise(raw, activeMask)` only considers runes whose bit is set. The
 *   default is `FROZEN_MASK`: the four shipped runes, exactly as before. The
 *   campaign passes `S.campaign.runesUnlocked`. This module never reads
 *   campaign state itself; it stays a pure function of a stroke and a number.
 *   A rune the player has not earned is not a smaller target, it is no target.
 *   That keeps the active alphabet small and accurate for young hands.
 */
import { RUNE_DEFS, FROZEN_MASK, ALL_RUNES_MASK, type RuneId, type RuneRecognition } from '@/game/duel/runeDefs'
import { hypot, atan2, min, max, sqrt, sin, cos, TAU } from '@/game/duel/util'

export { FROZEN_MASK, ALL_RUNES_MASK } from '@/game/duel/runeDefs'
export type { RuneId } from '@/game/duel/runeDefs'

/** Points per normalised stroke. 32 is plenty for these primitives. */
const N = 32

/* ------------------------- stroke normalisation ------------------------ */

const pathLen = (p: readonly number[]): number => {
  let d = 0
  for (let i = 2; i < p.length; i += 2) d += hypot(p[i]! - p[i - 2]!, p[i + 1]! - p[i - 1]!)
  return d
}

/** Resample to exactly N evenly spaced points. MUTATES `p` (splices in the
 *  emitted points) — callers pass a copy. */
const resample = (p: number[]): number[] => {
  const I = pathLen(p) / (N - 1)
  const out = [p[0]!, p[1]!]
  let D = 0
  let px = p[0]!
  let py = p[1]!
  for (let i = 2; i < p.length; i += 2) {
    const x = p[i]!
    const y = p[i + 1]!
    const d = hypot(x - px, y - py)
    if (D + d >= I && d > 0) {
      // Walk along this segment, emitting points until it is used up.
      const t = (I - D) / d
      const cx = px + t * (x - px)
      const cy = py + t * (y - py)
      out.push(cx, cy)
      // Re-enter the loop with the segment shortened.
      p.splice(i, 0, cx, cy)
      D = 0
      px = cx
      py = cy
      continue
    }
    D += d
    px = x
    py = y
  }
  while (out.length < N * 2) out.push(p[p.length - 2]!, p[p.length - 1]!)
  out.length = N * 2
  return out
}

/**
 * Scale into a unit square (non-uniform, as in $1 — it is more forgiving of
 * squashed drawings), translate the centroid to the origin, then vectorise
 * and normalise for Protractor's cosine distance.
 */
const vectorise = (p: readonly number[]): Float32Array => {
  let x0 = 1e9
  let y0 = 1e9
  let x1 = -1e9
  let y1 = -1e9
  for (let i = 0; i < p.length; i += 2) {
    x0 = min(x0, p[i]!)
    x1 = max(x1, p[i]!)
    y0 = min(y0, p[i + 1]!)
    y1 = max(y1, p[i + 1]!)
  }
  const w = x1 - x0 || 1
  const h = y1 - y0 || 1
  const v = new Float32Array(N * 2)
  let cx = 0
  let cy = 0
  for (let i = 0; i < N * 2; i += 2) {
    const x = ((p[i]! - x0) / w) * 2 - 1
    const y = ((p[i + 1]! - y0) / h) * 2 - 1
    v[i] = x
    v[i + 1] = y
    cx += x
    cy += y
  }
  cx /= N
  cy /= N
  let sum = 0
  for (let i = 0; i < N * 2; i += 2) {
    v[i]! -= cx
    v[i + 1]! -= cy
    sum += v[i]! * v[i]! + v[i + 1]! * v[i + 1]!
  }
  const m = sqrt(sum) || 1
  for (let i = 0; i < N * 2; i++) v[i]! /= m
  return v
}

/**
 * The stroke's structure: [ec, turn, winding].
 *
 * `ec` (effective corner count) measures how CONCENTRATED the turning is.
 * Protractor compares point positions, which cannot tell a corner from a
 * curve: a circle scored 0.992 against the square templates, higher than a
 * real square. With `t` = per-point turning angle,
 *   ec = (sum t^2)^2 / sum t^4
 * is ~k for k sharp corners and ~N for evenly spread curvature. It needs no
 * rotation or start-point alignment, so it costs one pass and nothing else.
 *
 * `turn` is the total heading swing. `winding` is the same sum WITHOUT the
 * absolute value, in revolutions. It stays near ±turn/TAU for a shape that
 * always curves one way (circle, spiral), and cancels toward 0 for one whose
 * curvature alternates (wave, Z). It is what separates a slightly over-drawn
 * circle from a spiral.
 */
const feat = (raw: readonly number[]): [number, number, number] => {
  // THREE 1-2-1 blur passes. One is not enough: hand jitter fakes corners and
  // inflates both features, and it inflates them MORE on a small stroke (the
  // jitter is the same size while the shape is not). Three passes flatten
  // jitter but leave real corners standing, which is what opens the gap that
  // lets the envelopes be generous to players and still ruthless with junk.
  const p = raw.slice()
  for (let k = 0; k < 3; k++) {
    const q = p.slice()
    for (let i = 1; i < N - 1; i++) {
      const j = i * 2
      p[j] = (q[j - 2]! + 2 * q[j]! + q[j + 2]!) / 4
      p[j + 1] = (q[j - 1]! + 2 * q[j + 1]! + q[j + 3]!) / 4
    }
  }
  let s2 = 0
  let s4 = 0
  let tot = 0
  let signed = 0
  for (let i = 1; i < N - 1; i++) {
    const j = i * 2
    const ax = p[j]! - p[j - 2]!
    const ay = p[j + 1]! - p[j - 1]!
    const bx = p[j + 2]! - p[j]!
    const by = p[j + 3]! - p[j + 1]!
    const a = atan2(ax * by - ay * bx, ax * bx + ay * by)
    const q = a * a
    s2 += q
    s4 += q * q
    tot += a < 0 ? -a : a // total heading swing
    signed += a
  }
  return [s4 > 0 ? (s2 * s2) / s4 : N, tot, signed / TAU]
}

/**
 * How many times the resampled stroke crosses itself, treated as a closed
 * loop. Only ILLUSION (∞) asks: it crosses exactly once, and none of the other
 * runes ever does, so this gate only ever removes a false accept.
 */
const SEAM = 3
const crossingCount = (rs: readonly number[]): number => {
  const n = rs.length / 2
  const d = (px: number, py: number, qx: number, qy: number, rx: number, ry: number): number =>
    (qx - px) * (ry - py) - (qy - py) * (rx - px)
  let c = 0
  // Segments of the stroke AS DRAWN (open): i → i+1 for i < n-1.
  for (let i = 0; i < n - 1; i++) {
    const i2 = i + 1
    for (let j = i + 2; j < n - 1; j++) {
      const j2 = j + 1
      if (i < SEAM && j >= n - 1 - SEAM) continue // the start/end overlap of a closed loop
      const ax = rs[i * 2]!, ay = rs[i * 2 + 1]!, bx = rs[i2 * 2]!, by = rs[i2 * 2 + 1]!
      const cx = rs[j * 2]!, cy = rs[j * 2 + 1]!, ex = rs[j2 * 2]!, ey = rs[j2 * 2 + 1]!
      const d1 = d(ax, ay, bx, by, cx, cy)
      const d2 = d(ax, ay, bx, by, ex, ey)
      const d3 = d(cx, cy, ex, ey, ax, ay)
      const d4 = d(cx, cy, ex, ey, bx, by)
      if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) c++
    }
  }
  return c
}

/** Protractor: optimal angular distance between two unit vectors. */
const score = (a: Float32Array, b: Float32Array): number => {
  let ab = 0
  let cross = 0
  for (let i = 0; i < N * 2; i += 2) {
    ab += a[i]! * b[i]! + a[i + 1]! * b[i + 1]!
    cross += a[i]! * b[i + 1]! - a[i + 1]! * b[i]!
  }
  const angle = atan2(cross, ab)
  return ab * cos(angle) + cross * sin(angle) // 1 = identical
}

/* ---------------------------- the templates ---------------------------- */

/** Templates per rune, indexed by id. Built once at load. */
const BANK: Float32Array[][] = RUNE_DEFS.map(() => [])

/**
 * Add a CLOSED shape as templates evenly spaced around its outline. Players
 * start mid-edge as often as on a corner, and an uncovered start point is
 * exactly when a rough triangle matched a square template better than any
 * triangle template. Shifting the already-resampled ring is far cheaper than
 * re-sampling the polygon k times.
 */
const addRing = (bank: Float32Array[], pts: number[]): void => {
  const b = resample(pts)
  for (let s = 0; s < N; s += 4) {
    const q: number[] = []
    for (let i = 0; i < N; i++) {
      const j = ((i + s) % N) * 2
      q.push(b[j]!, b[j + 1]!)
    }
    bank.push(vectorise(q))
  }
}

/** Build every start point × direction so the stroke order never matters. */
const build = (): void => {
  for (const d of [-1, 1] as const) {
    for (const def of RUNE_DEFS) {
      const bank = BANK[def.id]!
      for (const make of def.variants) {
        if (def.family === 'ring') addRing(bank, make(d))
        else bank.push(vectorise(resample(make(d))))
      }
    }
  }
}
build()

/** Below this the shape is rejected and the player gets the "bad" nudge. */
const THRESH = 0.78

const active = (mask: number): RuneRecognition[] => RUNE_DEFS.filter((r) => (mask >> r.id) & 1)

const bestScore = (v: Float32Array, id: number): number => {
  let best = -1
  for (const tv of BANK[id]!) {
    const s = score(v, tv)
    if (s > best) best = s
  }
  return best
}

/**
 * Classify a raw stroke (flat [x,y,...] in stage coords) among the runes whose
 * bit is set in `activeMask` (default: the four shipped runes).
 * Returns the rune id, or -1 if nothing matched well enough.
 */
export const recognise = (raw: readonly number[], activeMask: number = FROZEN_MASK): RuneId | -1 => {
  if (raw.length < 12) return -1
  const p = raw.slice()
  if (pathLen(p) < 60) return -1 // a tap or a twitch, not a gesture
  const rs = resample(p)
  const v = vectorise(rs)
  const live = active(activeMask)
  const bs: number[] = []
  for (const def of live) bs[def.id] = bestScore(v, def.id)
  const [ec, turn, wind] = feat(rs)
  const crossings = live.some((d) => d.crossingGate !== undefined) ? crossingCount(rs) : 0
  /*
   * Take the best-scoring rune that ALSO passes its structure test, instead of
   * testing only the single top template. Shape matching alone confuses a
   * rough triangle with a quad — they are both one closed loop. The envelope
   * acts as a tie-break, so the stroke's own corner count decides, and a
   * triangle that genuinely turns three times lands as FIRE even when a square
   * template scored higher. Runes are checked in id order, so the four
   * shipped runes are always weighed first, exactly as before.
   */
  let bestR: RuneId | -1 = -1
  let bestS = THRESH
  const aw = wind < 0 ? -wind : wind
  for (const def of live) {
    const e = def.env
    if (!(bs[def.id]! > bestS && ec >= e[0] && ec <= e[1] && turn >= e[2] && turn <= e[3])) continue
    if (def.windGate && (aw < def.windGate[0] || aw > def.windGate[1])) continue
    if (def.crossingGate !== undefined && crossings !== def.crossingGate) continue
    bestS = bs[def.id]!
    bestR = def.id
  }
  return bestR
}

/**
 * A stroke her runes refused — was it a rune she has NOT earned yet? Returns
 * that rune's id, or -1. (The playtest: a child drew a circle, a shape the
 * game really has, and was told "no rune" with nothing to go on.)
 *
 * The SAME bar an owned rune has to clear, never a lower one:
 *   1. `recognise` over the locked runes — the 0.78 threshold, every
 *      structure envelope, winding and crossing gate, unchanged;
 *   2. and the locked rune's best template must out-score every rune she
 *      owns. A sloppy square that failed Earth's corner count is still
 *      closer to Earth than to anything locked, and must not be told "Water
 *      is coming soon" — it is the near-miss nudge's case, not this one.
 * So a stroke is only ever named as a locked rune when the recogniser, had
 * that rune been unlocked, would have stored it.
 */
export const recogniseLocked = (raw: readonly number[], activeMask: number): RuneId | -1 => {
  const locked = (ALL_RUNES_MASK & ~activeMask) >>> 0
  if (!locked || raw.length < 12) return -1
  const r = recognise(raw, locked)
  if (r < 0) return -1
  const [, own] = rawScore(raw, activeMask)
  const [, its] = rawScore(raw, 1 << r)
  return its > own ? r : -1
}

/**
 * The best template score among the active runes, without the threshold or
 * the structure gates. It is used for tuning, and for the "almost a …!"
 * near-miss nudge.
 */
export const rawScore = (raw: readonly number[], activeMask: number = FROZEN_MASK): [RuneId | -1, number] => {
  if (raw.length < 12) return [-1, 0]
  const v = vectorise(resample(raw.slice()))
  let bestR: RuneId | -1 = -1
  let bestS = -1
  for (const def of active(activeMask)) {
    const s = bestScore(v, def.id)
    if (s > bestS) {
      bestS = s
      bestR = def.id
    }
  }
  return [bestR, bestS]
}

/**
 * Structure features of a raw stroke, for the tuning harness and telemetry:
 * effective corner count, total turn, winding (revolutions), self-crossings.
 */
export const strokeFeatures = (raw: readonly number[]): { ec: number; turn: number; wind: number; crossings: number } | null => {
  if (raw.length < 12) return null
  const rs = resample(raw.slice())
  const [ec, turn, wind] = feat(rs)
  return { ec, turn, wind, crossings: crossingCount(rs) }
}

/** Template counts per rune id (tests and the harness report them). */
export const templateCounts = (): number[] => BANK.map((b) => b.length)
