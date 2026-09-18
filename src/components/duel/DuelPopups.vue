<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { hudPops, hudLayout } from '@/use/useDuelHud'
import { POP_LIFE, type Pop } from '@/game/duel/state'

/**
 * The floating callouts — "NOT A RUNE", "-12", "WEAK! -20", the spell name,
 * "VICTORY". The sim queues them (`pop()`), the frame loop ages and retires
 * them, and this component only renders the list: the rise / shrink / fade is
 * one CSS animation, paused with the rest of the HUD while the game is.
 *
 * Landscape renders inside the scaled stage layer, so a callout sits at its
 * stage coordinates exactly as the jam build drew it (46 px type, rising 84
 * units). Portrait maps the stage point to the screen and keeps a legible
 * floor on the type — the stage is a quarter scale on a phone held upright.
 */
const props = defineProps<{ portrait: boolean }>()
const { t } = useI18n()

const text = (p: Pop): string => {
  if (p.k === 'spell') {
    const name = t(`spell.${p.p?.spell ?? 'wildSurge'}`)
    const n = Number(p.p?.n ?? 1)
    return n > 1 ? `${name}  ${t('pop.times', { n })}` : name
  }
  return t(`pop.${p.k}`, p.p ?? {})
}

const scale = computed(() => {
  const L = hudLayout.value
  return props.portrait ? Math.max(L.vs, 20 / 46) : 1
})

const style = (p: Pop) => {
  const L = hudLayout.value
  const x = props.portrait ? L.vx + p.x * L.vs : p.x
  const y = props.portrait ? L.vy + p.y * L.vs : p.y
  return {
    left: `${x}px`,
    top: `${y}px`,
    color: p.c,
    fontSize: `${46 * scale.value}px`,
    '--k': String(scale.value),
    // A callout that is re-rendered mid-flight (a locale switch, a resize)
    // resumes where it was instead of restarting.
    animationDelay: `${-p.a}s`,
    animationDuration: `${POP_LIFE}s`
  }
}
</script>

<template lang="pug">
  div.duel-pops(:class="{ fixed: portrait }" aria-live="polite")
    span.duel-pop.ink-text(v-for="p in hudPops" :key="p.id" :style="style(p)") {{ text(p) }}
</template>

<style scoped lang="sass">
.duel-pops
  position: absolute
  inset: 0
  pointer-events: none

.duel-pop
  position: absolute
  animation-name: duel-pop
  animation-timing-function: linear
  animation-fill-mode: both
</style>
