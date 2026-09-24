<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { registerHot, releaseHot } from '@/use/useDuelHud'
import { reducedMotion } from '@/use/useAccessibility'
import { useArtImage } from '@/use/useArtImage'
import { vFit } from '@/use/vFit'
import { HP_FRAMES } from '@/game/artIds'
import { MARKS, type LowLevel } from '@/game/duel/hpGauge'
import {
  CAP_FAR, CAP_NEAR, MED_C, RAIL_END_IN, WIN_END_IN, WIN_X0, WIN_Y0, WIN_Y1,
  finialParts, medallionParts, paintedSlices, type HpSide
} from '@/game/duel/hpFrame'

/**
 * A duelist's HP bar, as a TRADITIONAL health bar: a framed, recessed track
 * with notches at a quarter, a half and three quarters; the fill; the pale
 * CHIP a hit leaves behind for a moment; and the duelist's name on its own
 * little plate, tucked onto the frame by the medallion.
 *
 * Two frames, one layout (`game/duel/hpFrame.ts`): Aurora's is cream and gold
 * with her star, anchored left; every foe's is a calm night — deep indigo,
 * moonlit silver, a crescent — anchored right. Each is DRAWN (inline SVG ends,
 * a CSS rail, every colour a token) until its painting exists; then the
 * painting is laid on as one `border-image`, whose plain middle is the only
 * part that stretches with the bar.
 *
 * Sized by the parent: the root box IS the rail (its height is one rail, `R`,
 * which the parent also passes as `--hp-r`); the plate above it and the
 * medallion's overhang are drawn outside that box.
 *
 * The fill and the chip change every frame while they animate, so they are
 * NOT bound through Vue — `useDuelHud.syncHud` clips them straight onto these
 * elements (`hpGauge.writeGauge`).
 */
const props = withDefaults(defineProps<{
  side: 'left' | 'right'
  name: string
  /** Screen-reader text; the bar itself is decorative. */
  label: string
  /** The low-health glow (`hpGauge.lowLevel`) — only a PLAYER's bar gets one. */
  low?: LowLevel
  /** The foe's own glow colour, for the halo behind her medallion. */
  tint?: string
  /** "Almost there!" (`hpGauge.foeAlmost`) — only a FOE's bar: a soft gold
   *  shimmer runs along what is left of her fill, good news for the player. */
  almost?: boolean
}>(), { low: 0, tint: '', almost: false })

const root = ref<HTMLElement | null>(null)
const fill = ref<HTMLElement | null>(null)
const ghost = ref<HTMLElement | null>(null)
// The foe's plate is also the target of the hidden QA ad chord. It is hit-tested
// by the scene, so it is registered here, and released only if still ours: the
// landscape and portrait HUDs each mount a bar and can swap in either order.
let foeBar: HTMLElement | null = null

onMounted(() => {
  if (props.side === 'left') {
    registerHot('hpFill', fill.value)
    registerHot('hpGhost', ghost.value)
  } else {
    registerHot('ehpFill', fill.value)
    registerHot('ehpGhost', ghost.value)
    foeBar = root.value
    registerHot('ehpBar', foeBar)
  }
})
onUnmounted(() => {
  if (props.side === 'left') {
    registerHot('hpFill', null)
    registerHot('hpGhost', null)
  } else {
    registerHot('ehpFill', null)
    registerHot('ehpGhost', null)
    releaseHot('ehpBar', foeBar)
  }
})

const frameSide = computed<HpSide>(() => (props.side === 'left' ? 'aurora' : 'foe'))
/** The painting, or null while the drawn frame stands in (art off, or none yet). */
const frameSrc = useArtImage('worldUi', () => HP_FRAMES[frameSide.value].id)

/* ── layout, in rails ──
   Local x runs from the medallion's outer edge along the bar; `near` is that
   end's side of the screen (left for Aurora, right for the foe) and `far` the
   other. Everything is `calc(var(--R) * k)`, `--R` being the rail. */
const r = (k: number): string => `calc(var(--R) * ${+k.toFixed(4)})`
const near = computed(() => (props.side === 'left' ? 'left' : 'right'))
const far = computed(() => (props.side === 'left' ? 'right' : 'left'))

const railStyle = computed(() => ({ [near.value]: r(MED_C[0]), [far.value]: r(RAIL_END_IN) }))
/** The track. Under a painting it reaches a little way under the rail, so a
 *  return that lands a hair off the reference never shows a seam. */
