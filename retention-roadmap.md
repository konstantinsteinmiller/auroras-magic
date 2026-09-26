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
| 1 | First-session funnel analytics ✅ | all of them (measures) | enabling | none | — | 1 d |
| 2 | Faster first stroke on a cold boot ✅ | conversion | high | none | + | 1 d |
| 3 | Creature sticker album in the tent ✅ | playtime, put-down | high | low | ++ | 2–3 d |
| 4 | A sparkle star per node (replay goals) ✅ | playtime after the finale | high | none | + | 2–3 d |
| 5 | A gentle daily gift, no streaks ✅ | D1 / D7 return | high | none | + | 1–2 d |
| 6 | "Next up" peek after every restore ✅ | nodes per session | med-high | none | + | 0.5–1 d |
| 7 | Perfect-rune sparkle ✅ | game feel, skill | medium | low | +++ | 1 d |
| 8 | Visible help after two losses ✅ | fewer quits after a loss | medium | none | + | 1 d |
| 9 | Painted art, chapter 1 first | conversion, first impression | medium | measured | ++ | owner + 0.5 d/chapter |
| 10 | Welcome-back recap | pick-up after a break | medium | none | + | 1 d |
| 11 | "Next rank" line on the win | replays | medium | none | + | 0.5 d |
| 12 | Friendship Duo earlier (owner decision) | co-play playtime | medium | none | ++ | 0.5 d |
| 13 | Non-reader onboarding pass | conversion (3–5 yr olds) | medium | none | + | 1 d |
| 14 | Seasonal palette events | return visits | low-med | none | ++ | 1–2 d each |
| 15 | Chapter leitmotifs and victory stingers | game feel | low-med | none | ++ | 2 d |
| 16 | Dress-up photo card in the tent ✅ | ownership, return | low-med | low | ++ | 2 d |
| 17 | A "sparkle" quality tier for strong devices ✅ | game feel | low | spends headroom | ++ | 1 d + A/B |
| 18 | Portal fit-test watch (action point) | conversion, playtime gates | high when it bites | none | — | per portal |
| 19 | Friends Spa ("Bath time"): groom the chapter's creature (no-lose play) — owner-ruled | playtime, no-lose path, return visits | med-high | low | +++ | 5–6.5 d incl. art (+2 d tent, +1.5 d finale) |
| 20 | Umbra's Path: the same book from the other side (`umbra-GDD.md`) | lifetime playtime, return after the finale, store hook | high (the biggest post-finale lever) | none | +++ | ≈15–19 d incl. art and 21 locales |

## Baseline: the playtime to beat (modelled 2026-09-23)

There is no measured number yet — item 1 is what replaces this section with
facts. Until it reports, this is the baseline every item below is judged
against, derived from the game's own content arithmetic (story-spec §7.7) and
2026 portal benchmarks.

**The estimate.** Per session: **≈5–7 min average, ≈2.5–4 min median**, with
**25–40 % of first-time visitors gone inside 60 s**. Per player, lifetime:
**≈10–18 min** across all visits; a player who returns and finishes spends
**≈55–70 min over ≈5 sittings**.

**What the content allows.** 50 nodes at 56 s (53 s from the Eraser on) and
85 s per boss = **≈55.1 min of campaign** including map browsing. A clean stop
point every ≈1 min and a strong one every ≈5 min (boss reveal + keepsake + new
rune) is exactly the shape portals reward. After the finale, `isReplay` grants
nothing, so the content ceiling — not the player's interest — is what caps the
top decile. Items 3, 4 and 5 are the ones that lift that ceiling.

**The benchmarks it is judged against.**

| Source | Figure |
| --- | --- |
| Poki player fit test | ≥3 min average to pass; 5+ min = strong; 10+ min expected of management/sim |
| CrazyGames Basic Launch | 10+ min average play time for successful titles; D1 10–15 %; 80 %+ convert past 1 min |
| CrazyGames 2026 US study (1.74 bn sessions) | 30 min average **on site**, spread over 2–3 games |
| Poki 2026 study | 11–20 min on site, 2–3 games tried per session |
| GameAnalytics 2026 | top-quartile mobile: 5.2 min sessions, 22–24 min/day; median ≈12 min/day |
| Kids 6–12, mobile | 15–25 min per sitting, several sittings a day |
| Girls'-portal pet/care games | positioned for sessions of 5 min or less |

**Per destination, what to expect:**

| Destination | Expected average playtime | Verdict |
| --- | --- | --- |
| Poki fit test | 3.5–6 min, 30–40 % of 500 plays over 3 min | passes the 3 min bar, short of the 5+ tier |
| CrazyGames | 5–8 min | fine for a Basic launch, under the 10+ mark |
| Playgama / GamePix / GameMonetize / GameDistribution | 3–5 min | lowest-intent traffic |
| A girls'/kids' audience specifically | 4–7 min, more return visits | good audience match, taxed by the skill gate |

**Why not higher.** The cozy wipe is the hook the "cleaning / animal" category
brings players in for, but here it is *earned* by beating a rival who does not
wait — and the ASMR-cleaner apps that average 10–20 min sessions have no skill
gate at all, so their numbers do not transfer. Gesture recognition is the
hardest thing in the game for the 3–5 band; desktop players draw with a mouse;
and the first interstitial at 240 s lands near the chapter-1 boss. Against
that: a 19 s wordless intro, a ≈1 min node, visible progress, a new rune every
chapter, and a loss beat that does not shame anybody.

**What would move it,** in order: the sub-minute bounce (items 2 and 13 own
more than half the gap between 6 min and 9 min), a no-lose path for the players
the category tag delivers (item 19), and the content ceiling (items 3, 4, 5).
Item 18 watches whether a real portal agrees with any of this.

---

## 1. First-session funnel analytics ✅

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

**Done 2026-09-23.** Eleven events wired; `session_start` derives `returning` /
`daysSinceLast` from local calendar dates only (`src/game/campaign/session.ts`,
which also owns `localDay()` and the backwards-clock clamp). Six save fields
landed in `am_campaign` without a schema bump — `readCampaign` is total, so an
older blob grows them on its next save. `creatureMet()` / `meetCreature()` in
`campaign/controller.ts` are wired at both peek sites, so item 3 never has to
import the map.

## 2. Faster first stroke on a cold boot ✅

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

**Done 2026-09-23. Measured ≈24 s → ≈1.3 s** to the first drawable prompt
(headless Chrome on a private profile, fresh save per run, `first_stroke
.msSinceBoot` read off the analytics ring; a patient first-timer took 23.8–24.6 s
before, and even a player mashing skip took 6.0 s). Node 0's opener is now
chrome over the arena, not a scene: pointer-transparent, pauses nothing, folds
on the first real stroke, and still waits for `firstLoadAdSettled()` so a
mandatory ad covers a calm arena.

**⚠️ OWNER DECISION EMBEDDED HERE — the 19 s picture book moved off the front of
the game.** The 10 s target is unreachable with it there. It now plays at the
first map reached with nothing owed and something won (a full node: duel → gift
→ wipe → colour back) — deliberately not at a boot, because every session's
first stroke is the number this item moves and a returning player's second
session must not become her first one again, and deliberately not while a gift
is still waiting, because that is 19 s between a child and the present she just
won. `introSeen` is unchanged. A brand-new player therefore meets the duel before
the story — **accepted by the owner**, who then moved the book again, to just
before the very first cleaning (story-spec §8.26b).

**Owner ruling, same day: node 0's opener prints ALL THREE bubbles,** turning
themselves over, not just the first — Umbra's reply and Aurora's answer were
otherwise sitting translated in 21 locale files with no player ever seeing
them. The pace is the picture book's own shortest page (3.4 s, from `intro.ts`
`BEAT_LEN`), so 10.2 s untouched, just under the 11 s the help note gets for
ONE line over the same arena. It costs nothing: the foe forms nothing until the
first stroke, the sequence folds at whatever beat it has reached the moment a
real stroke lands, skip takes the whole thing, and the measured splash → prompt
gap is still **0 ms in every run** (1.7–2.0 s to the prompt; the ~0.6 s drift
from the one-bubble build is the loader's, from item 17's probe landing in
between). A bug the new tests caught on the way: the dwell reset rode on
`watch(i, …)`, which flushes on Vue's schedule, so under a burst all three
bubbles went by as one.

**Owner ruled the same day (story-spec §8.26b):** the book plays between the
first win and the first CLEANING — the first tap on a waiting gift plays it,
and its end opens that gift (`openGift`) — because after the first cleaning it
explained what the child had already done. The first stroke is untouched: the
boot still goes straight into node 0's duel.

