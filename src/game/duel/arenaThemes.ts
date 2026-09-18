/**
 * arenaThemes.ts — the duel island dressed for its chapter (story-spec §9.6,
 * C20): a palette and a prop swap on the same baked island, never a new
 * backdrop. Data only; `arena.ts` bakes it.
 *
 * Chapter 1 is the shipped jam island, unchanged. Later chapters keep its
 * VALUE structure — a dark rock, a mid-tone cap, one bright lip — and move
 * the hue into their biome. The arena deliberately sits a step below the
 * map's candy floor (§9.6.1): in the duel the spells must stay the most
 * saturated thing on screen (art-style.md §4.3).
 */
export interface ArenaTheme {
  /** The rock: base fill, its two cel planes, the roots under the cap. */
  rock: string
  plane1: string
  plane2: string
  roots: string
  /** The cap's bands: the outlined disc, the mid band, the bright lip, the lit top. */
  cap: string
  capMid: string
  capLip: string
  capTop: string
  /** The living-up-there dots, alternating. */
  dotA: string
  dotB: string
  /** The rim's tufts, and their colour in a losing storm. */
  tuft: string
  tuftDark: string
  /** The cloud band's two tones (baked mid-grey, re-tinted by the weather). */
  cloud: string
  cloudLit: string
}

export const ARENA_THEMES: readonly ArenaTheme[] = [
  // 1 Whispering Woods — the jam island.
  {
    rock: '#657', plane1: '#435', plane2: '#324', roots: '#353',
    cap: '#472', capMid: '#593', capLip: '#ce6', capTop: '#7c3',
    dotA: '#aab', dotB: '#fea', tuft: '#5a3', tuftDark: '#353',
    cloud: '#789', cloudLit: '#9ab'
  },
  // 2 Bubble Bay — sea-worn blue rock, a sandy cap, shells and coral.
  {
    rock: '#5a7396', plane1: '#3f5a82', plane2: '#2e4266', roots: '#2f6b5a',
    cap: '#a8783e', capMid: '#cf9f55', capLip: '#fff0b8', capTop: '#e8bd6c',
    dotA: '#ffc4d0', dotB: '#ff8a8a', tuft: '#3fb89a', tuftDark: '#2f6b5a',
    cloud: '#7892a6', cloudLit: '#a4c2d6'
  },
  // 3 Cloud Kingdom — lavender cloud-stone, a cloud-white cap, stars.
  {
    rock: '#7d78ad', plane1: '#625d97', plane2: '#4d4880', roots: '#8a80c0',
    cap: '#8e98cf', capMid: '#b8c2ec', capLip: '#f4f6ff', capTop: '#d6ddfa',
    dotA: '#fff3a0', dotB: '#d9c2ff', tuft: '#c3cdf2', tuftDark: '#7e86b8',
    cloud: '#8890ae', cloudLit: '#b4bdd8'
  }
]

/** The theme for chapter `c` (0-based); unbuilt chapters wear chapter 1's. */
export const arenaTheme = (c: number): ArenaTheme => ARENA_THEMES[c] ?? ARENA_THEMES[0]!
