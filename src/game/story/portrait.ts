/**
 * portrait.ts — the dialogue portraits (story-spec §9.7.1, §10.6).
 *
 * No bitmaps and no new rig: a portrait is a head-and-shoulders crop of the
 * SAME `chars.ts` rig the duel draws, with the emote as a `face` (brow, eye,
 * mouth, blush). Each (speaker, emote) is baked ONCE into a small offscreen
 * canvas and handed to the DOM bubble as a data URL, so the dialogue chrome
 * owns no canvas of its own (§4.1.4). Bounded by the combos actually
 * scripted, a few dozen at most.
 *
 * The filler creatures of the standard-node templates are not unicorns: they
 * get a small drawing of their own, one per chapter — Twig the wood sprite
 * (1), Shelly the hermit crab (2), Puff the winged cloud (3).
 */
import { drawUnicorn, type Face } from '@/game/duel/chars'
import { guardianOf } from '@/game/duel/foes'
import { equippedHooks, equippedKey } from '@/game/cosmetics/rig-cosmetics'
import type { Emote, SpeakerId } from '@/game/story/story'

/** §10.6's emote table, as the rig's three numbers plus blush. */
export const EMOTE_FACE: Readonly<Record<Emote, Face>> = {
  happy: { brow: 0.25, eye: 1, mouth: 1, blush: 0.25 },
  sleepy: { brow: 0, eye: 0.3, mouth: 0.05, blush: 0 },
  worriedMild: { brow: 0.85, eye: 1, mouth: -0.2, blush: 0 },
  determined: { brow: -0.55, eye: 0.8, mouth: 0, blush: 0 },
  stern: { brow: -1, eye: 0.62, mouth: -0.4, blush: 0 },
  warmBlush: { brow: 0.3, eye: 0.9, mouth: 0.8, blush: 1 },
  cheering: { brow: 0.6, eye: 0, mouth: 1.2, blush: 0.5 }
}

/** The badge colour behind each speaker. */
const BADGE: Readonly<Record<SpeakerId, [string, string]>> = {
  aurora: ['#ffe7b8', '#ffc9e4'],
  umbra: ['#3b2d63', '#6a4fa8'],
  briar: ['#d7f5b8', '#8fdc72'],
  pearl: ['#dff8ff', '#8fdcf0'],
  zephyr: ['#e4fffb', '#9fd8f0'],
  creature: ['#e6ffd8', '#bdf5a0']
}

/** A creature's badge, by who it is. */
const CREATURE_BADGE: Readonly<Record<string, [string, string]>> = {
  Twig: ['#e6ffd8', '#bdf5a0'],
  Shelly: ['#fff4dc', '#ffd8b0'],
  Puff: ['#f0f4ff', '#cdd8ff']
}

/** Which Guardian a boss speaker is (the rig's palette). */
const SPEAKER_FOE: Readonly<Partial<Record<SpeakerId, number>>> = {
  umbra: guardianOf(9),
  briar: guardianOf(0),
  pearl: guardianOf(1),
  zephyr: guardianOf(2)
}

const PX = 192
const cache = new Map<string, string>()

/** Draw the head of a unicorn speaker, cropped into a PX × PX badge. */
const drawRigHead = (g: CanvasRenderingContext2D, speaker: SpeakerId, face: Face): void => {
  const foeSide = speaker !== 'aurora'
  const side = foeSide ? 1 : -1
  // The head sits ~(±22, -120) above the hooves; frame it, with room for the horn.
  const s = PX / 150
  g.save()
  g.translate(PX / 2 - (foeSide ? -22 : 22) * s, PX * 0.56 + 120 * s)
  g.scale(s, s)
  const worn = speaker === 'aurora' ? equippedHooks() : {}
  drawUnicorn(g, 0, 0, side, { face, foe: SPEAKER_FOE[speaker] ?? guardianOf(0), ...worn }, 1.3)
  g.restore()
}

