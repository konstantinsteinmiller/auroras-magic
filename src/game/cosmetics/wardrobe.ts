/**
 * wardrobe.ts — the Wardrobe Kiosk's diorama (story-spec §3.5.4, §3.9.2, C17).
 *
 * Inside the striped tent: Aurora stands big on a round rug under a string of
 * fairy lights, breathing, wearing whatever is equipped — drawn by the SAME
 * rig as the duel, with the cosmetics hooked into its draw order. The shelf of
 * items is DOM (`WardrobeScene.vue`), which reports where it sits so she is
 * fitted beside it (landscape) or above it (portrait).
 *
 * An ADMIRE moment (§3.9.2 item 3) plays the first time a new keepsake is
 * worn: a happy rear, and a sparkle burst where the keepsake is — the crown
 * on her head, the scarf at her neck, the star above her tail, the trail at
 * her hooves, a whole-coat shimmer for a skin.
 */
import { S } from '@/game/duel/state'
import { drawUnicorn, type PoseState } from '@/game/duel/chars'
import { sparkleBurst, drawFxOver, drawFxUnder } from '@/game/duel/fx'
import { equippedHooks } from '@/game/cosmetics/rig-cosmetics'
import { COSMETICS, type CosmeticSlot } from '@/game/campaign/tables'
import { TAU, sin, clamp } from '@/game/duel/util'
import { reducedMotion } from '@/use/useAccessibility'

type G2D = CanvasRenderingContext2D

let T = 0
let Ta = 0
let admireT = -1
let vw = 1
let vh = 1
/** The shelf's box in CSS px (0 wide = not measured yet). */
const shelf = { left: 0, top: 0, width: 0 }

export const wardrobeResize = (): void => {
  vw = S.w
  vh = S.h
}

/** Where the DOM shelf sits (CSS px), so Aurora stands clear of it. */
export const setWardrobeShelf = (left: number, top: number, width: number): void => {
  shelf.left = left
  shelf.top = top
  shelf.width = width
}

/** Where Aurora stands, CSS px, and how tall (hooves to horn). */
const stand = (): { x: number; y: number; size: number } => {
  const portrait = vh >= vw
  if (portrait) {
    // Above the shelf, below the back button's row.
    const floor = shelf.width ? shelf.top - 14 : vh * 0.5
    const room = floor - 78
    const size = Math.max(90, Math.min(vw * 0.62, vh * 0.34, room / 1.16))
    return { x: vw * 0.5 - size * 0.08, y: floor - size * 0.15, size }
  }
  // Beside the shelf: at ~38 % of the width, nudged left (and, on a small
  // phone, shrunk) only when her muzzle would reach under it.
  const room = shelf.width ? shelf.left - 12 : vw
  const size = Math.min(vh * 0.62, vw * 0.3, room * 0.62)
  const x = Math.min(vw * 0.38 - size * 0.08, room - size * 0.34)
  return { x, y: vh * 0.8, size }
}

/** Where on her (rig units, facing +x, hooves at 0) a slot's keepsake sits. */
const SLOT_SPOT: Readonly<Record<CosmeticSlot, readonly [number, number]>> = {
  head: [22, -150],
  neck: [14, -84],
  back: [-14, -126],
  companion: [-42, -132],
  trail: [0, -8],
  mane: [-12, -112],
  skin: [0, -90]
}

/** Celebrate the item just put on (the admire moment). `id` is the
 *  cosmetic worn; without it the burst goes to her head. */
export const admire = (id?: number): void => {
  admireT = 0
  const s = stand()
  const k = s.size / 197
  const slot = id !== undefined ? COSMETICS[id]?.slot : undefined
  const [rx, ry] = SLOT_SPOT[slot ?? 'head']
  sparkleBurst(s.x + rx * k, s.y + (ry - 6) * k, slot === 'skin' ? 1.3 : 1.1)
  if (slot === 'skin') {
    // A skin is all of her: a shimmer over the coat, head to hooves.
    sparkleBurst(s.x - 40 * k, s.y - 60 * k, 0.8)
    sparkleBurst(s.x + 30 * k, s.y - 130 * k, 0.8)
  } else if (slot === 'trail') {
    sparkleBurst(s.x - 27 * k, s.y - 8 * k, 0.8)
  }
}

