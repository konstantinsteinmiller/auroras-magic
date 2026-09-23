<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import GameIcon from '@/components/icons/GameIcon.vue'
import ArtIcon from '@/components/icons/ArtIcon.vue'
import { vFit } from '@/use/vFit'
import { resolveIconLabel } from '@/components/icons/iconLabels'
import type { GameIconName } from '@/components/icons/iconNames'

/**
 * The primary CTA button.
 *
 * Sizing is FLUID, not scaled. The previous implementation applied Tailwind
 * `scale-60 / 75 / 80 / 90 / 110 / 120 / 125` transforms to a fixed-size body,
 * which had three problems: the transform did not affect layout (so buttons
 * overlapped their neighbours at large sizes and left dead gaps at small ones),
 * the border/shadow scaled with it (going blurry or hairline), and hit targets
 * drifted away from the painted pixels.
 *
 * Every dimension is now a `clamp(min, preferred-in-vw/vh, max)`, so the button
 * grows smoothly from a 320 px phone to a 4K desktop while never collapsing
 * below a comfortable 44 px touch target.
 */

interface Props {
  label?: string
  type?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning'
  /**
   * RETIRED, and kept only so a call site that still names it compiles.
   *
   * `brawl` was a `skewX(-10deg)` + italic + negative-tracking treatment:
   * the single most esports-reading rule in the codebase, and the opposite
   * of the storybook this game is (ui-design-system.md §3.1, §4.4). It
   * draws nothing now. Nothing in `src/` passes it.
   */
  variant?: 'default' | 'brawl'
  isDisabled?: boolean
  colorFrom?: string
  colorTo?: string
  shadowColor?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  attention?: boolean
  /** Stretch to the container's width. Off by default so a button in a row
   *  sizes to its content instead of fighting its siblings. */
  block?: boolean
  /** A glyph from the shared set, drawn beside the label. */
  icon?: GameIconName
  /** Which side the glyph sits on. Right by default: the label is what the eye
   *  reads first, the glyph confirms the action. */
  iconPosition?: 'left' | 'right'
  /**
   * Drop the label and draw only the glyph, in a square button.
   *
   * This is what lets a row of actions cost one line instead of two. An
   * icon-only button has no accessible name of its own, so the caller MUST
   * pass an `aria-label`.
   */
  iconOnly?: boolean
  /** Required whenever the button has no visible text. */
  ariaLabel?: string
  /** A painting under `images/ui/` that may stand in for the glyph of an
   *  icon-only button once the art pipeline has produced it — see `ArtIcon`. */
  art?: string
  /**
   * Grow the whole control by this factor - the "this is the one that ends the
   * screen" mark for a row of otherwise identical glyph buttons.
   *
   * Multiplies INSIDE the clamp terms rather than applying a `transform:
   * scale()`, so the layout box grows with the paint and the row gutters
   * correctly around it. A transform would leave the neighbours' gaps wrong and
   * the hit target drifting off the painted pixels - which is the bug this
   * component was rewritten to kill in the first place.
   */
  emphasis?: number
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  type: 'primary',
  variant: 'default',
  size: 'md',
  attention: false,
  block: false,
  iconPosition: 'right',
  iconOnly: false,
  emphasis: 1
})

defineEmits(['click'])

const { t, te } = useI18n()

/**
 * An icon-only button has no text to be announced, so it needs a name from
 * somewhere. The caller's `ariaLabel` is the right answer and normally present;
 * the shared map in `iconLabels.ts` is the floor under the call site that
 * forgets. A button that still has its caption needs neither — its own text is
 * its name, and an `aria-label` there would silently override it.
 */
const resolvedAriaLabel = computed<string | undefined>(() => {
  if (props.ariaLabel) return props.ariaLabel
  return props.iconOnly ? resolveIconLabel(undefined, props.icon, t, te) : undefined
})

/**
 * The five accent triples from the design system (§2.3), named rather than
 * spelled: `face` (gradient top), `foot` (gradient bottom) and `plate` (the
 * offset depth block under the body). A component never writes a hex — it
 * reads a token — so the whole set moves from `theme.sass` and can never
 * drift from one screen to the next.
 *
 * Every one of them carries `--am-on-accent` (plum, NOT white) as its label
 * colour and an `--am-ink` border; that is what makes all five one material.
 * Measured against the label in §2.6: gold 10.16:1, lilac 7.45:1, coral
 * 8.18:1, mint 9.86:1, reward 9.15:1 — and each one's FOOT, which is the
 * darker half of the gradient the label actually sits on, still clears AA.
 */
