<script setup lang="ts">
/**
 * The depth glimpse's hint (story-spec §8.36) — the one early moment that
 * shows the runes answer each other. The foe has raised a wind wall that the
 * player's likely spell (Fire) cannot get through; this names the rune of
 * HERS that can: its painted icon, pulsing over the ward, and one short line
 * ("Try Ice!"). When that rune finds the gap the icon lights up mint for a
 * moment, then the hint goes and the foe wakes. The rules are the sim's
 * (`GLIMPSE`, `glimpseRuneFor`); this only shows what it says.
 *
 * Landscape renders inside the scaled stage layer, at stage coordinates;
 * portrait maps the stage point to the screen with a legible floor, like the
 * callouts (`DuelPopups.vue`). Under reduced motion the pulse is a steady
 * glow.
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { GY, RUNE_IDS, UX } from '@/game/duel/config'
import { hud, hudLayout } from '@/use/useDuelHud'
import RuneGlyph from '@/components/duel/RuneGlyph.vue'

const props = defineProps<{ portrait: boolean }>()
const { t } = useI18n()

/** Where the hint stands, stage units: over the FRONT of her ward (the side
 *  a spell has to get through), above her head — a little left of where her
 *  damage numbers rise (`sim.strike`, x = UX), so a "−2" drifting off her
 *  never lands on the icon, and in landscape above the band the spell's name
 *  is called in (y ≈ 250). Portrait's pane is shorter than the stage, so
 *  there it stands lower, inside the picture. */
const X = UX - 64
const Y_LAND = GY - 360
const Y_PORT = GY - 300

const line = computed(() =>
  hud.glimpse >= 0 ? t('duel.tryRune', { rune: t(`rune.${RUNE_IDS[hud.glimpse] ?? 'ice'}`) }) : ''
)

const style = computed(() => {
  const L = hudLayout.value
  // Portrait's stage is a quarter scale on a phone held upright: the hint
  // keeps a size a child can still read.
  const k = props.portrait ? Math.max(L.vs, 0.55) : 1
  return {
    left: `${props.portrait ? L.vx + X * L.vs : X}px`,
    top: `${props.portrait ? L.vy + Y_PORT * L.vs : Y_LAND}px`,
    '--k': String(k)
  }
})
</script>

<template lang="pug">
  div.duel-glimpse(v-if="hud.glimpse >= 0" :class="{ yes: hud.glimpseYes }" :style="style" role="status")
    span.line.ink-text {{ line }}
    div.icon
      RuneGlyph(:rune="hud.glimpse")
</template>

<style scoped lang="sass">
.duel-glimpse
  position: absolute
  transform: translate(-50%, -50%)
  display: flex
  flex-direction: column
  align-items: center
  gap: calc(6px * var(--k))
  pointer-events: none

.line
  font-size: max(17px, calc(30px * var(--k)))
  color: var(--am-gold)
  white-space: nowrap

// The rune on a paper coin, ringed in the chrome's own plum, glowing gold:
// the same "look here" the next-rune tile in the spellbook wears.
.icon
  box-sizing: border-box
  width: calc(78px * var(--k))
  height: calc(78px * var(--k))
  padding: calc(7px * var(--k))
  border-radius: 50%
  background: var(--am-paper)
  box-shadow: 0 0 0 calc(4px * var(--k)) var(--am-ink), 0 0 calc(18px * var(--k)) calc(6px * var(--k)) var(--am-gold)
  animation: glimpse-pulse 0.8s ease-in-out infinite alternate

.yes .icon
  box-shadow: 0 0 0 calc(4px * var(--k)) var(--am-ink), 0 0 calc(22px * var(--k)) calc(9px * var(--k)) var(--am-mint)
  animation: glimpse-yes 0.45s var(--am-ease-pop) both

.yes .line
  color: var(--am-mint)

@keyframes glimpse-pulse
  from
    transform: scale(0.94)
  to
    transform: scale(1.1)

@keyframes glimpse-yes
  0%
    transform: scale(1)
  60%
    transform: scale(1.3)
  100%
    transform: scale(1.15)

// An ambient loop settles when less motion is asked for — by the device or by
// the game's own Options toggle (`.am-reduced` on <html>). The one-shot "yes"
// keeps its pop: it is the reward itself.
@media (prefers-reduced-motion: reduce)
  .icon
    animation: none

html.am-reduced .icon
  animation: none
</style>
