<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { previewHud } from '@/game/preview/previewHud'
import { useArtImage } from '@/use/useArtImage'
import { vFit } from '@/use/vFit'
import { PREVIEW_DOM as D } from '@/game/preview/preview'
import { MARK_IDS, drawnEmblemUrl, emblemBox, starUrl } from '@/components/preview/vsMarks'
import { unitOf } from '@/components/preview/previewSizes'

/**
 * The VS MEDALLION between the two duelists, and the three COUNTDOWN STARS
 * under it.
 *
 * The medallion is a storybook seal (`vsMarks.emblemParts`): a scalloped gold
 * burst set with pearls, cream-pink enamel, two little unicorn horns crossed
 * behind the letters — Aurora's pink, the night's lilac. It is WORDLESS art;
 * the "VS" is type set over it (`preview.vs`), so every locale gets its own.
 * Drawn as one SVG background until its painting exists (`vs-emblem`), then
 * the painting takes the very same box.
 *
 * It SLAMS down onto the fanfare's main hit: the cue's impact is at 0.90 s,
 * so the 0.18 s fall (2.6× → 1) must LAND there, not start there — it is
 * keyed on `ribbons` (0.50 s) with a 0.22 s offset, and the `vs` beat itself
 * brings the root's micro-shake on the landing. Then it overshoots and
 * settles, breathes through the hold, and the stars under it light one by
 * one on the count (2.8 / 3.5 / 4.2 s) and burst on `go` (4.45 s). The
 * shockwave ring and the glitter are the canvas'.
 *
 * The stars sit in the row the layout reserves under the medallion
 * (`PREVIEW_DOM.starsGap` / `starsH` / `starsW`).
 */
const { t } = useI18n()

const painted = useArtImage('worldUi', () => MARK_IDS.emblem)
const px = (v: number): string => `${v.toFixed(1)}px`

const style = computed(() => {
  const b = emblemBox()
  const { x, y, r } = previewHud.lay.vs
  const u = unitOf(previewHud.lay)
  return {
    left: px(x + b.x * r),
    top: px(y + b.y * r),
    width: px(b.w * r),
    height: px(b.h * r),
    // The medallion's centre inside its box, and its radius.
    '--cx': `${((-b.x / b.w) * 100).toFixed(3)}%`,
    '--cy': `${((-b.y / b.h) * 100).toFixed(3)}%`,
    '--r': px(r),
    backgroundImage: painted.value ? `url("${painted.value}")` : (drawnEmblemUrl() ?? 'none'),
    // The star row: its centre below the medallion's, each star's size, and
    // the step between two of them.
    '--sy': px(r + (D.starsGap + D.starsH / 2) * u),
    '--ss': px(D.starsH * u),
    '--sd': px(((D.starsW - D.starsH) / 2) * u),
    '--star-on': starUrl(true) ?? 'none',
    '--star-off': starUrl(false) ?? 'none'
  }
})
</script>

<template lang="pug">
  div.vs(:style="style" aria-hidden="true")
    span.vs-text.ink-text(v-fit) {{ t('preview.vs') }}
    span.vs-star.s1
    span.vs-star.s2
    span.vs-star.s3
</template>

<style scoped lang="sass">
.vs
  position: absolute
  background-size: 100% 100%
  background-repeat: no-repeat
  transform-origin: var(--cx) var(--cy)
  pointer-events: none
  opacity: 0

.vs-text
  position: absolute
  left: var(--cx)
  top: var(--cy)
  translate: -50% -50%
  max-width: calc(var(--r) * 1.42)
  overflow: hidden
  box-sizing: border-box
  padding: 0.14em 0.16em
  font-size: calc(var(--r) * 0.66)
  line-height: 1
  color: var(--am-vs-letter)
  -webkit-text-stroke-width: 0.24em
  // The chunky step under the letters, in the same plum.
  text-shadow: 0 0.08em 0 var(--am-ink)

