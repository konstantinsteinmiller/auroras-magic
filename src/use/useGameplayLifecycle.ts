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
// The scene union is restated rather than imported from the flow module on
// purpose: a platform-contract module must not drag the simulation into
// anything that imports it.
export type LiveScene =
  | 'boot' | 'intro' | 'map' | 'dialogue' | 'duel' | 'unbox' | 'wipe' | 'wardrobe' | 'versusSetup'

export interface GameplayLiveInputs {
  /** Which scene the one canvas is showing (story-spec §4.1.1). */
  scene: LiveScene
  /**
   * The duel's own state machine is mid-fight (`S.phase === PH_DUEL`). False
   * from the instant a duelist falls — the whole win flourish and loss sting
   * are NOT live, even though the scene is still `duel` while they play
   * (§4.9.1, §11.2). Meaningless outside `duel`; always supplied.
   */
  duelPhaseIsLive: boolean
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
  // Two scenes are play: a duel while it is being fought, and a wipe — the
  // player is working the brush, and the wipe's own ~1–2 s reveal tail stays
  // inside the same span rather than flickering the bracket (§11.2). The gift,
  // the pots and the restored sector at rest are not play.
  ((i.scene === 'duel' && i.duelPhaseIsLive) || i.scene === 'wipe')
  && !i.showResult
  && !i.anyModalOpen
  && !i.adShowing
  && !i.visibilityHidden
  && !i.platformPaused
  && !i.awaitingInput

// ─── Poki: the storybook is the game (owner, 2026-09-23) ────────────────────
//
// On Poki the bracket is NOT the narrow rule above. The map is a storybook the
// player turns and plays with, not a level select; the dialogue, the picture
// book, the gift, the cleaning, dressing Aurora in the tent and the sticker
// album (and the bath time to come) are all the game. Closing the bracket every
// time a duel ended told Poki the player had left the game while she was still
// in it. So on Poki the bracket stays open across every scene and closes only
// for:
//
//   • a MENU — the settings, the spellbook, any FModal (`menuOpen`). A
//     modal that is part of the story, like the rune-gift ceremony, is not one;
//   • an AD — `adShowing` still pauses the game and silences it, exactly as
//     before, and the stop reaches the SDK before `commercialBreak` does,
//     because `useAds` raises the flag before it calls the provider and the
//     bracket watches it synchronously;
//   • the tab hidden or the portal paused — nobody is playing a page nobody
//     can see, and `gameplayStart()` holds a screen wake lock;
//   • no touch yet — Poki rejects a `gameplayStart()` nobody asked for, and
//     conversion-to-play is measured on the first one.
//
// CrazyGames and Playgama keep `isGameplayLive`: that ruling was Poki's.

export interface PokiLiveInputs {
  scene: LiveScene
  /** Settings, the spellbook or another FModal menu is open. */
  menuOpen: boolean
  adShowing: boolean
  visibilityHidden: boolean
  platformPaused: boolean
  awaitingInput: boolean
}

/** Is the player in the game, as Poki counts it? */
export const isPokiGameplayLive = (i: PokiLiveInputs): boolean =>
  i.scene !== 'boot'
  && !i.menuOpen
  && !i.adShowing
  && !i.visibilityHidden
  && !i.platformPaused
  && !i.awaitingInput

/** Report Poki's bracket. A no-op on every other build; idempotent on Poki,
 *  where `pokiGameplayStart/Stop` collapse repeats and defer a start that lands
 *  inside the SDK's 50 ms window. */
export const syncPokiGameplay = (live: boolean): void => {
  if (import.meta.env.VITE_APP_POKI !== 'true') return
  if (live) pokiGameplayStart()
  else pokiGameplayStop()
}

/**
 * Report whether gameplay is live — the narrow rule, for CrazyGames and
 * Playgama. Idempotent on every platform: each portal arm collapses a repeat
 * of the state it is already in, so callers may fire it as often as their
 * reactive source changes. Poki is told separately (`syncPokiGameplay`).
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
 * A new play began while the player never stopped playing. The narrow arms
 * only: Poki's bracket spans the whole storybook, so there is no play there to
 * hand over — and a gratuitous stop/start pair is exactly its bad event.
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
