/**
 * artStyle.ts — THE art-style decision, as data (art-style.md §0).
 *
 * Every prompt the painter is ever sent is built from `ACTIVE_STYLE`: the
 * manifest (`artSheet.ts`) takes its style blocks from here and nowhere else,
 * so the look of the whole game is one object, not a phrase copied into a
 * hundred prompts that drift apart.
 *
 * Changing the style later is deliberate and cheap:
 *   1. add a new profile below with a NEW `id` (never edit a shipped one:
 *      its id is stamped on every painting made under it);
 *   2. point `ACTIVE_STYLE_ID` at it, and record the decision in
 *      art-style.md §0 (keep the old one there as history);
 *   3. `pnpm art:prompts` — the prompts are rewritten, and PAINT-STATUS.md
 *      (and the Art Desk) mark every painting made under the old id as
 *      "REPAINT — the art style changed";
 *   4. repaint. The procedural drawings stand in for anything not yet redone.
 *
 * What a profile does NOT decide, because the game's contracts depend on it:
 * the magenta ground, the layouts and sizes, the neutral colour-me regions,
 * "no text in a picture". Those live in the prompt builders.
 *
 * Pure data: loaded by the game-free Node tools too.
 */
export interface ArtStyle {
  /** Stamped on every painting's slice receipt. A new id means "repaint". */
  id: string
  /** Human name, for documents. */
  name: string
  /** When it was decided (ISO date), and by whom. */
  decided: string
  /** Who the look is made for — the brief's first line. */
  audience: string
  /** One sentence: the style's identity. Leads every style block. */
  headline: string
  /**
   * The two or three rules that decide whether a return is usable at all,
   * stated as their OWN block near the TOP of every prompt rather than as
   * style bullets in the middle.
   *
   * A painter reaching for a default look reads an adjective as flavour and
   * its habit as the colour lines are: three returns in a row came back as
   * even-stroked vector stickers while obeying every bullet they were given.
   * What works is an exact instruction, a named substitute for the habit, and
   * a consequence.
   */
  lead: readonly string[]
  /** Rules for every drawable. */
  core: readonly string[]
  /** Extra rules for characters (portraits, story panels). */
  character: readonly string[]
  /** Extra rules for full-bleed scenes (sectors, story panels). */
  scene: readonly string[]
  /** What earlier attempts got wrong — prohibitions beat adjectives. */
  avoid: readonly string[]
}

