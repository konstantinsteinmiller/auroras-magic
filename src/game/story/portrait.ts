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
 * (1), Shelly the hermit crab (2), Puff the winged cloud (3), Glint the
 * glowworm (4), Blink the mirror moth (5), Rio the rainbow finch (6), Dune the
 * sand-fox pup (7), Frosty the snow hare (8), Wisp the firefly (9) and Sprig,
 * chapter 1's sprite back in a party hat for the Festival (10).
 *
 * PAINTED (§8.27): each speaker's expressions are one painted strip
 * (`PORTRAIT_SETS`, `images/portraits/portrait-<who>.webp`). When it has
 * decoded, the badge draws that panel inside its ring instead of the rig; the
 * ring and the badge colour stay drawn. Aurora's painting is her bare self,
 * so it stands in only while she wears nothing a portrait shows (a crown, a
 * necklace or scarf, a skin, a mane colour) — otherwise the rig draws her,
 * dressed.
 */
import { ref } from 'vue'
import { drawUnicorn, type Face } from '@/game/duel/chars'
import { FOES, guardianOf } from '@/game/duel/foes'
import { equippedHooks, equippedKey } from '@/game/cosmetics/rig-cosmetics'
import { COSMETIC_SLOTS } from '@/game/campaign/tables'
import { onArtChanged, spriteFor } from '@/game/art'
import { drawItem, type ItemSpec } from '@/game/artItem'
import { PORTRAIT_SETS, portraitArtId, portraitSetOf, type PortraitEmote } from '@/game/artIds'
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
  terra: ['#f6eeff', '#c7b0ec'],
  echo: ['#eef3ff', '#a3b3e8'],
  prism: ['#fff6d2', '#9fdcff'],
  ember: ['#ffefe2', '#ffb394'],
  glace: ['#f2fbff', '#a9dcff'],
  nova: ['#fffbe2', '#ffdc85'],
  creature: ['#e6ffd8', '#bdf5a0']
}

/** A creature's badge, by who it is. */
const CREATURE_BADGE: Readonly<Record<string, [string, string]>> = {
  Twig: ['#e6ffd8', '#bdf5a0'],
  Shelly: ['#fff4dc', '#ffd8b0'],
  Puff: ['#f0f4ff', '#cdd8ff'],
  Glint: ['#e2fbff', '#98d6ea'],
  Blink: ['#effff7', '#a3e2c8'],
  Rio: ['#fff7d8', '#ffc6e2'],
  Dune: ['#eef8ff', '#a8d2f2'],
  Frosty: ['#e8ecff', '#a9b0e6'],
  Wisp: ['#8f86d8', '#4b4590'],
  Sprig: ['#fff7d6', '#ffcfe6']
}

/** Which Guardian a boss speaker is (the rig's palette). */
const SPEAKER_FOE: Readonly<Partial<Record<SpeakerId, number>>> = {
  umbra: guardianOf(9),
  briar: guardianOf(0),
  pearl: guardianOf(1),
  zephyr: guardianOf(2),
  terra: guardianOf(3),
  echo: guardianOf(4),
  prism: guardianOf(5),
  ember: guardianOf(6),
  glace: guardianOf(7),
  nova: guardianOf(8)
}

/**
 * §10.6's pose column, for the creatures (the rig has no pose of its own in a
 * portrait): `perk` lifts ears, antennae, crests and wings (-1 drooped … 1
 * up), `tilt` leans the head (negative = toward Aurora on the left), `hop`
 * lifts the whole creature a little, and `glow` scales anything that shines.
 */
interface CreaturePose { perk: number; tilt: number; hop: number; glow: number }
const EMOTE_POSE: Readonly<Record<Emote, CreaturePose>> = {
  happy: { perk: 0.45, tilt: 0, hop: 0, glow: 0.85 },
  sleepy: { perk: -1, tilt: 0.14, hop: -4, glow: 0.45 },
  worriedMild: { perk: -0.55, tilt: 0.1, hop: 0, glow: 0.6 },
  determined: { perk: 0.75, tilt: 0, hop: 0, glow: 0.9 },
  stern: { perk: -0.25, tilt: 0, hop: 0, glow: 0.7 },
  warmBlush: { perk: 0.3, tilt: -0.1, hop: 0, glow: 0.9 },
  cheering: { perk: 1, tilt: 0, hop: 6, glow: 1 }
}

const INK = '#3A2340'

const PX = 192
const cache = new Map<string, string>()

/** Speakers whose coat is too dark for the rig's plum brow and mouth to read
 *  at badge size; their portraits re-ink the face rim-lit (`rimFace`). */
