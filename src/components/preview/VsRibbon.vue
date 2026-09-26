<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { previewHud } from '@/game/preview/previewHud'
import { useArtImage } from '@/use/useArtImage'
import { vFit } from '@/use/vFit'
import { RIBBON_IDS, SPAN_Y, TAIL, drawnRibbonUrl, ribbonBandStyle, ribbonSlices, type RibbonSide } from '@/components/preview/ribbonFrame'
import { MARK_IDS, crownBox, drawnCrownUrl } from '@/components/preview/vsMarks'
import { ribbonHeight } from '@/components/preview/previewSizes'

/**
 * A duelist's NAME RIBBON — the star of the VS preview: a satin storybook
 * banner above her head with forked swallow-tails, her name set big on it in
 * the game's shouted type, and — for a chapter's Guardian — a little gold
 * crown perched on top. (Her epithet heads her powers block, `PowerRow.vue`:
 * the layout keeps only a small gap between the ribbon and her horn, and
 * reserves the epithet's line with her powers.)
 *
 * Aurora's is warm rose satin with gold selvedge and a tiny gold star at each
 * end; the foe's is the friendly night — indigo-lilac with moonlit silver and
 * a small crescent — with her own glow colour (`tint`) as a soft light behind
 * it. The shape is `ribbonFrame.ts`: ONE element carries the whole drawn
 * ribbon as a 9-slice `border-image`, the band's plain middle stretching with
 * the name while the tails keep their shape — and when the painting exists it
 * is laid on through the very same slices.
 *
 * Positioned by the layout (`lay.heroRibbon` / `lay.foeRibbon`): the centre
 * of the box reserved for the whole ribbon, tails included (`PREVIEW_DOM
 * .ribbonH`), and the widest it may be. The band sits at the top of that box
 * and the tails hang to its foot. The name shrinks to fit (`v-fit`) before it
 * would ever be cut.
 *
 * Animated from the root's beat classes (`DuelPreview.vue`): unfurls from its
 * centre with a wobble at `ribbons` (the foe's 0.10 s later), the name pops
 * (0.62 / 0.72 s), a glint crosses it (0.8–1.3 s), a Guardian's crown drops
 * on (0.86 / 0.92 s), and it sways softly through the hold.
 */
const props = defineProps<{ side: 'hero' | 'foe' }>()
const { t } = useI18n()

const who = computed(() => previewHud[props.side])
const art = computed<Exclude<RibbonSide, 'banner'>>(() => (props.side === 'hero' ? 'aurora' : 'foe'))
const box = computed(() => (props.side === 'hero' ? previewHud.lay.heroRibbon : previewHud.lay.foeRibbon))
const H = computed(() => ribbonHeight(previewHud.lay))

/** The painting, or null while the drawing stands in. */
const painted = useArtImage('worldUi', () => RIBBON_IDS[art.value])
const crownPainted = useArtImage('worldUi', () => (who.value.boss ? MARK_IDS.crown : ''))

const px = (v: number): string => `${v.toFixed(1)}px`

const wrapStyle = computed(() => ({
  left: px(box.value.x),
  // The band's middle: the top of the reserved box, plus half a band.
  top: px(box.value.y - (H.value * SPAN_Y) / 2 + H.value / 2),
  '--H': px(H.value),
  ...(who.value.tint ? { '--tint': who.value.tint } : {})
}))

const bandStyle = computed(() => {
  const src = painted.value ? `url("${painted.value}")` : (drawnRibbonUrl(art.value) ?? 'none')
  const s = ribbonSlices(art.value)
  return {
    ...ribbonBandStyle(art.value, H.value, src),
    // The tails overhang the band by a `TAIL` each side: the band gets the rest.
    maxWidth: px(Math.max(H.value * 2 * (s.pad + 0.6), box.value.w - H.value * 2 * TAIL))
  }
})

const name = computed(() => (who.value.name ? t(who.value.name) : ''))

/* The crown: its base set onto the band's top selvedge at the middle, tipped
   a touch to one side. It pokes ~0.7 of a band above the ribbon, inside the
   layout's `crownPoke`. */
