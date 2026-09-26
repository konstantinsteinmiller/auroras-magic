#!/usr/bin/env node
/**
 * Cut painted returns back into the drop-ins the renderer probes for
 * (story-spec §9.11, S6; art-generation-pipeline SLICER.md).
 *
 *   pnpm slice-sheets                      # every painting in art-sheets/painted/
 *   pnpm slice-sheets <file> [<file>…]     # just these (a path, or a name in painted/)
 *   pnpm slice-sheets -- --dry             # print the plan, write nothing
 *   pnpm slice-sheets -- --stale-ok        # cut a painting whose reference was redrawn
 *   pnpm slice-sheets -- --no-fit          # cut panels where they landed (see SLICER §4)
 *   pnpm slice-sheets -- --size 192        # this run's frame cap (items only)
 *
 *   painting → identify → receipt → aspect guard → (opaque) resize → WebP
 *                                             └→ (keyed) key → unmix → fit → cut the box → WebP
 *
 * Reads `art-sheets/sheet-index.json` (written by the bench, `/#/art-sheets`):
 *   • an OPAQUE sheet (`bg: 'opaque'`: a sector, an intro page) is
 *     full-bleed. No key, no fit: the return is resampled onto the reference's
 *     1152 × 672 (a 16:9 return is 2 % wider — invisible), plus any extra size
 *     it lists (a sector's 384 × 224 map thumb), all from the same pixels.
 *   • a KEYED sheet (an item, a rune, a keepsake badge, a portrait strip, an
 *     island) is magenta-keyed. A strip is first checked for whether it can be
 *     cut at all — the right NUMBER of drawings, no ruled divider, and every
 *     cut falling in air (`tools/strip-guards.mjs`) — and refused if not,
 *     because nothing below that point can tell. Then: `frames` panels side by side,
 *     each holding the drawing's BOX at `crop`. The return is keyed, registered
 *     onto the reference's measured `fit` (ONE correction for the whole strip,
 *     so a cycle never jitters), and each panel's box is cut out and written
 *     as one strip, at most 256 px tall per frame — unless the sheet declares
 *     an `exact` height, which the brand pair does because the DOM shows those
 *     files at a size the renderer never chooses.
 *
 * Loud on purpose: every correction is printed, and anything it cannot do
 * safely it refuses (exit 1) instead of guessing. A refused painting whose
 * reference was redrawn since it was cut is PARKED in `painted/stale/`, with
 * the WebPs cut from it, so neither is left where it can ship.
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { stripNote, stripRefusal } from './strip-guards.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SHEETS = join(ROOT, 'art-sheets')
const PAINTED = join(SHEETS, 'painted')
const STALE = join(PAINTED, 'stale')
const INDEX = join(SHEETS, 'sheet-index.json')
const RECEIPT = join(PAINTED, '.sliced.json')
const PUBLIC = join(ROOT, 'public')

const argv = process.argv.slice(2)
const DRY = argv.includes('--dry')
const STALE_OK = argv.includes('--stale-ok')
const NO_FIT = argv.includes('--no-fit')
const sizeAt = argv.indexOf('--size')
const SIZE = sizeAt >= 0 ? Number(argv[sizeAt + 1]) : null
const named = argv.filter((a, i) => !a.startsWith('--') && (sizeAt < 0 || i !== sizeAt + 1))

const IMAGE = /\.(png|jpe?g|webp)$/i
const hash12 = (buf) => createHash('sha1').update(buf).digest('hex').slice(0, 12)
const kb = (n) => `${(n / 1024).toFixed(1)}kB`
const log = (...a) => console.log(...a)

if (!existsSync(INDEX)) {
  console.error('no art-sheets/sheet-index.json — export the sheets first (pnpm art:export)')
  process.exit(1)
}
const index = JSON.parse(readFileSync(INDEX, 'utf-8'))
const sheets = index.sheets ?? []
const receipt = existsSync(RECEIPT) ? JSON.parse(readFileSync(RECEIPT, 'utf-8')) : { files: {} }
receipt.files ??= {}

/* ── 1. identify ─────────────────────────────────────────────────────── */

