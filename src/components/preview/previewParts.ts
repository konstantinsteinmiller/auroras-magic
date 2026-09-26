/**
 * previewParts.ts — how the VS preview's DRAWN chrome becomes pixels.
 *
 * The preview's marks (the two name ribbons, the chapter banner, the VS
 * medallion, a Guardian's crown, the countdown stars, the chapter pips) are
 * each a list of PARTS: a polygon, the paint ROLE it wears, and how heavily it
 * is inked. One list, three readers — the `hpFrame.ts` pattern:
 *
 *   · the DOM (`components/preview/*.vue`) turns it into a small SVG and lays
 *     it on as a CSS background or a 9-slice `border-image` — ONE element per
 *     mark instead of an inline `<svg>` with a dozen children, which is what
 *     keeps the whole preview inside its ~45-node budget;
 *   · the art bench draws the SAME parts on a canvas as the painter's
 *     reference (`drawParts`), thin-inked, at the same box;
 *   · the painting, once it exists, is laid on over that same box, so it
 *     lands exactly where the drawing was (`markBox`).
 *
 * THE PALETTE IS READ FROM THE TOKENS (`readPalette`), never written here: an
 * SVG image cannot see the page's custom properties, so the DOM resolves each
 * role's `--am-*` token once and bakes the value into the image. `theme.sass`
 * stays the one place a colour is decided, and the bench — which runs in the
 * same app, with the same stylesheet — reads the same values.
 *
 * Every shape is a POLYGON (points, not curves), so a mark's extent is its
 * points' extent exactly, and the box the DOM reserves for a painting is the
 * box `artBox.measureBox` will measure on the reference.
 */
export type Pt = readonly [number, number]

export interface Part {
  pts: readonly Pt[]
  /** A paint role; the mark's palette maps it to a colour. */
  paint: string
  /** Outline weight, as a multiple of the mark's line (no outline when absent). */
  ink?: number
  /** An open stroke (a groove, a seam) in the ink colour, not a filled shape. */
  line?: boolean
  /** Only in the DOM's own drawing, never in the painter's reference nor in
   *  the box: the soft plum drop under a mark, which a painting brings for
   *  itself. It must stay inside the box's air. */
  drawnOnly?: boolean
}

export type Palette = Readonly<Record<string, string>>

/* ─────────────────────────────── shape helpers ──────────────────────────── */

const f3 = (v: number): string => (Math.round(v * 1000) / 1000).toString()

/** Closed polygon (or open polyline) as SVG path data — also valid `Path2D`. */
export const pathD = (pts: readonly Pt[], open = false): string =>
  `M${pts.map(([x, y]) => `${f3(x)} ${f3(y)}`).join('L')}${open ? '' : 'Z'}`

export const circlePts = (cx: number, cy: number, r: number, n = 40): Pt[] =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as Pt
  })

export const rectPts = (x0: number, y0: number, x1: number, y1: number): Pt[] =>
  [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]

/**
 * Round a polygon's corners: each vertex with a radius > 0 becomes a short
 * quadratic arc (sampled, so the result is still points). A radius of 0 keeps
 * the corner sharp — the swallow-tail's tips stay pointed, and a mark's
 * extent stays exactly on them.
 */
export const roundPts = (pts: readonly Pt[], radius: number | readonly number[], steps = 4): Pt[] => {
  const out: Pt[] = []
  const n = pts.length
  for (let i = 0; i < n; i++) {
    const p = pts[i]!
    const r = typeof radius === 'number' ? radius : (radius[i] ?? 0)
    if (r <= 0) {
      out.push(p)
      continue
    }
    const a = pts[(i - 1 + n) % n]!
    const b = pts[(i + 1) % n]!
    const la = Math.hypot(a[0] - p[0], a[1] - p[1]) || 1
    const lb = Math.hypot(b[0] - p[0], b[1] - p[1]) || 1
    const ra = Math.min(r, la / 2)
    const rb = Math.min(r, lb / 2)
    const s: Pt = [p[0] + ((a[0] - p[0]) * ra) / la, p[1] + ((a[1] - p[1]) * ra) / la]
    const e: Pt = [p[0] + ((b[0] - p[0]) * rb) / lb, p[1] + ((b[1] - p[1]) * rb) / lb]
    for (let k = 0; k <= steps; k++) {
      const t = k / steps
      const u = 1 - t
      out.push([u * u * s[0] + 2 * u * t * p[0] + t * t * e[0], u * u * s[1] + 2 * u * t * p[1] + t * t * e[1]])
    }
  }
  return out
}

