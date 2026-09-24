/**
 * artPreload.ts — the splash's hold and the two on-demand primes, as the rest
 * of the game has always called them. WHAT goes out WHEN is decided in ONE
 * place, `artSchedule.ts` (its table is at the top of that file); this module
 * is the thin, stable face of it.
 *
 * The hold used to be written for a MAP-first boot — the page's five
 * thumbnails, six ubiquitous props, all twelve runes, three portraits, every
 * gift and the sponge, plus the four picture-book pages behind them: 46 files
 * and ~720 kB, of which a fresh player's first screen drew THREE. A fresh
 * save boots into the picture book's short prologue, which turns straight
 * into node 0's DUEL. So the splash now waits for the prologue's own
 * paintings, and the duel and everything after it follow one stage ahead of
 * her.
 */
import { artSettled, type ArtWant } from '@/game/art'
import { STORY_PANELS, storyPanelId, wardrobeArtId, WARDROBE_RUG } from '@/game/artIds'
import { defaultCampaign } from '@/game/campaign/state'
import {
  bootScreenOf, currentEnv, planFor, type ScheduleEnv, type ScheduleSave
} from '@/game/artSchedule'

/** Which page painting the book is showing: the two orientations are two
 *  different pictures, not one scaled (`artFolders.page`). */
const isPortrait = (): boolean =>
  typeof window !== 'undefined' && window.innerHeight > window.innerWidth

/**
 * The first screen's paintings for `save` — what the splash holds for, before
 * the props and creatures its painters are recorded asking for (those need
 * the sector code, and `artSchedule.holdFirstScreen` adds them). A fresh save
 * by default: the prologue in front of node 0's duel.
 */
export const firstArtWants = (
  save: ScheduleSave = defaultCampaign(), env: ScheduleEnv = currentEnv()
): ArtWant[] => planFor(bootScreenOf(save), save, env).hold

/**
 * Start the Wardrobe Kiosk's own paintings — the tent's room and the rug —
 * while the screen dips to it.
 *
 * NOT in the splash's list: the kiosk is a tap in from the map and nothing
 * reaches it in a session's first seconds. The schedule already has them on
 * the wire at `low` once the map is open (the tent is one turn away) and at
 * `normal` before a chest that gives a keepsake; this is the tap itself, which
 * promotes them to `high` if they are still waiting. A miss keeps the drawing.
 */
export const primeWardrobeArt = (): void => {
  void artSettled('wardrobe', wardrobeArtId(isPortrait()), 'high')
  void artSettled(WARDROBE_RUG.kind, WARDROBE_RUG.id, 'high')
}

/**
 * Start the picture book's four pages (§8.26) at `low`, for a player who has
 * not seen it. The schedule already holds the prologue's two for a fresh
 * save's first screen and puts the lesson's two in the NEXT stage of the
 * first duel, so this is only for a caller that wants them regardless of
 * where the schedule stands.
 */
export const primeIntroArt = (introSeen: boolean): void => {
  if (introSeen) return
  for (let i = 0; i < STORY_PANELS.length; i++) void artSettled('story', storyPanelId(i), 'low')
}
