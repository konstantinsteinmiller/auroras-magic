import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

// ─── Cloud → composable hydrate (the "fresh user" regression) ───────────────
//
// THE BUG THIS FILE EXISTS TO PREVENT:
//   A returning player reloads. The platform SDK's cloud read is async. The
//   Vue module graph evaluates first, every composable reads an empty blob and
//   initialises to defaults, and the player is rendered as a brand-new install:
//   the first rung, no coins, no ranks. The next write then commits those
//   defaults over the real cloud save and the loss becomes permanent.
//
// The whole game state lives in ONE `auroras_magic_state` blob (an allowlisted payload
// key), so the strategy mirrors it verbatim. `reloadGameState()` is wired into
// the `saveDataVersion` bump inside `useSaveStatus` — and the ORDER matters:
// the blob must be re-read BEFORE the bump, or every `watch(saveDataVersion)`
// consumer re-reads the stale pre-hydrate snapshot and the bug survives.

const MANIFEST_KEY = '__save_internal__crazy_keys'
const STATE_KEY = 'auroras_magic_state'

const makeFakeData = (seed: Record<string, string> = {}) => {
  const store = new Map<string, string>(Object.entries(seed))
  return {
    store,
    getItem: vi.fn(async (key: string) => store.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => { store.set(key, value) }),
    removeItem: vi.fn(async (key: string) => { store.delete(key) })
  }
}

const flush = async (): Promise<void> => { await nextTick(); await nextTick() }

beforeEach(() => {
  localStorage.clear()
  vi.resetModules()
})

/** A cloud snapshot for a player who is deep into the ladder, plus the meta
 *  blob the merge resolver needs in order to pick remote over an empty local. */
const seededCloud = async () => {
  const { META_KEY } = await import('@/utils/save/SaveMergePolicy')
  const cloudBlob = {
    am_coins: 1250,
    am_ladder: 4,
    am_duels: 9,
    am_wins: 6,
    am_losses: 3,
    am_best_time: 41.5,
    am_upgrades: [1, 3, 1, 2],
    am_spells_seen: { '0': 1, '1': 1, '2': 1, '3': 1, '00': 1, '03': 1 },
    am_onboarded: 1,
    am_user_sound_volume: 0.4,
    am_user_language: 'es'
  }
  const meta = {
    savedAt: '2026-05-19T00:00:00.000Z',
    // ladder 4 × 500 + 7 rank levels × 150 + 9 duels × 10
    progressScore: 4 * 500 + 7 * 150 + 9 * 10,
    schemaVersion: 1,
    maxStage: 4
  }
  return makeFakeData({
    [MANIFEST_KEY]: JSON.stringify([STATE_KEY, META_KEY]),
    [STATE_KEY]: JSON.stringify(cloudBlob),
    [META_KEY]: JSON.stringify(meta)
  })
}

/** Boot the CrazyGames cloud-only configuration: gameplay state lives in memory
 *  only and `sdk.data` is the sole persistence backend. */
const bootCloudOnly = async (data: ReturnType<typeof makeFakeData>) => {
  const { SaveManager } = await import('@/utils/save/SaveManager')
  const { CrazyGamesStrategy } = await import('@/utils/save/CrazyGamesStrategy')
  const { installSaveStatus } = await import('@/use/useSaveStatus')
  const manager = new SaveManager(
    new CrazyGamesStrategy(() => data),
    window.localStorage,
    { blob: { persistToRaw: false } }
  )
  installSaveStatus(manager)
  await manager.init()
  await flush()
  return manager
}

describe('auroras_magic_state cloud hydrate → composable refresh', () => {
  it('hydrates the blob into localStorage before the app graph reads it', async () => {
    const data = await seededCloud()
    await bootCloudOnly(data)

    const blob = JSON.parse(window.localStorage.getItem(STATE_KEY) || '{}')
    expect(blob.am_ladder).toBe(4)
    expect(blob.am_coins).toBe(1250)
  })

  it('the duel loads the returning player — NOT a fresh user', async () => {
    const data = await seededCloud()
    await bootCloudOnly(data)

    const { S, load } = await import('@/game/duel/state')
    load()
    expect(S.coins).toBe(1250)
    expect(S.foe).toBe(4)
    expect(S.wins).toBe(6)
    expect(S.losses).toBe(3)
    expect(S.best).toBe(41.5)
    // Onboarding already done: the three-beat tutorial must not replay.
    expect(S.intro).toBe(0)
    // Discovered combos survive, merged over the four base runes.
    expect(S.seen['03']).toBe(1)
    expect(S.seen['0']).toBe(1)
  })

  it('refreshes the element ranks the player paid for', async () => {
    const data = await seededCloud()
    await bootCloudOnly(data)

    const { S, load } = await import('@/game/duel/state')
    load()
    expect(S.up).toEqual([1, 3, 1, 2])
    // And the ranks reach the damage a cast does — a rank that loads but does
    // not bite is content that silently disappears on every reload.
    const { RANK_BONUS } = await import('@/game/duel/config')
    expect(1 + RANK_BONUS * S.up[1]!).toBeCloseTo(1.36, 5)
  })

  it('refreshes user settings so the player keeps their language and volume', async () => {
    const data = await seededCloud()
    await bootCloudOnly(data)

    const { default: useUser } = await import('@/use/useUser')
    const u = useUser()
    expect(u.userLanguage.value).toBe('es')
    expect(u.userSoundVolume.value).toBe(0.4)
  })

  it('keeps nothing but the two blobs in raw localStorage on a cloud-only build', async () => {
    const data = await seededCloud()
    await bootCloudOnly(data)

    // Cloud-only mode: gameplay state is in-memory; the proxy serves reads.
    // Nothing must leak into the raw store.
    const raw: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k) raw.push(k)
    }
    expect(raw.filter((k) => k.startsWith('am_'))).toEqual([])
  })
})

