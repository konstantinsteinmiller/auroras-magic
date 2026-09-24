/**
 * layout.ts — the ONE place that decides where the 1280x720 stage sits on the
 * screen and where the player draws. The canvas renderer and the Vue HUD both
 * read the result, so the world and the chrome can never disagree.
 *
 * LANDSCAPE (w > h) — the jam build's letterbox, unchanged: the stage is fitted
 * and centred, the HUD lives in stage coordinates, and the drawing zone is the
 * central box (GDD 3.2) — though, as in the jam build, a stroke may start
 * anywhere that is not a button.
 *
 * PORTRAIT (h >= w) — a letterboxed 16:9 stage on a 320x658 phone is 320x180,
 * and its buttons would be thumbnail-sized. So only the duel WINDOW of the
 * stage (`PORTRAIT_WIN`) is fitted to the width and pinned under a HUD band
 * (HP bars + rune slots), and the space below it becomes the drawing pad, with
 * CAST in the thumb arc at the bottom. Drawing is scale-invariant (the
 * recogniser normalises the stroke), so a rune drawn on the pad is the same
 * rune.
 *
 * THE PORTRAIT PAGE (2026-09-24). The window and the pad are one PAGE CARD
 * lying on the cloth — the same cream border, plum line and cel shadow the
 * wipe frames the sector in (`restore/frame.ts`, `wipe.ts` drawPage), so the
 * page a child fights on is framed the way the page she then cleans is. The
 * picture fills the card's top pane; a strip of the card's own paper divides
 * it from the pad below, where the page goes on (`drawDuelPageBelow`) —
 * she draws her runes on the dusty page, as she does in landscape. Every
 * transform here is ONE scale (`vs`): the window is a crop of the stage,
 * never a squash of it.
 */
import { SW, SH, BOX, type Rect } from '@/game/duel/config'
import { S } from '@/game/duel/state'
import { clamp, min } from '@/game/duel/util'

export interface Insets { top: number; right: number; bottom: number; left: number }

export interface DuelLayout {
  w: number
  h: number
  portrait: boolean
  /** stage -> screen: screen = v + stage * vs */
  vx: number
  vy: number
  vs: number
  /** Portrait only: the HUD band above the stage and the bar below the pad, px. */
  topBand: number
  bottomBar: number
  /** Where strokes are invited, in STAGE units (may extend past 720 in portrait). */
  zone: Rect
  /** The same zone in CSS px — the DOM positions its drawing prompts here. */
  zonePx: Rect
  /**
   * CSS px. Portrait: the page card's outer edge (paper border included), the
   * picture's pane inside it, and the card's paper border width — the pad
   * pane is `zonePx`. Landscape: the stage's own rect for both, border 0.
   */
  card: Rect
  pane: Rect
  border: number
  insets: Insets
}

/** Portrait: how far the page card's picture sits in from the screen's side
 *  edges, CSS px — the wipe's own frame (`restore/frame.ts`). */
export const CARD_MARGIN = 8
/** Portrait: breathing room between the HUD band's rune slots and the card. */
export const CARD_GAP = 4
/** The page card's paper border for a picture `w` CSS px wide — the wipe's. */
export const cardBorder = (w: number): number => Math.max(4, w * 0.008)

/**
 * The part of the stage a PORTRAIT screen shows. The duel happens between the
 * two horns (x ~400..880) over an island spanning 326..954; the outer thirds
 * of the 1280-wide stage are sky. Framing only this window makes the duelists
 * ~1.8x larger on a phone held upright than letterboxing the whole stage —
 * and the top 120 units are cloud band the HUD band above already covers.
 */
export const PORTRAIT_WIN = { x0: 280, x1: 1000, y0: 120 } as const

/** Safe-area insets, measured once per call through a probe element. */
let probe: HTMLDivElement | null = null
export const readInsets = (): Insets => {
  if (typeof document === 'undefined') return { top: 0, right: 0, bottom: 0, left: 0 }
  if (!probe) {
    probe = document.createElement('div')
    probe.style.cssText =
      'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
      'padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)'
    document.body.appendChild(probe)
  }
  const cs = getComputedStyle(probe)
  const px = (v: string): number => parseFloat(v) || 0
  return { top: px(cs.paddingTop), right: px(cs.paddingRight), bottom: px(cs.paddingBottom), left: px(cs.paddingLeft) }
}

