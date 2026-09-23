#!/usr/bin/env node
/**
 * Cut the app icons and the favicon out of the painted MARK
 * (`public/images/brand/logo.webp`, art-generation-pipeline PROMOTION.md §
 * the brand files).
 *
 *   pnpm brand:icons             # rewrite the icons from the mark
 *   pnpm brand:icons --dry       # say what would change, write nothing
 *
 * ONE MASTER, EVERY SIZE. The mark is cut by the slicer at exactly 512 — the
 * largest size `public/manifest.json` asks for — and every icon here is a
 * DOWNSAMPLE of that one file. The rule it exists to keep is that an icon
 * upscaled from a smaller master is a blurred icon on the one screen a player
 * judges the game from before they have played it, and that repainting the
 * mark must move the tab strip, the home screen and the store tile together
 * rather than leaving three generations of unicorn on one device.
 *
 * WHY THE FAVICON COMES FROM THE MARK AND NOT FROM A LOCKUP: a lockup is type,
 * and type averages into a smudge at 16 px. The mark is one object on one
 * tile, which is the only thing that still reads there.
 *
 * WHAT THIS DOES NOT DO: compress the `.ico`. An `.ico` is a container, the
 * project compressor writes png/jpg/webp, and a "compressed" favicon is a PNG
 * with the wrong extension that Windows and Safari both refuse. The PNGs are
 * offered to the compressor (below); the icon never is.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC = join(ROOT, 'public')
const MASTER = join(PUBLIC, 'images', 'brand', 'logo.webp')
const DRY = process.argv.includes('--dry')

/** Every icon cut from the master, and who reads it. */
const PNGS = [
  { size: 512, to: 'images/logo/logo_512x512.png', who: 'manifest.json, the install prompt, the store tile' },
  { size: 192, to: 'images/logo/logo_192x192.png', who: 'manifest.json, the Android home screen' }
]
/** The favicon's payload size. 128 is the largest a single-entry icon can
 *  carry without the width/height bytes wrapping — see `icoOf`. */
const ICO_SIZE = 128
const ICO = 'favicon.ico'

/**
 * A one-entry `.ico` carrying a PNG payload.
 *
 * Every `.ico` since Vista may hold a PNG instead of a DIB, and it is the only
 * sane way to carry an icon with an alpha channel: the BMP route needs an
 * inverted AND mask and a bottom-up buffer, and gets the transparency wrong in
 * exactly the browsers that still ask for an `.ico`.
 *
 * `width` and `height` are ONE BYTE each, which is why a single-entry icon
 * caps at 255 px (256 is written as 0) and why 128 is the size asked for.
 */
const icoOf = (png, size) => {
  const dir = Buffer.alloc(6)
  dir.writeUInt16LE(0, 0)
  dir.writeUInt16LE(1, 2)
  dir.writeUInt16LE(1, 4)
  const entry = Buffer.alloc(16)
  entry.writeUInt8(size >= 256 ? 0 : size, 0)
  entry.writeUInt8(size >= 256 ? 0 : size, 1)
  entry.writeUInt8(0, 2)
  entry.writeUInt8(0, 3)
  entry.writeUInt16LE(1, 4)
  entry.writeUInt16LE(32, 6)
  entry.writeUInt32LE(png.length, 8)
  entry.writeUInt32LE(22, 12)
  return Buffer.concat([dir, entry, png])
}

const kb = (n) => `${(n / 1024).toFixed(1)} kB`

if (!existsSync(MASTER)) {
  console.error(`no mark at ${MASTER} — paint \`brand-logo\` first (pnpm art:desk, or PROMPTS-BRAND.md)`)
  process.exit(1)
}

const meta = await sharp(MASTER).metadata()
if (meta.width !== meta.height) {
  console.error(`the mark is ${meta.width}x${meta.height} — it must be square before anything is cut from it`)
  process.exit(1)
}
console.log(`mark: images/brand/logo.webp  ${meta.width}x${meta.height}`)

const written = []
for (const { size, to, who } of PNGS) {
  if (size > meta.width) {
    console.error(`  ! ${to} wants ${size} px and the mark is only ${meta.width} — refusing to upscale`)
    process.exit(1)
  }
  // `removeAlpha`: the mark is an opaque tile, and a stray alpha channel makes
  // the PNG a third bigger for nothing. Palette quantisation is left to the
  // project compressor, which measures what it costs.
  const buf = await sharp(MASTER)
    .resize(size, size, { fit: 'fill', kernel: 'lanczos3' })
    .removeAlpha()
    .png({ compressionLevel: 9, effort: 10 })
    .toBuffer()
  if (!DRY) {
    mkdirSync(dirname(join(PUBLIC, to)), { recursive: true })
    writeFileSync(join(PUBLIC, to), buf)
  }
  written.push(to)
  console.log(`  → ${to}  ${size}x${size}  ${kb(buf.length)}   (${who})`)
}

const icoPng = await sharp(MASTER)
  .resize(ICO_SIZE, ICO_SIZE, { fit: 'fill', kernel: 'lanczos3' })
  .png({ compressionLevel: 9, effort: 10 })
  .toBuffer()
const ico = icoOf(icoPng, ICO_SIZE)
if (!DRY) writeFileSync(join(PUBLIC, ICO), ico)
console.log(`  → ${ICO}  ${ICO_SIZE}x${ICO_SIZE} PNG payload  ${kb(ico.length)}   (the browser tab; never compressed)`)

// The PNGs are NEW originals written over files that may still have a backup
// from an older mark, so `--fresh` — without it the compressor would measure
// this icon against the last one and ship the last one.
if (!DRY && written.length) {
  console.log('\ncompressing the PNGs (the .ico is deliberately not offered):')
  execFileSync('node', [
    join(ROOT, 'scripts', 'compress-images.mjs'), join(PUBLIC, 'images'),
    '--max-effort', '--backup-dir', 'public-backup', '--fresh',
    // Absolute: the compressor resolves `--only` against its own cwd, not
    // against the root it was handed, and refuses anything that lands outside.
    '--only', written.map((w) => join(PUBLIC, w)).join(',')
  ], { cwd: ROOT, stdio: 'inherit' })
}
console.log(DRY ? '\n--dry: nothing written.' : '\nDone.')
