<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue'
import { RUNES } from '@/game/duel/config'
import { glyphPoints, GLYPH_INK, GLYPH_INK_W, GLYPH_COL_W } from '@/game/duel/glyph'
import { runeArtId } from '@/game/artIds'
import { useArtImage } from '@/use/useArtImage'

/**
 * A rune glyph that can DRAW ITSELF — the spellbook's reference strip
 * (story-spec §3.9.1): tap a rune and its stroke is traced once, in the
 * order a finger would draw it. Each bump of `play` restarts the trace.
 *
 * `locked` shows the silhouette a locked map node wears: a dim, flat shape
 * with a little lock — the rune exists, it is just not yours yet.
 *
 * PAINTED AT REST. With the art layer on and the rune's painting decoded, the
 * glyph at rest is the painting — the same `<image>` in the same 100-unit box
 * `RuneGlyph` shows, so the strip above the spellbook's list and the list
 * itself show one rune, not a drawing over a painting. The TRACE stays drawn:
 * it teaches the shape stroke by stroke, and a painting cannot be drawn in
 * the order a finger makes it. While a trace runs the painting steps aside;
 * the finished stroke holds for a beat and the painting settles back over it.
 * A locked rune is the painting drained of colour and dimmed, under the same
 * little lock — at full strength, so "not yours yet" reads at a glance.
 * Without the painting (art off, or not decoded yet) everything is drawn,
 * exactly as before.
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
/** How long the finished stroke holds before the painting returns, seconds. */
const HOLD = 0.45

const subs = computed(() =>
  glyphPoints(props.rune, 50, 50, R).paths.map((sub) =>
    sub.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join('')))
const color = computed(() => RUNES[props.rune]?.[0] ?? '#fff')
const each = computed(() => DUR / Math.max(1, subs.value.length))

const painted = useArtImage('rune', () => runeArtId(props.rune))
/** The desaturating filter a locked painting wears. Per instance: an SVG
 *  filter is looked up by document id, and twelve tiles share one page. */
const drain = `rt-drain-${useId()}`

/** A trace is running (or holding its last frame): the strokes are up. */
const tracing = ref(false)
let settle = 0
watch(() => props.play, (p) => {
  window.clearTimeout(settle)
  tracing.value = p > 0
  if (p > 0) settle = window.setTimeout(() => { tracing.value = false }, (DUR + HOLD) * 1000)
}, { immediate: true })
onBeforeUnmount(() => window.clearTimeout(settle))

/** The drawn strokes show without a painting, and over one only mid-trace. */
const strokesUp = computed(() => !painted.value || tracing.value)
</script>

<template lang="pug">
  svg.rune-trace(
    viewBox="0 0 100 100"
    :width="size"
    :height="size"
    :class="{ locked, painted: !!painted }"
    aria-hidden="true"
    focusable="false"
  )
    template(v-if="painted")
      defs(v-if="locked")
        filter(:id="drain" color-interpolation-filters="sRGB")
          feColorMatrix(type="saturate" values="0")
      image.paint(
        :href="painted"
        x="0"
        y="0"
        width="100"
        height="100"
        preserveAspectRatio="xMidYMid meet"
        :filter="locked ? `url(#${drain})` : undefined"
        :class="{ away: !locked && tracing }"
      )
    template(v-if="locked")
      template(v-if="!painted")
        path.ghost-stroke(v-for="(d, i) in subs" :key="`l${i}`" :d="d" fill="none" stroke="currentColor" :stroke-width="R * GLYPH_INK_W" stroke-linecap="round" stroke-linejoin="round")
      g(transform="translate(66 64)")
        rect.lock-body(x="-9" y="-2" width="18" height="15" rx="3" stroke-width="3")
        path.lock-shackle(d="M-5 -2 V-6 A5 5 0 0 1 5 -6 V-2" fill="none" stroke-width="3")
    g.strokes(v-else :class="{ away: !strokesUp }")
      g(v-for="(d, i) in subs" :key="`${play}-${i}`" :class="{ trace: play > 0 }" :style="{ '--d': `${each}s`, '--dl': `${i * each}s` }")
        path(:d="d" pathLength="1" fill="none" :stroke="GLYPH_INK" :stroke-width="R * GLYPH_INK_W" stroke-linecap="round" stroke-linejoin="round")
        path(:d="d" pathLength="1" fill="none" :stroke="color" :stroke-width="R * GLYPH_COL_W" stroke-linecap="round" stroke-linejoin="round")
</template>

<style scoped lang="sass">
.rune-trace
  display: block
  overflow: visible
  pointer-events: none
  // The locked silhouette sits on the spellbook's PARCHMENT, so it has to be
  // darker than the page, not lighter. `--am-ink-soft` (22 % plum) would have
  // been 12 % once this 0.55 had multiplied it — about 1.25:1 against the
  // tile, i.e. gone. `--am-ink-2` is the token that matches the muted violet
  // the ghost was drawn in, and survives the fade.
  &.locked
    opacity: 0.55
    color: var(--am-ink-2)
  // A locked PAINTING dims itself (below) and leaves the lock at full
  // strength: the colour is what it has lost, the lock is why.
  &.locked.painted
    opacity: 1

// The painting and the strokes trade places around a trace: the painting
// steps aside as the stroke starts, and settles back once it has held.
.paint, .strokes
  transition: opacity var(--am-dur-enter) var(--am-ease-out)
  &.away
    opacity: 0

.locked .paint
  opacity: 0.5

// The little lock stays pale and plum-inked, as it was: a dark chip would
// read as a blot on a tile that is already faded to 55 %.
.lock-body
  fill: var(--am-lilac)
  stroke: var(--am-ink)

.lock-shackle
  stroke: var(--am-ink)

.trace path
  stroke-dasharray: 1 1
  stroke-dashoffset: 1
  animation: rune-trace var(--d) ease-in-out var(--dl) forwards

@keyframes rune-trace
  to
    stroke-dashoffset: 0
</style>
