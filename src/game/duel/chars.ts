/**
 * chars.ts — AURORA and UMBRA, the two chibi duelists. Ported unchanged from
 * the jam build; the anatomy notes below are the jam build's own.
 *
 * THE PAINTED RIG (2026-09-25). With the art layer on and a character's
 * painted set decoded (`puppet.ts`), every shape below that the rig fills —
 * torso, neck, head and face, horn, forelock, mane, tail, legs, hooves — is a
 * full-colour painting laid on the same bones instead (`PAINT`). The pose,
 * the proportions and every anchor are this file's either way. Without a set
 * (the art layer off, a sheet still loading, every reference sheet under
 * `withoutArt`, the tests) the vector drawing below is the whole character.
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
 *  2. STEPPED CEL SOLIDS (`blob`). Each form is clipped to itself and given a
 *     bounce/rim light, a core shadow, a mid tone and a lit coat, all
 *     hard-edged, offset towards a key light that is up-and-forward. Volume,
 *     no gradients. The mid step (2026-09-20) is what lets the drawn rig sit
 *     inside the painted art's soft-edged shading: same total offset, half
 *     the jump at each edge, so the turn into light stops reading as a band.
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
 *
 * Everything here BRANCHES on `S.q`; nothing multiplies by it, so the sparkle
 * tier (2) draws the authored look and no count is silently doubled. What tier
 * 2 adds — the outer spark ring on a forming rune, the wider dread halo —
 * rides `S.qx`, the eased mix, so it grows in over a second and a half instead
 * of arriving between two frames. Lock counts and cel band counts stay where
 * the art authored them: three bands ARE the look; four are a different
 * drawing, not a better one.
 */
import { FOES, type FoeDef, type FoePalette } from '@/game/duel/foes'
import { drawItem, type ItemSpec } from '@/game/artItem'
import { spriteFor } from '@/game/art'
import { RIG_ART } from '@/game/artIds'
import { STAR_ART } from '@/game/map/kitSky'
import { puppetDress, paintPart, paintHair, paintHeadHair, paintNearEar, paintLeg, paintHoof, hairRest, faceOf, lum, FACE, LEG_PAD, LEG_ALL, LEG_TOP, LEG_REST, type Dress, type Flash, type LegJoint } from '@/game/duel/puppet'
import { framesOn, stepPose, drawFrame, framePart, type FrameDress, type FrameWho } from '@/game/duel/frameRig'
import { lookFor, type Look } from '@/game/duel/puppetBake'
import { S, rainbow } from '@/game/duel/state'
import { TAU, PI, clamp, sin, cos, atan2, hypot, min, max, abs, ease } from '@/game/duel/util'

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
  /**
   * This rig is being drawn onto a CHROMA-KEYED reference sheet, so it gets no
   * ground and no atmosphere: the contact shadow and the foe's dread aura are
   * both left off.
   *
   * Neither is optional decoration on a magenta sheet, it is the pipeline's
   * hardest-won bullet: a shadow or a halo cast ONTO the magenta is a DARKER
   * magenta, which is not the key colour and cannot be cut away, so it ships
   * as a pink smear welded under the character for ever
   * (`art-generation-pipeline`, the MAGENTA contract; `artSheet.ts`'s MAGENTA
   * block says the same thing to the painter).
   */
  onKey?: boolean
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

/**
 * The one hand-inked outline colour.
 *
 * Was the jam build's near-black `#150f1c`. art-style.md §2 has asked for
 * warm deep plum since the style was pinned, and it stopped being a nicety
 * the moment painted scenes shipped: this rig now stands ON a painted meadow
 * inked in plum, and a near-black character on it reads as a sticker pasted
 * onto a painting rather than someone standing in it. The value is close
 * enough that the silhouette is every bit as readable at 64 px (§8.1).
 */
const OUT = '#3A2340'
/** Nominal standing height, hooves -> horn tip, in stage units. */
const HT = 197
/** The same number, for callers that place a rig in a space of their own
 *  (`brand.ts`'s mascot pair) and need one unit to mean "a unicorn tall". */
export const RIG_HEIGHT = HT
/** Torso masses as [cx, cy, rx, ry] quads: haunch, barrel, chest. */
export const TQ = [-23, 6, 18, 21, -2, 0, 29, 27, 19, 3, 14.5, 18]

/** [coat, shadow, rim, mane, streak, horn, hoof, eye, glow, blush] */
const PAL: readonly (readonly string[])[] = [
  // AURORA — cream coat, warm shadow, pearl rim, gold mane w/ pastel locks
  ['#fec', '#eba', '#fff', '#fc3', '#fe9', '#fd6', '#c94', '#423', '#fe9', '#f9a'],
  // UMBRA — matte black coat, violet bounce rim, purple mane w/ neon cyan
  ['#213', '#102', '#74c', '#84d', '#7ff', '#a5f', '#539', '#7ff', '#b7f', '#639']
]

/**
 * Halfway between the core shadow and the lit coat — the extra band that
 * turns `blob`'s hard two-step cel edge into a gentler four-step one, so a
 * drawn character sits inside the painted art's soft-edged shading instead
 * of beside it.
 *
 * DERIVED, not authored: skins, the Mane Color Palette and the nine foe
 * palettes are all 10-entry arrays, and an eleventh slot would be `undefined`
 * for every one of them. Cached by the two tones it is mixed from, so it
 * costs one mix per palette ever in play and nothing per frame — this rig
 * allocates nothing in a draw.
 */
const midCache = new Map<string, string>()
const chan = (c: string): [number, number, number] => {
  const s = c.replace('#', '')
  return s.length === 3
    ? [parseInt(s[0]! + s[0]!, 16), parseInt(s[1]! + s[1]!, 16), parseInt(s[2]! + s[2]!, 16)]
    : [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)]
}
const midTone = (a: string, b: string): string => {
  const k = `${a}|${b}`
  const hit = midCache.get(k)
  if (hit !== undefined) return hit
  let hex = b
  try {
    const p = chan(a)
    const q = chan(b)
    hex = `#${[0, 1, 2].map((i) => (((p[i]! + q[i]!) >> 1) & 255).toString(16).padStart(2, '0')).join('')}`
  } catch { /* a non-hex palette entry: fall back to the lit coat */ }
  midCache.set(k, hex)
  return hex
}

/** Draw context + clock + the active palette, cached so helpers stay terse. */
let g!: G2D
let T = 0
let AM = 0
let CO = ''
let SH = ''
/** The band between SH and CO (`midTone`). */
let MD = ''
let RM = ''
let MA = ''
let MH = ''
let HO = ''
let HF = ''
let EY = ''
let GL = ''
let BL = ''
/** The hit flash's colour while it strobes, '' otherwise (`partArt`). */
let FLASH = ''
/** The painted set this duelist wears (`puppet.ts`), or null: draw vectors. */
let PAINT: Dress | null = null
/** The hit flash for a painted duelist: 0 none, 1 white, 2 red. */
let PF: Flash = 0
/** Drawing the painted poses (`frameRig.ts`): the rig still poses, draws nothing. */
let FRAMES = false
/** The rig's standing frame (before the rear turns it), where a pose is laid. */
let BASE_M: DOMMatrix | null = null
/** The pose painting shown this draw, and where the rig at rest lands on it:
 *  its head, body and near hooves (`frameRig.framePart`), rig units → rig units. */
let FRAME_NOW = 'idle'
let FRAME_DRESS = null as unknown as FrameDress
let HEAD_FM = null as unknown as DOMMatrix
let BODY_FM = null as unknown as DOMMatrix
let FORE_FM = null as unknown as DOMMatrix
let HIND_FM = null as unknown as DOMMatrix
/** Prism's cycling mane and horn, in hue steps (as the puppet bakes them). */
const PRISM_STEPS = 8
interface DressMemo { d: FrameDress | null; foe: FoeDef | undefined; skin: FoePalette | undefined; mane: PoseState['mane'] | null; prism: string; rb: number }
/** The last dress per side, and what it was made from: this runs twice a draw. */
const DRESS_MEMO: DressMemo[] = [0, 1].map(() => ({ d: null, foe: undefined, skin: undefined, mane: null, prism: '', rb: -1 }))
/**
 * What `side` wears as painted poses (`frameRig.ts`) — every duelist now:
 * Aurora in her own colours, or recoloured by a skin or a mane colour; Umbra
 * herself as painted; Umbra's friends in her strip with their own hair
 * (`pal[3]` mane, `pal[4]` streak); a Guardian in whichever strip is nearer
 * her coat's light, in her whole palette (Prism's mane and horn cycling, as the
 * puppet's did). Only a portrait's emote (`st.face`) keeps the painted puppet.
 */
