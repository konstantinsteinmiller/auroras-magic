<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
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
import { playIntro } from '@/game/flow/nodes'
import { dipTo, DIP_PUSH } from '@/game/flow/transition'
import { leaderboardLive } from '@/use/useLeaderboard'
import { resetProgress } from '@/use/useResetProgress'

const props = defineProps<{
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
 * touch device and used to get the one-column list with CLOSE lying
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
const leaveWell = ref<HTMLElement | null>(null)
/** Same treatment as the reset confirm below, and for the same reason: in the
 *  two-column landscape layout this well opened with its ANSWERS under the
 *  CLOSE footer, so the question was on screen and neither reply was. */
const openLeaveConfirm = async (): Promise<void> => {
  confirmLeave.value = true
  await nextTick()
  leaveWell.value?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
}
watch(() => inDuel.value, (on) => { if (!on) confirmLeave.value = false })
const doLeave = (): void => {
  confirmLeave.value = false
  emit('close')
  leaveDuel()
}

// ─── Watch the intro again (story-spec §8.26) ───────────────────────────────
//
// From the map and from a dialogue only: a duel, a gift or a wipe in progress
// is not something to walk away from for a picture book. It comes back to
// the scene it was opened from.
const canWatchIntro = computed(() => flowHud.scene === 'map' || flowHud.scene === 'dialogue')
const watchIntro = (): void => {
  emit('close')
  dipTo(() => playIntro(true), DIP_PUSH)
}

// ─── Start the whole story again (`useResetProgress`) ───────────────────────
//
// The most destructive thing in the game, so it wears the same one-step
// confirm the leave-duel row wears, with the same colour convention: gold is
// the safe answer (keep my progress) and coral is the one that goes ahead, so
// the button a child taps by habit is the harmless one.
//
// `resetting` is a latch, not a spinner. `resetProgress` awaits a cloud flush
// and then reloads, which on a slow portal is a second or two of a screen that
// looks tappable — and a second tap would wipe and flush twice.
const confirmReset = ref(false)
const resetting = ref(false)
/**
 * Is a question on screen?
 *
 * A confirm is modal BY INTENT — it is the only thing on this tab that must be
 * answered before anything else happens — but it was drawn as one more row in
 * a list of sliders. That did two bad things at once: it offered a child a
 * volume slider to fiddle with instead of answering, and it made the panel
 * taller than a landscape phone, so the ANSWER buttons needed a scroll to
 * reach — which then pushed a dropdown up under the sticky tab bar (the
 * `COVERED` finding `locale-fit` kept reporting).
 *
 * With the settings out of the way the panel is short, the answer is the only
 * thing in it, and there is nothing left to scroll.
 */
const confirming = computed(() => confirmLeave.value || confirmReset.value)
/**
 * The well, so it can be scrolled to.
 *
 * On a landscape phone the general tab is two columns and already taller than
 * the viewport, and the well replaces a one-line button with four lines and
 * two more buttons — which on a 915 x 412 screen opens the question with its
 * ANSWERS below the fold, behind the CLOSE footer. The locale-fit audit
 * does not see it, and correctly: the panel scrolls, so nothing is clipped and
 * nothing overflows. It is simply a dialog whose buttons the player has to go
 * looking for.
 */
const resetWell = ref<HTMLElement | null>(null)
const openResetConfirm = async (): Promise<void> => {
  confirmReset.value = true
  await nextTick()
  // `nearest` rather than `center`: on a tall portrait screen the well is
  // already fully visible and this must then do nothing at all.
  resetWell.value?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
}
const doReset = async (): Promise<void> => {
  if (resetting.value) return
  resetting.value = true
  try {
    await resetProgress()
  } catch (e) {
    // The reload is the last line of `resetProgress`, so arriving here means
    // it never got that far. Let the player try again rather than leaving the
    // dialog latched shut for the rest of the session.
    console.warn('[options] reset failed', e)
    resetting.value = false
    confirmReset.value = false
  }
}
// A modal that is closed and reopened must not come back mid-confirm.
watch(() => props.isOpen, (open) => { if (!open) confirmReset.value = false })
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
      //- without the CLOSE footer overlapping them.
      div(:class="twoColumns ? 'grid grid-cols-2 gap-x-4 gap-y-1 p-1 items-start' : 'flex flex-col gap-2 p-2'")
        //- Everything a confirm displaces — see `confirming`. A `template`
        //- rather than a wrapper div, so in the landscape layout these rows
        //- stay DIRECT children of the grid and keep their own columns.
        template(v-if="!confirming")
          div(class="z-[20] flex flex-col gap-2")
            FSelect(
              :label="t('options.language')"
              :options="languagesList"
              :model-value="shownLanguage"
              @update:model-value="pickLanguage($event)"
            )
          hr.am-rule(v-if="!twoColumns" class="my-1 md:my-2")
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
          div(v-if="canWatchIntro" class="flex flex-col items-center gap-2 pt-2")
            FButton(class="px-6" @click="watchIntro") {{ t('options.watchIntro') }}
        //- Leave the duel: one gentle confirm, then the map.
        //- Gone while the RESET question is up: two danger buttons under one
        //- question is two ways to answer it wrongly.
        div(v-if="inDuel && !confirmReset" class="flex flex-col items-center gap-2 pt-2" :class="twoColumns ? 'col-span-2' : ''")
          //- Coral, not gold: §2.3 names "leave the duel" as the danger
          //- accent, and the gold is reserved for the thing that moves the
          //- story on. In the confirm row below, gold is STAY and coral is GO,
          //- so the safe choice is the one that looks like every other primary
          //- button in the game.
          FButton(v-if="!confirmLeave" type="danger" class="leave-duel px-6" @click="openLeaveConfirm") {{ t('options.leaveDuel.label') }}
          div.confirm-well.leave-confirm(v-else ref="leaveWell" role="alertdialog" :aria-label="t('options.leaveDuel.title')")
            p.confirm-title {{ t('options.leaveDuel.title') }}
            p.confirm-body {{ t('options.leaveDuel.body') }}
            div(class="flex gap-3 justify-center pt-1")
              FButton(type="danger" class="px-5" @click="doLeave") {{ t('options.leaveDuel.confirm') }}
              FButton(class="px-5" @click="confirmLeave = false") {{ t('options.leaveDuel.cancel') }}

        //- Start the whole story again. Last on the tab, under a rule, because
        //- it is the one control here that cannot be undone — nothing a thumb
        //- is already travelling toward should sit next to it.
        //-
        //- BOTH COLUMNS in the landscape layout. Confined to one, the confirm
        //- well is taller than the panel, so opening it scrolled the rows above
        //- it up under the sticky tab bar to get its buttons on screen. Across
        //- the full width it is short enough to need no scroll at all.
        //- The rule divides the SETTINGS from the reset row. With the settings
        //- gone it divides nothing, so it goes with them — otherwise a confirm
        //- opens under a stray rainbow line with no rows above it.
        hr.am-rule(v-if="!confirming" class="my-1 md:my-2" :class="twoColumns ? 'col-span-2' : ''")
        div(v-if="!confirmLeave" class="flex flex-col items-center gap-2 pb-1" :class="twoColumns ? 'col-span-2' : ''")
          FButton(v-if="!confirmReset" type="danger" class="reset-progress px-6" @click="openResetConfirm") {{ t('options.resetProgress.label') }}
          div.confirm-well.reset-confirm(v-else ref="resetWell" role="alertdialog" :aria-label="t('options.resetProgress.title')")
            p.confirm-title {{ t('options.resetProgress.title') }}
            p.confirm-body {{ t('options.resetProgress.body') }}
            p.confirm-note {{ t('options.resetProgress.keptNote') }}
            div(class="flex gap-3 justify-center pt-1")
              //- Coral goes ahead, gold keeps the save: the safe answer is the
              //- one that looks like every other primary button in the game.
              FButton(type="danger" class="px-5" @click="doReset") {{ t('options.resetProgress.confirm') }}
              FButton(class="px-5" @click="confirmReset = false") {{ t('options.resetProgress.cancel') }}

    div.parents(v-else-if="currentTab === 'parents'")
      p {{ t('options.parents.aboutBody') }}
      p {{ t('options.parents.adsBody') }}
      p.fine(v-if="childDirected") {{ t('options.parents.adsNonPersonalisedNote') }}
      p {{ t('options.parents.purchasesBody') }}
      p {{ t('options.parents.privacyBody') }}
      p(v-if="leaderboardLive") {{ t('options.parents.leaderboardBody') }}
      a(v-if="linkAllowed" :href="privacyUrl" target="_blank" rel="noopener noreferrer") {{ t('options.parents.privacyLinkLabel') }}

    div(v-else-if="currentTab === 'audio'").flex.flex-col.justify-between.items-center
      FSlider.px-4(class="!py-1 !pb-3 w-full max-w-[min(20rem,90%)]" :model-value="userSoundVolume" @update:modelValue="setSettingValue('sound', $event)" :label="t('options.soundEffects')" :min="0" :max="1" :step="0.01")
      FSlider.px-4(class="!py-1 !pb-2 w-full max-w-[min(20rem,90%)]" :model-value="userMusicVolume" @update:modelValue="setSettingValue('music', $event)" :label="t('options.music')" :min="0" :max="1" :step="0.01")
      hr.am-rule(class="my-1 md:my-2")

    template(#footer)
      FButton(class="px-6 sm:px-8" @click="emit('close')") {{ t('close') }}
</template>

<style lang="sass" scoped>
// ─── The options screen, in the book's dress ───────────────────────────────
//
// The screen the owner called the worst offender: every label sat on a hard
// black shadow, the Parents tab was white on nothing, the leave-confirm was a
// floating near-black slab and the dividers were `border-slate-600`. The
// layout is untouched — `twoColumns` and the per-dropdown z stack exist
// because an open list must cover the rows below it.
//
// The `span { text-shadow: 2px 2px 0 #000 }` that used to head this block is
// gone with the rest of the five-way black ring (§4.3). It had in fact stopped
// matching anything: scoped CSS only reaches this component's OWN elements,
// and every caption on this screen is rendered inside FSelect, FSlider or
// FButton, which carry their own scope ids.

// The rainbow rule (§5.5) in place of `hr.border-slate-600`. An `hr` brings a
// UA border of its own, so it has to be cleared before the gradient shows.
.am-rule
  height: 3px
  border: 0
  border-radius: 999px
  background: var(--am-rainbow)
  opacity: 0.9

// ─── For parents (story-spec §2.7) ─────────────────────────────────────────
// Plain sentences for the adult reading over a child's shoulder, set on paper
// at 13:1 rather than white on a navy panel.
.parents
  display: flex
  flex-direction: column
  gap: 10px
  padding: 6px 10px 10px
  max-width: 34rem
  color: var(--am-ink)
  font-weight: 600
  font-size: 0.95rem
  line-height: 1.45
  text-align: left

  p
    margin: 0

  // The non-personalised-ads note is the one genuine piece of fine print on
  // the tab — a legal aside, not part of the explanation. 6.57:1 on paper.
  .fine
    color: var(--am-ink-2)
    font-size: 0.85rem

  // Underlined as well as coloured: a link that is only a colour is not a link
  // to a colour-blind reader. `--am-lilac-plate` on paper is 5.11:1.
  a
    color: var(--am-lilac-plate)
    font-weight: 700
    text-decoration: underline

// ─── The confirm well ──────────────────────────────────────────────────────
// `.leave-confirm` / `.reset-confirm` and `.leave-duel` / `.reset-progress`
// carry no style: they are the names the locale-fit audit reaches these two
// rows by (`tools/locale-fit/audit.mjs`). Structural selectors used to do it —
// "the last button on the general tab" — which quietly aimed at a different
// control the moment a second danger button was added below the first.
//
// Shared by "leave the duel" and "start the story again" — the two questions
// on this screen a player can answer wrongly and regret. A well cut into the
// page (§3.2 `.am-plate--sunken`), so the confirm reads as part of the sheet
// it interrupts rather than as a second floating panel.
.confirm-well
  text-align: center
  max-width: 22rem
  padding: 10px 12px
  border: 3px solid var(--am-ink)
  border-radius: 14px
  background: var(--am-paper-sunken)
  box-shadow: inset 0 3px 0 rgba(58, 35, 64, 0.14)

.confirm-title
  font-weight: 800
  font-size: 1.1rem
  color: var(--am-ink)

// Secondary ink rather than white-at-90%: an opacity on text is a contrast
// cut nobody measured. 5.22:1 on the sunken paper.
.confirm-body
  font-size: 0.95rem
  color: var(--am-ink-2)

// The reassurance under the warning — what the reset does NOT take. Quieter
// than the body, but still ink rather than a faded grey: it is the line that
// stops a player deciding against the button for the wrong reason.
.confirm-note
  margin-top: 4px
  font-size: 0.85rem
  color: var(--am-ink-2)
</style>
