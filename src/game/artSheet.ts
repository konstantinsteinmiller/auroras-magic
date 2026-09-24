/**
 * artSheet.ts — the painted-art MANIFEST (story-spec §9.11–§9.12, S6; the
 * `art-generation-pipeline` skill): every drawable the painter can replace,
 * the reference sheet it is painted from, the file it lands in, and the
 * prompt that goes with it.
 *
 * Pure data and pure string-building: no canvas, no Vue, no `import.meta.env`,
 * so `pnpm art:prompts` renders the very same prompt documents under plain
 * Node as the bench (`/#/art-sheets`) does in a browser. The bench DRAWS the
 * references (it needs the game's painters); this module decides what exists
 * and what the painter is told.
 *
 * The families:
 *   • SECTORS (50) — opaque, full-bleed scenes: each sector's static painting,
 *     with its colour-me landmark left a neutral lilac-grey for the game to
 *     tint. One reference each, at the sector's own 1152 × 672.
 *   • ITEMS (8 + 7 keepsake badges) — magenta-keyed strips: one panel per
 *     state the drawing moves between (tied / untied, shut / open, eyes open /
 *     blink / grin).
 *   • RUNES (12) — magenta-keyed squares: the glyph as a painted emblem, in
 *     the 100-unit box `RuneGlyph.vue` draws it in.
 *   • STORY (4) — the first-launch intro's picture-book panels (§8.26):
 *     opaque scenes WITH the characters, painted from the character models.
 *   • PORTRAITS (20) — magenta-keyed strips, one per speaker: every
 *     expression the script gives them, side by side (§8.27).
 *   • ISLANDS (10) — magenta-keyed: the duel's floating island in each
 *     chapter's colours (§8.27).
 *   • PROPS (8) — magenta-keyed: the sectors' LIVE props, the ones a
 *     transform carries (§8.8). A particle system or a light is not one of
 *     them and never becomes a bitmap.
 *   • WARDROBE (3) — the Kiosk's room (§3.5.4): the inside of the tent,
 *     opaque and full-bleed, one picture per orientation, plus the keyed rug
 *     Aurora stands on — which moves with HER, not with the tent.
 *   • BRAND (2) — the game's own two pictures (art-style.md §11): the square MARK, opaque
 *     and full-bleed because it is an app icon, and the wide keyed MASCOT of
 *     Aurora and Umbra looking at each other. The only family nothing falls
 *     back to: a missing one leaves the splash without a mark, not a sector
 *     drawing itself.
 */
import { artTarget, type ArtKind } from '@/game/artFolders'
import {
  SECTOR_SLUGS, sectorArtId, RUNE_SLUGS, runeArtId, ITEM_ART, type ItemName,
  STORY_PANELS, storyPanelId, PORTRAIT_SETS, portraitArtId, ISLAND_SLUGS, islandArtId,
  KEEPSAKE_ICON_SLUGS, keepsakeArtId, pageArtId, frontPageArtId, PROP_ART,
  wardrobeArtId, WARDROBE_FLOOR, WARDROBE_RUG, BRAND_LOGO, BRAND_MASCOT,
  BRAND_LOGO_SIDE, BRAND_MASCOT_H, CREATURE_ART, RIG_ART, MOVIE_ICON, HP_FRAMES, type PortraitEmote, type PropName, type CreatureName, type RigPart
} from '@/game/artIds'
import { ACTIVE_STYLE } from '@/game/artStyle'
import { CHROME_ART, PICTO_SETS, pictoSetArtId, type ChromeName } from '@/game/artIds'

/** The art style every prompt is written in (`artStyle.ts`, art-style.md §0).
 *  Stamped on the sheet index, and by the slicer on every painting it cuts. */
export const ART_STYLE_ID = ACTIVE_STYLE.id

/* ─────────────────────────────────────────────────────────── geometry ── */

/** A sector reference is the sector itself, at its own size. */
export const SECTOR_REF = { w: 1152, h: 672 } as const
/** The map's thumbnail of it, cut from the same painting. */
export const SECTOR_THUMB = { w: 384, h: 224 } as const

/**
 * An item sheet's canvas. Every size is an aspect an image model actually
 * returns — a square, or 16:9 — because a return re-composed to another
 * aspect cannot be cut: one panel is 1:1, two or three share a 16:9 sheet.
 */
export const itemSheetSize = (frames: number): { w: number; h: number; panelW: number; panelH: number } =>
  frames <= 1
    ? { w: 768, h: 768, panelW: 768, panelH: 768 }
    : { w: 1536, h: 864, panelW: Math.floor(1536 / frames), panelH: 864 }

/** How much of its panel an item's BOX fills, on its tighter axis. The rest
 *  is air, so a painted edge or a glint is never cut off by the panel. */
export const ITEM_FILL = 0.72

/** The tallest a sliced item frame is written (the pipeline's default cap). */
export const ITEM_MAX_EDGE = 256

/** The neutral the colour-me regions are drawn in (`artTint.NEUTRAL.base`). */
export const NEUTRAL_HEX = '#e8e4ee'

/* ─────────────────────────────────────────────────────────── sectors ── */

const CHAPTERS = [
  { name: 'Whispering Woods', mood: 'a gentle storybook forest: mossy greens, warm dappled light, soft wildflowers' },
  { name: 'Bubble Bay', mood: 'a sunny seaside: sea blues and turquoise, sandy cream, coral pinks' },
  { name: 'Cloud Kingdom', mood: 'a kingdom in the sky: soft sky blues, fluffy cumulus whites, pastel sunshine' },
  { name: 'Crystal Caves', mood: 'a cosy cave: deep violet shadows lit by glowing crystals and mushrooms in teal, pink and gold' },
  { name: 'Mirror Mountains', mood: 'calm silver-lilac mountains over still, mirror-like water' },
  { name: 'Rainbow Ridge', mood: 'sunny green ridges full of clean, bright rainbow colours' },
  { name: 'Sunken Sands', mood: 'a warm desert: apricot and honey dunes, turquoise oasis water, clear skies' },
  { name: 'Twilight Tundra', mood: 'a snowy land at twilight: snow whites, icy blues, soft violet dusk' },
  { name: 'Starlight Summit', mood: 'a mountaintop at night: indigo sky, starlight gold, moonlit silver' },
  { name: 'Friendship Festival', mood: 'a joyful fair: warm lantern light, pastel bunting, festive candy colours' }
] as const

/** Each sector's title and the landmark the child colours in (§8.7). */
const SECTOR_INFO: readonly (readonly [string, string])[] = [
  ['Cottage Meadow', "the cottage's roof"],
  ['Brook Bridge', 'the little bridge over the brook'],
  ['Flower Garden', 'the big flower bed in the middle'],
  ['Treehouse Hollow', 'the treehouse'],
  ["Briar's Grove", 'the great tree and the bramble arch'],
  ['Seashell Beach', 'the beach hut'],
  ['Lighthouse Point', 'the lighthouse'],
  ['Coral Cove', 'the coral garden on its rock'],
  ['Harbour Jetty', "the big sailboat's sails"],
  ["Pearl's Lagoon", 'the giant clam shell'],
  ['Balloon Meadow', 'the hot-air balloon'],
  ['Rainbow Bridge', 'the dome cottage'],
  ['Pegasus Stables', 'the stable'],
  ['Wind-Vane Tower', 'the wind-vane tower'],
  ["Zephyr's Sky Castle", 'the sky castle'],
  ['Glowshroom Grotto', 'the three giant mushrooms'],
  ['Crystal Lake', 'the big crystal cluster on the point, and its reflection'],
  ['Gem Mine', 'the mine entrance'],
  ['Lantern Bridge', 'the covered bridge house'],
  ["Terra's Geode Hall", 'the great geode'],
  ['Mirror Lake Meadow', 'the gazebo, and its reflection'],
  ['Echo Valley', 'the chalet'],
  ['Hall of Mirrors', "the great mirror's frame"],
  ['Silver Peak Pass', 'the lookout station'],
  ["Echo's Mirror Palace", 'the palace, and its reflection'],
  ['Rainbow Falls', 'the giant lotus flower'],
  ['Paint-Pot Village', 'the big paint-pot house in front'],
  ['Prism Garden', 'the garden prism'],
  ['Kite Cliffs', 'the kite pavilion'],
  ["Prism's Rainbow Bridge", 'the prism bridge'],
  ['Oasis Camp', 'the big tent'],
  ['Sandfall Cliffs', 'the dome house'],
  ['Sundial Plaza', 'the sundial'],
  ['Caravan Market', "the market stalls' awnings"],
  ["Ember's Hourglass Temple", 'the hourglass temple'],
  ['Snowy Village', 'the igloo'],
  ['Frozen Lake', 'the skating hut'],
  ['Aurora Grove', 'the aurora tree'],
  ['Sled Hill', 'the chalet'],
  ["Glace's Ice Palace", 'the ice palace'],
  ['Lantern Path', 'the great lantern'],
  ['Observatory', 'the observatory'],
  ['Star Garden', 'the giant star lily'],
  ['Moon Bridge', 'the moon bridge, and its reflection'],
  ["Nova's Starlight Throne", 'the starlight throne'],
  ['Festival Gate', 'the welcome arch'],
  ['Carousel Square', 'the carousel'],
  ['Lantern Market', 'the three market stalls'],
  ['Ferris Wheel Hill', "the Ferris wheel's frame"],
  ['The Festival Stage', 'the stage pavilion']
]

/**
 * The paint every other scene is matched to (owner-approved style).
 *
 * The first five sectors came back cooler, bluer and flatter than the intro
 * page of the very same meadow, which a player sees minutes apart. Words
 * cannot close that gap — "warm", "soft" and "painterly" are what produced
 * both — so an approved sample is attached to every scene prompt.
 *
 * IT IS A SWATCH, NOT A PICTURE (2026-09-21). It was the approved intro page
 * itself, fenced with increasingly stern words, and the fence kept failing the
 * same way: a beach came back with the cottage meadow's lily pond and frog, a
 * lagoon with its log and mushrooms, several sectors with its unicorn standing
 * in them. A painter shown a picture of a world puts that world's things in
 * yours, however firmly it is told not to.
 *
 * So the anchor is four patches of pure paint cut from that approved page —
 * sky, hazy hill, sunlit grass, meadow — with no whole object in it and no
 * ink line (checked: nothing darker than luminance 93). There is nothing left
 * to steal. The crop that builds it is recorded in art-roadmap.md.
 */
const STYLE_ANCHOR = 'painted/style-anchor.png'

export interface SectorSheet {
  node: number
  /** The drop-in's file name (`sectorArtId`). */
  id: string
  title: string
  chapter: number
  boss: boolean
  landmark: string
  /** The reference's stem in `art-sheets/`. */
  file: string
  target: string
  thumb: string
  /** Attached before the reference: the approved look to match. */
  also: readonly string[]
}

export const SECTOR_SHEETS: readonly SectorSheet[] = SECTOR_SLUGS.map((_, n) => {
  const id = sectorArtId(n)
  const [title, landmark] = SECTOR_INFO[n]!
  return {
    node: n, id, title, landmark,
    chapter: Math.floor(n / 5) + 1,
    boss: n % 5 === 4,
    file: `sector-${id}`,
    target: artTarget('sector', id),
    thumb: artTarget('sectorThumb', id),
    also: [STYLE_ANCHOR]
  }
})

/* ───────────────────────────────────────────────────── items and runes ── */

export interface ItemSheet {
  name: ItemName | `rune:${number}` | `portrait:${string}` | `island:${number}` | `keepsake:${string}` | `worldUi:${string}` | `prop:${PropName}` | `creature:${CreatureName}` | `rig:${RigPart}` | `wardrobe:${string}` | `brand:${string}`
  kind: ArtKind
  id: string
  title: string
  frames: number
  /** What each panel is — the READ THE PANELS clause (multi-panel only). */
  panels: readonly string[]
  /** WHAT IT IS: only what the reference draws. */
  blurb: string
  /** Colour identity: the hues, not the swatches. */
  colour: string
  /** A region the game colours in: the phrase for it, or none. */
  tinted?: string
  /** What its outline hangs from: a gift stands on the ground, a brush is
   *  held by its tip, an island is stood ON. The slicer anchors a return by
   *  it. */
  anchor: 'feet' | 'centre' | 'top'
  /** Its facing, when it has one. */
  facing?: string
  file: string
  target: string
  /** What it is called in the prompt's consistency lines: 'object' unless
   *  it is a character or a place. */
  noun?: string
  /** Replaces the default WHAT IT IS NOT bullets. */
  not?: readonly string[]
  /** Replaces the default flat, square-on THE VIEW clause. */
  view?: string
  /** A character: the style block carries the character rules too. */
  character?: boolean
  /** A rule of its own, after the colour identity (an island's stage top). */
  keep?: string
  /**
   * The one drawable in ten whose OUTLINE encloses see-through gaps — a mill
   * wheel's spokes, with the brook painted behind them. Names them, and
   * replaces the magenta block's flat "no magenta inside the object", which
   * otherwise has the last word and gets the gaps filled in.
   */
  holes?: string
  /** Extra lines for the count-and-check list, after the shared ones. */
  checks?: readonly string[]
  /**
   * A canvas of this sheet's own, in place of `itemSheetSize(frames)`.
   *
   * The default sizes are the two aspects an image model reliably returns — a
   * square for one panel, 16:9 for a strip — and every drawable in the game is
   * happy in one of them. The mascot is not: it is a single panel of a WIDE
   * subject, and squeezing a pair of unicorns into a square spends two thirds
   * of the return on magenta and comes back at half the detail.
   */
  canvas?: { w: number; h: number }
  /**
   * Cut this sheet's frame at exactly this many px tall, ignoring the
   * slicer's 256 px cap and `--size`.
   *
   * The cap is a cap on SPRITE FRAMES — things the renderer blits at a
   * drawable's own size, dozens at a time, where 256 is generous and the
   * payload is the constraint. A sheet whose file is read at a fixed size by
   * something outside the renderer (the splash's `<img>`, the PWA manifest's
   * 512 icon) has a size it simply has to be, and lowering it there buys a few
   * kB for a visibly soft picture. Use it for those and nothing else.
   */
  exact?: number
  /** Images attached BEFORE the reference, in order (a character model, the
   *  style anchor) — the same list `SectorSheet.also` carries. */
  also?: readonly string[]
  /**
   * A SET, not a strip: every panel is a DIFFERENT drawable painted by one
   * hand in one generation (the dialogue pictograms, `artIds.PICTO_SETS`).
   * The slicer cuts it like any strip; the prompt must not say what a strip
   * says — "the same object at a different moment" — or six pictograms come
   * back as one pictogram six times.
   */
  set?: boolean
}

const item = (
  name: ItemName, title: string, frames: number, anchor: 'feet' | 'centre',
  blurb: string, colour: string, panels: readonly string[] = [], extra: Partial<ItemSheet> = {}
): ItemSheet => {
  const { kind, id } = ITEM_ART[name]
  return { name, kind, id, title, frames, anchor, blurb, colour, panels, file: `item-${id}`, target: artTarget(kind, id), ...extra }
}

/**
 * A keepsake WORN on Aurora (§9.7; the 2026-09-24 wardrobe pass): how big it
 * is on her, and the props' two paid-for rules — paint it boldly at the size
 * it is seen, and never lay a shadow on the magenta. It is laid over her
 * painted coat by the game, so it floats on nothing in its own picture.
 */
const wornKeep = (size: string, extra: readonly string[] = []): string => [
  `HOW BIG IT IS IN PLAY — ${size} It is worn by Aurora, a small round chibi unicorn, and has to read at a glance on her painted cream coat and on the painted scenery behind her.`,
  '· Paint it boldly and simply: a strong shape, strong clear colour, one soft highlight where the light lands (top left) and one soft shadow INSIDE its own outline where it turns away. Fine texture is invisible at that size and only turns it to mush.',
  '· THE SHADOW IS ON THE THING, NEVER UNDER IT: no cast shadow, no dark patch, no soft smudge beside or below it. The game lays it over her, and a shadow on the magenta ships as a pink stain stuck to it for ever.',
  // The reference's ink is thinned (`rig-accessories.WORN_REF_INK`): say so,
  // or the painter "restores" the line it expects — the creature lesson.
  '· THE LINE IN THE REFERENCE IS DELIBERATELY THIN. It shows where the shapes are; it is not a contour to ink in. Do not thicken it, and do not trace a line right round the outside.',
  ...extra
].join('\n')

/** A worn thing's facing: the game turns and mirrors it, the painter must not. */
const WORN_FACING = 'It faces exactly as the reference draws it — nothing flipped left to right, nothing turned upright. The game turns it, tilts it and mirrors it itself, so a painting drawn the other way round is backwards on her every time.'

/** The WHAT IT IS NOT of a thing she wears: the thing, and not her. */
const wornNot = (what: string, ...more: readonly string[]): readonly string[] => [
  `Draw ONLY ${what}, exactly as the reference shows it.`,
  '· NO unicorn, NO head, NO neck, NO body, NO hair or horn for it to sit on — the game lays it on her.',
  ...more,
  '· No text, letters or numbers.'
]

export const ITEM_SHEETS: readonly ItemSheet[] = [
  item('gift', 'Standard Gift', 2, 'feet',
    'A wrapped gift parcel with round, soft shoulders, in pink paper with a few pale polka dots, a ribbon crossing it both ways and a soft bow of two loops and two little tails on top.',
    'Pink wrapping paper with a slightly deeper pink shadow side, pale cream-pink dots.',
    [
      'Panel 1: tied. The bow sits up neat and round on top of the parcel.',
      'Panel 2: the bow has come loose. Its loops droop and sag, its tails slump down the sides — the instant before it opens. The parcel itself is exactly the same as in panel 1.'
    ],
    { tinted: 'the ribbon and the bow' }),
  item('boxGift', 'Magic Eraser gift', 2, 'feet',
    'A square cardboard gift box with softly rounded corners in cream card, a flat band running across its middle (it has NO bow), a folded triangular corner flap at its top right and a small gold star sticker on its front.',
    'Warm cream card with a peach shadow side; a butter-yellow flap and star.',
    [
      'Panel 1: shut. The corner flap lies folded down flat.',
      'Panel 2: the corner flap has lifted up and back, the box about to open. Everything else is exactly the same as in panel 1.'
    ],
    { tinted: 'the band across the middle' }),
  item('chest', 'Boss Chest', 2, 'feet',
    'A big, sturdy treasure chest of warm wood with a rounded lid, two gold straps running over the lid and down the front, a thin glowing seam where the lid meets the body, and a diamond-shaped clasp gem at the front of the seam.',
    'Honey-brown wood with a darker brown shadow side, butter-gold straps, a warm cream-yellow glow in the seam.',
    [
      'Panel 1: shut. The lid is closed and the seam glows softly.',
      'Panel 2: the lid has swung open, exactly as the reference draws it, the seam glowing bright. The body, the straps and the clasp are exactly the same as in panel 1.'
    ],
    { tinted: 'the clasp gem' }),
  item('sponge', 'Stardust Sponge', 1, 'centre',
    'A chunky, soft bath sponge lying flat: a butter-yellow rounded-block body with a few round pores, a pastel mint scrubbing layer along its top, and a small gold star printed on its front side. A cleaning sponge, not a brush.',
    'Butter-yellow sponge with a warm golden shadow side, pastel mint top layer, a pale gold star.',
    [], { facing: 'It lies level, exactly as the reference draws it: the game tilts and squishes it as it scrubs.' }),
  item('eraser', 'Magic Eraser', 1, 'centre',
    'A chunky rounded eraser block lying level, in soft pink rubber, with a white paper sleeve wrapped around its right half and a small gold star printed on the sleeve.',
    'Candy-pink rubber, a white sleeve with a soft lilac shadow, a butter-gold star.',
    [], { facing: 'It lies level, exactly as the reference draws it: the game turns it as it rubs.' }),
  item('tent', 'Wardrobe tent', 1, 'feet',
    'A little round-topped tent in pale pink with darker pink stripes running up to its peak, a purple arched door flap at the front, and a thin pole on the peak flying a small yellow pennant to the right.',
    'Pale candy-pink canvas with rose-pink stripes, a violet door flap, a butter-yellow pennant.'),
  item('crown', 'Flower Crown', 1, 'centre',
    'A gently arched band of green vine with two small leaves and four little round blossoms along it — pink, white, yellow and lilac, left to right. It is worn on a unicorn\'s head, but ONLY the crown is in the picture.',
    'Leaf greens; candy-pink, white, butter-yellow and lilac blossoms with golden centres.'),
  item('petStar', 'Pet Star', 3, 'centre',
    'A chubby five-pointed yellow star with a friendly face: two big glossy eyes with white catch-lights, soft pink blush cheeks and a small smile, and a soft highlight at its top left. A little companion, cute and round-pointed.',
    'Warm sunny yellow with a golden shadow side, pink cheeks.',
    [
      'Panel 1: eyes open — big, glossy, each with a white catch-light.',
      'Panel 2: a blink — both eyes closed as gentle downward curves.',
      'Panel 3: happy — both eyes squeezed into upturned crescents, grinning.',
      'The star itself — its outline, its points, its size, its cheeks and its smile — is IDENTICAL in all three. Only the eyes change.'
    ]),
  // ── The 2026-09-24 paint-outstanding pass (wardrobe): every keepsake that
  // is ONE shape a matrix carries on her rig (art-roadmap.md, that section).
  // Cords, the scarf's tails, the pearls and the trails' particles stay drawn.
  item('pegasusWing', 'Pegasus wing', 2, 'centre',
    'ONE soft, fluffy pegasus wing on its own, seen flat from the side: a rounded leading edge along its top, three big scalloped feather tips along its trailing edge in a band of soft colour, and two gentle feather partings across it. It is rooted at its lower RIGHT end — the point where it would join a back — and sweeps up and out to the LEFT. Only the one wing.',
    'See the panels: the same wing in two colourings.',
    [
      'Panel 1: the NEAR wing, in full light — creamy white feathers with candy-pink tips.',
      'Panel 2: the FAR wing, the one behind her — soft lilac feathers with violet tips.',
      'The wing is IDENTICAL in both — the same outline, the same three scallops, the same partings, the same size, rooted at the same spot in its panel. ONLY the colours change.'
    ],
    {
      noun: 'wing',
      facing: `${WORN_FACING} Its root stays at the lower right.`,
      not: wornNot('the one wing', '· NO second wing and NO pair — the game places the far wing and the near wing itself.', '· No sky, no clouds, no loose feathers, no sparkles.'),
      keep: wornKeep('the wing is about as tall as her head, spread from her back.'),
      checks: [
        '· One wing in each panel, never a pair, rooted at the lower right and sweeping up to the left.',
        '· Lay one panel over the other: the two outlines agree.'
      ]
    }),
  item('seashell', 'Necklace shell', 1, 'centre',
    'ONE little scallop seashell hanging from its hinge: a rounded fan-shaped shell with its narrow hinge point at the TOP and its wide, softly scalloped edge at the bottom, with three shallow ribs fanning down from the hinge as painted ridges. Only the shell.',
    'Keep the reference\'s pale neutral grey (see below): the game strings three of these on one cord, each in its own soft seashell colour. A pearly sheen along the rim.',
    [],
    {
      noun: 'shell',
      tinted: 'the whole shell, hinge to rim',
      view: 'THE VIEW: flat and square-on, hinge straight up and the fan hanging below it, exactly as the reference has it. The game turns it on its cord.',
      not: wornNot('the one shell', '· NO string, NO cord, NO pearls, NO other shells, NO sand, NO water.', '· The cord it hangs on is drawn by the game, bending with her neck — a painted one would hang the wrong way.'),
      keep: wornKeep('it is a small charm about the size of her eye, one of three on a cord round her neck.'),
      checks: ['· One shell, hinge at the top, and no cord anywhere.']
    }),
  item('scarfWrap', 'Winter scarf (the wrap)', 1, 'centre',
    'The wrapped part of a chunky knitted winter scarf, on its own: a short, fat, rounded roll of knitting lying level, cranberry red with two broad cream stripes across it and a soft knit rib along its middle, and a round knot bulging from it just below its right end, where the scarf is tied. Only the roll and its knot.',
    'Cranberry red and warm cream knitting, a deeper cranberry where the roll turns under.',
    [],
    {
      noun: 'scarf',
      facing: WORN_FACING,
      not: wornNot('the roll of scarf and its knot', '· NO hanging ends, NO tails, NO fringe or tassels anywhere. The two ends flutter in the wind and the game draws them itself, under this — painted ones would hang frozen beside the moving pair.'),
      keep: wornKeep('it is about as long as her neck is wide, wrapped low round her neck.'),
      checks: ['· No tail, end or fringe anywhere: just the roll and its round knot.']
    }),
  item('acornCap', 'Acorn Cap', 1, 'centre',
    'The cup of an acorn worn as a tiny hat, tilted jauntily down to the left: a brown felt half-dome with a woven cross-hatch texture over the dome, a flat darker-brown brim along its bottom edge, and a short curling stalk on top. Only the cap.',
    'Warm acorn browns: a hazelnut dome, a darker chestnut brim and stalk.',
    [],
    {
      noun: 'cap',
      facing: WORN_FACING,
      not: wornNot('the cap', '· NO acorn nut under it, NO leaves, NO oak twig.'),
      keep: wornKeep('it is about the size of her ear, perched on the back of her head.')
    }),
  item('starTiara', 'Star Tiara', 1, 'centre',
    'A slim silver tiara on its own: a gently arched silver band, lower at its left end, with three little pointed peaks rising from it — the middle one tallest — and a sky-blue five-pointed star with a tiny white gleam set just above the middle peak.',
    'Bright silver with a cool blue-grey shadow side; a clear sky-blue star.',
    [],
    {
      noun: 'tiara',
      facing: WORN_FACING,
      not: wornNot('the tiara', '· NO jewels and NO stars other than the one blue star.'),
      keep: wornKeep('it spans about the width of her forehead.')
    }),
  item('goggles', 'Explorer Goggles', 1, 'centre',
    'A pair of explorer goggles pushed up out of the way, on their own: a brown leather strap in a gentle arch with a small dark keeper loop near its left end, and two round brass-rimmed lenses of pale sky-blue glass sitting on the strap — the left lens a little bigger than the right — each with a white glint.',
    'Warm tan leather, polished brass rims, pale sky-blue glass.',
    [],
    {
      noun: 'goggles',
      facing: WORN_FACING,
      not: wornNot('the goggles and their strap', '· NO eyes behind the lenses and NO face — the lenses show only glass and a glint.'),
      keep: wornKeep('the strap spans about the width of her forehead.')
    }),
  item('bowTie', 'Bow Tie', 1, 'centre',
    'A neat navy-blue bow tie on its own: two plump pinched loops either side of a small round knot, and two short pointed tails hanging below the knot.',
    'Deep cornflower navy, brighter blue on the loops where the light lands.',
    [],
    {
      noun: 'bow tie',
      not: wornNot('the bow tie', '· NO collar, NO shirt, NO button, NO ribbon running off it.'),
      keep: wornKeep('it is about the size of her eye, at her throat.')
    }),
  item('moonPendant', 'Moon pendant', 1, 'centre',
    'A little silver crescent-moon charm on its own: a plump crescent with its round back on the LEFT and its two horns pointing to the RIGHT. Only the crescent.',
    'Moon silver-white with a cool pale-blue shadow side.',
    [],
    {
      noun: 'charm',
      facing: WORN_FACING,
      not: wornNot('the crescent', '· NO cord, NO chain, NO loop or ring on top, NO stars, NO face on the moon.', '· The game hangs it on a cord it draws itself, with two little stars beside it.'),
      keep: wornKeep('it is about the size of her eye, hanging at her chest.')
    }),
  item('butterflyWing', 'Butterfly wing', 2, 'centre',
    'ONE monarch-butterfly wing on its own, seen flat: a big rounded upper lobe and a smaller rounded lower lobe — clearly two lobes — both edged along their outer rims by a dark band with a row of small pale cream spots in it. It is rooted at its RIGHT end, where it would join a back, and spreads up and out to the LEFT. Only the one wing.',
    'See the panels: the same wing in two colourings.',
    [
      'Panel 1: the NEAR wing, in full light — bright apricot orange with a rich rust-brown edge.',
      'Panel 2: the FAR wing, the one behind her — a deeper burnt orange with a dark chestnut edge.',
      'The wing is IDENTICAL in both — the same two lobes, the same edging, the same spots, the same size, rooted at the same spot in its panel. ONLY the colours change.'
    ],
    {
      noun: 'wing',
      facing: `${WORN_FACING} Its root stays at the right.`,
      not: wornNot('the one wing', '· NO butterfly body, NO second wing and NO pair — the game places the far wing and the near wing itself.', '· No flowers, no sky, no sparkles.'),
      keep: wornKeep('the wing is about as tall as her head, spread from her back.'),
      checks: [
        '· One wing in each panel, never a pair or a whole butterfly.',
        '· Lay one panel over the other: the two outlines agree.'
      ]
    }),
  item('packBedroll', 'Explorer Pack (bedroll)', 1, 'centre',
    'A rolled-up sage-green bedroll on its own, lying nearly level: a fat rounded cylinder seen from the side, its two rolled ends showing as ovals at the left and right, and two brown ties wrapped round it.',
    'Soft sage green, a deeper green on the rolled ends, warm brown ties.',
    [],
    {
      noun: 'bedroll',
      facing: WORN_FACING,
      not: wornNot('the bedroll', '· NO bag, NO straps other than the two ties, NO blanket unrolled.'),
      keep: wornKeep('it is about as long as her head is wide, strapped across her back.')
    }),
  item('packSatchel', 'Explorer Pack (satchel)', 1, 'centre',
    'A small canvas satchel on its own: a soft rounded square bag in sandy beige with a darker flap across its top and a little gold buckle on the flap, and its brown leather strap rising from the top of the bag in a curve to the upper right. Only the bag and that one strap end.',
    'Sandy beige canvas, a toasted-brown flap and strap, a warm gold buckle.',
    [],
    {
      noun: 'satchel',
      facing: WORN_FACING,
      not: wornNot('the satchel and its strap', '· NOTHING hangs from it: NO lantern, NO hook, NO charm. The game hangs its own little lantern off the corner and swings it — a painted one would hang frozen beside the swinging one.', '· NO second strap, NO bedroll.'),
      keep: wornKeep('it is about the size of her head, on her side.')
    }),
  item('petCloud', 'Pet Cloud', 2, 'centre',
    'A small, sleepy, friendly rain cloud with a face: three soft rounded puffs on a flat base, the middle puff the biggest, with two little dark eyes and a small smile. A little companion, round and cute.',
    'Soft white with a pale blue-grey shadow along its base; dark plum eyes.',
    [
      'Panel 1: eyes open — two small round dark eyes.',
      'Panel 2: a blink — both eyes closed as short flat lines.',
      'The cloud itself — its puffs, its base, its size and its smile — is IDENTICAL in both. Only the eyes change.'
    ],
    {
      noun: 'cloud',
      not: [
        'Draw ONLY the cloud, exactly as the reference shows it.',
        '· NO rain, NO raindrops, NO lightning, NO sky, NO other clouds. The game lets its own little raindrops fall under it.',
        '· No text, letters or numbers.'
      ],
      keep: wornKeep('it is about the size of her head, floating beside her.', ['· It is soft: no hard line runs round its puffs — at most a soft plum accent along its base.'])
    }),
  item('petFirefly', 'Pet Firefly', 1, 'centre',
    'A little firefly beetle on its own, seen from the side with its head to the RIGHT: a plump dark-brown oval body, a small darker round head at its right end, and a glowing warm-yellow lantern tail at its left end. Only the body — it has NO wings in this picture.',
    'Dark cocoa-brown body, a near-black head, a bright butter-yellow tail.',
    [],
    {
      noun: 'firefly',
      facing: 'Its head is at the RIGHT, exactly as the reference draws it: the game mirrors it itself, so one painted facing left is backwards.',
      not: [
        'Draw ONLY the beetle\'s body, exactly as the reference shows it.',
        '· NO wings of any kind — the game beats its own see-through wings over it.',
        '· NO glow or halo spreading off the tail into the background: the tail itself is bright, and the game adds the glow.',
        '· No text, letters or numbers.'
      ],
      keep: wornKeep('it is tiny — about the size of her eye — looping round her.')
    }),
  // ── The 2026-09-24 paint-outstanding pass (restore): what the cleaning
  // still drew in vector over its paintings (art-roadmap.md, that section).
  //
  // The Sunbeam is TWO stills, because its rays turn and its wand does not:
  // the wand with its sun, and the ring of rays round an empty middle the sun
  // covers. Its halo stays drawn (a wash with no edge).
  item('sunbeam', 'Sunbeam wand', 1, 'centre',
    'A little magic wand with a sun on its tip: a slim, rounded golden wand pointing down to the lower left, with a small caramel-brown grip band a short way below its top, and at its upper-right end a round, bright lemon-gold sun disc with a soft white highlight at its upper left. Only the wand and the round sun — the sun has no rays in this picture.',
    'Warm butter-gold wand with a honey-gold shadow side, a caramel-brown grip band, a bright lemon-yellow sun, paler where the light lands.',
    [], {
      noun: 'wand',
      not: [
        'Draw ONLY what the reference shows: the wand and the round sun on its tip. NO RAYS, NO SPIKES and NO POINTS round the sun — the game turns its own rays round it, behind this picture, and painted ones would stand still under the turning ones.',
        'NO GLOW, halo, sparkle or light spreading from the sun: the game lays its own soft halo round it, and a painted glow keys to a pink smear.',
        'THE SUN HAS NO FACE — no eyes, no smile, no cheeks. It is a magic tool, not a character.',
        'No hand holding it, no stars, no beam of light, no ground, no text.'
      ],
      keep: 'THE SUN IS A PLAIN ROUND DISC, where the reference puts it — at the wand\'s upper-right end, at the same size. The game grows and shrinks this whole picture about the sun\'s middle and aims its beam from there, so a sun that moves along the wand, or turns oval, puts the light in the wrong place.',
      facing: 'The wand points down to the LOWER LEFT and the sun sits at its UPPER-RIGHT end, exactly as in the reference.',
      checks: [
        '· One wand and one round sun. Count the rays round the sun: there must be NONE.',
        '· Nothing round the sun: no glow, no halo, no sparkles. Magenta touches the sun\'s edge all the way round.'
      ]
    }),
  item('sunbeamRays', 'Sunbeam rays', 1, 'centre',
    'The eight pointed RAYS of a little storybook sun, WITHOUT the sun: eight short, fat, pointed tangerine-gold triangles spaced evenly round a circle, each pointing straight out from the middle, their broad ends round an EMPTY round middle.',
    'Warm tangerine-gold rays, a lighter gold along one edge of each where the light lands.',
    [], {
      noun: 'ring of rays',
      not: [
        'Draw ONLY the eight rays. NO SUN in the middle — the game draws its own there — and no wand, no stick, no hand, no glow, no sparkles, no text.',
        'NOT a flower: the rays are triangles of light, each tapering to a soft point — not petals, no leaves, no stem.'
      ],
      holes: 'THE MIDDLE — the round space the eight rays point out from — is an open gap. It is flat magenta right up to the rays\' broad ends: no sun, no disc, no face, no glow and nothing painted in it at all. The game draws its own sun there, over this picture.',
      keep: 'EIGHT RAYS, ALL THE SAME, EVENLY SPACED. The game spins this picture round its middle, so every ray is the same size and shape and the gaps between them are equal — one ray bigger or bent, and the sun wobbles as it turns. No ray touches another.',
      checks: [
        '· Count the rays: exactly 8, all the same, evenly spaced round the middle, none touching another.',
        '· The middle is flat #FF00FF: no sun, no disc, nothing in it.'
      ]
    }),
  // The colour pick's jar (a DOM button — `UnboxScene.vue`), ONE neutral jar
  // tinted per pot, its mark left to the button's SVG; and the paint it
  // throws at the landmark, tinted the same way.
  item('paintPot', 'Paint pot', 1, 'centre',
    'A small, chubby, round-bellied pot full to the brim with PAINT — the whole round belly is the paint\'s colour — with a thick cream rim across its top, one fat drip of paint running down over the rim on the left, and a soft shadow down the belly\'s right side. A child\'s paint pot in a storybook.',
    'A warm cream rim. The paint is the colour-me part below.',
    [], {
      noun: 'pot',
      tinted: 'the paint: the pot\'s whole round belly and the drip over its rim',
      not: [
        'Draw ONLY what the reference shows: the pot, its cream rim and its drip. NO brush in it, no lid, no label, no handle, no splashes round it, no ground, no shadow under it.',
        'NOTHING PRINTED ON ITS BELLY — no flower, star, sun, bell, dot or pattern. The game prints its own small white mark there, and a painted one would sit under it.',
        'No text, letters or numbers.'
      ],
      keep: 'IT IS SEEN SMALL — about a thumb wide, on a round cream button — so it is a bold, simple shape: one round belly, one rim, one drip. Still hand-painted: the paint is glossy, with a soft light along the belly\'s upper left.',
      checks: ['· One pot, one cream rim, one drip, and nothing printed on the belly.']
    }),
  item('paintBlob', 'Paint blob', 1, 'centre',
    'One round, glossy glob of wet paint flying through the air: a plump ball of paint with a bright wet highlight at its upper left.',
    'The paint is the colour-me part below; its wet highlight is white.',
    [], {
      noun: 'blob',
      tinted: 'the paint — the whole blob except its white highlight',
      not: [
        'Draw ONLY the one blob. No splash, no drops or droplets round it, no trail or motion lines behind it, no brush, no pot, no ground, no shadow.',
        'No face: it is a blob of paint, not a character. No text.'
      ],
      keep: 'IT IS SEEN TINY — about a fingertip across, for half a second as it flies — so it is one bold round shape with one bright highlight, and nothing else.',
      checks: ['· One round blob, one highlight, nothing flying off it.']
    }),
  // The map's Twin Gift (§8.2): a strip like the Standard Gift's. The film
  // strip it used to wear is gone — the map's movie camera sits beside it.
  item('twinGift', 'Twin Gift', 2, 'feet',
    'A square gift box with softly rounded corners, in lilac paper with a slightly deeper lilac shadow side, a gold ribbon crossing it both ways, and a gold bow of two loops with a round gold knot on top. Nothing is printed on the box.',
    'Soft lilac-violet paper with a deeper lilac shadow side; butter-gold ribbon and bow, a deeper honey-gold knot.',
    [
      'Panel 1: tied. The bow sits up neat on top of the box, its two loops close together.',
      'Panel 2: the bow is coming loose — its two loops have lifted and swung apart, leaning out to either side, a little bigger. The box and the ribbon cross are exactly the same as in panel 1.'
    ], {
      noun: 'gift',
      not: [
        'Draw ONLY what the reference shows: the box, its ribbon cross and its bow. NO film strip, camera, play sign, picture or sticker on the box — the game puts its own little movie camera beside it, and one on the box as well makes two.',
        'No tag, no card, no second gift, no sparkles, no ground, no shadow under it.',
        'No text, letters or numbers.'
      ],
      checks: ['· A SQUARE box, not a round parcel, with nothing printed on its front.']
    }),
  // A Signature Spell's emblem, under its recipe as the boss chest grants it
  // (`restore/emblem.ts`). Two stills, not a strip: a strip's panels are ONE
  // object at different moments, and these are two different objects.
  item('emblemWard', 'Crystal Ward emblem', 1, 'centre',
    'Three lilac crystal prisms standing side by side on one base line, like a little cluster of gems: each a tall, flat-sided prism with a pointed top, the middle one the tallest, the right one a little taller than the left.',
    'Soft lilac-violet crystal, lighter and almost white on the faces the light catches, a deeper violet on the shadow faces.',
    [], {
      noun: 'emblem',
      not: [
        'Draw ONLY the three prisms. No rock or ground under them, no fourth crystal, no sparkles, no glow, no shield, no circle or badge behind them.',
        'No faces, no text.'
      ],
      checks: ['· Count them: three prisms, the middle one tallest, all standing on the same base line.']
    }),
  item('emblemFrost', 'Frost Lock emblem', 1, 'centre',
    'A six-armed ice crystal — a snowflake emblem: six straight arms meeting in the middle, each with one small pair of side branches halfway along, drawn as thick white strokes with a thin ice-blue line down the middle of every stroke.',
    'Snow white, with an ice-blue core line down every arm and branch.',
    [], {
      noun: 'snowflake',
      not: [
        'Draw ONLY the snowflake. NO circle, disc, badge or snowball behind it — it is the six arms and nothing between them.',
        'No sparkles, no glow, no ground, no face, no text.'
      ],
      keep: 'SIX ARMS, ALL THE SAME, evenly spaced — a snowflake has six, never four, five or eight — each with ONE pair of side branches. Thick, bold, rounded strokes: it is shown about the size of a coin.',
      checks: [
        '· Count the arms: exactly 6, evenly spaced, each with one pair of side branches.',
        '· Between the arms is plain magenta: no disc, no ball, no frosted circle behind the flake.'
      ]
    })
]

