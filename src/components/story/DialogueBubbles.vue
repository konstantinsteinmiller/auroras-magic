<script setup lang="ts">
/**
 * DialogueBubbles — the story, printed on the page (story-spec §10.6, C12,
 * §3.5.3, §8.28).
 *
 * The book's own convention: the picture is the page, and the words are set
 * on paper along its foot, with the speaker's portrait inset on their fixed
 * side (Aurora on the left, everyone else on the right — never mirrored, even
 * in RTL). 1–2 pictograms carry the beat without reading; the line of text is
 * a reading bonus.
 *
 * ADVANCING TURNS THE PAGE (§8.28). A tap anywhere turns it — the same page
 * turn every scene change uses, so a story beat is a page of the same book
 * rather than a bubble that pops — after a 600 ms minimum dwell; the dwell
 * clock pauses with the game (an ad or a hidden tab never eats it). A beat
 * babbles as it appears (§10.11).
 *
 * A chapter's first node opens on its TITLE page: the chapter's name and one
 * star per chapter, turned like any other page.
 *
 * `skippable` shows the skip icon: the second time a player meets these
 * lines, never the first (C12).
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { firstLoadAdSettled } from '@/use/useFirstLoadInterstitial'
import { useI18n } from 'vue-i18n'
import type { Bubble } from '@/game/story/story'
import { CHAPTERS, nodeChapter, nodePosInChapter } from '@/game/campaign/tables'
import { portraitUrl } from '@/game/story/portrait'
import { chatter, sfx } from '@/game/duel/audio'
import { dipTo, fading, DIP_PAGE } from '@/game/flow/transition'
import { isGamePaused } from '@/use/useGamePause'
import Picto from '@/components/story/Picto.vue'
import GameIcon from '@/components/icons/GameIcon.vue'

const props = defineProps<{ lines: readonly Bubble[]; node: number; skippable?: boolean }>()
const emit = defineEmits<{ done: [] }>()
const { t } = useI18n()

/** C12's minimum dwell per beat, ms. */
const DWELL_MS = 600

/** A chapter's first node opens on the chapter's title page (index -1). */
const titled = computed(() => nodePosInChapter(props.node) === 0)
const chapter = computed(() => nodeChapter(props.node))
const chapterName = computed(() => t(`chapter.${CHAPTERS[chapter.value]?.slug ?? 'c1'}`))
const stars = computed(() => chapter.value + 1)

const i = ref(0)
const dwell = ref(0)
const title = computed(() => i.value < 0)
const line = computed(() => (title.value ? undefined : props.lines[i.value]))
const left = computed(() => line.value?.speaker === 'aurora')
const text = computed(() => (line.value ? t(line.value.key, { name: line.value.name ?? '' }) : ''))
const portrait = computed(() => (line.value ? portraitUrl(line.value.speaker, line.value.emote, line.value.name) : ''))
const ready = computed(() => dwell.value >= DWELL_MS)

let timer = 0
let last = 0
const tick = (): void => {
  const now = performance.now()
  if (!isGamePaused.value) dwell.value += now - last
  last = now
}

const show = (): void => {
  dwell.value = 0
  last = performance.now()
  const l = line.value
  if (l) chatter(l.speaker, l.beats, l.tone)
}

/** `done` goes out once: a tap during the page turn that follows must not
 *  start the duel a second time. */
let finished = false
const finish = (): void => {
  if (finished) return
  finished = true
  emit('done')
}

const advance = (): void => {
  if (finished || !ready.value || isGamePaused.value || fading()) return
  if (i.value >= props.lines.length - 1) {
    finish()
    return
  }
  // The page turns, and the next beat is printed on the one underneath.
  dipTo(() => { i.value++ }, DIP_PAGE)
}

const skip = (): void => {
  if (finished) return
  sfx('ui')
  finish()
}

const onKey = (e: KeyboardEvent): void => {
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault()
    advance()
  }
}

watch(i, show)
/** The first beat waits for a portal's mandatory first-load ad to settle
 *  (§11.7, C30); on every other build this is the next microtask. */
const open = ref(false)
let alive = true
onMounted(() => {
  window.addEventListener('keydown', onKey)
  if (titled.value) i.value = -1
  void firstLoadAdSettled().then(() => {
    if (!alive) return
    open.value = true
    show()
    timer = window.setInterval(tick, 50)
  })
})
onUnmounted(() => {
  alive = false
  window.clearInterval(timer)
  window.removeEventListener('keydown', onKey)
})
</script>

