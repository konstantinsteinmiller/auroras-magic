import { ref } from 'vue'
import { prependBaseUrl } from '@/utils/function'

// Auroras Magic ships NO gameplay bitmaps and NO audio files: the arena, the
// duelists, every spell and the whole score are drawn and synthesised from
// code. So "loading" is the JS parse plus the one procedural bake worth doing
// behind the splash (the island + cloud band, see `game/duel/arena.ts`). The
// rest of this module is the shared audio plumbing every platform gate drives.

const loadingProgress = ref(100)
const areAllAssetsLoaded = ref(true)

export const resourceCache = {
  images: new Map<string, HTMLImageElement>(),
  audio: new Map<string, HTMLAudioElement>(),
  audioBuffers: new Map<string, AudioBuffer>()
}

let sharedAudioCtx: AudioContext | null = null
let resumeListenerArmed = false
/** Counts every active reason the audio layer should be globally
 *  silent. The single driver is now `useGamePauseAudio`, which holds one
 *  slot for the whole `isGamePaused` gate (ad mid-show, tab hidden,
 *  platform SDK pause, app modal). Each `suspendAllAudio()` increments,
 *  each `resumeAllAudio()` decrements; the AudioContext only resumes when
 *  the counter hits 0 — so an overlapping suspend (e.g. modal opened
 *  during an ad) can never re-unmute early. */
let suspendDepth = 0

export const getAudioContext = (): AudioContext | null => {
  if (sharedAudioCtx) return sharedAudioCtx
  const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext
  if (!Ctor) return null
  try {
    sharedAudioCtx = new Ctor() as AudioContext
  } catch {
    return null
  }
  // Born into an already-suspended world. A context constructed on a page that
  // has seen a user gesture starts `running`, so one created AFTER a mute has
  // landed (a portal `soundOff` at boot, a tab hidden before the first sound, an
  // ad opening before any SFX has played) would come up audible underneath it —
  // `suspendAllAudio` had already run and had nothing to suspend. The depth
  // counter is the honest record of whether anything wants silence right now.
  if (suspendDepth > 0) {
    try { void sharedAudioCtx.suspend() } catch { /* older impls */ }
  }
  armResumeOnGesture()
  return sharedAudioCtx
}

/** True while engine audio is globally suspended (an ad is on-screen, the
 *  tab is hidden, etc.). SFX entry points (`useSound`) read this to refuse
 *  starting a new one-shot during an ad — so nothing leaks past the mute. */
export const isAudioSuspended = (): boolean => suspendDepth > 0

const armResumeOnGesture = (): void => {
  if (resumeListenerArmed) return
  resumeListenerArmed = true
  const resume = () => {
    if (sharedAudioCtx && sharedAudioCtx.state === 'suspended' && suspendDepth === 0) {
      void sharedAudioCtx.resume()
    }
  }
  window.addEventListener('pointerdown', resume, { once: true })
  window.addEventListener('keydown', resume, { once: true })
}

/** Bookkeeping for HTMLAudio elements (music, fallback SFX path) so
 *  the suspend/resume helpers can pause + restart them alongside the
 *  Web Audio context. Loops register on creation in useSound. */
const trackedAudioElements = new Set<HTMLAudioElement>()
const pausedByGlobalSuspend = new WeakSet<HTMLAudioElement>()

export const registerHtmlAudio = (el: HTMLAudioElement) => {
  trackedAudioElements.add(el)
}
export const unregisterHtmlAudio = (el: HTMLAudioElement) => {
  trackedAudioElements.delete(el)
  pausedByGlobalSuspend.delete(el)
}

/** Suspend all engine audio — Web Audio context goes to `suspended`
 *  and any registered HTMLAudio element is paused (and remembered so a
 *  later resume can restart only the ones we actually paused). Stacks:
 *  multiple `suspendAllAudio()` calls require matching `resume` calls
 *  before audio plays again. */
export const suspendAllAudio = (): void => {
  suspendDepth += 1
  if (sharedAudioCtx && sharedAudioCtx.state === 'running') {
    void sharedAudioCtx.suspend()
  }
  for (const el of trackedAudioElements) {
    if (!el.paused) {
      pausedByGlobalSuspend.add(el)
      try { el.pause() } catch { /* ignore */ }
    }
  }
}

export const resumeAllAudio = (): void => {
  suspendDepth = Math.max(0, suspendDepth - 1)
  if (suspendDepth > 0) return
  if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
    void sharedAudioCtx.resume()
  }
  for (const el of trackedAudioElements) {
    if (pausedByGlobalSuspend.has(el)) {
      pausedByGlobalSuspend.delete(el)
      void el.play().catch(() => { /* autoplay blocked / element gone */ })
    }
  }
}

// ─── Active one-shot SFX registry ─────────────────────────────────────────
// Transient one-shot voices (every note the duel's synth plays) live on the
// shared AudioContext and aren't HTMLAudio elements, so the suspend gate only
// FREEZES them via `ctx.suspend()`. On an early gate-drop they'd resume and
// tail audibly under an ad. We track them so an ad can hard-STOP them outright.
const activeOneShotSources = new Set<AudioScheduledSourceNode>()

/** Register a one-shot Web Audio source (a buffer OR an oscillator — the
 *  duel's synth voices are both) so `killOneShotSfx()` can stop it.
 *  Auto-removes itself when the source finishes. */
