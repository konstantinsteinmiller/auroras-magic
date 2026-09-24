<script setup lang="ts">
/**
 * MapScene — the `map` scene's DOM chrome (story-spec §3.5.1, §3.9, §8.10):
 * the chapter-tab ribbon (one tap to any reached page), the options gear and
 * the spellbook (global overlays), and the rank badge printed on the page —
 * which is the whole leaderboard, as far as the player is concerned (owner,
 * 2026-09-23: there is no board to open). The world itself is drawn by
 * `game/map/map.ts` into the one canvas.
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
import { CHAPTERS, NODES_PER_CHAPTER } from '@/game/campaign/tables'
import { starsInChapter } from '@/game/campaign/stars'
import { showChapter, openTent } from '@/game/map/map'
import { openOverlay } from '@/game/flow/scene'
import { sfx } from '@/game/duel/audio'
import { mapHud, rankInset } from '@/use/useMapHud'
import { twinHoldStart, twinHoldCancel } from '@/game/map/twinGift'
import { dailyGift, offerDailyGift, openDailyGift, withdrawDailyGift } from '@/game/map/dailyGift'
import { bookHud } from '@/use/useBook'
import { twinGift } from '@/use/useDuelRewards'
import { leaderboardEnabled, ensureBoard } from '@/use/useLeaderboard'
import { S } from '@/game/duel/state'
import GameIcon from '@/components/icons/GameIcon.vue'
import ArtIcon from '@/components/icons/ArtIcon.vue'
import { isRewardGated } from '@/use/useAdGate'
import RankBadge from '@/components/atoms/RankBadge.vue'
import FinaleCard from '@/components/story/FinaleCard.vue'
import { wanderOnMapOpen } from '@/game/map/wanderer'
import { openVersus } from '@/game/flow/duelFlow'

const { t } = useI18n()

/**
 * The ribbon's tabs, and each opened chapter's replay stars (item 4) as
 * `★ 3/5` — a glyph and a number, because nothing on this map is read.
 *
 * The count is taken once, when the scene mounts, and needs no reactive
 * mirror: a star is only ever earned at the end of a DUEL, and getting back
 * to the map from a duel unmounts and remounts this component. A revision
 * counter here would fire for something that cannot happen while it is on
 * screen.
 */
const tabs = computed(() => CHAPTERS.map((c, i) => ({
  i,
  slug: c.slug,
  open: i <= mapHud.reached,
  stars: starsInChapter(i)
})))
const STAR_TOTAL = NODES_PER_CHAPTER

/** A tab's spoken name: the chapter, plus its stars once it is open. */
const tabLabel = (c: { i: number; slug: string; open: boolean; stars: number }): string =>
  c.open
    ? t('star.tabLabel', { name: t(`chapter.${c.slug}`), n: c.stars, total: STAR_TOTAL })
    : t(`chapter.${c.slug}`)

/* The ribbon scrolls on a narrow screen (10 tabs never fit 320 px at the 44 px
 * floor): keep the page in view's tab visible as the map pans. */
const ribbon = ref<HTMLElement | null>(null)
watch(() => mapHud.visible, async (i) => {
  await nextTick()
  const el = ribbon.value?.children[i] as HTMLElement | undefined
  el?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
}, { immediate: true })

/**
 * The placing, printed on the page's top-right (§8.33). It used to flash on
 * the duel's win flourish, where it was one more thing moving on the busiest
 * frame in the game and nobody saw it. The book is where a player actually
 * stops, and the number is about everyone else rather than this run — so it
 * belongs on the paper, not on the moment.
 *
 * `S.wins` is the LIFETIME count, the same number `reportRun` posts; ranking
 * a single run against a board of bests would show a falling rank after a bad
 * duel. It is also why the plate waits for a first win: on the map the badge
 * is PERMANENT chrome, not a beat, and an unplayed player has no rank to be
 * given — so the badge's honest "…" would sit on the page forever.
 */
const showRank = computed(() => leaderboardEnabled && !mapHud.front && S.wins > 0)
/**
 * RIGHT OF THE BOOKMARK (owner, 2026-09-23). The badge is pinned into the
 * page's top-right corner, level with the ribbon's upper half, and the ribbon
 * is hung just left of it — `map.ts` reads the badge's width (`mapHud.rankW`,
 * published below) and places itself by it. So it is the RIBBON that makes
 * room, whatever length "of 45 players" comes to in the player's language, and
 * the pair can never overlap. `rankInset` is the one formula both sides share.
 */
