/**
 * Test helpers for THE SPELL FORGE (story-spec §8.37): pressing CAST starts a
 * 1.5 s forge, and only then does the spell leave the horn. A rule test that
 * is about what a spell DOES, not when, casts through the real path and lets
 * the forge run out — the sim stepped at the scene's own 1/120 s, so every
 * timer ticks exactly as it does in the game (and a hit-stop is waited out).
 */
import { S } from '@/game/duel/state'
import { cast, castSide, updateSim } from '@/game/duel/sim'

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
