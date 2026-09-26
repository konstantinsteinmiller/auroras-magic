/**
 * puppetBake.ts — the painted puppet's pieces, made ready to blit
 * (`duel/puppet.ts`, `artIds.PUPPET_ART`).
 *
 * TWO PAINTED SETS, TWENTY-SOME CHARACTERS. Aurora and Umbra are painted in
 * full colour and blit as painted. Everyone else wears one of the two sets
 * RECOLOURED, once, into a canvas of its own: Umbra's shadow clones keep her
 * coat and change their mane and horn to their chapter's; a Guardian takes
 * her coat, mane, horn and hooves; a skin or a mane swatch recolours Aurora.
 *
 * A RECOLOUR KEEPS THE PAINTING'S LIGHT. Each region's own colour is measured
 * off the painting (its median, above the ink), and every pixel keeps its
 * lightness RELATIVE to that — so a shadow stays a shadow and a highlight a
 * highlight, whether the new coat is lighter or darker than the painted one.
 * The ink, which sits far below the region's light, is left where it is.
 *
 * WHICH PIXEL IS WHICH is decided per piece, never guessed across the whole
 * picture: the torso, the neck and the leg are all coat; the hoof is all
 * hoof; the tail, the mane and both halves of the fringe are all hair; the horn is all
 * horn. Only the HEAD mixes a
 * coat with things that must not change — the eyes, the mouth, the blush, the
 * inside of the ears — and there the coat is the colour that is close to the
 * coat's own measured one.
 *
 * Each bake costs one `getImageData` over one sheet, once per look, and is
 * kept in a small least-recently-used cache sized in PIXELS: a head strip is
 * five faces wide and costs five times a horn.
 */
import { spriteFor } from '@/game/art'
import { PUPPET_ART, type PuppetWho, type PuppetPart } from '@/game/artIds'
import type { FoePalette } from '@/game/duel/foes'

export type Variant = 'plain' | 'far' | 'white' | 'red'
type RGB = readonly [number, number, number]

/** A recolour: every region left undefined keeps its painted colour. */
export interface Look {
  key: string
  /** The coat moved by a per-channel GAIN onto this colour rather than
   *  recoloured — for a painted set lifted toward its own model, where the
   *  hue stays and the painting's own colour texture should too. */
  lift?: RGB
  coat?: RGB
  hoof?: RGB
  mane?: readonly [RGB, RGB]
  horn?: RGB
}

const rgb = (c: string): RGB | undefined => {
  const s = c.trim().replace('#', '')
  const h = s.length === 3 ? s.split('').map((x) => x + x).join('') : s
  if (!/^[0-9a-f]{6}$/i.test(h)) {
    const m = /hsla?\(\s*([\d.]+)[\s,]+([\d.]+)%[\s,]+([\d.]+)%/i.exec(c)
    if (!m) return undefined
    return hsl(+m[1]! / 360, +m[2]! / 100, +m[3]! / 100)
  }
  const n = parseInt(h, 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}
const hsl = (h: number, s: number, l: number): RGB => {
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const f = (t: number): number => {
    t = ((t % 1) + 1) % 1
    return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p
  }
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)]
}

/**
 * The game palettes each painted set was painted FOR: a palette entry equal
 * to its set's own means "as painted" — the shadow clones wear Umbra's
 * `#213` coat, and her painted coat is what `#213` looks like painted.
 */
const OWN: Readonly<Record<PuppetWho, FoePalette>> = {
  aurora: ['#fec', '#eba', '#fff', '#fc3', '#fe9', '#fd6', '#c94', '#423', '#fe9', '#f9a'],
  umbra: ['#213', '#102', '#74c', '#84d', '#7ff', '#a5f', '#539', '#7ff', '#b7f', '#639']
}
const same = (a: string | undefined, b: string): boolean => !a || a.toLowerCase() === b.toLowerCase()

