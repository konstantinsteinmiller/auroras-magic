<script setup lang="ts">
/**
 * The spellbook (story-spec §3.9.1, §C15–C16) — a global overlay, opened from
 * the duel HUD's book or the map's, through `openOverlay('spellbook')`.
 *
 * Laid out for the hundreds of combos the generator names, not for the jam's
 * fixed 22:
 *   1. a sticky REFERENCE STRIP — all 12 runes, 48 px and up. Tap one and it
 *      traces itself, stroke by stroke; a rune the chests have not given yet
 *      wears a locked node's silhouette;
 *   2. a scrolling LIST grouped by rune count (1 / 2 / 3). A known combo
 *      shows its glyphs and its name; one the player could cast but has not
 *      shows "? ? ?"; one they cannot cast yet is not listed at all — the
 *      book only ever grows;
 *   3. the NEW sparkle on a discovery the book has not shown yet. It clears
 *      once that row has been on screen for a second.
 *
 * DOM, responsive, both orientations; no canvas.
 */
import { computed, onBeforeUnmount, onMounted, ref, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { COMBO_COUNT, comboFromIndex, RUNE_IDS } from '@/game/duel/config'
import { spellOf } from '@/game/duel/sim'
import { sfx } from '@/game/duel/audio'
import { spellName } from '@/use/useSpellName'
import { bookHud, drawableMask, isKnown, isNewCombo, isReachable, markViewed, refreshBook } from '@/use/useBook'
import { S } from '@/game/duel/state'
import { nextRuneAfter } from '@/game/campaign/tables'
import { pendingSectorNode } from '@/game/campaign/state'
import { useArtImage } from '@/use/useArtImage'
import { acquireMenuOpen } from '@/use/useModalState'
import RuneGlyph from '@/components/duel/RuneGlyph.vue'
import RuneTrace from '@/components/duel/RuneTrace.vue'
import GameIcon from '@/components/icons/GameIcon.vue'
import ArtIcon from '@/components/icons/ArtIcon.vue'
import { ITEM_ART } from '@/game/artIds'

const emit = defineEmits<{ close: [] }>()
const { t, locale } = useI18n()

/**
 * The cover's cloth — `images/pages/cover-cloth.webp`, the SAME painting the
 * map lays the book on, so the spellbook is that book opened rather than a
 * second one. Through `useArtImage`, so it costs nothing with the art layer
 * off and swaps in the tick it decodes; until then (and forever, on a build
 * without the paintings) the cover is the plum→rose gradient sampled from it.
 */
const cloth = useArtImage('page', 'cover-cloth')
const coverStyle = computed<Record<string, string>>(() => {
  const out: Record<string, string> = {}
  if (cloth.value) out['--book-cloth'] = `url("${cloth.value}")`
  return out
})

/** How long a new row must be on screen to count as seen (§3.9.1). */
const SEEN_MS = 1000

interface Entry {
  i: number
  runes: number[]
  known: boolean
  fresh: boolean
  name: string
}

const groups = computed(() => {
  void bookHud.rev
  const mask = drawableMask()
  const out: { n: number; entries: Entry[] }[] = [1, 2, 3].map((n) => ({ n, entries: [] }))
  for (let i = 0; i < COMBO_COUNT; i++) {
    if (!isReachable(i, mask)) continue
    const runes = comboFromIndex(i)
    const known = isKnown(i)
    let name = ''
    if (known) {
      const sp = spellOf(runes)
      name = spellName(t, locale.value, { nameId: sp.nameId, kind: sp.kind, count: sp.count, rune: sp.dominant })
    }
    out[runes.length - 1]!.entries.push({ i, runes, known, fresh: known && isNewCombo(i), name })
  }
  return out
})

const strip = computed(() => {
  void bookHud.rev
  const mask = drawableMask()
  // The one the next chest owes (§8.30): its silhouette is lit and carries a
  // little chest, so a child can see what she is playing toward.
  const cs = S.campaign
  const next = nextRuneAfter(pendingSectorNode(cs) ?? cs.furthestNode + 1, mask)
  return RUNE_IDS.map((id, r) => ({ r, id, open: ((mask >>> r) & 1) === 1, next: r === next }))
})

/* Tap a rune: it draws itself. */
const plays = ref<number[]>(RUNE_IDS.map(() => 0))
const trace = (r: number, open: boolean): void => {
  if (!open) return
  sfx('snap', r)
  plays.value = plays.value.map((p, k) => (k === r ? p + 1 : p))
}

/* The NEW cue: a row counts as seen after a second on screen. */
const list = ref<HTMLElement | null>(null)
const timers = new Map<number, number>()
let io: IntersectionObserver | null = null

const watchRows = (): void => {
  if (!io || !list.value) return
  io.disconnect()
  for (const el of list.value.querySelectorAll<HTMLElement>('.row.fresh')) io.observe(el)
}

/**
 * THE SPELLBOOK IS A MENU (owner, 2026-09-24: "Spellbook is a menu and should
 * pause gameplay and sound and music"). It takes the SAME path Options does —
 * every FModal acquires through `acquireMenuOpen` — so while it is open the
 * sim holds, the AudioContext is suspended and the music stops
 * (`useGamePauseAudio`, `useSound`), and on Poki it is a `gameplayStop` like
 * any menu (`flow/bracket.ts`). The overlay's own modal lock in `AppScene` is
 * refcounted beside it, so the two compose; closing the book releases both
 * and the director's resume grace (`noteResume`) keeps the foe's hand in for
 * a second.
 */
let releaseMenu: (() => void) | null = null

onMounted(async () => {
  releaseMenu = acquireMenuOpen()
  refreshBook()
  await nextTick()
  if (typeof IntersectionObserver === 'undefined') return
  io = new IntersectionObserver((items) => {
    for (const it of items) {
      const i = Number((it.target as HTMLElement).dataset.i)
      if (it.isIntersecting && !timers.has(i)) {
        timers.set(i, window.setTimeout(() => {
          timers.delete(i)
          markViewed(i)
          void nextTick(watchRows)
        }, SEEN_MS))
      } else if (!it.isIntersecting && timers.has(i)) {
        window.clearTimeout(timers.get(i))
        timers.delete(i)
      }
    }
  }, { root: list.value, threshold: 0.6 })
  watchRows()
})

onBeforeUnmount(() => {
  releaseMenu?.()
  releaseMenu = null
  io?.disconnect()
  for (const id of timers.values()) window.clearTimeout(id)
  timers.clear()
})

const close = (): void => {
  sfx('ui')
  emit('close')
}
</script>

<template lang="pug">
  div.spellbook
    div.dim(@click="close")
    div.tome(role="dialog" aria-modal="true" :aria-label="t('book.title')" :style="coverStyle")
      div.page
        header.head
          span.title.ink-text.ink-none {{ t('book.title') }}
          button.close(:aria-label="t('close')" @click.stop="close")
            GameIcon.glyph(name="close")
        div.strip(role="list" :aria-label="t('book.runes')")
          button.rune(
            v-for="s in strip"
            :key="s.id"
            role="listitem"
            :class="{ locked: !s.open, next: s.next }"
            :aria-label="s.open ? t(`rune.${s.id}`) : t(s.next ? 'book.nextRune' : 'book.lockedRune')"
            :aria-disabled="!s.open"
            @click.stop="trace(s.r, s.open)"
          )
            RuneTrace(:rune="s.r" :size="44" :locked="!s.open" :play="plays[s.r]")
            //- The chest the map and the cleaning show — painted when the art
            //- layer is on (its SHUT panel: the strip is shut, open), the
            //- shared glyph otherwise (paint-outstanding.md §2).
            ArtIcon.coming(v-if="s.next" kind="gift" :id="ITEM_ART.chest.id" fallback="chest" :frames="2" aria-hidden="true")
        //- The one ornament this page is allowed (§5.5, §5.8): a rainbow rule
        //- where a grey divider would be, under the reference strip.
        div.am-rule(aria-hidden="true")
        div.list(ref="list")
          section.group(v-for="grp in groups" :key="grp.n")
            h3.sect(:aria-label="t(`book.count${grp.n}`)")
              span.pip(v-for="k in grp.n" :key="k" aria-hidden="true")
            div.row(
              v-for="e in grp.entries"
              :key="e.i"
              :data-i="e.i"
              :class="{ fresh: e.fresh, known: e.known }"
            )
              span.glyphs
                RuneGlyph(v-for="(r, j) in e.runes" :key="j" :rune="r" :size="36")
              span.name.story-text(v-if="e.known") {{ e.name }}
              span.unknown.story-text(v-else) {{ t('book.unknown') }}
              span.spark(v-if="e.fresh" aria-hidden="true")
</template>

<style scoped lang="sass">
.spellbook
  position: absolute
  inset: 0
  pointer-events: auto
  display: flex
  align-items: center
  justify-content: center

.dim
  position: absolute
  inset: 0
  background: var(--am-scrim)

// ── The tome ────────────────────────────────────────────────────────────────
//
// A little BOUND book, not a plate with a page in it. Three things do that
// work, and none of them is an ornament under §5.8 — they are the object's
// own construction:
//
//   1. ASYMMETRIC RADII. Tight on the binding side, generous on the fore-edge.
//      This single asymmetry is most of what reads as "book" before a word is
//      parsed. Written LOGICAL (`inline-start`, `start-start`) even though
//      `AppScene` pins the world to `dir="ltr"` and they therefore resolve
//      physical today — so the binding follows if that pin ever lifts, and so
//      nobody has to re-derive which edge is which.
//   2. A PAINTED CLOTH COVER. The 10 px band of `--am-frame` (#5A3A22) that
//      used to be here was flat, brown, and the one surface in this modal
//      that read as furniture. It is now `cover-cloth.webp` over a plum→rose
//      gradient sampled from that same painting, so the cover is right with
//      the art layer off, mid-decode, and on.
//   3. A SPINE and a stitched edge (`::before` / `::after` below).
//
// `--cover-pad` and `--spine` are the two numbers the whole construction is
// built from, so a phone shrinks the binding instead of the page.
.tome
  position: relative
  // Keeps the cover, the binding and the page in ONE local paint order, so
  // none of the z-indices below can ever reach past the dim behind them.
  isolation: isolate
  box-sizing: border-box
  --cover-pad: clamp(8px, 2.3vw, 13px)
  --spine: clamp(11px, 3.2vw, 17px)
  width: min(94vw, 760px)
  height: min(calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 24px), 760px)
  padding: var(--cover-pad)
  padding-inline-start: calc(var(--cover-pad) * 2 + var(--spine))
  background-color: var(--am-cover)
  background-image: var(--book-cloth, none), linear-gradient(to bottom, var(--am-cover-top), var(--am-cover) 54%, var(--am-cover-foot))
  background-size: cover
  background-position: center
  border: 5px solid var(--am-ink)
  border-start-start-radius: 10px
  border-end-start-radius: 10px
  border-start-end-radius: 28px
  border-end-end-radius: 28px
  box-shadow: var(--am-shadow-plate)

