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

## Step 2 — story extension (spec done · S0 ✅ · S1 ✅ · S2 ✅ · S3 ✅ · S4 ✅ · S5 ✅ · S6 ✅ · S7 ✅ · S8 ✅ · S9 ✅ · S10 ✅ — release candidate)

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
| S2 | Flow shell + chapter 1: `AppScene.vue` (one canvas, RAF, input, `S.flow`), scene FSM, boot into arena, `useDuelRewards.ts`, map, dialogue, Boss Chest + Sunbeam, save schema v2 + migration (§3, §4, §10) | Chapter 1 playable from a cold boot through its boss and wipe; portal QA green | 15–19 | ✅ 2026-09-18 |
| S3 | Chapters 1–3 = **the v1 release** (D2): water / lightning magics, Eraser, spellbook, wardrobe tent, Twin Gift (bloom), i18n for 21 locales (§6, §8, §10, §11) | §12.2.4 gate, kid playtest, portal QA on every target | 9–13 | ✅ 2026-09-19 (engineering gate) |
| S4 | Chapters 4–10 in pairs (4–5, 6–7, 8–9, 10): Signature Spells, the remaining runes and magics, finale (§6, §10) | Win-rate floors hold from telemetry per pair (§7.2, §12.6) | 26–32 | ✅ 2026-09-19 |
| S5 | Local 2P versus: split screen, P2 on the right-side `e*` duelist (§6.19, §3.12) | Two players on one landscape screen | 8–10 | ✅ 2026-09-19 |
| S6 | Step 3 painted art (art-generation pipeline, `art-style.md`, whose prompt was updated for D1) (§9.12) | Painted A/B vs drawn, byte budgets per chapter | 20–30 | ✅ 2026-09-19 (pipeline; the paintings are the owner's image-model run) |
| S7 | Release prep for all 10 chapters (playbook Phase 7): release audit per portal, cross-browser matrix, small viewports, localisation QA, image compression | Every portal build release-ready | 3–5 | ✅ 2026-09-19 |
| S8 | Performance pass (`web-game-performance-optimize`): budget, throttled baseline, A/B only for measured wins | Inside budget on a throttled mid-range profile | 2–4 | ✅ 2026-09-19 (already fast enough) |
| S9 | Post-launch retention roadmap (playbook Phase 8): `retention-roadmap.md` | A sorted, sized roadmap | 1 | ✅ 2026-09-19 |
| S10 | Final release-candidate gate across everything: build matrix, portal QA, playthroughs, win rate, tests | A release candidate | 1–2 | ✅ 2026-09-19 |

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

**Phone wipe length (owner delegated, 2026-09-18):** kept short (~5–6 s in
portrait). A smaller brush hurts small fingers and a stiffer pass slows every
device; the fix is portrait sector compositions in S6 (spec §8.15).

**Open for the owner:** nothing blocking S3.

**S3 build order (started 2026-09-18 — the v1 release, D2; tick as each
lands, resume from the first unticked line):**

- [x] **S3a — Water and Lightning in the duel.** (Built: `sim.ts` `raise`/`stops`/pierce, `foes.ts` `PHASE2` + `AI_CONTRACTS`, `fx.ts` bubble ward with its crack, `render.ts` bubble and bolt shots; 7 new cases in `tests/duel/rules.test.ts`. `pop.pierced` translated in all 21.) `guardK 3` bubble ward (2
  hits, 5 s, stops bolt/field/push, not heavy/summon, a crack on the first
  hit), `tidalWave`'s and the `ward` rider's 1-hit personal ward (2 s),
  `pierce` skipping `stops()` (§6.3, §6.8). The AI contracts: Water answers an
  incoming shot, Lightning is preferred against a raised guard, both from
  node 3; `AI_CONTRACTS` as a typed record (§6.13). Boss phase 2: Pearl opens
  a ward at the phase start; Zephyr's bolts pierce (§6.11). The fx: a bubble
  ward and a lightning bolt. Tests.
- [x] **S3b — chapters 2–3 content.** (Done: the ten sectors (`sectorsC2.ts`/`kitBay.ts`, `sectorsC3.ts`/`kitSky.ts`, authored by agents against `sectorDef.ts`), the chapter accent on ribbons and gems, page washes, chapters 2–3 dialogue with Pearl/Zephyr portraits and voices, Shelly/Puff creature portraits, per-chapter arena themes `arenaThemes.ts`.)
  - Ten sectors — `sectorsC2.ts` (Bubble Bay) and `sectorsC3.ts` (Cloud
    Kingdom); agents are authoring them against `sectorDef.ts`. Chapters 2–3
    are switched to `built`.
  - The chapter accent on the gift ribbon and the chest gem.
  - The map page washes.
  - Dialogue for chapters 2–3 (§10.9) and portraits for Pearl and Zephyr.
  - Arena theming per chapter (§9.6).
- [x] **S3c — tools and keepsakes.** (Built: `restore/eraser.ts` + `stampRect` + paddle stamp, `toolOf(n)`, the square box gift, the Eraser tool art and chip; the bot measures 9.8–10.0 s at §8.4's paddle size — a little under §7.5's 12 s, kept per the child-first ruling. Keepsakes: the rig's `beforeTorso`/`afterTorso`/`afterMane` hooks + `RigAnchors`, `equippedHooks()` used by the duel, the wardrobe and portraits; the necklace low on the neck, the wings rising off the back.)
  - The Magic Eraser (§8.4) and its square gift box. It is granted at 3-5,
    used from chapter 4, and needs a timing test at ~12 s.
  - The Seashell Necklace (neck) and the Pegasus Wings (back) on the rig
    (§9.7), and in the wardrobe.
- [x] **S3d — permanence (§8.8).** (Done: the amb bus + three biome loops, `setAmbience` from the map/restore view; tap creatures on the map (`peekCreature`) and in the admire view; the rescue: 30 % wake, auto-surface at the wave, `rescued` bit, `rescueFound` telemetry; chapter 1's log sprites and Wood Sprite. Chapters 2–3's foal and pegasus creatures and the Singing Shell / Baby Pegasus rescues came with their sectors.)
  - The ambient bus and the biome loops.
  - A tap creature on every restored sector (chapter 1's too).
  - The chapter's rescue collectible: its cue at ~30 % uncovered, a
    guaranteed surface under the auto-pop, and the `rescued` bit.
- [x] **S3e — the release.** (Done — see the S3 result below.)
  - The parents' panel (§2.7).
  - Chapters 4–10 shown as "coming soon".
  - The first-load ad (C30).
  - The `saveStatus` copy.
  - i18n for every new key.
  - The portal build matrix and `qa:portal` (check the playbook's release
    phases first).
  - The size budget.
  - The candy-palette check on every sector.
  - A browser run from 1-1 to 3-5.
  - Docs.

**S3 result (2026-09-19) — v1 release candidate, the §12.2.4 engineering gate:**
- **Portal QA:** `scripts/portal-qa.mjs`, updated for the story (§11.15), is
  green on every configured platform, on the built bundles:
  - GamePix 29/29;
  - GameMonetize 31/31 (built with a dummy `VITE_GAME_ID` — the real id is
    still blank on purpose);
  - CrazyGames pre-release 22/22 and full release 37/37;
  - plain web 20/20.

  Each run covers:
  - boot into the story;
  - mute and pause;
  - the bracket per scene (live in the duel and the wipe only);
  - happytime at the boss chest's unbox, never at a win;
  - the Twin Gift's hold threshold: 1199 ms pays nothing, 1200 ms plays one
    rewarded ad;
  - C30: no dialogue bubble under the first-load ad.
- **Size:** `build:all` packs all ten archives within budget, at 300–470 kB
  each; Poki's initial load is 402 kB of its 5 MB.
- **Candy palette:** 15/15 sectors clear the floor.
  - Dust saturation is 11–12 %.
  - Restored candy share is 22–52 %, against a regression floor of 20 %.
  - Median ΔL is 39–58.
- **Browser:** a full 1-1 → 3-5 playthrough in landscape and in 320×658
  portrait:
  - all 15 nodes won and restored;
  - three boss chests with the Sunbeam;
  - three keepsakes worn and three rescues found;
  - Nature, Water and Lightning unlocked;
  - no bracket violations and no console errors.
- **Tests:** 74 files and 678+ tests green; `vue-tsc` clean.
- **Still human work for the full §12.2.4 gate:**
  - the kid playtest (§12.5);
  - the node-12 fatigue probe (§12.7);
  - the three target reviews (§12.3);
  - the real portal ids and submissions.

**S4 — chapters 4–10 (2026-09-19), as built (story-spec §8.18):**
- [x] **The magic.**
  - Crystal Ward (reflect, at half base damage — a child-first deviation).
  - Illusion's decoys (Echo holds two).
  - Rainbow's wildcard.
  - Time's two-mode slow (F19).
  - Frost Lock (freeze plus discard, 6 s cooldown; Glace resists).
  - Moon's lifesteal (Nova's rises).
  - Love and its gated finisher.
  - Umbra's three phases.
  - Every boss's phase 2.
  - `castSide(e)`, ready for S5.
- [x] **The foe follows her AI contract exactly (§6.13).** The random
  magic on top is gone; Nature's pair goes out at once; Briar's rider is
  +1 s.
- [x] **Difficulty re-measured on the real duel.** `pnpm test:winrate` runs
  §7.2's core child against `updateSim`.
  - Tiers are `0.40 + 0.03·tier`, one gentler with no weakness to exploit.
  - Standard HP is 100 + 1 per chapter (flat 100 with no weakness).
  - A boss is 115 + 2 per chapter.
  - Every chapter clears the two-part target with margin, and chapters 1–3
    got a little easier too.
- [x] **35 sectors** (`sectorsC4–C10.ts`, one `kit*.ts` per biome), with
  pots, accents, tap creatures and rescues. Chapter 10's creature is Sprig
  in a party hat, and there is no rescue there.
- [x] **Signature-Spell chests** trace their recipe, then bloom an emblem.
- [x] **Arena themes and ambient loops** for all ten chapters.
- [x] **Dialogue for chapters 4–10:** 64 lines to §10.10's outline.
  Chapter 10's lead-up is the returning Guardians, and its thank-you is the
  4-bubble finale.
- [x] **Portraits and pictograms:**
  - six Guardian portraits, all seven emotes;
  - seven creatures (Glint, Blink, Rio, Dune, Frosty, Wisp, Sprig);
  - six pictograms;
  - babble voices for the new speakers.
- [x] **The finale:**
  - a one-time card with the whole cast (`am_campaign.finaleSeen`);
  - wandering Umbra on the map, who says three friendly lines;
  - the versus unlock.
- [x] **Six keepsakes:** hoof-trail, Umbra Look, the Mane Color Palette (8
  swatches, `maneSwatch`), Pastel Dream (a skin), winter scarf and Pet Star.
- [x] **i18n:** 94 new keys in all 21 locales.

**S4 result (2026-09-19):**
- **Difficulty (`pnpm test:winrate`, real duel, §7.2's core child, n = 360
  per cell):**
  - first-attempt wins are 91–100 % at standard nodes and 83–99 % at
    bosses;
  - ≥ 99.9 % clear within three tries, in every chapter.

  The full table is in story-spec §8.18.
- **Browser:**
  - **Landscape, 4-1 → 10-5:** a full playthrough on a production build:
    - all 50 sectors restored, all 12 runes, both Signature Spells;
    - all 9 keepsakes and all 9 rescues;
    - real Magic Eraser wipes and seven Sunbeam chests;
    - the finale card, then wandering Umbra greeting.
  - **Portrait (320×658), the same playthrough.** It found a real bug:
    - after 10-4, node 10-5's marker sat under the map's corner buttons,
      because the last page could not scroll past them;
    - fixed by giving the camera the chrome strip, in both orientations;
    - chapter 10 then replayed clean in portrait and landscape.
  - No bracket violations and no console errors.
- **Portal QA** (built bundles):
  - GamePix 29/29;
  - GameMonetize 31/31 (dummy id, as an env override only);
  - CrazyGames pre-release 22/22 and full release 37/37;
  - web 20/20.
- **Size:** `build:all` packs all ten archives within budget, at 522–629 kB.
  Poki's initial load is 402 kB of 5 MB.
- **Candy palette:** 35/35 new sectors clear the floor (dust S95 11–12,
  candy share 24–60 %, median ΔL 37–51).
- **Tests:** 76 files and 727 tests green, plus the opt-in win-rate
  harness; `vue-tsc` clean.


**S5 — local 2P versus (2026-09-19), as built (story-spec §8.19):**
- [x] **Entry:** the map's "play together" button (after the finale) opens
  `versusSetup`: READY on each half, then 3-2-1.
- [x] **One shared arena, two halves:** per-pointer routing by screen half,
  a stroke buffer and a CAST each; Space and Enter on a keyboard.
- [x] **Symmetric rules (§6.19):** 100 HP a side, full kit on both, and
  freeze, slow and the Love gate for either player. No duel is counted and
  no campaign state is touched.
- [x] **The shared result** (rule 21): "What a duel!" and a trophy over the
  winner, then back to the ready screen.
- [x] **Below 900 px or upright:** the "turn sideways" prompt, including
  mid-match, where the sim holds still.
- [x] **i18n:** 7 keys in all 21 locales.
- [x] **Also fixed:** the foe's pending rune is now reset per duel.

**S5 result (2026-09-19) — the §12.2.6 gate:**
- **Browser (dev server):**
  - entry through the map button and both READY taps;
  - 20 duels, each started by ONE two-finger multi-touch gesture, both
    players drawing at once (triangle, square, Z, chevron, heart, spiral in
    rotation): **zero cross-talk and zero recognition misses**;
  - both sides cast the late kit (Love, Lightning);
  - wins and losses unchanged after 20 matches, and the campaign untouched;
  - the prompt at 360×740 portrait, at a 780 px landscape, and when
    squeezed to 820 px mid-match (the sim held);
  - no console errors.
- **Unit tests:** `tests/duel/versus.test.ts` (7), including 20 interleaved
  two-stroke duels on the sim with no cross-talk. 734 tests green;
  `vue-tsc` clean.
- **Win rate:** still clears §7.2 in every chapter (standard ≥ 91 %, boss
  ≥ 83 %).
- **Portal QA** (built bundles):
- GamePix 29/29;
  - GameMonetize 31/31 (dummy id, as an env override only);
  - CrazyGames pre-release 22/22 and full release 37/37;
  - web 20/20.
- **Campaign regression:** chapter 10 and the finale replayed clean on a
  production build (finale card, wandering Umbra, no bracket violations, no
  console errors).

**S6 — painted-art pipeline (2026-09-19), as built (story-spec §8.20):**
- [x] **Manifest:** `artSheet.ts` (pure; 50 sectors, 8 items, 12 runes, the
  prompt builders); `artIds.ts` and `artFolders.ts` hold the names and
  folders shared with the tools.
- [x] **Renderer seams**, each a probe that falls back to the drawing:
  - map thumbnails and the restore colour layer (`sectorArt.ts`, with the
    pot tinted over a neutral landmark by `artTint.ts`);
  - gifts, chest, brush and eraser (`gift.ts`); the tent (`tent.ts`);
  - the crown and pet star (`rig-cosmetics.ts`); `RuneGlyph.vue`.
- [x] **Contracts:**
  - the box (`artBox.ts`), measured from the drawing;
  - strips cross-fade between their states (`artItem.ts`);
  - a late painting re-bakes the restore view only before the first stroke;
  - the full-size painting is fetched on open and released on close;
  - with the layer on, the splash preloads the first screen (`artPreload.ts`).
- [x] **Tools:**
  - the dev bench `/#/art-sheets` (driven by `pnpm art:export`) and
    `/#/playground`;
  - `art:prompts` (with `--check`) and `art:status`;
  - a sharp-based `slice-sheets`: receipt and stale parking, aspect guard,
    magenta key and unmix, area-matched fit, 256 px frames, sector thumbnails;
  - `measure-art.py cells` adapted.
  - Retired: the survivalist-only `art-models` and `art-guard`.
- [x] **Tests:** `tests/meta/artManifest.test.ts` (manifest consistency;
  fenced prompt docs that the Art Desk parses into all 70 jobs) and
  `tests/meta/artTint.test.ts` (the mask arithmetic).

**S6 result (2026-09-19):**
- **The bench** exports 70 references in 1.8 s. `art:prompts --check` agrees
  with it byte for byte, and the Art Desk scans all 70 jobs.
- **Synthetic returns** (references hue-turned, drifted 10 px, rescaled
  112 %, one JPEG) all sliced, and `measure-art cells` put 20/20 within
  tolerance. Finds along the way:
  - a slicer argv bug that dropped the first named file;
  - a mask that tinted a cream wall and a patch of pale sky, fixed by
    measuring the painter's own grey and a round falloff.
  - The synthetic files were deleted; nothing painted ships.
- **In the browser** (own headless Chrome, dev server):
  - the playground A/B;
  - the map thumbnails, a restore with the landmark tinted to the pot, the
    painted gift, chest and brush (with its live star), and the duel HUD;
  - no console errors.
  - With the layer off: zero `/images/` requests.
- **Unit tests:** 749 green; `vue-tsc` clean.
- **Portal QA** (built bundles, art layer off):
- GamePix 29/29, GameMonetize 31/31 (dummy QA id, env only), CrazyGames
    pre-release 22/22 and full release 37/37, web 20/20.
  - `build:all`: 10 archives within budget, 433–642 kB.
  - Neither the dev views nor the prompt text reach any bundle.

**S7 — release prep, all 10 chapters (2026-09-19), as built (story-spec §8.21):**
- [x] `scripts/release-audit.mjs`: bundle purity per portal, run on
  unobfuscated twins built into `.release-audit/`.
- [x] CSP per portal (`PORTAL_HOSTS`); survivalist's five services removed;
  `csp.test.ts` updated.
- [x] The language picker shows the live locale; the Arabic `.ink-none`
  cascade is fixed; no italic or tracking on non-Latin scripts; `v-fit` on
  the CAST labels; Options uses two columns on short, wide screens.
- [x] A `__flow.openOverlay` QA hook (overlays can be opened in any locale).
- [x] `RELEASE-CHECKLIST.md` (the owner's list).

**S7 result (2026-09-19):**
- **Release audit:** 10/10 clear. One warning: the GameDistribution id is
  blank, so its SDK is compiled out.
- **Cross-browser:** Chrome, Edge, Opera, Firefox and WebKit each ran boot →
  win → unbox → wipe → admire → map, with no console errors.
- **Viewports and locales:** 320×658 and 764×385 in en, de, ar and ja across
  9 scenes: no overflow, no console errors, `dir`/`lang` correct. The five
  fixes above were verified on screenshots.
- **Tests:** 757 green; `vue-tsc` clean.
- **Portal QA** (built bundles): GamePix 29/29, GameMonetize 31/31 (dummy
  QA id, env only), CrazyGames pre-release 22/22 and full release 37/37,
  web 20/20.
- `build:all`: 10 archives within budget, 434–642 kB.

**S8 — performance pass (2026-09-19), as built (story-spec §8.22):**
- [x] Budget set: CPU ×4, DPR 2, 60 fps, p95 work per frame.
- [x] Baseline of every scene in both orientations (`scripts/perf-scenes.mjs`).
- [x] Painted-art canvas census, art off vs on.
- [x] The ledger's open vue-i18n experiment, closed as not worth it.

**S8 result:** worst p95 4.2 ms (boss duel, versus, map), zero long tasks,
boot 4.1 s. No optimisation was warranted, so none was made
(`PERF-LEDGER.md`).

**S9 — retention roadmap (2026-09-19), story-spec §8.23:**
`retention-roadmap.md`. It has 18 items sorted by impact, then performance
cost, then game feel, each naming the code it touches and the event that
measures it, under the D1/D3/portal guardrails. Start with item 1 (the
funnel analytics). Item 12 needs the owner.

**S10 — the release-candidate gate (2026-09-19), story-spec §8.24:**
| Check | Result |
| --- | --- |
| `vue-tsc` + unit tests | clean; 757 passed |
| Win rate (`pnpm test:winrate`, the §7.2 core child on the real duel) | every chapter clears its floors (standard ≥ 90/85 %, boss ≥ 75/60 %). Standard 91.1–100 %, bosses 82.8–100 %, 100 % within three tries |
| `pnpm build:all` | 10 archives within budget, 434–642 kB |
| `scripts/release-audit.mjs --build` | 10/10 clear. One warning: the GameDistribution id is blank (owner) |
| Portal QA (`pnpm qa:portal`) | GamePix 29/29, GameMonetize 31/31, CrazyGames pre-release 22/22 and full release 37/37, web 20/20 |
| Cross-browser | Chrome, Edge, Opera, Firefox and WebKit: boot → win → unbox → wipe → admire → map, no console errors |
| Full playthrough on the built web bundle | landscape 1-1 → 10-5 on the real input path from an empty save: 50/50 sectors restored, all 12 runes, both signature spells, all 9 keepsakes plus the Friendship Duo, 9/9 rescues (chapter 10 has none, §8.8), the finale card and Umbra on the map. No gameplay-bracket violations, no console errors, 16 min. Chapter 10 in portrait (320×658 touch): the same, in 97 s |
| Performance (S8, unchanged source since) | worst p95 4.2 ms of the 16.7 ms budget at CPU ×4 |

One harness note: the in-browser "foe magic seen" probe (at 4-3, 5-3, 7-3 and 9-3) reads false, as it did at S4. It cannot fire: the foe's ward answers an incoming shot and its pierce answers a raised guard, and the probe neither casts nor guards after its first rune. The AI's use of magic is pinned by `tests/duel/magic.test.ts` (green).

**Next:** the owner's steps in `RELEASE-CHECKLIST.md`, then
`retention-roadmap.md` item 1.

**After the RC — owner ruling (2026-09-19), story-spec §8.25:**
- [x] **Clean first, colour after:** no pots before the wipe; pots rise after
  the reveal, away from the landmark; the paint spreads from where it lands.
- [x] **The Stardust Sponge** replaces the brush: it squishes, rocks and
  sheds bubbles, and the chip, locales and art manifest were updated.
- [x] **The tool rides the mouse** (the system cursor is hidden during the
  wipe).
- [x] **The show-how:** the tool demonstrates the job without text. The
  sponge and Eraser scrub; the Sunbeam slingshots.
- [x] Verified in a real browser, 757 tests, portal QA web 20/20 and GamePix
  29/29.

**After the RC — owner requests (2026-09-19), story-spec §8.26–§8.27:**
- [x] **The first-launch intro:** five wordless picture-book beats (about
  19 s). Aurora says hello; Umbra blows dust across the meadow; a rune draws
  itself; the Stardust Sponge scrubs the colour back; Play.
  - New cute unicorn sounds: `neigh`, `sigh`, `giggle`.
  - A fresh save sees it once; old saves with progress never do. It can be
    skipped from the first frame and replayed from Options.
  - It holds silent under the first-load ad (C30).
  - Phones held upright get a tall page with a panning camera.
- [x] **The art style pinned as data:** `artStyle.ts` profile
  `cozy-chibi-v1` (`art-style.md` §0). Paintings are stamped with the style
  id, and a style change marks them for repainting.
- [x] **Every drawing paint-ready:** 111 references and 161 targets.
  - New families: 4 intro pages, 20 portrait strips (68 faces), 10 duel
    islands and 7 keepsake badges, each with a runtime hook and a fallback to
    the drawing.
  - Aurora and Umbra's strips are the character models for the intro pages.
  - The slicer now handles opaque scenes and a `top` anchor.
- [x] Verified:
  - 776 tests;
  - a browser run of the intro (desktop and phones);
  - synthetic paintings through every hook;
  - portal QA: web 24/24, GamePix 33/33, CrazyGames pre-release 26/26 and
    full 41/41, GameMonetize 36/36.
**After the RC — owner requests (2026-09-20), story-spec §8.28–§8.29:**
- [x] **One bound book:** the paper dip became a real page turn (photograph,
  swing about the spine, paper swish), used by every scene change and every
  story beat.
- [x] **The map is a book:** one page at a time, a stitched binding, folded
  corners, a place-keeping ribbon, page dots; drag / flick / corner / tab to
  turn. The front page is the knoll with Aurora and her wardrobe.
- [x] **The story is printed on the page:** chapter title pages, the beat on
  paper with the speaker inset, a tap turns the page — and the words sit on
  that node's own chapter page.
- [x] **The duel is fought on the sector's page:** the dusty sector is the
  backdrop, spells blow its dust off (Umbra puffs it back), and a won duel
  hands the cleaning what it cleared — capped at 20 %, never punishing.
- [x] Verified: 786 tests; a browser run of the turn, the book, the story
  pages and the duel → wipe hand-over; perf at CPU ×4 (duel p95 4.4 ms, no
  long tasks); portal QA web 24/24, GamePix 33/33, GameMonetize 36/36,
  CrazyGames full 41/41.

**After the RC — owner ruling (2026-09-20), story-spec §8.30:**
- [x] **Two runes to start** (Fire and Earth), not four. Ice after the first
  battle, Wind after the third, Nature at chapter 1's boss, then one at the
  end of every chapter that has one — twelve runes, each given once.
- [x] **The foe fights with the player's runes**, plus her own chapter's
  magic (the rune that chapter's chest is about to give), so every boss keeps
  its mechanic.
- [x] **A ceremony for each one:** the chest opens into `FReward`'s reveal —
  rays, confetti, fanfare — with the rune drawing itself over its ghost, its
  name, and "draw it like this". The game pauses behind it; the rune is saved
  before the party starts.
- [x] Old saves keep their four runes.
- [x] Verified: 797 tests (incl. `tests/duel/runeSchedule.test.ts`); win rates
  re-measured on an honest model (ch1 99/95/86 %, all chapters above their
  floors); portal QA web 25/25, GamePix 34/34, GameMonetize 37/37,
  CrazyGames full 42/42 — QA caught the early chests firing the portal's
  happy moment, now back to one per chapter at the boss.

- [ ] Paint them: `pnpm art:desk`. Portraits first (Aurora, then Umbra), then
  the intro pages, then islands and badges. Then run `pnpm slice-sheets` and
  compress.

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
