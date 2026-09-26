/**
 * meshRig.ts — THE SKINNED DUELIST (owner, 2026-09-26): "take the Aurora from
 * the mascot and do a rig on top of it with vertex weight paints that allow
 * to animate the image cleanly, like a 3d model in Blender would be rigged".
 * Separately painted pieces never matched each other; ONE painting, deformed,
 * matches itself.
 *
 * The painting is the mascot's Aurora (`images/rig/mesh-aurora.webp`, keyed
 * off the brand mascot). It is cut into four LAYERS, back to front, so a part
 * that moves never tears a hole in what lies behind it:
 *
 *   back   the far legs and the tail (behind the body)
 *   body   torso and neck — its hidden parts FILLED in (the neck under the
 *          mane, the belly behind the near legs) and their outline drawn, so
 *          a leg that lifts or a head that turns uncovers coat, not a ghost
 *   head   head, ears, horn and the whole mane
 *   front  the near legs
 *
 * Each layer is a grid of triangles over its pixels. Every vertex carries up
 * to three BONE WEIGHTS — the weight paint — and each frame it is moved by
 * linear blend skinning: v' = Σ w · (bone now · bone at rest⁻¹) · v.
 *
 * THE BONES ARE THE DUEL RIG'S OWN. `chars.ts` still decides every pose — the
 * rear on a cast, the forelegs folding, the win prance, the lie-down — on a
 * profile fitted to this painting (`MASCOT`), and hands each bone's transform
 * over (`setBone`) instead of drawing: the body, the head, the mane, the tail
 * and every segment of every leg. The rest pose is captured once from the
 * same code (`setRestCapture`), so the painting and the skeleton meet where
 * the profile was fitted.
 *
 * Drawn with WebGL on one small shared canvas, each layer composited into the
 * 2D duel canvas where the rig used to draw that part — so anything worn
 * still goes between the layers. No WebGL, no painting yet, or the art layer
 * switched off: `meshOn` says no and the rig draws itself as before.
 */
import { artOverridesEnabled } from '@/game/art'

type G2D = CanvasRenderingContext2D
type Pt = readonly [number, number]
export type Pass = 'back' | 'body' | 'head' | 'front'
export type MeshWho = 'aurora'

/* ============================== the painting ============================= */

/**
 * The painting's regions, in its own pixels (the 480 px mascot crop), traced
 * by hand off its outline. A region reaches a little INTO the body where the
 * body covers it, so a joint that turns keeps its root under the body.
 */
interface MeshDef {
  src: string
  size: number
  /** Painting pixel → the rig's base space: ((x - x0) / s, (y - y0) / s). */
  fit: { s: number; x0: number; y0: number }
  regions: {
    tail: readonly Pt[]
    foreFar: readonly Pt[]
    hindFar: readonly Pt[]
    body: readonly Pt[]
    head: readonly Pt[]
    foreNear: readonly Pt[]
    hindNear: readonly Pt[]
  }
  /** Outline the body's silhouette carries under what covers it: the belly
   *  behind the near legs, the chest over the far foreleg, the neck under the
   *  mane. Drawn into the body layer only; hidden until something moves. */
  hidden: readonly (readonly Pt[])[]
  /** The mane: everything in the head region left of `x` or above `y` hangs
   *  from the mane bone; below `fallTop` it blends onto the body down to `fallEnd`. */
  mane: { x: number; y: number; fallTop: number; fallEnd: number }
  /** The neck: body vertices right of `minX` follow the head fully inside
   *  the face and within `hold` px of it, easing off to none at `reach` px. */
  neck: { minX: number; hold: number; reach: number }
  /** The tail's root, where it swings from (painting px). */
  tailRoot: Pt
  /** Seeds in the body's coat, and the face the coat flood must never enter
   *  (`bodyCoatOf`): behind the jaw the painting draws no line between head
   *  and neck, so this polygon's diagonal edge is where the head ends. */
  coatSeeds: readonly Pt[]
  face: readonly Pt[]
  /** Where each leg leaves the body: painting y at which its pixels start to
   *  follow the leg's bones, and where they follow them fully. Above, the
   *  leg's top moves with the body. */
  belly: Readonly<Record<LegId, readonly [number, number]>>
  /** The outline colour, for the hidden edges. */
  ink: string
}

