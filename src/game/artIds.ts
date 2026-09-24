/**
 * artIds.ts — the file name every painted drop-in is filed under (story-spec
 * §9.11). Pure data, shared by the renderer's probes (`spriteFor(kind, id)`),
 * the manifest (`artSheet.ts`), the bench and the Node tools, so the name the
 * slicer writes is the name the game asks for.
 *
 * Kept apart from the manifest on purpose: the manifest carries every prompt
 * the painter is sent — tens of kB of text the game itself never needs — and
 * the renderer only needs these names.
 */

/** The 50 sectors, in node order (node n = chapter ⌊n/5⌋+1, sector n%5+1). */
export const SECTOR_SLUGS = [
  'cottage-meadow', 'brook-bridge', 'flower-garden', 'treehouse-hollow', 'briars-grove',
  'seashell-beach', 'lighthouse-point', 'coral-cove', 'harbour-jetty', 'pearls-lagoon',
  'balloon-meadow', 'rainbow-bridge', 'pegasus-stables', 'wind-vane-tower', 'zephyrs-sky-castle',
  'glowshroom-grotto', 'crystal-lake', 'gem-mine', 'lantern-bridge', 'terras-geode-hall',
  'mirror-lake-meadow', 'echo-valley', 'hall-of-mirrors', 'silver-peak-pass', 'echos-mirror-palace',
  'rainbow-falls', 'paint-pot-village', 'prism-garden', 'kite-cliffs', 'prisms-rainbow-bridge',
  'oasis-camp', 'sandfall-cliffs', 'sundial-plaza', 'caravan-market', 'embers-hourglass-temple',
  'snowy-village', 'frozen-lake', 'aurora-grove', 'sled-hill', 'glaces-ice-palace',
  'lantern-path', 'observatory', 'star-garden', 'moon-bridge', 'novas-starlight-throne',
  'festival-gate', 'carousel-square', 'lantern-market', 'ferris-wheel-hill', 'festival-stage'
] as const

/** `1-1-cottage-meadow` … `10-5-festival-stage`: sortable by eye, unique. */
export const sectorArtId = (n: number): string =>
  `${Math.floor(n / 5) + 1}-${(n % 5) + 1}-${SECTOR_SLUGS[n] ?? 'unknown'}`

const NODE_OF = new Map<string, number>(SECTOR_SLUGS.map((_, n) => [sectorArtId(n), n]))
/** The node a sector painting belongs to, or -1. */
export const sectorNodeOf = (id: string): number => NODE_OF.get(id) ?? -1

/** The 12 runes, by rune index (`FIRE` = 0 … `LOVE` = 11). */
export const RUNE_SLUGS = [
  'fire', 'wind', 'ice', 'earth', 'nature', 'water',
  'lightning', 'illusion', 'rainbow', 'time', 'moon', 'love'
] as const

export const runeArtId = (k: number): string => `rune-${RUNE_SLUGS[k] ?? k}`

/** The painted items, by the name the code knows them by. */
export const ITEM_ART = {
  gift: { kind: 'gift', id: 'standard-gift' },
  boxGift: { kind: 'gift', id: 'box-gift' },
  chest: { kind: 'gift', id: 'boss-chest' },
  sponge: { kind: 'tool', id: 'stardust-sponge' },
  eraser: { kind: 'tool', id: 'magic-eraser' },
  tent: { kind: 'worldUi', id: 'wardrobe-tent' },
  crown: { kind: 'cosmetic', id: 'flower-crown' },
  petStar: { kind: 'cosmetic', id: 'pet-star' }
} as const

export type ItemName = keyof typeof ITEM_ART

/**
 * The painted LIVE PROPS (§8.8), by the name the kit knows them by.
 *
 * ONE RULE decides what is here: **paint the SHAPE, keep the procedural part
 * that places, scales, rotates, tints or fades it.** A particle system's puff
 * is the same puff at every position; a pennant's cloth is the same cloth at
 * every pole; a twinkle is the same four-point star at every radius. Those are
 * paintings carried by a matrix, and the matrix stays the drawing's.
 *
 * What is NOT here has no constant shape to paint at all — a wave that follows
 * a shoreline polyline, a bunting CORD threaded through call-site points, a
 * beam whose cone angle opens per frame, a reflection that is a transform of
 * other content — or no shape at all: a soft glow is a wash with no outline
 * and no silhouette, so there is nothing to paint and a bitmap of it is the
 * same wash at lower resolution. `art-roadmap.md` §4b lists every one and why.
 *
 * The 2026-09-22 third sweep widened "a matrix" to everything a matrix can
 * actually do, which is where three of the audit's reasons had quietly stood
 * in for "we did not look": a BEND is a shear (the kelp blade, on the palm
 * frond's affine), a FORESHORTENING is a non-uniform scale (the weather
 * vane's arrow narrows by exactly `cos a`), and a band SCROLLING under a clip
 * is a texture — one tile blitted at the positions the clock computes.

 *
 * A prop that takes SEVERAL colours per call site is still one sheet: either
 * its repeated unit is painted once and tinted (a bunting flag, a balloon, a
 * pinwheel blade, half a kite mirrored), or the colourways the call sites
 * actually use become the strip's panels (the far boat's three).
 */