const stemOf = (f) => basename(f).replace(/\.[^.]+$/, '').toLowerCase()
const SEP = /^[-_ .(]/

/**
 * The sheet a painting belongs to: its own name is the reference's stem, or a
 * sheet's bare drop-in id, optionally followed by a suffix (`-v2`). Longest
 * match wins; a tie, or nothing, is an error — never a guess by shape.
 */
const identify = (file) => {
  const name = stemOf(file)
  const hits = []
  for (const s of sheets) {
    const stems = [stemOf(s.files.clean), ...(s.cells ?? []).map((c) => String(c.id).toLowerCase())]
    for (const st of stems) {
      if (name === st || (name.startsWith(st) && SEP.test(name.slice(st.length)))) hits.push({ s, len: st.length })
    }
  }
  if (!hits.length) return { error: `matches no sheet in the index — name it after its reference (e.g. ${sheets[0]?.files.clean ?? 'sector-….png'})` }
  hits.sort((a, b) => b.len - a.len)
  if (hits.length > 1 && hits[0].len === hits[1].len && hits[0].s !== hits[1].s) {
    return { error: `ambiguous: matches both ${hits[0].s.id} and ${hits[1].s.id}` }
  }
  return { sheet: hits[0].s }
}

/* ── pixel helpers ──────────────────────────────────────────────────── */

const decode = async (file) => {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return { d: new Uint8ClampedArray(data.buffer, data.byteOffset, data.length), w: info.width, h: info.height }
}

const encode = async (d, w, h, file, quality = 92) => {
  const buf = await sharp(Buffer.from(d.buffer, d.byteOffset, d.length), { raw: { width: w, height: h, channels: 4 } })
    .webp({ quality, alphaQuality: 100, effort: 5, smartSubsample: true })
    .toBuffer()
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, buf)
  return buf.length
}

/** Hard key: pure magenta is the only colour with G near zero AND R, B near full. */
const isMagenta = (r, g, b) => g < 70 && r > 190 && b > 190

/** How magenta a pixel is, 0..1. Pastel pinks sit at 0: #ff9ecf scores 49
 *  against a floor of 50, while true #FF00FF scores the full 255. */
const magentaness = (r, g, b) => Math.max(0, Math.min(1, (Math.min(r, b) - g - 50) / 205))

/**
 * Key the magenta ground, then UNMIX the contaminated edge — a painted glow
 * over magenta is part art, part magenta, and the magenta share is known
 * exactly, so it is subtracted back out rather than left as a pink rim.
 *
 * THE CONTAMINATED REGION IS NOT A FIXED BAND. It used to be three pixels
 * deep, which is right for a hard-edged subject with an anti-aliased rim and
 * badly wrong for a SOFT one: a bubble, a mote's glow, a puff of smoke and a
 * lantern's halo are translucent over tens of pixels, and they came back with
 * 3–14 % of their body still magenta — a bright pink disc where a soft white
 * one belonged. So the band is grown by FLOODING from the ground through
 * whatever is still magenta-tinted.
 *
 * Flooding is safe where a blanket rule would not be, and for one reason:
 * contamination is always CONNECTED to the ground it came from. A hot pink
 * flower in the middle of the art is not reachable from the outside, so it is
 * still never touched — which was the whole point of the band.
 */
