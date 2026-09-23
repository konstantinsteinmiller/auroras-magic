import { ref, type Ref } from 'vue'

/**
 * ─── `auroras_magic_state` — the single persisted state object ───────────────────────
 *
 * EVERY persisted value Auroras Magic touches — meta progression, the resumable
 * run snapshot, user settings, retention bookkeeping — lives inside ONE
 * in-memory record (`gameState`), and exactly ONE localStorage key is ever
 * written: `auroras_magic_state`.
 *
 * Why one object:
 *   • Non-platform builds → a single localStorage entry, zero pollution.
 *   • Platform builds → `SaveManager` proxies `localStorage.setItem`, so the
 *     cloud payload is literally `{ auroras_magic_state, __save_meta__ }`. One object
 *     round-trips to CrazyGames `sdk.data` / GamePix / Playgama / Yandex /
 *     Glitch instead of dozens of per-key writes.
 *
 * Field names inside the record are catalogued in `src/keys.ts` and are all
 * `am_`-prefixed. They are a contract with the player base: renaming one
 * strands existing players' progress on the old field.
 *
 * Writes are debounced (trailing edge, hard-capped) and hard-flushed on
 * `pagehide` / tab-hide so a close mid-burst never drops data.
 */

export const STATE_KEY = 'auroras_magic_state'

/** Persisted values may be bare strings ("en"), stringified numbers ("120"),
 *  or stringified JSON. JSON.parse round-trips numbers/objects; bare strings
 *  throw, so we fall back to the raw value. Used by the one-shot fold of any
 *  stray individual key into the blob. */
const tryParse = (raw: string): unknown => {
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

const persistRaw = (blob: Record<string, any>): void => {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(blob))
  } catch { /* quota / private mode — in-memory state is still authoritative */ }
}

// ─── Debounced write batching ───────────────────────────────────────────────
// The in-memory update is synchronous (consumers expect the new value to be
// readable immediately), but the actual localStorage persist is coalesced into
// a single trailing-edge write after PERSIST_DEBOUNCE_MS of quiet, with a hard
// cap so a continuous stream (a burst of state writes) still flushes
// roughly every PERSIST_MAX_WAIT_MS.
const PERSIST_DEBOUNCE_MS = 200
const PERSIST_MAX_WAIT_MS = 2500
let persistTimer: ReturnType<typeof setTimeout> | null = null
let firstDirtyAt = 0

/** Force the debounced blob write to happen NOW — cancels the pending timer and
 *  writes `auroras_magic_state` to localStorage synchronously. Called from the
 *  page-hide handlers below and (via `useSaveStatus.flushSaveNow`) at hard
 *  checkpoints (duel ended, rank bought) so the cloud push
 *  starts immediately instead of waiting out the debounce. */
export const flushPersist = (): void => {
  if (persistTimer != null) {
    clearTimeout(persistTimer)
    persistTimer = null
  }
  firstDirtyAt = 0
  persistRaw(gameState.value)
}

const schedulePersist = (): void => {
  const now = Date.now()
  if (firstDirtyAt === 0) firstDirtyAt = now
  if (persistTimer != null) clearTimeout(persistTimer)
  const remaining = PERSIST_MAX_WAIT_MS - (now - firstDirtyAt)
  const delay = Math.max(0, Math.min(PERSIST_DEBOUNCE_MS, remaining))
  persistTimer = setTimeout(() => {
    persistTimer = null
    firstDirtyAt = 0
    persistRaw(gameState.value)
  }, delay)
}

// Not on Playgama. That archive is the YouTube Playables submission, and
// Playables forbids the Page Visibility API and anything "similar" — which
// `pagehide` is — in favour of the SDK's own `onPause`. This module is
// deliberately dependency-free (only `vue`), so it cannot subscribe to the
// pause gate itself; `main.ts` calls the exported `flushPersist()` from its
// `onPauseChange` handler instead, ahead of the SaveManager flush. Losing the
// listeners without that re-hook would mean a debounced write dying with the
// frame, so the two changes belong together.
if (typeof window !== 'undefined' && import.meta.env.VITE_APP_PLAYGAMA !== 'true') {
  const onHide = () => flushPersist()
  window.addEventListener('pagehide', onHide)
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushPersist()
  })
}

