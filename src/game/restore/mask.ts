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

/**
 * Account one Magic Eraser paddle (§8.4): a rectangle of half-extents
 * (hw, hh) SU turned by `ang`, centred on (x, y), with a thin soft edge. No
 * dwell and no falloff inside — one contact clears. Returns the touched cells
 * like `stamp`.
 */
export const stampRect = (c: Coverage, x: number, y: number, hw: number, hh: number, ang: number, a: number, t?: number): { cells: Int32Array; n: number } => {
  let n = 0
  if (!(hw > 0) || !(hh > 0) || !(a > 0)) return { cells: TOUCHED, n }
  const R = Math.hypot(hw, hh)
  const ca = Math.cos(ang)
  const sa = Math.sin(ang)
  const edge = Math.max(2, hh * 0.12)
  const i0 = Math.max(0, Math.floor((x - R) / STEP))
  const i1 = Math.min(LW - 1, Math.floor((x + R) / STEP))
  const j0 = Math.max(0, Math.floor((y - R) / STEP))
  const j1 = Math.min(LH - 1, Math.floor((y + R) / STEP))
  for (let j = j0; j <= j1; j++) {
    const dy = (j + 0.5) * STEP - y
    for (let i = i0; i <= i1; i++) {
      const dx = (i + 0.5) * STEP - x
      const lx = Math.abs(dx * ca + dy * sa)
      const ly = Math.abs(-dx * sa + dy * ca)
      const out = Math.max(lx - hw, ly - hh)
      if (out >= edge) continue
      const k = j * LW + i
      const f = out <= 0 ? 1 : 1 - out / edge
      c.rem[k] = c.rem[k]! * (1 - a * f)
    }
  }
  const ci0 = Math.max(0, Math.floor((x - R) / CELL))
  const ci1 = Math.min(GRID_W - 1, Math.floor((x + R) / CELL))
  const cj0 = Math.max(0, Math.floor((y - R) / CELL))
  const cj1 = Math.min(GRID_H - 1, Math.floor((y + R) / CELL))
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

/* --------------------------- the graceful finish -------------------------- */

/**
 * WHAT THE PLAYER CAN SEE (owner, 2026-09-20). `coverage01` is honest
 * arithmetic: it counts every last trace of dust, including traces far too
 * thin to make out over the painting underneath. A child who has been over the
 * sector twice is looking at a picture that reads as clean while the model
 * still says 80 %, and the 85 % rule then leaves them stuck with nothing
 * visible left to aim at. So the finish is judged a SECOND way, by look:
 *
 *   • dust thinner than a visibility floor does not count at all;
 *   • at least `LOOKS_CLEAN_AT` of the sector must be that clean;
 *   • and no single connected patch of what remains may cover more than
 *     `PATCH_AT` of the sector — one big visible chunk still blocks the
 *     finish, which is the whole point of the wipe.
 *
 * TWO FLOORS, because "still scrubbing" and "stopped" are different questions
 * (§8.6). While the tool is moving the bar is `FAINT_AT` — only dust nobody
 * could see is forgiven — and the sector may finish the instant there is truly
 * nothing left to aim at, mid-stroke. Once the player has STOPPED for the
 * 1.5 s grace they have said they believe it is done, and the bar drops to
 * `STOPPED_AT`: a thin even haze over a restored painting is not worth a dead
 * end. One first brush pass leaves 45 % (§8.4) — above BOTH floors, so a
 * single sweep of the sector never finishes it.
 */
/** Remaining dust at or under this reads as gone while the tool is working. */
export const FAINT_AT = 0.18
/** …and this much, once the player has stopped and the grace has run. */
export const STOPPED_AT = 0.32
/** The share of the sector that must be clean at the floor in use. */
export const LOOKS_CLEAN_AT = 0.95
/**
 * The "big visible chunk" test, as a window rather than a blob: dust left over
 * from a wipe is mostly a THREAD NETWORK — the rims between overlapping
 * strokes — and those threads all touch, so a connected-area measure calls a
 * spider's web of faint lines one enormous patch. What a player actually sees
 * as a missed spot is SOLID, so the test is local density: the dustiest
 * `CHUNK` × `CHUNK` sample window anywhere on the sector (8 × 8 samples =
 * 96 × 96 SU, a 2 × 2 cell blotch, ~8 % of the sector's width). At or over
 * `CHUNK_AT` of that window still holding dust, the wipe goes on.
 */
export const CHUNK = 8
export const CHUNK_AT = 0.6

export interface Look {
  /** Share of the sector holding no visible dust; 1 = nothing left to see. */
  clean: number
  /** How full the dustiest `CHUNK` × `CHUNK` window is, 0..1. */
  chunk: number
  /** That window's top-left corner, in samples. */
  chunkI: number
  chunkJ: number
}

const SAT = new Int32Array((LW + 1) * (LH + 1))

/**
 * How the sector LOOKS with dust under `faint` discounted: how much of it is
 * clean, and how solid the worst blotch left is. A summed-area table over the
 * lattice, then every window read in four lookups — ~10 000 operations on the
 * 250 ms coverage check, never per frame (§9.3).
 */
export const lookAt = (c: Coverage, faint: number): Look => {
  const n = c.rem.length
  const W = LW + 1
  let dirty = 0
  for (let j = 0; j < LH; j++) {
    let row = 0
    for (let i = 0; i < LW; i++) {
      const d = c.rem[j * LW + i]! > faint ? 1 : 0
      dirty += d
      row += d
      SAT[(j + 1) * W + i + 1] = SAT[j * W + i + 1]! + row
    }
  }
  let best = 0
  let bi = 0
  let bj = 0
  if (dirty > 0) {
    for (let j = 0; j + CHUNK <= LH; j++) {
      for (let i = 0; i + CHUNK <= LW; i++) {
        const v = SAT[(j + CHUNK) * W + i + CHUNK]! - SAT[j * W + i + CHUNK]! - SAT[(j + CHUNK) * W + i]! + SAT[j * W + i]!
        if (v > best) {
          best = v
          bi = i
          bj = j
        }
      }
    }
  }
  return { clean: 1 - dirty / n, chunk: best / (CHUNK * CHUNK), chunkI: bi, chunkJ: bj }
}

/** Does this look finish the sector — clean nearly everywhere, with no solid
 *  chunk of dust left anywhere on it? */
export const looksDone = (l: Look): boolean => l.clean >= LOOKS_CLEAN_AT && l.chunk < CHUNK_AT

/**
 * What the progress ring should read, 0..1 of the finish line: the honest
 * coverage against the 85 % rule, or the look against the 95 % one, whichever
 * is further along. A chunk still showing holds it just short of full, so the
 * ring never promises a finish the chunk rule will refuse.
 */
export const finishProgress = (cover: number, l: Look): number => {
  const byLook = Math.min(1, l.clean / LOOKS_CLEAN_AT)
  return Math.max(Math.min(1, cover / COMPLETE_AT), l.chunk < CHUNK_AT ? byLook : Math.min(0.985, byLook))
}

/* --------------------------- the invisible helper -------------------------- */

/**
 * THE INVISIBLE HELPER (owner, 2026-09-26). The graceful finish still leaves
 * one dead end: a few small, light clouds of dust on a background they barely
 * show against. They hold the look back, the child sees an empty picture, and
 * nothing is left that they can find to aim at. So once a wipe has been going
 * a while (`T_HELP_AFTER`, wipe.ts) with more than `HELP_FROM` of the sector
 * clear, the dust still standing between the child and the finish dissolves
 * by itself, a few cells at a time, until the finish is met. No tool, no
 * sound: the dust just thins away.
 *
 * WHICH CELLS: those holding dust above the floor the finish is judged at,
 * the LEAST dusty first. A stray speck or a thin wisp goes before a patch the
 * child can plainly see and may be brushing right now, which is the last
 * thing the helper touches. Once only a chunk still blocks the finish (the
 * rest is clean enough), the helper goes to that chunk's window rather than
 * polishing specks the look has stopped counting.
 */
export const HELP_FROM = 0.75
/** The dissolve's stamp, laid on a cell's centre: a CONE (no flat core),
 *  wide enough to take the cell to its corners over the fade and to thin the
 *  near half of its neighbours. The brush's flat-cored stamp left a ring of
 *  soft round holes in a haze; a cone has no rim to read as a circle, so the
 *  dust just thins away. */
export const HELP_R = CELL * 1.1
export const HELP_CORE = 0

const HELP_KEY = new Float32Array(CELLS)
const HELP_N = new Uint8Array(CELLS)

/**
 * The next cells for the helper to dissolve, least dusty first, into `out`;
 * returns how many. `floor` is the visibility floor of the finish being aimed
 * at (the wipe aims at the stopped one, `STOPPED_AT`), and a cell counts
 * only while one of its samples is dustier than it. The pick stops once it
 * holds `budget` such samples, or `out` is full — so the pace is an AMOUNT
 * of visible dust, not a number of cells: a dozen stray specks go together,
 * a solid patch a cell or two at a time. `busy` skips cells already
 * dissolving.
 */
export const helpCells = (c: Coverage, floor: number, out: Int32Array, budget: number, busy?: (cell: number) => boolean): number => {
  const l = lookAt(c, floor)
  const onlyChunk = l.clean >= LOOKS_CLEAN_AT && l.chunk >= CHUNK_AT
  const ci0 = Math.floor(l.chunkI / SUB)
  const ci1 = Math.floor((l.chunkI + CHUNK - 1) / SUB)
  const cj0 = Math.floor(l.chunkJ / SUB)
  const cj1 = Math.floor((l.chunkJ + CHUNK - 1) / SUB)
  for (let cell = 0; cell < CELLS; cell++) {
    HELP_KEY[cell] = -1
    const ci = cell % GRID_W
    const cj = (cell / GRID_W) | 0
    if (onlyChunk && (ci < ci0 || ci > ci1 || cj < cj0 || cj > cj1)) continue
    if (busy?.(cell)) continue
    let s = 0
    let over = 0
    for (let j = 0; j < SUB; j++) {
      const row = (cj * SUB + j) * LW + ci * SUB
      for (let i = 0; i < SUB; i++) {
        const v = c.rem[row + i]!
        s += v
        if (v > floor) over++
      }
    }
    HELP_N[cell] = over
    if (over) HELP_KEY[cell] = s
  }
  // A few picks from 336 cells: a repeated minimum scan, no sort, no garbage.
  let n = 0
  let got = 0
  while (n < out.length && got < budget) {
    let best = -1
    let key = Infinity
    for (let cell = 0; cell < CELLS; cell++) {
      const k = HELP_KEY[cell]!
      if (k >= 0 && k < key) {
        key = k
        best = cell
      }
    }
    if (best < 0) break
    out[n++] = best
    got += HELP_N[best]!
    HELP_KEY[best] = -1
  }
  return n
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
