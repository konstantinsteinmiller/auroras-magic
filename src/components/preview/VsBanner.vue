<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { previewHud } from '@/game/preview/previewHud'
import { vFit } from '@/use/vFit'
import { SPAN_Y, TAIL, drawnRibbonUrl, ribbonBandStyle } from '@/components/preview/ribbonFrame'
import { pipUrl, type PipKind } from '@/components/preview/vsMarks'
import { bannerHeight } from '@/components/preview/previewSizes'

/**
 * The CHAPTER BANNER at the top of the VS preview: where this duel happens,
 * on a small paper ribbon, with five pips hanging under it between the tails
 * for the chapter's five duels — gold dots behind her, a gold star for this
 * one, pale dots ahead, and a crown for the chapter's Guardian at the end.
 * Local versus says "Play together" and has no pips.
 *
 * The same ribbon as the names (`ribbonFrame.ts`, the `banner` paper), a
 * size smaller: it is a caption for the duel, not the headline. The pips hang
 * UNDER the band rather than sit on it because the band's width is the scarce
 * thing — in landscape the banner squeezes between the two ribbons, and five
 * pips beside "Whispering Woods" left the name no room. Under it they reach
 * a little past the reservation's foot, into the gap the layout keeps before
 * anything else begins (`PREVIEW_DOM.gap` + `crownPoke`). Drawn only: paper
 * and gold, which the page tokens already paint.
 *
 * Arrives first, dropping in from the top as the halves sweep together.
 */
const { t } = useI18n()

const Hb = computed(() => bannerHeight(previewHud.lay))
const box = computed(() => previewHud.lay.banner)
const px = (v: number): string => `${v.toFixed(1)}px`

const versus = computed(() => previewHud.mode === 'versus')
const text = computed(() => (versus.value ? t('versus.play') : t(`chapter.c${previewHud.chapter + 1}`)))

const wrapStyle = computed(() => ({
  left: px(box.value.x),
  // The band's middle: the top of the reserved box, plus half a band.
  top: px(box.value.y - (Hb.value * SPAN_Y) / 2 + Hb.value / 2),
  '--Hb': px(Hb.value)
}))
const bandStyle = computed(() => ({
  ...ribbonBandStyle('banner', Hb.value, drawnRibbonUrl('banner') ?? 'none'),
  maxWidth: px(Math.max(Hb.value * 3, box.value.w - Hb.value * 2 * TAIL))
}))

const pips = computed(() => Array.from({ length: 5 }, (_, i) => {
  const kind: PipKind = i < previewHud.pos ? 'done' : i === previewHud.pos ? 'now' : 'next'
  return { i, kind, boss: i === 4, src: pipUrl(kind, i === 4) ?? 'none' }
}))
</script>

<template lang="pug">
  div.bn(:style="wrapStyle")
    div.bn-band(:style="bandStyle")
      span.bn-text(v-fit) {{ text }}
    div.bn-pips(v-if="!versus" aria-hidden="true")
      span.bn-pip(v-for="p in pips" :key="p.i" :class="[p.kind, { boss: p.boss }]" :style="{ backgroundImage: p.src }")
</template>

<style scoped lang="sass">
// Every length is in banner bands: `--Hb` CSS px.
.bn
  position: absolute
  translate: -50% -50%
  height: var(--Hb)
  display: flex
  pointer-events: none
  opacity: 0

.bn-band
  position: relative
  box-sizing: border-box
  height: var(--Hb)
  min-width: calc(var(--Hb) * 3)
  display: flex
  align-items: center
  justify-content: center
  border: 0 solid transparent
  overflow: hidden

// The running stitch, as on the name ribbons — tan thread on paper.
.bn-band::before
  content: ''
  position: absolute
  left: calc(var(--Hb) * 0.1)
  right: calc(var(--Hb) * 0.1)
  top: calc(var(--Hb) * 0.19)
  bottom: calc(var(--Hb) * 0.19)
  border-top: max(1px, calc(var(--Hb) * 0.035)) dashed var(--am-paper-edge)
  border-bottom: max(1px, calc(var(--Hb) * 0.035)) dashed var(--am-paper-edge)
  pointer-events: none

.bn-text
  position: relative
  display: block
  flex: 0 1 auto
  min-width: 0
  overflow: hidden
  white-space: nowrap
  padding: 0 0.1em
  font-family: var(--am-display)
  font-weight: var(--am-w-shout-face)
  font-size: calc(var(--Hb) * 0.5)
  // Thai and Devanagari sit well outside a 1.0 line box.
  line-height: 1.3
  letter-spacing: 0
  // Plum on paper: 13.06:1, no shadow (ui-design-system.md §4.3).
  color: var(--am-ink)
:lang(ar) .bn-text
  unicode-bidi: plaintext

// The pips hang just under the band, between the tails.
.bn-pips
  position: absolute
  z-index: -1
  left: 50%
  top: calc(100% - var(--Hb) * 0.02)
  translate: -50% 0
  display: flex
  align-items: center
  gap: calc(var(--Hb) * 0.12)

.bn-pip
  display: block
  flex: none
  width: calc(var(--Hb) * 0.36)
  height: calc(var(--Hb) * 0.36)
  background-repeat: no-repeat
  background-position: center
  background-size: contain
  &.now, &.boss
    width: calc(var(--Hb) * 0.5)
    height: calc(var(--Hb) * 0.5)

// ── the timeline ──
// Drops in from the top edge as the two halves sweep together.
.r-enter .bn
  animation: bn-drop 0.5s var(--am-ease-pop) 0.2s both
// This duel's pip twinkles gently through the hold.
.r-hold .bn-pip.now
  animation: bn-twinkle 1.3s ease-in-out infinite

.still
  &.r-enter .bn
    animation-name: bn-fade
  &.r-hold .bn-pip.now
    animation: none
@media (prefers-reduced-motion: reduce)
  .r-enter .bn
    animation-name: bn-fade
  .r-hold .bn-pip.now
    animation: none

@keyframes bn-drop
  0%
    opacity: 0
    transform: translateY(calc(var(--Hb) * -2))
  60%
    opacity: 1
    transform: translateY(calc(var(--Hb) * 0.12))
  100%
    opacity: 1
    transform: none

@keyframes bn-fade
  from
    opacity: 0
  to
    opacity: 1

@keyframes bn-twinkle
  0%, 100%
    transform: scale(1) rotate(0deg)
  50%
    transform: scale(1.18) rotate(12deg)
</style>
