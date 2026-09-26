/**
 * puppet.ts — the PAINTED DUELISTS (owner, 2026-09-25): the duel rig of
 * `chars.ts`, every piece of it a painting.
 *
 * WHAT THE OWNER ASKED FOR, TWICE. First: "make the battle rig look as close
 * as possible to the painted Aurora and Umbra". A chibi cut-out puppet on the
 * mascot's proportions was built and painted, and was turned down: "reroll
 * the parts until they have a similar SHAPE as the current drawn rigs, but
 * with the art style and cuteness of the Aurora portraits and the intro". So
 * the rig keeps its own skeleton, proportions and poses — `chars.ts` still
 * decides every joint, every angle and every anchor — and only what is laid
 * on the bones changes: a painted piece wherever the vector rig filled a
 * shape. And a duelist at rest wears a NEUTRAL face — not happy, not
 * blushing: "the battle rigs should not have an aroused or happy emotion".
 *
 * THE PIECES (`artIds.PUPPET_ART`), nine per character, each painted in full
 * colour with its own soft line, each drawn here as its reference from the
 * rig's own geometry: the torso (haunch, barrel, chest and the chest's tuft),
 * the neck (a tube `chars.ts` stretches between chest and head), the head (a
 * strip of five faces — the face is painted, not drawn over), the horn, the
 * forelock, the mane, the tail, ONE leg and ONE hoof. The leg is painted
 * straight and is BENT along the rig's four-bone chain as it is drawn
 * (`paintLeg`): sliced across its length, each slice laid on the chain where
 * it falls — so a rear folds the knee and a fall lays it flat, from one
 * painting, with no joint to see. The hair pieces are painted at rest and
 * swing about their root with the rig's own wave.
 *
 * Every other character wears Aurora's or Umbra's set RECOLOURED
 * (`puppetBake.ts`). `chars.drawUnicorn` paints a duelist only when her whole
 * set has decoded; short of that it draws the vector rig as it always did.
 *
 * NO IMPORT OF `chars.ts` AT RUN TIME (it imports this module): the handful
 * of rig constants the references need are copied here and held equal to the
 * rig's by `tests/duel/puppet.test.ts`.
 */
import type { ItemSpec, Accent } from '@/game/artItem'
import { itemBox } from '@/game/artItem'
import { spriteFor, onArtChanged } from '@/game/art'
import { PUPPET_ART, PUPPET_PARTS, type PuppetWho, type PuppetPart } from '@/game/artIds'
import type { PoseState, Face } from '@/game/duel/chars'
import { FOES, type FoePalette } from '@/game/duel/foes'
import { rainbow } from '@/game/duel/state'
import { bakedPart, lookFor, warmLook, idle, setFaceMask, type Look, type Variant } from '@/game/duel/puppetBake'

type G2D = CanvasRenderingContext2D
const TAU = Math.PI * 2
const PI = Math.PI

/* ======================== the rig's own geometry ======================= */

/** `chars.CHIBI_TQ`: the painted duelist's haunch, barrel and chest as
 *  [cx, cy, rx, ry], about the barrel — the chibi's small round body. */
export const TQ_REF = [-20, 3, 24, 27, 0, 1, 38, 30, 22, -3, 23, 27] as const
/** `chars.NECK_LEN` and the neck's two half-widths (`NW` at K = 1). */
export const NECK_REF = { len: 46, w0: 16, w1: 11.5 } as const
/** The hair masses at rest — `chars.hair`'s arguments minus the pose terms:
 *  [x, y, a, len, w, curl, n]. The forelock is in head units. */
export const HAIR_REF = {
  tail: [0, 0, 2.4, 56, 30, -0.7, 3],
  mane: [0, 0, 2.6, 46, 27, -0.5, 3],
  // Two locks where the rig draws one: a single painted wedge came back as
  // a framed card of hair; two read as a tuft.
  forelock: [1, -21, 0.25, 14, 12, 0.8, 2],
  // The fringe's back half, behind the horn: hung from the crown.
  backlock: [12, -26, 0.4, 12, 10, 0.5, 2]
} as const
export type HairPart = keyof typeof HAIR_REF

/** Each piece's extent, so a sheet's `s` means "this piece, that big". */
const UNIT: Readonly<Record<PuppetPart, number>> = {
  torso: 100, neck: 60, head: 70, horn: 45, forelock: 40, backlock: 40, mane: 80, tail: 80, leg: 80, hoof: 24
}

/** The painted leg, as its reference draws it: straight down from the top of
 *  the shoulder (y = 0) to the fetlock (`LEG_LEN`), and its half-width at
 *  these points down it — the fore and hind legs' taper, averaged. */
export const LEG_LEN = 64
const LEG_Y = [0, 20, 42, 58, 64] as const
const LEG_HW = [11, 10.4, 7.3, 6.1, 5.4] as const
/** The hoof as its reference draws it: the coronet's half-width at the top,
 *  the sole's at the bottom, and its height. */
const HOOF_REF = { top: 5.4, sole: 9.2, h: 8 } as const
/** The face strip. Panel 0 is worn the whole duel. */
export const FACE = { neutral: 0, blink: 1, cheer: 2, ouch: 3, dizzy: 4 } as const
export const FACES = 5

/* ============================ the references =========================== */

interface RefPal {
  coat: string; shade: string; ink: string; mane: string; streak: string
  /** The mane's streaks, for the full mane and fringe. */
  streaks: readonly string[]
  horn: string; ridge: string; hoof: string; eye: string; eyeLo: string; blush: string; earIn: string; mouth: string
}

/** Each character as her painted models have her — for the references only. */
const REF: Readonly<Record<PuppetWho, RefPal>> = {
  aurora: {
    coat: '#fff1dc', shade: '#efd2b6', ink: '#3A2340', mane: '#ffd35c', streak: '#ffb1cf', streaks: ['#ffb1cf', '#a6e8cf', '#c9b2ff', '#a5d6ff'],
    horn: '#f7cb5b', ridge: '#d9a03a', hoof: '#e7b347', eye: '#6f4fa6', eyeLo: '#b99ae8', blush: '#ffb3c2', earIn: '#ffc2d0', mouth: '#b04a5a'
  },
  umbra: {
    coat: '#5d4f73', shade: '#46395a', ink: '#2c2034', mane: '#cbb6ee', streak: '#9ef1ff', streaks: ['#9ef1ff', '#e4d9ff', '#b39ae8', '#9ef1ff'],
    horn: '#a07ae0', ridge: '#76519f', hoof: '#6c53a1', eye: '#7a58b8', eyeLo: '#c7aaf2', blush: '#e8a0b6', earIn: '#9e86c6', mouth: '#8e3a55'
  }
}

/** A reference's line: thin, a guide to where the shapes are, never a
 *  contour to trace (the intro's first page traced the rig's heavy ink). */
const REF_INK = 1.6
/** The line is the same weight on EVERY sheet: a small piece is drawn big on
 *  its panel, so its line is scaled back by its own unit (`puppetSpec`). */
let INK_K = 1

const ell = (g: G2D, x: number, y: number, rx: number, ry: number, a = 0): void => {
  g.beginPath()
  g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), a, 0, TAU)
}

