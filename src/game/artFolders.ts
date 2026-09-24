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
 *   worldUi      the book's own furniture on the map — the wardrobe tent, the
 *                node badges, the bookmark ribbon — and the DOM's painted
 *                chrome: the rewarded-ad button's movie camera (`ArtIcon`,
 *                `artIds.MOVIE_ICON`) and the duel's two HP-bar frames, laid
 *                on as a stretched `border-image` (`HpBar.vue`,
 *                `artIds.HP_FRAMES`).
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
 *   wardrobe     the Wardrobe Kiosk's own scenery (§3.5.4): the inside of the
 *                dressing-up tent, full-bleed and one picture per orientation
 *                like a book page, plus the round rug Aurora stands on. The
 *                rug is its own file because it follows HER — the shelf
 *                decides where she stands — and the tent's corner shadow and
 *                the fairy lights' twinkle stay drawn over the painting.
 *   prop         a sector's LIVE prop — the butterfly, the gull, the leaping
 *                fish, the mill's sails, and the SHAPE a particle system, a
 *                bunting string or a twinkle repeats — as a still (or a few
 *                stills) that the drawing then moves, bobs, rotates, tints,
 *                fades and scales exactly as it moved the vectors. What stays
 *                drawn is what has no constant shape at all: a wave that
 *                follows a shoreline, a cord threaded through call-site
 *                points, a beam whose cone opens per frame — and a bare glow,
 *                which has no outline and so nothing to paint (`kit*.ts`,
 *                art-roadmap §4b).
 *   creature     the living things a RESTORED sector is given back (§8.8): the
 *                tap creature who peeks out from behind her prop, and the
 *                chapter's rescue collectible. One sheet per body, whatever
 *                the chapter dresses it in — the snow-hare's five scarves are
 *                one tint, the star-calf's five blankets another — and one
 *                panel per pose the drawing animates BETWEEN (ears folded ->
 *                ears up, asleep -> awake). The RISE from behind the prop,
 *                the hop, the shiver and the clip stay the drawing's: they
 *                are a matrix and a rectangle, and they carry a painting
 *                exactly as they carried the vectors. What each creature
 *                stands in FRONT of is not here — that belongs to the
 *                sector's own painting, and `tapCover.ts` cuts it from there.
 *   rig          the DUELISTS' coat and its hard parts (§9.7): the barrel, the
 *                neck, the head, an ear, the horn, a leg segment and a hoof,
 *                each painted once in a neutral tone and tinted per character
 *                — twenty characters wear this rig in twenty palettes. The
 *                rig assembles them exactly as it assembled the vector
 *                shapes. Its INK, its FACE, its MANE and TAIL and its hit
 *                flash all stay drawn; `artIds.RIG_ART` says why of each.
 *   brand        the game's own MARK and MASCOT (art-style.md §11): the square emblem
 *                the splash, the PWA icons and the favicon are cut from, and
 *                the wide keyed picture of Aurora and Umbra looking at each
 *                other. Not drop-ins for anything the renderer draws — no
 *                painter falls back to vectors for these — but they are made
 *                by the same round trip and filed by the same rules, so the
 *                slicer writes them and `art:status` can see them.
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
  prop: 'images/props',
  creature: 'images/creatures',
  rig: 'images/rig',
  wardrobe: 'images/wardrobe',
  page: 'images/pages',
  brand: 'images/brand',
  ui: 'images/ui'
} as const

export type ArtKind = keyof typeof ART_FOLDERS

/** The path the renderer probes for `(kind, id)`, relative to `public/`. */
export const artTarget = (kind: ArtKind, id: string): string => `${ART_FOLDERS[kind]}/${id}.webp`