const theme = computed(() => {
  switch (props.type) {
    case 'secondary':
      return {
        from: props.colorFrom ?? 'var(--am-lilac)',
        to: props.colorTo ?? 'var(--am-lilac-foot)',
        shadow: props.shadowColor ?? 'var(--am-lilac-plate)'
      }
    // "Leave", "dismiss", "close" — a blush coral, never a hazard red. This is
    // a game for 3–12s and a red button is the most adult-app mark on a
    // children's screen (§2.3).
    case 'danger':
      return {
        from: props.colorFrom ?? 'var(--am-coral)',
        to: props.colorTo ?? 'var(--am-coral-foot)',
        shadow: props.shadowColor ?? 'var(--am-coral-plate)'
      }
    case 'success':
      return {
        from: props.colorFrom ?? 'var(--am-mint)',
        to: props.colorTo ?? 'var(--am-mint-foot)',
        shadow: props.shadowColor ?? 'var(--am-mint-plate)'
      }
    // The rewarded-video gold, named rather than respelled. It is the one
    // button in the game that earns money, so it is the one whose colour is
    // least allowed to drift between screens. No call site passes `warning`
    // today; the token triple is reserved so it cannot drift before one does.
    case 'warning':
      return {
        from: props.colorFrom ?? 'var(--am-reward)',
        to: props.colorTo ?? 'var(--am-reward-foot)',
        shadow: props.shadowColor ?? 'var(--am-reward-plate)'
      }
    default:
      return {
        from: props.colorFrom ?? 'var(--am-gold)',
        to: props.colorTo ?? 'var(--am-gold-foot)',
        shadow: props.shadowColor ?? 'var(--am-gold-plate)'
      }
  }
})

/**
 * Per-size fluid metrics. The `vw` term is what makes the button responsive;
 * the min/max clamp keeps it usable at both extremes. `--fbtn-min-h` is never
 * below 2.25rem (36px) for `sm` and 2.75rem (44px) elsewhere — the WCAG touch
 * target floor — so no parent layout can crush the control out of existence.
 */
const sizeVars = computed<Record<string, string>>(() => {
  switch (props.size) {
    case 'sm':
      return {
        '--fbtn-font': 'clamp(0.7rem, 2.6vw, 0.95rem)',
        '--fbtn-px': 'clamp(0.6rem, 2.6vw, 1rem)',
        '--fbtn-py': 'clamp(0.3rem, 1.2vw, 0.5rem)',
        '--fbtn-min-w': 'clamp(3.5rem, 18vw, 6rem)',
        '--fbtn-min-h': '2.25rem',
        '--fbtn-radius': 'clamp(0.5rem, 2vw, 0.85rem)'
      }
    case 'lg':
      return {
        '--fbtn-font': 'clamp(1rem, 4.2vw, 1.6rem)',
        '--fbtn-px': 'clamp(1.1rem, 5vw, 2.2rem)',
        '--fbtn-py': 'clamp(0.55rem, 2.2vw, 0.95rem)',
        '--fbtn-min-w': 'clamp(6.5rem, 34vw, 12rem)',
        '--fbtn-min-h': '3rem',
        '--fbtn-radius': 'clamp(0.75rem, 3vw, 1.35rem)'
      }
    case 'xl':
      return {
        '--fbtn-font': 'clamp(1.15rem, 5vw, 2rem)',
        '--fbtn-px': 'clamp(1.4rem, 6vw, 2.8rem)',
        '--fbtn-py': 'clamp(0.65rem, 2.6vw, 1.15rem)',
        '--fbtn-min-w': 'clamp(8rem, 42vw, 15rem)',
        '--fbtn-min-h': '3.25rem',
        '--fbtn-radius': 'clamp(0.85rem, 3.4vw, 1.6rem)'
      }
    default:
      return {
        '--fbtn-font': 'clamp(0.85rem, 3.4vw, 1.25rem)',
        '--fbtn-px': 'clamp(0.85rem, 4vw, 1.6rem)',
        '--fbtn-py': 'clamp(0.45rem, 1.8vw, 0.75rem)',
        '--fbtn-min-w': 'clamp(5rem, 26vw, 9rem)',
        '--fbtn-min-h': '2.75rem',
        '--fbtn-radius': 'clamp(0.65rem, 2.6vw, 1.1rem)'
      }
  }
})

/**
 * Emphasis multiplies every fluid metric, so a 1.2x button is a genuinely
 * larger BOX: `calc(clamp(...) * 1.2)` clamps first and scales after, which
 * keeps the floors meaningful. The border width and the depth plate offset are
 * deliberately left alone - they read as the material the buttons are cut
 * from, and scaling them makes the emphasised one look like a different set.
 */
const scaled = (v: string, e: number): string => (e === 1 ? v : `calc(${v} * ${e})`)