type Shape = (g: G2D) => void
/** Silhouette first: every shape's line, then every fill over it, so a group
 *  reads as one outline with nothing drawn inside it. */
const inked = (g: G2D, ink: string, shapes: readonly (readonly [Shape, string])[], w = REF_INK): void => {
  g.lineJoin = g.lineCap = 'round'
  g.strokeStyle = ink
  g.lineWidth = w * 2 * INK_K
  for (const [s] of shapes) { s(g); g.stroke() }
  for (const [s, f] of shapes) { s(g); g.fillStyle = f; g.fill() }
}

/** A soft shade laid inside the shapes just drawn: `inside` retraces them. */
const shadeIn = (g: G2D, inside: Shape, fill: string, shade: Shape, alpha = 0.55): void => {
  g.save()
  inside(g)
  g.clip()
  g.globalAlpha = alpha
  shade(g)
  g.fillStyle = fill
  g.fill()
  g.restore()
}

/* ---- torso: the rig's three masses and the chest's tuft ---- */
const torsoRef = (g: G2D, p: RefPal): void => {
  const masses: Shape[] = []
  for (let i = 0; i < 12; i += 4) masses.push((c) => ell(c, TQ_REF[i]!, TQ_REF[i + 1]!, TQ_REF[i + 2]!, TQ_REF[i + 3]!))
  inked(g, p.ink, masses.map((m) => [m, p.coat] as const))
  const all: Shape = (c) => {
    c.beginPath()
    for (let i = 0; i < 12; i += 4) {
      c.moveTo(TQ_REF[i]! + TQ_REF[i + 2]!, TQ_REF[i + 1]!)
      c.ellipse(TQ_REF[i]!, TQ_REF[i + 1]!, TQ_REF[i + 2]!, TQ_REF[i + 3]!, 0, 0, TAU)
    }
  }
  shadeIn(g, all, p.shade, (c) => ell(c, -4, 32, 60, 16))
}

/* ---- neck: a tube lying along +x, thick at the chest, slim at the poll ---- */
const neckPath: Shape = (g) => {
  const { len, w0, w1 } = NECK_REF
  g.beginPath()
  g.moveTo(0, -w0)
  g.lineTo(len, -w1)
  g.arc(len, 0, w1, -PI / 2, PI / 2)
  g.lineTo(0, w0)
  g.arc(0, 0, w0, PI / 2, PI * 1.5)
  g.closePath()
}
const neckRef = (g: G2D, p: RefPal): void => {
  inked(g, p.ink, [[neckPath, p.coat]])
  shadeIn(g, neckPath, p.shade, (c) => { c.beginPath(); c.rect(-20, 5, 90, 20) })
}

/* ---- the hair masses: `chars.hair`'s locks, at rest ---- */
const hairLocks = (x: number, y: number, a: number, len: number, w: number, curl: number, n: number): number[][] => {
  const out: number[][] = []
  for (let i = n; i--;) {
    const L: number[] = []
    const R: number[] = []
    let px = x - i * 3
    let py = y + i * 4
    for (let j = 0; j <= 6; j++) {
      const f = j / 6
      const aa = a + (i & 1 ? 0.34 : -0.38) * i + (curl + i * 0.16) * f
      const hw = w * (1 - i * 0.22) * (1 - f * f * 0.6) * 0.5
      const nx = Math.sin(aa) * hw
      const ny = Math.cos(aa) * hw
      L.push(px - nx, py + ny)
      R.unshift(px + nx, py - ny)
      px += (Math.cos(aa) * len * (1 - i * 0.26)) / 6
      py += (Math.sin(aa) * len * (1 - i * 0.26)) / 6
    }
    out.push([...L, ...R])
  }
  return out
}
const hairRef = (which: HairPart) => (g: G2D, p: RefPal): void => {
  const [x, y, a, len, w, curl, n] = HAIR_REF[which]
  const locks = hairLocks(x, y, a, len, w, curl, n)
  // Drawn back to front, as `chars.hair` draws them: the last is the hero.
  inked(g, p.ink, locks.map((pts, k) => [(c: G2D) => {
    // Through the midpoints, so a lock is a soft curve and not the rig's
    // faceted blade: a painter traces a blade as a blade.
    const n = pts.length / 2
    c.beginPath()
    c.moveTo((pts[0]! + pts[2]!) / 2, (pts[1]! + pts[3]!) / 2)
    for (let i = 1; i <= n; i++) {
      const a = i % n
      const b = (i + 1) % n
      c.quadraticCurveTo(pts[a * 2]!, pts[a * 2 + 1]!, (pts[a * 2]! + pts[b * 2]!) / 2, (pts[a * 2 + 1]! + pts[b * 2 + 1]!) / 2)
    }
    c.closePath()
  }, (locks.length - 1 - k) & 1 ? p.streak : p.mane] as const))
}

/* ---- the FULL mane and fringe (owner: "make the mane fuller like in the
 * portraits"). The rig's own mane is three stiff blades; the painted one is
 * the portraits' cloud: a curly crown framing the back and top of the head,
 * and soft locks down the neck to the withers, streaked. Same root, same
 * swing — only what hangs from it is bigger. ---- */
type Lock = readonly [readonly number[], number, number, number]
/** A tapered lock along a cubic centreline, as a closed path. */
const lockPath = (g: G2D, c: readonly number[], w0: number, w1: number): void => {
  const L: number[] = []
  const R: number[] = []
  const N = 12
  for (let i = 0; i <= N; i++) {
    const t = i / N
    const u = 1 - t
    const x = u * u * u * c[0]! + 3 * u * u * t * c[2]! + 3 * u * t * t * c[4]! + t * t * t * c[6]!
    const y = u * u * u * c[1]! + 3 * u * u * t * c[3]! + 3 * u * t * t * c[5]! + t * t * t * c[7]!
    const dx = 3 * u * u * (c[2]! - c[0]!) + 6 * u * t * (c[4]! - c[2]!) + 3 * t * t * (c[6]! - c[4]!)
    const dy = 3 * u * u * (c[3]! - c[1]!) + 6 * u * t * (c[5]! - c[3]!) + 3 * t * t * (c[7]! - c[5]!)
    const l = Math.hypot(dx, dy) || 1
    const w = (w0 + (w1 - w0) * t) * 0.5
    L.push(x - (dy / l) * w, y + (dx / l) * w)
    R.unshift(x + (dy / l) * w, y - (dx / l) * w)
  }
  const p = [...L, ...R]
  g.beginPath()
  g.moveTo(p[0]!, p[1]!)
  for (let i = 2; i < p.length; i += 2) g.lineTo(p[i]!, p[i + 1]!)
  g.closePath()
}
/**
 * THE CHIBI'S MANE, in HEAD units (the skull's centre is the origin, radius
 * about 26): the intro's cloud — curls over the crown and round the back of
 * the head, and a fall of hair down behind the neck to below the chin. It
 * hangs from the head (`chars.ts` draws it in head space) and swings about
 * `MANE_ROOT_H`, the poll. [x, y, r]
 */
