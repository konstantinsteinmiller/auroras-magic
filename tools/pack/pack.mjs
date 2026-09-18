#!/usr/bin/env node
/**
 * The heavy compressor, stage 2 — every portal build ends here.
 *
 *   vite build --mode <platform> --base=./     stage 1: terser, 3 passes (vite.config.ts)
 *   node tools/pack/pack.mjs --platform=<p>    stage 2: this file
 *
 * What it does to `dist/`, in order:
 *
 *   1. MINIFY what Vite copies verbatim: every `.html` (whitespace, comments,
 *      inline CSS — never inline JS, which terser already did), the classic
 *      `js/storage-shim.js` from `public/` (terser, safe preset), and every
 *      `.json` (whitespace). The files are rewritten IN PLACE, so `dist/` is the
 *      exact bytes that ship — open it and you are testing the archive.
 *   2. GATE the build the way portal QA would, and fail loudly instead of
 *      uploading something they will reject (see `gates` below).
 *   3. ZIP it with the jam build's minimal container and best-of-N deflate
 *      (zopfli vs four zlib strategies per file), deterministic, then re-open
 *      the archive with a third-party reader and compare every byte.
 *   4. REPORT per-file and total sizes against the platform's budget.
 *
 * Flags
 *   --platform=<name>   crazy-web | poki | playgama | gamepix | gamemonetize |
 *                       game-distribution | glitch | itch | yandex | wavedash | web
 *   --dist=<dir>        default `dist`
 *   --out=<file>        default `<dist>/auroras-magic-<platform>.zip`
 *   --no-zip            minify + gate + report only (Wavedash uploads a folder)
 *   --iterations=<n>    zopfli iterations per file (default 15; 100+ is slow)
 *   --strict            exit 1 when a budget is exceeded
 *   --quiet             one summary line
 */
import { createRequire } from 'node:module'
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, rmSync } from 'node:fs'
import { join, relative, extname, basename, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import { performance } from 'node:perf_hooks'
import { createZip, verifyZip } from './zip.mjs'

const require = createRequire(import.meta.url)
const argv = process.argv.slice(2)
const val = (n, d) => {
  const p = argv.find((a) => a.startsWith(`--${n}=`))
  return p ? p.slice(n.length + 3) : d
}
const has = (n) => argv.includes(`--${n}`)

const PLATFORM = val('platform', 'web')
const DIST = resolve(val('dist', 'dist'))
const OUT = resolve(val('out', join(DIST, `auroras-magic-${PLATFORM}.zip`)))
const ZIP = !has('no-zip')
const ITER = Number(val('iterations', '15')) || 15
const STRICT = has('strict')
const QUIET = has('quiet')

/**
 * Size budgets, in bytes, as the portals publish them. `initial` is what a
 * player downloads before the first frame (index.html + the entry chunk and
 * its static imports); `total` is the whole archive, unpacked.
 */
const MB = 1024 * 1024
const BUDGETS = {
  poki: { initial: 5 * MB, total: 8 * MB },
  playgama: { initial: 30 * MB, total: 250 * MB, perFile: 30 * MB, files: 8000 },
  yandex: { total: 100 * MB },
  'crazy-web': { initial: 20 * MB, total: 250 * MB },
  gamepix: { total: 50 * MB },
  gamemonetize: { total: 50 * MB },
  'game-distribution': { total: 50 * MB },
  glitch: { total: 250 * MB },
  itch: { total: 1024 * MB },
  wavedash: { total: 250 * MB },
  web: {}
}

const tty = process.stdout.isTTY && !process.env.NO_COLOR
const col = (c, s) => (tty ? `\x1b[${c}m${s}\x1b[0m` : s)
const dim = (s) => col(2, s)
const red = (s) => col(31, s)
const green = (s) => col(32, s)
const yellow = (s) => col(33, s)
const say = (...a) => { if (!QUIET) console.log(...a) }
const kb = (n) => (n >= MB ? `${(n / MB).toFixed(2)} MB` : `${(n / 1024).toFixed(1)} kB`)

if (!existsSync(join(DIST, 'index.html'))) {
  console.error(red(`\n  pack: ${DIST}${'/'}index.html not found — run the vite build first.\n`))
  process.exit(1)
}

const t0 = performance.now()

/* ------------------------------ 1. walk ------------------------------ */

/** Everything in dist that ships. Old archives and backups never do. */
const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}
const isArchive = (p) => extname(p) === '.zip'
let files = walk(DIST).filter((p) => !isArchive(p))

/* ----------------------------- 2. minify ----------------------------- */

const { minify: minifyHtml } = require('html-minifier-terser')
const { minify: terser } = require('terser')

