import { fileURLToPath, URL } from 'node:url'
import { resolve, dirname } from 'node:path'
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'

import { defineConfig, loadEnv, type Plugin } from 'vite'

// `/art-sheets` (dev only) bakes the whole procedural cast onto reference
// sheets so it can be handed to an image model and sliced back in. The browser
// can render the sheets but cannot put them where they belong — a download
// lands in the user's Downloads folder under whatever name Chrome decides — so
// the bench POSTs each finished sheet here and this writes it into
// `art-sheets/` in the repo.
//
//   POST /__art/save-sheet  { name, dataUrl }  → writes a binary file
//   POST /__art/save-sheet  { name, text }     → writes a text file
//
// Dev only, and the name is whitelisted rather than sanitised: this is a
// file-writing endpoint, so it takes a flat basename made of safe characters
// and nothing else. No separators, no dots leading a segment, no escaping out
// of the directory.
/** Read a dev-server request body as UTF-8. */
const readBody = (req: import('node:http').IncomingMessage): Promise<string> =>
  new Promise((res, rej) => {
    const chunks: Buffer[] = []
    req.on('data', c => chunks.push(c))
    req.on('end', () => res(Buffer.concat(chunks).toString('utf-8')))
    req.on('error', rej)
  })

const ART_SHEET_DIR = resolve(fileURLToPath(new URL('./art-sheets', import.meta.url)))
const SAFE_SHEET_NAME = /^[A-Za-z0-9][A-Za-z0-9._@-]{0,79}$/

const artSheetsPlugin = (): Plugin => ({
  name: 'art-sheets',
  apply: 'serve',
  // The sheets land inside the project root, so without this the dev server
  // watches its own output: the first PNG written triggers a full page reload,
  // which tears down the bench in the middle of writing the other fifty.
  config: () => ({ server: { watch: { ignored: ['**/art-sheets/**'] } } }),
  configureServer(server) {
    server.middlewares.use('/__art/save-sheet', async (req, res, next) => {
      if (req.method !== 'POST') { next(); return }
      const fail = (code: number, error: string) => {
        res.statusCode = code
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error }))
      }
      try {
        const body = JSON.parse(await readBody(req)) as
          { name?: string; dataUrl?: string; text?: string }
        const name = body.name ?? ''
        if (!SAFE_SHEET_NAME.test(name) || name.includes('..')) {
          fail(400, 'name must be a flat basename of [A-Za-z0-9._@-]')
          return
        }
        mkdirSync(ART_SHEET_DIR, { recursive: true })
        const file = resolve(ART_SHEET_DIR, name)
        // Belt and braces: even a name that passed the pattern must land
        // inside the directory we meant.
        if (dirname(file) !== ART_SHEET_DIR) { fail(400, 'name escaped the sheet directory'); return }

        if (typeof body.text === 'string') {
          writeFileSync(file, body.text, 'utf-8')
        } else if (typeof body.dataUrl === 'string') {
          const comma = body.dataUrl.indexOf(',')
          if (comma < 0 || !body.dataUrl.startsWith('data:')) { fail(400, 'dataUrl is not a data URI'); return }
          writeFileSync(file, Buffer.from(body.dataUrl.slice(comma + 1), 'base64'))
        } else {
          fail(400, 'expected { name, dataUrl } or { name, text }')
          return
        }

        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ ok: true, path: `art-sheets/${name}` }))
      } catch (e) {
        fail(400, String((e as Error).message))
      }
    })
  }
})

// Read the package version directly so APP_VERSION resolves regardless of
// how vite is invoked. `process.env.npm_package_version` is only set when
// vite runs via `pnpm run <script>` — running `pnpm vite` directly leaves
// it undefined, which makes Vite log the literal define entry as a warning.
const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf-8')
) as { version?: string }
const appVersion: string = pkg.version ?? '0.0.0'
// ─── The baked leaderboard ──────────────────────────────────────────────────
//
// It ships `data/leaderboard-snapshot.json` as the virtual module
// `virtual:leaderboard-snapshot`, which `src/use/leaderboardSnapshot.ts`
// re-exports and `useLeaderboard` falls back to.
//
// PASS `true` FOR EVERY BUILD, not just the offline portals. The snapshot does
// two different jobs:
//
//   • On Poki and Yandex — the portals that forbid the runtime request, which
//     `loadEnv` surfaces here as an empty `VITE_LEADERBOARD_URL` — it IS the
//     leaderboard. There is no other board on those builds.
//   • On every live build it is the bottom rung of `useLeaderboard`'s offline
//     ladder: what a player sees when the fetch fails and their device has no
//     cache of its own yet. That is not hypothetical — the Worker's D1
//     row-read allowance ran out mid-afternoon and `/top` threw for every live
//     build at once, which without this shows a first-time player "Couldn't
//     reach the leaderboard". It costs ~1.7 kB gzipped.
//
// The refresh runs as a CHILD PROCESS of `scripts/leaderboard-snapshot.mjs` —
// the same code path `pnpm leaderboard:snapshot` runs, so the build cannot
// drift from the manual command, and a fetch that hangs or throws cannot take
// the vite process with it. It is allowed to fail: the file is committed, so a
// build with no network bakes the last known board instead of quietly shipping
// without the feature.


/**
 * The SEEDED board, for builds that can never write to the real one.
 *
 * Poki forbids every external runtime request and Yandex rejects third-party
 * storage URLs, so neither can post a score — their baked copy is not a stale
 * view of a living board, it is the entire board for the life of the build.
 * Seeding those from the live snapshot ranks their players against a 2 422-row
 * sample of everyone who ever opened the game once, 56 % of whom never passed
 * stage 2. `scripts/leaderboard-seed.mjs` builds a modelled retention curve
 * instead; the file it writes is committed and deterministic.
 */
const SEED_FILE = resolve(
  fileURLToPath(new URL('./data/leaderboard-seed.json', import.meta.url))
)

