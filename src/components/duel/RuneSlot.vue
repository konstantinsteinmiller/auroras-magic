<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RUNES } from '@/game/duel/config'
import RuneGlyph from '@/components/duel/RuneGlyph.vue'
import { registerHot, releaseHot, setRingLength } from '@/use/useDuelHud'

/**
 * One queue slot. Empty: the dark plate (§2.5 — the slot and the HP trough
 * are the only two the UI keeps, and they share one well colour). Filled: the
 * rune's glyph on that same plate, washed with the rune's colour at 18 %.
 *
 * The wash used to REPLACE the plate, so a filled slot was an 18 % tint over
 * whatever the arena had behind it — invisible over a restored, brightly
 * painted sector. It is a layer on the plate now, so all twelve read the same
 * wherever the duel is. The well is `--am-night-deep` rather than `--am-night`
 * because the glyph is what names the rune and it is measured: at 18 % over
 * `--am-night` the colour stroke of Earth falls to 2.49:1 against its own
 * wash and Fire to 2.79; over `--am-night-deep` the worst of the twelve is
 * 2.92 and ten of them clear 3.6.
 *
 * FORMING (the foe's next rune): a ghost of the rune she has committed to —
 * so the player can read her and counter (GDD 3.4) —
 * inside a lavender ring that closes as it forms. Opacity and ring progress
 * change every frame, so `useDuelHud` writes them directly.
 */
const props = defineProps<{
  rune?: number
  /** This slot shows the foe's forming rune. */
  forming?: boolean
  /** The rune being formed (-1 = not chosen yet → a '?' sigil). */
  formRune?: number
  /**
   * The perfect-rune twinkle (retention item 7): a token that bumps each time
   * THIS slot earns one, 0 for none. It is the `:key` of the mark, so a slot
   * that sparkles twice in a row plays the animation twice instead of sitting
   * on a finished one.
   */
  sparkle?: number
  /**
   * THE FOE'S TELEGRAPH (story-spec §8.36), on her filled slots: 2 = her hand
   * is full and winding up to HIT (a warm pulse), 1 = two runes of a hit (a
   * softer, still glow), 0/absent = nothing to warn of. Warm coral and gold,
   * never red: "a big one is coming — put a wall up", not a threat. Under
   * reduced motion the pulse settles into a steady glow.
   */
  warn?: number
}>()

const { t } = useI18n()

const ring = ref<SVGCircleElement | null>(null)
const ghost = ref<HTMLElement | null>(null)
const RING_R = 31
const RING_LEN = 2 * Math.PI * RING_R

/**
 * The rune's wash, as a background IMAGE over the well the stylesheet paints —
 * `2e` is 18 % alpha, the jam build's own value. An empty slot has no wash at
 * all and shows the well bare. Inline, so it lands on top of the plate rather
 * than replacing it, which is what the old `background` did.
 */
const tint = computed(() => {
  if (props.rune === undefined) return undefined
  const c = RUNES[props.rune]?.[0] ?? '#fff'
  return { backgroundImage: `linear-gradient(${c}2e, ${c}2e)` }
})

// The forming slot moves along the row as the foe's hand fills, so a slot
// can start or stop forming without remounting: (re)bind on the prop, after
// the ring has rendered. `releaseHot` only clears the registry if it still
// points at THIS slot's elements, so the slot handing over cannot unbind the
// slot taking over.
let boundRing: SVGCircleElement | null = null
let boundGhost: HTMLElement | null = null
const unbind = (): void => {
  releaseHot('formRing', boundRing)
  releaseHot('formGhost', boundGhost)
  boundRing = boundGhost = null
}
const bind = async (): Promise<void> => {
  unbind()
  if (!props.forming) return
  await nextTick()
  if (!props.forming) return
  boundRing = ring.value
  boundGhost = ghost.value
  setRingLength(RING_LEN)
  registerHot('formRing', boundRing)
  registerHot('formGhost', boundGhost)
}
onMounted(() => { void bind() })
watch(() => [props.forming, props.formRune], () => { void bind() })
onUnmounted(unbind)
</script>

