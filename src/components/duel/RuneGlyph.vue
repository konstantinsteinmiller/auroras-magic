<script setup lang="ts">
import { computed } from 'vue'
import { RUNES } from '@/game/duel/config'
import { glyphSvgPath, GLYPH_INK, GLYPH_INK_W, GLYPH_COL_W } from '@/game/duel/glyph'
import { runeArtId } from '@/game/artIds'
import { useArtImage } from '@/use/useArtImage'

/**
 * One rune glyph as inline SVG — the same polyline the canvas draws (see
 * `game/duel/glyph.ts`), so a slot, a shop plate and the snap flash can never
 * disagree about what a rune looks like. Sized by its box (`size` px, or 100%
 * of the parent when omitted); decorative, so the caller owns the label.
 *
 * With the art layer on and `images/runes/rune-<name>.webp` present, the
 * PAINTED rune (S6) takes the same box: the painting was made from this very
 * 100-unit box, so it lands the same size. The canvas traces (the snap, the
 * reveal, the onboarding) stay drawn — a trace is motion, not a picture.
 */
const props = withDefaults(defineProps<{
  rune: number
  /** Box edge in px. Omit to fill the parent. */
  size?: number
  alpha?: number
}>(), { alpha: 1 })

/* Drawn in a 100x100 box around radius 30, which leaves room for the fat ink
   stroke (0.52r) and the square's 1.06 over-reach. */
const R = 30
const d = computed(() => glyphSvgPath(props.rune, 50, 50, R))
const color = computed(() => RUNES[props.rune]?.[0] ?? '#fff')
const painted = useArtImage('rune', () => runeArtId(props.rune))
const imgStyle = computed(() => ({
  opacity: props.alpha,
  width: props.size ? `${props.size}px` : '100%',
  height: props.size ? `${props.size}px` : '100%'
}))
</script>

<template lang="pug">
  img.rune-glyph.is-painted(
    v-if="painted"
    :src="painted"
    :style="imgStyle"
    alt=""
    draggable="false"
    aria-hidden="true"
  )
  svg.rune-glyph(
    v-else
    viewBox="0 0 100 100"
    :width="size"
    :height="size"
    :style="{ opacity: alpha }"
    aria-hidden="true"
    focusable="false"
  )
    path(:d="d" fill="none" :stroke="GLYPH_INK" :stroke-width="R * GLYPH_INK_W" stroke-linecap="round" stroke-linejoin="round")
    path(:d="d" fill="none" :stroke="color" :stroke-width="R * GLYPH_COL_W" stroke-linecap="round" stroke-linejoin="round")
</template>

<style scoped lang="sass">
.rune-glyph
  display: block
  overflow: visible
  pointer-events: none
  &.is-painted
    object-fit: contain
    user-select: none
</style>
