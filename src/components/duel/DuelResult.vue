<script setup lang="ts">
/**
 * The loss beat, in the arena (story-spec §3.2.4, §10.19, C26–C27).
 *
 * Umbra's dust does not gloat; the player's unicorn has dozed off. The copy
 * is soft ("Zzz... try again?"), and two things can happen next: Retry —
 * straight back in, no dialogue — or Map. Dream Dust drifts in with every
 * loss on this node: the next try is a little gentler (§6.15), and the row of
 * motes shows it without a word.
 *
 * There is no reward offer here, ever (D3): a loss has nothing to bloom, and
 * a family-friendly game does not sell an easier retry. The old shop, wallet
 * and ×2 button are gone with the currency.
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SW, SH } from '@/game/duel/config'
import { S } from '@/game/duel/state'
import { hud, hudLayout } from '@/use/useDuelHud'
import { vFit } from '@/use/vFit'
import GameIcon from '@/components/icons/GameIcon.vue'

defineProps<{ keyboard: boolean; paused: boolean }>()
const emit = defineEmits<{ retry: []; map: [] }>()
const { t } = useI18n()

const L = computed(() => hudLayout.value)
/** Dream Dust's strength on this node: one mote per loss, five at most. */
const motes = computed(() => Math.min(5, S.campaign.lossStreaks[String(S.flow.node)] ?? 0))