const RUNE_INFO: readonly (readonly [string, string])[] = [
  ['Fire', 'flame orange-red'],
  ['Wind', 'pale aqua'],
  ['Ice', 'clear sky blue'],
  ['Earth', 'warm clay brown'],
  ['Nature', 'fresh spring-leaf green'],
  ['Water', 'turquoise'],
  ['Lightning', 'sunny yellow'],
  ['Illusion', 'lilac-violet'],
  ['Rainbow', 'candy pink'],
  ['Time', 'warm amber-sand'],
  ['Moon', 'periwinkle'],
  ['Love', 'rose pink']
]

export const RUNE_SHEETS: readonly ItemSheet[] = RUNE_SLUGS.map((_, k) => {
  const id = runeArtId(k)
  const [title, hue] = RUNE_INFO[k]!
  return {
    name: `rune:${k}` as const,
    kind: 'rune' as const,
    id,
    title: `${title} rune`,
    frames: 1,
    anchor: 'centre' as const,
    panels: [],
    blurb: `The ${title} rune: a magic glyph drawn as ONE thick, rounded stroke of glowing ${hue} light with a plum outline, in exactly the shape of the reference.`,
    colour: `${hue} light, bright and saturated — this is magic, the most colourful thing in the game — with a paler, near-white core along the middle of the stroke.`,
    file: `rune-${RUNE_SLUGS[k]}`,
    target: artTarget('rune', id)
  }
})

/* ────────────────────────────────── the book's own furniture (§8.28) ── */

/**
 * The duel's two HP-bar FRAMES (`artIds.HP_FRAMES`, `game/duel/hpFrame.ts`).
 *
 * The one pair of sheets in the manifest that the game STRETCHES: the bar is
 * ~140 px a side on a portrait phone and ~400 stage units in landscape, so
 * `HpBar.vue` lays the painting on as a CSS 9-slice `border-image` — the
 * medallion end and the finial end at their own size, the rail between them
 * stretched. That only works if the rail's middle stretch is PLAIN, which is
 * the one rule in these briefs that the game cannot survive without, so it
 * is said three ways: in `keep`, in the checks, and as the thing the
 * reference itself shows (a short plain rail between two ornate ends).
 *
 * The TRACK is a hole — the game draws the health there, behind the frame —
 * so it is `holes`, which puts the exception into the magenta contract where
 * the flat rule would otherwise have the last word.
 *
 * One wide panel (`canvas`), because a frame is ~2.6:1 with its air and a
 * square would spend three quarters of the return on magenta. The default
 * 256 px frame cap is kept: the file is read at ~40–80 device px tall.
 */
const hpFrameSheet = (side: 'aurora' | 'foe'): ItemSheet => {
  const { kind, id } = HP_FRAMES[side]
  const aurora = side === 'aurora'
  const [nearEnd, farEnd, runs] = aurora ? ['LEFT', 'RIGHT', 'to the RIGHT'] : ['RIGHT', 'LEFT', 'to the LEFT']
  const metal = aurora ? 'gold' : 'silver-edged indigo'
  return {
    name: `worldUi:${id}` as const,
    kind,
    id,
    title: aurora ? 'HP bar frame — Aurora' : 'HP bar frame — the night (every foe)',
    frames: 1,
    anchor: 'centre' as const,
    panels: [],
    canvas: { w: 1536, h: 864 },
    noun: 'frame',
    blurb: aurora
      ? 'The FRAME of a health bar in a children\'s storybook game, lying flat and level. On the LEFT end, a round MEDALLION: a warm cream disc set in a gold ring studded with eight little pearls, with a soft, chubby five-pointed gold STAR in its middle and a tiny twinkle beside it. Running RIGHT out of the medallion, a long gold RAIL with a rounded end, going all the way round a long empty WINDOW. At the rail\'s right end, a small FINIAL: two little gold leaves curling back along the rail, and a round pearl bead on the tip. It is the ornate edge of a bar the game fills with colour — Aurora\'s, the sunny heroine\'s.'
      : 'The FRAME of a health bar in a children\'s storybook game, lying flat and level. On the RIGHT end, a round MEDALLION: a deep night-indigo disc set in a moonlit-silver ring studded with eight tiny silver twinkles, with a smooth silver CRESCENT MOON in its middle, opening toward the bar, and one small twinkle in the crescent\'s curve. Running LEFT out of the medallion, a long deep-indigo RAIL edged in soft silver, with a rounded end, going all the way round a long empty WINDOW. At the rail\'s left end, a small FINIAL: two little silver leaves curling back along the rail, and a round pale moonstone bead on the tip. It is the edge of the bar of the friend Aurora duels — the calm, dreamy NIGHT to Aurora\'s sunny day.',
    colour: aurora
      ? 'Warm butter-gold for the rail, the ring, the star and the leaves — pale gold where the light lands along their top edges, a deeper honey-gold along their feet. A warm cream disc; cream pearls and a cream pearl bead. Sunny, soft and friendly.'
      : 'Deep night indigo — a blue-violet, never black — for the rail and the disc, a little deeper along the rail\'s foot. Moonlit silver-lavender for the ring, the rail\'s lit top edge, the crescent and the leaves, pale where the light lands. A milky lilac moonstone. Cool, soft and quiet, like a starry sky at bedtime.',
    not: [
      `Draw ONLY what the reference shows: the medallion, the rail round the window, the two leaves and the bead. No hearts, no gems or studs along the rail, no ribbon, no banner, no name plate, no characters, no ground.`,
      'NOTHING IN THE WINDOW. The game fills it with the health bar itself, behind your frame; anything you paint there hides the health.',
      'No text, letters or numbers anywhere — the game writes the name itself, on a plate of its own.',
      'NOT a button, a badge or a panel: no card, plate or shape behind the frame. The magenta touches its outline all the way round, and shows through the window.',
      aurora
        ? 'The star HAS NO FACE — no eyes, no smile, no cheeks. It is an emblem, not a character.'
        : 'The moon HAS NO FACE — no eyes, no mouth, no cheeks. It is an emblem, not a character.',
      ...(aurora ? [] : ['IT IS THE FRIENDLY NIGHT, NOT A THREAT: every edge round, every tip blunt, every shape soft and calm. Nothing sharp and nothing spooky anywhere on it.'])
    ],
    holes: 'THE WINDOW — the long rounded slot inside the rail, where the game draws the health — is an open gap. It is flat magenta inside, right up to the rail\'s inner edge: not a dark well, not a track, not glass, and nothing is painted in it at all.',
    keep: [
      'THE MIDDLE OF THE RAIL IS PLAIN, AND THE SAME ALL THE WAY ALONG — the one rule the game cannot work without.',
      `· The game fits this frame to every screen, from a small phone to a big monitor, by stretching ONLY the middle stretch of the rail: the part between the medallion and the leaves. So that stretch is one plain ${metal} band above the window and one below it — the same colour, the same thickness and the same soft light along its top edge at every point along it.`,
      `· Every ornament lives on the two ENDS: the medallion on the ${nearEnd.toLowerCase()}, the leaves and the bead on the ${farEnd.toLowerCase()}. Nothing on the middle stretch — no pearl, no gem, no knot, no curl, no bright spot, no blotch, no change of colour.`,
      '· The rail is the same thickness above the window as below it, all the way along.',
      '· THE ONE PLACE A STRAIGHT EDGE IS RIGHT: the rail\'s long edges, top and bottom, run level and parallel from the medallion to the leaves — drawn by hand, but never bending, bulging, wobbling or tapering, because the game stretches them. Everything else keeps its hand-drawn irregularity.',
      'THE WINDOW KEEPS ITS SHAPE. It is the game\'s: a long slot with round ends, the rail round it on every side. Keep its height, its rounded ends and where it starts and stops exactly as the reference draws them — starting just clear of the medallion, ending just before the leaves.',
      'IT IS SEEN SMALL — about a fingertip tall on a phone — so it is a bold, clear shape first: a round medallion, one clear emblem, a clean rail. Still hand-painted, never a flat vector: the paint varies softly along the metal and the plum line swells and fades.'
    ].join('\n'),
    view: 'THE VIEW: flat, level and square-on, exactly as the reference shows it — the medallion a round disc facing you, the rail running level. No perspective, no tilt, no curve, no bevel seen from an angle.',
    facing: `The medallion is on the ${nearEnd} end and the bar runs ${runs}, exactly as in the reference. The game uses this painting the way round it is, so a mirrored one puts the medallion at the wrong end of the bar.`,
    checks: [
      `· The medallion is on the ${nearEnd}; the leaves and the bead are on the ${farEnd}.`,
      '· Cover both ends with your hands and look at what is left: a plain band above a magenta slot and a plain band below it, the same from one end to the other. Paint out any ornament, spot or change you find there.',
      '· The window is flat #FF00FF inside, right up to the rail: nothing painted in it.',
      aurora
        ? '· Count them: eight pearls on the ring, one star, one twinkle beside it, two leaves, one bead.'
        : '· Count them: eight twinkles on the ring, one crescent, one twinkle in its curve, two leaves, one bead.',
      '· Look at the magenta directly UNDER the frame and under the medallion: it must be the same flat magenta as the four corners of the sheet. No shadow, no glow, no halo.'
    ],
    file: `worldui-${id}`,
    target: artTarget(kind, id)
  }
}

/**
 * THE BOOK'S CHROME AND THE DOM'S STORYBOOK MARKS (paint-outstanding.md P3,
 * P9, P14; `artIds.CHROME_ART`), the 2026-09-24 pass (map & UI). The glove
 * and the board are canvas drawables (`map/glove.ts`, `map/bookBoard.ts`);
 * the rest are DOM marks drawn for the bench in `domArt.ts`.
 *
 * Two of them are STRETCHED, the HP frames' way (`hpFrameSheet`): the book's
 * board round every shape of page, and the dialogue's paper leaf round every
 * line of the story. Each brief says PLAIN three ways — in `keep`, in the
 * checks, and in the reference, which draws a plain side between four corners.
 */
const chrome = (key: ChromeName, sheet: Omit<ItemSheet, 'name' | 'kind' | 'id' | 'file' | 'target' | 'panels' | 'frames'>): ItemSheet => {
  const { kind, id } = CHROME_ART[key]
  return { name: `worldUi:${id}`, kind, id, frames: 1, panels: [], file: `worldui-${id}`, target: artTarget(kind, id), ...sheet }
}

/** "HOW BIG IT IS IN PLAY", the movie camera's opening, for a small mark. */
const seenAt = (where: string, how: string): string =>
  `HOW BIG IT IS IN PLAY — ${where}. ${how} So it is a bold, simple silhouette first and a picture second: a few big masses, strong colour and a confident plum line; no small details, which only turn to mush at that size.`

const NO_SHADOW_UNDER = '· THE SHADOW IS ON THE THING, NEVER UNDER IT. No ground shadow, no dark patch, no soft smudge below or behind it — a shadow on the magenta ships as a pink stain stuck to it for ever.'
const STILL_PAINTED = '· It is still a hand-painted storybook thing, not a flat vector icon: the paint varies softly across it and the plum line swells and fades.'
const NOTHING_ROUND = '· NOTHING under, behind or around it — no shadow, no glow, no sparkle, no plate. Magenta touches its outline the whole way round.'

const CHROME_SHEETS: readonly ItemSheet[] = [
  chrome('glove', {
    title: 'Show-how glove',
    anchor: 'top',
    noun: 'glove',
    blurb: 'A white cartoon GLOVE with its index finger held straight up — the storybook sign for "put your finger here": the index finger rounded at its tip, the other three fingers curled into the palm as three soft knuckles, the thumb tucked against the left side of the index finger, a plump palm, and a soft lilac cuff at the wrist.',
    colour: 'A soft white glove, shaded with pale lilac-grey where it turns away from the light; a soft lilac cuff. Clean and friendly.',
    not: [
      'Draw ONLY the glove and its cuff. No arm or sleeve past the cuff, no sparkles, no motion lines, no ripple rings, no rainbow, no arrow, no shadow under it.',
      'IT HAS NO FACE — it is a hand, not a character: no eyes, no mouth, no cheeks.',
      'No text, letters or numbers.'
    ],
    keep: [
      seenAt('about 40 to 110 pixels tall, sweeping across a painted storybook page and riding the tip of a magic rune as it draws itself', 'It has to read at a glance as "a finger, pressing HERE", on a pale cream page and on a green meadow alike.'),
      '· THE FINGERTIP IS THE POINT. The very top of the drawing is the rounded tip of the index finger, and nothing reaches higher than it: the game puts that tip exactly where the child should press.',
      '· A strong, warm plum line round the OUTSIDE of the hand — it is what makes a white glove read on cream paper — swelling and thinning as a brush does.',
      NO_SHADOW_UNDER.replace('stuck to it', 'stuck to the glove'),
      STILL_PAINTED
    ].join('\n'),
    facing: 'The finger points STRAIGHT UP, the thumb on its LEFT and the curled fingers and the palm to the RIGHT and below, exactly as in the reference. The game tilts it and moves it.',
    checks: [
      '· One index finger pointing straight up, three curled knuckles, one thumb on its left, one cuff at the wrist.',
      '· The fingertip is the highest point of the drawing.',
      NOTHING_ROUND
    ]
  }),
  chrome('board', {
    title: 'The book: cover board and leaves',
    anchor: 'centre',
    noun: 'book board',
    canvas: { w: 1536, h: 864 },
    blurb: 'The COVER BOARD of a big storybook lying open, seen straight from above, with its open page lifted away: a deep violet cloth-covered board, square-cornered along its LEFT edge (the spine side) and softly rounded at its two RIGHT corners; just inside its edge, a band of cream PAGE EDGES — the block of leaves seen edge-on, a stack of many thin sheets showing as fine stripes of lighter and darker cream that run parallel to the edge all the way round; and in the middle, where the open page lies, a big rectangular HOLE.',
    colour: 'Deep violet book-cloth — a warm plum-violet, never black — a little lighter along the top and deeper toward the bottom. Warm cream page edges, finely striped with a soft brown-lilac shade between the sheets.',
    holes: 'THE PAGE HOLE — the big rectangle in the middle, where the game lays the open page — is an open gap. It is flat magenta inside, right up to the cream page edges: no page, no paper, no picture, nothing painted in it at all.',
    not: [
      'Draw ONLY the board and the band of page edges round the hole, exactly as the reference shows them. No page, no pictures, no bookmark ribbon, no stitching, no spine, no clasp, no corner guards, no gems, no ornaments, no table or cloth under it.',
      'NOTHING IN THE HOLE. The game lays the open page there, over your painting; anything you paint in it is hidden — or shows round the page\'s edge.',
      'No text, letters, numbers or titles anywhere.'
    ],
    keep: [
      'EVERY SIDE IS THE SAME ALL THE WAY ALONG — the one rule the game cannot work without.',
      '· The game fits this board to every screen, wide and tall, by keeping the four corners as they are and STRETCHING each side along its length. So along each side the board is one plain band of cloth and the page edges one plain band of fine stripes — the same colour, the same width and the same light at every point along it. No motif, no patch, no stain, no worn spot and no change of colour anywhere along a side.',
      '· THE PAGE-EDGE STRIPES RUN ALONG THE SIDES, parallel to the board\'s own edge, and turn each corner with it — never across a side. A stripe across a side is stretched into a smear. They are stripes of paint, not drawn lines.',
      '· The cloth is SMOOTH: no weave, no grain and no texture that a stretch would pull into streaks. Its only change is the soft light, lighter at the top and deeper at the bottom.',
      '· THE ONE PLACE STRAIGHT EDGES ARE RIGHT: the board\'s outer edges and the hole\'s edges run level and parallel — drawn by hand, but never bending, bulging or wobbling, because the game stretches them. The two RIGHT corners are rounded, the two LEFT corners square.'
    ].join('\n'),
    view: 'THE VIEW: flat and square-on from directly above, exactly as the reference shows it — a flat frame lying on a table seen from overhead. No perspective, no tilt, no thickness seen from the side.',
    checks: [
      '· Cover the four corners with your hands and look at what is left: plain violet cloth and plain page-edge stripes along each side, the same from one end to the other.',
      '· The hole is flat #FF00FF inside, right up to the page edges: nothing painted in it.',
      '· Left corners square, right corners rounded.',
      '· Look at the magenta directly OUTSIDE the board: the same flat magenta as the corners of the sheet — no shadow, no glow, no table.'
    ]
  }),
  chrome('leaf', {
    title: 'Dialogue paper leaf',
    anchor: 'centre',
    noun: 'leaf of paper',
    canvas: { w: 1536, h: 864 },
    blurb: 'A LEAF OF PAPER from a storybook, lying flat: a wide rectangle of warm cream paper with softly rounded corners and a hand-drawn deep plum line running round its edge. It is the paper the story\'s words are printed on.',
    colour: 'Warm cream paper — as light as the reference, never grey, never a darker yellow — edged with a deep plum line.',
    not: [
      'Draw ONLY the leaf of paper. No words or lines of writing on it, no picture, no portrait, no pictograms, no button, no ribbon, no tape, no torn edge, no folded corner, no curl.',
      'No text, letters or numbers.'
    ],
    keep: [
      'THE MIDDLE IS PLAIN, AND SO IS EVERY SIDE — the one rule the game cannot work without.',
      '· The game fits this leaf to every line of the story, short and long, on every screen: it keeps the four rounded corners as they are and STRETCHES the rest — each side along its length, and the middle both ways. So the middle is one even, plain cream: no fibre, no grain, no spots, no stains, no watercolour blooms, no light patch and no darker edge creeping in. Anything there is stretched across the screen as a smear.',
      '· Words are printed on the middle in deep plum, so it stays LIGHT cream everywhere — as light as the reference.',
      '· The plum edge line is the same weight all along each side; the sides run straight and parallel — drawn by hand, but never bending or wobbling, because the game stretches them.',
      NO_SHADOW_UNDER.replace('stuck to it', 'stuck to the paper'),
      '· It is still hand-drawn: the edge is a brush line, not a ruled stroke, and the corners are drawn by hand.'
    ].join('\n'),
    view: 'THE VIEW: flat and square-on, exactly as the reference shows it — a flat sheet seen from straight above. No perspective, no tilt, no curl, no thickness.',
    checks: [
      '· Cover the four corners with your hands: what is left is plain, even cream edged by an even plum line.',
      '· No writing and no picture: nothing on the paper at all.',
      '· Look at the magenta directly under the leaf: the same flat magenta as the corners of the sheet — no shadow.'
    ]
  }),
  chrome('star', {
    title: 'Chapter star',
    anchor: 'centre',
    noun: 'star',
    blurb: 'A plump five-pointed STAR in warm butter gold, point up, with softly rounded points and a plum line round it — the kind of gold star a teacher sticks on a page.',
    colour: 'Warm butter gold, paler where the light lands at the top left and a deeper honey gold toward the bottom right.',
    not: [
      'Draw ONLY the one star. No sparkles round it, no glow, no ribbon, no badge or disc behind it.',
      'IT HAS NO FACE — no eyes, no smile, no cheeks. It is a mark, not a character.',
      'No text, letters or numbers.'
    ],
    keep: [
      seenAt('about 18 to 30 pixels across, in a row of up to ten on a cream paper leaf, one star for each chapter of the story', 'Gold on cream is nothing without its line, so the plum line round it is strong.'),
      NO_SHADOW_UNDER.replace('stuck to it', 'stuck to the star'),
      STILL_PAINTED
    ].join('\n'),
    checks: ['· One star, five points, point up, no face.', NOTHING_ROUND]
  }),
  chrome('trophy', {
    title: 'Versus trophy',
    anchor: 'centre',
    noun: 'trophy',
    blurb: 'A small golden TROPHY CUP: a round-bottomed gold bowl on a short stem and a wide, stepped base, a curled handle on each side, and a small cream five-pointed star on the front of the bowl.',
    colour: 'Warm polished gold — pale where the light lands on the bowl\'s upper left, a deeper honey gold on the handles, the stem and the base; a cream star.',
    not: [
      'Draw ONLY the cup. No confetti, no sparkles, no ribbon, no plinth, no ground, no hand holding it.',
      'IT HAS NO FACE — no eyes, no smile. No engraving, text, letters or numbers anywhere on it.'
    ],
    keep: [
      seenAt('about 72 pixels tall, floating over a painted duel arena above whichever of two friends won', 'It is a cheerful toy cup, not a sports prize.'),
      NO_SHADOW_UNDER.replace('stuck to it', 'stuck to the cup'),
      STILL_PAINTED
    ].join('\n'),
    checks: ['· One cup: a bowl, two handles, a stem, a base and one small star on the bowl — nothing else.', NOTHING_ROUND]
  }),
  chrome('phone', {
    title: 'Turn-sideways phone',
    anchor: 'centre',
    noun: 'phone',
    blurb: 'A friendly, toy-like SMARTPHONE standing upright, seen straight from the front: a chubby cream body with round corners, a big rounded lilac screen filling most of its front, and one small round plum button below the screen.',
    colour: 'A warm cream body, a soft lilac screen with a gentle sheen at its top, a plum button.',
    not: [
      'Draw ONLY the phone. No hand holding it, no arrow, no motion lines, no sparkles, no cable, no stand, no shadow under it.',
      'THE SCREEN IS EMPTY: no picture, no icons, no apps, no clock, no text and no face on it.',
      'No text, letters or numbers anywhere.'
    ],
    keep: [
      seenAt('about 76 pixels tall on a cream card, where the game slowly turns it onto its side and back to show a child to hold the device sideways', 'It is a toy phone from a picture book, not a real product: no brand, no camera bump, no notch.'),
      NO_SHADOW_UNDER.replace('stuck to it', 'stuck to the phone'),
      STILL_PAINTED
    ].join('\n'),
    facing: 'It stands UPRIGHT, its screen facing you and its button at the BOTTOM, exactly as in the reference. The game turns it.',
    checks: ['· One upright phone: a cream body, one empty lilac screen, one button below it.', NOTHING_ROUND]
  }),
  chrome('shield', {
    title: 'Ad-blocker shield',
    anchor: 'centre',
    noun: 'shield',
    blurb: 'A small storybook SHIELD, pointed at the bottom: a rounded gold rim around a violet face, with a small cream five-pointed star in the middle of the face.',
    colour: 'A warm gold rim, a soft violet face (lighter toward its top left), a cream star.',
    not: [
      'Draw ONLY the shield. No sword, no crest, no bars or stripes, no rivets, no glow, no sparkles.',
      'IT HAS NO FACE — no eyes, no smile. No text, letters or numbers.'
    ],
    keep: [
      seenAt('about 48 pixels tall, at the top of a little cream paper card that explains, kindly, why a reward could not be given', 'Friendly and soft, a toy knight\'s shield from a picture book — never warlike, never a warning sign.'),
      NO_SHADOW_UNDER.replace('stuck to it', 'stuck to the shield'),
      STILL_PAINTED
    ].join('\n'),
    checks: ['· One shield: a gold rim, a violet face, one cream star in its middle.', NOTHING_ROUND]
  })
]

/**
 * What each dialogue pictogram SHOWS, in the painter's words — only what its
 * drawing in `pictos.ts` draws (`artIds.PICTO_SETS`).
 */
const PICTO_WORDS: Readonly<Record<string, string>> = {
  sparkle: 'a big, soft four-pointed TWINKLE in pale butter yellow, with a tiny pink four-pointed twinkle beside its top right',
  heart: 'a plump pink HEART',
  dustCloud: 'a PUFF OF DUST: a cloud shape in dusty grey-lilac, with three little darker grey specks falling from under it',
  cheer: 'a pink POM-POM for cheering: a round, frilly pink bloom on a short brown handle',
  duel: 'two MAGIC WANDS crossed like an X, each tipped with a star — a gold star on the wand rising to the right, a pink star on the wand rising to the left',
  sun: 'a round sunny-yellow SUN with eight short rays around it',
  forest: 'two little pointed FIR TREES side by side, a bright green one at the left and a deeper green one at the right, a little taller and further back, each on a short brown trunk',
  zzz: 'three plum letter Z shapes rising diagonally up to the right, each smaller than the one before — the sign for someone SLEEPING',
  crescentMoon: 'a soft lilac CRESCENT MOON, opening toward the upper right',
  thorn: 'a curving BRAMBLE stem rising from the bottom left to the top right, with five small, sharp brown thorns along it',
  crystal: 'a cluster of three pointed CRYSTALS standing together — a tall lilac one in the middle, a pale aqua one leaning left and a pink one leaning right — each with a light face and a darker face',
  mirror: 'a HAND MIRROR: an oval lilac frame round sky-blue glass with a white shine across it, a short lilac handle below, and a tiny yellow twinkle at its top right',
  wave: 'a rolling SEA WAVE in bright aqua blue, one curl rising at the left and a smaller one at the right',
  musicalNote: 'a pair of joined MUSIC NOTES — two lilac note heads on plum stems, joined across the top by a bar',
  musicalNoteCrossed: 'the same pair of joined MUSIC NOTES in pale grey-lilac, with a plum line struck diagonally through them from the top left to the bottom right — no music',
  cloud: 'a fluffy white CLOUD',
  lightning: 'a sunny-yellow LIGHTNING BOLT zigzagging downward',
  wing: 'a single soft white feathered WING, spread up toward the right',
  rainbow: 'a small RAINBOW arch of three bands — pink outside, then yellow, then sky blue inside — with a little white cloud at each foot',
  hourglass: 'an HOURGLASS: pale blue glass between a brown wooden top bar and bottom bar, golden sand in the top bulb running down into a little heap in the bottom bulb',
  snowflake: 'a six-armed pale ice-blue SNOWFLAKE, each arm with one V of little branches',
  star: 'a big, plump five-pointed butter-yellow STAR',
  balloon: 'a round pink BALLOON with a white shine at its upper left, a little knot and a short wavy string below it'
}

/** Each pictogram's name in the count-and-check list. */
const PICTO_SHORT: Readonly<Record<string, string>> = {
  sparkle: 'twinkle', heart: 'heart', dustCloud: 'puff of dust', cheer: 'pom-pom', duel: 'crossed wands', sun: 'sun',
  forest: 'fir trees', zzz: 'sleeping Z\'s', crescentMoon: 'crescent moon', thorn: 'bramble', crystal: 'crystals',
  mirror: 'hand mirror', wave: 'wave', musicalNote: 'music notes', musicalNoteCrossed: 'crossed-out music notes',
  cloud: 'cloud', lightning: 'lightning bolt', wing: 'wing', rainbow: 'rainbow', hourglass: 'hourglass',
  snowflake: 'snowflake', star: 'star', balloon: 'balloon'
}

/** The dialogue pictograms, one SET per strip (`ItemSheet.set`). */
const pictoSheet = (k: number): ItemSheet => {
  const names = PICTO_SETS[k] as readonly string[]
  const id = pictoSetArtId(k)
  const hasZ = names.includes('zzz')
  return {
    name: `worldUi:${id}`,
    kind: 'worldUi',
    id,
    title: `Dialogue pictograms, set ${k + 1} of ${PICTO_SETS.length}`,
    frames: names.length,
    set: true,
    anchor: 'centre',
    noun: 'pictogram',
    panels: names.map((n, i) => `Panel ${i + 1}: ${PICTO_WORDS[n] ?? n}.`),
    blurb: `${names.length} small storybook PICTOGRAMS, each a different little picture that tells a child what a line of the story is about without a single word. They are printed beside the words on a cream paper leaf, one or two at a time, next to the face of whoever is speaking.`,
    colour: 'Each keeps the colours the reference gives it — bright, clean storybook colours, never muddy. Every one keeps a warm plum line round its OUTSIDE, swelling and fading as a brush does: on cream paper, a little picture with no edge at all dissolves into the page.',
    not: [
      `Draw ONLY the ${names.length} pictures the reference shows, one in each panel. No ground, no shadow, no scenery, no characters, no hands, and no bubble, badge, disc, tile or card behind any of them.`,
      'THEY HAVE NO FACES — not the sun, the moon, the cloud, the star, the heart or the snowflake: no eyes, no mouth, no cheeks. They are signs, not characters.',
      hasZ
        ? 'No text, letters or numbers — except the three Z shapes of the sleeping sign, which ARE that picture. Nothing else in the strip is a letter.'
        : 'No text, letters or numbers.'
    ],
    keep: [
      seenAt('about 40 to 58 pixels across, beside a line of words on cream paper, one or two at a time', 'A child who cannot read yet follows the story from these alone, so each must say what it is at a glance.'),
      '· Every one is a whole, separate little picture in the MIDDLE of its own panel, about the size the reference draws it — never touching a neighbour.',
      NO_SHADOW_UNDER.replace('stuck to it', 'stuck to each picture'),
      STILL_PAINTED
    ].join('\n'),
    checks: [
      `· Name them left to right: ${names.map((n) => PICTO_SHORT[n] ?? n).join(', ')}. Exactly ${names.length}, in that order.`,
      '· None of them has a face.',
      '· NOTHING under or around any of them — no shadow, no glow, no bubble, no card.'
    ],
    file: `worldui-${id}`,
    target: artTarget('worldUi', id)
  }
}

const PICTO_SHEETS: readonly ItemSheet[] = PICTO_SETS.map((_, k) => pictoSheet(k))

/**
 * The chrome of the book itself — the things a player looks at on every map
 * screen and which, until now, had no painted seam at all.
 */
export const WORLD_UI_SHEETS: readonly ItemSheet[] = [
  {
    name: 'worldUi:node-badge' as const,
    kind: 'worldUi' as const,
    id: 'node-badge',
    title: 'Node badges',
    frames: 5,
    anchor: 'centre' as const,
    panels: [
      'Panel 1: SHUT — a soft lilac-grey disc with a small white padlock on it.',
      'Panel 2: NEXT — a violet disc with a white five-pointed star on it.',
      'Panel 3: NEXT, and the chapter\'s last — the same violet disc, with a white crown instead of the star.',
      'Panel 4: DONE — a warm gold disc with a pale cream five-pointed star on it.',
      'Panel 5: DONE, and the chapter\'s last — the same gold disc, with a pale cream crown.',
      'The DISC is identical in shape and size in all five, and the glyph sits dead centre on it at the same size. Only the disc colour and the glyph change.'
    ],
    blurb: 'A small round badge, like an enamel pin, that hangs on the corner of a picture in a storybook: a flat coloured disc with one simple glyph sitting on it and a soft plum rim around the edge. It is shown about the size of a coin, so the glyph has to read instantly.',
    colour: 'A soft lilac-grey disc when shut, a violet disc when it is the next one, and a warm honey-gold disc when it is done. The glyphs are white, or pale cream on the gold.',
    noun: 'badge',
    checks: [
      '· Five discs of exactly the same size, in one row.',
      '· The glyph on each is centred and reads at a glance: padlock, star, crown, star, crown.',
      '· NOTHING under or beside any disc — no shadow, no glow, no plate. Magenta touches every rim the whole way round.'
    ],
    file: 'worldui-node-badge',
    target: artTarget('worldUi', 'node-badge')
  },
  {
    name: 'worldUi:bookmark' as const,
    kind: 'worldUi' as const,
    id: 'bookmark',
    title: 'Bookmark ribbon',
    frames: 1,
    anchor: 'top' as const,
    panels: [],
    blurb: 'A ribbon bookmark hanging straight down out of a book: a flat band of soft fabric, cut into a shallow V at the bottom the way a ribbon is. Only the ribbon — nothing it is attached to.',
    colour: 'Keep it the pale neutral grey the reference gives it.',
    tinted: 'the whole ribbon. The game gives it a different colour for every chapter',
    noun: 'ribbon',
    view: 'THE VIEW: flat and square-on, hanging straight down, exactly as the reference shows it. The game bends it as it sways.',
    checks: [
      // The first return ran off the bottom of its box, so the slicer cut the
      // V clean off: with a hanging thing the TOP is pinned, and every extra
      // millimetre of length is lost at the foot.
      '· The ribbon is a little over three times as long as it is wide — no longer.',
      '· Its notched V foot is COMPLETELY inside the picture, with clear magenta below it. Nothing may touch the bottom edge.'
    ],
    file: 'worldui-bookmark',
    target: artTarget('worldUi', 'bookmark')
  },
  // The rewarded-ad button's mark (`artIds.MOVIE_ICON`), shown in front of the
  // button's label by `ArtIcon`. The only DOM glyph in the family: it is read
  // at about 24 CSS px on a gold button and on cream paper, so the brief is a
  // bold silhouette with a dark body and light reels — detail is mush there.
  {
    name: `worldUi:${MOVIE_ICON.id}` as const,
    kind: MOVIE_ICON.kind,
    id: MOVIE_ICON.id,
    title: 'Rewarded-ad movie camera',
    frames: 1,
    anchor: 'centre' as const,
    panels: [],
    blurb: 'A small, chubby storybook MOVIE CAMERA seen from the side: a soft rounded box body, a short flared lens hood on its right-hand end, two round film reels sitting on top of the body (each a cream disc with a small hub and three little round holes around it), and a small gold play triangle painted on its side. It stands in front of the words on a "watch a short video" button, about the size of one letter — a toy-like, friendly little camera, not a real one.',
    colour: 'A deep plum-violet body with a lighter lilac-violet top where the light lands; the lens hood a little deeper violet; cream reels with a small plum hub and soft lilac holes; a warm sunny-gold play triangle.',
    noun: 'icon',
    not: [
      'Draw ONLY what the reference shows: the camera body, its lens, its two reels and its play triangle. No film strip unrolling from it, no light beam, no sparkles or stars, no hand, no tripod, no ground.',
      'NOT a badge, a button or an app icon: no circle, rounded square, tile, plate or frame behind it. The button it sits on is already its tile.',
      'IT HAS NO FACE. The two reels are film reels, not eyes — no pupils, no catch-lights, no lashes, no mouth, no blush. A camera with a face is a character, and this is a sign.',
      'No text, letters or numbers anywhere on it — no "REC", no "AD", no "TV", no numbers on the reels.'
    ],
    keep: [
      'HOW BIG IT IS IN PLAY — about 24 pixels tall, next to a word on a button, on a GOLD button and on CREAM paper. It has to read as a movie camera at a glance at that size, so it is a bold, simple silhouette first and a picture second.',
      '· Four big masses and nothing else: the body, the lens hood, the two reels. No buttons, dials, screws, handles, straps, sprocket holes or tiny highlights — at 24 pixels they only turn it to mush.',
      '· STRONG CONTRAST INSIDE IT: a DARK plum-violet body against LIGHT cream reels and a BRIGHT gold play triangle. A body as pale as the reels vanishes on cream paper; gold reels vanish on a gold button.',
      '· THE SHADOW IS ON THE THING, NEVER UNDER IT. No ground shadow, no dark patch, no soft smudge below or behind it — a shadow on the magenta ships as a pink stain stuck to the icon for ever.',
      '· It is still a hand-painted storybook thing, not a flat vector app icon: the paint varies softly across the body and the plum line swells and fades.'
    ].join('\n'),
    facing: 'It faces RIGHT: the lens hood is on the right-hand end and the reels sit on top — the same way round as the reference.',
    checks: [
      '· Shrink it in your head to the size of one letter on a button: it still reads as a film camera — a box, a lens, two reels on top.',
      '· Exactly two reels, one lens hood on the right, one play triangle on the side — and nothing else added.',
      '· NOTHING under, behind or around it — no shadow, no glow, no plate, no circle. Magenta touches its outline the whole way round.'
    ],
    file: `worldui-${MOVIE_ICON.id}`,
    target: artTarget(MOVIE_ICON.kind, MOVIE_ICON.id)
  },
  hpFrameSheet('aurora'),
  hpFrameSheet('foe'),
  // The 2026-09-24 paint-outstanding pass (map & UI): the book's chrome and
  // the DOM's storybook marks, then the dialogue pictograms' four sets.
  ...CHROME_SHEETS,
  ...PICTO_SHEETS
]

/* ───────────────────────────────────── the sectors' live props (§8.8) ── */

/**
 * The props that move ON a painted sector — and only the ones a TRANSFORM
 * carries.
 *
 * A sector's painting is everything its `paint()` draws; its `props()` are
 * drawn live on top, every frame, and stayed vector when the sectors were
 * painted. That is the style break the owner reported: crisp flat-vector fish
 * and gulls sitting on brushwork.
 *
 * What is here is a shape a matrix moves: a butterfly on its figure-eight, a
 * gull gliding, a fish on its leap, the mill's sails turning. A few of them
 * also have discrete STATES worth baking — a wing up and down, a claw raised —
 * and those are the strip's panels, cross-faded as the drawing passes between
 * them. Everything else about the motion stays the drawing's own transform.
 *
 * What is NOT here, and must not be (`artIds.PROP_ART`, art-roadmap.md §4b):
 * particle systems, lights, and anything whose geometry is rebuilt per frame
 * or per call site from points it is handed.
 *
 * They are the smallest sheets in the catalogue — a butterfly is about a
 * thirtieth of a sector's width — so each one says how small, in the picture's
 * own units, and asks for a silhouette rather than detail.
 */
