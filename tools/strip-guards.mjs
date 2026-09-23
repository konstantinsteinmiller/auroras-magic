/**
 * Can this painted strip be CUT? The two questions the slicer asks before it
 * measures a single panel (art-generation-pipeline, SLICER § a failure must be
 * loud).
 *
 * In their own module for one reason: `tools/slice-sheets.mjs` RUNS on import —
 * importing it to reach these would re-slice the whole catalogue — so anything
 * that wants a test has to live outside it. Pure functions over a keyed RGBA
 * buffer, no fs, no sharp, no argv.
 *
 * ─── What they are defending against ────────────────────────────────────────
 *
 * A strip is `frames` drawings in a row, and every stage after the key assumes
 * that without being able to check it. `portrait-umbra` came back with NINE
 * faces against the five it was briefed for, and the pipeline did exactly what
 * it was told: the aspect guard passed (a 9-panel strip is the same 16:9 as a
 * 5-panel one), the fit normalisation passed (the content spans the sheet
 * either way, so it just scaled everything down), and the cut divided the
 * picture into five equal slices that each fell across two faces. It shipped,
 * and the game drew one-and-a-half heads into every Umbra dialogue badge.
 *
 * Neither test is enough alone, which is why there are two:
 *
 *   · `countDrawings` misses a strip whose drawings TOUCH — several returns
 *     paint a pale backdrop disc behind each subject and those discs meet, so
 *     a column profile reads a perfectly good five-panel strip as one run.
 *   · `boundaryInk` misses a strip with the WRONG NUMBER of SMALL drawings:
 *     nine little heads can leave all four cuts in air by luck, and did, twice.
 *
 * Together they caught four defective portraits in a catalogue of 160 that had
 * been looked at by eye and passed.
 */

/** Ink is opaque paint. The unmix leaves contaminated edges part-transparent,
 *  so this is deliberately stricter than "not the ground". */
const OPAQUE = 140

/** Fraction of a column that must be ink before the column counts as ink at
 *  all — below it, a stray speck, a sparkle, or the unmix's leftovers. */
const COLUMN_FLOOR = 0.01

/**
 * Per-column ink coverage, 0..1, and the busiest column's value.
 * Everything below reads this one profile.
 */
export const columnProfile = (d, w, h) => {
  const cov = new Float64Array(w)
  let peak = 0
  for (let x = 0; x < w; x++) {
    let n = 0
    for (let y = 0; y < h; y++) if (d[(y * w + x) * 4 + 3] > OPAQUE) n++
    cov[x] = n / h
    if (cov[x] > peak) peak = cov[x]
  }
  return { cov, peak }
}

/**
 * How many drawings the strip holds, and how many RULED LINES are drawn down
 * it.
 *
 * Runs of ink columns, merging anything separated by less than a tenth of a
 * panel: a real gap between two drawings is at least ~28 % of a panel wide
 * (`ITEM_FILL` leaves 14 % of air at each side), so a tenth is far below
 * anything that separates two of them and far above anything inside one.
 *
 * A run too narrow to be a drawing but tall enough to reach down the sheet is
 * a ruled line — a panel divider, a frame or a guide. Thin runs are otherwise
 * dropped as specks, which is how four painted dividers once rode through as
 * "5 drawings" and were then dragged into every crop by the fit
 * normalisation. The magenta contract has no room for any of them.
 *
 * `drawings` is null when the sheet is blank, which is not an accusation — the
 * caller only refuses on a confident disagreement.
 */
export const countDrawings = (d, w, h, panelPx) => {
  const { cov } = columnProfile(d, w, h)
  const merge = Math.max(2, Math.round(panelPx * 0.1))
  const thin = Math.max(2, Math.round(panelPx * 0.05))
  const runs = []
  let start = -1
  for (let x = 0; x <= w; x++) {
    if (x < w && cov[x] >= COLUMN_FLOOR) { if (start < 0) start = x; continue }
    if (start < 0) continue
    const last = runs[runs.length - 1]
    if (last && start - last[1] <= merge) last[1] = x
    else runs.push([start, x])
    start = -1
  }
  let ruled = 0
  for (const [a, b] of runs) {
    if (b - a >= thin) continue
    for (let x = a; x < b; x++) {
      if (cov[x] > 0.5) { ruled++; break }
    }
  }
  return { drawings: runs.filter(([a, b]) => b - a >= thin).length || null, ruled }
}

