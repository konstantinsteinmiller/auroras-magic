/**
 * useWardrobeUnlock — the dressing room's rewarded alternatives (owner,
 * 2026-09-23).
 *
 * "The player can use rewarded ads to buy the alternative decorative items in
 * the dressing room, he can't get the alternative items any other way but to
 * play a rewarded ad." The alternatives are the second shelf
 * (`tables.ALTERNATIVES`, keepsakes 9–22). No chest gives them; each sits on
 * its slot's shelf from the first visit, the child taps it to try it on, and
 * the button under the shelf unlocks it:
 *
 *   • a build that plays rewarded videos → one video, the button wearing the
 *     movie icon in front of its label ("like always"), and offered only while
 *     an ad is genuinely ready — otherwise it waits, disabled, gently;
 *   • a build that cannot (noop: plain web, itch; the CG pre-release; Wavedash)
 *     → free, plain label, no icon (`useAdGate.unlockMode`).
 *
 * The pause, the audio kill and the bounded wait all come from `claimReward` →
 * `showRewardedAd`, unchanged; the music comes back here once the ad is done,
 * win or no-fill, because the ad path hard-stops it and the wardrobe has no
 * duel start to bring it back.
 */
import { S, save } from '@/game/duel/state'
import { COSMETICS, COSMETIC_SLOTS, isAlternative } from '@/game/campaign/tables'
import { canOfferUnlock, claimUnlock, unlockMode } from '@/use/useAdGate'
import { flushSaveNow } from '@/use/useSaveStatus'
import { resumeMusicAfterAd } from '@/use/useSound'
import { track } from '@/use/useAnalytics'

export { canOfferUnlock, unlockMode }

/** Does this player own keepsake `id`? (The `giftsOwned` bit.) */
export const ownsKeepsake = (id: number): boolean =>
  id >= 0 && ((S.campaign.giftsOwned >>> id) & 1) === 1

/** An alternative on the shelf that is not hers yet: try-on and unlock. */
export const isLockedAlternative = (id: number): boolean => isAlternative(id) && !ownsKeepsake(id)

/** Keepsake `id` is hers: owned, put on, and saved at once — a video was just
 *  watched for it, and a refresh must never lose that. */
const grantAlternative = (id: number): void => {
  S.campaign.giftsOwned |= 1 << id
  const eq = [...S.campaign.giftsEquipped] as typeof S.campaign.giftsEquipped
  eq[COSMETIC_SLOTS.indexOf(COSMETICS[id]!.slot)] = id
  S.campaign.giftsEquipped = eq
  save()
  void flushSaveNow()
}

/**
 * Unlock alternative `id`: the rewarded video where the build has one, free
 * where it does not. Resolves true once it is hers (and worn); false for a
 * refused, dismissed or unfilled video — the caller leaves the try-on up so
 * the child can simply press again.
 */
export const unlockAlternative = async (id: number): Promise<boolean> => {
  if (!isLockedAlternative(id) || !canOfferUnlock.value) return false
  try {
    return await claimUnlock(() => {
      grantAlternative(id)
      track('reward_claim', { kind: 'keepsake', cosmeticId: id, paid: unlockMode })
    })
  } catch (e) {
    // `showRewardedAd` swallows provider errors itself; this is the belt to
    // its braces, so a broken SDK can never strand the button.
    console.warn('[wardrobe] unlock failed', e)
    return false
  } finally {
    if (unlockMode === 'video') resumeMusicAfterAd()
  }
}