const prop = (
  name: PropName, title: string, frames: number, blurb: string, colour: string,
  small: string, panels: readonly string[] = [], extra: Partial<ItemSheet> = {}
): ItemSheet => {
  const { kind, id } = PROP_ART[name]
  return {
    name: `prop:${name}` as const,
    kind, id, title, frames, anchor: 'centre' as const, panels, blurb, colour,
    keep: [
      `HOW BIG IT IS IN PLAY — ${small} It has to read as a clear SILHOUETTE at a glance.`,
      '· Paint it boldly and simply: strong shape, strong colour, one soft highlight where the light lands and one soft shadow INSIDE its own outline where it turns away from the light. At the size it is actually seen, fine feathering, scales, veins, grain or fur is invisible and only turns it to mush.',
      // "A soft shadow under the form" cost two returns: the painter read it as
      // a cast shadow and laid a dark ellipse on the magenta, which keys to a
      // pink smear welded under the sprite. These float on nothing, always.
      '· THE SHADOW IS ON THE THING, NEVER UNDER IT. This is flying, swimming or floating with nothing beneath it: no ground shadow, no dark patch, no soft smudge below or behind it. A shadow laid on the magenta comes out as a pink stain stuck to it for ever.',
      '· It is still a hand-painted storybook thing, not an icon and not a sticker: the paint varies across it and the ink swells and fades.'
    ].join('\n'),
    file: id,
    target: artTarget(kind, id),
    ...extra
  }
}

/** One panel-consistency line for a strip of the same creature at wing-beats. */
const sameCreature = (what: string): string =>
  `The ${what} itself is IDENTICAL in all three — the same shape, the same size, the same colours, in the same place on the panel. ONLY the wings move.`

/**
 * THE LIVING THINGS A RESTORED SECTOR IS GIVEN BACK (`artIds.CREATURE_ART`,
 * §8.8): each chapter's tap creature and its rescue collectible, painted once
 * per BODY. They are the only figures the player meets outside the duel, they
 * stand on painted scenery in all fifty cleaning views, and they are the
 * reason this family exists — a flat vector animal on a painted meadow is the
 * one thing no amount of background work can fix.
 *
 * A creature is a CHARACTER, so the style block carries the character rules
 * (the eyes, the expression) and the SIZE clause is not the props' "read as a
 * silhouette": these are looked at, close up, by a child who just tapped
 * them. The panels are the poses the peek animates BETWEEN, and the thing
 * every panel must agree about is that it is the SAME creature.
 */
const creature = (
  name: CreatureName, title: string, frames: number, blurb: string, colour: string,
  big: string, panels: readonly string[] = [], extra: Partial<ItemSheet> = {}
): ItemSheet => {
  const { kind, id } = CREATURE_ART[name]
  return {
    name: `creature:${name}` as const,
    // NOT `character: true`, though these are the game's other characters.
    // That block is written for the DUELISTS and says so in every line — a
    // spiral horn, a mane and tail in large soft locks, little rounded
    // hooves, no realistic horse anatomy. Handed to a hare or a fox it is an
    // instruction to grow a horn. The two rules from it that these do need —
    // the anime eye and "the expression is the point" — are said here, of the
    // animal actually being painted.
    kind, id, title, frames, anchor: 'feet' as const, panels, blurb, colour,
    keep: [
      `HOW BIG IT IS IN PLAY — ${big} A child has just tapped it to make it come out, so it is looked AT: give it a face worth finding.`,
      '· IT IS THE ANIMAL THE REFERENCE DRAWS AND NOTHING ELSE — no horn, no wings, no mane, and nothing borrowed from a unicorn. The unicorns are in this game too; this is not one of them.',
      '· CHIBI ANIME DESIGN, exactly as the reference has it: a big round head, a small compact body, short sturdy limbs — and ANIME EYES, large and glossy, a big coloured iris with one large and one small white catch-light.',
      '· THE EXPRESSION IS THE POINT and it must be unmistakable at a glance: warm, delighted, wide-awake. A blank or vacant face is a failed drawing however well it is painted.',
      '· Paint it like a character in a picture book, not like an icon: soft varied paint across the coat, a warm light on one side, a gentle shadow where a form turns away, and ink that swells where two forms meet and fades to nothing elsewhere.',
      // The prop family's own paid-for trap, and it costs exactly as much here:
      // a creature that rises from behind a rock has nothing under it.
      // Paid for twice now, once here and once on the props: the RULE was in
      // the prompt and the CONSEQUENCE was not, so it kept coming back with a
      // contact shadow. It survives the key as a dark oval welded under the
      // creature, which then floats over the painted snow it lands on.
      '· THE SHADOW IS ON THE CREATURE, NEVER UNDER IT. It is popping up from behind something the game has already painted, and there is no ground beneath it at all: no contact shadow, no dark oval, no soft smudge below or behind it, not even a faint one. A shadow laid on the magenta is cut out WITH the creature and is stuck to it in every scene it ever appears in.',
      '· NOTHING IT HIDES BEHIND. The rock, the log, the bank, the basket or the boat it peeks out from is part of the scene and is already painted there. Paint the creature ALONE, whole, from head to foot.',
      '· It is happy to be found. Never startled, never sad, never scared.'
    ].join('\n'),
    file: id,
    target: artTarget(kind, id),
    ...extra
  }
}

/** The line every creature strip needs: the panels are ONE animal. */
const samePose = (what: string, only: string): string =>
  `It is the SAME ${what} in every panel — the same shape, the same size, the same colours, standing in the same place on the panel, the same distance from the top. ONLY ${only} changes. If the panels were flipped through quickly it must look like one ${what} moving, not like two different ones.`

/**
 * THE DUELISTS' OWN PARTS (`artIds.RIG_ART`, §9.7). Unlike every other family
 * these are not WHOLE THINGS: each is one piece of a chibi unicorn, and the
 * rig assembles them. Three rules follow from that and they lead every
 * prompt, because none of them is true of anything else in the catalogue.
 *
 * 1. NO OUTLINE AT ALL. The rig inks each group as one continuous silhouette
 *    and fills the parts inside it; a part carrying its own line puts one
 *    everywhere two masses meet, which is exactly the seam the rig exists to
 *    avoid. This is the only family painted with no ink whatsoever.
 * 2. THE SILHOUETTE IS FIXED. The painting is clipped to the drawn path, so
 *    a shape that wanders is simply cut off. The reference's outline is the
 *    contract, not a suggestion.
 * 3. IT IS A NEUTRAL. Twenty characters wear this rig, so every sheet is
 *    painted in the reference's pale grey and `artTint` multiplies the coat,
 *    the horn or the hoof colour through it.
 */
const rigPart = (
  part: RigPart, title: string, blurb: string, light: string, extra: Partial<ItemSheet> = {}
): ItemSheet => {
  const { kind, id } = RIG_ART[part]
  return {
    name: `rig:${part}` as const,
    kind, id, title, frames: 1, anchor: 'centre' as const, panels: [], blurb,
    colour: 'ALL of it keeps the pale neutral grey the reference is drawn in (see below). This part belongs to twenty different characters and the game gives each of them their own colour, so the painting carries the LIGHT and none of the hue.',
    tinted: 'the whole part, edge to edge. There is no second colour on it',
    keep: [
      'IT IS A PIECE OF A CHARACTER, NOT A WHOLE ONE — one part of a small chibi unicorn, about the size of a thumb on screen, seen from the side.',
      `· HOW IT IS LIT — ${light} Soft-edged, painted, like gouache: a bounce of light along the shaded rim, a soft core shadow, and the light side warmer and brighter. No hard cel mask, no banding.`,
      // Measured, after the first roll: the returns went from 0 to 246 in
      // value, and the game TINTS them by MULTIPLYING a coat colour through.
      // Multiply can only darken, so every shadow the painter puts in is
      // shadow the character can never get back — a cream unicorn came out
      // grey. The shading has to be SHALLOW, and the colour comes later.
      '· KEEP IT LIGHT AND KEEP IT SHALLOW. The whole part stays in the top third of the value range: the brightest place is near white and the DEEPEST shadow is still a light grey, no darker than a pencil tone. The game multiplies each character’s own colour through this painting, so anything you darken is darkness that character is stuck with — a pale cream one comes out grey. Model the form with a gentle turn, not with contrast.',
      '· IT IS A NEUTRAL GREY, and a WARM-NEUTRAL one: no blue in the shadows, no lilac, no cool cast. A cool grey turns every warm-coated character cold.',
      // The one rule this family has that no other does, said twice because
      // every instinct a painter has says to outline a shape on a flat ground.
      '· NO OUTLINE. NO LINE OF ANY KIND. Not round the outside, not inside it, not a thin one, not a soft one, not a darker rim standing in for one. The game draws the outline itself, on top, and a painted line under it comes out as a double line. Paint stops at the edge of the shape and the magenta begins.',
      '· KEEP THE SHAPE EXACTLY. The game cuts your painting to the outline the reference has, so anything outside it is thrown away and any hollow you leave shows as a hole. Match the silhouette.',
      '· No face, no eye, no mouth, no hair, no markings, no pattern, no spots, no stripes: the game draws all of those on top.'
    ].join('\n'),
    file: id,
    target: artTarget(kind, id),
    ...extra
  }
}

export const RIG_SHEETS: readonly ItemSheet[] = [
  rigPart('barrel', 'Duelist — barrel',
    'The BODY of a small chibi unicorn seen from the side, with no head, no neck and no legs: one rounded barrel with a fuller haunch behind it and a chest in front, blending into a single soft mass. A plump, friendly, slightly pear-shaped body.',
    'from above and in FRONT of it — so the chest and the top of the barrel are the brightest, and the light falls away under the belly and back toward the haunch.',
    { noun: 'body' }),
  rigPart('neck', 'Duelist — neck',
    'The NECK of a small chibi unicorn as a smooth tapered tube lying on its side, THICK at the left end where it meets the shoulder and slimmer at the right where it meets the head, with softly rounded ends. No head, no mane, no shoulders — just the tube.',
    'from above: the upper edge is the bright side and the shadow gathers along the lower edge, with a soft bounce of light at the very bottom.',
    { noun: 'neck' }),
  rigPart('head', 'Duelist — head',
    'The HEAD of a small chibi unicorn seen from the side, facing RIGHT: one big round skull with a small rounded muzzle joined onto its lower right, as a single soft mass. NO face at all — no eye, no nostril, no mouth, no blush. No ears, no horn, no forelock.',
    'from above and in front — the brow and the top of the muzzle catch the light, and the shadow gathers under the jaw and back toward the poll.',
    { noun: 'head' }),
  rigPart('ear', 'Duelist — ear',
    'ONE pointed ear of a small chibi unicorn, a soft rounded triangle standing up with its tip leaning slightly back, and a smaller soft inner shell inside it.',
    'from above and in front: the outer edge is lit and the inner shell is a softer, slightly deeper tone, so the ear reads as a cupped shape rather than a flat triangle.',
    { noun: 'ear' }),
  rigPart('horn', 'Duelist — horn',
    'The HORN of a small chibi unicorn: a slim tapered cone pointing up and slightly to the right, with THREE soft spiral ridges crossing it, evenly spaced, getting closer together toward the tip. Rounded at the base, never sharp enough to read as a weapon.',
    'from above and in front, and it is faintly translucent: the lit side glows a little and the ridges read as soft turns of the spiral, not as drawn lines.',
    { noun: 'horn' })
]

export const CREATURE_SHEETS: readonly ItemSheet[] = [
  creature('snowHare', 'Snow-hare (Twilight Tundra)', 3,
    'A chibi snow-hare sitting up on its haunches, side-on, facing RIGHT: a round body, a head almost as big as the body, two long soft ears standing up behind it with warm pink inside, one big glossy eye, a round pom tail behind, small front paws held in front of its chest, and a knitted scarf round its neck with a short end hanging down its near side.',
    'The hare is snow white with a cool lilac-grey shadow side and warm pink ear-linings, a pink blush and a small pink nose. Its SCARF keeps the reference\'s pale neutral grey (see below): the game gives each of the five hares its own scarf colour.',
    'it stands about a tenth of the height of the scene — roughly the size of a thumb on a phone.',
    [
      'Panel 1: ASLEEP AND HIDING — both ears swept back and down, lying flat along its shoulders and back, and the eye closed (a soft downward-curving lash line, no iris). Head, body and tail sit exactly where they do in the other two: only the ears have moved.',
      'Panel 2: EARS UP — both ears sprung upright, eye still closed, the same soft lash line.',
      'Panel 3: AWAKE — ears upright exactly as in panel 2, and the eye WIDE OPEN: a big glossy violet iris with one large and one small white catch-light.',
      samePose('hare', 'the ears and the eye')
    ],
    {
      noun: 'hare',
      tinted: 'the scarf, both the loop round its neck and the end hanging down. The hare itself stays snow white',
      facing: 'It faces RIGHT in every panel — its NOSE toward the right-hand edge of its panel, its TAIL toward the left. The game mirrors this painting itself for the hares that pop up the other way, so one painted facing left comes out backwards in every sector it appears in, and is unusable.',
      view: 'THE VIEW: side-on and flat, sitting upright with its feet level along the bottom, exactly as the reference shows it. One eye is visible, on the near side of the head. No three-quarter view, no facing the viewer, no perspective, no tilt.',
      checks: [
        '· Three hares in one row: ears back and asleep, ears up and asleep, ears up and awake.',
        '· Look at the magenta DIRECTLY UNDER each hare, where its feet meet the ground: it must be the same flat magenta as the four corners of the sheet. A darker oval, a soft grey smudge or any change of tone there is a ground shadow — paint it back to flat magenta.',
        '· The scarf is KNITTED WOOL with a visible stitch and a soft edge, wrapped round the neck — not a smooth grey tube, not a plastic ring, not a collar.',
        '· FACING: in each of the three, the nose is nearer the RIGHT edge of its panel than the tail is. If any of them faces left, redraw the whole strip.',
        '· The ears are UP in panels 2 and 3 and identical in both.',
        '· The scarf is there in all three, the same scarf in the same place.',
        '· Nothing under any of them, and nothing beside them: the magenta runs clean right up to the feet.'
      ]
    }),
  creature('mossSprite', 'Moss-sprite (Whispering Woods)', 2,
    'A round little moss-sprite: one soft mossy-green ball for a whole body, with two flat leaf ears sticking out level either side, a single curved sprout growing from the top of its head with one small leaf on it, two big eyes, a wide smile and two round blush patches. No arms, no legs, no neck — the ball IS the creature.',
    'Keep the reference\'s pale neutral grey (see below) for the BALL: the woods give it its own green, and it brightens as it wakes. The leaf ears and the sprout are a deeper leafy green, the blush warm pink.',
    'it is about a fifteenth of the width of the scene — a small round thing sitting in a hollow log.',
    [
      'Panel 1: ASLEEP — both eyes closed, drawn as two soft downward-curving lash lines, and a small calm smile.',
      'Panel 2: AWAKE — both eyes WIDE OPEN and shining, and a big happy grin.',
      samePose('sprite', 'the eyes and the mouth')
    ],
    {
      noun: 'sprite',
      tinted: 'the round body ball only. The leaf ears, the sprout and the face stay as they are',
      view: 'THE VIEW: straight on and flat, the ball centred and the two leaf ears level with each other, exactly as the reference shows it. No three-quarter view, no perspective.',
      checks: [
        '· Two sprites in one row: asleep, then awake.',
        '· ONE sprout, growing from the TOP of the head and leaning a little to one side. Not two, and not a flower.',
        '· No arms, no legs and no body under the ball.',
        '· Nothing under either of them: the magenta runs clean beneath the ball.'
      ]
    }),
  creature('seaFoal', 'Sea-foal (Bubble Bay)', 2,
    'The head and neck of a chibi sea-unicorn foal, side-on, facing RIGHT, rising out of water — the neck is CUT OFF square at the bottom, with no chest, no shoulders and no body. A round head with a soft muzzle, one big glossy eye, a small spiral horn, a swept fin-shaped ear behind the head, and a mane of a few large soft locks down the back of the neck.',
    'A pale sea-green coat with a cooler shaded side, a soft lilac muzzle, a mane in soft aqua and lilac, a pearl-white horn and a warm pink blush.',
    'it is about a seventh of the height of the scene — it rises out of the water, so only its head and neck are ever seen.',
    [
      'Panel 1: MOUTH SHUT — a small closed smile.',
      'Panel 2: BLOWING — the mouth rounded into a small open O, about to blow a bubble.',
      samePose('foal', 'the mouth')
    ],
    {
      noun: 'foal',
      facing: 'It faces RIGHT in both panels — its muzzle toward the right-hand edge, its mane toward the left. The game mirrors this painting itself for the foals that surface the other way, so one painted facing left is backwards everywhere and unusable.',
      view: 'THE VIEW: side-on and flat, exactly as the reference shows it. One eye, on the near side of the head. No three-quarter view, no perspective.',
      not: [
        'Draw ONLY the head and neck the reference shows.',
        '· NO water, NO splash, NO ripple, NO bubbles, NO shoulders, NO body, NO legs.',
        '· The water is already painted in the scene and the bubbles are drawn by the game.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· Two foals in one row: mouth shut, then rounded.',
        '· The neck ENDS square at the bottom edge of the drawing — no chest, no shoulders, no body.',
        '· ONE horn and ONE visible eye.',
        '· No water and no bubbles anywhere in the picture.'
      ]
    }),
  creature('singingShell', 'The Singing Shell (Bubble Bay)', 2,
    'A plump pearly sea-shell standing upright: a fat rounded body whorl with a short spire of three smaller whorls stacked up and to the LEFT, and a flared opening on the RIGHT like a little bell. It has a face on the front of the body whorl — two eyes and a mouth — and nothing else.',
    'Mother-of-pearl: a warm cream-white with soft pink, mint and lilac sheen running round the whorls, and a warm coral-pink inside its flared lip.',
    'it is about a seventh of the width of the scene — the treasure at the middle of the beach.',
    [
      'Panel 1: ASLEEP — the lip nearly closed to a narrow slit, both eyes shut as soft curved lash lines, and the whole shell DULLER and greyer, as if under dust.',
      'Panel 2: AWAKE AND SINGING — the lip flared wide open, the eyes open and bright, a happy round singing mouth, and the whole shell at its full pearly colour.',
      samePose('shell', 'the lip, the face and how bright it is')
    ],
    {
      noun: 'shell',
      view: 'THE VIEW: side-on and flat, standing on its foot, the spire up and to the left and the opening to the right, exactly as the reference shows it.',
      not: [
        'Draw ONLY the shell.',
        '· NO sand, NO water, NO shadow under it, NO other shells, NO music notes, NO sparkles.',
        '· The notes and the glow are drawn by the game on top of this painting.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· Two shells in one row: shut and dull, then open and bright.',
        '· THREE small whorls in the spire, stacked up to the LEFT of the big one.',
        '· Nothing under either of them: the magenta runs clean beneath the shell\'s foot.'
      ]
    }),
  creature('babyPegasus', 'Baby pegasus (Cloud Kingdom)', 4,
    'A chibi baby pegasus, side-on, facing RIGHT: a round little barrel, a head almost as big as it, short sturdy legs with small rounded hooves, a soft mane and tail in a few large locks, and two small feathered wings. No horn — it is a pegasus, not a unicorn.',
    'Keep the reference\'s pale neutral grey (see below) for the COAT: the five stables each give their foal its own pastel. The mane and tail are a bright candy colour, the wings creamy white, the hooves warm gold.',
    'it stands about a seventh of the height of the scene.',
    [
      'Panel 1: CURLED ASLEEP — lying down with its legs folded under it and its head tucked round toward its tail, eyes closed, wings folded flat along its back.',
      'Panel 2: STANDING, WINGS FOLDED — up on all four legs, eyes open, wings still folded against its sides.',
      'Panel 3: WINGS SPREAD, DOWN-BEAT — standing, both wings out to the side with their tips LOW, below the line of its back.',
      'Panel 4: WINGS SPREAD, UP-BEAT — the same wings raised HIGH above its back.',
      samePose('pegasus', 'whether it is curled or standing, and where its wings are')
    ],
    {
      noun: 'pegasus',
      tinted: 'the coat — the barrel, the neck, the head and the legs. The mane, the tail, the wings and the hooves keep their own colours',
      facing: 'It faces RIGHT in every panel: the game mirrors this painting itself for the foals that face the other way.',
      view: 'THE VIEW: side-on and flat, feet level along the bottom, exactly as the reference shows it. One eye, on the near side of the head.',
      checks: [
        '· Four pegasi in one row: curled asleep, standing, wings low, wings high.',
        '· NO HORN on any of them. A horn makes it a unicorn and the picture unusable.',
        '· The wings are FOLDED in panels 1 and 2 and SPREAD in panels 3 and 4.',
        '· Nothing under any of them: the magenta runs clean beneath the hooves.'
      ]
    }),
  creature('glowworm', 'Glowworm (Crystal Caves)', 2,
    'A chubby chibi glowworm rearing up, side-on, facing RIGHT: two plump body segments stacked up from the ground, a round head as big as the body, two big eyes, a wide smile and two blush patches, and two antennae curving up from its head, each ending in a round bulb.',
    'A fresh lime green with a deeper green shaded side and a pale cream belly down its front; the two bulbs are a warm buttery yellow; the blush is warm pink.',
    'it is about a seventh of the height of the scene, rearing up out of the dark.',
    [
      'Panel 1: ASLEEP — both eyes closed as soft downward-curving lash lines, a small calm smile, and the two bulbs DULL and unlit.',
      'Panel 2: AWAKE — both eyes wide open and shining, a big grin, and the two bulbs bright buttery yellow.',
      samePose('glowworm', 'the eyes and how bright the two bulbs are')
    ],
    {
      noun: 'glowworm',
      view: 'THE VIEW: side-on and flat, its foot level along the bottom, exactly as the reference shows it.',
      not: [
        'Draw ONLY the glowworm.',
        '· NO glow, NO halo, NO light spilling off the bulbs, NO crystals, NO cave, NO ground.',
        '· The light it casts is drawn by the game on top of this painting; a painted halo would be stuck to it for ever.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· Two glowworms in one row: asleep with dull bulbs, awake with bright ones.',
        '· TWO antennae, each with ONE round bulb on its end.',
        '· No halo or glow painted around the bulbs — just the bulbs themselves.',
        '· Nothing under either of them.'
      ]
    }),
  creature('clearShard', 'The Shard of Clear Light (Crystal Caves)', 2,
    'A tall six-sided crystal shard standing upright, pointed at the top, with a small friendly face on its middle facet — two eyes and a mouth — and nothing else.',
    'Panel 1 is a clouded, dusty lilac-grey crystal. Panel 2 is the same crystal gone clear: icy blue-white with a pale rainbow sheen sliding through it.',
    'it is about a sixth of the height of the scene — the treasure at the middle of the cave.',
    [
      'Panel 1: ASLEEP — cloudy and dull, both eyes closed as soft curved lash lines, a small calm mouth.',
      'Panel 2: AWAKE — clear and bright, the eyes wide open with white catch-lights, a happy open smile.',
      samePose('shard', 'how clear it is, and the face')
    ],
    {
      noun: 'shard',
      view: 'THE VIEW: straight on and flat, standing upright with its point at the top, exactly as the reference shows it. Do not tilt it — the game tips it back into its rock itself.',
      not: [
        'Draw ONLY the crystal.',
        '· NO rock, NO nest, NO ground, NO shadow, NO glow, NO halo, NO rainbow thrown across the floor.',
        '· The rock it sits in is part of the cave and is already painted there.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· Two crystals in one row: cloudy, then clear.',
        '· They are the same crystal at the same size, standing UPRIGHT in both.',
        '· No rock and no glow anywhere in the picture.'
      ]
    }),
  creature('mirrorSprite', 'Mirror sprite (Mirror Mountains)', 2,
    'A tiny round chibi sprite, side-on, facing RIGHT: one soft round body with two little feet under it, two stubby arms, a big face with two large glossy eyes and a wide smile, and a single curly antenna rising from its head with a small four-point star on the tip.',
    'Keep the reference\'s pale neutral grey (see below) for the BODY: the valley\'s sprite and its reflection are two different colours. The star on its antenna is warm gold, the blush warm pink.',
    'it is about a twelfth of the height of the scene — a very small creature, so keep it simple and bold.',
    [
      'Panel 1: ARM DOWN — its near arm hanging at its side.',
      'Panel 2: WAVING — the same near arm raised up beside its head, palm out.',
      samePose('sprite', 'the near arm')
    ],
    {
      noun: 'sprite',
      tinted: 'the round body, the arms and the feet. The star, the antenna and the face stay as they are',
      facing: 'It faces RIGHT in both panels: the game mirrors this painting itself for the twin that pops up beside it.',
      view: 'THE VIEW: side-on and flat, its feet level along the bottom, exactly as the reference shows it.',
      checks: [
        '· Two sprites in one row: arm down, then arm up waving.',
        '· ONE antenna with ONE star on it.',
        '· Nothing under either of them: the magenta runs clean beneath the feet.'
      ]
    }),
  creature('mendedShard', 'The Mended Shard (Mirror Mountains)', 2,
    'A little hand-mirror standing upright: a straight handle at the bottom with a round knob at its foot, and above it an oval frame holding an oval of glass.',
    'Panel 1 is dull: a tarnished greyish-gold frame and flat grey glass. Panel 2 is the same mirror polished: warm bright gold, and clean pale blue-white glass with a soft sheen.',
    'it is about a fifth of the height of the scene — the treasure at the middle of the valley.',
    [
      'Panel 1: ASLEEP — dull and tarnished, and the glass CRACKED, with a wedge-shaped piece missing from its edge.',
      'Panel 2: AWAKE — bright gold, the glass whole and clear with no crack at all, and one small four-point star shining in it.',
      samePose('mirror', 'whether it is dull and cracked or bright and whole')
    ],
    {
      noun: 'mirror',
      view: 'THE VIEW: straight on and flat, standing UPRIGHT with its handle straight down, exactly as the reference shows it. Do not lean it — the game tips it onto the path itself.',
      not: [
        'Draw ONLY the hand-mirror.',
        '· NO path, NO ground, NO shadow, NO glow, NO halo, NO fallen chip beside it, NO reflection of anything in its glass.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· Two mirrors in one row: dull and cracked, then bright and whole.',
        '· Both stand UPRIGHT at the same size, the handle straight down.',
        '· There is no second piece of glass lying beside either of them.',
        '· Nothing under either of them.'
      ]
    }),
  creature('rainbowFoal', 'Rainbow foal (Rainbow Ridge)', 3,
    'A chibi unicorn foal, side-on, facing RIGHT: a round little barrel, a head almost as big as it, four short sturdy legs with small rounded hooves, a small spiral horn, one big glossy eye, and a mane, forelock and tail made of a few large soft locks in rainbow colours.',
    'A cream-white coat with a warm shaded side and gold hooves; the mane, forelock and tail run through the whole rainbow — pink, peach, lemon, mint, sky and lilac — in big soft locks, never thin strands.',
    'it stands about a seventh of the height of the scene, trotting out across the grass.',
    [
      'Panel 1: STANDING — all four legs straight down and level, still.',
      'Panel 2: TROTTING, NEAR FORELEG FORWARD — the near front leg reaching forward and the near hind leg back.',
      'Panel 3: TROTTING, NEAR FORELEG BACK — the opposite: the near front leg back under the body and the near hind leg forward.',
      samePose('foal', 'where the four legs are')
    ],
    {
      noun: 'foal',
      facing: 'It faces RIGHT in every panel: the game mirrors this painting itself for the foals that trot the other way.',
      view: 'THE VIEW: side-on and flat, hooves level along the bottom, exactly as the reference shows it. One eye, on the near side of the head.',
      checks: [
        '· Three foals in one row: standing, then the two halves of a trot.',
        '· The body, the head, the mane and the tail are in exactly the same place in all three — ONLY the legs move.',
        '· ONE horn, and the mane is the rainbow in a few LARGE locks, not many thin strands.',
        '· Nothing under any of them: the magenta runs clean beneath the hooves.'
      ]
    }),
  creature('prismPetal', 'The Prism Petal (Rainbow Ridge)', 2,
    'A single big flower petal standing upright on its stem end, broad and rounded with a small notch at its tip, with a friendly face low on it — two eyes and a mouth — and nothing else.',
    'Panel 1 is a dull dusty lilac. Panel 2 is the same petal gone luminous: a pearly white with soft rainbow bands running across it, like light through a prism.',
    'it is about a sixth of the height of the scene — the treasure at the middle of the garden.',
    [
      'Panel 1: FOLDED ASLEEP — folded shut down the middle so it is only half as wide, with a crease down its centre, dull, both eyes closed.',
      'Panel 2: OPEN AND AWAKE — unfolded to its full width, pearly and rainbow-lit, the eyes wide open and a happy smile.',
      samePose('petal', 'whether it is folded shut or open, and how bright it is')
    ],
    {
      noun: 'petal',
      view: 'THE VIEW: straight on and flat, standing upright with the notch at the top, exactly as the reference shows it.',
      not: [
        'Draw ONLY the petal.',
        '· NO flower, NO stem, NO leaves, NO cushion, NO ground, NO shadow, NO glow, NO rainbows thrown around it.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· Two petals in one row: narrow and folded, then wide and open.',
        '· The open one is about TWICE as wide as the folded one, and they are the same height.',
        '· Nothing under either of them.'
      ]
    }),
  creature('sandFox', 'Sand-fox pup (Sunken Sands)', 1,
    'A chibi desert-fox pup sitting on its haunches, seen from the FRONT: a round body, a head as big as the body, two very large pointed ears standing up, a small dark nose, two big glossy eyes, a wide smile, and a big bushy tail curling up behind one side. Both front paws rest on the ground in front of it.',
    'A warm sandy apricot coat with a paler cream muzzle, chest, paws and tail-tip, a deeper apricot shaded side, a small dark nose and warm pink blush.',
    'it is about a sixth of the height of the scene, sitting in the sand.',
    [],
    {
      noun: 'pup',
      view: 'THE VIEW: straight on and flat, facing the viewer, sitting upright with both front paws down on the ground, exactly as the reference shows it. No three-quarter view, no perspective.',
      not: [
        'Draw ONLY the pup, with BOTH front paws resting on the ground.',
        '· NO raised paw and NOTHING held up: the arm it lifts and the trinket it holds are drawn by the game on top of this painting.',
        '· NO sand, NO dune, NO ground, NO shadow, NO tent, NO sparkle.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· ONE pup, sitting, both front paws on the ground.',
        '· TWO big pointed ears, standing up.',
        '· Nothing is held up and no arm is raised.',
        '· Nothing under it: the magenta runs clean beneath its seat and paws.'
      ]
    }),
  creature('sandClock', 'The Hourglass of Ember (Sunken Sands)', 2,
    'A little hourglass standing upright: a cap top and bottom joined by two slim posts either side, and between them a waisted glass holding sand. It has a friendly face on the glass — two eyes and a mouth.',
    'Warm brass and coral-pink caps, honey-gold sand, clear glass with a soft white highlight down one side.',
    'it is about a sixth of the height of the scene — the treasure at the middle of the plaza.',
    [
      'Panel 1: ASLEEP — dull and dim, the eyes closed as soft curved lash lines, and the sand lying in a heap ALONG ONE SIDE of the glass, as if the hourglass had been lying on its side.',
      'Panel 2: AWAKE AND RUNNING — bright, the eyes wide open and smiling, with sand filling the TOP bulb and a neat heap grown in the BOTTOM one.',
      samePose('hourglass', 'where the sand lies, and the face')
    ],
    {
      noun: 'hourglass',
      view: 'THE VIEW: straight on and flat, standing UPRIGHT in both panels, exactly as the reference shows it. Do not lay it on its side — the game turns it itself.',
      not: [
        'Draw ONLY the hourglass.',
        '· NO stand, NO ground, NO shadow, NO glow, NO halo, NO sparkles, NO falling stream of grains.',
        '· No text, letters, numerals or marks on the glass.'
      ],
      checks: [
        '· Two hourglasses in one row, both standing UPRIGHT at the same size.',
        '· TWO posts, one either side, and TWO caps, top and bottom.',
        '· Nothing under either of them.'
      ]
    }),
  creature('frostShard', 'The Frozen Star Shard (Twilight Tundra)', 2,
    'A rounded four-point star-crystal — a star with soft fat points and gently curved sides, not a sharp one — with a friendly face on it: two eyes, a smile and two blush patches.',
    'Panel 1 is a cold dim lilac-grey. Panel 2 is the same crystal lit up: a warm lemon-gold with a paler gold on one side and a small white gleam.',
    'it is about a seventh of the height of the scene — the treasure at the middle of the snow.',
    [
      'Panel 1: ASLEEP — dim lilac-grey, both eyes closed as soft curved lash lines, a small calm smile.',
      'Panel 2: AWAKE — lemon-gold and bright, the eyes wide open with white catch-lights, a happy open smile.',
      samePose('star-crystal', 'how bright it is, and the face')
    ],
    {
      noun: 'star-crystal',
      view: 'THE VIEW: straight on and flat, one point up, exactly as the reference shows it.',
      not: [
        'Draw ONLY the star-crystal.',
        '· NO block of ice around it, NO snow, NO ground, NO shadow, NO glow, NO halo, NO sparkles orbiting it.',
        '· The ice it melts out of and the sparkles are drawn by the game.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· Two star-crystals in one row: dim, then bright.',
        '· FOUR points, rounded and soft, not sharp spikes.',
        '· Nothing under either of them, and no ice around them.'
      ]
    }),
  creature('starCalf', 'Star-calf (Starlight Summit)', 2,
    'A chibi star-calf, side-on, facing RIGHT: a round cream-gold body sprinkled with small star-shaped spots, a big head with two soft floppy ears and two small blunt gold horn-nubs, a soft muzzle, one big glossy eye, four short sturdy legs, a collar round its neck with a little gold bell on it, and a tail ending in a small star.',
    'A warm cream coat with a honey-gold shaded side and gold star spots, a soft muzzle, a gold bell and gold horn-nubs. Its COLLAR keeps the reference\'s pale neutral grey (see below): each of the five calves wears its own colour.',
    'it stands about a seventh of the height of the scene.',
    [
      'Panel 1: ASLEEP — the eyes closed, drawn as two soft downward-curving lash lines, standing calmly.',
      'Panel 2: AWAKE — the eyes wide open and shining, a happy face.',
      samePose('calf', 'the eyes')
    ],
    {
      noun: 'calf',
      tinted: 'the collar band round its neck. The bell on it stays gold, and the calf stays cream',
      facing: 'It faces RIGHT in both panels: the game mirrors this painting itself for the calves that rise the other way.',
      view: 'THE VIEW: side-on and flat, hooves level along the bottom, exactly as the reference shows it. One eye, on the near side of the head.',
      checks: [
        '· Two calves in one row: eyes shut, then eyes open.',
        '· The star spots, the collar, the bell and the star on its tail are in the same place in both.',
        '· Nothing under either of them: the magenta runs clean beneath the hooves.'
      ]
    }),
  creature('fallenStar', 'The Fallen Star (Starlight Summit)', 2,
    'A five-point star with soft fat rounded points and gently curved sides, with a friendly face on it: two eyes, a smile and two blush patches.',
    'Panel 1 is a dim dusty lilac. Panel 2 is the same star lit: a warm bright gold with a deeper gold on one side and a small white gleam.',
    'it is about a sixth of the height of the scene — the treasure at the middle of the garden.',
    [
      'Panel 1: ASLEEP — dim lilac, both eyes closed as soft curved lash lines, a small calm mouth.',
      'Panel 2: AWAKE — gold and beaming, the eyes wide open with white catch-lights, a big happy smile.',
      samePose('star', 'how bright it is, and the face')
    ],
    {
      noun: 'star',
      view: 'THE VIEW: straight on and flat, ONE POINT STRAIGHT UP, exactly as the reference shows it. Do not tip it over — the game lays it in the grass itself.',
      not: [
        'Draw ONLY the star.',
        '· NO grass, NO bed of petals, NO ground, NO shadow, NO glow, NO halo, NO sparkles turning round it.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· Two stars in one row: dim, then gold.',
        '· FIVE points, rounded and soft, one pointing straight UP in both.',
        '· Nothing under either of them.'
      ]
    }),
  creature('sprig', 'Sprig (Friendship Festival)', 2,
    'The same round moss-sprite as the woods\', dressed for a party: one soft mossy-green ball for a body with two flat leaf ears either side and a curved sprout on top, big eyes, a wide smile and blush — and a tall cone-shaped party hat with a stripe round it, tilted on its head. One small round hand is held out to its right, closed as if gripping something.',
    'Keep the reference\'s pale neutral grey (see below) for the PARTY HAT: the five stalls each give Sprig its own. The ball is a soft mossy green, the leaf ears and sprout a deeper leafy green, the blush warm pink.',
    'it is about a tenth of the height of the scene — a small round thing bobbing up behind a stall.',
    [
      'Panel 1: ASLEEP — both eyes closed as soft downward-curving lash lines, a small calm smile.',
      'Panel 2: AWAKE — both eyes wide open and shining, a big party grin.',
      samePose('sprig', 'the eyes and the mouth')
    ],
    {
      noun: 'sprig',
      tinted: 'the party hat and the stripe round it. The sprite itself stays green',
      view: 'THE VIEW: straight on and flat, the ball centred and the leaf ears level, exactly as the reference shows it.',
      not: [
        'Draw ONLY Sprig and its hat, with its small closed hand held out to the right.',
        '· NO flag, NO stick, NO bunting, NO stall, NO ground, NO shadow, NO confetti.',
        '· The flag it waves is drawn by the game, on a stick that passes behind that hand.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· Two Sprigs in one row: asleep, then awake.',
        '· ONE party hat, tilted, with ONE stripe round it.',
        '· There is no flag and no stick anywhere in the picture.',
        '· Nothing under either of them.'
      ]
    })
]

