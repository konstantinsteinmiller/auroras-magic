<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { runeArtId } from '@/game/artIds'
import { useArtImage } from '@/use/useArtImage'
import { drawnGlyphUrl, runeSlug } from '@/components/preview/previewSizes'

/**
 * One rune on the VS preview: the `RuneChips` look — a paper disc in a plum
 * line with the rune on it — as ONE element.
 *
 * The rune is the PAINTED icon when the art layer has it (`images/runes/
 * rune-<name>.webp`, the same file `RuneGlyph` shows) and the drawn glyph
 * otherwise, both as the disc's background over the same 100-unit box, so
 * the two land in the same place. One element rather than `RuneGlyph`'s
 * `<svg>` with its two paths, because the hero's row can be all twelve runes
 * and the preview has a DOM budget of ~45 nodes for everything.
 *
 * Sized by the parent (`--rs`). The name is read aloud (`rune.<name>`).
 */
const props = defineProps<{ rune: number }>()
const { t } = useI18n()

const painted = useArtImage('rune', () => runeArtId(props.rune))
const src = computed(() => (painted.value ? `url("${painted.value}")` : drawnGlyphUrl(props.rune)))
</script>

<template lang="pug">
  span.pv-rune(role="img" :aria-label="t('rune.' + runeSlug(rune))" :style="{ backgroundImage: src }")
</template>

<style scoped lang="sass">
.pv-rune
  display: block
  flex: none
  box-sizing: border-box
  width: var(--rs, 40px)
  height: var(--rs, 40px)
  border-radius: 50%
  border: max(1.5px, calc(var(--rs, 40px) * 0.06)) solid var(--am-ink)
  background-color: var(--am-paper)
  background-repeat: no-repeat
  background-position: center
  background-size: 92%
  box-shadow: var(--am-shadow-chip)
</style>
