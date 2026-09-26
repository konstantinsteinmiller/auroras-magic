// ─── Analytics — the funnel the portal bracket cannot see ───────────────────
//
// `useGameplayLifecycle` tells every portal HOW LONG and HOW OFTEN somebody
// played. It cannot tell anyone WHERE they stopped, and "where" is the question
// a retention pass asks: a player who never stores a first rune and one who
// quits on the third rung are two different problems.
//
// So this module owns a second, finer signal. The events, named once here and
// nowhere else:
//
//   first_rune    the first rune a session stored      { onboarding }
//   duel_start    a duel opened                        { nodeId, foe, … }
//   duel_end      a duel ended                         { foe, won, durationMs }
//   duel_abandon  the player left a duel mid-fight     { nodeId, wasReplay }
//   reward_claim  the Twin Gift paid a bloom (D3)      { sectorId, kind: 'bloom' }
//   recognition_attempt  one finished rune stroke       { success, rune, ec, turn, margin, sample }
//                 (story-spec §5.16 / §7.13; see `trackRecognition` for its sampling)
//   wipe_start / wipe_complete / wipe_interrupted, spell_discovered,
//   ad_interstitial_shown — the story's own (§7.13).
//
// (`rank_buy` went with the element ranks, D3.)
//
// ─── The first-session funnel (retention-roadmap.md item 1) ─────────────────
//
// §7.13's list says where a DUEL went. It cannot say whether a first-time
// player ever reached one, and that is the number the retention pass is judged
// by. These name the steps of a first session, and then the three places a
// player goes when the story lets go of them:
//
//   session_start   once per boot     { returning, daysSinceLast, furthest, sessions }
//   first_stroke    first rune drawn  { msSinceBoot }
//   first_cast / first_win / first_restore   once per session each, no props
//   dialogue_skip   the skip icon     { nodeId }
//   tent_open       the wardrobe tent from the map
//   keepsake_equip  something put on  { slot, cosmeticId }
//   spellbook_open  the book, any scene
//   node_replay     a finished node played again   { nodeId }
//
// `daysSinceLast` is arithmetic on two LOCAL calendar dates the device already
// knows (`campaign/session.ts`). Nothing is fetched and no timezone name is
// ever sent — this archive is also the Poki and YouTube Playables submission.
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
  // Local 2P versus (§6.19, S5): one start and one end per match.
  | 'versus_start'
  | 'versus_end'
  | 'first_rune'
  | 'reward_claim'
  | 'recognition_attempt'
  // The restoration wipe (story-spec §7.13): one start, then exactly one of
  // complete / interrupted per sector visit.
  | 'wipe_start'
  | 'wipe_complete'
  | 'wipe_interrupted'
  // The story flow (§7.13).
  | 'spell_discovered'
  | 'duel_abandon'
  | 'ad_interstitial_shown'
  // The first-launch intro (§8.26): one start, one end (watched or skipped).
  | 'intro_start'
  | 'intro_end'
  // ── The first-session funnel (retention item 1). Wired; see the header. ──
  | 'session_start'
  | 'first_stroke'
  | 'first_cast'
  | 'first_win'
  | 'first_restore'
  | 'dialogue_skip'
  | 'tent_open'
  | 'keepsake_equip'
  | 'spellbook_open'
  | 'node_replay'
  // ── The first duel's lessons (`game/duel/lesson.ts`), once per step per
  //    duel except the nudge. Lesson 1 is the BLOCK, lesson 2 the two-rune
  //    COMBO (its triangle half is `first_rune` above).
  /** Lesson 1 began: the foe's spell is on its way, the square's guide is up. `{}` */
  | 'tutorial_block_shown'
  /** Lesson 1's square is in her hand — drawn, or placed for her after `TRIES` misses. `{ tries, helped }` */
  | 'tutorial_block_square'
  /** She raised the wall (lesson 1's cast). `auto`: the lesson pressed it for her. `{ auto }` */
  | 'tutorial_block_cast'
  /** The foe's held spell broke on her wall. `{}` */
  | 'tutorial_block_done'
  /** Lesson 1 gave up on the block and moved on (never seen in a normal run). `{ why: 'noWall' | 'noBlock' }` */
  | 'tutorial_block_skipped'
  /** The lesson did a beat for her after `TRIES` refused tries (lesson 2's triangle, a cast beat). `{ step, tries }` */
  | 'tutorial_helped'
  /** The square's guide came up (lesson 2's square beat). `{}` */
  | 'tutorial_square_shown'
  /** The square was stored — two runes in hand. `{ tries }` */
  | 'tutorial_square_done'
  /** A child who could not manage the square was let through on the triangle. `{ tries }` */
  | 'tutorial_square_skipped'
  /** The two-slot lightbox began (beat C). `{ runes }` */
  | 'tutorial_lightbox'
  /** The cast button opened (beat D). `{ square }` */
  | 'tutorial_cast_ready'
  /** A stroke or a cast the lesson refused, with a nudge back to its guide. `{ step }` */
  | 'tutorial_nudge'
  /** A stroke matched a rune she has not earned yet ("coming soon"). `{ rune }` */
  | 'locked_rune'
  /** The new-rune guide was armed for a duel: a rune a chest gave her that she has never drawn. `{ rune }` */
  | 'rune_guide_shown'
  /** …and she drew it (`seen`: while the guide was on screen, not under the glimpse's hint). `{ rune, seen }` */
  | 'rune_guide_done'
  // ── DECLARED, NOT YET FIRED. These are not dead names: each belongs to a
  //    retention-roadmap feature that is still to be built, and the name is
  //    settled here so the union is the ONE place event names are chosen and
  //    a later pass does not invent a competing spelling. A grep that finds
  //    no `track(` for one of these has found unbuilt work, not a bug.
  /** A tap creature met for the first time — the sticker album (item 3). `{ node }` */
  | 'sticker_collect'
  /** The daily gift opened (item 5). Never a streak. `{ daysSinceLast, reward }` */
  | 'daily_gift'
  /** A rune drawn well past the acceptance threshold (item 7). `{ rune, margin }` */
  | 'perfect_rune'
  /** The trace-assist shown after two losses (item 8). `{ nodeId, lossStreak }` */
  | 'help_shown'
  /** A dress-up photo card taken (item 16). `{ slot }` */
  | 'photo_taken'
  /** The adaptive quality tier settled somewhere new (item 17). `{ tier, fdt }` */
  | 'quality_tier'
  /** The canvas resolution cap dropped on a device that could not fill it
   *  (`game/renderScale.ts`). `{ cap, from, medianMs }` */
  | 'render_scale'

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
export const track = (event: AnalyticsEvent, props?: AnalyticsProps, opts?: { portal?: boolean }): void => {
  const clean = normaliseProps(props)
  const at = typeof performance !== 'undefined' ? Math.round(performance.now()) : 0

  ring.push({ event, props: clean, at })
  if (ring.length > RING) ring.splice(0, ring.length - RING)

  if (opts?.portal === false) return
  if (sink === undefined) sink = probeSink()
  if (!sink) return
  try { sink(event, clean) }
  catch (e) {
    sink = null
    console.warn('[analytics] portal sink threw; disabled for this session', e)
  }
}

/** One finished rune stroke, as `sim.ts` reports it. */
export interface RecognitionInfo {
  success: boolean
  /** The recognised rune, or on a miss the best-scoring one (near-miss analysis). */
  rune: number
  ec: number
  turn: number
  /** Best template score minus the acceptance threshold (0.78). */
  margin: number
}

let strokeCount = 0
/**
 * Per-stroke recognition telemetry: the data that retunes the rune envelopes
 * after launch (story-spec §5.16).
 *
 * A stroke is not "a handful of times a duel", so the portal sink is SAMPLED.
 * Every rejection goes through, because the misses are the signal. One success
 * in ten goes through, carrying `sample: 10` so rates can be reconstructed.
 * The in-memory ring keeps every stroke, so a QA session still sees all of them.
 */
export const trackRecognition = (info: RecognitionInfo): void => {
  strokeCount++
  const portal = !info.success || strokeCount % 10 === 0
  track('recognition_attempt', { ...info, sample: info.success ? 10 : 1 }, { portal })
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
