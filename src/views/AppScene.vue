<script setup lang="ts">
/**
 * AppScene — the app root (story-spec §4.1.2, §4.1.4–§4.1.5, M11).
 *
 * It owns the ONE `<canvas>`, the one `getContext`, the one RAF and every
 * pointer/keyboard listener, for every scene. It runs `load()` (and with it
 * the schema-2 migration) BEFORE the first scene is chosen, then boots
 * straight into the story: a fresh save meets node 1's dialogue, a pending
 * gift boots onto the map — never a menu.
 *
 * Each frame dispatches on `S.flow.scene`: the duel steps its fixed-timestep
 * sim and draws the arena; the gift, pots and wipe step and draw the restore
 * view; the map and the dialogue draw the map. The per-scene `.vue` files
 * are DOM chrome only — none owns a canvas or a RAF.
 *
 * Platform duties that belong to the whole app live here too: the first
 * trusted gesture arms the session (Poki's rule: nothing "plays" before a
 * person does), the pause gate freezes every scene, and the QA ad chord
 * counts presses across all of them.
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { PH_DUEL, BOX } from '@/game/duel/config'
import { S, load } from '@/game/duel/state'
import { applyLayout, toStage, LAYOUT } from '@/game/duel/layout'
import { render } from '@/game/duel/render'
import { updateFx } from '@/game/duel/fx'
import { updateSim, strokeStart, strokeMove, strokeEnd, cast, onDuelEvent } from '@/game/duel/sim'
import { initAudio, tickAudio, sfx } from '@/game/duel/audio'
import { gotoScene, arm, openOverlay, closeOverlay, type SceneId } from '@/game/flow/scene'
import { installGameplayBracket, bracketLive } from '@/game/flow/bracket'
import { dipTo, stepTransition, drawTransition, fading, __flushTransition } from '@/game/flow/transition'
import { installDuelFlow, retry, leaveDuel, startDuel } from '@/game/flow/duelFlow'
import { bootScene, playNode } from '@/game/flow/nodes'
import { installCampaignController } from '@/game/campaign/controller'
import { pendingSectorNode } from '@/game/campaign/state'
import {
  beginRestore, updateRestore, drawRestore, restoreResize, restorePointerDown, restorePointerMove,
  restorePointerUp, openGiftFromUi, pickPot, leaveRestore, continueRestore, qaWipe, type RestoreEnd
} from '@/game/restore/wipe'
import {
  drawMap, updateMap, mapResize, mapPointerDown, mapPointerMove, mapPointerUp, focusMap,
  setMapTapHandler, qaMap, type MapTarget
} from '@/game/map/map'
import { hud, syncHud, agePops, publishLayout, isOnFoeHpBar } from '@/use/useDuelHud'
import { flowHud } from '@/use/useFlow'
import { duelBeat } from '@/use/useDuelBeat'
import { restoreHud } from '@/use/useRestoreHud'
import { isGamePaused } from '@/use/useGamePause'
import { acquireModalOpen } from '@/use/useModalState'
import { registerQaAdTap, breakQaAdChain } from '@/use/useQaAdTrigger'
import { signalGameplayLoaded } from '@/use/useCrazyGames'
import { syncGameplayLifecycle } from '@/use/useGameplayLifecycle'
import { haptic } from '@/use/useHaptics'
import { trackRecognition, exposeAnalytics, track } from '@/use/useAnalytics'
import { frameStart, frameEnd } from '@/use/usePerfProbe'
import { isDebug } from '@/use/useMatch'
import { useMusic } from '@/use/useSound'
import { leaderboardLive } from '@/use/useLeaderboard'
import { SPELLBOOK } from '@/game/duel/config'
import GameScene from '@/views/GameScene.vue'
import MapScene from '@/views/MapScene.vue'
import DialogueScene from '@/views/DialogueScene.vue'
import UnboxScene from '@/views/UnboxScene.vue'
import WipeScene from '@/views/WipeScene.vue'
import WardrobeScene from '@/views/WardrobeScene.vue'
import SpellBook from '@/components/duel/SpellBook.vue'
import OptionsModal from '@/components/organisms/OptionsModal.vue'
import LeaderboardModal from '@/components/organisms/LeaderboardModal.vue'
import { drawWardrobe, updateWardrobe, wardrobeResize } from '@/game/cosmetics/wardrobe'
import { openSector, onRestoreFinished } from '@/game/flow/restoreFlow'
import { twinGift, offerTwinGift, withdrawTwinGift } from '@/use/useDuelRewards'
import { refreshBook } from '@/use/useBook'
import { twinHoldStart, twinHoldCancel, __twinState } from '@/game/map/twinGift'

const canvas = ref<HTMLCanvasElement | null>(null)
let g: CanvasRenderingContext2D | null = null
let rafId = 0

const { startBattleMusic, stopBattleMusic, isMusicPlaying } = useMusic()
const keyboard = typeof window !== 'undefined' && !!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches
const boardOpen = ref(false)

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
  publishLayout(applyLayout(w, h, dpr))
  restoreResize()
  mapResize(w, h)
  wardrobeResize()
}
const onOrientation = (): void => { window.setTimeout(resize, 250) }

/* ──────────────────────────────── arming ──────────────────────────────── */
//
// Nothing is PLAYED until a person has touched the game: the foe holds her
// first rune, and no portal is told gameplay started. Trusted events only.
let firstRuneTracked = false
const wake = (e?: Event): void => {
  initAudio()
  if (!S.flow.armed && (!e || e.isTrusted)) {
    arm()
    signalGameplayLoaded()
  }
}