export const PROP_ART = {
  butterfly: { kind: 'prop', id: 'prop-butterfly' },
  gull: { kind: 'prop', id: 'prop-gull' },
  dove: { kind: 'prop', id: 'prop-dove' },
  duck: { kind: 'prop', id: 'prop-duck' },
  swallow: { kind: 'prop', id: 'prop-swallow' },
  fish: { kind: 'prop', id: 'prop-fish' },
  crab: { kind: 'prop', id: 'prop-crab' },
  sails: { kind: 'prop', id: 'prop-mill-sails' },
  waterwheel: { kind: 'prop', id: 'prop-waterwheel' },
  twinkle: { kind: 'prop', id: 'prop-twinkle' },
  pennant: { kind: 'prop', id: 'prop-pennant' },
  flag: { kind: 'prop', id: 'prop-flag' },
  mote: { kind: 'prop', id: 'prop-mote' },
  puff: { kind: 'prop', id: 'prop-puff' },
  lantern: { kind: 'prop', id: 'prop-lantern' },
  caveLantern: { kind: 'prop', id: 'prop-cave-lantern' },
  bubble: { kind: 'prop', id: 'prop-bubble' },
  balloon: { kind: 'prop', id: 'prop-balloon' },
  snowflake: { kind: 'prop', id: 'prop-snowflake' },
  confetti: { kind: 'prop', id: 'prop-confetti' },
  miniBalloon: { kind: 'prop', id: 'prop-mini-balloon' },
  boat: { kind: 'prop', id: 'prop-boat' },
  kite: { kind: 'prop', id: 'prop-kite' },
  pinwheel: { kind: 'prop', id: 'prop-pinwheel' },
  note: { kind: 'prop', id: 'prop-note' },
  bee: { kind: 'prop', id: 'prop-bee' },
  windsock: { kind: 'prop', id: 'prop-windsock' },
  charm: { kind: 'prop', id: 'prop-charm' },
  frond: { kind: 'prop', id: 'prop-palm-frond' },
  coconuts: { kind: 'prop', id: 'prop-coconuts' },
  flyer: { kind: 'prop', id: 'prop-flyer' },
  buoy: { kind: 'prop', id: 'prop-buoy' },
  canoe: { kind: 'prop', id: 'prop-canoe' },
  mineCart: { kind: 'prop', id: 'prop-mine-cart' },
  cartWheel: { kind: 'prop', id: 'prop-cart-wheel' },
  heart: { kind: 'prop', id: 'prop-heart' },
  rainbowArc: { kind: 'prop', id: 'prop-rainbow-arc' },
  swingSeat: { kind: 'prop', id: 'prop-swing-seat' },
  cabin: { kind: 'prop', id: 'prop-cabin' },
  star: { kind: 'prop', id: 'prop-star' },
  kelp: { kind: 'prop', id: 'prop-kelp' },
  flame: { kind: 'prop', id: 'prop-flame' },
  waterfall: { kind: 'prop', id: 'prop-waterfall' },
  streak: { kind: 'prop', id: 'prop-flow-streak' },
  vane: { kind: 'prop', id: 'prop-vane' },
  gondola: { kind: 'prop', id: 'prop-gondola' }
} as const

export type PropName = keyof typeof PROP_ART