export const ART_STYLES: Readonly<Record<string, ArtStyle>> = {
  /**
   * The shipped style (owner, 2026-09-20). v1's returns were faithful and
   * clean and looked MACHINE-MADE: an even plum stroke traced round every
   * shape, flat fills under a hard cel mask, canopies that were circles and
   * hills that were arcs. v1 asked for exactly that — "ONE clean outline
   * around every shape", "if the outline has thinned to a hairline it is
   * several times too thin" — so the painter was obeying it.
   *
   * v2 moves the weight off the outline and onto drawn shape and painted
   * colour, and makes the expression a hard requirement rather than a mood.
   */
  'cozy-handdrawn-v2': {
    id: 'cozy-handdrawn-v2',
    name: 'Cozy hand-drawn storybook',
    decided: '2026-09-20 (owner)',
    audience:
      'a cozy unicorn fantasy for everyone, made especially appealing to girls aged 3–12 — never a babyish "kids only" look, and nothing a 3-year-old could find scary',
    headline:
      'A cosy, cute, HAND-DRAWN storybook illustration — a page from a picture book drawn and painted by a person, with soft varied brush lines, gently painted colour, and chibi anime characters.',
    lead: [
      '1. IT MUST LOOK HAND-DRAWN, NOT MADE OF VECTOR SHAPES. This is the whole brief. Soft brush lines that vary in weight, colour with gentle variation across it, and shapes with the small irregularities a hand makes. If your picture looks like clean flat vector clip-art — even beautiful clip-art — it is wrong.',
      '2. DO NOT PUT AN EVEN OUTLINE AROUND EVERYTHING. That single habit is what makes a picture look machine-made. The line is a soft, drawn accent in warm deep plum #3A2340 (never black), thicker where forms overlap or turn from the light and TAPERING AWAY TO NOTHING at the ends — and small things (flowers, pebbles, grass, sparkles, distant trees) get NO line at all, only their shape.',
      '3. PAINT THE COLOUR, DO NOT FILL IT. Each shape carries soft variation across it and a soft-edged shadow that follows the form, warm where light bounces back in. No flat single-tone fill under a hard-edged cel mask.'
    ],
    core: [
      '· LINE: a soft brush line in warm deep plum (#3A2340), never black, and never the same width twice — it swells a little where two forms meet or a form turns away, and thins to nothing where the light falls on an edge. It is allowed to lift and break. Most of the picture is held together by shape and colour, not by outline.',
      '· COLOUR: gently painted, like gouache or soft watercolour. Edges between colours are soft, not hard mask edges. One quiet highlight where the light lands. Key light warm, from the top left.',
      '· SHAPES ARE DRAWN BY HAND, so nothing is geometrically perfect: a hill is not an arc, a tree canopy is not a circle, the edge of a path wobbles, and no two clouds are the same cloud. That slight irregularity IS the hand-drawn look.',
      '· A faint paper or gouache softness through the picture is welcome. No grunge, no photographic texture, no visible noise.',
      '· Rounded, friendly forms. Nothing sharp, spiky, scary or broken. Soft colour for things, saturated colour kept for magic and glows.',
      '· AN OBJECT WITH NO FACE IS NOT AN EXCEPTION TO ANY OF THIS. A tent, a sponge, a box or a bridge is drawn and painted to exactly the same standard as a character.'
    ],
    character: [
      '· CHIBI ANIME DESIGN: a big round head about as wide as the body, a small compact body, short sturdy legs with little rounded hooves.',
      '· ANIME EYES, large and glossy, filling about a third of the face: a big coloured iris, ONE large and one small white catch-light, a soft coloured lower lid, two or three lashes on the upper lid only.',
      '· A small rounded muzzle, a dot nostril, a tiny expressive mouth, soft blush ovals on the cheeks.',
      '· A slightly oversized spiral horn, never sharp enough to read as a weapon. Mane and tail in a few large soft locks, never many thin strands.',
      '· THE EXPRESSION IS THE POINT, and it must be unmistakable at a glance: big, warm, anime-readable joy, worry, determination or delight, in the eyes AND the brows AND the mouth together. A blank, neutral or vacant face is a failed drawing however well it is painted.',
      '· Though the line stays light elsewhere, keep enough of it around a character\'s own silhouette that she still reads clearly at thumbnail size — a portrait is shown about the size of a coin.'
    ],
    scene: [
      '· Depth through soft colour: far hills and the sky behind them go lighter, cooler and hazier, with little or no line. Everything from the mid-ground forward keeps its full warm colour.',
      '· Cosy and magical: warm light, soft clouds, drifting sparkles and petals. Gloomy is allowed (dust, dusk), scary never.'
    ],
    avoid: [
      'a uniform-width outline traced around every shape (the sticker or vector clip-art look)',
      'heavy black or near-black outlines',
      'shapes built from perfect circles, arcs and straight lines',
      'flat single-tone fills under a hard-edged cel shadow mask',
      'a blank, neutral or vacant facial expression',
      'sketch lines, doubled or broken construction lines, crosshatching',
      'photographic or grunge texture, visible noise',
      'airbrushed gradients across a whole object, lens flare',
      'realistic horse anatomy',
      'a western-cartoon or 3D-render look'
    ]
  },

  'cozy-chibi-v1': {
    id: 'cozy-chibi-v1',
    name: 'Cozy chibi picture-book',
    decided: '2026-09-19 (owner)',
    audience:
      'a cozy unicorn fantasy for everyone, made especially appealing to girls aged 3–12 — never a babyish "kids only" look, and nothing a 3-year-old could find scary',
    headline:
      'Cute, cozy chibi anime-style picture-book illustration: big heads, huge sparkly eyes, rounded friendly shapes, soft pastel colours and warm magical glows.',
    // Superseded by cozy-handdrawn-v2. Kept verbatim so a painting stamped
    // v1 can be read back against the brief it was actually made under.
    lead: [
      '1. NO BLACK LINES ANYWHERE. Do not outline with #000000 or any near-black grey. EVERY outline is warm deep plum #3A2340 — a dark purple-brown you can see the purple in. Wherever your habit reaches for black, put #3A2340 instead. A return with black outlines is unusable however well it is painted.',
      '2. NO FLAT SINGLE-COLOUR FILLS. Every shape gets its base tone AND one clean cel shadow shape about 15–20% darker and shifted toward violet, on the side away from the top-left light, plus one small soft near-white highlight on round forms. Two tones and a highlight, every time — not a gradient, not an airbrush, and never one flat colour on its own.'
    ],
    core: [
      '· ONE clean, confident, soft outline around every shape, in warm deep plum (#3A2340), never black. At its heaviest it is about 1% of the subject\'s height — the weight of a soft brush pen, not of a technical pen — slightly heavier on the shadow side, round at every end. Hold the finished picture at thumbnail size: if the outline has thinned to a hairline there, it is several times too thin.',
      '· Flat cel colour: one base tone and ONE soft shadow tone per shape (15–20% darker, shifted a little toward violet), laid in as a clean shape that follows the form. One small soft near-white highlight on round forms, top left. Key light from the top left.',
      '· Rounded, friendly shapes and soft corners. Nothing sharp, spiky, scary or broken. Pastel colours for things, saturated colour only for magic and glows.',
      '· AN OBJECT WITH NO FACE IS NOT AN EXCEPTION TO ANY OF THIS. A tent, a sponge, a box or a bridge is painted to exactly the same standard as a character: the same plum ink, the same cel shadow, the same highlight.'
    ],
    character: [
      '· CHIBI PROPORTIONS: the head is huge (as wide as the body), the body compact, the legs short and sturdy with rounded hooves.',
      '· EYES fill about a third of the face: a large glossy iris with ONE big and ONE small white catch-light, a soft coloured lower lid, two or three simple lashes on the upper lid only.',
      '· A small rounded muzzle, a dot nostril, a tiny mouth; soft pink blush ovals on the cheeks.',
      '· A slightly oversized horn with two or three spiral bands, never sharp enough to read as a weapon. A mane and tail of a few large, soft locks, not many thin strands.',
      '· Expressions are big and readable, anime-style: joy, surprise, determination, a shy blush. Rivals are cheeky, never evil; nobody looks hurt or angry.'
    ],
    scene: [
      '· Painterly soft gradients are allowed in the SKY and in distant layers only; mid-ground and foreground things follow the outline-and-cel rules. Far layers are lighter and bluer, with no outline or a very light one.',
      '· Cozy and magical: floating sparkles, soft clouds, warm light. Gloomy is allowed (dust, dusk), scary never.'
    ],
    avoid: [
      'sketch lines', 'doubled or broken outlines', 'crosshatching', 'texture brushes', 'photographic texture',
      'airbrushed gradients across a whole object', 'lens flare', 'a thin pale hairline outline',
      'clip-art flatness with no shadow tone', 'realistic horse anatomy', 'a western-cartoon or 3D-render look'
    ]
  }
}

/** The style every prompt is written in. See the header before changing it. */
export const ACTIVE_STYLE_ID = 'cozy-handdrawn-v2'

export const ACTIVE_STYLE: ArtStyle = ART_STYLES[ACTIVE_STYLE_ID]!