// ── the countdown stars, a row under the medallion ──
.vs-star
  position: absolute
  top: calc(var(--cy) + var(--sy))
  width: var(--ss)
  height: var(--ss)
  translate: -50% -50%
  background: var(--star-off) center / contain no-repeat
  opacity: 0
  &.s1
    left: calc(var(--cx) - var(--sd))
    --d-in: 0s
    --d-go: 0s
  &.s2
    left: var(--cx)
    --d-in: 0.06s
    --d-go: 0.04s
  &.s3
    left: calc(var(--cx) + var(--sd))
    --d-in: 0.12s
    --d-go: 0.08s
// The lit star, laid over the pale one and faded up when its beat comes.
.vs-star::after
  content: ''
  position: absolute
  inset: 0
  background: var(--star-on) center / contain no-repeat
  opacity: 0

// ── the timeline ──
// Falls from 0.72 s and lands on the fanfare's hit at 0.90 s (see above).
.r-ribbons .vs
  animation: vs-slam 0.36s 0.22s both
.r-hold
  .vs-text
    animation: vs-breathe 1.4s ease-in-out infinite
  .vs-star
    animation: star-in 0.3s ease-out var(--d-in) both
.r-count1 .s1, .r-count2 .s2, .r-count3 .s3
  animation: star-in 0.3s ease-out var(--d-in) both, star-lit 0.4s var(--am-ease-pop) both
  &::after
    animation: star-glow 0.18s ease-out both
.r-go
  .vs-text
    animation: vs-go 0.42s var(--am-ease-pop) both
  .vs-star
    animation: star-in 0.3s ease-out var(--d-in) both, star-lit 0.4s var(--am-ease-pop) both, star-burst 0.42s ease-out var(--d-go) both

// ── reduced motion: the medallion fades in, the stars light and go out ──
.still
  &.r-ribbons .vs
    animation-name: vs-fade
    animation-timing-function: ease-out
  &.r-hold .vs-text, &.r-go .vs-text
    animation: none
  &.r-count1 .s1, &.r-count2 .s2, &.r-count3 .s3
    animation: star-in 0.3s ease-out var(--d-in) both
  &.r-go .vs-star
    animation: star-in 0.3s ease-out var(--d-in) both, star-out 0.3s ease-out var(--d-go) both
@media (prefers-reduced-motion: reduce)
  .r-ribbons .vs
    animation-name: vs-fade
    animation-timing-function: ease-out
  .r-hold .vs-text, .r-go .vs-text
    animation: none
  .r-count1 .s1, .r-count2 .s2, .r-count3 .s3
    animation: star-in 0.3s ease-out var(--d-in) both
  .r-go .vs-star
    animation: star-in 0.3s ease-out var(--d-in) both, star-out 0.3s ease-out var(--d-go) both

// 2.6x to 1 in the first 0.18 s — falling, so it accelerates — then a
// squash, an overshoot and rest.
@keyframes vs-slam
  0%
    opacity: 0
    transform: scale(2.6)
    animation-timing-function: cubic-bezier(0.55, 0, 1, 0.45)
  22%
    opacity: 1
  50%
    transform: scale(1)
    animation-timing-function: ease-out
  68%
    transform: scale(0.9)
  84%
    transform: scale(1.05)
  100%
    opacity: 1
    transform: none

@keyframes vs-fade
  from
    opacity: 0
  to
    opacity: 1

@keyframes vs-breathe
  0%, 100%
    scale: 1
  50%
    scale: 1.05

@keyframes vs-go
  0%
    scale: 1
  45%
    scale: 1.24
  100%
    scale: 1.08

@keyframes star-in
  from
    opacity: 0
    scale: 0.5
  to
    opacity: 1
    scale: 1

@keyframes star-lit
  0%
    scale: 1
  40%
    scale: 1.5
  100%
    scale: 1.12

@keyframes star-glow
  from
    opacity: 0
  to
    opacity: 1

@keyframes star-burst
  0%
    opacity: 1
    scale: 1.12
  35%
    opacity: 1
    scale: 1.7
  100%
    opacity: 0
    scale: 2.3

@keyframes star-out
  from
    opacity: 1
  to
    opacity: 0
</style>
