// The hidden QA interstitial chord: thirty taps in a row on the foe's HP bar
// request an interstitial.
//
// Interstitials are paced (nothing in a session's first four minutes, then
// 121 s apart), so the things portals actually grade cost minutes of play per
// attempt to look at. They are the music hard-stop, the loop pause, and the
// music coming back on a no-fill. This is the back door that makes them
// checkable on the submitted bundle.
//
// Asserted here: what "in a row" means, and that the back door still pays the
// debts every real placement pays. The second half is easy to get wrong and
// impossible to see.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const showMidgameAd = vi.fn(() => Promise.resolve())
const markInterstitialShown = vi.fn()
const resumeMusicAfterAd = vi.fn()
const adShowing = ref(false)

const load = async () => {
  vi.resetModules()
  vi.doMock('@/use/useAds', () => ({ showMidgameAd }))
  vi.doMock('@/use/useAdGate', () => ({ markInterstitialShown }))
  vi.doMock('@/use/useSound', () => ({ resumeMusicAfterAd }))
  vi.doMock('@/use/useGamePause', () => ({ isAdShowing: adShowing }))
  return await import('@/use/useQaAdTrigger')
}

/** Let the `.catch().finally()` chain on the ad promise settle. */
const settle = async () => {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

/** `n` taps, `stepMs` apart, starting at `from`. Returns the clock afterwards. */
const tap = (
  mod: { registerQaAdTap: (now?: number) => boolean },
  n: number,
  from: number,
  stepMs = 100
): number => {
  let at = from
  for (let i = 0; i < n; i++) {
    mod.registerQaAdTap(at)
    at += stepMs
  }
  return at
}

beforeEach(() => {
  showMidgameAd.mockClear().mockResolvedValue(undefined)
  markInterstitialShown.mockClear()
  resumeMusicAfterAd.mockClear()
  adShowing.value = false
})

afterEach(() => {
  vi.doUnmock('@/use/useAds')
  vi.doUnmock('@/use/useAdGate')
  vi.doUnmock('@/use/useSound')
  vi.doUnmock('@/use/useGamePause')
})

describe('the hidden QA ad chord', () => {
  it('stays shut for twenty-nine taps and opens on the thirtieth', async () => {
    const mod = await load()
    expect(mod.QA_AD_TAPS).toBe(30)
    tap(mod, mod.QA_AD_TAPS - 1, 1000)
    expect(showMidgameAd).not.toHaveBeenCalled()

    expect(mod.registerQaAdTap(1000 + (mod.QA_AD_TAPS - 1) * 100)).toBe(true)
    expect(showMidgameAd).toHaveBeenCalledTimes(1)
  })

  it('a press anywhere else breaks the chain', async () => {
    const mod = await load()
    const t = tap(mod, mod.QA_AD_TAPS - 1, 1000)
    // One stroke on the pad in between: the taps are no longer consecutive.
    mod.breakQaAdChain()
    expect(mod.registerQaAdTap(t)).toBe(false)
    expect(showMidgameAd).not.toHaveBeenCalled()
    // That tap was tap ONE of a new chain: 28 more stay shut, the 29th opens.
    const u = tap(mod, mod.QA_AD_TAPS - 2, t + 100)
    expect(showMidgameAd).not.toHaveBeenCalled()
    expect(mod.registerQaAdTap(u)).toBe(true)
  })

  it('a pause longer than the allowed gap starts the count over', async () => {
    const mod = await load()
    const t = tap(mod, mod.QA_AD_TAPS - 1, 1000)
    const late = t - 100 + mod.QA_AD_MAX_GAP_MS + 1
    expect(mod.registerQaAdTap(late)).toBe(false)
    expect(showMidgameAd).not.toHaveBeenCalled()
    // …that late tap was tap ONE of a new chain.
    tap(mod, mod.QA_AD_TAPS - 1, late + 100)
    expect(showMidgameAd).toHaveBeenCalledTimes(1)
  })

  it('tolerates a hesitation up to the gap: a slow, steady tester still gets in', async () => {
    const mod = await load()
    tap(mod, mod.QA_AD_TAPS, 1000, mod.QA_AD_MAX_GAP_MS)
    expect(showMidgameAd).toHaveBeenCalledTimes(1)
  })

  it('seeds the shared interstitial clock, so the next placement still owes its gap', async () => {
    const mod = await load()
    tap(mod, mod.QA_AD_TAPS, 1000)
    // Bypassing the PACING gate is the point; leaving the clock unseeded is not.
    // Without this a tester hands the portal two ads inside the 121 s window it
    // rate-limits on, which is the abuse that limit exists to catch.
    expect(markInterstitialShown).toHaveBeenCalledTimes(1)
  })

  it('restarts the music afterwards — it interrupted a live duel', async () => {
    const mod = await load()
    tap(mod, mod.QA_AD_TAPS, 1000)
    await settle()
    expect(resumeMusicAfterAd).toHaveBeenCalledTimes(1)
  })

  it('restarts the music when the ad throws as well', async () => {
    const mod = await load()
    // `showMidgameAd` swallows provider errors itself, but a rejection here has
    // to leave the game with sound either way: the failure mode this guards is
    // a silent session, and it must not depend on who catches what.
    showMidgameAd.mockRejectedValueOnce(new Error('no fill'))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    tap(mod, mod.QA_AD_TAPS, 1000)
    await settle()
    expect(resumeMusicAfterAd).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })

  it('will not stack a second request behind an ad it is still waiting on', async () => {
    const mod = await load()
    let release: (() => void) | undefined
    showMidgameAd.mockReturnValueOnce(new Promise<void>((r) => { release = () => r() }))
    tap(mod, mod.QA_AD_TAPS, 1000)
    expect(showMidgameAd).toHaveBeenCalledTimes(1)

    // A tester who keeps tapping through the ad earns nothing.
    tap(mod, mod.QA_AD_TAPS, 5000)
    expect(showMidgameAd).toHaveBeenCalledTimes(1)

    release?.()
    await settle()
    tap(mod, mod.QA_AD_TAPS, 100_000)
    expect(showMidgameAd).toHaveBeenCalledTimes(2)
  })

  it('refuses while any other placement has an ad on screen', async () => {
    const mod = await load()
    adShowing.value = true
    tap(mod, mod.QA_AD_TAPS, 1000)
    expect(showMidgameAd).not.toHaveBeenCalled()
  })

  it('spends the chain on a refusal instead of leaving the counter armed', async () => {
    const mod = await load()
    adShowing.value = true
    const t = tap(mod, mod.QA_AD_TAPS, 1000)
    adShowing.value = false
    // The very next tap must not be the one that opens the door. A refused
    // chain has to be re-earned, or the ad that could not open opens on tap 31.
    expect(mod.registerQaAdTap(t)).toBe(false)
    expect(showMidgameAd).not.toHaveBeenCalled()
  })

  it('needs a fresh thirty after every ad', async () => {
    const mod = await load()
    const t = tap(mod, mod.QA_AD_TAPS, 1000)
    await settle()
    expect(showMidgameAd).toHaveBeenCalledTimes(1)

    const u = tap(mod, mod.QA_AD_TAPS - 1, t)
    expect(showMidgameAd).toHaveBeenCalledTimes(1)
    mod.registerQaAdTap(u)
    expect(showMidgameAd).toHaveBeenCalledTimes(2)
  })
})
