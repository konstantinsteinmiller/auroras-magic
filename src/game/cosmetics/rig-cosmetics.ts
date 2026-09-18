/**
 * rig-cosmetics.ts — what Aurora wears (story-spec §9.7, C17, C31).
 *
 * Each item is a small named draw function hooked into the rig's draw order
 * (`drawUnicorn`'s `afterHead` for the head slot), so it rides every pose —
 * a rear, a victory hop, a portrait — and inherits the head's scale for free.
 * Procedural until Step 3's painted overlay replaces it.
 *
 * S2 shipped the head slot (chapter 1's Flower Crown); S3 adds the neck slot
 * (chapter 2's Seashell Necklace, at `afterMane`) and the back slot
 * (chapter 3's Fluffy Pegasus Wings: a far layer at `beforeTorso`, a near
 * one at `afterTorso`). The other slots are data in `campaign/tables.ts`
 * waiting for their chapters.
 */
import { S } from '@/game/duel/state'
import { COSMETICS, COSMETIC_SLOTS } from '@/game/campaign/tables'
import { TAU, sin, cos } from '@/game/duel/util'
import type { PoseState, RigAnchors } from '@/game/duel/chars'

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

/** One little scallop shell, hinge at (x, y), opening toward `a`. */
const scallop = (g: G2D, x: number, y: number, r: number, a: number, fill: string): void => {
  g.save()
  g.translate(x, y)
  g.rotate(a)
  g.beginPath()
  g.moveTo(0, 0)
  g.arc(0, 0, r, -0.95, 0.95)
  g.closePath()
  g.fillStyle = fill
  g.fill()
  g.lineWidth = 1.4
  g.strokeStyle = INK
  g.stroke()
  g.beginPath()
  for (const k of [-0.5, 0, 0.5]) {
    g.moveTo(0, 0)
    g.lineTo(cos(k) * r * 0.85, sin(k) * r * 0.85)
  }
  g.lineWidth = 0.9
  g.stroke()
  g.restore()
}

/**
 * The Seashell Necklace (ch2 keepsake): a string around the neck at its
 * collar, hanging a little toward the chest, with three shells and two pearls.
 * Rig space (facing +x), from the rig's anchors.
 */
export const drawSeashellNecklace = (g: G2D, a: RigAnchors): void => {
  const [dx, dy] = a.neckDir
  // Sit it low on the neck, clear of the head that is drawn over it.
  const cx = a.neckCollar[0] - dx * 14
  const cy = a.neckCollar[1] - dy * 14
  const nx = -dy
  const ny = dx
  const ax = cx + nx * 12
  const ay = cy + ny * 12
  const bx = cx - nx * 12
  const by = cy - ny * 12
  const kx = cx + 8
  const ky = cy + 11
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(ax, ay)
  g.quadraticCurveTo(kx, ky, bx, by)
  g.lineWidth = 3
  g.strokeStyle = INK
  g.stroke()
  g.lineWidth = 1.6
  g.strokeStyle = '#ffe3a3'
  g.stroke()
  const at = (u: number): [number, number] => [
    (1 - u) * (1 - u) * ax + 2 * (1 - u) * u * kx + u * u * bx,
    (1 - u) * (1 - u) * ay + 2 * (1 - u) * u * ky + u * u * by
  ]
  for (const [u, col] of [[0.28, '#ffc0cc'], [0.5, '#ff9f8a'], [0.72, '#bfefff']] as const) {
    const [x, y] = at(u)
    scallop(g, x, y, 7.2, 1.2, col)
  }
  for (const u of [0.39, 0.61]) {
    const [x, y] = at(u)
    g.beginPath()
    g.arc(x, y + 1, 1.8, 0, TAU)
    g.fillStyle = '#fff6fb'
    g.fill()
    g.lineWidth = 1
    g.strokeStyle = INK
    g.stroke()
  }
}

/** One fluffy wing: a rounded leading edge and three scalloped feathers,
 *  rooted at (x, y), sweeping up and back; `flap` 0..1 lifts it. */
