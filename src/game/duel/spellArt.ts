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

/* ------------------------- the combination half ---------------------- */

/**
 * A flourish carried over the body by a spell that has EARNED A NAME — the
 * golden 22 (§6.4). Four of them, because a flourish a child cannot name is
 * noise: a crown of orbiting motes (the heavies), a counter-spinning star
 * (the crystalline ones), chips thrown off (the shattering ones) and a halo
 * (the ones that whirl).
 */
export type Mark = 'none' | 'crown' | 'star' | 'shards' | 'halo'

/**
 * A cast's whole look: its lead element's, plus what the REST of the cast
 * does to it.
 *
 * The lead rune is only ever half of a spell (§6.2 step 7). Fire and Ice
 * together is not a hot spell with a cold name — it is a wet ball, and the
 * eye should be able to say so before the callout does. So a cast carries a
 * `mix`: the strongest element that is not the lead. It never touches the
 * body (that is the lead's job, and the lead is what the damage is scaled
 * by) — it tints the ribbon's soft pass, the rim the light catches, and half
 * of what the hit leaves behind. All 454 combinations get it for free.
 */
export interface CastLook extends SpellLook {
  /** The element mixed into this cast; -1 when it is pure. */
  mix: number
  mark: Mark
}

/**
 * The golden spells' own silhouettes (§6.4). Only these 20 fly — the two
 * barriers in the matrix are walls, not shots — and only these have names a
 * child reads on the callout, so only these are worth hand-drawing. Every
 * other combination is the generated look plus its `mix`.
 */
const SIG: Readonly<Record<string, Partial<SpellLook> & { mark: Mark }>> = {
  '0.0': { mark: 'halo', tail: 11, shed: 34 },                        // Fire Storm
  '0.0.0': { mark: 'crown', tail: 12, glow: 3.4, shed: 40 },          // Fire Rain
  '1.1.1': { mark: 'halo', tail: 14, spin: 11, width: 0.9 },          // Cyclone
  '2.2.2': { mark: 'star', tail: 10, glow: 2.8, shed: 26 },           // Blizzard
  '3.3': { mark: 'shards', spin: 5 },                                 // Earth Shard
  '3.3.3': { mark: 'crown', tail: 6, width: 1.05, glow: 2 },          // Boulder
  '0.1': { mark: 'halo', tail: 12, spin: 4 },                         // Fire Ball
  '0.2': { mark: 'star', tail: 10, glow: 3 },                         // Wet Ball
  '0.3': { mark: 'shards', spin: 4.5, shed: 32 },                     // Magma Shard
  '1.2': { mark: 'halo', tail: 12, spin: 6, width: 0.8 },             // Frost Gale
  '1.3': { mark: 'shards', tail: 7, shed: 30 },                       // Sand Blast
  '2.3': { mark: 'crown', tail: 8, width: 0.8, glow: 2.6 },           // Glacier
  '0.1.2': { mark: 'star', tail: 13, spin: 2.6, glow: 3.4 },          // Prism Nova
  '0.1.3': { mark: 'halo', tail: 12, shed: 36 },                      // Ash Storm
  '0.2.3': { mark: 'shards', tail: 9, glow: 3, shed: 34 },            // Shatter
  '1.2.3': { mark: 'halo', tail: 13, spin: 7, glow: 2.8 }             // Tempest
}

/**
 * The element MIXED into a cast: the commonest rune that is not the lead,
 * ties broken toward the one drawn first — the same "what did she lean on"
 * question `dominantRune` asks, with the lead taken out of the running.
 * Returns -1 for a pure cast, which is what "no second colour" means
 * everywhere downstream.
 */
export const mixRune = (q: readonly number[], lead: number): number => {
  let best = -1
  let bestN = 0
  for (let i = 0; i < q.length; i++) {
    const r = q[i]!
    if (r === lead) continue
    let n = 0
    for (const x of q) if (x === r) n++
    if (n > bestN) {
      bestN = n
      best = r
    }
  }
  return best
}

/** The look a cast flies with: its lead element's, its mix, and — if it is one
 *  of the golden 22 — that spell's own flourish. */
export const castLook = (lead: number, mix = -1, key = ''): CastLook => {
  const base = lookOf(lead)
  const sig = SIG[key]
  return { ...base, ...sig, mix: mix === lead ? -1 : mix, mark: sig?.mark ?? 'none' }
}

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
