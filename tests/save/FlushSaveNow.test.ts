import { beforeEach, describe, expect, it, vi } from 'vitest'

// ─── flushSaveNow — immediate checkpoint flush (the CG "progress lost on
// reload" regression) ───────────────────────────────────────────────────────
//
// On the CrazyGames cloud-only build, a won duel writes the new ladder rung into
// `auroras_magic_state`, but the push to `sdk.data` only fires after the persist (~200ms)
// + strategy-flush (~250ms) debounces, and the async cloud write then takes
// time to land. A player who wins and reloads a moment later beats that
// pipeline → the reload restores the OLD rung.
//
// `flushSaveNow()` (called at every hard checkpoint) forces the whole pipeline to
// drain synchronously-as-possible: write `auroras_magic_state` now → SaveManager proxy →
// strategy dirty → `manager.flush()` → backend. This test proves a checkpoint write
// reaches the (fake) backend right after `flushSaveNow()` WITHOUT advancing any
// timers — i.e. it does not wait for either debounce.

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
  return manager
}

beforeEach(() => {
  localStorage.clear()
  vi.resetModules()
})

describe('flushSaveNow — immediate flush on a hard checkpoint', () => {
  it('pushes a pending stage write to the backend without waiting for the debounce', async () => {
    const data = makeFakeData()
    await bootCloudOnly(data)

    const { setState } = await import('@/use/useGameState')
    const { flushSaveNow } = await import('@/use/useSaveStatus')

    // A cleared stage writes the new best into auroras_magic_state (still sitting on the
    // debounce timers — nothing has reached the cloud yet).
    setState('am_ladder', 2)
    expect(data.store.get(STATE_KEY)).toBeUndefined()

    // The checkpoint flush drains everything immediately — no fake timers.
    await flushSaveNow()

    const cloudBlob = JSON.parse(data.store.get(STATE_KEY) || '{}')
    expect(cloudBlob.am_ladder).toBe(2)
  })

  it('also carries coexisting progress written in the same checkpoint', async () => {
    const data = makeFakeData()
    await bootCloudOnly(data)

    const { setState } = await import('@/use/useGameState')
    const { flushSaveNow } = await import('@/use/useSaveStatus')

    setState('am_wins', 7)
    setState('am_ladder', 3)
    await flushSaveNow()

    const cloudBlob = JSON.parse(data.store.get(STATE_KEY) || '{}')
    expect(cloudBlob.am_ladder).toBe(3)
    expect(cloudBlob.am_wins).toBe(7)
  })
})

// A short tick that lets a fire-and-forget `void flushSaveNow()` async chain
// settle WITHOUT advancing far enough to trip the 200ms persist debounce — so
// anything in the cloud after it got there via the immediate checkpoint flush,
// not the throttle.
const settle = () => new Promise((r) => setTimeout(r, 0))

describe('discrete story events reach the backend without the debounce', () => {
  it('a won node writes the campaign, the tally and the schema in one checkpoint', async () => {
    const data = makeFakeData()
    await bootCloudOnly(data)
    const { S, save } = await import('@/game/duel/state')
    const { flushSaveNow } = await import('@/use/useSaveStatus')

    // What the campaign controller leaves behind after winning node 1-1.
    S.wins = 1
    S.campaign.furthestNode = 0
    save()
    await flushSaveNow()

    const blob = JSON.parse(data.store.get(STATE_KEY) || '{}')
    expect(blob.am_campaign.furthestNode).toBe(0)
    expect(blob.am_wins).toBe(1)
    expect(blob.am_duels).toBe(1)
    expect(blob.am_schema).toBe(2)
    // D3: the currency and the ranks are gone for good.
    expect(blob.am_coins).toBeUndefined()
    expect(blob.am_upgrades).toBeUndefined()
  })

  it('a restored sector flushes its done bit and drops the in-progress coverage', async () => {
    const data = makeFakeData()
    await bootCloudOnly(data)
    const { S, save } = await import('@/game/duel/state')
    const { setBit, hasBit } = await import('@/game/campaign/bitset')
    const { flushSaveNow } = await import('@/use/useSaveStatus')

    S.campaign.furthestNode = 0
    S.campaign.wipeCoverage = 'A'.repeat(56)
    save()
    // The reveal wave lands (wipe.ts `finishWave`): done bit + coverage cleared.
    S.campaign.sectorsDone = setBit(S.campaign.sectorsDone, 0)
    S.campaign.wipeCoverage = null
    save()
    void flushSaveNow()
    await settle()
    await flushSaveNow()

    const blob = JSON.parse(data.store.get(STATE_KEY) || '{}')
    expect(hasBit(blob.am_campaign.sectorsDone, 0)).toBe(true)
    expect(blob.am_campaign.wipeCoverage).toBeNull()
  })
})