/* ───────────────────────────────── input ──────────────────────────────── */

const scene = (): SceneId => S.flow.scene
const blocked = (): boolean => isGamePaused.value || S.flow.overlay !== null || boardOpen.value || fading()

const zoneCallout = (): [number, number] => {
  if (!LAYOUT.portrait) return [640, BOX.y - 46]
  const z = LAYOUT.zone
  return [z.x + z.w / 2, z.y + z.h * 0.42]
}
const endStroke = (): void => {
  const [x, y] = zoneCallout()
  strokeEnd(x, y)
}

const onPointerDown = (e: PointerEvent): void => {
  e.preventDefault()
  wake(e)
  if (blocked()) return
  try { canvas.value?.setPointerCapture(e.pointerId) } catch { /* not capturable */ }
  const sc = scene()
  if (sc === 'duel') {
    if (S.phase !== PH_DUEL) return
    const [x, y] = toStage(e.clientX, e.clientY)
    strokeStart(x, y)
  } else if (sc === 'unbox' || sc === 'wipe') restorePointerDown(e.clientX, e.clientY, e.timeStamp)
  else if (sc === 'map') mapPointerDown(e.clientX, e.clientY, e.timeStamp)
}

const onPointerMove = (e: PointerEvent): void => {
  const sc = scene()
  const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : []
  const each = (fn: (ev: PointerEvent) => void): void => {
    if (evs.length) for (const ev of evs) fn(ev)
    else fn(e)
  }
  if (sc === 'duel') {
    if (!S.draw) return
    if (e.buttons === 0) {
      endStroke()
      return
    }
    e.preventDefault()
    each((ev) => {
      const [x, y] = toStage(ev.clientX, ev.clientY)
      strokeMove(x, y)
    })
  } else if (sc === 'unbox' || sc === 'wipe') {
    // A release that went missing, or a pause that landed mid-stroke: lift the
    // brush rather than let a finger under an ad keep wiping (§3.10).
    if (e.buttons === 0 || isGamePaused.value) {
      restorePointerUp()
      return
    }
    each((ev) => restorePointerMove(ev.clientX, ev.clientY, ev.timeStamp))
  } else if (sc === 'map') {
    if (e.buttons === 0) return
    mapPointerMove(e.clientX, e.clientY, e.timeStamp)
  }
}

