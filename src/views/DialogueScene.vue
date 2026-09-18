<script setup lang="ts">
/**
 * DialogueScene — the `dialogue` scene's DOM chrome (story-spec §3.1, §3.3.3):
 * the bubbles over the still-visible map, the map-jump icon (top-left, the
 * one back convention), and the skip icon once these lines have been seen.
 * Dialogue is outside the gameplay bracket, and no ad ever fires here.
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { S } from '@/game/duel/state'
import { hasBit } from '@/game/campaign/bitset'
import { dialogueFor } from '@/game/story/story'
import { dialogueDone, dialogueToMap } from '@/game/flow/nodes'
import { flowHud } from '@/use/useFlow'
import { sfx } from '@/game/duel/audio'
import DialogueBubbles from '@/components/story/DialogueBubbles.vue'
import GameIcon from '@/components/icons/GameIcon.vue'
import SceneCorner from '@/components/story/SceneCorner.vue'

const { t } = useI18n()
const lines = computed(() => dialogueFor(flowHud.node))
const seen = computed(() => hasBit(S.campaign.dialoguesSeen, flowHud.node))
/** The very first launch has no map to jump to yet — only the story. */
const canJump = computed(() => S.campaign.furthestNode >= 0)

const back = (): void => {
  sfx('ui')
  dialogueToMap()
}
</script>

<template lang="pug">
  div.dialogue-scene
    DialogueBubbles(
      v-if="lines.length"
      :key="flowHud.node"
      :lines="lines"
      :node="flowHud.node"
      :skippable="seen"
      @done="dialogueDone"
    )
    button.duel-plate.back-btn(v-if="canJump" :aria-label="t('a11y.backToMap')" @click.stop="back")
      GameIcon.glyph(name="back")
    SceneCorner(:inset="seen ? 66 : 0")
</template>

<style scoped lang="sass">
.dialogue-scene
  position: absolute
  inset: 0

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
  color: #fff
  cursor: pointer
  .glyph
    width: 30px
    height: 30px
    filter: drop-shadow(2px 2px 0 var(--duel-ink))
  &:focus-visible
    outline: 3px solid var(--duel-gold)
    outline-offset: 3px
</style>
