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
type Paint = string | CanvasGradient
const inked = (g: G2D, ink: Paint, shapes: readonly (readonly [Shape, Paint])[], w = REF_INK): void => {
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
      const hw = w * (1 - i * 0.22) * (1 - f * f * 0.85) * 0.5
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
  }, p.mane] as const), HAIR_INK)
}

/* ---- the FULL mane and fringe (owner: "make the mane fuller like in the
 * portraits"). The rig's own mane is three stiff blades; the painted one is
 * the portraits' cloud: a curly crown framing the back and top of the head,
 * and soft locks down the neck to the withers, streaked. Same root, same
 * swing — only what hangs from it is bigger. ---- */
type Lock = readonly [readonly number[], number, number, number]
/** A tapered lock along a cubic centreline, as a closed path — SMOOTH, drawn
 *  through the midpoints of its samples: a faceted outline was painted as a
 *  faceted blade, and its square corners as a cut card (owner, 2026-09-26,
 *  of the fringe: "looks weird"). */
const lockPath = (g: G2D, c: readonly number[], w0: number, w1: number): void => {
  const L: number[] = []
  const R: number[] = []
  const N = 28
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
  const n = p.length / 2
  const mx = (i: number): number => (p[(i % n) * 2]! + p[((i + 1) % n) * 2]!) / 2
  const my = (i: number): number => (p[(i % n) * 2 + 1]! + p[((i + 1) % n) * 2 + 1]!) / 2
  g.beginPath()
  g.moveTo(mx(n - 1), my(n - 1))
  for (let i = 0; i < n; i++) g.quadraticCurveTo(p[i * 2]!, p[i * 2 + 1]!, mx(i), my(i))
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
/**
 * OVER THE BACK OF THE HEAD (owner, 2026-09-26, pointing at the logo: the
 * hair should be "partially painted over the back of the head", not cut off
 * by it). The mane is drawn after the head now, so it is only what lies ON
 * TOP of it and falls from it: three wavy locks from the poll, just behind the
 * near ear, down over the back of the skull and the neck to the chest. Nothing
 * of it reaches the ear, the cheek or the crown — the fringe covers the crown.
 */
const MANE_CURLS: readonly (readonly number[])[] = [[-17, -27, 6.5]]
const MANE_LOCKS: readonly Lock[] = [
  // over the crown BEHIND the near ear, which is drawn back over it
  // (`paintNearEar`) — the mascot's hair behind the ear
  [[-1, -30, -10, -40, -22, -35, -30, -17], 10, 2.5, 3],
  [[-15, -30, -32, -20, -37, 4, -26, 29], 10.5, 2.5, 0],
  [[-13, -26, -25, -10, -29, 11, -16, 27], 10, 2.5, 1],
  [[-12, -21, -19, -7, -18, 9, -8, 19], 8, 2, 2]
]
/**
 * The hair pieces' references are SILHOUETTES only — the mass's outline in one
 * flat colour, no locks and no stripes drawn in. Every lock and stripe drawn
 * into a reference came back traced as it was drawn (bands, a fan of strands,
 * a rainbow hair band); with only the outline to follow, the painter fills it
 * with the hair of the model it is shown. (`taperedMass`, below the fringe.)
 */
/** The hair silhouettes' line: thin, as the logo's hair is drawn — the heavy
 *  one came back traced round every painted hair piece. */
const HAIR_INK = REF_INK * 0.5
/** The mane's locks TAPER to curling tips, as the logo's do: blunt ends made
 *  a flat hem, and a flat hem is painted as a wig. */
const maneRef = (g: G2D, p: RefPal): void => taperedMass(g, p, MANE_CURLS, MANE_LOCKS)
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
/*
 * THE LOGO'S FRINGE (owner, 2026-09-26: "the forehead hair part looks weird",
 * pointing at the logo). `hairMass` ends every lock blunt, at least 7 wide,
 * and the fringe came back as two cards of hair with square notched ends.
 * Now each half is a couple of broad locks TAPERING to a soft curling tip,
 * as the logo paints them: the front half sweeps from the horn's root left
 * and down over the forehead, its tip curling above the near brow; the back
 * half falls from behind the horn to the right, past the far ear, to a tip
 * beside the far brow.
 */
const FORE_CURLS: readonly (readonly number[])[] = [[8, -25, 6]]
const FORE_LOCKS: readonly Lock[] = [
  [[11, -24, 4, -32, -7, -27, -5, -14], 11, 2.5, 0],
  [[10, -20, 5, -26, -1, -22, 2, -12], 7, 2, 1]
]
const BACK_CURLS: readonly (readonly number[])[] = [[12, -28, 5.5]]
const BACK_LOCKS: readonly Lock[] = [
  [[10, -28, 19, -32, 28, -24, 31, -8], 9, 2.5, 0],
  [[12, -24, 18, -26, 23, -19, 25, -9], 6.5, 2, 1]
]
/** A hair mass whose locks taper to their tips (the mane's and the fringe's). */
const taperedMass = (g: G2D, p: RefPal, curls: readonly (readonly number[])[], locks: readonly Lock[]): void => inked(g, p.ink, [
  ...curls.map((c) => [(x: G2D) => ell(x, c[0]!, c[1]!, c[2]!, c[2]! * 0.92), p.mane] as const),
  // a tip, never a cut end: a flat end of any width reads as scissored hair
  ...locks.map(([c, w0, w1]) => [(x: G2D) => lockPath(x, c, w0 * 1.3, w1 * 0.25), p.mane] as const)
], HAIR_INK)
const forelockRef = (g: G2D, p: RefPal): void => taperedMass(g, p, FORE_CURLS, FORE_LOCKS)
const backlockRef = (g: G2D, p: RefPal): void => taperedMass(g, p, BACK_CURLS, BACK_LOCKS)

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
 * rx, ry] for the round skull, the jaw and the muzzle.
 *
 * A PONY'S MUZZLE, NOT A BUMP (owner, 2026-09-26, with a portrait of the face
 * he wants: "super cute and fairy tale like"; ours was "dull"). The round
 * skull with a small muzzle barely out of it was painted as a ball — a
 * kitten's or a hamster's head. The muzzle now comes well out of the skull to
 * the lower right, tipped down toward the chin, with a gentle dip at the
 * bridge, and the jaw joins the two in one curve underneath — the shape of
 * the owner's portrait, the mascot pair and the dialogue portraits alike.
 */
