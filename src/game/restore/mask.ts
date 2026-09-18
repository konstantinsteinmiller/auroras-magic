/**
 * mask.ts — the wipe's coverage model (story-spec §9.3, §7.6).
 *
 * ONE question answered here: how much of the sector's dust is gone? The
 * answer is kept ANALYTICALLY, beside the dust canvas rather than read back
 * from it. Every brush stamp that erases pixels also runs through `stamp()`
 * below with the same centre, radius, falloff and strength, so the two agree
 * by construction. There is no `getImageData` anywhere in the wipe path.
 *
 * Two grids, deliberately different (§7.6):
 *
 *   • the SAVE / THRESHOLD grid — 24 × 14 cells, fixed count, 1 bit per cell
 *     when persisted (42 bytes → 56 base64 chars, C9). A cell is "done" once
 *     it is ≥ 88 % clear (224/255), a little past the 85 % global target so no
 *     single stubborn cell drags the sector's average down forever;
 *   • the SAMPLE lattice — 4 × 4 samples inside every cell (96 × 56 in all),
 *     each holding how much dust REMAINS at that point (1 = untouched,
 *     0 = gone). A stamp multiplies each sample it covers by `1 − a·falloff`,
 *     exactly what `destination-out` does to the canvas's alpha. Cell cover
 *     is `1 − mean(its samples)`, sector cover is `1 − mean(all samples)`.
 *
 * Coordinates are SECTOR UNITS (SU): the sector is always 1152 × 672 SU (12∶7,
 * §8.14), whatever resolution its canvases are baked at and however large it
 * is drawn on screen. That makes the grid resolution-independent: rotating
 * the phone re-maps the same cells, it never resamples them (§3.10).
 */

import { packBits, unpackBits } from '@/game/campaign/bitset'

export const SEC_W = 1152
export const SEC_H = 672
export const GRID_W = 24
export const GRID_H = 14
export const CELLS = GRID_W * GRID_H
/** Cell edge in SU (1152 / 24 = 672 / 14 = 48 — square cells). */
export const CELL = SEC_W / GRID_W
/** Samples per cell edge. */
export const SUB = 4
const LW = GRID_W * SUB
const LH = GRID_H * SUB
const STEP = CELL / SUB
/** A cell counts as done at this clear fraction (224/255, §9.3). */
export const DONE_AT = 224 / 255
/** Auto-complete threshold (C25). */
export const COMPLETE_AT = 0.85

/**
 * The brush falloff, shared by the canvas stamp and the analytic model:
 * full strength inside the core, then a straight ramp to zero at the rim.
 * `d` is distance / outer radius; `core` the core's share of the radius. A
 * canvas radial gradient interpolates its colour stops linearly, so this IS
 * the baked stamp's alpha profile.
 */
export const falloff = (d: number, core: number): number =>
  d <= core ? 1 : d >= 1 ? 0 : (1 - d) / (1 - core)

export interface Coverage {
  /** Remaining dust per sample, 1 = untouched. */
  readonly rem: Float32Array
  /**
   * The dwell clocks, per cell, in ms. A VISIT is an unbroken run of stamps
   * touching the cell (gaps under `VISIT_GAP_MS`). `touched` is the latest
   * touch; `visitStart` when the current visit began; `prevEnd` when the one
   * before it ended. Visits, not single touches, because a stamp's reach runs
   * ahead of the brush's centre: a per-touch clock is always "just now" by the
   * time the centre arrives, and a return pass would never be seen.
   */
  readonly touched: Float64Array
  readonly visitStart: Float64Array
  readonly prevEnd: Float64Array
}

/** Away from a cell longer than this, and touching it again is a new visit. */
export const VISIT_GAP_MS = 220
const NEVER = -1e12

export const createCoverage = (): Coverage => ({
  rem: new Float32Array(LW * LH).fill(1),
  touched: new Float64Array(CELLS).fill(NEVER),
  visitStart: new Float64Array(CELLS).fill(NEVER),
  prevEnd: new Float64Array(CELLS).fill(NEVER)
})