const keyMagenta = (px, w, h) => {
  const { d } = px
  const n = w * h
  const bg = new Uint8Array(n)
  let keyed = 0
  for (let p = 0, i = 0; p < n; p++, i += 4) {
    if (isMagenta(d[i], d[i + 1], d[i + 2])) { bg[p] = 1; d[i + 3] = 0; keyed++ }
  }
  // Distance (in px, up to 3) from keyed ground: the ordinary anti-aliased rim.
  const near = new Uint8Array(n)
  for (let pass = 1; pass <= 3; pass++) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = y * w + x
        if (bg[p] || near[p]) continue
        const touch = (q) => bg[q] || (near[q] && near[q] < pass)
        if ((x > 0 && touch(p - 1)) || (x < w - 1 && touch(p + 1)) || (y > 0 && touch(p - w)) || (y < h - 1 && touch(p + w))) near[p] = pass
      }
    }
  }
  // …then follow the stain inward as far as it actually goes.
  const stack = []
  for (let p = 0; p < n; p++) if (bg[p] || near[p]) stack.push(p)
  while (stack.length) {
    const p = stack.pop()
    const x = p % w
    const y = (p - x) / w
    const step = (q) => {
      if (bg[q] || near[q]) return
      const j = q * 4
      if (magentaness(d[j], d[j + 1], d[j + 2]) <= 0.05) return
      near[q] = 1
      stack.push(q)
    }
    if (x > 0) step(p - 1)
    if (x < w - 1) step(p + 1)
    if (y > 0) step(p - w)
    if (y < h - 1) step(p + w)
  }
  let unmixed = 0
  for (let p = 0, i = 0; p < n; p++, i += 4) {
    if (!near[p]) continue
    const r = d[i], g = d[i + 1], b = d[i + 2]
    const m = magentaness(r, g, b)
    if (m <= 0.02) continue
    if (m >= 0.97) { d[i + 3] = 0; continue }
    const a = 1 - m
    d[i] = Math.max(0, Math.min(255, (r - m * 255) / a))
    d[i + 1] = Math.max(0, Math.min(255, g / a))
    d[i + 2] = Math.max(0, Math.min(255, (b - m * 255) / a))
    d[i + 3] = Math.round(d[i + 3] * a)
    unmixed++
  }
  return { keyed, unmixed }
}

/**
 * The fallback for a ground that is not magenta (white, cream, a painted
 * checkerboard): find the dominant colour on the FRAME, and flood inward from
 * the frame through pixels near it. Only ever run when the magenta key found
 * (almost) nothing — after a good key, what is left on the frame is art.
 */
const floodGround = (px, w, h) => {
  const { d } = px
  const border = []
  for (let x = 0; x < w; x++) border.push(x, (h - 1) * w + x)
  for (let y = 0; y < h; y++) border.push(y * w, y * w + w - 1)
  const buckets = new Map()
  for (const p of border) {
    const k = `${d[p * 4] >> 4},${d[p * 4 + 1] >> 4},${d[p * 4 + 2] >> 4}`
    buckets.set(k, (buckets.get(k) ?? 0) + 1)
  }
  const [top] = [...buckets.entries()].sort((a, b) => b[1] - a[1])
  const [br, bgc, bb] = top[0].split(',').map((v) => Number(v) * 16 + 8)
  const close = (p) => Math.abs(d[p * 4] - br) + Math.abs(d[p * 4 + 1] - bgc) + Math.abs(d[p * 4 + 2] - bb) < 60
  const share = border.filter(close).length / border.length
  if (share < 0.6) return { flooded: 0, share, colour: null }
  const seen = new Uint8Array(w * h)
  // A GROUND THAT IS STILL MAGENTA, JUST NOT PURE, IS KEYED EVERYWHERE.
  // Gemini washed one return's ground to rgb(221,66,183) — blue seven points
  // under `isMagenta`'s bar — so the hard key took nothing and this flood ran
  // instead. A flood enters only from the frame, so it cleaned the outside of
  // a soap bubble and left its SEE-THROUGH MIDDLE a solid magenta disc: the
  // one shape whose hole is the whole point of it.
  //
  // Safe here in a way a looser global threshold would not be. The nearest
  // colour in the game's own palette scores 101 on `min(R,B) - G` and this
  // ground scores 117 — nine points of daylight, which a JPEG can eat. This
  // fires only when THIS frame's measured ground is itself magenta, and the
  // art is told never to paint magenta at all.
  if (Math.min(br, bb) - bgc > 90) {
    let keyed = 0
    for (let p = 0; p < w * h; p++) {
      if (close(p)) { d[p * 4 + 3] = 0; keyed++ }
    }
    return { flooded: keyed, share, colour: `rgb(${br},${bgc},${bb})`, whole: true }
  }
  const stack = border.filter(close)
  let flooded = 0
  while (stack.length) {
    const p = stack.pop()
    if (seen[p]) continue
    seen[p] = 1
    if (!close(p)) continue
    d[p * 4 + 3] = 0
    flooded++
    const x = p % w
    if (x > 0) stack.push(p - 1)
    if (x < w - 1) stack.push(p + 1)
    if (p >= w) stack.push(p - w)
    if (p < w * (h - 1)) stack.push(p + w)
  }
  return { flooded, share, colour: `rgb(${br},${bgc},${bb})` }
}

