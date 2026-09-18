/**
 * useBook — the spellbook's reach and its "new" cue (story-spec §3.9.1, §C15–C16).
 *
 *   • REACHABLE: a combo whose every rune the player can draw right now (the
 *     frozen four plus what the chests have given). Only reachable entries
 *     are listed at all — unreachable ones are omitted, never shown locked —
 *     so the book only ever grows.
 *   • NEW: discovered (`combosSeen`) but not yet shown in the book
 *     (`combosViewed`). A soft sparkle on both book icons and on the row;
 *     it clears once the row has been on screen for a second.
 *
 * `bookHud` is the reactive mirror the icons read; the save itself is not
 * reactive, so every writer calls `refreshBook()`.
 */
import { reactive } from 'vue'
import { S, save } from '@/game/duel/state'
import { hasBit, setBit } from '@/game/campaign/bitset'
import { COMBO_COUNT, comboFromIndex } from '@/game/duel/config'
import { FROZEN_MASK } from '@/game/duel/runeDefs'

export const bookHud = reactive({
  /** Some reachable discovery has not been looked at yet. */
  hasNew: false,
  /** Bumped on every change, so a view re-reads the save. */
  rev: 0
})

/** The runes the player can draw now, as a bitmask. */
export const drawableMask = (): number => (S.campaign.runesUnlocked | FROZEN_MASK) >>> 0

export const isReachable = (i: number, mask = drawableMask()): boolean => {
  const q = comboFromIndex(i)
  return q.length > 0 && q.every((r) => (mask >>> r) & 1)
}

export const isKnown = (i: number): boolean => hasBit(S.campaign.combosSeen, i)

export const isNewCombo = (i: number): boolean => isKnown(i) && !hasBit(S.campaign.combosViewed, i)

/** Re-read the save into the mirror. */
export const refreshBook = (): void => {
  const mask = drawableMask()
  let any = false
  for (let i = 0; i < COMBO_COUNT && !any; i++) any = isNewCombo(i) && isReachable(i, mask)
  bookHud.hasNew = any
  bookHud.rev++
}

/** The book showed combo `i` long enough to count as seen. */
export const markViewed = (i: number): void => {
  if (!isNewCombo(i)) return
  S.campaign.combosViewed = setBit(S.campaign.combosViewed, i)
  save()
  refreshBook()
}
