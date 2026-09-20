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
 */
import { artTarget, type ArtKind } from '@/game/artFolders'
import {
  SECTOR_SLUGS, sectorArtId, RUNE_SLUGS, runeArtId, ITEM_ART, type ItemName,
  STORY_PANELS, storyPanelId, PORTRAIT_SETS, portraitArtId, ISLAND_SLUGS, islandArtId,
  KEEPSAKE_ICON_SLUGS, keepsakeArtId, pageArtId, type PortraitEmote
} from '@/game/artIds'
import { ACTIVE_STYLE } from '@/game/artStyle'

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
 * The painting every other scene is matched to (owner-approved, 2026-09-20).
 *
 * The first five sectors came back cooler, bluer and flatter than the intro
 * page of the very same meadow, which a player sees minutes apart. Words
 * cannot close that gap — "warm", "soft" and "painterly" are what produced
 * both — so the approved picture is attached to every scene prompt as a
 * colour-and-finish sample.
 *
 * It is fenced hard in the prompt, because an attached painting is the one
 * thing a painter will happily copy CONTENT from: the anchor's cottage, its
 * characters and its layout are explicitly not the job.
 */
const STYLE_ANCHOR = 'painted/story-intro-1.png'

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
  name: ItemName | `rune:${number}` | `portrait:${string}` | `island:${number}` | `keepsake:${string}`
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
  /** Extra lines for the count-and-check list, after the shared ones. */
  checks?: readonly string[]
}

const item = (
  name: ItemName, title: string, frames: number, anchor: 'feet' | 'centre',
  blurb: string, colour: string, panels: readonly string[] = [], extra: Partial<ItemSheet> = {}
): ItemSheet => {
  const { kind, id } = ITEM_ART[name]
  return { name, kind, id, title, frames, anchor, blurb, colour, panels, file: `item-${id}`, target: artTarget(kind, id), ...extra }
}

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
    ])
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
    'Keep the reference\'s warm knitted colours.']
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
    keep: 'KEEP THE TOP — it is a stage: two duelists stand on it. The mossy top stays as wide, as flat and as level as the reference draws it, at exactly the same height, with nothing standing on it.',
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

