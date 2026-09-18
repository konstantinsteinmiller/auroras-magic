#!/usr/bin/env node
/**
 * Build EVERY portal package in one go:  pnpm build:all [-- --only=poki,playgama]
 *
 * Each platform is built into its own outDir (`dist-<platform>/`, so no build
 * overwrites another), packed by `pack.mjs`, and its archive copied to
 * `release/auroras-magic-<platform>.zip`. A summary table closes the run.
 *
 * The child `vite build` runs with every `VITE_*` variable STRIPPED from its
 * environment. `process.env` outranks the `.env.<mode>` files, so a flag
 * exported in the calling shell (or left behind by another tool) would
 * silently build, say, a Poki bundle carrying the CrazyGames save strategy —
 * a failure `vite.config.ts` can only catch when two flags are true at once.
 */
import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

/** mode (= `.env.<mode>[.local]`) → pack platform id */
const TARGETS = [
  'crazy-web', 'poki', 'playgama', 'gamepix', 'gamemonetize',
  'game-distribution', 'yandex', 'glitch', 'itch', 'wavedash'
]

const only = (process.argv.find((a) => a.startsWith('--only=')) ?? '').slice(7).split(',').filter(Boolean)
const targets = only.length ? TARGETS.filter((t) => only.includes(t)) : TARGETS
const ROOT = resolve('.')
const RELEASE = join(ROOT, 'release')
mkdirSync(RELEASE, { recursive: true })

const cleanEnv = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('VITE_')))
const vite = join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js')
const results = []

for (const t of targets) {
  const out = `dist-${t}`
  console.log(`\n━━ ${t} ━━`)
  const b = spawnSync(process.execPath, [vite, 'build', '--mode', t, '--base=./', `--outDir=${out}`, '--emptyOutDir'], {
    stdio: 'inherit', env: cleanEnv
  })
  if (b.status !== 0) { results.push({ t, ok: false, why: 'vite build failed' }); continue }
  const zip = join(out, `auroras-magic-${t}.zip`)
  const p = spawnSync(process.execPath, ['tools/pack/pack.mjs', `--platform=${t}`, `--dist=${out}`], {
    stdio: 'inherit', env: cleanEnv
  })
  if (p.status !== 0) { results.push({ t, ok: false, why: 'pack gates failed' }); continue }
  if (existsSync(zip)) copyFileSync(zip, join(RELEASE, `auroras-magic-${t}.zip`))
  results.push({ t, ok: true, bytes: existsSync(zip) ? statSync(zip).size : 0 })
}

console.log('\n  platform              archive')
console.log('  ----------------------------------')
for (const r of results) {
  console.log(`  ${r.t.padEnd(20)}  ${r.ok ? `${(r.bytes / 1024).toFixed(1)} kB` : `FAILED — ${r.why}`}`)
}
console.log(`\n  -> ${RELEASE}\n`)
if (results.some((r) => !r.ok)) process.exit(1)
