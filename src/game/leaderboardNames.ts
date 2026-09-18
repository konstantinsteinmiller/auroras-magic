/**
 * The client's copy of the leaderboard name vocabulary (story-spec §2: no free
 * text on a board children read).
 *
 * The Worker keeps the same lists in `worker/src/names.ts`: it deploys on its
 * own and cannot import from the game. `tests/leaderboard/leaderboardNames.test.ts`
 * fails if the two copies differ. Append only: removing a word would orphan every
 * row that carries it.
 */
export const NAME_ADJECTIVES = [
  'Sunny', 'Starry', 'Misty', 'Sparkly', 'Gentle', 'Happy', 'Brave', 'Cozy',
  'Dreamy', 'Glowy', 'Bubbly', 'Fluffy', 'Lucky', 'Merry', 'Rosy', 'Jolly',
  'Minty', 'Silver', 'Golden', 'Breezy', 'Frosty', 'Twinkly', 'Shiny', 'Snowy'
] as const

export const NAME_NOUNS = [
  'Pony', 'Unicorn', 'Comet', 'Pixie', 'Sprite', 'Fawn', 'Bunny', 'Kitten',
  'Otter', 'Robin', 'Wren', 'Petal', 'Clover', 'Maple', 'Pebble', 'Star',
  'Moon', 'Cloud', 'Rainbow', 'Meadow', 'Acorn', 'Firefly', 'Owl', 'Panda'
] as const

/** Longest possible name: 7 + 1 + 7 + 1 + 3 = 19 characters. */
export const NAME_MAX = 20

const NAME_RE = new RegExp(
  `^(${NAME_ADJECTIVES.join('|')}) (${NAME_NOUNS.join('|')}) ([1-9][0-9]{2})$`
)

/** True only for a name the game itself could have minted. */
export const isMintedName = (name: unknown): name is string =>
  typeof name === 'string' && name.length <= NAME_MAX && NAME_RE.test(name)