const crownStyle = computed(() => {
  const b = crownBox()
  const cw = H.value * 0.86
  const src = crownPainted.value ? `url("${crownPainted.value}")` : (drawnCrownUrl() ?? 'none')
  // Local (0, 0.34) is the middle of the crown's foot.
  const baseY = H.value * 0.14
  return {
    left: `calc(50% + ${px(b.x * cw)})`,
    top: px(baseY - 0.34 * cw + b.y * cw),
    width: px(b.w * cw),
    height: px(b.h * cw),
    transformOrigin: `${px(-b.x * cw)} ${px((0.34 - b.y) * cw)}`,
    backgroundImage: src
  }
})
</script>

<template lang="pug">
  div.rb(:class="[side, art, { painted: !!painted, boss: who.boss }]" :style="wrapStyle")
    div.rb-band(:style="bandStyle")
      span.rb-name.ink-text(v-fit) {{ name }}
    span.rb-crown(v-if="who.boss" :style="crownStyle" aria-hidden="true")
</template>

<style scoped lang="sass">
// Every length is in BANDS: `--H` is the band's height in CSS px.
.rb
  position: absolute
  // The band's centre sits on the point the script works out above.
  translate: -50% -50%
  height: var(--H)
  display: flex
  // The wrapper IS the band's box; the crown and the glow hang off it.
  pointer-events: none

// The soft light behind the ribbon: her own glow for a foe, a warm pink for
// Aurora. Static — it only ever fades in (opacity), never pulses a filter.
.rb::before
  content: ''
  position: absolute
  z-index: -1
  left: calc(var(--H) * -0.5)
  right: calc(var(--H) * -0.5)
  top: calc(var(--H) * -0.7)
  bottom: calc(var(--H) * -0.9)
  border-radius: 50%
  background: radial-gradient(closest-side, var(--tint, var(--glow)) 25%, transparent)
  opacity: 0
.aurora
  --glow: var(--am-vs-hero-glow)
.foe
  --glow: var(--am-vs-foe-glow)

// ── the band: the whole drawn ribbon is its border-image ──
.rb-band
  position: relative
  box-sizing: border-box
  height: var(--H)
  min-width: calc(var(--H) * 2.2)
  display: flex
  align-items: center
  justify-content: center
  border: 0 solid transparent
  // Clips the glint (below) to the band; the ribbon itself is the element's
  // own border-image, which its overflow never clips.
  overflow: hidden
  opacity: 0
  transform: scaleX(0.05)

// The running stitch just inside the selvedge — drawn in CSS, not in the
// image, so its stitches stay the same length however far the band stretches.
// It runs over the PAINTED ribbon too: the painting's middle is plain satin on
// purpose (it is the part the 9-slice stretches, and a painted stitch would
// stretch with it), so without this line the painted band read flatter than
// the drawn one it replaced.
.rb-band::before
  content: ''
  position: absolute
  left: calc(var(--H) * 0.1)
  right: calc(var(--H) * 0.1)
  top: calc(var(--H) * 0.19)
  bottom: calc(var(--H) * 0.19)
  border-top: max(1px, calc(var(--H) * 0.03)) dashed var(--stitch)
  border-bottom: max(1px, calc(var(--H) * 0.03)) dashed var(--stitch)
  opacity: 0.85
  pointer-events: none
.aurora .rb-band
  --stitch: var(--am-vs-rose-stitch)
.foe .rb-band
  --stitch: var(--am-vs-night-stitch)
.painted .rb-band::before
  opacity: 0.7

// The glint that crosses the ribbon as it lands.
.rb-band::after
  content: ''
  position: absolute
  top: 0
  bottom: 0
  left: 0
  width: 38%
  background: linear-gradient(100deg, transparent 10%, var(--am-vs-shine) 48%, transparent 86%)
  transform: translateX(-130%) skewX(-18deg)
  opacity: 0
  pointer-events: none

