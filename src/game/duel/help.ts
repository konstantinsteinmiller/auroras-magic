/**
 * help.ts — help a child can SEE, after two losses (retention-roadmap item 8).
 *
 * WHY: Dream Dust (§6.15) already eases a foe on every loss — her pace, her
 * health and her blows all come down, and the only sign of it is a few lilac
 * motes round her head. A seven-year-old reads those. A three-year-old does
 * not, and a child who has lost twice and cannot tell that anything changed
 * is a child who stops playing. So at a loss streak of two, help ARRIVES, and
 * it arrives visibly:
 *
 *   • the rune trace-assist ghost comes on for THIS DUEL — the same ghost the
 *     Options toggle draws (§5.13), lit through a per-duel override so the
 *     saved setting is never written (`useAccessibility.setDuelTraceAssist`);
 *   • Aurora says one warm line with a picto beside it, over her own
 *     portrait — the picto carries it for a child who cannot read yet.
 *
 * THE TONE IS THE FEATURE. The loss beat in this game is Umbra falling
 * asleep, not Aurora losing: Umbra never gloats and Aurora never scolds. This
 * reads as "here, let me show you" — a friend leaning over with a crayon —
 * and never as "you are bad at this". There is no counter, no "attempt 3",
 * and nothing anywhere says the word lose.
 *
 * IT CHANGES NO RULE. The fight the child gets is the one Dream Dust and
 * `campaign/easing.ts` already decided; this module only makes an existing
 * accessibility aid and one line of dialogue visible. Nothing here is read by
 * `sim.ts`.
 */
import { S } from '@/game/duel/state'
import { PH_DUEL } from '@/game/duel/config'
import { onDuelEvent } from '@/game/duel/sim'
import { setDuelTraceAssist } from '@/use/useAccessibility'
import { track } from '@/use/useAnalytics'

/** Losses on the same node before the help shows itself. Two, because one
 *  loss is an ordinary thing that happens in a game worth playing. */
export const HELP_AFTER_LOSSES = 2

/** Does a node with this loss streak get visible help? */
export const helpDue = (lossStreak: number): boolean => lossStreak >= HELP_AFTER_LOSSES

/**
 * How long Aurora's line stays, in DUEL seconds (`S.dur`) — the duel's own
 * clock, which stops for an ad, a modal and the spellbook, so a note nobody
 * could see never expires unseen. The ghost itself outlives the line and
 * stays until the first rune lands, exactly as the Options setting behaves.
 */
const NOTE_S = 11

let open = false
let token = 0

/** Bumps every time help opens — the HUD keys Aurora's note on it, so the
 *  note plays its entrance again on a retry instead of sitting there. */
export const helpToken = (): number => token
/** Is the help on for the duel currently loaded? */
export const helpOn = (): boolean => open

/**
 * Is Aurora's line on screen right now? Read once per frame by `syncHud`.
 * It leaves the moment the child draws her first rune of this duel — the help
 * has been taken, and a banner that outstays that is in the way.
 */
export const helpNoteUp = (): boolean =>
  open && S.phase === PH_DUEL && !S.book && S.landed === 0 && S.dur < NOTE_S

/**
 * A duel is starting on `nodeId` with this loss streak. Called by `duelFlow`
 * for every duel, help due or not, so the previous duel's help can never leak
 * into the next one.
 */
export const openHelp = (nodeId: number, lossStreak: number): void => {
  const due = helpDue(lossStreak)
  setDuelTraceAssist(due)
  open = due
  if (!due) return
  token++
  track('help_shown', { nodeId, lossStreak })
}

/** The duel ended, was abandoned, or was never a campaign duel at all. The
 *  override goes with it — it is per-duel by definition, and the saved
 *  setting has not been touched either way. */
export const closeHelp = (): void => {
  open = false
  setDuelTraceAssist(false)
}

let off: (() => void) | null = null
/**
 * Subscribe to the sim. Called once, from `installDuelFlow`.
 *
 * The end of the fight closes the help, and it is the SIM that says when that
 * is — not the result flow, which has an ad and a page turn in it and can be
 * raced by a retry. A duel the player walks out of emits no `finish`, so
 * `leaveDuel` closes that one by hand.
 */
export const installDuelHelp = (): (() => void) => {
  if (off) return off
  const stop = onDuelEvent((e) => {
    if (e === 'finish') closeHelp()
  })
  off = () => {
    stop()
    off = null
  }
  return off
}
