<script setup lang="ts">
/**
 * Aurora's help note (retention-roadmap item 8).
 *
 * Two losses on a node turn the rune ghost on for this duel
 * (`game/duel/help.ts`); this is the half of it that says WHO turned it on.
 * Her portrait, one pictogram and one line on the book's own paper — the same
 * three pieces a story beat is made of (§10.6), laid out small enough to sit
 * over the duel without covering the drawing zone.
 *
 * The PICTO carries the meaning: the youngest player here is three and reads
 * nothing, so the line is a bonus for the children who can. Nothing in it
 * counts losses, and nothing in it is about the player — it is a friend
 * leaning over with a crayon, which is why Aurora is drawn `happy` rather
 * than worried.
 *
 * It takes no pointer events: a stroke may start anywhere, including on top
 * of this.
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { portraitUrl } from '@/game/story/portrait'
import { vFit } from '@/use/vFit'
import Picto from '@/components/story/Picto.vue'

const { t } = useI18n()
const portrait = computed(() => portraitUrl('aurora', 'happy'))
</script>

<template lang="pug">
  div.help-note(role="status")
    img.who(:src="portrait" alt="" draggable="false")
    Picto.mark(name="sparkle")
    p.line.ink-text(v-fit) {{ t('help.auroraLine') }}
</template>

<style scoped lang="sass">
// Sized entirely off `--hn`, the note's own unit, so one card serves the
// landscape stage layer (stage units) and a phone's HUD band (CSS px).
.help-note
  position: absolute
  inset: 0
  display: flex
  align-items: center
  gap: calc(10 * var(--hn, 1px))
  padding: calc(8 * var(--hn, 1px)) calc(16 * var(--hn, 1px))
  background: var(--am-paper)
  border: calc(4 * var(--hn, 1px)) solid var(--am-ink)
  border-radius: calc(20 * var(--hn, 1px))
  box-shadow: var(--am-shadow-plate)
  color: var(--am-ink)
  pointer-events: none
  // One shot, not a loop: it arrives, it stays put, it does not breathe at
  // the player while she is trying to draw. On the theme's own enter token,
  // which collapses to 1 ms under reduced motion — this is a notice sliding
  // in, not the reward beat that keeps its motion.
  animation: help-note-in var(--am-dur-enter) var(--am-ease-out) both

.who
  flex: 0 0 auto
  width: calc(64 * var(--hn, 1px))
  height: calc(64 * var(--hn, 1px))
  -webkit-user-drag: none

.mark
  flex: 0 0 auto
  width: calc(38 * var(--hn, 1px))
  height: calc(38 * var(--hn, 1px))

.line
  flex: 1 1 auto
  min-width: 0
  margin: 0
  font-size: calc(26 * var(--hn, 1px))
  line-height: 1.24
  // A SENTENCE, NOT A SHOUT. `.ink-text` is the style the arena shouts in and
  // a shout is one line by definition, so it carries `white-space: nowrap` —
  // which this line inherited, and which made the two-line box below
  // unreachable. Every translation was laid out on ONE line and then cut by
  // the `overflow` under it: Russian lost 30 px of "Давай нарисуем её
  // вместе!", Ukrainian 23, and the Vietnamese line ran 49 px past the paper
  // and 8 px off the phone's screen entirely (locale-fit sweep, 2026-09-23).
  white-space: normal
  // Two lines of a long translation still fit the card; a third is clipped
  // rather than allowed to push the paper over the drawing zone. `v-fit`
  // shrinks the sentence into those two lines first, so the clip is the last
  // resort it is meant to be rather than the normal case.
  max-height: 2.5em
  overflow: hidden

@keyframes help-note-in
  from
    opacity: 0
    transform: translateY(calc(-10 * var(--hn, 1px))) scale(0.94)
  to
    opacity: 1
    transform: none
</style>