const RIM_LIT: ReadonlySet<SpeakerId> = new Set<SpeakerId>(['umbra', 'zephyr', 'terra', 'prism', 'ember', 'glace', 'nova'])

/**
 * On a dark coat the rig's plum brow, mouth and closed eye vanish, and so does
 * a purple blush — the whole of `warmBlush`. For those speakers the portrait
 * re-inks them through the rig's own `afterHead` hook (head space): a light
 * core in the Guardian's streak colour inside the plum line, and a pink
 * blush. The geometry mirrors `chars.ts`'s portrait face.
 */
const rimFace = (face: Face, light: string) => (g: CanvasRenderingContext2D): void => {
  const line = (w: number): void => {
    g.lineWidth = w + 1.6
    g.strokeStyle = INK
    g.stroke()
    g.lineWidth = w
    g.strokeStyle = light
    g.stroke()
  }
  g.lineCap = g.lineJoin = 'round'
  g.globalAlpha = 0.35 + face.blush * 0.6
  g.beginPath()
  g.ellipse(4, 10, 5.6 + face.blush * 1.5, 3.2, 0, 0, Math.PI * 2)
  g.fillStyle = '#ff9eb5'
  g.fill()
  g.globalAlpha = 1
  g.beginPath()
  g.moveTo(1, -15 + face.brow * 1.5)
  g.quadraticCurveTo(9, -18 - Math.abs(face.brow) * 0.5, 18, -15 - face.brow * 4)
  line(1.8)
  if (face.eye < 0.12) {
    g.beginPath()
    if (face.mouth > 0) g.arc(9, 3, 7, Math.PI + 0.4, -0.4)
    else g.arc(10, -6, 7, 0.5, Math.PI - 0.5)
    line(1.8)
  }
  // The open grin already reads: its fill is red.
  if (face.mouth < 0.9) {
    g.beginPath()
    if (face.mouth > 0.2) g.arc(24, 12, 4.4, 0.3, 2.4)
    else if (face.mouth > -0.1) {
      g.moveTo(21, 13.5)
      g.lineTo(27.5, 13.2)
    } else g.arc(24, 17.5, 4.2, Math.PI + 0.55, -0.55)
    line(1.5)
  }
}

/** Draw the head of a unicorn speaker, cropped into a PX × PX badge. `bare`:
 *  Aurora as herself, wearing nothing (the painted strip's reference). */
const drawRigHead = (g: CanvasRenderingContext2D, speaker: SpeakerId, face: Face, bare = false): void => {
  const foeSide = speaker !== 'aurora'
  const side = foeSide ? 1 : -1
  // The head sits ~(±22, -120) above the hooves; frame it, with room for the horn.
  const s = PX / 150
  g.save()
  g.translate(PX / 2 - (foeSide ? -22 : 22) * s, PX * 0.56 + 120 * s)
  g.scale(s, s)
  const foe = SPEAKER_FOE[speaker] ?? guardianOf(0)
  const streak = FOES[foe]?.pal[4]
  const worn = speaker === 'aurora' ? (bare ? {} : equippedHooks()) : RIM_LIT.has(speaker) && streak ? { afterHead: rimFace(face, streak) } : {}
  drawUnicorn(g, 0, 0, side, { face, foe, ...worn }, 1.3)
  g.restore()
}

type G = CanvasRenderingContext2D
type Stroke = (w: number) => void
const TAU = Math.PI * 2

/** A stroker in the plum ink. */
const pen = (g: G): Stroke => (w) => {
  g.lineWidth = w
  g.strokeStyle = INK
  g.stroke()
}

/** Circles as one path (a cloud, a ruff of fluff). */
const circles = (g: G, list: readonly (readonly [number, number, number])[]): void => {
  g.beginPath()
  for (const [x, y, r] of list) {
    g.moveTo(x + r, y)
    g.arc(x, y, r, 0, TAU)
  }
}

/** Fill the current path with ONE outline round the union of its shapes: the
 *  stroke goes first at twice the width and the fill covers its inner half,
 *  so overlapping puffs show no seams. */
const fillUnion = (g: G, fill: string | CanvasGradient, w: number): void => {
  g.lineWidth = w * 2
  g.strokeStyle = INK
  g.stroke()
  g.fillStyle = fill
  g.fill()
}

