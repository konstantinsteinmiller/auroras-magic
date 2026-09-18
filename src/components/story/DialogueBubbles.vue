<script setup lang="ts">
/**
 * DialogueBubbles — the story's speech bubbles (story-spec §10.6, C12, §3.5.3).
 *
 * One bubble at a time: the speaker's portrait on their fixed side (Aurora
 * on the left, everyone else on the right — never mirrored, even in RTL),
 * 1–2 pictograms that carry the beat without reading, and the optional line
 * of text as a reading bonus. Tap anywhere to advance, after a 600 ms minimum
 * dwell; the dwell clock pauses with the game (an ad or a hidden tab never
 * eats it). A bubble babbles as it appears (§10.11).
 *
 * `skippable` shows the skip icon: the second time a player meets these
 * lines, never the first (C12).
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { firstLoadAdSettled } from '@/use/useFirstLoadInterstitial'
import { useI18n } from 'vue-i18n'
import type { Bubble } from '@/game/story/story'
import { portraitUrl } from '@/game/story/portrait'
import { chatter, sfx } from '@/game/duel/audio'
import { isGamePaused } from '@/use/useGamePause'
import Picto from '@/components/story/Picto.vue'
import GameIcon from '@/components/icons/GameIcon.vue'

const props = defineProps<{ lines: readonly Bubble[]; node: number; skippable?: boolean }>()
const emit = defineEmits<{ done: [] }>()
const { t } = useI18n()

/** C12's minimum dwell per bubble, ms. */
const DWELL_MS = 600

const i = ref(0)
const dwell = ref(0)
const line = computed(() => props.lines[i.value])
const left = computed(() => line.value?.speaker === 'aurora')
const text = computed(() => (line.value ? t(line.value.key, { name: line.value.name ?? '' }) : ''))
const portrait = computed(() => (line.value ? portraitUrl(line.value.speaker, line.value.emote, line.value.name) : ''))
const ready = computed(() => dwell.value >= DWELL_MS)

let timer = 0
let last = 0
const tick = (): void => {
  const now = performance.now()
  if (!isGamePaused.value) dwell.value += now - last
  last = now
}

const show = (): void => {
  dwell.value = 0
  last = performance.now()
  const l = line.value
  if (l) chatter(l.speaker, l.beats, l.tone)
}

/** `done` goes out once: a tap during the page-dip that follows must not
 *  start the duel a second time. */
let finished = false
const finish = (): void => {
  if (finished) return
  finished = true
  emit('done')
}

const advance = (): void => {
  if (finished || !ready.value || isGamePaused.value) return
  if (i.value >= props.lines.length - 1) {
    finish()
    return
  }
  sfx('ui')
  i.value++
}

const skip = (): void => {
  if (finished) return
  sfx('ui')
  finish()
}

const onKey = (e: KeyboardEvent): void => {
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault()
    advance()
  }
}

watch(i, show)
/** The first bubble waits for a portal's mandatory first-load ad to settle
 *  (§11.7, C30); on every other build this is the next microtask. */
const open = ref(false)
let alive = true
onMounted(() => {
  window.addEventListener('keydown', onKey)
  void firstLoadAdSettled().then(() => {
    if (!alive) return
    open.value = true
    show()
    timer = window.setInterval(tick, 50)
  })
})
onUnmounted(() => {
  alive = false
  window.clearInterval(timer)
  window.removeEventListener('keydown', onKey)
})
</script>

<template lang="pug">
  div.dialogue(@click="advance")
    div.dim
    transition(name="bubble" mode="out-in")
      div.beat(v-if="line && open" :key="i" :class="left ? 'from-left' : 'from-right'")
        img.portrait(:src="portrait" alt="" draggable="false")
        div.bubble(role="status" aria-live="polite")
          div.pictos
            Picto.picto(v-for="p in line.pictos" :key="p" :name="p")
          p.story-text(v-if="text") {{ text }}
          span.next(v-if="ready" aria-hidden="true") ▾
    button.skip(
      v-if="skippable"
      :aria-label="t('ui.next')"
      @click.stop="skip"
    )
      GameIcon.glyph(name="skip-forward")
</template>

<style scoped lang="sass">
.dialogue
  position: absolute
  inset: 0
  pointer-events: auto
  cursor: pointer
  -webkit-tap-highlight-color: transparent
  user-select: none
  -webkit-user-select: none

.dim
  position: absolute
  inset: 0
  background: linear-gradient(to top, rgba(26, 16, 44, 0.72), rgba(26, 16, 44, 0.08) 70%)

// One beat: a portrait and its bubble, anchored low, on the speaker's side.
.beat
  position: absolute
  left: calc(env(safe-area-inset-left) + 3vw)
  right: calc(env(safe-area-inset-right) + 3vw)
  bottom: calc(env(safe-area-inset-bottom) + 5vh)
  display: flex
  align-items: flex-end
  gap: 14px
  &.from-right
    flex-direction: row-reverse

.portrait
  flex: 0 0 auto
  width: clamp(84px, 16vmin, 150px)
  height: clamp(84px, 16vmin, 150px)
  -webkit-user-drag: none
  pointer-events: none
  filter: drop-shadow(0 6px 0 rgba(20, 10, 30, 0.35))

.bubble
  position: relative
  max-width: 45vw
  min-width: 180px
  padding: 14px 20px 18px
  background: #fff9ef
  color: #3A2340
  border: 4px solid #3A2340
  border-radius: 26px
  box-shadow: 0 6px 0 rgba(20, 10, 30, 0.35)
  display: flex
  flex-direction: column
  gap: 8px

.pictos
  display: flex
  gap: 10px
  .picto
    width: clamp(40px, 7vmin, 60px)
    height: clamp(40px, 7vmin, 60px)

.story-text
  margin: 0
  font-size: clamp(17px, 2.6vmin + 6px, 26px)

.next
  position: absolute
  right: 14px
  bottom: 4px
  font-size: 20px
  color: #b58cff
  animation: next-bob 0.9s ease-in-out infinite

.skip
  position: absolute
  right: calc(env(safe-area-inset-right) + 12px)
  top: calc(env(safe-area-inset-top) + 12px)
  width: 56px
  height: 56px
  border-radius: 16px
  border: none
  display: flex
  align-items: center
  justify-content: center
  color: #fff
  background: var(--duel-plate)
  cursor: pointer
  .glyph
    width: 30px
    height: 30px
  &:focus-visible
    outline: 3px solid var(--duel-gold)
    outline-offset: 3px

// Portrait orientation: the portraits shrink, the bubble takes the width.
@media (orientation: portrait)
  .bubble
    max-width: 86vw
    min-width: 0
    flex: 1 1 auto
  .portrait
    width: 72px
    height: 72px

.bubble-enter-active, .bubble-leave-active
  transition: opacity 0.18s ease, transform 0.22s cubic-bezier(0.2, 1.4, 0.4, 1)
.bubble-enter-from
  opacity: 0
  transform: translateY(16px) scale(0.94)
.bubble-leave-to
  opacity: 0
  transform: translateY(-8px)

@keyframes next-bob
  0%, 100%
    transform: translateY(0)
  50%
    transform: translateY(3px)
</style>
