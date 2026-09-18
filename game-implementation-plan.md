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

## Step 1 — migration ✅ (signed off by the owner 2026-09-18, commit 78b0041)

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

## Ads pass ✅ (2026-09-18, owner's spec)

| What | Where | Proof |
|------|-------|-------|
| Interstitial between duels, after a win **and** a loss, before the result panel | `GameScene.maybeShowInterstitial` | dev-server CDP run, landscape + portrait |
| Pacing: none in the first **240 s** of a session (from page load), then **≥ 121 s** apart, one clock for every placement | `useAdGate.canShowInterstitial` | `tests/platforms/adGate.test.ts` |
| First-load ad stays on GameMonetize / GamePix / GameDistribution (moderation requires it); it seeds the clock, and the next ad still waits for the 240 s mark | `useFirstLoadInterstitial` | `pnpm qa:portal --platform gamemonetize` 19/19 |
| QA chord: **30 taps in a row on the foe's HP bar** (≤ 1.5 s apart; any other press breaks the chain) → interstitial now, bypassing pacing, seeding the clock, restarting the music | `useQaAdTrigger`, `GameScene.onQaChord` | unit tests + both harnesses |
| Rewarded after every duel: ×2 coins on a win, +`winCoins(foe)` on a loss, shown only while an ad can be served | `DuelResult.vue` (existed since step 1) | dev-server run: grant, skip, claimed |
| Simulated ads on `pnpm dev` (a "TEST AD" card), so all of the above can be seen locally; opt out with `localStorage.am_dev_ads = 'off'` | `use/ads/DevAdProvider.ts` | aliased to a stub on every build; `tools/pack` fails any archive that carries it |

QA note: while `VITE_GAME_ID` is blank the GameMonetize SDK does not init, so
`qa:portal --platform gamemonetize` fails its two SDK checks. To test the ad
path anyway, build with a throwaway id, then rebuild clean:
`VITE_GAME_ID=qa-dummy-id npx vite build --mode gamemonetize --base=./`.

## Leaderboard ✅ (2026-09-18, owner request)

- **Worker:** `worker/` (Cloudflare Worker + D1, from the `leaderboard-badge` skill). It is live at
  `https://auroras-magic-leaderboard.rodent-race.workers.dev` on the account
  "Rodent.race.app@gmail.com's Account". Four other game boards share that account's free-tier quota.
  - Signed posts: `SCORE_SECRET` is set on the Worker and `VITE_LEADERBOARD_SECRET` in `.env`.
  - Smoke-tested: a valid post is accepted, free text → 400, a missing signature → 401, an absurd score → 422.
- **Owner decisions:**
  - **score** = lifetime duels won; **flair** = furthest progress (ladder rung, the story node from S2).
  - **Generated names only**, e.g. "Sunny Pony 482". The Worker REFUSES any name not built from the game's own
    word lists (`worker/src/names.ts` ↔ `src/game/leaderboardNames.ts`, with a drift test).
  - **Poki / Yandex / Playgama(+Playables)** make no Worker call. They bake a modelled histogram (`data/leaderboard-seed.json`,
    `pnpm leaderboard:seed`) for the rank badge only: no rows, no invented names, no list.
  - Playgama's own hosted board is skipped for now.
- **UI:** the rank badge on the result panel; tapping it opens the top-100 list on live builds.
  - `reportRun(S.wins, S.foe)` fires after the panel is up. It posts only on a new best, throttled.
  - When the story flow replaces the result panel (S2), the badge moves with the win beat.
- **After launch:** run `pnpm leaderboard:snapshot` once the board has players, and commit
  `data/leaderboard-snapshot.json`. It is the offline fallback for live builds; there is none yet, because the board is empty.
- **Verified:**
  - tests (`tests/leaderboard/`, 8 files) and vue-tsc pass;
  - Poki, Yandex and Playgama builds contain zero references to the Worker, and CrazyGames carries it in its CSP;
  - in a real browser a win sent exactly one signed POST (Worker intercepted), the badge and list rendered, and there were no errors.

## Step 2 — story extension (spec done · S0 ✅ · S1 ✅ · S2 ✅ · S3 next)

