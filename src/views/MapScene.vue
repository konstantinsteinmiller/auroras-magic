<script setup lang="ts">
/**
 * MapScene — the `map` scene's DOM chrome (story-spec §3.5.1, §3.9, §8.10):
 * the chapter-tab ribbon (one tap to any reached page), the options gear and
 * the spellbook (global overlays), and the leaderboard on live builds. The
 * world itself is drawn by `game/map/map.ts` into the one canvas.
 *
 * Zero-UI: no words on screen. Every control's name is an aria-label; a
 * chapter tab reads its chapter's name.
 *
 * The Twin Gift's hold target lives here too: an invisible button laid over
 * the gift the canvas draws (§3.3.4). Press and hold 1.2 s — pointer, or
 * Space / Enter held down; moving more than 12 px, lifting, or letting the
 * key go before then just lets the ring recede.
 */
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { CHAPTERS } from '@/game/campaign/tables'
import { showChapter } from '@/game/map/map'
import { openOverlay } from '@/game/flow/scene'
import { sfx } from '@/game/duel/audio'
import { mapHud } from '@/use/useMapHud'
import { twinHoldStart, twinHoldCancel } from '@/game/map/twinGift'
import { bookHud } from '@/use/useBook'
import { twinGift } from '@/use/useDuelRewards'
import { leaderboardLive } from '@/use/useLeaderboard'
import GameIcon from '@/components/icons/GameIcon.vue'
import FinaleCard from '@/components/story/FinaleCard.vue'
import { wanderOnMapOpen } from '@/game/map/wanderer'
import { openVersus } from '@/game/flow/duelFlow'

const emit = defineEmits<{ board: [] }>()
const { t } = useI18n()

const tabs = computed(() => CHAPTERS.map((c, i) => ({ i, slug: c.slug, open: i <= mapHud.reached })))

/* The ribbon scrolls on a narrow screen (10 tabs never fit 320 px at the 44 px
 * floor): keep the page in view's tab visible as the map pans. */
const ribbon = ref<HTMLElement | null>(null)
watch(() => mapHud.visible, async (i) => {
  await nextTick()
  const el = ribbon.value?.children[i] as HTMLElement | undefined
  el?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
}, { immediate: true })

const tab = (i: number): void => {
  sfx('ui')
  showChapter(i)
}
const options = (): void => {
  sfx('ui')
  openOverlay('options')
}
const book = (): void => {
  sfx('ui')
  openOverlay('spellbook')
}
/* The Friendship Duo (chapter 10's gift): local 2P versus (§3.12). */
const versus = (): void => {
  sfx('ui')
  openVersus()
}

/* The Twin Gift's press-and-hold (§3.3.4). */
let holdX = 0
let holdY = 0
const holdDown = (e: PointerEvent): void => {
  e.preventDefault()
  try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* not capturable */ }
  holdX = e.clientX
  holdY = e.clientY
  twinHoldStart()
}
const holdMove = (e: PointerEvent): void => {
  if (Math.hypot(e.clientX - holdX, e.clientY - holdY) > 12) twinHoldCancel()
}
const holdKey = (e: KeyboardEvent, down: boolean): void => {
  if (e.key !== ' ' && e.key !== 'Enter') return
  e.preventDefault()
  if (!down) twinHoldCancel()
  else if (!e.repeat) twinHoldStart()
}
/* The bloom landed: say so once, softly (§10.13.I). */
const toast = ref(false)
let toastTimer = 0
watch(() => twinGift.rev, () => {
  toast.value = true
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => { toast.value = false }, 2800)
})
onBeforeUnmount(() => window.clearTimeout(toastTimer))

/* The finale card closes onto the map, where Umbra is now visiting (§8.11). */
const closeFinale = (): void => {
  mapHud.finale = false
  wanderOnMapOpen()
}
/* Wandering Umbra's line, above her head, following her as the map pans. */
const sayStyle = computed(() => {
  const s = mapHud.umbraSay
  return s ? { left: `${s.x}px`, top: `${s.y}px` } : {}
})

const twinStyle = computed(() => {
  const w = mapHud.twin
  return w ? { left: `${w.x}px`, top: `${w.y}px`, width: `${w.size}px`, height: `${w.size}px` } : {}
})
</script>

<template lang="pug">
  div.map-scene
    nav.tabs(ref="ribbon" :class="{ side: !mapHud.portrait }" :aria-label="t('map.chapters')")
      button.tab(
        v-for="c in tabs"
        :key="c.slug"
        :class="{ open: c.open, here: c.i === mapHud.visible }"
        :disabled="!c.open"
        :aria-label="t(`chapter.${c.slug}`)"
        :aria-current="c.i === mapHud.visible ? 'page' : undefined"
        @click.stop="tab(c.i)"
      )
        span.num(aria-hidden="true") {{ c.i + 1 }}
    button.twin(
      v-if="mapHud.twin"
      :style="twinStyle"
      :aria-label="t('twinGift.holdLabel')"
      @pointerdown.stop="holdDown"
      @pointermove="holdMove"
      @pointerup="twinHoldCancel"
      @pointercancel="twinHoldCancel"
      @lostpointercapture="twinHoldCancel"
      @keydown.stop="holdKey($event, true)"
      @keyup.stop="holdKey($event, false)"
      @blur="twinHoldCancel"
      @contextmenu.prevent
    )
    transition(name="toast")
      div.bloom-toast.story-text(v-if="toast" role="status") {{ t('bloom.claimedToast') }}
    transition(name="say")
      div.umbra-say.story-text(v-if="mapHud.umbraSay" :key="mapHud.umbraSay.key" :style="sayStyle" role="status") {{ t(mapHud.umbraSay.key) }}
    FinaleCard(v-if="mapHud.finale" @close="closeFinale")
    div.corner
      button.duel-plate.icon(:aria-label="t('options.title')" @click.stop="options")
        GameIcon.glyph(name="settings")
      button.duel-plate.icon(:class="{ 'book-new': bookHud.hasNew }" :aria-label="t('hud.spellbook')" @click.stop="book")
        GameIcon.glyph(name="book")
      button.duel-plate.icon(v-if="leaderboardLive" :aria-label="t('leaderboard.title')" @click.stop="emit('board')")
        GameIcon.glyph(name="leaderboard")
      button.duel-plate.icon.versus(v-if="mapHud.versus" :aria-label="t('versus.play')" @click.stop="versus")
        GameIcon.glyph(name="squad")