<template lang="pug">
  div.dialogue(@click="advance")
    div.dim
    template(v-if="open")
      //- The chapter's title page.
      div.leaf.title-leaf(v-if="title" role="status" aria-live="polite")
        h2.chapter-name.ink-text {{ chapterName }}
        div.stars(aria-hidden="true")
          span.star(v-for="s in stars" :key="s") ★
        div.dog-ear(v-if="ready" aria-hidden="true")
      //- A story beat: the words on the page, the speaker inset beside them.
      div.leaf(v-else-if="line" :class="left ? 'from-left' : 'from-right'")
        img.portrait(:src="portrait" alt="" draggable="false")
        div.words(role="status" aria-live="polite")
          div.pictos
            Picto.picto(v-for="p in line.pictos" :key="p" :name="p")
          p.story-text(v-if="text") {{ text }}
        div.dog-ear(v-if="ready" aria-hidden="true")
    button.skip(
      v-if="skippable"
      :aria-label="t('ui.next')"
      @click.stop="skip"
    )
      GameIcon.glyph(name="skip-forward")
</template>

<style scoped lang="sass">
.dialogue
  position: absolute
  inset: 0
  pointer-events: auto
  cursor: pointer
  -webkit-tap-highlight-color: transparent
  user-select: none
  -webkit-user-select: none

// Just enough shade under the words for them to read on any page.
.dim
  position: absolute
  inset: 0
  background: linear-gradient(to top, rgba(26, 16, 44, 0.5), rgba(26, 16, 44, 0.02) 46%)

// The words, set on paper along the foot of the page.
.leaf
  position: absolute
  left: calc(env(safe-area-inset-left) + 3vw)
  right: calc(env(safe-area-inset-right) + 3vw)
  bottom: calc(env(safe-area-inset-bottom) + 3.5vh)
  display: flex
  align-items: flex-end
  gap: 16px
  padding: 16px 22px
  background: #fff8ec
  border: 4px solid #3A2340
  border-radius: 22px
  box-shadow: 0 8px 0 rgba(20, 10, 30, 0.32)
  color: #3A2340
  &.from-right
    flex-direction: row-reverse

.portrait
  flex: 0 0 auto
  width: clamp(78px, 15vmin, 132px)
  height: clamp(78px, 15vmin, 132px)
  margin-top: calc(-6vmin - 14px)
  -webkit-user-drag: none
  pointer-events: none
  filter: drop-shadow(0 5px 0 rgba(20, 10, 30, 0.3))

.words
  flex: 1 1 auto
  display: flex
  flex-direction: column
  gap: 8px

.pictos
  display: flex
  gap: 10px
  .picto
    width: clamp(38px, 6.5vmin, 58px)
    height: clamp(38px, 6.5vmin, 58px)

.story-text
  margin: 0
  font-size: clamp(17px, 2.6vmin + 6px, 26px)

// The chapter's own page: its name, and one star per chapter.
.title-leaf
  flex-direction: column
  align-items: center
  gap: 10px
  padding: 22px 26px
  bottom: calc(env(safe-area-inset-bottom) + 12vh)

.chapter-name
  margin: 0
  color: #fff4e6
  --ink: #3A2340
  font-size: clamp(26px, 5vmin + 8px, 54px)
  text-align: center
  white-space: normal

.stars
  display: flex
  gap: 6px
  flex-wrap: wrap
  justify-content: center
  .star
    color: #ffc93f
    font-size: clamp(18px, 3.2vmin, 30px)
    text-shadow: 0 2px 0 #3A2340

// The corner that says "turn me", folded up off the paper's own corner.
.dog-ear
  position: absolute
  right: -3px
  bottom: -3px
  width: clamp(34px, 6vmin, 62px)
  height: clamp(34px, 6vmin, 62px)
  background: linear-gradient(to bottom left, #fff4e6 50%, transparent 50%)
  border-right: 3px solid #3A2340
  border-top: 3px solid #3A2340
  border-top-right-radius: 6px
  filter: drop-shadow(-3px -3px 0 rgba(20, 10, 30, 0.25))
  animation: ear-lift 1.5s ease-in-out infinite
  pointer-events: none

.skip
  position: absolute
  right: calc(env(safe-area-inset-right) + 12px)
  top: calc(env(safe-area-inset-top) + 12px)
  width: 56px
  height: 56px
  border-radius: 16px
  border: none
  display: flex
  align-items: center
  justify-content: center
  color: #fff
  background: var(--duel-plate)
  cursor: pointer
  .glyph
    width: 30px
    height: 30px
  &:focus-visible
    outline: 3px solid var(--duel-gold)
    outline-offset: 3px

// A phone held upright: the portrait shrinks, the words take the width.
@media (orientation: portrait)
  .portrait
    width: 72px
    height: 72px
    margin-top: -30px
  .leaf
    gap: 12px
    padding: 14px 16px

@keyframes ear-lift
  0%, 100%
    transform: translate(0, 0)
  50%
    transform: translate(-3px, -3px)

@media (prefers-reduced-motion: reduce)
  .dog-ear
    animation: none
</style>
