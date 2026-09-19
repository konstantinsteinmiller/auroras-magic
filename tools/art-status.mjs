#!/usr/bin/env node
/**
 * Which painted drop-ins are actually on disk, and which are still drawings.
 *
 *   pnpm art:status              # a summary per kind, plus what is missing
 *   pnpm art:status -- --all     # list every file, present or not
 *
 * A miss is SILENT by design — `spriteFor` treats a 404 as "keep drawing this
 * one" — which is right in play and useless at the bench. This reads the
 * manifest's own catalogue (`artSheet.manifestTargets`, the very paths the
 * renderer probes) and looks in `public/`. No browser.
 */
import { existsSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC = join(ROOT, 'public')
const ALL = process.argv.includes('--all')

const { manifestTargets } = await import(pathToFileURL(join(ROOT, 'src', 'game', 'artSheet.ts')).href)

const byKind = new Map()
for (const [target, { kind, id }] of manifestTargets()) {
  if (!byKind.has(kind)) byKind.set(kind, [])
  byKind.get(kind).push({ target, id })
}

let present = 0
let absent = 0
const rows = []
for (const [kind, list] of byKind) {
  const missing = []
  let here = 0
  let bytes = 0
  for (const { target, id } of list) {
    const file = join(PUBLIC, target)
    if (existsSync(file)) {
      here++
      bytes += statSync(file).size
      if (ALL) rows.push(`  ✓ ${target}`)
    } else {
      missing.push(id)
      if (ALL) rows.push(`  · ${target}`)
    }
  }
  present += here
  absent += missing.length
  const size = bytes ? ` — ${(bytes / 1024).toFixed(0)} kB` : ''
  console.log(`${here === list.length ? '✓' : here === 0 ? '·' : '½'} ${kind.padEnd(12)} ${String(here).padStart(3)}/${list.length}${size}`)
  if (missing.length && !ALL && here) {
    const shown = missing.slice(0, 10).join(', ')
    console.log(`    missing: ${shown}${missing.length > 10 ? `, …and ${missing.length - 10} more` : ''}`)
  }
}
if (ALL) console.log(rows.join('\n'))
console.log(`\n${present} painted, ${absent} still drawn, ${present + absent} in the catalogue.`)
if (absent) {
  console.log('A missing file is not an error: the renderer draws that one. The art layer is off in every'
    + '\nbuild until VITE_ENABLE_ART_OVERRIDES says otherwise; `?art=on` flips it for one device.')
}