const DEFS: Readonly<Record<MeshWho, MeshDef>> = {
  aurora: {
    src: 'images/rig/mesh-aurora.webp',
    size: 480,
    fit: { s: 2.36, x0: 230, y0: 436.2 },
    regions: {
      // its right edge runs down the MIDDLE of the rump's outline: rump pixels
      // in it would swing out with the tail as a sliver of body
      tail: [[158, 258], [150, 238], [120, 234], [93, 244], [73, 274], [68, 320], [58, 345], [42, 360], [54, 388], [96, 388], [120, 376], [125, 352], [129, 330], [133, 300], [139, 276], [148, 262]],
      foreFar: [[289, 336], [328, 336], [328, 446], [292, 448]],
      hindFar: [[168, 352], [209, 348], [208, 422], [200, 448], [166, 448]],
      body: [
        [340, 258], [343, 300], [341, 332], [332, 350], [321, 358], [300, 364], [294, 373], [270, 381], [247, 379],
        [230, 377], [212, 373], [203, 369], [175, 383], [150, 383], [128, 376], [122, 370], [124, 352], [127, 330],
        // the back's top edge ON its painted outline, then the neck's crest
        // under the mane as a smooth traced line (cut along the painting's
        // alpha it came out sawtoothed when the mane moved off it)
        [132, 300], [138, 276], [143, 256], [160, 247], [190, 243], [206, 243], [214, 240], [235, 228], [258, 208], [282, 172], [300, 162],
        [322, 165], [337, 190], [342, 230]
      ],
      head: [
        [398, 26], [417, 32], [415, 70], [421, 95], [426, 130], [440, 150], [438, 186], [419, 191], [419, 236],
        [406, 259], [366, 267], [330, 267], [318, 263], [299, 263], [286, 281], [276, 301], [262, 312], [240, 310],
        // round the fall's curl and up its outer outline, on the outline's
        // OUTER edge: the back's own line, left of where the mane meets it, is
        // the body's (the shoulder's coat inside the curl goes to the body by
        // `bodyCoatOf`)
        [219, 305], [205, 292], [204, 281], [211, 268], [210, 256], [205, 247], [201, 238], [196, 226], [191, 200], [203, 150], [220, 110], [223, 74], [249, 50], [285, 40], [320, 43],
        [346, 58], [372, 56]
      ],
      // Their tops start in plain coat ABOVE the shoulder and the hip, so the
      // top edge rides the body and the fade (`FADE`) never crosses a line:
      // faded where the legs' own outlines run up into the belly, it broke
      // them (owner, 2026-09-26: "the legs border strokes are a bit broken").
      foreNear: [[241, 318], [296, 318], [297, 452], [245, 452], [241, 395]],
      // The rump's outline stays the body's down to where the leg begins: a
      // fade across it left a gap in the rump beside the tail.
      hindNear: [[139, 324], [177, 324], [177, 392], [173, 452], [123, 452], [117, 400], [120, 372], [137, 362]]
    },
    // Only where something in FRONT covers them: the chest over the far
    // foreleg and the belly over the far hind leg are in plain view, and a line
    // drawn there showed as a stray tick.
    hidden: [
      [[122, 372], [150, 383], [175, 383]],
      [[247, 379], [270, 381], [294, 373]],
      // (on the painted back line's centre, from where the head layer starts
      // covering it: the mane sways, and coat showed through as a notch; drawn
      // further left it thickened the outline that was already painted)
      [[206, 243], [214, 240], [235, 228], [258, 208], [282, 172]]
    ],
    mane: { x: 286, y: 100, fallTop: 250, fallEnd: 311 },
    // (behind the jaw the painting has no line between head and neck: the
    // neck's top must move exactly with the head there, or a step shows)
    neck: { minX: 262, hold: 3, reach: 38 },
    tailRoot: [152, 258],
    coatSeeds: [[240, 320], [300, 320], [170, 300], [310, 285]],
    face: [[281, 190], [300, 238], [320, 265], [445, 265], [445, 15], [281, 15]],
    // (at the belly line, not at the shoulder deep inside the body: blended
    // there, the breathing body and the planted leg drifted apart by a couple
    // of pixels exactly where the leg's outline meets the belly's)
    belly: { foreNear: [326, 384], foreFar: [336, 372], hindNear: [366, 390], hindFar: [366, 388] },
    ink: 'rgba(132, 64, 82, 0.96)'
  }
}

/* ================================ bones ================================== */

/** Bone ids: the body, head, mane, tail and every leg segment. */
export type LegId = 'foreNear' | 'foreFar' | 'hindNear' | 'hindFar'
const LEGS: readonly LegId[] = ['foreNear', 'foreFar', 'hindNear', 'hindFar']

/** This frame's bones, as `chars.ts` hands them over (device space). */
const CUR = new Map<string, DOMMatrix>()
/** While a rest pose is being captured, bones go here instead. */
let CAPTURING: Map<string, DOMMatrix> | null = null
export const setBone = (id: string, m: DOMMatrix): void => {
  ;(CAPTURING ?? CUR).set(id, m)
}
/** Is `chars.ts` drawing only to capture a rest pose? */
export const meshCapturing = (): boolean => CAPTURING !== null

type RestCapture = (side: number) => void
let restCapture: RestCapture | null = null
/** `chars.ts` registers how to pose the rig at rest (it imports this module). */
export const setRestCapture = (fn: RestCapture): void => { restCapture = fn }

/* =============================== the mesh ================================ */

/** Grid spacing, in painting pixels: a knee bends in a curve, not a kink. */
const GRID = 6
const MAXB = 3

interface LayerMesh {
  pass: Pass
  canvas: HTMLCanvasElement
  tex: WebGLTexture | null
  /** Its UVs and triangles on the GPU, uploaded once. */
  bufUv: WebGLBuffer | null
  bufIdx: WebGLBuffer | null
  nV: number
  /** Rest position in base space, per vertex. */
  rest: Float32Array
  uv: Float32Array
  bone: Uint8Array
  w: Float32Array
  idx: Uint16Array
  /** Scratch: this frame's device positions. */
  pos: Float32Array
}

interface Rig {
  def: MeshDef
  bones: string[]
  restInv: DOMMatrix[]
  layers: Record<Pass, LayerMesh>
}

const RIGS = new Map<string, Rig | 'loading' | 'failed'>()

/* ---- geometry helpers ---- */
const inPoly = (poly: readonly Pt[], x: number, y: number): boolean => {
  let c = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]!
    const [xj, yj] = poly[j]!
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c
  }
  return c
}
const tracePoly = (g: CanvasRenderingContext2D, poly: readonly Pt[]): void => {
  g.moveTo(poly[0]![0], poly[0]![1])
  for (let i = 1; i < poly.length; i++) g.lineTo(poly[i]![0], poly[i]![1])
  g.closePath()
}
/** The outline colour as [r, g, b]. */
const inkOf = (def: MeshDef): number[] => (def.ink.match(/\d+/g) ?? []).slice(0, 3).map(Number)

/** Distance from (x, y) to a polygon's outline. */
const distTo = (poly: readonly Pt[], x: number, y: number): number => {
  let best = Infinity
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, ay] = poly[j]!
    const [bx, by] = poly[i]!
    const vx = bx - ax
    const vy = by - ay
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy || 1)))
    best = Math.min(best, Math.hypot(x - ax - vx * t, y - ay - vy * t))
  }
  return best
}
const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/* ---- the layers' pixels ---- */
const LAYER_REGIONS: Readonly<Record<Pass, readonly (keyof MeshDef['regions'])[]>> = {
  back: ['tail', 'foreFar', 'hindFar'],
  body: ['body'],
  head: ['head'],
  front: ['foreNear', 'hindNear']
}