// The binding: a sunken band with two thin gilt rules running its length, and
// the cover's own shadow falling away from it toward the page.
//
// This was a LADDER of gold dashes first, and in a screenshot it read as the
// sprocket holes of a film strip rather than as a spine. Two continuous rules
// are what a bound book actually has, and they are quiet enough that the eye
// takes them in without stopping on them.
.tome::before
  content: ''
  position: absolute
  z-index: 0
  inset-block: var(--cover-pad)
  inset-inline-start: var(--cover-pad)
  width: var(--spine)
  border-radius: 6px
  background-color: var(--am-cover-top)
  background-image: linear-gradient(to right, transparent 22%, var(--am-gold-plate) 22% 34%, transparent 34% 66%, var(--am-gold-plate) 66% 78%, transparent 78%), linear-gradient(to right, var(--am-scrim-soft), transparent 70%)
  box-shadow: inset 0 0 0 1px var(--am-ink-soft)
  pointer-events: none

// The gilt stitch just inside the cover edge. Dashes, never a solid rule —
// a solid one reads as a second border and the cover already has one.
.tome::after
  content: ''
  position: absolute
  z-index: 0
  inset: calc(var(--cover-pad) * 0.34)
  border: 1.5px dashed var(--am-gold-plate)
  border-start-start-radius: 7px
  border-end-start-radius: 7px
  border-start-end-radius: 22px
  border-end-end-radius: 22px
  opacity: 0.4
  pointer-events: none

