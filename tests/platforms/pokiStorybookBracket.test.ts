// Poki's gameplay bracket spans the storybook (owner, 2026-09-23).
//
// On Poki the map is not a level select: it is the book the player turns and
// plays with, and the dialogue, the picture book, the gift, the cleaning, the
// tent, the album and the bath time to come are all the game. Closing the
// bracket every time a duel ended told Poki the player had left while she was
// still playing. What is pinned here:
//
//   • THE RULE — live in every scene past the boot, including a won duel's
//     flourish and the result panel; closed only by a menu (settings, the
//     spellbook, any FModal), an ad, a hidden tab, a portal pause, or no
//     touch yet. A modal that is part of the story (the rune-gift ceremony)
//     is not a menu;
//   • THE FLOW — walked through the real scene FSM and the real reconciler:
//     duel → win → map → dialogue → the next duel is ONE start and no stop;
//   • AN AD STILL STOPS IT, synchronously, and play resumes after;
//   • THE ARMS — Poki hears only `syncPokiGameplay`; CrazyGames and Playgama
//     keep the narrow bracket, and no handover sends Poki a gratuitous pair.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isPokiGameplayLive, type PokiLiveInputs } from '@/use/useGameplayLifecycle'

/** In the game, with nothing in the way. Each case negates one thing. */
const inGame: PokiLiveInputs = {
  scene: 'map',
  menuOpen: false,
  adShowing: false,
  visibilityHidden: false,
  platformPaused: false,
  awaitingInput: false
}

describe('isPokiGameplayLive', () => {
  it('is live in every scene of the book — only the boot is not', () => {
    const scenes = ['boot', 'intro', 'map', 'dialogue', 'duel', 'unbox', 'wipe', 'wardrobe', 'versusSetup'] as const
    for (const scene of scenes) expect(isPokiGameplayLive({ ...inGame, scene }), scene).toBe(scene !== 'boot')
  })

  it('closes for a menu, an ad, a hidden tab, a portal pause, and before the first touch', () => {
    expect(isPokiGameplayLive({ ...inGame, menuOpen: true })).toBe(false)
    expect(isPokiGameplayLive({ ...inGame, adShowing: true })).toBe(false)
    expect(isPokiGameplayLive({ ...inGame, visibilityHidden: true })).toBe(false)
    expect(isPokiGameplayLive({ ...inGame, platformPaused: true })).toBe(false)
    expect(isPokiGameplayLive({ ...inGame, awaitingInput: true })).toBe(false)
  })
})

/* ─────────────────────────── the flow, end to end ─────────────────────── */

beforeEach(() => { vi.resetModules() })
afterEach(() => { vi.restoreAllMocks() })

const boot = async () => {
  const { S } = await import('@/game/duel/state')
  const { PH_DUEL, PH_WIN } = await import('@/game/duel/config')
  const scene = await import('@/game/flow/scene')
  const bracket = await import('@/game/flow/bracket')
  const life = await import('@/use/useGameplayLifecycle')
  const pause = await import('@/use/useGamePause')
  const modal = await import('@/use/useModalState')
  const poki: boolean[] = []
  const narrow: boolean[] = []
  vi.spyOn(life, 'syncPokiGameplay').mockImplementation((v: boolean) => { poki.push(v) })
  vi.spyOn(life, 'syncGameplayLifecycle').mockImplementation((v: boolean) => { narrow.push(v) })
  bracket.__resetBracket()
  S.flow.armed = false
  S.flow.overlay = null
  S.resultUp = false
  S.phase = PH_DUEL
  scene.gotoScene('duel', 0)
  return { S, PH_DUEL, PH_WIN, ...scene, ...bracket, ...pause, ...modal, poki, narrow }
}