export const frameDressOf = (st: PoseState, side: number, t = 0): FrameDress | null => {
  if (st.face) return null
  const foe = side > 0 ? FOES[st.foe ?? S.foe] : undefined
  if (side > 0 && !foe) return null
  const mane = st.mane ?? null
  const prism = foe?.slug === 'prism' ? rainbow(Math.round(t * 0.14 * PRISM_STEPS) / PRISM_STEPS, 80) : ''
  const rb = mane === 'rainbow' ? Math.round((t * 0.12 % 1) * 8) : -1
  const c = DRESS_MEMO[side > 0 ? 1 : 0]!
  if (c.d && c.foe === foe && c.skin === st.skin && c.mane === mane && c.prism === prism && c.rb === rb) return c.d
  let who: FrameWho
  let look: Look | null
  if (!foe) {
    who = 'aurora'
    look = lookFor('aurora', st.skin ?? null, mane, '', t, true)
  } else if (foe.slug === 'umbra') {
    who = 'umbra'
    look = null
  } else if (foe.model === 'umbra') {
    who = 'umbra'
    look = lookFor('umbra', foe.pal, null, '', t, true, true)
  } else {
    who = lum(foe.pal[0]) > 0.55 ? 'aurora' : 'umbra'
    look = lookFor(who, foe.pal, mane, prism, t, true)
  }
  c.foe = foe
  c.skin = st.skin
  c.mane = mane
  c.prism = prism
  c.rb = rb
  c.d = { who, look, key: `${who}|${look?.key ?? ''}` }
  return c.d
}
const DEG = 180 / Math.PI
/** A painted hair mass's swing about its root, from the rig's own wave. */
const swing = (sp: number): number => AM * sin(T * sp - 1.8) * 0.45
/**
 * The colour the painted HORN is tinted with — `HO`, except on Prism, whose
 * horn cycles the hues every frame (B20, paint-outstanding 2026-09-24). A tint
 * is BAKED per colour (`artItem.tintedStrip`: a fresh canvas, a mask, a
 * multiply), so a new `hsla()` each frame was a fresh bake each frame, churning
 * the whole 64-entry tint cache the props share. The flat coat under the sheet
 * keeps the smooth hue — `partArt` lays `HO` down and takes only LIGHTNESS
 * from the painting — so stepping the painting's tint round the wheel in
 * `HORN_HUES` steps is invisible and costs `HORN_HUES` bakes, once.
 */
let HOT = ''
const HORN_HUES = 24

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
let HA = 0
let SLA = 0
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
  px += SLA // the forward slide of a collapse
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
    // The extra step. Same total offset, half the size of each jump, so the
    // turn from shadow into light reads as a soft edge rather than a band.
    el(x + rx * 0.21, y - ry * 0.20, rx, ry)
    ink(MD)
    el(x + rx * 0.34, y - ry * 0.32, rx, ry)
    ink(CO)
    g.restore()
  } else ink(CO)
}

/** An ellipse ADDED to the current path (no `beginPath`), so several masses
 *  can be traced as one region to clip a painting against. */
const elAdd = (x: number, y: number, rx: number, ry: number): void => {
  g.moveTo(x + max(0.1, rx), y)
  g.ellipse(x, y, max(0.1, rx), max(0.1, ry), 0, 0, TAU)
}

/** `partArt` without a clip, for a part whose sheet IS its own silhouette
 *  (the neck's tube) and which has no closed path to clip against. */
const partArtFree = (spec: ItemSpec, unit: number, col: string, place: () => void): boolean => {
  if (FLASH) return false
  g.save()
  const a0 = g.globalAlpha
  place()
  g.globalAlpha = a0 * COAT_UNDER
  const ok = drawItem(g, spec, unit, 0, col)
  g.globalAlpha = a0
  g.restore()
  return ok
}

/**
 * A PAINTED PART, inside the shape just traced (§9.7, `artIds.RIG_ART`).
 *
 * The path is still current, so we CLIP to it: a painting can then never
 * spill past the silhouette the rig has already inked, and the union outline
 * stays the drawing's — which is the whole reason this rig has no seams.
 * `place` puts the part's own local space under the origin; the sheets are
 * authored in game units, so the blit is at nominal size 1.
 *
 * False when there is nothing to blit — no painting, or the HIT FLASH, which
 * strobes the rig white and red and cannot be a multiply tint. The caller
 * then cel-shades exactly as it always did.
 */
interface PartOpts {
  /** How far the painting is nudged toward the light, leaving a rim crescent. */
  off?: [number, number]
  /** Lay the COAT'S bounce rim under it. Not for a horn or a hoof, whose
   *  colour has nothing to do with the coat's. */
  rim?: boolean
  /** The colour the SHEET is tinted with, when it must differ from the flat
   *  coat laid under it (Prism's horn, `HOT`). */
  tint?: string
}

const partArt = (
  spec: ItemSpec, unit: number, col: string, place?: () => void, o: PartOpts = {}
): boolean => {
  if (FLASH) return false
  // THE BOUNCE RIM STAYS THE RIG'S. A sheet carries ONE tinted region, so a
  // painting can only ever be the coat — and half of what makes Umbra read at
  // a glance is the violet-and-neon bounce along her underside, which is a
  // DIFFERENT hue from her coat. So the rim tone is laid over the whole shape
  // first and the painting goes on top, nudged toward the light by exactly
  // the step `blob` used, leaving that crescent showing.
  if (o.rim) ink(RM)
  g.save()
  g.clip()
  // THE PAINTING SHADES THE COAT; IT DOES NOT REPLACE IT. A tint MULTIPLIES,
  // so every unit of shadow in the sheet is shadow the character can never
  // get back — and `liftTint` clamps, so a coat lighter than the neutral
  // (Aurora's cream is) cannot be lifted back up at all. Laying the flat coat
  // down first and blending the painting over it at `COAT_UNDER` compresses
  // the sheet's range onto the palette's own colour: the form survives, the
  // character keeps its hue, and a pale one stops coming out grey.
  const a0 = g.globalAlpha
  const op = g.globalCompositeOperation
  g.fillStyle = col
  g.fill()
  if (o.off) g.translate(o.off[0], o.off[1])
  // LUMINOSITY, NOT MULTIPLY. A multiply tint cannot make a character lighter
  // than its painting — `liftTint` divides by the neutral and CLAMPS, so
  // Aurora's cream (lighter than the neutral in red and green) came back as a
  // grey-khaki however well the part was painted. Laying the flat coat down
  // and compositing the sheet's LIGHTNESS over it keeps the character's own
  // hue exactly and takes only the form from the painting, which is the whole
  // reason the sheet exists. `COAT_UNDER` then decides how deep the shading
  // goes, because a sheet is still darker overall than a flat coat.
  g.globalCompositeOperation = 'luminosity'
  g.globalAlpha = a0 * COAT_UNDER
  if (place) place()
  const ok = drawItem(g, spec, unit, 0, o.tint ?? col)
  g.globalCompositeOperation = op
  g.globalAlpha = a0
  g.restore()
  return ok
}

/**
 * How much of a rig sheet's own shading survives over the flat coat.
 *
 * MEASURED against the drawing on the rig harness, at 0.45, 0.6 and 0.85: a
 * sheet's mean lightness is about 192 where a flat coat is about 245, so the
 * more of it survives the more a PALE character's barrel drifts tan against
 * her own cream legs. 0.45 is where Aurora stops reading as two colours while
 * the painted form is still there. A dark character (Umbra, every foe) is
 * happy at any value — the ceiling is set by the lightest coat in the cast.
 */
