import { prependBaseUrl } from '@/utils/function'

/**
 * ─── Art contract ───────────────────────────────────────────────────────────
 *
 * Auroras Magic draws itself: the duelists are a procedural rig, the fifty
 * sectors are canvas painters, the gifts and tools are small shape functions.
 * That keeps the download tiny, makes the art crisp at any DPR, and means the
 * game is playable the instant the JS parses.
 *
 * Painted art (story-spec §9.11–§9.12, S6) drops in with NO renderer change
 * beyond one probe per seam: `spriteFor()` looks for
 * `public/<ART_FOLDERS[kind]>/<id>.webp` and, if it decodes, the renderer
 * blits it instead of drawing. A missing file simply means "keep drawing it".
 * Every path is catalogued by the manifest in `artSheet.ts`, which is also
 * what exports the reference sheets and the prompts the paintings are made
 * from. The folders are `artFolders.ts` — pure data, shared with the tools.
 *
 * ─── The feature flag ───────────────────────────────────────────────────────
 *
 * Three layers, most specific first:
 *
 *   1. `?art=on` / `?art=off` in the URL — flips it for this device and is
 *      REMEMBERED, so a reload keeps the answer and the param can be dropped.
 *   2. Whatever was remembered from a previous `?art=`.
 *   3. `VITE_ENABLE_ART_OVERRIDES` — the build's default, and the only layer a
 *      portal ever sees.
 *
 * The build default has to stay the floor because a miss is only free for the
 * GAME. CrazyGames' QA console reports every 404 as `Missing resource
 * detected: …/images/sectors/s12.webp`, one line per drawable, which reads as
 * a broken build to a reviewer. So art is shipped off until it is ready, while
 * a URL param still lets it be switched on and — the point of the flag —
 * straight back OFF, live, with no rebuild, when the new art turns out worse
 * than the drawn version.
 *
 * Read as a plain boolean rather than a `ref`: `spriteFor` runs per drawable
 * per frame, and a reactive read in that loop costs dependency tracking for a
 * value that changes when a human clicks something.
 */
import { ART_FOLDERS, type ArtKind } from '@/game/artFolders'
import paintedOnDisk from 'virtual:painted-art'
export { ART_FOLDERS, artTarget, type ArtKind } from '@/game/artFolders'

/**
 * The paintings this BUILD was made with (`paintedArtPlugin`, vite.config.ts),
 * as `images/<folder>/<id>`, or null (dev server, tests): probe everything.
 * A sheet can be registered before it is painted, and a portal's QA console
 * prints every 404, so a build never asks for a file it does not ship.
 */
const PAINTED: ReadonlySet<string> | null = paintedOnDisk ? new Set(paintedOnDisk) : null

/** Does this build ship a painting for `(kind, id)`? Always true with no index. */
export const shipsPainting = (kind: ArtKind, id: string): boolean =>
  !PAINTED || PAINTED.has(`${ART_FOLDERS[kind]}/${id}`)

const BUILD_DEFAULT = import.meta.env.VITE_ENABLE_ART_OVERRIDES === 'true'
const STORAGE_KEY = 'artOverrides'

const readStored = (): boolean | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw === null ? null : !!JSON.parse(raw)
  } catch { return null }
}

const readParam = (): boolean | null => {
  try {
    // The router is on hash history, so a param can arrive in either half of
    // the URL — `?art=on#/` from a typed link, `#/?art=on` from a route push.
    const url = new URL(window.location.href)
    const hashQuery = url.hash.includes('?') ? url.hash.slice(url.hash.indexOf('?') + 1) : ''
    const raw = url.searchParams.get('art') ?? new URLSearchParams(hashQuery).get('art')
    if (raw === null) return null
    return ['1', 'on', 'true', 'yes'].includes(raw.toLowerCase())
  } catch { return null }
}

let enabled = BUILD_DEFAULT
/** Bumped on every explicit refresh, to bust the HTTP cache. See `spriteFor`. */
let probeGeneration = 0

/** `queued`: asked for, waiting for a slot on the wire (see the queue below). */
type ProbeState = 'queued' | 'loading' | 'ready' | 'missing'