/** The little face every creature wears: eyes, brows, cheeks, mouth. */
const creatureFace = (g: CanvasRenderingContext2D, face: Face, c: number, dy: number, stroke: (w: number) => void): void => {
  const ink = '#3A2340'
  for (const d of [-1, 1]) {
    g.beginPath()
    if (face.eye < 0.12) {
      g.arc(c + d * 20, c + 12 + dy, 9, Math.PI + 0.4, -0.4)
      stroke(5)
    } else {
      g.ellipse(c + d * 20, c + 8 + dy, 9, 13 * face.eye + 1, 0, 0, Math.PI * 2)
      g.fillStyle = ink
      g.fill()
      g.beginPath()
      g.arc(c + d * 20 + 3, c + 3 + dy, 3.5, 0, Math.PI * 2)
      g.fillStyle = '#fff'
      g.fill()
    }
  }
  for (const d of [-1, 1]) {
    g.beginPath()
    g.moveTo(c + d * 30, c - 10 + dy + face.brow * 2)
    g.lineTo(c + d * 11, c - 10 + dy - face.brow * 5)
    stroke(4)
  }
  g.globalAlpha = 0.45 + face.blush * 0.4
  for (const d of [-1, 1]) {
    g.beginPath()
    g.ellipse(c + d * 34, c + 28 + dy, 9, 5, 0, 0, Math.PI * 2)
    g.fillStyle = '#ff9eb5'
    g.fill()
  }
  g.globalAlpha = 1
  g.beginPath()
  if (face.mouth > 0.2) g.arc(c, c + 30 + dy, 10, 0.2, Math.PI - 0.2)
  else if (face.mouth > -0.1) {
    g.moveTo(c - 7, c + 34 + dy)
    g.lineTo(c + 7, c + 34 + dy)
  } else g.arc(c, c + 42 + dy, 9, Math.PI + 0.5, -0.5)
  if (face.mouth >= 0.9) {
    g.fillStyle = '#b04a5a'
    g.fill()
  }
  stroke(4)
}

/** Shelly, the chapter-2 hermit crab: a coral spiral shell, a round face, two claws. */
const drawShelly = (g: CanvasRenderingContext2D, face: Face): void => {
  const c = PX / 2
  const ink = '#3A2340'
  g.lineJoin = g.lineCap = 'round'
  const stroke = (w: number): void => {
    g.lineWidth = w
    g.strokeStyle = ink
    g.stroke()
  }
  // The shell, riding high on her back.
  g.beginPath()
  g.arc(c + 6, c - 34, 44, 0, Math.PI * 2)
  g.fillStyle = '#ff9f8a'
  g.fill()
  stroke(6)
  g.beginPath()
  for (let i = 0; i <= 40; i++) {
    const a = i * 0.42
    const r = 38 - i * 0.9
    const x = c + 6 + Math.cos(a) * r
    const y = c - 34 + Math.sin(a) * r
    if (i) g.lineTo(x, y)
    else g.moveTo(x, y)
  }
  stroke(4)
  // Claws.
  for (const d of [-1, 1]) {
    g.beginPath()
    g.arc(c + d * 62, c + 26, 16, 0, Math.PI * 2)
    g.fillStyle = '#ff7a6a'
    g.fill()
    stroke(5)
    g.beginPath()
    g.moveTo(c + d * 62, c + 26)
    g.lineTo(c + d * 74, c + 16)
    stroke(4)
  }
  // Body.
  g.beginPath()
  g.ellipse(c, c + 22, 50, 40, 0, 0, Math.PI * 2)
  g.fillStyle = '#ffb08a'
  g.fill()
  stroke(6)
  creatureFace(g, face, c, 8, stroke)
}

/** Puff, the chapter-3 cloud: a fluffy lavender cloud with two little wings. */
const drawPuff = (g: CanvasRenderingContext2D, face: Face): void => {
  const c = PX / 2
  const ink = '#3A2340'
  g.lineJoin = g.lineCap = 'round'
  const stroke = (w: number): void => {
    g.lineWidth = w
    g.strokeStyle = ink
    g.stroke()
  }
  for (const d of [-1, 1]) {
    g.beginPath()
    g.ellipse(c + d * 66, c - 6, 26, 14, d * -0.6, 0, Math.PI * 2)
    g.fillStyle = '#fff6fb'
    g.fill()
    stroke(5)
  }
  g.beginPath()
  for (const [dx, dy, r] of [[-34, 18, 30], [0, 0, 40], [34, 16, 30], [-16, 30, 30], [18, 32, 28]] as const) {
    g.moveTo(c + dx + r, c + dy)
    g.arc(c + dx, c + dy, r, 0, Math.PI * 2)
  }
  g.fillStyle = '#e4e8ff'
  g.fill()
  stroke(6)
  g.beginPath()
  g.ellipse(c - 14, c - 18, 16, 8, -0.4, 0, Math.PI * 2)
  g.fillStyle = '#ffffff'
  g.fill()
  creatureFace(g, face, c, 6, stroke)
}

