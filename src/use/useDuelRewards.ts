/**
 * useDuelRewards — the Twin Gift (story-spec §4.15, §11.5, D3).
 *
 * The ONLY reward offer in the story build. After a WIN, once the sector it
 * earned has been restored (its reveal wave finished), a second, ribboned
 * gift sits on the map beside that sector. Pressing and HOLDING it for 1.2 s
 * plays a rewarded ad (through the unchanged `claimReward` gate and its
 * 6-per-5-minutes limiter) and pays a BLOOM: a permanent, purely cosmetic
 * layer of extra life on that one sector — no power, no progress, no currency.
 * One bloom per sector, ever (50 at most).
 *
 * Never on a loss (there is nothing to bloom, and this game does not sell an
 * easier retry), never on a replay, never auto-opened, never on a timer, and
 * walking away is never presented as a missed chance (safety rule 15).
 *
 * The interstitial is NOT here: it belongs to the duel's own beat
 * (`flow/duelFlow.ts`, R-9).
 */
import { computed, reactive } from 'vue'
import { S, save } from '@/game/duel/state'
import { hasBit, setBit } from '@/game/campaign/bitset'
import { sfx } from '@/game/duel/audio'
import { sparkleBurst } from '@/game/duel/fx'
import { canOfferReward, claimReward, isRewardGated, adInFlight } from '@/use/useAdGate'
import { flushSaveNow } from '@/use/useSaveStatus'
import { haptic } from '@/use/useHaptics'
import { track } from '@/use/useAnalytics'
import { useMusic } from '@/use/useSound'

/** The hold that opens it (C8): long enough that a toddler's tap never does. */
export const TWIN_HOLD_MS = 1200

export const twinGift = reactive({
  /** The sector it sits beside, or -1 when none is offered. */
  node: -1,
  /** Bumped when a bloom lands, so views re-read the save. */
  rev: 0,
  /** The last bloom's sector, for its celebration on the map. */
  bloomed: -1
})

const bloomed = (n: number): boolean => hasBit(S.campaign.blooms, n)

/** Offer the Twin Gift beside a sector that was just restored. */
export const offerTwinGift = (n: number): void => {
  twinGift.node = n >= 0 && !bloomed(n) ? n : -1
}

/** Take the offer away (the player left the map, or it paid out). */
export const withdrawTwinGift = (): void => {
  twinGift.node = -1
}

/** This sector's bloom is still unclaimed. */
export const canClaimBloom = computed(() => {
  void twinGift.rev
  return twinGift.node >= 0 && !bloomed(twinGift.node)
})

/**
 * Show the Twin Gift at all? An ad must be genuinely available (a button that
 * then fails reads as the game being broken), nothing may be in flight, and
 * the sector must still have its bloom to give. On an ad-free build the
 * offer never appears: a bloom is not free, it is simply not offered.
 */
export const rewardLive = computed(() =>
  isRewardGated && canOfferReward.value && !adInFlight.value && canClaimBloom.value)

const { startBattleMusic } = useMusic()

/**
 * Sector `n` blooms, and the map says so.
 *
 * The bloom ITSELF, with none of the offer around it: the bit, the save, the
 * reveal chime and the celebration the map picks up from `bloomed`. Pulled
 * out because a bloom now arrives two ways — the Twin Gift's rewarded hold
 * below, and the daily gift (`map/dailyGift.ts`, retention item 5) which has
 * no ad and no hold at all. What a bloom LOOKS like must not depend on which
 * door it came through, and reporting is left to the caller, because the two
 * doors are two different events.
 *
 * Idempotent: a sector already bloomed keeps its one bloom (50 at most, D3).
 */
export const landBloom = (n: number): boolean => {
  if (n < 0 || bloomed(n)) return false
  S.campaign.blooms = setBit(S.campaign.blooms, n)
  save()
  twinGift.bloomed = n
  twinGift.rev++
  sfx('reveal')
  haptic('reward')
  void flushSaveNow()
  return true
}

/** The hold completed: play the ad; on success, the sector blooms. */
export const claimTwinGift = async (): Promise<void> => {
  if (!rewardLive.value) return
  const node = twinGift.node
  try {
    await claimReward(() => {
      landBloom(node)
      twinGift.node = -1
      track('reward_claim', { sectorId: node, kind: 'bloom' })
    })
  } finally {
    startBattleMusic()
  }
}

/** Has sector `n` bloomed? (The map draws its extra life.) */
export const isBloomed = (n: number): boolean => {
  void twinGift.rev
  return bloomed(n)
}

/** A little celebration where the bloom landed (the map calls this). */
export const celebrateBloom = (x: number, y: number): void => sparkleBurst(x, y, 1)