The skip icon also moved onto the leaf over the arena: in the screen's top-right
corner it sat squarely on the foe's name plate and rune slots on a phone held
upright.

## 3. Creature sticker album in the wardrobe tent ✅

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

**Done 2026-09-23.** `src/game/album/stickers.ts` + `components/album/`. Each
cell bakes once onto its own canvas and the DOM adopts that canvas — 59 cells,
one buffer each, nothing per frame. **The cell framing is measured, not
guessed:** `album/measure.ts` runs a creature's own painter against a context
that implements the 2D API as arithmetic (no canvas, no `getImageData`) and
takes the difference between peek 0 and peek 1, so the cell frames the creature
and crops the log it hides in. Creature ink ranges 0.75–2.8 × the tap radius,
so the constant multiplier it replaced shrank chapter 1's moss sprite to 37 %
of its cell and cut chapter 3's pegasus in half; every creature now fills
≥ 75 %. 59 cells, not 60: chapter 10 has no rescue collectible (the finale is
the rescue), and the cell appears by itself if one is ever authored.

## 4. A sparkle star per node (replay goals) — REMOVED 2026-09-25

**Removed by the owner, 2026-09-25.** The chapter tabs' `★ 0/5` read as a
failing grade on chapters already finished, and nothing in the game said what
a star was for. "Nobody wants to chase." The tabs now count the chapter's
duels won (`3/5`, a finished chapter `5/5`, read off `furthestNode`); the goal
module, the card stickers, the `stars` save field and `star_earned` are gone.
A save that still carries `stars` is read without it. What follows is the
item as it was built.

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

**Done 2026-09-23.** `src/game/campaign/stars.ts` — three goals, all readable
off `lastPlayerCast()` + `S.foe`, so `sim.ts` needed no new export. Evaluated in
`campaign/controller.ts` keyed on `S.round`, so an abandoned duel's half-met
goal cannot leak into the next attempt. **The third suggestion above is not
shippable and was replaced:** "win without being frozen" would be a free star —
Frost Lock is the only freeze in the game, it is a Signature Spell, and
`foes.ts`'s `SIGS` gives it to nobody, so `S.frozen` only ever runs in 2P
versus. Bosses ask for the Guardian's counter rune instead, falling back to the
new-rune goal where the counter is out of reach (chapter 1's Briar wants Moon,
40 nodes away). A core-child policy that CHASES the star met it 100 % of the
time and still won 100 % of the time at nodes 2, 4, 10, 25 and 40.

## 5. A gentle daily gift — never a streak ✅

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

**Done 2026-09-23.** `src/game/map/dailyGift.ts`. One number in the save
(`giftDay`), moved on OPEN and never on offer — a gift seen and left is still
there tomorrow, and there is no counter that can grow or break. `landBloom()`
was extracted from `claimTwinGift` so the bloom looks the same through both
doors; with nothing left to bloom it gives a sticker instead, and with nothing
at all to give there is simply no gift. Opened through a real DOM button over
the canvas, so it is keyboard- and screen-reader-reachable like the Twin Gift.
Two deviations, both from what a browser actually showed: it waits beside the
NEXT NODE's card rather than beside Aurora (who is only drawn on the front
page, which a player seven chapters in never sees), and it wears a GOLD ribbon
— in green it sat one card away from the identical pending-sector gift, which
is a three-year-old tapping the wrong present.

## 6. "Next up" peek after every restore ✅

**Why:** the moment a sector turns to colour is the moment most likely to end
a session. Show where the story goes next, so "one more" is one tap away.

**Do:**
- In `restoreFlow.ts` `onRestoreFinished`, after the zoom-out, pan
  (`focusMap`) to the next node and give its gift one extra wiggle.
- If the next node is a boss, flash the Guardian's shadow on its card for a
  second.

**Measure:** nodes per session.

**Done 2026-09-23.** `peekNextUp()` in `map.ts`, wired from both of
`restoreFlow.ts`'s return paths (straight to the map, and via the wardrobe
after a keepsake). It holds 0.8 s on the restored sector, opens the next node's
page only if it is a different one, and shakes that node's BADGE — the roadmap
said "give its gift one extra wiggle", but the next node has no gift; gifts
only exist on won-but-unwiped nodes. A boss fades its Guardian silhouette up
and out inside the card's clip. Silent at the finale, and cancelled by the
first pointer-down or any chapter tab, so nobody fights the camera.

## 7. Perfect-rune sparkle ✅

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

**Done 2026-09-23.** `src/game/duel/perfect.ts`; threshold `PERFECT_MARGIN =
0.19`, chosen by measuring the shipped recogniser against a wobble-hand model
(the repo's own draw generators only jitter an exact polygon, so they score ~1.0
for every hand and cannot separate care from carelessness). At 0.19 a careful
hand clears 76 % and a scribbly one 25 %, and all twelve runes stay reachable —
the alphabet is not uniform, and 0.205 would have put Love out of a child's
reach entirely. Nothing is written into `S`, so no rule can read the flag.
**The one real leak, closed:** `fx.ts` rolled on the same `Math.random` stream
as the duel's damage, so ~34 extra draws per neat rune really would have moved
the fight; the sparkle now brings its own seeded stream (`borrowDice`), pinned
by a scripted-duel test that compares per-frame HP with and without it.

## 8. Visible help after two losses ✅

**Why:** Dream Dust already eases a foe after losses (`sim.ts` `dreamDust`,
`lossStreaks`), invisibly. A child who loses twice needs to SEE that help
arrived.