export const MANE_ROOT_H: readonly [number, number] = [-10, -20]
const MANE_CURLS: readonly (readonly number[])[] = [
  [-4, -26, 10], [6, -29, 9], [-15, -22, 11], [-24, -12, 11], [-29, 1, 10], [-28, 13, 9],
  // the fall's curled tips, so its hem is lobes and not a slab — at the
  // chest, as the mascot's is (owner: longer, it hung down behind the legs)
  [-30, 25, 7], [-20, 28, 7.5], [-9, 25, 6],
  // under the skull, which covers it: filled so the outline has no notch
  [-12, 0, 16]
]
const MANE_LOCKS: readonly Lock[] = [
  [[-20, -6, -32, 6, -27, 16, -30, 24], 11.5, 2.6, 0],
  [[-12, -10, -22, 2, -15, 16, -20, 26], 11.5, 2.6, 1],
  [[-4, -8, -12, 6, -5, 16, -9, 23], 9, 2.2, 2]
]
/**
 * The hair pieces' references are SILHOUETTES only — the mass's outline in one
 * flat colour, no locks and no stripes drawn in. Every lock and stripe drawn
 * into a reference came back traced as it was drawn (bands, a fan of strands,
 * a rainbow hair band); with only the outline to follow, the painter fills it
 * with the hair of the model it is shown.
 */
const hairMass = (g: G2D, p: RefPal, curls: readonly (readonly number[])[], locks: readonly Lock[]): void => {
  inked(g, p.ink, [
    ...curls.map((c) => [(x: G2D) => ell(x, c[0]!, c[1]!, c[2]!, c[2]! * 0.92), p.mane] as const),
    ...locks.map(([c, w0, w1]) => [(x: G2D) => lockPath(x, c, w0 * 1.3, Math.max(7, w1 * 3.5)), p.mane] as const)
  ])
}
const maneRef = (g: G2D, p: RefPal): void => hairMass(g, p, MANE_CURLS, MANE_LOCKS)
/**
 * THE FRINGE, IN TWO HALVES with the horn between them (owner, 2026-09-25,
 * of the portraits: "the horn is sticking out of the hair pieces … a part of
 * the forehead hair is rendered in front of the horn and one part behind the
 * horn, but in front of the right ear"; one fringe laid over the horn "does
 * not look good"). In head units; the eyes end at y = -10.
 *
 * The FRONT half (`forelock`) wraps the horn's root and sweeps forward-LEFT
 * and down over the near brow, as the portraits' does — the first painted
 * fringe swept right, the wrong way round. The BACK half (`backlock`) starts
 * on the crown behind the horn and falls to the RIGHT, over the far ear's
 * root, to above the far eye.
 */
const FORE_CURLS: readonly (readonly number[])[] = [[-8, -24, 6], [-1, -27, 7], [6, -24, 6.5], [12, -19, 5]]
const FORE_LOCKS: readonly Lock[] = [
  [[10, -22, 3, -30, -8, -29, -14, -17], 9, 2.4, 0],
  [[8, -18, 1, -24, -6, -22, -9, -12], 7, 2, 1]
]
const forelockRef = (g: G2D, p: RefPal): void => hairMass(g, p, FORE_CURLS, FORE_LOCKS)
const BACK_CURLS: readonly (readonly number[])[] = [[5, -27, 6], [12, -27, 6], [18, -23, 5.5]]
const BACK_LOCKS: readonly Lock[] = [
  [[9, -28, 17, -30, 23, -24, 25, -15], 7, 2, 0],
  [[11, -24, 17, -24, 21, -19, 22, -12], 6, 2, 1]
]
const backlockRef = (g: G2D, p: RefPal): void => hairMass(g, p, BACK_CURLS, BACK_LOCKS)

/* ---- horn: the rig's spiral cone, in head units ---- */
const HC = 15.68
const HSN = -32.4
const hornPath: Shape = (g) => {
  g.beginPath()
  g.moveTo(9 - HSN / 6, -19 + HC / 6)
  g.lineTo(9 + HSN / 6, -19 - HC / 6)
  g.lineTo(9 + HC, -19 + HSN)
  g.closePath()
}
const hornRef = (g: G2D, p: RefPal): void => {
  inked(g, p.ink, [[hornPath, p.horn]])
  g.strokeStyle = p.ridge
  g.lineWidth = 1.5 * INK_K
  for (let i = 1; i < 4; i++) {
    const f = i / 4
    const w2 = (1 - f) / 6
    const cx = 9 + HC * f
    const cy = -19 + HSN * f
    g.beginPath()
    g.moveTo(cx - HSN * w2, cy + HC * w2)
    g.lineTo(cx + HSN * w2 + HC / 12, cy - HC * w2 + HSN / 12)
    g.stroke()
  }
}

/* ---- the leg: straight, tapered, the top rounded off ---- */
const legPath: Shape = (g) => {
  g.beginPath()
  g.arc(0, 0, LEG_HW[0], PI, 0)
  for (let i = 1; i < LEG_Y.length; i++) g.lineTo(LEG_HW[i]!, LEG_Y[i]!)
  g.arc(0, LEG_LEN, LEG_HW[LEG_HW.length - 1]!, 0, PI)
  for (let i = LEG_Y.length - 1; i >= 1; i--) g.lineTo(-LEG_HW[i]!, LEG_Y[i]!)
  g.closePath()
}
const legRef = (g: G2D, p: RefPal): void => {
  inked(g, p.ink, [[legPath, p.coat]])
  shadeIn(g, legPath, p.shade, (c) => { c.beginPath(); c.rect(3, -12, 12, LEG_LEN + 20) })
}

/* ---- the hoof: a coronet narrower than its flat sole ---- */
const hoofPath: Shape = (g) => {
  const { top, sole, h } = HOOF_REF
  g.beginPath()
  g.moveTo(-top, 0)
  g.quadraticCurveTo(0, -2.2, top, 0)
  g.lineTo(sole, h - 1.6)
  g.quadraticCurveTo(sole, h, sole - 1.6, h)
  g.lineTo(-sole + 1.6, h)
  g.quadraticCurveTo(-sole, h, -sole, h - 1.6)
  g.closePath()
}
const hoofRef = (g: G2D, p: RefPal): void => {
  inked(g, p.ink, [[hoofPath, p.hoof]])
}

/* ---- the head: skull, muzzle, both ears, and the face of panel f ---- */
const earPath = (x: number, y: number, a: number, s: number): Shape => (g) => {
  g.save()
  g.translate(x, y)
  g.rotate(a)
  g.scale(s, s)
  g.beginPath()
  g.moveTo(-6.5, 5)
  g.quadraticCurveTo(-8, -9, -1, -22)
  g.quadraticCurveTo(7, -9, 6.5, 3)
  g.closePath()
  g.restore()
}
const earInner = (g: G2D, x: number, y: number, a: number, s: number, fill: string): void => {
  g.save()
  g.translate(x, y)
  g.rotate(a)
  g.scale(s, s)
  g.beginPath()
  g.moveTo(-3.5, 1)
  g.quadraticCurveTo(-4.6, -8, -1, -16)
  g.quadraticCurveTo(3.8, -7, 3.4, 0)
  g.closePath()
  g.fillStyle = fill
  g.fill()
  g.restore()
}
/**
 * THE HEAD IS THE MASCOT'S (owner, 2026-09-25, pointing at the intro, the
 * portraits and the mascot pair `brand-mascot`: "the face looks weird, not
 * like in these"): turned three-quarters toward us, as every painted Aurora
 * is — and, as the mascot pair's are, with both eyes LOOKING AT THE OTHER
 * duelist, so she faces her opponent and not the camera (the one-eye profile
 * before it read as a ball). The near ear stands behind the forelock, the far
 * one peeks out past the horn. [x, y, angle, scale] for the ears; [cx, cy,
 * rx, ry] for the round skull and the soft muzzle that comes out of it at the
 * lower right.
 */