/** A little faceted gem (a kite with one light facet), pointing along `a`. */
const gem = (g: G, x: number, y: number, w: number, h: number, a: number, fill: string, light: string): void => {
  g.save()
  g.translate(x, y)
  g.rotate(a)
  g.beginPath()
  g.moveTo(0, -h)
  g.lineTo(w, -h * 0.25)
  g.lineTo(0, h)
  g.lineTo(-w, -h * 0.25)
  g.closePath()
  g.fillStyle = fill
  g.fill()
  g.beginPath()
  g.moveTo(0, -h)
  g.lineTo(-w, -h * 0.25)
  g.lineTo(0, h * 0.1)
  g.closePath()
  g.fillStyle = light
  g.fill()
  g.beginPath()
  g.moveTo(0, -h)
  g.lineTo(w, -h * 0.25)
  g.lineTo(0, h)
  g.lineTo(-w, -h * 0.25)
  g.closePath()
  g.lineWidth = 3
  g.strokeStyle = INK
  g.stroke()
  g.restore()
}

/** A four-point twinkle, no outline (background sparkle). */
const twinkle = (g: G, x: number, y: number, r: number, fill: string): void => {
  g.beginPath()
  g.moveTo(x, y - r)
  g.quadraticCurveTo(x, y, x + r, y)
  g.quadraticCurveTo(x, y, x, y + r)
  g.quadraticCurveTo(x, y, x - r, y)
  g.quadraticCurveTo(x, y, x, y - r)
  g.fillStyle = fill
  g.fill()
}

/** A soft white highlight on a round body. */
const shine = (g: G, x: number, y: number, rx: number, ry: number, fill = 'rgba(255,255,255,0.6)'): void => {
  g.beginPath()
  g.ellipse(x, y, rx, ry, -0.4, 0, TAU)
  g.fillStyle = fill
  g.fill()
}

/** An antenna from `(x, y)`, leaning out by `a` (0 = straight up), `len` long;
 *  returns the tip. */
const antenna = (g: G, x: number, y: number, a: number, len: number, stroke: Stroke): [number, number] => {
  const tx = x + Math.sin(a) * len
  const ty = y - Math.cos(a) * len
  g.beginPath()
  g.moveTo(x, y)
  g.quadraticCurveTo(x + Math.sin(a) * len * 0.2, y - len * 0.75, tx, ty)
  stroke(4)
  return [tx, ty]
}