/**
 * How much ink sits ON the panel boundaries, as a fraction of the strip's own
 * busiest column — so it is scale- and subject-independent.
 *
 * Measured over all 35 multi-panel paintings in this project on 2026-09-23:
 * thirty-three scored exactly 0.000, `portrait-umbra` scored 0.184 at every
 * boundary (the even spacing is the signature of a wrong COUNT) and
 * `portrait-nova` 0.363 at one (drawings placed wrong). There is no middle
 * ground to tune against, which is why the threshold sits at 0.10 — two and a
 * half times the largest value a good strip has ever produced.
 */
export const BOUNDARY_INK_MAX = 0.1

export const boundaryInk = (d, w, h, frames) => {
  const { cov, peak } = columnProfile(d, w, h)
  if (peak <= 0) return { worst: 0, at: [] }
  // The emptiest column within ±2 % of a panel of each boundary, so a strip
  // that merely sits a few pixels off-centre is judged on its GAP and not on
  // one unlucky column. The fit normalisation would have corrected that much.
  const win = Math.max(1, Math.round((w / frames) * 0.02))
  const at = []
  for (let b = 1; b < frames; b++) {
    const x = Math.round((b / frames) * w)
    let lo = 1
    for (let i = Math.max(0, x - win); i <= Math.min(w - 1, x + win); i++) if (cov[i] < lo) lo = cov[i]
    at.push(lo / peak)
  }
  return { worst: Math.max(...at), at }
}

/**
 * Both questions at once. Returns `null` when the strip is cuttable, or the
 * sentence to refuse it with — written for whoever has to fix the painting,
 * so it says which cut is blocked and what that particular shape of failure
 * usually means.
 */
export const stripRefusal = (d, w, h, frames, panelPx) => {
  const { drawings, ruled } = countDrawings(d, w, h, panelPx)
  if (ruled) {
    return `it has ${ruled} ruled line${ruled === 1 ? '' : 's'} drawn down it — panel dividers, a frame or a guide. `
      + 'The panels are INVISIBLE: they are only where the drawings sit on one unbroken magenta sheet. '
      + 'A drawn line is paint, it survives the key, and the fit normalisation drags it into the neighbouring crops.'
  }
  if (drawings && drawings !== frames) {
    return `it holds ${drawings} drawing${drawings === 1 ? '' : 's'} and the sheet is ${frames} panels. `
      + (drawings === 1
        ? 'Either it is one big picture, or its drawings run together — a painted divider, frame or backdrop between them counts as one, and the magenta contract has no room for any of those.'
        : `Re-roll it: the cut is ${frames} equal slices and ${drawings} drawings cannot land in them.`)
  }
  const { worst, at } = boundaryInk(d, w, h, frames)
  if (worst > BOUNDARY_INK_MAX) {
    const bad = at.map((v, i) => (v > BOUNDARY_INK_MAX ? i + 1 : 0)).filter(Boolean)
    const even = at.every((v) => v > BOUNDARY_INK_MAX)
    return `its drawings do not line up with the ${frames} panels asked for — `
      + `cut ${bad.length === 1 ? `${bad[0]} falls` : `${bad.join(', ')} fall`} through a drawing `
      + `(${(worst * 100).toFixed(0)}% ink on the boundary, clean is 0%). `
      + (even
        ? 'EVERY boundary is blocked, which means the wrong NUMBER of drawings: re-roll and make the count the first line of the prompt.'
        : 'Re-roll it — the drawings are the right number but in the wrong places.')
  }
  return null
}

/** The one-line note the slicer prints when a strip passes. */
export const stripNote = (d, w, h, frames, panelPx) => {
  const { drawings } = countDrawings(d, w, h, panelPx)
  const { worst } = boundaryInk(d, w, h, frames)
  return `${drawings ?? '?'} drawings, no ruled lines, cuts clean (${(worst * 100).toFixed(0)}% ink on the worst boundary)`
}
