<script setup lang="ts">
/**
 * AppScene — the app root (story-spec §4.1.2, §4.1.4–§4.1.5, M11).
 *
 * It owns the ONE `<canvas>`, the one `getContext`, the one RAF and every
 * pointer/keyboard listener, for every scene. It runs `load()` (and with it
 * the schema-2 migration) BEFORE the first scene is chosen, then boots
 * straight into the story: a fresh save lands in node 0's duel with the
 * opening line over it, a pending gift boots onto the map — never a menu,
 * and never a cutscene in front of the first stroke (retention item 2).
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
import { S, load, save } from '@/game/duel/state'
import { applyLayout, toStage, LAYOUT } from '@/game/duel/layout'
import { render } from '@/game/duel/render'
import { updateFx } from '@/game/duel/fx'
import { updateSim, strokeStart, strokeMove, strokeEnd, cast, castSide, onDuelEvent } from '@/game/duel/sim'
import { initAudio, tickAudio, sfx, setAmbience } from '@/game/duel/audio'
import { gotoScene, arm, openOverlay, closeOverlay, type SceneId } from '@/game/flow/scene'
import { installGameplayBracket, bracketLive, pokiBracketLive } from '@/game/flow/bracket'
import { dipTo, stepTransition, drawTransition, fading, __flushTransition } from '@/game/flow/transition'
import { installDuelFlow, retry, leaveDuel, startDuel, openVersus, startVersus } from '@/game/flow/duelFlow'
import { versusHud, updateVersusWide } from '@/use/useVersus'
import { bootScene, playNode, playIntro, openGift, closeOpening } from '@/game/flow/nodes'
import { duelPageState } from '@/game/duel/duelPage'
import {
  updateIntro, drawIntro, introResize, introPointerDown, skipIntro, playFromIntro, introState, INTRO_LEN
} from '@/game/story/intro'
import { introHud } from '@/use/useIntroHud'
import { installCampaignController } from '@/game/campaign/controller'
import { beginSession, noteFirstCast, noteFirstStroke } from '@/game/campaign/session'
import { pendingSectorNode } from '@/game/campaign/state'
import {
  beginRestore, updateRestore, drawRestore, restoreResize, restorePointerDown, restorePointerMove,
  restorePointerUp, restoreHover, openGiftFromUi, pickPot, leaveRestore, continueRestore, qaWipe, restoreAmbience, type RestoreEnd
} from '@/game/restore/wipe'
import {
  drawMap, updateMap, mapResize, mapPointerDown, mapPointerMove, mapPointerUp, focusMap,
  setMapTapHandler, qaMap, peekCreature, mapAmbience, greetUmbra, type MapTarget
} from '@/game/map/map'
import { wanderOnMapOpen } from '@/game/map/wanderer'
import { hud, syncHud, agePops, publishLayout, isOnFoeHpBar } from '@/use/useDuelHud'
import { flowHud, openingHud } from '@/use/useFlow'
import { duelBeat } from '@/use/useDuelBeat'
import { restoreHud } from '@/use/useRestoreHud'
import { isGamePaused, acquireAppPause, onPauseChange } from '@/use/useGamePause'
import { noteResume } from '@/game/duel/director'
import { acquireModalOpen } from '@/use/useModalState'
import { registerQaAdTap, breakQaAdChain, breakBookmarkChain } from '@/use/useQaAdTrigger'
import { runeGift, closeRuneGift } from '@/use/useRuneGift'
import { signalGameplayLoaded } from '@/use/useCrazyGames'
import { syncGameplayLifecycle, syncPokiGameplay } from '@/use/useGameplayLifecycle'
import { haptic } from '@/use/useHaptics'
import { trackRecognition, exposeAnalytics, track } from '@/use/useAnalytics'
import { frameStart, frameEnd } from '@/use/usePerfProbe'
import { stepQuality } from '@/game/duel/quality'
import { isDebug } from '@/use/useMatch'
import { useMusic } from '@/use/useSound'
import { SPELLBOOK } from '@/game/duel/config'
import GameScene from '@/views/GameScene.vue'
import MapScene from '@/views/MapScene.vue'
import DialogueScene from '@/views/DialogueScene.vue'
import UnboxScene from '@/views/UnboxScene.vue'
import WipeScene from '@/views/WipeScene.vue'
import WardrobeScene from '@/views/WardrobeScene.vue'
import VersusSetup from '@/views/VersusSetup.vue'
import IntroScene from '@/views/IntroScene.vue'
import SpellBook from '@/components/duel/SpellBook.vue'
import OptionsModal from '@/components/organisms/OptionsModal.vue'
import RuneGift from '@/components/story/RuneGift.vue'
import { drawWardrobe, updateWardrobe, wardrobeResize } from '@/game/cosmetics/wardrobe'
import { primeWardrobeArt } from '@/game/artPreload'
import { openSector, onRestoreFinished } from '@/game/flow/restoreFlow'
import { sectorOf } from '@/game/map/sectors'
import { twinGift, offerTwinGift, withdrawTwinGift } from '@/use/useDuelRewards'
import { refreshBook } from '@/use/useBook'
import { twinHoldStart, twinHoldCancel, stepTwin, __twinState } from '@/game/map/twinGift'
import { setBit } from '@/game/campaign/bitset'

const canvas = ref<HTMLCanvasElement | null>(null)
let g: CanvasRenderingContext2D | null = null
let rafId = 0

const { startBattleMusic, stopBattleMusic, isMusicPlaying } = useMusic()
const keyboard = typeof window !== 'undefined' && !!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches

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
  updateVersusWide(w, h)
  restoreResize()
  mapResize(w, h)
  wardrobeResize()
  if (S.flow.scene === 'intro') introResize()
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
const blocked = (): boolean => isGamePaused.value || S.flow.overlay !== null || fading()

const zoneCallout = (e = false): [number, number] => {
  // In local versus a refusal shows over the half its player draws on.
  if (S.versus) return [e ? 960 : 320, BOX.y - 46]
  if (!LAYOUT.portrait) return [640, BOX.y - 46]
  const z = LAYOUT.zone
  return [z.x + z.w / 2, z.y + z.h * 0.42]
}
const endStroke = (e = false): void => {
  const [x, y] = zoneCallout(e)
  strokeEnd(x, y, e)
}
/**
 * Local versus (§3.12): which side each live pointer draws for — decided on
 * its first contact by the half of the SCREEN it landed in, before any stage
 * transform is involved, and kept for the whole stroke, so a finger that
 * wanders over the middle never starts writing into the other hand.
 */
