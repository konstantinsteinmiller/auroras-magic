/**
 * useMapHud — what the map's DOM chrome (`MapScene.vue`) renders from: the
 * chapter the player has reached, the page in view, the orientation. Written
 * by `game/map/map.ts` only when a value changes.
 *
 * One value runs the other way: `rankW`, the rank badge's width, written by
 * the chrome and read by the canvas, because the bookmark hangs just LEFT of
 * the badge (owner, 2026-09-23) and only the DOM knows how wide a placing is
 * in the player's language.
 */
import { reactive } from 'vue'

/** How far the rank badge sits in from the page's top-right corner (CSS px),
 *  for a page `h` tall. One formula for both sides of the badge/bookmark
 *  pair: `MapScene` pins the badge with it, `map.ts` hangs the ribbon by it. */
export const rankInset = (h: number): number => Math.max(10, Math.round(h * 0.03))

export const mapHud = reactive({
  /** The furthest chapter reached (0-based). */
  reached: 0,
  /** The chapter whose page is open (the destination, while one turns). */
  visible: 0,
  /** The book's front page is open — the knoll, not a chapter (§8.28). */
  front: true,
  portrait: false,
  /** The open page's card on screen (CSS px). Every page shows in the same
   *  place, so this only changes on a resize — which is what lets the DOM
   *  chrome pin things to the paper without chasing a turning page. */
  page: { x: 0, y: 0, w: 0, h: 0 },
  /** The Twin Gift's hold target on screen (CSS px), or null when none. */
  twin: null as { x: number; y: number; size: number } | null,
  /** The daily gift's tap target on screen (CSS px), or null when none is
   *  waiting (retention item 5). Same contract as `twin`: the canvas draws
   *  the gift, this is the button laid over it. */
  daily: null as { x: number; y: number; size: number } | null,
  /** Umbra, wandering after the finale, saying one of her lines (§8.11):
   *  its i18n key and where her head is (CSS px); null when quiet. */
  umbraSay: null as { key: string; x: number; y: number } | null,
  /** The Festival's finale card is up (§10.19). */
  finale: false,
  /** Local 2P versus is unlocked (chapter 10's gift, C18). */
  versus: false,
  /** The rank badge's width on screen (CSS px), 0 while it is not shown.
   *  Written by `MapScene` (the one value the chrome writes, see above). */
  rankW: 0
})