/** The little face every creature wears: eyes, brows, cheeks, mouth. */
const creatureFace = (g: G, face: Face, c: number, dy: number, stroke: Stroke): void => {
  const ink = INK
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
const drawShelly = (g: G, face: Face): void => {
  const c = PX / 2
  g.lineJoin = g.lineCap = 'round'
  const stroke = pen(g)
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
const drawPuff = (g: G, face: Face): void => {
  const c = PX / 2
  g.lineJoin = g.lineCap = 'round'
  const stroke = pen(g)
  for (const d of [-1, 1]) {
    g.beginPath()
    g.ellipse(c + d * 66, c - 6, 26, 14, d * -0.6, 0, Math.PI * 2)
    g.fillStyle = '#fff6fb'
    g.fill()
    stroke(5)
  }
  // One outline round the whole cloud, not one per puff (they hid her face).
  circles(g, [[c - 34, c + 18, 30], [c, c, 40], [c + 34, c + 16, 30], [c - 16, c + 30, 30], [c + 18, c + 32, 28]])
  fillUnion(g, '#e4e8ff', 6)
  g.beginPath()
  g.ellipse(c - 14, c - 18, 16, 8, -0.4, 0, Math.PI * 2)
  g.fillStyle = '#ffffff'
  g.fill()
  creatureFace(g, face, c, 6, stroke)
}

/** Twig, the chapter-1 wood sprite: a round moss body, leaf ears, a sprout.
 *  With `party`, she is Sprig at the chapter-10 Festival, in a party hat. */
const drawSprite = (g: G, face: Face, party = false): void => {
  const c = PX / 2
  g.lineJoin = g.lineCap = 'round'
  const stroke = pen(g)
  if (party) {
    // Confetti in the air behind her.
    const bits = [[-70, -38, 0.5, '#ff8fc4'], [72, -24, -0.4, '#6ec8ff'], [-78, 34, -0.3, '#ffe36b'],
      [70, 58, 0.7, '#b58cff'], [42, -70, 0.2, '#ffe36b'], [-44, 74, 0.9, '#6ec8ff'], [80, 18, 1.2, '#ff8fc4']] as const
    for (const [x, y, a, col] of bits) {
      g.save()
      g.translate(c + x, c + y)
      g.rotate(a)
      g.beginPath()
      g.roundRect(-6, -3.5, 12, 7, 2)
      g.fillStyle = col
      g.fill()
      g.lineWidth = 2.5
      g.strokeStyle = INK
      g.stroke()
      g.restore()
    }
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
  if (party) {
    // A tiny striped party hat, worn at a tilt beside the sprout.
    g.save()
    g.translate(c - 30, c - 28)
    g.rotate(-0.42)
    g.beginPath()
    g.moveTo(-19, 0)
    g.lineTo(0, -44)
    g.lineTo(19, 0)
    g.quadraticCurveTo(0, 7, -19, 0)
    g.closePath()
    g.fillStyle = '#ff8fc4'
    g.fill()
    g.save()
    g.clip()
    g.fillStyle = '#ffe36b'
    for (const y of [-30, -14]) {
      g.beginPath()
      g.moveTo(-24, y + 7)
      g.lineTo(24, y - 3)
      g.lineTo(24, y + 4)
      g.lineTo(-24, y + 14)
      g.closePath()
      g.fill()
    }
    g.restore()
    g.beginPath()
    g.moveTo(-19, 0)
    g.lineTo(0, -44)
    g.lineTo(19, 0)
    g.quadraticCurveTo(0, 7, -19, 0)
    g.closePath()
    stroke(5)
    g.beginPath()
    g.arc(0, -46, 8, 0, TAU)
    g.fillStyle = '#6ec8ff'
    g.fill()
    stroke(4)
    g.restore()
  }
  creatureFace(g, face, c, 0, stroke)
}

/** Glint, the chapter-4 glowworm: a round lilac cave critter with crystal
 *  speckles, crystal-tipped antennae and a tail curled up to a glowing tip. */
const drawGlint = (g: G, face: Face, pose: CreaturePose): void => {
  const c = PX / 2
  g.lineJoin = g.lineCap = 'round'
  const stroke = pen(g)
  const body = '#b9a6f2'
  // The tail's glow, then the tail itself.
  const tx = c + 62
  const ty = c - 30 - pose.perk * 4
  const halo = g.createRadialGradient(tx, ty, 10, tx, ty, 50)
  halo.addColorStop(0, `rgba(255,255,236,${0.95 * pose.glow})`)
  halo.addColorStop(0.5, `rgba(255,252,214,${0.5 * pose.glow})`)
  halo.addColorStop(1, 'rgba(255,252,214,0)')
  g.fillStyle = halo
  g.fillRect(tx - 50, ty - 50, 100, 100)
  twinkle(g, tx - 30, ty - 20, 6 * pose.glow + 2, '#fffbe0')
  twinkle(g, tx + 6, ty + 30, 5 * pose.glow + 2, '#fffbe0')
  // A tapering tail, one seamless outline, curling up from her back.
  const tail: [number, number, number][] = []
  for (let i = 0; i <= 16; i++) {
    const t = i / 16
    const u = 1 - t
    tail.push([
      u * u * (c + 36) + 2 * u * t * (c + 92) + t * t * (tx + 2),
      u * u * (c + 60) + 2 * u * t * (c + 38) + t * t * (ty + 16),
      21 - t * 12
    ])
  }
  circles(g, tail)
  fillUnion(g, body, 5)
  const bulb = g.createRadialGradient(tx - 5, ty - 6, 2, tx, ty, 20)
  bulb.addColorStop(0, '#ffffff')
  bulb.addColorStop(0.45, '#fff6a8')
  bulb.addColorStop(1, '#ffcf4a')
  g.beginPath()
  g.arc(tx, ty, 18, 0, TAU)
  g.fillStyle = bulb
  g.fill()
  stroke(5)
  // Antennae, each tipped with a tiny crystal.
  for (const d of [-1, 1]) {
    const a = d * (0.32 + (1 - pose.perk) * 0.36)
    const [x, y] = antenna(g, c + d * 18, c - 30, a, 30, stroke)
    gem(g, x, y, 6, 9, a, '#8feaff', '#e4fbff')
  }
  // Body.
  g.beginPath()
  g.arc(c, c + 16, 54, 0, TAU)
  g.fillStyle = body
  g.fill()
  stroke(6)
  shine(g, c - 18, c - 10, 18, 9, 'rgba(236,228,255,0.9)')
  // Crystal speckles, clear of the face.
  gem(g, c - 42, c + 2, 6, 10, -0.3, '#8feaff', '#e4fbff')
  gem(g, c + 1, c - 25, 7, 11, 0, '#ffb8e6', '#ffe8f7')
  gem(g, c + 43, c - 4, 5, 8, 0.35, '#8feaff', '#e4fbff')
  gem(g, c - 22, c + 60, 5, 7, 0.2, '#ffb8e6', '#ffe8f7')
  creatureFace(g, face, c, 6, stroke)
}

/** Blink, the chapter-5 mirror moth: a round ball of fluff between two big,
 *  shiny, mirror-glass wings, with feathery antennae. */
const drawBlink = (g: G, face: Face, pose: CreaturePose): void => {
  const c = PX / 2
  g.lineJoin = g.lineCap = 'round'
  const stroke = pen(g)
  const mirror = (x: number, y: number, rx: number, ry: number, a: number): void => {
    g.beginPath()
    g.ellipse(x, y, rx, ry, a, 0, TAU)
    const gr = g.createLinearGradient(x - rx, y - ry, x + rx, y + ry)
    gr.addColorStop(0, '#ffffff')
    gr.addColorStop(0.4, '#dfe8ff')
    gr.addColorStop(0.75, '#b8c5f2')
    gr.addColorStop(1, '#efe4ff')
    g.fillStyle = gr
    g.fill()
    g.save()
    g.clip()
    g.translate(x, y)
    g.rotate(-0.85)
    g.fillStyle = 'rgba(255,255,255,0.95)'
    g.fillRect(-rx * 1.5, -ry * 0.55, rx * 3, ry * 0.3)
    g.fillRect(-rx * 1.5, -ry * 0.1, rx * 3, ry * 0.12)
    g.restore()
    g.beginPath()
    g.ellipse(x, y, rx, ry, a, 0, TAU)
    stroke(3)
  }
  const lift = 0.55 + pose.perk * 0.2
  for (const d of [-1, 1]) {
    // Hind wing, small and low.
    const hx = c + d * 60
    const hy = c + 50
    g.beginPath()
    g.ellipse(hx, hy, 30, 22, d * 0.55, 0, TAU)
    g.fillStyle = '#a57ef0'
    g.fill()
    stroke(5)
    mirror(hx + d * 3, hy + 1, 19, 12, d * 0.55)
    // Fore wing: a lilac frame round a mirror.
    const wx = c + d * 58
    const wy = c - 24 + (1 - pose.perk) * 6
    g.beginPath()
    g.ellipse(wx, wy, 44, 35, -d * lift, 0, TAU)
    g.fillStyle = '#a57ef0'
    g.fill()
    stroke(6)
    mirror(wx + d * 3, wy + 1, 33, 24, -d * lift)
  }
  // Feathery antennae.
  for (const d of [-1, 1]) {
    const a = d * (0.36 + (1 - pose.perk) * 0.3)
    const x = c + d * 14
    const y = c - 26
    const len = 36
    g.beginPath()
    g.ellipse(x + Math.sin(a) * len * 0.62, y - Math.cos(a) * len * 0.62, len * 0.42, 8, a - Math.PI / 2, 0, TAU)
    g.fillStyle = '#f6e2ff'
    g.fill()
    stroke(4)
    g.beginPath()
    g.moveTo(x, y)
    g.lineTo(x + Math.sin(a) * len, y - Math.cos(a) * len)
    stroke(3)
  }
  // The fluffy body: one outline round a ruff of puffs.
  const puffs: [number, number, number][] = [[c, c + 20, 48]]
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU
    puffs.push([c + Math.cos(a) * 44, c + 20 + Math.sin(a) * 42, 14])
  }
  circles(g, puffs)
  fillUnion(g, '#fff4fb', 6)
  g.beginPath()
  g.ellipse(c, c + 54, 30, 14, 0, 0, TAU)
  g.fillStyle = '#f7e2f5'
  g.fill()
  shine(g, c - 22, c - 12, 16, 8, 'rgba(255,255,255,0.95)')
  creatureFace(g, face, c, 8, stroke)
}

/** Rio, the chapter-6 rainbow finch: a round sky-blue bird with a rainbow
 *  crest, rainbow-striped wings and a little orange beak. */
const drawRio = (g: G, face: Face, pose: CreaturePose): void => {
  const c = PX / 2
  g.lineJoin = g.lineCap = 'round'
  const stroke = pen(g)
  const bands = ['#ff7fae', '#ffb35c', '#ffe36b', '#7ee06a', '#6ec8ff']
  // Crest: five rainbow feathers fanning from the crown; they flop when sleepy.
  const fan = 0.3 + pose.perk * 0.06
  const flop = pose.perk < 0 ? -pose.perk * 0.5 : 0
  for (const i of [0, 4, 1, 3, 2]) {
    const a = (i - 2) * fan + flop
    const len = (i === 2 ? 42 : 36) + pose.perk * 5
    const rx = c + 2 + Math.sin(a) * 14
    const ry = c - 22 - Math.cos(a) * 6
    g.beginPath()
    g.ellipse(rx + Math.sin(a) * len * 0.5, ry - Math.cos(a) * len * 0.5, len * 0.5, 9.5, a - Math.PI / 2, 0, TAU)
    g.fillStyle = bands[i]!
    g.fill()
    stroke(4)
  }
  // Wings: raised in a cheer, tucked when sleepy; rainbow bands at the tips.
  for (const d of [-1, 1]) {
    const a = d * (0.35 + pose.perk * 0.3)
    const x = c + d * 54
    const y = c + 34
    g.save()
    g.translate(x, y)
    g.rotate(a)
    g.beginPath()
    g.ellipse(0, 6, 18, 32, 0, 0, TAU)
    g.fillStyle = '#6fb6f2'
    g.fill()
    g.save()
    g.clip()
    for (let k = 0; k < 3; k++) {
      g.fillStyle = bands[k * 2]!
      g.fillRect(-20, 16 + k * 8, 40, 8)
    }
    g.restore()
    g.beginPath()
    g.ellipse(0, 6, 18, 32, 0, 0, TAU)
    stroke(5)
    g.restore()
  }
  // Body, and a cream face-and-tummy patch.
  g.beginPath()
  g.arc(c, c + 20, 56, 0, TAU)
  g.fillStyle = '#9fd8ff'
  g.fill()
  stroke(6)
  g.save()
  g.beginPath()
  g.arc(c, c + 20, 53, 0, TAU)
  g.clip()
  g.beginPath()
  g.ellipse(c, c + 40, 46, 44, 0, 0, TAU)
  g.fillStyle = '#fff6e4'
  g.fill()
  g.restore()
  shine(g, c - 22, c - 14, 16, 8, 'rgba(255,255,255,0.7)')
  creatureFace(g, face, c, 6, stroke)
  // Beak, between the eyes and above the smile.
  g.beginPath()
  g.moveTo(c - 8, c + 22)
  g.quadraticCurveTo(c, c + 18, c + 8, c + 22)
  g.lineTo(c, c + 30)
  g.closePath()
  g.fillStyle = '#ffa84c'
  g.fill()
  stroke(3.5)
}

/** Dune, the chapter-7 sand-fox pup: big ears, a sandy coat, a cream mask
 *  and a fluffy cream-tipped tail. */
const drawDune = (g: G, face: Face, pose: CreaturePose): void => {
  const c = PX / 2
  g.lineJoin = g.lineCap = 'round'
  const stroke = pen(g)
  const coat = '#f2bd72'
  const cream = '#fff1d8'
  // Tail, curled up behind her right side.
  g.save()
  g.translate(c + 60, c + 50)
  g.rotate(0.55 - pose.perk * 0.12)
  const tail = (): void => {
    g.beginPath()
    g.moveTo(0, 30)
    g.bezierCurveTo(-30, 10, -26, -42, 0, -58)
    g.bezierCurveTo(26, -42, 30, 10, 0, 30)
    g.closePath()
  }
  tail()
  g.fillStyle = coat
  g.fill()
  g.save()
  g.clip()
  g.fillStyle = cream
  g.fillRect(-40, -80, 80, 44)
  g.restore()
  tail()
  stroke(5)
  g.restore()
  // Big ears: up when keen, out to the sides when sleepy or worried.
  for (const d of [-1, 1]) {
    g.save()
    g.translate(c + d * 30, c - 12)
    g.rotate(d * (0.34 + (1 - pose.perk) * 0.42))
    g.beginPath()
    g.moveTo(-22, 6)
    g.quadraticCurveTo(-16, -38, 0, -60)
    g.quadraticCurveTo(16, -38, 22, 6)
    g.closePath()
    g.fillStyle = coat
    g.fill()
    stroke(5)
    g.beginPath()
    g.moveTo(-11, -2)
    g.quadraticCurveTo(-8, -30, 0, -46)
    g.quadraticCurveTo(8, -30, 11, -2)
    g.closePath()
    g.fillStyle = '#ffc3cb'
    g.fill()
    g.restore()
  }
  // Head.
  g.beginPath()
  g.ellipse(c, c + 22, 62, 52, 0, 0, TAU)
  g.fillStyle = coat
  g.fill()
  stroke(6)
  g.save()
  g.beginPath()
  g.ellipse(c, c + 22, 59, 49, 0, 0, TAU)
  g.clip()
  g.beginPath()
  g.ellipse(c - 21, c + 46, 30, 24, 0.2, 0, TAU)
  g.ellipse(c + 21, c + 46, 30, 24, -0.2, 0, TAU)
  g.fillStyle = cream
  g.fill()
  g.restore()
  shine(g, c - 20, c - 12, 16, 7, 'rgba(255,244,220,0.8)')
  creatureFace(g, face, c, 6, stroke)
  // Button nose.
  g.beginPath()
  g.ellipse(c, c + 27, 6, 4.2, 0, 0, TAU)
  g.fillStyle = INK
  g.fill()
}

/** Frosty, the chapter-8 snow hare: white-lilac fluff, long pink-lined ears
 *  that flop when she is sleepy, and a pink nose. */
const drawFrosty = (g: G, face: Face, pose: CreaturePose): void => {
  const c = PX / 2
  g.lineJoin = g.lineCap = 'round'
  const stroke = pen(g)
  const fur = '#f8f4ff'
  for (const d of [-1, 1]) {
    g.save()
    g.translate(c + d * 20, c - 20)
    g.rotate(d * (0.12 + (1 - pose.perk) * 0.62))
    g.beginPath()
    g.ellipse(0, -30, 16, 38, 0, 0, TAU)
    g.fillStyle = fur
    g.fill()
    stroke(5)
    g.beginPath()
    g.ellipse(0, -28, 7.5, 27, 0, 0, TAU)
    g.fillStyle = '#ffc4d8'
    g.fill()
    g.restore()
  }
  // A round fluffy head with puffy cheeks, one outline round it all.
  circles(g, [[c, c + 22, 54], [c - 46, c + 42, 20], [c + 46, c + 42, 20], [c - 30, c + 64, 18], [c + 30, c + 64, 18], [c, c + 72, 18]])
  fillUnion(g, fur, 6)
  shine(g, c - 20, c - 12, 17, 8, 'rgba(255,255,255,0.95)')
  creatureFace(g, face, c, 8, stroke)
  // Pink nose.
  g.beginPath()
  g.moveTo(c - 6, c + 25)
  g.quadraticCurveTo(c, c + 23, c + 6, c + 25)
  g.lineTo(c, c + 31)
  g.closePath()
  g.fillStyle = '#ff8fb0'
  g.fill()
  stroke(3)
}

/** Wisp, the chapter-9 firefly: a round, warmly glowing body, two tiny wings
 *  and star-tipped antennae, in a halo of light (dimmer when sleepy). */
const drawWisp = (g: G, face: Face, pose: CreaturePose): void => {
  const c = PX / 2
  const cy = c + 22
  g.lineJoin = g.lineCap = 'round'
  const stroke = pen(g)
  const halo = g.createRadialGradient(c, cy, 30, c, cy, 100)
  halo.addColorStop(0, `rgba(255,240,160,${0.9 * pose.glow})`)
  halo.addColorStop(0.55, `rgba(255,226,130,${0.35 * pose.glow})`)
  halo.addColorStop(1, 'rgba(255,226,130,0)')
  g.fillStyle = halo
  g.fillRect(0, 0, PX, PX)
  for (const [x, y, r] of [[-66, -34, 8], [70, 48, 7], [-60, 66, 6], [60, -56, 6], [-78, 18, 5]] as const) {
    twinkle(g, c + x, c + y, r, '#fff6c8')
  }
  // Tiny wings, fluttering up with her mood.
  for (const d of [-1, 1]) {
    g.beginPath()
    g.ellipse(c + d * 40, c - 28, 25, 15, d * (-0.45 - pose.perk * 0.3), 0, TAU)
    g.fillStyle = 'rgba(236,244,255,0.92)'
    g.fill()
    stroke(4)
  }
  // Antennae with little star tips.
  for (const d of [-1, 1]) {
    const a = d * (0.34 + (1 - pose.perk) * 0.34)
    const [x, y] = antenna(g, c + d * 14, c - 24, a, 30, stroke)
    g.beginPath()
    for (let i = 0; i < 10; i++) {
      const s = -Math.PI / 2 + (i * Math.PI) / 5
      const r = i & 1 ? 3.4 : 8
      if (i) g.lineTo(x + Math.cos(s) * r, y + Math.sin(s) * r)
      else g.moveTo(x + Math.cos(s) * r, y + Math.sin(s) * r)
    }
    g.closePath()
    g.fillStyle = '#ffe36b'
    g.fill()
    stroke(3)
  }
  // The glowing body.
  const glow = g.createRadialGradient(c - 14, cy - 18, 4, c, cy, 56)
  glow.addColorStop(0, '#fffdf0')
  glow.addColorStop(0.55, '#ffec94')
  glow.addColorStop(1, '#ffc85a')
  g.beginPath()
  g.arc(c, cy, 52, 0, TAU)
  g.fillStyle = glow
  g.fill()
  stroke(6)
  creatureFace(g, face, c, 8, stroke)
}

/** Each chapter's creature, by the name `CHAPTERS[c].creature` gives it. */
const CREATURE_DRAW: Readonly<Record<string, (g: G, face: Face, pose: CreaturePose) => void>> = {
  Twig: (g, face) => drawSprite(g, face),
  Shelly: drawShelly,
  Puff: drawPuff,
  Glint: drawGlint,
  Blink: drawBlink,
  Rio: drawRio,
  Dune: drawDune,
  Frosty: drawFrosty,
  Wisp: drawWisp,
  Sprig: (g, face) => drawSprite(g, face, true)
}

/**
 * What sits inside the badge's ring, in badge pixels: the speaker's head, or
 * the chapter creature in its emote's pose. The caller has clipped to the
 * badge's circle.
 */
const paintBadge = (g: G, speaker: SpeakerId, emote: Emote, creature: string, bare = false): void => {
  const face = EMOTE_FACE[emote]
  if (speaker === 'creature') {
    // §10.6's pose: lean about the chin, and a little hop for a cheer.
    const pose = EMOTE_POSE[emote]
    g.translate(PX / 2, PX * 0.8)
    g.rotate(pose.tilt)
    g.translate(-PX / 2, -PX * 0.8 - pose.hop)
    ;(CREATURE_DRAW[creature] ?? CREATURE_DRAW.Twig!)(g, face, pose)
  }
  else drawRigHead(g, speaker, face, bare)
}

/**
 * Each speaker's painted strip (§8.27): panel `f` is `PORTRAIT_SETS[…].emotes[f]`,
 * the badge's inside at scale `s` = the badge's width, centred on the origin
 * and cut to its circle. The reference the bench renders, the box the
 * painting is blitted into, and the fallback — all this one drawing.
 */
export const PORTRAIT_ART: Readonly<Record<string, ItemSpec>> = Object.fromEntries(PORTRAIT_SETS.map((p) => [p.who, {
  kind: 'portrait' as const,
  id: portraitArtId(p.who),
  frames: p.emotes.length,
  draw: (g: G, s: number, f: number) => {
    g.save()
    g.scale(s / PX, s / PX)
    g.translate(-PX / 2, -PX / 2)
    g.beginPath()
    g.arc(PX / 2, PX / 2, PX / 2 - 4, 0, TAU)
    g.clip()
    paintBadge(g, (p.creature ? 'creature' : p.who) as SpeakerId, p.emotes[f] ?? p.emotes[0]!, p.who, true)
    g.restore()
  }
}]))

/** The slots a portrait shows: wearing any of them, Aurora is drawn, dressed. */
const PORTRAIT_SLOTS: ReadonlySet<string> = new Set(['head', 'neck', 'skin', 'mane'])
const auroraBare = (): boolean => {
  const worn = equippedKey().split('#')[0]!.split('|')
  return COSMETIC_SLOTS.every((slot, i) => !PORTRAIT_SLOTS.has(slot) || (worn[i] ?? '-') === '-')
}

/**
 * Bumped when a portrait painting decodes (or the art layer flips): the
 * bubbles' `computed`s read it through `portraitUrl`, so a face that arrives
 * mid-line swaps in at once.
 */
const portraitArtRev = ref(0)
onArtChanged((c) => {
  if (!c || c.kind === 'portrait') {
    portraitArtRev.value++
    return
  }
  // A DRESSED Aurora is drawn from her rig and what she wears (`paintBadge`),
  // so a keepsake's, rig part's or prop's painting that decodes after her bake
  // left the drawn one on her portrait for the session (paint-outstanding
  // §0.2). Only her dressed bakes go — every other face is a portrait
  // painting or a creature drawing, which none of these change.
  if ((c.kind === 'cosmetic' || c.kind === 'rig' || c.kind === 'prop') && !auroraBare()) {
    let dropped = false
    for (const k of cache.keys()) {
      if (k.startsWith('aurora:') && !k.endsWith(':painted')) {
        cache.delete(k)
        dropped = true
      }
    }
    if (dropped) portraitArtRev.value++
  }
})

/** A portrait as a data URL, baked on first use. `creature` names which
 *  chapter's filler creature a `creature` bubble shows. */
export const portraitUrl = (speaker: SpeakerId, emote: Emote, creature = 'Twig'): string => {
  void portraitArtRev.value
  const set = portraitSetOf(speaker, creature)
  const f = set ? set.emotes.indexOf(emote as PortraitEmote) : -1
  const art = set && f >= 0 && (speaker !== 'aurora' || auroraBare()) ? spriteFor('portrait', portraitArtId(set.who)) : null
  const key = `${speaker}:${emote}:${speaker === 'aurora' ? equippedHeadKey() : speaker === 'creature' ? creature : ''}${art ? ':painted' : ''}`
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
  let painted = false
  if (art && set) {
    g.save()
    g.translate(PX / 2, PX / 2)
    painted = drawItem(g, PORTRAIT_ART[set.who]!, PX, f)
    g.restore()
  }
  if (!painted) paintBadge(g, speaker, emote, creature)
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
