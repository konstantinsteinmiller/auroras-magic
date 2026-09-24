# Paint outstanding — what is still drawn in code with the art layer on

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
