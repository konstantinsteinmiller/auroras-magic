<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { previewHud, type PreviewChip } from '@/game/preview/previewHud'
import { PREVIEW_DOM as D } from '@/game/preview/preview'
import { vFit } from '@/use/vFit'
import PreviewRune from '@/components/preview/PreviewRune.vue'
import GameIcon from '@/components/icons/GameIcon.vue'
import { RUNE_GAP, chipLayout, runeSize, unitOf } from '@/components/preview/previewSizes'

/**
 * A duelist's title and POWERS on the VS preview, as one block.
 *
 * First her EPITHET — "Keeper of the Runes", "Guardian of Bubble Bay",
 * "Umbra's Shadow" — in cream-gold shout type. Then:
 *
 * Aurora's powers: every rune she can draw in this duel, captioned "Your
 * runes" — the preview is the one calm moment before a fight to show a child
 * the whole book she has collected. They pop in one by one (1.25 s + 0.07 s
 * each), as big as the block allows: one row in a wide landscape block,
 * a few rows in the tall, narrow one beside her in portrait
 * (`previewSizes.runeSize`).
 *
 * The foe's: her CHIPS — what she is weak to, what she RESISTS (her
 * strength, §6.6a: the pill leads with the HUD badge's shield, so it is never
 * read as a second weakness), and the chapter's magic she brings — each a
 * small paper pill with the rune on it (1.35 s + 0.10 s each), side by side,
 * or one above the other where the block is narrow. In local versus both
 * sides show a rune row and neither has chips.
 *
 * Anchored by the layout (`lay.heroPowers` / `lay.foePowers`): `y` is the
 * block's top, `x` its left edge, centre or right edge as `align` says, `w`
 * and `h` the most it may take, and every line is the height `PREVIEW_DOM`
 * reserves for it.
 */
const props = defineProps<{ side: 'hero' | 'foe' }>()
const { t } = useI18n()

const who = computed(() => previewHud[props.side])
const box = computed(() => (props.side === 'hero' ? previewHud.lay.heroPowers : previewHud.lay.foePowers))
const px = (v: number): string => `${v.toFixed(1)}px`

/** A narrow block (portrait: beside her, under her ribbon): its epithet may
 *  take two lines rather than shrink past reading — "Пузырьковая бухта —
 *  Хранительница" is 34 letters in 150 px — and the room for her runes or
 *  chips is reckoned with that second line. */
const narrow = computed(() => box.value.w < 0.5 * unitOf(previewHud.lay))
const epiLines = computed(() => (narrow.value ? 2 : 1))
const chips = computed(() => chipLayout(previewHud.lay, box.value.w, box.value.h, epiLines.value, who.value.chips.length))

const style = computed(() => {
  const b = box.value
  const u = unitOf(previewHud.lay)
  const rs = runeSize(previewHud.lay, who.value.runes.length, b.w, b.h, epiLines.value)
  const shift = b.align === 'center' ? '-50%' : b.align === 'end' ? '-100%' : '0%'
  return {
    left: px(b.x),
    top: px(b.y),
    maxWidth: px(b.w),
    translate: `${shift} 0`,
    '--u': px(u),
    '--rs': px(rs),
    '--rg': px(rs * RUNE_GAP),
    '--lg': px(D.lineGap * u),
    '--eh': px(D.epithetH * u),
    '--caph': px(D.captionH * u),
    '--ch': px(chips.value.h)
  }
})

const epithet = computed(() => {
  const w = who.value
  if (!w.epithet) return ''
  const args: Record<string, string> = {}
  for (const [k, v] of Object.entries(w.epithetArgs ?? {})) args[k] = t(v)
  return t(w.epithet, args)
})

const CHIP_LABEL: Record<PreviewChip['kind'], string> = {
  weak: 'preview.weakTo',
  strong: 'preview.strongTo',
  magic: 'preview.magic'
}
const chipLabel = (c: PreviewChip): string => t(CHIP_LABEL[c.kind])
</script>

<template lang="pug">
  div.pw(:class="[side, box.align, { narrow }]" :style="style")
    span.pw-epi.ink-text(v-if="epithet" v-fit) {{ epithet }}
    template(v-if="who.runes.length")
      span.pw-cap.ink-text(v-fit) {{ t('preview.yourRunes') }}
      PreviewRune.pw-rune(v-for="(r, i) in who.runes" :key="r" :rune="r" :style="{ '--i': i }")
    div.pw-chips(v-if="who.chips.length" :class="{ stacked: chips.stacked }")
      span.pw-chip(v-for="(c, i) in who.chips" :key="c.kind" v-fit :class="'is-' + c.kind" :style="{ '--i': i }")
        GameIcon.pw-chip-shield(v-if="c.kind === 'strong'" name="shield")
        | {{ chipLabel(c) }}
        PreviewRune.pw-chip-rune(:rune="c.rune")
</template>

<style scoped lang="sass">
.pw
  position: absolute
  display: flex
  flex-wrap: wrap
  align-items: center
  row-gap: var(--lg)
  column-gap: var(--rg)
  width: max-content
  pointer-events: none
  &.start
    justify-content: flex-start
  &.center
    justify-content: center
  &.end
    justify-content: flex-end

