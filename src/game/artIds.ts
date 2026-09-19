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
