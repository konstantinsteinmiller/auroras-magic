<script setup lang="ts">
/**
 * GameScene — the duel. Boots straight into the arena: no menu, no loading
 * screen of its own (the splash is `FLogoProgress`), and every asset is
 * procedural, so the first frame is the game.
 *
 * This file is the jam build's `main.js` on the Vue architecture: it owns the
 * canvas, the input, the frame loop and the flow between duels — and it is
 * where the duel meets the platform layer:
 *
 *   • the loop freezes on the universal pause gate (ads, hidden tab, portal
 *     pause, modals) — the sim, the particles and the callouts all hold;
 *   • the gameplay bracket (`useGameplayLifecycle`) opens only once a real
 *     player has touched the game, and closes on the result panel;
 *   • an interstitial plays BEFORE the result panel, never over it;
 *   • the rewarded offer exists only while an ad can actually be served.
 *
 * The rules themselves live in `game/duel/`; the chrome in `components/duel/`.
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { PH_DUEL, PH_WIN, BOX, SPELLBOOK, rankPrice, winCoins } from '@/game/duel/config'
import { S, load, save, pop } from '@/game/duel/state'
import { applyLayout, toStage, LAYOUT } from '@/game/duel/layout'
import { render } from '@/game/duel/render'
import { updateFx } from '@/game/duel/fx'
import {
  resetDuel, updateSim, strokeStart, strokeMove, strokeEnd, cast, buyRank, onDuelEvent
} from '@/game/duel/sim'
import { initAudio, tickAudio, resetAudio, sfx } from '@/game/duel/audio'
import { hud, syncHud, agePops, resetHudMirrors, publishLayout } from '@/use/useDuelHud'
import DuelHud from '@/components/duel/DuelHud.vue'
import DuelResult from '@/components/duel/DuelResult.vue'
import SpellBook from '@/components/duel/SpellBook.vue'
import OptionsModal from '@/components/organisms/OptionsModal.vue'
import { useMusic } from '@/use/useSound'
import { isGamePaused, isAdShowing, isVisibilityHidden, isPlatformPaused } from '@/use/useGamePause'
import { isAnyModalOpen, acquireModalOpen } from '@/use/useModalState'
import { isInterstitialReady, showMidgameAd } from '@/use/useAds'
import { canShowInterstitial, markInterstitialShown, adInFlight, canOfferReward, claimReward, isRewardGated } from '@/use/useAdGate'
import { signalGameplayLoaded, triggerHappytime } from '@/use/useCrazyGames'
import { gamePixHappyMoment } from '@/utils/gamepixPlugin'
import { syncGameplayLifecycle, isGameplayLive } from '@/use/useGameplayLifecycle'
import { flushSaveNow } from '@/use/useSaveStatus'
import { isMuted, toggleMute } from '@/use/useCrazyMuteSync'
import { isMobileAudioMuted, toggleMobileAudioMute } from '@/use/useMobileAudioMute'
import { haptic } from '@/use/useHaptics'
import { track, exposeAnalytics } from '@/use/useAnalytics'
import { frameStart, frameEnd } from '@/use/usePerfProbe'
import { isDebug } from '@/use/useMatch'
import { mobileCheck } from '@/utils/function'

const canvas = ref<HTMLCanvasElement | null>(null)
let g: CanvasRenderingContext2D | null = null
let rafId = 0

const { startBattleMusic, stopBattleMusic } = useMusic()

/* ─────────────────────────────── viewport ─────────────────────────────── */

const resize = (): void => {
  const cv = canvas.value
  if (!cv) return
  const w = window.innerWidth
  const h = window.innerHeight
  // Cap DPR: a 3x phone would rasterise 3x the pixels for no visible gain.
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  cv.width = Math.round(w * dpr)
  cv.height = Math.round(h * dpr)
  cv.style.width = `${w}px`
  cv.style.height = `${h}px`
  // The arena's bakes rebuild themselves when the device scale actually moves
  // (see `arena.ts`), so a resize that keeps it — most of them — keeps the
  // splash-time bake instead of throwing it away.
  publishLayout(applyLayout(w, h, dpr))
}
const onOrientation = (): void => { window.setTimeout(resize, 250) }

/* ──────────────────────────────── arming ──────────────────────────────── */
//
// The duel boots under a live arena, but nothing is FOUGHT until a person has
// touched the game: the foe holds her first rune, and the portal is not told
// gameplay started. Without it a returning player's opponent would open fire
// under the splash, and `gameplayStart()` would fire with nobody at the
// controls (Poki rejects exactly that). Trusted events only.
const armed = ref(false)
let firstRuneTracked = false