const onPointerUp = (e?: PointerEvent): void => {
  const sc = scene()
  if (sc === 'duel') endStroke()
  else if (sc === 'unbox' || sc === 'wipe') restorePointerUp()
  else if (sc === 'map' && e) mapPointerUp(e.clientX, e.clientY, e.timeStamp)
}
const onLostCapture = (): void => onPointerUp()

/* ────────────────────────────── the map's taps ────────────────────────── */

const onMapTap = (t: MapTarget): void => {
  if (blocked()) return
  if (t.kind === 'gift') {
    sfx('ui')
    openSector(t.node)
  } else if (t.kind === 'tent') {
    sfx('ui')
    dipTo(() => gotoScene('wardrobe'), 0.4)
  } else if (t.kind === 'node') {
    sfx('ui')
    playNode(t.node)
  }
}

/** The restore loop handed control back — to the map (§3.2.2 step 13). */
const onRestoreEnd = (why: RestoreEnd): void => onRestoreFinished(why)

/* ──────────────────────────────── keyboard ────────────────────────────── */

const onKeyDown = (e: KeyboardEvent): void => {
  wake(e)
  const k = e.key
  if (S.flow.overlay) {
    if (k === 'Escape') closeOverlay()
    return
  }
  if (boardOpen.value) return
  const sc = scene()
  if (sc === 'duel') {
    if (k === ' ' || k === 'Enter' || k === 'e' || k === 'E') {
      e.preventDefault()
      if (duelBeat.phase === 'loss' && hud.tapReady) retry()
      else if (S.phase === PH_DUEL) {
        sfx('ui')
        cast()
      }
    } else if (SPELLBOOK && (k === '?' || k === 'h' || k === 'H')) openOverlay('spellbook')
  } else if (sc === 'unbox' || sc === 'wipe') {
    if (k === ' ' || k === 'Enter') {
      e.preventDefault()
      if (restoreHud.phase === 'invite') openGiftFromUi()
      else if (restoreHud.showContinue) continueRestore()
    } else if (k === 'Escape') leaveRestore()
  } else if (sc === 'map') {
    if (k === ' ' || k === 'Enter') {
      e.preventDefault()
      const pending = pendingSectorNode(S.campaign)
      if (pending !== null) onMapTap({ kind: 'gift', node: pending })
      else onMapTap({ kind: 'node', node: S.campaign.furthestNode + 1 })
    }
  }
}

/* ────────────────────────── QA interstitial chord ────────────────────────── */
//
// Thirty taps in a row on the foe's HP bar request an interstitial on the spot
// (`useQaAdTrigger`). Every other press breaks the chain. Window, capture phase.
const onQaChord = (e: PointerEvent): void => {
  if (scene() === 'duel' && e.target === canvas.value && isOnFoeHpBar(e.clientX, e.clientY)) registerQaAdTap()
  else breakQaAdChain()
}

/**
 * Any trusted press anywhere wakes the game — not only one on the canvas. A
 * fresh save opens on a dialogue whose bubbles are DOM: without this, the
 * first taps a new player makes would leave the audio locked (the babble
 * voice silent) and the session unarmed.
 */
const onAnyPress = (e: PointerEvent): void => {
  wake(e)
  onQaChord(e)
}

/* ─────────────────────────────── the Twin Gift ─────────────────────────── */
//
// Offered on the map beside the sector just restored; leaving the map takes
// it away again, quietly — it is never presented as a missed chance (§8.2).
watch(() => flowHud.scene, (sc) => {
  if (sc !== 'map') withdrawTwinGift()
})

