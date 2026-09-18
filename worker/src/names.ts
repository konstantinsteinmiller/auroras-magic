/**
 * The ONLY names this leaderboard will ever show.
 *
 * Auroras Magic is all-ages and family-friendly, so no free text reaches the
 * public board. Every player gets a minted name, "<Adjective> <Noun> <100-999>"
 * (e.g. "Sunny Pony 482"). The Worker refuses any name that does not parse as
 * exactly that. A tampered client cannot put words on a board children read,
 * because there is no way to spell anything that is not in these two lists.
 *
 * The client mints from its own copy (`src/game/leaderboardNames.ts`), and
 * `tests/leaderboard/leaderboardNames.test.ts` fails if the two ever differ.
 * Append only: removing a word would orphan every row that already carries it.
 * Every word is checked to be harmless on its own AND next to every word in
 * the other list.
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