const trackStyle = computed(() => {
  const tuck = frameSrc.value ? 0.05 : 0
  return {
    [near.value]: r(WIN_X0 - tuck),
    [far.value]: r(WIN_END_IN - tuck),
    top: r(WIN_Y0 - tuck),
    height: r(WIN_Y1 - WIN_Y0 + 2 * tuck)
  }
})
const glowStyle = computed(() => ({ [near.value]: r(MED_C[0] - 0.1), [far.value]: r(RAIL_END_IN - 0.05) }))
const haloStyle = computed(() => ({ [near.value]: r(MED_C[0] - 1), top: r(MED_C[1] - 1), '--hp-tint': props.tint }))

/** A notch sits at the HP it marks: from the bar's anchored end. */
const markStyle = (m: number): Record<string, string> => ({ [near.value]: `${m * 100}%` })

const nearParts = computed(() => medallionParts(frameSide.value))
const farParts = computed(() => finialParts(frameSide.value))
const box = (b: { x: number; y: number; w: number; h: number }): string => `${b.x} ${b.y} ${b.w} ${b.h}`
const nearCapStyle = computed(() => ({ [near.value]: r(CAP_NEAR.x), top: r(CAP_NEAR.y), width: r(CAP_NEAR.w), height: r(CAP_NEAR.h) }))
const farCapStyle = computed(() => ({ [far.value]: r(-(CAP_FAR.x + CAP_FAR.w)), top: r(CAP_FAR.y), width: r(CAP_FAR.w), height: r(CAP_FAR.h) }))

/** The painting as a 9-slice `border-image` (`hpFrame.paintedSlices`): the
 *  medallion and the finial at their own size, only the plain rail stretched. */
const SL = paintedSlices()
const artStyle = computed(() => {
  const pc = (v: number): string => `${(v * 100).toFixed(3)}%`
  // Image slices and widths in CSS order: top, right, bottom, left. The foe's
  // painting has its medallion on the RIGHT.
  const [rs, ls] = props.side === 'left' ? [SL.far, SL.near] : [SL.near, SL.far]
  const [rw, lw] = props.side === 'left' ? [SL.farW, SL.nearW] : [SL.nearW, SL.farW]
  const widths = `${r(SL.topW)} ${r(rw)} ${r(SL.bottomW)} ${r(lw)}`
  return {
    [near.value]: r(-SL.outNear),
    [far.value]: r(-SL.outFar),
    top: r(-SL.outTop),
    height: r(SL.height),
    borderWidth: widths,
    borderImageSource: `url("${frameSrc.value}")`,
    borderImageSlice: `${pc(SL.top)} ${pc(rs)} ${pc(SL.bottom)} ${pc(ls)}`,
    borderImageWidth: widths
  }
})

const lowClass = computed(() => (props.low ? [`low-${props.low}`, { still: reducedMotion.value }] : []))
const almostClass = computed(() => (props.almost ? ['almost', { still: reducedMotion.value }] : []))
</script>

<template lang="pug">
  div.hp-bar(ref="root" :class="[side, frameSide, lowClass, almostClass, { painted: !!frameSrc }]" role="img" :aria-label="label")
    //- Behind everything: the low-health glow, the foe's "almost" glow, and
    //- the foe's own halo.
    div.hp-glow(v-if="low" :style="glowStyle" aria-hidden="true")
    div.hp-almost(v-if="almost" :style="glowStyle" aria-hidden="true")
    div.hp-halo(v-if="tint" :style="haloStyle" aria-hidden="true")

    div.hp-rail(v-if="!frameSrc" :style="railStyle" aria-hidden="true")

    div.hp-track(:style="trackStyle" aria-hidden="true")
      div.hp-marks.on-track
        span.hp-mark(v-for="m in MARKS" :key="m" :class="{ half: m === 0.5 }" :data-at="m" :style="markStyle(m)")
      div.hp-ghost(ref="ghost")
        div.hp-marks
          span.hp-mark(v-for="m in MARKS" :key="m" :class="{ half: m === 0.5 }" :style="markStyle(m)")
      div.hp-fill.empty(ref="fill")
        div.hp-tint
        div.hp-marks
          span.hp-mark(v-for="m in MARKS" :key="m" :class="{ half: m === 0.5 }" :data-at="m" :style="markStyle(m)")
        //- Inside the fill, so its clip keeps the shimmer on what is LEFT.
        div.hp-shine(v-if="almost" aria-hidden="true")
          span.hp-spark(v-for="i in 3" :key="i")
      //- The last sliver's floor: a stub of fill as wide as the track's round
      //- end, under the fill, shown whenever the fill is not empty.
      div.hp-fill-cap
        div.hp-tint

    template(v-if="!frameSrc")
      svg.hp-cap.near(:style="nearCapStyle" :viewBox="box(CAP_NEAR)" aria-hidden="true")
        path(v-for="(p, i) in nearParts" :key="i" :d="p.d" :class="[p.paint, { inked: p.ink }]" :stroke-width="p.ink ? 0.05 * p.ink : undefined")
      svg.hp-cap.far(:style="farCapStyle" :viewBox="box(CAP_FAR)" aria-hidden="true")
        path(v-for="(p, i) in farParts" :key="i" :d="p.d" :class="[p.paint, { inked: p.ink }]" :stroke-width="p.ink ? 0.05 * p.ink : undefined")
    div.hp-frame-art(v-else :style="artStyle" aria-hidden="true")

    div.hp-plate
      span.hp-name(v-fit) {{ name }}