const buildInitial = (): Record<string, any> => {
  let blob: Record<string, any> = {}

  // Load the consolidated blob if a previous run (or a cloud hydrate) already
  // wrote it. On platform builds `localStorage.getItem` is the SaveManager
  // proxy at this point, so this read already sees cloud-hydrated data.
  try {
    const raw = localStorage.getItem(STATE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        blob = parsed as Record<string, any>
      }
    }
  } catch { /* corrupt → start fresh */ }

  // Generic fold: if a player somehow has individual `am_*` entries in raw
  // localStorage (defensive per-key write, or a mid-migration snapshot from an
  // older client), fold them into the blob once and remove them. The blob takes
  // precedence when both exist.
  let migrated = false
  try {
    const stragglers: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith('am_')) stragglers.push(k)
    }
    for (const k of stragglers) {
      const raw = localStorage.getItem(k)
      if (raw === null) continue
      if (!(k in blob)) blob[k] = tryParse(raw)
      try { localStorage.removeItem(k) } catch { /* harmless */ }
      migrated = true
    }
  } catch { /* harmless */ }

  if (migrated) persistRaw(blob)
  return blob
}

/** The single in-memory aggregate of all persisted game state.
 *  `Record<string, any>` by design — this is a heterogeneous bag keyed by the
 *  constants in `src/keys.ts`; consumers narrow via `getState<T>()`. */
export const gameState: Ref<Record<string, any>> = ref(buildInitial())

/** Read a value out of the blob. `fallback` is returned when the key is absent.
 *  The type parameter is advisory — the layer does not validate shape. */
export const getState = <T = unknown>(key: string, fallback?: T): T => {
  const v = gameState.value[key]
  return (v === undefined ? fallback : v) as T
}

export const hasState = (key: string): boolean => gameState.value[key] !== undefined

export const setState = (key: string, value: unknown): void => {
  // Replace the record identity so `watch(gameState)` (shallow) fires for every
  // consumer that mirrors a field into its own ref.
  gameState.value = { ...gameState.value, [key]: value }
  schedulePersist()
}

/** Batch-write several fields with ONE reactive identity change and ONE persist
 *  schedule. Used by the run-snapshot writer, which touches half a dozen keys
 *  at each wave boundary and would otherwise fan out six watcher passes. */
export const setStates = (patch: Record<string, unknown>): void => {
  gameState.value = { ...gameState.value, ...patch }
  schedulePersist()
}

export const removeState = (key: string): void => {
  if (gameState.value[key] === undefined) return
  const next = { ...gameState.value }
  delete next[key]
  gameState.value = next
  schedulePersist()
}

/**
 * Replace the WHOLE blob, keeping only the fields named in `keep`.
 *
 * The one writer that can make a field go away. `removeState` deletes one key
 * at a time and `setStates` only ever merges, so neither can express "wipe
 * this save" — and a reset built out of them would leave behind exactly the
 * fields nobody remembered to name, which is the half-reset a player reports
 * as "it kept my runes".
 *
 * Inverted on purpose: an ALLOW-list of what survives, so a field added to
 * `keys.ts` next month is wiped by a reset by default. A deny-list would keep
 * it, silently, and nothing would fail.
 *
 * Persists immediately rather than on the debounce — the caller's next move is
 * a flush and a reload, and a 200 ms timer does not survive either.
 */
export const replaceGameState = (keep: readonly string[] = []): void => {
  const next: Record<string, any> = {}
  for (const k of keep) if (gameState.value[k] !== undefined) next[k] = gameState.value[k]
  gameState.value = next
  flushPersist()
}

/** Re-read from localStorage. Called by the SaveManager hydrate bridge
 *  (`useSaveStatus.bumpSaveDataVersion`) so cloud-sourced updates land
 *  in-memory BEFORE any composable's `saveDataVersion` watcher re-reads its
 *  keys — the ordering is load-bearing for correct hydration. */
export const reloadGameState = (): void => {
  gameState.value = buildInitial()
}

/** Test-only: wipe both the in-memory blob and the persisted entry. */
export const __resetGameState = (): void => {
  gameState.value = {}
  try { localStorage.removeItem(STATE_KEY) } catch { /* harmless */ }
}
