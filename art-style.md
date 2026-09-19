# Auroras Magic — art style

The single consistency reference for every painted asset: characters, props,
backgrounds, VFX, UI and store art. If a new asset disagrees with this page, the
asset is wrong, or this page gets a dated amendment. Never let a one-off drift
quietly become the style.

**In one line:** *cute chibi picture-book magic.* Big-headed, big-eyed unicorns
drawn with one confident, soft outline and flat cel colour, in a pastel world
that glows. Hand-drawn, not sketchy.

Audience: a cozy unicorn fantasy for everyone, made especially appealing to
girls aged 3–12. It is not a "kids only" game, and it must never look babyish.
The youngest players are about 3, so everything must still be safe for them.
The owner decided this on 2026-09-18 (D1, `story-spec.md` §2 and §13) and
sharpened it on 2026-09-19 (§0 below). Everything must read as friendly, safe
and magical at a glance, including on a phone held upright.

---

## 0. The art-style decision

**Current style: `cozy-chibi-v1` — "Cozy chibi picture-book".** Decided by the
owner on 2026-09-19.

> Cute, cozy chibi anime-style picture-book illustration: big heads, huge
> sparkly eyes, rounded friendly shapes, soft pastel colours and warm magical
> glows.

Why: this is a unicorn fantasy, made especially appealing to girls aged 3–12
while charming for everyone. Chibi proportions and big expressive anime eyes
make every character lovable and readable at thumbnail size. The pastel,
cozy palette keeps even the gloomy parts (Umbra's dust) safe for a 3-year-old.
It is the look the procedural art already has (§1–§8), so the painted art
upgrades the game instead of replacing its identity.

**What it pins down** (the details are in §1–§9):

| | |
| --- | --- |
| Proportions | Chibi: the head as wide as the body, compact body, short sturdy legs (§3) |
| Faces | Huge glossy eyes with two catch-lights, tiny mouth, blush dots; big anime expressions (§3) |
| Line | One soft, confident plum outline (`#3A2340`), never black, about 1 % of the subject's height (§2) |
| Colour | Flat cel colour, one base tone and one violet-shifted shadow, one highlight; pastel things, saturated magic (§4) |
| Mood | Cozy, warm, magical; gloomy is allowed, scary never (§1, §5) |
| Never | Sketch lines, hatching, texture brushes, realistic horse anatomy, a western-cartoon or 3D-render look |

**Where it lives in the code.** `src/game/artStyle.ts` holds this decision as
a named, versioned profile (`ART_STYLES['cozy-chibi-v1']`, selected by
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
- the intro's 4 picture-book pages.

The pieces with a character in them (the portraits and the intro pages) also
get the profile's CHARACTER rules. The intro pages are painted from the
painted Aurora and Umbra portrait strips, so the cast looks the same
everywhere. What stays drawn for now is the animated duel rig, the
map's and the wardrobe's backdrops and the effects. They move every frame,
and painting them needs a part-by-part layer split first.

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

**Previous decisions:** none. `cozy-chibi-v1` is the first style the painted
art is made in.

## 1. Pillars

1. **Cute first.** Round shapes, soft corners, big eyes, small mouths. Nothing
   pointy that is not a horn, a star or a crystal.
2. **Chibi proportions.** Heads are huge, bodies are compact, legs are short and
   sturdy. See §3.
3. **Hand-drawn, but with restraint.** One clean, confident outline per shape,
   with a little natural weight variation. **No** sketch lines, doubled strokes,
   crosshatching, scribbled texture or hairy "concept art" edges. If a line does
   not describe the silhouette or a key feature (eye, mouth, mane lock,
   horn spiral), leave it out.
4. **Flat cel colour.** A base tone plus **one** soft shadow tone and a small
   highlight where needed. Gradients belong to skies and glows, never to
   characters.
5. **Readable at thumb size.** Every character and rune must be identifiable as
   a 64 px silhouette and in greyscale (§8).
6. **The sky tells the story.** The world lightens toward rainbows as Aurora
   wins and dims to a soft, rainy dusk as she struggles. It gets gloomy but
   never scary. This keeps the jam build's "the sky is the scoreboard" rule.

## 2. Line

| Property | Rule |
| --- | --- |
| Colour | Warm deep plum **`#3A2340`**, not pure black. Night / rival characters may use **`#241A3A`**. |
| Outer contour | ~**0.8 %** of the asset's height (≈ 4 px on a 512 px sprite). Constant within one asset. |
| Inner lines | 50–60 % of the contour weight. Only for eyes, mouth, ear inner, mane lock partings and the horn spiral. |
| Weight variation | Slightly heavier on the shadow side and at overlaps; lighter on the lit top edges. Subtle, 1.0×–1.3×. |
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

- Base + **one** shadow tone (≈ 15–20 % darker, shifted slightly toward violet),
  laid in as a hard-edged cel shape following the form.
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
  sparkles and petals. Painterly soft gradients are allowed **in skies and
  distant layers only**. Mid- and foreground objects follow the character
  rules (outline + cel).
- Depth through value and saturation: far layers are lighter and bluer, with
  no outline or a very light one.
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
  style). Body copy uses the system UI font. Any display font must have CJK,
  Thai, Devanagari, Cyrillic and Arabic fallbacks named explicitly. Never
  inline a CJK webfont (portal size budgets).
- Icons: the shared glyph set (`components/icons`), filled white on the plates,
  with the plum outline added as an SVG stroke when needed on light plates.

## 8. Readability checks (run on every new asset)

1. **Silhouette:** fill it plum on white at 64 px. You can still tell who or
   what it is.
2. **Greyscale:** desaturate it. Aurora, the rival and all four runes stay
   distinct by value and shape alone.
3. **Line weight:** the outer contour is the same weight as its siblings on the
   sheet (±10 %).
4. **Detail budget:** count interior lines. A character side view has at most
   ~15 interior strokes (eye, lashes, mouth, nostril, ear inner, 3–5 mane
   partings, horn bands, hoof lines).
5. **Kid test:** nothing looks hurt, scary, sharp-toothed or angry. Rivals are
   cheeky, not evil.

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
  builds every block from §9.1's rules, extended for objects with no face:
  the same plum ink, the same cel shadow, and a measured outline weight
  (about 1 % of the subject's height). Run `pnpm art:prompts`, then copy
  from `art-sheets/PROMPTS-*.md`.
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

## 10. From the jam build to here

The jam build (Rune-icorn: Duels) drew everything procedurally in a
cel-shaded ink style: near-black 5–13 px outlines, three-band cel solids and
a dark storm palette. The painted version keeps its **structure**, which is
the readable poses, one shape vocabulary per element, the sky-as-scoreboard
and the chunky plated HUD. It changes the **temperament**: plum instead of
black ink, two tones instead of three bands, pastel instead of storm-grey,
and friendly rivals instead of menacing ones. Until the paintings exist, the
procedural art is the reference for layout, scale and animation. This page is
the reference for how it should look.