**The spec is `story-spec.md`** (project root, 14 chapters, §0–§13). It came
out of an expert-panel review of `story-GDD.md` on 2026-09-18:
- 12 panelists;
- adjudicated rulings;
- one drafter per chapter;
- three adversarial audits (numbers, implementability, GDD coverage);
- a fix round and a regression audit.

Build from the spec. When the spec and this file disagree, the spec wins.

**Owner decisions (2026-09-18, `story-spec.md` §13):**

| Decision | Ruling |
|---|---|
| D1 | All-ages cozy, family-friendly |
| D3 | The currency is **removed**. The rewarded Twin Gift pays a cosmetic sector bloom, on wins only |
| D4 | The reshaped runes are accepted |
| D5 | Two-player versus lands at S5 |
| D6 | Babble voice only |
| D7 | Umbra is fought only at 10-5 |
| D8 | The ads-pass cadence is kept |
| D2 | **Ship at S3** (chapters 1–3 = v1, spec §1.8 Option A, owner 2026-09-18). Chapters 4–10, 2P and painted art follow as free updates, each behind its own `released` flip |

| Stage | What ships (spec §) | Exit demo (§12.2) | Agent-days | Status |
|---|---|---|---|---|
| S0 | Rune spike: frozen-corpus test (`tests/duel/rune-corpus.*`), committed harness `tools/rune-spike/`, `RUNE_DEFS` + `shapes.ts`, `recognise(raw, activeMask)`, 8 new runes measured (§5) | The four shipped runes classify bit-identically; each new rune ≥ 95 % sloppy accuracy, junk ≤ 5 %, or its fallback applied | 4–5 | ✅ 2026-09-18 |
| S1 | One wipe sector end to end: restore view, coverage grid, dust, brush, 85 % + reveal, colour-me pick, in-progress persistence, bracket "wipe = live" (§8, §9.3–§9.4) | A single sector, from gift to permanence, at 320×658 and in landscape, ≤ 3 ms/frame for the mask | 6–8 | ✅ 2026-09-18 |
| S2 | Flow shell + chapter 1: `AppScene.vue` (one canvas, RAF, input, `S.flow`), scene FSM, boot into arena, `useDuelRewards.ts`, map, dialogue, Boss Chest + Sunbeam, save schema v2 + migration (§3, §4, §10) | Chapter 1 playable from a cold boot through its boss and wipe; portal QA green | 15–19 | ⬜ next |
| S3 | Chapters 1–3 = **the v1 release** (D2): water / lightning magics, Eraser, spellbook, wardrobe tent, Twin Gift (bloom), i18n for 21 locales (§6, §8, §10, §11) | §12.2.4 gate, kid playtest, portal QA on every target | 9–13 | ⬜ |
| S4 | Chapters 4–10 in pairs (4–5, 6–7, 8–9, 10): Signature Spells, the remaining runes and magics, finale (§6, §10) | Win-rate floors hold from telemetry per pair (§7.2, §12.6) | 26–32 | ⬜ |
| S5 | Local 2P versus: split screen, P2 on the right-side `e*` duelist (§6.19, §3.12) | Two players on one landscape screen | 8–10 | ⬜ |
| S6 | Step 3 painted art (art-generation pipeline, `art-style.md`, whose prompt was updated for D1) (§9.12) | Painted A/B vs drawn, byte budgets per chapter | 20–30 | ⬜ |

**Totals:** S0–S4 (the full 10-chapter game) ≈ 60–77 agent-days; everything
through S6 ≈ 88–117 (§1.1). Removing the currency (D3) trims these slightly;
§1 has the details.

**Key decisions (spec §0.3):**
- **Runes:** 12 in total, the 4 frozen plus 8 new: V, ○, spiral, ∞, ∩,
  hourglass, ☆, ♡. Chapters 4 (Crystal) and 8 (Frost) unlock Signature Spells
  instead of new shapes.
- **Flow:** the game boots into the next arena; the map is the reward space.
- **Ads:** the owner's interstitial cadence is kept exactly. The rewarded offer
  becomes an in-world Twin Gift: a 1.2 s hold opens a permanent cosmetic bloom
  of a restored sector, on wins only.
- **Currency:** none (D3). There are no coins, no ranks and no shop.
- **Audience:** designed for children, listed as all-ages cozy and
  family-friendly. `VITE_CHILD_DIRECTED` stays as an unused option.

