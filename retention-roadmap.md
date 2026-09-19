# Auroras Magic — retention roadmap

Post-launch features and action points (playbook Phase 8; story-spec §8.23),
for Day-1 retention, average playtime, easy-to-pick-up / hard-to-put-down, and
new-player conversion. Written 2026-09-19 against the game as built (S0–S8).

Sorted by **impact** first, then **performance cost** (lower first), then
**game feel**. Every item names the code it touches and the event that
measures it. Item 1 comes first because the rest are judged by its numbers.

## Guardrails

Every item below stays inside these; an idea that breaks one is not on the
list.

- **All ages, cozy (D1):** the youngest players are 3. No streaks that
  punish a missed day, no FOMO timers, no loss screens that shame, no
  reading required to progress.
- **No currency (D3):** rewards are cosmetic (blooms, keepsakes, stickers,
  stars), never a balance.
- **Portal rules:**
  - Poki and YouTube Playables: no external requests, no name entry, no
    Page Visibility API.
  - Yandex: no third-party URLs.
  - Everything here runs locally or through the existing portal-only
    analytics sinks.
- **Babble voice only (D6); no pass-and-play (C18).**
- **Performance:** S8 left about 12 ms of headroom per frame at the target.
  Anything that spends it goes through `scripts/perf-scenes.mjs` and the A/B
  loop first.

## At a glance

| # | Feature | Moves | Impact | Perf cost | Game feel | Effort |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | First-session funnel analytics | all of them (measures) | enabling | none | — | 1 d |
| 2 | Faster first stroke on a cold boot | conversion | high | none | + | 1 d |
| 3 | Creature sticker album in the tent | playtime, put-down | high | low | ++ | 2–3 d |
| 4 | A sparkle star per node (replay goals) | playtime after the finale | high | none | + | 2–3 d |
| 5 | A gentle daily gift, no streaks | D1 / D7 return | high | none | + | 1–2 d |
| 6 | "Next up" peek after every restore | nodes per session | med-high | none | + | 0.5–1 d |
| 7 | Perfect-rune sparkle | game feel, skill | medium | low | +++ | 1 d |
| 8 | Visible help after two losses | fewer quits after a loss | medium | none | + | 1 d |
| 9 | Painted art, chapter 1 first | conversion, first impression | medium | measured | ++ | owner + 0.5 d/chapter |
| 10 | Welcome-back recap | pick-up after a break | medium | none | + | 1 d |
| 11 | "Next rank" line on the win | replays | medium | none | + | 0.5 d |
| 12 | Friendship Duo earlier (owner decision) | co-play playtime | medium | none | ++ | 0.5 d |
| 13 | Non-reader onboarding pass | conversion (3–5 yr olds) | medium | none | + | 1 d |
| 14 | Seasonal palette events | return visits | low-med | none | ++ | 1–2 d each |
| 15 | Chapter leitmotifs and victory stingers | game feel | low-med | none | ++ | 2 d |
| 16 | Dress-up photo card in the tent | ownership, return | low-med | low | ++ | 2 d |
| 17 | A "sparkle" quality tier for strong devices | game feel | low | spends headroom | ++ | 1 d + A/B |
| 18 | Portal fit-test watch (action point) | conversion, playtime gates | high when it bites | none | — | per portal |

---

## 1. First-session funnel analytics

**Why first:** there is no retention number yet, only guesses. The game
already tracks 13 events (`duel_start/end`, `wipe_*`, `first_rune`,
`recognition_attempt`, …), but not the funnel steps nor a returning player.

**Do:**
- Add a `lastPlayedDay` field (YYYYMMDD) and a `sessions` counter to
  `am_campaign` (`src/game/campaign/state.ts`, with its migration).
- Add these events to the `AnalyticsEvent` union in `src/use/useAnalytics.ts`:
  - `session_start {returning, daysSinceLast, furthest}`;
  - `first_stroke {msSinceBoot}`;
  - `first_cast`, `first_win`, `first_restore`;
  - `dialogue_skip`;
  - `tent_open`, `keepsake_equip`, `spellbook_open`;
  - `node_replay`.
- Fire each at its existing call site (`flow/nodes.ts`, `restoreFlow.ts`,
  `AppScene.vue`).

