import type { Directive } from 'vue'

/**
 * `v-fit` — shrink a one-line label until it fits its box, instead of cutting
 * it off with an ellipsis (story-spec §8.21, S7 locale QA).
 *
 * The CAST button's keyboard hint is "[Space] Cast" in English and
 * "[Leertaste] Zaubern" in German; a long spell name ("Kristallschutz") takes
 * the same seat. The HUD scales as one stage, so a label that overflows does
 * so at EVERY window size — the German player saw "[Leertaste] Za…" on every
 * screen. Truncated copy reads as a bug; slightly smaller copy does not.
 *
 * The value is the label's full size in px; omit it to take the size the
 * stylesheet gives (a `clamp()` in the portrait layout). Never below 60 % of
 * it: past that the box is wrong, not the word, and the ellipsis stays as the
 * last resort.
 *
 * Measured in the element's own CSS px (`scrollWidth` vs `clientWidth`), so a
 * transform on an ancestor — the HUD's stage scale — does not skew it. The
 * element needs `overflow: hidden` and a bounded width for the two to differ.
 */
const fit = (el: HTMLElement, base?: number): void => {
  el.style.fontSize = base ? `${base}px` : ''
  if (el.scrollWidth <= el.clientWidth + 1) return
  const size = base ?? Number.parseFloat(getComputedStyle(el).fontSize)
  if (!size) return
  const k = Math.max(0.6, (el.clientWidth / el.scrollWidth) * 0.98)
  el.style.fontSize = `${(size * k).toFixed(1)}px`
}

export const vFit: Directive<HTMLElement, number | undefined> = {
  mounted: (el, b) => fit(el, b.value),
  updated: (el, b) => fit(el, b.value)
}