/**
 * A painted set's own coat, moved onto its MODEL's. The first Umbra set came
 * back a third darker than the mascot she was painted from — a near-black
 * blob with a smudge for a face at duel size — so her coat is carried up to
 * the model's violet on every bake, shadow clones included (they wear her
 * coat). Aurora's matched her model and is left alone.
 */
const LIFT: Readonly<Record<PuppetWho, string | undefined>> = { aurora: undefined, umbra: '#66507a' }
/** Her horn, likewise: painted near-black, where her model's is violet. */
const HORN_LIFT: Readonly<Record<PuppetWho, string | undefined>> = { aurora: undefined, umbra: '#9a74d6' }

/**
 * The recolour a duelist needs, or null when she is exactly as painted.
 * `mane` is the Mane Color Palette's override; `prism` a hue that replaces
 * mane and horn (Prism's cycle, already quantised by the caller).
 */
export const lookFor = (
  who: PuppetWho, pal: FoePalette | null, mane: readonly [string, string] | 'rainbow' | null, prism: string, t: number
): Look | null => {
  const own = OWN[who]
  const P = pal ?? own
  let coat: string | undefined = same(P[0], own[0]) ? undefined : P[0]
  const lift = coat ? undefined : LIFT[who]
  let hoof: string | undefined = same(P[6], own[6]) ? undefined : P[6]
  let m: [string, string] | undefined = same(P[3], own[3]) && same(P[4], own[4]) ? undefined : [P[3]!, P[4]!]
  let horn: string | undefined = same(P[5], own[5]) ? HORN_LIFT[who] : P[5]
  if (mane === 'rainbow') {
    // The swatch cycles; bake it in steps, like Prism's.
    const k = Math.round((t * 0.12 % 1) * 8) / 8
    m = [`hsl(${k * 360}, 80%, 72%)`, `hsl(${(k + 0.18) * 360}, 90%, 86%)`]
  } else if (mane) m = [mane[0], mane[1]]
  if (prism) {
    m = [prism, prism]
    horn = prism
  }
  if (!coat && !hoof && !m && !horn && !lift) return null
  const c = coat ? rgb(coat) : undefined
  const h = hoof ? rgb(hoof) : undefined
  const ma = m ? [rgb(m[0]), rgb(m[1])] as const : undefined
  const ho = horn ? rgb(horn) : undefined
  if (!c) coat = undefined
  if (!h) hoof = undefined
  if (!ho) horn = undefined
  const okMane = ma && ma[0] && ma[1] ? [ma[0], ma[1]] as const : undefined
  const li = lift ? rgb(lift) : undefined
  return {
    key: `${coat ?? ''}|${hoof ?? ''}|${okMane ? m!.join(',') : ''}|${horn ?? ''}|${li ? lift : ''}`,
    ...(li ? { lift: li } : {}),
    ...(c ? { coat: c } : {}),
    ...(h ? { hoof: h } : {}),
    ...(okMane ? { mane: okMane } : {}),
    ...(ho ? { horn: ho } : {})
  }
}

/* ------------------------------ the cache ----------------------------- */

interface Entry { img: HTMLImageElement; cv: HTMLCanvasElement; px: number; key: string; body?: HTMLImageElement }
type Fast = Partial<Record<PuppetPart, Partial<Record<Variant, Entry>>>>
const FAST_PLAIN: Record<PuppetWho, Fast> = { aurora: {}, umbra: {} }
const FAST = new WeakMap<Look, Fast>()
const fastOf = (who: PuppetWho, look: Look | null): Fast => {
  if (!look) return FAST_PLAIN[who]
  let f = FAST.get(look)
  if (!f) {
    f = {}
    FAST.set(look, f)
  }
  return f
}
const cache = new Map<string, Entry>()
let cachedPx = 0
/** About 24 MB of canvas: a duel's two looks with room to spare. */
const BUDGET_PX = 6_000_000