export const PROP_SHEETS: readonly ItemSheet[] = [
  prop('butterfly', 'Butterfly', 3,
    'A little butterfly seen from above, with two rounded wings either side and a slim dark body down the middle. Two short antennae. Nothing else — no flowers, no leaves, no trail.',
    'The wings keep the reference\'s pale neutral grey (see below); the body is the warm deep plum the whole game is inked in.',
    'it is about a thirtieth of the width of the scene it flies over — smaller than a fingernail on a phone.',
    [
      'Panel 1: wings almost CLOSED — seen nearly edge-on, the two wings folded up together into a narrow shape.',
      'Panel 2: wings HALF open.',
      'Panel 3: wings WIDE open and flat, at their fullest spread.',
      `${sameCreature('butterfly')} The wings are the same shape in all three, seen more and more open.`
    ],
    {
      noun: 'butterfly',
      tinted: 'both wings, right out to their edges. The body and the antennae stay plum',
      view: 'THE VIEW: from directly above, wings spread left and right, the body vertical, exactly as the reference shows it. No three-quarter view, no perspective.',
      checks: ['· Three butterflies in one row, the same butterfly, wings closed then half open then wide.']
    }),
  prop('gull', 'Seagull', 3,
    'A small white seagull gliding high up, painted as ONE simple swept shape: two long wings meeting in a shallow dip in the middle — the way a distant gull reads as a soft curve against the sky. NO head, no beak, no eye, no legs, no tail: the wings are the whole bird, exactly as the reference draws it.',
    'White, with a soft cool grey-lilac shadow along the underside of the wings. No bright colour anywhere: it is a white bird against sky.',
    'it is about a twentieth of the width of the scene it flies over — a small white shape high above the sea.',
    [
      'Panel 1: wings DOWN — both wing tips below the body, on the downbeat.',
      'Panel 2: wings LEVEL — spread flat out to the sides.',
      'Panel 3: wings UP — both wing tips raised above the body, on the upbeat.',
      sameCreature('gull')
    ],
    {
      noun: 'gull',
      view: 'THE VIEW: flat and from below, the wings spread symmetrically left and right, exactly as the reference shows it. No three-quarter view, no perspective, no tilt.',
      checks: [
        '· Three gulls in one row: wings down, level, up.',
        '· It is WHITE. A grey or brown bird is the wrong bird.',
        '· No head, no beak, no eye, no tail, in ANY of the three. Two wings and nothing else.',
        '· Nothing under any of them. The magenta runs clean beneath every wing.'
      ]
    }),
  prop('dove', 'Dove', 3,
    'A plump little cream dove flying to the RIGHT: a round body, a round head, a small yellow beak, a forked tail behind, and one wing raised over its back.',
    'A creamy off-white body with a soft lilac shadow side, a pale lilac wing, a butter-yellow beak and a small plum eye.',
    'it is about a twentieth of the width of the scene it flies over.',
    [
      'Panel 1: the wing is DOWN, swept below the body.',
      'Panel 2: the wing is LEVEL with the back.',
      'Panel 3: the wing is UP, raised high over the body.',
      `${sameCreature('dove')} It faces RIGHT in all three.`
    ],
    {
      noun: 'dove',
      facing: 'It faces RIGHT in every panel: the game mirrors it when the bird flies the other way.',
      checks: ['· Three doves in one row, facing right, the wing down then level then up.']
    }),
  prop('duck', 'Duck', 1,
    'A plump little white duck floating on water, seen from the side and facing RIGHT: a rounded oval body, a round head on a short neck, and a small orange beak. Only the duck — no water, no ripples, no reflection, no reeds.',
    'White with a soft cool grey-lilac shadow along the underside, and a warm orange beak.',
    'it is about a twentieth of the width of the scene, paddling in a brook.',
    [],
    {
      noun: 'duck',
      facing: 'It floats LEVEL, facing right, exactly as the reference draws it: the game paddles it along the brook and bobs it.',
      checks: ['· No water, no ripples and no reflection — the brook is already painted underneath.']
    }),
  prop('swallow', 'Swallow', 3,
    'A small swallow gliding high up, painted as ONE simple swept shape: two long pointed wings meeting in a shallow dip in the middle, the way a distant bird reads as a curve against the sky. NO head, no beak, no eye, no legs: the wings are the whole bird, exactly as the reference draws it.',
    'Keep the reference\'s pale neutral grey (see below): the game gives each ridge its own candy colour. A soft darker edge underneath the wings.',
    'it is about a twentieth of the width of the scene it flies over.',
    [
      'Panel 1: wings DOWN — both wing tips below the body.',
      'Panel 2: wings LEVEL — spread flat out to the sides.',
      'Panel 3: wings UP — both wing tips raised above the body.',
      sameCreature('swallow')
    ],
    {
      noun: 'swallow',
      tinted: 'the whole bird — both wings, right out to their tips',
      view: 'THE VIEW: flat and side-on, the wings spread symmetrically left and right, exactly as the reference shows it. No perspective, no tilt.',
      checks: [
        '· Three swallows in one row: wings down, level, up.',
        '· No head, no beak, no eye, no tail, in ANY of the three. Two wings and nothing else — a bird that grows a body in the third panel is three different birds, and unusable.',
        '· Nothing under any of them. The magenta runs clean beneath every wing.'
      ]
    }),
  prop('fish', 'Leaping fish', 1,
    'A chubby little fish seen side-on, nose to the RIGHT, with a rounded body, one small round eye near the nose and a forked tail at the back. A friendly cartoon fish, not a real one.',
    'Keep the reference\'s pale neutral grey (see below): the game gives each lagoon its own fish colour. A paler belly and a soft shadow along the back.',
    'it is about a twenty-fifth of the width of the scene, seen for a moment as it leaps.',
    [],
    {
      noun: 'fish',
      tinted: 'the whole fish, body and tail together. The eye stays plum',
      facing: 'It lies LEVEL, nose to the right, exactly as the reference draws it: the game tips it up and down along its leap.',
      checks: ['· It is level and flat, not diving, not leaping, not curved.']
    }),
  prop('crab', 'Little crab', 3,
    'A small round crab seen from the front, standing on the sand: a wide oval shell, two eyes up on short stalks, a little smiling mouth, two big rounded claws held out either side and three short legs down each side.',
    'A warm coral-orange shell with a deeper coral shadow side, white eyes with plum pupils.',
    'it is about a fourteenth of the width of the scene, a little creature down on the beach.',
    [
      'Panel 1: ASLEEP — both eyes CLOSED, drawn as two small flat lines, and both claws held low.',
      'Panel 2: AWAKE — both eyes open and round, both claws held low.',
      'Panel 3: WAVING — the same open eyes, and its RIGHT claw (the one on the right of the picture) lifted up high and opened, waving hello. The left claw stays low.',
      'The crab itself is IDENTICAL in all three — the same shell, the same size, the same colours, in the same place. Only the eyes and the right claw change.'
    ],
    {
      noun: 'crab',
      view: 'THE VIEW: from the front, square on, standing level, exactly as the reference shows it. No three-quarter view, no perspective.',
      checks: [
        '· Three crabs in one row: eyes shut, eyes open, eyes open with the right claw raised.',
        '· It is friendly and round. Nothing sharp, nothing pinching, nothing cross.',
        '· NO SAND, NO SHADOW, NO DARK PATCH under any of the three. The beach is already painted and the crab is put on top of it: the magenta runs clean right up under its legs.'
      ]
    }),
  prop('sails', 'Windmill sails', 1,
    'The four lattice sails of a windmill and the round cap they turn on, and NOTHING ELSE: no tower, no mill, no roof, no building, no ground, no sky. Four long slatted sail frames of pale cream, set in a cross — one straight up, one straight down, one to each side — each one a narrow ladder of cross-pieces, joined at a small round hub in the middle.',
    'Pale cream sailcloth with a warm sand shadow along one edge of each sail, and a small candy-pink hub in the middle.',
    'it is about a quarter of the width of the scene, the biggest moving thing on it.',
    [],
    {
      noun: 'sail cross',
      not: [
        'THIS IS A PART, NOT A WINDMILL. Draw ONLY the four sails and their hub, exactly as the reference shows them.',
        '· NO tower, NO mill body, NO cap, NO roof, NO door, NO windows, NO ground, NO grass, NO sky, NO scenery.',
        '· The mill the sails belong to is already painted, and it is waiting behind them. Anything you add here ends up as a second mill on top of the first.',
        '· No text, letters or numbers.'
      ],
      view: 'THE VIEW: flat and square-on, the cross upright — one sail pointing straight up, one straight down, one left, one right, exactly as the reference has them. The game turns the whole cross, so it must be drawn standing still.',
      checks: [
        '· Four sails, in a cross, at twelve, three, six and nine o\'clock.',
        '· There is no building anywhere in the picture.'
      ]
    }),
  prop('waterwheel', 'Water wheel', 1,
    'A wooden mill wheel seen face-on: a thick round timber rim, a small round hub in the middle, and eight straight paddles running from the hub outwards, each one crossing the rim and sticking out a little past it. Between the hub and the rim there is nothing but the paddles — the wheel is OPEN, like a ship\'s wheel.',
    'Warm mid-brown timber with a deeper brown shadow side and a darker hub.',
    'it is about a tenth of the width of the scene, turning in a brook.',
    [],
    {
      noun: 'wheel',
      not: [
        'Draw ONLY the wheel, exactly as the reference shows it — no mill, no house, no axle housing, no water, no brook, no splash, no ground, no scenery.',
        '· The water and the mill are already painted, and the wheel turns in front of them.',
        '· No text, letters or numbers.'
      ],
      view: 'THE VIEW: flat and square-on, seen face-on, exactly as the reference has it. The game turns it, so draw it standing still.',
      // Its middle is a HOLE: `waterwheelShape` strokes an annulus and the
      // brook shows through it. A painter that has not been told fills it with
      // timber and dams the stream — so the exception is stated inside the
      // magenta block, which would otherwise have the last word on it.
      holes: 'THE WHEEL IS OPEN IN THE MIDDLE. The eight gaps between the hub, the paddles and the rim are HOLES, and the brook is painted behind them.',
      checks: [
        '· Eight paddles, evenly spaced right round the wheel — count them.',
        '· You can see magenta through the wheel, in all eight gaps.',
        '· It is a wheel alone, with nothing behind or beside it.'
      ]
    }),

  /* ── the shapes a particle system, a string or a light repeats ──────── */

  prop('twinkle', 'Twinkle', 1,
    'A four-point star of light: two long points up and down, two long points left and right, with the sides curving IN between them so the star is slim-waisted and sharp — a glimmer, not a chunky star.',
    'Keep the reference\'s pale neutral grey (see below): the game gives each glimmer its own colour, from warm cream to plain white. It is brightest in the middle and softens towards each tip.',
    'it is between a fiftieth and a thirtieth of the width of the scene — a small bright spark.',
    [],
    {
      noun: 'twinkle',
      tinted: 'the whole star, from its middle right out to its four tips',
      view: 'THE VIEW: flat and square-on, one point straight up, one straight down, one left, one right, exactly as the reference has it. The game turns it and swells it, so draw it standing still and upright.',
      not: [
        'Draw ONLY the star, exactly as the reference shows it.',
        '· FOUR points, not five, not six, not eight. A five-pointed star is the wrong shape and cannot be used.',
        '· NO circle behind it, no ring, no burst of little rays, no trail, no sky, no scenery.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· Exactly four points, and the two vertical ones are the same length as the two horizontal ones.',
        '· The sides curve inwards between the points — it is not a diamond and not a square.',
        '· Nothing under it or behind it: the magenta runs clean right up to its edge.'
      ]
    }),
  prop('pennant', 'Pennant', 3,
    'A long triangular pennant flag flying from a pole, seen from the side: it is fixed along its short left edge, and it tapers away to the RIGHT into a soft point. It is a piece of cloth in the wind — its long edges curve and its tip lifts.',
    'Keep the reference\'s pale neutral grey (see below): the game gives every pennant in the game its own chapter colour. A soft darker crease where the cloth folds away from the light.',
    'it is about a twentieth of the width of the scene, flying from a pole top.',
    [
      'Panel 1: the cloth RIPPLES DOWNWARDS — its middle sags below the straight line from the pole to the tip.',
      'Panel 2: the cloth is FLAT — it streams out straight, with barely a curve.',
      'Panel 3: the cloth RIPPLES UPWARDS — its middle lifts above the straight line from the pole to the tip.',
      'It is the SAME pennant in all three — the same length, the same depth, the same colour, fixed at the same place on the left. Only the ripple through the cloth changes.'
    ],
    {
      noun: 'pennant',
      tinted: 'the whole cloth, right out to its tip',
      facing: 'It flies to the RIGHT in every panel: the game turns it on its pole and mirrors it where the wind blows the other way.',
      not: [
        'Draw ONLY the cloth, exactly as the reference shows it.',
        '· NO pole, NO mast, NO flagstaff, NO rope, NO finial, NO ring, NO sky, NO building.',
        '· The pole it flies from is already painted and the cloth is put on top of it.',
        '· No text, letters, numbers, crests or emblems on the cloth.'
      ],
      checks: [
        '· Three pennants in one row: rippling down, flat, rippling up.',
        '· Each one is fixed along its short LEFT edge and tapers to a point on the RIGHT.',
        '· There is no pole anywhere in the picture.'
      ]
    }),
  prop('flag', 'Bunting flag', 1,
    'ONE little bunting flag hanging from a line: a triangle with its flat edge along the TOP and its point hanging straight DOWN, a scrap of cloth about as deep as it is wide.',
    'Keep the reference\'s pale neutral grey (see below): the game gives each flag on a string its own colour. A soft darker shadow along one side where the cloth curls.',
    'it is about a fiftieth of the width of the scene — one flag in a long row of them.',
    [],
    {
      noun: 'flag',
      tinted: 'the whole flag',
      view: 'THE VIEW: flat and square-on, hanging straight down, exactly as the reference has it. The game tilts each flag as the breeze takes it, so draw it hanging still.',
      not: [
        'Draw ONE flag and NOTHING ELSE, exactly as the reference shows it.',
        '· NO string, NO cord, NO rope, NO line across the top, NO other flags, NO pegs, NO sky.',
        '· The string is drawn by the game, threading its own curve between two points, and every flag on it is this one picture hung along it. A string drawn here would cross every other flag in the row.',
        '· No text, letters, numbers or emblems on the cloth.'
      ],
      checks: [
        '· One flag only, point down, flat edge along the top.',
        '· There is no string anywhere in the picture.'
      ]
    }),
  prop('mote', 'Glowing mote', 1,
    'A tiny floating light: a small bright white heart with a soft round glow around it, fading away to nothing at its edge — a firefly in the dusk, a glowing spore drifting up out of the moss. THE REFERENCE IS A DIAGRAM, NOT A STYLE: it steps the glow as two flat rings because a canvas fill cannot fade. Paint ONE soft glow, brightest at the heart and thinning away to nothing — no rings, no bands, no edges.',
    'Keep the reference\'s pale neutral grey (see below): the game gives each one its own light, warm honey in the woods and pale mint in the caves. The middle is white-hot, the glow around it is the colour.',
    'it is about a fiftieth of the width of the scene — a speck of light.',
    [],
    {
      noun: 'mote',
      tinted: 'the glow around the core. The white heart stays white',
      view: 'THE VIEW: flat and square-on, a round glow with its bright heart in the middle, exactly as the reference has it.',
      // A glow has no edge, so the magenta block's flat "no magenta inside the
      // object" would have it painted as a hard disc — the one thing a light
      // must never be.
      holes: 'THE GLOW FADES OUT TO NOTHING. Its outer edge is SOFT: it thins away into the magenta instead of stopping at a line, and magenta showing through the faint outer glow is exactly right. There is NO outline anywhere on it — no ring, no rim, no drawn edge.',
      not: [
        'Draw ONLY the mote, exactly as the reference shows it.',
        '· NO insect, NO body, NO wings, NO legs, NO face — the game has never drawn one, and a firefly here is only its light.',
        '· NO trail, NO streak, NO leaves, NO moss, NO night sky, NO scenery.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· It is round, soft and has no outline at all.',
        '· Its heart is clearly brighter than the glow around it.',
        '· Nothing under it: the magenta runs clean all round it.'
      ]
    }),
  prop('puff', 'Soft puff', 1,
    'A single soft round puff of smoke: a plump, cloudy little ball with a gently bumpy edge, thicker in the middle and wispier round the outside — one puff from a chimney, or one puff of spray thrown up by a waterfall. THE REFERENCE IS A DIAGRAM, NOT A STYLE: it is a hard-edged circle, because that is what a canvas fill is. It gives you the SIZE and the place; the puff itself is soft, uneven and wispy at its rim.',
    'Keep the reference\'s pale neutral grey (see below): the game makes it white for smoke and spray, and warm sand for a desert\'s dust. Very slightly darker underneath, lighter on top.',
    'it is between a fortieth and a twentieth of the width of the scene, and it swells as it rises.',
    [],
    {
      noun: 'puff',
      tinted: 'the whole puff',
      view: 'THE VIEW: flat and square-on, a single round puff, exactly as the reference has it. The game lifts it, swells it and fades it away.',
      holes: 'THE PUFF\'S EDGE IS SOFT. It thins away into the magenta all round rather than stopping at a line, and magenta showing through its wispy outer edge is exactly right. It has NO outline — no ring, no rim, no drawn edge anywhere on it.',
      not: [
        'Draw ONE puff and nothing else, exactly as the reference shows it.',
        '· NO chimney, NO roof, NO house, NO waterfall, NO ground, NO sky.',
        '· NO string of puffs, NO trail, NO second or third puff — the game draws a row of them from this one picture.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· ONE puff. There is not a second one anywhere in the picture.',
        '· It has no outline and its edge is soft all the way round.'
      ]
    }),
  prop('lantern', 'Paper lantern', 1,
    'A round paper lantern hanging from a string: a plump rounded body, a little gold cap on top with a loop for the string, and a smaller gold rim underneath. It glows warmly from the inside, so its middle is lighter than its edges.',
    'Keep the reference\'s pale neutral grey (see below) for the paper: the game gives every lantern on a string its own festival colour. The two caps are warm gold. Lit from within, so the paper is palest through its middle.',
    'it is about a thirtieth of the width of the scene, one of a row hung across a market.',
    [],
    {
      noun: 'lantern',
      tinted: 'the paper body. The gold caps top and bottom stay gold',
      view: 'THE VIEW: flat and square-on, hanging upright, exactly as the reference has it. The game swings it on its string.',
      not: [
        'Draw ONE lantern and nothing else, exactly as the reference shows it.',
        '· NO string, NO cord, NO rope, NO line above it, NO other lanterns, NO tassel, NO sky, NO stall.',
        '· The string is drawn by the game and every lantern on it is this one picture hung along it.',
        '· NO halo, NO glow, NO light spilling out around it — the game draws the warm halo over the lantern, and a painted one would double it.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· One lantern only, upright, with a gold cap above and a gold rim below.',
        '· There is no string and no glow around it.'
      ]
    }),
  prop('caveLantern', 'Miner\'s lantern', 1,
    'A little brass miner\'s lantern hanging by the ring on its domed brass top: a rounded brass hood, a tall clear glass body with a slim brass bar down each side, a small warm flame standing in the middle of the glass, and a flat brass base under it.',
    'Warm honey brass with a deeper bronze shadow side, pale blue-white glass, and a butter-gold flame.',
    'it is about a thirtieth of the width of the scene, hanging along a cave bridge.',
    [],
    {
      noun: 'lantern',
      view: 'THE VIEW: flat and square-on, hanging upright, exactly as the reference has it. The game swings it on its hook.',
      not: [
        'Draw ONLY the lantern, exactly as the reference shows it.',
        '· NO post, NO bracket, NO hook, NO chain, NO string, NO rock, NO cave, NO ground.',
        '· NO halo, NO glow, NO pool of light around it — the lantern\'s warm glow is drawn over it by the game every frame, and a painted one would double it.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· One lantern, upright, its ring at the top.',
        '· There is no glow around it. The magenta is clean right up to the brass.'
      ]
    }),
  prop('bubble', 'Soap bubble', 1,
    'A round soap bubble: a clear ball with a thin bright rim, one small white highlight up and to the left, and nothing in the middle — you can see straight through it.',
    'Keep the reference\'s pale neutral grey (see below): the game gives each one its own colour, pale sea-blue under the water and bright rainbow hues over the paint pots. A cool bright rim, a white highlight.',
    'it is between a sixtieth and a twentieth of the width of the scene, rising and swelling as it goes.',
    [],
    {
      noun: 'bubble',
      tinted: 'the bubble\'s rim and the faint wash that clings inside it. The white highlight stays white',
      view: 'THE VIEW: flat and square-on, a single round bubble, exactly as the reference has it.',
      holes: 'A BUBBLE IS SEE-THROUGH. Its middle is a HOLE: the magenta runs right through it, and the painting is only its thin bright rim, the soft colour that clings to that rim, and the one white highlight. That is correct and must not be filled in.',
      not: [
        'Draw ONE bubble and nothing else, exactly as the reference shows it.',
        '· NO cluster, NO second bubble, NO froth, NO foam, NO water, NO fish, NO sky.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· ONE bubble, and you can see magenta through the middle of it.',
        '· Exactly one highlight, up and to the left.'
      ]
    }),
  prop('balloon', 'Party balloon', 1,
    'A party balloon: a plump rounded body a little taller than it is wide, pinched into a small knot at the bottom, with one soft white highlight up and to the left.',
    'Keep the reference\'s pale neutral grey (see below): the game gives every balloon in a bunch its own candy colour. A slightly deeper shadow down one side, and one white highlight.',
    'it is about a twenty-fifth of the width of the scene, one of five or six in a bunch.',
    [],
    {
      noun: 'balloon',
      tinted: 'the whole balloon, body and knot. The white highlight stays white',
      view: 'THE VIEW: flat and square-on, upright with the knot straight down, exactly as the reference has it. The game fans the bunch out and bobs each balloon.',
      not: [
        'Draw ONE balloon and nothing else, exactly as the reference shows it.',
        '· NO string, NO ribbon, NO curl of cord hanging from the knot, NO hand, NO other balloons, NO sky.',
        '· Every string is drawn by the game, from the fist that holds the bunch to wherever each balloon has drifted, and a painted one would hang in the wrong direction.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· One balloon, upright, with its knot at the bottom.',
        '· There is no string of any kind in the picture.'
      ]
    }),
  prop('snowflake', 'Snowflake', 1,
    'One small falling snowflake: a soft round flake of snow with the faintest six-armed structure showing through it — the way a flake reads as a soft white speck against a winter sky, not as a cut-out paper doily. THE REFERENCE IS A DIAGRAM, NOT A STYLE: it is a plain hard circle, because that is what a canvas fill is. It gives you the SIZE; the flake itself is soft-edged.',
    'White, with the palest cool blue in its shadowed lower half. Nothing else.',
    'it is between a two-hundredth and a hundredth of the width of the scene — a dozen of them drift down a whole sector.',
    [],
    {
      noun: 'snowflake',
      view: 'THE VIEW: flat and square-on, exactly as the reference has it. The game drifts it, sways it and sizes it.',
      holes: 'ITS EDGE IS SOFT. The flake thins away into the magenta at its rim rather than stopping at a line, and it has NO outline anywhere on it.',
      not: [
        'Draw ONE flake and nothing else, exactly as the reference shows it.',
        '· NO crisp cut-paper crystal, NO sharp needles, NO lace — at the size it is seen, that is a grey smudge.',
        '· NO other flakes, NO sky, NO ground, NO trail.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· ONE flake, soft-edged, with no outline.',
        '· It reads as a soft white speck, not as a snowflake ornament.'
      ]
    }),
  prop('confetti', 'Confetti', 1,
    'ONE small rectangle of party paper, twice as long as it is deep, with softly rounded corners and a very slight curl — a single scrap cut for throwing.',
    'Keep the reference\'s pale neutral grey (see below): the game gives each scrap one of the festival\'s four party colours. A slightly deeper tone along the curl.',
    'it is about a ninetieth of the width of the scene — sixteen of them fall through a whole sector.',
    [],
    {
      noun: 'scrap',
      tinted: 'the whole scrap',
      view: 'THE VIEW: flat and square-on, lying long side left to right, exactly as the reference has it. The game spins it and turns it edge-on as it falls.',
      not: [
        'Draw ONE scrap and nothing else, exactly as the reference shows it.',
        '· NO shower of confetti, NO second scrap, NO streamers, NO sky, NO crowd.',
        '· No text, letters or numbers.'
      ],
      checks: ['· ONE rectangle. There is not a second scrap anywhere in the picture.']
    }),
  prop('miniBalloon', 'Far hot-air balloon', 1,
    'A small, faraway hot-air balloon: a rounded envelope that narrows to a waist at the bottom, one pale stripe straight down its middle, two short cords, and a little brown wicker basket hanging under it.',
    'Keep the reference\'s pale neutral grey (see below) for the envelope: the game gives each balloon its own chapter colour. The stripe down its middle is cream, the basket warm brown.',
    'it is about a fifteenth of the height of the scene, drifting far off across the sky.',
    [],
    {
      noun: 'balloon',
      tinted: 'the envelope. The cream stripe down its middle, the cords and the brown basket stay as they are',
      view: 'THE VIEW: flat and square-on, upright, the basket straight below the envelope, exactly as the reference has it. The game drifts it and bobs it.',
      not: [
        'Draw ONLY the balloon, exactly as the reference shows it.',
        '· NO sky, NO clouds, NO birds, NO ground, NO people in the basket, NO flame, NO other balloons.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· One envelope, one stripe down its middle, two cords and one basket.',
        '· The magenta runs clean between the two cords, either side of the basket.'
      ]
    }),
  prop('boat', 'Far sailboat', 3,
    'A small faraway sailboat seen from the side, sailing to the RIGHT: a shallow curved hull with a white foam line under it, a thin mast, a tall pointed mainsail behind the mast and a smaller pointed sail in front of it.',
    'See the panels: each one is the same boat in a different pair of colours.',
    'it is about a fifteenth of the width of the scene, far out on the water.',
    [
      'Panel 1: a CORAL-RED hull, and the small front sail is GOLDEN YELLOW.',
      'Panel 2: a CORNFLOWER-BLUE hull, and the small front sail is CANDY PINK.',
      'Panel 3: a GOLDEN-YELLOW hull, and the small front sail is TURQUOISE.',
      'The boat is IDENTICAL in all three — the same hull, the same mast, the same two sails, the same size, in the same place on the panel. The big mainsail is WHITE in all three. ONLY the hull colour and the small front sail\'s colour change.'
    ],
    {
      noun: 'boat',
      facing: 'It sails to the RIGHT in every panel: the game mirrors it when it sails the other way.',
      not: [
        'Draw ONLY the boat and its own thin white foam line, exactly as the reference shows it.',
        '· NO sea, NO horizon, NO waves, NO wake, NO sky, NO gulls, NO harbour, NO people.',
        '· The sea is already painted and the boat is put on top of it.',
        '· No text, letters or numbers, and no flag.'
      ],
      checks: [
        '· Three boats in one row, all sailing right, all the same size and shape.',
        '· The big sail is white in all three.',
        '· Nothing under any of them but their own thin white foam line.'
      ]
    }),
  prop('kite', 'Kite (one half)', 1,
    'THE LEFT HALF of a diamond kite, cut straight down its middle: a tall three-cornered piece of kite cloth with its nose at the top, its one side-corner out to the LEFT, and its long tail-corner at the bottom. Its straight right edge is the kite\'s spine, and a short cross-spar runs from the left corner in to that spine.',
    'Keep the reference\'s pale neutral grey (see below): the game gives each half its own candy colour, and flies the two halves in two different ones. A plum spine and cross-spar.',
    'the whole kite is about a twelfth of the height of the scene, so this half is a narrow sliver of it, high in the sky.',
    [],
    {
      noun: 'kite half',
      tinted: 'the cloth. The spine down the straight right edge and the cross-spar stay plum',
      view: 'THE VIEW: flat and square-on, the nose straight up and the straight spine edge vertical on the RIGHT, exactly as the reference has it. The game tilts it as it flies.',
      not: [
        'THIS IS HALF A KITE, NOT A KITE. Draw only the left half, exactly as the reference shows it.',
        '· The game blits this picture twice — once as it is, once flipped over — to make one two-coloured kite, so a WHOLE diamond drawn here comes out as two kites on top of each other.',
        '· NO tail, NO bows, NO string, NO sky, NO clouds, NO hand.',
        '· The tail\'s bows are rebuilt every frame and the string reaches down to a peg the sector picks, so both are drawn by the game.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· Its right edge is a straight vertical line, top to bottom. That edge is where the two halves meet.',
        '· There is no tail and no string.'
      ]
    }),
  prop('pinwheel', 'Pinwheel blade', 1,
    'ONE curved blade of a paper pinwheel: a short straight edge at the hub on the LEFT, a straight top edge running out to a sharp point on the RIGHT, and a deep curve sweeping back underneath from that point to the hub — a scoop of paper caught by the wind.',
    'Keep the reference\'s pale neutral grey (see below): the game gives the four blades two alternating candy colours. A soft deeper tone where the paper curls away from the light.',
    'a whole pinwheel is about a twentieth of the width of the scene, so one blade is a quarter of that.',
    [],
    {
      noun: 'blade',
      tinted: 'the whole blade',
      view: 'THE VIEW: flat and square-on, the hub end at the LEFT and the blade reaching out to the RIGHT, exactly as the reference has it. The game turns four of these round the hub.',
      not: [
        'THIS IS ONE BLADE, NOT A PINWHEEL. Draw only the single blade, exactly as the reference shows it.',
        '· NO other blades, NO hub button, NO pin, NO stick, NO pole, NO wind lines, NO sky.',
        '· The game turns this one picture through four quarter-turns to make the wheel, and paints the hub button over the middle, so anything else drawn here appears four times.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· ONE blade. There is not a second blade anywhere in the picture.',
        '· Its narrow end is on the left, at the hub.'
      ]
    }),
  prop('note', 'Music note', 1,
    'A single music note: one round note head, tilted slightly, with a straight stem rising from its right side and a small curved flag hooking off the top of the stem.',
    'Keep the reference\'s pale neutral grey (see below): the game gives each note a soft lilac or a candy pink. A plum stem and flag.',
    'it is about a twentieth of the height of the scene, floating up from a carousel.',
    [],
    {
      noun: 'note',
      tinted: 'the note head. The stem and its flag stay plum',
      view: 'THE VIEW: flat and square-on, the stem straight up on the right of the head, exactly as the reference has it. The game floats it upwards and swells it.',
      not: [
        'Draw ONE note and nothing else, exactly as the reference shows it.',
        '· NO stave, NO bar lines, NO second note, NO beam joining two notes, NO carousel, NO sky.',
        '· No text, letters or numbers.'
      ],
      checks: ['· ONE note head, one stem, one flag.']
    }),
  prop('bee', 'Bee', 1,
    'A tiny round bee seen from above: a plump amber body seen end-on, with one pale, almost see-through wing lying over it and out to the upper left. No face, no legs, no stripes picked out — at this size it is a warm little blob with a wing, exactly as the reference draws it.',
    'Warm amber-gold with a deeper honey shadow underneath, and a milky white wing.',
    'it is about an eightieth of the width of the scene — three of them loop round a hive.',
    [],
    {
      noun: 'bee',
      view: 'THE VIEW: from above, flat and square-on, exactly as the reference has it. The game loops it round the hive.',
      not: [
        'Draw ONLY the bee, exactly as the reference shows it.',
        '· NO hive, NO flower, NO honey, NO trail, NO dotted flight line, NO sky.',
        '· NO face, NO eyes, NO legs, NO sting, NO antennae — at a fingernail\'s width they come out as mud.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· It is a warm round body with ONE pale wing over it.',
        '· Nothing under it: the magenta runs clean all round.'
      ]
    }),
  prop('windsock', 'Windsock', 1,
    'A striped cloth windsock, seen from the side and streaming to the RIGHT: a wide round mouth on the LEFT tapering to a narrower open end on the right, made of four bands of cloth — pink, white, pink, white, from the mouth outwards.',
    'Candy pink and white bands, with a soft deeper pink along the underside of each pink band.',
    'it is about a fifteenth of the width of the scene, on a pole above a cliff.',
    [],
    {
      noun: 'windsock',
      facing: 'It streams to the RIGHT: the game mirrors it and lifts it as the wind turns.',
      view: 'THE VIEW: flat and side-on, lying level with its mouth on the left, exactly as the reference has it. The game lifts it on its pole, so draw it lying level.',
      not: [
        'Draw ONLY the windsock, exactly as the reference shows it.',
        '· NO pole, NO mast, NO ring, NO bracket, NO rope, NO sky, NO cliff.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· Four bands: pink, white, pink, white, from the wide left mouth outwards.',
        '· It is open at BOTH ends — magenta shows through the mouth on the left and through the small end on the right.'
      ]
    }),
  prop('charm', 'Crystal charm', 1,
    'A single hanging crystal: a six-sided gem, tall and narrow, with straight sides, a pointed roof at the top and a flat foot — one bright facet down its left side and a darker facet down its right.',
    'Keep the reference\'s pale neutral grey (see below): the game gives each charm on the row its own gem colour. Paint it in three clear steps — a light facet, a mid face and a shadow facet — so the colour the game pours through it still reads as cut glass.',
    'it is about a thirtieth of the height of the scene, hanging from a line of them.',
    [],
    {
      noun: 'crystal',
      tinted: 'the whole crystal, every facet of it',
      view: 'THE VIEW: flat and square-on, standing upright with its point at the top, exactly as the reference has it. The game hangs it and sways it.',
      not: [
        'Draw ONLY the crystal, exactly as the reference shows it.',
        '· NO string, NO cord, NO cap, NO ring, NO hook, NO sparkle, NO glow, NO other crystals, NO sky.',
        '· The string is drawn by the game, from the rail down to wherever the sway has taken the charm.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· ONE crystal, upright, point at the top.',
        '· There is no string and no glow around it.'
      ]
    }),

  /* ── the nine a second pass of the census turned up ─────────────────── */

  prop('frond', 'Palm frond', 1,
    'ONE palm frond, rooted at the LEFT and reaching away to the RIGHT: a long, slim leaf-blade, drawn to a point at BOTH ends and widest a little past its middle, bowed gently UPWARDS along its length, with a darker rib running down it from root to tip. It is a narrow blade — about a seventh as deep as it is long — and its edge is softly feathered, not cut straight.',
    'Fresh storybook leaf-green, a shade deeper along its lower edge and paler where the light lands on top. The rib is a deeper green.',
    'it is about a tenth of the width of the scene — six of them make one palm crown.',
    [],
    {
      noun: 'frond',
      facing: 'It is rooted on the LEFT and reaches RIGHT, exactly as the reference draws it: the crown turns this one blade out to every angle and flips it for the fronds on the far side.',
      view: 'THE VIEW: flat and side-on, lying level with its root at the left, exactly as the reference has it. Draw it lying still — the palm does the swaying.',
      not: [
        'Draw ONE frond and nothing else, exactly as the reference shows it.',
        '· NO trunk, NO crown, NO other fronds, NO coconuts, NO sand, NO sky, NO shadow on the ground.',
        '· The trunk is already painted and the crown is fanned out on top of it. A second frond here appears six times over.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· ONE blade. There is not a second frond anywhere in the picture.',
        '· Its root is at the left edge of the shape and it bows upwards.'
      ]
    }),
  prop('coconuts', 'Coconuts', 1,
    'A little cluster of THREE coconuts hanging together under a palm crown: two side by side and one hanging below and between them, each one a plump round nut.',
    'Warm husk brown, a deeper brown underneath each nut and a soft lighter top where the light lands.',
    'the cluster is about a twenty-fifth of the width of the scene, tucked under a palm crown.',
    [],
    {
      noun: 'cluster',
      view: 'THE VIEW: flat and square-on, exactly as the reference has it — two nuts up, one hanging below between them.',
      not: [
        'Draw ONLY the three nuts, exactly as the reference shows it.',
        '· NO palm, NO trunk, NO fronds, NO leaves, NO stalk, NO sand, NO sky.',
        '· The palm is drawn around them by the game.',
        '· No text, letters or numbers.'
      ],
      checks: ['· Exactly THREE nuts — count them.']
    }),
  prop('flyer', 'Flying pegasus', 3,
    'A chubby little baby pegasus flying to the RIGHT, seen from the side: a round barrel body, a round head with a small muzzle, four short tucked legs, a soft curly mane and forelock, and a pair of feathered wings spread out and held level — one behind the body and one in front of it.',
    'See the panels: each one is the same pegasus in a different coat and mane.',
    'it is about a twelfth of the width of the scene, gliding past high in the sky.',
    [
      'Panel 1: a soft BLUSH-PINK coat with a SKY-BLUE mane and forelock.',
      'Panel 2: a pale BUTTER-YELLOW coat with a CANDY-PINK mane and forelock.',
      'Panel 3: a soft MINT-GREEN coat with a CANDY-PINK mane and forelock.',
      'It is the SAME pegasus in all three — the same pose, the same wings, the same size, in the same place on the panel, facing right. Its wings are cream-white in all three. ONLY the coat and the mane change colour.'
    ],
    {
      noun: 'pegasus',
      character: true,
      facing: 'It faces RIGHT in every panel: the game mirrors it when it flies the other way.',
      not: [
        'Draw ONLY the pegasus, exactly as the reference shows it.',
        '· NO clouds, NO sky, NO sparkles, NO trail, NO rainbow, NO ground, NO shadow beneath it.',
        '· NO saddle, NO bridle, NO rider.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· Three pegasi in one row, all facing right, all the same size and pose.',
        '· The wings are cream-white in all three.',
        '· Nothing under any of them. The magenta runs clean beneath every hoof.'
      ]
    }),
  prop('buoy', 'Channel buoy', 1,
    'A channel buoy standing in open water: a tall body that tapers upwards from a wide foot to a narrow top, banded white and red, with a flat collar round its foot and a small yellow lamp housing on a short neck at the very top.',
    'White with two coral-red bands, a coral-red collar at the foot, and a butter-yellow lamp housing.',
    'it is about a twentieth of the height of the scene, standing out on the bay.',
    [],
    {
      noun: 'buoy',
      view: 'THE VIEW: flat and square-on, standing straight up, exactly as the reference has it. The game leans it and bobs it on the swell.',
      not: [
        'Draw ONLY the buoy, exactly as the reference shows it.',
        '· NO water, NO waves, NO foam, NO reflection, NO rope, NO chain, NO gulls, NO sky.',
        '· The sea is already painted, and the game draws the ring of foam at its waterline every frame.',
        '· NO glow, NO beam, NO halo around the lamp — its light pulses, and the game draws it over the painting.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· It stands upright, wide at the foot and narrow at the top.',
        '· There is no water and no glow anywhere in the picture.'
      ]
    }),
  prop('canoe', 'Canoe', 1,
    'A long wooden canoe seen from the side, empty: a shallow boat with both ends curving up into soft points, a pale rim running the length of its top edge and a darker band along its waterline.',
    'Keep the reference\'s pale neutral grey (see below): the game gives the boat the lake\'s own colour. Paint it in three clear steps — a light rim, a mid hull and a darker band low down — so the colour the game pours through it still reads as a painted boat.',
    'it is about a seventh of the width of the scene, drifting on an underground lake.',
    [],
    {
      noun: 'canoe',
      tinted: 'the whole hull — its rim, its body and its waterline band together',
      view: 'THE VIEW: flat and side-on, floating level, exactly as the reference has it. The game bobs it along the lake.',
      not: [
        'Draw ONLY the boat\'s hull, exactly as the reference shows it.',
        '· NO water, NO ripples, NO reflection, NO paddle, NO oars, NO cargo, NO passengers, NO cave.',
        '· NO pole and NO lantern — the canoe carries a lit lantern on a pole, and the game draws both of them over this picture. One painted here would end up as a second lantern.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· One empty hull, level, with both ends curving up.',
        '· There is no pole, no lantern and no water in the picture.'
      ]
    }),
  prop('mineCart', 'Mine cart', 1,
    'A wooden mine cart seen from the side, WITHOUT ITS WHEELS: a tub that flares outwards as it rises, a heavy rail capping its top edge, a row of round rivet heads down its side, and a heap of cut gems piled up above the rim, spilling a little over it.',
    'Keep the reference\'s pale neutral grey (see below) for the tub: the game gives each mine its own timber colour. Paint the tub in three clear steps — a lit face, a mid body and a shadowed end — so the colour still reads as planks. The gems on top keep their OWN jewel colours: pink, gold, aqua, violet.',
    'it is about a fifteenth of the width of the scene, trundling along a rail.',
    [],
    {
      noun: 'cart',
      tinted: 'the tub, its top rail and its rivets. The gems piled on top keep their own colours',
      view: 'THE VIEW: flat and side-on, standing level, exactly as the reference has it. The game tips it along the rail.',
      not: [
        'THE CART HAS NO WHEELS IN THIS PICTURE. Draw the tub and its load, exactly as the reference shows them.',
        '· NO wheels, NO axles, NO undercarriage — the wheels turn on their own pins and the game draws them over this picture, so a painted pair would sit beside the real ones.',
        '· NO rails, NO sleepers, NO tunnel, NO rock, NO ground, NO shadow beneath it.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· There are NO wheels anywhere in the picture.',
        '· The gem heap sits above the rim and is clearly made of separate cut gems.'
      ]
    }),
  prop('cartWheel', 'Cart wheel', 1,
    'One small cart wheel seen face-on: a solid round disc with a ring rim, four straight spokes crossing it in a plus shape, and a small round hub in the middle.',
    'A deep jewel blue for the disc with a paler ice-blue rim, spokes and hub.',
    'it is about a seventieth of the width of the scene — two of them carry a mine cart.',
    [],
    {
      noun: 'wheel',
      view: 'THE VIEW: flat and square-on, face-on, with the spokes in an upright plus, exactly as the reference has it. The game spins it, so draw it standing still.',
      not: [
        'Draw ONE wheel and nothing else, exactly as the reference shows it.',
        '· NO cart, NO axle, NO rail, NO second wheel, NO rock, NO ground.',
        '· The cart is already painted and the wheel turns under it.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· Exactly FOUR spokes, in an upright plus.',
        '· It is a solid disc — no magenta through it anywhere.'
      ]
    }),
  prop('heart', 'Little heart', 1,
    'One plump storybook heart: two soft round lobes at the top meeting in a shallow dip, and a gentle point at the bottom. Wider than it is tall, and cheerful rather than sharp.',
    'Keep the reference\'s pale neutral grey (see below): the game gives each heart its own colour, a candy pink over a happy creature and a deep rose on the fair\'s banner. One soft highlight up and to the left.',
    'it is about a fiftieth of the width of the scene — three of them float up from a happy creature.',
    [],
    {
      noun: 'heart',
      tinted: 'the whole heart',
      view: 'THE VIEW: flat and square-on, upright with its point straight down, exactly as the reference has it. The game floats it up, swells it and fades it away.',
      not: [
        'Draw ONE heart and nothing else, exactly as the reference shows it.',
        '· NO ribbon, NO string, NO arrow, NO second heart, NO sparkles, NO background.',
        '· No text, letters or numbers.'
      ],
      checks: ['· ONE heart, upright. There is not a second one in the picture.']
    }),
  prop('rainbowArc', 'Rainbow arc', 1,
    'A low rainbow arch of SIX bands, spanning a little less than half a circle: it rises from the LEFT, crosses the top, and comes down on the RIGHT, its two feet at the same height. The bands are even, side by side, and softly rounded at both ends.',
    'The six storybook rainbow bands in order from the outside in: cherry red, tangerine, sunny yellow, lime green, sky blue, soft violet. Clean and bright, like wet paint.',
    'it is about a sixth of the width of the scene, thrown up by the spray at the foot of a waterfall.',
    [],
    {
      noun: 'arc',
      view: 'THE VIEW: flat and square-on, its two feet level, exactly as the reference has it.',
      holes: 'THE ARCH IS OPEN UNDERNEATH. The whole space below and inside the bow is a HOLE — the waterfall is painted behind it and the magenta must run clean right through it. Only the six bands themselves are painted.',
      not: [
        'Draw ONLY the six bands, exactly as the reference shows them.',
        '· NO clouds, NO pot of gold, NO sun, NO sparkles, NO water, NO spray, NO sky.',
        '· NO full semicircle and NO full circle — the arch stops where the reference stops.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· SIX bands — count them.',
        '· You can see magenta right through the middle of the arch.'
      ]
    }),
  prop('swingSeat', 'Swing seat', 1,
    'A single plank of wood, cut as a swing seat: a long, low bar with softly rounded corners, a little thicker than a board and clearly a piece of timber.',
    'Warm mid-brown timber, a deeper brown along its lower edge and a paler top where the light lands. Its grain shows as a few soft lines along its length.',
    'it is about a twentieth of the width of the scene, hanging from a treehouse bough.',
    [],
    {
      noun: 'seat',
      view: 'THE VIEW: flat and square-on, lying level, exactly as the reference has it. It stays level however far the swing has travelled.',
      not: [
        'Draw ONLY the plank, exactly as the reference shows it.',
        '· NO ropes, NO chains, NO knots, NO bough, NO tree, NO ground, NO shadow beneath it.',
        '· The two ropes are drawn by the game, from the bough down to wherever the swing has got to.',
        '· No text, letters or numbers.'
      ],
      checks: ['· One plank, level, with nothing attached to it.']
    }),
  prop('cabin', 'Cable car', 1,
    'A little cable-car cabin hanging from a short arm: a slim upright arm with a small round gold knob at its very top, a wide curved roof cap below it, and under that a rounded box of a cabin with three tall windows in a row along its side.',
    'Keep the reference\'s pale neutral grey (see below) for the cabin and its roof: the game gives it the pass\'s own colour. Paint it in three clear steps — a lit body, a shaded end and a roof band — so the colour still reads as a painted cabin. The knob is warm gold and the windows are pale blue glass.',
    'it is about a twelfth of the width of the scene, hanging over a mountain pass.',
    [],
    {
      noun: 'cable car',
      tinted: 'the cabin body, its shaded end and its roof band. The gold knob and the pale glass stay as they are',
      view: 'THE VIEW: flat and square-on, hanging straight down with the arm at the top, exactly as the reference has it. The game slides it along the cable.',
      not: [
        'Draw ONLY the cabin and its arm, exactly as the reference shows them.',
        '· NO cable, NO wire, NO rope, NO pylon, NO tower, NO mountain, NO sky, NO passengers.',
        '· The cable is drawn by the game, between two points the mountain picks, and this hangs from it.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· THREE windows in a row — count them.',
        '· There is no cable anywhere in the picture.'
      ]
    }),
  prop('star', 'Five-point star', 1,
    'A five-pointed star: five even points around a small middle, the classic storybook star, with one point straight up.',
    'Keep the reference\'s pale neutral grey (see below): the game gives it a warm cream. Brightest in the middle, softening a little towards each point.',
    'it is about a fiftieth of the width of the scene — the finial on top of a wind-vane tower.',
    [],
    {
      noun: 'star',
      tinted: 'the whole star, right out to its five points',
      view: 'THE VIEW: flat and square-on, one point straight up, exactly as the reference has it.',
      not: [
        'Draw ONLY the star, exactly as the reference shows it.',
        '· FIVE points, not four, not six, not eight.',
        '· NO glow, NO halo, NO ring, NO burst of little rays, NO pole, NO tower, NO sky — the glow behind it pulses and the game draws it under the painting.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· Exactly five points, one of them straight up.',
        '· There is no glow around it. The magenta is clean right up to its edges.'
      ]
    }),

  /* ── the six a third sweep took back off the KEPT list ──────────────── */
  /*
   * Not a fourth census: a re-reading of §4b's own kept list against the
   * silhouette test — freeze one frame, and is there a shape with an edge? —
   * rather than against how the thing is coded. Three of its reasons turned
   * out to describe a matrix: a BEND is a shear, a FORESHORTENING is a
   * non-uniform scale, and a band SCROLLING under a clip is a texture tile.
   * The lights, the path-followers and the reflections stay where they are.
   */

  prop('kelp', 'Kelp blade', 1,
    'ONE blade of kelp, rooted at the BOTTOM and growing straight UP: a long, slim ribbon of seaweed, widest around its middle and drawn to a soft point at the top, bowed gently out to one side along its length. Its edge waves in and out a little, the way a water-weed does — it is a ribbon, not a leaf and not a spike.',
    'Fresh sea-green, deeper along the shaded edge and paler where the light catches the turn of the ribbon.',
    'it is about a fifteenth of the width of the scene, standing on the sea floor with the water painted behind it.',
    [],
    {
      noun: 'blade',
      facing: 'It is rooted at the BOTTOM and reaches UP, exactly as the reference draws it: the game leans its tip over as the current takes it.',
      view: 'THE VIEW: flat and side-on, standing upright with its root at the bottom, exactly as the reference has it. Draw it standing still — the water does the swaying.',
      not: [
        'Draw ONE blade and nothing else, exactly as the reference shows it.',
        '· NO clump, NO second or third blade, NO holdfast, NO rock, NO sand, NO sea floor, NO water, NO bubbles, NO fish.',
        '· The sea floor is already painted, and the game stands two or three of these on it side by side. A second blade here appears twice over.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· ONE blade. There is not a second one anywhere in the picture.',
        '· Its root is at the bottom edge of the shape and its tip is at the top.'
      ]
    }),
  prop('flame', 'Brazier flame', 3,
    'A cute storybook campfire flame of FOUR rounded tongues rising from one base: a tall wide tongue in the middle, a shorter one either side of it, and a small bright tongue low in the middle in front. Each tongue is a soft, plump leaf-shape that rises from the base and curls to a rounded point — no sharp spikes, no wisps, no sparks.',
    'A warm orange outer flame, a lighter amber tongue in the middle and a sunny butter-yellow heart low at the front. Hot and cheerful, the colours of a bonfire in a picture book.',
    'it is about a twentieth of the width of the scene, burning in a stone brazier beside a temple.',
    [
      'Panel 1: the flame leans a LITTLE TO THE LEFT — all four tongues lean over together, their tips curling left. It is a small lean, exactly as far as the reference leans it: the game plays the three in a loop and a big lean makes the fire jump rather than dance.',
      'Panel 2: the flame stands UPRIGHT — all four tongues straight up.',
      'Panel 3: the flame leans a LITTLE TO THE RIGHT — the same small lean the other way.',
      'It is the SAME flame in all three: the same four tongues, the same heights, the same widths, the same colours, rising from the same base in the same place on the panel. ONLY the lean changes.'
    ],
    {
      noun: 'flame',
      view: 'THE VIEW: flat and square-on, rising from a flat base at the bottom, exactly as the reference has it.',
      not: [
        'Draw ONLY the flame, exactly as the reference shows it.',
        '· NO brazier, NO bowl, NO logs, NO coals, NO stones, NO smoke, NO sparks, NO embers, NO ground, NO shadow beneath it.',
        '· NO glow, NO halo, NO ring of light around it — the fire\'s warm light pulses and the game washes it in UNDER the painting.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· Three flames in one row, all the same flame, leaning left then upright then right.',
        '· FOUR tongues in each — count them.',
        '· The base of the flame sits at the same height in all three.',
        '· Nothing under any of them: the magenta runs clean along every base.'
      ]
    }),
  prop('waterfall', 'Waterfall', 1,
    'A fall of water coming straight down a rock face and the white foam it throws where it lands: a tall, narrow column of falling water with softly rounded top and bottom corners, its surface running with long vertical streaks of white, and at its foot three round lobes of churned white foam — a bigger one in the middle and a smaller one either side, overlapping into ONE bank of foam rather than three separate balls.',
    'Clear storybook water-blue, a little deeper down the shaded side of the column and paler where it runs fastest; the foam at the foot is white with a soft blue shadow under its lobes.',
    'it is about a fourteenth of the width of the scene and more than a quarter of its height — a tall ribbon of water down a grey rock face.',
    [],
    {
      noun: 'waterfall',
      view: 'THE VIEW: flat and square-on, falling straight down, exactly as the reference has it. Draw it as a still — the game slides bright streaks down it.',
      not: [
        'Draw ONLY the falling water and its foam, exactly as the reference shows them.',
        '· NO rock, NO cliff, NO ledge, NO pool, NO river, NO ripples spreading out, NO plants, NO sky, NO rainbow, NO spray in the air.',
        '· The rock face is already painted and the fall comes down IN FRONT of it.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· The column is a good deal more than twice as tall as it is wide.',
        '· THREE lobes of foam at the foot, and nothing else below them.',
        '· It is water alone: no rock anywhere in the picture.'
      ]
    }),
  prop('streak', 'Falling streak', 1,
    'One streak of fast-falling water: a long, slim vertical bar of bright water with both ends fully rounded, brightest down its middle and softening away towards both ends — the streak you see IN a waterfall, not a drop and not a splash. IT IS A DIAGRAM OF A SOFT THING: the reference draws it as a hard-edged bar because a flat fill cannot fade, and what is wanted is that bar with a soft, feathered edge all round it.',
    'Keep the reference\'s pale neutral grey (see below): the game gives each fall its own — white water, rainbow-lit spray and warm honey sand all use this one streak. It is brightest along its middle and thins away to nothing at its two ends.',
    'it is about a seventieth of the width of the scene and about two and a half times as long as it is wide — a dozen of them slide down one waterfall.',
    [],
    {
      noun: 'streak',
      tinted: 'the whole streak, end to end',
      view: 'THE VIEW: flat and square-on, standing upright, exactly as the reference has it. The game slides it down the fall and squeezes it to each fall\'s own length.',
      holes: 'ITS ENDS AND EDGES ARE SOFT. The streak thins away into the magenta at its two rounded ends and all along its sides rather than stopping at a line, and magenta showing through its faint outer edge is exactly right. It has NO outline anywhere on it — no rim, no ring, no drawn edge.',
      not: [
        'Draw ONE streak, exactly as the reference shows it.',
        '· NO waterfall, NO second streak, NO droplets, NO splash, NO foam, NO rock, NO sparkle, NO star.',
        '· The fall itself is painted and this slides down inside it, a dozen at a time.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· ONE streak, upright, with both ends rounded.',
        '· There is no outline on it anywhere.'
      ]
    }),
  prop('vane', 'Weather-vane arrow', 1,
    'A weather-vane arrow lying level and pointing RIGHT: a slim straight shaft, a solid triangular arrowhead at its right end, and a tail fin at its left end — a triangle pointing left whose right-hand edge is scooped hollow, so it reads as a flight. A small round boss sits on the shaft at its middle, where it turns on its mast.',
    'A butter-gold arrowhead and a butter-gold boss, a candy-pink fletching, and a plum shaft — the little gilded arrow on top of a storybook tower.',
    'it is about a tenth of the width of the scene, turning on the mast on top of the wind-vane tower.',
    [],
    {
      noun: 'arrow',
      facing: 'It points RIGHT, exactly as the reference draws it: the game squeezes it narrow and flips it as it swings round its mast.',
      view: 'THE VIEW: flat and side-on, lying dead level, at its full stretch, exactly as the reference has it. Draw it standing still and at its widest.',
      not: [
        'Draw ONLY the arrow, exactly as the reference shows it.',
        '· NO mast, NO pole, NO tower, NO roof, NO cross-arms, NO N/E/S/W letters, NO cockerel, NO star, NO sky, NO clouds.',
        '· The mast and its cross-arms are already painted and this turns in front of them.',
        '· No text, letters or numbers — a weather vane usually carries compass letters and this one must not.'
      ],
      checks: [
        '· One arrow, level, pointing right, with a hollow-backed tail fin at the left.',
        '· There is no mast and no lettering anywhere in the picture.'
      ]
    }),
  prop('gondola', 'Ferris gondola', 1,
    'A little ferris-wheel gondola hanging from a pin: a short straight hanger at the top, a wide curved canopy below it like a shallow dome, and under that a rounded box of a car — square at the shoulders, fully rounded along the bottom — with one wide window across its front.',
    'Keep the reference\'s pale neutral grey (see below) for the car and its canopy: the game gives each of the eight its own party colour. Paint it in clear steps — a lit car, a darker canopy over it — so the colour still reads as a painted car. The window is pale blue glass.',
    'it is about a twentieth of the width of the scene, one of eight hanging round a ferris wheel.',
    [],
    {
      noun: 'gondola',
      tinted: 'the car and the canopy above it. The pale blue window stays as it is',
      view: 'THE VIEW: flat and square-on, hanging straight down with the hanger at the top, exactly as the reference has it. The game swings it a little and carries it round the wheel.',
      not: [
        'Draw ONLY the gondola, exactly as the reference shows it.',
        '· NO wheel, NO rim, NO spokes, NO bulbs, NO passengers, NO sky, NO ground, NO shadow beneath it.',
        '· The wheel is drawn by the game, turning behind it, and this hangs level from one of its pins.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· ONE window, and it is wider than it is tall.',
        '· There is no wheel and no spoke anywhere in the picture.',
        '· Nothing under it: the magenta runs clean beneath its rounded foot.'
      ]
    }),

  /* ── the sectors' live layers: the paint-outstanding pass (2026-09-24) ── */
  /*
   * What the four earlier passes left drawn in the sectors' live layer, from
   * `paint-outstanding.md`: a tap creature's log where the sector painting has
   * none, the rescues' beds and nests, the Bloom's bunny and flower heads, the
   * carousel's drum and horses, and the small silhouettes a transform carries.
   * The same test decided each one — freeze a frame: is there a shape with an
   * edge? — and art-roadmap.md's section of that date lists the ones it said
   * no to, and why.
   */

  prop('hollowLog', 'Hollow log', 1,
    'A short hollow log lying on its side, seen from the side: a rounded length of bark with a strip of green moss along its top, its RIGHT end sawn flat to show a pale round cut face with a darker ring inside it, and its LEFT end the open mouth of the hollow, seen as a darker oval rim just showing past the bark. There is NOTHING in it or on it.',
    'Warm mid-brown bark with a deeper brown shadow along its underside, a pale honey-cream cut face with a soft tan ring, a fresh moss green along the top, and a darker brown rim at the hollow end.',
    'it is about a tenth of the width of the scene — a little log lying in a meadow.',
    [],
    {
      noun: 'log',
      view: 'THE VIEW: flat and side-on, lying level, the cut face on the RIGHT and the hollow end on the LEFT, exactly as the reference has it.',
      not: [
        'Draw ONLY the log, exactly as the reference shows it.',
        '· NO creature, NO sprite, NO face, NO eyes — a little moss-sprite lives in this log and is painted separately; the game pops it up from behind the bark, so one painted here ends up as a second.',
        '· NO grass, NO flowers, NO mushrooms, NO ground, NO shadow beneath it — the meadow is already painted and the log is put on top of it.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· One log, lying level, cut face on the RIGHT, hollow end on the LEFT.',
        '· It is EMPTY: nothing peeks out of it and nothing sits on it.',
        '· Nothing under it: the magenta runs clean beneath the log.'
      ]
    }),
  prop('mossBed', 'Moss bed', 1,
    'A low, flat bed of soft moss: an oval cushion of moss lying on the ground, about four times as wide as it is tall, gently domed, its edge soft and tufted rather than cut.',
    'A soft, deep moss green, a little lighter along its top where the light lands and a little deeper round its lower edge.',
    'it is about a fourteenth of the width of the scene — the little bed a sleeping sprite lies on.',
    [],
    {
      noun: 'bed',
      view: 'THE VIEW: flat and side-on, lying level, exactly as the reference has it.',
      not: [
        'Draw ONLY the moss bed, exactly as the reference shows it.',
        '· NO sprite, NO creature, NO flowers, NO stones, NO grass round it, NO shadow beneath it — the little sprite that sleeps on it is painted separately and put on top.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· One flat oval of moss, about four times as wide as it is tall.',
        '· Nothing on it and nothing under it.'
      ]
    }),
  prop('rockNest', 'Rock nest', 1,
    'A small nest of rock: a low, rounded rim of cave-stone that rises at both ends and dips in the middle, like a cupped hand, with a dark hollow showing behind the rim where something has been lying. A stone cradle, EMPTY.',
    'Soft cave-lilac stone with a deeper violet shadow on its lower right, and a deep violet hollow behind the rim.',
    'it is about a seventh of the width of the scene, on the floor of a crystal cave.',
    [],
    {
      noun: 'nest',
      view: 'THE VIEW: flat and side-on, lying level, exactly as the reference has it.',
      not: [
        'Draw ONLY the rock nest, exactly as the reference shows it.',
        '· It is EMPTY. NO crystal, NO shard, NO gem, NO creature in it — the Shard of Clear Light that sleeps in it is painted separately and stands up out of it, so one painted here ends up as a second.',
        '· NO glow, NO rainbow, NO cave floor, NO other rocks, NO shadow beneath it.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· The hollow is empty: no crystal and no gem anywhere in the picture.',
        '· The rim rises at BOTH ends and dips in the middle.',
        '· Nothing under it: the magenta runs clean beneath the stone.'
      ]
    }),
  prop('iceBlock', 'Block of ice', 1,
    'A block of clear ice with a cap of snow: a rounded block of pale blue ice, a little wider than it is tall, with three white frost streaks running down inside it, and a soft lumpy cap of snow along its top edge — three round lobes, the middle one the biggest.',
    'Pale icy blue with a cooler blue shade down one side and bright white frost streaks; the snow cap soft white with a faint lilac shadow underneath it.',
    'it is about an eighth of the width of the scene — a block of ice something small is frozen inside.',
    [],
    {
      noun: 'block',
      view: 'THE VIEW: flat and square-on, standing level on its flat foot, exactly as the reference has it. The game melts it by shrinking it, so draw it whole.',
      not: [
        'Draw ONLY the ice block and its snow cap, exactly as the reference shows them.',
        '· The ice is EMPTY and SOLID. NO star, NO crystal, NO creature, NOTHING frozen inside it — the thing asleep in it is painted separately, and the game lays this block over it half see-through. So paint the ice as a solid, opaque block: do not paint it transparent and do not show anything through it.',
        '· NO snow drift, NO ground, NO icicles hanging off it, NO sparkles, NO glow, NO shadow beneath it.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· The block is EMPTY: nothing inside the ice.',
        '· THREE white streaks inside the ice, and THREE lobes of snow on top, the middle one biggest.',
        '· Nothing under it: the magenta runs clean along its foot.'
      ]
    }),
  prop('bunny', 'Bunny', 1,
    'A small fluffy white bunny sitting side-on and facing RIGHT: a round body, a round head in front of it, two long upright ears leaning back a little with pink insides, a small round tail puff behind, one dot of an eye and a small pink nose.',
    'Snow white with a pale lilac shadow along its underside, soft pink inside the ears, a pink nose, a plum eye.',
    'it is about a thirteenth of the height of the scene — a bunny hopping through a flower meadow.',
    [],
    {
      noun: 'bunny',
      facing: 'It faces RIGHT: its NOSE toward the right-hand edge, its TAIL toward the left. The game mirrors this painting itself when it hops the other way, so one painted facing left is backwards everywhere and unusable.',
      view: 'THE VIEW: side-on and flat, sitting level with its feet along the bottom, exactly as the reference shows it. One eye, on the near side of the head.',
      not: [
        'Draw ONLY the bunny, exactly as the reference shows it.',
        '· NO grass, NO flowers, NO ground, NO shadow beneath it — the game draws its shadow on the grass itself, and one painted here is stuck to it in mid-hop.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· TWO long ears standing up.',
        '· FACING: the nose is nearer the RIGHT edge than the tail is.',
        '· Nothing under it: the magenta runs clean beneath its feet.'
      ]
    }),
  prop('flowerHead', 'Flower head', 1,
    'ONE round flower head seen face-on: five round petals of the same size set evenly round a round butter-yellow middle — a simple storybook daisy-flower.',
    'Keep the reference\'s pale neutral grey (see below) for the PETALS: the game gives each flower its own colour. The middle is a warm butter yellow.',
    'it is about a thirtieth of the width of the scene, nodding on top of a tall stem.',
    [],
    {
      noun: 'flower',
      tinted: 'the five petals. The butter-yellow middle stays as it is',
      view: 'THE VIEW: flat and square-on, face-on, exactly as the reference has it. The game turns it slowly, so draw it standing still.',
      not: [
        'Draw ONE flower head and nothing else, exactly as the reference shows it.',
        '· NO stem, NO leaves, NO second flower, NO bee, NO grass.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· FIVE petals — count them.',
        '· There is no stem and no leaf.'
      ]
    }),
  prop('carouselDrum', 'Carousel drum', 1,
    'The centre column of a merry-go-round: a tall rounded drum of cream panels with a gold band round its top and another round its foot, two tall oval mirrors of pale blue glass set side by side into its front, and its right-hand part in soft shadow.',
    'Warm cream with a deeper cream shadow on its right, bright gold bands, pale sky-blue mirror glass.',
    'it is about a tenth of the width of the scene and a quarter of its height — the drum at the heart of a carousel.',
    [],
    {
      noun: 'drum',
      view: 'THE VIEW: flat and square-on, standing upright, exactly as the reference has it.',
      not: [
        'Draw ONLY the drum, exactly as the reference shows it.',
        '· NO roof, NO canopy, NO poles, NO horses, NO platform, NO light bulbs, NO ground, NO shadow beneath it.',
        '· The canopy above it and the platform under it are already painted, and the carousel\'s horses go round in front of it and behind it — a horse painted here ends up standing still while the others turn.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· TWO oval mirrors, side by side.',
        '· No horse and no pole anywhere in the picture.'
      ]
    }),
  prop('carouselHorse', 'Carousel unicorn', 6,
    'A little carousel unicorn seen side-on and facing RIGHT, as if prancing: a round body, four short legs (the near two stretched out, the far two tucked), a round head on a short neck, a small pointed ear, a gold spiral horn, a curly mane and tail made of a few round tufts, a small saddle on its back, and one dot of an eye.',
    'See the panels: each one is the same unicorn in its own coat, mane and saddle. The horn is gold in all six.',
    'it is about a fifteenth of the width of the scene — one of six going round on a carousel.',
    [
      'Panel 1: a CREAM coat, a CANDY-PINK mane and tail, a SKY-BLUE saddle.',
      'Panel 2: a BLUSH-PINK coat, a SKY-BLUE mane and tail, a LEMON saddle.',
      'Panel 3: a PALE SKY-BLUE coat, a LEMON mane and tail, a CANDY-PINK saddle.',
      'Panel 4: a BUTTER-YELLOW coat, a LILAC mane and tail, a MINT saddle.',
      'Panel 5: a MINT coat, a CORAL mane and tail, a LILAC saddle.',
      'Panel 6: a LILAC coat, a MINT mane and tail, a CORAL saddle.',
      'It is the SAME unicorn in all six — the same pose, the same size, the same gold horn, in the same place on the panel, facing right. ONLY the coat, the mane and tail, and the saddle change colour. The coats are all soft and pale; the manes and saddles are the bright ones.'
    ],
    {
      noun: 'unicorn',
      character: true,
      facing: 'It faces RIGHT in every panel: the game mirrors it for the horses going round the other way.',
      not: [
        'Draw ONLY the unicorn, exactly as the reference shows it.',
        '· NO pole through it, NO carousel, NO platform, NO canopy, NO rider, NO ground, NO shadow beneath it.',
        '· The brass pole it rides on is drawn by the game, straight through its back — a painted one ends up beside it.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· SIX unicorns in one row, all facing right, all the same size and pose.',
        '· ONE gold horn on each.',
        '· No pole anywhere in the picture.',
        '· Nothing under any of them: the magenta runs clean beneath every hoof.'
      ]
    }),
  prop('gnomon', 'Sundial gnomon', 1,
    'The pointer of a sundial: ONE slim triangle of polished gold standing up and leaning back to the LEFT — its short foot at the bottom right, its long edge running up to a point at the top left.',
    'Warm polished gold, brighter on its lit face and a deeper amber along its shaded edge.',
    'it is about a thirtieth of the width of the scene — the pointer standing on a sundial.',
    [],
    {
      noun: 'pointer',
      view: 'THE VIEW: flat and square-on, leaning exactly as the reference has it, its point at the top LEFT.',
      not: [
        'Draw ONLY the gold triangle, exactly as the reference shows it.',
        '· NO dial, NO sun face, NO column, NO numbers round a dial, NO shadow on anything, NO ground.',
        '· The dial and its sun are already painted, and the hour\'s shadow is drawn by the game and moves.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· ONE gold triangle, its point at the top LEFT.',
        '· No dial and no shadow anywhere in the picture.'
      ]
    }),
  prop('planet', 'Little planet', 1,
    'A little ringed planet: a round ball with a slim ring round it, the ring tilted so it rises a little to the RIGHT and crosses in front of the ball.',
    'Keep the reference\'s pale neutral grey (see below) for the BALL: the game gives each of the three its own pastel. The ring is the warm deep plum the whole game is inked in.',
    'it is about a fortieth of the width of the scene — one of three little planets riding a halo round a throne of stars.',
    [],
    {
      noun: 'planet',
      tinted: 'the round ball. The ring stays plum',
      view: 'THE VIEW: flat and square-on, the ring tilted exactly as the reference has it.',
      not: [
        'Draw ONE planet and nothing else, exactly as the reference shows it.',
        '· NO stars, NO moons, NO sparkles, NO glow, NO halo, NO sky, NO orbit line.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· ONE ball and ONE ring round it.',
        '· Nothing under it and no glow round it.'
      ]
    }),
  prop('snowball', 'Snowball', 1,
    'A round snowball: one plump ball of packed snow with a single soft curved streak on its lower right, showing it is rolling.',
    'Snow white with a soft lilac shadow on its underside, and a lilac streak.',
    'it is between a fortieth and a twentieth of the width of the scene — it grows as it rolls down a sledging hill.',
    [],
    {
      noun: 'snowball',
      view: 'THE VIEW: flat and square-on, a round ball, the streak low on its right, exactly as the reference has it. The game spins it as it rolls.',
      not: [
        'Draw ONE snowball and nothing else, exactly as the reference shows it.',
        '· NO hill, NO snow on the ground, NO track behind it, NO puffs, NO flakes, NO shadow beneath it.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· One round ball with ONE curved streak on it.',
        '· Nothing under it: the magenta runs clean all round.'
      ]
    }),
  prop('kiteBow', 'Kite-tail bow', 1,
    'ONE bow from a kite\'s tail: two little triangles of cloth pointing in to meet at a knot in the middle, one flaring out to the LEFT and one to the RIGHT — a bow-tie.',
    'Keep the reference\'s pale neutral grey (see below): the game gives each bow one of its kite\'s two colours. A soft deeper tone where the cloth folds in to the knot.',
    'it is about a sixtieth of the width of the scene — three of them are tied along a kite\'s tail.',
    [],
    {
      noun: 'bow',
      tinted: 'both triangles — the whole bow',
      view: 'THE VIEW: flat and square-on, the two triangles level either side of the knot, exactly as the reference has it.',
      not: [
        'Draw ONE bow and nothing else, exactly as the reference shows it.',
        '· NO string, NO tail line through it, NO kite, NO second bow, NO sky.',
        '· The tail is a line the game draws waving through the sky, and every bow on it is this one picture tied along it.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· ONE bow: two triangles meeting in the middle.',
        '· There is no string anywhere in the picture.'
      ]
    }),
  prop('bubbleRing', 'Bubble ring', 1,
    'A soap-bubble RING: a floating ring of bubble skin, like a little doughnut of soap film seen face-on — an upright oval with its middle OPEN — and one small white highlight on its upper left.',
    'Clear pale aqua soap film with a faint rainbow sheen round the ring, a bright rim, and one white highlight.',
    'it is between a thirtieth and a tenth of the height of the scene — it swells as it drifts up from a sea-foal\'s mouth.',
    [],
    {
      noun: 'ring',
      view: 'THE VIEW: flat and square-on, an upright oval, exactly as the reference has it. The game swells it and floats it away.',
      holes: 'THE RING IS OPEN IN THE MIDDLE. The oval in its centre is a HOLE: the magenta runs clean through it — the sea is painted behind it. Only the ring of soap skin, its rim and its highlight are painted.',
      not: [
        'Draw ONE ring and nothing else, exactly as the reference shows it.',
        '· NO other bubbles, NO foal, NO water, NO splash, NO sky.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· ONE ring, an upright oval, with magenta showing through its open middle.',
        '· One white highlight, on its upper left.'
      ]
    }),
  prop('canoePole', 'Canoe lantern pole', 1,
    'A bent wooden pole: a slim round staff rising straight up and then curving over at the top into a short hook that points to the RIGHT, like a shepherd\'s crook — the pole a lantern hangs from at the back of a little boat.',
    'Warm honey-brown wood, a little darker along its shaded side.',
    'it is about a seventh of the height of the scene, standing in a canoe on an underground lake.',
    [],
    {
      noun: 'pole',
      view: 'THE VIEW: flat and side-on, the staff upright and its hook curving over to the RIGHT at the top, exactly as the reference has it.',
      not: [
        'Draw ONLY the pole, exactly as the reference shows it.',
        '· NO lantern, NO chain, NO hook hardware, NO canoe, NO water, NO cave.',
        '· The lantern hanging from its tip and the canoe it stands in are painted separately — a lantern painted here ends up as a second one.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· One pole, its hook at the top curving to the RIGHT.',
        '· No lantern and no boat anywhere in the picture.'
      ]
    }),
  prop('glassChip', 'Glass chip', 1,
    'A small chip of mirror glass: ONE three-cornered sliver, like a little wedge broken off the edge of a mirror, lying flat.',
    'Keep the reference\'s pale neutral grey (see below): the game makes it dull grey while it lies asleep and clear blue-white as it flies home into its mirror. Glassy — a lit edge and a soft sheen across it.',
    'it is about a fortieth of the width of the scene — a chip lying beside a cracked hand-mirror.',
    [],
    {
      noun: 'chip',
      tinted: 'the whole chip',
      view: 'THE VIEW: flat and square-on, exactly as the reference has it. The game turns it as it flies.',
      not: [
        'Draw ONE chip and nothing else, exactly as the reference shows it.',
        '· NO mirror, NO frame, NO handle, NO other shards, NO ground, NO sparkle, NO shadow beneath it.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· ONE three-cornered chip.',
        '· Nothing under it: the magenta runs clean all round.'
      ]
    }),
  prop('sleepZ', 'Sleepy Z', 1,
    'ONE sleepy "Z" drawn as a thick, soft, rounded stroke — a flat top bar, a diagonal from its right end down to the left, and a flat bottom bar — the "z" that floats up from someone fast asleep in a picture book. A plump SHAPE, not a typed letter.',
    'Keep the reference\'s pale neutral grey (see below) for the Z\'s body: the game gives it a soft lilac. Its rim is the warm deep plum the whole game is inked in.',
    'it is about a fiftieth of the width of the scene — three of them drift up from a sleeper, getting bigger.',
    [],
    {
      noun: 'Z',
      tinted: 'the body of the Z, inside its plum rim',
      view: 'THE VIEW: flat and square-on, upright, exactly as the reference has it. The game floats it up, swells it and fades it.',
      not: [
        'Draw ONE Z and nothing else, exactly as the reference shows it.',
        '· NO second or third Z, NO other letters, NO word, NO speech bubble, NO cloud, NO moon, NO stars.',
        '· It is a drawn shape, not type: no font, no serif, no italic slant.'
      ],
      checks: [
        '· ONE Z — not two, not "zzz".',
        '· There is nothing else anywhere in the picture.'
      ]
    }),

  /* ── the duel's wards and Frost Lock's ice (paint-outstanding, 2026-09-24) ── */
  /*
   * Not the fx pool (art-roadmap's "never paint the duel's VFX" is about that):
   * each ward is ONE persistent shape per flavour, raised at the same place
   * every time, standing for seconds — a still a matrix carries, like every
   * prop here (`fx.WARD_ART`, `duel/stageArt.ts`). The duel stage is the
   * "scene" the sizes are measured against. Three are SEE-THROUGH shells a
   * unicorn stands inside, so their middles are holes: the game lays its own
   * pale wash there, and its own sheen, glitter, crack and flakes on top.
   */
  prop('wardRock', 'Rock ward', 1,
    'A short, rough wall of six chunky broken rock blocks piled in two columns of three, each block a lumpy many-sided stone with flat broken faces, each set at its own tilt — a shield of stone raised in front of someone. NOTHING else: no ground under it, no pebbles, no dust, no figure behind it.',
    'Warm clay-brown and tan earth: every block with a lit top face and a deeper brown shadow side, so the six read as separate stones.',
    'it is about a tenth of the width of the scene and a quarter of its height — a wall a unicorn ducks behind.',
    [],
    {
      noun: 'rock wall',
      anchor: 'feet',
      view: 'THE VIEW: flat, from the side, exactly as the reference has it. The game mirrors it for the duelist on the other side, so nothing in it turns toward the viewer.',
      not: [
        'Draw ONLY the six stones, exactly as the reference stacks them.',
        '· NO ground, NO grass, NO dust cloud, NO pebbles round its foot, NO unicorn, NO sky, NO shadow beneath it.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· Six stones, in two columns of three.',
        '· Nothing under it: the magenta runs clean beneath its bottom stones.'
      ]
    }),
  prop('wardIce', 'Ice pillar ward', 3,
    'One tall faceted pillar of clear blue ice standing on end like a giant crystal — a long spindle pointed at the top and at the bottom — with a second, narrower spindle set into its front, so that where the two meet the pillar is cut into a flat facet running down its face. The facet is a change of light from one face to the next, not a drawn line.',
    'Clear sky-blue ice, paler and almost white on its lit faces, a deeper cool blue on its shaded ones.',
    'it is about a fifteenth of the width of the scene and a quarter of its height — a crystal a unicorn stands behind.',
    [
      'Panel 1: the inner spindle leans a hair to the LEFT at its top, so the facet slants that way.',
      'Panel 2: the inner spindle stands straight up.',
      'Panel 3: the inner spindle leans a hair to the RIGHT at its top.',
      'The pillar itself — its outline, its size, its colours, its place in the panel — is IDENTICAL in all three. Only the facet moves, by the small amount the reference shows: the game sways between the panels so the ice catches the light while it stands.'
    ],
    {
      noun: 'pillar',
      anchor: 'feet',
      view: 'THE VIEW: flat, from the side, standing straight up exactly as the reference has it. The game mirrors it for the duelist on the other side.',
      not: [
        'Draw ONLY the pillar, exactly as the reference shows it.',
        '· NO ground, NO snow, NO ice shards scattered round it, NO sparkles, NO glow, NO unicorn, NO shadow beneath it.',
        '· No text, letters or numbers.'
      ],
      checks: ['· One pillar per panel, standing straight up, the same pillar in all three.']
    }),
  prop('wardWind', 'Wind ward', 1,
    'A round shell of swirling air: a thick ring of pale aqua wind, hollow — you can see straight through the middle — with four little curling gusts, each like a comma with a long tapering tail, chasing each other round inside it.',
    'Pale aqua and mint-white air, brightest where it curls, a cooler aqua in its turns.',
    'it is about a tenth of the width of the scene — a shell of wind around a unicorn.',
    [],
    {
      noun: 'wind shell',
      holes: 'THE MIDDLE OF THE RING IS A HOLE. Inside the ring, round the four gusts and between them, the magenta runs straight through: a unicorn stands inside this shell and must show through it. Only the ring and the four gusts are painted.',
      view: 'THE VIEW: flat and square-on, exactly as the reference has it. The game turns the whole shell round and round, so there is no up or down to it.',
      not: [
        'Draw ONLY the ring and its four gusts, exactly as the reference shows them.',
        '· NO leaves, NO dust, NO clouds, NO sparkles, NO glow round it, NO unicorn inside it.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· One ring, four gusts inside it, and magenta showing through the middle.',
        '· There is no glow outside the ring: the magenta runs clean up to its edge.'
      ]
    }),
  prop('wardBubble', 'Bubble ward', 1,
    'A big round soap-bubble shield: a thin bright skin of sea-turquoise round its rim and one small white highlight up and to the left, with nothing in the middle — you can see straight through it.',
    'Sea-turquoise skin paling to a bright aqua-white along the rim; a white highlight.',
    'it is about a tenth of the width of the scene — a bubble big enough to hold a unicorn.',
    [],
    {
      noun: 'bubble',
      holes: 'THE BUBBLE IS SEE-THROUGH. Its whole middle is a HOLE: the magenta runs right through it, and the painting is only its thin coloured rim and the one white highlight. A unicorn stands inside it and must show through.',
      view: 'THE VIEW: flat and square-on, a single round bubble, exactly as the reference has it. The game swells it as it wobbles.',
      not: [
        'Draw ONE bubble and nothing else, exactly as the reference shows it.',
        '· NO smaller bubbles inside or around it (the game floats its own), NO crack, NO rainbow swirl across it, NO water, NO unicorn, NO sky.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· ONE bubble, and you can see magenta through the whole of its middle.',
        '· Exactly one highlight, up and to the left.'
      ]
    }),
  prop('wardCrystal', 'Crystal ward', 1,
    'A small wall of three amethyst crystal prisms standing side by side — a tall one in the middle and two shorter ones leaning a little outwards — each a column with a pointed roof, cut by one flat facet down its middle. The facet is a change of light from one face to the other, not a drawn line.',
    'Lilac-violet amethyst, pale and glassy on its lit faces, a deeper violet on its shaded ones.',
    'it is about a fifteenth of the width of the scene and a seventh of its height — a little crystal wall in front of a unicorn.',
    [],
    {
      noun: 'crystal wall',
      anchor: 'feet',
      view: 'THE VIEW: flat, from the side, exactly as the reference has it. The game mirrors it for the duelist on the other side.',
      not: [
        'Draw ONLY the three prisms, exactly as the reference shows them.',
        '· NO light beam across them, NO sparkles or glints on their tips (the game sweeps its own light over them), NO ground, NO rocks round their foot, NO glow, NO shadow beneath them.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· Three prisms, the middle one the tallest.',
        '· Nothing under them: the magenta runs clean beneath their feet.'
      ]
    }),
  prop('wardFrost', 'Frost dome ward', 1,
    'A dome of frost: a half-circle shell of pale ice on two short straight sides down to a flat bottom edge, with four little frost ferns — each a short stem with one side-leaf — climbing up the inside of the shell from its rim. The shell is see-through.',
    'Pale icy blue, near-white where the light catches the rim; the ferns pure white.',
    'it is about a ninth of the width of the scene — a frosty dome over a unicorn.',
    [],
    {
      noun: 'frost dome',
      anchor: 'feet',
      holes: 'THE DOME IS SEE-THROUGH. Inside its icy rim the magenta runs straight through, round the four ferns: a unicorn stands under it and must show through. Only the rim, its outline and the four white ferns are painted.',
      view: 'THE VIEW: flat, from the side, exactly as the reference has it.',
      not: [
        'Draw ONLY the dome and its four ferns, exactly as the reference shows them.',
        '· NO snowflakes, NO glitter or sparkles (the game adds its own), NO snow drift, NO ground, NO unicorn inside it.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· One dome, four ferns, and magenta showing through its middle.',
        '· Its bottom edge is flat and straight, and nothing is under it.'
      ]
    }),
  prop('frostLockIce', 'Frost Lock ice block', 1,
    'A tall block of clear ice with softly rounded corners, standing on end: a pale, glassy, icy-blue rim running all the way round its edge, two pale planes of light on the glass — a slim sliver at the top left and a small wedge at the bottom right — and a clear, empty middle.',
    'Pale icy blue glass, near-white on its lit edge; the two light planes white.',
    'it is about an eighth of the width of the scene and a third of its height — a block of ice with a unicorn frozen inside.',
    [],
    {
      noun: 'ice block',
      anchor: 'feet',
      holes: 'THE BLOCK IS SEE-THROUGH. Inside its rim the magenta runs straight through, round the two light planes: a frozen unicorn stands inside it and must show through. Only the rim, its outline and the two light planes are painted.',
      view: 'THE VIEW: flat and square-on, standing upright exactly as the reference has it.',
      not: [
        'Draw ONLY the block, exactly as the reference shows it.',
        '· NO unicorn or anything else frozen inside it, NO snowflakes (the game drifts its own), NO cracks, NO icicles, NO ground, NO puddle, NO shadow beneath it.',
        '· No text, letters or numbers.'
      ],
      checks: [
        '· One block, taller than it is wide, with magenta showing through its middle.',
        '· Exactly two light planes, top left and bottom right.'
      ]
    })
]


