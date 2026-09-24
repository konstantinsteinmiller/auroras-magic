# Auroras Magic — art style

The single consistency reference for every painted asset: characters, props,
backgrounds, VFX, UI and store art. If a new asset disagrees with this page, the
asset is wrong, or this page gets a dated amendment. Never let a one-off drift
quietly become the style.

**In one line:** *cute chibi picture-book magic, drawn by hand.* Big-headed,
big-eyed unicorns drawn with a soft brush line that varies and fades, and
painted colour with soft-edged shadow, in a warm world that glows. Hand-drawn,
not sketchy — and never an even stroke traced round everything.

Audience: a cozy unicorn fantasy for everyone, made especially appealing to
girls aged 3–12. It is not a "kids only" game, and it must never look babyish.
The youngest players are about 3, so everything must still be safe for them.
The owner decided this on 2026-09-18 (D1, `story-spec.md` §2 and §13),
sharpened it on 2026-09-19, and settled the painted look on 2026-09-20 (§0
below). Everything must read as friendly, safe and magical at a glance,
including on a phone held upright.

**How to read this page.** It covers two kinds of art that must look like one
world but are made in completely different ways:

- **DRAWN** — what `src/game/` paints on a canvas every frame. Its rules are
  shaped by what a canvas stroke can do cheaply, so they favour constant
  weights and flat fills. §2–§8 are written for it.
- **PAINTED** — the drop-in bitmaps the image model makes, governed by the
  active profile in §0. Where a §2–§8 rule and §0 disagree, **§0 wins for
  painted art** and the section carries a dated amendment saying so.

The two are on screen together for the whole rollout — a painted sector under a
drawn rig — so neither may drift on colour, layout or proportion. Where they
legitimately differ is line and shading, and only there.

---

## 0. The art-style decision

**Current style: `cozy-handdrawn-v2` — "Cozy hand-drawn storybook".** Decided
by the owner on 2026-09-20, on seeing v1's first two paintings.

> A cosy, cute, HAND-DRAWN storybook illustration — a page from a picture book
> drawn and painted by a person, with soft varied brush lines, gently painted
> colour, and chibi anime characters.