// ── The page ────────────────────────────────────────────────────────────────
//
// Painted, not a flat fill (art-style.md §0: "painted colour with soft
// variation across a shape; not a flat fill under a hard cel mask"). Three
// layers, every one of them too faint to move a measured pair by a tenth of
// a point:
//   • this element  — the warm top-to-foot wash, and the only one the
//                     contrast audit can read. Its DARKEST stop is
//                     `--am-paper-sunken`, and the title measures 10.37:1
//                     there (it needs 3:1 at clamp(24px…)).
//   • ::before      — three soft colour blooms at 13 %.
//   • ::after       — the woven paper tooth at 4.5 %.
.page
  position: relative
  z-index: 1
  height: 100%
  display: flex
  flex-direction: column
  background-color: var(--am-parchment)
  background-image: linear-gradient(to bottom, var(--am-paper-raised), var(--am-parchment) 34%, var(--am-parchment) 70%, var(--am-paper-sunken))
  border: 4px solid var(--am-ink)
  border-start-start-radius: 6px
  border-end-start-radius: 6px
  border-start-end-radius: 18px
  border-end-end-radius: 18px
  overflow: hidden
  box-shadow: inset 0 1px 0 var(--am-paper-raised), 0 0 0 1px var(--am-scrim-soft)

// The painted colour. Deliberately NOT under the title's corner and not on a
// row: the magic ramp is decoration and never a text background (theme.sass).
// Gold at the head's far corner, lilac and mint along the foot.
.page::before
  content: ''
  position: absolute
  inset: 0
  z-index: 0
  opacity: 0.13
  background-image: radial-gradient(70% 46% at 96% 4%, var(--am-gold), transparent 68%), radial-gradient(76% 42% at 2% 100%, var(--am-lilac), transparent 70%), radial-gradient(56% 34% at 82% 96%, var(--am-mint), transparent 70%)
  pointer-events: none

