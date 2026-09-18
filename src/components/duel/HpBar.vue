<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { registerHot } from '@/use/useDuelHud'

/**
 * A duelist's HP bar: a dark plate, a red "ghost" that lags behind the real
 * value (so damage drains as a visible chunk), and the fill. The two widths
 * change every frame while they animate, so they are NOT bound through Vue —
 * `useDuelHud.syncHud` writes them straight onto these elements.
 */
const props = defineProps<{
  side: 'left' | 'right'
  name: string
  color: string
  /** Screen-reader text; the bar itself is decorative. */
  label: string
}>()

const fill = ref<HTMLElement | null>(null)
const ghost = ref<HTMLElement | null>(null)

onMounted(() => {
  if (props.side === 'left') {
    registerHot('hpFill', fill.value)
    registerHot('hpGhost', ghost.value)
  } else {
    registerHot('ehpFill', fill.value)
    registerHot('ehpGhost', ghost.value)
  }
})
onUnmounted(() => {
  if (props.side === 'left') {
    registerHot('hpFill', null)
    registerHot('hpGhost', null)
  } else {
    registerHot('ehpFill', null)
    registerHot('ehpGhost', null)
  }
})
</script>

<template lang="pug">
  div.hp-bar.duel-plate(:class="side" role="img" :aria-label="label")
    div.hp-track
      div.hp-ghost(ref="ghost")
      div.hp-fill(ref="fill" :style="{ background: color }")
    span.hp-name.ink-text {{ name }}
</template>

<style scoped lang="sass">
// Sized by the parent. The jam build's plate was 366x46 stage units, radius
// 23, a 5-unit ink outline; the fill sits 5 units inside the plate's path.
.hp-bar
  --lw: 5px
  position: relative
  width: 100%
  height: 100%
  border-radius: 999px
  background: #1a1230

.hp-track
  position: absolute
  inset: 2.5px

.hp-ghost, .hp-fill
  position: absolute
  top: 0
  bottom: 0
  width: 100%
  border-radius: 999px

.hp-ghost
  background: #ff4d63

.left
  .hp-ghost, .hp-fill
    left: 0
  .hp-name
    left: 0.55em
.right
  .hp-ghost, .hp-fill
    right: 0
  .hp-name
    right: 0.55em

.hp-name
  position: absolute
  top: 50%
  transform: translateY(-50%)
  font-size: var(--hp-font, 27px)
</style>
