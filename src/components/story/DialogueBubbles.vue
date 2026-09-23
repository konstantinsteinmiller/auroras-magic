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
 *
 * `overArena` is the cold boot's opening (retention-roadmap item 2): the same
 * leaf, the same portrait, the same babble — but laid over a LIVE duel rather
 * than in front of one. There it takes no taps (every one belongs to the
 * canvas and the rune being drawn on it), turns no page, skips the chapter
 * title, and leaves the keyboard to the duel. It ADVANCES ITSELF, because the
 * tap that would turn a page is the tap that starts a rune; and it is put
 * away from outside, by whoever raised it — at whichever beat it has reached.
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
import { track } from '@/use/useAnalytics'
import Picto from '@/components/story/Picto.vue'
import GameIcon from '@/components/icons/GameIcon.vue'

const props = defineProps<{ lines: readonly Bubble[]; node: number; skippable?: boolean; overArena?: boolean }>()
const emit = defineEmits<{ done: [] }>()
const { t } = useI18n()

/** C12's minimum dwell per beat, ms. */
const DWELL_MS = 600

/**
 * How long a beat holds itself over the arena before the next one, ms.
 *
 * Not a new number: it is the picture book's SHORTEST page (`intro.ts`
 * `BEAT_LEN`, 3.4–4.4 s), which is this game's authored pace for a wordless
 * story beat carried by pictures and babble — the briskest one it already
 * uses, because nothing here should feel like a wall of text to a child who
 * cannot read it. Copied rather than imported: `intro.ts` pulls the sectors,
 * the rig and the fx pool, and none of that belongs in the duel's chunk.
 *
 * Three beats at this pace is about ten seconds if nobody touches the game —
 * a shade under the eleven `help.ts` gives ONE line over the same arena, and
 * moot for anyone who draws, since the first stroke takes the whole sequence
 * with it. The foe forms nothing until then (`sim.ts`: the onboarding holds
 * her), so none of it is time taken out of a fight.
 */
const ARENA_HOLD_MS = 3400

/** A chapter's first node opens on the chapter's title page (index -1) —
 *  except over the arena, where the duel is already the page. */
const titled = computed(() => !props.overArena && nodePosInChapter(props.node) === 0)
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
  // The same clock that gates a page turn also turns the arena's beats over,
  // so an ad or a hidden tab can never eat one of them either.
  if (props.overArena && dwell.value >= ARENA_HOLD_MS) selfAdvance()
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
  if (props.overArena) return
  if (finished || !ready.value || isGamePaused.value || fading()) return
  if (i.value >= props.lines.length - 1) {
    finish()
    return
  }
  // The page turns, and the next beat is printed on the one underneath.
  dipTo(() => { i.value++ }, DIP_PAGE)
}

/**
 * The arena's own advance: the next beat simply arrives, and the last one
 * ends the sequence.
 *
 * NO PAGE TURN. The turn swings a picture of the whole canvas away, and the
 * canvas here is a duel somebody may be drawing on — the beat exchanges
 * itself on the leaf instead, with the leaf's own entrance (it is re-keyed on
 * `i`, so the animation plays again rather than the words swapping in place).
 */
const selfAdvance = (): void => {
  if (finished) return
  if (i.value >= props.lines.length - 1) {
    finish()
    return
  }
  i.value++
  // Rewound HERE and not only in the `watch` that babbles: that watcher runs
  // on Vue's flush, and any tick landing before it would find the hold still
  // expired and turn a second beat over. Three bubbles would go by in one.
  dwell.value = 0
}

