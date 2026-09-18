// ─── Gameplay-bracket fan-out ───────────────────────────────────────────────
//
// One place that answers "is the player actually playing right now?" for every
// portal that wants to know. `GameScene.vue` reports the boolean; this module
// decides which SDK events that becomes, because WHICH events to send is a
// platform contract and not a view concern.
//
// ⚠️ PLAYGAMA is loaded the way every other call site loads it — a DYNAMIC
// import behind the env flag (`main.ts`, `FLogoProgress.vue`). It has no alias
// stub, so a static import here would pull its SDK loader into every other
// portal's bundle. That makes its two calls asynchronous, so they are chained
// on one promise: a handover's stop→start must reach the bridge in that order,
// and by the time anyone is playing the module is already in the registry from
// boot, so the chain resolves on the next microtask.
//
// ⚠️ POKI: the caller drives this from `watch(isLiveGameplay, …)`, and
// `isLiveGameplay` is a computed over five reactive inputs — so a modal closing
// in the same tick an ad opens emits a stop→start pair microseconds apart. On
// CrazyGames that is merely noisy. On Poki it is monetization-fatal: the core
// SDK counts a `gameplayStart()` landing within 50 ms of the preceding
// `gameplayStop()` as a "bad event", and at 10 of them `gameplayStart`,
// `gameplayStop` AND `commercialBreak` all become no-ops for the rest of the
// session, reported only through a debug log line. `pokiGameplayStart/Stop`
// collapse duplicate consecutive events and defer (never drop) a start that
// lands inside the guard window, which is what makes this call site safe.
//
// The import is STATIC on purpose: this file is not in the obfuscator's exclude
// list, so a dynamic `'@/…'` literal would be at the mercy of the `stringArray`
// rewrite. The PokiSDK URL is kept out of every other platform's bundle by the
// `resolve.alias` stub swap in `vite.config.ts`, not by the env-literal gate
// below — see `pokiPlugin.stub.ts` for why the gate alone is not enough.

import { syncGameplayLifecycle as syncCrazyGameplay } from '@/use/useCrazyGames'
import { pokiGameplayStart, pokiGameplayStop } from '@/utils/pokiPlugin'

// ─── What counts as live gameplay ───────────────────────────────────────────
//
// The RULE lives here, next to the platforms it is a contract with; the scene
// owns only the reactive wiring that feeds it. Pure and total, so the contract
// can be asserted without mounting a canvas.
//
// The phase union is restated rather than imported from the duel on purpose: a
// platform-contract module must not drag the simulation into anything that
// imports it.
export interface GameplayLiveInputs {
  /** The duel's own state machine: 'duel' while a duel is being fought,
   *  'result' from the moment one duelist falls. */
  phase: 'duel' | 'result'
  /** The result panel is up — the duel is over and a decision is pending. */
  showResult: boolean
  /** Any blocking modal (options, spellbook). */
  anyModalOpen: boolean
  /** A rewarded / interstitial ad is on screen. */
  adShowing: boolean
  /** `document.visibilityState === 'hidden'` — the player switched away. */
  visibilityHidden: boolean
  /** The portal's SDK asked us to pause (its own overlay, chrome, ad frame). */
  platformPaused: boolean
  /**
   * No trusted player input yet this session. The duel boots straight into
   * the arena (no main menu), so without this the first `gameplayStart()`
   * would fire during mount with nobody at the controls — a named Poki QA
   * rejection, and a start that inflates every portal's conversion-to-play.
   * The world idles and the foe holds her first rune until the first touch.
   */
  awaitingInput: boolean
}

/**
 * Is the player actually playing right now?
 *
 * Every input is a reason gameplay is NOT live, and each one is a real
 * requirement rather than a nicety:
 *
 *   • `visibilityHidden` / `platformPaused` already halt the simulation (they
 *     OR into `isGamePaused`), but halting the sim and TELLING the portal are
 *     two different things — without them a tab switch left an open gameplay
 *     bracket, and Poki held the screen wake lock `gameplayStart()` takes on a
 *     page nobody was looking at.
 *   • `awaitingInput` — reporting a start for a duel the player has not begun
 *     is the kind of thing portal moderation rejects.
 */
export const isGameplayLive = (i: GameplayLiveInputs): boolean =>
  i.phase === 'duel'
  && !i.showResult
  && !i.anyModalOpen
  && !i.adShowing
  && !i.visibilityHidden
  && !i.platformPaused
  && !i.awaitingInput

/**
 * Report whether gameplay is live. Idempotent on every platform: each portal
 * arm collapses a repeat of the state it is already in, so callers may fire it
 * as often as their reactive source changes.
 */
/**
 * What the portals were last TOLD — not what the game is doing.
 *
 * `restartGameplayBracket` needs to know whether a play is still open from the
 * portals' point of view, and the scene's own flag cannot answer that: during a
 * handover it reads false for the single tick `phase` spends on 'clear', which
 * no watcher ever observes.
 */
let reported = false

export const syncGameplayLifecycle = (live: boolean): void => {
  reported = live
  syncCrazyGameplay(live)

  if (import.meta.env.VITE_APP_POKI === 'true') {
    if (live) pokiGameplayStart()
    else pokiGameplayStop()
  }

  syncPlaygamaGameplay(live)
}

/**
 * Playgama's half of the fan-out, in order.
 *
 * Its certification asks for `gameplay_started` / `gameplay_stopped` around
 * play, and until now nothing in the game called either: the two functions sat
 * in `playgamaPlugin` unused, so that portal saw a session with no plays in it.
 *
 * Every call is appended to one promise chain rather than fired as it resolves,
 * because a stop and the start after it would otherwise race — and a start that
 * overtook its stop would leave the bridge believing the first play never
 * ended. The plugin's own pair is idempotent, so a repeat of the state it is
 * already in costs nothing.
 */
let playgamaChain: Promise<void> = Promise.resolve()

const syncPlaygamaGameplay = (live: boolean): void => {
  if (import.meta.env.VITE_APP_PLAYGAMA !== 'true') return
  playgamaChain = playgamaChain
    .then(async () => {
      const m = await import('@/utils/playgamaPlugin')
      if (live) m.playgamaGameplayStart()
      else m.playgamaGameplayStop()
    })
    // A portal SDK that throws must never break the bracket for the others, and
    // must never poison the chain for the next duel either.
    .catch((e) => { console.warn('[playgama] gameplay signal failed', e) })
}

/** Test seam: settle the asynchronous arms. */
export const __gameplayFanoutIdle = (): Promise<void> => playgamaChain

/**
 * A new play began while the player never stopped playing.
 *
 * Nothing watching the live flag can see a handover that happens inside one
 * tick (it reads true on both sides), so such a handover says it by hand:
 * close the bracket, open the next. Every arm takes an immediate pair safely —
 * CrazyGames' start/stop are idempotent off a flag, and `pokiGameplayStart`
 * DEFERS (never drops) a start landing inside the SDK's 50 ms guard window.
 *
 * The duel always passes through its result panel between plays, so the live
 * flag itself closes and reopens the bracket; this stays for any future mode
 * that chains plays without a screen in between.
 */
export const restartGameplayBracket = (): void => {
  // Already closed — a result screen, a reveal, an ad or a hidden tab ended the
  // play, and the flag that closed it will open the next one.
  if (!reported) return
  syncGameplayLifecycle(false)
  syncGameplayLifecycle(true)
}

/** Test seam: forget what the portals were told. */
export const __resetGameplayBracket = (): void => { reported = false }