type RegionId = keyof MeshDef['regions']
const REGION_IDS: readonly RegionId[] = ['foreNear', 'hindNear', 'head', 'tail', 'foreFar', 'hindFar', 'body']

/**
 * Every painted pixel OUTSIDE all the traced regions — the outline's soft
 * outer rim, where a hand-traced edge runs a pixel or three inside it — given
 * to the region it touches, grown outward ring by ring. Without it the rims
 * were clipped off in places (the hooves' soles, the tail's edge): the outline
 * read as broken.
 */
const orphansOf = (src: ImageData, def: MeshDef): Int8Array => {
  const n = def.size
  const d = src.data
  const lab = new Int8Array(n * n).fill(-1)
  const orphan = new Uint8Array(n * n)
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const p = y * n + x
      if (d[p * 4 + 3]! < 3) continue
      const k = REGION_IDS.findIndex((r) => inPoly(def.regions[r], x + 0.5, y + 0.5))
      if (k >= 0) lab[p] = k
      else orphan[p] = 1
    }
  }
  const out = new Int8Array(n * n).fill(-1)
  let front: number[] = []
  for (let p = 0; p < n * n; p++) if (orphan[p]) front.push(p)
  for (let ring = 0; ring < 40 && front.length; ring++) {
    const next: number[] = []
    const got: [number, number][] = []
    for (const p of front) {
      const x = p % n
      const y = (p / n) | 0
      let k = -1
      // (below and above first: the back line's soft top rim, beside where the
      // mane meets it, belongs to the back — taken sideways it swung with the hair)
      for (const q of [p + n, p - n, p - 1, p + 1]) {
        if (q < 0 || q >= n * n || (q === p - 1 && x === 0) || (q === p + 1 && x === n - 1)) continue
        if (lab[q]! >= 0) { k = lab[q]!; break }
      }
      if (k >= 0) got.push([p, k])
      else next.push(p)
      void y
    }
    for (const [p, k] of got) { lab[p] = k; out[p] = k }
    front = next
  }
  return out
}

/**
 * THE BODY'S OWN COAT, found by flooding it (owner, 2026-09-26: "the back hair
 * outlines seem not to be well cut out, there is some horseback in the hair
 * image"). A hand-traced head region round the mane's fall took the coat
 * beside and under it — back, shoulder, throat — and it swung with the hair.
 * From seeds in the body the flood spreads through coat-light pixels, stopped
 * by every outline and kept out of the face; whatever it reaches is body, and
 * never part of the head layer.
 */
interface CoatMasks {
  /** The body's visible coat: stays the body's, shown as painted. */
  coat: Uint8Array
  /** Taken out of the head layer: the coat and the outline's soft edge next
   *  to it (the body fills coat under that edge). */
  cut: Uint8Array
  /** The coat colour and lightness, and the outline's, for unmixing that edge. */
  coatRgb: readonly number[]
  coatL: number
  inkL: number
}
const bodyCoatOf = (src: ImageData, def: MeshDef): CoatMasks => {
  const n = def.size
  const d = src.data
  const luma = (p: number): number => 0.3 * d[p * 4]! + 0.59 * d[p * 4 + 1]! + 0.11 * d[p * 4 + 2]!
  const ls: number[] = []
  for (let y = 0; y < n; y += 3) for (let x = 0; x < n; x += 3) if (d[(y * n + x) * 4 + 3]! > 250 && inPoly(def.regions.body, x, y)) ls.push(luma(y * n + x))
  ls.sort((a, b) => a - b)
  const lim = (ls[ls.length >> 1] ?? 128) - 30
  // (the neck under the jaw is shaded: a looser test there, or its shadow
  // stayed with the head as a wedge — but never within 3 px of an outline,
  // whose soft edge the loose test took for coat: the body then kept those
  // half-dark pixels, dotted along the mane when the hair moved)
  const nearInk = new Uint8Array(n * n)
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (d[(y * n + x) * 4 + 3]! < 200 || luma(y * n + x) > 130) continue
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          const xx = x + dx
          const yy = y + dy
          if (xx >= 0 && yy >= 0 && xx < n && yy < n) nearInk[yy * n + xx] = 1
        }
      }
    }
  }
  const ok = (x: number, y: number, l = x > 270 && !nearInk[y * n + x] ? lim - 45 : lim): boolean => {
    const p = y * n + x
    return d[p * 4 + 3]! > 200 && luma(p) > l && !inPoly(def.face, x + 0.5, y + 0.5) && inPoly(def.regions.body, x + 0.5, y + 0.5)
  }
  const out = new Uint8Array(n * n)
  const q: number[] = []
  for (const [x, y] of def.coatSeeds) if (ok(x, y)) { out[y * n + x] = 1; q.push(y * n + x) }
  while (q.length) {
    const p = q.pop()!
    const x = p % n
    const y = (p / n) | 0
    for (const [xx, yy] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]] as const) {
      if (xx < 0 || yy < 0 || xx >= n || yy >= n) continue
      const k = yy * n + xx
      if (!out[k] && ok(xx, yy)) { out[k] = 1; q.push(k) }
    }
  }
  // The outline's soft coat-side edge, two rings deep: out of the hair (it
  // showed as pale flecks on the mane's underside when the head lifted), but
  // NOT shown as painted in the body either (it stayed behind as a dotted ghost
  // of the mane's edge) — the body fills coat there.
  const cut = new Uint8Array(out)
  for (let ring = 0; ring < 2; ring++) {
    const add: number[] = []
    for (let y = 1; y < n - 1; y++) {
      for (let x = 1; x < n - 1; x++) {
        const p = y * n + x
        if (cut[p] || !(cut[p - 1] || cut[p + 1] || cut[p - n] || cut[p + n])) continue
        if (ok(x, y, lim - 70)) add.push(p)
      }
    }
    for (const p of add) cut[p] = 1
  }
  const coatL = lim + 30
  const cs = [0, 0, 0]
  let cn = 0
  for (let p = 0; p < n * n; p += 7) if (out[p]) { for (let c = 0; c < 3; c++) cs[c] = cs[c]! + d[p * 4 + c]!; cn++ }
  const inkRgb = inkOf(def)
  const inkL = 0.3 * inkRgb[0]! + 0.59 * inkRgb[1]! + 0.11 * inkRgb[2]!
  return { coat: out, cut, coatRgb: cs.map((v) => v / (cn || 1)), coatL, inkL }
}

