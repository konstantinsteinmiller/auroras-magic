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
 *   • a first-time player's intro pages (§8.26) — the intro is the very
 *     first thing they see — and Aurora's, Umbra's and the chapter
 *     creature's portraits, which the first dialogue shows.
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

/** The first screens' paintings, for a save whose furthest node is `furthest`
 *  and that has (or has not yet) seen the intro. */
/** The props worth holding the splash for: the ones on screen everywhere. */
const FIRST_PROPS = [PROP_ART.twinkle, PROP_ART.butterfly, PROP_ART.pennant, PROP_ART.mote, PROP_ART.puff, PROP_ART.flag]

export const firstArtWants = (furthest: number, introSeen = true): ArtWant[] => {
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
    ...(introSeen ? [] : STORY_PANELS.map((_, i): ArtWant => ['story', storyPanelId(i)])),
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

/** Hold for the first screens' paintings. Never rejects; a no-op with the layer off. */
export const preloadFirstArt = async (
  furthest: number, introSeen = true, onProgress?: (done: number, total: number) => void
): Promise<void> => {
  if (!artOverridesEnabled()) return
  await preloadArtOverrides(firstArtWants(furthest, introSeen), onProgress)
}
