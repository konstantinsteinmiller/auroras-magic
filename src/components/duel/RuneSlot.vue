<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
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
}>()

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

.slot-glyph
  position: absolute
  inset: 2.8%

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