interface Probe {
  kind: ArtKind
  id: string
  state: ProbeState
  img: HTMLImageElement | null
  /** Resolves once this probe has decoded or failed. Never rejects. */
  settled: Promise<void>
  /** Settles it: a failure, or a forget while it was still queued. */
  done: () => void
  /** Which lane it waits in, or went out on. */
  lane: FetchPriority
}

const probes = new Map<string, Probe>()

// ─── Repaint notification ───────────────────────────────────────────────────
//
// Probing is ASYNC. `spriteFor` returns null while the image is still in
// flight, so anything that BAKES a decision — the lane tile pattern, the
// backdrop, a tinted smoke sprite, a sliced strip — captures the procedural
// look and keeps it for the life of the page unless it is told otherwise.
// A canvas cannot bind to a value, so it has to be told.

/**
 * WHICH painting changed, or `null` for "assume everything did".
 *
 * A decode names itself. A flag flip and a refresh cannot: the first turns
 * every painting on or off at once and the second re-probes the lot, so both
 * pass `null` and every listener drops everything it holds.
 *
 * The payload is what keeps the first seconds cheap. Without it, each of the
 * ~70 paintings that decode during the opening stage makes every cache in the
 * renderer throw away work built from the other sixty-nine — measured at 670
 * canvases baked during boot against 119 with the art layer off.
 */
export type ArtChange = { kind: ArtKind; id: string } | null

const artListeners = new Set<(change: ArtChange) => void>()

/** Repaint when drop-in art arrives or the flag flips. Returns an unsubscribe.
 *  A listener that ignores its argument keeps the old whole-cache behaviour. */
export const onArtChanged = (fn: (change: ArtChange) => void): (() => void) => {
  artListeners.add(fn)
  return () => { artListeners.delete(fn) }
}

const artChanged = (change: ArtChange = null): void => {
  for (const fn of artListeners) fn(change)
}

/**
 * Forget every probe result.
 *
 * A 404 is remembered FOREVER — that is what stops the renderer re-requesting a
 * file that is not coming. Which is also exactly wrong the moment new art lands
 * on disk: without this, dropping in `grumpling.webp` and flipping the flag
 * would change nothing, because the miss from boot is still cached.
 */
export const refreshArtOverrides = (): void => {
  dropAllProbes()
  probeGeneration++
  artChanged()
}

/** Whether drop-in bitmap art is being looked for right now. */
export const artOverridesEnabled = (): boolean => enabled

/** Where the current answer came from, for diagnostics. */
export const artOverrideSource = (): 'url' | 'stored' | 'build' =>
  readParam() !== null ? 'url' : readStored() !== null ? 'stored' : 'build'

/**
 * Turn drop-in art on or off for this device, live.
 *
 * `remember: false` flips it for the session only — useful for an A/B look
 * without leaving a flag behind on a machine that will later be used to check a
 * portal build.
 */
export const setArtOverrides = (on: boolean, remember = true): boolean => {
  if (remember) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(on)) } catch { /* harmless */ }
  }
  const changed = enabled !== on
  enabled = on
  // Always re-probe on an explicit switch-on, even if the flag was already on:
  // the reason somebody calls this is usually that the files changed.
  if (on) refreshArtOverrides()
  else if (changed) dropAllProbes()
  console.warn(`[art] Painted overrides ${on ? 'ENABLED' : 'DISABLED'}.`)
  artChanged()
  return enabled
}

// Resolve at module load. A `?art=` in the URL is treated as an instruction,
// so it is persisted immediately and the param becomes optional from then on.
if (typeof window !== 'undefined') {
  const fromUrl = readParam()
  const stored = readStored()
  if (fromUrl !== null) {
    enabled = fromUrl
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(fromUrl)) } catch { /* harmless */ }
  } else if (stored !== null) {
    enabled = stored
  }

  // A console handle, so the flag can be worked without a UI. Attached
  // unconditionally because the whole point is to reach it on a built preview
  // — it is three closures over a boolean, not a debug surface worth gating.
  ;(window as unknown as Record<string, unknown>).__art = {
    on: () => setArtOverrides(true),
    off: () => setArtOverrides(false),
    refresh: () => { refreshArtOverrides(); console.warn('[art] probes cleared; art re-reads on next draw.') },
    status: () => ({ enabled, source: artOverrideSource(), probes: probes.size, queue: artQueueStatus() })
  }
}

