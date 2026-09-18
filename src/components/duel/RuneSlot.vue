<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { RUNES } from '@/game/duel/config'
import RuneGlyph from '@/components/duel/RuneGlyph.vue'
import { registerHot, releaseHot, setRingLength } from '@/use/useDuelHud'

/**
 * One queue slot. Empty: a dark plate. Filled: the rune's glyph on a plate
 * tinted with its colour. FORMING (the foe's next rune): a ghost of the rune
 * she has committed to — so the player can read her and counter (GDD 3.4) —
 * inside a purple ring that closes as it forms. Opacity and ring progress
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

const bg = computed(() =>
  props.rune === undefined ? 'rgba(24,17,48,0.8)' : `${RUNES[props.rune]?.[0] ?? '#fff'}2e`)

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
    div.slot-plate.duel-plate(:style="{ background: bg }")
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
          stroke="#c08cff"
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
  color: #c08cff

.slot-ring
  position: absolute
  left: 50%
  top: 50%
  width: 133.3%
  height: 133.3%
  transform: translate(-50%, -50%)
  overflow: visible
  pointer-events: none
</style>