/**
 * THE LIVING THINGS A RESTORED SECTOR IS GIVEN BACK (§8.8, owner 2026-09-23):
 * every chapter's tap creature and its rescue collectible. They were the last
 * flat-vector figures standing on painted scenery — one is on screen in every
 * one of the fifty cleaning views, which made them the loudest style break
 * left in the game once the sectors were painted.
 *
 * ONE SHEET PER BODY, not per sector. A chapter dresses its creature five
 * ways and every one of those is a single colour on a single region — the
 * snow-hare's scarf, the star-calf's blanket, the sprig's petals — which is
 * exactly what `artTint` carries. What the five looks share (the coat, the
 * face, the eyes) is painted once and is the same creature everywhere, which
 * is also what the story wants.
 *
 * A PANEL IS A POSE THE DRAWING ANIMATES BETWEEN, not a frame of animation:
 * ears folded and eyes shut, then ears up, then awake. `drawItem` cross-fades
 * a fractional frame, so the peek still plays out over its ~900 ms. And the
 * RISE from behind the prop, the lean, the hop and the shiver stay the
 * drawing's — a translate, a rotate and a clip carry a painting exactly as
 * they carried the vectors.
 *
 * What is NOT here: the prop each creature hides behind (that is the sector's
 * own painting, and `tapCover.ts` cuts the cover out of it), the glow a
 * glowworm throws on a crystal facet, the frost puff, the hearts and the
 * bubble ring — washes and particles, with no silhouette to paint.
 */
export const CREATURE_ART = {
  mossSprite: { kind: 'creature', id: 'creature-moss-sprite' },
  seaFoal: { kind: 'creature', id: 'creature-sea-foal' },
  singingShell: { kind: 'creature', id: 'creature-singing-shell' },
  babyPegasus: { kind: 'creature', id: 'creature-baby-pegasus' },
  glowworm: { kind: 'creature', id: 'creature-glowworm' },
  clearShard: { kind: 'creature', id: 'creature-clear-shard' },
  mirrorSprite: { kind: 'creature', id: 'creature-mirror-sprite' },
  mendedShard: { kind: 'creature', id: 'creature-mended-shard' },
  rainbowFoal: { kind: 'creature', id: 'creature-rainbow-foal' },
  prismPetal: { kind: 'creature', id: 'creature-prism-petal' },
  sandFox: { kind: 'creature', id: 'creature-sand-fox' },
  sandClock: { kind: 'creature', id: 'creature-sand-clock' },
  snowHare: { kind: 'creature', id: 'creature-snow-hare' },
  frostShard: { kind: 'creature', id: 'creature-frost-shard' },
  starCalf: { kind: 'creature', id: 'creature-star-calf' },
  fallenStar: { kind: 'creature', id: 'creature-fallen-star' },
  sprig: { kind: 'creature', id: 'creature-sprig' }
} as const

export type CreatureName = keyof typeof CREATURE_ART

/**
 * THE DUELISTS' OWN COAT (§9.7, owner 2026-09-23). The rig in `chars.ts` was
 * the last thing in the game still drawn, and it is what a player looks at
 * for the whole of every duel — so its parts are painted and the rig
 * assembles them, exactly as it assembled the vector shapes.
 *
 * ONE NEUTRAL PART SET FOR THE WHOLE CAST. Twenty characters wear this rig in
 * twenty palettes, so a painting per character would be 20 sets. Instead each
 * sheet is painted in ONE neutral tone and `artTint` multiplies the palette
 * through it — which is the same mechanism the 46 props and the 17 creatures
 * already use, and it means Aurora, Umbra, a Guardian and a shadow clone are
 * one painting each time. A far limb takes the same sheet as a near one, in
 * the shadow tone rather than the coat.
 *
 * WHAT IS PAINTED IS THE COAT AND ITS HARD PARTS, nothing else:
 *
 *   • the ink stays the DRAWING'S. `chars.ts` inks a whole group as ONE
 *     continuous silhouette and then fills the parts inside it, which is why
 *     the rig has no seams; a painting per part carrying its own outline
 *     would put a line everywhere two masses meet. The paintings are pure
 *     paint, with no line at all — which is also what "no outlines inside the
 *     asset" asks for.
 *   • the FACE is drawn: the eye, its lash and glint, the brow, the mouth,
 *     the nostril and the blush are a dozen small shapes driven by `face`,
 *     `win`, `lose` and a blink, and every one of them is a different picture
 *     per frame.
 *   • the MANE, TAIL and FORELOCK are drawn. `hair()` builds each lock from a
 *     spine carrying a travelling wave, so its geometry is rebuilt every
 *     frame from `AM` and the clock — `art-roadmap.md` §4b's rule, the same
 *     one that keeps the duel's VFX vector.
 *   • the HIT FLASH is drawn. It strobes the whole rig white and red, and a
 *     multiply tint cannot make a painting white; the flash fills the drawn
 *     path over the painting instead.
 */
export const RIG_ART = {
  barrel: { kind: 'rig', id: 'rig-barrel' },
  neck: { kind: 'rig', id: 'rig-neck' },
  head: { kind: 'rig', id: 'rig-head' },
  ear: { kind: 'rig', id: 'rig-ear' },
  horn: { kind: 'rig', id: 'rig-horn' }
} as const