const cutLayer = (img: HTMLImageElement, def: MeshDef, pass: Pass, src: ImageData, orphans: Int8Array, masks: CoatMasks, under: ImageData | null): HTMLCanvasElement => {
  const n = def.size
  const cv = document.createElement('canvas')
  cv.width = cv.height = n
  const g = cv.getContext('2d', { willReadFrequently: true })!
  g.save()
  g.beginPath()
  for (const r of LAYER_REGIONS[pass]) tracePoly(g, def.regions[r])
  g.clip()
  g.drawImage(img, 0, 0, n, n)
  g.restore()
  // this layer's share of the orphan rim
  const mine = LAYER_REGIONS[pass].map((r) => REGION_IDS.indexOf(r))
  const im = g.getImageData(0, 0, n, n)
  for (let p = 0; p < n * n; p++) {
    if (orphans[p]! < 0 || !mine.includes(orphans[p]!)) continue
    for (let c = 0; c < 4; c++) im.data[p * 4 + c] = src.data[p * 4 + c]!
  }
  g.putImageData(im, 0, 0)
  if (pass === 'head') {
    // No body in the hair (`bodyCoatOf`): not the back's coat, not the
    // neck's, not the soft edge between them and the mane.
    // The coat goes entirely; the soft edge is UNMIXED against the very body
    // pixel it will lie over (`under`): it becomes outline colour at the
    // opacity that puts the painting back exactly at rest — and a clean
    // outline, not a pale fringe, when the hair moves off the body. (Unmixed
    // against an estimated coat colour it dropped or paled pixels where the
    // coat is shaded, as inside the fall's curl.)
    const ink = inkOf(def)
    const im2 = g.getImageData(0, 0, n, n)
    const q = im2.data
    const U = under?.data
    for (let p = 0; p < n * n; p++) {
      if (!masks.cut[p]) continue
      if (masks.coat[p] || !U || U[p * 4 + 3]! < 250) { q[p * 4 + 3] = 0; continue }
      let num = 0
      let den = 0
      for (let c = 0; c < 3; c++) {
        const fb = ink[c]! - U[p * 4 + c]!
        num += (q[p * 4 + c]! - U[p * 4 + c]!) * fb
        den += fb * fb
      }
      const al = Math.max(0, Math.min(1, den ? num / den : 0))
      if (al < 0.03) { q[p * 4 + 3] = 0; continue }
      for (let c = 0; c < 3; c++) q[p * 4 + c] = ink[c]!
      q[p * 4 + 3] = Math.round(q[p * 4 + 3]! * al)
    }
    g.putImageData(im2, 0, 0)
  }
  if (pass === 'body') fillHidden(g, def, masks.coat)
  if (pass === 'front' || pass === 'back') fadeTops(g, def, pass)
  return cv
}

/**
 * The body's hidden parts: every body pixel that something in front covers
 * (the head and mane, the near legs) is repainted as coat, grown in from the
 * visible coat around it, and the silhouette's outline is drawn where it ran
 * under them.
 */
