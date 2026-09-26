# Paint outstanding — what is still drawn in code with the art layer on

**Re-checked 2026-09-25 — read §0 first.** §1–§6 below are the 2026-09-24
pass as it was written; most of their rows have since been fixed or painted,
and §0 says which.

## 0. Re-check, 2026-09-25

**Why.** The owner saw chapter 4's crystal pictogram in a dialogue line and
read it as "not painted yet". It is painted — `world-ui/picto-set-2`, panel 5,
and `Picto.vue` does swap it in (checked on a private dev server at 3×, art on
against art off: art on renders an `<image>`, no vector paths). The painting
is a TRACE of its flat SVG reference, so at 47 px it still reads as the
drawing. That is a gap the 2026-09-24 method could not see: it asked "is there
a sheet, and does the call site use it", never "does the painting look
painted". This re-check adds that question.

**What moved since the pass.** `ff4e983` (the same commit that added this file)
fixed B1, B2, B3, B19 and the doubles, and registered 58 sheets; `4d3e98a`
painted all 58; `74603a7` re-rolled seven that fell short (ward rock, book
board, gold star, frost ward, winter scarf, snowball, glass chip — the
`softEdge` "the edge is painted, not inked" clause). `pnpm art:status` now
reads **335 painted, 3 still drawn, 338 in the catalogue** — the three are the
uncommitted puppet work's `duelist-umbra-head`, `-leg` and `-hoof`.

### 0.1 Painted, but reads as drawn — re-roll candidates (NEW)

Found by putting every non-scene painting (202 files) on contact sheets, then
each suspect beside the reference it was painted from
(`art-sheets/<stem>.png` against `art-sheets/painted/<stem>.jpg`). A pixel
flatness score was tried first and does not separate them — WebP noise and a
faint gradient hide a flat fill — so this list is by eye. Most visible first.

