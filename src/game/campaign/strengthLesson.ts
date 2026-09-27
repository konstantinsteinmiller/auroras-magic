/**
 * campaign/strengthLesson.ts — WHICH duel teaches a foe's strength (story-spec
 * §8.36a), and the save flag that remembers it was taught.
 *
 * The duel owns the moment itself (`duel/strengthLesson.ts`): the foe holds
 * still and a ghost finger shows, without a word, that a hand CLOSED on her
 * strength lands weak (✕) and the same runes closed on another rune land in
 * full (✓). Where in the story it happens is the campaign's call, because the
 * duel never reads a node (§4.8.1) — so the flow asks here and arms it.
 *
 * THE RULE (`strengthLessonDue`): the first campaign duel whose foe has a
 * live strength (§6.6a) that she owns, with at least one other rune to close
 * on — never in local versus, never while the first-duel lessons are owed,
 * and once: `strengthTaught` is set when she casts the right hand, or when the
 * lesson lets her go on its own.
 *
 * ONE TEACHER AT A TIME. If this duel already has a teacher — the new-rune
 * guide on the pad, the depth glimpse, or the retry help after two losses —
 * the lesson waits for the next duel with a strength instead of stacking on
 * top of it. Chapter 2's first duel (2-1, `STRENGTH_FROM_NODE`) is where the
 * first strength goes live, and it is also where Nature's guide is up for a
 * child who has not drawn her new rune yet — which, on a first play, is every
 * child (the boss chest of 1-5 has only just given it). So in a normal
 * playthrough the lesson lands on 2-2 (node 6), once 2-1 has taught Nature.
 */
import type { CampaignState } from '@/game/campaign/state'

/** What the rule needs to know about the duel about to start. */
export interface StrengthLessonAsk {
  /** The strength live in this duel (`tables.strengthAt`), −1 for none. */
  strong: number
  /** Her drawable runes, `runesUnlocked | STARTING_RUNES`. */
  owned: number
  /** `CampaignState.strengthTaught`. */
  taught: boolean
  /** The first-duel lessons are still owed (`S.intro`). */
  intro: boolean
  /** Local 2P versus. */
  versus: boolean
  /** The new-rune guide armed for this duel (`newRuneDue`), −1 for none. */
  runeGuide: number
  /** The depth glimpse armed for this duel (`glimpseDue`). */
  glimpse: boolean
  /** The after-two-losses help is up this duel (`help.helpDue`). */
  help: boolean
}

/** Does this duel arm the strength lesson? Pure. See the header. */
export const strengthLessonDue = (a: StrengthLessonAsk): boolean => {
  if (a.taught || a.versus || a.intro) return false
  if (!(a.strong >= 0 && a.strong < 12) || ((a.owned >>> a.strong) & 1) === 0) return false
  // Something else to close on.
  if (((a.owned & ~(1 << a.strong)) >>> 0) === 0) return false
  // One teacher at a time: wait for the next duel with a strength.
  return a.runeGuide < 0 && !a.glimpse && !a.help
}

/** The lesson was taught (or let her go): remember it. True when that is news
 *  (the caller saves). */
export const markStrengthTaught = (cs: CampaignState): boolean => {
  if (cs.strengthTaught) return false
  cs.strengthTaught = true
  return true
}
