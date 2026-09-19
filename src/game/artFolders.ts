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
 *   portrait     a dialogue portrait override, `{speaker}-{emote}` — [later]
 *                per §9.12; the probe exists so one can simply be dropped in.
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
  ui: 'images/ui'
} as const

export type ArtKind = keyof typeof ART_FOLDERS

/** The path the renderer probes for `(kind, id)`, relative to `public/`. */
export const artTarget = (kind: ArtKind, id: string): string => `${ART_FOLDERS[kind]}/${id}.webp`