export type RigPart = keyof typeof RIG_ART

/**
 * The intro's painted panels (§8.26): one per picture-book page. The last two
 * beats (the colour back, then Play) share the fourth — the same restored
 * meadow — so the page does not jump between them.
 */
export const STORY_PANELS = ['hello', 'dust', 'magic', 'colour'] as const
export const storyPanelId = (panel: number): string => `intro-${panel + 1}`
/** The panel beat `beat` (0-based) shows. */
export const storyPanelOf = (beat: number): number => Math.min(beat, STORY_PANELS.length - 1)
export const storyArtId = (beat: number): string => storyPanelId(storyPanelOf(beat))

/**
 * The dialogue portraits (§8.27), one strip per speaker: every expression the
 * script gives them, in the `Emote` union's order, painted side by side in
 * ONE generation so a face stays the same face across its moods. Pure data,
 * kept in step with the script by `tests/artFamilies.test.ts`.
 */
export const EMOTE_ORDER = ['happy', 'sleepy', 'worriedMild', 'determined', 'stern', 'warmBlush', 'cheering'] as const
export type PortraitEmote = (typeof EMOTE_ORDER)[number]

export interface PortraitSet {
  /** A speaker id, or a chapter creature's name (`creature` speakers). */
  who: string
  creature: boolean
  emotes: readonly PortraitEmote[]
}

const CREATURE_EMOTES: readonly PortraitEmote[] = ['happy', 'worriedMild', 'cheering']

export const PORTRAIT_SETS: readonly PortraitSet[] = [
  { who: 'aurora', creature: false, emotes: ['happy', 'worriedMild', 'determined', 'cheering'] },
  { who: 'umbra', creature: false, emotes: ['sleepy', 'worriedMild', 'stern', 'warmBlush', 'cheering'] },
  { who: 'briar', creature: false, emotes: ['happy', 'stern', 'warmBlush'] },
  { who: 'pearl', creature: false, emotes: ['happy', 'stern', 'warmBlush'] },
  { who: 'zephyr', creature: false, emotes: ['happy', 'stern', 'warmBlush', 'cheering'] },
  { who: 'terra', creature: false, emotes: ['happy', 'stern', 'warmBlush'] },
  { who: 'echo', creature: false, emotes: ['happy', 'worriedMild', 'stern', 'warmBlush', 'cheering'] },
  { who: 'prism', creature: false, emotes: ['stern', 'warmBlush', 'cheering'] },
  { who: 'ember', creature: false, emotes: ['happy', 'stern', 'warmBlush'] },
  { who: 'glace', creature: false, emotes: ['happy', 'stern', 'warmBlush'] },
  { who: 'nova', creature: false, emotes: ['happy', 'worriedMild', 'determined', 'warmBlush', 'cheering'] },
  ...['Twig', 'Shelly', 'Puff', 'Glint', 'Blink', 'Rio', 'Dune', 'Frosty', 'Wisp'].map(
    (who): PortraitSet => ({ who, creature: true, emotes: CREATURE_EMOTES })
  )
]

/** `portrait-aurora`, `portrait-twig`, … */
export const portraitArtId = (who: string): string => `portrait-${who.toLowerCase()}`

/** The strip a speaker's portrait is painted in, if the script gave them one. */
export const portraitSetOf = (speaker: string, creature?: string): PortraitSet | undefined =>
  PORTRAIT_SETS.find((p) => (p.creature ? speaker === 'creature' && p.who === creature : p.who === speaker))

/** The duel's floating island, one per chapter theme (§8.27, arenaThemes.ts). */
export const ISLAND_SLUGS = [
  'whispering-woods', 'bubble-bay', 'cloud-kingdom', 'crystal-caves', 'mirror-mountains',
  'rainbow-ridge', 'sunken-sands', 'twilight-tundra', 'starlight-summit', 'friendship-festival'
] as const

export const islandArtId = (theme: number): string => `island-${theme + 1}-${ISLAND_SLUGS[theme] ?? 'unknown'}`

/** The chapters, by the same slugs their islands use — one world, one name. */
export const CHAPTER_SLUGS = ISLAND_SLUGS

/**
 * A chapter's painted book page (§8.28, §8.32). Two per chapter: the book is
 * a different shape in each orientation, so `page-1-whispering-woods-land`
 * and `-port` are two pictures, not one picture scaled.
 */
export const pageArtId = (chapter: number, portrait: boolean): string =>
  `page-${chapter + 1}-${CHAPTER_SLUGS[chapter] ?? 'unknown'}-${portrait ? 'port' : 'land'}`

