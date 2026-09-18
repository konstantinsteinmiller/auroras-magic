/**
 * The duel's rules as data — every constant the jam build kept in `state.js`.
 *
 * COORDINATES
 *   Everything is laid out in a virtual 1280x720 stage. `layout.ts` computes
 *   one transform (`S.vx, S.vy, S.vs`) so every module works in stage units and
 *   the game fits any viewport identically. Pointer coords are converted to
 *   stage space before anything sees them.
 *
 * ART DIRECTION
 *   Hand-drawn CEL SHADING: flat colour fills with thick black outlines, no
 *   gradients on characters. Two chibi unicorns on a floating mossy island —
 *   AURORA (white/gold, cute, heroic) on the left, UMBRA (matte black/purple,
 *   sleepy-menacing) on the right. The sky is the scoreboard: heavy grey storm
 *   while even, thinning toward a rainbow as you win, blackening to rain as you
 *   lose. The painted-art successor of this look is specified in `art-style.md`.
 */

/* ------------------------------ stage ------------------------------ */
export const SW = 1280
export const SH = 720

export interface Rect { x: number; y: number; w: number; h: number }

/** The drawing box: the central third of the stage (GDD 3.2). */
export const BOX: Readonly<Rect> = { x: 470, y: 168, w: 340, h: 300 }

/* --------------------------- the duelists -------------------------- */
/** Ground line: the island rim in arena.ts. The hooves stand here. */
export const GY = 508
/* The island spans x 326..954 (arena IX/IW) and the drawing box takes
   470..810, so the duelists live in the two strips left over. Any wider and
   they float off the rim; any narrower and they collide with the box. */
export const AX = 400 // Aurora, left
export const UX = 880 // Umbra, right
/** Horn tip, where spells are born — offset from the hooves. Measured from
    the rendered rig: Aurora's tip sits at (x+58, y-168), Umbra's (larger head)
    at (x-61, y-174); one symmetric pair covers both within a few units. */
export const HDX = 59
export const HDY = -170

/* ------------------------------ phases ----------------------------- */
export const PH_DUEL = 0
export const PH_WIN = 1
export const PH_LOSE = 2
export type Phase = typeof PH_DUEL | typeof PH_WIN | typeof PH_LOSE

/* ------------------------------ runes ------------------------------ */
/* The four primitives of GDD 3.2. */
export const FIRE = 0
export const WIND = 1
export const ICE = 2
export const EARTH = 3
export type Rune = 0 | 1 | 2 | 3
/** i18n ids of the four runes, in rune order (`rune.<id>`). */
export const RUNE_IDS = ['fire', 'wind', 'ice', 'earth'] as const
/** [base, light] per rune. */
export const RUNES: readonly (readonly [string, string])[] = [
  ['#ff5a2b', '#ffb066'],
  ['#8ff0ff', '#d9ffff'],
  ['#59b6ff', '#cfe9ff'],
  ['#b08050', '#e0c39a']
]

/* --------------------------- spell matrix -------------------------- */
/**
 * Spell kinds:
 *   0 bolt (fast projectile) · 1 field (delayed area) · 2 barrier
 *   3 heavy (delayed, big) · 4 push
 */
export type SpellKind = 0 | 1 | 2 | 3 | 4
/**
 * [nameId, kind, damage, extra]. `nameId` is the i18n key under `spell.`;
 * extra = dot seconds / barrier seconds / slow seconds, per spell.
 */
export type Spell = readonly [string, SpellKind, number, number]

/**
 * Full GDD §4 matrix. Key = sorted rune ids joined, e.g. '0', '00', '03'.
 * NOTE: every key must be reachable, i.e. at most MAX_RUNES long — the
 * spellbook enumerates these keys, so a longer one would render a row no
 * player could ever unlock.
 */
export const SPELLS: Readonly<Record<string, Spell>> = {
  '0': ['fireBolt', 0, 8, 0],
  '00': ['fireStorm', 1, 14, 3],
  '000': ['fireRain', 3, 30, 0],
  '1': ['bolt', 4, 5, 0],
  '11': ['windWall', 2, 0, 6],
  '111': ['cyclone', 4, 16, 0],
  '2': ['iceBolt', 0, 8, 0],
  '22': ['pillar', 2, 0, 4],
  '222': ['blizzard', 1, 22, 3],
  '3': ['earthWall', 2, 0, 2],
  '33': ['earthShard', 0, 16, 0],
  '333': ['boulder', 3, 34, 0],
  '01': ['fireBall', 0, 16, 0],
  '02': ['wetBall', 0, 20, 2],
  '03': ['magmaShard', 0, 15, 2],
  '12': ['frostGale', 1, 14, 3],
  '13': ['sandBlast', 0, 13, 0],
  '23': ['glacier', 3, 24, 0],
  '012': ['prismNova', 3, 32, 2],
  '013': ['ashStorm', 1, 24, 3],
  '023': ['shatter', 3, 30, 0],
  '123': ['tempest', 1, 26, 3]
}
/** Fallback for any unlisted combination — never leave the player with nothing. */
export const WILD: Spell = ['wildSurge', 0, 11, 0]

export const MAX_RUNES = 3
export const HP_MAX = 100

/** Key of a rune queue in the spell matrix: sorted ids joined. */
export const comboKey = (q: readonly number[]): string => [...q].sort().join('')
/** Look up the spell for a queue of rune ids. */
export const spellFor = (q: readonly number[]): Spell => SPELLS[comboKey(q)] ?? WILD

/* ----------------------------- the ladder --------------------------- */
/**
 * CTR[e] is the rune that COUNTERS element e: fire melts ice, ice freezes
 * wind, wind erodes earth, earth smothers fire. One 4-cycle, so every themed
 * foe has exactly one element that hurts and one that barely scratches.
 */
export const CTR: readonly Rune[] = [3, 2, 0, 1]
/**
 * [nameId, element] up the ladder, one rung per win. Element -1 means NO
 * weakness: Umbra opens the game before the player knows elements exist, and
 * PRISM closes it with nothing to exploit, so the boss has to be out-played
 * rather than counter-picked. The index doubles as the AI tier (see `think`).
 * `nameId` is the i18n key under `foe.`.
 */
export const FOES: readonly (readonly [string, number])[] = [
  ['umbra', -1],
  ['ember', FIRE],
  ['zephyr', WIND],
  ['glace', ICE],
  ['terra', EARTH],
  ['prism', -1]
]
/**
 * Damage scale for rune `r` against foe element `f`. The rune that counts is
 * the LAST one drawn — which is already the one that colours the projectile
 * and its impact, so the element the player sees flying is the element that
 * gets the bonus.
 */
export const elemMul = (r: number, f: number): number => (f < 0 ? 1 : r === f ? 0.55 : CTR[f] === r ? 1.7 : 1)

/* --------------------------- meta economy --------------------------- */
/** Coins a win pays on rung `foe` — the reward curve outruns the difficulty. */
export const winCoins = (foe: number): number => 12 + foe * 6
/** Price of the NEXT rank of an element already at `rank`. */
export const rankPrice = (rank: number): number => 10 * (rank + 1)
/** Damage bonus per element rank. */
export const RANK_BONUS = 0.12

/* ------------------------------ features ---------------------------- */
/**
 * FEATURE FLAG, not a deletion. The jam build compiled the spellbook out and
 * the migration keeps it that way; flip to `true` to put the tome (and its
 * HUD button) back. `seen` is recorded either way.
 */
export const SPELLBOOK = false