/* ─────────────────────────────────────────── keepsake badges (§8.27) ── */

const KEEPSAKE_INFO: Readonly<Record<string, readonly [string, string, string]>> = {
  seashellNecklace: ['Seashell Necklace',
    'A seashell necklace laid out on its own: a gently curved string of small pearls with little seashells hanging from its middle — a spiral shell and a scallop among them.',
    'Pearly whites and creams, soft coral-pink and peach shells.'],
  pegasusWings: ['Pegasus Wings',
    'A pair of soft, feathered pegasus wings, spread open, their feathers layered in rounded rows.',
    'White feathers with a pale lilac shadow side and soft pastel tips.'],
  hoofTrailVfx: ['Hoof Trail',
    'A unicorn\'s chunky little lower leg with a fluffy fetlock and a golden hoof, and a comet\'s tail of chubby four-point sparkles streaming up and away from it.',
    'A cream leg, a honey-gold hoof; butter-yellow, candy-pink and sky-blue sparkles.'],
  umbraSkin: ['Umbra Skin',
    'A round badge: Aurora\'s smiling head in Umbra\'s night colours — a night-purple coat, a lilac-and-aqua mane — on a pale lilac disc inside a plum ring.',
    'Night purple and lilac with aqua streaks, on a pale lilac disc.'],
  colorPicker: ['Mane Color Palette',
    'An artist\'s paint palette, tilted a little: a rounded cream board with a thumb hole and five round dabs of paint, each with a small glossy highlight.',
    'Warm cream wood; lilac, mint, sky-blue, candy-pink and coral paint.'],
  pastelTheme: ['Pastel Dream',
    'A round badge: Aurora\'s smiling head in soft pastel colours — a pastel coat and a pastel mane — on a pale sky-blue disc inside a plum ring, with three little sparkles around it.',
    'Soft pastel pinks, mints and lilacs on a pale sky-blue disc.'],
  winterScarf: ['Winter Scarf',
    'A cosy knitted winter scarf, loosely looped, with chunky stripes and fringed ends.',
    'Keep the reference\'s warm knitted colours.'],
  // The second shelf's four that draw nothing painted (2026-09-24): the rest
  // of that shelf's badges draw their worn stills (`KEEPSAKE_WORN_ART`).
  petalTrail: ['Petal Trail',
    'A rising drift of six soft blossom petals, the biggest at the bottom left and smaller as they rise, each a rounded teardrop with a gently folded edge.',
    'Candy pink, blush white, apricot and rose petals.'],
  frostTrail: ['Frost Trail',
    'A rising drift of six little snowflakes, the biggest at the bottom left and smaller as they rise, each a star of six long slim arms.',
    'Icy white and pale sky-blue flakes.'],
  moonlitLook: ['Moonlit Look',
    'A round badge: Aurora\'s smiling head in moonlit colours — a silver-blue coat, a deep indigo mane with frost-white streaks and a pale blue horn — on a pale blue disc inside a plum ring.',
    'Silver-blue and deep indigo with frost-white streaks, on a pale blue disc.'],
  sunsetLook: ['Sunset Look',
    'A round badge: Aurora\'s smiling head in sunset colours — a warm apricot coat, a sunset-orange mane shot with gold and a honey horn — on a pale peach disc inside a plum ring.',
    'Apricot, sunset orange and gold, on a pale peach disc.']
}