/** Twig, the chapter-1 wood sprite: a round moss body, leaf ears, a sprout. */
const drawSprite = (g: CanvasRenderingContext2D, face: Face): void => {
  const c = PX / 2
  const ink = '#3A2340'
  g.lineJoin = g.lineCap = 'round'
  const stroke = (w: number): void => {
    g.lineWidth = w
    g.strokeStyle = ink
    g.stroke()
  }
  // Leaf ears.
  for (const d of [-1, 1]) {
    g.beginPath()
    g.ellipse(c + d * 50, c - 8, 30, 13, d * -0.5, 0, Math.PI * 2)
    g.fillStyle = '#4fbf4a'
    g.fill()
    stroke(5)
  }
  // Body.
  g.beginPath()
  g.arc(c, c + 14, 54, 0, Math.PI * 2)
  g.fillStyle = '#7ee85a'
  g.fill()
  stroke(6)
  g.beginPath()
  g.ellipse(c - 16, c - 8, 18, 10, -0.4, 0, Math.PI * 2)
  g.fillStyle = '#c9f7a0'
  g.fill()
  // Sprout.
  g.beginPath()
  g.moveTo(c, c - 38)
  g.quadraticCurveTo(c + 4, c - 58, c - 2, c - 68)
  stroke(5)
  g.beginPath()
  g.ellipse(c + 12, c - 64, 14, 7, -0.6, 0, Math.PI * 2)
  g.fillStyle = '#5fd35a'
  g.fill()
  stroke(4)
  // Eyes: wide, or happy crescents when closed.
  for (const d of [-1, 1]) {
    g.beginPath()
    if (face.eye < 0.12) {
      g.arc(c + d * 20, c + 12, 9, Math.PI + 0.4, -0.4)
      stroke(5)
    } else {
      g.ellipse(c + d * 20, c + 8, 9, 13 * face.eye + 1, 0, 0, Math.PI * 2)
      g.fillStyle = ink
      g.fill()
      g.beginPath()
      g.arc(c + d * 20 + 3, c + 3, 3.5, 0, Math.PI * 2)
      g.fillStyle = '#fff'
      g.fill()
    }
  }
  // Brows.
  for (const d of [-1, 1]) {
    g.beginPath()
    g.moveTo(c + d * 30, c - 10 + face.brow * 2)
    g.lineTo(c + d * 11, c - 10 - face.brow * 5)
    stroke(4)
  }
  // Cheeks and mouth.
  g.globalAlpha = 0.45 + face.blush * 0.4
  for (const d of [-1, 1]) {
    g.beginPath()
    g.ellipse(c + d * 34, c + 28, 9, 5, 0, 0, Math.PI * 2)
    g.fillStyle = '#ff9eb5'
    g.fill()
  }
  g.globalAlpha = 1
  g.beginPath()
  if (face.mouth > 0.2) g.arc(c, c + 30, 10, 0.2, Math.PI - 0.2)
  else if (face.mouth > -0.1) {
    g.moveTo(c - 7, c + 34)
    g.lineTo(c + 7, c + 34)
  } else g.arc(c, c + 42, 9, Math.PI + 0.5, -0.5)
  if (face.mouth >= 0.9) {
    g.fillStyle = '#b04a5a'
    g.fill()
  }
  stroke(4)
}

/** A portrait as a data URL, baked on first use. `creature` names which
 *  chapter's filler creature a `creature` bubble shows. */
export const portraitUrl = (speaker: SpeakerId, emote: Emote, creature = 'Twig'): string => {
  const key = `${speaker}:${emote}:${speaker === 'aurora' ? equippedHeadKey() : speaker === 'creature' ? creature : ''}`
  const hit = cache.get(key)
  if (hit) return hit
  if (typeof document === 'undefined') return ''
  const cv = document.createElement('canvas')
  cv.width = cv.height = PX
  const g = cv.getContext('2d')
  if (!g) return ''
  const [a, b] = speaker === 'creature' ? CREATURE_BADGE[creature] ?? BADGE.creature : BADGE[speaker]
  const gr = g.createRadialGradient(PX / 2, PX * 0.4, 10, PX / 2, PX / 2, PX / 2)
  gr.addColorStop(0, a)
  gr.addColorStop(1, b)
  g.save()
  g.beginPath()
  g.arc(PX / 2, PX / 2, PX / 2 - 4, 0, Math.PI * 2)
  g.fillStyle = gr
  g.fill()
  g.clip()
  const face = EMOTE_FACE[emote]
  if (speaker === 'creature') {
    if (creature === 'Shelly') drawShelly(g, face)
    else if (creature === 'Puff') drawPuff(g, face)
    else drawSprite(g, face)
  }
  else drawRigHead(g, speaker, face)
  g.restore()
  g.beginPath()
  g.arc(PX / 2, PX / 2, PX / 2 - 4, 0, Math.PI * 2)
  g.lineWidth = 6
  g.strokeStyle = '#3A2340'
  g.stroke()
  const url = cv.toDataURL()
  cache.set(key, url)
  return url
}

/** Aurora's portrait depends on what she wears: part of the cache key. */
const equippedHeadKey = (): string => equippedKey()
