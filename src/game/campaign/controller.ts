/**
 * campaign/controller.ts — the ONE module that both listens to the duel and
 * writes the story's progress (story-spec §4.8.1).
 *
 *   • a WIN on the next node advances `furthestNode` and clears that node's
 *     Dream Dust; a LOSS there adds one to its loss streak (§6.15);
 *   • a replay (a node already won, C24) touches neither — "no gift and no
 *     rewards";
 *   • a spell cast for the first time is recorded in `combosSeen` (the
 *     spellbook) and reported once (`spell_discovered`, §7.13);
 *   • the boss chest's unbox grants the chapter's rune (or Signature Spell)
 *     and its keepsake — at the UNBOX, not the win (R-1b): a player may win a
 *     boss and close the game before ever opening the chest;
 *   • a tap creature met for the first time is recorded in `creaturesMet`
 *     (the sticker album, retention item 3) and reported once;
 *   • a node's optional replay goal met is recorded in `stars` (retention
 *     item 4) — on a REPLAY as much as on a first win, which is the whole
 *     point of it.
 *
 * `sim.ts` never imports this; it only emits events.
 */
import { onDuelEvent, lastPlayerCast } from '@/game/duel/sim'
import { S, save } from '@/game/duel/state'
import { nextDuelNode, NODE_COUNT } from '@/game/campaign/state'
import { CHAPTERS, GIFTS, NODES, nodeChapter, nodeIsBoss, runeForNode } from '@/game/campaign/tables'
import { hasBit, setBit } from '@/game/campaign/bitset'
import { awardStar, castEarnsStar } from '@/game/campaign/stars'
import { clamp } from '@/game/duel/util'
import { track } from '@/use/useAnalytics'
import { refreshBook } from '@/use/useBook'

/** A node already won is a replay: practice, no gift, no reward (C24). */
export const isReplay = (node: number): boolean => node >= 0 && node <= S.campaign.furthestNode

/** This node's current loss streak, for Dream Dust. */
export const lossStreakOf = (node: number): number => S.campaign.lossStreaks[String(node)] ?? 0

let installed: (() => void) | null = null

/* ── The replay goal in flight (retention item 4) ──────────────────────── */
//
// A star is decided over a whole duel — "she cast a three-rune spell AND then
// won" — so the controller has to carry one bit from the cast to the finish.
// The duel that bit belongs to is named by `S.round`, which `resetDuel`
// increments and nothing else touches: a duel abandoned halfway (the player
// walks out to the map and comes back) starts a new round, so its half-met
// goal cannot leak into the next attempt. No duel-start event is needed, and
// none exists.
let goalRound = -1
let goalMet = false

/** Open the accumulator if this event belongs to a duel we have not seen. */
const sameDuel = (): void => {
  if (S.round === goalRound) return
  goalRound = S.round
  goalMet = false
}

export const installCampaignController = (): (() => void) => {
  if (installed) return installed
  const off = onDuelEvent((e, won) => {
    // C18: a local versus match has no campaign side-effects at all — no
    // progress, no Dream Dust, no spellbook discoveries.
    if (S.flow.mode === 'versus') return
    if (e === 'cast') {
      const c = lastPlayerCast()
      sameDuel()
      // The spell's runes, from the combo key `comboKey` built: the sorted
      // ids, dot-joined. Parsed rather than re-derived, so the goal is judged
      // against exactly what the sim resolved and fired.
      if (S.flow.node >= 0 && !goalMet) {
        const runes = c.key ? c.key.split('.').map(Number) : []
        goalMet = castEarnsStar(S.flow.node, runes, c.count, S.foe)
      }
      if (c.index >= 0 && !hasBit(S.campaign.combosSeen, c.index)) {
        S.campaign.combosSeen = setBit(S.campaign.combosSeen, c.index)
        save()
        track('spell_discovered', { comboKey: c.key, runeCount: c.count, chapter: nodeChapter(Math.max(0, S.flow.node)) })
        refreshBook()
      }
      return
    }
    if (e !== 'finish') return
    const node = S.flow.node
    if (node < 0) return
    // The star comes FIRST, and before the fresh/replay split: a replay is
    // exactly the run it is meant to reward (C24 gives one nothing else).
    sameDuel()
    if (won && goalMet) awardStar(node)
    goalMet = false
    const fresh = node === nextDuelNode(S.campaign) && node > S.campaign.furthestNode
    if (!fresh) return
    const k = String(node)
    if (won) {
      S.campaign.furthestNode = node
      delete S.campaign.lossStreaks[k]
    } else {
      S.campaign.lossStreaks[k] = clamp((S.campaign.lossStreaks[k] ?? 0) + 1, 0, 8)
    }
    save()
  })
  installed = () => {
    off()
    installed = null
  }
  return installed
}

/** What a boss chest gave. */
export interface ChestGrant { rune: number | null; signature: number | null; cosmetic: number | null }