// The lines of text each take a row of their own, aligned with the block.
.pw-epi, .pw-cap
  flex: 0 0 100%
  max-width: 100%
  overflow: hidden
  box-sizing: border-box
  padding: 0.1em 0.2em
  .start &
    text-align: left
  .center &
    text-align: center
  .end &
    text-align: right
  opacity: 0

// Her epithet: cream-gold in the plum outline — a title, under her name's
// white. The outline carries it on any backdrop (14:1 at the glyph edge).
.pw-epi
  font-size: max(12px, calc(var(--eh) * 0.68))
  line-height: 1.15
  color: var(--am-gold-lite)
  -webkit-text-stroke-width: 0.26em
  // Wraps first and shrinks second (`v-fit`'s sentence mode), two lines at most.
  .narrow &
    white-space: normal
    overflow-wrap: break-word
    max-height: 2.6em

// "Your runes": a label, not a call to action — the arena's shout ink (white
// in a plum outline), as `RuneChips` captions its row.
.pw-cap
  font-size: max(11px, calc(var(--caph) * 0.76))
  line-height: 1.1

.pw-rune
  opacity: 0

.pw-chips
  flex: 0 0 100%
  display: flex
  gap: calc(var(--u) * 0.02)
  .start &
    justify-content: flex-start
  .center &
    justify-content: center
  .end &
    justify-content: flex-end
  &.stacked
    flex-direction: column
    gap: var(--lg)
    .start &
      align-items: flex-start
    .center &
      align-items: center
    .end &
      align-items: flex-end

// A foe's chip: a little paper pill — the caption in plum, the rune at its end.
.pw-chip
  display: inline-flex
  align-items: center
  gap: calc(var(--ch) * 0.16)
  height: var(--ch)
  max-width: 100%
  overflow: hidden
  white-space: nowrap
  box-sizing: border-box
  padding: 0 calc(var(--ch) * 0.1) 0 calc(var(--ch) * 0.34)
  border: max(1.5px, calc(var(--ch) * 0.06)) solid var(--am-ink)
  border-radius: 999px
  background: var(--am-paper)
  box-shadow: var(--am-shadow-chip)
  // Plum on paper: 13.06:1.
  color: var(--am-ink)
  font-family: var(--am-display)
  font-weight: var(--am-w-shout-face)
  font-size: calc(var(--ch) * 0.4)
  line-height: 1.3
  letter-spacing: 0
  opacity: 0
:lang(ar) .pw-chip
  unicode-bidi: plaintext
.pw-chip-rune
  --rs: calc(var(--ch) * 0.74)

// Her STRENGTH's pill (§6.6a) leads with the HUD badge's shield — the
// resist colour in the plum line — so "RESISTS" can never pass for a second
// "WEAK TO". The pill itself stays the same paper.
.pw-chip.is-strong
  padding-left: calc(var(--ch) * 0.16)
.pw-chip-shield
  flex: none
  width: calc(var(--ch) * 0.6)
  height: calc(var(--ch) * 0.6)
  color: var(--am-resist)
  :deep(path)
    stroke: var(--am-ink)
    stroke-width: 4px
    stroke-linejoin: round
    paint-order: stroke fill

// ── the timeline: the powers beat is 1.10 s ──
.r-powers
  .pw-epi
    animation: pw-fade-up 0.35s var(--am-ease-out) both
  .pw-cap
    animation: pw-fade-up 0.3s var(--am-ease-out) 0.1s both
  .pw-rune
    animation: pw-pop 0.32s var(--am-ease-pop) calc(0.15s + var(--i) * 0.07s) both
  .pw-chip
    animation: pw-chip 0.36s var(--am-ease-pop) calc(0.25s + var(--i) * 0.1s) both
  .foe
    .pw-epi
      animation-delay: 0.06s
    .pw-cap
      animation-delay: 0.2s
    .pw-rune
      animation-delay: calc(0.25s + var(--i) * 0.07s)

.still.r-powers
  .pw-epi, .pw-cap, .pw-rune, .pw-chip
    animation-name: pw-fade
@media (prefers-reduced-motion: reduce)
  .r-powers
    .pw-epi, .pw-cap, .pw-rune, .pw-chip
      animation-name: pw-fade

@keyframes pw-fade-up
  from
    opacity: 0
    transform: translateY(40%)
  to
    opacity: 1
    transform: none

// A rune pops up out of the page with a little turn.
@keyframes pw-pop
  0%
    opacity: 0
    transform: scale(0.2) rotate(-25deg)
  60%
    opacity: 1
    transform: scale(1.2) rotate(6deg)
  100%
    opacity: 1
    transform: none

// A chip slides in from her side and settles.
@keyframes pw-chip
  0%
    opacity: 0
    transform: translateX(30%) scale(0.6)
  65%
    opacity: 1
    transform: translateX(-4%) scale(1.06)
  100%
    opacity: 1
    transform: none

@keyframes pw-fade
  from
    opacity: 0
  to
    opacity: 1
</style>
