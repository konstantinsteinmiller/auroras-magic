/**
 * map/dailyGift.ts — a small gift waiting on the map, at most once a local
 * calendar day (retention-roadmap.md item 5).
 *
 * WHY, AND WHY IT IS NOT A STREAK. A reason to come back tomorrow is the one
 * thing this game had none of; a streak is the usual way to buy one and is
 * forbidden here (D1, the youngest player is 3). So there is no counter
 * anywhere: the save holds ONE number, `giftDay`, which is the local date the
 * gift was last TAKEN, and every question this feature asks is "is that today
 * yet?". Miss a day, a week, a year — nothing is lost, nothing is owed, and
 * there is no number that can break, because there is no number that grows.
 *
 * And it waits. The latch moves when the gift is OPENED, never when it is
 * offered, so a child who sees it and wanders off still has it tomorrow.
 * Nothing about it expires, blinks or counts down.
 *
 * WHERE IT STANDS. The roadmap said "beside Aurora". Aurora is drawn in
 * exactly one place on this map — the knoll on the front page — and a player
 * seven chapters in would never see a present left there, so the gift waits
 * beside the node that is HERS TO PLAY NEXT: the card the book falls open on
 * (`focusMap`), at its lower-left corner, mirroring the Twin Gift's lower
 * right so the two can never be mistaken for each other or overlap. A gift a
 * three-year-old has to navigate to is not a gift.
 *
 * WHAT IT GIVES. A bloom on a random restored, unbloomed sector — D3's own
 * cosmetic reward, through `landBloom`, with no ad and no hold. When every
 * restored sector has already bloomed it gives a STICKER instead: the
 * creature of a restored sector this player has never met, through
 * `meetCreature`, which is the album's own bit (item 3). When neither is left
 * to give — a brand-new profile with nothing restored, or a completed album
 * — no gift appears at all. An empty box is worse than no box.
 *
 * The device's own date and nothing else (`campaign/session.ts`): no request,
 * no server, no timezone leaves the machine. Poki and YouTube Playables both
 * forbid the alternative.
 */
import { reactive } from 'vue'
import { S, save } from '@/game/duel/state'
import { NODE_COUNT, nextDuelNode } from '@/game/campaign/state'
import { hasBit } from '@/game/campaign/bitset'
import { localDay, daysBetweenDays } from '@/game/campaign/session'
import { creatureMet, meetCreature } from '@/game/campaign/controller'
import { nodeChapter, LAST_BUILT_NODE } from '@/game/campaign/tables'
import { sectorOf } from '@/game/map/sectors'
import { drawGift, giftShake } from '@/game/restore/gift'
import { isBloomed, landBloom } from '@/use/useDuelRewards'
import { twinBurst } from '@/game/duel/fx'
import { sfx } from '@/game/duel/audio'
import { haptic } from '@/use/useHaptics'
import { track } from '@/use/useAnalytics'
import { TAU, sin } from '@/game/duel/util'

type G2D = CanvasRenderingContext2D

/** What the gift is holding, decided when it is opened rather than when it
 *  is offered — a sector restored in between should be bloomable. */
export type DailyReward = 'bloom' | 'sticker'

export const dailyGift = reactive({
  /** The node whose card it stands beside, or -1 when none is waiting. */
  node: -1,
  /** A sector to celebrate on (the sparkle the map draws), or -1. */
  celebrate: -1,
  /** The toast the sticker beat raises — an i18n key, or null. The bloom
   *  raises the game's own `bloom.claimedToast` through `landBloom`. */
  say: null as string | null
})

const restored = (n: number): boolean => hasBit(S.campaign.sectorsDone, n)

/**
 * The sectors a reward of `kind` could land on, preferring chapter `near` so
 * the celebration happens on the page the player is actually looking at. A
 * gift that blooms a sector eight pages away is a save write and nothing
 * else.
 */
const candidates = (kind: DailyReward, near: number): number[] => {
  const here: number[] = []
  const away: number[] = []
  for (let n = 0; n <= LAST_BUILT_NODE && n < NODE_COUNT; n++) {
    if (!restored(n)) continue
    if (kind === 'bloom' ? isBloomed(n) : creatureMet(n) || !sectorOf(n).tap) continue
    ;(nodeChapter(n) === near ? here : away).push(n)
  }
  return here.length ? here : away
}

/** Is there anything at all to give right now? */
const somethingToGive = (near: number): DailyReward | null => {
  if (candidates('bloom', near).length) return 'bloom'
  if (candidates('sticker', near).length) return 'sticker'
  return null
}

