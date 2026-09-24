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
 * With the art layer on and `images/runes/rune-<name>.webp` decoded, the
 * PAINTED rune (S6) takes the same box. The canvas traces (the snap, the
 * reveal, the onboarding) stay drawn — a trace is motion, not a picture — and
 * so does `RuneTrace` while it is tracing.
 *
 * THE PAINTING IS AN `<image>` INSIDE THIS SAME SVG, not an `<img>` beside it.
 * The painting was cut from exactly this 100-unit box (`artDraw.RUNE_BOX`), so
 * placed at 0 0 100 100 it lands where the stroke was — and because the root
 * element is the same `<svg>` whichever of the two is showing, every caller's
 * sizing resolves identically for both. It did not with an `<img>`: its
 * inline `width: 100%` outranked the portrait HUD's `.port-weak-glyph` size
 * (the weakness rune drew at 69 px instead of 34 and pushed its "x2" off the
 * row), and a replaced element ignores the `inset` a queue slot centres its
 * glyph with, so every painted slot rune sat 2 px low-right, overhanging its
 * plate.
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
</script>

<template lang="pug">
  svg.rune-glyph(
    viewBox="0 0 100 100"
    :class="{ 'is-painted': !!painted }"
    :width="size"
    :height="size"
    :style="{ opacity: alpha }"
    aria-hidden="true"
    focusable="false"
  )
    image(
      v-if="painted"
      :href="painted"
      x="0"
      y="0"
      width="100"
      height="100"
      preserveAspectRatio="xMidYMid meet"
    )
    template(v-else)
      path(:d="d" fill="none" :stroke="GLYPH_INK" :stroke-width="R * GLYPH_INK_W" stroke-linecap="round" stroke-linejoin="round")
      path(:d="d" fill="none" :stroke="color" :stroke-width="R * GLYPH_COL_W" stroke-linecap="round" stroke-linejoin="round")
</template>

<style scoped lang="sass">
.rune-glyph
  display: block
  overflow: visible
  pointer-events: none
  user-select: none
</style>