const rankStyle = computed(() => {
  const p = mapHud.page
  const inset = rankInset(p.h)
  return {
    right: `${Math.round(window.innerWidth - (p.x + p.w) + inset)}px`,
    top: `${Math.round(p.y + inset)}px`,
    // Never more than most of the page: on the narrowest phone the ribbon
    // still has somewhere to hang to its left.
    maxWidth: `${Math.round(p.w * 0.62)}px`
  }
})
/** Held upright the page is ~390 px wide, and the whole pair pushes the ribbon
 *  over the first beat card's corner: the placing alone, as §8.33 had it. */
const rankCompact = computed(() => mapHud.portrait)

/* The badge's width, for the ribbon (see `rankStyle`). Observed rather than
 * measured once: the number lands a beat after the plate (`…` → `#20`), and a
 * language switch changes the tail. */
const rankEl = ref<HTMLElement | null>(null)
let rankRo: ResizeObserver | null = null
const publishRankW = (el: HTMLElement): void => {
  const w = Math.ceil(el.getBoundingClientRect().width)
  if (mapHud.rankW !== w) mapHud.rankW = w
}
watch(rankEl, (el) => {
  rankRo?.disconnect()
  rankRo = null
  if (!el) {
    mapHud.rankW = 0
    return
  }
  publishRankW(el)
  if (typeof ResizeObserver !== 'undefined') {
    rankRo = new ResizeObserver(() => publishRankW(el))
    rankRo.observe(el)
  }
}, { flush: 'post' })
onBeforeUnmount(() => {
  rankRo?.disconnect()
  rankRo = null
  mapHud.rankW = 0
})

/* The one live read of the board per page load. It was the leaderboard
 * modal's to make, and the modal is gone: the badge is the board now. After a
 * win `reportRun` asks as well; either way it happens once a session, and on a
 * baked build (Poki, Yandex, Playgama) it does nothing at all. */
watch(showRank, (on) => { if (on) void ensureBoard() }, { immediate: true })

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
/* The dressing room (owner, 2026-09-23: "there is no button to go to the
 * dressing room from the storybook pages"). Its only door was the tent on the
 * front page, a whole book away from the page she plays on. This is the same
 * door — `openTent` is a tap on the tent, sound, dip and all — so it stands
 * only while the tent does, and wears the tent's own painting as its mark. */
const wardrobe = (): void => openTent()
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

/* ── The daily gift (retention item 5) ───────────────────────────────────
 *
 * Offered HERE, on the scene's mount, because "the first map visit" is what
 * this component IS: the map scene mounts once per visit and the offer is a
 * date comparison, so asking on every visit costs nothing and needs no
 * separate notion of a session.
 *
 * Opened through a real button laid over the canvas, the way the Twin Gift's
 * hold target is: one tap, no hold — it is a present, not a reward ad.
 */
offerDailyGift(mapHud.visible)
// …and taken in again when the map closes, so the next visit re-homes it: a
// sector restored in between moves the node the book opens on, and a present
// left standing beside the old one would be sitting on last session's card.
// Nothing is lost by this — the latch only moves when the gift is OPENED.
onBeforeUnmount(withdrawDailyGift)