| # | Painting | Seen | What came back |
| --- | --- | --- | --- |
| **T1** | **Dialogue pictograms** `world-ui/picto-set-2`, `-3`, `-4` (the **crystal**, trees, zzz, moon, thorn, mirror; wave, notes, crossed note; rainbow, hourglass, snowflake, star, balloon) and set 1's sparkle, cheer, duel and sun | 1–2 on every dialogue beat, beside a painted portrait — the crystal on chapter 4's lines and 10-2 | Near-exact traces: the reference's fills, its light/dark halves kept as two flat tones, and its even plum ring (a little thinner). Set 1's heart and cloud, set 3's cloud, lightning and wing did get soft shading and can stay |
| **T2** | `gifts/box-gift` | every sector's gift, on the map and in the restore | A trace: flat cardboard panels, heavy even ring |
| **T3** | `gifts/boss-chest` (closed panel) | every boss node, map and restore | Flat planks and bands, heavy ring; the open panel got a little more paint |
| **T4** | `props/prop-coconuts` | chapter 7's palms | The flower head's defect: the three nuts' rings are traced ring through ring, crossing INSIDE the cluster |
| **T5** | `props/prop-flower-head` | every bloomed sector | Re-rolled once for that defect (4d3e98a); faint petal-overlap lines are still there |
| **T6** | Props `boat`, `duck`, `vane`, `mill-sails`, `twinkle` | ch 2's boats, ch 1's brook duck and windmill, 3-4's vane, sparkles everywhere | Near-exact traces, flat fills and an even ring. Small in play |
| **T7** | Props `charm` (ch 6's **crystal** charms), `star`, `flag`, `kite`, `fish`, `sleep-z`, `cart-wheel`, `gnomon`, `kelp`, `ward-wind` | their sectors; `sleep-z` and `star` in the duel | Some shading, but the reference's heavy even ring is kept: sticker-ish, the look `74603a7` re-rolled out of the star, snowball and chip |
| **T8** | `cosmetics/keepsake-frost-trail`, `keepsake-petal-trail`, `pet-firefly`; `world-ui/wardrobe-tent`; `world-ui/turn-phone`; `gifts/emblem-frost-lock` | wardrobe shelf; the front page's tent; the turn-sideways hint; the restore's Frost Lock emblem | Traces |

**Fine, for comparison:** the creatures, portraits, cosmetics' worn stills,
islands, runes, tools, the standard gift, Twin Gift, trophy, shield, movie
icon, `prop-ward-crystal` and `emblem-crystal-ward` (both crystals came back
shaded and faceted), and every re-roll from `74603a7`. The grey props
(`tinted: true`) are grey on purpose — they are tinted in play — and are only
listed where their SHAPE came back traced.

**How to re-roll them (the lessons already paid for).** Words alone do not
stop a trace — `74603a7`'s rock ignored "no hexagon rings" until its
reference's ink was thinned for the painter only (`ROCK_REF_INK`, `fx.ts`), and
the creatures taught the same. So: re-export the reference with a thin ink
(the drawn game is unchanged), add `softEdge` (`SOFT_EDGE` +
`softEdgeChecks`, `artSheet.ts`) and name the overlapping-ring artefact the
way `prop-flower-head`'s brief now does (T4). For the pictograms, keep the
four-set strips (the slicer and `Picto.vue` seat panels by the strip's box)
and judge each roll at 47 px on the paper leaf, art on against art off —
at that size a roll that only thins the ring is still the drawing.

**RE-ROLLED 2026-09-25 — T1 and T4–T7** (owner's ask; 27 generations).

| sheet | now |
| --- | --- |
| Pictogram sets 1–4 (T1) | **PAINTED.** Painted in two rows now (`ItemSheet.rows`), cut to 176 px frames; checked on the paper leaf at play size, art on. Set 2 took three rolls, set 4 three (one parked in `painted/stale/` for drawn cell borders), set 1 two (the slicer refused the first: ruled lines) |
| Coconuts, flower head (T4, T5) | **PAINTED** — no ring crosses inside either |
| Duck, mill sails, twinkle, crystal charm, star, flag, kite, fish, Z, cart wheel, gnomon, kelp (T6, T7) | **PAINTED** — a soft edge, no even ring; the tinted ones measured neutral (median chroma 0.05–0.09, under `artTint`'s 0.16) |
| Boat, vane (T6) | Re-rolled; still close to traces with a thinner line — small in play, low priority |
| Wind ward (T7) | **Re-roll rejected, previous painting restored** (byte-identical to the committed file): the thinned reference lost the four wind blades and it came back a solid donut. Still sticker-ish; left as it was |

T2 (gift box), T3 (boss chest) and T8 were not in this pass — see the second
pass below.

**SECOND PASS 2026-09-26 — T2, T3, T8, the rest of T6/T7, three runes, B21**
(owner's ask; 16 generations).

| sheet | now |
| --- | --- |
| Gift box (T2) | **PAINTED** — lit card, painted band and star; it turned a little three-quarter (a top and a side show), as the Twin Gift did, and its edge is a warm rose line rather than plum |
| Boss chest (T3) | **PAINTED**, shut and open |
| Wardrobe tent, pet firefly, phone, Frost Lock emblem, frost-trail and petal-trail badges (T8) | **PAINTED.** The tent came back round-topped (its brief says so; the drawing is peaked); the firefly's head is small (its brief), its tail glow a little past the body; the phone is the mildest change |
| Vane (T6) | **PAINTED** — gilded, shaded |
| Boat (T6) | Still close to a trace; small in play, left |
| Wind ward (T7) | **Rejected again, previous painting restored** (byte-identical to the committed file): even from a full-weight reference, the recipe below brought back a solid donut with no blades. Its entry is back as committed; it needs a different idea, not this recipe |
| Lightning, illusion, rainbow runes | **FIXED** (owner: "minor mistakes"): the lightning's two pink blotches inside the spiral, the illusion's frayed right loop and the rainbow's stray tick and dark tips — each rune's own fault named as a check (`RUNE_FIX`) and re-rolled once |
| 5-4 sector (B21) | **FIXED BY REPAIR, not re-roll.** Two rolls were less faithful than the painting that shipped — one added a pond, a bridge and a rocking horse, the other came back washed out with a new bush — so the shipped painting was kept and its flat patch refilled with the sky gradient around it, the cloud it cut feathered into the sky (a one-off pixel repair: the 231×194 patch refilled with the sky gradient around it, 180,207,230 → 198,217,233, the cloud feathered over 34 px; roll 2 parked in `painted/stale/`, roll 1 in `painted/replaced/`) |

**What this pass added to the lessons:**
- **The kit's `setRefInk` only reaches drawings that stroke through the kit's
  `ink`.** A gift, a chest, a phone or a shelf badge strokes its own lines, and
  eight references came back byte-identical until the bench thinned every
  stroke on the reference canvas for them (`artDraw.thinStrokes`, used for
  any `refInk` sheet that is not a prop or a pictogram set).
- **Never thin a drawing whose SHAPE is strokes** — the Frost Lock snowflake's
  arms are strokes and became a line drawing; it keeps a full-weight reference.
- **The finish references pull a ring toward a solid, round thing.** The
  wind ward came back a donut from a full-weight reference too: `retrace` is
  not for a thin ring with detail inside it.
- A sector re-roll is a new composition, not a touch-up: for one bad patch on
  a painting that is otherwise right, repair the patch.

**What it took — the lessons, for the next traced sheet:**
- **Props:** the reference's ink thinned to a guide (`ItemSheet.refInk`, 0.4), the
  `OBJECT_NOT_A_STICKER` clause and `softEdge`, and two FINISH references
  attached before the reference (`TRACE_FINISH_REFS`: the re-rolled snowball
  and gold star). 13 of 17 came back painted first time.
- **Pictograms: none of that was enough, and neither was size.** Two rolls in
  one row and one in two rows (each drawing 1.7× bigger) all came back
  traces. What turned it was the WORDS FOR WHAT THEY ARE: the brief called
  them "PICTOGRAMS", "signs, not characters", "a bold, simple silhouette", and
  the painter drew exactly that, icons. Briefed as "small storybook OBJECTS …
  a tiny painting of a THING, never a flat symbol, sign or icon", the next
  roll was painted. The Z prop, briefed as a thing, had already shown it.
- **A thinned reference loses thin detail INSIDE a shape** — the wind ward's
  blades vanished. Thin a ring, not a sheet whose meaning is in its inner lines.
- **Crossing rings in a reference are traced whatever the words say**: the
  flower head needed a reference drawn without them (its ink laid down first
  and the fills over it, `bloom.flowerRef`).
- **The per-row strip guard does not see PALE cell borders.** The tell was
  the slicer's own note: "panels differ by 70 %… scaled to 58 %" — a border
  counts as the drawing's extent. Read the normalisation line on every grid.

### 0.2 §3's candidates (P1–P15) — where they stand

Every sheet §3 asked for exists and its live call site draws it, falling back
to the drawing only on a miss; no painting sits on disk unused. Checked row by
row against the current code:

| row | now |
| --- | --- |
| P1 second shelf | PAINTED — all worn stills (`rig-accessories.ts`, `VECTOR_ONLY_KEEPSAKES` is empty) and all 14 shelf badges. The petal and frost trails stay particles by design (art-roadmap.md, 2026-09-24); their badges are T8 |
| P2 wings, necklace, scarf | PAINTED — the necklace's cord and pearls and the scarf's two tails stay drawn by design |
| P3 glove | PAINTED (map and intro fingertip); the press ripple stays drawn |
| P4 bloom | PAINTED (bunny, flower heads — T5); stems stay drawn |
| P5 pictograms | PAINTED — **but TRACED, T1**. The `leaf` pictogram is in no script line and has no panel |
| P6 Sunbeam, P7 paint pot, P8 Twin Gift | PAINTED (the HUD chip too) |
| P9 book board | PAINTED (re-rolled in `74603a7`); the card edge and mount stay drawn by design |
| P10 carousel, P11 hiding places, P12 Frost Lock ice | PAINTED |
| P13 duel sky / cloud band | STILL DRAWN — left out of the pass by the owner (art-roadmap.md); its near-black `#112` outline is still at arena.ts:267 |
| P14 small silhouettes | PAINTED or routed to an existing sheet: gnomon, planets, snowball, kite bows, dig spray, foam collar, bubble ring, canoe pole, glass chip, every Z, paint blob, both emblems, dialogue leaf, versus trophy, turn phone, chapter-page star, shield. BY DESIGN with a reason in art-roadmap.md: ball finial, knot bead, pinwheel hub (size floor), ch 6 rainbow trail, splash, duel page card / pane strip, rank trophy, rune padlock |
| P15 wards | PAINTED — all six barrier bodies. The versus backdrop stays drawn (it is P13's sky) |

**Three small gaps the check turned up** — the first two FIXED 2026-09-26:
- **The bloom and the help note are never asked for ahead of time.** `prop-bunny`
  and `prop-flower-head` are drawn outside `sec.props`, so no sector records
  them, and `DuelHelpNote`'s sparkle comes from `picto-set-1` only when a
  dialogue scheduled it. Both show the drawing on their first frame until the
  lazy fetch lands. *FIXED: `pageWants` asks for the bunny and flower head on
  any page with a restored card (a bloom can land on any of them), and
  `duelFxWants` asks for `picto-set-1` in the duel's NEXT tier.*
- **A dressed Aurora's dialogue portrait** re-bakes only on `portrait`
  paintings (`story/portrait.ts`); a keepsake painting that decodes after the
  bake leaves the drawn keepsake on her portrait for the session. *FIXED: a
  cosmetic, rig or prop painting landing while she is dressed drops only her
  dressed bakes and bumps `portraitArtRev`.*
- **The VS preview (uncommitted work) asks for `page/vs-backdrop-land` and
  `-port`** (artSchedule.ts), and no such file is in `public/images/pages/` —
  a sheet to paint, or a want to drop (the whole preview is §0.4). The
  painted-art gate keeps builds from requesting it; the dev server probes it.

### 0.3 §1's bugs (B1–B25) and §2's free wins — where they stand

**22 of 25 fixed** (B1–B11, B13–B17, B19, B20, B23–B25), B12 fixed another way
(the resting embers are `prop-mote`, not `prop-flame`). What is left:

| row | now |
| --- | --- |
| **B21** | **RE-ROLLED 2026-09-26** (see §0.1's second pass). Was: the flat pale rectangle in `sectors/5-4-silver-peak-pass.webp` (top left, ~190×170, cutting through a cloud) is real, checked by eye; unchanged since `bfff061`. Re-roll 5-4 |
| B14b | **NOT A BUG** (corrected 2026-09-26). 8-1's `bulbGlow` is TUNDRA's (`kitTundra.ts`), a translucent halo at 28 % alpha with no core at all — the audit read the festival kit's function of the same name, which does draw opaque cores (and takes `painted`) |
| B22 | PARTLY. Plum ink everywhere but the duel sky's `#112` (arena.ts:267) — P13, left out by the owner |
| B18 | OWNER'S CALL, unchanged: the "turn me" dashes show only on the drawn front page; map.ts's comment now says so |
| B4 | FIXED; by design it re-bakes only before the first stroke, so a creature painting that lands MID-wipe still leaves the drawn rescue in the dust |
| B15 | FIXED; the stale `.ad-mark` comment in MapScene.vue is corrected too (2026-09-26) |

§2's canvas free wins are all done. The DOM ones (sparkles, confetti, the
chest marker's clasp tint) were declined with a reason — there is no way to
tint a painting in the DOM (art-roadmap.md). `prop-snowflake` never served the
Frost emblem: it got its own sheet, `gift/emblem-frost-lock` (T8). The map's
replay-star sticker that `prop-star` served is gone with the star feature
(2026-09-25).

§6's stale docs — ALL CORRECTED 2026-09-26 (each with a dated note where it stands). They were: art-roadmap.md:870-874 (the cloth is on
`drawCloth` in all five places now); art-roadmap.md:633-637 (`logSprite` "takes
TWO covers" — wrong for 1-2/1-3/1-5) and :361-363 (the vane finial);
`iconNames.ts:53-56` / `iconPaths.ts:124-128` cite `game/uiArt.ts`,
`IncomingWarning.vue`, `SkillBar.vue`, `game/skills.ts` and `game/weapons.ts`,
none of which exist; story-spec.md:6161-6162 says the snap and reveal traces
stay drawn (both settle into `rune/*` now).

### 0.4 New since the pass — still drawn, on no list

A sweep of everything changed since `ff4e983`, committed or not (the intro
moved forward, the walls, the puppet, the VS preview, the bracket work).

**PAINTED SINCE (2026-09-25, the preview's own session):** all eight slots
below are registered and sliced — both backdrops, both podiums, both name
ribbons, the medallion and the Guardian's crown (`PROMPTS-PREVIEW.md`). Still
drawn: the chapter banner ribbon (no slot) and the countdown stars and banner
pips, where `worldUi/gold-star` would still serve. The table is the finding as
it was written.

**The VS preview — the one big drawn screen left** (uncommitted work). It
shows for 5 s before every duel, and the first one of a session cannot be
skipped. Most parts have a painting slot in the code already, but **none of
the ids is registered** in `artIds` / `artSheet` / `artDraw` and no file
exists, so `art:status` cannot count them (its 338 does not include them):

| what | where | slot in the code |
| --- | --- | --- |
| Backdrop, both halves — sun disc and haze rings, crescent moon with a plum inner line, cloud banks, twelve twinkles | previewArt.ts (`paintDawn` / `paintNight`), baked in previewDraw.ts | `page/vs-backdrop-land`, `-port` (asked for in artSchedule.ts — the §0.2 gap) |
| Podiums — plum-inked cloud pedestals with flowers, stars, a crescent | previewArt.ts, drawn in previewDraw.ts | `island/vs-podium-dawn`, `-night` |
| Medallion — scalloped gold burst, pearls, enamel, crossed horns (the "VS" is DOM text) | vsMarks.ts → VsEmblem.vue (SVG data URL) | `worldUi/vs-emblem` |
| Name ribbons (Aurora, foe) — satin swallow-tails with a star or crescent | ribbonFrame.ts → VsRibbon.vue (9-slice) | `vs-ribbon-aurora`, `-foe` |
| Guardian crown (boss duels; also the banner's 5th pip) | vsMarks.ts → VsRibbon.vue | `vs-crown` |
| Chapter banner ribbon | ribbonFrame.ts `'banner'` → VsBanner.vue | none — "drawn only" |
| **Free win:** the three countdown stars and the banner's star pip | vsMarks.ts → VsEmblem.vue, VsBanner.vue | none, "too small to paint" — but `worldUi/gold-star` (`CHROME_ART.star`) is already painted and fits |

Its glitter, rays, seam light, shockwave, halos, glows and exit flash are
light, and its rune discs and chips are the plated-HUD kind — fine.

**The puppet:** a dark duelist draws the whole vector rig until all nine of
Umbra's puppet parts are on disk (`puppetReady`, puppet.ts); they landed during
this check (untracked), so every foe is painted once they are committed. Only
Pearl and Echo wear Aurora's set.

**Crystals — all fine.** Chapter 4's sector crystals are inside the sector
paintings (and the tap covers are cut from them); `facetLight` only draws
without a painted cover (B14); the Shard of Clear Light, the Crystal Ward
emblem and duel ward, Glint's portrait speckles and the Frost Lock ice facets
are painted; `mCrystal` only runs when a page painting is missing; ch 6's
charm is painted (T7); ch 6, 8 and 10's crystals are in `paint()`. The one
drawn crystal left, the 7-1 fox's gem trinket, is on the KEPT list (§4d). The
chapter 4 pictogram is the look problem in §0.1, not a wiring one.

**Additions to §4's KEPT list:** the intro's page mount (cream card, plum
stroke, drop shadow) and its plum motes — now the first screen of a fresh
save (64dd42f) — the same kind as the restore's paper mount. And for any
duelist wearing a painted puppet set, §4e's vector rig pieces (ink outline,
rim, face, mane/tail/forelock, legs, hooves, hit flash, eye glow) are replaced
by the puppet; the duel sentence's "ward" is painted now (P15).

---

## The 2026-09-24 pass

Full pass, 2026-09-24. The question is not missing sheets: `pnpm art:status`
reads **262 painted, 0 still drawn, 262 in the catalogue**. The question is
what the game still draws PROGRAMMATICALLY (canvas vector, SVG, CSS art) when
`VITE_ENABLE_ART_OVERRIDES` / `?art=on` is on and every painting has decoded —
including dynamic things drawn over a painted background, and things drawn
again on top of a painting that already contains them.

**Method.** A read-only code audit in five slices (duel; storybook/map/dialogue/
intro; sector live layers ch 1–5 and ch 6–10, with a regex census of every
`props:` body diffed against art-roadmap.md §4b's painted and KEPT lists;
restore + wardrobe + DOM UI). The three highest-impact findings (B1–B3) were
re-checked by hand. Nothing was rendered for this pass, so the "looks" of the
candidates are unverified. Line numbers are as of 2026-09-24 and include other
agents' uncommitted edits; they will drift.

**Status words used below**

| word | meaning |
| --- | --- |
| PAINTED | a painting replaces it (sheet named) |
| BY DESIGN | still drawn on purpose — the reason is given (usually art-roadmap.md §4b's KEPT list, §4e, or story-spec §8.20) |
| CANDIDATE | still drawn, has an edge/silhouette, no sheet and no written reason — could be painted |
| GAP | a sheet exists, but this code path still draws the vector (a bug) |
| DUPLICATE | drawn live on top of a painting that already shows the same thing |
| TRACED | (added 2026-09-25) a painting replaces it, but it is a copy of its flat reference and still reads as drawn — §0.1 |

---

## 1. Bugs — a painting exists, but the vector shows, or doubles (code fixes, no generation)

Ordered by what a player sees.

| # | Where | What happens with art on | Evidence | Fix |
| --- | --- | --- | --- | --- |
| **B1** | Chapter 1 tap creature (woods), sectors 1-2, 1-3, 1-4, 1-5 (1-1 partly) | **The moss sprite's hollow log is invisible.** The log exists only as the vector `tapCover` back/front; `paint()` never draws a log at `LOGS`, so the sector painting has none there. On painted art `tapCover` cuts log-shaped patches of *meadow* out of the painting, and the sprite pops out of grass from behind an invisible edge. 1-1's painted log (x 900, w 150) only half-overlaps the tap log (930). 1-4's painted log is at x 300, the tap log at 860. | `LOGS` sectors.ts:451; `logSprite` covers sectors.ts:168, 179; the only `log()` calls in `paint()` are sectors.ts:246 (1-1) and :378 (1-4) | Put the tap logs INTO `paint()` at `LOGS` (and move `LOGS[0]`/`[3]` onto the logs that are already painted), then re-export and repaint 1-2, 1-3, 1-5 (and re-slice 1-1/1-4 if moved). Or, cheaper: draw the log in vector (not as a cover) while no painted log exists under it. |
| **B2** | Map thumbnail of an unrestored 3-3 (Pegasus Stables) | The chapter-3 rescue's **vector nest is drawn over the painted nest** in the dust bake. | map.ts:221-222 — `sec.rescue?.draw(dg,0,0)` sits outside `withCoverLayer`; the tap on the line above is inside. The 2026-09-23 fix covered four call sites; this is a fifth. | Move the rescue call inside the same `withCoverLayer(src, …)` closure. |
| **B3** | Restore, the paint beat (every sector) | The new colour spreads as an opaque disc blitted **over** the live props, tap creature and rescue; butterflies, sails, the rescue etc. vanish for up to 0.55 s until the layer swap. (Art on or off.) | wipe.ts:1480-1487 draws them, then wipe.ts:1503-1514 blits `paintedCv` on top | Blit the spreading colour right after the base colour (wipe.ts:1472), before the props. |
| B4 | Restore, dust bake | A creature painting that decodes after the bake leaves the **drained vector rescue** baked into the dust while the painted one shows under cleared patches. | wipe.ts:348-356 re-bakes on `prop` / this sector's painting only, not `creature`; dust bakes the rescue at wipe.ts:323-326; creatures have no preload | Also re-bake on `c.kind === 'creature'`. |
| B5 | Restore, the chest's rune reveal | After the trace, the **drawn glyph** is held and faded for 1.2 s although `rune/*` paintings exist (RuneTrace.vue already settles back to the painting). | wipe.ts:1656-1673 | Draw `rune/*` for the hold. |
| B6 | Restore HUD tool chip | The chip draws the **sponge and eraser as inline SVG** right under the painted `tool/stardust-sponge` / `tool/magic-eraser` on the canvas. | WipeScene.vue:57-70 | An `<image>` inside the same SVG, as RuneGlyph.vue:53-61 does. |
| B7 | Duel win flourish on a boss | The arena gift is always the parcel/box, never the **chest** the map and restore show (whose painting exists). | duelFlow.ts:230, gift.ts:693 vs map.ts:1561 | Pass the boss flag to `setArenaGift` → `drawChest`. |
| B8 | Creature beats and overlays | **Hand-rolled four-point twinkles** that bypass `prop-twinkle` (`twinkleAt` exists and is tinted). ~100 instances a frame at peak. | kitSummit:229 (the 53 constellation stars — drawn at rest too), kitSummit:1504, :1640; kitTundra:2128, :2327; kitMirror:1440-1443, :1621; kitCaves:1839-1844, :2024-2038; bloom.ts:126-136, :146-153; twinGift.ts:146-164 | Route each through `twinkleAt(…, col)`. |
| B9 | Hearts | Drawn hearts where `prop-heart` exists. | sectors.ts:200-208 (woodSprite rescue), wanderer.ts:89-108 (Umbra's hearts on the map) | `heartAt`. |
| B10 | Puffs | Drawn puffs where `prop-puff` exists. | kitTundra:2107-2130 (`frostPuff`, every ch 8 tap), sectorsC8:412-425 (8-4 snowball burst) | `puffAt` (white tint, as `smoke` uses). |
| B11 | Bubbles and notes | kitBay:2196-2206 (sea-foal tap bubbles, `bubbleAt` unused); kitBay:2213/2278 (singing-shell notes — same shape as `prop-note`, not wired) | as listed | `bubbleAt`, `NOTE_ART`. |
| B12 | 7-5 braziers at rest | Two inked **ember discs** drawn with no art check — baked into the dust and visible through the whole wipe of 7-5. | kitSands:1707-1710 | Use a `prop-flame` panel (or skip) at rest. |
| B13 | 1-4 Treehouse Hollow | **Five inline lanterns** (ellipse + ink) drawn every frame in `props()` and baked into the dust; not in `paint()`, no sheet used. | sectors.ts:397-400 (glows :390-395 are fine) | `prop-lantern` (tinted). |
| B14 | **Duplicates** (drawn over a painting that already has it) | 3-1 bunting **cord** stroked again over the painted rope; 3-5 castle lamps: `prop-star` blitted exactly where `lampPost` already painted a star; 10-5 cake: `flameGlow` redraws inked candle flames over the painted `layerCake` flames; festival `bulbGlow` opaque cores cover the painted `bulbDots`; ch 4 tap `facetLight` lays a vector facet over the painted crystal. | kitSky:1488-1491 vs sectorsC3:81-84; sectorsC3:364 vs kitSky:1143; kitFestival:2314-2324 vs :1973-1994; kitFestival:420-428; kitCaves:1833 | Drop the live cord (keep the painted one); drop or register the lamp star; keep only the flame halo on the cake; make the bulb core a glow; drop the facet fill. |
| B15 | Twin Gift | Two different "video" marks on one gift: the box's own drawn film strip beside the painted movie-camera chip. | gift.ts:543-563 vs MapScene.vue:284-285 | Drop the drawn strip. |
| B16 | Album stickers | The creature is painted, its hiding place (log, bucket, snowbank, the ch 3 nest) is drawn — the bake passes no cover layer. | album/stickers.ts:14-17, :207 | Bake a cover layer from the sector thumbnail. |
| B17 | Boot | The canvas fill behind the splash is still flat `#9E7CBE` — the last of the four cloth copies the roadmap moved to `drawCloth`. | AppScene.vue:475-478 | `drawCloth`. (Low: the splash hides it.) |
| B18 | Front page | The dashed "turn me" trail is dropped whenever the painted front page shows (it lives only in `paintFrontPage`). Intended since the rainbow swipe, or a lost hint — decide, then fix the comment or the code. | map.ts:1260-1272 vs drawFrontPage:1304-1306 | Owner's call. |
| B19 | Duel page | A spell that blows the dust off shows the painting **without its props** (props exist only frozen inside the dust layer); a practice duel on a restored sector has no props at all. Art on or off. | duelPage.ts:158, :171, :163-169 vs wipe.ts:1473-1480 | Draw `sec.props` live between the clean layer and the dust, as the wipe does. |
| B20 | Duel, the Prism boss (perf, art on only) | Her horn gets a new `hsla()` every frame, so the painted horn builds a fresh tinted copy + mask per frame and churns the 64-entry tint cache. | chars.ts:793-797 → artItem.ts:74, :93-98 | Quantise the hue, or key the mask without the colour. |
| B21 | Sector painting 5-4 | Possible **painting defect**: a flat pale rectangle, top-left, ~190×170 of 1152×672 — near Aurora's HP bar in that duel. | public/images/sectors/5-4-silver-peak-pass.webp | Look, re-roll if real. |
| B22 | Near-black ink over paintings | Glyphs and the rig moved to plum `#3A2340`; these still ink near-black over painted art. | fx.ts:111 `#140d18`; render.ts:63, :243, :437, :468 and forgeArt.ts:34 `#1a1030`; render.ts:795 `#150f1c`; arena.ts:267 `#112` | Plum. |
| B23 | Duel rig | The chest tuft draws three **inked scallops inside the painted barrel** — against §4f's no-interior-line rule. | chars.ts:978-982 | Fold into `rig-barrel`, or drop its outline. |
| B24 | Restore mount (minor) | The sector painting is not clipped to its rounded corners (the map clips). | wipe.ts:1446-1472 vs map.ts:1450-1456 | Clip. |
| B25 | Boss "next up" silhouette (low confidence) | The flat plum boss silhouette may pick up the painted rig parts' shading with art on (`partArt` still runs inside it). | map.ts:1462-1475, chars.ts:376-417 | Check on the rig harness. |

## 2. Free wins — reuse sheets that already exist (no generation)

Beyond the bug rows above (B5–B13), these candidates need no new painting:

| sheet | would also serve |
| --- | --- |
| `prop-twinkle` | Dream Dust motes (render.ts:608), hoof trail + Pastel Dream twinkles + Pet Star trail (rig-cosmetics.ts:413-445, :623-651, :856-859), the sponge's corner star (gift.ts:417-434), the Pet Star badge sparkles (icons.ts:214), DOM sparkles (HpBar.vue:419, DuelLightbox.vue:94, RuneSlot.vue:131-144, SpellBook.vue:557, duel.sass:170-180 book "new") |
| `prop-star` | the duel's KO stars (chars.ts:1188-1208), the map's replay star sticker (badge.ts:117-139) |
| `prop-snowflake` | the Frost Lock ice block's flakes (render.ts:783), the Frost signature emblem (wipe.ts:1601) |
| `prop-confetti`, `prop-mote` | FReward / FinaleCard confetti (FReward.vue:100, FinaleCard.vue:61) |
| `rune/*` | the duel's snap flash (render.ts:481-494) — a whole glyph that scales and fades; the "a trace is motion" reason does not describe it |
| `gift/boss-chest` | the spellbook's "comes from a chest" marker (SpellBook.vue:181) |
| `prop-pennant` | Sprig's flag (kitFestival:2450, :2489) — swing is a rotation, ripple is the sheet's 3 panels, colour is a tint |

## 3. New paintings worth making — candidates, most visible first

| # | Asset | Where drawn | Seen | Note |
| --- | --- | --- | --- | --- |
| P1 | **14 second-shelf keepsakes** (acorn cap, star tiara, goggles, bow tie, moon pendant, butterfly wings, explorer pack, pet cloud, pet firefly, petal/frost/bubble trails; the moonlit/sunset looks are palettes and need nothing) **+ their 14 shelf badges** | rig-accessories.ts:97-899 (`VECTOR_ONLY_KEEPSAKES` :978); icons.ts:227-270 | wardrobe, duel, photo cards, portraits | Declared "NOT PAINTED YET" (rig-accessories.ts:36-42). Start with the still pictures: the head items, pet cloud, pet firefly, bow tie, explorer pack |
| P2 | **Pegasus wings, seashell necklace, winter scarf** (first shelf) | rig-cosmetics.ts:146-187, 191-258, 763-821 | whenever worn | File header: "procedural until Step 3's painted overlay replaces it". The `keepsake-*` paintings are only shelf badges. Wings keep one shape (the flap is a rotation) |
| P3 | **The map's show-how glove** (+ the intro fingertip pad and ripple) | map.ts:drawGlove:745-796; intro.ts:765-779 | the first seconds of every session that opens on the front page | Thick-inked white sticker on the painted front page; one still serves both |
| P4 | **Bloom: bunny + tall flower heads** | bloom.ts:44-123 | every bloomed sector, for good (what a rewarded ad buys) | Two sheets; stems stay hairlines |
| P5 | **Dialogue pictograms** (24 inked SVGs) | pictos.ts:108-195 via Picto.vue; also DuelHelpNote | 1–2 on every dialogue beat, beside a painted portrait | No ArtIcon route today |
| P6 | **Sunbeam** (wand, sun, rays) + its HUD chip | gift.ts:drawSunbeam:592; WipeScene.vue:52-56 | every boss wipe | story-spec §8.20's "continuous state" reason predates the roadmap's "paint the shape, keep what moves it" |
| P7 | **Paint-pot jar** (one neutral jar, tinted per pot) | UnboxScene.vue:48-59 (DOM SVG) | every restore | keep the marks as SVG |
| P8 | **Twin Gift box** (2-panel strip, like the standard gift) | gift.ts:drawTwinGift:516-584 | map, after a restore | Only the bow's opening is argued (story-spec §8.20) |
| P9 | **Book cover board + block of leaves** (+ page-card edge, card mount) | map.ts:drawBoard:1167-1193, drawCard:1116-1136, drawSector:1437-1448 | always, on the map | The largest drawn surface left there. Roadmap step 1 promised "book COVER/binding — 2 sheets" (art-roadmap.md:74); only the cloth shipped |
| P10 | **10-2 carousel: the drum and the six unicorns** | kitFestival:1018, :959 (via :1056, :1087) | 10-2 | The drum never moves and is 116×172 SU; the unicorns are already named by §4b |
| P11 | **Rescue hiding places drawn in vector**: 4-3's rock nest (~160×44 SU, permanent on the done sector), 1-3's moss bed, 8-3's ice block + snow cap (in the dust for the whole wipe) | kitCaves:1993-2021; sectors.ts:193-196; kitTundra:2287-2316 | those sectors | Either paint them INTO their sector (`paint()` + repaint) or give them sheets. CLEAR_SHARD_ART's comment says the rock "belongs to the sector" — the sector does not draw it |
| P12 | **Frost Lock ice block** | render.ts:drawIce:783 | whenever a side is frozen, for seconds | A fixed 168×214 shape; old near-black outline |
| P13 | **Duel sky: the cloud band** (and the scoreboard rainbow) | arena.ts:251-271, drawn :363-378; rainbow :350-361 | **every duel, full-strength multiply from frame 1** | BY DESIGN (story-spec §8.29, the sky is the scoreboard) — but it is the biggest vector element over any painting, has a near-black `#112` scalloped outline, and doubles the painted clouds (and 3-3's painted rainbow). Owner's call: paint a drop-in band (it is already a baked tileable bitmap), or at least re-ink it plum/soft |
| P14 | Smaller silhouettes, in neither list | 7-3 sundial **gnomon** (kitSands:1115-1121 — a still drawn in `props()`, so the painting lacks it); 9-5 Nova's **3 planets** (sectorsC9:351-365); 8-4 **snowball** + start-flag **ball finial** (sectorsC8:401-411, :384-387); **kite tail bows** (kitSky:1638-1652, 3-4 and 6-4); ch 6 foal's **rainbow trail** (kitRidge:1789-1805); ch 7 fox **dig spray** (kitSands:2260-2272); 10-1 banner **knot bead** (kitFestival:2408-2411); **pinwheel hub** (kitSky:1571); 2-2 buoy **foam collar** (kitBay:1872); sea-foal **bubbleRing** (kitBay:2147); 4-2 **canoe pole** (kitCaves:1146-1154); 5-3 **fallen chip** (kitMirror:1604); the **"z" / `zzz` glyphs** of the 1-3, 3-3, 4-3, 5-3 rescues (sectors.ts:212-217, kitSky:2220, kitCaves:2023, kitMirror:1613) and the duel's KO Z's / Dream Dust Z (render.ts:662-687, :608); restore **paint blob in flight** (wipe.ts:1829) and **signature emblem** (wipe.ts:1601); **splash background** (FLogoProgress.vue:~186, already queued as `ui/splash-cover`); duel **portrait page card / pane strip** (render.ts:930-945, :980-986); **dialogue paper leaf** (DialogueBubbles.vue:275-292, a 9-slice like the HP frames); rank **trophy** (RankBadge.vue:106); locked-rune **padlock** (RuneTrace.vue:90-92); versus **trophy**, turn-sideways pictogram, chapter-page ★, shield emoji | Several bypass `INK_SCALE` (`zzz`, the canoe pole, the 3-2 crest glint set `lineWidth` raw), so they ink heavier than the kit |
| P15 | Only if the VFX rule is reopened | the duel's **barriers** (wind sphere, ice pillar, rock stack, bubble ward, crystal ward, frost dome — fx.ts:898-1067) are persistent constant shapes, not pooled particles; the **versus backdrop** is all vector except the island | fx.ts; duelPage.ts:22-23 | art-roadmap.md:945 says never paint the duel's VFX — these two are the borderline cases |

## 4. Still drawn on purpose — the KEPT list, by scene

Not a to-do list: what stays vector with art on, and why, so the next pass
starts from it.

**Duel.** Sky wash gradient, scoreboard rainbow and cloud band (story-spec
§8.29 — but see P13); rain and win motes; hit flash and vignette. The rig's ink
outline, bounce rim, face, mane/tail/forelock, legs, hooves and hit flash (§4e);
contact shadow; the foe's dread aura, eye glow and horn charge (light). Every
spell body, ribbon, particle, afterlife, fire-rain band, ward and forge effect
(art-roadmap.md:945 — pooled, re-tinted per frame). The player's stroke, rune
traces, lesson guides and dots (a trace is motion; the stroke is the input).
The pad frame and versus halves (hairlines). New this pass and light-only: the
combo telegraph's horn glow, the KO Z's (see P14), the re-anchor motes. DOM:
HP track/fill/chips, forming ring, slot glows, the plated HUD and GameIcon set
("the shared glyph set is the look", artFolders.ts), spellbook spine/paper.

**Storybook / map.** The book's contact shadow, spine, stitches, gutter shadow
(the reason for keeping the spine is only in a memory file — write it into the
roadmap); the dotted trail between markers ("dashes are UI"); the sleeping-
chapter page (unreachable today — all ten chapters are built); page dots; the
thumbnail dust noise (story-spec §8.20); the breathing node ring; gift glows;
the rainbow swipe ribbon and press ripples; page-turn light and shadows; the
reduced-motion paper dip; the splash gradient (must match index.html's pre-JS
splash); the portrait badge disc and ring (the circle is a cut); Aurora's
portrait when she wears a cosmetic (drawn from the rig, whose parts are
painted).

**Sectors (§4b's KEPT list, verified against the current code).**
`prismBeams`, `beam`; `aurora`; every soft glow (`glow`, `glows`,
`lanternGlow`, `bulbGlow`, `pearlGlow`, `halo`, `flowerGlows`, `flameGlow`'s
halo, `wallGlow`); `skyPuff`, `driftCloud`; `shimmer`, `mirrorGlint`;
`ripples` and `drip`'s ring; `lap` (the shoreline); `constellation` lines;
`hgStream`; `reflect`, `mirrorLake`, `echoBird`'s echo; `miniRainbow` in
general; every cord and string (bunting, lantern strings, balloon bunches,
kites, charms, swing ropes, mooring lines) and the ~15 bare `ink(…)` strokes
incl. the 14 static pole stubs drawn in `props()` (they could move into
`paint()`); the carousel's brass poles and the Ferris wheel's spokes and rim
bulbs; the fox's paw and trinket (§4d); creature glow haloes. Light with no
edge that the list does not yet name (add them): 6-5 deck-glint arc, 8-2 skate
trail, 9-4 moon shimmer, the shooting stars' tails, 7-3 the dial's shadow
wedge, 3-2 crest glint, 2-2 lamp core, `fishJump`'s splash rings, the 4-3
rainbow fan, the ch 5 mirror line, the shell and shard contact shadows.

**Restore.** The paper mount; plum motes on the cloth (below the size floor);
the dust's noise grain ("no FX-NOISE"); the reveal wave front; gift/chest
glows and the clasp gleam; every burst, glint, trail, bubble and puff (fx);
the beam wedge, slingshot band and sponge footprint ring; pot cue haloes and
the landmark target ring; the rune trace itself.

**Wardrobe / album.** The corner shadow and the bulb haloes over the painted
room; slot tabs, tent tabs, pose camera and mane swatches (deliberately
flatter than an item badge, icons.ts:400-412).

## 5. Checked and clean

- Chapter pages carry their marginalia in the painting; the live `pageDecor`
  bake is skipped. No page painting has a trail, border, ribbon or folded
  corner; the front page painting has no tent or Aurora; thumbnails have no
  frame; the node badge painting has no ring; intro-3 has no painted rune; the
  cloth draws once per frame.
- Restore: `sec.paint` runs only as the no-painting fallback and in off-screen
  masks — no vector sector under the painting.
- Every `tapCover` in chapters 2–10 cuts from a cover `paint()` really draws;
  the 45 non-woods tap covers and the 3-3, 2-3, 5-3 rescue covers are sound.
- All 50 sectors' `props()` bodies: every function called directly is on the
  painted or the KEPT list (139 call sites in ch 1–5: 98 painted, 39 kept,
  2 inline exceptions = B13 and the 3-2 glint).
- The wardrobe room, rug, tent, bookmark, badges, gifts, tools, islands,
  portraits, rune icons, HP frames and the movie icon are all painted where
  shown.

## 6. Stale docs found on the way

- art-roadmap.md:74 still promises "book COVER/binding — 2 sheets" (P9).
- art-roadmap.md:870-874: the restore's cloth is painted now; the boot fill is
  the one flat copy left (B17).
- art-roadmap.md:638-642 says the rescue cover fix reached map.ts; one of its
  two call sites was missed (B2).
- The woods tap note ("a crisp vector log sat on the painted one") and
  sectorDef.ts's contract ("front must be a prop `paint()` already draws") are
  wrong for 1-2…1-5 (B1).
- STAR_ART's comment and the roadmap say `prop-star` serves the vane tower's
  finial; its only live call site is the 3-5 castle lamps (B14).
- iconNames.ts:53-56 and iconPaths.ts:127-128 cite `game/uiArt.ts` and
  `IncomingWarning.vue`, which do not exist.
- story-spec.md:6162-6168's "stays drawn" reasons (Twin Gift, Sunbeam, the
  sponge's star, keepsake sparkles) predate the roadmap's "paint the shape,
  keep what moves it" rule — worth re-arguing (P6, P8, §2).
