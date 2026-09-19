// The gameplay bracket, driven from the scene FSM (story-spec §4.9.2, M12,
// §12.2.3): live ONLY while a duel is fought and while a sector is wiped —
// never on the map, in a dialogue, at the gift, in the wardrobe, under an
// overlay, or before the first touch. Every flow call reconciles at once.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => {
  vi.resetModules()
})
afterEach(() => {
  vi.restoreAllMocks()
})

const boot = async () => {
  const { S } = await import('@/game/duel/state')
  const { PH_DUEL, PH_WIN } = await import('@/game/duel/config')
  const scene = await import('@/game/flow/scene')
  const bracket = await import('@/game/flow/bracket')
  const life = await import('@/use/useGameplayLifecycle')
  const calls: boolean[] = []
  vi.spyOn(life, 'syncGameplayLifecycle').mockImplementation((v: boolean) => { calls.push(v) })
  bracket.__resetBracket()
  S.flow.armed = false
  S.flow.overlay = null
  S.resultUp = false
  return { S, PH_DUEL, PH_WIN, ...scene, ...bracket, calls }
}

describe('the FSM bracket', () => {
  it('is live only in the duel and the wipe, once armed', async () => {
    const b = await boot()
    b.S.phase = b.PH_DUEL
    b.gotoScene('dialogue', 0)
    expect(b.bracketLive()).toBe(false)
    b.gotoScene('duel', 0)
    expect(b.bracketLive()).toBe(false) // nobody has touched the game yet
    b.arm()
    expect(b.bracketLive()).toBe(true)
    for (const sc of ['intro', 'map', 'dialogue', 'unbox', 'wardrobe'] as const) {
      b.gotoScene(sc, 0)
      expect(b.bracketLive(), sc).toBe(false)
    }
    b.gotoScene('wipe', 0)
    expect(b.bracketLive()).toBe(true)
  })

  it('closes under an overlay and reopens when it closes', async () => {
    const b = await boot()
    b.S.phase = b.PH_DUEL
    b.arm()
    b.gotoScene('duel', 0)
    expect(b.bracketLive()).toBe(true)
    b.openOverlay('options')
    expect(b.bracketLive()).toBe(false)
    b.closeOverlay()
    expect(b.bracketLive()).toBe(true)
    b.openOverlay('spellbook')
    expect(b.bracketLive()).toBe(false)
  })

  it('closes when the duel is decided', async () => {
    const b = await boot()
    b.S.phase = b.PH_DUEL
    b.arm()
    b.gotoScene('duel', 0)
    b.S.phase = b.PH_WIN
    b.reconcileGameplayBracket()
    expect(b.bracketLive()).toBe(false)
  })

  it('reports only CHANGES — never a stop/start pair for a no-op', async () => {
    const b = await boot()
    b.S.phase = b.PH_DUEL
    b.arm()
    b.gotoScene('duel', 0)
    b.gotoScene('duel', 0)
    b.reconcileGameplayBracket()
    b.gotoScene('wipe', 0) // duel → wipe: still live, nothing to say
    b.gotoScene('map', 0)
    expect(b.calls).toEqual([false, true, false])
  })
})
