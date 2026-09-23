<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { registerHot, releaseHot } from '@/use/useDuelHud'

/**
 * A duelist's HP bar: a dark trough, a coral "ghost" that lags behind the
 * real value (so damage drains as a visible chunk), and the fill.
 *
 * It is one of the only two dark plates the UI keeps (§2.5). A gauge reads
 * dark-to-bright, and a cream trough would force its own fill darker than its
 * plate and invert the game's whole read.
 *
 * The two widths change every frame while they animate, so they are NOT bound
 * through Vue — `useDuelHud.syncHud` writes them straight onto these elements.
 */
const props = defineProps<{
  side: 'left' | 'right'
  name: string
  color: string
  /** Screen-reader text; the bar itself is decorative. */
  label: string
}>()

const root = ref<HTMLElement | null>(null)
const fill = ref<HTMLElement | null>(null)
const ghost = ref<HTMLElement | null>(null)
// The foe's plate is also the target of the hidden QA ad chord. It is hit-tested
// by the scene, so it is registered here, and released only if still ours: the
// landscape and portrait HUDs each mount a bar and can swap in either order.
let foeBar: HTMLElement | null = null

onMounted(() => {
  if (props.side === 'left') {
    registerHot('hpFill', fill.value)
    registerHot('hpGhost', ghost.value)
  } else {
    registerHot('ehpFill', fill.value)
    registerHot('ehpGhost', ghost.value)
    foeBar = root.value
    registerHot('ehpBar', foeBar)
  }
})
onUnmounted(() => {
  if (props.side === 'left') {
    registerHot('hpFill', null)
    registerHot('hpGhost', null)
  } else {
    registerHot('ehpFill', null)
    registerHot('ehpGhost', null)
    releaseHot('ehpBar', foeBar)
  }
})
</script>

<template lang="pug">
  div.hp-bar.duel-plate(ref="root" :class="side" role="img" :aria-label="label")
    div.hp-track
      div.hp-ghost(ref="ghost")
      div.hp-fill(ref="fill" :style="{ background: color }")
    span.hp-name.ink-text {{ name }}
</template>

<style scoped lang="sass">
// Sized by the parent. The jam build's plate was 366x46 stage units, radius
// 23, a 5-unit ink outline; the fill sits 5 units inside the plate's path.
// The outline is 4px now: plum at 5px reads heavier than the near-black did.
.hp-bar
  --lw: 4px
  position: relative
  width: 100%
  height: 100%
  border-radius: 999px
  // the unfilled trough: a well cut into the night plate (§3.13)
  background: var(--am-night-deep)
  // a gauge takes no page-lift, so the one `.duel-plate` gives is dropped
  box-shadow: none

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
  background: var(--am-coral-foot)

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
