/**
 * resist.ts — the canvas's copy of `--am-resist` (theme.sass), the colour of
 * a foe's STRENGTH (§6.6a): the HUD's ×0.55 badge, the resisted callout, and
 * now the spell that closed on it — its trail, its rim and the small puff it
 * lands as — so the eye links the weak hit to the badge at once.
 *
 * The canvas cannot read a CSS token at the moment it builds its palettes
 * (`fx.ts` packs its colours once, at module load, before any stylesheet is
 * guaranteed), so it keeps the value here, the way it keeps its one ink
 * (`render.ts` `INK` = `--am-ink`). ONE place, pinned to the token by
 * `tests/duel/strengthPops.test.ts`, so the two can never drift.
 *
 * A LEAF on purpose: no imports, so `fx.ts` can read it while its palette is
 * being built without dragging a module cycle in.
 */
export const RESIST_INK = '#DDA46C'
