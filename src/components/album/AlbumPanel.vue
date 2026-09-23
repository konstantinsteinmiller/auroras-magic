<script setup lang="ts">
/**
 * AlbumPanel — the tent's second page (retention roadmap items 3 and 16):
 * the creature sticker album, with the dress-up photo cards at the top of it.
 *
 * ONE ROW PER CHAPTER, six cells wide: the chapter's five tap creatures in
 * the order a child meets them, then its rescued friend in a gold frame.
 * Chapter 10 has no friend — the finale is the rescue — so its row is five.
 * The rows are numbered and nothing else: a numeral is not reading (§8.2),
 * and a child who cannot read still knows which row is which place.
 *
 * NOTHING HERE ANIMATES. Every cell and every card is a canvas baked once by
 * `album/stickers.ts` and `album/photo.ts` and adopted into the page, so the
 * album costs one burst of work when it opens and nothing at all per frame —
 * which is also why `reducedMotion` has nothing to settle here. The one
 * exception is the gold ring on a card just taken, a one-shot reward beat.
 *
 * It is a SHEET over the whole scene rather than a panel beside the shelf.
 * Sixty cells plus six cards cannot share a phone's short side with a diorama,
 * and half an album is worse than none: the page a child is filling in has to
 * be the page.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { albumCount, albumPages, stickerMet } from '@/game/album/stickers'
import { photoRev, photoSlots, takePhoto } from '@/game/album/photo'
import { PHOTO_SLOTS } from '@/game/campaign/state'
import { poseIconUrl } from '@/game/cosmetics/icons'
import { sfx } from '@/game/duel/audio'
import { haptic } from '@/use/useHaptics'
import StickerCell from '@/components/album/StickerCell.vue'
import PhotoCard from '@/components/album/PhotoCard.vue'

const { t } = useI18n()

/** Bumped when a sticker's met state could have changed under us (opening the
 *  album is the only moment that happens: the map is where they are met). */
const rev = ref(0)
const inner = ref<HTMLElement | null>(null)
const innerW = ref(0)

/* ── Sizes, measured once and handed down ──────────────────────────────── */
//
// One observer for the whole sheet, not one per cell: sixty ResizeObservers
// is sixty layout callbacks for a number that is the same in all of them.

/** Gutter between cells, and the widest row: five creatures plus the friend. */
const GAP = 6
const COLS = 6
/** The chapter numeral's column and the gap after it, which the row of cells
 *  does not get. Left out, six cells stop fitting at 320 px and the friend
 *  wraps onto a line of its own. */
const NUM = 30

const cell = computed(() => {
  const avail = Math.max(180, innerW.value - NUM)
  return Math.max(34, Math.min(76, Math.floor((avail - GAP * (COLS - 1)) / COLS)))
})
/** A card is 3 : 2, six across where there is room and three where there is
 *  not — at 320 px there is not. */
const cardW = computed(() => {
  const avail = Math.max(180, innerW.value)
  return Math.max(86, Math.min(148, Math.floor((avail - GAP * (PHOTO_SLOTS - 1)) / PHOTO_SLOTS)))
})
const cardH = computed(() => Math.round((cardW.value * 2) / 3))

const pages = computed(() => {
  void rev.value
  return albumPages().map((p) => ({
    chapter: p.chapter,
    cells: p.cells.map((s) => ({ sticker: s, met: stickerMet(s) }))
  }))
})
const count = computed(() => {
  void rev.value
  return albumCount()
})

/** Six slots, always six: a filled one carries its recipe, an empty one null. */
const cards = computed(() => {
  void photoRev.value
  return photoSlots()
})

const freshSlot = ref(-1)
let freshTimer = 0

const pose = (): void => {
  const slot = takePhoto()
  if (slot < 0) return
  sfx('reveal')
  haptic('reward')
  freshSlot.value = slot
  if (freshTimer) clearTimeout(freshTimer)
  freshTimer = window.setTimeout(() => { freshSlot.value = -1 }, 1500)
}

const measure = (): void => {
  const el = inner.value
  if (el) innerW.value = Math.round(el.clientWidth)
}
let ro: ResizeObserver | null = null
onMounted(() => {
  rev.value++
  measure()
  if (typeof ResizeObserver !== 'undefined' && inner.value) {
    ro = new ResizeObserver(measure)
    ro.observe(inner.value)
  }
  window.addEventListener('resize', measure)
})
onBeforeUnmount(() => {
  ro?.disconnect()
  window.removeEventListener('resize', measure)
  if (freshTimer) clearTimeout(freshTimer)
})
</script>

