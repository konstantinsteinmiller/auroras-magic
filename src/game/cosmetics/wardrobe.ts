/**
 * wardrobe.ts — the Wardrobe Kiosk's diorama (story-spec §3.5.4, §3.9.2, C17).
 *
 * Inside the striped tent: Aurora stands big on a round rug under a string of
 * fairy lights, breathing, wearing whatever is equipped — drawn by the SAME
 * rig as the duel, with the cosmetics hooked into its draw order. The shelf of
 * items is DOM (`WardrobeScene.vue`). Landscape puts Aurora at ~40 % of the
 * width; portrait puts her in the upper 45 %.
 *
 * An ADMIRE moment (§3.9.2 item 3) plays the first time a new keepsake is
 * worn: a sparkle burst and a happy rear.
 */
import { S } from '@/game/duel/state'
import { drawUnicorn } from '@/game/duel/chars'
import { sparkleBurst, drawFxOver, drawFxUnder } from '@/game/duel/fx'
import { equippedHeadDraw } from '@/game/cosmetics/rig-cosmetics'
import { TAU, sin, clamp } from '@/game/duel/util'
import { reducedMotion } from '@/use/useAccessibility'

type G2D = CanvasRenderingContext2D

let T = 0
let Ta = 0
let admireT = -1
let vw = 1
let vh = 1

export const wardrobeResize = (): void => {
  vw = S.w
  vh = S.h
}

/** Where Aurora stands, CSS px, and how tall (hooves to horn). */
const stand = (): { x: number; y: number; size: number } => {
  const portrait = vh >= vw
  if (portrait) {
    const size = Math.min(vw * 0.62, vh * 0.34)
    return { x: vw * 0.5 - size * 0.08, y: vh * 0.43, size }
  }
  const size = Math.min(vh * 0.62, vw * 0.3)
  return { x: vw * 0.38 - size * 0.08, y: vh * 0.8, size }
}

/** Celebrate the item just put on (the admire moment). */
export const admire = (): void => {
  admireT = 0
  const s = stand()
  sparkleBurst(s.x + s.size * 0.12, s.y - s.size * 0.85, 1.1)
}

export const updateWardrobe = (dt: number): void => {
  T += dt
  if (admireT >= 0) {
    admireT += dt
    if (admireT > 2.2) admireT = -1
  }
}

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
  drawUnicorn(g, 0, 0, -1, { win: hop * 0.8, form: 0.15 + 0.1 * sin(Ta * 1.4), afterHead: equippedHeadDraw() }, Ta)
  g.restore()
  g.setTransform(d, 0, 0, d, 0, 0)
  drawFxUnder(g)
  drawFxOver(g)
}
