<script setup lang="ts">
/**
 * SceneCorner — the options gear and the spellbook, for the scenes that have
 * no HUD of their own: dialogue, the gift and the wipe, the wardrobe
 * (story-spec §3.3.7, §3.9.1: both are global overlays, reachable from every
 * scene). The duel's HUD and the map carry their own pair.
 *
 * Top-right, 56 px, inside the safe area; `inset` shifts it left of another
 * control that already owns the very corner (the dialogue's skip icon).
 */
import { useI18n } from 'vue-i18n'
import { openOverlay } from '@/game/flow/scene'
import { sfx } from '@/game/duel/audio'
import { bookHud } from '@/use/useBook'
import GameIcon from '@/components/icons/GameIcon.vue'

withDefaults(defineProps<{ inset?: number }>(), { inset: 0 })
const { t } = useI18n()

const open = (which: 'options' | 'spellbook'): void => {
  sfx('ui')
  openOverlay(which)
}
</script>

<template lang="pug">
  div.scene-corner(:style="{ '--inset': `${inset}px` }")
    button.duel-plate.icon(:class="{ 'book-new': bookHud.hasNew }" :aria-label="t('hud.spellbook')" @click.stop="open('spellbook')" @pointerdown.stop)
      GameIcon.glyph(name="book")
    button.duel-plate.icon(:aria-label="t('options.title')" @click.stop="open('options')" @pointerdown.stop)
      GameIcon.glyph(name="settings")
</template>

<style scoped lang="sass">
.scene-corner
  position: absolute
  right: calc(env(safe-area-inset-right) + 12px + var(--inset))
  top: calc(env(safe-area-inset-top) + 12px)
  display: flex
  gap: 10px
  pointer-events: none

.icon
  pointer-events: auto
  width: 56px
  height: 56px
  border-radius: 16px
  display: flex
  align-items: center
  justify-content: center
  color: #fff
  cursor: pointer
  -webkit-tap-highlight-color: transparent
  transition: transform 0.08s ease-out
  &:active
    transform: scale(0.94)
  &:focus-visible
    outline: 3px solid var(--duel-gold)
    outline-offset: 3px
  .glyph
    width: 30px
    height: 30px
    filter: drop-shadow(2px 2px 0 var(--duel-ink))
</style>
