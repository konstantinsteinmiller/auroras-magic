# Auroras Magic — art-generation roadmap

What is left to paint, in the order it is worth painting, and what gates each
step. Companion to `art-style.md` (what the art must look like) and the
`art-generation-pipeline` skill (how the round trip works).

Started 2026-09-20. **217 of 235 catalogue targets painted**, as of
2026-09-22 (`pnpm art:status`): the 18 still drawn are the props of §4b's
second pass and its third sweep, queued on the desk. The style is approved
(`cozy-handdrawn-v2`) and the art layer is still **off** in every build.

**Steps 1–5 are done, and so are steps 4b and 4c** — the `prop` family (now
40 sheets) and the `wardrobe` family (3); see their amendments below. The
remaining prop sheets are queued on the desk. What is left is **step 6 (turn
the layer on)** and **step 7 (promotion art)**.

The desk resumes, or takes a re-roll, with one call:

```bash
curl -s -X POST -H "x-art-desk: 1" -H "content-type: application/json" \
  -d '{"action":"start","stems":["<stem>"]}' http://127.0.0.1:5179/api/auto
```

**Known re-rolls worth doing before step 6:**
- **`sector-2-5-pearls-lagoon`** and its neighbours in chapter 2. The return is
  faithful but evenly inked all through — the corals, the palms and the clam
  are ringed by a constant stroke, which is the v1 "sticker" look `STYLE_CHECKS`
  exists to stop. It is what the owner read as "drawn assets over painted
  backgrounds": the coral and the anemone he pointed at are IN the painting,
  not drawn over it. Nothing in the repo is wrong; the roll is.
- ~5 sectors may still have the style anchor's UNICORN standing in them (coral
  cove, balloon meadow, pegasus stables, silver peak among them). Sectors must
  be empty — the game walks its characters on at runtime.

---

## Where we are

Every family is complete. Measured sizes, `pnpm art:status`, 2026-09-21:

| Family | Done | kB | Notes |
| --- | --- | --- | --- |
| sector | 50/50 | 1480 | each generation also writes its map thumb |
| sectorThumb | 50/50 | 932 | free: cut from the sector's own painting |
| page | 23/23 | 501 | the cloth, the front page ×2, two per chapter |
| portrait | 20/20 | 421 | |
| prop | 28/46 | 213 | the live props — §4b and its three revisions |
| wardrobe | 0/3 | — | the Kiosk's room ×2 and its rug — §4c |
| island | 10/10 | 86 | |
| cosmetic | 9/9 | 81 | |
| rune | 12/12 | 56 | |
| story (intro) | 4/4 | 114 | |
| gift / tool / worldUi | 8/8 | 71 | |

**Whole catalogue: ~3.85 MB**, against the ~4.1 MB projected. First load stays
~350 kB (~500 kB for a first-timer who sees the intro), plus ~103 kB of props —
the splash waits for all nine, because a map page animates them over its five
thumbnails from its first frame. Nothing here threatens a portal budget — see
§Budget.

---

## Step 1 — Close the four seam gaps (code, zero generations) — DONE

Four things a player looks at constantly have **no painted-art seam at all**.
They are not in the manifest, so there is nothing to paint yet. Do them as ONE
batch: the machinery is identical and has been built twice already (`page`,
`sector`), and four separate rounds of manifest + bench + renderer wiring is
the expensive way to buy the same thing.

| What | Where it is drawn | Shape of the sheet |
| --- | --- | --- |
| The book's FRONT page ("the intro bg") | `drawFrontPage`, `map.ts` — draws its own sky, rainbow, hills, knoll and trail inline; never calls `pageDecorBake` | 2 sheets (land + port), like a chapter page |
| The book COVER / binding | `drawSpine` (`pageTurn.ts`) + the purple surround | Became 2 sheets, not the ones promised: the surround is the CLOTH (`page/cover-cloth`, one square, 2026-09-21), and the cover board with its block of leaves is `worldui-book-board`, one painting laid on as a 9-slice (2026-09-24, "paint-outstanding pass (map & UI)" below). The stitched spine stays drawn — ~20 px of crisp stitching a stretch would only blur |
| The BOOKMARK ribbon | `drawBookmark` (`pageTurn.ts`) | 1 sheet; paint it flat, keep the sway as a transform |
| The node BADGES | `map.ts` (~line 850) | 1 strip of 4: done / current / locked / boss. The breathing ring stays drawn |

The only real work is the front page: `drawFrontPage` reads module state
(`sx`, `sy`, `ms`, `portrait`), so it has to be split into a pure painter the
bench can call — the way `pageDecorBake` already is. The other three are
straightforward keyed sheets.

**Gate:** `pnpm art:prompts --check` clean, references render in
`/#/art-sheets`, and the four still draw correctly with the art layer off.

---

## Step 2 — Finish the cast (19 portraits) — 18 of 19 done

Portraits are the **character models every story page is painted from**, and
they are the most-seen art in the game: every line of dialogue shows one.

Order: **Umbra first** — she blocks intro page 2 — then the nine guardians
(Briar, Pearl, Zephyr, Terra, Echo, Prism, Ember, Glace, Nova), then the nine
filler creatures (Twig, Shelly, Puff, Glint, Blink, Rio, Dune, Frosty, Wisp).

**Gate:** each strip's panels are the same character at different moods, the
circle is a CUT and not a painted disc, and the face reads at coin size
(`art-style.md` §8.6).

---

## Step 3 — Finish the intro (3 pages)

Pages 2–4, painted from the portrait models. Page 2 needs Aurora *and* Umbra.
Each page names which of the model's moods it wears (`STORY_INFO.faces`), so
the only judgement left is whether the beat reads.

**Gate:** watch the intro end to end with `?art=on`. The live layer (rune
trace, sponge, sparkles, dust) must still land in the right places over the
paintings.

---

## Step 4 — The small keyed sets (37 sheets)

12 runes · 10 islands · 3 gifts · 2 tools · 1 tent · 9 keepsake badges.

Cheap single-panel sheets, and the runes are on screen in every duel. Runes
have the tightest constraint in the project: **the shape is the game** — a
child traces it — so a prettier rune of a different path is a wrong rune.

**Gate:** `pnpm art:measure` for registration, and trace each rune in a duel.

---

## Step 4b — The props drawn ON TOP of the paintings

Audited 2026-09-21, by extracting every function called inside a `props:`
block across all 50 sectors: **~100 distinct prop functions**. They are NOT
one job, and most of them must never become paintings.

| Class | Examples | Verdict |
| --- | --- | --- |
| **Light** | `twinkles` (20 uses), `glows`, `winks`, `glints`, `lanternGlow`, `shimmer`, `aurora`, `halo`, `prismBeams` | **Split** by the revision below: a light with a CORE is painted (`twinkles`, `winks`, `glints`); a bare glow has no outline and no silhouette, so there is nothing to paint. |
| **Particles / flow** | `smoke`, `snowfall`, `spores`, `confetti`, `bubbles`, `sandFlow`, `mist`, `ripples`, `waterfall` | **Mostly PAINTED** by the revision below: a particle's SHAPE is constant and only its transform moves. `sandFlow`, `ripples` and `waterfall` stay drawn, and it says why. |
| **Movers** | `butterfly` (13), `flutter`, `bees`, `fireflies`, `swallow`, `gulls`, `swing`, `waterwheel`, `carouselLive`, `sails` | **Now PAINTED** — see the amendment below. |
| **Hanging decoration** | `pennant` (18), `bunting` (8), `lanternString`, `miniBalloon`, `kite`, `windsock` | **Now PAINTED** — the 2026-09-21 revision below. |

**What actually clashed was the RENDERING, not the format.** Every kit shape
inks through one helper at a constant `LW = 5` sector units — about 9 device
px at normal display scale — so a swing, a lantern or a mushroom landed as a
flat plum band over soft brushwork. One shared constant, `INK_SCALE` in
`kit.ts`, now thins the whole vocabulary together (0.68×) while keeping the
relative hierarchy of the weights each shape passes. Zero sheets, zero bytes,
and it lands on all 50 sectors and every chapter kit at once.

This is the same trick that fixed the character rig: when drawn art clashes
with painted art, change how the drawing RENDERS before deciding to replace it
with a bitmap.

**Not yet done:** the sector references still carry the old heavy line, so a
sector repainted today is painted from the pre-change drawing. Re-export them
before step 5 and re-slice the five existing paintings with `--stale-ok` (the
layout is identical; only the line weight moved).

### Amendment 2026-09-21 — the movers ARE painted: the `prop` family (first 9)

Thinning the line was not enough. With the sectors painted, the owner's words:
*"the interactive elements like fishes and butterflies need to be painted too
… those drawn assets don't fit the art painted backgrounds, also the seagulls
on that page."* A flat ellipse butterfly over brushwork still reads as a
sticker however thin its outline is, and it is the only thing on the picture
that moves, so it is the thing the eye goes to.

So the **movers** row is overturned and the rest of the audit stands. A new
family, `prop` (`artIds.PROP_ART`, `artSheet.PROP_SHEETS`, `images/props/`),
paints the nine whose shape a TRANSFORM carries:

| sheet | frames | serves | tinted |
| --- | --- | --- | --- |
| `prop-butterfly` | 3 (wing openings) | `butterfly` ×13, `flutter` ×10, `echoButterflies` ×2 | the wings |
| `prop-gull` | 3 (wing beat) | `gull`/`gulls` — chapter 2 | — |
| `prop-dove` | 3 (wing beat) | `dove` ×5 — chapters 3, 5, 10 | — |
| `prop-swallow` | 3 (wing beat) | `swallow` ×7 — chapters 6, 7 | the whole bird |
| `prop-duck` | 1 | the brook's duck (was inline in `sectorsC1`) | — |
| `prop-fish` | 1 | `fishJump` ×3 — chapter 2 | the whole fish |
| `prop-crab` | 3 (asleep / awake / waving) | `crab` ×2 — chapter 2 | — |
| `prop-mill-sails` | 1 | `sails` — the cottage meadow AND the intro | — |
| `prop-waterwheel` | 1 | `waterwheel` — brook bridge | — |

The rule that decided each one, and that decides the next: **can one bitmap
serve every call site, moved only by a matrix?** A rotation, a bob, a scale, a
mirror and a leap all qualify; a few discrete STATES (a wing up and down, a
claw raised) become the strip's panels and `drawItem` cross-fades between
them, so the motion between the states is still continuous.

**Three traps this family paid for:**

- **Render the reference through a SCALE, not by passing the bench's size as
  the drawing's.** `ink` sets a width in the current transform, so
  `waterwheelShape(g, s)` at the bench's 120-px unit drew the game's 4 SU
  spokes as hairlines — and a painter paints the hairlines it is shown. Every
  spec now does `g.scale(s / UNIT); shape(UNIT)`.
- **A drawable with a HOLE in it needs the magenta rule bent, where the
  magenta rule is.** The wheel's middle is see-through and the brook is
  painted behind it; the magenta block's flat "the object contains no magenta"
  comes last in the prompt and would have had the final word. `ItemSheet.holes`
  rewrites that one bullet.
- **Describe what the reference DRAWS.** The gull and the swallow are a bare
  wing curve with no head, beak or tail. "A pair of wings joined by a rounded
  little body" would have commissioned a body the game has never drawn.

### Revision 2026-09-21 — the audit was too conservative: 19 more (28 in all)

The owner, on a Cloud Kingdom screenshot: *"there are still a lot of dynamic
procedural assets drawn on the images, this is a style break to the art, try to
paint them all in our art-style… ignore the generation cap."* He was pointing
at the drifting `miniBalloon`s and the `pennant`s — flat, hard-outlined vectors
sitting on a painted sky.

The table above and the "what that rules out" list below it were wrong, and
they were wrong for one reason: they asked **"is this rebuilt per frame?"**
when the pipeline's own question is **"does it have a constant SHAPE?"** A
particle system rebuilds its geometry every frame *and* draws the same puff at
every position. Both are true. The second is the one that decides.

**The rule, restated: paint the SHAPE; keep the procedural part that places,
scales, rotates, tints or fades it.** Under it, three whole rows flip:

- **Particles are shapes.** A puff, a flake, a bubble, a spore, a scrap of
  confetti — one painting blitted N times at the computed positions is exactly
  the same picture, in the art style.
- **A light with a CORE is a shape.** A four-point twinkle is one star at a
  radius the clock sets. A firefly is a glow with a bright heart in it.
- **Multi-colour per instance is not a wall.** Either the repeated UNIT is one
  colour (a bunting flag, a balloon, a pinwheel blade, half a kite mirrored)
  and is painted once and tinted, or the colourways the call sites actually
  use become the strip's PANELS (the far boat's three).

Nineteen sheets, by call-site count — the whole census, from extracting every
function called inside a `props:` block across all 50 sectors:

| sheet | frames | serves | sites |
| --- | --- | --- | --- |
| `prop-twinkle` | 1 | `twinkles` ×20 (sky) + bay, `winks` ×12, `shootingStar`'s head ×10, `glints` ×6, `sandGlints` ×5, `bursts` ×3, `sparkle`, `twinkle` ×2, `glintStar` | **~60** |
| `prop-pennant` | 3 | `pennant` — six chapters | 18 |
| `prop-mote` | 1 | `fireflies` ×8, `spores` ×5 | 13 |
| `prop-puff` | 1 | `smoke` ×5, `mist` ×2, `sandPuffs` ×2 | 9 |
| `prop-flag` | 1 | `bunting` (sky and bay) | 8 |
| `prop-lantern` | 1 | `lanterns` ×3 (sands), `lanternString` (festival) | 7 |
| `prop-bubble` | 1 | `bubbles` ×4, `colourBubbles` ×2 | 6 |
| `prop-balloon` | 1 | `balloonBunch` — five or six balloons each | 6 |
| `prop-snowflake` | 1 | `snowfall` | 5 |
| `prop-cave-lantern` | 1 | `swingLantern` ×2, `lanternString` (caves) | 4 |
| `prop-confetti` | 1 | `confetti` — sixteen scraps each | 4 |
| `prop-mini-balloon` | 1 | `miniBalloon` — the ones he pointed at | 4 |
| `prop-boat` | 3 | `farBoat`, one panel per colourway | 3 |
| `prop-kite` | 1 | `kite` — half a diamond, blitted twice | 2 |
| `prop-note` | 1 | `notes` | 2 |
| `prop-pinwheel` | 1 | `pinwheel` — ONE blade, turned four times | 1 |
| `prop-bee` | 1 | `bees` | 1 |
| `prop-windsock` | 1 | `windsock` | 1 |
| `prop-charm` | 1 | `charm` — tinted whole, so one sheet wears every gem | 1 |

Two seam shapes carry all of it, and both keep the vector path **byte for
byte** behind them:

- **A `*At` helper that returns whether it painted.** `twinkleAt`, `puffAt`,
  `moteAt`, `bubbleAt`, `flagAt`, `lanternAt` (all in `kit.ts`, because five or
  six kits each wink and puff in their own function and a sheet per kit would
  be the same picture six times). It blits and returns true, or adds its shape
  to the caller's CURRENT PATH and returns false — so `twinkles`, `winks`,
  `glints` and `sandGlints` keep their one batched fill for a dozen points
  whenever no painting has landed. A mixed frame cannot happen: the sheet is
  there for the whole frame or it is not.
- **`drawItem` first, the vector unchanged in the `if (!painted)`.**

**What is still drawn, and the specific reason each one has no shape:**

- **`lap`** — a wave that follows an arbitrary shoreline polyline. Its geometry
  IS the points it is handed.
- **The STRING of everything hanging.** `bunting`, `lanternString`, `lanterns`,
  `balloonBunch`, `kite` — a bezier (or a fan of them) through call-site
  points. The flag, the lantern, the balloon and the kite ON it are painted and
  threaded along the same curve.
