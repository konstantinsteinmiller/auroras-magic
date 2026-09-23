// The first-session funnel (retention-roadmap.md item 1): the day arithmetic
// `session_start` is derived from, the once-per-session latches, and the one
// write the sticker album depends on.
//
// These are measurement, so the only thing that can break is the counting —
// and the two ways it breaks are both here: a clock that moved, and an event
// that fires more than once.

import { beforeEach, describe, expect, it } from 'vitest'
import { S } from '@/game/duel/state'
import { defaultCampaign, SESSIONS_MAX } from '@/game/campaign/state'
import { hasBit } from '@/game/campaign/bitset'
import { meetCreature, creatureMet } from '@/game/campaign/controller'
import {
  beginSession, daysBetweenDays, localDay, noteFirstStroke, noteFirstCast,
  noteFirstWin, noteFirstRestore, __resetSession, DAYS_SINCE_MAX
} from '@/game/campaign/session'
import { analyticsLog, __resetAnalytics, type AnalyticsEvent } from '@/use/useAnalytics'
import { gameState } from '@/use/useGameState'

const fired = (event: AnalyticsEvent) => analyticsLog().filter((r) => r.event === event)
/** A local date, built the way the device builds one. */
const day = (y: number, m: number, d: number): Date => new Date(y, m - 1, d, 12, 0, 0)

beforeEach(() => {
  S.campaign = defaultCampaign()
  __resetSession()
  __resetAnalytics()
})

describe('the local day', () => {
  it('packs the DEVICE date as YYYYMMDD', () => {
    expect(localDay(day(2026, 9, 23))).toBe(20260923)
    expect(localDay(day(2026, 1, 5))).toBe(20260105)
  })

  it('counts nothing on the same day, and one on the next', () => {
    expect(daysBetweenDays(20260923, 20260923)).toBe(0)
    expect(daysBetweenDays(20260923, 20260924)).toBe(1)
  })

  it('counts across a month, a year and a leap day', () => {
    expect(daysBetweenDays(20260920, 20260923)).toBe(3)
    expect(daysBetweenDays(20260131, 20260201)).toBe(1)
    expect(daysBetweenDays(20251231, 20260101)).toBe(1)
    expect(daysBetweenDays(20240228, 20240301)).toBe(2)
  })

  it('reads a clock that moved BACKWARDS as the same day, never as negative', () => {
    // A device whose date was wrong and got fixed, or a manual change. The
    // last session is not in the future — the clock was.
    expect(daysBetweenDays(20261001, 20260923)).toBe(0)
    expect(daysBetweenDays(20270101, 20260101)).toBe(0)
  })

  it('caps an absurd gap instead of letting it drag a dashboard', () => {
    expect(daysBetweenDays(20000101, 20260101)).toBe(DAYS_SINCE_MAX)
  })

  it('reads a profile that never played as no gap at all', () => {
    expect(daysBetweenDays(0, 20260923)).toBe(0)
  })
})

describe('session_start', () => {
  it('reports a first boot as a new player and counts the session', () => {
    beginSession(day(2026, 9, 23))
    const [e] = fired('session_start')
    expect(e!.props).toMatchObject({ returning: false, daysSinceLast: 0, furthest: -1, sessions: 1 })
    expect(S.campaign.lastPlayedDay).toBe(20260923)
    expect(S.campaign.sessions).toBe(1)
  })

  it('reports a return, with the days between and the progress it inherited', () => {
    S.campaign.lastPlayedDay = 20260921
    S.campaign.sessions = 4
    S.campaign.furthestNode = 6
    beginSession(day(2026, 9, 23))
    expect(fired('session_start')[0]!.props).toMatchObject({
      returning: true, daysSinceLast: 2, furthest: 6, sessions: 5
    })
  })

  it('fires once per boot, however often it is called', () => {
    beginSession(day(2026, 9, 23))
    beginSession(day(2026, 9, 23))
    expect(fired('session_start')).toHaveLength(1)
    expect(S.campaign.sessions).toBe(1)
  })

  it('takes today from a backwards clock without reporting a negative gap', () => {
    S.campaign.lastPlayedDay = 20261001
    beginSession(day(2026, 9, 23))
    expect(fired('session_start')[0]!.props.daysSinceLast).toBe(0)
    // Today still wins the field: the save follows the device, not the past.
    expect(S.campaign.lastPlayedDay).toBe(20260923)
  })

  it('stops counting sessions at the ceiling rather than growing forever', () => {
    S.campaign.sessions = SESSIONS_MAX
    beginSession(day(2026, 9, 23))
    expect(S.campaign.sessions).toBe(SESSIONS_MAX)
  })
})

describe('the first_* steps', () => {
  const steps: [AnalyticsEvent, () => void][] = [
    ['first_stroke', noteFirstStroke],
    ['first_cast', noteFirstCast],
    ['first_win', noteFirstWin],
    ['first_restore', noteFirstRestore]
  ]

  for (const [event, note] of steps) {
    it(`${event} fires at most once per session`, () => {
      note()
      note()
      note()
      expect(fired(event)).toHaveLength(1)
    })
  }

  it('carries how long the player waited for the first stroke', () => {
    noteFirstStroke()
    const ms = fired('first_stroke')[0]!.props.msSinceBoot
    expect(typeof ms).toBe('number')
    expect(ms as number).toBeGreaterThanOrEqual(0)
  })

  it('counts again in the NEXT session — the latches are per tab, not saved', () => {
    noteFirstWin()
    __resetSession()
    noteFirstWin()
    expect(fired('first_win')).toHaveLength(2)
  })
})

describe('meeting a creature (the album\'s bit)', () => {
  it('sets the sector\'s bit, saves, and reports the sticker once', () => {
    expect(creatureMet(7)).toBe(false)
    meetCreature(7)
    expect(creatureMet(7)).toBe(true)
    expect(hasBit(S.campaign.creaturesMet, 7)).toBe(true)
    expect(fired('sticker_collect')).toHaveLength(1)
    expect(fired('sticker_collect')[0]!.props).toEqual({ node: 7 })
  })

  it('a second peek writes nothing and emits nothing', () => {
    meetCreature(7)
    // `setStates` replaces the blob's identity on every write, so an unchanged
    // reference IS "save() was not called".
    const blob = gameState.value
    meetCreature(7)
    expect(gameState.value).toBe(blob)
    expect(fired('sticker_collect')).toHaveLength(1)
  })

  it('ignores a node outside the campaign', () => {
    meetCreature(-1)
    meetCreature(50)
    expect(creatureMet(-1)).toBe(false)
    expect(fired('sticker_collect')).toHaveLength(0)
  })
})