const wing = (g: G2D, x: number, y: number, s: number, flap: number, fill: string, tip: string): void => {
  g.save()
  g.translate(x, y)
  g.rotate(0.22 + flap * 0.35)
  g.scale(s, s)
  g.lineJoin = g.lineCap = 'round'
  g.beginPath()
  g.moveTo(0, 0)
  g.bezierCurveTo(-3, -20, -16, -36, -36, -40)
  g.quadraticCurveTo(-33, -31, -41, -26)
  g.quadraticCurveTo(-33, -19, -38, -12)
  g.quadraticCurveTo(-27, -9, -27, -1)
  g.quadraticCurveTo(-13, 5, 0, 0)
  g.closePath()
  g.fillStyle = fill
  g.fill()
  g.lineWidth = 2.4
  g.strokeStyle = INK
  g.stroke()
  // Coloured feather tips along the trailing edge.
  g.beginPath()
  g.moveTo(-36, -40)
  g.quadraticCurveTo(-33, -31, -41, -26)
  g.quadraticCurveTo(-33, -19, -38, -12)
  g.quadraticCurveTo(-27, -9, -27, -1)
  g.lineWidth = 4
  g.strokeStyle = tip
  g.stroke()
  // Two soft feather partings.
  g.beginPath()
  g.moveTo(-8, -6)
  g.quadraticCurveTo(-20, -14, -30, -20)
  g.moveTo(-6, -14)
  g.quadraticCurveTo(-18, -26, -28, -32)
  g.lineWidth = 1.2
  g.strokeStyle = INK
  g.stroke()
  g.restore()
}

/** The wings' gentle flap: a slow breath at rest, a real flap on a hop. */
const flapOf = (a: RigAnchors): number => 0.5 + 0.5 * sin(a.t * (2.2 + a.lift * 5)) * (0.25 + 0.75 * a.lift)

/** The Fluffy Pegasus Wings (ch3 keepsake), far layer: behind the body. The
 *  wings root a little behind the withers, on the back, pegasus-sized. */
export const drawWingsFar = (g: G2D, a: RigAnchors): void => {
  const [x, y] = a.backWithers
  wing(g, x - 8, y - 2, 1.4, flapOf(a) * 0.9, '#e2d6fa', '#c7a6ff')
}

/** …and the near layer, over the body AND the mane (drawn at `afterMane`). */
export const drawWingsNear = (g: G2D, a: RigAnchors): void => {
  const [x, y] = a.backWithers
  wing(g, x - 16, y + 6, 1.5, flapOf(a), '#fff6fb', '#ffb3d2')
}

const HEAD_DRAW: Readonly<Record<string, (g: G2D) => void>> = {
  flowerCrown: drawFlowerCrown
}
const NECK_DRAW: Readonly<Record<string, (g: G2D, a: RigAnchors) => void>> = {
  seashellNecklace: drawSeashellNecklace
}
const BACK_DRAW: Readonly<Record<string, readonly [(g: G2D, a: RigAnchors) => void, (g: G2D, a: RigAnchors) => void]>> = {
  pegasusWings: [drawWingsFar, drawWingsNear]
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

/** The slug equipped in a slot, or undefined. */
const slugIn = (slot: typeof COSMETIC_SLOTS[number]): string | undefined => {
  const id = equippedIn(slot)
  const def = id >= 0 ? COSMETICS[id] : undefined
  return def && def.slot === slot ? def.slug : undefined
}

/**
 * Everything Aurora wears, as the rig's draw hooks (§9.7). Spread into a
 * `PoseState` wherever she is drawn — the duel, the wardrobe, a portrait.
 */
export const equippedHooks = (): Pick<PoseState, 'afterHead' | 'afterMane' | 'beforeTorso' | 'afterTorso'> => {
  const head = slugIn('head')
  const neck = slugIn('neck')
  const back = slugIn('back')
  const wings = back ? BACK_DRAW[back] : undefined
  const necklace = neck ? NECK_DRAW[neck] : undefined
  const near = wings?.[1]
  return {
    afterHead: head ? HEAD_DRAW[head] : undefined,
    // The near wing lies over the mane; the necklace goes on last, on top.
    afterMane: near || necklace
      ? (g: G2D, a: RigAnchors): void => {
          near?.(g, a)
          necklace?.(g, a)
        }
      : undefined,
    beforeTorso: wings?.[0],
    afterTorso: undefined
  }
}

/** A key naming what is worn (for caches of baked portraits). */
export const equippedKey = (): string => [slugIn('head'), slugIn('neck'), slugIn('back')].map((s) => s ?? '-').join('|')
