<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import GameIcon from '@/components/icons/GameIcon.vue'

interface Option {
  value: string | number
  label: string
}

interface Props {
  modelValue: string | number
  options: Option[]
  placeholder?: string
  label?: string
  maxHeight?: string
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'SELECT...',
  maxHeight: '200px'
})

const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

const selectedLabel = computed(() => {
  const option = props.options.find(opt => opt.value === props.modelValue)
  return option ? option.label : props.placeholder
})

const toggle = () => (isOpen.value = !isOpen.value)

const selectOption = (value: string | number) => {
  emit('update:modelValue', value)
  isOpen.value = false
}

// Close when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>

<template lang="pug">
  div(class="relative w-full" ref="dropdownRef")
    //- Label (Optional). Colour lives in the scoped Sass, NOT in a utility
    //- class here: a Tailwind arbitrary-value class and a scoped rule carry
    //- the same specificity, so which one wins depends on the order the
    //- bundler happened to emit the two stylesheets in.
    div.f-select__label(v-if="label" class="mb-1 ml-1") {{ label }}

    //- The Trigger — the §3.1 button material: plate, gradient body, shine.
    button(
      type="button"
      @click="toggle"
      class="group relative w-full inline-block cursor-pointer select-none transition-all duration-75 active:scale-[0.98] hover:scale-[1.02] touch-manipulation focus:outline-none"
    )
      //- 3D depth plate
      span.f-select__plate(class="absolute inset-0 translate-y-[4px] rounded-2xl")

      //- Main Button Body
      span.f-select__body(class="relative flex items-center justify-between rounded-2xl")
        //- Inner Top Shine
        span.f-select__shine(class="absolute inset-x-0 top-0 h-1/2 rounded-t-xl")

        //- Selected Text
        span.f-select__value(class="relative block truncate mr-2") {{ selectedLabel }}

        //- Arrow Icon
        span.f-select__caret-wrap(
          class="relative transition-transform duration-200"
          :class="{ 'rotate-180': isOpen }"
        )
          GameIcon.f-select__caret(name="down")

    //- The Dropdown Menu
    transition(name="pop")
      div.f-select__menu(
        v-if="isOpen"
        class="absolute z-1 left-0 right-0 mt-3 overflow-hidden"
      )
        //- Scrollable Area
        div.f-select__list(
          class="custom-scrollbar overflow-y-auto p-2"
          :style="{ maxHeight: maxHeight }"
        )
          div.f-select__item(
            v-for="option in options"
            :key="option.value"
            @click="selectOption(option.value)"
            class="group/item relative mb-1 last:mb-0 cursor-pointer p-3 transition-all duration-75 active:scale-[0.97]"
            :class="{ 'is-selected': modelValue === option.value }"
          )
            span.f-select__option(class="relative block") {{ option.label }}
</template>

<style scoped lang="sass">
// ─── The select (ui-design-system.md §3.7) ─────────────────────────────────
//
// The trigger is the §3.1 button material — gold face, plum label, the same
// plate / body / shine. The list is paper, not navy, and the item you are on
// is lilac. Every colour that used to ride on an inline Tailwind
// arbitrary-value class — the navy menu, the near-black borders, the blue
// item, `text-white` — has been DELETED from the pug rather than overridden:
// a utility class and a scoped rule tie on specificity, and a tie is settled
// by whichever stylesheet the bundler emitted last.

// Fluid metrics replace the old fixed `text-sm md:text-lg` / `px-4 py-3` pairs
// so the control reads the same on a 320px phone and a 4K desktop, and the
// `min-height` floor guarantees a legal touch target in every layout.
.f-select__body
  min-height: 2.75rem
  min-width: clamp(6rem, 40vw, 9rem)
  padding: clamp(0.4rem, 1.8vw, 0.75rem) clamp(0.6rem, 3vw, 1.1rem)
  border: 3px solid var(--am-ink)
  background-image: linear-gradient(to bottom, var(--am-gold), var(--am-gold-foot))

.f-select__plate
  background-color: var(--am-gold-plate)

.f-select__shine
  background-color: rgba(255, 255, 255, 0.34)
  pointer-events: none

// The caret is the shared `down` chevron now — solid like the rest of the set,
// rather than the last stroked glyph left in the UI. Sized here because
// `GameIcon` deliberately fills whatever box the caller gives it.
// Nested to outrank `GameIcon`'s own `.game-icon` rule, which carries the same
// specificity a flat class selector would — on a tie the winner is whichever
// stylesheet the bundler emitted last.
.f-select__caret-wrap
  flex: 0 0 auto
  color: var(--am-ink)

  .f-select__caret
    width: 1.25rem
    height: 1.25rem
    // A plum glyph on a gold face needs no outline; the black one it wore is
    // the same five-way ring the captions wore, and it is gone (§4.3).
    filter: none

// The dropdown panel: paper with a plum line round it and one plum lift.
.f-select__menu
  border: 3px solid var(--am-ink)
  border-radius: 1rem
  background-color: var(--am-paper)
  box-shadow: 0 6px 0 rgba(58, 35, 64, 0.26)

.f-select__item
  border-radius: 0.75rem
  color: var(--am-ink)

  &:hover
    background-color: var(--am-paper-sunken)

  // Lilac, so "the one you are on" is never the same colour as the trigger
  // that opened the list. Plum on lilac is 7.45:1.
  &.is-selected
    background-color: var(--am-lilac)

// Plum ink, sentence case, no tracking, no shadow — the label, the option and
// the caption above the control are one voice (§4.3, §4.4).
.f-select__value, .f-select__option, .f-select__label
  color: var(--am-ink)
  font-weight: 700
  font-style: normal
  text-transform: none
  letter-spacing: 0
  text-shadow: none

.f-select__value
  font-size: clamp(0.7rem, 3vw, 1.05rem)

.f-select__option
  font-size: clamp(0.7rem, 3vw, 1rem)

// The caption ABOVE the control sits on the modal's paper, not on the gold —
// secondary ink there, 6.57:1.
.f-select__label
  color: var(--am-ink-2)
  font-size: clamp(0.75rem, 3.2vw, 1.1rem)

/* Custom Scrollbar for that game feel */
.custom-scrollbar
  // Firefox honours NONE of the -webkit- rules below, and the page is
  // `color-scheme: only light` now (§3.17), so without this it paints a light
  // UA scrollbar with no relation to the page. Thumb then track.
  scrollbar-color: var(--am-lilac-foot) var(--am-paper-sunken)

  &::-webkit-scrollbar
    width: 12px

  &::-webkit-scrollbar-track
    background: var(--am-paper-sunken)
    border-radius: 10px
    margin: 8px

  &::-webkit-scrollbar-thumb
    background: var(--am-lilac-foot)
    border: 3px solid var(--am-ink)
    border-radius: 10px

    &:hover
      background: var(--am-lilac)

/* Transition Animations */
.pop-enter-active, .pop-leave-active
  transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.1s

.pop-enter-from, .pop-leave-to
  opacity: 0
  transform: translateY(-10px) scale(0.95)
</style>