const FAR_EAR = [19, -18, 0.42, 0.75] as const
const NEAR_EAR = [-8, -20, -0.2, 1.1] as const
const SKULL = [0, -2, 25.5, 24] as const
/** [cx, cy, rx, ry, angle]: tipped down, so its front end is the chin's. */
const MUZZLE = [23, 9, 14, 11, 0.12] as const
/** Under it, rising from the throat to the chin. */
const JAW = [8, 8, 17, 13] as const
/** Where the mouth sits on the muzzle, every mood's. */
const MOUTH = [28.1, 15.4] as const

/**
 * Both eyes, the near one big, the far one narrower toward the muzzle, both
 * looking to the right (`LOOK`). [x, y, rx, ry].
 */
// Where the painted head (2026-09-26, edited from the owner's portrait) has
// them, measured off its sliced frame: the recolour's feature mask follows
// these, so they must follow the painting.
const EYES: readonly (readonly [number, number, number, number])[] = [[12, 1.2, 4.4, 4.9], [28, -0.4, 2.4, 4.6]]
/** How far the iris sits toward the opponent, in eye radii. */
const LOOK = 0.24
/**
 * The owner's portrait's eye, as a stand-in: a white showing on the side away
 * from the opponent, a tall iris darkening toward the top, a big catch-light
 * and a small one, and a heavy soft lash line over the top that flicks out
 * into lashes at the OUTER corner — the near eye's left, the far eye's right.
 * The first stand-in's eye (one flat violet disc, a thin rim) came back
 * painted exactly as drawn.
 */
