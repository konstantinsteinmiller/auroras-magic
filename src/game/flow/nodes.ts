/**
 * flow/nodes.ts — how a player gets into a node, and where a session starts
 * (story-spec §3.2.1, §3.2.5, §4.4).
 *
 * BOOT, from the save alone (no main menu, ever):
 *   • a gift is waiting (won, not yet wiped)   → the map, focused on it;
 *   • otherwise, a next node exists             → that node's dialogue;
 *   • everything built is done                  → the map, all restored.
 * A duel's own state is never saved, so a player who closed mid-duel simply
 * meets that node's dialogue again.
 *
 * ENTERING A NODE from the map: a node already won is practice (C24) — its
 * dialogue is skipped automatically, straight to the duel. Otherwise its
 * dialogue plays first. While a gift is still waiting, the NEXT node stays
 * shut: at most one sector may be in progress (C9), and a second pending
 * sector would never be reachable again.
 */
import { S } from '@/game/duel/state'
import { pendingSectorNode, nextDuelNode } from '@/game/campaign/state'
import { LAST_BUILT_NODE } from '@/game/campaign/tables'
import { isReplay, markDialogueSeen } from '@/game/campaign/controller'
import { dialogueFor } from '@/game/story/story'
import { gotoScene } from '@/game/flow/scene'
import { dipTo, fading, DIP_PUSH } from '@/game/flow/transition'
import { startDuel } from '@/game/flow/duelFlow'

/** Where this session starts. Called once, after `load()`. */
export const bootScene = (): void => {
  const cs = S.campaign
  const pending = pendingSectorNode(cs)
  if (pending !== null) {
    gotoScene('map', pending)
    return
  }
  const next = nextDuelNode(cs)
  if (cs.furthestNode >= LAST_BUILT_NODE || next > LAST_BUILT_NODE) {
    gotoScene('map')
    return
  }
  enterDialogue(next)
}

/** Can the player start node `n` from the map right now? */
export const nodePlayable = (n: number): boolean => {
  if (n < 0 || n > LAST_BUILT_NODE) return false
  if (isReplay(n)) return true
  return n === nextDuelNode(S.campaign) && pendingSectorNode(S.campaign) === null
}

const enterDialogue = (n: number): void => {
  if (dialogueFor(n).length) gotoScene('dialogue', n)
  else startDuel(n)
}

/** A node was tapped on the map. */
export const playNode = (n: number): void => {
  if (!nodePlayable(n)) return
  if (isReplay(n)) dipTo(() => startDuel(n), DIP_PUSH)
  else dipTo(() => enterDialogue(n), DIP_PUSH)
}

/** The node's dialogue finished (or was skipped): into the duel. */
export const dialogueDone = (): void => {
  // Once per dialogue: a second "done" (a double tap, the skip icon and the
  // last bubble together) must not queue a second duel start.
  if (S.flow.scene !== 'dialogue' || fading()) return
  const n = S.flow.node
  markDialogueSeen(n)
  dipTo(() => startDuel(n), DIP_PUSH)
}

/** The dialogue's map-jump (back) icon. */
export const dialogueToMap = (): void => {
  dipTo(() => gotoScene('map'))
}
