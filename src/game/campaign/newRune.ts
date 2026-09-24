/**
 * campaign/newRune.ts — WHICH duel teaches a newly earned rune on the pad,
 * and the save field that remembers which runes she has drawn.
 *
 * The owner (2026-09-24): *"Teach the newest learnt rune (wind, ice…) in the
 * duel without blocking the duel."* A chest hands the rune over on the map
 * (`RuneGift.vue` shows it once); the duel is where it has to become a shape
 * her hand knows. So the next duel she arrives at holding a rune she has
 * never DRAWN shows it on the pad — its icon, its name, its glyph tracing
 * itself faintly (the duel owns the moment, `duel/lesson.ts` "the new-rune
 * guide"; this decides where in the story it happens, because the duel never
 * reads a node, §4.8.1).
 *
 * THE RULE (`newRuneDue`): the rune is the newest one a chest had handed over
 * before this node (`tables.newestRuneBy` — Ice at node 1, Wind at node 3,
 * then each chapter's rune after its boss), and
 *   • she holds it (a chest she has not opened yet gave her nothing);
 *   • she has never drawn it (`runesTaught`) — it shows again, duel after
 *     duel, until she has, once;
 *   • it is still NEW: on a first play always, and on a replay only while it
 *     is still the newest rune she has been given. A replay of an old node,
 *     long after its rune stopped being new, is left alone.
 * The lessons, versus and the depth glimpse keep it off in the duel itself.
 *
 * `runesTaught` (bit i = rune i has been stored by her hand at least once)
 * is written by the campaign controller on every stored rune. A save from
 * before it existed has no field: `taughtFromCombos` reads it off
 * `combosSeen` — every rune in a spell she has CAST she has clearly drawn —
 * so a returning player is only shown the runes she really never used.
 */
import { hasBit } from '@/game/campaign/bitset'
import { STARTING_RUNES, newestRuneBy } from '@/game/campaign/tables'
import { COMBO_COUNT, comboFromIndex } from '@/game/duel/config'
import type { CampaignState } from '@/game/campaign/state'

/** The runes a save has clearly drawn, read off the spells it has cast —
 *  plus the starting pair, which the first duel's lessons teach. */
export const taughtFromCombos = (combosSeen: string): number => {
  let mask = STARTING_RUNES
  for (let i = 0; i < COMBO_COUNT; i++) {
    if (!hasBit(combosSeen, i)) continue
    for (const r of comboFromIndex(i)) mask |= 1 << r
  }
  return mask >>> 0
}

/** Has she drawn rune `r` at least once? */
export const runeTaught = (cs: CampaignState, r: number): boolean => ((cs.runesTaught >> r) & 1) === 1

/**
 * The rune node `n`'s duel teaches on the pad, or -1 for none. Pure: `cs` is
 * the campaign as it stands at the duel's start. See the header for the rule.
 */
export const newRuneDue = (n: number, cs: CampaignState): number => {
  if (n < 0) return -1
  const r = newestRuneBy(n)
  if (r === null) return -1
  if (!((cs.runesUnlocked >> r) & 1) || runeTaught(cs, r)) return -1
  // First play: n is the node after the furthest won. A replay: only while
  // this is still the newest rune she has been given.
  const frontier = newestRuneBy(Math.max(n, cs.furthestNode + 1))
  return frontier === r ? r : -1
}

/**
 * Rune `r` was just stored by her hand: remember it. Returns true when that
 * is news (the caller saves).
 */
export const markRuneTaught = (cs: CampaignState, r: number): boolean => {
  if (!(r >= 0 && r < 12) || runeTaught(cs, r)) return false
  cs.runesTaught = (cs.runesTaught | (1 << r)) >>> 0
  return true
}