**S0 proof (2026-09-18):**
- **Recogniser.** `src/game/duel/runes.ts` is now data-driven over
  `RUNE_DEFS` (`runeDefs.ts`, the recognition half of `RuneDef`), with shapes
  in `shapes.ts`. The signature is `recognise(raw, activeMask = FROZEN_MASK)`.
- **The four shipped runes are bit-identical.** A 525-stroke frozen corpus,
  pinned before the refactor, proves it (`tests/duel/rune-corpus.test.ts` plus
  its fixture).
- **12-rune gate** (`tests/duel/rune-alphabet.test.ts`, with the normal suite):
  - every story rune ≥ 95 %;
  - the shipped four ≥ 99 % with all 12 live;
  - junk ≤ 5 %;
  - no stolen strokes.
- **Measurement report:** `pnpm rune:spike` (`tools/rune-spike/measure.mjs`).
  It passes on five seeds: the new runes land at 96.4–100 %, junk at ≤ 1 %.
- **Tuning against the spec's starting numbers** (recorded in spec §5.0):
  - the ILLUSION crossing gate ignores the loop-closing seam;
  - LOVE's `ecMin` goes 5 → 4;
  - LIGHTNING's variants become {1.5, 1.75, 1.9, 2.05}.
- **Telemetry.** `recognition_attempt` goes from `sim.ts` →
  `useAnalytics.trackRecognition`. The portal sink gets every miss and one
  success in ten.
- **Verified:**
  - a browser smoke test on the real pointer path: triangle → FIRE, circle
    still rejected, Z → ICE, 3 telemetry events, no console errors;
  - vue-tsc clean;
  - 51 test files / 487 tests green.
- **Scope note.** The live game still recognises only the four shipped runes.
  S2 wires `S.campaign.runesUnlocked` into `recognise()`.

**S1 proof (2026-09-18):**
- **The loop.** A win drops the gift onto the island during the flourish,
  then the interstitial if one is due. The page dips (450 ms) to the dusty
  sector with the gift on it. Tap: the bow unties, sparkles burst and the
  Stardust Brush floats to the finger. Then three paint pots appear (4 s
  auto-pick), the paint flies to the cottage roof, and the camera locks. The
  chime ladder rings every 10 %. At ≥ 85 % plus 1.5 s idle (or every cell
  clean) comes the 550 ms freeze, then the 420 ms reveal wave from the last
  touch. The restored sector is alive: the windmill turns, the chimney smokes
  and butterflies fly. "Continue" leads to the result panel.
- **Code.**
  - `src/game/restore/`: `mask.ts` (coverage model), `brush.ts` (the Stardust
    Brush), `dust.ts` (the dust layer), `frame.ts` (layout), `gift.ts` (gift
    and brush art), `wipe.ts` (the controller).
  - `src/game/map/sector.ts`: the procedural "Whispering Woods" sector.
  - `src/game/campaign/`: `bitset.ts` and `state.ts` (the full
    `CampaignState`, persisted as `am_campaign`).
  - `src/game/flow/scene.ts` and `src/use/useFlow.ts` (`S.flow`, the scene
    ids).
  - The chrome is `src/views/UnboxScene.vue` and `WipeScene.vue`.
- **The bracket.** `isGameplayLive` now takes `{ scene, duelPhaseIsLive }`
  (§4.9.1): `wipe` is live, while `unbox` and the restored view are not.
- **Measured.**
  - Wipe duration: a simulated relaxed player (500 px/s) takes 16.4–17.2 s at
    §7.5's reference scale, 10 of 10 inside 12–20 s
    (`tests/restore/wipeTiming.test.ts`).
  - Frame cost of mask + dust: p95 0.2–0.4 ms. With the CPU throttled ×4 it
    is p95 ~2 ms and max 4.2 ms (see `PERF-LEDGER.md`).
  - Candy floor on real pixels: dust saturation 6–10 %, restored 73–77 %,
    ΔL 26–32.
  - Save: the in-progress coverage round-trips through a reload, and 10 of 10
    reload cycles leave `am_campaign` bit-identical. The pick and the done bit
    survive.
  - Rotating the device mid-wipe keeps coverage exactly.
  - Real browser at 1280×720 and at 320×658 with touch: no console errors.
  - 614 tests green; vue-tsc clean.