const SNAPSHOT_VIRTUAL_ID = 'virtual:leaderboard-snapshot'
const SNAPSHOT_RESOLVED = '\0' + SNAPSHOT_VIRTUAL_ID
const SNAPSHOT_FILE = resolve(
  fileURLToPath(new URL('./data/leaderboard-snapshot.json', import.meta.url))
)
const SNAPSHOT_SCRIPT = resolve(
  fileURLToPath(new URL('./scripts/leaderboard-snapshot.mjs', import.meta.url))
)

interface LeaderboardSnapshotFile {
  /** When this process last pulled it off the Worker — the freshness clock. */
  fetchedAt: number
  updatedAt: number
  total: number
  entries: { rank: number; name: string; score: number; flair: number }[]
  dist: [number, number][]
}

/** How recently the file must have been fetched for the build to accept it as
 *  already current. Long enough that a `build:*` script's own refresh (and a
 *  run of several portal builds back to back) costs the Worker ONE request. */
const SNAPSHOT_FRESH_MS = 10 * 60_000

const readSnapshotFile = (file: string): LeaderboardSnapshotFile | null => {
  if (!existsSync(file)) return null
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf-8')) as Partial<LeaderboardSnapshotFile>
    if (!Array.isArray(parsed.entries) || !Array.isArray(parsed.dist)) return null
    if (!(Number(parsed.total) > 0)) return null
    return {
      fetchedAt: Number(parsed.fetchedAt) || 0,
      updatedAt: Number(parsed.updatedAt) || 0,
      total: Number(parsed.total),
      entries: parsed.entries,
      dist: parsed.dist
    }
  } catch {
    return null
  }
}

/**
 * THE FIRST SCENE'S CODE GOES OUT WITH THE HTML (the loading pass, 2026-09-24).
 *
 * `AppScene` — the whole game — is a lazy route, so the browser only asks for
 * it at the END of the boot chain: the entry, then `main.ts` initialising the
 * save, then `App.vue`, then the locale, then the router. On a slow phone
 * connection that chain started the game's biggest chunk ~2.5 s after the page
 * did, with the line idle between each step. A `modulepreload` for it (and the
 * chunks it statically imports) puts it on the wire at once, in parallel —
 * and so do the chain's own two always-needed links, `App.vue` and the English
 * messages, which were each another round trip in the queue.
 *
 * FETCH ONLY — a preload does not evaluate the module, so nothing in the game
 * reads `localStorage` before `SaveManager.init()` has hydrated it (the reason
 * `main.ts` imports `App.vue` only after the save). A single-file build has no
 * such chunk and gets nothing; the href carries the build's base, so a
 * `--base=./` portal archive stays relative.
 */
const preloadFirstScenePlugin = (): Plugin => {
  let base = '/'
  return {
    name: 'auroras-magic-preload-first-scene',
    apply: 'build',
    configResolved(c) { base = c.base || '/' },
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        const bundle = ctx.bundle
        if (!bundle) return
        type Chunk = {
          type: 'chunk'; fileName: string; imports: string[]; isEntry: boolean; isDynamicEntry: boolean
          facadeModuleId: string | null; viteMetadata?: { importedCss?: Set<string> }
        }
        const chunks = Object.values(bundle).filter((c) => c.type === 'chunk') as unknown as Chunk[]
        const scene = chunks.find((c) => c.isDynamicEntry && /[\\/]src[\\/]views[\\/]AppScene\.vue$/.test(c.facadeModuleId ?? ''))
        if (!scene) return
        const closure = (from: Chunk[]): Set<string> => {
          const seen = new Set<string>()
          const walk = (f: string): void => {
            const c = bundle[f] as unknown as Chunk | undefined
            if (!c || c.type !== 'chunk' || seen.has(f)) return
            seen.add(f)
            for (const i of c.imports) walk(i)
          }
          for (const c of from) walk(c.fileName)
          return seen
        }
        const eager = closure(chunks.filter((c) => c.isEntry))
        // The two links of the boot chain EVERY boot walks, one after the
        // other: `App.vue` (imported once the save is up) and the English
        // messages (the locale, or its fallback). Default priority — they are
        // the chain itself.
        const chain = chunks.filter((c) => c.isDynamicEntry
          && /[\\/]src[\\/](App\.vue|i18n[\\/]locales[\\/]en\.ts)$/.test(c.facadeModuleId ?? ''))
        const first = [...closure(chain)].filter((f) => !eager.has(f))
        const late = [...closure([scene])].filter((f) => !eager.has(f) && !first.includes(f))
        const css = new Set<string>()
        for (const f of [...first, ...late]) for (const c of (bundle[f] as unknown as Chunk).viteMetadata?.importedCss ?? []) css.add(c)
        // `low` for the game: the ENTRY and its short chain (the save, App,
        // the locale) must win the line — the game's code only has to be
        // there by the time that chain asks for it, not before it.
        return [
          ...first.map((f) => ({
            tag: 'link',
            attrs: { rel: 'modulepreload', crossorigin: true, href: `${base}${f}` },
            injectTo: 'head' as const
          })),
          ...late.map((f) => ({
            tag: 'link',
            attrs: { rel: 'modulepreload', crossorigin: true, fetchpriority: 'low', href: `${base}${f}` },
            injectTo: 'head' as const
          })),
          ...[...css].map((f) => ({
            tag: 'link',
            attrs: { rel: 'preload', as: 'style', crossorigin: true, href: `${base}${f}` },
            injectTo: 'head' as const
          }))
        ]
      }
    }
  }
}

/**
 * @param seeded whether this build can never gain a real player (Poki, Yandex —
 *   no endpoint, so no writes). Those bake the modelled board; every other
 *   target bakes the real snapshot as the bottom rung of its offline ladder.
 */
