<script setup lang="ts">
/**
 * FReward — how this game hands something over (story-spec §8.30).
 *
 * A full-screen presentation with an opt-in REVEAL: a slow burst of rays from
 * the middle of the screen, a warm glow pooled behind whatever is being given,
 * drifting sparks and falling confetti. The shell only; what is being given is
 * the caller's slot, so a rune, a keepsake or anything later all arrive the
 * same way.
 *
 * Ported from the same component in `survivalist` (its ray burst is the part
 * worth keeping: one element, one conic gradient, one transform — a single
 * composited layer and nothing per frame), and dressed in this game's paper:
 * cream, plum ink and pastel confetti rather than dark iron.
 *
 * It sits UNDER an ad (`isAdShowing`): several portals inject their ad frame
 * at a lower z-index than a modal, and a blurred overlay painted over a
 * playing ad is a monetization bug, not a visual one.
 *
 * Reduced motion (§3.11) stops the spin, the drift and the confetti; the
 * glow and the layout stay, so nothing moves and nothing is lost.
 */
import { computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { isMobileLandscape, isShortViewport } from '@/use/useUser'
import { isAdShowing } from '@/use/useGamePause'
import { reducedMotion } from '@/use/useAccessibility'

const props = withDefaults(defineProps<{
  /** The burst behind the gift. Off for a plain panel. */
  reveal?: boolean
  /** Show the tap-to-continue hint, and let a tap anywhere close it. */
  showContinue?: boolean
  /** Confetti with the burst — a gift, not a summary. */
  confetti?: boolean
}>(), { reveal: true, showContinue: true, confetti: true })

const emit = defineEmits<{ continue: [] }>()
const { t } = useI18n()

/** Short and wide (a phone on its side, a short portal frame): the ribbon
 *  shrinks and the hint flows under the content instead of floating. */
const compact = computed(() => isMobileLandscape.value || isShortViewport.value)
const isTouch = computed(() =>
  typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0))

/** Sixteen rays: at 24 they read as texture, at 8 as a pinwheel. */
const RAYS = 16
const LIGHT = 'rgba(255, 224, 150, 0.34)'
const DARK = 'rgba(58, 35, 64, 0.30)'
const rayStyle = computed(() => {
  const wedge = 360 / RAYS
  const stops: string[] = []
  for (let i = 0; i < RAYS; i++) {
    stops.push(`${i % 2 === 0 ? LIGHT : DARK} ${(i * wedge).toFixed(3)}deg ${((i + 1) * wedge).toFixed(3)}deg`)
  }
  return { backgroundImage: `conic-gradient(from 0deg at 50% 50%, ${stops.join(', ')})` }
})

/**
 * The paper scraps: fixed, so they never shimmer between frames.
 *
 * The six hues are the design system's decoration ramp, named rather than
 * respelled — `--am-magic-1..6` ARE these values (they were tokenised FROM
 * this array), so the ornament elsewhere and the reward beat are one set and
 * can never drift apart.
 */
const bits = Array.from({ length: 30 }, (_, i) => ({
  left: `${(i * 37) % 100}%`,
  delay: `${((i * 0.31) % 2.8).toFixed(2)}s`,
  spin: `${2.4 + ((i * 7) % 18) / 10}s`,
  hue: [
    'var(--am-magic-1)', 'var(--am-magic-5)', 'var(--am-magic-4)',
    'var(--am-magic-3)', 'var(--am-magic-2)', 'var(--am-magic-6)'
  ][i % 6]
}))

const go = (): void => {
  if (props.showContinue) emit('continue')
}
const onKey = (e: KeyboardEvent): void => {
  if (!props.showContinue) return
  if (e.key !== ' ' && e.key !== 'Enter') return
  e.preventDefault()
  emit('continue')
}
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template lang="pug">
  div.reward(
    :class="{ ad: isAdShowing, compact, still: reducedMotion }"
    @click="go"
    @pointerdown.stop
  )
    div.burst(v-if="reveal" aria-hidden="true")
      div.rays(:style="rayStyle")
      div.glow
      div.sparks
    div.confetti(v-if="confetti && reveal && !reducedMotion" aria-hidden="true")
      i(v-for="(b, k) in bits" :key="k" :style="{ left: b.left, background: b.hue, animationDelay: b.delay, animationDuration: b.spin }")
    div.ribbon(v-if="$slots.ribbon")
      div.ribbon__paper
        slot(name="ribbon")
    div.body
      slot
    div.hint(v-if="showContinue" aria-hidden="true")
      span.story-text {{ isTouch ? t('tapToContinue') : t('clickToContinue') }}
</template>

