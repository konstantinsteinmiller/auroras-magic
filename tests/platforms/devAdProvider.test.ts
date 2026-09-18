// The dev server's simulated ads. They exist so the ad placements can be seen
// and clicked under `pnpm dev`, where the noop provider would otherwise hide
// every rewarded button and never fire an interstitial.
//
// Two halves: the provider honours the AdProvider contract that `useAds` relies
// on (impression on open, resolve on close, `true` only for a completed
// rewarded), and it can never be what a build or the test suite resolves.

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const load = async () => {
  vi.resetModules()
  return await import('@/use/ads/DevAdProvider')
}

const card = (): HTMLElement | null => document.querySelector('[data-dev-ad]')

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'performance'] })
  localStorage.clear()
})
afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('DevAdProvider', () => {
  it('is ready at once, for both formats', async () => {
    const { createDevAdProvider } = await load()
    const p = createDevAdProvider()
    expect(p.name).toBe('dev')
    expect(p.isRewardedReady.value).toBe(true)
    expect(p.isInterstitialReady.value).toBe(true)
    expect(p.isAdsBlocked.value).toBe(false)
  })

  it('interstitial: reports the impression on open and resolves when the card closes', async () => {
    const { createDevAdProvider } = await load()
    const onImpression = vi.fn()
    let done = false
    const run = createDevAdProvider().showMidgameAd(onImpression).then(() => { done = true })

    expect(onImpression).toHaveBeenCalledTimes(1)
    expect(card()?.dataset.devAd).toBe('interstitial')
    await vi.advanceTimersByTimeAsync(2000)
    expect(done).toBe(false)
    await vi.advanceTimersByTimeAsync(700)
    await run
    expect(card()).toBeNull()
  })

  it('rewarded: a watched ad resolves true', async () => {
    const { createDevAdProvider } = await load()
    const run = createDevAdProvider().showRewardedAd()
    expect(card()?.dataset.devAd).toBe('rewarded')
    await vi.advanceTimersByTimeAsync(4200)
    await expect(run).resolves.toBe(true)
    expect(card()).toBeNull()
  })

  it('rewarded: Skip resolves false, so no reward is granted', async () => {
    const { createDevAdProvider } = await load()
    const run = createDevAdProvider().showRewardedAd()
    card()!.querySelector('button')!.click()
    await expect(run).resolves.toBe(false)
    expect(card()).toBeNull()
  })

  it('can be switched off from localStorage', async () => {
    const { isDevAdsEnabled } = await load()
    expect(isDevAdsEnabled()).toBe(true)
    localStorage.setItem('am_dev_ads', 'off')
    expect(isDevAdsEnabled()).toBe(false)
  })
})

describe('where the simulated ads may resolve', () => {
  it('not under the test suite: every other suite asserts the real resolution', async () => {
    vi.resetModules()
    const { resolveAdProvider } = await import('@/platforms/resolveAdProvider')
    const provider = resolveAdProvider({ flags: {} as never, showMediatorAds: false, isNative: false })
    expect(provider.name).toBe('noop')
  })

  it('only behind the dev-server literals, which fold to false in every build', () => {
    // The branch cannot be imported from a test with DEV false, so the guard is
    // pinned at source level. `tools/pack` also refuses any archive that carries
    // the module's marker string.
    const src = readFileSync(resolve(__dirname, '../../src/platforms/resolveAdProvider.ts'), 'utf8')
    expect(src).toMatch(
      /if \(import\.meta\.env\.DEV && import\.meta\.env\.MODE === 'development' && isDevAdsEnabled\(\)\) \{\s*return createDevAdProvider\(\)/
    )
    expect(src.match(/createDevAdProvider\(\)/g)).toHaveLength(1)
  })
})