const fillHidden = (g: CanvasRenderingContext2D, def: MeshDef, coat: Uint8Array): void => {
  const n = def.size
  const im = g.getImageData(0, 0, n, n)
  const d = im.data
  const R = def.regions
  const covered = new Uint8Array(n * n)
  const known = new Uint8Array(n * n)
  // The fill grows from COAT only — pixels near the body's median lightness.
  // Grown from the outline (or its soft edge) too, it smeared the rump's line
  // into the coat under the near hind leg.
  const luma = (p: number): number => 0.3 * d[p * 4]! + 0.59 * d[p * 4 + 1]! + 0.11 * d[p * 4 + 2]!
  const ls: number[] = []
  for (let y = 0; y < n; y += 3) for (let x = 0; x < n; x += 3) if (d[(y * n + x) * 4 + 3]! > 250 && inPoly(R.body, x, y)) ls.push(luma(y * n + x))
  ls.sort((a, b) => a - b)
  const coatL = ls[ls.length >> 1] ?? 128
  const isInk = (p: number): boolean => luma(p) < coatL - 30
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const p = y * n + x
      if (!inPoly(R.body, x + 0.5, y + 0.5)) continue
      // covered only where the layer in front is FULLY opaque — 1.5 px inside
      // its outline: on the anti-aliased edge the fill showed through as pale
      // pixels, at rest, where the back meets the mane
      const X = x + 0.5
      const Y = y + 0.5
      const deep = (poly: readonly Pt[]): boolean => inPoly(poly, X, Y) && distTo(poly, X, Y) >= 1.5
      const cov = deep(R.head) || deep(R.foreNear) || deep(R.hindNear)
      // (only where the painting has paint: background under the head region,
      // above the back line, must stay background — filled, it stood up as a
      // pale bump over the back)
      // (the body's own visible coat — `bodyCoatOf` — is never covered)
      if (cov && !coat[p]) covered[p] = 1
      else if (cov && coat[p]) known[p] = 1
      else if (!cov && d[p * 4 + 3]! > 250 && !isInk(p)) known[p] = 1
    }
  }
  // Onion-peel: each covered pixel takes the mean of its known neighbours,
  // ring by ring inward.
  let front: number[] = []
  for (let p = 0; p < n * n; p++) if (covered[p]) front.push(p)
  for (let pass = 0; pass < 400 && front.length; pass++) {
    const next: number[] = []
    const done: number[] = []
    const val: number[] = []
    for (const p of front) {
      const x = p % n
      const y = (p / n) | 0
      let r = 0, gg = 0, b = 0, k = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx
          const yy = y + dy
          if (xx < 0 || yy < 0 || xx >= n || yy >= n) continue
          const q = yy * n + xx
          if (!known[q]) continue
          r += d[q * 4]!
          gg += d[q * 4 + 1]!
          b += d[q * 4 + 2]!
          k++
        }
      }
      if (k) {
        done.push(p)
        val.push(r / k, gg / k, b / k)
      } else next.push(p)
    }
    done.forEach((p, i) => {
      d[p * 4] = val[i * 3]!
      d[p * 4 + 1] = val[i * 3 + 1]!
      d[p * 4 + 2] = val[i * 3 + 2]!
      d[p * 4 + 3] = 255
      known[p] = 1
    })
    front = next
  }
  // Soften the fill: a few box blurs over the covered pixels only.
  for (let it = 0; it < 6; it++) {
    const src = new Uint8ClampedArray(d)
    for (let p = 0; p < n * n; p++) {
      if (!covered[p]) continue
      const x = p % n
      const y = (p / n) | 0
      let r = 0, gg = 0, b = 0, k = 0
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const xx = x + dx
          const yy = y + dy
          if (xx < 0 || yy < 0 || xx >= n || yy >= n) continue
          const q = yy * n + xx
          if (src[q * 4 + 3]! < 250 || (!covered[q] && !known[q])) continue
          r += src[q * 4]!
          gg += src[q * 4 + 1]!
          b += src[q * 4 + 2]!
          k++
        }
      }
      if (k) {
        d[p * 4] = r / k
        d[p * 4 + 1] = gg / k
        d[p * 4 + 2] = b / k
      }
    }
  }
  g.putImageData(im, 0, 0)
  // The outline the silhouette carries under what covered it: the inner half
  // of a soft stroke, inside the body only.
  g.save()
  g.beginPath()
  tracePoly(g, R.body)
  g.clip()
  g.strokeStyle = def.ink
  g.lineWidth = 8
  // (flat ends: a round one spilled onto the visible line where a hidden
  // stroke starts, a dark blob at the back's junction with the mane)
  g.lineJoin = 'round'
  g.lineCap = 'butt'
  g.filter = 'blur(0.7px)'
  for (const line of def.hidden) {
    g.beginPath()
    g.moveTo(line[0]![0], line[0]![1])
    for (let i = 1; i < line.length; i++) g.lineTo(line[i]![0], line[i]![1])
    g.stroke()
  }
  g.restore()
}

/** How far (painting px) a leg's top fades into the body above its region's
 *  visible start. */
const FADE = 14
const fadeTops = (g: CanvasRenderingContext2D, def: MeshDef, pass: Pass): void => {
  const R = def.regions
  g.save()
  g.globalCompositeOperation = 'destination-out'
  for (const leg of pass === 'front' ? (['foreNear', 'hindNear'] as const) : (['foreFar', 'hindFar'] as const)) {
    const top = Math.min(...R[leg].map((p) => p[1]))
    const xs = R[leg].map((p) => p[0])
    const grad = g.createLinearGradient(0, top, 0, top + FADE)
    grad.addColorStop(0, 'rgba(0,0,0,1)')
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = grad
    g.fillRect(Math.min(...xs) - 2, top - 2, Math.max(...xs) - Math.min(...xs) + 4, FADE + 2)
  }
  g.restore()
}

/* ---- the weight paint ---- */

/** A bone's rest frame in base space: origin and unit direction. */
interface RestBone { x: number; y: number; dx: number; dy: number }
const restBoneOf = (m: DOMMatrix): RestBone => {
  const l = Math.hypot(m.a, m.b) || 1
  return { x: m.e, y: m.f, dx: m.a / l, dy: m.b / l }
}

