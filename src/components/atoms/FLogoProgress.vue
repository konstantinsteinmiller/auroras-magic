<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
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
  background: radial-gradient(circle at 50% 42%, #231a3f 0%, #07060f 70%)
  user-select: none
  -webkit-user-select: none

.splash-card
  display: flex
  flex-direction: column
  align-items: center
  gap: 1.1rem
  width: min(80vw, 420px)

.splash-title
  margin: 0
  font-size: clamp(30px, 8vw, 56px)
  color: #ffd76a

.splash-bar
  width: 100%
  height: 14px
  border: 4px solid #0a0713
  border-radius: 999px
  background: #181130
  overflow: hidden
  box-sizing: content-box

.splash-fill
  height: 100%
  border-radius: 999px
  background: linear-gradient(90deg, #ff5a2b, #ffd76a, #8ff0ff, #59b6ff, #c08cff)
  transition: width 0.25s ease-out

.splash-hint
  margin: 0
  font-size: 18px
  color: #cfc4ff

.splash-fade-leave-active
  transition: opacity 0.35s ease-out
.splash-fade-leave-to
  opacity: 0
</style>
