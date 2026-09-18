/**
 * useDuelBeat — where the duel scene is in its own little story, for the
 * chrome (`GameScene.vue`).
 *
 *   fight      the duel is on
 *   flourish   a win: the victory flourish, the gift dropping (1.4 s)
 *   thanks     a boss win: her thank-you bubbles, in the arena
 *   toMap      the interstitial (if due), then the page-turn to the map
 *   sting      a loss: the doze-off sting (1.4 s)
 *   loss       the loss beat — Retry or Map
 *   idle       none of the above (another scene is showing)
 */
import { reactive } from 'vue'

export type DuelBeatPhase = 'idle' | 'fight' | 'flourish' | 'thanks' | 'toMap' | 'sting' | 'loss'

export const duelBeat = reactive<{ phase: DuelBeatPhase; node: number }>({ phase: 'idle', node: -1 })
