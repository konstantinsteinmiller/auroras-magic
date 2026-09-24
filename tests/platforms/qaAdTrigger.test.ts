// The hidden QA ad chords: thirty taps in a row on the foe's HP bar request an
// interstitial; twenty on the storybook's bookmark request one too, and after
// that the bookmark alternates — the next twenty a REWARDED ad (so Poki's QA
// sees a rewardedBreak), then an interstitial again.
//
// Interstitials are paced (nothing in a session's first four minutes of play,
// then 160 s apart), so the things portals actually grade cost minutes of play
// per attempt to look at. They are the music hard-stop, the loop pause, and the
// music coming back on a no-fill. This is the back door that makes them
// checkable on the submitted bundle.
//
// Asserted here: what "in a row" means, and that the back door still pays the
// debts every real placement pays. The second half is easy to get wrong and
// impossible to see.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const showMidgameAd = vi.fn(() => Promise.resolve())
const showRewardedAd = vi.fn(() => Promise.resolve(true))
const markInterstitialShown = vi.fn()
const resumeMusicAfterAd = vi.fn()
const adShowing = ref(false)

const load = async () => {
  vi.resetModules()
  vi.doMock('@/use/useAds', () => ({ showMidgameAd, showRewardedAd }))
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
  showRewardedAd.mockClear().mockResolvedValue(true)
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
    // Without this a tester hands the portal two ads inside the 160 s window it
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

describe('the hidden QA chord on the storybook bookmark', () => {
  /** `n` bookmark taps, `stepMs` apart, from `from`; the kinds they fired, and the clock after. */
  const taps = (
    mod: { registerBookmarkTap: (now?: number) => string | null },
    n: number,
    from: number,
    stepMs = 100
  ): { fired: (string | null)[]; at: number } => {
    const fired: (string | null)[] = []
    let at = from
    for (let i = 0; i < n; i++) {
      const k = mod.registerBookmarkTap(at)
      if (k) fired.push(k)
      at += stepMs
    }
    return { fired, at }
  }

  it('stays shut for nineteen taps and requests an interstitial on the twentieth', async () => {
    const mod = await load()
    expect(mod.QA_BOOKMARK_TAPS).toBe(20)
    const { at } = taps(mod, mod.QA_BOOKMARK_TAPS - 1, 1000)
    expect(showMidgameAd).not.toHaveBeenCalled()
    expect(mod.registerBookmarkTap(at)).toBe('interstitial')
    expect(showMidgameAd).toHaveBeenCalledTimes(1)
    expect(showRewardedAd).not.toHaveBeenCalled()
    // An interstitial all the same: it seeds the shared clock.
    expect(markInterstitialShown).toHaveBeenCalledTimes(1)
  })

  it('alternates: interstitial, then a REWARDED ad, then an interstitial again', async () => {
    const mod = await load()
    let t = 1000
    const kinds: (string | null)[] = []
    for (let round = 0; round < 4; round++) {
      const r = taps(mod, mod.QA_BOOKMARK_TAPS, t)
      kinds.push(...r.fired)
      await settle()
      t = r.at + 5000
    }
    expect(kinds).toEqual(['interstitial', 'rewarded', 'interstitial', 'rewarded'])
    expect(showMidgameAd).toHaveBeenCalledTimes(2)
    expect(showRewardedAd).toHaveBeenCalledTimes(2)
    // The rewarded one is not an interstitial: it leaves the clock alone.
    expect(markInterstitialShown).toHaveBeenCalledTimes(2)
  })

  it('the rewarded one goes through the real rewarded path and restarts the music', async () => {
    const mod = await load()
    let r = taps(mod, mod.QA_BOOKMARK_TAPS, 1000)
    await settle()
    resumeMusicAfterAd.mockClear()
    r = taps(mod, mod.QA_BOOKMARK_TAPS, r.at + 5000)
    expect(r.fired).toEqual(['rewarded'])
    // `showRewardedAd` is the provider's rewardedBreak behind the pause gate
    // and the audio kill — the thing Poki's QA has to see.
    expect(showRewardedAd).toHaveBeenCalledTimes(1)
    await settle()
    expect(resumeMusicAfterAd).toHaveBeenCalledTimes(1)
  })

  it('restarts the music when the rewarded ad throws as well', async () => {
    const mod = await load()
    let r = taps(mod, mod.QA_BOOKMARK_TAPS, 1000)
    await settle()
    resumeMusicAfterAd.mockClear()
    showRewardedAd.mockRejectedValueOnce(new Error('no fill'))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    r = taps(mod, mod.QA_BOOKMARK_TAPS, r.at + 5000)
    expect(r.fired).toEqual(['rewarded'])
    await settle()
    expect(resumeMusicAfterAd).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })

  it('any other press on the book breaks the chain', async () => {
    const mod = await load()
    const { at } = taps(mod, mod.QA_BOOKMARK_TAPS - 1, 1000)
    mod.breakBookmarkChain()
    expect(mod.registerBookmarkTap(at)).toBeNull()
    expect(showMidgameAd).not.toHaveBeenCalled()
    // That tap was tap ONE of a new chain.
    const r = taps(mod, mod.QA_BOOKMARK_TAPS - 1, at + 100)
    expect(r.fired).toEqual(['interstitial'])
  })

  it('a pause longer than the allowed gap starts the count over', async () => {
    const mod = await load()
    const { at } = taps(mod, mod.QA_BOOKMARK_TAPS - 1, 1000)
    const late = at - 100 + mod.QA_AD_MAX_GAP_MS + 1
    expect(mod.registerBookmarkTap(late)).toBeNull()
    expect(showMidgameAd).not.toHaveBeenCalled()
  })

  it('a refused chord does not advance the alternation', async () => {
    const mod = await load()
    adShowing.value = true
    let r = taps(mod, mod.QA_BOOKMARK_TAPS, 1000)
    expect(r.fired).toEqual([])
    adShowing.value = false
    // Nothing played, so the next chord is still the interstitial.
    r = taps(mod, mod.QA_BOOKMARK_TAPS, r.at + 5000)
    expect(r.fired).toEqual(['interstitial'])
    expect(showRewardedAd).not.toHaveBeenCalled()
  })

  it('will not stack a request behind an ad it is still waiting on', async () => {
    const mod = await load()
    let release: (() => void) | undefined
    showMidgameAd.mockReturnValueOnce(new Promise<void>((r) => { release = () => r() }))
    let r = taps(mod, mod.QA_BOOKMARK_TAPS, 1000)
    expect(r.fired).toEqual(['interstitial'])
    // Twenty more while that one is up: refused, and the rewarded turn kept.
    r = taps(mod, mod.QA_BOOKMARK_TAPS, r.at + 100)
    expect(r.fired).toEqual([])
    expect(showRewardedAd).not.toHaveBeenCalled()
    release?.()
    await settle()
    r = taps(mod, mod.QA_BOOKMARK_TAPS, r.at + 5000)
    expect(r.fired).toEqual(['rewarded'])
  })

  it('leaves the foe-HP chord working, and the two chains apart', async () => {
    const mod = await load()
    // Taps on the bookmark do not count toward the HP bar's thirty…
    taps(mod, mod.QA_BOOKMARK_TAPS - 1, 1000)
    tap(mod, mod.QA_AD_TAPS - 1, 10_000)
    expect(showMidgameAd).not.toHaveBeenCalled()
    expect(mod.registerQaAdTap(10_000 + (mod.QA_AD_TAPS - 1) * 100)).toBe(true)
    expect(showMidgameAd).toHaveBeenCalledTimes(1)
    await settle()
    // …and the HP bar's interstitial does not take the bookmark's turn: its
    // first completed chord is still an interstitial.
    const r = taps(mod, mod.QA_BOOKMARK_TAPS, 50_000)
    expect(r.fired).toEqual(['interstitial'])
  })
})