/** The weights one vertex takes, by the region of the layer it lies in. */
type Weights = [string, number][]
const weightsFor = (def: MeshDef, rest: Map<string, RestBone>, pass: Pass, px: number, py: number, bx: number, by: number): Weights => {
  const R = def.regions
  const chain = (leg: LegId): Weights => {
    // Distance along the leg's rest chain (joint origins 0..4), from the top.
    const pts: RestBone[] = [0, 1, 2, 3, 4].map((i) => rest.get(`${leg}${i}`)!)
    let best = Infinity
    let at = 0
    let acc = 0
    const cum: number[] = [0]
    for (let i = 0; i < 4; i++) {
      const a = pts[i]!
      const b = pts[i + 1]!
      const vx = b.x - a.x
      const vy = b.y - a.y
      const L2 = vx * vx + vy * vy || 1
      let t = ((bx - a.x) * vx + (by - a.y) * vy) / L2
      const tt = Math.min(1, Math.max(i === 0 ? -3 : 0, t))
      const cx = a.x + vx * tt
      const cy = a.y + vy * tt
      const dd = (bx - cx) ** 2 + (by - cy) ** 2
      const L = Math.sqrt(L2)
      if (dd < best) { best = dd; at = acc + tt * L }
      acc += L
      cum.push(acc)
    }
    const bw = 3.2
    const out: Weights = []
    // down to the belly line the leg's top is the body's
    const [b0, b1] = def.belly[leg]
    const wl = smooth(b0, b1, py)
    if (wl < 1) out.push(['body', 1 - wl])
    for (let i = 0; i < 4; i++) {
      const lo = i === 0 ? 1 : smooth(cum[i]! - bw, cum[i]! + bw, at)
      const hi = i === 3 ? 1 : 1 - smooth(cum[i + 1]! - bw, cum[i + 1]! + bw, at)
      const w = lo * hi * wl
      if (w > 0.001) out.push([`${leg}${i}`, w])
    }
    return out
  }
  if (pass === 'front' || pass === 'back') {
    const mine = LEGS.filter((leg) => (pass === 'front') === leg.endsWith('Near'))
    for (const leg of mine) if (inPoly(R[leg], px, py)) return chain(leg)
    const inTail = pass === 'back' && inPoly(R.tail, px, py)
    if (!inTail) {
      // nearest leg by its rest chain's centre line
      let best: LegId | null = null
      let bd = pass === 'back' ? 14 : Infinity
      for (const leg of mine) {
        const a = rest.get(`${leg}0`)!
        const b = rest.get(`${leg}4`)!
        const vx = b.x - a.x
        const vy = b.y - a.y
        const t = Math.min(1, Math.max(0, ((bx - a.x) * vx + (by - a.y) * vy) / (vx * vx + vy * vy || 1)))
        const dd = Math.hypot(bx - a.x - vx * t, by - a.y - vy * t)
        if (dd < bd) { bd = dd; best = leg }
      }
      if (best) return chain(best)
    }
    if (pass === 'back') {
      // the tail: rigid near the root, swinging more toward the tip
      const { s, x0, y0 } = def.fit
      const r = Math.hypot(bx - (def.tailRoot[0] - x0) / s, by - (def.tailRoot[1] - y0) / s)
      const wb = 1 - smooth(2, 9, r)
      const w2 = smooth(12, 34, r)
      return [['body', wb], ['tail', (1 - wb) * (1 - w2)], ['tail2', (1 - wb) * w2]]
    }
    return [['body', 1]]
  }
  if (pass === 'head') {
    const M = def.mane
    // By the face's outline, blended across it: a column left a sliver of
    // cheek swinging with the hair, and a hard switch tore the lock that curls
    // onto the cheek wherever it crossed.
    const inside = inPoly(def.face, px, py)
    const wh = smooth(-7, 7, (inside ? 1 : -1) * distTo(def.face, px, py))
    if (wh > 0.999) return [['head', 1]]
    // the fall lies on the neck: it follows the body toward its ends
    // (no more than half: pinned harder, a head that drops opens a gap in the hair)
    const wb = px < M.x ? smooth(M.fallTop, M.fallEnd, py) * 0.5 : 0
    return [['head', wh], ['mane', (1 - wh) * (1 - wb)], ['body', (1 - wh) * wb]]
  }
  // body: the neck bends toward the head
  const N = def.neck
  if (px > N.minX) {
    const dist = inPoly(def.face, px, py) ? 0 : distTo(def.face, px, py)
    const wh = (1 - smooth(N.hold, N.reach, dist)) * smooth(N.minX, N.minX + 24, px)
    if (wh > 0.001) return [['body', 1 - wh], ['head', wh]]
  }
  return [['body', 1]]
}

const buildLayer = (def: MeshDef, restBones: Map<string, RestBone>, bones: string[], pass: Pass, cv: HTMLCanvasElement): LayerMesh => {
  const n = def.size
  const g = cv.getContext('2d', { willReadFrequently: true })!
  const a = g.getImageData(0, 0, n, n).data
  const cells = Math.ceil(n / GRID)
  const used = new Uint8Array(cells * cells)
  for (let cy = 0; cy < cells; cy++) {
    for (let cx = 0; cx < cells; cx++) {
      let any = false
      for (let y = cy * GRID - 1; y <= cy * GRID + GRID && !any; y++) {
        for (let x = cx * GRID - 1; x <= cx * GRID + GRID; x++) {
          if (x < 0 || y < 0 || x >= n || y >= n) continue
          if (a[(y * n + x) * 4 + 3]! > 2) { any = true; break }
        }
      }
      used[cy * cells + cx] = any ? 1 : 0
    }
  }
  const vid = new Int32Array((cells + 1) * (cells + 1)).fill(-1)
  const rest: number[] = []
  const uv: number[] = []
  const bone: number[] = []
  const w: number[] = []
  const idx: number[] = []
  const { s, x0, y0 } = def.fit
  const vert = (gx: number, gy: number): number => {
    const k = gy * (cells + 1) + gx
    if (vid[k]! >= 0) return vid[k]!
    const px = Math.min(n, gx * GRID)
    const py = Math.min(n, gy * GRID)
    const bx = (px - x0) / s
    const by = (py - y0) / s
    const ws = weightsFor(def, restBones, pass, px, py, bx, by).filter(([, v]) => v > 0.001).sort((p, q) => q[1] - p[1]).slice(0, MAXB)
    const sum = ws.reduce((t, [, v]) => t + v, 0) || 1
    for (let i = 0; i < MAXB; i++) {
      const e = ws[i]
      bone.push(e ? bones.indexOf(e[0]) : 0)
      w.push(e ? e[1] / sum : 0)
    }
    rest.push(bx, by)
    uv.push(px / n, py / n)
    vid[k] = rest.length / 2 - 1
    return vid[k]!
  }
  for (let cy = 0; cy < cells; cy++) {
    for (let cx = 0; cx < cells; cx++) {
      if (!used[cy * cells + cx]) continue
      const v00 = vert(cx, cy)
      const v10 = vert(cx + 1, cy)
      const v01 = vert(cx, cy + 1)
      const v11 = vert(cx + 1, cy + 1)
      idx.push(v00, v10, v11, v00, v11, v01)
    }
  }
  return {
    pass,
    canvas: cv,
    tex: null,
    bufUv: null,
    bufIdx: null,
    nV: rest.length / 2,
    rest: new Float32Array(rest),
    uv: new Float32Array(uv),
    bone: new Uint8Array(bone),
    w: new Float32Array(w),
    idx: new Uint16Array(idx),
    pos: new Float32Array(rest.length)
  }
}