const wake = (e?: Event): void => {
  initAudio()
  if (!armed.value && (!e || e.isTrusted)) {
    armed.value = true
    // CrazyGames pre-release sends ONE gameplayStart for the whole session
    // (the full release lets the bracket below drive start/stop). "The player
    // is in" is this touch, not the mount — nobody is playing before it.
    signalGameplayLoaded()
    track('duel_start', { foe: S.foe, wins: S.wins, losses: S.losses })
  }
}

/* ───────────────────────────────── input ──────────────────────────────── */

const zoneCallout = (): [number, number] => {
  if (!LAYOUT.portrait) return [640, BOX.y - 46]
  // Upper-middle of the pad — where the stroke just was, and clear of the
  // onboarding caption that sits along the pad's top edge.
  const z = LAYOUT.zone
  return [z.x + z.w / 2, z.y + z.h * 0.42]
}
const endStroke = (): void => {
  const [x, y] = zoneCallout()
  strokeEnd(x, y)
}

const optionsOpen = ref(false)
const blocked = (): boolean => isGamePaused.value || !!S.book || optionsOpen.value

const onPointerDown = (e: PointerEvent): void => {
  e.preventDefault()
  wake(e)
  // Draw ANYWHERE that is not a button — the buttons sit above the canvas and
  // never deliver their presses here.
  if (S.phase !== PH_DUEL || blocked()) return
  // Capture, so a stroke that wanders off the canvas keeps delivering moves
  // and still ends with a real pointerup.
  try { canvas.value?.setPointerCapture(e.pointerId) } catch { /* not capturable */ }
  const [x, y] = toStage(e.clientX, e.clientY)
  strokeStart(x, y)
}

const onPointerMove = (e: PointerEvent): void => {
  if (!S.draw) return
  // Safety net: still "drawing" but nothing is pressed — a pointerup went
  // missing. End the stroke rather than leave ink hanging forever.
  if (e.buttons === 0) {
    endStroke()
    return
  }
  e.preventDefault()
  // Coalesced events carry every position the pointer reported, so the ink
  // follows the real path instead of cutting corners between frames.
  const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : []
  if (evs.length) {
    for (const ev of evs) {
      const [x, y] = toStage(ev.clientX, ev.clientY)
      strokeMove(x, y)
    }
  } else {
    const [x, y] = toStage(e.clientX, e.clientY)
    strokeMove(x, y)
  }
}
const onPointerUp = (): void => endStroke()

/* ─────────────────────────────── controls ─────────────────────────────── */

const onMobile = mobileCheck()
const keyboard = typeof window !== 'undefined' && !!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches
const muted = computed(() => (onMobile ? isMobileAudioMuted.value : isMuted.value))

const onCast = (): void => {
  wake()
  if (blocked()) return
  sfx('ui')
  cast()
}

const onMute = (): void => {
  wake()
  sfx('ui')
  if (onMobile) toggleMobileAudioMute()
  else toggleMute()
}

const onOptions = (): void => {
  wake()
  sfx('ui')
  endStroke()
  optionsOpen.value = true
}

let releaseBook: (() => void) | null = null
const setBook = (open: boolean): void => {
  if (!SPELLBOOK) return
  sfx('ui')
  S.book = open ? 1 : 0
  if (open && !releaseBook) {
    endStroke()
    releaseBook = acquireModalOpen()
  } else if (!open && releaseBook) {
    releaseBook()
    releaseBook = null
  }
}

const onKeyDown = (e: KeyboardEvent): void => {
  if (optionsOpen.value) return
  wake(e)
  const k = e.key
  if (k === ' ' || k === 'Enter' || k === 'e' || k === 'E') {
    e.preventDefault()
    if (S.phase !== PH_DUEL) restart()
    else onCast()
  } else if (SPELLBOOK && k === 'Escape') setBook(false)
  else if (k === 'm' || k === 'M') onMute()
  else if (SPELLBOOK && (k === '?' || k === 'h' || k === 'H')) setBook(!S.book)
}

/* ───────────────────────────── duel → result ──────────────────────────── */

/** Beat between the killing blow and an interstitial: the win flourish runs
 *  ~1.4 s, and an ad must not cut the jingle off mid-note. */
const AD_BEAT_MS = 1400
const wait = (ms: number): Promise<void> => new Promise((r) => window.setTimeout(r, ms))

/**
 * Interstitial pacing. Every placement goes through the shared clock
 * (`canShowInterstitial`, ≥ 121 s apart). Only after a WIN: an ad over a loss
 * is an ad the player blames for the loss.
 */
const maybeShowInterstitial = async (won: boolean): Promise<void> => {
  if (!won || !isInterstitialReady.value || !canShowInterstitial()) return
  markInterstitialShown()
  await wait(AD_BEAT_MS)
  try {
    await showMidgameAd()
  } finally {
    // The ad path hard-stops the music (and clears its intent); the duel's
    // score runs on under the result panel, so bring it back — through the
    // normal start, so a portal mute that arrived meanwhile still wins.
    startBattleMusic()
  }
}