- **How it differs from the spec (spec §9.3.4, §8.15):**
  - The dust is composited once and then erased in place, not re-composited
    every frame.
  - The dwell rule counts per-cell VISITS.
  - The paint pick is baked into the colour layer.
  - After the reveal, S1 routes to the result panel (S2 routes to the map).
- **The owner may want to tune this.** §7.5's finger-sized brush makes phones
  in portrait clear the sector in ~5–6 s, against ~19 s at the reference scale
  and ~17 s on a desktop with a mouse. The spec predicts this; the options are
  in spec §8.15.

**S2 build order (started 2026-09-18; tick as each lands, resume from the
first unticked line):**

- [x] **S2a — rules and data.**
  - `campaign/tables.ts`: chapters, 50 nodes, the story foe roster, cosmetics,
    gifts, the rune combat table.
  - `config.ts`:
    - delimited `comboKey`;
    - `comboEnumerationIndex`/`comboFromIndex`;
    - the §6.2 generator (overrides → base → riders → elemMul → combo bonus);
    - a 12-wide `CTR`;
    - `SPELLBOOK = true`;
    - coins, ranks and `winCoins` removed (D3).
  - `sim.ts`:
    - `resetDuel(node)`, with `hpMax` per side;
    - the §6.14 rate chain with the Dream Dust term;
    - an allowed-runes pool with the node-3 rule;
    - Nature dot + regen;
    - Briar's phase 2 with a 1.8 s wind-up;
    - `runesUnlocked` passed into recognition.
  - fx: the `KIND_OF_RUNE`/`dispKind` fix, plus `K_LEAF`.
  - glyphs for runes 4–11.
  - Save schema v2: `migrate.ts` merges the S1 `am_campaign`, folds
    `am_spells_seen` into `combosSeen`, and drops coins and upgrades. The merge
    policy scores campaign progress.
- [x] **S2b — the flow shell.**
  - `AppScene.vue` (one canvas, RAF and input; `load()` then boot).
  - The `flow/bracket.ts` reconciler, which replaces the watch.
  - Overlays go through `openOverlay`.
  - `GameScene.vue` becomes the duel controller: win gift-drop → ad → map,
    loss doze → ad → Retry/Map.
  - `campaign/controller.ts`.
- [x] **S2c — the map.**
  - Chapter pages, landscape and portrait, with pan and the 12 px
    tap-vs-drag rule.
  - Node markers in their locked, current and done states.
  - Sector thumbnails; the pending gift; the chapter tab ribbon; the book
    and options icons; placeholder pages.
  - Chapter 1's five sectors: four standard, one boss at 4× area.
- [x] **S2d — dialogue.**
  - `DialogueScene.vue` with bubbles and the `.story-text` style.
  - Procedural portraits with emotes; the ch1 pictograms; the babble voice;
    `story.ts` data.
  - Skip after the first view; the tutorial opener.
- [x] **S2e — the boss.**
  - The Boss Chest, the Nature rune reveal plus trace preview, and the
    Sunbeam aim-and-release sweep (~45 s). Built: `restore/sunbeam.ts`
    (band 92 SU, 980 SU/s, 0.6 s recharge); the bot in
    `tests/restore/sunbeamTiming.test.ts` clears the boss sector in
    42.6–52.7 s over ten seeds (mean 46.4 s, 15–18 shots).
  - happytime at the boss unbox; Briar's thank-you beat.
- [x] **S2f — rewards and the tent.**
  - `useDuelRewards.ts`, the Twin Gift (1.2 s hold) and bloom props.
    Built: `map/twinGift.ts` (canvas gift + ring, 4-step ribbon, 250 ms
    silver/gold burst → `claimTwinGift`), the DOM hold target in
    `MapScene.vue` (12 px cancel, Space/Enter hold), `map/bloom.ts` (tall
    flowers, a hopping bunny, butterflies, twinkles — inside the live-prop
    budget). Withdrawn when the scene leaves the map.
  - The wardrobe tent with the head slot (Flower Crown drawn on Aurora).
