/**
 * artPreload.ts — which paintings the splash waits for (story-spec §9.13;
 * art-generation-pipeline LOADING.md), when the art layer is on.
 *
 * Without it the art POPS IN: the first map page draws its thumbnails as
 * drawings and swaps them to paint one by one a second later, which reads as
 * the scene glitching rather than loading. So the splash holds for exactly
 * what the first screens draw, and nothing else:
 *
 *   • the map page the player is on — its five thumbnails and the tent;
 *   • the LIVE PROPS, which every one of those five thumbnails animates on
 *     top of its painting from the first frame the page is drawn. The WHOLE
 *     family, not the chapter's: which props a page shows depends on the save,
 *     and this list has already missed a kind once — the symptom was the whole
 *     sheet changing under the cards a second after the splash.
 *
 *     That was nine sheets and ~100 kB. It is now FORTY-SIX (art-roadmap §4b's
 *     three revisions: the particles, the hanging decoration, the twinkle, and
 *     then the kelp, the flames and the falls), and every one of them is a
 *     sprite a few tens of SU across. 28 of them measure 213 kB, so the whole
 *     family lands around ~350 kB — past the ~200 kB this note set itself as
 *     the line. DECIDE IT BEFORE STEP 6: either scope this want to the
 *     player's chapter or accept ~350 kB on the splash. A prop's pop-in is the
 *     mildest there is — a ten-pixel sprite on a thumbnail, against a whole
 *     page changing;
 *   • the gifts and the sponge, which that page and the first sector show;
 *   • the twelve runes, which the first duel's HUD shows;
 *   • Aurora's, Umbra's and the chapter creature's portraits, which the first
 *     dialogue shows.
 *
 * NOT the intro's four pages any more. They were held because the picture
 * book WAS the first screen; retention-roadmap item 2 moved it to the first
 * map reached with nothing owed and something won — the far side of a whole
 * node — so on a cold boot they are four full-page 1152 × 672 paintings held
 * in front of a duel that never draws one of them. They now go out behind the
 * first stage at `'low'` priority (`primeIntroArt`), which is a whole duel,
 * gift and wipe of runway before the book can play.
 *
 * Everything else streams in behind play: a page's thumbnails as it is
 * drawn, a sector's full painting when its gift is tapped. With the layer off
 * — every build, until paintings exist — this asks for nothing at all.
 */
import { artOverridesEnabled, artSettled, preloadArtOverrides, type ArtWant } from '@/game/art'
import {
  ITEM_ART, PROP_ART, RUNE_SLUGS, runeArtId, sectorArtId, STORY_PANELS, storyPanelId, PORTRAIT_SETS, portraitArtId,
  pageArtId, wardrobeArtId, WARDROBE_RUG
} from '@/game/artIds'

/** Which page painting the book is showing: the two orientations are two
 *  different pictures, not one scaled (`artFolders.page`). */
const isPortrait = (): boolean =>
  typeof window !== 'undefined' && window.innerHeight > window.innerWidth

/** The props worth holding the splash for: the ones on screen everywhere. */
const FIRST_PROPS = [PROP_ART.twinkle, PROP_ART.butterfly, PROP_ART.pennant, PROP_ART.mote, PROP_ART.puff, PROP_ART.flag]