const box = (x: number, y: number, w: number, h: number) => ({
  left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px`
})
const stageStyle = computed(() => ({
  width: `${SW}px`,
  height: `${SH}px`,
  transform: `translate(${L.value.vx}px, ${L.value.vy}px) scale(${L.value.vs})`
}))
</script>

<template lang="pug">
  div.duel-result(:class="{ 'duel-paused': paused }")
    div.dim
    //- ═════════ LANDSCAPE: stage coordinates ═════════
    //- Every word in here is boxed: the title has the panel's own width, the
    //- caption has the button's. The copy is a SENTENCE in 21 languages —
    //- "Zzz... ¿lo intentamos otra vez?" is twice the English — so each one
    //- wraps to its second line first and shrinks only if that is not enough
    //- (`v-fit`). Painting a title at a size that happens to suit English and
    //- letting the rest run off the plate is how the German loss screen came
    //- to read "Zum Duell tippe" with its tail under the Map button.
    div.stage-layer(v-if="!L.portrait" :style="stageStyle")
      div.abs.duel-plate.panel(:style="box(376, 226, 528, 268)")
      span.abs.ink-text.title(v-fit="46" :style="box(404, 244, 472, 92)") {{ t('result.defeated') }}
      div.abs.dust(:style="box(540, 344, 200, 30)" aria-hidden="true")
        span.mote(v-for="i in 5" :key="i" :class="{ on: i <= motes }")
      button.abs.duel-plate.retry(
        v-if="hud.tapReady"
        :style="box(400, 384, 380, 84)"
        :aria-label="t('result.tapToDuel')"
        @click.stop="emit('retry')"
      )
        GameIcon.glyph(name="replay")
        span.ink-text.retry-label(v-fit="28") {{ t('result.tapToDuel') }}
      button.abs.duel-plate.map(
        v-if="hud.tapReady"
        :style="box(796, 384, 84, 84)"
        :aria-label="t('a11y.backToMap')"
        @click.stop="emit('map')"
      )
        GameIcon.glyph(name="back")

    //- ═════════ PORTRAIT: the same content in a centred card ═════════
    div.port-card.duel-plate(v-else)
      span.ink-text.port-title(v-fit) {{ t('result.defeated') }}
      div.dust(aria-hidden="true")
        span.mote(v-for="i in 5" :key="i" :class="{ on: i <= motes }")
      div.port-row(v-if="hud.tapReady")
        button.duel-plate.retry(:aria-label="t('result.tapToDuel')" @click.stop="emit('retry')")
          GameIcon.glyph(name="replay")
          span.ink-text.retry-label(v-fit) {{ t('result.tapToDuel') }}
        button.duel-plate.map(:aria-label="t('a11y.backToMap')" @click.stop="emit('map')")
          GameIcon.glyph(name="back")
</template>

<style scoped lang="sass">
.duel-result
  position: absolute
  inset: 0
  pointer-events: auto
  overflow: hidden

.dim
  position: absolute
  inset: 0
  background: rgba(20, 12, 40, 0.62)

.stage-layer
  position: absolute
  left: 0
  top: 0
  transform-origin: 0 0

.abs
  position: absolute

.panel
  --lw: 8px
  background: #221a3e
  border-radius: 32px

button
  cursor: pointer
  padding: 0
  margin: 0
  font: inherit
  color: #fff
  border: none
  display: flex
  align-items: center
  justify-content: center
  gap: 12px
  -webkit-tap-highlight-color: transparent
  transition: transform 0.08s ease-out
  animation: beat-in 0.35s cubic-bezier(0.2, 1.4, 0.4, 1) both
  &:active
    transform: scale(0.96)
  &:focus-visible
    outline: 3px solid var(--duel-gold)
    outline-offset: 3px

.retry
  background: var(--duel-plate-live)
  border-radius: 20px
  min-height: 56px
  // Without this the caption is a flex item at its own intrinsic width, and a
  // long one pushes its way out of the plate rather than being fitted into it.
  padding: 0 10px
.map
  background: var(--duel-plate)
  border-radius: 20px
  min-width: 56px
  min-height: 56px

// The two boxed labels. `white-space: normal` beats the global `.ink-text`
// nowrap (class + attribute), `max-height` in `em` holds them to two lines at
// whatever size `v-fit` settles on, and `overflow: hidden` is what makes the
// overflow measurable in the first place.
.title, .retry-label
  display: flex
  align-items: center
  justify-content: center
  overflow: hidden
  white-space: normal
  text-align: center
  // Roomy enough for the tallest face the game ships (Devanagari and Thai sit
  // well outside a 1.0 line box), and exactly two of those lines.
  line-height: 1.3
  max-height: 2.8em

.title
  color: #c9b6ff

.retry-label
  flex: 0 1 auto
  min-width: 0

.glyph
  width: 34px
  height: 34px
  flex: 0 0 auto
  filter: drop-shadow(2px 2px 0 var(--duel-ink))

// Dream Dust: sleepy sparkle motes, lit one per loss on this node.
.dust
  display: flex
  align-items: center
  justify-content: center
  gap: 12px
.mote
  width: 16px
  height: 16px
  border-radius: 50%
  background: rgba(201, 182, 255, 0.18)
  box-shadow: 0 0 0 2px rgba(201, 182, 255, 0.28)
  &.on
    background: radial-gradient(circle, #fff6ff 0 30%, #d9c7ff 55%, #b58cff 100%)
    box-shadow: 0 0 10px 2px rgba(214, 196, 255, 0.85)
    animation: mote 2.2s ease-in-out infinite
  @for $i from 1 through 5
    &:nth-child(#{$i})
      animation-delay: #{$i * 0.2}s

// ── portrait card ──
.port-card
  --lw: 6px
  position: absolute
  left: 50%
  top: 50%
  transform: translate(-50%, -50%)
  width: min(92vw, 400px)
  display: flex
  flex-direction: column
  align-items: center
  gap: 16px
  padding: 22px 16px 20px
  background: #221a3e
  border-radius: 26px

.port-title
  width: 100%
  font-size: clamp(26px, 8.5vw, 38px)
  color: #c9b6ff
  text-align: center
  white-space: normal
  overflow: hidden
  line-height: 1.3
  max-height: 2.8em

.port-row
  display: flex
  gap: 12px
  width: 100%
  .retry
    // `min-width: 0` or the caption's intrinsic width becomes the button's
    // floor, and the row grows wider than the card it sits in.
    flex: 1 1 auto
    min-width: 0
    font-size: clamp(18px, 5.4vw, 24px)
    min-height: 60px
  .map
    flex: 0 0 64px
    height: 60px

@keyframes beat-in
  from
    opacity: 0
    transform: scale(0.7)
  to
    opacity: 1
    transform: none

@keyframes mote
  0%, 100%
    transform: translateY(0)
  50%
    transform: translateY(-5px)
</style>
