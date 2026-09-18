<script setup lang="ts">
/** One bubble pictogram (story-spec §10.6). Decorative to a screen reader:
 *  the bubble's own text carries the words. */
import { computed } from 'vue'
import { PICTOS } from './pictos'
import type { Picto } from '@/game/story/story'

const props = defineProps<{ name: Picto }>()
const parts = computed(() => PICTOS[props.name] ?? [])
</script>

<template lang="pug">
  svg.picto(viewBox="0 0 48 48" aria-hidden="true")
    template(v-for="(p, i) in parts" :key="i")
      path(
        :d="p.d"
        :fill="p.fill"
        stroke="#3A2340"
        :stroke-width="p.stroke ? 4 : 2.6"
        stroke-linejoin="round"
        stroke-linecap="round"
      )
</template>

<style scoped lang="sass">
.picto
  display: block
  width: 100%
  height: 100%
  overflow: visible
</style>
