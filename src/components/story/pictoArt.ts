/**
 * pictoArt.ts — the dialogue pictograms' side of the art pipeline
 * (paint-outstanding.md P5; `artIds.PICTO_SETS`): the reference each SET is
 * painted from, drawn from the very paths `Picto.vue` draws, and the box the
 * DOM lays one panel of the painting into.
 *
 * A set is a strip of up to six panels, each ONE pictogram in the 48-unit box
 * `Picto.vue` uses, at `s` px per box. The strip's box (`itemBox`, the union
 * over its panels plus air) is in units of that box, so `Picto.vue` can seat
 * the painted panel over its own viewBox exactly where the drawing was.
 *
 * Plain data plus canvas calls at draw time only (`Path2D` exists in every
 * browser the bench and the game run in); nothing here runs on import.
 */
import type { ItemSpec } from '@/game/artItem'
import { PICTO_SETS, pictoSetArtId } from '@/game/artIds'
import type { Picto } from '@/game/story/story'
import { refInk } from '@/game/map/kit'
import { PICTOS } from './pictos'

type G2D = CanvasRenderingContext2D

/** The pictograms' plum ink (a canvas cannot read `--am-ink`). */
const INK = '#3A2340'

/**
 * How much of a FILLED shape's outline the reference keeps. An evenly inked
 * reference comes back an evenly inked sticker (the creature lesson,
 * `artDraw.CREATURE_REF_INK`); a line that IS the drawing — a Z, a note's
 * stem, a thorn's stalk — keeps its full weight, or it is not there at all.
 */
const REF_OUTLINE = 0.5

/** Pictogram `name` in its 48-unit box, centred on the origin, `s` px per box. */
export const paintPicto = (g: G2D, name: Picto, s: number): void => {
  g.save()
  g.scale(s / 48, s / 48)
  g.translate(-24, -24)
  g.lineJoin = 'round'
  g.lineCap = 'round'
  g.strokeStyle = INK
  for (const p of PICTOS[name] ?? []) {
    const path = new Path2D(p.d)
    if (p.fill !== 'none') {
      g.fillStyle = p.fill
      g.fill(path)
    }
    // A filled shape's outline also takes the bench's reference thinning
    // (`ItemSheet.refInk` → `kit.setRefInk`); a stroke that IS the picture
    // does not.
    g.lineWidth = p.stroke ? 4 : 2.6 * REF_OUTLINE * refInk()
    g.stroke(path)
  }
  g.restore()
}

/** Set `k`'s strip: panel `f` is `PICTO_SETS[k][f]`. */
const setArt = (k: number): ItemSpec => ({
  kind: 'worldUi',
  id: pictoSetArtId(k),
  frames: PICTO_SETS[k]!.length,
  draw: (g, s, f) => paintPicto(g, PICTO_SETS[k]![f] as Picto, s)
})

/** The four sets' specs, by set index (`artSheet` `worldui-picto-set-*`). */
export const PICTO_SET_ART: readonly ItemSpec[] = PICTO_SETS.map((_, k) => setArt(k))
