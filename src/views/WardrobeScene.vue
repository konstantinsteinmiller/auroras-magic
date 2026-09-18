<script setup lang="ts">
/**
 * WardrobeScene — the Wardrobe Kiosk's shelf (story-spec §3.3.6, §3.5.4,
 * §3.9.2, C17). The full slot set is always visible (an empty slot shows a
 * ghost outline, never a blank), so the player sees from the first visit
 * how much there is to find. Tap an item and Aurora wears it at once — no
 * confirm; tap it again to take it off. Tap-to-equip is the only gesture a
 * player ever needs (safety rule 12).
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { S, save } from '@/game/duel/state'
import { COSMETICS, COSMETIC_SLOTS } from '@/game/campaign/tables'
import { sfx } from '@/game/duel/audio'
import { leaveWardrobe } from '@/game/flow/restoreFlow'
import { admire } from '@/game/cosmetics/wardrobe'
import { itemIconUrl } from '@/game/cosmetics/icons'
import { haptic } from '@/use/useHaptics'
import GameIcon from '@/components/icons/GameIcon.vue'
import SceneCorner from '@/components/story/SceneCorner.vue'
import { ref } from 'vue'

const { t } = useI18n()
/** Bumped on every equip so the tiles re-read the save's slots. */
const rev = ref(0)

const tiles = computed(() => {
  void rev.value
  return COSMETIC_SLOTS.map((slot, si) => {
    const id = COSMETICS.findIndex((c, i) => c.slot === slot && ((S.campaign.giftsOwned >> i) & 1))
    return {
      slot,
      id,
      owned: id >= 0,
      worn: id >= 0 && S.campaign.giftsEquipped[si] === id,
      name: id >= 0 ? t(`gift.${COSMETICS[id]!.slug}`) : '',
      icon: id >= 0 ? itemIconUrl(COSMETICS[id]!.slug) : ''
    }
  })
})

const toggle = (slot: typeof COSMETIC_SLOTS[number], id: number): void => {
  const si = COSMETIC_SLOTS.indexOf(slot)
  const eq = [...S.campaign.giftsEquipped] as typeof S.campaign.giftsEquipped
  const on = eq[si] !== id
  eq[si] = on ? id : -1
  S.campaign.giftsEquipped = eq
  save()
  rev.value++
  sfx(on ? 'paint' : 'ui', 1)
  haptic('reward')
  if (on) admire()
}

const back = (): void => {
  sfx('ui')
  leaveWardrobe()
}
</script>

<template lang="pug">
  div.wardrobe-scene
    button.duel-plate.back-btn(:aria-label="t('a11y.backToMap')" @click.stop="back")
      GameIcon.glyph(name="back")
    SceneCorner
    div.shelf
      template(v-for="tile in tiles" :key="tile.slot")
        button.item(
          v-if="tile.owned"
          :class="{ worn: tile.worn }"
          :aria-label="tile.name"
          :aria-pressed="tile.worn"
          @click.stop="toggle(tile.slot, tile.id)"
        )
          img(:src="tile.icon" alt="" draggable="false")
        div.item.ghost(v-else aria-hidden="true")
</template>

<style scoped lang="sass">
.wardrobe-scene
  position: absolute
  inset: 0
  pointer-events: none

button
  pointer-events: auto
  cursor: pointer
  -webkit-tap-highlight-color: transparent
  &:focus-visible
    outline: 3px solid var(--duel-gold)
    outline-offset: 3px

.back-btn
  position: absolute
  left: calc(env(safe-area-inset-left) + 12px)
  top: calc(env(safe-area-inset-top) + 12px)
  width: 56px
  height: 56px
  border-radius: 16px
  display: flex
  align-items: center
  justify-content: center
  color: #fff
  .glyph
    width: 30px
    height: 30px
    filter: drop-shadow(2px 2px 0 var(--duel-ink))

// The shelf: the right ~40 % in landscape, the lower half in portrait.
.shelf
  position: absolute
  right: calc(env(safe-area-inset-right) + 3vw)
  top: 50%
  transform: translateY(-50%)
  width: min(40vw, 380px)
  display: grid
  grid-template-columns: repeat(auto-fill, minmax(64px, 1fr))
  gap: 20px
  padding: 20px
  background: rgba(255, 249, 239, 0.9)
  border: 4px solid #3A2340
  border-radius: 24px
  box-shadow: 0 6px 0 rgba(20, 10, 30, 0.3)

@media (orientation: portrait)
  .shelf
    left: calc(env(safe-area-inset-left) + 4vw)
    right: calc(env(safe-area-inset-right) + 4vw)
    width: auto
    top: auto
    bottom: calc(env(safe-area-inset-bottom) + 4vh)
    transform: none

.item
  width: 100%
  aspect-ratio: 1
  min-width: 56px
  border-radius: 18px
  border: 4px solid #3A2340
  background: #ffe7f3
  display: flex
  align-items: center
  justify-content: center
  padding: 6px
  transition: transform 0.12s ease-out
  img
    width: 100%
    height: 100%
    -webkit-user-drag: none
    pointer-events: none
  &.worn
    background: #ffd76a
    transform: scale(1.06)
    box-shadow: 0 0 0 4px #fff, 0 0 18px 4px rgba(255, 215, 106, 0.8)
  &.ghost
    border-style: dashed
    border-color: rgba(58, 35, 64, 0.35)
    background: rgba(255, 255, 255, 0.35)
</style>
