/**
 * useMapHud — what the map's DOM chrome (`MapScene.vue`) renders from: the
 * chapter the player has reached, the page in view, the orientation. Written
 * by `game/map/map.ts` only when a value changes.
 */
import { reactive } from 'vue'

export const mapHud = reactive({
  /** The furthest chapter reached (0-based). */
  reached: 0,
  /** The chapter page nearest the middle of the view. */
  visible: 0,
  portrait: false,
  /** The Twin Gift's hold target on screen (CSS px), or null when none. */
  twin: null as { x: number; y: number; size: number } | null
})
