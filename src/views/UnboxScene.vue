<script setup lang="ts">
/**
 * UnboxScene — the DOM chrome over the `unbox` scene (story-spec §4.1.4):
 * the gift's tap target and the three paint pots (§8.7). It owns no canvas;
 * the gift, the burst and the tool are drawn by `game/restore/wipe.ts` into
 * the one canvas underneath.
 *
 * Zero-UI (§8.2): nothing here is written text. The pots are colour AND
 * shape (each carries its own mark, art-style §4.3's "a hue is never the
 * only cue"), and every control's name is an aria-label.
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { restoreHud } from '@/use/useRestoreHud'

const emit = defineEmits<{ open: []; pick: [i: number] }>()
const { t } = useI18n()

const showPots = computed(() => restoreHud.phase === 'pots' || restoreHud.phase === 'paint')
const giftStyle = computed(() => {
  const b = restoreHud.gift
  return { left: `${b.x}px`, top: `${b.y}px`, width: `${Math.max(64, b.w)}px`, height: `${Math.max(64, b.h)}px` }
})
const potStyle = (i: number) => {
  const p = restoreHud.pots[i]
  const s = restoreHud.potSize
  return { left: `${(p?.x ?? 0) - s / 2}px`, top: `${(p?.y ?? 0) - s / 2}px`, width: `${s}px`, height: `${s}px`, '--i': String(i) }
}
</script>

<template lang="pug">
  div.unbox-scene
    button.gift-hit(
      v-if="restoreHud.phase === 'invite'"
      :style="giftStyle"
      :aria-label="t('restore.openGift')"
      @click.stop="emit('open')"
    )
    div.pots(v-if="showPots" role="group" :aria-label="t('restore.pickColour')")
      button.pot(
        v-for="(p, i) in restoreHud.potDefs"
        :key="p.id"
        :style="potStyle(i)"
        :class="{ picked: restoreHud.picked === i, faded: restoreHud.picked >= 0 && restoreHud.picked !== i }"
        :aria-label="t(`paint.${p.id}`)"
        :aria-pressed="restoreHud.picked === i"
        :disabled="restoreHud.picked >= 0"
        @click.stop="emit('pick', i)"
      )
        svg(viewBox="0 0 64 64" aria-hidden="true")
          //- The pot: a round jar with a lip, filled to the brim.
          path(d="M14 26 Q14 56 32 56 Q50 56 50 26 Z" :fill="p.base" stroke="#3A2340" stroke-width="3" stroke-linejoin="round")
          path(d="M36 30 Q46 30 44 48 Q40 54 34 54" fill="none" :stroke="p.shade" stroke-width="5" stroke-linecap="round")
          rect(x="10" y="20" width="44" height="9" rx="4.5" fill="#fff4e6" stroke="#3A2340" stroke-width="3")
          //- A drip over the lip.
          path(d="M22 26 Q22 36 25 36 Q28 36 28 26 Z" :fill="p.base" stroke="#3A2340" stroke-width="2.5")
          //- Each pot's own mark: a petal, a sun, a bell — never colour alone.
          //- By slot, not by id, so every biome's three pots stay distinct.
          circle(v-if="i === 0" cx="32" cy="42" r="6" fill="#fff" fill-opacity="0.85")
          path(v-else-if="i === 1" d="M32 34 L34 40 L40 42 L34 44 L32 50 L30 44 L24 42 L30 40 Z" fill="#fff" fill-opacity="0.85")
          path(v-else d="M26 48 Q26 36 32 36 Q38 36 38 48 Z" fill="#fff" fill-opacity="0.85")
</template>

<style scoped lang="sass">
.unbox-scene
  position: absolute
  inset: 0
  pointer-events: none

button
  position: absolute
  pointer-events: auto
  padding: 0
  margin: 0
  border: 0
  background: transparent
  cursor: pointer
  -webkit-tap-highlight-color: transparent
  &:focus-visible
    outline: 3px solid var(--am-ink)
    outline-offset: 3px

.gift-hit
  border-radius: 24px

.pot
  display: flex
  align-items: center
  justify-content: center
  border-radius: 50%
  background: var(--am-paper)
  box-shadow: 0 4px 0 var(--am-ink), 0 0 0 4px var(--am-ink)
  // Three pots rise from the gift, one after another (§8.7), and then keep
  // BREATHING until one is chosen (§8.33). A child taps what is moving: the
  // old pots rose once and went still while the landmark's ring went on
  // pulsing, so the only living thing on screen was the one place she could
  // not press. Out of phase per pot, so the row shimmers rather than blinks.
  animation: pot-rise 0.42s cubic-bezier(0.2, 1.4, 0.4, 1) both, pot-breathe 1.9s ease-in-out infinite
  animation-delay: calc(var(--i) * 0.08s), calc(0.42s + var(--i) * 0.28s)
  transition: transform 0.18s ease-out, opacity 0.25s
  svg
    width: 86%
    height: 86%
  &:active
    // The press must beat the breathing, or a tap gives nothing back.
    animation: none
    transform: scale(0.94)
  // Chosen, or one of the two not chosen: the breathing stops either way —
  // the question has been answered.
  &.picked
    animation: none
    transform: scale(1.14)
  &.faded
    animation: none
    opacity: 0.35
  &:disabled
    cursor: default

// Respect the system setting (§3.11): the haloes and the drifting motes on
// the canvas carry the invitation on their own.
@media (prefers-reduced-motion: reduce)
  .pot
    animation: pot-rise 0.42s ease-out both

@keyframes pot-rise
  from
    opacity: 0
    transform: translateY(26px) scale(0.6)
  to
    opacity: 1
    transform: none

//- A small, slow bob — the jar is waiting to be picked up, not vibrating.
@keyframes pot-breathe
  0%, 100%
    transform: translateY(0) scale(1)
  50%
    transform: translateY(-7px) scale(1.06)
</style>
