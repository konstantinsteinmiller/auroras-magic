<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { previewHud, type PreviewBeat } from '@/game/preview/previewHud'
import { reducedMotion } from '@/use/useAccessibility'
import { flowHud } from '@/use/useFlow'
import GameIcon from '@/components/icons/GameIcon.vue'
import VsBanner from '@/components/preview/VsBanner.vue'
import VsRibbon from '@/components/preview/VsRibbon.vue'
import VsEmblem from '@/components/preview/VsEmblem.vue'
import PowerRow from '@/components/preview/PowerRow.vue'
import { ribbonHeight } from '@/components/preview/previewSizes'

/**
 * DuelPreview — the DOM half of the five-second VS PREVIEW before every duel
 * (duel-preview contract, 2026-09-25): the Brawl-Stars-style "here are the
 * two of them" beat, in the storybook's own materials.
 *
 * The canvas (`game/preview/previewDraw.ts`) draws the two halves, the
 * podiums, the duelists sliding in, the rays, the shockwave and the glitter.
 * This draws everything with a WORD or a glyph in it, and nothing the canvas
 * draws: the chapter banner, the two name ribbons (with epithets and a
 * Guardian's crown), the VS medallion with its countdown stars, the two
 * powers blocks, the skip glyph and the exit flash.
 *
 * ── Timing: beat classes, never a clock ──
 * `preview.ts` owns the clock and writes `previewHud.beat` at each threshold
 * (a handful of writes per preview). The root carries one `r-<beat>` class
 * for EVERY beat reached so far — cumulative, so an element that arrived at
 * `ribbons` is still keyed on `r-ribbons` at `hold` and never replays or
 * vanishes — and each child starts its CSS animations off those classes, with
 * an `animation-delay` only for the offsets inside a beat. `gen` keys the
 * root, so a new preview remounts it and every animation starts over.
 * `.paused` freezes all of it whenever the clock is frozen: the game's pause
 * (an ad, a hidden tab, a menu, a QA hold — `previewHud.paused`) AND a page
 * turning (`flowHud.turning`, the same flag as `fading()`). The preview
 * mounts halfway through the turn into it, and its clock waits for the turn
 * to end; without the second, the banner would drop in unseen behind the
 * page.
 *
 * ── Budget ──
 * Transform and opacity only; no filter, no backdrop-filter, no animated
 * shadow. Every drawn mark is ONE element carrying its SVG as a background or
 * a `border-image` (`previewParts.ts`), which keeps the whole tree at ~37
 * nodes plus one per rune shown.
 *
 * Pointer-transparent throughout: the scene takes the skip tap (AppScene).
 */
const { t } = useI18n()

const BEATS: readonly PreviewBeat[] = [
  'enter', 'ribbons', 'vs', 'powers', 'hold', 'count1', 'count2', 'count3', 'go', 'exit', 'done'
]

const rootClass = computed(() => {
  const at = BEATS.indexOf(previewHud.beat)
  const reached = BEATS.slice(0, at + 1).map((b) => `r-${b}`)
  return [
    ...reached,
    {
      paused: previewHud.paused || flowHud.turning,
      still: reducedMotion.value,
      skippable: previewHud.skippable,
      portrait: previewHud.lay.portrait
    }
  ]
})

const px = (v: number): string => `${v.toFixed(1)}px`
/** A handful of custom properties, rewritten only when the layout changes. */
const rootStyle = computed(() => {
  const l = previewHud.lay
  return {
    '--H': px(ribbonHeight(l)),
    // The composition zooms about the screen's middle on the way out, as the
    // canvas does under it.
    '--ox': px(l.w / 2),
    '--oy': px(l.h / 2),
    // The flash blooms from the seam, where the VS stands.
    '--fx': px(l.vs.x),
    '--fy': px(l.vs.y)
  }
})

/** The skip glyph's chip, in the free corner the layout keeps for it. */
const skipStyle = computed(() => {
  const k = previewHud.lay.skip
  return { left: px(k.x - k.r), top: px(k.y - k.r), width: px(2 * k.r), height: px(2 * k.r), '--sr': px(k.r) }
})

/* The spoken summary is set a frame AFTER the preview appears: a live region
   announces a CHANGE inside it, and text that was already there when it
   appeared is, on most screen readers, never read. Again on every `gen`: a
   preview that replaces a running one re-keys the tree under this same
   component, which does not mount again. */