</template>

<style scoped lang="sass">
// Every length is in RAILS: `--hp-r` is the rail's height, set by the parent.
// The root box is the rail itself.
.hp-bar
  --R: var(--hp-r, 40px)
  position: relative
  width: 100%
  height: 100%

.hp-glow, .hp-halo, .hp-rail, .hp-track, .hp-cap, .hp-frame-art, .hp-plate
  position: absolute

// ── the frame, drawn ──
.hp-rail
  top: 0
  bottom: 0
  box-sizing: border-box
  border: calc(var(--R) * 0.05) solid var(--am-ink)
  z-index: 1
.left .hp-rail
  border-left: 0
  border-radius: 0 calc(var(--R) * 0.5) calc(var(--R) * 0.5) 0
.right .hp-rail
  border-right: 0
  border-radius: calc(var(--R) * 0.5) 0 0 calc(var(--R) * 0.5)
// Lit along its top, shaded along its foot — the same all the way along.
.aurora .hp-rail
  background: linear-gradient(var(--am-gold-lite) 0 14%, var(--am-gold) 30% 66%, var(--am-gold-foot) 86%)
.foe .hp-rail
  background: linear-gradient(var(--am-moon-silver-shade) 0 12%, var(--am-moon-night) 26% 72%, var(--am-moon-night-deep) 90%)

.hp-cap
  z-index: 3
  overflow: visible
  pointer-events: none
.foe .hp-cap
  // The foe's frame is Aurora's layout mirrored; its paths are pre-lit for it.
  transform: scaleX(-1)
.hp-cap path
  stroke: none
  &.inked
    stroke: var(--am-ink)
    stroke-linejoin: round
.aurora
  .ring, .emblem, .leafShade
    fill: var(--am-gold)
  .ringLite, .leaf
    fill: var(--am-gold-lite)
  .ringShade, .emblemShade
    fill: var(--am-gold-foot)
  .disc
    fill: var(--am-paper)
  .discShade
    fill: var(--am-parchment)
  .emblemLite, .beadLite
    fill: var(--am-paper-raised)
  .bead, .dot
    fill: var(--am-on-night)
.foe
  .ring, .leaf, .emblem
    fill: var(--am-moon-silver)
  .ringLite, .emblemLite, .beadLite, .dot
    fill: var(--am-moon-silver-lite)
  .ringShade, .leafShade, .emblemShade
    fill: var(--am-moon-silver-shade)
  .disc
    fill: var(--am-moon-night)
  .discShade
    fill: var(--am-moon-night-deep)
  .bead
    fill: var(--am-moon-stone)

// ── the frame, painted ──
.hp-frame-art
  box-sizing: border-box
  z-index: 3
  border-style: solid
  border-color: transparent
  border-image-repeat: stretch
  pointer-events: none

// ── the track: a well cut into the frame (§3.13 keeps it night-dark) ──
.hp-track
  z-index: 2
  overflow: hidden
  border-radius: 999px
  background: var(--am-night-deep)
  box-shadow: inset 0 calc(var(--R) * 0.08) calc(var(--R) * 0.1) var(--am-hp-well-shade)
// Drawn, the track has its own lip where it meets the rail.
.aurora:not(.painted) .hp-track
  box-shadow: inset 0 calc(var(--R) * 0.08) calc(var(--R) * 0.1) var(--am-hp-well-shade), 0 0 0 calc(var(--R) * 0.035) var(--am-ink)
