/**
 * sectorArt.ts — a sector's static layer from its PAINTING (story-spec §9.11,
 * S6), with the child's pot colour on its landmark.
 *
 * The painting is everything the sector's `paint()` draws and none of its
 * `props()` (those move, and stay drawn on top). Its colour-me landmark is
 * painted a neutral lilac-grey, and the picked pot is multiplied through it
 * (`artTint.ts`) — so one painting serves all three pots, and the pot the
 * child picked is the colour they find under the dust.
 *
 * Two sizes, two files: the map pages draw the 384 × 224 THUMB (a page of
 * five never decodes five full paintings), the restore view the full
 * 1152 × 672 one, fetched when a sector opens and released when it closes.
 */
import { spriteFor } from '@/game/art'
import { sectorArtId } from '@/game/artIds'
import { accentMask, multiplyMasked, ACCENT_A, ACCENT_B } from '@/game/artTint'
import { SEC_W, SEC_H } from '@/game/restore/mask'
import type { SectorDef } from '@/game/map/sectorDef'
import type { Pot } from '@/game/map/kit'

type G2D = CanvasRenderingContext2D

const POT_A: Pot = { id: 'a', ...ACCENT_A }
const POT_B: Pot = { id: 'b', ...ACCENT_B }

/** Whether node `n` has a painting of the given size decoded right now. */
export const sectorPainted = (n: number, thumb: boolean): boolean =>
  !!spriteFor(thumb ? 'sectorThumb' : 'sector', sectorArtId(n))

/**
 * Draw node `n`'s painting into `g`, whose transform maps sector units to
 * pixels, with `pot` on its landmark. Returns false — drawing nothing — when
 * there is no painting, and the caller paints the vectors as before.
 */
export const paintSectorArt = (g: G2D, n: number, sec: SectorDef, pot: Pot, thumb: boolean): boolean => {
  const kind = thumb ? 'sectorThumb' : 'sector'
  const img = spriteFor(kind, sectorArtId(n), thumb ? undefined : 'high')
  if (!img) return false
  g.drawImage(img, 0, 0, SEC_W, SEC_H)
  // The mask at the thumb's own size, or half the full painting's: a tint
  // edge is soft anyway, and a quarter of the pixels is a quarter the work.
  const mw = thumb ? img.naturalWidth : Math.round(img.naturalWidth / 2)
  const mh = thumb ? img.naturalHeight : Math.round(img.naturalHeight / 2)
  const k = mw / SEC_W
  const inSu = (p: Pot) => (m: G2D): void => {
    m.setTransform(k, 0, 0, mh / SEC_H, 0, 0)
    sec.paint(m, p)
  }
  const mask = accentMask(
    `${kind}/${n}|${img.src}`, mw, mh,
    (m) => m.drawImage(img, 0, 0, mw, mh),
    inSu(POT_A), inSu(POT_B),
    // The search band: ~2 % of the width, the drift a painter's composition
    // shows against its reference.
    Math.max(3, mw * 0.02)
  )
  multiplyMasked(g, mask, pot.base, 0, 0, SEC_W, SEC_H)
  return true
}
