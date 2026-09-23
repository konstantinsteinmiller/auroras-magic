<script setup lang="ts">
/**
 * VersusSetup — the `versusSetup` scene (story-spec §3.12, §4.1.3, C18):
 * before a local 2P match, each player taps READY on their own half of the
 * screen; with both ready, a 3-2-1 and the duel begins. The arena waits
 * behind, both duelists idling — Aurora on the left for player 1, Umbra, a
 * friend now, on the right for player 2.
 *
 * Too narrow or upright (< 900 CSS px): the "turn sideways" prompt, never a
 * squeezed half-UI and never pass-and-play (C18).
 */
import { onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { versusHud } from '@/use/useVersus'
import { startVersus, leaveVersus } from '@/game/flow/duelFlow'
import { sfx } from '@/game/duel/audio'
import { haptic } from '@/use/useHaptics'
import GameIcon from '@/components/icons/GameIcon.vue'
import TurnSideways from '@/components/story/TurnSideways.vue'

const { t } = useI18n()

/** Player 1 on the left, player 2 on the right. */
const SIDES = [0, 1] as const
const count = ref(0)
let timer = 0

const toggle = (i: 0 | 1): void => {
  if (count.value) return
  const r = [...versusHud.ready] as [boolean, boolean]
  r[i] = !r[i]
  versusHud.ready = r
  sfx(r[i] ? 'snap' : 'ui', r[i] ? (i ? 4 : 2) : undefined)
  haptic('tick')
}

// Both ready: a 3-2-1 — numbers, not words — then the match.
watch(() => versusHud.ready[0] && versusHud.ready[1] && versusHud.wide, (go) => {
  window.clearInterval(timer)
  if (!go) {
    count.value = 0
    return
  }
  count.value = 3
  sfx('ready')
  timer = window.setInterval(() => {
    count.value--
    if (count.value > 0) sfx('ready')
    else {
      window.clearInterval(timer)
      startVersus()
    }
  }, 700)
})
onBeforeUnmount(() => window.clearInterval(timer))

const back = (): void => {
  sfx('ui')
  leaveVersus()
}
</script>

<template lang="pug">
  div.versus-setup
    button.duel-plate.back-btn(:aria-label="t('a11y.backToMap')" @click.stop="back")
      GameIcon.glyph(name="back")
    div.center(v-if="!versusHud.wide")
      TurnSideways
    template(v-else)
      div.half(v-for="i in SIDES" :key="i" :class="i ? 'right' : 'left'")
        p.who.story-text {{ t(i ? 'versus.player2' : 'versus.player1') }}
        p.name.ink-text {{ t(i ? 'duelist.umbra' : 'duelist.aurora') }}
        button.duel-plate.ready(
          :class="{ on: versusHud.ready[i] }"
          :aria-pressed="versusHud.ready[i]"
          :aria-label="t(i ? 'versus.player2' : 'versus.player1') + ': ' + t('versus.ready')"
          @click.stop="toggle(i)"
        )
          GameIcon.glyph(:name="versusHud.ready[i] ? 'check' : 'play'")
          span.story-text {{ t('versus.ready') }}
      div.count.ink-text(v-if="count" :key="count" aria-live="assertive") {{ count }}
</template>

<style scoped lang="sass">
.versus-setup
  position: absolute
  inset: 0
  pointer-events: none
  background: var(--am-scrim-soft)

button
  pointer-events: auto
  cursor: pointer
  // No `border: none`: both buttons here are `.duel-plate`, and the plum line
  // is what makes a cream chip and a lilac button read as controls.
  -webkit-tap-highlight-color: transparent
  transition: transform 0.08s ease-out
  &:active
    transform: scale(0.95)
  &:focus-visible
    outline: 3px solid var(--am-ink)
    outline-offset: 3px

.back-btn
  position: absolute
  left: calc(env(safe-area-inset-left) + 12px)
  top: calc(env(safe-area-inset-top) + 12px)
  width: 56px
  height: 56px
  border-radius: 16px
  display: flex
  align-items: center
  justify-content: center
  .glyph
    width: 30px
    height: 30px

.center
  position: absolute
  inset: 0
  display: flex
  align-items: center
  justify-content: center
  pointer-events: auto

.half
  position: absolute
  top: 0
  bottom: 0
  width: 50%
  display: flex
  flex-direction: column
  align-items: center
  justify-content: flex-end
  padding-bottom: max(28px, env(safe-area-inset-bottom))
  gap: 6px
  &.left
    left: 0
  &.right
    right: 0

.who
  margin: 0
  color: var(--am-on-night)
  font-size: clamp(18px, 2.4vw, 26px)
  text-shadow: 0 2px 0 var(--am-ink)

.name
  margin: 0 0 8px
  font-size: clamp(20px, 2.8vw, 32px)
  color: var(--am-gold)

.right .name
  color: var(--am-lilac)

.ready
  min-width: 200px
  height: 76px
  padding: 0 26px
  border-radius: 20px
  display: flex
  align-items: center
  justify-content: center
  gap: 10px
  background: linear-gradient(to bottom, var(--am-lilac), var(--am-lilac-foot))
  color: var(--am-on-accent)
  font-size: 26px
  .glyph
    width: 32px
    height: 32px
  &.on
    background: linear-gradient(to bottom, var(--am-mint), var(--am-mint-foot))
    box-shadow: 0 0 0 4px var(--am-ink)

.count
  position: absolute
  left: 50%
  top: 42%
  transform: translate(-50%, -50%)
  font-size: 140px
  color: var(--am-gold)
  animation: count-pop 0.7s ease-out both

@keyframes count-pop
  from
    transform: translate(-50%, -50%) scale(1.6)
    opacity: 0
  30%
    opacity: 1
  to
    transform: translate(-50%, -50%) scale(1)
</style>
