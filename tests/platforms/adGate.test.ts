import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The ad gate decides two things that are easy to get subtly wrong and
 * expensive to get wrong in review:
 *
 *   1. WHICH BUILDS charge for a perk. Shipping a gated perk on a build with no
 *      ad inventory makes the perk permanently unavailable.
 *   2. HOW OFTEN an interstitial may fire. Portals reject builds that stack
 *      breaks back to back, and the very first seconds of a session are the
 *      worst possible moment for one.
 */

type GateOpts = {
  crazy?: boolean
  wavedash?: boolean
  fullRelease?: boolean
  rewardedReady?: boolean
  /** Which ad provider resolved. `'noop'` is local dev / plain web. */
  provider?: string
}

const loadGate = async (opts: GateOpts = {}) => {
  vi.resetModules()
  vi.doMock('@/use/useUser', () => ({
    isCrazyWeb: opts.crazy ?? false,
    isWaveDash: opts.wavedash ?? false
  }))
  vi.doMock('@/use/useMatch', () => ({ isCrazyGamesFullRelease: opts.fullRelease ?? false }))
  const showRewardedAd = vi.fn(async () => true)
  vi.doMock('@/use/useAds', async () => {
    const { ref } = await import('vue')
    return {
      // Default follows the build: a CG build resolves the CG provider, and
      // anything else defaults to noop unless the test names one.
      adProviderName: opts.provider ?? (opts.crazy ? 'crazygames' : 'noop'),
      isRewardedReady: ref(opts.rewardedReady ?? true),
      showRewardedAd
    }
  })
  const mod = await import('@/use/useAdGate')
  return { ...mod, showRewardedAd }
}

beforeEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('reward gating', () => {
  it('grants the perk for free when no ad provider resolved', async () => {
    // Local dev, plain web, itch — there is no video to play, so a gate would
    // make the perk permanently unavailable.
    const gate = await loadGate({ crazy: false, provider: 'noop' })
    const grant = vi.fn()
    expect(gate.isRewardGated).toBe(false)
    await expect(gate.claimReward(grant)).resolves.toBe(true)
    expect(grant).toHaveBeenCalledTimes(1)
    expect(gate.showRewardedAd).not.toHaveBeenCalled()
  })

  it('plays a rewarded video on every portal that has one', async () => {
    // The bug this locks: the gate used to read `isCrazyWeb && fullRelease`, so
    // five shipping portals with real rewarded inventory handed every perk out
    // for free — the video never played and the placement never earned.
    for (const provider of ['playgama', 'gamepix', 'gamemonetize', 'yandex', 'gameDistribution']) {
      const gate = await loadGate({ crazy: false, provider })
      const grant = vi.fn()
      expect(gate.isRewardGated, `${provider} did not gate the reward`).toBe(true)
      await expect(gate.claimReward(grant)).resolves.toBe(true)
      expect(gate.showRewardedAd, `${provider} skipped the video`).toHaveBeenCalledTimes(1)
      expect(grant).toHaveBeenCalledTimes(1)
    }
  })

  it('offers nothing at all on a CrazyGames build that is not the full release', async () => {
    // The pre-release build is what CG's reviewers play, and it has NO ad
    // inventory: `requestAd` resolves without showing a video. A gate there
    // would render a film-frame button that plays nothing; NO gate — which is
    // what `isRewardGated` resolves to — would hand the +3x payout over for a
    // button press. So the offer is simply not made: no button, no free grant.
    const gate = await loadGate({ crazy: true, fullRelease: false })
    const grant = vi.fn()

    expect(gate.canOfferReward.value).toBe(false)

    // And it is unreachable by any other route, not merely unrendered.
    await expect(gate.claimReward(grant)).resolves.toBe(false)
    expect(grant).not.toHaveBeenCalled()
    expect(gate.showRewardedAd).not.toHaveBeenCalled()
  })

  it('offers nothing at all on a Wavedash build', async () => {
    // Wavedash has no ad SDK, so `resolveAdProvider` falls through to noop and
    // the "no provider → the perk is free" rule above fires. That rule is right
    // for local dev and itch and wrong for a portal: the result screen showed a
    // button marked with a film frame and paid the +3x out on the tap, with no
    // video anywhere. The offer is withdrawn instead, the same way it is on a
    // CG pre-release.
    const gate = await loadGate({ wavedash: true, provider: 'noop' })
    const grant = vi.fn()

    expect(gate.canOfferReward.value).toBe(false)

    // And not reachable by any other route — a free +3x is the failure mode.
    await expect(gate.claimReward(grant)).resolves.toBe(false)
    expect(grant).not.toHaveBeenCalled()
    expect(gate.showRewardedAd).not.toHaveBeenCalled()
  })

  it('plays a rewarded video on the CrazyGames full release', async () => {
    const gate = await loadGate({ crazy: true, fullRelease: true })
    const grant = vi.fn()
    expect(gate.isRewardGated).toBe(true)
    await expect(gate.claimReward(grant)).resolves.toBe(true)
    expect(gate.showRewardedAd).toHaveBeenCalledTimes(1)
    expect(grant).toHaveBeenCalledTimes(1)
  })

  it('grants nothing when the video does not complete', async () => {
    const gate = await loadGate({ crazy: true, fullRelease: true })
    ;(gate.showRewardedAd as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false)
    const grant = vi.fn()
    await expect(gate.claimReward(grant)).resolves.toBe(false)
    expect(grant).not.toHaveBeenCalled()
  })

  it('refuses to start a second video while one is in flight', async () => {
    const gate = await loadGate({ crazy: true, fullRelease: true })
    let release: (v: boolean) => void = () => {}
    ;(gate.showRewardedAd as ReturnType<typeof vi.fn>).mockImplementationOnce(
      () => new Promise<boolean>((r) => { release = r })
    )
    const grantA = vi.fn()
    const grantB = vi.fn()
    const first = gate.claimReward(grantA)
    expect(gate.adInFlight.value).toBe(true)
    await expect(gate.claimReward(grantB)).resolves.toBe(false)
    expect(grantB).not.toHaveBeenCalled()
    release(true)
    await first
    expect(grantA).toHaveBeenCalledTimes(1)
    expect(gate.adInFlight.value).toBe(false)
  })

  it('clears the in-flight flag even when the provider throws', async () => {
    const gate = await loadGate({ crazy: true, fullRelease: true })
    ;(gate.showRewardedAd as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('no fill'))
    await expect(gate.claimReward(vi.fn())).rejects.toThrow('no fill')
    // A stuck flag would disable every reward button for the rest of the run.
    expect(gate.adInFlight.value).toBe(false)
  })

  it('hides the offer on a gated build with no ad ready', async () => {
    const gate = await loadGate({ crazy: true, fullRelease: true, rewardedReady: false })
    expect(gate.canOfferReward.value).toBe(false)
  })

  it('always offers the perk on an ungated NON-CrazyGames build, ad inventory or not', async () => {
    const gate = await loadGate({ crazy: false, fullRelease: false, rewardedReady: false })
    expect(gate.canOfferReward.value).toBe(true)
  })

  it('still offers on the CrazyGames FULL release when an ad is ready', async () => {
    // The pre-release rule must not leak into the released build.
    const gate = await loadGate({ crazy: true, fullRelease: true, rewardedReady: true })
    expect(gate.canOfferReward.value).toBe(true)
  })
})

