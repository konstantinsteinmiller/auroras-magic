/**
 * spellArt.ts — what a spell LOOKS like, per element (story-spec §8.31).
 *
 * The jam build drew every spell as a coloured ball with a highlight, which
 * is what a 13 kB budget buys. This is the table that budget could not
 * afford: for each of the twelve runes, the body its shot flies as, the
 * ribbon it drags, what it sheds on the way, and what it leaves behind where
 * it lands.
 *
 * ONE table, read by three places that must never disagree — the projectile
 * (`render.drawShots`), the hit (`fx.impact`) and the charge at the horn
 * (`render` + `fx.castBurst`). A spell's identity is its silhouette and its
 * afterlife, not its hue: half these elements are a shade of blue, and a
 * child tells Ice from Water by the shards and the bubbles.
 *
 * Pure data and pure maths: no canvas, no state.
 */
import { RUNES, FIRE, WIND, ICE, EARTH, NATURE, WATER, LIGHTNING, ILLUSION, RAINBOW, TIME, MOON, LOVE } from '@/game/duel/config'

/** The silhouette a shot flies as. */
export type Body =
  | 'flame' | 'gust' | 'shard' | 'boulder' | 'leaf' | 'bubble'
  | 'bolt' | 'wisp' | 'prism' | 'sand' | 'crescent' | 'heart'

/** What a hit leaves behind for a moment after the debris. */
export type After = 'embers' | 'swirl' | 'frost' | 'dust' | 'petals' | 'spray' | 'sparks' | 'motes' | 'none'

export interface SpellLook {
  body: Body
  /** Ribbon length in samples (0 = no ribbon) and its width, × the shot's radius. */
  tail: number
  width: number
  /** How fast the body turns, radians per second (0 = it holds its attitude). */
  spin: number
  /** How hard it pulses, 0..1. */
  pulse: number
  /** Sheds this many motes a second while it flies. */
  shed: number
  after: After
  /** The glow's reach, × the shot's radius. */
  glow: number
}

/**
 * Indexed by rune id. Read as a sentence: "a Fire shot flies as a flame with
 * a long wide ribbon, spinning slowly, shedding embers, and leaves embers
 * burning where it lands."
 */
export const LOOK: readonly SpellLook[] = [
  /* FIRE      */ { body: 'flame', tail: 9, width: 0.95, spin: 0, pulse: 0.22, shed: 26, after: 'embers', glow: 2.6 },
  /* WIND      */ { body: 'gust', tail: 11, width: 0.7, spin: 7, pulse: 0.12, shed: 14, after: 'swirl', glow: 2 },
  /* ICE       */ { body: 'shard', tail: 7, width: 0.6, spin: 2.4, pulse: 0.08, shed: 16, after: 'frost', glow: 2.2 },
  /* EARTH     */ { body: 'boulder', tail: 5, width: 0.8, spin: 3.6, pulse: 0.06, shed: 12, after: 'dust', glow: 1.6 },
  /* NATURE    */ { body: 'leaf', tail: 8, width: 0.65, spin: 5, pulse: 0.14, shed: 18, after: 'petals', glow: 2 },
  /* WATER     */ { body: 'bubble', tail: 8, width: 0.8, spin: 0, pulse: 0.3, shed: 14, after: 'spray', glow: 2.2 },
  /* LIGHTNING */ { body: 'bolt', tail: 6, width: 0.55, spin: 0, pulse: 0.35, shed: 22, after: 'sparks', glow: 3 },
  /* ILLUSION  */ { body: 'wisp', tail: 12, width: 0.75, spin: 2, pulse: 0.26, shed: 16, after: 'motes', glow: 2.4 },
  /* RAINBOW   */ { body: 'prism', tail: 12, width: 0.9, spin: 1.6, pulse: 0.18, shed: 24, after: 'sparks', glow: 2.8 },
  /* TIME      */ { body: 'sand', tail: 9, width: 0.7, spin: 1.2, pulse: 0.1, shed: 20, after: 'dust', glow: 2 },
  /* MOON      */ { body: 'crescent', tail: 10, width: 0.7, spin: 1, pulse: 0.16, shed: 16, after: 'motes', glow: 2.6 },
  /* LOVE      */ { body: 'heart', tail: 10, width: 0.85, spin: 0, pulse: 0.28, shed: 20, after: 'petals', glow: 3 }
]

export const lookOf = (rune: number): SpellLook => LOOK[rune] ?? LOOK[FIRE]!

/** `[core, light]` — the element's own two tones (`RUNES`). */
export const tonesOf = (rune: number): readonly [string, string] => RUNES[rune] ?? RUNES[FIRE]!

/**
 * How big a shot of spell kind `k` flies. The jam build's numbers, kept: a
 * heavy is a boulder, a light is a pebble, and the eye reads the difference
 * before the damage number does.
 */
export const bodyRadius = (kind: number): number => (kind === 3 ? 32 : kind === 1 ? 25 : 19)

/**
 * A heavy spell (3 runes) is not the light one drawn bigger: it flies with a
 * longer ribbon, a wider glow and more shed. One multiplier, so a heavy is
 * heavier everywhere at once.
 */
export const heft = (kind: number): number => (kind === 3 ? 1.35 : kind === 1 ? 1.12 : 1)

/** Every rune id this table covers, for the test that keeps them in step. */
export const ART_RUNES = [FIRE, WIND, ICE, EARTH, NATURE, WATER, LIGHTNING, ILLUSION, RAINBOW, TIME, MOON, LOVE] as const
