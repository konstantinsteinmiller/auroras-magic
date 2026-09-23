# Umbra's Path — alternate-campaign GDD

**Status:** design of record, NOT started. Aurora's story finishes first.
**Written:** 2026-09-23. **Owner ask:** several playtesters asked to play
Umbra instead of Aurora.
**Companion docs:** `story-GDD.md` (the pitch), `story-spec.md` (the binding
rules — every §x.y below is a section of it), `art-style.md`,
`art-roadmap.md`, `retention-roadmap.md`.

---

## 0. The one-paragraph version

The player is asked, once, before the first page of the story, whether this is
**Aurora's book or Umbra's book**. Aurora's book is the game that exists: dust
has smothered the world and she cleans it back to colour. Umbra's book is the
same fifty places seen from the other side — she is **drawing the dusk back
in**, because the world has been scrubbed so bright that nothing nocturnal can
live in it any more, and Aurora keeps rubbing out her night. The restoration
mechanic runs in reverse: the same finger stroke that WIPED dust away now
LAYS it down. The same fifty duels happen, against Aurora's glimmer-clones
instead of Umbra's shadow-clones, and the same book closes on the same
Friendship Festival — reached from the other end.

It is a **mirror, not a sequel**: one node graph, one duel sim, one renderer,
one wardrobe. What changes is polarity, palette and script.

---

## 1. Why this is worth building

1. **Playtesters asked for it by name.** Umbra is already the game's most
   charismatic character: she is in every chapter opener (`story.ts:50…95`,
   pinned by `tests/campaign/story.test.ts:19-25`), she is the ch10 boss, she
   is the one keepsake skin people equip first (`umbraSkin`), and she wanders
   the map after the finale (`map/wanderer.ts`) — the only character who gets
   to do that.
2. **The replay problem.** `retention-roadmap.md` has no answer for "the
   player finished all fifty nodes". A second path is the cheapest large
   answer: 100 % of the systems, ~15 % of the content cost.
3. **It is a marketing hook a portal thumbnail can carry.** "Two stories, one
   book. Clean the world, or bring back the night." Two covers, two trailers,
   one build (`gameplay-video-pipeline`, `tools/preview-video`).
4. **It is mechanically free.** The restoration model is already
   polarity-agnostic (§4.1) and the game already contains a working
   dust-ON path (`duel/duelPage.ts:240`), written for Umbra's spells.

---

## 2. Tone: the hard guardrails

This is the section to read twice. The game's audience is 4–9
(`story-spec.md` §2.2, §7.2) and every safety rule in §2.2 applies to BOTH
paths, unchanged.

- **Umbra is not evil, and the dark path is not a villain path.** She is the
  child who wants the lights left off. Her grievance is real and sympathetic:
  fireflies, moths, moon-flowers and sleepy hedgehogs cannot live in a world
  polished to noon. Aurora is cleaning with the best of intentions and does
  not notice what she is erasing.
- **Never "corruption".** §2.3 forbids imagery reading as illness or rot; the
  dusk is **cosy**, not sick: lamplight, blue hour, fireflies, velvet, stars,
  a quilt pulled over a meadow. If a frame would work as a bedtime
  illustration, it passes.
- **Nobody is punished for choosing.** No path is "the true ending", no
  achievement says "the good one", no copy calls either child naughty. The
  two-word framing the owner used — good/brave vs dark/bad — is fine as
  SHORTHAND FOR US and must never reach the screen or a store listing (§2.4's
  copy rule).
- **Both paths converge.** Chapter 10 ends with the same Friendship Festival,
  reached from the other side: the world gets a **day and a night**, which is
  what both of them actually wanted. This is also the answer to "is the dark
  path canonically wrong" — no, the ending is the same handshake.
- **The loss copy, Dream Dust, the trace assist, the touch-target floor, the
  press-hold gate, the parent panel and inclusive wardrobe defaults are
  untouched** (§2.2 rules 5, 6, 12, 20).

**The ONE sentence the whole path hangs on**, for every writer and every art
prompt: *Umbra is not making the world worse; she is putting it to bed.*

---

## 3. The Choice

### 3.1 Where it sits

Today's boot (`flow/nodes.ts:32-35`):

```
bootScene() → introSeen ? startFromSave() : playIntro() → startFromSave()
```

New:

```
bootScene() → pathChosen ? (introSeen ? startFromSave() : playIntro())
                          : gotoScene('pathChoice')
```

- **Before the intro**, not after: the intro IS one of the two books, and its
  five beats (HELLO / DUST / RUNE / CLEAN / PLAY, `story/intro.ts:8-17`) are
  authored from the chosen child's point of view. A player who picks Umbra
  and then watches Aurora's picture book has already been told the choice was
  cosmetic.
