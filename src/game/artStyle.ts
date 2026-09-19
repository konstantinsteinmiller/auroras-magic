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
  'cozy-chibi-v1': {
    id: 'cozy-chibi-v1',
    name: 'Cozy chibi picture-book',
    decided: '2026-09-19 (owner)',
    audience:
      'a cozy unicorn fantasy for everyone, made especially appealing to girls aged 3–12 — never a babyish "kids only" look, and nothing a 3-year-old could find scary',
    headline:
      'Cute, cozy chibi anime-style picture-book illustration: big heads, huge sparkly eyes, rounded friendly shapes, soft pastel colours and warm magical glows.',
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
export const ACTIVE_STYLE_ID = 'cozy-chibi-v1'

export const ACTIVE_STYLE: ArtStyle = ART_STYLES[ACTIVE_STYLE_ID]!
