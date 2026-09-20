/**
 * pageDecor.ts — what is printed on a chapter page BEHIND its story beats
 * (story-spec §8.28, §8.31).
 *
 * The page was a blank cream card with a coloured hill along its foot, and
 * everything between the two read as empty paper. This is what fills it —
 * without ever competing with the beat cards, which are the only thing on a
 * page a child is meant to look at.
 *
 * Three quiet layers, in this order:
 *
 *   1. **the light on the paper** — a warm bloom off the head of the page and
 *      a shadow settling into the binding, so the card reads as a sheet lying
 *      in a book rather than a flat swatch;
 *   2. **marginalia** — the chapter's own world drawn as thin ink lines on
 *      the paper, the way a picture book fills its endpapers: clouds and
 *      birds over the Woods, bubbles and shells over the Bay, snowflakes and
 *      pines over the Tundra. Ten sets, one per chapter (§8.31's table);
 *   3. **paper grain** — a fine fibre tile over the whole page, hills
 *      included, because paper shows through the ink printed on it.
 *
 * ALL THREE ARE BAKED, once per page size, and the map blits the result
 * (`thumbOf`'s pattern next door). They are three FULL-PAGE composites — a
 * pattern fill and two gradients — and drawing them live cost a restored
 * chapter page half its frame rate: 33 ms a frame against 16 ms with the
 * layer off, measured in a throttled browser. As one image it is a single
 * `drawImage`. Nothing in here moves, so there is nothing to lose by baking.
 *
 * THE RULE THE WHOLE FILE EXISTS TO KEEP: marginalia is furniture, not
 * content. It is drawn in one ink colour at `INK_A` alpha (a tenth), never
 * animated, never coloured, and never placed where it could be mistaken for
 * something to tap. Every motif is rejection-sampled against the page's beat
 * cards, their badges, the binding, the folded corners and the page dots, and
 * a motif that cannot find a clear spot is simply not drawn. Seeded per
 * chapter, so a page looks the same every time it is opened.
 */
import { seeded, sin, cos, TAU, PI } from '@/game/duel/util'
import { makeCanvas } from '@/game/restore/dust'

type G2D = CanvasRenderingContext2D

/** The page's ink, as everywhere else in the book. */
const INK = '#3A2340'
/** Marginalia alpha on a built page, and on a sleeping one. */
const INK_A = 0.1
const INK_A_ASLEEP = 0.07

export interface KeepOut { x: number; y: number; r: number }

/* ------------------------------------------------------------ the motifs */

/**
 * Every motif draws into a unit circle at the origin and STROKES ONLY — the
 * caller owns the colour, the width, the alpha and the transform. Nothing
 * here fills, because a filled shape at this alpha reads as a smudge while a
 * line reads as a drawing.
 */
type Motif = (g: G2D) => void

const arc = (g: G2D, x: number, y: number, r: number, a0: number, a1: number): void => {
  g.beginPath()
  g.arc(x, y, r, a0, a1)
  g.stroke()
}

/** A lumpy little cloud. */
const mCloud: Motif = (g) => {
  g.beginPath()
  g.arc(-0.45, 0.1, 0.42, PI * 0.5, PI * 1.9)
  g.arc(0.05, -0.25, 0.55, PI * 1.15, PI * 1.85)
  g.arc(0.55, 0.08, 0.4, PI * 1.6, PI * 0.5)
  g.lineTo(-0.45, 0.5)
  g.stroke()
}

/** A gull, the two-stroke kind every child draws. */
const mBird: Motif = (g) => {
  g.beginPath()
  g.moveTo(-0.9, 0.1)
  g.quadraticCurveTo(-0.45, -0.45, 0, 0.05)
  g.quadraticCurveTo(0.45, -0.45, 0.9, 0.1)
  g.stroke()
}

/** A four-point twinkle. */
const mStar: Motif = (g) => {
  g.beginPath()
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU
    const b = a + TAU / 8
    g.lineTo(cos(a), sin(a))
    g.lineTo(cos(b) * 0.3, sin(b) * 0.3)
  }
  g.closePath()
  g.stroke()
}

/** A twinkle: the same four points pinched to a needle waist, so it reads as
 *  a sparkle beside `mStar` rather than as a plus sign. */
