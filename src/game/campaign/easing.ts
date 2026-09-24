/**
 * easing.ts — what a node's duel costs a BEGINNER (story-spec §6.14–§6.15,
 * owner 2026-09-20).
 *
 * The roster says what a foe IS: her HP, her tier, her magic (`duel/foes.ts`).
 * This says what that foe costs someone who has held a phone for four minutes.
 * They are different jobs and they move for different reasons — a balance pass
 * on the game moves the first, a balance pass on onboarding moves the second —
 * so they live apart, and §4.8.1's boundary is kept: the duel never reads a
 * node, the campaign resolves the easing and hands it over with the foe.
 *
 * ── Why this exists ──
 *
 * The difficulty harness (`tests/duel/winRate.test.ts`) models two children.
 * §7.2's core child — a comfortable 7–10-year-old — won the first duel 100 %
 * of the time with 70 % of her health left. A child UNDER NINE, drawing half
 * as fast, recognising three shapes in five, firing lone runes and looking
 * away every sixth beat, won it **8.9 %** of the time, and chapter 1's boss
 * **0.8 %** — 7.4 % even across three tries with Dream Dust helping. She was
 * not running out of clock (0 % of losses) and she was not lost: she reached
 * every foe's last third and was knocked out there, at 2 % of her own health,
 * after 43 seconds. The exchange rate was wrong, not her understanding.
 *
 * ── The three dials, and why it is three and not one ──
 *
 * `hp` ends the grind sooner. Her problem was never that she could not hurt
 * the foe — she took two thirds of one off before dying — it was that the
 * last third arrived after her own health had run out.
 *
 * `dmg` decides whether a mistake is survivable. It is the dial people forget
 * because it changes no number on screen: the same blow, costing less. A child
 * who can afford three mistakes is playing; one who can afford none is
 * watching.
 *
 * `rate` is how often the foe acts at all. It is the gentlest of the three
 * (the foe's pace is the duel's pulse, and slowing it too far makes the fight
 * read as broken rather than as kind), so it moves least.
 *
 * ── The shape ──
 *
 * One row per chapter, climbing the whole way and reaching the roster's own
 * numbers at chapter 10. Chapters 1 and 2 — the ten duels the owner named —
 * are the teaching chapters and sit lowest; the rest is a RAMP rather than a
 * cliff, because the tenth duel and the eleventh are one evening apart and a
 * wall between them reads as the game turning on her. Measured with the ramp
 * against a flat stop at chapter 4: the small child went from 86 % on the
 * tenth duel to 0.3 % on the sixteenth, which is not "a bit harder".
 *
 * What the ramp deliberately does NOT do is carry her through chapters 6–10
 * on the first try. Flattening it that far would flatten the game for the
 * nine-year-old it is built for — she already clears every chapter at 92 % or
 * better. The back half is carried by Dream Dust instead (`sim.ts`'s
 * `dustEase`), which spends nothing on a player who is winning.
 *
 * Numbers chosen by measurement, not by feel: `tests/duel/winRate.test.ts`
 * pins what they buy the small child, AND that they do not buy her a game
 * that plays itself (a player who never draws still loses every one of them).
 */

import { NO_EASE, type DuelEase } from '@/game/duel/config'
import { nodeIsBoss } from '@/game/campaign/tables'

/**
 * One row per chapter, 1 to 10. It only ever goes up, and it reaches the
 * roster's own numbers at the Friendship Festival — the last chapter is the
 * fight as designed, for everyone.
 */
const CURVE: readonly DuelEase[] = [
  { hp: 0.62, rate: 0.82, dmg: 0.58 },
  { hp: 0.66, rate: 0.84, dmg: 0.62 },
  { hp: 0.70, rate: 0.86, dmg: 0.66 },
  { hp: 0.75, rate: 0.88, dmg: 0.71 },
  { hp: 0.79, rate: 0.90, dmg: 0.75 },
  { hp: 0.83, rate: 0.92, dmg: 0.79 },
  { hp: 0.87, rate: 0.94, dmg: 0.83 },
  { hp: 0.91, rate: 0.96, dmg: 0.87 },
  { hp: 0.95, rate: 0.98, dmg: 0.92 },
  { hp: 1, rate: 1, dmg: 1 }
]

/**
 * THE FIRST BOSS ONLY (1-5, Briar). A boss carries 15 % more health than her
 * chapter's shadow and a phase 2 on top, and this one is met with a kit of
 * three runes — so at a flat chapter discount she came out the hardest duel
 * of the ten: 75.6 % against chapter 2's own boss at 85.0 %, a ramp running
 * backwards. With the discount applied twice she sits at 83.1 %, a step under
 * the standard nodes around her, where a boss belongs.
 *
 * Chapter 2's boss does NOT get it: measured at 91.9 % with it, she became
 * the easiest of the ten duels, which is the same mistake pointing the other
 * way. By then the chests have paid out two more runes, and the kit is the
 * relief.
 */
const FIRST_BOSS: DuelEase = { hp: 0.88, rate: 1, dmg: 0.9 }

/**
 * THE FIRST DUEL IS SHORT (owner, 2026-09-25): Aurora and Umbra both start it
 * with half their health. It is a stranger's first fight, right after the
 * prologue, and it should end while it is still new. Both bars shrink
 * together, so it is the same fight as before, only half as long: the same
 * trade, the same mercy floor, and Umbra's damage still eased by chapter 1's
 * row. Node-keyed like the rest, so a replay of it is short too.
 */
export const FIRST_DUEL_HP = 0.5

/** Both duelists' health in node `n`'s duel, as a factor. */
export const duelHpScale = (n: number): number => (n === 0 ? FIRST_DUEL_HP : 1)

/**
 * How node `n`'s duel is eased. Node-keyed and nothing else — not the
 * player's age (unknowable), not a difficulty setting (a five-year-old does
 * not find one), not the session (a child who put the phone down mid-chapter
 * comes back to the same fight she left).
 */
export const earlyEase = (n: number): DuelEase => {
  const base = CURVE[Math.floor(n / 5)]
  if (!base) return NO_EASE
  if (!nodeIsBoss(n) || n !== 4) return base
  return {
    hp: base.hp * FIRST_BOSS.hp,
    rate: base.rate * FIRST_BOSS.rate,
    dmg: base.dmg * FIRST_BOSS.dmg
  }
}
