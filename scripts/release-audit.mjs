#!/usr/bin/env node
/**
 * release-audit — bundle purity per portal, on UNOBFUSCATED twins
 * (new-web-game-playbook Phase 7; story-spec §8.21, S7).
 *
 *   node scripts/release-audit.mjs --build            # build every twin, then audit
 *   node scripts/release-audit.mjs                    # audit the twins already built
 *   node scripts/release-audit.mjs --build --only poki,playgama
 *
 * Why twins: every check that greps a build is unfalsifiable on an obfuscated
 * bundle — the string-array pass hoists literals into a table, so a hit
 * proves nothing (dead) and a miss proves nothing (`document[o(617)](…)`). So
 * each portal is built once more with the obfuscator OFF (and nothing else
 * changed) into `.release-audit/<platform>/`, and THAT is what is read.
 *
 * Checks, per build:
 *   • its OWN portal SDK is in it (the fingerprint: this is the build you think)
 *     and no OTHER portal's SDK host is — the CSP meta tag included;
 *   • no source maps ship;
 *   • the dev-only art bench and playground (S6) never ship;
 *   • Poki: no external request of any kind but its own SDK, no CSP meta;
 *   • Playgama (= the YouTube Playables archive): the `game_api/v1` tag, no CSP
 *     meta, no Page Visibility API, no `navigator.language`, no leaderboard
 *     request;
 *   • Yandex: no leaderboard request (its moderators reject third-party URLs);
 *   • sizes: total bytes and the entry chunk.
 * Exits 1 on any FAIL; `!` lines are warnings for a human to read.
 *
 * VENDOR code is read separately: Playgama's Bridge v2 (bundled from npm, the
 * route Playgama itself documents for self-contained builds) knows every
 * platform it can run on, so it names a dozen hosts and touches the Page
 * Visibility API internally. That is the SDK, not the game: the checks that
 * police OUR code skip it, and its hosts are counted on their own line.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'

const ROOT = resolve('.')
const OUT = join(ROOT, '.release-audit')
const args = process.argv.slice(2)
const BUILD = args.includes('--build')
const onlyAt = args.indexOf('--only')
const only = onlyAt >= 0 ? (args[onlyAt + 1] ?? '').split(',').filter(Boolean) : []

/** Every portal's SDK host (or signature), for the foreign-SDK check. */
const PORTALS = {
  'crazy-web': /sdk\.crazygames\.com/,
  gamepix: /integration\.gamepix\.com/,
  gamemonetize: /api\.gamemonetize\.com/,
  'game-distribution': /html5\.api\.gamedistribution\.com/,
  poki: /game-cdn\.poki\.com|poki-sdk\.js/,
  // Yandex loads its SDK from the bare relative path its wrapper routes.
  yandex: /yandex\.(ru|net)\/[^'"\s]*sdk|['"]\/sdk\.js['"]/,
  playgama: /youtube\.com\/game_api\/v1/
}
/** A portal whose SDK loader compiles out while its id is blank. */
const ID_VARS = { 'game-distribution': 'VITE_GAME_DISTRIBUTION_GAME_ID', gamemonetize: 'VITE_GAME_ID' }
const TARGETS = ['crazy-web', 'poki', 'playgama', 'gamepix', 'gamemonetize', 'game-distribution', 'yandex', 'glitch', 'itch', 'wavedash']
const targets = only.length ? TARGETS.filter((t) => only.includes(t)) : TARGETS
const VENDOR = /playgama-bridge/
/** Documentation links in comments and library strings, not requests. */
const DOC_HOSTS = /^(www\.w3\.org|localhost|127\.0\.0\.1|example\.com|github\.com|vuejs\.org|reactjs\.org|developer\.mozilla\.org|html\.spec\.whatwg\.org|tc39\.es|bugs\.chromium\.org|bugs\.webkit\.org|bugzil\.la|crbug\.com|feross\.org|mths\.be|npms\.io|git\.io|goo\.gl|bit\.ly)$/

const envOf = (mode) => {
  const out = {}
  for (const f of ['.env', `.env.${mode}`, `.env.${mode}.local`]) {
    if (!existsSync(join(ROOT, f))) continue
    for (const line of readFileSync(join(ROOT, f), 'utf-8').split(/\r?\n/)) {
      const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
      if (m) out[m[1]] = m[2].trim()
    }
  }
  return out
}

const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)])

const hostsIn = (s) => [...new Set([...s.matchAll(/https?:\/\/([a-z0-9.-]+\.[a-z]{2,})/gi)].map((m) => m[1].toLowerCase()))]
  .filter((h) => !DOC_HOSTS.test(h))

if (BUILD) {
  for (const t of targets) {
    // Every VITE_* stripped from the child, as build-all does: an exported
    // flag outranks `.env.<mode>` and silently builds the wrong portal.
    const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('VITE_')))
    env.VITE_ENABLE_OBFUSCATION = 'false'
    process.stdout.write(`building ${t} (clear) … `)
    const r = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--mode', t, '--base=./', `--outDir=${join(OUT, t)}`, '--emptyOutDir', '--logLevel', 'error'], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf-8' })
    console.log(r.status === 0 ? 'ok' : `FAILED\n${r.stderr}`)
    if (r.status !== 0) process.exit(1)
  }
}

