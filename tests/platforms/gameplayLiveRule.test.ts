// What counts as LIVE GAMEPLAY — the predicate behind every portal's
// gameplayStart / gameplayStop bracket.
//
// This is a portal contract, not a view detail. CrazyGames counts the session
// between the two events; Poki measures conversion-to-play on the first
// `gameplayStart()` and takes a screen wake lock for the duration of the
// bracket. So every reason the game is not being played has to close it, and a
// missing one is invisible until a reviewer reads the SDK event log.
//
// The tab-away and portal-pause arms are here because they were MISSING: both
// already halted the simulation via `isGamePaused`, so the game looked correct
// while the portal was never told, and a player who switched tabs mid-duel left
// an open bracket behind them.

import { describe, expect, it } from 'vitest'
import { isGameplayLive, type GameplayLiveInputs } from '@/use/useGameplayLifecycle'

/** A player mid-duel with nothing in the way. Each test negates one thing. */
const playing: GameplayLiveInputs = {
  scene: 'duel',
  duelPhaseIsLive: true,
  showResult: false,
  anyModalOpen: false,
  adShowing: false,
  visibilityHidden: false,
  platformPaused: false,
  awaitingInput: false
}

describe('isGameplayLive', () => {
  it('is live while a duel is being fought', () => {
    expect(isGameplayLive(playing)).toBe(true)
  })

  it('is not live once a duelist has fallen — the duel is over either way', () => {
    // The scene is still `duel` through the flourish / sting; the PHASE is
    // what ended (story-spec §4.9.1 — the case the first draft got wrong).
    expect(isGameplayLive({ ...playing, duelPhaseIsLive: false })).toBe(false)
  })

  // ─── The story scenes (story-spec §4.9.1, §11.2) ─────────────────────────

  it('is live in exactly two scenes: a duel being fought, and a wipe', () => {
    const scenes = ['boot', 'map', 'dialogue', 'duel', 'unbox', 'wipe', 'wardrobe', 'versusSetup'] as const
    for (const scene of scenes) {
      for (const duelPhaseIsLive of [true, false]) {
        const want = (scene === 'duel' && duelPhaseIsLive) || scene === 'wipe'
        expect(isGameplayLive({ ...playing, scene, duelPhaseIsLive }), `${scene}/${duelPhaseIsLive}`).toBe(want)
      }
    }
  })

  it('keeps a wipe live whatever the (finished) duel phase says', () => {
    // A wipe follows a WON duel, so `S.phase` is PH_WIN the whole time.
    expect(isGameplayLive({ ...playing, scene: 'wipe', duelPhaseIsLive: false })).toBe(true)
  })

  it('closes a wipe for every pause reason, exactly like a duel', () => {
    const wiping = { ...playing, scene: 'wipe' as const, duelPhaseIsLive: false }
    for (const k of ['showResult', 'anyModalOpen', 'adShowing', 'visibilityHidden', 'platformPaused', 'awaitingInput'] as const) {
      expect(isGameplayLive({ ...wiping, [k]: true }), k).toBe(false)
    }
  })

  // ─── The two that were missing ───────────────────────────────────────────

  it('STOPS on tab away', () => {
    expect(isGameplayLive({ ...playing, visibilityHidden: true })).toBe(false)
  })

  it('STOPS when the portal SDK asks the game to pause', () => {
    expect(isGameplayLive({ ...playing, platformPaused: true })).toBe(false)
  })

  it('comes back live when the player returns to the tab', () => {
    // The bracket must REOPEN, not stay closed — a stop with no matching start
    // costs the rest of the session's playtime on every portal that measures it.
    const away = { ...playing, visibilityHidden: true }
    expect(isGameplayLive(away)).toBe(false)
    expect(isGameplayLive({ ...away, visibilityHidden: false })).toBe(true)
  })

  // ─── The ones that were already right ────────────────────────────────────

  it('STOPS on menu entry', () => {
    expect(isGameplayLive({ ...playing, anyModalOpen: true })).toBe(false)
  })

  it('STOPS while an ad is on screen', () => {
    expect(isGameplayLive({ ...playing, adShowing: true })).toBe(false)
  })

  it('STOPS while the result screen is up', () => {
    expect(isGameplayLive({ ...playing, showResult: true })).toBe(false)
  })

  it('is not live before the first trusted input', () => {
    // The duel boots straight into the arena with the foe held. A
    // `gameplayStart` here opens a session nobody has begun — a named Poki QA
    // rejection, and it inflates the very C2P number the web fit test grades.
    expect(isGameplayLive({ ...playing, awaitingInput: true })).toBe(false)
  })

  it('needs EVERY reason to clear before it reports live again', () => {
    // Overlapping stops are the normal case: a modal opened while the tab was
    // hidden, an ad that opened during a portal pause. Dropping one must not
    // reopen the bracket.
    const stopped = { ...playing, visibilityHidden: true, anyModalOpen: true }
    expect(isGameplayLive({ ...stopped, visibilityHidden: false })).toBe(false)
    expect(isGameplayLive({ ...stopped, anyModalOpen: false })).toBe(false)
    expect(isGameplayLive({ ...stopped, visibilityHidden: false, anyModalOpen: false }))
      .toBe(true)
  })
})