/**
 * How soon a painting is wanted — which LANE it waits in (`artSchedule.ts`
 * decides; this module only honours it):
 *
 *   high    on screen NOW, or held by the splash. Goes on the wire at once,
 *           uncapped — everything in it is needed for the frame being drawn.
 *   normal  the NEXT screen (the map a win lands on, the cleaning after it).
 *           At most `NORMAL_IN_FLIGHT` at a time, and only while nothing
 *           `high` is waiting or in flight, so it never slows the screen on
 *           show.
 *   low     SOON (the next node, the next chapter). Idle time only, one or two
 *           at a time, and only once nothing more urgent is waiting OR in
 *           flight: a pile of "maybe later" must never share the wire with
 *           something the child is looking at.
 *
 * A draw-time ask (`spriteFor` from a renderer, no lane given) is `high`: the
 * renderer is drawing it right now. An ask in a more urgent lane PROMOTES a
 * painting still waiting in a slower one, so a prefetch can never make a
 * visible painting wait its turn.
 */
export type FetchPriority = 'high' | 'normal' | 'low'

const LANE_RANK: Record<FetchPriority, number> = { high: 0, normal: 1, low: 2 }
/** `normal` fetches allowed on the wire together (with any `high` ones). */
const NORMAL_IN_FLIGHT = 4
/** `low` fetches allowed on the wire together. */
const LOW_IN_FLIGHT = 2

const lanes: Record<FetchPriority, Probe[]> = { high: [], normal: [], low: [] }
const inFlight: Record<FetchPriority, number> = { high: 0, normal: 0, low: 0 }
let idleArmed = false

// ─── The pop-in trace (QA only) ─────────────────────────────────────────────
//
// A painting POPS IN when a renderer asked for it, got null, drew the vectors,
// and then the painting landed — the swap the whole preload exists to hide.
// So the one number worth having per painting is how many DRAW-TIME asks
// missed while it was in flight, next to when it was first asked for, when it
// went on the wire and when it decoded. A prefetch (`artSettled`) is not a
// draw and is not counted as a miss.
//
// Only built when a harness announced itself before boot (`__AM_QA__`, the
// same switch that exposes `__flow`/`__S`), so a player's `spriteFor` pays one
// null check. Read with `__art.trace()`.

interface ArtTrace {
  /** ms since navigation: first draw-time ask, request, decode (−1 = not yet). */
  ask: number
  req: number
  done: number
  ok: boolean
  /** Draw-time asks answered null while the painting was not ready. */
  miss: number
  /** When the last such miss happened. */
  lastMiss: number
  /** The lane it went out on. */
  pri: string
  /** Who created the probe: a renderer drawing it, or a prefetch. */
  by: 'draw' | 'prefetch'
}

const trace: Map<string, ArtTrace> | null =
  typeof window !== 'undefined' && (window as unknown as { __AM_QA__?: boolean }).__AM_QA__ === true
    ? new Map()
    : null
const nowMs = (): number => Math.round(performance.now())
const traceOf = (key: string, draw: boolean): ArtTrace => {
  let t = trace!.get(key)
  if (!t) {
    t = { ask: -1, req: -1, done: -1, ok: false, miss: 0, lastMiss: -1, pri: '', by: draw ? 'draw' : 'prefetch' }
    trace!.set(key, t)
  }
  return t
}
const traceAsk = (key: string, ready: boolean): void => {
  const t = traceOf(key, true)
  if (t.ask < 0) t.ask = nowMs()
  if (!ready) {
    t.miss++
    t.lastMiss = nowMs()
  }
}
if (trace) {
  const w = window as unknown as { __art?: Record<string, unknown> }
  if (w.__art) w.__art.trace = () => Object.fromEntries(trace)
}

// ─── Recording what a drawing asks for ──────────────────────────────────────

/** While set, `spriteFor` only WRITES DOWN what it was asked for. */
let recorder: Set<string> | null = null