describe('rewarded-only unlocks (the wardrobe alternatives)', () => {
  // The second shelf can be had in NO other way, so unlike every other perk it
  // is never withheld: a video where one can play, free (plain label, no icon)
  // everywhere else — including the two builds that suppress every other offer.

  it('is free, with no video, when no ad provider resolved', async () => {
    const gate = await loadGate({ provider: 'noop' })
    const grant = vi.fn()
    expect(gate.unlockMode).toBe('free')
    expect(gate.canOfferUnlock.value).toBe(true)
    await expect(gate.claimUnlock(grant)).resolves.toBe(true)
    expect(grant).toHaveBeenCalledTimes(1)
    expect(gate.showRewardedAd).not.toHaveBeenCalled()
  })

  it('is free on the CrazyGames pre-release, where every other offer is withheld', async () => {
    const gate = await loadGate({ crazy: true, fullRelease: false })
    const grant = vi.fn()
    // The Twin Gift is not offered here…
    expect(gate.canOfferReward.value).toBe(false)
    // …but an alternative is not withheld: it is simply free.
    expect(gate.unlockMode).toBe('free')
    expect(gate.canOfferUnlock.value).toBe(true)
    await expect(gate.claimUnlock(grant)).resolves.toBe(true)
    expect(grant).toHaveBeenCalledTimes(1)
    expect(gate.showRewardedAd).not.toHaveBeenCalled()
  })

  it('is free on Wavedash, where every other offer is withheld', async () => {
    const gate = await loadGate({ wavedash: true, provider: 'noop' })
    const grant = vi.fn()
    expect(gate.canOfferReward.value).toBe(false)
    expect(gate.unlockMode).toBe('free')
    await expect(gate.claimUnlock(grant)).resolves.toBe(true)
    expect(grant).toHaveBeenCalledTimes(1)
  })

  it('plays the rewarded video on every portal that has one', async () => {
    for (const provider of ['poki', 'playgama', 'gamepix', 'gamemonetize', 'yandex', 'gameDistribution']) {
      const gate = await loadGate({ provider })
      const grant = vi.fn()
      expect(gate.unlockMode, provider).toBe('video')
      await expect(gate.claimUnlock(grant)).resolves.toBe(true)
      expect(gate.showRewardedAd, `${provider} skipped the video`).toHaveBeenCalledTimes(1)
      expect(grant).toHaveBeenCalledTimes(1)
    }
    const cg = await loadGate({ crazy: true, fullRelease: true })
    expect(cg.unlockMode).toBe('video')
  })

  it('grants nothing when the video does not complete', async () => {
    const gate = await loadGate({ provider: 'poki' })
    ;(gate.showRewardedAd as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false)
    const grant = vi.fn()
    await expect(gate.claimUnlock(grant)).resolves.toBe(false)
    expect(grant).not.toHaveBeenCalled()
  })

  it('waits (is not offered) on a video build with no ad ready, or while one is in flight', async () => {
    const notReady = await loadGate({ provider: 'poki', rewardedReady: false })
    expect(notReady.canOfferUnlock.value).toBe(false)

    const gate = await loadGate({ provider: 'poki' })
    expect(gate.canOfferUnlock.value).toBe(true)
    let release: (v: boolean) => void = () => {}
    ;(gate.showRewardedAd as ReturnType<typeof vi.fn>).mockImplementationOnce(
      () => new Promise<boolean>((r) => { release = r })
    )
    const first = gate.claimUnlock(vi.fn())
    expect(gate.canOfferUnlock.value).toBe(false)
    release(true)
    await first
    expect(gate.canOfferUnlock.value).toBe(true)
  })
})

