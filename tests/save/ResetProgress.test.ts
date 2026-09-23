// What "reset everything except the total leaderboard players" actually has to
// do (`src/use/useResetProgress.ts`).
//
// Two halves, and the second is the one worth a test. Wiping the save is easy
// to write and easy to half-do; KEEPING the right six fields is what stops a
// reset from silently changing the number it was told to preserve. A fresh
// player id means a second row on the Worker's board, the old one stranded,
// and the global population up by one for every reset anybody ever does —
// which is not repairable from a client, and would be invisible here.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ANON_NAME_KEY, CAMPAIGN_KEY, LANGUAGE_KEY, MUSIC_KEY, ONBOARDED_KEY,
  PLAYER_ID_KEY, PORTAL_JOINED_KEY, PORTAL_POSTED_SCORE_KEY, POSTED_NAME_KEY,
  RUNS_KEY, SOUND_KEY, SUBMITTED_SCORE_KEY, WINS_KEY
} from '@/keys'

const BOARD_CACHE_KEY = 'auroras_magic_board_cache'
const DEVICE_UID_KEY = 'auroras_magic_uid'

/** A player mid-story, with a leaderboard row and a board cached on device. */
const seedPlayer = async () => {
  const { setStates, STATE_KEY } = await import('@/use/useGameState')
  setStates({
    [CAMPAIGN_KEY]: { furthestNode: 23, sectorsDone: 'AAAA', combosSeen: { 'fire+ice': 1 } },
    [RUNS_KEY]: 61,
    [WINS_KEY]: 40,
    [ONBOARDED_KEY]: true,
    [SOUND_KEY]: 0.4,
    [MUSIC_KEY]: 0.2,
    [LANGUAGE_KEY]: 'de',
    [PLAYER_ID_KEY]: 'a1b2c3d4e5f60718293a4b5c',
    [ANON_NAME_KEY]: 'Sunny Pony 482',
    [POSTED_NAME_KEY]: 'Sunny Pony 482',
    [SUBMITTED_SCORE_KEY]: 40,
    [PORTAL_POSTED_SCORE_KEY]: 40,
    [PORTAL_JOINED_KEY]: true
  })
  return STATE_KEY
}

const blob = (stateKey: string): Record<string, unknown> =>
  JSON.parse(window.localStorage.getItem(stateKey) ?? '{}')

describe('resetProgress — what goes and what stays', () => {
  let reload: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.resetModules()
    window.localStorage.clear()
    reload = vi.fn()
    // jsdom's `location` is not writable and `reload` is not a vi.fn; replace
    // just the two members the reset touches, and let the hash be a plain
    // string so the module can write to it.
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { hash: '#/game', reload, href: 'http://localhost/#/game' }
    })
  })

  afterEach(() => { vi.restoreAllMocks() })

  it('wipes progress and settings, and keeps the leaderboard identity', async () => {
    const STATE_KEY = await seedPlayer()
    const { resetProgress } = await import('@/use/useResetProgress')

    await resetProgress()

    const after = blob(STATE_KEY)
    // Progress: gone.
    for (const k of [CAMPAIGN_KEY, RUNS_KEY, WINS_KEY, ONBOARDED_KEY]) {
      expect(after[k], `${k} should have been wiped`).toBeUndefined()
    }
    // Settings: gone too. The button says "progress" and the confirm says
    // "and your settings" — if that ever stops being true, this fails first.
    for (const k of [SOUND_KEY, MUSIC_KEY, LANGUAGE_KEY]) {
      expect(after[k], `${k} should have been wiped`).toBeUndefined()
    }
    // Identity and the server mirrors: kept, exactly as they were.
    expect(after[PLAYER_ID_KEY]).toBe('a1b2c3d4e5f60718293a4b5c')
    expect(after[ANON_NAME_KEY]).toBe('Sunny Pony 482')
    expect(after[POSTED_NAME_KEY]).toBe('Sunny Pony 482')
    expect(after[SUBMITTED_SCORE_KEY]).toBe(40)
    expect(after[PORTAL_POSTED_SCORE_KEY]).toBe(40)
    expect(after[PORTAL_JOINED_KEY]).toBe(true)
  })

  it('leaves the cached board — the total it is told to preserve lives there', async () => {
    const STATE_KEY = await seedPlayer()
    // ~6 kB of PUBLIC data, identical for every player, deliberately outside
    // the `am_` prefix so it never round-trips to a portal's cloud save.
    window.localStorage.setItem(BOARD_CACHE_KEY, JSON.stringify({ total: 154331, rows: [] }))
    window.localStorage.setItem(DEVICE_UID_KEY, 'a1b2c3d4e5f60718293a4b5c')

    const { resetProgress } = await import('@/use/useResetProgress')
    await resetProgress()

    expect(JSON.parse(window.localStorage.getItem(BOARD_CACHE_KEY)!).total).toBe(154331)
    // The device copy of the id is the one thing a cloud round-trip cannot
    // overwrite, so it has to survive too or the next boot mints a new player.
    expect(window.localStorage.getItem(DEVICE_UID_KEY)).toBe('a1b2c3d4e5f60718293a4b5c')
    expect(blob(STATE_KEY)[PLAYER_ID_KEY]).toBe('a1b2c3d4e5f60718293a4b5c')
  })

  it('folds away loose am_* keys, so a wiped field cannot walk back in', async () => {
    await seedPlayer()
    // `buildInitial` folds any loose `am_*` entry INTO the blob on the next
    // boot — a migration path for an older client's per-key writes, and a way
    // for wiped progress to come back if the reset ignored them.
    window.localStorage.setItem('am_ladder', '9')

    const { resetProgress } = await import('@/use/useResetProgress')
    await resetProgress()

    expect(window.localStorage.getItem('am_ladder')).toBeNull()
  })

  it('reloads at the root, not back into the duel it just emptied', async () => {
    await seedPlayer()
    const { resetProgress } = await import('@/use/useResetProgress')

    await resetProgress()

    expect(window.location.hash).toBe('#/')
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('persists before it reloads — a debounced write would die with the page', async () => {
    const STATE_KEY = await seedPlayer()
    const { resetProgress } = await import('@/use/useResetProgress')

    reload.mockImplementation(() => {
      // Whatever is on disk AT THE MOMENT OF THE RELOAD is what the next boot
      // reads. The persist layer debounces by 200 ms, so this is the assertion
      // that the reset flushed rather than scheduled.
      expect(blob(STATE_KEY)[CAMPAIGN_KEY]).toBeUndefined()
      expect(blob(STATE_KEY)[PLAYER_ID_KEY]).toBe('a1b2c3d4e5f60718293a4b5c')
    })

    await resetProgress()
    expect(reload).toHaveBeenCalledTimes(1)
  })
})