.rb-name
  position: relative
  z-index: 1
  display: block
  min-width: 0
  max-width: 100%
  overflow: hidden
  box-sizing: border-box
  // Room inside the clip for the plum outline (0.28em of .ink-text).
  padding: 0.1em 0.17em
  font-size: calc(var(--H) * 0.56)
  // Room for Devanagari's and Thai's marks inside the band.
  line-height: 1.2
  color: var(--am-shout)
  text-align: center
  // One plum step under the letters: chunky, like the canvas' own titles.
  text-shadow: 0 0.07em 0 var(--am-ink)
  opacity: 0

.rb-crown
  position: absolute
  background-size: 100% 100%
  background-repeat: no-repeat
  rotate: -8deg
  opacity: 0

// ── the timeline (beat classes on the root; delays are offsets within a beat) ──
.r-ribbons
  .rb::before
    animation: rb-glow 0.6s ease-out both
  .rb-band
    animation: rb-unfurl 0.42s var(--am-ease-out) both
  .rb-band::after
    animation: rb-shine 0.5s ease-in-out 0.3s both
  .rb-name
    animation: rb-name 0.3s var(--am-ease-pop) 0.12s both
  .rb-crown
    animation: rb-crown 0.45s var(--am-ease-pop) 0.36s both
  .foe
    &::before
      animation-delay: 0.1s
    .rb-band
      animation-delay: 0.1s
    .rb-name
      animation-delay: 0.22s
    .rb-crown
      animation-delay: 0.42s

// The hold: the two ribbons breathe out of step, like cloth in a slow breeze.
.r-hold .rb
  animation: rb-sway 3.2s ease-in-out infinite alternate
.r-hold .rb.foe
  animation-delay: -1.6s

// ── reduced motion (the game's toggle, or the device's): arrivals fade,
// nothing sways, no glint ──
.still
  .rb-band
    transform: none
  &.r-ribbons
    .rb-band, .rb-name, .rb-crown
      animation-name: rb-fade
      animation-timing-function: ease-out
    .rb-band::after
      animation: none
  &.r-hold .rb
    animation: none
@media (prefers-reduced-motion: reduce)
  .rb-band
    transform: none
  .r-ribbons
    .rb-band, .rb-name, .rb-crown
      animation-name: rb-fade
      animation-timing-function: ease-out
    .rb-band::after
      animation: none
  .r-hold .rb
    animation: none

@keyframes rb-glow
  from
    opacity: 0
  to
    opacity: 0.7

// Unfurls from its centre, overshoots, and settles with a little wobble.
@keyframes rb-unfurl
  0%
    opacity: 0
    transform: scaleX(0.05) scaleY(0.7)
  12%
    opacity: 1
  48%
    transform: scaleX(1.1) scaleY(1.05) rotate(-2.5deg)
  70%
    transform: scaleX(0.96) scaleY(0.98) rotate(1.4deg)
  86%
    transform: scaleX(1.02) rotate(-0.5deg)
  100%
    opacity: 1
    transform: none

@keyframes rb-shine
  0%
    opacity: 1
    transform: translateX(-130%) skewX(-18deg)
  100%
    opacity: 1
    transform: translateX(300%) skewX(-18deg)

@keyframes rb-name
  0%
    opacity: 0
    transform: scale(0.6)
  60%
    opacity: 1
    transform: scale(1.08)
  100%
    opacity: 1
    transform: none

// Drops onto the ribbon from above and bounces to rest, tipped to one side.
@keyframes rb-crown
  0%
    opacity: 0
    transform: translateY(calc(var(--H) * -0.9)) rotate(-24deg) scale(0.6)
  55%
    opacity: 1
    transform: translateY(calc(var(--H) * 0.06)) rotate(6deg) scale(1.06)
  78%
    transform: translateY(calc(var(--H) * -0.04)) rotate(-2deg)
  100%
    opacity: 1
    transform: none

@keyframes rb-sway
  from
    rotate: -1.2deg
  to
    rotate: 1.2deg

@keyframes rb-fade
  from
    opacity: 0
  to
    opacity: 1
</style>