const openEye = (g: G2D, p: RefPal): void => {
  EYES.forEach(([x, y, rx, ry], i) => {
    ell(g, x, y, rx, ry)
    g.fillStyle = '#fffaf6'
    g.fill()
    g.save()
    ell(g, x, y, rx, ry)
    g.clip()
    const ix = x + rx * LOOK
    const irx = rx * 0.8
    const iry = ry * 0.88
    const iris = g.createLinearGradient(0, y - iry, 0, y + iry)
    iris.addColorStop(0, '#2e1c40')
    iris.addColorStop(0.45, p.eye)
    iris.addColorStop(1, p.eyeLo)
    ell(g, ix, y + ry * 0.06, irx, iry)
    g.fillStyle = iris
    g.fill()
    ell(g, ix + irx * 0.06, y, irx * 0.46, iry * 0.48)
    g.fillStyle = '#261630'
    g.fill()
    ell(g, ix, y + ry * 0.06, irx, iry)
    g.strokeStyle = mixHex(p.eye, '#1a0f24', 0.5)
    g.lineWidth = 0.9
    g.stroke()
    // a soft glow in the bottom of the iris
    soft(g, 1)
    ell(g, ix - irx * 0.1, y + iry * 0.55, irx * 0.6, iry * 0.28)
    g.fillStyle = mixHex(p.eyeLo, '#ffffff', 0.35, 0.8)
    g.fill()
    g.filter = 'none'
    g.restore()
    ell(g, ix + irx * 0.32, y - ry * 0.36, irx * 0.38, iry * 0.27)
    g.fillStyle = '#fff'
    g.fill()
    ell(g, ix - irx * 0.36, y + ry * 0.42, irx * 0.17, irx * 0.17)
    g.fill()
    // The lash line over the top, heavier toward the outer corner, and two
    // lashes flicking out of that corner.
    const outer = i === 0 ? -1 : 1
    g.strokeStyle = p.ink
    g.lineWidth = 1.8
    g.beginPath()
    g.ellipse(x, y, rx + 0.2, ry + 0.2, 0, PI + 0.3, -0.3)
    g.stroke()
    g.lineWidth = 2.6
    g.beginPath()
    if (outer < 0) g.ellipse(x, y, rx + 0.3, ry + 0.3, 0, PI + 0.3, PI + 0.9)
    else g.ellipse(x, y, rx + 0.3, ry + 0.3, 0, -0.9, -0.3)
    g.stroke()
    g.lineWidth = 1.5
    g.beginPath()
    for (const t of [0.4, 0.85]) {
      const a = outer < 0 ? PI + t : -t
      const px = x + (rx + 0.6) * Math.cos(a)
      const py = y + (ry + 0.6) * Math.sin(a)
      g.moveTo(px, py)
      g.quadraticCurveTo(px + Math.cos(a) * 1.6 + outer, py + Math.sin(a) * 1.6 - 0.4, px + Math.cos(a) * 2.6 + outer * 2.2, py + Math.sin(a) * 2.6 - 1.4)
    }
    g.stroke()
  })
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

/** The blushes, [x, y, rx, ry]; the nostril, [x, y]; the brow tufts,
 *  [x, y, rx, ry, angle]. Shared with the recolour's feature mask. */
const NEAR_BLUSH = [10.3, 8.6, 4.9, 2.5] as const
const FAR_BLUSH = [31.7, 4.5, 1.6, 1.4] as const
const NOSTRIL = [29.3, 9] as const
const BROWS: readonly (readonly [number, number, number, number, number])[] = [[12, -10.3, 3, 1.2, -0.1], [28, -11.1, 2, 1, 0.2]]

/** A small closed mouth, gentle and calm: neither a smile nor a pout. */
const flatMouth = (g: G2D): void => {
  const [mx, my] = MOUTH
  g.beginPath()
  g.moveTo(mx - 3.4, my - 0.2)
  g.quadraticCurveTo(mx - 0.2, my + 0.8, mx + 3, my - 0.4)
  g.lineWidth = 1.4
  g.stroke()
}

/** Panel `f`'s face (`FACE`). Panel 0 is what a duelist wears the whole duel,
 *  so it is CALM: open eyes, level brows, a small closed mouth, the faintest
 *  blush — neither a smile nor a pout. */
const faceRef = (g: G2D, p: RefPal, f: number): void => {
  g.lineJoin = g.lineCap = 'round'
  const [mx, my] = MOUTH
  // A soft blush on both cheeks, as the intro paints it — light at rest.
  g.globalAlpha = f === FACE.cheer ? 0.85 : 0.55
  soft(g, 1.8)
  ell(g, ...NEAR_BLUSH)
  g.fillStyle = p.blush
  g.fill()
  ell(g, ...FAR_BLUSH)
  g.fill()
  g.filter = 'none'
  g.globalAlpha = 0.7
  ell(g, NOSTRIL[0], NOSTRIL[1], 1.1, 1.8, 0.5)
  g.fillStyle = p.ink
  g.fill()
  // The owner's portrait's little brow tufts.
  g.globalAlpha = 0.45
  g.fillStyle = mixHex(p.shade, p.blush, 0.45)
  soft(g, 0.6)
  for (const b of BROWS) {
    ell(g, ...b)
    g.fill()
  }
  g.filter = 'none'
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
    g.moveTo(mx - 5, my - 3)
    g.quadraticCurveTo(mx - 0.5, my + 5.5, mx + 4.5, my - 3.5)
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
    ell(g, mx, my, 2.6, 2.2)
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
    g.arc(mx, my + 2.4, 3.4, PI + 0.6, -0.6)
    line(1.8)
  }
}