const remember = (key: string, e: Entry): void => {
  cache.delete(key)
  cache.set(key, e)
  cachedPx += e.px
  while (cachedPx > BUDGET_PX && cache.size > 1) {
    const [k, old] = cache.entries().next().value as [string, Entry]
    cache.delete(k)
    cachedPx -= old.px
  }
}

const canvasOf = (w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] | null => {
  if (typeof document === 'undefined') return null
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  const g = cv.getContext('2d', { willReadFrequently: true })
  return g ? [cv, g] : null
}

/**
 * A piece of `who`'s set, ready to blit: the painting itself when nothing
 * changes, otherwise a canvas baked once and kept. Null until the painting
 * has decoded.
 */
export const bakedPart = (who: PuppetWho, part: PuppetPart, look: Look | null, v: Variant): CanvasImageSource | null => {
  const img = spriteFor('rig', PUPPET_ART[who][part].id)
  if (!img) return null
  const match = COAT_OF_BODY.has(part)
  const body = match ? spriteFor('rig', PUPPET_ART[who].torso.id) : undefined
  if (match && !body) return v === 'plain' && !look ? img : null
  if (!look && v === 'plain' && !match) return img
  // The fast path: this look's bakes, by piece and variant, with no string
  // built — the cache below is keyed by strings and is only for eviction.
  const fast = fastOf(who, look)
  const got = fast[part]?.[v]
  if (got && got.img === img && got.body === body && cache.get(got.key) === got) return got.cv
  const lk = look?.key ?? ''
  const key = `${who}/${part}|${lk}|${v}`
  const hit = cache.get(key)
  if (hit && hit.img === img && hit.body === body) {
    cache.delete(key)
    cache.set(key, hit)
    ;(fast[part] ??= {})[v] = hit
    return hit.cv
  }
  const W = img.naturalWidth
  const H = img.naturalHeight
  // A far or flashed copy starts from the piece as this look paints it —
  // recoloured once, not once per variant.
  const base = v === 'plain' ? img : bakedPart(who, part, look, 'plain')
  if (!base) return null
  const made = canvasOf(W, H)
  if (!made || !W || !H) return img
  const [cv, g] = made
  g.drawImage(base, 0, 0, W, H)
  const id = g.getImageData(0, 0, W, H)
  const d = id.data
  if (v === 'plain' && body) matchBody(d, body)
  if (look && v === 'plain') recolour(d, W, H, who, part, look)
  if (v === 'white' || v === 'red') {
    // The hit flash, baked INTO the piece (70 % of the way to the strobe's
    // colour) and drawn in its place: laid over it instead, the bent leg's
    // overlapping slices doubled it into stripes.
    const [r, gg, b] = v === 'white' ? [255, 255, 255] : [255, 85, 85]
    for (let i = 0; i < d.length; i += 4) {
      d[i] = d[i]! + (r - d[i]!) * 0.7
      d[i + 1] = d[i + 1]! + (gg - d[i + 1]!) * 0.7
      d[i + 2] = d[i + 2]! + (b - d[i + 2]!) * 0.7
    }
  } else {
    if (v === 'far') {
      // The far pair stand in the body's shadow: a step darker, a touch plum.
      for (let i = 0; i < d.length; i += 4) {
        d[i] = d[i]! * 0.84 + 58 * 0.05
        d[i + 1] = d[i + 1]! * 0.82 + 35 * 0.05
        d[i + 2] = d[i + 2]! * 0.85 + 64 * 0.05
      }
    }
  }
  g.putImageData(id, 0, 0)
  if (cache.has(key)) cachedPx -= cache.get(key)!.px
  const e: Entry = { img, cv, px: W * H, key, ...(body ? { body } : {}) }
  remember(key, e)
  ;(fast[part] ??= {})[v] = e
  return cv
}

/* ------------------------------ warming ------------------------------ */