const summary = ref('')
let raf = 0
const announce = (): void => {
  summary.value = ''
  cancelAnimationFrame(raf)
  raf = requestAnimationFrame(() => {
    summary.value = t('preview.aria', { hero: t(previewHud.hero.name), foe: t(previewHud.foe.name) })
  })
}
onMounted(announce)
watch(() => previewHud.gen, announce)
onBeforeUnmount(() => cancelAnimationFrame(raf))

const staging = computed(() => previewHud.beat !== 'done')
</script>

<template lang="pug">
  div.duel-preview(:key="previewHud.gen" :class="rootClass" :style="rootStyle" aria-live="polite")
    span.pv-sr {{ summary }}
    //- Everything but the flash leaves with the preview; the flash stays over
    //- the duel's first frames while it fades.
    div.pv-stage(v-if="staging")
      VsBanner
      VsRibbon(side="hero")
      VsRibbon(side="foe")
      PowerRow(side="hero")
      PowerRow(side="foe")
      VsEmblem
      span.pv-skip.duel-plate(role="img" :aria-label="t('ui.skip')" :aria-hidden="!previewHud.skippable" :style="skipStyle")
        GameIcon.pv-skip-glyph(name="skip-forward")
    div.pv-flash(v-if="previewHud.flash > 0" :style="{ opacity: previewHud.flash }" aria-hidden="true")
</template>

<style scoped lang="sass">
.duel-preview
  position: absolute
  inset: 0
  overflow: hidden
  pointer-events: none
  user-select: none
  -webkit-user-select: none

// Read aloud, never seen.
.pv-sr
  position: absolute
  width: 1px
  height: 1px
  overflow: hidden
  clip-path: inset(50%)
  white-space: nowrap

.pv-stage
  position: absolute
  inset: 0
  transform-origin: var(--ox) var(--oy)

// ── the skip glyph: the intro's skip chip, in the layout's free corner ──
// (`lay.skip`, which already allows for the safe area.) Decoration: the tap
// anywhere is the scene's (AppScene → `skipPreview`); this only says that a
// tap will skip. Fades in when the preview becomes skippable (at 1.0 s, never
// on the session's first).
.pv-skip
  position: absolute
  box-sizing: border-box
  display: flex
  align-items: center
  justify-content: center
  --lw: max(2px, calc(var(--sr) * 0.1))
  border-radius: calc(var(--sr) * 0.6)
  color: var(--am-ink)
  opacity: 0
  transition: opacity 0.3s ease-out
  .skippable &
    opacity: 0.9
.pv-skip-glyph
  width: 56%
  height: 56%

// ── the exit flash: warm cream at the seam, gold toward the edges ──
// Its opacity IS `previewHud.flash` (written per frame by preview.ts, only
// while it is up). Above everything in the preview, and still here after
// `done`, over the duel's first frames.
.pv-flash
  position: absolute
  inset: 0
  z-index: 10
  background: radial-gradient(circle at var(--fx) var(--fy), var(--am-vs-flash-core) 0, var(--am-vs-flash-core) 18%, var(--am-vs-flash-edge) 100%)

// ── the timeline's two whole-screen moves ──
// The VS lands on the fanfare's hit (0.90 s, the `vs` beat itself — the
// medallion's fall began 0.18 s earlier): a 0.2 s micro-shake, ≤ 6 px.
.r-vs
  animation: pv-shake 0.2s linear both
// The exit: the composition zooms 1 → 1.06 as the flash rises — 0.3 s, from
// `SKIP_TO` to the hand-off (`preview.ts` `HANDOFF_AT`), where the flash is full.
.r-exit .pv-stage
  animation: pv-zoom 0.3s ease-in both

// Frozen with the game: every animation on every descendant, pseudo-elements
// included (the ribbons' glint and the lit stars are ::after).
.paused, .paused :deep(*), .paused :deep(*::before), .paused :deep(*::after)
  animation-play-state: paused !important

// Reduced motion: no shake, no zoom — the flash alone carries the exit.
.still.r-vs
  animation: none
.still.r-exit .pv-stage
  animation: none
@media (prefers-reduced-motion: reduce)
  .r-vs
    animation: none
  .r-exit .pv-stage
    animation: none

@keyframes pv-shake
  0%, 100%
    translate: 0 0
  20%
    translate: -6px 3px
  40%
    translate: 5px -4px
  60%
    translate: -4px -2px
  80%
    translate: 3px 2px

@keyframes pv-zoom
  from
    scale: 1
  to
    scale: 1.06
</style>
