<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { BOX, RUNE_IDS } from '@/game/duel/config'
import { hudLayout } from '@/use/useDuelHud'
import RuneGlyph from '@/components/duel/RuneGlyph.vue'

/**
 * The runes she KNOWS, as small painted chips along the pad's bottom edge —
 * for her first few duels only (`lesson.chipsDue`: nodes 0–2 on first play,
 * never during the lesson). The playtest's testers forgot the square existed
 * the moment its guide was gone; a row of the shapes she owns is the quietest
 * reminder there is.
 *
 * QUIET BY DESIGN: small, at the pad's edge and never its centre, a little
 * translucent, and display-only — a stroke may start right on top of one
 * (the whole HUD layer takes no pointer events). The glyph is `RuneGlyph`, so
 * with the art layer on the chips show the PAINTED rune, like the slots.
 *
 * LANDSCAPE sits inside the scaled stage layer, in stage units, just inside
 * the drawing box's bottom edge. PORTRAIT sits on the pad in CSS px, above the
 * button bar.
 *
 * THE CAPTION (`caption`, the second playtest: "legend or buttons?"): the
 * first duel they appear in, a tiny "Your runes" rides just above the row —
 * the same words a screen reader already hears for her slots. It never moves
 * the chips: it hangs off the row, outside its box.
 */
const props = defineProps<{ mask: number; portrait: boolean; caption?: boolean }>()
const { t } = useI18n()

const runes = computed(() => {
  const out: number[] = []
  for (let r = 0; r < RUNE_IDS.length; r++) if ((props.mask >> r) & 1) out.push(r)
  return out
})

const rowStyle = computed(() => {
  if (!props.portrait) {
    // Stage units: 38-unit chips on the box's inner bottom edge.
    return { left: `${BOX.x + BOX.w / 2}px`, top: `${BOX.y + BOX.h - 26}px`, '--chip': '38px', '--gap': '8px' }
  }
  const z = hudLayout.value.zonePx
  const size = Math.round(Math.max(26, Math.min(40, z.w * 0.085, z.h * 0.12)))
  return {
    left: `${z.x + z.w / 2}px`,
    top: `${z.y + z.h - size / 2 - 10}px`,
    '--chip': `${size}px`,
    '--gap': `${Math.round(size * 0.22)}px`
  }
})
</script>

<template lang="pug">
  div.rune-chips(:style="rowStyle")
    span.chips-caption.ink-text(v-if="caption") {{ t('hud.yourRunes') }}
    div.rune-chip(v-for="r in runes" :key="r" role="img" :aria-label="t('rune.' + RUNE_IDS[r])")
      RuneGlyph.chip-glyph(:rune="r")
</template>

<style scoped lang="sass">
.rune-chips
  position: absolute
  display: flex
  gap: var(--gap)
  transform: translate(-50%, -50%)
  pointer-events: none
  opacity: 0.78

.rune-chip
  position: relative
  width: var(--chip)
  height: var(--chip)
  box-sizing: border-box
  border-radius: 50%
  background: var(--am-paper)
  border: 2px solid var(--am-ink)
  box-shadow: var(--am-shadow-chip)

.chip-glyph
  position: absolute
  left: 6%
  top: 6%
  width: 88%
  height: 88%

// "Your runes", hung just above the row and centred on it, small — a label,
// not a call to action — in the arena's shout ink (white in a plum outline,
// `.ink-text`), which reads on every backdrop the pad has.
.chips-caption
  position: absolute
  left: 50%
  bottom: calc(100% + var(--gap) * 0.6)
  transform: translateX(-50%)
  font-size: calc(var(--chip) * 0.42)
  line-height: 1.2
</style>
