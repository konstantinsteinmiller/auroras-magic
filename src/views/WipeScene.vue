<script setup lang="ts">
/**
 * WipeScene — the DOM chrome over the `wipe` scene (story-spec §3.3.2,
 * §3.3.5, §4.1.4): the back icon (top-left, 56 px), the tool-in-hand chip
 * with its progress ring (bottom-centre), and — once the sector is restored —
 * the "continue" plate. No canvas, no text: every name is an aria-label.
 *
 * The chip takes no pointer events, so the brush can wipe right under it.
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import GameIcon from '@/components/icons/GameIcon.vue'
import SceneCorner from '@/components/story/SceneCorner.vue'
import { restoreHud } from '@/use/useRestoreHud'

const emit = defineEmits<{ back: []; continue: [] }>()
const { t } = useI18n()

// Not once the dust is gone: the pots and the paint come after the reveal
// (the sector is already restored), and leaving there would skip the colour.
const canLeave = computed(() => !['freeze', 'wave', 'pots', 'paint', 'admire', 'idle'].includes(restoreHud.phase))
const wiping = computed(() => restoreHud.phase === 'wipe' || restoreHud.phase === 'zoom')
/** The ring fills to the auto-complete line, then glows: "you can stop now" —
 *  by the 85 % rule or by §8.6's "it already looks clean" one. */
const ring = computed(() => Math.min(1, restoreHud.progress))
const pct = computed(() => Math.round(restoreHud.coverage * 100))
const R = 27
const C = 2 * Math.PI * R

const chipStyle = computed(() => {
  const f = restoreHud.frame
  const y = restoreHud.portrait ? f.y + f.h + 64 : f.y + f.h - 50
  return { left: `${f.x + f.w / 2 - 36}px`, top: `${y - 36}px` }
})
</script>

<template lang="pug">
  div.wipe-scene
    button.duel-plate.back-btn(
      v-if="canLeave"
      :aria-label="t('a11y.backToMap')"
      @click.stop="emit('back')"
    )
      GameIcon.glyph(name="back")
    div.tool-chip(
      v-if="wiping"
      :style="chipStyle"
      :class="{ ready: ring >= 1 }"
      role="progressbar"
      :aria-label="t(restoreHud.tool === 'sunbeam' ? 'tool.sunbeam' : restoreHud.tool === 'eraser' ? 'tool.magicEraser' : 'tool.stardustSponge')"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="pct"
    )
      svg(viewBox="0 0 72 72" aria-hidden="true")
        circle(cx="36" cy="36" :r="R" fill="rgba(24,17,48,0.72)" stroke="#3A2340" stroke-width="3")
        circle.track(cx="36" cy="36" :r="R" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="6")
        circle.fill(
          cx="36" cy="36" :r="R" fill="none" stroke="#ffd76a" stroke-width="6" stroke-linecap="round"
          :stroke-dasharray="`${C * ring} ${C}`" transform="rotate(-90 36 36)"
        )
        //- The Sunbeam, small: a sun with eight rays on a golden wand.
        g(v-if="restoreHud.boss")
          rect(x="16" y="33" width="22" height="6" rx="3" fill="#ffd36b" stroke="#3A2340" stroke-width="2" transform="rotate(45 36 36)")
          path(
            d="M36 17 L38.5 26 L47 22 L43 30.5 L52 33 L43 35.5 L47 44 L38.5 40 L36 49 L33.5 40 L25 44 L29 35.5 L20 33 L29 30.5 L25 22 L33.5 26 Z"
            fill="#ffb63b" stroke="#3A2340" stroke-width="1.5" stroke-linejoin="round"
          )
          circle(cx="36" cy="33" r="8" fill="#ffe45c" stroke="#3A2340" stroke-width="2")
        //- The Magic Eraser, small: a pink block with a white sleeve and a star.
        g(v-else-if="restoreHud.tool === 'eraser'" transform="rotate(-30 36 36)")
          rect(x="16" y="26" width="40" height="22" rx="6" fill="#ff9ecf" stroke="#3A2340" stroke-width="2.5")
          rect(x="31" y="25" width="17" height="24" rx="3" fill="#fff6fb" stroke="#3A2340" stroke-width="2.5")
          path(d="M39.5 31 L41 35 L45 35.5 L42 38 L43 42 L39.5 40 L36 42 L37 38 L34 35.5 L38 35 Z" fill="#ffd36b" stroke="#3A2340" stroke-width="1.2")
        //- The Stardust Sponge, small: the yellow block, its mint top, a star.
        g(v-else transform="rotate(-12 36 36)")
          rect(x="15" y="24" width="42" height="26" rx="7" fill="#ffe07a" stroke="#3A2340" stroke-width="2.5")
          path(d="M16.5 30.5 L55.5 30.5" stroke="#3A2340" stroke-width="1.6")
          path(d="M16.3 30 L16.3 28 Q16.3 25.3 22 25.3 L50 25.3 Q55.7 25.3 55.7 28 L55.7 30 Z" fill="#9ff0cf")
          circle(cx="24" cy="42" r="2" fill="#e3aa3c")
          circle(cx="48" cy="44" r="1.6" fill="#e3aa3c")
          path(d="M36 34 L37.3 37.3 L40.8 37.6 L38.1 39.8 L39 43.2 L36 41.3 L33 43.2 L33.9 39.8 L31.2 37.6 L34.7 37.3 Z" fill="#fff3b0" stroke="#3A2340" stroke-width="1.2")
        path(v-if="restoreHud.tool === 'brush'" d="M52 14 L54 19 L59 21 L54 23 L52 28 L50 23 L45 21 L50 19 Z" fill="#fff6b0" stroke="#3A2340" stroke-width="1.5")
    SceneCorner
    button.duel-plate.continue-btn(
      v-if="restoreHud.showContinue"
      :style="chipStyle"
      :aria-label="t('continue')"
      @click.stop="emit('continue')"
    )
      GameIcon.glyph(name="forward")
