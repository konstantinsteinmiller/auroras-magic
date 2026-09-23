<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { prependBaseUrl } from '@/utils/function'
import useAssets from '@/use/useAssets'
import { stopLoading } from '@/use/useCrazyGames'
import { armFirstLoadInterstitial, notifySplashGone } from '@/use/useFirstLoadInterstitial'
import { isSplashScreenVisible } from '@/use/useMatch'

/**
 * The splash. It covers the boot (JS parse + the arena bake in `preloadAssets`)
 * and then gets out of the way — and it is where every portal is told the game
 * finished loading, because this is the one moment that is true:
 *
 *   CrazyGames `loadingStop` · Playgama `game_ready` · GamePix `gameLoaded` ·
 *   Poki `gameLoadingFinished` · Yandex `LoadingAPI.ready`
 *
 * Each signal fires once, behind an `import.meta.env` literal so the other
 * builds dead-code-eliminate the dynamic import and never ship that portal's
 * plugin chunk. `notifySplashGone` is the second of the two signals the
 * first-load interstitial waits for (the other is ad readiness) — the
 * GameMonetize / GamePix / GameDistribution requirement that "ads should be
 * shown the first time after the game loads".
 */
const { t } = useI18n()
const { loadingProgress, preloadAssets } = useAssets()
const progress = computed(() => loadingProgress.value)

void preloadAssets()

if (
  import.meta.env.VITE_APP_GAMEPIX === 'true'
  || import.meta.env.VITE_APP_GAME_MONETIZE === 'true'
  || import.meta.env.VITE_APP_GAME_DISTRIBUTION === 'true'
) {
  armFirstLoadInterstitial()
}

/**
 * The mascot (`src/game/brand.ts`, `PROMPTS-BRAND.md`), read as a plain file
 * rather than through `spriteFor`.
 *
 * Three reasons this is not the art layer. It is not a drop-in for something
 * the renderer keeps drawing, so there is no fallback to flip to; it must look
 * the same whatever `?art=` says, because the splash is the same picture on
 * every build; and this component paints BEFORE the art layer has probed
 * anything at all. It is 26 kB, and `index.html`'s static splash asks for the
 * same file, so on a cold load it is already in flight before this component
 * exists.
 *
 * THE MARK IS NOT HERE. It said the same thing as the title, which now has a
 * face of its own, and two pictures over one progress bar is a crowded splash.
 * It still ships as the app icon, the favicon and the cover art.
 *
 * `failed` is not defensive dressing: a missing file must leave the splash
 * looking deliberate rather than showing a broken-image glyph, and the splash
 * is the one screen that may never be the reason a game did not load.
 */
const mascotSrc = prependBaseUrl('/images/brand/mascot.webp')
const mascotFailed = ref(false)

const done = ref(false)
const gone = ref(false)
const showStuckHint = ref(false)
let stuckHintId: number | null = null
let settleFallbackId: number | null = null

onMounted(() => {
  isSplashScreenVisible.value = true
  // Hand over from the static HTML splash, which painted before any JS ran.
  const staticSplash = document.getElementById('static-splash')
  if (staticSplash) {
    staticSplash.classList.add('hidden')
    setTimeout(() => staticSplash.remove(), 500)
  }
  // Hard ceiling: the splash must never become the reason the game did not
  // load. Ordered AFTER the loader's own cap (4 s) so it only ever catches a
  // loader that hung, never cuts a slow device's bake short.
  settleFallbackId = window.setTimeout(() => { if (!done.value) done.value = true }, 8000)
  // Not on Playgama: that archive is also the YouTube Playables submission,
  // whose own spinner owns the wait.
  if (import.meta.env.VITE_APP_PLAYGAMA !== 'true') {
    stuckHintId = window.setTimeout(() => { if (!done.value) showStuckHint.value = true }, 5000)
  }
})
onUnmounted(() => {
  if (settleFallbackId !== null) clearTimeout(settleFallbackId)
  if (stuckHintId !== null) clearTimeout(stuckHintId)
})

watch(progress, (val) => {
  if (val < 100 || done.value) return
  setTimeout(() => { done.value = true }, 100)
}, { immediate: true })

