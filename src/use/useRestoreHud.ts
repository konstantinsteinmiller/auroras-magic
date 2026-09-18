/**
 * useRestoreHud — what the restoration scene's DOM chrome renders from
 * (`UnboxScene.vue`, `WipeScene.vue`).
 *
 * The controller (`game/restore/wipe.ts`) owns the truth and writes here only
 * when something the chrome shows actually changed — phase switches, a
 * coverage sample every 250 ms, a resize — never per frame.
 */
import { reactive } from 'vue'

export type RestorePhase =
  | 'idle' | 'invite' | 'open' | 'pots' | 'paint' | 'zoom' | 'wipe' | 'freeze' | 'wave' | 'admire'

export interface Box { x: number; y: number; w: number; h: number }

export const restoreHud = reactive({
  phase: 'idle' as RestorePhase,
  /** 0..1 of the sector cleared, sampled every 250 ms. */
  coverage: 0,
  /** The sector on screen, CSS px. */
  frame: { x: 0, y: 0, w: 0, h: 0 } as Box,
  /** The unopened gift's tap target, CSS px. */
  gift: { x: 0, y: 0, w: 0, h: 0 } as Box,
  /** Paint pot centres, CSS px, and their size. */
  pots: [] as { x: number; y: number }[],
  potSize: 64,
  /** The picked pot, or -1. */
  picked: -1,
  /** This sector's three paint pots (the biome's colours, §8.7). */
  potDefs: [] as { id: string; base: string; shade: string; lite: string }[],
  /** A boss sector: the chest and the Sunbeam instead of the gift and brush. */
  boss: false,
  /** The restored sector is on screen and the player may move on. */
  showContinue: false,
  portrait: false
})
