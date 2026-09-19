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
import { artOverridesEnabled, preloadArtOverrides, type ArtWant } from '@/game/art'
import {
  ITEM_ART, RUNE_SLUGS, runeArtId, sectorArtId, STORY_PANELS, storyPanelId, PORTRAIT_SETS, portraitArtId
} from '@/game/artIds'

/** The first screens' paintings, for a save whose furthest node is `furthest`
 *  and that has (or has not yet) seen the intro. */
export const firstArtWants = (furthest: number, introSeen = true): ArtWant[] => {
  const chapter = Math.floor(Math.max(0, Math.min(49, furthest + 1)) / 5)
  const items = [ITEM_ART.tent, ITEM_ART.gift, ITEM_ART.boxGift, ITEM_ART.chest, ITEM_ART.sponge]
  // The chapter's creature strip is the one after the eleven named speakers.
  const creature = PORTRAIT_SETS.filter((p) => p.creature)[chapter]
  const faces = [PORTRAIT_SETS[0]!, PORTRAIT_SETS[1]!, ...(creature ? [creature] : [])]
  return [
    ...(introSeen ? [] : STORY_PANELS.map((_, i): ArtWant => ['story', storyPanelId(i)])),
    ...[0, 1, 2, 3, 4].map((i): ArtWant => ['sectorThumb', sectorArtId(chapter * 5 + i)]),
    ...items.map((a): ArtWant => [a.kind, a.id]),
    ...RUNE_SLUGS.map((_, k): ArtWant => ['rune', runeArtId(k)]),
    ...faces.map((p): ArtWant => ['portrait', portraitArtId(p.who)])
  ]
}

/** Hold for the first screens' paintings. Never rejects; a no-op with the layer off. */
export const preloadFirstArt = async (
  furthest: number, introSeen = true, onProgress?: (done: number, total: number) => void
): Promise<void> => {
  if (!artOverridesEnabled()) return
  await preloadArtOverrides(firstArtWants(furthest, introSeen), onProgress)
}
