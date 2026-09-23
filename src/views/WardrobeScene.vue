<script setup lang="ts">
/**
 * WardrobeScene — the Wardrobe Kiosk's shelf (story-spec §3.3.6, §3.5.4,
 * §3.9.2, C17, §2.2 rule 20). Tap an item and Aurora wears it at once — no
 * confirm; tap it again to take it off. Items in the same slot swap.
 * Tap-to-equip is the only gesture a player ever needs (safety rule 12).
 *
 * THE SHELF IS A ROW OF SLOTS, one slot's things at a time. It was a 3 × 3
 * grid of all nine keepsakes, which stopped working the moment a slot became
 * a CHOICE rather than a switch: 23 tiles at the 56 px floor (§3.13) is 9
 * rows on a phone, and a shelf you scroll is a shelf whose bottom row nobody
 * finds. A slot at a time keeps every tile big, keeps the page still, and —
 * because a tab is a PLACE on her (head, neck, back…) rather than a category
 * name — it stays readable without a word of text (§8.2).
 *
 * Every keepsake still has its place from the first visit: one not yet found
 * shows as a ghost of itself inside its own slot, never a blank and never
 * hidden, so the shelf keeps saying how much there is to find. A slot whose
 * tab carries a gold pip is a slot with something on right now.
 *
 * While the Mane Color Palette is worn, a row of eight swatches opens under
 * the mane slot: tap one and her mane takes it, instantly. Each swatch is a
 * colour AND a micro-glyph (§3.11), never hue alone.
 */