/* ── portal "finished loading" signals, one each, DCE'd per build ── */
let cgLoadSignaled = false
const signalGameReadyToCG = (): void => {
  if (cgLoadSignaled) return
  cgLoadSignaled = true
  try { stopLoading() } catch (e) { console.warn('[FLogoProgress] CG ready-to-play failed', e) }
}
let playgamaLoadSignaled = false
const signalGameReadyToPlaygama = (): void => {
  if (playgamaLoadSignaled) return
  if (import.meta.env.VITE_APP_PLAYGAMA !== 'true') return
  playgamaLoadSignaled = true
  void import('@/utils/playgamaPlugin').then(({ playgamaGameLoadingStop }) => {
    try { playgamaGameLoadingStop() } catch (e) { console.warn('[FLogoProgress] Playgama game_ready failed', e) }
  })
}
let gamepixLoadSignaled = false
const signalGameReadyToGamepix = (): void => {
  if (gamepixLoadSignaled) return
  if (import.meta.env.VITE_APP_GAMEPIX !== 'true') return
  gamepixLoadSignaled = true
  void import('@/utils/gamepixPlugin').then(({ gamePixGameLoadingStop }) => {
    try { gamePixGameLoadingStop() } catch (e) { console.warn('[FLogoProgress] GamePix gameLoaded failed', e) }
  })
}
let pokiLoadSignaled = false
const signalGameReadyToPoki = (): void => {
  if (pokiLoadSignaled) return
  if (import.meta.env.VITE_APP_POKI !== 'true') return
  pokiLoadSignaled = true
  void import('@/utils/pokiPlugin').then(({ pokiGameLoadingFinished }) => {
    try { pokiGameLoadingFinished() } catch (e) { console.warn('[FLogoProgress] Poki gameLoadingFinished failed', e) }
  })
}
let yandexLoadSignaled = false
const signalGameReadyToYandex = (): void => {
  if (yandexLoadSignaled) return
  if (import.meta.env.VITE_APP_YANDEX !== 'true') return
  yandexLoadSignaled = true
  void import('@/utils/yandexPlugin').then(({ yandexLoadingReady }) => {
    try { yandexLoadingReady() } catch (e) { console.warn('[FLogoProgress] Yandex LoadingAPI.ready failed', e) }
  })
}

watch(done, (isDone) => {
  if (!isDone) return
  setTimeout(() => {
    gone.value = true
    isSplashScreenVisible.value = false
    signalGameReadyToCG()
    signalGameReadyToPlaygama()
    signalGameReadyToGamepix()
    signalGameReadyToYandex()
    signalGameReadyToPoki()
    notifySplashGone()
  }, 150)
})
</script>

<template lang="pug">
  Transition(name="splash-fade")
    div.splash(v-if="!gone" role="progressbar" :aria-valuenow="progress" aria-valuemin="0" aria-valuemax="100" :aria-label="t('loading')")
      div.splash-card
        h1.splash-title.ink-text {{ t('gameName') }}
        //- Decorative: the <h1> above already names the game, so a screen
        //- reader announcing it twice is noise.
        img.splash-mascot(v-if="!mascotFailed" :src="mascotSrc" alt="" decoding="async" @error="mascotFailed = true")
        div.splash-bar
          div.splash-fill(:style="{ width: progress + '%' }")
        p.splash-hint.ink-text(v-if="showStuckHint") {{ t('loading') }}
</template>

<style scoped lang="sass">
.splash
  position: fixed
  inset: 0
  z-index: 9000
  display: flex
  align-items: center
  justify-content: center
  // IDENTICAL to the inline splash in index.html, and it has to be: this
  // element fades in as that one fades out, and any difference is a visible
  // flash on every cold load. Literals, not tokens, for the same reason the
  // inline block uses literals.
  background: radial-gradient(circle at 50% 42%, #A98BCE 0%, #7B5EA8 70%)
  user-select: none
  -webkit-user-select: none

.splash-card
  display: flex
  flex-direction: column
  align-items: center
  // Every size below is capped against the VIEWPORT HEIGHT as well as its
  // width, because the tightest screen this has to survive is not a narrow
  // phone but a landscape one — a 740 x 360 portal frame, where a card sized
  // on width alone runs off the bottom and takes the progress bar with it.
  gap: min(1.1rem, 3vh)
  width: min(80vw, 420px)

.splash-title
  // The margin is the STROKE. `.ink-text` rings this in 0.28em of plum, which
  // overflows the line box by about a sixth of the font size at each end and
  // is invisible to the flex gap — on a 360 px-tall landscape phone the gap is
  // 3vh and the stroke ate all of it, so the title touched the bar below.
  margin: 0.16em 0
  // IDENTICAL to `index.html`'s `.splash-title`, and it has to be: the two are
  // on screen together through the crossfade, and the whole point of `AM Title`
  // is that the game's name never changes face mid-load. Spelled out rather
  // than taken from `--am-display`, because the static copy cannot read a
  // custom property that theme.sass has not defined yet.
  font-family: 'AM Title', 'AM Display', system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif
  // Overrides `.ink-text`'s `--am-w-shout` (900): `AM Title` ships one weight,
  // and asking for 900 makes the browser smear a synthetic bold out of it.
  font-weight: 600
  font-size: clamp(30px, 8vw, 56px)
  color: #FFF6E6

// The pair, on nothing — the painting is keyed, so the gradient runs between
// and behind them. First to go when the viewport is too short for everything:
// it is the picture that says the most and needs the most room, and the mark
// plus the title still carry the screen without it.
.splash-mascot
  display: block
  width: 100%
  height: auto
  max-height: 26vh
  object-fit: contain

@media (max-height: 420px)
  .splash-mascot
    display: none

.splash-bar
  width: 100%
  height: 14px
  border: 4px solid var(--am-ink)
  border-radius: 999px
  background: var(--am-night-deep)
  overflow: hidden
  box-sizing: content-box

.splash-fill
  height: 100%
  border-radius: 999px
  background: var(--am-rainbow)
  transition: width 0.25s ease-out

.splash-hint
  margin: 0
  font-size: 18px
  color: #FFF6E6

.splash-fade-leave-active
  transition: opacity 0.35s ease-out
.splash-fade-leave-to
  opacity: 0
</style>
