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
 *
 * The ROOM is painted (§9.11): `paintWardrobeRoom` is the whole of it and
 * nothing else, so the art bench renders the reference from the very function
 * the game draws with. Everything that moves stays over the top of it — see
 * that function's note for which, and why each one had to leave it.
 */
import { S } from '@/game/duel/state'
import { drawUnicorn, type PoseState } from '@/game/duel/chars'
import { sparkleBurst, drawFxOver, drawFxUnder } from '@/game/duel/fx'
import { equippedHooks, outfitHooks, maneSwatchIndex } from '@/game/cosmetics/rig-cosmetics'
import { COSMETICS, COSMETIC_SLOTS, type CosmeticSlot } from '@/game/campaign/tables'
import { TAU, sin, clamp } from '@/game/duel/util'
import { reducedMotion } from '@/use/useAccessibility'
import { spriteFor } from '@/game/art'
import { drawItem, type ItemSpec } from '@/game/artItem'
import { wardrobeArtId, WARDROBE_FLOOR, WARDROBE_RUG } from '@/game/artIds'

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

/** What she wears for a TRY-ON, or null: the shelf's locked alternatives
 *  (`WardrobeScene`, owner 2026-09-23) show on her before they are hers. */
let tryOn: ReturnType<typeof outfitHooks> | null = null

/**
 * Show keepsake `id` on her as if worn, over whatever she has on now; −1 ends
 * the try-on. Nothing is saved — her real outfit is untouched, so a photo, the
 * duel and the map never see it.
 */
