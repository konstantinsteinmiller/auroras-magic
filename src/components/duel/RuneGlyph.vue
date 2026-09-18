<script setup lang="ts">
import { computed } from 'vue'
import { RUNES } from '@/game/duel/config'
import { glyphSvgPath, GLYPH_INK, GLYPH_INK_W, GLYPH_COL_W } from '@/game/duel/glyph'

/**
 * One rune glyph as inline SVG — the same polyline the canvas draws (see
 * `game/duel/glyph.ts`), so a slot, a shop plate and the snap flash can never
 * disagree about what a rune looks like. Sized by its box (`size` px, or 100%
 * of the parent when omitted); decorative, so the caller owns the label.
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
</script>

<template lang="pug">
  svg.rune-glyph(
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
</style>