/* ─────────────────────────── global overlays ─────────────────────────── */
//
// The spellbook and options stack on any scene (§3.3.7, §3.9.1). The modal
// lock (which pauses the game) is taken and released HERE, in one place, not
// per call site.
let releaseOverlay: (() => void) | null = null
const overlayOpen = computed(() => flowHud.overlay)
const syncOverlayLock = (): void => {
  const open = S.flow.overlay !== null
  if (open && !releaseOverlay) releaseOverlay = acquireModalOpen()
  else if (!open && releaseOverlay) {
    releaseOverlay()
    releaseOverlay = null
  }
}

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

  syncOverlayLock()
  const paused = isGamePaused.value
  const sc = scene()
  if (!paused) {
    S.dt = dt
    S.t += dt
    if (sc === 'duel') {
      if (S.flow.armed) {
        acc = Math.min(acc + dt, 0.25)
        while (acc >= STEP) {
          updateSim(STEP)
          acc -= STEP
        }
      }
    } else if (sc === 'unbox' || sc === 'wipe') updateRestore(dt, now)
    else if (sc === 'map' || sc === 'dialogue') updateMap(dt)
    else if (sc === 'wardrobe') updateWardrobe(dt)
    updateFx(dt)
    agePops(dt)
    tickAudio(dt)
    stepTransition(dt)
  } else {
    S.dt = 0
    acc = 0
  }
  if (g) {
    if (sc === 'duel') render(g)
    else if (sc === 'unbox' || sc === 'wipe') drawRestore(g)
    else if (sc === 'map' || sc === 'dialogue') drawMap(g)
    else if (sc === 'wardrobe') drawWardrobe(g)
    else {
      g.setTransform(1, 0, 0, 1, 0, 0)
      g.fillStyle = '#2b2048'
      g.fillRect(0, 0, g.canvas.width, g.canvas.height)
    }
    drawTransition(g)
  }
  syncHud(paused ? 0 : dt)
  frameEnd()
}

/* ──────────────────────────────── lifecycle ───────────────────────────── */

const offs: (() => void)[] = []
const noMenu = (e: Event): void => e.preventDefault()

onMounted(() => {
  const cv = canvas.value!
  g = cv.getContext('2d', { alpha: false })
  // The save first, the migration with it — then the first scene (I-11).
  load()
  refreshBook()
  resize()
  offs.push(installCampaignController())
  offs.push(installDuelFlow())
  offs.push(installGameplayBracket())
  setMapTapHandler(onMapTap)
  offs.push(onDuelEvent((e, _won, info) => {
    if (e === 'stroke' && info) trackRecognition(info)
    else if (e === 'rune') {
      haptic('tick')
      if (!firstRuneTracked) {
        firstRuneTracked = true
        track('first_rune', { onboarding: !!S.intro })
      }
    } else if (e === 'hurt') haptic('impact')
  }))
  bootScene()
  if (S.flow.scene === 'map') focusMap(S.flow.node)

  window.addEventListener('pointerdown', onAnyPress, { capture: true, passive: true })
  cv.addEventListener('pointerdown', onPointerDown)
  cv.addEventListener('lostpointercapture', onLostCapture)
  cv.addEventListener('contextmenu', noMenu)
  window.addEventListener('pointermove', onPointerMove, { passive: false })
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)
  // A stroke that leaves the window must still resolve, or the queue soft-locks.
  window.addEventListener('blur', onLostCapture)
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('resize', resize)
  window.addEventListener('orientationchange', onOrientation)

  // The score's intent is set now; it sounds from the first gesture.
  startBattleMusic()
  rafId = requestAnimationFrame(frame)

  // Debug mode, the dev server, or a QA harness that announced itself before
  // boot (`scripts/portal-qa.mjs` sets `__AM_QA__`; no portal ever does).
  if (isDebug.value || import.meta.env.DEV || (window as any).__AM_QA__ === true) {
    exposeAnalytics()
    const w = window as any
    w.__S = S
    w.__arm = () => arm()
    w.__step = (n = 1, d = STEP) => {
      for (let i = 0; i < n; i++) {
        S.t += d
        S.dt = d
        updateSim(d)
        updateFx(d)
      }
    }
    w.__frame = () => { if (g) render(g) }
    w.__musicOn = isMusicPlaying
    w.__cast = cast
    w.__stroke = (pts: number[]) => {
      strokeStart(pts[0]!, pts[1]!)
      for (let i = 2; i < pts.length; i += 2) strokeMove(pts[i]!, pts[i + 1]!)
      endStroke()
    }
    // The story (story-spec §4.12).
    w.__flow = {
      state: () => ({ ...S.flow }),
      phase: () => restoreHud.phase,
      beat: () => duelBeat.phase,
      fading,
      flush: __flushTransition,
      goto: (sc: SceneId, n = -1) => gotoScene(sc, n),
      duel: (n: number) => startDuel(n),
      leave: leaveDuel,
      /** What the portals were last told: is gameplay live? */
      live: bracketLive
    }
    w.__campaign = {
      state: () => S.campaign,
      reset: qaWipe.reset,
      setFurthest: (n: number) => {
        S.campaign.furthestNode = Math.max(-1, Math.min(49, n | 0))
      }
    }
    w.__wipe = {
      ...qaWipe,
      /** Open sector `n` now, as a win would. */
      start: (n = 0) => {
        if (S.campaign.furthestNode < n) S.campaign.furthestNode = n
        openSector(n)
      }
    }
    w.__map = { ...qaMap, focus: focusMap, tap: onMapTap }
    w.__twin = {
      offer: offerTwinGift,
      state: () => ({ node: twinGift.node, ...__twinState() }),
      hold: twinHoldStart,
      release: twinHoldCancel
    }
  }
})

