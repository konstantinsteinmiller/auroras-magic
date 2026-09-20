# Auroras Magic — Story Extension Specification

*Step 2 of `game-implementation-plan.md`. Derived from `story-GDD.md` (the
owner's statement of intent) by a 12-seat expert panel (UX, tech art,
architecture, pragmatist, cozy fantasy, combat, gesture recognition, child
audience, numbers, portal compliance, critic, narrative/localisation), with
moderated rulings and adversarial audits. Generated 2026-09-18.*

## §0 Preface

### §0.1 How to read this document

- **The chapters and who wrote them.** Each chapter had one owner. When two
  chapters seem to disagree, the chapter that owns the topic wins:

  | § | Topic | Owner |
  |---|---|---|
  | §1 | Scope and stages | Pragmatist |
  | §2 | Audience and safety | Child-audience specialist |
  | §3 | Flow, screens and input | UX designer |
  | §4 | Architecture and save | Architect |
  | §5 | Runes | Gesture-recognition specialist |
  | §6 | Duel rules | Combat designer |
  | §7 | Numbers and telemetry | Analyst |
  | §8 | Restoration loop | Cozy-games specialist |
  | §9 | Rendering and assets | Tech artist |
  | §10 | Story and localisation | Narrative/l10n lead |
  | §11 | Portals and ads | Portal compliance lead |
  | §12 | Acceptance gates | Critic |
  | §13 | Open decisions | Moderator |

- **Scope tags.** `[S0]`…`[S6]` say which build stage a feature lands in
  (§1.2). `[later]` means specified but not scheduled.
- **Cross-references** use `§N.M`. A reference to a heading that does not
  exist is a bug; §0.6 lists the check.
- **Numbers.** Every number is a *starting value*. Each has a named test or
  telemetry event that tunes it (§7.14).
- **Owner decisions.** §13 lists the decisions only the owner can make, and
  the default each chapter assumes until then. Nothing in §1–§12 waits on
  them.
- **Owner-made facts outrank this document.** The owner's same-day ads pass
  (§0.4, F25) is one of them.
- **Provenance tags.** Tags such as `C13`, `M1`, `F25`, `N-15` or `I-31`
  point to the panel's working papers:
  - rulings: C = conflict, F = factual correction, D = owner decision,
    M = fix-round ruling;
  - audit findings: N = numbers, I = implementability.

  The reasoning each tag points to is summarised where it appears. The tag
  exists only so a contested decision can be traced, not because the reader
  needs the papers.

### §0.2 The GDD's closing question, answered

> *"Which gesture recognition algorithm are you currently using to handle the
> precision required for this expanded library of rune shapes?"*

**The algorithm.** It is a **$1 Unistroke recogniser with the Protractor
extension**, carried over from the jam build:
- strokes are resampled to 32 points;
- the matcher finds the optimal rotation, using cosine distance;
- scaling is non-uniform, into a unit box;
- closed shapes get templates for every start point and both directions.

On top of that sits a **per-rune "structure envelope"**, which checks each
stroke's *effective corner count* and *total turning*. Shape matching alone
confuses a circle with a square. The envelope tells them apart, and it is what
rejects scribbles and straight lines.

**What the expanded library needs.** Not a different algorithm. The panel
measured every candidate shape through the real recogniser (§5.8). Every
collision it found is a geometric identity under the rotation and scale
forgiveness that makes the recogniser kind to sloppy hands. The same
identities would defeat $N, $P or a trained model that is equally forgiving:
- ▽ = △;
- ◇ = □;
- ∩ = C = U;
- a new "Z" = the existing ICE Z.

So the library is designed *around* the invariances:
- **Shapes are chosen to be mutually distinct.**
- **Two structural features are added** for loops and spirals: crossing count
  and signed winding.
- **A circle joins as a sibling entry in the rune table.** It cannot steal strokes from the four
  shipped runes, by construction.
- **Only runes the player has earned are recognised.**

The measured outcome, with 12 runes live at once and 300 sloppy draws per
shape:
- the four shipped runes are unchanged (100 / 100 / 100 / 99.7 %; the 0.3 % is
  pre-existing);
- the circle is recognised 97.3 % of the time and steals 0 % of the four
  shipped runes' strokes;
- the arch reaches 99.3 %;
- a sharp-cusp heart reaches 95.3 %.

§5.8 has the full confusion matrix.

### §0.3 The decisions that shape everything

1. **The rune alphabet: 4 frozen + 8 new = 12 runes, plus 2 Signature Spells**
   (§5.2, §6.1, §6.5).

   | Ch | Magic | Rune |
   |---|---|---|
   | 1 | Nature | leaf V |
   | 2 | Water | bubble ○ |
   | 3 | Lightning | spiral |
   | 4 | Crystal | *Signature Spell* |
   | 5 | Illusion | mirror ∞ |
   | 6 | Rainbow | arch ∩ |
   | 7 | Time | hourglass |
   | 8 | Frost | *Signature Spell* |
   | 9 | Moon & stars | star ☆ |
   | 10 | Love | heart ♡ |

   A Signature Spell is a named recipe of runes the player already owns. It
   exists wherever no safe shape could be found.
2. **The map is the reward space, and the game boots into play.**
   - A cold start opens the arena of the next unplayed node: bubbles, then the
     duel.
   - A win drops a gift into the arena, then the map opens. There the player:
     1. unboxes the gift;
     2. picks one landmark's colour from 3 paint pots;
     3. wipes the dust in a zoomed restore view;
     4. watches the sector come alive;
     5. on a win only, is offered the Twin Gift beside the restored sector —
        a 1.2 s hold that grants that sector's permanent cosmetic bloom (D3).
   - The map and wardrobe tent are the only "menus", and they are places.
     (There is no Rune Shrine — removed per D3.)

   See §3.1–§3.2 and §8.
3. **The owner's ad contract is kept, only re-anchored** (§11.3–§11.5).
   - Interstitials come after a win or a loss, time-paced: 240 s grace, then
     ≥ 121 s apart. No session cap (D8).
   - The rewarded offer becomes an in-world "Twin Gift". It opens on a 1.2 s
     hold, so it is not a toddler tap. It is offered win-only, on the map
     right after a sector's reveal, and pays a cosmetic bloom, not coins
     (D3; see §0.3, decision 4).
4. **No currency, anywhere, per the owner's ruling (D3)** (§6.17, §8.9).
   - There are no coins, no coin jar, no coin burst, no element ranks and no
     Rune Shrine. `RANK_BONUS` / `rankPrice` / `buyRank` are not used in the
     story build.
   - The rewarded "Twin Gift" instead grants a permanent cosmetic **bloom** of
     the just-restored sector (extra animated critters/flowers + a gentle
     sparkle), one per sector, 50 at most. It gives no power and no progress.
   - There is no wallet HUD and no shop panel — trivially so, since there is
     nothing to spend.
   - Difficulty is unchanged: the curve already meets every target with zero
     ranks, so removing ranks costs nothing there.
5. **Designed for children, listed as "all-ages cozy, family-friendly"**
   (§2, §11.9). Resolved as D1.
   - Every child-safety rule holds unconditionally.
   - A single `VITE_CHILD_DIRECTED` flag stays as an option (default `false`)
     in case the owner later decides to market the game as "for kids".
6. **Staged delivery with a playable build at every stage** (§1.2).
   - **S0** rune spike.
   - **S1** one wipe sector.
   - **S2** flow shell + chapter 1.
   - **S3** chapters 1–3, the first release candidate.
   - **S4** chapters 4–10.
   - **S5** 2-player versus.
   - **S6** painted art.

### §0.4 Where this spec departs from `story-GDD.md`, and why

| GDD says | Spec does | Evidence | § |
|---|---|---|---|
| Two rune tables (6 and 10 shapes) | The chapter table is canonical. §5's list is non-normative | The tables disagree on count, names and shapes | §5.2 |
| Water ▽, Crystal ◇, Lightning Z, Illusion Z, Crescent C, Cross +, Hourglass X | Reshaped or replaced per §0.3 | Measured collisions: ▽→FIRE 100 %, ◇→EARTH 99.7 %, Z = ICE, C = ∩, + → FIRE ~99 % | §5.8, §13.4 |
| Light = circle ○ | Circle kept, for **Water** (the chapter table's use) | Safe by construction; 97.3 % measured | §5.7 |
| "Bypass complex UI currencies entirely" | **Removed entirely (D3): no currency, no jar, no Rune Shrine, no ranks.** The rewarded offer pays a cosmetic bloom instead of coins | Owner ruling, 2026-09-18, superseding the coin part of the ads pass (F25) | §6.17, §13.3 |
| "No Claim Reward buttons … zero UI" | Holds for map, restoration and rewards. The duel keeps its combat HUD | The duel cannot be read without HP and slots | §3.5 |
| Wipe away dust, "coloring book" | Wipe + **one colour choice per sector** (3 paint pots) | Without a choice it is not a colouring book | §8.7 |
| "Map is completely seamless" | No visible seams; streamed chapter "pages" | iOS canvas and memory limits | §9.1 |
| Spellbook dot, "completionist loops" | The spellbook is ON, with a soft sparkle cue and no red dot | Child-safety rules | §2.2, §3.9 |
| 2–3 speech bubbles before each battle | Pictographic bubbles + a synthesized babble voice; text ≤ 8 words is a bonus | Pre-readers; no VO budget | §10.6, §10.11 |
| Chapter 10 unlocks local 2P versus | Specified; built at S5 | Needs a second input path | §6.19, §3.12 |
| Umbra fought from node 1 (jam ladder) | Umbra fought only at 10-5; her shadow clones are the foes before that | Needed for the redemption arc | §10.4, §13.7 |
| Every 5th node is a boss | 10 chapters × 5 nodes = 50; node 5 of each chapter is the Guardian | Derived | §6.12 |

### §0.5 Source-document and code corrections

These are the corrections the rulings rest on (the panel's `RULINGS.md` F1–F25):

- **Recogniser facts.**
  - ▽ ≡ △, ◇ ≡ □, ∩ ≡ C.
  - Z is ICE.
  - Circles are rejected by design, via the envelope.
  - A smooth heart reads as WIND.
  - + and X are two-stroke shapes.
- **Existing code bugs the extension would trip over.**
  - `comboKey` collides once rune ids reach 10.
  - `fx.ts`'s `(rune & 3) + 1` silhouette mask breaks past rune 3.
  - The foe-rate formula is linear in the ladder index.
  - `HP_MAX` is shared by the sky formula.
  - The player-side `S.slow` is never read.
  - `fx.heal()` has no callers.
  - `S.foe` does four jobs.
  - `.ink-text` cannot wrap.
  - `happytime()` fires on every win, against CrazyGames' guidance.
- **Platform facts, verified against primary sources.**
  - YouTube Playables forbids "made for kids" content.
  - CrazyGames' main site is 13+ / PEGI 12, and its kids site is unmonetised.
  - The iOS Vibration API does not exist.
- **Project facts.**
  - No Auroras Magic build has been released yet, so save migration only has
    to be robust.
  - The owner's ads pass (2026-09-18) is binding: interstitials after win and
    loss, a 240 s grace then 121 s, time-only. The rewarded offer's *payload*
    is superseded by the owner's later D3 ruling (same day): it pays a bloom,
    not coins, and is offered win-only, after the sector reveal — not after
    every duel.

### §0.6 Changes against the current code (summary)

Details live in the named chapters. "New" means the file does not exist yet.

| Area | Files | Change | § |
|---|---|---|---|
| Recogniser | `src/game/duel/runes.ts`, new `src/game/duel/shapes.ts` | Data-driven templates and envelopes per `RuneDef`; crossing/winding features; circle as a sibling entry. `recognise(raw, activeMask = FROZEN_MASK)` stays pure: the caller passes the unlocked-rune mask. The four shipped runes stay **bit-identical**, frozen by a corpus test. `shapes.ts` feeds both the templates and the glyphs | §5.4–§5.10, §5.14 |
| Rules data | `src/game/duel/config.ts` | 12-rune table; delimited `comboKey`; the spell generator with the 22 shipped spells as golden overrides; counter graph. No currency/rank data (D3) | §6.1–§6.6 |
| Sim | `src/game/duel/sim.ts`, `state.ts` | `resetDuel(node)`; per-side `hpMax`; sky on HP fractions; rate chain (aiTier ≤ 2, onboarding, Dream Dust); the ten magics; heal path; `S.campaign` nested state | §6.7–§6.16, §4.4 |
| FX / glyphs / rig | `fx.ts`, `glyph.ts`, `chars.ts`, `arena.ts` | Rune→kind table; 8 new silhouettes and glyphs; rig anchors + draw-order slots; `skin` split from side; chapter-keyed arena bake | §9.6–§9.9 |
| Scenes | new `src/views/AppScene.vue` (owns the ONE canvas, the RAF, input and `load()`); per-scene DOM-overlay components; `GameScene.vue` becomes a duel controller; new `src/game/{flow,campaign,map,restore,cosmetics}/` | In-app FSM with scenes `boot · map · dialogue · duel · unbox · wipe · wardrobe · versusSetup`. Flow state nested as `S.flow`. `wipe` = the map renderer in restore mode. The router is untouched | §4.1–§4.2, §3 |
| Portal layer | `useGameplayLifecycle.ts`, new `src/use/useDuelRewards.ts`, new `src/use/useChildDirected.ts`, `useAdGate.ts`, `vite.config.ts` | Bracket driven from FSM enter/exit hooks: duel + wipe live, flourish/sting not. Reward logic in one composable; the interstitial stays in the duel controller. `VITE_CHILD_DIRECTED` ORed into reward suppression plus an analytics module alias swap. happytime deduped onto rare moments | §11, §4.8–§4.9 |
| Save | `src/keys.ts`, `state.ts`, `src/utils/save/SaveMergePolicy.ts` | `am_schema = 2`; campaign fields bit-packed, including a 50-bit `blooms` bitset (no coin/rank fields, D3); Step-1 migration (incl. the `comboKey` re-key via `comboEnumerationIndex`; reads `am_coins`/`am_upgrades` once, then drops them); cloud-conflict scoring on campaign progress | §4.6–§4.7 |
| i18n | `src/i18n/locales/*.ts` (21) | Story, rune, spell-grammar, place and UI keys, per stage; new `.story-text` style | §10.18–§10.20 |
| Art contract | `src/game/art.ts` | `ART_FOLDERS` rewritten in this game's nouns; Step-3 slot list | §9.11–§9.12 |
| Tooling | new `tools/rune-spike/`, `scripts/duel-sim.mjs`, test fixtures | Measurement and regression harnesses | §5.10–§5.11, §7.1 |


---

## §1 Scope & staged delivery

Owner: Pragmatist. This chapter is the build order: seven stages (S0–S6),
each with a goal, an exit demo, an agent-day estimate and dependencies; a
per-chapter checklist for landing chapters 4–10; a ranked risk register;
explicit non-goals; the reuse inventory that keeps the agent-day estimates
honest; and the D2 release options. It does not re-litigate any C-ruling —
every number below is downstream of §2 (RULINGS.md C1–C31), cited by number.

### §1.1 Total scope, after Round 2

C1 fixed the alphabet at **4 frozen + 8 new runes + 2 Signature Spells = 12
elements** across 10 chapters. C5 fixed the campaign at **50 nodes** (10 × (4
standard + 1 boss)). C28 fixed the state model (one nested `S.campaign`
object, `am_schema = 2`). None of that shrinks the build; it prices it. Full
scope (S0–S4, the complete 10-chapter game, no 2P, no painted art) is
**~59–76 agent-days**, the sum of §1.2's own S0–S4 rows below (D3 dropped
S2 by 1 agent-day — see §1.2's S2 row). Adding local 2P (S5) is **+8–10**.
Adding Step-3 painted art for the whole new surface (S6) is a **starting
estimate of +20–30**, owned by §9 to refine — see §1.2's S6 row. Everything,
S0–S6 inclusive: **~87–116 agent-days**.

*Fix-round correction:* the previous draft's headline figure here (~85–115)
was actually the S0–S6 sum, mislabelled as "S0–S4, no 2P, no art" — it
silently included S5 and S6. That is fixed above; each figure is now
attached to the stage range it actually describes, and every stage total
below is re-summed after M19's and M8's re-estimates.

*Second fix-round correction (D3, final, 2026-09-18):* the owner removed
the coin currency, the coin jar and the Rune Shrine entirely from the story
build (no wallet HUD, no rank shop, no `DuelResult` shop panel, no
coin-burst VFX). S2's estimate drops by 1 agent-day accordingly (§1.2), and
every total above is re-summed to match.

This now lands close to, not larger than, this role's Round-1 estimate
(90–130 total for the whole build): ~87–116 against ~90–130. The
*composition* changed more than the total — Round 1 costed the shop-panel
→ jar/shrine swap (removed per D3), the Twin Gift UI, the dialogue system,
spellbook-on and the wardrobe tent generically; Round 2 priced them by name
(C8, C12, C16, C17 — C4's jar/shrine line item is now removed rather than
priced, see §1.2's S2 row), and correspondingly re-prices four sim
mechanics that touch core resolution logic — unblockable pierce, reflect,
wildcard-substitution, and now (M19) the bubble ward's 2-hit guard — that
Round 1 bucketed as generic "moderate new."

### §1.2 Stage table

Each stage ships a playable build. "Exit demo" is the check this chapter
assumes; §12 owns the authoritative acceptance gate and may add to it, but
must not contradict the numeric thresholds already ratified in C1.3, C9,
C10, C13 and C25 — those are repeated here only to keep this table
self-checking.

---

**S0 — Rune spike + frozen-corpus gate** `[S0]`

- **Goal:** turn GEST's Round-1 measurements (`gest-experiment.mjs`,
  scratchpad-only) into a committed, repeatable gate that (a) proves the
  four shipped runes are unchanged and (b) clears or falls back every one of
  C1's 8 new-shape assignments, in one pass, before any chapter is built.
- **Ships** (file names and build order per §5.10/§5.11 — the previous
  draft here invented a `tests/fixtures/` path and folded the assertion into
  the existing sanity file; both are corrected below, M18):
  - The `RuneDef[]` data-driven refactor of `src/game/duel/runes.ts` (ids
    0–3 only at this step, reproducing today's hard-coded banks/envelopes
    exactly, per §5.11.1's build order) plus the new shared shape module
    `src/game/duel/shapes.ts` (M13/M15), which feeds both `runes.ts`'s
    templates and `glyph.ts`'s drawings. `recognise()` takes the new
    `recognise(raw, activeMask = FROZEN_MASK /*0b1111*/)` signature (M13);
    the default argument leaves every existing call site and test
    unaffected.
  - The frozen-corpus regression pair (new files): `tests/duel/rune-corpus.gen.ts`
    (deterministic generator, seed `7`) and `tests/duel/rune-corpus.test.ts`
    (the byte-for-byte assertion against a checked-in fixture, new file
    `tests/duel/rune-corpus.fixture.json`) — 525 fixed strokes (500 across
    the 4 frozen runes + 25 junk). `tests/duel/runes.test.ts` itself is
    untouched: it stays as the separate, smaller hand-picked sanity net
    (§5.10), not the file the new assertion lives in.
  - The measurement harness, **committed** at `tools/rune-spike/` (not
    scratchpad-only, M18) — generating clean + sloppy strokes per candidate
    shape and printing a confusion matrix, per §5.11's protocol, so the gate
    is repeatable rather than a one-off script.
  - Go/no-go per C1 row: Leaf, Bubble/Circle, Spiral, Mirror(∞), Arch,
    Hourglass, Star, Heart.
- **Exit demo:** `pnpm test tests/duel/rune-corpus.test.ts` green (100%
  identical classification on the 525-stroke frozen corpus, byte-for-byte
  per §5.10) AND `tests/duel/runes.test.ts` still green (the `RuneDef[]`
  refactor step must not move it either) AND a printed report from
  `tools/rune-spike/` showing every candidate shape at or above its
  threshold, OR its fallback resolved:
  - Circle ≥ 95% recognised / ≤ 5% junk false-accept (C1.3), else Water →
    Spiral and Lightning (ch3) → a third Signature Spell chapter.
  - Hourglass below §5's threshold → ch7 becomes a Signature Spell (C1 row 7's
    own fallback).
  - Star / Heart below threshold → iterate the geometry and re-run, not drop
    (C1 rows 9–10, explicit). Budget below assumes at most one extra
    iteration each.
- **Agent-days: 4–5** (bumped from the previous draft's 3–4: the `RuneDef[]`
  refactor and the shared `shapes.ts` extraction, M13/M15, are real,
  tested-by-the-frozen-corpus engineering, not just harness work).
- **Depends on:** nothing — first stage.
- **Implements:** §5 (alphabet, envelopes, frozen-corpus protocol), feeds
  C1's table and D4.

---

**S1 — One wipe sector, end to end** `[S1]`

- **Goal:** prove the restoration mechanic — the pitch's twist — technically
  and tactilely, on one hand-built sector, wired directly off the *existing*
  duel's win event. No map, no nodes yet.
- **Ships:** the coarse coverage grid + pre-baked brush stamp + multiply/overlay
  dust (§9's tech, C9), one Stardust Brush, the 85%-auto-complete + 1.5 s idle
  grace (C25), one colour-me landmark with 3 paint pots (C11), the
  base64 in-progress-coverage save (C9), the done-bitset (C9).
- **Exit demo:** win the existing duel → gift drops → unbox → locked-camera
  restore view opens (C6.5) → wipe to 85% → auto-complete → pick a colour →
  reveal animates (a permanence beat, e.g. a windmill starts turning) →
  reload the page → the sector's `done` bit and the colour pick survive.
- **Perf gate:** mask + dust composite ≤ 3 ms/frame for a standard sector and ≤ 4 ms/frame for a boss sector (§9.3.3).
- **Agent-days: 6–8.**
- **Depends on:** nothing technical; sequenced second so both unknowns
  (recognition, restoration feel) are proven before the campaign shell is
  built around either.
- **Implements:** §8 (restoration loop, tools, colour-me), §9 (dust tech,
  perf budget).

---

**S2 — Flow shell + chapter 1** `[S2]`

- **Goal:** the campaign FSM and every piece of chrome the GDD's loop needs
  that isn't chapter-specific, proven against one full chapter (5 nodes, 1
  boss, the Leaf rune).
- **Ships:**
  - **`AppScene.vue`** (new file, M10/M11) owns the single canvas,
    `getContext`, the one RAF, and the pointer/keyboard listeners, and runs
    `load()` before the boot transition. It hosts the FSM's scene ids —
    `boot`, `map`, `dialogue`, `duel`, `unbox`, `wipe`, `wardrobe`,
    `versusSetup` (the last reserved, unreachable until S5) — per §4's
    enum. Each per-scene `.vue` file holds DOM overlays only (HUD, bubbles,
    buttons), never its own canvas or RAF. `wipe` renders through the same
    map canvas in restore mode (zoomed, camera-locked), not a separate
    canvas. The current scene lives at **`S.flow.scene`** — nested, but
    **not persisted** (M11): `S.flow` never reaches `save()`.
  - `GameScene.vue`'s duel logic is carved out into a duel controller with
    no canvas and no RAF of its own (M11; §4 lists the exact code blocks
    that move). The gameplay bracket is driven from the FSM's enter/exit
    hooks, not a raw `watch` on a derived boolean.
  - **`src/use/useDuelRewards.ts`** (new file, M21): the reward logic lifted
    out of `GameScene.vue`. Only the map's Twin Gift calls it — win-only,
    offered right after a sector's reveal, beside the restored sector (D3).
    There is no loss-side reward path at all: the loss-beat consolation
    offer this bullet previously described is removed per D3 (a loss has
    nothing to bloom, and this game does not sell an easier retry). The
    interstitial stays in the duel controller (§4.9.3) and is unchanged by
    D3 — it still fires after wins and losses exactly as before.
  - **The Boss Chest + Sunbeam** (M8): chapter 1's node 5 is a boss, and a
    boss ships at S2 — so the Sunbeam's aim-and-release fan and the boss
    sector's 4×-area mask (M5) land here, not deferred to S4 with the rest
    of C10's tool roster. §7.5 tunes the fan so the 4× sector clears in no
    more than three shots (~10 s).
  - Save schema v2: `S.campaign` nested object, `am_schema = 2`, the single
    migration function (C28) — new keys in `src/keys.ts` (`CAMPAIGN_KEY =
    'am_campaign'`, `SCHEMA_KEY = 'am_schema'`; M23 confirms both are
    declared in `src/keys.ts`, §4.6).
  - The node/tier split (C5, F21): `nodeId` (0–49) separate from `aiTier`.
  - The dialogue bubble system + babble voice (C12): new key namespace
    `story.c{n}.n{m}.b{k}` across all 21 locale files.
  - **No jar, no Rune Shrine, no rank shop, no `DuelResult` shop panel** —
    all removed per D3. (The previous draft here built a jar + Rune Shrine
    (C4) replacing `DuelResult`'s shop panel, with `RANK_SHOP_PANEL = false`;
    that whole item is gone, not merely flagged off, which reduces this
    stage's estimate below.)
  - The **Twin Gift** rewarded presentation + 1.2 s press-and-hold gate
    (C8), presented through `useDuelRewards.ts` above, which itself calls
    the existing `src/use/useAdGate.ts` / `claimReward` — no new pacing
    logic, only new presentation. Per D3 it now grants a permanent
    cosmetic **bloom** of the just-restored sector (extra animated
    critters/flowers plus a gentle sparkle, through the existing capped
    prop system) instead of coins — one bloom per sector, ever (50 at
    most), no power, no progress.
  - The wardrobe tent shell (C17) with its first slot live (head — the
    Flower Crown, chapter 1's own gift).
  - The spellbook turned on (`SPELLBOOK` flag in `src/game/duel/config.ts`
    → `true` for the story build) per C16.
  - Interstitial re-anchor per C8/F25 (also inside `useDuelRewards.ts`):
    unchanged owner timing (win-or-loss, 240 s / 121 s, one clock), only the
    *placement* moves to sit between the victory/doze-off beat and the map
    page-turn.
  - Happytime/GamePix-happy-moment move off every win onto boss clears (C8) —
    ch1's boss is the first place this is provable.
- **Exit demo:** a fresh save boots to node 1-1's dialogue → duel → win →
  gift (+ interstitial if due) → map → unbox → wipe → reveal → map with 1-2
  pulsing → … through the 1-5 boss → its ornate Boss Chest opens → a
  Sunbeam fan clears the 4×-area boss sector in three shots (~10 s) → chapter 1 shows
  fully restored on the map. A loss at any node: doze-off → interstitial if
  due → retry or map, Dream Dust visibly easing the retry (C13). A
  completed node replays without a gift (C24). A Step-1 dev save loads
  without crashing (C28/F24).
- **Agent-days: 14–18** (bumped from the previous draft's 12–16: +2 for the
  Boss Chest/Sunbeam work M8 moves into this stage, +1–2 for formalising
  `AppScene.vue` / the duel-controller carve-out / `useDuelRewards.ts` as
  named, tested units rather than "a shared composable"; then **−1** per D3
  — the jar + Rune Shrine build (wallet HUD, jar model, shrine UI,
  rank-buy flow, coin-burst VFX) is removed, not built, and the Twin
  Gift's new bloom payout is presentation-only work already priced above).
- **Depends on:** S0 (Leaf must clear its gate) and S1 (wipe tech proven);
  §4's FSM design and §3's flow spec.
- **Implements:** §3, §4, §6 (ch1 Leaf: `burn`/`regen` reuse), §8 (Twin
  Gift bloom-cosmetic presentation, tied to the sector reveal — jar/shrine
  presentation removed per D3), §10 (ch1 dialogue), §11 (ad re-anchor,
  happytime move), §2 (child-safety rules baked in from the first screen,
  not retrofitted).

---

**S3 — Chapters 1–3 = first release candidate** `[S3]`

- **Goal:** chapters 2 and 3 alongside chapter 1, reaching 15 nodes / 3
  bosses, and hardening the S2 shell into something a portal build matrix can
  actually ship.
- **Ships:** ch2 (Water, Bubble = Circle, contingent on S0's circle gate;
  the bubble trap is a **new guard flavour, `guardK 3`, with a 2-hit
  capacity** (§6.7.2, M19) — a hit-counter alongside the barrier's existing
  `tt` countdown, plus a "crack" visual on the first of its two hits (§9) —
  genuinely new state in `strike()`/`barrier()`, NOT the WIND-barrier
  retexture the previous draft assumed), ch3 (Lightning, Spiral, genuinely
  new "unblockable" exception in `stops()`); the Magic Eraser tool from the
  ch3 boss onward (C10); a 3rd biome bake template (C20); wardrobe's 2nd
  slot; the spellbook showing only 3-alphabet-reachable combos (C15); the
  full `qa:portal` matrix green across every configured platform, per the
  Step-1 precedent recorded in `game-implementation-plan.md`; i18n parity
  for the S2+S3 key volume across all 21 locale files; `released: false`
  flags in `S.campaign` gating chapters 4–10's (not-yet-existing) data.
- **Exit demo:** `pnpm qa:portal` green on every configured platform; a
  full 1-1 → 3-5 playthrough (~15.5 min for 3 chapters, out of a ≈55.1 min
  full campaign, per the Numbers section's 5.15 min/chapter, §7/N-13); `pnpm build:all` produces archives inside the existing size
  budget; a fresh save and a migrated Step-1 dev save both boot clean.
- **Agent-days: 9–13** (bumped from the previous draft's 8–11 by the ch2
  guard-flavour re-estimate, M19/I-21).
- **Depends on:** S2 (shell + ch1 pattern proven), S0 (ch2/ch3 shapes
  cleared).
- **Implements:** §6 (ch2/ch3 mechanics + AI contracts), §7 (curve measured
  through tier 0, C13), §9 (3rd biome template), §11 (full portal QA,
  first-load-ad interaction per C30), §12 (this is the release-candidate
  gate).

---

**S4 — Chapters 4–10, in pairs** `[S4]`

- **Goal:** land the remaining 7 chapters (35 nodes), the last 6 new runes
  (Mirror, Arch, Hourglass, Star, Heart, plus whichever of Water/Lightning
  fell back at S0) and both Signature Spells (ch4 Crystal-reflect, ch8
  Frost-discard), the remaining wardrobe slots (C17), the full spell-matrix
  generator surface (C15), and the chapter-10 narrative finale (NOT the 2P
  unlock itself — that is S5; ch10 ships with "Umbra joins the map" per
  C18).
- **Sub-stages, each independently playable behind its own `released` flip:**

  | Sub-stage | Chapters | New mechanic(s) | Agent-days |
  |---|---|---|---|
  | S4a | 4–5 | Reflect barrier (Signature Spell, genuinely new — new barrier flavour in `strike()`/`stepShots()`); decoy (Mirror, reuses the ICE-pillar "one hit then tears down" path in `strike()`/`barrier()`) | 6–6.5 |
  | S4b | 6–7 | Wildcard substitution (Arch, new step in `spellFor()`/`comboKey()` in `src/game/duel/config.ts`); Time-slow (Hourglass or its Signature-Spell fallback, reuses `S.eSlow`/the `think()` rate term) | 6–6.5 |
  | S4c | 8–9 | Frost discard (Signature Spell, clears `S.equeue`/`S.queue`); lifesteal (Star, first real caller of the already-shipped, already-unused `heal()` in `src/game/duel/fx.ts`, F20) | 5–5.5 |
  | S4d | 10 (finale only) | Love finisher (composes ch9's lifesteal + the existing `kind===3` heavy path); the Umbra 10-5 fight (C26); the befriending sequence; the "wandering friend" map state | 5.5 |

  Plus shared overhead spread across the four sub-stages — spell-matrix
  golden-test updates per new element (C15), `am_schema` slug appends per
  rune/node/gift/cosmetic (C28), telemetry wiring, remaining wardrobe slots
  (C17) — **~4 agent-days total**.
- **Exit demo per sub-stage:** the same S3-style playthrough gate, extended
  to that sub-stage's chapters, with `released: true` flipped only for
  shipped chapters; `qa:portal` re-run each time (cheap: it is the same
  matrix, more content).
- **Agent-days: 26–32** (table above + overhead).
- **Depends on:** S3 shipped (pipeline proven); S0 already cleared every
  shape this stage needs (S0 is a one-time, whole-alphabet spike, not
  repeated per stage).
- **Implements:** §6 (all remaining magics, precedence, AI contracts), §7
  (tiers 1–2 of the rate curve, C13; the ch-10 boss HP exception of +16 from §6.21's
  tuning), §8 (remaining tools/gifts),
  §9 (remaining biome templates, cosmetics), §10 (remaining dialogue + the
  arc's closing beats), §12.

---

**S5 — Local 2P versus** `[S5]`

- **Goal:** land C18's design — simultaneous split-screen, per-pointer
  routing, player 2 driving the existing `e*` duelist fields with `think()`/
  `chooseRune()` bypassed.
- **Ships:** the second stroke buffer (ARCH-owned data shape, per C18); the
  landscape ≥ 900 CSS px split-screen layout and the portrait "turn sideways"
  prompt (§3); the unlock hook onto ch10 (real 2P replaces the "wandering
  friend" placeholder once this ships).
- **Exit demo:** two simultaneous pointers on one canvas each cast
  independently without corrupting the other's stroke buffer; a full 2P duel
  completes; `S.p2`-equivalent state never leaks into a 1P save.
- **Agent-days: 8–10.**
- **Depends on:** S2's FSM (for the mode switch) technically, though the
  *engineering* can start in parallel with S4 once S2 ships; the ch10 *data*
  dependency is only for the unlock hook, not the mechanism.
- **Implements:** §3 (layout), §6 (2P rules, C18).

---

**S6 — Step-3 painted art** `[S6]`

- **Goal:** run the existing `art-generation-pipeline` (per
  `game-implementation-plan.md` § "Step 3") against the story's new asset
  surface: 12 rune glyphs + trace-assist art, biome templates × prop sets
  (C20/C29), the wardrobe's cosmetics (C17), gift/tool art, dialogue
  portraits and emotes for Aurora, Umbra and the 9 Guardians, and one
  greyscale tint-mask per colour-me landmark (C11, one per sector).
- **Agent-days: 20–30, starting estimate — §9 owns refining it.** The tuning
  test: after chapter 1's wave paints, run `pnpm art:status` and recompute
  the per-sheet turnaround against the real pipeline, not this guess. This
  project has never run this pipeline before (Step 3 was still pending for
  even the base duel cast as of this panel), so there is no prior in-repo
  throughput data point to estimate from more precisely than this.
- **Depends on:** S4 complete for full-game art; can start its *tooling and
  slicing* as early as S3, once a stable art-slot pattern exists for
  chapter 1–3's cast (`src/game/artSheet.ts` per the existing Step-1 plan
  note). **The master prompts themselves wait for D1** (M28): `art-style.md`'s
  master-prompt line still reads "aimed at young girls", and D1 (kids vs.
  all-ages positioning, §2/§13) decides whether that line ships as written
  or is rewritten before a single prompt goes to an image model. Writing
  prompts against the wrong positioning is redone work, not saved work — so
  D1 gates prompt-writing even though it does not gate the tooling above it.
- **Implements:** §9.

---

### §1.3 Dependency chart (text form)

```
S0 ─┬─────────────────────────────────────────────────────────┐
    │                                                           │
S1 ─┴─► S2 ─► S3 ─► S4 (a→b→c→d) ─┬─► S5 (engineering may start at S2)
                                    └─► S6 (tooling may start at S3)
```

S0 and S1 have no dependency on each other and can run concurrently if two
build threads exist; everything else is sequential because each stage's exit
demo is the next stage's starting assumption.

### §1.4 Per-chapter content checklist (use for every chapter, 4–10 shown as the open ones)

For chapter *N*, before flipping its `released` flag:

1. **Shape/mechanic cleared by S0** (rune) or **assigned as a Signature
   Spell** (§5/C1) — no chapter starts before its element has a locked
   outcome.
2. **Spell-matrix keys generated and golden-tested** for every new key this
   element introduces (§4/C15) — the generator, not hand authorship, per C15.
3. **AI contract written** — one line: how the foe uses the magic, how the
   foe is countered (C14, mandatory, no chapter ships without it).
4. **Foe definition**: standard nodes 1–4 are Umbra's shadow clones (chapter
   palette/theme only, C5); node 5 is that chapter's Guardian, reusing a
   shipped rival's rig and name where §10.3's cast says so (per character,
   independent of the combat element: Zephyr ch 3, Terra ch 4, Prism ch 6,
   Ember ch 7, Glace ch 8), or a new Guardian entry otherwise; boss HP and
   the 50%-HP phase shift set per C13.
5. **`aiTier` assigned** per C13's chapter bands (1–3 → 0, 4–6 → 1, 7–10 → 2)
   — never a per-chapter bespoke tier.
6. **5 node definitions**: `nodeId`s, biome template + prop seed (C20/C29),
   dialogue volume per C12 (1–2 bubbles standard, 3 opener/boss, +2
   thank-you after the boss), dialogue keys `story.c{n}.n{m}.b{k}` written in
   all 21 locales.
7. **Gift + tool assignment** fixed by node type, never random (C10):
   Stardust Brush through ch1–2, Magic Eraser ch3 boss onward, Sunbeam on
   boss chests only (first at ch1's node 5, `[S2]` per M8; every later boss
   chest reuses the same tool — no new per-chapter mechanic).
8. **One colour-me landmark** + its 3 paint-pot choices + tint-mask slot
   (C11, §9 counts the art).
9. **Reward**: this chapter's cosmetic, slotted per C17. (This item
   previously also assigned "its rank at the Rune Shrine, cap 5, C4" —
   removed per D3: no rank, no shrine. The chapter's own reward is the
   wardrobe cosmetic only; the separate per-sector bloom reward lives with
   the Twin Gift, §1.2 S2, not this checklist item.)
10. **Save**: append-only slugs for the new rune/node/gift/cosmetic (C28) —
    never reuse or renumber an existing slug.
11. **Balance sign-off** on the §7 "core" simulated profile, the amended
    two-part targets (M1/C13):
    - First attempt — standard ≥ 90% (ch 1–6) / ≥ 85% (ch 7–10); boss
      ≥ 75% (ch 1–6) / ≥ 60% (ch 7–10).
    - Cleared within 3 attempts — ≥ 95%, every chapter.

    §7.2 owns the canonical measured table; no chapter re-runs its own
    numbers (§6.21 cites §7.2). After §6.21's tuning (a harness element-proxy
    fix for ch 8–9, and a ch-10 boss HP bonus of +16) all 20 rows meet these
    targets in simulation. Re-verify them at S4 with the full 12-rune kit.
    Never close a gap by raising player damage (C13, explicit).
12. **Telemetry**: `recognition_attempt` fires for the new rune if any
    (Numbers section); `duel_end` and (for the boss node) `wipe_complete`
    per §7.13's canonical event shapes.
13. **Tests**: a `tests/duel/rules.test.ts` entry for the new mechanic; a
    frozen-corpus entry in `tests/duel/rune-corpus.fixture.json` (§5.10) if
    a new rune; a golden-matrix entry if new spell keys.
14. **`released: false`** until the sub-stage (S4a/b/c/d) that owns this
    chapter actually ships (C3).

### §1.5 Ranked risk register

1. **Circle's safety margin is conditional, not settled** (C1.3 depends on
   S0's live measurement). If it fails, two chapters re-route (Water →
   Spiral, Lightning → a 3rd Signature Spell) with a same-day ripple into
   §5's alphabet table and §10's naming. *Mitigation:* S0 runs first, alone,
   before any other stage starts content.
2. **Hourglass is measured fragile (92.7% safe, F-cited in C1 row 7).** A
   marginal shape that clears S0 by a small margin is the one most likely to
   need a second pass after real (not simulated) kid strokes come in during
   S3/S4 playtesting (§12). *Mitigation:* its Signature-Spell fallback is
   pre-designed (C1), not improvised if it later regresses.
3. **Star and Heart have no measured geometry yet** (F8: a naive one-stroke
   heart today scores 74% WIND). S0's budget assumes at most one iteration
   each; a second iteration is a schedule risk to S4c/S4d specifically, not
   to S0's own exit (C1 says iterate, not drop, so there is no "fail" state,
   only a slip).
4. **Under the amended two-part targets (M1 — first attempt: standard ≥90%
   ch1–6 / ≥85% ch7–10, boss ≥75% ch1–6 / ≥60% ch7–10; ≥95% within 3
   attempts), all 20 rows meet target in simulation after §6.21's tuning**
   (§7.2 owns the canonical measured table). The residual risk: the sim
   does not yet model the 12-rune kit, the chapter magics or boss phases
   (§7.1). Re-verifying with them is §6/§7 design work, real,
   uncosted time sitting inside S4c's and S4d's
   estimates above — if it takes longer than one design pass per chapter,
   those two sub-stages are the first things to slip.
5. **Ad cadence (~28/hour ceiling, D8, still open)** is a product-perception
   risk more than a technical one: it is the owner's F25 decision and this
   spec does not relitigate it, but it is worth flagging that S3's
   release-candidate gate (§1.2) will be the first time this cadence is
   observed against a real playthrough, not a simulation.
6. **2P's per-pointer routing (S5) is unverified beyond the ruling's
   description.** Two simultaneous strokes on one canvas is a real
   engineering risk (today's `S.pts`/`S.draw` are singular); C18's mitigation
   (route player 2 onto the existing `e*` fields) avoids inventing a second
   sim, but the *input* layer — which pointer owns which side, mid-stroke —
   still needs its own test pass before S5's exit demo.
7. **Dialogue volume at full scope is a translation-throughput risk**, not a
   design risk: ~50 nodes × 1–3 bubbles × 21 locales is a large but
   *linear*, previously-proven-shape task (Step 1 already propagated a new
   key set to all 21 locales once). The risk is capacity, not feasibility.
8. **Save-schema migration correctness (C28) regresses Step 1's cloud-hydrate
   tests if the nested `S.campaign` object is added carelessly.** Re-run the
   existing hydration test suite (referenced in `game-implementation-plan.md`
   Step 1 row 5) against the v2 schema before S2 exits, not after.
9. **D1 (kids vs. all-ages positioning) is a dependency for two separate
   surfaces, not one.** Landing late forces rework of `VITE_CHILD_DIRECTED`
   gating after S3 has already shipped it one way, AND (M28) blocks S6's
   master-prompt writing outright — `art-style.md`'s prompt still reads
   "aimed at young girls", so no prompt should reach an image model before
   D1 resolves. Sequencing risk, not a technical one — flagged for the
   moderator (§13).
10. **S6's art estimate (20–30 days) has no in-repo throughput data point**
    (the pipeline has never run on this project, per
    `game-implementation-plan.md`'s own Step-3 note). Treat it as a
    placeholder until the first wave's `pnpm art:status` run recalibrates it.

### §1.6 Explicit non-goals and deferrals

- **Orientation-bounded matching is not funded** (C1.5). One arc shape only;
  no second arc-family rune ships in v1 or any later stage without a new
  ruling.
- **Multistroke input is ruled out entirely** (C1.4). Every rune stays a
  single committed stroke, forever, not just through S4.
- **Non-duel node types are not built** (C5). Every one of the 50 nodes is a
  duel. Revisit with telemetry after S3, not before.
- **Three age-banded copy decks are not built** (C23). One early-reader deck
  plus pictograms; no age picker exists anywhere in the FSM.
- **A pity mechanic beyond the 85% auto-complete + 1.5 s grace is not built**
  (C25). No second safety net.
- **Co-op is not built** (D5 default: versus only, at S5). If the owner later
  wants co-op, it is a new stage, not an S5 sub-feature.
- **Recorded voice-over is not built** (D6 default: babble only). No VO
  pipeline, no VO budget line anywhere in this chapter's estimates.
- **Superseded — D3 is now final (2026-09-18) and reverses this item.**
  This bullet previously read: "Removing the coin currency is not built now
  (D3 default: keep, diegetic per C4). S4/S6 estimates assume the
  jar/shrine presentation, not a currency-free redesign; that redesign, if
  the owner chooses it later, is unbudgeted here." (removed per D3) The
  owner has now ruled the opposite: the coin currency, the coin jar and the
  Rune Shrine are removed entirely from the story build, at no additional
  budget — see §1.2 S2's reduced estimate and §1.4 item 9.
- **A session cap on ad cadence is not built now** (D8 default: owner's
  cadence unchanged). No new constant, no new UI.
- **Bespoke AI behaviour per Guardian is not built.** All 9 Guardians plus
  Umbra reuse `think()`/`chooseRune()`'s tiered template (C5, C18); only data
  rows differ. Do not let any later stage "improve" a Guardian into a
  one-off behaviour tree — that reopens a cost this whole plan deliberately
  avoids.

### §1.7 Reuse inventory (what each new magic actually costs, in real files)

| Chapter magic | Reuses | File / function | New code needed |
|---|---|---|---|
| Ch2 Bubble (trap) | the barrier's existing `tt`/`guardK` pattern (structure only) | `src/game/duel/sim.ts` `strike()`/`barrier()` (new `guardK 3`) | new hit-counter alongside `tt`, a "crack" visual on hit 1 of 2 (§9) — genuinely new, not a retexture (M19/I-21, §6.7.2) |
| Ch5 Mirror (decoy) | ICE-pillar "one hit, tears down" | `src/game/duel/sim.ts` `strike()`/`barrier()`; `src/game/duel/fx.ts` | new guard-kind id + decoy silhouette (§9) |
| Ch7 Hourglass (time-slow) | `S.eSlow`/`S.slow` fields, already wired into the rate term | `src/game/duel/state.ts`; `src/game/duel/sim.ts` `think()` | tuning constant only |
| Ch1 Leaf (poison DoT) | `S.burn`/`S.eBurn`, already wired into `tick()` | `src/game/duel/sim.ts` `tick()` | DoT: none. HoT: one new mirrored `regen`/`eRegen` field |
| Ch8 Frost (discard, Signature Spell) | none — new, but tiny | `src/game/duel/sim.ts` `strike()` | clear `S.equeue`/`S.queue` on hit, a few lines |
| Ch9 Star (lifesteal) | `fx.heal()`, shipped since Step 1, zero callers until now (F20) | `src/game/duel/fx.ts` `heal()`; `src/game/duel/sim.ts` `strike()` | add damage-fraction-to-caster-hp logic; first real call site |
| Ch6 Arch (wildcard) | none — new, but isolated | `src/game/duel/config.ts` `spellFor()`/`comboKey()` | substitution step before lookup (C14) |
| Ch3 Spiral (unblockable) | none — new, touches core resolution | `src/game/duel/sim.ts` `stops()` | new exception path |
| Ch4 Crystal (reflect, Signature Spell) | none — new, touches core resolution | `src/game/duel/sim.ts` `strike()`/`stepShots()` | new barrier flavour that redirects rather than destroys, one-shot (C14) |
| Ch10 Heart (finisher) | Ch9's lifesteal + existing heavy kind | `src/game/duel/config.ts` `kind===3` path | composition only, gated (C14) |
| All 9 Guardians + Umbra's 10-5 fight | tiered AI template | `src/game/duel/sim.ts` `think()`/`chooseRune()` | data rows only (HP, element, tier) |
| S5's 2P | symmetric duelist treatment already in the sim | `src/game/duel/sim.ts` `launch(q, e)`/`strike()` | a second stroke buffer + pointer routing; `think()` bypassed on the P2 side |
| Every ad placement | the F25 pass, wholesale | `src/use/useAdGate.ts`, `src/use/useQaAdTrigger.ts`, `src/use/ads/DevAdProvider.ts`, `scripts/portal-qa.mjs` | zero new pacing logic; only placement re-anchored (C8) |
| Save persistence pattern | flat-field, migration-safe `save()`/`load()` | `src/game/duel/state.ts`; new keys in `src/keys.ts` | extended with `S.campaign`, not replaced (C28) |

Across all 10 chapter magics (8 new runes + 2 Signature Spells), only
**4 touch core resolution logic**: the bubble ward's 2-hit `guardK 3`
(ch2, S3 — reclassified from a retexture by M19/I-21), unblockable pierce
(ch3, S3), reflect (ch4, S4a) and the wildcard substitution (ch6, S4b). The
other 6 are verbatim reuse or a small additive field. This is still why
S4's four sub-stages average 5.5–6.5 agent-days each rather than 10+: only
2 of S4's 7 chapters (4 and 6) carry a core-resolution change, and S3
absorbs the other 2 (2 and 3) at the cost §1.2 re-estimates above.

### §1.8 D2 release options

D2 asks: release at S3 (chapters 1–3), or hold for the full 10-chapter
build? Three options, for the owner (D2's table default is "release-ready at
S3; owner picks" — these are what "picks" means in practice):

- **Option A — Ship at S3.** Release chapters 1–3 as v1 the moment S3's exit
  demo passes; chapters 4–10 (S4), 2P (S5) and painted art (S6) follow as
  free content updates, each behind its own `released` flip. *Pros:* earliest
  real telemetry (win rates, session length, whether the restoration loop
  actually retains) before committing the ~54–72 remaining agent-days of
  S4–S6. *Cons:* the game reads as "3 of 10 chapters" to a first reviewer;
  some portals weigh submission completeness in their fit-check.
- **Option B — Hold for all 10 chapters + art.** Release once S4 and S6 are
  both done. *Pros:* matches "a full-fledged game" in one submission, avoids
  running the portal QA matrix (§11) more than once. *Cons:* ~79–106
  agent-days (re-summed for D3's S2 reduction) of unvalidated design before
  any player or portal has seen it
  (S0–S4 + S6; 2P is not part of this option's own definition); if S0's
  circle/hourglass/heart contingencies or the amended balance targets' three
  short rows (M1) take longer than budgeted, the entire release slips, not
  just one chapter.
- **Option C — Ship the S3 build's *engineering* at S3, hold the *listing*
  for S6 (recommended).** Run the full technical release (build, portal QA,
  save migration) at S3 with **procedural placeholder art**, matching how
  Step 1 and Step 2 already ship — but do not push the store-listing/marketing
  moment until S6's painted art lands, so the public-facing launch coincides
  with the finished look while the technical risk (portal contracts, ads,
  saves) is already retired early. This is Option A with its downside
  addressed: reviewers who *are* shown the build see 3 finished chapters, not
  3 finished chapters in placeholder art.

This chapter's own agent-day plan (§1.2) is written to make any of the three
possible without rework: every stage after S3 is additive and flag-gated
(C3), so choosing B or C over A costs schedule, not architecture.


---

## §2 Audience & safety

This chapter does not re-open judgment calls that are already ruled:
C1 (rune alphabet and its chapter order), C4 (economy — no currency, per D3), C8 (ad
sequence and Twin Gift), C9/C10 (wipe tech and tools), C12 (dialogue
grammar), C13 (difficulty chain), C17/C18 (wardrobe/2P mechanics) are all
assumed as given and cited by number. What follows is: the audience lens
every other chapter must design against (§2.1); the numbered, testable
safety rules that bind every chapter (§2.2); the fear/scariness rules for
this specific story content (§2.3); inclusive-framing rules (§2.4); a
motor-order certification of C1's alphabet plus the trace-assist spec
(§2.5, mine to own per the chapter table); session-length guidance (§2.6);
the parent-facing info panel (§2.7); co-play guidance (§2.8); the
`VITE_CHILD_DIRECTED` contract (§2.9, WHAT it guarantees — §11 owns HOW per
SDK); and D1's trade-off laid out neutrally (§2.10).

**Explicit non-goals:** no age/difficulty picker (ruled out by C23 — see
rule 22 below); no third copy deck (C23 — one deck, early-reader level);
no change to the four frozen runes or their recogniser (C1); no redesign of
the ad cadence itself (F25/C8 — this chapter only adds ordering guarantees
around it, not new limits).

### §2.1 The three bands — a review lens, not a build branch

Per C23, **pre-reader (3–5)**, **early-reader (6–8)** and **tween (9–12)**
are not code paths and there is no picker. They exist so every chapter
owner runs the same three-question pass on every new screen or system
before it ships. Reuse this checklist verbatim in §12's acceptance gates:

| Lens | Question | Fails if… |
|---|---|---|
| Pre-reader (3–5) | Can a non-reading child complete this using only icons, colour, motion and the babble voice (C12), with no way to get permanently stuck? | Any required action has no non-text affordance, or a wrong tap has no forgiving recovery. |
| Early-reader (6–8) | Does every word actually needed to proceed stay inside the ≤8-word/simple-vocabulary bubble cap (C12 §10)? | Any REQUIRED string (not a reading bonus) exceeds the cap or uses a word outside a first/second-grade list. |
| Tween (9–12) | Is there a skippable-but-real layer of depth here (spellbook, wardrobe, colour picks, collecting every sector's Twin Gift bloom — C23, D3), and does nothing about this screen read as babyish (forced slow reveals with no way to have already "gotten" the joke)? | The screen has zero optional depth, or forces a first-timer's pacing on a fifth-time visitor with no acceleration. |

This is a design-review pass, run once per feature at each stage gate
(§12), not a runtime check.

### §2.2 Numbered safety rules

Binding on every chapter (§3–§11). Each rule states what it means, and how
a reviewer or a test proves it holds. "SR" = Safety Rule; cited elsewhere
as `§2.2 SR-n`.

1. **No FOMO or scarcity mechanics.** No countdown that gates content or a
   reward, no daily-login streak with break/loss messaging, no energy or
   lives system that locks play behind a timer. *[S0+]* **Test:** code
   review checklist item at every chapter's PR; any timer-driven UI must
   cite which rule (18, 23) it is, or it is rejected on sight.
2. **No purchase flow of any kind, and nothing to spend.** The story build
   has no currency of any kind (D3, superseding this rule's earlier
   in-game-coin wording) — there is nothing a tap can spend. The only
   optional tap is the Twin Gift's rewarded-ad watch (C8), which grants a
   permanent cosmetic sector bloom, not a purchase, and pays out nothing
   that could be bought, saved, or lost. There is no real-money IAP
   anywhere in the story build. **Test:** a build-time grep for a
   payment-SDK import outside the existing platform-license check finds
   nothing; a build-time grep for a coin/currency balance field or store
   also finds nothing.
3. **Gift contents are deterministic, never randomised** (C9/C10 "never
   random"; extends to the colour-me picks in C11, which are player CHOICE,
   not chance). **Test:** a pure-function unit test on the gift/tool
   resolver — same `(chapter, node)` in, same tool out, on every call — and
   a grep for `rnd(`/`Math.random` in that resolver's call path returns
   nothing.
4. **No red or alert-coloured badge on optional content.** Spellbook and
   wardrobe "new" cues are the neutral sparkle of C16, never a numeral,
   never sourced from the HUD's own damage/danger hue. **Test:** a visual
   diff against the HUD's `#ff6a8a`/`#ffd76a` danger and gold hues — the
   cue asset must not match either within a defined ΔE.
5. **Loss copy is soft, in all 21 locales.** "DEFEATED" is retired from the
   story build (C27). **Test:** §10's translation QA re-runs the tone
   check per locale, not just on the English source string — a literal
   back-translation must not read as "defeated"/"lost"/"failed" in any
   locale.
6. **No narrative beat shows distress without reassurance in the same or
   next bubble** (C12's content rule). **Test:** a content-review pass over
   every dialogue key before `released: true` is set for its chapter (C3);
   §10 re-runs it after translation, since tone can shift under
   translation even when the words are "correct."
7. **Every Guardian's defeat resolves into a thank-you beat** (C26) — no
   boss duel ends on hit-and-silence. **Test:** a data-completeness check —
   every one of the 9 Guardian + Umbra entries has a non-empty thank-you
   dialogue key before its chapter ships.
8. **No new asset or copy escalates scariness past `art-style.md`'s
   existing bounds** (§1.6 "gloomy but never scary", §8.5's kid test, the
   "never black" sky/dust rule in §4.2–4.3). This is a floor, not a new
   rule: it means the story extension inherits the ceiling that already
   exists rather than quietly raising it (new dust textures, a darker
   Guardian palette, a "scarier" Umbra). **Test:** `art-style.md` §8's
   silhouette/greyscale/kid-test checks are re-run on every new asset —
   §9 owns running them, this chapter owns the "never escalate" wording
   they're checked against.
9. **No duel ever requires a rune beyond the four frozen ones** (C14) — the
   youngest players' guarantee, and the reason a pre-reader who never
   masters ∞/hourglass/star/heart can still finish the campaign. **Test:**
   §6/§7's per-node win-rate solver additionally reports whether a
   fire/wind/ice/earth-only strategy has a non-zero winning line; a
   regression here blocks release for that chapter.
10. **Every newly-introduced rune ships with its trace-assist window**
    (§2.5) — no rune is recognition-only from its first duel.
11. **Discrete tap targets never go below 44 CSS px** in either dimension
    (the WCAG floor) — map nodes, wardrobe items, dialogue-advance zones,
    Options icons, and the Twin Gift's press-hold target. §3 sets the real
    per-screen sizes and must clear, not merely approach, this floor. (The
    wipe brush's own **36 px contact-radius floor** is C10's — a smaller
    number for a continuous drag gesture, not a discrete tap; the two
    numbers are deliberately different and are not in conflict.) **Test:**
    a layout check per breakpoint from 320×658 up, asserting every
    tap-zone's computed box meets its floor.
12. **Tap-to-equip only; drag is optional, never required** (C17). **Test:**
    a wardrobe interaction test completes every equip action using tap
    events alone.
13. **No ad — interstitial, first-load, or the Twin Gift — fires during
    dialogue, unbox, wipe, reveal, or the wardrobe** (restates C8's scene
    boundary as a hard rule this chapter owns testing for). **Test:** §4's
    scene FSM exposes its current state; a unit test enumerates every
    state and asserts the interstitial/ad-trigger call sites are wired to
    only the two permitted states (post-win, post-loss), never the other
    five.
14. **After a loss, the order is fixed: the doze-off sting plays first,
    uninterrupted, before any interstitial** (restates C8's sequencing as a
    rule this chapter certifies for the audience: no child's very first
    frame after losing is an ad). **Test:** an integration test on the
    post-loss transition asserts the sting's full 1.4 s duration elapses
    before `canShowInterstitial` is even queried.
15. **The Twin Gift never auto-opens, never punishes a decline, and is
    never offered at all after a loss.** It requires the explicit 1.2 s
    press-and-hold (C8's grown-up gate); walking away is never logged or
    presented as a missed bonus, and no copy near it uses urgency language
    ("hurry", "last chance", a shrinking timer). It is win-only by
    construction (D3): it appears on the map beside a sector's reveal, and
    a loss has no restored sector to bloom, so there is nothing to offer —
    a family-friendly game must not sell an easier retry after a loss, and
    this rule keeps that true structurally rather than by policy. **Test:**
    a unit test confirms no timer-driven path reaches `claimReward`; a
    copy-lint on every string within the Twin Gift's component tree rejects
    the urgency word list; a state-machine test confirms `canOfferReward`
    never resolves true outside the post-win map state.
16. **The zero-ranks win-rate guarantee is permanent, not a one-time fact,
    and its target is now the amended two-part version (M1).**
    - First attempt: standard ≥ 90 % (chapters 1–6) / ≥ 85 % (chapters
      7–10); boss ≥ 75 % (chapters 1–6) / ≥ 60 % (chapters 7–10).
    - Cleared within 3 attempts: ≥ 95 %, every chapter.
    - All of it met with **zero ranks**, because the story build has no
      currency and no Rune Shrine to buy ranks from in the first place
      (D3, superseding C13/C4's earlier "currency stays optional ease"
      framing) — the guarantee that used to describe an optional layer is
      now simply the only state that exists.
    - §7.2 owns the canonical measured table; per coverage ruling E1, §2
      keeps no second run with different numbers. As of that table, all 20
      rows meet target after §6.21's tuning. Any row that regresses is
      §6/§7's work, not this chapter's; the target itself never relaxes.
    - Re-verified by §7's tuning harness every time §6 changes a foe's
      stats or a chapter's magic, so "watch more ads to keep the ladder
      fair" never becomes true by drift. **Test:** the harness run,
      checked against §7.2's table, is a required check on any PR touching
      `sim.ts`-equivalent foe data, not a one-off audit.
17. **The QA chord is flagged as a mashing risk, not accepted as-is.** The
    shipped design (`game-implementation-plan.md` "Ads pass": 30 taps
    ≤ 1.5 s apart on the foe's HP bar → force an interstitial, bypassing
    pacing) sits on a control an excited child is realistically likely to
    mash during a duel. §11 must confirm one of: (a) the chord is compiled
    out of every portal build and exists in QA/dev builds only, or (b) if
    it must ship live, its target moves off a natural mashing surface (the
    HP bar) onto a deliberately inconvenient one, or gains a modifier nobody
    reaches by accident (e.g., a long-press start instead of 30 discrete
    taps). This chapter does not pick which — it requires §11 to close one
    of the two before S3. **Test:** a scripted "excited child" input replay
    (rapid, roughly-timed taps concentrated on the HP bar for 15+ seconds)
    must NOT trigger an interstitial on any shipped build.
18. **Analytics stay non-identifying regardless of the child-directed
    flag.** `useAnalytics.ts`'s in-memory ring (no PII, dies with the tab)
    is unaffected by `VITE_CHILD_DIRECTED` in either state — the flag only
    ever narrows the portal SINK (§2.9.3), never the ring, and never adds a
    new collection surface. **Test:** the existing analytics test suite
    passes unmodified with the flag set either way; a new test asserts
    `analyticsLog()`'s shape is identical in both builds.
19. **The parent-facing privacy/ads text (§2.7) is inline-only wherever the
    hard reality bans external calls** (Poki, Playables/Playgama) — no
    outbound link to a hosted policy on those builds; other builds may
    link out. **Test:** §11's per-portal QA checklist greps the built
    bundle for an `<a href>`/`window.open` inside the info panel on
    Poki/Playgama builds and fails the gate if found.
20. **No wardrobe slot ships with only one, narrowly gendered default and
    no alternative** (§2.4). **Test:** a one-line content audit per slot in
    §9's asset-manifest review before a chapter's cosmetics ship.
21. **Co-play parity.** In any mode with two human players (S5 versus, or a
    future co-op under D5), the loss/soft-copy rules (5, 6 above) apply
    identically to whichever side loses, and the post-duel reward beat is
    shown to both players together, never as a lone winner's spotlight that
    excludes the other. **Test:** a 2P integration test asserts both
    players' result-flow events fire together and carry the same copy
    keys.
22. **No age or difficulty picker, ever, and no silent-easing signal beyond
    the two named ones.** Per C23, the bands are a review lens, not a
    branch; per C13, the only adaptive easing that exists is the
    onboarding ramp and Dream Dust. This rule exists so a later chapter
    does not "helpfully" add a hidden third easing signal or a disguised
    age question — any such change is a new ruling, not an implementation
    detail. **Test:** a code-review flag on any new persisted field that
    modifies pacing outside `onboarding`/`dreamDust` (C13).
23. **`VITE_CHILD_DIRECTED` is a build-time, all-or-nothing constant** — see
    §2.9. It is never exposed as a player-facing setting, never toggled at
    runtime, and never partially applied. **Test:** a grep confirms the
    flag is read in exactly one place, `src/use/useChildDirected.ts`
    (§2.9.1, M17), and that every consumer imports the resolved boolean
    from there rather than reading `import.meta.env` directly, and never
    behind a `ref`/store/localStorage key a session could flip.
24. **Every new asset or string clears the existing bar before it ships,
    not a lowered one for "just this chapter."** `art-style.md` §8's
    readability/kid-test checks and this chapter's rule 6 are the gate;
    "it's just a placeholder" is not an exemption, because Step 2 ships
    procedural placeholders that players actually see (hard reality: Step
    3 paint comes later). **Test:** the same §9 checklist runs on
    procedural placeholders as on painted returns.

### §2.3 Fear and scariness — foes, dust, sky

`art-style.md` already carries the visual floor (§1.6's "gloomy but never
scary" sky, §8.5's kid test, "never black" in §4.2–4.3, "cheeky not evil"
rivals). This section is what the STORY adds on top, in premise and copy,
where the art rules don't reach (rule 8 above is the pointer; this is the
content):

- **Peril resolves as paused, not suffering.** A biome's problem ("grounds
  the baby pegasi", "trapped in dark ice blocks", "the night sky has gone
  dark") must read, in its very first bubble, as a temporary pause a hug
  and some sparkle-magic fixes — never as ongoing pain. "The baby pegasi
  are having the longest nap" is in bounds; "the baby pegasi are trapped and
  scared" is not, regardless of how gently it's drawn.
- **Shadow puffs (chapter 1's foes, C26) and every standard foe are cheeky,
  never menacing** — this is `art-style.md` §4.2's existing rule for named
  rivals, extended explicitly to the unnamed standard-node clones the GDD
  calls "shadow-clones", who have no art-style entry of their own today.
  §9 must give them the same "sleepy eyes, smug little grin" treatment, not
  a scarier, more numerous, more anonymous-feeling dust silhouette just
  because they're disposable.
- **"Corrupted Guardian" reads as "dusty", not "monstrous".** The word
  "corrupted" in the GDD's own chapter table is a design-doc word, not a
  player-facing one; §10's actual copy should prefer "dust-covered" /
  "sleepy" framings, consistent with Umbra's own "she's just lonely" arc
  (C26) applying in spirit to every Guardian, not only the finale.
- **Sky-as-scoreboard stays inside its existing dusk floor.** The story
  extension must not introduce a darker-than-dusk state (e.g., a "storm
  boss" sky that goes past `art-style.md`'s dusk palette `#2E2A55`–`#5B4A86`)
  even for the hardest boss fights. If a chapter's fiction wants a
  stronger sky beat (a real storm, an eclipse), it is achieved through
  motion and sparkle density, never through going darker than the existing
  floor.
- **The Umbra Dust overlay (the wipe mechanic's covering layer, §8/§9) is
  textured, not oozing or grimy.** COZY/TECH's material language ("thick
  and slightly fuzzy", not slimy, cracked or cobwebbed) is adopted here as
  the fear-safety reason, not only the aesthetic one: a "corruption" that
  reads as illness or rot is exactly the kind of imagery a pre-reader
  reacts to before parsing any story context.

### §2.4 Inclusive framing

- The protagonist (Aurora) and the core cast are fixed by the GDD and are
  not in scope to change here.
- Rule 20 (§2.2) is the binding rule: every wardrobe slot's option set
  (head, neck, back, companion, hoof-trail, mane swatch, skin — C17) ships
  at least one option outside the soft-pastel/glitter default alongside it.
  `art-style.md`'s mane-streak palette already gives four non-pink hues
  (`#C7A6FF` lilac, `#9FF0D0` mint, `#9FD8FF` sky, plus `#FF9ECF` pink) —
  §9 should treat that existing four-hue set as the template for "at least
  one non-pink option per slot", not invent a new palette.
- Player-facing copy (§10) and any store/portal listing (§11, D1) must not
  say "girls", "for girls" or state an age band. This is D1's default
  (§2.10), not a new decision made here.
- Local 2P co-play (§2.8) must not assume a specific pairing (parent+child,
  two siblings, two friends) in its copy or art — the mode is generic
  "you and a friend", in every locale.

### §2.5 Motor-order certification of the C1 rune alphabet, and trace-assist

**This is this chapter's item to own per the chapter table.** C1 is ruled;
what follows certifies it against fine-motor development and specifies the
one mitigation every "hard" shape needs.

**Certification table.** Ages are the typical range at which a child
reliably COPIES the shape under standard paediatric fine-motor assessment
batteries (Beery-Buktenica VMI / Gesell-style figure-copying norms) — a
rough guide, not a per-child guarantee:

| Ch | Shape | Typical copy-age | C1's placement | Verdict |
|---|---|---|---|---|
| — | Fire △, Wind wavy, Ice Z, Earth □ (frozen) | ~4–6 y | ch. 0 (day one) | Already signed off; unchanged (C1.2). Recorded here for completeness only. |
| 1 | Leaf V (chevron, one apex) | ~4 y | ch. 1 | On time. |
| 2 | Bubble ○ (circle) | ~3 y | ch. 2 | Earliest-mastered shape in the game, placed early — correct order. |
| 3 | Spiral (~1.5–2 turns) | ~4–5 y | ch. 3 | On time. |
| 4 | Signature Spell (no new shape) | n/a | ch. 4 | N/A — motor floor is whatever runes the player already has. |
| 5 | Mirror ∞ (crosses itself) | ~6–7 y | ch. 5 | **Placed earlier than its motor difficulty.** See mitigation below. |
| 6 | Arch ∩ (one open curve) | ~4 y | ch. 6 | Easy shape placed AFTER a harder one (∞, ch. 5) — the story order is not monotonic in motor difficulty. Accepted; see below. |
| 7 | Hourglass (bowtie outline) | ~6–7 y | ch. 7 | Late enough; also flagged fragile at 92.7% by F-series measurement (§5 owner) — a second reason, not this chapter's to resolve. |
| 8 | Signature Spell (no new shape) | n/a | ch. 8 | N/A. |
| 9 | Star ☆ (5-point) | ~6–7 y | ch. 9 | Appropriately late. |
| 10 | Heart ♡ (cusp + concave curves) | ~6–7 y | ch. 10 | Appropriately late — the finale earning its hardest shape is also the right story beat. |

**Finding:** the chapter order is NOT strictly ascending in motor
difficulty — ∞ (chapter 5, ~6–7 y) is harder than ∩ (chapter 6, ~4 y) right
after it. This is accepted rather than reordered, because: (a) C1 is
ruled and the story beats (Mirror Mountains before Rainbow Ridge) are not
this chapter's to reshuffle; (b) rule 9 (§2.2) already guarantees no duel
requires the new rune, so a pre-reader who cannot yet manage ∞ keeps
progressing on the frozen four regardless; (c) the mitigation below is
targeted at exactly this kind of shape.

> Dissent: I would have sequenced ∞ later than ∩ if the story order were
> mine to set, purely on motor grounds. I write the certification to the
> ruling as it stands, because C1 already weighed this against the
> narrative and rejected reordering.

**Trace-assist — settled default (M27):**

- **What it is:** a low-opacity (**30%**) dashed guide path, drawn in the
  rune's element hue, rendered UNDERNEATH the player's own ink. It is
  purely decorative — it never feeds the recogniser and never blocks or
  redirects a stroke that departs from it.
- **Default (M27, binding):** **ON automatically for the first 3 cast
  attempts** (successful or not) **of every newly-earned rune — every
  rune, uniformly, not only the three rated hardest above** — then **OFF
  automatically.** Attempt count is per-rune, saved in `S.campaign` (§4
  owns the field).
- **Getting it back:** a single Options toggle, **"Show rune guides"**
  (`options.traceAssist` — §4 wires it, §10 keys it; §10.13.H flattened the
  path because `options.general` is already a plain string in `en.ts`), turns the
  guide back on for every rune going forward — runes already past their
  3-attempt window and future ones alike — until switched off again. This
  replaces the earlier draft's per-shape long-press-on-slot idea, which is
  withdrawn.
- **Why (M27):** a single uniform counter and threshold is simpler to
  build and to test than a hardcoded list of "which shapes stay assisted"
  that §5/§1 would otherwise have to keep in sync as runes are added; it
  still meets the pre-reader lens (§2.1) on every rune's first exposure,
  not only the hard ones; it stops on schedule so a mastered shape never
  reads as babyish to the tween lens (§2.1); and putting the escape hatch
  in Options, next to §2.7's parent panel, gives a caregiver or a
  struggling older player a deliberate, discoverable way back to help —
  more reliable than a long-press gesture a pre-reader is unlikely to find
  on their own.
- **Scope tag:** `[S2]` for both the 3-cast default and the Options toggle
  (ships together with chapter 1's flow shell, since Leaf is the first
  rune to need either).
- **Depends on:** §5 (Gesture) supplies each new rune's canonical path to
  draw the guide from — the same path used to author its recognition
  template; §4 (Architect) owns the `S.campaign` attempt counters and the
  toggle's persisted field; §10 keys the toggle's label.

### §2.6 Session-length guidance

Corrected per N-15/M29 — the old 5.5 min / 60 min pair did not compose and
is withdrawn. This chapter now derives its numbers directly from the
ratified per-node duel time only (RULINGS numbers block: standard node
≈ 56 s (≈ 53 s once the Eraser arrives), boss node ≈ 85 s; chapter ≈ 4.9–5.2 min;
campaign ≈ 55.1 min including +10 % for map browsing; a 10-minute session ≈ 2.0
chapters; §7.7 owns these figures).
Wipe time (≈ 15 s standard, ≈ 10 s boss since the 2026-09-20 Sunbeam retune) is already **inside** those node figures, not added
on top of these figures — that additive step is exactly what made the
withdrawn numbers fail to compose — so it is called out separately below
rather than folded back in.

- **At 56 s per standard node: 5 min ≈ 5 nodes; 15 min ≈ 16 nodes**
  (300 / 56 ≈ 5.4; 900 / 56 ≈ 16.1). Against the ratified 5.15 min/chapter
  figure, that is roughly **1.0 chapters at 5 minutes and ≈ 2.9 chapters
  at 15 minutes** — consistent with §7.7's anchor of 10 min ≈ 2.0
  chapters.
- **Target for this audience: 5–15 minute sittings**, with a clean stop
  point after every completed node (never mid-duel, never mid-wipe — the
  existing loop already only offers a "continue" affordance at node
  boundaries, per C6's flow). No new pacing mechanic is needed to hit
  this; it falls out of the numbers above by construction.
- **Rule for future chapters (ties to §2.2 rule 1):** no feature may force
  more than one node's worth of unskippable content (dialogue → duel →
  reward) between pause points. A multi-node cutscene or a forced double
  boss run would violate this and needs a new ruling before it ships.
- **Wipe time is already INSIDE the node figures above.** §7.7's 56 s
  standard node = 9 s dialogue + 25 s duel + 4 s unbox + 15 s wipe + 3 s
  reveal, and the boss's 10 s wipe is inside its 85 s. §7.7 owns this
  arithmetic. Both fit comfortably inside a 15-minute ceiling; a session is allowed to end AT a
  boss's big reveal rather than push into the next chapter — the map (§8)
  already gives that a satisfying stopping visual (a newly restored
  biome) for free.

### §2.7 What parents can see: the Options "For Parents" panel

A new section inside the existing Options modal (`options.title` already
keys off `en.ts`; the modal itself is `src/components/.../OptionsModal`,
per the project's existing structure — §3/§4 place the new section exactly).
Reachable via a plain "i" info affordance (never a reading requirement to
FIND it — a child does not need to read "Options" to have a caregiver find
it once).

Content is written FOR the adult reader (full sentences are fine here —
this is the one screen in the whole game that is not bound by the
early-reader cap, because its audience is the parent, not the player):

- **"About this game"** — one short paragraph: no chat, no strangers, no
  location, no account required to play.
- **"Ads"** — states plainly that the game shows video ads to stay free,
  names which are skippable and which are not (interstitials aren't;
  rewarded is opt-in), and — **only on the `VITE_CHILD_DIRECTED` build**
  (§2.9) — states that ads are shown without personalisation. This section
  must never claim "no ads" or "ad-free", because interstitials and the
  first-load ad still show under both flag states (rule 19 guards the
  wording, not the claim itself — §11 supplies the exact per-portal
  copy).
- **"Purchases"** — states plainly there are none (rule 2, §2.2).
- **"Privacy"** — one paragraph, plain language, no legal boilerplate:
  what's stored (a save file, on this device or the portal's cloud save,
  nothing else) and that no personal information is collected. **Inline
  text only on Poki/Playgama builds** (rule 19); other builds may add a
  "full policy" link to the portal's or the owner's hosted policy page.
- **Fields, exact:** `{ title, aboutBody, adsBody, adsNonPersonalisedNote
  (child-directed builds only), purchasesBody, privacyBody,
  privacyLinkLabel? (omitted on Poki/Playgama) }`. i18n keys under a new
  `options.parents.*` namespace (§10 translates; §4 wires the section into
  the modal). `[S3]` — ships with the first portal-ready release candidate,
  since that is the first build real families see.

### §2.8 Co-play guidance

- **Pre-S5 (today through S4):** the game is single-player; "co-play" means
  a parent sitting with a child. Nothing extra is needed for this beyond
  the rules already in force (soft loss copy, no scary content, the
  trace-assist window an adult can point at) — it is covered by simply
  following §2.2/§2.3/§2.5.
- **S5 (2P versus, C18):** rule 21 (§2.2) is the binding requirement — both
  players get identical loss copy and a shared reward beat, never a lone
  winner's spotlight. Practically: the victory flourish and gift-drop
  (C6's step 1) play once, framed for both screens/halves, not twice with
  one side dimmed.
- **Whether S5 should also offer a cooperative mode (vs. a shared boss,
  rather than each other) is D5** — this chapter's only input to that
  decision is that co-op removes the "sibling loses to sibling" framing
  entirely, which is the cleanest possible answer to the co-play question,
  but it is a scope decision (a second duel mode), not a safety
  requirement — versus-mode-with-parity (rule 21) is already safe.

### §2.9 `VITE_CHILD_DIRECTED` — the contract

This section states WHAT the flag must guarantee. §11 owns HOW each
guarantee is implemented per portal SDK; §4 owns where the constant lives
in code otherwise. Per M17, the flag is read in exactly **one** module,
and two of the guarantees below are now specified down to their mechanism
rather than left as an outcome for §11 to invent independently.

#### §2.9.1 Nature of the flag

A **build-time** constant, read in exactly one place: `src/use/
useChildDirected.ts` (new file, §11). Every other module that needs it
imports the resolved boolean from there — nothing else in the codebase
reads `import.meta.env.VITE_CHILD_DIRECTED` directly. It is **never** a
runtime toggle, never player-facing, never partial (rule 23, §2.2).
Default: **`false`** (D1's default posture, §2.10).

#### §2.9.2 Guarantee — rewards cannot pay out by any route

Not merely "the Twin Gift is hidden": `useChildDirected.ts`'s flag is
**OR'd into `isRewardOfferSuppressed` inside `useAdGate.ts`** (alongside
the existing CG-pre-release and Wavedash cases), so `claimReward` refuses
unconditionally when the flag is true — belt-and-braces, the same pattern
`useAdGate.ts` already uses for those two builds. `canOfferReward`
resolves `false` regardless of ad readiness, and no other call site can
reach a payout by skipping the button.

#### §2.9.3 Guarantee — the analytics sink is disabled by a build-time module swap

Not an in-function `if`: when the flag is true, `analyticsSink.ts` is
replaced by its stub at build time via a **module alias swap in
`vite.config.ts`** — the same proven pattern the Playgama build already
uses to alias away SDK-shaped probes it must not carry. This means the
`gtag` / `dataLayer` probe code is not merely inert but **not present in
the child-directed bundle at all**. The in-memory ring (rule 18, §2.2) is
untouched either way — this swap narrows the SINK only.

#### §2.9.4 Guarantee — non-personalised ad treatment

Request non-personalised / child-directed ad treatment from every ad SDK
the build ships, wherever that SDK exposes the option (§11's per-SDK
table).

#### §2.9.5 Guarantee — Playgama/Playables dropped from eligibility

Drop the Playgama target from `build:all` — Playgama distributes to
YouTube Playables, which forbids "made for kids" content per F12, so a
child-directed build cannot ship there at all, not just with different ad
settings.

#### §2.9.6 Parent-panel copy switch

Switch the Options "Ads" panel's copy to include the non-personalised-ads
note (§2.7).

#### §2.9.7 What must NOT change

Interstitial cadence, the doze-off ordering, gift determinism, loss copy,
or any other rule in §2.2 — those are unconditional, for every build, flag
on or off (C2's ruling: "these are cheap, and they are right for cozy
adults too").

#### §2.9.8 Cost of reversal

Per D1, a flag flip plus listing copy — no code path needs to be rebuilt,
only chosen at build time, provided §4/§11 implement §2.9.1–§2.9.6 as
described.

### §2.10 D1 — the positioning trade-off, laid out neutrally

D1 (RULINGS §2b, expanded in §13) asks whether to position and list this
game as **"made for kids 3–12"** or as **"all-ages cozy"**. This is a
marketing/eligibility decision for the owner, not a safety one — §2.2's
rules apply either way. Laid out without a recommendation:

| | Option A — "all-ages cozy" (current spec default) | Option B — "made for kids 3–12" |
|---|---|---|
| Playgama / YouTube Playables | Eligible. | **Forfeited.** Playables' own policy forbids content that "specifically targets kids" (F12). |
| CrazyGames | Eligible for the monetised main site (13+ audience, PEGI 12 gameplay per F13). | Routed to `kids.crazygames.com`, which is **unmonetised** (F13). |
| Ad revenue | Personalised ads where the SDK and the player's own consent allow it — standard eCPM. | Non-personalised ads only, everywhere, by regulation — materially lower eCPM (§7/§11 quantify). |
| Analytics | The `gtag`/`dataLayer` portal sink may run (still no PII — rule 18). | That sink is off (§2.9.3). |
| Store/listing copy | No "kids", "3–12" or "girls" wording (§2.4); "cozy, all-ages" framing. | Can lean into the framing the GDD's Executive Summary uses today. |
| `art-style.md` §9.1's "aimed at young girls" prompt line | Left as-is for now either way (C2's ruling) — revisited under D1, not by this chapter. | Same. |
| What does NOT change either way | Every rule in §2.2 (deterministic gifts, soft loss copy, no FOMO, trace-assist, the touch-target floor, the Twin Gift's press-hold gate, the parent info panel, inclusive wardrobe defaults). The game is designed for a child player regardless of how it is marketed, because — positioning aside — young children will play it either way given its art style and mechanics. |

The spec's working default (D1's stated default) is Option A with
`VITE_CHILD_DIRECTED=false`, reversible at any time for a flag flip plus
listing text (§2.9). Nothing in this chapter argues for one option over
the other; §2.2's unconditional rules are this chapter's actual position.


---

## §3 Flow, screens & input

Scope: the scene list and its transition table with timings; input disambiguation per scene; portrait/landscape layouts for the map, wipe scene, dialogue, wardrobe, spellbook and the duel-HUD deltas; touch targets; interruptions; RTL/reduced-motion/colour-blind rules; empty/loading states; the 2P split layout; and the wardrobe/spellbook interaction flows. §8 owns the restoration loop's internals (brush, grid, reveal feel, colour-me, tool identity); this chapter owns the `wipe` scene's entry, exit and the frame around it. §6/§7/§9/§10 are cited wherever this chapter assumes one of their numbers — each citation names the value assumed, for their audit.

### §3.1 Scene list

Eight real scenes, adopting §4.1.1's `SceneId` enum verbatim (M10): `boot | map | dialogue | duel | unbox | wipe | wardrobe | versusSetup`. Plus two global overlays (`OverlayId`, §4.1.1): `options | spellbook`. Nothing here adds a router route (C6): all eight scenes are states of one in-app FSM owned by `src/game/flow/scene.ts` (§4.1.2's `flow`/`FlowState`), with a reactive mirror in a new `src/use/useFlow.ts` (§4.1.2) — this chapter no longer assumes its own composable name; §4's is canonical.

`AppScene.vue` [new file] owns the single `<canvas>`, the one RAF loop, `getContext`, and every pointer/keyboard listener, for every scene — not just the duel (M11). It calls `load()` before the boot transition is ever evaluated (M11), then mounts the current scene's DOM overlay by reading `S.flow.scene`. Each scene has its OWN DOM-overlay `.vue` file (HUD, buttons, bubbles); none of them own a canvas or a RAF — the same split the duel already keeps between its canvas world and its Vue chrome, now generalised to every scene.

| Scene id | What it is | DOM-overlay file | Canvas draw module | Gameplay-live? (§C7) |
|---|---|---|---|---|
| `boot` | Transient: `load()` resolves, the resume point is derived (§4.4), then the FSM leaves this scene before the first real render | — (no overlay) | — | no |
| `map` | Idle browsing: pan, tap a node/gift/tent | new: `src/views/MapScene.vue` | `src/game/map/` | no |
| `dialogue` | Pre-duel (or post-boss) bubbles | new: `src/views/DialogueScene.vue` | `src/game/map/` (bubbles are DOM over the still-visible map canvas, §4.1.4) | no |
| `duel` | The fight | `src/views/GameScene.vue` — no longer the app root; its current body relocates here as the duel scene's own component (§4.1.2) | `src/game/duel/` (unchanged) | yes |
| `unbox` | Gift-opening choreography + the colour-me pick (§8.3/§8.7, §3.2.2) | new: `src/views/UnboxScene.vue` | `src/game/map/` | no |
| `wipe` | Locked-camera restoration | new: `src/views/WipeScene.vue` — a DOM overlay only | `src/game/restore/`, drawing into the SAME shared `<canvas>` as `map`, zoomed and camera-locked (§4.1.4; C6: "same map canvas, zoomed, camera locked") | yes (§C7: duel and wipe are the two live surfaces) |
| `wardrobe` | The tent diorama | new: `src/views/WardrobeScene.vue` | `src/game/cosmetics/` | no |
| `versusSetup` | [S5] Side-select/ready screen before a local 2P duel | new: `src/views/VersusSetup.vue` | `src/game/map/` (backdrop; §9's call if it wants its own) | no |

**Correction from the previous draft (I-12):** the wipe surface is not "a mode flag on `MapScene.vue`, not a separate file." It gets its own DOM-overlay file, `WipeScene.vue`, exactly like every other scene. What is shared with `map` is only the CANVAS WORLD module (`src/game/restore/` still draws into the one `<canvas>` `AppScene.vue` owns, at the same coordinate space `src/game/map/` uses, just zoomed and pan-locked) — scene identity (which `.vue` mounts) and canvas-module reuse are two different axes, and the previous draft conflated them.

`nodeId` is numeric, 0–49 (§4.4's `NodeDef`/`FlowState.node`), everywhere in this chapter — never a string (I-25). The current scene lives at `S.flow.scene`; `flow` is a plain, non-persisted object (M11), and the Vue tree actually reads a `flowHud` mirror of it (same copy-out-on-change firewall `useDuelHud.ts` already uses for `S`).

Global overlays (reachable from any scene above, never their own FSM state — they stack on top and pause via the existing `acquireModalOpen`/`isAppPaused` gate, §C7):
- **Spellbook** — existing `src/components/duel/SpellBook.vue`, re-scoped per §3.9.
- **Options** — existing `src/components/organisms/OptionsModal.vue`, promoted to a global entry point (§3.3.7) and given one new footer action (§3.3.8).

**Non-goals (explicit):**
- No new router route, no deep link to a scene or node. The router stays exactly as it is (one real route). [all stages]
- No pinch-zoom or free-zoom on the map. One fixed fit-to-viewport scale per orientation, pan only — the same "one gesture vocabulary" discipline the duel already holds to. [S2]
- No age-gated branching of this flow (C23). One flow, one copy deck, for every player. [all stages]
- No keyboard-only path for panning, wiping or equipping. Pointer-event parity (mouse = touch = pen) is kept, exactly as drawing already works today; there is no NEW burden to invent a keyboard-only map/wipe/wardrobe path where one has never existed for drawing either. [all stages]
- No pass-and-play fallback for 2P (C18 already rejects it; restated here as this chapter's boundary, not re-opened). [S5]

### §3.2 The scene transition table

State lives in two places, both canonical per §4 (I-15's reconciliation — the previous draft's field list is withdrawn):
- **`S.campaign`** (`CampaignState`, §4.4, persisted, nested per §C28): `furthestNode: number` (-1..49, highest node WON), `sectorsDone: string` (50-bit bitset), `wipeCoverage: string | null` (the ONE in-progress sector's 24×14 coverage grid, base64, §C9 — not `wipeGrid`), `dialoguesSeen: string` (50-bit bitset, not a `Record<nodeId,1>`), `lossStreaks: Record<string, number>` (keyed by node index as a decimal string, §C13).
- **`S.flow`** (`FlowState`, §4.1.2, NOT persisted, M11): `scene: SceneId`, `node: number`, `mode: 'campaign'|'versus'`, `overlay: OverlayId|null`, plus `mapPan: { chapter: number, offset: number }` — this chapter's assumed addition to `FlowState` for the last pan position (§4.1.2 doesn't yet list it; §4 should confirm the name on its next pass).
- **Whether a gift is pending, and where, is DERIVED, never stored:** `pendingSectorNode(S.campaign)` (§4.4) returns the node index or `null`. There is no `pendingGift` field. `nextDuelNode(S.campaign)` returns the next node to duel (`min(49, furthestNode + 1)`).
- Dialogue-seen gating (§C12, §3.2.5) reads `hasBit(S.campaign.dialoguesSeen, nodeId)` (§4.5.1's helper), not an indexed record.

#### §3.2.1 Boot

| Save state | Lands on | Then |
|---|---|---|
| No save (first ever launch) | `dialogue`, node 0, tutorial dialogue (3 bubbles, chapter-opener volume, §C12) | → `duel` |
| `pendingSectorNode(S.campaign)` is non-null (a gift unopened, or `wipeCoverage` non-null and its sector not yet in `sectorsDone`) | `map`, panned to that node's sector, `wipe` NOT auto-entered | player taps the gift to open/continue |
| `pendingSectorNode(S.campaign)` is null | `dialogue` at `nextDuelNode(S.campaign)`'s pre-duel bubbles (C6). This is also the resume case for a player who last closed mid-duel without winning: `furthestNode` never advanced, so `nextDuelNode` still resolves to that same node's dialogue — a duel's internal sim state (`S.phase`/`hp`/`queue`) is not persisted, matching today's `state.ts save()` | → `duel` |
| `furthestNode === 49` and its sector is done | the idle `map`, campaign-complete state (§8/§10 own what it says) | — |

No case boots to `map` cold with nothing to focus, and no case shows a main menu — both hold C6 and the playbook rule.

#### §3.2.2 Win loop, standard node

Colour-me placement corrected per M20/I-22: it sits right after unbox's tool-float beat finishes, BEFORE the wipe — not after it, as the previous draft had it. Reveal timing corrected per I-31: §8 never states a single reveal total, so this table cites §8.6's actual breakdown instead of the previous draft's invented "~1.2 s" (which had been cross-wired from the unrelated Twin Gift hold duration).

| Step | Scene | Duration | Notes |
|---|---|---|---|
| 1 | `duel` → win detected | 0 | existing `onDuelEvent('finish', true)` |
| 2 | Victory flourish, gift visibly drops into the arena | **1.4 s** | reuses the existing `AD_BEAT_MS` constant (`GameScene.vue` L212) — same beat, new payload. Scene is still `duel` (§4.1.3) |
| 3 | Interstitial, only if `canShowInterstitial()` | ad-SDK controlled | §C8, unchanged clock |
| 4 | `duel` → `map`: page-turn transition | **450 ms** | new; a page-flip crossfade/slide, matching the pop-up-book metaphor (§C29) |
| 5 | Idle `map`, gift sits on its sector, breathing glow (§3.4) | until tapped | `pendingSectorNode(S.campaign)` now resolves to this node |
| 6 | Tap gift → `map` → `unbox` (node) | 0 | tap-vs-pan threshold below (§3.3.1) decides this was a tap; §4.1.3's transition |
| 7 | Unbox choreography (§8.3, Standard Gift) — idle shake, tap, bow-untie, burst, tool eases to the player's last touch point | **1.6 s total** (0–350 invite, 350–650 untie, 650–900 burst, 900–1600 tool-ease) | §8 owns the beat; still scene `unbox` |
| 8 | Colour-me pick (§8.7) — 3 paint pots rise alongside the tool the instant step 7's tool-float finishes; tap one (≥56 px target, §3.4) or auto-pick after **4 s** idle | 0–4 s (player-paced, capped) | every sector has exactly one colour-me landmark (§8.7 — unconditional, not "if this sector has one"); still scene `unbox`, resolves BEFORE the wipe starts |
| 9 | `unbox` → `wipe`: zoom in, camera locks | **400 ms** ease | camera lock takes effect the instant the zoom starts — no pan/pinch input is read from the first frame of step 9 |
| 10 | Wipe | **target 15 s** (§C10) | §8 owns the interaction; this chapter owns steps 6, 9, 11–13 |
| 11 | Auto-complete: coverage ≥ 85 % (or §8.6's graceful finish: the sector LOOKS clean) AND pointer idle ≥ 1.5 s (§8.6/C25) → reveal fires. OR nothing visible is left at all, or the player reaches 100 % by hand → reveal fires immediately, sweep step skipped | 0–∞ (player-paced) | §8.6's exact rule, not a flat timer |
| 12 | Reveal (§8.6's real breakdown, standard sector) — input freeze, then one directional wipe-wave from the player's last touch point to the sector's far edge (white-hot leading edge ~120 ms, then true colour bleeds in), 40–60 staggered glints, a scaled-down flourish at chime steps 9–10 | **550 ms freeze + 420 ms sweep** (no single stated total — cite the breakdown, per I-31) | §8/§9 own the look |
| 13 | `wipe` → `map`: zoom out, back to idle `map` at the SAME pan offset it had before step 6 | **400 ms** | `sectorsDone` bit set, `wipeCoverage` cleared; `pendingSectorNode` now resolves null; next node's hit-circle starts breathing (§3.4); the just-restored sector is now eligible for the Twin Gift offer (step 13a) |
| 13a | Twin Gift offered beside the just-restored sector, on the idle `map` | until pressed-and-held, or ignored | **win only** — a loss has no restored sector to bloom (§3.2.4; D3 removes that offer entirely on a loss); gated by the same **1.2 s press-and-hold** as §3.3.4; grants a permanent cosmetic bloom of that sector — extra animated critters/flowers plus a gentle sparkle, via the existing capped prop system; no power, no progress; one bloom per sector, ever (50 at most); absent when `VITE_CHILD_DIRECTED` (§C2); D3 (2026-09-18) supersedes F25's coin payload — the story build has no currency |
| 14 | Player taps the (now pulsing) next node | 0 | tap-vs-pan threshold |
| 15 | `map` → `dialogue` at that node | **250 ms** crossfade (a soft push-in on the node) | new; avoids a hard cut |
| 16 | `dialogue` → `duel` | 0 | |

#### §3.2.3 Win loop, boss node (5th of a chapter)

Same as §3.2.2, with two corrections for the boss's own numbers (§8.3/§8.6) and one insertion:
- Step 7's unbox choreography is the **Boss Chest**, total **~2.5 s** (0–500 idle rattle, 500–950 clasp/lid, 950–1500 full burst simultaneous with §5/§6's rune/Signature-Spell reveal, 1500–2500 Sunbeam eases to touch).
- Step 12's reveal is the boss breakdown: **650 ms freeze + 850 ms sweep** (≈1,500 ms total), ≈100 glints, scaled to ≈2× linear sector size, i.e. 4× area (§8.6/§8.14).
- One insertion between steps 2 and 3: a **2-bubble thank-you** dialogue beat (C12's "per-Guardian friendship beat"), played in the arena (scene still `duel`) with the defeated Guardian still on screen, 600 ms minimum dwell per bubble, tap-to-advance. It sits before the interstitial (not after) so the ad anchors to "the result", matching C8's placement rule rather than splitting the boss's payoff across an ad. This placement is this chapter's call — no C-ruling fixes it — flagged for §12's audit.

Boss wins also carry — chapter 10 boss only — the "Umbra joins the map" beat (§C26) replacing step 13's return with a short admire moment instead of the idle map.

#### §3.2.4 Loss loop

| Step | Scene | Duration | Notes |
|---|---|---|---|
| 1 | `duel` → loss detected | 0 | |
| 2 | Doze-off sting (soft copy, §C27) | **1.4 s** | same beat shape as the win flourish |
| 3 | Interstitial, only if due | ad-SDK controlled | §C8 |
| 4 | Loss beat, IN THE ARENA (there is no map gift on a loss) | player-paced | Dream Dust visual (owned by §6/§9); two choices: **Retry** or **Map** |
| 5a | **Retry** tapped → straight into `duel`, same node, dialogue NOT replayed | 0 | Dream Dust's `S.campaign.lossStreaks[String(nodeId)]` (§4.4/§C13) increments; this chapter assumes §6 increments it at loss, not at retry-tap |
| 5b | **Map** tapped → page-turn to idle `map`, no gift, no sector change | **450 ms** | same transition as §3.2.2 step 4 |

**No rewarded offer on a loss (D3, 2026-09-18):** a loss has no restored sector, so there is nothing to bloom and nothing offered here. (Historical, for provenance only: the previous draft's step 4a offered a "Twin Gift consolation pouch" here, paying `+winCoins`, gated by the same 1.2 s press-and-hold as the win variant — removed per D3, along with F25's coin payload.)

#### §3.2.5 Replay (completed nodes, §C24)

Tapping a completed node's hit-circle: dialogue is **skipped automatically**, straight to `duel` — no bubbles, no skip-icon tap needed. Rationale: C12's skip affordance governs a player's own choice on a FIRST re-viewing; a replay is explicitly framed as "practice", and forcing even one skippable tap on every practice run is friction the practice loop doesn't need.

On a replay's end (win or loss): `duel` transitions straight back to `map` — never through `unbox`/`wipe` — because that node's `sectorsDone` bit is already set, so `pendingSectorNode` never resolves to it again (§4.1.3's own replay note agrees). The interstitial clock is checked exactly as normal (F25's cadence is time-only and node-agnostic) — but **no map gift, and no Twin Gift/rewarded offer**, on either outcome. This reconciles F25's "rewarded after every duel" with C24's "no rewards" for replays: the interstitial is a monetisation break unrelated to node type and still fires on schedule; the rewarded offer is a *reward* and is exactly what C24 withholds. Implementers should not read F25's "every duel" as overriding C24 here — §11 should confirm this reading in its ad-sequence chapter.

#### §3.2.6 Map browsing (idle)

No scene transition at all while idle-browsing: pan and tap-node/-gift/-tent/-book are all handled inside the `map` scene per §3.3.1. The only transitions out of idle-map are: tap a playable node (→ `dialogue`, §3.2.2 step 14), tap a pending gift (→ `unbox`, §3.2.2 step 6), tap the wardrobe tent (→ `wardrobe`), tap the book icon (spellbook overlay, no scene change), tap the options icon (options overlay, no scene change). (No Rune Shrine crystal tap — removed per D3.)

### §3.3 Input disambiguation per scene

#### §3.3.1 Map (idle)

One surface, four outcomes, resolved by a single tap-vs-drag discriminator used everywhere on this scene: **movement < 12 px within 250 ms of press = tap** (resolved against whatever is under the release point); anything past that threshold is a pan, and no tap fires even if the finger ends up back over a hit-circle. This is the same numeric threshold this chapter uses everywhere a tap must be told apart from a drag (gift, node, crystal, tent), so the player learns one rule, not four.
- Tap on a node's hit-circle → §3.2.2/§3.2.5.
- Tap on a pending gift → §3.2.2 step 6.
- Tap on the wardrobe tent → `wardrobe`.
- Tap on the book icon → spellbook overlay.
- Tap on the options icon → options overlay.
- Drag anywhere else → pan, clamped to content bounds (§3.5.1).
- **No pinch, no double-tap-zoom.** The map container gets `touch-action: none` and `user-select: none`, the same treatment the shared canvas already has today (`.duel-canvas`, `GameScene.vue` L498–506) — that CSS relocates to `AppScene.vue` under §4.1.2's refactor; reused here, not reinvented.
- No wipe input is EVER read on this scene. Wiping only exists inside the `wipe` scene (§3.3.2). This is the resolution to the map/wipe/pan gesture collision the GDD's own wording invites.

#### §3.3.2 Wipe scene

Camera-locked the instant the zoom-in starts (§3.2.2 step 9): pan and pinch handlers are detached, not merely ignored, so a drag is unambiguously a wipe stroke from the first frame. The only OTHER live control is the exit icon (§3.3.5). §8 owns the stroke-to-grid mechanics; this chapter owns the fact that nothing but a wipe stroke and the exit icon receive input here.

#### §3.3.3 Dialogue

Tap-anywhere-to-advance, **600 ms minimum dwell** per bubble (C12), no maximum. Two icons float above the bubble area, opposite corners: the map-affordance (top-left, always present) and the skip icon (top-right, present only once `hasBit(S.campaign.dialoguesSeen, nodeId)` is already true, §4.5.1). Neither icon's tap is mistaken for the advance-tap because they sit outside the bubble's own hit area and carry their own 56 px targets (§3.4).

#### §3.3.4 Twin Gift press-and-hold

A fourth gesture, distinct from tap/drag/pan: **press-and-hold for 1.2 s** (C8's number), with a filling ring/glow as feedback from 0 to 1.2 s. Per D3 (2026-09-18), this offer now appears only on a win, on the idle `map` right after that sector's reveal, beside the just-restored sector (§3.2.2 step 13a) — never on a loss, since a loss has no restored sector to bloom (§3.2.4). Moving the finger more than 12 px during the hold cancels it (progress resets to 0, must restart) — this is the same 12 px discriminator as §3.3.1, reused so a trembling hand doesn't accidentally cash in the gift while trying to just look at it. A release before 1.2 s does nothing (not treated as a failed tap, no error feedback — just the ring receding). The payload is a permanent cosmetic bloom of that sector — extra animated critters/flowers plus a gentle sparkle, through the existing capped prop system — no coins, no rank, no power, no progress (D3 supersedes F25's coin payload; the story build has no currency); one bloom per sector, ever, 50 at most.

#### §3.3.5 Wipe-scene exit / wardrobe close / dialogue map-jump ("back")

One consistent icon, one consistent corner, everywhere it appears: **top-left, 56×56 px minimum**, `aria-label="{{ t('a11y.backToMap') }}"` — one i18n key (M24), the same key at every call site rather than per-scene literal strings, propagated to all 21 locales by §10. Tapping it in `wipe` commits the current coverage grid (§C9's persistence already tolerates a partial stroke) before the 400 ms zoom-out; tapping it in `wardrobe` or from `dialogue`'s map-jump just transitions, nothing to commit.

#### §3.3.6 Wardrobe

Tap an item on its hook/shelf → Aurora wears it immediately (no confirm step — equip is reversible by tapping any other item in the same slot, or the slot's own "none" ghost outline to unequip). Drag from shelf to Aurora also works (C17), resolved by the same 12 px discriminator: a press that moves >12px before release is a drag-to-equip, anything under that is a tap-to-equip. Both land on the identical result, so there is no wrong way to do it.

The drag surface (every item's hook/shelf image and Aurora's own drop target) gets the same `touch-action: none; user-select: none; -webkit-user-drag: none` treatment the canvas already carries (M27) — the first two by the same precedent as §3.3.1's map container; `-webkit-user-drag: none` is the addition specific to this scene, since these are the first draggable IMAGE elements in the app and Safari's native image-drag would otherwise fight the drag-to-equip gesture.

#### §3.3.7 Options — promoted to a global overlay

Today `OptionsModal.vue` is reachable only from the duel's gear icon. It is promoted to reachable from **every** scene (`map`, `dialogue`, `unbox`, `wipe`, `wardrobe`, `duel`, `versusSetup`) via the same bottom-left icon convention (§3.4), because sound/language/haptics are not duel-specific concerns and a player should never have to re-enter the duel just to mute it. No structural change to `OptionsModal.vue` — only more call sites.

#### §3.3.8 Leaving a duel mid-fight ("map button")

This is **not** a fifth always-on icon. On a 320 px-wide portrait phone the existing bottom bar (`DuelHud.vue`'s `.port-bottom`) already holds four elements — gear · CAST · book · mute — and the arithmetic doesn't have room for a fifth 56 px icon without starving CAST, the single most important button on the screen: at 320 px width minus ~20 px of insets and three 48 px icons plus gaps, CAST is already down to roughly 130–150 px before any change. Instead: `OptionsModal.vue` gains one new footer action, labelled `t('options.leaveDuel.label')`, visible only while `S.phase === PH_DUEL` (hidden on every other scene's Options call, where there is no duel to leave). Tapping it swaps the modal's title to `t('options.leaveDuel.title')` and its body to a one-line confirmation, `t('options.leaveDuel.body')`, with two `FButton`s labelled `t('options.leaveDuel.confirm')` / `t('options.leaveDuel.cancel')` — reusing `FModal`/`FButton` exactly as they exist today, no new chrome invented; all five keys are new (M24), added by §10, propagated to all 21 locales. **Confirm** ends the duel with no win, no loss, no gift, and returns to idle `map` at the last pan offset; **Cancel** returns to the options body. Whether an abandoned duel should still increment `S.campaign.lossStreaks[String(nodeId)]` (§C13's Dream Dust input, §4.4) is §6's call — this chapter fires a `duel_abandon {nodeId, wasReplay}` telemetry event either way (§3.13, registered in §7.13) so it can be answered from data.

#### §3.3.9 Spellbook / Escape key

Existing precedent kept and extended: `Escape` closes the topmost open overlay (spellbook, options, its nested leave-duel confirm) and never navigates a whole scene back — that stays the back-icon's job (§3.3.5). Desktop mouse-drag parity for panning the map and for wiping matches the existing precedent for drawing: the same `PointerEvent` path serves mouse, touch and pen identically, and — same as today's drawing — there is no separate keyboard path for either.

### §3.4 Touch targets

One floor, applied everywhere new in this chapter, plus one fix to existing chrome:

| Element | Minimum | Target | Note |
|---|---|---|---|
| Map node hit-circle | 64×64 css px | — | ≥24 px gap between adjacent hit-circles |
| Gift / Twin Gift | 64×64 css px | — | the burst/hold area, not just the visible wrap art |
| Wardrobe item thumbnail | 56×56 css px | 64×64 css px | ≥20 px gutter between adjacent thumbnails |
| Back / skip / map-jump / options / book icons (every scene) | 56×56 css px | — | see the fix below for the two icons that don't currently hold this in landscape |
| Leave-duel confirm buttons | 56×48 css px each | — | ≥12 px gap, reusing `FButton`'s existing sizing plus this floor |
| Spellbook rune-reference glyphs (§3.9) | 48×48 css px | — | decorative-adjacent, slightly smaller floor is acceptable since they're not the primary action |

**Fix to existing chrome, evidence-based:** the landscape duel HUD's icon buttons are laid out in STAGE units and scaled by `vs = min(w/1280, h/720)` (`layout.ts` L72). On a small landscape phone — e.g. a 667×375 CSS viewport, `vs ≈ 0.521` — the options/mute icon boxes (`DuelHud.vue` `box(39.5, 599.5, 95, 79)` / `box(1145.5, 599.5, 95, 79)`) render at **≈49.5×41.2 css px**, and the CAST plate (`box(467.5, 593.5, 345, 85)`) at **≈179.7×44.3 css px** — all three below this chapter's 56 px floor, and the icon buttons dip below the 44 px accessibility floor too. The fix does not touch stage coordinates or the signed-off look: add `min-width: 56px; min-height: 56px` to `.icon-btn` and `min-height: 56px` to `.cast-btn` in `DuelHud.vue`'s scoped styles, so the CSS hit-box floors independently of `vs` while the visual plate still scales with the stage art above that floor. Flagged for the Architect/Tech-artist owners of that file to confirm it doesn't visually collide with neighbouring plates at the smallest supported viewport (320×658 landscape-rotated, i.e. 658×320).

### §3.5 Layouts

All new scenes are fit to the viewport the same way the duel already is (`layout.ts`'s `computeLayout` pattern: a virtual box, a `min(w/VW, h/VH)` scale, centred or pinned, safe-area insets read via the existing `readInsets()`), not a new technique — restated per scene below only where the numbers differ.

#### §3.5.1 Map

A virtual "page" per chapter: `PAGE_W = 1600`, `PAGE_H = 900` (landscape units), holding that chapter's 5-node winding path and (from the chapter it unlocks onward) the wardrobe tent. Ten pages laid end to end, plus one fixed **hub anchor** before chapter 1 (§3.5.5).
- **Landscape:** pages pan along X, hub anchor leftmost, then chapter 1 through 10. Fit scale `ms = min(w/PAGE_W, h/PAGE_H)`. Pan offset clamps to `[0, (hub width + 10·PAGE_W)·ms − w]`. Chapter 1 is left of chapter 2, fixed regardless of locale (§3.11 — RTL does not mirror this axis).
- **Portrait (≥320×658):** pages transpose to `PAGE_W_PORT = 900`, `PAGE_H_PORT = 1600`, stacked along Y, hub anchor topmost, then chapter 1 at the top of the chapter run down to chapter 10 at the bottom (a top-to-bottom reading order — this chapter's own call, not fixed by any ruling; unlike the horizontal axis, a vertical stack has no L/R reading-direction conflict with RTL locales, so this needs no per-locale variant). Fit scale `ms = w / PAGE_W_PORT`; pan clamps accordingly.
- Only the current chapter ±1 has resident art (§C29); pages further out still occupy correct pan-offset space via a lightweight bounding placeholder (a flat silhouette, §3.7), so pan physics are correct before their real art streams in. The hub anchor is always resident (§3.5.5) — it's exempt from the ±1-chapter streaming rule since it's one small object, not a chapter's worth of art.
- **Removed entirely per D3 (2026-09-18):** the story build has no currency, so there is no coin jar and nothing for it to fill. **The Rune Shrine that used to be the ONE object at the hub anchor (§3.5.5) is also removed** — the hub anchor remains this chapter's fixed pan-position slot before chapter 1 regardless of what, if anything, occupies it; what (if anything) replaces the shrine there is §8/§9's call, not this chapter's. (Historical, for provenance only: the previous draft placed an omnipresent coin jar as fixed chrome visible from both the idle map and the wipe view per §8.9, and the Rune Shrine as the hub anchor's one object — both removed per D3.)

#### §3.5.2 Wipe scene

Not a new virtual box — a locked, zoomed FRAMING of one sector inside the SAME map canvas/coordinate space, so the 400 ms zoom transition (§3.2.2 steps 9/13) is a camera move, not a scene swap, even though `wipe` mounts its own DOM-overlay file (`WipeScene.vue`, §3.1/M10). Landscape: fills the full viewport width, tool-in-hand UI (§8's) anchored bottom-centre, back icon top-left. Portrait: fills full width below the safe-area top inset, same back icon placement. Exact framing (how much of the sector is visible, brush cursor, dust rendering) is §8/§9's; this chapter fixes only that pan/pinch are detached (§3.3.2) and that exit always returns to the exact pre-entry pan offset (§3.2.2 step 13).

#### §3.5.3 Dialogue

Landscape: speaker portraits fixed left (Aurora/the player's side) and right (foe/Guardian/narrator), matching the duel's own fixed left-right cast convention (§C19, §C26/§C31) — dialogue never mirrors this even in RTL. Bubble anchored above/beside whichever side is speaking, max-width **45 % of viewport width**. Portrait: portraits shrink to a top strip, bubble max-width **86 % of viewport width** (on a 320 px-wide minimum, ≈275 px). Text renders in the new `.story-text` style (C12; `.ink-text` stays chrome-only per F22's `white-space: nowrap` finding — a NEW style, not a fix to the old one, because `.ink-text` still has other jobs).

#### §3.5.4 Wardrobe tent (diorama)

Landscape: Aurora fixed centre-left at roughly 40 % of viewport width, a horizontal scrollable shelf of slot categories (head/neck/back/companion/hoof-trail/mane-swatch/skin, §C17) filling the right ~60 %. Portrait: Aurora fixed in the upper **45 %** of the viewport, the shelf scrollable in the lower **55 %**. Slot categories are always visible (even empty ones show a ghost-outline placeholder, §3.7) so the player understands the full slot set from the first visit, per §C17's fixed slot list.

#### §3.5.5 Rune Shrine — removed (D3)

**Removed entirely (D3, 2026-09-18):** the Rune Shrine is no longer a place, object, screen or interaction anywhere in the story build — no crystal facets, no ranks, and (per D3) no coins to spend on them. It occupies no hub anchor, no map slot, and no tap target; §3.2.6, §3.3.1, §3.4 and §3.5.1 no longer reference it. §3.6, the interaction this subsection used to defer to, is likewise removed.

(Historical, for provenance only: this subsection's own correction over the previous-previous draft had replaced an earlier per-chapter model — one shrine per rune-unlocking chapter, 8 physical shrines totalling 12 facets, withdrawn per §8.1/§8.9's "No per-chapter Rune Shrine" rule — with exactly ONE shrine holding all 12 crystal facets at a single hub anchor, locked-silhouette per unrevealed rune, each facet a 64×64 px tap target. All of it — the one-shrine model and the per-chapter model it replaced — removed per D3.)

#### §3.5.6 Spellbook

See §3.9.

#### §3.5.7 Duel-HUD deltas

- **Book icon**: un-flag `SPELLBOOK` (`src/game/duel/config.ts` L163) — it is on unconditionally in the story build (§C16). The icon and its wiring in `DuelHud.vue` (L159–164 landscape, L207 portrait) already exist and need no layout change, only the flag removal and the sparkle-cue treatment (§3.9).
- **Map button**: not a new HUD icon — see §3.3.8. `DuelHud.vue`'s icon row is otherwise unchanged.
- **12-rune slot glyphs**: the in-duel rune QUEUE stays **3 slots per side** (`MAX_RUNES = 3` unchanged — this chapter assumes §6 does not raise it; nothing in the rulings says otherwise). `RuneSlot`/`RuneGlyph` already take a `rune: number` prop and pull colour from `RUNES[rune]` (`RuneGlyph.vue` L23), so all 12 rune ids render through the SAME slot boxes once `RUNES` (`config.ts`) grows to 12 entries — a §5/§9 data change, not a HUD layout change. What this bullet actually requires of the HUD: none of the existing slot geometry (`box(30 + i*64, 80, 60, 60)` etc.) changes; only the data behind it grows.
- Touch-target fix: §3.4's `min-width`/`min-height: 56px` addition to `.icon-btn`/`.cast-btn`.

### §3.6 Rune Shrine interaction — removed (D3)

**Removed per D3 (2026-09-18):** there is no shrine, no facets, and no coins — nothing left here to interact with. §3.5.5 carries the same removal.

(Historical, for provenance only: the previous draft had tapping a facet flow coins from the jar to brighten a rank one step, capped at rank 5 against a `rankPrice` (§7/§C4/§8.9), with a gentle "not yet" refusal chime when unaffordable and no confirmation step either way — all removed per D3.)

### §3.7 Empty and loading states

Nothing in this chapter's scenes performs a network fetch; every asset follows the project's existing "instant procedural fallback, never a spinner" contract (`src/game/art.ts`, `art-style.md`) — restated here as binding for the NEW surfaces, not a new mechanism:
- **Map, chapters beyond current+1:** rendered as a flat, low-detail silhouette placeholder (no art fetch, no blank void) until the player is within one chapter of them, at which point resident art (§C29) replaces it in place.
- **Wardrobe, before the first cosmetic unlocks:** the tent object itself is simply absent from the map (not a greyed/locked icon) until the chapter-1 boss grants the first item — presenting a promise before there's anything to redeem invites a "why won't this open" moment for a pre-reader.
- **Wardrobe, after the first unlock:** every slot category is visible; owned slots show the item, unowned slots show a ghost-outline placeholder (never blank), so the player understands the full slot set exists.
- **Spellbook, fresh save:** the four frozen runes' reference glyphs render fully; every higher rune shows the SAME locked-silhouette treatment as a locked map node (§3.4/§3.8), so scale is visible from minute one rather than discovered piecemeal.
- **Map node hit-circles beyond the current chapter's boundary:** simply not rendered as tappable — a silhouette placeholder per the chapter-level rule above, not an individually-locked node state (locked/current/completed, §3.8, only applies within the current chapter ±1 window where nodes are actually resident).

### §3.8 Node visual states (map)

Carried forward from Round 1, unopposed by any ruling, and now the canonical spec:
- **Locked** (chapter not reached, or a later node in a resident chapter): silhouette at ~35 % opacity, not tappable — a tap plays a small shake, no navigation, no toast.
- **Current** (the next playable node): full colour + a breathing glow ring, reusing `.breathe` (`DuelHud.vue` L286–289) rather than inventing a new pulse.
- **Completed**: full colour + a small checkmark/sparkle badge, tappable for replay (§3.2.5).
- Hit target and spacing: §3.4.

### §3.9 Spellbook and wardrobe interaction flows

#### §3.9.1 Spellbook (§C16)

Opens from the book icon on the duel HUD (existing wiring, un-flagged) **and** a matching book icon on the map (new, 56 px, corner TBD by §9's map chrome layout — this chapter only requires it exists and matches the HUD icon's target size). Both call sites just call `openOverlay('spellbook')` (§4.1.2) — since spellbook is one of the two `OverlayId`s the FSM already tracks centrally (M10), the `acquireModalOpen()`/release pairing lives in ONE place (wherever `flow.overlay`'s transitions are watched, §4's call), not per call site — the previous draft's flagged duplication risk (each scene hand-rolling its own pairing, mirroring `GameScene.vue`'s old inline `setBook`) is resolved by this architecture, not left open.

Content, re-laid-out for scale (the existing `SpellBook.vue` fixed 3-column absolute-position grid, sized for 22 entries, does not hold at the "hundreds of combos, mostly generator-named" scale §6.2/§10.12 imply):
1. A **sticky reference strip** at the top: all 12 rune glyphs (frozen four + unlocked-so-far), each 48×48 px minimum, tap = a short trace-demo animation of that rune's stroke. Locked (not-yet-unlocked) runes show the same silhouette treatment as a locked map node.
2. Below it, a **scrolling list**, grouped by rune-count section headers (1 / 2 / 3, per §C16), each row ≥48 px tall with ≥8 px separation. Known entries show their glyphs + generated name (§C15); unseen-but-reachable entries show "? ? ?" (existing `book.unknown` string, `SpellBook.vue` L45); entries not yet reachable with the player's current rune set are omitted entirely (§C15's own scoping rule), not shown as locked — the list only ever grows, never shrinks or re-shuffles.
3. The soft-sparkle "new" cue (§C16, replacing a red dot): shows on both book icons whenever an unseen reachable combo exists, and on that entry's row; clears when the row has been scrolled into view for **≥1 s** (this chapter's number — long enough to register as "seen", short enough not to require a deliberate stare).

#### §3.9.2 Wardrobe (§C17)

1. Tap the tent on the map → `wardrobe` scene, 400 ms zoom/transition (same treatment as the `wipe` scene's entry, §3.2.2 step 9, for visual consistency between the map's two "step inside" moments).
2. Aurora stands in her fixed position (§3.5.4); tap or drag an item from its slot's shelf (§3.3.6) → she wears it immediately, no confirm.
3. **Admire moments** (§C17): shown automatically (not player-invoked) in two cases — the FIRST time a newly-unlocked item is equipped (right after a boss win's gift chain, before the player has manually opened the wardrobe at all, folded into §3.2.3's boss win-loop as an extra beat between reveal and the idle map), and as a close-up on every boss win generally (the "victory close-up" whether or not a new item unlocked that chapter). Manually re-entering the wardrobe later never re-triggers an admire moment automatically — that would turn a trophy beat into a nag.
4. Back icon (§3.3.5) returns to the map at the pan offset the tent was opened from.

### §3.10 Interruptions per scene

Every scene routes through the SAME `isGamePaused` computed (`useGamePause.ts`: `isAdShowing || isVisibilityHidden || isPlatformPaused || isAppPaused`) — no scene invents its own pause check. What each scene does with that signal:

| Scene | Ad shown | Tab hidden | Platform pause | Orientation change |
|---|---|---|---|---|
| `duel` | existing behaviour, unchanged (sim freezes, `S.dt=0`) | same | same | existing `resize()`/`applyLayout` re-fit, unchanged |
| `dialogue` | the bubble dwell timer and the skip-icon reveal timer both gate on `isGamePaused` via a new shared composable (assume `src/use/usePausedTimer.ts`, new file) rather than a raw `setTimeout` — mirrors the duel loop's own `S.dt = 0` gate | same | same | bubble/portrait layout re-fits; no state lost, dwell timer resumes from where it paused |
| `map` (idle) | ambient looping animation (sector bloom sparkle, tent flag, sector idle motion) pauses via CSS `animation-play-state` bound to `isGamePaused` — nothing gameplay-critical ticks here regardless | same | same | pan offset re-clamped to the new viewport's bounds (§3.5.1); nothing lost |
| `unbox` | the colour-me pick's **4 s** auto-pick timer (§8.7, §3.2.2 step 8) gates on `isGamePaused` via the SAME `usePausedTimer.ts` composable as `dialogue` — an ad or a hidden tab must not silently auto-pick pot 1 for the player | same | same | choreography re-fits; the 4 s window resumes from where it paused, never restarts from 0 |
| `wipe` | pointer handlers early-return while `isGamePaused` — exactly the `blocked()` pattern `GameScene.onPointerDown` already uses (L122) — so a finger dragging under a mobile browser's touch-passthrough during an ad transition cannot register extra wipe cells | same | same | **`wipeCoverage` is resolution-independent (§C9's 24×14 bitstring)**: a rotate re-renders the same grid at the new screen-to-cell mapping, never resamples or resets it. This is the concrete mechanism that satisfies "wipe progress must survive an orientation change" |
| `wardrobe` | already a blocking modal via `acquireModalOpen` — no new wiring | same | same | diorama re-fits per §3.5.4's percentages, equip state (in `S.campaign`) is unaffected |

A new telemetry event, `wipe_interrupted {sector, pctAtInterrupt, reason}` (reason ∈ ad/tab-hidden/platform/modal), fires whenever `isGamePaused` flips true while the `wipe` scene is open — this verifies the "progress must survive" contract in production telemetry, not only in a test (§7 consumes it). Distinct from §7's own `wipe_complete` event (§C-M7) — this one fires on interruption, that one on a clean finish.

### §3.11 RTL, reduced motion, colour-blind rules

**RTL (§C19, ratified):** the map's horizontal pan axis (landscape) stays fixed LTR — chapter 1 leftmost — in every locale including Arabic, matching the duel's own `dir="ltr"` lock and its stated reason (a fixed cast never mirrors). Only in-world TEXT flows RTL per locale: dialogue's `.story-text` (§3.5.3), any map labels. Dialogue speaker portraits keep the duel's fixed left/right cast identity (§C26/§C31) and are NOT mirrored in RTL — Aurora is always on the reader's left, exactly as in the duel. The portrait vertical map axis (§3.5.1) has no L/R reading-direction concept and needs no RTL variant.

**Reduced motion:** read `prefers-reduced-motion` as a default; add an explicit toggle to `OptionsModal.vue`'s general tab (new `FSelect`, same on/off pattern as the existing haptics control, L109–115) — `options.reducedMotion`, a new i18n key (propagated to all 21 locales per project convention). When on: ambient/idle animation (map sparkle drift, wardrobe idle bob, breathing pulses on locked/current nodes) caps to a single settle rather than a continuous loop; the ONE-SHOT reward beats that ARE the point (wipe reveal, gift unbox, Twin Gift bloom, admire moments) stay at full motion — muting those would mute the reward itself.

**Colour-blind:** the binding rule from Round 1, restated as this chapter's requirement for every new surface — **a colour never carries meaning alone; a shape or glyph rides beside it.** Concretely: the eight mane swatches (§C17) each carry a small distinct micro-glyph baked into the thumbnail (exact icon set is §9's), not hue alone; map sector dust-vs-restored is a saturation/brightness swing, already colour-blind-safe by construction, no change needed there. (Historical, for provenance only: the previous draft also specified a Rune Shrine rank pip-count badge alongside brightness — removed per D3, the Rune Shrine no longer exists.)

### §3.12 The 2P split layout (§C18, stage S5)

- **Landscape, ≥900 css px wide:** the viewport splits at its vertical centreline into two independent duel HUDs. Each half is fed into the EXISTING `computeLayout` (`layout.ts`) as its own sub-viewport (`w = viewport.w / 2, h = viewport.h`) — reusing the fit math, not inventing new layout code. Player 1 (left half) plays the existing left-side (Aurora) fields; Player 2 (right half) plays the existing right-side `e*` fields per §C18's ruling, but VISUALLY their half is a full, symmetric mini-HUD (their own CAST button, their own rune slots, their own book/options reachable per §3.3.7/§3.9.1) — not a mirrored, cut-down "foe view".
- **Below 900 css px (all portrait phones, narrow landscape):** the mode is not offered. Tapping the map's "Versus" affordance still transitions to `versusSetup` (§4.1.3), but that scene shows a rotate-icon prompt ("turn your device sideways, and make it wider") in place of the side-select UI, rather than falling back to pass-and-play (explicitly rejected, §C18).
- **Per-pointer routing:** `pointerId → side` decided on first contact per stroke, by which half of the CSS viewport the `pointerdown` landed in (not stage coordinates, so routing is known before either half's transform is resolved) — this chapter's assumption; §4/§6 own the actual routing table and should confirm this is where they'd want the split decided.
- **Touch targets in the split:** each half is effectively a ~450 px-wide (at the 900 px floor) portrait-shaped mini-HUD. Apply the SAME 56 px icon/CAST floor as §3.4 — never lower, even under horizontal squeeze. If 56 px can't be held at the 900 px floor for BOTH halves' full icon row, the fit math must shrink the stage window before it shrinks a button, the same priority rule §3.4's landscape fix already establishes for the single-player HUD.

### §3.13 Numbers this chapter sets, and how they get tuned

| Number | Value | Tuned by |
|---|---|---|
| Map tap-vs-drag threshold | 12 px / 250 ms | `map_mistap {targetId, dx, dy}` (new event, fires on any tap landing within 40 px of a hit-circle but outside it) — §7/§12 raise the 64 px target if near-misses are common |
| Map node / gift hit target | 64×64 css px, ≥24 px gap | as above |
| Wardrobe thumbnail | 56 px min / 64 px target, ≥20 px gutter | kid playtest (§12) |
| Icon/CAST CSS floor (all scenes) | 56 px min-width/min-height | fixes a measured regression on small landscape phones (§3.4); no further tuning needed, it's a floor |
| Page-turn / zoom transitions | 450 ms (page-turn), 400 ms (wipe-scene zoom in/out), 250 ms (node push-in), 300 ms (dialogue→map jump) | §12's playtest for "does it feel laggy / does it feel rushed" |
| Twin Gift press-and-hold | 1.2 s (§C8), cancel at 12 px movement | kid playtest — confirms toddlers don't trigger it by accident, confirms older kids don't find it annoying |
| Spellbook "new" cue clear | row visible ≥1 s | §12 |
| 2P split threshold | ≥900 css px (§C18) | none needed, ratified |
| Reveal choreography (freeze + sweep) | 550+420 ms standard / 650+850 ms boss (§8.6, cited not invented) | §12 kid playtest: does the freeze read as a pause or a stall |
| Colour-me auto-pick | 4 s idle (§8.7) | §12 |
| `duel_abandon` telemetry | fires on every accepted leave-duel confirm | §6/§7 use it to decide whether abandons affect Dream Dust |
| `wipe_interrupted` telemetry | fires on every `isGamePaused` transition while `wipe` is open | §7 verifies the survive-an-interruption contract in production |


---

## §4 Architecture & save

Scope: the scene FSM and its owner module, the real module layout, the
typed data tables, `S.campaign`'s shape, the persisted field list, the
Step-1 migration, the event flow, the gameplay-bracket contract (re-anchored
to the owner's F25 ads pass), code-splitting, feature flags, QA hooks, and
the test plan. Everything here is checked against the repo at `78b0041`
plus the uncommitted ads pass (F25) in `src/use/useAdGate.ts`,
`src/views/GameScene.vue`, `src/use/useQaAdTrigger.ts`,
`src/use/ads/DevAdProvider.ts`, `src/platforms/resolveAdProvider.ts`.

### §4.0 Non-goals

- **No `vue-router` per scene.** `src/router/index.ts` keeps its one real
  route. Reopening address-bar-driven routing reopens the 2026-09 Playables
  rejection its own comment documents. [S2]
- **No second mutable duel-state object.** `S.campaign` nests inside
  `auroras_magic_state` (C28). Nothing outside `src/game/duel/state.ts`
  gets its own top-level `am_*` blob. [S2]
- **No per-cell coverage grids in the save**, ever, beyond the ONE
  in-progress sector C9 allows. [S1]
- **No branching campaign graph.** Nodes are a flat, linear sequence of 50
  (§4.3). Skipping, branching or reordering nodes is not built. [S2]
- **`WILD` is not a live fallback once the generator (§4.3.1) ships.** It
  stays in `config.ts` only as a defensive catch for a data bug, never an
  intentionally-reached spell. §6 owns confirming no combo is ever
  legitimately unresolved.

### §4.1 Scene FSM

#### §4.1.1 Scene ids

```ts
// new file: src/game/flow/scene.ts
export type SceneId =
  | 'boot' | 'map' | 'dialogue' | 'duel' | 'unbox' | 'wipe'
  | 'wardrobe' | 'versusSetup'
/** Modal overlays. Stack on top of whatever SceneId is current; do not
 *  replace it. Existing pattern (`S.book`, `optionsOpen`) generalises. */
export type OverlayId = 'options' | 'spellbook'
```

This enum is canonical (M10) — §3 and §11 cite these eight names verbatim,
not `'restore'`, not a sixth/seventh scene of their own invention.

**Node identity is numeric, everywhere at runtime.** `FlowState.node`
(§4.1.2), `CampaignState.furthestNode` (§4.4) and `NodeDef`'s own array
position (§4.3, "a node's identity IS its position, 0..49") are all the
same plain `number`. A slug exists ONLY to build an i18n key, never as a
runtime id, never typed as a save field, never passed to a QA hook:

```ts
// src/game/campaign/tables.ts
export const nodeSlug = (n: number): string =>
  `c${nodeChapter(n) + 1}n${nodePosInChapter(n) + 1}` // 'c1n1'..'c10n5', i18n keys only
```

§3's `pendingGift`/`resume` fields and §11's `w.__gotoNode` must therefore
type their node parameter as `number`, not `string` (I-25) — there is no
second, string-shaped node id anywhere in this schema.

Two simplifications versus the GDD's own loop wording, made in this lane and
flagged for confirmation:
- **No separate `gift` scene.** The gift visibly dropping into the arena
  (C8) is a beat inside `duel`'s win flourish, not a scene switch. The gift
  then sits as a tappable decoration ON the `map` scene until unboxed. §3
  (UX) and §8 (Cozy) should confirm this reads right visually.
- **No separate `reveal` scene.** The reveal (dust gone, landmark colours
  in) is the tail animation of `wipe`, ~1.5 s of auto-play after the 85 %
  threshold (C25's idle grace), then an automatic transition to `map`. §8
  confirms the animation budget.
- **`versusSetup`, not `versus`.** [S5] Per C18, the fight itself reuses the
  `duel` scene and `S`'s existing fields (player 2 drives `e*`). The only
  new scene is the pre-fight side-select/ready screen. `duel` carries a
  `mode: 'campaign' | 'versus'` field in `FlowState` (§4.1.2) rather than
  forking into a second fight scene.

#### §4.1.2 Owner module and state shape

**`flow` is NOT a second mutable object (M11, correcting Round-2's first
draft).** It nests as `S.flow` — a new field on `DuelState`
(`src/game/duel/state.ts`), so every piece of mutable state the app has
still lives inside the one `auroras_magic_state`-rooted object, per the
playbook's "ALL state variables in one object" rule and per C28's own
wording, which this chapter's first draft under-read as "persisted state
only." `S.flow` is excluded from `save()`/`load()`'s field lists exactly
the way `S.pts`, `S.shots` and `S.draw` already are — non-persisted, but
still part of `S`, not a sibling of it.

```ts
// src/game/duel/state.ts — DuelState gains one field
import type { FlowState } from '@/game/flow/scene' // type-only: erased at
// compile time, so this does not create a runtime cycle with scene.ts's
// value import of `S` below — TypeScript/Vite both special-case a
// type-only import for exactly this reason.
export interface DuelState {
  // … every existing field, unchanged …
  flow: FlowState
}
```

```ts
// new file: src/game/flow/scene.ts — types and mutators only; the state
// itself lives on S (imported from '@/game/duel/state'), never duplicated.
export type SceneId =
  | 'boot' | 'map' | 'dialogue' | 'duel' | 'unbox' | 'wipe'
  | 'wardrobe' | 'versusSetup'
export type OverlayId = 'options' | 'spellbook'
export interface FlowState {
  scene: SceneId
  /** 0..49, the node a dialogue/duel/unbox/wipe scene concerns. -1 outside
   *  those scenes (map, wardrobe, versusSetup, boot). */
  node: number
  mode: 'campaign' | 'versus'
  overlay: OverlayId | null
  /** Session-only map camera offset, read/written by `MapScene.vue`
   *  (§3's territory for the pan gesture itself). Never persisted, never
   *  read outside the map/wipe render path — added here, not on
   *  `CampaignState`, per I-15: pan is view state, not save state. */
  mapPan: { x: number; y: number } | null
  /** True from the first trusted gesture this session onward (R-1). Lives
   *  on `S.flow`, not as a bare module `ref`, for the same reason `scene`
   *  does: `reconcileGameplayBracket()` (§4.9.2) reads every one of its
   *  seven inputs off `S`/`S.flow` with no parameter list, and a value
   *  that lived anywhere else would be the one input it couldn't see. */
  armed: boolean
}
export const DEFAULT_FLOW: FlowState = { scene: 'boot', node: -1, mode: 'campaign', overlay: null, mapPan: null, armed: false }

import { S } from '@/game/duel/state'
import { reconcileGameplayBracket } from '@/game/flow/bracket' // §4.9.2

/** THE state-machine entry point (M12): every scene switch, including a
 *  same-scene re-entry (a duel retry), goes through this function, and
 *  this function is what tells the portals gameplay's window moved — never
 *  a `watch()` on a value derived from it. */
export const gotoScene = (scene: SceneId, node = -1, mode: 'campaign' | 'versus' = 'campaign'): void => {
  S.flow.scene = scene
  S.flow.node = node
  S.flow.mode = mode
  reconcileGameplayBracket()
}
export const openOverlay = (o: OverlayId): void => { S.flow.overlay = o; reconcileGameplayBracket() }
export const closeOverlay = (): void => { S.flow.overlay = null; reconcileGameplayBracket() }
/** Called once, by `AppScene.vue`'s `wake()`, on the first trusted gesture
 *  (R-1). Idempotent — a second call is a no-op past the first `true`. */
export const arm = (): void => {
  if (S.flow.armed) return
  S.flow.armed = true
  reconcileGameplayBracket()
}
```

A thin reactive mirror (`flowHud`, mirroring `useDuelHud.ts`'s `hud` pattern
exactly — copy-out-on-change, no dependency tracking on `S.flow` itself)
lives in a new `src/use/useFlow.ts` and is what the root component actually
renders from. `GameScene.vue` stops being the app root; a new
`src/views/AppScene.vue` [S2] owns the `<canvas>` (still one canvas — see
§4.1.4) and switches its child by `flowHud.scene`. §4.1.5 lists exactly
which of `GameScene.vue`'s current blocks move to `AppScene.vue` and which
stay behind as the `duel` scene's controller.

#### §4.1.3 Transition table

| From | Trigger | To | `mode` | Scope |
|---|---|---|---|---|
| `boot` | save loaded; §4.7 resolves the resume point | `map` \| `dialogue` | campaign | S2 |
| `map` | tap a pulsing node | `dialogue` (node) | campaign | S2 |
| `map` | tap a pending gift on a sector | `unbox` (node) | campaign | S2 |
| `map` | tap the wardrobe tent | `wardrobe` | — | S4 |
| `map` | tap the "Versus" affordance [S5] | `versusSetup` | — | S5 |
| `dialogue` | last bubble advanced (or the whole beat skipped, C12) | `duel` (node) | campaign | S2 |
| `duel` | win: flourish → gift-drop → interstitial-if-due (§4.9) → page-turn | `map` | — | S2 |
| `duel` | loss, player taps "map" | `map` | — | S2 |
| `duel` | loss, player taps "retry" | `duel` (same node) | campaign | S2 |
| `duel` | (versus) either side's HP hits 0 | `versusSetup` | — | S5 |
| `unbox` | burst animation completes (~1 s, no input); `onUnboxComplete(node)` (§4.8.1, R-1b) runs first | `wipe` (node) | — | S1 |
| `wipe` | 85 %+coverage — or §8.6's graceful finish — and the 1.5 s idle grace elapses (C25); reveal plays out | `map` | — | S1 |
| `wardrobe` | tap "done" / back affordance | `map` | — | S4 |
| `versusSetup` | both sides ready | `duel` | versus | S5 |
| `versusSetup` | back affordance | `map` | — | S5 |
| any scene | options gear | overlay `options` (scene unchanged underneath) | — | S2 |
| `duel` \| `map` | book icon, `SPELLBOOK` on (§4.11) | overlay `spellbook` | — | S3 |

Replay (C24): tapping an already-cleared node on the map goes `map` →
`dialogue`(skippable, C12) → `duel`(node, no reward flag set, §4.6) → on
win or loss, straight back to `map` — no gift, no unbox, no wipe, because
`sectorsDone` for that node is already `true` (§4.5.2's derivation).

Every row in this table, including `duel`→`duel` "retry," is a real call to
`gotoScene()` — retry is modelled as a same-scene re-entry, not a special
case, specifically so the bracket-reconciliation call inside `gotoScene`
(§4.1.2, §4.9.2) fires uniformly for it too.

#### §4.1.4 One canvas, still

`AppScene.vue` keeps ONE `<canvas>` for every scene that draws a world
(`map`, `dialogue` — bubbles are DOM over the map canvas — `duel`, `unbox`,
`wipe`, `versusSetup`); `wardrobe`'s tent diorama and the two overlays are
DOM/Vue, same split the duel already uses (canvas world, Vue chrome).
Reusing one canvas avoids a context-loss/re-init cost on every scene switch
and keeps `resize()`/`toStage()`/DPR handling in one place. `render(g)`
dispatches on `S.flow.scene` to the right module's draw function; each
scene module owns its own bake/cache lifecycle the way `arena.ts` does
today.

**`wipe` is not its own renderer (M10).** It draws through `src/game/map/`'s
own render function, called in a "restore mode" (zoomed, camera-locked per
C6) rather than its idle-map mode — one module, two modes, not two
renderers. Consequently `WipeScene.vue`, `UnboxScene.vue`, `MapScene.vue`,
`DialogueScene.vue` and `VersusSetup.vue` (§4.2) are **DOM-overlay
components only** — HUD chrome, buttons, bubbles, the brush-progress
ring — exactly the split `DuelHud.vue` already is over the duel's canvas.
None of them owns a `<canvas>`, a `getContext`, or any drawing call; they
mount and unmount as `S.flow.scene` changes, and the one canvas underneath
them never remounts.

#### §4.1.5 What moves from `GameScene.vue` to `AppScene.vue` (M11)

`GameScene.vue`'s current, real blocks (verified against the file as of
the F25 ads pass), and where each one lands:

| Today's block (`GameScene.vue`) | Moves to | Notes |
|---|---|---|
| `canvas` ref, `g = cv.getContext('2d', …)`, `resize()`'s canvas sizing, `onOrientation` | `AppScene.vue` | one canvas, one context, shared by every scene (§4.1.4) |
| `rafId`, the `frame(now)` loop, `STEP`/`acc`/`prev`, `S.fdt`/`S.q` adaptive quality | `AppScene.vue` | one RAF; `frame()` calls `render(g)`, which dispatches on `S.flow.scene` (§4.1.4) — the `duel` branch's own per-frame sim step (`updateSim`) is called from here only while `S.flow.scene === 'duel'` |
| `onPointerDown/Move/Up`, `onKeyDown`, the `window`/`canvas` listener registration in `onMounted`/`onUnmounted` | `AppScene.vue` | routed to the active scene's input handler by `S.flow.scene`; the `duel` scene's stroke logic (`strokeStart`/`strokeMove`/`strokeEnd`) is called FROM here, not registered by the duel controller itself |
| `wake()` (first-trusted-gesture arming) | `AppScene.vue` | arming is a whole-app concern (Poki's gesture rule applies to the FIRST scene touched, not specifically the duel); `wake()` calls `arm()` (§4.1.2), which sets `S.flow.armed` and reconciles the bracket itself — `AppScene.vue` holds no local `armed` ref of its own (R-1) |
| `load()` call in `onMounted` | `AppScene.vue`, and moved BEFORE the boot transition (I-11) | `AppScene.vue`'s `onMounted` runs `load()` (which runs `migrateToSchema2()`, §4.7) synchronously, THEN evaluates `pendingSectorNode`/`nextDuelNode` (§4.4) to call the first `gotoScene(...)`. The relocated `duel` controller's own `onMounted` never calls `load()` again — it is idempotent by construction (`migrateToSchema2` no-ops once `am_schema >= 2`) but is simply not called twice, to keep the boot sequence legible |
| `presentResult()`, `maybeShowInterstitial()`, `restart()` | a **duel controller** (`GameScene.vue`'s residual body) for the sim-facing half; the reward-offer half of the old `presentResult`/`onReward` moves further, into `useDuelRewards.ts` (§4.15, M21) | the controller still owns the win/loss BEAT (flourish/sting timing, the ad await) and, on completion, calls `gotoScene('map')` or stays via `gotoScene('duel', node)` (retry) |
| `onReward`, `rewardClaimed`, `canClaimBloom`, `rewardLive` | `src/use/useDuelRewards.ts` (new, §4.15) | shared: both the duel controller's loss beat and the map's Twin Gift call the same composable (M21); D3 retargets the payout from coins to a per-sector cosmetic bloom |
| `isLiveGameplay` computed + its `watch(...)` | **removed outright** | replaced by `reconcileGameplayBracket()` calls at each mutation site (§4.9.2); nothing watches a derived boolean any more |
| `onBuy` (rank purchase) | **removed outright** | D3: no element ranks, no Rune Shrine, no `DuelResult.vue` shop panel in the story build — `buyRank()` (removed per D3) has no call site to move |
| `w.__S`, `w.__arm`, `w.__step`, `w.__frame`, `w.__cast`, `w.__stroke`, `w.__musicOn` | stay attached where their target lives: `__S`/`__cast`/`__stroke` stay with the duel controller (they poke duel-only state); `__arm`, `__step`, `__frame` move to `AppScene.vue` (they poke the shared loop/arming) | `§4.12` adds `__flow`/`__campaign`/`__wipe` alongside these, unchanged in spirit |
| `onQaChord` (30-tap interstitial chord) | `AppScene.vue`'s pointerdown listener (capture phase, as today) | it must see every press across every scene to keep counting correctly, not just presses inside the duel |

The residual `GameScene.vue` (renamed nowhere — it stays the file name,
just loses its root-level concerns) keeps: the duel's own template (HUD,
result beat), the sim-facing calls (`resetDuel(node)`, `cast`),
and its `onDuelEvent` subscription for local effects (haptics, `track()`
calls) — everything that is genuinely ABOUT one duel, nothing that is
about which scene is showing or whether a portal thinks play is live.

### §4.2 Module layout

New, under `src/game/`:

```
src/game/flow/          scene.ts, transitions (this section)
src/game/campaign/      tables.ts (Rune/Chapter/Node/Foe/Gift/Cosmetic/
                        Dialogue/SignatureSpell defs, §4.3), state.ts
                        (S.campaign shape + accessors, §4.4), bitset.ts
                        (shared bit-packing helpers, §4.5.1), migrate.ts
                        (§4.7), controller.ts (§4.8.1)
src/game/map/           map scene: sectors, pulsing-node markers, the gift
                        decoration, camera/pan for the idle view
src/game/restore/       (M16) THE coverage grid, brush stamp and mask live
                        here — `mask.ts` (in-memory `Uint8Array` grid,
                        never persisted beyond the one bitstring §4.4
                        allows, §4.5.1), `brush.ts` (stamp). Dust
                        compositing (the actual canvas draw) is owned by §9
                        for technique; this module owns the state/percent
                        contract only (the ARCH-18 firewall: pointer events
                        write the grid directly, a per-frame sync exposes
                        `pct`). §9 must converge here, not to a
                        `game/map/mask.ts` path from an earlier draft.
src/game/cosmetics/     wardrobe: slot/equip logic (data owned by §4.4's
                        CosmeticDef; wardrobe presentation owned by §8/§3)
```

**Changed** (M13, correcting Round-2's "untouched" claim): `runes.ts`
(data-driven over `RUNES`, §4.3; a second parameter, still pure — §4.3
below), `config.ts` (rune-count constants widen 4→12; the render-colour
array renamed `RUNE_COLORS` to stop colliding with `campaign/tables.ts`'s
new `RUNES: RuneDef[]`; `CTR`'s 4-cycle widens — §6 owns the values),
`fx.ts` (`KIND_OF_RUNE` lookup replacing `(rune & 3) + 1`, §9 owns it),
`glyph.ts` (new curve branches for runes 4-11, §5 owns them),
`chars.ts`/`arena.ts` (per-chapter theme hooks, §6/§9 own them), `sim.ts`
(`resetDuel(node)`, §4.8.2; NPC rune-pool gating, §4.8.2), `state.ts`
(`DuelState` gains `flow: FlowState`, §4.1.2), `audio.ts` (R-22, correcting
this list's own prior "unchanged": it gains the wipe scrub cues, §8.5, and
the babble voice, §10.11 — both owned by §8/§10 for content, this chapter
only notes the file is no longer untouched). **Unchanged**: `render.ts`,
`layout.ts`, `util.ts`. `src/router/index.ts` unchanged (§4.0).

New views: `src/views/AppScene.vue` (§4.1.2/§4.1.5, replaces `GameScene.vue`
as the mount root), `src/views/MapScene.vue`, `DialogueScene.vue`,
`UnboxScene.vue`, `WipeScene.vue`, `WardrobeScene.vue`, `VersusSetup.vue` —
every one of these six a **DOM-overlay component only** (§4.1.4, M10): none
owns a canvas, `wipe` draws through `MapScene.vue`'s own render function in
restore mode rather than a renderer of its own.

### §4.3 Data tables

All eight tables live in `src/game/campaign/tables.ts` as flat,
append-only-ordered arrays or records, built once at module load — the same
discipline `config.ts`'s `FOES`/`RUNE_IDS` already follow. Position in an
array is a permanent id; nothing is ever reordered or removed, only
appended (or, for the fixed 50-node grid, never resized at all — the grid
is 10 chapters × 5 nodes, fixed, per C5; `NODES.length === 50` is asserted
by `tables.test.ts`, §4.13.1).

```ts
/* ── Runes ───────────────────────────────────────────────────────────── */
/**
 * ONE `RuneDef` (M13, replacing three incompatible per-chapter drafts).
 * Position IS the permanent id (0..11). Never reordered.
 */
/** R-7: `{nameId, kind, dmg, ex}` — the same shape as `config.ts`'s
 *  existing `Spell` tuple's last three fields plus a name key, so §6.3's
 *  table restates directly as this 3-tuple with no reshaping. */
export interface SpellTriple { nameId: string; kind: SpellKind; dmg: number; ex: number }
export interface RuneDef {
  id: number                 // == array index; kept for readability at call sites
  slug: string                // stable slug, i18n key under `rune.<slug>.*`
  /** 0-based chapter index whose BOSS-CHEST UNBOX grants this rune (R-1b,
   *  correcting Round-2's "chapter opener" claim — the chapter OPENER only
   *  previews the coming magic in dialogue/foe behaviour per C14's Scope
   *  rule; the rune itself, and the player's own ability to draw it, does
   *  not exist until §5.2/§11.6's unbox beat sets the bit, §4.8.1 below).
   *  Base 4 = -1 (always known, no unbox needed). */
  unlockChapter: number
  /* ── recognition fields (§5.3 owns their values; §4 only carries them) ── */
  family: 'ring' | 'open'       // closed-loop shape (templated at every start point, §5.7) vs. an open stroke
  variants: readonly (() => number[])[]  // template-point generators, §5.4's parametric shapes
  env: readonly [number, number, number, number]  // [ecMin, ecMax, turnMin, turnMax], §5.7's structure gate
  windGate?: number             // optional extra gate, §5's own per-rune tuning
  crossingGate?: number         // optional extra gate, §5's own per-rune tuning
  /* ── combat fields (§6.3 owns their values; §4 only carries them) ── */
  /** One triple per draw length: `base[0]` = solo cast, `base[1]` = the
   *  same rune drawn twice, `base[2]` = three times — the diagonal of
   *  `config.ts`'s existing '0'/'00'/'000'-style entries, generalised. */
  base: readonly [SpellTriple, SpellTriple, SpellTriple]
}
/** 12 entries, ids 0-11, per C1: 0 FIRE 1 WIND 2 ICE 3 EARTH (frozen) /
 *  4 leaf(ch0) 5 bubble(ch1) 6 spiral(ch2) 7 mirror(ch4) 8 arch(ch5)
 *  9 hourglass(ch6) 10 star(ch8) 11 heart(ch9) — each unlocked at its
 *  `unlockChapter`'s boss-chest unbox, not at that chapter's opener.
 *  Chapters 3 and 7 (0-based; "4" and "8" in the 1-based GDD table) grant a
 *  Signature Spell instead of a rune and are absent from `unlockChapter`. */
export const RUNES: readonly RuneDef[] = [ /* … */ ]

/**
 * `src/game/duel/runes.ts`'s `recognise()` becomes data-driven over
 * `RUNES` (§5 owns the matching algorithm; this chapter only fixes the
 * import boundary that I-1/I-19 found broken):
 *
 *   `recognise(raw: readonly number[], activeMask: number = FROZEN_MASK): Rune | -1`
 *
 * `FROZEN_MASK = 0b1111` is a LOCAL constant inside `runes.ts` — it is not
 * imported from `campaign/tables.ts` or read from `S.campaign`.
 * `runes.ts` has ZERO imports from `src/game/campaign/` or
 * `src/game/duel/state.ts`, exactly as today. The caller passes
 * `S.campaign.runesUnlocked` explicitly wherever unlock-gating matters
 * (`sim.ts`'s stroke handling); every existing call in
 * `tests/duel/runes.test.ts` keeps calling `recognise(raw)` with one
 * argument, unmodified, and keeps testing exactly the frozen four — the
 * default parameter is what makes that true rather than aspirational.
 */

/*
 * S0 AS BUILT (2026-09-18): the recognition half of `RuneDef` lives on the
 * DUEL side, in `src/game/duel/runeDefs.ts` (`RuneRecognition`, `RUNE_DEFS`,
 * `FROZEN_MASK`, `ALL_RUNES_MASK`). The shapes those fields describe live in
 * `src/game/duel/shapes.ts`. This chapter's text above says both "all of
 * RuneDef lives in campaign/tables.ts" and "runes.ts has zero imports from
 * campaign/", and both cannot hold. The import boundary wins.
 * `campaign/tables.ts`'s `RuneDef` therefore EXTENDS `RuneRecognition` with
 * `unlockChapter` + `base`; it does not redeclare the recognition fields.
 * Variants are `(dir: 1 | -1) => number[]`, so the four shipped runes keep
 * their exact template construction.
 */

/* ── Chapters, nodes ─────────────────────────────────────────────────── */
export interface ChapterDef {
  id: number                  // 0-based, 0..9
  slug: string                  // i18n key under `chapter.<slug>.*`
  newRune: number | null        // index into RUNES, or null on a Signature-Spell chapter
  signatureSpell: number | null // index into SIGNATURE_SPELLS, or null
  bossFoeId: number             // index into FOES
  standardFoeId: number         // index into FOES, reused/retinted for nodes 0-3
  arenaTheme: string            // §9's palette/prop-set key
}
export const CHAPTERS: readonly ChapterDef[] = [ /* 10 entries */ ]

/**
 * A node's identity IS its position, 0..49 (C5: 10 × 5, fixed forever).
 * `chapter = Math.floor(node / 5)`, `posInChapter = node % 5`,
 * `isBoss = posInChapter === 4`. No `NodeDef` array is needed for THAT
 * derivation; `NodeDef` below carries only what varies per node beyond the
 * regular grid.
 */
export interface NodeDef {
  /** Overrides `CHAPTERS[chapter].standardFoeId`/`bossFoeId` for a node that
   *  needs a specific foe rather than its chapter's default (rare). */
  foeIdOverride?: number
  dialogueKey: string           // -> DIALOGUES, §4.3's DialogueDef table
  giftId: number | null          // index into GIFTS, null on a node with no collectible (most standard nodes: tool only, no cosmetic)
}
export const NODES: readonly NodeDef[] = [ /* 50 entries */ ]
export const nodeChapter = (n: number): number => Math.floor(n / 5)
export const nodePosInChapter = (n: number): number => n % 5
export const nodeIsBoss = (n: number): boolean => nodePosInChapter(n) === 4
export const nodeFoe = (n: number): number => {
  const ov = NODES[n]!.foeIdOverride
  if (ov !== undefined) return ov
  const ch = CHAPTERS[nodeChapter(n)]!
  return nodeIsBoss(n) ? ch.bossFoeId : ch.standardFoeId
}

/* ── Foes ─────────────────────────────────────────────────────────────── */
export interface FoeDef {
  slug: string                  // i18n key under `foe.<slug>.*`
  element: number | -1           // index into RUNES, or -1 for no weakness (Umbra, Prism)
  hpMax: number                   // §6/§7 own the curve; default HP_MAX for standard, +boss bonus per C13
  aiTier: 0 | 1 | 2                 // capped per C13; decoupled from node/chapter index
  allowedRunes: readonly number[]  // which RUNES ids this foe may draw from (chapter's own magic gates in from node 2 of that chapter, C14 "Scope")
  boss: boolean
}
/** Assumed roster size for the byte/lazy-load math below: 10 standard +
 *  10 boss = 20 FoeDefs (one archetype per chapter, retinted/retitled per
 *  node by `arenaTheme`/element rather than one FoeDef per node). §6/§10 own
 *  the actual roster and the Guardian-reuse mapping (C5); flag if it grows
 *  materially past ~24 — it does not change any schema here, only the
 *  array's length. */
export const FOES: readonly FoeDef[] = [ /* ~20 entries */ ]

/* ── Gifts / cosmetics ────────────────────────────────────────────────── */
export type CosmeticSlot = 'head' | 'neck' | 'back' | 'companion' | 'trail' | 'mane' | 'skin'
export interface CosmeticDef {
  slot: CosmeticSlot
  slug: string                  // i18n key under `cosmetic.<slug>.*`
}
/** Position is the permanent id, bit-packed into `giftsOwned` (§4.5.1). Cap
 *  at 32 entries so `giftsOwned` fits one JS bitmask int (§4.5.1's rule:
 *  ≤16 hot-checked → int; here it's cold-checked but small, so still an
 *  int, just not bit-op'd every frame). Assumed roster: 10 chapter
 *  cosmetics (C17/C31's slot list) + 8 mane swatches + the Umbra-look skin
 *  = 19; §8/§10 own the exact list and must not exceed 32 without a schema
 *  bump here. */
export const COSMETICS: readonly CosmeticDef[] = [ /* ≤32 entries */ ]
export interface GiftDef {
  kind: 'cosmetic' | 'feature'
  cosmeticId?: number            // index into COSMETICS, when kind === 'cosmetic'
  feature?: 'versus'              // when kind === 'feature'
}
export const GIFTS: readonly GiftDef[] = [ /* one per NodeDef.giftId target */ ]

/* ── Dialogue ─────────────────────────────────────────────────────────── */
export type SpeakerId = 'aurora' | 'umbra' | 'guardian' | 'sprite' // extend as §10 needs
export type EmoteId = 'happy' | 'worried' | 'sleepy' | 'determined' | 'grateful' // extend as §10 needs
export interface DialogueLineDef {
  speaker: SpeakerId
  emote: EmoteId
  pictograms: readonly string[]   // icon ids, §9
  textKey: string                  // i18n key, `story.c{n}.n{m}.b{k}` per C12
}
export interface DialogueDef { lines: readonly DialogueLineDef[] }
export const DIALOGUES: Readonly<Record<string, DialogueDef>> = { /* keyed by NodeDef.dialogueKey */ }

/* ── Signature Spells (C1 item 6) ────────────────────────────────────── */
export interface SignatureSpellDef {
  chapter: number                 // 3 or 7 (0-based) per C1's table
  recipe: readonly number[]        // sorted rune-id multiset, §6 picks the values
  nameKey: string                   // i18n key, distinct from the generator's composed names (§4.3's spell-name grammar is §10's, not reused here)
  kind: SpellKind
  dmg: number
  extra: number
}
/** 2 entries (index 0 = ch3, index 1 = ch7). Looked up by exact recipe
 *  match, gated on `S.campaign.signaturesUnlocked` bit `i` (R-1b: set by
 *  the campaign controller's `unbox` handler at that chapter's boss node,
 *  §4.8.1 — NOT on `furthestNode` reaching the chapter, since the beat
 *  that grants a rune/Signature Spell is the boss-chest unbox, one node
 *  after the chapter opens). */
export const SIGNATURE_SPELLS: readonly SignatureSpellDef[] = [ /* ch3, ch7 */ ]
```

#### §4.3.1 Spell lookup precedence (ties §4.3's tables to `config.ts`)

`spellFor(q)` (today: golden 22 or `WILD`) becomes a three-stage lookup, so
Signature Spells can override a combo that is otherwise fully resolved by
the generator (not "still WILD" — see §4.0's non-goal note):

1. A `SignatureSpellDef` whose `signaturesUnlocked` bit is set AND whose
   `recipe` exactly matches `q` (sorted) wins outright.
2. The re-keyed golden 22 (§4.7's migration re-keys the saved form; the
   table itself is `config.ts`'s existing 22 entries, untouched in value) —
   preserves the frozen four runes' feel byte-for-byte.
3. The rule-based generator (§6 owns the kind-combination table, the triad
   rule, and the enumeration algorithm behind `comboEnumerationIndex()`
   — §6.2 publishes it as an exported pure function, per M14; this chapter
   only owns the fact that the generator is total over all 454 combos of
   the 12 runes and is asserted against stage 2 by a golden test, per C15).

`WILD` stops being reachable through normal play once stage 3 ships; it
stays in `config.ts` as a defensive fallback only (§4.0).

### §4.4 `S.campaign`

Nested under the one object, per C28 — `auroras_magic_state.campaign` at
runtime (`S.campaign`), the duel's own flat fields (`hp`, `queue`, `foe`,
`up`, …) untouched.

```ts
// src/game/campaign/state.ts
export interface CampaignState {
  /** -1..49. Highest node whose DUEL is won. -1 = none. The next duel to
   *  offer is `furthestNode + 1` (clamped at 49), UNLESS that node's sector
   *  is still pending — see the boot-resume derivation below. */
  furthestNode: number
  /** Base64 bitset, 50 bits — is sector N's dust cleared? Independent of
   *  `furthestNode`: a win can precede its wipe by a whole session (C6's
   *  "pending gift" boot case), so this is NOT derivable from the cursor. */
  sectorsDone: string
  /** Base64 bitset, 336 bits (24×14, per C9) — the ONE sector currently
   *  mid-wipe, i.e. index `furthestNode` while `sectorsDone` bit
   *  `furthestNode` is 0. `null` when no sector is in progress (either
   *  none started yet, or the pending one is untouched). At most one
   *  entry ever exists (C9's "one in-progress sector" rule; enforced by
   *  construction, not by a second index field). */
  wipeCoverage: string | null
  /** Bitmask int, bit i = rune i unlocked. Default 0b0000_1111 (the frozen
   *  four). Hot-checked (every duel setup reads it), so a plain int
   *  bitmask, not a base64 string — see §4.5.1's size rule. Written in
   *  exactly one place, the campaign controller's `unbox` handler
   *  (§4.8.1, R-1b) — nothing else may set a bit here. */
  runesUnlocked: number
  /** Bitmask int, bit i = `SIGNATURE_SPELLS[i]` unlocked (2 bits used, ch3
   *  and ch7's entries — §4.3). Default `0`. Same write site as
   *  `runesUnlocked` (R-1b): the controller sets the bit for
   *  `SIGNATURE_SPELLS[i]` when `nodeChapter(node) === SIGNATURE_SPELLS[i].chapter`
   *  and the unboxed node is that chapter's boss (node 4 mod 5). Read by
   *  §4.3.1's stage-1 lookup ("An UNLOCKED `SignatureSpellDef`…") — a
   *  recipe whose bit is unset here falls through to stage 2/3 exactly
   *  like any other combo. */
  signaturesUnlocked: number
  /** Base64 bitset over the generator's FIXED 454-combo enumeration
   *  (§4.3.1 stage 3; 12 + 78 + 364 multisets of size 1..3 from 12 runes).
   *  Index = the combo's position in that fixed, unlock-independent
   *  enumeration order, so ids stay stable as runes unlock. Replaces
   *  `am_spells_seen` (§4.7's migration folds it in and retires the old
   *  field, via §6's `comboEnumerationIndex()`). */
  combosSeen: string
  /** Base64 bitset, 50 bits — has this node's dialogue been viewed once
   *  (gates the C12 "skippable after first view" rule)? */
  dialoguesSeen: string
  /** Bitmask int over `COSMETICS` (≤32 entries, §4.3). */
  giftsOwned: number
  /** One entry per `CosmeticSlot`, in the fixed order
   *  ['head','neck','back','companion','trail','mane','skin']. Value = an
   *  index into `COSMETICS` restricted to that slot, or -1 for none
   *  equipped. Plain array, not a keyed object — same information, fewer
   *  bytes. */
  giftsEquipped: readonly [number, number, number, number, number, number, number]
  /** R-13, C11: which of the 3 paint pots the player picked for each
   *  sector's colour-me landmark — 2 bits per sector (0 = "not yet
   *  picked/no landmark reached", 1/2/3 = pot index + 1), 50 sectors,
   *  packed into a base64 bitstring (100 bits → 13 bytes → ~18 base64
   *  chars, `emptyBitset(100)` as the all-unset default). Bit-packed
   *  rather than "1 byte per sector" (the coordinator's looser
   *  alternative) to stay consistent with §4.5.1's own rule against
   *  wasting 6 bits per sector; §8.12 owns the actual pot-id meanings.
   *  §4.5.1's `hasBit`/`setBit` only read/write single bits, so this field
   *  needs its own tiny 2-bit read/write pair (`getPaintPick`/
   *  `setPaintPick`, same file) rather than reusing them directly. */
  paintPicks: string
  /** R-13, §8.12/§8.13: which of the (assumed ≤16) rescuable woodland
   *  creatures have been found — a 10-bit bitmask, so a plain int per
   *  §4.5.1's ≤16-member rule, not a base64 string. Default `0`. */
  rescued: number
  /** D3: which sectors' Twin Gift has already paid out — one permanent
   *  cosmetic bloom per sector, ever. Base64 bitset, 50 bits (7 B → 12
   *  base64 chars, `emptyBitset(50)` default). Bit `n` is set ONLY by
   *  `claimDuelReward()`'s Twin Gift claim for sector `n` (§4.15), and
   *  never unset — once claimed, that sector's bloom is never offered
   *  again (no power, no progress; purely a cosmetic prop-count bump on
   *  the map, §8 owns the visual). Replaces the old `am_coins` reward
   *  entirely — supersedes the coin part of F25. */
  blooms: string
  /** Dream Dust (C13), scoped per node. Only nonzero entries are present;
   *  a win deletes the entry. Keyed by node index as a decimal string.
   *  Clamp 0..8 per entry (formula saturates at 5; 8 is defensive
   *  headroom, never reached by the formula itself). In practice 0-1
   *  entries exist at once — nodes are linear and replays rarely stack. */
  lossStreaks: Record<string, number>
  /** [S5] Chapter-10's reward per C18, until Versus stage ships for real. */
  versusUnlocked: boolean
}
```

**Canonical field names (I-15) — §3 and §11 cite these, not their own
guesses:**

| What you need | NOT this | Use this |
|---|---|---|
| "Is a gift waiting to be unboxed, and on which node?" | `S.campaign.pendingGift` (no such field — it is derived) | `pendingSectorNode(S.campaign)` (below); non-null result IS the pending node |
| "The in-progress sector's coverage" | `S.campaign.wipeGrid` | `S.campaign.wipeCoverage` |
| "Has this node's dialogue been seen?" | `S.campaign.dialogueSeen: Record<nodeId,1>` | `hasBit(S.campaign.dialoguesSeen, node)` — a base64 bitstring (§4.5.1), not a record, and the field is spelled `dialoguesSeen` |
| "The map's camera pan" | `S.campaign.mapPan` | `S.flow.mapPan` (§4.1.2) — session-only view state, not persisted, not on `CampaignState` at all |
| "Which node is this scene about" | any `string` node id | `S.flow.node: number` (§4.1.2) — see §4.1.1's numeric-id rule |

**Boot-resume derivation** (pure functions, no extra persisted field — this
is what C6's "resume to the pending gift" rule reads):

```ts
export const hasBit = (bitset: string, i: number): boolean => { /* §4.5.1 */ }
export const pendingSectorNode = (cs: CampaignState): number | null =>
  cs.furthestNode >= 0 && !hasBit(cs.sectorsDone, cs.furthestNode) ? cs.furthestNode : null
export const nextDuelNode = (cs: CampaignState): number => Math.min(49, cs.furthestNode + 1)
```

`boot` (§4.1.3) reads `pendingSectorNode`: non-null → `map` scene with that
sector's gift focused (C6's "boots onto the map at that gift"); null and
`furthestNode < 49` → `dialogue`(`nextDuelNode`); `furthestNode === 49` and
its sector done → the idle map, campaign-complete state (§8/§10 own what
that screen says).

### §4.5 `S.campaign`'s encoding, and what stays flat on `S`

Two rules that keep the schema cheap and unambiguous: how a large or
enumerable set gets bit-packed (§4.5.1), and which fields never move into
`campaign` at all because they are duel-runtime, not campaign, data
(§4.5.2).

#### §4.5.1 Bit-packing pattern (`src/game/campaign/bitset.ts`, new)

One shared module, used by every set above, so the encoding is written and
tested once:

```ts
export const emptyBitset = (bits: number): string => /* base64 of `bits/8` zero bytes */ ''
export const hasBit = (b64: string, i: number): boolean => { /* decode byte i>>3, test bit i&7 */ }
export const setBit = (b64: string, i: number): string => { /* decode, set, re-encode */ }
export const countBits = (b64: string): number => { /* popcount, for §7's telemetry */ }
/** R-13: `paintPicks`' own 2-bit-per-slot pair — `hasBit`/`setBit` above
 *  only address one bit, so a 4-value field gets its own tiny accessor
 *  rather than two `setBit` calls at the caller (which could observe an
 *  inconsistent single-bit-set state mid-write). */
export const getPaintPick = (b64: string, sector: number): 0 | 1 | 2 | 3 => 0 /* decode 2 bits at sector*2 */
export const setPaintPick = (b64: string, sector: number, v: 0 | 1 | 2 | 3): string => b64 /* decode, set 2 bits, re-encode */
```

Rule of thumb applied consistently: a set that is checked on a hot path
(every duel setup, every frame) AND fits in ≤ 16 members is a plain bitmask
`number` (bitwise ops, zero decode cost — `runesUnlocked`, `giftsOwned`).
A set checked rarely (once per scene transition) and/or larger than 32
members is a base64 bitstring via the helpers above (`sectorsDone`,
`combosSeen`, `dialoguesSeen`, `wipeCoverage`). Never a `Record<string,1>`
for a set whose members have a fixed, enumerable order — that encoding is
what made the Round-1 byte math for this same data ~30× larger (§4.6.1's
worked total is the receipt).

#### §4.5.2 What stays flat on `S`

Per C28 ("the duel's runtime fields stay flat"): `S.up` (element ranks) is
**removed outright, not widened** (D3, superseding this section's earlier
4→12 draft) — with no `RANK_BONUS`/`rankPrice`/`buyRank` in the story
build, there is no per-element rank state left for `sim.ts` to read on any
cast, hot-checked or otherwise, so the field is simply gone rather than
resized. `S.foe` (§4.8.2)
narrows to "which `FoeDef` (§4.3) is loaded for the CURRENT duel" — set once
by `resetDuel(node)`, no longer doing double duty as a save field (that job
moves to `S.campaign.furthestNode`). `S.flow` (§4.1.2) is the third
flat-on-`S` field this chapter adds: non-persisted, but still one object.

### §4.6 Persisted field list

Flat, top-level `am_*` fields (unchanged location, `src/keys.ts`):

| Key | Type | Default | Clamp | Status |
|---|---|---|---|---|
| `am_schema` | int | `1` (implicit — absent means Step-1) | `1..2` | **new**, §4.7 |
| `am_wins` | int | `0` | `≥ 0` | unchanged |
| `am_losses` | int | `0` | `≥ 0` | unchanged |
| `am_duels` | int | `0` | `≥ 0` | unchanged |
| `am_best_time` | number (s) | `0` | `≥ 0` | unchanged |
| `am_onboarded` | 0\|1 | `0` | — | unchanged |
| `am_coins` | — | — | — | **retired** (D3: no currency in the story build; read once by §4.7's migration and dropped — nothing migrates into it) |
| `am_upgrades` | — | — | — | **retired** (D3: no element-rank system in the story build; read once by §4.7's migration and dropped — nothing migrates into it) |
| `am_ladder` | int | `0` | `0..5` | **frozen legacy**, read-only after migration, §4.7 |
| `am_spells_seen` | — | — | — | **retired**, folded into `campaign.combosSeen`, §4.7 |
| `am_campaign` | `CampaignState` (§4.4) | all-defaults object | per-field above | **new** |

Two new `src/keys.ts` exports back these last two rows (M23, closing I-30 —
today's file has no such lines):

```ts
// src/keys.ts — additions
/** Schema version of the persisted blob. Absent (`undefined`) means the
 *  Step-1 shape; `migrateToSchema2()` (§4.7) writes 2. */
export const SCHEMA_KEY = 'am_schema'
/** The nested `CampaignState` object (§4.4), `S.campaign`'s persisted
 *  form. */
export const CAMPAIGN_KEY = 'am_campaign'
```

`am_campaign`'s own defaults, spelled out (never "TBD"):

```ts
export const DEFAULT_CAMPAIGN: CampaignState = {
  furthestNode: -1,
  sectorsDone: emptyBitset(50),
  wipeCoverage: null,
  runesUnlocked: 0b0000_1111,   // FIRE, WIND, ICE, EARTH
  signaturesUnlocked: 0,
  combosSeen: emptyBitset(454),
  dialoguesSeen: emptyBitset(50),
  giftsOwned: 0,
  giftsEquipped: [-1, -1, -1, -1, -1, -1, -1],
  paintPicks: emptyBitset(100),   // R-13: 50 sectors × 2 bits, all-unset
  rescued: 0,                     // R-13
  blooms: emptyBitset(50),        // D3: no sector's Twin Gift bloom claimed yet
  lossStreaks: {},
  versusUnlocked: false
}
```

#### §4.6.1 Save byte budget (worked, JSON-serialised, worst case = full completion + one in-progress sector)

| Field | Bytes (incl. key + punctuation) |
|---|---|
| `am_schema` | ~14 |
| `am_campaign.furthestNode` | ~22 |
| `am_campaign.sectorsDone` (7 B → 12 b64 chars) | ~30 |
| `am_campaign.wipeCoverage` (42 B → 56 b64 chars, active) | ~75 |
| `am_campaign.runesUnlocked` | ~22 |
| `am_campaign.signaturesUnlocked` (R-13) | ~26 |
| `am_campaign.combosSeen` (57 B → 76 b64 chars) | ~93 |
| `am_campaign.dialoguesSeen` | ~30 |
| `am_campaign.giftsOwned` | ~20 |
| `am_campaign.giftsEquipped` (7 ints, array) | ~40 |
| `am_campaign.paintPicks` (R-13: 13 B → 18 b64 chars) | ~35 |
| `am_campaign.rescued` (R-13) | ~20 |
| `am_campaign.blooms` (D3: 7 B → 12 b64 chars, same size as `sectorsDone`) | ~30 |
| `am_campaign.lossStreaks` (1 entry, worst realistic case) | ~30 |
| `am_campaign.versusUnlocked` | ~24 |
| **Total new/changed bytes** | **≈ 487 B** |

Against C28's "< 8 KB" budget this lands just under 0.5 KB with the
in-progress sector active. D3 moves the total DOWN from the earlier
≈501 B: dropping the retired `am_upgrades` row (~44 B, no replacement —
D3 leaves no element-rank field anywhere) more than pays for the new
`blooms` bitset (~30 B) added back for the Twin Gift's bloom. (The
owner's D3 note estimates `blooms` at "about 9 bytes" raw; ~30 B above is
its JSON-serialised cost once base64-encoded with its key and punctuation,
consistent with how `sectorsDone` — the same 50-bit size — is costed two
rows up.) Bit-packing every enumerable set (§4.5.1) is still what buys the
margin: the same fields as `Record<string,1>` (Round-1's first-draft
encoding) would have cost `combosSeen` alone ≈ 454 × 13 B ≈ 5.9 KB on its
own. Either number is trivial against Yandex's 200 KB cap
(`YandexStrategy.ts`) and Poki's < 1 MB gzip.

### §4.7 Migration from the Step-1 blob

One function, `migrateToSchema2()`, called from `load()`
(`src/game/duel/state.ts`) before anything else reads `S.campaign`. Per
F24, this build has never shipped — the only `auroras_magic_state` blobs in
existence are dev/QA saves — so the migration's job is *never crash on a
Step-1 shape and land somewhere sane*, not *preserve earned value
generously* (F24 overrules Round-1's ARCH-6 softening proposal).

```ts
// src/game/campaign/migrate.ts
export const migrateToSchema2 = (): void => {
  if (num(getState(SCHEMA_KEY, 1)) >= 2) return // already migrated

  // 1. am_coins, am_upgrades: D3 removes the currency and the
  //    element-rank system entirely. No build has ever shipped (F24), so
  //    there is nothing to preserve and no `CampaignState` field for
  //    either to migrate INTO — both are read once (so the migration
  //    itself is the only thing that ever touches them again) and
  //    dropped. A clean, one-way drop, not a versioned deprecation.
  getState<unknown>(COINS_KEY, null)
  getState<unknown>(UPGRADES_KEY, null)
  removeState(COINS_KEY)
  removeState(UPGRADES_KEY)

  // 2. am_ladder: left untouched, in place, as a frozen historical field —
  //    nothing reads it as a save field any more (S.foe no longer is it;
  //    S.campaign.furthestNode starts at -1 regardless of its value, per
  //    F24 — no attempt to translate a 0-5 ladder rung into a 0-49 node).

  // 3. am_spells_seen -> campaign.combosSeen, via the re-keyed generator
  //    (C15). Only the base-4-rune legacy keys can exist pre-migration.
  const legacy = getState<Record<string, 1> | null>(SPELLS_SEEN_KEY, null) ?? {}
  let combosSeen = emptyBitset(454)
  for (const oldKey of Object.keys(legacy)) {
    const runeIds = [...oldKey].map(Number)              // '023' -> [0,2,3]
    const idx = comboEnumerationIndex(runeIds)             // imported from §6's generator module
    if (idx >= 0) combosSeen = setBit(combosSeen, idx)
  }
  removeState(SPELLS_SEEN_KEY)

  // 4. Everything else in CampaignState has no Step-1 analogue: defaults,
  //    including the new `blooms` bitset (D3) — no Step-1 save ever
  //    granted a bloom, so it starts fully unset regardless of the old
  //    `am_coins` balance discarded in step 1 (discarded, not converted:
  //    a bloom is not purchased or earned from a balance, only claimed
  //    once per sector via the Twin Gift, §4.15).
  setState(CAMPAIGN_KEY, { ...DEFAULT_CAMPAIGN, combosSeen })

  setState(SCHEMA_KEY, 2)
}
```

**S1 note (2026-09-18): `am_campaign` already exists before this runs.** S1
persists the full `CampaignState` as `am_campaign` from the first sector win,
with no `am_schema` written. `migrateToSchema2()` must therefore MERGE: read
the existing blob through `readCampaign()` (`src/game/campaign/state.ts`),
then fold `combosSeen` into it. It must never write
`{ ...DEFAULT_CAMPAIGN, combosSeen }` over a sector a player has already
restored or started.

`comboEnumerationIndex(runeIds: readonly number[]): number` (M14) is §6's
export, not this chapter's: §6.2 publishes the exact algorithm (index =
position when every length-1, then length-2, then length-3 sorted
rune-id tuple is generated in lexicographic order over ids 0..11) as one
pure function, imported here and by the golden test (`spellFor.test.ts`,
§4.13.1) and by §6's own generator — three call sites, one source of
truth for "what index does combo X have." §4 previously forward-referenced
an order it never defined (I-13); it now only imports it.

`am_wins`/`am_losses`/`am_duels`/`am_best_time`/`am_onboarded` need no
transformation — their meaning is unchanged. `am_coins` and `am_upgrades`
are the two fields this migration reads without writing anywhere new
(step 1, above): D3 supersedes C4's "keeps the shrine economy running on
`am_coins`" (removed per D3) — there is no shrine, no ranks and no
currency in the story build, so both keys are dropped outright rather
than carried forward.

### §4.8 Event flow and the `resetDuel(node)` contract

#### §4.8.1 The campaign controller

`sim.ts`'s `DuelEvent` union (`'rune' | 'cast' | 'hurt' | 'hit' | 'finish'`)
stays exactly as-is — the boundary ARCH-15 (Round 1) flagged is ratified by
omission (nobody proposed touching it) and holds under the campaign too.
`sim.ts` never imports anything under `src/game/campaign/` or
`src/game/flow/`.

A new `src/game/campaign/controller.ts` is the ONLY module that both
subscribes to `onDuelEvent` and writes `S.campaign`:

```ts
onDuelEvent((e, won) => {
  if (e !== 'finish') return
  const node = S.flow.node
  if (S.flow.mode === 'versus') return // C18: no campaign side-effects for a versus match
  if (won && node === nextDuelNode(S.campaign)) {
    S.campaign.furthestNode = node
    delete S.campaign.lossStreaks[String(node)]
    save()
  } else if (!won && node === nextDuelNode(S.campaign)) {
    const k = String(node)
    S.campaign.lossStreaks[k] = clamp((S.campaign.lossStreaks[k] ?? 0) + 1, 0, 8)
    save()
  }
  // A replay (node <= furthestNode, C24) touches neither field: "no gift
  // and no rewards" per the ruling.
})
```

This keeps `resetDuel(node)` (§4.8.2, next) and this controller as the only
two places that know a `NodeDef` exists; `sim.ts` still only ever sees a
`FoeDef`'s resolved numbers.

**R-1b: a rune (or Signature Spell) unlocks at its chapter's BOSS-CHEST
UNBOX, per §5.2/§11.6 — not at the chapter opener, and nothing in Round-2's
draft ever wrote `runesUnlocked` at all.** `onDuelEvent`'s `'finish'` case
above is the wrong hook for this (a boss WIN doesn't grant the rune; the
UNBOX beat that follows it does, and per C6/§4.1.3 a player can win a boss
duel and quit before ever tapping the gift). The controller therefore
exports a second entry point, called by whichever scene ends the unbox
beat (`UnboxScene.vue`, §4.2 — a DOM overlay with no campaign-write access
of its own):

```ts
// src/game/campaign/controller.ts — additive export, same file
import { CHAPTERS, nodeChapter, nodeIsBoss } from '@/game/campaign/tables'

/** Called once, at the end of the unbox beat, right before the
 *  `unbox`→`wipe` transition (§4.1.3). A no-op on any non-boss node —
 *  standard nodes' gifts are tools/cosmetics (§4.3's `GiftDef`),
 *  never a rune or Signature Spell. */
export const onUnboxComplete = (node: number): void => {
  if (!nodeIsBoss(node)) return
  const ch = CHAPTERS[nodeChapter(node)]!
  if (ch.newRune !== null) S.campaign.runesUnlocked |= 1 << ch.newRune
  if (ch.signatureSpell !== null) S.campaign.signaturesUnlocked |= 1 << ch.signatureSpell
  save()
}
```

§4.1.3's `unbox`→`wipe` row now names this call explicitly.

#### §4.8.2 `resetDuel(node)` contract (extends `sim.ts`, additive)

```ts
// src/game/duel/sim.ts — signature changes from resetDuel() to resetDuel(node: number)
export const resetDuel = (node: number): void => {
  const foe = FOES[nodeFoe(node)]!               // campaign/tables.ts
  S.foe = nodeFoe(node)                            // narrowed meaning, §4.5.2
  S.hp = HP_MAX
  S.ehp = S.ehpMax = foe.hpMax
  // … existing resets …
}
```

`chooseRune()`/`think()` (unchanged files, additive reads) gate their rune
pool by `foe.allowedRunes` intersected with `S.campaign.runesUnlocked`
(never lets the NPC draw a rune the player hasn't met yet, even if the
`FoeDef` nominally allows it — §6 owns the pool-selection rule itself).

### §4.9 Bracket integration contract

Round-2's first draft got this wrong twice, and the audit (I-4, I-5) is
right on both counts: it kept `duel` "live" through the ENTIRE win/loss
beat (widening the live window past what ships today, unflagged), and it
wired the fix with the exact `watch(computed(...))` shape C7 names and
bans. §4.9.1 restates the rule so the live window matches today's
`S.phase` behaviour exactly; §4.9.2 replaces the watch with direct calls
(M12).

#### §4.9.1 The rule — unchanged live window, widened scene set

```ts
// src/use/useGameplayLifecycle.ts
export interface GameplayLiveInputs {
  scene: 'boot' | 'duel' | 'wipe' | 'map' | 'dialogue' | 'unbox' | 'wardrobe' | 'versusSetup'
  /** True iff `S.phase === PH_DUEL` — false for the ENTIRE win flourish and
   *  loss sting, exactly as today (the current code flips `hud.phase` off
   *  `PH_DUEL` synchronously inside `sim.ts`'s `finish()`, before the 1.4 s
   *  beat or any ad begins). Meaningless outside `scene === 'duel'`, but
   *  always supplied for a total function. */
  duelPhaseIsLive: boolean
  // showResult, anyModalOpen, adShowing, visibilityHidden, platformPaused,
  // awaitingInput: unchanged shape and meaning.
}
export const isGameplayLive = (i: GameplayLiveInputs): boolean =>
  ((i.scene === 'duel' && i.duelPhaseIsLive) || i.scene === 'wipe')
  && !i.showResult && !i.anyModalOpen && !i.adShowing
  && !i.visibilityHidden && !i.platformPaused && !i.awaitingInput
```

`'boot'` is in the union (I-24) and is never live — `AppScene.vue` resolves
out of it (§4.1.5's boot sequence) before the bracket is ever reconciled
against a real scene, but the type must not lie about the value
`S.flow.scene` legitimately holds for one frame at startup.

This ratifies C7's SCENE half exactly (`duel` while its phase is live, and
`wipe`, are the only live scenes; `map`, `dialogue`, `unbox`, `wardrobe`,
`versusSetup`, `boot` are not) while correcting the PHASE half back to
today's behaviour: the flourish and the sting are NOT live, matching
`S.phase`'s own semantics rather than `S.flow.scene`'s (which does not
change until after the ad settles, per §4.9.3).

#### §4.9.2 The mechanism — enter/exit hooks, never a watch on a computed (M12)

One memoised reconciler, called directly by every place that mutates one
of `isGameplayLive`'s seven inputs — never by a `watch()` on a derived
value:

```ts
// new file: src/game/flow/bracket.ts
import { S } from '@/game/duel/state'
import { PH_DUEL } from '@/game/duel/config'
import { isGameplayLive, syncGameplayLifecycle } from '@/use/useGameplayLifecycle'
import { isAdShowing, isVisibilityHidden, isPlatformPaused } from '@/use/useGamePause'
import { isAnyModalOpen } from '@/use/useModalState'

let lastReported: boolean | null = null
/**
 * Recompute from current inputs and report ONLY on a real change — cheap
 * enough to call from every mutation site listed below without a
 * reactive graph in between.
 *
 * Takes NO arguments (R-1, fixing Round-2's `(armed: boolean)` signature,
 * which every real call site — `gotoScene`, `openOverlay`, `closeOverlay`
 * — called with zero arguments). Every one of `isGameplayLive`'s seven
 * inputs, including `armed`, is read straight off `S`/`S.flow` — there is
 * nothing left for a caller to pass.
 */
export const reconcileGameplayBracket = (): void => {
  const live = isGameplayLive({
    scene: S.flow.scene,
    duelPhaseIsLive: S.phase === PH_DUEL,
    showResult: S.resultUp,
    anyModalOpen: isAnyModalOpen.value || S.flow.overlay !== null,
    adShowing: isAdShowing.value,
    visibilityHidden: isVisibilityHidden.value,
    platformPaused: isPlatformPaused.value,
    awaitingInput: !S.flow.armed
  })
  if (live === lastReported) return
  lastReported = live
  syncGameplayLifecycle(live)
}
```

Call sites (each an actual enter/exit event the app already has a
handler for — nothing new is invented, existing handlers gain one line):

| Input that can flip | Call site | File |
|---|---|---|
| `scene` | `gotoScene()`, `openOverlay()`, `closeOverlay()` (§4.1.2 — already call it) | `src/game/flow/scene.ts` |
| `duelPhaseIsLive` (`S.phase` leaves/rejoins `PH_DUEL`) | the campaign controller's `onDuelEvent('finish', …)` handler (§4.8.1) calls it on exit; `resetDuel(node)` (§4.8.2) calls it on re-entry, right after setting `S.phase = PH_DUEL` | `src/game/campaign/controller.ts`, `src/game/duel/sim.ts` |
| `adShowing` | the existing show/hide toggle around `showMidgameAd`/`showRewardedAd`'s promise | `src/use/useAds.ts` (additive one-line call in the existing resolve/finally) |
| `anyModalOpen` | `acquireModalOpen()`'s call and its release function | `src/use/useModalState.ts` (additive) |
| `visibilityHidden` / `platformPaused` | the existing `visibilitychange` listener and the platform-pause bridge | `src/use/useGamePause.ts` (additive) |
| `awaitingInput` (`S.flow.armed`) | `AppScene.vue`'s `wake()` calls `arm()` (§4.1.2) on the first trusted gesture, which sets `S.flow.armed = true` and reconciles itself | `AppScene.vue` (§4.1.5), `src/game/flow/scene.ts` |

`restartGameplayBracket()` (today's handover helper) is unaffected — it
still exists in `useGameplayLifecycle.ts` for the case a future mode
chains two live plays with no non-live scene between them, but nothing in
this campaign's transition table (§4.1.3) currently needs it: every
`duel`→`duel` edge (retry) already passes through a real
`duelPhaseIsLive` exit-then-entry (`finish()` then `resetDuel()`), which
`reconcileGameplayBracket` reports as two real transitions, not a same-tick
double-report.

#### §4.9.3 Ad sequencing re-anchored to the owner's F25 pass, not redesigned

The owner's ads pass (F25) already ships the pacing contract this chapter
needs to slot into — nothing here changes `useAdGate.ts`'s numbers
(240 s / 121 s, one shared clock, no stage-keyed cadence) or the
win-AND-loss interstitial. §11 (Portal) owns the ad-copy/placement-legality
chapter; this section only states the FSM's two attachment points, so the
hook survives the loop redesign (ARCH-17, Round 1) rather than being
re-derived.

**R-9, amending M21, stated plainly here too: `maybeShowInterstitial()`
lives in the duel controller and stays there — it is NOT part of
`useDuelRewards.ts` (§4.15), and it never moves to wherever the Twin Gift
renders.** It is duel-beat-anchored (below), reward logic is
gift-anchored, and the two composables have no reason to import each
other.

- **Win:** `duel`'s existing `presentResult()` beat (victory flourish 1.4 s,
  gift visibly drops, per C8) → `maybeShowInterstitial()` (unchanged
  function) → the `duel`→`map` transition (§4.1.3) fires only after that
  promise settles — i.e. the FSM transition is gated on the SAME await that
  gates `S.resultUp` today, just followed by `gotoScene('map')` instead of
  staying in a result panel. `S.flow.scene` stays `'duel'` throughout this
  entire beat — it is `duelPhaseIsLive` (§4.9.1), flipped by `finish()`
  before the beat starts, that keeps the bracket correctly non-live for it,
  not a scene change.
- **Loss:** unchanged — the interstitial is already inside `presentResult()`
  regardless of `won`, per the current `GameScene.vue`; the FSM only adds
  that "map" (one of the loss beat's two choices) also goes through
  `gotoScene('map')`, "retry" does not leave `duel` at all.
- **Never** during `dialogue`, `unbox`, `wipe`, or `wardrobe` — none of
  those transitions call `maybeShowInterstitial`; only the `duel` win/loss
  beat does, unchanged from today's single call site.
- The QA chord (`useQaAdTrigger.ts`, 30 taps on the foe HP bar) is
  `duel`-scene-local input handling; it needs no FSM change since the bar
  only exists while `S.flow.scene === 'duel'`.
- `resolveAdProvider.ts` / `DevAdProvider.ts` are untouched by this
  chapter — they resolve per BUILD, not per scene.

### §4.10 Code-splitting and lazy-load points

- `src/game/campaign/tables.ts` is metadata-only (no art, no big text
  blobs — dialogue text lives in i18n locale files per CONTEXT.md's i18n
  rule) and loads eagerly with the app shell; it is small enough (≤ 50
  `NodeDef` + ≤ 24 `FoeDef` + ≤ 32 `CosmeticDef` entries, all primitives) to
  not warrant splitting on its own.
- **Per-chapter code splitting is on the SCENE modules, not the data
  table.** `src/game/map/`'s per-chapter art/prop set and `src/i18n`'s
  per-chapter dialogue block (grouped by the `story.c{n}.*` key prefix
  C12 mandates) are dynamically imported keyed by `nodeChapter(node)`,
  mirroring the existing lazy `import()` the router already does for
  `GameScene.vue`. Resident window: current chapter ±1 (C29) — a chapter
  boundary crossing (`nodeChapter(furthestNode)` changes) triggers
  prefetch of `chapter+1`'s block and release of `chapter-2`'s.
- `SIGNATURE_SPELLS` and the two Signature-Spell chapters' extra rules are
  small enough to ship in `tables.ts` unconditionally — no split needed.
- Painted art (Step 3, [S6]) follows the existing `art.ts` drop-in contract
  unchanged; this chapter adds no new art-loading mechanism.

### §4.11 Feature flags

| Flag | Where | Default | Effect |
|---|---|---|---|
| `released` | `ChapterDef` (§4.3), or a parallel `CHAPTER_RELEASED: readonly boolean[]` if keeping `ChapterDef` itself free of build-time concerns is preferred | all `true` at ship, `false` for chapters not yet built during S3/S4 (C3) | `map` scene hides/greys a node whose chapter is not released; `boot`/dialogue never route into one. Mirrors the existing `SPELLBOOK` constant pattern in `config.ts` — a real `const`, not a runtime toggle, so Rollup can fold an unreleased chapter's now-unreachable branches. |
| `SPELLBOOK` | `src/game/duel/config.ts` (existing) | `true` in the story build (C16 turns it on) | unchanged mechanism, flipped value |
| `RANK_SHOP_PANEL` | — | — | **removed per D3** — no element-rank system, no Rune Shrine, no `DuelResult.vue` shop panel exists in the story build at all, so there is no panel left for a flag to gate (superseding C4's "retired in favour of the Rune Shrine," which still assumed a shop panel existed somewhere) |
| `VITE_CHILD_DIRECTED` | build-time env, but read in exactly ONE module: `src/use/useChildDirected.ts` (new, owned by §11 — M17, closing I-17's two-file disagreement in favour of a dedicated module rather than folding into `useUser.ts`) | `false` (D1's default) | per C2/M17: **OR'd directly into `isRewardOfferSuppressed` inside `useAdGate.ts`**, so `claimReward()` itself refuses regardless of caller (closing I-7's "outside-consumer-only" gap) — removing the whole rewarded surface, not just hiding its button; analytics gating is a **module alias swap in `vite.config.ts`** (a third stub branch alongside the existing `analyticsSink.stub.ts` swap), never an in-function `if` (M17/I-6 — the obfuscator's `stringArray` pass hoists literals before an env-literal `if` folds, which is exactly why the project's existing Playgama analytics gate uses the same alias-swap mechanism and not a guard clause); drops Playgama from `build:all`. §2.9 defers to this file location rather than restating its own. |

### §4.12 QA hooks

Extends the existing `window.__*` surface (`GameScene.vue`'s `onMounted`,
gated on `isDebug.value || import.meta.env.DEV || __AM_QA__`), added by each
new scene's own mount hook rather than centralised, matching the existing
convention:

```ts
w.__flow = {
  goto: gotoScene,                              // jump straight to any scene/node
  state: () => ({ ...flow }),
}
w.__campaign = {
  state: () => S.campaign,
  setFurthest: (n: number) => { S.campaign.furthestNode = clamp(n, -1, 49); save() },
  unlockAllRunes: () => { S.campaign.runesUnlocked = 0b1111_1111_1111; S.campaign.signaturesUnlocked = 0b11; save() },
}
w.__wipe = {
  complete: () => { /* set the in-progress sector's coverage to 100%, trigger the reveal path */ },
  coverage: () => currentCoveragePct(),          // §9's live number, exposed for assertions
}
```

`__S` (the duel object) is unchanged and still the fastest way to drive a
`duel`-scene assertion; these three are additive for the scenes `__S` alone
cannot reach.

### §4.13 Test plan

#### §4.13.1 Unit (pure, no browser) — new files under `tests/campaign/`, `tests/flow/`

- **`bitset.test.ts`** — round-trip every helper in §4.5.1 at boundary sizes
  (0, 1, 7, 8, 49, 50, 335, 336, 453, 454 bits); `combosSeen` and
  `sectorsDone` specifically at their real sizes; `getPaintPick`/
  `setPaintPick` (R-13) round-trip all four 2-bit values at sector indices
  0, 1, 48, 49.
- **`controller.test.ts`** (new, R-1b) — `onUnboxComplete(node)` is a no-op
  on every non-boss node; on a boss node it sets exactly the bit for that
  chapter's `newRune` OR its `signatureSpell`, never both, never a bit
  belonging to a different chapter; calling it twice for the same node
  leaves the bitmask unchanged (idempotent, since `|=` on an already-set
  bit is a no-op) — this is also the test that would have caught Round-2
  shipping with `runesUnlocked` write-once-never.
- **`tables.test.ts`** — `NODES.length === 50`; every `NodeDef.foeIdOverride`
  (if any) and every `CHAPTERS[*].bossFoeId`/`standardFoeId` resolves to a
  real `FOES` index; `RUNES.length === 12`; every `unlockChapter` is either
  `-1`, `null`, or a valid `0..9` and matches C1's table exactly (a table
  test asserting the literal chapter→rune mapping, so a future edit that
  drifts from the ruling fails loudly).
- **`spellFor.test.ts`** (extends the existing generator golden test, C15) —
  the three-stage lookup in §4.3.1 in order: a `SignatureSpellDef` recipe
  wins over what the generator alone would produce for it; the re-keyed
  golden 22 reproduce the SHIPPED 22 entries' `[kind, dmg, extra]` exactly
  (byte-for-byte, the frozen-feel guarantee); the generator resolves all
  454 enumerable combos to a defined entry (none reach `WILD`).
- **`comboEnumerationIndex.test.ts`** — is a total, collision-free bijection
  over all 454 multisets; the SAME function is asserted to be what
  `migrateToSchema2` and the golden test both call (import-identity check,
  not a re-implementation compared for equality — a drift bug is exactly
  "two hand-written tables slowly disagreeing").
- **`migrate.test.ts`** — from a synthetic Step-1 blob (a nonzero
  `am_coins` balance, a 4-length `am_upgrades`, un-delimited
  `am_spells_seen` keys like `'01'`, `'023'`, no `am_schema`, an
  `am_ladder` of e.g. `3`): asserts `am_schema === 2` after, `am_coins`
  and `am_upgrades` both absent from the blob afterward (D3: read once,
  discarded, never migrated into any `CampaignState` field),
  `am_spells_seen` absent from the blob afterward, the corresponding bits
  set in `S.campaign.combosSeen`, `S.campaign.furthestNode === -1` (F24 —
  no ladder-to-node translation attempted), `S.campaign.blooms` fully
  unset regardless of the discarded `am_coins` balance, and idempotence
  (running it twice is a no-op the second time). Also: a blob with NO
  `am_*` fields at all (a truly fresh install) migrates to the same
  defaults as `DEFAULT_CAMPAIGN` without throwing.
- **`campaignState.test.ts`** — `pendingSectorNode`/`nextDuelNode` against
  hand-built `CampaignState` fixtures, including the "just won node 12,
  sector 12 not yet wiped" resume case and the "campaign complete" case
  (`furthestNode === 49`, `sectorsDone` bit 49 set).
- **`gameplayLiveRule.test.ts`** (extends the existing file) — the widened
  `isGameplayLive` (§4.9.1) against all 8 `scene` values crossed with
  `duelPhaseIsLive` (asserting specifically that `scene:'duel',
  duelPhaseIsLive:false` — the win/loss beat — is NOT live, closing I-5),
  plus the other boolean inputs (existing table-driven style).
- **`bracket.test.ts`** (new, §4.9.2) — `reconcileGameplayBracket` only
  calls `syncGameplayLifecycle` when the computed value actually changes
  (a spy asserts call count, not just final state), and each named call
  site in §4.9.2's table triggers exactly one reconciliation.
- **`resetDuel.test.ts`** — `resetDuel(node)` for a sample of standard and
  boss nodes sets `S.ehpMax` per `FoeDef.hpMax`, and the NPC's rune pool
  (`chooseRune`) never draws outside `foe.allowedRunes ∩ runesUnlocked`
  across a seeded random run.

#### §4.13.2 Real-browser (extends the existing portal-QA / `pnpm qa:portal` pattern)

- Full node loop, one boss and one standard: `map`→`dialogue`→`duel`
  (win)→ interstitial timing unaffected → `map`(gift present) →
  `unbox`→`wipe`(via `__wipe.complete()`) → `map`(next node pulsing) —
  asserting `S.flow.scene` and `S.phase` at each step and that
  `isGameplayLive` matches §4.9.1's rule at each step (via the existing
  platform-mock harness `tests/platforms/` already uses).
- Portrait/landscape at each new scene's minimum width (320 px per
  CONTEXT.md), `map` and `wardrobe` specifically (§3/§9 own layout
  correctness; this is a "does not crash / does not overflow" smoke pass).
- A session that crosses `FIRST_INTERSTITIAL_AFTER_MS`/`INTERSTITIAL_MIN_GAP_MS`
  (§4.9.3) across TWO full node loops, confirming the FSM's win/loss
  attachment points still respect the owner's shared clock unchanged.
- Save round-trip: play to a mid-campaign state, force-reload, confirm
  `am_campaign` (including an in-progress `wipeCoverage`) restores
  bit-identical.
- 2P versus [S5]: two simultaneous pointer streams on one canvas
  (`pointerId` routing) never cross-contaminate the two stroke buffers,
  confirmed by drawing overlapping shapes on both sides at once.

### §4.14 Assumptions handed to other chapters

- §4.3's `FOES` roster size (~20) and the exact Guardian-reuse mapping are
  §6/§10's to finalise (C5); this chapter only needs the count to stay
  small enough that no lazy-load boundary is needed for it (§4.10).
- §4.3's `COSMETICS` roster (assumed ≤ 32, ~19 estimated) is §8/§10's; if
  it must exceed 32, `giftsOwned` moves from a bitmask int to a base64
  bitstring (§4.5.1's own rule) — a contained, one-line schema change,
  flagged here so it isn't discovered as a silent overflow later.
- §4.3's per-`NodeDef.giftId` assignment (which of the 50 nodes carries a
  collectible) is §8/§10's; this chapter only needs `giftId: number | null`
  to exist on every node.
- §6 owns the exact `SIGNATURE_SPELLS` recipes and the new `SpellKind`
  Crystal's reflect tactic may need (today's kind enum is
  `0 bolt · 1 field · 2 barrier · 3 heavy · 4 push`; "bounces spells back"
  does not obviously fit any of the five — flagged for §6, not resolved
  here).
- §9 owns the wipe's actual grid resolution, brush stamp and compositing
  technique; this chapter only fixes the PERSISTED coverage size at 24×14
  (C9) and the in-memory firewall pattern (§4.2's `restore/` module mirrors
  `syncHud`'s copy-out-on-change discipline, not per-pointer-event).
- §3 owns whether "no separate `gift`/`reveal` scene" (§4.1.1) reads right;
  this chapter can fold them back into the transition table as
  full `SceneId`s at no schema cost if UX needs a distinct beat there.

### §4.15 Reward composable (M21)

The reward/interstitial logic that today is private to `GameScene.vue`'s
closure (`onReward`, `rewardClaimed`, `rewardLive`, plus
`maybeShowInterstitial`) cannot stay there once the Twin Gift lives on the
`map` scene (§11's presentation) while the loss beat still lives in
`duel` — two different components need the same state and the same
claim logic, so it lifts into one composable both call. **D3 retargets
the payout itself: the Twin Gift pays a permanent cosmetic bloom, never
coins** — superseding the coin part of F25 (the owner's ads pass paying
×2 coins after every duel) and closing out the `winCoins`/`S.coins`
surface this composable used to own:

```ts
// new file: src/use/useDuelRewards.ts
import { ref, computed } from 'vue'
import { S, save, pop } from '@/game/duel/state'
import { PH_WIN } from '@/game/duel/config'
import { hasBit, setBit } from '@/game/campaign/bitset' // §4.5.1
import { canOfferReward, claimReward, isRewardGated, adInFlight } from '@/use/useAdGate'
import { flushSaveNow } from '@/use/useSaveStatus'
import { haptic } from '@/use/useHaptics'
import { track } from '@/use/useAnalytics'
import { sfx } from '@/game/duel/audio'

/** Reset once per duel outcome (called by the duel controller right where
 *  `presentResult()` sets `S.resultUp`/enters the loss beat) — NOT once per
 *  scene, so a map visit between two duels never carries a stale claim. */
export const rewardClaimed = ref(false)
export const resetRewardClaim = (): void => { rewardClaimed.value = false }

/** D3: one bloom per sector, ever. `false` once `S.campaign.blooms`' bit
 *  for this node (§4.4) is already set — there is nothing left to offer
 *  for that sector regardless of ad availability, win or loss. */
export const canClaimBloom = computed(() => !hasBit(S.campaign.blooms, S.flow.node))

/** Read live off `S`/`S.flow`, so the SAME composable instance answers
 *  correctly whether it is rendered from the loss beat (still inside
 *  `duel`) or from the map's Twin Gift (after the page-turn). */
export const rewardLive = computed(() =>
  isRewardGated && canOfferReward.value && !rewardClaimed.value && !adInFlight.value && canClaimBloom.value)

export const claimDuelReward = async (onMusicResume: () => void): Promise<void> => {
  if (!rewardLive.value) return
  const kind = S.phase === PH_WIN ? 'double' : 'bonus'
  const node = S.flow.node
  try {
    await claimReward(() => {
      rewardClaimed.value = true
      S.campaign.blooms = setBit(S.campaign.blooms, node)
      save()
      pop('bloom', '#ffd76a', 640, 300, {})
      sfx('snap', 3)
      haptic('reward')
      track('reward_claim', { kind, node })
      void flushSaveNow()
    })
  } finally {
    onMusicResume()
  }
}
```

The map's Twin Gift component (§8/§11's presentation, C8's 1.2 s
press-and-hold gate) and `duel`'s loss beat both import `rewardLive`,
`canClaimBloom` and `claimDuelReward` from this one module rather than
duplicating the claim/rate-limit logic — `useAdGate.ts` itself is
untouched by this lift (M21 moves the CALLER, not the gate).

**R-9, amending M21: `maybeShowInterstitial()` stays in the duel
controller, full stop — `useDuelRewards.ts` holds REWARD logic only, never
interstitial logic.** The two were named in the same breath in Round-2's
draft (both were private to `GameScene.vue` before the lift) but they do
not share a call site once the Twin Gift moves to the map: the
interstitial is anchored to the win/loss BEAT itself (§4.9.3 — it has to
run before either `gotoScene('map')` or the retry choice, regardless of
whether a reward is ever offered), while the reward offer follows the
player to wherever the gift renders. Folding `maybeShowInterstitial` into
this composable would give the map a reason to import ad-sequencing code
it has no other need for. §11 is fixing the citations in other chapters
that assumed otherwise.

### §4.16 `SaveMergePolicy` scores campaign progress, not `am_ladder` (M22)

`src/utils/save/SaveMergePolicy.ts`'s `computeMeta()` reads `BEST_STAGE_KEY`
(`am_ladder`) today. §4.7 freezes that field at whatever a Step-1 build
last wrote and never updates it again — so left alone, two devices with
wildly different `S.campaign.furthestNode` progress would score identically
on `am_ladder`'s frozen number, and `decideMerge()` (unchanged elsewhere)
could pick the wrong side of a cloud conflict (I-10).

```ts
// src/utils/save/SaveMergePolicy.ts — computeMeta() change
// BEFORE: const bestStage = Math.max(0, safeInt(readField(read, BEST_STAGE_KEY), 0))
// AFTER:
const furthestNode = Math.max(0, safeInt(readField(read, 'furthestNode', CAMPAIGN_KEY), -1) + 1)
// `readField` gains an optional third argument naming which nested blob to
// read the sub-field from (default STATE_KEY as today) so it can reach
// `am_campaign.furthestNode` (nested, §4.4) the same way it already reaches
// `am_ladder` (flat) — both are sub-fields of ONE top-level blob key.
const chaptersRestored = countBits(safeString(readField(read, 'sectorsDone', CAMPAIGN_KEY))) // §7 may weight this differently; §4 only wires the read
const progressScore = furthestNode * 500 + chaptersRestored * 150 + runs * 10
```

`bestStage`/`maxStage` in `SaveMeta` (the type, unchanged shape) now holds
`furthestNode + 1` instead of the old 0-5 ladder rung — the SCALE changes
(0-50 instead of 0-5) but nothing downstream (`decideMerge`'s comparisons)
cares about the scale, only the ordering, so no other field in
`SaveMergePolicy.ts` needs to change. `SaveMergePolicy`'s
own `SCHEMA_VERSION` constant (currently `1`) is a SEPARATE counter from
this chapter's `am_schema` (§4.6) — the meta blob's shape did not change,
only which game field feeds its formula, so `SCHEMA_VERSION` stays `1`; a
comment is added at its declaration site saying so explicitly, to close
the naming confusion I-10/I-2 flagged between the two same-named-sounding
version counters.


---

## §5 Runes & recognition

Owner: Gesture. Depends on: §4 (the single `RuneDef` and `CampaignState`,
save slugs, migration), §6 (Signature Spell recipes for Crystal/Frost,
spell-matrix lookup, `RuneDef`'s combat sub-fields), §7 (telemetry pipe and
the retune harness), §9 (VFX-per-rune mapping in `fx.ts`'s `KIND_OF_RUNE` —
see §5.14.4 for the exact dependency this chapter has on it). All numbers
in this chapter are measured, not estimated. They were first explored in
two throwaway scratchpad scripts (`gest-experiment.mjs`, per-shape passes,
and `gest-full-alphabet.mjs`, the full 12-class Monte Carlo that produced
§5.8's numbers) — that is where the exploration happened, not where it
ends. The measurement harness is **committed to the repo** at
`tools/rune-spike/measure.mjs` (new file, §5.10/§5.11) so the S0 gate is
repeatable by anyone, not re-derived from a scratchpad transcript; it
imports `recognise`/`rawScore` from `src/game/duel/runes.ts` and every
generator from `src/game/duel/shapes.ts` (§5.14.1) directly, via the
project's existing `tools/ts-resolve.mjs` TS-import loader (the same
mechanism `tools/art-prompts.mjs` already uses), so the committed harness
always measures the real shipped code, never a hand-copied stand-in. Also
confirmed against `runes.ts` unmodified: `pnpm vitest run
tests/duel/runes.test.ts` (baseline, 9/9 green).

### §5.0 S0 results (as built, 2026-09-18)

S0 is **done**. The gate is `pnpm rune:spike` (`tools/rune-spike/measure.mjs`)
plus `tests/duel/rune-corpus.test.ts` and `tests/duel/rune-alphabet.test.ts`,
all run against the real `src/game/duel/runes.ts`. It passes on five seeds.
Where the real build departs from the numbers below, **this section wins**.

- **The frozen four are bit-identical.** The 525-stroke corpus was pinned
  BEFORE the refactor (FIRE 125/125, WIND 125/125, ICE 123/125 with 2 → WIND,
  EARTH 120/125 with 5 → FIRE, junk 25/25 rejected). It is unchanged after the
  refactor, and unchanged again with all 12 runes active. No story rune steals
  a shipped rune's stroke. With all 12 active, only the corpus's six circles
  change (to WATER), which is by design.
- **Measured at 1,000 sloppy draws per rune** (300 left too much seed noise:
  a rune really at ~95 % flickered across the gate):

  | Rune | Result |
  |---|---|
  | NATURE | 96.9–97.5 % |
  | WATER | 97.2–98.1 % |
  | LIGHTNING | 97.5–98.6 % |
  | ILLUSION | 99.7–99.8 % |
  | RAINBOW | 99.6–99.9 % |
  | TIME | 96.4–97.2 % |
  | MOON | 99.7–99.9 % |
  | LOVE | 99.8–100 % |

  The four shipped runes read 99.6–100 %. Junk false-accept is ≤ 1.0 %.
- **WATER = circle holds** (C1's contingency is cleared), and so does
  **TIME = hourglass**. No fallback applies.
- **Three departures from the numbers below, all measured:**
  1. **ILLUSION crossing gate.** The misses were never envelope misses. A
     player closes the loop with a small overshoot, so the stroke's last
     segment crosses its first and the count reads 2, not 1. Crossings are
     now counted on the stroke as drawn (open), ignoring pairs within 3
     segments of both ends (the seam). The envelope is unchanged; recall went
     from 94.0 % to ~99.7 %.
  2. **LOVE `ecMin` 5 → 4.** Every miss sat at ec 4.1–5.0 (the §5.11.4
     one-unit widening). Recall went from 94–95 % to ~99.9 %.
  3. **LIGHTNING variants `{1.5, 1.75, 2.0}` → `{1.5, 1.75, 1.9, 2.05}`**
     (8 templates; the bank is 132, not 130). Tight spirals drawn small and
     shaky were failing near 2 turns. A roomier-centred variant reached
     99.5 %, but it read a round-and-round scribble as lightning 75–100 % of
     the time, so it was rejected. The chosen set gives ~98 % with scribble
     false-accept ≤ 1 %.
- **Telemetry is wired** (§5.11.1 step 4).
  - `sim.ts` emits a `'stroke'` event and the scene tracks
    `recognition_attempt {success, rune, ec, turn, margin, sample}`.
  - The in-memory ring keeps every stroke. The portal sink gets every
    rejection but only one success in ten (`sample: 10`), so a duel stays a
    handful of portal events.
- **Not in S0.** These are deferred:
  - `glyph.ts` drawings for the 8 new runes (they first appear in the HUD
    at S2);
  - near-miss "almost a …!" feedback (§5.12, `[S1]`);
  - passing `S.campaign.runesUnlocked` into `recognise()`. `sim.ts` still
    calls it with the default mask, so the live game recognises exactly the
    four shipped runes until S2.

### §5.1 Scope and the frozen four

The four shipped runes — `src/game/duel/runes.ts`, ids 0–3
(FIRE/WIND/ICE/EARTH) — do not change: same `N=32` resample, same
`vectorise()` non-uniform bbox scaling, same Protractor `score()`, same
`THRESH=0.78`, same per-rune `ENV` bounds, same ring/direction template
construction. §5.10's frozen-corpus test is the mechanical proof of this,
and it is a **prerequisite for S0** — it must exist and pass against
today's `runes.ts` *before* a single new template is added, so that any
future diff to this file is checked against a real fixture, not a promise.

**Non-goals for v1** (all ruled by C1 in `RULINGS.md`, cited here without
repeating the ids):
- No multistroke input. Every stroke still commits the instant the pointer
  lifts (`sim.ts:strokeEnd`, unchanged). No shape in §5.2 requires two strokes.
- No rotation-bounded / orientation-sensitive matching. Every rune, old or
  new, is matched with Protractor's full optimal-rotation search. `[later]`
  if a future rune genuinely needs it — none of the 8 do, measured in §5.8.
- No ML model, no $P/$Q/$N. `$1`+Protractor stays the whole algorithm.
- No per-age tolerance knob on `THRESH`/`ENV`. Forgiveness is bought by
  restricting the active alphabet (§5.7.2), by near-miss feedback (§5.12),
  and by trace-assist (§5.13) — never by loosening a shared threshold, which
  would cost every other rune's margin (this is the reason a shared-band
  system can't have three age-tuned copies of itself).

### §5.2 The 12-rune alphabet

ids are append-only and never renumbered (`RULINGS.md` C28 slug rule; §4
owns the actual slug/migration table — this chapter states the shape/element
side only). Crystal (ch.4) and Frost (ch.8) are **not** in this table: they
have no shape, id, template or envelope. They are Signature Spells — recipes
over runes the player already owns — and belong to §6.

| id | slug | Chapter | Element (tactic, §6) | Shape | Family | Unlock |
|---|---|---|---|---|---|---|
| 0 | `fire` | — | Fire | Triangle △ | closed ring | always (frozen) |
| 1 | `wind` | — | Wind | 2–4 hump wave | open | always (frozen) |
| 2 | `ice` | — | Ice | Z | open | always (frozen) |
| 3 | `earth` | — | Earth | Square □ | closed ring | always (frozen) |
| 4 | `nature` | 1 Whispering Woods | Nature | Chevron (leaf) V | open | ch.1 node 5 (boss chest) |
| 5 | `water` | 2 Bubble Bay | Water | Circle ○ | closed ring | ch.2 node 5 |
| 6 | `lightning` | 3 Cloud Kingdom | Lightning | Spiral (inward, ~1.75 turns) | open | ch.3 node 5 |
| 7 | `illusion` | 5 Mirror Mountains | Illusion | Infinity ∞ | closed, self-crossing | ch.5 node 5 |
| 8 | `rainbow` | 6 Rainbow Ridge | Rainbow | Arch ∩ (fixed orientation) | open | ch.6 node 5 |
| 9 | `time` | 7 Sunken Sands | Time | Hourglass (true bowtie outline) | closed, self-touching | ch.7 node 5 — **fragile, see §5.11.5** |
| 10 | `moon` | 9 Starlight Summit | Moon & stars | 5-point star ☆ | closed ring | ch.9 node 5 |
| 11 | `love` | 10 Friendship Festival | Love | Heart ♡ (sharp-cusp, §5.9) | closed ring | ch.10 node 5 |

`RUNE_IDS` (today `['fire','wind','ice','earth']` in `config.ts`) grows to
12 entries in this exact order. `comboKey`'s delimiter fix (`RULINGS.md`
C15, §4/§6) is a hard prerequisite for ids ≥ 10 — without it `[11]` and
`[1,1]` collide as `"11"`.

### §5.3 The recognition sub-fields of `RuneDef`

There is **one** `RuneDef`, published once by §4 (`RULINGS.md` M13) and
consumed by §5, §6 and §7. §5 does not define a second, competing type —
this section states exactly which of `RuneDef`'s fields belong to
recognition, so §4's schema owner has a checklist and no other chapter
re-derives these fields differently:

```ts
// — §5's five fields on RuneDef (recognition only) —
family: 'ring' | 'open'      // ring = closed loop, start-point+direction
                               // variants (like FIRE/EARTH today); open =
                               // direction-only variants (like ICE/WIND today)
variants: (() => number[])[] // 1+ parametric unit-space generators, each
                               // imported from `src/game/duel/shapes.ts`
                               // (§5.14.1). WIND today has 3 (hump count);
                               // LIGHTNING needs 3 (turn count, §5.8.3);
                               // everything else needs exactly 1.
env: [ecMin: number, ecMax: number, turnMin: number, turnMax: number]
windGate?: [min: number, max: number]   // §5.6.2, optional secondary gate
crossingGate?: number                    // §5.6.1, optional secondary gate
```

`id: number`, `slug: string`, and `unlockChapter: number` are **common**
fields §4 owns and this chapter only reads (§5.2's table states this
chapter's assumed *values* for them — id order and unlock chapter — not
their type, which is §4's to declare once). `RuneDef`'s combat side — one
`(kind, dmg, ex)` triple per draw length 1–3 — is §6.3's `New-rune base
table`, folded into the same `RuneDef` per M13; §5 never reads, restates,
or depends on those fields. `recognise()` (§5.7) touches only the five
fields listed above when it builds its template bank and envelope table by
mapping over `RuneDef[]`, once at module load (as today, not per stroke).
Nothing about `resample`, `vectorise`, `score`, or `feat`'s core (ec, turn)
changes.

### §5.4 Template construction — parametric definitions

All coordinates are unit-space (the same space `shapes.ts`'s
`regularPolygon()`/`zigzagZ()`/`wave()` generate in, §5.14.1, before
`vectorise()`'s non-uniform bbox scale). Ring families get the existing
`addRing()` treatment (8 start-offsets × 2 directions = 16 templates); open
families get `addOpen()` (1 template per variant × 2 directions).

**0 FIRE, 3 EARTH** (frozen) — `regularPolygon(3)`, `regularPolygon(4)`
(today's in-file `poly()`, moved to `shapes.ts` unchanged, §5.14.1):
corners on a circle, `per = 96/corners` points per edge. Unchanged.

**1 WIND** (frozen) — `wave(humps, dir)`: `y = sin(t·π·humps)·0.55` for
`humps ∈ {2,3,4}`, `t ∈ [0,1]`, `x` linear. Unchanged.

**2 ICE** (frozen) — `zigzagZ(dir)` (today's in-file `zed()`, moved to
`shapes.ts` unchanged, §5.14.1): the 4-vertex Z polyline. Unchanged.

**4 NATURE — chevron** (open, 1 variant, no ring needed — see §5.5 why one
fixed orientation is enough): two segments from `(-1,-1)` to `(0,1)` to
`(1,-1)`, 40 samples per segment. This is a 2-corner open V; rotation
invariance already makes "V" / "<" / "∧" the identical gesture (Round-1
GEST-8, measured 1.000 bank-vs-bank), so exactly one orientation is
generated — the glyph (§5.14) may still be *drawn* pointing up for
legibility, that is a rendering choice, not a second template.

**5 WATER — circle**: `circle()` (`shapes.ts`'s wrapper over
`regularPolygon(64)` — a 64-sided regular polygon is indistinguishable
from a true circle at N=32 resample). Ring family, both directions.

**6 LIGHTNING — spiral**: `spiral(turns)`: for `t ∈ [0,1]`,
`a = t·τ·turns`, `r = 1 − 0.85t`, point `= (cos(a)·r, sin(a)·r)`. **Three
variants, `turns ∈ {1.5, 1.75, 2.0}`**, each × 2 directions = 6 templates —
this is not optional (§5.8.3: a single-variant spiral bank measured only
65.0% recall; three variants raised it to 95.7%, the same "cover the
player's actual spread" fix WIND already uses for hump-count).

**7 ILLUSION — infinity**: `infinity()`: for `t ∈ [0, τ]`,
point `= (cos t, sin t · cos t)` (a Gerono lemniscate — crosses itself
exactly once, at the origin). Ring family (it is a closed loop), both directions.

**8 RAINBOW — arch**: `arc(180°, 360°)`: 96-point semicircular arc, **one
fixed orientation only** (opening down). Open family, both directions. No
second arc (C, U) is ever built — C1 rules exactly one arc rune, and §5.8.2
shows why: ∩/C/U bank-score 0.93–1.00 against each other (Round-1 GEST-5).

**9 TIME — hourglass (true bowtie outline)**: `hourglassBowtie()`, a
6-vertex polyline
`(-1,-1)→(0,0)→(1,-1)→(1,1)→(0,0)→(-1,1)→(-1,-1)`: two triangles sharing the
center pinch point, traced without lifting the pen. Ring family (closed,
self-touching at the center), both directions. **Not** the naive
"TL→BR→TR→BL" attempt — that one measured 99.7% collision with FIRE
(Round-1 GEST-12) and is never built.

**10 MOON — 5-point star**: `star(5, 0.42)`, 10 vertices alternating radius
1.0 (outer) / 0.42 (inner) around the circle, straight edges between them
(not the smooth `per=24` interpolation tried in Round 1 — the exact-edge
version is what's specified here). Ring family, both directions.

**11 LOVE — heart, sharp-cusp candidate H1** (adopted — see §5.9 for the
rejected H2 and why): `heart()`. Two lower-half-circle lobes (radius 0.5, centered at
`(±0.5, −0.35)`) whose bottom tangent points connect by straight lines down
to a single sharp point at `(0, 1)`. The top stays open between the two
lobes' upper tangent points — this is the cusp: a real geometric notch, not
a smooth curve through it (§5.9 explains why this matters). Ring family
(closed once the two lobes + two tangent lines are traced start-to-end),
both directions.

### §5.5 Envelopes — measured numbers

`[ecMin, ecMax, turnMin, turnMax]`, from the full 12-class Monte Carlo in
§5.8 (300 sloppy draws per rune: random rotation 0–360°, non-uniform aspect
0.65–1.6×, size 45–260 px, jitter 0–7 px — the same noise model
`tests/duel/runes.test.ts` already exercises for the frozen four, extended
to cover the size/aspect spread a real touch/mouse input produces):

| id | Rune | ec | turn | secondary gate |
|---|---|---|---|---|
| 0 | FIRE | [2, 9] | [3.4, 9] | — (frozen) |
| 1 | WIND | [3.5, 17] | [2.7, 12] | — (frozen) |
| 2 | ICE | [1.5, 6.5] | [4, 8.8] | — (frozen) |
| 3 | EARTH | [4, 12.5] | [3.6, 8] | — (frozen) |
| 4 | NATURE | [1.1, 2.8] | [1.85, 3.9] | — |
| 5 | WATER | [18, 30] | [4.2, 8.0] | `\|wind\| ≤ 1.3` (§5.6.2) |
| 6 | LIGHTNING | [9, 30] | [6.0, 16] | `\|wind\| ≥ 1.3` (§5.6.2) |
| 7 | ILLUSION | [10, 18.5] | [7.0, 10.2] | `crossings === 1` (§5.6.1) |
| 8 | RAINBOW | [6, 30] | [2.4, 5.2] | — |
| 9 | TIME | [5.5, 9.0] | [8.5, 11.5] | — |
| 10 | MOON | [5, 10] | [9.5, 13] | — |
| 11 | LOVE | [5, 12.5] | [9, 14.5] | — |

Two things to read off this table directly:
- **WATER's `ecMin=18` is the entire safety argument for Circle** (C1 point
  3): every frozen rune's `ecMax ≤ 17`, so a stroke cannot pass WATER's
  envelope and a frozen envelope at once — the two are numerically disjoint
  by construction, not by luck. §5.8.1 confirms this holds under Monte Carlo,
  not just on paper.
- **ec alone cannot separate WATER from LIGHTNING** (their `ec` ranges
  overlap, [18,30] vs [9,30]) **or MOON from LOVE** (ec [5,10] vs [5,12.5]) —
  this is why the winding gate (§5.6.2) exists for the first pair, and why
  the second pair is resolved by `turn` plus accepting the small
  cross-leakage measured in §5.8 (TIME↔MOON, 2.3%) as within budget rather
  than chasing a fully disjoint band that doesn't exist (Round-1 GEST-13/14:
  14 shapes compete for one number line; some residual overlap is the honest
  ceiling, not a bug).

### §5.6 New structural features

Both are computed once per stroke, on the same 32-point resampled,
3-blur-pass-smoothed polyline `feat()` already builds — no new
preprocessing pass, no new resample.

#### §5.6.1 Crossing count (for ILLUSION)

On the resampled 32-point polyline, treat consecutive points as line
segments (32 segments for a closed shape, wrapping). Count how many
non-adjacent segment pairs intersect, with the standard orientation test:
for segments `(a1,a2)` and `(b1,b2)`, using the 2D cross-product sign
function `d(p,q,r) = (q.x−p.x)(r.y−p.y) − (q.y−p.y)(r.x−p.x)`, the segments
cross iff `d(a1,a2,b1)` and `d(a1,a2,b2)` have opposite signs **and**
`d(b1,b2,a1)` and `d(b1,b2,a2)` have opposite signs. `O(32²)=1024`
comparisons, a few thousand flops — negligible (§5.15).
**ILLUSION requires exactly 1 crossing.** None of the frozen four, and none
of the other 7 new runes, self-intersect, so this gate only ever *removes* a
false accept, never blocks a correct one, for every rune except ILLUSION itself.

#### §5.6.2 Signed cumulative turn ("winding"), for WATER vs LIGHTNING

`feat()` already sums `Σ|turn_i|` (the existing `turn` feature, always
positive). The winding feature is the **same loop, without the absolute
value**: `winding = (Σ turn_i) / τ`. For a shape whose curvature never
changes sign (a circle, a spiral, any convex loop drawn in one rotational
direction), `Σ turn_i ≈ Σ|turn_i|`, so `winding` and `turn/τ` nearly agree —
that is exactly the case that needs separating. For a shape whose curvature
alternates sign (WIND's wave, ICE's Z), the signed sum cancels toward 0 even
though `turn` (absolute) is large.

Measured clean-instance winding: a 1.0-rev circle ≈ **0.93**; a 1.3-rev
"overshoot" circle (a 3-year-old commonly over-rotates past the closure
point) ≈ **1.21**; a 1.5-turn spiral ≈ **1.38**; a 1.75-turn spiral ≈
**1.60**; the frozen four ≈ **0.00–0.75** (WIND/ICE are open shapes with
alternating or partial curvature, winding ≈0; FIRE/EARTH ≈0.67–0.75, always
< 1 because a polygon's per-vertex turning is under-counted by the blur
before it fully closes the loop). **Gate: WATER requires `|winding| ≤ 1.3`,
LIGHTNING requires `|winding| ≥ 1.3`.** §5.8.3 shows this closes the one real
cross-rune leak found in tuning (a low-turn-count spiral template pulling
sloppy circle draws toward LIGHTNING once 3 spiral variants existed).

Both gates are pure additions to `feat()`'s existing loop (one more running
sum, no extra pass) — cost is unmeasurable against the existing 3-blur-pass
work.

### §5.7 The decision pipeline

`recognise()` gains exactly one new, optional parameter — a bitmask, not a
campaign reference:

```ts
export const FROZEN_MASK = 0b1111 // bits 0-3: FIRE, WIND, ICE, EARTH

export const recognise = (
  raw: readonly number[],
  activeMask: number = FROZEN_MASK
): Rune | -1 => { /* … */ }
```

```
recognise(raw, activeMask = FROZEN_MASK /* 0b1111 */):
  if raw too short / too small → -1                      (unchanged, sim.ts's own
                                                            pre-filter, and runes.ts's
                                                            own length/pathLen guard)
  rs = resample(raw); v = vectorise(rs)
  active = RUNE_DEFS.filter(r => (activeMask >> r.id) & 1)   (§5.7.2)
  for each RuneDef in active:
    bs[def] = max(score(v, tv) for tv in def's templates)
  f = feat(rs)          // {ec, turn, wind}
  crossings = crossingCount(rs)   // only computed if any active def needs it
  bestR = -1; bestS = THRESH (0.78, unchanged)
  for each RuneDef in active, IN ID ORDER (0..11 — frozen four always checked first):
    if bs[def] > bestS
       and f.ec in def.env.ec and f.turn in def.env.turn
       and (no windGate or f.wind passes it)
       and (no crossingGate or crossings === def.crossingGate):
      bestR = def; bestS = bs[def]
  return bestR.id or -1
```

`runes.ts` **never imports `S.campaign`, `state.ts`, or anything under
`src/game/campaign/`** — `recognise()` stays exactly as pure as it is today
(a function of a stroke and, now, one plain `number`). This closes I-1/I-19
directly: there is no `campaign.furthestChapter` or `furthestChapterReached`
field anywhere in this chapter any more, because no such field exists in
§4's real `CampaignState` — the bitmask the caller passes is
`S.campaign.runesUnlocked` (§4's actual field, an `int` bitmask, bit *i* =
rune *i* unlocked, default `0b0000_1111`), read and passed by the ONE
caller that has campaign access: the duel controller
(`sim.ts:strokeEnd`, or `GameScene.vue` before §4's M11 relocation lands),
as `recognise(S.pts, S.campaign.runesUnlocked)`.

**With the default argument, every existing call site is unchanged.**
`sim.ts:strokeEnd`'s `recognise(S.pts)` and every call in today's
`tests/duel/runes.test.ts` pass exactly one argument; omitting `activeMask`
is indistinguishable from calling the pre-refactor single-argument
function, because `FROZEN_MASK` (`0b1111`) is bit-for-bit the same "ids
0-3, always on" set today's hard-coded `for (let r = 0; r < 4; r++)` loop
already assumes. No call site needs to change for this chapter's refactor
to land; only the one new call site (passing `runesUnlocked`) is additive.

This is `runes.ts`'s existing loop (`for r in 0..3`) generalised over a
runtime-filtered list instead of a hard-coded `0..3`. **Iterating in id
order, frozen four first, is what makes WATER's entry slot into the table
without touching the frozen four a structural guarantee, not a
convention**: `bs[FIRE]`/`bs[EARTH]`/`bs[ICE]`/`bs[WIND]` and their envelope
checks are computed from *only* the frozen four's own templates/env —
nothing in the loop for ids 4–11 can change what those four values are. The
only way a new rune can change a frozen rune's outcome is by **outscoring**
it after `bestS` has already been raised by a frozen rune passing — and
since a correct FIRE/EARTH/ICE/WIND draw's `ec/turn` can, by §5.5's
disjoint-range argument, never simultaneously satisfy a new rune's envelope
(WATER's floor `ecMin=18` alone rules out all four; the others are
similarly separated, per §5.8.1's explicit measurement), this cannot happen
for a *correctly drawn* frozen rune. It measurably does not happen at all:
§5.8.1's frozen-vs-full-bank comparison is bit-identical except one
**pre-existing** 0.3% FIRE/EARTH boundary case that is unrelated to any new
rune (proved below).

#### §5.7.1 WATER's entry in the rune table, precisely

WATER (id 5) is not a sibling class, a subtype, or a special case in the
algorithm — it is one more entry in the same `RuneDef[]` array, scored and
gated by the exact same loop as every other rune, including the frozen
four (I-35: there is no class hierarchy anywhere in this design, and none
should be built from this chapter's prose). Its safety comes entirely from
`ENV[WATER]` being numerically disjoint from every frozen `ENV`, which is a
*data* fact (§5.5's table), not a *code* branch. This is deliberate: it
means the same argument that makes Circle safe today would make any future
rune safe, provided its envelope is chosen the same way, and it means the
S0 falsification gate (§5.11.5) is a data check (do the measured p5–p95
bands actually stay disjoint under load) rather than a code review.

#### §5.7.2 Recognition restricted to unlocked runes

`active` in the pipeline above is **not** `RUNE_DEFS` — it is filtered by
`activeMask`, a plain bitmask over rune ids, which the duel controller sets
to `S.campaign.runesUnlocked` (§4's real field; there is no
`furthestChapter`/`furthestChapterReached` field, deleted from this
chapter's assumptions per M13). This is an accuracy measure, not a
performance one (§5.15 — even the full 12-class bank is trivial to score).
Concretely: a chapter-2 player's mask is `0b0011_1111` (bits 0-5: FIRE,
WIND, ICE, EARTH, NATURE, WATER) — 6 entries active, not 12. This matters
for exactly one thing measured in Round 1 and still true here: **it
improves new-vs-new collisions for runes not yet mutually unlocked** (e.g.
a chapter-3 player's spiral never has to be told apart from a chapter-9
star, because bit 10 isn't set in their mask yet). It does **not** change
any of the frozen-vs-new numbers in §5.5/§5.8, because the frozen four's
bits (0-3) are set in every mask this chapter ever constructs — `FROZEN_MASK`
itself is the numeric floor every wider mask is built from.

Rune-replay of an earlier node (`RULINGS.md` C24) uses the player's
*current* unlocked set, not the set unlocked at that node's original
chapter — a returning player drawing a chapter-1 leaf after unlocking the
heart should not suddenly have a narrower, easier-to-hit alphabet than the
one they actually play with; consistency of the drawing surface across the
whole session is worth more than a marginal accuracy gain on replays.

### §5.8 Measured results — full 12-class Monte Carlo

First measured in the scratchpad exploration (`gest-full-alphabet.mjs`),
reproduced by the committed `tools/rune-spike/measure.mjs` (§5.10/§5.11):
all 12 `RuneDef`s constructed exactly as
§5.4/§5.5/§5.6 specify (130 templates total, §5.15), then 300 sloppy draws
per intended shape, classified through §5.7's pipeline. `THRESH=0.78`, unchanged.

#### §5.8.1 The frozen four, inside the 12-class bank

| Intended | Result |
|---|---|
| FIRE | FIRE 100.0% |
| WIND | WIND 100.0% |
| ICE | ICE 100.0% |
| EARTH | EARTH 99.7%, FIRE 0.3% |

The 0.3% (1 in 300) EARTH→FIRE case is **pre-existing in the shipped
recognizer**, not caused by adding new runes: `bs[FIRE]`, `bs[EARTH]` and
their `ENV` checks are computed only from FIRE's/EARTH's own templates
(§5.7's loop), so no new class can alter them; it is a rare boundary case
where an already-sloppy square's blurred corners happen to score higher
against a triangle template than a square one, and *also* clears FIRE's own
envelope. Confirmed directly: re-running the same shape generator against a
**frozen-4-only** bank (no new templates present at all) reproduces the
identical rare-boundary character of the decision (a few-per-thousand
FIRE/EARTH split at the envelope edge exists independent of what else is in
the bank). This is precisely the behavior §5.10's frozen-corpus test freezes
— it is not a target to drive to zero, it is a fact about the shipped
`THRESH`/`ENV` to pin so nobody "fixes" it by accident later and calls it a
feature.

#### §5.8.2 The 8 new runes

| id | Rune | Correct | Leakage | Rejected |
|---|---|---|---|---|
| 4 | NATURE | 96.3% | 2.3% FIRE | 1.3% |
| 5 | WATER | 97.3% | 1.3% RAINBOW | 1.3% |
| 6 | LIGHTNING | 95.7% | 0% | 4.3% |
| 7 | ILLUSION | 94.0% | 0% | 6.0% |
| 8 | RAINBOW | 99.3% | 0.7% FIRE | 0% |
| 9 | TIME | 96.0% | 2.3% MOON | 1.7% |
| 10 | MOON | 99.7% | 0% | 0.3% |
| 11 | LOVE | 95.3% | 0% | 4.7% |

7 of 8 clear the ≥95% target (§5.11's bar) outright. **ILLUSION at 94.0% is
the one rune below target**, and its shortfall is 100% safe (pure
rejection, 0% into any other rune) — an S0 tuning pass widening `ec`/`turn`
by another point in each direction is the expected fix, budgeted in §5.11.4,
not a redesign.

Junk false-accept, same bank, same 300-sample protocol, four junk shapes
(straight swipe, diagonal swipe, a genuine two-loop scribble, a tap):
**0.0–0.3% across all four** — comfortably under the ≤5% target, and lower
than the frozen-four-only system's own junk rate reported in Round 1 (junk
was already ≤ a few %; 12 classes did not make junk more dangerous, because
every new envelope is still a *narrow* band, not a catch-all).

#### §5.8.3 The one real tuning story: LIGHTNING vs WATER

First pass (single spiral-turn-count template, `turns=1.75` only): LIGHTNING
recall was **65.0%**, 35.0% rejected — the shape score itself, not the
envelope, was too often below `THRESH` at extreme aspect (0.65–1.6×) and
small size (down to 45 px), where a squashed few-turn spiral's point cloud
stops resembling the one fixed template well. Adding two more turn-count
variants (`{1.5, 1.75, 2.0} × 2 directions` = 6 templates, mirroring how
WIND already covers 3 hump counts) raised recall to **95.7%** — but this
*introduced* a new leak: WATER dropped from 97.3% to 87.3%, with 10.0%
of sloppy circles now reading as LIGHTNING, because a 1.5-turn spiral
template and a slightly-overshot circle are genuinely similar in both shape
and `turn` magnitude (measured clean-instance: a 1.3-rev circle turns ≈7.59,
a 1.5-turn spiral turns ≈8.68 — only 1.1 apart). The winding gate (§5.6.2,
`|wind| ≤ 1.3` for WATER, `≥ 1.3` for LIGHTNING) closed this exactly:
WATER back to 97.3%, LIGHTNING holds at 95.7%, 0% cross-leak between them.
**This is the concrete answer to "spiral vs circle must be separated,
probably by total turn": turn alone gets a 1.8-unit gap in the single-variant
case, but stops being sufficient once LIGHTNING needs multiple turn-count
templates for its own recall — winding is what survives that widening.**

### §5.9 The heart iteration plan

C1/GEST-10: the finale rune cannot be a smooth one-stroke curve (measured
Round 1: 74% WIND, 17% FIRE, 9% rejected, 0% "heart") and cannot be dropped.
Two candidate geometries were built and measured against the full 12-class
bank:

- **H1 — circular lobes + straight tangents to a sharp bottom point**
  (§5.4's `LOVE` definition). Clean-instance `ec=8.50, turn=11.59`. Full
  Monte Carlo: **95.3% correct, 4.7% rejected, 0% collision with any other
  rune.** Meets the ≥95% bar. **Adopted.**
- **H2 — fully straight-edged ("spade") lobes**, 6 sharp corners, no curved
  segment anywhere. Clean-instance `ec=2.91, turn=7.80` — this lands almost
  inside FIRE's own envelope (`ec[2,9]`). Full Monte Carlo: **18.0% correct,
  37.3% FIRE, 44.7% rejected.** A 6-corner shape with this little curvature
  reads structurally as "a slightly odd triangle," not as a heart.
  **Rejected.**

The lesson generalises, and matters for anyone hand-authoring a future
glyph: **a heart needs genuine curvature in its lobes to hold a high `ec`
away from FIRE's low-corner-count territory, plus one real sharp point to
hold a `turn`/`ec` combination away from a plain circle or star.** H1's
specific numbers (`ec[5,12.5]`, `turn[9,14.5]`, §5.5) are the S0 starting
point; if playtesting finds H1's silhouette reads as "not enough like a
heart" to the target audience (a UX/art call, not a recognition one), the
fix is to adjust the *lobe radius and cusp depth* within H1's family and
re-measure — not to flatten it toward H2.

### §5.10 The frozen-corpus regression test

**These file paths are canonical for the whole spec** (I-20: §1.2's S0
exit-criteria row is being corrected to cite them, not the other way
around — §5 is this test's owning chapter). **New files** (do not exist
today): `tests/duel/rune-corpus.gen.ts` (the generator) and
`tests/duel/rune-corpus.test.ts` (the assertion), alongside the existing
`tests/duel/runes.test.ts` (which stays, unchanged, as the hand-picked
sanity net — this is a second, denser net, not a replacement).

- **`activeMask` usage:** every one of the 525 fixture strokes is
  classified with `recognise(stroke, FROZEN_MASK)` for the frozen-four
  assertions (§5.7's default, `0b1111` — this is also what an *omitted*
  second argument does, so the test is free to call `recognise(stroke)`
  with one argument and get the identical, explicit result). Once ids 4–11
  exist, a second fixture run classifies the same junk set plus each new
  rune's own corpus with an **explicit** wider mask
  (`0b1111_1111_1111`, all 12 bits) — never the default — so a future
  reader can see, from the call site alone, which numbers are pinning the
  frozen four and which are exercising the full alphabet.
- **Generator:** reuse `tests/duel/runes.test.ts`'s own `trace()` and
  `jitter()` helpers (already in the repo) plus `seeded()` from
  `src/game/duel/util.ts` — the same deterministic PRNG the project already
  uses for reproducible jitter. Seed: **`7`** (already the file's own
  default jitter seed, kept for continuity — any fixed seed works, this one
  needs no new constant).
- **Count: 500 fixed strokes** — for each of the 4 frozen runes: 5 sizes ×
  5 rotations × 5 jitter amplitudes × (both directions, and for FIRE/EARTH
  every 4th start-offset) ≈ 125 strokes per rune = 500 total, plus a fixed
  25-item junk set (straight/diagonal swipes, circles at 3 radii, taps,
  scribbles) appended as a 6th "bucket" whose expected result is always `-1`.
- **Procedure:** run today's `recognise()` once over all 525 strokes, write
  the resulting `Rune | -1` array to a checked-in JSON fixture
  (`tests/duel/rune-corpus.fixture.json`, new file). The test re-generates
  the identical 525 strokes (same seed) every run and asserts byte-for-byte
  equality against the fixture.
- **What changes this test can never silently pass through:** any edit to
  `N`, `THRESH`, any `ENV` row, the blur-pass count, `resample`/`vectorise`'s
  math, or the ring/offset construction for ids 0–3. A deliberate change
  updates the fixture in the same commit, which is the point — it makes
  "the four stay bit-identical" a `git diff` reviewers can see, not a hope.
- **[S0]** this test must exist and pass *before* any `RuneDef` for ids 4–11
  is added to the codebase (C1/`RULINGS.md`: "a frozen-corpus snapshot test
  proves it before any new rune lands").

### §5.11 The S0 spike protocol

**[S0]**. Goal: prove §5.5's envelopes and §5.6's gates hold up as real code
(not just this chapter's Node harness) before any chapter's content work
starts, and decide WATER's (and, contingently, TIME's) fate.

#### §5.11.1 Build order
1. Land §5.10's frozen-corpus test against unmodified `runes.ts`. Green.
2. Refactor `runes.ts` to the data-driven `RuneDef[]` shape (§4's type,
   §5.3's recognition sub-fields), ids 0–3 only, reproducing today's
   hard-coded banks/envelopes exactly, and add the `activeMask` parameter
   (§5.7, default `FROZEN_MASK`). Re-run §5.10 — still green (this step
   must not change a single classification; it is a pure refactor, and the
   frozen-corpus test is what proves that).
3. Add `RuneDef`s for ids 4–11 per §5.4/§5.5/§5.6, in id order.
4. Wire `sim.ts`'s telemetry (§5.16) so S0's own trial sessions produce real
   `recognition_attempt` events, not just this harness's synthetic numbers.

#### §5.11.2 Pass/fail thresholds, per rune

Reuses §5.10's synthetic-corpus *method* (deterministic seeded generation,
random rotation/aspect/size/jitter matching §5.8's protocol) but now run
against the **real, shipped** `recognise()` after step 3 above — this
chapter's numbers are the *expected* result, not a substitute for re-running
it in the real file.

- **Target: ≥95% correct-classification** on 300 sloppy draws per new rune
  (id 4–11), measured the same way as §5.8.2.
- **Junk false-accept: ≤5%** across the four junk shapes in §5.10's fixture,
  against the *full* 12-class bank.
- **Frozen four: bit-identical to §5.10's fixture.** Zero tolerance — any
  deviation fails S0 outright and blocks everything downstream, regardless
  of how the new runes score.

#### §5.11.3 Per-rune starting numbers (this chapter's measured baseline)

| id | Rune | Baseline | Verdict if reproduced |
|---|---|---|---|
| 4 | NATURE | 96.3% | pass |
| 5 | WATER | 97.3% | pass — **this is C1's contingency: if the real build reproduces ≥95%, Circle ships** |
| 6 | LIGHTNING | 95.7% (needs the 3-variant bank + winding gate, §5.8.3) | pass, but implement the multi-variant bank exactly — the 1-variant version measured 65% |
| 7 | ILLUSION | 94.0% | **below target** — budget one tuning pass (widen `ec`/`turn` ~1 unit each way, re-measure; §5.8.2 shows the shortfall is pure rejection, not collision, so this is low-risk) |
| 8 | RAINBOW | 99.3% | pass |
| 9 | TIME | 96.0% | pass, but see §5.11.5 — this is C1's OTHER contingency |
| 10 | MOON | 99.7% | pass |
| 11 | LOVE | 95.3% (H1 geometry, §5.9) | pass — build H1 exactly, not H2 |

#### §5.11.4 If a rune fails S0

- **ILLUSION (expected near-miss):** widen its envelope by ≤1 ec unit and
  ≤0.5 turn units on the side the failure clusters on, re-measure. This is
  the normal, budgeted case, not an escalation.
- **Any rune whose real-code number is far below its baseline here** (more
  than ~5 points off in either direction) means the `RuneDef` was built
  differently from §5.4's specification — check the generator function
  first, before touching the envelope. A big gap between this chapter's
  harness and the real build is a wiring bug, not a new discovery about the
  shape.

#### §5.11.5 The two contingent rulings — falsification gates

**WATER = Circle** (C1 point 3, overruling Round-1 GEST-4/17) is contingent
on S0. The gate that would **falsify** it:
- WATER's real-build recall drops below **90%** (a 5-point cushion under
  the 95% target — below 90% means the envelope isn't a tuning problem, the
  shape itself doesn't hold up), **or**
- Junk false-accept against the full bank exceeds **5%** specifically
  because of WATER's envelope (i.e. removing WATER's `RuneDef` from the
  junk test drops the false-accept rate back under 5%), **or**
- The frozen-corpus test (§5.10) fails with WATER's `RuneDef` present but
  passes with it removed — i.e. Circle turns out to steal a frozen
  classification in the real build despite §5.7.1's disjoint-envelope
  argument (this would mean a bug in the real implementation, not a flaw in
  the design, but it still falsifies shipping it as designed).

**Fallback if WATER fails:** per the coordinator's ruling, **Water becomes
Lightning's shape (Spiral), and Lightning becomes a Signature Spell** (§6
picks the recipe, the same mechanism already used for Crystal/Frost). id 5's
slug stays `water`, its `RuneDef` is replaced with LIGHTNING's spiral
definition (§5.4/§5.5, unchanged geometry), id 6 (`lightning`) is removed
from the recognizable-rune table and added to §6's Signature-Spell list.
This is a data-table edit, not a recognizer redesign — the spiral geometry
and its measured 95.7%/winding-gate behavior do not change.

**TIME = Hourglass** (C1, chapter 7) is the second, independently-contingent
shape. The gate that would falsify it is identical in form to WATER's
(< 90% real-build recall, or a demonstrated frozen-corpus/junk regression
traceable to TIME's `RuneDef`), using **92.7% rejected / 7.3% FIRE** (this
chapter's challenge, not the 100%/0% RULINGS.md F7 stated) as the
pre-multi-template-bank baseline to beat — the measured 96.0% in §5.8.2
already clears the 95% target with the dedicated envelope, so TIME's real
risk is narrower than F7 implied, but the fallback stays specified:
**Time becomes a Signature Spell** (§6 picks the recipe; id 9 is removed
from the recognizable-rune table).

### §5.12 Near-miss feedback via `rawScore`

`runes.ts` already exports `rawScore(raw): [Rune | -1, number]` — "exposed
for tuning/debug" per its own comment, currently unused outside test/tuning
code. §5's addition: when `recognise()` returns `-1`, `sim.ts:strokeEnd`
also calls `rawScore()` (same stroke, one extra pass — cost is one more
bank scan, §5.15) and, if the returned score is **≥ 0.60** (a margin below
`THRESH=0.78` chosen so only strokes that were *plausibly* attempting a real
rune — not pure junk — trigger the nudge; junk's measured scores in §5.8.2
sit well under this), the callout (`pop()` in `sim.ts`, today's flat
`notARune`) becomes an i18n key parameterised by the near-missed rune's
slug — e.g. `duel.almostRune` = "Almost a {rune}!" — instead of the generic
"try again" buzz. **Only active for unlocked runes** (§5.7.2's `active`
list) — never hints at a shape the player hasn't been shown yet.
**[S1]**: this needs one new i18n key family (`duel.almostRune`, all 21
locales, §10 owns the translations) and one new `pop()` call site; no
recognizer change. Non-goal: no near-miss hint fires for the frozen four's
*existing* behavior (they keep their plain `notARune` buzz) unless the
player has already unlocked at least one new rune — this avoids teaching a
chapter-1 player about shapes that don't exist yet.

### §5.13 Trace assist

`src/game/duel/glyph.ts`'s `glyphPoints(k, x, y, r, f)` already supports
`f < 1` (a partial-path walk used today for the intro's triangle trace) —
this is reused, not rebuilt, for a per-rune assist overlay:
- **When it shows:** the first time a given rune's chapter opens its
  boss-chest unlock beat (the dialogue moment right after a new rune is
  granted, §3/§10 own the exact scene), the new glyph is traced once,
  full-speed, as a "here's how to draw it" preview — this is existing
  onboarding behavior extended to 8 more `k` values (§5.14). Separately, an
  **assist toggle** (settings, off by default, `RULINGS.md` D-list doesn't
  cover this specifically — treat as a §2/§3 owner call on default-on for
  young players) keeps a faint ghost trace of the CURRENT rune-in-progress
  glyph visible under the drawing box whenever the player has drawn 0 full
  strokes yet on that duel — i.e. only before their first successful cast of
  a session, never as a permanent training-wheel overlay.
- **When it stops:** the moment `S.queue.length > 0` for the current duel
  (the player has landed at least one real rune) — the assist trace is a
  cold-start aid, not a permanent crutch, per `RULINGS.md` C14 ("no duel ever
  REQUIRES a new rune" — the assist exists to make trying a *new* rune less
  scary, not to be drawn over indefinitely).
- **Non-goal:** no live stroke-vs-template overlay ("you're 80% there") —
  that needs continuous scoring against a moving partial stroke, which is a
  materially bigger feature than this chapter's budget; `[later]` if
  telemetry (§5.16) shows the static ghost-trace isn't enough.

### §5.14 The shared shape module and clean glyph drawings

#### §5.14.1 `src/game/duel/shapes.ts` — exports (M15, owned by §5)

New file, owned by this chapter. `glyph.ts`'s existing philosophy — "ONE
geometry, two renderers" — is kept by moving every parametric shape
generator (frozen four included) into **one generator per rune family**,
never per individual rune, so `runes.ts`'s recognition templates (§5.4)
and `glyph.ts`'s clean-glyph drawings (§5.14.2) call the exact same
function and can never drift apart (the drift risk the file's own
docstring already names for the frozen four). This directly corrects
§9.9's independent "8 hand-authored parametric branches" plan (M15/I-14):
`glyph.ts` authors zero new curve math of its own.

```ts
// src/game/duel/shapes.ts — every export is a pure fn returning a flat
// unit-space [x,y,x,y,…] number[], exactly like today's in-file poly()/
// zed()/wave(). poly()/zed()/wave() move here unchanged in behavior
// (renamed regularPolygon/zigzagZ for clarity against the wider family
// list); every runes.ts/glyph.ts call site updates, no output changes.
export const regularPolygon = (corners: number): number[]        // FIRE (3), EARTH (4)
export const circle = (): number[]                                 // WATER — regularPolygon(64) internally
export const chevron = (openDeg: number): number[]                 // NATURE
export const zigzagZ = (dir: 1 | -1): number[]                      // ICE
export const wave = (humps: number, dir: 1 | -1): number[]          // WIND
export const spiral = (turns: number): number[]                     // LIGHTNING
export const arc = (startDeg: number, endDeg: number): number[]     // RAINBOW
export const infinity = (): number[]                                 // ILLUSION
export const hourglassBowtie = (): number[]                         // TIME
export const star = (points: number, innerRatio: number): number[]  // MOON (5, 0.42)
export const heart = (): number[]                                    // LOVE, H1 geometry (§5.9)
```

`runes.ts` imports every one of these for its template bank (§5.4);
`glyph.ts` imports the SAME functions for `glyphPoints()`'s new branches
(§5.14.2). Zero shape math is authored twice, and none lives in `glyph.ts`
itself any more.

#### §5.14.2 Clean glyph drawings for the 8 new runes

`glyph.ts`'s `SIDES` array (today `[3, 0, 3, 4]`, indexed by rune id, used
by the closed-polygon code path) extends:

| id | `SIDES[id]` equivalent | Rendering note |
|---|---|---|
| 4 NATURE | open, 2-segment (like today's `k===1` WIND special-case, but 2 points not a sine wave) | reuse `chevron()`'s 3 vertices directly |
| 5 WATER | closed, many-sided (`circle()`-equivalent) | draw as a true circle (`ctx.arc`) for crispness — `circle()`'s underlying `regularPolygon(64)` and a real `ctx.arc()` are visually identical at glyph size; no need to stroke 64 segments on screen |
| 6 LIGHTNING | open, parametric spiral | `spiral(1.75)`'s own path, walked by `f` for partial-trace |
| 7 ILLUSION | closed, self-crossing | `infinity()`'s own path |
| 8 RAINBOW | open, arc | `arc(180,360)`'s own path, or `ctx.arc()` with the matching sweep |
| 9 TIME | closed, self-touching | `hourglassBowtie()`'s 6-vertex path |
| 10 MOON | closed, 10-vertex star | `star(5, 0.42)`'s alternating-radius vertex list |
| 11 LOVE | closed, 6-segment (2 arcs + 2 lines, mirrored) | `heart()`'s own path; the two lobe arcs can use `ctx.arc()` for the curved segments, straight `lineTo` for the tangent lines to the point |

#### §5.14.3 Vue-side SVG rendering

`glyphSvgPath()` (the Vue-side renderer, used by rune slots/shop
plates/spellbook) gets the same paths via the same shared module — no
separate SVG-path authoring.

#### §5.14.4 Dependency on §9's VFX silhouette mapping

This chapter defines *shape*, never VFX. `fx.ts`'s cast/impact silhouette
picker (`KIND_OF_RUNE`, RULINGS F16/M25) is §9's file and §9's fix — §5
does not specify it and does not duplicate it here. §5's only requirement
of that mapping: it must be keyed by the **full rune id, 0–11**, not by
any `(rune & 3)`-style bitmask that wraps ids 4–11 back onto the frozen
four's silhouettes (the exact bug M25 names). This is a cross-chapter
dependency, not a §5 deliverable — recorded here only so the reference in
this chapter's header resolves to a real subsection instead of a dangling
citation.

### §5.15 Performance

Measured (§5.8, `tools/rune-spike/measure.mjs`): the full 12-class bank is **130
templates** (16 FIRE + 16 EARTH + 2 ICE + 6 WIND [unchanged] + 2 NATURE + 16
WATER + 6 LIGHTNING + 16 ILLUSION + 2 RAINBOW + 16 TIME + 16 MOON + 16
LOVE), each a `Float32Array(64)` (256 bytes) → **32.5 KB total**, against a
~310 KB zipped build. Per-stroke cost on `strokeEnd`: one `score()` call per
active template (§5.7.2 — typically far fewer than 130, since only unlocked
runes are active) plus one `feat()` pass (unchanged) plus, only when
ILLUSION is active, one `O(32²)=1024`-comparison crossing check. All of this
is a few thousand floating-point operations per pointer-release — the same
order of magnitude as today's 40-template, 4-class check, and sub-millisecond
on any target device. **No perf budget is needed here beyond "don't regress
the existing sub-millisecond number," which nothing in this chapter touches**
(§9 owns the actual frame-budget ledger; this chapter's ask of it is zero).

### §5.16 Telemetry consumption and retuning

`recognition_attempt {success, rune, ec, turn, margin}` (`RULINGS.md`,
"Numbers every chapter must share") fires from `sim.ts:strokeEnd` on every
completed stroke, `[S1]`. §5's field assumptions, stated for §7's schema owner:
- `success: boolean` — did `recognise()` return a rune id (true) or -1 (false).
- `rune: number | -1` — the returned id, or the *best-scoring* rune's id
  (via `rawScore()`, §5.12) when `success` is false — this is what makes the
  event useful for near-miss analysis, not just accuracy counting.
- `ec, turn: number` — the raw `feat()` output for this stroke, always
  logged regardless of outcome.
- `margin: number` — `bs[rune] − THRESH` for the winning (or best-scoring,
  if rejected) rune. A cluster of near-zero-margin successes for one rune
  across many sessions is the signal that its envelope is too tight for real
  hands, even though it "passed"; a cluster of small-negative-margin
  rejections is the signal an envelope is too narrow outright.

**How §5 uses it to retune, post-launch:**
- Per-rune success rate, bucketed by chapter-since-unlock (a rune's own
  accuracy should climb over a player's first few attempts as they learn the
  gesture — if it doesn't, the envelope, not the player, is the problem).
- `ec`/`turn` histograms per rune, compared against this chapter's §5.5
  bands — if the real-world p5–p95 drifts outside the shipped envelope
  (e.g. real hands draw LIGHTNING with more size variance than this
  chapter's synthetic 45–260 px range assumed), that is a direct, numeric
  re-tune input: widen the specific bound that the histogram overshoots, not
  a global change.
- Cross-rune confusion (the `rune` field on `success: false` events, or on
  `success: true` events where telemetry can also log "what almost won" —
  `[later]`, needs a second field, not built for S0) directly extends
  §5.8's Monte Carlo confusion matrix with *real* data, which is strictly
  better than synthetic noise once enough sessions exist (a few hundred
  per rune, per the same order of magnitude as this chapter's own
  Monte Carlo sample size).
- **This chapter's numbers are the S0 starting point, not the final,
  ship-forever constants.** Every `ENV`/gate value in §5.5/§5.6 is a
  `[S0]`-scope default; §7 owns the actual tuning-harness tooling that reads
  `recognition_attempt` and proposes envelope diffs, and any such diff must
  re-pass §5.10's frozen-corpus test before landing.

### §5.17 Explicit non-goals (recap)

- No multistroke input, ever, for any rune (§5.1).
- No orientation-bounded/rotation-limited matching (§5.1, §5.7's Circle
  argument specifically depends on full rotation invariance staying uniform
  across all 12 runes — a rune-specific rotation limit would break the
  "disjoint envelope ⇒ safe" proof for that rune).
- No ML model (Round-1 GEST-20's cost argument stands unchanged: none of
  this chapter's measured collisions are algorithm problems).
- No per-player/per-age `THRESH` or `ENV` tuning (§5.1, §5.13 covers
  forgiveness a different way).
- No live partial-stroke scoring overlay (§5.13, `[later]`).
- No shape for Crystal (ch.4) or Frost (ch.8) — Signature Spells, §6.


---

## §6 Duel rules

> Dissent (superseded): my Round-2 dissent about first-attempt vs. cumulative win-rate targets is
> now moot — M1's two-part C13 amendment (first-attempt bands per chapter group, plus a separate
> ≥95%-within-3-attempts clause) explicitly covers exactly the case my dissent was raised for. No
> remaining disagreement; §6.21 is regraded against the amended targets below.


Owner: Combat. Inputs: `story-GDD.md`; `src/game/duel/{config,sim,state,fx}.ts` as shipped
(commit `78b0041`); `RULINGS.md` §§1–2 (F1–F25, C1–C31); `duel-sim.mjs` (Analyst's harness,
DIST-corrected). Everything numeric below is a starting value, tuned by the test or telemetry
event named next to it — none are placeholders.

### §6.1 The rune alphabet: ids and tags

Twelve runes, ids `0`–`11`. The first four are frozen (§5 owns shape/recognition; this table only
adds the **tag** each rune carries into the generator, §6.2).

| id | name | shape (§5) | chapter | tag | [scope] |
|---|---|---|---|---|---|
| 0 | Fire | triangle | shipped | `damage` | `[shipped]` |
| 1 | Wind | wavy 2–4 hump | shipped | `damage` | `[shipped]` |
| 2 | Ice | Z | shipped | `damage` | `[shipped]` |
| 3 | Earth | square | shipped | `damage` | `[shipped]` |
| 4 | Nature | chevron V | 1 | `dot` | `[S2]` |
| 5 | Water | circle | 2 | `ward` | `[S3]` |
| 6 | Lightning | spiral | 3 | `pierce` | `[S3]` |
| 7 | Illusion | infinity ∞ | 5 | `decoy` | `[S4]` |
| 8 | Rainbow | arch ∩ | 6 | `wildcard` | `[S4]` |
| 9 | Time | hourglass | 7 | `slow` | `[S4]` |
| 10 | Moon & stars | 5-point star | 9 | `lifesteal` | `[S4]` |
| 11 | Love | heart | 10 | `finisher` | `[S4]` |

Two chapters (4 Crystal, 8 Frost) do **not** add a rune or a tag; they add a **Signature Spell**
(§6.5), a fixed recipe over runes already in this table.

`Tag` is the one piece of new data `runes.ts`/`config.ts` need per new rune. No rune carries two
tags. This table is the single source of truth for it; §4 owns where it physically lives (recommend
extending the existing rune-id table in `config.ts`, new file not required for this alone).

### §6.2 The compositional spell generator

Replaces "hand-author 364 combos" (`C(12+3-1,3) = C(14,3) = 364` order-independent multisets at
hand-size 3, per the shipped `MAX_RUNES=3`) with one deterministic function of the sorted queue.
`[S2]` — needed the moment chapter 1 exists, because Nature must resolve through it.

**Inputs:** the cast queue `q` (in DRAW order, 1–3 rune ids). **Output:** a resolved spell
(`kind`, `dmg`, `ex`, riders, `nameId`).

1. **Override check.** If `comboKey(q)` (new delimited form, §6.4) matches one of the 22 golden
   keys or the 2 Signature Spell keys (§6.5), return that fixed entry verbatim. No further steps
   run. `[S2]`/`[S4]` per entry.
2. **Wildcard resolution.** If Rainbow (id 8) is present alongside ≥1 other distinct rune, resolve
   it by substitution (§6.20) into a concrete queue **before** continuing. Everything below uses
   the resolved queue. `[S4]`
3. **Classify the pattern:** `A` (len 1), `AB` (len 2, distinct), `AA` (len 2, same), `ABC` (len 3,
   all distinct), `AAB` (len 3, one pair + one different), `AAA` (len 3, all same).
4. **Dominant rune.** The most-frequent id. Ties (`AB`, `ABC`, no majority) break toward the
   **last-drawn** rune — i.e. `q[q.length-1]` **before** the sort `comboKey` applies — the same
   precedent the shipped `elemMul`'s `dr` already uses, kept for one reason: the last rune drawn is
   also the one that colours the cast VFX, so "the rune the player sees flying = the rune that
   decides" stays true for every new combo, not just the golden ones.
5. **Base spell.** = the dominant rune's own pure spell **at the same total length** as `q`:
   - dominant ∈ {0,1,2,3} (a base rune): reuse its shipped golden pure entry at that length
     (`'0'/'0.0'/'0.0.0'` etc. — never a new number, never regressed).
   - dominant ∈ {4,5,6,7,8,9,10,11} (a new rune): use its NEW-RUNE BASE TABLE entry at that length
     (§6.3). 24 fixed numbers total (8 runes × 3 lengths); zero are derived at runtime.
   - `AB`/`ABC` (no majority): "at the same length" still applies — a 2-different-rune hand borrows
     the tie-broken rune's PURE DOUBLE, a 3-all-different hand its PURE TRIPLE, **except** the 4
     golden `ABC` keys (`0.1.2`/`0.1.3`/`0.2.3`/`1.2.3`), which are overrides (step 1) and never
     reach this step.
6. **Modifier riders.** Every rune present that is **not** the dominant one contributes exactly one
   small, fixed-magnitude rider from the RIDER TABLE (§6.3), keyed by its tag. Riders stack
   additively (max 2, only possible in `ABC`); they never scale with the dominant's own numbers.
   A base rune (0–3) as a non-dominant contributes **no** rider (its due is already paid through
   `dr`/`elemMul`, step 7 — see the worked reasoning at the end of §6.20).
7. **Elemental scaling.** `dr = q[q.length-1]` (post-wildcard-resolution, last drawn). `elemMul(dr,
   foeEl)` per §6.6. (No rank multiplier — removed per D3; the story build has no element ranks,
   so this step is `elemMul` alone, nothing further.)
8. **Combo bonus.** If `q.length === 3` and the resolved `kind` is damage-bearing (0, 1, 3, 4 — not
   2 or 5), apply the multiplier from §6.16.

**Tuning test:** a golden-reproduction test (§4/§12) asserts steps 1–8, run over all 22 golden keys
plus the 2 Signature keys, return byte-identical `(kind, dmg, ex)` to the shipped table. A second
property test (§6.16) asserts step 8's invariant over all 364 combos.

**`comboEnumerationIndex(q: readonly number[]): number`** — exported alongside `comboKey` from
`src/game/duel/config.ts` (a pure id/combinatorics helper, not part of the generator's tag logic,
so it belongs beside `comboKey`/`SPELLS`, not in a new module). Gives every one of the 454
multisets of size 1–3 over 12 runes (`12 + 78 + 364`, i.e. every hand from a single rune up to a
full 3-rune queue) one stable, total, collision-free index `0..453`. This is the shared source of
truth §4.7's save migration and §4.3.1's/§6.2's golden tests both need — two implementations of
"what index does combo X have" would silently diverge otherwise (I-13).

*Order:* **by length first (1, then 2, then 3), then lexicographically over the sorted rune ids**
(ascending, `0..11`).
- **Length 1** — 12 entries, index `0..11`: `index = id`.
- **Length 2** — 78 entries (non-decreasing pairs `a≤b`, `a,b ∈ 0..11`), index `12..89` (block
  offset 12), enumerated `a` ascending then `b` ascending from `a`. Closed form:
  `rank2(a,b) = 12a − a(a−1)/2 + (b−a)`.
- **Length 3** — 364 entries (non-decreasing triples `a≤b≤c`), index `90..453` (block offset 90),
  enumerated `a` ascending, then `b` ascending from `a`, then `c` ascending from `b`. Closed form:
  `rank3(a,b,c) = Σ_{i=0}^{a-1}(12−i)(13−i)/2 + Σ_{j=a}^{b-1}(12−j) + (c−b)`.

*Function:* sort `q` ascending; pick the block offset (`0`/`12`/`90`) and the matching `rank1/2/3`
formula by `q.length`; return `offset + rank`.

**Inverse — `comboFromIndex(index: number): number[]`** — walk the same three closed forms
backward: subtract block offsets to recover the length, then recover `a`, `b`, `c` in turn by
finding the largest candidate value at each step whose cumulative count does not exceed the
remaining index (standard combinatorial unranking for a non-decreasing tuple). Both directions are
pure, allocation-free, and total over `0..453`; a round-trip property test (`comboFromIndex(
comboEnumerationIndex(q)) === q` for every `q`) is the tuning/verification harness for both.

### §6.3 New-rune base table and rider table

**New-rune pure spells** (24 fixed numbers; `kind`: 0 bolt, 1 field, 2 barrier, 3 heavy, 4 push,
**5 summon — new**, see below). None of these touch the shipped 22.

| Rune | len 1 (`nameId`, kind, dmg) | len 2 (`nameId`, kind, dmg, ex) | len 3 (`nameId`, kind, dmg, ex) |
|---|---|---|---|
| Nature (4) | `natureBolt`, 0, 6 | `poisonBloom`, 1, 10, ex 4 (dot 4/s) **+ caster regen 3/s×3s** | `bloomStorm`, 3, 22, ex 4 (dot 4/s) **+ regen 5/s×4s** |
| Water (5) | `splash`, 0, 8 | `bubbleWard`, 2 (guardK **3**, new), ex 5, cap 2 hits | `tidalWave`, 3, 26 **+ 1-hit personal ward, 2s** |
| Lightning (6) | `sparkBolt`, 0, 9, **pierce** | `chainBolt`, 0, 16, **pierce** | `stormLance`, 3, 28, **pierce** |
| Illusion (7) | `mirrorShard`, 0, 7 | `decoySummon`, **5**, spawns 1-hit decoy, 8s cap | `grandIllusion`, **5**, spawns 2-hit decoy, 10s cap |
| Rainbow (8), colourless only | `prismSpark`, 0, 8 | `prismBurst`, 1, 12, ex 3 | `auroraCascade`, 3, 24 |
| Time (9) | `tickBolt`, 0, 7, slow 15%/2s | `hourglassField`, 1, 12, ex 3, slow 30%/3s | `frozenMoment`, 3, 24, slow 30%/5s |
| Moon & stars (10) | `moonBolt`, 0, 7, lifesteal 30% | `starDrain`, 1, 12, ex 3, lifesteal 40% | `eclipseDrain`, 3, 22, lifesteal 50% |
| Love (11) | `kindBolt`, 0, 8, heal 10% | `heartCombo`, 1, 16, ex 2, heal 20% | `friendshipFinisher`, 3, 40, heal +25 flat — **gated, §6.9** |

**Modifier rider table** (minority rune's tag, in `AAB`/`ABC` only):

| minority tag | rider |
|---|---|
| `damage` (0–3) | none — already paid via `dr`/`elemMul` |
| `dot` (Nature) | +4/s dot, 2s |
| `ward` (Water) | +1-hit personal ward, 2s |
| `pierce` (Lightning) | this cast ignores all wards (§6.8) |
| `decoy` (Illusion) | none — decoy needs to be dominant to summon |
| `wildcard` (Rainbow) | never reaches this step (resolved in §6.2 step 2) |
| `slow` (Time) | slow 15%, 2s (mode per §6.7.7) |
| `lifesteal` (Moon) | lifesteal 15% of damage dealt |
| `finisher` (Love) | +5 flat heal |

**M13/R-7 — this table IS the combat half of `RuneDef`.** §4 publishes one `RuneDef` per rune,
carrying §5.3's recognition fields, `slug`/`unlockChapter`, **and this table's per-draw-length
combat base as a positional tuple, matching §4.3's `RuneDef.base` exactly:**

```ts
interface SpellTriple { nameId: string; kind: SpellKind; dmg: number; ex: number }
// RuneDef.base: readonly [SpellTriple, SpellTriple, SpellTriple]
//                          ^ solo cast   ^ drawn twice  ^ drawn three times
```

`base[0]/[1]/[2]` are this table's `len 1`/`len 2`/`len 3` columns, in that fixed order — never a
keyed `{len1, len2, len3}` object. Any boolean/percent riders (`pierce`, `lifestealPct`,
`slowPct`, `healPct`, `dotPerSec`) attach to the relevant tuple slot, not to the tuple's shape.
The four frozen runes' `base` is their existing golden singles/doubles/triples (§6.4), unchanged,
restated in the same tuple form. No rune needs a fourth length (`MAX_RUNES = 3`), so `RuneDef.base`
is always exactly this 3-tuple.

**New spell kind 5 — SUMMON.** Not a shot: no projectile, no travel, no `strike()` resolution.
On cast, sets `decoy`/`eDecoy` (hit-capacity, 1 or 2) on the caster's own side, overwriting (never
stacking) any existing value. `[S4]` — §4 wires the enum; §6.8 owns resolution order.

**New guard flavour 3 — WARD (bubble trap).** Extends `stops(gk, kind)`: `gk===3` stops kind 0
(bolt), 1 (field), 4 (push); **not** kind 3 (heavy — falls from above, same logic as the ice
pillar) or kind 5. Capacity **2 hits**, tracked in a new `guardHits`/`eGuardHits` field, decremented
per successful block; the guard is cleared when hits reach 0 **or** its `ex` (5s) elapses,
whichever first — the same "shatters on its job" pattern the ice pillar already has, generalised
to 2 hits instead of 1. `[S3]`

### §6.4 The golden-22 re-key

`comboKey` moves from concatenation to a delimited join (C15): `q.slice().sort((a,b)=>a-b).join('.')`.
Required the moment a rune id reaches double digits (F15: `'11'` from `[11]` and `[1,1]` collide
under the old scheme; irrelevant while ids stay 0–3, live the moment Nature=4 exists, so `[S2]`).

| old key | new key | nameId (unchanged) | kind | dmg | ex |
|---|---|---|---|---|---|
| `0` | `0` | fireBolt | 0 | 8 | 0 |
| `00` | `0.0` | fireStorm | 1 | 14 | 3 |
| `000` | `0.0.0` | fireRain | 3 | 30 | 0 |
| `1` | `1` | bolt | 4 | 5 | 0 |
| `11` | `1.1` | windWall | 2 | 0 | 6 |
| `111` | `1.1.1` | cyclone | 4 | 16 | 0 |
| `2` | `2` | iceBolt | 0 | 8 | 0 |
| `22` | `2.2` | pillar | 2 | 0 | 4 |
| `222` | `2.2.2` | blizzard | 1 | 22 | 3 |
| `3` | `3` | earthWall | 2 | 0 | 2 |
| `33` | `3.3` | earthShard | 0 | 16 | 0 |
| `333` | `3.3.3` | boulder | 3 | 34 | 0 |
| `01` | `0.1` | fireBall | 0 | 16 | 0 |
| `02` | `0.2` | wetBall | 0 | 20 | 2 |
| `03` | `0.3` | magmaShard | 0 | 15 | 2 |
| `12` | `1.2` | frostGale | 1 | 14 | 3 |
| `13` | `1.3` | sandBlast | 0 | 13 | 0 |
| `23` | `2.3` | glacier | 3 | 24 | 0 |
| `012` | `0.1.2` | prismNova | 3 | 32 | 2 |
| `013` | `0.1.3` | ashStorm | 1 | 24 | 3 |
| `023` | `0.2.3` | shatter | 3 | 30 | 0 |
| `123` | `1.2.3` | tempest | 1 | 26 | 3 |

Every number is byte-identical to shipped. `WILD`/`wildSurge` (0, 11, 0) stays the fallback, now
only reachable through the generator's own step 5 borrowing logic for combos not listed above
**and** not covered by a new-rune base entry — in practice this should be near-zero once the
generator ships (unlike today, where ~55% of the base-4 3-rune space silently falls to `WILD`); a
migration test (§4) asserts the old 22 keys still resolve after the delimiter change.

### §6.5 Signature Spells

Two chapters (4, 8) add no rune. Per C1, they add a fixed recipe over runes the player already
owns at that point, occupying one of the twelve "two-of-one-one-of-another" holes the shipped
matrix already leaves as `WILD` (F1-adjacent gap, not a new one). Both are **overrides** (§6.2 step
1), so the generator's step 5 borrowing logic never touches them.

| Chapter | Name | Recipe | Key | Owned at this point? | kind | dmg | ex |
|---|---|---|---|---|---|---|---|
| 4 | **Crystal Ward** | Ice, Ice, Earth | `2.2.3` | yes — fire/wind/ice/earth/nature/water/lightning all unlocked by ch.4 | 2 (barrier, guardK **4**, new: REFLECT) | 0 | 5 |
| 8 | **Frost Lock** (`spell.frostLock`) | Wind, Ice, Ice | `1.2.2` | yes — every rune through Time (id 9) unlocked by ch.8 | 2 (barrier, guardK 1, EARTH-strength: stops everything) + **freeze rider** | 0 | 3 |

Neither key collides with the golden 22 or with each other (checked against §6.4's full list).

**Crystal Ward = the Reflect barrier (guardK 4, new).** `stops(4, kind)` = true for every kind
(like earth, `gk===1`); unlike every other barrier, a blocked shot is **not discarded**. On block:
re-target it at the original caster, **recompute its damage from the base spell value only**
(`SPELLS[key][2]`, ignoring the reflecting side's own `elemMul`) and re-launch it with `dir`
flipped — this closes COMBAT-12's "reflect a boosted hit back at yourself" trap (COMBAT-12's
original wording also named rank; that half is moot post-D3 — there is no rank to boost with). It
is **one-shot** (consumed on the first block, like the ice pillar) despite its 5s window, because it
is the single strongest defensive payoff in the set (§6.8).

**Frost Lock = Earth-strength barrier + the Freeze rider.** On cast, in addition to the barrier, it
immediately clears the **foe's** stored queue (`equeue.length = 0`) and sets `eFrozen = 2.5s`.
While `eFrozen > 0`, `think()` runs nothing at all — no `eForm` accrual, no cast decisions,
including the panic-dump branch (COMBAT-15) — a frozen foe does nothing, full stop. A per-target
internal cooldown (`eFreezeCd = 6s` after `eFrozen` expires) stops it being reapplied back-to-back.
**Player-only** (C14): the foe never casts Frost Lock, so `S.frozen` (the mirror field on the
player's own side) is never set in PvE — it exists only for symmetry with §6.19 (2P).

### §6.6 The counter graph

Two sub-cycles (COMBAT-8, adopted), so no chain is longer than the shipped 4-cycle's teachability
bar. Rainbow, Time and Love are **exempt** (element `-1` when they head a themed foe; as a *cast*
rune, `elemMul` already falls through to `×1` for them with no special-case code — see below).

**Cycle A — frozen, unchanged:**
`CTR_A = [Earth, Ice, Fire, Wind]` indexed `[Fire, Wind, Ice, Earth]`. Fire melts Ice, Ice freezes
Wind, Wind erodes Earth, Earth smothers Fire.

**Cycle B — new, 5 elements** (Nature, Water, Lightning, Illusion, Moon):
Moon counters Nature (moonlight commands growth/tides) → Nature counters Water (roots and
overgrowth drink/dam it) → Water counters Lightning (grounds it) → Lightning counters Illusion (a
flash burns away a mirror-trick) → Illusion counters Moon (a mirror-trick eclipses/confuses it) →
back to Moon. One direction, one cycle, same shape as Cycle A.

**Combined lookup** (12-wide array, `CTR[e]` = the rune id that counters element `e`; `-1` = no
real counter, never matched):

| e | 0 Fire | 1 Wind | 2 Ice | 3 Earth | 4 Nature | 5 Water | 6 Lightning | 7 Illusion | 8 Rainbow | 9 Time | 10 Moon | 11 Love |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `CTR[e]` | 3 | 2 | 0 | 1 | 10 | 4 | 5 | 6 | −1 | −1 | 7 | −1 |

`elemMul(r, f)` is **unchanged in code**: `f<0 ? 1 : r===f ? 0.55 : CTR[f]===r ? 1.7 : 1`. Rainbow/
Time/Love never appear as a `CTR[...]` value, so a cast rune of theirs can never accidentally read
as "the counter" for any foe; and any foe themed to them uses `f=-1`, so `elemMul` is `1` for
everyone against them — no special-casing needed anywhere, by construction, same trick the shipped
Umbra/Prism `-1` already relies on.

### §6.7 The ten chapter magics — exact rules and numbers

Base numbers for each are in §6.3 (new-rune table) or §6.5 (Signature Spells); this section adds
the one thing the tables don't carry: any chapter-specific special rule.

#### §6.7.1 Nature (dot + heal)

`[S2]`, ch.1. Numbers: §6.3. No special rule — dot and regen are plain state ticks (`burn`/`eBurn`
reused as-is; `regen`/`eRegen`, new, symmetric to `burn`, capped at the side's own `hpMax`). This
is the cheapest chapter to build: it needs zero new `think()` branching (§6.13).

#### §6.7.2 Water (bubble ward)

`[S3]`, ch.2. Numbers + `guardK 3` mechanics: §6.3.

#### §6.7.3 Lightning (unblockable pierce)

`[S3]`, ch.3. `pierce` is a boolean on the resolved spell (not a new `kind`), checked in
`strike()` **before** `stops()` is even called: a piercing shot always lands (except on a decoy —
§6.8). Numbers: §6.3. Boss note: this chapter's Guardian is **Zephyr** (reused rig/name, §6.10) —
her *element/weakness and every mechanic below stay Lightning*, unaffected by the character swap.

#### §6.7.4 Crystal (reflect) — Signature Spell

`[S4]`, ch.4. See §6.5.

#### §6.7.5 Illusion (decoy)

`[S4]`, ch.5. Numbers + `kind 5`: §6.3. Decoy resolution order: §6.8.

#### §6.7.6 Rainbow (wildcard)

`[S4]`, ch.6. Substitution algorithm: §6.20. As a *pure* colourless hand (no other rune to
complete), it uses its own modest base table (§6.3) — deliberately the **weakest** of the eight
triples, so "cast three Rainbows" is never the optimal play; the wildcard's value is in completing
something else, not in being cast alone.

#### §6.7.7 Time (30% cast-time slow)

`[S4]`, ch.7. Boss note: this chapter's Guardian is **Ember** (reused rig/name, §6.10); *her
element/weakness stays exempt (`-1`) and every Time mechanic below is unaffected by the character
swap.*

This is the resolution of **F19** (`S.slow` written, never read): the rider now has **two modes**,
chosen by which SIDE it lands on, not who cast it —
- **Lands on the foe:** reduces her `eForm` accrual rate (the existing `eSlow` mechanism,
  parametrised: the shipped hard-coded `×0.55` becomes `×(1 − slowPct)`, so a base-rune slow
  effect — `wetBall`, `magmaShard`, etc. — is unchanged at 45%, and Time's own riders use their own
  stated `slowPct`).
- **Lands on the player:** there is no draw-rate to throttle — a human's hand is the real skill
  gate and must never be mechanically punished. Instead it **shortens the player's own active
  guard/ward remaining duration by `slowPct`**, applied once, instantly, on landing. If no guard is
  active, the rider has nothing to shorten and is simply wasted — a non-punishing "whiff", never an
  input lock, never an auto-cast, never a frozen cursor.

This single dual-mode rule retroactively fixes F19 for **every** slow-carrying spell, old and new,
not just Time's — a bugfix riding along with the new content, not a change to the four frozen
runes' recognition or feel.

#### §6.7.8 Frost Lock (freeze + discard) — Signature Spell

`[S4]`, ch.8. See §6.5. Player-only (C14). Boss note: this chapter's Guardian is **Glace**
(reused, unchanged from the original design — Glace was already the Ice-themed reuse, §6.10); she
resists Frost Lock in her phase 2 (§6.11).

#### §6.7.9 Moon & stars (lifesteal)

`[S4]`, ch.9. Numbers: §6.3. Heals are new state, `regen`/`eRegen` are NOT used here (lifesteal is
a lump add on landing, not a ticking field): on a successful, unblocked, non-decoy hit, `hp/ehp =
min(hpMax, hp/ehp + dmg × lifestealPct)` — this is the first real caller of the pattern
`fx.heal()` (F20) was built for but never wired to; §9 owns hooking the VFX, §6 owns the number.

#### §6.7.10 Love (finisher)

`[S4]`, ch.10. Single/double are ordinary support spells (§6.3), not gated. The triple **is** the
finisher — gate rule: §6.9.

### §6.8 Precedence

Ordered, applied in `strike()` in this sequence, once per landing spell:

1. **Pierce beats every ward, including Reflect (guardK 4) and Bubble (guardK 3).** `stops()` is
   never called for a piercing shot. This is deliberate: Lightning (ch.3) ships two chapters
   before Illusion (ch.5), and must have a real answer to Crystal (ch.4)'s reflect the instant
   Crystal exists, or Crystal would be a hard, un-counterable wall for one full chapter.
2. **Pierce does NOT beat a decoy.** A decoy is a body standing in the shot's path, not a ward the
   shot punches through. Order: check decoy (step 3) only after confirming the shot was not
   otherwise stopped — since pierce already skips `stops()`, a piercing shot goes straight to the
   decoy check.
3. **Decoy resolves after the barrier/pierce check, and swallows the whole spell atomically.** If
   the target side's `decoy`/`eDecoy` counter is `> 0`: decrement it by 1, apply **zero** effect —
   no HP loss, no dot/regen/slow/lifesteal rider, nothing — and return. This is a deliberate,
   legible "full save", not a partial one: it answers Poison (ch.1, four chapters earlier) cleanly
   rather than leaving a burn behind that a decoy "half-blocked."
4. **Reflect (guardK 4) is one-shot, at base damage, ignoring the reflecting side's own
   `elemMul`.** (No rank to ignore — removed per D3.) §6.5.
5. **Freeze (Frost) is player-only** — never appears on the resolution path for a hit landing on
   the player. §6.5.
6. **The Love finisher (triple) only resolves as the finisher if its gate is open (§6.9); otherwise
   it silently resolves as the double `heartCombo` instead.** Never a refused/wasted cast.
7. **The combo bonus (§6.16) applies last**, after every rider and precedence rule, as a pure
   multiplier on the final damage number.

### §6.9 The Love finisher gate

`friendshipFinisher` (triple Love, §6.3) requires, at the moment `cast()` is pressed:
- **either** ≥4 total landed hits have already been exchanged between both sides in this duel
  (`hitsLanded >= 4`, a new counter, reset each `resetDuel`),
- **or** the caster's own HP is `≤ 30%` of their `hpMax`.

**Cap: once per duel, per side.** A `usedFinisher`/`eUsedFinisher` flag (reset each `resetDuel`)
blocks a second cast even if the gate re-opens later in a long fight — this is what stops "spam the
finisher" outright; the gate alone is not sufient, because a losing side sitting under 30% HP for
the rest of a long duel would otherwise re-qualify every time the hand refills.

If the gate is closed and the player queues the triple anyway and presses CAST, it **soft-fails**
to the double `heartCombo` (§6.8 rule 6) — never a `noSlots`/`notARune`-style refusal, matching the
existing "never leave the player with nothing" philosophy (`WILD`'s own reason for existing).

`[S4]`. Tuning test: a scripted-duel test asserts the gate is closed at `hitsLanded=3, hp=100%` and
open at `hitsLanded=4` or `hp≤30%`, and that a second triple cast in the same duel resolves as the
double.

### §6.10 Foe roster and cast

Per C5/C26/M2: standard nodes are **Umbra's shadow clones** (all `duelist.shadow`, tinted per
chapter, per §10.3's own non-goal — chapter 1's inline dialogue nickname "shadow puffs" (C26) is
flavour text only, not a separate key); bosses are **9 Guardians + Umbra** (node 10-5 only). §10
owns names — the ids below are copied verbatim from `spec-10-story.md` §10.3's cast table, which
is also canonical for reuse-or-new status. This table is the mechanics: element/weakness, AI tier
(via §6.12), and the node-3-rule (C14: a chapter's foes may use its own new magic only from node 3
of that chapter onward; nodes 1–2 use base-four runes dyed to the chapter's palette, but
**already** carry the chapter's real weakness element, so the counter is learnable from node 1
even before the fancy new spell shows up).

**M2 correction:** chapters 3 and 7 reuse the shipped rivals **Zephyr** and **Ember** as their
Guardians' rig/name/voice (§10.3), the cheaper option C5 prefers — but §6 keeps its own mechanics
for both exactly as originally designed: chapter 3 stays a **Lightning**-themed fight (Zephyr is a
reused *rig*, not a reused *element* — her weakness is Lightning, not Wind), and chapter 7 stays
**exempt** (`−1`) under **Time**'s mechanics (Ember is a reused *rig*, not a reused *element* —
she has no exploitable weakness, same as Umbra/Prism). This is a deliberate split, stated once
here and cross-referenced from §6.7.3/§6.7.7: **the character reuses a shipped rig and name; the
combat numbers do not follow the rig, they follow the chapter.**

| Ch | Guardian (node ×-5) | `duelist.*` id (§10.3) | Reuses | Element (weakness) | New magic first usable at |
|---|---|---|---|---|---|
| 1 | Briar | `briar` | new | Nature (4) | node 1-3 |
| 2 | Pearl | `pearl` | new | Water (5) | node 2-3 |
| 3 | Zephyr | `zephyr` | **reused rig/name only** (M2 — mechanics stay Lightning, not Wind) | Lightning (6) | node 3-3 |
| 4 | Terra | `terra` | reused | Earth (3) | node 4-3 (Crystal Ward) |
| 5 | Echo | `echo` | new | Illusion (7) | node 5-3 |
| 6 | Prism | `prism` | reused (a prism casts a rainbow — a strong name fit) | −1 (exempt) | n/a (wildcard never AI-cast, §6.13) |
| 7 | Ember | `ember` | **reused rig/name only** (M2 — mechanics stay exempt/Time, not Fire) | −1 (exempt) | node 7-3 |
| 8 | Glace | `glace` | reused | Ice (2) | node 8-3 (Frost Lock is player-only, so "usable" here means she may still be *hit by* it and must resist it per §6.11) |
| 9 | Nova | `nova` | new | Moon (10) | node 9-3 |
| 10 | Umbra | `umbra` | shipped, moved here per C26 | −1 (exempt) | see §6.11 (3-phase boss) |

Every Guardian above matches §10.3's `duelist.*` id exactly — no chapter of this spec invents a
name §10 doesn't also carry. `[S2]`–`[S4]` per chapter, matching that chapter's own stage tag.

### §6.11 Boss phases per chapter

Per C13 ("boss = standard+20 HP, plus a phase shift at 50% HP that adds that chapter's mechanic"),
with one universal rule that keeps a phase shift from being a pure difficulty spike on top of
Dream Dust's job of closing the win-rate gap (§6.14/§6.21).

**M1 tuning exception — chapter 10's boss HP bonus is `+16`, not `+20`** (`hpMax = 127+16 = 143`,
not `147`). This is the one real numeric change from this fix round (§6.21 states the measured
before/after): part of "the boss feels longer" is now carried by the universal phase wind-up
below (a real mechanic every chapter's boss shares) rather than by raw HP alone, so the strongest,
final boss can afford to give a little of that back to land inside the amended win-rate target.
Every other chapter keeps the `+20` bonus unchanged.

**Universal tell:** every phase shift opens with a **1.8s wind-up**, during which the boss's own
`eForm` accrual is paused entirely (a visible pose/glow change is §9's). This is the one numeric
concession every phase makes; nothing below is additionally discounted for it.

| Ch | Boss | Phase-2 mechanic (at ≤50% HP) |
|---|---|---|
| 1 | Briar | her non-Nature spells also carry the Nature dot rider (chip poison on everything) |
| 2 | Pearl | opens Bubble Ward proactively at phase start, not only reactively |
| 3 | Zephyr | her bolts gain `pierce` (ignores the player's own guard) — Lightning mechanics, per M2 |
| 4 | Terra | Crystal Ward's window extends 5s → 7s |
| 5 | Echo | may hold **two** decoys concurrently instead of one |
| 6 | Prism | cosmetic only (all-colour glow) — **explicit non-goal**: no mechanic change, because Prism/Rainbow is already elementally exempt and this fight's whole point is being out-played, not counter-picked |
| 7 | Ember | her slow rider doubles in the guard-shortening mode only (30% → 60% off the player's active guard) — she wears down shields faster; her own `eForm` rate is untouched — Time mechanics, per M2 |
| 8 | Glace | resists the player's own Frost Lock: freeze duration on her shortens 2.5s → 1.5s |
| 9 | Nova | lifesteal rider 40% → 55% |
| 10 | **Umbra** | **3-phase boss** (the only one): phase 2 at 50% HP is a plain tell/pause (no new mechanic — she is not gaining power, she is faltering, per C26's "lonely, not evil"); **phase 3 at 25% HP** opens her own Love-finisher gate (§6.9, §6.13) — the one boss allowed to reach for it |

`[S4]` for chapters 1–9 (paired per C3); Umbra's phase 3 ships with the finale, `[S4]` also (chapter
10 is the last pair).

### §6.12 Per-node table

50 nodes = 10 chapters × 5 nodes (C5). Given as a **formula plus exceptions** (chapter-level rows
below fully determine all 50 via the formula; hand-listing 50 identical-shape rows adds nothing
verifiable that the formula doesn't already say).

**Formula**, for node `n` (1–50): `chapter = ceil(n/5)`; `nodeInChapter = ((n-1) mod 5) + 1`;
`isBoss = (nodeInChapter === 5)`; `aiTier = tierFinal(chapter)` (§6.14); `hpMax = stdHp(chapter) +
(isBoss ? 20 : 0)`, **except chapter 10, where the boss bonus is `+16` (`hpMax = 143`, not `147`
— M1 tuning, §6.11/§6.14/§7.2)** (§6.14); `element = ` this chapter's Guardian element (§6.10) if
`isBoss`, else this chapter's element regardless of `nodeInChapter` (the weakness is always real;
only the *casting* of the new magic is gated to node 3+, §6.10); `usesNewMagic = nodeInChapter >= 3`.

| Chapter | tier | stdHp | bossHp | element | nodes 1–4 use new magic? | node 5 |
|---|---|---|---|---|---|---|
| 1 | 0 | 100 | 120 | Nature | nodes 3–4 only | Briar |
| 2 | 0 | 103 | 123 | Water | nodes 3–4 only | Pearl |
| 3 | 0 | 106 | 126 | Lightning | nodes 3–4 only | Zephyr (Lightning mechanics, M2) |
| 4 | 1 | 109 | 129 | Earth | nodes 3–4 only (Crystal Ward) | Terra |
| 5 | 1 | 112 | 132 | Illusion | nodes 3–4 only | Echo |
| 6 | 1 | 115 | 135 | −1 | n/a (wildcard is player-only) | Prism |
| 7 | 2 | 118 | 138 | −1 | nodes 3–4 only (Time) | Ember (exempt/Time mechanics, M2) |
| 8 | 2 | 121 | 141 | Ice | nodes 3–4 only (Frost Lock is player-only; she resists it) | Glace |
| 9 | 2 | 124 | 144 | Moon | nodes 3–4 only | Nova |
| 10 | 2 | 127 | **143** (M1 tuning: `+16`, not `+20` — §6.11) | −1 | n/a (Love is player-only except Umbra's own phase 3) | Umbra (3-phase) |

**Exceptions to the formula:**
- **Node 1 overall** (ch.1, node 1) is the tutorial duel. No separate HP/tier exception — the
  `onboarding` term in §6.14's rate chain already covers it (0.7× at the very first duel, ramping
  to 1.0× by the 6th).
- **Node 10-5 (Umbra)** additionally gets the 3-phase structure (§6.11), unique in the roster.
- Chapters 4, 6, 8 reuse an existing element/name (Terra/Prism/Glace) instead of a new one — already
  reflected in the `element` column, not a separate rule.

`[S2]` for the formula itself; `[S3]`/`[S4]` per chapter as tagged in §6.10/§6.11.

> **S4 tuning (2026-09-19) supersedes this table's HP and tiers — see
> §8.18.** Measured on the REAL duel (`tests/duel/winRate.test.ts`, every
> chapter mechanic live) against §7.2's core child, the formula above put
> chapters 7–10 at 22–40 % first-attempt wins. As built:
> - a standard foe has `100 + (chapter − 1)` HP, or a flat **100** where she
>   has no weakness (element −1);
> - a boss has `115 + 2·(chapter − 1)` HP, with no chapter-10 exception;
> - tiers step every three chapters as above, but one tier gentler for a
>   foe with no weakness.

### §6.13 The NPC contract per magic

Per C14 ("every magic ships with a one-line AI contract... no magic ships without one"). USE / 
COUNTER, one line each; "cheap" flags where an existing branch already generalises for free.

| Magic | AI USE | AI COUNTER (against the player's own use of it) |
|---|---|---|
| Nature (dot+heal) | opens it when her own HP < 60%, from node 3 on — **cheap**: it's a `kind 1` field, the existing `defend`/threat heuristics are kind-based, not element-based, so zero new branches | none needed — a dot in flight is already a "threat" under the existing panic-dump logic |
| Water (ward) | raises it as her opening defensive move whenever `incoming` is true, from node 3 on — **cheap**: `kind 2`, already generically flagged as a barrier | Lightning's pierce (ch.3+) bypasses it outright; before ch.3, tank through or outrace it (never required, C14) |
| Lightning (pierce) | reaches for it specifically when the player's own guard is up, from node 3 on (new one-line branch: prefer a Lightning-tagged combo when `guard > 0`) | Illusion's decoy (ch.5+) is the hard counter (pierce does not bypass a decoy, §6.8); before ch.5, its damage is deliberately modest (§6.3), so it's survivable, never mandatory to counter |
| Crystal (reflect) | raises it as her primary defensive answer from node 3 on — **cheap**: `kind 2`, generic barrier branch | bait it, then commit elsewhere (same as any barrier); Lightning's pierce bypasses it outright (§6.8) |
| Illusion (decoy) | casts it when her own HP < 30%, from node 3 on — added as a third option alongside the existing `[EARTH, ICE, WIND]` low-HP pick | none needed — a decoy is 1–2 disposable hits, not a wall |
| Rainbow (wildcard) | **never casts it.** One-line contract: Rainbow is player-only; the substitution search is not worth AI-authoring, and Prism (its Guardian) is thematically the one *explaining* it, not using it | n/a |
| Time (slow) | casts it preferentially against an active player guard, from node 3 on (reuses the guard-shortening mode, §6.7.7) | there is nothing to "counter" on the player's side — a whiffed slow (no guard up) is already a non-event by design |
| Frost (freeze) | **never casts it.** Player-only (C14) | n/a — she is the one frozen; recovery is impossible by design (`eFrozen` gates all of `think()`), bounded only by the fixed 2.5s duration + 6s per-target cooldown |
| Moon (lifesteal) | casts it preferentially when her own HP < 50%, from node 3 on — added alongside the existing low-HP defend branch | Illusion's decoy denies the whole spell, heal included (§6.8 rule 3); otherwise, out-damage her regen |
| Love (finisher) | **only Umbra, only her own phase 3** (≤25% HP, §6.11) may reach for it. Every other foe never draws Love | same gate limits her as limits the player (§6.9) — it is telegraphed, answerable with the same toolkit |

`[S2]`–`[S4]` matching each magic's own chapter stage (§6.1).

**M26 — `AiContract`, one typed record per magic, alongside the prose table above (not a
replacement for it — the prose is what a reviewer reads, the record is what a test asserts):**

```ts
interface AiContract {
  magic: RuneTag | 'crystal' | 'frostLock'   // §6.1's tags, plus the two Signature Spells
  usesFromNode: 1 | 3          // C14: 1 = no restriction, 3 = "may use only from node 3 onward"
  usesWhen: string             // one-line condition, matching the prose USE column
  aiOnly: boolean              // true = never castable by the player's opponent AT ALL (Rainbow, Frost Lock);
                                // false = ordinary node-3 gating applies
  counteredBy: RuneTag | 'none' | 'tank'  // the prose COUNTER column's mechanism, as one token
  bossPhase2?: true             // set for the 9 chapters whose boss gains a phase-2 tie to this magic (§6.11)
}

const AI_CONTRACTS: readonly AiContract[] = [
  { magic: 'dot',        usesFromNode: 3, usesWhen: 'own HP < 60%',  aiOnly: false, counteredBy: 'none',    bossPhase2: true },
  { magic: 'ward',       usesFromNode: 3, usesWhen: 'incoming shot', aiOnly: false, counteredBy: 'pierce',  bossPhase2: true },
  { magic: 'pierce',     usesFromNode: 3, usesWhen: 'player guard>0', aiOnly: false, counteredBy: 'decoy',  bossPhase2: true },
  { magic: 'crystal',    usesFromNode: 3, usesWhen: 'defensive default', aiOnly: false, counteredBy: 'pierce', bossPhase2: true },
  { magic: 'decoy',      usesFromNode: 3, usesWhen: 'own HP < 30%',  aiOnly: false, counteredBy: 'tank',    bossPhase2: true },
  { magic: 'wildcard',   usesFromNode: 1, usesWhen: 'never',         aiOnly: true,  counteredBy: 'none' },
  { magic: 'slow',       usesFromNode: 3, usesWhen: 'player guard>0', aiOnly: false, counteredBy: 'none',   bossPhase2: true },
  { magic: 'frostLock',  usesFromNode: 1, usesWhen: 'never',         aiOnly: true,  counteredBy: 'none' },
  { magic: 'lifesteal',  usesFromNode: 3, usesWhen: 'own HP < 50%',  aiOnly: false, counteredBy: 'decoy',   bossPhase2: true },
  { magic: 'finisher',   usesFromNode: 1, usesWhen: 'Umbra only, own HP <=25% (phase 3)', aiOnly: false, counteredBy: 'none' }
]
```

Ten entries — the 8 rune-tagged magics plus the 2 Signature Spells; `crystal`/`frostLock` are not
in `RuneTag` (§6.1) since they carry no rune, hence the union type. `bossPhase2` cross-references
§6.11's table directly, so a test can assert every `true` row has a corresponding boss row. §4
owns where this literal array lives (recommend beside `RuneDef`/`AI_CONTRACTS` in
`src/game/duel/config.ts`, next to `FOES`).

### §6.14 The full difficulty chain

Adopted from C13, restated exactly, with the phase wind-up (§6.11) placed in the chain:

```
rate = base(aiTier) × onboarding × dreamDust × slowEffects × phaseWindup
```

- `base(aiTier) = 0.42 + 0.085 × aiTier`, `aiTier = tierFinal(chapter) = min(2, floor((chapter-1)/3))`
  → chapters 1–3 → tier 0 (rate 0.420); 4–6 → tier 1 (0.505); 7–10 → tier 2 (0.590).
- `onboarding` ramps linearly 0.7 → 1.0 over the player's first 6 duels (replaces the shipped
  one-duel `first = 0.8`).
- `dreamDust = max(0.6, 1 − 0.08 × lossStreakOnThisNode)` — §6.15.
- `slowEffects` — the foe-facing mode of §6.7.7's rider (`× (1 − slowPct)`), when active.
- `phaseWindup` — `0` for 1.8s at the instant a boss crosses a phase threshold (a full accrual
  pause, not a fractional multiplier), `1` otherwise.
- **Floor:** the whole product is clamped to `≥ 0.25` runes/s, so no combination of effects can
  reduce a foe to a near-zero crawl.

`hpMax(chapter) = 100 + 3×(chapter−1)` (standard); `+ 20` on top for a boss, **except chapter 10:
`+16`** (M1 tuning, §6.11/§6.21). `hpMax` is **per side** (F18's fix): the sky-balance formula
becomes `0.5 + (hp/hpMaxPlayer − ehp/hpMaxFoe) / 2`, so a boss's extra HP no longer misreports the
fight as a blowout.

`[S2]` for the base chain (needed the moment any duel exists); `dreamDust`/`phaseWindup` terms are
`[S3]`/`[S4]` as their respective content ships.

> **S4 tuning (2026-09-19), superseding `base(aiTier)` above:**
> `base = 0.40 + 0.03 × aiTier` (0.40 / 0.43 / 0.46 runes/s). Measured on the
> real duel, not on `duel-sim.mjs`'s abstraction (§8.18). The rest of the
> chain is unchanged: onboarding, Dream Dust, the slow term and the
> phase wind-up. The slow term is now `× (1 − eSlowPct)`, per §6.7.7.

### §6.15 Dream Dust

Per C13: `dreamDust = max(0.6, 1 − 0.08 × lossStreakOnThisNode)`. **Scope: per node**, tracked as a
small map `{nodeId: streak}` (or a single "current node's streak" field, since only one node is
ever in progress — §4's call). **Reset:** to 0 the instant that node is won; **not** shared across
nodes (losing chapter-9's boss twice does not ease chapter-1's boss). Composes into §6.14's rate
chain multiplicatively. Floor `0.6` (a 40% rate cut) at `lossStreak ≥ 5`; already effectively
saturated well before that per §6.21's measurements.

**No interaction with the ads-pass rewarded Twin Gift (F25):** Dream Dust changes the NEXT
attempt's foe rate; a duel itself now only ever resolves to a plain win or loss (no coin payout of
any kind — removed per D3). The Twin Gift's bloom reward is granted later, on the map, never as
part of duel resolution, so it cannot touch Dream Dust's rate math either way. `[S3]`.

### §6.16 The combo bonus

Per C13 ("a 3-rune combo must never be a worse choice than a 2-rune combo... §6 owns the fix").
**Independently reconfirmed** against the shipped 22 (not just NUM's flagged case): the 2-rune
`glacier` (Ice+Earth, kind 3, dmg 24) already beats several 3-rune combos on damage-per-drawn-rune
(`24/2 = 12`/draw vs. e.g. `shatter`'s `30/3 = 10`/draw, `prismNova`'s `32/3 = 10.67`/draw) —
confirming this is a real, not hypothetical, gap.

**Rule** (a runtime multiplier, applied in §6.2 step 8 — never a change to any stored table value,
so the golden-reproduction test in §6.2 still passes on the raw numbers):

```
if q.length === 3 and kind ∈ {0,1,3,4}:
  bestPair = max damage over the 3 possible 2-rune sub-combos of q
  comboBonusMul = max(1, (bestPair × 1.5) / baseDamage)
  finalDamage = baseDamage × comboBonusMul
else:
  comboBonusMul = 1
```

Exempt: barrier (kind 2) and summon (kind 5) — not damage-comparable. Worked example: `shatter`
(`0.2.3`, base 30) vs. its own best pair `glacier` (`2.3`, 24): needs `≥ 1.5×24 = 36`; multiplier
`= 36/30 = 1.2`; effective damage `36`. Every combo that is already ≥1.5× efficient (the large
majority, by direct check) gets `comboBonusMul = 1` — no regression risk.

**Tuning test:** a property test over all 364 combos (post-generator) asserts `finalDamage ≥
1.5 × bestPair` for every damage-kind 3-rune combo. `[S3]` (needed once 3-rune combos other than
the golden ones start resolving through the generator, i.e. as soon as Water/Lightning exist).

### §6.17 winCoins, rank prices, and the Rune Shrine — removed (D3)

**Removed per D3 (owner ruling, 2026-09-18):** the story build has no currency, no coins, no coin
jar, no coin burst out of gifts, no Rune Shrine, and no element ranks, in either 1P or 2P (§6.19).
`winCoins`, `RANK_BONUS`, `rankPrice` and `buyRank` are not used anywhere in the story build. This
heading is kept only because other chapters cross-reference it by number (the preface's §6.17/§8.9
citation for the currency decision); there is no DuelResult shop panel and nothing here to
restate. Duel math is whatever it is without ranks — see §6.2's elemental-scaling step and §6.14's
difficulty chain for the base numbers, which already meet every difficulty target at zero ranks:
ranks were always optional ease on top of a curve tuned to clear at zero, so removing them changes
no target and needs no re-tune (§6.21's measured win-rates were run at zero ranks from the start).

*(Historical, for provenance only — the pre-D3 numbers this section used to state, now dead:
`winCoins = (12 + (chapter−1)×6) × (isBoss ? 1.5 : 1)`; `rankPrice(rank) = 10 × (rank+1)`; rank cap
5 per element across 12 elements. Removed per D3.)*

### §6.18 Replay rules

Per C24 ("completed nodes are replayable duels for practice: no gift and no rewards... sectors
stay restored"). Mechanics layer:

- A replayed node always fights at **its own fixed `aiTier`/`hpMax`/element** (§6.12's table for
  that node's chapter), **never** the player's current furthest chapter — replaying chapter 1 after
  reaching chapter 10 is always the chapter-1 baseline fight. (This is the direct fix for F21: node
  identity and AI tier are split from "furthest progress" everywhere, not only here.)
- **No ranks exist to carry over (removed per D3)** — same as everywhere else in the story build. A
  replay fights at exactly the same numbers as a fresh attempt at that node; there is nothing a
  player could have bought that makes an old node trivial.
- **Dream Dust is still node-scoped and still active** on a replay loss — no special-case needed,
  it was already generic per-node state (§6.15).
- **No gift and no rewarded surface on a replay, in either outcome.** A duel only ever resolves to
  a plain win or loss (no coin payout of any kind — removed per D3); the Twin Gift's bloom reward
  is granted later, on the map, never as part of duel resolution, so there is no reward-shaped
  thing left inside duel resolution for a replay's outcome to trigger. C24's "no rewards on replay"
  holds trivially as a result — the old ×2-coins-on-win / consolation-coins-on-loss exploit this
  bullet used to guard against no longer has a coin to exploit.

`[S3]` — replay only becomes meaningful once a second chapter exists to make chapter 1 "completed".

### §6.19 2P versus rules

Per C18 (ARCH-21: P2 drives the existing `e*` fields directly, `think()`/`chooseRune()` bypassed, a
second stroke buffer). `[S5]`. Mechanics:

- **`hpMax = 100` flat for both sides**, regardless of either player's story progress — a versus
  match is not "chapter-scaled"; it is always the base fight.
- **`foeEl = -1` for both sides.** Neither player has an exploitable elemental weakness the other
  might not know about — versus is a pure skill/tempo contest, not a hidden-information
  rock-paper-scissors.
- **No ranks in 2P (removed per D3), same as 1P** — there is nothing to ignore, because there is no
  rank system anywhere in the story build. COMBAT-24's original fairness concern (a maxed-rank P1
  outdamaging a fresh P2) cannot arise: neither player has a rank to max, in 1P or 2P.
- **Both players have the full unlocked kit** (ruling's own words) — all 12 runes and both
  Signature Spells, gated only by whatever the campaign save has actually unlocked (shared, since
  it's the same save).
- **General principle — every "AI-only" restriction in §6.13 is an AI-authoring scope limit, not a
  rune-availability rule.** In versus there is no AI (`think()` bypassed), so: Frost is castable and
  landable on **either** human player symmetrically (its "player-only" restriction was about the
  foe never casting it, which no longer applies once "the foe" is a second human); Rainbow may be
  cast by either side (no AI-authoring cost applies to a human); Time's foe-facing rate-reduction
  mode never triggers for either side (neither side has an `eForm` timer), so Time **always**
  resolves in the guard-shortening mode in versus, for both players.
- **The Love finisher gate (§6.9) applies identically and symmetrically to both players** — same
  4-hits-landed-or-≤30%-HP condition, same once-per-duel cap, tracked per side exactly as in PvE.
- **Input routing** (pointerId → side, per-pointer stroke buffers) is §3/§4's job; this section only
  fixes what the RULES do once two human streams exist.

### §6.20 Wildcard substitution

Rainbow (id 8) resolves **before** the generator's classification step (§6.2 step 2), never inside
the lookup itself (a `Record`/table of exact keys cannot represent "matches any of several keys" —
COMBAT-5's original finding, unchanged by the alphabet swap).

**Algorithm:**
1. If Rainbow is the **only** rune present (pattern `8`, `8.8`, `8.8.8`), it does not substitute —
   resolve directly via its own colourless base entry (§6.3).
2. Otherwise, for each **other, distinct** rune present in the queue, build a candidate queue with
   every Rainbow replaced by that rune, and resolve each candidate through generator steps 3–8.
3. **Tie-break:** if the other runes in the queue all share one tag, pick the candidate matching
   that tag (Rainbow "completes" the family already being built). Otherwise, pick the candidate
   with the higher resulting `dmg` (post-rider, pre-combo-bonus) — ties broken toward the
   **last-drawn non-Rainbow rune**.
4. The winning candidate's queue is what "the resolved queue" means for every later step, including
   `dr` (§6.2 step 7) — a Rainbow drawn last **always** resolves to its substituted concrete id
   before `elemMul` ever sees it; a wildcard id is never itself read as `dr` post-substitution.
   (Its own colourless base damage, §6.3, is a separate lookup keyed by rune id, not by `dr`; the
   old rank-array indexing this sentence used to also guard against is moot post-D3 — there is no
   rank array.)

**Worked example:** queue `[Fire, Fire, Rainbow]` → only one other distinct rune (Fire) → single
candidate `[Fire, Fire, Fire]` → resolves as `fireRain` (golden, `0.0.0`, 30 dmg) via the override
in step 1 of §6.2 (note: substitution happens in step 2, so a Rainbow-completed queue can still land
on a golden override afterwards — this is intended, not a special case).

**Worked example 2:** queue `[Nature, Moon, Rainbow]` → two other distinct runes, no shared tag
(`dot` vs `lifesteal`) → two candidates: `[Nature, Nature, Moon]` (dominant Nature, minority Moon
rider) vs `[Nature, Moon, Moon]` (dominant Moon, minority Nature rider) → compare resulting `dmg`
→ pick the higher, tie-break toward whichever of Nature/Moon was drawn **last** in the original
three-rune sequence.

`[S4]`.

### §6.21 Simulation validation (`duel-sim.mjs`) — tuning runs only

**M1/coverage-E1: §7.2 is the canonical measured table.** §7 owns the harness, so §7.2 is the one
place another chapter cites for "does chapter X meet its win-rate target" — this section keeps no
second, competing "canonical" run. What follows is **only** the tuning work this fix round asked
of §6: closing the three rows M1 named, with the exact constants changed and the runs that prove
they close, so §7 can fold the same constants into its own canonical table rather than re-deriving
them.

**Amended targets (M1, supersedes this chapter's earlier single-number reading — see the
retracted dissent above):** first attempt — standard ≥90% (ch.1–6) / ≥85% (ch.7–10); boss ≥75%
(ch.1–6) / ≥60% (ch.7–10); separately, ≥95% cleared within 3 attempts everywhere.

**Regrade of the pre-fix run against the amended targets** (the numbers are unchanged from the
prior pass; only the pass/fail column changes) confirms M1's own count exactly: **three rows
miss** — ch.8 standard (82.9%, target 85%), ch.9 standard (82.8%, target 85%), ch.10 boss (58.7%,
target 60%). Every other row, including ch.7 boss (65.7% ≥ 60%) and ch.9 boss (61.6% ≥ 60%),
already passes its amended band — the Dream Dust/cumulative-by-retry material this section
previously carried for those rows is retired; it was solving a gap the amendment already closed
(exactly audit-numeric N-1's finding).

**R-11: this section prints no win-rate table of its own — see §7.2 for every row's number.**
The earlier draft of this section re-ran and re-printed all 20 chapter rows here, with decimals
that drifted from §7.2's own run (same pass/fail, different MC noise) — that was a second,
competing "canonical" table, exactly the duplication M1/coverage-E1 said not to keep. It is
deleted. What stays is only the two constants this fix round actually changed, the reasoning for
each, and the specific numbers that justify the change — nothing else.

**1. Ch.8/ch.9 standard — the miss was a validation-harness bug, not a design gap; no re-run
lives here.** The generic `(chapter−1) % 4` rotation the pre-fix harness used as every standard
node's foe-element *proxy* never matched §6.10/§6.12's real per-chapter weakness table — it gave
ch.8 an `Earth` proxy when ch.8's real weakness (Glace's chapter) is **Ice**, and gave ch.9 a
`Fire` proxy when ch.9's real weakness (Moon, no base-4 analogue) has no natural proxy at all.
Measured once, to confirm the fix, at `n = 4000`, core profile, zero ranks, first attempt: ch.8
standard with the real `Ice` proxy = **98.1%** (target ≥85%); ch.9 standard with `Wind` as the
stated conservative placeholder for a non-base-4 element (measured the weakest of the four base
attacker profiles, so it never *overstates* how hard the real Moon AI needs to be once §6.13's
contract is built) = **89.3%** (target ≥85%). **No design number changed** — §6.10/§6.12's
element column was already correct; only the harness's stand-in was wrong. §7.1 has since moved
to using §6.10's real per-chapter weakness table directly (no more generic rotation anywhere in
the harness), so **any further re-run of these rows, or of the ch.1/3/5/7 rows that were also
measured under the retired rotation proxy, happens in §7.1/§7.2, not here.**

**2. Ch.10 boss — the one real, small tuning change in this fix round.** Boss HP bonus `+20 → +16`
(`hpMax` 127+16 = **143**, not 127+20 = 147 — propagated to §6.11/§6.12/§6.14), trading a little
raw HP for the fact that every boss, including this one, now shares a genuine phase mechanic (the
universal wind-up, §6.11) that the original `+20` figure predates. Measured at `n = 4000`, same
profile: `hpMax = 143` → **63.1%** (target ≥60%), a real ~3pp cushion above the floor — checked
against the *un-tuned* `hpMax = 147` at the same `n = 4000`, which measured 60.3%, i.e. inside MC
noise of the floor either way, confirming the tuned value clears it with margin rather than by
luck. Every other chapter's boss bonus stays `+20`, unchanged.

**Tuned constants relayed to §7.2 (M1) — the only two numbers this fix round changed:**
- Ch.10 boss `hpMax = 143`, replacing `147`, everywhere §6.11/§6.12/§6.14 state it.
- `duel-sim.mjs`'s standard-node element proxy for ch.8/ch.9 corrected to `Ice`/`Wind`
  respectively (harness-only; §6.10/§6.12's actual per-chapter elements are unchanged).

No change to `winCoins`, `rankPrice` (both since removed per D3 — see §6.17), the rate chain's
formula, or any other per-chapter weakness element. `duel-sim.mjs` remains limited to the shipped
4-element matrix, HP and rate — it does not model the 12-rune generator, riders, Signature Spells,
decoys, reflect, or boss-phase mechanics beyond a flat HP number.


---

## §7 Numeric model & telemetry

> Dissent: D8 (ad load, ~28/hour under the owner's time-only cadence) is already
> routed to the owner and I comply with it below. For the record, I'd still favor
> a session-level soft cap even under a time-only clock — 28/hour clears every
> portal's technical floor but is likely above what a reviewer or a parent calls
> reasonable for a children's-adjacent game. This does not change any number in
> this chapter.


Owner: Analyst. This chapter is the numeric spine every other chapter cites by
value: the difficulty curve's constants (consumed by §6), the wipe's back-solved
area/brush/speed (consumed by §8, §9), the ad cadence report (consumed by §11),
the save-size and asset-budget checks (consumed by §4, §9), and the full
telemetry event list (fired from files owned by §4/§5/§6/§8, defined here).

Methodology: every win-rate/duration number below is **[measured]** from a
committed Monte Carlo harness (§7.1), a near-verbatim port of the real
`think()/chooseRune()/launch()/strike()/stepShots()/tick()` in
`src/game/duel/sim.ts` and the constants in `src/game/duel/config.ts`. It is not
the real recognizer — the player is a stochastic agent, not a stroke — so
absolute percentages are good for **comparing curves against each other and
against targets**, not as a replacement for real `duel_end` telemetry once
nodes exist (§7.13 defines the event that supersedes it). The horn-to-horn
travel distance is now the corrected value, **362** stage units
(`AX+HDX=459` to `UX-HDX=821`, `sim.ts`), not the 478 used in Round 1; every
number in this chapter is re-run against the fix.

### §7.1 The sim harness, committed and CI-able `[S0]`

**Trial count, stated once (coverage audit E1):** every `[measured]` figure in
this chapter uses `n = 2000` trials per cell unless noted; the four rows
relayed from §6's fix-round rerun (§7.2: ch.8 std, ch.9 std, ch.10 std, ch.10
boss) use `n = 4000` and are labelled as such in the table. §6.21 reruns the
same committed harness independently for its own citations; where its decimals
differ from this chapter's by less than ~1-2 points in the same cell (e.g. a
65.7% vs 66.5%), that is seed/trial-count noise between two independent runs
of a stochastic harness, not a modelling disagreement. §7.2 is the canonical
table (M1) — §6.21 cites it rather than keeping a second, independently-varying
set of decimals.

**Harness bug fixed: the element-rotation proxy.** `scripts/duel-sim.mjs`
originally stood in for "which base element (Fire/Wind/Ice/Earth) this
chapter's standard foe is weak to" with a generic rotation,
`[FIRE, WIND, ICE, EARTH][(chapter−1) % 4]` — a placeholder that never
consulted the real per-chapter weakness §6.10 actually assigns. That silently
mis-graded ch.8 (proxy said Earth, real weakness is Ice) and ch.9 (proxy said
Fire, real weakness is Wind — itself a conservative placeholder for Moon,
which has no base-4 analogue), producing two false "misses" in the Round-2
table that were a harness defect, not a curve problem. **Fix, committed to
`scripts/duel-sim.mjs`:** the rotation proxy is replaced with a lookup against
§6.10's real per-chapter weakness table (one entry per chapter, keyed by the
same `chapter` index this chapter's formulas already use), so every future
rerun of this harness grades against the actual combat design instead of a
placeholder. §6 owns the weakness table itself; this chapter owns keeping the
harness's lookup in sync with it.

- **File:** `scripts/duel-sim.mjs` (new — `scripts/` already exists, holds
  `perf-ab.mjs`/`portal-qa.mjs`). This is the Round-1 throwaway, cleaned up and
  committed: a plain-JS port of the sim, parameterised by `(aiTier, foeEl, hpMax,
  playerProfile, onboarding, dreamDust)`, run thousands of times per
  configuration for win-rate/duration statistics. It is a **research tool**, run
  by hand or in a `pnpm balance` script — not a CI gate, because it's stochastic
  and slow (thousands of trials per config) and because it's a port, not the
  real code path.
- **CI gate (the thing that actually blocks a merge):** a new file,
  `tests/duel/balance.test.ts`, following the existing pattern in
  `tests/duel/rules.test.ts` (`resetDuel`/`updateSim`/`S` driven at the real
  `1/120` step). It does NOT re-implement the AI; it drives the REAL
  `src/game/duel/sim.ts` with:
  - a **scripted, deterministic virtual player** (a fixed rune sequence per
    test case, no RNG) proving a floor: "a player who always draws the
    counter-element rune and casts at 2 runes can clear chapter `N`'s standard
    node inside `T` seconds" — this pins the curve's *reachability*, not its
    *difficulty distribution* (that's what §7.1's Monte Carlo is for, offline).
  - assertions that `hpMax`/`aiTier` derived per node match the §7.2 formulas
    exactly (a regression pin on C13's constants, the same style as other
    constant-pinning assertions in `rules.test.ts` — the `winCoins`/
    `rankPrice` assertions this note used to cite are gone (removed per D3),
    since there is no currency left to pin).
  - a **frozen-corpus-style golden value**: for a fixed seed and a fixed
    scripted "core" policy, the resulting win/loss and `S.dur` are asserted
    bit-for-bit, so nobody can silently change `sim.ts`'s constants (rate
    formula, `elemMul`, `SPELLS` damage) without a failing test flagging it.
  - Run in the normal `vitest` suite, on every PR.
- **Reference player profiles**, used consistently through this chapter and by
  `duel-sim.mjs`:

  | Profile | Attempts/s | Recognition success | Combo target | Weakness bias | Role |
  |---|---|---|---|---|---|
  | `toddler` | 0.4 (2.5 s/attempt) | 60% | 1 | 0% | floor check only, never a target gate |
  | **`core`** | 0.8 (1.25 s/attempt) | 85% | 2 | 50% | **the target-gating profile for every win-rate number in this spec** |
  | `expert` | 1.2 (0.83 s/attempt) | 95% | 3 | 85% | ceiling/sanity check only |

  `core` is the profile C13's "standard ≥ 90%, boss ≥ 75%" targets are measured
  against, per the ruling's own text ("the §7 'core' profile"). This chapter
  defines it exactly as above; §5's real recognizer telemetry (`recognition_attempt`,
  §7.13) is what eventually replaces the 85%/50% guesses with a measured number.

### §7.2 Per-chapter numeric table — THE canonical measured table (M1)

**This table is canonical.** §6.21 cites these numbers; it does not keep a
second, independently-varying set of decimals for the same cells (M1, coverage
audit E1).

**Amended two-part target (M1, supersedes the single flat numbers used in
Round 2):**
- First attempt, standard nodes: **≥ 90%** (chapters 1-6), **≥ 85%** (chapters
  7-10).
- First attempt, bosses: **≥ 75%** (chapters 1-6), **≥ 60%** (chapters 7-10).
- Cleared within 3 attempts (any node, any chapter): **≥ 95%**.

Formulas, from C13, restated with their arithmetic:

- `aiTier(chapter) = 0` for ch 1-3, `1` for ch 4-6, `2` for ch 7-10 (capped; C13
  deliberately never reaches the shipped ladder's tier 5).
- `base(aiTier) = 0.42 + 0.085 × aiTier` → tier0 = 0.420, tier1 = 0.505, tier2 = 0.590 runes/s.
- `onboarding(duelsPlayedTotal) = min(1, 0.7 + 0.05 × duelsPlayedTotal)` for the
  player's first 6 duels ever, `= 1` after. All figures below assume a player
  past their first 6 duels (`onboarding = 1`) — chapter 1 itself has 5 nodes, so
  this is true for everyone by node 6 (chapter 2, node 1).
- `dreamDust(lossStreakOnThisNode) = max(0.6, 1 − 0.08 × n)`, `n` capped at 5.
  `= 1` on a first attempt (`n = 0`).
- `rate = max(0.25, base × onboarding × dreamDust × effects)` — `effects = 1`
  unless §6 attaches a chapter mechanic to the foe's own casting speed (none do
  today; Time/Frost act on the PLAYER's or the foe's queue, not her rate — §6 to
  confirm this stays true as chapters are built).
- `stdHpMax(chapter) = 100 + 3 × (chapter − 1)`.
- `bossHpMax(chapter) = stdHpMax(chapter) + 20`, **plus a phase shift at 50% HP**
  (§6 attaches that chapter's mechanic there — not modelled in this chapter's
  sim, see the caveat in §7.4) — **with one explicit exception: chapter 10's
  boss bonus is `+16`, not `+20` (`bossHpMax(10) = 143`, not 147).** §6's own
  tuning pass (§6.21) dropped it from +20 to +16 because the phase-2 wind-up
  (not modelled by this chapter's plain-HP sim) already carries the extra
  fight length that the +20 bonus was otherwise supplying as a stand-in. Every
  other chapter keeps the flat `+20` boss bonus.

| Ch | aiTier | rate (runes/s) | Std HP | Boss HP | Std target | Std win% (try 1) `[measured]` | Boss target | Boss win% (try 1) `[measured]` |
|---|---|---|---|---|---|---|---|---|
| 1 | 0 | 0.420 | 100 | 120 | ≥90% | 99.9 — MEETS | ≥75% | 98.4 — MEETS |
| 2 | 0 | 0.420 | 103 | 123 | ≥90% | 99.5 — MEETS | ≥75% | 98.2 — MEETS |
| 3 | 0 | 0.420 | 106 | 126 | ≥90% | 100.0 — MEETS | ≥75% | 98.0 — MEETS |
| 4 | 1 | 0.505 | 109 | 129 | ≥90% | 93.8 — MEETS | ≥75% | 88.3 — MEETS |
| 5 | 1 | 0.505 | 112 | 132 | ≥90% | 98.0 — MEETS | ≥75% | 86.0 — MEETS |
| 6 | 1 | 0.505 | 115 | 135 | ≥90% | 96.4 — MEETS | ≥75% | 86.1 — MEETS |
| 7 | 2 | 0.590 | 118 | 138 | ≥85% | 98.3 — MEETS | ≥60% | 66.5 — MEETS |
| 8 | 2 | 0.590 | 121 | 141 | ≥85% | 98.1 — MEETS `n=4000` | ≥60% | 63.9 — MEETS |
| 9 | 2 | 0.590 | 124 | 144 | ≥85% | 89.3 — MEETS `n=4000` | ≥60% | 61.8 — MEETS |
| 10 | 2 | 0.590 | 127 | **143** | ≥85% | 88.1 — MEETS `n=4000` | ≥60% | 63.1 — MEETS `n=4000` |

**All 20 rows now meet the amended two-part target on the first attempt** —
the three rows this chapter previously carried as "pending §6 tuning" are
filled in above from §6's fix-round rerun of this same harness (`n = 4000`;
this chapter's other rows are `n = 2000` — see §7.1's note on why the
decimals don't need to match to the point):

- **Ch.8 standard (98.1%)** and **ch.9 standard (89.3%)** needed **no design
  change** at all. Both misses in the Round-2 table were a **harness bug**,
  not a curve problem: the sim's generic element-rotation proxy for "which
  base element is this chapter's standard foe weak to" didn't match §6.10's
  real per-chapter weakness table. Ch.8's real weakness is Ice (the proxy had
  Earth); ch.9's is Wind (the proxy had Fire, and — per §6's own note — Wind
  is a conservative placeholder since Moon has no base-4 analogue in the
  sim). §7.1 records the fix.
- **Ch.10 boss (63.1%)** needed one **tuned constant**: `bossHpMax(10)` drops
  from `stdHpMax(10)+20=147` to `stdHpMax(10)+16=143` (§7.2's formula above
  now carries this as an explicit, named exception), because the chapter's
  phase-2 wind-up already supplies the extra fight length the flat +20 bonus
  was otherwise standing in for.
- **Ch.10 standard (88.1%)** is unchanged in every respect (same HP=127,
  same rate) — restated here at `n=4000` for consistency with the other
  three relayed rows; the ≈0.5-point difference from this chapter's own
  earlier `n=2000` figure (88.6%) is exactly the seed/trial noise §7.1
  already flags, not a further change.

> **S4 (2026-09-19): the canonical measurement is now the real duel.**
> `pnpm test:winrate` (`tests/duel/winRate.test.ts`) runs §7.2's core
> child against `updateSim` itself, with every chapter mechanic live, and
> asserts the two-part target per chapter. This table's `duel-sim.mjs`
> figures were far kinder than the real duel. §8.18 has the retune and the
> measured table that replaces the one above.

### §7.3 Duel duration targets `[measured]`

| Node type | Chapters 1-3 | Chapters 4-10 |
|---|---|---|
| Standard | 17-33s | 37-48s (HP growth + `core`'s 2-combo cadence) |
| Boss | 30-32s | 32-33s (flat — HP grows only +3/chapter, rate is tier-capped) |

**Targets:** standard duel 20-45s, boss duel 30-40s. The boss figure is
measured with **no phase-shift mechanic** modelled (§6 owns that; a real
phase-2 trick almost certainly lengthens a boss fight further — treat 30-40s as
a floor, not a ceiling, until §6's mechanic is simulated too).

**Correction:** this chapter's Round-2 draft attributed the ch.7-vs-ch.8
standard-node gap to an elemental asymmetry (`EARTH`'s single-rune spell being
a zero-damage barrier, making "counter a FIRE-themed foe" uniquely weak). With
the harness's element-rotation proxy fixed (§7.1), that specific gap is
**gone** — ch.7 and ch.8 are both Ice-themed once graded against §6.10's real
weakness table, and both now measure in the high-90s. The gap was the proxy
bug, not this elemental effect; the diagnosis is withdrawn as applied to
ch.7/ch.8 specifically.

The underlying structural point still stands in the abstract and is worth §6
knowing regardless: `EARTH`'s own single-rune spell (`earthWall`) is a
zero-damage barrier, not a bolt, so a player countering a FIRE-themed foe with
a single EARTH rune (the "correct" counter) deals **zero** direct damage where
countering any other element with its single-rune counter deals real damage.
This chapter has not independently verified which chapters §6.10's real
weakness table actually assigns Fire to (only ch.8's Ice and ch.9's Wind
corrections were relayed) — any chapter that turns out to be Fire-weak
should be spot-checked against this effect once the harness is pulling
weaknesses from §6.10 directly (§7.1), rather than assumed clear by default.

### §7.4 The amended target's "within 3 attempts" clause, and Dream Dust's role

**This section is reframed from Round 2 (M1).** The Round-2 draft ran a
"cumulative-by-try-2" rescue against SEVEN rows that read as failures under
the old, flat, single-number targets (standard ≥90%/boss ≥75% everywhere).
Under the amended, per-band targets adopted in §7.2, four of those seven
(ch.7 boss, ch.8 boss, ch.9 boss, ch.10 std) were never actually below
target — they meet their real, amended band on the first attempt, and no
rescue was needed for them. Re-running that narrative against them would have
been solving a problem the amendment already removed; it is dropped here
rather than kept as dead weight.

**Update: all 20 rows now clear the amended target on the first attempt**
(§7.2) — two of the original three "miss" rows (ch.8 std, ch.9 std) turned
out to be a harness bug, not a design shortfall, and the third (ch.10 boss)
is now fixed by a small, named HP exception. Nothing remains "pending."

The amended target's second clause — **cleared within 3 attempts, ≥95%,
every chapter** — is trivially satisfied for 19 of the 20 rows, since every
row already clears its first-attempt band comfortably above the minimum
(the lowest first-try figure anywhere in §7.2 is now 63.1%, still well above
1 − (1−x) for any reasonable `x`). The one row worth actually checking is the
tightest, ch.10 boss:

`dreamDust(n) = max(0.6, 1 − 0.08 × n)`, applied to the rate multiplier on
attempt `n+1` (`n=0` on the first try, `n=1` on the second, etc., per §7.2's
formula chain). Cumulative pass probability by attempt `k` is
`1 − Π_{i=0}^{k−1}(1 − winRate(dreamDust(i)))`. This chapter's Round-2 pass
measured ch.10 boss's cumulative-by-3 rate at the OLD, harder configuration
(`hpMax=147`, first-try 58.3%): try 2 (`dreamDust=0.92`) measured 69.1%, try
3 (`dreamDust=0.84`) measured ≈78%, giving cumulative-by-3 ≈
`1 − (1−0.583)(1−0.691)(1−0.78) ≈ 97.2%` — already over the 95% clause at
the harder HP. The tuned configuration (`hpMax=143`, first-try 63.1%) is
strictly easier at every attempt (win rate is monotonic in `hpMax` at a fixed
rate), so its cumulative-by-3 rate is **necessarily ≥97.2%** without needing
a fresh simulation run — the clause holds for ch.10 boss by monotonicity,
tighter than it did before tuning, not looser.

### §7.5 Wipe time model — back-solved parameters `[S1]`

**Targets (C10):** standard sector 15s with the Stardust Brush, **12s with
the Magic Eraser** (both inside the 12-20s acceptable band — R-12 makes
these two figures apply to the SAME constant sector area, not two different
sector sizes), boss biome **≈10s, and never more than THREE shots of the
Sunbeam** (owner, 2026-09-20). The 45s / 13-sweep figure this section carried
before is WITHDRAWN: at thirteen aim-pull-release cycles the boss wipe had
stopped being a spectacle and become a chore, which is the one thing these
targets exist to prevent.

**Formula:** `T = coverage × sectorArea / (brushDiameter × wipeSpeed × pathEfficiency)`,
`coverage = 0.85`.

**Units, named explicitly (R-5).** Every area/diameter number in this section
is in the restore view's own reference space — a fixed virtual frame the
restore view scales, by one transform, to fit whatever the real device
viewport is (the same pattern `layout.ts` already uses for the duel's
`SW×SH = 1280×720` stage). Call this frame's units **restore-view units
(RVU)**; the numbers below are computed at the restore view's *reference
scale*, where **1 RVU = 1 CSS px**, so they read directly as CSS px at that
scale. Because the restore view fits the WHOLE sector to the viewport
(locked camera, C6), a phone renders the same sector — and the same brush,
stated in the same RVU — physically smaller than a tablet does (its actual
scale factor is below 1 at reference scale).

**What does NOT scale with the view: a finger's physical swipe speed.** A
swipe speed is a property of the player's hand, not of the transform — it
stays a roughly constant real CSS px/s regardless of how large or small the
sector renders. So on a small-phone viewport (scale factor below 1), the SAME
physical finger speed covers a bigger fraction of the (smaller-rendered)
sector per second than this section's reference numbers assume, and wipes
measurably run FASTER than the 15s/12s targets and the Sunbeam's three-shot contract; on a bigger-than-reference
device (tablet/desktop, scale factor above 1), the same swipe covers less of
the sector per second, so wipes run SLOWER. This is expected, not a defect in
the numbers below — they are reference figures for the scale-1 case. **Telemetry
that checks it:** `wipe_complete.durationMs` (§7.13), segmented by viewport
class (a coarse CSS-px-width bucket, or the restore view's own computed scale
factor if §9 exposes it) — this is what would show whether real wipes cluster
around the reference targets at scale 1 and diverge predictably elsewhere, and
is what any future per-viewport tuning of these targets should key off.

Brush diameter uses C10's stated floor, **72 RVU (=72px at reference scale)**
(36px radius) — on a typical 370-420px-wide phone viewport, 7% of the short
side (≈26-29px) is below the floor, so the floor is the binding number on
most devices. Wipe speed is a "relaxed, cozy" swipe, deliberately slower than
combat's rune-drawing pace.

**R-12: the standard sector area is CONSTANT across the whole campaign**
(moderator ruling — §8.14 fixes one art size; it does not grow with the tool
era). This replaces this chapter's earlier "Eraser-era area 567,900px², a
feature" framing outright: there is one standard sector area, back-solved
once from the Stardust Brush's 15s target, and the Magic Eraser clears the
SAME area faster (fatigue relief, C10's actual intent) rather than a bigger
area at the same speed.

- **Stardust Brush** (ch.1 through ch.3 node 4, i.e. before the ch.3 boss):
  diameter 72 RVU, speed 500 RVU/s, efficiency 0.5 (real strokes overlap).
  `sectorArea = T × brushDiameter × wipeSpeed × pathEfficiency / coverage
  = 15 × 72 × 500 × 0.5 / 0.85 ≈ 317,650 RVU²` (≈565×565 RVU). **This is now
  THE constant standard sector area, used for every standard node in every
  chapter — Stardust-era and Eraser-era alike.**
- **Magic Eraser** (the standard tool from the ch.3 boss onward, C10 —
  "larger, flat-edged, faster"): clears the SAME 317,650 RVU² sector, not a
  bigger one. Re-solved for a 12s target (the low end of C10's 12-20s band —
  the faster tool is the fatigue relief C10 intended across 40 standard
  wipes, not a bigger canvas): diameter 110 RVU, speed 550 RVU/s, efficiency
  0.37 (a lower efficiency than Stardust's — flat-edged, less forgiving of
  angle — but the bigger diameter and faster speed more than compensate).
  `T = sectorArea × coverage / (brushDiameter × wipeSpeed × pathEfficiency)
  = 317,650 × 0.85 / (110 × 550 × 0.37) ≈ 12.1s` — on target, low end of the
  12-20s band.
- **Sunbeam (boss chests only) — re-solved under M5 + R-12.** M5's
  boss:standard ratio (**4×**, matching §9's asset pixel dimensions,
  `2304×1344 / 1152×672 = 4.0`) now multiplies the CONSTANT standard area
  rather than the withdrawn Eraser-era figure: `bossSectorArea = 4 ×
  317,650 = 1,270,600 RVU²` (≈1,127×1,127 RVU) — **replaces the 2,271,600
  RVU² figure from this chapter's previous pass**, which was 4× the
  now-removed Eraser-era area; this is what §8.4/§8.14 should cite from here
  on.

  **Re-solved tool parameters — the FAN (owner, 2026-09-20).** The band no
  longer travels at a constant width. The light leaves the staff at a THROAT
  width and SPREADS as it flies, gaining a fixed half-width per unit
  travelled up to a ceiling of the sector's short side. A shot is therefore a
  WEDGE, not a lane — and the widest part of it lands furthest from the press
  point, which is also the part a child aims at least precisely, so the
  spread buys accuracy as well as area.

  Shipped (`src/game/restore/sunbeam.ts`, sizes in SECTOR UNITS — the sector
  is 1152 × 672 SU): `BEAM_W = 240` (throat), `BEAM_SPREAD = 0.24` (half-width
  gained per SU), cap `BEAM_MAX_W = SEC_H = 672`, `BEAM_SPEED = 980 SU/s`,
  `BEAM_RECHARGE = 0.35s` (was 0.6s — three shots should flow, not queue).

  The old back-solve `ceil(0.85 × area / bandArea)` no longer applies: a
  wedge's swept area depends on where it is fired FROM, so there is no single
  `bandArea` to divide by. The target is stated as a CONTRACT instead, gated
  from both ends by simulation on the real beam and coverage model
  (`tests/restore/sunbeamTiming`, `tests/restore/sunbeamBot`):

  | Case | Result |
  |---|---|
  | Three shots fired from an edge — across, down, or fanned from one rim spot | **always ≥ 85 %**: measured 100 % / 95.6 % / 94.4 % |
  | The best single shot there is (edge mid-point, straight down the long axis) | **80.9 %** — under the 85 % rule, so one shot can never finish |
  | A middling aimer (`sunbeamBot`, 10 seeds) | **2.8 shots / 8.8 s** mean, 4 shots worst case |
  | A careless aimer (`looks: 1` — aims at random dust) | 9 shots / 21 s worst case (was 14 shots / 33 s) |

  **Both ends of that table are load-bearing.** A tool that finishes in one
  tap is not an easier tool, it is a deleted one; the 80.9 % single-shot
  ceiling is what keeps the boss sector a two-or-three-shot performance
  rather than a button. The throat width, the spread and the recharge remain
  §8's feel numbers to tune — the contract above is what any retune must
  still satisfy.

### §7.6 Coverage-grid reconciliation (NUM-10, resolved)

Two DIFFERENT grids exist for two different jobs — my Round-1 "brush/4" rule is
withdrawn as a competing coverage grid and repurposed as a rendering-only number:

1. **Coverage measurement + save + the 85% threshold: the C9 grid, 24×14
   cells (336 total), fixed cell COUNT regardless of sector size.** This is
   what gets base64-encoded for the one in-progress sector (42 bytes → 56
   chars, confirmed: 336 bits ÷ 8 = 42 bytes exactly; 42 ÷ 3 × 4 = 56 base64
   chars exactly — C9's arithmetic checks out). `coveragePct = count(cells
   with alpha < 0.15) / 336`, sampled every ~250ms during an active wipe (not
   every frame — a perf number, see §7.11). Cell AREA (**recomputed under
   R-12's constant-area ruling**): standard ≈ 945 RVU²/cell (≈31×31 RVU) —
   ONE figure now, not a Stardust-era/Eraser-era split, since both tools
   clear the same 317,650 RVU² sector; boss ≈ 3,782 RVU²/cell (≈62×62 RVU),
   down from the previous pass's 6,762 RVU²/cell now that `bossSectorArea` is
   the corrected 1,270,600 RVU² (4× the constant standard area, not 4× the
   withdrawn Eraser-era figure). The coverage grid stays fixed at 24×14
   cells regardless of sector size, so this is a cell-size update only, not
   a grid-size one. Cross-check: one 72 RVU-diameter Stardust stamp
   (≈4,070 RVU²) covers ≈4.3 standard cells at once — coarse enough to feel
   generous, fine enough that a single dab doesn't finish the sector.
2. **Live paint-mask rendering resolution (perf only, never saved): display
   resolution ÷ 4** (§7.11 / NUM-17), e.g. a 1280×720 stage → a 320×180 mask
   canvas. This is what the brush actually paints into every frame; it has
   nothing to do with the 85% check.

State this distinction explicitly wherever the wipe is built (§8, §9): "the
save/threshold grid" and "the paint canvas" are not the same resolution and
must not be conflated.

### §7.7 Session and campaign model

Node time, built from C12 (dialogue), §7.3 (duel), and §7.5 (wipe):

**Updated under R-12** (the standard wipe target is now two figures, not
one: 15s Stardust-era, 12s Eraser-era, §7.5) — standard node time now splits
by era too:

- **Standard node, Stardust era (ch.1 through ch.3 node 4) ≈ 56s**: dialogue
  (1-2 bubbles, C12) ≈ 9s + duel ≈ 25s (blended target) + gift-drop/unbox ≈
  4s + wipe 15s + reveal beat ≈ 3s. `9+25+4+15+3 = 56`.
- **Standard node, Eraser era (ch.3's boss onward) ≈ 53s**: same breakdown
  with the 12s Eraser wipe target instead: `9+25+4+12+3 = 53`.
- **Boss node ≈ 85s** (bosses always use the Sunbeam, not the standard
  brush; re-solved 2026-09-20 against §7.5's three-shot Sunbeam — was 120s
  on the withdrawn 45s wipe): dialogue (3 opener/boss bubbles + 2 thank-you,
  C12) ≈ 18s + duel ≈ 35s (blended target) + chest unbox ≈ 7s + wipe 10s +
  reveal/rune-or-Signature-Spell unlock ≈ 15s. `18+35+7+10+15 = 85`.
- **Chapter 1-3 (Stardust) = `4×56 + 85 = 309s ≈ 5.15 min` each** (down from
  344s: every chapter ends on a boss, and the boss wipe lost 35s).
  **Chapter 4-10 (Eraser) = `4×53 + 85 = 297s ≈ 4.95 min` each** (down from
  332s, same cause plus the 3s-faster standard wipe).
- **Campaign (10 chapters) = `3×309 + 7×297 = 3,006s = 50.1 min`**, +10% for
  map traversal/admiring (GDD's explicit "scroll back" beat, C29) **`≈ 55.1
  min`** (down from 61.5 min — the whole 6.4 min is the three-shot Sunbeam,
  35s × 10 bosses).
- **Session:** average chapter time is now `3,006/10 = 300.6s`, so at a
  600s (10-min) Playgama/Playables target, `600 / 300.6 ≈ 2.00` →
  **≈2.0 chapters per 10-minute session** (up from 1.8). A full campaign is
  **≈5.0 sessions** for a daily returning player (`10 / 2.00`); the
  post-campaign loop (Prism-tier replay, spellbook completion, wardrobe, 2P)
  carries retention past that. **A shorter campaign is the cost of the
  three-shot Sunbeam and was taken knowingly** — the 6.4 min came out of the
  one stretch of the game a player was most likely to put the phone down in.

**Correction chain, for the record:** RULINGS.md's original shared-numbers
block ("Chapter ≈5.5 min, Campaign ≈60 min, session ≈2 chapters") didn't
compose from the ratified 56s/120s node times even before this chapter
touched anything (N-13/M29 caught that). The immediately preceding pass
corrected it to a single 5.7 min/63 min/1.7-chapters figure, assuming one
flat 15s standard wipe everywhere. **R-12 supersedes that single figure**
with a two-tier min-per-chapter split; the 2026-09-20 Sunbeam retune then
re-solved both tiers downward. The current, authoritative numbers are the
**5.15/4.95 min-per-chapter split above, a campaign total of ≈55.1 min and
a session figure of ≈2.0 chapters**; anywhere still citing 5.5/60/2, the
flat 5.7/63/1.7, or R-12's 5.73/5.53/61.5/1.8 should update to these.

### §7.8 Ad cadence under F25 — resulting ads per session/hour

`useAdGate.ts`'s two constants: `FIRST_INTERSTITIAL_AFTER_MS = 240,000`,
`INTERSTITIAL_MIN_GAP_MS = 121,000`, one shared clock, triggered on both win and
loss (`GameScene.vue`'s `maybeShowInterstitial`).

- **Per hour (sustained session):** `floor((3600 − 240) / 121) + 1 = 28`
  interstitials — confirms C8's own cited figure exactly.
- **Per 10-minute session:** eligible ad times are `240s, 361s, 482s, ...`. In
  600s: `t=240, 361, 482` fall inside the window → **3 interstitials**, or
  **4** on a portal that mandates a first-load ad (GameMonetize/GamePix/
  GameDistribution, C30) — the first-load ad fires at `t≈0` and seeds the
  clock (`markInterstitialShown`), and because `240s > 121s` the *next*
  eligible time is still governed by the 240s-from-session-start rule, so the
  sequence becomes `0, 240, 361, 482` → 4 in the same 600s.
  Node pace (§7.7, 53-120s) is well under the 121s floor, so **the ad clock,
  not the number of duels played, is always the binding constraint** — every
  eligible window is reliably hit by a duel ending on or after it.
- **This is D8's number, reported as asked, not re-litigated here** (see the
  dissent at the top of this file).

### §7.9 Coins: income, prices, rank cap

**Removed per D3 (owner, final, 2026-09-18): the story build has no currency
at all.** This section previously modelled coin income (`winCoins`), a rank
price curve (`rankPrice`), and a rank cap of 5 per element funded by a coin
jar + Rune Shrine (C4/NUM-15) — that whole framing, including the
`winCoins(chapter, isBoss)` table, the `rankPrice(rank)` cost curve, and the
income-vs-max-rank-cost check (≈1,746-to-2,145-vs-1,800 coins), is deleted
outright, not superseded in place, because D3 leaves no successor currency
number to report. There are no coins, no coin jar, no coin burst out of
gifts, no Rune Shrine, and no element ranks — `winCoins`, `rankPrice`,
`RANK_BONUS`, and `buyRank` are not used in the story build, and there is no
`DuelResult` shop panel. Poki's single-currency rule is satisfied trivially:
there are zero currencies.

**The win-rate guarantee itself still stands, just without shop framing:**
§7.1-7.4's whole win-rate table is simulated at zero ranks, and the C13
targets are met on that basis by construction. This is no longer "ranks are
optional ease, never required" (C4) — it is simpler than that: **the win-rate
targets are met with no ranks, because there are no ranks.** Nothing in §7.2
or §7.4 needs to change to keep this true; it was already simulated at
`rank = 0` throughout.

**The rewarded "Twin Gift" now pays a bloom, not coins** (supersedes the
coin part of F25, the owner's earlier ads pass paying ×2 coins after every
duel). It is offered on the map right after a sector's reveal, beside the
restored sector, win-only (needs a restored sector), gated by the existing
1.2s press-and-hold gate, film-strip glyph, and 6-per-5-min `canOfferReward`
limiter — all unchanged. One permanent cosmetic bloom per sector, ever (50
max, via the capped prop system); no power, no progress; no rewarded offer on
a loss. See §7.13's `reward_claim {sectorId, kind: 'bloom'}` for the event
this produces, and §7.14 for why there is nothing left to numerically tune
here (a fixed 1-per-sector/50-lifetime reward has no price curve to balance).

### §7.10 Save-size budget (checking C28's < 8KB)

New `S.campaign` fields (C28), sized:

| Field | Size |
|---|---|
| Done-bitset, 50 sectors | `ceil(50/8) = 7 bytes` → ~10 base64 chars |
| One in-progress sector's coverage grid (24×14, C9) | 42 bytes → 56 base64 chars |
| Colour-me picks (1 byte/sector, C11) | 50 bytes |
| Rune-unlock bitset (12 runes + 2 Signature flags) | 2 bytes |
| Cosmetic/gift-unlocked bitset (10 gifts) | 2 bytes |
| Wardrobe equipped-slot state (8 slots) | ~8 bytes |
| Dream Dust: current node id + loss streak (only the ACTIVE retry needs it — it resets on a win or a node change, so this is one counter, not 50) | 2 bytes |
| `am_schema` version tag | 1 byte |
| Existing `am_*` fields (wins/losses/best/etc., already shipped) | ~24 bytes |
| `combosSeen` — **M6: replaces the Round-2 "named-spell dict" row.** §4.6.1's fixed bitset over the 454-combo enumeration (12+78+364 multisets over 12 runes), base64-encoded | ≈93 bytes |
| JSON key-name overhead (field names, punctuation) | ≈200 bytes, generous |

**Total ≈ 431 bytes** (443 bytes with the other rows as previously listed,
minus the 12-byte "rank per element" row, dropped per D3 — there are no
element ranks left to persist. The 443-byte figure was itself down from
≈710 bytes in Round 2 with the other rows unchanged — the `combosSeen`
bitset swap alone saves ≈267 bytes; Round 2's own stated total of "≈726" was
itself a small, ~2% arithmetic slip against its own listed rows, caught in
this pass's arithmetic sweep, M29), comfortably under C28's <8KB budget and
Yandex's 200KB platform ceiling with nearly 20× headroom. This confirms PRAG/ARCH's "trivially inside
every cap" call in C28 with an actual byte count rather than an assertion.
`am_schema = 2`'s migration cost (mapping the Step-1 4-element `up` array
into the 12-element array, per F24) adds no persistent bytes, only one-time
migration code (§4's lane).

**Round-2 note withdrawn:** the Round-2 draft priced this field as a
`Record<string,1>`-shaped "named spells" dict, growing with however many
spells §6 hand-authors, and flagged that growth as a risk to re-check. §4.5.1
explicitly names and rejects exactly that encoding ("that encoding is what
made the Round-1 byte math for this same data ~30× larger") in favour of a
FIXED-size bitset over the whole enumerable combo space, regardless of how
many combos are named vs. fall back to a generated spell. Adopting §4's
bitset makes the note moot: `combosSeen` costs the same ≈93 bytes whether §6
hand-authors 20 spells or 200, so there is nothing left for this chapter to
re-check on a save-size basis. (§6's *authoring* cost is real but is not a
save-size question — §7.13's `spell_discovered` event still exists to tell
§6 how much of the enumeration players actually reach, independent of what
that costs to store.)

### §7.11 Perf budgets

Existing budget (`PERF-LEDGER.md`): 60fps = 16.67ms/frame, adaptive-quality
hysteresis at 15ms (restore) / 24ms (drop), unchanged by this spec.

- **Wipe mask blit + composite: ≤ 3 ms/frame for a standard sector, ≤ 4 ms/frame for a
  boss sector** (the boss mask renders at half resolution and is upscaled; §9.3.3 owns this),
  inside the existing budget (NUM-17, with §9's boss amendment).
- **Live paint-mask canvas: display resolution ÷ 4** (e.g. 1280×720 → 320×180),
  distinct from the 24×14 SAVE/threshold grid (§7.6 — do not conflate the two).
- **Coverage check cadence: every ~250ms**, not every frame, during an active
  wipe only.
- **Wipe sparkle VFX: shares the existing 360-particle pool** (`src/game/duel/fx.ts`)
  — no new cap, because combat and wiping never run concurrently (the restore
  view, C6, replaces the duel state entirely while wiping).
- **Persistent map props** (spinning windmills, flowing waterfalls — GDD's
  "permanence"): a SEPARATE, capped system, §9's numbers. This chapter notes
  the natural bound: per C29, only the current chapter ±1 has art resident, so
  at most ≈15 sectors' worth of props (3 chapters × 5 nodes) are ever resident
  at once, regardless of campaign progress — §9 should set a per-prop-type
  instance cap against THAT bound, not against all 50 sectors.

### §7.12 Asset byte-budget check (§9 owns the ceiling; this is the check)

Propose `scripts/check-asset-budget.mjs` (new), run in CI before any S4 pair
ships and on any PR touching `public/images/`:

1. Read a per-chapter byte ceiling from a config §9 owns (e.g.
   `art-budget.json`, one entry per chapter + a shared/UI bucket).
2. Sum actual built bytes per chapter, using a filename or manifest
   convention (`ch{N}-*`) that §9's art pipeline already needs for staged
   loading (per the `art-generation-pipeline` skill's staged-loading feature).
3. Assert `actual(chapter) ≤ ceiling(chapter)` for every chapter.
4. Assert `Σ actual(chapter−1..chapter+1) ≤ residentCeiling` — the runtime
   memory check that matches C29's "current chapter ±1 resident" rule, which
   is a DIFFERENT (and usually tighter) budget than "every chapter's total,"
   since only 3 chapters' worth of art is ever loaded at once.
5. Fail the build/PR on either assertion failing.

This chapter provides the check's shape and the two things it must assert
(per-chapter ceiling, resident-window ceiling); §9 provides the actual numbers
that go in `art-budget.json`.

### §7.13 Full telemetry event list — canonical names (M7)

Extends `src/use/useAnalytics.ts`'s `AnalyticsEvent` union. All fire through
the existing `track()`; the ring-buffer/portal-sink architecture there is
unchanged.

**These are THE canonical event names and payloads** (M7). §8.13, §11.3 and
§12 cite this table rather than defining their own competing versions.
**Retired aliases — do not use:** `restore_wipe` and `wipe_result` (both
folded into `wipe_complete` below, which now carries every field either of
them had); `node_result` (folded into `duel_end` below).

**Removed per D3:** `rank_buy` `{rune, rank, cost}` — there are no coins, no
Rune Shrine, and no ranks to buy in the story build, so no rank-purchase
event ever fires. Any coin-earn, coin-balance/wallet, or shop-open telemetry
this chapter may previously have implied alongside it is removed for the
same reason.

**R-14: §3's abandon/interrupt events join the canonical registry** —
`duel_abandon` and `wipe_interrupted`, below. Both cover a real gap this
table previously had: every other event assumes a duel or a wipe runs to
completion (win, loss, or 85%+); neither the "Leave duel" footer action
(§3.3.8) nor a wipe the player walks away from mid-stroke had anywhere to
report that a session ended some OTHER way.

| Event | Payload | Fires from | Status |
|---|---|---|---|
| `duel_start` | `{nodeId, chapter, isBoss, wins, losses, lossStreak, duelsPlayedTotal}` | `GameScene.vue` `restart()`/`onMounted` | existing, payload extended (`foe` → `nodeId`/`chapter`/`isBoss` per F21's split; `lossStreak`, `duelsPlayedTotal` new, needed to tune §7.2/§7.4's onboarding+Dream Dust curves) |
| **`duel_end`** | `{nodeId, chapter, isBoss, won, durationMs, lossStreak}` | `GameScene.vue` `presentResult()` | **canonical (M7)** — existing event, payload extended (`foe` → `nodeId`/`chapter`/`isBoss` per F21's split); this is the event that eventually replaces every `[measured]` figure in §7.2/§7.4 with real data. §11's worked examples still show the old `{foe, won, durationMs}` shape and need updating to this one (audit N-12) |
| `duel_abandon` | `{nodeId, wasReplay}` | `GameScene.vue`, the "Leave duel" footer action (§3.3.8) | **new (R-14)** — fires instead of `duel_end` when the player leaves mid-duel rather than winning or losing; `wasReplay` distinguishes a practice replay (C24, no gift/reward at stake) from a real attempt, so §7.2's win-rate table isn't polluted by abandons that were never a genuine loss |
| `first_rune` | `{onboarding}` | `GameScene.vue`'s `onDuelEvent` listener, on sim's `'rune'` event | existing, unchanged |
| `recognition_attempt` | `{success, rune, ec, turn, margin}` | `src/game/duel/sim.ts` `strokeEnd()`, immediately after `recognise(S.pts)` — **new mechanism needed**: `recognise()` in `src/game/duel/runes.ts` already computes `ec`/`turn`/`bs[]`/`THRESH` internally but returns only the rune id; add a diagnostic capture (either a second return value or a parallel exported function, matching the existing `rawScore` diagnostic export's pattern) so `strokeEnd` can set `S.lastRecognition = {success: r>=0, rune: r, ec, turn, margin: bestRawScore − THRESH}` and `emit('recognise')` before clearing. `GameScene.vue`'s listener reads `S.lastRecognition` and calls `track()`. Does NOT change `recognise()`'s accept/reject behaviour — C1.2's frozen-corpus rule stays intact. `margin` is defined as the best raw template score across all four (soon twelve) runes minus `THRESH`, regardless of which rune that was — it answers "how close to acceptance was this stroke," independent of `ec`/`turn`'s separate answer to "was its *structure* right." | **new** (ratified verbatim by RULINGS.md's "Numbers every chapter must share" — §7 defines it, §5 consumes it) |
| `spell_discovered` | `{comboKey, runeCount, chapter}` | `src/game/duel/sim.ts` `launch()`, at the equivalent "newly discovered" check against §4's `combosSeen` bitset (M6 — the field this reads is no longer a `Record<string,1>`, but the "first time this combo is cast" trigger point is the same) — add `emit('discover')`, consumed in `GameScene.vue` | new — measures how much of the 454-combo enumeration players actually reach; independent of `combosSeen`'s fixed save-size cost (§7.10) |
| `reward_claim` | `{sectorId, kind: 'bloom'}` | `GameScene.vue`'s Twin Gift handler, on a successful press-and-hold claim | **updated (D3)** — payload changed from the coin-era `{kind: 'double'|'consolation', coins}` shape; the Twin Gift now pays exactly one permanent cosmetic bloom per sector (50 max, ever), offered on the map right after a sector's reveal, win-only, gated by the existing 1.2s press-and-hold gate and 6-per-5-min `canOfferReward` limiter — there is no loss-side offer |
| `ad_interstitial_shown` | `{trigger: 'win'|'loss', sinceLastMs, sessionElapsedMs}` | `GameScene.vue` `maybeShowInterstitial()`, right after `markInterstitialShown()` | **new** — this is what turns §7.8's computed 28/hour into a measured number, and is the metric D8 needs if the owner ever revisits the session cap |
| `wipe_start` | `{sectorId, chapter, isBoss, tool, sectorAreaRvu2}` | new wipe module (`src/game/restore/`, per M16 — not yet built) | new — supporting event, not part of M7's canonical pair; kept for `coverage85AtMs`'s baseline. Field renamed `sectorAreaRvu2` (was `sectorAreaPx2`) to match §7.5's RVU convention (R-5) |
| **`wipe_complete`** | `{sectorId, chapter, isBoss, tool, durationMs, coverage85AtMs, coveragePct, strokeOrSweepCount, manualTo100, graceFinish, rescueFound}` | same new module (`src/game/restore/`) | **canonical (M7)** — supersedes this chapter's Round-2 draft (which lacked the last three fields) and §8.13's separately-defined `restore_wipe` (retired alias, folded in here). `coverage85AtMs`: ms from wipe start to first crossing 85% (checks C25's 1.5s idle grace and this chapter's 15s/12s targets and the Sunbeam's three-shot contract). `coveragePct`: final coverage at completion (usually ≥85%, may be 100 if `manualTo100`). `manualTo100`: true if the player kept wiping past the 85% auto-complete pop to full coverage (a completionist signal, §8's to interpret). `graceFinish`: true if §8.6's graceful finish (owner, 2026-09-20) ended the wipe — the sector LOOKED clean before the arithmetic reached 85 %, so `coveragePct` may read below 85. `rescueFound`: true if §8's rescue-assist for a coarse-grid-missed spot ever triggered during this wipe (inherited from §8.13's definition; §8 owns the mechanic, this chapter only owns the event's existence and firing point). **Also the event R-5 relies on**, segmented by viewport class, to check whether real wipe durations track the reference-scale targets |
| `wipe_interrupted` | `{sectorId, pctAtInterrupt, reason}` | same new module (`src/game/restore/`) — fires instead of `wipe_complete` when the restore view is left before 85% coverage (e.g. the player backs out to the map, or a platform pause/interruption per `useGamePause` ends the session there) | **new (R-14)** — `reason` is a small enum (`'left' | 'platformPause' | 'other'`); this is what tells §7.5/§8 whether the 15s/12s targets and the Sunbeam's three-shot contract are being abandoned rather than just measured slow, which `wipe_complete.durationMs` alone can't distinguish |

**Explicitly out of this chapter's lane** (belongs to whichever chapter owns the
feature, flagged so it isn't silently missing): map/wardrobe/spellbook
engagement funnels (§3/§8), portal-specific ad-fill/no-fill diagnostics (§11).
This list is scoped to events that feed a *numeric tuning* decision in this
chapter or in §5/§6/§8/§9's cited numbers.

D1 retention (NUM-12, revised): **tracked as a metric, not specified as a spec
number.** No event above computes it directly — it's derived by whoever runs
analytics from `duel_start`'s timestamps across return visits, same as any
portal's own retention dashboard. Nothing in this chapter gates on a D1 target.

### §7.14 Tuning procedure per constant

| Constant | Starting value | Tuned by |
|---|---|---|
| `base(aiTier)` coefficients (0.42, 0.085) | §7.2 | `duel_end.won` aggregated by `chapter`, compared to §7.2's win-rate table — re-run `scripts/duel-sim.mjs` against real `duel_end` data once it exists |
| `onboarding` ramp (0.7→1.0 over 6 duels) | §7.2 | `duel_end.duelsPlayedTotal` × `won`, specifically for the first 6 duels ever — the exact segment C13's ramp targets |
| `dreamDust` curve (0.08/loss, floor 0.6) | §7.4 | `duel_end.lossStreak` × `won` — does the measured cumulative-within-3-attempts rate actually clear the amended target's ≥95% clause (§7.2/§7.4) |
| Standard/boss HP curves | §7.2 | `duel_end` win rate by `chapter`/`isBoss`, checked against `tests/duel/balance.test.ts`'s regression pins |
| Wipe brush/speed/efficiency | §7.5 | `wipe_complete.durationMs`/`coveragePct`/`strokeOrSweepCount` vs. the 15s (Stardust)/12s (Eraser) targets and the Sunbeam's ≤ 3-shot / ≈10s contract, segmented by viewport class per R-5 (the Sunbeam's fan is sized to the SECTOR, not the finger, so its figure should NOT drift with viewport class — if it does, something is wrong) |
| 24×14 coverage grid size | §7.6 | qualitative only (does 85% ever feel like it missed something) — no numeric telemetry needed, a fixed grid is cheap to keep as-is unless §12's playtests flag it |
| Twin Gift bloom pacing (1 per sector, 50 lifetime cap, 6-per-5-min limiter) | §7.9/D3 | no numeric tuning needed — the reward is a fixed one-per-sector cosmetic with no price curve; `reward_claim` volume is only a lifetime-cap/limiter sanity check, not a balance lever (removed the old `winCoins`/`rankPrice`/rank-cap row here per D3, since there is no currency left to tune) |
| `INTERSTITIAL_MIN_GAP_MS`/`FIRST_INTERSTITIAL_AFTER_MS` | owner's F25 values, unchanged here | `ad_interstitial_shown` volume vs. §7.8's 28/hour figure — this is D8's number if the owner revisits it |
| Save-size budget | §7.10's ≈443-byte estimate (M6) | no telemetry needed — `combosSeen`'s fixed-bitset cost (§4.6.1) does not vary with how many spells §6 authors, so there is nothing left to re-check here on a save-size basis |
| Perf: wipe budget ≤ 3 ms/frame standard / ≤ 4 ms/frame boss (§9.3.3), mask ÷4 resolution | §7.11 | the existing `usePerfProbe.ts`/`perfVariants.ts`/`scripts/perf-ab.mjs` harness (already committed), same A/B method as every other perf number in `PERF-LEDGER.md` |
| Asset byte ceilings | §9's numbers | `scripts/check-asset-budget.mjs` (§7.12), on every PR touching `public/images/` |

### §7.15 Non-goals

- This chapter does not model §6's boss phase-shift mechanics numerically —
  the boss win-rate figures in §7.2/§7.4 are a floor, not a validated final
  number, until §6's phase design is added to `duel-sim.mjs` or measured live.
- This chapter does not set the asset byte ceiling (§9's number) or the exact
  wipe feel (brush texture, particle look — §8's), only the arithmetic they
  tune against.
- This chapter does not re-litigate D8 (ad cadence) or D3 (currency) —
  it reports the numbers those decisions produce.


---

## §8 Restoration loop

> Dissent: the 15 s standard-wipe target (§8.4) is tighter than I'd pick for the ASMR pillar in isolation — at that length the speed-response and dwell mechanics barely get to register before the sector's done. I comply with 15 s (target, 12–20 s acceptable) because the ×40-sectors total-session-time argument in the ruling is sound, and I've leaned on the chime ladder and sparkle density to carry more of the "cozy" feel per second rather than stretching the clock.


Owner: Cozy. Covers the gift → unbox → wipe → reveal → permanence loop, the Twin Gift's presentation and its Bloom reward, and the map-as-trophy browsing experience. §3 owns scene entry/exit and the tent's interaction flow; §9 owns render tech, the coverage-mask implementation and its numeric caps; §7 owns the tuning harness and the final say on any number marked "assumption" below; §11 owns the ad-gating logic behind the Twin Gift, not its look.

### §8.1 What this chapter deliberately does not build

- **No coin wallet HUD, no shop panel, no jar, no Rune Shrine.** The story build has no currency at all (D3, §8.9) — there is nothing to hold, spend, or rank up. `RANK_SHOP_PANEL` and `RANK_BONUS` are unused.
- **No random tool assignment.** Tools are fixed by node type and chapter (§8.4). A gift's wrapping always tells you what's inside before it opens.
- **No extra reward for a hand-cleared 100 %.** Dream Dust stays loss-only pity (§7) — a duel mechanic, untouched by this chapter's currency removal. A perfectionist full clear gets a ceremonial payoff only (§8.6), never Dust, and (now that coins no longer exist, D3) there is no coin reward to withhold either.
- **No age-tiered wipe difficulty.** One brush, one Eraser, one Sunbeam, one 85 % rule, one 1.5 s grace, for every player. Depth for older/cozy players comes from choosing to hand-clear past 85 % and from the colour-me pick, not from a difficulty branch.
- **No reward of any kind from tap-creatures.** Tap-creatures (§8.8) stay delight-only: a peek-a-boo and one chime note, never a Bloom or anything else — the Bloom is exclusively the Twin Gift's post-reveal payload (§8.2, §8.8.5).
- **No sky-seeded dust opacity at ship.** Tagged `[later]` in §8.6; only the chime's major/minor mode is sky-seeded at ship, because it's free.
- **No Rune Shrine, period.** The shrine and its per-element rank crystals are removed from the story build along with the rest of the currency (D3, §8.9).
- **The permanent cosmetic Bloom is no longer deferred.** D3 (2026-09-18) removed the coin currency, meeting the condition this chapter's first draft reserved the Bloom for — it has been promoted from `[later]` to the Twin Gift's actual, only payload. Full mechanic in §8.8.5.

### §8.2 Gifts: types and appearance

Three gift silhouettes exist. The GDD's zero-UI pillar (re-scoped by §2.C21-equivalent ruling to map/restore/reward only) means the wrapping itself is the only "icon" a player ever needs — no label, no text.

**Standard Gift** `[S1]`
- A round-wrapped parcel with a soft bow when it contains the Stardust Brush — every standard node through chapter 3's node 4 (chapters 1–3, before that chapter's own boss).
- A square, corner-folded box (flat creases, no bow) when it contains the Magic Eraser — every standard node from chapter 4 onward, once the chapter-3 boss chest has unlocked it (§8.4). The shape swap is itself the "you've graduated tools" beat — no dialogue needed.
- Drops onto its sector during the victory flourish (§3 owns the flourish timing; assumed 1.4 s per §7).
- Wrapping colour is the chapter's element accent from `art-style.md` §4.2 (e.g. Whispering Woods = moss green ribbon), never a rune-specific colour, since the gift is about the TOOL, not the new rune.

**Boss Chest** `[S2]` (chapter 1's own node 5 ships at S2, so the chest and the Sunbeam it carries are needed from the first stage that has a boss node, not held back to S3)
- Large, ornate, hinged, with a glowing seam along the lid and a clasp cut as the chapter's element gem.
- Always contains the Sunbeam. The rune/Signature-Spell reveal that rides along with it is §5/§6's beat, staged inside the same open (§8.3).
- Sits centred on the boss sector rather than off to one side, because there is only one per chapter and it should read as the chapter's headline reward.

**Twin Gift** `[S2]`, presentation only — ad gating is §11
- Appears only AFTER a win, once that sector's reveal wave (§8.6) has finished playing — never during unboxing, never during the wipe. It sits on the map beside the just-restored sector: a second, visibly different gift, ribboned, carrying a small film-strip glyph rendered identically in every locale (no text on the glyph itself).
- A slow, continuous shimmer/pulse loop (period ≈ 1.1 s, opacity 0.85→1.0→0.85) is its idle state — no idle-shake, so it is never confused with the tap-to-open standard gift.
- Present only on a WIN, and only while `canOfferReward` is true (§7/§11's limiter — an ad-frequency cap, unrelated to which sectors have or haven't been offered a Bloom); absent entirely under `VITE_CHILD_DIRECTED` (§2/§11). There is no Twin Gift, and no reward offer of any kind, on a loss — a loss has no just-restored sector to attach a Bloom to, and the design intentionally does not sell an easier retry to a losing player.
- Never contains a tool. Its only payload is a permanent cosmetic Bloom for the sector it's offered beside (§8.8.5) — one bloom per sector, ever, one-time-claimable; it therefore never plays a tool-float beat.
- **Accessibility:** the hold gesture carries an aria-label. Its copy is the i18n key §10 defines for the Twin Gift's hold prompt (§10.20's key count); this chapter never hard-codes that string.

### §8.3 Unbox choreography

All three opens are tap/hold-only (no drag), skippable after their first beat once a gift TYPE has been seen once (a repeat player who has opened forty standard gifts does not sit through the shake every time).

**Standard Gift — total 1.6 s**
| ms | Beat |
|---|---|
| 0–350 | Idle shake, inviting the tap: rotation ±4°, period 90 ms, up to 3 cycles. |
| 350–650 | Tap → bow untie (300 ms): the ribbon curve animates loose, one `snap`-family audio cue. |
| 650–900 | Burst (250 ms): reuses the whole-vocabulary burst convention already proven for victory (`src/game/duel/fx.ts` `rainbowBurst`), scaled to ~40 % size and recoloured to the tool inside — soft pastel glints for the Brush, brighter white/earth-toned for the Eraser. |
| 900–1600 | Tool eases (ease-out cubic, 700 ms) from the burst origin to the player's last touch point — not a fixed slot, so the world visibly responds to the player, not to a HUD. |

**Boss Chest — total ~2.5 s**
| ms | Beat |
|---|---|
| 0–500 | Idle rattle + gem-clasp flicker (bigger and slower than the standard shake). |
| 500–950 | Tap → clasp unlocks, lid creaks open (450 ms). |
| 950–1500 | Full-size burst (550 ms), simultaneous with §5/§6's rune/Signature-Spell reveal riding the same beat. |
| 1500–2500 | Sunbeam eases to the player's last touch point (1000 ms, slower and grander than the standard 700 ms) under a boss-fanfare audio flourish (§8.5). |

**Twin Gift — hold, not tap** (appears only post-reveal, on a win — §8.2 owns exactly when)
- Press-and-hold **1.2 s**: a progress ring draws clockwise around the gift in sync with the hold, and the ribbon visibly loosens at the 25/50/75/100 % keyframes. Releasing early re-tightens the ribbon over 200 ms and resets the ring to 0 — this teaches the "don't let go" rule to a pre-reader without any text, and is the deliberate friction against an accidental toddler tap.
- On completing the hold: an immediate 250 ms burst in silver/gold (distinct from every tool burst, so it never reads as "a tool is coming"), then the Bloom activates on the just-restored sector beside it (§8.8.5) — no float-to-finger beat, because there is no tool and nothing travels to a HUD; the reward is the world itself quietly becoming a little more alive.

> **Superseded in part by §8.25 (owner, 2026-09-19):** the Stardust Brush is
> drawn as the Stardust Sponge (same mechanics). Every tool follows a mouse
> without a press, and shows itself working when the child is idle.

### §8.4 The three tools — exact parameters

Tools are deterministic by node type and chapter (never random), per the ruling. All radii are CSS px against the restore view's own on-screen short side (`shortSide`); the restore view is the camera-locked, zoomed map canvas framed in §3.5.2, with pan/pinch detached per §3.3.2.

Two regimes exist and cross over at `shortSide ≈ 514 px` (where `36 px == 7 % of shortSide`): below it every device uses the fixed 36 px floor (this covers the whole stated minimum-device range, 320–658 px), above it (tablet, desktop fullscreen) the tool scales up with the view so the felt tool-to-sector ratio stays constant.

**Stardust Brush** `[S1]` — the default for every standard node through chapter 3's node 4 (chapters 1–3, before that chapter's own boss).
- Shape: soft round dab, radial falloff.
- Core contact radius: `max(36, 0.07 × shortSide)` CSS px.
- Feather: an additional +3 percentage points of `shortSide` beyond the core radius, alpha ramping 100 %→0 %.
- Dwell rule: a first pass over a coverage cell removes 55 % of that cell's remaining dust alpha; a second overlapping pass within a rolling 2.5 s window removes the rest. A cell touched once and never revisited settles visibly at 55 % cleared. This is the deliberate "come back and finish it" scrub feel.
- Speed response: erase strength multiplier = `1.0 − 0.4 × clamp(speed / 400 px·s⁻¹, 0, 1)`, floor 0.6 at high speed. **Slow, lingering strokes clear more per pixel; fast flicks cover more ground but shallower.** This is the ASMR lever — dawdling is rewarded, not just tolerated.
- Sparkle trail: reuses the `trail()` convention in `src/game/duel/fx.ts` (K_GLINT burst, radius 8 stage units, life 0.45 s), rate-limited to one spawn per 55 ms of contact (the same limiter the `draw` sfx cue already uses), 1 particle per tick, rising to 2 when local speed > 250 px·s⁻¹. The ring-allocator in `fx.ts` (`sp()`) makes this pool-safe by construction — a saturated pool just recycles its oldest slot, so no cap check is needed here.

**Magic Eraser** `[S3]` — unlocked at the chapter-3 boss chest; becomes the default standard-node tool from **chapter 4 onward**. Chapter 3's own standard nodes 1–4 still use the Stardust Brush — the boss chest that grants the Eraser is node 5, so it can't retroactively apply to nodes the player has already cleared that chapter. Once unlocked, it fully replaces the Brush for every later standard node (the Brush is a chapters-1–3 tool only).
- Shape: a flat-edged rounded rectangle whose long axis auto-rotates to the stroke's velocity heading (the same "shaped debris flies point-first" convention `fx.ts` already uses for thrown spell debris).
- Half-extents: long axis `max(46, 0.09 × shortSide)` CSS px; short axis = 65 % of the long axis (a squarish paddle, not a blade).
- Dwell rule: **none.** Single contact fully clears (100 % alpha in one pass). This — not raw size — is what makes it read as "confident and fast" rather than "big brush."
- Speed response: **none**, deliberately. The Eraser removes the skill dimension; it is the tool for a player who has already had their ASMR chapters and now wants brisk pacing.
- **Target: ≈12 s** for a standard wipe (the low end of C10's own 12–20 s acceptable band) — deliberately faster than the Brush era's 15 s, as the intended fatigue relief once a player has done 12+ Brush wipes. Per the moderator's ruling, the standard sector's AREA stays constant chapters 1–10 (§8.14) — the Eraser reaches 12 s by being a faster tool on the same-size sector, not by the sector shrinking. §7.5 owns the exact radius/dwell constants that hit 12 s on that fixed area; this chapter states the target and cites §7.5 for the parameters rather than re-deriving them.
- Sparkle trail: same primitive as the Brush, fixed at 2 particles/tick (not speed-scaled), recoloured toward the Earth-glyph accent (`art-style.md` §4.2) — exact palette index is §9's.

**Sunbeam** `[S2]` (see §8.2 — it ships with the Boss Chest, not held back to S3) — boss chests only, never reusable after its one biome reveal (it retires to the trophy rack, §3's tent flow / §8.9's shrine-adjacent display — final placement is §3's call).
- Interaction is aim-and-release, not drag-scrub — the fantasy is aiming, not scrubbing:
  - **Aim:** press-drag sets an origin and heading, slingshot-style. Max pull distance = 30 % of `shortSide` (capped so a small hand can't overdraw). No timer on the aim.
  - **Release:** the beam auto-travels along that heading as a FAN — narrow at the staff, spreading as it flies — clearing everything the wedge crosses, then recharges for another aimed shot (reusing the `gather()` anticipation convention in `fx.ts` — shapes rush inward before the next beam is ready — so the player is never left with nothing happening between shots). The aiming guide draws the WEDGE, edges and all, not a lane: what the release clears is exactly what the guide promised.
  - **Throat width, spread, travel speed and shot count are §7.5's numbers, not this chapter's.** §7.5 owns the contract that makes a boss sector (4× a standard sector's area, §8.14) clear in **no more than three shots** (≈10 s) with this aim-release model, and that no single shot can finish it; §8 does not restate them here, to avoid two competing sources of truth. What belongs to this chapter is the FEEL around whatever §7.5 lands on: the slingshot aim, the gather-beat recharge, and the sparkle/audio layering below (§8.5).
- No dwell, no speed response — the Sunbeam is the "conductor, not scrubber" tool.

### §8.5 Wipe feel: brush, speed response, sparkle, chime ladder, audio layering

Speed response and sparkle density are specified per tool in §8.4. This section covers the shared audio layer, which all three tools drive.

**Continuous scrub sound.** `src/game/duel/audio.ts` builds every voice as a scheduled one-shot (`V()`); there is no sustained-oscillator path today, and none is needed here. While the pointer is down and moving, fire a 120 ms band-passed `NOISE` voice every ~90 ms (a slightly slower cadence than the `draw` cue's 55 ms limiter, since this is a continuous whoosh, not a discrete note), with the filter's centre frequency mapped to local stroke speed (`f = 900 + 2.4 × speed_px_s`, clamped 700–3200 Hz) so a fast pass sounds brighter/airier and a slow pass sounds lower and grittier — this is the "soft brush on canvas / sweeping sand" texture the concept asks for, built entirely from the existing one-shot voice architecture (new short overlapping voices, not a new node type).

**Dust puffs — the "soft, cloudy" layer.** §9 adds a new `K_PUFF` silhouette to the shared fx pool: a soft, rounded, semi-transparent blob, visually distinct from the sharp four-point glint star. Where the sparkle trail (§8.4) rides the finger/paddle/beam TIP as the bright "reward" layer, puffs are emitted along the erase BOUNDARY — the edge between newly-cleared and still-dusty — as the calmer "atmosphere" layer underneath:
  - **Density — the canonical FEEL, before any perf cap:** Brush ≈1 puff per 120 ms of contact (sparser than its own 55 ms glint rate, so the puff layer stays a quiet undertone); Eraser ≈1 puff per 90 ms (its bigger paddle displaces more dust at once); Sunbeam spawns a continuous curtain, ≈4 puffs per 100 ms, along the trailing edge of its travelling band — the biggest, cloudiest layering in the game, appropriate to the boss moment. **These three rates are what §9 caps by `S.q` tier, as a multiplier/ceiling applied ON TOP of this chapter's per-tool rate — never as an independent per-stamp count that could re-derive a different density from scratch.** A lower `S.q` tier thins the same three rates proportionally (fewer puffs per interval, same relative Brush < Eraser < Sunbeam ordering); it does not redefine what "sparse" or "a curtain" means per tool.
  - **Drift:** puffs drift slowly opposite the stroke heading with a slight upward bias — a gentle "kicked-up dust" arc, not the ballistic point-first flight the thrown spell debris uses. §9 gives `K_PUFF` a near-neutral, slightly negative gravity and high drag (closer to the WIND profile than FIRE or ICE), so puffs hang and float rather than fall or fly.
  - **Fade:** puffs never "pop out" the way cel spell-shapes do (§9's shrink-out convention). They FADE — opacity ramps to 0 over a life of 0.6–0.9 s, longer than the glint's 0.45 s — because "soft and cloudy" reads as dissolving, not sparking.
  - **Colour:** a desaturated tint of the Umbra Dust palette (charcoal/muted purple), never the rune or tool colour. Puffs are the material being disturbed; glints are the magic doing the disturbing — keeping those two registers visually separate is also what keeps the readability rule ("a hue must never be the only cue") intact under `art-style.md` §4.3.
  - **Per tool:** Brush = light, sparse puffs behind moderate glints (mostly clean sparkle, a little dust-kick — the ASMR balance). Eraser = denser puffs behind its fixed glints (chunkier, dustier, "confident and fast"). Sunbeam = a heavy puff curtain behind a streaming glint trail (the biggest spectacle, reserved for the boss reveal).

**Chime ladder.** 10 discrete steps, one per 10 % of coverage crossed. Each step fires one `V(TRI, f, f×1.02, 0.35, 0.12, 5)`-style voice reusing the existing scale-degree table (`nf()`/`hz()` in `audio.ts`): `f = nf(step % 6) × 2`. The chime's major/minor colour (`cb`) is sampled once, at the moment the wipe begins, from whatever `S.sky` last settled at when the previous duel ended — this needs no new state, since `S.sky` already persists on the shared state object. Steps 9 and 10 are pre-empted by the reveal-wave flourish (§8.6) rather than played standalone.

**Boss fanfare.** The 1500–2500 ms beat of the boss-chest unbox (§8.3) gets one extra layered flourish: the same six-voice `win`-style flourish already defined in `audio.ts`, but gated to the chest's own gem colour rather than the full rainbow, so it reads as "this chapter's magic," not "victory again."

**Haptics — bonus only.** Gated by `'vibrate' in navigator` AND the existing haptics settings toggle (§4 owns its exact field name); with either false, everything above and below still reads as complete through audio and visuals alone (per C22 — haptics never carries feel on its own).
  - **While scrubbing, both pulse length AND interval are functions of speed**, using the SAME speed clamp the Brush's erase-strength formula uses (§8.4), so haptics, erase-strength and the audio's brightness curve all agree on what "slow" and "fast" mean:
    - `pulseMs = 10 + 20 × (1 − clamp(speed / 400 px·s⁻¹, 0, 1))` → 10 ms at fast, 30 ms at a standstill.
    - `intervalMs = 70 + 50 × (1 − clamp(speed / 400 px·s⁻¹, 0, 1))` → pulses retrigger every 70 ms at fast, every 120 ms while lingering.
    - Net effect: a fast flick gets frequent, light taps (short pulse, short gap); a lingering dwell gets rarer but longer, firmer pulses — a HIGHER duty cycle (≈25 % on-time vs ≈14 %), so dwelling is the one that reads as "more felt," matching the audio/erase reward for slowing down.
  - **The 85 %/100 % pop:** one richer pattern, fired once, via the array form — standard: `navigator.vibrate([40, 40, 90])` (a short-short-long "ta-ta-daa," gentle, not startling); boss: `navigator.vibrate([50, 50, 50, 50, 130])` (a slightly longer flourish, matching the bigger moment in §8.6).
  - The Eraser and Sunbeam use the same two rules (continuous cadence while active; the one pop pattern at completion) — the Eraser has no speed response (§8.4), so it fixes `pulseMs`/`intervalMs` at the formulas' midpoint (20 ms every 95 ms) rather than varying them; the Sunbeam has no continuous phase at all (aim-and-release, §8.4), so only the pop pattern applies to it.

**Ambient bus (permanence, not wipe).** Once a sector is restored, its biome ambience (§8.8) plays on a **new** third bus, `ambBus`, gained the same way `sfxBus`/`musBus` are (`setTargetAtTime` only, per the file's own mute-bug rule), audible whenever the map camera has that sector in view. This needs a new sibling module — proposed `src/game/campaign/ambience.ts` (new file) — built from the same `V()` primitive as everything else in `audio.ts`, since Web Audio has no persistent "loop node" here; each biome's loop is a short pattern re-triggered by a `seq()`-style scheduler (the existing piano sequencer's pattern, not its notes). `ambBus` must be added to every existing mute/pause/ad gate that already drives `sfxBus`/`musBus` — that wiring is §4/§11's, not authored here, but the requirement is stated so it is not missed.

### §8.6 The 85 % rule, the grace window, and the reveal wave

- **Auto-complete fires when BOTH** (a) coverage ≥ 85 % **and** (b) the pointer has been idle (no movement, including released) for **1.5 s**. This lets an actively-scrubbing perfectionist sail straight past 85 % with zero interruption; it only pops for a player who has, in effect, stopped.
- **If a player reaches 100 % by hand** (never idling long enough at ≥85 % to trigger the pop), the same reveal choreography plays immediately on crossing 100 %, with the sweep step skipped (there is no remainder) but the white-hot flourish and the rainbow-style burst still fire in full — a hand-cleared sector gets the identical CEREMONIAL payoff as an auto-popped one, never a lesser one, even though it earns no separate reward (§8.1).
- **Reveal wave — standard sector:**
  1. Input freezes for 550 ms.
  2. A single directional wipe-wave originates at the player's LAST touch point (not a fixed corner, so it feels caused by the player) and sweeps to the sector's far edge over **420 ms**.
  3. Its leading edge is white-hot for its first ~120 ms (reusing the `impact()` white-silhouette-frame convention in `fx.ts`), then the landmark's true colour bleeds in behind it.
  4. 40–60 glints spawn staggered along the wave-front (the same `dl`-stagger technique `fireRain` already uses), plus one `ring()` shockwave scaled to the sector.
  5. Chime steps 9–10 are replaced by a single scaled-down `rainbowBurst`-style flourish at the wave's origin.
  - **Total duration: 970 ms** (550 ms freeze + 420 ms wave sweep) before control returns to the idle-map flow — §3 may cite this figure directly for the `wipe`→`map` transition.
- **Reveal wave — boss sector:** the same choreography, scaled to the sector's ≈2× linear size (§8.14: 4× area — area scales with the square of linear size): freeze ≈ **650 ms**, travel ≈ **850 ms**, glint count ≈ **100**.
  - **Total duration: ≈1,500 ms** (650 ms freeze + 850 ms wave sweep) — §3 may cite this figure directly.
- **The chapter's rescue collectible must never be silently skipped by the pop.** If the collectible's hidden cell has not yet been personally uncovered when 85 % triggers, the reveal wave's path is biased (invisibly to the player — it still reads as one continuous sweep) to cross that cell early, and the moment it does, the creature's tap-reveal animation (§8.8) plays automatically inline, in full, as part of the pop. A player who lets the auto-complete fire is therefore GUARANTEED to see and "rescue" that chapter's collectible at least once, exactly as a player who found it by hand would.
- **`[later]`, not shipped now:** seeding a sector's STARTING dust opacity from the duel's final `S.sky` value at victory (a dominant win starting a slightly thinner layer). The mechanism (`S.sky` is already readable at victory) is free and worth revisiting once the base loop is proven, but is not required for the loop to feel complete and is deferred to keep §8.4's clear-time numbers from having a second variable at ship.

> **Superseded in part by §8.25 (owner, 2026-09-19):** the pots now rise
> AFTER the reveal, not before the wipe, and the landmark is cleaned blank
> and coloured last.

> **Widened by the GRACEFUL FINISH (owner, 2026-09-20).** The 85 % rule is
> honest arithmetic over `coverage01`, and it counts dust far too thin to
> make out over the painting underneath. A child who has been over the sector
> twice is looking at a picture that reads as restored while the model still
> says 80 %, stops — and nothing happens, with nothing visible left to aim at.
> So the auto-complete now fires on EITHER the arithmetic or the LOOK:
>
> - **The look** = at least **95 % of the sector** holding no visible dust,
>   **and** no solid chunk of dust left anywhere — measured as the dustiest
>   8 × 8 sample window (96 × 96 SU, a 2 × 2 cell blotch, ~8 % of the sector's
>   width) being under 60 % full. The window, not a connected-area measure:
>   what a wipe leaves behind is mostly the thread network of stroke rims, and
>   those all touch, so "biggest connected patch" calls a web of hairlines one
>   enormous chunk. A missed SPOT is solid; hairlines are not.
> - **Two visibility floors**, because "still scrubbing" and "stopped" are
>   different questions. While the tool is moving, only dust at or under **18 %**
>   opacity is discounted, and a sector that clean finishes AT ONCE, mid-stroke
>   — there is nothing left the player could aim at, and C25's idle grace would
>   never elapse for a child who keeps scrubbing. Once the tool has rested out
>   the same **1.5 s** idle grace, the floor drops to **32 %**: a player who has
>   put it down has said they believe it is done, and an even haze too thin to
>   read is not worth a dead end.
> - **One first pass leaves 45 %** (§8.4) — above both floors — so a single
>   sweep of the sector still never finishes it, and a big visible chunk still
>   blocks the finish however clean the rest is. That is the whole point of the
>   wipe, and it is unchanged.
> - **The progress ring** (§3.3.5) now fills to whichever finish line is
>   nearer, so "you can stop now" is never a lie about a sector that has
>   stopped looking dusty. A chunk still showing holds it just short of full.
> - `wipe_complete` carries **`graceFinish`** (§12.4): the finish came from the
>   look rather than from 85 %. How often it fires is how the two floors get
>   tuned.

### §8.7 Colour-me pots

- Exactly **one** "colour-me" landmark per sector (the flowers, a roof, the bridge — art's pick per sector, flagged as a tintable region in the paint asset).
- **Timing: immediately after unbox, before the wipe begins — never during or after wiping.** The prompt appears once, the moment that sector's tool-float beat (§8.3) finishes: three small paint-pot icons rise from the gift alongside the tool, themed per biome (e.g. Bubble Bay offers Coral / Seafoam / Lavender). The pick (or its 4 s auto-pick, below) resolves before the wipe's first stamp can land.
- A single tap on a pot (hit target ≥ 56 px) tints the flagged region permanently via a pre-baked greyscale tint-mask (§9 supplies one mask per colour-me landmark). No drag, no slider.
- **Auto-pick after 4 s** of no input (defaults to pot 1) so the loop's pacing never stalls waiting on a choice a toddler doesn't understand yet — this keeps the feature additive rather than a blocking decision.
- Cost: one small per-sector field in the save (§8.12/§4.6's `paintPicks`), already budgeted as trivial against the campaign's <8 KB total.

### §8.8 Permanence per biome

Every restored sector guarantees three permanence beats, all DERIVED from the sector's "done" bit (§8.12) — nothing extra is saved per beat, so a done sector always shows all three, forever:

1. **Ambient loop** — a short, cheap, biome-themed audio pattern on `ambBus` (§8.5), audible whenever that sector is in the map camera's view.
2. **Tap creature** — tapping a fixed spot in the sector triggers a ~900 ms peek-a-boo: the creature pops from behind a specific prop, plays one chime-family note, then hides. Re-triggerable on every future visit; delight-only, never a reward (§8.1).
3. **Rescue collectible** — one per CHAPTER (not per node), buried under the dust at a fixed, unmarked spot inside that chapter's biome; revealed by a distinct denser sparkle cue once the wipe uncovers ≈30 % of its silhouette, and guaranteed to surface even under the 85 % auto-pop (§8.6). Ties each chapter's story hook (a sprite to rescue, a baby pegasus to free) directly to a mechanic, rather than leaving it as caption-only.

| Ch | Biome | Ambient loop | Tap creature | Rescue collectible |
|---|---|---|---|---|
| 1 | Whispering Woods | Soft leaf-rustle + distant birdsong (filtered noise bed + high triangle chirps) | A sleepy moss-sprite peeking from a hollow log | Wood Sprite (matches the GDD's own "rescue the sprites") |
| 2 | Bubble Bay | Lapping water + slow bubbling (filtered noise, slow LFO) | A sea-unicorn foal blowing a bubble ring | Singing Shell (returns a sea-unicorn's lost voice) |
| 3 | Cloud Kingdom | Airy wind-whistle sweep | A baby pegasus hopping on a cloud tuft | Baby Pegasus (matches the GDD's own naming) |
| 4 | Crystal Caves | Crystalline bell resonance (sine partials) | A glowworm lighting up one facet | Shard of Clear Light |
| 5 | Mirror Mountains | Echoing wind + soft chime | A mirror-sprite that mimics the tap | Mended Mirror Shard |
| 6 | Rainbow Ridge | Bright arpeggiated shimmer | A rainbow-maned foal leaving a colour trail | Prism Petal |
| 7 | Sunken Sands | Slow tick + dry wind | A sand-fox pup digging up a trinket | A stopped Sand-Clock, restarted |
| 8 | Twilight Tundra | Soft wind-chime + a distant, friendly (not scary) howl | A snow-hare shaking off frost | Frozen Star Shard, thawed |
| 9 | Starlight Summit | Twinkling high-bell pattern | A star-calf blinking awake | A Fallen Star |
| 10 | Friendship Festival | Warm festival bells + soft crowd murmur | Umbra herself, post-finale, doing a shy wave (§8.11) | — (chapter 10 IS the finale; no separate collectible) |

#### §8.8.5 Bloom

D3 (2026-09-18) removed the coin currency entirely (§8.9) — no coins, no jar, no Rune Shrine, no ranks. That was exactly the condition the first draft of this chapter reserved the Bloom for, so the Bloom is no longer `[later]`: it is now built, and it is the Twin Gift's only payload and the only reward this chapter offers of any kind.

- **What it is.** A permanent cosmetic upgrade to one already-restored sector: a few extra animated critters and flowers layered onto that sector's restored art, plus a gentle ambient sparkle. It gives no power and no progress whatsoever — no stat, no unlock, no faster wipe, nothing that touches §7's tuning. It is purely "the world looks a little more alive here."
- **Rendering budget.** A Bloom is rendered entirely through the shared, capped prop system §9 already defines for restored-sector dressing — a handful of extra prop instances drawn within whatever prop-count ceiling §9 sets, never an uncapped or bespoke visual layer. §9 owns the exact cap and which slots a Bloom may fill; this chapter only asserts that the bloom is "extra props within the existing cap," not a new rendering path.
- **How it's granted.** Claiming a Twin Gift (§8.2, §8.3) — which is only ever offered on the map beside a just-restored sector, only after a win, only once that sector's reveal wave (§8.6) has finished — applies the Bloom to THAT sector immediately, as the Twin Gift's hold-completion beat (§8.3). There is no reward offer, of any kind, on a loss.
- **One bloom per sector, ever.** 50 sectors total (10 chapters × 5 nodes) → 50 Blooms max, lifetime. Each sector is independently one-time-claimable: once a sector is Bloomed, its Twin Gift slot has nothing left to give, so it is not offered there again.
- **Additive over the base permanence beats.** The three guaranteed permanence beats in §8.8's table (ambient loop, tap creature, rescue collectible) are unaffected and unconditional — every done sector gets all three regardless of Bloom status. The Bloom is a fourth, OPTIONAL layer on top: a done-but-unbloomed sector is complete and un-diminished; a Bloomed sector simply has a little more life layered on.
- **Save cost.** One bit per sector (50 bits total) recording whether that sector's Bloom has been claimed, independent of the "done" bitset (§8.12) — a sector can be done-but-not-Bloomed, never Bloomed-but-not-done. §4.6 owns the exact field name and byte size.

### §8.9 Coin burst, jar, and Rune Shrine — removed (D3)

**Removed per D3 (2026-09-18).** The story build has no currency at all: no coins, no coin-burst-into-jar animation, no jar as a map fixture, no Rune Shrine as a destination, and no element ranks (`RANK_BONUS`/`rankPrice`/`buyRank` are unused). The Twin Gift's reward is now a permanent cosmetic Bloom applied directly to the sector it's offered beside, on a win only, after that sector's reveal — see §8.2 for its presentation/gating and §8.8.5 for the full mechanic. This heading is kept, unrenumbered, only because other chapters (and the preface) cross-reference §8.9 by number for the currency decision.

### §8.10 Map-as-trophy browsing

The map is chunked into chapter "pages" of a pop-up book (figuratively seamless, per the ruling), only the current chapter ±1 resident at a time.

- **Within a page:** drag horizontally to see that chapter's 5 sectors; every RESTORED sector on the page plays its ambient loop when in view and its tap creature is live (§8.8).
- **Between pages:** a page-flip transition, ~600 ms, one page visually folding away while the next folds up (a 2D skew+scale transform — no 3D, no WebGL requirement).
- **Jumping to any completed page in one tap:** a chapter-tab ribbon of 10 tabs along one edge of the map view, greyed until that chapter is reached, tapping one page-flips straight there — this is what makes "scrolling back to admire old work" cost one interaction rather than a long drag through 45 intervening sectors.
- Streaming: leaving a page's ±1 window unloads its resident art; re-entering re-streams it (§9's budget).

### §8.11 Finale world payoff

After 10-5, Umbra becomes a permanent wandering figure across every RESTORED page (never on an un-restored one — she belongs to the world she's rejoined, not the dust). Each time the map opens, she is placed at one restored sector, chosen by a seeded (not raw-random) index so her appearances feel intentional rather than glitchy, and plays a small "visiting" idle beat layered onto that sector's existing ambient loop (§8.8) — reusing the permanence system rather than adding a new one. Tapping her plays a short affectionate line-set (content owned by §10); the interaction slot is defined here, the words are not.

### §8.12 Save fields this chapter needs

This chapter states only what it CONCEPTUALLY needs; field names, types and exact byte counts are §4.6's (the `CampaignState` schema, §4.4/§4.6), not this chapter's to assert:

- A per-sector "done" bitset (already required by §9's coverage-mask persistence — §4.6's `sectorsDone`, referenced, not re-specified, here).
- A per-sector colour-me pick, one small index (0–2) into that sector's 3 pots. §4.6 is adding this field (named `paintPicks` there) to the schema — cite §4.6 for its exact type/byte size rather than this chapter's own count.
- A per-chapter rescue flag, one bit per chapter (10 total). §4.6 is adding this field (named `rescued` there) to the schema — cite §4.6 for its exact type/byte size rather than this chapter's own count.
- A per-sector Bloom-claimed bitset, 50 bits total (§8.8.5) — independent of the "done" bitset above (a sector can be done-but-not-Bloomed, never Bloomed-but-not-done). §4.6 owns its exact field name/byte size.
- No separate field for ambient loop / tap-creature state — both are fully derived from the done-bitset above.
- **Removed per D3:** the jar total (`am_coins`) and the Rune Shrine's per-element rank fields no longer exist — there is no coin currency and no ranks in the story build (§8.9).

### §8.13 Telemetry

This chapter defines no telemetry event of its own. The canonical event is `wipe_complete { sectorId, chapter, isBoss, tool, durationMs, coverage85AtMs, coveragePct, strokeOrSweepCount, manualTo100, rescueFound }`, owned and defined by §7.13; §11.3 and §12 cite the same shape. Every duration/threshold number in §8.4/§8.6/§8.14 is confirmed or retuned against it — this chapter's numbers are starting values, not the last word.

### §8.14 Assumptions handed to §7 / §9 (state so they can be checked)

- **Sector aspect** is assumed fixed at 12∶7 (long∶short), matching §9's 24×14 coverage grid collapsed to lowest terms — every size/timing number above is built on this ratio. This also matches §9's stated boss/standard asset pixel sizes (2304×1344 and 1152×672 both simplify to 12∶7), so the aspect assumption and the area figure below are mutually consistent.
- **Boss sector area is 4× a standard sector's area**, matching §9's asset sizes (2304×1344 vs 1152×672 — each dimension doubles, so area is ×4, not ×9 as an earlier draft of this chapter assumed). This is §7.5's canonical input for re-solving the Sunbeam's throat width, spread, travel speed and shot count so the 4× area clears in no more than three shots (§8.4); §8's own reveal-wave scaling in §8.6 uses the matching ≈2× LINEAR size (√4).
- **Reference device** for the 36 px-floor / 7 %-target crossover: the floor dominates for any `shortSide` under ≈514 CSS px (covering the whole stated minimum-device range) and the percentage target dominates above it.
- **Standard sector area is constant across all 10 chapters** (moderator-ruled canonical; §7 re-solves to it). The Eraser's larger, dwell-free footprint is what drops the target from 15 s (Brush era, chapters 1–3) to ≈12 s (Eraser era, chapter 4 onward) on that SAME fixed-size sector — a faster tool delivering deliberate fatigue relief, not a shrinking sector and not a hack to hold one number flat.
- If §7.13's measured `wipe_complete` telemetry disagrees with the 15 s / 12 s targets, or the Sunbeam's ≤ 3-shot contract, by more than the stated acceptable bands, retune the Brush/Eraser radius and dwell constants in §8.4 first (the Sunbeam's throat-width/spread/travel-speed constants are §7.5's to retune) — sector area and aspect are the harder-to-move numbers and should be the last resort.

### §8.15 S1 as built (2026-09-18)

S1 shipped the loop in this chapter on one hand-built sector: chapter 1,
node 1, "Whispering Woods", drawn procedurally until Step 3's painting. The
code is in `src/game/restore/`, `src/game/map/sector.ts`, and the chrome in
`src/views/UnboxScene.vue` and `WipeScene.vue`. It differs from the text
above in the places listed here. Each difference is deliberate.

**Timing, as specified.**
- Unbox: 300 ms bow untie, a 250 ms burst of pastel sparkle, then a 700 ms
  ease-out-cubic tool float to the last touch point.
- Pots: auto-pick after 4 s on the pause-aware clock.
- Camera lock: 400 ms zoom.
- The chime ladder has rungs 1–8; rung 9 sounds at the freeze.
- Reveal: ≥ 85 % plus 1.5 s idle, or every cell done, gives a 550 ms freeze,
  then a 420 ms wave from the last touch point. The wave's front is white-hot
  for 120 ms and carries 50 glints, each held until the front reaches it.
- Permanence: the windmill's sails spin up, chimney smoke and two butterflies.

**The dwell rule counts VISITS.** "A second overlapping pass within 2.5 s"
is judged per coverage cell. A visit is an unbroken run of stamps touching the
cell, with gaps under 220 ms. A stamp is strong (98 % per pass) when its
centre cell's current visit began within 2.5 s of the previous visit's end.
Otherwise it is gentle (55 % per pass). A per-touch clock does not work,
because a stamp's reach runs ahead of the brush's centre and keeps refreshing
the clock. The first build did it that way, and no return pass ever
registered.

**The paint pick is baked into the colour layer.** The roof is repainted at
pick time, under the dust. §9.4 step 3's live multiply of a tint mask is for
the painted art. Either way the player finds their colour as they wipe.

**Measured duration.** A simulated relaxed player covers the sector at
500 px/s in rows one core radius apart. At §7.5's reference scale, a
760 × 456 view framing a 316 k px² sector, the wipe takes 16.4–17.2 s from
start to reveal, 10 of 10 inside the 12–20 s band. The same player on other
screens:

| Screen | Wipe time |
|---|---|
| 320 × 658 portrait | 5.0 s |
| 390 × 844 portrait | 6.1 s |
| 844 × 390 landscape | 13.0 s |
| 1024 × 768 tablet | 15.1 s |
| 1280 × 720 desktop, mouse at 900 px/s | 17.5 s |
| 1920 × 1080 desktop, mouse at 1100 px/s | 23.4 s |

(`tests/restore/wipeTiming.test.ts`, `tests/restore/wipeBot.ts`.) The drift is
§7.5's own prediction. A 12∶7 page on a phone held upright is a 304–374 px
strip under a 36 px finger-sized brush. If playtests want longer phone wipes,
there are three levers, in order of cost:
- lower the portrait floor to ~28 px, which trades away some of the toddler
  finger-size margin;
- a stiffer first pass, 45 % instead of 55 %;
- a portrait sector composition (painted art would need it too).

None is applied. **Decided (2026-09-18, owner delegated):** phones keep the
short wipe. The first two levers work against the youngest players (a brush
under a toddler's fingertip margin) or slow every device (desktop past the
20 s ceiling), and even together they reach only ~6–8 s on a phone. The real
fix is the third: portrait sector compositions, done with the painted art in
S6, where every sector is recomposed anyway.

**S1 glue that S2 replaces.** `GameScene.vue` handles this for now:
- `earnSector()` treats every win as "node 0 won" until that sector is done;
- the restored sector at rest waits for a "continue" plate and then returns
  to the duel's result panel, instead of opening the map.

The scene ids are already the canonical ones: the gift and pots are `unbox`,
the camera lock through the wave is `wipe`, and the sector at rest is `map`.

**Not built in S1:**
- the ambient bus and biome loop, and the tap creature (§8.8, map-side);
- the rescue collectible;
- the Twin Gift and Bloom;
- the Eraser and the Sunbeam.

### §8.16 S2 as built (2026-09-18)

S2 put the loop inside the flow: five sectors on the chapter-1 map page, the
boss's Boss Chest and Sunbeam, and the Twin Gift with its Bloom. The code is
in `src/game/restore/` (`sunbeam.ts` is new), `src/game/map/` (`twinGift.ts`
and `bloom.ts` are new), and `src/views/MapScene.vue`. It differs from the
text above in the places listed here.

**The sector at rest is `unbox`, not `map`.** The restored sector keeps
drawing in the restore view for its admire beat, so its scene id is the one
that draws it. The bracket is closed there, as on the map. After 3.6 s, or
on "continue", the camera zooms back out to the map (§3.2.2 step 13).

**The Boss Chest.**
- Timings as §8.3: a 450 ms lid, a full-size 550 ms burst, then a 1000 ms
  Sunbeam float under the fanfare cue.
- The open chest fades 0.5 s after the burst.
- The chapter's new rune rides the burst (§5.13). It traces itself over the
  sector in 1.2 s, with a spark on the tip and a faint ghost of the whole
  glyph, holds for 0.8 s, then fades over 0.4 s.
- The pots wait until the rune has been read.
- The rune and the keepsake are granted at the burst (R-1b), with the
  chapter's one happy-moment call.

**The Sunbeam, §7.5's numbers.**

| Setting | Value |
|---|---|
| Band width | 92 SU |
| Travel speed | 980 SU/s |
| Recharge | 0.6 s |
| Pull cap | 30 % of the short side |
| Minimum pull | 15 % (anything shorter is a tap) |

- Each stamp is 0.62 × the band's radius at full strength, so one pass
  clears.
- The band travels from the press point to the sector's edge.
- The puff curtain runs at 40 puffs/s along the band's edges, halved on the
  low tier. A streaming glint trail rides the head.
- The light gathers back into the sun on landing, and a small bell marks
  "ready".
- **Measured.** A simulated purposeful child (aim 1.1–1.8 s, the best of six
  glanced-at shots) clears 85 % in 42.6–52.7 s over ten seeds, mean 46.4 s,
  15–18 shots (`tests/restore/sunbeamTiming.test.ts`). An efficient
  row-by-row adult on real input reaches 85 % in ~14 s with 7 shots, in both
  orientations. This has the same shape as the brush's drift: the band is
  generous by design. **Owner ruling (2026-09-18):** difficulty stays tuned
  for children; an adult's faster clear is not tuned away.
- The boss reveal follows §8.6: a 650 ms freeze, an 850 ms wave, about 100
  glints, and the boss haptic pattern.

**The Twin Gift and the Bloom.**
- The Twin Gift is a square lilac box with a gold ribbon and a film-strip
  glyph. It sits at the restored sector's lower-right corner with a slow
  shimmer and no shake.
- A DOM button laid over it is the hold target. It cancels past 12 px and
  also takes a held Space or Enter.
- The ring and the four ribbon steps run on the scene's `dt`. After the hold
  comes a 250 ms silver-and-gold burst, then `claimTwinGift`. On success the
  map sparkles, and `bloom.claimedToast` shows once.
- The offer is withdrawn when the scene leaves the map.
- The Bloom (`map/bloom.ts`) has seven swaying tall flowers, a hopping
  bunny, two pastel butterflies and eight twinkles. It is seeded per sector
  and drawn inside the live-prop budget (§9.5), resting on a still frame
  outside it.

**One addition to C9: the half-brushed cells.** A single brush pass stops
at 55 % by design (the dwell rule), and C9 saves only DONE cells. So a
player who swept a lot in single passes and closed the app came back to a
fully dusty sector. The first S2 browser run measured it: 19.7 % brushed
resumed at 0.0 %.
- A second 56-char bitset, `am_campaign.wipeHalf`, now marks cells brushed
  past halfway but not done.
- On a relaunch those cells come back at the first pass's 55 %.
- The same run then resumed at 11.0 % of 19.0 %.
- The done bitset (`wipeCoverage`) is unchanged; both are nulled together
  when the wave lands.

**Smaller S2 decisions.**
- **Wake.** Any trusted press anywhere wakes the game: it arms the session
  and unlocks the audio. Only a canvas press used to. On a fresh save the
  first taps land on dialogue bubbles, which are DOM, and they left the
  babble voice silent.
- **Dialogue.** A dialogue ends exactly once. A tap during the page-dip
  after the last bubble used to queue a second duel start.
- **Chapter tabs.** The tab ribbon scrolls when the ten tabs do not fit: a
  320 px phone, or a short landscape one.
- **Save merge.** `SaveMergePolicy` scores the campaign (§4.16):
  (furthest + 1) × 500 + restored sectors × 150 + duels × 10, keeping the
  Step-1 formula only for an unmigrated snapshot. The conflict "bonus coins"
  is 0 (D3), so that banner never shows.

**Not built in S2:**
- the ambient bus and the tap creature;
- the rescue collectible;
- the Magic Eraser (S3);
- a Signature-Spell reveal at a chest (chapters 4 and 8). The chest reveals
  runes only.

`wipe_complete.rescueFound` is always `false` until the collectible exists.

### §8.17 S3 as built (2026-09-18)

S3 is the v1 release (D2): chapters 1–3. What it added to this chapter, and
where it differs from the text above:

**Chapters 2 and 3.** Bubble Bay (`map/sectorsC2.ts`, `kitBay.ts`) and Cloud
Kingdom (`map/sectorsC3.ts`, `kitSky.ts`) are five sectors each, authored
against `map/sectorDef.ts`.
- **The contract.** A sector now carries its chapter's `accent` (the gift
  ribbon, §8.2, and the chest's gem), a `tap` creature, and, on exactly one
  sector per chapter, the `rescue` collectible.
- **Pots.** Each biome has three: Bubble Bay's coral, lagoon and sunshell;
  Cloud Kingdom's lavender, skyblue and sunrise.

**Permanence, all three beats (§8.8), derived from the done bit.**
1. **The ambient loop.**
   - It plays on a third bus, `ambBus`, beside sfx and music. The bus follows
     the Sound Effects volume and every mute, pause and ad gate (its voices
     go through `V()`).
   - Each biome has one pattern, a few short voices re-triggered a little
     irregularly:
     - woods: leaf rustle plus a two-note bird;
     - bay: a lapping swell plus rising bubbles;
     - clouds: a wind sweep plus a soft chime.
   - It is audible while a restored sector of the page in view is on screen
     (at half level under a dialogue), and during a restored sector's admire
     beat.
2. **The tap creature.** Every restored sector has one:
   - chapter 1: a moss-sprite in a hollow log;
   - chapter 2: a sea-unicorn foal blowing a bubble ring;
   - chapter 3: a baby pegasus hopping up from behind a cloud.

   A tap on it, on the map or in the admire view, plays a 900 ms peek-a-boo
   (250 ms up, 400 ms hello, 250 ms down) and one chime-family `peek` note.
   On the map it is tested before the thumbnail, so it never starts a replay.
   Its target is at least 26 px on screen.
3. **The rescue collectible**, one per chapter: the Wood Sprite (1-3), the
   Singing Shell (2-3), the Baby Pegasus (3-3).
   - **Placement.** It sleeps under the dust (drawn in the props layer, so
     the dust covers it).
   - **Waking by hand.** When a third of its cells is uncovered (by mean
     clear share), it wakes with:
     - a dense glint cluster;
     - the `rescue` cue;
     - a haptic;
     - the chapter's `rescued` bit.
   - **The auto-pop.** If the pop comes first, it wakes inline at the wave
     (§8.6's guarantee).
   - **Telemetry.** `wipe_complete.rescueFound` is true only when the player
     found it by hand.

**The Magic Eraser (§8.4, §7.5).**
- **Where it is used.** `toolOf(n)`: the Sunbeam in every boss chest, the
  Brush for standard nodes through chapter 3, and the Eraser from chapter 4.
  v1 players therefore never hold it; it is built and tested for S4.
- **The tool.** `restore/eraser.ts`: a rounded paddle whose long axis eases
  toward the stroke's heading. One contact clears (`mask.stampRect`, a
  rotated rectangle with a thin soft edge).
- **Feel.**
  - 2 glints per tick;
  - puffs every 90 ms;
  - haptic pulses of 20 ms every 95 ms.
- **Its gift.** The square, corner-folded box (`drawBoxGift`).
- **Measured.** 9.8–10.0 s at §7.5's reference scale over ten seeds, with
  §8.4's paddle (long half-extent `max(46, 9 %)`). That is a little under
  §7.5's 12 s, whose own arithmetic assumes a bigger paddle at a lower
  efficiency. Kept, per the owner's child-first ruling: faster is fine.

**Keepsakes on the rig (§9.7).**
- **The hooks.** `drawUnicorn` gained `beforeTorso`, `afterTorso` and
  `afterMane`, beside `afterHead`. Each receives `RigAnchors`: the neck
  collar and its direction, the withers, the tail base, the time and how
  excited the rig is.
- **The Seashell Necklace (2-5)** hangs low on the neck, clear of the head:
  three shells and two pearls.
- **The Fluffy Pegasus Wings (3-5).**
  - Layers: a far wing before the torso; a near wing over the mane, so it
    reads.
  - Position and pose: rooted a little behind the withers, rising up and
    back.
  - Flap: a slow breath at rest, a real flap on a hop.
- **Where they show.** `equippedHooks()` dresses Aurora in the duel, the
  wardrobe and her dialogue portrait.

**Smaller S3 decisions.**
- **Arena theming (§9.6)** is `duel/arenaThemes.ts`:
  - chapter 1 is the shipped jam island;
  - Bubble Bay has sea-blue rock, a sandy cap, shells and coral;
  - Cloud Kingdom has lavender cloud-stone and a cloud-white cap.

  The arena deliberately keeps chapter 1's value structure rather than the
  map's candy floor, so the spells stay the most saturated thing on screen
  (art-style.md §4.3).
- **Unbuilt chapters** (4–10) show their silhouette pages with a dozing
  crescent moon and a drawn Z. There are no words on the map.
- **The first-load ad (§11.7, C30).** `firstLoadAdSettled()` holds the very
  first dialogue bubble on the three builds that show the load-time ad
  (GamePix, GameMonetize, GameDistribution). It resolves at once everywhere
  else. A no-fill is capped at 5 s after the splash, so the story never waits
  forever.
- **The For Parents tab (§2.7).** It shows the 7 specified keys plus
  `options.parents.leaderboardBody`, the one fact the spec predates: on live
  builds a made-up name and a duel count go to the leaderboard. The policy
  link renders only where `VITE_PRIVACY_URL` is set, and never on Poki or
  Playgama.


---

### §8.18 S4 as built (2026-09-19)

S4 is chapters 4–10 and the finale: 35 more sectors, the last five runes,
both Signature Spells, and the six remaining keepsakes. Every chapter is now
`built`. Where it differs from the text above:

**The magic (§6.3, §6.5, §6.7–§6.9).**
- **Crystal Ward** (Ice, Ice, Earth): a reflect barrier, `guardK 4`, one-shot.
  - It stops every kind of spell and turns it round at **half** its base
    damage. §6.5 said the whole base; the owner's child-first ruling halves
    it, because a child's first big combo bounced back into her own face is
    the harshest lesson in the game. A pierce, or a short wait, still beats
    the ward.
  - A spell already reflected once is only blocked by a second ward (no
    ping-pong).
  - Chapter 4's shadows (from node 3) and Terra build it as their defensive
    default. In Terra's phase 2 it holds 7 s.
- **Illusion's decoy** (kind 5):
  - the pair summons a 1-hit mirror-twin for 8 s, the triple a 2-hit one
    for 10 s;
  - a decoy swallows a whole spell — no HP, no rider — and a pierce does not
    get past it (§6.8 rule 3);
  - Echo's phase 2 holds two at once.
  - The twin is drawn see-through, composited from an offscreen canvas
    because the rig sets its own alpha part by part.
- **Rainbow's wildcard** (§6.20): each other rune in the hand is tried in
  place of every Rainbow, through the whole generator, and the strongest
  candidate wins; a tie goes to the rune drawn last. §6.20's shared-tag rule
  never separates the candidates, since every candidate is one of the other
  runes. A hand of nothing but Rainbow is its own colourless spell.
- **Time's two-mode slow** (§6.7.7, fixes F19). On the foe, `eSlowPct`
  throttles her hand, and base-rune slows are the shipped 45 %. On the
  player, it shaves her active guard by that share, once. Ember's phase 2
  doubles the shave, capped at 60 %.
- **Frost Lock** (Wind, Ice, Ice): an earth-strength wall for 3 s.
  - The foe is frozen 2.5 s: her hand is discarded, and `think()` does
    nothing, not even the panic dump.
  - A 6 s cooldown follows before it can hold her again.
  - Glace, in her phase 2, shrugs it off in 1.5 s.
  - No foe can ever cast it (C14).
- **Moon's lifesteal:** a landed hit heals its caster `dmg × pct`. Nova's
  phase 2 adds 15 points.
- **Love:**
  - the single and the pair heal their caster 10 % / 20 % of her max HP;
  - the triple is the **finisher**: a 40-damage heavy plus a flat 25 HP;
  - the finisher is gated: it opens once 4 or more hits have landed between
    the two, or once the caster is at 30 % HP or less. It can be cast once
    per duel per side; closed, it softly becomes the pair (§6.8 rule 6);
  - a minority Love adds +5 HP flat.
- **Umbra, 10-5:** phase 2 at 50 % is the tell alone (she falters). At 25 %
  she enters phase 3 and reaches for the finisher once: three hearts form
  in her slots, telegraphed, and it is answerable like any heavy.
- **`castSide(e)`** casts either side's hand. It is ready for S5, where
  player 2 is the right-hand duelist.

**The foe follows its AI contract exactly (§6.13).** Before S4, a foe also
cast her chapter's magic at random on top of the contract. On the real duel
that made each chapter's nodes 3–5 far harder than its nodes 1–2.
- Nature opens only under 60 % HP, at low odds, and the pair goes out at
  once: she never saves up a Bloom Storm (38 damage plus 20 HP of mending).
- Water raises a ward only against a shot in flight.
- Lightning and Time are cast only while the player's guard is up.
- Moon only under half HP; Illusion only as the low-HP decoy.
- Briar's phase-2 rider is +1 s of poison, not +2: she is the first boss a
  child meets.

**Difficulty, re-measured on the real duel (supersedes §6.12, §6.14,
§7.2).** `pnpm test:winrate` runs §7.2's core child against `updateSim`
itself: 0.8 attempts a second, 85 % recognised, two-rune combos, the
counter rune half the time when owned (cast alone if its pair is a ward or
a decoy), and never a deliberate shield. The spec's tuning, taken from
`duel-sim.mjs`'s abstraction, measured 22–40 % first-attempt wins at
chapters 7–10, and even 66–69 % at chapter 1's nodes 3–5. As built:
- **Tiers:** `0.40 + 0.03 × tier` runes/s. One tier gentler for a foe with
  no weakness to exploit (Prism, Ember, Umbra and their shadows).
- **HP:**
  - a standard foe has `100 + (chapter − 1)`, or a flat 100 with no
    weakness;
  - a boss has `115 + 2·(chapter − 1)`.

Measured (n = 360 per cell, seeded):

| Ch | nodes 1–2 | nodes 3–4 | boss | ≤ 3 tries (3–4 / boss) |
|---|---|---|---|---|
| 1 | 95.3 % | 91.1 % | 88.1 % | 100 / 100 % |
| 2 | 99.4 % | 100 % | 98.3 % | 100 / 100 % |
| 3 | 98.9 % | 99.7 % | 98.9 % | 100 / 100 % |
| 4 | 95.6 % | 100 % | 99.7 % | 100 / 100 % |
| 5 | 97.2 % | 97.2 % | 98.1 % | 100 / 100 % |
| 6 | 96.4 % | 93.6 % | 85.6 % | 100 / 100 % |
| 7 | 92.5 % | 95.0 % | 88.9 % | 100 / 100 % |
| 8 | 99.4 % | 99.2 % | 98.9 % | 100 / 100 % |
| 9 | 93.6 % | 94.4 % | 85.0 % | 100 / 100 % |
| 10 | 92.2 % | 91.9 % | 83.1 % | 100 / 99.9 % |

Every cell clears §7.2's two-part target: standard ≥ 90 % / ≥ 85 %, boss
≥ 75 % / ≥ 60 %, and ≥ 95 % within three tries. This makes the shipped v1
chapters (1–3) a little easier too, per the owner's child-first ruling.

**The chapters.**
- **Sectors 15–49:** one file per chapter, `map/sectorsC4.ts` …
  `sectorsC10.ts`, each with its own `kit*.ts`. Each chapter has three
  pots, an accent and a tap creature per §8.8. Rescues are on each
  chapter's middle sector (4–9), none in chapter 10.
- **Chapter 10's tap creature is Sprig,** the chapter-1 moss-sprite, back
  for the Festival in a party hat, not §8.8's "Umbra, post-finale": Umbra
  already has her own map beat (below).
- **Candy palette:** every sector clears the floor.
- **Signature-Spell chests (4-5, 8-5):** the recipe writes itself, rune by
  rune, then its emblem blooms under it: a crystal cluster, or a snowflake.
  It is wordless.
- **Arena themes and ambient loops** exist for all ten chapters (§9.6,
  §8.8).

**Dialogue (§10.10 → written).** The openers, bosses and thank-yous of
chapters 4–10 follow §10.9's pattern and §10.4's Umbra arc: teasing in
4–6, wistful in 7–9, defensive then won over in 10. There are 64 lines,
all ≤ 8 words.
- Chapter 10's nodes 2–4 have no filler creature. They are returning
  Guardians setting up the Festival, two to a node.
- The thank-you is the 4-bubble finale.
- New speakers terra, echo, prism, ember, glace and nova have portraits and
  babble voices.
- The creatures Glint, Blink, Rio, Dune, Frosty, Wisp and Sprig (party hat)
  have portraits.
- Six pictograms are new: crystal, mirror, rainbow, hourglass, snowflake and
  balloon.

**The finale (§10.19, §8.11).**
- **The card:** the first time 10-5's sector is restored, a finale card
  opens over the map. It shows the whole cast cheering, the chapter title
  and `finale.line`, with CSS confetti (still under reduced motion). It is
  shown once, recorded by `am_campaign.finaleSeen`.
- **Wandering Umbra:** from then on she visits one restored sector each
  time the map opens: a seeded pick, on the page in view when it has one.
  She stands at its lower-left corner with a small visiting idle and
  floating hearts. A tap makes her hop and say one of three lines
  (`finale.umbra1..3`) in a speech bubble, with her babble.
- **The chest's gift** is the Love rune plus `versusUnlocked`, the 2P
  unlock that S5 builds on.

**The map's chrome strip.** The corner buttons (portrait, along the
bottom) and the tab ribbon (landscape, down the right) cover part of the
view. The camera may now scroll the last page past them, and a focused node
is centred in the view that is left. Before this, in portrait, the last
node's pulsing marker could sit under the buttons, so a tap on it opened
the leaderboard. S4's portrait playthrough found it.

**Keepsakes (C17, §9.7):** hoof-trail, Umbra Look, Mane Color Palette (8
swatches, each with a micro-glyph; `am_campaign.maneSwatch`), Pastel Dream,
winter scarf and Pet Star.
- **Pastel Dream is a skin** (a pastel palette on Aurora), not C17's
  "pastel UI theme". The save's slot model already put it in the skin slot,
  and a whole-UI theme was out of proportion to one keepsake.
- **Rig hooks:** `PoseState` gains `skin`, `mane` and `afterRig`.
  `RigAnchors` gains points in the caller's space (hooves, tail, body,
  head). With nothing worn, Aurora renders pixel-identical to before.

### §8.19 S5 as built (2026-09-19)

S5 is local two-player versus (§6.19, §3.12, C18), unlocked by chapter 10's
chest (`versusUnlocked`).
- **Entry:** a "play together" button on the map (the `squad` glyph) opens
  the `versusSetup` scene. The arena waits behind it, Aurora on the left
  for player 1 and Umbra, a friend now, on the right for player 2. Each
  player taps READY on their own half; with both ready, a 3-2-1 (numbers,
  not words) and the match begins, on the Festival's island.
- **Layout — one shared arena, two halves (a deliberate reading of §3.12).**
  The whole 1280×720 stage is fitted to the full screen, so both players
  watch the same fight, and each half of the screen is one player's:
  - her drawing zone (a dashed frame, a seam down the middle);
  - her rune slots (the existing left and right rows);
  - her own CAST button;
  - options and sound, shared, between the two CASTs.

  §3.12's "each half through `computeLayout` as its own sub-viewport" would
  draw the arena twice at half size: two small copies of one fight. The
  split is by input and HUD instead.
- **Input:** each pointer is routed on first contact by the half of the
  SCREEN it landed in, and keeps that side for the whole stroke, into its
  own buffer (`pts`/`epts`, `draw`/`edraw`, `snap`/`esnap`). One finger per
  side; a blur lifts both. On a keyboard, Space casts for player 1 and
  Enter for player 2.
- **Rules (§6.19):**
  - the right-hand duelist is player 2 (`S.versus`: `think()` bypassed,
    `castSide(true)`);
  - 100 HP each, no easing, no weakness (the appended `FOES[20]`, the versus
    Umbra);
  - both hold the save's full kit;
  - Frost Lock freezes either side (a frozen hand can neither draw nor
    cast);
  - a slow on player 2 shaves her guard, since she has no forming timer;
  - the Love gate is symmetric.
- **No side effects:**
  - no duel is counted, since the leaderboard's score is duels won;
  - the campaign controller ignores a versus match entirely: no progress,
    no Dream Dust, no spellbook discoveries;
  - no versus field is ever persisted.
- **The end (§2.2 rule 21):** one shared "What a duel!", a trophy over the
  winner, no lone spotlight and no loss copy. The interstitial clock is
  checked once per match, then back to the ready screen.
- **Below 900 CSS px, or held upright:** the "turn sideways" prompt, never
  a half-UI and never pass-and-play (C18). A match squeezed mid-duel holds
  still under the prompt until the screen is wide again.
- **Also fixed:** the foe's committed next rune (`eRune`) now resets with
  every duel. Before, the last duel's foe's pick carried into the next
  duel's first rune.

### §8.20 S6 as built (2026-09-19)

S6 is the painted-art PIPELINE (the `art-generation-pipeline` skill): every
drawable that should be painted has a reference sheet, a master prompt, a
slicer path and a probe in the renderer. The paintings themselves come from
an image model the owner runs; each one then drops in with no code change.
Until they exist, the art layer is off in every build
(`VITE_ENABLE_ART_OVERRIDES`) and the game requests no image files.

**What is painted, and what stays drawn (§9.7's layer rule):**
- **Sectors (50).** Each is one opaque, full-bleed painting of the sector's
  `paint()` layer, at 1152 × 672. The slicer also cuts a 384 × 224 map
  thumbnail from the same painting.
  - `props()` stays drawn on top: butterflies, water, the tap creatures and
    the rescue.
  - The colour-me landmark is painted neutral lilac-grey.
- **Items (8):**
  - painted strips, one panel per state the drawing moves between:
    - the Standard Gift and the Eraser's box: tied, then untied;
    - the Boss Chest: shut, then open;
    - the Pet Star: open eyes, blink, happy;
  - painted stills: the Stardust Brush, the Magic Eraser, the wardrobe tent
    and the Flower Crown.
  - The motion around those states is still the drawing's own transform:
    the shake, squash, rattle, float and cross-fade.
- **Runes (12).** Painted in `RuneGlyph.vue`'s 100-unit box, for the HUD
  slots, the weakness badge and the spellbook. The canvas traces (snap,
  reveal, onboarding) stay drawn: a trace is motion, not a picture.
- **Stays drawn, deliberately:**
  - Things that follow the rig's deformation: the necklace, wings and scarf
    (§9.7).
  - Things with continuous state: the Twin Gift's bow opens with the hold;
    the Sunbeam has a halo, rays and a charge.
  - The brush's twinkling star (drawn over the painted brush), the chest
    clasp's glint (drawn over the painted chest), and every burst and puff.
  - Dialogue portraits: the probe (`portrait`) exists, but it is [later],
    per §9.12.

**How the painting and the drawing agree:**
- **The box contract** (`artBox.ts`). An item's box is MEASURED from its
  own drawing. The bench renders the reference into that box, the slicer
  cuts it back out, and the renderer draws the painting into it. So a
  painting lands at the drawing's size at any scale, with no constant kept
  by hand.
- **Colour-me without painted masks** (`artTint.ts`). §9.12's `LMK` masks
  are not needed:
  - The drawing is rendered twice, with two contrasting accents; the pixels
    that change are the landmark.
  - That region fades out over a search band (about 2 % of the width). Inside
    the band, only paint as grey as the painter's own landmark is tinted,
    with the pot's colour multiplied through it.
  - So a painter's small drift is followed, and a cream wall or a pale sky
    next to the landmark is left alone.
  - A landmark the painter coloured anyway (median chroma above 0.16) is not
    tinted at all.
  - The same mechanism tints the gift ribbons (per chapter) and the chest's
    clasp gem.
- **A painting that arrives late:** on the restore view it re-bakes the
  colour and dust layers, but only before the first wipe stroke. Once wiping
  has begun, that visit keeps the art it started with.
- **Loading:**
  - The map draws thumbnails (the key includes whether the painting has
    decoded).
  - A sector's full painting is fetched when its gift is tapped and released
    when the sector closes.
  - With the layer on, the splash holds only for the first screen's
    paintings (`artPreload.ts`): that chapter's 5 thumbnails, the tent,
    gifts and brush, and the 12 runes.

**Tooling:**
- The manifest is `artSheet.ts`: pure data plus the prompt builders.
- File names live in `artIds.ts`, folders in `artFolders.ts`.
- The dev-only bench `/#/art-sheets` exports every reference,
  `sheet-index.json` and `PROMPTS-{SECTORS,ITEMS,RUNES}.md`.
  - `pnpm art:export` drives the bench headlessly.
  - `pnpm art:prompts` writes the same prompt documents without a browser,
    plus `PAINT-STATUS.md`; `--check` confirms both routes agree byte for
    byte.
- `pnpm slice-sheets` is a focused rewrite on sharp. Per painting it:
  1. identifies the sheet strictly;
  2. checks its receipt, and parks a stale painting (with its cut WebPs) in
     `painted/stale/`;
  3. applies the aspect guard;
  4. keys magenta and unmixes the soft edge;
  5. fits the strip onto the measured reference with one area-matched
     correction, then cuts each box, at most 256 px per frame.

  For a sector it instead resamples the painting to 1152 × 672 and cuts the
  thumbnail.
- `/#/playground` draws everything with the game's own painters and flips
  the art layer live.
- The Art Desk runs unchanged against these files.

**Deviations from §9.11–§9.13, and why:**
- **No `LMK` mask files:** they are derived at runtime (above).
- **Boss sectors at 1152 × 672, not 2304 × 1344.** The restore canvas never
  exceeds 1152 × 672, and a model returns about 1344 × 768, so a 2304-wide
  file would be an upscale.
- **No `PRP` prop strips.** The props are procedural animation drawn live
  over the painting; painting them is [later].
- **No `FX-NOISE`.** The dust noise stays procedural.
- **2 of §9.12's 5 painted cosmetics:** the crown and the pet star. The rest
  follow the rig (above).
- **Gifts:** 2-panel strips, not 4 × 160. The burst stays drawn.
- **No `chapterArtManifest`.** Thumbnails load lazily by visible page, the
  full painting on open, and the splash preloads only the first screen.
- **§9.12's ~9.7 MB estimate is superseded by measurement.** Synthetic
  returns run through the slicer came to 40–80 kB per sector and 15–25 kB
  per thumbnail, before `compress-images` — about 3.5–5 MB for everything.
  Real paintings carry more texture and will weigh more. Re-measure with
  `pnpm art:status` after the first chapter is painted.

**Verified with SYNTHETIC returns** (filtered copies of the references,
hue-turned, drifted 10 px, rescaled 112 %, one returned as JPEG), all deleted
afterwards:
- all 70 sliced;
- the stale-painting path parked its painting;
- the Art Desk scanned the 70 jobs;
- in the browser, the playground A/B, the map, a restore with a tinted
  landmark, the gift and chest, and the duel HUD all rendered with no
  console errors;
- with the layer off, zero `/images/` requests.

**Not yet verified:** one real painted return per family. That needs the
owner's image-model run.

### §8.21 S7 as built (2026-09-19)

S7 is release preparation for the whole game (all 10 chapters are `built`),
run as the playbook's Phase 7. `RELEASE-CHECKLIST.md` in the project root is
the owner's copy: what is verified, and what only the owner can do.

**Bundle purity, on unobfuscated twins** (`scripts/release-audit.mjs`). Each
portal is built once more with the obfuscator off, because a grep of an
obfuscated bundle proves nothing either way. The script then checks:
- the build carries its own portal SDK and no other;
- no source maps and no dev-only art views ship;
- Poki makes no external request and has no CSP meta;
- Playgama (the Playables archive) has the `game_api/v1` tag, no CSP meta,
  and no Page Visibility API, `navigator.language` or leaderboard request in
  our code. Playgama's vendored Bridge v2 is read separately, since it names
  every platform it supports;
- Yandex has no leaderboard request.

The first run found the CSP meta tag advertising EVERY portal in every build
(a GameMonetize page naming CrazyGames, Yandex and more), plus Microsoft
Clarity, jsonbin, getpantry, PeerJS and Sentry. Those five are survivalist's
services, with zero references in `src/`.
- `buildCsp` now lists each portal's own hosts only (`PORTAL_HOSTS`).
- The standalone web build names no portal.
- The five dead services are gone everywhere.
- `tests/platforms/csp.test.ts` pins all three.

**Cross-browser** (built web bundle, own static server): Chrome, Edge, Opera,
Firefox and WebKit. Each engine cold-boots, wins a duel, unboxes, wipes to
the admire beat and returns to the map, with no console errors. WebKit is
Safari's engine; a real iOS device stays on the owner's list.

**Small viewports and localisation** (320×658 portrait, 764×385 embed; en,
de, ar, ja; 9 scenes each). Fixes:
- **The language picker showed "ENGLISH" over an Arabic or German game.** It
  was bound to the stored player choice, which defaults to `en` until the
  player picks, not to the language on screen. It now shows the live locale.
  A pick is applied directly, so picking English over an Arabic screen works
  even though the stored value does not change. That setter is still the
  only writer of the player-choice key.
- **The Arabic spellbook title was an illegible blot.** `:lang(ar) .ink-text`
  thins the outline for Arabic, but it had the same specificity as
  `.ink-text.ink-none` and came later, so it put a dark outline back onto a
  dark-on-light title.
- **No italic or letter-spacing** under `:lang(ar|ja|zh|ko|th|hi)`. Those
  Latin idioms (on the Options labels, sliders and tabs) shear CJK, pull Thai
  and Devanagari marks apart, and break Arabic's joins.
- **The CAST label shrinks to fit** (`v-fit`, not below 60 %) instead of
  truncating. German's "[Leertaste] Zaubern" was "[Leertaste] Za…" at every
  window size, because the HUD scales as one stage.
- **Options uses two columns on any short, wide screen**, not only touch
  devices. On a 764×385 Chromebook embed, SAVE & CLOSE lay over the music
  slider.
- A locale scan found nothing untranslated except the brand name.

**Images:** already compressed; a further pass would save 1.5 kB for a second
generation loss, so it was skipped.

**Owner actions** (see `RELEASE-CHECKLIST.md`):
- the GameDistribution and Yandex game ids, and Poki's `gameId`;
- CrazyGames: pre-release first, then flip the full-release flag;
- YouTube's SDK Test Suite on the uploaded Playgama build;
- store art;
- the child-directed and privacy-URL decisions;
- a real iOS device.

### §8.22 S8 as built (2026-09-19)

S8 is the performance pass (`web-game-performance-optimize`: set a budget,
measure, and only A/B a measured candidate). **Verdict: already fast
enough, so nothing was changed.** The numbers and null results are in
`PERF-LEDGER.md`.

- **Budget:** a 2021 mid-range Android, proxied as CPU ×4 at DPR 2
  (915×412 landscape and 412×915 portrait); 60 fps, so 16.7 ms per frame;
  metric: p95 work per frame.
- **Harness:** `scripts/perf-scenes.mjs` runs the built bundle behind a
  gzipping server in headed Chrome with the in-game probe. Scenes: the
  10-5 boss duel for 60 s with both sides casting, the map at full
  progress, the boss wipe, versus, and the wardrobe.
- **Result:**
  - The worst p95 across all scenes and both orientations is 4.2 ms, about a
    quarter of the budget.
  - No long tasks, flat heap.
  - Boot is 4.1 s on Fast 3G at CPU ×4.
- **Painted-art census:** 59 vs 126 canvases per session. They are one-time
  bakes, not an invalidation storm, and frame time is unchanged. Re-run it
  with real paintings.
- **Closed:** precompiling vue-i18n's messages. The gain is under 2 % of boot
  and would mean converting 21 locale files.

### §8.23 S9 as built (2026-09-19)

S9 is the post-launch retention roadmap (the playbook's Phase 8):
`retention-roadmap.md` in the project root, 18 items sorted by impact, then
performance cost, then game feel.

- **Guardrails first:** all ages and cozy (D1), with no punishing streaks,
  no FOMO and no reading required; no currency (D3); portal rules; babble
  voice only; no pass-and-play; any spend of S8's frame headroom goes
  through the A/B loop.
- **Top of the list:**
  1. first-session funnel analytics (new `lastPlayedDay`/`sessions` fields,
     ten funnel events), which every later item is judged by;
  2. a faster first stroke on a cold boot;
  3. a creature sticker album built from the 50 tap creatures and 10 rescues
     that already exist;
  4. one replay star per node;
  5. a daily gift that is never a streak.
- **Needs the owner:** item 12 (the Friendship Duo unlocked after chapter 3)
  changes the 10-5 chest's ruling.

Nothing in S9 changes the game. Each item is a separately scoped
update.

### §8.24 S10 as built (2026-09-19) — the release candidate

S10 is the final gate, run on the committed tree (S0–S9) with every check
the earlier stages used. Each one is repeatable from the repo:

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

**The release candidate is the tree at the S10 commit.** It is not
released: `RELEASE-CHECKLIST.md` holds the owner's remaining steps (portal
ids, uploads, store art, the child-directed and privacy decisions, a real
iOS device).

### §8.25 Owner ruling, 2026-09-19 — clean first, colour after; the Stardust Sponge

The owner found the restore too complex: *"why do I have to put paint onto it
beforehand?"* They also asked for a cleaning tool at the player's pointer, and
a cleaning animation that makes the action clear to everyone without text.
As built:

- **Clean first, colour after** (supersedes §8.7's timing):
  - The gift opens straight into the wipe; there are no pots before it.
  - The landmark sits under the dust uncoloured (the neutral lilac-grey).
  - After the reveal, the landmark twinkles inside a breathing dashed ring
    and the three pots rise along the edge away from it (the top when the
    landmark is low, the bottom otherwise; below the sector in portrait).
  - Tapping a pot (or waiting 4 s, which picks pot 1) throws a paint blob
    onto the landmark, and the colour spreads out from where it lands.
  - The sector's props play on meanwhile. There is no Back button during the
    pots, since the sector is already restored.
- **The save:**
  - "Opened" no longer means "a pot was picked". The pending sector's
    `wipeCoverage` is written the moment the gift opens, so leaving afterwards
    resumes in the wipe instead of unwrapping the gift again.
  - Saves from before the ruling (a pick, not yet cleaned) still resume, and
    skip the pots.
  - A sector restored but never coloured (the game closed during the pots)
    shows pot 1 on the map.
- **The Stardust Sponge replaces the Stardust Brush** (supersedes §8.4's
  brush look; its mechanics — radius, dwell, speed response — are
  unchanged):
  - A brush on a dusty picture reads as "paint this". The sponge is a
    butter-yellow block with a mint scrubbing layer and a gold star, drawn in
    `gift.ts` (`drawSponge`).
  - While scrubbing it presses flat, squishes and rocks with the distance
    scrubbed, and sheds soap bubbles (a new particle kind, `K_BUBBLE`,
    alongside the dust puffs and glints).
  - The tool chip shows a small sponge, and its name reads "Stardust Sponge"
    in all 21 locales. The painted-art manifest's item is now
    `stardust-sponge`.
- **At the pointer:** on a mouse, the tool rides the cursor even without a
  press, and the system cursor is hidden over the wipe. On touch it waits
  where the gift was, as before.
- **The show-how**, the no-text demonstration:
  - A moment into the wipe (if the child has not started), and again after
    6 s of stillness (at most 3 times a visit), the tool itself glides onto
    the dust and does the job.
  - The sponge and the Magic Eraser scrub a zigzag, a real stroke that
    clears real dust (about 7–10 % of a sector). The Sunbeam is taken hold
    of, pulled back like a slingshot, and let go for a real shot.
  - Any press, or the mouse moving, hands control back at once.
  - The show-how never buzzes, and its strokes are left out of the
    `wipe_complete` stroke count.
- **Verified:**
  - in a real browser: gift → wipe with no pots, the show-how cleaning
    0 → 7 % on its own, the sponge riding the mouse, a real scrub with
    squish and bubbles, then reveal → pots off the landmark → paint → spread
    → admire;
  - the Eraser and Sunbeam show-hows;
  - resume mid-wipe;
  - portrait touch;
  - no console errors;
  - 757 tests; portal QA web 20/20 and GamePix 29/29.

### §8.26 Owner request, 2026-09-19 — the first-launch intro

The owner asked for *"an Intro cutscene … that introduces the game to
first-time players, preferably mostly text free, with cute unicorn sounds"*.
As built:

- **Who sees it.**
  - A brand-new save boots into it (`bootScene` → `playIntro`), then carries
    on exactly as a boot would: into chapter 1's first dialogue.
  - Watching it to the end, pressing Play, and skipping it all count as seen
    (`S.campaign.introSeen`, saved at once).
  - A save from before the intro existed counts as seen as soon as it has any
    progress (`furthestNode ≥ 0`, or any dialogue seen). A returning player is
    never sent back through it. An explicit `introSeen` always wins.
  - Options → "Watch the intro" replays it from the map or a dialogue (never
    mid-duel, mid-gift or mid-wipe). It comes back to the scene it was opened
    from.
- **What it shows.** Five picture-book pages, about 19.4 s, with no words but
  the game's name:
  - **Hello!** A bright Cottage Meadow. Aurora trots in, hops, and whinnies
    hello; the game's name floats over the sky.
  - **The dust.** Umbra floats in on a little dark cloud and giggles. Grey
    dust rolls across the meadow from her side, with a billowing front and
    tumbling dust puffs. Aurora droops and sighs. Umbra floats off, still
    giggling.
  - **The magic.** Aurora looks determined and her horn glows. The Fire rune
    draws itself in the air, with a fingertip riding its tip: *you draw
    these*.
  - **Colour again!** She casts, and her magic pops out the Stardust Sponge.
    The sponge scrubs the page in five long passes, and the colour comes back
    exactly where it passes, as under a player's finger. Bubbles and a
    climbing chime follow each pass. A last wave finishes, and she whinnies
    for joy.
  - **Play.** Aurora cheers and a big Play button pulses (on a phone held
    upright, below the page). It plays on by itself after its beat: the
    intro never waits on a button.
- **Sounds, never words (D6).** Three new synth cues in `audio.ts`:
  - `neigh`: a quick sing-song "nee-hee-hee", with a little snort;
  - `sigh`: Aurora's falling "aww";
  - `giggle`: Umbra's three cheeky "hee"s.

  With the existing whoosh, draw, snap, cast, scrub, chime and reveal cues,
  that is the whole soundtrack. As everywhere in the game, audio unlocks on
  the first trusted gesture: a child who taps the page (tapping gives
  sparkles, and a whinny and a hop when they tap Aurora) hears it from then
  on. Nothing plays unbidden.
- **The rules it keeps.**
  - The first-load interstitial comes first (C30). The intro holds silent on
    its opening frame until `firstLoadAdSettled()`. GameMonetize portal QA
    proves it: clock at 0 when the ad opens and still 0 past the 6 s cap, no
    synth voice, no sound.
  - It is not gameplay. The bracket stays closed (scene `intro`, not live),
    so no portal is told gameplay started.
  - Skip sits top-right from the first frame, where the dialogue keeps its
    own. Escape skips too; Enter or Space plays on the last page.
- **How it is drawn.** It uses the game's own painters, so it can never drift
  from the game it introduces:
  - the 1-1 sector with its live props, and its dust from `bakeDust`;
  - the duel rig, with the dialogue's emote faces;
  - the rune glyph, the Stardust Sponge, and the fx pool (`K_BUBBLE`, puffs,
    glints).

  The page is the sector's own frame (`computeFrame`) in landscape. On a
  phone held upright it is a tall page showing the scene's full height, and a
  slow camera pans to keep the action in view. Unlike the wipe, nothing here
  has to stay reachable.
- **Paint-ready (§8.27).** Every page can be a painting:
  - `images/story/intro-1…4.webp` (kind `story`), with the last two beats
    sharing the restored meadow;
  - a painted page stands in for the page's meadow AND its characters;
  - the transitions (the dust's rolling front, the sponge's trail, the last
    wave) clip between two paintings exactly as they clip between the two
    drawings;
  - a slow storybook zoom runs continuously across a page;
  - the rune trace, the sponge, the bubbles and the sparkles stay live on top.
- **Code:**
  - scene id `intro`: `game/story/intro.ts` (timeline, painters, input), and
    `views/IntroScene.vue` (the title, Skip and Play; aria-labels only);
  - `use/useIntroHud.ts`;
  - `flow/nodes.ts` (`bootScene`, `playIntro`);
  - the `introSeen` save field;
  - analytics `intro_start {replay}` and `intro_end {skipped, beat, replay}`;
  - i18n `ui.skip` and `options.watchIntro` in all 21 locales;
  - QA hooks `__intro.{state, len, skip, play, step, pass}`.
- **Verified:**
  - `tests/campaign/intro.test.ts`: who sees it, the migration, the ad hold,
    the beat order, a single end, Skip, and a tap on the last page;
  - in a real browser:
    - desktop: every beat, Play → dialogue, reload → no intro, Skip,
      Options → replay → Escape → back on the map;
    - phone portrait and landscape;
    - no console errors;
  - portal QA:
    - web 24/24;
    - GamePix 33/33;
    - CrazyGames pre-release 26/26 and full 41/41;
    - GameMonetize (dummy id, env only) 36/36.

### §8.27 Owner request, 2026-09-19 — every drawing paint-ready, in one pinned style

*"Prepare all art assets to be painted with our art-generation-pipeline … keep
the art style cozy and cute … pinpoint the new art style decision in
art-style.md to stick with it and be able to adjust if we choose another art
style later."* As built:

- **The style is data.** `src/game/artStyle.ts` holds the decision as a
  named, versioned profile: `cozy-chibi-v1`, "Cozy chibi picture-book",
  made especially appealing to girls aged 3–12 without looking babyish.
  - Every prompt's style block is built from it, and nowhere else. Characters
    get its character rules on top: chibi proportions, the eyes, the muzzle,
    horn and mane, the expressions.
  - The bench stamps the id into `sheet-index.json`, and the slicer into its
    receipt for every painting it cuts.
  - Change the profile, and `PAINT-STATUS.md` and the Art Desk mark every
    painting made in the old style "REPAINT — the art style changed". The
    old painting (or the drawing) stands in until each is redone.
  - The decision and its change procedure are `art-style.md` §0.
- **Four new families**, 111 references and 161 target files in all:

  | Family | Sheets | Kind → folder | Painted from | In the game |
  | --- | --- | --- | --- | --- |
  | The intro's pages | 4, opaque 1152 × 672, WITH the characters | `story` → `images/story` | the drawn page + the painted Aurora (and Umbra) portrait strips as character models, attached first | §8.26 |
  | Dialogue portraits | 20 keyed strips, one per speaker (11 unicorns, 9 creatures), a panel per scripted expression — 68 faces | `portrait` → `images/portraits` | the badge's inside, drawn by the rig or the creature painter | `portraitUrl`: the panel inside the drawn ring and badge colour |
  | Duel islands | 10 keyed, one per chapter theme, anchored by their TOP | `island` → `images/islands` | `islandArt(theme)` (the baked island's own painter) | `drawIsland`: replaces the island and its tufts; the sky's mood tints it through the painting's own silhouette |
  | Keepsake badges | 7 keyed (the crown's and the star's badges already draw their S6 paintings) | `cosmetic` → `images/cosmetics/keepsake-*` | `KEEPSAKE_ART` (the shelf's badge, drawn at any size) | the wardrobe shelf; the ghost of one still to find is cut from the painting |

- **Consistency by construction:**
  - A speaker's expressions are one strip, painted in ONE generation, so a
    face stays the same face across its moods (the pipeline's multi-panel
    rule).
  - The intro's pages attach the painted portrait strips as character
    models, before the page (the Art Desk's `also` images).
    `PROMPTS-PORTRAITS.md` says to paint Aurora and Umbra first. The desk
    refuses a page whose model is not on disk yet, and `alsoHint` says how
    to make it.
  - `tests/meta/artFamilies.test.ts` pins the rest:
    - every face the script shows (dialogue, thanks, the finale card) has a
      panel, and no panel is a face nobody sees;
    - every keepsake has a badge, and every chapter theme an island;
    - the models come before the reference.
- **Pipeline changes:**
  - The slicer cuts any `bg: 'opaque'` sheet as a full-bleed scene (a sector
    or an intro page). Its keyed path gains a `top` anchor, so an island's
    stage top never moves, whatever its painter did with its rocky tip.
  - `itemPrompt` takes per-sheet overrides: what it is NOT, the view, a noun,
    a keep rule, the character block.
  - The preload holds the splash for a first-time player's intro pages, and
    for Aurora's, Umbra's and the chapter creature's portraits.
- **Known limits:**
  - Aurora's painted portrait is her bare self. While she wears anything a
    portrait shows (a crown, a necklace or scarf, a skin, a mane colour), the
    rig draws her, dressed. Painting dressed variants is a possible
    follow-up.
  - The animated duel rig, the map's and the wardrobe's backdrops, and the
    fx stay procedural. They move or re-tint every frame, and painting them
    needs a part-by-part layer split (`LAYERS.md`), which is a stage of its
    own.
- **Verified:**
  - references exported headlessly (111);
  - `art:prompts --check` clean;
  - 41 synthetic paintings (hue-rotated, rescaled, one JPEG) sliced with
    none refused. With the art layer on, each hook drew its painting: the
    intro's pages (sweep and scrub transitions included), Aurora's and
    Briar's portraits, the chapter 1 island (duelists still on its top), and
    the wardrobe badges. The fakes were then deleted;
  - 776 tests.

### §8.28 Owner request, 2026-09-20 — one bound book

*"I think the storybook should feel like a real storybook with book pages
turning between the chapters, not just big panels with clickable story
beats."* As built — the whole game is now one book, and every move through it
turns a page:

- **The page turn replaces the paper dip** (`flow/transition.ts`, supersedes
  §3.13's dip). The frame that is leaving is photographed, the new scene is
  switched in underneath it at once, and the photograph swings away about the
  spine on the left: narrowing as it goes, bowing the way paper does, with
  its lit edge, its own shading and the shadow it throws on the page below. A
  paper swish (`page`, a new cue) goes with it. 450 ms, as §3.13 always said.
  - The snapshot is what makes it cheap: no scene has to render into a corner
    of the screen, and no scene changed to get this.
  - Every scene's chrome is DOM over the one canvas, so it steps aside for
    the turn (`flowHud.turning`) and fades back in as the page lands —
    otherwise the new scene's buttons flash over the old page.
  - **Reduced motion** (§3.11) keeps the old dip, and so does a browser that
    refuses the snapshot. The swap also still happens on a frame that never
    draws (a hidden tab, a harness), or the flow would stall.
- **The map is a bound book** (`map/map.ts`), not a strip that pans:
  - one page on screen at a time — the front page, then one per chapter;
  - the binding runs down the left with its stitching, and the page's own
    corners are folded (a tap on one turns a page);
  - a drag turns the page and it follows the finger, with the next page
    already showing underneath; let go past a third of the way, or flick it,
    and it falls over — otherwise it falls back;
  - the ribbon marks the chapter the player is actually up to, and a row of
    dots along the foot says where in the book this page is;
  - the chapter tabs turn straight to their page; there is no free panning.
  - **The front page** is the knoll where the wardrobe tent stands, with
    Aurora waiting on it in whatever she is wearing and the trail setting off
    toward chapter 1.
- **The story is printed on the page** (`story/DialogueBubbles.vue`), not
  floated over it in bubbles:
  - a chapter opens on its TITLE page — the chapter's name, and one star per
    chapter;
  - each beat is set on paper along the foot of the page, with the speaker's
    portrait inset on their fixed side (Aurora left, everyone else right) and
    the pictograms above the line;
  - **a tap turns the page** to the next beat, with the same turn every scene
    change uses, after C12's 600 ms dwell. A folded corner says so;
  - the words sit on the node's OWN chapter page: entering a dialogue opens
    the book there first.
- **Verified:** `tests/ui/pageTurn.test.ts` (the geometry, the swap on a frame
  that never draws, the queue); in a browser, the turn frame by frame, the
  book's drag / corner / tab / front page, the title page and the beats on
  desktop and phone; 786 tests; portal QA web 24/24, GamePix 33/33,
  GameMonetize 36/36, CrazyGames full 41/41.

### §8.29 Owner request, 2026-09-20 — the duel is fought on the page

*"I feel like the storybook stories and the cleaning tasks and dialogs are
disconnected to the actual unicorn dueling. How can we bring these two things
together?"* The answer is that all three now happen to the SAME page, in
order: the chapter's title page turns, Umbra arrives on the sector's page and
the words are printed on it, the duel is fought over that page, and the
cleaning finishes what the duel started.

- **The page is the arena's backdrop** (`duel/duelPage.ts`). Instead of an
  abstract storm sky, a duel is fought over the sector it is for — under
  Umbra's dust, exactly as the wipe will show it. The sky is still the
  scoreboard, but it lies over the page as a wash (heavier while she is
  losing, thinner as it clears), and the island, the cloud band and the
  weather are unchanged.
- **Spells land on it.** Every spell that lands blows a patch of dust off the
  page — the colour underneath comes back where it hit, with two smaller
  scatters around it, so a duel opens the picture up rather than drilling one
  porthole. Umbra's spells puff dust back over it.
- **The cleaning inherits it.** What Aurora's spells blew clean is handed to
  that sector's wipe (`duelHeadStart`), so the child arrives at the cleaning
  with her own spells' marks already on the page.
  - **It only ever gives** (D1): Umbra can smudge the page, but the record
    the wipe inherits is the MOST it was ever cleared, never the least. A
    lost duel hands over nothing; it never adds dust.
  - **It is capped** at `CARRY_CAP` (20 % of the sector). The cleaning is the
    reward (§8.25), so a duel can hand over a head start, never the job. A
    typical winning duel hands over 10–13 %.
  - A cell counts as cleared for the wipe when it LOOKS clear (`CARRY_AT`,
    0.55), not when it meets the wipe's own stricter `DONE_AT`: what the
    child watched come back to colour is what she should not have to scrub.
  - The head start is granted once, and only after a win.
- **A practice duel** on a sector already restored is fought on the finished
  page, in full colour, with nothing to clear. **Local versus** has no page
  and keeps the plain sky.
- **Cost:** two bakes at half the sector's size and one mask, all dropped when
  the duel ends; the composite is rebuilt only when a spell lands, so the
  frame itself is two blits.
- **Verified:** in a browser, end to end — the duel drawn on the dusty page,
  five spells opening 10 % of it, the win stashing it, the wipe opening at
  12.8 % with those cells already clear, and a practice duel on the finished
  page. Perf at CPU ×4, 915×412 DPR 2: duel work p95 **4.4 ms** (p99 6.0),
  map 4.6 ms, wipe 3.1 ms, no long tasks — the same budget as §8.22's pass.

### §8.30 Owner ruling, 2026-09-20 — the runes are earned, two at a time

*"The player should start with 2 runes and the enemy also only have the same
runes available as the player… Present new runes as gifts given after a click
on the gift chest, which opens the FReward in reveal state with firework and
confetti… also show the player how to draw the new rune."* This supersedes
§4.4's "frozen four": a new player now holds TWO runes, and the other ten are
given, one chest at a time.

- **The starting pair is Fire and Earth** (`STARTING_RUNES`): a triangle and a
  square — the two simplest shapes for a small finger — and between them both
  jobs from the first battle, since a lone Earth is already a shield.
- **The schedule** (`runeForNode`, one table):

  | Given | Rune | Where |
  | --- | --- | --- |
  | at the start | Fire, Earth | — |
  | after the 1st battle | Ice | node 1's chest |
  | after the 3rd battle | Wind | node 3's chest |
  | after the 5th | Nature | chapter 1's boss chest |
  | at the end of each chapter after that | its own rune | that boss's chest |

  Ten chapters and twelve runes do not divide evenly: chapters 4 and 8 give
  their **Signature Spell** instead, exactly as before (§4.4). Every rune is
  given exactly once, and by the Festival the player holds all twelve —
  pinned by `tests/campaign/controller.test.ts`.
- **A save from before this keeps its four.** Nobody is taken back down to
  two: `readCampaign` ORs the starting pair in, never masks down.
- **The foe fights with the player's runes** (`foeMask`): every free choice
  she makes is filtered to the runes the player holds. The one exception is
  her own chapter's magic — the rune that chapter's chest is about to give —
  so a chapter still introduces its rune by using it against you first, and
  every boss keeps its mechanic (§6.11, §6.13: Crystal Ward, the decoys,
  Frost Lock, the Love finisher). Her scripted contracts are not filtered;
  each is already gated on its own condition.
- **The ceremony** (`FReward.vue`, `RuneGift.vue`, `useRuneGift.ts`). A chest
  that owes a rune opens into it, on the tap that opens the gift:
  - the reveal — a slow burst of rays from the middle of the screen, a warm
    glow, drifting sparks and falling confetti — with the fanfare;
  - the rune itself on its plate, big, with its name under it, **drawing
    itself in the order a finger makes it** over its own faint ghost. A tap
    replays the stroke; it also loops on its own;
  - the game is held paused behind it (`acquireModalOpen`), so the wipe
    waiting underneath does not run on without the player;
  - the rune is already saved when the ceremony starts: closing the tab
    mid-burst loses the party, never the rune.
  - `FReward` is ported from the same component in `survivalist` — its ray
    burst is one element, one conic gradient, one transform — and dressed in
    this game's paper. Reduced motion (§3.11) stops the spin, the drift and
    the confetti.
- **And then in the duel:** §5.13's trace assist already ghosts the NEWEST
  rune in the drawing box, so the rune the chest just taught is the one the
  next duel offers to trace.
- **The happy moment stays the boss's** (§11.6): the early rune chests are a
  moment for the child, not a milestone for the portal — exactly one
  happytime / happyMoment per chapter, at the boss chest. Portal QA caught
  this the first time round, when every rune chest fired one.
- **Difficulty** (D1, tune for children). The win-rate harness
  (`pnpm test:winrate`) now models the real schedule — it sets
  `runesUnlocked` per node and draws only from what she owns, because the
  foe reads the same save; with it unset every number was flattering.
  Measured, 360 duels per cell, the core child:

  | | nodes 1–2 | nodes 3–4 | boss | within 3 tries |
  | --- | --- | --- | --- | --- |
  | ch1 | 98.9 % | 95.0 % | 86.4 % | 100 % |
  | ch5 | 99.7 % | 98.6 % | 99.4 % | 100 % |
  | ch10 | 97.8 % | 96.7 % | 96.4 % | 100 % |

  Every chapter clears its floors (§7.2: 90 %/85 % standard, 75 %/60 % boss).
  The first battles are the easiest in the game, which is what a two-rune
  start is for.
- **Verified:** 797 tests, including `tests/duel/runeSchedule.test.ts` (the
  cadence, all twelve given once, and the foe reaching only for the player's
  runes plus her chapter's magic); a browser run of the first chest's
  ceremony on desktop and phone; portal QA web 25/25, GamePix 34/34,
  GameMonetize 37/37, CrazyGames full 42/42.

### §8.31 Owner request, 2026-09-20 — the page behind the beats

*"I think the background of the storybook pages also needs some kind of
background art, as it looks barren right now, but it should not distract from
the story beat cards."* A chapter page was a cream card with a coloured hill
along its foot, and everything between the two was blank. It now carries what
a picture book puts on its endpapers — and nothing more, because the beat
cards are the only thing on a page a child is meant to look at.

A chapter page's whole background is now ONE baked image
(`map/pageDecor.ts`), blitted inside the page's own clip so a turning page
carries it with it. Four layers go into that bake, in this order:

1. **The light on the paper.** A warm bloom off the head of the page and the
   binding's shadow down its spine edge, so the card reads as a sheet lying in
   a book rather than a flat swatch. No shapes, so nothing to compete with.
2. **Marginalia.** The chapter's own world in thin ink on the paper, one set
   per chapter:

   | Chapter | Printed on its paper |
   |---|---|
   | 1 Whispering Woods | clouds, a gull, drifting leaves, a whisper curl |
   | 2 Bubble Bay | bubbles, wave curls, a fan shell, a gull |
   | 3 Cloud Kingdom | clouds, birds, a star, air curls |
   | 4 Crystal Caves | crystals, drops, twinkles |
   | 5 Mirror Mountains | peaks, snowflakes, drops, twinkles |
   | 6 Rainbow Ridge | rainbow arcs, clouds, twinkles, hearts |
   | 7 Sunken Sands | suns, wind curls, shells, twinkles |
   | 8 Twilight Tundra | snowflakes, pines, stars, a cloud |
   | 9 Starlight Summit | stars, a crescent, twinkles, a peak |
   | 10 Friendship Festival | bunting, balloons, hearts, twinkles |

   A chapter that has not been built yet dreams in stars instead, beside the
   moon and the Zs §3.7 already gives it, and a shade fainter.
3. **The biome wash** — the two bands of rolling hills along the page's foot
   (its side, in portrait) that the page already had. It moves into the bake
   because it never moves on screen either, and every separate fill is another
   full-page composite through the page's rounded clip.
4. **Paper grain.** A seamless fibre tile over the whole page, hills included,
   because paper shows through the ink printed on it. It is laid in as a
   repeating pattern at DEVICE resolution, so the fibre is 1:1 with the
   screen's own pixels rather than stretched with the page.

**The rule the whole feature is built around: marginalia is furniture, not
content.** One ink colour, a tenth of an alpha, never animated, never
coloured, and never anywhere it could be mistaken for something to tap:

- every motif is rejection-sampled against the page's five beat cards (each
  grown to take in its frame and shadow), their badges, the binding, the
  folded corners and the page dots, and against every motif already placed;
- marginalia is printed on PAPER only — the coloured biome wash along the
  page's foot (its side, in portrait) is left alone;
- a page that has no room left simply carries fewer drawings. In portrait,
  where the five cards fill most of the sheet, that is often only three or
  four, which is the right answer rather than a shortfall;
- the scatter is seeded per chapter, so a page looks the same every time it is
  opened and nothing shimmers between frames.

**Why it is baked, measured rather than assumed.** Drawn live, the layer is
three full-page composites (a pattern fill and two gradients) on top of the
wash's two, all through the page's rounded clip — and a rounded clip is the
one thing that costs real time when a canvas is not GPU-composited. On a
restored chapter page in a software-rasterised browser (`--disable-gpu`, which
stands in for a weak device since a vsync-locked GPU arm cannot tell the two
apart) it **halved the frame rate: 33.3 ms a frame against 16.7 ms with the
layer off.** Baking the light, the marginalia and the grain alone did NOT fix
it — the remaining cost was the clipped full-page blit itself, which is why
the wash went into the same image. As one blit the page is back to **16.7 ms
median, p95 16.8 ms** over 200 frames across three runs, i.e. the baseline,
and the page now performs FEWER clipped composites per frame than it did
before this feature existed. The bake is keyed by chapter, built-state,
orientation, wash colours and page size, with the last three kept: a browser
run counted **one bake for a whole session**.

**Verified:** `tests/ui/pageDecor.test.ts` pins the keep-out contract (never
over a card or badge, never on the wash, never off the page, never piled,
stable per chapter, and empty rather than crowded when there is no room); in a
browser, chapters 1–10 on desktop and phone, landscape and portrait, against
both dusty and fully restored beat cards; 809 tests.

### §8.31 Owner request, 2026-09-20 — the fight, and the book held upright

Three things, from one message: *"the storybook doesn't look good in portrait
mode"*, *"the casting effects and particles… were implemented for a 13 kB
version of the game, let's bump up the quality… to a AAA game studios quality
level"*, and *"do the next up silhouettes to peak interest"*.

**A. The book, held upright** (supersedes §8.28's portrait layout). The page
was taller than the screen, so the NEXT page bled in under it — a scroll, not
a book. Now, in portrait, the page is fitted to the view on BOTH axes, under
the chapter ribbon and above the corner buttons, and centred in what is left;
the world is clipped to the page's own card; and the binding is a band beside
the page rather than whatever the margin happened to be.

**B. The next rune, teased** (§8.30). The spellbook's strip lights the
silhouette of the rune the NEXT chest owes (`nextRuneAfter`) and hangs a
little chest on its corner — what she is playing toward, without a word.

**C. The fight (stage one).** The jam build drew every spell as a coloured
ball with a highlight. What is in now:

- **`spellArt.ts` — one table, twelve elements.** Per rune: the body its shot
  flies as (flame, gust, shard, boulder, leaf, bubble, bolt, wisp, prism,
  sand, crescent, heart), its ribbon, its spin and pulse, and what it leaves
  behind. Shape is what tells Ice from Water at arm's length — half these
  elements are a shade of blue.
- **A spell in flight is four layers**, in the order light behaves: the glow
  it throws ahead of itself, the ribbon of where it has been, the body in its
  own silhouette, and the rim the light catches. The ribbon is sampled per
  DRAWN frame from the shot's own position — a trail is a picture of motion,
  not a fact about the simulation — and drawn in three chunks per pass, not
  one stroke per sample: the taper reads the same and costs a tenth.
- **The release** (`castBurst`): the gather it always had, then a hard white
  ring leaving the horn on the same beat as the spell, a lick of the
  element's light chasing it out, and a camera punch.
- **The hit** (`impact`): the impact frame it always had, then TWO
  shockwaves — a thin white one that outruns the eye and the element's own
  behind it — the debris, and then the AFTERLIFE: embers burning on, frost
  settling, dust hanging, petals, spray, sparks, motes. Plus:
  - **hit-stop** — the duel holds still for 26–76 ms, scaled by power, so a
    blow reads as weight rather than as a number going down. The SIM owns
    that clock (a harness that steps the sim alone must thaw on its own);
    the fx clock skips while it runs, and the app clears it if a duel is left
    mid-freeze;
  - **the camera punch** — a couple of per cent, about the stage's middle, so
    nothing slides.
- **A heavy is heavier everywhere at once** (`heft`): longer ribbon, wider
  glow, more shed — not the light spell drawn bigger.

**D. Stage two — the cast, not just the element.**

Stage one gave each of the twelve ELEMENTS a look. But the lead rune is only
ever half of a spell (§6.2 step 7): Fire and Ice together is not a hot spell
with a cold name, it is a Wet Ball, and the eye should be able to say so
before the callout does.

- **Every cast now knows what else went into it.** `mixRune` names the
  strongest element that is not the lead, and the shot carries it (`Shot.m`).
  It never touches the body — the body is the lead's, because the lead is
  what the damage is scaled by — it tints the ribbon's wide pass, the rim the
  light catches, the muzzle, and half of what the hit leaves behind. That is
  one number, and it makes all **454 combinations** read as combinations.
- **The golden 22 wear their own flourish.** A spell with a NAME a child
  reads on the callout gets a mark over its body: a crown of motes riding
  over the heavies, a counter-spinning star on the crystalline ones, chips
  thrown off the shattering ones, a halo on the ones that whirl. Sixteen
  entries, one per named spell that flies — a test walks the spell matrix and
  fails if a new named spell is ever added without one. Everything else keeps
  the plain element look, deliberately: 454 combinations cannot be
  hand-drawn, and a flourish a child cannot name is noise.
- **A ward reacts to what it stops.** It used to swallow a spell and not
  move — the spell simply stopped existing in front of it. Now the shell
  lights up and throws a ripple from the point of contact (`wardHit`), over
  whichever of the five silhouettes is standing, and the spell's own element
  still breaks on it.
- **The rig.** The rear is SHAPED rather than faded: it punches to the
  extreme in two frames and settles back with one bounce, the way an animator
  holds an extreme. And the release kicks — the caster is shoved back off her
  own horn and springs home. True anticipation is not available to us: the
  shot leaves on the frame the player presses cast, and delaying it to wind
  up would be a gameplay change, so the weight goes into the recoil instead.

**Still to do — stage three** (this is a floor, not a finish):
- the decoy, the reflect and the Love finisher deserve their own language;
- a flinch on the hit, to match the kick on the cast;
- painted spell art through the art pipeline (§8.27's families), once the
  shapes have settled.

**Verified:** 801 tests, including the duel suites the hit-stop runs through;
the strike chain walked frame by frame in a browser (a new `__hold` QA seam
holds the game's own clock, since a spell's whole flight is six frames and
was over before a screenshot landed); portrait book checked at 390×844,
320×658 and 768×1024.

**NOT verified: the frame cost.** The machine was loaded while this was
written — a re-run of the untouched scenes moved by 2–6× between runs, and a
measurement taken in that noise is not a measurement. The last clean read
(§8.29) was duel p95 4.4 ms at CPU ×4; the VFX pass must be re-measured on a
quiet machine before release:
`npx vite build --base=./ --outDir dist-perf && node scripts/perf-scenes.mjs dist-perf 4 "" land`.
The known costs added are one glow gradient and six ribbon strokes per shot,
two rings and ~4 extra particles per hit.

## §9 Rendering, assets & performance

### §9.0 Lane boundary

§9 owns: map chunking/streaming, the dust/mask render path, resident-memory
budgets, the prop system, arena theming mechanics, the rig attachment API,
dialogue-portrait rendering (§9.7.1), fx.ts's per-rune VFX vocabulary,
`ART_FOLDERS`, the Step-3 art-slot table and its byte budget, staged loading,
and the Step-2 procedural-fallback scope. **`glyph.ts`'s per-rune ICON
geometry is NOT authored here** — per M15/§5.14, it calls the shared
parametric-shape generators in `src/game/duel/shapes.ts` (§5's module); §9
wires `glyph.ts`'s two renderers to those shared generators and authors zero
new curve math (corrected in §9.9 — the previous draft claimed the opposite
and is withdrawn). §7 (Analyst) owns the numeric MODEL this serves (wipe
durations, brush size, session pacing, telemetry) — §9 assumes §7's numbers
where cited below and states the assumption. §4 (Architect) owns the
sector/campaign SCHEMA inside `S.campaign` and the module layout under
`src/game/`. §9 places its own new files against **§4.2's final split**, not
the Round-1 draft this chapter assumed previously: `src/game/map/` for
map/page/sector rendering and the idle-map prop system (§9.1, §9.5);
`src/game/restore/` for the wipe mechanic itself — the coverage grid, brush
stamp and dust compositing (§9.3), per §4.2's explicit assignment (M16);
`src/game/cosmetics/` for the rig-cosmetics renderer (§9.7).

**Assumption flagged for audit:** §9 assumes the persisted coverage grid is
**24×14 cells per sector**, matching C9's stated save size (336 cells, 1
bit/cell, 42 bytes, 56 base64 chars). If §7 or §8 back-solve a different
brush size from C10's 15 s standard / ≈10 s boss wipe targets that makes 24×14 feel too coarse
or too fine, the cell COUNT is a one-line constant (`GRID_W`/`GRID_H` in
`src/game/restore/mask.ts`); nothing else in this chapter depends on the exact
number, only on cells being small enough to bit-pack and square-ish enough to
read as "missed a spot."

---

### §9.1 The map: chunks, pages, and what's resident

**Model.** The map is not one surface (C29). It is a sequence of **10
chapter pages**, each page a fixed 2D layout of **5 sector slots** (4
standard + 1 boss, left-to-right per C5's node order) plus the connecting
path art between them. A page is the unit of streaming; a sector is the unit
of dust/mask/wipe.

- `sectorId = chapter * 5 + nodeIndex` (0-based, 0..49), matching C5's 50
  nodes 1:1. [S1]
- `pageId = chapter` (0..9). [S1]

**Canvas/RAF ownership (M10/M11).** The map (idle and restore) never owns a
canvas or a RAF of its own. `AppScene.vue` owns the ONE `<canvas>`, the one
`getContext`, and the single RAF loop (M11) — the same one the duel controller
draws into once `GameScene.vue`'s render loop lifts out per §4. Every
function this chapter specifies (§9.1's page/thumbnail draw, §9.4's
restore-view pipeline, §9.5's props, §9.6's arena bake) is a plain draw
function called FROM that one RAF whenever the FSM's current scene
(`S.flow.scene`, M10) is `map` or `wipe` — none of them call
`requestAnimationFrame` or touch the DOM canvas element themselves.

**Resident window (C29):** only `pageId ∈ {current-1, current, current+1}`
have their sector art, masks and prop strips loaded. `current` is the
chapter of the furthest node the player has reached OR is scrolled to,
whichever is greater (scrolling back to admire chapter 2 while chapter 6 is
current keeps BOTH windows briefly resident — see the `S.q`-gated cap in
§9.2, row "resident pages"). Pages outside the window are represented on the
map only by their already-decided **done-bitset** (C9) — enough to draw a
tiny "cleared" tick on a far-off page thumbnail without loading anything.

**Two resolution tiers per sector, from ONE exported file (N-6 correction —
see §9.2):**
1. **Source art** — authored once per sector at the "restore-view" size
   (§9.4's `SECTOR_W×SECTOR_H`), 2× on-screen per `art-style.md` §9.
2. **Map-view thumbnail** — NOT the same in-memory decode as a previous
   draft of this chapter assumed. On first display, the source webp is
   decoded once and immediately downsampled into a small, PERSISTENT
   thumbnail canvas (`384×224`, ≈0.34 MB decoded); the full-resolution
   `Image`/decode is then released (dropped from the resident set) unless
   that sector is the ≤1 sector currently open in the restore view (C9). No
   second file is exported or fetched — the export-count saving from a
   single source asset is kept — but the map view's RESIDENT memory is the
   thumbnail's, not the source's. Reopening a cleared/dusty sector for
   restore re-decodes its already-HTTP-cached webp (a cheap CPU re-decode,
   not a network refetch) and rebuilds the thumbnail from it if needed.
   This is the lever §9.2's memory table uses to stay under budget.

**Streaming trigger:** a page's assets begin fetching (`preloadArtOverrides`
pattern from `src/game/art.ts`, `fetchPriority: 'low'`) as soon as it enters
the ±1 window — i.e. on ENTERING chapter N's last node, chapter N+1 starts
prefetching, never earlier. This is what §9.14 keys the per-chapter budget
to. [S3]

**Non-goal:** there is no virtual-scroll "infinite canvas" abstraction. Ten
fixed pages is a small, enumerable list; building a generic streaming-tile
engine for it would be solving a bigger problem than exists. [S1, deliberate]

---

### §9.2 Resident-memory budget, per `S.q` tier

Numbers are decoded-bitmap memory (4 B/px RGBA, the Canvas2D floor — see
Round-1 TECH-7), not download bytes (§9.13 has those), in **decimal MB**
(1 MB = 1,000,000 B) throughout, for consistency with the mask-row figures
already stated this way. `S.q` bands reuse the two breakpoints already live
in the codebase (`chars.ts`'s `S.q` truthy check, `arena.ts`'s `S.q > 0.6`),
so no new threshold is introduced.

**N-6 correction.** The previous draft's mid-tier "decoded bitmap memory"
row (`12×1152×672×4B + 3×2304×1344×4B ≈ 48.9 MB`) was arithmetically wrong —
the same formula computes to **74.3 MB** (12 × 3.10 MB + 3 × 12.39 MB), which
also broke the steady-state and peak totals below it and the "<80 MB" claim
that depended on them. Rather than just correct the arithmetic into a worse
number, this redraws the table around §9.1's real mitigation: **only the ≤1
sector open in the restore view ever holds a full-resolution decode.** Every
other resident sector — the other 14 in the ±1 page window — holds only its
small thumbnail (§9.1). This is "lower-resolution far sectors," the
mitigation N-6 asks for, not a relabelled ceiling.

| Resource | q = 0 (low) | 0 < q ≤ 0.6 (mid) | q > 0.6 (high) |
|---|---|---|---|
| Resident pages | current only (no read-ahead) | current ±1 | current ±1 |
| Resident sectors (thumbnails, idle map) | 5 (current page) | 15 (3 pages × 5) | 15 |
| → thumbnail memory (384×224×4B ≈ 0.344 MB ea.) | 5 × 0.344 ≈ **1.72 MB** | 15 × 0.344 ≈ **5.16 MB** | 15 × 0.344 ≈ **5.16 MB** |
| Full-res decode resolution (the ≤1 OPEN sector only) | 0.5× source (576×336 std / 1152×672 boss) | source (1152×672 std / 2304×1344 boss) | source |
| → open-sector bitmap (std / boss) | 0.77 MB / 3.10 MB | 3.10 MB / 12.39 MB | 3.10 MB / 12.39 MB |
| Open-sector mask canvas, same resolution (≤1 resident, C9) | 0.77 MB / 3.10 MB | 3.10 MB / 12.39 MB | 3.10 MB / 12.39 MB |
| Arena bake (§9.6, 1 entry) | ~2.4 MB (bk=0.5 floor) | ~9.65 MB (measured, bk≈2) | 9.65 MB |
| Prop strip cache (§9.5) | 3 designs × 4 frames × 64² × 4B ≈ **0.20 MB** | 6 designs × 8 frames × 128² × 4B ≈ **3.15 MB** | 8 designs × 8 frames × 128² × 4B ≈ **4.19 MB** |
| Dialogue-portrait cache (§9.7.1, ALWAYS resident, tier-independent) | ≈ **2.8 MB** (2.6–3.1 MB range) | ≈ **2.8 MB** | ≈ **2.8 MB** |
| **Idle steady-state** (no sector open) | thumbnails+arena+props+portraits ≈ **7.1 MB** | ≈ **20.8 MB** | ≈ **21.8 MB** |
| **Peak, a standard sector open** | +0.77+0.77 → **≈ 8.7 MB** | +3.10+3.10 → **≈ 27.0 MB** | +3.10+3.10 → **≈ 28.0 MB** |
| **Peak, a boss sector open** | +3.10+3.10 → **≈ 13.3 MB** | +12.39+12.39 → **≈ 45.5 MB** | +12.39+12.39 → **≈ 46.6 MB** |

Every row now sums to its stated total (spot-check q=0 peak-std:
1.72+2.4+0.20+2.8+0.77+0.77=8.66→8.7; spot-check high-tier idle:
5.16+9.65+4.19+2.8=21.80→21.8; spot-check high-tier boss-open peak:
21.80+12.39+12.39=46.58→46.6). **R-17 correction:** the previous draft
omitted §9.7.1's dialogue-portrait cache from this table entirely — it is
small but ALWAYS resident (unlike everything else here, it isn't gated by
which page or sector is open), so it is added as its own row and folded
into every total above.
This replaces the Round-1 worst case (100–150 MB, computed against one
un-tiered resolution and a 3-page-always-at-full-res assumption) AND two
successive wrong claims from earlier drafts ("<80 MB", then "<44 MB" before
the portrait cache was added) with an honest one: **resident map/wipe
memory stays under ~47 MB at worst case (a boss sector open, high `S.q`,
portraits resident), and under ~22 MB when idle**, on the strength of the
thumbnail/full-res split plus the portrait cache being genuinely small, not
on a bigger ceiling. `S.q = 0` is the floor this project already ships for
low-end phones (DPR cap 2, adaptive hysteresis in `PERF-LEDGER.md`); the
map/wipe screen now degrades on the same dial instead of ignoring it
(closing Round-1 TECH-13). [S1] for the tiering mechanism, [S3] for real
numbers to be re-measured on device once chapters 1–3 exist.

---

### §9.3 The dust render path: masks, coverage grid, and the 3 ms budget

**Per-sector state, new file `src/game/restore/mask.ts` [new]** (M16/§4.2's
assignment — the wipe mechanic's coverage grid, brush stamp and dust
compositing live in `src/game/restore/`, not `src/game/map/`; a previous
draft of this chapter put it in the wrong directory):

```
interface SectorMask {
  sectorId: number
  maskCanvas: HTMLCanvasElement      // erase target, destination-out
  grid: Uint8Array                   // 24×14 = 336 cells, 0..255 fill fraction (LIVE, not persisted)
  cleared: boolean                   // true once ≥85%, then permanent
}
```

- `maskCanvas` size = the sector's own `SECTOR_W × SECTOR_H` at the **q-tier
  decode resolution** from §9.2 (never DPR-scaled — the GDD's own "scaled
  down relative to screen resolution" line, read literally). Starts fully
  opaque (dust visible everywhere); erasing paints `destination-out`.
- `grid` is the LIVE, fractional (0–255) accumulator used only to compute
  `coverage01` and to decide when a cell has crossed the "done" line (≥ 224,
  i.e. ~88% locally — a little past the 85% global target so no single cell
  drags the sector average down forever). It is NEVER read back from
  `maskCanvas` pixels.
- **Stamp accounting (no `getImageData`, closing Round-1 TECH-5):** each
  brush stamp is a circle of known centre/radius in sector-local units. On
  every stamp, for each of the (at most ~6, given a 36 CSS px floor brush
  against 24×14 cells) grid cells the stamp's bounding box touches, add
  `255 × overlapFraction(circle, cellRect)` to that cell (clamped 255),
  where `overlapFraction` is the same closed-form circle/AABB approximation
  used for hit-testing (4-sample supersample of the cell against the circle
  — cheap, cell count is tiny). `coverage01 = mean(grid) / 255`.
- **The erase boundary also emits `K_PUFF` particles** at a RATE, not a
  per-stamp count (R-18 — see §9.8) — the GDD's "soft, cloudy" erase
  register, driven by §8.5's brush-speed curve and gated by `S.q` (§9.10).
  This is a call from this module into `fx.ts`'s existing shared pool, not
  a second particle system.
- **The 85% check runs at most every 250 ms**, not every frame (matches
  NUM-10's cadence exactly) — summing 336 bytes is trivial, but there's no
  reason to do it 60×/s while a chime is meant to build smoothly; the chime
  pitch (owned by §8) interpolates between checks.
- **Persistence (C9):** on pause/save, bit-pack `grid[i] ≥ 224` into the
  42-byte/56-char string. **On resume**, the mask canvas is NOT restored
  pixel-for-pixel — it is rebuilt by `destination-out`-filling each "done"
  cell's rectangle with the pre-baked soft brush stamp (§9.3.1) tiled across
  it, so the resumed view reads as "mostly the same," not "identical brush
  strokes." This is the one place C9's "looks exactly as it was left" is a
  cell-granularity promise, not a pixel one — stated here so §8/§12 test to
  the right bar.

#### §9.3.1 Brush stamp — pre-baked, not filtered

Closes Round-1 TECH-11 (M29: this heading now exists as a real target, not
just bold text — a previous draft's §9.3.1–3 references were broken links).
One offscreen canvas per active tool (Stardust Brush / Magic Eraser /
Sunbeam, C10), baked ONCE: a radial-gradient soft-alpha circle (brush,
sunbeam is a rectangle-ended sweep of the same gradient), 96×96 px source,
~9 KB decoded (96×96×4B). `drawImage`'d under `globalCompositeOperation =
'destination-out'`. No `ctx.filter` anywhere in the wipe path.

#### §9.3.2 Stamp cadence

Closes Round-1 TECH-12. Pointer samples accumulate into a small buffer;
**one stamp (or a short line of stamps along the accumulated path) is drawn
per RAF tick**, matching the "one RAF, fixed step" seam in `PERF-LEDGER.md`
— never one `destination-out` draw per raw `pointermove` event.

#### §9.3.3 Perf budget: ≤ 3 ms/frame for standard sectors; ≤ 4 ms/frame for boss sectors (R-6 correction)

Ratified, "Numbers every chapter must share," for the STANDARD-sector case;
this section adds the boss-sector line the ratified number didn't
distinguish. Breakdown at the mid `S.q` tier (1152×672 mask):
- Stamp compositing (1–3 stamps/frame, 96×96 source over a small dest
  region): ~0.3–0.6 ms.
- Grid accounting (≤6 cells touched × O(1) overlap math): negligible
  (<0.05 ms).
- **Dust composite** (§9.4 step 2's live layering, drawn every frame the
  restore view is open): the dominant cost — a full-sector `multiply` fill
  + a tiled `overlay` noise blit, both at mask resolution. Measured-
  equivalent reference: `arena.ts`'s two-pass cloud band composite at a
  similar pixel count runs comfortably inside frame budget today; this is
  the same two-composite-op idiom at a comparable size. Budget: ~1.5–2 ms.
- Total ≈ 2–2.6 ms at mid tier, leaving headroom under the 3 ms ceiling for
  low-end variance. At `q=0` (576×336, a quarter the pixels), the same path
  is ~0.6 ms.

**R-6 correction: the boss mask, taken literally, blows this budget.** At
2304×1344 (mid/high tier — see §9.2's tiering; `q=0`'s boss mask is only
1152×672, already covered by the numbers above), the dust composite alone
scales ~4× with pixel count: **~6–8 ms**, plus stamp/grid overhead, landing
around **~8–10 ms** total — 2.5–3× the ceiling, not a rounding-level miss.

**Mitigation (not a revised ceiling alone):** the dust composite for a boss
sector renders into a scratch buffer at the SAME internal resolution as a
standard sector's mask (1152×672 — a quarter the boss pixel count), then
is upscaled with the browser's default bilinear smoothing onto the full
2304×1344 destination in one `drawImage` call. The soft brush edge and the
tiled noise overlay (§9.4 step 2b) already hide the resulting softness —
this is not a visible quality cut, it's exploiting the fact the dust look
is deliberately soft-edged already. The scratch buffer is one small,
reused canvas (not counted as new resident memory in §9.2 — it is
transient, per-frame, and shared across every boss sector one at a time,
the same way `arena.ts`'s existing bake canvases are reused rather than
allocated per draw).

Revised boss-sector budget, mid/high `S.q` tier:
- Dust composite at the mitigated (1152×672-equivalent) internal
  resolution: ~1.5–2 ms (same as a standard sector's — the point of the
  mitigation).
- Upscale blit (1152×672 source → 2304×1344 destination, one `drawImage`
  call): ~0.5–1 ms.
- Stamp compositing + grid accounting: unaffected, ~0.3–0.6 ms (stamps are
  drawn at the mitigated internal resolution too).
- **Total ≈ 2.3–3.6 ms** — still tight against a 3 ms ceiling, so the
  ceiling for boss sectors specifically is revised to **≤ 4 ms/frame**,
  not left at 3 ms and hoped for. Standard sectors, at every `S.q` tier,
  keep the ratified ≤ 3 ms.

| Sector | q = 0 | mid / high |
|---|---|---|
| Standard | ~0.6 ms | ~2–2.6 ms |
| Boss (mitigated) | ~2–2.6 ms (its mask is already only 1152×672 at this tier) | ~2.3–3.6 ms |
| **Budget** | ≤ 3 ms (both) | **std ≤ 3 ms; boss ≤ 4 ms** |

- **If S0/S1 measurement still blows either budget** on a real low-end
  device, the first lever is the `S.q=0` decode-resolution halving already
  in the table; the second is dropping the noise-overlay pass (§9.15's
  queued experiment already covers this arm).

---

#### §9.3.4 S1 as built — the dust path (2026-09-18)

**The dust is composited ONCE, not every frame.** The dust's look never
changes while a sector is open, so the dust canvas is baked when the sector
opens, in this order:
1. the painting, plus the windmill's resting sails;
2. a `saturation` blend with grey, which keeps the painting's hue and
   luminosity and drops its saturation to zero;
3. a `multiply` with the plum ink `#4a3656` at 0.72;
4. nine soft smudges;
5. an `overlay` with the procedural noise tile at 0.35.

The brush then erases that canvas directly with `destination-out`. A frame is
two blits (colour, then dust), the live props between them, and the stamps.

The saturation drain is what makes the ≤ 20 % dust-saturation floor hold for
any base tone. A multiply alone keeps the hue's saturation, which is §9.6.1's
worry. It passes on real pixels: dust saturation 6–10 %, restored 73–77 %,
ΔL 26–32 (the S1 smoke run's pixel samples).

**The coverage model is a sample lattice.** Each of the 24 × 14 cells holds
4 × 4 samples of remaining dust. Every stamp multiplies them by
`1 − a·falloff(d)`, with the SAME falloff the baked stamp carries, so the model
and the pixels agree by construction. `coverage01` is the mean. A cell is done
at ≥ 224/255.

**Resolution.** The sector canvases are baked at the resolution the sector is
DRAWN at: 0.5–1 × 1152 × 672 in ¼ steps, and 0.5 on `S.q = 0`. They are
released when the scene ends.

**The reveal wave clips the dust draw.** It does not erase with a growing
stamp. The erase was a ~3.8 ms full-canvas composite per wave frame; the clip
costs nothing extra. The dust is cleared once when the wave lands.

**Measured** (headless Chrome, `__wipe.perf()`, mask + dust work per frame):
- 1280 × 720 at 1× and 320 × 658 at 2×: average 0.09–0.13 ms, p95 0.2–0.4 ms,
  max 0.9 ms.
- CPU throttled ×4: p95 1.8–2.1 ms, max 4.2 ms over wipe frames.
- One-off frames at ×4: 30 ms on the scene's first frame (the GPU upload of the
  fresh bakes, under the page dip) and 23 ms once in the restored view (after
  the save write, most likely GC).

The ≤ 3 ms standard budget holds. The boss mitigation (a half-resolution
scratch and an upscale) is probably unnecessary under this path; S2 measures a
boss sector before building it.

### §9.4 The restore view: render path (layer order)

**Scene identity (M10).** `wipe` is a distinct FSM scene id (M10's enum),
but it has no renderer or canvas of its own: it is this SAME map module, in
restore mode — camera-locked, zoomed to one sector, pan disabled. Any
per-scene `.vue` file for `wipe` holds ONLY DOM overlay chrome (the tool
icon, the coverage chime UI); every pixel below it comes from this render
path, called by `AppScene.vue`'s one RAF exactly as §9.1 specifies.

The restore view (C6 step 5: "the same map canvas, zoomed and camera-locked,
pan disabled") draws, back to front, every frame it is open:

1. **Sector colour layer** — `drawImage(sectorBitmap, …)`, full sector
   extent, no transform beyond the camera-lock zoom (computed once on
   entry, not per frame).
2. **Dust overlay**, drawn ONLY over the still-uncleared area (clipped to
   `maskCanvas`'s current alpha via a `destination-in`-composited offscreen
   pass, OR — cheaper and what's specified — drawn full-sector every frame
   with `globalCompositeOperation` sequence:
   a. `multiply` a flat `#3A2340`-family grey (art-style.md's own ink
      colour family, not pure black — §9.6.1's palette-floor note) over the
      colour layer, alpha **0.72** (raised from an earlier 0.55 — §9.6.1's
      ≤20%-dust-saturation floor is the reason: at 0.55 a fully-saturated
      base tone can still show through above that floor, and this alpha is
      the one tuning knob to close that gap, checked empirically by §12's
      pixel-sample test rather than derived analytically here).
   b. `overlay` the ONE shared tiled noise texture (§9.12's `FX-NOISE` row,
      256×256, shared across all 50 sectors) at alpha ~0.35, offset by a
      per-sector seed so
      tiling doesn't visibly repeat between adjacent sectors.
   c. This whole dust pass is then drawn through `maskCanvas` as the
      alpha source (`destination-in` onto an offscreen the size of the
      sector, or, cheaper on devices that support it, drawn straight into
      the main context, THEN the mask erase is applied to the same buffer
      — implementation detail for the S1 spike; either way it's 2 composite
      ops on top of step 1, no `ctx.filter`, no per-pixel readback).
3. **Landmark tint** (C11) — the sector's ONE greyscale tint-mask, composited
   with `multiply` using the player's picked colour (one of 3 pots), drawn
   ONLY once the sector is past the reveal beat (never during dust, never
   before the pick). $0 runtime cost while hidden (skipped, not drawn at
   alpha 0).
4. **Animated props** for that sector, if `cleared` (§9.5) — drawn in their
   own screen-space positions, culled to the camera-locked view (which IS
   the whole sector in this view, so no culling saving here specifically;
   culling matters on the IDLE MAP, §9.5).
5. **Brush cursor / stamp preview** (a ring at the pre-baked stamp's
   radius, drawn live, no filter).
6. Wipe sparkles and `K_PUFF` dust — fx.ts's shared pool (§9.8), safe to
   share with the duel's combat VFX because the two scenes never run at the
   same time (C7).

**Idle map (not restoring) render path** is steps 1 (thumbnail-scaled) + 3 +
4 only, for every RESIDENT sector across the ±1 page window — no mask, no
dust pass, no brush layer, since a resident sector is either fully cleared
(shows colour + props) or fully dust-covered-and-untouched (shows colour +
dust with the "done" grid all-zero, drawn once and cached as a static
bitmap per sector, not recomposited every frame — this is the one place a
per-sector dust render IS baked once and blitted, because an untouched
sector's dust never changes between visits).

---

### §9.5 Prop-system caps

New module `src/game/map/props.ts` [new]. Separate from `fx.ts`'s
360-particle duel pool — different lifetime (persistent across sessions,
not reset per duel), different owner (the map/idle-map scene, never live
during a duel per C7).

- **Cap: ≤ 16 concurrently ANIMATED props** on screen at once (idle map or
  restore view combined), same order of magnitude as `arena.ts`'s own
  grass-tuft count (22–40, the nearest precedent in this codebase for "many
  small always-on decorations"). Props beyond the cap on a crowded page
  freeze on frame 0 of their cycle — a still windmill reads fine; nothing
  in the GDD requires simultaneous motion.
- **Update-only-if-visible:** a prop's animation clock only advances while
  its sector is within the current viewport (idle map scroll) ± ~1 sector
  width, exactly mirroring §9.1's ±1 page rule at a finer grain. Off-screen
  props hold their last frame; this is what stops "every sector I've ever
  cleared ticks physics forever" (Round-1 TECH-14).
- **Design count, not instance count, drives memory** (§9.2's prop-strip
  row): `spriteStrip.ts`'s existing cache is already keyed by
  `kind/id` (the DESIGN), so 40 standard sectors sharing, say, 6–8 distinct
  prop designs per biome pair cost the same as 6–8 instances. Budget:
  **≤ 15 distinct prop designs total across all 10 biomes**, of which **2
  are reserved for the D3 bloom reward** (`bloom-critter`, `bloom-flower` —
  see below; they are not biome-specific, so they don't scale with the 50
  bloomable sectors), leaving **≤ 13** for biome-specific decorations
  (roughly 1–2 per chapter — a windmill for Whispering Woods, a waterfall +
  a peeking creature for Bubble Bay, etc.). The resident-design count in
  §9.2's table (3/6/8 by tier) is never the full budget at once thanks to
  the ±1 window.
- **Frame count per design:** 4 frames (`q=0`) / 8 frames (`q>0`), at
  64×64 (`q=0`) or 128×128 (`q>0`) per panel — small, since these are
  background dressing, not focal characters. Uses the existing
  `spriteStrip.stripFrame(kind, id, aspect, cycle01)` API unchanged; no new
  slicing convention needed.
- **Procedural fallback (Step 2):** each prop design is a small, named
  procedural draw function (windmill = a rotating cross of 4 rounded blade
  shapes over a cel cone, waterfall = 3–4 vertically-scrolling translucent
  bands, creature-peek = a bounce-in ellipse pair on a sine timer) — same
  order of authoring cost as `arena.ts`'s grass tufts, NOT a new rig system.
- **Bloom reward props (implements D3 — the currency is removed entirely;
  the rewarded "Twin Gift" now grants a permanent cosmetic bloom of a
  sector, never coins).** Claiming a sector's bloom (win-only, offered on
  the map right beside that sector right after its reveal, one bloom per
  sector ever, 50 max lifetime — no power, no progress, purely visual) adds
  a small FIXED set of extra decoration to that one sector's own render:
  **+2 extra animated prop instances** (one `bloom-critter`, one
  `bloom-flower`) plus a gentle ambient sparkle (not a prop — see below).
  This is deliberately sized to live WITHIN this section's existing caps,
  never stacked on top of them:
  - **Concurrent-prop cap:** the screen-wide ≤16 cap above (tiered by
    `S.q` per §9.10: 8 at `q=0`, 16 at mid/high) is unchanged; a bloomed
    sector's +2 instances simply spend 2 of that same budget, same as any
    other prop. Worst case — every one of a resident page's 5 sectors
    bloomed at once — adds at most 10 instances screen-wide; combined with
    ordinary biome props this can exceed the cap (especially at `q=0`'s
    floor of 8), but that is exactly what the "freeze on frame 0 past the
    cap" rule above already exists for — no new overflow behaviour is
    needed, and a bloom prop has no more claim to guaranteed motion than
    an ordinary one.
  - **Design-count cap:** the 2 designs are pre-reserved out of the ≤15
    total above, not additive to it — see the revised bullet above.
  - **Procedural fallback (Step 2):** `bloom-critter` reuses the exact
    `creature-peek` idiom already listed above (a bounce-in ellipse pair on
    a sine timer) as a second, independent instance; `bloom-flower` reuses
    §9.7's `crown` idiom (3–5 petal shapes on a stem arc), planted in the
    ground instead of worn on the head. Same authoring cost as every other
    design in this list — no new rig, no new shape vocabulary.
  - **Sparkle:** not a prop, and not counted against either cap above — a
    low-rate, low-opacity ambient emission from `fx.ts`'s existing shared
    pool (the same idiom `mask.ts`'s `K_PUFF` (§9.3) and the restore view's
    step-6 wipe sparkles (§9.4) already use), riding the existing neutral
    `K_GLINT` silhouette (§9.8's victory-ring reuse of the same kind, for
    the same reason: a bloom has no element to show). No new fx.ts kind, no
    new `PAL` slot.
  - **Art slot:** see §9.12's new `PRP-BLOOM` row — `bloom-critter` and
    `bloom-flower` are painted like any other `PRP` design (drawn fallback
    + optional painted override in `images/props`), following this
    chapter's existing drawn-fallback/painted-slot convention exactly; the
    sparkle needs no art slot at all, since `K_GLINT` already falls under
    §9.8's committed non-goal that fx.ts's particle shapes stay 100%
    procedural, permanently.

---

### §9.6 Arena theming per chapter (implements C20)

`arena.ts`'s two module-level singletons (`isle`, `clds`) become a
**1-entry cache keyed by chapter id**:

```
let bakedFor: { chapter: number; scale: number } | null = null
let isle: HTMLCanvasElement | null = null
let clds: HTMLCanvasElement | null = null
```

`sync()`'s rebuild check becomes `if (!isle || bakedFor?.chapter !== S.campaign.chapter || bakedFor.scale !== qs()) bake(S.campaign.chapter)`.
Revisiting an earlier chapter's duel node (replay, C24) **rebakes on every
entry** — accepted per C20's ruling; the bake itself is milliseconds
(unchanged from today) and happens behind the existing loading transition,
never mid-duel.

**Theme parameters, per chapter (data, not new bitmaps — $0 Step-2 art
cost):**

| Param | Drives | Example (ch.2 Bubble Bay) |
|---|---|---|
| `rockBase` / `rockShade` | `bake()`'s two cel-plane fills (today `#435`/`#324`) | `#63c7e9` / `#2f6f96` |
| `mossBase/Shade/Lip/Hi` | the 4 cap-band fills (today `#472/#593/#ce6/#7c3`) | seafoam/teal family |
| `cloudTint` | the `#789`/`#9ab` cloud-band fills | pale cyan family |
| `propKind: [shapeId, shapeId]` | which 2 of the "living up there" ellipse decorations (today: mossy stones + blossoms) are drawn — swaps to e.g. shells + coral for Bubble Bay | `['shell','coral']` |

10 rows of this table (one per chapter) ship as data in `src/game/duel/config.ts` (or `src/game/campaign/` per §4). **Whether the DUEL arena needs to match the biome at all was Round-1's open question to the owner — this ruling (C20) settles it: yes, via palette+prop swap, never via a new painted backdrop.** Painted arena backdrops are explicitly **[later]**, not committed (§9.15).

#### §9.6.1 Candy-palette floor

Implements M27/coverage-C5. The GDD's "oversaturated, candy-colored"
restored world against a charcoal/grey dust (Executive Summary, §3, §6) is a
repeated, load-bearing visual promise — this is the numeric floor that makes
it checkable rather than assumed. Every chapter's theme row (`rockBase`,
`mossBase`, `cloudTint` — the RESTORED base tones, not their shadow
variants) must clear:

- **Restored base tones:** HSL saturation ≥ 70%, lightness in 55–75%.
- **Dust look**, measured AFTER §9.4 step 2's composite (grey `multiply` +
  noise `overlay`): HSL saturation ≤ 20%, regardless of the base tone
  underneath.
- **Minimum ΔL** (restored lightness − dust lightness) ≥ 25 percentage
  points.

Shadow tones (`rockShade`, `mossShade`, etc.) are exempt from the
saturation/lightness floor — they exist for cel-shading legibility (per
art-style.md §4.1's "≈15–20% darker, shifted slightly toward violet" rule),
not for the candy read, and darkening them further would fight that rule.

**The one concrete example this chapter gave (ch.2 Bubble Bay) failed this
floor and is corrected:** the previous draft's `rockBase #3d6c8c` is
HSL(203°, 39%, 39%) — under both the saturation and lightness floors.
Corrected: `rockBase #63c7e9` (HSL 195°, 75%, 65%, clears both), `rockShade
#2f6f96` (darker and violet-shifted per the shadow rule above, exempt from
the floor by design). The other 9 chapters' rows are still data to be
authored (§9.14); this floor is now the hard constraint they're authored
against, checked by §12's acceptance test (below), not a style suggestion.

**§12's check:** sample two adjacent pixels per sector — one from a
still-dusty area, one from the same spot after reveal — and assert the three
floors above. If any chapter's row fails it in practice, the fix is the
theme-row's hex values or §9.4 step 2a's multiply alpha, never a new
mechanism.

---

### §9.7 The rig attachment API (implements C31, feeds C17)

`chars.ts` gains one new exported function, computed from the SAME pose
math `drawUnicorn` already runs — extracted into shared intermediates so
the two can never drift:

```ts
export interface Anchors {
  forelockRoot: [number, number]  // head-local; flower crown, any head-slot item
  hornBase: [number, number]      // head-local
  hornTip: [number, number]       // head-local
  neckCollar: [number, number]    // outer-space; necklace / scarf (neck slot)
  backWithers: [number, number]   // outer-space; wings (back slot)
  tailBase: [number, number]      // outer-space; companion / pet-star float anchor
  hoofFront: [number, number]     // stage space; hoof-trail VFX spawn point
  headTransform: DOMMatrix        // head-local -> outer-space, for head-slot items
  outerTransform: DOMMatrix       // outer-space -> stage space (mirror + rearing frame)
}

export const anchorsFor = (
  x: number, y: number, side: number, st: PoseState, t: number
): Anchors => { /* replays drawUnicorn's transform chain; no drawing */ }
```

Literal values (read off today's `chars.ts`, starting points for visual
tuning once cosmetics are drawn, not invented):
- `forelockRoot = (1, -21)` — the existing forelock hair root, head-local;
  natural crown/head-item anchor, zero new geometry.
- `hornBase ≈ (9, -19)`, `hornTip = (9 + 15.68, -19 - 32.4) = (24.68, -51.4)`
  — both already literal constants in `drawUnicorn`'s horn block.
- `neckCollar` = 70% along the neck tube from chest to poll:
  `lerp((11, by-6), (hx-4, hy+14), 0.7)`.
- `backWithers` ≈ the chest quad's top: `(8, by - 26)` (chest quad centre
  `by+3`, `ry≈18`, minus a little for "sits just above the coat," tuned
  visually at S2).
- `tailBase = (-26, by - 4)` — the existing tail `hair()` root, reused
  as-is.
- `hoofFront` = the near foreleg's target `(fx, fy)` already computed in
  `fl()`'s closure — exposed rather than recomputed.

**Draw-order slots (closes Round-1 TECH-17).** `drawUnicorn` gains 4 named,
optional callback hooks, called with the CURRENT transform still active so
a cosmetic renderer needs no extra math:

| Slot | Fires | For |
|---|---|---|
| `beforeTorso` | after the far hind leg, before the torso silhouette | back-slot items that must sit BEHIND the body (wings' far layer) |
| `afterMane` | after the mane, before the head group's `g.save()` | neck-slot items (necklace, scarf) |
| `afterHead` | inside the head group, after the forelock, before `g.restore()` | head-slot items (crown) — automatically gets `HK` head scale for free |
| `afterRig` | after the whole rig, in stage space | companion (pet star), hoof-trail spawn hook, wings' near layer |

`drawUnicorn(ctx, x, y, side, st, t, hooks?)` — `hooks` optional and
defaults to none, so the duel's existing calls (`render.ts`) are unchanged
until cosmetics are wired in at S2.

**Cosmetic rendering (`src/game/cosmetics/rig-cosmetics.ts` [new]):**
consumes `anchorsFor()` + the 4 slots. Each equipped item is `{ slot: 'head'
| 'neck' | 'back' | 'companion' | 'hoofTrail' | 'mane' | 'skin', kind: string
}`. Procedural fallback: a small named draw function per item (crown = 3–5
petal shapes on a stem arc; necklace = a string of 3 shell/bead shapes;
wings = 2 feather-fan shapes drawn at `beforeTorso`+`afterRig`; pet star = a
5-point star bobbing on a sine offset from `tailBase`). Painted fallback:
small overlay sprite, positioned via the anchor + its own transform matrix,
never baked into a strip per combination (closes Round-1 TECH-20).

**`skin` split from `D` (closes Round-1 TECH-18, per C31):** `drawUnicorn`'s
signature gains `st.skin?: 0 | 1` (default: `= side>0?1:0`, i.e. today's
behaviour unchanged). `PAL[st.skin]` replaces `PAL[D]` for coat/mane/horn
colour ONLY. `D` (still `side>0?1:0`) continues to gate the dread aura, the
eye-glow halo and the stockier `K`/`HK` scale — so equipping the "Umbra
look" skin on Aurora (`side=-1, skin=1`) renders Umbra's palette on
Aurora's own proportions and behaviour, no dread aura, no half-lidded eye,
exactly as C31 specifies.

#### §9.7.1 Dialogue portraits

Implements M27/coverage-C1. C12's bubble grammar requires a "speaker
portrait + emote" on every bubble — the pre-reader comprehension mechanic
Band-1 gates on (§2.1) — and §10.6 names 7 emotes across up to 11 speakers
(Aurora, Umbra, 5 reused rivals, 4 brand-new Guardians). This closes the
gap: no bitmap, no new rig. A portrait is a **procedural head-and-shoulders
crop** of the SAME `chars.ts` rig §9.7 already exposes anchors for.

```ts
export type EmoteId = string // §10.6's 7-entry enum; §9 does not define the ids

export const drawDialoguePortrait = (
  ctx: CanvasRenderingContext2D,
  speaker: { skin: 0 | 1; foeIndex?: number }, // same `skin`/foe selector as §9.7's `PAL[st.skin]`
  emote: EmoteId,
  boxSize: number,   // CSS px, square portrait box
  t: number
): void => { /* draws only the head group (skull, ears, eye, horn, blush) —
               no torso, no legs — clipped to a head-and-shoulders box */ }
```

`emote` drives brow angle, eye-open amount and mouth curve via a small
lookup `EMOTE_SHAPE[emote] = { browAngle, eyeOpen, mouthCurve }` — **§10.6
supplies the actual 7 rows; §9 only wires the 3 numbers into the existing
head-group draw calls** (the eye's `el()`/`ink()` pair, the mouth's
`g.arc()`, a new brow stroke above the eye that today's combat-only rig
doesn't draw). This is the same "one geometry, many renderers" idiom §9.7
(anchors) and §9.8 (rune kinds) already use.

**Cache and bake cost.** Baked ONCE per `(skin, foeIndex, emote)` combo into
a small offscreen canvas, keyed by that triple, on first use — never
rebuilt per frame, never per dialogue node (the same combo recurs across
many nodes). Bake cost per combo is a handful of the existing head-group
path/fill/stroke calls (skull, both ears, eye, horn, blush, one new brow
stroke) — sub-millisecond, paid once. Memory is bounded by combos actually
SCRIPTED, not the 11×7=77 cartesian product: at a realistic ~25–30 scripted
combos × 160×160×4B (≈102 KB each), resident cost is **≈2.6–3.1 MB**
worst-case, small enough to never need eviction.

**Step-3 art slot.** `ART_FOLDERS` gains `portrait: 'images/portraits'`
(§9.11). A painted override follows the drop-in contract like everything
else — but it is **not committed art**: it sits in the same non-goal class
as painted duelist/Guardian portraits (§9.12), for the same reason (the
procedural crop already satisfies C12 from S2 onward, and painting up to 30
scripted combos is a quality upgrade, not a requirement). §9.12 carries the
slot with an explicit `0 KB [later]` line rather than a silent omission.

---

### §9.8 fx.ts changes for the 12-rune alphabet (implements C1, closes TECH-1/2)

**Assumption flagged for audit:** §9 uses C1's final 12-id order — 0 FIRE,
1 WIND, 2 ICE, 3 EARTH (frozen), 4 Leaf, 5 Bubble(circle), 6 Spiral,
7 Mirror(∞), 8 Arch, 9 Hourglass, 10 Star, 11 Heart — per the chapter table
in §5's ownership. Crystal (ch.4) and Frost (ch.8) are **Signature
Spells**, not rune ids; they get spell VFX keyed by spell id, never by
`KIND_OF_RUNE`.

**Kind lookup replaces the bitmask (M25 correction).** A previous draft of
this array collided rune 4 with `K_BLOCK=5` (the fire-rain debris kind) —
I-8's finding, verified against the real repo's `const K_BLOCK = 5` and its
hard-coded ground-landing branch. Corrected:
```ts
// was: const k = (rune & 3) + 1
const KIND_OF_RUNE: readonly number[] =
  [1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13]
  // frozen FIRE..EARTH -> 1..4; then 6..13 for Leaf..Heart.
  // 5 (K_BLOCK, fire-rain debris) is DELIBERATELY skipped — it is not a rune kind.
const k = KIND_OF_RUNE[rune]!
```
**Regression test, named:** `fx.kindOfRune.test.ts`, asserting (a)
`KIND_OF_RUNE` is a bijection onto 12 distinct values
(`new Set(KIND_OF_RUNE).size === 12`), (b) `KIND_OF_RUNE[4] !== K_BLOCK`
(the exact I-8 regression), and (c) `KIND_OF_RUNE[11] === K_HEART`. Runs in
CI from S2 onward, before rune 4 ships.

**Do not enumerate call sites by name — grep them (M25/I-9 correction.)** A
previous draft named exactly three functions (`castBurst`/`gather`/
`impact`) as "every call site" and missed a fourth, real one:
`drawFxUnder`'s `K_RING` shockwave-front renderer, which independently
computes `shp(g, (c & 3) + 1, ...)` at (today) `fx.ts` line 482 — verified
against the real repo. A name-based list is exactly how that fourth site
was missed. The implementation step is `grep -n "& 3" src/game/duel/fx.ts`;
every hit must go, and do not ship rune id 4 until that grep returns zero
hits. [S2]

**R-3 correction: `drawFxUnder`'s fix is NOT `shp(g, KIND_OF_RUNE[c], ...)`.**
A previous draft of this section proposed exactly that, and it is wrong for
the same reason the original bitmask was wrong: `c` (`P[i+10]`, per the
particle stride below) is a PALETTE/colour index, not always a rune id.
`ring()`'s callers pass whatever colour the shockwave should tint itself —
for `gather`/`impact` that IS the cast rune (0–11, safe to feed
`KIND_OF_RUNE`), but `rainbowBurst`'s victory ring calls `ring(x, y,
C_WHITE, ...)` with `c = C_WHITE = 9`, and `KIND_OF_RUNE[9]` is Hourglass's
kind — the exact class of bug F16 was raised to close, reintroduced one
level up. Re-reading `fx.ts`'s stride confirms why: `P[i+9]` (kind) and
`P[i+10]` (colour) are already two separate fields, but for a `K_RING`
particle `P[i+9]` is always the META-kind `K_RING` (meaning "this is a
shockwave," not "draw this shape") — there is nowhere already in the
stride to also record WHICH of the 14 element/glint silhouettes should
ride that shockwave's front, independent of its tint colour.

**Fix: a new, dedicated per-particle field, `P[i+11]` — `dispKind` —
extends the stride from 11 to 12** (`ST = 12`; the extra 1 × `CAP` × 4 B ≈
1.4 KB is noise). `sp()` gains an optional last parameter, `disp = k`
(defaulting to the particle's own kind, so every existing non-ring call
site — every `burst()` — is unaffected: for debris, the display shape IS
its kind, same as today). `ring(x, y, c, r0, grow, life, disp)` gains a
REQUIRED `disp` argument — the caller must say which silhouette rides the
front, set ONCE at emit time, never re-derived from `c` at draw time:
- `gather`/`castBurst`/`impact`: `ring(x, y, rune, ..., KIND_OF_RUNE[rune])`
  — genuinely rune-driven, safe.
- `rainbowBurst` (the victory ring, `c = C_WHITE`): `ring(x, y, C_WHITE,
  12, 900, 0.55, K_GLINT)` — there is no single element to show on a
  multi-colour victory ring, so it rides the neutral sparkle silhouette
  instead of any rune's shape. (This specific choice is tech-art's own
  call, not a ruling; §8/Critic may override the shape, not the mechanism.)

`drawFxUnder`'s `K_RING` branch becomes `shp(g, P[i + 11]!, ...)` — it
reads the stored `dispKind`, and never derives a shape from `c` again.
`c` (`P[i+10]`) keeps doing exactly what it already does for the FILL
colour (`g.fillStyle = q > 0.88 ? PAL[C_WHITE]! : PAL[c]!`) — the two
concerns are now genuinely separate fields.

**Regression test extended:** `fx.kindOfRune.test.ts` (above) gains a case
for the victory ring specifically — spawn a `rainbowBurst`, read the live
pool's `K_RING` particle back, and assert its `dispKind` (`P[i+11]`) is
`K_GLINT`, NOT `KIND_OF_RUNE[C_WHITE]` (`=KIND_OF_RUNE[9]`, Hourglass) —
the exact regression the coordinator's audit caught.

**`SIL` gains 8 new unit polygons plus one renumbered existing kind.** Kinds
are renumbered, not appended, since fx.ts's `K_*` constants are positional
and every USE of them is through the named constant, not a literal (so
renumbering is a one-line change per constant, not a call-site sweep): **1–4**
stay FLAME/SWOOSH/SHARD/ROCK (frozen); **5** stays `K_BLOCK` (fire-rain
debris — not a rune, deliberately skipped above); **6–13** are the 8 new
rune kinds below; the existing shockwave-front kind, `K_RING`, moves from
**6 to 14** to make room; **15** is `K_PUFF` (new, non-rune — §9.3/§9.10).

| Kind | # | Rune | Silhouette | Gravity `G` | Drag `DR` |
|---|---|---|---|---|---|
| `K_LEAF` | 6 | Leaf | soft chevron blade, flutters | -60 (drifts) | 1.4 |
| `K_BUBBLE` | 7 | Bubble | thin-ring circle, translucent | -120 (floats up) | 1.8 |
| `K_SPARK` | 8 | Spiral | tight comma, fast spin | 200 | 1.0 |
| `K_MIRROR` | 9 | Mirror | figure-8 ribbon segment | -20 | 2.0 |
| `K_ARCH` | 10 | Arch | thick banked crescent | 400 | 0.9 |
| `K_HOURGLASS` | 11 | Hourglass | bowtie shard | 700 | 0.6 |
| `K_STAR` | 12 | Star | 5-point sparkle (distinct from `K_GLINT`'s 4-point) | -80 | 1.6 |
| `K_HEART` | 13 | Heart | rounded heart, sharp cusp | -100 (rises, "love" reads light) | 1.5 |
| `K_RING` | 14 | — (shockwave front, all elements) | *unchanged, renumbered from 6* | *unchanged* | *unchanged* |
| `K_PUFF` | 15 | — (erase-boundary dust, not a rune) | -30 (barely rises) | 2.8 (doesn't shoot away) |

Each new rune kind (6–13) is a hand-packed unit-polygon string in the SAME
char-packed format as today's 6 (`(charCode-77)/24`), same authoring cost
as the shipped set — no new encoding, no new draw path. [S2, incrementally
per chapter unlock]

**One additional non-rune silhouette, `K_PUFF` (implements M27/coverage-C3
— the GDD's "soft, cloudy" erase register, which a previous draft of this
chapter substituted with a reused combat-glint look).** Low-opacity,
soft-edged, slow-drifting, sharing fx.ts's existing pool and batched draw
pass — no new system. Its single `PAL` slot bakes its own alpha into the
hex string (the same idiom as WIND's `PAL[1]+='e0'`): a soft dust-grey at
~33% opacity. Emitted by `src/game/restore/mask.ts` (§9.3), never by a
cast/impact function.

**R-18 correction: emission is a RATE, not a per-stamp count.** A previous
draft spawned a fixed `PUFFS_PER_STAMP` (1/2/3) on every stamp — at one
stamp per RAF tick (§9.3.2) on a 60 Hz device that is 60–180 puffs/second,
independent of and in conflict with §8.5's own brush-speed-response curve,
which is the canonical FEEL for every wipe-tool emission (audio, haptics,
and now this). §9 does not own that curve; it only gates it. Corrected:
`src/game/restore/mask.ts` calls a rate the tool's own feel curve already
produces (§8.5's `speedResponse01`, the same 0–1 value already driving the
audio pitch), scaled to a base ceiling of **~20 puffs/second at maximum
brush speed** (§9's assumption, for §8 to confirm or replace), and `S.q`
becomes a MULTIPLIER on that rate, not an independent count:

| `S.q` tier | Multiplier | Effective rate at max brush speed |
|---|---|---|
| q = 0 | 0.5× | ~10/s |
| 0 < q ≤ 0.6 | 1× | ~20/s |
| q > 0.6 | 1× | ~20/s |

A **hard cap of 30 puffs/second** applies regardless of tier or brush
speed, independent of the stamp rate — so a device stamping faster than
once per RAF tick (§9.3.2 already prevents this) or a tool with an
unusually fast speed curve can never flood the pool. At a puff lifetime of
~0.4–0.6 s (matching the drawing-finger `trail()` sparkle's 0.45 s), even
the uncapped 20/s steady rate holds only ~8–12 puffs alive at once —
negligible against the 360-particle pool.

**`PAL` gains 16 new slots** (8 runes × primary+highlight), **4 more for
the two Signature Spells' own colours** (Crystal, Frost — each gets a
primary+highlight even though they have no rune index, referenced by a
small `SIGNATURE_PAL` map keyed by spell id, not by rune), **and 1 more for
`K_PUFF`**. `USED` (`Uint8Array(PAL.length)`) grows to match automatically
(`PAL.length` is read live). Total `PAL.length`: 18 (today) + 16 + 4 + 1 =
**39**. The colour-batched draw pass (`pass()`) is O(`PAL.length`) with an
early `continue` per unused slot — at 39 vs 18 this is a negligible
scan-length increase (extra ~21 integer comparisons per frame, well under
noise).

**Signature Spell VFX** (Crystal, Frost): drawn through a NEW small
function, `signatureBurst(x, y, spellId)`, parallel to `castBurst` but
keyed by spell id and using `SIGNATURE_PAL`/a dedicated `K_CRYSTAL_BURST` /
`K_FROST_BURST` silhouette pair — kept OUT of the rune-indexed path
entirely, so it can never collide with a real rune's kind the way the old
bitmask did.

**Non-goal: fx.ts's particle shapes stay 100% procedural, permanently.**
Painting individual particle silhouettes would replace the batched
`beginPath → fill → stroke` pass (§ fx.ts's whole performance contract) with
one `drawImage` per particle — a REGRESSION, not an upgrade, for a
360-particle pool. Step-3 "spell VFX" painting is scoped instead to the
full-screen flash/vignette layers only (`drawPost`), which are already
whole-screen fills, not per-particle. [committed non-goal, all stages]

---

### §9.9 glyph.ts changes for the 8 new rune icons (closes TECH-3, corrected per M15/I-14)

**This section is withdrawn and replaced.** A previous draft said `glyph.ts`
grows "8 hand-authored parametric branches... not a data-table insert" —
this directly contradicted §5.14 (M15), which assigns the SAME 8 curves to
one shared module, `src/game/duel/shapes.ts` (owned by §5, the Gesture
chapter), so that the recognizer's templates and the glyph drawn on screen
are provably the same shape. §9.0 has been corrected to stop claiming
unqualified ownership of this surface.

The actual change, entirely in `glyph.ts`: `glyphPoints()` and
`glyphSvgPath()`'s branch table (today's `SIDES`-plus-special-cases for
k=0..3) grows to cover k=4..11 by **calling §5.14.1's REAL exported
generators** (R-8 correction — a previous draft invented plausible-sounding
names, `poly(64)`/`spiralE()`/`heartSharp()`, that do not match §5.14.1;
the actual exports are `circle`, `spiral`, `heart`, `hourglassBowtie`,
`star`, `chevron`, `arc`, `infinity`), one per new rune:

| Rune (id) | `shapes.ts` generator |
|---|---|
| Leaf (4) | `chevron` |
| Bubble (5) | `circle` |
| Spiral (6) | `spiral` |
| Mirror / ∞ (7) | `infinity` |
| Arch (8) | `arc` |
| Hourglass (9) | `hourglassBowtie` |
| Star (10) | `star` |
| Heart (11) | `heart` |

instead of authoring new curve math here. §9 owns zero new geometry for
this surface; it owns only the plumbing that feeds each generator's output
through the two existing renderers (canvas stroke, SVG path), exactly as it
already does for runes 0–3. This keeps the real `glyph.ts` docstring's own
invariant ("ONE geometry, two renderers... stops the DOM glyph and the
canvas glyph drifting apart") intact, which the withdrawn wording would
have quietly broken.

Crystal and Frost get **no** glyph (they have no rune id, per C1/§9.8).
Used by: HUD rune slots, the spellbook (C16), the snap flash, the onboarding
trace, and the SVG path for DOM icons. Owner of the curve math: **§5**. [S2,
incrementally, gated on §5.14 shipping `shapes.ts` first]

---

### §9.10 `S.q` consumer registry

New consumers added to the existing dial (closes Round-1 TECH-13); nothing
here is a second quality system.

| Consumer | q = 0 | 0 < q ≤ 0.6 | q > 0.6 |
|---|---|---|---|
| Cel bands / hair locks / grass / aura *(existing)* | off | on | on |
| Resident map pages | current only | ±1 | ±1 |
| Sector art decode resolution | 0.5× | 1× | 1× |
| Mask/dust composite resolution | 0.5× | 1× | 1× |
| Animated prop frame count | 4 | 8 | 8 |
| Animated prop resolution | 64² | 128² | 128² |
| Concurrent animated props | 8 | 16 | 16 |
| Brush stamp source size | 64² | 96² | 96² |
| `K_PUFF` rate multiplier on §8.5's brush-speed curve (M27/coverage-C3, R-18, §9.3/§9.8; hard cap 30/s at every tier) | 0.5× (~10/s max) | 1× (~20/s max) | 1× (~20/s max) |

This table is the literal implementation of §9.2's memory table and §9.5's
prop caps — one source of truth, cross-referenced rather than duplicated in
code.

---

> **Superseded in part by §8.20 (S6 as built):** the folders are
> `artFolders.ts` (`sector`, `sectorThumb`, `rune`, `gift`, `tool`,
> `worldUi`, `cosmetic`, `portrait`, `ui`); there is no `landmark` or `prop`
> folder, because masks are derived and props stay drawn.

### §9.11 `ART_FOLDERS`, rewritten in this game's nouns (closes Round-1's "runner-game vocabulary" finding)

`src/game/art.ts`'s `ART_FOLDERS` today is `monster | hero | death | prop |
gate | round | fx | bg | ui` — verified unused by `chars.ts` (the rig is
100% procedural, no `spriteFor` calls in it) and unrelated to anything this
game has. Replaced:

```ts
export const ART_FOLDERS = {
  sector:   'images/sectors',    // per-sector colour background (§9.12 SEC-*)
  landmark: 'images/landmarks',  // per-sector colour-me tint mask (§9.12 LMK-*)
  prop:     'images/props',      // animated restored-sector props, strips (§9.12 PRP-*)
  cosmetic: 'images/cosmetics',  // wardrobe overlay sprites (§9.12 COS-*)
  gift:     'images/gifts',      // gift/chest art + open/reveal burst strip (generic radiance, no coins — D3) (§9.12 GFT-*)
  rune:     'images/runes',      // painted rune glyph icons, optional (§9.12 RUN-*)
  portrait: 'images/portraits',  // dialogue-portrait painted override, [later] (§9.7.1, §9.12 PRT)
  worldUi:  'images/world-ui',   // wardrobe tent only — jar + Rune Shrine removed per D3 (§9.12 WUI-*)
  fx:       'images/fx'          // shared noise texture only (§9.8's non-goal)
} as const
```
`hero`/`monster`/`death`/`gate`/`round` are dropped (zero references in the
duel, confirmed by grep). `ui`/`bg` fold into `worldUi`/`sector`. Painted
duelist/boss art (if ever pursued) is **[later]** and gets its own folder
then — not committed here (§9.12).

---

> **Superseded in part by §8.20 (S6 as built):** the slot list as built is
> 50 sectors (+ thumbnails), 8 items and 12 runes. See §8.20's deviations
> for `LMK`, `PRP`, `FX-NOISE`, the boss size and the byte estimate.

### §9.12 Step-3 art-slot list

Sizes at 2× on-screen per `art-style.md` §9. Byte figures are WebP,
flat-cel-illustration-typical compression (this codebase's own
`compress-images-pipeline` reference point: sharp q75/effort6 ≈ TinyPNG).
Counts follow C5 (50 sectors), C11 (1 landmark/sector), C17 (5 painted
cosmetic items — crown, necklace, wings, scarf, pet star; mane is 8 data
swatches, hoof-trail is procedural VFX, skin is a palette swap, all $0),
C4/C8 (3 gift states), §9.5 (≤15 prop designs, of which 2 are reserved for
the D3 bloom reward — see the `PRP-BLOOM` row below), §9.9 (12 rune glyphs,
art-style.md's own spec: 256 px).

| Key | Path | Px (source) | Count | Est. KB ea. | Subtotal |
|---|---|---|---|---|---|
| `SEC-STD` | `images/sectors/{id}.webp` | 1152×672 | 40 | 120 | 4,800 KB |
| `SEC-BOSS` | `images/sectors/{id}.webp` | 2304×1344 | 10 | 350 | 3,500 KB |
| `LMK` | `images/landmarks/{id}.webp` | 288×168, greyscale | 50 | 8 | 400 KB |
| `PRP` | `images/props/{kind}.webp` | strip, 8×128×128 (1024×128) | 15 | 50 | 750 KB |
| `PRP-BLOOM` | `images/props/bloom-{critter,flower}.webp` | strip, 8×128×128 (1024×128), same convention as `PRP` | 2 (fixed — `bloom-critter` + `bloom-flower`, shared by every bloomable sector, D3; see §9.5) | 50 | 100 KB |
| `COS` | `images/cosmetics/{slot}-{id}.webp` | 192×192 | 5 | 25 | 125 KB |
| `GFT` | `images/gifts/{kind}.webp` | strip, 4×160×160 | 3 | 40 | 120 KB |
| `RUN` | `images/runes/{id}.webp` | 256×256 | 12 | 8 | 96 KB |
| `PRT` | `images/portraits/{speaker}-{emote}.webp` | 320×320 | 0 committed (§9.7.1: painted override is [later], not built) | — | **0 KB [later]** |
| `WUI` | `images/world-ui/{id}.webp` | varies, ≤256×256 | 1 (tent; jar + shrine removed per D3) | 30 | 30 KB |
| `FX-NOISE` | `images/fx/dust-noise.webp` | 256×256, shared, tileable | 1 | 20 | 20 KB |
| **Total** | | | | | **≈ 9,941 KB ≈ 9.7 MB** |

Reconciles NUM-18's rough 8 MB starting anchor (§7's Round-1 figure): this
table lands ~1.7 MB higher because it itemises landmark tint masks and the
animated-prop strips NUM's pass didn't break out, and ~1.7 MB lower than a
naive "8 MB + those extras" would suggest because it deliberately EXCLUDES
painted duelist/boss portraits and painted arena backdrops (both scoped
**[later]**, §9.6/§9.15) — the two biggest single-asset categories in NUM's
implicit scope, and the two this chapter argues are not needed given C5
(rig reuse) and C20 (palette-swap arenas).

**Non-goals, explicit:** painted duelist/Guardian portraits, INCLUDING
dialogue portraits (§9.7.1) — chars.ts's procedural rig is signed off and
C5 gives all 9 Guardians + Umbra a body for $0 new topology; the procedural
head-and-shoulders crop already satisfies C12 from S2, so painting any of
the ~25–30 scripted `(speaker, emote)` combos is a quality upgrade, not a
requirement, and is [later]. Painted arena backdrops — C20 settles this as
palette+prop swap, not new bitmaps, [later] if ever revisited.
Per-combination cosmetic strips — combinatorially unaffordable (§9.7),
never built.

---

> **Superseded in part by §8.20 (S6 as built):** no per-chapter manifest.
> Thumbnails load per visible map page, the full painting when a sector
> opens, and the splash holds only for the first screen (`artPreload.ts`).

### §9.13 Staged loading per chapter

Reuses `src/game/art.ts`'s existing `preloadArtOverrides` /
`fetchPriority` mechanism unchanged — it already does exactly this for the
lane-game template's monster strips; it simply has no per-chapter manifest
today. New: a `chapterArtManifest(chapter: number): ArtWant[]` in
`src/game/campaign/` (§4's module) returning that chapter's `SEC-*` (5),
`LMK-*` (5), that chapter's 1–2 `PRP-*` designs, and that chapter's 0–1
`COS-*` item — nothing else.

**Per-chapter download, from §9.12's table (N-14 correction):** 4×120 KB
(480) + 1×350 KB (sectors, running total 830) + 5×8 KB (landmarks, 870) +
~1.5×50 KB (props, amortised — not every chapter debuts a new design, 945)
+ ~0.5×25 KB (cosmetics, 5 items over 10 chapters, **957.5**) ≈ **≈ 957.5
KB/chapter** — a previous draft's addends summed correctly but the stated
total (942 KB) transcribed them wrong. Against NUM-18's 800 KB/chapter
estimate, 957.5 KB is **19.7% over**, so this lands **within 20%**, not
within 15% as a previous draft claimed (942 KB was already 17.75% over,
past 15% either way) — the reconciliation still holds at the granularity
that matters for staged loading (the campaign total in §9.12 differs more
because of the non-goals above, but the per-chapter FETCH size — what a
player on a slow connection waits for between chapters — lands in the same
band NUM estimated, just not as tight a band as previously claimed).

- Fetched: on entering the chapter's window (§9.1), never at boot for
  chapters beyond 1±1, and never for a `released: false` chapter (C3).
  [S3]
- The shared `FX-NOISE` texture and the 12 `RUN-*` glyphs load once, at
  first boot, as part of the existing splash-held `primeArena()` preload in
  `src/use/useAssets.ts` — they're shared across every chapter, small
  (116 KB total), and needed from chapter 1's first duel.
- The 2 `PRP-BLOOM` designs (`bloom-critter`, `bloom-flower`, §9.5/§9.12)
  load once at first boot alongside the two rows above, for the same
  reason: they are chapter-independent (D3's bloom reward is not tied to
  any one chapter) and are never part of a chapter's `PRP-*` manifest
  entries above. This adds 100 KB to the first-boot load (216 KB total,
  up from 116 KB).

---

### §9.14 Procedural-fallback scope for Step 2 (closes Round-1 TECH-21)

**Committed:** ONE generic sector-background generator, extending
`arena.ts`'s existing techniques (a wobbly-disc silhouette, a seeded rock
walk, a tileable band pass), parametrised by §9.6's per-chapter theme row
(palette + a 2-shape prop swap list) — the SAME mechanism §9.6 specifies for
the duel arena, reused for map sectors. Estimated new code: ~150–250 lines
(one generator + the coverage-grid/mask plumbing in §9.3), plus 10 rows of
DATA (the theme table), not 10 bespoke generators. Restoration tools
(Stardust Brush, Magic Eraser, Sunbeam) and gift-box art are small named
shape functions, the same authoring order as `glyph.ts`'s existing rune
icons. New foes: **zero new topology** — per M2, §10.3 owns the actual
Guardian cast, mapping each of the 9 Guardians to one of the 5 shipped
rivals BY CHARACTER (e.g. ch 3 = Zephyr, ch 7 = Ember), plus Umbra's own
rig for the finale (R-19 correction — a previous draft of this section
said the reuse was "by element," implying each chapter's combat element
picks its rival; per M2 it is not — the cast assignment is §10.3's own
call, independent of §6's per-chapter element/tactic). Either way, the
MECHANISM this chapter is responsible for is unchanged: recolour an
existing rig, zero new topology, resolving Round-1's "chars.ts is
equine-only" concern without new code.

**Explicit non-goal:** a bespoke, hand-tuned silhouette LANGUAGE per biome
(a cave reading structurally different from a desert, procedurally) is NOT
built in Step 2. One generic generator + palette/prop data carries all 10
biomes' Step-2 distinctiveness; Step 3's painted `SEC-*` art (§9.12) is
where biome-to-biome visual identity actually lives. This trades Step-2
visual variety for a bounded, estimable amount of new code. [S2 for the
generator, S4 as chapters 4–10's theme rows are authored]

---

### §9.15 PERF-LEDGER entries and perf budgets

New rows for `PERF-LEDGER.md` (existing file), in its own table format:

| Seam | Where | Notes |
|---|---|---|
| Analytic coverage grid, no `getImageData` ever in the wipe path | `game/restore/mask.ts` | 24×14 `Uint8Array`/sector; §9.3 |
| Per-sector mask + dust composite, ≤ 3 ms/frame (standard) / ≤ 4 ms/frame (boss, mitigated half-res + upscale) | `game/restore/mask.ts` | measured against the mid `S.q` tier; §9.3.3 (R-6) |
| Pre-baked brush stamp (96×96 radial gradient), no `ctx.filter` in the wipe path | `game/restore/mask.ts` | one bake per tool (3 total); §9.3.1 |
| One stamp-batch per RAF tick, not per `pointermove` | `game/restore/mask.ts` | §9.3.2 |
| `K_PUFF` erase-boundary dust particles, shared fx.ts pool | `game/restore/mask.ts` calls `game/duel/fx.ts` | rate-driven off §8.5's brush-speed curve, `S.q` multiplier (0.5×/1×/1×), hard cap 30/s; §9.3, §9.8, §9.10 (R-18) |
| Thumbnail/full-res sector split (only the open sector decodes at full res) | `game/map/*` | closes N-6; §9.1, §9.2 |
| Chapter-keyed 1-entry arena bake cache (was device-scale-only) | `game/duel/arena.ts` | rebake accepted on chapter revisit, ms-scale cost unchanged; §9.6 |
| Prop system: visibility-gated update, design-keyed strip cache, ≤16 concurrent | `game/map/props.ts` | separate pool from `fx.ts`'s duel pool; §9.5 |
| `S.q`-tiered resident page/resolution/prop budget | `game/map/*`, table in §9.2 | new consumers of the existing dial |

**Experiments queued** (added to the existing "Experiments" table, `not run`
until S1):
- *Hypothesis:* the dust composite (§9.3.3) fits 3 ms/frame at the mid `S.q`
  tier on a throttled mid-range Android profile. *Arms:* full composite vs
  a cheaper single-pass (`multiply` only, no noise `overlay`). *Measure
  before* dropping the noise pass rather than assuming it's affordable.
- *Hypothesis:* resumed-mask cell-rect redraw (§9.3) reads as "the same" to
  a real player, not "blockier." *Arms:* none — a straight A/B with §12's
  kid-playtest protocol, not a perf A/B.


---

## §10 Story, dialogue & localisation

> Dissent: none on fact. One judgement note, not a re-litigation: C12's "one
> copy deck, not three tiers" (also C23) is the call I argued for in Round 1
> on cost grounds, so I have no dissent to log — flagging only that I am the
> proposer, not a neutral drafter, of that ruling.

### §10.1 Scope and how to read this chapter

This chapter specifies every player-facing word, name, and voice cue the
story extension needs, and the machinery that keeps 21 locales in parity as
that content grows. It does **not** re-decide anything already ruled in
`RULINGS.md` §§1–2 (C1–C31): the rune alphabet, the wipe mechanic, the
economy, the ad contract and the scene FSM are read here as given facts and
cited by `§N` where another chapter owns the mechanic.

Scope tags follow `RULINGS.md` §4's staging (`§1` owns the stage gates):
**[S2]** chapter 1 shell, **[S3]** chapters 1–3 (first release candidate),
**[S4]** chapters 4–10, **[S5]** 2P versus, **[S6]** painted art. Nothing
below is "TBD" — every field, count and string has a default value; where a
number depends on another chapter's ruling, that dependency is named inline
and repeated in §10.22.

### §10.2 The ten-chapter arc synopsis

One line each, combining the GDD's premise with the C1/C5/C26 cast rulings.
Chapter titles are the GDD's own (kept; see §10.5 on why they translate
rather than transliterate).

| Ch | Title (`chapter.c{n}`) | Premise | New magic (§5/§6 own the mechanic) | Guardian (§10.3) |
|---|---|---|---|---|
| 1 | Whispering Woods | The forest has gone quiet under a magic blight; the sprites are asleep. | Nature (leaf) | Briar *(new)* |
| 2 | Bubble Bay | Umbra's tide took the sea unicorns' songs. | Water (bubble) | Pearl *(new)* |
| 3 | Cloud Kingdom | An endless storm has grounded the baby pegasi. | Lightning (spiral) | Zephyr *(reused)* |
| 4 | Crystal Caves | The under-realm's crystals have shattered and gone dark. | Crystal — Signature Spell, no new rune (§10.13) | Terra *(reused)* |
| 5 | Mirror Mountains | Umbra's mirrors now show only confusing illusions. | Illusion (infinity) | Echo *(new)* |
| 6 | Rainbow Ridge | The world's colour is draining from the prismatic bridge. | Rainbow (arch, wildcard) | Prism *(reused)* |
| 7 | Sunken Sands | Time stands still over the frozen sandfalls. | Time (hourglass) | Ember *(reused)* |
| 8 | Twilight Tundra | The auroras in the sky are trapped in dark ice. | Frost — Signature Spell, no new rune (§10.13) | Glace *(reused)* |
| 9 | Starlight Summit | The night sky has gone dark; the stars need reigniting. | Moon & stars (star) | Nova *(new)* |
| 10 | Friendship Festival | Umbra is only lonely. The Festival is thrown to invite her in. | Love (heart, finisher, gated per §6) | Umbra herself |

Guardian↔chapter pairing is **thematic/biome fit**, not an elemental-weakness
claim: Zephyr (wind) reads as "Cloud Kingdom's storm," Terra (earth) as
"Crystal Caves' underground," Prism as "Rainbow Ridge's light," Ember (fire)
as "Sunken Sands' heat," Glace (ice) as "Twilight Tundra's frost" — all five
already carry those associations from the shipped game (`config.ts` `RUNES`,
`art-style.md` §4.2). **§6 assigns each Guardian's actual weakness element
and AI tier**; this chapter only fixes *who* stands in each biome and *what
they say*, not their combat numbers.

### §10.3 Cast table

Ids are the `duelist.*` i18n keys (existing four base rivals + the finale
boss are unchanged; five new leaf keys below). Voice notes feed §10.11's
babble pitch table and the one-line personality bible every translator gets
(§10.14).

**Guardian roster — binding (M2, fix round).** One row per boss node,
unambiguous, for §6 to copy verbatim into its own roster. Covers all 9
Guardians plus Umbra, including `pearl` for chapter 2. Ch 3 = Zephyr and
ch 7 = Ember, both reused, per M2's ruling — unchanged from this chapter's
first draft, now made explicit in this shape.

| Chapter | Guardian speaker id | Display-name key | Element |
|---|---|---|---|
| 1 | `briar` | `duelist.briar` | Nature |
| 2 | `pearl` | `duelist.pearl` | Water |
| 3 | `zephyr` | `duelist.zephyr` | Lightning |
| 4 | `terra` | `duelist.terra` | Crystal |
| 5 | `echo` | `duelist.echo` | Illusion |
| 6 | `prism` | `duelist.prism` | Rainbow |
| 7 | `ember` | `duelist.ember` | Time |
| 8 | `glace` | `duelist.glace` | Frost |
| 9 | `nova` | `duelist.nova` | Moon & stars |
| 10 | `umbra` | `duelist.umbra` | Love |

**Full cast, with voice notes** (supplementary to the table above — same
ids, plus Aurora and the generic `shadow` foe, plus the one-line personality
bible §10.14 hands to translators):

| Id (`duelist.{id}`) | Status | Role | Chapter | One-line voice note |
|---|---|---|---|---|
| `aurora` | existing | player | all | Warm, brave, never sarcastic. |
| `umbra` | existing, **re-cast** | true antagonist → friend | dialogue 1–9, boss 10-5, finale | Sleepy, dry, never cruel. Lonely under the teasing. |
| `shadow` | **new** | generic standard-node foe | all (tinted per chapter, see §10.8) | No lines of her own; she IS Umbra's dust, not a character. |
| `ember` | existing, reused | Guardian | 7 | Warm, a little dramatic, secretly soft. |
| `zephyr` | existing, reused | Guardian | 3 | Blustery, proud, fast-talking. |
| `glace` | existing, reused | Guardian | 8 | Cool, precise, dry wit. |
| `terra` | existing, reused | Guardian | 4 | Slow, steady, gently stubborn. |
| `prism` | existing, reused | Guardian | 6 | Playful, a little vain about her colours. |
| `briar` | **new** | Guardian | 1 | Grumpy on the surface, protective underneath. |
| `pearl` | **new** | Guardian | 2 | Calm, a little wistful, misses the singing. |
| `echo` | **new** | Guardian | 5 | Repeats things; never sure which reflection is real. |
| `nova` | **new** | Guardian | 9 | Quiet, hopeful, speaks in small wonders. |

**Non-goal:** standard-node foes do not get individual per-chapter proper
names or `duelist.*` entries. They are all `duelist.shadow` mechanically (one
HP-bar label, all 21 locales), because they are narratively the same thing
(Umbra's dust) wearing ten different tints — a chapter nickname exists only
as inline dialogue flavour (§10.8), never as a reusable key. This is the
direct fix for Round-1 LOC-3/LOC-6: without it, ten chapters × several
tinted foes each would have re-opened the naming-and-translation cost this
chapter exists to avoid.

### §10.4 Umbra's arc

Per C26: lonely, not evil; present from chapter 1; fought only at node 10-5;
befriended after. Every chapter opener reserves its **second bubble** for an
Umbra cameo (§10.9's `b2` slot) — this is the throughline, and it is the only
appearance budget she gets before chapter 10 (no extra bubbles: her presence
must stay a *background thread*, not a second story competing with the
Guardian's own).

Tone progression across the four story quarters (informs word choice, not a
new mechanic):

| Chapters | Umbra's tone | What she's doing narratively |
|---|---|---|
| 1–3 | Dismissive, amused. "Let them sleep." | Establishing her as a recurring, harmless-seeming voice. |
| 4–6 | Teasing, curious about Aurora's progress. | She's noticed Aurora keeps winning; she needles rather than dismisses. |
| 7–9 | Wistful, half-admitting she's lonely. | Foreshadowing the reveal without stating it. |
| 10 (pre-boss) | Vulnerable, defensive. | The mask drops just before the fight. |
| 10 (boss + thank-you) | Warm, disbelieving, grateful. | The reveal and the invite. |

**Non-goal:** no separate "Umbra affection meter" or hidden relationship
stat. The arc is authored, linear, and identical for every player — a
measurable relationship system is out of scope for the story build (revisit
only if a future retention pass wants one; `[later]`).

### §10.5 Naming policy: translate vs. transliterate (Round-1 LOC-8, ruled here)

Two policies, applied consistently everywhere a name appears:

- **Proper names of characters transliterate.** Aurora, Umbra, Ember,
  Zephyr, Glace, Terra, Prism, Briar, Pearl, Echo, Nova keep their sound
  across locales, exactly like the four base rivals already do in
  `src/i18n/locales/*.ts` (`ja.ts`: `'umbra': 'ウンブラ'`; `ar.ts`:
  `'umbra': 'أومبرا'`). A translator adapts spelling/script only, never
  meaning. This is a continuation of shipped precedent, not a new rule.
- **Everything else — chapter/place names, gifts, tools, the currency —
  translates.** These are common-noun compounds describing a place or an
  object ("Whispering Woods," "Magic Eraser," "Sparkle Jar"), not brands. A
  3-year-old benefits far more from parsing the words than from memorising
  an English sound. Where the English name carries wordplay or alliteration
  ("Bubble Bay," "Rainbow Ridge"), the translation note (§10.14) explains the
  *intent* so a translator can reach for a local equivalent opportunistically
  — but meaning always wins over preserving the alliteration if the two
  conflict. No chapter's alliteration is load-bearing for comprehension.

This resolves Round-1 LOC-8 exactly as recommended there, now made binding.

### §10.6 Bubble grammar, emotes and pictograms

Per C12: portrait + emote + 1–2 pictograms + optional text ≤ 8 words (en).
Text is a reading bonus; the emote + pictograms alone must carry the beat.

**Emotes** (shown on the speaker's portrait; a closed enum, art-owned per §9,
named here so dialogue authoring and translation QA can reference them):
`happy`, `sleepy`, `worriedMild`, `determined`, `stern`, `warmBlush`,
`cheering`. Seven total — enough to cover every line in §10.9/§10.10 without
inventing a new one per chapter.

**Emote → visual table (M27, fix round).** §9 renders portraits
procedurally from the `chars.ts` rig (`src/game/duel/chars.ts`) with an
`emote` parameter; these are the brow/eye/mouth/pose defaults it builds
against. A Step-3 painted `portrait` art slot (§9) follows the same table.

| Emote | Brow | Eye | Mouth | Pose |
|---|---|---|---|---|
| `happy` | relaxed, slight upward arc | wide, both catch-lights | open smile, gentle upward curve | head level, ears forward |
| `sleepy` | flat, slightly lowered | half-closed, lower lid raised ~40% | small closed "o", relaxed | head tilted down ~10°, ears drooped |
| `worriedMild` | inner brow raised slightly | wide, inner corners lifted | small flat line, corners very slightly down | head tilted ~10°, ears back halfway |
| `determined` | angled inward-down, slight furrow | narrowed ~20%, forward gaze | firm closed line, corners level | head raised, chest forward, ears up |
| `stern` | angled down, tighter furrow | narrowed ~35%, direct gaze | flat line, corners down slightly | head level, ears back, weight forward |
| `warmBlush` | relaxed, soft arc | soft and wide, extra catch-light + blush dots at ~60% opacity | gentle open smile | head tilted slightly toward the other speaker, ears forward |
| `cheering` | high arc, raised | wide open, upward-crescent shape | open "o" grin, both corners up | head up, ears up and forward, slight bounce pose |

**Pictograms** (shown beside/inside the bubble; extends the existing
44-glyph set from the `game-ui-icon-set` skill where a glyph already exists,
new glyphs flagged `[new]` for §9 to draw): forest, `zzz` *(existing sleepy
glyph)*, crescent-moon `[new]`, sparkle *(existing)*, heart *(existing)*,
leaf `[new]`, thorn `[new]`, wave `[new]`, musical-note `[new]`,
musical-note-crossed `[new]`, sun *(existing)*, cloud `[new]`, lightning-bolt
*(existing, rune glyph reused)*, wing `[new]`, crossed-runes/"duel"
*(existing CAST-adjacent glyph)*, star *(existing)*, dust-cloud `[new]`,
cheer/pompom `[new]`, calm-wave *(reuse wave)*, stern-face *(reuse via
emote, not a separate pictogram)*. **18 pictograms, 11 of them new** — small
enough for one sitting with §9, and every pictogram in this list is used at
least once in §10.9's actual script, so none are speculative.

**Advance rule (ratified, C12):** 600 ms minimum dwell, tap anywhere to
advance, skippable after the first view of that bubble. Placeholder inside a
bubble's text is always a bare transliterated proper noun (`{name}`), never a
case-inflected common noun — this is deliberate: §10.7's data format only
ever interpolates identifiers that read the same, ungendered and
uninflected, in every one of the 21 locales, which is what keeps §10.9's
lines safe to translate mechanically instead of needing per-locale grammar
rules (Round-1 LOC-22).

**No-distress rule (C12):** every bubble that names a problem states or
implies its own reassurance in the same bubble. §10.9 shows the pattern
(e.g. "Aww, {name} looks a little dusty" is mild, not alarming, and is
always followed within the same exchange by a resolving line — never left
hanging across a scene boundary, an ad break, or a page-turn).

### §10.7 Speaker and dialogue data format

Translatable text lives in `src/i18n/locales/*.ts` under `story.*`
(§10.9/§10.20's key schema). Speaker id, emote, pictograms, and the babble
`beats`/`tone` fields (§10.11) are **not translatable** and must never sit
inside a translated string — they live in one new, non-localized data file,
**new file** `src/game/duel/story.ts`, in the same "rules as data" idiom as
`config.ts`'s `SPELLS`/`FOES` tables (§4/§6 already own that convention; this
chapter only asks that dialogue follow it).

Field list per bubble (a plain object, one per `story.*` leaf key):

| Field | Type | Notes |
|---|---|---|
| `key` | string | the i18n key, `story.c{n}.n{m}.b{k}` (§10.20). |
| `speaker` | enum: `duelist.*` id \| `'creature'` | `'creature'` resolves to the per-chapter filler name (§10.8) at render time. |
| `emote` | one of §10.6's 7 emote ids | |
| `pictos` | 1–2 ids from §10.6's 18 | |
| `beats` | integer 3–9 | fixed at authoring time from the **English** source; never recomputed from the displayed locale (§10.11). |
| `tone` | enum: `neutral` \| `ask` \| `excite` | fixed at authoring time from the English source's punctuation; drives the babble contour, not re-parsed per locale. |

Node linkage (which bubbles play at which node, and in what order) is a
second small table keyed by `nodeId` (§4 owns `nodeId`'s shape per F21/C5);
this chapter only fixes that dialogue never blocks the gameplay bracket
(§7's ratified position: dialogue, map, unbox and wardrobe are outside
`syncGameplayLifecycle`, §10.22).

### §10.8 Templated standard-node beats per biome

Per C12 ("standard-node dialogue is templated per biome") and the volume
math in §10.20: writing 40 standard nodes individually would cost roughly
ten times what templating costs, for content that is explicitly a lower
narrative priority than the chapter openers and bosses. Four shared
templates cover nodes 2–4 of every chapter; only the filler creature name
changes per chapter, and it is a **transliterated proper noun** (§10.5),
never a translated common noun, so no grammar-agreement risk (§10.6).

| Template key | Node slot | Bubbles | English (≤ 8 words each) | Pictos |
|---|---|---|---|---|
| `story.tmpl.curious` | node 2 | 1 | "{name} peeks out, curious!" | sparkle |
| `story.tmpl.dusty` | node 3, b1 | — | "Aww, {name} looks a little dusty." | dust-cloud |
| `story.tmpl.cheerUp` | node 3, b2 | — | "Let's cheer {name} up together!" | heart |
| `story.tmpl.almost` | node 4 | 1 | "Almost there — {name} is cheering for you!" | cheer/pompom |

**Per-chapter filler names** (used only as the `{name}` value, not new i18n
keys — they are plain data, resolved the same way a speaker id is):

| Ch | Filler creature | Ch | Filler creature |
|---|---|---|---|
| 1 | Twig (a sprite) | 6 | Rio (a rainbow finch) |
| 2 | Shelly (a sea unicorn) | 7 | Dune (a sand fox) |
| 3 | Puff (a baby pegasus) | 8 | Frosty (a snow hare) |
| 4 | Glint (a cave critter) | 9 | Wisp (a firefly) |
| 5 | Blink (a mirror moth) | 10 | Sprig (returning from ch1, at the Festival) |

These ten names are flavour data only, never shown as a dueling opponent's
HP-bar label, and never get their own `duelist.*` key — they are cheap
precisely because they are not part of the localized string surface at all.

### §10.9 Full English script — chapters 1–3 (the S3 content)

All lines obey §10.6 (≤ 8 words, no unresolved distress) and use only the
emotes/pictograms from §10.6. `b2` in every opener is Umbra's cameo (§10.4).
Standard nodes 2–4 use §10.8's templates verbatim (not repeated per chapter
below) with the chapter's filler name substituted.

**Naming rule, checked for consistency (fix round item 6).** A **reused**
Guardian (Zephyr ch3, Terra ch4, Prism ch6, Ember ch7, Glace ch8 — per
§10.3's binding table) may be named by Aurora in the chapter's *opener*,
because Aurora already knows her from the shipped ladder. A **new** Guardian
(Briar, Pearl, Echo, Nova) is never named before the boss reveal in `b1` of
node 5. Chapter 3 below follows this exactly: Zephyr is named once, in the
opener's `b3`, and consistently as speaker `zephyr` in every node-5 bubble —
checked against §10.3's table, no change needed.

**Chapter 1 — Whispering Woods**

| Node | Bubble | Speaker | Emote | Pictos | English |
|---|---|---|---|---|---|
| 1 (opener) | b1 | aurora | determined | forest, zzz | "The Whispering Woods have gone quiet." |
| 1 | b2 | umbra | sleepy | crescent-moon | "Shh... let them sleep with me." |
| 1 | b3 | aurora | determined | sparkle | "Not today, Umbra! Let's wake them up!" |
| 2–4 | — | — | — | — | *(templates, filler "Twig")* |
| 5 (boss) | b1 | briar | stern | thorn | "Who wakes my woods? Go away!" |
| 5 | b2 | aurora | worriedMild | heart | "I just want to help you, Briar!" |
| 5 | b3 | briar | stern | crossed-runes | "Prove it, little unicorn. Duel me!" |
| 5 (thank-you) | b1 | briar | happy | sun | "Oh! The woods feel warm again." |
| 5 | b2 | briar | warmBlush | heart | "Thank you, Aurora. Come back anytime!" |

**Chapter 2 — Bubble Bay**

| Node | Bubble | Speaker | Emote | Pictos | English |
|---|---|---|---|---|---|
| 1 | b1 | aurora | worriedMild | wave, musical-note-crossed | "Bubble Bay has lost its song." |
| 1 | b2 | umbra | sleepy | wave | "Quiet is cozy too, don't you think?" |
| 1 | b3 | aurora | determined | sparkle | "Every voice deserves to be heard!" |
| 2–4 | — | — | — | — | *(templates, filler "Shelly")* |
| 5 | b1 | pearl | stern | wave | "Who dares ripple my calm waters?" |
| 5 | b2 | aurora | happy | musical-note, heart | "I'm here to bring the songs back!" |
| 5 | b3 | pearl | stern | crossed-runes | "Then sing your strength to me. Duel!" |
| 5 (thank-you) | b1 | pearl | happy | sun, wave | "The tide feels light and bright!" |
| 5 | b2 | pearl | warmBlush | heart | "Thank you, Aurora. Swim by soon!" |

**Chapter 3 — Cloud Kingdom**

| Node | Bubble | Speaker | Emote | Pictos | English |
|---|---|---|---|---|---|
| 1 | b1 | aurora | worriedMild | cloud, lightning-bolt | "The storm won't let the pegasi fly." |
| 1 | b2 | umbra | sleepy | cloud | "Storms make good napping weather, hmm?" |
| 1 | b3 | aurora | determined | sparkle, cloud | "Let's clear the sky together, Zephyr!" |
| 2–4 | — | — | — | — | *(templates, filler "Puff")* |
| 5 | b1 | zephyr | stern | lightning-bolt | "Who dares fly through MY storm?" |
| 5 | b2 | aurora | happy | wing, heart | "I want the pegasi to soar again!" |
| 5 | b3 | zephyr | stern | crossed-runes | "Prove your spark. Duel me now!" |
| 5 (thank-you) | b1 | zephyr | happy | sun, cloud | "The sky feels calm and clear!" |
| 5 | b2 | zephyr | warmBlush | wing, heart | "Thank you, Aurora. Fly with us soon!" |

### §10.10 Outline — chapters 4–10

Structure only (opener/boss/thank-you beats), full script deferred to `[S4]`
drafting once §5/§6 finalise each chapter's mechanic so bubbles can name the
right thing. Every chapter still follows §10.9's pattern: opener b1
problem / b2 Umbra cameo / b3 resolve; boss b1 challenge / b2 Aurora's
reason / b3 duel invite; thank-you b1 relief / b2 gratitude.

| Ch | Opener beat | Boss beat (Guardian) | Thank-you beat |
|---|---|---|---|
| 4 | The caves have gone dark and silent; Umbra finds the quiet "restful." | Terra guards her shattered crystals, gruffly. | The caves glow again; Terra warms to Aurora. |
| 5 | The mountains show only false reflections; Umbra likes not being seen clearly. | Echo can't tell which version of herself is real. | Echo settles on being herself; grateful, a little dizzy. |
| 6 | The bridge's colours are fading; Umbra finds grey "restful," almost sad. | Prism, dimmed, is defensive about her lost colours. | Prism blazes back to full rainbow, delighted. |
| 7 | Time is stuck in the sandfalls; Umbra admits she likes when nothing changes. | Ember, weary, has been holding the hourglass alone. | The sands flow again; Ember is relieved to rest. |
| 8 | The auroras are frozen in ice; Umbra is quieter than usual here. | Glace, isolated, keeps everyone at a cool distance. | The sky auroras dance free; Glace allows a small smile. |
| 9 | The stars have gone out; Umbra wonders aloud if anyone would miss a light going dark. | Nova, dim and hopeful, doubts she can shine again. | The stars reignite; Nova shines, thanking Aurora softly. |
| 10 | The Festival is being set up in Umbra's honour; Umbra, defensive, insists she doesn't need one. **(no filler-creature templates this chapter — nodes 2–4 use returning-friend cameos instead of new creatures, at §10.20's cost, since every earlier Guardian/creature returns for the Festival lead-up).** | Umbra, cornered and hurt, fights to be left alone — not out of malice. | **4-bubble finale** (double length, one-time exception, §10.20): the reveal lands, Umbra is disbelieving, then accepts the invite; the Festival opens with every earlier cast member present. Credits/finale copy is §10.19. |

### §10.11 The babble voice spec (`src/game/duel/audio.ts`)

Per D6 (babble only) and Round-1 LOC-12/13, ratified. No recorded VO in any
locale; a new "chatter" cue extends the existing `V()` voice primitive
(`audio.ts` — the one function every sound in the game, cues and piano
alike, is already built from). It never reads a bubble's translated
characters — only the two fixed, English-authored fields from §10.7
(`beats`, `tone`) — so the same code drives all 21 locales with zero
per-locale audio work, and it inherits the shared `AudioContext`, the
one-shot registry, and the pause/ad-mute gate automatically, satisfying the
Hard Reality ad-audio-mute rule for free.

- **New export**, e.g. `chatter(speaker: DuelistId, beats: number, tone: 'neutral'|'ask'|'excite')`, in `audio.ts` beside the existing `CUES` table.
- One `V(TRI or SIN, f, …)` blip per beat (3–9 blips per bubble, from §10.7's fixed field — **not** derived from the on-screen string length, so a German or Thai wrap of the same bubble plays the identical rhythm as the English one).
- **Per-speaker pitch offset**, reusing the existing `nf()`/`DEG` scale-degree table (`audio.ts`): Aurora brightest/highest, Umbra lowest/slowest, each Guardian a fixed offset assigned once in `story.ts` (§10.7) — a small, closed, numeric table, not per-locale.
- `tone: 'ask'` bends the last blip's pitch up; `'excite'` raises gain and shortens inter-blip gaps; `'neutral'` is flat.
- **Dedicated voice budget:** a new constant `CHATTER_MAXV = 4` (separate from the existing gameplay `MAXV = 40`). This is a formality, not a real contention risk: dialogue plays outside the gameplay bracket (§7's ratified position, §10.22), so chatter and combat SFX never compete for a voice slot in practice.
- Blip duration: 90–140 ms, drawn from the existing per-note jitter pattern `pia()` already uses, so babble has the same "handmade" micro-variation as the piano line.
- **Non-goal:** no phoneme mapping, no per-language IPA table, no cloud TTS (forbidden on Poki/Playables regardless — external requests). The babble is deliberately abstract, the same register as an Animal-Crossing-style chatter, not an attempt at speech.

### §10.12 Spell-naming grammar per locale family

Per C15 (ratified): names compose from `{element adjective}` + `{form noun
by count/kind}`, never one key per combo. §6 owns the generator's code path
(`comboKey`, the golden-22 migration); this chapter owns the **strings** the
generator assembles.

- **Element adjectives** are the existing `rune.*` keys (§10.13) — reused
  directly, zero duplicate namespace. 12 total after §10.13's 8 additions.
- **Form-noun templates**, new namespace `spellForm.*`, 5 `SpellKind`
  values (`config.ts`: 0 bolt, 1 field, 2 barrier, 3 heavy, 4 push) × 3
  count-tiers (1/2/3 runes) = **15 leaf keys total**, e.g.
  `spellForm.k0.c1` = "{A} BOLT", `spellForm.k0.c3` = "{A} {B} {C} BURST".
  Not every kind/count pairing may be exercised by the final matrix; unused
  ones cost nothing extra since the 15 are authored once, up front.
- **Word-order varies by locale family, not by locale.** Assign every locale
  to one of three order-templates rather than writing 21 bespoke grammar
  rules (a deliberate simplification — revisit a specific locale only if a
  native reviewer flags it reading badly, per §10.18's QA pass):
  1. **Adjective-first** (en, de, es, fr, it, nl, pt, pl, ru, uk, tr, id, vi, uz, kk — Latin/Cyrillic, adjective-noun default): `"{adj} {noun}"`.
  2. **Compound, no spaces** (zh, ja, ko, th — reuse the compounding these locales' translators already apply to the shipped 22 spell names, e.g. `ja.ts` "炎の矢"): `"{adj}{linker?}{noun}"`, linker is a per-locale glossary entry (§10.14), often empty.
  3. **Construct/possessive order** (ar, hi — noun-first constructions read more natural for a compound epithet in these scripts): `"{noun} {adj}"`.
- The 22 shipped names stay as golden overrides (§6's migration map); the 2
  new hand-authored Signature Spell names (§10.13) are also fixed overrides,
  never run through the generator.

### §10.13 Rune, element, gift, tool, place and currency names

**A — new `rune.*` keys (element/tactic display names, 8 new):**
`nature`, `water`, `lightning`, `illusion`, `rainbow`, `time`, `moon`,
`love`. (Crystal and Frost do **not** get a `rune.*` entry — they are
Signature Spells, not runes; see below.)

**B — Signature Spell names, new `spell.*` keys (2 new, hand-authored, never
generated):**

| Chapter | Tactic | Key | English |
|---|---|---|---|
| 4 | Crystal (reflect shield) | `spell.crystalWard` | CRYSTAL WARD |
| 8 | Frost (freeze & discard) | `spell.frostLock` | FROST LOCK |

*(Deliberately avoid "Prism"-anything for ch4, since Prism is chapter 6's
Guardian and `prismNova` already exists in the shipped matrix; avoid
"Frost Gale," which also already exists.)*

*(M9, fix round: confirmed — `spell.frostLock` / "FROST LOCK" is the
canonical ch-8 Signature Spell name, unchanged from this chapter's first
draft. §6's earlier "Frost Seal" is renamed to match; no change needed on
this side.)*

**C — Gift names, new namespace `gift.*` (10 keys — the GDD's own reward
list, formalised; §8 owns the wardrobe-slot mechanics, this is only the
display name):**

| Ch | Key | English |
|---|---|---|
| 1 | `gift.flowerCrown` | Flower Crown |
| 2 | `gift.seashellNecklace` | Seashell Necklace |
| 3 | `gift.pegasusWings` | Fluffy Pegasus Wings |
| 4 | `gift.hoofTrailVfx` | Sparkly Hoof-trail |
| 5 | `gift.umbraSkin` | Umbra Look *(a palette skin, C31 — not a side-swap)* |
| 6 | `gift.colorPicker` | Mane Color Palette |
| 7 | `gift.pastelTheme` | Pastel Dream Theme |
| 8 | `gift.winterScarf` | Cozy Winter Scarf |
| 9 | `gift.petStar` | Pet Star |
| 10 | `gift.versusMode` | Friendship Duo *(the 2P-versus unlock's in-fiction name; the feature itself is §3/§4's, S5)* |

**D — Tool names, new namespace `tool.*` (3 keys, per C10's ruling text,
formalised as i18n keys — not renamed):**
`tool.stardustBrush` = "Stardust Brush" *(from ch1, [S2])*,
`tool.magicEraser` = "Magic Eraser" *(standard from the ch3 boss onward, [S3])*,
`tool.sunbeam` = "Sunbeam" *(boss chests, from ch1's boss onward, [S2] — corrected
from an initial S3 assumption once the ch1 boss-chest timing was checked
against C5's "node 5 of every chapter is its boss")*.

**E — Place names, new namespace `place.*` (1 key, [S2]):**
`place.twinGift` = "Twin Gift" *(kept verbatim — §11 already uses this term
for the ad-cadence contract. Per D3, final, 2026-09-18, the Twin Gift now
pays a permanent cosmetic bloom, not a currency payout, win-only; see
§10.13.I for the new bloom-mechanic key)*.

*(Removed per D3: `place.runeShrine` = "Rune Shrine", `place.sparkleJar` =
"Sparkle Jar" (the coin jar), and the entire `currency.*` namespace —
`currency.sparkles` = "Sparkles". D3 removes the currency, the coin jar and
the Rune Shrine entirely from the story build — no coins, no coin jar, no
Rune Shrine, no element ranks, no `winCoins`, no DuelResult shop panel — and
supersedes the coin half of F25 ("×2 coins" on the ads pass). The §8-title
mismatch this note used to guard against is moot now that `place.runeShrine`
no longer exists; §10.22's §8 dependency line is updated to match.)*

**F — Existing keys re-worded, not new (2 keys × 21 locales = 42 edited
strings, tracked separately from the new-key count in §10.20):**
`result.defeated` and `pop.defeated` (§10.19). *(`result.coins` — "Coins:
{n}" — is no longer re-worded to a Sparkles-branded form; per D3 it is
deleted outright, since the story build shows no currency of any kind on
the result screen. Removed per D3; not counted as an edited string here
because it is a deletion, not a re-word — see §10.19.)*

**G — M24 keys (fix round addition, [S2]): the Twin Gift hold label, the
Leave-duel confirm dialog, and the back-to-map aria-label (7 new keys, all
21 locales, counted in §10.20's S2 row):**

| Key | English |
|---|---|
| `twinGift.holdLabel` | Hold to Bloom |
| `options.leaveDuel.label` | Leave Duel |
| `options.leaveDuel.title` | Leave this duel? |
| `options.leaveDuel.body` | Your progress in this duel won't be saved. |
| `options.leaveDuel.confirm` | Leave |
| `options.leaveDuel.cancel` | Stay |
| `a11y.backToMap` | Back to map |

**Re-worded per D3 (final, 2026-09-18):** `twinGift.holdLabel` was "Hold to
Open," authored when the Twin Gift paid coins; it now reads "Hold to Bloom"
to match the permanent cosmetic-bloom reward (§10.13.E/I) instead of a
currency payout. The key itself is unchanged and still holds M24's slot in
this table and in §10.20's S2 count — only the English string's *meaning*
changed. All 21 locale files (`src/i18n/locales/*.ts`) need a matching
translation update for this key outside this pass; this markdown chapter
only fixes the English source.

§3 references these keys directly instead of a literal string, per M24.
`a11y.*` is a new top-level namespace (existing aria strings otherwise live
beside their feature, e.g. `hud.castAria`) — flagged for §4 in case it wants
this folded into an existing namespace instead; kept as `a11y.backToMap`
here because that is the exact key name M24 specifies.

**H — Second fix-round addendum, from §2's own fix round (8 new keys):**

- **`options.traceAssist`** = "Show rune guides" **[S2]**. §2.5 (M27) specs
  a persistent Options toggle that re-enables trace-assist after the
  automatic first-3-casts window. **Correction, cross-chapter:** the
  coordinator's addendum named this `options.runeGuides`; §2.5's own text
  names it `options.general.traceAssist`. Neither is used verbatim. The
  existing shipped `en.ts` already has a **flat string** `options.general`
  = "General" (a tab label) — `options.general.traceAssist` would require
  `general` to be simultaneously a string and an object in the same file,
  which is not valid. Flattened to **`options.traceAssist`**, sibling to
  `options.haptics`/`options.music`/etc., which is also the existing
  convention (none of the current `options.*` toggles nest under a
  section object). **§4, which "wires" this per §2.5, should read
  `options.traceAssist`, not `options.general.traceAssist`.**
- **`options.parents.*`** (7 new keys, **[S3]** — per §2.7, this ships with
  the first portal-ready release candidate, not the ch1 shell), the exact
  field set §2.7 specifies for the Options "For Parents" panel, written for
  the adult reader (§2.7's own rule: full sentences are fine here, this
  screen is exempt from the early-reader cap):

  | Key | English |
  |---|---|
  | `options.parents.title` | For Parents |
  | `options.parents.aboutBody` | Auroras Magic has no chat, no strangers, and no location. No account is needed to play. |
  | `options.parents.adsBody` | This game shows video ads to stay free. Some ads can't be skipped; watching a bonus-reward ad is always optional. |
  | `options.parents.adsNonPersonalisedNote` | Ads in this build are shown without personalisation. |
  | `options.parents.purchasesBody` | There are no in-app purchases. |
  | `options.parents.privacyBody` | We store a save file on this device or the portal's cloud save. No personal information is collected. |
  | `options.parents.privacyLinkLabel` | Full privacy policy |

  `adsNonPersonalisedNote` ships in all 21 locales regardless of build flag
  — it is a string that exists everywhere, only *rendered* conditionally on
  `VITE_CHILD_DIRECTED` (§2.9.6), never a build-conditional translation.
  `privacyLinkLabel` likewise exists in all 21 locales; §2.7 only omits
  *rendering* it on Poki/Playgama builds (rule 19), not the key.

**I — D3 bloom-mechanic key (this ruling, final, 2026-09-18, 1 new key,
[S2]):**

| Key | English |
|---|---|
| `bloom.claimedToast` | This place is in full bloom! |

Shown once, right after the player claims a Twin Gift, confirming the bloom
is permanent — cosmetic only, no power, no progress (§10.13.E). Counted in
§10.20's S2 `other` column alongside the M24/§2 keys above. Only the English
source is authored here; all 21 locale files need this key added outside
this pass.

### §10.14 Glossary of fixed terms

One glossary, shipped to every translator/MT pass before any batch starts
(Round-1 LOC-18, now mandatory). Columns: English, lock policy (§10.5),
one-line intent note for anything with wordplay.

| Term | Policy | Note |
|---|---|---|
| Aurora, Umbra, Ember, Zephyr, Glace, Terra, Prism, Briar, Pearl, Echo, Nova | transliterate | proper names; adapt sound/script only |
| Whispering Woods, Bubble Bay, Cloud Kingdom, Crystal Caves, Mirror Mountains, Rainbow Ridge, Sunken Sands, Twilight Tundra, Starlight Summit, Friendship Festival | translate | alliteration is a bonus, not required |
| Stardust Brush, Magic Eraser, Sunbeam | translate | describes the tool's feel, not a brand |
| Twin Gift | translate | plain compound noun, kid-legible; per D3, now the bloom-reward offer, not a currency payout *(Rune Shrine, Sparkle Jar, Sparkles removed per D3)* |
| Dream Dust | translate | the pity-timer's diegetic name (§6/§7 own the mechanic; this is its only display name) |
| **Wardrobe Kiosk** | translate | **M28, fix round:** kept as the in-fiction name of the wardrobe tent (§8/C17's diorama). Round-2 drafting had drifted toward the descriptive "the wardrobe tent"; "Wardrobe Kiosk" is the GDD's own name. It is a design/glossary name only: the tent carries no visible label (zero-UI, C21), so no i18n key is needed. Translators meet it only if it appears in dialogue. Noted here so the drift doesn't recur. |
| Crystal Ward, Frost Lock | translate as a unit | Signature Spell names; do not run through the §10.12 generator |
| combo, Signature Spell | **do not surface** | internal/mechanic vocabulary; nothing here is player-facing on its own *(rank, coins (internal) removed per D3 — no currency or rank system exists in the story build, so there is no "Sparkles/Rune Shrine language" left to borrow either)* |
| linker (per-locale, §10.12 family 2) | locale-specific glossary addendum | e.g. Japanese "の", Korean equivalent; empty for Chinese/Thai unless a reviewer adds one |

### §10.15 The `.story-text` style spec

Per C12/F22 (`.ink-text` is chrome-only and `white-space: nowrap` — cannot
render dialogue). New class, new file addition to
`src/assets/css/duel.sass`:

| Property | Value | Why |
|---|---|---|
| `white-space` | `normal` | the one property `.ink-text` gets wrong for this use (F22) |
| `overflow-wrap` | `anywhere` | CJK has no spaces to break on |
| `word-break` | `normal` | not `break-all` — `break-all` mangles Latin scripts mid-word |
| `line-break` | `normal` | lets the browser's per-script segmentation (incl. Thai) do its job instead of fighting it |
| `line-height` | `1.3` | paragraph legibility; `.ink-text`'s `1` is for single shouted words only |
| `font-weight` | `600` | lighter than `.ink-text`'s `900` — a paragraph in 900-weight ink type is not legible at bubble size |
| `-webkit-text-stroke` | `0.06em` (down from `.ink-text`'s `0.28em`), or `0` | a full ink outline swallows CJK/Thai/Devanagari strokes at paragraph size; a thin stroke keeps the family resemblance without the swallow. **[S2] spike:** verify at 30px stage units in `zh`/`th` before sign-off; fall back to `0` if it still eats detail |
| `max-width` | `460` stage units | ~2–3 lines at the sizes below |
| `font-size` | `30` stage units | bubble body text; portrait/name label may use a larger, still-≤900-weight size, §3's call |
| Overflow policy | **never truncate** | if a translation needs a 3rd line, it gets one — clipping defeats the pictogram-first safety net (§10.6) |

### §10.16 Font plan — no external fonts

Confirmed against `index.html` and `src/assets/css/duel.sass`: the project
loads zero web fonts today (`.ink-text`'s stack is Arial/Helvetica/Roboto
plus named CJK/Thai/Devanagari **system** families only), and Poki/Playables
forbid external runtime requests outright (Hard Reality). `.story-text`
reuses that exact system-font philosophy, changing only the fix below.

- **Reuse `.ink-text`'s stack verbatim** for `.story-text`: `Arial,
  'Helvetica Neue', Helvetica, Roboto, 'PingFang SC', 'Hiragino Sans',
  'Microsoft YaHei', 'Noto Sans CJK SC', 'Apple SD Gothic Neo', 'Malgun
  Gothic', 'Noto Sans Thai', 'Leelawadee UI', 'Noto Sans Devanagari',
  'Nirmala UI', sans-serif`.
- **Fix the one gap this chapter's Round-1 pass found:** no Arabic-capable
  family is named (relies on uncontrolled OS glyph substitution). Add
  `'Segoe UI', 'Geeza Pro', 'Noto Sans Arabic'` before the generic
  `sans-serif`, in **both** `.ink-text` and `.story-text` — all three are
  system fonts already present on the platforms that matter (Windows, iOS,
  Android/ChromeOS) and none is an external request.
- **Non-goal:** no bundled/inlined CJK, Thai, Devanagari, Arabic or Kazakh
  webfont, ever, on any build. `art-style.md` §7 already states this rule
  for display type; this chapter extends it to the new body style.
- **[S2] QA gate:** eyeball `.story-text` wrapped at real bubble width in
  `zh`, `ja`, `ko`, `th`, `hi`, `ar` before chapter 1 ships — do not assume
  the stack "just works" wrapped, since it was only ever proven single-line
  (Round-1 LOC-15).

### §10.17 RTL bubbles

Per C19 (map stays LTR; text inside flows RTL), extending the existing
`:lang(ar) .ink-text { unicode-bidi: plaintext }` pattern
(`duel.sass`) to `.story-text`:

- `.story-text` gets the same `:lang(ar)` `unicode-bidi: plaintext` rule,
  and the same thinned stroke-width special case `.ink-text` already has
  (§10.15's `0.06em` base is already thin; no further Arabic-specific
  adjustment needed there).
- **Portrait position does not mirror.** The speaker's on-screen side is
  spatial canon (Aurora always left, matching the duel's own
  `dir="ltr"`-pinned subtree per `src/i18n/index.ts`); only the *text inside
  the bubble* flows RTL. The bubble's tail/pointer graphic likewise does not
  flip — it keeps pointing at the fixed-position speaker.
- **The classic embedded-LTR-run bidi trap does not arise here**, precisely
  *because* §10.5 rules that every proper noun transliterates. A `{name}`
  placeholder inside an Arabic sentence resolves to Arabic-script letters,
  not a stray Latin run — so there is no mixed-script reordering hazard to
  test for in the way a literal untranslated brand name would create.
- **[S2] QA gate:** still render the first Arabic dialogue bubble as an
  explicit check (not inferred from the single-line rule) — verify
  wrapping + bidi + the thin outline together, once, before `ar`'s `story.*`
  batch ships.

### §10.18 Translation process and QA

Per Round-1 LOC-19 (the parity test proves key SHAPE, not quality) and the
open budget question (D-item, moderator's §13): this process works at any
budget level, front-loading the cheapest, highest-value checks first.

1. **Glossary first** (§10.14) — locked before any batch, in every language.
2. **Machine-translate all 21 locales** for a new batch (fast, ~$0 marginal
   cost) as the first-pass draft. `[S2]` onward, every stage.
3. **Extend `tests/i18nParity.test.ts`** with two additive, non-blocking
   checks (Round-1 LOC-19, `[S2]`):
   - flag any non-English value byte-identical to the English value for
     `story.*`/`gift.*`/etc. keys longer than a few characters (an
     un-translated MT drop);
   - a soft length-ratio warning (not a CI failure) for `story.*` values
     exceeding English length by more than 2×, to catch runaway MT
     verbosity before it hits `.story-text`'s `max-width` (§10.15).
   These stay **warnings**, not hard failures — an MT-first interim state is
   the deliberate default (D-item), and a blocking test would just get
   disabled.
4. **One native-tone pass, scoped to the highest-risk 84 `story.*` keys plus
   the glossary**, not the whole file. The mechanical namespaces
   (`gift.*`, `tool.*`, `place.*`, `spellForm.*`) are short, literal, and
   low-risk enough that MT + the parity checks above are sufficient without
   a human pass, consistent with how the existing 112-key surface already
   ships.
5. **Batch by stage** (§10.20's table), never as one 162-key drop — a
   translator or reviewer working through 15–46 keys at a time can hold
   context; 162 at once cannot be reviewed meaningfully in one sitting.
   *(Fix round: corrected from the first draft's stale "24–81" range, which
   referred to an earlier, uncombined S4 total rather than the table's own
   per-batch sizes; updated again for the M24/§2 addenda.)*

### §10.19 Win and loss copy

Per C27 ("DEFEATED" retired in all 21 locales): edit the **values** of two
existing keys rather than adding new ones (§10.13.F).

| Key | Old (shipped) | New (story build) |
|---|---|---|
| `result.defeated` | "DEFEATED" | "Zzz... try again?" |
| `pop.defeated` | "DEFEATED" | "ZZZ…" |

*(`result.coins` — "Coins: {n}" — is removed per D3, not re-worded to a
Sparkles-branded form: the story build has no currency, so nothing plays
that key's role on the result screen, and there is no DuelResult shop panel
to feed. D3 also confirms there is no rewarded consolation offer on a loss —
the Twin Gift bloom reward in §10.13.E/I is win-only, offered on the map
beside the restored sector, not on this screen.)*

`result.victory`/`pop.victory` ("VICTORY!"/"VICTORY") stay as-is — the
softening only ever applied to the player's own loss state, never to a win,
per C27's scope. `result.tapToDuel` ("Tap to duel") is reused verbatim as
the retry prompt after a loss — it was already gentle, so no new key is
needed there (reuse-before-duplicate, the same principle §10.13 applies
throughout).

Chapter 10's finale gets its own short capstone, new namespace
`finale.*` (2 keys, counted in §10.20's ch10 total): `finale.title` =
"Friendship Festival" *(reuses `chapter.c10`, so this may fold into that key
instead — §3's call once the finale screen layout is fixed)*, `finale.line`
= "Umbra isn't lonely anymore." No credits scroll with per-contributor
bylines is built (`[later]` — a solo-dev credit line, if any, is a single
short string the owner supplies directly, not a localisation system).

### §10.20 New-key counts per stage

English leaf keys only; × 21 locales for the translated-string total. Two
existing keys are **re-worded**, not counted as new (§10.13.F, §10.19) —
tracked in the footer; a third (`result.coins`) is **deleted outright**, not
re-worded (§10.13.F/§10.19), and is likewise not counted as new. **Fix round
(M24/M28):** the `finale.*` pair is now folded into the S4d row instead of
sitting outside the table, and M24's 7 keys (§10.13.G) are added under a new
`other` column in S2. **Second fix-round addendum (§10.13.H):**
`options.traceAssist` (S2) and the 7-key `options.parents.*` panel (S3, per
§2.7) are added to the same column. **D3 recount (final, 2026-09-18):**
removes `place.runeShrine`, `place.sparkleJar` and the whole `currency.*`
namespace — 3 keys cut from S2's `place.*`/`currency.*` column, leaving only
`place.twinGift` — and adds `bloom.claimedToast` (§10.13.I, 1 key, S2
`other` column). Net **−2** on the grand total, folded into the table below.

| Stage | `story.*` | `duelist.*` | `rune.*` | `spellForm.*` | `spell.*` | `gift.*` | `tool.*` | `chapter.*` | `place.*` *(`currency.*` retired, D3)* | `other` (M24/`finale.*`/§2/D3) | **New keys** |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **S2** (ch1 shell + shared systems) | 12 *(incl. the 4 shared templates)* | 2 | 1 | 15 | 0 | 1 | 2 | 1 | 1 *(D3: `place.runeShrine`, `place.sparkleJar`, `currency.sparkles` removed, −3; only `place.twinGift` remains)* | 11 *(7 M24 + `options.traceAssist` + `options.reducedMotion` §3.11 + `duel.almostRune` §5.12, the latter pulled forward from S1, + `bloom.claimedToast` §10.13.I per D3, +1)* | **46** |
| **S3** (ch2–3, release candidate) | 16 | 1 | 2 | 0 | 0 | 2 | 1 | 2 | 0 | 7 *(`options.parents.*`)* | **31** |
| **S4a** (ch4–5) | 16 | 1 | 1 | 0 | 1 | 2 | 0 | 2 | 0 | 0 | **23** |
| **S4b** (ch6–7) | 16 | 0 | 2 | 0 | 0 | 2 | 0 | 2 | 0 | 0 | **22** |
| **S4c** (ch8–9) | 16 | 1 | 1 | 0 | 1 | 2 | 0 | 2 | 0 | 0 | **23** |
| **S4d** (ch10, incl. the 4-bubble finale exception; `finale.*`'s 2 keys folded into `other`) | 10 | 0 | 1 | 0 | 0 | 1 | 0 | 1 | 0 | 2 | **15** |
| **Total** | 86 | 5 | 8 | 15 | 2 | 10 | 3 | 10 | 1 | 20 | **160** |

**160 new English leaf keys × 21 locales ≈ 3,360 new translated strings**
*(was 162/3,402 before D3; net −2 keys/−42 strings from the D3 recount:
−3 for `place.runeShrine`/`place.sparkleJar`/`currency.sparkles`, +1 for
`bloom.claimedToast`)*, plus **2 existing keys re-worded × 21 locales = 42
edited strings** (§10.13.F/§10.19, down from 3 keys/63 strings — `result.coins`
moved from "re-worded" to "deleted outright" per D3, so it no longer counts
as an edited string). For comparison, the shipped game has 112 leaf keys
today (≈2,352 strings) — dropping to 111 once `result.coins` is deleted —
which means this feature is still a larger addition than the entire existing
game's text, exactly why §10.18 batches it by stage rather than shipping it
as one drop.

This still lands close to — now somewhat above — Round 1's own
back-of-envelope estimate (~100–150 authored lines × 21 ≈ 2,100–3,150
strings), despite templating and the pictogram-first design cutting the
*authored dialogue* volume substantially (12 shared templates instead of 40
hand-written standard-node beats). The saving shows up in **authoring effort
and MT-quality-risk surface** — fewer freeform sentences to get wrong in 21
languages — not in raw key count, once names, gifts, tools, chapter titles,
the naming-grammar fragments, and the fix-round UI/options/parent-panel keys
(M24, §2) are all counted honestly.

**S5 (2P versus)** needs a small UI-label set (Player 1/2, a "turn sideways"
prompt, a ready state) — real user-facing text, but it is §3's screen to
design and therefore §3's count to give; not estimated here to avoid a
duplicate, possibly conflicting number (§10.22).
**S6 (painted art)** needs zero new keys.

### §10.21 Non-goals

- **No recorded voice-over**, in any locale (D6). The babble voice (§10.11)
  is the whole audio answer.
- **No three-tier age-branched copy** (C23). One early-reader deck; pictures
  carry the pre-reader case.
- **No per-node hand-authored standard dialogue.** Templated (§10.8) by
  design, on cost grounds.
- **No per-chapter standard-foe proper names.** One `duelist.shadow` label
  for all 40 standard nodes (§10.3).
- **No 21-bespoke-grammar spell-naming system.** Three locale-family
  templates (§10.12), revisited only on a specific, reported failure.
- **No relationship/affection meter for Umbra.** Her arc is linear and
  authored, identical for every player (§10.4).
- **No runtime translation calls of any kind** (cloud MT, TTS). Everything
  is baked into the locale files at build time, exactly like the shipped
  112 keys today; Poki/Playables forbid the alternative outright.
- **No credits scroll.** A single capstone line (§10.19), not a system.
- The old rank-shop strings (`result.rankBonus`, `result.buyRank`,
  `result.price`) are dead text in the story build — **confirmed removed
  per D3** (final, 2026-09-18: no element ranks, no `winCoins`, no
  DuelResult shop panel, no currency of any kind). Whether a non-story build
  path keeps them alive behind `RANK_SHOP_PANEL = false` (C4) remains
  **§4's call**, not this chapter's — flagged here only so nobody assumes
  they were forgotten.

### §10.22 Dependencies and assumptions on other chapters

Values this chapter assumed that another chapter owns — if any of these
change, the counts in §10.20 and the schema in §10.7 may need a re-pass:

- **§4 (Architect):** `nodeId`'s exact shape (assumed: separable from AI
  tier, per F21/C5) and the `story.ts` file's home/import boundaries
  (assumed: a sibling of `config.ts` in `src/game/duel/`). **Second
  fix-round note:** §4 wires the trace-assist Options toggle per §2.5's
  text against `options.general.traceAssist` — that path collides with the
  existing flat string `options.general` ("General") and is corrected here
  to **`options.traceAssist`** (§10.13.H). §4 and §2 should both read the
  flat form. §4 also wires `options.parents.*` (§10.13.H) into the Options
  modal per §2.7.
- **§5 (Gesture):** the 8 new rune ids' final assignment order (assumed:
  the `rune.*` keys in §10.13.A map 1:1 to whatever ids §5 picks, order not
  fixed by this chapter).
- **§6 (Combat):** each Guardian's actual weakness element/AI tier (assumed:
  thematic-fit only, not a balance claim, §10.2); the spell generator's code
  path consuming §10.12's string templates; the two Signature Spell recipes
  (assumed: named, not designed, here).
- **§7 (Analyst):** any different node-time/session numbers than C3's
  "Numbers every chapter must share" table would change nothing about the
  key counts, but would change §10.18's batch-review pacing.
- **§3 (UX):** `.story-text`'s exact bubble container, portrait slot, and
  the S5 UI-label set (assumed out of this chapter's count, §10.20). Also
  assumes §3 wires the M24 keys (`twinGift.holdLabel`,
  `options.leaveDuel.label/title/body/confirm/cancel`, `a11y.backToMap`,
  §10.13.G) in by key, not by a literal string, per M24's own instruction.
- **§8 (Cozy):** kept `place.twinGift` verbatim (§10.13.E) specifically to
  match §8's own chapter-title terminology — if §8 renames it, this
  chapter's glossary (§10.14) needs a matching edit. *(`place.runeShrine`
  removed per D3 — no Rune Shrine exists in the story build, so the
  matching §8 chapter-title dependency for that key no longer applies.)*
- **§9 (Tech artist):** the 11 `[new]` pictograms and 7 emotes (§10.6) are
  named, not drawn, here; and owns confirming the `.story-text` stroke-width
  spike (§10.15) against the real art.
- **§11 (Portal):** `place.twinGift`'s terminology is assumed shared with
  the ad-cadence contract (C8); the first-bubble-waits-for-first-load-ad
  rule (C30) is read as given and needs no new copy here.


---

## §11 Portals, ads & compliance

> Dissent (judgement, not fact, on C8/D8): I would have kept a soft per-session
> interstitial ceiling even though no portal *rule* requires one. F25's
> 240 s-then-121 s clock is fully rule-compliant and I do not dispute the
> owner's authority to set it — but at up to ~28 interstitials/hour (§11.3) it
> sits in tension with the D1 "all-ages cozy, zero pressure" pitch this very
> chapter builds the rest of its compliance posture on. Recorded, not
> re-litigated: D8 already routes this to the owner, and §11 below specs to
> F25/C8 exactly as ruled.

### §11.0 What this chapter owns, and what it doesn't

§11 owns the **portal contract**: what counts as gameplay for SDK purposes,
where ads and happy-moments are anchored in the new loop, what
`VITE_CHILD_DIRECTED` actually does (and cannot do), the money rules that keep
every build Poki-safe, the byte budgets every portal enforces, and the listing
answers that make those budgets and rules mean what they say. It does not own:
the FSM implementation (§4), the map/gift/wardrobe visuals (§8, §9), the
dialogue system (§10), or the boss/rune/chapter-restore trigger conditions
that feed §11.6 (§6). Where this chapter needs one of those, it names the
value it assumes and the § that owns it, per the round-2 mandate.

**Non-goals, explicit:**
- **No client-side TFCD/TFAT (or equivalent) SDK call is built.** Verified in
  §11.9: none of the six ad SDKs this game ships behind expose one to the
  embedded game. Building a call against a method that doesn't exist is not a
  deferred feature, it is a fiction — cut.
- **No parental-consent screen beyond the Twin Gift's 1.2 s hold.** C8 already
  answers KIDS' "grown-up gate" ask with the hold gesture. A real consent flow
  (a math question, a "hand the phone to a grown-up" screen) is a §2 call, not
  ready to spec until D1 resolves.
- **No per-portal remote content-rating API integration.** None of the six
  portals expose one to the client; the actual lever is the developer-console
  answer at submission time (§11.14), a business action, not code.
- **No currency of any kind, on any build, including under
  `VITE_CHILD_DIRECTED`.** D3 (2026-09-18) removes the story build's currency
  entirely — Poki's single-currency rule is now trivially satisfied (zero
  currencies, not one obeying it). Permanent, not staged — see §11.11.
- **No session-level ad cap beyond F25's time-only clock.** D8, owner's call;
  not re-argued here beyond the dissent above.

---

### §11.1 Files this chapter is written against

Read as of the owner's 2026-09-18 ads pass (F25), working tree, uncommitted:

- `src/use/useAdGate.ts` — reward gating, the rate limiter, the interstitial
  clock (`FIRST_INTERSTITIAL_AFTER_MS = 240_000`, `INTERSTITIAL_MIN_GAP_MS =
  121_000`, `canShowInterstitial`, `markInterstitialShown`).
- `src/views/GameScene.vue` — `maybeShowInterstitial`, `presentResult`,
  `onReward`, the QA chord wiring (`onQaChord`), the gameplay-bracket
  `isLiveGameplay` computed.
- `src/use/useQaAdTrigger.ts` — the 30-tap QA chord (`QA_AD_TAPS = 30`,
  `QA_AD_MAX_GAP_MS = 1500`).
- `src/use/ads/DevAdProvider.ts` — the `pnpm dev` "TEST AD" card
  (`INTERSTITIAL_MS = 2500`, `REWARDED_MS = 4000`), opt-out via
  `localStorage.am_dev_ads = 'off'`.
- `src/platforms/resolveAdProvider.ts` — provider priority order.
- `scripts/portal-qa.mjs` — the built-bundle proof harness; §11.15 extends it.
- `tools/pack/pack.mjs` — the release-gate + size-budget report; §11.13 reads
  its `BUDGETS` table verbatim.
- `src/use/useAds.ts`, `src/use/useAdGate.ts` unchanged pieces (audio-kill
  ordering, `awaitAdBounded`'s open/max caps) — not touched by F25, still load
  -bearing, referenced but not re-specified here.
- `src/use/useAnalytics.ts`, `src/game/duel/state.ts`, `src/keys.ts` — the
  save/telemetry surface §11.10/§11.12 build on.
- `src/use/analyticsSink.ts` — read for its header's own account of why an
  in-function guard failed against the obfuscator (I-6/M17b, §11.10); its
  existing Playgama alias-swap (`analyticsSink.stub.ts`, `vite.config.ts`)
  is the pattern §11.10's fix reuses.

---

### §11.2 The gameplay bracket, per scene

Ratifies C7, and — after M12/I-5 — corrects how it is driven and exactly
where the boundary sits. Two changes from the first draft:

- **Driven from the FSM's enter/exit hooks, not a `watch`.** §4's
  `gotoScene(next)` calls `syncGameplayLifecycle(isLive(next))` synchronously
  as part of the transition itself. This replaces `GameScene.vue`'s existing
  `watch(isLiveGameplay, syncGameplayLifecycle, { immediate: true })` — a
  reactive `watch` on a computed settles through Vue's own scheduler, which is
  exactly the kind of intermediate-value risk `useGameplayLifecycle.ts`'s own
  header already warns is monetization-fatal on Poki's 50 ms bad-event guard.
  A direct call from the transition function has no settling window at all.
- **The duel's live window ends the instant `S.phase` leaves `PH_DUEL` —
  exactly as today's shipped code (`sim.ts`'s `finish()`), not a moment later.**
  The win flourish and the loss sting are **not live**, even though the FSM's
  scene id is still `duel` while they play (the FSM only transitions to `map`/
  the loss beat *after* the flourish/sting and any ad have resolved — see
  §11.3/§11.4). `live`, therefore, is not simply "scene id `duel`"; it is
  "scene id `duel` **and** `S.phase === PH_DUEL`."

Scene ids follow M10's canonical enum (`boot`, `map`, `dialogue`, `duel`,
`unbox`, `wipe`, `wardrobe`, `versusSetup`); Spellbook and Options are
overlays, not scene ids, per the same ruling.

| Scene id | `live`? | Modal lock? | Ad may open here? | Cites |
|---|---|---|---|---|
| `boot` | no | no | no | I-24; resolves before `isGameplayLive` is ever evaluated (§4/M11) |
| `duel`, while `S.phase === PH_DUEL` | **yes** | no | no (ad brackets the *end*, never mid-duel) | C7; standard, boss, replay (C24) and 2P-versus [S5] alike |
| `duel`, during the win flourish / loss sting (`S.phase` is win/lose; the FSM has not transitioned away from `duel` yet) | **no** | no | no — the ad comes *after*, once the FSM leaves `duel` (§11.3/§11.4) | **M12/I-5**: this is the corrected boundary; the first draft of this table read the flourish as live, which was a genuine (unflagged) widening of the shipped gameplay window and is withdrawn |
| `map` | no | no | **yes** — this is where the between-duel interstitial actually lands (§11.3/§11.4) | C7 |
| `dialogue` | no | no | no (C30/§11.7's first-load ad is sequenced *before* the first bubble, never during one) | C7, C30 |
| `unbox` | no | no | no | C7; also where happytime now fires — §11.6, corrected |
| `wipe` (includes its own ~1–2 s completion/reveal tail — no separate scene id for it) | **yes** | no | no | C7; a bracket flicker between the wipe and its own payoff serves no portal and risks a sub-50 ms Poki pair, so the tail is folded into `wipe`'s live span until the FSM leaves it |
| `wardrobe` | no | **yes** (new: acquires `useModalState.acquireModalOpen()` on open, same contract `SpellBook`/`OptionsModal` already use) | no | C7 |
| `versusSetup` [S5] | no | no | no | C18; pre-match seat/side selection, before either duelist's `duel` scene id begins |
| Twin Gift hold (overlay atop `map` or the loss beat — M10: not a scene id) | no | no | no | C7, C8 |
| Spellbook (overlay) | no | yes (existing, unchanged) | no | C7, C16 |
| Options (overlay) | no | yes (existing, unchanged) | no | C7 (pre-existing) |
| Interstitial / Twin-Gift / first-load ad overlay | reported not-live via `isAdShowing` OR-ing into the pause gate (existing mechanism, unchanged) | n/a | — | pre-existing, C30 |

**Why the corrected boundary is actually the safer one for Poki (closing
I-5's concern):** `gameplayStop()` now fires synchronously at the same
instant it does today — before the 1400 ms flourish/sting, before any ad
wait. The next `gameplayStart()` cannot fire until the FSM re-enters `duel`
for the *next* node, which is at minimum the flourish/sting's 1400 ms plus
whatever `map`/`dialogue` navigation takes. That gap is comfortably clear of
Poki's 50 ms bad-event guard by construction, with no stage/timer logic
needed to guarantee it — the flourish/sting themselves are the buffer.

**Rule for every new blocking surface not in this table:** it acquires the
modal lock on open and releases it on close, exactly like `SpellBook`
(`setBook()` in `GameScene.vue` today, relocating with the rest of the duel
controller per §4's M11 restructuring). No new gating primitive is built; §4
wires new surfaces to the existing one. `[S2]`

**Test:** a `tests/platforms/gameplayLifecycle.test.ts` case per row above,
asserting `isGameplayLive(...)` for the scene id's exact input shape
(including the `duel`-but-not-`PH_DUEL` row, which needs its own case
precisely because it's the one the first draft got wrong) once §4 exposes the
`SceneId` union. `[S2]`

---

### §11.3 Ad sequence — win

Anchors F25's contract (unchanged timings, unchanged clock) onto C6's new
flow, now through the M21 composable. Nothing about *when an ad may fire*
changes from the shipped code; only *what happens around it*, and *which
module owns the call*, does.

1. **Killing blow lands.** `S.phase` flips to a win state (unchanged sim
   contract); per §11.2, `duel`'s live window ends here, before anything
   below. `track('duel_end', { nodeId, chapter, isBoss, won: true,
   durationMs, lossStreak })` fires — the §7.13/M7 payload shape (`nodeId`/
   `chapter`/`isBoss` replacing the flagged `foe` field; `lossStreak` carried
   even on a win, where it reports the streak just broken, for Dream Dust
   telemetry). This corrects N-12: the first draft of this section still
   wrote the stale `{ foe, won, durationMs }` shape and labelled it
   "unchanged" — it was not; §7 had already fixed it.
2. **Victory flourish, 1400 ms** (`AD_BEAT_MS`, unchanged constant). The gift
   visibly drops into the arena during this beat (§8's asset) — the reward is
   *seen* before any ad can possibly follow it, which is what answers CRIT's
   Round-1 "an ad between the win and the gift delays the payoff" objection
   without changing F25's timing at all: the gift isn't delayed, the *map* is.
   No happytime call happens in this beat, on any win, standard or boss — see
   the corrected placement in §11.6: it moved to `unbox`.
3. **`maybeShowInterstitial()`**, which STAYS in the duel controller. This is
   the moderator's amendment to M21 (§4.15, §4.9.3). It belongs to the
   end-of-duel sequence; `useDuelRewards.ts` holds reward logic only. Its
   contract: if `isInterstitialReady.value &&
   canShowInterstitial()`, `markInterstitialShown()`, then `showMidgameAd()`
   (audio hard-stopped before, `startBattleMusic()` restarted in `finally`,
   unchanged). If not due, this step is a no-op and step 4 follows
   immediately. Called from the FSM's win-transition handler (the successor
   to today's `GameScene.vue` `presentResult`, relocating per §4's M11
   restructuring), not from a view component directly.
4. **Page-turn to the map.** The gift is already sitting on its sector
   (dropped in step 2); tapping it is the `unbox` beat (not-live, §11.2) —
   which is also where happytime fires, when it fires (§11.6).

Total forced delay before the map is reachable: **1400 ms**, whether or not an
ad fires — the flourish, not the ad, is what's on the critical path. When an
ad *does* fire, the map is reachable the moment `showMidgameAd()` resolves
(existing bounded-wait caps: ~6 s "never opened", ~60 s "opened but never
finished", unchanged from `useAds.ts`).

`[S2]` (needs the map to exist as a real scene) — the interstitial call itself
is already live in the duel-only build today; S2 only moves *where it leads*
and *which module owns it*.

### §11.4 Ad sequence — loss

Symmetric, per F25 ("interstitials after a win **and** after a loss") and C26
("Umbra doesn't gloat; she falls asleep"):

1. **Final hit lands against the player.** Per §11.2, `duel`'s live window
   ends here. `track('duel_end', { nodeId, chapter, isBoss, won: false,
   durationMs, lossStreak })` fires — the same §7.13/M7 payload shape as
   §11.3 step 1 (N-12's fix applies identically here; the first draft's `{
   won: false, ... }` placeholder is replaced with the concrete shape).
2. **Defeat sting, 1400 ms** (same `AD_BEAT_MS` constant, same reasoning: don't
   cut the sting's audio off mid-note). Umbra dozes off; Dream Dust drifts in
   (C26, §6 owns the pity-timer mechanics).
3. **No happytime call, ever, on a loss.** Not in scope of §11.6's precedence
   rule, which only ever fires from a win's `unbox` beat.
4. **The interstitial-equivalent from `src/use/useDuelRewards.ts`** (§11.3
   step 3, same function, same clock) — called from the FSM's loss-transition
   handler. A loss owes the shared clock exactly as much as a win; F25
   explicitly rejected a won-only gate.
5. **The loss beat**: retry, or back to the map. **No reward offer on a
   loss, ever** — D3 (2026-09-18) removes the loss-beat consolation offer
   entirely: a loss has nothing to bloom, and a family-friendly game must not
   sell an easier retry. The only reward path in this game is the win-only
   Twin Gift bloom offer (§11.5), which is never reachable from this beat.
   *(Historical, for provenance: the previous draft read "The Twin Gift's
   consolation offer (§11.5) is presented here, not before the ad." — removed
   per D3.)*

**Replay nodes (C24):** the sequence is unchanged in shape — a replay win or
loss still asks the shared clock and, if due, still shows an interstitial
(C24: "the interstitial clock applies as normal") — but the mandatory gift
and the win-only Twin Gift bloom offer (§11.5) never appear on a replay
(C24: "no gift and no rewards"). `canOfferReward`'s render condition
therefore gains one more term: `!isReplay` (a runtime check, distinct from
the build-time `isRewardOfferSuppressed` fold in §11.5/§11.9 — a node's
replay status isn't knowable at build time). This term is belt-and-braces:
a replayed node's sector was already bloomed (or, per C24, was never
eligible) the first time it was won, so §11.5's own offer condition would
normally exclude a replay on its own, but `!isReplay` guarantees it
regardless. `[S2]`

**2P versus [S5]:** one shared device, one shared screen — the sequence fires
once per match (not once per player), keyed to whichever side's HP hit zero
first. Neither player's loss suppresses the *other's* Twin Gift offer or the
match's mandatory gift; §6 defines what a versus win pays out (this chapter
only asserts the ad/happy-moment sequence is unchanged in shape). `[S5]`

---

### §11.5 The Twin Gift — rewarded-ad gating

Adopts C8/C4 exactly; this section is the gating **contract**, not the visual
(§8 owns the gift's look, the ribbon, the film-strip glyph's exact art).

**Presence.** Rendered only when **all** of:
- `canOfferReward.value` is true, where **`isRewardOfferSuppressed` itself
  now includes `CHILD_DIRECTED`** (M17c/I-7's fix —
  `isRewardOfferSuppressed = isCrazyPreRelease || isWavedashNoAds ||
  CHILD_DIRECTED` in `useAdGate.ts`, importing `CHILD_DIRECTED` from
  `src/use/useChildDirected.ts`, §11.9). This is the one-guard fix, not a
  second `&& !CHILD_DIRECTED` bolted onto the consumer: `claimReward()`
  itself now refuses on a child-directed build regardless of which future
  call site reaches it, closing the exact "belt and braces" gap
  `useAdGate.ts`'s own comment on `isRewardOfferSuppressed` exists to close
  ("a free ×3 must not be reachable by any other route either") and which
  I-7 found reopened by the first draft's consumer-side-only guard. On a
  `CHILD_DIRECTED = true` build this constant is `true` at module load, so
  Rollup folds the whole Twin Gift branch away, same as it already does for
  `isCrazyPreRelease`/`isWavedashNoAds`;
- **the duel was a win, and it just restored a sector that has never bloomed
  before** (D3, 2026-09-18, superseding the old "once per post-duel beat, win
  or loss" gate below) — a loss offers nothing at all (§11.4 step 5: the
  offer is removed there entirely), because a loss has nothing to bloom;
- the current duel/node is **not** a replay (§11.4) — a runtime term on the
  render condition, separate from the build-time `isRewardOfferSuppressed`
  constant above (replay status can't be known at build time); belt-and-
  braces alongside the bullet above, since a replayed node's sector is
  already bloomed (or, per C24, never eligible) in every real case;
- the sector has not already claimed its lifetime bloom — **one bloom per
  sector, ever; 50 sectors total (C1); each one-time-claimable, never
  re-offered** (D3). `rewardClaimed` no longer resets per-duel; it is now a
  per-sector, persisted flag (§11.12 — §4 places the bit, this chapter states
  the rule it must satisfy).

**Placement.** On the map, right after a sector's reveal (the `wipe` scene's
completion, §11.2), beside that newly-restored sector — **win-only, and only
on the specific sector that just bloomed** (D3, 2026-09-18; supersedes "beside
the node's mandatory gift on a win, or at the loss beat on a loss" — there is
no loss-side offer at all, per §11.4 step 5). Never on a `DuelResult`-style
panel (that component's reward button, `DuelResult.vue`'s `@reward` binding,
is retired from the story build; §8/§4 own the replacement map-anchored
component).

**Open gesture.** A **1.2 s press-and-hold**, not a tap. The call site moves
from a click handler to a hold-completion callback on
`src/use/useDuelRewards.ts`'s claim function (M21 — see the Cross-ref below);
nothing inside `claimReward()`'s own logic changes — `recordRewardRequest()`
(and therefore the 6-per-5-min limiter) still fires exactly once per
**completed** hold, never on a
release before 1200 ms. A released-early hold is a no-op: no request recorded,
no rate-limit consumed, no ad requested. This is KIDS' "a toddler's tap must
not trigger it" gate applied to F25's offer, and it changes nothing about
*when* the offer is live, only *how* it is triggered.

**Payload.** A **bloom** — a permanent, purely cosmetic decoration on the
sector that just won and was just wiped clean (D3, 2026-09-18, resolving the
`[later]` this section previously deferred to). It grants no power and no
progress: no coins (there is no currency at all — §11.11), no rank, no
unlock. One bloom per sector, ever (Presence, above); once claimed, that
sector's offer never returns. *(Historical, for provenance: F25's old payload
read `×2` the win's `lastPay` on a win, `+winCoins(chapter, isBoss)` (§6.17)
on a loss, both coins — removed per D3, along with the currency they paid
into.)*

**Cadence.** The ad-readiness rate limiter is F25's, unchanged:
`REWARD_WINDOW_MAX = 6` requests per `REWARD_WINDOW_MS = 5 * 60_000` ms —
unchanged constants, unchanged semantics (counts *requests*, not grants, so a
dismissed/no-fill ad still spends the allowance). What changed (D3) is which
duels are even eligible to reach that limiter: not "every eligible duel"
(F25's old wording, win or loss) but only a win that just bloomed a
never-before-bloomed sector (Presence, above) — so this is no longer a
per-session-repeatable placement at all; across a full clear it can fire at
most 50 times, ever, lifetime, one per sector.

**Cross-ref:** §8 builds the ribboned-gift asset and the hold-progress visual
(a fill ring, per the icon-set conventions in the existing HUD), plus the
bloom's own cosmetic art (D3). The hold-to-open logic itself lives in
`src/use/useDuelRewards.ts` (M21, new file, §4 defines its exact exports)
rather than in a view component — the map's Twin Gift is now the *only*
caller of the `claimReward`-equivalent (there is no loss-beat caller any
more: D3 removes that offer entirely, §11.4 step 5); §4 wires the 1.2 s hold
gesture into the same pointer-capture pattern `GameScene.vue`'s duel
controller already uses for the drawing pad, on a *different* hit-box,
calling into `useDuelRewards.ts` on completion rather than reaching into a
component's private closure (the I-23 fix: the reward composable, not the
view, owns `rewardClaimed`/`rewardBloom`/the claim flow — `rewardBloom`
replacing the pre-D3 `rewardCoins` name, since the payload is a bloom, not
coins — so "the map" and "the duel controller" can both be thin callers).
`[S2]` (needs the map).

---

### §11.6 `happytime()` / GamePix happy moment — placement

F14 + C8: moved off "every win" (today's behaviour, `GameScene.vue`
`presentResult`) onto exactly three trigger *types*, resolved by **one
explicit dedupe rule** (M29/N-11 — the first draft's arithmetic didn't
support its own stated total, and its "only chapter 10 coincides" premise
was also wrong: all three triggers occur in *every* chapter, not just the
last one):

> **Dedupe rule: at most one `happytime()` per node completion. Precedence
> — rune/Signature Spell unlock > boss clear > chapter fully restored.**

The three trigger types:

1. **Rune or Signature Spell unlocked** — the boss chest's unlock resolves at
   the `unbox` beat (C1's chapter table / C14). Happens in **every** chapter
   (8 chapters unlock a new rune, 2 unlock a Signature Spell — C1: 8 + 2 = 10,
   exactly one per chapter, not "up to 9" as the first draft miscounted).
2. **Boss clear** — the boss's HP crosses 0, at the end of the `duel` scene
   (§6 owns the boss-phase state that makes this unambiguous even mid-phase
   -shift). Happens in every chapter (node 5 is always the boss, C5).
3. **Chapter fully restored** — the chapter's last remaining sector's wipe
   completes. Because C5's campaign is linear (5 nodes per chapter, played in
   order) and C9 allows at most one sector in progress at a time, the
   chapter's last sector to wipe is always the boss's own sector at node 5 —
   so this, too, happens in every chapter, tied to the same node-5 sequence
   as the other two.

**All three trigger types therefore occur once per chapter, in every
chapter, as part of one node-5 sequence** (`duel` win → `unbox` → `wipe` →
reveal) — never as a chapter-10-only coincidence. Applying the precedence
rule: the unlock trigger is present in all 10 chapters and always outranks
the other two, so **it is the one that fires, every time, and it fires at
`unbox`, not inside the win flourish.** Boss-clear (which occurs earlier, at
the `duel` win) and chapter-restored (which occurs later, at the `wipe`
completion) are both suppressed for that same node-5 sequence once the
unlock has fired for it. This also moves this chapter's call site out of
§11.3 step 2 (the flourish) entirely — see the correction there.

**Why `unbox` and not the flourish:** since the unlock trigger always wins
the precedence and always resolves at `unbox`, there is no case in this
design where happytime fires during the `duel` scene at all. Never while
`isAdShowing` is true (unaffected by this correction — `unbox` never
overlaps an ad per §11.2).

**Why happytime exists at all, and not on standard nodes:** CrazyGames' own
SDK documentation is explicit that `happytime()` is for "significant player
accomplishments" and states outright there is "no need to call this when a
level is completed" (docs.crazygames.com/sdk/html5-v2/game/ — cited by the
moderator as F14). GamePix's `happyMoment()` has no equivalent published
guidance distinguishing "routine" from "significant," but there is no reason
to treat it differently, and doing so keeps one call site instead of two
divergent ones.

**Recount (M29/N-11):** raw trigger instances across a full clear = 10
(unlock) + 10 (boss clear) + 10 (chapter restored) = **30**. The dedupe rule
collapses all three into one call per chapter, for all 10 chapters: 30 − 20
= **10 calls total per full clear — exactly one per chapter, always at that
chapter's `unbox` beat.** This replaces the first draft's unsupported "19,"
which both used the wrong raw count (it treated the unlock trigger as "up to
9" instead of the correct 10) and applied the 3-way dedupe to chapter 10
alone instead of to every chapter. Compare: today's build calls it on every
one of an unbounded number of wins. `[S2]` for chapter 1's boss; extends per
chapter as `[S3]`/`[S4]` land.

**Test:** `tests/platforms/happyMoment.test.ts` —
- 4 standard-node wins in a chapter → `qa.happyCalls === 0`;
- the 5th (boss) win, sampled *immediately*, before `unbox` → still
  `qa.happyCalls === 0` (proves the deferral, not just the eventual count —
  the first draft's test only checked the count after the win and would have
  passed even with the wrong call site);
- the same node's `unbox` resolving → `qa.happyCalls === 1`, and it is not
  further incremented by that same node's later `wipe`-completion
  (chapter-restored) trigger.

---

### §11.7 The first-load interstitial (C30)

Unchanged mechanism (`useFirstLoadInterstitial.ts`'s two-signal watcher:
`splashGone` + `isInterstitialReady`), unchanged portal scope (GameMonetize,
GamePix, GameDistribution only — CrazyGames and Poki are deliberately absent
from `armFirstLoadInterstitial()`'s callers, per that file's own comments, and
that does not change here).

**What changes:** the dialogue FSM (§4) must not paint the first speech bubble
of chapter 1, node 1 until this module has either (a) fired and resolved, or
(b) determined it will never fire on this build (the watcher was never armed).
Concretely, `useFirstLoadInterstitial.ts` gains one new export:

```ts
/** Resolves once the first-load ad has fired and settled, OR immediately if
 *  this build never arms one. The dialogue FSM (§4) awaits this before its
 *  very first bubble, so the ad — where one is mandatory — covers a calm,
 *  unfinished arena frame instead of a half-typed line (C30). */
export const firstLoadAdSettled = (): Promise<void> => { /* new */ }
```

On a build that never calls `armFirstLoadInterstitial()` (CrazyGames, Poki,
Yandex, itch, Glitch, Wavedash — none of these arm it today), this resolves on
the next microtask; the dialogue FSM never perceives a delay. `[S2]`

**Non-goal:** no attempt to make the ad *wait* for the dialogue system to be
ready — that direction was already rejected once (the moderator's F25 evidence
and the module's own comments: sampling readiness once at boot is the exact
race that got a real build rejected). The dialogue side yields to the ad, not
the reverse.

---

### §11.8 The QA chord, in the new scenes

Unchanged mechanism (`useQaAdTrigger.ts`: 30 taps on the foe's HP bar within
1.5 s of each other; any other press anywhere breaks the chain). Scope:

- **Only meaningful during a live duel** (standard, boss, replay) — the HP bar
  it hit-tests (`isOnFoeHpBar`) exists only in that scene. No new hit-box is
  added for the map, wardrobe, or dialogue scenes; there is nothing there worth
  QA-summoning an ad over, and adding one would be a second door to guard.
- **2P versus [S5]:** either duelist's HP bar is a valid target — from either
  seat, the opposing bar is "the foe's." No new rule; the existing hit-test
  generalises for free once §6/§4 give the second duelist's bar its own
  bounding box.
- Obeys the shared clock exactly as today: `markInterstitialShown()` on fire,
  so the very next *real* placement (§11.3/§11.4/§11.7) still owes the full
  121 s from the QA fire, not from whenever it would otherwise have landed.

`[S0]` — already shipped; this section only confirms it needs no change.

---

### §11.9 `VITE_CHILD_DIRECTED` — verified, per portal SDK

New env flag, default `false` (C2/D1). New module,
`src/use/useChildDirected.ts` (new file):

```ts
export const CHILD_DIRECTED = import.meta.env.VITE_CHILD_DIRECTED === 'true'
```

**This is the ONE place the flag is read (M17a, resolving I-17).** §2.9 cites
this module rather than adding a second flat `export const` to `useUser.ts`
alongside `isCrazyWeb`/`isWaveDash`/etc. — `useUser.ts`'s existing flags are
all *platform* identity (which portal is this build?), a genuinely different
axis from `CHILD_DIRECTED` (which audience posture is this build?), and the
two can vary independently (a Yandex build can be child-directed or not).
Keeping it in its own module also gives §11.10's alias swap a single,
unambiguous import path to redirect.

**What it does — all of it real, all of it in code this project owns:**

| Effect | Mechanism | Owner |
|---|---|---|
| Twin Gift never renders, never requests an ad, and `claimReward()` itself refuses on any other call path | `CHILD_DIRECTED` is OR'd directly into `isRewardOfferSuppressed` in `src/use/useAdGate.ts` (M17c, I-7's fix — **not** a second guard on the consumer; see §11.5). On a `true` build this is a dead `import.meta.env`-derived branch Rollup removes, same pattern as `isCrazyPreRelease` today | §11 (this chapter) |
| `gtag`/`dataLayer` analytics sink is never probed | A **module alias swap in `vite.config.ts`** (M17b, I-6's fix): when `VITE_CHILD_DIRECTED === 'true'`, `resolve.alias` points `@/use/analyticsSink` at a new no-op stub, `src/use/analyticsSink.childDirected.stub.ts`, whose `probeSink()` returns `null` unconditionally — the same proven pattern the existing Playgama stub (`analyticsSink.stub.ts`) already uses, and for the same reason: an in-function `if (CHILD_DIRECTED) return null` inside the real `probeSink()` is not enough. See §11.10. | §11.10 below |
| Playgama (and therefore Playables) drops out of `build:all` | `tools/pack/pack.mjs` / the root `package.json` build-matrix script skips the `playgama` target when `VITE_CHILD_DIRECTED=true` is set for that run; enforced additionally as a `vite.config.ts`-time throw if both `VITE_APP_PLAYGAMA=true` and `VITE_CHILD_DIRECTED=true` are ever set together, so the contradiction PORT-1 found can't ship by accident | §4/build scripts, contract specified here |

**What it cannot do, verified — cite before believing otherwise:**

I checked, for each of the six ad SDKs this game embeds, whether the game's
*own* client-side call has any child-directed / TFCD / TFAT / non-personalised
-ads parameter it can set. **None does:**

- **CrazyGames** — `docs.crazygames.com/sdk/html5-v2/game/` and
  `docs.crazygames.com/sdk/data/` document `init`, `game.*`, `ad.*`, `user.*`,
  `data.*`. No age/content-rating/TFCD method anywhere in the surface.
  CrazyGames' own audience split (F13: 13+ main site vs. the demonetized
  `kids.crazygames.com`) is decided by **CrazyGames' own review of the
  submission**, not by anything the game calls at runtime.
- **GameDistribution** — the public SDK repo
  (`github.com/GameDistribution/GD-HTML5`) documents `gdsdk.init()`,
  `showAd()`, and its event set. No child-directed or TFCD/TFAT option is
  exposed to the embedding game.
- **GameMonetize** — `SDK_OPTIONS`/`sdk.showAd()` (as wired in
  `src/use/ads/GameMonetizeProvider.ts`) carry no content-rating field either.
- **GamePix** — its documented `init`/`gameLoaded`/`interstitialAd`/
  `rewardAd`/`lang()` surface (mirrored in the `portal-qa.mjs` stub) has no
  such parameter.
- **Yandex** — `player.setData`/`player.setStats` (yandex.com/dev/games/doc/en/sdk/sdk-player)
  are storage APIs, not ad-targeting ones; Yandex's own audience/age
  self-declaration is a **developer-console** field (§11.14), not an SDK call.
- **Poki** — has no ad-targeting parameter either; its own developer docs
  (`developers.poki.com/guide/content-player-safety`) describe Poki as
  reviewing content for "everyone, including kids," which is a *platform*
  posture, not a per-game runtime toggle.

`support.google.com/admanager/answer/3671211` (Tag for Age Treatment) and
`support.google.com/adsense/answer/9007197` (the now-deprecated TFCD) both
describe a parameter set **on the ad request itself, by whoever owns the ad
tag** — here, that is each portal's own backend, behind their SDK, not this
game's JS. **The lever this project needs — "serve this specific game's
inventory as non-personalised" — is a setting in each portal's own ad
account/dashboard for this game's listing, not a runtime call.** `VITE_CHILD_DIRECTED`
is therefore honestly scoped as: *remove what our own code controls that would
be indefensible under a child-directed posture (rewarded ads, third-party
tracking, the Playables submission)*, and *nothing else* — it cannot and does
not reach into any of these six SDKs' own ad-targeting decision. This doesn't
change C2's ruling (its wording — "wherever the SDK supports it" — already
allows for this outcome); it's the verified answer to "where," which is:
nowhere, today, at the client. `[S0]`

**Test:** `tests/platforms/childDirected.test.ts` — with `VITE_CHILD_DIRECTED=true`
stubbed via `vi.stubEnv`, assert the Twin Gift's presence computed is `false`
regardless of `canOfferReward`, and `probeSink()` returns `null` regardless of
what globals exist on `window`.

---

### §11.10 Analytics sink gating

`src/use/useAnalytics.ts`'s `track()` already writes to two sinks: the
in-memory `ring` (never leaves the tab, QA-only via `analyticsLog()` /
`window.__analytics`) and a portal sink probed once via `probeSink()` in
`src/use/analyticsSink.ts` (names each portal SDK global plus `gtag` /
`dataLayer`).

**Rule, unconditional on positioning:** the in-memory ring is untouched on
every build — no privacy exposure exists there (session-scoped, no PII, dies
with the tab). **The portal sink is gated by `CHILD_DIRECTED`, and the gate
is a whole-module alias swap, not an in-function guard** — a direct
correction (I-6/M17b) of the first draft, which specified exactly the
pattern this project already measured and rejected. `analyticsSink.ts`'s own
header (verified in the real file) states it plainly: an early-return guard
was tried first for the Playgama case and measured to fail, *"the
obfuscator's `stringArray` pass hoists literals into its indirection table
before esbuild folds the env comparison, so `PokiSDK`, `GamePix`, `gtag` and
`dataLayer` all still turned up in the Playgama archive with the guard in
place."* The project's actual working fix for that case was a whole-module
`resolve.alias` swap to `analyticsSink.stub.ts` — `CHILD_DIRECTED` gets the
same treatment, as its own alias branch (the two flags are independent, so
this is a second branch, not a reuse of the Playgama one):

```ts
// vite.config.ts, alongside the existing analyticsSink alias for Playgama:
resolve: {
  alias: [
    ...(env.VITE_CHILD_DIRECTED === 'true'
      ? [{ find: '@/use/analyticsSink', replacement: resolveStub('analyticsSink.childDirected.stub.ts') }]
      : env.VITE_APP_PLAYGAMA === 'true'
      ? [{ find: '@/use/analyticsSink', replacement: resolveStub('analyticsSink.stub.ts') }]
      : [])
  ]
}
```

The two conditions never need to compose in practice — §11.9's build-time
throw already forbids `VITE_APP_PLAYGAMA=true` together with
`VITE_CHILD_DIRECTED=true` — so the ternary's ordering is a safety margin,
not a real decision point. `src/use/analyticsSink.childDirected.stub.ts`
(new file) exports a `probeSink()` that returns `null` unconditionally,
mirroring the existing `analyticsSink.stub.ts`. A first-party portal event
API (e.g. `happytime()`'s own call, which is not routed through this sink at
all — it's called directly from wherever §11.6 places it) is unaffected; the
gate only removes the **third-party tracker** path, which is the specific
thing Google's ad policy for made-for-kids content names as forbidden
(`support.google.com/adspolicy/answer/9683742`).

**Debug hook**, alongside the existing `exposeAnalytics()`, unaffected by the
alias-vs-guard fix (it only ever reports which module got linked, not how):

```ts
// New, debug-only, alongside window.__analytics:
;(window as any).__analyticsSink = () => (sink === null ? 'none' : sink ? 'active' : 'unprobed')
```

so `scripts/portal-qa.mjs` (§11.15) can assert the sink state directly
instead of inferring it from network traffic that a headless run may never
generate — and, on a `--child-directed` run, can additionally assert that
`analyticsSink.childDirected.stub.ts` (not the real module) was the one
actually linked, by checking the built bundle never contains the real
module's `gtag`/`dataLayer` literals (the same "grep the built bundle, not
the source" discipline the project's obfuscator/bundle-purity checks already
use elsewhere). `[S0]`

---

### §11.11 Currency rules

**D3 (2026-09-18) reverses this section's old default outright: the story
build has no currency at all.** No coins, no coin jar, no coin burst out of
gifts, no Rune Shrine, no element ranks, no `winCoins`, no second currency,
no first currency either — the concept does not exist in this build, on any
platform, including `VITE_CHILD_DIRECTED=true` and including 2P versus [S5].
This supersedes both C4/C16 (which this section previously ratified as "one
diegetic currency: coins") and the coin half of F25 (the owner's ads pass
that paid `×2` coins on a Twin Gift win) — the coin payload is gone; §11.5
specs what the Twin Gift pays instead (a bloom).

- **Poki's no-secondary-currency rule is satisfied trivially: there are zero
  currencies to be a second one of.** Do not read this section as "the one
  currency is coins, shown only in the jar/shrine, and it obeys the
  one-currency rule" — that implementation detail no longer exists. The
  compliance answer is simply: no currency, full stop.
- **Every unlock is event-gated, never currency-gated** (unchanged in spirit,
  now unconditionally true rather than merely policed): wardrobe pieces,
  advanced runes, Signature Spells, biome restoration. §6 (combat) and §8
  (cozy) own the exact trigger per unlock; with no currency to spend, there
  is no price tag to forbid, in this or any other currency.
- **The Twin Gift and the mandatory gift pay no currency of any kind.** The
  Twin Gift pays a bloom (§11.5, cosmetic only, one per sector, ever); the
  mandatory gift pays whatever cosmetic/story content §6/§8 assign it —
  neither has ever paid, nor may ever pay, coins or any other monetary unit.
- **`VITE_CHILD_DIRECTED` does not touch the economy** — there is no economy
  left to touch. Only the *ad surface* (§11.5/§11.9) is conditional on it.
  Positioning is a marketing/ad-serving decision, not an economy decision.
- *(Historical, for provenance: this section previously specified "one
  currency, permanently, internal id `coins` / `am_coins` (`src/keys.ts`
  `COINS_KEY`)," 12 elemental ranks bought at an "in-world Rune Shrine," and
  "the Twin Gift and the mandatory gift both pay coins only." All of the
  above is removed per D3.)*

`[S0]` for the constraint; enforced per-chapter as `[S2]`–`[S4]` unlocks land.

**Test:** a `tests/economy/noCurrency.test.ts` golden test (renamed and
re-purposed from the pre-D3 `singleCurrency.test.ts`) scanning `src/keys.ts`
and `src/game/duel/config.ts` for **any** monetary field at all, first or
second — fails the build if one appears, so this rule can't regress silently
as chapters 4–10 add unlocks.

---

### §11.12 Save size, per portal

C28's budget: `auroras_magic_state` total **< 8 KB**, `am_schema = 2`, a nested
`S.campaign` sub-object, a done-bitset over 50 sectors, at most one
in-progress sector's coverage grid (56 chars, C9). Measured against every
portal's actual published ceiling — not the project's own `< 1 MB` hard-reality
floor, which every one of these clears trivially, but the real numbers, so the
margin is visible rather than assumed:

| Portal | Ceiling | Source | Margin at 8 KB |
|---|---|---|---|
| CrazyGames (`SDK.data.setItem`) | **1,048,576 bytes (1 MiB)** hard cap; over it, warnings and the cloud backup stops | `docs.crazygames.com/sdk/data/` | ~130× |
| Yandex (`player.setData`) | **200 KB** per player; ≤ 100 requests / 5 min | `yandex.com/dev/games/doc/en/sdk/sdk-player` | ~25×, **but see the rate-limit note below** |
| Poki (mirrors localStorage/IndexedDB) | this project's own `< 1 MB` gzipped floor (hard reality) — over it, Poki's sync silently switches off, per-repo | round-1 finding, project hard reality | ~125× |
| Playgama / YouTube Playables | **< 3 MiB MUST**, **< 500 KiB SHOULD**, final-flush **≤ 64 KiB MUST** | `developers.google.com/youtube/gaming/playables/certification/requirements_integration` (`YTP-SAVE-SIZE`) | ~62× against the SHOULD |
| GameDistribution / GameMonetize / GamePix | no published hard cap found | — | treat the 8 KB budget as the universal safe number |

**No portal-specific save-size risk remains once C28's 8 KB budget holds.**
The one real constraint left is **Yandex's request-rate ceiling, not its byte
ceiling**: `player.setData` accepts at most 100 calls per 5 minutes. §4's flush
triggers today are duel-end and reward-claim (bloom-claim) — both naturally
rare. (The old third trigger, rank-buy, no longer exists: D3 removes the
currency it spent and the Rune Shrine along with it — §11.11.)
The wipe (§8/§9) introduces a NEW temptation: flushing the in-progress
coverage grid (C9's 56-char bitstring) on every brush stamp. **This chapter
requires that wipe-progress flushes are debounced to at most once every few
seconds of active wiping** (a concrete number — e.g. every 4 s — is §4's/§7's
to tune against the 15 s standard / ≈10 s boss wipe durations in C10; the constraint is the
ceiling, not the exact interval). Getting this wrong doesn't corrupt data —
Yandex's SDK just starts rejecting the excess calls — but it would mean the
"resume a wipe exactly where you left it" promise (C9) silently stops holding
on Yandex mid-wipe.

`[S0]` for the budget assertion (belongs in `am_schema`'s own test, §4); `[S1]`
for the debounce, since it only exists once a real wipe does.

**Test:** extend `tools/pack/pack.mjs`'s report (it already knows nothing about
save size — this is new) with a `--save-sample <path>` flag that
`JSON.stringify`s a worst-case `auroras_magic_state` (every chapter cleared,
every cosmetic owned, one sector mid-wipe) and asserts it against the 8 KB
number, alongside the existing bundle-size gates.

---

### §11.13 Initial-load budgets vs. staged loading

`tools/pack/pack.mjs`'s `BUDGETS` table, verbatim (unchanged by F25, but this
is the first time the story extension's art weight has to respect it):

| Platform | `initial` | `total` | other |
|---|---|---|---|
| `poki` | 5 MB | 8 MB | — |
| `playgama` | 30 MB | 250 MB | perFile 30 MB, ≤ 8000 files |
| `crazy-web` | 20 MB | 250 MB | — |
| `gamepix` / `gamemonetize` / `game-distribution` | — | 50 MB | — |
| `yandex` | — | 100 MB | — |
| `glitch` / `wavedash` | — | 250 MB | — |
| `itch` | — | 1024 MB | — |

`initial` is computed by `pack.mjs` today as `index.html` + the entry chunk +
its static imports + the stylesheet + the classic shim — **it does not yet
count runtime-decoded art the loading screen waits on** (the same gap the
owner's playbook calls out generally: "procedural assets are assets"). Once
Step 3 art lands on the map, `pack.mjs`'s initial-load walk needs an
`--initial-extra` prefix list (the pattern `youtube-fit-audit.mjs` already
uses) naming whichever `public/images/...` prefixes the map's own loader
awaits before first paint — §9's job to name them, §11's job to make sure the
budget check actually covers what the player waits for.

**The binding constraint is Poki's 5 MB initial** — every other budget is
looser. C29 ("seamless" is figurative — chunked per chapter, only the current
chapter ±1 resident, streamed in on scroll) is what makes this survivable: the
*initial* load only ever needs to be splash + chapter-1's chunk (art, audio,
UI-shared assets), never the whole 50-node campaign. **Starting target for §9:
chapter-1's resident art+audio chunk ≤ 4 MB raw**, leaving headroom under
Poki's 5 MB for the entry JS/CSS/`index.html` `pack.mjs` already counts. This
is a starting value, not a guess-and-forget: it is tuned by re-running
`pack.mjs`'s existing initial-load report (extended per the paragraph above)
the moment chapter-1 art actually lands, and again at every later chapter to
confirm chapter *N*'s chunk doesn't leak into what chapter 1's player
downloads. `[S3]` (chapters 1–3, first release candidate, is also Step-3 art's
earliest real test).

**Cross-ref §9:** this chapter owns the *budget numbers and the gate*; §9 owns
the *chunking mechanism* (which files exist per chapter, how the "±1"
resident window is implemented against Canvas 2D with no engine). Where §9's
numbers and this table disagree, §9's real measurement wins and this table's
"starting target" gets revised — that revision is a `pack.mjs` report re-run,
not a new ruling.

---

### §11.14 Listing & age-rating answers, under the D1 default

Concrete, per portal, consistent with D1's default ("all-ages cozy," nothing
in listing copy or in-game text says "kids," "3–12," or "girls" — §2/§10 own
scrubbing the actual copy; this section owns the **submission-form answers**
that have to agree with that copy):

| Portal | Field | Answer under D1 default | Why |
|---|---|---|---|
| CrazyGames | Age/content rating | **PEGI 12**, general 13+ catalog (not routed to `kids.crazygames.com`) | F13; PEGI 12 is already the requirement, and this content clears it easily |
| Poki | Content tagging | No COPPA/child flag; genre tagged as arcade/casual "cozy duel" | Poki's own guidance treats "welcoming for everyone including kids" as a platform posture, not a per-game flag (§11.9) |
| Playgama | Game category | **Arcade** (or **Puzzle + Trivia**, whichever the actual duel mechanic fits better per §10's final framing) — **explicitly not "Family + kids,"** even though that category exists on Playgama's own storefront | Picking "Family + kids" would self-flag exactly the audience D1 is trying to avoid declaring, undermining the reason Playables eligibility was worth protecting (PORT-1) |
| YouTube Playables (same archive as Playgama) | Certification questionnaire: "not made for kids" / "13+ general audience" | **Answer "not made for kids": yes. "13+ general audience": yes.** | Required by `YT-TS` 6.2/6.3 (F12) — **but this answer is only honest once §2 and §10 have actually scrubbed every kid-coded signal** (character design, cosmetic naming, color-picker "girls'" framing in `art-style.md`) out of what a reviewer sees. §11 states the required answer; §2/§10 are the precondition. |
| GameDistribution / GameMonetize / GamePix | IAB content category | Casual/Arcade; no child-audience flag | No child-specific field exists on any of the three (§11.9) |
| Yandex | Developer-console age marking | Mildest accurate rating (no realistic violence; cartoon magic-vs-shadow combat) — not the "for young children" tier if one exists, to match D1 | F13-adjacent: Yandex's own liability language (round-1 finding) puts classification on the developer; pick the honest rating, not the most permissive one |
| itch.io / Glitch / Wavedash | none (no formal gate) | Listing copy only — no "for kids" language | Informational; these platforms have no age-rating field to answer at all |

**This table is inert without §2/§10.** §11 can specify every correct answer
and it will still be a false certification if the shipped build's character
names, cosmetics, and copy read as kid-targeted on sight — which is exactly
the failure mode PORT-19 (round 1) named for a human Playables reviewer.
`[S3, D2]` — a listing only gets submitted once a release candidate exists.

---

### §11.15 `scripts/portal-qa.mjs` — additions per new scene

The harness today proves three things against the **built** bundle: mute,
pause, and the gameplay bracket, for a single duel-only scene. The story
extension needs the same proof across every row of §11.2's table, plus new
assertions for the Twin Gift, happytime placement, and `VITE_CHILD_DIRECTED`.
All additions below extend the existing `PROBE` string and `PLATFORMS` table
in `scripts/portal-qa.mjs` — no new harness, no new driver.

#### §11.15.1 New debug hooks

In **`AppScene.vue`'s** QA block (per §4's M11 restructuring, the canvas,
the single RAF and this debug block move here from `GameScene.vue`, which
becomes the duel-only controller referenced in §11.3/§11.5; this chapter
assumes that relocation and flags it as read from §4, not asserted by §11).
The block is guarded exactly as today — `isDebug.value || import.meta.env.DEV
|| window.__AM_QA__` — and already exposes `w.__S`, `w.__arm`, `w.__step`,
`w.__frame`, `w.__musicOn`, `w.__cast`, `w.__stroke`. New, once §4's FSM
exists:

```ts
w.__gotoNode = (nodeId: number) => { /* jump the campaign FSM straight to nodeId's duel, dialogue skipped; M10: nodeId is numeric, 0-49 */ }
w.__finishWipe = () => { /* set the current sector's coverage to 100% without simulating brush strokes */ }
w.__holdTwinGift = (ms = 1200) => { /* simulate the press-and-hold; ms < 1200 must be a no-op, per §11.5 */ }
w.__campaignPhase = () => flow.scene // I-28 fix: reads §4's S.flow.scene (imported from @/game/flow/scene) — CampaignState has no `scene` field, so a lookup through S.campaign always reported null
```

**2. `qa.campaignPhase()`** in the `PROBE` string, thin wrapper over
`window.__campaignPhase()` above — lets every check below assert *which* row
of §11.2's table it's currently proving, instead of only "a duel is running."

**3. A new CLI flag, `--scene <duel|wipe|map|dialogue|wardrobe>`**, default
`duel` (today's only tested scene) — drives to that scene via `__gotoNode`/
`__finishWipe` before running the existing mute/pause/bracket battery, so each
row of §11.2 gets the same proof duel-only testing has today. Failing to add
this and only ever testing `duel` is exactly the "no control case" trap the
script's own header comments already warn about (trap 3) — it would apply
here to the new scenes at scale.

**4. Happytime call counting**, corrected to match §11.6's precedence rule.
The `crazy-web` stub's `game.happytime` already `log()`s (visible via
`qa.console`); add a counter:

```js
qa.happyCalls = 0;
// inside sdk.game.happytime: qa.happyCalls++; (gamepix stub gets the same for happyMoment)
```

New check, in three samples rather than two (the middle sample is the point
of the test — it proves the call site moved to `unbox`, not just the final
count): drive 4 standard-node wins in a chapter via `__gotoNode` →
`qa.happyCalls === 0`; drive the 5th (boss) win and sample *immediately*,
before advancing to `unbox` → still `qa.happyCalls === 0`; advance through
`unbox` → `qa.happyCalls === 1`, and it does not increment again when that
same node's `wipe` later completes. A test that only sampled after the full
node-5 sequence (the first draft's version) would pass just as happily with
happytime wrongly fired at the win instead of at `unbox` — it would not have
caught the correction this fix round made.

**5. Twin Gift / reward call counting.** The `gamepix` and `gamemonetize`
stubs already have `rewardAd`/no-fill paths; add `qa.rewardCalls = []`,
pushed on every call, and a check that `__holdTwinGift(1199)` produces **zero**
entries while `__holdTwinGift(1200)` produces exactly one — proving the hold
threshold in §11.5 rather than trusting the UI's own debounce.

**6. `VITE_CHILD_DIRECTED` build variant.** A new `--child-directed` flag that,
when set, expects the harness was pointed at a build produced with
`VITE_CHILD_DIRECTED=true` (the script doesn't build; it asserts against
whatever `--dist` already is, per its existing "test the built bundle" rule).
Checks: no Twin Gift affordance reachable via `__holdTwinGift` at all
(`qa.rewardCalls` stays empty across a full scripted session, which now also
proves the `isRewardOfferSuppressed` fold — §11.5/§11.9 — refuses the payout
rather than merely hiding the button); and `window.__analyticsSink()`
(§11.10's hook) reports `'none'`, never `'active'`, regardless of what
portal globals the stub defines — and, per §11.10's alias-swap fix, that the
built bundle itself never contains the real `analyticsSink.ts`'s
`gtag`/`dataLayer` literals (a grep on `dist/`, not an inference from
runtime behaviour).

**7. Replay-node check.** `__gotoNode` to an already-cleared node, win it:
assert no gift/Twin-Gift affordance appears (C24) **and** that
`markInterstitialShown`'s effect is still observable (the shared clock moved)
— i.e., a replay must not become a free way to dodge the pacing gate either.

`[S2]` for hooks 1–4 (need the FSM + chapter 1's boss); `[S2]`/`[S3]` for 5–6
(need the map); `[S3]`/`[S4]` for 7 (need a second node to replay into). None
of this replaces the existing gamepix/gamemonetize/crazy-web mute-and-pause
battery — it runs *in addition*, per scene.

---

### §11.16 Summary of new/changed exports (for §4's audit pass)

- `src/use/useChildDirected.ts` — **new file.** `CHILD_DIRECTED` constant.
  The one place the flag is read (M17a/I-17).
- `src/use/useAdGate.ts` — `isRewardOfferSuppressed` gains `|| CHILD_DIRECTED`
  (M17c/I-7 — the fix lives on the shared constant, not as a second guard on
  a consumer); `!isReplay` stays a separate, runtime-only term on
  `canOfferReward`'s render condition (§11.5). No change to the exported
  clock/limiter constants themselves (`FIRST_INTERSTITIAL_AFTER_MS`,
  `INTERSTITIAL_MIN_GAP_MS`, `REWARD_WINDOW_MAX`, `REWARD_WINDOW_MS` all stay
  F25's values).
- `vite.config.ts` — new `resolve.alias` branch: `@/use/analyticsSink` →
  `analyticsSink.childDirected.stub.ts` when `VITE_CHILD_DIRECTED === 'true'`
  (M17b/I-6). `src/use/analyticsSink.childDirected.stub.ts` — **new file**,
  a `probeSink()` that always returns `null`, mirroring the existing
  `analyticsSink.stub.ts`. `src/use/useAnalytics.ts` gains the
  `window.__analyticsSink` debug hook alongside `exposeAnalytics()` (§11.10).
- `src/use/useFirstLoadInterstitial.ts` — new export `firstLoadAdSettled():
  Promise<void>`.
- `src/use/useDuelRewards.ts`: **new file** (M21/I-23). It lifts the reward
  claim logic out of `GameScene.vue` into a shared composable whose exact API
  §4.15 defines. That logic is today's `onReward` / `rewardClaimed` /
  `rewardBloom` closure (`rewardBloom` replacing the pre-D3 `rewardCoins`,
  since the payload is now a bloom, not coins — §11.5). Only the map's Twin
  Gift component calls it; the loss beat has no caller at all (D3 removes its
  consolation offer entirely, §11.4 step 5).
  `maybeShowInterstitial` is NOT part of it: it stays in the duel controller
  and is called from the win/loss end-of-duel sequence (§11.3/§11.4, §4.9.3).
- `src/views/GameScene.vue` (becoming the duel-only controller per §4's M11
  restructuring) — loses the reward-claim closure entirely (moved above);
  `presentResult`'s `triggerHappytime()` / `gamePixHappyMoment()` calls move
  out of the win flourish to wherever the FSM signals the `unbox` beat's
  precedence-resolved trigger (§11.6); its QA debug block relocates to
  `AppScene.vue` per §4's M11 (§11.15.1).
- `tools/pack/pack.mjs` — new `--initial-extra` support for staged art
  (§11.13), new `--save-sample` flag (§11.12).
- `scripts/portal-qa.mjs` — new `--scene` / `--child-directed` flags, `qa.
  campaignPhase()` (reading `w.__campaignPhase` → `flow.scene`, I-28), `qa.
  happyCalls`, `qa.rewardCalls` (§11.15).
- No change to: `useQaAdTrigger.ts`, `DevAdProvider.ts`, `resolveAdProvider.ts`,
  `vite.config.ts`'s obfuscator-exclude list (none of the above are dynamic
  imports) — flag this to §4 as a thing to re-check once `useChildDirected.ts`/
  `useDuelRewards.ts` exist, in case either ever needs a dynamic-import
  exclusion of its own (neither should; both are static/composable modules,
  same shape as others already excluded or not).

### §11.17 Leaderboard (owner request, 2026-09-18 — as built)

A global leaderboard was added after the panel. It follows the `leaderboard-badge` skill: a Worker plus D1 in `worker/`, and `useLeaderboard`/`usePlayerIdentity` in the client.

- **Score:** lifetime duels won. **Flair:** furthest progress (from S2 the story node, `S.campaign.furthestNode + 1`).
- **Names:** minted only, `<Adjective> <Noun> <100-999>`, from a kid-safe vocabulary. The Worker refuses anything else, and there is no name field or portal username anywhere. This satisfies §2's no-free-text rule and Playables' ban on name entry.
- **Which builds reach the Worker:** only live builds (CrazyGames, GamePix, GameMonetize, GameDistribution, itch, Glitch, Wavedash).
- **Offline builds:** Poki, Yandex and Playgama/Playables have `VITE_LEADERBOARD_URL` empty. They make no call and bake a modelled histogram (`data/leaderboard-seed.json`) for the rank badge only: no rows, no list, no invented names.
- **CSP:** the Worker origin is folded into `connect-src` on live builds and omitted on Yandex.
- **UI:** the rank badge sits on the post-duel beat; tapping it opens the list on live builds.
  - [S2] It moves with the win beat when the result panel is replaced.
  - The list is a modal, so it takes the modal lock (§11.2): the bracket is not live while it is open.


---

## §12 Acceptance gates & playtests

> Dissent: I still think two verbs (duel, wipe) repeated 50 times is a real
> ceiling on this audience, and I'd have kept one non-duel node type in v1
> rather than betting the whole question on a mid-flight telemetry probe. I
> write §12 to the ruling below regardless — §12.7 is that probe.


### §12.1 Purpose, scope and assumptions

This chapter defines how the panel's rulings get **proven**, not what they
are. It sets, for every build stage in §1, a pass/fail bar a moderator or the
owner can actually run against a real build; it rewrites the three reviewer
personas from Round 1 as the reviews the shipped design should earn, with the
checks that earn them; it specifies the recurring reviewer-visible smoke
checklist; it specifies the kid playtest protocol, including how failed
strokes become §5's test data; it sets go/no-go telemetry thresholds; and it
carries the one open risk this panel owes the owner data on: whether
"duel + wipe, repeated" is enough variety through 50 nodes.

**Assumptions this chapter makes about chapters it does not own** (mandate
§4.5 — flag so the audit can check them):
- §1 owns the exact stage boundaries and names S0–S6; this chapter uses the
  ones ratified in the rulings record (rune spike, one sector, flow shell +
  chapter 1, chapters 1–3, chapters 4–10 in pairs, 2P, painted art) and
  assumes §1 does not rename or reorder them.
- §2 owns the exact age-band definitions. This chapter assumes three bands —
  **Band 1 ≈ 3–5 (pre-reader), Band 2 ≈ 6–8 (early reader), Band 3 ≈ 9–12
  (tween)** — for playtest recruiting only. If §2 defines different edges,
  renumber §12.5's recruiting table, nothing else changes.
- §7 owns telemetry schemas. Per §7.13 (canonical), this chapter keys its
  thresholds off `duel_end {nodeId, chapter, isBoss, won, durationMs,
  lossStreak}` and `wipe_complete {sectorId, chapter, isBoss, tool,
  durationMs, coverage85AtMs, coveragePct, strokeOrSweepCount, manualTo100,
  rescueFound}`, alongside the shared `recognition_attempt {success, rune,
  ec, turn, margin}` event. Two rates this chapter needs have no event of
  their own and are derived instead: a **mid-duel-quit** is a `duel_start`
  with no matching `duel_end`; a **wipe-abandon** is a `wipe_start` with no
  matching `wipe_complete` (§12.7). Also assumed: a session-level ad count
  (`ad_interstitial_shown`, §7.13).
- §6 owns the win-rate targets and the difficulty chain; §7.2 owns the
  canonical measured table. The target is two-part (the amended C13
  targets): **first attempt** — standard ≥ 90 % (chapters 1–6) / ≥ 85 %
  (chapters 7–10), boss ≥ 75 % (chapters 1–6) / ≥ 60 % (chapters 7–10);
  **cleared within 3 attempts** — ≥ 95 %, campaign-wide. This chapter only
  cites and gates on these numbers (§12.6).
- §5 owns the exact per-shape recognition envelopes and the ≥ 95 % /
  ≤ 5 % corpus bar; this chapter extends that bar with a second, harder
  bar for kid-sourced strokes (§12.5) and cites §5 as the owner of the fix
  when a shape fails it.
- §8 owns the 15 s standard / ≈10 s boss wipe-duration targets and the restoration loop's
  exact steps; §9 owns the mask budget (≤ 3 ms/frame standard, ≤ 4 ms/frame boss, §9.3.3) and "the reference
  low-end device" (this chapter names it only as a placeholder for §9 to
  fix); §10 owns dialogue volume and localisation process — this chapter
  assumes the project's existing i18n stress-test convention (German as the
  long-string case, alongside Arabic for RTL) carries over from Step 1; §10
  may override.
- §11 owns the exact ad sequence contract (§11 reflects the owner's F25
  pass); this chapter only audits against it.
- §4 owns the save schema and migration; this chapter only requires that
  round-trip tests exist for the states it cares about (mid-wipe, mid-duel,
  a pending Twin Gift).

**Non-goals** — deliberately not defined here, because another chapter owns
them: the underlying win-rate/HP/rate curves (§6, §7 tune them; this chapter
only gates on the resulting numbers); the exact telemetry field names and
storage (§7); the corpus files and per-shape envelopes (§5); whether a
non-duel node type is ever built (routed to owner data by this chapter's
§12.7, not decided here); the consent/ethics paperwork for minors in a
moderated test (a legal/process item, not a design one — flagged, not
written).

### §12.2 Per-stage acceptance gates (S0–S6)

Every gate below is a **demo** (something a moderator can watch or run) plus
a **pass/fail bar** (a number, not a feeling). A stage does not close until
its bar is met or the moderator records an explicit, dated waiver with a
reason.

#### §12.2.1 S0 — rune spike + frozen-corpus test

- **Demo:** run §5.10's frozen-corpus regression test
  (`tests/duel/rune-corpus.test.ts`, backed by the committed
  `tools/rune-spike/` harness per M18) against (a) the four shipped runes
  and (b) every "new rune" shape scheduled for chapters 1, 2, 3 and 5 per
  §5's chapter table (chapters 4, 8 and 9 use Signature Spells or a
  fragile shape and are covered under §12.2.5 or explicitly waived here,
  see below).
- **Pass:**
  - The four frozen runes score **100 % bit-identical** accept/reject/
    classification against the pre-change baseline snapshot. Any diff at
    all is a fail — this is a regression gate, not a statistical one.
  - Each new shape clears **≥ 95 %** recognised on a ≥ 300-stroke sloppy
    corpus, with **≤ 5 %** false-accept into or out of any frozen class.
  - **Circle (Water)** additionally passes the "accidental scribble" turn
    ceiling described in §5.
  - **Hourglass, Star and Heart** (chapters 7, 9, 10) are measured here too
    if §5's corpus is ready; if not, S0 closes on the four shapes above and
    the other three repeat this exact gate before their own chapter enters
    S4 build.
- **Fail → action:** a shape below bar does not block S0 by itself. It is
  downgraded to a Signature Spell for that chapter (per §5/§6's existing
  fallback) and the chapter table in §5 is amended. S0 fails only if the
  *frozen four* regress, or if *zero* of the four scheduled new shapes pass.
- **Scope tag:** [S0]

#### §12.2.2 S1 — one wipe sector end to end

- **Demo:** a single sector runs gift-drop → unbox → colour-me pick (§8.7:
  right after unbox, before the wipe) → restore view → wipe →
  85 %-threshold auto-complete → reveal → permanence
  (windmill/waterfall animation state flips on), using the real mask/coverage
  tech from §9 and the durations from §8.
- **Pass:**
  - Wipe duration lands in the **12–20 s** band (§8's standard target ± its
    stated tolerance) across ≥ 10 timed passes.
  - Mask frame cost stays ≤ **3 ms/frame** (standard sector) on §9's reference device; the boss sector's ≤ 4 ms is gated at S2, where the first boss ships.
  - The done-bitset and the one-in-progress-sector coverage grid round-trip
    through a save + reload with **zero** corruption across ≥ 10 cycles.
  - The colour-me pick persists after reload (1 byte/sector, per §8).
- **Scope tag:** [S1]

#### §12.2.3 S2 — flow shell + chapter 1

- **Demo:** cold boot → first-launch tutorial dialogue → node 1 duel → win →
  gift drop → map → wipe → … through chapter 1's boss and its thank-you
  beat, all nine flow steps §3 specifies, in order, on a fresh save; then a
  second run that force-quits mid-wipe and relaunches.
- **Pass:**
  - All nine flow steps appear, in order, on 3 of 3 cold-boot runs.
  - The relaunch resumes exactly at the interrupted wipe, at its saved
    coverage, per §4/§9's persistence contract.
  - The gameplay bracket (§4/§11) is live only during duel and wipe; every
    other surface (map, dialogue, gift/unbox, wardrobe, spellbook) is
    outside it.
- **Scope tag:** [S2]
- **Result (2026-09-18):** passed, on the dev build, in a fresh browser
  profile for each run, on real input. The driver is in the session
  scratchpad (`s2-flow.mjs`).
  - **Flow.** 3 of 3 cold boots — two at 1280 × 720 with a mouse, one at
    320 × 658 with touch — ran every step in order, through the 1-5 boss,
    its thank-you, the chest, the Sunbeam and the wardrobe admire. Each
    ended with all five sectors restored.
  - **Along the way:**
    - a loss, then the doze, then Retry at Dream Dust 0.92;
    - a replay with no dialogue and no gift;
    - a Twin Gift hold that played the (dev) rewarded ad and bloomed 1-1;
    - Leave Duel from Options.
  - **Relaunch.** Killed mid-wipe with no unload flush, then relaunched from
    storage: the map with the gift waiting; a tap resumed the interrupted
    wipe with its saved cells (§8.16's half-brushed bitset included).
  - **Bracket.** Sampled at 45 points per run: live in the duel's fight and
    the wipe only; off in the dialogue, on the map, at the gift, in the
    admire, in the wardrobe, under Options, during the flourish and the loss
    beat, and during the rewarded ad.
  - **Health.** No console errors.

#### §12.2.4 S3 — chapters 1–3, portal-ready (the release candidate)

This is the gate with teeth: the first build a real portal curator, a real
parent and a real kid could plausibly meet. Everything in §12.3–§12.7 is
written primarily against this gate, then repeated at S4 and S6 as noted.

- **Demo:** chapters 1–3 (15 nodes, 3 bosses) played start to finish on an
  actual portal build (§11), (a) muted, (b) in Arabic, (c) at 320×658
  portrait, plus the node-12 fatigue probe (§12.7) and a kid playtest
  cohort (§12.5).
- **Pass:** ALL of — the three target reviews' concrete checks (§12.3) pass;
  the reviewer-visible checklist (§12.4) passes at every listed condition,
  including its candy-palette check (dust ≤ 20 % saturation, restored
  ≥ 70 % saturation per §9.6, sampled on every S3-scope sector); the
  go/no-go thresholds (§12.6) are met, or the moderator records an explicit
  dated waiver naming which threshold is waived and why.
- **Scope tag:** [S3]
- **Engineering result (2026-09-19):** the parts of this gate a build can
  prove are green.
  - **Portal QA:** `qa:portal`, extended per §11.15, passes on GamePix,
    GameMonetize (dummy id), CrazyGames pre-release and full release, and
    plain web. It covers:
    - the bracket per scene;
    - happytime at the unbox;
    - the Twin Gift's 1.2 s threshold;
    - C30.
  - **Size:** `build:all` is within every budget (archives 300–470 kB).
  - **Candy floor:** 15/15 sectors — dust saturation 11–12 %, candy share
    22–52 %, median ΔL 39–58.
  - **Playthrough:** a full 1-1 → 3-5 run, in landscape and in 320 × 658
    portrait, with no console errors.
  - **Still to do before submission** (human work):
    - the kid playtest (§12.5);
    - the fatigue probe (§12.7);
    - the three target reviews (§12.3);
    - the real portal ids.

#### §12.2.5 S4 — chapters 4–10, in pairs

- **Demo:** each pair (4–5, 6–7, 8–9, 10) repeats §12.2.1's corpus gate for
  any new rune or Signature Spell scheduled in that pair, then a full
  playthrough of the pair.
- **Pass:**
  - Corpus bar as in S0, for anything new in the pair.
  - §7.2's amended two-part targets measured from `duel_end` telemetry
    (§7) before the *next* pair enters build: first attempt — standard
    ≥ 90 % (chapters 1–6) / ≥ 85 % (chapters 7–10), boss ≥ 75 % (chapters
    1–6) / ≥ 60 % (chapters 7–10), AND "cleared within 3 attempts ≥ 95 %"
    (§7.4) for every node. After §6.21's tuning, all 20 rows of §7.2 meet
    the first-attempt floors in simulation. This gate re-checks them from
    real telemetry at the pair that contains them. §6/§7 own the fix if a
    row misses; this chapter only gates on it.
  - Each pair repeats the fatigue probe (§12.7) at its own midpoint node
    (e.g. node 22 for the 4–5 pair), building the longitudinal series
    §12.7 needs.
- **Scope tag:** [S4]

#### §12.2.6 S5 — 2P versus

- **Demo:** entry through the `versusSetup` scene (§3/§4's scene enum),
  then two simultaneous pointers, split-screen, landscape, ≥ 900 CSS px
  wide; a portrait build shows the "turn sideways" prompt instead.
- **Pass:**
  - Zero pointer-routing cross-talk (a stroke on side A never registers on
    side B) across 20 test duels with two independent input sources.
  - Both sides show the full unlocked kit.
  - A viewport below 900 px never renders a broken half-UI; it shows the
    prompt cleanly (§3 owns the exact prompt).
- **Scope tag:** [S5]

#### §12.2.7 S6 — painted art

- **Demo:** the art-override pass live against the current build, A/B-able
  against the procedural fallback; one sheet deliberately withheld to prove
  the fallback holds.
- **Pass:** every new character/rune/cosmetic asset clears `art-style.md`
  §8's five readability checks (silhouette, greyscale, line-weight, detail
  budget, kid test); the withheld sheet's scene renders correctly on the
  procedural fallback, not blank and not crashed.
- **Scope tag:** [S6]

### §12.3 The three target reviews, and the checks that earn them

These are Round 1's three reviewer personas, rewritten as the reviews the
ruled design *should* earn once §3–§11 are built to spec. Each is followed by
the concrete, checkable items a moderator runs at **S3** (and again at S4/S6)
to confirm the review is earned rather than assumed.

#### §12.3.1 The parent reviewer (kids'-app review site) — target ★★★★★/☆

> "My four-year-old plays this by herself. She can't read yet, but she
> always knows what to do, because the faces tell her — the shadow puff
> looks sleepy, the gift glows, the wipe sparkles. She drew a wobbly circle
> and the game understood 'bubble' first try; when a harder shape didn't
> work, the game just let her win with fire and wind instead, so she never
> got stuck. Losing shows a sleepy animal, never a red 'DEFEATED'. Nothing
> asked her to watch a video to get something she needed, and nothing on
> screen mentions her age."

**Checks:**
1. A Band-1 playtester (§12.5) completes chapter-1 nodes 1–5 with **zero**
   adult reading any bubble aloud; record assist count (target: 0–1 across
   the chapter).
2. Circle/Leaf/Spiral (chapters 1–3's new shapes) clear **≥ 90 %** on the
   *kid-sourced* corpus specifically (§12.5/§12.6), not only the synthetic
   one §5 measured in Round 1.
3. A Band-1 tester who only ever draws the 4 base runes still wins standard
   nodes at ≥ 90 % (§7.2's chapters 1–6 tier of the amended target; the
   "no duel ever requires a new rune" guarantee, owned by §6, gated here).
4. String/visual audit of the localised S3 build: zero instances of
   "DEFEATED" or an unshielded red damage flash without the soft-loss
   framing (§10 owns the copy; this is the grep + eyeball check).
5. Fast-tap-only input simulation (no 1.2 s hold) never opens the Twin Gift
   (§11 owns the gate; this is the negative test).
6. Manual UI audit of the S3 build: no countdown, streak, energy meter or
   FOMO badge anywhere, regardless of the `VITE_CHILD_DIRECTED` flag's state
   (§2's unconditional rule).

#### §12.3.2 The portal QA/curator — target: featured

> "The listing promises a cozy wipe-and-collect loop, and the first thirty
> seconds deliver exactly that: duel, win, watch the gift drop in the arena,
> then a map that looks hand-touched. There's no currency anywhere in it —
> no jar, no shrine, nothing to grind for — just the loop itself, and a
> garden that quietly blooms the further you get. Ads land only where the
> SDK requires and nowhere else. It holds up muted, in Arabic, and on the
> smallest supported phone. I'd feature it."

**Checks:**
1. First-30-seconds capture (§12.4) matches the pitch: the gift visibly
   drops in the arena **before** any interstitial (§11); no shop panel
   renders at any point in the S3 build (runtime check, not just a code
   read).
2. Ad-sequence audit against §11's contract: interstitials fire only after
   a win or loss beat, never during dialogue, unbox, wipe, reveal or the
   wardrobe (zero occurrences in QA is the bar — a single occurrence fails
   this check outright); the first-load ad resolves before the first bubble
   types (§11).
3. Arabic build: map stays LTR, bubble text flows RTL, nothing clipped or
   mirrored wrong (§10/§3).
4. 320×658 portrait: every interactive element tappable, nothing overlapping,
   at the stated hard-reality floor.
5. Muted playthrough: a full duel → wipe → reveal cycle is understandable
   and satisfying with device audio off.
6. Twin Gift payload audit: confirm by data inspection that its payload is
   bloom-only in every build (D3) — a single permanent cosmetic bloom grant
   for the sector, never a coin, a rank, a rune or any other form of power
   or progress (§11's rule, §4's data check).
7. Twin Gift win-only audit: play every S3-scope node to a loss and confirm
   the offer never appears on the loss beat. A single loss-beat appearance
   fails this check outright, regardless of the `canOfferReward` limiter's
   state (§11).
8. Twin Gift once-per-sector audit: claim a sector's bloom, then save,
   reload and re-clear that sector — the offer never reappears for that
   sector again, verified against the `blooms` save bitset (§4) directly,
   not only against the UI (a UI-only pass could hide a bitset that still
   allows a re-offer).
9. Twin Gift limiter audit: with `canOfferReward`'s 6-per-5-min budget
   exhausted, a win withholds the offer cleanly — no broken prompt, no
   silent crash, no fallback UI. Withholding on a win is a pass, not a
   fail; the limiter may only ever subtract an offer from a win, never
   grant one on a loss.
10. Twin Gift cosmetic-only audit: snapshot HP, damage tables and unlock
    state before and after claiming a bloom — the only diff anywhere is
    that sector's rendered prop layer (extra critters/flowers + a gentle
    sparkle, via the capped prop system, §8/§9); no currency, damage or
    unlock field moves at all.

#### §12.3.3 The cozy-games YouTuber — target: a good-faith, unpaid feature

> "The wipe still feels good at node 40, not just node 4 — the tools change,
> and the reveal always lands on something worth looking at, a landmark I
> got to pick the colour of. Every boss ends with a real thank-you beat, and
> cosmetics get their own close-up in the wardrobe tent, so my 'look what
> she's wearing' shots actually show the thing. The ending isn't a stat
> check — it's the first time I fight the character I've been hearing about
> since chapter one, and it lands."

**Checks:**
1. The node-12 fatigue probe (§12.7) shows no engagement drop past the
   no-go bar in §12.6 — or, if it does, a documented mitigation (tool
   variety, colour-me cadence) is shown to close the gap before ship.
2. Admire-moment audit: every wardrobe slot item is legible — not sub-64 px
   effective silhouette — in the tent close-up and the boss-win close-up
   (§3/§9 own the render; this is a manual screenshot pass at S3).
3. Boss thank-you beat present for all three S3-scope bosses, at the
   2-bubble minimum (§10).
4. Foe-table audit: only "shadow puffs" (or the chapter's themed foe skin)
   appear as opponents in chapters 1–3; no build path lets the player fight
   the chapter-10 boss identity early (§6's cast table, checkable now even
   though the fight itself ships at S4).
5. Colour-me landmark present and visually distinct per sector across all
   15 S3-scope sectors — not the same asset re-hued (§8/§9).

### §12.4 Reviewer-visible checklist

A short, repeatable smoke pass. Run it at every S3+ build, and whenever §7's
telemetry disagrees with what a human tester sees.

**First 30 seconds** (cold boot, no save)
- [ ] Time to first meaningful interaction (a drawable prompt) ≤ 10 s,
  excluding a due first-load ad.
- [ ] First dialogue bubble is legible without reading (pictogram + emote).
- [ ] No on-screen string names an age, "kids" or "girls" (§2's D1 default).
- [ ] A due first-load ad covers a calm, unfinished arena, never a
  half-typed bubble (§11).

**First 5 minutes** (chapter 1, nodes 1–5 — §7's measured ≈ 5.7 min)
- [ ] Chapter 1 completes using only the 4 base runes, at the eased
  onboarding rate (§6), without external help.
- [ ] At least one full gift → unbox → wipe → colour-me → reveal cycle
  completes.
- [ ] The chapter-1 boss thank-you beat plays.
- [ ] No non-first-load ad plays before 240 s elapsed (§11's grace).

**Node-12 fatigue probe** — see §12.7 for the full instrument; the smoke
version is: [ ] per-node engagement telemetry is being captured at nodes
2, 7, 12 at minimum, and [ ] a moderated playtest session has reached
node 12 with an affect log.

**320×658 portrait**
- [ ] Duel HUD, map, wardrobe, dialogue and both end-of-duel beats render
  with zero clipped or overlapping interactive elements.
- [ ] The restore view's brush contact radius still meets its 36 CSS px
  floor (§8) at this width.
- [ ] The drawing pad still meets its 96 px floor (the existing layout
  constant).

**Arabic**
- [ ] `<html lang="ar" dir="rtl">`; the map layer itself stays LTR while
  text flows RTL (§3).
- [ ] No bubble text clips, overlaps its pictogram, or mirrors incorrectly.
- [ ] Rune, spell and element names render without mixed-script artefacts.

**Muted play**
- [ ] Every ad-adjacent beat (interstitial, Twin Gift) is understandable
  with device audio off.
- [ ] Wipe completion is legible from sparkle/visual feedback alone; chime
  is a bonus, never required (extends §2's haptics-off rule to audio-off).
- [ ] Recognition feedback (a rejected stroke) is visible, not only audible.

**Candy palette (dust vs. restored)**
- [ ] Sample a fixed pixel grid over each sector in its dust state: mean
  saturation ≤ 20 % (§9.6's theme rows).
- [ ] Sample the same grid once restored: mean saturation ≥ 70 %.
- [ ] Run this on every S3-scope sector (15) at S3; on at least one sector
  per chapter thereafter, at each S4 pair and at S6.

**No currency UI** (D3 — the currency is removed entirely, not hidden)
- [ ] No coin count, jar-fill meter or coin-burst VFX renders anywhere in
  the build, on any screen, at any point in a full campaign playthrough.
- [ ] No Rune Shrine, and no path to one, exists on the map or anywhere
  else.
- [ ] No element-rank UI (a buyable tier, a rank badge, a `rankPrice`
  prompt) is reachable by any input path.
- [ ] `DuelResult.vue` renders no shop panel, under any flag state.
- [ ] Nothing on screen implies a currency exists to earn, spend, or check
  a balance of — a straightforward "does not exist" gate, not a
  hidden-UI gate.

### §12.5 Kid playtest protocol

**Bands** (assumed from §2; see §12.1): Band 1 ≈ 3–5, Band 2 ≈ 6–8,
Band 3 ≈ 9–12.

**Session shape:**
- 5–10 minutes per child, single sitting, one session per child per gate.
- A moderator/parent is present but does not assist unless the child is
  stuck for ≥ 30 s — the test measures *unassisted* play, because that is
  the design's own bar (a 3-year-old completing a loop alone).
- Recruit **≥ 6 children per band per gate** at S0, S3, each S4 pair and
  S6. This is a small-sample, qualitative instrument, not a statistically
  powered study — treated that way in §12.6.

**What gets recorded, per session:**
- Every stroke attempt: raw point path, the shape the child was asked/
  intended to draw, the recogniser's actual output, `ec`, turn, and margin
  — i.e., exactly the fields in §7's `recognition_attempt` event, logged
  manually if the build isn't instrumented yet.
- Time-to-first-successful-cast, per node.
- An affect log: every pause > 5 s, every "what do I do?", every visible
  frustration, each timestamped to its node/screen, on a 3-point scale
  (engaged / neutral / frustrated).
- Completion status per session goal: unassisted / partially assisted /
  fully assisted.
- Free-text notes on any UI misread (e.g., a Band-1 child tapping the Twin
  Gift expecting it to be the main gift).

**Consent/process note (flagged, not specified here):** standard parental
consent for a moderated test with a minor, minimal data retention, no
face/voice recording beyond what the affect log needs. This is a legal/
process requirement outside this chapter's scope; §2 or the owner should
confirm the actual paperwork before the first Band-1 session.

**Feeding §5's corpus:** every stroke logged above that the recogniser
**rejected or misclassified** is appended to §5's shape-specific test
corpus, tagged `source: kid-playtest, band: <n>`. This matters because
every existing pass bar in §5/§1's rulings (≥ 95 % recognised, ≤ 5 % false
accept) was measured against a synthetic "sloppy stroke" corpus, not actual
child strokes — the kid-playtest corpus is the first real evidence for or
against those bars. A shape whose kid-corpus pass rate falls below **90 %**
(a 5-point discount under the synthetic bar, since real strokes are noisier
than any simulation) triggers a §5 review — envelope retune, or downgrade to
a Signature Spell — before the next stage opens for that chapter.

### §12.6 Go/no-go metric thresholds (citing §7's telemetry)

Applied at **S3** as the ship/no-ship bar for the release candidate, and
re-applied at each **S4** pair before the next pair starts building.

| Metric | Source | Threshold | No-go if |
|---|---|---|---|
| Per-shape recognition, synthetic corpus | §5 | ≥ 95 % accept, ≤ 5 % false-accept | any in-scope shape below bar with no Signature-Spell fallback assigned |
| Per-shape recognition, kid corpus | §7 `recognition_attempt` + §12.5 | ≥ 90 % accept | below 90 % for two consecutive playtest cohorts |
| Standard win rate, first attempt | §7.2 / `duel_end` | ≥ 90 % (ch 1–6), ≥ 85 % (ch 7–10) | below the applicable figure for any chapter |
| Boss win rate, first attempt | §7.2 / `duel_end` | ≥ 75 % (ch 1–6), ≥ 60 % (ch 7–10) | below the applicable figure for any chapter |
| Cleared within 3 attempts, all nodes | §7.4 / `duel_end.lossStreak` | ≥ 95 % | below 90 % — the Dream Dust safety net (§7.4); every node must also hold its first-attempt floor above |
| Node-12 (and later midpoint) fatigue | §12.7 | see §12.7 | ≥ 3× the node-2 baseline mid-duel-quit or wipe-abandon rate — this alone is a no-go, independent of the softer revisit trigger in §12.7 |
| Ad-placement compliance | §11/§7 ad log | 0 occurrences outside the allowed windows | any single occurrence in QA |
| Wipe mask frame cost | §9.3.3 | ≤ 3 ms/frame standard, ≤ 4 ms/frame boss, reference device | p95 exceeds it |
| Save round-trip | §4 | 0 failures / ≥ 50 cycles (mid-wipe, mid-duel-boot, pending-Twin-Gift states) | any failure |
| Legacy currency-field migration | §4 | `am_coins`/`am_upgrades` read once on the first post-D3 load, then dropped from the save; zero errors | either field persists after the first successful load, or the read throws |
| Localisation | §10 | 0 clipped/overlapping strings, Arabic + the project's long-string stress locale | any occurrence at 320×658 |

Ownership note: §6 and §7 own retuning the underlying curves when a
threshold is missed. This chapter only sets the ship bar and who is on the
hook when it isn't met.

### §12.7 The node-12 fatigue instrument

This directly answers the one item this panel did not resolve by ruling: is
alternating duel and wipe, through 50 nodes, enough variety on its own. It is
not re-argued here — it is **instrumented**, so the question can be reopened
with data instead of opinion.

- **Why node 12 specifically:** node 12 is the second node of chapter 3, the
  first chapter boundary *inside* the S3 release candidate that isn't a
  brand-new chapter's own novelty (chapter 3 itself opened at node 11 with a
  new tactic and shape). It is the earliest point where "is this still
  fresh" can be asked without a new-chapter halo effect contaminating the
  answer.
- **Why node 12 alone is not enough, and what replaces it:** a single node
  cannot separate "duel repetition fatigue" from "this particular chapter's
  pacing" or "ad frequency that day" (see §12.8). The instrument is
  therefore **longitudinal**, not a single sample:
  - Telemetry (§7.13) captures `duel_start`/`duel_end` and `wipe_start`/
    `wipe_complete` at **every** node. This chapter derives its two rates
    from their pairing — a **mid-duel-quit** is a `duel_start` with no
    matching `duel_end`; a **wipe-abandon** is a `wipe_start` with no
    matching `wipe_complete` — and its dashboard specifically compares
    nodes **2, 7, 12, 17, 22** (one per chapter, chapters 1–5) as a single
    trend line per cohort.
  - The moderated kid playtest (§12.5) collects the 3-point affect rating
    immediately after node 12 specifically, plus the same rating at node 2
    for the same child earlier in the same or a prior session, so the
    comparison is within-child where possible.
- **Signal (soft — triggers a design revisit, not a stop):**
  - Node-12 mid-duel-quit rate or wipe-abandon rate ≥ **1.5×** the
    node-2 baseline, in aggregated telemetry from a real cohort; OR
  - ≥ **20 %** of band-appropriate playtesters describe the loop as
    "same"/"boring" unprompted by node 12.
  - Either trips a design review of the non-duel-node-type question this
    panel rejected for v1 — reopened with the data attached, not reopened
    on schedule.
- **Signal (hard — a no-go for S3):** ≥ **3×** the node-2 baseline on
  either metric. This is severe enough that it is a ship blocker on its
  own, independent of whether a redesign is scoped in time; see §12.6's
  table.
- **What this instrument cannot tell you (flagged for the moderator):**
  it cannot, by itself, separate "the duel repeats" from "the ads are too
  frequent that session" or "chapter 3's new tactic is unbalanced." §12.8
  names the confound and the mitigation.

### §12.8 Risk watchlist

- **Ad frequency vs. duel repetition, confounded.** The owner's ad cadence
  (§11) is time-based only and can reach a high hourly count in a long
  session (flagged to the owner as an open decision in §13). If §12.7 shows
  a fatigue signal, tag sessions by ads-seen-count before concluding it is
  the duel loop's fault — otherwise a monetisation decision gets blamed on
  a content decision, or vice versa.
- **Kid-sourced corpus arrives late, by construction.** S0–S2 will ship on
  synthetic-corpus evidence only, because no kid playtest has happened yet.
  This is accepted, not hidden: §5 should expect numbers to move once real
  Band-1 strokes arrive at S3, and should not be surprised when they do.
- **The Twin Gift's press-and-hold gate is untested against small hands.**
  Its duration was set by design reasoning, not measurement. Add a
  targeted Band-1 probe at S3: too short and it doesn't gate anything, too
  long and a legitimate player reads it as broken.
- **Chapter boundaries can mask or fake a fatigue signal.** Chapter 3 opens
  with new material at node 11, one node before the probe point. The
  longitudinal, multi-chapter sampling in §12.7 exists to control for this;
  a single-node reading would not be trustworthy on its own.
- **The three target reviews (§12.3) are aspirational, not the gate.** If
  a build meets every §12.6 threshold but a playtest cohort still reports
  low engagement, or meets every review's checklist item but misses a
  threshold, **§12.6 wins**. §12.3 is diagnostic colour for *why* a number
  moved, never a substitute for the number.


---

## §13 Open decisions (owner only)

Everything in §1–§12 is buildable as written. The spec proceeds on a stated
default for each decision below, so no stage waits on an answer. Each entry
gives:
- the question;
- what the spec assumes meanwhile;
- what breaks if the assumption is wrong;
- what reversing it would cost.

### §13.1 D1 — Positioning: "made for kids 3–12" or "all-ages cozy"? — **RESOLVED (owner, 2026-09-18)**

- **Ruling:** "all-ages cozy, family-friendly". This confirms the spec default.
- **Why it was a real fork.** The GDD targets 3–12-year-old girls. Two portals
  forbid, or do not monetise, exactly that:
  - **YouTube Playables**, which ships inside the Playgama archive. Its trust &
    safety requirement 1.2 says content "MUST NOT specifically target kids, or
    be 'made for kids'" and "MUST be suitable for the general audience (Age
    13+)".
  - **CrazyGames**' main site is for ages 13+ and requires PEGI 12. Under-13s
    are routed to kids.crazygames.com, where monetisation is off. Poki Kids is
    ad-free too.
  - A child-directed game on Google-served ad stacks must run non-personalised
    ads and must not feed third-party analytics (COPPA "actual knowledge").
- **As ruled (the spec default, now final).**
  - Design for children *unconditionally*: every safety rule in §2 holds either
    way.
  - *List* the game as "all-ages cozy, family-friendly". No player-facing
    string or listing says "kids", "3–12" or "girls".
  - `VITE_CHILD_DIRECTED=false` by default; the flag stays as an option.
- **If you later choose "made for kids".** Set `VITE_CHILD_DIRECTED=true`
  (behaviour in §2 and §11). This:
  - removes the rewarded surface and the Playgama target;
  - requests non-personalised ads;
  - kills the gtag sink.

  Expect lower eCPM and no Playables distribution.
- **Also covered by this decision.**
  - The "aimed at young girls" line in `art-style.md` §9, which is the image
    model's master prompt.
  - The "girls" framing in `story-GDD.md`.

  `art-style.md` was updated on 2026-09-18 after the ruling. Its audience line
  and master prompt now say "cozy, family-friendly, all ages". `story-GDD.md`
  is the owner's own document and is left as written.
- **Reversal cost:** one flag, listing copy, and one line in the art prompt.

### §13.2 D2 — Release at S3 (chapters 1–3) or at chapter 10? — **RESOLVED (owner, 2026-09-18)**

*(Engineering for the S3 release: done 2026-09-19, §12.2.4.)*

- **Ruling: ship at S3 — §1.8 Option A.** Chapters 1–3 are v1, released the
  moment S3's exit demo (§12.2.4) passes, in the procedural art. Chapters
  4–10 (S4), 2P (S5) and the painted art (S6) follow as free content updates,
  each behind its own `released` flip. S3 is therefore the build that goes to
  every portal's QA, not a rehearsal.
- **Status before the ruling:** the default below.
- **Spec default.** S3 is built to be release-ready: portal QA green and the
  wipe, map, spellbook and wardrobe all complete for chapters 1–3.
  Chapters 4–10 sit behind `released: false`.
- **Trade-off.**
  - **Release at S3:** real telemetry from the recognition, wipe and difficulty
    events (§7) starts tuning chapters 4–10 while they are built.
  - **Release at 10:** a complete story on day one, but ~6 more stages of
    building blind.
- **Reversal cost:** none. It is a flag list.

### §13.3 D3 — Currency: keep it diegetic, or remove it as the GDD says? — **RESOLVED (owner, 2026-09-18)**

- **Ruling: remove the currency entirely.** This reverses the spec's former
  default (one diegetic currency) and supersedes the coin part of the owner's
  ads pass (F25's "×2 coins after every duel"). The story build has no coins,
  no coin jar, no coin burst out of gifts, no Rune Shrine, and no element
  ranks (`RANK_BONUS` / `rankPrice` / `buyRank` are not used in the story
  build). Poki's single-currency rule is satisfied trivially: there are zero
  currencies.
- **The conflict this settles.**
  - The GDD said "bypass complex UI currencies entirely".
  - The owner's ads pass (2026-09-18) had built the rewarded offer on coins:
    ×2 after a win, +coins after a loss.
  - Removing the currency honours the GDD; the rewarded offer moves to a
    cosmetic bloom instead (below), and the loss-side offer is dropped
    outright — see D8.
- **As built (the spec, now final).**
  - No coins, coin jar, coin burst, Rune Shrine, or element ranks anywhere in
    the story build.
  - `am_coins` and `am_upgrades` are read once by the Step-1 migration and
    dropped (no build has been released, so there is no live-save
    compatibility burden).
  - Difficulty is unchanged: the curve already meets every target with zero
    ranks, so removing ranks costs nothing there.
  - The rewarded "Twin Gift" now pays a **bloom**, not coins: offered on the
    map right after a sector's reveal, beside the restored sector, win-only
    (a loss has nothing to bloom). One bloom per sector, ever (50 at most). It
    is a permanent cosmetic bloom — extra animated critters and flowers plus a
    gentle sparkle, through the existing capped prop system — and grants no
    power and no progress. The 1.2 s press-and-hold gate, the film-strip
    glyph, and `canOfferReward`'s 6-per-5-min limiter are unchanged. See §3,
    §6, §7, §8, §9, §11 for the reworked mechanics, save shape, telemetry and
    i18n.
  - There is no rewarded offer on a loss, and no loss-beat consolation offer
    of any kind (see D8).
- **Reversal cost:** re-adding a currency later costs about one stage of UI
  (jar + shrine + shop), a §7 income/price retune, and a save-schema bump; it
  is not a short revert.

### §13.4 D4 — The rune alphabet (the GDD's shapes, reshaped) — **RESOLVED (owner, 2026-09-18)**

- **Ruling:** accept the reshaped runes as the spec lays them out below.

The recogniser measurements in §5 force these departures from the chapter
table:

| Chapter | GDD shape | Spec | Why |
|---|---|---|---|
| 2 Water | Circle O | **kept, conditionally** | A circle is safe against the four shipped runes by construction. It must still pass the S0 gate (§5). If it fails: Water = spiral, and Lightning becomes a Signature Spell |
| 4 Crystal | Diamond ◇ | **Signature Spell** (a named recipe of owned runes) | ◇ is the same gesture as EARTH's □ (99.7 % measured) |
| 5 Illusion | Zigzag Z | **Infinity ∞** | Z is ICE, shipped and signed off |
| 7 Time | Hourglass X | **kept** (true-outline bowtie), fragile | 92.7 % safe; fallback = Signature Spell |
| 8 Frost | Cross + | **Signature Spell** | + is two strokes. Every one-stroke version collides with FIRE (~99 %) or is unrecognisable |
| 9 Moon | Crescent C | **5-point star ☆** | C is the same gesture as Rainbow's ∩ |
| 10 Love | Heart ♡ | **kept**, with a sharper cusp | A smooth heart reads as WIND 74 % of the time. S0 iterates it; the finale cannot drop it |

- **Dropped.** §5's separate list (Light, Water ▽, Lightning Z, Crystal ◇,
  Cosmic ∞). Its ∞ became the Mirror rune.
- **If you want an exact GDD shape back:**
  - ◇ and C need the orientation-bounded matching the spec deliberately does
    not fund in v1. That is ~20 lines, but it weakens rotation forgiveness for
    those runes.
  - + and X need multistroke input, which delays EVERY rune's snap by ~350 ms.
- **Reversal cost:** re-run the S0 spike for any swap.

### §13.5 D5 — Two players: versus, co-op, or both? — **RESOLVED (owner, 2026-09-18)**

- **Ruling:** 2P versus at S5, as the spec default below.
- **Spec default.** Chapter 10 unlocks simultaneous **versus** (the GDD's own
  line), built at S5.
  - Landscape only, ≥ 900 CSS px wide; each player draws on their own half.
  - Until S5 ships, chapter 10's reward is the Festival plus Umbra wandering
    the map as a friend.
- **Open.**
  - A parent-and-child **co-op** mode: two players vs a boss, sharing HP.
    It is gentler for the stated audience.
  - Whether 2P should unlock earlier than chapter 10.
- **Reversal cost.** S5 is independent. Co-op reuses the same split input and
  adds one mode rule set (§6).

### §13.6 D6 — Voice — **RESOLVED (owner, 2026-09-18)**

- **Ruling:** synthesized babble voice only, as the spec default below.
- **Spec default.** No recorded voice-over. Characters "speak" in a synthesized
  babble (§10) generated by the existing audio engine: zero bytes and zero cost
  per locale. Bubbles carry the meaning in portrait + emote + pictogram; text
  is a reading bonus.
- **If you want real narration:**
  - it costs ~$10–30k for 21 locales, and several MB;
  - it breaks the size discipline;
  - on Poki and Playables it must be bundled, never streamed.
- **Reversal cost:** additive, any time.

### §13.7 D7 — Umbra is only fought at the very end — **RESOLVED (owner, 2026-09-18)**

- **Ruling:** Umbra is fought only at node 10-5, as the spec default below.
- **Spec default.**
  - Umbra appears in dialogue from chapter 1 as the lonely, sleepy dust-caster.
    You duel her **shadow clones**, as the GDD itself says.
  - You face her only at node 10-5 (chapter 10's boss), and befriend her.
  - Chapter 1's foes are "shadow puffs".
  - The jam build's rung-0 Umbra duel is retired from the story.
- **Reversal cost:** data and dialogue only.

### §13.8 D8 — Ad load for a kid-friendly game — **RESOLVED (owner, 2026-09-18)**

- **Ruling:** keep the owner's ad cadence exactly as set — interstitials after
  wins and losses, 240 s grace, then ≥ 121 s apart, time-only. No session cap.
  (The D3 removal of the currency drops the loss-side *reward* offer, not the
  loss-side *interstitial* — interstitials after wins and losses stand as F25
  set them.)
- **Spec default (now final).**
  - interstitials after wins and losses;
  - none in the first 240 s;
  - then ≥ 121 s apart, time-only;
  - no per-session cap.
- **The concern that was considered and set aside.** At ~1 minute per node,
  that allows up to ~28 interstitials in an hour-long session (§7 gives the
  modelled per-session count). The owner ruled to keep the cadence anyway.
- **Reversal cost:** one constant in `src/use/useAdGate.ts`.

### §13.9 Items the spec decided that you may want to overrule

These are not blocking. They are listed so none of them surprises you:
- **No currency at all, per D3.** There is no coins/rank shop on the result
  screen, and no shrine or jar either — the game has zero currencies (§3,
  §7, §8, §9).
- **Runes are recognised only once earned** (§5). Drawing a heart in chapter
  1 gets the gentle "not a rune yet" nudge, not a spell. That keeps the
  active alphabet small and accurate for young hands.
- **Every node is a duel.** There are no puzzle or dress-up node types; fatigue
  is measured in §12 before revisiting.
- **The wipe has no skip.** Its length is bounded instead (15 s standard,
  ≈10 s boss).
- **happytime / GamePix happy moments** move off every win onto boss clears,
  chapter restorations and rune unlocks, per CrazyGames' own guidance.
