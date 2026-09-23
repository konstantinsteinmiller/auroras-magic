/**
 * useFlow — the reactive mirror of `S.flow` for the Vue chrome.
 *
 * `S` is a plain object (the sim writes it 120×/s), so Vue cannot watch it.
 * Scene switches are rare, discrete events, so `gotoScene`/`openOverlay`
 * write this mirror directly instead of a per-frame copy.
 *
 * `turning` is the page turn (§8.28). The snapshot the turn swings away is of
 * the CANVAS alone, and every scene's chrome is DOM on top of it — so while a
 * page is turning the chrome is hidden, and fades back in as the page lands.
 * Without it the new scene's buttons and bubbles appear over the old page on
 * the turn's very first frame.
 */
import { reactive } from 'vue'
import type { SceneId, OverlayId } from '@/game/flow/scene'

export const flowHud = reactive<{
  scene: SceneId
  node: number
  overlay: OverlayId | null
  mode: 'campaign' | 'versus'
  turning: boolean
}>({
  scene: 'boot',
  node: -1,
  overlay: null,
  mode: 'campaign',
  turning: false
})

/**
 * The cold boot's opening (retention-roadmap item 2): node 0's opener, printed
 * over the arena while the ghost trace already loops, instead of a dialogue
 * scene standing in front of it. One flag for the whole sequence — which beat
 * of it is up is the component's own business.
 *
 * It is CHROME state, not flow state — the scene is the duel either way, and
 * nothing about the sim, the bracket or the save depends on it — so it lives
 * beside the mirror rather than in `S.flow`. It never outlives the duel it
 * was raised over: the first stroke, the skip icon, the last beat running
 * out, or leaving the scene all put it away (`flow/nodes.ts`).
 */
export const openingHud = reactive({ live: false })
