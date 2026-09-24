import { ref, computed, watch } from 'vue'
import { isCrazyWeb, isWaveDash } from '@/use/useUser'
import { isCrazyGamesFullRelease } from '@/use/useMatch'
import { adProviderName, isRewardedReady, showRewardedAd } from '@/use/useAds'
import { isAdShowing, isPlatformPaused, isVisibilityHidden } from '@/use/useGamePause'

/**
 * ─── Reward gating ──────────────────────────────────────────────────────────
 *
 * A perk is paid for with a rewarded video on every build that HAS one, and is
 * simply free on every build that does not.
 *
 * It used to read `isCrazyWeb && isCrazyGamesFullRelease`, which was written
 * when CrazyGames was the only portal wired for rewarded ads. It is now wrong
 * in the expensive direction: Playgama, GamePix, GameMonetize, Yandex and
 * GameDistribution all resolve real providers, so that predicate was handing
 * out every rewarded perk for free on five shipping portals — the ad never
 * played, the placement never earned, and a reviewer clicking a button marked
 * with a video icon saw no video.
 *
 * The rule is now the honest one: is a real provider resolved?
 *
 *   • any real provider  → gated, the video plays.
 *   • CG PRE-release     → NOT gated, and nothing is OFFERED either. See
 *                          `isCrazyPreRelease` below.
 *   • Wavedash           → same: no SDK, so nothing is offered. See
 *                          `isWavedashNoAds` below.
 *   • noop (local dev,
 *     plain web, itch…)  → not gated, perks are free.
 */
export const isRewardGated =
  adProviderName !== 'noop' && (!isCrazyWeb || isCrazyGamesFullRelease)

/**
 * The CrazyGames PRE-release build — `VITE_APP_CRAZY_WEB=true` with
 * `VITE_APP_CRAZY_GAMES_FULL_RELEASE=false`. This is the build CG's reviewers
 * play before approval, and it has NO ad inventory: `requestAd` resolves without
 * ever showing a video.
 *
 * That leaves a rewarded surface with two possible behaviours, and both are QA
 * findings. Gated, the player taps a button marked with a film-frame icon and no
 * video plays. Ungated — which is what `isRewardGated` above resolves to here —
 * the ×3 pays out for free, so the reviewer sees the game hand over its entire
 * run income for a button press.
 *
 * So on this build the offer is not made at all: `canOfferReward` is false, the
 * result screen never renders the button, `rewardWasOffered` stays false (so
 * leaving the screen is not recorded as a decline — the player declined
 * nothing), and `claimReward` refuses outright. Build-time constants, so Rollup
 * folds the whole branch away on every other build.
 */
const isCrazyPreRelease = isCrazyWeb && !isCrazyGamesFullRelease

/**
 * The Wavedash build — `VITE_APP_WAVEDASH=true`.
 *
 * Wavedash has no ad SDK wired at all: the platform module declares
 * `hasAds: false` and `resolveAdProvider` falls through to the noop provider.
 * That lands the build in the same trap the CG pre-release sits in, one step
 * further along: `isRewardGated` reads the noop provider as "this build has no
 * videos, so the perk is simply free", which is the right answer for local dev
 * and itch and the wrong one for a portal. The result screen rendered a button
 * marked with a film frame and paid the ×3 out on the tap — a reviewer sees the
 * game hand over triple its run income for a click, with no video anywhere.
 *
 * So on Wavedash the offer is not made: `canOfferReward` is false, the result
 * screen never renders the button, `rewardWasOffered` stays false (so leaving
 * the screen is not recorded as a decline — the player declined nothing), the
 * auto-advance countdown is never held back by a pending reward, and
 * `claimReward` refuses outright. Build-time constant, so Rollup folds the
 * branch away on every other build.
 *
 * When Wavedash ships an ad SDK, wire a real provider in `resolveAdProvider`
 * and delete this constant — `isRewardGated` then resolves to `true` on its
 * own and the button comes back with a video behind it.
 */
const isWavedashNoAds = isWaveDash

/** Builds that must not OFFER a rewarded perk at all — no button, and no free
 *  grant standing in for the video that cannot play. */
const isRewardOfferSuppressed = isCrazyPreRelease || isWavedashNoAds

// ─── Rewarded rate limit ────────────────────────────────────────────────────
//
// A hard ceiling on how many rewarded videos may be REQUESTED in a rolling
// window, independent of what the provider's own readiness API says.
//
// Two reasons this has to live on our side. Portals treat a game that hammers
// the rewarded placement as abusive inventory use and reject it; and a player
// who can watch ads back to back will, then resent the game for letting them.
// The limit counts REQUESTS, not grants: a dismissed or unfilled ad still cost
// the network a call, and not counting it would let a player farm no-fills.

