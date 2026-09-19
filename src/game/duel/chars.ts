/**
 * chars.ts — AURORA and UMBRA, the two chibi duelists. Ported unchanged from
 * the jam build; the anatomy notes below are the jam build's own.
 *
 * Two ideas do all the work of making these read as drawn characters rather
 * than stacked primitives:
 *
 *  1. SILHOUETTE-FIRST INKING. Every compound mass (torso + neck, skull +
 *     muzzle, ear, horn) is drawn in two passes — first the whole group is
 *     STROKED with one very heavy line, then every part is FILLED on top. The
 *     fills swallow the inner half of those strokes, so what survives is a
 *     single continuous outline around the union and no seams where the parts
 *     overlap. Interior features then get hairlines, which is where the varied
 *     line weight comes from.
 *  2. THREE-BAND CEL SOLIDS (`blob`). Each form is clipped to itself and given
 *     a bounce/rim light, a core shadow and a lit coat, all hard-edged, offset
 *     towards a key light that is up-and-forward. Volume, no gradients.
 *
 * The legs are REAL EQUINE LEGS, not two-bone doll limbs: three segments and a
 * hoof, with the fore KNEE and the hind HOCK folding backward while the STIFLE
 * above the hock swings forward — built off published horse measurements
 * (fetlock .12, knee .31 / hock .34 of withers height, elbow .53 / stifle .50,
 * hip .72). The standing foreleg is a plumb weight-bearing COLUMN; the hind leg
 * is the equine "Z". Each limb TAPERS the whole way down, because a horse
 * carries muscle above the knee and nothing but tendon below it.
 *
 * The rig is authored FACING +X in a local space whose origin is where the
 * HOOVES MEET THE GROUND. Umbra is the same rig mirrored, stockier,
 * bigger-headed and a little shorter.
 *
 * No Math.random() in any draw path: every wobble is derived from `t`, so the
 * characters never shimmer and a paused game freezes into a stable pose.
 * S.q === 0 drops the cel bands, the limb/neck shade stripes, the aura and all
 * but the hero hair lock; silhouette, proportions and poses are unchanged. The
 * limb bounce rim survives every quality level — without it Umbra's four black
 * legs fuse into one unreadable mass.
 */
import { FOES, type FoePalette } from '@/game/duel/foes'
import { S, rainbow } from '@/game/duel/state'
import { TAU, PI, clamp, sin, cos, atan2, hypot, min, max, abs } from '@/game/duel/util'

type G2D = CanvasRenderingContext2D

/**
 * A face for a dialogue portrait (§9.7.1, §10.6's emote table): brow −1
 * (stern, inner end down) … 1 (worried, inner end up); eye 0 (closed) … 1
 * (wide); mouth −1 (frown) … 1 (open smile); blush 0 … 1.
 */
export interface Face { brow: number; eye: number; mouth: number; blush: number }

/**
 * Where a cosmetic hangs, in the rig's own (authored, facing +x) space
 * inside the rearing frame — §9.7's anchors, read off the same pose math.
 */
export interface RigAnchors {
  /** 70 % along the neck tube from the chest toward the poll. */
  neckCollar: [number, number]
  /** Unit vector along the neck, chest → poll. */
  neckDir: [number, number]
  /** The top of the chest mass — where wings root. */
  backWithers: [number, number]
  /** The tail's root. */
  tailBase: [number, number]
  /** Seconds, and how excited the rig is (a win hop, a rear) 0..1. */
  t: number
  lift: number
  /** How far the rig has collapsed on a lost duel, 0..1. */
  lose: number
  /** +1 when the rig faces +x in the caller's space (Aurora), −1 mirrored. */
  facing: number
  /* The rest are in the CALLER's (stage) space, for `afterRig`, which runs
   * after the whole rig with the caller's transform back in place — the
   * same transform chain replayed, so they follow a rear, a hop, a recoil
   * and a collapse. Filled only when `afterRig` is set. */
  /** The near fore hoof, where it meets the ground (§9.7's `hoofFront`). */
  hoofFront: [number, number]
  /** The near hind hoof. */
  hoofHind: [number, number]
  /** The tail's root (`tailBase`, in stage space). */
  tailStage: [number, number]
  /** The barrel's centre. */
  bodyStage: [number, number]
  /** The skull's centre. */
  headStage: [number, number]
  /** A dialogue portrait's single baked frame (the pose carries a `face`):
   *  no clock runs between frames, so an emitter draws a still instead. */
  portrait: boolean
}