let duelStartedAt = performance.now()

/** The duel ended. The panel goes up only after any ad has finished. */
const presentResult = async (won: boolean): Promise<void> => {
  track('duel_end', { foe: S.foe, won, durationMs: Math.round(performance.now() - duelStartedAt) })
  rewardClaimed.value = false
  if (won) {
    triggerHappytime()
    gamePixHappyMoment()
    haptic('reward')
  }
  await maybeShowInterstitial(won)
  // A duel restarted by a debug hook while the ad ran has nothing to show.
  if (S.phase === PH_DUEL) return
  S.resultUp = true
  S.panelT = 0
  void flushSaveNow()
}

function restart (): void {
  if (!S.resultUp || S.panelT <= 0.4) return
  sfx('ui')
  resetDuel()
  resetAudio()
  resetHudMirrors()
  rewardClaimed.value = false
  duelStartedAt = performance.now()
  track('duel_start', { foe: S.foe, wins: S.wins, losses: S.losses })
}

const onBuy = (i: number): void => {
  if (!S.resultUp) return
  sfx('ui')
  const rank = S.up[i] ?? 0
  const cost = rankPrice(rank)
  if (buyRank(i, rankPrice)) {
    haptic('tick')
    track('rank_buy', { rune: i, rank: rank + 1, cost })
    void flushSaveNow()
  }
}

/* ─────────────────────────────── rewarded ─────────────────────────────── */

const rewardClaimed = ref(false)
/**
 * The ×2 / consolation offer is live only on a build whose ads are real
 * (`isRewardGated` — on an ad-free build `claimReward` would pay out for
 * nothing), while the provider reports inventory and the rate limiter allows
 * it, and once per panel.
 */
const rewardLive = computed(() =>
  isRewardGated && canOfferReward.value && !rewardClaimed.value && hud.resultUp && !adInFlight.value)
const rewardCoins = computed(() => (hud.phase === PH_WIN ? hud.lastPay : winCoins(hud.foe)))

const onReward = async (): Promise<void> => {
  if (!rewardLive.value) return
  const kind = hud.phase === PH_WIN ? 'double' : 'bonus'
  const coins = rewardCoins.value
  try {
    await claimReward(() => {
      rewardClaimed.value = true
      S.coins += coins
      save()
      pop('coins', '#ffd76a', 640, 300, { n: coins })
      sfx('snap', 3)
      haptic('reward')
      track('reward_claim', { kind, coins })
      void flushSaveNow()
    })
  } finally {
    startBattleMusic()
  }
}

/* ────────────────────────── portal gameplay bracket ───────────────────── */
//
// The scene wires the reactive inputs; `isGameplayLive` holds the rule, next
// to the platform contracts it answers to. CrazyGames gets gameplayStart/Stop,
// Poki the same pair through its 50 ms bad-event guard, Playgama its own.
const isLiveGameplay = computed(() => isGameplayLive({
  phase: hud.phase === PH_DUEL ? 'duel' : 'result',
  showResult: hud.resultUp,
  anyModalOpen: isAnyModalOpen.value || hud.book,
  adShowing: isAdShowing.value,
  visibilityHidden: isVisibilityHidden.value,
  platformPaused: isPlatformPaused.value,
  awaitingInput: !armed.value
}))
watch(isLiveGameplay, syncGameplayLifecycle, { immediate: true })

/** The HUD's own animations freeze with the game. */
const hudPaused = computed(() => isGamePaused.value || hud.book)

/* ──────────────────────────────── the loop ────────────────────────────── */

const STEP = 1 / 120 // fixed physics step: an identical duel at 30 or 144 Hz
let acc = 0
let prev = 0

const frame = (now: number): void => {
  rafId = requestAnimationFrame(frame)
  frameStart(now)
  const raw = prev ? (now - prev) / 1000 : 0.016
  prev = now
  // Clamp: a backgrounded tab returns a huge dt that would teleport shots.
  const dt = Math.min(Math.max(raw, 0), 0.25)

  // Adaptive quality with hysteresis, so it settles instead of oscillating.
  S.fdt += (raw - S.fdt) * 0.1
  if (S.fdt > 0.024 && S.q > 0) S.q = 0
  else if (S.fdt < 0.015 && S.q < 1) S.q = 1

  const paused = isGamePaused.value || !!S.book
  if (!paused) {
    S.dt = dt
    S.t += dt
    if (armed.value) {
      acc = Math.min(acc + dt, 0.25)
      while (acc >= STEP) {
        updateSim(STEP)
        acc -= STEP
      }
    }
    updateFx(dt)
    agePops(dt)
    tickAudio(dt)
  } else {
    S.dt = 0
    acc = 0
  }
  if (g) render(g)
  syncHud(paused ? 0 : dt)
  frameEnd()
}