**Do:**
- At `lossStreakOf(n) >= 2`, turn on the rune trace-assist ghost for that
  duel only (`useAccessibility`'s `traceAssist`, not the saved setting).
- Aurora gives one encouraging line with a picto (§10's portrait system).

**Measure:** retry → win on that node, and quits right after a loss.

**Done 2026-09-23.** `src/game/duel/help.ts` + `DuelHelpNote.vue`. The ghost
goes on through a transient per-duel override (`setDuelTraceAssist`); the saved
Options setting is never read, written or clobbered. **Blind spot found and
fixed:** `newestRune()` returns -1 for a chapter-1 player, so the ghost would
have drawn nothing for exactly the child this exists for — the help path falls
back to the rune this foe fears, or her first rune. The note leaves when her
first rune lands or after 11 s of duel clock (pause- and ad-safe), suppresses
the "DRAW A RUNE" nudge so there is only ever one message, and never appears in
versus.

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

## 16. Dress-up photo card in the tent ✅

**Why:** pride in the keepsakes collected.

**Do:**
- A "pose" button snapshots Aurora in her keepsakes over the chapter's
  restored sector, onto a canvas card kept in the album (item 3).
- Local only: no sharing, no upload (Playables, Poki).

**Done 2026-09-23.** A card is a RECIPE, never an image:
`a1|<node>|<pose>|<mane>|<7 equipped ids>`, 30 chars at its worst against the
64-char cap, so six cards cost the portal cloud stores nothing. Six slots, and
**the seventh photo is never refused** — the ring drops the oldest and the new
card wears a gold ring for a moment. Two traps closed on the way: an outfit
that is not the one she is wearing needs its own hook composition
(`outfitHooks`), and all four hoof-trails are pooled emitters on a shared
clock, so asking the live emitter for a card frame drew pool garbage AND
restarted the trail behind the album — the card draws its own still.

## 17. A "sparkle" quality tier for strong devices ✅

**Why:** S8 measured about 12 ms of spare frame time on the mid-range proxy,
and more on desktops.

**Do:**
- An `S.q = 2` tier with more particles and extra glows.
- Entered only through the existing hysteresis (it drops back when frames
  slow).
- A/B it with `perf-ab.mjs` before shipping.

**Done 2026-09-23 — and the audit found a live bug first.** The existing
hysteresis restored on `S.fdt < 0.015`, but **a 60 Hz panel reports 16.7 ms
whether the frame costs 0.7 ms or 15 ms**, so that line tested refresh rate,
not strength, and on 60 Hz could never be true. Measured on the built bundle,
unthrottled: `q=0` at t+2 s and still `q=0` at t+30 s with 96 % of the budget
idle. **Every 60 Hz session was played in thrift** — no cel bands, no limb
shade stripes, no dread aura, one hair lock — and tier 2 was unreachable on top
of that. Both climbs now read `S.fw` (work inside the RAF callback); the DROP
still reads the interval at 24 ms, because a missed vsync is GPU backpressure
and work-per-frame cannot see it. The controller moved out of `AppScene.vue`
into `src/game/duel/quality.ts` so its rules are testable.

**"More particles" was the wrong shape and was not built.** `fx.ts` multiplies
`S.q` into particle counts, and at tier 2 that is wrong twice: every particle
costs `rnd()` draws off the duel's own damage stream outside `borrowDice`, so a
strong device would roll different damage than a weak one in the same fight;
and the 360-slot ring allocator means a doubled burst evicts the living tail of
the burst before it, making the big moments look *worse*. Counts are capped at
1. Tier 2 spends its headroom on DRAW-side work only: a second rank of grass on
the island rim, 28 more motes, a wider dread halo, an outer spark ring and halo
on a forming rune, two more steps on every keepsake glow, three more ghosts on
the Pet Star's trail — all ramping on `S.qx` over 1.5 s, so nothing pops.
`arena.ts`'s `clamp(S.q || 1, 0.3, 1)` was left alone: it is a bounds check on
a 96-entry table, not a tier multiplier.

**A/B (E1 restore fix, E2 the tier), interleaved, headed Chrome, built bundle,
finale boss, every keepsake worn, a rune pair every 600 ms:** desktop
`workP95` 1.700 → 1.800 (E1) and 2.000 → 2.100 (E2) — about 0.1 ms of a 16.7 ms
frame each, with ~14.6 ms still free; interval p95 unchanged, long tasks
unchanged, heap flat. On the ×4 mid-range proxy BOTH arms stayed at `q=0` in
8/8 runs: the weak device is never offered the tier. Recorded honestly in the
ledger: a no-keepsakes run came out the other way round — **the tier's cost is
at or below the probe's 0.1 ms resolution.**

Two method findings are now in `PERF-LEDGER.md`: an A-versus-A with provably
identical arms reported a confident **+39.7 % regression** when a neighbouring
process started compiling mid-run (at CPU ×4 on a shared box the noise floor is
tens of per cent — interleaving cancels drift, not a neighbour), and the S8
proxy baseline no longer reproduces, so it must be re-measured on a quiet box
before it is quoted again.

## 18. Portal fit-test watch (action point)

**Why:** Poki's player fit test needs at least 3 min of average playtime and
at least 25 % of sessions over 3 min. Other portals grade similar gates.
Chapter 1's structure decides both.

**Do:**
- After the first portal week, read item 1's funnel.
- If a playtime gate fails, run the `casual-game-onboarding-player-optimization`
  skill instead of tuning by feel. It finds where weak first-time players
  actually quit.

## 19. Friends Spa: groom the chapter's creature (the no-lose path)

**Status:** proposed 2026-09-23 and **ruled by the owner the same day**
(19.6). The rulings: yes to ≈45 s, skippable, per boss; Umbra's makeover
comes before the finale card; new wet and fluffy poses are painted as part of
the build; the tab reads "Bath time"; no early spa in v1. Not started.

**Why:** the game already serves the **cleaning** player (50 wipes) and the
**dress-up** and **collecting** player (the tent, the album, the photo card).
It does not serve the **animal-care** player. The creatures are peek-a-boo
stickers, not somebody the child looks after.

Every activity also sits behind a duel win. A child who cannot yet draw a
rune under pressure has nothing to do but lose. The baseline above names "a
no-lose path for the players the category tag delivers" as the second-biggest
lever on playtime. This item is that path, built on the engine the wipe
already has.

It is **not a second cleaning game**. It is a **caring** game: the same
satisfying rub, aimed at a friend who reacts to it, in a short routine of
different verbs (dust off, soap, rinse, dry and brush, treat).

### 19.1 Research basis (the evaluation of 2026-09-23)

The owner asked whether a cozy cleaning / animal-lover mini-game would help,
and which mini-games fit the story best. The findings follow, with facts first
and estimates marked as such.

**Facts**

- **The genre is a staple on the portals.**
  - Poki carries *Pony Pet Salon*, *Unicorn Beauty Salon* and *Become a Puppy
    Groomer*. CrazyGames has *My Pet Care Salon* and *Unicorn Family
    Simulator*.
  - Their ratings are mediocre: 74–76 % "like" on GirlsGoGames.
  - So demand is high and served mostly by clones, which leaves room for a
    well-made one.
- **"Dirty animal → clean, happy pet" is its own mobile sub-genre,** sold on
  ASMR (*Animal Cleaning: Pet Care*, *Pet Fever*). Reviews in the
  satisfying-games space say aggressive ad frequency is what makes players
  leave.
- **Cleaning satisfies a broad audience.** PowerWash Simulator passed 17 M
  players (March 2025). Its pull is visible progress plus an audio reward,
  which is what the wipe already does.
- **Cozy players skew female and play to relax.** Estimates put cozy
  audiences at ≈45–55 % female, and 72 % of women say they play to relax or
  pass the time.
- **Children like being the helper.**
  - Reviewers recommend Toca Pet Doctor for exactly that ("lets kids be the
    helper — powerful for this age group").
  - Playgama's 2026 girls-games review: "the step-by-step routine format
    appeals to kids who like following a process". A spa routine is that
    format.
- **Mini-games are used as breaks from the core loop.** Royal Match and
  Playrix run them for variety and to win back lapsed players. Royal Match
  leads match-3 on D30 retention at 16.5 %; that is a correlation, not proof
  that the mini-games cause it.
- **Precise gestures are hard for small children.**
  - In a 90-child study, only 57 % of 4–6-year-olds could tap an intended
    target. Among 7–8-year-olds, 40 % could slide and 30 % could
    drag-and-drop.
  - A rub that counts anywhere on the creature is the most forgiving input
    there is. Drawing a rune while a rival attacks is among the hardest.
  - The spa is the one activity the youngest band is sure to succeed at.
- **The strongest virtual-pet retention lever is off-limits.** That lever is
  guilt: a pet that gets hungry, sad or sick when neglected. D1 forbids it
  (no punishment, no FOMO), so there are no needs meters, no decay and no
  "your friend missed you".

**Estimates (arithmetic, not measurements)**

- Nine chapter spas at ≈45 s each, plus the finale makeover, add ≈7–8 min of
  campaign content. That is ≈15 % on top of the ≈55 min campaign.
- The bigger lever is probably the **free-play spa in the tent**: something to
  do after a loss, after the finale, and on a return visit.
- It will **not** fix the sub-minute bounce unless the first spa comes very
  early. That is a trade-off against item 2, and it stays out of v1 (19.6).
- Real numbers will come from the spa events added to item 1's funnel (19.5).

**The candidates the evaluation weighed.** Only the first two rows are this
item. The rest are recorded so they are not argued again.

| Mini-game | Story fit | Verdict |
| --- | --- | --- |
| **Friends Spa**: groom the chapter's creature once Umbra's dust is gone | every chapter's story is a rescue | **this item, phases 1–2** |
| **Umbra's party makeover**: Aurora brushes Umbra's mane for the Festival | the payoff of "Umbra is just lonely" | **this item, phase 3** |
| Shell Song (ch 2): a no-fail shell xylophone gives the sea foals their voices back | direct | a good second; its own item later |
| Star Sky (ch 9): trace constellations to relight the fallen stars | direct | rune practice without a rival; its own item later |
| Crystal jigsaw (ch 4) | fits | skip: drag-and-drop is too hard for the young |
| Festival treat baking | fits the finale | maybe later: needs a lot of new art |
| Flying/catching games, memory sequences, needs meters | — | no: fail states or the guilt lever |

**Sources:**
[Poki – Become a Puppy Groomer](https://poki.com/en/g/become-a-puppy-groomer) ·
[Poki – Girls games](https://poki.com/en/girls) ·
[CrazyGames – My Pet Care Salon](https://www.crazygames.com/game/my-pet-care-salon) ·
[CrazyGames – Unicorn Family Simulator](https://www.crazygames.com/game/unicorn-family-simulator-magic-world) ·
[GirlsGoGames – Pony Pet Salon](https://www.girlsgogames.com/game/pony-pet-salon) ·
[GirlsGoGames – Unicorn Beauty Salon](https://www.girlsgogames.com/game/unicorn-beauty-salon) ·
[Animal Cleaning: Pet Care](https://play.google.com/store/apps/details?id=com.minigamersclub.animal.cleaning.pet.care.game) ·
[Pet Fever](https://apps.apple.com/us/app/pet-fever-animal-grooming-game/id6479249249) ·
[Perfect Makeover Cleaning ASMR – review sentiment](https://marlvel.ai/intel-report/games/perfect-makeover-cleaning-asmr) ·
[PowerWash Simulator tops 17 M players](https://www.vgchartz.com/article/464291/powerwash-simulator-tops-17-million-players/) ·
[Why we like busywork in games](https://www.galaxus.at/en/page/powerwash-simulator-and-many-more-why-we-like-boring-busywork-in-our-games-40050) ·
[Cozy games 2025](https://respawn.outlookindia.com/gaming/gaming-guides/small-teams-huge-margins-cozy-games-are-2025s-stable-bet) ·
[Rise of cozy gaming](https://www.bryter-global.com/blog/the-rise-of-cozy-gaming) ·
[Toca Boca games ranked](https://screenwiseapp.com/guides/the-best-toca-boca-games-for-kids-and-creativity) ·
[Playgama – Top girls games 2026](https://playgama.com/blog/top-games/top-girls-games-2026/) ·
[Pet companion design](https://yukaichou.com/advanced-gamification/the-pet-companion-design-in-gamification/) ·
[GameRefinery – Minigames revisited](https://www.gamerefinery.com/minigames-revisited-how-developers-are-continuing-to-tap-into-trends-and-drive-engagement/) ·
[Royal Match D30 16.5 %](https://www.pocketgamer.biz/dream-games-royal-match-leads-match-3-d30-retention-at-165/) ·
[Children's touchscreen gestures (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC7303424/) ·
[NN/g – kids' physical development](https://www.nngroup.com/articles/children-ux-physical-development/)

### 19.2 The design

**Who is groomed.** The guest is the tap creature of the chapter's **boss
sector**, `sectorOf(5c + 4).tap`, where `c` is the chapter index counted from
0. All 50 sectors have one, five per chapter.
It is the creature the child has just watched peek out of the freshly
restored boss sector, still a little dusty, wearing that sector's tint.

This is deliberately **not** the chapter's rescue. Seven of the nine rescues
are objects (shell, shards, petal, sand clock, star), and chapter 10 has
none.

| Ch | Guest (body) | Painter entry | Panels today | Per-body twist in the routine |
| --- | --- | --- | --- | --- |
| 1 | moss sprite | `sprite`, sectors.ts:58 (**not exported yet**) | 2: asleep / awake | rinse waters its sprout, and a vector bud opens |
| 2 | sea foal | `seaFoal`, kitBay.ts:1997 | 2: `blow` "O" mouth | at the soap step it blows bubbles back (the `blow` panel) |
| 3 | baby pegasus | `babyPegasus`, kitSky.ts:1953 | 4: `PegPose` | the fluff step brushes its wings (`wings`/`flap` drive a flutter) |
| 4 | glowworm | `glowworm`, kitCaves.ts:1699 | 2: eye | the fluff step becomes a polish, and each pass lights one bulb (`lit` halo, vector) |
| 5 | mirror sprite | `mirrorSprite`, kitMirror.ts:1297 | 2: `wave` | soap becomes breath-fog and rinse wipes it; it waves thanks |
| 6 | rainbow foal | `rainbowFoal`, kitRidge.ts:1606 | 3: trot | the fluff step leaves a sparkle trail along the painted rainbow mane; a trot hop at the end |
| 7 | sand fox | `sandFox`, kitSands.ts:2083 | 1 | its spa sheet carries the joke: a rope-thin tail when wet, a huge fluff-ball tail once fluffed |
| 8 | snow hare | `snowHare`, kitTundra.ts:1990 | 3: ears + eye | ears fold while soapy and pop up at the rinse; its `shake` rotation already exists |
| 9 | star calf | `starCalf`, kitSummit.ts:1318 | 2: eye | its star spots twinkle as the fluff coverage rises |
| 10 | sprig | `sprig`, kitFestival.ts:2440 | 2: asleep / awake | tent free play only; the story finale is Umbra's makeover (phase 3) |

"Panels today" are the map's creature sheets. **The spa does not use them
(ruling 3).** Each guest gets its own **spa sheet** of three panels (dry,
wet, fluffy), painted when the spa is built (step 11). The map's sheets stay
exactly as they are.

**Where it happens.**

1. **The story spa**, once per chapter for chapters 1–9, ≈45 s and always
   skippable (ruling 1). It comes straight after the boss's reveal (and after
   the keepsake's wardrobe beat, where there is one), before the map.
2. **Free play in the tent**, forever. A new tent tab lists every guest whose
   chapter boss is won, and a tap opens the same routine. This is the no-lose
   path: after a loss, after the finale, on a return visit.
3. **The finale** (phase 3): Umbra's party makeover, **before** the finale
   card (ruling 2).

**The routine.** There is one gesture throughout: rub anywhere. Each step's
tool rides the pointer the way the sponge does, and the tools swap by
themselves between steps. Every step finishes the way the wipe does
(`COMPLETE_AT` 0.85 plus the 1.5 s idle grace, and the §8.6 graceful finish),
so no step can be failed.

| # | Step | Tool (vector) | What the rub does | The creature's reaction | Target, child hand |
| --- | --- | --- | --- | --- | --- |
| 0 | arrive | — | — | trots in and sits in the tub, sleepy and dusty | 2 s |
| 1 | dust off | the Stardust Sponge (`drawSponge`) | erases Umbra's dust over its silhouette (the **dry** panel underneath) | perks up a little with each pass (a bounce and a giggle wiggle) | 10–12 s |
| 2 | bubbles | bubble wand | *adds* foam over the silhouette | squashes and giggles; the sea foal blows bubbles back | 6–8 s |
| 3 | rinse | a little rain cloud or watering can | washes the foam off | the coat cross-fades from **dry** to **wet** as the foam goes (spa panels 1→2), then **the shake**: it shakes itself like a wet puppy and droplets spray out (the laugh beat, automatic) | 6–8 s + 1.5 s |
| 4 | fluff | a soft brush | dries and fluffs; strokes along the fur throw extra sparkles (cosmetic) | cross-fades from **wet** to **fluffy** with the coverage (spa panels 2→3): the coat puffs up and the eyes close in happy arcs; a warm, clean glow builds | 8–10 s |
| 5 | treat | a star-cookie | a tap anywhere feeds it; it feeds itself after 4 s, like the pots' `T_AUTOPICK` | munch ×3, crumbs sparkle | 3–4 s |
| 6 | nuzzle | — | — | hops up to Aurora, nuzzles her, a heart pops, then trots off | 3 s |

That is ≈40–50 s in total, which fits the owner's ≈45 s per spa (ruling 1).
The step radii and the targets are **tuned with a bot** (19.3 step 10), not
by feel. If the bot's child hand runs past ≈50 s, shorten the steps. Never
drop the shake or the nuzzle: they are the payoff.

**What it never does.** Each of these is a rule the project already has:

- **No meters, decay or streaks** (D1). A guest never gets dirty because you
  stayed away.
- **Nothing to buy** (D3): no shampoo shop and no currency.
- **No ad** (spec §2.2 rule 13): the spa joins the list of scenes no ad may
  interrupt.
- **No red "come back" badge** (rule 4). A skipped guest waits in the tent
  with a soft sparkle.
- **No second happy moment** (§11.6): the chapter's one happy moment stays at
  the boss chest.
- **Dust looks fuzzy, never grimy, and the guest looks sleepy, never sick**
  (§2.3). The pet-rescue genre's staples (mud, fleas, ticks, wounds,
  bandages) are all out.
- **Wordless**, with babble voice only (D6). Text exists only in aria-labels.
- **Always skippable** (ruling 1: "skippable is perfect"). A door button
  sends the guest to the tent and the child to the map. §2.6 allows no more
  than one node's worth of unskippable content between pause points.

### 19.3 Implementation guide

Line numbers are from the 2026-09-23 working tree, which has a lot of
uncommitted work, so they will drift. Search by symbol. **The owner edits
`mask.ts`, `wipe.ts`, `restoreFlow.ts` and `WipeScene.vue` in parallel.**
Build the spa as new modules plus small hooks into those files. Do not
refactor them.

#### Step 1: coverage learns a silhouette (`restore/mask.ts`)

`Coverage` only knows the whole 1152 × 672 rectangle:

- 24 × 14 save cells (`CELLS` = 336);
- a 96 × 56 sample lattice (`SUB` = 4);
- `rem` = the dust left per sample.

Every aggregate averages all samples: `coverage01` (203-207), `lookAt`
(268-290), and `doneCount` / `packCoverage` (310-340). `wipe.ts:849` needs
every cell done.

- Add an optional `inside?: Uint8Array` (one byte per sample, 5 376) plus
  `insideN` to `Coverage`.
- Make `coverage01`, `lookAt`, the per-cell cover and `doneCount` count inside
  samples only. A cell with no inside samples counts as done.
- **Why not just zero the outside samples?** It would inflate coverage. A
  creature filling 40 % of the frame would "finish" at 85 % once only 62.5 %
  of it was clean.
- The chunk test (`CHUNK_AT`, 8 × 8 windows) is local and survives unchanged.
- **With `inside` undefined, every path must be bit-identical.** Pin that
  with a test that replays `tests/restore/wipeBot.ts` strokes and compares
  coverage before and after the change.
- Precedents already in the repo:
  - `rescueCover` (`wipe.ts:492-498, 944-948`) is a coverage limited to a
    region;
  - `duelPage.ts:39-41, 248` reuses `Coverage` on a different drawing.

**Building `inside`:**

- Draw the guest once, at the spa transform scaled by 1/12, into a 96 × 56
  canvas. Read its alpha back **once, when the spa opens**. The no-readback
  rule covers the per-frame path, not a one-off at open.
- Dilate by one sample so the fur at the rim counts.

This is the only change inside the owner's restore files. Keep it additive
and say so in the commit.

#### Step 2: the guest table (`src/game/spa/guests.ts`, new)

- One `SpaGuest` per chapter:
  - the body painter (the entries in 19.2's table, called directly and **not**
    through `TapCreature.draw`, which also draws the log or cover through
    `tapCover()`);
  - the guest's **spa sheet spec** (`<BODY>_SPA_ART`, step 11). The spa always
    draws that sheet; the map's creature strip is never drawn in the spa;
  - the boss sector's look / tint;
  - the vector drivers that still apply over the painting: `blow` (sea
    foal), `wave` (mirror sprite), the pegasus's `wings`/`flap`, the
    glowworm's `lit` bulbs;
  - the verb swaps from 19.2;
  - the stage size: ≈0.7 × the 672-unit frame height, standing on the tub.
- Export `sprite` from `sectors.ts:58`. It is the one body that is not
  exported yet.
- The painted path works unchanged:
  - `drawItem(g, spec, s, frame, colour?)` (`artItem.ts:117`) cross-fades
    neighbouring panels;
  - it returns `false` when no painting exists, and the caller then draws the
    vector;
  - the one tinted region is baked once per (spec, colour) in the LRU
    (`artItem.ts:68-108`).
- The four untinted bodies (sea foal, glowworm, rainbow foal, sand fox)
  simply pass no colour.

#### Step 3: the controller (`src/game/spa/spa.ts`, new)

It has the same shape as `wipe.ts`, but its own module. `wipe.ts` is a
single-instance controller wired to sectors (`beginRestore(n, done)`,
wipe.ts:448), so reusing it would mean refactoring the owner's file.

- **API:**
  - `beginSpa(ch, mode: 'story' | 'free', done)`
  - `updateSpa(dt, now)` and `drawSpa(g)`, driven by AppScene. The module
    never calls `requestAnimationFrame` itself.
  - `spaPointerDown/Move/Up`, `spaHover`, `leaveSpa`, `spaActive`
  - `qaSpa` for the QA hooks
- **Phases:** `arrive → dust → foam → rinse → shake → fluff → treat → nuzzle
  → leave`. Every timer runs on `dt`, and the tool is lifted on pause
  (§3.10, `wipe.ts:24-26`).
- **Stage:** the same 12:7 frame as the wipe (`restore/frame.ts`). The
  backdrop is the tent room already drawn by `drawWardrobe`
  (`cosmetics/wardrobe.ts:241-299`), in its painted two-band blit, plus a
  vector tub. Aurora stands beside the tub through the rig, as in the
  diorama.
- **Dust (step 1):**
  - Bake the guest onto a transparent colour canvas, run
    `bakeDust(dust, colour, res, seed, extra)` (`dust.ts:125-179`), then make
    **one** `destination-in` draw of the guest. `bakeDust`'s `fillRect`
    passes also cover transparent pixels, so without that draw the dust is a
    rectangle.
  - Erase with `eraseStamp` (`dust.ts:182`).
  - The tool is the sponge from `brush.ts`, unchanged. Its only mask
    dependencies are `cellAt` and `isReturnVisit` (168-169).
  - Bake resolution follows the wipe's `res` rule (`wipe.ts:481-482`).
- **Foam (step 2) runs the same machinery with the polarity reversed.**
  - A second `Coverage` counts the foam still to add: each stamp lowers it and
    also draws a bubble cluster onto a foam canvas, clipped to the
    silhouette.
  - The frame stays one blit, never a particle per sample. The dust-ON
    precedent is `duelPage.ts:240`.
- **Rinse (step 3):** `eraseStamp` on the foam canvas, plus a pooled stream of
  water particles. Its coverage decides when the step is done.
- **The rinse drives the dry → wet cross-fade.** `drawItem`'s frame is
  `1 − foamLeft`, so the coat soaks as the foam washes off.
- **Shake:** 1.4 s after the rinse completes, drawn on the **wet** panel.
  - A decaying ±12° rotation at ≈9 Hz. The hare already has a `shake`
    rotation.
  - A radial spray of pooled droplets, halved on the low quality tier like
    the wipe's puffs (`wipe.ts:729, 910`).
  - A splash sound and a `tick` haptic.
- **Fluff (step 4):** a third silhouette coverage.
  - Each stamp throws sparkles; a stroke along the body's fur direction
    throws more.
  - A rim glow grows with coverage.
  - `drawItem`'s frame is `1 + fluffCoverage`, so the coat cross-fades from
    **wet** (panel 1) to **fluffy** (panel 2) as it is brushed. The fluffy
    panel's happy closed eyes are the bliss look.
  - Because panel order equals routine order (dry → wet → fluffy), every
    change is a neighbour cross-fade, which is the only kind `drawItem` does
    (`artItem.ts:132-141`). Nothing ever jumps.
- **Treat (step 5):** one tap anywhere, or it feeds itself after 4 s. There is
  no drag and no 44 px hunt (rules 11 and 12).
- **Nuzzle (step 6):**
  - Set the `groomed` bit and flush the save, as `finishWave` does
    (`wipe.ts:1010`).
  - Play a heart burst.
  - Then call `done('groomed')`.
- **Completion:** port `checkCoverage` (`wipe.ts:823-864`):
  - sample every `T_CHECK` 0.25 s;
  - finish on `COMPLETE_AT` 0.85 plus `T_IDLE_GRACE` 1.5 s, or on `graceNow`,
    or on `graceStopped`;
  - keep §8.6's rules: a single first pass never finishes, a solid chunk
    blocks the finish, and a hand-cleaned 100 % gets the same ceremony.
- **Show-how demo:** copy the wipe's pattern (`startDemo`/`stepDemo`,
  `wipe.ts:1294-1401`; constants at 97-105):
  - it makes a real zigzag stroke through the tool's `press`/`move`;
  - at most 3 per step;
  - no haptics, and its strokes are left out of analytics;
  - it hands control back on any press or mouse move (§8.25).

  If a later pass wants one shared `restore/showHow.ts`, that is the owner's
  call.
- **Tool at the pointer:** the lagged follow, lean, squish and bubble trail
  from `wipe.ts:1239-1288`. `toolSize` = clamp(0.2 × frame height, 64, 110).
  The system cursor is hidden by `.tool-cursor` (`AppScene.vue:728-729,
  769-770`).
- **Audio:** `sfx(cue, v)` (`duel/audio.ts:635`, cues at 242-251).
  - Reuse `scrub` (speed-limited to one every 90 ms) and `chime` (steps
    1–8).
  - Add four procedural cues: `bubble`, `splash`, `shake` and a creature
    `giggle` chirp (babble voice, D6).
  - The ambience is the tent's.
- **Haptics:** `haptic()` (`useHaptics.ts:204`): `scrub` while rubbing at the
  sponge's pace (`wipe.ts:765-769`), `tick` per step, `reward` at the nuzzle.
- **Reduced motion:** follow `useAccessibility.ts:9-13`. Ambient loops settle
  (bubble drift, tool bob) and one-shot reward beats keep their motion; the
  shake shrinks to a small wiggle.
  - Note that the wipe itself ignores the setting for its tool bob and motes;
    do not copy that gap.

#### Step 4: the scene (`'spa'`)

Missing any one of these gives a blank screen, not a compile error (the same
checklist as umbra-GDD §7):

1. `flow/scene.ts:16-18`: add `'spa'` to `SceneId`.
2. `use/useGameplayLifecycle.ts:45-46`: add it to the `LiveScene` union.
   `flow/bracket.ts:28` passes `S.flow.scene` into it, so skipping this is a
   type error.
3. The live rule at `useGameplayLifecycle.ts:92-103`: the spa is **live
   gameplay**, like `wipe` (line 97).
4. `views/AppScene.vue`:
   - resize: 114-117
   - pointer down / move / up: 163-196 / 206-245 / 249-260
   - keyboard: 302-339
   - update: 435-438; ambience: 442-443; draw: 457-466 (the fallback fill is
     what a forgotten scene looks like)
   - the DOM chrome `v-if` ladder: 730-738
   - the scene watcher that withdraws the Twin Gift: 366-379
5. A new `views/SpaScene.vue` for the chrome: the door button (aria-label
   only) and the treat button.
6. The hardcoded scene lists: `tests/platforms/gameplayLiveRule.test.ts:44`
   (the expected result at 47), `tests/platforms/flowBracket.test.ts:40` and
   the bracket tour in `scripts/portal-qa.mjs:885-915`.
7. `router/index.ts` is **not** touched: scenes are never routes.

#### Step 5: the flow hooks (`flow/restoreFlow.ts`)

- **Gate:** `why === 'restored' && nodeIsBoss(n) && !isGroomed(chapter)`.
- **Never gate on `isReplay`.** A boss counts as a replay the moment it is
  first won (`controller.ts:33`), and a wipe left with `'left'` and resumed
  later runs the restore flow again.
- **Chapter 1** (node 4; no keepsake, so it goes straight to the map):
  - In `onRestoreFinished` (66-109), move lines 90-107 into
    `backToMap(n)`: `focusMap`, then the finale card, or `offerTwinGift(n)`
    plus `peekNextUp(n)`.
  - At line 90, open the spa and hand it `backToMap(n)` as `done`.
  - **The Twin Gift must be offered after the spa.** Leaving the map
    withdraws it (`AppScene.vue:366-367`).
- **Chapters 2–9** (keepsake → wardrobe):
  - Set a `pendingSpa` in the keepsake branch of `onRestoreFinished` (77-88).
  - In `leaveWardrobe` (117-129), replace `gotoScene('map')` at line 121 with
    the spa when `pendingSpa` is set.
  - The spa's `done` runs the existing `focusMap(-1, true)` plus
    `peekNextUp(lastNode)` (123-127).
- **Chapter 10** (`FINALE_NODE`, versus unlock, finale card at 95-100): no
  spa in phases 1–2. Phase 3 opens Umbra's makeover **before** the finale
  card (ruling 2), and the finale card becomes the makeover's `done`.
- **Load the guest's spa sheet early.** When a boss node's restore begins
  (`beginRestore`), request it with `preloadArtOverrides([['creature', id]])`
  (`art.ts:271`). The spa opens ≈40 s later, so the painting is ready. If it
  is not, `drawItem` returns false and the vector draws.
- **Entering and leaving** go through `dipTo` (`flow/transition.ts:59-74`).
  - Apply the §8.32 deadlock rule: release any
    `acquireModalOpen`/`acquireAppPause` the spa holds **before** calling
    `dipTo`, and again on unmount.
  - Any DOM button over the canvas steps aside while a page turns
    (`map.ts:1425-1446`).
- **The door button (skip):** `done('left')`. The bit stays unset, the guest
  waits in the tent, and the child continues to the map exactly as if the
  spa had finished.
- **No `triggerHappytime`/`gamePixHappyMoment`** (§11.6).
- **No ad call site.** The only interstitials are `duelFlow.maybeShowInterstitial`
  (`duelFlow.ts:111-122`) and the first-load ad. Add `spa` to spec §2.2 rule
  13's list.
  - Rule 13 also asks for a unit test that enumerates every FSM state against
    the ad call sites. No such test exists yet; the nearest is the live-rule
    list at `gameplayLiveRule.test.ts:44`. Write it, with `spa` in it.

#### Step 6: save (`campaign/state.ts`)

- `groomed: number`: a 10-bit mask beside `rescued` (68 / 125 / 205), read
  with `int(r.groomed, 0, 0x3ff, 0)`.
- `spaVisits: number`: a capped counter, like `SESSIONS_MAX` (27, 220).
- **No schema bump:** `readCampaign` is total (214-218) and `migrate.ts:19-25`
  needs nothing.
- The save grows by ≈30 B against the 8 KB budget.
- **Cloud merge is whole-blob** (`SaveMergePolicy.ts:257-280`), so a
  `groomed` bit earned on the device that loses the merge is lost. That is the
  same as `rescued` today and acceptable: the tent still offers the guest.
- Tests go in `tests/campaign/campaignState.test.ts`.

#### Step 7: the tent tab and the album mark (phase 2)

- **Tab:**
  - `TentPage` becomes `'dress' | 'album' | 'spa'` (`WardrobeScene.vue:53`);
    the tab array is at 56-61.
  - Add a tub/bubble glyph to `TAB_DRAW`/`tentTabUrl` (`cosmetics/icons.ts:570-589`).
  - If the panel is a full sheet, withdraw the shelf as the album does
    (`setWardrobeShelf(0,0,0)`, 199-209).
- **Panel:** a new `components/spa/SpaPanel.vue`.
  - Guests are real buttons of at least 56 px, like the wardrobe tiles.
  - Each is drawn once onto its own canvas, as the album's `bakeSticker` does
    (`album/stickers.ts:188`), with the cell framing from `album/measure.ts`.
  - A tap opens the spa in `'free'` mode through `dipTo`.
  - A skipped story guest wears a soft sparkle, never a badge.
- **The tab reads "Bath time"** (ruling 4). In the code the feature stays
  `spa` (modules, scene id, keys, events). `slot.companion` already reads
  "Friend" (`en.ts:579`); keeping every new key under `spa.*` means the game
  never has two different "friends".
- The tab opening fires `tent_open` as today. The panel requests every
  listed guest's spa sheet when it mounts.
- **Album mark:** a small heart on the boss sector's tap cell once
  `groomed` has that chapter's bit. It is a CSS class passed from
  `AlbumPanel.vue:71` to `StickerCell.vue` (21, 58), so no re-bake and no
  change to the cache key.
- **Daily gift:** a new `DailyReward` `'visitor'` (`map/dailyGift.ts:57`,
  `candidates` 77-86). The order becomes bloom → sticker → visitor.
  - A groomed friend comes back with a leaf in its mane, and opening the gift
    walks the child to its spa.
  - A finished book then still gets a gift. Today, with nothing to bloom and
    no sticker left, there is no gift at all. It must never be an empty box
    (30-31).
  - Tests go in `tests/map/dailyGift.test.ts`.
- **Photo card:** add an `a2` recipe with a friend field
  (`album/photo.ts:85-127`), ≈33 chars against the 64-char cap.
  - `decodePhoto` must keep reading `a1` as "no friend".
  - Draw the friend at `k = 1` in `drawPhotoCard` (209-234).

#### Step 8: i18n

The spa itself is wordless. `spa.tab` is the only visible label; the other
three keys are aria-only:

- `spa.tab`: **"Bath time"** (ruling 4). Translate it as the idea of
  children's bath time, not "bathroom" and not "spa". Check that it fits the
  tab rail in the longest locales with `tools/locale-fit/audit.mjs`.
- `spa.leave` (the door)
- `spa.treat`
- `spa.guest` ("Bath time for this little one")

Add them to `en.ts` first, then to all 20 other locales (ar, de, es, fr, hi,
id, it, ja, kk, ko, nl, pl, pt, ru, th, tr, uk, uz, vi, zh).
`tests/i18nParity.test.ts` enforces it. Phase 3 adds a bubble only if the
Festival beat needs one; it then goes into `STORY_KEYS`
(`story/story.ts:267-273`).

#### Step 9: analytics (`use/useAnalytics.ts:73-123`)

Add these to the `AnalyticsEvent` union (it is the only place event names are
chosen):

- `spa_start {chapter, mode}`
- `spa_step {chapter, step, ms}`
- `spa_complete {chapter, mode, durationMs}`
- `spa_leave {chapter, step}`

Show-how strokes are excluded, as they are in the wipe.

#### Step 10: QA hooks, performance and tests

- **QA hook:** `window.__spa` beside `__wipe` (`AppScene.vue:598-605`),
  behind the `__AM_QA__` gate (533). It offers `start(ch, mode)`, `phase()`,
  `coverage()`, `complete()` and `finish()`.
- **Performance:**
  - Add a `record('spa', …)` block to `scripts/perf-scenes.mjs`, using the
    wardrobe block (176-184) as the template.
  - Budget: stay inside the wipe's measured p95 of 2.4–2.8 ms at CPU ×4
    (`PERF-LEDGER.md:35-38`).
  - The frame must be blits plus stamps plus pooled particles, with nothing
    allocated per frame.
- **Tests:**
  - `tests/spa/coverageInside.test.ts`: silhouette coverage, and the
    bit-identical check with `inside` undefined.
  - `tests/spa/spaTiming.test.ts`: a `spaBot` built from `wipeBot.ts`'s child
    hand. Every step must land in its target band (19.2). Tune the tool radii
    here.
  - `tests/spa/spaFlow.test.ts`:
    - the boss gate;
    - the chapter-1 path offers the Twin Gift *after* the spa;
    - chapters 2–9 go through the wardrobe;
    - the door leaves the bit unset;
    - a replay or a resumed wipe never re-triggers a groomed chapter.
  - Update the existing tests: the live rule, the bracket, `campaignState`,
    `dailyGift` and i18n parity. Also write the new rule-13 state
    enumeration (step 5).
  - In a real browser: the chapter-1 boss path through the spa on a phone in
    portrait and in landscape. Use a scratch `vite build` served by
    `vite preview` on your own port, never the owner's 2050/2061, with
    `window.__AM_QA__ = true`.

#### Step 11: art, a spa sheet per guest (ruling 3)

The owner ruled that the wet and fluffy poses are painted as part of the
build. They go on **ten new sheets**, one per guest, and not onto the map's
creature sheets.

**Why separate sheets:**

- **The map stays untouched.** Adding panels to a map sheet would change its
  union box, which moves every panel's crop and fit (`artItem.ts:48-51`).
  That strip would need a full repaint, and its creature would need
  re-seating in all five of its sectors. With separate sheets, the map's
  sheets stay byte-identical.
- **Resolution.** An image model returns a 16:9 sheet at about 1376×768
  (measured on the kept returns in `art-sheets/painted/`). Three panels give
  about 450 px a panel, while the map's strips are capped at 256 px. The spa
  shows its guest close up, at about 70 % of the frame height.
- **Routine order.** The panels run dry → wet → fluffy, so every change in
  the routine is a neighbour cross-fade (step 3).

**What each panel is.** The pose, size and place are the same in all three;
only the coat changes.

| Panel | State | Brief |
| --- | --- | --- |
| 1 | **dry** | clean, dry and awake, with a shy small smile. The coat the dust and foam sit on. |
| 2 | **wet** | soaked: fur, mane or moss clinging and slimmer, droplets. **Funny, never pitiful**: a surprised giggle, never tears or a frown (§2.3: no distress without reassurance). |
| 3 | **fluffy** | fluffed up to about 1.3× the volume, eyes closed in happy arcs. This is the bliss look for the fluff, the treat and the nuzzle. |

| Guest | Wet | Fluffy |
| --- | --- | --- |
| moss sprite | moss darker and flattened, leaf ears drooping, a drip off the sprout | moss puffed into a round cloud, leaf ears perked |
| sea foal | mane locks plastered to its neck (a sea foal, so it looks delighted) | mane fluffed into soft curls |
| baby pegasus | wings and mane soaked and drooping | wings puffed like dandelion clocks, mane a cloud |
| glowworm | segments glistening (the bulbs stay vector) | "fluffy" means polished: segments shining |
| mirror sprite | streaked with drops, antenna star drooping | polished to a mirror sheen, antenna star upright |
| rainbow foal | rainbow mane and tail soaked into thin strands | rainbow mane and tail fluffed huge and cloud-soft |
| sand fox | fur slicked, ears drooping, the tail a thin rope | the tail a huge fluff ball, fur puffed |
| snow hare | fur slicked, ears drooping, the scarf damp | a round snowball of fluff, the pom tail doubled |
| star calf | coat slick, star spots gleaming, ears drooping | coat fluffed, star spots twinkling |
| sprig | as the moss sprite, party hat askew and dripping | a moss cloud, party hat straight |

**Code, for each of the ten guests:**

1. Give the body's `<body>Shape` two parameters, `wet` and `fluff` (0..1),
   and draw both states in vector. That one drawing serves as the painter's
   reference, the art-off fallback and the in-between frames.
2. Add a spec `<BODY>_SPA_ART` with `frames: 3`, whose `draw(g, s, f)`
   renders dry, wet and fluffy at f = 0, 1 and 2. Register it in
   `CREATURE_SPECS` (`artDraw.ts:120-138`).
3. Add an id to `CREATURE_ART` (`artIds.ts:162-180`), e.g. `hareSpa`, filed
   under `images/creatures`. The family count in
   `tests/meta/artManifest.test.ts:81` goes from 17 to 27.
4. Add a `creature()` call to `CREATURE_SHEETS` (`artSheet.ts:600+`) with
   three panel lines and their checks. `itemSheetSize(3)` gives a 1536×864
   sheet at 512 px a panel (`artSheet.ts:66`).
5. Keep the same single tinted region as the body's map sheet (scarf, collar,
   hat, coat or body), drawn in `NEUTRAL` in all three panels. The four
   untinted bodies stay untinted.

**The prompt:**

- The four creature fixes apply as they are:
  - no `character: true`;
  - `CREATURE_NOT_A_STICKER`;
  - facing right, with the reason and the "nose nearer the right edge" check;
  - the contact-shadow check.
- `renderItemSheet`'s faint reference ink (0.4) applies by itself to
  `kind === 'creature'`.
- Add two checks:
  - "the same animal in the same place in all three panels — only the coat
    changes";
  - "the wet panel is funny, not sad".
- Paint under the active profile, `cozy-handdrawn-v2` (`artStyle.ts:157`).
  Never edit a shipped profile.

**Slice size.** The slicer caps a frame at 256 px unless the sheet raises its
own cap (`tools/slice-sheets.mjs:537`: `sheet.exact ?? Math.min(sheet.maxEdge
?? 256, SIZE)`).

- Set `maxEdge: 512` on the ten spa sheets. The slicer never upsamples, so
  the return's native ≈450 px is the real ceiling.
- The slicer reads `maxEdge`, but no sheet sets it yet. Add it to the
  `ItemSheet` type and check that it reaches `sheet-index.json`.
- Update the comment above the cap. A close-up the renderer draws is a new
  and deliberate exception to "everything the renderer blits keeps the cap".

**The round trip, per sheet** (≈2 min through the art desk):

1. `pnpm art:export -- --only creature-<name>-spa`. It needs the dev server:
   reuse the owner's on 2061 after checking its `<title>`, and never start a
   second one.
2. `pnpm art:prompts`.
3. The art desk. Read the port it prints.
4. `pnpm slice-sheets`.
5. `pnpm art:status`.

Ten sheets plus re-rolls come to about an hour of desk time.

**Checking the result:**

- Each guest in the spa at phone and desktop size, with art on and off.
- A creature frames-parity test. None exists; props have one at
  `artFamilies.test.ts:171-172`.
- `art:status` lists the ten new sheets as painted.

**Loading and bytes:**

- There is no preload-tier entry. A spa sheet is requested when its boss's
  restore begins (step 5) or when the tent tab opens (step 7).
- A ≈450 px three-panel strip is about 3× the bytes of a 256 px one. Only the
  open guest's strip loads, and nothing touches the first-load budget.

**Umbra (phase 3) needs no painting,** because her mane is vector (see
below).

#### Phase 3: Umbra's party makeover (chapter 10)

- **The guest is the rig:** `drawUnicorn(ctx, x, y, side, st, t)`
  (`duel/chars.ts:751`) with Umbra's palette (`PAL` index 1).
- **Brushing:** add a `PoseState` field (e.g. `groom` 0..1) that feeds
  `hair()` (chars.ts:578). Its amplitude `AM` is set per pose (809).
  Tangled locks (more wave, a few stray curls) turn smooth and shiny as
  coverage rises. The mane is vector (never painted), so this costs no
  painting.
- **Her fluffy pose** (ruling 3, the rig's version): at the end of the
  brushing, `hair()` also takes volume (fuller locks, a soft curl at the
  tips), so she ends as fluffed-up as the spa guests. There is no wet pose:
  she is being made ready for a party, not bathed.
- **Colour:** `PoseState.mane` already takes `[base, streak]` or `'rainbow'`
  (138-140).
  - Offer `MANE_SWATCHES` (`cosmetics/rig-cosmetics.ts:860`) as big pots, in
    the wipe's pot pattern (`potCue.ts`).
  - Pick one, or one is picked after 4 s.
  - Add a bow through `outfitHooks` (1046).
- **Then** the finale card (`restoreFlow.ts:95-100`). The makeover comes
  **before** it (ruling 2), and the card is the makeover's `done`.
- **Story:** the `FESTIVAL` beat (`story.ts:198-211`). "Umbra is just lonely"
  ends with Aurora making her ready for the party.
- **Umbra's Path** (`umbra-GDD.md`): the same scene becomes a **bedtime
  routine** (tuck in, lantern, lullaby), since "she is putting the world to
  bed". That is a note for that GDD, not part of this item.

### 19.4 Phases and effort

The day counts are estimates.

| Phase | Contents | Effort |
| --- | --- | --- |
| 1 | Steps 1–6 and 8–10: the story spa for chapters 1–9, the save, the album heart, i18n, analytics, tests, perf | 3–4 d |
| 1, art | Step 11 (ruling 3): vector wet and fluffy states in the ten `<body>Shape`s, ten spa sheet specs and prompts, `maxEdge`, the art-desk round trip, slicing, the frames-parity test | ≈2–2.5 d + ≈1 h of desk time |
| 2 | Step 7: the "Bath time" tab, the `'visitor'` daily gift, the photo card's friend | 1.5–2 d |
| 3 | Umbra's party makeover, before the finale card | 1.5 d |

### 19.5 Measure

- **`spa_complete / spa_start`** should be close to 100 %, because the spa
  cannot be failed. A low rate means it is too long or unclear. `spa_leave.step`
  shows where children leave.
- **Tent spa visits per returning session,** and the share of sessions in
  which a **loss is followed by a tent spa**: the no-lose path doing its job.
- **Average playtime against the baseline section,** and the boss-node
  duration (85 s → ≈130 s including the spa). Check that the extra time does
  not push chapter 1's end past the first interstitial at 240 s in a way
  that loses players there.

### 19.6 Owner rulings (2026-09-23)

The owner answered all five questions on 2026-09-23. They are binding for the
build and are referred to above as "ruling 1" to "ruling 5".

1. **Placement: yes.** "45 s per spa (skippable is perfect)."
   - The spa is not a node, so spec ruling C5 ("every one of the 50 nodes is
     a duel") stands unchanged.
   - It adds ≈45 s to the bosses of chapters 1–9 and is always skippable
     through the door button (steps 3 and 5).
   - A boss node runs ≈85 s → ≈130 s with the spa.
2. **Chapter 10: before.** Umbra's party makeover comes **before** the
   finale card, and the card is the makeover's `done` (step 5, phase 3).
3. **Art: new wet and fluffy poses, painted when the spa is built.**
   - This is a separate three-panel spa sheet (dry, wet, fluffy) for each of
     the ten guests, and the map's creature sheets are left untouched
     (step 11).
   - Umbra's fluffy pose is vector, through `hair()`, and she has no wet
     pose (phase 3).
   - The art is part of phase 1, not optional (19.4).
4. **The tab reads "Bath time".**
   - The code keeps the name `spa` (modules, scene id, `spa.*` keys, events).
   - "Bath time" is the only new visible text (step 8).
5. **No early first spa in v1: confirmed.**
   - The 10 s dust-off before the first duel stays out, because it competes
     with item 2's under-10-s first stroke.
   - If it is ever wanted, A/B it against item 2 using
     `first_stroke.msSinceBoot`.

**When the build starts,** copy these five rulings into `story-spec.md` as an
owner-ruling entry in §8 (the way §8.25 records the sponge). Add `spa` to
§2.2 rule 13's list of scenes that no ad may interrupt.

## 20. Umbra's Path: the same book from the other side

**Status:** designed in full in **`umbra-GDD.md`** (2026-09-23), two owner
rulings recorded there, **not started**. Aurora's story finishes first. This
entry is the retention case and the pointer; every design and implementation
detail lives in that document, and it is the file to open before any work
begins — not this section.

**Why:** this is the only item on the list that answers *"the player finished
all fifty nodes"*. Items 3, 4, 5 and 16 extend a session; item 19 adds a
no-lose path inside one; item 20 adds a **second campaign** to a game whose
content arithmetic (the baseline section) tops out at ≈55 min. It is also the
only item here that playtesters asked for by name — several asked to play
Umbra instead of Aurora.

It is cheap for its size because it is a **mirror, not a sequel**: one node
graph, one duel sim, one renderer, one wardrobe. `umbra-GDD.md` §4.1 is the
reason — the restoration model in `restore/mask.ts` counts *work done*, not
*dirt removed*, so it is already polarity-agnostic and the "draw shadows"
mechanic reuses it byte for byte. Roughly 100 % of the systems, ~15 % of the
content cost.

**What it moves:** lifetime playtime (a second ≈55 min campaign), return
visits after the finale (the front-page bookmark is the hook, GDD §3.3), and
new-player conversion through a store listing that can carry two covers —
"two stories, one book" (GDD §1).

**Do** — the short version; the section numbers are `umbra-GDD.md`'s:

- **The choice** (§3): a two-page spread before the intro, tap to try on,
  **press-and-hold to commit**, then a one-shot page-turn beat. Changeable for
  ever from a second bookmark on the map's front page, so it is never a
  four-year-old's irreversible mis-tap.
- **The mechanic** (§4): the same finger stroke lays dusk down instead of
  wiping it away. Only `restore/dust.ts`'s four pixel functions and three
  paired call sites in `wipe.ts` mirror; the coverage model, the thresholds,
  the graceful finish and the persistence are untouched.
- **The script** (§5): a second set of the four `story.ts` tables, written
  against the emote panels the cast already has.
- **The plumbing** (§6, §7): `am_path`, a second campaign blob, the shared
  keepsake mask, and the nine places a new scene must be registered.
- **The art** (§8): **not** fifty night sectors — one dusk grade in code over
  the paintings that exist, plus ~14–18 new sheets.
- **Phasing and what to cut** (§10): nine phases, each provable on its own,
  with an explicit cut list that does not break the feature.

**Two prerequisites that are correctness, not polish** (GDD §6.2, §6.3), both
of which bite silently and neither of which is optional:

- `SaveMergePolicy.computeMeta` scores exactly one campaign, so a device that
  advanced Umbra's book and not Aurora's scores as if it had done nothing —
  and can be handed the other device's blob, **deleting a playthrough**.
- The leaderboard write fires on a lifetime-**wins** record and carries
  whatever flair is passed at that moment, so winning duel one of the second
  book posts a tie-breaker of `1` over a hard-won 50, **demoting the player
  on their own board entry**.

**Owner rulings (2026-09-23), recorded in the GDD:**

1. **One leaderboard**, both paths — two thin boards rank worse than one
   thick one (GDD §6.3, with the flair fix above).
2. **Both books share keepsake ownership**, and each keeps its own equipped
   outfit (GDD §6.1): one shared `am_gifts` mask, `giftsEquipped` and
   `maneSwatch` per book. Shared wardrobe, separate outfits.

**Against the guardrails at the top of this file:**

- **All ages, cozy:** GDD §2 is a whole section of tone guardrails. The dark
  path is not a villain path — Umbra is putting the world to bed, not
  spoiling it, and both books end on the same Friendship Festival. No path is
  "the true ending" and no copy calls either child naughty.
- **No currency:** nothing here is a balance; the rewards are the same
  keepsakes, blooms and stickers.
- **Portal rules:** the choice is local, needs no name entry, no external
  request, no Page Visibility API.
- **Performance:** no new per-frame cost. The dusk grade is one more bake
  mode in `bakeColour`, and it inherits the art layer's scoped invalidation.

**How it lands on the items already built:**

- **Item 3 (sticker album) and item 16 (photo card):** keepsake ownership is
  shared, so a card taken on one path can wear anything found on the other.
  Whether the ALBUM (creature stickers) is shared or per book is an open
  question worth deciding when item 20 starts — the GDD assumes per book,
  because a sticker is a memory of meeting somebody in *that* story.
- **Item 19 (Friends Spa):** already carries its Umbra note — on that path
  the spa reads as a **bedtime routine** (tuck in, lantern, lullaby) rather
  than a wash. Build item 19 first; it inherits for nearly nothing.
- **Item 1 (funnel analytics):** add `path` to the session properties on the
  day item 20 starts, or every number after it is an average of two games.

**Measure:**

- **The split** (`path_chosen.path`): a path taken by under ~15 % of players
  is a sign the choice screen is not reading, not that nobody wants it.
- **Second-book start rate** among players who have seen `finaleSeen` — the
  actual retention claim, and the number that justifies the ≈15–19 d.
- **Lifetime playtime and D7 return**, against the baseline section, split by
  `path` and by "has played both".
- **Time-to-commit on the choice screen** and the rate of taps that lift a
  page without ever completing a hold: both say whether the press-and-hold
  gate is teaching itself.