export const PAGE_SHEETS: readonly PageSheet[] = CHAPTERS.flatMap((ch, c) =>
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

/** Every file a painting can land in — the catalogue `art:status` checks. */
export const manifestTargets = (): Map<string, { kind: ArtKind; id: string }> => {
  const out = new Map<string, { kind: ArtKind; id: string }>()
  for (const s of SECTOR_SHEETS) {
    out.set(s.target, { kind: 'sector', id: s.id })
    out.set(s.thumb, { kind: 'sectorThumb', id: s.id })
  }
  for (const s of STORY_SHEETS) out.set(s.target, { kind: 'story', id: s.id })
  for (const s of PAGE_SHEETS) out.set(s.target, { kind: 'page', id: s.id })
  for (const s of [...ITEM_SHEETS, ...KEEPSAKE_SHEETS, ...RUNE_SHEETS, ...PORTRAIT_SHEETS, ...ISLAND_SHEETS]) {
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
  '· It looks drawn by hand, not assembled: soft colour variation inside the shapes, and no shape that is a perfect circle, arc or straight edge.'
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

const MAGENTA = [
  'BACKGROUND — read this before anything else. It matters more than the style.',
  'Fill every pixel that is not the object itself with solid, flat, pure magenta #FF00FF. Treat it as a green-screen: one flat chroma-key colour, edge to edge.',
  '· EXACTLY #FF00FF — red 255, green 0, blue 255. Not pink, not rose, not mauve, not a soft or tinted version of it.',
  '· NOT transparent (a transparency checkerboard gets baked in as paint), NOT white, cream or any textured ground.',
  '· The object must NOT sit on a card, panel, badge, frame or rectangle of any kind. The magenta touches its outline on every side.',
  '· No drop shadow, no ground, no vignette. The object itself contains no magenta or hot pink.',
  '· The soft pastel palette is for the OBJECT. The ground is not part of the painting and is not toned down with it: it stays a vivid, eye-hurting #FF00FF.',
  '· KEEP ANY GLOW TIGHT, inside the object\'s own outline. A halo spreading into the magenta turns pink and cannot be cut out.'
].join('\n')

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
    '· IMAGE 1 is a FINISHED PAINTING from this game, and it is your COLOUR AND FINISH SAMPLE. Match its palette, its warmth, its light, its brush texture and its level of detail exactly, so the two pictures look painted by the same hand on the same afternoon.',
    `· TAKE NOTHING ELSE FROM IMAGE 1. Not its buildings, not its layout, not its characters${sameMeadow ? '' : ', not its scenery'}. It is a colour sample, not a thing to copy.`,
    '· THE LAST IMAGE is what you are painting: its shapes, its layout, its contents. Everything about WHAT is in the picture comes from it and only from it.',
    // The anchor's windmill has SAILS; the sector's drawing does not, because
    // the sails turn and the game draws them on top every frame. The first
    // anchored return copied them, and painted sails under turning ones is a
    // windmill with two sets. Hence the rule stated as a test, not a list.
    '· IF IMAGE 1 SHOWS SOMETHING THE LAST IMAGE DOES NOT, IT IS NOT IN YOUR PICTURE. The last image is the complete and final list of what exists here. A thing missing from it is missing because the game draws it itself, usually because it MOVES — and your painted copy would sit frozen underneath the moving one.',
    ...(sameMeadow
      ? [
        '· The two show the SAME MEADOW, which is why image 1 matches it so closely. Yours is that meadow standing empty. Three things in image 1 are NOT in yours: the unicorn, the windmill\'s SAILS (the last image gives the mill a bare tower and a cap — keep it bare, the sails turn and are added later), and the pink roof (yours is the pale neutral grey the last image gives it).'
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
    '· No characters, no creatures, no text, no frame.',
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
    s.frames > 1 ? '· Do NOT draw the panel edges: no boxes, borders, gutters, guides or numbers, in any colour.' : '· Do not draw any border or frame around it.'
  ].join('\n')
}

/** The prompt for one item or rune. */
export const itemPrompt = (s: ItemSheet, fit?: Fit): string => {
  const { w, h } = itemSheetSize(s.frames)
  const many = s.frames > 1
  const shape = many
    ? `WHAT COMES BACK IS A STRIP OF ${s.frames} PANELS, NOT ONE PICTURE.\nOne landscape image, 16:9, holding ${s.frames} SEPARATE drawings of the same ${s.title.toLowerCase()} side by side, left to right, each in its own equal share of the width — on the same layout as the attached reference.\n· Exactly ${s.frames} panels. Not 1, not ${s.frames + 1}, not ${s.frames * 2}. One row.\n· ONE big drawing filling the canvas is the wrong answer however well it is painted.`
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
  lines.push(`COLOUR IDENTITY (keep the hues; the exact shades are yours): ${s.colour}`, '')
  if (s.tinted) lines.push(neutralClause(`${s.tinted}. The game gives it a different colour for every chapter`), '')
  if (s.keep) lines.push(s.keep, '')
  lines.push(s.view ?? 'THE VIEW: flat and square-on, exactly as the reference shows it. No three-quarter view, no perspective, no tilt, nothing turned toward the viewer.')
  if (s.facing) lines.push(`· ${s.facing}`)
  lines.push('')
  if (many) {
    const noun = s.noun ?? 'object'
    lines.push(
      `ONE ${s.title.toUpperCase()}: ${s.frames === 2 ? 'both panels are' : `all ${s.frames} panels are`} the same ${noun} at a different moment. Identical shape, identical colours, identical outline weight and identical size in every panel — only what READ THE PANELS names changes. Several different-looking ${noun}s side by side are unusable.`,
      ''
    )
  }
  lines.push(s.character ? withCharacter(STYLE_ITEM) : STYLE_ITEM, '', sizeClause(s, fit), '', MAGENTA, '')
  lines.push(
    'BEFORE YOU CALL IT FINISHED, count and check:',
    many ? `· ${s.frames} panels, one row, left to right; the canvas is 16:9 landscape.` : `· One ${s.noun ?? 'object'}, in the middle of a square canvas.`,
    '· Nothing in any panel is anywhere near filling it.',
    ...(s.tinted ? [`· ${s.tinted[0]!.toUpperCase()}${s.tinted.slice(1)}: pale neutral lilac-grey, no hue.`] : []),
    ...(s.checks ?? []),
    ...STYLE_CHECKS,
    '· Every pixel that is not the object is flat, vivid #FF00FF — hold it against a pure magenta swatch, not against your memory of one.',
    '',
    `OUTPUT: one image, ${many ? '16:9 landscape' : '1:1 square'} (the reference is ${w} x ${h} pixels), PNG — not JPEG. If your tool has an aspect-ratio control, set it to ${many ? '16:9' : '1:1'}${many ? ' — a square return crushes the panels and cannot be cut' : ''}. No labels, captions, numbers or watermarks.`
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
export const pagePrompt = (s: PageSheet): string => [
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
    ...[...ITEM_SHEETS, ...KEEPSAKE_SHEETS].map((s) => block(s.title, s.file, s.target, itemPrompt(s, fits?.[s.file])))
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
  'PROMPTS-STORY.md': [
    DOC_HEAD('The intro\'s pages'),
    'Each page is painted from its character models — the painted portrait strips in `painted/` — attached BEFORE the reference, in the order the heading lists them. Paint `PROMPTS-PORTRAITS.md`\'s Aurora and Umbra first.',
    '',
    ...STORY_SHEETS.map((s) => block(`Intro ${s.panel} · ${s.title}`, s.file, s.target, storyPrompt(s), s.also))
  ].join('\n\n') + '\n'
})

export type SheetFamily = 'sector' | 'story' | 'page' | 'item' | 'rune' | 'portrait' | 'island'

/** Every reference the bench exports, in export order. */
export const sheetRows = (): { file: string; family: SheetFamily; title: string; target: string }[] => [
  ...SECTOR_SHEETS.map((s) => ({ file: s.file, family: 'sector' as const, title: s.title, target: s.target })),
  ...STORY_SHEETS.map((s) => ({ file: s.file, family: 'story' as const, title: s.title, target: s.target })),
  ...PAGE_SHEETS.map((s) => ({ file: s.file, family: 'page' as const, title: s.title, target: s.target })),
  ...[...ITEM_SHEETS, ...KEEPSAKE_SHEETS].map((s) => ({ file: s.file, family: 'item' as const, title: s.title, target: s.target })),
  ...RUNE_SHEETS.map((s) => ({ file: s.file, family: 'rune' as const, title: s.title, target: s.target })),
  ...PORTRAIT_SHEETS.map((s) => ({ file: s.file, family: 'portrait' as const, title: s.title, target: s.target })),
  ...ISLAND_SHEETS.map((s) => ({ file: s.file, family: 'island' as const, title: s.title, target: s.target }))
]
