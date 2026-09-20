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
 *     boss and close the game before ever opening the chest.
 *
 * `sim.ts` never imports this; it only emits events.
 */
import { onDuelEvent, lastPlayerCast } from '@/game/duel/sim'
import { S, save } from '@/game/duel/state'
import { nextDuelNode } from '@/game/campaign/state'
import { CHAPTERS, GIFTS, NODES, nodeChapter, nodeIsBoss, runeForNode } from '@/game/campaign/tables'
import { hasBit, setBit } from '@/game/campaign/bitset'
import { clamp } from '@/game/duel/util'
import { track } from '@/use/useAnalytics'
import { refreshBook } from '@/use/useBook'

/** A node already won is a replay: practice, no gift, no reward (C24). */
export const isReplay = (node: number): boolean => node >= 0 && node <= S.campaign.furthestNode

/** This node's current loss streak, for Dream Dust. */
export const lossStreakOf = (node: number): number => S.campaign.lossStreaks[String(node)] ?? 0

let installed: (() => void) | null = null

export const installCampaignController = (): (() => void) => {
  if (installed) return installed
  const off = onDuelEvent((e, won) => {
    // C18: a local versus match has no campaign side-effects at all — no
    // progress, no Dream Dust, no spellbook discoveries.
    if (S.flow.mode === 'versus') return
    if (e === 'cast') {
      const c = lastPlayerCast()
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
  if (!nodeIsBoss(node)) {
    if (grant.rune !== null) save()
    return grant
  }
  const ch = CHAPTERS[nodeChapter(node)]!
  if (ch.signatureSpell !== null && !((S.campaign.signaturesUnlocked >> ch.signatureSpell) & 1)) {
    S.campaign.signaturesUnlocked |= 1 << ch.signatureSpell
    grant.signature = ch.signatureSpell
  }
  const gift = NODES[node]?.giftId
  const def = gift !== null && gift !== undefined ? GIFTS[gift] : undefined
  if (def?.kind === 'cosmetic' && def.cosmeticId !== undefined && !((S.campaign.giftsOwned >> def.cosmeticId) & 1)) {
    S.campaign.giftsOwned |= 1 << def.cosmeticId
    grant.cosmetic = def.cosmeticId
  }
  if (def?.kind === 'feature' && def.feature === 'versus') S.campaign.versusUnlocked = true
  save()
  return grant
}

/** A node's dialogue has now been seen once (C12: skippable from then on). */
export const markDialogueSeen = (node: number): void => {
  if (node < 0 || hasBit(S.campaign.dialoguesSeen, node)) return
  S.campaign.dialoguesSeen = setBit(S.campaign.dialoguesSeen, node)
  save()
}
