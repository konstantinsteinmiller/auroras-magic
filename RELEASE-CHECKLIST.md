# Auroras Magic — release checklist (all 10 chapters)

Written at S7 (2026-09-19, story-spec §8.21) and re-checked at S10.
Engineering is verified end to end. The items under **Owner actions** need
accounts, dashboards, legal calls or a real device, so they cannot be done
from the repo.

## Verified (S7)

| Check | How | Result |
| --- | --- | --- |
| Bundle purity, every portal | `node scripts/release-audit.mjs --build`, run on unobfuscated twins | 10/10 clear: own SDK only, no source maps, no dev-only art views, no leftover survivalist services |
| Poki: no external requests, no CSP meta | release audit | clear (`game-cdn.poki.com` only) |
| Playgama / YouTube Playables | release audit | `game_api/v1` tag present; no CSP meta; no Page Visibility API or `navigator.language` in our code (the vendored Bridge v2 uses them internally); baked leaderboard |
| Yandex: no third-party URLs | release audit | clear |
| CSP names only its own portal | `tests/platforms/csp.test.ts` | Each build lists only its own portal. Clarity, jsonbin, getpantry, PeerJS and Sentry are gone |
| Cross-browser | Chrome, Edge, Opera, Firefox, WebKit on the built web bundle | 5/5: cold boot < 2 s → duel won → unbox → wipe → admire → map, zero console errors |
| Small viewports | 320×658 portrait and 764×385 embed, 9 scenes each | no horizontal overflow, no console errors; Options uses two columns on short, wide screens |
| Localisation | en / de / ar / ja at both sizes; key parity (21 locales) | `dir`/`lang` correct; Arabic joined and legible; the language picker shows the language on screen; no italics or tracking on non-Latin scripts; no untranslated strings |
| Portal QA batteries | `pnpm qa:portal` | see `game-implementation-plan.md` (S7 result) |
| Archives | `pnpm build:all` | all 10 within budget |
| Images | `compress-images` dry run | already compressed (a further pass would save 1.5 kB) |

## Re-checked at S10 (the release candidate)

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

## Added after S10 — who can finish the story?

| Check | How | Result |
| --- | --- | --- |
| The first ten duels, for a child under nine | `pnpm test:winrate` | 83–98 % on the first try, 100 % within three. Before the S11 easing: 8.9 % on duel 1 and 0.8 % on chapter 1's boss |
| The rest of the story, same child | `pnpm test:winrate` | every chapter ≥ 99.3 % within six tries; the first try falls from ~90 % (chapters 1–2) to 1–35 % (chapters 6–10), which is the "a bit harder" the owner asked for |
| §7.2's core child is untouched | `pnpm test:winrate` | 91.7–100 % first try on every group of every chapter, against floors of 90/85 % (standard) and 75/60 % (boss) |
| It is still a game | `pnpm test:winrate` | a duel nobody touches is a duel nobody wins, at full easing and full Dream Dust, on all ten teaching nodes |

`pnpm test:winrate` now runs about six minutes: it measures two children rather
than one, and the small child's table is six attempts deep.

## Added after S10 — does the copy fit the chrome?

| Check | How | Result |
| --- | --- | --- |
| Every caption fits its box, in every language | `node tools/locale-fit/audit.mjs` | 21 locales × landscape and portrait, every screen that carries text: nothing cut by its box, painted over by a neighbour, or hanging off its plate |

The localisation row above is a spot check by eye, and it passed while the
German loss screen read "Zum Duell tippe" with its tail under the Map button
and a title half a panel wider than the panel. A word that does not fit breaks
no assertion and throws nothing — it has to be MEASURED, which is what the tool
does: it tours the game through the QA hooks in every shipped locale and reports
every label whose ink leaves its box. Run it before a release, and after any
change to a caption, a plate size or a type scale.

One harness note: the in-browser "foe magic seen" probe (at 4-3, 5-3, 7-3 and 9-3) reads false, as it did at S4. It cannot fire: the foe's ward answers an incoming shot and its pierce answers a raised guard, and the probe neither casts nor guards after its first rune. The AI's use of magic is pinned by `tests/duel/magic.test.ts` (green).

## Owner actions — blocking, per portal

- [ ] **GameDistribution:** set `VITE_GAME_DISTRIBUTION_GAME_ID` in
  `.env.game-distribution`. While it is blank, the SDK loader is compiled out
  and that build shows no ads (the release audit warns).
- [ ] **Yandex:** set `VITE_GAME_ID` in `.env.yandex.local`.
- [ ] **Poki:**
  - set `gameId` in `tools/poki-deploy/poki.config.mjs` (it is blank; `team`
    is `hyperg8`, so confirm that is right for this game), then run
    `pnpm deploy:poki`;
  - run the Inspector on the uploaded version;
  - add a 628×628 thumbnail, full-bleed, with no text.
- [ ] **Glitch:** the install ids and token in `.env.glitch`, if that
  portal is used.
- [ ] **CrazyGames:**
  - submit the pre-release build first;
  - after acceptance, set `VITE_APP_CRAZY_GAMES_FULL_RELEASE=true` and
    resubmit. The full-release behaviour is already QA'd (37/37).
- [ ] **Playgama / YouTube Playables:**
  - run YouTube's SDK Test Suite on the uploaded build;
  - a Playgama-hosted leaderboard (`VITE_PLAYGAMA_LEADERBOARD_ID`) is
    optional. The build ships our baked board, so leave it blank unless the
    board exists on the Playgama dashboard.
- [ ] **Store art:** every portal wants cover and thumbnail images. The
  painted-art pipeline (S6) can make them once paintings exist; otherwise,
  capture them from the game.

## Owner actions — decisions

- [ ] **Child-directed:** `VITE_CHILD_DIRECTED` is unset, so the build is
  treated as general audience (D1: all ages, cozy). Setting it adds the
  non-personalised-ads note under "For Parents". Whether this is a
  child-directed service is a legal call for the owner.
- [ ] **Privacy policy:** `VITE_PRIVACY_URL` is unset, so "For Parents" shows
  no link. Some portals ask for one; on Poki and Playgama the link never shows
  (outbound links are not allowed there).
- [ ] **Real iOS device:** WebKit passed on Windows, but a real iPhone or iPad
  is the final Safari check (audio unlock, safe areas, touch).

## Optional

- [ ] Painted art: run the image model from `art-sheets/PROMPTS-*.md`,
  `pnpm slice-sheets`, check `/#/playground`, then set
  `VITE_ENABLE_ART_OVERRIDES=true` (story-spec §8.20).
