# Build pipeline — the heavy compressor

Auroras Magic ships to a dozen portals, each as one archive. The pipeline that
made the jam build fit 13,312 bytes (esbuild → terser → roadroller → zopfli
zip) is carried over wherever it still pays on a Vue app. Where it does not,
the reason is recorded below.

```
src/  ──vite build──►  dist-<platform>/  ──tools/pack──►  auroras-magic-<platform>.zip
        stage 1                            stage 2
        · Rollup code-split, env-folded    · minify HTML / JSON / classic shim in place
        · terser, 3 passes, top-level      · release gates (fail the build)
          mangling, no comments            · zopfli vs zlib ×4 per file, minimal zip
        · per-platform stub aliases          container, deterministic
        · obfuscator where the .env says   · round-trip verified with fflate
                                           · size report vs the portal's budget
```

## Commands

| Command | What it does |
| --- | --- |
| `pnpm build:all` | Every portal, each into `dist-<p>/`, packed, archives collected in `release/`. `-- --only=poki,playgama` for a subset. |
| `pnpm build:<platform>` | One portal into `dist/` + `dist/auroras-magic-<platform>.zip`. |
| `pnpm build:web` | No portal flag; the plain web build, packed. |
| `pnpm pack -- --platform=<p> [--dist=dir] [--iterations=100] [--strict]` | Re-run stage 2 on an existing build. |

## Stage 1 — terser in Vite (`vite.config.ts` → `build.terserOptions`)

Kept from the jam config: multiple compress passes (3; the jam build used 12,
but a 400 kB bundle gains almost nothing past 3 and pays in build time),
top-level mangling inside each ES chunk, every comment dropped.

Deliberately **not** kept, because each one is only safe in a 13 kB game that
no library shares:

| Jam setting | Why it is off here |
| --- | --- |
| property mangling (`--mangle-all-props`) | Vue templates, vue-i18n and every portal SDK reach properties by name; chunks would also be mangled inconsistently. |
| `booleans_as_integers` | SDK glue compares `=== true`. |
| `unsafe_*` family | Assumes nobody patches builtins; portal SDKs and ad stacks do. |
| `keep_fargs: false` | vue-router reads navigation-guard arity. |
| `drop_console` | Portal QA reads the `[playgama]` / `[save]` / `[pause]` console lines. |

## Stage 2 — `tools/pack/pack.mjs`

1. **Minify in place** the files Vite copies verbatim: `index.html`
   (whitespace, comments, inline CSS; inline JS is already terser'd), the classic
   `js/storage-shim.js` (terser, script-safe), and every `.json`. `dist/` is then
   byte-for-byte what ships.
2. **Gates.** Each is a rejection a portal has actually sent:
   - no absolute `"/…"` paths in `index.html` (portals serve from a sub-path);
   - no `*-original.*` compressor backups, no `.map` source maps;
   - Poki and Playgama/Playables ship **no CSP meta**;
   - each portal's SDK `<script>` tag appears in its own build and nowhere else
     (YouTube's `game_api` only in the Playgama archive, which is also the
     Playables submission).
3. **Zip.** The jam build's writer (`tools/pack/zip.mjs`): minimal container
   (no extra fields, no data descriptors, fixed 1980 timestamp), best of zopfli
   and four zlib strategies per file, STORE when incompressible. `index.html`
   is the first entry. It never shells out to `tar -a -cf`, which writes a TAR
   under GNU tar that P4D rejects as "We couldn't read your zip file".
4. **Verify.** The archive is re-opened with fflate (a third-party reader) and
   every entry is compared byte for byte.
5. **Report.** Per-file raw / gzip / in-zip sizes, the initial-load set (index,
   entry chunk, its static imports, stylesheet, shim) and the budget:

| Portal | Budget checked |
| --- | --- |
| Poki | initial ≤ 5 MB, total ≤ 8 MB |
| Playgama / YouTube Playables | initial ≤ 30 MB, per file ≤ 30 MB, total ≤ 250 MB, ≤ 8000 files |
| CrazyGames | initial ≤ 20 MB |
| others | total, informational |

`--strict` turns a budget overrun into a failed build.

## Why roadroller is not in the portal pipeline

Roadroller unpacks its payload with `eval`. Every CSP this project ships
forbids `unsafe-eval`, and Poki and Playables review builds by hand. It would
also make a ~400 kB bundle pay a decode on every cold boot, on the phones the
portals grade load time on, and portal CDNs already serve gzip/brotli, so the
transfer win largely disappears. The jam build's own rule applies: roadroller
wins only while its decoder is cheap compared with the payload.

## The unobfuscated twin

Builds with `VITE_ENABLE_OBFUSCATION=true` can't be audited by grep (the
string-array pass hides every literal). To check what a portal build really
contains (foreign SDK hosts, the Page Visibility API on Playgama), build a
clear twin into a scratch folder:

```bash
# PowerShell
$env:VITE_ENABLE_OBFUSCATION='false'; npx vite build --mode poki --base=./ --outDir=dist-clear
```

## Images

The duel has no gameplay bitmaps yet. When painted art arrives, compress it
before it reaches a build: `pnpm compress-folder public/images --backup-dir
public-backup`. Backups inside `public/` would ship in every archive, which is
exactly what the `-original.*` gate catches.
