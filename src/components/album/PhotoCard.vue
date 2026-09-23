<script setup lang="ts">
/**
 * One dress-up photo card in the album (retention item 16), or the empty
 * place where one can go.
 *
 * Like a sticker cell, it adopts the canvas `photo.ts` baked rather than
 * keeping a second copy of it — a card's bake is the biggest single image
 * this feature makes, and the album holds six.
 *
 * An empty slot is drawn, never hidden: six places that are visibly waiting
 * say "you can take six" without a word, and they say it before the first
 * photo is taken rather than after the sixth.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { bakePhotoCard } from '@/game/album/photo'

const props = defineProps<{ recipe: string | null; index: number; w: number; h: number; fresh: boolean }>()
const { t } = useI18n()
const host = ref<HTMLElement | null>(null)

const label = computed(() => (props.recipe ? t('photo.card', { n: props.index + 1 }) : t('photo.empty')))

const backing = (px: number): number => {
  const dpr = typeof devicePixelRatio === 'number' && devicePixelRatio > 0 ? devicePixelRatio : 1
  return Math.max(1, Math.round(px * Math.min(2, dpr)))
}

const adopt = (): void => {
  const el = host.value
  if (!el) return
  const cv = props.recipe ? bakePhotoCard(props.recipe, backing(props.w), backing(props.h)) : null
  if (el.firstChild === cv) return
  el.replaceChildren()
  if (!cv) return
  cv.style.width = '100%'
  cv.style.height = '100%'
  cv.style.display = 'block'
  el.appendChild(cv)
}

onMounted(adopt)
watch(() => [props.recipe, props.w, props.h], adopt)
</script>

<template lang="pug">
  div.photo-card(
    ref="host"
    role="img"
    :aria-label="label"
    :class="{ filled: !!recipe, fresh }"
    :style="{ width: w + 'px', height: h + 'px' }"
  )
</template>

<style scoped lang="sass">
.photo-card
  box-sizing: border-box
  border-radius: 12px
  border: 3px dashed var(--am-ink-soft)
  background: var(--am-paper-sunken)
  overflow: hidden

.photo-card.filled
  border-style: solid
  border-color: var(--am-ink)
  background: var(--am-paper-raised)
  box-shadow: var(--am-shadow-chip)

// The card just taken. A one-shot reward beat, so it keeps its motion under
// reduced motion for the same reason the unbox and the bloom do — muting it
// would mute the reward itself (§3.11).
.photo-card.fresh
  box-shadow: 0 0 0 4px var(--am-gold), 0 0 16px 4px rgba(255, 215, 106, 0.7)
</style>
