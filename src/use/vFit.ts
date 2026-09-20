import type { Directive } from 'vue'

/**
 * `v-fit` — shrink a label until it fits its box, instead of cutting it off
 * with an ellipsis (story-spec §8.21, S7 locale QA).
 *
 * The CAST button's keyboard hint is "[Space] Cast" in English and
 * "[Leertaste] Zaubern" in German; a long spell name ("Kristallschutz") takes
 * the same seat. The HUD scales as one stage, so a label that overflows does
 * so at EVERY window size — the German player saw "[Leertaste] Za…" on every
 * screen. Truncated copy reads as a bug; slightly smaller copy does not.
 *
 * The value is the label's full size in px; omit it to take the size the
 * stylesheet gives (a `clamp()` in the portrait layout). Never below 55 % of
 * it: past that the box is wrong, not the word, and the ellipsis stays as the
 * last resort.
 *
 * ── One line or two ──
 *
 * A shouted word ("ZAUBERN") is one line and only its WIDTH matters. A
 * sentence ("Tap to duel", "Нажмите, чтобы начать дуэль" — 27 characters for
 * the same button) is given `white-space: normal` and a height by its
 * stylesheet, and then both axes matter: it wraps first and shrinks second,
 * which costs far less type size than forcing a sentence onto one line.
 *
 * The height is only ever consulted for a label that may wrap, and it is
 * measured against the label's own LIMIT — the `height` or `max-height` its
 * stylesheet gives it — never against `clientHeight`. That distinction is the
 * whole of it: an unconstrained box IS its content, so `scrollHeight` is
 * always a hair past `clientHeight` (a line box is shorter than the face that
 * fills it — Arial's ascent plus descent is ~1.15 em, Devanagari more), and a
 * test against `clientHeight` reads that overhang as "still does not fit" at
 * every size and shrinks the label to the floor for nothing. Against the
 * limit, the same overhang is simply part of the content that has to fit —
 * which is why the boxes here are `2.8em` for two lines rather than `2.6em`.
 *
 * Measured in the element's own CSS px (`scrollWidth`, `scrollHeight`, and the
 * computed limit are all unscaled), so a transform on an ancestor — the HUD's
 * stage scale — does not skew it. The element needs `overflow: hidden` and a
 * bounded width for width to be measurable at all.
 */

/** Never smaller than this share of the label's full size. */
const FLOOR = 0.55

/** Every mounted `v-fit` label, so a resize can re-fit all of them. */
const live = new Map<HTMLElement, number | undefined>()

/** The tallest this label is allowed to be, or `Infinity` if nothing says. */
const limitOf = (cs: CSSStyleDeclaration): number => {
  const h = cs.height === 'auto' ? Number.POSITIVE_INFINITY : Number.parseFloat(cs.height)
  const max = cs.maxHeight === 'none' ? Number.POSITIVE_INFINITY : Number.parseFloat(cs.maxHeight)
  return Math.min(Number.isNaN(h) ? Number.POSITIVE_INFINITY : h, Number.isNaN(max) ? Number.POSITIVE_INFINITY : max)
}

const overflows = (el: HTMLElement, wraps: boolean, limit: number): boolean =>
  el.scrollWidth > el.clientWidth + 1 || (wraps && el.scrollHeight > limit + 1)

const fit = (el: HTMLElement, base?: number): void => {
  el.style.fontSize = base ? `${base}px` : ''
  const cs = getComputedStyle(el)
  const wraps = cs.whiteSpace !== 'nowrap'
  const size = base ?? Number.parseFloat(cs.fontSize)
  if (!size) return
  // `max-height` in `em` moves with the size this picks, so the limit is read
  // again on every pass rather than once.
  if (!overflows(el, wraps, limitOf(cs))) return

  // The width is proportional, so one guess lands a one-line label — that is
  // the common case and it costs a single reflow. A wrapping label re-flows
  // into a different number of lines at every size, so from there it is
  // stepped down until it fits (or the floor says the box is the problem).
  //
  // CLAMPED TO [FLOOR, 1], and that is not decoration. `clientWidth /
  // scrollWidth` is `Infinity` for a box whose content measures zero, and
  // `Infinity - 0.06` is still `Infinity`: the loop below would never reach
  // the floor, and a directive that spins forever does not fail a test — it
  // freezes the game on the frame it mounts. With the clamp the loop is at
  // most eight passes, whatever the browser hands back.
  const ratio = el.scrollWidth > 0 ? (el.clientWidth / el.scrollWidth) * 0.98 : 1
  let k = Number.isFinite(ratio) ? Math.min(1, Math.max(FLOOR, ratio)) : 1
  el.style.fontSize = `${(size * k).toFixed(1)}px`
  while (k > FLOOR && overflows(el, wraps, limitOf(getComputedStyle(el)))) {
    k = Math.max(FLOOR, k - 0.06)
    el.style.fontSize = `${(size * k).toFixed(1)}px`
  }
}

// One listener for the whole app: the portrait layouts size their type in `vw`
// and the stage scales with the window, so a label fitted at boot is measured
// against a box that no longer exists after a rotation.
let pending = 0
const refitAll = (): void => {
  if (pending) return
  pending = requestAnimationFrame(() => {
    pending = 0
    for (const [el, base] of live) if (el.isConnected) fit(el, base)
  })
}
if (typeof window !== 'undefined') {
  window.addEventListener('resize', refitAll)
  window.addEventListener('orientationchange', refitAll)
}

export const vFit: Directive<HTMLElement, number | undefined> = {
  mounted: (el, b) => {
    live.set(el, b.value)
    fit(el, b.value)
  },
  updated: (el, b) => {
    live.set(el, b.value)
    fit(el, b.value)
  },
  unmounted: (el) => {
    live.delete(el)
  }
}