onUnmounted(() => {
  cancelAnimationFrame(rafId)
  for (const off of offs) off()
  const cv = canvas.value
  window.removeEventListener('pointerdown', onAnyPress, { capture: true })
  cv?.removeEventListener('pointerdown', onPointerDown)
  cv?.removeEventListener('lostpointercapture', onLostCapture)
  cv?.removeEventListener('contextmenu', noMenu)
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
  window.removeEventListener('blur', onLostCapture)
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('resize', resize)
  window.removeEventListener('orientationchange', onOrientation)
  releaseOverlay?.()
  stopBattleMusic()
  syncGameplayLifecycle(false)
})
</script>

<template lang="pug">
  //- dir="ltr": the world is spatial — Aurora stands on the left and chapter 1
  //- comes first in every locale. Text inside still runs right-to-left.
  div.app-scene(dir="ltr")
    canvas.world(ref="canvas")
    GameScene(v-if="flowHud.scene === 'duel'" :keyboard="keyboard")
    MapScene(v-else-if="flowHud.scene === 'map'" @board="boardOpen = true")
    DialogueScene(v-else-if="flowHud.scene === 'dialogue'")
    WardrobeScene(v-else-if="flowHud.scene === 'wardrobe'")
    template(v-if="flowHud.scene === 'unbox' || flowHud.scene === 'wipe'")
      UnboxScene(v-if="flowHud.scene === 'unbox'" @open="openGiftFromUi" @pick="pickPot")
      WipeScene(@back="leaveRestore" @continue="continueRestore")
    SpellBook(v-if="overlayOpen === 'spellbook'" @close="closeOverlay")
    OptionsModal(:is-open="overlayOpen === 'options'" @close="closeOverlay")
    LeaderboardModal(v-if="leaderboardLive" v-model="boardOpen" :score="hud.wins")
</template>

<style scoped lang="sass">
.app-scene
  position: fixed
  inset: 0
  overflow: hidden
  background: #07060f

// The canvas takes every stroke, brush and pan; `touch-action: none` or the
// browser steals a touch-drag as a scroll first.
.world
  position: absolute
  left: 0
  top: 0
  display: block
  touch-action: none
  user-select: none
  -webkit-user-select: none
  -webkit-touch-callout: none
</style>
