<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SPELLS, SW, SH } from '@/game/duel/config'
import { hudLayout } from '@/use/useDuelHud'
import { S } from '@/game/duel/state'
import RuneGlyph from '@/components/duel/RuneGlyph.vue'

/**
 * The spellbook tome (GDD 5.2) — every combination, the undiscovered ones as
 * "? ? ?". Behind the `SPELLBOOK` flag (off, as in the jam build). Fitted to
 * the viewport on its own, so it reads in both orientations.
 */
const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()

/* singles, then pairs, then triples — a readable page */
const KEYS = Object.keys(SPELLS).sort((a, b) => a.length - b.length)

const fit = computed(() => {
  const L = hudLayout.value
  const s = Math.min(L.w / SW, L.h / SH)
  return {
    width: `${SW}px`,
    height: `${SH}px`,
    transform: `translate(${(L.w - SW * s) / 2}px, ${(L.h - SH * s) / 2}px) scale(${s})`
  }
})
const cell = (i: number) => ({ left: `${152 + (i % 3) * 340}px`, top: `${164 + Math.floor(i / 3) * 60}px` })
</script>

<template lang="pug">
  div.spellbook(@click="emit('close')")
    div.dim
    div.fit(:style="fit")
      div.tome.duel-plate
        div.page.duel-plate
      span.title.ink-text.ink-none {{ t('book.title') }}
      template(v-for="(k, i) in KEYS" :key="k")
        div.entry(:style="cell(i)")
          template(v-if="S.seen[k]")
            span.glyphs
              RuneGlyph(v-for="(r, j) in k.split('')" :key="j" :rune="+r" :size="40")
            span.ink-text.ink-none.name {{ t(`spell.${SPELLS[k]?.[0]}`) }}
          span.ink-text.ink-none.unknown(v-else) {{ t('book.unknown') }}
      button.close.ink-text(:aria-label="t('close')" @click.stop="emit('close')") ✕
</template>

<style scoped lang="sass">
.spellbook
  position: absolute
  inset: 0
  pointer-events: auto

.dim
  position: absolute
  inset: 0
  background: rgba(6, 4, 12, 0.77)

.fit
  position: absolute
  left: 0
  top: 0
  transform-origin: 0 0

.tome
  --lw: 8px
  position: absolute
  left: 106px
  top: 44px
  width: 1068px
  height: 632px
  background: #4b2f1c
  border-radius: 32px

.page
  position: absolute
  left: 10px
  top: 10px
  right: 10px
  bottom: 10px
  background: #f2e3c0

.title
  position: absolute
  left: 640px
  top: 106px
  transform: translate(-50%, -50%)
  font-size: 40px
  color: #2a1608

.entry
  position: absolute
  display: flex
  align-items: center
  transform: translateY(-50%)
  height: 44px

.glyphs
  display: flex
  width: 118px
  margin-left: -20px
  > *
    margin-right: -12px

.name
  font-size: 24px
  color: #2a1608

.unknown
  font-size: 26px
  color: #b3a184
  margin-left: -12px

.close
  position: absolute
  left: 1110px
  top: 104px
  transform: translate(-50%, -50%)
  font-size: 34px
  color: #ffd76a
  background: none
  border: none
  cursor: pointer
</style>