import { computed, onBeforeUnmount, onMounted, ref, nextTick, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { S, save } from '@/game/duel/state'
import { COSMETICS, COSMETIC_SLOTS, cosmeticsIn, type CosmeticSlot } from '@/game/campaign/tables'
import { backfillKeepsakes } from '@/game/campaign/controller'
import { sfx } from '@/game/duel/audio'
import { leaveWardrobe } from '@/game/flow/restoreFlow'
import { admire, setWardrobeShelf } from '@/game/cosmetics/wardrobe'
import { itemIconUrl, swatchIconUrl, slotIconUrl } from '@/game/cosmetics/icons'
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
const wornIn = (slot: CosmeticSlot): number => S.campaign.giftsEquipped[COSMETIC_SLOTS.indexOf(slot)] ?? -1

/** The slot on show. Opens on the first one this player owns something in,
 *  so a shelf with one thing in it opens ON that thing. */
const slot = ref<CosmeticSlot>('head')

const tabs = computed(() => {
  void rev.value
  return COSMETIC_SLOTS.map((s) => ({
    slot: s,
    on: slot.value === s,
    // A gold pip: something of this player's is on, in this slot, right now.
    pip: wornIn(s) >= 0,
    owned: cosmeticsIn(s).some(owns),
    label: t(`slot.${s}`),
    icon: slotIconUrl(s)
  }))
})

const tiles = computed(() => {
  void rev.value
  return cosmeticsIn(slot.value).map((id) => {
    const owned = owns(id)
    return {
      id,
      slot: COSMETICS[id]!.slot,
      owned,
      worn: owned && wornIn(COSMETICS[id]!.slot) === id,
      name: owned ? t(`gift.${COSMETICS[id]!.slug}`) : t('a11y.keepsakeToFind'),
      icon: itemIconUrl(COSMETICS[id]!.slug, !owned)
    }
  })
})

/** The swatch row, shown on the mane slot while the Palette is worn. */
const palette = computed(() => {
  void rev.value
  return slot.value === 'mane' && MANE_ID >= 0 && owns(MANE_ID) && S.campaign.giftsEquipped[MANE_SLOT] === MANE_ID
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

const showSlot = (s: CosmeticSlot): void => {
  if (slot.value === s) return
  slot.value = s
  sfx('ui')
  haptic('tick')
}

const toggle = (s: CosmeticSlot, id: number): void => {
  const si = COSMETIC_SLOTS.indexOf(s)
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
  // A save from before the second shelf existed has opened chests that now
  // carry keepsakes; hand those over rather than show them as missed.
  if (backfillKeepsakes()) rev.value++
  const first = COSMETIC_SLOTS.find((s) => cosmeticsIn(s).some(owns))
  if (first) slot.value = first
  measure()
  if (typeof ResizeObserver !== 'undefined' && shelfEl.value) {
    ro = new ResizeObserver(measure)
    ro.observe(shelfEl.value)
  }
  window.addEventListener('resize', measure)
})
watch([palette, slot], () => nextTick(measure))
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
      div.tabs(role="tablist" :aria-label="t('a11y.wardrobeSlots')")
        button.tab(
          v-for="tab in tabs"
          :key="tab.slot"
          role="tab"
          :class="{ on: tab.on, empty: !tab.owned }"
          :aria-selected="tab.on"
          :aria-label="tab.label"
          @click.stop="showSlot(tab.slot)"
        )
          img(:src="tab.icon" alt="" draggable="false")
          span.pip(v-if="tab.pip")
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
          div.item.ghost(v-else :aria-label="tile.name" role="img")
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
    outline: 3px solid var(--am-ink)
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
  color: var(--am-ink)
  .glyph
    width: 30px
    height: 30px

// The shelf: on the right in landscape, the lower part in portrait. One
// slot's keepsakes at a time — at most four — in a single row, under the
// row of slot tabs. Tiles 56 px min / up to 84 px, ≥ 12 px gutters (§3.13).
.shelf
  --tile: clamp(56px, 11vh, 84px)
  --gap: clamp(12px, 2.6vh, 20px)
  --tab: clamp(38px, 6.4vh, 52px)
  position: absolute
  right: calc(env(safe-area-inset-right) + 3vw)
  top: 50%
  transform: translateY(-50%)
  display: flex
  flex-direction: column
  align-items: center
  gap: var(--gap)
  padding: var(--gap)
  background: var(--am-paper)
  border: 4px solid var(--am-ink)
  border-radius: 24px
  box-shadow: 0 6px 0 rgba(58, 35, 64, 0.3)

// The slot strip: seven places on her, in the order she is dressed.
.tabs
  display: grid
  grid-template-columns: repeat(7, var(--tab))
  gap: clamp(4px, 1vh, 9px)
  padding-bottom: calc(var(--gap) * 0.6)
  border-bottom: 3px dashed var(--am-ink-soft)

.tab
  position: relative
  width: var(--tab)
  height: var(--tab)
  padding: 5px
  border: 3px solid transparent
  border-radius: 14px
  background: transparent
  display: flex
  align-items: center
  justify-content: center
  transition: transform 0.12s ease-out, background 0.12s ease-out
  img
    width: 100%
    height: 100%
    -webkit-user-drag: none
    pointer-events: none
  // A slot with nothing found in it yet still shows — it is the promise
  // that there is something to find there.
  &.empty img
    opacity: 0.4
  &.on
    background: var(--am-paper-sunken)
    border-color: var(--am-ink)
    transform: translateY(-2px)
  &:active
    transform: scale(0.94)
  // Something of hers is on, in this slot. Small and tucked into the corner:
  // at 11 px it sat ON the glyph and every tab read as "icon plus a yellow
  // ball", which is a seven-times-repeated piece of noise.
  .pip
    position: absolute
    right: -1px
    top: -1px
    width: 9px
    height: 9px
    border-radius: 50%
    background: var(--am-gold)
    border: 2px solid var(--am-ink)

.items
  display: grid
  grid-auto-flow: column
  grid-auto-columns: var(--tile)
  gap: var(--gap)

@media (orientation: portrait)
  .shelf
    --tile: clamp(56px, 17vw, 76px)
    --gap: clamp(12px, 3.6vw, 20px)
    --tab: clamp(34px, 9vw, 48px)
    left: calc(env(safe-area-inset-left) + 4vw)
    right: calc(env(safe-area-inset-right) + 4vw)
    top: auto
    bottom: calc(env(safe-area-inset-bottom) + 3vh)
    transform: none
  .tabs
    gap: clamp(3px, 1.4vw, 8px)

.item
  width: var(--tile)
  height: var(--tile)
  border-radius: 18px
  border: 4px solid var(--am-ink)
  // a tile sitting ON the shelf's paper (§2.1)
  background: var(--am-paper-raised)
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
    background: var(--am-gold)
    transform: scale(1.06)
    box-shadow: 0 0 18px 4px rgba(255, 215, 106, 0.8)
  // still to be found: a well cut into the shelf, behind a ghost rule
  &.ghost
    border-style: dashed
    border-color: var(--am-ink-soft)
    background: var(--am-paper-sunken)
    img
      opacity: 0.16

// The mane swatches: 44 px round targets, two rows of four.
.swatches
  display: grid
  grid-template-columns: repeat(4, 44px)
  gap: 10px 14px
  padding-top: var(--gap)
  border-top: 3px dashed var(--am-ink-soft)

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
  // The picked swatch: a plum ring, then gold. The white inner ring it used
  // to wear disappeared the moment the shelf became cream.
  &.on
    transform: scale(1.1)
    box-shadow: 0 0 0 3px var(--am-ink), 0 0 0 7px var(--am-gold)

// A short landscape phone: the swatches in one row of eight, and the whole
// shelf sat low, clear of the corner buttons.
@media (orientation: landscape) and (max-height: 560px)
  .shelf
    --tile: 56px
    --gap: 12px
    --tab: 38px
    top: auto
    bottom: calc(env(safe-area-inset-bottom) + 10px)
    transform: none
  .swatches
    grid-template-columns: repeat(8, 44px)
    gap: 8px
</style>