/** Chaikin corner-cutting: a hard polygon in, a soft hand-drawn outline out. */
export const softenPts = (pts: readonly Pt[], rounds = 2): Pt[] => {
  let p: Pt[] = [...pts]
  for (let r = 0; r < rounds; r++) {
    const q: Pt[] = []
    for (let i = 0; i < p.length; i++) {
      const a = p[i]!
      const b = p[(i + 1) % p.length]!
      q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75])
    }
    p = q
  }
  return p
}

/** A five-point star with soft tips — the map's node star, the HP medallion's. */
export const starPts = (cx: number, cy: number, ro: number, ri: number, rounds = 2): Pt[] => {
  const hard: Pt[] = []
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5
    const r = k % 2 ? ri : ro
    hard.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
  }
  return softenPts(hard, rounds)
}

/** The game's four-point twinkle. */
export const sparkPts = (cx: number, cy: number, r: number): Pt[] => {
  const hard: Pt[] = []
  for (let k = 0; k < 8; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 4
    const rr = k % 2 ? r * 0.3 : r
    hard.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr])
  }
  return softenPts(hard, 1)
}

/**
 * A crescent: the lit rim of a disc (`cx, cy, r`) with a second disc
 * (`bx, by, br`) bitten out of it, sampled rather than solved — the part of
 * each rim that lies outside (inside) the other disc, joined up.
 */
export const crescentPts = (cx: number, cy: number, r: number, bx: number, by: number, br: number): Pt[] => {
  const N = 72
  const rim = (ox: number, oy: number, rr: number, keep: (p: Pt) => boolean): Pt[] => {
    const pts = circlePts(ox, oy, rr, N)
    const k = pts.map(keep)
    let s = k.findIndex((v, i) => v && !k[(i - 1 + N) % N])
    if (s < 0) s = 0
    const out: Pt[] = []
    for (let j = 0; j < N; j++) {
      const i = (s + j) % N
      if (k[i]) out.push(pts[i]!)
      else if (out.length) break
    }
    return out
  }
  const outer = rim(cx, cy, r, ([x, y]) => Math.hypot(x - bx, y - by) > br)
  const inner = rim(bx, by, br, ([x, y]) => Math.hypot(x - cx, y - cy) < r)
  const end = outer[outer.length - 1]!
  const near = (p: Pt): number => Math.hypot(p[0] - end[0], p[1] - end[1])
  const back = near(inner[0]!) <= near(inner[inner.length - 1]!) ? inner : [...inner].reverse()
  return [...outer, ...back]
}

export const mirrorX = (pts: readonly Pt[], about: number): Pt[] => pts.map(([x, y]) => [2 * about - x, y] as Pt)
export const shift = (pts: readonly Pt[], dx: number, dy: number): Pt[] => pts.map(([x, y]) => [x + dx, y + dy] as Pt)
export const scalePts = (pts: readonly Pt[], k: number, cx = 0, cy = 0): Pt[] =>
  pts.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k] as Pt)

/* ───────────────────────────────── the box ──────────────────────────────── */

export interface Box { x: number; y: number; w: number; h: number }

/** `artBox.measureBox`'s air round every drawable: 6 % of the longer side. */
export const AIR = 0.06

/**
 * The box a mark is painted into: its parts' extent, plus half the
 * reference's line, plus the air the slicer keeps round every drawable. The
 * DOM reserves exactly this box for the drawing AND for the painting, so the
 * two can be swapped without a pixel of drift.
 */
