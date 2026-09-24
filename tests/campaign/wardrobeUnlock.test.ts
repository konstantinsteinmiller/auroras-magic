// The dressing room's rewarded alternatives (owner, 2026-09-23): the second
// shelf (keepsakes 9–22) is in no chest; each is unlocked in the wardrobe by
// one rewarded video — or free, with a plain label, on a build where no video
// can play (noop, the CG pre-release, Wavedash).
//
// Driven through the REAL `useAdGate` (only the provider, the build flags, the
// save flush and the music are stubbed), so the gate's own rules — readiness,
// the in-flight lock, the free/video split — are what is under test.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { COSMETICS, COSMETIC_SLOTS } from '@/game/campaign/tables'

type Opts = { provider?: string; crazy?: boolean; fullRelease?: boolean; wavedash?: boolean; rewardedReady?: boolean }

const showRewardedAd = vi.fn(async () => true)
const resumeMusicAfterAd = vi.fn()
const flushSaveNow = vi.fn(async () => {})

const load = async (opts: Opts = {}) => {
  vi.resetModules()
  vi.doMock('@/use/useUser', () => ({ isCrazyWeb: opts.crazy ?? false, isWaveDash: opts.wavedash ?? false }))
  vi.doMock('@/use/useMatch', () => ({ isCrazyGamesFullRelease: opts.fullRelease ?? false }))
  vi.doMock('@/use/useAds', async () => {
    const { ref } = await import('vue')
    return {
      adProviderName: opts.provider ?? (opts.crazy ? 'crazygames' : 'noop'),
      isRewardedReady: ref(opts.rewardedReady ?? true),
      showRewardedAd
    }
  })
  vi.doMock('@/use/useSound', () => ({ resumeMusicAfterAd }))
  vi.doMock('@/use/useSaveStatus', () => ({ flushSaveNow }))
  const { S } = await import('@/game/duel/state')
  const { defaultCampaign } = await import('@/game/campaign/state')
  S.campaign = defaultCampaign()
  const mod = await import('@/use/useWardrobeUnlock')
  return { ...mod, S }
}

const ACORN_CAP = COSMETICS.findIndex((c) => c.slug === 'acornCap')
const HEAD = COSMETIC_SLOTS.indexOf('head')

beforeEach(() => {
  showRewardedAd.mockReset().mockResolvedValue(true)
  resumeMusicAfterAd.mockClear()
  flushSaveNow.mockClear()
})
afterEach(() => {
  for (const m of ['@/use/useUser', '@/use/useMatch', '@/use/useAds', '@/use/useSound', '@/use/useSaveStatus']) vi.doUnmock(m)
})

describe('unlocking a wardrobe alternative', () => {
  it('is the acorn cap we think it is', () => {
    expect(ACORN_CAP).toBe(9)
  })

  it('on a build with rewarded videos: plays one, then it is hers, worn and saved', async () => {
    const m = await load({ provider: 'poki' })
    expect(m.unlockMode).toBe('video')
    expect(m.isLockedAlternative(ACORN_CAP)).toBe(true)
    await expect(m.unlockAlternative(ACORN_CAP)).resolves.toBe(true)
    expect(showRewardedAd).toHaveBeenCalledTimes(1)
    expect(m.ownsKeepsake(ACORN_CAP)).toBe(true)
    expect(m.S.campaign.giftsEquipped[HEAD]).toBe(ACORN_CAP)
    // A video was watched for it: it is on disk at once, not at the next save.
    expect(flushSaveNow).toHaveBeenCalled()
    // The ad hard-stopped the music; the wardrobe has no duel to restart it.
    expect(resumeMusicAfterAd).toHaveBeenCalledTimes(1)
    // Unlocked is unlocked: nothing left to sell.
    expect(m.isLockedAlternative(ACORN_CAP)).toBe(false)
    await expect(m.unlockAlternative(ACORN_CAP)).resolves.toBe(false)
    expect(showRewardedAd).toHaveBeenCalledTimes(1)
  })

  it('a dismissed or unfilled video gives nothing, and the music still comes back', async () => {
    const m = await load({ provider: 'gamepix' })
    showRewardedAd.mockResolvedValueOnce(false)
    await expect(m.unlockAlternative(ACORN_CAP)).resolves.toBe(false)
    expect(m.ownsKeepsake(ACORN_CAP)).toBe(false)
    expect(m.S.campaign.giftsEquipped[HEAD]).toBe(-1)
    expect(resumeMusicAfterAd).toHaveBeenCalledTimes(1)
  })

  it('waits — no request at all — while no video is ready', async () => {
    const m = await load({ provider: 'playgama', rewardedReady: false })
    expect(m.canOfferUnlock.value).toBe(false)
    await expect(m.unlockAlternative(ACORN_CAP)).resolves.toBe(false)
    expect(showRewardedAd).not.toHaveBeenCalled()
    expect(m.ownsKeepsake(ACORN_CAP)).toBe(false)
  })

  it.each([
    ['plain web / itch (noop)', { provider: 'noop' }],
    ['the CrazyGames pre-release', { crazy: true, fullRelease: false }],
    ['Wavedash', { wavedash: true, provider: 'noop' }]
  ] as const)('is free, with no video, on %s', async (_name, opts) => {
    const m = await load(opts)
    expect(m.unlockMode).toBe('free')
    expect(m.canOfferUnlock.value).toBe(true)
    await expect(m.unlockAlternative(ACORN_CAP)).resolves.toBe(true)
    expect(showRewardedAd).not.toHaveBeenCalled()
    expect(resumeMusicAfterAd).not.toHaveBeenCalled()
    expect(m.ownsKeepsake(ACORN_CAP)).toBe(true)
    expect(m.S.campaign.giftsEquipped[HEAD]).toBe(ACORN_CAP)
  })

  it('never sells a story keepsake — those come from the chests', async () => {
    const m = await load({ provider: 'poki' })
    for (let id = 0; id < 9; id++) {
      expect(m.isLockedAlternative(id), COSMETICS[id]!.slug).toBe(false)
      await expect(m.unlockAlternative(id)).resolves.toBe(false)
    }
    expect(showRewardedAd).not.toHaveBeenCalled()
    expect(m.S.campaign.giftsOwned).toBe(0)
  })

  it('keeps what an older save already owns, and touches no other bit', async () => {
    const m = await load({ provider: 'noop' })
    // The crown (a chest's) and the bubble trail (the old schedule's).
    m.S.campaign.giftsOwned = (1 << 0) | (1 << 10)
    expect(m.isLockedAlternative(10)).toBe(false)
    await m.unlockAlternative(ACORN_CAP)
    expect(m.S.campaign.giftsOwned).toBe((1 << 0) | (1 << 10) | (1 << ACORN_CAP))
  })
})