<template lang="pug">
  div.album-panel
    div.sheet
      div.inner(ref="inner")
        h2.title {{ t('album.title') }}
        p.count {{ t('album.count', { met: count.met, total: count.total }) }}
        p.hint {{ t('album.hint') }}

        section.photos(:aria-label="t('photo.title')")
          button.pose.duel-plate(:aria-label="t('photo.take')" @click.stop="pose")
            img(:src="poseIconUrl()" alt="" draggable="false")
          div.cards
            PhotoCard(
              v-for="(recipe, i) in cards"
              :key="i"
              :recipe="recipe"
              :index="i"
              :w="cardW"
              :h="cardH"
              :fresh="freshSlot === i"
            )
          p.hint.small {{ t('photo.fullHint', { n: PHOTO_SLOTS }) }}

        section.pages
          div.page(
            v-for="page in pages"
            :key="page.chapter"
            role="group"
            :aria-label="t('album.chapter', { n: page.chapter + 1 })"
          )
            span.num(aria-hidden="true") {{ page.chapter + 1 }}
            div.row
              StickerCell(
                v-for="c in page.cells"
                :key="c.sticker.key"
                :sticker="c.sticker"
                :met="c.met"
                :px="cell"
              )
</template>

<style scoped lang="sass">
.album-panel
  position: absolute
  inset: 0
  pointer-events: auto

.sheet
  position: absolute
  inset: 0
  overflow-y: auto
  overscroll-behavior: contain
  touch-action: pan-y
  -webkit-overflow-scrolling: touch
  background: var(--am-paper)
  padding-top: calc(env(safe-area-inset-top, 0px) + 76px)
  padding-right: calc(env(safe-area-inset-right, 0px) + 12px)
  padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 24px)
  padding-left: calc(env(safe-area-inset-left, 0px) + 12px)

// The content box: the ONE element measured, so every cell is sized from the
// width the rows actually get rather than from the viewport.
.inner
  max-width: 720px
  margin: 0 auto

.title
  margin: 0
  text-align: center
  font-family: var(--am-display)
  font-weight: var(--am-w-display)
  font-size: clamp(1.1rem, 4.6vw, 1.5rem)
  color: var(--am-ink)

.count
  margin: 2px 0 0
  text-align: center
  font-weight: var(--am-w-row)
  font-size: clamp(0.75rem, 3vw, 0.9rem)
  color: var(--am-ink-2)

.hint
  margin: 6px 0 0
  text-align: center
  font-weight: var(--am-w-body)
  font-size: clamp(0.7rem, 2.8vw, 0.85rem)
  line-height: 1.35
  color: var(--am-ink-3)

.hint.small
  margin-top: 8px
  font-size: clamp(0.64rem, 2.5vw, 0.78rem)

.photos
  margin-top: 14px
  padding-bottom: 14px
  border-bottom: 3px dashed var(--am-ink-soft)
  display: flex
  flex-direction: column
  align-items: center
  gap: 10px

// The one button on this page, and the biggest thing on it: a child looking
// for "make a picture of me" must not have to find it.
.pose
  width: 72px
  height: 72px
  border-radius: 50%
  padding: 10px
  background: var(--am-gold)
  cursor: pointer
  -webkit-tap-highlight-color: transparent
  transition: transform var(--am-dur-press) var(--am-ease-out)
  img
    width: 100%
    height: 100%
    -webkit-user-drag: none
    pointer-events: none
  &:active
    transform: scale(0.93)
  &:focus-visible
    outline: 3px solid var(--am-ink)
    outline-offset: 3px

.cards
  display: flex
  flex-wrap: wrap
  justify-content: center
  gap: 6px

.pages
  display: flex
  flex-direction: column
  gap: 10px
  padding-top: 14px

// A chapter: its numeral down the side, its creatures beside it. The numeral
// is a place marker, not a label — no chapter name is printed anywhere.
.page
  display: flex
  align-items: center
  justify-content: center
  gap: 8px

.num
  flex: 0 0 auto
  width: 22px
  text-align: right
  font-family: var(--am-display)
  font-weight: var(--am-w-display)
  font-size: clamp(0.8rem, 3.2vw, 1rem)
  color: var(--am-ink-2)

.row
  display: flex
  flex-wrap: wrap
  gap: 6px
</style>
