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
 *
 * ONE TIP (second blind playtest, 2026-09-24): the gamer tester lost and got
 * "Zzz… try again?" with nothing to change. Under the motes the card now says
 * the one thing to try next, chosen from what happened in THAT duel
 * (`game/duel/lossTip.ts`), with the rune it is about painted beside it — and
 * for "keep drawing", that rune drawing itself. Read once when the card
 * mounts: the card still comes up exactly when it did, after the sting and
 * after any interstitial.
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { SW, SH } from '@/game/duel/config'
import { S } from '@/game/duel/state'
import { LOSS_TIP_RUNES, lossTip, lossTipKey } from '@/game/duel/lossTip'
import { hud, hudLayout } from '@/use/useDuelHud'
import { reducedMotion } from '@/use/useAccessibility'
import { vFit } from '@/use/vFit'
import GameIcon from '@/components/icons/GameIcon.vue'
import RuneGlyph from '@/components/duel/RuneGlyph.vue'
import RuneTrace from '@/components/duel/RuneTrace.vue'

const props = defineProps<{ keyboard: boolean; paused: boolean }>()
const emit = defineEmits<{ retry: []; map: [] }>()
const { t } = useI18n()

const L = computed(() => hudLayout.value)
/** Dream Dust's strength on this node: one mote per loss, five at most. */
const motes = computed(() => Math.min(5, S.campaign.lossStreaks[String(S.flow.node)] ?? 0))

/** This loss's tip, and the runes shown beside it — fixed for the card's life. */
const tipId = lossTip()
const tipKey = lossTipKey(tipId)
const tipRunes = LOSS_TIP_RUNES[tipId]
/** "Keep drawing": the rune draws itself, again every few seconds (never
 *  under reduced motion, never while the game is paused). */
const tracing = tipId === 'keepDrawing'
const tracePlay = ref(0)
let traceTimer = 0
onMounted(() => {
  if (!tracing) return
  traceTimer = window.setInterval(() => {
    if (!reducedMotion.value && !props.paused) tracePlay.value++
  }, 2600)
})
onUnmounted(() => window.clearInterval(traceTimer))

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
  div.duel-result(:class="{ 'duel-paused': paused, 'am-still': reducedMotion }")
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
      div.abs.duel-plate.is-night.panel(:style="box(356, 170, 568, 360)")
      span.abs.ink-text.title(v-fit="46" :style="box(384, 184, 512, 88)") {{ t('result.defeated') }}
      div.abs.dust(:style="box(540, 276, 200, 26)" aria-hidden="true")
        span.mote(v-for="i in 5" :key="i" :class="{ on: i <= motes }")
      div.abs.tip(:style="box(384, 312, 512, 98)" role="note" :data-tip="tipId")
        div.tip-runes(aria-hidden="true")
          template(v-for="(r, i) in tipRunes" :key="i")
            GameIcon.tip-plus(v-if="i" name="plus")
            span.tip-rune
              RuneTrace.tip-glyph(v-if="tracing" :rune="r" :size="54" :play="tracePlay")
              RuneGlyph.tip-glyph(v-else :rune="r")
        span.tip-text(v-fit="25") {{ t(tipKey) }}
      button.abs.duel-plate.retry(
        v-if="hud.tapReady"
        :style="box(384, 424, 412, 84)"
        :aria-label="t('result.tapToDuel')"
        @click.stop="emit('retry')"
      )
        GameIcon.glyph(name="replay")
        span.ink-text.ink-none.retry-label(v-fit="28") {{ t('result.tapToDuel') }}
      button.abs.duel-plate.map(
        v-if="hud.tapReady"
        :style="box(812, 424, 84, 84)"
        :aria-label="t('a11y.backToMap')"
        @click.stop="emit('map')"
      )
        GameIcon.glyph(name="back")

    //- ═════════ PORTRAIT: the same content in a centred card ═════════
    div.port-card.duel-plate.is-night(v-else)
      span.ink-text.port-title(v-fit) {{ t('result.defeated') }}
      div.dust(aria-hidden="true")
        span.mote(v-for="i in 5" :key="i" :class="{ on: i <= motes }")
      div.tip.port-tip(role="note" :data-tip="tipId")
        div.tip-runes(aria-hidden="true")
          template(v-for="(r, i) in tipRunes" :key="i")
            GameIcon.tip-plus(v-if="i" name="plus")
            span.tip-rune
              RuneTrace.tip-glyph(v-if="tracing" :rune="r" :size="40" :play="tracePlay")
              RuneGlyph.tip-glyph(v-else :rune="r")
        span.tip-text(v-fit) {{ t(tipKey) }}
      div.port-row(v-if="hud.tapReady")
        button.duel-plate.retry(:aria-label="t('result.tapToDuel')" @click.stop="emit('retry')")
          GameIcon.glyph(name="replay")
          span.ink-text.ink-none.retry-label(v-fit) {{ t('result.tapToDuel') }}
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
  background: var(--am-scrim)