const COAT_UNDER = 0.45

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
 * A lost duel lays the unicorn down FLAT ON ITS BELLY — forelegs stretched out
 * in front, hind legs FOLDED AT THE HOCK the way a resting horse folds them
 * (thigh and gaskin back, cannon tucked forward again under them, hoof under
 * the belly), chin on the forelegs. These are the absolute joint angles each
 * leg comes to REST at [upper, middle, cannon, pastern], near leg then far;
 * the far pair is bent a little differently so the two do not print as one
 * thick limb. Every centreline sits a leg's own half-width above the ground,
 * so the legs lie ON the island rather than sunk into it.
 *
 * The fold is not only anatomy: the ISLAND is 600 wide (`arena.ts`'s rim) with
 * the duelists 480 apart, so a hind leg stretched straight out behind hangs
 * its hoof over the edge into open sky. Folded, plus `LIE_SLIDE`, the whole
 * lying silhouette stays on the grass.
 */
const FORE_LIE = [0.45, -0.25, 0.3, 1.1]
const FORE_LIE_FAR = [0.55, -0.3, 0.25, 1.1]
const HIND_LIE = [2.8, 3, -0.3, 1.4]
const HIND_LIE_FAR = [2.68, 2.92, -0.45, 1.5]
/** The lying barrel's centre, and how far forward the head comes to rest. */
const LIE_BY = -26
const LIE_HX = 62
/** A fall carries forward: the body ends this far ahead of where it stood. */
const LIE_SLIDE = 30

/**
 * THE RIG'S PROPORTIONS, as one table: every length, place and bone the pose
 * code below reads. `JAM` is the vector rig, unchanged. `CHIBI` is what the
 * PAINTED duelists stand on (owner, 2026-09-25: "somewhat like" the intro's
 * last page — a big fluffy-maned head, a small round body, short stubby legs
 * — "but it should still allow for the forelegs rising up animation on spell
 * release that the drawn unicorn was doing"). Same skeleton, same poses, same
 * anchors and hooks; only the numbers change, so a rear still folds the knees
 * up, a win still flings them out and a fall still lays her down.
 */
interface RigGeo {
  /** Barrel centre standing; lying; how far a fall slides; the contact shadow. */
  by0: number
  lieBy: number
  lieSlide: number
  shadow: number
  /** Torso masses [cx, cy, rx, ry] ×3 about the barrel; the neck's two half-widths. */
  tq: readonly number[]
  nw: readonly [number, number]
  /** The foe's stockier scale, the head scale, and the foe's bigger head. */
  kFoe: number
  hk: number
  hkFoe: number
  /** How far a rear tips the body back. */
  rear: number
  /** Legs: bones, lying sets, the hip (x, and y below the barrel), the
   *  shoulder's y below the barrel, the soles' x, and each foreleg's
   *  [x, rise-forward on a cast, on a win, lift on a cast, on a win]. */
  fore: readonly number[]
  hind: readonly number[]
  foreLie: readonly number[]
  foreLieFar: readonly number[]
  hindLie: readonly number[]
  hindLieFar: readonly number[]
  hipX: number
  hipDY: number
  shoulderDY: number
  hindFarX: number
  hindNearX: number
  /** The far hind leg's hip, this far forward of the near one's (default 0). */
  hipFarDX?: number
  foreFar: readonly [number, number, number, number, number]
  foreNear: readonly [number, number, number, number, number]
  /** The hoof: how much wider its sole is than its coronet, and its depth. */
  hoofFlare: number
  hoofLen: number
  /** How far a win curls the forelegs (a cast curls them 1.15). */
  winCurl: number
  /** The head's centre: x, y below/above the barrel, the foe's drop; lying. */
  headX: number
  headDY: number
  headFoeDY: number
  /** A standing tilt of the head (rad, + turns the horn forward). */
  headTilt?: number
  lieHx: number
  lieHeadY: number
  /** The neck [chest x, chest dy from the barrel, dx from the head, dy from the head]. */
  nk: readonly [number, number, number, number]
  /** The tail's root [x, dy from the barrel]; the withers [x, dy]. */
  tail: readonly [number, number]
  withers: readonly [number, number]
}
const JAM: RigGeo = {
  by0: -76, lieBy: LIE_BY, lieSlide: LIE_SLIDE, shadow: 42,
  tq: TQ, nw: [16, 11.5], kFoe: 0.07, hk: 1.18, hkFoe: 0.06, rear: 0.58,
  fore: FORE, hind: HIND, foreLie: FORE_LIE, foreLieFar: FORE_LIE_FAR, hindLie: HIND_LIE, hindLieFar: HIND_LIE_FAR,
  hipX: -22, hipDY: 16, shoulderDY: 14, hindFarX: -35, hindNearX: -27,
  foreFar: [18, 15, 36, 22, 30], foreNear: [25, 9, 37, 17, 36],
  hoofFlare: 1.7, hoofLen: 6, winCurl: 0.75,
  headX: 22, headDY: -42, headFoeDY: 7, lieHx: LIE_HX, lieHeadY: -8,
  nk: [11, -6, -4, 14], tail: [-26, -4], withers: [8, -26]
}
/** The chibi's torso masses — also its painted body's reference (`puppet.ts`). */
export const CHIBI_TQ = [-20, 3, 24, 27, 0, 1, 38, 30, 22, -3, 23, 27]
/**
 * The chibi: the barrel low on short, chubby, nearly straight legs whose knee
 * still folds (the curl row), a head half as big again, a short thick neck
 * under it, a small round body. Measured off the intro's last page and the
 * mascot's side view.
 */
const CHIBI: RigGeo = {
  by0: -58, lieBy: -28, lieSlide: 20, shadow: 46,
  tq: CHIBI_TQ, nw: [19, 15],
  kFoe: 0.05, hk: 1.55, hkFoe: 0.05, rear: 0.42,
  //      angles                 lengths          curl                   half-widths
  fore: [1.57, 1.57, 1.57, 1.45, 15, 14, 9, 4, -1.3, 0.45, 0.2, 0.1, 10.5, 10, 9, 8.6, 8.6],
  hind: [1.5, 1.66, 1.57, 1.5, 16, 14, 9, 4, 0, 0, 0, 0, 12, 11, 9.5, 9, 9],
  foreLie: [0.55, 0.25, 0.1, 0.3], foreLieFar: [0.65, 0.32, 0.15, 0.35],
  hindLie: [2.62, 2.85, 3, 3], hindLieFar: [2.55, 2.8, 2.95, 2.95],
  hipX: -20, hipDY: 14, shoulderDY: 12, hindFarX: -30, hindNearX: -21,
  // [x, cast reach, win reach, cast lift, win lift]: a win is a little
  // two-paw prance (owner: "soften the win pose legs"), not legs flung out
  foreFar: [14, 12, 16, 18, 19], foreNear: [24, 8, 17, 14, 22],
  hoofFlare: 1.06, hoofLen: 7, winCurl: 1.05,
  headX: 40, headDY: -58, headFoeDY: 4, lieHx: 56, lieHeadY: -6,
  nk: [18, -10, -10, 22], tail: [-38, -6], withers: [4, -28]
}
/**
 * THE MASCOT (owner, 2026-09-26): the painted poses' proportions, measured
 * off the mascot painting itself (2.36 painting px per unit) so
 * that every bone lies along the limb it moves. The chibi's, but the far legs
 * stand FORWARD of the near ones as the painter placed them, the legs as long
 * as painted, the barrel, head and tail root where the painting has them.
 */
const MASCOT: RigGeo = {
  ...CHIBI,
  by0: -47.5, lieBy: -26,
  fore: [1.57, 1.57, 1.57, 1.45, 14, 13, 8.5, 3.5, -1.3, 0.45, 0.2, 0.1, 10.5, 10, 9, 8.6, 8.6],
  hind: [1.5, 1.66, 1.57, 1.5, 13, 11, 7.5, 3.3, 0, 0, 0, 0, 12, 11, 9.5, 9, 9],
  hipX: -38.7, hipDY: 12.7, shoulderDY: 8.5, hindFarX: -20.3, hindNearX: -34.7, hipFarDX: 18.4,
  foreFar: [32.2, 12, 16, 18, 19], foreNear: [16.9, 8, 17, 14, 22],
  // the head fitted to the mascot's own face (near eye, horn tip, nostril and
  // chin in its painting), so anything worn on the head sits on hers
  headX: 29, headDY: -58.3, hk: 1.39, headTilt: 0.155,
  tail: [-33, -22]
}
/** The proportions of the rig being drawn (`drawUnicorn` sets it). */
let GEO: RigGeo = JAM
/** Test seam: draw every rig in the chibi proportions, painted or not. */
let FORCE_CHIBI = false
export const __chibiRig = (on: boolean): void => { FORCE_CHIBI = on }
/** Test seam: hair that does not sway (a rest pose to diff against its painting). */
let HAIR_STILL = false
export const __hairStill = (on: boolean): void => { HAIR_STILL = on }

/** One joint's absolute angle: the standing rig's, curled by `c`, blended `k` of the way to the lying set. */
const joint = (P: readonly number[], c: number, L: readonly number[] | undefined, k: number, i: number): number => {
  const a = P[i]! + c * P[i + 8]!
  return L ? a + (L[i]! - a) * k : a
}

/**
 * Where a leg's hoof actually goes: the asked-for target while standing, and
 * the end of the UNAIMED chain once lying — a leg on the ground rests at the
 * angles it was given instead of being swung onto a point. `out` may alias
 * nothing the caller still needs.
 */
const legEnd = (hx: number, hy: number, fx: number, fy: number, c: number, P: readonly number[], L: readonly number[] | undefined, k: number, out: [number, number]): void => {
  let x = 0
  let y = 0
  for (let i = 0; i < 4; i++) {
    const a = joint(P, c, L, k, i)
    x += cos(a) * P[i + 4]!
    y += sin(a) * P[i + 4]!
  }
  out[0] = fx + (hx + x - fx) * k
  out[1] = fy + (hy + y - fy) * k
}
const TGT: [number, number] = [0, 0]

/**
 * ONE leg, built by FORWARD KINEMATICS from the joint angles above rather than
 * by an IK solve, because the joints bend in FIXED, OPPOSITE directions — a
 * solver would happily flip them. `c` curls the whole chain. The finished chain
 * is then aimed RIGIDLY so the hoof lands on (fx,fy): relative joint angles are
 * untouched, so the anatomy holds and the hind hooves stay nailed down while
 * the body rears back over them.
 *
 * `L` / `k`: the lying pose above, and how far into it (`legEnd`).
 */
/**
 * The painted body's three masses (`TR`), for a NEAR leg to join as one
 * silhouette (`paintLeg`), and the turn between the leg's frame and the
 * body's: the near hind leg stands in the standing frame, the body rears.
 * Null while the far legs are drawn — the body covers their tops itself.
 */
let BODY: readonly number[] | null = null
let BODY_R = 0
/** Which part of a joined near leg `limb` lays (`puppet.LEG_TOP`/`LEG_REST`). */
let LEG_PASS = LEG_ALL
/** The painted body's own frame, as `drawUnicorn` laid it. */
let BODY_M: DOMMatrix | null = null
/** How far inside the body's outline a joined leg's paint may reach, in the
 *  body's units: over its line, no further. */
const JOIN = 2.5
/** The body's painting, laid back over a near leg's top (`paintLeg`). */
const underBody = (g: G2D): void => {
  g.setTransform(BODY_M!)
  const tq = GEO.tq
  g.beginPath()
  for (let i = 0; i < 12; i += 4) {
    g.moveTo(tq[i]! + tq[i + 2]! - JOIN, tq[i + 1]!)
    g.ellipse(tq[i]!, tq[i + 1]!, tq[i + 2]! - JOIN, tq[i + 3]! - JOIN, 0, 0, TAU)
  }
  g.clip()
  paintPart(g, PAINT!, 'torso', 0, false, PF)
}
/** The body a near leg (at `hx, hy`, turned `rt`) joins. */
const jointOf = (hx: number, hy: number, rt: number): LegJoint => {
  const body = BODY!
  const lc = cos(rt)
  const ls = sin(rt)
  const bc = cos(-BODY_R)
  const bs = sin(-BODY_R)
  const inBody = (x: number, y: number): boolean => {
    let X = hx + x * lc - y * ls
    let Y = hy + x * ls + y * lc
    if (BODY_R) {
      const ux = X + 22
      const uy = Y + 6
      X = bc * ux - bs * uy - 22
      Y = bs * ux + bc * uy - 6
    }
    for (let i = 0; i < 12; i += 4) {
      const dx = (X - body[i]!) / body[i + 2]!
      const dy = (Y - body[i + 1]!) / body[i + 3]!
      if (dx * dx + dy * dy < 1) return true
    }
    return false
  }
  return { inBody, under: underBody }
}
const limb = (hx: number, hy: number, fx: number, fy: number, c: number, P: readonly number[], col: string, L?: readonly number[], k = 0, far = false): void => {
  let Q = [0, 0]
  let x = 0
  let y = 0
  for (let i = 0; i < 4; i++) {
    const a = joint(P, c, L, k, i)
    Q.push((x += cos(a) * P[i + 4]!), (y += sin(a) * P[i + 4]!))
  }
  legEnd(hx, hy, fx, fy, c, P, L, k, TGT)
  fx = TGT[0]
  fy = TGT[1]
  // stretch the CHAIN, not the context: ink weights stay in stage units
  const s = clamp(hypot(fx - hx, fy - hy) / (hypot(x, y) || 1), 0.6, 1.3)
  Q = Q.map((v) => v * s)
  const rt = atan2(fy - hy, fx - hx) - atan2(y, x)
  g.save()
  g.translate(hx, hy)
  g.rotate(rt)
  if (FRAMES) {
    // the painted pose paints its own legs
    g.restore()
    return
  }
  // GROUND LEVEL inside the rotated frame runs along (cos rt, -sin rt); the
  // hoof is the one part that answers to the floor rather than the bone.
  const rc = cos(rt)
  const rs = sin(rt)
  const pa = joint(P, c, L, k, 3) // pastern direction: aims the feather and the hoof
  const px = cos(pa)
  const py = sin(pa)
  const w = P[16]! // the tip half-width: one number sizes the whole foot
  // The hoof: a WALL that leans with the pastern onto a SOLE that lies FLAT ON
  // THE GROUND — the coronet rides up the bone while both rims run along the
  // floor, which is also what makes the wall slope forward to the toe. A leg
  // lying on the ground has no floor under its hoof, so the sole turns with
  // the bone instead: (dx, dy) is "toward the sole", (dy, -dx) along the rims.
  let dx = rs + (px - rs) * k
  let dy = rc + (py - rc) * k
  const dl = hypot(dx, dy) || 1
  dx /= dl
  dy /= dl
  const ax = Q[8]! - px * 2
  const ay = Q[9]! - py * 2
  if (PAINT) {
    // The painted leg, bent along this very chain, and its painted hoof on
    // the same coronet and sole the drawn one uses — as wide as the leg's
    // outline, a gold cuff like the intro's, over the leg's flat end.
    const wp = w + LEG_PAD
    const v = wp * GEO.hoofFlare
    const bx = Q[8]! + dx * GEO.hoofLen
    const cy = Q[9]! + dy * GEO.hoofLen
    const joint = far || !BODY ? undefined : jointOf(hx, hy, rt)
    paintLeg(g, PAINT, Q, P.slice(12), far, PF, OUT, joint, joint ? LEG_PASS : LEG_ALL)
    if (joint && LEG_PASS === LEG_TOP) {
      g.restore()
      return
    }
    paintHoof(g, PAINT, [ax - dy * wp, ay + dx * wp, ax + dy * wp, ay - dx * wp, bx + dy * v, cy - dx * v, bx - dy * v, cy + dx * v], dx, dy, wp, far, PF, OUT)
    g.restore()
    return
  }
  el(Q[6]!, Q[7]!, w * 0.95, 8, pa) // feathered fetlock, buried under the cannon
  ink(0, 7)
  ink(col)
  meat(Q, P.slice(12), col) // the entire leg as ONE tapered run, no seams
  const bx = Q[8]! + dx * GEO.hoofLen
  const cy = Q[9]! + dy * GEO.hoofLen
  const v = w * GEO.hoofFlare
  poly([ax - dy * w, ay + dx * w, ax + dy * w, ay - dx * w, bx + dy * v, cy - dx * v, bx - dy * v, cy + dx * v], true)
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

/** The fluffy chest tuft: a silhouette-defining scallop, three overlapping
 *  inked ellipses at the front of the chest, `by` the barrel's centre. */
const chestTuft = (by: number): void => {
  for (let i = 3; i--;) {
    el(31 + i * 0.5, by + 15 - i * 6, 7.5 - i * 1.4, 6.5 - i * 1.2)
    ink(CO, 2.4)
  }
}

/** A short twitch: rises to 1 for a beat once every 1/sp seconds. */
const twitch = (t: number, sp: number, ph: number, sharp: number): number =>
  clamp(1 - abs(((t * sp + ph) % 1) - 0.03) * sharp, 0, 1)

/** One pointed ear: heavy silhouette, then the painting (or a flat fill and
 *  a soft inner shell) inside it. The FAR ear takes the same sheet in the
 *  shadow tone — one painting, both ears, every character. */
const ear = (x: number, y: number, a: number, s: number, col: string): void => {
  g.save()
  g.translate(x, y)
  g.rotate(a)
  g.scale(s, s)
  poly([-9, 5, -3, -18, 10, -1], true)
  ink(0, 11 / s)
  if (!partArt(EAR_ART, EAR_UNIT, col, undefined, { off: [0.8, -1.4], rim: true })) {
    ink(col)
    poly([-4.5, 2, -2, -11, 4.5, -1], true)
    ink(col === CO ? BL : SH)
  }
  g.restore()
}

/* --------------------------- the painted parts ---------------------- */

/**
 * THE PART SHEETS (§9.7, `artIds.RIG_ART`): each one is the rig's own drawing
 * of a part, in that part's own local units and in ONE neutral tone, so the
 * bench renders the reference from the very code the game draws with and
 * `artTint` multiplies each character's palette through it.
 *
 * They carry NO OUTLINE. The rig inks a whole group as one continuous
 * silhouette and then fills the parts inside it — that is what makes it read
 * as drawn rather than assembled — so a part that brought its own line would
 * put one everywhere two masses meet. `partArt` clips each blit to the path
 * the rig has just traced, which is also the path it has just inked.
 *
 * The scale is the caller's: `draw` scales the context by `s` and lays the
 * shape down in game units, so `measureBox` reports the box in game units and
 * a blit at nominal size 1 lands exactly where the drawing was.
 */
const rigSpec = (part: keyof typeof RIG_ART, unit: number, shape: () => void): ItemSpec => ({
  ...RIG_ART[part],
  frames: 1,
  tinted: true,
  // `unit` is the part's own extent in rig units, so `s` means "this part,
  // that big" — `artBox` measures on a 640 px canvas at 120 px per unit of
  // `s`, and a shape laid down at its raw rig size would run clean off it.
  draw: (ctx, s, _f, accent) => {
    const g0 = g
    const tones = [CO, SH, RM, MD]
    const q = S.q
    const qx = S.qx
    g = ctx
    // The reference is painted in the accent the mask is derived from, in the
    // same four-step relationship the rig shades with — and always at full
    // quality, whatever the device the bench happens to be running on. Pinned
    // to tier 1 exactly, never 2: a sheet is what the painter paints over, so
    // it must be the same drawing on every machine that bakes it.
    S.q = 1
    S.qx = 0
    CO = accent.base
    SH = accent.shade
    RM = accent.lite
    MD = midTone(SH, CO)
    g.save()
    // The rig sets these once for the whole character; a sheet is drawn into
    // a fresh context, where a butt cap would square off every rounded end.
    g.lineJoin = g.lineCap = 'round'
    g.strokeStyle = OUT
    g.scale(s / unit, s / unit)
    shape()
    g.restore()
    ;[CO, SH, RM, MD] = tones as [string, string, string, string]
    S.q = q
    S.qx = qx
    g = g0
  }
})

/** The three torso masses, at K = 1 and mid-breath, about the barrel's centre. */
const barrelShape = (): void => {
  for (let i = 0; i < 12; i += 4) blob(TQ[i]!, TQ[i + 1]!, TQ[i + 2]!, TQ[i + 3]!)
}
/** The barrel's own width in rig units. */
const BARREL_UNIT = 76
export const BARREL_ART: ItemSpec = rigSpec('barrel', BARREL_UNIT, barrelShape)

/** The neck's nominal run: thick off the shoulder, slim at the poll. */
const NECK_LEN = 46
/** `meat` minus its ink pass: this family carries no line at all. */
const coatTube = (p: readonly number[], hw: readonly number[]): void => {
  tube(p, hw, 0, RM)
  tube(p, hw, -3, CO)
  tube(p.map((v, i) => v + hw[i >> 1]! * (i & 1 ? 0.2 : -0.18)), hw, 0, SH, 0.4)
}
const neckShape = (): void => coatTube([0, 0, NECK_LEN, 0], [16, 11.5])
const NECK_UNIT = 78
export const NECK_ART: ItemSpec = rigSpec('neck', NECK_UNIT, neckShape)

/** Skull and muzzle as one mass — the face is drawn on top of it. */
const headShape = (): void => {
  blob(20, 10, 12.5, 10.5)
  blob(0, 0, 25, 23)
}
const HEAD_UNIT = 58
export const HEAD_ART: ItemSpec = rigSpec('head', HEAD_UNIT, headShape)

/** One ear at s = 1, its own space, with the soft inner shell. */
const earShape = (): void => {
  poly([-9, 5, -3, -18, 10, -1], true)
  ink(CO)
  poly([-4.5, 2, -2, -11, 4.5, -1], true)
  ink(SH)
}
const EAR_UNIT = 24
export const EAR_ART: ItemSpec = rigSpec('ear', EAR_UNIT, earShape)

/** The horn, in head space, with its three spiral ridges. */
const hornShape = (): void => {
  const hc = 15.68
  const hs = -32.4
  const tx = 9 + hc
  const ty = -19 + hs
  poly([9 - hs / 6, -19 + hc / 6, 9 + hs / 6, -19 - hc / 6, tx, ty], true)
  ink(CO)
  for (let i = 1; i < 4; i++) {
    const f = i / 4
    const w2 = (1 - f) / 6
    const cx = 9 + hc * f
    const cy = -19 + hs * f
    poly([cx - hs * w2, cy + hc * w2, cx + hs * w2 + hc / 12, cy - hc * w2 + hs / 12])
    // A TURN of the spiral, not a drawn line: the sheet has no ink on it, so
    // the ridges are laid in the shade tone the rest of the part is lit with.
    ink(0, 0)
    g.strokeStyle = SH
    g.lineWidth = 1.7
    g.stroke()
    g.strokeStyle = OUT
  }
}
const HORN_UNIT = 38
export const HORN_ART: ItemSpec = rigSpec('horn', HORN_UNIT, hornShape)



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
  // THE PAINTED POSES (`frameRig.ts`): the painting shows the pose, so the
  // rig keeps its REST geometry — every anchor then lies where it lies on the
  // mascot, and each frame's part matrices carry it onto that painting.
  FRAMES = framesOn(frameDressOf(st, side, t))
  const winR = clamp(st.win || 0, 0, 1)
  const loseR = clamp(st.lose || 0, 0, 1)
  // A win is a full rear; a collapse cancels both.
  const rearR = clamp((st.cast || 0) + winR, 0, 1) * (1 - loseR)
  const win = FRAMES ? 0 : winR
  const lose = FRAMES ? 0 : loseR
  const rear = FRAMES ? 0 : rearR
  // A lost duel lays the unicorn down (`FORE_LIE`): the legs slide out from
  // under it, the body DROPS — accelerating, the way a faint does — lands on
  // its belly and gives one small bounce, and the head comes down a beat
  // behind and stays down. Nothing tips over; the rig stays upright.
  const lie = ease(min(1, lose * 1.8))
  const drop = lose < 0.55 ? (lose / 0.55) ** 2 : 1 - 0.07 * sin((PI * (lose - 0.55)) / 0.45)
  const nod = ease(clamp((lose - 0.3) / 0.7, 0, 1))
  const form = clamp(st.form || 0, 0, 1)
  const hit = clamp((st.hurt || 0) * 4, 0, 1)
  const hpv = st.hp ?? 1
  const sag = FRAMES ? 0 : (1 - clamp(hpv >= 0 ? hpv : 1, 0, 1)) * (1 - rear) * (1 - drop) // posture drops with HP
  const D = side > 0 ? 1 : 0 // 1 = the foe

  // Every foe is this same rig in her own palette (§9.14: recolour, zero new
  // topology): Umbra's shadow clones wear their chapter's tint, each Guardian
  // her own colours.
  const foe = D ? FOES[st.foe ?? S.foe] : undefined
  // A skin (§9.7) swaps only these colours; D below still decides the rest.
  ;[CO, SH, RM, MA, MH, HO, HF, EY, GL, BL] = (st.skin ?? (foe ? foe.pal : PAL[0])) as [string, string, string, string, string, string, string, string, string, string]
  // PRISM (ch6) is "every colour at once": her mane, horn and aura cycle.
  HOT = HO
  if (foe && foe.slug === 'prism') {
    const rb = rainbow(t * 0.14)
    const rl = rainbow(t * 0.14 + 0.12, 80)
    ;[MA, MH, GL, HO] = [rb, rl, rb, rl]
    HOT = rainbow(Math.round((t * 0.14 + 0.12) * HORN_HUES) / HORN_HUES, 80)
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
  FLASH = F
  MD = midTone(SH, CO)
  // The painted set she wears, if all of it has decoded (`puppet.ts`).
  // THE PAINTED POSES (`frameRig.ts`, owner 2026-09-26): Aurora is a whole
  // painting per duel state — the mascot's Aurora, posed by Gemini — so nothing
  // is cut or stretched. The rig still computes the pose (and every anchor
  // anything worn reads) on the mascot's proportions, and draws nothing of
  // its own.
  // Her own colours only, and not in a portrait's emote: a skin, a mane
  // palette or a face keeps the painted puppet.
  PAINT = FRAMES ? null : puppetDress(st, side, S.foe, t)
  PF = F ? (F === '#fff' ? 1 : 2) : 0
  // The painted pieces stand on the chibi's proportions (`CHIBI`), the
  // painted poses on the mascot's (`MASCOT`).
  const G0 = FRAMES ? MASCOT : PAINT || FORCE_CHIBI ? CHIBI : JAM
  GEO = G0

  // (a painted foe's proportions are her painting's: no foe adjustments)
  const DG = FRAMES ? 0 : D
  const K = 1 + DG * G0.kFoe // the foe is a touch stockier...
  const HK = G0.hk + DG * G0.hkFoe // ...with a bigger head on a shorter neck
  const br = sin(t * 2.1 + side) * (1 - rear * 0.7) // breathing
  // (a painted pose breathes as one — below — not by lifting the barrel off
  // planted legs: that drift kinked every outline where a leg meets the belly)
  const by0 = G0.by0 + (FRAMES ? 0 : br * 1.5) + sag * 8
  const by = by0 + (G0.lieBy + br - by0) * drop // barrel centre
  // blink + ear flick: short twitches on slow cycles, out of phase per side
  const ph = side * 0.25 + 0.5
  const bl = twitch(t, 0.21, ph, 40)
  const fk = twitch(t, 0.33, ph, 26) * sin(t * 30) * 0.4
  AM = (0.26 + rear * 0.38 + hit * 0.5) * (1 - lie * 0.6) // shared mane/tail wave amplitude; hair on the ground lies still
  if (HAIR_STILL) AM = 0

  g.save()
  g.translate(x + hit * 9 * side, y - 6) // recoil away from the caster
  g.scale(-side, 1) // authored facing +x; the foe is the mirror
  g.translate(G0.lieSlide * drop, 0) // a collapse carries forward, shadow and all
  g.lineJoin = g.lineCap = 'round'
  g.strokeStyle = OUT

  // Contact shadow — grounds the character instead of letting it float. Off
  // on a keyed sheet, where it cannot be cut away again (`onKey`).
  if (!st.onKey) {
    g.globalAlpha = 0.25
    g.fillStyle = OUT
    const lieS = FRAMES ? ease(min(1, loseR * 1.8)) : lie
    el(0, 3, G0.shadow + lieS * 44, 8 + (FRAMES ? lieS : drop) * 2)
    g.fill()
    g.globalAlpha = 1
  }

  // victory hop (a painted pose already rears: no lift under planted hooves)
  g.translate(0, -rear * 4 - winR * abs(sin(t * 3.4)) * 5)
  // The painted duelist breathes as ONE painting: a slight swell about the
  // ground line, hooves planted, body and legs together.
  if (FRAMES) g.scale(1, 1 + br * 0.012)
  BASE_M = FRAMES ? g.getTransform() : null
  if (FRAMES) {
    FRAME_DRESS = frameDressOf(st, side, t)!
    const fw = FRAME_DRESS.who
    FRAME_NOW = stepPose(fw, side, { rear: rearR, win: winR, lose: loseR, hit, blink: bl, hp: hpv }, t)
    HEAD_FM = framePart(fw, FRAME_NOW, 'head')
    BODY_FM = framePart(fw, FRAME_NOW, 'body')
    FORE_FM = framePart(fw, FRAME_NOW, 'fore')
    HIND_FM = framePart(fw, FRAME_NOW, 'hind')
  }

  // The foe's dread aura: stacked low-alpha ellipses, no shadowBlur needed.
  if (D && S.q && !F && !st.onKey) {
    g.fillStyle = GL
    // Sparkle tier: one more, wider ring of the same stack, so the dread
    // reaches further out into the dark instead of stopping at the body.
    if (S.qx > 0.01) {
      g.globalAlpha = 0.045 * S.qx
      el(-2, by - 4, 78, 72)
      g.fill()
    }
    g.globalAlpha = 0.07
    el(-2, by - 6, 54, 52)
    g.fill()
    g.globalAlpha = 1
  }

  /* ---- rearing frame: the body pivots over the planted hind hooves --- */
  const R = -G0.rear * rear
  const rc = cos(R)
  const rs = sin(R)
  // The hip, carried round the rear's pivot at (-22, -6).
  const hux = G0.hipX + 22
  const huy = by + G0.hipDY + 6
  const hipx = rc * hux - rs * huy - 22
  const hipy = rs * hux + rc * huy - 6

  // far hind leg — drawn in the standing frame, the hooves stay planted.
  // Far limbs take the shadow tone whole, so they read as behind the body.
  limb(hipx + (G0.hipFarDX ?? 0), hipy, G0.hindFarX, 0, 0, G0.hind, SH, G0.hindLieFar, lie, true)

  g.save()
  g.translate(-22, -6)
  g.rotate(R)
  g.translate(22, 6)

  /* ---- forelegs: ground -> tucked (rear) -> flung open (win) -------- */
  const pad = sin(t * 3) * 3 * rear // paddling while reared up
  const rr = rear * rear // eased lift: the hooves stay planted through the wind-up
  // curl: a rear folds the knee right up, a win throws the same leg out again
  const tk = rr * (win ? G0.winCurl : 1.15)
  const fl = (lx: number, a: number, b: number, s: number, col: string, L: readonly number[]): void =>
    limb(lx, by + G0.shoulderDY, lx + a * rear, -b * rr + s * pad, tk, G0.fore, col, L, lie, L === G0.foreLieFar)
  const ff = G0.foreFar
  fl(ff[0], win ? ff[2] : ff[1], win ? ff[4] : ff[3], -1, SH, G0.foreLieFar)

  // the head's frame (the tail's section needs it for the skinned rig)
  const hx0 = G0.headX + sag * 3
  const hy0 = by + G0.headDY + DG * G0.headFoeDY + sag * 9 - rear * 3
  const hx = hx0 + (G0.lieHx - hx0) * nod
  const hy = hy0 + (G0.lieHeadY - 23 * HK - hy0) * nod
  const nk = [G0.nk[0], by + G0.nk[1], hx + G0.nk[2], hy + G0.nk[3]]
  const hrot = 0.28 * rear + sag * 0.3 + nod * 0.12 + br * 0.02 + (G0.headTilt ?? 0)

  /* ---- tail: a layered hair mass that hangs and trails --------------- */
  const ta = 2.4 + 0.4 * rear + 0.3 * lie
  // A painted hair piece swings as one rigid mass, so it takes a fraction of
  // the drawn locks' wave (owner: "the hair is swinging too much").
  // (a painted pose paints its own tail)
  if (PAINT) paintHair(g, PAINT, 'tail', G0.tail[0], by + G0.tail[1], ta - hairRest('tail') + swing(1.7) * 0.55, PF)
  else if (!FRAMES) hair(G0.tail[0], by + G0.tail[1], ta, 56, 30, 1.7, -0.7, 3)

  /* ---- torso + neck: ONE silhouette, then the shaded fills ----------- */
  // Lying, the neck stretches forward and the head settles with its chin on
  // the forelegs — the skull's underside (23 below its centre) just above
  // them, so the near leg crosses the jaw and never the face.
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
    anc.backWithers[0] = G0.withers[0]
    anc.backWithers[1] = by + G0.withers[1]
    anc.tailBase[0] = G0.tail[0]
    anc.tailBase[1] = by + G0.tail[1]
    anc.t = t
    anc.lift = max(winR, rearR)
    anc.lose = loseR
    anc.facing = -side
    anc.portrait = !!st.face
    if (st.afterRig) {
      // The same chain drawUnicorn ran above, replayed for the stage points.
      XA = x + hit * 9 * side
      YA = y - 6
      SXA = -side
      HA = -rear * 4 - winR * abs(sin(t * 3.4)) * 5
      SLA = G0.lieSlide * drop
      RA = R
      // The near legs' hooves, exactly as `fl(25, …)` and the near hind
      // `limb` below place them; the sole sits ~4 under the chain's end.
      const fn = G0.foreNear
      legEnd(fn[0], by + G0.shoulderDY, fn[0] + (win ? fn[2] : fn[1]) * rear, -(win ? fn[4] : fn[3]) * rr + pad, tk, G0.fore, G0.foreLie, lie, anc.hoofFront)
      toStage(anc.hoofFront[0], anc.hoofFront[1] + 4, true, anc.hoofFront)
      legEnd(hipx + 4, hipy, G0.hindNearX, 0, 0, G0.hind, G0.hindLie, lie, anc.hoofHind)
      toStage(anc.hoofHind[0], anc.hoofHind[1] + 4, false, anc.hoofHind)
      toStage(G0.tail[0], by + G0.tail[1], true, anc.tailStage)
      toStage(-2 * K, by, true, anc.bodyStage)
      toStage(hx, hy, true, anc.headStage)
      if (FRAMES) {
        // the same points at rest, carried onto the painting shown
        const on = (M: DOMMatrix, px: number, py: number, out: [number, number]): void => {
          const p = M.transformPoint(new DOMPoint(px, py))
          toStage(p.x, p.y, false, out)
        }
        const fn = G0.foreNear
        legEnd(fn[0], by + G0.shoulderDY, fn[0], pad, 0, G0.fore, G0.foreLie, 0, anc.hoofFront)
        on(FORE_FM, anc.hoofFront[0], anc.hoofFront[1] + 4, anc.hoofFront)
        legEnd(hipx + 4, hipy, G0.hindNearX, 0, 0, G0.hind, G0.hindLie, 0, anc.hoofHind)
        on(HIND_FM, anc.hoofHind[0], anc.hoofHind[1] + 4, anc.hoofHind)
        on(BODY_FM, G0.tail[0], by + G0.tail[1], anc.tailStage)
        on(BODY_FM, -2 * K, by, anc.bodyStage)
        on(HEAD_FM, hx, hy, anc.headStage)
      }
    }
    if (FRAMES) {
      // The neck's collar lies between the body and the head: placed on the
      // painting partly by each, then given in the BODY's space, where the
      // hooks draw (below).
      const cx = anc.neckCollar[0], cy = anc.neckCollar[1]
      const pb = BODY_FM.transformPoint(new DOMPoint(cx, cy))
      const ph = HEAD_FM.transformPoint(new DOMPoint(cx, cy))
      const hc = HEAD_FM.transformPoint(new DOMPoint(hx, hy))
      const inv = BODY_FM.inverse()
      const col = inv.transformPoint(new DOMPoint(pb.x + (ph.x - pb.x) * 0.4, pb.y + (ph.y - pb.y) * 0.4))
      const hb = inv.transformPoint(hc)
      anc.neckCollar[0] = col.x
      anc.neckCollar[1] = col.y
      const dl = hypot(hb.x - col.x, hb.y - col.y) || 1
      anc.neckDir[0] = (hb.x - col.x) / dl
      anc.neckDir[1] = (hb.y - col.y) / dl
    }
    if (st.beforeTorso) {
      g.save()
      if (FRAMES) g.setTransform(BASE_M!.multiply(BODY_FM))
      st.beforeTorso(g, anc)
      g.restore()
    }
  }
  const NW = [G0.nw[0] * K, G0.nw[1] * K] // thick off the shoulder, slim at the poll
  // resolve TQ: [cx*K, by+cy, rx*K, (ry+breath)*K]
  const TR = G0.tq.map((v, i) => (i & 1 ? (i & 2 ? (v + br * 0.5) * K : by + v) : v * K))
  const each = (fn: (a: number, b: number, c: number, d: number) => void): void => {
    for (let i = 0; i < 12; i += 4) fn(TR[i]!, TR[i + 1]!, TR[i + 2]!, TR[i + 3]!)
  }
  // THE NECK, painted along its own inked run: `nk` moves with the head, so
  // its length and angle are the caller's, and a stretched tube is still a
  // tube. No clip — the sheet IS the tube, cut to the drawing's own extent.
  const ndx = nk[2]! - nk[0]!
  const ndy = nk[3]! - nk[1]!
  const nlen = hypot(ndx, ndy) || 1
  if (FRAMES) {
    // the whole painted pose, in the standing frame (it paints its own rear)
    g.save()
    g.setTransform(BASE_M!)
    drawFrame(g, FRAME_DRESS, FRAME_NOW, PF)
    g.restore()
  } else if (PAINT) {
    // The painted rig: the neck laid along `nk` exactly as the drawn tube
    // runs, the torso over its root, each carrying its own soft line.
    g.save()
    g.translate(nk[0]!, nk[1]!)
    g.rotate(atan2(ndy, ndx))
    g.scale(nlen / NECK_LEN, NW[0]! / 16)
    paintPart(g, PAINT, 'neck', 0, false, PF)
    g.restore()
    g.save()
    g.translate(0, by)
    g.scale(K, K * (1 + br * 0.018))
    BODY_M = g.getTransform()
    paintPart(g, PAINT, 'torso', 0, false, PF)
    g.restore()
    // The near legs' TOPS, joined to the body straight away — before the
    // mane lies on it or anything worn is laid over it (`paintLeg`). Their
    // rest is drawn below, in front, where the legs have always been.
    BODY = TR
    BODY_R = 0
    LEG_PASS = LEG_TOP
    const fj = G0.foreNear
    fl(fj[0], win ? fj[2] : fj[1], win ? fj[4] : fj[3], 1, CO, G0.foreLie)
    // the near hind leg stands in the standing frame: undo the rear
    g.save()
    g.translate(-22, -6)
    g.rotate(-R)
    g.translate(22, 6)
    BODY_R = R
    limb(hipx + 4, hipy, G0.hindNearX, 0, 0, G0.hind, CO, G0.hindLie, lie)
    g.restore()
    LEG_PASS = LEG_REST
  } else {
  tube(nk, NW, 13, OUT)
  each((a, b, c, d) => {
    el(a, b, c, d)
    ink(0, 13)
  })
  if (!partArtFree(NECK_ART, NECK_UNIT, CO, () => {
    // The neck's ink and its rim, then its flat coat, then the painting over
    // the lot — `partArt`'s sandwich, laid by hand because a stroked tube has
    // no closed path to clip or fill against.
    tube(nk, NW, 13, OUT)
    tube(nk, NW, 0, RM)
    tube(nk, NW, -3, CO)
    g.translate(nk[0]!, nk[1]!)
    g.rotate(atan2(ndy, ndx))
    g.scale(nlen / NECK_LEN, NW[0]! / 16)
  })) meat(nk, NW, CO) // its own line merges into the silhouette above
  // THE BARREL, painted as the three masses' union — traced once more so the
  // blit is clipped to exactly what was inked. `TQ`'s own shape is the sheet;
  // the stockier foe and the breath are a scale on it.
  //
  // THE CHEST TUFT goes UNDER a painted barrel (B23, §4f's no-line-inside
  // rule). Drawn after it, as the drawing does, its three inked scallops sat
  // INSIDE the painting — three hard lines across a sheet painted with none.
  // Laid down first, the barrel's own fill covers every part of it that lies
  // within the chest, and what survives is exactly what the tuft is FOR: the
  // scalloped bump it adds to the silhouette at the front of the chest.
  // Without a painting (or under the hit flash) the order is the drawing's.
  const barrelArt = !FLASH && !!spriteFor(BARREL_ART.kind, BARREL_ART.id)
  if (barrelArt) chestTuft(by)
  g.beginPath()
  each(elAdd)
  if (!partArt(BARREL_ART, BARREL_UNIT, CO, () => {
    g.translate(0, by)
    g.scale(K, K * (1 + br * 0.018))
  }, { off: [29 * 0.08, -27 * 0.08], rim: true })) {
    each(blob)
    chestTuft(by)
  }
  }

  if (anc && st.afterTorso) {
    g.save()
    if (FRAMES) g.setTransform(BASE_M!.multiply(BODY_FM))
    st.afterTorso(g, anc)
    g.restore()
  }

  // mane down the back of the neck, rooted at the poll, behind the head
  const ma = 2.6 - 0.25 * rear + 0.7 * nod // lying, it falls back along the neck
  // The painted mane is drawn OVER the head, below (owner, 2026-09-26: "the
  // hair is cut off by the new head … instead of partially painted over the
  // back of the head like in the reference logo").
  if (!PAINT && !FRAMES) hair(hx - 21, hy - 4, ma, 46, 27, 2.1, -0.5, 3)
  if (anc && st.afterMane) {
    g.save()
    if (FRAMES) g.setTransform(BASE_M!.multiply(BODY_FM))
    st.afterMane(g, anc)
    g.restore()
  }

  g.save()
  g.translate(hx, hy)
  // The body rears by -0.58, so the head counter-rotates: in world space it
  // still ends up tilted up ~0.3 rad, with the horn aimed up-and-forward.
  g.rotate(hrot)
  g.scale(HK, HK)

  // The horn's tip, where a forming rune gathers, painted or drawn.
  const HTX = 9 + 15.68
  const HTY = -19 - 32.4
  if (FRAMES) {
    // the head at rest, carried onto the painting's head: everything drawn in
    // head space below — the rune gathering at the horn, anything worn — follows
    g.setTransform(BASE_M!.multiply(HEAD_FM).multiply(BASE_M!.inverse().multiply(g.getTransform())))
  }
  if (FRAMES) {
    // the painting has her head (placed above)
  } else if (PAINT) {
    // The painted head: both ears, the skull, the muzzle and the FACE are one
    // painting per mood. At rest she is CALM (owner: "not an aroused or happy
    // emotion, but a neutral one"); a win cheers, a blow winces, a fall is
    // dizzy, and she blinks.
    const fr = st.face ? faceOf(st.face)
      : lose > 0.3 ? FACE.dizzy
        : win > 0.2 ? FACE.cheer
          : hit > 0.25 ? FACE.ouch
            : bl > 0.5 ? FACE.blink
              : FACE.neutral
    paintPart(g, PAINT, 'head', fr, false, PF)
    // The mane lies OVER the back of the head, as the logo paints it: locks
    // from the poll down the back of the skull and the neck, behind the near
    // ear and clear of the face. It hangs from the head, turned a little less
    // than it and swinging about the poll; lying, it swings back along the
    // neck. (Anything worn at the neck is under it now, as under real hair.)
    g.save()
    g.rotate(-hrot * 0.2)
    paintHeadHair(g, PAINT, 'mane', swing(2.1) * 0.3 + nod * 0.6, PF)
    g.restore()
    // ...and the near ear stands in front of it, as on the mascot.
    paintNearEar(g, PAINT, fr, PF)
    // The fringe in two halves with the horn standing between them: the back
    // half over the far ear and behind the horn, the front half over its root.
    paintHair(g, PAINT, 'backlock', 12, -26, swing(2.6) * 0.12, PF)
    paintPart(g, PAINT, 'horn', 0, false, PF)
    paintHair(g, PAINT, 'forelock', 1, -21, swing(2.6) * 0.15, PF)
  } else {
  ear(-14, -13, -0.7 - nod * 0.3, 0.85, SH) // far ear; both droop back when down
  el(20, 10, 12.5, 10.5) // skull + muzzle inked as one mass, then filled
  ink(0, 11)
  el(0, 0, 25, 23)
  ink(0, 11)
  // The head is one painting over the pair, clipped to the pair: the face
  // goes on top of it, drawn, because every part of a face is a different
  // shape per frame.
  g.beginPath()
  elAdd(20, 10, 12.5, 10.5)
  elAdd(0, 0, 25, 23)
  if (!partArt(HEAD_ART, HEAD_UNIT, CO, undefined, { off: [25 * 0.08, -23 * 0.08], rim: true })) {
    blob(20, 10, 12.5, 10.5)
    blob(0, 0, 25, 23)
  }
  ear(0, -19, -0.2 + fk * (1 - nod) - nod * 0.45, 1.15, CO) // near ear — flicks

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
  } else if (foe?.gentle) {
    // CHAPTER 1'S GENTLE FOE (`FoeDef.gentle`, second blind playtest): a
    // round eye under a heavy, sleepy lid — no glow, no glare. The first foe
    // a six-year-old meets should look drowsy, not dangerous.
    const h = 8.8 * (1 - bl) * (fc ? fc.eye : 1) + 0.7
    const lid = -2 - h + 2 * h * 0.38 // the lid's edge, 38 % down the eye
    el(10, -2, 6.4, h)
    ink(EY, 1.8)
    g.save()
    el(10, -2, 6.4, h)
    g.clip()
    g.fillStyle = CO
    g.fillRect(2, -3 - h, 17, lid + 1 + h)
    g.restore()
    if (!F && h > 3) {
      el(12, lid + 2.6, 2.3, 2.1) // the glint, just under the lid...
      ink('#fff')
      el(7.4, 3.2, 1.4, 1.4) // ...and a small bounce catchlight
      g.fill()
    }
    // The lid's edge droops across the eye; a short lash flicks off its back.
    g.beginPath()
    g.ellipse(10, lid - 1.4, 6.9, 2.4, 0, 0.1, PI - 0.1)
    g.lineTo(1.2, lid - 3.6)
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
  if (!partArt(HORN_ART, HORN_UNIT, HO, undefined, { off: [0.5, -1], tint: HOT })) {
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
  }
  // forelock swept back over the brow, in front of the horn base
  hair(1, -21, 0.25, 14, 12, 2.6, 0.8, 1)
  }
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
    el(HTX, HTY, 4 + 8 * form, 4 + 8 * form)
    g.fill()
    for (let i = 0; i < 3; i++) {
      // sparks spiralling in as the rune finishes forming
      const a2 = t * 2.6 + i * 2.1
      const r2 = 20 - form * 15
      el(HTX + cos(a2) * r2, HTY + sin(a2) * r2 * 0.7, 1 + 2.4 * form, 1 + 2.4 * form)
      g.fill()
    }
    // Sparkle tier (item 17): an outer ring turning the other way, and a soft
    // halo under it. The halo is stacked low-alpha ellipses rather than more
    // `shadowBlur` — blur is the most expensive thing on this canvas and the
    // one Firefox charges double for, so the tier buys reach, not radius.
    if (S.qx > 0.01) {
      g.globalAlpha = min(1, form + rear * 0.3) * S.qx
      g.shadowBlur = 0
      for (let i = 0; i < 3; i++) {
        const a2 = -t * 1.7 + i * 2.1 + 1.05
        const r2 = 34 - form * 19
        el(HTX + cos(a2) * r2, HTY + sin(a2) * r2 * 0.7, 0.8 + 1.9 * form, 0.8 + 1.9 * form)
        g.fill()
      }
      for (let i = 0; i < 3; i++) {
        g.globalAlpha = min(1, form + rear * 0.3) * S.qx * (0.1 - i * 0.025)
        const r2 = (9 + 15 * form) * (1 + i * 0.7)
        el(HTX, HTY, r2, r2)
        g.fill()
      }
    }
    g.restore() // restore() puts shadowBlur back for us
  }
  g.restore() // head

  // near foreleg, in front of the barrel — joined to it, when painted
  BODY = TR
  BODY_R = 0
  const fn = G0.foreNear
  fl(fn[0], win ? fn[2] : fn[1], win ? fn[4] : fn[3], 1, CO, G0.foreLie)

  // Knocked out: three little stars circling over the head once it is down.
  // A ring seen edge-on — the ones swinging toward the viewer are bigger.
  const dz = st.face ? 0 : clamp((loseR - 0.7) / 0.3, 0, 1)
  if (dz) {
    g.save()
    if (FRAMES) g.setTransform(BASE_M!.multiply(HEAD_FM))
    g.globalAlpha = dz
    for (let i = 0; i < 3; i++) {
      const a = t * 3.1 + (i * TAU) / 3
      const r = (5.6 + 1.6 * sin(a)) * HK
      const sx = hx + 4 + cos(a) * 27 * HK
      const sy = hy - 42 * HK + sin(a) * 7 * HK
      // The painted five-point star (`prop-star`, the 3-5 lamps' star) when it
      // has landed: the same star at the same radius, spun the way the drawn
      // one spins (its first point at `t * 2`; the sheet's points straight up).
      g.save()
      g.translate(sx, sy)
      g.rotate(t * 2 + PI / 2)
      const hit = drawItem(g, STAR_ART, r, 0, '#ffd84a')
      g.restore()
      if (hit) continue
      g.beginPath()
      for (let j = 0; j < 10; j++) {
        const b = t * 2 + (j * PI) / 5
        const q = j & 1 ? r * 0.45 : r
        g.lineTo(sx + cos(b) * q, sy + sin(b) * q)
      }
      g.closePath()
      ink('#ffd84a', 1.8)
    }
    g.globalAlpha = 1
    g.restore()
  }
  g.restore() // rearing frame

  // near hind leg, in front of the barrel (which has reared by R)
  BODY_R = R
  limb(hipx + 4, hipy, G0.hindNearX, 0, 0, G0.hind, CO, G0.hindLie, lie)
  BODY = null
  LEG_PASS = LEG_ALL
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
