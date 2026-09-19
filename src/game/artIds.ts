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
  brush: { kind: 'tool', id: 'stardust-brush' },
  eraser: { kind: 'tool', id: 'magic-eraser' },
  tent: { kind: 'worldUi', id: 'wardrobe-tent' },
  crown: { kind: 'cosmetic', id: 'flower-crown' },
  petStar: { kind: 'cosmetic', id: 'pet-star' }
} as const

export type ItemName = keyof typeof ITEM_ART
