/**
 * campaign/stars.ts — one optional goal per node, and the sparkle star it
 * pays (retention-roadmap.md item 4).
 *
 * WHY THIS EXISTS. A finished node is replayable — `flow/nodes.ts` sends a
 * won node straight back into its duel — and a replay earns nothing at all
 * (C24: "no gift and no rewards"). After the finale there is therefore no
 * goal left anywhere in the game, and the content ceiling, not the player's
 * interest, is what ends the last session. A star is the cheapest thing that
 * lifts it: one small, optional, purely cosmetic thing left to do on every
 * one of the fifty nodes, earnable on a replay.
 *
 * WHAT A GOAL MAY BE. Three rules, all of which a goal has to pass:
 *
 *   1. It is observable from state the sim ALREADY produces. The campaign
 *      controller watches the duel through `onDuelEvent`; every goal here is
 *      decided by what the player CAST (`lastPlayerCast`) and who she was
 *      fighting (`S.foe`). Nothing new is exported from the sim for this.
 *   2. It is reachable by a child, first time, with the runes that node's
 *      chest schedule has actually handed over (`runesHeldBy`) — so a goal
 *      is chosen per node rather than dealt out, and falls back when the
 *      one it wanted is not in her hand yet.
 *   3. Missing it costs nothing and says nothing. There is no words, no
 *      "failed", no retry prompt: an unearned star is simply a faint outline
 *      on the card, and the chapter tab counts what is there.
 *
 * WHAT WAS REJECTED. The roadmap's third suggestion was "on bosses, win
 * without being frozen". Frost Lock is the only thing in the game that
 * freezes, it is a Signature Spell, and `foes.ts`' `SIGS` gives it to nobody
 * — `S.frozen` only ever runs in 2P versus (§6.19). A goal that cannot fail
 * is a star handed out for turning up, so the bosses ask for the counter
 * rune instead, which is the one piece of real duelling skill the game
 * teaches (§6.6) and shouts about when it lands.
 *
 * The bit lives in `S.campaign.stars`, a 50-bit bitset beside every other
 * enumerable set (§4.5.1). Idempotent: a star already held is not re-earned,
 * not re-saved and not re-reported.
 */
import { S, save } from '@/game/duel/state'
import { NODE_COUNT } from '@/game/campaign/state'
import { hasBit, setBit, countBits } from '@/game/campaign/bitset'
import {
  NODES_PER_CHAPTER, nodeChapter, nodeIsBoss, nodePosInChapter, newestRuneBy, runesHeldBy
} from '@/game/campaign/tables'
import { CTR, MAX_RUNES } from '@/game/duel/config'
import { FOES, guardianOf } from '@/game/duel/foes'
import { track } from '@/use/useAnalytics'

/**
 * What a node asks for. The names are what `star_earned` reports, so they are
 * append-only in spirit: a dashboard comparing two weeks needs `rune` to have
 * meant the same thing in both.
 *
 *   rune     a spell carrying the rune the last chest gave her — "use the
 *            new toy", the one thing a new rune needs a reason to be used;
 *   combo    a spell of all three runes (`MAX_RUNES`) — the ceiling of the
 *            queue, and one more rune than a child casts by habit;
 *   counter  a spell carrying the rune this foe is weak to (§6.6) — the
 *            bosses' goal, where the elemental wheel is worth the thought.
 */
export type StarGoal = 'rune' | 'combo' | 'counter'

/** The counter rune for node `n`'s foe, or -1 (the exempt chapters). */
const counterRuneFor = (foe: number): number => {
  const el = FOES[foe]?.element ?? -1
  return el >= 0 ? CTR[el] ?? -1 : -1
}

/**
 * Node `n`'s goal, for good. Fixed by position in the chapter so a chapter
 * always offers the same three shapes — two "use the new rune", two "fill
 * the queue", one "counter the Guardian" — and never two of a kind in a row:
 *
 *   pos 0, 3  rune     pos 1, 2  combo     pos 4 (boss)  counter
 *
 * Each falls back when its ask is out of reach at that node: the first boss
 * is weak to Moon, which no chest hands over until node 44, and node 0 has
 * had no chest at all. A fallback is not a lesser goal, it is the same three
 * shapes shuffled — the only thing that must never happen is a star nobody
 * can earn on the run where it is offered.
 */
export const starGoal = (n: number): StarGoal => {
  const pos = nodePosInChapter(n)
  const held = runesHeldBy(n)
  const newest = newestRuneBy(n)
  const hasNewest = newest !== null && ((held >> newest) & 1) === 1
  if (nodeIsBoss(n)) {
    const ctr = counterRuneFor(guardianOf(nodeChapter(n)))
    if (ctr >= 0 && (held >> ctr) & 1) return 'counter'
    return hasNewest ? 'rune' : 'combo'
  }
  if (pos === 0 || pos === 3) return hasNewest ? 'rune' : 'combo'
  return 'combo'
}

/** The rune node `n`'s `rune` goal wants, or -1 when it does not want one. */
export const starRune = (n: number): number =>
  starGoal(n) === 'rune' ? newestRuneBy(n) ?? -1 : -1

/**
 * Does this cast satisfy node `n`'s goal?
 *
 * `runes` is the spell's rune ids and `count` its length — both straight off
 * `lastPlayerCast()`, whose `key` is `comboKey`'s dot-joined sorted ids.
 * `foe` is the duel's live foe rather than the table's, so a node with a
 * `foeIdOverride` is still judged against whoever actually turned up.
 */
export const castEarnsStar = (n: number, runes: readonly number[], count: number, foe: number): boolean => {
  switch (starGoal(n)) {
    case 'combo':
      return count >= MAX_RUNES
    case 'rune': {
      const want = starRune(n)
      return want >= 0 && runes.includes(want)
    }
    case 'counter': {
      const ctr = counterRuneFor(foe)
      return ctr >= 0 && runes.includes(ctr)
    }
  }
}

/* ─────────────────────────────── the save ─────────────────────────────── */

/** Has node `n`'s star been earned? */
export const hasStar = (n: number): boolean => n >= 0 && hasBit(S.campaign.stars, n)

/** How many of chapter `c`'s five stars are held (the tab's `★ 3/5`). */
export const starsInChapter = (c: number): number => {
  let k = 0
  for (let i = 0; i < NODES_PER_CHAPTER; i++) if (hasStar(c * NODES_PER_CHAPTER + i)) k++
  return k
}

/** Every star held, over the whole book. */
export const starsHeld = (): number => countBits(S.campaign.stars)

/**
 * Node `n`'s star has been earned. Idempotent and quiet the second time: a
 * node is replayable forever, and a child who meets the same goal on twenty
 * replays should cost twenty saves and twenty events exactly once.
 */
export const awardStar = (n: number): boolean => {
  if (n < 0 || n >= NODE_COUNT || hasStar(n)) return false
  S.campaign.stars = setBit(S.campaign.stars, n)
  save()
  track('star_earned', { nodeId: n, goal: starGoal(n) })
  return true
}
