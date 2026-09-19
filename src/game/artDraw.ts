/**
 * artDraw.ts — the bench's side of the manifest (art-generation-pipeline,
 * S6): for every sheet `artSheet.ts` names, the GAME'S OWN painter that draws
 * its reference, and the lattice it is drawn on. Dev only: imported by the
 * `/art-sheets` bench and the `/playground`, never by the game.
 *
 * The lattice is the contract. An item panel holds the drawing's BOX
 * (`artItem.itemBox`) scaled to `ITEM_FILL` of the panel and centred in it;
 * the slicer cuts exactly that box back out (`crop`, in `sheet-index.json`),
 * and the renderer blits the painting into exactly that box. A rune panel IS
 * the `RuneGlyph` 100-unit box.
 */
import { ITEM_SHEETS, RUNE_SHEETS, ITEM_FILL, itemSheetSize, SECTOR_REF, type Fit, type ItemSheet, type SectorSheet } from '@/game/artSheet'
import type { ItemName } from '@/game/artIds'
import { itemBox, type ItemSpec } from '@/game/artItem'
import type { ArtBox } from '@/game/artBox'
import { NEUTRAL } from '@/game/artTint'
import { GIFT_ART, BOX_GIFT_ART, CHEST_ART, BRUSH_ART, ERASER_ART } from '@/game/restore/gift'
import { TENT_ART } from '@/game/map/tent'
import { CROWN_ART, PET_STAR_ART } from '@/game/cosmetics/rig-cosmetics'
import { sectorOf } from '@/game/map/sectors'
import { drawGlyph } from '@/game/duel/glyph'
import { SEC_W, SEC_H } from '@/game/restore/mask'

type G2D = CanvasRenderingContext2D

export const ITEM_SPECS: Readonly<Record<ItemName, ItemSpec>> = {
  gift: GIFT_ART,
  boxGift: BOX_GIFT_ART,
  chest: CHEST_ART,
  brush: BRUSH_ART,
  eraser: ERASER_ART,
  tent: TENT_ART,
  crown: CROWN_ART,
  petStar: PET_STAR_ART
}

/** `RuneGlyph.vue`'s box: 100 units around a glyph of radius 30, in units of R. */
const RUNE_BOX: ArtBox = { x: -50 / 30, y: -50 / 30, w: 100 / 30, h: 100 / 30 }

const runeOf = (sheet: ItemSheet): number => Number(String(sheet.name).split(':')[1])

/** The spec behind any item or rune sheet. */
export const specOf = (sheet: ItemSheet): ItemSpec =>
  sheet.kind === 'rune'
    ? { kind: 'rune', id: sheet.id, frames: 1, draw: (g, s) => drawGlyph(g, runeOf(sheet), 0, 0, s, 1, 1) }
    : ITEM_SPECS[sheet.name as ItemName]

export interface Layout {
  w: number
  h: number
  frames: number
  panelW: number
  panelH: number
  /** Pixels per unit of the drawing's scale. */
  k: number
  /** The box, in one panel's pixels — what the slicer cuts out. */
  crop: { x: number; y: number; w: number; h: number }
  /** The drawing's origin, in one panel's pixels. */
  ox: number
  oy: number
}

export const layoutOf = (sheet: ItemSheet): Layout => {
  const { w, h, panelW, panelH } = itemSheetSize(sheet.frames)
  const box = sheet.kind === 'rune' ? RUNE_BOX : itemBox(specOf(sheet))
  const k = sheet.kind === 'rune'
    ? panelW / box.w
    : ITEM_FILL * Math.min(panelW / box.w, panelH / box.h)
  const cw = box.w * k
  const ch = box.h * k
  const cx = (panelW - cw) / 2
  const cy = (panelH - ch) / 2
  return {
    w, h, frames: sheet.frames, panelW, panelH, k,
    crop: { x: Math.round(cx), y: Math.round(cy), w: Math.round(cw), h: Math.round(ch) },
    ox: cx - box.x * k,
    oy: cy - box.y * k
  }
}

const canvasOf = (w: number, h: number): [HTMLCanvasElement, G2D] => {
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  return [cv, cv.getContext('2d', { willReadFrequently: true })!]
}

/** Draw panel `f` of `sheet` at its place on the lattice. */
const drawPanel = (g: G2D, sheet: ItemSheet, L: Layout, f: number): void => {
  g.save()
  g.translate(f * L.panelW + L.ox, L.oy)
  specOf(sheet).draw(g, L.k, f, NEUTRAL)
  g.restore()
}

