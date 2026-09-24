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
| The book COVER / binding | `drawSpine` (`pageTurn.ts`) + the purple surround | 2 sheets |
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
own.

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
  them — the hollow behind it, the bark in front.
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
6. **The CLOTH is painted on the map and drawn everywhere else** — audited
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