/** Pose inputs for one duelist, all 0..1. */
export interface PoseState {
  cast?: number
  hurt?: number
  hp?: number
  win?: number
  lose?: number
  form?: number
  /** A portrait's expression; omitted in the duel. */
  face?: Face
  /** Draw a foe-side rig in THIS foe's palette instead of the current duel's. */
  foe?: number
  /** Called inside the head group (after the forelock): head-slot cosmetics. */
  afterHead?: (g: G2D) => void
  /** Back-slot items BEHIND the body (a wing's far layer), in the rig's own
   *  space inside the rearing frame, before the torso (§9.7). */
  beforeTorso?: (g: G2D, a: RigAnchors) => void
  /** Items OVER the body (a wing's near layer), after the torso. */
  afterTorso?: (g: G2D, a: RigAnchors) => void
  /** Neck-slot items (necklace, scarf), after the mane, under the head. */
  afterMane?: (g: G2D, a: RigAnchors) => void
  /** After the WHOLE rig, with the caller's (stage) transform restored
   *  (§9.7's `afterRig`): a companion, a hoof-trail emitter. Reads the
   *  stage-space anchors (`hoofFront`, `tailStage`, …). */
  afterRig?: (g: G2D, a: RigAnchors) => void
  /** A skin (§9.7's `skin` split, C31): this palette for coat, mane, horn,
   *  hooves, eye and blush — on the side's OWN proportions and behaviour.
   *  The side alone still decides the dread aura, the half-lidded eye and
   *  the stockier scale, so a skin on Aurora is only ever a recolour. */
  skin?: FoePalette
  /** The mane and tail colours `[base, streak]` over the skin's (the Mane
   *  Color Palette); `'rainbow'` cycles them through the hues. */
  mane?: readonly [string, string] | 'rainbow'
}

/** The one hand-inked outline colour. */
const OUT = '#150f1c'
/** Nominal standing height, hooves -> horn tip, in stage units. */
const HT = 197
/** Torso masses as [cx, cy, rx, ry] quads: haunch, barrel, chest. */
const TQ = [-23, 6, 18, 21, -2, 0, 29, 27, 19, 3, 14.5, 18]

/** [coat, shadow, rim, mane, streak, horn, hoof, eye, glow, blush] */
const PAL: readonly (readonly string[])[] = [
  // AURORA — cream coat, warm shadow, pearl rim, gold mane w/ pastel locks
  ['#fec', '#eba', '#fff', '#fc3', '#fe9', '#fd6', '#c94', '#423', '#fe9', '#f9a'],
  // UMBRA — matte black coat, violet bounce rim, purple mane w/ neon cyan
  ['#213', '#102', '#74c', '#84d', '#7ff', '#a5f', '#539', '#7ff', '#b7f', '#639']
]

/** Draw context + clock + the active palette, cached so helpers stay terse. */
let g!: G2D
let T = 0
let AM = 0
let CO = ''
let SH = ''
let RM = ''
let MA = ''
let MH = ''
let HO = ''
let HF = ''
let EY = ''
let GL = ''
let BL = ''

/**
 * The anchors handed to the cosmetic hooks: ONE reused object, so a dressed
 * rig allocates nothing per frame. Valid only for the duration of a hook
 * call — a hook must copy what it wants to keep.
 */
const ANC: RigAnchors = {
  neckCollar: [0, 0],
  neckDir: [0, -1],
  backWithers: [0, 0],
  tailBase: [0, 0],
  t: 0,
  lift: 0,
  lose: 0,
  facing: 1,
  hoofFront: [0, 0],
  hoofHind: [0, 0],
  tailStage: [0, 0],
  bodyStage: [0, 0],
  headStage: [0, 0],
  portrait: false
}

/** The outer transform chain of the rig being drawn, for `toStage`. */
let XA = 0
let YA = 0
let SXA = 1
let LA = 0
let HA = 0
let RA = 0

/**
 * Replay `drawUnicorn`'s transform chain on one point: from the standing
 * frame (`rf` false — the hind legs' frame) or the rearing frame (`rf` true —
 * the body, forelegs and head) out to the caller's space. No drawing.
 */