<style scoped lang="sass">
.reward
  position: fixed
  inset: 0
  z-index: 100
  display: flex
  flex-direction: column
  align-items: center
  justify-content: center
  gap: clamp(10px, 2.4vmin, 22px)
  padding: calc(1rem + env(safe-area-inset-top)) calc(1rem + env(safe-area-inset-right)) calc(1rem + env(safe-area-inset-bottom)) calc(1rem + env(safe-area-inset-left))
  // The one dim value the whole game uses. Plum, never black.
  background: var(--am-scrim)
  // One of the two `backdrop-filter`s in the build, and it stays. Do not add
  // a third — see ui-design-system.md §3.
  backdrop-filter: blur(6px)
  cursor: pointer
  touch-action: none
  -webkit-tap-highlight-color: transparent
  user-select: none
  animation: reward-in 0.22s ease-out both
  &.ad
    z-index: 0
  &.compact
    gap: 8px

.burst, .confetti
  position: absolute
  inset: 0
  overflow: hidden
  pointer-events: none

.rays
  position: absolute
  left: 50%
  top: 50%
  width: 260vmax
  height: 260vmax
  translate: -50% -50%
  border-radius: 50%
  animation: reward-spin 42s linear infinite
  -webkit-mask-image: radial-gradient(circle at 50% 50%, #000 0%, rgba(0, 0, 0, 0.9) 12%, rgba(0, 0, 0, 0.45) 24%, transparent 40%)
  mask-image: radial-gradient(circle at 50% 50%, #000 0%, rgba(0, 0, 0, 0.9) 12%, rgba(0, 0, 0, 0.45) 24%, transparent 40%)

.glow
  position: absolute
  left: 50%
  top: 50%
  width: min(120vmin, 60rem)
  height: min(120vmin, 60rem)
  translate: -50% -50%
  border-radius: 50%
  background: radial-gradient(circle, rgba(255, 236, 180, 0.4) 0%, rgba(255, 200, 120, 0.18) 28%, rgba(255, 180, 90, 0.06) 48%, transparent 66%)
  animation: reward-breathe 3.6s ease-in-out infinite

.sparks
  position: absolute
  inset: -20%
  background-image: radial-gradient(circle, rgba(255, 246, 214, 0.9) 0 1px, transparent 2px), radial-gradient(circle, rgba(255, 214, 120, 0.7) 0 1.5px, transparent 3px)
  background-size: 9rem 9rem, 13rem 13rem
  background-position: 0 0, 4rem 6rem
  opacity: 0.6
  animation: reward-drift 22s linear infinite
  -webkit-mask-image: radial-gradient(circle at 50% 50%, #000 0%, rgba(0, 0, 0, 0.6) 35%, transparent 62%)
  mask-image: radial-gradient(circle at 50% 50%, #000 0%, rgba(0, 0, 0, 0.6) 35%, transparent 62%)

.confetti i
  position: absolute
  top: -24px
  width: 10px
  height: 16px
  border-radius: 3px
  box-shadow: 0 0 0 2px var(--am-ink)
  animation-name: reward-fall
  animation-timing-function: linear
  animation-iteration-count: infinite

// The paper banner the gift is announced on.
.ribbon
  position: relative
  z-index: 2
  animation: reward-pop 0.4s cubic-bezier(0.2, 1.5, 0.4, 1) both
  .compact &
    scale: 0.82

.ribbon__paper
  padding: 8px clamp(18px, 4vmin, 40px)
  background: var(--am-paper)
  border: 4px solid var(--am-ink)
  border-radius: 999px
  // One shadow, plum, never black — the page-lift every plate in the UI wears.
  box-shadow: 0 6px 0 rgba(58, 35, 64, 0.35)
  color: var(--am-ink)
  text-align: center

.body
  position: relative
  z-index: 2
  display: flex
  flex-direction: column
  align-items: center
  gap: clamp(8px, 2vmin, 18px)
  max-width: min(92vw, 640px)
  max-height: 74vh
  overflow: visible

.hint
  position: relative
  z-index: 2
  // Cream over the plum scrim, which is the one surface in the game a caption
  // is allowed to float on unplated — the dim is what makes it legible.
  color: var(--am-on-night)
  opacity: 0.92
  animation: reward-pulse 1.3s ease-in-out infinite
  .story-text
    font-size: clamp(13px, 2vmin + 4px, 20px)

.still
  .rays, .sparks, .glow, .hint
    animation: none

@keyframes reward-in
  from
    opacity: 0

@keyframes reward-spin
  from
    rotate: 0deg
  to
    rotate: 360deg

@keyframes reward-breathe
  0%, 100%
    scale: 1
    opacity: 0.9
  50%
    scale: 1.06
    opacity: 1

@keyframes reward-drift
  from
    transform: translate3d(0, 0, 0)
  to
    transform: translate3d(-9rem, -13rem, 0)

@keyframes reward-fall
  from
    transform: translate3d(0, -10vh, 0) rotate(0deg)
  to
    transform: translate3d(0, 110vh, 0) rotate(720deg)

@keyframes reward-pop
  from
    opacity: 0
    transform: scale(0.6)
  to
    opacity: 1
    transform: none

@keyframes reward-pulse
  0%, 100%
    opacity: 0.55
  50%
    opacity: 1
</style>