const styleVars = computed(() => {
  const e = Number.isFinite(props.emphasis) && props.emphasis > 0 ? props.emphasis : 1
  const vars = Object.fromEntries(
    Object.entries(sizeVars.value).map(([key, value]) => [key, scaled(value, e)])
  )
  return {
    ...vars,
    '--fbtn-from': theme.value.from,
    '--fbtn-to': theme.value.to,
    '--fbtn-shadow': theme.value.shadow
  }
})
</script>

<template lang="pug">
  button.f-button(
    type="button"
    :style="styleVars"
    :class="[\
      block ? 'is-block' : '',\
      attention ? 'attention-bounce' : '',\
      isDisabled ? 'is-disabled' : '',\
      iconOnly ? 'is-icon-only' : ''\
    ]"
    :aria-label="resolvedAriaLabel"
    :disabled="isDisabled"
    @click="!isDisabled && $emit('click')"
  )
    //- 3D depth plate behind the body.
    span.f-button__shadow(aria-hidden="true")
    span.f-button__body
      //- Classic top shine.
      span.f-button__shine(aria-hidden="true")
      //- Glyph-only. A separate `v-if` rather than a `v-else` on the label, so
      //- an icon-only button that was passed no icon still renders its slot
      //- instead of an empty box.
      ArtIcon.f-button__glyph.is-solo(v-if="iconOnly && icon && art" kind="ui" :id="art" :fallback="icon")
      GameIcon.f-button__glyph.is-solo(v-else-if="iconOnly && icon" :name="icon")
      template(v-else)
        GameIcon.f-button__glyph(v-if="icon && iconPosition === 'left'" :name="icon")
        //- The caption is nowrap inside a body that hides its overflow, so a
        //- label the button cannot hold used to be CUT — no ellipsis, just a
        //- missing tail ("SPEICHERN & SCHLIESS"). `v-fit` shrinks it to fit
        //- instead; the width bound below is what lets it see the overflow.
        span.f-button__text(v-fit)
          slot {{ label }}
        GameIcon.f-button__glyph(v-if="icon && iconPosition === 'right'" :name="icon")
</template>

<style scoped lang="sass">
// ─── The one button material (ui-design-system.md §3.1) ────────────────────
//
// A solid offset PLATE behind a gradient BODY with an ink border and a 45%
// white shine. The geometry was already right and is kept verbatim; only the
// materials changed — the navy / near-black / slot-machine-yellow portal
// template dress became cream paper, plum ink and a painted pastel face.
// (The old hexes are deliberately not quoted here: a CI grep for the
// forbidden list, §9.9, should not have to know the difference between a
// colour and a note about one.)
.f-button
  position: relative
  display: inline-flex
  align-items: center
  justify-content: center
  // Floors that guarantee the control can never be collapsed to nothing by a
  // flex/grid parent — the "invisible button" failure mode.
  min-width: var(--fbtn-min-w)
  min-height: var(--fbtn-min-h)
  padding: 0
  border: 0
  background: none
  cursor: pointer
  touch-action: manipulation
  -webkit-tap-highlight-color: transparent
  // Reads the token rather than a literal, so the in-game Reduced Motion
  // switch and the device preference both settle it with no code here.
  transition: transform var(--am-dur-press) ease-out, filter var(--am-dur-press) ease-out

  &.is-block
    display: flex
    width: 100%

  &:hover:not(.is-disabled)
    // Was brightness(1.08). A pastel face blows out where a saturated one
    // only brightened, so the hover warms it instead of bleaching it.
    filter: saturate(1.06) brightness(1.04)

  // Presses INTO its own plate: the body drops by exactly the plate's offset
  // and the plate slides up to meet it, so the depth closes rather than the
  // whole control sliding down the page. Border width and metrics never change
  // between states — the button must not move under the finger.
  &:active:not(.is-disabled)
    transform: translateY(3px) scale(0.985)

    .f-button__shadow
      transform: translateY(0)

  // Disabled is shown by LOSING THE MATERIAL — no plate, no gradient, no
  // shine — never by `opacity: .5` + `grayscale(1)`, which dropped the old
  // white caption to ~2.5:1 and failed AA outright.
  &.is-disabled
    cursor: not-allowed
    opacity: 1
    filter: none

    .f-button__shadow
      display: none

    .f-button__shine
      display: none

    .f-button__body
      background-image: none
      background-color: var(--am-disabled)
      border-color: var(--am-ink-soft)

    .f-button__text
      color: var(--am-ink-3)
      text-shadow: none

  &:focus-visible
    outline: 3px solid var(--am-ink)
    outline-offset: 3px

  // Glyph-only: a square button, not a pill with a lonely icon adrift in it.
  // The width floor becomes the height floor, so the control is as tall as it
  // is wide at every size and emphasis - and dropping the caption cannot
  // collapse it, because the caption was never what held it open.
  &.is-icon-only
    min-width: var(--fbtn-min-h)

    .f-button__body
      min-width: var(--fbtn-min-h)
      padding-inline: var(--fbtn-py)