// A radial-gradient position is physical and cannot be mirrored by a logical
// keyword, so the obvious guard is a `[dir="rtl"]` override. There must NOT be
// one. `AppScene` pins the whole world to `dir="ltr"` — Aurora stands on the
// left in every locale — and `[dir="rtl"]` would still match from `<html>`
// through that pin, mirroring the blooms under a layout that had not moved.
// The title is on the left in all 21 locales, so this position is right in
// all 21.

// The paper tooth. It sits ABOVE the rows and does NOT scroll with the list,
// because a sheet of paper is one sheet — a grain sliding under the tiles
// would read as a dirty screen rather than as a page.
//
// This was two crossed `repeating-linear-gradient` hairlines, and a screenshot
// settled it instantly: two near-perpendicular rules at any spacing are a
// GRID, and the page read as squared exercise paper — the one thing a painted
// storybook must not be. Turbulence has no direction, which is the whole
// point of it; desaturated and tiled at 140 px it is the mottle of a sheet
// that was made by hand. Inline, so it costs no request, and rasterised once
// per tile by the compositor.
.page::after
  content: ''
  position: absolute
  inset: 0
  z-index: 2
  opacity: 0.06
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23g)'/%3E%3C/svg%3E")
  background-size: 140px 140px
  pointer-events: none

// Head, strip, rule and list ride between the two washes.
.page > *
  position: relative
  z-index: 1

.head
  display: flex
  align-items: center
  justify-content: space-between
  padding: 10px 12px 4px
  padding-inline-start: 18px

.title
  font-size: clamp(24px, 5vw, 36px)
  // The only run of text that sits directly on the page wash: 13.81:1 at its
  // lightest stop, 10.37:1 at its darkest. Needs 3:1 at this size.
  color: var(--am-ink)
  font-weight: var(--am-w-display)

