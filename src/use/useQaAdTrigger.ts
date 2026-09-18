// ─── The hidden QA interstitial chord ───────────────────────────────────────
//
// Thirty taps in a row on the FOE's HP bar request an interstitial.
//
// It exists because every interstitial is PACED. `canShowInterstitial` holds the
// first ad back for four minutes and every later one for 121 s. A reviewer
// checking what portals grade has to play that long for each attempt, and the
// answer might still be no. The checks are: does the ad mute the music, does it
// stop the loop, does the game resume cleanly, does the music come back on a
// no-fill. This back door makes each one a ten-second job on the bundle they
// are actually reviewing.
//
// ── "In a row" ──
//
// Each tap must land within QA_AD_MAX_GAP_MS of the one before it, and any
// press anywhere else breaks the chain (`breakQaAdChain`, called by the scene
// for every pointerdown that is not on the bar). The foe's bar is a readout, not
// a control. A duel is fought on the drawing pad, so a real session puts almost
// no presses on the bar, and never thirty with nothing in between.
//
// ── Why it is silent ──
//
// No counter, no toast, no glyph. A visible affordance is a feature the player
// can find, and an ad the player can summon is an ad nobody asked for. If a
// player somehow completes the chord, the cost is one extra ad. That is why it
// ships in every build instead of hiding behind `isDebug`: QA runs the same
// artefact the player gets, and a back door that only exists on a debug build
// cannot test the build being submitted.
//
// ── What it still owes ──
//
// It bypasses the PACING gate deliberately, which is the whole point. It obeys
// every other rule the real placements obey:
//
//   • it seeds the shared clock (`markInterstitialShown`), so the NEXT
//     placement still owes the full 121 s. Without this a tester could hand a
//     portal two interstitials inside the window it rate-limits on, which is
//     the abuse those limits exist to catch;
//   • it restarts the music on `.finally()`, because this placement interrupts
//     a LIVE duel. `showMidgameAd` hard-stops the music and clears the play
//     INTENT by design (so nothing can sound under an ad whose promise settles
//     early). Normally the next result panel brings the music back, and that is
//     a whole duel away. `useFirstLoadInterstitial` follows the same rule for
//     the same reason;
//   • it refuses while an ad is already up, so a tester who keeps tapping
//     cannot stack a second request behind the first.
//
// The pause gate, the audio suspend and the gameplay bracket come free:
// `showMidgameAd` flips `isAdShowing`, which ORs into `isGamePaused` and is one
// of `isGameplayLive`'s inputs. The portals are told play stopped, and told
// again when it resumes.
import { showMidgameAd } from '@/use/useAds'
import { markInterstitialShown } from '@/use/useAdGate'
import { isAdShowing } from '@/use/useGamePause'
import { resumeMusicAfterAd } from '@/use/useSound'

/** Taps in a row that open the door… */
export const QA_AD_TAPS = 30
/** …each within this long of the one before it, ms. A longer pause starts the
 *  count over. That is roomy for a deliberate tester at 3-5 taps a second, with
 *  space for a hesitation. */
export const QA_AD_MAX_GAP_MS = 1500

/** Taps in the current chain. */
let chain = 0
/** When the last tap on the bar landed. */
let lastTapAt = Number.NEGATIVE_INFINITY
/** True from the request until the ad settles. See the stacking rule above. */
let inFlight = false

/** Test seam: forget every recorded tap. */
export const __resetQaAdTaps = (): void => {
  chain = 0
  lastTapAt = Number.NEGATIVE_INFINITY
  inFlight = false
}

/** A press that did NOT land on the foe's HP bar: the taps are no longer in a
 *  row, so the count starts over. */
export const breakQaAdChain = (): void => {
  chain = 0
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
  chain = now - lastTapAt <= QA_AD_MAX_GAP_MS ? chain + 1 : 1
  lastTapAt = now
  if (chain < QA_AD_TAPS) return false

  // The chain is used up whether or not the ad fires. A refused chain has to be
  // re-earned. If the counter stayed armed, the ad that could not open now
  // would open on tap 31.
  chain = 0
  if (inFlight || isAdShowing.value) return false

  inFlight = true
  markInterstitialShown()
  showMidgameAd()
    .catch((e) => console.warn('[qa-ad] interstitial failed', e))
    .finally(() => {
      inFlight = false
      resumeMusicAfterAd()
    })
  return true
}