/** Bilinear sample of premultiplied RGBA at (x, y); outside is transparent. */
/**
 * Do the drawings in a keyed strip line up with the panel grid the sheet
 * declares? Measured as: how much INK sits on each internal panel boundary.
 *
 * The one thing the slicer never checked, and the one way a strip can be wrong
 * that nothing downstream can notice. `portrait-umbra` came back with NINE
 * faces against the five it was briefed for, and every stage after the key did
 * exactly what it was told with them: the aspect guard passed (a 9-panel strip
 * is the same 16:9 as a 5-panel one), the fit normalisation passed (the content
 * spans the sheet either way, so it just scaled everything down 15 %), and the
 * cut divided the picture into five equal slices that each fell across two
 * faces. It shipped, and the renderer drew one-and-a-half heads into every
 * dialogue badge.
 *
 * COUNTING the drawings is the obvious test and the wrong one: several strips
 * paint a pale backdrop disc behind each subject and those discs touch, so a
 * column profile reads a perfectly good five-panel strip as one run. What
 * cannot be faked is the GRID — a strip is only cuttable if its boundaries
 * fall in air, whatever is on either side of them.
 *
 * Returns the worst boundary's ink as a fraction of the strip's own busiest
 * column, so it is scale- and subject-independent. Measured over all 35
 * multi-panel paintings in this project on 2026-09-23: thirty-three scored
 * exactly 0.000, `portrait-umbra` scored 0.184 at every boundary (the even
 * spacing is the signature of a wrong COUNT) and `portrait-nova` 0.363 at one
 * (the signature of drawings placed wrong). There is no middle ground to tune
 * against — hence the threshold at 0.10, two and a half times the largest
 * value a good strip has ever produced.
 */
/**
 * Row `r` of a grid painting (`rows` rows, `cols` columns), cropped to the
 * `n` cells it holds — a strip the strip guards can read on its own.
 */
const rowBand = (px, r, rows, n, cols) => {
  const y0 = Math.round((r * px.h) / rows)
  const y1 = Math.round(((r + 1) * px.h) / rows)
  const w = Math.round((n * px.w) / cols)
  const h = y1 - y0
  const d = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) d.set(px.d.subarray(((y0 + y) * px.w) * 4, ((y0 + y) * px.w + w) * 4), y * w * 4)
  return { d, w, h }
}

const sampler = (px) => {
  const { d, w, h } = px
  const pm = new Float32Array(w * h * 4)
  for (let i = 0; i < pm.length; i += 4) {
    const a = d[i + 3] / 255
    pm[i] = d[i] * a
    pm[i + 1] = d[i + 1] * a
    pm[i + 2] = d[i + 2] * a
    pm[i + 3] = d[i + 3]
  }
  const at = (x, y, c) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : pm[(y * w + x) * 4 + c])
  return (x, y, out) => {
    const x0 = Math.floor(x - 0.5)
    const y0 = Math.floor(y - 0.5)
    const fx = x - 0.5 - x0
    const fy = y - 0.5 - y0
    for (let c = 0; c < 4; c++) {
      out[c] = (at(x0, y0, c) * (1 - fx) + at(x0 + 1, y0, c) * fx) * (1 - fy)
        + (at(x0, y0 + 1, c) * (1 - fx) + at(x0 + 1, y0 + 1, c) * fx) * fy
    }
  }
}