const FAR_EAR = [19, -18, 0.42, 0.75] as const
const NEAR_EAR = [-8, -20, -0.2, 1.1] as const
const SKULL = [1, -1, 27, 25] as const
const MUZZLE = [20, 11, 14.5, 11] as const

/**
 * Both eyes, the near one big, the far one narrower toward the muzzle, both
 * looking to the right (`LOOK`). [x, y, rx, ry].
 */
const EYES: readonly (readonly [number, number, number, number])[] = [[2, -1, 7, 9.2], [20, -2, 4.6, 8.4]]
/** How far the pupils sit toward the opponent, in eye radii. */
const LOOK = 0.3
const openEye = (g: G2D, p: RefPal): void => {
  for (const [x, y, rx, ry] of EYES) {
    ell(g, x, y, rx, ry)
    g.fillStyle = p.eye
    g.fill()
    g.save()
    ell(g, x, y, rx, ry)
    g.clip()
    ell(g, x, y + 6, rx, ry * 0.55)
    g.fillStyle = p.eyeLo
    g.fill()
    ell(g, x + rx * LOOK, y + 0.4, rx * 0.5, ry * 0.5)
    g.fillStyle = '#261630'
    g.fill()
    g.restore()
    ell(g, x + rx * (LOOK + 0.25), y - ry * 0.36, rx * 0.4, ry * 0.34)
    g.fillStyle = '#fff'
    g.fill()
    ell(g, x - rx * 0.4, y + ry * 0.5, rx * 0.2, rx * 0.2)
    g.fill()
    g.strokeStyle = p.ink
    g.lineWidth = 2.4
    g.beginPath()
    g.ellipse(x, y, rx + 0.4, ry + 0.4, 0, PI + 0.45, -0.35)
    g.stroke()
  }
  // a lash flick at each eye's outer corner
  g.beginPath()
  g.moveTo(-4.2, -6)
  g.lineTo(-7, -8.6)
  g.moveTo(24.2, -6.5)
  g.lineTo(26, -8.8)
  g.stroke()
}
/** Both eyes shut along an arc: `up` for a happy crescent, else a calm lid. */
const shutEyes = (g: G2D, up: boolean): void => {
  for (const [x, y, rx] of EYES) {
    g.beginPath()
    if (up) g.arc(x, y + 5, rx, PI + 0.45, -0.45)
    else g.arc(x, y - 4, rx, 0.45, PI - 0.45)
    g.stroke()
  }
}

/** A small closed mouth, gentle and calm: neither a smile nor a pout. */
const flatMouth = (g: G2D): void => {
  g.beginPath()
  g.moveTo(20.5, 18.6)
  g.quadraticCurveTo(23.5, 19.6, 26.5, 18.4)
  g.lineWidth = 1.8
  g.stroke()
}

/** Panel `f`'s face (`FACE`). Panel 0 is what a duelist wears the whole duel,
 *  so it is CALM: open eyes, level brows, a small closed mouth, the faintest
 *  blush — neither a smile nor a pout. */
const faceRef = (g: G2D, p: RefPal, f: number): void => {
  g.lineJoin = g.lineCap = 'round'
  // A soft blush on both cheeks, as the intro paints it — light at rest.
  g.globalAlpha = f === FACE.cheer ? 0.75 : 0.35
  ell(g, -6, 10, 6.2, 3.6)
  g.fillStyle = p.blush
  g.fill()
  ell(g, 27.5, 6, 2.6, 2.2)
  g.fill()
  g.globalAlpha = 0.7
  ell(g, 31.5, 8.5, 1.1, 1.5)
  g.fillStyle = p.ink
  g.fill()
  // The intro's two little brow marks.
  g.globalAlpha = 0.5
  ell(g, 1, -14, 2.8, 1.4, -0.15)
  g.fillStyle = p.shade
  g.fill()
  ell(g, 20, -14, 2, 1.2, 0.2)
  g.fill()
  g.globalAlpha = 1
  g.strokeStyle = p.ink
  const line = (w: number): void => { g.lineWidth = w; g.stroke() }
  if (f === FACE.neutral) {
    openEye(g, p)
    flatMouth(g)
  } else if (f === FACE.blink) {
    g.lineWidth = 2.6
    shutEyes(g, false)
    flatMouth(g)
  } else if (f === FACE.cheer) {
    g.lineWidth = 2.6
    shutEyes(g, true)
    g.beginPath()
    g.moveTo(18.5, 15.5)
    g.quadraticCurveTo(23, 25.5, 28, 15)
    g.closePath()
    g.fillStyle = p.mouth
    g.fill()
    line(1.6)
  } else if (f === FACE.ouch) {
    for (const [x, y, rx] of EYES) {
      g.beginPath()
      g.moveTo(x - rx * 0.7, y - 5)
      g.lineTo(x + rx * 0.6, y)
      g.lineTo(x - rx * 0.7, y + 5)
      line(2.6)
    }
    ell(g, 23.5, 18.5, 2.6, 2.2)
    g.fillStyle = p.mouth
    g.fill()
    line(1.4)
  } else {
    for (const [ex, ey, rx] of EYES) {
      g.beginPath()
      const n = Math.round((40 * rx) / 7)
      for (let i = 0; i <= n; i++) {
        const a = i * 0.42
        const r = (0.4 + i * 0.16) * (rx / 6.6) * (40 / n)
        const x = ex + Math.cos(a) * r
        const y = ey + Math.sin(a) * r * 1.15
        if (i) g.lineTo(x, y)
        else g.moveTo(x, y)
      }
      line(1.8)
    }
    g.beginPath()
    g.arc(23.5, 21.5, 3.4, PI + 0.6, -0.6)
    line(1.8)
  }
}

const headRef = (g: G2D, p: RefPal, f: number): void => {
  inked(g, p.ink, [[earPath(...FAR_EAR), p.shade]])
  earInner(g, ...FAR_EAR, p.earIn)
  inked(g, p.ink, [
    [(c) => ell(c, MUZZLE[0], MUZZLE[1], MUZZLE[2], MUZZLE[3]), p.coat],
    [(c) => ell(c, SKULL[0], SKULL[1], SKULL[2], SKULL[3]), p.coat],
    [earPath(...NEAR_EAR), p.coat]
  ])
  earInner(g, ...NEAR_EAR, p.earIn)
  shadeIn(g, (c) => {
    c.beginPath()
    c.ellipse(SKULL[0], SKULL[1], SKULL[2], SKULL[3], 0, 0, TAU)
    c.moveTo(MUZZLE[0] + MUZZLE[2], MUZZLE[1])
    c.ellipse(MUZZLE[0], MUZZLE[1], MUZZLE[2], MUZZLE[3], 0, 0, TAU)
  }, p.shade, (c) => ell(c, -6, 28, 34, 12), 0.4)
  faceRef(g, p, f)
}

