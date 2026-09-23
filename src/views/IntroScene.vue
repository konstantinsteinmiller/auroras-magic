<script setup lang="ts">
/**
 * IntroScene — the DOM chrome over the first-launch intro (story-spec
 * §8.26). The picture book itself is drawn on the one canvas by
 * `game/story/intro.ts`; this adds only what the canvas cannot do well:
 *
 *   • the game's name over the first page — the one word of the intro;
 *   • a Skip icon, top-right where the dialogue keeps its own (from the
 *     first frame: a returning player on a new device must never be held);
 *   • the last page's big Play button.
 *
 * Every control's name is an aria-label; nothing else is text.
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import GameIcon from '@/components/icons/GameIcon.vue'
import { introHud } from '@/use/useIntroHud'
import { skipIntro, playFromIntro } from '@/game/story/intro'
import { sfx } from '@/game/duel/audio'

const { t } = useI18n()

/** The name sits over the sky, near the top of the page. */
const titleStyle = computed(() => {
  const b = introHud.box
  return {
    left: `${b.x}px`,
    top: `${b.y + b.h * (introHud.portrait ? 0.08 : 0.12)}px`,
    width: `${b.w}px`,
    fontSize: `${Math.max(30, Math.min(88, b.w * (introHud.portrait ? 0.11 : 0.075)))}px`
  }
})

/** The Play button: over the meadow, or under a tall page (the intro module
 *  decides, so it can keep it clear of the picture). */
const playStyle = computed(() => {
  const p = introHud.playAt
  return {
    left: `${p.x - p.s / 2}px`,
    top: `${p.y - p.s / 2}px`,
    width: `${p.s}px`,
    height: `${p.s}px`
  }
})

const skip = (): void => {
  sfx('ui')
  skipIntro()
}
const play = (): void => {
  sfx('ui')
  playFromIntro()
}
</script>

<template lang="pug">
  div.intro-scene
    transition(name="title")
      h1.intro-title(v-if="introHud.title" :style="titleStyle")
        span.ink-text {{ t('gameName') }}
    button.duel-plate.skip(
      :aria-label="t('ui.skip')"
      @click.stop="skip"
      @pointerdown.stop
    )
      GameIcon.glyph(name="skip-forward")
    transition(name="play")
      button.duel-plate.play(
        v-if="introHud.play"
        :style="playStyle"
        :aria-label="t('ui.play')"
        @click.stop="play"
        @pointerdown.stop
      )
        GameIcon.glyph(name="play")
</template>

<style scoped lang="sass">
.intro-scene
  position: absolute
  inset: 0
  pointer-events: none

.intro-title
  position: absolute
  margin: 0
  text-align: center
  color: var(--am-on-night)
  --ink: var(--am-ink)
  font-size: inherit
  filter: drop-shadow(0 4px 0 rgba(58, 35, 64, 0.35))
  span
    display: inline-block
    color: var(--am-on-night)
    animation: title-bob 2.4s ease-in-out infinite

button
  position: absolute
  pointer-events: auto
  display: flex
  align-items: center
  justify-content: center
  padding: 0
  margin: 0
  color: var(--am-ink)
  cursor: pointer
  -webkit-tap-highlight-color: transparent
  transition: transform 0.08s ease-out
  &:active
    transform: scale(0.95)
  &:focus-visible
    outline: 3px solid var(--am-ink)
    outline-offset: 3px

.skip
  right: calc(env(safe-area-inset-right) + 12px)
  top: calc(env(safe-area-inset-top) + 12px)
  width: 56px
  height: 56px
  border-radius: 16px
  .glyph
    width: 30px
    height: 30px

.play
  border-radius: 50%
  background: linear-gradient(to bottom, var(--am-gold), var(--am-gold-foot))
  box-shadow: 0 0 0 5px var(--am-ink)
  animation: play-pulse 1.1s ease-in-out infinite
  .glyph
    width: 52%
    height: 52%
    margin-left: 6%

@keyframes title-bob
  0%, 100%
    transform: translateY(0)
  50%
    transform: translateY(-6px)

@keyframes play-pulse
  0%, 100%
    transform: scale(1)
    filter: drop-shadow(0 0 0 rgba(255, 215, 106, 0))
  50%
    transform: scale(1.07)
    filter: drop-shadow(0 0 16px rgba(255, 215, 106, 0.95))

.title-enter-active
  transition: opacity 0.5s ease-out, transform 0.5s cubic-bezier(0.2, 1.5, 0.4, 1)
.title-leave-active
  transition: opacity 0.4s ease-in
.title-enter-from
  opacity: 0
  transform: scale(0.7)
.title-leave-to
  opacity: 0

.play-enter-active
  transition: opacity 0.35s ease-out, transform 0.35s cubic-bezier(0.2, 1.5, 0.4, 1)
.play-enter-from
  opacity: 0
  transform: scale(0.4)

@media (prefers-reduced-motion: reduce)
  .intro-title span, .play
    animation: none
</style>