const strokeSide = new Map<number, boolean>()

const onPointerDown = (e: PointerEvent): void => {
  e.preventDefault()
  wake(e)
  if (blocked()) return
  try { canvas.value?.setPointerCapture(e.pointerId) } catch { /* not capturable */ }
  const sc = scene()
  if (sc === 'duel') {
    if (S.phase !== PH_DUEL) return
    // RIGHT-CLICK CASTS (owner, 2026-09-21). On a mouse the hand that draws
    // the rune is already on the pointer, and reaching for the space bar to
    // release it costs the whole rhythm. Button 2 is safe here: the canvas
    // already eats its context menu (`noMenu`), and a right press never
    // starts a stroke, so it cannot interrupt one being drawn.
    if (e.button === 2) {
      if (!S.versus) {
        sfx('ui')
        cast()
      }
      return
    }
    const [x, y] = toStage(e.clientX, e.clientY)
    if (S.versus) {
      if (!versusHud.wide) return
      const side = e.clientX >= window.innerWidth / 2
      // One finger per side: a second finger on the same half is ignored.
      if (side ? S.edraw : S.draw) return
      strokeSide.set(e.pointerId, side)
      noteFirstStroke()
      strokeStart(x, y, side)
    } else {
      // The funnel's second step, at the moment a finger actually starts
      // drawing — not when the duel opened (retention item 1). A refused
      // second finger in versus above never reaches here, so it never counts.
      noteFirstStroke()
      strokeStart(x, y)
    }
  } else if (sc === 'unbox' || sc === 'wipe') restorePointerDown(e.clientX, e.clientY, e.timeStamp)
  else if (sc === 'map') mapPointerDown(e.clientX, e.clientY, e.timeStamp)
  else if (sc === 'intro') introPointerDown(e.clientX, e.clientY)
}