export const KEEPSAKE_SHEETS: readonly ItemSheet[] = KEEPSAKE_ICON_SLUGS.map((slug) => {
  const [title, blurb, colour] = KEEPSAKE_INFO[slug]!
  const id = keepsakeArtId(slug)
  return {
    name: `keepsake:${slug}` as const,
    kind: 'cosmetic' as const,
    id, title: `${title} (wardrobe badge)`, frames: 1, anchor: 'centre' as const, panels: [],
    blurb: `${blurb} It is the keepsake's picture on the wardrobe shelf, shown small, so it must read at a glance.`,
    colour,
    file: `item-${id}`,
    target: artTarget('cosmetic', id)
  }
})

/* ─────────────────────────────────────────────── portraits (§8.27) ── */

/** Who each speaker is, for the painter: [name, look, colour identity]. */
const CAST_INFO: Readonly<Record<string, readonly [string, string, string]>> = {
  aurora: ['Aurora', 'Aurora, the heroine: a small, sweet unicorn filly with a round head, huge sparkly violet eyes, rosy blush, a golden spiral horn and a big fluffy mane.',
    // The mane is her one unmistakable feature, and two returns in a row
    // dropped the gold for an all-pastel rainbow — which is any unicorn.
    'A warm cream-white coat; violet eyes; a golden horn with deeper gold bands. HER MANE IS GOLDEN — warm butter-gold is its main colour, the colour most of it is — with candy-pink, lilac, mint and sky-blue streaks running through it. An all-pastel mane with no gold in it is the wrong character.'],
  umbra: ['Umbra', 'Umbra, Aurora\'s cheeky rival: a small night-purple unicorn with sleepy, half-lidded eyes, a smug little grin, a lilac horn and a soft mane. Mischievous and funny, never scary.',
    'A night-purple coat with a deeper purple shadow side; a lilac mane with aqua streaks; a softly glowing lilac horn.'],
  briar: ['Briar', 'Briar, the Guardian of the Whispering Woods: a gentle forest unicorn with a leafy mane dotted with blossoms and a horn of smooth polished wood.',
    'A warm bark-brown coat; a leaf-green mane with candy-pink blossom streaks; a honey-wood horn.'],
  pearl: ['Pearl', 'Pearl, the Guardian of Bubble Bay: a pearly seaside unicorn with a wavy mane and a shining pearl-white horn.',
    'A pearly white-blue coat; a turquoise mane with soft pink streaks; a pearl-white horn.'],
  zephyr: ['Zephyr', 'Zephyr, the Guardian of the Cloud Kingdom: a breezy sky unicorn with a windswept, curling mane.',
    'A slate-blue night coat; a mint-aqua mane with near-white streaks; a mint-aqua horn.'],
  terra: ['Terra', 'Terra, the Guardian of the Crystal Caves: a calm, sturdy cave unicorn with a thick mane.',
    'A dusky purple-grey coat; a warm caramel mane with pale sand streaks; a caramel horn.'],
  echo: ['Echo', 'Echo, the Guardian of the Mirror Mountains: a shy, shimmering silver unicorn with a flowing mane.',
    'A pale silver-lilac coat; a lilac mane with white streaks; a white horn.'],
  prism: ['Prism', 'Prism, the Guardian of Rainbow Ridge: a proud unicorn whose mane is a whole rainbow.',
    'A deep indigo coat; a rainbow mane in candy pink, butter yellow, mint, sky blue and lilac; a pink horn.'],
  ember: ['Ember', 'Ember, the Guardian of the Sunken Sands: a warm desert unicorn with a flame-like mane.',
    'A plum coat; a coral-orange mane with apricot streaks; a coral horn.'],
  glace: ['Glace', 'Glace, the Guardian of the Twilight Tundra: a cool, graceful snow unicorn with a frosty mane.',
    'A deep blue coat; an icy sky-blue mane with near-white streaks; an icy horn.'],
  nova: ['Nova', 'Nova, the Guardian of Starlight Summit: a dreamy night unicorn with a starry mane and a horn of starlight.',
    'A midnight-indigo coat; a periwinkle mane with pale starlight-gold streaks; a starlight-gold horn.'],
  Twig: ['Twig', 'Twig, a tiny wood sprite from the Whispering Woods: a round moss-green body, two leaf ears and a little sprout on top.',
    'Moss and leaf greens, a pale green belly.'],
  Shelly: ['Shelly', 'Shelly, a tiny hermit crab from Bubble Bay: a coral spiral shell, a round friendly face and two little claws.',
    'A coral-pink spiral shell, a warm peach body.'],
  Puff: ['Puff', 'Puff, a little cloud from the Cloud Kingdom: a fluffy lavender cloud with a face and two tiny wings.',
    'Soft lavender and white.'],
  Glint: ['Glint', 'Glint, a glowworm from the Crystal Caves: a round lilac cave critter with crystal speckles, crystal-tipped antennae and a tail curled up to a glowing tip.',
    'Lilac with teal and pink crystal speckles, a warm glowing tail tip.'],
  Blink: ['Blink', 'Blink, a mirror moth from the Mirror Mountains: a round ball of fluff between two big, shiny, mirror-glass wings, with feathery antennae.',
    'Soft white-mint fluff, silvery mirror wings with pastel glints.'],
  Rio: ['Rio', 'Rio, a rainbow finch from Rainbow Ridge: a round sky-blue bird with a rainbow crest, rainbow-striped wings and a little orange beak.',
    'Sky blue, a rainbow crest and wing stripes, an orange beak.'],
  Dune: ['Dune', 'Dune, a sand-fox pup from the Sunken Sands: big ears, a sandy coat, a cream face mask and a fluffy cream-tipped tail.',
    'Warm sandy apricot, cream mask and tail tip.'],
  Frosty: ['Frosty', 'Frosty, a snow hare from the Twilight Tundra: white-lilac fluff, long pink-lined ears and a pink nose.',
    'White and pale lilac, pink ear linings and nose.'],
  Wisp: ['Wisp', 'Wisp, a firefly from Starlight Summit: a round, warmly glowing body, two tiny wings and star-tipped antennae, in a soft halo of light.',
    'A warm golden glow on an indigo-lilac body.']
}

const EMOTE_PANEL: Readonly<Record<PortraitEmote, string>> = {
  happy: 'happy — a warm, open smile, eyes big and bright.',
  sleepy: 'sleepy — heavy half-closed eyelids and a drowsy little smile.',
  worriedMild: 'a little worried — brows tilted up in the middle, a small wobbly frown. Gentle, never frightened.',
  determined: 'determined — brave, focused brows and a firm little smile.',
  stern: 'stern — a serious frown with lowered brows. Strict, not angry, and never scary.',
  warmBlush: 'touched — rosy blushing cheeks and a soft, shy smile.',
  cheering: 'cheering — BOTH eyes squeezed shut into happy upturned crescents (not a wink: both of them closed), and a big open grin.'
}

export const PORTRAIT_SHEETS: readonly ItemSheet[] = PORTRAIT_SETS.map((p) => {
  const [name, look, colour] = CAST_INFO[p.who]!
  const id = portraitArtId(p.who)
  const n = p.emotes.length
  const unicorn = !p.creature
  return {
    name: `portrait:${p.who}` as const,
    kind: 'portrait' as const,
    id,
    title: `${name} portrait`,
    frames: n,
    anchor: 'centre' as const,
    panels: [
      ...p.emotes.map((e, i) => `Panel ${i + 1}: ${EMOTE_PANEL[e]}`),
      p.creature
        ? `${name}'s whole body leans and perks with the mood — ears, antennae or wings up when happy, drooping when worried, a little hop when cheering — exactly as each panel of the reference shows. Everything else about ${name} is IDENTICAL in all ${n}.`
        : `Only the FACE changes: the eyes, the brows, the mouth and the blush. The head's shape, its angle, the horn, the mane and the size are IDENTICAL in all ${n}.`
    ],
    blurb: `A dialogue portrait of ${look} ${unicorn ? 'Her head and the top of her neck' : `${name}`}, cut off along a circular arc at the bottom exactly as the reference is — the picture simply STOPS along that curve.`,
    colour,
    noun: 'character',
    character: true,
    // The game fills its own per-speaker badge colour behind this painting and
    // clips it to a circle (`story/portrait.ts`). A painted disc hides that
    // colour, so every speaker ends up on the same wrong ground — which is
    // exactly what came back when the blurb called it a "round window".
    keep: [
      'THE CIRCLE IS A CUT, NOT SOMETHING YOU PAINT.',
      `· Do NOT paint a disc, plate, coin, badge, halo, glow or pale circle behind ${name}. There is nothing behind ${unicorn ? 'her' : name} at all.`,
      '· The arc along the bottom is only where the picture is cut off: below it, and everywhere else outside the outline, every pixel is flat magenta right up against the ink.',
      // Four creature strips came back with the arc PAINTED — a pink or
      // near-magenta disc behind the head, close enough to the key colour to
      // look intentional and far enough off it to survive the cut.
      '· IF YOU CAN SEE A CIRCLE, IT IS WRONG. Do not paint the arc in pink, in rose, in a lighter or darker magenta, or in anything else. Below it is the SAME flat #FF00FF as the rest of the sheet, unbroken — there is no disc there, only where the drawing stops.',
      '· The game draws the round frame and its own coloured backdrop behind your painting. A painted disc would cover that colour and put every character on the same wrong ground.'
    ].join('\n'),
    checks: [
      `· Nothing behind ${name} but flat magenta — no disc, no pale circle, no glow.`,
      `· ${unicorn ? 'Huge glossy eyes, each with one big and one small white catch-light.' : 'Big, friendly eyes with white catch-lights.'}`
    ],
    not: [
      `Draw ONLY ${name}${unicorn ? '\'s head and the top of the neck' : ''}, as the reference shows — no second character, no scenery, no backdrop, no badge, no ring, no frame, no border.`,
      '· No text, letters or numbers.'
    ],
    view: unicorn
      ? `THE VIEW: the same three-quarter head-and-neck view as the reference, facing ${p.who === 'aurora' ? 'to the RIGHT' : 'to the LEFT'} exactly as it does. The same angle in every panel.`
      : 'THE VIEW: the same front-facing view as the reference, in every panel.',
    file: id,
    target: artTarget('portrait', id)
  }
})

/* ─────────────────────────────────────────────── islands (§8.27) ── */

export const ISLAND_SHEETS: readonly ItemSheet[] = ISLAND_SLUGS.map((_, c) => {
  const ch = CHAPTERS[c]!
  const id = islandArtId(c)
  return {
    name: `island:${c}` as const,
    kind: 'island' as const,
    id,
    title: `${ch.name} duel island`,
    frames: 1,
    anchor: 'top' as const,
    panels: [],
    blurb: `A small floating island — the stage two unicorns duel on, in ${ch.name}: a chunky rock hanging down to a jagged point, with a thick, rounded mossy cap on top whose soft edge spills over the rim, a few roots trailing from under the cap and a scatter of little stones and blossoms on the top.`,
    colour: `The chapter's colours, as the reference has them — ${ch.mood}. The rock is darker than the cap, and the cap has one bright lip along its top edge. Softer and less saturated than the spells the duel throws over it.`,
    noun: 'island',
    // A DOME IS NOT AN ISLAND. Four of ten returns heaped the biome on top —
    // a sandy mound, a snowy hill, a lumpy crown — and every one of them put
    // the highest ground in the middle, where nobody stands, and dropped it
    // away at the two places where somebody does. The game stands a unicorn at
    // each end of that top, so the rule is not "keep the shape", it is "the top
    // is the highest thing in the picture, and it is flat all the way across".
    keep: 'KEEP THE TOP — it is a STAGE: a unicorn stands at the far left of it and another at the far right, so it must be flat and level all the way from one end to the other, at exactly the height the reference draws it, and as wide as the reference draws it. NOTHING RISES ABOVE IT: no mound, no dune, no hill, no drift, no heaped sand or snow, no pool, no rocks, no plants, no creatures. The top is the WIDEST part of the island and the HIGHEST part of the island. If anything is piled on it, the two unicorns stand in mid-air either side of the pile and the picture cannot be used.',
    checks: [
      '· Lay a ruler along the very top of your island: is it level from the far left of the cap to the far right, with nothing standing higher anywhere in the picture?',
      '· Is the top the widest part — wider than anything below it, and as wide as the reference\'s?'
    ],
    not: [
      'Draw ONLY the floating island, as the reference shows it — no sky, no clouds, no water, no characters, no trees or buildings on it, nothing hanging from it.',
      '· No text, letters or numbers.'
    ],
    view: 'THE VIEW: flat and side-on, exactly as the reference: the flat top seen almost edge-on, the rock hanging below it. No tilt, no view from above.',
    file: id,
    target: artTarget('island', id)
  }
})

/* ─────────────────────────────────────── the chapters' book pages (§8.32) ── */

/**
 * The page a chapter's five beat cards are printed ON — paper, the chapter's
 * own marginalia and the biome wash along its foot, as one painting.
 *
 * TWO per chapter. The book is 1600 × 900 in landscape and 900 × 1600 in
 * portrait, and those are not the same picture at a different scale: the
 * doodles would smear and the wash would run down the wrong edge. So each
 * chapter has a `-land` and a `-port` page, painted separately.
 *
 * Only the BUILT page is painted. A chapter still asleep is drawn lilac with
 * its marginalia at a lower alpha and a dozing moon over it — a different
 * picture, not this one tinted, so it stays with the renderer.
 */
export const PAGE_REF_LONG = 1152

export interface PageSheet {
  /** -1 the front page, -2 the cloth the book lies on, else the chapter. */
  chapter: number
  portrait: boolean
  id: string
  title: string
  /** The chapter's world, for its marginalia. */
  mood: string
  /** What the chapter's doodles ARE (§8.32's table). */
  motifs: string
  w: number
  h: number
  file: string
  target: string
}

/** What each chapter's marginalia draws, in the painter's words. */
const PAGE_MOTIFS: readonly string[] = [
  'leaves, little curled ferns, songbirds and drifting seeds',
  'bubbles, scallop and spiral shells, small fish and gentle wave lines',
  'soft clouds, little wings, kites and swirls of breeze',
  'crystals, round cave mushrooms, water drops and tiny sparkles',
  'mirrored teardrops, still-water ripples, snow-capped peaks and moths',
  'rainbow arcs, paint drops, prisms and kites',
  'dunes, sun discs, palm fronds and hourglasses',
  'snowflakes, pines, mittens and drifting frost',
  'stars, crescent moons, comets and tiny constellations',
  'bunting flags, balloons, lanterns and party stars'
]

/**
 * The book's FRONT page, in both orientations.
 *
 * `chapter: -1` — it is not a chapter, and its picture is nothing like a
 * chapter page's: where those are paper with faint marginalia, this is the
 * little title-page scene the book falls open on, a knoll under a rainbow.
 * Aurora and the wardrobe tent stand on it and are NOT painted in.
 */
export const FRONT_PAGE_SHEETS: readonly PageSheet[] = [false, true].map((portrait) => {
  const id = frontPageArtId(portrait)
  const land = { w: PAGE_REF_LONG, h: Math.round(PAGE_REF_LONG * (848 / 1548)) }
  return {
    chapter: -1,
    portrait,
    id,
    title: `Front page (${portrait ? 'portrait' : 'landscape'})`,
    mood: 'a gentle storybook meadow under a soft rainbow: fresh greens, warm cream light, pastel sky',
    motifs: '',
    w: portrait ? land.h : land.w,
    h: portrait ? land.w : land.h,
    file: id,
    target: artTarget('page', id)
  }
})

export const CHAPTER_PAGE_SHEETS: readonly PageSheet[] = CHAPTERS.flatMap((ch, c) =>
  [false, true].map((portrait) => {
    const id = pageArtId(c, portrait)
    // The page rect is the book minus its padding, at the aspect the book is
    // actually laid out in. The long edge is capped: this is soft furniture
    // behind opaque cards, and paper survives being scaled up.
    const land = { w: PAGE_REF_LONG, h: Math.round(PAGE_REF_LONG * (848 / 1548)) }
    return {
      chapter: c,
      portrait,
      id,
      title: `${ch.name} page (${portrait ? 'portrait' : 'landscape'})`,
      mood: ch.mood,
      motifs: PAGE_MOTIFS[c] ?? PAGE_MOTIFS[0]!,
      w: portrait ? land.h : land.w,
      h: portrait ? land.w : land.h,
      file: id,
      target: artTarget('page', id)
    }
  })
)

/**
 * The CLOTH the book lies on — the whole coloured surround behind the page
 * (`drawBackdrop`). One square sheet, because it is stretched to fill a
 * viewport of any shape and a woven texture is the one thing that survives
 * that: it has no up, no layout and nothing to distort.
 *
 * The binding's stitched band (`drawSpine`) stays DRAWN. It is about twenty
 * pixels wide on screen and its stitching is crisp vector detail; a painting
 * stretched down that band would only blur it.
 */
export const COVER_SHEETS: readonly PageSheet[] = [{
  chapter: -2,
  portrait: false,
  id: 'cover-cloth',
  title: 'The cloth the book lies on',
  mood: 'warm lilac into dawn light',
  motifs: '',
  w: 1024,
  h: 1024,
  file: 'cover-cloth',
  target: artTarget('page', 'cover-cloth')
}]

/** Every book page the painter can replace: the cloth, the front page, then
 *  the ten chapters, each in both orientations. */
export const PAGE_SHEETS: readonly PageSheet[] = [...COVER_SHEETS, ...FRONT_PAGE_SHEETS, ...CHAPTER_PAGE_SHEETS]

/* ────────────────────────────── the Wardrobe Kiosk's room (§3.5.4) ── */

export interface WardrobeSheet {
  portrait: boolean
  id: string
  title: string
  /** The reference's size — the shape the painting is returned at. */
  w: number
  h: number
  /** Where the floor line runs, as a fraction of the picture's height. */
  floor: number
  file: string
  target: string
}

/** The long edge of a room reference. The tent fills a phone held either way,
 *  so the two are a true 16:9 and 9:16 — the aspects a painter can be asked
 *  for by name, and the ones a return actually comes back in. */
export const WARDROBE_REF_LONG = 1152

/**
 * The inside of the dressing-up tent, in both orientations.
 *
 * TWO pictures for the same reason a book page is two: a tent held sideways
 * and a tent held upright are not one picture at a different scale. Aurora,
 * her keepsakes, the rug under her, the corner shadow and the lights' twinkle
 * are all drawn OVER these (`cosmetics/wardrobe.ts`).
 */
export const WARDROBE_SHEETS: readonly WardrobeSheet[] = [false, true].map((portrait) => {
  const id = wardrobeArtId(portrait)
  const short = Math.round((WARDROBE_REF_LONG * 9) / 16)
  return {
    portrait,
    id,
    title: `Wardrobe tent (${portrait ? 'portrait' : 'landscape'})`,
    w: portrait ? short : WARDROBE_REF_LONG,
    h: portrait ? WARDROBE_REF_LONG : short,
    floor: portrait ? WARDROBE_FLOOR.port : WARDROBE_FLOOR.land,
    file: id,
    target: artTarget('wardrobe', id)
  }
})

/** The rug — the one part of the room that is keyed rather than full-bleed,
 *  because it moves with Aurora instead of with the tent. */
export const WARDROBE_ITEM_SHEETS: readonly ItemSheet[] = [{
  name: 'wardrobe:rug' as const,
  kind: 'wardrobe' as const,
  id: WARDROBE_RUG.id,
  title: 'Wardrobe rug',
  frames: 1,
  anchor: 'centre' as const,
  panels: [],
  blurb: 'A small round rug seen from a low angle, so the circle reads as a wide flat oval: a soft violet mat with a warm cream ring running round it a little inside the edge, and a gently uneven, slightly furry outer edge the way a woven rug has.',
  colour: 'Soft violet-lilac wool, a little deeper along the far side, with a warm cream ring. Quiet — a unicorn stands on it and must be the bright thing.',
  noun: 'rug',
  view: 'THE VIEW: from a low angle across the floor, so the rug is a wide flat oval about four and a half times as wide as it is tall, exactly as the reference draws it. Not seen from above, not tilted up, no perspective of its own.',
  // It lies ON a painted floor. The props' hardest-won bullet, for the same
  // reason: a shadow laid on the magenta is a dark magenta, which the key
  // cannot cut, and it ships as a pink stain welded under the rug.
  keep: [
    'IT LIES FLAT ON A FLOOR THAT IS ALREADY PAINTED.',
    '· NO floor, NO boards, NO ground, NO carpet under it, NO shadow, NO dark patch, NO soft smudge below or around it. The magenta runs clean right up to its edge on every side.',
    '· Nothing stands on it and nothing lies on it. A unicorn is drawn on top of it by the game.',
    '· It is a hand-painted storybook rug, not an icon and not a sticker: the wool varies across it, and the ink around it swells and fades away rather than ringing it evenly.'
  ].join('\n'),
  not: [
    'Draw ONLY the rug, exactly as the reference shows it — no floor, no room, no tent, no furniture, no characters, no tassels reaching off it.',
    '· No text, letters or numbers.'
  ],
  checks: [
    '· One oval rug, far wider than it is tall, alone in the middle of the square.',
    '· The cream ring runs the whole way round, inside the edge and following it.',
    '· Nothing underneath it. The magenta is unbroken right up to the wool.'
  ],
  file: WARDROBE_RUG.id,
  target: artTarget('wardrobe', WARDROBE_RUG.id)
}]

/* ──────────────────────────────────────────── the intro's panels (§8.26) ── */

export interface StorySheet {
  /** 1-based panel number. */
  panel: number
  id: string
  title: string
  /** What happens in it, for the painter. */
  scene: string
  /** The painted character models attached ahead of the reference. */
  also: readonly string[]
  /** For each model in `also`, the 1-based panel of that strip whose FACE
   *  this page wears. A model is four or five moods side by side, and a page
   *  that does not say which one gets whichever the painter felt like — the
   *  first return of "Hello!" came back with a blank face. */
  faces: readonly number[]
  file: string
  target: string
}

const AURORA_MODEL = 'painted/portrait-aurora.png'
const UMBRA_MODEL = 'painted/portrait-umbra.png'

const STORY_INFO: readonly (readonly [string, string, readonly string[], readonly number[]])[] = [
  ['Hello!',
    'Cottage Meadow on a bright, sunny morning, in full colour. Aurora stands on the path in the middle of the picture, beaming with delight, as if she has just trotted in to say hello.',
    [AURORA_MODEL], [1]],
  ['The dust',
    'The same meadow, but a soft grey dust has settled over everything and drained its colours (the reference shows exactly how grey). Up to the right, Umbra floats on a little dark lilac cloud, eyes closed, giggling cheekily — she blew the dust. Aurora stands on the path, a little worried, looking up at her. The two unicorns keep their full colours: only the meadow is grey.',
    [AURORA_MODEL, UMBRA_MODEL], [2, 5]],
  ['The magic',
    'The grey, dusty meadow (Aurora keeps her full colours). She stands on the path, brave and determined, and the tip of her horn glows with a warm golden light. The space up to the right is left open: the game draws the magic rune there.',
    [AURORA_MODEL], [3]],
  ['Colour again!',
    'The meadow in full, bright colour again, sparkling clean. Aurora stands on the path, cheering, her eyes squeezed shut with joy.',
    [AURORA_MODEL], [4]]
]

export const STORY_SHEETS: readonly StorySheet[] = STORY_PANELS.map((_, i) => {
  const id = storyPanelId(i)
  const [title, scene, also, faces] = STORY_INFO[i]!
  return { panel: i + 1, id, title, scene, also, faces, file: `story-${id}`, target: artTarget('story', id) }
})

/* ───────────────────────────────── the brand pair (art-style.md §11) ── */

/**
 * The MARK — one square, opaque and full-bleed, because an app icon IS its own
 * ground. Cut at exactly 512, the largest size the PWA manifest asks for, and
 * every smaller icon and the favicon are downsamples of that one file
 * (`scripts/brand-icons.mjs`): an icon upscaled from a smaller master is a
 * blurred icon on the one screen a player judges the game from first.
 */
export interface BrandSheet {
  id: string
  title: string
  w: number
  h: number
  file: string
  target: string
  also: readonly string[]
}

export const BRAND_LOGO_SHEET: BrandSheet = {
  id: BRAND_LOGO.id,
  title: 'The mark',
  w: BRAND_LOGO_SIDE,
  h: BRAND_LOGO_SIDE,
  file: 'brand-logo',
  target: artTarget(BRAND_LOGO.kind, BRAND_LOGO.id),
  also: [STYLE_ANCHOR]
}

/**
 * The MASCOT — Aurora and Umbra looking at each other, magenta-keyed so the
 * splash's gradient shows through between and behind them.
 *
 * Keyed rather than full-bleed, and on a 16:9 canvas of its own rather than
 * the one-panel square: the pair is a wide subject, and a square return spends
 * two thirds of itself on magenta and comes back at half the detail. It is cut
 * at `BRAND_MASCOT_H` rather than the slicer's 256 px frame cap, by the cap's
 * own exception — nothing blits this at a drawable's size, the DOM shows it at
 * up to 420 CSS px wide on a 3x phone (`ItemSheet.exact`).
 *
 * The two painted portrait strips are attached ahead of the reference, exactly
 * as an intro page attaches them: the reference gives the pose, the place and
 * the facing, and the models give the build and the face. Their moods are
 * named by DESCRIPTION rather than by panel number, which every other prompt
 * that attaches a model does the other way round — because a strip's panel
 * count is whatever came back, and Umbra's came back with more faces than the
 * manifest asked for.
 */
export const BRAND_MASCOT_SHEET: ItemSheet = {
  name: 'brand:mascot',
  kind: BRAND_MASCOT.kind,
  id: BRAND_MASCOT.id,
  title: 'The mascot — Aurora and Umbra',
  frames: 1,
  anchor: 'feet',
  panels: [],
  character: true,
  canvas: { w: 1536, h: 864 },
  exact: BRAND_MASCOT_H,
  also: [AURORA_MODEL, UMBRA_MODEL],
  noun: 'pair of unicorns',
  blurb: 'Two chibi unicorns standing on nothing, facing each other: Aurora on the left facing right, cream-coated with a gold-led pastel mane, beaming; Umbra on the right facing left, a little stockier, night-violet with a lilac and cyan mane, smiling back with both cheeks flushed. Friends, meeting — not fighting.',
  colour: 'Aurora: warm cream coat, butter-gold mane with pink, lilac, mint and sky streaks, a gold horn. Umbra: deep night-violet coat, lilac mane with neon-cyan streaks, a violet horn. Their manes are the brightest thing in the picture.',
  file: 'brand-mascot',
  target: artTarget(BRAND_MASCOT.kind, BRAND_MASCOT.id)
}

/** Every file a painting can land in — the catalogue `art:status` checks. */
export const manifestTargets = (): Map<string, { kind: ArtKind; id: string }> => {
  const out = new Map<string, { kind: ArtKind; id: string }>()
  for (const s of SECTOR_SHEETS) {
    out.set(s.target, { kind: 'sector', id: s.id })
    out.set(s.thumb, { kind: 'sectorThumb', id: s.id })
  }
  for (const s of STORY_SHEETS) out.set(s.target, { kind: 'story', id: s.id })
  for (const s of PAGE_SHEETS) out.set(s.target, { kind: 'page', id: s.id })
  for (const s of WARDROBE_SHEETS) out.set(s.target, { kind: 'wardrobe', id: s.id })
  out.set(BRAND_LOGO_SHEET.target, { kind: 'brand', id: BRAND_LOGO_SHEET.id })
  for (const s of [...ITEM_SHEETS, ...WORLD_UI_SHEETS, ...PROP_SHEETS, ...CREATURE_SHEETS, ...RIG_SHEETS, ...WARDROBE_ITEM_SHEETS, ...KEEPSAKE_SHEETS, ...RUNE_SHEETS, ...PORTRAIT_SHEETS, ...ISLAND_SHEETS, BRAND_MASCOT_SHEET]) {
    out.set(s.target, { kind: s.kind, id: s.id })
  }
  return out
}

/* ─────────────────────────────────────────────────────────── prompts ── */

/**
 * A sheet's measured fit, as the bench writes it into `sheet-index.json`: the
 * drawing's SOLID extent (α > 140) as fractions of ONE panel, the union over
 * every panel of the strip.
 */
export interface Fit {
  h: number
  w: number
  bottom: number
  cx: number
  /** Each panel's own solid height (a lid thrown open is taller than a
   *  shut one): the slicer checks a return's panels against these. */
  ph?: number[]
}

const pct = (x: number): string => `${Math.round(x * 100)}%`

/**
 * The style blocks, built from THE style decision (`artStyle.ts`, art-style.md
 * §0) and audited against faceless objects per the pipeline's PROMPT-ANATOMY
 * §8: the shared rules once, then the one bullet each variant adds. Nothing
 * about the look is written anywhere else.
 */
