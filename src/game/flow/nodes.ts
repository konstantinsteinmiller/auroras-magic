/**
 * flow/nodes.ts — how a player gets into a node, and where a session starts
 * (story-spec §3.2.1, §3.2.5, §4.4).
 *
 * BOOT, from the save alone (no main menu, ever):
 *   • a brand-new player                       → the intro (§8.26), then on;
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
import { S, save } from '@/game/duel/state'
import { pendingSectorNode, nextDuelNode } from '@/game/campaign/state'
import { LAST_BUILT_NODE } from '@/game/campaign/tables'
import { isReplay, markDialogueSeen } from '@/game/campaign/controller'
import { dialogueFor } from '@/game/story/story'
import { gotoScene } from '@/game/flow/scene'
import { dipTo, fading, DIP_PUSH } from '@/game/flow/transition'
import { startDuel } from '@/game/flow/duelFlow'
import { focusMap } from '@/game/map/map'
import { beginIntro } from '@/game/story/intro'
import { track } from '@/use/useAnalytics'

/** Where this session starts. Called once, after `load()`. */
export const bootScene = (): void => {
  if (!S.campaign.introSeen) playIntro()
  else startFromSave()
}

/**
 * The picture-book intro (§8.26). The first launch plays it, then carries on
 * exactly as a boot would; a replay from Options comes back to the scene it
 * was opened from. Watching it to the end and skipping it both count as seen.
 */
export const playIntro = (replay = false): void => {
  const from = { scene: S.flow.scene, node: S.flow.node }
  gotoScene('intro')
  track('intro_start', { replay })
  beginIntro((skipped, beat) => {
    track('intro_end', { skipped, beat, replay })
    if (!S.campaign.introSeen) {
      S.campaign.introSeen = true
      save()
    }
    dipTo(() => {
      if (replay && from.scene !== 'intro' && from.scene !== 'boot') gotoScene(from.scene, from.node)
      else startFromSave()
    }, DIP_PUSH)
  })
}

/** Where the save says to start: a waiting gift, the next dialogue, or the map. */
const startFromSave = (): void => {
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
  if (!dialogueFor(n).length) {
    startDuel(n)
    return
  }
  // The story is printed on the page it happens on (§8.28): open the book at
  // this node's chapter, so the words sit under its own picture.
  focusMap(n)
  gotoScene('dialogue', n)
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
