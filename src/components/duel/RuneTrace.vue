<script setup lang="ts">
import { computed } from 'vue'
import { RUNES } from '@/game/duel/config'
import { glyphPoints, GLYPH_INK, GLYPH_INK_W, GLYPH_COL_W } from '@/game/duel/glyph'

/**
 * A rune glyph that can DRAW ITSELF — the spellbook's reference strip
 * (story-spec §3.9.1): tap a rune and its stroke is traced once, in the
 * order a finger would draw it. Each bump of `play` restarts the trace.
 *
 * `locked` shows the silhouette a locked map node wears: a dim, flat shape
 * with a little lock — the rune exists, it is just not yours yet.
 */
const props = withDefaults(defineProps<{
  rune: number
  size?: number
  locked?: boolean
  /** Bump to replay the trace; 0 draws it whole. */
  play?: number
}>(), { size: 48, locked: false, play: 0 })

const R = 30
/** Trace time for the whole glyph, seconds; multi-stroke glyphs split it. */
const DUR = 0.9

const subs = computed(() =>
  glyphPoints(props.rune, 50, 50, R).paths.map((sub) =>
    sub.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join('')))
const color = computed(() => RUNES[props.rune]?.[0] ?? '#fff')
const each = computed(() => DUR / Math.max(1, subs.value.length))
</script>

<template lang="pug">
  svg.rune-trace(
    viewBox="0 0 100 100"
    :width="size"
    :height="size"
    :class="{ locked }"
    aria-hidden="true"
    focusable="false"
  )
    template(v-if="locked")
      path(v-for="(d, i) in subs" :key="`l${i}`" :d="d" fill="none" stroke="#6f5f86" :stroke-width="R * GLYPH_INK_W" stroke-linecap="round" stroke-linejoin="round")
      g(transform="translate(66 64)")
        rect(x="-9" y="-2" width="18" height="15" rx="3" fill="#a99dc0" stroke="#3A2340" stroke-width="3")
        path(d="M-5 -2 V-6 A5 5 0 0 1 5 -6 V-2" fill="none" stroke="#3A2340" stroke-width="3")
    template(v-else)
      g(v-for="(d, i) in subs" :key="`${play}-${i}`" :class="{ trace: play > 0 }" :style="{ '--d': `${each}s`, '--dl': `${i * each}s` }")
        path(:d="d" pathLength="1" fill="none" :stroke="GLYPH_INK" :stroke-width="R * GLYPH_INK_W" stroke-linecap="round" stroke-linejoin="round")
        path(:d="d" pathLength="1" fill="none" :stroke="color" :stroke-width="R * GLYPH_COL_W" stroke-linecap="round" stroke-linejoin="round")
</template>

<style scoped lang="sass">
.rune-trace
  display: block
  overflow: visible
  pointer-events: none
  &.locked
    opacity: 0.55

.trace path
  stroke-dasharray: 1 1
  stroke-dashoffset: 1
  animation: rune-trace var(--d) ease-in-out var(--dl) forwards

@keyframes rune-trace
  to
    stroke-dashoffset: 0
</style>