Why it replaced v1: v1's returns were faithful, clean, and looked
**machine-made**. An even plum stroke traced around every shape, flat fills
under a hard cel mask, tree canopies that were circles and hills that were
arcs. That was not the painter disobeying — v1 *asked* for it ("ONE clean
outline around every shape"; "if the outline has thinned to a hairline it is
several times too thin"). The owner's words on the first page: *"the rest of
the world does look like procedurally generated… make it cute, cozy and
handdrawn (no excessive stroking) with chibi + anime character design."*

v2 moves the weight off the outline and onto drawn shape and painted colour,
and promotes the expression from a mood to a hard requirement — the same page
had come back with a blank-faced Aurora.

**What it pins down** (the details are in §1–§9):

| | |
| --- | --- |
| Feel | Hand-drawn and hand-painted; the small irregularities a hand makes are the point |
| Proportions | Chibi anime: big round head about as wide as the body, compact body, short sturdy legs (§3) |
| Faces | Large glossy anime eyes with two catch-lights, lashes, blush; the expression must be unmistakable at a glance — a blank face is a failed drawing |
| Line | A soft brush line in plum (`#3A2340`), never black, **varying in weight and tapering to nothing**; small things carry no line at all. Never an even stroke around everything |
| Colour | Painted, with soft variation across a shape and a soft-edged shadow; not a flat fill under a hard cel mask (§4) |
| Mood | Cozy, warm, magical; gloomy is allowed, scary never (§1, §5) |
| Never | An even outline round every shape, perfect circles and arcs, flat single-tone fills, blank faces, grunge or photo texture, realistic horse anatomy, a western-cartoon or 3D-render look |

Costs nothing in bytes: the first v2 page ships at 36 kB against v1's 37 kB,
and the portrait strip got *smaller* (27 kB against 33 kB) because a soft,
broken line compresses better than a hard uniform one.

**APPROVED by the owner on 2026-09-20** — *"that's exactly the artstyle I was
looking for"* — on seeing the first two v2 paintings.

### 0.1 The approved reference — look at these before painting anything

Two files ARE the style. When a rule on this page and these pictures disagree,
the pictures win and the page gets a dated amendment:

| | |
| --- | --- |
| `public/images/story/intro-1.webp` | a full-bleed scene: brush-textured grass and hills, a line that fades out across the meadow, unoutlined flowers and pebbles, a warm daylight palette |
| `public/images/portraits/portrait-aurora.webp` | a character strip: soft varied contour, gold-led mane, large anime eyes with two catch-lights, four faces that read at a glance |

They were painted from `art-sheets/story-intro-1.png` and
`art-sheets/portrait-aurora.png`, and the prompts that produced them are in
`art-sheets/PROMPTS-STORY.md` and `PROMPTS-PORTRAITS.md` — generated, so they
regenerate from `artStyle.ts` rather than being edited.

What the approved pair settles, beyond the profile's words:

- **A character is painted from its model strip, never from the scene
  reference's placeholder.** The scene drawing gives position, size, facing and
  action; the model gives the build and the face.
- **A page names WHICH of the model's moods it wears.** A model is four or five
  faces side by side; a page that does not choose gets a blank one.
- **Aurora's mane is gold-led** — butter-gold as its main colour with pastel
  streaks through it. An all-pastel rainbow mane is a different character.

### History — `cozy-chibi-v1` (superseded 2026-09-20)

Decided 2026-09-19. "Cute, cozy chibi anime-style picture-book illustration:
big heads, huge sparkly eyes, rounded friendly shapes, soft pastel colours and
warm magical glows." Flat cel colour, one base tone and one violet-shifted
shadow, one confident plum outline at about 1 % of the subject's height. Kept
in `ART_STYLES` so any painting stamped `cozy-chibi-v1` can still be read back
against the brief it was made under. Nothing shipped under it.

**Where it lives in the code.** `src/game/artStyle.ts` holds this decision as
a named, versioned profile (`ART_STYLES['cozy-handdrawn-v2']`, selected by
`ACTIVE_STYLE_ID`). Every prompt the art pipeline writes
(`src/game/artSheet.ts`) builds its style blocks from that profile and nowhere
else, and every painting is stamped with the style id it was made in (the
slicer's receipt).

**What it is applied to.** Everything the game draws that can be painted
(story-spec §8.20, §8.26, §8.27):
- the 50 sectors;
- the gifts, tools, tent and keepsakes;
- the 12 runes;
- the 7 keepsake badges on the wardrobe shelf;
- the 20 dialogue-portrait strips (one per speaker, every expression);
- the 10 duel islands;
- the intro's 4 picture-book pages;
- the 9 live props a sector's `props()` moves over its painting — the
  butterfly, the gull, the dove, the swallow, the duck, the leaping fish, the
  crab, the mill's sails and the water wheel (amended 2026-09-21;
  `art-roadmap.md` §4b). Their motion stays the drawing's own transform: only
  the shape becomes a painting.
- the Wardrobe Kiosk's ROOM — the inside of the dressing-up tent, one picture
  per orientation, and the rug Aurora stands on (amended 2026-09-21;
  `art-roadmap.md` §4c). Its corner shadow and its bulbs' twinkle stay drawn
  over the painting, and so does she.

The pieces with a character in them (the portraits and the intro pages) also
get the profile's CHARACTER rules. The intro pages are painted from the
painted Aurora and Umbra portrait strips, so the cast looks the same
everywhere. What stays drawn is the animated duel rig and the effects: they
move every frame, and painting them needs a part-by-part layer split first.
(The map's and the wardrobe's backdrops were on that list until 2026-09-21;
both now have the split — the room's is `paintWardrobeRoom`.)

**To change the style later:**

1. Add a new profile to `ART_STYLES` with a NEW id, e.g. `watercolour-v1`.
   Never edit a shipped profile: its id is stamped on the paintings made
   under it.
2. Point `ACTIVE_STYLE_ID` at it, and record the new decision here: move this
   section to a dated "Previous decisions" list and write the new one in its
   place.
3. Run `pnpm art:prompts`. The prompts are rewritten, and `PAINT-STATUS.md`
   and the Art Desk mark every painting made under the old id as "REPAINT —
   the art style changed".
4. Repaint. Until each file is redone, the old painting (or the procedural
   drawing) stands in, so the game never breaks mid-change.

**What a style change does not touch:**
- the magenta ground and the sheet layouts;
- the neutral colour-me regions;
- the "no text in a picture" rule;
- the sizes the game blits into.

Those are the pipeline's contracts (`LAYERS.md`, `SLICER.md`), not the look.

**Previous decisions:** `cozy-chibi-v1` (2026-09-19 → 2026-09-20), in the
History subsection above. Nothing shipped under it.

## 1. Pillars

1. **Cute first.** Round shapes, soft corners, big eyes, small mouths. Nothing
   pointy that is not a horn, a star or a crystal.
2. **Chibi proportions.** Heads are huge, bodies are compact, legs are short and
   sturdy. See §3.
3. **Hand-drawn, but with restraint.** No sketch lines, doubled strokes,
   crosshatching, scribbled texture or hairy "concept art" edges. If a line does
   not describe the silhouette or a key feature (eye, mouth, mane lock,
   horn spiral), leave it out.
   *DRAWN:* one clean, confident outline per shape with a little natural weight
   variation. *PAINTED (v2):* a soft brush line that varies freely, tapers to
   nothing at stroke ends and on lit edges, and is absent altogether on small
   things. Never an even stroke traced round everything.
4. **Colour that is not flat.**
   *DRAWN:* a base tone plus **one** soft cel shadow tone and a small highlight.
   *PAINTED (v2):* soft variation across each shape with a soft-edged shadow
   that follows the form, warm where light bounces back in.
   In both, gradients across a whole character are still wrong; they belong to
   skies and glows.
5. **Readable at thumb size.** Every character and rune must be identifiable as
   a 64 px silhouette and in greyscale (§8).
6. **The sky tells the story.** The world lightens toward rainbows as Aurora
   wins and dims to a soft, rainy dusk as she struggles. It gets gloomy but
   never scary. This keeps the jam build's "the sky is the scoreboard" rule.

## 2. Line

> **Amendment 2026-09-20 (`cozy-handdrawn-v2`).** The table below describes
> the PROCEDURAL renderer's line, where a constant weight is what a canvas
> stroke can do cheaply, and it stays correct for the drawn art. The PAINTED
> art no longer follows the "constant within one asset" rule: a painted line
> varies freely, tapers away to nothing at stroke ends and on lit edges, may
> lift and break, and is simply absent on small things (flowers, pebbles,
> grass, sparkles, distant trees). A constant-weight outline traced round
> every shape is the "sticker" look v1 produced and v2 exists to stop. The
> line COLOUR (`#3A2340`, never black) is unchanged and applies to both.
>
> **The drawn rig was brought into line on 2026-09-20.** `chars.ts` had inked
> in the jam build's near-black `#150f1c` since the port — this page has asked
> for plum since the style was pinned, and the code simply never followed. It
> stopped being cosmetic the moment painted scenes shipped: the rig stands ON
> a painted, plum-inked meadow, and near-black on it read as a sticker pasted
> onto a painting. `blob` also gained a fourth cel step (same total offset,
> half the jump at each edge) so the turn into light stops reading as a band
> beside the paintings' soft-edged shading.

| Property | Rule |
| --- | --- |
| Colour | Warm deep plum **`#3A2340`**, not pure black. Night / rival characters may use **`#241A3A`**. |
| Outer contour | ~**0.8 %** of the asset's height (≈ 4 px on a 512 px sprite). Constant within one asset — drawn art only; see the amendment. |
| Inner lines | 50–60 % of the contour weight. Only for eyes, mouth, ear inner, mane lock partings and the horn spiral. |
| Weight variation | Slightly heavier on the shadow side and at overlaps; lighter on the lit top edges. Subtle, 1.0×–1.3× for drawn art; unbounded for painted art. |
| Ends | Round caps and joins. Line ends taper softly where a stroke fades into a form (mane tips, cheek fur). |
| Forbidden | Sketch passes, broken or doubled lines, hatching, speed lines inside forms, texture brushes on outlines. |

## 3. Proportions (chibi)

- **Head : body ≈ 1 : 1.2** for unicorns seen side-on. The head is as wide as
  the barrel.
- **Eyes** fill about **⅓ of the face height**, with a large glossy iris, one
  big and one small catch-light, and a soft coloured lower lid. Lashes are 2–3
  simple strokes on the upper lid only.
- **Muzzle** small and rounded; nostril is a dot; mouth is a tiny curve
  (smile, "o", or a small open grin).
- **Horn** slightly oversized (≈ 0.6× head height), spiral shown by 2–3 curved
  bands, never sharp enough to read as a weapon.
- **Legs** short, sturdy, slightly tapered, with rounded hooves. Keep the jam
  rig's readable pose language (planted stance, rear on cast, hop on win,
  sit-down on defeat), but softer and rounder.
- **Mane and tail** are a few large, soft locks (3–5), not many thin strands.
  Locks can carry pastel rainbow streaks.
- Blush dots on the cheeks (soft pink, 30–40 % opacity look).

## 4. Colour

### 4.1 Shading model

> **Amendment 2026-09-20 (`cozy-handdrawn-v2`).** The hard-edged cel shape
> below is the DRAWN renderer's shading and stays correct for it. PAINTED art
> uses the same *structure* — one shadow, one highlight, light from the top
> left — with **soft edges** and gentle variation inside the shape instead of a
> flat fill under a hard mask. The tones and the direction are shared, so a
> painted sector and a drawn rig still agree about where the sun is.

- Base + **one** shadow tone (≈ 15–20 % darker, shifted slightly toward violet),
  laid in as a hard-edged cel shape following the form (drawn), or as a
  soft-edged shape that follows the form (painted).
- Optional **highlight**: a small, soft, near-white shape on the top-left of
  round forms (head, barrel, horn, hooves). Never more than one per form.
- Key light from the **top-left**, a warm tint. Bounce light is not drawn, except
  as a thin rim on dark (night) characters so their limbs do not merge.
- Contact shadow under characters: a soft, flat plum ellipse at ~25 % opacity.

### 4.2 Core palettes

**Aurora (hero)**

| Role | Hex |
| --- | --- |
| Coat | `#FFF6E4` |
| Coat shadow | `#F2D9C7` |
| Mane / tail base | `#FFD36B` |
| Mane streaks | `#FF9ECF` pink · `#C7A6FF` lilac · `#9FF0D0` mint · `#9FD8FF` sky |
| Horn | `#FFE08A`, bands `#F5B94F` |
| Hooves | `#E0A96B` |
| Eyes | iris `#7A4FD1`, pupil `#3A2340`, catch-lights `#FFFFFF` |
| Blush | `#FF9EB5` |

**Rivals.** Mischievous, not menacing: sleepy eyes, a smug little grin. Night
coat with an element-coloured mane, the way the jam build re-tints Umbra per
ladder rung.

| Rival | Coat | Mane / glow |
| --- | --- | --- |
| Umbra (night) | `#4B3A78`, shadow `#35295A` | `#B58CFF` + `#7FF3FF` streaks |
| Ember (fire) | `#5A3B6E` | `#FF7A59` / `#FFB36B` |
| Zephyr (wind) | `#3F4F7A` | `#8FF0E0` / `#E4FFFB` |
| Glace (ice) | `#3D4A82` | `#7CC7FF` / `#DDF2FF` |
| Terra (earth) | `#4E3F62` | `#C9955E` / `#EED0A6` |
| Prism (finale) | `#3A2F66` | cycling rainbow: `#FF9ECF` `#FFD36B` `#9FF0D0` `#9FD8FF` `#C7A6FF` |

**Runes and spells.** The element hues the player learns in the HUD stay fixed.
Only the lightness is softened for the painted art:

| Rune | Glyph | Core | Light | Accent shape language |
| --- | --- | --- | --- | --- |
| Fire | triangle | `#FF7A59` | `#FFC48A` | rounded flame tongues, little star sparks |
| Wind | double wave | `#8FF0E0` | `#E4FFFB` | swirls, curls, soft crescents |
| Ice | Z | `#7CC7FF` | `#DDF2FF` | snowflakes, rounded crystals |
| Earth | square | `#C9955E` | `#EED0A6` | pebbles, leaves, blossoms |

**World**

| Role | Hex |
| --- | --- |
| Day sky (winning) | `#9FD8FF` → `#FFE3F1` toward the horizon |
| Storm sky (even) | `#7E88B8` → `#B7A9D6` |
| Dusk sky (losing) | `#2E2A55` → `#5B4A86`, soft rain, never black |
| Moss / grass | `#8EDB6A`, shadow `#5FB35A`, lip `#D6F58A` |
| Island rock | `#8C7BB0`, shadow `#6A5A92` |
| Rainbow | `#FF9ECF` `#FFB36B` `#FFE08A` `#9FF0D0` `#9FD8FF` `#C7A6FF` |

### 4.3 Colour rules

- Maximum saturation lives in magic (runes, glows, rainbows). Characters and
  props sit a step softer, so the spells always pop.
- No pure black (`#000`) and no pure white fills larger than a catch-light.
- A hue must never be the ONLY cue: every element also has its own glyph and
  shape language (colour-blind players, §8).

## 5. Environments

- Floating mossy islands, soft cumulus clouds, a distant rainbow, drifting
  sparkles and petals. Painterly soft gradients across a whole SKY are fine;
  across a whole character or prop they are not. Mid- and foreground objects
  follow the character rules (drawn: outline + cel; painted: §0's varied line
  and soft-edged shading).
- Depth through value and saturation: far layers are lighter and bluer, with
  no outline or a very light one. **This is a rule for the BACK of the
  picture only.** Applied to the whole scene it drains it, which is exactly
  what one v1 return did — everything from the mid-ground forward keeps its
  full, warm colour, as saturated as the drawn reference.
- The duel window must stay readable. Keep the band between the two unicorns
  (stage x ≈ 470–810) free of high-contrast detail. That is where spells fly
  and where the eye reads the fight.

## 6. VFX

- Built from rounded cel shapes with the soft plum outline: stars, hearts,
  sparkles, puffs, swirls, snowflakes, leaves. This keeps the jam build's "one
  shape vocabulary per element" idea in friendlier shapes.
- Impacts are **puffs and sparkle bursts**, never blood, cracks in bodies or
  anything that reads as pain. A hit makes the target wobble and blink.
- Glows: additive soft circles behind the shape, not a blur on the shape.
- Timing (unchanged from the jam build): a snap-in over two frames, a bright
  impact frame, then shapes shrink out rather than fade.

## 7. UI and type

- Chunky rounded plates (radius ≈ 30 % of the plate height), a plum outline at
  the same weight as character contours, and a soft drop shadow one outline
  width down.
- Buttons are candy-like: a flat base, a lighter top band and a darker bottom
  lip. Pressed = the lip disappears.
- Type: a rounded, heavy display face for titles and buttons (Fredoka / Baloo
  style). **Shipped 2026-09-23: it is Fredoka** (SIL OFL 1.1), as
  `--am-display`, with the game's name carried as eleven inlined glyphs so
  it never changes face mid-load — ui-design-system.md §4.1's amendment has
  the whole of it. Body copy uses the system UI font. Any display font must have CJK,
  Thai, Devanagari, Cyrillic and Arabic fallbacks named explicitly. Never
  inline a CJK webfont (portal size budgets).
- Icons: the shared glyph set (`components/icons`), filled white on the plates,
  with the plum outline added as an SVG stroke when needed on light plates.

## 8. Readability checks (run on every new asset)

1. **Silhouette:** fill it plum on white at 64 px. You can still tell who or
   what it is.
2. **Greyscale:** desaturate it. Aurora, the rival and all four runes stay
   distinct by value and shape alone.
3. **Line weight:** *drawn* — the outer contour is the same weight as its
   siblings on the sheet (±10 %). *Painted* — the opposite test: if every shape
   is ringed by a stroke of the same width, it is wrong. The line must visibly
   swell and fade, and small things must carry none at all.
4. **Detail budget:** count interior lines. A character side view has at most
   ~15 interior strokes (eye, lashes, mouth, nostril, ear inner, 3–5 mane
   partings, horn bands, hoof lines).
5. **Kid test:** nothing looks hurt, scary, sharp-toothed or angry. Rivals are
   cheeky, not evil.
6. **Face test (painted):** cover everything but the head. The expression must
   be obvious — joy, worry, determination, delight — from the eyes, brows and
   mouth together. A blank or averaged face fails, however well painted.
7. **Hand test (painted):** find a perfect circle, a true arc or a dead-straight
   edge. If you find one on a tree, a hill, a pond or a path, it was assembled
   rather than drawn; send it back.

## 9. Production specs (for the art-generation pipeline)

- Reference sheets and returns follow the `art-generation-pipeline` skill:
  magenta `#FF00FF` key background, a strict lattice, generous padding, one
  pose per cell, no cast shadows touching the cell edge.
- Deliver at **2×** the largest on-screen size (characters: 512 px tall frames;
  rune glyphs: 256 px; UI plates: 9-slice at 2×).
- Ship as WebP through `pnpm compress-folder` (compress-images-pipeline).
  Originals are backed up outside `public/`.
- The procedural renderer stays as the fallback. A missing painting must
  never break the duel (the drop-in override layer in `src/game/art.ts`).

### 9.1 Master prompt style block

> **Since 2026-09-19 this block is generated, not pasted.** Every prompt is
> built from the active style profile in `src/game/artStyle.ts` (§0). The
> text below is the original hand-written block, kept for history. To change
> the look, change the profile, not this paragraph.

The original block, pasted at the top of every image-model prompt:

> Cute chibi picture-book illustration for a cozy, family-friendly magical
> unicorn game for all ages. Big head, huge sparkly eyes with two white
> catch-lights, tiny smile, rounded friendly shapes, short sturdy legs, a few
> large soft mane locks with pastel rainbow streaks. ONE clean, confident,
> soft outline in warm deep plum (#3A2340) with slight weight variation. No
> sketch lines, no crosshatching, no texture brushes. Flat cel colour: one base
> tone and one soft shadow tone per shape, one small highlight on round forms,
> key light from the top-left. Pastel palette with saturated magical glows.
> Nothing scary, sharp or violent. Plain flat magenta (#FF00FF) background,
> the subject fully inside the frame with generous padding.

### 9.2 Amendment 2026-09-19 — the pipeline as built (story-spec §8.20)

- **The prompts are generated, never hand-written.** `src/game/artSheet.ts`
  builds every block from the ACTIVE style profile (§0) — not from §9.1, which
  is history — extended for objects with no face: the same plum ink and the
  same shading standard as a character. Run `pnpm art:prompts`, then copy from
  `art-sheets/PROMPTS-*.md`. (The "about 1 % of the subject's height" outline
  measure belonged to v1 and was retired with it; see §2's amendment.)
- **Sectors are the exception to the magenta rule.** They are full-bleed
  scenes at 16:9, returned with NO magenta anywhere, and they keep the
  reference's layout exactly, because the game places moving things on them.
- **Colour-me regions** (a sector's landmark, a gift's ribbon, the chest's
  clasp gem) are painted pale neutral lilac-grey (`#e8e4ee`), shaded only in
  lighter and darker greys. The game multiplies the chosen colour through
  them.
- **Sizes shipped:**
  - sectors 1152 × 672, plus a 384 × 224 map thumbnail;
  - item frames at most 256 px tall (the pipeline's cap);
  - runes 256 × 256.

### 9.3 Amendment 2026-09-19 — the characters and the intro (story-spec §8.26–§8.27)

- **Portraits are strips.** Each speaker's expressions are painted side by
  side in ONE picture, so a face stays the same face across its moods. The
  game draws the round ring and the coloured backdrop itself; a painted
  portrait is only the head (or the creature), cut off by the circle as the
  reference shows. Unicorns keep the reference's three-quarter view: Aurora
  faces right, everyone else faces left.
- **The intro's pages are scenes WITH characters.** Like sectors they are
  full-bleed 16:9 with no magenta. Unlike sectors, the painter gets the
  character models first (Aurora's and Umbra's painted portrait strips), and
  the page's layout last. Paint the portraits first.
- **Islands are stages.** An island's flat mossy top is where the duelists
  stand, so it keeps the reference's width, flatness and height exactly. The
  slicer anchors an island by its top, not its middle.
- **Sizes shipped:** portrait panels at most 256 px tall (the badge shows
  them at 192), islands at most 256 px tall, intro pages 1152 × 672.

### 9.4 Amendment 2026-09-20 — what the approved pair settled

The first two paintings took eleven generations, and most of what they cost
was prompt wording rather than taste. What is now pinned, and must not be
unpinned without a new dated amendment:

- **The style lives in `artStyle.ts` and nowhere else.** A profile carries its
  own `lead` block — the two or three make-or-break rules, stated near the TOP
  of every prompt with an exact instruction, a named substitute for the
  painter's habit, and a consequence. Style rules buried in a mid-prompt bullet
  list get obeyed in letter and lost in spirit; that is how v1 produced three
  even-stroked returns in a row while following every line it was given.
- **Every prompt builder shares the same check list.** They had drifted — a
  sector checked its outline one way, an item only when it had no tinted part,
  a story page not at all — and the weakest list is the one that produces the
  bad batch. `STYLE_CHECKS` is now shared by all three.
- **Never paint a portrait as sitting on anything.** The game fills its own
  per-speaker badge colour behind the head and clips to a circle, so a painted
  disc hides it and puts every character on the same wrong ground. The circle
  is a CUT, not a shape to paint.
- **A scene must be told it is being repainted, not tidied.** Asked only to
  follow the reference, the painter returns the reference with smoother edges.
  The prompt says which part is being copied (layout) and which replaced
  (rendering), and gives a test: if it could be mistaken for the reference with
  cleaner edges, it is not finished.
- **Measure before re-rolling a colour.** A return that looked black-inked
  measured `#24142c` — genuinely plum — and the *drawn* reference measured
  `#140c1c`, darker still. One wasted generation.
- **Style id stamping.** The slicer stamps each painting from
  `sheet-index.json`, which the bench writes at export time, so a style change
  (which does not re-export, because the drawings did not move) used to
  mis-stamp every new painting as the old style. `pnpm art:prompts` now syncs
  that field; re-slice anything painted across the change to restamp it.

### 9.5 Amendment 2026-09-23 — a strip is refused unless it can be CUT

A multi-panel sheet is `frames` drawings in a row, and until this date nothing
checked that a return actually held that many. `portrait-umbra` came back with
**nine** faces against the five it was briefed for, and every stage of the
pipeline did exactly what it was told with them: the aspect guard passed (a
9-panel strip is the same 16:9 as a 5-panel one), the fit normalisation passed
(the content spans the sheet either way, so it scaled everything down 15 %),
and the cut divided the picture into five equal slices that each fell across
two faces. It shipped, and the game drew one-and-a-half heads into every Umbra
dialogue badge.

`tools/strip-guards.mjs` now answers two questions before the slicer measures a
single panel, and refuses the painting if either fails:

- **How many drawings are there?** Column runs, merging anything separated by
  less than a tenth of a panel — a real gap is at least ~28 % of a panel wide,
  so the threshold is far below anything that separates two drawings and far
  above anything inside one. A run too narrow to be a drawing but tall enough
  to reach down the sheet is a **ruled divider**, which is refused on its own:
  it is paint, it survives the key, and the fit normalisation drags it into the
  neighbouring crops.
- **Do the cuts fall in air?** Ink on each panel boundary, as a fraction of the
  strip's busiest column. Measured over all 35 multi-panel paintings in the
  catalogue: thirty-three scored exactly **0.000**, `portrait-umbra` **0.184**
  at every boundary and `portrait-nova` **0.363** at one. There is no middle
  ground to tune against, so the bar sits at 0.10.

**Neither is enough alone**, which is why there are two: a strip whose drawings
touch (a pale backdrop disc behind each one) counts as a single run however
many are really there, and a strip with the wrong number of SMALL drawings can
leave every cut in air by luck — nine little heads did, twice.

Between them they found **four** defective portraits in a catalogue of 160 that
had been looked at by eye and passed: `umbra` and `nova` (wrong count / wrong
places), `prism` and `shelly` (ruled dividers, plus the painted disc §9.4
already forbids). All four were repainted the same day and pass.

**The prompt lesson, which cost a generation to learn: do not describe a line
you do not want drawn.** The first hardening told the painter to "picture
`frames - 1` evenly spaced vertical lines dividing the image" — and it drew
them, in ink, down every sheet. An image model paints what the prompt
describes, including the scaffolding. The wording is now about the GAPS ("a
clear band of plain magenta between every neighbouring pair") plus an explicit
refusal of any drawn divider, frame, rule or guide.

`tests/meta/stripGuards.test.ts` pins all of it, including the two shapes that
defeat each test on its own. The guards are a module of their own rather than
part of the slicer because `slice-sheets.mjs` RUNS on import: a test that
imported it would re-slice the catalogue.

## 10. From the jam build to here

The jam build (Rune-icorn: Duels) drew everything procedurally in a
cel-shaded ink style: near-black 5–13 px outlines, three-band cel solids and
a dark storm palette. The painted version keeps its **structure**, which is
the readable poses, one shape vocabulary per element, the sky-as-scoreboard
and the chunky plated HUD. It changes the **temperament**: plum instead of
black ink, a line that varies and fades instead of a constant contour, soft
painted shading instead of banded cel, pastel instead of storm-grey, and
friendly rivals instead of menacing ones.

Until a painting exists, the procedural art is the reference for layout, scale
and animation — and it stays the fallback forever, because a missing painting
must never break the game. This page is the reference for how it should look,
and §0.1's two approved files are what "should look" means.

## 11. The brand pair — the mark and the mascot

**Added 2026-09-23.** Two pictures that are not IN the game and are not OF the
game: they are the game, on a tab strip, a home screen, a store tile and the
loading screen. Made by the same round trip as everything else (the manifest
writes the prompt, the bench draws the reference, the slicer cuts and stamps
it), but they are the only family with **no fallback** — a missing sector
painting means the sector paints itself, and a missing mark means the splash
simply has no mark.

| | |
| --- | --- |
| `public/images/brand/logo.webp` | **the MARK** — 512 × 512, opaque, full-bleed. Aurora's head three-quarter, big, over the world's rainbow, on the splash's own lilac. |
| `public/images/brand/mascot.webp` | **the MASCOT** — 861 × 512, magenta-keyed so the splash's gradient shows through. Aurora on the left facing right, Umbra on the right facing left, looking at each other. |

Reference painters: `src/game/brand.ts` (`paintLogoMark`, `MASCOT_ART`).
Prompts: `art-sheets/PROMPTS-BRAND.md`. Both are read as plain files by the
DOM — `FLogoProgress.vue` and `index.html`'s static splash — never through
`spriteFor`, because there is nothing to fall back to and because the splash
must look the same whatever `?art=` says.

### 11.1 No lettering, in either

**The mark carries no letters at all**, and the prompt says so three times,
because "logo" means type to everybody and it is the one drawable a painter
volunteers text into. The game's name is live i18n text drawn OVER the mark
(`t('gameName')`), so:

- a painted English title would be an English title in twenty of the
  twenty-one locales the game ships;
- it would sit underneath a second title, because the splash draws its own;
- and an image model asked for letters returns letters that are nearly words.

If a wordmark is ever wanted, it is a new sheet with a new id, not an edit to
this one — and it is a lockup per locale, not a lockup.

### 11.2 The mark is judged at 32 px, not at 512

It is a browser tab before it is anything else, so it is a HEAD, not a whole
unicorn: at 32 px a whole chibi unicorn is a cream smudge and only the horn
and the ear tips survive. §8.1's silhouette test is the acceptance test here,
not a check afterwards.

Nothing important goes in the outer eighth. iOS crops an icon to a squircle
and Android to a circle, and what gets eaten is whatever was nearest the edge
— which is why the horn tip starts a fourteenth of the way down rather than
hard against the top.

**Every icon is a downsample of this one file.** `pnpm brand:icons` cuts
`logo_512x512.png`, `logo_192x192.png` and `favicon.ico` from it, so
repainting the mark moves the tab strip, the home screen and the store tile
together instead of leaving three generations of unicorn on one device. The
favicon comes from the MARK rather than from any lockup, because type averages
into a smudge at 16 px. It is the one deliverable that is never compressed: an
`.ico` is a container, the compressor writes png/jpg/webp, and a "compressed"
favicon is a PNG with the wrong extension that Windows and Safari both refuse.

### 11.3 The mascot is the game's handshake, not its fight

Aurora open and delighted, Umbra warm and a little caught out, both standing
squarely, eyes meeting, with a clear gap between them — two overlapping chibi
unicorns read as one strange animal at splash size. Umbra is **not** the duel's
Umbra: her painted portrait strip is who she really is (a deep violet coat with
ordinary warm eyes), and the drawn rig's near-black coat and glowing cyan eye
are how the game draws her mid-duel. The model wins, and the prompt says so by
name — the first thing that would otherwise come back is a black unicorn with
a glowing eye, which is the wrong character for this picture.

They stand on **nothing**: no ground, no shadow, no scenery. A shadow cast onto
the magenta is a DARKER magenta the key cannot cut, and it ships as a pink
stain welded under them for ever. The rig's own contact shadow and Umbra's
dread aura are switched off for the reference by `PoseState.onKey`
(`chars.ts`) — the drawn rig is authored for a duel floor, and a keyed sheet
has no floor.

**Amendment 2026-09-24 — the build is written out, and the horns are
counted.** The first mascot was thrown away (owner: *"she has 2 horns and has
a bad body shape"*). Two causes, both in the brief rather than the painter:
the models are HEAD strips, so "the model wins on the build" had no body to
win with, and the shared reference clause told the painter to follow the
reference's PROPORTIONS — the duel rig's long jointed legs, which it did.
And the rig's small far ear came back as a dark spike out of the back of the
mane, which at splash size is a second horn. `mascotPrompt` now describes the
chibi body in words (short thick straight legs, each shorter than the head is
tall; a low round body; a soft-lock tail), limits the reference to LAYOUT
only, says "exactly one horn each" with the far ear's allowed form, and makes
the painter COUNT the horns and hold a head against a leg. The next roll came
back right first time (25.7 kB). Keep those checks in; they are what fixed it.

### 11.4 The one place the 256 px frame cap is lifted

The pipeline caps every sliced frame at 256 px tall, and that cap is about
SPRITE FRAMES: things the renderer blits at a drawable's own size, dozens at a
time, where the payload is the constraint. These two are read at a size the
renderer never chooses — the splash shows the mascot up to 420 CSS px wide on
a 3× phone — so the sheet declares `ItemSheet.exact` and the slicer writes it
at that height whatever else is asked. Nothing else in the manifest may use it,
and `maxEdge` still only ever lowers.

It costs almost nothing: **11.3 kB for the mark and 25.9 kB for the mascot**,
37 kB for the pair, against a catalogue in the megabytes.

### 11.5 The splash is two copies of one card, and they must stay identical

`index.html` paints a static splash before any JS runs, and `FLogoProgress.vue`
fades in over it as it fades out. Both draw the same card — mark, title,
mascot, progress bar, same sizes, same order, same gaps — and anything that
differs between them is a visible jump on every cold load on every portal. The
static copy's bar never fills; it is there so the card is the same HEIGHT in
both.

Sizes are capped against the viewport HEIGHT as well as its width, because the
tightest screen is not a narrow phone but a landscape one: at 412 px tall the
mascot is dropped entirely and the mark plus the title carry the screen. The
title's margin is its STROKE — `.ink-text` rings it in 0.28em of plum, which
overflows the line box and is invisible to the flex gap.