/**
 * The unbox beat finished (§4.8.1, R-1b, §8.30). Every chest that owes a rune
 * gives it here: the two early ones (after the first and the third battle)
 * and then each chapter's own, at its boss. A boss chest also sets this
 * chapter's Signature Spell — never both a rune and a spell, never another
 * chapter's — plus its keepsake. Idempotent: a second call sets nothing new.
 */
export const onUnboxComplete = (node: number): ChestGrant => {
  const none: ChestGrant = { rune: null, signature: null, cosmetic: null }
  const grant: ChestGrant = { ...none }
  const owed = runeForNode(node)
  if (owed !== null && !((S.campaign.runesUnlocked >> owed) & 1)) {
    S.campaign.runesUnlocked |= 1 << owed
    grant.rune = owed
  }
  // The KEEPSAKE is not boss-only any more (owner, 2026-09-21): the first one
  // lands after the second battle, so the wardrobe has something in it while
  // a child is still learning to draw, instead of standing empty for five
  // duels. Any node carrying a `giftId` gives it; the signature spell below
  // stays a boss's alone.
  const gift = NODES[node]?.giftId
  const def = gift !== null && gift !== undefined ? GIFTS[gift] : undefined
  if (def?.kind === 'cosmetic' && def.cosmeticId !== undefined && !((S.campaign.giftsOwned >> def.cosmeticId) & 1)) {
    S.campaign.giftsOwned |= 1 << def.cosmeticId
    grant.cosmetic = def.cosmeticId
  }
  if (def?.kind === 'feature' && def.feature === 'versus') S.campaign.versusUnlocked = true

  if (!nodeIsBoss(node)) {
    if (grant.rune !== null || grant.cosmetic !== null) save()
    return grant
  }
  const ch = CHAPTERS[nodeChapter(node)]!
  if (ch.signatureSpell !== null && !((S.campaign.signaturesUnlocked >> ch.signatureSpell) & 1)) {
    S.campaign.signaturesUnlocked |= 1 << ch.signatureSpell
    grant.signature = ch.signatureSpell
  }
  save()
  return grant
}

/**
 * Hand over every keepsake whose chest is already BEHIND this player.
 *
 * A schedule change can move a keepsake onto a chest a save has already
 * opened (the Flower Crown moved forward to the second battle; the second
 * shelf briefly rode nodes that gave only a tool). That save will never open
 * the chest again, so without this it would find a permanent ghost on the
 * shelf — a wardrobe that says "you missed this" for something it never
 * could have had. (The second shelf is the wardrobe's rewarded unlocks now,
 * owner 2026-09-23: no node carries one, so this never hands one out.)
 *
 * Deterministic and idempotent: it grants exactly what the same nodes would
 * have granted, and only up to the furthest DUEL already won. Returns true
 * when it actually gave something, so the caller can redraw.
 */
export const backfillKeepsakes = (): boolean => {
  const before = S.campaign.giftsOwned
  for (let n = 0; n <= S.campaign.furthestNode; n++) {
    const gift = NODES[n]?.giftId
    const def = gift !== null && gift !== undefined ? GIFTS[gift] : undefined
    if (def?.kind === 'cosmetic' && def.cosmeticId !== undefined) S.campaign.giftsOwned |= 1 << def.cosmeticId
  }
  if (S.campaign.giftsOwned === before) return false
  save()
  return true
}

/** A node's dialogue has now been seen once (C12: skippable from then on). */
export const markDialogueSeen = (node: number): void => {
  if (node < 0 || hasBit(S.campaign.dialoguesSeen, node)) return
  S.campaign.dialoguesSeen = setBit(S.campaign.dialoguesSeen, node)
  save()
}

/* ───────────────── the creatures met (retention item 3) ───────────────── */
//
// A sector's tap creature pops out on a tap, forever, purely for the delight
// of it — and it pops out in TWO places: on the map's thumbnail and on the
// admire view straight after a restore. The album (item 3) needs to know that
// a child has met one, so the write lives here rather than in either of them:
// the map and the restore view both already know how to make a creature say
// hello, and neither should have to know what the save blob or the funnel
// wants. It is also why the album can read `creatureMet` without importing
// the map — the campaign owns this bit, the same as every other.

/** Has this sector's tap creature ever popped out for this player? */
export const creatureMet = (node: number): boolean =>
  node >= 0 && hasBit(S.campaign.creaturesMet, node)

/**
 * Sector `node`'s creature just said hello.
 *
 * Idempotent, and deliberately QUIET on every meeting after the first: a peek
 * is re-triggerable forever and a child will tap one twenty times, so a write
 * per tap would be twenty debounced saves and twenty `sticker_collect` events
 * for one sticker. Only a bit that actually changes costs anything.
 */
export const meetCreature = (node: number): void => {
  if (node < 0 || node >= NODE_COUNT || creatureMet(node)) return
  S.campaign.creaturesMet = setBit(S.campaign.creaturesMet, node)
  save()
  track('sticker_collect', { node })
}
