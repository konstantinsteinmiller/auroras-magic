# Auroras Magic — implementation plan

Resume point for any session. Update the status column as work lands.

## Where this came from

* **Game source:** `C:\Users\konst\Documents\__p\unicornbow`, branch **`main`**
  (`d9156e1`, "<13kb opimization, wavedash ready, submitted"). The checkout in
  that folder sits on a *detached* `2bd901c`, which still carries the older
  "Plague of Light" swarm game in `main.js`, so it is **not** the duel.
  Rune-icorn: Duels = `src/{main,state,runes,sim,arena,chars,fx,audio,render,ui,u}.js`
  on `main`.
* **Architecture donor:** this repo was a copy of `survivalist` (Vue 3 + Vite +
  pug + Tailwind, the full portal build matrix, SaveManager, ad providers,
  pause/mute gates, i18n in 21 locales, art + image-compression pipelines).
  Everything removed here still exists in `../survivalist`.

## Step 1 — migration ✅ (awaiting sign-off)

| # | Work | Status |
|---|------|--------|
| 1 | Remove survivalist game code, assets, docs, tests, leaderboard backend, bare-git junk (`HEAD`, `config`, `description`, `hooks/`, `info/`) | ✅ |
| 2 | Port the duel engine to TypeScript under `src/game/duel/`: recogniser, rules, NPC, fx, arena, characters, procedural audio, logic unchanged | ✅ |
| 3 | Canvas world in `GameScene.vue`; HUD, onboarding, callouts, result panel and shop in Vue (pug + Tailwind), in the same 1280×720 stage coordinates | ✅ side-by-side screenshot vs the original build |
| 4 | Portrait layout (duel window fitted to the width, drawing pad below, CAST in thumb reach) + safe areas | ✅ 320×658 … 430×932 |
| 5 | Persist through the one state blob `auroras_magic_state` (`am_*` fields) via SaveManager | ✅ cloud-hydrate + flush tests |
| 6 | Procedural audio on the shared AudioContext → pause gate, platform mute, ad hard-stop all cover it | ✅ |
| 7 | Portal contracts: gameplay bracket gated on the first trusted touch, ad before result panel, rewarded ×2 / consolation coins gated on readiness, happytime, first-load interstitial, platform pause stops the sim | ✅ `pnpm qa:portal` green on GameMonetize, GamePix, CrazyGames (both policies), plain web |
| 8 | i18n: new key set in `en.ts`, propagated to all 21 locales; `<html lang/dir>` stamped (Arabic RTL) | ✅ parity test + browser check |
| 9 | Heavy compressor: terser multi-pass in Vite + `tools/pack` (minify, gates, zopfli zip, round-trip verify, budgets); `pnpm build:all` | ✅ 10 archives, 186–313 kB |
| 10 | Tests (recogniser, rules, layout, save, platform contracts) + type-check + real-browser runs | ✅ 466 tests |
| 11 | `art-style.md`: the cute / chibi / hand-drawn reference for the art step | ✅ |

### Before a real release (owner actions)

* Fill in Auroras Magic's own portal ids: `.env.gamemonetize.local`
  (`VITE_GAME_ID`), `.env.glitch`, `.env.playgama` (leaderboard, if any),
  `wavedash.toml` (`game_id`), `tools/poki-deploy/poki.config.mjs` (`gameId`).
  They were survivalist's and are blank on purpose; the GameMonetize SDK and
  the Poki deploy refuse to run without them.
* `git remote` still points at `survivalist.git`. Repoint it before pushing.
* The CrazyGames build is pre-release (`VITE_APP_CRAZY_GAMES_FULL_RELEASE=false`
  → one `gameplayStart` per session). Flip it for the full release; the full
  bracket is tested (`pnpm qa:portal -- --platform crazy-web`).

## Step 2 — story extension (NOT started, waits for sign-off on step 1)

`story-GDD.md` (3–12 year old girls). **The file in this folder is empty (0
bytes)**, so it needs re-copying before this step can start. Likely touch points:
`src/game/duel/config.ts` (roster, spells, economy), `sim.ts` (the NPC and
rules), `components/duel/` (the UI will outgrow the jam HUD), and new views for
story and menus.

## Step 3 — painted art (after step 2)

`art-generation-pipeline` skill against the new cast, `compress-images-pipeline`
on the returns. Style contract: `art-style.md`. The pipeline's drivers
(`art:prompts`, `art:status`, `art:models`, `art:export`) stop with an
explanation until `src/game/artSheet.ts` exists for this cast.

## Decisions taken during the migration

* **HUD moved from canvas to Vue.** The world (sky, island, unicorns, spells,
  fx, ink) is still the original canvas code; the chrome is DOM so it can be
  translated, read by screen readers, fit CJK/Arabic fonts and reflow for
  portrait. It sits at the same stage coordinates as the jam build.
* **Additions over the jam build:** Options gear (language, volumes), the coin
  wallet and rank prices on the result panel, a rewarded button on ad builds,
  the portrait layout, and the foe held until the first touch (Poki's gesture
  rule, and no attack under the splash).
* **Leaderboard removed** (it was survivalist's Worker + D1 board). Re-add with
  the `leaderboard-badge` skill if the story build wants one.
* **Spellbook** stays behind the `SPELLBOOK` flag in `src/game/duel/config.ts`,
  off, exactly like the jam build.
* **Roadroller is not in the portal pipeline** (`BUILD.md`). It unpacks with
  `eval`, which every CSP we ship forbids.
* **Bugs fixed that also exist in survivalist** (worth porting back): the
  post-hydrate language watcher reverted a browser/portal locale to English for
  any player without a stored choice (`main.ts`); every non-Playgama build
  shipped an orphan `playgamaPlugin-*.js` chunk (now stub-aliased).
