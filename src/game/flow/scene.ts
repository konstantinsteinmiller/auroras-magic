/**
 * flow/scene.ts — which scene the one canvas is showing (story-spec §4.1).
 *
 * The state lives on `S.flow` (the one state object), never in a second
 * mutable object, and is never persisted. Every scene switch goes through
 * `gotoScene` — including a same-scene re-entry, like a duel retry — which
 * also updates the reactive mirror (`flowHud`) the Vue chrome renders from,
 * and tells the portals whether gameplay's window moved (M12). Nothing
 * watches a value derived from it.
 */
import { S } from '@/game/duel/state'
import { flowHud } from '@/use/useFlow'
import { reconcileGameplayBracket } from '@/game/flow/bracket'

export type SceneId =
  | 'boot' | 'map' | 'dialogue' | 'duel' | 'unbox' | 'wipe'
  | 'wardrobe' | 'versusSetup'

/** Modal overlays: they stack on whatever scene is current. */
export type OverlayId = 'options' | 'spellbook'

export interface FlowState {
  scene: SceneId
  /** 0..49, the node a dialogue/duel/unbox/wipe scene concerns; -1 elsewhere. */
  node: number
  mode: 'campaign' | 'versus'
  overlay: OverlayId | null
  /** True from the first trusted gesture this session onward (R-1). */
  armed: boolean
}

export const gotoScene = (scene: SceneId, node = -1, mode: 'campaign' | 'versus' = 'campaign'): void => {
  S.flow.scene = scene
  S.flow.node = node
  S.flow.mode = mode
  flowHud.scene = scene
  flowHud.node = node
  reconcileGameplayBracket()
}

export const openOverlay = (o: OverlayId): void => {
  S.flow.overlay = o
  flowHud.overlay = o
  reconcileGameplayBracket()
}

export const closeOverlay = (): void => {
  S.flow.overlay = null
  flowHud.overlay = null
  reconcileGameplayBracket()
}

/** The first trusted gesture of the session. Idempotent. */
export const arm = (): void => {
  if (S.flow.armed) return
  S.flow.armed = true
  reconcileGameplayBracket()
}
