<script setup lang="ts">
/**
 * TurnSideways — local versus needs a wide landscape screen (§3.12): below
 * 900 CSS px, or held upright, this prompt shows instead of a squeezed
 * half-UI. A phone that turns itself sideways, and one short line.
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { CHROME_ART } from '@/game/artIds'
import { itemBox } from '@/game/artItem'
import { PHONE_ART, PHONE_UNIT } from '@/game/domArt'
import { useArtImage } from '@/use/useArtImage'

const { t } = useI18n()

/**
 * The phone is PAINTED when the art layer is on (paint-outstanding.md P14,
 * `domArt.PHONE_ART`): one still inside the same rotating group, seated by the
 * box the slicer cut, so it turns exactly as the drawing does. The turn arrow
 * stays drawn — a stroke in a motion accent, and the message itself.
 */
const painted = useArtImage(CHROME_ART.phone.kind, CHROME_ART.phone.id)
const phoneBox = computed(() => {
  if (!painted.value) return null
  const b = itemBox(PHONE_ART)
  return { x: b.x * PHONE_UNIT, y: b.y * PHONE_UNIT, w: b.w * PHONE_UNIT, h: b.h * PHONE_UNIT }
})
</script>

<template lang="pug">
  div.turn(role="status")
    svg.phone(viewBox="-60 -60 120 120" aria-hidden="true")
      g.rot
        image(v-if="painted && phoneBox" :href="painted" :x="phoneBox.x" :y="phoneBox.y" :width="phoneBox.w" :height="phoneBox.h")
        template(v-else)
          rect.shell(x="-22" y="-38" width="44" height="76" rx="9" stroke-width="5")
          rect.screen(x="-15" y="-28" width="30" height="50" rx="3")
          circle.dot(cx="0" cy="30" r="3")
      path.arc(d="M 40 -34 A 52 52 0 0 1 48 20" fill="none" stroke-width="6" stroke-linecap="round")
      path.arc(d="M 40 16 L 48 24 L 54 13" fill="none" stroke-width="6" stroke-linecap="round" stroke-linejoin="round")
    p.story-text {{ t('versus.turnSideways') }}
</template>

<style scoped lang="sass">
.turn
  display: flex
  flex-direction: column
  align-items: center
  gap: 14px
  padding: 22px 26px
  max-width: min(420px, 86vw)
  border-radius: 24px
  background: var(--am-paper)
  box-shadow: 0 0 0 4px var(--am-ink), 0 8px 0 4px var(--am-ink)
  text-align: center
  p
    margin: 0
    color: var(--am-ink)
    font-size: clamp(18px, 5vw, 24px)

.phone
  width: 120px
  height: 120px

.shell
  fill: var(--am-paper)
  stroke: var(--am-ink)

.screen
  fill: var(--am-magic-2)

.dot
  fill: var(--am-ink)

.arc
  // The turn arrow IS the message on this screen, and gold on the cream card
  // is 1.33:1 — under even the 3:1 graphic floor, i.e. a player holding the
  // phone the wrong way round sees a blank card. Deep lilac is 5.29:1 and
  // stays a "motion" accent; --am-ink would read as 13.5:1 but merge with the
  // phone's own outline, which is drawn in exactly that colour.
  stroke: var(--am-lilac-plate)

.rot
  animation: turn-phone 2.4s ease-in-out infinite
  transform-origin: 0 0

@keyframes turn-phone
  0%, 20%
    transform: rotate(0deg)
  50%, 80%
    transform: rotate(-90deg)
  100%
    transform: rotate(0deg)

@media (prefers-reduced-motion: reduce)
  .rot
    animation: none
    transform: rotate(-90deg)
</style>