const onPointerMove = (e: PointerEvent): void => {
  const sc = scene()
  const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : []
  const each = (fn: (ev: PointerEvent) => void): void => {
    if (evs.length) for (const ev of evs) fn(ev)
    else fn(e)
  }
  if (sc === 'duel') {
    if (S.versus) {
      const side = strokeSide.get(e.pointerId)
      if (side === undefined) return
      if (e.buttons === 0) {
        strokeSide.delete(e.pointerId)
        endStroke(side)
        return
      }
      e.preventDefault()
      each((ev) => {
        const [x, y] = toStage(ev.clientX, ev.clientY)
        strokeMove(x, y, side)
      })
      return
    }
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
    // sponge rather than let a finger under an ad keep wiping (§3.10).
    if (e.buttons === 0 || isGamePaused.value) {
      restorePointerUp()
      // A mouse hovering with no button: the tool rides the cursor.
      if (e.buttons === 0 && e.pointerType === 'mouse' && !isGamePaused.value) restoreHover(e.clientX, e.clientY)
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
  if (sc === 'duel' && S.versus) {
    // A pointer lifts its own hand; a blur (no pointer) lifts both.
    for (const id of e ? [e.pointerId] : [...strokeSide.keys()]) {
      const side = strokeSide.get(id)
      if (side === undefined) continue
      strokeSide.delete(id)
      endStroke(side)
    }
  } else if (sc === 'duel') endStroke()
  else if (sc === 'unbox' || sc === 'wipe') restorePointerUp()
  else if (sc === 'map' && e) mapPointerUp(e.clientX, e.clientY, e.timeStamp)
}
const onLostCapture = (e?: Event): void => onPointerUp(e instanceof PointerEvent ? e : undefined)

/* ────────────────────────────── the map's taps ────────────────────────── */

const onMapTap = (t: MapTarget): void => {
  if (blocked()) return
  if (t.kind === 'gift') {
    sfx('ui')
    // The first one plays the picture book in front of it (§8.26).
    openGift(t.node)
  } else if (t.kind === 'creature') {
    peekCreature(t.node)
  } else if (t.kind === 'umbra') {
    greetUmbra()
  } else if (t.kind === 'tent') {
    sfx('ui')
    track('tent_open')
    // The tent's own paintings start on the wire under the dip, so the room
    // has usually decoded by the time it is on screen (a no-op, and no
    // request, with the art layer off).
    primeWardrobeArt()
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
  const sc = scene()
  if (sc === 'duel' && S.versus) {
    // Local versus on one keyboard: Space casts for player 1, Enter for 2.
    if ((k === ' ' || k === 'Enter') && S.phase === PH_DUEL) {
      e.preventDefault()
      sfx('ui')
      castSide(k === 'Enter')
    }
  } else if (sc === 'duel') {
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
  } else if (sc === 'intro') {
    // Enter or Space on the last page plays; Escape skips at any point.
    if (k === 'Escape') skipIntro()
    else if ((k === ' ' || k === 'Enter') && introHud.play) {
      e.preventDefault()
      playFromIntro()
    }
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
  // The bookmark's chord (twenty on the storybook's ribbon) is counted by the
  // map itself; a press that never reaches the book breaks it here.
  if (scene() !== 'map' || e.target !== canvas.value) breakBookmarkChain()
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
  else {
    // After the finale, Umbra is visiting somewhere new each time (§8.11).
    wanderOnMapOpen()
  }
  // The opener belongs to the duel it was laid over, and to no other scene:
  // leaving takes whatever is left of it with us.
  if (sc !== 'duel') closeOpening()
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

/* ───────────────────────── adaptive quality (S.q) ─────────────────────── */
//
// The controller itself is `game/duel/quality.ts` — its header carries the
// reasoning, and `tests/duel/quality.test.ts` pins the two non-negotiables.
// It lives out there rather than in this file because it is the one piece of
// the loop whose rules are worth a test, and a rule inside a `.vue` file is a
// rule nobody can call.

/** What the previous frame spent inside this callback. Seeded with a plausible
 *  60 Hz figure so the first frames neither win nor lose the tier outright. */
let lastWork = 0.008

const frame = (now: number): void => {
  rafId = requestAnimationFrame(frame)
  const t0 = performance.now()
  frameStart(now)
  const raw = prev ? (now - prev) / 1000 : 0.016
  prev = now
  // Clamp: a backgrounded tab returns a huge dt that would teleport shots.
  const dt = Math.min(Math.max(raw, 0), 0.25)

  stepQuality(raw, lastWork, dt)

  syncOverlayLock()
  const paused = isGamePaused.value
  const sc = scene()
  if (!paused) {
    S.dt = dt
    S.t += dt
    // A duel left mid-freeze (§8.31) never carries the hold into another
    // scene: only the duel's own sim spends that clock.
    if (S.stop > 0 && sc !== 'duel') S.stop = 0
    if (sc === 'duel') {
      // A versus match holds still while the screen is too narrow to hold
      // both halves (the chrome shows the turn-sideways prompt).
      if (S.flow.armed && (!S.versus || versusHud.wide)) {
        acc = Math.min(acc + dt, 0.25)
        while (acc >= STEP) {
          updateSim(STEP)
          acc -= STEP
        }
      }
    } else if (sc === 'unbox' || sc === 'wipe') updateRestore(dt, now)
    else if (sc === 'map' || sc === 'dialogue') updateMap(dt)
    else if (sc === 'wardrobe') updateWardrobe(dt)
    else if (sc === 'intro') updateIntro(dt)
    updateFx(dt)
    agePops(dt)
    // The restored biome's loop, while it is in view (§8.8 beat 1).
    const [amb, ak] = sc === 'map' || sc === 'dialogue' ? mapAmbience() : sc === 'unbox' || sc === 'wipe' ? restoreAmbience() : [-1, 0]
    setAmbience(amb, sc === 'dialogue' ? ak * 0.5 : ak)
    tickAudio(dt)
  } else {
    S.dt = 0
    acc = 0
  }
  // A TURN IS NEVER PAUSED (§8.32). The turn hides the scene's DOM chrome,
  // so anything that could lift an app-side pause is off screen while one
  // runs — a turn that stalls on a pause cannot be un-stalled by the player.
  // `dipTo` already shuts any overlay; this is the backstop for every other
  // way the game can pause mid-turn, and letting a page finish turning under
  // an ad costs nothing.
  stepTransition(dt)
  if (g) {
    if (sc === 'duel' || sc === 'versusSetup') render(g)
    else if (sc === 'unbox' || sc === 'wipe') drawRestore(g)
    else if (sc === 'map' || sc === 'dialogue') drawMap(g)
    else if (sc === 'wardrobe') drawWardrobe(g)
    else if (sc === 'intro') drawIntro(g)
    else {
      g.setTransform(1, 0, 0, 1, 0, 0)
      g.fillStyle = '#9E7CBE'
      g.fillRect(0, 0, g.canvas.width, g.canvas.height)
    }
    drawTransition(g)
  }
  syncHud(paused ? 0 : dt)
  frameEnd()
  // Read once, at the very end, so `lastWork` is this callback's whole cost.
  // A frame that ran while the tab was hidden or an ad was up is not evidence
  // about the device, so a stalled frame is discarded rather than smoothed in.
  const spent = (performance.now() - t0) / 1000
  if (spent < 0.25) lastWork = spent
}

/* ──────────────────────────────── lifecycle ───────────────────────────── */

const offs: (() => void)[] = []
const noMenu = (e: Event): void => e.preventDefault()

onMounted(() => {
  const cv = canvas.value!
  g = cv.getContext('2d', { alpha: false })
  // The save first, the migration with it — then the first scene (I-11).
  load()
  // …and between the two, the session is counted: `session_start` reports the
  // progress this boot INHERITED, so it has to be read before the story moves.
  beginSession()
  refreshBook()
  resize()
  offs.push(installCampaignController())
  offs.push(installDuelFlow())
  offs.push(installGameplayBracket())
  // A menu closed, an ad ended, the tab came back: the foe may not release a
  // spell for a second (director.ts, story-spec §8.36).
  offs.push(onPauseChange((paused) => { if (!paused) noteResume() }))
  setMapTapHandler(onMapTap)
  offs.push(onDuelEvent((e, _won, info) => {
    if (e === 'stroke' && info) {
      trackRecognition(info)
      // The player is drawing, so the opener folds away at whatever beat it
      // had reached — nobody is made to wait for Umbra's reply (retention
      // item 2). `stroke` and not the pointer: a stray tap is not an attempt,
      // and must not take the story with it.
      closeOpening()
    } else if (e === 'rune') {
      haptic('tick')
      if (!firstRuneTracked) {
        firstRuneTracked = true
        track('first_rune', { onboarding: !!S.intro })
      }
    } else if (e === 'cast') noteFirstCast()
    else if (e === 'hurt') haptic('impact')
  }))
  bootScene()
  if (S.flow.scene === 'map') {
    focusMap(S.flow.node)
    wanderOnMapOpen()
  }

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
    /**
     * Hold the game's own clock so a harness can walk a fight frame by frame
     * (`__step` still advances it by hand). Without it the live loop runs
     * between two round trips and a spell's whole flight — six frames — is
     * over before a screenshot lands.
     */
    let held: (() => void) | null = null
    w.__hold = () => {
      if (!held) held = acquireAppPause()
      return true
    }
    w.__release = () => {
      held?.()
      held = null
      return true
    }
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
      /** Is the cold boot's opening line still over the arena? */
      opening: () => openingHud.live,
      /** What the portals were last told: is gameplay live? */
      live: bracketLive,
      /** …and what Poki was told, whose bracket spans the storybook. */
      pokiLive: pokiBracketLive,
      /** Close Options / the spellbook, whatever their buttons are called. */
      closeOverlay,
      /** …and open one, in any locale (the buttons' labels are translated). */
      openOverlay
    }
    w.__versus = { open: openVersus, start: startVersus, state: () => ({ ...versusHud, versus: S.versus }) }
    w.__castSide = castSide
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
    /** A sector's authored spots (landmark, gift, creature, rescue), SU. */
    w.__sectorInfo = (n: number) => {
      const s = sectorOf(n)
      return { landmark: s.landmark, giftSpot: s.giftSpot, rvu: s.rvu, tap: s.tap && { x: s.tap.x, y: s.tap.y, r: s.tap.r }, rescue: s.rescue && { x: s.rescue.x, y: s.rescue.y, r: s.rescue.r } }
    }
    // §11.15.1 — the portal harness drives the story through these.
    const until = (pred: () => boolean, ms = 12000): Promise<boolean> => new Promise((res) => {
      const t0 = performance.now()
      const poll = (): void => {
        if (pred()) res(true)
        else if (performance.now() - t0 > ms) res(false)
        else setTimeout(poll, 50)
      }
      poll()
    })
    /** Straight to node `n`'s duel, dialogue skipped, every earlier sector restored. */
    w.__gotoNode = (n: number) => {
      const c = S.campaign
      if (c.furthestNode < n - 1) c.furthestNode = n - 1
      for (let k = 0; k < n; k++) c.sectorsDone = setBit(c.sectorsDone, k)
      save()
      startDuel(n)
      return S.flow.scene
    }
    /** The rune ceremony a chest may raise (§8.30): is one up, and take it. */
    w.__runeGift = {
      rune: () => runeGift.rune,
      take: () => {
        const had = runeGift.rune
        closeRuneGift()
        return had
      }
    }
    /** Open node `n`'s sector and stop at its waiting gift (the unbox). */
    w.__toInvite = async (n: number) => {
      if (S.campaign.furthestNode < n) S.campaign.furthestNode = n
      S.campaign.sectorsDone = setBit(S.campaign.sectorsDone, n, false)
      openSector(n)
      return until(() => ['invite', 'zoom', 'wipe'].includes(restoreHud.phase))
    }
    /** …then open the gift into the wipe (the pots come after the cleaning
     *  since 2026-09-19). Opens the sector first unless `__toInvite` did. */
    w.__toWipe = async (n: number) => {
      if (restoreHud.phase === 'idle') await (w.__toInvite as (k: number) => Promise<boolean>)(n)
      if (restoreHud.phase === 'invite') openGiftFromUi()
      // A chest that owes a rune raises its ceremony first (§8.30), and holds
      // the game paused behind it: a harness takes the gift and carries on.
      await until(() => runeGift.rune >= 0 || restoreHud.phase === 'wipe', 4000)
      if (runeGift.rune >= 0) closeRuneGift()
      return until(() => restoreHud.phase === 'wipe')
    }
    /** Clear the sector in the wipe, pick the first pot when they rise, and
     *  wait for the admire beat. */
    w.__finishWipe = async () => {
      qaWipe.complete()
      await until(() => restoreHud.phase === 'pots' || restoreHud.phase === 'admire')
      if (restoreHud.phase === 'pots') pickPot(0)
      return until(() => restoreHud.phase === 'admire')
    }
    /** The Twin Gift's press-and-hold, `ms` long: under 1200 ms it pays nothing (§11.5). */
    w.__holdTwinGift = (ms = 1200) => {
      twinHoldStart()
      if (!__twinState().holding) return false
      stepTwin(ms / 1000, [0, 0, 60])
      if (ms >= 1200) stepTwin(0.3, [0, 0, 60])
      twinHoldCancel()
      return true
    }
    w.__campaignPhase = () => S.flow.scene
    /** The page the duel is fought on (§8.29). */
    w.__duelPage = { state: duelPageState }
    /** The first-launch intro (§8.26): its clock, skip, and a replay. */
    w.__intro = {
      state: introState,
      len: INTRO_LEN,
      skip: skipIntro,
      play: () => playIntro(true),
      /** Run the clock `s` seconds on, as frames would (a harness's fast-forward). */
      step: (s: number) => {
        for (let k = 0; k < s; k += 1 / 30) updateIntro(1 / 30)
      },
      /** Skip it if it is up, and wait for the scene after it. */
      pass: async () => {
        if (S.flow.scene === 'intro') skipIntro()
        return until(() => S.flow.scene !== 'intro' && !fading())
      }
    }
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
  syncPokiGameplay(false)
})
</script>

<template lang="pug">
  //- dir="ltr": the world is spatial — Aurora stands on the left and chapter 1
  //- comes first in every locale. Text inside still runs right-to-left.
  div.app-scene(dir="ltr" :class="{ turning: flowHud.turning }")
    //- While cleaning, the sponge IS the cursor: the system arrow is hidden.
    canvas.world(ref="canvas" :class="{ 'tool-cursor': restoreHud.phase === 'wipe' }")
    GameScene(v-if="flowHud.scene === 'duel'" :keyboard="keyboard")
    MapScene(v-else-if="flowHud.scene === 'map'")
    DialogueScene(v-else-if="flowHud.scene === 'dialogue'")
    WardrobeScene(v-else-if="flowHud.scene === 'wardrobe'")
    VersusSetup(v-else-if="flowHud.scene === 'versusSetup'")
    IntroScene(v-else-if="flowHud.scene === 'intro'")
    template(v-if="flowHud.scene === 'unbox' || flowHud.scene === 'wipe'")
      UnboxScene(v-if="flowHud.scene === 'unbox'" @open="openGiftFromUi" @pick="pickPot")
      WipeScene(@back="leaveRestore" @continue="continueRestore")
    SpellBook(v-if="overlayOpen === 'spellbook'" @close="closeOverlay")
    OptionsModal(:is-open="overlayOpen === 'options'" @close="closeOverlay")
    //- A chest has just given a new rune (§8.30): the reveal, and how to draw it.
    RuneGift(v-if="runeGift.rune >= 0" :rune="runeGift.rune" @close="closeRuneGift")
</template>

<style scoped lang="sass">
.app-scene
  position: fixed
  inset: 0
  overflow: hidden
  background: var(--am-surround)
  // Every scene's chrome is DOM over the one canvas, and a page turn swings a
  // picture of the CANVAS away — so the chrome hides for the turn (at once,
  // before the new scene's buttons can flash over the old page) and fades
  // back in as the page lands. The canvas itself is never hidden.
  > *:not(canvas)
    transition: opacity 0.16s ease-out
  &.turning > *:not(canvas)
    opacity: 0
    pointer-events: none
    transition: none

// The canvas takes every stroke, brush and pan; `touch-action: none` or the
// browser steals a touch-drag as a scroll first.
.world
  position: absolute
  left: 0
  top: 0
  &.tool-cursor
    cursor: none
  display: block
  touch-action: none
  user-select: none
  -webkit-user-select: none
  -webkit-touch-callout: none
</style>
