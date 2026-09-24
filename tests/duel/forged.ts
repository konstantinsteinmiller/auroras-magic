/**
 * Test helpers for THE SPELL FORGE (story-spec §8.37): pressing CAST starts a
 * 1.5 s forge (a ward's 0.4 s), and only then does the spell leave the horn. A rule test that
 * is about what a spell DOES, not when, casts through the real path and lets
 * the forge run out — the sim stepped at the scene's own 1/120 s, so every
 * timer ticks exactly as it does in the game (and a hit-stop is waited out).
 */
import { S } from '@/game/duel/state'
import { cast, castSide, updateSim } from '@/game/duel/sim'
import { stepDirector, wardWill } from '@/game/duel/director'

export const STEP = 1 / 120

/** Step the sim until side `e`'s forge has run out: its spell has left the
 *  horn (a ward has risen, a decoy stood up). `each` runs after every step. */
export const forged = (e = false, each?: () => void): void => {
  const f = e ? S.eForge : S.forge
  for (let i = 0; i < 600 && f.t >= 0; i++) {
    updateSim(STEP)
    each?.()
  }
}

/** Press CAST for side `e` and let the forge run out. */
export const castNow = (e = false, each?: () => void): void => {
  if (e) castSide(true)
  else cast()
  forged(e, each)
}

/**
 * THE FOE'S SNAP WALL answers to the director (§8.37, `director.wardWill`):
 * at an even fight she walls only some of the player's spells. A test about
 * HOW she walls puts the duel where she walls every one she has a wall for —
 * the player well ahead on the trade (the foe at 40 % health, not low enough
 * for her low-health defence), the director given three seconds to follow —
 * so it is a test of her rules, not of the dice.
 */
export const pressFoe = (): void => {
  S.ehp = S.ehpMax * 0.4
  for (let i = 0; i < 300; i++) stepDirector(0.01)
  if (wardWill() < 1) throw new Error(`pressFoe: the director is not pressing (will ${wardWill()})`)
}