/**
 * Which paintings `draw` asks for — without fetching a single one.
 *
 * The schedule's lists are DERIVED rather than written out: a sector's live
 * props, its tap creature and its rescue are whatever its painters ask
 * `spriteFor` for, and a list typed out by hand would go stale the day a kit
 * gains a butterfly. So the painter is run once against a context that draws
 * nothing, every ask is written down, and each one is answered null — which
 * sends the painter down its vector fallback, onto that same nothing.
 *
 * A painter that trips over the dummy context keeps what it had asked for up
 * to that point; a recording is a best effort, and a miss only costs the
 * painting the ordinary lazy fetch.
 */
export const recordArtWants = (draw: () => void): ArtWant[] => {
  const prev = recorder
  const rec = new Set<string>()
  recorder = rec
  try { draw() } catch { /* keep what was recorded before it fell */ } finally { recorder = prev }
  return [...rec].map((k) => {
    const i = k.indexOf('/')
    return [k.slice(0, i) as ArtKind, k.slice(i + 1)] as const
  })
}

/** While above 0, `spriteFor` answers null without fetching: the VECTORS. */
let vectorOnly = 0

/**
 * Run `draw` against the drawings alone — every `spriteFor` inside answers
 * null and fetches nothing — and hand back its result.
 *
 * For MEASURING a drawing (`artItem.itemBox`): the box contract is "the size
 * the drawing was", and a drawing that nests painted parts (a dialogue
 * portrait draws the duelists' rig, whose parts are paintings) was being
 * measured through them. That made the box depend on whether the rig had
 * decoded yet, and it cost the measurement the rig's TINT BAKES — pixel-mask
 * work in colours only the measuring canvas would ever see: ~0.7 s of the
 * first frame once the loading pass had the rig decoded before the duel
 * mounted (profiled, 2026-09-24).
 */
export const withoutArt = <T>(draw: () => T): T => {
  vectorOnly++
  try { return draw() } finally { vectorOnly-- }
}

// ─── The queue ──────────────────────────────────────────────────────────────

/** Run `fn` when the main thread is idle (a frame gap), or soon regardless. */
const whenIdle = (fn: () => void): void => {
  const w = globalThis as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }
  if (typeof w.requestIdleCallback === 'function') w.requestIdleCallback(fn, { timeout: 1500 })
  else setTimeout(fn, 120)
}

const unqueue = (p: Probe): void => {
  const q = lanes[p.lane]
  const i = q.indexOf(p)
  if (i >= 0) q.splice(i, 1)
}

/** Put the next waiting probes on the wire, most urgent lane first. */
const pump = (): void => {
  while (lanes.high.length) start(lanes.high.shift()!)
  // `normal` never shares the line with a `high` fetch: what is on screen (or
  // held by the splash) lands first, whole.
  while (lanes.normal.length && inFlight.high === 0 && inFlight.normal < NORMAL_IN_FLIGHT) start(lanes.normal.shift()!)
  if (
    lanes.low.length && !idleArmed && !lanes.normal.length
    && inFlight.high === 0 && inFlight.normal === 0 && inFlight.low < LOW_IN_FLIGHT
  ) {
    idleArmed = true
    whenIdle(() => {
      idleArmed = false
      // Something more urgent may have arrived while this waited for a gap.
      if (lanes.high.length || lanes.normal.length || inFlight.high || inFlight.normal) return pump()
      const p = lanes.low.shift()
      if (p) start(p)
      pump()
    })
  }
}