const leaderboardSnapshotPlugin = (seeded: boolean): Plugin => ({
  name: 'auroras-magic-leaderboard-snapshot',
  buildStart() {
    if (seeded) {
      // Nothing to fetch: the seed is generated from a curve, committed, and
      // deterministic. Re-running `pnpm leaderboard:seed` reproduces it byte for
      // byte, so a build never needs to and never should.
      const seed = readSnapshotFile(SEED_FILE)
      if (seed) {
        console.log(
          `[leaderboard] baking the SEEDED board — ${seed.total} players / `
          + `${seed.entries.length} rows, top score ${seed.dist[0]?.[0] ?? 0}. `
          + 'This build cannot post scores, so the board is modelled.'
        )
      } else {
        console.warn(
          `[leaderboard] no seed at ${SEED_FILE} — run \`pnpm leaderboard:seed\`. `
          + 'This build has no leaderboard.'
        )
      }
      return
    }

    // The `build:*` scripts refresh it themselves, so the file is usually
    // seconds old by the time this runs. Refetching would be a second round
    // trip for the same bytes — and building five portal targets in a row would
    // be five. This hook is the SAFETY NET for anyone invoking `vite build
    // --mode <x>` directly, which is why it stays.
    const onDisk = readSnapshotFile(SNAPSHOT_FILE)
    const fresh = onDisk !== null && Date.now() - onDisk.fetchedAt < SNAPSHOT_FRESH_MS
    if (!fresh) {
      try {
        execFileSync(process.execPath, [SNAPSHOT_SCRIPT], { stdio: 'inherit', timeout: 60_000 })
      } catch {
        // Offline, or the Worker is down. The committed file stands in.
        console.warn(
          '[leaderboard] could not refresh the snapshot — building with the committed copy.'
        )
      }
    }
    const snap = readSnapshotFile(SNAPSHOT_FILE)
    if (snap) {
      console.log(
        `[leaderboard] baking ${snap.total} players / ${snap.entries.length} rows `
        + `(board of ${new Date(snap.updatedAt).toISOString().slice(0, 10)})`
      )
    } else {
      // Not a build failure: `leaderboardEnabled` goes false and the game ships
      // exactly as it did before, with no board and no rank cell.
      console.warn(
        `[leaderboard] no usable snapshot at ${SNAPSHOT_FILE} — this build has no leaderboard.`
      )
    }
  },
  resolveId(id) {
    if (id === SNAPSHOT_VIRTUAL_ID) return SNAPSHOT_RESOLVED
    return null
  },
  load(id) {
    if (id !== SNAPSHOT_RESOLVED) return null
    return `export default ${JSON.stringify(readSnapshotFile(seeded ? SEED_FILE : SNAPSHOT_FILE))}`
  }
})

import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import javascriptObfuscator from 'vite-plugin-javascript-obfuscator'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { buildCsp } from './src/platforms/csp'
import { buildPlaygamaBridgeConfig, playgamaLeaderboardEnv } from './src/platforms/playgama/bridgeConfig'

