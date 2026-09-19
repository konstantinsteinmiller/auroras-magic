<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import useUser, { isMobileLandscape, isShortViewport, windowWidth, windowHeight } from '@/use/useUser'
import { setI18nLocale } from '@/i18n'
import FModal from '@/components/molecules/FModal.vue'
import FButton from '@/components/atoms/FButton.vue'
import FSlider from '@/components/atoms/FSlider.vue'
import FSelect from '@/components/atoms/FSelect.vue'
import { LANGUAGES, LANGUAGE_AUTONYMS } from '@/utils/enums'
import { hapticsAvailable, hapticsEnabled, setHapticsEnabled } from '@/use/useHaptics'
import { traceAssist, setTraceAssist, reducedMotion, setReducedMotion } from '@/use/useAccessibility'
import { flowHud } from '@/use/useFlow'
import { duelBeat } from '@/use/useDuelBeat'
import { leaveDuel } from '@/game/flow/duelFlow'
import { leaderboardLive } from '@/use/useLeaderboard'

defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

// Global scope so the Options UI strings resolve from the shared locale
// bundles (src/i18n/locales/*) — same source as the rest of the game.
const { t, locale }: any = useI18n({ useScope: 'global' })
const appI18n: any = (window as any).__i18n

const {
  setSettingValue,
  userLanguage,
  userSoundVolume,
  userMusicVolume
} = useUser()

const currentTab = ref('general')

/**
 * Two columns whenever the screen is short and wide — a landscape phone, AND
 * a desktop embed like a Chromebook's 764 × 385 portal frame, which is not a
 * touch device and used to get the one-column list with SAVE & CLOSE lying
 * over the music slider (S7 viewport QA).
 */
const twoColumns = computed(() =>
  isMobileLandscape.value || (isShortViewport.value && windowWidth.value > windowHeight.value))

const applyLocale = async (value: string): Promise<void> => {
  if (appI18n) {
    await setI18nLocale(appI18n, value)
  } else {
    locale.value = value
  }
}
watch(userLanguage, applyLocale)

/**
 * The picker shows the language the game is SHOWING, not the stored choice.
 * A player who never picked one has `userLanguage` at its 'en' default while
 * the game speaks whatever the portal or the browser asked for, so the
 * stored value put "English" over an Arabic or German screen (S7 locale
 * QA). A pick is applied directly as well as stored: picking English there
 * leaves `userLanguage` unchanged, so its watcher alone would never fire.
 * This setter stays the only writer of the player-choice key.
 */
const shownLanguage = computed<string>(() => locale.value)
const pickLanguage = (value: string): void => {
  setSettingValue('language', value)
  void applyLocale(value)
}

const isMobile = computed(() => {
  return typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)
})

const tabs = computed(() => {
  const list = [
    { value: 'general', label: t('options.general') }
  ]
  const withAudio = !isMobile.value ? list.concat({ label: t('options.audio'), value: 'audio' }) : list
  // For the grown-up reading over a child's shoulder (§2.7).
  return withAudio.concat({ label: t('options.parents.title'), value: 'parents' })
})

// ─── For Parents (story-spec §2.7) ──────────────────────────────────────────
//
// Plain sentences for the adult reader. The non-personalised-ads note only on
// a child-directed build; the policy link only where a policy URL is set and
// the portal allows outbound links (never on Poki or Playgama, rule 19).
const childDirected = import.meta.env.VITE_CHILD_DIRECTED === 'true'
const privacyUrl: string = import.meta.env.VITE_PRIVACY_URL ?? ''
const linkAllowed = !!privacyUrl && import.meta.env.VITE_APP_POKI !== 'true' && import.meta.env.VITE_APP_PLAYGAMA !== 'true'

// Native-name dropdown — every option legible regardless of the active locale.
const languagesList = computed(() =>
  LANGUAGES.map(loc => ({
    value: loc,
    label: LANGUAGE_AUTONYMS[loc] ?? loc
  }))
)

// ─── Vibration ──────────────────────────────────────────────────────────────
//
// `hapticsAvailable` is resolved once at module load and is false on every
// desktop and on every iPhone — `navigator.vibrate` is absent on iOS Safari
// entirely, and desktop Chrome ships it as a silent no-op. The row is therefore
// hidden rather than disabled: a settings control that provably cannot do
// anything on this device teaches the player that the settings lie.
//
// An `FSelect` rather than a bespoke switch, because every other control on
// this tab is one and the modal has no toggle atom — a one-off switch here
// would be the only control in the game that looks like that.
const hapticsList = computed(() => [
  { value: 'on', label: t('options.on') },
  { value: 'off', label: t('options.off') }
])

// ─── Leave the duel (story-spec §3.3.7) ─────────────────────────────────────
//
// Only while a duel is actually being fought: there is nothing to leave on
// the map, and a duel that has already ended is leaving by itself. One
// confirm step, because a stray tap here costs the player the fight — the
// copy is gentle and never says "lose" (§2.2).
const inDuel = computed(() => flowHud.scene === 'duel' && duelBeat.phase === 'fight')
const confirmLeave = ref(false)
watch(() => inDuel.value, (on) => { if (!on) confirmLeave.value = false })
const doLeave = (): void => {
  confirmLeave.value = false
  emit('close')
  leaveDuel()
}
</script>

