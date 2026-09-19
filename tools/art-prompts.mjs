#!/usr/bin/env node
/**
 * Regenerate `art-sheets/PROMPTS-*.md` from the manifest, with no browser,
 * and write `art-sheets/PAINT-STATUS.md` — what is painted, what is not, and
 * what was painted from a drawing that has since moved.
 *
 *   pnpm art:prompts            # writes the prompt documents + the status
 *   pnpm art:prompts --check    # exits 1 if a prompt document is out of date (CI)
 *
 * The bench (`/#/art-sheets`) writes the same prompt documents on export, with
 * the fits it measured folded into the SIZE clauses; this reads those fits
 * back out of `art-sheets/sheet-index.json`, so both routes produce the same
 * bytes — which is what the Art Desk relies on, since it sends what it parses
 * out of these files. The manifest chain (`artSheet.ts` → `artFolders.ts`,
 * `artIds.ts`) is pure TypeScript; `tools/ts-resolve.mjs` lets Node load it.
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'art-sheets')
const INDEX = join(OUT, 'sheet-index.json')
const PAINTED = join(OUT, 'painted')
const CHECK = process.argv.includes('--check')

const manifest = await import(pathToFileURL(join(ROOT, 'src', 'game', 'artSheet.ts')).href)

/** The fits the bench measured when it last exported, keyed by sheet stem. */
const fitsFromIndex = () => {
  if (!existsSync(INDEX)) return undefined
  try {
    const index = JSON.parse(readFileSync(INDEX, 'utf-8'))
    const fits = {}
    for (const s of index.sheets ?? []) if (s.fit) fits[s.id] = s.fit
    return Object.keys(fits).length ? fits : undefined
  } catch {
    return undefined
  }
}

const fits = fitsFromIndex()
const docs = manifest.promptDocs(fits)
mkdirSync(OUT, { recursive: true })

let stale = 0
for (const [name, text] of Object.entries(docs)) {
  const file = join(OUT, name)
  const current = existsSync(file) ? readFileSync(file, 'utf-8') : null
  if (current === text) {
    console.log(`  = ${name}  unchanged`)
    continue
  }
  stale++
  if (CHECK) {
    console.error(`  ! ${name} is out of date — run pnpm art:prompts`)
    continue
  }
  writeFileSync(file, text, 'utf-8')
  console.log(`  ✓ ${name}  ${(text.length / 1024).toFixed(0)} kB`)
}

// ─── PAINT-STATUS.md ────────────────────────────────────────────────────────
// A report of the filesystem, not a contract: `--check` does not police it.
// The rev of a sheet is the first 12 hex of a sha1 over its clean reference —
// the same number the slicer's receipt records.

const IMAGE = /\.(png|jpe?g|webp)$/i
const revOf = (file) => (existsSync(file) ? createHash('sha1').update(readFileSync(file)).digest('hex').slice(0, 12) : null)
const receipt = (() => {
  try { return JSON.parse(readFileSync(join(PAINTED, '.sliced.json'), 'utf-8')).files ?? {} } catch { return {} }
})()
const paintings = existsSync(PAINTED) ? readdirSync(PAINTED).filter((f) => IMAGE.test(f)) : []
const parked = existsSync(join(PAINTED, 'stale')) ? readdirSync(join(PAINTED, 'stale')).filter((f) => IMAGE.test(f)) : []
const stem = (f) => f.replace(/\.[^.]+$/, '').toLowerCase()

const stateOf = (file, id) => {
  const rev = revOf(join(OUT, `${file}.png`))
  const names = [file, id].map((s) => s.toLowerCase())
  const painting = paintings.find((f) => names.includes(stem(f)))
  if (!painting) {
    return parked.some((f) => names.includes(stem(f)))
      ? { mark: '!', state: 'REPAINT — the old one is parked in `painted/stale/`', rev }
      : { mark: '·', state: 'not painted yet', rev }
  }
  let seen = receipt[painting]
  if (seen?.painting && seen.painting !== revOf(join(PAINTED, painting))) seen = undefined
  if (seen?.rev && rev && seen.rev !== rev) return { mark: '!', state: `REPAINT — the reference changed (${seen.rev} → ${rev})`, rev }
  if (seen?.style && seen.style !== manifest.ART_STYLE_ID) return { mark: '!', state: `REPAINT — painted in art style \`${seen.style}\`, the game is now \`${manifest.ART_STYLE_ID}\``, rev }
  if (!seen) return { mark: '?', state: 'painted, not sliced yet — `pnpm slice-sheets`', rev }
  return { mark: '✓', state: `sliced ${String(seen.at).slice(0, 10)}`, rev }
}