/** Run `fn` when the page is idle, or soon regardless. */
export const idle = (fn: () => void): void => {
  const w = globalThis as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }
  if (typeof w.requestIdleCallback === 'function') w.requestIdleCallback(fn, { timeout: 600 })
  else setTimeout(fn, 30)
}
const WARM_PARTS: readonly PuppetPart[] = ['torso', 'neck', 'head', 'backlock', 'horn', 'forelock', 'mane', 'tail', 'leg', 'hoof']
const warming = new WeakSet<object>()
const WARM_PLAIN: Record<PuppetWho, object> = { aurora: {}, umbra: {} }

/**
 * Bake a look's pieces AHEAD of their first draw, one piece per idle slice —
 * its plain copies, the far legs and hooves, and the two flash copies. A first
 * draw of a look that nobody warmed bakes all of them at once, which is a
 * visible hitch (measured 170–270 ms per look on a desktop before this pass).
 * Safe to call as often as liked: a look is warmed once, and a piece whose
 * painting has not decoded is simply skipped.
 */
export const warmLook = (who: PuppetWho, look: Look | null): void => {
  const token = look ?? WARM_PLAIN[who]
  if (warming.has(token)) return
  warming.add(token)
  const jobs: [PuppetPart, Variant][] = []
  for (const p of WARM_PARTS) {
    if (look || COAT_OF_BODY.has(p)) jobs.push([p, 'plain'])
    if (p === 'leg' || p === 'hoof') jobs.push([p, 'far'])
  }
  for (const p of WARM_PARTS) jobs.push([p, 'white'], [p, 'red'])
  const next = (): void => {
    const j = jobs.shift()
    if (!j) return
    bakedPart(who, j[0], look, j[1])
    idle(next)
  }
  idle(next)
}

/* ------------------------- one coat, one colour ------------------------ */

/**
 * The pieces that are nothing but coat, and are carried onto the BODY's
 * painted coat before anything else: each is its own painting, and the body
 * re-painted brighter than the legs left a pale body on darker, pinker legs
 * (owner: "the body has a significantly brighter color and does not match the
 * legs"). A recolour already lands every coat piece on one colour; the set as
 * painted needs this. Per-channel gain, so the leg keeps its own light.
 */
const COAT_OF_BODY: ReadonlySet<PuppetPart> = new Set<PuppetPart>(['leg', 'neck'])
const BODY_STAT = new WeakMap<HTMLImageElement, Stat | null>()
const bodyStat = (body: HTMLImageElement): Stat | null => {
  if (BODY_STAT.has(body)) return BODY_STAT.get(body)!
  const W = body.naturalWidth
  const H = body.naturalHeight
  const made = W && H ? canvasOf(W, H) : null
  let st: Stat | null = null
  if (made) {
    made[1].drawImage(body, 0, 0, W, H)
    st = statOf(made[1].getImageData(0, 0, W, H).data, () => true)
  }
  BODY_STAT.set(body, st)
  return st
}
const matchBody = (d: Uint8ClampedArray, body: HTMLImageElement): void => {
  const to = bodyStat(body)
  const st = statOf(d, () => true)
  if (!to || !st) return
  for (let i = 0; i < d.length; i += 4) if (d[i + 3]) gainPx(d, i, st, to.mean, 1)
}

/* ----------------------------- the recolour --------------------------- */

const luma = (r: number, g: number, b: number): number => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255

/** A region's own light: the painted colour's typical lightness above the ink,
 *  its brightest, and its chromaticity. */