const mSpark: Motif = (g) => {
  g.beginPath()
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU
    const b = a + TAU / 8
    g.lineTo(cos(a), sin(a))
    g.lineTo(cos(b) * 0.14, sin(b) * 0.14)
  }
  g.closePath()
  g.stroke()
}

/** Six spokes with their little forks. */
const mFlake: Motif = (g) => {
  g.beginPath()
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU
    const [dx, dy] = [cos(a), sin(a)]
    g.moveTo(0, 0)
    g.lineTo(dx, dy)
    for (const s of [1, -1]) {
      const b = a + s * 0.7
      g.moveTo(dx * 0.6, dy * 0.6)
      g.lineTo(dx * 0.6 + cos(b) * 0.38, dy * 0.6 + sin(b) * 0.38)
    }
  }
  g.stroke()
}

/** A leaf with its midrib. */
const mLeaf: Motif = (g) => {
  g.beginPath()
  g.moveTo(-0.9, 0.3)
  g.quadraticCurveTo(-0.1, -1, 0.9, -0.3)
  g.quadraticCurveTo(-0.1, 0.5, -0.9, 0.3)
  g.stroke()
  g.beginPath()
  g.moveTo(-0.9, 0.3)
  g.quadraticCurveTo(0, -0.2, 0.9, -0.3)
  g.stroke()
}

/** Bubbles: a big one with its highlight and a little one drifting beside it
 *  — one lone circle at this size reads as a circle, not as a bubble. */
const mBubble: Motif = (g) => {
  arc(g, -0.12, 0.1, 0.78, 0, TAU)
  arc(g, -0.12, 0.1, 0.48, PI * 1.05, PI * 1.5)
  arc(g, 0.72, -0.62, 0.3, 0, TAU)
}

/** A crystal: a tall six-sided stone. */
const mCrystal: Motif = (g) => {
  g.beginPath()
  g.moveTo(0, -1)
  g.lineTo(0.5, -0.35)
  g.lineTo(0.42, 0.85)
  g.lineTo(-0.42, 0.85)
  g.lineTo(-0.5, -0.35)
  g.closePath()
  g.stroke()
  g.beginPath()
  g.moveTo(-0.5, -0.35)
  g.lineTo(0.5, -0.35)
  g.moveTo(0, -1)
  g.lineTo(0, 0.85)
  g.stroke()
}

/** A rainbow arc, three bands of it. */
const mArc: Motif = (g) => {
  for (let i = 0; i < 3; i++) arc(g, 0, 0.5, 1 - i * 0.22, PI, TAU)
}

/** A crescent. */
const mMoon: Motif = (g) => {
  g.beginPath()
  g.arc(0, 0, 0.9, PI * 0.35, PI * 1.65, false)
  g.arc(0.38, -0.1, 0.72, PI * 1.5, PI * 0.5, true)
  g.closePath()
  g.stroke()
}

/** A sun with its rays. */
const mSun: Motif = (g) => {
  arc(g, 0, 0, 0.5, 0, TAU)
  g.beginPath()
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU
    g.moveTo(cos(a) * 0.72, sin(a) * 0.72)
    g.lineTo(cos(a), sin(a))
  }
  g.stroke()
}

/** A little pine, three tiers on a trunk. */
const mPine: Motif = (g) => {
  for (let i = 0; i < 3; i++) {
    const y = -0.75 + i * 0.5
    const wd = 0.25 + i * 0.28
    g.beginPath()
    g.moveTo(0, y)
    g.lineTo(wd, y + 0.55)
    g.lineTo(-wd, y + 0.55)
    g.closePath()
    g.stroke()
  }
  g.beginPath()
  g.moveTo(0, 0.8)
  g.lineTo(0, 1)
  g.stroke()
}

/** A swag of bunting, three flags on it. */
const mBunting: Motif = (g) => {
  g.beginPath()
  g.moveTo(-1, -0.45)
  g.quadraticCurveTo(0, 0.35, 1, -0.45)
  g.stroke()
  for (let i = 0; i < 3; i++) {
    const t = 0.25 + i * 0.25
    const bx = -1 + 2 * t
    const by = -0.45 + (0.35 + 0.45) * 2 * t * (1 - t)
    g.beginPath()
    g.moveTo(bx - 0.22, by)
    g.lineTo(bx + 0.22, by)
    g.lineTo(bx, by + 0.5)
    g.closePath()
    g.stroke()
  }
}

