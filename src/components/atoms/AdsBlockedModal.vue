<script setup lang="ts">
// ─── AdsBlockedModal ────────────────────────────────────────────────────
//
// Shown when the player tapped a "watch ad" button and:
//   1. The active ad provider returned `false` (no reward granted), AND
//   2. That provider has detected an ad-blocker is interfering with its
//      ad-fetch chain.
//
// Same component services every ad backend the game ships with
// (CrazyGames, GameDistribution, LevelPlay-on-native, Noop) — each
// provider populates its own `isAdsBlocked` ref via SDK-specific
// detection (CG's `sdk.ad.hasAdblock()`, GD's SDK_ERROR `Blocked:`
// pattern, etc.) and `useAds.showRewardedAd()` is the single seam that
// flips the modal-visible flag. Mounted unconditionally in App.vue;
// visibility is purely reactive on the flag.
//
// Wording is kid-safe because Auroras Magic targets ages 3–12. No mention
// of "ad blocker brand X", no urging to disable site-wide — just a
// gentle "we couldn't show your ad, please allow ads here to earn the
// reward". Adult-audience games can swap copy via a simple text edit.

import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { dismissAdsBlockedModal, isAdsBlockedModalShown } from '@/use/useAds'
import { CHROME_ART } from '@/game/artIds'
import { useArtImage } from '@/use/useArtImage'

const { t } = useI18n()

// The shield on the card: the painted one when the art layer is on and it has
// decoded (paint-outstanding.md P14), the emoji otherwise — exactly as before.
// Not scheduled ahead, and not asked for until the card first opens: this
// component is mounted from boot, and the card is rare. The emoji stands in
// for the moment the painting takes.
const shieldSrc = useArtImage(CHROME_ART.shield.kind, () => (isAdsBlockedModalShown.value ? CHROME_ART.shield.id : ''))

// Hostname surfaced to the player so they know which site to allowlist.
// Falls back gracefully when running in a non-browser context (SSR,
// Node tests, Workers) where `window.location` is not a string.
const host = computed(() => {
  try {
    return window.location.host || 'this game'
  } catch {
    return 'this game'
  }
})
</script>

<template lang="pug">
  Teleport(to="body")
    Transition(
      name="ads-blocked-modal"
      enter-active-class="transition-opacity duration-200 ease-out"
      leave-active-class="transition-opacity duration-150 ease-in"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    )
      //- z-[150]: must sit ABOVE every win/lose reward overlay (FReward
      //- z-[100]) and in-game menu (UpgradesModal z-[101], FSpeechBubble
      //- z-[100]) so the ad-blocker explainer is never buried under the
      //- screen that triggered the rewarded tap. Stays below the boot
      //- loader (FLogoProgress z-[200]), which never coexists with it.
      div.fixed.inset-0.flex.items-center.justify-center.p-4(
        class="z-[150]"
        v-if="isAdsBlockedModalShown"
        @click="dismissAdsBlockedModal"
      )
        //- Backdrop. The one dim value the whole game uses — plum, never
        //- black (§3.15). Every colour on this screen lives in the scoped Sass
        //- rather than in a utility class: the two tie on specificity, and the
        //- tie goes to whichever stylesheet the bundler emitted last.
        div.ads-blocked__scrim.absolute.inset-0(class="backdrop-blur-sm")

        //- Card — a sheet of paper with a plum line round it (§3.2).
        div.ads-blocked__card.relative.w-full.max-w-md.text-center(
          class="p-6"
          @click.stop
        )
          div.mb-2.text-5xl
            img.ads-blocked__shield(v-if="shieldSrc" :src="shieldSrc" alt="" draggable="false")
            template(v-else) 🛡️
          h2.ads-blocked__title.text-2xl.mb-2 {{ t('adsBlocked.title') }}
          p.ads-blocked__body.text-base.mb-4 {{ t('adsBlocked.body') }}
          p.ads-blocked__fine.text-sm.mb-5
            | {{ t('adsBlocked.allowPrefix') }}
            |
            span.ads-blocked__host {{ host }}
            |
            | {{ t('adsBlocked.allowSuffix') }}

          button.ads-blocked__cta.w-full.text-lg(
            class="py-3"
            @click="dismissAdsBlockedModal"
          ) {{ t('adsBlocked.gotIt') }}
</template>

<style scoped lang="sass">
// ─── The ad-blocker explainer, in the book's dress ─────────────────────────
//
// Was a `slate-700 → slate-900` card with a `bg-amber-500` button and white
// text: a different app's dialog, and the only one a player meets on their
// way to a reward. Materials only — the z stack, the transition and the
// dismiss handlers are untouched.
.ads-blocked__scrim
  background-color: var(--am-scrim)

// The painted shield takes the emoji's own box: one em of `text-5xl`.
.ads-blocked__shield
  display: block
  width: 1em
  height: 1em
  margin: 0 auto
  object-fit: contain

.ads-blocked__card
  border: 4px solid var(--am-ink)
  border-radius: clamp(0.9rem, 4.4vw, 1.5rem)
  background-color: var(--am-paper)
  box-shadow: 0 6px 0 rgba(58, 35, 64, 0.28)
  color: var(--am-ink)

.ads-blocked__title
  color: var(--am-ink)
  font-weight: 800

.ads-blocked__body
  color: var(--am-ink)
  font-weight: 600

// The line that names the site is the fine print; the HOST inside it is not.
.ads-blocked__fine
  color: var(--am-ink-2)

.ads-blocked__host
  color: var(--am-ink)
  font-weight: 800

// The §3.1 button material, flattened to one plate-less chip: this card has
// exactly one thing to press and the depth plate would be the only 3D object
// on an otherwise flat sheet.
.ads-blocked__cta
  border: 3px solid var(--am-ink)
  border-radius: clamp(0.5rem, 2vw, 0.85rem)
  background-image: linear-gradient(to bottom, var(--am-gold), var(--am-gold-foot))
  box-shadow: 0 3px 0 var(--am-gold-plate)
  color: var(--am-on-accent)
  font-weight: 800
  text-shadow: var(--am-lift-on-accent)
  transition: transform var(--am-dur-press) ease-out

  &:hover
    filter: saturate(1.06) brightness(1.04)

  &:active
    transform: translateY(3px)
    box-shadow: none

  &:focus-visible
    outline: 3px solid var(--am-ink)
    outline-offset: 3px
</style>
