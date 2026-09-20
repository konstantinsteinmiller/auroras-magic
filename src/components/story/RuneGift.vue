<script setup lang="ts">
/**
 * RuneGift — a chest has given a new rune (story-spec §8.30).
 *
 * The ceremony: the reveal burst, confetti, a fanfare, and the rune itself
 * popped up on its plate with its name. Then the part that matters — HOW TO
 * DRAW IT: the glyph traces itself, big, in the order a finger would draw it,
 * over and over until the child taps on. Tapping the glyph replays the trace.
 *
 * The rune is already saved (`onUnboxComplete`); this only presents it, so
 * nothing is lost if the tab closes mid-burst.
 *
 * It holds the game paused while it is up (`acquireModalOpen`), like every
 * other modal, so the wipe waiting underneath it does not run on without the
 * player.
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RUNE_SLUGS } from '@/game/artIds'
import { sfx } from '@/game/duel/audio'
import { haptic } from '@/use/useHaptics'
import { acquireModalOpen } from '@/use/useModalState'
import { reducedMotion } from '@/use/useAccessibility'
import FReward from '@/components/atoms/FReward.vue'
import RuneGlyph from '@/components/duel/RuneGlyph.vue'
import RuneTrace from '@/components/duel/RuneTrace.vue'

const props = defineProps<{ rune: number }>()
const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()

const name = computed(() => t(`rune.${RUNE_SLUGS[props.rune] ?? 'fire'}`))
/** Bumped to replay the trace; it also runs on its own, on a slow loop. */
const play = ref(1)
let loop = 0

/** The gift is only "takeable" once the trace has been through once, so the
 *  fanfare is not cut off by a child already tapping. */
const ready = ref(false)

const replay = (): void => {
  play.value++
  sfx('draw', 0.6)
}

onMounted(() => {
  release = acquireModalOpen()
  sfx('fanfare')
  haptic('reward')
  window.setTimeout(() => { ready.value = true }, 900)
  if (!reducedMotion.value) {
    loop = window.setInterval(() => { play.value++ }, 2600)
  }
})
let release: (() => void) | null = null
onUnmounted(() => {
  window.clearInterval(loop)
  release?.()
})

const take = (): void => {
  if (!ready.value) return
  sfx('ui')
  emit('close')
}
</script>

<template lang="pug">
  FReward(:show-continue="ready" @continue="take")
    template(#ribbon)
      span.ink-text.ribbon-text {{ t('rune.newRune') }}
    //- The rune itself — and, on the same plate, the stroke drawing itself in
    //- the order a finger makes it. One thing to look at: what it is, and how
    //- it is made. A tap replays the stroke.
    div.prize(@click.stop="replay")
      div.plate
        RuneGlyph.ghost(:rune="rune" :alpha="0.16")
        RuneTrace.tracer(:rune="rune" :size="260" :play="play")
      p.name.ink-text {{ name }}
      p.learn__label.story-text {{ t('rune.howToDraw') }}
</template>

<style scoped lang="sass">
.ribbon-text
  font-size: clamp(18px, 3.4vmin + 6px, 34px)
  color: #fff4e6
  --ink: #3A2340

.prize
  display: flex
  flex-direction: column
  align-items: center
  gap: 8px
  cursor: pointer
  animation: prize-in 0.5s cubic-bezier(0.2, 1.5, 0.4, 1) 0.1s both

.plate
  position: relative
  display: grid
  place-items: center
  width: clamp(168px, 34vmin, 280px)
  height: clamp(168px, 34vmin, 280px)
  padding: clamp(10px, 2vmin, 20px)
  background: #fff8ec
  border: 5px solid #3A2340
  border-radius: 28px
  box-shadow: 0 8px 0 rgba(20, 10, 30, 0.35)
  // The finished shape, faint, is the target the stroke is drawn onto.
  .ghost
    position: absolute
    inset: clamp(10px, 2vmin, 20px)
    width: auto
    height: auto

.name
  margin: 0
  color: #fff4e6
  --ink: #3A2340
  font-size: clamp(20px, 3.6vmin + 6px, 40px)

// The caption under the plate: what the stroke above it is doing, and that a
// tap will do it again.
.learn__label
  margin: 0
  padding: 4px 16px
  background: rgba(255, 244, 230, 0.92)
  border: 3px solid #3A2340
  border-radius: 999px
  color: #3A2340
  font-size: clamp(13px, 2vmin + 4px, 21px)

.tracer
  position: relative
  width: 100%
  height: 100%

@media (orientation: landscape) and (max-height: 520px)
  .plate
    width: 138px
    height: 138px

@keyframes prize-in
  from
    opacity: 0
    transform: scale(0.55) rotate(-6deg)
  to
    opacity: 1
    transform: none

@media (prefers-reduced-motion: reduce)
  .prize, .learn
    animation: none
</style>