/** Fetch and decode one probe. Settles it either way; never throws. */
const start = (p: Probe): void => {
  if (p.state !== 'queued') return
  p.state = 'loading'
  const lane = p.lane
  inFlight[lane]++
  const key = `${p.kind}/${p.id}`
  if (trace) {
    const t = traceOf(key, false)
    t.req = nowMs()
    t.pri = lane
  }
  const img = new Image()
  img.decoding = 'async'
  // The browser's own scheduler gets the same hint. One that does not know
  // the property ignores the assignment.
  if (lane !== 'normal') (img as HTMLImageElement & { fetchPriority?: string }).fetchPriority = lane
  let finished = false
  const finish = (ok: boolean): void => {
    if (finished) return
    finished = true
    inFlight[lane]--
    if (trace) {
      const t = traceOf(key, false)
      t.done = nowMs()
      t.ok = ok
    }
    // A probe dropped while in flight (a refresh, a forget, the flag flipped)
    // has been settled already and replaced; its result is nobody's now.
    if (probes.get(key) === p) {
      if (ok) {
        p.state = 'ready'
        p.img = img
        // The whole point: whoever painted before this arrived gets to
        // repaint — and only what was built from THIS painting, which is why
        // the arrival names itself. See `ArtChange`.
        artChanged({ kind: p.kind, id: p.id })
      } else p.state = 'missing'
    }
    p.done()
    pump()
  }
  img.addEventListener('load', () => {
    // A zero-size decode is as good as missing.
    if (!(img.naturalWidth > 0)) return finish(false)
    // Decoded OFF the main thread before anyone is told it is ready — so the
    // first frame that draws it does not stall decoding a 1152 × 672 page. A
    // browser that cannot `decode()` (or refuses to) just hands it over.
    if (typeof img.decode === 'function') img.decode().then(() => finish(true), () => finish(true))
    else finish(true)
  }, { once: true })
  img.addEventListener('error', () => finish(false), { once: true })
  // The generation suffix only appears AFTER an explicit refresh. A clean
  // load stays cacheable; a re-probe after dropping new files on disk has to
  // defeat the browser cache or the old bitmap comes straight back.
  const bust = probeGeneration > 0 ? `?v=${probeGeneration}` : ''
  img.src = prependBaseUrl(`${ART_FOLDERS[p.kind]}/${p.id}.webp${bust}`)
}

/** Paintings whose DRAW-TIME asks wait in `normal` instead of `high`. */
const heldBack = new Map<string, number>()

/**
 * Let a renderer's ask for `(kind, id)` wait its turn (lane `normal`) instead
 * of jumping the queue, until the returned release is called.
 *
 * For a painting a screen asks for every frame without SHOWING it: the duel
 * paints the cloth under its 16:9 stage, where no letterbox reveals it, and on
 * a slow line that one 187 kB weave went out at `high` beside the splash's own
 * hold. The schedule knows when a screen shows it; the renderer does not.
 */
export const holdBack = (kind: ArtKind, id: string): (() => void) => {
  const key = `${kind}/${id}`
  heldBack.set(key, (heldBack.get(key) ?? 0) + 1)
  let released = false
  return () => {
    if (released) return
    released = true
    const n = (heldBack.get(key) ?? 1) - 1
    if (n > 0) heldBack.set(key, n)
    else heldBack.delete(key)
  }
}

/** The probe for `(kind, id)`, created — or promoted — into `lane`. */
const ensureProbe = (kind: ArtKind, id: string, lane: FetchPriority): Probe => {
  const key = `${kind}/${id}`
  let p = probes.get(key)
  if (p) {
    if (p.state === 'queued' && LANE_RANK[lane] < LANE_RANK[p.lane]) {
      unqueue(p)
      p.lane = lane
      lanes[lane].push(p)
      pump()
    }
    return p
  }
  let done: () => void = () => {}
  const settled = new Promise<void>((r) => { done = r })
  p = { kind, id, state: 'queued', img: null, settled, done, lane }
  probes.set(key, p)
  if (trace) traceOf(key, false)
  // Registered but not painted in THIS build: settled as missing on the spot,
  // with no request, so it never reaches a portal's console as a 404.
  if (!shipsPainting(kind, id)) {
    p.state = 'missing'
    done()
    return p
  }
  lanes[lane].push(p)
  pump()
  return p
}

/** Forget every probe, settling any still waiting so nobody awaits forever. */
function dropAllProbes (): void {
  for (const p of probes.values()) if (p.state === 'queued') p.done()
  lanes.high.length = lanes.normal.length = lanes.low.length = 0
  probes.clear()
}

/**
 * Return a decoded override bitmap for `(kind, id)` or null when none exists.
 * Never throws, never blocks — a missing file simply means "keep drawing it".
 *
 * Probing is lazy and one-shot per id: the first call puts it on the wire (a
 * draw-time ask is `high`: it is on screen now); until (and unless) it
 * decodes, the renderer's procedural path runs. A 404 marks the id as
 * "procedural forever" so it is never re-requested.
 */