- [x] **S2g — chrome.**
  - The loss beat (Retry/Map, the Dream Dust visual — lilac motes and a
    drawn Z round the foe's head, one per loss).
  - Leave-duel in Options (one gentle confirm); Options and the spellbook
    reachable from every scene (`SceneCorner.vue` in dialogue, unbox/wipe,
    wardrobe); the spellbook re-laid out (§3.9.1: rune strip with trace
    demo, reachable-only list by count, the 1 s "new" sparkle backed by the
    new `combosViewed` bitset).
  - Options: `traceAssist` (ghost of the newest rune until the first rune
    lands) and `reducedMotion` (ambient loops settle; reward beats stay).
- [x] **S2h — close-out.**
  - i18n in all 21 locales: 83 new keys, 2 reworded (`result.defeated`,
    `pop.defeated`), 9 coin/shop keys deleted. The parity test is green
    (40/40). Translator notes worth a native check are in "S2 notes" below.
  - Unit tests: 71 files / 663 tests green. New files:
    - `tests/duel/rules.test.ts`, rewritten for the story rules;
    - `tests/campaign/{tables,migrate,controller,book}.test.ts`;
    - `tests/platforms/flowBracket.test.ts`;
    - `tests/restore/{sunbeamTiming,twinGift}.test.ts`;
    - the half-resume cases in `mask.test.ts`;
    - the campaign score in `SaveMergePolicy.test.ts`.

    `vue-tsc` is clean and `vite build` passes.
  - Browser (spec §12.2.3, result recorded there): 3 of 3 cold boots (two
    landscape, one 320×658 touch) ran through the chapter-1 boss. Also
    checked:
    - the loss beat, then Retry with Dream Dust;
    - a replay, which gives no gift;
    - the Twin Gift, then its rewarded ad, then the bloom;
    - Leave Duel;
    - a force-quit mid-wipe, which resumes on relaunch;
    - the bracket, live only in the duel and the wipe;
    - no console errors.
  - Docs: spec §8.16 (S2 as built) and the §12.2.3 result; this plan.

**S2 notes — decisions and deviations:**
- `am_campaign.wipeHalf` is a second 56-char bitset for half-brushed cells.
  With the done-only bitset (C9), a mid-wipe relaunch lost every single-pass
  stroke: 19.7 % brushed came back as 0.0 %. Now it comes back as 11.0 %.
- `am_campaign.combosViewed` backs the spellbook's "new" sparkle. It is seeded
  equal to `combosSeen` at the migration, so it never nags about old
  discoveries.
- The restored sector at rest is scene `unbox`, so the bracket stays closed
  while the player admires it.
- Any trusted press now wakes the game. Before this, a fresh save's dialogue
  taps (DOM) left the audio locked.
- A dialogue ends exactly once. A tap during the page-dip used to start the
  duel twice.
- The map's chapter-tab ribbon scrolls: ten tabs never fit a 320 px phone.
- `SaveMergePolicy` scores campaign progress (§4.16), and the conflict bonus
  is 0 (D3).
- Translators:
  - French spell forms put the rune after the noun (`TRAIT {A}`), because
    "DE" can't elide before Eau/Amour/Illusion/Arc-en-ciel.
  - The Slavic and Turkic locales use a hyphen or a possessive, so `{A}` stays
    in the nominative.
  - ko/ja/ru/uk/pl use their own snore sounds for the loss copy.
  - ar/kk/uz use "mirage" for Illusion.

**Hand-offs to S3:**
- Chapters 2–3 content: sectors, dialogue (§10.9 is written), and the
  chapter-2/3 foes' palettes and magic.
- The Magic Eraser (chapter-3 boss chest onward).
- The ambient bus plus the tap creature (§8.8).
- The rescue collectible.
- The parents' panel (`options.parents.*`).
- The chest's Signature-Spell reveal (chapters 4 and 8 — the chest only
  reveals runes today).
- `saveStatus.restoredBody` still says "+{n} bonus coins". It is unreachable
  now (bonus 0) but should be reworded or removed with the S3 copy pass.

**Ruled (owner, 2026-09-18):** difficulty is tuned for CHILDREN. That an
efficient adult clears faster (the Sunbeam: ~14 s against a modelled child's
~46 s) is fine and is not tuned away.

**Open for the owner:**
- Phone-portrait wipe length (~5–6 s, spec §8.15 levers).

**Panel working papers** (rulings, round-1 reports, audits) are in the
session scratchpad. They are not part of the repo; the spec summarises their
reasoning inline.

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