const STYLE_CORE = [
  `STYLE — ${ACTIVE_STYLE.headline} For ${ACTIVE_STYLE.audience}.`,
  ...ACTIVE_STYLE.core,
  // THE INK IS ON THE OUTSIDE ONLY (owner, 2026-09-23). The style block
  // already forbids an even outline AROUND everything; what kept coming back
  // instead was a picture whose outsides were softly drawn and whose INSIDES
  // were a diagram — every window, plank, panel, spoke and rib traced at the
  // same weight. That is the sticker look again, moved indoors, and it is
  // what "the painted assets have outlines inside the asset" names.
  //
  // It lives here rather than in `ACTIVE_STYLE.core` on purpose: a profile's
  // id is stamped on every painting made under it, so editing one would mark
  // all 237 targets REPAINT. This is a prompt-builder rule, like the magenta
  // ground and the neutral regions, and it applies from the next generation.
  '· NO LINE INSIDE THE SHAPE. The drawn line belongs to the OUTSIDE of a thing, where it turns away from what is behind it. Inside its own silhouette one part meets another through a CHANGE OF PAINT — a different colour, a soft edge, a shadow that follows the form — and never through a drawn stroke. No outlined windows, planks, panels, petals, scales or straps, and no spoke or rib drawn as a line: a spoke is a painted bar, a pane is painted glass, a plank is a painted seam.',
  // Paid for on the first four re-rolls of this pass: the rule above was read
  // as "remove the small dark details". The festival stage came back without
  // its candles, its moon, its stars or its banner, and the geode hall
  // without its cave. Taking the LINE away is not taking the THING away — and
  // "nothing may be left out" did not cover it, because its own list names
  // buildings, towers and bridges, which are the big things.
  '· TAKING THE LINE AWAY MUST NOT TAKE THE THING AWAY. Every candle, star, moon, medallion, windowpane, curtain fold, bolt, pebble, ribbon and handle in the reference is STILL THERE in your picture, the same size and in the same place. Only HOW it is made changes: painted as a shape with its own colour and its own soft shadow, instead of traced as an outline. A picture with fewer things in it than the reference is wrong, and no amount of lovely painting excuses it.',
  `· AVOID — this is exactly how earlier attempts went wrong: ${ACTIVE_STYLE.avoid.join(', ')}.`
].join('\n')

const STYLE_ITEM = `${STYLE_CORE}
· It sits in its panel at the size the reference draws it, with the empty space around it left empty. It does NOT fill its panel edge to edge.`

/**
 * The two checks every prompt needs and no two of them carried — the audit in
 * PROMPT-ANATOMY §8: each check list looked complete on its own, and between
 * them the outline was checked three different ways (a sector's "mid-ground
 * and foreground", an item's — only when it had no tinted part — and a story
 * page's not at all). The first painting came back in hard black ink with
 * flat single-tone fills, which is to say it obeyed every list it was given.
 *
 * Stated as a comparison, not an adjective: "warm deep plum" is a phrase a
 * painter can believe it followed while reaching for black.
 */
const STYLE_CHECKS = [
  '· THE INK IS PLUM, NOT BLACK: hold a line against pure black — it must read clearly as warm deep purple (#3A2340).',
  '· The line VARIES and in places disappears. If every shape is ringed by a stroke of the same width, it is wrong — redraw it lighter.',
  '· It looks drawn by hand, not assembled: soft colour variation inside the shapes, and no shape that is a perfect circle, arc or straight edge.',
  // The check that makes the painter LOOK, the way "compare the two heaviest
  // lines" does for the outside: name the parts the habit reaches for.
  '· LOOK INSIDE EACH THING and count the drawn lines there — windows, doors, planks, panes, spokes, ribs, petals, straps, seams. The answer must be ZERO: every one of them is painted, not outlined. Paint out any you find.',
  '· COUNT THE THINGS, not just the lines. Put your picture beside the reference and check off every small object in it — the candles, the stars, the medallions, the panes, the folds. One missing means start again: softening a picture by emptying it is the wrong trade.'
]

/**
 * The style's make-or-break rules, as their own block near the TOP of every
 * prompt. The text is the ACTIVE profile's (`artStyle.ts`) and is written
 * nowhere else, so changing the style rewrites this with everything else.
 */
const INK_AND_SHADING = [
  `${ACTIVE_STYLE.lead.length === 2 ? 'TWO' : 'THREE'} RULES BEFORE ANY OTHER — they are what makes this the game's style, and they are what earlier attempts got wrong:`,
  ...ACTIVE_STYLE.lead
].join('\n')

const STYLE_SCENE = [STYLE_CORE, ...ACTIVE_STYLE.scene, '· The picture fills the whole image, edge to edge.'].join('\n')

/** Characters: the item or scene block plus the character rules. */
const withCharacter = (block: string): string => [block, ...ACTIVE_STYLE.character].join('\n')

const REFERENCE_CLAUSE =
  'THE ATTACHED REFERENCE is a flat computer drawing of exactly what to paint. FOLLOW ITS SHAPES, ITS LAYOUT AND ITS PROPORTIONS, and take nothing else from it: not its line weight, not its flat colours, not its lack of shading. It is a stand-in for a painting that does not exist yet.'

/**
 * For the full-bleed scenes, which came back as the reference with smoother
 * lines: every shape still one flat colour, no light anywhere.
 *
 * "Follow the reference" and "paint it properly" pull against each other, and
 * a painter that resolves the tension by tidying the vector art obeys the
 * louder of the two. So the prompt says which parts are being copied (the
 * layout) and which are being replaced (the rendering), and gives a test the
 * painter can apply to its own result.
 */
const NOT_A_TIDY_UP = [
  'YOU ARE DRAWING AND PAINTING THIS SCENE BY HAND, NOT TIDYING UP THE REFERENCE.',
  '· The reference is flat vector art made of perfect circles and arcs, every shape one colour, no light and no depth. You are copying its LAYOUT and REDRAWING everything else by hand.',
  '· REDRAW every shape with a hand\'s irregularity — the canopies are not circles, the hills are not arcs, the pond is not an ellipse, the path edges wobble. Keep each thing the same size and in the same place, but let its outline be a drawn one.',
  '· Light it warmly from the top left: grass deepening under the trees and along the path, a lit slope and a shaded slope on the roof, soft shadow gathering where things meet the ground.',
  // The roll that finally shaded the scene also drained it: "far layers are
  // lighter and bluer" is a depth rule for the BACK of the picture, and a
  // painter applies it to everything unless it is fenced in.
  '· KEEP THE REFERENCE\'S COLOURS. Its greens, its roof, its water, its flowers and its sky are the scene\'s real hues — match them. Shading DARKENS a shape; it never drains it. A pale, hazy, washed-out version of the reference is exactly as wrong as a flat one, and the game is a bright, sunny, saturated picture book.',
  '· Only the FAR hills and the sky behind them go lighter and bluer with distance. Everything from the mid-ground forward keeps its full colour.',
  '· THE TEST: put your picture beside the reference. If someone could mistake yours for the reference with cleaner edges and softer corners, it is not finished — and if yours is noticeably paler or greyer than the reference, it is wrong in the other direction.',
  '· THE SECOND TEST: cover the characters and look at the meadow alone. It must look like a page from a hand-painted picture book. If it still looks like tidy computer graphics, redraw it.'
].join('\n')

/**
 * The same argument `NOT_A_TIDY_UP` makes for a scene, for ONE figure.
 *
 * The snow-hare's first return (2026-09-23) obeyed every rule it could count —
 * three panels, the right poses, the neutral scarf, clean magenta, no horn —
 * and came back as a CARTOON STICKER: an even dark line all the way round,
 * flat white fill, one hard cel shadow. `REFERENCE_CLAUSE` says "take nothing
 * else from it, not its line weight, not its flat colours", and a painter
 * with a crisp inked drawing in front of it reads that as flavour, exactly as
 * the scenes did before they were given a clause of their own.
 *
 * So: name what the reference IS, name what is being taken from it, and give
 * a test the painter can apply to its own result.
 */
const CREATURE_NOT_A_STICKER = [
  'YOU ARE PAINTING AN ANIMAL BY HAND, NOT INKING A CARTOON STICKER.',
  '· The reference is flat vector art: one even dark line traced right round every shape, one flat colour inside it, no light. You are copying its SHAPE, its POSE and its PROPORTIONS, and painting everything else yourself.',
  '· The COAT is painted, not filled: soft variation across it, warm light gathering on the top-left of every rounded form, a soft-edged shadow under the chin, beneath the ears, along the far side and where a limb meets the body. Edges between light and shadow are soft, never a hard mask.',
  // The reference's own ink is thinned to a guide for this family
  // (`artDraw.CREATURE_REF_INK`), so the picture and the words now agree.
  // Saying so is what stops the painter "restoring" the line it expects.
  '· THE LINE IN THE REFERENCE IS DELIBERATELY FAINT. It is a guide to where the shapes are, not a contour to ink in. Do not thicken it, do not close it up, and do not trace round the outside of the animal.',
  '· The line you paint is a soft brush accent in warm deep plum: present where the ears meet the head, where a limb crosses the body and under the chin — and GONE along a lit back, a cheek, the top of the head. More than half the animal — more than half its whole edge — should carry no line at all, its shape held by paint meeting magenta.',
  '· THE THIRD TEST: find the two heaviest lines in your picture and compare them. If they are the same weight, the line is a contour and not a brush — thin one of them away.',
  '· It still has to read at the size of a thumb, so where the line IS there, let it be confident and warm, not a grey hairline.',
  '· THE TEST: put your picture beside the reference. If someone could mistake yours for the reference with cleaner edges and a shadow added, it is not finished — go back and paint the coat.',
  '· THE SECOND TEST: cover the face. What is left must look like a painting of a small animal, not like a sticker of one.'
].join('\n')

const MAGENTA = [
  'BACKGROUND — read this before anything else. It matters more than the style.',
  'Fill every pixel that is not the object itself with solid, flat, pure magenta #FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.',
  // A creature strip came back as three magenta CARDS laid on a cream sheet.
  // The key lifted the cards and left the paper between them, and the cut
  // registered against that paper — three faces became five fragments.
  '· THE MAGENTA IS ONE UNBROKEN SHEET behind everything, corner to corner, with NOTHING else in the picture. Not one magenta card per drawing with paper or a background showing between or around them — a single magenta field that runs off all four edges.',
  '· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not mauve, not a soft or tinted version of it.',
  '· NOT transparent (a transparency checkerboard gets baked in as paint), NOT white, cream or any textured ground.',
  '· The object must NOT sit on a card, panel, badge, frame or rectangle of any kind. The magenta touches its outline on every side.',
  // A badge strip came back with a tidy drop shadow under every disc, and
  // shipped with a pink crescent welded to each one: a shadow cast ONTO the
  // magenta is a DARKER magenta, which is not the key colour, so nothing can
  // cut it away. The rule was already here; the consequence was not.
  '· NO DROP SHADOW — this is the single most common way a return is spoiled. A shadow falling on the magenta becomes a dark magenta, which is NOT the key colour and cannot be cut away: it ships as a pink smear stuck to the object for ever. The object floats on nothing. No ground, no contact shadow, no vignette, no glow spreading off it.',
  '· The object itself contains no magenta or hot pink.',
  '· The soft pastel palette is for the OBJECT. The ground is not part of the painting and is not toned down with it: it stays a vivid, eye-hurting #FF00FF.',
  '· KEEP ANY GLOW TIGHT, inside the object\'s own outline. A halo spreading into the magenta turns pink and cannot be cut out.'
].join('\n')

/** The magenta contract, with the one exception a see-through drawable needs
 *  stated where the flat rule it contradicts is, rather than pages earlier. */
const magentaFor = (holes: string | undefined): string =>
  holes
    ? MAGENTA.replace(
      '· The object itself contains no magenta or hot pink.',
      `· THE ONE EXCEPTION: ${holes} Those gaps are magenta too, the same flat #FF00FF, right up to the paint. Apart from them the object itself contains no magenta or hot pink.`
    )
    : MAGENTA

const FULL_BLEED = [
  'IT FILLS THE IMAGE, edge to edge, corner to corner. There is NO background behind it and NO magenta anywhere in this one: it is itself the background the game draws on.',
  '· No frame, no border, no vignette, no card, no rounded corners, no letterboxing, no white margin.'
].join('\n')

const neutralClause = (what: string): string => [
  `THE COLOUR-ME PART — ${what}.`,
  `In the reference it is a pale neutral lilac-grey (about ${NEUTRAL_HEX}). KEEP IT THAT PALE NEUTRAL LILAC-GREY in your painting: shaded with lighter and darker lilac-grey only, fully outlined and fully painted, but with no hue of its own — no pink, no blue, no gold, no colour at all.`,
  '· It is a blank the game colours in later, laying the colour over your grey. A coloured one cannot be recoloured, and a white one comes out washed out.',
  '· Everything else is painted in its full colours, as normal.'
].join('\n')