// https://vite.dev/config/
export default defineConfig(({ mode, command }) => {
  // Load env file based on `mode` in the current working directory.
  // The third parameter '' loads all env vars regardless of VITE_ prefix.
  const env = loadEnv(mode, process.cwd(), '')

  // ─── Exactly ONE platform flag per build ──────────────────────────────
  // Vite MERGES `.env` with `.env.<mode>`, so any platform flag set in the
  // base `.env` stays true for every mode that does not explicitly clear it.
  // That is not cosmetic: `resolveSaveStrategy` and `resolveAdProvider` both
  // take the FIRST matching arm, so an inherited flag silently HIJACKS the
  // build — the portal's own strategy/provider never loads, and on a
  // CrazyGames leak `persistToRaw=false` (CG cloud-only mode) additionally
  // scrubs local state on every boot. Nothing in the build output hints at it.
  // Fail loudly at config time instead: the fix is to set the other flags to
  // `false` in that mode's env file (see `.env.yandex.local` / `.env.poki.local`
  // for the pattern) or to clear them in the base `.env` before building.
  const PLATFORM_FLAGS = [
    'VITE_APP_CRAZY_WEB', 'VITE_APP_WAVEDASH', 'VITE_APP_ITCH', 'VITE_APP_GLITCH',
    'VITE_APP_GAME_DISTRIBUTION', 'VITE_APP_PLAYGAMA', 'VITE_APP_GAMEPIX',
    'VITE_APP_GAME_MONETIZE', 'VITE_APP_YANDEX', 'VITE_APP_POKI'
  ] as const
  const activePlatformFlags = PLATFORM_FLAGS.filter((f) => env[f] === 'true')
  if (activePlatformFlags.length > 1) {
    throw new Error(
      `[vite] ${activePlatformFlags.join(', ')} are ALL true in mode "${mode}". `
      + 'Exactly one platform flag may be set per build — the save strategy and '
      + 'ad provider both take the first matching arm, so the extra flag would '
      + 'hijack this build. Set the others to false in the mode env file.'
    )
  }

  // Only obfuscate during a real production build — never during dev,
  // where the obfuscator rewrites dynamic import strings into lookups
  // Vite can no longer transform, breaking module specifiers at runtime.
  const isProduction = (mode === 'production' || env.VITE_NODE_ENV === 'production') && command === 'build'
  const shouldObfuscate = env.VITE_ENABLE_OBFUSCATION === 'true'

  // Initialize plugins array
  const plugins = []

  // Art-sheet export endpoint. `apply: 'serve'`, so it is not in any build.
  plugins.push(artSheetsPlugin())
  // The leaderboard, baked. A build with no Worker URL (Poki, Yandex, Playgama/
  // Playables — no external calls) bakes the SEEDED board: the rank badge only,
  // from a modelled curve. Every other build bakes the live snapshot as the
  // bottom rung of its offline ladder.
  plugins.push(leaderboardSnapshotPlugin(!env.VITE_LEADERBOARD_URL))
  // The game's own chunk on the wire with the HTML — fetched, not run.
  plugins.push(preloadFirstScenePlugin())


  // Only push the obfuscator if both conditions are met
  if (isProduction && shouldObfuscate) {
    console.log('--- 🛡️  Obfuscating Production Build ---')
    plugins.push(
      javascriptObfuscator({
        // Exclude files with dynamic imports — the obfuscator's stringArray
        // rewrites import paths into array lookups that Vite can no longer
        // resolve, which breaks code splitting.
        exclude: [
          /router\/index\.ts$/,
          /main\.ts$/,
          // i18n loader uses `import.meta.glob` for per-locale code
          // splitting — the obfuscator's stringArray rewrites those
          // dynamic paths so rollup can no longer produce separate
          // chunks (every locale ends up inlined in index.js).
          /i18n[\\/]index\.ts$/,
          // resolveSaveStrategy uses `await import('@/...')` inside
          // `import.meta.env.VITE_APP_*`-gated branches so Rollup can
          // tree-shake unused platform plugins. Obfuscation would
          // mangle the dynamic-import literals and break runtime
          // module resolution. (resolveAdProvider stays static-import
          // sync, so it doesn't need an exclude.)
          /platforms[\\/]resolveSaveStrategy\.ts$/,
          // useCrazyGames is the CrazyGames save-strategy delegate that
          // resolveSaveStrategy hands off to. It lazy-loads
          // `@/utils/save/CrazyGamesStrategy` via dynamic import. Without
          // this exclude the obfuscator's stringArray rewrite mangles the
          // literal, Vite can't resolve the `@/` alias, and the browser
          // surfaces `Failed to resolve module specifier
          // '@/utils/save/CrazyGamesStrategy'` at runtime (CG QA flagged
          // it 2026-05-20).
          /use[\\/]useCrazyGames\.ts$/,
          // GameDistributionProvider lazy-loads the heavy
          // `@/utils/gameDistributionPlugin` (~500 LOC) via dynamic
          // import so non-GD builds don't ship the GD SDK code.
          // Same obfuscator-vs-dynamic-import constraint as above.
          /use[\\/]ads[\\/]GameDistributionProvider\.ts$/,
          // PlaygamaProvider lazy-loads `@/utils/playgamaPlugin` for the
          // same reason — keeps the ~280 LOC bridge module off non-Playgama
          // builds. The obfuscator would mangle the dynamic-import literal.
          /use[\\/]ads[\\/]PlaygamaProvider\.ts$/,
          // `playgamaBridgeLoader.ts` is the ONE place `@playgama/bridge`
          // (Bridge v2, npm) enters the graph, behind an env-literal ternary
          // around `import('@playgama/bridge')`. Same dynamic-import constraint.
          /utils[\\/]playgamaBridgeLoader\.ts$/,
          // GamepixProvider lazy-loads `@/utils/gamepixPlugin` so the
          // GamePix SDK glue only ships on GamePix builds. Same
          // obfuscator-vs-dynamic-import constraint as the others.
          /use[\\/]ads[\\/]GamepixProvider\.ts$/,
          // FLogoProgress dynamic-imports `@/utils/playgamaPlugin` and
          // `@/utils/gamepixPlugin` to fire the certification-mandatory
          // `game_ready` / `gameLoaded` edges. Without this exclude the
          // obfuscator wraps the string literal in a stringArray-decoder
          // call expression — Rollup can't statically analyse it for
          // alias resolution, so `@/utils/...` survives into the chunk
          // and the browser surfaces `Failed to resolve module specifier
          // '@/utils/gamepixPlugin'` at runtime.
          //
          // NOTE: no `$` end-anchor — Vue SFCs are presented to the
          // obfuscator's transform hook as virtual paths like
          // `FLogoProgress.vue?vue&type=script&setup=true&lang.ts`,
          // which an anchored regex would miss. Match anywhere on the
          // path so both the raw `.vue` file AND the script-block
          // virtual module are excluded.
          /components[\\/]atoms[\\/]FLogoProgress\.vue/,
          // useAssets.preloadAssets dynamic-imports the duel's layout + arena
          // modules to bake the island behind the splash. Same
          // obfuscator-vs-dynamic-import constraint as above.
          /use[\\/]useAssets\.ts$/,
          // The art schedule reaches the sector painters and the live save
          // through dynamic imports (so the kits stay out of its light chunk).
          // Same obfuscator-vs-dynamic-import constraint: mangled, the built
          // bundle threw `Failed to resolve module specifier
          // '@/game/map/sectors'` and every stage after the splash was lost.
          /game[\\/]artSchedule\.ts$/,
          // capabilities.ts has per-platform URL-detector helpers (with
          // hostname literals like `'crazygames'`, `'wavedash'`, `'glitch.fun'`,
          // ...) gated by env-literal IFs so Rollup can tree-shake the dead
          // branches per build. The obfuscator's `stringArray` transform runs
          // BEFORE esbuild's constant folding can fold `import.meta.env.X === 'true'`,
          // baking every hostname into the indirection table regardless of
          // which build is active. Excluding capabilities.ts keeps the
          // constant-fold + tree-shake path intact so on a Yandex build the
          // bundle contains no non-Yandex hostnames — required by Yandex's
          // moderator ("Service storage URL detected").
          /platforms[\\/]capabilities\.ts$/,
          // plattformText.ts is the per-build "available on <hostname>" string
          // mapping. Same obfuscator-vs-stringArray issue as capabilities.ts —
          // the ladder needs env-literal DCE to keep non-active hostnames out
          // of the bundle. The file is intentionally tiny so excluding it
          // doesn't meaningfully reduce obfuscation coverage of App.vue (which
          // still gets obfuscated normally and just imports from this helper).
          /platforms[\\/]plattformText\.ts$/,
          // useCheats lazy-loads `@/game/duel/state` for its shortcuts. Without
          // this exclude the stringArray rewrite mangles the literal and the
          // BUILT bundle throws `Failed to resolve module specifier` the moment
          // cheats are enabled — which is exactly when someone is debugging a
          // built bundle. The cheats self-gate on `localStorage.cheat`.
          /use[\\/]useCheats\.ts$/,
          // The gameplay fan-out's dynamic Playgama import follows the same rule.
          /use[\\/]useGameplayLifecycle\.ts$/
        ],
        // ─── Obfuscation profile (tuned 2026-04-30) ─────────────────────
        // The previous profile enabled every aggressive transform the
        // plugin offers — `controlFlowFlattening`, `numbersToExpressions`,
        // `splitStrings`, `unicodeEscapeSequence`. Combined they were
        // inflating the bundle by ~3.4× over the unobfuscated baseline
        // (e.g. 217KB → 768KB on the entry chunk for the CrazyGames
        // build flagged by CG QA on 2026-04-30).
        //
        // The transforms removed below all have the same trade-off:
        // huge bundle / runtime cost for protection that any
        // off-the-shelf deobfuscator strips in seconds. Keeping them on
        // costs real users real download time without preventing a
        // motivated reverse-engineer for more than a coffee break.
        //
        // What stays (cheap, useful):
        //   • compact            — single-line output
        //   • simplify           — CFG simplification
        //   • stringArray        — string indirection table
        //   • stringArrayThreshold 0.6 — moderate coverage
        //
        // What was removed (expensive, low-value):
        //   • unicodeEscapeSequence — every `"foo"` → `"foo"`
        //     ~doubles strings on the wire. Trivially reversed.
        //   • splitStrings          — splits every string into 2-char
        //     pieces concatenated at runtime. Triples string size,
        //     interpretable by any human in <1 minute.
        //   • controlFlowFlattening — wraps every block in a switch
        //     dispatcher. ~30% bundle inflation, ~10% runtime perf hit.
        //   • numbersToExpressions  — every literal `5` becomes
        //     `0x4 + 0x1` etc. Bloats math-heavy modules (the canvas
        //     game loop is full of these).
        //
        // If a tighter profile is needed later, prefer enabling
        // `controlFlowFlattening` selectively on a small allowlist of
        // sensitive files (anti-cheat hot paths, license checks) rather
        // than blanket-enabling everywhere.
        options: {
          compact: true,
          simplify: true,
          stringArray: true,
          stringArrayThreshold: 0.6
        }
      } as any)
    )
  }

  // ─── CSP generation ────────────────────────────────────────────────
  // The whole per-platform CSP shape lives in `src/platforms/csp.ts`
  // — extracted so it's unit-testable. Adding a new platform's CSP
  // contribution = edit that file, not this one.
  //
  // YANDEX EXCEPTION: do NOT inject a CSP meta tag on Yandex builds. The
  // game runs inside Yandex's own iframe wrapper, which injects its own
  // production CSP (that's exactly what `@yandex-games/sdk-dev-proxy --csp`
  // fetches + applies during local testing). Our own meta tag is therefore
  // redundant — AND it's the last place in the bundle that names Yandex
  // service hostnames like `yastatic.net` (Yandex's static-storage CDN),
  // `an.yandex.ru`, `yandexadexchange.net`. Yandex's moderation auto-check
  // flags those as "Service storage URL detected" (requirement: no absolute
  // URLs to Yandex service storage in the game's own code). Omitting the
  // meta tag entirely leaves index.html with ZERO Yandex-service URLs and
  // lets Yandex's wrapper own the security policy. The placeholder comment
  // is simply removed so it doesn't ship either.
  const isYandexBuild = env.VITE_APP_YANDEX === 'true'
  // GamePix, like Yandex, hosts the game in its own environment and applies its
  // own CSP. Our meta tag is redundant there and the GamePix testing toolkit's
  // wrapper surfaced it as a `script-src` "blocks the use of 'eval'" violation
  // (the GamePix SDK + its Google ad-creative chain need `eval`/`Function`).
  // Skipping our meta tag on the GamePix build lets GamePix's environment own
  // the policy — same exception we already make for Yandex.
  const isGamepixBuild = env.VITE_APP_GAMEPIX === 'true'
  // POKI: same exception, stronger reason — and this is the single most
  // important line of the Poki integration. Poki applies a PER-GAME allowlist
  // server-side (P4D -> Settings -> CSP) and its core SDK injects an entire ad
  // stack INTO OUR IFRAME: Google Publisher Tag, IMA, Amazon TAM and a prebid
  // waterfall (securepubads.g.doubleclick.net, imasdk.googleapis.com,
  // prebid.adnxs.com, aax.amazon-adsystem.com, onetag-sys.com, ...). Our own
  // meta tag would block the whole waterfall and report NOTHING: the game runs,
  // `commercialBreak()` resolves, and no ad ever plays. Whitelisting those hosts
  // is the wrong fix too — the list rotates with Poki's ad partners. Emit no
  // meta tag and let P4D own the policy.
  const isPokiBuild = env.VITE_APP_POKI === 'true'
  // PLAYGAMA / YOUTUBE PLAYABLES: same exception again, and the reason is the
  // strongest of the four. This archive is also the YouTube Playables
  // submission, and Playables runs the game under YOUTUBE'S OWN CSP inside a
  // document it shares with YouTube's runtime. A game-authored policy fights
  // the host's, and CSP violations are a named Playables rejection reason
  // (YT-FAQ) — dynamically created script tags that lack YouTube's nonce get
  // blocked at runtime, which is invisible to every local test.
  //
  // It also removes the last place in the bundle that names every OTHER
  // portal's hosts: the meta tag is a single string listing crazygames,
  // gamedistribution, wavedash, clarity.ms, jsonbin.io and the rest, and a
  // reviewer grepping the archive finds all of them there and nowhere else.
  // Dropping the tag takes those strings out with it.
  const isPlaygamaBuild = env.VITE_APP_PLAYGAMA === 'true'
  const skipCspMeta = isYandexBuild || isGamepixBuild || isPokiBuild || isPlaygamaBuild
  const cspValue = buildCsp(env)

  plugins.push({
    name: 'inject-csp',
    transformIndexHtml(html: string) {
      return html.replace(
        '<!-- CSP meta tag injected by vite.config.ts at build time -->',
        skipCspMeta
          ? ''
          : `<meta http-equiv="Content-Security-Policy" content="${cspValue}" />`
      )
    }
  })

  // Strip the CrazyGames SDK <script> tag from index.html for non-CrazyGames builds
  // so it doesn't block or error on other platforms (e.g. Wavedash).
  const isCrazyWeb = env.VITE_APP_CRAZY_WEB === 'true'
  if (!isCrazyWeb) {
    plugins.push({
      name: 'strip-crazygames-sdk',
      transformIndexHtml(html: string) {
        return html.replace(
          /<!-- Load the SDK before your game code -->\s*<script[^>]*sdk\.crazygames\.com[^>]*><\/script>\s*/,
          ''
        )
      }
    })
  }

  // No Playgama <script> tag to strip any more: Bridge v2 is bundled from the
  // `@playgama/bridge` npm package behind a build-gated dynamic import
  // (`src/utils/playgamaBridgeLoader.ts`), so it only exists in this build.
  const isPlaygama = env.VITE_APP_PLAYGAMA === 'true'

  // Strip YouTube's Playables SDK tag from every build EXCEPT Playgama's.
  //
  // This is the inverse of the other strips in spirit: the tag is not a perf
  // shave we can take or leave, it is mandatory on the one build that reaches
  // Playables. `build:playgama` IS the Playables submission — Playgama is an
  // official partner and forwards that single archive to YouTube — so the tag
  // must survive exactly there and nowhere else. On other portals a foreign
  // SDK URL in index.html is at best a stray DNS lookup and at worst a
  // moderation flag (Yandex rejects absolute foreign service URLs outright).
  if (!isPlaygama) {
    plugins.push({
      name: 'strip-youtube-sdk',
      transformIndexHtml(html: string) {
        return html.replace(
          /<!--\s*YouTube Playables SDK[^]*?-->\s*<script[^>]*youtube\.com\/game_api[^>]*><\/script>\s*/,
          ''
        )
      }
    })
  }

  // Strip the GamePix SDK <script> tag from non-GamePix builds. Same reason
  // as the Playgama strip — we don't want an extra DNS lookup to
  // integration.gamepix.com on other portals. The plugin polls for
  // `window.GamePix` after init and stays inert if it never appears.
  const isGamepix = env.VITE_APP_GAMEPIX === 'true'
  if (!isGamepix) {
    plugins.push({
      name: 'strip-gamepix-sdk',
      transformIndexHtml(html: string) {
        return html.replace(
          /<!-- Load the SDK before your game code -->\s*<script[^>]*integration\.gamepix\.com[^>]*><\/script>\s*/,
          ''
        )
      }
    })
  }

  // Strip the Poki SDK <script> tag from non-Poki builds. Same reason as the
  // Playgama / GamePix strips — no extra DNS lookup to game-cdn.poki.com on
  // other portals, and (unlike those two) a foreign SDK URL left in index.html
  // is exactly what Yandex moderation rejects as "Service storage URL detected".
  // The plugin re-injects the tag at runtime if a QA wrapper serves its own
  // index.html, so stripping it here is safe.
  const isPoki = env.VITE_APP_POKI === 'true'
  if (!isPoki) {
    plugins.push({
      name: 'strip-poki-sdk',
      transformIndexHtml(html: string) {
        return html.replace(
          /<!-- Poki SDK[^>]*-->\s*<script[^>]*game-cdn\.poki\.com[^>]*><\/script>\s*/,
          ''
        )
      }
    })
  }

  // ─── GamePix single-file bundle ─────────────────────────────────────────
  // The GamePix build CDN serves the root `index.html` (200) but intermittently
  // 403s the hashed `assets/*.js` / `assets/*.css` chunks — the 403 body is XML,
  // so the browser refuses the ES module ("blocked due to MIME application/xml")
  // and the app never finishes loading → dead UI, no ad calls. Verified end-to-
  // end in a real browser that the ad chain itself works when assets load, so
  // this is purely the CDN refusing separate chunks. Inline the ENTIRE app
  // (JS + CSS) into index.html for the GamePix build so there are no separate
  // code chunks to refuse — the one file the CDN already serves carries
  // everything. Runtime-URL assets (`images/`, `audio/`, fetched by string URL,
  // not build-time imports) stay external and load fine. GamePix-only; other
  // platforms keep normal code-splitting. Obfuscation is off for GamePix, and
  // the CSP already allows `'unsafe-inline'` scripts on this ad-waterfall build,
  // so the inlined bundle isn't a CSP regression.
  if (isGamepix) {
    // Cast to `any` — the plugin ships its own (mismatched) Vite Plugin types,
    // same reason the obfuscator plugin above is cast.
    plugins.push(viteSingleFile() as any)
  }

  // Emit `playgama-bridge-config.json` ONLY for the Playgama mode — into the
  // build, and answered by the dev server under `vite --mode playgama`. NOT
  // served from `public/` because Vite would expose it in every other
  // mode's dev server and `dist/` — which historically baked
  // `forciblySetPlatformId: 'playgama'` and made the bridge hang in
  // localhost / QA-tool contexts (which speak different protocols than
  // the production portal). The config here intentionally OMITS
  // `forciblySetPlatformId` so the bridge auto-detects the right protocol.
  //
  // The config also switches on Playgama's SaaS leaderboard when `.env.playgama`
  // carries both its id and the dashboard's public token — see
  // `src/platforms/playgama/bridgeConfig.ts`.
  if (isPlaygama) {
    const playgamaBoard = playgamaLeaderboardEnv(env)
    if ((playgamaBoard.id.length > 0) !== (playgamaBoard.token.length > 0)) {
      console.warn(
        '[playgama] VITE_PLAYGAMA_LEADERBOARD_ID and PLAYGAMA_SAAS_PUBLIC_TOKEN must be set together — '
        + 'building WITHOUT the Playgama leaderboard.'
      )
    }
    const playgamaBridgeConfigJson = JSON.stringify(buildPlaygamaBridgeConfig(env), null, 2)
    const playgamaBridgeConfigPlugin: Plugin = {
      name: 'emit-playgama-bridge-config',
      // The bridge fetches `./playgama-bridge-config.json` on every boot. With
      // no file there, the dev server's SPA fallback answers with index.html
      // and the bridge logs "Config parsing error. SyntaxError: Unexpected
      // token '<'" and boots on its defaults — so the dev server serves the
      // same bytes the build ships.
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (!(req.url ?? '').split('?')[0].endsWith('/playgama-bridge-config.json')) { next(); return }
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Cache-Control', 'no-cache')
          res.end(playgamaBridgeConfigJson)
        })
      },
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'playgama-bridge-config.json',
          source: playgamaBridgeConfigJson
        })
      }
    }
    plugins.push(playgamaBridgeConfigPlugin)
  }

  // Foreign-platform code is kept out of the Yandex bundle via `resolve.alias`
  // stubs (see the resolve.alias block below), NOT by deleting emitted chunks.
  //
  // The previous approach — a `generateBundle` hook that DELETED chunks like
  // `gamepixPlugin-*.js` — was fundamentally unsafe: `MawScene.vue` STATICALLY
  // imports `gamePixHappyMoment` from `@/utils/gamepixPlugin`, so Rollup emits
  // gamepixPlugin as a shared chunk that MawScene depends on. Deleting that
  // chunk left MawScene's import dangling → 404 at runtime → "Failed to fetch
  // dynamically imported module: MawScene" → the whole game failed to load on
  // Yandex. Stub-aliasing instead swaps the real module (with its SDK URL) for
  // a tiny no-op module BEFORE bundling, so the URL never enters the build AND
  // the import resolves to a valid chunk. No chunk deletion, no 404.

  return {
    base: '/',
    server: {
      port: 2050
    },
    define: {
      APP_VERSION: JSON.stringify(appVersion)
    },
    plugins: [
      tailwindcss(),
      vue(),
      // vueDevTools(),
      VueI18nPlugin({
        // 1. Tell the plugin where your global translation files are
        include: resolve(dirname(fileURLToPath(import.meta.url)), './src/locales/**'),

        // 2. This allows you to use YAML in the <i18n> block
        // The plugin usually detects yaml automatically, but you can force
        // strict behavior if needed by ensuring the 'yaml' loader is available.
        defaultSFCLang: 'yaml'
      }),
      ...plugins
    ],
    resolve: {
      alias: {
        // On non-CrazyGames builds, redirect `@/use/useCrazyGames` to a
        // no-op stub. The real module contains the literal SDK environment
        // identifier 'crazygames' + `[crazygames]` console log prefixes;
        // many components statically import from it, so its strings end up
        // in the bundle of every build even when the functions are no-ops
        // at runtime. Yandex's moderator flags those non-Yandex identifier
        // strings as "Service storage URL detected", so the alias forces
        // the bundle to use the stub on non-CG builds and the strings stay
        // out entirely. MUST appear BEFORE the `@` / `@/` catch-alls so the
        // more-specific path wins resolution.
        // The other-portal Ad/Save providers are STATICALLY imported by
        // `resolveAdProvider` / `resolveSaveStrategy`. Even on a Yandex build
        // where every `createXxxProvider()` function is dead code (the
        // env-gated arm never executes), the function BODIES — including
        // their `name: 'crazygames'` / `name: 'gamemonetize'` / etc. string
        // literals — live in the chunk. Yandex's moderator flags non-Yandex
        // identifier strings as "Service storage URL detected". Aliasing each
        // foreign-portal provider to a no-op stub on non-active builds keeps
        // the strings out of the bundle entirely. Same pattern for the heavy
        // `useCrazyGames` module which is statically imported by many Vue
        // components for `stopGameplay` / `triggerHappytime` etc.
        ...(env.VITE_APP_CRAZY_WEB === 'true' ? {} : {
          '@/use/useCrazyGames': fileURLToPath(new URL('./src/use/useCrazyGames.stub.ts', import.meta.url)),
          '@/use/ads/CrazyGamesProvider': fileURLToPath(new URL('./src/use/ads/CrazyGamesProvider.stub.ts', import.meta.url))
        }),
        ...(env.VITE_APP_GAME_DISTRIBUTION === 'true' ? {} : {
          '@/use/ads/GameDistributionProvider': fileURLToPath(new URL('./src/use/ads/GameDistributionProvider.stub.ts', import.meta.url))
        }),
        ...(env.VITE_APP_PLAYGAMA === 'true' ? {} : {
          '@/use/ads/PlaygamaProvider': fileURLToPath(new URL('./src/use/ads/PlaygamaProvider.stub.ts', import.meta.url)),
          // The provider stub closed only the STATIC path; `main.ts`,
          // `FLogoProgress`, the gameplay fan-out and the save resolver reach
          // the plugin through `await import()`, and a dynamic import is a
          // chunk that ships whether or not it can run. See the stub's header.
          '@/utils/playgamaPlugin': fileURLToPath(new URL('./src/utils/playgamaPlugin.stub.ts', import.meta.url))
        }),
        ...(env.VITE_APP_GAMEPIX === 'true' ? {} : {
          '@/use/ads/GamepixProvider': fileURLToPath(new URL('./src/use/ads/GamepixProvider.stub.ts', import.meta.url)),
          // gamepixPlugin is STATICALLY imported by MawScene.vue (for
          // gamePixHappyMoment), so Rollup emits it as a shared chunk MawScene
          // depends on. The real module hardcodes the GamePix SDK URL
          // (integration.gamepix.com) which Yandex moderation flags. Alias to
          // the stub so the URL never enters the bundle AND MawScene's import
          // resolves to a valid no-op chunk (no 404 — the bug that broke game
          // loading when we tried deleting the chunk instead).
          '@/utils/gamepixPlugin': fileURLToPath(new URL('./src/utils/gamepixPlugin.stub.ts', import.meta.url))
        }),
        ...(env.VITE_APP_GAME_MONETIZE === 'true' ? {} : {
          '@/use/ads/GameMonetizeProvider': fileURLToPath(new URL('./src/use/ads/GameMonetizeProvider.stub.ts', import.meta.url))
        }),
        ...(env.VITE_APP_YANDEX === 'true' ? {} : {
          // YandexProvider statically imports `@/utils/yandexPlugin`, which
          // hardcodes `an.yandex.ru` / `yandex.ru` ad-system URLs — and
          // `resolveAdProvider` statically imports the provider, so those hosts
          // were landing in EVERY other platform's bundle (found in the Poki
          // entry chunk). Same stub-swap fix as the four providers above.
          '@/use/ads/YandexProvider': fileURLToPath(new URL('./src/use/ads/YandexProvider.stub.ts', import.meta.url)),
          // The provider stub above only closed the STATIC path. `main.ts` and
          // `FLogoProgress.vue` still `await import('@/utils/yandexPlugin')`,
          // and a dynamic import is a chunk — so every build was emitting a
          // `yandexPlugin-*.js` carrying the `yandex.ru/ads/system` URL even
          // though nothing called it. Found in the Playgama archive, which is
          // also the YouTube Playables submission, where another portal's ad
          // stack in the bundle is a certification finding. Same stub-swap.
          '@/utils/yandexPlugin': fileURLToPath(new URL('./src/utils/yandexPlugin.stub.ts', import.meta.url))
        }),
        // INVERTED POLARITY versus every other alias here: this one swaps out
        // ON a platform rather than off it. The analytics probe walks other
        // portals' globals (`PokiSDK`, `GamePix`) plus `gtag` / `dataLayer`,
        // and the Playgama archive is also the YouTube Playables submission —
        // where external analytics are banned outright and those names are
        // precisely what a reviewer greps for. A guard inside the probe was
        // measured and did NOT keep the literals out (stringArray hoists before
        // the env fold), so the whole module is aliased away instead.
        ...(env.VITE_APP_PLAYGAMA === 'true' ? {
          '@/use/analyticsSink': fileURLToPath(new URL('./src/use/analyticsSink.stub.ts', import.meta.url))
        } : {}),
        ...(env.VITE_APP_POKI === 'true' ? {} : {
          '@/use/ads/PokiProvider': fileURLToPath(new URL('./src/use/ads/PokiProvider.stub.ts', import.meta.url)),
          // pokiPlugin is STATICALLY imported by `useGameplayLifecycle.ts` (which
          // GameScene depends on) and re-exported by the `platforms/poki` barrel,
          // so it lands in every build's module graph. The real module hardcodes
          // the PokiSDK URL, and the env-literal `if` at the call site is NOT
          // enough to keep it out: the obfuscator's stringArray pass hoists
          // string literals into its indirection table BEFORE esbuild folds the
          // env comparison, so the URL survives DCE. Same mechanism, and the same
          // reason, as the gamepixPlugin alias above.
          '@/utils/pokiPlugin': fileURLToPath(new URL('./src/utils/pokiPlugin.stub.ts', import.meta.url))
        }),
        // The dev server's simulated ads: every BUILD gets the stub. The
        // `import.meta.env.DEV` guard in `resolveAdProvider` stops the call, but
        // the obfuscator hoisted the module's strings before the env fold, and
        // a "TEST AD" card shipped in the GameMonetize bundle. `tools/pack`
        // fails any archive that still carries it.
        ...(command === 'build' ? {
          '@/use/ads/DevAdProvider': fileURLToPath(new URL('./src/use/ads/DevAdProvider.stub.ts', import.meta.url))
        } : {}),
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@/': fileURLToPath(new URL('./src/', import.meta.url)),
        '#': fileURLToPath(new URL('./src/assets', import.meta.url))
      },
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue']
    },
    build: {
      // ─── The heavy compressor, stage 1: terser, multi-pass ───────────────
      //
      // Carried over from the jam build's 13 kB pipeline (see BUILD.md), minus
      // the transforms that are only safe in a 13 kB game nobody else touches:
      // no property mangling (Vue and the portal SDKs reach props by name), no
      // `booleans_as_integers` (`=== true` checks exist in SDK glue), no
      // `unsafe_*` (they assume no library monkey-patches builtins), and
      // `keep_fargs` stays on (vue-router reads guard arity). What remains is
      // pure win: several compress passes, top-level mangling inside each ES
      // chunk, and every comment gone. Console calls are KEPT — portal QA
      // reads the `[playgama]` / `[save]` lines. Stage 2 is `tools/pack`.
      minify: 'terser',
      terserOptions: {
        ecma: 2020,
        module: true,
        toplevel: true,
        compress: {
          ecma: 2020,
          module: true,
          toplevel: true,
          passes: 3,
          drop_debugger: true,
          hoist_props: true,
          inline: 3,
          reduce_funcs: true,
          reduce_vars: true,
          collapse_vars: true,
          join_vars: true,
          negate_iife: true,
          sequences: true
        },
        mangle: { toplevel: true },
        format: { comments: false, ecma: 2020 }
      },
      // Source maps follow the obfuscator EXCEPT on production platform builds.
      //
      // `!shouldObfuscate` alone conflates two different questions. Turning the
      // obfuscator off for a portal is a QA decision — Playgama and YouTube
      // review by hand, and an obfuscated stack trace cannot be mapped back to
      // a source line — but it must not have the side effect of PUBLISHING the
      // source: a portal build is served from a public URL, so shipping maps
      // hands over the original files and adds megabytes to an archive that is
      // measured against a size budget.
      sourcemap: !shouldObfuscate && !isProduction
    }
  }
})