/** A balloon on its string. */
const mBalloon: Motif = (g) => {
  g.beginPath()
  g.ellipse(0, -0.35, 0.5, 0.6, 0, 0, TAU)
  g.stroke()
  g.beginPath()
  g.moveTo(0, 0.25)
  g.quadraticCurveTo(0.22, 0.65, 0, 1)
  g.stroke()
}

/** A whisper: a curl of air. */
const mSwirl: Motif = (g) => {
  g.beginPath()
  g.moveTo(-1, 0.35)
  g.quadraticCurveTo(0.1, 0.35, 0.45, -0.05)
  g.quadraticCurveTo(0.78, -0.45, 0.4, -0.6)
  g.quadraticCurveTo(0.05, -0.7, 0.12, -0.28)
  g.stroke()
}

/** Two wave curls. */
const mWave: Motif = (g) => {
  for (let i = 0; i < 2; i++) {
    const y = -0.25 + i * 0.5
    g.beginPath()
    g.moveTo(-1, y)
    g.quadraticCurveTo(-0.5, y - 0.45, 0, y)
    g.quadraticCurveTo(0.5, y + 0.45, 1, y)
    g.stroke()
  }
}

/** A fan shell. */
const mShell: Motif = (g) => {
  g.beginPath()
  g.arc(0, 0.6, 0.95, PI * 1.08, PI * 1.92)
  g.closePath()
  g.stroke()
  g.beginPath()
  for (let i = 1; i < 4; i++) {
    const a = PI * (1.08 + (0.84 * i) / 4)
    g.moveTo(0, 0.6)
    g.lineTo(cos(a) * 0.9, 0.6 + sin(a) * 0.9)
  }
  g.stroke()
}

/** A drop. */
const mDrop: Motif = (g) => {
  g.beginPath()
  g.moveTo(0, -1)
  g.quadraticCurveTo(0.75, -0.05, 0.5, 0.45)
  g.quadraticCurveTo(0, 1.15, -0.5, 0.45)
  g.quadraticCurveTo(-0.75, -0.05, 0, -1)
  g.stroke()
}

/** A peak with a snow line. */
const mPeak: Motif = (g) => {
  g.beginPath()
  g.moveTo(-1, 0.7)
  g.lineTo(-0.15, -0.8)
  g.lineTo(0.35, -0.05)
  g.lineTo(0.6, -0.4)
  g.lineTo(1, 0.7)
  g.closePath()
  g.stroke()
  g.beginPath()
  g.moveTo(-0.5, 0.1)
  g.lineTo(-0.28, -0.2)
  g.lineTo(-0.15, -0.05)
  g.lineTo(0, -0.35)
  g.lineTo(0.15, 0.1)
  g.stroke()
}

/** A heart. */
const mHeart: Motif = (g) => {
  g.beginPath()
  g.moveTo(0, 0.85)
  g.quadraticCurveTo(-1.1, 0.05, -0.5, -0.6)
  g.quadraticCurveTo(-0.1, -0.95, 0, -0.35)
  g.quadraticCurveTo(0.1, -0.95, 0.5, -0.6)
  g.quadraticCurveTo(1.1, 0.05, 0, 0.85)
  g.stroke()
}

/* --------------------------------------------------- one set per chapter */

/**
 * The chapter's own world, in the order the pages come (§8.31). The weights
 * are how often a motif is picked, so the first one in a set is the page's
 * signature and the rest are its company.
 */
