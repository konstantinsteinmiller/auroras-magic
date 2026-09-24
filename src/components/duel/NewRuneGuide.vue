<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RUNE_IDS } from '@/game/duel/config'
import { hud, hudLayout } from '@/use/useDuelHud'
import { reducedMotion } from '@/use/useAccessibility'
import RuneGlyph from '@/components/duel/RuneGlyph.vue'

/**
 * The new-rune guide's card (`game/duel/lesson.ts`, "the new-rune guide"):
 * a rune a chest gave her that her hand has never drawn — its painted icon on
 * a paper coin and "New rune: ICE!" — over the top of the pad, while the
 * canvas traces its glyph faintly on the pad itself (`render.drawNewRuneGuide`,
 * under her strokes). The moment she draws it the card turns into "Great!"
 * (mint, a pop) for `lesson.GREAT_S`, and goes.
 *
 * IT HOLDS NOTHING: display-only (the HUD takes no pointer events), a stroke
 * may start right on top of it, and the duel runs underneath exactly as it
 * always does. It stands where the idle "DRAW A RUNE" stands and replaces it
 * (the same invitation, with the shape named).
 *
 * Landscape renders inside the scaled stage layer at stage units; portrait
 * sits at the top of the pad in CSS px, where the idle prompt does. The text
 * is gold on the soft plum cloud the idle prompt wears (measured ≥ 4.5:1 on
 * every backdrop the duel has); "Great!" is the glimpse's mint "yes".
 */
const props = defineProps<{ portrait: boolean }>()
const { t, locale } = useI18n()

const great = computed(() => hud.runeGreat > 0)
const rune = computed(() => (great.value ? hud.runeGreatRune : hud.runeGuide))
const name = computed(() => t(`rune.${RUNE_IDS[rune.value] ?? 'ice'}`).toLocaleUpperCase(locale.value))
const line = computed(() => (great.value ? t('duel.great') : t('duel.newRuneGuide', { rune: name.value })))

const style = computed(() => {
  if (!props.portrait) return { left: '640px', top: '140px', '--k': '1', '--w': '520px' }
  const z = hudLayout.value.zonePx
  const k = Math.max(0.62, Math.min(1, z.w / 480))
  return {
    left: `${z.x + z.w / 2}px`,
    top: `${z.y + Math.min(34, z.h * 0.14)}px`,
    '--k': String(k),
    '--w': `${Math.round(z.w - 24)}px`
  }
})
</script>

<template lang="pug">
  div.new-rune(:key="great ? 'g' + hud.runeGreat : 'n'" :class="{ great, still: reducedMotion }" :style="style" role="status")
    div.nr-icon
      RuneGlyph(:rune="rune")
    span.nr-line.ink-text {{ line }}
</template>

<style scoped lang="sass">
.new-rune
  position: absolute
  display: flex
  align-items: center
  gap: calc(10px * var(--k))
  max-width: var(--w)
  transform: translate(-50%, -50%)
  pointer-events: none
  animation: nr-in var(--am-dur-enter) var(--am-ease-out) both
  // The idle prompt's plum cloud: the gold reads on a bright sky and on the
  // portrait pad's mid-grey alike.
  &::before
    content: ''
    position: absolute
    inset: -0.35em -0.9em
    z-index: -1
    border-radius: 999px
    background: var(--am-scrim)
    filter: blur(7px)

// The rune on a paper coin, ringed in the chrome's plum — the glimpse's and
// the spellbook's "look here" coin, smaller.
.nr-icon
  flex: 0 0 auto
  box-sizing: border-box
  width: calc(52px * var(--k))
  height: calc(52px * var(--k))
  padding: calc(5px * var(--k))
  border-radius: 50%
  background: var(--am-paper)
  box-shadow: 0 0 0 calc(3px * var(--k)) var(--am-ink), 0 0 calc(12px * var(--k)) calc(3px * var(--k)) var(--am-gold)
  animation: nr-breathe 1.4s ease-in-out infinite alternate

.nr-line
  min-width: 0
  font-size: calc(28px * var(--k))
  color: var(--am-gold)
  white-space: nowrap
  overflow: hidden
  text-overflow: ellipsis
  padding: 0.12em 0.1em

// "Great!": mint, and a pop — the reward itself, so it keeps its pop even
// when less motion is asked for.
.great
  animation: nr-great 0.5s var(--am-ease-pop) both
  .nr-line
    color: var(--am-mint)
  .nr-icon
    box-shadow: 0 0 0 calc(3px * var(--k)) var(--am-ink), 0 0 calc(16px * var(--k)) calc(6px * var(--k)) var(--am-mint)
    animation: none

.still .nr-icon
  animation: none

@keyframes nr-in
  from
    opacity: 0
  to
    opacity: 1

@keyframes nr-breathe
  from
    transform: scale(0.96)
  to
    transform: scale(1.06)

@keyframes nr-great
  0%
    transform: translate(-50%, -50%) scale(0.8)
  60%
    transform: translate(-50%, -50%) scale(1.14)
  100%
    transform: translate(-50%, -50%) scale(1)
</style>
