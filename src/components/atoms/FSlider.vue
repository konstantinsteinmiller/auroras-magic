<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  modelValue: number
  min?: number
  max?: number
  step?: number
  label?: string
  colorFrom?: string
  colorTo?: string
  trackColor?: string
}

/**
 * The colours are TOKEN REFERENCES, not hexes: a `var(--am-*)` resolves just
 * as well inside the inline `linear-gradient()` below as it does in a
 * stylesheet, and it keeps the promise that no component decides a colour of
 * its own (ui-design-system.md §2). Only the defaults move — the call sites
 * pass none of these.
 *
 * The fill is gold and the thumb is lilac (see the Sass), deliberately: the
 * part you DRAG must never be the same colour as the part that shows how far
 * you have dragged it.
 */
const props = withDefaults(defineProps<Props>(), {
  modelValue: 50,
  min: 0,
  max: 100,
  step: 1,
  colorFrom: 'var(--am-gold)',
  colorTo: 'var(--am-gold-foot)',
  trackColor: 'var(--am-paper-sunken)'
})

const emit = defineEmits(['update:modelValue'])

const progress = computed(() => {
  return ((props.modelValue - props.min) / (props.max - props.min)) * 100
})

const updateValue = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', Number(target.value))
}
</script>

<template lang="pug">
  div.f-slider-container(class="w-full")
    //- Label (Optional). No colour utility here — the scoped rule owns it, or
    //- it would be a coin toss between two stylesheets of equal specificity.
    div.slider-label(v-if="label" class="mb-2") {{ label }}

    div.f-slider__row(class="relative flex items-center")
      //- Custom Track Background (The 3D "Well" cut into the page)
      //- `trackColor` is BOUND rather than baked into a utility class: the prop
      //- existed and was documented but the old template ignored it, so the
      //- well was one colour whatever a caller asked for.
      div.f-slider__track(
        class="absolute inset-0 my-auto rounded-full overflow-hidden"
        :style="{ backgroundColor: trackColor }"
      )
        //- Progress Fill
        div(
          class="h-full transition-all duration-75 relative"
          :style="{ \
            width: `${progress}%`, \
            backgroundImage: `linear-gradient(to bottom, ${colorFrom}, ${colorTo})` \
          }"
        )
          //- Inner Shine for the fill
          span.f-slider__shine(class="absolute inset-x-0 top-0 h-1/2")

      //- Native Input (Invisible but functional)
      input(
        type="range"
        :min="min"
        :max="max"
        :step="step"
        :value="modelValue"
        @input="updateValue"
        class="f-slider__input absolute inset-0 w-full opacity-0 cursor-pointer z-10 touch-manipulation"
      )

      //- Custom Thumb (Visual Only)
      div(
        class="thumb-visual pointer-events-none absolute flex items-center justify-center transition-transform"
        :style="{ left: `calc(${progress}% - var(--fsl-thumb) / 2)` }"
      )
        //- The "3D Shadow" of the thumb
        span.thumb-shadow(class="absolute inset-0 translate-y-[3px] rounded-xl")
        //- The Main Thumb Body
        span.thumb-body(class="relative block inset-0 w-full h-full rounded-xl overflow-hidden")
          //- Thumb Shine
          span.f-slider__shine(class="absolute inset-x-0 top-0 h-1/2")
          //- Little Detail (Vertical Line)
          span(class="absolute inset-0 flex items-center justify-center")
            span.thumb-grip(class="w-1.5 h-4 rounded-full")
</template>

<style scoped lang="sass">
// ─── The slider (ui-design-system.md §3.8) ─────────────────────────────────
//
// A well cut into the page, a gold fill, and a lilac thumb with a plum line
// round it. Was a near-black well with a `#50aaff` thumb on a `#102e7a`
// plate — a different app's control.
.slider-label
  color: var(--am-ink-2)
  font-weight: 700
  // Italic, uppercase and `tracking-wider` are gone (§4.4). They were a Latin
  // idiom that shears Han, kana and hangul, pulls Thai and Devanagari marks
  // off their letters and breaks Arabic's cursive joins.
  font-style: normal
  text-transform: none
  letter-spacing: 0
  font-size: clamp(0.75rem, 3.2vw, 1.1rem)
  text-shadow: none

.f-slider-container
  // Thumb size drives the row height, the track height AND the left offset, so
  // all three stay in sync at any viewport instead of the old hard-coded 40px.
  --fsl-thumb: clamp(2rem, 9vw, 2.5rem)
  padding-block: clamp(0.4rem, 2vw, 1rem)
  -webkit-tap-highlight-color: transparent

.f-slider__row
  height: var(--fsl-thumb)

.f-slider__track
  height: calc(var(--fsl-thumb) * 0.6)
  border: 3px solid var(--am-ink)
  // One inset shadow, so the well reads as pressed INTO the paper.
  box-shadow: inset 0 2px 0 rgba(58, 35, 64, 0.14)

.f-slider__input
  height: var(--fsl-thumb)

.thumb-visual
  width: var(--fsl-thumb)
  height: var(--fsl-thumb)

// The same white shine the button and the select wear, so the fill, the thumb
// and every other gradient face in the UI catch light the same way. It was two
// different `bg-white/20` and `/30` utilities.
.f-slider__shine
  background-color: rgba(255, 255, 255, 0.34)
  pointer-events: none

.thumb-shadow
  background-color: var(--am-lilac-plate)
  border: 3px solid var(--am-ink)

.thumb-body
  background-color: var(--am-lilac)
  border: 3px solid var(--am-ink)

// The grip line: plum at 45%, not white at 50% — on a lilac face a white line
// vanishes into the shine directly above it.
.thumb-grip
  background-color: rgba(58, 35, 64, 0.45)

/* Ensure the native range covers the whole area for better hitboxes */
input[type="range"]
  -webkit-appearance: none
  background: transparent

  &::-webkit-slider-thumb
    -webkit-appearance: none
    width: var(--fsl-thumb)
    height: var(--fsl-thumb)
    cursor: pointer

  &::-moz-range-thumb
    width: var(--fsl-thumb)
    height: var(--fsl-thumb)
    cursor: pointer
    border: none
    background: transparent
</style>
