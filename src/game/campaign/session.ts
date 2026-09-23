/**
 * campaign/session.ts — the first-session funnel (retention-roadmap.md item 1).
 *
 * There is no retention number for this game yet, only guesses. §7.13's events
 * say what happened inside a duel; none of them can say whether a first-time
 * player ever reached one, how long the first stroke took, or whether anybody
 * came back tomorrow. This module owns the few facts that answer that, and
 * nothing else: it is measurement, and no feature may ever branch on it.
 *
 * TWO JOBS, both tiny:
 *
 *   1. THE DAY. `lastPlayedDay` / `giftDay` are LOCAL calendar dates packed as
 *      YYYYMMDD. Local because a day is what a child's day is — a UTC day
 *      hands New Zealand yesterday's gift and cuts Hawaii's short. The date is
 *      read off the device and the only thing derived from it is a difference
 *      in days, so no timezone name and no clock offset ever leaves the
 *      machine: legal on Poki and YouTube Playables, where an external request
 *      is not merely discouraged but disqualifying.
 *
 *      A YYYYMMDD integer sorts and compares like a date, survives JSON, and —
 *      unlike an epoch millisecond — cannot be turned back into "this player
 *      was awake at 03:14". That is deliberate: it is the coarsest thing that
 *      still answers "was that yesterday?".
 *
 *   2. THE FIRST TIMES. `first_stroke` / `first_cast` / `first_win` /
 *      `first_restore` fire AT MOST ONCE per session, so the funnel counts
 *      players rather than actions. The latches are module-level and die with
 *      the tab on purpose — nothing about them is saved, because the question
 *      is what happened in THIS session.
 *
 * The clock can move backwards (a device whose date was wrong and got fixed,
 * a manual change, a portal iframe on a machine syncing NTP). That is normal
 * and must never produce a negative or an absurd `daysSinceLast`: see
 * `daysBetweenDays`.
 */
import { S, save } from '@/game/duel/state'
import { SESSIONS_MAX } from '@/game/campaign/state'
import { track } from '@/use/useAnalytics'

/**
 * The biggest gap worth reporting. Past this the answer is "a very long time",
 * and the exact number is either a wrong clock or a player nobody is going to
 * win back with a recap — either way it should not arrive as a six-digit
 * outlier that drags a dashboard's average with it.
 */
export const DAYS_SINCE_MAX = 999

/** Today on THIS device, as YYYYMMDD. Local date, never UTC. */
export const localDay = (now: Date = new Date()): number =>
  now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()

/** A YYYYMMDD back to a UTC midnight, so a difference is whole days. */
const dayToUtc = (day: number): number =>
  Date.UTC(Math.trunc(day / 10000), (Math.trunc(day / 100) % 100) - 1, day % 100)

/**
 * Whole days from `from` to `to`, both YYYYMMDD.
 *
 * Clamped to 0 … `DAYS_SINCE_MAX`. A clock that moved BACKWARDS would give a
 * negative here, and "returning after -3 days" is not a thing a funnel can be
 * read with; it reads as 0 — the same day — which is also the honest answer,
 * since the last session is not in the future, the clock was.
 *
 * Both dates go through `Date.UTC`, which normalises a nonsense day (a blob
 * holding 20250230) instead of throwing.
 */
export const daysBetweenDays = (from: number, to: number): number => {
  if (!(from > 0) || !(to > 0)) return 0
  const d = Math.round((dayToUtc(to) - dayToUtc(from)) / 86400000)
  return Number.isFinite(d) ? Math.min(DAYS_SINCE_MAX, Math.max(0, d)) : 0
}

/* ───────────────────────────── the session ───────────────────────────── */

let started = false
let strokeDone = false
let castDone = false
let winDone = false
let restoreDone = false

/**
 * One boot, one `session_start` — called by the app root after `load()` and
 * before the first scene, so `furthest` is the save's and not whatever the
 * first duel has already done to it.
 *
 * It also WRITES: today becomes `lastPlayedDay` and the session counter goes
 * up. That happens at the start rather than at the end because there is no
 * end — a tab closes, a portal navigates away, and a counter that waited for
 * a goodbye would only ever count the sessions that had one.
 */
export const beginSession = (now: Date = new Date()): void => {
  if (started) return
  started = true
  const today = localDay(now)
  const last = S.campaign.lastPlayedDay
  const cs = S.campaign
  cs.lastPlayedDay = today
  cs.sessions = Math.min(SESSIONS_MAX, cs.sessions + 1)
  save()
  track('session_start', {
    returning: last > 0,
    daysSinceLast: daysBetweenDays(last, today),
    furthest: cs.furthestNode,
    sessions: cs.sessions
  })
}

/** The first stroke of the session, with how long the player waited for it —
 *  the number roadmap item 2 (a faster first stroke) is graded against. */
export const noteFirstStroke = (): void => {
  if (strokeDone) return
  strokeDone = true
  track('first_stroke', { msSinceBoot: typeof performance !== 'undefined' ? Math.round(performance.now()) : 0 })
}

/** The first spell released this session. */
export const noteFirstCast = (): void => {
  if (castDone) return
  castDone = true
  track('first_cast')
}

/** The first duel won this session (a replay counts: she still won). */
export const noteFirstWin = (): void => {
  if (winDone) return
  winDone = true
  track('first_win')
}

/** The first sector brought back to colour this session. */
export const noteFirstRestore = (): void => {
  if (restoreDone) return
  restoreDone = true
  track('first_restore')
}

/** Test seam: forget that this session ever started. */
export const __resetSession = (): void => {
  started = strokeDone = castDone = winDone = restoreDone = false
}