const SETS: readonly (readonly (readonly [Motif, number])[])[] = [
  [[mCloud, 3], [mBird, 2], [mLeaf, 3], [mSwirl, 2]], // Whispering Woods
  [[mBubble, 4], [mWave, 2], [mShell, 2], [mBird, 2]], // Bubble Bay
  [[mCloud, 4], [mBird, 3], [mStar, 1], [mSwirl, 2]], // Cloud Kingdom
  [[mCrystal, 3], [mDrop, 3], [mSpark, 3]], // Crystal Caves
  [[mPeak, 2], [mFlake, 2], [mDrop, 2], [mSpark, 3]], // Mirror Mountains
  [[mArc, 2], [mCloud, 2], [mSpark, 3], [mHeart, 2]], // Rainbow Ridge
  [[mSun, 2], [mSwirl, 3], [mShell, 2], [mSpark, 2]], // Sunken Sands
  [[mFlake, 4], [mPine, 2], [mStar, 2], [mCloud, 1]], // Twilight Tundra
  [[mStar, 3], [mMoon, 1], [mSpark, 4], [mPeak, 1]], // Starlight Summit
  [[mBunting, 2], [mBalloon, 3], [mHeart, 2], [mSpark, 3]] // Friendship Festival
]

/** A sleeping page dreams in stars, whatever chapter it will become. */
const ASLEEP: readonly (readonly [Motif, number])[] = [[mStar, 2], [mSpark, 4], [mCloud, 2]]

const pick = (set: readonly (readonly [Motif, number])[], r: () => number): Motif => {
  let total = 0
  for (const [, wgt] of set) total += wgt
  let k = r() * total
  for (const [m, wgt] of set) {
    k -= wgt
    if (k <= 0) return m
  }
  return set[0]![0]
}

/* ------------------------------------------------------------ paper grain */

const GRAIN_PX = 128
let grain: HTMLCanvasElement | null = null

/**
 * A seamless fibre tile: fine speckle with a faint horizontal lie to it, in
 * the page's ink. Laid into the bake as a repeating pattern at DEVICE
 * resolution, so the fibre is 1:1 with the screen's pixels rather than
 * stretched with the page.
 */
const grainTile = (): HTMLCanvasElement => {
  if (grain) return grain
  const c = makeCanvas(GRAIN_PX, GRAIN_PX)
  const g = c.getContext('2d')
  if (!g) return (grain = c)
  const img = g.createImageData(GRAIN_PX, GRAIN_PX)
  const r = seeded(4211)
  for (let y = 0; y < GRAIN_PX; y++) {
    // The fibre: a slow horizontal band the speckle sits on.
    const band = 0.5 + 0.5 * sin(y * 0.7) * sin(y * 0.19 + 1.3)
    for (let x = 0; x < GRAIN_PX; x++) {
      const k = (y * GRAIN_PX + x) * 4
      img.data[k] = 0x3a
      img.data[k + 1] = 0x23
      img.data[k + 2] = 0x40
      img.data[k + 3] = Math.round(10 + r() * 26 + band * 12)
    }
  }
  g.putImageData(img, 0, 0)
  return (grain = c)
}

/** The fibre over the whole page, hills and all. */
const drawPaperGrain = (g: G2D, w: number, h: number, alpha: number): void => {
  const pat = g.createPattern(grainTile(), 'repeat')
  if (!pat) return
  g.save()
  g.globalAlpha = alpha
  g.fillStyle = pat
  g.fillRect(0, 0, w, h)
  g.restore()
}

/* ------------------------------------------------------- the light on it */

/** A warm bloom off the head of the page, and the binding's own shadow down
 *  its spine edge — the depth a flat swatch was missing. */
const drawPaperLight = (g: G2D, w: number, h: number, built: boolean): void => {
  const head = g.createLinearGradient(0, 0, 0, h * 0.75)
  head.addColorStop(0, built ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.35)')
  head.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = head
  g.fillRect(0, 0, w, h * 0.75)
  const spine = g.createLinearGradient(0, 0, w * 0.16, 0)
  spine.addColorStop(0, 'rgba(58,35,64,0.16)')
  spine.addColorStop(1, 'rgba(58,35,64,0)')
  g.fillStyle = spine
  g.fillRect(0, 0, w * 0.16, h)
}

/* ------------------------------------------------------------ the scatter */

/**
 * Marginalia for chapter `c` on a page `w` × `h` CSS px, in PAGE-LOCAL
 * coordinates (0, 0 is the page's own top-left corner) so the same drawing
 * serves the page wherever it sits on screen.
 *
 * `keepOut` is every circle the page already spends on something a child
 * looks at — a beat card and its badge; `ground` is the y (or, in portrait,
 * the x) past which the coloured hills begin, since marginalia is printed on
 * PAPER and never over the biome wash.
 *
 * Exported for `tests/ui/pageDecor.test.ts`, which records where each motif
 * lands; the map itself goes through `pageDecorBake`.
 */
