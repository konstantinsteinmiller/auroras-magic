/**
 * campaign/glimpse.ts — WHICH duel shows the depth glimpse (story-spec §8.36).
 *
 * The duel owns the moment itself (`duel/sim.ts`, `GLIMPSE`): the foe raises a
 * wind wall and a hint names the one of the player's runes that gets through.
 * Where in the story it happens is the campaign's call, because the duel never
 * reads a node (§4.8.1) — so it is handed over as `DuelStart.glimpse`.
 *
 * NODE 2, chapter 1's third duel. Early enough to be the first thing that
 * shows the runes answer each other (the playtest's gamer had "exhausted the
 * strategy space in a minute"), late enough that she holds a rune that DOES
 * answer a wind wall: Fire and Earth from the start and Ice from node 0's
 * chest — and Ice is what `WEAK_POINTS` lets through it. Node 0 cannot host it
 * (Fire is exactly what the wall stops, and a lone Earth is a wall of her
 * own), and node 0 is the first-duel lesson's in any case. The wind wall is
 * also the rune node 2's own chest is about to hand her, met first in the
 * foe's hands, as every chapter introduces its rune.
 *
 * FIRST PLAY ONLY, ONCE: a node she has not won yet (not a replay), and at
 * most once a session, so a retry after a loss is the plain duel. It needs no
 * save field; a child who comes back another day to a node 2 she still has
 * not won meets it once more, which is no bad thing.
 *
 * ONE TEACHER AT A TIME. Node 2 is also where the NEW-RUNE GUIDE is likeliest
 * to be up (`newRune.ts`): Ice is node 0's chest's rune, and a child who has
 * not drawn it yet arrives with its guide on the pad. Both would be teaching
 * Ice. So while the glimpse's hint is up (`S.glimpse` 2 and 3) the guide
 * stands aside (`lesson.runeGuideRune`), and comes back once the hint has
 * gone if she still has not drawn it; an Ice drawn under the hint — the
 * glimpse's own answer — ends the guide quietly, with no second "Great!".
 */

/** The node whose first duel opens with the glimpse armed. */
export const GLIMPSE_NODE = 2

/** Shown this session already. */
let shown = false

/**
 * Does node `n`'s duel arm the glimpse? `replay`: she has won `n` before.
 * Answering yes spends it for the session — call once per duel start.
 */
export const glimpseDue = (n: number, replay: boolean): boolean => {
  if (shown || replay || n !== GLIMPSE_NODE) return false
  shown = true
  return true
}

/** Test seam: forget this session's glimpse. */
export const __resetGlimpse = (): void => {
  shown = false
}