export const resetCoverage = (c: Coverage): void => {
  c.rem.fill(1)
  c.touched.fill(NEVER)
  c.visitStart.fill(NEVER)
  c.prevEnd.fill(NEVER)
}

/** Record a touch on `cell` at `t` ms, opening a new visit after a gap. */
export const touchCell = (c: Coverage, cell: number, t: number): void => {
  if (t - c.touched[cell]! > VISIT_GAP_MS) {
    c.prevEnd[cell] = c.touched[cell]!
    c.visitStart[cell] = t
  }
  c.touched[cell] = t
}

/**
 * Is a stamp landing on `cell` at `t` part of a RETURN visit — one that began
 * within `window` ms of the previous visit's end? A touch at `t` that would
 * itself open a new visit is judged as that new visit.
 */
export const isReturnVisit = (c: Coverage, cell: number, t: number, window: number): boolean => {
  const last = c.touched[cell]!
  if (t - last > VISIT_GAP_MS) return t - last < window
  return c.visitStart[cell]! - c.prevEnd[cell]! < window
}

/**
 * Account one stamp: centre (x, y) SU, outer radius r SU, core fraction,
 * strength a (0..1). Returns the indices of the cells it touched, so the
 * caller can age their dwell clocks — at most ~9 for any brush this game
 * ships, so the scratch array is fixed.
 */
const TOUCHED = new Int32Array(64)
export const stamp = (c: Coverage, x: number, y: number, r: number, core: number, a: number, t?: number): { cells: Int32Array; n: number } => {
  let n = 0
  if (!(r > 0) || !(a > 0)) return { cells: TOUCHED, n }
  const i0 = Math.max(0, Math.floor((x - r) / STEP))
  const i1 = Math.min(LW - 1, Math.floor((x + r) / STEP))
  const j0 = Math.max(0, Math.floor((y - r) / STEP))
  const j1 = Math.min(LH - 1, Math.floor((y + r) / STEP))
  const inv = 1 / r
  for (let j = j0; j <= j1; j++) {
    const dy = (j + 0.5) * STEP - y
    for (let i = i0; i <= i1; i++) {
      const dx = (i + 0.5) * STEP - x
      const d = Math.sqrt(dx * dx + dy * dy) * inv
      if (d >= 1) continue
      const k = j * LW + i
      c.rem[k] = c.rem[k]! * (1 - a * falloff(d, core))
    }
  }
  // Cells under the stamp's bounding box (not only the sampled ones), so a
  // brush grazing a cell still counts as "was here" for the dwell rule.
  const ci0 = Math.max(0, Math.floor((x - r) / CELL))
  const ci1 = Math.min(GRID_W - 1, Math.floor((x + r) / CELL))
  const cj0 = Math.max(0, Math.floor((y - r) / CELL))
  const cj1 = Math.min(GRID_H - 1, Math.floor((y + r) / CELL))
  for (let j = cj0; j <= cj1 && n < TOUCHED.length; j++) {
    for (let i = ci0; i <= ci1 && n < TOUCHED.length; i++) TOUCHED[n++] = j * GRID_W + i
  }
  if (t !== undefined) for (let k = 0; k < n; k++) touchCell(c, TOUCHED[k]!, t)
  return { cells: TOUCHED, n }
}

/** Clear fraction of one cell, 0..1. */
export const cellCover = (c: Coverage, cell: number): number => {
  const ci = cell % GRID_W
  const cj = (cell / GRID_W) | 0
  let s = 0
  for (let j = 0; j < SUB; j++) {
    const row = (cj * SUB + j) * LW + ci * SUB
    for (let i = 0; i < SUB; i++) s += c.rem[row + i]!
  }
  return 1 - s / (SUB * SUB)
}