let fails = 0
const report = []
for (const t of targets) {
  const dir = join(OUT, t)
  if (!existsSync(dir)) { console.log(`\n${t}: no twin at ${relative(ROOT, dir)} — run with --build`); fails++; continue }
  const files = walk(dir)
  const text = files.filter((f) => ['.js', '.html', '.css', '.json', '.webmanifest'].includes(extname(f)))
  const src = text.filter((f) => !VENDOR.test(f)).map((f) => readFileSync(f, 'utf-8')).join('\n')
  const vendor = text.filter((f) => VENDOR.test(f)).map((f) => readFileSync(f, 'utf-8')).join('\n')
  const html = existsSync(join(dir, 'index.html')) ? readFileSync(join(dir, 'index.html'), 'utf-8') : ''
  const lines = []
  const fail = (m) => { lines.push(`  ✗ ${m}`); fails++ }
  const pass = (m) => lines.push(`  ✓ ${m}`)
  const warn = (m) => lines.push(`  ! ${m}`)

  const idVar = ID_VARS[t]
  const idBlank = !!idVar && !envOf(t)[idVar]
  if (PORTALS[t]) {
    if (PORTALS[t].test(src)) pass('its own portal SDK is in it')
    else if (idBlank) warn(`its own SDK loader is compiled out: ${idVar} is blank (the owner supplies it before release)`)
    else fail('its own portal SDK is NOT in it — is this the right build?')
  }
  if (idBlank && PORTALS[t]?.test(src)) warn(`${idVar} is blank: the SDK boots without a game id until the owner supplies it`)
  const foreign = Object.entries(PORTALS).filter(([p, re]) => p !== t && re.test(src)).map(([p]) => p)
  if (foreign.length) fail(`carries another portal's SDK: ${foreign.join(', ')}`)
  else pass('no other portal\'s SDK')
  const maps = files.filter((f) => f.endsWith('.map'))
  if (maps.length) fail(`${maps.length} source map(s) ship`)
  else pass('no source maps')
  if (/__art\/save-sheet|Art sheets|PROMPTS-SECTORS|Playground/.test(src)) fail('the dev-only art bench or playground shipped')
  else pass('no dev-only art views')
  if (/clarity\.ms|jsonbin|getpantry|peerjs|sentry\.io/.test(src)) fail('a survivalist service is still named (Clarity, jsonbin, getpantry, PeerJS, Sentry)')
  else pass('no leftover survivalist services')
  const csp = /http-equiv=["']Content-Security-Policy/i.test(html)
  const hosts = hostsIn(src)
  const lb = /workers\.dev/.test(src)
  if (t === 'poki') {
    const extra = hosts.filter((h) => !/poki\.(com|io)$/.test(h))
    if (extra.length) fail(`external hosts on Poki: ${extra.join(', ')}`)
    else pass('no external host but Poki\'s own')
    if (csp) fail('a CSP meta tag ships (Poki injects its own ad stack; a self-imposed policy kills it)')
    else pass('no CSP meta')
  }
  if (t === 'playgama') {
    if (/youtube\.com\/game_api\/v1/.test(html)) pass('the YouTube game_api/v1 tag')
    else fail('no YouTube game_api/v1 tag — the Bridge waits for it forever')
    if (csp) fail('a CSP meta tag ships'); else pass('no CSP meta')
    if (/['"]visibilitychange['"]/.test(src)) fail('our code references the Page Visibility API'); else pass('no Page Visibility API in our code')
    if (/navigator\.languages?\b/.test(src)) fail('our code references navigator.language'); else pass('no navigator.language in our code')
    if (lb) fail('a leaderboard request ships'); else pass('no leaderboard request (baked board)')
    const extra = hosts.filter((h) => !/(youtube\.com|playgama\.com)$/.test(h))
    if (extra.length) fail(`our code names external hosts: ${extra.join(', ')}`)
    else pass('our code names no external host but YouTube and Playgama')
  }
  if (t === 'yandex') {
    if (lb) fail('a leaderboard request ships'); else pass('no leaderboard request (baked board)')
  }
  if (!['poki', 'playgama', 'yandex'].includes(t)) lines.push(`  · leaderboard ${lb ? 'live' : 'baked'}; CSP meta ${csp ? 'yes' : 'no'}`)
  lines.push(`  · external hosts: ${hosts.join(', ') || 'none'}`)
  if (vendor) lines.push(`  · vendor (Playgama Bridge v2): ${hostsIn(vendor).length} hosts of its own platforms, e.g. ${hostsIn(vendor).slice(0, 4).join(', ')}`)
  const total = files.reduce((n, f) => n + statSync(f).size, 0)
  const entry = /<script[^>]+type="module"[^>]+src="\.?\/?([^"]+)"/.exec(html)?.[1]
  const entryBytes = entry && existsSync(join(dir, entry)) ? statSync(join(dir, entry)).size : 0
  lines.push(`  · ${(total / 1024).toFixed(0)} kB in ${files.length} files; entry chunk ${entry ? `${(entryBytes / 1024).toFixed(0)} kB` : 'inlined (single file)'}`)
  report.push(`\n${t}\n${lines.join('\n')}`)
}
console.log(report.join('\n'))
console.log(`\n${fails ? `${fails} FAIL` : 'all clear'} across ${targets.length} builds`)
process.exit(fails ? 1 : 0)