const dailyStyle = computed(() => {
  const d = mapHud.daily
  return d ? { left: `${d.x}px`, top: `${d.y}px`, width: `${d.size}px`, height: `${d.size}px` } : {}
})
const dailySay = ref<string | null>(null)
let dailyTimer = 0
const openDaily = (): void => {
  const d = mapHud.daily
  if (!d) return
  openDailyGift(d.x + d.size / 2, d.y + d.size / 2, mapHud.visible)
  // The sticker beat says so in words; the bloom raises the map's own toast
  // through `landBloom`, and must not raise a second one on top of it.
  if (dailyGift.say) {
    dailySay.value = dailyGift.say
    dailyGift.say = null
    window.clearTimeout(dailyTimer)
    dailyTimer = window.setTimeout(() => { dailySay.value = null }, 2800)
  }
}
onBeforeUnmount(() => window.clearTimeout(dailyTimer))

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
        :aria-label="tabLabel(c)"
        :aria-current="c.i === mapHud.visible ? 'page' : undefined"
        @click.stop="tab(c.i)"
      )
        span.num(aria-hidden="true") {{ c.i + 1 }}
        span.stars(v-if="c.open" aria-hidden="true") ★{{ c.stars }}/{{ STAR_TOTAL }}
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
      //- The movie icon, as on every rewarded button ("like always"): holding
      //- this gift plays a video. Only where one plays at all.
      span.ad-mark(v-if="isRewardGated" aria-hidden="true")
        ArtIcon(kind="worldUi" id="movie-icon" fallback="video")
    button.daily(
      v-if="mapHud.daily"
      :style="dailyStyle"
      :aria-label="t('daily.open')"
      @click.stop="openDaily"
      @contextmenu.prevent
    )
    div.rank(v-if="showRank" ref="rankEl" :style="rankStyle")
      RankBadge(:score="S.wins" :compact="rankCompact")
    transition(name="toast")
      div.bloom-toast.story-text(v-if="toast" role="status") {{ t('bloom.claimedToast') }}
    transition(name="toast")
      div.bloom-toast.story-text(v-if="dailySay" role="status") {{ t(dailySay) }}
    transition(name="say")
      div.umbra-say.story-text(v-if="mapHud.umbraSay" :key="mapHud.umbraSay.key" :style="sayStyle" role="status") {{ t(mapHud.umbraSay.key) }}
    FinaleCard(v-if="mapHud.finale" @close="closeFinale")
    div.corner
      button.duel-plate.icon(:aria-label="t('options.title')" @click.stop="options")
        GameIcon.glyph(name="settings")
      button.duel-plate.icon(:class="{ 'book-new': bookHud.hasNew }" :aria-label="t('hud.spellbook')" @click.stop="book")
        GameIcon.glyph(name="book")
      button.duel-plate.icon.versus(v-if="mapHud.versus" :aria-label="t('versus.play')" @click.stop="versus")
        GameIcon.glyph(name="squad")
      //- Last in the row, so it never shoves another button when it comes and
      //- goes; it fades (keeping its place) while a page is turning.
      button.duel-plate.icon.wardrobe(
        v-if="mapHud.wardrobe"
        :class="{ away: mapHud.turning }"
        :aria-label="t('album.dressTab')"
        :tabindex="mapHud.turning ? -1 : undefined"
        @click.stop="wardrobe"
      )
        ArtIcon.tent(kind="worldUi" id="wardrobe-tent" fallback="home")
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
  background: var(--am-paper)
  box-shadow: 0 0 0 3px var(--am-ink)
  color: var(--am-ink)
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
    background: var(--am-paper)
    box-shadow: 3px 3px 0 0 var(--am-ink)
    transform: translateX(-50%) rotate(45deg)
.say-enter-active, .say-leave-active
  transition: opacity 0.2s, transform 0.2s
.say-enter-from, .say-leave-to
  opacity: 0

button
  pointer-events: auto
  cursor: pointer
  // `.tab` and `.twin` draw their own edge (a ring / nothing at all), so the
  // UA border goes; `.icon` puts `.duel-plate`'s plum line back explicitly.
  border: none
  color: var(--am-ink)
  -webkit-tap-highlight-color: transparent
  transition: transform 0.08s ease-out
  &:active:not(:disabled)
    transform: scale(0.94)
  &:focus-visible
    outline: 3px solid var(--am-ink)
    outline-offset: 3px

// The chapter ribbon: along the top in portrait, down the right side in
// landscape. A tab is ≥ 44 px (§3.4's floor); unreached ones are a pale,
// shut page rather than a hole — the full set is visible from the start, so
// scale is never a surprise.
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
  // The chapter number over its star count: two lines inside the 44 px
  // floor (§3.4), so the tab stays a 44 px target and the ribbon's height
  // does not change.
  flex-direction: column
  // The one literal §7 keeps: there is no token for a locked tint, and the
  // value was measured against `--am-ink-3` (4.89:1) for exactly this tab.
  background: #CFC3DE
  box-shadow: 0 0 0 3px var(--am-ink)
  display: flex
  align-items: center
  justify-content: center
  font-family: var(--am-font)
  font-weight: var(--am-w-label)
  font-size: 18px
  line-height: 1
  color: var(--am-ink-3)
  &.open
    background: var(--am-lilac-plate)
    color: var(--am-on-night)
  &.here
    background: var(--am-gold)
    color: var(--am-on-accent)
  &:disabled
    cursor: default
  // The stars inherit the tab's own ink, so every state keeps the contrast
  // that state was measured at — a tab never writes a colour of its own.
  > .stars
    font-size: 10px
    line-height: 1
    margin-top: 2px
    letter-spacing: -0.02em
    opacity: 0.9