/* ================================ loading ================================ */

const keyOf = (who: MeshWho, side: number): string => `${who}:${side}`

const loadImage = (src: string): Promise<HTMLImageElement> => new Promise((res, rej) => {
  const img = new Image()
  img.decoding = 'async'
  img.onload = () => res(img)
  img.onerror = () => rej(new Error(`mesh painting ${src} failed to load`))
  img.src = `${import.meta.env.BASE_URL ?? '/'}${src}`
})

const build = async (who: MeshWho, side: number): Promise<void> => {
  const key = keyOf(who, side)
  try {
    const def = DEFS[who]
    const img = await loadImage(def.src)
    if (!restCapture || !glReady()) throw new Error('no rest capture or no WebGL')
    const cap = new Map<string, DOMMatrix>()
    CAPTURING = cap
    try { restCapture(side) } finally { CAPTURING = null }
    const bones = [...cap.keys()]
    const restInv = bones.map((b) => cap.get(b)!.inverse())
    const restBones = new Map(bones.map((b) => [b, restBoneOf(cap.get(b)!)]))
    const sc = document.createElement('canvas')
    sc.width = sc.height = def.size
    const sg = sc.getContext('2d', { willReadFrequently: true })!
    sg.drawImage(img, 0, 0, def.size, def.size)
    const src = sg.getImageData(0, 0, def.size, def.size)
    const orphans = orphansOf(src, def)
    const masks = bodyCoatOf(src, def)
    LAST_MASKS = masks
    const layers = {} as Record<Pass, LayerMesh>
    let under: ImageData | null = null
    for (const pass of ['back', 'body', 'head', 'front'] as const) {
      const cv = cutLayer(img, def, pass, src, orphans, masks, under)
      if (pass === 'body') under = cv.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, def.size, def.size)
      layers[pass] = buildLayer(def, restBones, bones, pass, cv)
    }
    RIGS.set(key, { def, bones, restInv, layers })
  } catch (e) {
    console.warn('[meshRig]', (e as Error).message)
    RIGS.set(key, 'failed')
  }
}

/**
 * Should `chars.ts` draw this duelist skinned? Only Aurora so far (the
 * prototype the owner asked to see), and only once her painting has loaded,
 * her rest pose is captured and WebGL is there. The first ask starts the load.
 */
export const meshOn = (who: MeshWho | null, side: number): boolean => {
  if (!who || !artOverridesEnabled() || typeof document === 'undefined') return false
  const key = keyOf(who, side)
  const r = RIGS.get(key)
  if (r === undefined) {
    RIGS.set(key, 'loading')
    void build(who, side)
    return false
  }
  if (typeof r === 'string') return false
  ACTIVE = r
  return true
}
let ACTIVE: Rig | null = null

/* ================================= WebGL ================================= */

let GLC: HTMLCanvasElement | null = null
let GL: WebGLRenderingContext | null = null
let PROG: WebGLProgram | null = null
let BUF_POS: WebGLBuffer | null = null
let A_POS = 0
let A_UV = 0
let U_RES: WebGLUniformLocation | null = null
let U_OFF: WebGLUniformLocation | null = null
let U_TINT: WebGLUniformLocation | null = null
let GL_FAILED = false

const VS = `attribute vec2 aPos; attribute vec2 aUv; uniform vec2 uRes; uniform vec2 uOff; varying vec2 vUv;
void main(){ vec2 p = (aPos - uOff) / uRes * 2.0 - 1.0; gl_Position = vec4(p.x, -p.y, 0.0, 1.0); vUv = aUv; }`
const FS = `precision mediump float; uniform sampler2D uTex; uniform vec4 uTint; varying vec2 vUv;
void main(){ vec4 c = texture2D(uTex, vUv); c.rgb = mix(c.rgb, uTint.rgb * c.a, uTint.a); gl_FragColor = c; }`

const glReady = (): boolean => {
  if (GL) return true
  if (GL_FAILED || typeof document === 'undefined') return false
  try {
    const cv = document.createElement('canvas')
    cv.width = cv.height = 256
    const gl = cv.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: true, preserveDrawingBuffer: false })
    if (!gl) throw new Error('no webgl')
    const sh = (type: number, src: string): WebGLShader => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader')
      return s
    }
    const p = gl.createProgram()!
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VS))
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FS))
    gl.linkProgram(p)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('link')
    gl.useProgram(p)
    BUF_POS = gl.createBuffer()
    A_POS = gl.getAttribLocation(p, 'aPos')
    A_UV = gl.getAttribLocation(p, 'aUv')
    gl.enableVertexAttribArray(A_POS)
    gl.enableVertexAttribArray(A_UV)
    U_RES = gl.getUniformLocation(p, 'uRes')
    U_OFF = gl.getUniformLocation(p, 'uOff')
    U_TINT = gl.getUniformLocation(p, 'uTint')
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
    cv.addEventListener('webglcontextlost', (e) => {
      e.preventDefault()
      GL = null
      GL_FAILED = true
      RIGS.clear()
    })
    GLC = cv
    GL = gl
    PROG = p
    return true
  } catch (e) {
    console.warn('[meshRig] WebGL unavailable:', (e as Error).message)
    GL_FAILED = true
    return false
  }
}

const texOf = (layer: LayerMesh): WebGLTexture | null => {
  if (layer.tex || !GL) return layer.tex
  const gl = GL
  const t = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, t)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, layer.canvas)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  layer.tex = t
  return t
}