const toStage = (px: number, py: number, rf: boolean, out: [number, number]): void => {
  if (rf) {
    // translate(-22, -6) · rotate(R) · translate(22, 6)
    const c = cos(RA)
    const s = sin(RA)
    const ux = px + 22
    const uy = py + 6
    px = c * ux - s * uy - 22
    py = s * ux + c * uy - 6
  }
  py += HA // the victory hop / rear lift
  if (LA) {
    // collapsed: translate(-45L, -16L) · rotate(1.15L)
    const c = cos(1.15 * LA)
    const s = sin(1.15 * LA)
    const ux = px
    px = c * ux - s * py - 45 * LA
    py = s * ux + c * py - 16 * LA
  }
  out[0] = XA + SXA * px
  out[1] = YA + py
}

/* ------------------------------ helpers ----------------------------- */

/** Fill the current path flat, then ink an outline of width `w` around it. */
const ink = (f?: string | 0, w?: number): void => {
  if (f) {
    g.fillStyle = f
    g.fill()
  }
  if (w) {
    g.lineWidth = w
    g.stroke()
  }
}

/** Path through a flat [x,y,...] list; `c` closes it. */
const poly = (p: readonly number[], c?: boolean): void => {
  g.beginPath()
  g.moveTo(p[0]!, p[1]!)
  for (let i = 2; i < p.length; i += 2) g.lineTo(p[i]!, p[i + 1]!)
  if (c) g.closePath()
}

/** Ellipse path. Radii are clamped positive so no pose can throw. */
const el = (x: number, y: number, rx: number, ry: number, a?: number): void => {
  g.beginPath()
  g.ellipse(x, y, max(0.1, rx), max(0.1, ry), a || 0, 0, TAU)
}

/**
 * A DIMENSIONAL form — the workhorse. Key light is up-and-forward (+x, -y),
 * so we clip to the silhouette and lay three hard-edged bands inside it:
 * bounce rim (the whole shape), core shadow (nudged towards the light) and
 * the lit coat (nudged further). No outline: every caller has already laid
 * its group down as one continuous silhouette line.
 */
const blob = (x: number, y: number, rx: number, ry: number): void => {
  el(x, y, rx, ry)
  if (S.q) {
    g.save()
    g.clip()
    ink(RM)
    el(x + rx * 0.08, y - ry * 0.08, rx, ry)
    ink(SH)
    el(x + rx * 0.34, y - ry * 0.32, rx, ry)
    ink(CO)
    g.restore()
  } else ink(CO)
}

/**
 * ONE PASS of a TAPERED tube: stroke every segment of the flat polyline `p`
 * separately, each at the mean of its two nodes' half-widths in `hw`, offset
 * by `d` and optionally scaled by `k`. Round caps and joins give the joint
 * swellings a real limb has for free. Whole-pass-at-a-time is load-bearing:
 * ink EVERY segment, then rim every segment, then coat every segment.
 */
const tube = (p: readonly number[], hw: readonly number[], d: number, f: string, k?: number): void => {
  g.strokeStyle = f
  for (let i = 1; i < hw.length; i++) {
    poly([p[i * 2 - 2]!, p[i * 2 - 1]!, p[i * 2]!, p[i * 2 + 1]!])
    ink(0, (hw[i]! + hw[i - 1]!) * (k || 1) + d)
  }
  g.strokeStyle = OUT
}

/**
 * Ink and cel-shade a tapered tube: a heavy outline, a BOUNCE RIM surviving as
 * a hairline just inside it, the coat inset within that, and a shadow stripe
 * down the lower-back side so a limb is a cylinder rather than a stick.
 */
const meat = (p: readonly number[], hw: readonly number[], col: string): void => {
  tube(p, hw, 8.4, OUT)
  tube(p, hw, 0, RM)
  tube(p, hw, -3, col)
  if (S.q) tube(p.map((v, i) => v + hw[i >> 1]! * (i & 1 ? 0.2 : -0.18)), hw, 0, SH, 0.4)
}

/**
 * The two leg rigs, packed as [a0..a3 | l0..l3 | k0..k3 | hw0..hw4] — absolute
 * joint angles, segment lengths, the flex each joint takes per unit of curl,
 * and the tapering half-widths. PI/2 (1.571) = straight down, SMALLER =
 * leaning forward.
 */
