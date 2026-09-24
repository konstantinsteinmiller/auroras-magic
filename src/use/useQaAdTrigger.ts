// ─── The hidden QA ad chords ────────────────────────────────────────────────
//
// Two silent back doors that request an ad on the spot:
//
//   • THE FOE'S HP BAR — thirty taps in a row in a duel → an interstitial.
//   • THE BOOKMARK — twenty taps in a row on the reader's ribbon in the
//     storybook (owner, 2026-09-23: "important to quickly pass Poki QA") →
//     an interstitial; and once one has been triggered that way, the NEXT
//     twenty → a REWARDED ad; then an interstitial again, and so on.
//
// They exist because every interstitial is PACED. `canShowInterstitial` holds
// the first ad back for four minutes of play (or a chapter boss) and every
// later one for 160 s. A reviewer checking what portals grade has to play that
// long for each attempt, and the answer might still be no. The checks are: does
// the ad mute the music, does it stop the loop, does the game resume cleanly,
// does the music come back on a no-fill. And a rewarded video is only offered
// where the game has something to give — so Poki's QA, which has to see a
// `rewardedBreak` happen, would otherwise have to find the dressing room's
// alternatives or a Twin Gift first. These back doors make each check a
// ten-second job on the bundle they are actually reviewing.
//
// ── "In a row" ──
//
// Each tap must land within QA_AD_MAX_GAP_MS of the one before it, and any
// press anywhere else breaks the chain (`breakQaAdChain` / `breakBookmarkChain`,
// called for every press that is not on the target). Neither target is a
// control: the foe's bar is a readout, and the ribbon is a place-marker. A real
// session puts almost no presses on either, and never twenty with nothing in
// between.
//
// ── Why it is silent ──
//
// No counter, no toast, no glyph. A visible affordance is a feature the player
// can find, and an ad the player can summon is an ad nobody asked for. If a
// player somehow completes a chord, the cost is one extra ad. That is why it
// ships in every build instead of hiding behind `isDebug`: QA runs the same
// artefact the player gets, and a back door that only exists on a debug build
// cannot test the build being submitted.
//
// ── What it still owes ──
//
// It bypasses the PACING gate deliberately, which is the whole point. It obeys
// every other rule the real placements obey:
//
//   • an interstitial seeds the shared clock (`markInterstitialShown`), so the
//     NEXT placement still owes the full 160 s. Without this a tester could
//     hand a portal two interstitials inside the window it rate-limits on,
//     which is the abuse those limits exist to catch. (The rewarded one does
//     not: it is not an interstitial, and no portal paces the two together.)
//   • the rewarded one goes through the REAL rewarded path, `showRewardedAd` —
//     the pause gate, the audio kill, the bounded wait and the provider's
//     `rewardedBreak` — and grants nothing: there is nothing to pay for;
//   • it restarts the music on `.finally()`, because it interrupts a LIVE
//     scene. Both ad paths hard-stop the music and clear the play INTENT by
//     design (so nothing can sound under an ad whose promise settles early).
//     `useFirstLoadInterstitial` follows the same rule for the same reason;
//   • it refuses while an ad is already up, so a tester who keeps tapping
//     cannot stack a second request behind the first. A refused bookmark chord
//     does NOT advance the interstitial → rewarded alternation: nothing played.
//
// The pause gate, the audio suspend and the gameplay bracket come free: both
// ad paths flip `isAdShowing`, which ORs into `isGamePaused` and is one of
// `isGameplayLive`'s inputs. The portals are told play stopped, and told again
// when it resumes.
import { showMidgameAd, showRewardedAd } from '@/use/useAds'
import { markInterstitialShown } from '@/use/useAdGate'
import { isAdShowing } from '@/use/useGamePause'
import { resumeMusicAfterAd } from '@/use/useSound'