.f-button__shadow
  position: absolute
  inset: 0
  transform: translateY(3px)
  border-radius: var(--fbtn-radius)
  background-color: var(--fbtn-shadow)
  transition: transform var(--am-dur-press) ease-out

.f-button__body
  position: relative
  display: flex
  align-items: center
  justify-content: center
  gap: 0.4em
  // The body owns the type scale so the glyph can size itself in `em` off it -
  // one metric for label and icon, which is what keeps them optically matched
  // at every size and emphasis.
  font-size: var(--fbtn-font)
  width: 100%
  min-height: var(--fbtn-min-h)
  padding: var(--fbtn-py) var(--fbtn-px)
  // 3px, not 2: plum is lighter than the near-black it replaced, and the
  // outline is the whole storybook read.
  border: 3px solid var(--am-ink)
  border-radius: var(--fbtn-radius)
  background-image: linear-gradient(to bottom, var(--fbtn-from), var(--fbtn-to))
  overflow: hidden

.f-button__shine
  position: absolute
  inset-inline: 0
  top: 0
  height: 45%
  background-color: rgba(255, 255, 255, 0.34)
  border-radius: var(--fbtn-radius) var(--fbtn-radius) 0 0
  pointer-events: none

// Nested rather than written flat, and that is load-bearing: `GameIcon`'s own
// scoped rule is `.game-icon[data-v-…]` — one class plus one attribute, exactly
// the same specificity a flat `.f-button__glyph[data-v-…]` would have. On a tie the
// winner is whichever stylesheet the bundler happened to emit last. Nesting
// adds the ancestor class and settles it.
.f-button__body .f-button__glyph
  position: relative
  flex: 0 0 auto
  // Sized in `em` off the body's font size, so one metric drives the label and
  // the glyph together at every size and emphasis factor.
  width: 1.25em
  height: 1.25em
  // Plum glyph on a pastel face. It was a hard black offset, matching the
  // caption's black ring; both are gone (§4.3) and the replacement is the same
  // ONE soft white lift the caption wears, so glyph and word still read as
  // the same material.
  color: var(--am-on-accent)
  filter: drop-shadow(0 1px 0 rgba(255, 255, 255, 0.45))

  // Alone in the button it IS the control, not an ornament beside a word.
  &.is-solo
    width: 1.6em
    height: 1.6em

.f-button__text
  position: relative
  display: block
  min-width: 0
  max-width: 100%
  overflow: hidden
  // Room INSIDE the clip for the caption's paint. It was sized for the hard
  // black shadow, which is gone and the lift that replaced it is 1px — but the
  // padding STAYS: `overflow: hidden` clips glyphs as readily as paint, and
  // without it Devanagari and Thai descenders are shaved off. Border-box, so
  // the button does not grow. (ui-design-system.md §10.8.)
  padding: 3px
  color: var(--am-on-accent)
  // 800, not 900: the system stack faux-bolds 900 badly on Android, and at
  // 10:1 on a pastel face the extra weight buys nothing.
  font-weight: 800
  // The uppercase / italic / tracked-out habit is dead (§4.4). The locale
  // strings are already authored in sentence case and were being shouted by
  // CSS; dropping it needs no key change and makes every Latin label ~8%
  // narrower, which relieves overflow rather than causing it.
  text-transform: none
  font-style: normal
  letter-spacing: 0
  font-size: var(--fbtn-font)
  // The box has to hold the whole face, not just the em square: at 1.15 the
  // descenders were being shaved by the `overflow: hidden` above, which is the
  // price of being able to measure the overflow. Well inside the body's
  // `min-height`, so no button changes size over it.
  line-height: 1.3
  white-space: nowrap
  // ONE soft white lift — the paper catching light — in place of the five-way
  // black ring. It never darkens the glyph and it costs one shadow.
  text-shadow: var(--am-lift-on-accent)

.attention-bounce
  animation: fbtn-bounce 0.6s infinite alternate

// An ambient loop stops when less motion is asked for; a one-shot arrival
// (the press) keeps its transform. Both routes, because the player can ask in
// Options as well as in the OS — `useAccessibility` puts `.am-reduced` on
// <html> for the first and the media query covers the second.
@media (prefers-reduced-motion: reduce)
  .attention-bounce
    animation: none

html.am-reduced .attention-bounce
  animation: none

@keyframes fbtn-bounce
  from
    translate: 0 0
  to
    translate: 0 -5px
</style>
