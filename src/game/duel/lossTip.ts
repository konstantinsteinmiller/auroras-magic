/**
 * lossTip.ts — the one line on the loss card that says what to try next
 * (second blind playtest, 2026-09-24).
 *
 * The gamer tester lost and got "Zzz… try again?" with nothing to change. So
 * the card now carries ONE tip, chosen from what happened in THAT duel, first
 * match wins:
 *
 *   block        she never raised a wall or a ward — the square blocks
 *   stack        every spell she cast was a single rune — two make it stronger
 *   keepDrawing  the AFK rule was in force when she lost (director.ts) — keep
 *                drawing and she cannot be finished off
 *   general      none of the above: a rotating general tip (`GENERAL`)
 *
 * A NOTE ON `keepDrawing`. The mercy floor makes a PRESENT player
 * unkillable: every damage path clamps to `mercyFloor()`, and it only drops to
 * 0 while `afk()` holds. So in the campaign every real loss has the AFK rule
 * in force, and a child who blocked and stacked always gets `keepDrawing`;
 * `general` is reached only by a loss with no idle (a QA `__S.hp = 0`, or a
 * future rule change) — it is the fallback, not a fourth common case.
 *
 * THE COUNTERS are cheap and live HERE, not in `S` or `sim.ts`: this module
 * listens to the sim's own events (`cast`, `finish`) and keeps a per-duel
 * tally keyed on `S.round`, which `resetDuel` bumps — so a new duel, a retry
 * or a rematch starts it at zero without a hook in the sim. The listener is
 * registered when this module is first imported (the loss card imports it,
 * and the card is part of the duel scene's bundle, so it is live before the
 * first duel starts).
 *
 * Nothing here delays anything: the card reads the tip once, synchronously,
 * when it mounts — after the sting and after any interstitial, exactly where
 * it always came up.
 */
import { S } from '@/game/duel/state'
import { EARTH, FIRE, comboFromIndex } from '@/game/duel/config'
import { lastPlayerCast, onDuelEvent, spellOf } from '@/game/duel/sim'
import { afk } from '@/game/duel/director'

/** What one duel did that the tip is chosen from. */
export interface DuelTally {
  /** Spells the player cast. */
  casts: number
  /** …of which walls or wards (a barrier, spell kind 2). */
  walls: number
  /** …of which were two or three runes. */
  multi: number
  /** The AFK rule was in force when she lost. */
  quiet: boolean
}

export type LossTipId = 'block' | 'stack' | 'keepDrawing' | 'drawBig' | 'mix'

/** The general tips, in rotation (one step per loss). */
export const GENERAL: readonly LossTipId[] = ['drawBig', 'mix']

/**
 * The tip for a lost duel — pure. `losses` is the lifetime loss count
 * (`S.losses`, already counting this one), which turns the general rotation.
 */
export const pickLossTip = (t: DuelTally, losses: number): LossTipId => {
  if (t.walls === 0) return 'block'
  if (t.casts > 0 && t.multi === 0) return 'stack'
  if (t.quiet) return 'keepDrawing'
  return GENERAL[Math.abs(losses | 0) % GENERAL.length]!
}

/** The i18n key of a tip (`result.tip.<id>`). */
export const lossTipKey = (id: LossTipId): string => `result.tip.${id}`

/** The runes a tip shows beside its line — painted when the art is on. */
export const LOSS_TIP_RUNES: Readonly<Record<LossTipId, readonly number[]>> = {
  block: [EARTH],
  stack: [FIRE, EARTH],
  keepDrawing: [FIRE],
  drawBig: [FIRE],
  mix: [FIRE, EARTH]
}

/* ─────────────────────────────── the tally ─────────────────────────────── */

const tally: DuelTally & { round: number } = { round: -1, casts: 0, walls: 0, multi: 0, quiet: false }

/** Start the tally over when the duel on screen is not the one it counted. */
const fresh = (): void => {
  if (tally.round === S.round) return
  tally.round = S.round
  tally.casts = tally.walls = tally.multi = 0
  tally.quiet = false
}

/** The current duel's tally (a copy). */
export const duelTally = (): DuelTally => {
  fresh()
  return { casts: tally.casts, walls: tally.walls, multi: tally.multi, quiet: tally.quiet }
}

/** The tip for the duel just lost. */
export const lossTip = (): LossTipId => pickLossTip(duelTally(), S.losses)

onDuelEvent((e, won) => {
  // Local versus has no loss card; its casts are not a child's lesson.
  if (S.versus) return
  if (e === 'cast') {
    // `cast` is the player's only (the foe's launches emit nothing), and
    // `lastPlayerCast` is written just before it.
    fresh()
    const c = lastPlayerCast()
    tally.casts++
    if (c.count >= 2) tally.multi++
    const q = comboFromIndex(c.index)
    if (q.length && spellOf(q).kind === 2) tally.walls++
  } else if (e === 'finish' && !won) {
    fresh()
    tally.quiet = afk()
  }
})