type RefDraw = (g: G2D, p: RefPal, f: number) => void
const REF_DRAW: Readonly<Record<PuppetPart, RefDraw>> = {
  torso: torsoRef,
  neck: neckRef,
  head: headRef,
  horn: hornRef,
  forelock: forelockRef,
  backlock: backlockRef,
  mane: maneRef,
  tail: hairRef('tail'),
  leg: legRef,
  hoof: hoofRef
}

/** One painted piece: its drawing is the reference, in the piece's own units
 *  at `s / UNIT[part]` px per unit, so a blit at `UNIT[part]` lands exactly on
 *  the drawing and `measureBox` sees a piece its canvas can hold. */
const puppetSpec = (who: PuppetWho, part: PuppetPart): ItemSpec => ({
  ...PUPPET_ART[who][part],
  frames: part === 'head' ? FACES : 1,
  draw: (g, s, f, _accent: Accent) => {
    g.save()
    g.scale(s / UNIT[part], s / UNIT[part])
    INK_K = UNIT[part] / 70
    try {
      REF_DRAW[part](g, REF[who], f)
    } finally {
      INK_K = 1
    }
    g.restore()
  }
})

export const PUPPET_SPECS: Readonly<Record<PuppetWho, Readonly<Record<PuppetPart, ItemSpec>>>> = {
  aurora: Object.fromEntries(PUPPET_PARTS.map((p) => [p, puppetSpec('aurora', p)])) as Record<PuppetPart, ItemSpec>,
  umbra: Object.fromEntries(PUPPET_PARTS.map((p) => [p, puppetSpec('umbra', p)])) as Record<PuppetPart, ItemSpec>
}

/* ============================== who wears what ========================== */

/** Which painted set a duelist wears, and in what colours (`puppetBake`). */
export interface Dress { who: PuppetWho; look: Look | null }

/** Every sheet of `who`'s set has decoded — the only time the rig paints. */
export const puppetReady = (who: PuppetWho): boolean => {
  // Once a set is whole, one probe a frame says whether it still is (the art
  // layer switched off answers null for every sheet at once).
  if (WHOLE[who] && spriteFor('rig', PUPPET_ART[who].head.id)) return true
  for (const p of PUPPET_PARTS) {
    if (!spriteFor('rig', PUPPET_ART[who][p].id)) {
      WHOLE[who] = false
      return false
    }
  }
  if (!WHOLE[who]) {
    // The set has just come together: measure its boxes and bake its own
    // look while the page is idle, so the first duel it stands in does not
    // pay for them on its first frame.
    for (const p of PUPPET_PARTS) idle(() => boxOf(PUPPET_SPECS[who][p]))
    warmLook(who, lookFor(who, null, null, '', 0))
  }
  WHOLE[who] = true
  return true
}
const WHOLE: Record<PuppetWho, boolean> = { aurora: false, umbra: false }
// Notice a set coming together when its LAST painting decodes, not when it is
// first drawn — by then the warming is too late for that frame. (The art
// layer switched off answers every sheet with null at once, and a set that
// fell apart is noticed on its next draw.)
onArtChanged((c) => {
  if (c && c.kind !== 'rig') return
  for (const who of ['aurora', 'umbra'] as const) if (!WHOLE[who]) puppetReady(who)
})

/**
 * Bake a duelist's look AHEAD of her first draw, in idle time — for a caller
 * that knows who is coming (the next node's foe while the map or a dialogue is
 * up, a skin just put on in the wardrobe). Takes the same inputs as the draw;
 * does nothing until her painted set has decoded.
 */
export const warmPuppet = (st: PoseState, side: number, sFoe: number): void => {
  const foe = side > 0 ? FOES[st.foe ?? sFoe] : undefined
  const pal = (st.skin ?? (foe ? foe.pal : undefined)) as FoePalette | undefined
  const who: PuppetWho = !foe ? 'aurora' : foe.slug === 'umbra' || foe.slug === 'shadow' ? 'umbra' : lum(foe.pal[0]) > 0.55 ? 'aurora' : 'umbra'
  if (!puppetReady(who)) return
  warmLook(who, lookFor(who, pal ?? null, st.mane === 'rainbow' ? null : st.mane ?? null, '', 0))
}

/** Relative luminance of a `#rgb`/`#rrggbb`, 0..1. */
export const lum = (c: string): number => {
  const s = c.replace('#', '')
  const h = s.length === 3 ? s.split('').map((x) => x + x).join('') : s
  const n = parseInt(h, 16)
  if (!Number.isFinite(n)) return 0.5
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255
}

/** Prism's cycling mane and horn: baked in this many hue steps. */
const PRISM_STEPS = 8

/**
 * The set and colours `side` wears, or null when she draws as vectors: Aurora
 * wears hers; Umbra and her shadow clones Umbra's; a Guardian whichever of the
 * two is nearer her own coat's lightness. `sFoe` is the duel's foe when the
 * pose names none.
 */
export const puppetDress = (st: PoseState, side: number, sFoe: number, t: number): Dress | null => {
  const foe = side > 0 ? FOES[st.foe ?? sFoe] : undefined
  const pal = (st.skin ?? (foe ? foe.pal : undefined)) as FoePalette | undefined
  let who: PuppetWho
  if (!foe) who = 'aurora'
  else if (foe.slug === 'umbra' || foe.slug === 'shadow') who = 'umbra'
  else who = lum(foe.pal[0]) > 0.55 ? 'aurora' : 'umbra'
  if (!puppetReady(who)) return null
  const prism = foe && foe.slug === 'prism' ? rainbow(Math.round(t * 0.14 * PRISM_STEPS) / PRISM_STEPS, 80) : ''
  // The same dress as last frame for the same inputs: `lookFor` builds its
  // key from strings, and this runs twice a frame for the whole duel.
  const mane = st.mane ?? null
  const rainbowMane = mane === 'rainbow' ? Math.round((t * 0.12 % 1) * 8) : -1
  const c = DRESSED[side > 0 ? 1 : 0]!
  if (c.d && c.who === who && c.pal === pal && c.mane === mane && c.prism === prism && c.rb === rainbowMane) return c.d
  c.who = who
  c.pal = pal
  c.mane = mane
  c.prism = prism
  c.rb = rainbowMane
  c.d = { who, look: lookFor(who, pal ?? null, mane, prism, t) }
  warmLook(who, c.d.look)
  return c.d
}
interface Dressed { d: Dress | null; who: PuppetWho; pal: FoePalette | undefined; mane: PoseState['mane'] | null; prism: string; rb: number }
/** The last dress per side, and what it was made from. */
const DRESSED: Dressed[] = [0, 1].map(() => ({ d: null, who: 'aurora', pal: undefined, mane: null, prism: '', rb: -1 }))

/** The painted face nearest a portrait's `Face`. */
export const faceOf = (fc: Face): number => {
  if (fc.eye < 0.12) return fc.mouth > 0.5 ? FACE.cheer : FACE.blink
  if (fc.mouth >= 0.9 && fc.eye < 0.5) return FACE.cheer
  return FACE.neutral
}