/** The first screens' paintings, for a save whose furthest node is `furthest`. */
export const firstArtWants = (furthest: number): ArtWant[] => {
  const chapter = Math.floor(Math.max(0, Math.min(49, furthest + 1)) / 5)
  const items = [ITEM_ART.tent, ITEM_ART.gift, ITEM_ART.boxGift, ITEM_ART.chest, ITEM_ART.sponge]
  // The chapter's creature strip is the one after the eleven named speakers.
  const creature = PORTRAIT_SETS.filter((p) => p.creature)[chapter]
  const faces = [PORTRAIT_SETS[0]!, PORTRAIT_SETS[1]!, ...(creature ? [creature] : [])]
  return [
    // THE CLOTH IS THE FIRST SCREEN'S WHOLE BACKGROUND. It is one square sheet
    // stretched behind everything — the map, the intro, the wipe and the
    // duel's letterbox all lay the book on it now — so a late arrival is the
    // entire surround changing under the player's hands.
    ['page', 'cover-cloth'] as ArtWant,
    // The page those five thumbnails are printed ON. It is the largest single
    // thing the first screen shows, so letting it stream in behind the splash
    // is the most visible pop-in the map can have — the whole sheet changes
    // under the cards. Only the orientation in use: the other one is a second
    // painting entirely, and a rotation can afford to fetch it then.
    ['page', pageArtId(chapter, isPortrait())] as ArtWant,
    ...[0, 1, 2, 3, 4].map((i): ArtWant => ['sectorThumb', sectorArtId(chapter * 5 + i)]),
    ...items.map((a): ArtWant => [a.kind, a.id]),
    // NOT THE WHOLE PROP FAMILY. It was all of it while the family was nine
    // sheets; at forty-six it is ~350 kB, which is most of a first-timer's
    // ~500 kB budget spent on things the roadmap itself calls the mildest
    // pop-in in the game. These six are the ubiquitous ones — one twinkle
    // serves some sixty call sites, one butterfly twenty-five — so they cover
    // most of what is actually moving on the first screen for 46 kB. The rest
    // stream in behind it, and a butterfly that turns from drawn to painted a
    // second in is not something anyone will catch.
    ...FIRST_PROPS.map((a): ArtWant => [a.kind, a.id]),
    ...RUNE_SLUGS.map((_, k): ArtWant => ['rune', runeArtId(k)]),
    ...faces.map((p): ArtWant => ['portrait', portraitArtId(p.who)])
  ]
}

/**
 * Start the Wardrobe Kiosk's own paintings — the tent's room and the rug —
 * while the screen dips to it.
 *
 * NOT in the splash's list: the kiosk is a tap in from the map and nothing
 * reaches it in a session's first seconds, so holding the splash for a room
 * most players will not open buys pop-in relief nobody sees and costs
 * everybody the wait. This is `openSector`'s bargain instead: the fetch goes
 * out under the dip, which is long enough for it to land, and a miss simply
 * keeps the drawing. Only the orientation in use — the other is a second
 * picture entirely, and a rotation can afford to fetch it then.
 */
export const primeWardrobeArt = (): void => {
  void artSettled('wardrobe', wardrobeArtId(isPortrait()), 'high')
  void artSettled(WARDROBE_RUG.kind, WARDROBE_RUG.id, 'high')
}

/**
 * Start the picture book's four pages (§8.26, as amended by §8.26a) — BEHIND
 * the splash rather than under it.
 *
 * They used to be in the hold above, and had to be: the book was the very
 * first screen a new save saw. It is not any more. It plays when the first
 * gift is opened (`flow/nodes.ts` `openGift`), between the first win and the
 * first cleaning. So the earliest a page can be drawn is a whole duel after
 * the splash, and holding four opaque 1152 × 672 paintings in front of the
 * first stroke buys nothing at all.
 *
 * Fired instead once the first stage has settled, at `'low'` priority, so
 * they queue behind everything the player is actually looking at and still
 * have that whole duel to land in. A miss keeps the drawing, as everywhere.
 *
 * Only for a player who has not seen it: `introSeen` is the same field the
 * trigger reads, so a returning player fetches nothing.
 */
export const primeIntroArt = (introSeen: boolean): void => {
  if (introSeen) return
  for (let i = 0; i < STORY_PANELS.length; i++) void artSettled('story', storyPanelId(i), 'low')
}

/** Hold for the first screens' paintings. Never rejects; a no-op with the layer off. */
export const preloadFirstArt = async (
  furthest: number, onProgress?: (done: number, total: number) => void
): Promise<void> => {
  if (!artOverridesEnabled()) return
  await preloadArtOverrides(firstArtWants(furthest), onProgress)
}