.stage-layer
  position: absolute
  left: 0
  top: 0
  transform-origin: 0 0

.abs
  position: absolute

// The card KEEPS its dark plate (§2.5) — it is the sleepy beat, and cream
// would fight the "Zzz". The face and the cream ink come from `.is-night`.
.panel
  --lw: 8px
  border-radius: 32px

button
  cursor: pointer
  padding: 0
  margin: 0
  font: inherit
  // Plum, on gold (Retry) and on cream (Map) alike. `border: none` is gone
  // with it: the plum line is `.duel-plate`'s, and on a paper chip it is the
  // whole reason the control reads as a control.
  color: var(--am-ink)
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
    outline: 3px solid var(--am-ink)
    outline-offset: 3px

.retry
  background: linear-gradient(to bottom, var(--am-gold), var(--am-gold-foot))
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
  // 7.62:1 on the night card
  color: var(--am-gold)

.retry-label
  flex: 0 1 auto
  min-width: 0
  // `.ink-text` fills white, and `.ink-none` takes away the plum outline that
  // made white legible — so on the gold face this inherited to white-on-gold
  // at 1.38:1, which is the §10.4 failure mode exactly (light ink left behind
  // on a plate that stopped being dark). Plum on gold is 10.16:1.
  color: var(--am-on-accent)

.glyph
  width: 34px
  height: 34px
  flex: 0 0 auto

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

// ── the tip: what to try next, with its rune beside it ──
// A well cut into the night card (the HP track's own deep night), so it reads
// as a note ON the card, not as a second card. Cream on it is 11:1.
.tip
  display: flex
  align-items: center
  gap: 14px
  box-sizing: border-box
  padding: 8px 18px 8px 12px
  border-radius: 20px
  background: var(--am-night-deep)
  color: var(--am-on-night)
  animation: tip-in 0.45s var(--am-ease-out) 0.15s both

.tip-runes
  flex: 0 0 auto
  display: flex
  align-items: center
  gap: 4px

// Each rune on the pad chips' paper disc: a painted rune's plum ink would sink
// into the night plate without it.
.tip-rune
  position: relative
  width: 64px
  height: 64px
  box-sizing: border-box
  border-radius: 50%
  background: var(--am-paper)
  border: 3px solid var(--am-ink)
  box-shadow: var(--am-shadow-chip)

.tip-glyph
  position: absolute
  left: 7%
  top: 7%
  width: 86%
  height: 86%

.tip-plus
  flex: 0 0 auto
  width: 22px
  height: 22px
  color: var(--am-gold)

// A sentence in 21 scripts: it wraps first (three lines at most) and `v-fit`
// shrinks it only if that is not enough — the title's own rule.
.tip-text
  flex: 1 1 auto
  min-width: 0
  max-height: 3.9em
  overflow: hidden
  white-space: normal
  overflow-wrap: break-word
  font-family: var(--am-font)
  font-weight: var(--am-w-label)
  line-height: 1.3
  letter-spacing: 0
  text-align: start
:lang(ar) .tip-text
  unicode-bidi: plaintext

@keyframes tip-in
  from
    opacity: 0
    transform: translateY(6px)
  to
    opacity: 1
    transform: none

// Reduced motion — the game's own toggle or the device's: the tip is simply
// there (and its rune does not redraw itself: `DuelResult`'s timer).
.am-still .tip
  animation: none
@media (prefers-reduced-motion: reduce)
  .tip
    animation: none

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
  border-radius: 26px

.port-title
  width: 100%
  font-size: clamp(26px, 8.5vw, 38px)
  color: var(--am-gold)
  text-align: center
  white-space: normal
  overflow: hidden
  line-height: 1.3
  max-height: 2.8em

.port-tip
  width: 100%
  gap: 10px
  padding: 8px 12px 8px 8px
  border-radius: 16px
  .tip-rune
    width: 46px
    height: 46px
    border-width: 2px
  .tip-plus
    width: 16px
    height: 16px
  .tip-text
    font-size: clamp(14px, 4.3vw, 18px)

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
