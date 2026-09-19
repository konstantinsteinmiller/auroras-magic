<script setup lang="ts">
/**
 * WardrobeScene — the Wardrobe Kiosk's shelf (story-spec §3.3.6, §3.5.4,
 * §3.9.2, C17). Every keepsake has its place on the shelf from the first
 * visit — one still to find shows as a ghost outline of itself, never a
 * blank — so the player sees how much there is to find. Tap an item and
 * Aurora wears it at once — no confirm; tap it again to take it off. Two
 * items for one slot (necklace or scarf, Umbra Look or Pastel Dream) swap.
 * Tap-to-equip is the only gesture a player ever needs (safety rule 12).
 *
 * While the Mane Color Palette is worn, a row of eight swatches opens under
 * the shelf: tap one and her mane takes it, instantly. Each swatch is a
 * colour AND a micro-glyph (§3.11), never hue alone. Zero-text (§8.2):
 * names are read aloud only.
 */
import { computed, onBeforeUnmount, onMounted, ref, nextTick, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { S, save } from '@/game/duel/state'
import { COSMETICS, COSMETIC_SLOTS } from '@/game/campaign/tables'
import { sfx } from '@/game/duel/audio'
import { leaveWardrobe } from '@/game/flow/restoreFlow'
import { admire, setWardrobeShelf } from '@/game/cosmetics/wardrobe'
import { itemIconUrl, swatchIconUrl } from '@/game/cosmetics/icons'
import { MANE_SWATCHES, maneSwatchIndex, ownManeColours } from '@/game/cosmetics/rig-cosmetics'
import { haptic } from '@/use/useHaptics'
import GameIcon from '@/components/icons/GameIcon.vue'
import SceneCorner from '@/components/story/SceneCorner.vue'

const { t, te } = useI18n()
/** Bumped on every equip so the tiles re-read the save's slots. */
const rev = ref(0)
const shelfEl = ref<HTMLElement | null>(null)

const MANE_ID = COSMETICS.findIndex((c) => c.slug === 'colorPicker')
const MANE_SLOT = COSMETIC_SLOTS.indexOf('mane')

const owns = (id: number): boolean => ((S.campaign.giftsOwned >>> id) & 1) === 1

const tiles = computed(() => {
  void rev.value
  return COSMETICS.map((c, id) => {
    const owned = owns(id)
    return {
      id,
      slot: c.slot,
      owned,
      worn: owned && S.campaign.giftsEquipped[COSMETIC_SLOTS.indexOf(c.slot)] === id,
      name: owned ? t(`gift.${c.slug}`) : '',
      icon: itemIconUrl(c.slug, !owned)
    }
  })
})

/** The swatch row, shown while the Mane Color Palette is worn. */
const palette = computed(() => {
  void rev.value
  return MANE_ID >= 0 && owns(MANE_ID) && S.campaign.giftsEquipped[MANE_SLOT] === MANE_ID
})
const swatches = computed(() => {
  void rev.value
  const own = ownManeColours()
  const picked = maneSwatchIndex()
  return MANE_SWATCHES.map((sw, i) => ({
    i,
    on: picked === i,
    icon: swatchIconUrl(i, own),
    label: te(sw.label) ? t(sw.label) : t('restore.pickColour')
  }))
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
  if (on) admire(id)
}

const pick = (i: number): void => {
  if (S.campaign.maneSwatch === i) return
  S.campaign.maneSwatch = i
  save()
  rev.value++
  sfx('paint', 1)
  haptic('reward')
  admire(MANE_ID)
}

const back = (): void => {
  sfx('ui')
  leaveWardrobe()
}

/** Tell the diorama where the shelf is, so Aurora stands clear of it. */
const measure = (): void => {
  const el = shelfEl.value
  if (!el) return
  const r = el.getBoundingClientRect()
  setWardrobeShelf(r.left, r.top, r.width)
}
let ro: ResizeObserver | null = null
onMounted(() => {
  measure()
  if (typeof ResizeObserver !== 'undefined' && shelfEl.value) {
    ro = new ResizeObserver(measure)
    ro.observe(shelfEl.value)
  }
  window.addEventListener('resize', measure)
})
watch(palette, () => nextTick(measure))
onBeforeUnmount(() => {
  ro?.disconnect()
  window.removeEventListener('resize', measure)
  setWardrobeShelf(0, 0, 0)
})
</script>

<template lang="pug">
  div.wardrobe-scene
    button.duel-plate.back-btn(:aria-label="t('a11y.backToMap')" @click.stop="back")
      GameIcon.glyph(name="back")
    SceneCorner
    div.shelf(ref="shelfEl")
      div.items
        template(v-for="tile in tiles" :key="tile.id")
          button.item(
            v-if="tile.owned"
            :class="{ worn: tile.worn }"
            :aria-label="tile.name"
            :aria-pressed="tile.worn"
            @click.stop="toggle(tile.slot, tile.id)"
          )
            img(:src="tile.icon" alt="" draggable="false")
          div.item.ghost(v-else aria-hidden="true")
            img(:src="tile.icon" alt="" draggable="false")
      div.swatches(v-if="palette" role="radiogroup" :aria-label="t('gift.colorPicker')")
        button.swatch(
          v-for="sw in swatches"
          :key="sw.i"
          role="radio"
          :class="{ on: sw.on }"
          :aria-checked="sw.on"
          :aria-label="sw.label"
          @click.stop="pick(sw.i)"
        )
          img(:src="sw.icon" alt="" draggable="false")
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

// The shelf: on the right in landscape, the lower part in portrait. Nine
// keepsakes in a 3 × 3 grid (two rows of five on a short landscape phone);
// tiles 56 px min / up to 84 px, ≥ 12 px gutters (§3.13).
.shelf
  --tile: clamp(56px, 11vh, 84px)
  --gap: clamp(12px, 2.6vh, 20px)
  position: absolute
  right: calc(env(safe-area-inset-right) + 3vw)
  top: 50%
  transform: translateY(-50%)
  display: flex
  flex-direction: column
  align-items: center
  gap: var(--gap)
  padding: var(--gap)
  background: rgba(255, 249, 239, 0.9)
  border: 4px solid #3A2340
  border-radius: 24px
  box-shadow: 0 6px 0 rgba(20, 10, 30, 0.3)

.items
  display: grid
  grid-template-columns: repeat(3, var(--tile))
  gap: var(--gap)

@media (orientation: portrait)
  .shelf
    --tile: clamp(56px, 17vw, 76px)
    --gap: clamp(12px, 3.6vw, 20px)
    left: calc(env(safe-area-inset-left) + 4vw)
    right: calc(env(safe-area-inset-right) + 4vw)
    top: auto
    bottom: calc(env(safe-area-inset-bottom) + 3vh)
    transform: none

.item
  width: var(--tile)
  height: var(--tile)
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
    img
      opacity: 0.16

// The mane swatches: 44 px round targets, two rows of four.
.swatches
  display: grid
  grid-template-columns: repeat(4, 44px)
  gap: 10px 14px
  padding-top: var(--gap)
  border-top: 3px dashed rgba(58, 35, 64, 0.22)

.swatch
  width: 44px
  height: 44px
  padding: 0
  border: none
  border-radius: 50%
  background: transparent
  transition: transform 0.12s ease-out
  img
    width: 100%
    height: 100%
    -webkit-user-drag: none
    pointer-events: none
  &:active
    transform: scale(0.92)
  &.on
    transform: scale(1.1)
    box-shadow: 0 0 0 3px #fff, 0 0 0 6px #ffc93c, 0 0 12px 5px rgba(255, 215, 106, 0.75)

// A short landscape phone: two rows of five, the swatches in one row of
// eight, and the whole shelf sat low, clear of the corner buttons.
@media (orientation: landscape) and (max-height: 560px)
  .shelf
    --tile: 56px
    --gap: 12px
    top: auto
    bottom: calc(env(safe-area-inset-bottom) + 10px)
    transform: none
  .items
    grid-template-columns: repeat(5, var(--tile))
  .swatches
    grid-template-columns: repeat(8, 44px)
    gap: 8px
</style>