const HTML_OPTS = {
  collapseWhitespace: true,
  conservativeCollapse: false,
  removeComments: true,
  removeRedundantAttributes: true,
  removeScriptTypeAttributes: true, // only `text/javascript`; `module` stays
  removeStyleLinkTypeAttributes: true,
  useShortDoctype: true,
  minifyCSS: true,
  // Inline scripts are already terser'd by Vite (and on the single-file GamePix
  // build the inline script IS the whole app — re-minifying it only costs time
  // and risk for nothing).
  minifyJS: false,
  // The CSP meta and SDK tags carry attribute values with quotes and colons.
  removeAttributeQuotes: false,
  sortAttributes: false,
  keepClosingSlash: false
}

const shrink = []
for (const p of files) {
  const ext = extname(p)
  const before = statSync(p).size
  let after = before
  if (ext === '.html') {
    const src = readFileSync(p, 'utf8')
    const out = await minifyHtml(src, HTML_OPTS)
    if (out.length < src.length) { writeFileSync(p, out); after = Buffer.byteLength(out) }
  } else if (ext === '.json') {
    try {
      const out = JSON.stringify(JSON.parse(readFileSync(p, 'utf8')))
      if (out.length < before) { writeFileSync(p, out); after = Buffer.byteLength(out) }
    } catch { /* not strict JSON — leave it */ }
  } else if (ext === '.js' && relative(DIST, p).replace(/\\/g, '/').startsWith('js/')) {
    // `public/js/*` — classic scripts Vite copies verbatim (the storage shim).
    // Script, not module: it must keep its globals, so no toplevel mangling.
    const src = readFileSync(p, 'utf8')
    const r = await terser(src, { compress: { passes: 2 }, mangle: true, format: { comments: false } })
    if (r.code && r.code.length < src.length) { writeFileSync(p, r.code); after = Buffer.byteLength(r.code) }
  }
  if (after < before) shrink.push({ file: relative(DIST, p), before, after })
}

/* ------------------------------ 3. gates ------------------------------ */
//
// Each gate is a rejection some portal has actually sent. They run on the
// MINIFIED bytes, i.e. exactly what goes into the archive.

const rel = (p) => relative(DIST, p).replace(/\\/g, '/')
const indexHtml = readFileSync(join(DIST, 'index.html'), 'utf8')
const problems = []
const warnings = []