/**
 * Box-filtered resample of a region, for shrinking (bilinear alone aliases
 * when a frame is cut 3× smaller): average a grid of bilinear taps.
 */
const resampleInto = (sample, map, ow, oh, taps) => {
  const out = new Uint8ClampedArray(ow * oh * 4)
  const t = [0, 0, 0, 0]
  for (let y = 0; y < oh; y++) {
    for (let x = 0; x < ow; x++) {
      let r = 0, g = 0, b = 0, a = 0
      for (let j = 0; j < taps; j++) {
        for (let i = 0; i < taps; i++) {
          const [sx, sy] = map(x + (i + 0.5) / taps, y + (j + 0.5) / taps)
          sample(sx, sy, t)
          r += t[0]; g += t[1]; b += t[2]; a += t[3]
        }
      }
      const n = taps * taps
      const o = (y * ow + x) * 4
      a /= n
      out[o + 3] = a
      if (a > 0) {
        const k = 255 / a
        out[o] = Math.min(255, (r / n) * k)
        out[o + 1] = Math.min(255, (g / n) * k)
        out[o + 2] = Math.min(255, (b / n) * k)
      }
    }
  }
  return out
}

/* ── 2. per painting ─────────────────────────────────────────────────── */

const paintings = named.length
  ? named.map((f) => (isAbsolute(f) || existsSync(resolve(f)) ? resolve(f) : join(PAINTED, f)))
  : existsSync(PAINTED) ? readdirSync(PAINTED).filter((f) => IMAGE.test(f)).map((f) => join(PAINTED, f)) : []

if (!paintings.length) {
  log('nothing to slice: art-sheets/painted/ is empty')
  process.exit(0)
}

let failures = 0
let written = 0

const targetsOf = (sheet) => (sheet.cells ?? []).flatMap((c) => [c.target, ...(c.extra ?? []).map((e) => e.target)])

/** Move a refused painting and whatever was cut from it out of reach. */
const park = (file, sheet, why) => {
  log(`  ! ${why}`)
  if (DRY) { log('    (dry run: would park it in painted/stale/)'); return }
  mkdirSync(STALE, { recursive: true })
  renameSync(file, join(STALE, basename(file)))
  for (const t of targetsOf(sheet)) {
    const out = join(PUBLIC, t)
    if (!existsSync(out)) continue
    const to = join(STALE, 'cut', t.replace(/[\\/]/g, '__'))
    mkdirSync(dirname(to), { recursive: true })
    renameSync(out, to)
    log(`    parked ${t} → ${relative(ROOT, to)}`)
  }
  log('    Repaint it from the current reference, or re-run with --stale-ok if the change was cosmetic.')
}

