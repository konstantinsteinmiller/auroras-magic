/**
 * director.ts — the invisible hand that keeps a duel TENSE without ever
 * killing the player (owner, 2026-09-21).
 *
 * The roster's `aiTier` decides how fast a foe forms runes and how cleverly
 * she answers; `ease` decides how much the campaign is currently forgiving.
 * Neither of them watches the fight. The result was a foe who either whiffed
 * for a minute or rolled a child in twenty seconds, and the owner's note was
 * exactly right: *"never hitting anything… it would be best if the enemy AI
 * is adaptive."*
 *
 * So this sits on top of both and does three things, in order of how much
 * they matter to a seven-year-old:
 *
 *  1. THE MERCY FLOOR. The foe's spells may not take the player below
 *     `MERCY_FRAC` of her health. Not "unlikely to" — CANNOT: the subtraction
 *     is clamped. A child at the floor is one good rune from turning the duel
 *     around and is never, ever killed mid-fight.
 *
 *  2. THE TRADE, IN BOTH DIRECTIONS. The two health bars are kept descending
 *     TOGETHER. Ahead on the trade the foe eases off and takes less off the
 *     player; behind it she presses — she forms runes FASTER (`foeRate`), and
 *     the player's own spells take a little less off her (`playerDamageScale`).
 *     That second half was missing at first, and its absence is exactly what
 *     "every fight is way too easy" looked like: a duel the player was winning
 *     ended in twenty seconds with three-quarters of her health untouched.
 *     A fight that is close is exciting, and a fight that is close is one the
 *     player can still win.
 *
 *  3. THE AFK RULE. The floor is the one thing that could let a player put
 *     the phone down and never lose. So after `AFK_S` seconds with no drawing
 *     at all, the floor lifts and the foe is allowed to finish. Touch the
 *     screen and it comes straight back.
 *
 * NOT a difficulty setting, and deliberately not saved: it reads the live
 * fight and nothing else, so it cannot drift out of step with the campaign's
 * own tuning (`ease`, `onboard`, `dust`) or be stale after a migration.
 *
 * OFF in local versus, where both duelists are people and a rubber band on
 * one of them would be cheating.
 */
import { S } from '@/game/duel/state'
import { clamp, min } from '@/game/duel/util'

/** Seconds of no drawing before the foe is allowed to land the last blow. */
export const AFK_S = 10
/** The share of her health the foe's spells can never take her below. */
const MERCY_FRAC = 0.1
/** How far apart the two bars may drift before the foe presses or eases. */
const SLACK = 0.08
/** The hardest and gentlest the foe's damage is ever scaled. */
const PRESS_MAX = 1.6
const EASE_MIN = 0.45
/** How quickly the scale follows the fight (per second, toward its target). */
const FOLLOW = 2.2

/** Seconds since the player last drew anything. */
let idle = 0
/** The live damage multiplier on the foe's spells. */
let scale = 1

/** A fresh duel: nobody is idle and nothing has been traded yet. */
export const resetDirector = (): void => {
  idle = 0
  scale = 1
}

/** The player drew — she is here, and the mercy floor applies. */
export const noteAct = (): void => {
  idle = 0
}

/** Whether the player has been away long enough to be finished off. */
export const afk = (): boolean => idle >= AFK_S

/**
 * The lowest health the foe's spells may leave the player on.
 *
 * Zero in versus (a person on the other side earns the win), zero once the
 * player has gone quiet, and zero if she is somehow already under it —
 * nothing here ever HEALS her, it only refuses to take the last step.
 */
export const mercyFloor = (): number => {
  if (S.versus || afk()) return 0
  const floor = S.hpMax * MERCY_FRAC
  return min(floor, S.hp)
}

/** The multiplier on what the foe's spells take off the player. */
export const foeDamageScale = (): number => (S.versus ? 1 : scale)

/** How much of a hit the foe soaks when the player is running away with it. */
const SOAK_MIN = 0.34
/** Below this share of her health, nothing protects her — the kill always lands. */
const FINISH_AT = 0.12

/**
 * The multiplier on what the PLAYER's spells take off the foe.
 *
 * THE TRADE WAS ONLY HALF BUILT. The foe eased off when she was ahead, but
 * nothing at all slowed the player when SHE was — so a duel the player was
 * winning ended in twenty seconds with three-quarters of her health still on
 * the bar, which is exactly what "every fight is way too easy" looks like
 * from the sofa. Far ahead on the trade, the foe now soaks a little more.
 *
 * It lets go completely once she is nearly finished, so a duel that is won is
 * never a duel that will not END — the brake is on the runaway, not on the
 * kill. It is also off in versus, where the other side is a person.
 */
export const playerDamageScale = (): number => {
  if (S.versus) return 1
  if (S.ehpMax > 0 && S.ehp <= S.ehpMax * FINISH_AT) return 1
  return 1 - (1 - SOAK_MIN) * press()
}

/**
 * How hard the foe is pushing ABOVE an even fight, 0..1 — read by the NPC to
 * decide how fast to form and how readily to throw a half-built hand.
 *
 * MEASURED FROM 1, NOT FROM `EASE_MIN`. The first version of this mapped
 * `scale` across its whole range, so an even duel — `scale` exactly 1 — read
 * as 0.48, and everything hung off it was pressing from the first frame of
 * every fight. That silently multiplied §6.14's documented rate chain on a
 * foe who was neither ahead nor behind, which is what `tests/duel/rules.ts`
 * pins. At neutral this is ZERO, and the chain is the chain.
 */
export const press = (): number => (S.versus ? 0 : clamp((scale - 1) / (PRESS_MAX - 1), 0, 1))

/**
 * Follow the fight. `dt` seconds.
 *
 * The target is set by the GAP between the two health bars: the player ahead
 * means the foe has been missing and should press; the player behind means
 * she is being beaten up and it should let go. `FOLLOW` keeps the change
 * gradual, so a single unlucky spell never swings the whole fight.
 */
export const stepDirector = (dt: number): void => {
  idle += dt
  if (S.versus) {
    scale = 1
    return
  }
  const mine = S.hpMax > 0 ? S.hp / S.hpMax : 1
  const hers = S.ehpMax > 0 ? S.ehp / S.ehpMax : 1
  // > 0 when the player is winning the trade, < 0 when she is losing it.
  const gap = mine - hers
  const want = gap > SLACK
    ? 1 + (PRESS_MAX - 1) * min(1, (gap - SLACK) / (1 - SLACK))
    : gap < -SLACK
      ? 1 - (1 - EASE_MIN) * min(1, (-gap - SLACK) / (1 - SLACK))
      : 1
  scale += (want - scale) * min(1, dt * FOLLOW)
  scale = clamp(scale, EASE_MIN, PRESS_MAX)
  // A player sitting at the floor has nothing left to lose and the fight has
  // stopped moving: stop hitting her so the bar is not pinned, and let her
  // read the field and draw her way out.
  if (mine <= MERCY_FRAC + 0.01 && !afk()) scale = min(scale, 0.8)

}