const FORE = [1.73, 1.62, 1.57, 1.01, 17, 22, 17.5, 7, -1, -0.5, 0.85, 1.3, 9.5, 9.6, 7.2, 6, 5.4]
const HIND = [1, 2.38, 1.57, 1.14, 24, 21, 20, 7, -0.5, -1.4, 1.9, 0.5, 11.8, 11.4, 7.4, 6.2, 5]

/**
 * ONE leg, built by FORWARD KINEMATICS from the joint angles above rather than
 * by an IK solve, because the joints bend in FIXED, OPPOSITE directions — a
 * solver would happily flip them. `c` curls the whole chain. The finished chain
 * is then aimed RIGIDLY so the hoof lands on (fx,fy): relative joint angles are
 * untouched, so the anatomy holds and the hind hooves stay nailed down while
 * the body rears back over them.
 */
const limb = (hx: number, hy: number, fx: number, fy: number, c: number, P: readonly number[], col: string): void => {
  let Q = [0, 0]
  let x = 0
  let y = 0
  for (let i = 0; i < 4; i++) {
    const a = P[i]! + c * P[i + 8]!
    Q.push((x += cos(a) * P[i + 4]!), (y += sin(a) * P[i + 4]!))
  }
  // stretch the CHAIN, not the context: ink weights stay in stage units
  const s = clamp(hypot(fx - hx, fy - hy) / (hypot(x, y) || 1), 0.6, 1.3)
  Q = Q.map((v) => v * s)
  const rt = atan2(fy - hy, fx - hx) - atan2(y, x)
  g.save()
  g.translate(hx, hy)
  g.rotate(rt)
  // GROUND LEVEL inside the rotated frame runs along (cos rt, -sin rt); the
  // hoof is the one part that answers to the floor rather than the bone.
  const rc = cos(rt)
  const rs = sin(rt)
  const pa = P[3]! + c * P[11]! // pastern direction: aims the feather and the hoof
  const px = cos(pa)
  const py = sin(pa)
  const w = P[16]! // the tip half-width: one number sizes the whole foot
  el(Q[6]!, Q[7]!, w * 0.95, 8, pa) // feathered fetlock, buried under the cannon
  ink(0, 7)
  ink(col)
  meat(Q, P.slice(12), col) // the entire leg as ONE tapered run, no seams
  // The hoof: a WALL that leans with the pastern onto a SOLE that lies FLAT ON
  // THE GROUND — the coronet rides up the bone while both rims run along the
  // floor, which is also what makes the wall slope forward to the toe.
  const ax = Q[8]! - px * 2
  const ay = Q[9]! - py * 2
  const bx = Q[8]! + rs * 6
  const cy = Q[9]! + rc * 6
  const v = w * 1.7
  poly([ax - rc * w, ay + rs * w, ax + rc * w, ay - rs * w, bx + rc * v, cy - rs * v, bx - rc * v, cy + rs * v], true)
  ink(0, 6)
  ink(HF)
  g.restore()
}

/**
 * A hair MASS: `n` overlapping LOCKS in alternating tones, splayed to either
 * side of the hero lock, each shorter and a beat out of phase. Each lock is a
 * tapered strip whose spine carries a travelling wave (`AM` is the shared
 * amplitude, set per pose); the wave's phase shifts along the length, so the
 * tip lags the root — "hair follows the body" with zero stored state.
 */
const hair = (x: number, y: number, a: number, len: number, w: number, sp: number, curl: number, n: number): void => {
  for (let i = S.q ? n : 1; i--;) {
    const L: number[] = []
    const R: number[] = []
    let px = x - i * 3
    let py = y + i * 4
    for (let j = 0; j <= 6; j++) {
      const f = j / 6
      const aa =
        a + (i & 1 ? 0.34 : -0.38) * i + (curl + i * 0.16) * f + AM * sin(T * (sp + i * 0.5) - f * 3.6) * (0.25 + f)
      const hw = w * (1 - i * 0.22) * (1 - f * f * 0.6) * 0.5
      const nx = sin(aa) * hw
      const ny = cos(aa) * hw
      L.push(px - nx, py + ny)
      R.unshift(px + nx, py - ny) // unshift = the return edge, already reversed
      px += (cos(aa) * len * (1 - i * 0.26)) / 6
      py += (sin(aa) * len * (1 - i * 0.26)) / 6
    }
    poly([...L, ...R], true)
    ink(i & 1 ? MH : MA, i ? 2.2 : w / 6)
  }
}