.close
  box-sizing: border-box
  padding: 0
  width: 52px
  height: 52px
  display: flex
  align-items: center
  justify-content: center
  cursor: pointer
  border: 3px solid var(--am-ink)
  border-radius: 16px
  background-image: linear-gradient(to bottom, var(--am-coral), var(--am-coral-foot))
  box-shadow: 0 3px 0 var(--am-coral-plate)
  // the X is plum — 8.18:1 on the coral face
  color: var(--am-on-accent)
  .glyph
    width: 26px
    height: 26px

// The reference strip: stays put while the list scrolls under it.
.strip
  // A GRID of twelve, not a wrapping flex row. Wrapping lays out by content,
  // so at a middling width it fitted eleven and left the twelfth stranded on
  // a line of its own — which reads as a mistake rather than as a set. A
  // fixed column count cannot orphan: twelve across, or a clean six-and-six
  // once there is no longer room for a tappable tile.
  display: grid
  grid-template-columns: repeat(12, minmax(0, 52px))
  justify-content: center
  align-items: center
  gap: 6px
  padding: 6px 10px 10px

  @media (max-width: 620px)
    grid-template-columns: repeat(6, minmax(0, 52px))

// A rune TILE, painted: cream at the top falling to the warmer paper at its
// foot, so the strip reads as twelve little stones on a page rather than as
// twelve rectangles. No drop shadow — §4.3 is explicit that a shadow on paper
// is noise, and `--am-lift-on-paper` is `none` for exactly this reason.
.rune
  // The cell decides the width now; the tile stays square inside it so a
  // narrow screen shrinks the stones evenly instead of clipping them.
  width: 100%
  max-width: 52px
  aspect-ratio: 1
  height: auto
  display: flex
  align-items: center
  justify-content: center
  background-color: var(--am-paper-raised)
  background-image: linear-gradient(to bottom, var(--am-paper-raised), var(--am-paper))
  border: 3px solid var(--am-ink)
  border-radius: 14px
  cursor: pointer
  -webkit-tap-highlight-color: transparent
  transition: transform var(--am-dur-press) ease-out
  &:active:not(.locked)
    transform: scale(0.92)
  // Disabled by LOSING THE MATERIAL (theme.sass), never by opacity: the tile
  // sinks into the page instead of fading out of it.
  &.locked
    background-image: linear-gradient(to bottom, var(--am-paper-sunken), var(--am-paper-edge))
    cursor: default
  // The one the next chest owes (§8.30): lit, breathing, with a little chest
  // on the corner. A child can see what she is playing toward.
  &.next
    position: relative
    background-image: linear-gradient(to bottom, var(--am-gold), var(--am-gold-foot))
    border-color: var(--am-gold-plate)
    box-shadow: 0 0 0 3px var(--am-ink-soft)
    animation: next-rune 1.8s ease-in-out infinite
    :deep(svg)
      opacity: 0.9
  .coming
    position: absolute
    right: -7px
    bottom: -7px
    width: 22px
    height: 22px
    padding: 2px
    color: var(--am-on-accent)
    background: var(--am-gold)
    border: 2.5px solid var(--am-ink)
    border-radius: 8px
  &:focus-visible
    outline: 3px solid var(--am-ink)
    outline-offset: 2px

// Plum at two published strengths, not two hand-written alphas: the ring is
// the same ink every border on the page is drawn with.
@keyframes next-rune
  0%, 100%
    box-shadow: 0 0 0 3px var(--am-ink-soft)
  50%
    box-shadow: 0 0 0 6px var(--am-scrim-soft)

@media (prefers-reduced-motion: reduce)
  .rune.next
    animation: none

.list
  flex: 1
  overflow-y: auto
  overscroll-behavior: contain
  padding: 4px 14px 16px
  -webkit-overflow-scrolling: touch
  // Firefox honours no `-webkit-scrollbar` rule and the page is
  // `color-scheme: only light`, so without this it paints a UA scrollbar with
  // no relation to the page — the same pair `FModal` sets. Thumb then track.
  scrollbar-color: var(--am-lilac-foot) var(--am-paper-sunken)

