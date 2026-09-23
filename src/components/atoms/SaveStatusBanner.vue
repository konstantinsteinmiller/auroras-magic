<script setup lang="ts">
// Two-purpose corner banner:
//   1. Offline mode — when the strategy is in failed-retrying / failed-final,
//      tell the player their progress is saved locally but cloud is paused,
//      and offer a "Retry" button.
//   2. Conflict-merge bonus — when a hydrate detected a higher cloud save
//      and we restored it, show the bonus coins so the loss-of-local feels
//      like a gain instead of a punishment. Auto-dismisses after a few sec.
//
// Tap-to-dismiss for both states. Mounted from App.vue.
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  acknowledgeBonus,
  bonusCoinsAwarded,
  hasBonusToShow,
  isOfflineMode,
  retryInFlight,
  retrySync
} from '@/use/useSaveStatus'
import { isCrazyWeb } from '@/use/useUser'

const { t } = useI18n()

const dismissed = ref(false)

const offlineDismissed = ref(false)
watch(isOfflineMode, (on) => {
  if (!on) offlineDismissed.value = false
})

// Auto-dismiss the bonus after 6 seconds so it doesn't linger forever.
let bonusTimer: ReturnType<typeof setTimeout> | null = null
watch(bonusCoinsAwarded, (n) => {
  if (n > 0) {
    if (bonusTimer) clearTimeout(bonusTimer)
    bonusTimer = setTimeout(() => acknowledgeBonus(), 6_000)
  }
})
onUnmounted(() => {
  if (bonusTimer) clearTimeout(bonusTimer)
})

// The offline banner says "Playing offline. Your progress is saved here." —
// only TRUE for builds with a local fallback (LocalStorage / Glitch / itch / GD
// / GamePix, all `persistToRaw: true`). CrazyGames is CLOUD-ONLY
// (`persistToRaw: false`), so there is no local save and the message would be a
// lie; the strategy also goes `failed-retrying` whenever `sdk.data` is
// unreachable — which is ALWAYS the case off-portal (localhost / preview),
// flashing a scary banner during dev. The retry ladder still heals silently
// underneath, and CG doesn't mandate an offline notice, so suppress the banner
// on CG entirely. The "cloud save restored" bonus banner is unaffected.
const showOffline = computed(() => isOfflineMode.value && !offlineDismissed.value && !isCrazyWeb)
const showBonus = computed(() => hasBonusToShow.value && !dismissed.value)

const onRetry = async (e: Event) => {
  e.stopPropagation()
  await retrySync()
}

const onDismissOffline = () => {
  offlineDismissed.value = true
}
const onDismissBonus = () => {
  acknowledgeBonus()
  dismissed.value = true
}

// Reset per-show dismiss flag so a future bonus can show again.
watch(hasBonusToShow, (on) => {
  if (on) dismissed.value = false
})
</script>

<template lang="pug">
  div.fixed.left-2.right-2.z-40.pointer-events-none(class="bottom-2 sm:left-auto sm:right-4 sm:max-w-sm")
    //- Bonus banner — "your cloud save came back, and it was worth coins".
    //-
    //- Both banners are the same paper toast (§3.2): cream face, plum line,
    //- one plum lift, plum ink. What tells them apart is a 6px bar down the
    //- leading edge — mint for the good news, gold for the notice. The colour
    //- is NOT in the text, so nothing here is a colour-only signal and the two
    //- states read the same to a colour-blind player: the copy carries it.
    //-
    //- No Tailwind colour utilities on either card. A utility class and a
    //- scoped rule tie on specificity and the tie is settled by whichever
    //- stylesheet the bundler emitted last, which is not a thing to leave to
    //- chance on a banner that only appears when something has gone wrong.
    div.save-toast.is-good.pointer-events-auto.text-sm.flex.items-center.gap-3.cursor-pointer(
      v-if="showBonus"
      class="mb-2"
      @click="onDismissBonus"
    )
      span.text-xl 🎉
      div.flex-1
        div.save-toast__title {{ t('saveStatus.restoredTitle') }}
        div.save-toast__body.text-xs {{ t('saveStatus.restoredBody', { n: bonusCoinsAwarded }) }}
      span.save-toast__body.text-xs {{ t('saveStatus.tap') }}

    //- Offline banner — informational, and it owns its own two buttons.
    div.save-toast.is-notice.pointer-events-auto.text-sm.flex.items-center.gap-3(
      v-else-if="showOffline"
    )
      span.text-xl ☁️
      div.flex-1
        div.save-toast__title {{ t('saveStatus.pausedTitle') }}
        div.save-toast__body.text-xs {{ t('saveStatus.pausedBody') }}
      button.save-toast__retry.text-xs(
        class="px-2 py-1 disabled:opacity-50"
        :disabled="retryInFlight"
        @click="onRetry"
      ) {{ retryInFlight ? '…' : t('saveStatus.retry') }}
      button.save-toast__x.text-lg.px-1(
        @click="onDismissOffline"
        :aria-label="t('saveStatus.dismiss')"
      ) ×
</template>

<style scoped lang="sass">
// ─── The paper toast (ui-design-system.md §3.2, §7) ────────────────────────
//
// Was an `emerald-700` / `amber-700` card with white text — a different app's
// toast, and the only two saturated slabs left in the chrome.
.save-toast
  position: relative
  overflow: hidden
  border: 3px solid var(--am-ink)
  border-radius: clamp(0.6rem, 2.4vw, 0.9rem)
  background-color: var(--am-paper)
  box-shadow: 0 4px 0 rgba(58, 35, 64, 0.28)
  color: var(--am-ink)
  // Padding lives here rather than on a `px-3 py-2` pair in the template: the
  // leading edge has to clear the 6px state bar, and mixing a physical
  // Tailwind `padding-left` with a logical `padding-inline-start` is a cascade
  // coin toss nobody should have to reason about. Logical, so the bar is on
  // the right in Arabic with no second rule.
  padding-block: 0.5rem
  padding-inline: calc(0.75rem + 6px) 0.75rem

  &::before
    content: ''
    position: absolute
    inset-block: 0
    inset-inline-start: 0
    width: 6px
    pointer-events: none

.save-toast.is-good::before
  background-color: var(--am-mint-foot)

.save-toast.is-notice::before
  background-color: var(--am-gold-foot)

.save-toast__title
  font-weight: 800
  color: var(--am-ink)

// 6.57:1 on paper — the fine print recedes without becoming a grey smudge.
.save-toast__body
  color: var(--am-ink-2)

// The two controls are chips, not links: a 12px word is not a touch target.
.save-toast__retry
  border: 2px solid var(--am-ink)
  border-radius: 0.5rem
  background-color: var(--am-gold)
  color: var(--am-on-accent)
  font-weight: 800

.save-toast__x
  color: var(--am-ink-2)
  font-weight: 800
</style>