/* ================================ drawing ============================== */

/** 0 no flash, 1 the white strobe, 2 the red one. */
export type Flash = 0 | 1 | 2

/** Each sheet's box, by its spec: `itemBox` keys its cache by a string it
 *  builds per call, and a painted duelist asks a dozen times a frame. */
const BOXES = new Map<ItemSpec, ReturnType<typeof itemBox>>()
const boxOf = (spec: ItemSpec): ReturnType<typeof itemBox> => {
  let b = BOXES.get(spec)
  if (!b) {
    b = itemBox(spec)
    BOXES.set(spec, b)
  }
  return b
}

/**
 * The face's features, where the head's reference puts them and a little
 * bigger (the painter moves them a touch), for a recolour to leave alone
 * (`puppetBake.setFaceMask`): the eyes, both blushes, the mouth in every
 * mood, the nostril, the inside of both ears. In head units.
 */
const faceFeatures = (g: G2D): void => {
  for (const [x, y, rx, ry] of EYES) {
    ell(g, x, y, rx + 2.5, ry + 2.5)
    g.fill()
  }
  ell(g, -6, 10, 9.5, 6)
  g.fill()
  ell(g, 27.5, 6, 4.5, 4)
  g.fill()
  ell(g, 23.5, 19, 7.5, 5.5)
  g.fill()
  ell(g, 31.5, 8.5, 2.8, 3.2)
  g.fill()
  earInner(g, NEAR_EAR[0], NEAR_EAR[1], NEAR_EAR[2], NEAR_EAR[3] * 1.25, '#000')
  earInner(g, FAR_EAR[0], FAR_EAR[1], FAR_EAR[2], FAR_EAR[3] * 1.25, '#000')
}
const FACE_MASKS = new Map<string, Uint8Array>()
setFaceMask((who, W, H) => {
  const key = `${who} ${W}x${H}`
  const had = FACE_MASKS.get(key)
  if (had) return had
  if (typeof document === 'undefined') return null
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const g = cv.getContext('2d', { willReadFrequently: true })
  if (!g) return null
  // Each frame of the strip is laid into the head's box (`blit`): the same
  // map, inverted, puts head units onto the strip's pixels.
  const box = boxOf(PUPPET_SPECS[who].head)
  const u = UNIT.head
  const fw = W / FACES
  const kx = fw / (box.w * u)
  const ky = H / (box.h * u)
  g.fillStyle = '#000'
  for (let f = 0; f < FACES; f++) {
    g.setTransform(kx, 0, 0, ky, f * fw - box.x * u * kx, -box.y * u * ky)
    faceFeatures(g)
  }
  const d = g.getImageData(0, 0, W, H).data
  const m = new Uint8Array(W * H)
  for (let p = 0; p < m.length; p++) m[p] = d[p * 4 + 3]! > 0 ? 1 : 0
  FACE_MASKS.set(key, m)
  return m
})

/** `part`'s painting (frame `frame`), into its own box at its own unit. */
const blit = (g: G2D, d: Dress, part: PuppetPart, frame: number, v: Variant): void => {
  const spec = PUPPET_SPECS[d.who][part]
  const src = bakedPart(d.who, part, d.look, v)
  if (!src) return
  const box = boxOf(spec)
  const u = UNIT[part]
  const W = (src as HTMLCanvasElement).width || (src as HTMLImageElement).naturalWidth
  const H = (src as HTMLCanvasElement).height || (src as HTMLImageElement).naturalHeight
  const fw = W / spec.frames
  g.drawImage(src, frame * fw, 0, fw, H, box.x * u, box.y * u, box.w * u, box.h * u)
}

/**
 * Draw one painted piece in the current transform, which must put the piece's
 * own reference origin where the rig wants it. Under the hit flash the piece
 * is drawn in a copy baked most of the way to the strobe's colour.
 */
export const paintPart = (g: G2D, d: Dress, part: PuppetPart, frame = 0, far = false, flash: Flash = 0): void => {
  blit(g, d, part, frame, variantOf(far, flash))
}

/** Which baked copy of a piece to draw: the hit flash wins over the far
 *  pair's shade, as the vector rig's strobe wins over its tones. */
const variantOf = (far: boolean, flash: Flash): Variant =>
  flash === 1 ? 'white' : flash === 2 ? 'red' : far ? 'far' : 'plain'

/**
 * A painted hair mass, hung from `(x, y)` — the root the rig hangs it from —
 * and swung `turn` radians from its rest angle about that root.
 */
export const paintHair = (g: G2D, d: Dress, which: HairPart, x: number, y: number, turn: number, flash: Flash): void => {
  const [rx, ry] = HAIR_REF[which]
  g.save()
  g.translate(x, y)
  g.rotate(turn)
  g.translate(-rx, -ry)
  paintPart(g, d, which, 0, false, flash)
  g.restore()
}

/**
 * A hair piece drawn in HEAD space (the chibi's mane): the current transform
 * is the head's, and the piece swings `turn` radians about the poll.
 */
export const paintHeadHair = (g: G2D, d: Dress, which: HairPart, turn: number, flash: Flash): void => {
  g.save()
  g.translate(MANE_ROOT_H[0], MANE_ROOT_H[1])
  g.rotate(turn)
  g.translate(-MANE_ROOT_H[0], -MANE_ROOT_H[1])
  paintPart(g, d, which, 0, false, flash)
  g.restore()
}

/** The rest angle a hair mass's swing is measured from. */
export const hairRest = (which: HairPart): number => HAIR_REF[which][2]

/* ---- the leg, bent along the rig's bones ---- */

/** The leg reference's half-width `y` down it. */
const refHalf = (y: number): number => {
  if (y <= 0) return LEG_HW[0]
  for (let i = 1; i < LEG_Y.length; i++) {
    if (y <= LEG_Y[i]!) {
      const f = (y - LEG_Y[i - 1]!) / (LEG_Y[i]! - LEG_Y[i - 1]!)
      return LEG_HW[i - 1]! + (LEG_HW[i]! - LEG_HW[i - 1]!) * f
    }
  }
  return LEG_HW[LEG_HW.length - 1]!
}

/** How many slices a leg's painting is laid down in — enough that a bent
 *  knee is a curve, not a staircase. */
const LEG_SLICES = 20
/** Each slice reaches this far into its neighbours, so a bend never opens a
 *  crack inside the leg. */
const LEG_OVERLAP = 0.35
/** Where the leg's drawn outline runs: this far out from the rig's bone
 *  half-width, which with `LEG_LINE` gives the drawn leg's own girth (`meat`
 *  strokes 8.4 wider than the bone). */
export const LEG_PAD = 2.6
/** The leg's and the hoof's outline, in rig units: the painted pieces' soft
 *  line (as wide as the head's and the body's own), not the vector rig's
 *  heavy one. */
const LEG_LINE = 1.6
/** How much wider than the outline the painting is laid, so the painting's
 *  own edge line falls OUTSIDE the clip and only its paint shows. */
const LEG_OVERPAINT = 3.5
/** Samples along the outline — a smooth run, round at the knee. */
const LEG_EDGE = 24
/** How far inside the leg painting's own edge its slices are cut, in the
 *  reference's units: past its plum line, so a slice turned into a bent knee
 *  carries paint and never a line. */
