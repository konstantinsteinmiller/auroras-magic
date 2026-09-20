/**
 * artFolders.ts — where each kind of painted drop-in lives under `public/`
 * (story-spec §9.11, in this game's nouns). Pure data, so the manifest
 * (`artSheet.ts`) can import it under plain Node for `pnpm art:prompts`, and
 * the renderer's probe (`art.ts`) resolves the same paths — one table, so the
 * file the slicer writes is the file the game looks for.
 *
 *   sector       a sector's static painting — everything its `paint()` draws,
 *                none of its `props()` (those live and move on top), with the
 *                colour-me landmark painted a neutral lilac-grey that the game
 *                tints with the picked pot. Full size, fetched one at a time
 *                by the restore view.
 *   sectorThumb  the same painting at map-thumbnail size (384 × 224) — what
 *                the map pages draw, so a page of five never decodes five
 *                full-size paintings.
 *   rune         the 12 rune glyphs as painted icons (the HUD's slots, the
 *                spellbook). The canvas still TRACES the drawn glyph — a trace
 *                is an animation, not a picture.
 *   gift         the wrapped gifts and the boss chest, closed. Their opening
 *                beat stays drawn (the lid, the bow, the burst).
 *   tool         the Stardust Brush and the Magic Eraser.
 *   worldUi      the wardrobe tent on the map.
 *   cosmetic     keepsakes painted as stills on Aurora's rig (the crown, the
 *                pet star). The others follow the rig's own deformation and
 *                stay drawn (§9.7).
 *   portrait     a dialogue portrait, `{speaker}-{emote}` (the whole round
 *                badge's face; the ring is still drawn), §8.27.
 *   story        the first-launch intro's five picture-book panels,
 *                `intro-1` … `intro-5` (§8.26): each beat's meadow and
 *                characters; the rune trace, the sponge and the sparkles stay
 *                live on top.
 *   page         a chapter's BOOK PAGE, printed behind its five beat cards
 *                (§8.28, §8.32): the paper, the chapter's marginalia and the
 *                biome wash along its foot, as one painting. TWO per chapter,
 *                because the book is laid out differently in each orientation
 *                (1600 × 900 landscape, 900 × 1600 portrait) and one page
 *                stretched between them mangles its own doodles. Only a BUILT
 *                chapter's page is painted; a sleeping one keeps the drawn
 *                lilac version, which is a different picture, not a tint.
 *   island       a duel arena's floating island, one per chapter theme
 *                (§8.27): the rock, its rim and its grass; the tufts, the
 *                mood tint and the clouds stay drawn.
 *   ui           a HUD button's glyph (`FButton`/`FHudButton`'s `art` prop,
 *                through `ArtIcon`). Not in the manifest: the shared glyph set
 *                is the look, and no button asks for a painting today.
 */
export const ART_FOLDERS = {
  sector: 'images/sectors',
  sectorThumb: 'images/sectors/thumb',
  rune: 'images/runes',
  gift: 'images/gifts',
  tool: 'images/tools',
  worldUi: 'images/world-ui',
  cosmetic: 'images/cosmetics',
  portrait: 'images/portraits',
  story: 'images/story',
  island: 'images/islands',
  page: 'images/pages',
  ui: 'images/ui'
} as const

export type ArtKind = keyof typeof ART_FOLDERS

/** The path the renderer probes for `(kind, id)`, relative to `public/`. */
export const artTarget = (kind: ArtKind, id: string): string => `${ART_FOLDERS[kind]}/${id}.webp`