/** `#rgb`/`#rrggbb` as [r, g, b]. */
const rgbOf = (c: string): number[] => {
  const h = c.replace('#', '')
  const x = h.length === 3 ? h.split('').map((d) => d + d).join('') : h
  return [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16))
}
/** `a` taken `t` of the way to `b`, with alpha `al`. */
const mixHex = (a: string, b: string, t: number, al = 1): string => {
  const A = rgbOf(a)
  const B = rgbOf(b)
  return `rgba(${A.map((v, i) => Math.round(v + (B[i]! - v) * t)).join(',')},${al})`
}
/** Soften what is drawn next by `u` units (the canvas is scaled per sheet). */
const soft = (g: G2D, u: number): void => {
  if (typeof g.getTransform !== 'function') return
  const t = g.getTransform()
  g.filter = `blur(${Math.max(0.3, u * Math.hypot(t.a, t.b)).toFixed(2)}px)`
}

/** The head's silhouette — skull, jaw and muzzle — for a clip or a fill. */
const headMass: Shape = (c) => {
  c.beginPath()
  c.ellipse(SKULL[0], SKULL[1], SKULL[2], SKULL[3], 0, 0, TAU)
  c.moveTo(JAW[0] + JAW[2], JAW[1])
  c.ellipse(JAW[0], JAW[1], JAW[2], JAW[3], 0, 0, TAU)
  c.moveTo(MUZZLE[0] + MUZZLE[2] * Math.cos(MUZZLE[4]), MUZZLE[1] + MUZZLE[2] * Math.sin(MUZZLE[4]))
  c.ellipse(MUZZLE[0], MUZZLE[1], MUZZLE[2], MUZZLE[3], MUZZLE[4], 0, TAU)
}
/** The head's line is lighter than the other pieces': a heavy even ring round
 *  a flat ball is what the first painting of it traced. */
const HEAD_INK = REF_INK * 0.6

/**
 * A PAINTED STAND-IN (owner, 2026-09-26). Two strips in a row came back as
 * near-exact traces of the flat stand-in — however the brief pleaded — so
 * the stand-in itself carries the finish now: a warm key light from the top
 * left, a soft form shadow round the jaw and down the far side, a lit muzzle,
 * soft blushes, and a line that fades on the lit edge and darkens in the
 * shadow. A trace of this is already soft; a painting from it softer still.
 */