describe('hydrate failure modes', () => {
  it('does NOT overwrite a real cloud save when the local snapshot is empty', async () => {
    const data = await seededCloud()
    const manager = await bootCloudOnly(data)

    // A trivial post-boot write must not clobber the hydrated fields.
    const { setState } = await import('@/use/useGameState')
    const { flushSaveNow } = await import('@/use/useSaveStatus')
    setState('am_onboarded', true)
    await flushSaveNow()
    await manager.flush()

    const cloudBlob = JSON.parse(data.store.get(STATE_KEY) || '{}')
    expect(cloudBlob.am_ladder).toBe(4)
    expect(cloudBlob.am_coins).toBe(1250)
    expect(cloudBlob.am_onboarded).toBe(true)
  })

  it('retries a transient SDK failure before letting a returning player boot fresh', async () => {
    vi.useFakeTimers()
    try {
      const data = await seededCloud()
      const snapshot = new Map(data.store)
      let calls = 0
      data.getItem.mockImplementation(async (key: string) => {
        calls++
        // Fail the very first manifest read — the transient-blip failure mode.
        if (key === MANIFEST_KEY && calls === 1) throw new Error('transient SDK error')
        return snapshot.get(key) ?? null
      })

      const { SaveManager } = await import('@/utils/save/SaveManager')
      const { CrazyGamesStrategy } = await import('@/utils/save/CrazyGamesStrategy')
      const manager = new SaveManager(
        new CrazyGamesStrategy(() => data),
        window.localStorage,
        { blob: { persistToRaw: false } }
      )
      const init = manager.init()
      await vi.advanceTimersByTimeAsync(1_500)
      await init

      expect(manager.hydrateState).toBe('success-with-data')
      const blob = JSON.parse(window.localStorage.getItem(STATE_KEY) || '{}')
      expect(blob.am_ladder).toBe(4)
    } finally {
      vi.clearAllTimers()
      vi.useRealTimers()
    }
  })

  it('treats a genuinely empty cloud as a real fresh install', async () => {
    const data = makeFakeData()
    await bootCloudOnly(data)

    const { S, load } = await import('@/game/duel/state')
    load()
    expect(S.coins).toBe(0)
    expect(S.up).toEqual([0, 0, 0, 0])
    expect(S.foe).toBe(0)
    // A genuinely new player gets the onboarding.
    expect(S.intro).toBe(1)
  })

  it('survives a corrupt cloud blob without wiping the player', async () => {
    const { META_KEY } = await import('@/utils/save/SaveMergePolicy')
    const data = makeFakeData({
      [MANIFEST_KEY]: JSON.stringify([STATE_KEY, META_KEY]),
      [STATE_KEY]: '{not json at all',
      [META_KEY]: JSON.stringify({
        savedAt: '2026-05-19T00:00:00.000Z',
        progressScore: 5000, schemaVersion: 1, maxStage: 10
      })
    })
    // A corrupt blob must degrade to defaults, not throw during boot.
    await expect(bootCloudOnly(data)).resolves.toBeDefined()
    const { S, load } = await import('@/game/duel/state')
    expect(() => load()).not.toThrow()
    expect(S.coins).toBe(0)
  })
})

describe('reload round-trip', () => {
  it('a duel won before the reload is still there after it', async () => {
    // ── Session 1: win the first duel, then flush at the checkpoint. ──
    const data = makeFakeData()
    const m1 = await bootCloudOnly(data)
    const { S, save } = await import('@/game/duel/state')
    const { winCoins } = await import('@/game/duel/config')
    S.coins += winCoins(0)
    S.wins++
    S.foe = 1
    S.intro = 0
    save()
    // The checkpoint flush the scene calls when a duel ends (`flushSaveNow`):
    // drains the debounced blob write into the SaveManager, then the cloud.
    const { flushSaveNow } = await import('@/use/useSaveStatus')
    await flushSaveNow()
    await m1.flush()

    // ── Session 2: a cold boot against the same cloud store. ──
    // Drain session 1's pending persist timer first: a late fire would write
    // session 1's blob into session 2's store and read as a phantom hydrate.
    const { flushPersist } = await import('@/use/useGameState')
    flushPersist()
    vi.resetModules()
    localStorage.clear()
    const data2 = makeFakeData(Object.fromEntries(data.store))
    await bootCloudOnly(data2)

    const state2 = await import('@/game/duel/state')
    state2.load()
    expect(state2.S.coins).toBe(winCoins(0))
    expect(state2.S.wins).toBe(1)
    // The ladder moved on, so the next duel is against the second rung.
    expect(state2.S.foe).toBe(1)
    expect(state2.S.intro).toBe(0)
  })
})
