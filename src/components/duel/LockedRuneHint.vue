<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RUNE_IDS } from '@/game/duel/config'
import { LOCKED_S } from '@/game/duel/lesson'
import { hud, hudLayout } from '@/use/useDuelHud'
import RuneGlyph from '@/components/duel/RuneGlyph.vue'
import GameIcon from '@/components/icons/GameIcon.vue'

/**
 * "That shape is real — and it is coming." A stroke her runes refused but
 * that the recogniser, at the same bar an owned rune must clear, reads as a
 * rune she has NOT earned yet (`runes.recogniseLocked`): the rune's painted
 * icon with a small gold lock on its corner and "COMING SOON" under it, where
 * the "NOT A RUNE" callout would have stood. Nothing was stored.
 *
 * Keyed on the card's token, so a second locked shape replays the entrance.
 * One CSS animation carries the whole life (in, hold, out) over `LOCKED_S`,
 * and it pauses with the HUD (`.duel-paused`). Landscape renders inside the
 * scaled stage layer at the callout's stage point; portrait maps that point
 * to the screen the way `DuelPopups` does.
 */
const props = defineProps<{ portrait: boolean }>()
const { t } = useI18n()

const slug = computed(() => RUNE_IDS[hud.lockedRune] ?? 'fire')
const label = computed(() => t('duel.lockedRune', { rune: t(`rune.${slug.value}`) }))

const style = computed(() => {
  const L = hudLayout.value
  const k = props.portrait ? Math.max(0.62, Math.min(1, L.vs * 2)) : 1
  return {
    left: `${props.portrait ? L.vx + hud.lockedX * L.vs : hud.lockedX}px`,
    top: `${props.portrait ? L.vy + hud.lockedY * L.vs : hud.lockedY}px`,
    '--k': String(k),
    animationDuration: `${LOCKED_S}s`
  }
})
</script>

<template lang="pug">
  div.locked-hint(:key="hud.locked" :style="style" role="status" :aria-label="label")
    div.lh-icon.duel-plate
      RuneGlyph.lh-glyph(:rune="hud.lockedRune")
      span.lh-lock
        GameIcon(name="lock")
    span.lh-text.ink-text(aria-hidden="true") {{ t('duel.comingSoon') }}
</template>

<style scoped lang="sass">
.locked-hint
  position: absolute
  display: flex
  flex-direction: column
  align-items: center
  gap: calc(6px * var(--k))
  transform: translate(-50%, -50%)
  pointer-events: none
  animation-name: locked-life
  animation-timing-function: ease-out
  animation-fill-mode: both

.lh-icon
  --lw: calc(4px * var(--k))
  position: relative
  width: calc(76px * var(--k))
  height: calc(76px * var(--k))
  border-radius: 24%

.lh-glyph
  position: absolute
  left: 8%
  top: 8%
  width: 84%
  height: 84%
  // Not hers yet: the painting is shown, a little faded — a promise.
  opacity: 0.8

// The lock: a gold coin on the icon's corner, the glyph in plum.
.lh-lock
  position: absolute
  right: -18%
  bottom: -18%
  width: 46%
  height: 46%
  box-sizing: border-box
  padding: 8%
  border-radius: 50%
  background: var(--am-gold)
  border: calc(3px * var(--k)) solid var(--am-ink)
  color: var(--am-ink)

.lh-text
  font-size: calc(30px * var(--k))
  color: var(--am-gold)

@keyframes locked-life
  0%
    opacity: 0
    transform: translate(-50%, -50%) scale(0.7)
  12%
    opacity: 1
    transform: translate(-50%, -50%) scale(1.06)
  20%
    transform: translate(-50%, -50%) scale(1)
  80%
    opacity: 1
  100%
    opacity: 0
    transform: translate(-50%, -50%) scale(1)
</style>