const headRef = (g: G2D, p: RefPal, f: number): void => {
  const lit = mixHex(p.coat, '#ffffff', 0.5)
  const coat = g.createRadialGradient(-10, -16, 3, -2, -6, 50)
  coat.addColorStop(0, lit)
  coat.addColorStop(0.55, p.coat)
  coat.addColorStop(1, mixHex(p.coat, p.shade, 0.75))
  const ink = g.createLinearGradient(-24, -34, 30, 26)
  ink.addColorStop(0, mixHex(p.ink, p.blush, 0.5))
  ink.addColorStop(0.45, mixHex(p.ink, p.blush, 0.18))
  ink.addColorStop(1, p.ink)
  inked(g, ink, [[earPath(...FAR_EAR), mixHex(p.coat, p.shade, 0.6)]], HEAD_INK)
  earInner(g, ...FAR_EAR, p.earIn)
  inked(g, ink, [
    [(c) => ell(c, ...MUZZLE), coat],
    [(c) => ell(c, ...JAW), coat],
    [(c) => ell(c, ...SKULL), coat],
    [earPath(...NEAR_EAR), coat]
  ], HEAD_INK)
  earInner(g, ...NEAR_EAR, p.earIn)
  g.save()
  headMass(g)
  g.clip()
  // The form shadow: everything outside the lit part of the head, softened.
  soft(g, 3.2)
  g.beginPath()
  g.rect(-70, -70, 150, 130)
  g.ellipse(-1, -9, 33, 28, -0.1, 0, TAU, true)
  g.fillStyle = mixHex(p.shade, p.blush, 0.22, 0.6)
  g.fill()
  // Light on the muzzle's top and on the brow.
  soft(g, 2.4)
  ell(g, 27, 3.5, 8, 3.6, 0.15)
  g.fillStyle = mixHex(lit, '#ffffff', 0.3, 0.7)
  g.fill()
  ell(g, -6, -14, 11, 6, -0.3)
  g.fillStyle = mixHex(lit, '#ffffff', 0.3, 0.55)
  g.fill()
  g.restore()
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
  ell(g, NEAR_BLUSH[0], NEAR_BLUSH[1], NEAR_BLUSH[2] + 3.3, NEAR_BLUSH[3] + 2.4)
  g.fill()
  ell(g, FAR_BLUSH[0], FAR_BLUSH[1], FAR_BLUSH[2] + 1.9, FAR_BLUSH[3] + 1.9)
  g.fill()
  ell(g, MOUTH[0], MOUTH[1] + 0.5, 7.5, 5.5)
  g.fill()
  ell(g, NOSTRIL[0], NOSTRIL[1], 2.8, 3.2)
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

/**
 * THE NEAR EAR IN FRONT OF THE HAIR (owner, 2026-09-26: "the head hair is
 * behind the ear, but in front of the face and body"). The ear is part of the
 * head's painting, and the mane is drawn over the head — so the head's
 * painting is laid once more, clipped to the near ear, after the mane. The
 * outline is the painted ear's (measured off its frame, head units), a unit
 * outside it so its own line comes along. Its lower edge runs ACROSS the
 * ear's base, rising toward the back: below it is skull, and a clip reaching
 * there laid a patch of coat over the hair with a hard edge.
 */
const NEAR_EAR_CLIP: readonly number[] = [
  -5.4, -46.8, 0.9, -38.5, 2.9, -30.5, 3.3, -24.3, 2.8, -18.5, -1, -17.8, -6.2, -18.7, -10.3, -20, -13.6, -21.4,
  -13.3, -25.1, -12.2, -30, -10.9, -35, -9.3, -39.9, -6.4, -45.7
]
export const paintNearEar = (g: G2D, d: Dress, frame: number, flash: Flash): void => {
  g.save()
  g.beginPath()
  g.moveTo(NEAR_EAR_CLIP[0]!, NEAR_EAR_CLIP[1]!)
  for (let i = 2; i < NEAR_EAR_CLIP.length; i += 2) g.lineTo(NEAR_EAR_CLIP[i]!, NEAR_EAR_CLIP[i + 1]!)
  g.closePath()
  g.clip()
  paintPart(g, d, 'head', frame, false, flash)
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
 *  line, as wide as the painted head's (owner, 2026-09-26: the body should
 *  match the new face — its line is ~0.6 head units, ~1 rig unit), and laid
 *  at `LEG_LINE_ALPHA` so the plum reads warm on the coat, as the head's does. */
const LEG_LINE = 1
const LEG_LINE_ALPHA = 0.8
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
  const a0 = g.globalAlpha
  g.globalAlpha = a0 * LEG_LINE_ALPHA
  g.stroke()
  g.globalAlpha = a0
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
  const a0 = g.globalAlpha
  g.globalAlpha = a0 * LEG_LINE_ALPHA
  g.stroke()
  g.globalAlpha = a0
}
