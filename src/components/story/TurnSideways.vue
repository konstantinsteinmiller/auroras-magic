<script setup lang="ts">
/**
 * TurnSideways — local versus needs a wide landscape screen (§3.12): below
 * 900 CSS px, or held upright, this prompt shows instead of a squeezed
 * half-UI. A phone that turns itself sideways, and one short line.
 */
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template lang="pug">
  div.turn(role="status")
    svg.phone(viewBox="-60 -60 120 120" aria-hidden="true")
      g.rot
        rect(x="-22" y="-38" width="44" height="76" rx="9" fill="#fffaf0" stroke="#3A2340" stroke-width="5")
        rect(x="-15" y="-28" width="30" height="50" rx="3" fill="#c7a6ff")
        circle(cx="0" cy="30" r="3" fill="#3A2340")
      path.arc(d="M 40 -34 A 52 52 0 0 1 48 20" fill="none" stroke="#ffd76a" stroke-width="6" stroke-linecap="round")
      path.arc(d="M 40 16 L 48 24 L 54 13" fill="none" stroke="#ffd76a" stroke-width="6" stroke-linecap="round" stroke-linejoin="round")
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
  background: #fffaf0
  box-shadow: 0 0 0 4px #3A2340, 0 8px 0 4px #3A2340
  text-align: center
  p
    margin: 0
    color: #3A2340
    font-size: clamp(18px, 5vw, 24px)

.phone
  width: 120px
  height: 120px

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