export const setWardrobeTryOn = (id: number): void => {
  const def = id >= 0 ? COSMETICS[id] : undefined
  if (!def) {
    tryOn = null
    return
  }
  const eq = [...S.campaign.giftsEquipped]
  eq[COSMETIC_SLOTS.indexOf(def.slot)] = id
  tryOn = outfitHooks(eq, maneSwatchIndex())
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

/** The three bulb colours, repeating along the string. */
const LAMP_HUE = ['#ffd34d', '#ff8fc4', '#9fd8ff'] as const

/**
 * The string of fairy lights, in the room's own box: twelve gaps across, and
 * down the wall as a fraction of the DROP TO THE FLOOR.
 *
 * Measured off the floor rather than off the box's height because that is
 * what survives the two-band blit below unchanged: the wall band is stretched
 * to meet the floor, so a lamp placed at 9 % of the drop lands at 9 % of the
 * drop whatever size the painting is and wherever the floor has moved to.
 * Height-of-the-box would have put the twinkle a finger below the painted
 * bulb on a phone.
 */
const lampAt = (i: number, w: number, fy: number): [number, number] =>
  [(w * i) / 12, fy * (0.09 + 0.02 * sin(i * 1.3))]

/**
 * A lamp's radius, in the room's width — the horizontal scale is the one the
 * blit keeps uniform, so a circle placed by it lands on its painted self.
 *
 * TWICE THE SIZE IN A REFERENCE, and not because a painter cannot see a small
 * thing. What a player sees is a bulb inside a halo two and a half times its
 * width, and the halo is the one part of it a painting cannot hold — so a
 * reference that showed only the bead would commission a string of pinheads
 * on a rope, which is not this room. The painted bulb is sized to what it
 * stands for, and the live halo then sits on it as a tight ring instead of a
 * cloud. (The drawing keeps its own bead; nobody sees both.)
 */
const lampR = (w: number, forRef = false): number => w * (forRef ? 0.011 : 0.0055)

/**
 * The ROOM, into the box (x, y, w, h) with its floor line on `fy`: the warm
 * striped canvas walls, the floor, and the cord and bulbs of the fairy lights
 * along the top.
 *
 * Aurora, her keepsakes and the rug she stands on are NOT in here: they move,
 * and are drawn over this. Nor are the two things a bitmap cannot hold —
 *
 *   • the CORNER SHADOW, which is a wash over the whole room. Baked into the
 *     picture it would be a vignette welded into the largest bitmap the
 *     wardrobe ships, and the full-bleed brief forbids one for that reason.
 *   • the bulbs' PULSE, an alpha-cycled halo. A bitmap cannot pulse
 *     (art-style.md §6), and a halo painted into the reference would sit
 *     frozen under the twinkling one — the props' own trap, one family on.
 *
 * Both are still drawn, every frame, over the painting as well as over the
 * drawing, so painted and drawn look like one room.
 *
 * Pure apart from its box, so the art bench renders the painting's reference
 * from the very function the game draws with — exactly as `paintFrontPage`
 * serves the book's front page.
 *
 * `fy` is a parameter rather than a fraction of the box because the floor is
 * where AURORA stands, and that follows the DOM shelf: in portrait it climbs
 * the moment the mane swatches open. The PAINTING carries its floor at
 * `WARDROBE_FLOOR` and the blit below lands it here.
 */
export const paintWardrobeRoom = (
  g: G2D, x: number, y: number, w: number, h: number, fy: number, forRef = false
): void => {
  // The tent: warm striped canvas walls.
  //
  // Proportional, where this used to have a 36 px floor under it. A painting
  // has no choice but to be proportional, and a drawn room with eleven
  // stripes standing in for a painted one with fourteen is the kind of drift
  // art-style.md forbids between the two halves of the art.
  const stripe = w / 14
  for (let sx = x, i = 0; sx < x + w; sx += stripe, i++) {
    g.fillStyle = i & 1 ? '#ffd9ec' : '#fff3f8'
    g.fillRect(sx, y, stripe, h)
  }
  g.fillStyle = '#f4c7a6'
  g.fillRect(x, fy, w, y + h - fy)
  // The cord goes down FIRST and the bulbs hang in front of it. Drawn the
  // other way round, a reference's heavier cord runs straight through every
  // bulb and the string reads as a rope with specks on it.
  g.beginPath()
  for (let i = 0; i <= 12; i++) {
    const [lx, ly] = lampAt(i, w, fy - y)
    if (i) g.lineTo(x + lx, y + ly)
    else g.moveTo(x + lx, y + ly)
  }
  g.lineWidth = Math.max(1.4, w * 0.0026)
  g.strokeStyle = '#3A2340'
  g.stroke()
  const r = lampR(w, forRef)
  for (let i = 0; i <= 12; i++) {
    const [lx, ly] = lampAt(i, w, fy - y)
    g.beginPath()
    g.arc(x + lx, y + ly, r, 0, TAU)
    g.fillStyle = LAMP_HUE[i % 3]!
    g.fill()
  }
}

/** The round rug, centred on the origin, `s` being Aurora's own height. */
const rugShape = (g: G2D, s: number): void => {
  g.beginPath()
  g.ellipse(0, 0, s * 0.6, s * 0.13, 0, 0, TAU)
  g.fillStyle = '#b58cff'
  g.fill()
  // Both widths go through the SCALE. A width in device px is a hairline at
  // the bench's own size, and a painter paints the hairlines it is shown —
  // the first trap the `prop` family paid for (art-roadmap.md §4b).
  g.lineWidth = s * 0.016
  g.strokeStyle = '#3A2340'
  g.stroke()
  g.beginPath()
  g.ellipse(0, 0, s * 0.44, s * 0.09, 0, 0, TAU)
  g.strokeStyle = '#fff1a8'
  g.lineWidth = s * 0.012
  g.stroke()
}

/**
 * The rug, as a drawable of its own.
 *
 * It could not go in the room's picture: `stand()` moves it and scales it
 * with the shelf, so its place in the room is decided by a DOM measurement
 * rather than by the clock (LAYERS.md's seam). One bitmap, carried by a
 * transform, exactly like a sector's live props.
 */
export const RUG_ART: ItemSpec = {
  kind: WARDROBE_RUG.kind,
  id: WARDROBE_RUG.id,
  frames: 1,
  draw: (g, s) => rugShape(g, s)
}

export const drawWardrobe = (g: G2D): void => {
  // Reduced motion (§3.11): the lights and her idle bob settle; the admire
  // hop, a one-shot reward beat, still plays.
  Ta = reducedMotion.value ? 0 : T
  const d = S.dpr
  g.setTransform(d, 0, 0, d, 0, 0)
  g.globalAlpha = 1
  const s = stand()
  const portrait = vh >= vw
  // The floor line — she stands a whisker in front of it.
  const fy = clamp(s.y - s.size * 0.02, 1, vh - 1)
  const art = spriteFor('wardrobe', wardrobeArtId(portrait))
  if (art) {
    // ONE PICTURE, TWO BANDS. The floor is wherever Aurora stands, and that
    // follows the shelf, so a painting stretched whole would park its horizon
    // above her hooves (or under them) on every screen but one. The wall band
    // is stretched to meet the floor and the floor band fills what is left.
    // Stretching a vertical stripe vertically, and a plain floor, is
    // invisible; a horizon in the wrong place is not.
    const split = Math.round(art.naturalHeight * (portrait ? WARDROBE_FLOOR.port : WARDROBE_FLOOR.land))
    g.drawImage(art, 0, 0, art.naturalWidth, split, 0, 0, vw, fy)
    g.drawImage(art, 0, split, art.naturalWidth, art.naturalHeight - split, 0, fy, vw, vh - fy)
  } else paintWardrobeRoom(g, 0, 0, vw, vh, fy)
  // The corner shadow, over the room — painted or drawn.
  const vg = g.createRadialGradient(vw / 2, vh * 0.45, Math.min(vw, vh) * 0.2, vw / 2, vh * 0.45, Math.max(vw, vh) * 0.75)
  vg.addColorStop(0, 'rgba(255,255,255,0)')
  vg.addColorStop(1, 'rgba(90,50,110,0.35)')
  g.fillStyle = vg
  g.fillRect(0, 0, vw, vh)
  // The rug she stands on, then her twinkling lights.
  g.save()
  g.translate(s.x + s.size * 0.08, s.y + s.size * 0.02)
  if (!drawItem(g, RUG_ART, s.size)) rugShape(g, s.size)
  g.restore()
  const lr = lampR(vw)
  for (let i = 0; i <= 12; i++) {
    const [lx, ly] = lampAt(i, vw, fy)
    g.globalAlpha = (0.55 + 0.45 * sin(Ta * 2 + i)) * 0.5
    g.beginPath()
    g.arc(lx, ly, lr * 2.4, 0, TAU)
    g.fillStyle = LAMP_HUE[i % 3]!
    g.fill()
  }
  g.globalAlpha = 1
  // Aurora, big, in her things.
  const k = s.size / 197
  const hop = admireT >= 0 ? clamp(1 - Math.abs(admireT - 0.6) / 0.6, 0, 1) : 0
  g.save()
  g.translate(s.x, s.y)
  g.scale(k, k)
  POSE.win = hop * 0.8
  POSE.form = 0.15 + 0.1 * sin(Ta * 1.4)
  Object.assign(POSE, tryOn ?? equippedHooks())
  drawUnicorn(g, 0, 0, -1, POSE, Ta)
  g.restore()
  g.setTransform(d, 0, 0, d, 0, 0)
  drawFxUnder(g)
  drawFxOver(g)
}
