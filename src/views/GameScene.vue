<script setup lang="ts">
/**
 * GameScene — the `duel` scene's DOM chrome (story-spec §4.1.5, M11).
 *
 * No longer the app root: `AppScene.vue` owns the canvas, the one RAF and
 * every listener. What is left here is genuinely ABOUT one duel: the HUD, the
 * boss's thank-you bubbles, the rank badge on a win, and the loss beat. The
 * rules of what happens next live in `game/flow/duelFlow.ts`.
 *
 * Two of those beats are story bubbles over the arena rather than a scene in
 * front of it: a boss's thank-you when she is befriended, and — on a cold
 * boot — the campaign's opener, laid over node 0's duel while the ghost trace
 * loops and turning its own three beats over (retention-roadmap item 2).
 * Neither takes a tap from the canvas.
 */
import { computed } from 'vue'
import { cast, castSide } from '@/game/duel/sim'
import { sfx } from '@/game/duel/audio'
import { openOverlay } from '@/game/flow/scene'
import { retry, toMap, finishThanks } from '@/game/flow/duelFlow'
import { hud } from '@/use/useDuelHud'
import { duelBeat } from '@/use/useDuelBeat'
import { isGamePaused } from '@/use/useGamePause'
import { flowHud, openingHud } from '@/use/useFlow'
import { closeOpening } from '@/game/flow/nodes'
import { useMute } from '@/use/useMute'
import DuelHud from '@/components/duel/DuelHud.vue'
import DuelResult from '@/components/duel/DuelResult.vue'
import DialogueBubbles from '@/components/story/DialogueBubbles.vue'
import ArtIcon from '@/components/icons/ArtIcon.vue'
import { CHROME_ART } from '@/game/artIds'
import { thanksLines, openingLines } from '@/game/story/story'
import { useI18n } from 'vue-i18n'
import { versusHud } from '@/use/useVersus'
import TurnSideways from '@/components/story/TurnSideways.vue'

defineProps<{ keyboard: boolean }>()

const { muted, toggle } = useMute()
const hudPaused = computed(() => isGamePaused.value || flowHud.overlay !== null)

const { t } = useI18n()
const onCast = (): void => {
  if (isGamePaused.value || flowHud.overlay) return
  sfx('ui')
  cast()
}
/** Player 2's CAST, in local versus (§6.19). */
const onCast2 = (): void => {
  if (isGamePaused.value || flowHud.overlay) return
  sfx('ui')
  castSide(true)
}
const versus = computed(() => flowHud.mode === 'versus')
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

const thanks = computed(() => (duelBeat.phase === 'thanks' ? thanksLines(duelBeat.node) : []))
// The cold boot's opener, and only while the fight itself is on: a flourish,
// a sting or a thank-you is a beat of its own and owns the screen.
const opening = computed(() => (openingHud.live && duelBeat.phase === 'fight' ? openingLines() : []))
</script>

<template lang="pug">
  div.duel-scene
    DuelHud(
      :muted="muted"
      :keyboard="keyboard"
      :paused="hudPaused"
      @cast="onCast"
      @cast2="onCast2"
      @mute="onMute"
      @options="onOptions"
      @book="onBook"
    )
    DialogueBubbles(
      v-if="thanks.length"
      :lines="thanks"
      :node="duelBeat.node"
      @done="finishThanks"
    )
    //- The cold boot's opening (retention item 2). `skippable` from the first
    //- frame, unlike a dialogue page: there is no page to turn here, so the
    //- icon is the only way to put the sequence away without drawing — and it
    //- puts away the whole of it, not the beat that happens to be up.
    DialogueBubbles(
      v-if="opening.length"
      :lines="opening"
      :node="duelBeat.node"
      over-arena
      skippable
      @done="closeOpening"
    )
    //- Local versus: the result is both players' together (§2.2 rule 21) —
    //- a crown over whoever won, one line for both, never a lone spotlight.
    div.versus-end(v-if="versus && duelBeat.phase === 'versusEnd'" role="status")
      div.crown(:class="versusHud.winner ? 'right' : 'left'" aria-hidden="true")
        //- The cup is painted when the art layer is on (paint-outstanding.md
        //- P14), the shared glyph otherwise.
        ArtIcon.glyph(kind="worldUi" :id="CHROME_ART.trophy.id" fallback="trophy")
      p.story-text {{ t('versus.greatDuel') }}
    div.versus-turn(v-if="versus && !versusHud.wide")
      TurnSideways
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

.versus-end
  position: absolute
  inset: 0
  pointer-events: none
  p
    position: absolute
    left: 50%
    top: 30%
    transform: translate(-50%, -50%)
    margin: 0
    padding: 10px 24px
    border-radius: 20px
    background: var(--am-paper)
    box-shadow: 0 0 0 4px var(--am-ink)
    color: var(--am-ink)
    font-size: clamp(22px, 3.2vw, 36px)
    // A line, not a lane: "Қандай керемет жекпе-жек!" is twice "What a duel!"
    // and a nowrap banner with no width simply leaves the screen.
    max-width: min(86vw, 660px)
    animation: rank-in 0.4s cubic-bezier(0.2, 1.4, 0.4, 1) both
  .crown
    position: absolute
    top: 40%
    width: 72px
    height: 72px
    transform: translate(-50%, -50%)
    color: var(--am-gold)
    filter: drop-shadow(0 3px 0 var(--am-ink))
    animation: rank-in 0.5s cubic-bezier(0.2, 1.4, 0.4, 1) both 0.2s
    &.left
      left: 31%
    &.right
      left: 69%
    .glyph
      width: 100%
      height: 100%

// The versus end screen's pop. (It was defined beside the win-screen rank
// badge that has moved to the map, §8.33; the badge went, this stayed.)
@keyframes rank-in
  from
    opacity: 0
    transform: translate(-50%, 12px) scale(0.8)
  to
    opacity: 1
    transform: translateX(-50%)

.versus-turn
  position: absolute
  inset: 0
  display: flex
  align-items: center
  justify-content: center
  background: var(--am-scrim-soft)
  pointer-events: auto

// Under the VICTORY callout: lifetime duels won, placed on the board.
</style>