<template lang="pug">
  FModal(
    :model-value="isOpen"
    :is-closable="false"
    :title="t('options.title')"
    :tabs="tabs"
    v-model:activeTab="currentTab"
    @update:model-value="emit('close')"
  )
    div(v-if="currentTab === 'general'")
      //- Landscape mobile lays the controls out in 2 columns so all of them
      //- (language, the two sliders, vibration) fit the short viewport
      //- without the SAVE & CLOSE footer overlapping them.
      div(:class="twoColumns ? 'grid grid-cols-2 gap-x-4 gap-y-1 p-1 items-start' : 'flex flex-col gap-2 p-2'")
        div(class="z-[20] flex flex-col gap-2")
          FSelect(
            :label="t('options.language')"
            :options="languagesList"
            :model-value="shownLanguage"
            @update:model-value="pickLanguage($event)"
          )
        hr(v-if="!twoColumns" class="border-slate-600 my-1 md:my-2 pt-0")
        FSlider.px-4(class="!py-1 !pb-3 w-full max-w-[min(20rem,90%)]" :model-value="userSoundVolume" @update:modelValue="setSettingValue('sound', $event)" :label="t('options.soundEffects')" :min="0" :max="1" :step="0.01")
        FSlider.px-4(class="!py-1 !pb-2 w-full max-w-[min(20rem,90%)]" :model-value="userMusicVolume" @update:modelValue="setSettingValue('music', $event)" :label="t('options.music')" :min="0" :max="1" :step="0.01")
        //- The comfort settings (§3.11, §5.13). Each dropdown sits above the
        //- next one down, so an open list covers the rows below it.
        div(class="z-[12] flex flex-col gap-1")
          FSelect(
            :label="t('options.traceAssist')"
            :options="hapticsList"
            :model-value="traceAssist ? 'on' : 'off'"
            @update:model-value="setTraceAssist($event === 'on')"
          )
        div(class="z-[8] flex flex-col gap-1")
          FSelect(
            :label="t('options.reducedMotion')"
            :options="hapticsList"
            :model-value="reducedMotion ? 'on' : 'off'"
            @update:model-value="setReducedMotion($event === 'on')"
          )
        //- Phones only, and it lives on the GENERAL tab rather than the audio
        //- one for a structural reason: `tabs` above drops the audio tab
        //- entirely on touch devices, so a vibration setting parked there would
        //- be reachable by exactly nobody who has a motor.
        //- Lowest z of the dropdowns — it is the last one down the column,
        //- so its open list has to sit over nothing and under everything.
        div(v-if="hapticsAvailable" class="z-[1] flex flex-col gap-1")
          FSelect(
            :label="t('options.haptics')"
            :options="hapticsList"
            :model-value="hapticsEnabled ? 'on' : 'off'"
            @update:model-value="setHapticsEnabled($event === 'on')"
          )
        //- Leave the duel: one gentle confirm, then the map.
        div(v-if="inDuel" class="flex flex-col items-center gap-2 pt-2")
          FButton(v-if="!confirmLeave" class="px-6" @click="confirmLeave = true") {{ t('options.leaveDuel.label') }}
          div.leave-confirm(v-else role="alertdialog" :aria-label="t('options.leaveDuel.title')")
            p.leave-title {{ t('options.leaveDuel.title') }}
            p.leave-body {{ t('options.leaveDuel.body') }}
            div(class="flex gap-3 justify-center pt-1")
              FButton(class="px-5" @click="doLeave") {{ t('options.leaveDuel.confirm') }}
              FButton(class="px-5" @click="confirmLeave = false") {{ t('options.leaveDuel.cancel') }}

    div.parents(v-else-if="currentTab === 'parents'")
      p {{ t('options.parents.aboutBody') }}
      p {{ t('options.parents.adsBody') }}
      p(v-if="childDirected") {{ t('options.parents.adsNonPersonalisedNote') }}
      p {{ t('options.parents.purchasesBody') }}
      p {{ t('options.parents.privacyBody') }}
      p(v-if="leaderboardLive") {{ t('options.parents.leaderboardBody') }}
      a(v-if="linkAllowed" :href="privacyUrl" target="_blank" rel="noopener noreferrer") {{ t('options.parents.privacyLinkLabel') }}

    div(v-else-if="currentTab === 'audio'").flex.flex-col.justify-between.items-center
      FSlider.px-4(class="!py-1 !pb-3 w-full max-w-[min(20rem,90%)]" :model-value="userSoundVolume" @update:modelValue="setSettingValue('sound', $event)" :label="t('options.soundEffects')" :min="0" :max="1" :step="0.01")
      FSlider.px-4(class="!py-1 !pb-2 w-full max-w-[min(20rem,90%)]" :model-value="userMusicVolume" @update:modelValue="setSettingValue('music', $event)" :label="t('options.music')" :min="0" :max="1" :step="0.01")
      hr(class="border-slate-600 my-1 md:my-2 pt-0")

    template(#footer)
      FButton(class="px-6 sm:px-8" @click="emit('close')") {{ t('options.close') }}
</template>

<style lang="sass" scoped>
span
  text-shadow: 2px 2px 0 #000

.parents
  display: flex
  flex-direction: column
  gap: 10px
  padding: 6px 10px 10px
  max-width: 34rem
  color: #fff
  font-size: 0.95rem
  line-height: 1.45
  text-align: left
  p
    margin: 0
  a
    color: #ffd76a
    text-decoration: underline

.leave-confirm
  text-align: center
  max-width: 22rem
  padding: 10px 12px
  border-radius: 14px
  background: rgba(24, 17, 48, 0.6)

.leave-title
  font-weight: 800
  font-size: 1.1rem
  color: #ffd76a

.leave-body
  font-size: 0.95rem
  color: #fff
  opacity: 0.9
</style>
