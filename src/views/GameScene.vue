<script setup lang="ts">
/**
 * GameScene — the `duel` scene's DOM chrome (story-spec §4.1.5, M11).
 *
 * No longer the app root: `AppScene.vue` owns the canvas, the one RAF and
 * every listener. What is left here is genuinely ABOUT one duel: the HUD, the
 * boss's thank-you bubbles, the rank badge on a win, and the loss beat. The
 * rules of what happens next live in `game/flow/duelFlow.ts`.
 */
import { computed } from 'vue'
import { PH_WIN } from '@/game/duel/config'
import { cast } from '@/game/duel/sim'
import { sfx } from '@/game/duel/audio'
import { openOverlay } from '@/game/flow/scene'
import { retry, toMap, finishThanks } from '@/game/flow/duelFlow'
import { hud } from '@/use/useDuelHud'
import { duelBeat } from '@/use/useDuelBeat'
import { isGamePaused } from '@/use/useGamePause'
import { flowHud } from '@/use/useFlow'
import { useMute } from '@/use/useMute'
import { leaderboardEnabled } from '@/use/useLeaderboard'
import DuelHud from '@/components/duel/DuelHud.vue'
import DuelResult from '@/components/duel/DuelResult.vue'
import DialogueBubbles from '@/components/story/DialogueBubbles.vue'
import RankBadge from '@/components/atoms/RankBadge.vue'
import { thanksLines } from '@/game/story/story'

defineProps<{ keyboard: boolean }>()

const { muted, toggle } = useMute()
const hudPaused = computed(() => isGamePaused.value || flowHud.overlay !== null)

const onCast = (): void => {
  if (isGamePaused.value || flowHud.overlay) return
  sfx('ui')
  cast()
}
const onMute = (): void => {
  sfx('ui')
  toggle()
}
const onOptions = (): void => {
  sfx('ui')
  openOverlay('options')
}
const onBook = (): void => {
  sfx('ui')
  openOverlay('spellbook')
}

/** The win's rank badge rides the flourish (the old result panel is gone). */
const showRank = computed(() =>
  leaderboardEnabled && hud.phase === PH_WIN && (duelBeat.phase === 'flourish' || duelBeat.phase === 'toMap') && hud.wins > 0)
const thanks = computed(() => (duelBeat.phase === 'thanks' ? thanksLines(duelBeat.node) : []))
</script>

<template lang="pug">
  div.duel-scene
    DuelHud(
      :muted="muted"
      :keyboard="keyboard"
      :paused="hudPaused"
      @cast="onCast"
      @mute="onMute"
      @options="onOptions"
      @book="onBook"
    )
    div.win-rank(v-if="showRank")
      RankBadge(:score="hud.wins")
    DialogueBubbles(
      v-if="thanks.length"
      :lines="thanks"
      :node="duelBeat.node"
      @done="finishThanks"
    )
    DuelResult(
      v-if="hud.resultUp && duelBeat.phase === 'loss'"
      :keyboard="keyboard"
      :paused="hudPaused"
      @retry="retry"
      @map="toMap"
    )
</template>

<style scoped lang="sass">
.duel-scene
  position: absolute
  inset: 0
  pointer-events: none

// Under the VICTORY callout: lifetime duels won, placed on the board.
.win-rank
  position: absolute
  left: 50%
  top: 58%
  transform: translateX(-50%)
  pointer-events: none
  animation: rank-in 0.4s cubic-bezier(0.2, 1.4, 0.4, 1) both 0.5s

@keyframes rank-in
  from
    opacity: 0
    transform: translate(-50%, 12px) scale(0.8)
  to
    opacity: 1
    transform: translateX(-50%)
</style>