/** The reference: every panel on flat magenta, no gutters, no captions. */
export const renderItemSheet = (sheet: ItemSheet, ground: string | null = '#ff00ff'): HTMLCanvasElement => {
  const L = layoutOf(sheet)
  const [cv, g] = canvasOf(L.w, L.h)
  if (ground) {
    g.fillStyle = ground
    g.fillRect(0, 0, L.w, L.h)
  }
  for (let f = 0; f < L.frames; f++) drawPanel(g, sheet, L, f)
  return cv
}

/**
 * The fit the slicer registers a return against: the drawing's SOLID extent
 * (α > 140, so a soft glow is light rather than size), measured on a
 * transparent render — the magenta sheet has no alpha to measure — as
 * fractions of one panel, the union over every panel.
 */
export const measureFit = (sheet: ItemSheet): Fit => {
  const L = layoutOf(sheet)
  const cv = renderItemSheet(sheet, null)
  const d = cv.getContext('2d')!.getImageData(0, 0, L.w, L.h).data
  let x0 = L.panelW, y0 = L.panelH, x1 = -1, y1 = -1
  const top = new Array<number>(L.frames).fill(L.panelH)
  const bot = new Array<number>(L.frames).fill(-1)
  for (let y = 0; y < L.h; y++) {
    for (let x = 0; x < L.frames * L.panelW; x++) {
      if (d[(y * L.w + x) * 4 + 3]! <= 140) continue
      const f = Math.floor(x / L.panelW)
      const px = x - f * L.panelW
      if (px < x0) x0 = px
      if (px > x1) x1 = px
      if (y < y0) y0 = y
      if (y > y1) y1 = y
      if (y < top[f]!) top[f] = y
      if (y > bot[f]!) bot[f] = y
    }
  }
  if (x1 < 0) return { h: 0, w: 0, bottom: 0, cx: 0.5 }
  const r = (v: number): number => Math.round(v * 1000) / 1000
  return {
    h: r((y1 - y0 + 1) / L.panelH),
    w: r((x1 - x0 + 1) / L.panelW),
    bottom: r((y1 + 1) / L.panelH),
    cx: r((x0 + x1 + 1) / 2 / L.panelW),
    ...(L.frames > 1 ? { ph: top.map((t, f) => r((bot[f]! - t + 1) / L.panelH)) } : {})
  }
}

/**
 * The key: the reference, faded, with each panel's moment written under it.
 * Captions never go on the reference itself — an image model paints text it
 * is shown.
 */
export const renderKeySheet = (sheet: ItemSheet): HTMLCanvasElement => {
  const L = layoutOf(sheet)
  const [cv, g] = canvasOf(L.w, L.h + 120)
  g.fillStyle = '#ffffff'
  g.fillRect(0, 0, cv.width, cv.height)
  g.globalAlpha = 0.5
  g.drawImage(renderItemSheet(sheet), 0, 0)
  g.globalAlpha = 1
  g.strokeStyle = '#3A2340'
  g.lineWidth = 2
  g.fillStyle = '#3A2340'
  g.font = 'bold 26px system-ui, sans-serif'
  g.textAlign = 'center'
  for (let f = 0; f < L.frames; f++) {
    g.strokeRect(f * L.panelW + 1, 1, L.panelW - 2, L.h - 2)
    const text = (sheet.panels[f] ?? '').replace(/^Panel \d+:\s*/, '').split(/[.—]/)[0]!.trim()
    g.fillText(`${f + 1} · ${text}`, f * L.panelW + L.panelW / 2, L.h + 70)
  }
  return cv
}

/** A sector's reference: its static painting at 1:1, landmark neutral. */
export const renderSectorSheet = (s: SectorSheet): HTMLCanvasElement => {
  const [cv, g] = canvasOf(SECTOR_REF.w, SECTOR_REF.h)
  g.setTransform(SECTOR_REF.w / SEC_W, 0, 0, SECTOR_REF.h / SEC_H, 0, 0)
  sectorOf(s.node).paint(g, { id: 'neutral', ...NEUTRAL })
  return cv
}

export const ALL_ITEM_SHEETS: readonly ItemSheet[] = [...ITEM_SHEETS, ...RUNE_SHEETS]
