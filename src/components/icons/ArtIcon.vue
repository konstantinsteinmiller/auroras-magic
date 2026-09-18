<script setup lang="ts">
import { computed } from 'vue'
import GameIcon from '@/components/icons/GameIcon.vue'
import type { GameIconName } from '@/components/icons/iconNames'
import type { ArtKind } from '@/game/art'
import { useArtImage } from '@/use/useArtImage'

/**
 * A glyph the art pipeline can repaint.
 *
 * Two rungs, best first: the PAINTING at `images/<kind>/<id>.webp` once it
 * exists and the art layer is on; and the shared glyph, which every button
 * falls back to and which is what a fresh clone and a portal build with the
 * flag off show.
 *
 * Both branches are the component's single root, so a parent's sizing class
 * lands on whichever is showing; the bitmap is `object-fit: contain`, so it
 * sits in the glyph's box rather than stretching to it.
 */
const props = defineProps<{
  kind: ArtKind
  id: string
  /** The glyph drawn until a painting exists. */
  fallback: GameIconName
}>()

const painted = useArtImage(props.kind, () => props.id)

const src = computed<string | null>(() => painted.value)
</script>

<template lang="pug">
  img.art-icon.is-painted(v-if="src" :src="src" alt="" draggable="false" aria-hidden="true")
  GameIcon.art-icon(v-else :name="fallback")
</template>

<style scoped lang="sass">
.art-icon
  display: block
  width: 100%
  height: 100%
  object-fit: contain
  // Decoration on a button; the press belongs to the button underneath.
  pointer-events: none
</style>