/** Hit-flash tints: none, the white strobe, the red one. */
const TINT: readonly (readonly [number, number, number, number])[] = [[0, 0, 0, 0], [1, 1, 1, 0.55], [1, 0.35, 0.35, 0.5]]

/** Layers waiting to be drawn in one GL frame, with one copy to the canvas. */
const PENDING: Pass[] = []

/** Skin one layer's vertices with this frame's bones into `L.pos`, growing `bb`. */
const skin = (rig: Rig, L: LayerMesh, K: DOMMatrix[], bb: number[]): void => {
  const { rest, bone, w, pos, nV } = L
  for (let v = 0; v < nV; v++) {
    const rx = rest[v * 2]!
    const ry = rest[v * 2 + 1]!
    let X = 0
    let Y = 0
    for (let i = 0; i < MAXB; i++) {
      const wt = w[v * MAXB + i]!
      if (!wt) continue
      const m = K[bone[v * MAXB + i]!]!
      X += wt * (m.a * rx + m.c * ry + m.e)
      Y += wt * (m.b * rx + m.d * ry + m.f)
    }
    pos[v * 2] = X
    pos[v * 2 + 1] = Y
    if (X < bb[0]!) bb[0] = X
    if (X > bb[2]!) bb[2] = X
    if (Y < bb[1]!) bb[1] = Y
    if (Y > bb[3]!) bb[3] = Y
  }
  void rig
}

/**
 * Draw a layer of the active duelist with this frame's bones, into `g`
 * wherever it lands on the canvas. `defer`: queue it, to be drawn with the
 * next layer that is not deferred — layers with nothing of the caller's
 * between them share ONE GL frame and ONE copy onto the canvas, which is
 * where nearly all of the cost is. Returns false if it cannot draw at all.
 */
export const meshPass = (g: G2D, pass: Pass, flash: 0 | 1 | 2 = 0, defer = false): boolean => {
  const rig = ACTIVE
  if (CAPTURING || !rig || !GL || !GLC) return false
  if (!SKIP.has(pass)) PENDING.push(pass)
  if (defer) return true
  const passes = PENDING.splice(0)
  if (!passes.length) return true
  // this frame's skinning matrices: bone now × bone at rest⁻¹
  const K: DOMMatrix[] = rig.bones.map((b, i) => {
    const cur = CUR.get(b)
    return cur ? cur.multiply(rig.restInv[i]!) : new DOMMatrix([0, 0, 0, 0, 0, 0])
  })
  const bb = [Infinity, Infinity, -Infinity, -Infinity]
  for (const p of passes) skin(rig, rig.layers[p], K, bb)
  const cw = g.canvas.width
  const ch = g.canvas.height
  const x0 = Math.max(0, Math.floor(bb[0]!) - 2)
  const y0 = Math.max(0, Math.floor(bb[1]!) - 2)
  const bw = Math.min(2048, Math.min(cw, Math.ceil(bb[2]!) + 2) - x0)
  const bh = Math.min(2048, Math.min(ch, Math.ceil(bb[3]!) + 2) - y0)
  if (bw <= 0 || bh <= 0) return true
  const gl = GL
  if (GLC.width < bw || GLC.height < bh) {
    GLC.width = Math.max(GLC.width, Math.ceil(bw / 64) * 64)
    GLC.height = Math.max(GLC.height, Math.ceil(bh / 64) * 64)
  }
  gl.viewport(0, GLC.height - bh, bw, bh)
  gl.clearColor(0, 0, 0, 0)
  gl.clear(gl.COLOR_BUFFER_BIT)
  gl.useProgram(PROG)
  gl.uniform2f(U_RES, bw, bh)
  gl.uniform2f(U_OFF, x0, y0)
  const tn = TINT[flash]!
  gl.uniform4f(U_TINT, tn[0], tn[1], tn[2], tn[3])
  for (const p of passes) {
    const L = rig.layers[p]
    gl.bindTexture(gl.TEXTURE_2D, texOf(L))
    gl.bindBuffer(gl.ARRAY_BUFFER, BUF_POS)
    gl.bufferData(gl.ARRAY_BUFFER, L.pos, gl.DYNAMIC_DRAW)
    gl.vertexAttribPointer(A_POS, 2, gl.FLOAT, false, 0, 0)
    if (!L.bufUv) {
      L.bufUv = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, L.bufUv)
      gl.bufferData(gl.ARRAY_BUFFER, L.uv, gl.STATIC_DRAW)
      L.bufIdx = gl.createBuffer()
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, L.bufIdx)
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, L.idx, gl.STATIC_DRAW)
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, L.bufUv)
    gl.vertexAttribPointer(A_UV, 2, gl.FLOAT, false, 0, 0)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, L.bufIdx)
    gl.drawElements(gl.TRIANGLES, L.idx.length, gl.UNSIGNED_SHORT, 0)
  }
  g.save()
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.drawImage(GLC, 0, 0, bw, bh, x0, y0, bw, bh)
  g.restore()
  return true
}

/* ================================ debugging ============================== */

let LAST_MASKS: CoatMasks | null = null
/** For the harness: the coat masks of the last rig built. */
export const meshMasks = (): CoatMasks | null => LAST_MASKS
const SKIP = new Set<Pass>()
/** For the harness: leave layers out, to see which one draws what. */
export const meshSkip = (passes: readonly Pass[]): void => {
  SKIP.clear()
  for (const p of passes) SKIP.add(p)
}

/** For the harness: the rig's layers, bones and weights as built. */
export const meshDebug = (who: MeshWho, side: number): { def: MeshDef; bones: string[]; rest: Map<string, RestBone>; layers: Record<Pass, LayerMesh> } | null => {
  const r = RIGS.get(keyOf(who, side))
  if (!r || typeof r === 'string') return null
  return { def: r.def, bones: r.bones, rest: new Map(r.bones.map((b, i) => [b, restBoneOf(r.restInv[i]!.inverse())])), layers: r.layers }
}