**Measure:** portal dashboards. Nothing new is sent anywhere; this uses the
two existing, non-load-bearing sinks.

## 2. Faster first stroke on a cold boot

**Why:** Poki grades conversion on the first `gameplayStart`, and a
3-year-old cannot read the opener's bubbles. Today a first boot goes splash →
chapter 1's opener dialogue → the duel's intro beats → the first stroke.

**Do:**
- For node 0 only, play the opener's first bubble over the arena while the
  rune's ghost trace already runs. That is `story.ts` OPENERS[0] plus the
  dialogue scene: show the bubble, not a full dialogue scene.
- Keep the skip icon.
- Target: under 10 s from the splash to the first stroke, measured with
  item 1's `first_stroke.msSinceBoot`.

**Watch:** the gameplay bracket rules (no `gameplayStart` before the first
touch). `scripts/portal-qa.mjs` already asserts them.

## 3. Creature sticker album in the wardrobe tent

**Why:** there are 50 tap creatures (one per restored sector, `TapCreature`)
and 10 chapter rescues (`rescued`). Children already tap them for the
peek-a-boo, and a page of silhouettes waiting to be filled in is the
strongest hard-to-put-down loop a cozy game has.

**Do:**
- **Save:** a 50-bit `creaturesMet` bitset, set in the map's `peekCreature`
  and the admire view's peek.
- **Tent:** a second tab, the album. Each cell draws the creature with its
  OWN painter (`tap.draw(g, 1, t)`) at album size, or its silhouette (the
  same painter drawn black at 20 % alpha) while it is unmet. The 10 rescues
  get a gold frame.
- **i18n:** only the album's title and one hint line, in all 21 locales.

**Measure:** `sticker_collect {node}` and taps per restored-sector visit.

## 4. A sparkle star per node (replay goals)

**Why:** finished nodes are replayable (`flow/nodes.ts` `isReplay` → straight
into the duel) but a replay earns nothing except a leaderboard win. After the
finale there is no goal left.

