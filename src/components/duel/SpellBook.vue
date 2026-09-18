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
import RuneGlyph from '@/components/duel/RuneGlyph.vue'
import RuneTrace from '@/components/duel/RuneTrace.vue'
import GameIcon from '@/components/icons/GameIcon.vue'

const emit = defineEmits<{ close: [] }>()
const { t, locale } = useI18n()

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
  return RUNE_IDS.map((id, r) => ({ r, id, open: ((mask >>> r) & 1) === 1 }))
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

onMounted(async () => {
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
    div.tome(role="dialog" aria-modal="true" :aria-label="t('book.title')")
      div.page
        header.head
          span.title.ink-text.ink-none {{ t('book.title') }}
          button.close.duel-plate(:aria-label="t('close')" @click.stop="close")
            GameIcon.glyph(name="close")
        div.strip(role="list" :aria-label="t('book.runes')")
          button.rune(
            v-for="s in strip"
            :key="s.id"
            role="listitem"
            :class="{ locked: !s.open }"
            :aria-label="s.open ? t(`rune.${s.id}`) : t('book.lockedRune')"
            :aria-disabled="!s.open"
            @click.stop="trace(s.r, s.open)"
          )
            RuneTrace(:rune="s.r" :size="44" :locked="!s.open" :play="plays[s.r]")
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
  background: rgba(6, 4, 12, 0.77)

// The tome: a leather cover around a parchment page, fitted to the viewport.
.tome
  position: relative
  box-sizing: border-box
  width: min(94vw, 760px)
  height: min(calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 24px), 760px)
  padding: 10px
  background: #4b2f1c
  border: 6px solid var(--duel-ink)
  border-radius: 28px

.page
  height: 100%
  display: flex
  flex-direction: column
  background: #f2e3c0
  border: 4px solid var(--duel-ink)
  border-radius: 18px
  overflow: hidden

.head
  display: flex
  align-items: center
  justify-content: space-between
  padding: 10px 12px 4px 18px

.title
  font-size: clamp(24px, 5vw, 36px)
  color: #2a1608

.close
  --lw: 4px
  width: 52px
  height: 52px
  display: flex
  align-items: center
  justify-content: center
  cursor: pointer
  color: #fff
  .glyph
    width: 26px
    height: 26px

// The reference strip: stays put while the list scrolls under it.
.strip
  display: flex
  flex-wrap: wrap
  justify-content: center
  gap: 6px
  padding: 6px 10px 10px
  border-bottom: 3px solid #d8c49a

.rune
  width: 52px
  height: 52px
  display: flex
  align-items: center
  justify-content: center
  background: #fff7e2
  border: 3px solid #3A2340
  border-radius: 14px
  cursor: pointer
  -webkit-tap-highlight-color: transparent
  transition: transform 0.08s ease-out
  &:active:not(.locked)
    transform: scale(0.92)
  &.locked
    background: #e5d6b4
    cursor: default
  &:focus-visible
    outline: 3px solid var(--duel-gold)
    outline-offset: 2px

.list
  flex: 1
  overflow-y: auto
  overscroll-behavior: contain
  padding: 4px 14px 16px
  -webkit-overflow-scrolling: touch

.sect
  display: flex
  gap: 6px
  margin: 14px 4px 8px
  .pip
    width: 14px
    height: 14px
    border-radius: 50%
    background: #8f6cff
    border: 3px solid #3A2340

.row
  position: relative
  display: flex
  align-items: center
  gap: 12px
  min-height: 48px
  margin-bottom: 8px
  padding: 4px 12px
  background: #fbf1d8
  border: 3px solid #d8c49a
  border-radius: 14px
  &.known
    border-color: #b99b64
  &.fresh
    border-color: var(--duel-gold)
    box-shadow: 0 0 0 3px rgba(255, 215, 106, 0.45)

.glyphs
  display: flex
  flex: none
  width: 96px
  > *
    margin-right: -6px

.name
  font-size: clamp(16px, 3.6vw, 20px)
  color: #2a1608
  font-weight: 800

.unknown
  font-size: 20px
  color: #b3a184
  letter-spacing: 0.1em

// The soft "new" sparkle (§C16) — a twinkle, never a red dot.
.spark
  position: absolute
  right: 12px
  top: 50%
  width: 18px
  height: 18px
  margin-top: -9px
  background: #ffd36b
  clip-path: polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%)
  animation: book-twinkle 1.2s ease-in-out infinite

@keyframes book-twinkle
  0%, 100%
    transform: scale(0.7) rotate(0deg)
    opacity: 0.6
  50%
    transform: scale(1.1) rotate(45deg)
    opacity: 1
</style>