</template>

<style scoped lang="sass">
.wipe-scene
  position: absolute
  inset: 0
  pointer-events: none

button
  position: absolute
  pointer-events: auto
  display: flex
  align-items: center
  justify-content: center
  padding: 0
  margin: 0
  color: #fff
  cursor: pointer
  -webkit-tap-highlight-color: transparent
  transition: transform 0.08s ease-out
  &:active
    transform: scale(0.95)
  &:focus-visible
    outline: 3px solid var(--duel-gold)
    outline-offset: 3px

.back-btn
  left: calc(env(safe-area-inset-left) + 12px)
  top: calc(env(safe-area-inset-top) + 12px)
  width: 56px
  height: 56px
  border-radius: 16px

.glyph
  width: 30px
  height: 30px
  filter: drop-shadow(2px 2px 0 var(--duel-ink))

.tool-chip
  position: absolute
  width: 72px
  height: 72px
  svg
    width: 100%
    height: 100%
  .fill
    transition: stroke-dasharray 0.25s linear
  &.ready
    animation: chip-glow 1.1s ease-in-out infinite

.continue-btn
  width: 72px
  height: 72px
  border-radius: 50%
  background: var(--duel-plate-live)
  box-shadow: 0 0 0 4px var(--duel-gold)
  animation: continue-in 0.35s cubic-bezier(0.2, 1.4, 0.4, 1) both, chip-glow 1.4s ease-in-out 0.4s infinite
  .glyph
    width: 36px
    height: 36px

@keyframes chip-glow
  0%, 100%
    filter: drop-shadow(0 0 0 rgba(255, 215, 106, 0))
  50%
    filter: drop-shadow(0 0 10px rgba(255, 215, 106, 0.9))

@keyframes continue-in
  from
    opacity: 0
    transform: scale(0.5)
  to
    opacity: 1
    transform: none
</style>