const LEG_INSET = 3
/** The leg's coat, laid under its slices: at a sharp bend the slices fan
 *  apart on the outside of the knee, and what shows between them is coat. */
const COAT = new WeakMap<object, string>()
let coatCv: HTMLCanvasElement | null = null
const coatOf = (src: CanvasImageSource, W: number, H: number): string => {
  let c = COAT.get(src as object)
  if (c) return c
  c = '#00000000'
  try {
    coatCv ??= document.createElement('canvas')
    coatCv.width = coatCv.height = 1
    const x = coatCv.getContext('2d', { willReadFrequently: true })!
    x.clearRect(0, 0, 1, 1)
    // the middle of the leg, a third of the way down: coat, lit and shaded
    x.drawImage(src, W * 0.4, H * 0.25, W * 0.2, H * 0.3, 0, 0, 1, 1)
    const px = x.getImageData(0, 0, 1, 1).data
    c = `rgb(${px[0]},${px[1]},${px[2]})`
  } catch {
    // no DOM (tests): no underfill
  }
  COAT.set(src as object, c)
  return c
}
/** A painted leg is outlined along its SIDES only, from this far below its
 *  root (in its top half-widths) down to the hoof: the top of the leg sits in
 *  the body, and a line round it drew every leg as a tube stuck on the belly. */
const LEG_LINE_FROM = 1
const SIDE_L: number[] = []
const SIDE_R: number[] = []
const SIDES = [SIDE_L, SIDE_R] as const
const J_LINE = [0, 0]
/** How much wider than the leg the body is laid back over its top. */
const JOIN_GROW = 1.5

const PT: [number, number] = [0, 0]
const PT2: [number, number] = [0, 0]
/** The point `s` along the chain `Q` (flat [x, y, …], cumulative lengths
 *  `cum`), carried on past either end along its first or last bone. */
const along = (Q: readonly number[], cum: readonly number[], s: number, out: [number, number]): void => {
  const n = cum.length - 1
  let i = 0
  while (i < n - 1 && s > cum[i + 1]!) i++
  const l = cum[i + 1]! - cum[i]! || 1
  const f = (s - cum[i]!) / l
  out[0] = Q[i * 2]! + (Q[i * 2 + 2]! - Q[i * 2]!) * f
  out[1] = Q[i * 2 + 1]! + (Q[i * 2 + 3]! - Q[i * 2 + 1]!) * f
}
/** The chain's direction at `s`, read over ±`win`, normalised into `out`. */
const DIR_WIN = 9
const dirAt = (Q: readonly number[], cum: readonly number[], s: number, out: [number, number]): void => {
  along(Q, cum, s - DIR_WIN, PT2)
  const bx = PT2[0]
  const by = PT2[1]
  along(Q, cum, s + DIR_WIN, PT2)
  const dx = PT2[0] - bx
  const dy = PT2[1] - by
  const l = Math.hypot(dx, dy) || 1
  out[0] = dx / l
  out[1] = dy / l
}
const DIR: [number, number] = [0, 0]

/** A near leg's body, to join it as one silhouette (`paintLeg`). */
export interface LegJoint {
  /** Is a point of the leg's frame inside the body's outline? */
  inBody: (x: number, y: number) => boolean
  /** Lay the body's own painting back over what is already clipped, less a
   *  thin band inside its outline. Sets its own transform. */
  under: (g: G2D) => void
}
/** Which of a leg `paintLeg` lays: all of it, or — for a near leg joined to
 *  the body — its TOP (laid with the body, under the mane and anything worn
 *  on it) or the REST (laid in front, where the leg has always been). */
export const LEG_ALL = 0
export const LEG_TOP = 1
export const LEG_REST = 2

/**
 * THE LEG: one smooth outline, the painting inside it.
 *
 * The first painted legs were the leg's painting cut into slices and laid
 * along the bones, its own line included — and every slice's piece of that
 * line turned a little differently from its neighbour's, so the edge of the
 * leg came out broken, stepped and doubled (owner: "the hoofs and legs seem
 * broken"). Now the OUTLINE is one path: the rig's bone chain, offset to
 * either side by its taper, rounded at the top, stroked in the painted
 * pieces' soft plum along its sides. The painting is still laid along the
 * bones in slices, but WIDER than that path and clipped to it, so its own
 * line never shows — only its paint and its light, which have no edge to
 * break.
 *
 * A NEAR leg in front of the body joins it as one silhouette, the way a
 * drawing does it (owner: "the legs have bad border cutouts"): its line
 * starts where each side leaves the body, and deeper in the body than a thin
 * band the BODY shows, not the leg — the body's own painting is laid back
 * over the leg's top. That is `LEG_TOP`, drawn straight after the body so
 * nothing laid on the body later (the mane lying along it, a necklace, wings)
 * is painted over; `LEG_REST` is the leg below the belly, drawn in front.
 * Only the TOP run is joined: a paw raised in front of the chest keeps its
 * whole outline.
 */