- **After the splash and the first-load interstitial.** `intro.ts:499` holds
  frame 0 until `firstLoadAdSettled()`; the choice scene inherits that gate
  verbatim — the ad plays over the splash, never over the choice.
  (`new-web-game-playbook`: first-play interstitial, ad-before-result-screen
  ordering.)
- **A returning player never sees it.** `pathChosen` is a save field (§6).

### 3.2 What it looks like (§3.13 touch floor, §8.2 zero-text)

The book is already the game's whole UI metaphor (`map/map.ts` draws it as an
object: cover boards, leaves, contact shadow). The choice uses it:

- The book lies shut on the cloth (`drawCloth`, exported from `map.ts` — the
  same surface the map, wipe, intro and duel all use). It opens to a
  **two-page spread**, no text on either page.
- **Left page — Aurora's:** her meadow at mid-morning, the cottage, warm gold,
  her standing small and waving, a sunbeam ribbon down the gutter.
- **Right page — Umbra's:** the same meadow at blue hour, lamps lit in the
  cottage, fireflies, her standing small mid-yawn with a smug grin, a
  moon-ribbon down the gutter.
- The two pages **breathe out of phase** (the map's existing idle pulse), and
  the gutter's ribbon is the only thing that touches both.
- **One tap lifts a page** — it rises, the other dims to 55 % and desaturates
  slightly; the chosen child steps forward and her horn lights. Tapping the
  other page swaps instantly, no confirm, no penalty. This is the "try both
  on" state, and it can be entered and left as often as the player likes.
- **Committing is a PRESS-AND-HOLD** on the lifted page: ~700 ms with a
  filling ring around the character, exactly the Twin Gift's gate
  (`use/useDuelRewards.ts`, `twinGift.holdLabel`) — the game's established
  "this one matters" gesture, and it cannot be mis-tapped by a four-year-old
  scrubbing at the screen.
- **The commit beat (the "special and satisfying" part, ~1.6 s, one-shot):**
  the held page's ribbon pulls tight → the OTHER page turns away and closes
  (reusing `flow/pageTurn.ts`'s real 3-D turn, `turnSlices`) → the chosen page
  fills the whole book → the bookmark ribbon (`pageTurn.bookmarkShape`) takes
  that path's colour for the rest of the game → the child's own rune traces
  itself in the air (`wipe.ts:1045 beginRuneReveal`'s machinery) → `sfx`
  `'reveal'` + `'fanfare'`, `haptic('restoredBoss')` → straight into the
  intro's beat 1.
- **Reduced motion (§3.11):** the turn becomes a 250 ms cross-fade; the hold,
  the ring and the reward beat stay (they are the reward, §3.11's own rule).
- **A11y:** two `role="radio"` targets ≥ 96 × 96 css px, `aria-label` from
  `path.aurora` / `path.umbra`, `aria-describedby` on a one-line summary read
  aloud, and the hold exposes `aria-valuenow`. Keyboard: ←/→ to lift, Enter to
  hold-commit (the existing `keydown` dispatch in `views/AppScene.vue:285-331`).

### 3.3 Can it be changed later?

**Yes — and it never overwrites anything.** Choosing the other book starts
that book's OWN campaign; both are kept.

- On the map's front page (the hub, `map.ts:72-73`), a **second bookmark**
  appears in the other path's colour once a path has any progress. Tapping it
  → "open the other book" → the same commit beat in reverse → the map redraws
  on that campaign.
- Both campaigns persist for ever (§6.2). A player can run them in parallel.
- The bookmark is ONLY on the front page, never mid-chapter: swapping books
  in the middle of a chapter is how a child loses a place.

### 3.4 Failure modes to design against

| Risk | Mitigation |
|---|---|
| Child taps blindly, gets a path they did not want, cries | Tap = try on, HOLD = commit; and the front-page bookmark means it is never permanent |
| The choice reads as a difficulty picker | §2.2 rule 22 forbids one. Both paths are identical difficulty — the same `FOES` HP curve, the same `easing.ts` ramp, the same director |
| A player thinks they must finish both | No completion meter spans both books. Each book has its own 50 |
| Portal QA sees a "choose your side" screen before gameplay and flags a slow start | The choice is ~6 s including the commit beat, is INSIDE the gameplay bracket's pre-roll window, and `gameplayStart` still fires on the first real duel input (`poki`/CG rule, `platforms/`) |

---

## 4. The mechanic: Draw Shadows

### 4.1 The load-bearing discovery — the model does not need to change

`restore/mask.ts` is a **coverage** model, not a cleaning model. `Coverage.rem`
(mask.ts:57-71) is "how much of this cell is still UNTOUCHED"; `stamp()`
(mask.ts:118-147, the write at :133) multiplies it down; `coverage01()`
(mask.ts:203-207) returns `1 − mean(rem)` = "how much of this sector the
player has WORKED ON". Every threshold — `DONE_AT` (224/255, mask.ts:43),
`COMPLETE_AT` (0.85, mask.ts:45), the graceful finish (`looksDone`,
mask.ts:295), the packing (`packCoverage`, mask.ts:340; `packHalf`, :348) — is
phrased in terms of work done, not in terms of dirt removed.

**So the whole analytic half is path-agnostic and is REUSED BYTE FOR BYTE.**
What has to mirror is the twenty lines that touch pixels:

| Aurora's path | Umbra's path | Where |
|---|---|---|
| `eraseStamp` — `destination-out` on the dust canvas | `shadeStamp` — `source-over`, stamping the DUSK tile through the same falloff | `restore/dust.ts:182-193` (op at :188) |
| `erasePaddle` — `destination-out` rect | `shadePaddle` — `source-over` rect | `dust.ts:214-227` (op at :221) |
| `eraseCells` / `clearDust` | `shadeCells` / `fillDusk` | `dust.ts:234-243`, `:246-248` |
| dust layer starts opaque, ends gone | dusk layer starts gone, ends full | `bakeDust` `dust.ts:125-179` |
| under-layer = the finished painting | under-layer = the same painting, day-lit | `bakeColour` `wipe.ts:288-298` |

The precedent already ships: `duelPage.ts:222-263` is the one existing
bidirectional path, and line 240 is literally
`m.globalCompositeOperation = clean ? 'source-over' : 'destination-out'` —
Umbra's duel spells already puff dust BACK onto the page. This GDD is that
line, promoted to a mode.

**Implementation shape:** one `polarity: 1 | -1` (or `mode: 'clean' | 'dusk'`)
threaded from `beginRestore` (`wipe.ts:445-523`) into the three paired call
sites — `onStamp` (:705), `onPaddle` (:769), `onBeamStamp` (:860) — each of
which today pairs a canvas erase with an identical analytic account. Nothing
below them changes.

**The one asymmetry that must be mirrored deliberately:** `duelPage.ts:248`,
`if (clean && a > 0.6) stamp(cov, …)` — the duel's carry-over record only ever
grows toward clean. On Umbra's path it only ever grows toward dusk. It is a
one-line polarity flip and it is the single easiest thing in this document to
forget; `duelHeadStart` (`duelPage.ts:331-340`) and `stashDuelClearing`
(:299-309, `CARRY_AT` :86, `CARRY_CAP` :76) go with it.

### 4.2 The three tools, mirrored

Each keeps its input model, its timing constants and its tests — only the
fiction, the sprite and the sound change. (`toolOf(n)` stays as it is,
`campaign/tables.ts:176-177`.)

| Aurora | Umbra | Behaviour (unchanged) |
|---|---|---|
| **Stardust Sponge** (`restore/brush.ts`) | **Dusk Brush** — a soft charcoal-and-velvet mop that leaves blue shade | dwell-aware: one pass 55 %, a return pass 98 % (`A_FIRST` brush.ts:35, `A_FINISH` :37, `isReturnVisit` window 2500 ms :39) |
| **Magic Eraser** (`restore/eraser.ts`) | **Nightfall Roller** — a wide paint roller laying dusk in strips | no dwell, no speed response, `a = 1` (eraser.ts:115, 128), rotated rect via `stampRect` |
| **Sunbeam** (`restore/sunbeam.ts`) | **Moonfall** — a slingshot arc of moonlight that spills dark behind it | slingshot, `MIN_PULL` 0.15, fan stamps at strength 1 (sunbeam.ts:125) |

**Feedback, mirrored:**

- `sfx('scrub')` ("sand being swept", `duel/audio.ts:356`) → a new `'hush'`
  cue: the same grain envelope, low-passed, a brush on velvet. Same call
  sites, same speed parameter.
- `sfx('chime')` climbs a scale per 10 % (`audio.ts:368`, rung chosen at
  `wipe.ts:834-838`) → the same ladder DESCENDING, a lullaby figure. Keeping
  the rung arithmetic identical matters: it is what tells a child how close
  they are.
- Dust puffs (`fx.ts:276 puff`) → **moth-and-firefly motes** rising off the
  stroke; `brushTrail` glints (`fx.ts:289`) → small blue-white star specks.
  Both are existing pooled emitters taking a colour, so this is a palette
  argument, not a new system (and `art-roadmap.md` §4b already forbids
  painting particles — they stay vector on both paths).
- `haptic('scrub' | 'restored' | 'restoredBoss')` (`use/useHaptics.ts:56`) are
  path-agnostic; keep the cue names.

### 4.3 The reveal, mirrored

`startReveal` → `startWave` → `finishWave` (`wipe.ts:920-1032`) keeps its
whole shape and every timing (`T_FREEZE` .55 / boss .65, `T_WAVE` .42 / boss
.85, wipe.ts:107-123). What changes:

- The wave front (`drawWaveFront`, wipe.ts:1864-1883) sweeps **night** across
  the sector instead of colour: the same inverted-arc clip, the other way up.
- The **rescued friend** (`wakeRescue`, wipe.ts:946-964, threshold
  `RESCUE_AT` 0.3 at :251) becomes the **waking friend**: on Aurora's path a
  creature is freed from the dust; on Umbra's it is a nocturnal creature
  WAKING UP now that it is dark enough — a hedgehog, a moth, a barn owl, a
  glow-worm. Same bit (`S.campaign.rescued`), same beat, same `sfx('rescue')`.
- **The colour-me pots** (§8.4, `pickPot` wipe.ts:669-690, `potCue.ts`) stay,
  but the three pots are **night hues** for that landmark (the same
  "neutral lilac-grey landmark waiting to be coloured" constraint that
  survives 5/5 sector prompts — do not fiddle with it, see
  `auroras-magic-art-pass`). The `paint.*` locale keys get a night set.
- **The Twin Gift bloom** (D3, `useDuelRewards.ts:72-88`) becomes the
  **Twin Gift lantern**: same rewarded-ad gate, same `blooms` bitset, same
  no-FOMO rules; the sector gains lit windows and lanterns instead of flowers.

### 4.4 What the player is actually doing, moment to moment

Identical: drag a finger over a sector until it is ~85 % worked, watch a
reveal, pick a colour, get a gift. The verb changes from "rub out" to "draw
over", which for a small finger is the SAME gesture — and that is the point.

---

## 5. Story, cast and script

### 5.1 The shape stays

`story/story.ts` is a data module with zero text: `OPENERS` (:47-98), `BOSSES`
(:99-150), `THANKS` (:151-194), `FESTIVAL` (:198-211) and the §10.8 templates
`tmpl(ch, pos)` (:214-227), all keyed by 0-based chapter. `dialogueFor(n)`
(:230-237) and `thanksLines(n)` (:240) are the only readers.

**Umbra's path needs a second set of the same four tables**, selected by path.
Cleanest shape (no call-site churn): keep `dialogueFor(n)` / `thanksLines(n)`
signatures, make them read `S.campaign.path` internally, or —
better for testability — `dialogueFor(n, path)` with the path defaulted from
state at the two call sites (`views/DialogueScene.vue:21`,
`views/GameScene.vue:60`).

### 5.2 The key space, and the size of the i18n bill

Aurora's script is ~107 keys under `story.*` (`en.ts:356-518`), and
`STORY_KEYS` (`story.ts:251-257`) is what the word-budget test walks.

Umbra's path needs, per chapter: 3 opener bubbles + 3 boss bubbles + 2 thanks
(4 at the finale) + the four shared `story.tmpl.*` lines, plus the choice
screen (~4), the path names (2), a night `paint.*` pot set (~30 if all three
pots per sector change — see §11's open question), and the tool names (3).

**Budget: ~115 new keys × 21 locales ≈ 2,400 strings.** This is the single
biggest line item in the whole feature and it is the one most likely to be
underestimated. Constraints that apply to every one of them:

- **≤ 8 words per bubble**, enforced by `tests/campaign/story.test.ts:46-55`.
- `tests/i18nParity.test.ts:24-36` fails on any key missing from any of the 20
  non-English locales; `:48-63` fails on a changed `{placeholder}`.
- The locale list is `utils/enums.ts:18-40` (en, ar, zh, de, nl, es, fr, hi,
  id, it, ja, ko, kk, pl, pt, ru, th, tr, uk, uz, vi) — match it exactly; do
  not invent or drop one.
- `tools/locale-fit/audit.mjs` must be re-run: German and Vietnamese are what
  break a bubble's layout.

### 5.3 Voice: how Umbra's script differs

Aurora's script is earnest and encouraging. Umbra's is **dry, funny and a
little put-upon** — she is right and nobody will admit it.

Sample opener (ch1, three bubbles, the shape
`tests/campaign/story.test.ts:19-25` pins — bubble 2 is the rival):

1. **Umbra** (`sleepy`): "The meadow is far too awake."
2. **Aurora** (`determined`): "Umbra! I just cleaned that!"
3. **Umbra** (`smug`): "And the moths? Where do they sleep?"

Sample boss challenge (ch4, the Crystal Caves' Guardian):

1. **Terra** (`stern`): "These caves are ours to keep bright."
2. **Umbra** (`worriedMild`): "Bright? Nothing in here has eyes."
3. **Terra** (`determined`): "Then show me. Duel me."

Sample thanks (ch2, after the dusking):

1. **Creature (Shelly)** (`cheering`): "My shell doesn't hurt now. Thank you!"
2. **Umbra** (`warmBlush`): "See? Somebody had to say it."

Rules for the writer:

- **Umbra never insults Aurora**, and Aurora is never made to look stupid —
  she is *busy*. The comedy is two children who are each right about half of
  it.
- **Every chapter's creature gets the line that justifies the path** — the
  moth, the owl, the hedgehog, the glow-worm say what the dark is FOR. That is
  the emotional engine and it is also what stops the path reading as vandalism.
- **The Guardians are not converted.** They lose the duel and they stay
  unconvinced until the finale. Aurora's path has the same structure in
  reverse, and it is what makes chapter 10 land.

### 5.4 Portraits and emotes — the real cost

`PORTRAIT_SETS` (`artIds.ts:165-180`) gives each speaker a strip of 4–5
emotes, and **`tests/meta/artFamilies.test.ts:62-75` enforces both directions**:
every (speaker, emote) the script uses must exist in a strip, and every panel
in a strip must be used by the script. So a new line with an emote the speaker
has no panel for is a red test, not a shrug.

Current strips: Umbra has `['sleepy','worriedMild','stern','warmBlush','cheering']`
(artIds.ts:167); Aurora has `['happy','worriedMild','determined','cheering']`
(:166).

**What Umbra's path needs:**

- **Umbra as the PLAYER** — she already has a five-panel strip, the ceiling
  (`artFamilies.test.ts:77-85` caps a strip at 5). If the script wants a
  `smug` she does not have, a panel must be swapped, not added.
  → *Design constraint: write Umbra's script against her existing five
  emotes.* This is cheap and it is a real constraint on the writer.
- **Aurora as the ANTAGONIST** — she needs `stern` and/or `determined` beats
  she already has (`determined` ✓), but she is now a FOE-side rig: her badge
  colour (`portrait.ts:48-61`), her `SPEAKER_FOE` row (:78-89, currently
  absent because she is drawn with `equippedHooks()` at :174-175) and possibly
  a `RIM_LIT` entry (:115) need a path-aware branch. **Her 5th panel is free**
  (she has 4 of 5), so one new Aurora emote can be added at the cost of one
  art sheet.
- **The nine creatures** keep `['happy','worriedMild','cheering']`
  (`CREATURE_EMOTES`, artIds.ts:163). No new panels.
- **`FINALE_CAST`** (`story.ts:244-248`) is 11 entries and drives
  `FinaleCard.vue`; Umbra's finale needs its own cast list (same faces,
  different emotes, Umbra and Aurora swapping the two `star: true` slots,
  `FinaleCard.vue:38`).

**Portrait art estimate: 1–3 new strips** (an Aurora antagonist panel, and
only if the script demands it, an Umbra swap), not eleven.

### 5.5 The intro

`story/intro.ts` is five beats, 19.4 s total (`BEAT_LEN` :61), with four
painted panels (`STORY_PANELS = ['hello','dust','magic','colour']`,
artIds.ts:141; beats 3 and 4 share panel 4, :144).

Umbra's intro is the same five beats inverted: HELLO (Umbra, yawning, at
dusk) → **GLARE** (the world scrubbed painfully bright, a moth bumping a lit
window) → RUNE → **DUSK** (she draws the first shadow) → PLAY.

**Cost: 4 new painted panels**, same sizes, same prompt shape. `drawUmbra`
(intro.ts:198-222) and `drawAurora` (:189-195) already exist and swap roles.

### 5.6 The finale

Both books end at node 49 with the Friendship Festival. Umbra's version: the
Guardians arrive to complain and find the festival is *nicer* at night —
lanterns, moths, a sky full of stars — and Aurora, last, concedes the point
and asks for the mornings back. Card copy: one line (`finale.line`), same
component, same `FinaleCard.vue` shape, its own key.

Then the map's **wanderer inverts**: on Umbra's path it is **Aurora** who
wanders the finished map (`map/wanderer.ts` — `WANDER_LINES` :25, `POSE` with
`foe: guardianOf(9)` :71 becomes the player-side rig, gated on `finaleSeen`
:34). Three new lines.

---

## 6. Save, migration and the cloud

### 6.1 The fields

`CampaignState` (`campaign/state.ts:21-67`) is rebuilt field-by-field by
`readCampaign` (:102-145) — a whitelist, so **unknown fields are dropped and
absent fields take the default**. Adding a field means touching THREE places
(interface, `defaultCampaign()`, and the `readCampaign` return) or it is
silently never read back.

New top-level save keys (beside `am_campaign`, `keys.ts:42`):

```
am_path        'aurora' | 'umbra' | null    the CURRENT book (null = not chosen)
am_campaign2   CampaignState                Umbra's campaign, same shape
am_gifts       int bitmask over COSMETICS   keepsakes owned, SHARED by both books
```

**`am_gifts` is the shared wardrobe** (owner, 2026-09-23 — §11 Q2). The chests
are the same fifty nodes in both books, so finding the Acorn Cap in one and
being shown a ghost of it in the other would read as the game forgetting.

- **It is ONE field, not a union of two.** `giftsOwned` could instead stay
  inside each `CampaignState` and be OR'd at every read, and that is the
  version to avoid: a set represented as two halves drifts the moment one
  reader forgets to OR, and a cloud merge that drops one campaign then drops
  ownership bits that exist nowhere else. One authoritative mask cannot do
  either, and its merge rule is a bitwise OR — monotone, order-free and
  impossible to get backwards.
- **Migration is a hoist, not a rewrite.** `giftsOwned` stays in
  `CampaignState` as a legacy field that is no longer written; on load, when
  `am_gifts` is absent, seed it from
  `am_campaign.giftsOwned | am_campaign2.giftsOwned`. That is the same
  "infer it from what the save already proves" shape as `introSeen`
  (`state.ts:141-144`), and no schema bump (`migrate.ts:34` early-outs at 2).
- **What stays PER BOOK: the outfit.** `giftsEquipped` (the 7-int array) and
  `maneSwatch` remain inside each `CampaignState`, so Aurora can be wearing
  the Flower Crown while Umbra wears the Acorn Cap, and swapping books swaps
  what she has on. Shared wardrobe, separate outfits — that is the whole rule
  in four words.
- **`backfillKeepsakes()`** (`campaign/controller.ts`, added with the second
  shelf) writes into the shared mask and keeps working unchanged: it ORs in
  whatever the CURRENT book's `furthestNode` has already earned, and the other
  book's contributions are already there.

- `am_campaign` stays Aurora's, unmoved, so every existing save is already
  correct and `am_path` defaults to `'aurora'` **inferred from progress** —
  exactly the `introSeen` precedent (`state.ts:141-144`): a save with
  `furthestNode >= 0` or any `dialoguesSeen` bit has chosen Aurora already and
  must never be sent to the choice screen.
- `isPayloadKey` is prefix-based (`SaveMergePolicy.ts:317-324`), so both new
  `am_*` keys round-trip to every cloud strategy with no per-platform work.
- **No schema bump.** `migrate.ts:34` early-outs at `am_schema >= 2` and these
  are additive.

### 6.2 The merge policy — the one thing that will bite

`computeMeta` (`SaveMergePolicy.ts:174-208`) scores a device's save as
`(furthestNode+1)*500 + countBits(sectorsDone)*150 + runs*10`, reading exactly
one `am_campaign`. With two campaigns:

- A device that advanced **Umbra's** book but not Aurora's scores identically
  to one that did nothing, and `decideMerge` (:257-280) can hand it the other
  device's blob — **silently deleting a whole playthrough.**
- Fix: score the SUM of both campaigns. It is a small change in one function,
  and `tests/save/SaveMergePolicy.test.ts:24-53` pins the formula, so it is a
  deliberate, tested edit rather than a discovery.

Also:

- `KEPT_ON_RESET` (`useResetProgress.ts:51-58`) must decide whether "reset
  progress" clears both books (it should — one button, everything) and
  `tests/save/ResetProgress.test.ts` extended.
- **Poki's ceiling**: < 1 MB gzipped total or cloud sync silently stops
  (`resolveSaveStrategy.ts:89-91`). A second campaign is ~1.5 kB of base64.
  Fine, but it is the stated ceiling and it is now half-spent.
- Lifetime counters (`am_wins`/`am_losses`/`am_duels`/`am_best_time`,
  `state.ts:368-371`) stay **shared across both books** — they are lifetime
  stats, and the leaderboard posts from them (`duelFlow.ts:218`).
- `am_gifts` (§6.1) merges by **bitwise OR**, not by score: it is a set of
  things the player has been given, it only ever grows, and a union can never
  take one back. It must NOT be carried along with whichever campaign wins the
  score comparison — that is exactly how a device loses a keepsake it earned
  on the book that lost the tie.

### 6.3 The leaderboard — ONE board, both paths

Decided (owner, 2026-09-23 — §11 Q1): one board
(`leaderboard-badge`'s worker, `data/leaderboard-snapshot.json`). Splitting it
halves each population, and the live board is already a survivorship sample —
two thin boards rank worse than one thick one.

**It needs exactly one change, and without it the second book DEMOTES the
player on the board they are already on.**

`duelFlow.ts:218` posts `reportRun(S.wins, S.campaign.furthestNode + 1)`:
lifetime duels won, tie-broken by the furthest node. `S.wins` is already a
lifetime counter shared by both books (`state.ts:368-371`), so the SCORE is
correct for free. The FLAIR is not: it reads the current campaign.

The write gate is `if (score > posted && due)` (`useLeaderboard.ts:486`) — it
fires on a **wins** record and carries whatever flair was passed at that
moment. So a player who finishes Aurora's fifty and then wins duel one of
Umbra's book sets a new lifetime-wins record and posts it **with a flair of
1**, overwriting their own 50. This is not a no-op that quietly does nothing;
it is a live regression of a rank the player earned.

- **Fix:** pass the best across both books —
  `reportRun(S.wins, bestFurthestNode() + 1)` where `bestFurthestNode()` is
  `max(aurora.furthestNode, umbra.furthestNode)`. One helper beside
  `nextDuelNode` in `campaign/state.ts`, one changed argument.
- The same helper is what the merge policy's score should use (§6.2), so the
  two fixes share it.
- `reportPortalBest` (the portals' own boards, `useLeaderboard.ts:466-467`)
  posts from the win dispatch and takes the same treatment.

---

## 7. Everywhere a new scene has to be registered

From the flow audit — this list is the whole of it, and missing one is a blank
screen rather than a compile error:

1. `game/flow/scene.ts:15-17` — the `SceneId` union (`'pathChoice'`).
2. `use/useGameplayLifecycle.ts:45-46` — `LiveScene`, a deliberate restatement
   of that union; and the live rule at :92-103 (the choice is NOT live
   gameplay).
3. `views/AppScene.vue:401-425` — the per-frame update dispatch.
4. `views/AppScene.vue:438-450` — the per-frame draw dispatch (note the
   fallback flat fill at :444-448 — this is what a forgotten scene looks like).
5. `views/AppScene.vue:701-709` — the DOM-chrome `v-if` ladder.
6. `views/AppScene.vue:157-189 / 191-238 / 240-253` — pointer dispatch;
   `:285-331` — keyboard dispatch.
7. `tests/platforms/gameplayLiveRule.test.ts:44` and
   `tests/platforms/flowBracket.test.ts:40` — both hold a hardcoded scene list.
8. A new `views/PathChoiceScene.vue` + `game/flow/pathChoice.ts`.
9. `router/index.ts` — **not touched.** Scenes are never routes (one route, `/`).

---

## 8. Art: what actually has to be painted

The catalogue is closed at 195/195, ~3.85 MB against a 4.1 MB budget
(`art-roadmap.md`, and the art-pass notes). **A night version of all fifty
sectors would roughly double the catalogue and blow the budget**, so it must
not be the plan.

**The plan instead — one painting, two lightings, done in code:**

- The sector paintings are painted for DAY and stay as they are.
- Umbra's path renders the SAME painting under a **dusk grade**: a blue-violet
  multiply, a warm additive pass on windows and lanterns, and a lifted black
  point. This is the same trick `bakeDust` already performs for the dust layer
  (`dust.ts:145-176`: a `saturation` pass, a `multiply` ink at 0.72 alpha, an
  `overlay` noise tile) — one more bake mode, zero new files, and it inherits
  the art layer's caching (`scoped-art-invalidation`'s contract: the grade is
  keyed per painting, so one arriving painting invalidates only its own bake).
- Verify the grade at `/playground` against 5 sectors across 5 biomes before
  committing. A grade that works on a meadow and dies on the snow is the
  expected failure.

**New sheets actually needed (~14–18, ~350 kB):**

| Family | Count | Note |
|---|---|---|
| Intro panels (Umbra's five beats) | 4 | same size/prompt shape as `STORY_PANELS` |
| The choice spread (2 pages × 2 orientations) | 4 | landscape 1600×900 + portrait 900×1600, like `page` |
| Tools (Dusk Brush, Nightfall Roller, Moonfall) | 3 | `item-*`, mirrors `gift.ts:226/404/592` |
| Aurora antagonist portrait panel | 1 | her free 5th slot |
| Book cover / bookmark in the night colourway | 2 | `pageArtId` variants |
| Promotion (a second cover at each aspect) | ~4 | `pnpm art:promotion`, ships last |

Plus: the 14 second-shelf keepsakes added on 2026-09-23 are still unpainted
(`VECTOR_ONLY_KEEPSAKES` in `game/cosmetics/rig-accessories.ts`) and should be
queued with this batch, not separately.

**Wardrobe:** Umbra wears the same 23 keepsakes on the same rig with her own
palette — the skins slot is the only oddity (`umbraSkin` on Umbra is a no-op,
and an `auroraLook` becomes the obvious mirror keepsake). One new palette, no
new geometry. Ownership is **shared** between the books and the equipped
outfit is **per book** (§6.1), so the shelf is the same shelf and the two
children are dressed differently on it.

---

## 9. The duel: what changes (almost nothing)

- **`foes.ts` gains a second roster tint.** Standard nodes on Aurora's path
  are Umbra's shadow clones (`shade()` foes.ts:70-71, `SHADOW_TINT` :105-116).
  On Umbra's path they are **Aurora's glimmer clones**: the same `shade()`
  function with a light palette and the chapter's hue. One table.
- **The Guardians are unchanged** — they defend their chapter against
  whichever child is coming. Same HP, same `phase2`, same `sigs`.
- **The ch10 boss becomes Aurora**, with `umbraFalter`'s exact structure
  (a tell, not a power-up; phase 3 at 25 % opens her Love finisher —
  `foes.ts:51-53`, `sim.ts:659`, `:1068`). Rename the mechanic
  `rivalFalter` and give it to whichever rival the path has.
- **`S.theme`, the arenas, the islands, the runes, the spell matrix, the
  director, Dream Dust and the win-rate harness are all untouched.** The
  duel does not know which book it is in, and it must stay that way.
- **Versus (C18)** already pits Aurora against Umbra (`VERSUS_FOE`
  foes.ts:152-154) — it gains nothing and needs nothing.

---

## 10. Phasing, and what to cut

Build in this order; each phase is shippable-ish and provable on its own.

| # | Phase | Contents | Rough size |
|---|---|---|---|
| 1 | **Save + path plumbing** | `am_path`, `am_campaign2`, `readCampaign`, merge-policy scoring, reset, tests | S |
| 2 | **The choice scene** | `pathChoice` scene + all 9 registration sites, the two-page spread, hold-to-commit, the commit beat, the front-page bookmark | M |
| 3 | **Polarity in the restore loop** | `dust.ts`'s four functions, the three paired call sites in `wipe.ts`, `duelPage.ts:248`, the dusk grade in `bakeColour` | M |
| 4 | **Tool re-skin + audio** | three sprites, `'hush'`, the descending chime ladder, mote/firefly palettes | S |
| 5 | **Script** | the four tables, ~115 English keys, the emote audit against existing strips | M |
| 6 | **Foe tint + ch10 Aurora** | one palette table, `rivalFalter` rename | S |
| 7 | **Art batch** | §8's 14–18 sheets through the Art Desk | M (wall-clock: quota-bound) |
| 8 | **21-locale propagation** | ~2,400 strings + `tools/locale-fit` audit | L |
| 9 | **QA + portal pass** | `new-web-game-playbook` release phase, both paths through the fit test | M |

**If it has to be cut down**, cut in this order, and none of these break the
feature:

1. The night `paint.*` pot sets (reuse the day names).
2. The Umbra intro (let her path open on the map with a single card).
3. The path-specific promotion art (ship one cover).
4. The finale card's bespoke line (reuse a neutral one).

**Do NOT cut:** the hold-to-commit gate, the dusk grade (without it the path
looks like a bug), the merge-policy fix (it deletes saves), or the creature
lines that justify the path (without them it is vandalism).

---

## 11. Questions for the owner

### Decided (2026-09-23)

- **ONE leaderboard, both paths.** Written up in §6.3, including the flair fix
  that stops book two demoting the player.
- **Both books SHARE keepsake ownership**, and each keeps its own outfit.
  Written up in §6.1: one shared `am_gifts` mask, `giftsEquipped` and
  `maneSwatch` per book.

### Still open

1. **Does Umbra's path reuse the same 50 sector NAMES** (Cottage Meadow,
   Bubble Bay…) or get night names ("Cottage Meadow at Dusk")? Names are
   `chapter.*` / sector slugs and this is a locale-cost decision.
2. **Should the choice be offered again to existing players** who already
   finished Aurora's book, via the front-page bookmark with a one-off sparkle?
   (Recommendation: yes — it is the retention hook.)
3. **How hard is the "both paths" completion?** Is there an end-state for a
   player who finishes both books — a third cover, a duet card — or does each
   simply end? (Recommendation: one shared card, no new systems.)
4. **Portal positioning:** does the store listing lead with two paths (a
   stronger hook, a longer first-time-user path) or keep leading with Aurora
   and reveal Umbra in-game? (§D1's framing question.)

---

## 12. The tests that will go red (so nobody is surprised)

- `tests/campaign/story.test.ts:19-25` — "bubble 2 of every opener is Umbra"
  is false on Umbra's path; the assertion becomes "bubble 2 is the RIVAL".
- `tests/meta/artFamilies.test.ts:62-85` — every new (speaker, emote) needs a
  panel, and every panel needs a user.
- `tests/i18nParity.test.ts:24-63` — every new key, in all 21.
- `tests/platforms/gameplayLiveRule.test.ts:44`,
  `tests/platforms/flowBracket.test.ts:40` — the scene list literals.
- `tests/save/SaveMergePolicy.test.ts:24-53` — the score formula.
- `tests/campaign/campaignState.test.ts`, `tests/campaign/migrate.test.ts` —
  the new fields and the inferred `am_path`.
- `tests/restore/mask.test.ts` — should NOT go red. If it does, the polarity
  leaked into the model and §4.1's whole premise is broken. **Treat a red test
  here as a design alarm, not a test to update.**

---

## 13. One-line summary for the top of a future session

*Same fifty places, same book, other end: Umbra draws the dusk back in because
the world got scrubbed too bright for anything nocturnal, the coverage model
is already polarity-agnostic so only the pixel ops mirror, and the whole thing
is gated behind one press-and-hold on a two-page spread that a child can
change their mind about from the front page for ever.*
