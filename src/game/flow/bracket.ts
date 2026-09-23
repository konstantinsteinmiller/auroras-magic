/**
 * flow/bracket.ts — the gameplay bracket, driven from the FSM (§4.9.2, M12).
 *
 * One memoised reconciler, called synchronously by every place that changes
 * one of `isGameplayLive`'s inputs: the scene switch, an overlay, arming, a
 * duel ending or starting, the result panel. It reports to the portals ONLY
 * when the answer actually changes — never through a `watch` on a computed,
 * whose scheduler can surface an intermediate value (a stop→start pair a few
 * microseconds apart is monetization-fatal on Poki's 50 ms guard).
 *
 * TWO brackets come out of it (owner, 2026-09-23). CrazyGames and Playgama are
 * told the narrow one — live while a duel is fought or a sector wiped. Poki is
 * told the storybook-wide one — live everywhere past the boot, closed only by a
 * menu (settings, spellbook), an ad, a hidden tab, a portal pause,
 * or no touch yet (`isPokiGameplayLive`). Each is memoised on its own.
 *
 * The platform-side inputs (an ad, a hidden tab, a portal pause, a modal) are
 * refs owned by platform modules that must not import game code; they are
 * observed here with SYNCHRONOUS watchers on the raw refs, which run the same
 * reconciler at the moment of the mutation — the call-site contract, without
 * the platform layer reaching into the game.
 */
import { watch } from 'vue'
import { S } from '@/game/duel/state'
import { PH_DUEL } from '@/game/duel/config'
import { isGameplayLive, isPokiGameplayLive, syncGameplayLifecycle, syncPokiGameplay } from '@/use/useGameplayLifecycle'
import { isAdShowing, isVisibilityHidden, isPlatformPaused } from '@/use/useGamePause'
import { isAnyModalOpen, isMenuOpen } from '@/use/useModalState'

let lastReported: boolean | null = null
let lastPoki: boolean | null = null

export const reconcileGameplayBracket = (): void => {
  const poki = isPokiGameplayLive({
    scene: S.flow.scene,
    // The spellbook and settings are overlays; any FModal is a menu too.
    menuOpen: S.flow.overlay !== null || isMenuOpen.value || !!S.book,
    adShowing: isAdShowing.value,
    visibilityHidden: isVisibilityHidden.value,
    platformPaused: isPlatformPaused.value,
    awaitingInput: !S.flow.armed
  })
  if (poki !== lastPoki) {
    lastPoki = poki
    syncPokiGameplay(poki)
  }
  const live = isGameplayLive({
    scene: S.flow.scene,
    duelPhaseIsLive: S.phase === PH_DUEL,
    showResult: S.resultUp,
    anyModalOpen: isAnyModalOpen.value || S.flow.overlay !== null || !!S.book,
    adShowing: isAdShowing.value,
    visibilityHidden: isVisibilityHidden.value,
    platformPaused: isPlatformPaused.value,
    awaitingInput: !S.flow.armed
  })
  if (live === lastReported) return
  lastReported = live
  syncGameplayLifecycle(live)
}

let installed = false
/** Observe the platform-owned inputs. Called once by the app root. */
export const installGameplayBracket = (): (() => void) => {
  if (installed) return () => {}
  installed = true
  const stop = watch([isAdShowing, isVisibilityHidden, isPlatformPaused, isAnyModalOpen, isMenuOpen], reconcileGameplayBracket, { flush: 'sync' })
  reconcileGameplayBracket()
  return () => {
    stop()
    installed = false
  }
}

/** What the bracket last told the portals (tests, QA). */
export const bracketLive = (): boolean => lastReported === true

/** What Poki was last told (tests, QA). */
export const pokiBracketLive = (): boolean => lastPoki === true

/** Test seam: forget the last report. */
export const __resetBracket = (): void => {
  lastReported = null
  lastPoki = null
}