describe('interstitial pacing', () => {
  // Fixed session start, so every assertion reads as "seconds into the session".
  const T0 = 1_000_000

  const gateAt = async () => {
    vi.useFakeTimers()
    vi.setSystemTime(T0)
    const gate = await loadGate()
    gate.__resetInterstitialClock(T0)
    // The SAME instance the gate imported (`loadGate` reset the module graph).
    const pause = await import('@/use/useGamePause')
    pause.isAdShowing.value = false
    pause.isVisibilityHidden.value = false
    pause.isPlatformPaused.value = false
    return { ...gate, pause }
  }
  const at = (s: number): number => T0 + s * 1000
  /** Move the wall clock to `s` seconds, so a pause flag's edge lands there. */
  const clockTo = (s: number): void => { vi.setSystemTime(at(s)) }

  it('pins the numbers: first ad after 240 s of play, then 160 s apart', async () => {
    const gate = await gateAt()
    expect(gate.FIRST_INTERSTITIAL_AFTER_MS).toBe(240_000)
    expect(gate.INTERSTITIAL_MIN_GAP_MS).toBe(160_000)
  })

  it('shows nothing in the first four minutes of play', async () => {
    const gate = await gateAt()
    // The first duels decide whether a stranger stays. An ad there is the most
    // reliable way to lose them.
    for (const s of [0, 30, 121, 160, 180, 239]) {
      expect(gate.canShowInterstitial(at(s)), `at ${s} s`).toBe(false)
    }
    expect(gate.canShowInterstitial(at(240))).toBe(true)
  })

  it('a chapter boss beaten inside the opening brings the first ad early', async () => {
    const gate = await gateAt()
    // A boss win is its own break (owner, 2026-09-23/24): the chapter-1 boss
    // at 90 s may have the session's first ad…
    expect(gate.canShowInterstitial(at(90), true)).toBe(true)
    // …while an ordinary duel end at the same moment may not.
    expect(gate.canShowInterstitial(at(90))).toBe(false)
    gate.markInterstitialShown(at(90))
    // After it, the 160 s gap holds for EVERY placement — the four-minute mark
    // included, and the next boss too.
    expect(gate.canShowInterstitial(at(240))).toBe(false)
    expect(gate.canShowInterstitial(at(249), true)).toBe(false)
    expect(gate.canShowInterstitial(at(250))).toBe(true)
    expect(gate.canShowInterstitial(at(250), true)).toBe(true)
  })

  it('a REPLAYED boss win inside the opening is an ad moment too (owner, 2026-09-24)', async () => {
    const gate = await gateAt()
    // Any chapter-boss win skips the 240 s grace — first time or replay. The
    // moment has no replay input at all, so a replay cannot be told apart.
    expect(gate.duelEndMoment(true, true)).toBe('boss')
    expect(gate.duelEndMoment(true, false)).toBe('win')
    expect(gate.duelEndMoment(false, true)).toBe('loss')
    expect(gate.duelEndMoment.length).toBe(2)
    // A returning player replays chapter 3's boss 40 s into a session: an ad…
    expect(gate.canShowInterstitial(at(40), gate.duelEndMoment(true, true) === 'boss')).toBe(true)
    gate.markInterstitialShown(at(40))
    // …and the 160 s cooldown still holds for the next replayed boss.
    expect(gate.canShowInterstitial(at(199), true)).toBe(false)
    expect(gate.canShowInterstitial(at(200), true)).toBe(true)
  })

  it('the duel flow asks with any boss win, replay or not', async () => {
    // `duelFlow` is too wired to import here; pin its one call instead. The
    // first-time-only version read `!replay && nodeIsBoss(n)`.
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const src = readFileSync(resolve(__dirname, '../../src/game/flow/duelFlow.ts'), 'utf8')
    expect(src).toMatch(/maybeShowInterstitial\(duelEndMoment\(true, nodeIsBoss\(n\)\)\)/)
    expect(src).not.toMatch(/!replay && nodeIsBoss/)
    expect(src).toMatch(/canShowInterstitial\(Date\.now\(\), trigger === 'boss'\)/)
  })

  it('a later boss win shows one only if the cooldown allows', async () => {
    const gate = await gateAt()
    gate.markInterstitialShown(at(300))
    expect(gate.canShowInterstitial(at(400), true)).toBe(false)
    expect(gate.canShowInterstitial(at(460), true)).toBe(true)
  })

  it('asking does not start a clock', async () => {
    const gate = await gateAt()
    // The old gate started its clock on the first ASK, so the first ad drifted
    // to "N s after the first duel ended" instead of a fixed point in play.
    // Asking early must not move the first opportunity.
    gate.canShowInterstitial(at(10))
    gate.canShowInterstitial(at(200), true)
    expect(gate.canShowInterstitial(at(240))).toBe(true)
  })

  it('holds 160 s of play after every ad', async () => {
    const gate = await gateAt()
    gate.markInterstitialShown(at(250))
    expect(gate.canShowInterstitial(at(250))).toBe(false)
    expect(gate.canShowInterstitial(at(409))).toBe(false)
    expect(gate.canShowInterstitial(at(410))).toBe(true)
  })

  it('a first-load ad does not open the opening window early', async () => {
    const gate = await gateAt()
    // GameMonetize / GamePix / GameDistribution show a mandated ad at the splash
    // and seed the clock. The next ordinary ad still waits for the four-minute
    // mark, not just 160 s after that one…
    gate.markInterstitialShown(at(3))
    expect(gate.canShowInterstitial(at(163))).toBe(false)
    expect(gate.canShowInterstitial(at(239))).toBe(false)
    expect(gate.canShowInterstitial(at(240))).toBe(true)
    // …and a boss inside the opening still owes that ad its full gap.
    expect(gate.canShowInterstitial(at(162), true)).toBe(false)
    expect(gate.canShowInterstitial(at(163), true)).toBe(true)
  })

  it('an ad late in the opening pushes the next one past 240 s', async () => {
    const gate = await gateAt()
    // The hidden QA chord bypasses pacing but seeds the clock. At 200 s, the
    // next paced ad is due at 360 s, not at the four-minute mark.
    gate.markInterstitialShown(at(200))
    expect(gate.canShowInterstitial(at(240))).toBe(false)
    expect(gate.canShowInterstitial(at(359))).toBe(false)
    expect(gate.canShowInterstitial(at(360))).toBe(true)
  })

  it('a hidden tab is not playtime', async () => {
    const gate = await gateAt()
    // Hidden from 60 s to 160 s: those 100 s never happened, as far as the
    // opening is concerned.
    clockTo(60)
    gate.pause.isVisibilityHidden.value = true
    expect(gate.playtimeMs(at(160))).toBe(60_000)
    clockTo(160)
    gate.pause.isVisibilityHidden.value = false
    expect(gate.canShowInterstitial(at(339))).toBe(false)
    expect(gate.canShowInterstitial(at(340))).toBe(true)
    expect(gate.playtimeMs(at(340))).toBe(240_000)
  })

  it('a hidden tab does not wear the cooldown down either', async () => {
    const gate = await gateAt()
    gate.markInterstitialShown(at(300))
    clockTo(310)
    gate.pause.isVisibilityHidden.value = true
    clockTo(1000)
    gate.pause.isVisibilityHidden.value = false
    // Ten minutes away: still only 10 s of play since that ad.
    expect(gate.canShowInterstitial(at(1000))).toBe(false)
    expect(gate.canShowInterstitial(at(1149))).toBe(false)
    expect(gate.canShowInterstitial(at(1150))).toBe(true)
  })

  it('neither the ad itself nor a portal pause counts', async () => {
    const gate = await gateAt()
    clockTo(20)
    gate.pause.isAdShowing.value = true
    clockTo(50)
    gate.pause.isAdShowing.value = false
    clockTo(100)
    gate.pause.isPlatformPaused.value = true
    clockTo(130)
    gate.pause.isPlatformPaused.value = false
    // 300 s of wall clock, 60 s of it an ad or a portal pause.
    expect(gate.playtimeMs(at(300))).toBe(240_000)
    expect(gate.canShowInterstitial(at(299))).toBe(false)
    expect(gate.canShowInterstitial(at(300))).toBe(true)
  })

  it('reports the wait (in play) until the next allowed ad', async () => {
    const gate = await gateAt()
    expect(gate.interstitialCooldownLeft(at(40))).toBe(200)
    gate.markInterstitialShown(at(300))
    expect(gate.interstitialCooldownLeft(at(301))).toBe(159)
    expect(gate.interstitialCooldownLeft(at(500))).toBe(0)
  })

  it('counts playtime from page load, not from when the module loaded', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(T0)
    // The gate arrives with a lazily loaded chunk; the player's four minutes
    // started with the page. 100 s of navigation time already elapsed here.
    vi.spyOn(performance, 'now').mockReturnValue(100_000)
    const gate = await loadGate()
    expect(gate.canShowInterstitial(at(139))).toBe(false)
    expect(gate.canShowInterstitial(at(140))).toBe(true)
  })
})
