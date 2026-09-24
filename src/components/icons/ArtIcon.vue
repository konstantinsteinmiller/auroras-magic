<script setup lang="ts">
import { computed } from 'vue'
import GameIcon from '@/components/icons/GameIcon.vue'
import type { GameIconName } from '@/components/icons/iconNames'
import { spriteFor, type ArtKind } from '@/game/art'
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
 *
 * A painting that is a STRIP (`frames` > 1 — the boss chest is shut and open
 * side by side) shows one panel of it, `frame`, contained the same way: an
 * SVG whose viewBox is that panel, so nothing of its neighbour shows.
 */
const props = withDefaults(defineProps<{
  kind: ArtKind
  id: string
  /** The glyph drawn until a painting exists. */
  fallback: GameIconName
  /** Panels in the painting's strip, and the one to show. */
  frames?: number
  frame?: number
}>(), { frames: 1, frame: 0 })

const painted = useArtImage(props.kind, () => props.id)

const src = computed<string | null>(() => painted.value)

/** One panel of a strip: its viewBox in the strip's own pixels. */
const panel = computed(() => {
  if (!src.value || props.frames <= 1) return null
  const img = spriteFor(props.kind, props.id)
  if (!img?.naturalWidth) return null
  const fw = img.naturalWidth / props.frames
  const f = Math.max(0, Math.min(props.frames - 1, props.frame))
  return { viewBox: `${f * fw} 0 ${fw} ${img.naturalHeight}`, w: img.naturalWidth, h: img.naturalHeight }
})
</script>

<template lang="pug">
  svg.art-icon.is-painted(v-if="src && panel" :viewBox="panel.viewBox" preserveAspectRatio="xMidYMid meet" aria-hidden="true")
    image(:href="src" x="0" y="0" :width="panel.w" :height="panel.h")
  img.art-icon.is-painted(v-else-if="src && frames <= 1" :src="src" alt="" draggable="false" aria-hidden="true")
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