// A relative build: every portal serves the game from a path that is not the
// domain root, so an absolute `/assets/...` 404s there and nowhere else.
if (/\s(?:src|href)="\/(?!\/)/.test(indexHtml)) problems.push('index.html references an absolute "/..." path — build with --base=./')
// Backups from the image compressor must never ship (they double the archive).
for (const p of files) if (/-original\.[a-z0-9]+$/i.test(p)) problems.push(`backup file in dist: ${rel(p)}`)
// Source maps publish the original source from a public URL.
for (const p of files) if (extname(p) === '.map') problems.push(`source map in dist: ${rel(p)}`)
// Poki and Playgama/YouTube Playables forbid a CSP meta; Poki forbids any
// external runtime request, which a leftover SDK tag would be.
const hasCsp = /http-equiv="Content-Security-Policy"/i.test(indexHtml)
if ((PLATFORM === 'poki' || PLATFORM === 'playgama') && hasCsp) problems.push(`${PLATFORM} must ship without a CSP meta tag`)
// Each portal's SDK tag belongs in its own build only. Matched as a real
// `<script src>` — the hosts also appear in the CSP allow-list, which is fine.
const tag = (host) => new RegExp(`<script[^>]+src=["'][^"']*${host}`, 'i')
const sdkTags = {
  'crazy-web': tag('sdk\\.crazygames\\.com'),
  gamepix: tag('integration\\.gamepix\\.com'),
  poki: tag('game-cdn\\.poki\\.com'),
  playgama: tag('youtube\\.com/game_api')
}
for (const [plat, re] of Object.entries(sdkTags)) {
  const present = re.test(indexHtml)
  if (plat === PLATFORM && !present) problems.push(`${plat} build is missing its SDK tag in index.html`)
  if (plat !== PLATFORM && present) problems.push(`index.html carries the ${plat} SDK tag on the ${PLATFORM} build`)
}
// index.html must sit at the archive ROOT (P4D, itch, GamePix all require it).
if (!existsSync(join(DIST, 'index.html'))) problems.push('index.html is not at the root of dist')

/* ------------------------------ 4. sizes ------------------------------ */

files = walk(DIST).filter((p) => !isArchive(p))
const sizes = files.map((p) => {
  const buf = readFileSync(p)
  return { file: rel(p), raw: buf.length, gz: gzipSync(buf, { level: 9 }).length }
}).sort((a, b) => b.raw - a.raw)
const total = sizes.reduce((n, f) => n + f.raw, 0)

/** The initial load: index.html, the entry chunk and every chunk it imports
 *  statically, plus the stylesheet and the classic shim. */
const initialSet = new Set(['index.html'])
const entryRefs = [...indexHtml.matchAll(/(?:src|href)="\.?\/?([^"]+\.(?:js|css))"/g)].map((m) => m[1])
const queue = [...entryRefs]
while (queue.length) {
  const f = queue.shift()
  if (initialSet.has(f) || !existsSync(join(DIST, f))) continue
  initialSet.add(f)
  if (f.endsWith('.js')) {
    const code = readFileSync(join(DIST, f), 'utf8')
    // static imports only: `import ... from "./x.js"` / `import "./x.js"`
    for (const m of code.matchAll(/\bimport(?:[^'"()]*?from)?\s*["']\.\/([^"']+\.js)["']/g)) {
      const dir = f.includes('/') ? f.slice(0, f.lastIndexOf('/') + 1) : ''
      queue.push(dir + m[1])
    }
  }
}
const initial = sizes.filter((f) => initialSet.has(f.file)).reduce((n, f) => n + f.raw, 0)

/* ------------------------------ 5. zip ------------------------------- */

let zipBytes = 0
let zipStats = []
if (ZIP) {
  if (existsSync(OUT)) rmSync(OUT)
  // Deterministic order: index.html first (some portal validators only look
  // at the first entry), then everything else sorted by path.
  const entries = files
    .map((p) => ({ name: rel(p), data: readFileSync(p) }))
    .sort((a, b) => (a.name === 'index.html' ? -1 : b.name === 'index.html' ? 1 : a.name.localeCompare(b.name)))
  const { zip, entries: st } = await createZip(entries, { zopfliIterations: ITER })
  verifyZip(zip, entries)
  writeFileSync(OUT, zip)
  zipBytes = zip.length
  zipStats = st
}

/* ------------------------------ report ------------------------------- */

const budget = BUDGETS[PLATFORM] ?? {}
const over = []
if (budget.initial && initial > budget.initial) over.push(`initial ${kb(initial)} > ${kb(budget.initial)}`)
if (budget.total && total > budget.total) over.push(`total ${kb(total)} > ${kb(budget.total)}`)
if (budget.perFile) for (const f of sizes) if (f.raw > budget.perFile) over.push(`${f.file} ${kb(f.raw)} > ${kb(budget.perFile)}`)
if (budget.files && files.length > budget.files) over.push(`${files.length} files > ${budget.files}`)

if (QUIET) {
  console.log(`${PLATFORM} files=${files.length} total=${total} initial=${initial} zip=${zipBytes}`)
} else {
  say(`\n  ${col(1, 'auroras-magic')} ${dim(`— pack · ${PLATFORM}`)}`)
  if (shrink.length) {
    say(dim('\n  minified in place'))
    for (const s of shrink) say(`  ${s.file.padEnd(40)} ${kb(s.before).padStart(10)} -> ${kb(s.after).padStart(10)}`)
  }
  say(dim('\n  file                                          raw       gzip    in zip'))
  say(dim('  ---------------------------------------------------------------------'))
  const packedOf = new Map(zipStats.map((e) => [e.name, e.packed]))
  for (const f of sizes.slice(0, 14)) {
    const star = initialSet.has(f.file) ? '*' : ' '
    say(`  ${star}${f.file.padEnd(40)} ${kb(f.raw).padStart(10)} ${kb(f.gz).padStart(10)} ${ZIP ? kb(packedOf.get(f.file) ?? 0).padStart(9) : ''}`)
  }
  if (sizes.length > 14) say(dim(`   … and ${sizes.length - 14} more`))
  say(dim('  * = initial load'))
  say('')
  say(`  files     ${files.length}`)
  say(`  initial   ${kb(initial)}${budget.initial ? dim(` / ${kb(budget.initial)}`) : ''}`)
  say(`  total     ${kb(total)}${budget.total ? dim(` / ${kb(budget.total)}`) : ''}`)
  if (ZIP) say(`  archive   ${col(1, kb(zipBytes))}  ${dim(`zopfli x${ITER} vs zlib-9 x4 per file, round-trip verified`)}  -> ${relative(process.cwd(), OUT)}`)
  for (const w of warnings) say(yellow(`  ! ${w}`))
  say(dim(`\n  ${((performance.now() - t0) / 1000).toFixed(1)}s\n`))
}

if (problems.length) {
  console.error(red(`  pack: ${problems.length} release gate(s) failed:`))
  for (const p of problems) console.error(red(`    - ${p}`))
  process.exit(1)
}
if (over.length) {
  const msg = `  pack: over the ${PLATFORM} budget: ${over.join('; ')}`
  if (STRICT) { console.error(red(msg)); process.exit(1) }
  console.warn(yellow(msg))
} else if (!QUIET && Object.keys(budget).length) {
  say(green(`  within the ${PLATFORM} budget\n`))
}