for (const file of paintings) {
  const name = basename(file)
  if (!existsSync(file)) { console.error(`${name}: no such file`); failures++; continue }
  const id = identify(file)
  if (id.error) { console.error(`${name}: ${id.error}`); failures++; continue }
  const sheet = id.sheet
  const refFile = join(SHEETS, sheet.files.clean)
  if (!existsSync(refFile)) { console.error(`${name}: its reference ${sheet.files.clean} is missing — pnpm art:export`); failures++; continue }
  const rev = hash12(readFileSync(refFile))
  const bytes = readFileSync(file)
  const own = hash12(bytes)

  // The receipt: a painting of a drawing that has since been redrawn.
  let seen = receipt.files[name]
  if (seen?.painting && seen.painting !== own) seen = undefined // a re-roll under the old name
  const meta = await sharp(file).metadata()
  log(`${name} → ${sheet.kind} "${sheet.id}"  ${meta.width}x${meta.height}`)
  if (seen?.rev && seen.rev !== rev && !STALE_OK) {
    park(file, sheet, `painted from reference ${seen.rev}; it is ${rev} now — the drawing moved.`)
    failures++
    continue
  }
  if (/\.jpe?g$/i.test(name)) log('  · JPEG: magenta will have smeared at the edges; the unmix cleans most of it (ask for PNG next time).')

  try {
    const out = []
    if (sheet.bg === 'opaque') {
      // ── 2a. an opaque sheet (a sector, an intro page): full-bleed ──
      const want = sheet.size.w / sheet.size.h
      const got = meta.width / meta.height
      const drift = got / want - 1
      if (Math.abs(drift) > 0.12) throw new Error(`it is ${got.toFixed(2)}:1 and the scene is ${want.toFixed(2)}:1 — a re-framed scene cannot be registered. Ask for 16:9.`)
      if (Math.abs(drift) > 0.05) log(`  · proportion ${(drift * 100).toFixed(1)}% off the scene's; resampled onto it anyway.`)
      for (const c of sheet.cells) {
        for (const t of [{ target: c.target, w: c.w, h: c.h }, ...(c.extra ?? [])]) {
          const buf = await sharp(file).removeAlpha().resize(t.w, t.h, { fit: 'fill', kernel: 'lanczos3' })
            .webp({ quality: 90, effort: 5, smartSubsample: true }).toBuffer()
          if (!DRY) {
            mkdirSync(dirname(join(PUBLIC, t.target)), { recursive: true })
            writeFileSync(join(PUBLIC, t.target), buf)
          }
          out.push(`  → ${t.target}  ${t.w}x${t.h}  ${kb(buf.length)}`)
        }
      }
    } else {
      // ── 2b. a keyed sheet: an item, a rune, a badge, a portrait, an island ──
      const refW = sheet.size.w
      const refH = sheet.size.h
      const panelW = sheet.panel.w
      const panelH = sheet.panel.h
      const frames = sheet.frames
      // A GRID (`ItemSheet.rows`, the dialogue pictograms): panel f sits at
      // column f % cols, row floor(f / cols). Still written as ONE strip, so
      // nothing that reads the file changes. One row is every other sheet, and
      // every line below reduces to the strip's own arithmetic there.
      const rows = sheet.rows ?? 1
      const cols = Math.ceil(frames / rows)
      const px = await decode(file)
      const want = refW / refH
      const got = px.w / px.h
      const drift = got / want - 1
      // Reference → painting coordinates.
      let sx, sy, offX = 0, offY = 0
      if (frames > 1) {
        // A strip: a uniform squash is recoverable (every panel distorted the
        // same way); a re-composed grid is not.
        if (Math.abs(drift) > 0.15) throw new Error(`it is ${got.toFixed(2)}:1 and the strip is ${want.toFixed(2)}:1 — the panels no longer divide it. Ask for 16:9.`)
        if (Math.abs(drift) > 0.03) log(`  · proportion ${(drift * 100).toFixed(1)}% off the strip's; panels resampled evenly.`)
        sx = px.w / refW
        sy = px.h / refH
      } else {
        // A single: centre it in a canvas of the reference's shape (the object
        // floats on its ground, so extra ground on one axis is harmless).
        const s = Math.max(px.w / refW, px.h / refH)
        sx = sy = s
        offX = (refW * s - px.w) / 2
        offY = (refH * s - px.h) / 2
        if (Math.abs(drift) > 0.03) log(`  · proportion ${(drift * 100).toFixed(1)}% off square; centred on its own ground, not stretched.`)
      }
      const { keyed, unmixed } = keyMagenta(px, px.w, px.h)
      const share = keyed / (px.w * px.h)
      if (share < 0.03) {
        const f = floodGround(px, px.w, px.h)
        if (!f.colour) throw new Error('no magenta ground and no single ground colour on the frame — nothing can be keyed safely')
        log(`  ! the ground is ${f.colour}, not #FF00FF. Only true magenta keys safely; a flood fill took ${(f.flooded / (px.w * px.h) * 100).toFixed(0)}% — check every panel for eaten pale paint.`)
      } else {
        log(`  · keyed ${(share * 100).toFixed(0)}% magenta, unmixed ${unmixed} edge px`)
      }

      // CAN IT BE CUT AT ALL? Before measuring a single panel: the right
      // NUMBER of drawings, no ruled divider, and every cut falling in air.
      // Every stage below assumes all three and none of them can tell
      // otherwise — `tools/strip-guards.mjs` has the whole story.
      if (frames > 1) {
        // A grid is checked row by row — each row a strip of the drawings it
        // holds, cut from the columns it uses (a short last row leaves its
        // right-hand cells empty).
        for (let r = 0; r < rows; r++) {
          const n = Math.min(cols, frames - r * cols)
          const band = rows > 1 ? rowBand(px, r, rows, n, cols) : px
          const refusal = stripRefusal(band.d, band.w, band.h, n, panelW * sx)
          if (refusal) throw new Error(rows > 1 ? `row ${r + 1}: ${refusal}` : refusal)
          log(`  · ${rows > 1 ? `row ${r + 1}: ` : ''}${stripNote(band.d, band.w, band.h, n, panelW * sx)}`)
        }
      }

      // Measure the return's SOLID extent (α > 140) per panel, in reference px.
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
      const hs = new Array(frames).fill(null).map(() => [Infinity, -Infinity])
      for (let y = 0; y < px.h; y++) {
        for (let x = 0; x < px.w; x++) {
          if (px.d[(y * px.w + x) * 4 + 3] <= 140) continue
          const rx = (x + 0.5 + offX) / sx
          const ry = (y + 0.5 + offY) / sy
          const col = Math.min(cols - 1, Math.max(0, Math.floor(rx / panelW)))
          const row = Math.min(rows - 1, Math.max(0, Math.floor(ry / panelH)))
          const f = row * cols + col
          if (f >= frames) continue
          const ix = rx - col * panelW
          const iy = ry - row * panelH
          if (ix < x0) x0 = ix
          if (ix > x1) x1 = ix
          if (iy < y0) y0 = iy
          if (iy > y1) y1 = iy
          if (iy < hs[f][0]) hs[f][0] = iy
          if (iy > hs[f][1]) hs[f][1] = iy
        }
      }
      if (!Number.isFinite(x0)) throw new Error('nothing opaque left after keying — the ground ate the art, or the painting is empty')
      // Each panel's height against ITS OWN reference height (a lid thrown
      // open is legitimately taller than a shut one): the ratios should agree.
      const refPh = sheet.fit?.ph
      const ratios = hs.map((h, f) => (Number.isFinite(h[0]) && refPh?.[f] ? (h[1] - h[0]) / panelH / refPh[f] : null)).filter((r) => r)
      if (ratios.length > 1 && Math.max(...ratios) / Math.min(...ratios) > 1.18) {
        log(`  ! panels differ by ${((Math.max(...ratios) / Math.min(...ratios) - 1) * 100).toFixed(0)}% against their references — the object was redrawn at different sizes across the strip.`)
      }

      // Register onto the reference's fit: ONE correction for the whole strip.
      const fit = sheet.fit
      const gotW = (x1 - x0) / panelW
      const gotH = (y1 - y0) / panelH
      const gotCx = (x0 + x1) / 2 / panelW
      const gotBottom = y1 / panelH
      const gotTop = y0 / panelH
      const gotCy = (y0 + y1) / 2 / panelH
      let k = 1
      let dx = 0
      let dy = 0
      if (!NO_FIT && fit?.h > 0) {
        const kH = fit.h / gotH
        const kW = fit.w > 0 ? fit.w / gotW : kH
        k = Math.sqrt(kH * kW) // match the box's AREA (SLICER §4c)
        if (k < 0.25 || k > 4) {
          log(`  ! refused a ${(k * 100).toFixed(0)}% normalisation — a wild return; cut where it landed. Check it in /playground.`)
          k = 1
        } else {
          // Panel-fraction offsets after scaling about the content's anchor.
          dx = fit.cx - gotCx
          // An island is stood ON: its top edge is what must not move.
          dy = sheet.anchor === 'feet' ? fit.bottom - gotBottom
            : sheet.anchor === 'top' ? (fit.bottom - fit.h) - gotTop
              : (fit.bottom - fit.h / 2) - gotCy
          if (Math.abs(k - 1) > 0.03 || Math.abs(dx) > 0.02 || Math.abs(dy) > 0.02) {
            log(`  · normalised onto the reference: scaled to ${(k * 100).toFixed(0)}%, moved ${(dx * 100).toFixed(0)}% / ${(dy * 100).toFixed(0)}% of a panel.`)
          }
        }
      }
      const ancX = gotCx * panelW
      const ancY = (sheet.anchor === 'feet' ? gotBottom : sheet.anchor === 'top' ? gotTop : gotCy) * panelH

      // Cut each panel's box out, at most `cap` px tall, never upsampled.
      const crop = sheet.crop
      // `exact` overrides the frame cap AND `--size`, and is the only thing
      // that may raise either. It is set (`ItemSheet.exact`) for a sheet whose
      // file is read at a fixed size by something OUTSIDE the renderer — the
      // splash's <img>, the PWA manifest's 512 icon — where the cap is not a
      // payload trade-off but a visibly soft picture. Everything the renderer
      // blits at a drawable's own size keeps the cap.
      const cap = sheet.exact ?? Math.min(sheet.maxEdge ?? 256, SIZE ?? Infinity)
      const native = crop.h * sy
      const fh = Math.max(8, Math.round(Math.min(cap, native)))
      const fw = Math.max(8, Math.round(crop.w * (fh / crop.h)))
      const sample = sampler(px)
      const strip = new Uint8ClampedArray(fw * frames * fh * 4)
      const taps = Math.max(1, Math.min(4, Math.ceil(native / fh)))
      for (let f = 0; f < frames; f++) {
        const map = (ox, oy) => {
          // Output px → reference px (in the panel), inverse of the fit.
          const rx = crop.x + (ox / fw) * crop.w
          const ry = crop.y + (oy / fh) * crop.h
          const ux = (rx - ancX - dx * panelW) / k + ancX
          const uy = (ry - ancY - dy * panelH) / k + ancY
          return [((f % cols) * panelW + ux) * sx - offX, (Math.floor(f / cols) * panelH + uy) * sy - offY]
        }
        const cell = resampleInto(sample, map, fw, fh, taps)
        for (let y = 0; y < fh; y++) {
          strip.set(cell.subarray(y * fw * 4, (y + 1) * fw * 4), (y * fw * frames + f * fw) * 4)
        }
      }
      const target = sheet.cells[0].target
      const size = DRY ? 0 : await encode(strip, fw * frames, fh, join(PUBLIC, target))
      out.push(`  → ${target}  ${fw * frames}x${fh} (${frames} × ${fw}x${fh})${DRY ? '' : `  ${kb(size)}`}`)
    }
    for (const l of out) log(l)
    written += out.length
    // The art style it was painted in (art-style.md §0): a later style change
    // marks this painting for repainting.
    if (!DRY) receipt.files[name] = { sheet: sheet.id, rev, painting: own, style: index.style ?? null, at: new Date().toISOString() }
  } catch (e) {
    console.error(`  ✗ ${name}: ${e.message}`)
    failures++
  }
}

if (!DRY) writeFileSync(RECEIPT, `${JSON.stringify(receipt, null, 2)}\n`)
log(`\n${written} file${written === 1 ? '' : 's'} ${DRY ? 'would be ' : ''}written, ${failures} refused.`)
if (written && !DRY) log('Look at them in motion: /#/playground (art on). A 404 is remembered per page load, so reload first.')
process.exit(failures ? 1 : 0)
