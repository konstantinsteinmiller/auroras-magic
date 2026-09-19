/**
 * tent.ts — the wardrobe tent on the map (story-spec §10.13): a striped
 * pink tent with a purple door flap and a yellow pennant. Its own module so
 * the art bench can draw it without the map.
 */
import type { ItemSpec } from '@/game/artItem'
import { ITEM_ART } from '@/game/artIds'

type G2D = CanvasRenderingContext2D

/**
 * The tent in its own 150-unit space: base centred at the origin, 160 units
 * tall to the pennant's tip. `flutter` swings the pennant's point, in units.
 */
export const tentShape = (g: G2D, flutter: number): void => {
  g.lineJoin = g.lineCap = 'round'
  const body = (): void => {
    g.beginPath()
    g.moveTo(-80, 0)
    g.quadraticCurveTo(-60, -60, 0, -120)
    g.quadraticCurveTo(60, -60, 80, 0)
    g.closePath()
  }
  body()
  g.fillStyle = '#ffd1ea'
  g.fill()
  g.save()
  body()
  g.clip()
  g.fillStyle = '#ff8fc4'
  for (let i = -3; i <= 3; i += 2) {
    g.beginPath()
    g.moveTo(0, -120)
    g.lineTo(i * 20 - 10, 0)
    g.lineTo(i * 20 + 10, 0)
    g.closePath()
    g.fill()
  }
  g.restore()
  body()
  g.lineWidth = 5
  g.strokeStyle = '#3A2340'
  g.stroke()
  // The door flap and the pennant.
  g.beginPath()
  g.moveTo(-18, 0)
  g.quadraticCurveTo(0, -60, 18, 0)
  g.fillStyle = '#7a4fb8'
  g.fill()
  g.lineWidth = 4
  g.stroke()
  g.beginPath()
  g.moveTo(0, -120)
  g.lineTo(0, -160)
  g.stroke()
  g.beginPath()
  g.moveTo(0, -160)
  g.lineTo(34 + flutter, -150)
  g.lineTo(0, -140)
  g.closePath()
  g.fillStyle = '#ffd34d'
  g.fill()
  g.stroke()
}

/** The tent as a painted still (the pennant painted at rest). `s` is the
 *  map's tent size: 150 tent units. */
export const TENT_ART: ItemSpec = {
  ...ITEM_ART.tent, frames: 1,
  draw: (g, s) => {
    g.save()
    g.scale(s / 150, s / 150)
    tentShape(g, 0)
    g.restore()
  }
}