/** Pure: compute the layout for a viewport. Unit-testable without a DOM. */
export const computeLayout = (w: number, h: number, insets: Insets): DuelLayout => {
  const portrait = h >= w
  if (!portrait) {
    const vs = min(w / SW, h / SH)
    const vx = (w - SW * vs) / 2
    const vy = (h - SH * vs) / 2
    const stage = { x: vx, y: vy, w: SW * vs, h: SH * vs }
    return {
      w, h, portrait, vx, vy, vs,
      topBand: 0,
      bottomBar: 0,
      zone: { ...BOX },
      zonePx: { x: vx + BOX.x * vs, y: vy + BOX.y * vs, w: BOX.w * vs, h: BOX.h * vs },
      card: stage,
      pane: { ...stage },
      border: 0,
      insets
    }
  }
  const topBand = Math.round(insets.top + clamp(w * 0.25, 84, 132))
  const bottomBar = Math.round(insets.bottom + clamp(h * 0.115, 76, 108))
  const MIN_PAD = 96
  const winW = PORTRAIT_WIN.x1 - PORTRAIT_WIN.x0
  const winH = SH - PORTRAIT_WIN.y0
  // The page card: its picture spans the screen less the wipe's margin, its
  // paper border starts just under the HUD band and ends right over the
  // button bar. Inside it, top to bottom: the picture, a strip of the card's
  // own paper, the pad.
  const paneX = insets.left + CARD_MARGIN
  const paneW = Math.max(1, w - insets.left - insets.right - 2 * CARD_MARGIN)
  const b = cardBorder(paneW)
  const paneY = topBand + CARD_GAP + b
  const cardBottom = h - bottomBar
  // Fit the duel WINDOW to the pane's width. A squat portrait (a tablet, a
  // split screen) cannot give it the full width AND leave a pad: shrink the
  // window rather than lose the pad — it stays centred in a pane that is still
  // the card's full width, which then simply shows more of the stage's sides.
  let vs = min(paneW / winW, (cardBottom - paneY - 2 * b - MIN_PAD) / winH)
  vs = Math.max(vs, 0.05)
  const vx = paneX + (paneW - winW * vs) / 2 - PORTRAIT_WIN.x0 * vs
  const vy = paneY - PORTRAIT_WIN.y0 * vs
  const stageBottom = vy + SH * vs
  const zonePx = {
    x: paneX,
    y: stageBottom + b,
    w: paneW,
    h: Math.max(40, cardBottom - b - (stageBottom + b))
  }
  const zone = {
    x: (zonePx.x - vx) / vs,
    y: (zonePx.y - vy) / vs,
    w: zonePx.w / vs,
    h: zonePx.h / vs
  }
  const card = { x: paneX - b, y: paneY - b, w: paneW + 2 * b, h: zonePx.y + zonePx.h + b - (paneY - b) }
  const pane = { x: paneX, y: paneY, w: paneW, h: stageBottom - paneY }
  return { w, h, portrait, vx, vy, vs, topBand, bottomBar, zone, zonePx, card, pane, border: b, insets }
}

/** The live layout — written by `applyLayout`, read by the renderer and HUD. */
export let LAYOUT: DuelLayout = computeLayout(1280, 720, { top: 0, right: 0, bottom: 0, left: 0 })

/** Recompute for the current viewport and mirror the transform into `S`. */
export const applyLayout = (w: number, h: number, dpr: number): DuelLayout => {
  LAYOUT = computeLayout(w, h, readInsets())
  S.w = w
  S.h = h
  S.dpr = dpr
  S.vs = LAYOUT.vs
  S.vx = LAYOUT.vx
  S.vy = LAYOUT.vy
  S.portrait = LAYOUT.portrait
  return LAYOUT
}

/** Screen (CSS px) -> stage. Everything upstream of this works in stage units. */
export const toStage = (x: number, y: number): [number, number] => [(x - S.vx) / S.vs, (y - S.vy) / S.vs]

/** Centre of the drawing zone, stage units. */
export const zoneCentre = (): [number, number] => {
  const z = LAYOUT.zone
  return [z.x + z.w / 2, z.y + z.h / 2]
}

/** The zone's smaller side, stage units — glyph sizes scale off it. */
export const zoneSpan = (): number => min(LAYOUT.zone.w, LAYOUT.zone.h)