.twin
  position: absolute
  background: transparent
  border-radius: 50%
  touch-action: none
  user-select: none
  -webkit-touch-callout: none
  &:active
    transform: none

// The Twin Gift's movie icon: a paper chip on the box's upper-right corner
// (the button is centred on the box, 1.25 of its height), clear of the drawn
// film strip on its lower-left panel and of the bow.
.ad-mark
  position: absolute
  right: 6%
  top: 16%
  width: clamp(22px, 30%, 34px)
  height: clamp(22px, 30%, 34px)
  padding: 3px
  box-sizing: border-box
  border-radius: 50%
  background: var(--am-paper-raised)
  border: 2px solid var(--am-ink)
  color: var(--am-ink)
  pointer-events: none

// The daily gift's tap target: invisible, over the gift the canvas draws.
// It keeps the press-scale every other button has — the gift itself is what
// the player sees move, and the two together read as one thing being pressed.
.daily
  position: absolute
  background: transparent
  border-radius: 50%
  user-select: none
  -webkit-touch-callout: none

.bloom-toast
  position: absolute
  left: 50%
  top: calc(env(safe-area-inset-top) + 70px)
  transform: translateX(-50%)
  max-width: min(86vw, 420px)
  padding: 10px 18px
  border-radius: 16px
  background: var(--am-paper)
  border: 4px solid var(--am-ink)
  color: var(--am-ink)
  font-size: 18px
  text-align: center
  box-shadow: 0 6px 0 rgba(58, 35, 64, 0.3)

.toast-enter-active, .toast-leave-active
  transition: opacity 0.3s ease, transform 0.3s ease
.toast-enter-from, .toast-leave-to
  opacity: 0
  transform: translate(-50%, -10px)

// The placing, printed on the page (§8.33), right of the bookmark. Pinned to
// the paper rather than to the screen, so it reads as part of the book;
// `pageRect` puts every page in the same place, so it never chases a turning
// page. One line always: the ribbon beside it is placed by its width.
.rank
  position: absolute
  display: flex
  justify-content: flex-end
  white-space: nowrap
  pointer-events: none
  animation: rank-in 0.4s cubic-bezier(0.2, 1.4, 0.4, 1) both
  // No `:deep()` dress-up here any more. `RankBadge` used to be drawn for a
  // dark HUD — a near-transparent plate with white numerals — and this page
  // had to repaint it gold-on-plum to be seen at all. Its base IS the gold
  // plate with the plum ring now (§3.9), so the override would only have
  // stacked a second gold on it and kept a stale near-black shadow.

@keyframes rank-in
  from
    opacity: 0
    transform: translateY(-8px)
  to
    opacity: 1
    transform: none

.corner
  position: absolute
  left: calc(env(safe-area-inset-left) + 12px)
  bottom: calc(env(safe-area-inset-bottom) + 12px)
  display: flex
  gap: 10px

// A cream chip on a cream BOOK PAGE is 1.98:1 at the page's median — the
// mirror image of §10.4. What separates it is the plum ring and the lift,
// not the face, so both are load-bearing here: keep the ring at a full 4px
// and never override the lift away.
.icon
  width: 56px
  height: 56px
  border: 4px solid var(--am-ink)
  border-radius: 16px
  display: flex
  align-items: center
  justify-content: center
  .glyph
    width: 30px
    height: 30px
  // The tent is a painting with its own air round it, not a solid glyph: at
  // the glyphs' 30 px it reads a size smaller than the gear beside it.
  .tent
    width: 40px
    height: 40px

// The wardrobe steps aside while a leaf is in the air, like the chrome
// pinned to the page; it keeps its slot so nothing in the row moves.
.wardrobe
  transition: opacity 0.18s ease, transform 0.08s ease-out
  &.away
    opacity: 0
    pointer-events: none
</style>