interface Stat { ls: number; lmax: number; cr: number; cg: number; mean: RGB }
const HIST = new Uint32Array(256)
const statOf = (d: Uint8ClampedArray, pick: (i: number) => boolean): Stat | null => {
  // Quantiles off a 256-bin histogram of the region's light: sorting every
  // pixel was most of a first bake (a head strip is a quarter of a million).
  HIST.fill(0)
  let count = 0
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3]! < 200 || !pick(i)) continue
    HIST[Math.min(255, Math.round(luma(d[i]!, d[i + 1]!, d[i + 2]!) * 255))]!++
    count++
  }
  if (count < 16) return null
  // The darkest quarter is the ink and the deepest shade; the body of the
  // region is the rest, and its median is "the colour it is painted".
  const q = (f: number): number => {
    const want = Math.min(count - 1, Math.floor(count * f))
    let c = 0
    for (let k = 0; k < 256; k++) {
      c += HIST[k]!
      if (c > want) return k / 255
    }
    return 1
  }
  const lo = q(0.5)
  const hi = q(0.8)
  let sr = 0, sg = 0, n = 0
  let mr = 0, mg = 0, mb = 0
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3]! < 200 || !pick(i)) continue
    const l = luma(d[i]!, d[i + 1]!, d[i + 2]!)
    if (l < lo - 0.002 || l > hi + 0.002) continue
    const s = d[i]! + d[i + 1]! + d[i + 2]! + 1
    sr += d[i]! / s
    sg += d[i + 1]! / s
    mr += d[i]!
    mg += d[i + 1]!
    mb += d[i + 2]!
    n++
  }
  const ls = q(0.62)
  return {
    ls: Math.max(0.04, ls), lmax: Math.max(ls + 0.02, q(0.97)), cr: n ? sr / n : 1 / 3, cg: n ? sg / n : 1 / 3,
    mean: n ? [mr / n / 255, mg / n / 255, mb / n / 255] : [0.5, 0.5, 0.5]
  }
}

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/**
 * Move one pixel's colour onto the target, keeping its light relative to the
 * region's own (`st.ls`). `lite` is the lighter colour hair streaks go to.
 */
const transfer = (d: Uint8ClampedArray, i: number, st: Stat, dark: RGB, lite: RGB, w: number): void => {
  if (w <= 0.001) return
  const r = d[i]!, g = d[i + 1]!, b = d[i + 2]!
  const L = lumAt(i)
  const f = L / st.ls
  let o0: number, o1: number, o2: number
  if (f <= 1) {
    o0 = dark[0] * f; o1 = dark[1] * f; o2 = dark[2] * f
  } else {
    // A floor under the highlight ramp: a pale, flat coat has almost no
    // range above its median, and stretching a 1 % wobble across the whole
    // ramp turned a lossy encode's blocks into a patchwork.
    const s = Math.min(1, (L - st.ls) / Math.max(0.18, st.lmax - st.ls))
    const m0 = dark[0] + (lite[0] - dark[0]) * s
    const m1 = dark[1] + (lite[1] - dark[1]) * s
    const m2 = dark[2] + (lite[2] - dark[2]) * s
    const over = Math.max(0, (L - st.lmax) / Math.max(0.02, 1 - st.lmax)) * 0.6
    o0 = m0 + (1 - m0) * over; o1 = m1 + (1 - m1) * over; o2 = m2 + (1 - m2) * over
  }
  // The INK stays the painter's: far below the region's light, keep the pixel.
  // Judged on the pixel's OWN light — the softened one lets a thin line's
  // brighter neighbours drag it into the recolour.
  const keep = 1 - smooth(0.22, 0.46, luma(r, g, b) / st.ls)
  const k = w * (1 - keep)
  d[i] = r + (o0 * 255 - r) * k
  d[i + 1] = g + (o1 * 255 - g) * k
  d[i + 2] = b + (o2 * 255 - b) * k
}

/**
 * The light a recolour reads, per pixel: the painting's luma, SOFTENED. The
 * slice is a JPEG return compressed to WebP, and in a dark coat its 8-px
 * blocks sit a few levels apart — invisible under the painting's own hue
 * noise, but a recolour lays one flat hue over them and they come up as a
 * checkerboard. A 3×3 mean over the piece's own pixels, with 40 % of the
 * detail put back, keeps the brush and loses the blocks.
 */
let LUM: Float32Array | null = null
/** What the softened light is read from, for `lumAt` to make it on first use:
 *  the gain path never needs it, and it is a pass over every pixel. */
