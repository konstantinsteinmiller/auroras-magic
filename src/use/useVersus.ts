/**
 * useVersus — local 2P versus's chrome state (story-spec §3.12, §6.19, C18).
 *
 * Versus needs a WIDE landscape screen: at least 900 CSS px, wider than tall.
 * Below that the mode is never played on a cramped half-UI; the
 * `versusSetup` scene (and a duel that was squeezed mid-match) shows the
 * "turn sideways" prompt instead, and a versus duel holds still until the
 * screen is wide again. Pass-and-play is deliberately not offered (C18).
 */
import { reactive } from 'vue'

export const VERSUS_MIN_W = 900

export const versusHud = reactive({
  /** The screen can hold two halves right now. */
  wide: false,
  /** Each player's READY on the setup screen: [player 1, player 2]. */
  ready: [false, false] as [boolean, boolean],
  /** The match just ended: 0 = player 1 won, 1 = player 2; -1 = none. */
  winner: -1
})

/** Called on every resize by the app root. */
export const updateVersusWide = (w: number, h: number): void => {
  const wide = w >= VERSUS_MIN_W && w > h
  if (versusHud.wide !== wide) versusHud.wide = wide
}