export const markBox = (parts: readonly Part[], ink: number): Box => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const p of parts) {
    if (p.drawnOnly) continue
    for (const [x, y] of p.pts) {
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  }
  x0 -= ink / 2; y0 -= ink / 2; x1 += ink / 2; y1 += ink / 2
  const pad = Math.max(x1 - x0, y1 - y0) * AIR
  return { x: x0 - pad, y: y0 - pad, w: x1 - x0 + 2 * pad, h: y1 - y0 + 2 * pad }
}

/* ──────────────────────────────── the palette ───────────────────────────── */

/** Paint role → the `--am-*` token that colours it. */
export type TokenMap = Readonly<Record<string, string>>

const resolved = new WeakMap<TokenMap, Record<string, string>>()

/**
 * A mark's palette, read from its tokens on `:root` — once per map, since the
 * theme never changes under a running game. Returns null where there is no
 * stylesheet to read (a unit test, SSR): the caller then draws nothing rather
 * than guessing a colour.
 */
export const readPalette = (map: TokenMap): Palette | null => {
  const hit = resolved.get(map)
  if (hit) return hit
  if (typeof document === 'undefined' || typeof getComputedStyle !== 'function') return null
  const cs = getComputedStyle(document.documentElement)
  const out: Record<string, string> = {}
  for (const [role, token] of Object.entries(map)) {
    const v = cs.getPropertyValue(token).trim()
    if (!v) return null
    out[role] = v
  }
  resolved.set(map, out)
  return out
}

/* ─────────────────────────────── the two renders ────────────────────────── */

/**
 * The parts as a standalone SVG document over `box`, inked at `ink` (units
 * of the mark). Sized `px` per unit so the image has an intrinsic size — a
 * `border-image-slice` in % is a share of it.
 */
export const partsSvg = (parts: readonly Part[], box: Box, pal: Palette, ink: number, px = 100): string => {
  const body = parts.map((p) => {
    const d = pathD(p.pts, p.line)
    if (p.line) {
      return `<path d="${d}" fill="none" stroke="${pal.ink}" stroke-width="${f3(ink * (p.ink ?? 1))}" stroke-linecap="round" stroke-linejoin="round"/>`
    }
    const stroke = p.ink ? ` stroke="${pal.ink}" stroke-width="${f3(ink * p.ink)}" stroke-linejoin="round"` : ''
    return `<path d="${d}" fill="${pal[p.paint] ?? 'none'}"${stroke}/>`
  }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f3(box.x)} ${f3(box.y)} ${f3(box.w)} ${f3(box.h)}" width="${f3(box.w * px)}" height="${f3(box.h * px)}">${body}</svg>`
}

/** An SVG document as a CSS `url()`. */
export const svgUrl = (svg: string): string => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`

/** The painter's line: thin on purpose — `hpFrame`'s REF_INK, the creature
 *  lesson that an evenly inked reference comes back an evenly inked sticker. */
export const REF_INK = 0.013

/** The parts on a canvas, in local units at the current transform: the art
 *  bench's reference, from the very same polygons the DOM draws. */
export const drawParts = (g: CanvasRenderingContext2D, parts: readonly Part[], pal: Palette, ink = REF_INK): void => {
  g.save()
  g.lineJoin = 'round'
  g.lineCap = 'round'
  for (const p of parts) {
    if (p.drawnOnly) continue
    const path = new Path2D(pathD(p.pts, p.line))
    if (p.line) {
      g.lineWidth = ink * (p.ink ?? 1)
      g.strokeStyle = pal.ink ?? 'transparent'
      g.stroke(path)
      continue
    }
    g.fillStyle = pal[p.paint] ?? 'transparent'
    g.fill(path)
    if (p.ink) {
      g.lineWidth = ink * p.ink
      g.strokeStyle = pal.ink ?? 'transparent'
      g.stroke(path)
    }
  }
  g.restore()
}