const fenceFor = (body: string): string => {
  let longest = 0
  for (const run of body.match(/`+/g) ?? []) longest = Math.max(longest, run.length)
  return '`'.repeat(Math.max(3, longest + 1))
}

/** One `## heading  ([also.png + …]reference.png → target)` and its fenced
 *  prompt. The images are listed in the order they are attached; the
 *  reference, which the return is cut against, is always last. */
const block = (title: string, ref: string, target: string, body: string, also: readonly string[] = []): string => {
  const fence = fenceFor(body)
  const images = [...also, `${ref}.png`].join(' + ')
  return [`## ${title}  (${images} → ${target})`, '', `${fence}text`, body, fence].join('\n')
}

/** The prompt for one sector. */
export const sectorPrompt = (s: SectorSheet): string => {
  const ch = CHAPTERS[s.chapter - 1]!
  const sameMeadow = s.node === 0
  return [
    'WHAT COMES BACK IS ONE LANDSCAPE PICTURE — the scene in the LAST attached image, repainted. Not a sheet, not panels, not several pictures, not a close-up of one part of it.',
    'One wide landscape image, 16:9, holding the WHOLE scene that last image shows, framed exactly as it frames it.',
    '',
    'THE TWO ATTACHED IMAGES DO DIFFERENT JOBS — this matters more than anything else in this brief:',
    '· IMAGE 1 IS A PAINT SWATCH, NOT A PICTURE — four square patches of finished paint from this game: sky, a hazy hill, sunlit grass, meadow. Match its palette, its warmth, its light, its brush texture and its level of finish exactly, so your picture looks painted by the same hand on the same afternoon.',
    '· IT HAS NO SUBJECT, and nothing in it is a thing to draw. Do not paint its patches, its squares, or a landscape made out of them. It tells you HOW to paint, never WHAT.',
    '· THE LAST IMAGE is what you are painting: its shapes, its layout, its contents. Everything about WHAT is in the picture comes from it and only from it.',
    // The anchor's windmill has SAILS; the sector's drawing does not, because
    // the sails turn and the game draws them on top every frame. The first
    // anchored return copied them, and painted sails under turning ones is a
    // windmill with two sets. Hence the rule stated as a test, not a list.
    '· IF IMAGE 1 SHOWS SOMETHING THE LAST IMAGE DOES NOT, IT IS NOT IN YOUR PICTURE. The last image is the complete and final list of what exists here. A thing missing from it is missing because the game draws it itself, usually because it MOVES — and your painted copy would sit frozen underneath the moving one.',
    // Roughly one anchored sector in five came back with the anchor's unicorn
    // standing in it. "Take nothing else from image 1" was not enough: the
    // two pictures are the same world, so a character reads as belonging.
    '· THIS PLACE IS EMPTY. No unicorn, no creature, nobody — the game walks its characters onto the picture while the child plays, and a painted one would stand frozen for ever beside the real one that moves. Count the living things in your picture: the answer is zero.',
    ...(sameMeadow
      ? [
        '· The mill keeps its BARE TOWER AND CAP exactly as the last image draws it — no sails. They turn, and the game adds them; painted ones would sit frozen under the turning pair.'
      ]
      : []),
    '',
    'WHAT IT IS NOT:',
    '· No characters, no unicorns, no people, no animals and no creatures of any kind. Everything that moves — butterflies, fireflies, water, little creatures, gifts — is added by the game on top of your picture, in the places the reference leaves for it.',
    '· No text, letters, numbers or writing anywhere — not on signs, not on banners.',
    '· Nothing that is not in the reference. The reference settles every argument about what belongs.',
    '',
    INK_AND_SHADING,
    '',
    // THE REFERENCE IS AN INKED DRAWING, AND THE PAINTER TRACES INK. The kit
    // outlines every shape it draws, so a sector reference arrives ringed in
    // even stroke — and the returns came back ringed too: flat fills inside a
    // constant dark line, the "sticker" look v2 exists to kill. Chapter 1 was
    // painted before this and is soft and atmospheric; chapters 2+ are not.
    // The style block alone cannot carry it, because the picture in front of
    // the painter disagrees with it. Naming the reference's OWN ink as the
    // thing not to copy is what the front page needed, and it worked there.
    'THE REFERENCE IS A DIAGRAM, NOT A STYLE. It is drawn with a line around every single shape because that is how the game sketches a plan. YOUR PICTURE IS NOT DRAWN THAT WAY. Do not trace those outlines. Paint each thing as a shape made of colour, and let a line appear only where a real brush would leave one — heavier where two things meet in shadow, thinning away to nothing along a lit edge, and absent altogether on anything small.',
    '· NOTHING IN THE LANDSCAPE IS OUTLINED. Hills, sand, water, the horizon, a path, a bank, a rock face: where two colours meet the colour changes, and that IS the edge. A line drawn along the top of a hill, or round a dune, is what makes a painting look like a drawing somebody coloured in.',
    '· FAR THINGS LOSE THEIR LINE ENTIRELY and go soft, pale and blue. If every object carries the same weight of outline, from the nearest thing to the hills at the back, it is wrong.',
    // NAMING LANDFORMS WAS NOT ENOUGH. The first version of this rule listed
    // hills, sand, water and rock — so a chapter made of CLOUDS and tree
    // canopies read it as permission, and Cloud Kingdom came back with a hard
    // line round every puff. The test is not "is it landscape", it is "does
    // this thing have an edge in life at all".
    '· ANYTHING SOFT IN LIFE HAS NO LINE AT ALL: clouds, mist, steam, smoke, spray, foam, the canopy of a tree, a bush, long grass, fur, wool, a flame. These have no edge to draw. Painting one round a cloud turns the sky into a cartoon, and it is the single thing that most makes this look like a drawing rather than a painting.',
    '· NO TWO LINES THE SAME WEIGHT. Wherever a line does belong — the edge of a roof, a boat, a post — it changes thickness along its own length and between one object and the next. A picture where every edge is the same dark stroke is the one thing this style is not.',
    '',
    `WHAT IT IS: "${s.title}", a place in ${ch.name} — ${ch.mood}.${s.boss ? ' It is the chapter\'s grand final place, a little more magical than the rest.' : ''}`,
    '',
    REFERENCE_CLAUSE,
    '',
    NOT_A_TIDY_UP,
    '',
    neutralClause(`${s.landmark} — exactly the parts of it the reference shows in pale lilac-grey, and nothing else. It is the landmark the player colours in`),
    '',
    'KEEP THE LAYOUT — the game places things on this picture by their position in it:',
    '· Every object stays exactly where the reference puts it, at the same size: the same horizon line, the same paths, the same ground heights, the landmark in the same spot and the same size.',
    // A painting that dropped the windmill off its hill and left bare grass:
    // "do not add or move" was read as licence to leave something out.
    '· NOTHING MAY BE LEFT OUT. Every building, tower, tree, bridge, rock, pond and path in the reference appears in your picture. Before you start, count the BUILDINGS and structures in the reference; your picture has exactly that many, in the same places. Dropping one because it crowds the composition is the most damaging thing you can do here — the game puts things on this picture by where they are.',
    '· Do not add objects either, do not move them, and do not zoom, crop or re-frame. Open ground in the reference stays open ground in yours.',
    '',
    'THE VIEW: the same flat, storybook, side-on view as the reference. No camera move, no new perspective, no tilt.',
    '',
    STYLE_SCENE,
    '',
    FULL_BLEED,
    '',
    'BEFORE YOU CALL IT FINISHED, check:',
    '· One landscape picture, 16:9, the whole scene, framed like the reference.',
    '· Count the buildings and structures in the reference, then in yours. The two numbers are the same, and each one is in the same place.',
    '· Every object where the reference puts it, the same size.',
    `· ${s.landmark[0]!.toUpperCase()}${s.landmark.slice(1)}: pale neutral lilac-grey, no hue.`,
    '· No characters, no creatures, no text, no frame. Count the living things: zero.',
    '· Look at every CLOUD and every tree canopy in your picture: is there a line drawn round it? There must not be — those things have no edge in life.',
    '· Find the two heaviest lines in your picture. Are they the same weight? If they are, you have outlined rather than painted.',
    ...STYLE_CHECKS,
    '',
    'OUTPUT: one image, 16:9 landscape (for example 1344 x 768 pixels), PNG. If your tool has an aspect-ratio control, set it to 16:9. No labels, captions, numbers or watermarks.'
  ].join('\n')
}

const sizeClause = (s: ItemSheet, fit: Fit | undefined): string => {
  if (s.kind === 'rune') {
    return [
      'SIZE AND PLACE: the glyph sits in the middle of the square at exactly the size the reference draws it — about three fifths of the square across — with the empty square around it left empty.',
      '· The SHAPE is the game: children trace this rune with a finger to cast it. Keep the path exactly as the reference draws it — every corner where it is, every straight line straight, every curve the same curve, the same number of turns, the same proportions. A prettier rune of a different shape is a wrong rune.'
    ].join('\n')
  }
  const where = s.anchor === 'feet'
    ? 'It stands on the same invisible ground line as the reference: its bottom edge exactly where the reference\'s is.'
    : s.anchor === 'top'
      ? 'Its top edge is exactly where the reference\'s top edge is.'
      : 'Its middle is exactly where the reference\'s middle is.'
  const measured = fit
    ? `In the reference it spans ${pct(fit.w)} of the panel's width and ${pct(fit.h)} of its height${s.frames > 1 ? ' (in its largest panel)' : ''}. If yours reaches much past that it is too big; bigger is not clearer here.`
    : 'In the reference it fills a little under three quarters of its panel on its longer side. If yours fills its panel it is too big; bigger is not clearer here.'
  return [
    `SIZE AND PLACE — measured against the PANEL, not the paper. ${measured}`,
    `· WHERE it sits is not a composition choice. ${where} Do not re-centre it on its own outline.`,
    s.frames > 1 ? '· Do NOT draw the panel edges: no boxes, borders, gutters, guides or numbers, in any colour. THE PANELS ARE INVISIBLE — they are only where the drawings sit on one unbroken magenta sheet, never cards or tiles with anything showing between them.' : '· Do not draw any border or frame around it.'
  ].join('\n')
}

/** The prompt for one item or rune. */
export const itemPrompt = (s: ItemSheet, fit?: Fit): string => {
  // A sheet with a canvas of its own (`ItemSheet.canvas`) is briefed in that
  // canvas's shape: the HP frames are ONE wide panel, not a square.
  const { w, h } = s.canvas ?? itemSheetSize(s.frames)
  const many = s.frames > 1
  const wide = !many && !!s.canvas && s.canvas.w > s.canvas.h
  const shape = wide
    ? `WHAT COMES BACK IS ONE ${(s.noun ?? 'object').toUpperCase()} ON A FLAT MAGENTA GROUND.\nOne WIDE landscape image, 16:9, holding the single ${s.noun ?? 'object'} the attached reference shows, in the middle, at the reference's size. One picture — not a strip of panels, not a close-up of one part of it.`
    : many
    ? `WHAT COMES BACK IS A STRIP OF ${s.frames} PANELS, NOT ONE PICTURE.\nOne landscape image, 16:9, holding ${s.frames} SEPARATE drawings ${s.set ? `— a DIFFERENT ${s.noun ?? 'object'} in each, in the order READ THE PANELS lists them —` : `of the same ${s.title.toLowerCase()}`} side by side, left to right, each in its own equal share of the width — on the same layout as the attached reference.\n· Exactly ${s.frames} panels. Not 1, not ${s.frames + 1}, not ${s.frames * 2}. One row.\n· ONE big drawing filling the canvas is the wrong answer however well it is painted.\n· THE COUNT IS THE WHOLE JOB, and it is the one mistake that cannot be repaired afterwards. The game cuts this picture into ${s.frames} equal vertical slices WITHOUT LOOKING AT WHAT IS IN IT. One drawing too many and every slice lands across two of them — all ${s.frames} ship as halves, not just the extra one.\n· SO SPACE THEM EVENLY AND KEEP THE JOINS EMPTY. Share the width out equally between them in your head and put one drawing in the middle of each share, with a clear band of plain magenta between every neighbouring pair that nothing reaches into — no mane, no ear, no backdrop, no shadow.\n· DO NOT DRAW THE DIVISIONS. No lines, rules, bars, gutters, boxes, frames or guides between the drawings, in any colour. THE PANELS ARE INVISIBLE — they are only where the drawings happen to sit on one unbroken magenta sheet. A line you draw is paint: it survives the cut and ends up inside the pictures either side of it.`
    : `WHAT COMES BACK IS ONE ${(s.noun ?? 'object').toUpperCase()} ON A FLAT MAGENTA GROUND.\nOne square image, 1:1, holding the single ${s.kind === 'rune' ? 'rune' : s.noun ?? 'object'} the attached reference shows, in the middle, at the reference's size.`
  const lines = [
    shape,
    '',
    'WHAT IT IS NOT:',
    ...(s.not ?? [
      '· Draw ONLY what the reference shows, and nothing else. No ground, no shadow on the ground, no scenery, no characters, no hands holding it, no second object.',
      '· No text, letters or numbers.'
    ]).map((l) => (l.startsWith('·') ? l : `· ${l}`)),
    '',
    INK_AND_SHADING,
    '',
    `WHAT IT IS: ${s.blurb}`,
    ''
  ]
  if (many) lines.push('READ THE PANELS:', ...s.panels.map((p) => `· ${p}`), '')
  lines.push(REFERENCE_CLAUSE, '')
  if (s.kind === 'creature') lines.push(CREATURE_NOT_A_STICKER, '')
  lines.push(`COLOUR IDENTITY (keep the hues; the exact shades are yours): ${s.colour}`, '')
  if (s.tinted) lines.push(neutralClause(`${s.tinted}. The game gives it a different colour for every chapter`), '')
  if (s.keep) lines.push(s.keep, '')
  lines.push(s.view ?? 'THE VIEW: flat and square-on, exactly as the reference shows it. No three-quarter view, no perspective, no tilt, nothing turned toward the viewer.')
  if (s.facing) lines.push(`· ${s.facing}`)
  lines.push('')
  if (many && s.set) {
    // A SET (`ItemSheet.set`): the panels are different drawables, so the
    // strip's "same object, different moment" line would be exactly wrong.
    lines.push(
      `ONE HAND, ${s.frames} DIFFERENT PICTURES: every panel is painted in the same style — the same kind of plum line, the same light from the top left, the same finish, and about the same size in its panel — but each shows ITS OWN subject, the one READ THE PANELS names for it. Do not make them alike, do not merge two into one, and do not swap their order: the game cuts panel 1 out and uses it as the first picture, panel 2 as the second, and so on.`,
      ''
    )
  } else if (many) {
    const noun = s.noun ?? 'object'
    // "butterflys" reads as carelessness in a brief whose whole job is to be
    // read carefully, and the manifest's nouns are the painter's own words.
    const many_ = noun.endsWith('y') ? `${noun.slice(0, -1)}ies` : /(s|sh|ch|x)$/.test(noun) ? `${noun}es` : `${noun}s`
    lines.push(
      `ONE ${s.title.toUpperCase()}: ${s.frames === 2 ? 'both panels are' : `all ${s.frames} panels are`} the same ${noun} at a different moment. Identical shape, identical colours, identical outline weight and identical size in every panel — only what READ THE PANELS names changes. Several different-looking ${many_} side by side are unusable.`,
      ''
    )
  }
  lines.push(s.character ? withCharacter(STYLE_ITEM) : STYLE_ITEM, '', sizeClause(s, fit), '', magentaFor(s.holes), '')
  lines.push(
    'BEFORE YOU CALL IT FINISHED, count and check:',
    many ? `· COUNT THE DRAWINGS left to right. There must be exactly ${s.frames} — not ${s.frames + 1}. One row, 16:9 landscape.` : `· One ${s.noun ?? 'object'}, in the middle of a ${wide ? 'wide 16:9' : 'square'} canvas.`,
    ...(many ? [`· The gaps: ${s.frames - 1} clear bands of plain magenta, one between each neighbouring pair, all about the same width, with nothing reaching into any of them. And NO line, rule, bar or frame drawn anywhere on the sheet.`] : []),
    '· Nothing in any panel is anywhere near filling it.',
    ...(s.tinted ? [`· ${s.tinted[0]!.toUpperCase()}${s.tinted.slice(1)}: pale neutral lilac-grey, no hue.`] : []),
    ...(s.checks ?? []),
    ...STYLE_CHECKS,
    '· Every pixel that is not the object is flat, vivid #FF00FF — hold it against a pure magenta swatch, not against your memory of one.',
    '',
    `OUTPUT: one image, ${many || wide ? '16:9 landscape' : '1:1 square'} (the reference is ${w} x ${h} pixels), PNG — not JPEG. If your tool has an aspect-ratio control, set it to ${many || wide ? '16:9' : '1:1'}${many ? ' — a square return crushes the panels and cannot be cut' : ''}. No labels, captions, numbers or watermarks.`
  )
  return lines.join('\n')
}

/**
 * The prompt for one chapter's book page (§8.32).
 *
 * Unlike every other sheet, this one's brief is mostly about RESTRAINT. The
 * page is furniture: five opaque beat cards and a winding trail are drawn on
 * top of it, and they are the only thing on a page a child is meant to look
 * at. A page that competes with them is a worse page however pretty it is —
 * which is the one way this drawable can fail that no other one can.
 */
/**
 * The FRONT page — the little title-page scene the book falls open on.
 *
 * Unlike a chapter page this is a picture, not paper: a knoll under a
 * rainbow. It still has to stay quiet, because Aurora stands on that knoll
 * and her wardrobe tent beside her, and both are drawn on top.
 */
export const frontPagePrompt = (s: PageSheet): string => [
  `WHAT COMES BACK IS ONE ${s.portrait ? 'TALL PORTRAIT' : 'WIDE LANDSCAPE'} PICTURE — the title page of a storybook, repainted from the attached reference.`,
  `One ${s.portrait ? 'portrait' : 'landscape'} image, about ${s.w} x ${s.h} pixels, filling the frame edge to edge.`,
  '',
  'WHAT IT IS NOT:',
  '· No characters, no unicorns, no people and no animals. A unicorn and a little tent are drawn ON this picture by the game, standing on the knoll — leave that knoll clear and empty.',
  '· No text, letters, numbers or writing anywhere.',
  '· No cards, frames, boxes or borders.',
  '',
  INK_AND_SHADING,
  '',
  `WHAT IT IS: the opening page of the book — ${s.mood}. A soft sky from pale blue at the top into warm cream near the horizon; a wide gentle RAINBOW arcing up out of the meadow; two soft bands of green meadow across the lower part; a low rounded KNOLL in the middle where the ground swells up; and a pale sandy path setting off from the knoll toward the right edge, as if walking out of the page.`,
  '',
  // THE LAND IS NOT INKED, AND THE PATH IS NOT DOTTED. Two returns came back
  // with hard dark lines cutting across the hills and the path broken into
  // beads. The path was our own fault — the brief used to call it "a dotted
  // golden trail", and the game's own dashes are a "turn me" hint drawn on
  // top, not landscape. The ink is the painter's own reflex, and the style
  // block alone does not stop it on something this big and this soft.
  'THE LANDSCAPE HAS NO OUTLINE. Hills, meadow, horizon, knoll and path have no drawn edge anywhere — where two greens meet, the colour simply changes, and that IS the edge. A dark line running across a hill reads as a crack in the paper, not as ground.',
  '· THE SKYLINE ESPECIALLY. Where a hill meets the sky, do not run a pen along it. That is the one edge hardest to leave alone and the one that spoils the page: a line drawn on the crest of a hill is what makes a painting look like a drawing somebody coloured in. Paint the hill up to the sky and STOP — no line, not even a thin one, not even a soft one.',
  '',
  'THE PATH IS ONE UNBROKEN BAND of pale sand, soft-edged, fading as it goes. Do not dot it, dash it, bead it, or lay stones or tiles along it. One path only — if you have painted a path, do not draw a second line along it.',
  '',
  REFERENCE_CLAUSE,
  '',
  NOT_A_TIDY_UP,
  '',
  'KEEP THE LAYOUT — the game stands things on this picture by their place in it:',
  '· The horizon, the rainbow, the meadow bands, the knoll and the trail all stay exactly where the reference puts them, at the same size.',
  '· THE TOP OF THE KNOLL STAYS CLEAR. A unicorn and a tent stand there: no flowers, no bushes, no detail on the crown of it, and nothing that would show through them.',
  // NOTHING MAY BE LEFT OUT — the same trap the sector prompt already names.
  // A return that is asked to stop drawing lines will quietly stop drawing
  // the small things too, and the meadow comes back bare.
  '· THE LITTLE SCATTERED BLOSSOMS STAY. The meadow away from the knoll is dotted with tiny flowers and sparkles, as the reference has them — they are part of the picture, not clutter to tidy away. A bare green field is wrong.',
  '· Do not zoom, crop or re-frame. Open sky in the reference stays open sky.',
  '',
  'KEEP IT CALM. This is the page the book rests on before the story starts, and the only things meant to catch the eye are the characters the game puts on it. Soft, warm and simple.',
  '',
  STYLE_SCENE,
  '',
  FULL_BLEED,
  '',
  'BEFORE YOU CALL IT FINISHED, check:',
  '· No characters and no tent anywhere; the top of the knoll is clear.',
  '· The rainbow, the knoll and the trail are where the reference has them.',
  '· Trace the skyline with your eye, from the left edge to the right: is there a dark line anywhere along the top of a hill? There must not be one.',
  '· Is the path one continuous band, with no dots, dashes or stones on or beside it?',
  '· No text, no frames.',
  ...STYLE_CHECKS,
  '',
  `OUTPUT: one image, ${s.portrait ? 'tall portrait (for example 768 x 1408 pixels), 9:16' : 'wide landscape (for example 1408 x 768 pixels), 16:9'}, PNG. If your tool has an aspect-ratio control, set it to ${s.portrait ? '9:16' : '16:9'}. No labels, captions, numbers or watermarks.`
].join('\n')

/**
 * The Wardrobe Kiosk's room — the inside of the dressing-up tent.
 *
 * Its own builder rather than the page's, because almost everything in a
 * page's brief is about RESTRAINT and this is the opposite: it is a room a
 * child stands her unicorn in, and the whole reason it is being painted is
 * that the drawn one is the last flat thing left in a painted game.
 *
 * What it must not carry is written from what the room actually contains: a
 * rug (the game lays its own, under Aurora), a glow on the bulbs (it pulses),
 * a darkened edge (the game washes one over the whole room), and the props of
 * a dressing room the reference does not show.
 */
export const wardrobePrompt = (s: WardrobeSheet): string => [
  `WHAT COMES BACK IS ONE ${s.portrait ? 'TALL PORTRAIT' : 'WIDE LANDSCAPE'} PICTURE — the inside of a little tent, repainted from the attached reference.`,
  `One ${s.portrait ? 'portrait' : 'landscape'} image, about ${s.w} x ${s.h} pixels, filling the frame edge to edge.`,
  '',
  'WHAT IT IS NOT — the game draws its own things on this picture, and every one of them painted in ends up doubled:',
  '· NO characters. No unicorn, no pony, no person, no animal, no toy. A unicorn stands in the middle of this room and the game draws her; a painted one would stand frozen beside her for ever.',
  // The floor is bare peach in the reference, and a painter asked for a
  // dressing room furnishes one. The rug in particular is a drawable of its
  // own — LAYERS.md's rule for a part the host must not paint.
  '· NO RUG, NO MAT, NO CARPET, NO FLOOR CLOTH of any kind. The game lays its own painted rug down where the unicorn stands. One painted into the floor ends up under a second.',
  '· NO furniture and no dressing-room props: no mirror, no clothes rail, no hangers, no dresses, no boxes, no chests, no stool, no dressing table, no shelves, no baskets, no hats, no jewellery. The floor is bare and the walls are bare cloth.',
  '· NO GLOW around the little lights. Paint each bulb as a small solid bead and stop there — the game pulses a soft halo on every one of them, and a painted glow would sit frozen underneath the twinkling one.',
  '· NO dark edges, corners or vignette. The game washes its own soft shadow into the corners; yours would be doubled, and it cannot be taken off again.',
  // The shared scene block asks every full-bleed picture for soft clouds and
  // drifting sparkles, which is right for fifty meadows and wrong inside a
  // tent. Fenced here rather than weakened there.
  '· NO sky, no clouds, no landscape, and nothing drifting in the air — no sparkles, no petals, no dust, no bubbles. You are indoors, and the game puts its own sparkles in this room.',
  '· No text, letters, numbers or writing anywhere. No frame, no border, no card.',
  '',
  INK_AND_SHADING,
  '',
  // The same trap the sectors pay for, in this room's nouns: the reference is
  // drawn with a hard edge wherever two colours meet, because that is how a
  // canvas fill works — and a painter shown hard edges paints hard edges.
  'THE REFERENCE IS A DIAGRAM, NOT A STYLE. It is a flat computer drawing: every stripe is a hard-edged block of one colour and the floor is one hard-edged block under them, because that is how the game sketches a plan. YOUR PICTURE IS NOT MADE THAT WAY. Paint cloth and paint a floor. Let a line appear only where a real brush would leave one — in the shadow of a fold, under the cord — thinning away to nothing along a lit edge, and absent altogether on anything small.',
  '· NOTHING IN THE ROOM IS OUTLINED. The stripes are two colours of cloth lying side by side: where one meets the next the colour changes, and that IS the edge. A dark line ruled between two stripes turns the tent into a barcode.',
  '· THE FLOOR IS NOT OUTLINED EITHER. Where the wall meets the floor the colour changes and the shadow gathers. Do not rule a line along it, and do not draw a skirting board.',
  '',
  `WHAT IT IS: the inside of a child's dressing-up tent — a small, cosy, safe little room to try things on in. Warm candy-pink and cream striped canvas walls running from the top of the picture down to the floor, softened by the gentle folds and sags real cloth makes; a bare, warm peach floor across the ${s.portrait ? 'lower part' : 'bottom fifth'} of the picture; and a string of little round fairy lights hanging in a shallow curve across the very top, threaded on a thin dark cord that runs from one edge to the other — butter-yellow, candy-pink and sky-blue bulbs, repeating in that order.`,
  '',
  REFERENCE_CLAUSE,
  '',
  // The same argument the scenes' NOT_A_TIDY_UP makes, in the room's own
  // nouns: "follow the reference" and "paint it properly" pull against each
  // other, and a painter that resolves the tension by tidying the vector art
  // has obeyed the louder of the two.
  'YOU ARE PAINTING THIS ROOM BY HAND, NOT TIDYING UP THE REFERENCE.',
  '· The reference is flat vector art: dead-straight stripes of one flat colour, a floor of one flat colour, no light, no folds, no depth. You are copying its LAYOUT and REPAINTING everything else by hand.',
  '· REPAINT the cloth: the stripes hang and sag a little, their edges wander the way woven cloth does, and the colour shifts across each one. REPAINT the floor: warm, soft, with its own quiet grain and colour variation.',
  '· Light it warmly from the top left, the way daylight comes through canvas: the walls brighter up near the lights and settling deeper toward the floor, a soft shadow gathering where the wall meets the floor, and a warm little pool of light under each bulb on the cloth behind it.',
  '· KEEP THE REFERENCE\'S COLOURS — its pinks, its creams, its peach floor are the room\'s real hues. Shading DARKENS a shape; it never drains it. A pale, grey, washed-out tent is exactly as wrong as a flat one.',
  '· THE TEST: put your picture beside the reference. If someone could mistake yours for the reference with softer corners, it is not finished.',
  '',
  'KEEP THE LAYOUT — the game stands a unicorn on this picture and measures by it:',
  // The renderer blits this as a wall band and a floor band split on exactly
  // this line, so a floor drawn higher or lower than it is a horizon that
  // lands somewhere else again on every screen.
  `· THE FLOOR LINE IS A CONTRACT. The floor meets the wall in ONE straight, level line straight across the picture, at exactly ${pct(s.floor)} of the way down from the top, just as the reference has it. Not tilted, not curved, not stepped, not in two parts, and not at a different height on the left than on the right. The game cuts your picture along that line.`,
  '· THE MIDDLE OF THE FLOOR STAYS EMPTY AND PLAIN. That is where the unicorn stands and where the game lays its rug: no pattern, no boards, no tiles, no objects, nothing to show through them.',
  '· The string of lights stays where the reference hangs it, with the same number of bulbs in the same order of colours, and the cord reaches both edges of the picture.',
  '· Do not zoom, crop or re-frame. The stripes reach the top of the picture and the floor reaches the bottom.',
  '',
  'KEEP IT CALM AND WARM. This is a quiet room between two bits of play, and the only thing meant to catch the eye is the unicorn the game puts in it.',
  '',
  STYLE_SCENE,
  '',
  FULL_BLEED,
  '',
  'BEFORE YOU CALL IT FINISHED, check:',
  '· No characters, no rug, no mirror, no furniture, nothing standing on the floor at all.',
  `· One level floor line, straight across, ${pct(s.floor)} of the way down.`,
  '· Run your eye down between two stripes: is there a dark line ruled between them? There must not be one.',
  '· The bulbs are small solid beads on a thin cord, with no halo or bloom painted around any of them.',
  '· No dark corners, no vignette, no frame, no text.',
  ...STYLE_CHECKS,
  '',
  `OUTPUT: one image, ${s.portrait ? 'tall portrait (for example 768 x 1365 pixels), 9:16' : 'wide landscape (for example 1365 x 768 pixels), 16:9'}, PNG. If your tool has an aspect-ratio control, set it to ${s.portrait ? '9:16' : '16:9'}. No labels, captions, numbers or watermarks.`
].join('\n')

/**
 * The cloth the book lies on: a surface, not a picture. It is stretched over
 * the whole screen behind the book, so it must have no composition of its own
 * and nothing that looks like a subject.
 */
export const coverPrompt = (s: PageSheet): string => [
  'WHAT COMES BACK IS ONE SQUARE SWATCH OF CLOTH — a flat piece of fabric seen straight on, filling the frame. Not a scene, not an object, not a picture of a book.',
  `One square image, about ${s.w} x ${s.h} pixels, filling the frame edge to edge.`,
  '',
  'WHAT IT IS NOT — this is the whole difficulty:',
  '· NO subject of any kind. No book, no characters, no objects, no scenery, no shapes, no pattern, no motif, no border, no vignette, no corners.',
  '· No text, letters or numbers.',
  '· Nothing that draws the eye anywhere in particular. It is stretched behind everything else on the screen and must never compete with it.',
  '',
  INK_AND_SHADING,
  '',
  `WHAT IT IS: the cloth a big storybook is lying on, seen from directly above — ${s.mood}. A soft woven fabric in warm lilac-purple, a little deeper and cooler at the top of the square and warming to a dusty rose-lilac at the bottom, as if light falls across it from below. Its weave shows very faintly: the texture of a soft linen or velvet, felt more than seen.`,
  '',
  'IT MUST TILE ITS OWN FEELING, NOT ITS PATTERN. The gradient runs top to bottom and nothing else changes across the square. If you covered any part of it, nothing would be missing.',
  '',
  'KEEP IT DEEP AND QUIET. It sits behind a bright book and is the darkest thing on the screen. Rich and warm, never black, never busy, and with no bright spot anywhere.',
  '',
  STYLE_CORE,
  '',
  FULL_BLEED,
  '',
  'BEFORE YOU CALL IT FINISHED, check:',
  '· It is a surface, not a picture. There is nothing in it to look at.',
  '· Lilac-purple, deeper at the top, warmer at the bottom, weave barely visible.',
  '· No object, no motif, no border, no text, no bright spot.',
  ...STYLE_CHECKS,
  '',
  `OUTPUT: one image, 1:1 square (for example ${s.w} x ${s.h} pixels), PNG. If your tool has an aspect-ratio control, set it to 1:1. No labels, captions, numbers or watermarks.`
].join('\n')

export const pagePrompt = (s: PageSheet): string =>
  s.chapter === -2 ? coverPrompt(s) : s.chapter < 0 ? frontPagePrompt(s) : [
  `WHAT COMES BACK IS ONE ${s.portrait ? 'TALL PORTRAIT' : 'WIDE LANDSCAPE'} PICTURE — a sheet of paper from a storybook, seen flat. Not a scene, not a landscape, not an illustration with a subject.`,
  `One ${s.portrait ? 'portrait' : 'landscape'} image, about ${s.w} x ${s.h} pixels, filling the frame edge to edge.`,
  '',
  'WHAT IT IS NOT — read this twice, it is the whole difficulty:',
  '· This is the BACKGROUND of a page, not a picture on a page. There is NO scene, no characters, no buildings, no foreground, nothing to look at.',
  '· No text, letters, numbers or writing anywhere.',
  '· No cards, frames, boxes, panels, borders or rounded rectangles. The game draws five picture cards and a winding dotted trail ON TOP of your paper, and they must be the only things a child\'s eye goes to.',
  '· Nothing in the middle of the sheet. Whatever you draw is faint and scattered toward the edges.',
  '',
  INK_AND_SHADING,
  '',
  `WHAT IT IS: the paper page for "${CHAPTERS[s.chapter]?.name ?? 'this chapter'}" — ${s.mood}. Three quiet layers and nothing else:`,
  '1. THE PAPER — warm cream watercolour paper (about #fff4e6), with its own fibre and tooth, a little warmer and brighter toward the head of the sheet and settling very slightly darker toward one edge, the way a sheet lying open in a book does.',
  `2. MARGINALIA — the chapter's world doodled on the paper the way a picture book fills its endpapers: ${s.motifs}. Thin single-line ink sketches in warm deep plum, VERY faint (about a tenth of full strength — just visible, never solid), scattered around the margins with plenty of bare paper between them, at different sizes and slight rotations. They are drawings ON the paper, not objects in a world: no ground, no shadows, no scene, no arrangement into a picture.`,
  `3. THE WASH — a soft band of the chapter's colour along the ${s.portrait ? 'LEFT edge of the sheet, rising about a fifth of the way across' : 'BOTTOM of the sheet, rising about a third of the way up'}, like a watercolour hill painted onto the page and left to dry. Soft-edged, pale, no outline. Its colours: ${s.mood}.`,
  '',
  'KEEP IT QUIET. Every part of this is pale and low-contrast against the cream. If you hold the finished sheet at arm\'s length it should read as "a warm sheet of paper", and only close up as "oh, there are little drawings on it". A bold, busy or high-contrast page is the failure mode here.',
  '',
  STYLE_CORE,
  '',
  FULL_BLEED,
  '',
  'BEFORE YOU CALL IT FINISHED, check:',
  '· It is a sheet of PAPER, not a picture of a place. Nothing has a ground or a horizon.',
  '· The middle of the sheet is bare paper.',
  '· The doodles are single thin lines, very faint, and scattered — not a border, not a pattern, not a scene.',
  `· One soft colour wash along the ${s.portrait ? 'left edge' : 'bottom'}, and nowhere else.`,
  '· No text, no frames, no cards, no rectangles.',
  ...STYLE_CHECKS,
  '',
  `OUTPUT: one image, ${s.portrait ? 'tall portrait (for example 768 x 1408 pixels), 9:16' : 'wide landscape (for example 1408 x 768 pixels), 16:9'}, PNG. If your tool has an aspect-ratio control, set it to ${s.portrait ? '9:16' : '16:9'}. No labels, captions, numbers or watermarks.`
].join('\n')

/** Who a character model image shows: display name, and the `PORTRAIT_SETS`
 *  key whose emote order its panels are in. */
const MODEL_NAME: Readonly<Record<string, string>> = {
  [AURORA_MODEL]: 'Aurora',
  [UMBRA_MODEL]: 'Umbra'
}
const MODEL_WHO: Readonly<Record<string, string>> = {
  [AURORA_MODEL]: 'aurora',
  [UMBRA_MODEL]: 'umbra'
}

/** "Aurora wears her model's panel 1 — happy: a warm, open smile…" */
const faceClause = (model: string, panel: number): string => {
  const name = MODEL_NAME[model] ?? model
  const set = PORTRAIT_SETS.find((p) => p.who === MODEL_WHO[model])
  const emote = set?.emotes[panel - 1]
  const described = emote ? EMOTE_PANEL[emote] : 'the mood the scene describes.'
  return `· ${name}'s face on this page is the one in PANEL ${panel} of her model — ${described} Copy that expression exactly: the eyes, the brows and the mouth together. Do not average her moods into a neutral face.`
}

/** The prompt for one of the intro's picture-book pages (§8.26). */
export const storyPrompt = (s: StorySheet): string => {
  const names = s.also.map((a) => MODEL_NAME[a] ?? a)
  const who = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0]!
  return [
    'WHAT COMES BACK IS ONE LANDSCAPE PICTURE — one page of a picture book, repainted from the LAST attached image. Not a sheet, not panels, not several pictures, not a close-up.',
    'One wide landscape image, 16:9, holding the WHOLE scene the last image shows, framed exactly as it frames it.',
    '',
    `THE ATTACHED IMAGES, in order: ${names.map((n, i) => `image ${i + 1} is the model for ${n} — a strip of her face in several moods`).join('; ')}; the LAST image is the page to paint.`,
    '',
    // The first return kept the reference's small-headed character and ignored
    // the model entirely: "the page's poses and sizes come from the last
    // image" is read as covering the character's proportions too. The two
    // images have to be given SEPARATE authority, and the conflict named.
    `WHO ${names.length > 1 ? 'THEY ARE' : 'SHE IS'} COMES FROM THE MODEL; WHERE ${names.length > 1 ? 'THEY STAND' : 'SHE STANDS'} COMES FROM THE LAST IMAGE.`,
    `· Paint ${who} exactly like ${names.length > 1 ? 'their models' : 'her model'} — the same face, the same huge eyes, the same colours, the same mane and horn, AND THE SAME CHIBI PROPORTIONS: the head as wide as the body, the legs short and sturdy.`,
    `· The last image draws ${names.length > 1 ? 'them' : 'her'} with a smaller head and longer legs. That is a placeholder. It tells you only WHERE ${names.length > 1 ? 'they stand' : 'she stands'}, how much room ${names.length > 1 ? 'they take' : 'she takes'} up, which way ${names.length > 1 ? 'they face' : 'she faces'} and what ${names.length > 1 ? 'they are' : 'she is'} doing. Where the two disagree about how ${names.length > 1 ? 'they are' : 'she is'} BUILT, the model wins every time.`,
    `· ${who} still fill${names.length > 1 ? '' : 's'} the same overall space on the page as in the last image — a big-headed character in the same footprint, not a bigger one.`,
    '',
    'THE FACE THIS PAGE WEARS — a model is several moods side by side, and only one of them belongs here:',
    ...s.also.map((m, i) => faceClause(m, s.faces[i] ?? 1)),
    '',
    'WHAT IT IS NOT:',
    '· No text, letters, numbers or writing anywhere.',
    '· No characters, creatures or people other than the ones the last image shows.',
    '· No magic effects, runes, sparkles or bubbles that the last image does not show: the game animates those over your picture.',
    '',
    INK_AND_SHADING,
    '',
    `WHAT IT IS: page ${s.panel} of the game's opening picture book, "${s.title}". ${s.scene}`,
    '',
    REFERENCE_CLAUSE,
    '',
    NOT_A_TIDY_UP,
    '',
    'KEEP THE LAYOUT — the game animates things over this picture by their place in it:',
    '· The meadow, the cottage, the windmill, the pond and the path stay exactly where the reference puts them, at the same size. Nothing grows, shrinks or slides: the pond is as wide and as far from the corner as the reference has it, the path meets the ground where it does, the horizon sits where it sits.',
    '· Each character stands exactly where the reference puts her, taking up the same room on the page, in the same pose, facing the same way — built like her model.',
    '· Do not zoom, crop or re-frame. Open space in the reference stays open.',
    '',
    'THE VIEW: the same flat, storybook, side-on view as the reference. No camera move, no new perspective, no tilt.',
    '',
    withCharacter(STYLE_SCENE),
    '',
    FULL_BLEED,
    '',
    'BEFORE YOU CALL IT FINISHED, check:',
    '· One landscape picture, 16:9, the whole scene, framed like the reference.',
    `· ${who} ${names.length > 1 ? 'look' : 'looks'} exactly like ${names.length > 1 ? 'their models' : 'her model'}, where the reference puts ${names.length > 1 ? 'them' : 'her'}, the same size, built chibi.`,
    ...s.also.map((m, i) => {
      const name = MODEL_NAME[m] ?? m
      const set = PORTRAIT_SETS.find((p) => p.who === MODEL_WHO[m])
      const emote = set?.emotes[(s.faces[i] ?? 1) - 1]
      return `· ${name} is wearing panel ${s.faces[i] ?? 1}'s face${emote ? ` (${emote})` : ''}, big and readable — not a blank one.`
    }),
    '· No text, no frame, no extra effects.',
    ...STYLE_CHECKS,
    '',
    'OUTPUT: one image, 16:9 landscape (for example 1344 x 768 pixels), PNG. If your tool has an aspect-ratio control, set it to 16:9. No labels, captions, numbers or watermarks.'
  ].join('\n')
}

/* ───────────────────────────────── the brand pair (art-style.md §11) ── */

/**
 * The MARK.
 *
 * Three things make this prompt different from every other one in the file,
 * and each is a way the picture comes back unusable rather than merely worse:
 *
 *  1. **No lettering, said three times.** It is the one drawable a painter
 *     will volunteer text into, because "logo" means type to everybody. The
 *     game's title is live i18n text drawn OVER this icon in the player's own
 *     language, so painted letters are both wrong in twenty locales and
 *     underneath a second title.
 *  2. **It keeps its own ground.** Every keyed sheet forbids the subject a
 *     background because the renderer draws one; an icon IS the background,
 *     out to its four edges, and left forbidden it comes back a cut-out.
 *  3. **It is read at 32 px.** A mark that needs its details is not a mark, so
 *     the brief asks for the silhouette test by name rather than hoping.
 */
export const logoPrompt = (s: BrandSheet): string => [
  'WHAT COMES BACK IS ONE SQUARE APP ICON — a single painted picture filling the square, edge to edge. Not a sheet, not panels, not a logo sitting on a background.',
  `One square image, 1:1, at least ${s.w} x ${s.h} pixels.`,
  '',
  'WHAT IT IS NOT — read this twice, it is the whole difficulty:',
  '· NO TEXT OF ANY KIND. No letters, no words, no title, no game name, no initials, no numbers, no signature, no watermark — not one character anywhere in the picture. The game writes its own name over this icon, in the player\'s own language, so anything you letter lands underneath a title that is already there.',
  '· No frame, no border, no rounded corners, no badge, no crest, no shield, no ribbon, no laurel, no circle or rosette cut out of the square. The painting runs off all four edges.',
  '· Only Aurora. No second unicorn, no rider, no creature, no hands.',
  '· No magic effects, runes, hearts or speech bubbles.',
  '',
  INK_AND_SHADING,
  '',
  'WHAT IT IS: the game\'s mark. Aurora — a cute chibi unicorn — seen head and neck only, large and friendly, turned three quarters toward the viewer and looking out of the picture with a warm, open smile. Her golden spiral horn rises clear above her. Behind her a soft rainbow arches up from the bottom of the square and is cut off by its edges. The sky behind is a warm lilac, lighter around her head and deeper toward the corners, with a few small cream sparkles scattered in it.',
  '',
  REFERENCE_CLAUSE,
  '',
  'KEEP THE LAYOUT — the reference has already decided this picture\'s composition:',
  '· Her head is the same size and in the same place: it fills most of the middle of the square, and the horn reaches into the upper third.',
  '· The rainbow springs from the same place at the same width, and is cut by the square\'s edges exactly where the reference cuts it.',
  '· Nothing important goes in the outer eighth on any side. Every store crops an icon to a shape nobody warned you about — a circle, a squircle — and what it eats is whatever was nearest the edge.',
  '',
  'IT MUST STILL READ AT 32 PIXELS. This is a browser tab and a home-screen icon before it is anything else:',
  '· One subject, big. If a detail needs a second look, leave it out.',
  '· The horn and the ear tips are the silhouette — keep them clear of the mane and clear of the rainbow, with light behind them.',
  '· Strong value contrast between her cream coat and the lilac sky. Squint at your result: her head must still be an obvious shape.',
  '',
  'COLOUR IDENTITY (keep the hues; the exact shades are yours): a warm cream coat with a peachy shadow side; a mane led by butter-gold with pink, lilac, mint and sky streaks through it; a gold spiral horn; violet eyes with two white catch-lights; pink blush. The sky is warm lilac, deeper at the corners than behind her head. The rainbow is the game\'s own: pink, apricot, gold, mint, sky, lilac.',
  '',
  'THE VIEW: a three-quarter head, exactly as the reference shows it. No full body, no legs, no flat profile, no perspective, no tilt.',
  '',
  withCharacter(STYLE_SCENE),
  '',
  FULL_BLEED,
  '',
  'BEFORE YOU CALL IT FINISHED, check:',
  '· NOT ONE LETTER, DIGIT OR MARK THAT LOOKS LIKE WRITING, anywhere in the picture. Look again at the sparkles and along the rainbow — that is where a stray glyph hides.',
  '· One square picture, painted to all four edges, with no frame, no border and no rounded corners.',
  '· One unicorn head, three-quarter, big, smiling, the horn clear above her.',
  '· Shrink it in your head to a thumbnail: it still reads as a unicorn.',
  ...STYLE_CHECKS,
  '',
  `OUTPUT: one image, 1:1 square (for example 1024 x 1024 pixels, and never smaller than ${s.w} x ${s.h}), PNG. If your tool has an aspect-ratio control, set it to 1:1. No labels, captions, numbers or watermarks.`
].join('\n')

/**
 * The MASCOT.
 *
 * An intro page's problem with an item's ground rules: two characters whose
 * BUILD must come off their models while their pose, size and facing come off
 * the reference, painted onto a chroma key that forbids them anything to stand
 * on.
 *
 * Their moods are named by DESCRIPTION, where every other model-fed prompt in
 * this file names them by PANEL NUMBER. A panel number is the better
 * instruction when a strip has the panels the manifest asked for, and a trap
 * when it does not: `portrait-umbra` came back with nine faces against the
 * five it was briefed for, so "panel 4" points at a different mood in the
 * picture the painter is actually holding.
 */
export const mascotPrompt = (s: ItemSheet, fit?: Fit): string => {
  const c = s.canvas ?? itemSheetSize(s.frames)
  return [
    'WHAT COMES BACK IS ONE WIDE PICTURE OF TWO UNICORNS ON A FLAT MAGENTA GROUND.',
    `One landscape image, 16:9, about ${c.w} x ${c.h} pixels, holding BOTH unicorns side by side exactly as the LAST attached image places them. One picture — not two pictures, not a strip of panels, not a close-up of either one.`,
    '',
    'THE ATTACHED IMAGES, in order: image 1 is the model for Aurora — a strip of her face in several moods; image 2 is the model for Umbra — the same, for her; the LAST image is the picture to paint.',
    '',
    'WHO THEY ARE COMES FROM THE MODELS; WHERE THEY STAND COMES FROM THE LAST IMAGE.',
    '· Paint Aurora and Umbra exactly like their models — the same faces, the same huge glossy eyes, the same colours, the same manes and horns, AND THE SAME CHIBI PROPORTIONS: the head as wide as the body, the legs short and sturdy.',
    '· The last image draws them with smaller heads and longer legs. That is a placeholder. It tells you only WHERE each one stands, how much room she takes up, which way she faces and what she is doing. Where the two disagree about how she is BUILT, the model wins every time.',
    '· Each one still fills the same overall space in the picture as in the last image — a big-headed character in the same footprint, not a bigger one.',
    '',
    // The first mascot (2026-09-23) was thrown away for both of these. The
    // models are HEAD strips, so "the model wins on the build" had no body to
    // win with, and the only body the painter ever saw was the duel rig's long
    // jointed legs — which it copied. And the rig's small FAR EAR, behind the
    // head, came back as a dark spike out of the back of Aurora's mane: the
    // owner read it as a second horn. Naming the failure AND what it costs is
    // what has worked everywhere else in this file, plus a count in the checks.
    'THE MODELS SHOW ONLY THEIR HEADS — SO HERE IS THE BODY, IN WORDS, AND THE LAST IMAGE\'S BODY IS NOT IT.',
    '· The last image\'s bodies are a stick-legged duel PUPPET: long thin legs bent at a knee, a small barrel perched high on top of them. A previous painting copied that, and it was thrown away: a foal on stilts with a stiff, bent stance and an awkward rump is not our Aurora, however well it is painted.',
    '· THE CHIBI BUILD, for BOTH of them: a BIG round head; a small, soft, rounded body like a bean or a plush toy, barely longer than the head is wide, sitting LOW; a round rump and a gently curved back.',
    '· FOUR SHORT, THICK, STRAIGHT LEGS, like soft little pillars, ending in small rounded hooves — gold for Aurora, violet for Umbra. Each leg is SHORTER than her head is tall. No visible knees, hocks, fetlocks or thin ankles — no realistic horse anatomy at all.',
    '· ALL FOUR STAND STRAIGHT DOWN AND PLANTED: two front legs under the chest, two back legs under the rump, the far pair just peeking out behind the near pair. Nothing bent, crossed, kicked, stepping or tucked.',
    '· To keep the same footprint, SHORTEN THE LEGS AND LET THE HEAD GROW: they still stand on the last image\'s hoof line and fill the same space in the picture, but far more of that space is head.',
    '· The tail is a few big soft locks in the mane\'s colours (Aurora: gold with pastel streaks), falling softly — never the last image\'s flat, stiff, hard-edged blades.',
    '',
    'EXACTLY ONE HORN EACH — COUNT THEM. The same previous painting grew Aurora a SECOND horn and was thrown away for it: the last image draws a small FAR EAR behind her head, and it came back as a dark pointed spike sticking up out of the back of her mane. At splash size that is a two-horned unicorn, which is not Aurora.',
    '· Each has ONE single spiral horn, rising from the middle of her forehead, pointing up and a little forward — gold for Aurora, violet for Umbra.',
    '· Her ears are two SOFT, ROUNDED ears in her coat colour (pink inside for Aurora, lilac inside for Umbra), set on top of her head just behind the horn, clearly SMALLER than the horn and never pointed like it. The far ear is at most a small soft rounded bump peeking out of the mane — coat-coloured, never dark, never a spike, or simply hidden by the mane.',
    '· NOTHING ELSE ON EITHER HEAD IS POINTED: no second horn, no spike, no antenna, no dark wedge poking out of the mane. The mane is soft rounded locks all the way round — big soft curls for Aurora.',
    '· UMBRA\'S COLOURS COME FROM HER MODEL, NOT FROM THE LAST IMAGE. The last image inks her almost black and gives her one glowing cyan eye, which is how the game draws her mid-duel. Her model is who she really is: a soft, deep VIOLET coat you can read the shading in, a lilac mane with pale cyan streaks, and ordinary warm eyes with two white catch-lights. Paint the model. A black unicorn with a glowing eye is the wrong character for this picture.',
    '',
    'THE FACES THEY WEAR — a model is several moods side by side, and only one of them belongs here. Find each by its EXPRESSION; do not count panels.',
    '· AURORA wears her HAPPY face: eyes wide open and bright, brows relaxed, a warm closed smile, a little pink in the cheeks. Delighted to see her.',
    '· UMBRA wears her WARM face: eyes softened and a little half-lidded, a real open smile, BOTH cheeks flushed a strong pink — pleased, and a bit caught out. Not the sleepy face, not the sulky one, and never a cross, smug or mean one. She is a friendly rival, and this picture is the game saying hello.',
    '· Copy each expression exactly — the eyes, the brows and the mouth together. Do not average a character\'s moods into a neutral face: a blank face here is a failed drawing however well it is painted.',
    '',
    'THEY ARE LOOKING AT EACH OTHER. That is the whole picture, and it is the one thing that must be unmistakable:',
    '· Aurora is on the LEFT and faces RIGHT. Umbra is on the RIGHT and faces LEFT. Their eyes meet across the gap between them.',
    '· Both stand squarely on all four hooves, both at the same height, as the last image has them. No rearing, no walking, no jumping, no leaning on one another.',
    '· THE GAP BETWEEN THEM STAYS OPEN and stays empty. Their muzzles do not touch and their manes do not meet in the middle — at a thumbnail, two overlapping chibi unicorns read as one strange animal.',
    '',
    'WHAT IT IS NOT:',
    '· Only these two unicorns. No third character, no creature, no wings, no crown, no saddle, no props of any kind.',
    '· No magic, no runes, no spells, no sparkles, no stars, no hearts, no speech bubbles, no motion lines. The game animates all of that over this picture.',
    '· No ground, no grass, no floor, no horizon, no scenery, no clouds. They stand on nothing.',
    '· No text, letters or numbers.',
    '',
    INK_AND_SHADING,
    '',
    `WHAT IT IS: ${s.blurb}`,
    '',
    // NOT the shared REFERENCE_CLAUSE: that says "follow its shapes and its
    // PROPORTIONS", which here is an order to paint the puppet's stilt legs —
    // the exact thing the paragraph on the body forbids. The first mascot
    // resolved that contradiction in the reference's favour.
    'THE LAST ATTACHED IMAGE is a flat computer drawing that decides the LAYOUT ONLY: where each one stands, how much of the picture she fills, which way she faces and where her hooves meet the invisible ground. Take NOTHING else from it — not its body proportions, not its legs, not its ears, not its tail, not its line weight, not its flat colours. Their build comes from the paragraph above and their faces from the models.',
    '',
    `COLOUR IDENTITY (keep the hues; the exact shades are yours): ${s.colour}`,
    '',
    'THE VIEW: both seen from the side, flat and square-on, exactly as the last image shows them. No three-quarter body, no perspective, no tilt, no camera angle. Only the faces turn, and only as far as the models turn them — Aurora\'s muzzle points RIGHT, toward Umbra, and Umbra\'s points LEFT, toward Aurora.',
    '',
    withCharacter(STYLE_ITEM),
    '',
    'SIZE AND PLACE — measured against the whole picture, not against your composition.',
    fit
      ? `· Together they span ${pct(fit.w)} of the picture's width and ${pct(fit.h)} of its height in the reference. If yours reach much past that they are too big; bigger is not clearer here.`
      : '· Together they span a little under three quarters of the picture in the reference.',
    '· Their hooves stand on the same invisible line as the reference\'s, at the same height up the picture. Do not re-centre them on their own outlines, and leave the air the reference leaves above their horns.',
    '· Do not draw any border, frame, panel edge or guide, in any colour.',
    '',
    magentaFor(undefined),
    '',
    'BEFORE YOU CALL IT FINISHED, count and check:',
    '· TWO unicorns, one picture, side by side on one unbroken magenta sheet.',
    '· Aurora left facing right, Umbra right facing left, eyes meeting, a clear gap between them.',
    '· COUNT THE HORNS: one on Aurora, one on Umbra — TWO in the whole picture, no more. Then look at the BACK of each head: nothing pointed and nothing dark sticks up out of the mane, and each ear is round, soft and smaller than the horn.',
    '· COUNT THE LEGS: four each, all short, thick, straight and planted. Hold her head against one of her legs: the leg is SHORTER. If any leg is long, thin or bent at a knee, it is the puppet\'s leg — shorten it.',
    '· Both are built like chibi plush toys: the head as wide as the body, the body round and low, the rump round.',
    // The roll that fixed the build (2026-09-24) shaded the little enclosed
    // crease between Aurora's tail and her rump a darker pink: it was walled in
    // by ink, so it was not ground to the key, and shipped a hot-pink sliver.
    '· Look into every small enclosed gap — between the tail and the rump, between the legs, under the chin. Each is the same flat magenta as the four corners, never a darker pink "shadow" in the crease.',
    '· Cover everything but the two heads. Aurora reads as delighted and Umbra as warm and blushing, at a glance.',
    '· Nothing under them. NO shadow, no dark patch, no soft smudge where a hoof meets the magenta — that is a darker magenta, it cannot be cut away, and it ships as a pink stain welded under them for ever.',
    '· No sparkles, no runes, no ground, no text.',
    ...STYLE_CHECKS,
    '· Every pixel that is not one of the two unicorns is flat, vivid #FF00FF — hold it against a pure magenta swatch, not against your memory of one.',
    '',
    'OUTPUT: one image, 16:9 landscape (for example 1344 x 768 pixels), PNG — not JPEG. If your tool has an aspect-ratio control, set it to 16:9; a square return crushes the pair and cannot be cut. No labels, captions, numbers or watermarks.'
  ].join('\n')
}

const DOC_HEAD = (what: string): string => [
  `# ${what} — prompts for the painter`,
  '',
  'Generated by `pnpm art:prompts` (and by the bench\'s export) from `src/game/artSheet.ts`. Do not edit by hand: edit the manifest and regenerate.',
  '',
  'One block per drawable. Attach the reference named in the heading, then paste the block — the copy button on the fence takes the whole prompt. The heading is for you, not the painter: never paste it. Drop the return into `art-sheets/painted/` under the reference\'s name and run `pnpm slice-sheets`.',
  ''
].join('\n')

/**
 * Every prompt document, by file name. `fits` — the bench's measured fits,
 * keyed by sheet file stem — sharpens the SIZE clauses when present.
 */
export const promptDocs = (fits?: Record<string, Fit>): Record<string, string> => ({
  'PROMPTS-SECTORS.md': [
    DOC_HEAD('Sectors'),
    ...SECTOR_SHEETS.map((s) => block(`${s.chapter}-${(s.node % 5) + 1} · ${s.title}`, s.file, s.target, sectorPrompt(s), s.also))
  ].join('\n\n') + '\n',
  'PROMPTS-ITEMS.md': [
    DOC_HEAD('Items'),
    ...[...ITEM_SHEETS, ...WORLD_UI_SHEETS, ...KEEPSAKE_SHEETS].map((s) => block(s.title, s.file, s.target, itemPrompt(s, fits?.[s.file])))
  ].join('\n\n') + '\n',
  'PROMPTS-PROPS.md': [
    DOC_HEAD('The sectors\' live props'),
    'These are drawn ON TOP of a painted sector, every frame, while the drawing moves them. Paint the SHAPE only — the flight, the bob, the leap, the turn and the scuttle all stay with the game, so every one of these is drawn standing still.',
    '',
    ...PROP_SHEETS.map((s) => block(s.title, s.file, s.target, itemPrompt(s, fits?.[s.file])))
  ].join('\n\n') + '\n',
  'PROMPTS-CREATURES.md': [
    DOC_HEAD('The creatures a restored sector gets back'),
    'One painting per CREATURE, not per sector: a chapter dresses its own in five colours and the game tints the one region that changes. Each is drawn standing still and whole — the rise from behind its hiding place, the hop, the lean and the shiver belong to the game, and what it hides behind is already in the sector\'s painting.',
    '',
    ...CREATURE_SHEETS.map((s) => block(s.title, s.file, s.target, itemPrompt(s, fits?.[s.file])))
  ].join('\n\n') + '\n',
  'PROMPTS-RIG.md': [
    DOC_HEAD('The duelists’ own parts'),
    'Not whole things: each of these is ONE PIECE of a chibi unicorn, which the duel rig assembles. They are painted with NO OUTLINE — the rig inks each group as a single silhouette and fills the parts inside it — and in ONE neutral tone, because twenty characters wear this rig in twenty palettes.',
    '',
    ...RIG_SHEETS.map((s) => block(s.title, s.file, s.target, itemPrompt(s, fits?.[s.file])))
  ].join('\n\n') + '\n',
  'PROMPTS-RUNES.md': [
    DOC_HEAD('Runes'),
    ...RUNE_SHEETS.map((s) => block(s.title, s.file, s.target, itemPrompt(s, fits?.[s.file])))
  ].join('\n\n') + '\n',
  'PROMPTS-PORTRAITS.md': [
    DOC_HEAD('Portraits'),
    'Paint Aurora\'s and Umbra\'s strips FIRST: the intro\'s pages (`PROMPTS-STORY.md`) are painted from them, as character models.',
    '',
    ...PORTRAIT_SHEETS.map((s) => block(s.title, s.file, s.target, itemPrompt(s, fits?.[s.file])))
  ].join('\n\n') + '\n',
  'PROMPTS-ISLANDS.md': [
    DOC_HEAD('Duel islands'),
    ...ISLAND_SHEETS.map((s) => block(s.title, s.file, s.target, itemPrompt(s, fits?.[s.file])))
  ].join('\n\n') + '\n',
  'PROMPTS-PAGES.md': [
    DOC_HEAD('The chapters\' book pages'),
    'Each chapter has TWO pages — one landscape, one portrait — because the book is laid out differently in each orientation. They are quiet FURNITURE: five picture cards and a trail are drawn on top, and the page must never compete with them.',
    '',
    ...PAGE_SHEETS.map((s) => block(s.title, s.file, s.target, pagePrompt(s)))
  ].join('\n\n') + '\n',
  'PROMPTS-WARDROBE.md': [
    DOC_HEAD('The Wardrobe Kiosk'),
    'The inside of the dressing-up tent, in both orientations, and the rug Aurora stands on. She, her keepsakes, the room\'s corner shadow and the fairy lights\' twinkle are all drawn OVER these, every frame.',
    '',
    ...WARDROBE_SHEETS.map((s) => block(s.title, s.file, s.target, wardrobePrompt(s))),
    ...WARDROBE_ITEM_SHEETS.map((s) => block(s.title, s.file, s.target, itemPrompt(s, fits?.[s.file])))
  ].join('\n\n') + '\n',
  'PROMPTS-BRAND.md': [
    DOC_HEAD('The mark and the mascot'),
    'The two pictures the game owns (art-style.md §11) — the square app-icon MARK, and the wide keyed MASCOT of Aurora and Umbra looking at each other. Nothing in the game falls back to these: a missing one leaves the splash without a picture rather than drawing itself. NEITHER MAY CARRY ONE LETTER OF TEXT — the game writes its name over the mark itself, in whatever language the player reads.',
    '',
    'The mascot is painted from the two character models, like an intro page, and they are attached BEFORE the reference in the order the heading lists them.',
    '',
    block(BRAND_LOGO_SHEET.title, BRAND_LOGO_SHEET.file, BRAND_LOGO_SHEET.target, logoPrompt(BRAND_LOGO_SHEET), BRAND_LOGO_SHEET.also),
    block(BRAND_MASCOT_SHEET.title, BRAND_MASCOT_SHEET.file, BRAND_MASCOT_SHEET.target, mascotPrompt(BRAND_MASCOT_SHEET, fits?.[BRAND_MASCOT_SHEET.file]), BRAND_MASCOT_SHEET.also ?? [])
  ].join('\n\n') + '\n',
  'PROMPTS-STORY.md': [
    DOC_HEAD('The intro\'s pages'),
    'Each page is painted from its character models — the painted portrait strips in `painted/` — attached BEFORE the reference, in the order the heading lists them. Paint `PROMPTS-PORTRAITS.md`\'s Aurora and Umbra first.',
    '',
    ...STORY_SHEETS.map((s) => block(`Intro ${s.panel} · ${s.title}`, s.file, s.target, storyPrompt(s), s.also))
  ].join('\n\n') + '\n'
})

export type SheetFamily = 'sector' | 'story' | 'page' | 'wardrobe' | 'item' | 'prop' | 'creature' | 'rig' | 'rune' | 'portrait' | 'island' | 'brand'

/** Every reference the bench exports, in export order. */
export const sheetRows = (): { file: string; family: SheetFamily; title: string; target: string }[] => [
  ...SECTOR_SHEETS.map((s) => ({ file: s.file, family: 'sector' as const, title: s.title, target: s.target })),
  ...STORY_SHEETS.map((s) => ({ file: s.file, family: 'story' as const, title: s.title, target: s.target })),
  ...PAGE_SHEETS.map((s) => ({ file: s.file, family: 'page' as const, title: s.title, target: s.target })),
  ...WARDROBE_SHEETS.map((s) => ({ file: s.file, family: 'wardrobe' as const, title: s.title, target: s.target })),
  ...WARDROBE_ITEM_SHEETS.map((s) => ({ file: s.file, family: 'wardrobe' as const, title: s.title, target: s.target })),
  ...[...ITEM_SHEETS, ...WORLD_UI_SHEETS, ...KEEPSAKE_SHEETS].map((s) => ({ file: s.file, family: 'item' as const, title: s.title, target: s.target })),
  ...PROP_SHEETS.map((s) => ({ file: s.file, family: 'prop' as const, title: s.title, target: s.target })),
  ...CREATURE_SHEETS.map((s) => ({ file: s.file, family: 'creature' as const, title: s.title, target: s.target })),
  ...RIG_SHEETS.map((s) => ({ file: s.file, family: 'rig' as const, title: s.title, target: s.target })),
  ...RUNE_SHEETS.map((s) => ({ file: s.file, family: 'rune' as const, title: s.title, target: s.target })),
  ...PORTRAIT_SHEETS.map((s) => ({ file: s.file, family: 'portrait' as const, title: s.title, target: s.target })),
  ...ISLAND_SHEETS.map((s) => ({ file: s.file, family: 'island' as const, title: s.title, target: s.target })),
  { file: BRAND_LOGO_SHEET.file, family: 'brand' as const, title: BRAND_LOGO_SHEET.title, target: BRAND_LOGO_SHEET.target },
  { file: BRAND_MASCOT_SHEET.file, family: 'brand' as const, title: BRAND_MASCOT_SHEET.title, target: BRAND_MASCOT_SHEET.target }
]
