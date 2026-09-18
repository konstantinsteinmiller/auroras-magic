/**
 * rig-cosmetics.ts — what Aurora wears (story-spec §9.7, C17, C31).
 *
 * Each item is a small named draw function hooked into the rig's draw order
 * (`drawUnicorn`'s `afterHead` for the head slot), so it rides every pose —
 * a rear, a victory hop, a portrait — and inherits the head's scale for free.
 * Procedural until Step 3's painted overlay replaces it.
 *
 * S2 ships the head slot: chapter 1's Flower Crown. The other slots are data
 * in `campaign/tables.ts` waiting for their chapters.
 */
import { S } from '@/game/duel/state'
import { COSMETICS, COSMETIC_SLOTS } from '@/game/campaign/tables'
import { TAU, sin, cos } from '@/game/duel/util'

type G2D = CanvasRenderingContext2D

const INK = '#3A2340'

/** A five-petal blossom at (x, y), radius r. */
const blossom = (g: G2D, x: number, y: number, r: number, petal: string, rot: number): void => {
  g.beginPath()
  for (let i = 0; i < 5; i++) {
    const a = rot + (i * TAU) / 5
    const px = x + cos(a) * r * 0.62
    const py = y + sin(a) * r * 0.62
    g.moveTo(px + r * 0.46, py)
    g.arc(px, py, r * 0.46, 0, TAU)
  }
  g.fillStyle = petal
  g.fill()
  g.lineWidth = 1.6
  g.strokeStyle = INK
  g.stroke()
  g.beginPath()
  g.arc(x, y, r * 0.3, 0, TAU)
  g.fillStyle = '#fff1a0'
  g.fill()
  g.lineWidth = 1.2
  g.stroke()
}

/**
 * The Flower Crown (ch1 keepsake): a leafy vine band over the forelock root
 * (head-local (1, -21)) with four blossoms and two leaves. Head space.
 */
export const drawFlowerCrown = (g: G2D): void => {
  g.lineJoin = g.lineCap = 'round'
  // The vine band, riding the top of the skull between the ears.
  g.beginPath()
  g.moveTo(-17, -12)
  g.quadraticCurveTo(-4, -30, 20, -17)
  g.lineWidth = 6
  g.strokeStyle = INK
  g.stroke()
  g.lineWidth = 3.4
  g.strokeStyle = '#4fbf4a'
  g.stroke()
  // Leaves.
  for (const [x, y, a] of [[-12, -21, -0.9], [14, -24, 0.5]] as const) {
    g.beginPath()
    g.ellipse(x, y, 5.5, 2.6, a, 0, TAU)
    g.fillStyle = '#6ee84a'
    g.fill()
    g.lineWidth = 1.4
    g.strokeStyle = INK
    g.stroke()
  }
  blossom(g, -14, -15, 5.5, '#ff8fc4', 0.2)
  blossom(g, -3, -24, 6.2, '#fff6fb', 0.9)
  blossom(g, 9, -24, 5.6, '#ffd34d', 0.4)
  blossom(g, 19, -17, 5, '#b58cff', 1.1)
}

const HEAD_DRAW: Readonly<Record<string, (g: G2D) => void>> = {
  flowerCrown: drawFlowerCrown
}

/** The equipped item's index in a slot, or -1. */
export const equippedIn = (slot: typeof COSMETIC_SLOTS[number]): number =>
  S.campaign.giftsEquipped[COSMETIC_SLOTS.indexOf(slot)] ?? -1

/** The head slot's draw function, if something is equipped there. */
export const equippedHeadDraw = (): ((g: G2D) => void) | undefined => {
  const id = equippedIn('head')
  const def = id >= 0 ? COSMETICS[id] : undefined
  return def && def.slot === 'head' ? HEAD_DRAW[def.slug] : undefined
}