/** A short twitch: rises to 1 for a beat once every 1/sp seconds. */
const twitch = (t: number, sp: number, ph: number, sharp: number): number =>
  clamp(1 - abs(((t * sp + ph) % 1) - 0.03) * sharp, 0, 1)

/** One pointed ear: heavy silhouette, flat fill, then a soft inner shell. */
const ear = (x: number, y: number, a: number, s: number, col: string): void => {
  g.save()
  g.translate(x, y)
  g.rotate(a)
  poly([-9 * s, 5 * s, -3 * s, -18 * s, 10 * s, -1 * s], true)
  ink(0, 11)
  ink(col)
  poly([-4.5 * s, 2 * s, -2 * s, -11 * s, 4.5 * s, -1 * s], true)
  ink(col === CO ? BL : SH)
  g.restore()
}

/* ------------------------------ the rig ----------------------------- */

/**
 * Draw a duelist in STAGE coordinates.
 *   ctx    canvas 2d context (stage transform already applied)
 *   x, y   ground position — the HOOVES stand here
 *   side   -1 = Aurora facing right, +1 = the foe facing left
 *   st     pose inputs
 *   t      S.t seconds
 */
export const drawUnicorn = (ctx: G2D, x: number, y: number, side: number, st: PoseState, t: number): void => {
  g = ctx
  T = t

  /* ---- pose scalars: everything below is a smooth blend of these ---- */
  const win = clamp(st.win || 0, 0, 1)
  const lose = clamp(st.lose || 0, 0, 1)
  // A win is a full rear; a collapse cancels both.
  const rear = clamp((st.cast || 0) + win, 0, 1) * (1 - lose)
  const form = clamp(st.form || 0, 0, 1)
  const hit = clamp((st.hurt || 0) * 4, 0, 1)
  const hpv = st.hp ?? 1
  const sag = (1 - clamp(hpv >= 0 ? hpv : 1, 0, 1)) * (1 - rear) // posture drops with HP
  const fold = lose * 30 // limbs curl up under the body when collapsed
  const D = side > 0 ? 1 : 0 // 1 = the foe

  // Every foe is this same rig in her own palette (§9.14: recolour, zero new
  // topology): Umbra's shadow clones wear their chapter's tint, each Guardian
  // her own colours.
  const foe = D ? FOES[st.foe ?? S.foe] : undefined
  // A skin (§9.7) swaps only these colours; D below still decides the rest.
  ;[CO, SH, RM, MA, MH, HO, HF, EY, GL, BL] = (st.skin ?? (foe ? foe.pal : PAL[0])) as [string, string, string, string, string, string, string, string, string, string]
  // PRISM (ch6) is "every colour at once": her mane, horn and aura cycle.
  if (foe && foe.slug === 'prism') {
    const rb = rainbow(t * 0.14)
    const rl = rainbow(t * 0.14 + 0.12, 80)
    ;[MA, MH, GL, HO] = [rb, rl, rb, rl]
  }
  // The Mane Color Palette: the mane, tail and forelock, over the skin's.
  const mn = st.mane
  if (mn === 'rainbow') {
    MA = rainbow(t * 0.12, 70)
    MH = rainbow(t * 0.12 + 0.18, 86)
  } else if (mn) {
    MA = mn[0]
    MH = mn[1]
  }
  // Hit flash: strobe the whole coat white/red while `hurt` runs down.
  const F = hit && sin(t * 46) > 0 ? (sin(t * 23) > 0 ? '#fff' : '#f55') : ''
  if (F) CO = SH = RM = MA = MH = HO = HF = BL = F // the eye stays readable

  const K = 1 + D * 0.07 // the foe is a touch stockier...
  const HK = 1.18 + D * 0.06 // ...with a bigger head on a shorter neck
  const br = sin(t * 2.1 + side) * (1 - rear * 0.7) // breathing
  const by = -76 + br * 1.5 + sag * 8 // barrel centre
  // blink + ear flick: short twitches on slow cycles, out of phase per side
  const ph = side * 0.25 + 0.5
  const bl = twitch(t, 0.21, ph, 40)
  const fk = twitch(t, 0.33, ph, 26) * sin(t * 30) * 0.4
  AM = 0.26 + rear * 0.38 + hit * 0.5 // shared mane/tail wave amplitude

  g.save()
  g.translate(x + hit * 9 * side, y - 6) // recoil away from the caster
  g.scale(-side, 1) // authored facing +x; the foe is the mirror
  g.lineJoin = g.lineCap = 'round'
  g.strokeStyle = OUT

  // Contact shadow — grounds the character instead of letting it float.
  g.globalAlpha = 0.25
  g.fillStyle = OUT
  el(0, 3, 42 + lose * 22, 8)
  g.fill()
  g.globalAlpha = 1

  // collapsed on its side — the whole rig tips over and the neck folds so the
  // head comes to rest on the ground
  if (lose) {
    g.translate(-45 * lose, -16 * lose)
    g.rotate(1.15 * lose)
  }
  g.translate(0, -rear * 4 - win * abs(sin(t * 3.4)) * 5) // victory hop

  // The foe's dread aura: stacked low-alpha ellipses, no shadowBlur needed.
  if (D && S.q && !F) {
    g.globalAlpha = 0.07
    g.fillStyle = GL
    el(-2, by - 6, 54, 52)
    g.fill()
    g.globalAlpha = 1
  }

  /* ---- rearing frame: the body pivots over the planted hind hooves --- */
  const R = -0.58 * rear
  const rc = cos(R)
  const rs = sin(R)
  const hipx = -22 - (by + 22) * rs
  const hipy = -6 + (by + 22) * rc

  // far hind leg — drawn in the standing frame, the hooves stay planted.
  // Far limbs take the shadow tone whole, so they read as behind the body.
  limb(hipx, hipy, -35 + fold, -fold, lose, HIND, SH)

  g.save()
  g.translate(-22, -6)
  g.rotate(R)
  g.translate(22, 6)

  /* ---- forelegs: ground -> tucked (rear) -> flung open (win) -------- */
  const pad = sin(t * 3) * 3 * rear // paddling while reared up
  const rr = rear * rear // eased lift: the hooves stay planted through the wind-up
  // curl: a rear folds the knee right up, a win throws the same leg out again
  const tk = rr * (win ? 0.75 : 1.15) + lose
  const fl = (lx: number, a: number, b: number, s: number, col: string): void =>
    limb(lx, by + 14, lx + a * rear - fold * 0.5, -b * rr - fold + s * pad, tk, FORE, col)
  fl(18, win ? 36 : 15, win ? 30 : 22, -1, SH)

  /* ---- tail: a layered hair mass that hangs and trails --------------- */
  hair(-26, by - 4, 2.4 + 0.4 * rear, 56, 30, 1.7, -0.7, 3)

  /* ---- torso + neck: ONE silhouette, then the shaded fills ----------- */
  const hx = 22 + sag * 3 - lose * 14 // the neck folds as it goes down
  const hy = by - 42 + D * 7 + sag * 9 - rear * 3 + fold
  const nk = [11, by - 6, hx - 4, hy + 14]
  const hooked = st.beforeTorso || st.afterTorso || st.afterMane || st.afterRig
  let anc: RigAnchors | null = null
  if (hooked) {
    const ndx = nk[2]! - nk[0]!
    const ndy = nk[3]! - nk[1]!
    const nl = Math.hypot(ndx, ndy) || 1
    anc = ANC
    anc.neckCollar[0] = nk[0]! + ndx * 0.7
    anc.neckCollar[1] = nk[1]! + ndy * 0.7
    anc.neckDir[0] = ndx / nl
    anc.neckDir[1] = ndy / nl
    anc.backWithers[0] = 8
    anc.backWithers[1] = by - 26
    anc.tailBase[0] = -26
    anc.tailBase[1] = by - 4
    anc.t = t
    anc.lift = max(win, rear)
    anc.lose = lose
    anc.facing = -side
    anc.portrait = !!st.face
    if (st.afterRig) {
      // The same chain drawUnicorn ran above, replayed for the stage points.
      XA = x + hit * 9 * side
      YA = y - 6
      SXA = -side
      LA = lose
      HA = -rear * 4 - win * abs(sin(t * 3.4)) * 5
      RA = R
      // The near foreleg's target, exactly as `fl(25, …)` below aims it.
      toStage(25 + (win ? 37 : 9) * rear - fold * 0.5, -(win ? 36 : 17) * rr - fold + pad + 4, true, anc.hoofFront)
      toStage(-27 + fold, -fold + 4, false, anc.hoofHind)
      toStage(-26, by - 4, true, anc.tailStage)
      toStage(-2 * K, by, true, anc.bodyStage)
      toStage(hx, hy, true, anc.headStage)
    }
    if (st.beforeTorso) {
      g.save()
      st.beforeTorso(g, anc)
      g.restore()
    }
  }
  const NW = [16 * K, 11.5 * K] // thick off the shoulder, slim at the poll
  // resolve TQ: [cx*K, by+cy, rx*K, (ry+breath)*K]
  const TR = TQ.map((v, i) => (i & 1 ? (i & 2 ? (v + br * 0.5) * K : by + v) : v * K))
  const each = (fn: (a: number, b: number, c: number, d: number) => void): void => {
    for (let i = 0; i < 12; i += 4) fn(TR[i]!, TR[i + 1]!, TR[i + 2]!, TR[i + 3]!)
  }
  tube(nk, NW, 13, OUT)
  each((a, b, c, d) => {
    el(a, b, c, d)
    ink(0, 13)
  })
  meat(nk, NW, CO) // its own line merges into the silhouette above
  each(blob)

  /* ---- fluffy chest tuft: a silhouette-defining scallop ------------- */
  for (let i = 3; i--;) {
    el(31 + i * 0.5, by + 15 - i * 6, 7.5 - i * 1.4, 6.5 - i * 1.2)
    ink(CO, 2.4)
  }

  if (anc && st.afterTorso) {
    g.save()
    st.afterTorso(g, anc)
    g.restore()
  }

  // mane down the back of the neck, rooted at the poll, behind the head
  hair(hx - 21, hy - 4, 2.6 - 0.25 * rear, 46, 27, 2.1, -0.5, 3)
  if (anc && st.afterMane) {
    g.save()
    st.afterMane(g, anc)
    g.restore()
  }

  g.save()
  g.translate(hx, hy)
  // The body rears by -0.58, so the head counter-rotates: in world space it
  // still ends up tilted up ~0.3 rad, with the horn aimed up-and-forward.
  g.rotate(0.28 * rear + sag * 0.3 - lose * 0.5 + br * 0.02)
  g.scale(HK, HK)

  ear(-14, -13, -0.7, 0.85, SH) // far ear
  el(20, 10, 12.5, 10.5) // skull + muzzle inked as one mass, then filled
  ink(0, 11)
  el(0, 0, 25, 23)
  ink(0, 11)
  blob(20, 10, 12.5, 10.5)
  blob(0, 0, 25, 23)
  ear(0, -19, -0.2 + fk, 1.15, CO) // near ear — flicks

  el(27, 6, 1.7, 2.3) // nostril
  ink(OUT)
  const fc = st.face
  g.beginPath() // mouth
  if (!fc) {
    g.arc(24, 12, 4.2, 0.3, win ? 2.7 : 1.6)
    ink(0, 2.2)
  } else if (fc.mouth >= 0.9) {
    g.arc(24, 11, 4.9, 0.15, 2.95) // an open grin
    ink('#b04a5a', 2.2)
  } else if (fc.mouth > 0.2) {
    g.arc(24, 12, 4.4, 0.3, 2.4)
    ink(0, 2.2)
  } else if (fc.mouth > -0.1) {
    g.moveTo(21, 13.5) // a firm little line
    g.lineTo(27.5, 13.2)
    ink(0, 2.2)
  } else {
    g.arc(24, 17.5, 4.2, PI + 0.55, -0.55) // a small frown
    ink(0, 2.2)
  }

  g.globalAlpha = 0.4 + (fc ? fc.blush * 0.45 : 0) // soft cheek blush
  el(4, 10, 5.6 + (fc ? fc.blush * 1.5 : 0), 3.2)
  ink(BL)
  g.globalAlpha = 1

  // A portrait's brow: the inner end (toward the muzzle) rises when worried
  // and drops when stern — the one line the combat rig never needed.
  if (fc) {
    g.beginPath()
    g.moveTo(1, -15 + fc.brow * 1.5)
    g.quadraticCurveTo(9, -18 - Math.abs(fc.brow) * 0.5, 18, -15 - fc.brow * 4)
    ink(0, 3.2)
  }

  /* ---- the one big expressive eye ----------------------------------- */
  // the foe (D) is permanently half-lidded
  if (fc && fc.eye < 0.12) {
    // A portrait's closed eye: a happy crescent, or a sleepy line.
    g.beginPath()
    if (fc.mouth > 0) g.arc(9, 3, 7, PI + 0.4, -0.4)
    else g.arc(10, -6, 7, 0.5, PI - 0.5)
    ink(0, 3.4)
  } else if (win || lose) {
    // closed: a happy upward arc on a win, a defeated downward one on a loss
    g.beginPath()
    g.arc(9, win ? 3 : -8, 7, win ? PI + 0.4 : 0.4, win ? -0.4 : PI - 0.4)
    ink(0, 3.4)
  } else {
    if (D && !F) {
      g.globalAlpha = 0.28 // the foe's eye actually glows — a halo, no blur
      el(10, -2, 10, 8)
      ink(EY)
      g.globalAlpha = 1
    }
    el(10, -2, 6.4, 8.8 * (1 - bl) * (1 - D * 0.45) * (fc ? fc.eye : 1) + 0.7)
    ink(EY, 1.8)
    if (!F) {
      el(12.4, -5.2, 3, 3.4) // key glint...
      ink('#fff')
      el(7, 2.6, 1.6, 1.6) // ...and a small bounce catchlight
      g.fill()
    }
    // heavy upper lash — the single biggest "hand-drawn" cue on the face
    g.beginPath()
    g.ellipse(10, -2, 6.6, 9, 0, PI + (D ? 0.1 : 0.5), D ? 0.4 : -0.3)
    ink(0, 4)
  }

  /* ---- horn: spiral, gathering light as `form` rises ---------------- */
  const hc = 15.68 // cos(-1.12) * 36
  const hs = -32.4 // sin(-1.12) * 36
  const tx = 9 + hc
  const ty = -19 + hs
  poly([9 - hs / 6, -19 + hc / 6, 9 + hs / 6, -19 - hc / 6, tx, ty], true)
  ink(0, 9)
  ink(HO)
  for (let i = 1; i < 4; i++) {
    // three ridges across the horn: the spiral read, for 3 lines of code
    const f = i / 4
    const w2 = (1 - f) / 6
    const cx = 9 + hc * f
    const cy = -19 + hs * f
    poly([cx - hs * w2, cy + hc * w2, cx + hs * w2 + hc / 12, cy - hc * w2 + hs / 12])
    ink(0, 1.7)
  }
  // forelock swept back over the brow, in front of the horn base
  hair(1, -21, 0.25, 14, 12, 2.6, 0.8, 1)
  // Head-slot cosmetics (§9.7's `afterHead`): drawn in head space, so they
  // ride every pose and inherit the head's scale for free.
  if (st.afterHead) {
    g.save()
    st.afterHead(g)
    g.restore()
  }

  // ONE deliberate shadow pass for the whole character.
  if (form > 0.01 || rear > 0.4) {
    g.save()
    g.globalAlpha = min(1, form + rear * 0.3)
    g.fillStyle = g.shadowColor = GL
    g.shadowBlur = S.q > 0.6 ? 8 + 34 * form : 0
    el(tx, ty, 4 + 8 * form, 4 + 8 * form)
    g.fill()
    for (let i = 0; i < 3; i++) {
      // sparks spiralling in as the rune finishes forming
      const a2 = t * 2.6 + i * 2.1
      const r2 = 20 - form * 15
      el(tx + cos(a2) * r2, ty + sin(a2) * r2 * 0.7, 1 + 2.4 * form, 1 + 2.4 * form)
      g.fill()
    }
    g.restore() // restore() puts shadowBlur back for us
  }
  g.restore() // head

  // near foreleg, in front of the barrel
  fl(25, win ? 37 : 9, win ? 36 : 17, 1, CO)
  g.restore() // rearing frame

  // near hind leg, in front of the barrel
  limb(hipx + 4, hipy, -27 + fold, -fold, lose, HIND, CO)
  g.restore()

  // §9.7's `afterRig`: the caller's transform is back, the anchors are in it.
  if (anc && st.afterRig) {
    g.save()
    st.afterRig(g, anc)
    g.restore()
  }
}

/** Big portrait (splash / panels). `size` ~= body height. */
export const drawPortrait = (ctx: G2D, x: number, y: number, side: number, size: number, t: number): void => {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(size / HT, size / HT)
  drawUnicorn(ctx, 0, 0, side, { form: 0.3 + 0.3 * sin(t * 1.3) }, t)
  ctx.restore()
}
