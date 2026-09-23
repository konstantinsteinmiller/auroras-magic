/**
 * album/measure.ts — where a creature's ink actually goes, without drawing it.
 *
 * An album cell has to frame a creature that was authored for a 1152 × 672
 * sector, and the only number the sector hands over is the creature's tap
 * radius — a FINGER's target, which says nothing about the size of the
 * drawing. Measured across the cast, the ink reaches anywhere between 0.75
 * and 2.8 times that radius, so one constant either shrinks the small ones to
 * a speck or trims the big ones' heads off.
 *
 * The usual way to find a drawing's box is to rasterise it and read the
 * pixels back — `tapCover.ts` does exactly that for the covers. Sixty
 * readbacks on the frame that opens the album is not a cost this feature may
 * spend, so it does not rasterise anything: the painter is run against a
 * context that implements the whole 2D API as arithmetic, keeping the
 * transform the real one would and writing down every point it is asked to
 * path through. No canvas, no pixels, no readback — a few thousand
 * multiplications per creature, once, and the answer is the geometry itself
 * rather than a sampled picture of it.
 *
 * Control points, not curves: a bezier's handles bound its curve, so the box
 * can only ever be slightly GENEROUS, which is the safe direction for a frame.
 * A clipping path is thrown away rather than counted — a creature that masks
 * itself with a 480-unit rectangle before it draws (chapter 3's pegasus does)
 * has not drawn a 480-unit rectangle.
 */

type G2D = CanvasRenderingContext2D

export interface Box { x: number; y: number; w: number; h: number }

/** `[a, b, c, d, e, f]`, the canvas transform. */
type M = [number, number, number, number, number, number]

/**
 * Every point `draw` inks, in the order it inks them, flattened to x, y pairs.
 *
 * ORDER MATTERS to the caller: a tap creature's painter draws its hiding place,
 * then the creature, then the front of the hiding place again, so the
 * creature's own ink is the stretch in the middle — see `middleBox`.
 */
export const inkPath = (draw: (g: G2D) => void): number[] => {
  const out: number[] = []
  let pending: number[] = []
  let used = false
  const stack: M[] = []
  let m: M = [1, 0, 0, 1, 0, 0]

  const mul = (n: M): void => {
    m = [
      m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
      m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
      m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]
    ]
  }
  const add = (x: number, y: number): void => {
    const px = m[0] * x + m[2] * y + m[4]
    const py = m[1] * x + m[3] * y + m[5]
    if (Number.isFinite(px) && Number.isFinite(py)) pending.push(px, py)
  }
  const corners = (x: number, y: number, w: number, h: number): void => { add(x, y); add(x + w, y + h) }
  /** A rectangle drawn straight to the canvas, with no path of its own. */
  const direct = (x: number, y: number, w: number, h: number): void => {
    const held = pending
    pending = out
    corners(x, y, w, h)
    pending = held
  }
  const commit = (): void => {
    if (used) return
    used = true
    for (const v of pending) out.push(v)
  }
  const nothing = (): void => {}
  const gradient = { addColorStop: nothing }

  const g = {
    save: (): void => { stack.push([...m] as M) },
    restore: (): void => { const p = stack.pop(); if (p) m = p },
    translate: (x: number, y: number): void => mul([1, 0, 0, 1, x, y]),
    scale: (x: number, y: number): void => mul([x, 0, 0, y, 0, 0]),
    rotate: (a: number): void => mul([Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0]),
    transform: (a: number, b: number, c: number, d: number, e: number, f: number): void => mul([a, b, c, d, e, f]),
    setTransform: (...n: unknown[]): void => {
      if (n.length >= 6) m = n.slice(0, 6).map(Number) as M
      else if (n[0] && typeof n[0] === 'object') {
        const t = n[0] as DOMMatrix
        m = [t.a, t.b, t.c, t.d, t.e, t.f]
      } else m = [1, 0, 0, 1, 0, 0]
    },
    resetTransform: (): void => { m = [1, 0, 0, 1, 0, 0] },
    getTransform: () => ({ a: m[0], b: m[1], c: m[2], d: m[3], e: m[4], f: m[5] }),
    beginPath: (): void => { pending = []; used = false },
    closePath: nothing,
    moveTo: add,
    lineTo: add,
    quadraticCurveTo: (a: number, b: number, c: number, d: number): void => { add(a, b); add(c, d) },
    bezierCurveTo: (a: number, b: number, c: number, d: number, e: number, f: number): void => {
      add(a, b)
      add(c, d)
      add(e, f)
    },
    arcTo: (a: number, b: number, c: number, d: number): void => { add(a, b); add(c, d) },
    arc: (x: number, y: number, r: number): void => corners(x - r, y - r, r * 2, r * 2),
    ellipse: (x: number, y: number, rx: number, ry: number): void => corners(x - rx, y - ry, rx * 2, ry * 2),
    rect: corners,
    roundRect: corners,
    fillRect: direct,
    strokeRect: direct,
    clearRect: nothing,
    fill: commit,
    stroke: commit,
    // A mask is not ink. Swallowing the path also closes it, so the next
    // `fill` cannot commit a clip rectangle that was never drawn.
    clip: (): void => { pending = []; used = true },
    // A painted creature blits its sheet instead of pathing itself: the
    // destination rectangle is exactly as much ink as the drawing would be.
    drawImage: (...a: unknown[]): void => {
      if (a.length >= 9) direct(Number(a[5]), Number(a[6]), Number(a[7]), Number(a[8]))
      else if (a.length >= 5) direct(Number(a[1]), Number(a[2]), Number(a[3]), Number(a[4]))
    },
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
    createConicGradient: () => gradient,
    createPattern: () => null,
    setLineDash: nothing,
    getLineDash: (): number[] => [],
    measureText: () => ({ width: 0 }),
    fillText: nothing,
    strokeText: nothing,
    isPointInPath: () => false,
    getImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
    putImageData: nothing,
    canvas: null
  }
  try {
    draw(g as unknown as G2D)
  } catch {
    // A painter that wants something this context does not have keeps what it
    // managed to path; the caller falls back if that is not enough.
  }
  return out
}

/** The box around `pts[from..to)`, or null for an empty stretch. */
export const boxOf = (pts: readonly number[], from = 0, to = pts.length): Box | null => {
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (let i = from; i + 1 < to; i += 2) {
    const x = pts[i]!
    const y = pts[i + 1]!
    if (x < x0) x0 = x
    if (x > x1) x1 = x
    if (y < y0) y0 = y
    if (y > y1) y1 = y
  }
  return x1 >= x0 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null
}

/**
 * What `full` inked that `base` did not: the stretch between the longest
 * shared start and the longest shared end.
 *
 * This is the shape of a tap creature's painter and not a general diff. The
 * painter draws the back of the hiding place, then the creature, then the
 * front of it — so at peek 0 the two cover calls run back to back, and at
 * peek 1 the creature is spliced between them. Head and tail cancel; what is
 * left is the creature. Null when nothing was added (a peek of 0 and a peek
 * of 1 that draw the same thing is not a creature this can frame).
 */
export const middleBox = (base: readonly number[], full: readonly number[]): Box | null => {
  if (full.length <= base.length) return null
  let head = 0
  while (head < base.length && base[head] === full[head]) head++
  head -= head & 1
  let tail = 0
  const max = Math.min(base.length - head, full.length - head)
  while (tail < max && base[base.length - 1 - tail] === full[full.length - 1 - tail]) tail++
  tail -= tail & 1
  return boxOf(full, head, full.length - tail)
}