export const registerOneShotSource = (source: AudioScheduledSourceNode): void => {
  activeOneShotSources.add(source)
  source.addEventListener('ended', () => activeOneShotSources.delete(source), { once: true })
}

/**
 * Hard-stop EVERY in-flight one-shot SFX so nothing tails into an ad — called
 * right before an interstitial / rewarded ad is requested. Covers:
 *   • Web Audio one-shots  (stopped outright), and
 *   • non-looping tracked HTMLAudio (the decode-fallback one-shots) — paused
 *     AND dropped from the auto-resume set so the gate's resume can't restart
 *     them under or after the ad.
 * Intentionally leaves the bg music (HTMLAudio with `loop=true` → owned by
 * `forceStopMusic`) and the gameplay Web Audio LOOP (owned by the scene's
 * pause watcher) alone, so each is restored by its proper lifecycle.
 */
export const killOneShotSfx = (): void => {
  for (const s of [...activeOneShotSources]) {
    try { s.stop() } catch { /* already ended */ }
    activeOneShotSources.delete(s)
  }
  for (const el of trackedAudioElements) {
    if (el.loop) continue // bg music — forceStopMusic owns its stop/restart
    pausedByGlobalSuspend.delete(el)
    if (!el.paused) { try { el.pause() } catch { /* ignore */ } }
  }
}

// Visibility-driven suspend used to live here (`armVisibilitySuspend`). It
// moved into the unified pause gate: `useGamePause` owns the
// `visibilitychange` listener (flipping `isVisibilityHidden`) and
// `useGamePauseAudio` suspends/resumes audio off that gate for ALL builds —
// so there is one suspend driver instead of two overlapping ones.

// Debug snapshot of the live audio state, so a browser harness can assert "no
// sound during the interstitial". Reads the module-private AudioContext and
// registries that aren't otherwise observable from the page. Paired with
// `window.__audioDebug` in `useAds.ts`.
export const __audioDebugSnapshot = () => ({
  audioCtxState: sharedAudioCtx ? sharedAudioCtx.state : 'none',
  suspendDepth,
  trackedAudioCount: trackedAudioElements.size,
  trackedAudioPaused: [...trackedAudioElements].map((e) => e.paused),
  anyTrackedAudioPlaying: [...trackedAudioElements].some((e) => !e.paused),
  activeOneShotSfx: activeOneShotSources.size
})

/** Decode-once image cache (the painted-art drop-in layer uses it). */
export const getCachedImage = (src: string): HTMLImageElement => {
  const prefixed = prependBaseUrl(src)
  const existing = resourceCache.images.get(prefixed)
  if (existing) return existing
  const img = new Image()
  img.src = prefixed
  resourceCache.images.set(prefixed, img)
  return img
}

/** Upper bound on the loader's wait. The bake is milliseconds; a device that
 *  cannot finish it in this long gets the game anyway and bakes on frame one. */
const PRELOAD_CAP_MS = 4000

export default () => {
  const preloadAssets = async (): Promise<void> => {
    loadingProgress.value = 0
    areAllAssetsLoaded.value = false

    // ── The procedural bake, primed FROM THE LOADER ──
    //
    // The arena's island and cloud band are rasterised once into offscreen
    // canvases. No network waterfall covers them, so without this the splash
    // would clear on "done" and the first duel frame would pay for the bake.
    // Primed here rather than from the draw loop, because the draw loop does
    // not run until the scene mounts. Reached through a DYNAMIC import so the
    // duel's modules stay out of the eager chunk.
    const bake = (async () => {
      try {
        const [{ applyLayout }, { primeArena }] = await Promise.all([
          import('@/game/duel/layout'),
          import('@/game/duel/arena')
        ])
        loadingProgress.value = 50
        applyLayout(window.innerWidth, window.innerHeight, Math.min(window.devicePixelRatio || 1, 2))
        primeArena()
      } catch (e) {
        console.warn('[assets] arena bake failed; the scene will bake on its first frame', e)
      }
    })()
    // ── The paintings the first screens draw (S6), when the art layer is on ──
    //
    // A no-op on every build until paintings exist (the layer is off by
    // default). Dynamic, like the bake, so the art modules stay out of the
    // eager chunk.
    const art = (async () => {
      try {
        // Read from the save itself: the scene may not have loaded it yet, and
        // a first-time player's intro pages are the very first paintings drawn.
        const [{ preloadFirstArt }, { readCampaign }, { getState }, { CAMPAIGN_KEY }] = await Promise.all([
          import('@/game/artPreload'),
          import('@/game/campaign/state'),
          import('@/use/useGameState'),
          import('@/keys')
        ])
        const cs = readCampaign(getState<unknown>(CAMPAIGN_KEY, null))
        await preloadFirstArt(cs.furthestNode, cs.introSeen)
      } catch (e) {
        console.warn('[assets] painted-art preload failed; the drawings stand in', e)
      }
    })()
    await Promise.race([Promise.all([bake, art]), new Promise<void>((r) => setTimeout(r, PRELOAD_CAP_MS))])

    loadingProgress.value = 100
    areAllAssetsLoaded.value = true
  }

  return {
    loadingProgress,
    areAllAssetsLoaded,
    preloadAssets,
    resourceCache
  }
}