.foe:not(.painted) .hp-track
  box-shadow: inset 0 calc(var(--R) * 0.08) calc(var(--R) * 0.1) var(--am-hp-well-shade), 0 0 0 calc(var(--R) * 0.035) var(--am-moon-silver)

// The fill and the chip span the whole track; `useDuelHud` clips them to the
// HP (`hpGauge.writeGauge`). No transition on either — they move every frame.
.hp-ghost, .hp-fill, .hp-tint, .hp-marks
  position: absolute
  inset: 0

.hp-ghost
  background: var(--am-hp-chip)
.hp-fill
  z-index: 2

// The cap: however narrow the bar, any HP above 0 shows at least the track's
// round end filled. It sits under the fill (so a longer fill simply covers
// it) and goes with it (`.empty`, written by `hpGauge.writeGauge`).
.hp-fill-cap
  position: absolute
  z-index: 1
  top: 0
  bottom: 0
  width: calc(var(--R) * 0.45)
  overflow: hidden
.left .hp-fill-cap
  left: 0
.right .hp-fill-cap
  right: 0
.hp-fill.empty + .hp-fill-cap
  visibility: hidden

.aurora
  .hp-fill, .hp-fill-cap
    background: linear-gradient(var(--am-gold) 0 50%, var(--am-gold-foot))
.foe
  .hp-fill, .hp-fill-cap
    background: linear-gradient(var(--duel-lavender) 0 50%, var(--am-lilac-foot))
// The gloss along its top: a fill is a thing with a surface, not a flat band.
.hp-fill::before, .hp-fill-cap::before
  content: ''
  position: absolute
  left: 0
  right: 0
  top: 12%
  height: 26%
  background: var(--am-hp-gloss)
  border-radius: 999px

// ── the notches: light on the empty track, ink on the fill and the chip ──
.hp-mark
  position: absolute
  top: 0
  bottom: 0
  width: max(1.5px, calc(var(--R) * 0.06))
  background: var(--am-ink)
  &.half
    width: max(2px, calc(var(--R) * 0.09))
.left .hp-mark
  transform: translateX(-50%)
.right .hp-mark
  transform: translateX(50%)
.on-track .hp-mark
  background: var(--am-hp-mark-lite)
  opacity: 0.8

// ── low health: warm, noticeable, never scary ──
.hp-tint
  background: var(--am-hp-low)
  opacity: 0
.hp-glow
  z-index: 0
  top: calc(var(--R) * -0.04)
  bottom: calc(var(--R) * -0.04)
  border-radius: calc(var(--R) * 0.55)
  box-shadow: 0 0 calc(var(--R) * 0.4) calc(var(--R) * 0.14) var(--am-hp-low)
  background: var(--am-hp-low)
.low-1
  .hp-glow
    opacity: 0.5
  .hp-tint
    opacity: 0.22
.low-2
  .hp-glow
    animation: hp-low-pulse 1.5s ease-in-out infinite
  .hp-tint
    animation: hp-low-tint 1.5s ease-in-out infinite
// Reduced motion — the game's own toggle or the device's: the same warning,
// held still.
.low-2.still
  .hp-glow
    animation: none
    opacity: 0.9
  .hp-tint
    animation: none
    opacity: 0.4
@media (prefers-reduced-motion: reduce)
  .low-2
    .hp-glow
      animation: none
      opacity: 0.9
    .hp-tint
      animation: none
      opacity: 0.4

@keyframes hp-low-pulse
  0%, 100%
    opacity: 0.55
  50%
    opacity: 1
@keyframes hp-low-tint
  0%, 100%
    opacity: 0.25
  50%
    opacity: 0.5

// ── the foe's "almost there!": gold, soft, and GOOD news ──
// Mirrors the player's low-health glow on the other bar, but it is a reward,
// not a warning: gold (never the coral-red `--am-hp-low`), a slow breath
// behind the bar, and a band of light running along what is left of her fill
// with three little sparkles on it. Reduced motion: a still gold glow and a
// still gold sheen.
.hp-almost
  z-index: 0
  top: calc(var(--R) * -0.06)
  bottom: calc(var(--R) * -0.06)
  border-radius: calc(var(--R) * 0.55)
  background: var(--am-gold)
  box-shadow: 0 0 calc(var(--R) * 0.55) calc(var(--R) * 0.2) var(--am-gold)
  opacity: 0.6
  animation: hp-almost-breathe 2.2s ease-in-out infinite