const rows = [
  ...manifest.SECTOR_SHEETS.map((s) => ({ title: `${s.chapter}-${(s.node % 5) + 1} ${s.title}`, doc: 'PROMPTS-SECTORS.md', file: s.file, id: s.id })),
  ...manifest.PORTRAIT_SHEETS.map((s) => ({ title: s.title, doc: 'PROMPTS-PORTRAITS.md', file: s.file, id: s.id })),
  ...manifest.STORY_SHEETS.map((s) => ({ title: `Intro ${s.panel} · ${s.title}`, doc: 'PROMPTS-STORY.md', file: s.file, id: s.id })),
  ...[...manifest.ITEM_SHEETS, ...manifest.KEEPSAKE_SHEETS].map((s) => ({ title: s.title, doc: 'PROMPTS-ITEMS.md', file: s.file, id: s.id })),
  ...manifest.RUNE_SHEETS.map((s) => ({ title: s.title, doc: 'PROMPTS-RUNES.md', file: s.file, id: s.id })),
  ...manifest.ISLAND_SHEETS.map((s) => ({ title: s.title, doc: 'PROMPTS-ISLANDS.md', file: s.file, id: s.id }))
].map((r) => ({ ...r, ...stateOf(r.file, r.id) }))

const tally = { '✓': 0, '!': 0, '?': 0, '·': 0 }
for (const r of rows) tally[r.mark]++

const status = [
  '# Paint status — generated by `pnpm art:prompts`',
  '',
  'A picture of `art-sheets/painted/` and the slicer\'s receipt at the moment it was written. Re-run `pnpm art:prompts` after painting or slicing anything.',
  '',
  `Art style: **${manifest.ART_STYLE_ID}** (\`src/game/artStyle.ts\`, art-style.md §0).`,
  '',
  `**${tally['✓']} sliced · ${tally['!']} need a repaint · ${tally['?']} painted, not sliced · ${tally['·']} outstanding**`,
  '',
  '| | Drawable | Prompt block in | Reference | State |',
  '| --- | --- | --- | --- | --- |',
  ...rows.map((r) => `| ${r.mark} | **${r.title}** | \`${r.doc}\` | \`${r.file}.png\`${r.rev ? ` (rev \`${r.rev}\`)` : ' — *missing: `pnpm art:export`*'} | ${r.state} |`),
  '',
  '* **✓** sliced, and the drawing has not moved since.',
  '* **!** painted from a drawing that has since been RE-CUT: `pnpm slice-sheets` refuses it. Repaint, or `--stale-ok` for a cosmetic change.',
  '* **?** a painting is waiting in `painted/` — slice it.',
  '* **·** nothing painted yet: attach the reference and paste its block.',
  ''
].join('\n')

if (!CHECK) {
  writeFileSync(join(OUT, 'PAINT-STATUS.md'), status, 'utf-8')
  console.log(`  ✓ PAINT-STATUS.md  ${tally['✓']} sliced, ${tally['!']} stale, ${tally['?']} uncut, ${tally['·']} outstanding`)
}

console.log(`\n${rows.length} drawables (${manifest.SECTOR_SHEETS.length} sectors, ${manifest.STORY_SHEETS.length} intro pages, `
  + `${manifest.ITEM_SHEETS.length + manifest.KEEPSAKE_SHEETS.length} items, ${manifest.RUNE_SHEETS.length} runes, `
  + `${manifest.PORTRAIT_SHEETS.length} portrait strips, ${manifest.ISLAND_SHEETS.length} islands), `
  + `${manifest.manifestTargets().size} target files`
  + (fits ? ' — SIZE clauses use the fits the bench measured' : ' — no sheet-index.json yet: SIZE clauses use the nominal extent'))
if (CHECK && stale) process.exit(1)
