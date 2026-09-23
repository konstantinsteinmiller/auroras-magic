<script setup lang="ts">
/**
 * One cell of the sticker album (retention item 3): a creature, or the
 * silhouette of one still to find.
 *
 * The cell does not own a canvas — it ADOPTS the one `stickers.ts` baked. A
 * bake is already a canvas of exactly the right size, and blitting it into a
 * second canvas per cell would double the album's pixels for nothing: sixty
 * cells is sixty spare buffers. Only one album is ever mounted, so exactly
 * one place wants each bake, and re-mounting simply adopts it again.
 *
 * It is not a button. A sticker is a thing to look at, not a thing to press,
 * which is also what keeps a 44 px cell honest: the touch-target floor
 * (§3.13) is a rule about controls, and this is a picture with a name read
 * aloud.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { bakeSticker, stickerRev, type Sticker } from '@/game/album/stickers'

const props = defineProps<{ sticker: Sticker; met: boolean; px: number }>()
const { t } = useI18n()
const host = ref<HTMLElement | null>(null)

// `a11y.keepsakeToFind` is the same sentence the wardrobe reads over an
// unearned keepsake ("Still to find"), and one key that two screens share
// cannot drift between them in twenty-one locales.
const label = computed(() =>
  props.met
    ? (props.sticker.kind === 'rescue' ? t('album.friend') : t('album.found'))
    : t('a11y.keepsakeToFind'))

/** The device pixels a cell is baked at. Capped at 2: the third device pixel
 *  of a 44 px sticker is not visible and it is a third of the album's memory. */
const backing = (): number => {
  const dpr = typeof devicePixelRatio === 'number' && devicePixelRatio > 0 ? devicePixelRatio : 1
  return Math.max(1, Math.round(props.px * Math.min(2, dpr)))
}

const adopt = (): void => {
  const el = host.value
  if (!el) return
  void stickerRev.value
  const cv = bakeSticker(props.sticker, backing(), props.met)
  if (el.firstChild === cv) return
  el.replaceChildren()
  if (!cv) return
  cv.style.width = '100%'
  cv.style.height = '100%'
  cv.style.display = 'block'
  el.appendChild(cv)
}

onMounted(adopt)
watch(() => [props.sticker.key, props.met, props.px, stickerRev.value], adopt)
</script>

<template lang="pug">
  div.sticker-cell(
    ref="host"
    role="img"
    :aria-label="label"
    :class="{ met, friend: sticker.kind === 'rescue' }"
    :style="{ width: px + 'px', height: px + 'px' }"
  )
</template>

<style scoped lang="sass">
// A well cut into the album's page, exactly as a keepsake still to find is a
// well cut into the shelf — one language for "there is something here that is
// not yours yet", across both of the tent's pages.
.sticker-cell
  box-sizing: border-box
  border-radius: 14px
  border: 3px dashed var(--am-ink-soft)
  background: var(--am-paper-sunken)
  overflow: hidden
  display: flex
  align-items: center
  justify-content: center

.sticker-cell.met
  border-style: solid
  border-color: var(--am-ink)
  background: var(--am-paper-raised)

// The chapter's rescued friend wears gold, met or not: the frame says "this
// one is special" before a child has found it, which is the invitation.
.sticker-cell.friend
  border-color: var(--am-gold-plate)
  border-width: 4px

.sticker-cell.friend.met
  background: var(--am-gold)
  box-shadow: 0 0 12px 2px rgba(255, 215, 106, 0.6)
</style>