export const updateWardrobe = (dt: number): void => {
  T += dt
  if (admireT >= 0) {
    admireT += dt
    if (admireT > 2.2) admireT = -1
  }
}

/** Her pose, reused frame to frame. */
const POSE: PoseState = { win: 0, form: 0 }

export const drawWardrobe = (g: G2D): void => {
  // Reduced motion (§3.11): the lights and her idle bob settle; the admire
  // hop, a one-shot reward beat, still plays.
  Ta = reducedMotion.value ? 0 : T
  const d = S.dpr
  g.setTransform(d, 0, 0, d, 0, 0)
  g.globalAlpha = 1
  // The tent: warm striped canvas walls.
  const stripe = Math.max(36, vw / 14)
  for (let x = 0, i = 0; x < vw; x += stripe, i++) {
    g.fillStyle = i & 1 ? '#ffd9ec' : '#fff3f8'
    g.fillRect(x, 0, stripe, vh)
  }
  // A soft vignette toward the canvas's edges, and the floor.
  const vg = g.createRadialGradient(vw / 2, vh * 0.45, Math.min(vw, vh) * 0.2, vw / 2, vh * 0.45, Math.max(vw, vh) * 0.75)
  vg.addColorStop(0, 'rgba(255,255,255,0)')
  vg.addColorStop(1, 'rgba(90,50,110,0.35)')
  g.fillStyle = vg
  g.fillRect(0, 0, vw, vh)
  const s = stand()
  g.fillStyle = '#f4c7a6'
  g.fillRect(0, s.y - s.size * 0.02, vw, vh)
  // The round rug Aurora stands on.
  g.beginPath()
  g.ellipse(s.x + s.size * 0.08, s.y + s.size * 0.02, s.size * 0.6, s.size * 0.13, 0, 0, TAU)
  g.fillStyle = '#b58cff'
  g.fill()
  g.lineWidth = 4
  g.strokeStyle = '#3A2340'
  g.stroke()
  g.beginPath()
  g.ellipse(s.x + s.size * 0.08, s.y + s.size * 0.02, s.size * 0.44, s.size * 0.09, 0, 0, TAU)
  g.strokeStyle = '#fff1a8'
  g.lineWidth = 3
  g.stroke()
  // Fairy lights along the top.
  for (let i = 0; i <= 12; i++) {
    const x = (vw * i) / 12
    const y = 26 + sin(i * 1.3) * 8 + 10
    const a = 0.55 + 0.45 * sin(Ta * 2 + i)
    g.globalAlpha = a * 0.5
    g.beginPath()
    g.arc(x, y, 12, 0, TAU)
    g.fillStyle = i % 3 === 0 ? '#ffd34d' : i % 3 === 1 ? '#ff8fc4' : '#9fd8ff'
    g.fill()
    g.globalAlpha = 1
    g.beginPath()
    g.arc(x, y, 5, 0, TAU)
    g.fill()
  }
  g.beginPath()
  for (let i = 0; i <= 12; i++) {
    const x = (vw * i) / 12
    const y = 26 + sin(i * 1.3) * 8 + 10
    if (i) g.lineTo(x, y)
    else g.moveTo(x, y)
  }
  g.lineWidth = 2
  g.strokeStyle = '#3A2340'
  g.stroke()
  // Aurora, big, in her things.
  const k = s.size / 197
  const hop = admireT >= 0 ? clamp(1 - Math.abs(admireT - 0.6) / 0.6, 0, 1) : 0
  g.save()
  g.translate(s.x, s.y)
  g.scale(k, k)
  POSE.win = hop * 0.8
  POSE.form = 0.15 + 0.1 * sin(Ta * 1.4)
  Object.assign(POSE, equippedHooks())
  drawUnicorn(g, 0, 0, -1, POSE, Ta)
  g.restore()
  g.setTransform(d, 0, 0, d, 0, 0)
  drawFxUnder(g)
  drawFxOver(g)
}
