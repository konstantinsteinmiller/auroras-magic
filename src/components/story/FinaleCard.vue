<script setup lang="ts">
/**
 * FinaleCard — the Friendship Festival's capstone (story-spec §10.19, §8.11).
 * Once, the first time the Festival's own sector is restored: the whole cast
 * together — Aurora, Umbra and all nine Guardians, cheering — under the
 * chapter's title and its one line, "Umbra isn't lonely anymore." No credits
 * scroll (§10.21). A tap anywhere closes it, and Umbra steps out onto the map.
 *
 * The portraits are the dialogue's own (`portraitUrl`), so the card needs no
 * art of its own; the confetti is CSS and rests under reduced motion.
 */
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { portraitUrl } from '@/game/story/portrait'
import { FINALE_CAST } from '@/game/story/story'
import { sfx, chatter } from '@/game/duel/audio'
import { haptic } from '@/use/useHaptics'
import { reducedMotion } from '@/use/useAccessibility'
import GameIcon from '@/components/icons/GameIcon.vue'

const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()

const faces = computed(() => FINALE_CAST.map(([s, e]) => ({ id: s, url: portraitUrl(s, e), star: s === 'aurora' || s === 'umbra' })))
const confetti = Array.from({ length: 28 }, (_, i) => ({
  left: `${(i * 37) % 100}%`,
  delay: `${((i * 0.29) % 2.4).toFixed(2)}s`,
  hue: ['#ff7ab8', '#ffe14d', '#5ce0a8', '#8c8cff', '#ff9f5a', '#c28bff'][i % 6]
}))

onMounted(() => {
  sfx('fanfare')
  haptic('reward')
  window.setTimeout(() => chatter('umbra', 6, 'excite'), 900)
})

const close = (): void => {
  sfx('ui')
  emit('close')
}
</script>

<template lang="pug">
  div.finale(role="dialog" aria-modal="true" :aria-label="t('chapter.c10')" @click.stop="close")
    div.confetti(v-if="!reducedMotion" aria-hidden="true")
      i(v-for="(c, i) in confetti" :key="i" :style="{ left: c.left, animationDelay: c.delay, background: c.hue }")
    div.card
      h2.title.story-text {{ t('chapter.c10') }}
      div.cast(aria-hidden="true")
        img.face(v-for="f in faces" :key="f.id" :src="f.url" :class="{ star: f.star }" alt="" draggable="false")
      p.line.story-text {{ t('finale.line') }}
      button.duel-plate.next(:aria-label="t('ui.next')" @click.stop="close")
        GameIcon.glyph(name="forward")
</template>

<style scoped lang="sass">
.finale
  position: absolute
  inset: 0
  z-index: 30
  display: flex
  align-items: center
  justify-content: center
  padding: max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))
  background: rgba(40, 20, 60, 0.55)
  pointer-events: auto
  overflow: hidden
  animation: finale-in 0.5s ease-out both

.card
  position: relative
  width: min(640px, 100%)
  max-height: 100%
  overflow-y: auto
  box-sizing: border-box
  padding: clamp(14px, 3vh, 28px) clamp(12px, 3vw, 28px)
  border-radius: 28px
  background: linear-gradient(160deg, #ffe0ea 0%, #fff4c8 55%, #d8f6e8 100%)
  box-shadow: 0 0 0 5px #3A2340, 0 10px 0 5px #3A2340
  text-align: center
  animation: card-pop 0.6s cubic-bezier(0.2, 1.4, 0.4, 1) 0.1s both

.title
  margin: 0 0 clamp(8px, 2vh, 16px)
  font-size: clamp(24px, 6vw, 40px)
  color: #3A2340

.cast
  display: flex
  flex-wrap: wrap
  justify-content: center
  gap: clamp(4px, 1.2vw, 10px)
  .face
    width: clamp(46px, 13vw, 76px)
    height: clamp(46px, 13vw, 76px)
    user-select: none
    -webkit-user-drag: none
    animation: face-bob 2.4s ease-in-out infinite
    &:nth-child(2n)
      animation-delay: -1.2s
    &.star
      width: clamp(60px, 17vw, 96px)
      height: clamp(60px, 17vw, 96px)

.line
  margin: clamp(10px, 2.4vh, 18px) 0 clamp(10px, 2vh, 16px)
  font-size: clamp(18px, 4.6vw, 26px)
  color: #3A2340

.next
  width: 64px
  height: 64px
  border-radius: 50%
  display: inline-flex
  align-items: center
  justify-content: center
  cursor: pointer
  .glyph
    width: 34px
    height: 34px

.confetti
  position: absolute
  inset: 0
  pointer-events: none
  i
    position: absolute
    top: -20px
    width: 10px
    height: 16px
    border-radius: 3px
    box-shadow: 0 0 0 2px #3A2340
    animation: confetti-fall 3.2s linear infinite

@keyframes finale-in
  from
    opacity: 0

@keyframes card-pop
  from
    opacity: 0
    transform: scale(0.7)
  to
    opacity: 1
    transform: none

@keyframes face-bob
  0%, 100%
    transform: translateY(0)
  50%
    transform: translateY(-5px)

@keyframes confetti-fall
  from
    transform: translateY(0) rotate(0deg)
  to
    transform: translateY(110vh) rotate(540deg)

@media (prefers-reduced-motion: reduce)
  .card, .cast .face
    animation: none
</style>