/**
 * The book's FRONT page — the knoll the wardrobe stands on, where the book
 * falls open. A page like any other as far as the art layer is concerned, but
 * it is not a chapter, so it gets its own id rather than a chapter index.
 */
export const frontPageArtId = (portrait: boolean): string =>
  `page-front-${portrait ? 'port' : 'land'}`

/**
 * The Wardrobe Kiosk's ROOM (§3.5.4) — the inside of the striped tent, and
 * the last full-screen backdrop in the game that was still drawn.
 *
 * TWO pictures, not one scaled: the tent is a different shape held sideways
 * and held upright, exactly as a book page is.
 */
export const wardrobeArtId = (portrait: boolean): string => `wardrobe-room-${portrait ? 'port' : 'land'}`

/**
 * Where the room's FLOOR LINE runs in each picture, as a fraction of its
 * height. The floor is where Aurora stands, and that follows the DOM shelf —
 * in portrait it climbs the moment the mane swatches open — so the renderer
 * blits the painting as a wall band and a floor band, split here, rather than
 * stretching it whole and parking the horizon above her hooves.
 */
export const WARDROBE_FLOOR = { land: 0.8, port: 0.62 } as const

/** The rug she stands on: a drawable of its own, because `stand()` moves it
 *  and scales it with the shelf — one bitmap carried by a transform. */
export const WARDROBE_RUG = { kind: 'wardrobe', id: 'wardrobe-rug' } as const

/**
 * The wardrobe's keepsake badges (§8.27) that are drawn for the shelf alone.
 * The Flower Crown's and the Pet Star's badges already draw their S6 item
 * paintings, so they are not here.
 */
export const KEEPSAKE_ICON_SLUGS = [
  'seashellNecklace', 'pegasusWings', 'hoofTrailVfx', 'umbraSkin', 'colorPicker', 'pastelTheme', 'winterScarf'
] as const
export type KeepsakeIconSlug = (typeof KEEPSAKE_ICON_SLUGS)[number]

/** `keepsake-seashell-necklace`, … */
export const keepsakeArtId = (slug: string): string =>
  `keepsake-${slug.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()}`

/**
 * The REWARDED-AD mark: the little film camera in front of every "watch an ad
 * for …" button's label (`<ArtIcon kind="worldUi" id="movie-icon"
 * fallback="video">`). A DOM icon, not a canvas drawable — `ArtIcon` shows the
 * painting when the art layer is on and the shared `video` glyph otherwise, so
 * this kind/id pair IS the contract with every rewarded button.
 */
export const MOVIE_ICON = { kind: 'worldUi', id: 'movie-icon' } as const

/* ──────────────────────────────────── the brand pair (art-style.md §11) ── */

/**
 * The game's own two brand pictures. They are NOT drop-ins for a drawing the
 * renderer keeps making — nothing falls back to vectors if they are missing —
 * so they are read as plain files (`/images/brand/…`) by the splash and by the
 * icon script rather than through `spriteFor`. They are in the manifest all
 * the same, because they are made by the same round trip: the same style
 * profile writes their prompt, the bench draws their reference, the slicer
 * cuts and stamps them, and `art:status` says whether they are on disk.
 *
 *   logo    the MARK: a square emblem, full-bleed and opaque, with its own
 *           ground. No lettering anywhere in it — the game's name is live
 *           i18n text drawn over it (`t('gameName')`), and a painted English
 *           title would be wrong in twenty of the twenty-one locales. The PWA
 *           icons and the favicon are cut from this one file.
 *   mascot  the PAIR: Aurora and Umbra standing on nothing, facing each other,
 *           magenta-keyed so the splash's gradient shows through behind them.
 */
export const BRAND_LOGO = { kind: 'brand', id: 'logo' } as const
export const BRAND_MASCOT = { kind: 'brand', id: 'mascot' } as const

/** The mark's master side, in px. The PWA's largest icon is 512, so the
 *  painting is cut at exactly that and every smaller icon is a downsample of
 *  it — an icon upscaled from a smaller master is a blurred icon. */
export const BRAND_LOGO_SIDE = 512

/** The mascot's master height, in px. Taller than the pipeline's 256 px frame
 *  cap on purpose and by the cap's own exception: this is not a sprite frame
 *  the renderer blits at a drawable's size, it is one still the DOM shows at a
 *  fixed size — up to 420 CSS px wide on a 3× phone — and at 256 it is soft
 *  on every device the splash is actually read on. */
export const BRAND_MASCOT_H = 512
