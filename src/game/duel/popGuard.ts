/**
 * popGuard.ts — keeps a floating callout (`DuelPopups.vue`) on the screen.
 *
 * A callout is centred on its stage point, so one that stands near an edge —
 * the foe's "x2 COMBO" and her damage number, a long spell name, on a phone
 * held upright, where the stage is cropped and the type has a 20 px floor —
 * ran off it. Its centre is therefore kept HALF ITS WIDTH clear of both edges
 * of the box it rises in, the width estimated from its own text in `em` of
 * its own type (so the guard scales with the callout, in every locale):
 *
 *   • a letter of the shouted face is ~0.68 em in Latin (Fredoka), ~0.84 em
 *     in Cyrillic and Greek (those locales shout in the heavier body stack),
 *     a CJK / Hangul / full-width one 1 em, a space ~0.3 em — measured on
 *     "x2 COMBO", "КОМБО x2" and "ОГНЕННЫЙ ШАР x2" at 360 px;
 *   • the plum outline adds ~0.3 em;
 *   • it is measured at its LARGEST, the 1.4× it pops in at (`duel-pop`);
 *   • a damage number also drifts 1 em sideways off its victim (46 stage
 *     units at its own 46-unit type), so it keeps that much more.
 *
 * An estimate, on the safe side: a callout a little further in than it had
 * to be is invisible; one past the edge is a word nobody can read.
 */

/** Wide glyphs: CJK, Hangul, kana, full-width forms. */
const WIDE = /[\u1100-\u115F\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFF60\uFFE0-\uFFE6]/
/** Cyrillic and Greek, shouted in the heavier body face. */
const BROAD = /[\u0370-\u03FF\u0400-\u052F]/

/** A line of callout text's advance, in em of its own type. */
export const textEm = (s: string): number => {
  let w = 0
  for (const ch of s) w += ch === ' ' ? 0.3 : WIDE.test(ch) ? 1 : BROAD.test(ch) ? 0.84 : 0.68
  return w
}

/** Half a callout's width at its largest, plus its drift, in em. */
export const popHalfEm = (widthEm: number, drifts: boolean): number =>
  Math.round(((widthEm + 0.3) * 0.7 + (drifts ? 1 : 0)) * 100) / 100

/** The callout's CSS `left`: centred on `x` px, `half` em clear of both edges.
 *  In a box narrower than the callout it keeps the LEFT edge on screen. */
export const guardedLeft = (x: number, half: number): string =>
  `clamp(${half}em, ${Math.round(x * 10) / 10}px, calc(100% - ${half}em))`