.hp-shine
  position: absolute
  inset: 0
  overflow: hidden
  pointer-events: none
  // A soft band of gold light, repeating every three rails and sliding one
  // period per beat: however short her fill is, a glint crosses it.
  background-image: linear-gradient(100deg, transparent 22%, var(--am-gold-lite) 44%, var(--am-gold) 50%, var(--am-gold-lite) 56%, transparent 78%)
  background-size: calc(var(--R) * 3) 100%
  background-repeat: repeat-x
  opacity: 0.8
  animation: hp-shine 1.4s linear infinite
.right .hp-shine
  animation-direction: reverse

// Three tiny four-point sparkles, near her anchored end (the right for a foe)
// where the fill always is.
.hp-spark
  position: absolute
  top: 18%
  width: calc(var(--R) * 0.34)
  height: calc(var(--R) * 0.34)
  background: var(--am-paper-raised)
  clip-path: var(--am-spark-clip)
  opacity: 0
  animation: hp-twinkle 1.8s ease-in-out infinite
  &:nth-child(1)
    right: 3%
  &:nth-child(2)
    right: 9%
    top: 44%
    animation-delay: 0.6s
  &:nth-child(3)
    right: 15%
    animation-delay: 1.2s
.left .hp-spark
  right: auto
  &:nth-child(1)
    left: 3%
  &:nth-child(2)
    left: 9%
  &:nth-child(3)
    left: 15%

.almost.still
  .hp-almost
    animation: none
    opacity: 0.8
  .hp-shine
    animation: none
    background-image: linear-gradient(var(--am-gold-lite) 0 30%, transparent 70%)
    background-size: 100% 100%
    opacity: 0.55
  .hp-spark
    animation: none
    opacity: 0.9
@media (prefers-reduced-motion: reduce)
  .almost
    .hp-almost
      animation: none
      opacity: 0.8
    .hp-shine
      animation: none
      background-image: linear-gradient(var(--am-gold-lite) 0 30%, transparent 70%)
      background-size: 100% 100%
      opacity: 0.55
    .hp-spark
      animation: none
      opacity: 0.9

@keyframes hp-almost-breathe
  0%, 100%
    opacity: 0.45
  50%
    opacity: 0.9
@keyframes hp-shine
  from
    background-position-x: 0
  to
    background-position-x: calc(var(--R) * 3)
@keyframes hp-twinkle
  0%, 100%
    opacity: 0
    transform: scale(0.4) rotate(0deg)
  50%
    opacity: 1
    transform: scale(1) rotate(45deg)

// ── the foe's halo: her own glow colour, soft behind the medallion ──
.hp-halo
  z-index: 0
  width: calc(var(--R) * 2)
  height: calc(var(--R) * 2)
  border-radius: 50%
  background: radial-gradient(closest-side, var(--hp-tint) 55%, transparent)
  opacity: 0.6

// ── the name plate, tucked onto the rail's top band by the medallion ──
.hp-plate
  z-index: 4
  bottom: calc(100% - var(--R) * 0.12)
  height: calc(var(--R) * var(--hp-plate, 0.74))
  min-width: calc(var(--R) * 1.4)
  max-width: calc(100% - var(--R) * 2.8)
  box-sizing: border-box
  display: flex
  align-items: center
  justify-content: center
  padding: 0 calc(var(--R) * 0.24)
  border: calc(var(--R) * 0.05) solid
  border-bottom-width: calc(var(--R) * 0.035)
  border-radius: calc(var(--R) * 0.26) calc(var(--R) * 0.26) calc(var(--R) * 0.1) calc(var(--R) * 0.1)
.left .hp-plate
  left: calc(var(--R) * 1.36)
.right .hp-plate
  right: calc(var(--R) * 1.36)
.aurora .hp-plate
  background: var(--am-paper)
  border-color: var(--am-ink)
  color: var(--am-ink)
.foe .hp-plate
  background: var(--am-moon-night)
  border-color: var(--am-moon-silver)
  color: var(--am-on-night)

.hp-name
  display: block
  max-width: 100%
  overflow: hidden
  white-space: nowrap
  font-family: var(--am-display)
  font-weight: var(--am-w-shout-face)
  font-size: calc(var(--R) * var(--hp-font, 0.5))
  // Thai and Devanagari sit well outside a 1.0 line box.
  line-height: 1.3
  letter-spacing: 0
:lang(ar) .hp-name
  unicode-bidi: plaintext
</style>