let LUM_OF: { d: Uint8ClampedArray; W: number; H: number } | null = null
const lumAt = (i: number): number => {
  if (!LUM && LUM_OF) LUM = lightOf(LUM_OF.d, LUM_OF.W, LUM_OF.H)
  return LUM ? LUM[i >> 2]! : 0
}
const lightOf = (d: Uint8ClampedArray, W: number, H: number): Float32Array => {
  const n = W * H
  const raw = new Float32Array(n)
  for (let p = 0; p < n; p++) raw[p] = luma(d[p * 4]!, d[p * 4 + 1]!, d[p * 4 + 2]!)
  const out = new Float32Array(n)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = y * W + x
      if (!d[p * 4 + 3]) continue
      let sum = 0
      let c = 0
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy
        if (yy < 0 || yy >= H) continue
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx
          if (xx < 0 || xx >= W || d[(yy * W + xx) * 4 + 3]! < 128) continue
          sum += raw[yy * W + xx]!
          c++
        }
      }
      const m = c ? sum / c : raw[p]!
      out[p] = m + (raw[p]! - m) * 0.4
    }
  }
  return out
}

const recolour = (d: Uint8ClampedArray, W: number, H: number, who: PuppetWho, part: PuppetPart, look: Look): void => {
  LUM = null
  LUM_OF = { d, W, H }
  try {
    recolourIn(d, W, H, who, part, look)
  } finally {
    LUM = null
    LUM_OF = null
  }
}

const recolourIn = (d: Uint8ClampedArray, W: number, H: number, who: PuppetWho, part: PuppetPart, look: Look): void => {
  if (part === 'hoof') {
    if (!look.hoof) return
    const st = statOf(d, () => true)
    if (!st) return
    const lite = liteOf(look.hoof)
    const byGain = gainable(st, look.hoof)
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue
      if (byGain) gainPx(d, i, st, look.hoof, 1)
      else transfer(d, i, st, look.hoof, lite, 1)
    }
    return
  }
  if (part === 'tail' || part === 'mane' || part === 'forelock' || part === 'backlock') {
    if (!look.mane) return
    const st = statOf(d, () => true)
    if (!st) return
    for (let i = 0; i < d.length; i += 4) if (d[i + 3]) transfer(d, i, st, look.mane[0], look.mane[1], 1)
    return
  }
  if (part === 'horn') {
    if (!look.horn) return
    const st = statOf(d, () => true)
    if (!st) return
    const lite: RGB = [look.horn[0] + (1 - look.horn[0]) * 0.5, look.horn[1] + (1 - look.horn[1]) * 0.5, look.horn[2] + (1 - look.horn[2]) * 0.5]
    for (let i = 0; i < d.length; i += 4) if (d[i + 3]) transfer(d, i, st, look.horn, lite, 1)
    return
  }
  // The torso, the neck and the leg are all coat; the hoof is its own piece.
  if (part === 'torso' || part === 'neck' || part === 'leg') {
    if (look.lift) {
      const st = statOf(d, () => true)
      if (st) for (let i = 0; i < d.length; i += 4) if (d[i + 3]) gainPx(d, i, st, look.lift, 1)
      return
    }
    if (!look.coat) return
    const st = statOf(d, () => true)
    if (!st) return
    const lite = liteOf(look.coat)
    const byGain = gainable(st, look.coat)
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue
      if (byGain) gainPx(d, i, st, look.coat, 1)
      else transfer(d, i, st, look.coat, lite, 1)
    }
    return
  }
  // The head: the coat is whatever is close to the coat's own colour and
  // light — never the eyes, the mouth, the blush or the inside of an ear.
  // Where those are (`FACE_MASK`, off the reference's own layout) only a
  // pixel very near the coat's colour is coat; everywhere else the coat's
  // painted SHADE counts too, however warm — the three-quarter heads' shade
  // is the blush's own peach, and left as painted it was a peach patch on
  // the back of every recoloured head.
  const to = look.coat ?? look.lift
  if (!to) return
  const st = statOf(d, () => true)
  if (!st) return
  const lite = liteOf(to)
  const byGain = !look.coat || gainable(st, to)
  const mask = FACE_MASK?.(who, W, H) ?? null
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue
    const r = d[i]!, g = d[i + 1]!, b = d[i + 2]!
    const s = r + g + b + 1
    const dc = Math.hypot(r / s - st.cr, g / s - st.cg)
    const f = luma(r, g, b) / st.ls
    const face = !mask || mask[i >> 2]
    const w = (1 - (face ? smooth(0.03, 0.07, dc) : smooth(0.09, 0.14, dc))) * smooth(0.3, 0.5, f) * (1 - smooth(1.45, 1.8, f))
    if (byGain) gainPx(d, i, st, to, w)
    else transfer(d, i, st, to, lite, w)
  }
}