export const drawPageDecor = (
  g: G2D, w: number, h: number,
  c: number, built: boolean, portrait: boolean,
  keepOut: readonly KeepOut[], ground: number
): void => {
  g.save()
  const set = built ? SETS[c] ?? SETS[0]! : ASLEEP
  const r = seeded(1700 + c * 37 + (portrait ? 11 : 0))
  const unit = Math.min(w, h)
  // A page carries about the same amount of drawing whatever its shape: the
  // count is off the page's area, not its width, so portrait does not thin out.
  const n = Math.round(13 + (w * h) / (unit * unit) * 5)
  const margin = unit * 0.075
  const placed: KeepOut[] = []
  g.strokeStyle = INK
  g.globalAlpha = built ? INK_A : INK_A_ASLEEP
  g.lineCap = 'round'
  g.lineJoin = 'round'
  for (let i = 0; i < n; i++) {
    const s = unit * (0.04 + r() * 0.05)
    let mx = 0
    let my = 0
    let ok = false
    for (let tries = 0; tries < 20 && !ok; tries++) {
      mx = margin + r() * (w - margin * 2)
      my = margin + r() * (h - margin * 2)
      // Paper only: the hills own the foot of the page (its side, in portrait).
      if (portrait ? mx < ground : my > ground) continue
      ok = true
      for (const k of keepOut) if (Math.hypot(mx - k.x, my - k.y) < k.r + s) { ok = false; break }
      if (ok) for (const k of placed) if (Math.hypot(mx - k.x, my - k.y) < k.r + s + unit * 0.045) { ok = false; break }
    }
    // A page with no room left simply carries fewer drawings.
    if (!ok) continue
    placed.push({ x: mx, y: my, r: s })
    g.save()
    g.translate(mx, my)
    g.rotate((r() - 0.5) * 0.5)
    g.scale(s, s)
    g.lineWidth = (1.6 + r() * 0.9) / s
    pick(set, r)(g)
    g.restore()
  }
  g.restore()
}

/* -------------------------------------------------------------- the bake */

/** How many baked pages to keep: the one on screen, the one showing under it
 *  during a turn, and one spare for the way back. */
const CACHE = 3
/** Device pixels per CSS pixel to bake at. Past 2 the fibre is finer than
 *  anyone can see and the canvas is four times the memory. */
const MAX_DPR = 2
const bakes = new Map<string, HTMLCanvasElement>()

/**
 * The whole decor layer for one page, as an image to blit at (0, 0, w, h).
 *
 * Keyed by everything that changes it — the chapter, whether it is awake, the
 * orientation and the page's own size — so it is drawn once and then only
 * again on a resize. Nothing in the layer is animated, which is what makes
 * this sound.
 */
export const pageDecorBake = (
  w: number, h: number, c: number, built: boolean, portrait: boolean,
  keepOut: readonly KeepOut[], ground: number
): HTMLCanvasElement => {
  const dpr = Math.min(MAX_DPR, Math.max(1, typeof devicePixelRatio === 'number' ? devicePixelRatio : 1))
  const key = `${c}:${built ? 1 : 0}:${portrait ? 1 : 0}:${Math.round(w)}x${Math.round(h)}@${dpr}`
  const hit = bakes.get(key)
  if (hit) return hit
  console.info('[decor] BAKE ' + key)
  const cv = makeCanvas(w * dpr, h * dpr)
  const g = cv.getContext('2d')
  if (g) {
    g.scale(dpr, dpr)
    drawPaperLight(g, w, h, built)
    drawPageDecor(g, w, h, c, built, portrait, keepOut, ground)
    // The fibre goes on last: paper shows through the ink printed on it.
    g.setTransform(1, 0, 0, 1, 0, 0)
    drawPaperGrain(g, cv.width, cv.height, built ? 0.5 : 0.35)
  }
  // Oldest out first — a `Map` iterates in insertion order.
  if (bakes.size >= CACHE) {
    const oldest = bakes.keys().next().value
    if (oldest !== undefined) bakes.delete(oldest)
  }
  bakes.set(key, cv)
  return cv
}