/** Taps in a row on the foe's HP bar that open the door… */
export const QA_AD_TAPS = 30
/** …taps in a row on the storybook's bookmark… */
export const QA_BOOKMARK_TAPS = 20
/** …each within this long of the one before it, ms. A longer pause starts the
 *  count over. That is roomy for a deliberate tester at 3-5 taps a second, with
 *  space for a hesitation. */
export const QA_AD_MAX_GAP_MS = 1500

/** Which ad a chord asked for. */
export type QaAdKind = 'interstitial' | 'rewarded'

interface Chain {
  /** Taps in the current chain. */
  n: number
  /** When the last tap on the target landed. */
  last: number
}
const hpChain: Chain = { n: 0, last: Number.NEGATIVE_INFINITY }
const bookmarkChain: Chain = { n: 0, last: Number.NEGATIVE_INFINITY }
/** What the bookmark's next completed chord asks for. */
let bookmarkNext: QaAdKind = 'interstitial'
/** True from a request until its ad settles. See the stacking rule above. */
let inFlight = false

/** Test seam: forget every recorded tap, and start the alternation over. */
export const __resetQaAdTaps = (): void => {
  hpChain.n = 0
  hpChain.last = Number.NEGATIVE_INFINITY
  bookmarkChain.n = 0
  bookmarkChain.last = Number.NEGATIVE_INFINITY
  bookmarkNext = 'interstitial'
  inFlight = false
}

/** One tap on a chord's target; returns the chain's new length. */
const count = (c: Chain, now: number): number => {
  c.n = now - c.last <= QA_AD_MAX_GAP_MS ? c.n + 1 : 1
  c.last = now
  return c.n
}

/** Request the ad, unless one is already up. Returns whether it was asked for. */
const fire = (kind: QaAdKind): boolean => {
  if (inFlight || isAdShowing.value) return false
  inFlight = true
  let ad: Promise<unknown>
  if (kind === 'interstitial') {
    markInterstitialShown()
    ad = showMidgameAd()
  } else {
    // Nothing is granted: the video is the whole point.
    ad = showRewardedAd()
  }
  ad.catch((e) => console.warn(`[qa-ad] ${kind} failed`, e))
    .finally(() => {
      inFlight = false
      resumeMusicAfterAd()
    })
  return true
}

/** A press that did NOT land on the foe's HP bar: the taps are no longer in a
 *  row, so the count starts over. */
export const breakQaAdChain = (): void => {
  hpChain.n = 0
}

/**
 * Record one tap on the foe's HP bar, and request an interstitial once
 * `QA_AD_TAPS` of them have landed in a row.
 *
 * @param now injectable clock, for tests.
 * @returns whether this tap fired the ad. Nothing in the game reads it; it is
 *          what makes the trigger assertable without an ad provider.
 */
export const registerQaAdTap = (now: number = Date.now()): boolean => {
  if (count(hpChain, now) < QA_AD_TAPS) return false
  // The chain is used up whether or not the ad fires. A refused chain has to be
  // re-earned. If the counter stayed armed, the ad that could not open now
  // would open on tap 31.
  hpChain.n = 0
  return fire('interstitial')
}

/** A press in the storybook that did NOT land on the bookmark: the count
 *  starts over. */
export const breakBookmarkChain = (): void => {
  bookmarkChain.n = 0
}

/**
 * Record one tap on the storybook's bookmark ribbon. Every `QA_BOOKMARK_TAPS`
 * in a row request an ad: an interstitial, and — once one has been triggered
 * this way — a rewarded ad on the next chord, alternating from then on.
 *
 * @param now injectable clock, for tests.
 * @returns the ad this tap requested, or null.
 */
export const registerBookmarkTap = (now: number = Date.now()): QaAdKind | null => {
  if (count(bookmarkChain, now) < QA_BOOKMARK_TAPS) return null
  // Spent either way, exactly as above.
  bookmarkChain.n = 0
  const kind = bookmarkNext
  if (!fire(kind)) return null
  bookmarkNext = kind === 'interstitial' ? 'rewarded' : 'interstitial'
  return kind
}
