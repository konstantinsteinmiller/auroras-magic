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
  },
  // 4 Crystal Caves — amethyst rock, a glowing geode cap, crystal glints.
  {
    rock: '#6a4f94', plane1: '#523a7a', plane2: '#3e2b62', roots: '#7a5fb0',
    cap: '#7d5fb8', capMid: '#a488dc', capLip: '#efe0ff', capTop: '#c8b0f2',
    dotA: '#8ff0e6', dotB: '#ffb3d8', tuft: '#b69cf0', tuftDark: '#6a52a0',
    cloud: '#857a9e', cloudLit: '#aba0c6'
  },
  // 5 Mirror Mountains — slate-silver rock, a mint-glass cap, mirror glints.
  {
    rock: '#5d7288', plane1: '#465a70', plane2: '#34465a', roots: '#4a8a7a',
    cap: '#5fae98', capMid: '#8fd6c0', capLip: '#effff8', capTop: '#bfeede',
    dotA: '#ffffff', dotB: '#c8dbff', tuft: '#7fd0b4', tuftDark: '#3f7a6a',
    cloud: '#80919e', cloudLit: '#a8bac6'
  },
  // 6 Rainbow Ridge — rose rock, a striped candy cap, confetti flowers.
  {
    rock: '#8a5f86', plane1: '#6e4870', plane2: '#553558', roots: '#5aa05a',
    cap: '#d06a8a', capMid: '#f094ae', capLip: '#fff2c4', capTop: '#ffc27a',
    dotA: '#8fe04a', dotB: '#5cc8ff', tuft: '#7fd06a', tuftDark: '#4a7a3a',
    cloud: '#94849e', cloudLit: '#bcaec6'
  },
  // 7 Sunken Sands — sandstone rock, a dune cap, turquoise pebbles.
  {
    rock: '#a0724a', plane1: '#855a36', plane2: '#6a4428', roots: '#5a8a4a',
    cap: '#c9954e', capMid: '#e8bb6c', capLip: '#fff4cc', capTop: '#f5d38a',
    dotA: '#4fd6e0', dotB: '#ff9f6a', tuft: '#9ac65a', tuftDark: '#5a7a3a',
    cloud: '#9e9284', cloudLit: '#c6baa8'
  },
  // 8 Twilight Tundra — blue-violet ice rock, a snow cap, aurora glints.
  {
    rock: '#5a6a9e', plane1: '#465484', plane2: '#34406a', roots: '#6a8ac0',
    cap: '#8ea8d6', capMid: '#c4d6f4', capLip: '#ffffff', capTop: '#e6efff',
    dotA: '#5ce8a0', dotB: '#e08cff', tuft: '#d4e2f8', tuftDark: '#7e8eb8',
    cloud: '#8490a8', cloudLit: '#aeb8d0'
  },
  // 9 Starlight Summit — night-periwinkle rock, a moonlit cap, star dots.
  {
    rock: '#4f5390', plane1: '#3c3f76', plane2: '#2c2e5c', roots: '#5a5fa8',
    cap: '#6c72c0', capMid: '#9aa0e4', capLip: '#fff6c8', capTop: '#c4c8f6',
    dotA: '#fff3a0', dotB: '#ff9fdc', tuft: '#8f96dc', tuftDark: '#50558e',
    cloud: '#7a7ea0', cloudLit: '#a2a6c8'
  },
  // 10 Friendship Festival — warm rose rock, a meadow cap, bunting dots.
  {
    rock: '#8a6078', plane1: '#6e4a60', plane2: '#55364a', roots: '#4a8a4a',
    cap: '#5aa84a', capMid: '#7fcc5a', capLip: '#fff0a8', capTop: '#a8e06a',
    dotA: '#ff7ab8', dotB: '#ffe14d', tuft: '#6ac04a', tuftDark: '#3f6a34',
    cloud: '#9a8a9e', cloudLit: '#c4b4c6'
  }
]

/** The theme for chapter `c` (0-based). */
export const arenaTheme = (c: number): ArenaTheme => ARENA_THEMES[c] ?? ARENA_THEMES[0]!