export const spriteFor = (
  kind: ArtKind, id: string, priority: FetchPriority = 'high'
): HTMLImageElement | null => {
  // Before the cache, before the `Image` — with the feature off, not one
  // request is made and the renderer simply keeps drawing.
  if (!enabled || vectorOnly > 0) return null
  if (recorder) {
    recorder.add(`${kind}/${id}`)
    return null
  }
  const key = `${kind}/${id}`
  const probe = probes.get(key)
  if (trace) traceAsk(key, probe?.state === 'ready')
  if (probe?.state === 'ready') return probe.img
  if (!probe || probe.state === 'queued') {
    ensureProbe(kind, id, priority === 'high' && heldBack.has(key) ? 'normal' : priority)
  }
  return null
}

/** One bitmap the scene will ask for: a kind and the id it is keyed by. */
export type ArtWant = readonly [ArtKind, string]

/**
 * Start probing `(kind, id)` in `lane` (default `high`) and hand back the
 * promise that settles when it has decoded or failed. Null with overrides off,
 * so a caller can `await` only what it actually asked for. Not a draw: a
 * prefetch never counts as a pop-in in the QA trace.
 */
export const artSettled = (
  kind: ArtKind, id: string, priority: FetchPriority = 'high'
): Promise<void> | null => {
  if (!enabled) return null
  return ensureProbe(kind, id, priority).settled
}

/** Has `(kind, id)` decoded (true), failed (false), or not settled yet (null)? */
export const artState = (kind: ArtKind, id: string): boolean | null => {
  const p = probes.get(`${kind}/${id}`)
  return !p || p.state === 'queued' || p.state === 'loading' ? null : p.state === 'ready'
}

/**
 * Wait for the bitmaps in `wants` to decode, so the splash can hold for them.
 *
 * WHICH bitmaps is the caller's business — `artSchedule` derives each
 * screen's set, and this module stays off that import path on purpose.
 *
 * Without this the art POPS IN: the game starts on the procedural drawing and
 * swaps to paint a second or two later, prop by prop, which reads as the scene
 * glitching rather than as loading. The whole point of the painted art is the
 * first impression, and the first impression was the version without it.
 *
 * Only when overrides are actually on — a portal build with the flag off waits
 * for nothing and requests nothing, exactly as before.
 *
 * Never rejects and never blocks forever: a missing file settles as 'missing'
 * and the procedural path simply keeps drawing.
 */
export const preloadArtOverrides = async (
  wants: ReadonlyArray<ArtWant>,
  onProgress?: (done: number, total: number) => void,
  lane: FetchPriority = 'high'
): Promise<void> => {
  if (!enabled) return
  const jobs: Promise<void>[] = []
  const seen = new Set<string>()
  for (const [kind, id] of wants) {
    if (seen.has(`${kind}/${id}`)) continue
    seen.add(`${kind}/${id}`)
    const p = artSettled(kind, id, lane)
    if (p) jobs.push(p)
  }

  let done = 0
  const total = jobs.length
  onProgress?.(0, total)
  await Promise.allSettled(jobs.map((j) => j.then(() => { onProgress?.(++done, total) })))
}

/**
 * Drop one probe, so its decoded bitmap can be collected. For the full-size
 * sector paintings: the restore view shows one at a time, and fifty decoded
 * 1152 × 672 bitmaps held for the session would be 150 MB. The next ask
 * re-fetches it (from the HTTP cache). A probe still waiting for the wire is
 * taken out of its lane, and settled so nobody waits on it for ever.
 */
export const forgetArt = (kind: ArtKind, id: string): void => {
  const key = `${kind}/${id}`
  const p = probes.get(key)
  if (!p) return
  if (p.state === 'queued') {
    unqueue(p)
    p.done()
  }
  probes.delete(key)
}

/** How many probes have been created — a test seam and a status number. */
export const artProbeCount = (): number => probes.size

/** The queue's shape right now — a test seam and a status number. */
export const artQueueStatus = (): { waiting: Record<FetchPriority, number>; inFlight: Record<FetchPriority, number> } => ({
  waiting: { high: lanes.high.length, normal: lanes.normal.length, low: lanes.low.length },
  inFlight: { ...inFlight }
})