</template>

<style scoped lang="sass">
.map-scene
  position: absolute
  inset: 0
  pointer-events: none

// Wandering Umbra's line (§8.11): a small speech bubble over her head.
.umbra-say
  position: absolute
  transform: translate(-50%, -100%)
  width: max-content
  max-width: min(260px, 70vw)
  padding: 8px 14px
  border-radius: 18px
  background: #fffaf0
  box-shadow: 0 0 0 3px #3A2340
  color: #3A2340
  font-size: 17px
  text-align: center
  pointer-events: none
  &::after
    content: ''
    position: absolute
    left: 50%
    bottom: -9px
    width: 14px
    height: 14px
    background: #fffaf0
    box-shadow: 3px 3px 0 0 #3A2340
    transform: translateX(-50%) rotate(45deg)
.say-enter-active, .say-leave-active
  transition: opacity 0.2s, transform 0.2s
.say-enter-from, .say-leave-to
  opacity: 0

button
  pointer-events: auto
  cursor: pointer
  border: none
  color: #fff
  -webkit-tap-highlight-color: transparent
  transition: transform 0.08s ease-out
  &:active:not(:disabled)
    transform: scale(0.94)
  &:focus-visible
    outline: 3px solid var(--duel-gold)
    outline-offset: 3px

// The chapter ribbon: along the top in portrait, down the right side in
// landscape. A tab is ≥ 44 px (§3.4's floor); unreached ones are dimmed and
// shut — the full set is visible from the start, so scale is never a surprise.
.tabs
  position: absolute
  display: flex
  gap: 6px
  // As wide as its tabs, centred — and scrolling when the ten do not fit (a
  // 320 px phone, a short landscape one). The padding keeps the tabs' ink
  // ring inside the scroll box.
  padding: 4px
  box-sizing: border-box
  left: 50%
  top: calc(env(safe-area-inset-top) + 6px)
  transform: translateX(-50%)
  max-width: calc(100% - 12px - env(safe-area-inset-left) - env(safe-area-inset-right))
  overflow-x: auto
  overscroll-behavior: contain
  scrollbar-width: none
  pointer-events: auto
  &::-webkit-scrollbar
    display: none
  > .tab
    flex: none
  &.side
    left: auto
    right: calc(env(safe-area-inset-right) + 6px)
    top: 50%
    transform: translateY(-50%)
    flex-direction: column
    max-width: none
    max-height: calc(100% - 12px - env(safe-area-inset-top) - env(safe-area-inset-bottom))
    overflow-x: hidden
    overflow-y: auto

.tab
  width: 44px
  height: 44px
  border-radius: 12px
  background: rgba(24, 17, 48, 0.55)
  box-shadow: 0 0 0 3px #3A2340
  display: flex
  align-items: center
  justify-content: center
  font: 900 18px/1 Arial, sans-serif
  color: #7a6f95
  &.open
    background: #6f55c9
    color: #fff
  &.here
    background: #ffd76a
    color: #3A2340
  &:disabled
    cursor: default

.twin
  position: absolute
  background: transparent
  border-radius: 50%
  touch-action: none
  user-select: none
  -webkit-touch-callout: none
  &:active
    transform: none

.bloom-toast
  position: absolute
  left: 50%
  top: calc(env(safe-area-inset-top) + 70px)
  transform: translateX(-50%)
  max-width: min(86vw, 420px)
  padding: 10px 18px
  border-radius: 16px
  background: #fff4e6
  border: 4px solid #3A2340
  color: #3A2340
  font-size: 18px
  text-align: center
  box-shadow: 0 6px 0 rgba(20, 10, 30, 0.35)

.toast-enter-active, .toast-leave-active
  transition: opacity 0.3s ease, transform 0.3s ease
.toast-enter-from, .toast-leave-to
  opacity: 0
  transform: translate(-50%, -10px)

.corner
  position: absolute
  left: calc(env(safe-area-inset-left) + 12px)
  bottom: calc(env(safe-area-inset-bottom) + 12px)
  display: flex
  gap: 10px

.icon
  width: 56px
  height: 56px
  border-radius: 16px
  display: flex
  align-items: center
  justify-content: center
  .glyph
    width: 30px
    height: 30px
    filter: drop-shadow(2px 2px 0 var(--duel-ink))
</style>
