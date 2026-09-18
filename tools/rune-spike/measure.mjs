/**
 * The S0 rune spike: a repeatable measurement of the whole 12-rune alphabet
 * against the REAL recogniser (story-spec §5.8, §5.11).
 *
 *   node --import ./tools/ts-resolve.mjs tools/rune-spike/measure.mjs [--n 1000] [--seed 999]
 *
 * 1000 draws per rune by default: at 300 the standard error is ~1.2 points, so
 * a rune that really sits at 95.7 % flickers across the 95 % gate by seed alone.
 *
 * It imports `src/game/duel/runes.ts` and `shapes.ts` directly (through
 * `tools/ts-resolve.mjs`), so the numbers always describe the shipped code,
 * never a hand-copied stand-in. Prints:
 *   1. a confusion row per rune: 1000 sloppy draws each, all 12 runes active;
 *   2. junk false-accept against the full alphabet;
 *   3. the frozen four's corpus with ALL runes active, compared with the
 *      checked-in fixture. A new rune must never steal a shipped rune's
 *      stroke.
 * It exits non-zero if an S0 gate fails (§5.11.2): < 95 % on a new rune,
 * > 5 % junk, or any frozen-corpus change.
 *
 * Noise model (same as the spec's measurements): random rotation 0–360°,
 * aspect 0.65–1.6, size 45–260 px, 0–7 px jitter, pointer-densified.
 */
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const load = (rel) => import(pathToFileURL(join(ROOT, rel)).href)
const { recognise, templateCounts, ALL_RUNES_MASK } = await load('src/game/duel/runes.ts')
const { RUNE_DEFS } = await load('src/game/duel/runeDefs.ts')
const { buildRuneCorpus } = await load('tests/duel/rune-corpus.gen.ts')

const { stream, sloppy, junkDraw, JUNK } = await load('tests/duel/rune-draws.ts')

const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > 0 ? Number(process.argv[i + 1]) : def
}
const DRAWS = arg('n', 1000)
const rnd = stream(arg('seed', 999))

const slugOf = (id) => (id < 0 ? 'rejected' : RUNE_DEFS[id].slug)
const pct = (n, d) => `${((n / d) * 100).toFixed(1)}%`
let failed = false

console.log(`Rune spike — ${RUNE_DEFS.length} runes, ${templateCounts().reduce((a, b) => a + b, 0)} templates, ${DRAWS} sloppy draws per rune\n`)

/* 1. confusion rows */
console.log('Intended      correct  (other outcomes)')
for (const def of RUNE_DEFS) {
  const tally = {}
  for (let i = 0; i < DRAWS; i++) {
    const stroke = sloppy(def.slug, rnd)
    const r = slugOf(recognise(stroke, ALL_RUNES_MASK))
    tally[r] = (tally[r] ?? 0) + 1
  }
  const ok = tally[def.slug] ?? 0
  const rest = Object.entries(tally)
    .filter(([k]) => k !== def.slug)
    .map(([k, v]) => `${k} ${pct(v, DRAWS)}`)
    .join(', ')
  const isNew = def.id > 3
  const gate = isNew && ok / DRAWS < 0.95
  if (gate) failed = true
  console.log(`${def.slug.padEnd(12)} ${pct(ok, DRAWS).padStart(6)}  ${rest ? `(${rest})` : ''}${gate ? '   ← below the 95 % S0 target' : ''}`)
}

/* 2. junk */
console.log('\nJunk false-accept (all runes active)')
for (const name of Object.keys(JUNK)) {
  let accepted = 0
  const hits = {}
  for (let i = 0; i < DRAWS; i++) {
    const stroke = junkDraw(name, rnd)
    const r = recognise(stroke, ALL_RUNES_MASK)
    if (r >= 0) {
      accepted++
      hits[slugOf(r)] = (hits[slugOf(r)] ?? 0) + 1
    }
  }
  const bad = accepted / DRAWS > 0.05
  if (bad) failed = true
  console.log(`${name.padEnd(20)} ${pct(accepted, DRAWS).padStart(6)}${accepted ? `  (${Object.entries(hits).map(([k, v]) => `${k} ${v}`).join(', ')})` : ''}${bad ? '   ← over the 5 % S0 limit' : ''}`)
}

/* 3. the frozen four with every rune active */
const fixture = JSON.parse(readFileSync(join(ROOT, 'tests', 'duel', 'rune-corpus.fixture.json'), 'utf8'))
const corpus = buildRuneCorpus()
let moved = 0
const junkNow = {}
corpus.forEach((c, i) => {
  const r = recognise(c.stroke, ALL_RUNES_MASK)
  if (c.bucket === 'junk') {
    if (r !== fixture.results[i]) junkNow[slugOf(r)] = (junkNow[slugOf(r)] ?? 0) + 1
  } else if (r !== fixture.results[i]) moved++
})
if (moved) failed = true
console.log(`\nFrozen corpus (500 shipped-rune strokes) with ALL runes active: ${moved === 0 ? 'identical to the fixture' : `${moved} strokes CHANGED ← S0 fails`}`)
console.log(`Corpus junk that a new rune now claims: ${Object.keys(junkNow).length ? Object.entries(junkNow).map(([k, v]) => `${k} ${v}`).join(', ') : 'none'}`)

console.log(`\nS0 gate: ${failed ? 'FAIL' : 'PASS'}`)
process.exitCode = failed ? 1 : 0