/**
 * Scale one pixel channel by channel so the region's mean lands on `to`: the
 * painting's own colour texture survives, which is what hides a lossy
 * encode's blocks. The ink, far below the region's light, is kept.
 */
const gainPx = (d: Uint8ClampedArray, i: number, st: Stat, to: RGB, w: number): void => {
  if (w <= 0.001) return
  const f = luma(d[i]!, d[i + 1]!, d[i + 2]!) / st.ls
  const k = w * smooth(0.22, 0.46, f)
  for (let c = 0; c < 3; c++) {
    const gn = Math.max(0.4, Math.min(2.5, to[c]! / Math.max(0.02, st.mean[c]!)))
    d[i + c] = d[i + c]! * (1 + (gn - 1) * k)
  }
}

/**
 * Can `to` be reached from the region's own colour by a per-channel gain
 * without blowing a channel out? Then the gain is used, because it keeps the
 * painting's colour texture; only a big light-to-dark jump (a dark skin on
 * Aurora's cream) needs the flat transfer.
 */
const gainable = (st: Stat, to: RGB): boolean => {
  for (let c = 0; c < 3; c++) {
    const gn = to[c]! / Math.max(0.02, st.mean[c]!)
    if (gn > 2.2 || gn < 0.45) return false
  }
  // Only a change of LIGHT, not of hue: a gain multiplies every pixel's own
  // tint, so moving Umbra's violet onto Briar's bark turned her painting's
  // lilac highlights a hot orange on a brown body with brown legs.
  const ts = to[0] + to[1] + to[2] + 1e-3
  const ms = st.mean[0] + st.mean[1] + st.mean[2] + 1e-3
  return Math.hypot(to[0] / ts - st.mean[0] / ms, to[1] / ts - st.mean[1] / ms) < GAIN_HUE
}
/** How far apart two chromaticities may be for a gain to carry one onto the
 *  other without shifting a painting's highlights to a new hue. */
const GAIN_HUE = 0.045

/** The lit side of a coat: a third of the way to white. */
const liteOf = (c: RGB): RGB => [c[0] + (1 - c[0]) * 0.35, c[1] + (1 - c[1]) * 0.35, c[2] + (1 - c[2]) * 0.35]

/**
 * Where a head painting's own FEATURES are — the eyes, the blush, the inside
 * of the ears, the mouth and the nostril — as a per-pixel mask of the whole
 * strip (1 = a feature may be there). `puppet.ts` draws it off the
 * reference's layout, which the painter follows.
 */
type FaceMask = (who: PuppetWho, W: number, H: number) => Uint8Array | null
let FACE_MASK: FaceMask | null = null
export const setFaceMask = (fn: FaceMask): void => {
  FACE_MASK = fn
}

/** Test seam. */
export const __resetPuppetBakes = (): void => {
  cache.clear()
  cachedPx = 0
  FAST_PLAIN.aurora = {}
  FAST_PLAIN.umbra = {}
}
/** Test seam: the recolour itself, on a raw RGBA buffer. */
export const __recolour = recolour