.sect
  display: flex
  gap: 6px
  margin: 14px 4px 8px
  .pip
    width: 14px
    height: 14px
    border-radius: 50%
    background: var(--am-lilac-plate)
    border: 3px solid var(--am-ink)

.row
  position: relative
  display: flex
  align-items: center
  gap: 12px
  min-height: 48px
  margin-bottom: 8px
  padding: 4px 12px
  // Painted like the rune tiles, and stopping at `--am-parchment`: that is
  // the darkest thing text on a row ever sits on, and it is where the two
  // pairs below are measured.
  background-color: var(--am-paper-raised)
  background-image: linear-gradient(to bottom, var(--am-paper-raised), var(--am-paper) 62%, var(--am-parchment))
  border: 3px solid var(--am-paper-edge)
  border-radius: 14px
  &.known
    border-color: var(--am-ink-2)
  &.fresh
    border-color: var(--am-gold-plate)
    box-shadow: 0 0 0 3px var(--am-gold)

.glyphs
  display: flex
  flex: none
  width: 96px
  > *
    margin-right: -6px

.name
  font-size: clamp(16px, 3.6vw, 20px)
  // 13.81:1 at the row's head, 11.43:1 at its painted foot
  color: var(--am-ink)
  font-weight: var(--am-w-display)

.unknown
  font-size: 20px
  // "? ? ?" is text, so it clears AA at the WORST stop of the row it sits on:
  // 6.95:1 at the head, 5.75:1 on the parchment foot.
  color: var(--am-ink-2)

// §5.5's rainbow rule, standing in for the grey hairline that used to close
// the reference strip. The page's one structural ornament.
.am-rule
  flex: none
  height: 3px
  margin: 0 10px 6px
  border-radius: 999px
  background: var(--am-rainbow)
  opacity: 0.9

// The soft "new" sparkle (§C16) — a twinkle, never a red dot.
.spark
  position: absolute
  right: 12px
  top: 50%
  width: 18px
  height: 18px
  margin-top: -9px
  background: var(--am-magic-5)
  clip-path: var(--am-spark-clip)
  animation: book-twinkle 1.2s ease-in-out infinite

@keyframes book-twinkle
  0%, 100%
    transform: scale(0.7) rotate(0deg)
    opacity: 0.6
  50%
    transform: scale(1.1) rotate(45deg)
    opacity: 1

// ── Short viewports (landscape phone, embedded portal frame) ────────────────
//
// The reference strip is sticky by design (§3.9.1) and the head above it is
// fixed height, so on a 390 px-tall screen the two of them took the page: a
// screenshot at 844 × 390 showed the title, twelve 52 px tiles and ONE AND A
// HALF rows of the list a player came here to read.
//
// Everything above the rainbow rule shrinks against the SHORT axis (`vh`, not
// `vw`), and the list keeps every pixel that frees. `RuneTrace` is a
// `viewBox="0 0 100 100"` SVG, so sizing its glyph in CSS scales it rather
// than cropping it. The same threshold `FModal` uses, plus the 40 px that put
// a 390 px landscape phone safely inside it.
@media (max-height: 560px)
  .tome
    --cover-pad: clamp(6px, 1.8vh, 11px)
    --spine: clamp(9px, 2.6vh, 14px)

  .head
    padding: 5px 8px 2px
    padding-inline-start: 14px

  .title
    font-size: clamp(18px, 4.6vh, 28px)

  .close
    width: 42px
    height: 42px
    .glyph
      width: 22px
      height: 22px

  .strip
    gap: 4px
    padding: 4px 8px 6px

  .rune
    max-width: 42px
    border-radius: 11px
    // `:not(.coming)` so the little chest badge on the next-rune tile keeps
    // the size its own rule gives it.
    :deep(svg:not(.coming))
      width: 34px
      height: 34px

  .am-rule
    margin-bottom: 4px

  .list
    padding: 2px 10px 12px

  .sect
    margin: 8px 4px 5px

  .row
    min-height: 40px
    margin-bottom: 6px
</style>
