import { reactive } from 'vue'

/**
 * useRuneGift — the new rune a chest has just given (story-spec §8.30).
 *
 * A chest that owes a rune sets this; `RuneGift.vue` presents it and clears
 * it. The rune is already in the save by then — this is the CEREMONY, not the
 * grant, so a player who closes the tab mid-reveal still owns the rune.
 */
export const runeGift = reactive({
  /** The rune being given, or -1 when nothing is. */
  rune: -1
})

/** Hand a rune over with the full reveal. */
export const showRuneGift = (rune: number): void => {
  runeGift.rune = rune
}

export const closeRuneGift = (): void => {
  runeGift.rune = -1
}