/* ──────────────────────────────── lifecycle ───────────────────────────── */

let offDuel: (() => void) | null = null
const noMenu = (e: Event): void => e.preventDefault()

onMounted(() => {
  const cv = canvas.value!
  g = cv.getContext('2d', { alpha: false })
  load()
  resize()
  resetDuel()
  S.round = 1
  resetHudMirrors()
  duelStartedAt = performance.now()

  offDuel = onDuelEvent((e, won) => {
    if (e === 'finish') void presentResult(!!won)
    else if (e === 'rune') {
      haptic('tick')
      if (!firstRuneTracked) {
        firstRuneTracked = true
        track('first_rune', { onboarding: !!S.intro })
      }
    } else if (e === 'hurt') haptic('impact')
  })

  cv.addEventListener('pointerdown', onPointerDown)
  cv.addEventListener('lostpointercapture', onPointerUp)
  cv.addEventListener('contextmenu', noMenu)
  window.addEventListener('pointermove', onPointerMove, { passive: false })
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)
  // A stroke that leaves the window must still resolve, or the queue soft-locks.
  window.addEventListener('blur', onPointerUp)
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('resize', resize)
  window.addEventListener('orientationchange', onOrientation)

  // The score's intent is set now; it sounds from the first gesture, when the
  // browser lets the AudioContext run.
  startBattleMusic()
  rafId = requestAnimationFrame(frame)

  // Debug mode, the dev server, or a QA harness that announced itself before
  // boot (`scripts/portal-qa.mjs` sets `__AM_QA__`; no portal ever does).
  if (isDebug.value || import.meta.env.DEV || (window as any).__AM_QA__ === true) {
    exposeAnalytics()
    // Synchronous hooks for automated QA — rAF is throttled to ~1 fps when the
    // window is occluded, so harnesses drive the duel through these.
    const w = window as any
    w.__S = S
    w.__arm = () => { armed.value = true }
    w.__step = (n = 1, d = STEP) => {
      for (let i = 0; i < n; i++) {
        S.t += d
        S.dt = d
        updateSim(d)
        updateFx(d)
      }
    }
    w.__frame = () => { if (g) render(g) }
    w.__cast = cast
    w.__stroke = (pts: number[]) => {
      strokeStart(pts[0]!, pts[1]!)
      for (let i = 2; i < pts.length; i += 2) strokeMove(pts[i]!, pts[i + 1]!)
      endStroke()
    }
  }
})

onUnmounted(() => {
  cancelAnimationFrame(rafId)
  offDuel?.()
  const cv = canvas.value
  cv?.removeEventListener('pointerdown', onPointerDown)
  cv?.removeEventListener('lostpointercapture', onPointerUp)
  cv?.removeEventListener('contextmenu', noMenu)
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
  window.removeEventListener('blur', onPointerUp)
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('resize', resize)
  window.removeEventListener('orientationchange', onOrientation)
  releaseBook?.()
  stopBattleMusic()
  syncGameplayLifecycle(false)
})
</script>

<template lang="pug">
  //- dir="ltr": the arena is spatial — Aurora stands on the left in every
  //- locale. Text runs inside still shape right-to-left (see `.ink-text`).
  div.game-scene(dir="ltr")
    canvas.duel-canvas(ref="canvas")
    DuelHud(
      :muted="muted"
      :keyboard="keyboard"
      :paused="hudPaused"
      @cast="onCast"
      @mute="onMute"
      @options="onOptions"
      @book="setBook(true)"
    )
    DuelResult(
      v-if="hud.resultUp"
      :reward-live="rewardLive"
      :reward-claimed="rewardClaimed"
      :reward-coins="rewardCoins"
      :keyboard="keyboard"
      :paused="hudPaused"
      @restart="restart"
      @buy="onBuy"
      @reward="onReward"
    )
    SpellBook(v-if="SPELLBOOK && hud.book" @close="setBook(false)")
    OptionsModal(:is-open="optionsOpen" @close="optionsOpen = false")
</template>

<style scoped lang="sass">
.game-scene
  position: fixed
  inset: 0
  overflow: hidden
  background: #07060f

// The canvas takes every stroke; `touch-action: none` or the browser steals a
// touch-drag as a pan before the rune ever starts.
.duel-canvas
  position: absolute
  left: 0
  top: 0
  display: block
  touch-action: none
  user-select: none
  -webkit-user-select: none
  -webkit-touch-callout: none
</style>