- **`constellation`** — lines drawn between the stars a sector names.
- **`reflect` / `mirrorLake` / `echoBird`'s echo** — a transform of other
  content, not content. (`echoBird` itself now wears `prop-gull`: it is the
  same bare-wing curve, and its echo is that painting mirrored — zero
  generations.)
- **`beam`, `prismBeams`** — a cone whose angle and length open per frame, so
  the polygon is a different polygon every frame.
- **`aurora`** — ribbons whose control points travel along the ribbon; the
  curve is reshaped, not moved.
- **`vane`** — narrows with `cos a`. That is foreshortening of a 3-D arrow, not
  a rotation of a 2-D one.
- **`kelp`** — each blade BENDS as it sways.
- **`ripples`, `drip`'s ring** — an expanding ring whose stroke stays 3 px
  while its radius grows, so it is not a scale of itself.
- **`waterfall`, `fallFlow`, `sandFlow`, `hgStream`** — bands scrolling inside
  a clip of a path the call site builds.
- **`flame`** — tongues rebuilt per frame from a height and a lean.
- **`mirrorGlint`, `shimmer`** — a white bar swept under a clip, and a streak
  whose length changes per frame. Both are light with no edge (below).
- **Soft light: `glow`, `glows`, `lanternGlow`, `bulbGlow` (×2), `pearlGlow`,
  `halo`, `flowerGlows`, `flameGlow`'s halo, `wallGlow`.** This is the one
  place the old audit's verdict survives, for a better reason than "a bitmap
  cannot pulse" — it can, with `globalAlpha`. **A glow has no outline and no
  silhouette.** It is the light ON the painting, not a form on it, so there is
  nothing to paint; a painted copy is the same wash at lower resolution, and
  its colour is a per-call-site parameter that `artTint` would have to re-bake
  for every hue. The line between this row and `prop-mote` is exactly that: a
  mote has a bright CORE inside its glow, and a core is a shape.
- **The rides — `carouselLive`, `ferrisLive`, `waterwheel`'s neighbours.** The
  wheel turns while every cabin counter-rotates about its own pin, so the RIDE
  has no constant shape. Its cabin does, and that is a later sheet if the ride
  still jars.
- **`skyPuff` / `driftCloud`** — unoutlined soft lobes in the FAR register
  (art-style §5). They were never the style break: there is no ink on them.

**Three more traps, paid for here:**

- **A reference that contradicts its own prompt loses.** The bubble's prompt
  says "you can see straight through it" and the first reference drew a solid
  disc. The reference now draws the ring, with the inner circle on its own
  subpath — or the annulus closes with a spoke across it at 3 o'clock, and a
  painter paints the spoke.
- **A half-transparent reference over magenta is a PINK reference.** The live
  mote draws its halo at 45 % alpha; the spec draws it opaque in the accent's
  light tone, and the fade stays the game's `globalAlpha`. This is the shadow
  trap again, in a new costume.
- **"The reference is a diagram, not a style" belongs IN the prompt** for
  anything soft. A canvas fill cannot fade, so the mote, the puff and the flake
  are hard circles on their sheets; each one's WHAT IT IS now says so out loud
  and asks for the soft thing the circle stands for.

**Before step 6:** the splash waits for the WHOLE prop family
(`artPreload.firstArtWants`). That was nine sheets at ~100 kB and is now
twenty-eight. Re-measure once they are painted; if the family lands far above
~200 kB, scope that want to the player's chapter. A prop's pop-in is the
mildest in the game — a ten-pixel sprite on a thumbnail.

---

### Second pass 2026-09-22 — twelve more (40 in all), and the census that found them

The first revision's census extracted every call inside every `props:` block
and diffed it against the painted list. It missed nine functions that return
void and draw something, because the eye slid past them while sorting the
canvas primitives (`beginPath`, `moveTo`) and the pure geometry helpers that
return coordinates and draw nothing (`palmTop`, `heartStars`, `skate`,
`lilyHeart`, `stoneGlow`, `railAt`, `cableAt`, `ceilingY`, `runAt`, `glassOf`,
`sway`) out of the same list. **Diff the census against BOTH lists — painted
and kept — and look at what is in neither.** That is the audit, and it is one
line of script rather than a reading.

| sheet | frames | serves | sites |
| --- | --- | --- | --- |
| `prop-palm-frond` | 1 | `palmCrown` — six blades on each of three palms | 18 |
| `prop-heart` | 1 | `joy`'s rising hearts, `festivalBanner`'s charm | 2 |
| `prop-coconuts` | 1 | `palmCrown` | 3 |
| `prop-flyer` | 3 | `flyer`, one panel per pegasus look | 2 |
| `prop-cart-wheel` | 1 | `mineCart` — two wheels per cart | 2 |
| `prop-buoy` / `-canoe` / `-mine-cart` / `-rainbow-arc` / `-swing-seat` / `-cabin` / `-star` | 1 | one call site each | 1 |

Two were already covered and needed nothing: **`twinkleAt`**'s two direct calls
in `sectorsC8` route through `prop-twinkle` (wired in the first revision), and
**`festivalBanner`'s flags are the bunting flag** — the same little triangle,
so the banner threads `prop-flag` along its own cord for no generation at all.
**`star5` is NOT `prop-twinkle`**: that sheet's prompt rules a five-pointed
star out in as many words, so the vane tower's finial got `prop-star` of its
own. *(Corrected 2026-09-26: the finial is in `paint()`, so already in its
sector's painting; `prop-star`'s live call site is the 3-5 castle lamps.)*

**What this pass left vector, and why:**

- **The ~15 bare `ink(...)` strokes inside `props:` bodies** — a balloon's
  mooring line, a kite's string, a charm's thread, a swing's two ropes. A
  hairline has no body: there is no shape to paint, and the line is already
  thinner than any brush mark (`INK_SCALE`).
- **`miniRainbow` in general.** Its angular span comes from the call site, so
  the falls' 0.9π bow and the rescue cushions' 2.4-radian one are two
  different shapes. `rainbowArc` paints the one a sector flies as a live prop
  and reports false for every other, which keeps its drawing.
- **A mine cart's WHEELS are not part of its cart.** They turn about their own
  pins inside it, so no transform of the whole cart carries them — the
  pinwheel's rule again, and the reason there are two sheets here.

**Two traps, and one of them was nearly a wrong answer:**

- **A ROTATE AND STRETCH IS NOT AN AFFINE, and a palm crown proves it.** Each
  frond is a lens between two quadratics, and its control sits 0.62 of the way
  along the UNSQUASHED radial while its tip is squashed and drooped — so a
  frond reaching upwards doubles back and its chord is a third of its arc.
  Placed on its chord with a rotate and a non-uniform scale, the painted crown
  came out FLAT: the upward fronds collapsed into the horizontal ones. The fix
  is the full affine (`g.transform`), built to carry the canonical blade's
  root, tip and bow onto this frond's own three points. Verified by rendering
  the sector both ways and looking at it — which is the only reason it was
  caught, because nothing throws and the numbers all look fine.
- **A four-colour look spends the strip's panels on COLOUR, not on motion.**
  `prop-flyer` is three pegasus looks at one wing angle, so the flyer glides
  where it used to flap. That is the trade, stated rather than hidden: at a
  twelfth of the scene the beat is a couple of pixels of travel, and three
  sheets of three panels would buy it back if it ever matters.

**The registration harness this pass added, and what it measured.** For every
one of the 50 sectors, `props()` is rendered on a transparent canvas with the
art layer off and again with it on, and the two bounding boxes are compared.
A painting that lands where its drawing did moves the box by a pixel or two;
one placed wrongly moves it a lot — the flat palm crown showed up as tens of
pixels. **Across all 50 sectors the worst shift is 12 px**, on the three that
fly a dove, a pennant or a cabin, and that is the 6 % of air `measureBox` puts
round every box. Worth rebuilding for any future prop batch: it is objective
where a screenshot is a judgement, and it covers every sector at once.

---

### Third sweep 2026-09-22 — six taken back off the KEPT list (46 in all)

Not a fourth census: the first two passes found everything that is DRAWN. This
one re-read §4b's own **kept** list, entry by entry, against one test —
**freeze a frame: is there a shape with an edge?** — instead of against how the
thing is coded. Three of the kept reasons turned out to describe a matrix:

- **A BEND is a shear.** `kelp` was kept on "each blade BENDS as it sways",
  which is half the palm crown's lesson read backwards. One blade, rooted at
  the origin and reaching one unit up, under the affine that carries its root,
  its height and its leaning tip — the same `g.transform` the crown uses.
  Verified the same way: the registration probe, below.
- **A FORESHORTENING is a non-uniform scale.** `vane` was kept on "it narrows
  with `cos a` — foreshortening of a 3-D arrow, not a rotation of a 2-D one".
  Both halves true, conclusion false: the drawing multiplies every X by `cos a`
  and leaves every Y alone, which is `g.scale(c, 1)`, and a negative `c` is the
  flip it already did.
- **A band SCROLLING under a clip is a TEXTURE.** `waterfall`, `fallFlow` and
  `sandFlow` were kept as "bands scrolling inside a clip of a path the call
  site builds". The clip IS the call site's and stays drawn; the band inside it
  is the same rounded streak at every position, in three chapters' worth of
  water, rainbow and sand. One tinted tile serves all three, and the fall it
  falls down is a still of its own.

| sheet | frames | serves | sites |
| --- | --- | --- | --- |
| `prop-kelp` | 1 | `kelp` — one blade, affine-placed | 3 calls, 7 blades |
| `prop-flow-streak` | 1 | `waterfall`'s bands, `fallFlow` ×2, `sandFlow` ×2 | 5 |
| `prop-flame` | 3 (lean left / up / right) | `flame` — the temple braziers | 2 |
| `prop-gondola` | 1 | `ferrisLive`'s eight cabins | 8 |
| `prop-waterfall` | 1 | `waterfall` — the briars' rock face | 1 |
| `prop-vane` | 1 | `vane` — the wind-vane tower's arrow | 1 |

**The verdict on EVERY entry of the kept list**, so the next pass starts from a
list that has been argued rather than inherited:

| kept entry | verdict |
| --- | --- |
| `kelp` | **PAINTED** — a blade is a constant shape; the bend is a shear |
| `waterfall` | **PAINTED** — the column and its foam are a still; only the flow moves |
| `fallFlow`, `sandFlow` | **PAINTED** (`prop-flow-streak`) — the scrolling band is a tile |
| `flame` | **PAINTED** — a flame has a silhouette; the lean is three panels |
| `vane` | **PAINTED** — `cos a` is a scale, and the flip was always a mirror |
| `carouselLive`, `ferrisLive` | the RIDE stays drawn — the wheel turns while every cabin counter-rotates about its own pin. Its **gondola is now PAINTED**, as §4b said it would be if the ride still jarred. The carousel's UNICORN is the one thing left with a silhouette and no sheet: three independent colours per horse (coat, mane, saddle) over six horses, and a near/far detail split — twelve looks, where `prop-flyer` spent a whole strip on three. Paint it next if the owner still sees it |
| `hgStream` | kept — a **6-unit line** with 2.5-unit grains, which is thinner than the ink the kit draws with (`INK_SCALE`). The second pass's hairline rule, not a new one |
| `ripples`, `drip`'s ring | kept — a **hairline ring**: a 3-unit stroke whose radius grows while the stroke does not, so no scale of one ring is another. There is no body to paint, only a line |
| `drip`'s drop, `flameGlow`'s candle tips | kept — both DO have a silhouette, and both are under the family's own size floor: the twinkle, its smallest sheet, is a fiftieth of the scene's width, and these are a hundredth. Candidates, not oversights |
| `lap` | kept — its geometry IS the shoreline polyline it is handed |
| `constellation` | kept — lines drawn between the stars a sector names |
| the STRING of everything hanging | kept — `bunting`, `lanternString`, `lanterns`, `balloonBunch`, `kite`: a bezier through call-site points. Everything threaded ON it is already painted |
| `reflect`, `mirrorLake`, `echoBird`'s echo | kept — a transform of other content, not content |
| `beam`, `prismBeams` | kept — a cone whose angle and length open per frame: a different polygon every frame, and light with no edge besides |
| `aurora` | kept — control points travel ALONG the ribbon, so the curve is reshaped, not moved |
| `mirrorGlint`, `shimmer` | kept — a white bar swept under a clip and a streak whose length changes per frame. No edge, no silhouette |
| soft light: `glow`, `glows`, `lanternGlow`, `bulbGlow`, `pearlGlow`, `halo`, `flowerGlows`, `flameGlow`'s halo, `wallGlow` | kept — **a glow has no outline and no silhouette.** It is the light ON the painting, its colour is a per-call-site parameter, and a painted copy is the same wash at lower resolution. The new `prop-flame` draws over its halo, not instead of it |
| `skyPuff`, `driftCloud` | kept — unoutlined soft lobes in the FAR register (art-style §5). There is no ink on them to clash |
| the ~15 bare `ink(...)` strokes | kept — a mooring line, a kite string, a charm's thread, a swing's ropes. A hairline has no body |
| `miniRainbow` in general | kept — its angular span comes from the call site, so two call sites are two shapes. `rainbowArc` paints the one a sector flies |

**The registration probe, rebuilt and worth keeping.** For each new seam, the
bbox of the vector it replaces against the bbox the painting will occupy — the
spec's own reference drawn under the seam's transform, on a transparent canvas
at α > 140 so a glow counts as light rather than size. It needs no painting to
exist, which is its whole value: it runs the moment the seam is written. Worst
edge shift across kelp at three sways, the flame at three phases, the fall and
the vane at four points of its swing: **2 px**, on the kelp blade bent hardest
over. The palm crown's collapse would have shown here as tens.

**One trap, and it is the shadow trap wearing the fourth costume.** A streak of
falling water is drawn at 60–80 % alpha in the game. Its reference draws it
OPAQUE in the neutral and lets `globalAlpha` do the fade, because a
half-transparent reference over magenta is a pink reference — and the same
sheet says out loud that it is *a diagram of a soft thing*, because a canvas
fill cannot feather and a painter shown a hard-edged bar paints a hard-edged
bar.

---

## Step 4c — The Wardrobe Kiosk's room (3 sheets), 2026-09-21

With the sectors, the pages, the intro and the props painted, the dressing-up
tent was **the last full-screen backdrop in the game still drawn**: striped
canvas walls, a vignette, a flat peach floor, a round rug and a string of
fairy lights, all laid down by `drawWardrobe` every frame. Against the painted
rest of the game it was the remaining style break.

`paintWardrobeRoom` is now the whole room and nothing else, the way
`paintFrontPage` is the whole front page — so the bench renders the reference
from the very function the game draws with.

| sheet | shape | serves |
| --- | --- | --- |
| `wardrobe-room-land` | opaque, 1152 × 648 | the tent held sideways |
| `wardrobe-room-port` | opaque, 648 × 1152 | the tent held upright |
| `wardrobe-rug` | magenta, 1 panel | the rug she stands on |

**What had to leave the painting, and why.** Four things in that diorama move,
and each one leaves by a different rule:

- **The rug.** `stand()` places it and scales it from the DOM shelf's own
  measurement — so its place in the room is decided by a layout, not by the
  clock (`LAYERS.md`'s seam). One bitmap, carried by a transform, exactly like
  a live prop. Baking it into the floor would have pinned Aurora to one spot
  on every screen; moving Aurora to the baked rug would have put her muzzle
  under the shelf on a short landscape phone, which is the clamp `stand()`
  already carries.
- **The bulbs' twinkle.** Alpha-pulsed, so a bitmap cannot hold it (§6). The
  painting carries the cord and the solid beads; the halo is drawn over them.
- **The corner shadow.** A wash over the whole room. Baked in it is a vignette
  welded into the biggest bitmap the wardrobe ships — and the full-bleed brief
  forbids one for exactly that reason, so a reference that showed it would
  have contradicted its own prompt.
- **Aurora and her keepsakes**, as before.

**THE FLOOR LINE IS THE WHOLE PROBLEM, and the fix is two bands.** The floor
is wherever Aurora stands, and that follows the shelf: in portrait it climbs
the moment the mane swatches open, so it moves between about 0.51 and 0.66 of
the height on real devices. One picture stretched whole would park its horizon
above her hooves on every screen but one. So each painting carries its floor
at a fixed fraction (`WARDROBE_FLOOR`, 0.80 land / 0.62 port) and
`drawWardrobe` blits it as a WALL band stretched to meet the real floor and a
FLOOR band under it. Stretching a vertical stripe vertically, and a plain
floor, is invisible; a horizon in the wrong place is not. Verified with a
band-coloured stand-in painting in both orientations: the split lands on her
hooves exactly.

**Two traps, and what they cost here:**

- **A reference drawn at on-screen size is a row of dots.** The bulbs are 5
  CSS px whatever the screen, and at the reference's own size that is a string
  of pinheads on a rope — which is not what the room looks like, because what
  a player sees is a bulb inside a halo two and a half times its width, and
  the halo is the one part a painting cannot hold. `lampR` therefore draws the
  reference's bulbs at TWICE the size, so the painted bulb is sized to what it
  stands for and the live halo then sits on it as a tight ring. (The first
  export also put the cord ON TOP of the bulbs at a heavier weight, and the
  string came back reading as a rope with specks on it. The cord goes down
  first.)
- **The reference is a diagram, not a style — again.** Every stripe is a
  hard-edged block and the floor is one block under them, because that is what
  a canvas fill is. The sector prompt's block is carried over in the room's own
  nouns, with the two edges it would otherwise rule named out loud: between two
  stripes (which turns the tent into a barcode) and along the top of the floor.

The shared `NOT_A_TIDY_UP` and `STYLE_SCENE` blocks are written in meadow
nouns — ponds, canopies, far hills, drifting petals — so the room has its own
not-a-tidy-up, and fences the scene block's clouds and sparkles in its own
WHAT IT IS NOT. Nothing shared was weakened to fit it: `pnpm art:prompts`
reports every other document unchanged.

Preload: NOT in the splash's list. The kiosk is a tap in from the map and
nobody reaches it in a session's first seconds, so `primeWardrobeArt()` starts
the fetch under the dip instead, the way `openSector` does for a sector's
full-size painting.

---

## Step 4d — The creatures a restored sector gets back (17 sheets), 2026-09-23

Owner, after the sectors went in: *"check if the game is completely painted."*
It was not. Every chapter's TAP CREATURE and its RESCUE collectible were still
flat vector — the moss sprite in its log, the sea foal behind the rowboat, the
snow-hare in its bank, the star calf, the sand fox — and one of them is on
screen in **all fifty cleaning views**, standing on a painted meadow. That is
the loudest style break left in the game, and no amount of background work
fixes it.

A `creature` art kind now sits beside `prop`: `images/creatures`,
`CREATURE_ART` in `artIds.ts`, a `creature()` builder in `artSheet.ts`,
`CREATURE_SPECS` in `artDraw.ts`, `PROMPTS-CREATURES.md`.

| ch | body | file | tinted region | panels |
| --- | --- | --- | --- | --- |
| 1 | moss sprite (tap AND rescue) | `sectors.ts` | the ball | 2 · asleep, awake |
| 2 | sea foal | `kitBay` | — | 2 · mouth shut, blowing |
| 2 | singing shell | `kitBay` | — | 2 · shut and dull, open and bright |
| 3 | baby pegasus (tap AND rescue) | `kitSky` | the coat | 4 · curled, standing, wings low, wings high |
| 4 | glowworm | `kitCaves` | — | 2 · asleep, lit |
| 4 | shard of clear light | `kitCaves` | — | 2 · cloudy, clear |
| 5 | mirror sprite | `kitMirror` | the body | 2 · arm down, waving |
| 5 | mended shard | `kitMirror` | — | 2 · cracked, whole |
| 6 | rainbow foal | `kitRidge` | — | 3 · standing, trot A, trot B |
| 6 | prism petal | `kitRidge` | — | 2 · folded, open |
| 7 | sand fox | `kitSands` | — | 1 · the arm and its trinket stay drawn |
| 7 | hourglass of Ember | `kitSands` | — | 2 · sand on its side, sand running |
| 8 | snow hare | `kitTundra` | the scarf | 3 · ears back, ears up, awake |
| 8 | frozen star shard | `kitTundra` | — | 2 · dim, lit |
| 9 | star calf | `kitSummit` | the collar | 2 · eyes shut, eyes open |
| 9 | fallen star | `kitSummit` | — | 2 · dim, gold |
| 10 | sprig | `kitFestival` | the party hat | 2 · asleep, awake |

**ONE SHEET PER BODY, not per sector.** A chapter dresses its creature five
ways and every one of those is a single colour on a single region, which is
exactly what `artTint` carries. What the five share — the coat, the face, the
eyes — is painted once, so it is the same creature everywhere, which is what
the story wants too.

**A PANEL IS A POSE THE PEEK ANIMATES BETWEEN**, not a frame of animation.
The rise from behind the prop, the lean, the hop, the shiver and the clip stay
the drawing's: a translate, a rotate and a rectangle carry a painting exactly
as they carried the vectors. What a creature hides BEHIND is not in this
family at all — that is the sector's own painting, and `tapCover.ts` cuts the
cover out of it.

**Wiring one body** — the same four steps every time, `snowHare` is the worked
example: split the draw into a `<body>Shape` in local units at the origin;
give the front a `drawItem(g, <X>_ART, UNIT * s, frame, look.<tinted>)` that
returns early when it painted; make `UNIT` the body's own height in SU so the
SIZE clause means something; and let the spec's `draw` scale the CONTEXT by
`s / UNIT`, so the ink scales with the shape.

**THE STICKER LOOK IS FIXED IN THE REFERENCE, NOT ONLY IN THE WORDS.**
`kit.ts` contours every shape it draws, so a creature reference arrives evenly
inked and the painter traces it — three rolls came back as flat-filled stickers
while obeying every bullet. `kit.setRefInk()` thins `ink()` (and
`kitSky.inkFill`) to **0.4 for a `creature` sheet only**, set and put back
around the panels in `artDraw.renderItemSheet`; `measureFit` renders through
the same function, so the fit reported is the fit the painter sees. Not zero:
these are shown about the size of a thumb and the silhouette still has to read.
The prompt says the same thing in words, so the picture and the brief agree.

**TWO HOLES IN `tapCover` WERE FOUND WHILE DOING THIS**, both the same bug the
cover mechanism exists to stop — a crisp vector prop drawn over its own
painted self:

- chapter 1's `logSprite` never called `tapCover` at all. Every other
  chapter's tap creature routes its hiding place through it; the woods' hollow
  log was missed. It now takes TWO covers, because the sprite rises BETWEEN
  them — the hollow behind it, the bark in front. *(Corrected 2026-09-26: true
  only for 1-1 and 1-4, whose sectors paint a log; 1-2, 1-3 and 1-5 have none
  painted, and draw `prop-hollow-log` live instead — see the B1 note below.)*
- a RESCUE was outside the cover layer. `map.ts`, `wipe.ts` (both call sites)
  and the playground wrapped only `sec.tap?.draw` in `withCoverLayer`, and
  chapter 3's rescue redraws `nestFront` — a nest its sector's `paint()`
  already drew. All four now wrap the rescue too, and `sectorsC3` routes that
  nest through `tapCover`.

**All 17 are wired and painted** (`art:status`: 254/254, 0 still drawn; the
family is 198 kB). No preload
entry for any of them — a tap creature is only ever on a restored sector, so
it streams in with that sector's painting.

Four prompt fixes were bought here, each with a generation, and they are in
the manifest so the remaining sixteen start from them: `character: true` is
written for the DUELISTS and tells a hare to grow a horn; a single FIGURE
needs its own `NOT_A_TIDY_UP` (`CREATURE_NOT_A_STICKER`) or it comes back an
even-inked flat-filled sticker; a mirrored return is unusable, so the prompt
names the consequence and gives a geometric check ("the nose is nearer the
RIGHT edge than the tail is"); and the contact shadow keeps coming back until
the CHECK LIST — not another rule — tells the painter to look at the magenta
under the feet.

## Step 4e — The duelists themselves (5 sheets), 2026-09-23

Owner, after the creatures: *"now do the rig."* `chars.ts` was the last thing
in the game still drawn, and it is what a player looks at for the whole of
every duel.

A `rig` art kind now sits beside `creature`: `images/rig`, `RIG_ART` in
`artIds.ts`, a `rigPart()` builder + `RIG_SHEETS`, `RIG_SPECS` in
`artDraw.ts`, `PROMPTS-RIG.md`. **Five sheets — barrel, neck, head, ear,
horn — painted ONCE in a neutral tone and tinted per character**, because
twenty characters wear this rig in twenty palettes and a painting per
character would be twenty sets.

**The ink stays the drawing's, and so does the rim.** The rig inks a whole
group as ONE continuous silhouette and then fills the parts inside it — that
is exactly why it has no seams — so every rig sheet is painted with NO LINE AT
ALL and `partArt()` clips each blit to the path the rig has just inked. The
bounce rim is laid under the painting and the blit nudged toward the light by
`blob`'s own step, so the crescent survives: half of what makes Umbra read at
a glance is a violet-and-neon bounce in a DIFFERENT hue from her coat, and one
tinted region cannot carry two hues.

**What stays drawn, and why each one does:**

| | why |
| --- | --- |
| the face | a dozen shapes driven by `face`, `win`, `lose` and a blink — a different picture every frame |
| the mane, tail, forelock | `hair()` rebuilds each lock from a spine carrying a travelling wave (§4b's rule) |
| the legs | four tapered bones rebuilt per frame from the pose's angles. A painted capsule along each reads as a JOINTED DOLL where the drawn run reads as one limb — seen side by side on the harness, so the sheet was dropped |
| the hooves | the sole answers to the FLOOR, not the bone, and it is six units across |
| the hit flash | it strobes the rig white and red; a multiply tint cannot make a painting white, so `partArt` stands down while it runs |

**TWO THINGS THIS COST, both worth keeping:**

- **`liftTint` read a THREE-DIGIT hex as six.** `parseInt('fec', 16)` is
  0x000FEC, so Aurora's cream coat came out deep blue the first time the rig
  asked to be tinted. Every `map/kit*.ts` palette is written long and every
  duel palette short, which is why it had never shown. Fixed with a test.
- **MULTIPLY CANNOT MAKE A CHARACTER LIGHTER THAN ITS PAINTING, so the rig
  does not multiply.** `liftTint` divides by the neutral (232) and clamps at
  255, so `#fec` lifts to `(255,255,219)` — red and green already pinned, and
  the tint can only take blue away. Aurora's head and barrel came back
  grey-khaki however well they were painted. `partArt` lays the FLAT COAT down
  and composites the sheet over it with `globalCompositeOperation =
  'luminosity'`: the character keeps its own hue exactly and only the FORM
  comes from the painting. `COAT_UNDER = 0.45` decides how deep the shading
  goes — measured on the harness at 0.45 / 0.6 / 0.85, because a sheet's mean
  lightness is ~192 where a flat coat is ~245 and the more of it survives the
  more a pale character's barrel drifts tan against her own cream legs. **The
  ceiling is set by the lightest coat in the cast.** The brief also asks for
  the top third of the value range, warm-neutral; measure a return's OPAQUE
  mean before judging it, since `stats()` counts the transparent surround.

Look at any change on the RIG HARNESS before believing it: eight poses —
stand, cast, hurt, low hp, win, lose .5, lose 1, form — across Aurora, Umbra
and a foe palette, art on and off. With no painting present the two renders
are byte-identical, which is how the refactor was proved to change nothing.

## Step 4f — The interior-outline pass, 2026-09-23

Owner: *"paint all currently drawn assets without the painted assets having
outlines inside the asset."* The style block already forbade an even outline
AROUND everything; what came back instead was a picture whose outsides were
softly drawn and whose INSIDES were a diagram — every window, plank, panel,
stone course, tent seam, lantern pane and medallion traced at one weight.

The rule now lives in `STYLE_CORE` and its check in `STYLE_CHECKS`
(`artSheet.ts`), so every prompt in the game carries it. It is a
prompt-BUILDER rule rather than a `artStyle.ts` one on purpose: a profile's id
is stamped on every painting made under it, so editing one would mark all 259
targets REPAINT, and the owner asked for offenders only.

**MEASURE IT, DO NOT EYEBALL IT.** `interior-ink.mjs` (session scratchpad)
blurs the luminance and counts pixels where `blur − L` clears a threshold: a
LINE is a dark ridge, a shadow MASS is not, because a blur follows a mass and
not a line. Reported as a percentage of the interior — inside the alpha,
eroded so the silhouette's own line is never counted, and a full-bleed scene
is all interior. The fifty sectors spread from 0.62 % to 5.58 %, and the top
and bottom of that ranking match what the eye says without being told:
Terra's Geode Hall has every stone of its arch outlined; Moon Bridge has
almost no interior line at all.

**The bar is 3.4 %**, which is where the knee is. That was 25 sectors, all
re-rolled. FOUR sheets over the bar were deliberately left alone: the intro's
story panels, because `story/intro-1` is one of the two owner-approved
canonical style references (art-style.md §0.1) and a re-roll is a fresh dice
throw.

**THE PROPS, ONE AT A TIME, DID PAY — 7 of 10 kept.** Same rule, same
measurement, but each one rolled, measured against its own before figure,
looked at, and kept or put back before the next:

| prop | ink | verdict |
| --- | --- | --- |
| cave lantern | 10.16 → 7.12 | bars painted instead of outlined — kept |
| cable car | 8.16 → 0.55 | panes painted; reads the same at play size — kept |
| gondola | 6.51 → 1.28 | window painted; checked on the wheel — kept |
| canoe | 5.76 → 1.30 | gunwale painted; checked on the lake — kept |
| buoy | 5.43 → 3.95 | stripes painted as bands — kept |
| mine cart | 5.11 → 3.09 | plank seams painted, rivets and gems intact — kept |
| water wheel | 2.23 → 1.90 | spokes painted as bars — kept |
| far sailboat | 6.70 → 6.80 | came back the same picture — put back |
| paper lantern | 0.76 → 1.25 | inkier, and grew a hanging loop the game draws — put back |
| windsock | 1.07 → 1.37 | inkier, and the cone changed shape — put back |

**WHY A PROP WINS WHERE A SECTOR LOSES.** A prop is ONE object with a short
brief and nothing to drop; a sector is a whole scene with fifty things in it,
and "paint it instead of outlining it" gives the painter fifty chances to lose
one. Re-roll props freely, one at a time. Re-roll a sector only when you are
going to look at it.

Two things to watch when doing this by hand: a prop that only CHANGES (the
sailboat) is not an improvement and should go back, because the next roll is
another dice throw; and always check a keyed sprite AT PLAY SIZE before
believing an ink win — the cable car lost nearly all its outline and turned
out to read exactly as before at 56 px, which is the only size that matters.

The metric does NOT compare across sizes — a small keyed sprite has a high
perimeter-to-interior ratio and the erosion cannot pay for it — so the props
were judged by eye off a contact sheet. Ten props were flagged that way and all ten were run; the table above is
what came back.

**THE BULK RE-ROLL DOES NOT PAY, AND THAT IS THE RESULT OF THIS STEP.** Six
of the 25 were run before the pass was stopped:

| sector | ink | what happened |
| --- | --- | --- |
| 4-5 Terra's Geode Hall | 5.58 | softer lines, but the CAVE became a meadow — restored |
| 10-5 Festival Stage | 5.04 | softer lines, but lost its candles, moon, stars and banner — restored |
| 5-5 Echo's Mirror Palace | 4.88 | restored |
| 8-4 Sled Hill | 4.51 | restored |
| 10-3 Lantern Market | 4.46 → 5.23 | INKIER by the metric, and the sunset became daylight — restored |
| 4-4 Lantern Bridge | 4.46 → 3.47 | better on the metric AND richer to look at — **kept** |

One clear win in six. Two failure modes, both of them expensive:

- **The detail goes with the line.** "No line inside the shape" is read as
  "remove the small dark details" — the candles, the moon, the stars, the
  ribbon. `STYLE_CORE` now carries *TAKING THE LINE AWAY MUST NOT TAKE THE
  THING AWAY*, naming the small things, and `STYLE_CHECKS` a *COUNT THE
  THINGS* check. The existing "nothing may be left out" clause did not cover
  it, because its own list names buildings, towers and bridges.
- **The mood drifts.** A cave becomes a meadow, a sunset becomes noon. The
  colour clause is already as strong as words get; this is the dice.

**So: the rule stays in the prompt and every NEW painting carries it** — the
17 creatures and the 5 rig parts were all painted under it — **but the
shipped catalogue is not worth re-rolling in bulk.** Do the rest one at a
time, look at each, and keep only what wins on both the metric AND the eye.
A re-roll is a fresh dice throw: re-measure every return against its own
before figure, and put a loser back from
`art-sheets/painted/replaced/<stem>.<stamp>.jpg` (copy it over
`painted/<stem>.jpg`, then `POST /api/slice?stem=<stem>` — no generation
spent). That recovery path was used five times in one hour here and it works.

## Step 5 — The remaining nine chapters (63 sheets)

45 sectors + 18 pages. The bulk of the work and the most mechanical: the
recipe below is the same for every chapter.

Left for last on purpose — a player sees one sector for a few minutes and the
runes, portraits and page furniture for the whole session, so everything above
buys more per generation.

### The per-chapter recipe

```bash
# 1. the five sectors (each also writes its map thumb)
curl -s -X POST -H "x-art-desk: 1" -H "content-type: application/json" \
  -d '{"action":"start","stems":["sector-N-1-…","sector-N-2-…", …]}' \
  http://127.0.0.1:5179/api/auto

# 2. the chapter's two pages
#    (export their references first if they have never been exported)
node tools/export-sheets.mjs --only page-N-…-land,page-N-…-port \
  'http://localhost:5273/#/art-sheets'

# 3. check what landed, then look at it
pnpm art:status
```

**Gate, per chapter:** every colour-me landmark came back neutral lilac-grey;
nothing was left out (count the buildings); the palette matches the anchor.

---

## Step 6 — Turn the art layer on

Only once coverage is high enough that a miss cannot happen in a normal
session. `VITE_ENABLE_ART_OVERRIDES=false` is the build default today because
**a miss is free for the game and expensive for a portal**: CrazyGames' QA
console reports every 404 as `Missing resource detected`, one line per
drawable, which reads as a broken build to a reviewer.

Before flipping it:

1. `pnpm art:status` — 186/186, no family half-painted.
2. **Preload tiers.** `firstArtWants` must name every kind the first screen
   shows. It already missed the `page` kind once (fixed 2026-09-21) and the
   symptom was the whole sheet changing under the cards after the splash.
3. **Scoped invalidation.** Run the `scoped-art-invalidation` census: with ~180
   paintings decoding during boot, any cache that drops everything on each
   arrival re-bakes the scene ~180 times. `map.ts`, `wipe.ts`, `duelPage.ts`
   and `intro.ts` are scoped today; re-check after step 1 adds four more.
4. **Memory.** Full sector paintings are dropped by `forgetArt` after use;
   confirm the duel's full-res bake (`RES_PAINTED`) is released on
   `resetDuelPage`.
5. A pass on a mid-range Android, art on, watching for first-seconds stutter.
6. **The CLOTH — DONE (2026-09-24, paint-outstanding B17):** all five places
   now call `drawCloth` — the map, the restore, the intro, the duel's letterbox
   and the boot fill. What follows is the audit as it was written.
   **The CLOTH is painted on the map and drawn everywhere else** — audited
   2026-09-21 and left alone, because three of the four are a look decision
   and one of them is in `duel/`. `page/cover-cloth` is painted and the map
   blits it (`map.ts` `drawBackdrop`); the restore's surround
   (`restore/wipe.ts` ~1400) still builds the same two-stop gradient by hand,
   the intro's (`story/intro.ts` ~694) is a flat `#7B5EA8`, and the duel's
   letterbox (`duel/render.ts` ~823) and the boot fill (`AppScene.vue` ~441)
   are a flat `#9E7CBE`. With the layer ON, a child goes from a woven cloth to
   a flat one by tapping a gift. Each is one `spriteFor('page',
   'cover-cloth')` probe over its existing fallback and costs no generation —
   but do all four in one pass, or the mismatch just moves. If they are wired,
   add `cover-cloth` to `firstArtWants`: it becomes the first screen's whole
   background, and that is the most visible pop-in there is.

---

## Step 7 — The art that leaves the game (promotion)

Untouched so far. `pnpm art:promotion` (`PROMOTION.md`) composites the painted
cast into cover plates at every aspect a store page wants — 16:9, 9:16, 1:1,
icons, favicon — and is what a portal listing is actually judged on.

Runs last because it is built FROM the finished cast. Its rules differ from
every other sheet: no text, no UI and no logo in the cover; a size is only ever
cut from a master of its own aspect; the cover keeps its own ground.

---

## Budget

Measured, not estimated — from the families painted so far:

| | |
| --- | --- |
| Full-bleed scene 1152 × 672 | ~27 kB |
| Map thumb 384 × 224 | ~18 kB |
| Book page | ~27 kB |
| Portrait strip (4 moods) | ~27 kB |
| **Whole catalogue, 187 targets** | **~4.1 MB** |
| First load (returning player) | ~350 kB |
| First load (first-timer, sees the intro) | ~500 kB |
| Streamed per sector entered, then forgotten | ~27 kB |

Flat, soft-edged art compresses extremely well — the compressor settles around
q50–q73 while still clearing SSIM 0.98. Re-check the total at the end of each
step with `pnpm art:status`; if a family lands far above these numbers,
something is being written at the wrong size.

---

## Traps already paid for — do not re-buy them

Each of these cost at least one wasted generation or a session of debugging.
The prompts now carry the fix; this list is so a future change does not undo it.

- **A portrait's circle is a CUT, not a shape.** Call it a "round window" and
  you get a painted lilac disc that hides the game's own per-speaker badge
  colour, putting every character on the same wrong ground.
- **A page must name WHICH mood it wears.** A model is four or five faces side
  by side; a page that does not choose gets a blank averaged one.
- **"Poses and sizes come from the last image"** makes a story page keep the
  reference's small-headed placeholder instead of the chibi model. The two
  images need separate authority, and the conflict named out loud.
- **Telling a scene to shade itself desaturates it** — the painter applies
  "far layers lighter and bluer" to the whole picture. Fence it to the far
  hills.
- **A scene will silently leave a building out** if it crowds the composition.
  "Do not add or move" is not read as "do not omit".
- **An attached style anchor gets its CONTENT copied** — the first anchored
  sector took the anchor's windmill sails, which are animated props. The rule:
  *if image 1 shows something the last image does not, it is not in your
  picture.*
- **Measure a colour before re-rolling it.** A return that looked black-inked
  measured `#24142c`, and the drawn reference measured `#140c1c` — darker.
- **Gemini always returns JPEG**, so a prompt chain naming a `.png` model never
  resolves by name. The desk matches `also` images by stem.
- **A style change does not re-export the sheets**, so the slicer used to stamp
  new paintings with the old style id forever. `pnpm art:prompts` now syncs it.
- **Never paint the duel's VFX, projectiles or spell bodies.** `fx.ts` is a
  zero-allocation pool whose unit polygons are scaled, spun and re-tinted per
  frame; baking them costs storage, kills the colour-batched draw and looks
  blurrier than the vector.
- **Bake a painting at the size it will be drawn.** `duelPage.ts` baked at half
  the sector's size and stretched it back over the stage — a downsample then a
  2.2× upsample, which is why the duel backdrop looked blurred while the rig on
  top of it stayed sharp.

---

## Standing gates

Run after every batch, not just at the end:

```bash
pnpm art:status            # what landed, and what each family weighs
pnpm art:prompts -- --check # the prompts still match the manifest
pnpm type-check && pnpm test
```

And look at it in motion — `/#/playground` with the art layer on, or a
production build (`pnpm build-only` + `vite preview`), which loads far faster
than the dev server for this project.

---

## Where it stands — 2026-09-22

**217 of 235 painted, 3.32 MB** (budget ~4.1 MB). The 18 outstanding are the
last two prop batches — the second pass's twelve and the third sweep's six;
Gemini's cap stopped at 98 generations. One `start` on the desk resumes them
after the reset. The prop family is the one number to watch: 28 sheets measure
213 kB, so all 46 land near ~350 kB, and the splash waits for every one of
them (`artPreload.firstArtWants`).

### The de-inking is fixed at the SEAM, not in the prompt

Three rounds of prompt wording failed to stop sector returns coming back with
a hard dark line round every shape — most stubbornly round CLOUDS, which have
no edge in life at all. It was never going to work: **the reference IS a line
drawing, and a painter shown a line draws a line.** `kitSky.inkFill` even
strokes at DOUBLE width with no `INK_SCALE`, which is why Cloud Kingdom came
back the most heavily outlined chapter of the ten.

`artDraw.renderSectorSheet` now wraps the context in a `softInk` Proxy: for
sector REFERENCES only, any near-black stroke or fill becomes a soft lilac
hairline and line widths drop to 40 %. Done at the seam rather than in the
kits because there are ~270 stroke sites across ten files plus private helpers
that never go through `ink()` — a rule applied in 270 places is a rule that
gets missed.

Softened, not removed: a white cloud on a pale sky with no edge at all is a
shape the painter cannot see, and an unseen shape gets left out. Tuned by
three single generations, looking at each: hard ink → `0.38/0.5` (black gone,
warm line left) → **`0.20/0.4`** (painterly clouds, no hard edge anywhere).

### Gates for resuming

1. **One job, then look.** A second Google account produced returns that
   ignored the reference completely (right style, invented scene) while the
   log still read "attaching image 1 of 2" — the desk drives the account's
   DEFAULT image model and only Nano Banana edits from attachments. At ~90 s
   a job an unattended queue overwrites good art faster than anyone notices.
2. **Never `import()` the slicer** to syntax-check it — it RUNS on import.
3. **After any re-slice, compress with `--fresh`** or the catalogue silently
   doubles: it sat at 7.6 MB until `node scripts/compress-images.mjs
   public/images --max-effort --backup-dir public-backup --fresh`.
4. Chapter 1 is deliberately never re-rolled — its paintings are the target.


## 2026-09-24 — the mascot re-rolled, and the rewarded-ad movie camera

- **`brand-mascot`, one roll.** The first one had two horns (the rig's far ear
  painted as a spike) and the duel rig's stilt legs. The brief now writes the
  chibi body out in words, limits the reference to LAYOUT, and counts horns
  and legs (art-style.md §11.3 amendment). The return was right first time;
  one enclosed crease between Aurora's tail and rump came back a DARKER pink —
  walled in by ink, so not keyed — and was set to pure `#FF00FF` in the
  painting (`painted/brand-mascot.png`; the raw Gemini return is in
  `painted/replaced/`) before slicing. The prompt now checks enclosed gaps.
- **`worldui-movie-icon`, new, one roll.** `artIds.MOVIE_ICON`: the glyph in
  front of every rewarded button's label (`ArtIcon kind="worldUi"
  id="movie-icon" fallback="video"`). Drawn reference in `artDraw.ts` (the
  `video` glyph's layout plus two reels and a play sign); default 256 px cap
  like the runes — 280 × 256, 5.5 kB. Judged at 24 px on cream and on the
  reward gold: reads as a film camera on both.
- `art:status`: **260 painted, 0 still drawn, 260 in the catalogue.**

## 2026-09-24 — the HP frames: the first painting the game STRETCHES

`artIds.HP_FRAMES` — `worldui-hp-frame-aurora` and `worldui-hp-frame-foe`, the
duel HUD's two health-bar frames (`HpBar.vue`, `game/duel/hpFrame.ts`).
Aurora's: a cream disc with a gold star in a pearl-set gold ring, a gold rail,
a two-leaf finial with a pearl. The night's — every foe's — the same layout
mirrored: a silver crescent on deep indigo in a twinkle-set silver ring, an
indigo rail edged in silver, silver leaves and a moonstone. **One roll each,
both kept**: 11.2 kB and 9.7 kB after `--fresh` (708 × 256, the default cap),
0.105 % and 0.000 % leftover magenta.

- **How it stretches.** The bar is ~140 px a side on a portrait phone and
  ~400 stage units in landscape, so the painting is laid on as a CSS 9-slice
  `border-image`: the medallion end and the finial end at their own size,
  only the rail between them stretched. The slice lines are geometry, not
  measurement (`hpFrame.paintedSlices`): the reference's box is its extent
  plus `measureBox`'s 6 % air, and the medallion is the frame's tallest part
  on purpose, so that box is known before the bench measures it (analytic
  2.757:1, bench 2.765:1). Each slice sits well into plain rail — a quarter
  rail past the track's round end at the medallion, clear of the leaves'
  tips at the finial — so a return a few percent off still slices clean.
- **The brief says PLAIN three ways**: in `keep` ("the one rule the game
  cannot work without"), as a check ("cover both ends with your hands"), and
  in the reference itself, which draws a short plain rail between two ornate
  ends. It also says the rail's long edges are the one straight thing in the
  picture — the style block otherwise asks for no straight edge anywhere.
- **The track is a HOLE** (`holes`): the game draws the health behind the
  frame. Measured on the cut: the painted window lands within 0.03 R of the
  drawn one; the DOM track tucks 0.05 R under the painting so it never shows
  a seam.
- **`itemPrompt` learned `canvas`.** A single wide panel (1536 × 864) is now
  briefed as ONE WIDE 16:9 image instead of "one square image"; only these
  two sheets set it (the mascot has its own prompt).
- **The reference's ink is thin** (`REF_INK` 0.013 R): the creature lesson —
  an evenly inked reference comes back an evenly inked sticker.
- **Painted in a tab of its own.** Another project's desk (merge-legions, on
  5178) was running a queue in the SHARED Gemini window, and a desk drives the
  first gemini tab it finds — two desks would fight over one tab. The two
  generations went through the desk's own modules (`gemini.mjs`,
  `pipeline.mjs`) from a script that opens and closes its own tab, counts
  each generation in `~/.art-desk/usage.json`, and hands the return to
  `processReturn` (file → slice → compress `--fresh --only`).
- In the duel's hold (`artSchedule.duelWants`, and the versus plan): on screen
  from the first frame to the last. `tests/meta/artSchedule.test.ts` now
  allows exactly these two `worldUi/` entries in a duel's hold.
- `art:status`: **262 painted, 0 still drawn, 262 in the catalogue.**

## 2026-09-24 — paint-outstanding pass (restore)

The restore's rows of `paint-outstanding.md`. Seven new item sheets (all in
`ITEM_SHEETS`, `PROMPTS-ITEMS.md`), every one a seam in front of the drawing
it replaces — art off draws exactly what it drew, bar the three fixes marked
*(also art off)*.

| stem | kind/id | what | seam |
| --- | --- | --- | --- |
| `item-sunbeam` | `tool/sunbeam` | the wand with the sun on its tip, charged, no rays | `gift.drawSunbeam`, grown about the sun with the charge and the pull |
| `item-sunbeam-rays` | `tool/sunbeam-rays` | the eight rays round an EMPTY middle (`holes`) | turned by the clock, scaled by the ray length, under the sun |
| `item-paint-pot` | `tool/paint-pot` | one neutral jar, the paint tinted per pot | `UnboxScene.vue` — an `<image>` in the button's SVG, baked per colour by `useItemArt` |
| `item-paint-blob` | `tool/paint-blob` | the paint in flight, tinted | `wipe.drawPaintFlight` |
| `item-twin-gift` | `gift/twin-gift` | 2 panels: tied / bow at its loosest | `gift.drawTwinGift` (the map's Twin Gift) |
| `item-emblem-crystal-ward` | `gift/emblem-crystal-ward` | Crystal Ward's three prisms | `restore/emblem.ts` |
| `item-emblem-frost-lock` | `gift/emblem-frost-lock` | Frost Lock's six-armed crystal | `restore/emblem.ts` |

All seven are in the cleaning's plan (`artSchedule.cleaningWants`): the
Sunbeam's two on a boss, the emblem on the two Signature-Spell bosses, the
jar, the blob and the Twin Gift on every cleaning. The sponge's corner star
now asks for `prop-twinkle` too, so the cleaning and the intro plan it.

**What stays drawn, and why** (so the next pass starts from it):

- **The Sunbeam's HALO** — a radial wash with no edge. **Its charge colour**
  (a deeper gold while it recharges) is dropped with the art on: the sun
  already shrinks to 80 % while it gathers, which says "not yet".
- **Why the Sunbeam is two sheets, not one:** its rays turn and its wand does
  not. The rays' LENGTH change is a scale about the sun — their inner ends
  stay under the disc at every length the game draws (≤ 0.96 of its radius).
  The painted wand lies over the rays (the drawn one lay under them): a wand
  in front of its own sun's rays reads as holding it.
- **The Twin Gift's hold steps** became a two-panel strip: the bow is seen
  at 0, ¼, ½ and ¾ loose (the fourth step is the burst), panel 1 is 0 and
  panel 2 is ¾, and ¼ and ½ are cross-fades between them (`twinFrame`). If a
  mid-step cross-fade reads as a double bow, the fix is a 4-panel strip (one
  per pose), not a vector bow.
- **The pot's MARK** (petal / sun / bell) stays SVG over the painted jar — a
  glyph that must stay crisp at 55 px and tells the pots apart without
  colour (art-style §4.3). The jar's paths moved to `restore/potArt.ts` so
  the SVG and the reference are drawn from one set of `d` strings; the
  reference's ink is thinned to 0.6 (the creature lesson).
- **The Frost emblem is NOT `prop-snowflake`** (the free win the audit
  suggested): that painting is a soft round speck with a faint six-armed
  ghost — a white ball at emblem size. It got its own sheet. The two emblems
  are two stills rather than a 2-panel strip because the strip prompt says
  "the same object at a different moment", and they are two objects.
- The chip's twinkle uses the tinted `prop-twinkle` (baked for the DOM by
  `useItemArt`); every glow, the beam wedge, the slingshot band, the sponge
  footprint ring, the pot cue haloes and the landmark target ring stay
  drawn, as before.

**Code fixes, no generation:** B3 the paint's spreading colour now goes
down under the live props, not over them *(also art off)*; B4 a creature
painting landing before the first stroke re-bakes the dust; B5 a traced rune
(and each glyph of a Signature recipe) settles into its `rune/*` painting
for the hold; B6 the tool chip shows the tool paintings; B7 a boss win drops
the CHEST onto the island (and `winWants` plans the chest, not a parcel);
B15 the Twin Gift's drawn film strip is gone *(also art off; story-spec §8.2
updated)*; B17 the boot fill is `drawCloth` *(also art off: the cloth's
gradient, not flat `#9E7CBE`)*; B24 the restore clips the sector to the
mount's rounded corners, as the map's card does *(also art off)*.

**Before painting:** export only these seven (`--only`), not the catalogue
— an unscoped export marks every painting stale. The emblems and the rays
are the ones to LOOK at first: the rays must come back with an empty middle
and eight equal rays; the Frost emblem with no disc behind it.

## 2026-09-24 — paint-outstanding pass (duel)

The duel's rows of `paint-outstanding.md` (B19, B20, B22, B23, the §2 free
wins, P12, the duel's half of P14, P15). Seven new PROP sheets
(`PROP_SHEETS`, `PROMPTS-PROPS.md`), every one a seam in front of the drawing
it replaces — art off draws exactly what it drew, bar the fixes marked
*(also art off)*. The cloud band, the sky wash and the scoreboard rainbow
(P13) were excluded by the owner for this pass and are untouched.

| stem | what | seam |
| --- | --- | --- |
| `prop-ward-rock` | Earth's wall: six stones in two columns | `fx.drawBar`, about the caster's hooves, mirrored for the foe |
| `prop-ward-ice` | 3 panels: the ice pillar with its facet leaning left / straight / right | `fx.drawBar`, frame `1 + sin(3T)`, blended OPAQUELY (`fx.blitWard`) |
| `prop-ward-wind` | the air ring and its four gusts, the middle a HOLE | `fx.drawBar`, the whole sheet turned by `1.6T`, at 70 % |
| `prop-ward-bubble` | the bubble ward's rim and catch-light, the middle a HOLE | `fx.drawBubble`, swelling with the wobble |
| `prop-ward-crystal` | Crystal Ward's three prisms | `fx.drawCrystalWard`, mirrored, at 85 % |
| `prop-ward-frost` | Frost Lock's dome: its rim and four ferns, the middle a HOLE | `fx.drawFrostDome` |
| `prop-frost-lock-ice` | the block round a frozen duelist: rim + two light planes, the middle a HOLE | `render.drawIce`, via `duel/stageArt.ts` |

**Why the VFX rule (Traps, above) does not cover the wards.** It is about the
POOL: unit polygons scaled, spun and re-tinted per frame, batched one path
per colour. A ward is not in the pool — `drawBar` draws ONE persistent shape
per side, raised at the same place every time (`sim.raise`: `GY − 70`), that
stands for seconds: a still a matrix carries, the prop family's own rule.
The two that move are matrices too: the wind's gusts orbit rigidly (the
drawing's 30/27 ellipse becomes a circle), and the ice pillar's facet sways
by ±1/15 rad, which became three panels.

**What stays drawn, and why:** the see-through WASH inside the bubble, the
frost dome and the ice block (a fill with no edge — the paintings are hollow
and lie over it); the bubble's turning SHEEN and its CRACK (the crack is a
state the ward changes into); the rising little bubbles (now `prop-bubble`);
the crystal ward's sweeping LIGHT BAND and tip GLINTS; the dome's GLITTER;
the blink before a ward drops; the ward FLASH (`drawWardFlash`); the shatter
(the pool). The references are drawn by the same path code the game strokes
(`windWard`, `icePillar`, `rockStack`, `crystalPrisms`, `frostDomePath`,
`iceSlab`), opaque and hollow, ink thinned to 0.6.

**Reused, no generation:** the KO stars → `prop-star` (spun as the drawn one
spins); Dream Dust's motes → `prop-twinkle`, tinted lilac; the KO Z's and
Dream Dust's Z → `prop-sleep-z` (the sectors pass's sheet, `kitSky.zAt`); the
snap flash → the painted `rune/*` icon, scaled and faded in `RuneGlyph`'s
100-unit box; Frost Lock's flakes → `prop-snowflake`, 10 SU across (the
asterisk was 12 — the painting is a soft speck and carries more weight). If
that speck reads as snowballs on the ice, drop the seam in `drawIce`; the
drawn asterisk is fine. NB the `prop-snowflake` cut has a faint pink key
fringe on its rim.

**Code fixes, no generation:**
- **B19** *(also art off)*: a dusty duel page bakes the sector's props AT REST
  into its clean layer (the dust is drained from that layer, so it keeps
  them), so a patch a spell blows clean shows the painting WITH its props; a
  practice duel on a RESTORED page draws them alive over it
  (`duelPage.drawLiveProps`) — held still on the thrift tier, whose
  `backdrop.ts` cache composes the page once.
- **B20**: Prism's painted horn is tinted from a hue stepped round the wheel
  in 24 (`chars.HOT`); the flat coat under it keeps the smooth hue, and the
  sheet only lends it lightness, so the step is invisible — 24 tint bakes,
  once, instead of one a frame.
- **B22** *(also art off)*: the stroke, the spell bodies, the bubble and bolt
  shots, the forge and every fx outline ink plum `#3A2340`, not `#1a1030` /
  `#150f1c` / `#140d18`.
- **B23**: with the barrel painted, the chest tuft goes down UNDER the
  painting, so only its scallops past the chest's edge survive — no inked
  line inside the painted barrel. Art off keeps the drawing's order.

**Not done, with the reason:**
- **The portrait page card and the pane strip** (`render.drawPageCard`,
  `drawPaneStrip`): not a painted surface. They are flat cream paper, a plum
  line and a cel shadow — the SAME mount as `wipe.drawPage` and the map's
  `drawCard` — and painting the duel's copy alone would split the one object
  the three screens share. If the map pass paints the card (P9), the duel
  takes it from there.
- **`arena.ts:182/216`, the drawn island's `#112` ink** (B22 lists only
  `:267`, the cloud band — excluded): it is the island REFERENCE's own ink,
  so changing it re-exports all ten island sheets, and every island is
  painted, which replaces it. Left.

**Traps worth keeping:**
- `drawItem`'s cross-fade dims BOTH panels (`a·(1−t)` then `a·t`), so a
  strip that sways for seconds pulses see-through at mid-blend. The ice
  pillar blends opaquely instead: the lower panel solid, the upper over it
  at the fraction (`fx.blitWard`).
- The wind shell turns as ONE sheet, so its painted light turns with it. If
  that reads wrong on the stage, split it — a still shell plus the four gusts
  turned — which is a second sheet, not a code change.
- Review the hollow shells (wind, bubble, frost dome, ice block) keyed on
  the DARK duel stage, not on magenta: a hole that came back tinted is a
  pink disc over the duelist.

**Schedule:** `artSchedule.duelFxWants` — the wards the runes in play can
raise, Frost Lock's ice and snow, the knockout's Z and star, Dream Dust's
twinkle — goes FIRST in a duel's NEXT (and after the duel in a dialogue's
NEXT, and in local versus). None of it is on screen at the duel's first
frame, so none of it holds the splash. A practice duel on a restored page
records its sector `alive`, for the live props.

**Before painting:** export only these seven (`--only`), not the catalogue.
No existing reference changed in this pass.

## 2026-09-24 — paint-outstanding pass (map & UI)

The map-chrome, intro and DOM rows of `paint-outstanding.md` (P3, P5, P9,
P14, the §2 chest marker, B18, B25). Eleven new `worldUi` sheets
(`WORLD_UI_SHEETS`, `PROMPTS-ITEMS.md`; ids in `artIds.CHROME_ART` and
`artIds.PICTO_SETS`), every one a seam in front of the drawing it replaces —
art off draws exactly what it drew. No existing reference changed.

| stem | what | seam |
| --- | --- | --- |
| `worldui-show-glove` | the white "put your finger here" glove, finger up, fingertip at the top (`anchor: 'top'`) | `map/glove.ts` `drawGlove` — the front page's rainbow swipe, carried by the same translate / tip / press-scale; and the intro's rune beat, where it replaces the drawn fingertip pad (`intro.drawRuneTrace`) |
| `worldui-book-board` | the cover board and the block of leaves round a page HOLE (`holes`) | `map/bookBoard.ts` `drawBoardArt`, a canvas 9-slice at the top of `map.drawBoard` |
| `worldui-dialogue-leaf` | the dialogue's cream paper leaf with its plum edge | `DialogueBubbles.vue` — a CSS 9-slice (`border-image … fill`) on the leaf's `::before`, slices from `domArt.leafSlices`; its lift a `drop-shadow` that follows the painted edge |
| `worldui-gold-star` | the chapter title page's gold star | `DialogueBubbles.vue` `.star` — an `<img>` in the glyph's em box; the ★ text otherwise |
| `worldui-trophy` | the local-versus winner's cup | `GameScene.vue` `.crown` — `ArtIcon` over the shared `trophy` glyph |
| `worldui-turn-phone` | the "turn me sideways" toy phone (shell, screen, button) | `TurnSideways.vue` — an `<image>` inside the same rotating group; the lilac turn arrow stays drawn |
| `worldui-shield` | the ad-blocker card's shield | `AdsBlockedModal.vue` — an `<img>` in the emoji's em box, asked for only once the card opens (`useArtImage` now asks for nothing on an empty id) |
| `worldui-picto-set-1` … `-4` | the dialogue pictograms, as four SETS of 6, 6, 6 and 5 | `Picto.vue` — one panel of the strip (a nested SVG whose viewBox is that panel), seated over the 48-unit box by the strip's `itemBox` |

**A SET is a new sheet shape (`ItemSheet.set`).** The slicer only cuts ONE
row of panels into ONE file (there is no grid and no file-per-panel), so the
23 pictograms the script uses are four strips, and the DOM shows one panel.
The strip prompt's "the same object at a different moment" is exactly wrong
for six different pictures, so a set is briefed "ONE HAND, n DIFFERENT
PICTURES" instead (`itemPrompt`), and `tests/meta/artChrome.test.ts` pins it.
The sets are grouped by where the script uses them — set 1 the six every
chapter shares (sparkle, heart, dust, pom-pom, crossed wands, sun), set 2 the
woods and the night (the moon recurs to the end), set 3 the bay and the sky,
set 4 chapters 6–10 — so a dialogue page asks for two files, and the cold
boot's opener for sets 1 and 2 only. `leaf` is in the union and in no line of
the script: not painted.

**Two paintings the game STRETCHES, the HP frames' way.** The board (P9)
round a page that is ~1.8:1 sideways and ~0.55:1 upright, the leaf (P14)
round every line of the story. Each brief says PLAIN three ways — `keep`, a
"cover the corners with your hands" check, and a reference that draws a
plain side between four corners. The board's leaves are striated PARALLEL to
the edge (a stretch along a side cannot smear them), its cloth is lit by a
vertical light (a 9-slice stretches that without a seam), and its hole is
inset `HOLE_IN` under the page so the page card's rounded corners never show
the cloth. The leaf's middle is stretched too (`fill`), so the brief asks for
plain, light cream there — the words are printed on it.

**The free win:** the spellbook's "comes from a chest" marker is
`gift/boss-chest`'s SHUT panel (`ArtIcon` learned `frames` / `frame`: a
strip shows one panel through an SVG viewBox). Its clasp gem is the
painting's neutral grey — the DOM has no tint route.

**Not painted, with the reason:**
- **The page card's edge and the thumbnail mounts** (`drawCard`,
  `drawSector`): the card's plum edge is a hairline that must follow the page
  rect exactly at any aspect (the page's own painting is clipped to it); a
  mount is a 3–6 px white or butter band whose colour IS the node's state —
  ui-design-system §9.7's "small, repeated, recolours by state". The duel
  pass's portrait card therefore stays drawn too, as it said it would.
- **The book's contact shadow** (a blurred wash, no edge) and **the stitched
  spine** (~20 px of crisp stitching a stretch would only blur, as step 1
  already recorded).
- **The rank badge's trophy** (`RankBadge.vue`): 14–19 px, and it inherits
  `currentColor` so the glyph and the numeral can never drift apart. A gold
  painted cup on the gold pill is the gold-on-gold trap (ui-design-system
  §10.6); a plum one is the glyph again. The versus cup is the painting.
- **The locked-rune padlock** (`RuneTrace.vue`): ~8 px across on a 44 px
  tile. A painting at that size is the same two shapes, softer.
- **The splash background** (`ui/splash-cover`): the splash is deliberately
  OUTSIDE the art layer (the same picture whatever `?art=` says, painted
  before the layer has probed anything — `FLogoProgress.vue`), and
  `index.html`'s pre-JS copy must match it byte for byte and cannot read a
  flag. So a painted cover would be a plain file on EVERY build: ~40 kB on
  the critical path before any JS on every cold load, and a 404 in every
  portal's QA console until it is painted. The splash already carries a
  painting (the mascot). A budget-and-brand call for the owner, not a
  drop-in.
- **The DOM sparkles and confetti** (`HpBar`, `DuelLightbox`, `RuneSlot`,
  `SpellBook`, `duel.sass`'s book "new", `FReward`, `FinaleCard`):
  `prop-twinkle` / `-confetti` / `-mote` / `-star` are neutral sheets tinted
  per call by `artTint`'s canvas mask-and-multiply, and there is no DOM tint
  route; the marks are 6–20 px clip-path shapes whose look at that size IS the
  silhouette the clip-path already is. Not worth inventing a DOM tint layer
  for. (The chapter title page's ★ got its own UNTINTED gold star instead.)

**Code fixes, no generation:** **B25** — the boss "next up" silhouette is
drawn inside `withoutArt`: the rig's painted parts were tinted to its plum
and composited by luminosity, so the barrel, neck, head, ear and horn carried
the painting's form while the drawn legs and mane stayed flat (and it cost
five tint bakes in a colour nothing else wears). **B18** — behaviour
unchanged (the owner's call); `paintFrontPage`'s comment now says the dashes
are drawn only on the DRAWN page.

**Schedule:** the board goes with every page (`pageWants`, `frontWants`); the
glove with the front page and the intro (`frontWants`, `pageWants(0)`,
`introWants`); the leaf and the lines' picto sets with every dialogue
(`storyChromeOf`: `dialogueWants`, a boss's thank-you in `winWants`, the next
chapter's first page in `chapterWants`) — and in the cold boot's first-duel
HOLD, because the opener is printed over the arena from its first beat (the
test's allow-list now names them; the hold stays ≤ 16); the gold star with a
chapter's first node; the phone (held when upright) and the trophy in local
versus. The shield is not scheduled — the card is rare.

**Before painting:** export only these eleven (`--only`). Look first at the
two stretched ones on the real screen: the board on a phone held upright
(its sides stretch 3–6×) and the leaf at its shortest (the title page) — and
run the contrast audit (`tools/locale-fit/audit.mjs --contrast`) with the art
on once the leaf is in, because the words now sit on the painted middle.
Then the sets: count the DIFFERENT pictures, in order, none with a face, and
the Z's of set 2 present.

## 2026-09-24 — paint-outstanding pass (sectors)

The sectors' live layers and the map overlays, from `paint-outstanding.md`
(B1, B2, B8–B14, B16, the replay star, P4, P10, P11, P14). **Sixteen new
`prop` sheets**, and the rest are seams onto sheets that already existed.
With no painting decoded every seam draws its old vector, so art OFF is
unchanged — except 1-1 and 1-4's tap log, which B1 moves on purpose.

| sheet | serves | tinted |
| --- | --- | --- |
| `prop-hollow-log` | the woods' tap log on 1-2, 1-3, 1-5 (B1) | — |
| `prop-moss-bed` | the Wood Sprite's bed, 1-3's rescue (P11) | — |
| `prop-rock-nest` | the Shard of Clear Light's nest, 4-3 (P11) | — |
| `prop-ice-block` | the Frozen Star Shard's block + snow cap, 8-3 (P11) | — |
| `prop-bunny` | the Bloom's bunny (P4) | — |
| `prop-flower-head` | the Bloom's tall-flower heads (P4) | petals |
| `prop-carousel-drum` | 10-2's mirrored drum (P10) | — |
| `prop-carousel-horse` | 10-2's six unicorns — **6 panels**, one per look (P10) | — |
| `prop-gnomon` | 7-3's sundial blade (P14) | — |
| `prop-planet` | 9-5's three planets (P14) | the ball |
| `prop-snowball` | 8-4's rolling snowball (P14) | — |
| `prop-kite-bow` | the kite tails' bows, 3-4 and 6-4 (P14) | the bow |
| `prop-bubble-ring` | the sea-foal's bubble ring (P14), `holes` | — |
| `prop-canoe-pole` | 4-2's lantern pole (P14) | — |
| `prop-glass-chip` | 5-3's fallen chip (P14) | the chip |
| `prop-sleep-z` | every sleeping rescue's "z" / `zzz` (P14) — and the duel's KO Z's | the body |

**B1 — the woods' tap log.** Only 1-1 and 1-4 paint a log. Their taps now
sit ON that log (`OWN_LOGS` in `sectors.ts`): the cover IS the sector's own
`log()`, so a painted sector cuts the painted log and the art-off drawing
redraws its log over itself. 1-2, 1-3 and 1-5 draw `prop-hollow-log` live,
whole behind the sprite and blitted again, clipped to the front's path, in
front of it; with no log painting they draw the vector back and front
DIRECTLY — never as a cover, which on a painting with meadow there was an
invisible log. `sectorDef.ts`'s contract says so now.

**The two-part props are one painting.** The log and the rock nest have a
back behind their creature and a front in front of it. One painting per prop,
drawn whole first and blitted again through the vector front's own outline
(the `tapCover` move with the prop's painting as the source), rather than a
two-panel strip a painter has to split. The ice block is the same move the
other way round: the body blitted at the drawing's 55 % (a pane the shard is
seen through — the reference is OPAQUE, the see-through is `globalAlpha`) and
the snow cap blitted again, solid, through the cap's lobes.

**Painted-under signals, for the duplicates (B14).** `tapCover.coverLayerLive()`
— true while a tap creature or rescue draws over its sector's painting — drops
the glowworm's lit facet fill. `sectorArt.sectorShowsArt(n)` — the art layer
on and either of the sector's paintings decoded, read off the probe state so
it never fetches or records — drops 3-1's second cord, 10-5's inked candle
tongues (only the halo stays) and turns the festival bulbs' opaque cores into
a glow. The 3-5 lamps' lit star is blitted at the painted lamp star's own size
(10), so it lights the painted star instead of ringing it.

**Zero-generation reuse.** Twinkles → `prop-twinkle` (`twinklePainted` for the
four call sites whose drawing is a different four-point star); hearts →
`prop-heart`; the frost puffs, 8-4's snowball burst, the buoy's foam collar
(one puff per `foam()` lobe) and ch 7's dig spray (sand tint) → `prop-puff`;
7-5's resting embers → `prop-mote` (ember tint); the sea-foal's bubbles →
`prop-bubble`; the singing shell's notes → `prop-note`; 1-4's inline lanterns
→ `prop-lantern`; Sprig's flag → `prop-pennant` (`kitSky.pennantCloth`, a
rotation onto the stick); the map's replay star → `prop-star`, gold.

**Album stickers (B16).** A MET cell is baked over a window of its sector's
painting (`CoverLayer.ox/oy`), so its hiding place is cut from the painting;
the full painting if still decoded (never fetched for it), the thumb else.
A sector painting landing re-bakes only that sector's met cells.

**Skipped, and why — do not re-litigate:**

- **8-4's start-flag ball finial** (`sectorsC8`, r 6) and **10-1's banner
  knot bead** (r ≈ 3.4) and the **pinwheel hub** (r ≈ 4): a static disc of
  7–12 SU, a hundredth of the scene — under the family's size floor, like the
  drip's drop and the candle tips (third sweep).
- **Ch 6's rainbow trail** (`kitRidge.foalTap`): a band whose LENGTH follows
  the foal every frame while its round ends and six stripe widths do not — a
  stretch would stretch the ends. It is `ripples`' reason (a stroke that stays
  put while the shape grows); light-coloured and edge-free besides.
- **The tall flowers' stems and leaf**: a hairline and a 9-unit leaf.
- **The carousel's far horses** now wear the full painting (saddle, horn and
  eye) where the drawing gave them fewer details; a plainer second strip for
  horses behind the drum is not worth a generation.

**Before exporting/painting:** `prop-carousel-horse` is the first 6-panel
strip in the catalogue (the portraits stop at 5); if a return comes back with
seven, split it into two 3-panel sheets rather than re-rolling blind. The
tint cache (`artItem.TINTS_KEPT` = 64) now carries a few more pairs per page
(flower heads, planets, kite bows, Sprig's flag colours) — watch the festival
and summit pages for re-bake churn once these land.

## 2026-09-24 — paint-outstanding pass (wardrobe)

The keepsakes' rows of `paint-outstanding.md` (P1, P2, and the §2 free wins on
the rig). The test was the third sweep's: **a constant shape under an affine is
a painting; a shape rebuilt per frame is not.** Thirteen worn stills and four
shelf badges, 17 new sheets in `PROMPTS-ITEMS.md`, every one a seam in front of
the drawing it replaces. Art off draws exactly what it drew — proved, not
eyeballed: a recording context replayed every keepsake (112 frames: a hop
cycle, a collapse, both facings, portraits, the photo-card stills) and every
shelf badge and ghost through HEAD's modules and the new ones, and the ~50 000
paint operations match one for one.

| stem | kind/id | panels | what, and the seam |
| --- | --- | --- | --- |
| `item-pegasus-wing` | `cosmetic/pegasus-wing` | 2 · near, far | ONE wing; the flap is a rotation, the fold a rotation and a scale. Near and far are its two colourings (the far boat's colourway rule) |
| `item-butterfly-wing` | `cosmetic/butterfly-wing` | 2 · near, far | the same, for the monarch wing |
| `item-necklace-shell` | `cosmetic/necklace-shell` | 1, **tinted** | one scallop, hinge up, strung three times in its three colours; each carried by a translate |
| `item-winter-scarf-wrap` | `cosmetic/winter-scarf-wrap` | 1 | the wrap and its knot, turned to the neck |
| `item-acorn-cap` | `cosmetic/acorn-cap` | 1 | head space, where it is worn (the crown's rule) |
| `item-star-tiara` | `cosmetic/star-tiara` | 1 | head space |
| `item-explorer-goggles` | `cosmetic/explorer-goggles` | 1 | head space |
| `item-bow-tie` | `cosmetic/bow-tie` | 1 | the knot on the origin, squared to the neck |
| `item-moon-pendant` | `cosmetic/moon-pendant` | 1 | the crescent alone; the cord carries it, never turns it |
| `item-explorer-pack-bedroll` | `cosmetic/explorer-pack-bedroll` | 1 | the far layer |
| `item-explorer-pack-satchel` | `cosmetic/explorer-pack-satchel` | 1 | the near layer: bag, flap, buckle, strap — no lantern |
| `item-pet-cloud` | `cosmetic/pet-cloud` | 2 · eyes open, blink | the body and face the float carries |
| `item-pet-firefly` | `cosmetic/pet-firefly` | 1 | the beetle's body only |
| `item-keepsake-petal-trail` | `cosmetic/keepsake-petal-trail` | 1 | shelf badge |
| `item-keepsake-frost-trail` | `cosmetic/keepsake-frost-trail` | 1 | shelf badge |
| `item-keepsake-moonlit-look` | `cosmetic/keepsake-moonlit-look` | 1 | shelf badge |
| `item-keepsake-sunset-look` | `cosmetic/keepsake-sunset-look` | 1 | shelf badge |

**Routed through sheets that exist, tinted (no generation):** every keepsake
SPARKLE — the hoof trail (live, the portrait's still, the photo card's still),
the Pastel Dream's twinkles, the Pet Star's trail and its badge's two — is
`prop-twinkle`; the bubble trail (live, still, badge) is `prop-bubble`; the
pendant's two stars are `prop-star`; the pack's swinging lantern is
`prop-lantern` on the game's own hanger. `rig-accessories.particleArt` is the
one seam: it probes first and draws nothing when there is no painting, so the
emitters' batched vector paths are untouched.

**THE BADGES: ONE PAINTING SERVES THE SHELF AND HER RIG.** The first shelf's
rule, applied to the second: the Flower Crown's and the Pet Star's badges
never had sheets of their own, because a badge draws the keepsake's own worn
function, and that function paints itself. So the ten second-shelf keepsakes
with worn art are painted on the shelf by it — the tile cannot drift from what
she puts on — and only the four that draw nothing painted got badge sheets:
the petal and frost trails, the moonlit and sunset looks. `KEEPSAKE_WORN_ART`
(`artIds.ts`) is the table: which paintings each keepsake draws as worn. The
schedule holds it wherever she is drawn in it (the duel, the wardrobe, a
try-on), and `tests/campaign/keepsakeArt.test.ts` records what the draw
functions actually ask the art layer for and holds the two to each other.
`VECTOR_ONLY_KEEPSAKES` is empty.

**What stays drawn, and why** (so the next pass starts from it):

| drawn | why |
| --- | --- |
| every CORD — the necklace's, the pendant's, the lantern's hanger | a curve through points the pose hands over (§4b's kept strings) |
| the scarf's two TAILS and fringe | a spine carrying a travelling wave, rebuilt every frame — the mane's reason (§4e) |
| the pearls; the pet cloud's raindrops; the firefly's trail dots | under the family's size floor (a 2-unit bead, a 3-unit drop) |
| the firefly's WINGS | a half-transparent blur beating at 26 rad/s — a see-through thing no painting may be |
| the firefly's and the star's glow | light, no edge |
| the PETAL trail's particles | no petal sheet exists; the badge is painted |
| the FROST trail's particles | `prop-snowflake` is a soft round speck whose brief forbids a crisp crystal — routed through it, the trail would become white dots. The badge is painted |
| the Umbra, Pastel, Moonlit and Sunset looks; the Mane Color Palette | palettes: nothing to paint (the rig's own parts are painted) |

**How the seam is built.** A worn still is drawn 1:1 in its OWN frame (head
space, the neck's frame, the wing's root) and blitted with
`drawItem(g, spec, WORN_UNIT)` where the vector was; the spec scales the
context, not the coordinates, so the reference's ink scales with the shape.
The reference's ink is thinned to 0.6 (`WORN_REF_INK`, the creature lesson)
and the prompt says so. The shell's reference hangs hinge-up and the game
turns it back by a quarter. The scarf's knot rides the wrap's frame in the
painting (the drawing keeps it in rig space; it is nearly round, the
difference is invisible). The badge specs (`KEEPSAKE_ART`) now draw inside
`withoutArt`: a badge draws the worn function, which paints itself, and a
bench with the art layer on would otherwise put last week's wing painting
into this week's reference.

**Schedule.** `wornStills` reads `KEEPSAKE_WORN_ART` (the duel's hold). The
wardrobe's hold now also carries what she has on and the WHOLE second shelf:
its alternatives stand on it in full colour from the first visit and are
tried on from there, so their art is due whether or not she owns them
(~17 small files; the map already fetches the wardrobe in `soon`).

**Upscale risk — the wardrobe draws Aurora up to 62 % of the screen.** All
17 keep the default 256 px cap. Head items, bow, charms, shell, companions
and the badges land at or under their pixels. The WINGS are the risk: the
near butterfly wing is ~118 rig units tall, which is ~340–440 device px on a
3× phone or a 1080p desktop and ~680 on a 2× desktop — a 1.3–2.7× upscale,
the same order as the rig's own barrel. If the wings read soft in the
wardrobe, give those two sheets `exact: 512` rather than lowering anything
else.

**Before painting:** export only these 17 (`--only`). No existing reference
changed: the crown's and the star's specs are untouched, and the seven
first-shelf badges draw exactly what they drew (the `withoutArt` wrap only
matters on a bench with the art layer on). No `also` images — none of these
is a character; the look badges follow the Umbra badge, which had none.
Look first at the two WING strips (two panels, one outline, root at the
right — a mirrored return is backwards on her) and the tinted SHELL (it must
come back neutral lilac-grey).

**Not fixed, seen on the way:** Aurora's DRESSED dialogue portrait
(`story/portrait.ts`) is baked once per outfit and re-baked only when a
`portrait` painting lands, so a cosmetic (or rig) painting that decodes after
the bake leaves the drawn one in that bubble for the session. It was already
true of the crown and the rig parts; the fix is to re-bake on `cosmetic`,
`rig` and the routed props in `portraitArtRev`'s listener.

## 2026-09-24 — paint-outstanding pass: the 58 sheets, painted

`art:status`: **320 painted, 0 still drawn, 320 in the catalogue.** The 58
new files weigh **449 kB** after `--fresh --only` compression (gift 60 kB,
tool 35, worldUi 162, cosmetic 203, prop 490 as families); the catalogue is
now ~4.27 MB.

**How.** The five slices' references were exported with `--only` (58, from a
private dev server: a wrapper config with `server.hmr: false`,
`watch.ignored: ['**/*']`, its own `cacheDir`); the bench's prompt documents
and `pnpm art:prompts` agreed byte for byte, and every existing painting stayed
sliced. No other desk was running, so this project's desk took 5178 and its own
Gemini window, and was stopped (window closed) at the end. Queued in the
P-list order — the book board, the leaf, the glove, the pictograms, the pot and
the blob, chapter 1's log, the Twin Gift… — one pilot per new kind first
(stretched frame, set, 2-panel, hollow shell, 6-panel). **72 generations**
(the shared ledger went 46 → 118); Gemini never refused on quota.

**47 of 58 kept first time.** Re-rolls, and what each taught the brief:

| sheet | rolls | why it went back | fix (all in `artSheet.ts`) |
| --- | --- | --- | --- |
| `worldui-picto-set-3` | 3 | 1: the six pictures on six pale-pink CARDS (the key lifted the magenta between them and shipped the cards); 2: refused by the strip guard, cut 1 through a drawing | none — the dice; 3 came back clean |
| `prop-flower-head` | 2 | the reference's five overlapping CIRCLES traced outline through outline: a heavy ring round every petal, crossing inside the flower | the blurb names the overlap as a drawing artefact; checks for no line where petals overlap and no perfect circle |
| `prop-ward-bubble` | 2 | a pale lilac FILM painted across the see-through middle; the key ate it unevenly and left a ragged pink ring over the duelist | `NO_FILM` on the five see-through shells (bubble, wind, frost dome, frost-lock ice, bubble ring); "only its rim — a hoop with nothing stretched across it" |
| `prop-ward-wind` | 2 | "a thick ring" read as licence: twice the width, curls into the middle, the hole under half the drawing's | the ring is "about a fifth of its radius, never thicker"; a hole-width check |
| `prop-ward-frost` | 2 | the film again, and the ferns grown from the FOOT as well as the arch | "a window frame with no glass in it"; the four ferns on the curved top, none at the bottom |
| `item-winter-scarf-wrap` | 2 | two leaf-shaped flaps under the knot — the tails the game draws, under another name | "the knot is ONE round ball… look directly below it: only magenta" |
| `prop-rock-nest` | 3 | 1: looked DOWN into it (a stone ring round a crater, twice the drawing's height); 2: "a deeper violet shadow on its lower right" came back as a CAST shadow off the stone | "seen exactly from the side… never an opening seen from above"; the shade is "on the stone's own lower right, never spilling off it" |
| `item-explorer-goggles` | 3 | the strap's far half as a tall arch over the lenses, twice — it would stand up through her forelock. The blurb itself said "a strap in a gentle arch" | "a short strap, nearly level"; one band at the lenses' height |
| `worldui-show-glove` | 2 | the desk's retry: Gemini first refused ("interests of third-party content providers" — a white four-finger cartoon glove), then answered the nudge with a 16:9 picture on no magenta, which the slicer refused | none needed |
| `item-twin-gift` | 2 | kept-able, but panel 1 was a thin open ribbon with tails and panel 2 fat filled loops: the hold's cross-fade showed two bows at once | "THE SAME BOW IN BOTH" + a side-by-side check. The re-roll's bows match; its box turned a little three-quarter (a side face shows) |
| `item-paint-pot` | 2 | one heavy even outline round the jar | the pot now says its reference line is DELIBERATELY THIN, plus the two-heaviest-lines test; the re-roll's line varies a little |

Parked returns are in `art-sheets/painted/stale/<stem>.<reason>.jpg`,
replaced ones in `painted/replaced/`.

**Kept, with a note** (candidates if a generation is ever spare — none is
wrong in play):
- `worldui-book-board` came back close to a tidied reference: smooth cloth,
  clean striped leaves. The stretch forbids texture, and at a 9–25 px margin
  it reads as the book; seen in landscape and upright, no seam or smear.
- `worldui-gold-star`, `prop-snowball`, `prop-glass-chip`: an even heavy
  outline (sticker-ish), all small in play. `prop-ward-rock` is six clean
  hexagons, as drawn.
- `item-bow-tie` is navy, darker than the drawn blue — what its brief asks.
- `prop-ward-frost` keeps a pink glass-sheen streak inside the arch (painted,
  not key residue: opaque `(243,149,210)`).
- `prop-carousel-horse` scores 0.57 % "magenta" — panel 1's candy-pink mane,
  opaque paint; the other five are under 0.1 %. Six unicorns, one horn each,
  all facing right, every coat/mane/saddle as briefed.
- `prop-ward-ice` came back narrower than the drawn pillar (scaled on its
  height); `item-winter-scarf-wrap`'s knot has a second lobe under it.

**Looked at in place, not only keyed:** the sector harness (1-3's log and moss
bed, 4-3's rock nest, 8-3's ice block, 10-2's carousel — all seated where the
drawing was); the rig wearing all thirteen worn stills, art on against art off
(each lands on its drawing); the book board round the front page landscape and
upright, the glove on it, dialogue leaves with pictograms from all four sets
and the gold stars; and the live app on a private dev server with `?art=on`
(cold-boot duel, front page, a chapter title leaf). **Contrast audit with the
art on** (`locale-fit/audit.mjs --contrast`, en, land+port): the painted leaf
passes; 4 runs sit under AA — the duel's "DRAW THE SQUARE TO BLOCK!" and "x1.7"
captions on `#9e7cbe` — and exactly the same 4 appear with the art off, so they
are not the art's.

**Two harness traps worth keeping:** `setArtOverrides(true)` always re-probes
— calling it again before a draw drops every decoded painting, and the draw
comes out vector; call it once. And a private dev server started while another
agent is mid-edit serves the half-written module (here `forge.ts` without
`forgeProgress`) for as long as it runs, because it does not watch — restart
it after their commit.

**Left:** nothing unpainted. The optional re-rolls are the "kept, with a
note" list above, one at a time, each judged against the one it replaces.

## 2026-09-24 — seven re-rolls from the "kept, with a note" list

The owner's go-ahead ("re-roll where it benefits the game"), most visible
first, at most three rolls a sheet, each roll looked at and measured before
the next (magenta `min(R,B) − G > 60` over α > 30 on every cut). **12
generations** (ledger 118 → 130). `art:status` still **320 / 320**; the seven
files went 38.9 → 41.0 kB. Before/after contact sheets:
`art-sheets/REVIEW-reroll-<stem>.png`; every replaced painting is in
`painted/replaced/`.

| sheet | rolls | kept | what changed |
| --- | --- | --- | --- |
| `prop-ward-rock` | 3 | roll 3 | six painted field stones, moss on the top two, a thin line; no crossing hexagon rings. Roll 1 (words only) traced the hexagons ring for ring; rolls 2–3 were against a re-exported reference. The two lower rows still keep a little of the six-sided outline |
| `worldui-book-board` | 2 | roll 1 | soft painted paper, no ruled stripes, a faint linen grain (lost at the 256 px cut). Roll 2 went straight back to the ruled stripes and is parked (`stale/worldui-book-board.ruled-stripes-again.jpg`). Seen round the map page landscape and upright: no seam |
| `worldui-gold-star` | 1 | roll 1 | plump, painted gold, soft highlight; the line swells under the points and thins at the top left. Reads on cream at 26 px |
| `prop-ward-frost` | 3 | roll 3 | magenta **0.283 % → 0.000 %**, the whole rim icy blue-white, the opening clean. Rolls 1–2 kept a rosy glass sheen inside the arch. Roll 3 added four feathery sprigs beside the four fern marks (the brief now counts them) |
| `item-winter-scarf-wrap` | 1 | roll 1 | ONE knot, nothing under it; checked on Aurora in the wardrobe. The even outline is unchanged (not in this pass) |
| `prop-snowball` | 1 | roll 1 | lumpy packed snow, a cool blue-lilac shade side, a thinner line that still closes round it |
| `prop-glass-chip` | 1 | roll 1 | pale glass with a bright upper-left edge and a sheen, no dark bevel band; still neutral (chroma 0.06, under `artTint`'s 0.16) |

**Prompt changes (`artSheet.ts`):**
- `ItemSheet.softEdge` + `SOFT_EDGE` / `softEdgeChecks` — *THE EDGE IS
  PAINTED, NOT INKED*: says what the reference's even ring IS, what holds the
  edge instead, and gives two checks ("follow the edge: along the lit upper
  left there is NO line"; the two-heaviest-lines test). On the star, the
  snowball, the chip and the rock. It also drops "fully outlined" from the
  colour-me clause, which asked for the ring back.
- A prop's own `keep` is now ADDED to the family's (`prop()`); no prop set one
  before, so nothing else's prompt moved.
- The star's `seenAt` ("a confident plum line") and "the plum line round it is
  strong" are gone: that brief asked for the sticker.

**Three lessons worth keeping:**
- **Words did not stop the rock tracing its reference; thinning the
  reference's ink did** — the creatures' lesson again. `fx.ts` `WARD_ART.rock`
  now draws each stone on its own, top row first (no ring runs across the
  stone in front), inked at `ROCK_REF_INK` 0.25; the game's own vector wall is
  unchanged. Re-exported with `--only prop-ward-rock` from a private dev
  server (the bench's prompt documents matched `art:prompts` byte for byte;
  the index changed only that sheet, fit 0.439 × 0.641 → 0.436 × 0.638).
- **Do not ask a painter to COUNT what the reference draws as lines.** "Five
  to eight bands you can count" brought the board's ruled stripes back at
  once. The clause is gone; a comment says why.
- **"Dome" and "shell" are glass words.** Two rolls painted a glass sheen
  across the frost ward's opening whatever the colours said; describing it as
  "an arch of frost — matte, like hoarfrost, no glass anywhere" cleared it
  first time.

**Candidates left, if a generation is ever spare:** the board's sheets melt
into one cream band at the 256 px cut (a third roll was not spent — the
margin is 9–25 px in play); the snowball's and the scarf's lines still close
round them.

## 2026-09-25 — the painted duelists

Owner: the duel rig "is so much different from the painted Aurora and the same
for Umbra" — paint every sub-part on its own.

**First attempt, turned down:** a chibi cut-out puppet on `brand-mascot`'s
proportions (7 full-colour pieces each, ids `puppet-*`). Owner: "reroll the
parts until they have a similar SHAPE as the current drawn rigs, but with the
art style and cuteness of the Aurora portraits and the intro" — and "the battle
rigs should not have an aroused or happy emotion, but a neutral one" (the
chibi's resting faces were a big smile and a half-lidded blushing smirk).
Retired the same night; its paintings sit in `painted/replaced/*.chibi-retired.jpg`.

**What shipped:** the drawn rig itself, painted (`duel/puppet.ts`,
`artIds.PUPPET_ART`, ids `duelist-<who>-<part>`). `chars.ts` keeps every bone,
angle and anchor; in `PAINT` mode each shape it used to fill is a full-colour
painting instead — nine per character: torso (+ chest tuft), neck (stretched
along `nk`), head (5-face strip: CALM neutral, blink, cheer on a win, ouch on a
hit, dizzy on a fall), horn, forelock, mane, tail, ONE leg and ONE hoof. The leg
is painted straight and BENT along the rig's four-bone chain at draw time: cut
into 20 slices, each laid where its share of the leg falls on the chain, turned
to the chain's direction read over a ±9-unit window (so a knee is a curve) and
widened to the rig's taper plus its heavy outline. Hair swings rigidly about
its root with the rig's wave. References are drawn from the rig's own geometry
(`TQ_REF` is pinned equal to `chars.TQ`), and every reference sheet now renders
under `withoutArt`. 18 sheets, ~125 kB.

Every other character is a recolour of one of the two sets (`puppetBake.ts`):
shadows keep Umbra's coat; Guardians take Aurora's set (light coats) or
Umbra's; skins and mane swatches recolour Aurora. Umbra's paintings come back
darker than her model, so her coat and horn are lifted by per-channel gain.

Paid for (~50 generations over both attempts):

- **A head told "no hair" comes back BALD — no ears.** Name the ears as the
  head's, as pony ears ("never round like a bear's"), and count them.
- **Hair drawn as smooth bands is TRACED as bands**; hair pieces take only the
  reference's size/place/outline and paint real locks inside it. Smooth the
  reference locks through their midpoints — a faceted blade is traced as one.
- **A mane-shaped blob is painted as a whole pony or a unicorn bust.** "It is
  not a unicorn — just the hair, like a wig with nobody in it."
- **A single-wedge forelock comes back as a framed card of hair.** Two locks
  read as a tuft; "no frame, card, slab or border round it".
- **No white sticker rim**, said in the checks.
- **Ink must be the same weight on every sheet**: a small piece is drawn big on
  its panel, so its reference line is scaled back by its own unit.
- **A crop of a scene as a model drags the scene along**: use the keyed mascot.
- **A flat hue over a dark JPEG→WebP slice shows its blocks**; recolour by
  per-channel gain whenever no channel moves more than ~2×, and floor the
  highlight ramp of the flat transfer.
- **The hit flash is baked into a copy of each piece**, not laid over it: the
  bent leg's overlapping slices doubled an overlay into stripes.

Cost: both duelists ~1.1 ms/frame against the vector rig's ~0.7 (headless,
desktop) — the leg's slices are 160 small blits a frame; transforms are set
directly rather than pushed and popped.

**Creature dialogue portraits** (same night): the nine creature strips were
painted from an evenly inked badge and read as flat stickers. Their references
now thin the line like the creature family's (`artDraw.creaturePortrait`) and
their prompts carry `CREATURE_NOT_A_STICKER`. Eight re-rolled and kept softer;
Puff came back twice with a painted white disc under it (and once with a horn)
and keeps its original.

**Second round (owner: "make the mane fuller like in the portraits", "the
hoofs and legs seem broken", "the face needs to look more like in the intro but
with a more neutral emotion"):**

- **Legs and hooves are one outline each now.** The sliced painting carried its
  own line, and every slice's piece of it turned differently — a stepped,
  doubled, broken edge. The outline is now ONE path (the bone chain offset by
  its taper, rounded at the joints and both ends) stroked once in soft plum; the
  painting is laid along the bones WIDER than that path and clipped to it, so
  only its paint shows. The hoof is the drawn hoof's quad, filled with its
  painting the same way. No new paintings needed.
- **The face is turned toward us, both eyes**, like the intro and the portraits,
  on the rig's own head outline; the intro's face (cropped tight from its last
  page, `model-aurora-face`) is the head's second model and the brief takes its
  laugh out. Resting face: both eyes open, small closed mouth, light blush.
- **The mane is the portraits' cloud**: a crown of curls framing the head and
  WAVY locks down the neck that taper to curling tips. Straight bands with a
  flat end came back as a wig with a square-cut hem; tip curls drawn as circles
  came back as fingertips. The fringe is a tuft of curls with streaks.

**Third round (owner, via the VS-preview session): "a lot of the rig looks ok,
I like the tail, but the hair and the face don't look great — should be more
like this"** (a crop of the intro's last page, `painted/model-aurora-target`):

- **The head is the intro's chibi head**: a round skull and a SHORT soft muzzle
  barely out of it (`SKULL`/`MUZZLE` in `puppet.ts`) where the rig's is a long
  horse profile; rosy cheeks, both eyes, calm. Head units and the horn's root
  are unchanged, so head-slot cosmetics still sit on it.
- **Hair references are SILHOUETTES** (`hairMass`): the mass's outline in one
  flat colour, nothing drawn inside. Every lock or stripe drawn into a hair
  reference came back traced as drawn — bands, a fan of thin strands, a
  rainbow hair band. With only the outline, the painter fills it with the
  model's hair: soft wavy locks striped in pastel, curls on the crown.
- The owner's target crop is the head's and the hair pieces' second model.

**Fourth round (owner): "I want the painted rig look somewhat like [the intro's
last page], but it should still allow for the forelegs rising up animation on
spell release … the face should have the cute chibi look, but not have the
happy emotion by default … since Aurora is shown from the side view, only one
eye should be in the face":**

- **The painted rig takes the chibi's PROPORTIONS on the drawn rig's bones.**
  `chars.ts` now reads its geometry from a profile (`RigGeo`): `JAM`, the
  drawn rig's numbers, unchanged, and `CHIBI` for the painted one — a head
  1.55× the rig's, a small round body low on short, chubby legs, a short thick
  neck. The pose code is the same code: the forelegs still fold and rise on a
  cast (the rig rears about the same hip), and she still lies down on the
  island, hooves on the ground (pinned in `puppet.test.ts` with `__chibiRig`).
- **The head is in PROFILE with ONE eye**, looking at her opponent; the
  brief says the far eye is hidden and the checks count one eye. The dialogue
  strip (faces looking out at us) is off the head's models; the intro crop and
  the mascot's side-turned head are on.
- **The mane hangs from the HEAD** (drawn in head space, swinging about the
  poll): the intro's cloud round the back of the skull and a fall of curl-tipped
  locks behind the neck; lying, it swings back along the neck instead of hanging
  through the ground. No chest tuft on the chibi's body.
- Re-painted: head, mane, torso, forelock × 2. Tail, legs, hooves, neck and
  horn are reused — they are laid along the bones and scale with them.
- **The chibi's legs are stubs, and the jam leg's drawing did not survive the
  change of girth**: a line round the top drew each leg as a tube stuck on the
  belly, the round end cap poked out under the sole as a loop, the line was
  twice the paintings' weight, and the cast's tight fold turned into a Z with
  the painting's own edge line showing inside the knee. Now the line runs down
  the SIDES only (from a top half-width below the root), the leg ends flat
  under a hoof as wide as the leg (the intro's gold cuff), the slices are cut
  from INSIDE the painting's line, the coat is laid under them for the gaps a
  bend fans open, and the cast raises a paw — upper arm forward, forearm hanging
  — instead of folding the leg flat.

**Fifth round (owner): "reroll umbra's fringe and soften the win pose legs. The
hair is clipping behind the legs, the legs have bad border cutouts, the hair is
swinging too much. The face looks weird"** — pointing at the intro, the
portraits and the mascot pair (`brand-mascot`):

- **The head is the mascot pair's again: three-quarters, BOTH eyes, both
  looking at the opponent.** The one-eye profile read as a ball. The pair is the
  head's first model; the ears are tall pony leaves (short wide ones read as a
  kitten's), the muzzle comes further out of the skull.
- **A near leg joins the body as ONE silhouette**, as a drawing's does: its
  line starts where each side leaves the body, and the body's own painting is
  laid back over the leg's top, less a 2.5-unit band that paints over the
  body's line. That top is drawn straight after the body (`LEG_TOP`), so the
  mane lying on the back and anything worn are never painted over; the rest
  of the leg (`LEG_REST`) is drawn in front as before. The re-lay is grown
  1.5 units past the leg, or its soft edge stays as a seam.
- **The mane's fall ends at the chest** (it hung down behind the legs), and a
  painted hair piece swings a fraction of the drawn locks' wave — mane 0.3,
  tail 0.55, fringe 0.15: a painting turns as one rigid block.
- **The win is a two-paw prance** (the cast's paw raise, curled a little
  less), not both forelegs flung straight out.
- Umbra's hair models are the mascot pair and her mascot: `model-umbra-faces` is
  the older hooded shadow-Umbra, and her fringe came back its pale plume.
- Aurora's first fifth-round head strip came back with each mood's NAME
  lettered under it, and the slice carried the words into the duel; her mane
  came back with a pony ear in it. Both prompts now say so in their checks.

**Sixth round (owner): the fringe "is just put over the horn and does not look
good", and "the body has a significantly brighter color and does not match the
legs":**

- **The fringe is two pieces with the horn between them**, as the portraits
  paint it: `backlock` (a new tenth piece) behind the horn, over the far ear's
  root, falling to the right; `forelock` over the horn's root, sweeping LEFT
  over the near brow — the first painted fringe swept right, the wrong way.
- **The coat pieces are carried onto the BODY's coat before anything else**
  (`puppetBake`'s `COAT_OF_BODY`: leg, neck): the body re-painted brighter than
  the legs. A per-channel gain onto the body's measured coat colour.
- **A gain only for a change of LIGHT**, not of hue: Umbra's violet set gained
  onto Briar's bark turned her painting's lilac highlights hot orange. Across
  a hue the recolour is the light-only transfer.
- **A recoloured head keeps its FEATURES by where they are, not by colour**:
  the three-quarter head's painted shade is the blush's own peach, so the
  colour test left a peach patch on every recoloured head. `puppet.ts` draws a
  mask of the eyes, blushes, mouth, nostril and inner ears off the reference's
  layout (the painter follows it); inside it the strict colour test, outside
  it the coat's shade counts as coat.

**Seventh round (owner, 2026-09-26): "the newly painted rig has a somewhat
dull looking face", with a painted unicorn portrait he calls "super cute and
fairy tale like" — "make the face look more like the reference".** Both head
strips were near-exact TRACES of their stand-in: an even dark ring round a
flat cream ball, flat disc eyes, no painted light.

- **The owner's portrait is the head's image 1** (`painted/model-aurora-cute`),
  the mascot pair image 2 (the three-quarter view and each one's colours;
  Umbra takes image 1's drawing of a face and image 2's colours). It is keyed
  onto magenta by a hand-traced polygon: its painted line breaks too often for
  a flood bounded by ink. **Cut it at the jaw** — the first strip painted
  against the bust hung a neck and a chest under every head.
- **The stand-in is a pony's head, not a ball**: the muzzle comes well out of
  the skull, tipped down to the chin, with a jaw joining them (`MUZZLE`, `JAW`
  in `puppet.ts`); the eyes show a white, an iris darker at the top, and lashes
  flicking out at the outer corner; the stand-in is shaded (key light, form
  shadow, soft blushes, a line that fades on the lit edge), so a trace of it is
  already soft.
- **Calm is not blank.** The style block says "a blank, neutral or vacant face
  is a failed drawing" and the calm panel asked for neutral: a painter told both
  splits the difference. Panel 1 is "calm, sweet and bright-eyed" now.
- **Capitalised panel names were lettered under the heads AGAIN** ("CALM, SWEET
  BRIGHT-EYED", "A BLINK", "OUCH", "DIZZY" — the one uncapitalised name, the
  cheer, was not). Every panel line starts in lower case now.
- **"Follow its outline closely … the SAME shape" is an order to trace.** Two
  more strips came back stroke for stroke. The dialogue portraits, painted
  from a far cruder stand-in with no such order, are the look the owner
  wants. The slicer fits a head's size and place by itself, so the head's brief
  takes only the stand-in's LAYOUT (skull, ears, muzzle, where each eye sits)
  and says to draw the head the way image 1 is drawn.
- **Two desks share one Gemini window.** Another project's desk generating at
  the same time breaks the download step ("the image is on screen but could not
  be downloaded"): start a job only while the other desk's `/api/state` shows
  no `auto.current`.
- **Words never beat it: five head strips in a row were traces**, the last two
  under "draw it yourself" and "this is not an edit". Gemini's image model
  RETOUCHES the last attached image. So the head that shipped is an EDIT OF THE
  OWNER'S PORTRAIT, outside the desk: (1) the portrait (keyed, cut at the jaw)
  → "take away all hair and the horn, the skull small and round just behind
  the ears' bases, both ears kept exactly where they stand, mouth closed,
  nothing below the jaw, flat magenta"; (2) blink / cheer / ouch / dizzy as
  edits of THAT result ("change ONLY her eyes…") — each lands within a pixel
  of the calm head; (3) Umbra = the calm head RECOLOURED (the mascot pair as
  colour source), her four moods edited from her own calm head, so no mood
  drifts in colour from another (she blinks often); (4) the five heads laid
  into the stand-in's panels with one shared transform and sliced as usual.
  The neck stub the edit left was trimmed by hand (a lineless cut is right
  there: the head lies over the neck piece). The stand-in's eyes, blushes,
  nostril and mouth were then moved to where the painting has them — the
  recolour's feature mask is drawn from them (Pearl and Echo checked). Prompts,
  intermediate heads and the scripts (`free-job.mjs`: one polite Gemini job
  through the desk's own driver, announcing itself on 127.0.0.1:5189 so other
  desks wait; `compose-strip.cjs`) are in `art-sheets/puppet-head-edits/`.
  **A desk re-roll of `duelist-*-head` would trace the stand-in again** — redo
  it this way instead.
- **Then (owner): "the face looks better now, only the rest of the body needs
  to match the face art style. Also the hair is cut off by the new head …
  instead of partially painted over the back of the head like in the
  reference logo."** The painted mane is drawn AFTER the head now (`chars.ts`;
  worn neck items end up under it, as under real hair), and its stand-in is
  three tapering wavy locks from the poll over the back of the skull, clear
  of the near ear and the face (`MANE_LOCKS`). The hair pieces' model is the
  owner's portrait WITH its mane (`painted/model-aurora-bust`, the logo's soft
  wavy locks) and their stand-ins' line is half as heavy (`HAIR_INK`). The
  code-drawn leg and hoof outline is the head's weight now (`LEG_LINE` 1,
  laid at 0.8 alpha). STILL TO PAINT when the shared Gemini account's limit
  resets: the eight hair pieces through the desk (`run-hair.sh`) and the ten
  body pieces as restyle EDITS of their current paintings with the new head
  as the style sample (`run-restyle.sh`, `pb-restyle-*.txt`) — both in
  `art-sheets/puppet-head-edits/`. Until then the old curly mane lies over the
  head in its new place and reads fine; the torso keeps its heavy line.
- **Owner, same afternoon:** "the forehead hair part looks weird" (logo crop),
  "make the tail match the logo style", "the back side of the head does not
  need a bold stroke as the hair is covering it", "the head hair is behind the
  ear, but in front of the face and body". So: every hair stand-in's lock now
  TAPERS to a point and is drawn smooth through its samples' midpoints
  (`lockPath`, `taperedMass`) — `hairMass`'s blunt ends and 12 straight
  facets had been painted as cards with notched square ends; the fringe halves
  are the logo's two sweeps; the tail keeps the rig's own shape as one flat
  silhouette with pointier tips, on the hair model. The head paintings' outline
  along the back of the skull was painted out (the first 14 px of each row from
  below the ear to the jaw take the coat just inside, `unline-back.cjs`). The
  NEAR EAR is laid again over the mane (`paintNearEar`: the head's painting
  clipped to the ear, traced off the painted frame a half unit outside its
  line), so the mane can rise behind it with a crown lock — a clip that
  reached below the ear's base laid a patch of skull over the hair.
- **Painted the same evening** on a second Google account (the first was
  capped until 19:59): all eight hair pieces through the desk (Umbra's mane
  re-rolled once — the first came back as stiff pointed blades), and torso,
  neck, leg and horn for both as restyle EDITS of their own paintings with the
  new calm head as the style sample (`run-all.sh`). The two hoof restyles were
  REJECTED and the old hooves kept: the edit turned the hoof into a coat-
  coloured trapezoid (the gold cuff gone). All sixteen new webps measure
  ≤ 0.08 % magenta. Umbra's restyled torso came back a touch warmer (mauve)
  than her head; it reads fine in the rig, so it stays.
- Gemini traps met on the way: an edit of an edit drifts (the second reshape
  sliced the skull off flat and floated the ears — go back to the original);
  a `<` in a prompt makes the prompt box refuse the message three times out of
  three; the window was found on **Flash-Lite**, which refused attachments —
  switch it back to Flash before blaming the job.

Not done, worth a look: intro pages 1–3 still show the vector rig's Aurora
painted into them; page 4 and the mascot are the chibi.

### 2026-09-25 — the VS preview family (`preview`, PROMPTS-PREVIEW.md)

The five-second VS screen before every duel (story-spec §8.38) got eight
sheets, all painted the same night: 13 generations, 71 kB, ~55 kB of it in a
fresh save's splash hold. `vs-ribbon-aurora` / `-foe`, `vs-emblem`,
`vs-crown` (`worldUi`, DOM); `vs-backdrop-land` / `-port` (`page`);
`vs-podium-dawn` / `-night` (`island`). Paid for, each with a return:

- **A name in capitals in the brief is lettered into the picture.** The first
  portrait backdrop came back with "THE FRIENDLY NIGHT" and "AURORA'S DAWN"
  written across the sky — the brief had named its two halves that way. Name a
  region by what it looks like, never by a title.
- **A backdrop that is STRETCHED to the screen may hold nothing round.** The
  preview lays its painting over the whole viewport (the seam must stay where
  the layout puts it), up to ~25 % off its aspect on phones, so the moon moved
  out of the painting and is drawn live (`paintPreviewMoon`); the painting is
  soft sky, clouds and tiny stars only.
- **Clouds and cloud pedestals: take the line off the REFERENCE**, not just
  out of the words — the podiums came back as outlined shiny balls on a dish
  until the reference lost its outline and per-puff highlights (the
  interior-ink lesson again).
- **A DOM 9-slice ribbon paints a plain middle, so the CSS keeps the detail
  that must not stretch** — the running stitch is drawn over the painting.
- The medallion is the one `ItemSheet.exact` outside the brand pair (384 px):
  the screen's centrepiece, 160–215 device px per radius, which the 256 px cap
  would have upscaled 1.4–1.9×.

## 2026-09-25 — the traced pictograms and props, re-rolled

The owner read chapter 4's crystal pictogram as "not painted yet": it was
painted, but as a TRACE of its flat reference (paint-outstanding.md §0.1). 27
generations re-rolled the four pictogram sets, the flower head, the coconuts
and fifteen more props; the results, what is still open and every lesson are
in paint-outstanding.md §0.1 "RE-ROLLED 2026-09-25".

**New in the pipeline, for the next traced sheet:**
- `ItemSheet.refInk` — the bench thins that sheet's reference ink
  (`kit.setRefInk`, the creatures' mechanism), and the prompt then carries
  `OBJECT_NOT_A_STICKER`. `ItemSheet.also` now reaches item and prop headings
  (`TRACE_FINISH_REFS`: the snowball and gold star as FINISH references).
- `ItemSheet.rows` — a set painted as a grid (the pictograms: 2 rows of 3 on
  16:9). The bench, the prompt and the slicer understand it; the slicer still
  writes ONE strip, so nothing in the game changed. One-row sheets cut
  byte-identical to before (checked on a single, a 3-strip and a 6-strip).
  `ItemSheet.maxEdge` keeps a bigger-painted set's frames at the size it
  shipped at.
- **The words that bought flat icons were the brief's own**: "PICTOGRAMS",
  "signs, not characters". Briefed as small painted OBJECTS, the same sheet
  came back painted.

## 2026-09-26 — the rest of the traces, three runes, 5-4

16 generations: the gift box, boss chest, tent, pet firefly, phone, Frost Lock
emblem, two shelf badges and the vane came back painted; the lightning,
illusion and rainbow runes lost their faults (each named as its own check,
`RUNE_FIX`); the wind ward failed again and kept its old painting; 5-4's
flat patch was REPAIRED in the shipped painting after two re-rolls came back
less faithful. Details and lessons: paint-outstanding.md §0.1 "SECOND PASS".
New in the pipeline: `artDraw.thinStrokes` — `ItemSheet.refInk` now thins a
drawing that strokes its own lines, not only one that inks through the kit.
