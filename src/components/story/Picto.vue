<script setup lang="ts">
/** One bubble pictogram (story-spec §10.6). Decorative to a screen reader:
 *  the bubble's own text carries the words.
 *
 *  PAINTED when the art layer is on and its set has decoded (paint-outstanding
 *  P5, `artIds.PICTO_SETS`): one panel of the set's strip, seated over this
 *  48-unit box by the strip's own box (`itemBox`, the box the slicer cut), so
 *  the painting lands where the drawing was. The drawing otherwise — exactly
 *  as before, and for any pictogram no set carries. */
import { computed } from 'vue'
import { PICTOS } from './pictos'
import { PICTO_SET_ART } from './pictoArt'
import type { Picto } from '@/game/story/story'
import { pictoSetArtId, pictoSlot } from '@/game/artIds'
import { spriteFor } from '@/game/art'
import { itemBox } from '@/game/artItem'
import { useArtImage } from '@/use/useArtImage'

const props = defineProps<{ name: Picto }>()
const parts = computed(() => PICTOS[props.name] ?? [])

const slot = computed(() => pictoSlot(props.name))
const src = useArtImage('worldUi', () => (slot.value ? pictoSetArtId(slot.value.set) : ''))

/** Where panel `slot.panel` of the painted strip goes, in the 48-unit box. */
const art = computed(() => {
  const s = slot.value
  if (!src.value || !s) return null
  const img = spriteFor('worldUi', pictoSetArtId(s.set))
  const spec = PICTO_SET_ART[s.set]
  if (!img?.naturalWidth || !spec) return null
  const box = itemBox(spec)
  const fw = img.naturalWidth / spec.frames
  return {
    href: src.value,
    x: 24 + box.x * 48,
    y: 24 + box.y * 48,
    w: box.w * 48,
    h: box.h * 48,
    viewBox: `${s.panel * fw} 0 ${fw} ${img.naturalHeight}`,
    iw: img.naturalWidth,
    ih: img.naturalHeight
  }
})
</script>

<template lang="pug">
  svg.picto(viewBox="0 0 48 48" aria-hidden="true")
    svg(
      v-if="art"
      :x="art.x"
      :y="art.y"
      :width="art.w"
      :height="art.h"
      :viewBox="art.viewBox"
      preserveAspectRatio="none"
    )
      image(:href="art.href" x="0" y="0" :width="art.iw" :height="art.ih")
    g(v-else)
      path(
        v-for="(p, i) in parts"
        :key="i"
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