/** Rolling window length, ms. */
const REWARD_WINDOW_MS = 5 * 60 * 1000
/** Requests allowed inside one window. */
const REWARD_WINDOW_MAX = 6

/** Timestamps of rewarded requests inside the current window, oldest first. */
let rewardRequests: number[] = []
/** Bumped on every change so the `canOfferReward` computed re-evaluates. */
const rewardTick = ref(0)

const pruneRewardWindow = (now: number): void => {
  const cutoff = now - REWARD_WINDOW_MS
  if (rewardRequests.length > 0 && rewardRequests[0]! <= cutoff) {
    rewardRequests = rewardRequests.filter((t) => t > cutoff)
    rewardTick.value++
  }
}

/** True while the player has spent their rewarded allowance for this window. */
export const isRewardRateLimited = (): boolean => {
  void rewardTick.value
  pruneRewardWindow(Date.now())
  return rewardRequests.length >= REWARD_WINDOW_MAX
}

/** Seconds until the next rewarded slot frees up. 0 when one is available. */
export const rewardCooldownLeft = (): number => {
  const now = Date.now()
  pruneRewardWindow(now)
  if (rewardRequests.length < REWARD_WINDOW_MAX) return 0
  const oldest = rewardRequests[0]!
  return Math.max(0, Math.ceil((oldest + REWARD_WINDOW_MS - now) / 1000))
}

const recordRewardRequest = (): void => {
  rewardRequests.push(Date.now())
  rewardTick.value++
}

/** Test seam: forget every recorded request. */
export const __resetRewardWindow = (): void => {
  rewardRequests = []
  rewardTick.value++
}

/**
 * Run `grant` behind a rewarded video where the build calls for it.
 *
 * Returns whether the perk was granted. On a gated build a no-fill, a dismissed
 * ad or a blocked ad all resolve to `false` and grant nothing — the caller is
 * responsible for leaving its UI in a sane state, which is why `inFlight` is
 * exposed rather than each call site inventing its own busy flag.
 *
 * The rate limit is enforced here as well as in `canOfferReward`, because a
 * button is not the only way into this function and a limit that only hides UI
 * is not a limit.
 */
export const claimReward = async (grant: () => void): Promise<boolean> => {
  // Belt and braces: the button is not rendered on a build with the offer
  // suppressed (CG pre-release, Wavedash), but a free ×3 must not be reachable
  // by any other route either.
  if (isRewardOfferSuppressed) return false
  if (!isRewardGated) {
    grant()
    return true
  }
  if (adInFlight.value) return false
  if (isRewardRateLimited()) return false
  adInFlight.value = true
  recordRewardRequest()
  try {
    const ok = await showRewardedAd()
    if (ok) grant()
    return ok
  } finally {
    adInFlight.value = false
  }
}

/** True while a gated reward is waiting on its video. */
export const adInFlight = ref(false)

/**
 * Can this perk be offered right now?
 *
 * On a CG pre-release or Wavedash build: never — there is no inventory to offer
 * against. On an ungated build: always. On a gated build: only when the
 * provider actually has a rewarded ad ready AND the player has rewarded
 * allowance left in the current window. Offering a button that then fails reads
 * as the game being broken, which is exactly as true for a rate-limited refusal
 * as for a no-fill.
 */
export const canOfferReward = computed(
  () => !isRewardOfferSuppressed && (!isRewardGated || (isRewardedReady.value && !isRewardRateLimited()))
)

// ─── Rewarded-only UNLOCKS (the dressing room's alternatives) ───────────────
//
// Every perk above is OPTIONAL: on a build that cannot play a video it is
// either free (noop) or simply not offered (CG pre-release, Wavedash), and
// nothing is lost by not offering it. The wardrobe's second shelf is different
// (owner, 2026-09-23): those keepsakes can be had in NO other way — no chest
// gives them — so a build that withheld the offer would lock them away for
// good. The owner's rule for them:
//
//   • a build that plays rewarded videos → the video, and the button wears the
//     movie icon in front of its label;
//   • every build that cannot (noop: plain web, itch, a dev server with the
//     simulated ads off — AND the two builds that suppress offers above, the
//     CG pre-release and Wavedash) → FREE, with a plain label and no icon.
//
// Both suppressed builds are ungated by construction (`isRewardGated` is false
// for CG pre-release and for the noop provider Wavedash resolves), so "free"
// is exactly `!isRewardGated`. This is deliberately a separate door from
// `claimReward`: the other placements keep their suppression semantics.