const skip = (): void => {
  if (finished) return
  sfx('ui')
  // How often the story is walked past, per node: the one number that says
  // whether the words are read or endured (retention item 1).
  track('dialogue_skip', { nodeId: props.node })
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
  // Over the arena the keyboard is the duel's: Space and Enter cast.
  if (!props.overArena) window.addEventListener('keydown', onKey)
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
  div.dialogue(:class="{ 'over-arena': overArena }" @click="advance")
    div.dim(v-if="!overArena")
    template(v-if="open")
      //- The chapter's title page.
      div.leaf.title-leaf(v-if="title" role="status" aria-live="polite")
        h2.chapter-name.ink-text {{ chapterName }}
        div.stars(aria-hidden="true")
          span.star(v-for="s in stars" :key="s") ★
        div.dog-ear(v-if="ready" aria-hidden="true")
      //- A story beat: the words on the page, the speaker inset beside them.
      div.leaf(v-else-if="line" :key="i" :class="left ? 'from-left' : 'from-right'")
        img.portrait(:src="portrait" alt="" draggable="false")
        div.words(role="status" aria-live="polite")
          div.pictos
            Picto.picto(v-for="p in line.pictos" :key="p" :name="p")
          p.story-text(v-if="text") {{ text }}
        //- The dog-ear says "turn me". Over the arena nothing turns.
        div.dog-ear(v-if="ready && !overArena" aria-hidden="true")
    button.skip.duel-plate(
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

// OVER A LIVE DUEL, the sheet is not there at all as far as the pointer is
// concerned: a finger that lands on the leaf is a finger starting a rune, and
// the cast button and the corner icons underneath stay pressable. Only the
// skip icon takes a press of its own.
.dialogue.over-arena
  pointer-events: none
  cursor: default
  // Seated a little tighter than a story page: it is a caption on a game in
  // progress, not the page itself. The trailing end is kept clear for the
  // skip icon that sits on it.
  .leaf
    bottom: calc(env(safe-area-inset-bottom) + 2vh)
    padding: 12px 18px
    padding-right: 74px
    // The motion tokens, so a player who asked for less gets less without a
    // second rule here (`theme.sass`, `useAccessibility`).
    animation: opening-in var(--am-dur-enter) var(--am-ease-pop) both
  // THE SKIP RIDES THE LEAF over the arena, instead of the screen's top-right
  // corner where the dialogue keeps it: that corner is the duel's — the foe's
  // name plate and her three rune slots — and on a phone held upright the
  // icon lands squarely on top of them.
  .skip
    pointer-events: auto
    cursor: pointer
    top: auto
    right: calc(env(safe-area-inset-right) + 3vw + 9px)
    bottom: calc(env(safe-area-inset-bottom) + 2vh + 9px)

// Just enough shade under the words for them to read on any page.
.dim
  position: absolute
  inset: 0
  background: linear-gradient(to top, var(--am-scrim-soft), transparent 46%)

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
  background: var(--am-paper)
  border: 4px solid var(--am-ink)
  border-radius: 22px
  box-shadow: 0 8px 0 rgba(58, 35, 64, 0.32)
  color: var(--am-ink)
  &.from-right
    flex-direction: row-reverse

.portrait
  flex: 0 0 auto
  width: clamp(78px, 15vmin, 132px)
  height: clamp(78px, 15vmin, 132px)
  margin-top: calc(-6vmin - 14px)
  -webkit-user-drag: none
  pointer-events: none
  filter: drop-shadow(0 5px 0 rgba(58, 35, 64, 0.3))

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
  color: var(--am-on-night)
  --ink: var(--am-ink)
  font-size: clamp(26px, 5vmin + 8px, 54px)
  text-align: center
  white-space: normal

.stars
  display: flex
  gap: 6px
  flex-wrap: wrap
  justify-content: center
  .star
    color: var(--am-gold)
    font-size: clamp(18px, 3.2vmin, 30px)
    // A DRAWN star, not a shadowed one. Gold on the cream leaf is 1.29:1 — a
    // one-sided drop shadow does not separate a glyph from its page, it only
    // seats it. The plum stroke is the same treatment `.ink-text` uses over the
    // arena, and it is what makes the star read as an inked mark on paper.
    -webkit-text-stroke: 0.09em var(--am-ink)
    paint-order: stroke fill

// The corner that says "turn me", folded up off the paper's own corner.
.dog-ear
  position: absolute
  right: -3px
  bottom: -3px
  width: clamp(34px, 6vmin, 62px)
  height: clamp(34px, 6vmin, 62px)
  background: linear-gradient(to bottom left, var(--am-paper) 50%, transparent 50%)
  border-right: 3px solid var(--am-ink)
  border-top: 3px solid var(--am-ink)
  border-top-right-radius: 6px
  filter: drop-shadow(-3px -3px 0 rgba(58, 35, 64, 0.25))
  animation: ear-lift 1.5s ease-in-out infinite
  pointer-events: none

.skip
  position: absolute
  right: calc(env(safe-area-inset-right) + 12px)
  top: calc(env(safe-area-inset-top) + 12px)
  width: 56px
  height: 56px
  display: flex
  align-items: center
  justify-content: center
  cursor: pointer
  .glyph
    width: 30px
    height: 30px
  &:focus-visible
    outline: 3px solid var(--am-ink)
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

// The opening leaf arriving over a duel that is already on screen.
@keyframes opening-in
  from
    opacity: 0
    transform: translateY(18px)
  to
    opacity: 1
    transform: none

@media (prefers-reduced-motion: reduce)
  .dog-ear
    animation: none
</style>
