<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { hud, hudLayout } from '@/use/useDuelHud'
import { reducedMotion } from '@/use/useAccessibility'

/**
 * The first duel's lightbox (`game/duel/lesson.ts`, beat C): for exactly two
 * seconds a soft plum scrim dims the whole duel except a spotlight cut round
 * the player's filled rune slots — the two runes she just drew, glowing, so
 * "stored" becomes a thing she has SEEN. Wordless: a gold ring and two tiny
 * sparkles are the whole message.
 *
 * The spotlight is measured off the slots themselves (`[data-my-slot]` in
 * `DuelHud.vue`), not recomputed from layout maths, so the one component is
 * right in landscape (the scaled stage layer) and in portrait (the flexed HUD
 * band) alike, and re-measured on every resize or rotation. The cut-out is
 * one element with a screen-sized `box-shadow`: the scrim IS its shadow, so
 * the hole can never drift from the ring drawn round it.
 *
 * It takes no pointer events (the lesson itself refuses strokes for these two
 * seconds), and it pauses with the rest of the HUD (`.duel-paused`). Reduced
 * motion: the same picture, held still — no fade, no pulse, no twinkle.
 */
const root = ref<HTMLElement | null>(null)
const hole = ref<{ x: number; y: number; w: number; h: number; r: number } | null>(null)

const measure = (): void => {
  const host = root.value?.closest('.duel-hud')
  if (!host) return
  const n = Math.max(1, hud.queue.length)
  const rects = [...host.querySelectorAll<HTMLElement>('[data-my-slot]')]
    .slice(0, n)
    .map((el) => el.getBoundingClientRect())
    .filter((r) => r.width > 0 && r.height > 0)
  if (!rects.length) {
    hole.value = null
    return
  }
  const box = host.getBoundingClientRect()
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const r of rects) {
    x0 = Math.min(x0, r.left)
    y0 = Math.min(y0, r.top)
    x1 = Math.max(x1, r.right)
    y1 = Math.max(y1, r.bottom)
  }
  // Room round the runes for their glow, and for the ring to sit clear of
  // the slot plates rather than on them.
  const pad = Math.max(8, rects[0]!.height * 0.24)
  hole.value = {
    x: x0 - pad - box.left,
    y: y0 - pad - box.top,
    w: x1 - x0 + 2 * pad,
    h: y1 - y0 + 2 * pad,
    r: Math.max(12, rects[0]!.height * 0.42)
  }
}

onMounted(() => { void nextTick(measure) })
watch(() => [hudLayout.value, hud.queue.length], () => { void nextTick(measure) })

const holeStyle = computed(() => {
  const h = hole.value
  const px = (v: number): string => `${Math.round(v * 10) / 10}px`
  return h
    ? { left: px(h.x), top: px(h.y), width: px(h.w), height: px(h.h), borderRadius: px(h.r) }
    : undefined
})
</script>

<template lang="pug">
  div.lesson-lightbox(ref="root" :class="{ still: reducedMotion }" aria-hidden="true")
    div.lb-hole(v-if="hole" :style="holeStyle")
      span.lb-spark.a
      span.lb-spark.b
</template>

<style scoped lang="sass">
.lesson-lightbox
  position: absolute
  inset: 0
  pointer-events: none
  overflow: hidden
  animation: lb-in var(--am-dur-enter) var(--am-ease-out) both

// The hole: transparent, ringed in the lesson's gold, and casting the scrim
// as its own screen-sized shadow.
.lb-hole
  position: absolute
  box-sizing: border-box
  border: 3px solid var(--am-gold)
  box-shadow: 0 0 0 200vmax var(--am-scrim)
  animation: lb-ring 1s ease-in-out infinite alternate

// Two wordless twinkles on the ring's top corners.
.lb-spark
  position: absolute
  width: 18px
  height: 18px
  background: var(--am-magic-5)
  clip-path: var(--am-spark-clip)
  animation: lb-twinkle 0.9s ease-in-out infinite alternate
  &.a
    left: -10px
    top: -10px
  &.b
    right: -10px
    top: -10px
    animation-delay: -0.45s

.still, .still .lb-hole, .still .lb-spark
  animation: none

@keyframes lb-in
  from
    opacity: 0
  to
    opacity: 1

@keyframes lb-ring
  from
    border-color: var(--am-gold)
  to
    border-color: var(--am-magic-5)

@keyframes lb-twinkle
  from
    transform: scale(0.6) rotate(0deg)
    opacity: 0.6
  to
    transform: scale(1.15) rotate(45deg)
    opacity: 1
</style>