describe('Poki\'s bracket through the story', () => {
  it('opens on the first touch, not before', async () => {
    const b = await boot()
    expect(b.pokiBracketLive()).toBe(false)
    b.arm()
    expect(b.pokiBracketLive()).toBe(true)
    expect(b.poki).toEqual([false, true])
  })

  it('stays open from the duel, through the win, the map and the story, into the next duel', async () => {
    const b = await boot()
    b.arm()
    b.poki.length = 0
    b.narrow.length = 0
    // The duel is won: the flourish plays, the result, the page turn.
    b.S.phase = b.PH_WIN
    b.reconcileGameplayBracket()
    b.S.resultUp = true
    b.reconcileGameplayBracket()
    b.S.resultUp = false
    for (const sc of ['map', 'intro', 'unbox', 'wipe', 'map', 'wardrobe', 'map', 'dialogue'] as const) {
      b.gotoScene(sc, 0)
      expect(b.pokiBracketLive(), sc).toBe(true)
    }
    b.S.phase = b.PH_DUEL
    b.gotoScene('duel', 1)
    expect(b.poki, 'not one stop — the player never left the game').toEqual([])
    // …while CrazyGames and Playgama still hear the narrow bracket close and
    // reopen around the duel, and the wipe.
    expect(b.narrow).toEqual([false, true, false, true])
  })

  it('closes for the settings and the spellbook, and reopens after', async () => {
    const b = await boot()
    b.arm()
    b.gotoScene('map', 0)
    b.poki.length = 0
    b.openOverlay('options')
    expect(b.pokiBracketLive()).toBe(false)
    b.closeOverlay()
    expect(b.pokiBracketLive()).toBe(true)
    b.openOverlay('spellbook')
    expect(b.pokiBracketLive()).toBe(false)
    b.closeOverlay()
    expect(b.poki).toEqual([false, true, false, true])
  })

  it('closes for an FModal menu but not for the rune-gift ceremony (the story)', async () => {
    const b = await boot()
    const off = b.installGameplayBracket()
    b.arm()
    b.gotoScene('map', 0)
    b.poki.length = 0
    // The ceremony holds the game still behind it, but it is a moment IN the
    // book: Poki is not told the player left.
    const releaseGift = b.acquireModalOpen()
    expect(b.pokiBracketLive()).toBe(true)
    expect(b.bracketLive()).toBe(false)
    releaseGift()
    // An FModal — the settings — is a menu.
    const releaseBoard = b.acquireMenuOpen()
    expect(b.pokiBracketLive()).toBe(false)
    releaseBoard()
    expect(b.pokiBracketLive()).toBe(true)
    expect(b.poki).toEqual([false, true])
    off()
  })

  it('still stops for an ad — at the moment the ad flag rises — and resumes after it', async () => {
    const b = await boot()
    const off = b.installGameplayBracket()
    b.arm()
    // On the win screen, where the interstitial actually lands.
    b.S.phase = b.PH_WIN
    b.reconcileGameplayBracket()
    b.poki.length = 0
    b.isAdShowing.value = true
    // Synchronous: `useAds` raises this flag before it calls the provider, so
    // the stop is already sent when `commercialBreak()` is.
    expect(b.poki).toEqual([false])
    expect(b.isGamePaused.value).toBe(true)
    b.isAdShowing.value = false
    expect(b.poki).toEqual([false, true])
    off()
  })

  it('closes when the tab is hidden or the portal pauses', async () => {
    const b = await boot()
    const off = b.installGameplayBracket()
    b.arm()
    b.gotoScene('map', 0)
    b.isVisibilityHidden.value = true
    expect(b.pokiBracketLive()).toBe(false)
    b.isVisibilityHidden.value = false
    expect(b.pokiBracketLive()).toBe(true)
    b.isPlatformPaused.value = true
    expect(b.pokiBracketLive()).toBe(false)
    b.isPlatformPaused.value = false
    expect(b.pokiBracketLive()).toBe(true)
    off()
  })
})

/* ──────────────────────────────── the arms ────────────────────────────── */

describe('the Poki arm', () => {
  const load = async () => {
    vi.resetModules()
    vi.stubEnv('VITE_APP_POKI', 'true')
    const calls: string[] = []
    vi.doMock('@/use/useCrazyGames', () => ({
      syncGameplayLifecycle: (live: boolean) => calls.push(live ? 'cg:start' : 'cg:stop')
    }))
    vi.doMock('@/utils/pokiPlugin', () => ({
      pokiGameplayStart: () => calls.push('poki:start'),
      pokiGameplayStop: () => calls.push('poki:stop')
    }))
    const mod = await import('@/use/useGameplayLifecycle')
    mod.__resetGameplayBracket()
    return { calls, mod }
  }
  afterEach(() => { vi.unstubAllEnvs() })

  it('hears only its own bracket — the narrow one no longer reaches it', async () => {
    const { calls, mod } = await load()
    mod.syncGameplayLifecycle(true)
    mod.syncGameplayLifecycle(false)
    expect(calls.filter((c) => c.startsWith('poki:'))).toEqual([])
    mod.syncPokiGameplay(true)
    mod.syncPokiGameplay(false)
    expect(calls.filter((c) => c.startsWith('poki:'))).toEqual(['poki:start', 'poki:stop'])
  })

  it('is never sent a handover pair — its play did not end', async () => {
    const { calls, mod } = await load()
    mod.syncPokiGameplay(true)
    mod.syncGameplayLifecycle(true)
    calls.length = 0
    mod.restartGameplayBracket()
    expect(calls).toEqual(['cg:stop', 'cg:start'])
  })
})
