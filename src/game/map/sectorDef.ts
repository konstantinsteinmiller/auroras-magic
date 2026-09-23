/**
 * sectorDef.ts — the contract every sector is authored against (story-spec
 * §8.7–§8.8, §9.1, §9.14). Its own module so each chapter's sector file can
 * import it without an import cycle through the registry (`sectors.ts`).
 *
 * Space: sector units (SU), 1152 × 672 (`SEC_W` × `SEC_H`). A boss sector is
 * the same SU space at `rvu: 2` — 4× a standard sector's area in restore-view
 * units, so its tools come out half the size against it.
 */
import type { G2D, Pot } from '@/game/map/kit'

/** A chapter's accent (§8.2): the standard gift's ribbon, and a boss chest's
 *  clasp gem — the chapter's element colour, never a rune's. */
export interface SectorAccent {
  ribbon: string
  ribbonShade: string
  gem: string
}

/**
 * A tap creature (§8.8 beat 2): on a RESTORED sector, tapping the spot
 * (x, y, radius r — at least 40 SU, a small finger's target on a phone)
 * plays a ~900 ms peek-a-boo. `draw` renders it at peek `k`: 0 = hidden
 * behind its prop (draw that prop's FRONT here too, so k = 0 looks exactly
 * like the prop alone), 1 = fully out, doing its one thing. `t` is seconds.
 *
 * That front must be a prop `paint()` already draws, and it goes through
 * `tapCover.ts` — on a painted sector the pixels come out of the painting, so
 * the prop is not drawn a second time over its own painted self.
 */
export interface TapCreature {
  x: number
  y: number
  r: number
  draw: (g: G2D, k: number, t: number) => void
}

/**
 * A chapter's rescue collectible (§8.8 beat 3), on exactly ONE sector per
 * chapter. It lies under the dust at (x, y); `r` bounds its silhouette.
 * `draw` renders it asleep/hidden (k = 0: curled up, dim, still readable
 * as a shape under the brush) through freed (k = 1: awake, happy, glowing).
 * Drawn in the PROPS layer, so the dust covers it until it is wiped.
 */
export interface RescueCollectible {
  x: number
  y: number
  r: number
  draw: (g: G2D, k: number, t: number) => void
}

export interface SectorDef {
  node: number
  /** Restore-view units per sector unit: 1, or 2 for a boss (4× area). */
  rvu: number
  pots: readonly Pot[]
  /** The colour-me region's middle, SU — where a picked paint lands. */
  landmark: { x: number; y: number }
  /** Where the gift (or chest) sits before it opens, SU. A boss's chest sits
   *  centred, near the bottom (§8.2). */
  giftSpot: { x: number; y: number }
  /** A tint for its map page and chest ribbon. */
  seed: number
  /** The static painting, with the landmark in `pot`'s colours. Baked once. */
  paint: (g: G2D, pot: Pot) => void
  /** The props. `alive` 0 = at rest (baked into the dust); 1 = restored and
   *  animating; `t` = seconds since the sector came alive. Runs EVERY FRAME
   *  for up to 16 sectors on the map: keep it cheap. */
  props: (g: G2D, t: number, alive: number) => void
  accent?: SectorAccent
  tap?: TapCreature
  rescue?: RescueCollectible
}
