// ─── Analytics — the funnel the portal bracket cannot see ───────────────────
//
// `useGameplayLifecycle` tells every portal HOW LONG and HOW OFTEN somebody
// played. It cannot tell anyone WHERE they stopped, and "where" is the question
// a retention pass asks: a player who never stores a first rune and one who
// quits on the third rung are two different problems.
//
// So this module owns a second, finer signal. Five events, named once here and
// nowhere else:
//
//   first_rune    the first rune a session stored      { onboarding }
//   duel_start    a duel opened                        { foe, wins, losses }
//   duel_end      a duel ended                         { foe, won, durationMs }
//   rank_buy      an element rank was bought           { rune, rank, cost }
//   reward_claim  a rewarded ad paid out               { kind, coins }
//
// ─── What happens to an event ───────────────────────────────────────────────
//
// Two sinks, and NEITHER of them is allowed to be load-bearing:
//
//   1. THE RING. The last `RING` events are kept in memory and readable through
//      `analyticsLog()` — and, in debug, through `window.__analytics`. That is
//      what makes the wiring testable and what a QA session actually reads on a
//      device. It dies with the tab, on purpose: this game stores no telemetry
//      about anybody.
//   2. THE PORTAL. Whichever host page offers a generic event sink gets a copy.
//      Portals differ wildly here — most of the SDKs we ship against have no
//      custom-event API at all — so the fan-out PROBES rather than assumes, the
//      same way `gamepixPlugin` probes for `happytime`/`happyMoment`. A portal
//      with nothing to call is a silent no-op, which is the correct behaviour
//      and not a failure worth logging.
//
// ⚠️ No SDK module is imported here, and none should be. Every portal plugin in
// this project is either statically bundled behind an alias stub or dynamically
// imported behind its env flag; an import here would pull one portal's loader
// into every other portal's bundle for the sake of a probe that reads a global
// anyway. `window` is the only surface the probe touches — and the probe now
// lives in its own module (`@/use/analyticsSink`) so that the ONE build which
// may not have a sink at all, Playgama/YouTube Playables, can alias it away
// entirely rather than carrying four dead SDK names in its string table.
//
// ⚠️ Never call this from inside the frame loop for anything that happens per
// frame or per particle — every event above fires a handful of times a duel.

import { probeSink, type Sink } from '@/use/analyticsSink'

export type AnalyticsEvent =
  | 'duel_start'
  | 'duel_end'
  | 'first_rune'
  | 'rank_buy'
  | 'reward_claim'

export type AnalyticsValue = string | number | boolean
export type AnalyticsProps = Record<string, AnalyticsValue | undefined>

export interface AnalyticsRecord {
  event: AnalyticsEvent
  props: Record<string, AnalyticsValue>
  /** ms since page load — a clock the player's timezone cannot identify them by. */
  at: number
}

/** How many events are kept for `analyticsLog()`. A long session of duels
 *  emits well under this, so a whole session is readable at the end of it. */
export const RING = 256

const ring: AnalyticsRecord[] = []

/**
 * Tidy one property bag into something every sink can take.
 *
 * Portal event APIs are wildly inconsistent about what they accept, and the one
 * thing they all dislike is a float with seventeen digits in it. So: `undefined`
 * is dropped (a caller writing `cause: maybeCause` should not produce a key with
 * no value), non-finite numbers are dropped rather than sent as `NaN`, floats
 * are rounded to three places, and strings are capped — a stray long string in
 * an event bag is always a bug, never data worth keeping.
 *
 * Pure, so the wiring can be asserted without a browser.
 */
export const normaliseProps = (props?: AnalyticsProps): Record<string, AnalyticsValue> => {
  const out: Record<string, AnalyticsValue> = {}
  if (!props) return out
  for (const key of Object.keys(props)) {
    const v = props[key]
    if (v === undefined) continue
    if (typeof v === 'number') {
      if (!Number.isFinite(v)) continue
      out[key] = Number.isInteger(v) ? v : Math.round(v * 1000) / 1000
      continue
    }
    if (typeof v === 'string') { out[key] = v.slice(0, 64); continue }
    out[key] = v
  }
  return out
}

// ─── The portal sink ────────────────────────────────────────────────────────
//
// Probed once and cached, because the answer cannot change after boot and the
// probe walks four globals. `null` means "asked, nobody was listening" and is a
// perfectly ordinary result — most portals we ship to have no event API.
//
// The probe itself lives in `@/use/analyticsSink` so the Playgama build can
// alias the whole module away (`analyticsSink.stub.ts`) — see the note there.
// It names other portals' SDK globals plus `gtag`, and that archive is also
// the YouTube Playables submission, where those are exactly what a reviewer
// greps for.

let sink: Sink | null | undefined

/**
 * Record one event.
 *
 * Total and non-throwing by contract: this sits on the duel boundary, and an
 * analytics call that can throw is an analytics call that can end a duel. Every
 * sink is wrapped, and a sink that throws is dropped for the rest of the
 * session rather than retried on every event.
 */
export const track = (event: AnalyticsEvent, props?: AnalyticsProps): void => {
  const clean = normaliseProps(props)
  const at = typeof performance !== 'undefined' ? Math.round(performance.now()) : 0

  ring.push({ event, props: clean, at })
  if (ring.length > RING) ring.splice(0, ring.length - RING)

  if (sink === undefined) sink = probeSink()
  if (!sink) return
  try { sink(event, clean) }
  catch (e) {
    sink = null
    console.warn('[analytics] portal sink threw; disabled for this session', e)
  }
}

/** Everything recorded this session, oldest first. QA + specs read this. */
export const analyticsLog = (): readonly AnalyticsRecord[] => ring

/** Test seam: empty the ring and re-probe the sink. */
export const __resetAnalytics = (): void => {
  ring.length = 0
  sink = undefined
}

/**
 * Publish the log for a device session.
 *
 * Debug only — the only way to read the funnel back on a device under test.
 * Called once from the scene's boot.
 */
export const exposeAnalytics = (): void => {
  if (typeof window === 'undefined') return
  ;(window as any).__analytics = analyticsLog
}