/** The card the gift waits beside: the node the book opens on. */
const giftHome = (): number => Math.min(LAST_BUILT_NODE, nextDuelNode(S.campaign))

/**
 * The map has been opened — put today's gift out, if today has not had one.
 *
 * Called on every map visit and cheap on all but the first of the day: one
 * date comparison, then a scan of at most fifty bits. `near` is the chapter
 * in view, used only to aim the reward at a page the player can see.
 */
export const offerDailyGift = (near = 0): void => {
  if (dailyGift.node >= 0) return
  if (S.campaign.giftDay === localDay()) return
  if (!somethingToGive(near)) return
  dailyGift.node = giftHome()
}

/** Take it away without opening it (the map is leaving, a scene changed). */
export const withdrawDailyGift = (): void => {
  dailyGift.node = -1
}

/**
 * The gift was opened, at (`x`, `y`) on screen.
 *
 * Everything that makes this a MOMENT happens here — the burst, the chime,
 * the reward landing on a sector with its own sparkle — and the latch moves
 * with it. Returns what was given, or null when the tap was a no-op (which a
 * second tap on the same gift is).
 */
export const openDailyGift = (x: number, y: number, near = 0): DailyReward | null => {
  if (dailyGift.node < 0) return null
  const kind = somethingToGive(near)
  dailyGift.node = -1
  if (!kind) return null
  const pool = candidates(kind, near)
  const node = pool[(Math.random() * pool.length) | 0]!
  const today = localDay()
  // `daysSinceLast` is 0 for the very first gift this profile has ever had —
  // the only other thing it could mean is two gifts in one day, which the
  // latch above makes impossible.
  const since = daysBetweenDays(S.campaign.giftDay, today)
  S.campaign.giftDay = today
  save()
  twinBurst(x, y, 1)
  sfx('unbox')
  haptic('reward')
  if (kind === 'bloom') {
    landBloom(node)
  } else {
    meetCreature(node)
    // The creature's own hello, the same chime a peek plays, and the map's
    // sparkle over the sector it came from.
    sfx('peek', node % 6)
    dailyGift.celebrate = node
    dailyGift.say = 'daily.stickerToast'
  }
  track('daily_gift', { daysSinceLast: since, reward: kind })
  return kind
}

/** The daily gift's own ribbon (see `drawDaily`). */
const RIBBON = '#ffd76a'
const RIBBON_SHADE = '#e0a93c'

/**
 * The gift on the map: the game's own Standard Gift, at the card's corner,
 * with a soft glow behind it and the idle shake that says "open me" (§8.3).
 *
 * IN A GOLD RIBBON, though, and that is not decoration. A sector waiting to
 * be wiped puts the SAME box on the map (`drawPendingGift`), and that one is
 * the way onward — two identical presents on one page is a three-year-old
 * tapping the wrong one and wondering why the story did not start. Same
 * shape, so it still reads as a present; a different ribbon and a different
 * corner, so it is not THAT present.
 *
 * `t` is the AMBIENT clock — at rest under reduced motion, like every other
 * loop on this page. The burst when it opens is a one-shot beat and keeps its
 * motion.
 */
export const drawDaily = (g: G2D, x: number, y: number, s: number, t: number): void => {
  if (dailyGift.node < 0) return
  g.save()
  g.globalAlpha = 0.4 + 0.2 * (0.5 - 0.5 * Math.cos((t / 1.3) * TAU))
  const glow = g.createRadialGradient(x, y - s * 0.4, 3, x, y - s * 0.4, s * 1.1)
  glow.addColorStop(0, '#fff6c8')
  glow.addColorStop(1, 'rgba(255, 246, 200, 0)')
  g.fillStyle = glow
  g.fillRect(x - s * 1.2, y - s * 1.6, s * 2.4, s * 2.4)
  g.restore()
  drawGift(g, x, y, s, {
    rot: giftShake(t), untie: 0, squash: 1 + 0.02 * sin(t * 2.1), ribbon: RIBBON, ribbonShade: RIBBON_SHADE
  })
}

/** Test seam: forget today's offer without touching the save. */
export const __resetDailyGift = (): void => {
  dailyGift.node = -1
  dailyGift.celebrate = -1
  dailyGift.say = null
}

/** QA: which sectors a gift opened now could land on, per kind. */
export const __dailyPool = (kind: DailyReward, near = 0): number[] => candidates(kind, near)