/** How a rewarded-only unlock is paid for on this build. Build-time constant. */
export const unlockMode: 'video' | 'free' = isRewardGated ? 'video' : 'free'

/**
 * Can an unlock button be pressed right now? Always on a free build. On a
 * video build only while a rewarded ad is genuinely ready, the player has
 * allowance left and no other video is in flight — otherwise the button waits
 * in a gentle disabled state rather than failing on the tap (playbook §6.4).
 */
export const canOfferUnlock = computed(
  () => unlockMode === 'free' || (canOfferReward.value && !adInFlight.value)
)

/**
 * Pay for a rewarded-only unlock: the video on a gated build (through
 * `claimReward`, so the rate limit, the in-flight lock and the pause/mute
 * guarantee all hold), the grant straight away on a free one. Returns whether
 * `grant` ran.
 */
export const claimUnlock = async (grant: () => void): Promise<boolean> => {
  if (unlockMode === 'free') {
    grant()
    return true
  }
  return claimReward(grant)
}

// ─── Interstitial pacing ────────────────────────────────────────────────────
//
// The owner's cadence (2026-09-23): "this game should be easy on ads".
//
//   1. The FIRST paced interstitial of a session waits for EITHER
//        • FIRST_INTERSTITIAL_AFTER_MS (240 s) of PLAYTIME, or
//        • a chapter's boss beaten — first time or replay (owner, 2026-09-24):
//          a boss win is itself the natural break, so that ad may come early;
//   2. after ANY interstitial, INTERSTITIAL_MIN_GAP_MS (160 s) of playtime
//      before the next one. Each later chapter-boss win shows one too, if the
//      gap allows — which is simply rule 2.
//
// PLAYTIME, not the wall clock. The clock runs only while the tab is visible,
// no ad is on screen and the portal has not paused the game: a player who
// leaves the tab for ten minutes has not played for ten minutes, and must not
// come back to an ad for it. (Menus and dialogue DO count — the player is in
// the game.) It is also strictly the kinder measure for the portals: playtime
// can never run ahead of the wall clock, so 160 s of playtime is always at
// least 160 s of real time between two requests.
//
// The clock is ONE for every placement: the between-duels break asks
// `canShowInterstitial`, and the two placements that deliberately do not ask
// (the portal-mandated first-load ad, the hidden QA chords) still call
// `markInterstitialShown`, so the next ad owes the full gap from them.

/**
 * No paced interstitial before this much PLAYTIME, ms — unless a chapter boss
 * was just beaten (first time or replay). Four minutes.
 *
 * The first few duels decide whether a stranger stays. At 30-60 s a duel, four
 * minutes is the onboarding and the first handful of pages of the book, which
 * is long enough for the game to earn the interruption. It also covers
 * Yandex's "none in the first 60 s" rule — the chapter-1 boss is the fifth
 * duel, far past a minute of play.
 *
 * The first-load ad that GameMonetize, GamePix and GameDistribution require
 * does not wait for it. Their moderation rejects a build without that ad, so it
 * fires at the splash and seeds the clock like any other placement.
 */
export const FIRST_INTERSTITIAL_AFTER_MS = 240_000

/**
 * Minimum gap between interstitials, ms of playtime. 160 s (owner, 2026-09-23;
 * it was 121 s).
 *
 * ─── Why one number and not a per-platform table ────────────────────────────
 *
 * The pacing is time-based on EVERY build — not keyed to stages or waves — so
 * the only thing that could vary per portal is the length of the gap. Walking
 * the shipped targets, every documented minimum sits BELOW 160 s, so a table
 * would today hold nine identical entries:
 *
 *   • CrazyGames  — one midgame ad per 2 min; an early request is rejected.
 *                   160 s clears it by 40 s, which also covers the clock skew,
 *                   background-tab timer coalescing and the few milliseconds
 *                   between our check and the SDK's that the old 121 s was
 *                   padded by one second for.
 *   • Playgama    — Bridge's own `minimumDelayBetweenInterstitial` is 120 s.
 *   • Yandex      — ≥ 60 s apart, and none in the first 60 s after load. 160 s
 *                   satisfies the first, the 240 s opening (or a chapter-1 boss,
 *                   five duels in) the second.
 *   • Poki        — paced server-side; the SDK's own bad-event gate is the only
 *                   client-side limit and it is about event SPACING, not ads.
 *   • GamePix / GameDistribution / GameMonetize — frequency-capped inside the
 *                   SDK, with published guidance of one interstitial every
 *                   2-3 min. 160 s is inside that band.
 *
 * And because the gap is measured in PLAYTIME (see above), the real time
 * between two requests is never shorter than 160 s, only longer.
 *
 * If a portal ever publishes a LONGER minimum, raise it here for that build
 * rather than reintroducing a stage counter — a stage-keyed cadence drifts with
 * how fast the player is, which is exactly what the portals' rules are not.
 */
