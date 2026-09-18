/**
 * frame.ts — where the sector sits on screen (story-spec §3.5.2). Pure, so
 * layout and the wipe-time model can be tested without a canvas.
 *
 * Landscape: the whole 12∶7 sector, as large as the viewport allows, centred.
 * Portrait: full width under the back icon, with room below for the paint pots
 * and the tool. A 12∶7 page on a phone held upright is a wide strip, never
 * cropped — every cell must stay reachable, because the wipe is scored on all
 * of them.
 */
import { SEC_W, SEC_H } from '@/game/restore/mask'
import type { Box } from '@/use/useRestoreHud'

export interface Insets { top: number; right: number; bottom: number; left: number }

const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 }

/** The sector's rectangle on screen in CSS px, before the camera's zoom. */
export const computeFrame = (vw: number, vh: number, ins: Insets = NO_INSETS): Box => {
  const aspect = SEC_W / SEC_H
  if (vw > vh) {
    const aw = vw - ins.left - ins.right - 24
    const ah = vh - ins.top - ins.bottom - 24
    const w = Math.max(1, Math.min(aw, ah * aspect))
    const h = w / aspect
    return { x: ins.left + 12 + (aw - w) / 2, y: ins.top + 12 + (ah - h) / 2, w, h }
  }
  const w = Math.max(1, vw - ins.left - ins.right - 16)
  const h = w / aspect
  const top = ins.top + 76
  const bottom = vh - ins.bottom - 170
  const y = top + Math.max(0, (bottom - top - h) * 0.45)
  return { x: ins.left + 8, y, w, h }
}
