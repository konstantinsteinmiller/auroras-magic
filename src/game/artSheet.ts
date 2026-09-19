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
 * Three families:
 *   • SECTORS (50) — opaque, full-bleed scenes: each sector's static painting,
 *     with its colour-me landmark left a neutral lilac-grey for the game to
 *     tint. One reference each, at the sector's own 1152 × 672.
 *   • ITEMS (8) — magenta-keyed strips: one panel per state the drawing moves
 *     between (tied / untied, shut / open, eyes open / blink / grin).
 *   • RUNES (12) — magenta-keyed squares: the glyph as a painted emblem, in
 *     the 100-unit box `RuneGlyph.vue` draws it in.
 */
import { artTarget, type ArtKind } from '@/game/artFolders'
import { SECTOR_SLUGS, sectorArtId, RUNE_SLUGS, runeArtId, ITEM_ART, type ItemName } from '@/game/artIds'

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
    thumb: artTarget('sectorThumb', id)
  }
})

/* ───────────────────────────────────────────────────── items and runes ── */

export interface ItemSheet {
  name: ItemName | `rune:${number}`
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
   *  held by its tip. The slicer anchors a return by it. */
  anchor: 'feet' | 'centre'
  /** Its facing, when it has one. */
  facing?: string
  file: string
  target: string
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
  item('brush', 'Stardust Brush', 1, 'centre',
    'A paintbrush lying level: a warm wooden handle on the LEFT, a gold ferrule, and a soft, rounded lilac tuft whose tip points to the RIGHT.',
    'Warm wood-brown handle, butter-gold ferrule, pale lilac tuft with a white highlight.',
    [], { facing: 'The tip points RIGHT and the brush lies level, exactly as the reference draws it: the game turns it to follow the finger.' }),
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

/** Every file a painting can land in — the catalogue `art:status` checks. */
export const manifestTargets = (): Map<string, { kind: ArtKind; id: string }> => {
  const out = new Map<string, { kind: ArtKind; id: string }>()
  for (const s of SECTOR_SHEETS) {
    out.set(s.target, { kind: 'sector', id: s.id })
    out.set(s.thumb, { kind: 'sectorThumb', id: s.id })
  }
  for (const s of [...ITEM_SHEETS, ...RUNE_SHEETS]) out.set(s.target, { kind: s.kind, id: s.id })
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
 * The style block (art-style.md §9.1, audited against faceless objects per
 * the pipeline's PROMPT-ANATOMY §8): the shared bullets once, then the one
 * bullet the two variants differ in.
 */
const STYLE_CORE = [
  'STYLE — cute picture-book illustration for a cozy, family-friendly magical unicorn game for all ages (the youngest players are 3).',
  '· ONE clean, confident, soft outline around every shape, in warm deep plum (#3A2340), never black. At its heaviest it is about 1% of the subject\'s height — the weight of a soft brush pen, not of a technical pen — slightly heavier on the shadow side, round at every end. Hold the finished picture at thumbnail size: if the outline has thinned to a hairline there, it is several times too thin.',
  '· Flat cel colour: one base tone and ONE soft shadow tone per shape (15–20% darker, shifted a little toward violet), laid in as a clean shape that follows the form. One small soft near-white highlight on round forms, top left. Key light from the top left.',
  '· Rounded, friendly shapes and soft corners. Nothing sharp, spiky, scary or broken. Pastel colours for things, saturated colour only for magic and glows.',
  '· AVOID — this is exactly how earlier attempts went wrong: sketch lines, doubled or broken outlines, crosshatching, texture brushes, photographic texture, airbrushed gradients across a whole object, lens flare, a thin pale hairline outline, clip-art flatness with no shadow tone.',
  '· AN OBJECT WITH NO FACE IS NOT AN EXCEPTION TO ANY OF THIS. A tent, a brush, a box or a bridge is painted to exactly the same standard as a character: the same plum ink, the same cel shadow, the same highlight.'
].join('\n')

const STYLE_ITEM = `${STYLE_CORE}
· It sits in its panel at the size the reference draws it, with the empty space around it left empty. It does NOT fill its panel edge to edge.`

const STYLE_SCENE = `${STYLE_CORE}
· Painterly soft gradients are allowed in the SKY and in distant layers only; mid-ground and foreground things follow the outline-and-cel rules. Far layers are lighter and bluer, with no outline or a very light one.
· The picture fills the whole image, edge to edge.`

const REFERENCE_CLAUSE =
  'THE ATTACHED REFERENCE is a flat computer drawing of exactly what to paint. FOLLOW ITS SHAPES, ITS LAYOUT AND ITS PROPORTIONS, and take nothing else from it: not its line weight, not its flat colours, not its lack of shading. It is a stand-in for a painting that does not exist yet.'

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

/** One `## heading  (reference.png → target)` and its fenced prompt. */
const block = (title: string, ref: string, target: string, body: string): string => {
  const fence = fenceFor(body)
  return [`## ${title}  (${ref}.png → ${target})`, '', `${fence}text`, body, fence].join('\n')
}

/** The prompt for one sector. */
export const sectorPrompt = (s: SectorSheet): string => {
  const ch = CHAPTERS[s.chapter - 1]!
  return [
    'WHAT COMES BACK IS ONE LANDSCAPE PICTURE — the scene in the attached reference, repainted. Not a sheet, not panels, not several pictures, not a close-up of one part of it.',
    'One wide landscape image, 16:9, holding the WHOLE scene the reference shows, framed exactly as the reference frames it.',
    '',
    'WHAT IT IS NOT:',
    '· No characters, no unicorns, no people, no animals and no creatures of any kind. Everything that moves — butterflies, fireflies, water, little creatures, gifts — is added by the game on top of your picture, in the places the reference leaves for it.',
    '· No text, letters, numbers or writing anywhere — not on signs, not on banners.',
    '· Nothing that is not in the reference. The reference settles every argument about what belongs.',
    '',
    `WHAT IT IS: "${s.title}", a place in ${ch.name} — ${ch.mood}.${s.boss ? ' It is the chapter\'s grand final place, a little more magical than the rest.' : ''}`,
    '',
    REFERENCE_CLAUSE,
    '',
    neutralClause(`${s.landmark} — exactly the parts of it the reference shows in pale lilac-grey, and nothing else. It is the landmark the player colours in`),
    '',
    'KEEP THE LAYOUT — the game places things on this picture by their position in it:',
    '· Every object stays exactly where the reference puts it, at the same size: the same horizon line, the same paths, the same ground heights, the landmark in the same spot and the same size.',
    '· Do not add objects, do not move them, do not zoom, crop or re-frame. Open ground in the reference stays open ground in yours.',
    '',
    'THE VIEW: the same flat, storybook, side-on view as the reference. No camera move, no new perspective, no tilt.',
    '',
    STYLE_SCENE,
    '',
    FULL_BLEED,
    '',
    'BEFORE YOU CALL IT FINISHED, check:',
    '· One landscape picture, 16:9, the whole scene, framed like the reference.',
    '· Every object where the reference puts it, the same size.',
    `· ${s.landmark[0]!.toUpperCase()}${s.landmark.slice(1)}: pale neutral lilac-grey, no hue.`,
    '· No characters, no creatures, no text, no frame.',
    '· A soft plum outline on every mid-ground and foreground shape.',
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
    : `WHAT COMES BACK IS ONE OBJECT ON A FLAT MAGENTA GROUND.\nOne square image, 1:1, holding the single ${s.kind === 'rune' ? 'rune' : 'object'} the attached reference shows, in the middle, at the reference's size.`
  const lines = [
    shape,
    '',
    'WHAT IT IS NOT:',
    '· Draw ONLY what the reference shows, and nothing else. No ground, no shadow on the ground, no scenery, no characters, no hands holding it, no second object.',
    '· No text, letters or numbers.',
    '',
    `WHAT IT IS: ${s.blurb}`,
    ''
  ]
  if (many) lines.push('READ THE PANELS:', ...s.panels.map((p) => `· ${p}`), '')
  lines.push(REFERENCE_CLAUSE, '')
  lines.push(`COLOUR IDENTITY (keep the hues; the exact shades are yours): ${s.colour}`, '')
  if (s.tinted) lines.push(neutralClause(`${s.tinted}. The game gives it a different colour for every chapter`), '')
  lines.push('THE VIEW: flat and square-on, exactly as the reference shows it. No three-quarter view, no perspective, no tilt, nothing turned toward the viewer.')
  if (s.facing) lines.push(`· ${s.facing}`)
  lines.push('')
  if (many) {
    lines.push(
      `ONE ${s.title.toUpperCase()}: ${s.frames === 2 ? 'both panels are' : `all ${s.frames} panels are`} the same object at a different moment. Identical shape, identical colours, identical outline weight and identical size in every panel — only what READ THE PANELS names changes. Several different-looking objects side by side are unusable.`,
      ''
    )
  }
  lines.push(STYLE_ITEM, '', sizeClause(s, fit), '', MAGENTA, '')
  lines.push(
    'BEFORE YOU CALL IT FINISHED, count and check:',
    many ? `· ${s.frames} panels, one row, left to right; the canvas is 16:9 landscape.` : '· One object, in the middle of a square canvas.',
    '· Nothing in any panel is anywhere near filling it.',
    s.tinted ? `· ${s.tinted[0]!.toUpperCase()}${s.tinted.slice(1)}: pale neutral lilac-grey, no hue.` : '· A soft plum outline all the way round.',
    '· Every pixel that is not the object is flat, vivid #FF00FF — hold it against a pure magenta swatch, not against your memory of one.',
    '',
    `OUTPUT: one image, ${many ? '16:9 landscape' : '1:1 square'} (the reference is ${w} x ${h} pixels), PNG — not JPEG. If your tool has an aspect-ratio control, set it to ${many ? '16:9' : '1:1'}${many ? ' — a square return crushes the panels and cannot be cut' : ''}. No labels, captions, numbers or watermarks.`
  )
  return lines.join('\n')
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
    ...SECTOR_SHEETS.map((s) => block(`${s.chapter}-${(s.node % 5) + 1} · ${s.title}`, s.file, s.target, sectorPrompt(s)))
  ].join('\n\n') + '\n',
  'PROMPTS-ITEMS.md': [
    DOC_HEAD('Items'),
    ...ITEM_SHEETS.map((s) => block(s.title, s.file, s.target, itemPrompt(s, fits?.[s.file])))
  ].join('\n\n') + '\n',
  'PROMPTS-RUNES.md': [
    DOC_HEAD('Runes'),
    ...RUNE_SHEETS.map((s) => block(s.title, s.file, s.target, itemPrompt(s, fits?.[s.file])))
  ].join('\n\n') + '\n'
})

/** Every reference the bench exports, in export order. */
export const sheetRows = (): { file: string; family: 'sector' | 'item' | 'rune'; title: string; target: string }[] => [
  ...SECTOR_SHEETS.map((s) => ({ file: s.file, family: 'sector' as const, title: s.title, target: s.target })),
  ...ITEM_SHEETS.map((s) => ({ file: s.file, family: 'item' as const, title: s.title, target: s.target })),
  ...RUNE_SHEETS.map((s) => ({ file: s.file, family: 'rune' as const, title: s.title, target: s.target }))
]
