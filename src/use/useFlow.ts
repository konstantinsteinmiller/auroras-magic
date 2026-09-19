/**
 * useFlow — the reactive mirror of `S.flow` for the Vue chrome.
 *
 * `S` is a plain object (the sim writes it 120×/s), so Vue cannot watch it.
 * Scene switches are rare, discrete events, so `gotoScene`/`openOverlay`
 * write this mirror directly instead of a per-frame copy.
 */
import { reactive } from 'vue'
import type { SceneId, OverlayId } from '@/game/flow/scene'

export const flowHud = reactive<{ scene: SceneId; node: number; overlay: OverlayId | null; mode: 'campaign' | 'versus' }>({
  scene: 'boot',
  node: -1,
  overlay: null,
  mode: 'campaign'
})