export const paintLeg = (g: G2D, d: Dress, Q: readonly number[], hw: readonly number[], far: boolean, flash: Flash, ink: string, joint?: LegJoint, part = LEG_ALL): void => {
  const spec = PUPPET_SPECS[d.who].leg
  const src = bakedPart(d.who, 'leg', d.look, variantOf(far, flash))
  if (!src) return
  const box = boxOf(spec)
  const u = UNIT.leg
  const W = (src as HTMLCanvasElement).width || (src as HTMLImageElement).naturalWidth
  const H = (src as HTMLCanvasElement).height || (src as HTMLImageElement).naturalHeight
  const y0 = box.y * u
  const bh = box.h * u
  const x0 = box.x * u
  const bw = box.w * u
  const cum = [0]
  for (let i = 0; i + 3 < Q.length; i += 2) cum.push(cum[cum.length - 1]! + Math.hypot(Q[i + 2]! - Q[i]!, Q[i + 3]! - Q[i + 1]!))
  const L = cum[cum.length - 1]!
  const k = L / LEG_LEN
  const halfAt = (s: number): number => {
    const n = cum.length - 1
    let i = 0
    while (i < n - 1 && s > cum[i + 1]!) i++
    const f = Math.max(0, Math.min(1, (s - cum[i]!) / (cum[i + 1]! - cum[i]! || 1)))
    return hw[i]! + (hw[i + 1]! - hw[i]!) * f
  }

  // Its two sides, sampled once down the chain.
  for (let j = 0; j <= LEG_EDGE; j++) {
    const s = (L * j) / LEG_EDGE
    along(Q, cum, s, PT)
    dirAt(Q, cum, s, DIR)
    const h = halfAt(s) + LEG_PAD
    SIDE_L[j * 2] = PT[0] - DIR[1] * h
    SIDE_L[j * 2 + 1] = PT[1] + DIR[0] * h
    SIDE_R[j * 2] = PT[0] + DIR[1] * h
    SIDE_R[j * 2 + 1] = PT[1] - DIR[0] * h
  }
  // Where each side's line starts: where it leaves the body, or a little
  // below the root.
  if (joint) {
    for (let q = 0; q < 2; q++) {
      const side = SIDES[q]!
      let j = 0
      while (j < LEG_EDGE && joint.inBody(side[j * 2]!, side[j * 2 + 1]!)) j++
      J_LINE[q] = Math.max(0, j - 1)
    }
  } else {
    J_LINE[0] = J_LINE[1] = Math.min(LEG_EDGE - 2, Math.ceil(((halfAt(0) * LEG_LINE_FROM) / L) * LEG_EDGE))
  }
  // The joined leg's two parts meet at `jCut`, just past where both sides
  // have left the body.
  const whole = !joint || part === LEG_ALL
  const jCut = whole ? 0 : Math.min(LEG_EDGE - 1, Math.max(J_LINE[0]!, J_LINE[1]!) + 1)
  const jA = part === LEG_REST ? jCut : 0
  const jB = part === LEG_TOP ? jCut : LEG_EDGE

  // The shape from sample `ja` to `jb`, `grow` wider: down one side, straight
  // across (the hoof covers the leg's end — a round cap there poked out under
  // the sole; the REST starts straight across under the TOP), up the other,
  // round the top.
  const legPath = (ja: number, jb: number, grow: number): void => {
    g.beginPath()
    for (let j = ja; j <= jb; j++) {
      const lx = SIDE_L[j * 2]!
      const ly = SIDE_L[j * 2 + 1]!
      const f = grow / (Math.hypot(lx - SIDE_R[j * 2]!, ly - SIDE_R[j * 2 + 1]!) / 2 || 1)
      const x = lx + ((lx - SIDE_R[j * 2]!) / 2) * f
      const y = ly + ((ly - SIDE_R[j * 2 + 1]!) / 2) * f
      if (j > ja) g.lineTo(x, y)
      else g.moveTo(x, y)
    }
    for (let j = jb; j >= ja; j--) {
      const rx = SIDE_R[j * 2]!
      const ry = SIDE_R[j * 2 + 1]!
      const f = grow / (Math.hypot(rx - SIDE_L[j * 2]!, ry - SIDE_L[j * 2 + 1]!) / 2 || 1)
      g.lineTo(rx + ((rx - SIDE_L[j * 2]!) / 2) * f, ry + ((ry - SIDE_L[j * 2 + 1]!) / 2) * f)
    }
    if (!ja) {
      along(Q, cum, 0, PT)
      dirAt(Q, cum, 0, DIR)
      const t0 = Math.atan2(DIR[1], DIR[0])
      g.arc(PT[0], PT[1], halfAt(0) + LEG_PAD + grow, t0 - PI / 2, t0 - PI * 1.5, true)
    }
    g.closePath()
  }
  legPath(jA, jB, 0)

  g.save()
  g.clip()
  g.fillStyle = coatOf(src, W, H)
  g.fill()
  const step = bh / LEG_SLICES
  const sA = (L * jA) / LEG_EDGE - step * k
  const sB = (L * jB) / LEG_EDGE + step * k
  // Each slice's transform is SET, from the leg's own frame, rather than
  // pushed and popped: that was most of what the painted legs cost.
  const m = g.getTransform()
  for (let j = 0; j < LEG_SLICES; j++) {
    const ya = y0 + j * step
    const ym = ya + step / 2
    const s = (ym / LEG_LEN) * L
    if (s < sA || s > sB) continue
    dirAt(Q, cum, s, DIR)
    along(Q, cum, s, PT)
    const inner = Math.max(1.5, refHalf(ym) - LEG_INSET)
    const kx = (halfAt(Math.max(0, Math.min(L, s))) + LEG_PAD + LEG_OVERPAINT) / inner
    const ov = step * LEG_OVERLAP
    const sy0 = ((ya - ov - y0) / bh) * H
    const sy1 = ((ya + step + ov - y0) / bh) * H
    const cy0 = Math.max(0, sy0)
    const cy1 = Math.min(H, sy1)
    if (cy1 <= cy0) continue
    // translate(PT) · rotate(the chain's direction − 90°) · scale(kx, k),
    // multiplied onto the leg's frame by hand.
    const cs = DIR[1]
    const sn = -DIR[0]
    const la = cs * kx
    const lb = sn * kx
    const lc = -sn * k
    const ld = cs * k
    g.setTransform(
      m.a * la + m.c * lb, m.b * la + m.d * lb,
      m.a * lc + m.c * ld, m.b * lc + m.d * ld,
      m.a * PT[0] + m.c * PT[1] + m.e, m.b * PT[0] + m.d * PT[1] + m.f
    )
    const dy0 = ya - ov - ym + ((cy0 - sy0) / H) * bh
    const dh = ((cy1 - cy0) / H) * bh
    g.drawImage(src, ((-inner - x0) / bw) * W, cy0, ((2 * inner) / bw) * W, cy1 - cy0, -inner, dy0, 2 * inner, dh)
  }
  g.setTransform(m)
  g.restore()
  if (joint && part === LEG_TOP) {
    // The leg's top, inside the body: the body's own painting laid back over
    // it — its light, its shading — so the leg's paint shows only in a thin
    // band over the body's outline, where the leg leaves it. Laid a little
    // wider than the leg, so no soft edge of it is left as a seam.
    g.save()
    legPath(0, jCut, JOIN_GROW)
    g.clip()
    joint.under(g)
    g.restore()
  }
  // The line: both sides, from where each leaves the body (or a little below
  // the root) down to the hoof — this part's share of it.
  g.beginPath()
  for (let q = 0; q < 2; q++) {
    const side = SIDES[q]!
    const j0 = Math.max(J_LINE[q]!, jA)
    if (j0 >= jB) continue
    g.moveTo(side[j0 * 2]!, side[j0 * 2 + 1]!)
    for (let j = j0 + 1; j <= jB; j++) g.lineTo(side[j * 2]!, side[j * 2 + 1]!)
  }
  g.lineJoin = 'round'
  g.lineCap = 'round'
  g.lineWidth = LEG_LINE
  g.strokeStyle = ink
  g.stroke()
  g.lineCap = 'butt'
}

/**
 * The painted hoof, on the drawn hoof's own outline: `pts` is the rig's hoof
 * quad (coronet on the leg's end, sole on the floor), filled with the hoof's
 * painting — laid on it toward the sole `(dx, dy)`, wider than the quad and
 * clipped to it — and outlined once, like the leg, so the two meet cleanly.
 */
export const paintHoof = (g: G2D, d: Dress, pts: readonly number[], dx: number, dy: number, w: number, far: boolean, flash: Flash, ink: string): void => {
  g.beginPath()
  g.moveTo(pts[0]!, pts[1]!)
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i]!, pts[i + 1]!)
  g.closePath()
  g.save()
  g.clip()
  g.translate((pts[0]! + pts[2]!) / 2, (pts[1]! + pts[3]!) / 2)
  g.rotate(Math.atan2(dy, dx) - PI / 2)
  const k = ((w + 1) / HOOF_REF.top) * 1.45
  g.scale(k, k)
  g.translate(0, -1.2)
  paintPart(g, d, 'hoof', 0, far, flash)
  g.restore()
  g.lineJoin = 'round'
  g.lineWidth = LEG_LINE
  g.strokeStyle = ink
  g.stroke()
}