/** Clear fraction of the whole sector, 0..1. */
export const coverage01 = (c: Coverage): number => {
  let s = 0
  for (let k = 0; k < c.rem.length; k++) s += c.rem[k]!
  return 1 - s / c.rem.length
}

export const isCellDone = (c: Coverage, cell: number): boolean => cellCover(c, cell) >= DONE_AT

export const doneCount = (c: Coverage): number => {
  let n = 0
  for (let k = 0; k < CELLS; k++) if (isCellDone(c, k)) n++
  return n
}

/** Force a cell fully clear (a resumed save, the reveal wave). */
export const clearCell = (c: Coverage, cell: number): void => {
  const ci = cell % GRID_W
  const cj = (cell / GRID_W) | 0
  for (let j = 0; j < SUB; j++) c.rem.fill(0, (cj * SUB + j) * LW + ci * SUB, (cj * SUB + j) * LW + ci * SUB + SUB)
}

export const clearAll = (c: Coverage): void => {
  c.rem.fill(0)
}

/** The cell under a sector point, or -1 off the sector. */
export const cellAt = (x: number, y: number): number => {
  if (!(x >= 0 && x < SEC_W && y >= 0 && y < SEC_H)) return -1
  return ((y / CELL) | 0) * GRID_W + ((x / CELL) | 0)
}

/** A cell's rectangle in SU. */
export const cellRect = (cell: number): [number, number, number, number] =>
  [(cell % GRID_W) * CELL, ((cell / GRID_W) | 0) * CELL, CELL, CELL]

/* ------------------------------ persistence ----------------------------- */

/** The in-progress save (C9): one bit per DONE cell, 56 base64 chars. */
export const packCoverage = (c: Coverage): string => packBits(CELLS, (i) => isCellDone(c, i))

/** A cell brushed past halfway but not done — one first pass (§8.4's dwell
 *  rule leaves a single pass at 55 %). Saved as a second bitset, so a relaunch
 *  does not throw away every stroke that was not yet a double pass. */
export const HALF_AT = 0.5
/** What a restored half cell comes back at: the first pass's 55 %. */
export const FIRST_PASS_CLEAR = 0.55
export const packHalf = (c: Coverage): string =>
  packBits(CELLS, (i) => !isCellDone(c, i) && cellCover(c, i) >= HALF_AT)

const UNPACK = new Uint8Array(CELLS)
/**
 * Restore a save into a FRESH coverage: done cells come back clear, every
 * other cell comes back fully dusty; `unpackHalf` then lays the single-pass
 * cells back at 55 %. Below that the resume is cell-granular, not
 * pixel-exact (§9.3). Returns the restored cells for the canvas to erase.
 */
export const unpackCoverage = (c: Coverage, b64: string | null): number[] => {
  resetCoverage(c)
  if (!b64) return []
  unpackBits(b64, UNPACK)
  const cells: number[] = []
  for (let i = 0; i < CELLS; i++) {
    if (!UNPACK[i]) continue
    clearCell(c, i)
    cells.push(i)
  }
  return cells
}

/** Restore the half bitset over a coverage `unpackCoverage` has just filled:
 *  each marked cell comes back at the first pass's level, never lower than it
 *  already is. Returns the cells for the canvas to thin. */
export const unpackHalf = (c: Coverage, b64: string | null): number[] => {
  if (!b64) return []
  unpackBits(b64, UNPACK)
  const cells: number[] = []
  const rem = 1 - FIRST_PASS_CLEAR
  for (let i = 0; i < CELLS; i++) {
    if (!UNPACK[i]) continue
    const ci = i % GRID_W
    const cj = (i / GRID_W) | 0
    for (let j = 0; j < SUB; j++) {
      const row = (cj * SUB + j) * LW + ci * SUB
      for (let k = 0; k < SUB; k++) c.rem[row + k] = Math.min(c.rem[row + k]!, rem)
    }
    cells.push(i)
  }
  return cells
}