export const INTERSTITIAL_MIN_GAP_MS = 160_000

/**
 * When this page started, on the `Date.now()` clock: navigation start, not
 * module evaluation. This module arrives with a lazily loaded chunk, and the
 * player's playtime started when the page did.
 */
const pageStartedAt = (): number =>
  Date.now() - (typeof performance !== 'undefined' ? performance.now() : 0)

/** Is playtime accruing right now? Visible, no ad up, no portal pause. On the
 *  Playgama/Playables build `isVisibilityHidden` is pinned false (the Page
 *  Visibility API is forbidden there) and the Bridge's pause drives
 *  `isPlatformPaused` instead — so the rule holds without touching the API. */
const playtimeRunning = (): boolean =>
  !isAdShowing.value && !isVisibilityHidden.value && !isPlatformPaused.value

/** Playtime banked before the current running stretch, ms. */
let playBanked = 0
/** `Date.now()` when the current running stretch began; null while stopped. */
let playSince: number | null = playtimeRunning() ? pageStartedAt() : null
/** Playtime at the last interstitial; null = none yet this session. */
let lastAdAtPlay: number | null = null

/** Active playtime this session, ms (see the section note). */
export const playtimeMs = (now: number = Date.now()): number =>
  playBanked + (playSince === null ? 0 : Math.max(0, now - playSince))

// The edges, in the same call stack as the flag flip (`flush: 'sync'`), so an
// ad that opens and closes inside one tick is still excluded to the ms.
watch(playtimeRunning, (on) => {
  const now = Date.now()
  if (on) {
    if (playSince === null) playSince = now
  } else if (playSince !== null) {
    playBanked = playtimeMs(now)
    playSince = null
  }
}, { flush: 'sync' })

/** What a duel's end is, to the pacing. */
export type DuelEndMoment = 'win' | 'loss' | 'boss'

/**
 * Any chapter-boss WIN is a break of its own — the first time AND on a replay
 * (owner, 2026-09-24) — so it may bring an ad inside the opening four minutes.
 * Deliberately no replay input: nothing about the node's history matters here.
 */
export const duelEndMoment = (won: boolean, bossNode: boolean): DuelEndMoment =>
  !won ? 'loss' : bossNode ? 'boss' : 'win'

/**
 * True when an interstitial may be shown now: the session has had its four
 * minutes of play — or `afterBoss`, a chapter's boss has just been beaten
 * (first time or replay) — AND the last ad (if any) is a full gap of play
 * behind us.
 * Pure, with no side effects. Asking does not start or restart any clock; only
 * `markInterstitialShown` does.
 */
export const canShowInterstitial = (now: number = Date.now(), afterBoss = false): boolean => {
  const played = playtimeMs(now)
  return (afterBoss || played >= FIRST_INTERSTITIAL_AFTER_MS)
    && (lastAdAtPlay === null || played - lastAdAtPlay >= INTERSTITIAL_MIN_GAP_MS)
}

/** Record that an interstitial was just shown, restarting the 160 s gap. */
export const markInterstitialShown = (now: number = Date.now()): void => {
  lastAdAtPlay = playtimeMs(now)
}

/** Seconds of play until the next ordinary interstitial is allowed (a boss win
 *  waits only for the gap). For debug and telemetry only. */
export const interstitialCooldownLeft = (now: number = Date.now()): number => {
  const played = playtimeMs(now)
  const opening = FIRST_INTERSTITIAL_AFTER_MS - played
  const gap = lastAdAtPlay === null ? 0 : lastAdAtPlay + INTERSTITIAL_MIN_GAP_MS - played
  return Math.max(0, opening, gap) / 1000
}

/** Test seam: start a fresh session at `startedAt` with no play banked and no
 *  ad shown yet. The clock runs from `startedAt` if nothing is pausing it. */
export const __resetInterstitialClock = (startedAt: number = Date.now()): void => {
  playBanked = 0
  playSince = playtimeRunning() ? startedAt : null
  lastAdAtPlay = null
}