**Do:**
- One optional goal per node, shown as a small star on its map card, and
  derived from state the sim already has. Examples:
  - "win with this chapter's new rune" (`CHAPTERS[c].newRune`);
  - "win with a 3-rune spell" (`hud.cast`'s kind);
  - on bosses, "win without being frozen".
- **Save:** a 50-bit `stars` bitset.
- **Map:** the chapter tabs show `★ 3/5` as a glyph and a number, no words.

**Measure:** `node_replay` and the star completion rate. Check the goals are
reachable for a child with `pnpm test:winrate`'s core-child policy.

## 5. A gentle daily gift — never a streak

**Why:** a reason to come back tomorrow, without the dark pattern. Missing a
day costs nothing, and there is no counter to break.

**Do:**
- **Trigger:** once per calendar day (item 1's `lastPlayedDay`), the first map
  visit sets a small gift beside Aurora (`drawGift`, the game's own).
- **Reward:** opening it gives a bloom on a random restored, unbloomed sector
  (D3's existing cosmetic reward, `useDuelRewards`). When none are left, it
  gives a sticker from item 3 instead.
- **Clock:** the local device date only. No server; fine on Poki and
  Playables.

**Measure:** `session_start.returning` with `daysSinceLast = 1`.

## 6. "Next up" peek after every restore

**Why:** the moment a sector turns to colour is the moment most likely to end
a session. Show where the story goes next, so "one more" is one tap away.

**Do:**
- In `restoreFlow.ts` `onRestoreFinished`, after the zoom-out, pan
  (`focusMap`) to the next node and give its gift one extra wiggle.
- If the next node is a boss, flash the Guardian's shadow on its card for a
  second.

**Measure:** nodes per session.

## 7. Perfect-rune sparkle

**Why:** drawing is the game. A neat rune should feel different from a
scrappy one, and children draw neater when neatness sparkles.

**Do:**
- `recognition_attempt` already carries the classifier's `margin`. Above a
  high threshold, trigger:
  - a star burst on the stored rune (`fx.ts` `sparkleBurst`);
  - a brighter chime (`audio.ts`);
  - a short "✨" beside the slot.
- Make it cosmetic only, so the tuned win rates (§8.18) are untouched.

**Measure:** the share of strokes above the threshold over a session. It
should rise.

## 8. Visible help after two losses

**Why:** Dream Dust already eases a foe after losses (`sim.ts` `dreamDust`,
`lossStreaks`), invisibly. A child who loses twice needs to SEE that help
arrived.

**Do:**
- At `lossStreakOf(n) >= 2`, turn on the rune trace-assist ghost for that
  duel only (`useAccessibility`'s `traceAssist`, not the saved setting).
- Aurora gives one encouraging line with a picto (§10's portrait system).

**Measure:** retry → win on that node, and quits right after a loss.

## 9. Painted art, chapter 1 first

**Why:** the portal thumbnail and the first screen decide conversion. The S6
pipeline is ready (§8.20).

**Do:**
1. Paint chapter 1's 5 sectors, the items and the runes.
2. `pnpm slice-sheets`, then check them in `/#/playground`.
3. Turn on `VITE_ENABLE_ART_OVERRIDES` for ONE portal first and compare its
   conversion against the procedural build.
4. Then continue chapter by chapter.

**Perf:** re-run the canvas census (`scripts/perf-scenes.mjs … art=on`) with
the real paintings; they are heavier than S8's synthetic ones.

## 10. Welcome-back recap

**Why:** after a few days away, a child does not remember where they were.

**Do:**
- On `session_start` with `daysSinceLast >= 2`, Aurora greets with two
  bubbles over the map. Pictos carry the meaning: the count of restored
  sectors, and the next node's biome icon.
- Use the dialogue system and portraits that already exist (§10), plus two
  new i18n keys.

## 11. "Next rank" line on the win

**Why:** the rank badge (`RankBadge`, `useLeaderboard.rankFor`) shows where
you are, not how close the next step is.

**Do:**
- On the win flourish, add "3 more wins to #1,120": `rankFor(score + k)` for
  the smallest k that improves the rank.
- Numbers only, no names. It works on the baked boards (Poki, Yandex,
  Playgama) too.

## 12. Friendship Duo earlier — an owner decision

**Why:** versus (S5) unlocks at the finale, so most players never see it,
and co-play sessions run long.

**Option:** unlock it after chapter 3 (the v1 boundary), with the kit both
players have learned so far. D5 and C18 are unaffected: it stays two players
on one landscape screen, not pass-and-play. This changes a spec ruling (the
10-5 chest's keepsake), so it needs the owner's yes.

## 13. Non-reader onboarding pass

**Why:** the youngest players cannot read "Draw the rune".

**Do:**
- Audit every onboarding caption (`DuelHud` intro beats, the restore's first
  wipe) for a picto or motion equivalent.
- Add an animated finger ghost that traces the first rune until the first
  stroke lands.

**Measure:** `first_rune` time.

## 14. Seasonal palette events

**Why:** returning players find something new, without new art.

**Do:** date-gated palette and prop swaps through the existing theme tables
(`arenaThemes.ts`, the map's `PAGE_WASH`): lanterns in winter, petals in
spring. The device date decides; nothing is fetched.

## 15. Chapter leitmotifs and victory stingers

**Why:** feel. Each chapter already has its own ambience loop (`AMBIENCE`,
`audio.ts`).

**Do:** a short procedural motif per chapter layered on the duel music, and a
distinct stinger for a boss win.

## 16. Dress-up photo card in the tent

**Why:** pride in the keepsakes collected.

**Do:**
- A "pose" button snapshots Aurora in her keepsakes over the chapter's
  restored sector, onto a canvas card kept in the album (item 3).
- Local only: no sharing, no upload (Playables, Poki).

## 17. A "sparkle" quality tier for strong devices

**Why:** S8 measured about 12 ms of spare frame time on the mid-range proxy,
and more on desktops.

**Do:**
- An `S.q = 2` tier with more particles and extra glows.
- Entered only through the existing hysteresis (it drops back when frames
  slow).
- A/B it with `perf-ab.mjs` before shipping.

## 18. Portal fit-test watch (action point)

**Why:** Poki's player fit test needs at least 3 min of average playtime and
at least 25 % of sessions over 3 min. Other portals grade similar gates.
Chapter 1's structure decides both.

**Do:**
- After the first portal week, read item 1's funnel.
- If a playtime gate fails, run the `casual-game-onboarding-player-optimization`
  skill instead of tuning by feel. It finds where weak first-time players
  actually quit.