<template lang="pug">
  div.rune-slot
    span.slot-warn(v-if="warn && rune !== undefined" :class="warn >= 2 ? 'full' : 'soft'" aria-hidden="true")
    div.slot-plate.duel-plate(:style="tint")
    RuneGlyph.slot-glyph(v-if="rune !== undefined" :rune="rune")
    template(v-else-if="forming")
      div.slot-ghost(ref="ghost")
        RuneGlyph.slot-glyph(v-if="formRune !== undefined && formRune >= 0" :rune="formRune")
        span.slot-sigil.ink-text(v-else) ?
      svg.slot-ring(viewBox="-40 -40 80 80" aria-hidden="true")
        circle(
          ref="ring"
          r="31"
          fill="none"
          stroke="currentColor"
          stroke-width="5"
          :stroke-dasharray="RING_LEN"
          :stroke-dashoffset="RING_LEN"
          transform="rotate(-90)"
        )
    //- A neat rune's twinkle, just off the slot's top corner. One shot: it
    //- keeps its motion under reduced motion, which mutes AMBIENT loops only.
    svg.slot-spark(
      v-if="sparkle"
      :key="sparkle"
      viewBox="-10 -10 20 20"
      role="img"
      :aria-label="t('help.perfectRune')"
    )
      path(
        d="M0 -9 Q1.5 -1.5 9 0 Q1.5 1.5 0 9 Q-1.5 1.5 -9 0 Q-1.5 -1.5 0 -9 Z"
        fill="var(--am-gold)"
        stroke="var(--am-ink)"
        stroke-width="2.2"
        stroke-linejoin="round"
      )
</template>

<style scoped lang="sass">
// Sized by its parent: the VISIBLE box of the jam build's slot, a 56x56 path
// with a 4-unit outline centred on it (so 60x60). Everything inside is laid
// out as a fraction of that box so the same slot works at HUD scale in
// landscape and at thumb scale in portrait: the glyph was radius 17 (the
// RuneGlyph box is 100 units around radius 30 -> 56.7 units, ~94 % of 60), and
// the forming ring radius 31 around the centre (an 80-unit box, 133 %).
.rune-slot
  position: relative
  width: 100%
  height: 100%

.slot-plate
  --lw: 4px
  position: absolute
  inset: 0
  border-radius: 25%
  // the same well the HP bar's unfilled track is cut from
  background-color: var(--am-night-deep)
  color: var(--am-on-night)
  // a gauge takes no page-lift, so the one `.duel-plate` gives is dropped
  box-shadow: none

// The glyph box is spelled out, not left to `inset` alone: the rune is an SVG
// with no intrinsic size, and an absolutely positioned replaced element does
// not stretch between its insets the way a div does. 94.4 % centred is the
// jam build's radius-17 glyph in its 60-unit slot (see above).
.slot-glyph
  position: absolute
  left: 2.8%
  top: 2.8%
  width: 94.4%
  height: 94.4%

.slot-ghost
  position: absolute
  inset: 0
  opacity: 0.22
  display: flex
  align-items: center
  justify-content: center

.slot-sigil
  font-size: 32px
  color: var(--duel-lavender)

// The perfect twinkle. It sits OUTSIDE the plate (top-trailing corner) so it
// never covers the glyph that names the rune, and it is purely additive: with
// the sound off the star burst on the stage and this mark are what say
// "that one was neat".
.slot-spark
  position: absolute
  left: 76%
  bottom: 70%
  width: 52%
  height: 52%
  overflow: visible
  pointer-events: none
  transform-origin: 50% 50%
  animation: slot-spark 0.72s ease-out forwards

@keyframes slot-spark
  0%
    opacity: 0
    transform: scale(0.2) rotate(-28deg)
  28%
    opacity: 1
    transform: scale(1.18) rotate(6deg)
  55%
    opacity: 1
    transform: scale(0.94) rotate(0deg)
  100%
    opacity: 0
    transform: scale(1.05) rotate(10deg)

// The telegraph's glow (§8.36): a warm halo standing just outside the plate —
// behind it, so it never tints the glyph that names the rune. Gold ring, coral
// bloom: the "something good is about to happen" colours, turned toward
// "watch out", and nowhere near the red a child reads as danger.
.slot-warn
  position: absolute
  inset: -12%
  border-radius: 32%
  pointer-events: none
  box-shadow: 0 0 0 3px var(--am-gold), 0 0 16px 6px var(--am-coral)
  &.soft
    inset: -8%
    opacity: 0.5
    box-shadow: 0 0 0 2px var(--am-gold), 0 0 10px 3px var(--am-coral)
  &.full
    animation: slot-warn 0.36s ease-in-out infinite alternate

@keyframes slot-warn
  from
    opacity: 0.55
    transform: scale(0.96)
  to
    opacity: 1
    transform: scale(1.08)

// An ambient loop settles when less motion is asked for — by the device or
// by the game's own Options toggle (`.am-reduced` on <html>): a steady glow.
@media (prefers-reduced-motion: reduce)
  .slot-warn.full
    animation: none
    opacity: 1

html.am-reduced .slot-warn.full
  animation: none
  opacity: 1

.slot-ring
  // the forming ring takes its stroke from here — 7.06:1 on the slot's well
  color: var(--duel-lavender)
  position: absolute
  left: 50%
  top: 50%
  width: 133.3%
  height: 133.3%
  transform: translate(-50%, -50%)
  overflow: visible
  pointer-events: none
</style>
