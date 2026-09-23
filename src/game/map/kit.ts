/**
 * kit.ts — the painter's kit every sector is composed from (story-spec §9.14:
 * ONE generator family plus data, not a bespoke painter per sector).
 *
 * Style (art-style.md §2–§5): flat cel fills, one confident plum outline on
 * everything mid- and foreground, soft gradients only in skies and far
 * hills (which are lighter, bluer and unoutlined). Every base tone clears the
 * candy floor (§9.6.1): saturation ≥ 70 %, lightness 55–75 %.
 *
 * Space: sector units (SU), 1152 × 672. Every painter is deterministic —
 * scatters come from `seeded()` — so a re-bake reproduces the same meadow.
 */
import { SEC_W, SEC_H } from '@/game/restore/mask'
import { seeded, TAU, PI, sin, cos } from '@/game/duel/util'
import { drawItem, type ItemSpec } from '@/game/artItem'
import { PROP_ART } from '@/game/artIds'

export type G2D = CanvasRenderingContext2D

export const INK = '#3A2340'
const LW = 5

/** A paint pot of a biome (§8.7): base, shade, light. */
export interface Pot { id: string; base: string; shade: string; lite: string }

/** Whispering Woods' three pots (chapter 1). */
export const WOODS_POTS: readonly Pot[] = [
  { id: 'rose', base: '#ff6fa8', shade: '#d9468c', lite: '#ffb3d2' },
  { id: 'sunflower', base: '#ffc83d', shade: '#e8973a', lite: '#ffe89a' },
  { id: 'bluebell', base: '#6d8bff', shade: '#5160d6', lite: '#b8c6ff' }
]

/** Bubble Bay's three pots (chapter 2). */
export const BAY_POTS: readonly Pot[] = [
  { id: 'coral', base: '#ff7a8a', shade: '#e0566e', lite: '#ffc0c8' },
  { id: 'lagoon', base: '#3ee3d4', shade: '#20b3b0', lite: '#a8f5ee' },
  { id: 'sunshell', base: '#ffc94d', shade: '#e8a23a', lite: '#ffe8a3' }
]

/** Cloud Kingdom's three pots (chapter 3). */
export const SKY_POTS: readonly Pot[] = [
  { id: 'lavender', base: '#a27bff', shade: '#7f5ae0', lite: '#dccbff' },
  { id: 'skyblue', base: '#5cb8ff', shade: '#3d8fe0', lite: '#b8e2ff' },
  { id: 'sunrise', base: '#ff9f5a', shade: '#e57a3c', lite: '#ffd2a8' }
]

/** Crystal Caves' three pots (chapter 4). */
export const CAVE_POTS: readonly Pot[] = [
  { id: 'amethyst', base: '#b06bff', shade: '#8a45e0', lite: '#dcc0ff' },
  { id: 'aquamarine', base: '#3ee8d6', shade: '#1fb8b0', lite: '#aef7ef' },
  { id: 'rosequartz', base: '#ff7aa8', shade: '#e0527f', lite: '#ffc2d8' }
]

/** Mirror Mountains' three pots (chapter 5). */
export const MIRROR_POTS: readonly Pot[] = [
  { id: 'silverblue', base: '#7fa8ff', shade: '#5a80e0', lite: '#c8dbff' },
  { id: 'mintglass', base: '#4fe8a8', shade: '#2fbf82', lite: '#b8f7da' },
  { id: 'peach', base: '#ff9f7a', shade: '#e07852', lite: '#ffd4c2' }
]

/** Rainbow Ridge's three pots (chapter 6). */
export const RIDGE_POTS: readonly Pot[] = [
  { id: 'cherry', base: '#ff5a78', shade: '#e03a58', lite: '#ffb8c6' },
  { id: 'tangerine', base: '#ffa53d', shade: '#e07f1f', lite: '#ffd9a3' },
  { id: 'lime', base: '#8fe04a', shade: '#6bb82e', lite: '#d0f5a8' }
]

/** Sunken Sands' three pots (chapter 7). */
export const SANDS_POTS: readonly Pot[] = [
  { id: 'terracotta', base: '#ff7f5c', shade: '#e05a3a', lite: '#ffc4b0' },
  { id: 'turquoise', base: '#33d6e0', shade: '#1faab8', lite: '#aef0f5' },
  { id: 'saffron', base: '#ffc233', shade: '#e09a1f', lite: '#ffe3a0' }
]

/** Twilight Tundra's three pots (chapter 8). */
export const TUNDRA_POTS: readonly Pot[] = [
  { id: 'icicle', base: '#6fd0ff', shade: '#45a4e0', lite: '#c4ecff' },
  { id: 'auroragreen', base: '#52e89a', shade: '#2fbf74', lite: '#bdf7d8' },
  { id: 'berry', base: '#d06bff', shade: '#a845e0', lite: '#ecc4ff' }
]

/** Starlight Summit's three pots (chapter 9). */
export const SUMMIT_POTS: readonly Pot[] = [
  { id: 'stargold', base: '#ffd84d', shade: '#e8b030', lite: '#fff0a8' },
  { id: 'midnight', base: '#7078ff', shade: '#4f55e0', lite: '#c4c8ff' },
  { id: 'cosmicpink', base: '#ff6fd0', shade: '#e04aab', lite: '#ffc4ec' }
]

/** Friendship Festival's three pots (chapter 10). */
export const FESTIVAL_POTS: readonly Pot[] = [
  { id: 'candypink', base: '#ff7ab8', shade: '#e05593', lite: '#ffc6e0' },
  { id: 'lemon', base: '#ffe14d', shade: '#e8bb2a', lite: '#fff3a8' },
  { id: 'mint', base: '#5ce0a8', shade: '#35b884', lite: '#c0f5de' }
]

export const C = {
  skyTop: '#6cc4ff',
  skyLow: '#ffd3ea',
  sun: '#ffe36b',
  farHill: '#a9e8d6',
  farHill2: '#8fdcc4',
  moss: '#6ee84a',
  mossShade: '#4fb84a',
  mossLip: '#c9f57a',
  meadow: '#5ee03c',
  canopy: '#52e25e',
  canopyShade: '#35b85a',
  canopyLite: '#a8f37c',
  pine: '#3fcf6a',
  pineShade: '#2aa55a',
  trunk: '#c98a5a',
  trunkShade: '#9a6446',
  path: '#ffd46a',
  pathShade: '#f0b152',
  wall: '#fff1d6',
  wallShade: '#f0d2c0',
  door: '#e0915a',
  window: '#7fd3ff',
  mill: '#fff6e4',
  millShade: '#ecd6c4',
  millCap: '#ff8fc4',
  pond: '#4fc8ff',
  pondLite: '#b4ecff',
  lily: '#56d86a',
  cap: '#ff5a74',
  stone: '#cfc6e0',
  stoneShade: '#a99dc0',
  flowerPink: '#ff7fbf',
  flowerYellow: '#ffd34d',
  flowerLilac: '#a77cff',
  fence: '#fff6e4'
}

/** Base tones the candy floor applies to (tested). */
export const BASE_TONES: readonly string[] = [
  C.moss, C.meadow, C.canopy, C.pine, C.pond, C.cap, C.flowerPink, C.flowerYellow, C.flowerLilac,
  ...WOODS_POTS.map((p) => p.base)
]

/* ---------------------------------------------------------------- helpers */

/**
 * How heavy every kit line is, against what the sectors were authored with.
 *
 * The props are drawn ON TOP of the painted sectors, and a sector unit is
 * about 1.7 device px on a laptop — so the authored 5 SU contour landed as a
 * ~9 px band of flat plum over soft brushwork, which is what made the swing,
 * the lanterns and the mushrooms read as stickers stuck on a painting.
 *
 * Applied inside `ink` rather than by editing ~530 call sites, so the
 * explicit weights each shape passes (2, 2.4, 3.5 …) keep their RELATIVE
 * hierarchy and the whole vocabulary thins together. `art-style.md` §2's
 * amendment: the painted line varies and fades, and the drawn line cannot,
 * but it can at least stop shouting.
 */
const INK_SCALE = 0.68

/**
 * A second, TEMPORARY thinning, for a REFERENCE only — never for the game.
 *
 * `art-style.md` §2 keeps asking for a line that varies and fades, and three
 * returns in a row came back ringed at one weight anyway. They were obeying
 * the picture in front of them: `kit.ts` contours every shape it draws, so a
 * reference arrives evenly inked, and a painter traces ink. Words cannot win
 * that argument — the front page only stopped being traced once its knoll was
 * drawn WITHOUT a line, and the creatures are the same case.
 *
 * So the bench thins the reference's ink to a guide (`artDraw.renderItemSheet`
 * sets it around a creature sheet and puts it back), leaving the shapes and
 * their overlaps to say where a line belongs. `measureFit` renders through
 * the same function, so the fit it reports is the fit the painter sees.
 */
let INK_REF = 1
export const setRefInk = (k: number): void => { INK_REF = k }
/** The factor a caller that strokes its own line must apply to match `ink`. */
export const refInk = (): number => INK_REF

export const ink = (g: G2D, w = LW): void => {
  g.lineWidth = w * INK_SCALE * INK_REF
  g.strokeStyle = INK
  g.lineJoin = 'round'
  g.lineCap = 'round'
  g.stroke()
}
export const fill = (g: G2D, c: string): void => {
  g.fillStyle = c
  g.fill()
}

type Lobe = readonly [number, number, number]

/** A soft lumpy blob — clouds, canopies, bushes. */
export const blob = (g: G2D, lobes: readonly Lobe[]): void => {
  g.beginPath()
  for (const [x, y, r] of lobes) {
    g.moveTo(x + r, y)
    g.arc(x, y, r, 0, TAU)
  }
}

/** A lumpy shape outlined ONCE around its union (the arena's cloud trick):
 *  the plum laid down grown by a line width, the fill on top. */
export const lumpy = (g: G2D, lobes: readonly Lobe[], colour: string, w = LW): void => {
  // Grown, not stroked — so it takes `INK_SCALE` here or the canopies and
  // bushes would keep their heavy band while every other shape thinned.
  blob(g, lobes.map(([x, y, r]) => [x, y, r + w * INK_SCALE] as const))
  fill(g, INK)
  blob(g, lobes)
  fill(g, colour)
}

/** A five-petal flower, petals + centre, outlined. */
export const flower = (g: G2D, x: number, y: number, r: number, petal: string, rot: number): void => {
  g.beginPath()
  for (let i = 0; i < 5; i++) {
    const a = rot + (i * TAU) / 5
    g.moveTo(x + cos(a) * r * 0.62 + r * 0.46, y + sin(a) * r * 0.62)
    g.arc(x + cos(a) * r * 0.62, y + sin(a) * r * 0.62, r * 0.46, 0, TAU)
  }
  fill(g, petal)
  ink(g, 2.4)
  g.beginPath()
  g.arc(x, y, r * 0.34, 0, TAU)
  fill(g, '#fff4a8')
  ink(g, 2)
}

/* ------------------------------------------------------------------- sky */

export interface SkyOpts {
  sun?: readonly [number, number]
  rainbow?: readonly [number, number, number]
  clouds?: readonly (readonly [number, number, number])[]
}

export const sky = (g: G2D, o: SkyOpts): void => {
  const gr = g.createLinearGradient(0, 0, 0, 430)
  gr.addColorStop(0, C.skyTop)
  gr.addColorStop(1, C.skyLow)
  g.fillStyle = gr
  g.fillRect(0, 0, SEC_W, SEC_H)
  if (o.sun) {
    const [sx, sy] = o.sun
    const glow = g.createRadialGradient(sx, sy, 30, sx, sy, 190)
    glow.addColorStop(0, 'rgba(255,240,170,0.85)')
    glow.addColorStop(1, 'rgba(255,240,170,0)')
    g.fillStyle = glow
    g.fillRect(sx - 200, sy - 200, 400, 400)
    g.beginPath()
    g.arc(sx, sy, 54, 0, TAU)
    fill(g, C.sun)
  }
  if (o.rainbow) {
    const [rx, ry, rr] = o.rainbow
    g.globalAlpha = 0.45
    g.lineWidth = 11
    const RB = ['#ff9ecf', '#ffb36b', '#ffe08a', '#9ff0d0', '#9fd8ff', '#c7a6ff']
    for (let i = 0; i < RB.length; i++) {
      g.beginPath()
      g.arc(rx, ry, rr - i * 11, PI * 1.08, PI * 1.72)
      g.strokeStyle = RB[i]!
      g.stroke()
    }
    g.globalAlpha = 1
  }
  for (const [x, y, s] of o.clouds ?? []) {
    const lobes: Lobe[] = [
      [x - 60 * s, y + 8 * s, 34 * s], [x - 18 * s, y - 12 * s, 44 * s], [x + 34 * s, y - 2 * s, 38 * s], [x + 72 * s, y + 12 * s, 26 * s]
    ]
    blob(g, lobes)
    g.globalAlpha = 0.9
    fill(g, '#e9e2ff')
    g.globalAlpha = 1
    blob(g, lobes.map(([a, b, r]) => [a, b - 6 * s, r * 0.9] as const))
    fill(g, '#ffffff')
  }
}

/** Two far hill bands, lighter and bluer, no outline (art-style §5). */
export const farHills = (g: G2D, y1: number, y2: number, seed: number): void => {
  const r = seeded(seed)
  for (const [y, c] of [[y1, C.farHill], [y2, C.farHill2]] as const) {
    g.beginPath()
    g.moveTo(0, y + (r() - 0.5) * 40)
    for (let x = 0; x <= SEC_W; x += 192) {
      g.bezierCurveTo(x + 64, y - 40 - r() * 50, x + 128, y + r() * 30, x + 192, y + (r() - 0.5) * 30)
    }
    g.lineTo(SEC_W, SEC_H)
    g.lineTo(0, SEC_H)
    fill(g, c)
  }
}

/** An outlined, cel-banded mid hill between x0 and x1 peaking at (px, py). */
export const hill = (g: G2D, x0: number, x1: number, px: number, py: number, base: number): void => {
  g.beginPath()
  g.moveTo(x0, SEC_H)
  g.bezierCurveTo(x0 + (px - x0) * 0.2, base, px - (px - x0) * 0.45, py, px, py)
  g.bezierCurveTo(px + (x1 - px) * 0.45, py, x1 - (x1 - px) * 0.2, base, x1, base + 20)
  g.lineTo(x1, SEC_H)
  g.closePath()
  fill(g, C.moss)
  ink(g)
  g.save()
  g.clip()
  g.beginPath()
  g.moveTo(px + (x1 - px) * 0.3, SEC_H)
  g.bezierCurveTo(px + (x1 - px) * 0.35, py + 120, px + (x1 - px) * 0.6, py + 50, x1, py + 70)
  g.lineTo(x1, SEC_H)
  fill(g, C.mossShade)
  g.restore()
}

/** The front meadow band, with a lit lip along its crest. */
export const meadow = (g: G2D, yl: number, ym: number, yr: number): void => {
  g.beginPath()
  g.moveTo(0, yl)
  g.bezierCurveTo(200, yl - 30, 420, ym - 20, 620, ym)
  g.bezierCurveTo(820, ym + 20, 1000, yr - 30, SEC_W, yr)
  g.lineTo(SEC_W, SEC_H)
  g.lineTo(0, SEC_H)
  g.closePath()
  fill(g, C.meadow)
  ink(g)
  g.beginPath()
  g.moveTo(10, yl + 6)
  g.bezierCurveTo(200, yl - 22, 420, ym - 12, 610, ym + 8)
  g.lineWidth = 7
  g.strokeStyle = C.mossLip
  g.stroke()
}

/** A sandy path through a list of centre points, `w` wide. */
export const pathway = (g: G2D, pts: readonly (readonly [number, number])[], w: number, seed: number): void => {
  const L: [number, number][] = []
  const R: [number, number][] = []
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i]!
    const [nx, ny] = pts[Math.min(pts.length - 1, i + 1)]!
    const [px, py] = pts[Math.max(0, i - 1)]!
    const dx = nx - px
    const dy = ny - py
    const d = Math.hypot(dx, dy) || 1
    const ww = w * (0.55 + 0.45 * (y / SEC_H))
    L.push([x - (dy / d) * ww, y + (dx / d) * ww])
    R.push([x + (dy / d) * ww, y - (dx / d) * ww])
  }
  g.beginPath()
  g.moveTo(...L[0]!)
  for (let i = 1; i < L.length; i++) {
    const [ax, ay] = L[i - 1]!
    const [bx, by] = L[i]!
    g.quadraticCurveTo(ax, ay, (ax + bx) / 2, (ay + by) / 2)
  }
  g.lineTo(...L[L.length - 1]!)
  g.lineTo(...R[R.length - 1]!)
  for (let i = R.length - 2; i >= 0; i--) {
    const [ax, ay] = R[i + 1]!
    const [bx, by] = R[i]!
    g.quadraticCurveTo(ax, ay, (ax + bx) / 2, (ay + by) / 2)
  }
  g.lineTo(...R[0]!)
  g.closePath()
  fill(g, C.path)
  ink(g, 4)
  const r = seeded(seed)
  g.beginPath()
  for (let i = 0; i < 10; i++) {
    const p = pts[Math.floor(r() * pts.length)]!
    const x = p[0] + (r() - 0.5) * w
    const y = p[1] + (r() - 0.5) * 20
    g.moveTo(x + 7, y)
    g.ellipse(x, y, 7, 4.5, 0, 0, TAU)
  }
  fill(g, C.pathShade)
}

/* ----------------------------------------------------------------- flora */

/** A round-canopy tree whose base stands at (x, y), scale `s`. */
export const tree = (g: G2D, x: number, y: number, s: number, fruit = '#ff8fb8'): void => {
  g.beginPath()
  g.moveTo(x - 14 * s, y)
  g.bezierCurveTo(x - 12 * s, y - 50 * s, x - 10 * s, y - 80 * s, x - 6 * s, y - 110 * s)
  g.lineTo(x + 8 * s, y - 110 * s)
  g.bezierCurveTo(x + 12 * s, y - 80 * s, x + 14 * s, y - 50 * s, x + 18 * s, y)
  g.closePath()
  fill(g, C.trunk)
  ink(g)
  const lobes: Lobe[] = [
    [x - 58 * s, y - 118 * s, 48 * s], [x, y - 158 * s, 62 * s], [x + 58 * s, y - 120 * s, 50 * s], [x, y - 108 * s, 56 * s]
  ]
  lumpy(g, lobes, C.canopy)
  g.save()
  blob(g, lobes)
  g.clip()
  blob(g, [[x + 40 * s, y - 88 * s, 60 * s], [x - 30 * s, y - 70 * s, 50 * s]])
  fill(g, C.canopyShade)
  blob(g, [[x - 26 * s, y - 180 * s, 34 * s], [x + 6 * s, y - 196 * s, 26 * s]])
  fill(g, C.canopyLite)
  g.restore()
  if (!fruit) return
  g.beginPath()
  for (const [dx, dy] of [[-40, -130], [22, -170], [48, -118]] as const) {
    g.moveTo(x + dx * s + 7 * s, y + dy * s)
    g.arc(x + dx * s, y + dy * s, 7 * s, 0, TAU)
  }
  fill(g, fruit)
  ink(g, 2.4)
}

/** A soft stacked pine — the woods' second silhouette, for variety. */
export const pine = (g: G2D, x: number, y: number, s: number): void => {
  g.beginPath()
  g.rect(x - 8 * s, y - 34 * s, 16 * s, 34 * s)
  fill(g, C.trunk)
  ink(g, 4)
  for (let i = 0; i < 3; i++) {
    const w = (70 - i * 16) * s
    const top = y - (70 + i * 46) * s
    const bot = y - (22 + i * 44) * s
    g.beginPath()
    g.moveTo(x, top - 20 * s)
    g.quadraticCurveTo(x + w * 0.35, top + 10 * s, x + w, bot)
    g.quadraticCurveTo(x, bot + 14 * s, x - w, bot)
    g.quadraticCurveTo(x - w * 0.35, top + 10 * s, x, top - 20 * s)
    fill(g, C.pine)
    ink(g, 4)
    g.save()
    g.clip()
    g.beginPath()
    g.rect(x + w * 0.2, top - 30 * s, w, bot - top + 40 * s)
    fill(g, C.pineShade)
    g.restore()
  }
}

/** A round bush of three lobes at (x, y), scale `s`. */
export const bush = (g: G2D, x: number, y: number, s: number, berry?: string): void => {
  const lobes: Lobe[] = [[x - 30 * s, y, 26 * s], [x, y - 14 * s, 32 * s], [x + 30 * s, y, 24 * s]]
  lumpy(g, lobes, C.canopy)
  g.save()
  blob(g, lobes)
  g.clip()
  blob(g, [[x + 20 * s, y + 14 * s, 30 * s]])
  fill(g, C.canopyShade)
  g.restore()
  if (!berry) return
  g.beginPath()
  for (const [dx, dy] of [[-22, -8], [6, -26], [26, -6]] as const) {
    g.moveTo(x + dx * s + 5 * s, y + dy * s)
    g.arc(x + dx * s, y + dy * s, 5 * s, 0, TAU)
  }
  fill(g, berry)
  ink(g, 2)
}

/** Flowers and grass tufts scattered over a band, skipping `avoid` boxes. */
export const flowers = (
  g: G2D, seed: number, n: number, y0: number, y1: number,
  avoid: readonly (readonly [number, number, number, number])[] = []
): void => {
  const r = seeded(seed)
  const cols = [C.flowerPink, C.flowerYellow, C.flowerLilac, '#ffffff']
  for (let i = 0; i < n; i++) {
    const x = 20 + r() * (SEC_W - 40)
    const y = y0 + r() * (y1 - y0)
    const size = 8 + r() * 6
    const rot = r() * TAU
    if (avoid.some(([ax, ay, aw, ah]) => x > ax && x < ax + aw && y > ay && y < ay + ah)) continue
    flower(g, x, y, size, cols[i % 4]!, rot)
  }
  g.beginPath()
  for (let i = 0; i < 26; i++) {
    const x = r() * SEC_W
    const y = y0 - 10 + r() * (y1 - y0 + 20)
    const hgt = 12 + r() * 12
    g.moveTo(x - 6, y)
    g.quadraticCurveTo(x - 2, y - hgt, x + 3, y - hgt - 4)
    g.quadraticCurveTo(x + 2, y - hgt * 0.4, x + 6, y)
  }
  fill(g, C.mossShade)
}

export const mushrooms = (g: G2D, list: readonly (readonly [number, number, number])[]): void => {
  for (const [x, y, s] of list) {
    g.beginPath()
    g.roundRect(x - 8 * s, y - 24 * s, 16 * s, 26 * s, 5 * s)
    fill(g, C.wall)
    ink(g, 3)
    g.beginPath()
    g.moveTo(x - 30 * s, y - 20 * s)
    g.quadraticCurveTo(x, y - 62 * s, x + 30 * s, y - 20 * s)
    g.closePath()
    fill(g, C.cap)
    ink(g, 3.5)
    g.beginPath()
    for (const [dx, dy, r] of [[-12, -30, 5], [8, -40, 4], [16, -26, 3.5]] as const) {
      g.moveTo(x + dx * s + r * s, y + dy * s)
      g.arc(x + dx * s, y + dy * s, r * s, 0, TAU)
    }
    fill(g, '#ffffff')
  }
}

/** A hollow log lying on the meadow (the chapter's tap-creature home). */
export const log = (g: G2D, x: number, y: number, w: number): void => {
  g.beginPath()
  g.roundRect(x, y, w, 50, 24)
  fill(g, C.trunk)
  ink(g)
  g.beginPath()
  g.ellipse(x + w - 4, y + 25, 16, 25, 0, 0, TAU)
  fill(g, '#5a3a2e')
  ink(g, 4)
  g.beginPath()
  g.moveTo(x + 30, y + 16)
  g.lineTo(x + 90, y + 16)
  g.moveTo(x + 40, y + 32)
  g.lineTo(x + 110, y + 32)
  ink(g, 2.4)
}

export const stones = (g: G2D, list: readonly (readonly [number, number, number])[]): void => {
  for (const [x, y, r] of list) {
    g.beginPath()
    g.ellipse(x, y, r, r * 0.7, 0, 0, TAU)
    fill(g, C.stone)
    ink(g, 3.5)
    g.beginPath()
    g.ellipse(x - r * 0.25, y - r * 0.25, r * 0.4, r * 0.22, -0.4, 0, TAU)
    fill(g, '#efe9fa')
  }
}

/** A short picket fence from (x0, y0), n posts, stepping (dx, dy). */
export const fence = (g: G2D, x0: number, y0: number, n: number, dx: number, dy: number): void => {
  for (let i = 0; i < n; i++) {
    const x = x0 + i * dx
    const y = y0 + i * dy
    g.beginPath()
    g.moveTo(x - 7, y)
    g.lineTo(x - 7, y - 40)
    g.lineTo(x, y - 50)
    g.lineTo(x + 7, y - 40)
    g.lineTo(x + 7, y)
    g.closePath()
    fill(g, C.fence)
    ink(g, 3)
  }
  g.beginPath()
  g.moveTo(x0 - 10, y0 - 24)
  g.lineTo(x0 + (n - 1) * dx + 10, y0 + (n - 1) * dy - 24)
  g.moveTo(x0 - 10, y0 - 10)
  g.lineTo(x0 + (n - 1) * dx + 10, y0 + (n - 1) * dy - 10)
  ink(g, 3)
}

/* ------------------------------------------------------------------ water */

export const pond = (g: G2D, x: number, y: number, rx: number, ry: number): void => {
  g.beginPath()
  g.ellipse(x, y, rx, ry, 0, 0, TAU)
  fill(g, C.pond)
  ink(g)
  g.beginPath()
  g.ellipse(x - rx * 0.24, y - ry * 0.27, rx * 0.46, ry * 0.27, 0, 0, TAU)
  fill(g, C.pondLite)
  for (const [dx, dy, r] of [[0.4, 0.3, 18], [-0.42, 0.36, 14]] as const) {
    const lx = x + dx * rx
    const ly = y + dy * ry
    g.beginPath()
    g.moveTo(lx, ly)
    g.arc(lx, ly, r, 0.35, TAU - 0.05)
    g.closePath()
    fill(g, C.lily)
    ink(g, 3)
  }
  flower(g, x + 0.43 * rx, y + 0.18 * ry, 8, '#ffd1ea', 0.4)
}

/** A brook winding through a list of points, `w` wide at the front. */
export const brook = (g: G2D, pts: readonly (readonly [number, number])[], w: number): void => {
  g.save()
  g.lineJoin = g.lineCap = 'round'
  g.beginPath()
  g.moveTo(...pts[0]!)
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1]!
    const [bx, by] = pts[i]!
    g.quadraticCurveTo(ax, ay, (ax + bx) / 2, (ay + by) / 2)
  }
  g.lineTo(...pts[pts.length - 1]!)
  g.lineWidth = w + 10
  g.strokeStyle = INK
  g.stroke()
  g.lineWidth = w
  g.strokeStyle = C.pond
  g.stroke()
  g.lineWidth = w * 0.3
  g.strokeStyle = C.pondLite
  g.globalAlpha = 0.7
  g.setLineDash([40, 60])
  g.stroke()
  g.restore()
}

/* ------------------------------------------------------------ buildings */

/** A cottage standing at (x, y), `w` wide; its ROOF is the landmark. */
export const cottage = (g: G2D, x: number, y: number, w: number, pot: Pot): void => {
  const h = 118 * (w / 196)
  const k = w / 196
  g.beginPath()
  g.rect(x + 52 * k - 14 * k, y - h - 78 * k, 28 * k, 64 * k)
  fill(g, '#e0a07a')
  ink(g)
  g.beginPath()
  g.roundRect(x - w / 2, y - h, w, h, 10)
  fill(g, C.wall)
  g.save()
  g.clip()
  g.beginPath()
  g.rect(x + w * 0.22, y - h, w, h)
  fill(g, C.wallShade)
  g.restore()
  g.beginPath()
  g.roundRect(x - w / 2, y - h, w, h, 10)
  ink(g)
  const roof = (): void => {
    g.beginPath()
    g.moveTo(x - w / 2 - 26 * k, y - h + 12 * k)
    g.quadraticCurveTo(x - 30 * k, y - h - 118 * k, x, y - h - 128 * k)
    g.quadraticCurveTo(x + 30 * k, y - h - 118 * k, x + w / 2 + 26 * k, y - h + 12 * k)
    g.quadraticCurveTo(x, y - h - 6 * k, x - w / 2 - 26 * k, y - h + 12 * k)
    g.closePath()
  }
  roof()
  fill(g, pot.base)
  g.save()
  roof()
  g.clip()
  g.beginPath()
  g.moveTo(x + 10 * k, y - h - 140 * k)
  g.lineTo(x + w, y - h - 140 * k)
  g.lineTo(x + w, y - h + 30 * k)
  g.lineTo(x + 40 * k, y - h + 30 * k)
  g.closePath()
  fill(g, pot.shade)
  g.lineWidth = 3
  g.strokeStyle = pot.shade
  for (let row = 0; row < 4; row++) {
    const yy = y - h - 88 * k + row * 26 * k
    g.beginPath()
    for (let xx = x - w / 2 - 20 * k; xx < x + w / 2 + 30 * k; xx += 26 * k) g.arc(xx, yy, 13 * k, 0, PI)
    g.stroke()
  }
  g.beginPath()
  g.ellipse(x - 34 * k, y - h - 78 * k, 26 * k, 9 * k, -0.5, 0, TAU)
  fill(g, pot.lite)
  g.restore()
  roof()
  ink(g)
  g.beginPath()
  g.arc(x - 48 * k, y - 64 * k, 22 * k, 0, TAU)
  fill(g, C.window)
  ink(g, 4)
  g.beginPath()
  g.moveTo(x - 48 * k, y - 86 * k)
  g.lineTo(x - 48 * k, y - 42 * k)
  g.moveTo(x - 70 * k, y - 64 * k)
  g.lineTo(x - 26 * k, y - 64 * k)
  ink(g, 3)
  g.beginPath()
  g.moveTo(x + 18 * k, y)
  g.lineTo(x + 18 * k, y - 58 * k)
  g.arc(x + 42 * k, y - 58 * k, 24 * k, PI, 0)
  g.lineTo(x + 66 * k, y)
  g.closePath()
  fill(g, C.door)
  ink(g, 4)
  g.beginPath()
  g.arc(x + 58 * k, y - 30 * k, 3.5 * k, 0, TAU)
  fill(g, INK)
  g.beginPath()
  g.roundRect(x - 76 * k, y - 38 * k, 56 * k, 14 * k, 4)
  fill(g, C.trunk)
  ink(g, 3)
  for (let i = 0; i < 3; i++) flower(g, x - 66 * k + i * 18 * k, y - 44 * k, 9 * k, i === 1 ? C.flowerYellow : C.flowerPink, i)
}

/** The windmill's tower and cap, standing at (x, y), hub at `hubY`. */
export const millBody = (g: G2D, x: number, y: number, hubY: number): void => {
  const body = (): void => {
    g.beginPath()
    g.moveTo(x - 64, y)
    g.lineTo(x - 40, hubY + 18)
    g.lineTo(x + 40, hubY + 18)
    g.lineTo(x + 64, y)
    g.closePath()
  }
  body()
  fill(g, C.mill)
  g.save()
  g.clip()
  g.beginPath()
  g.rect(x + 14, hubY, 80, y - hubY)
  fill(g, C.millShade)
  g.restore()
  body()
  ink(g)
  g.beginPath()
  g.moveTo(x - 52, hubY + 22)
  g.quadraticCurveTo(x, hubY - 64, x + 52, hubY + 22)
  g.closePath()
  fill(g, C.millCap)
  ink(g)
  g.beginPath()
  g.moveTo(x - 16, y)
  g.lineTo(x - 16, y - 40)
  g.arc(x, y - 40, 16, PI, 0)
  g.lineTo(x + 16, y)
  fill(g, C.door)
  ink(g, 4)
  g.beginPath()
  g.arc(x, hubY + 78, 13, 0, TAU)
  fill(g, C.window)
  ink(g, 4)
}

/**
 * The four lattice sails and their hub, at rest (the cross upright), about
 * the origin, `L` long. The turn is the caller's transform — which is what
 * lets one painting serve every angle.
 */
export const sailsShape = (g: G2D, L: number): void => {
  for (let i = 0; i < 4; i++) {
    const a = (i * PI) / 2
    const ca = cos(a)
    const sa = sin(a)
    const px = -sa
    const py = ca
    const p = (d: number, off: number): [number, number] => [ca * d + px * off, sa * d + py * off]
    g.beginPath()
    g.moveTo(...p(26, 0))
    g.lineTo(...p(L, 0))
    g.lineTo(...p(L - 6, 34))
    g.lineTo(...p(34, 26))
    g.closePath()
    fill(g, '#fff9ee')
    ink(g, 4)
    g.beginPath()
    for (let k = 1; k < 4; k++) {
      g.moveTo(...p(26 + k * 31, 0))
      g.lineTo(...p(26 + k * 31, 30))
    }
    g.moveTo(...p(30, 14))
    g.lineTo(...p(L - 3, 17))
    ink(g, 2.4)
  }
  g.beginPath()
  g.arc(0, 0, 15, 0, TAU)
  fill(g, C.millCap)
  ink(g, 4)
}

/** The sails as a painted still. `s` is `L`, the sail length. */
export const SAILS_ART: ItemSpec = {
  ...PROP_ART.sails, frames: 1,
  draw: (g, s) => {
    g.save()
    g.scale(s / 150, s / 150)
    sailsShape(g, 150)
    g.restore()
  }
}

/** Four lattice sails about (x, hubY) at `angle` — a live prop. */
export const sails = (g: G2D, x: number, hubY: number, angle: number, L = 150): void => {
  g.save()
  g.translate(x, hubY)
  g.rotate(angle)
  if (!drawItem(g, SAILS_ART, L)) sailsShape(g, L)
  g.restore()
}

/** An arched wooden footbridge over a brook; its garland RAIL is the landmark. */
export const bridge = (g: G2D, x: number, y: number, w: number, pot: Pot): void => {
  const h = w * 0.22
  // Deck: an arch of planks.
  g.beginPath()
  g.moveTo(x - w / 2, y)
  g.quadraticCurveTo(x, y - h * 2, x + w / 2, y)
  g.lineTo(x + w / 2, y + 22)
  g.quadraticCurveTo(x, y - h * 2 + 22, x - w / 2, y + 22)
  g.closePath()
  fill(g, C.trunk)
  ink(g)
  g.beginPath()
  for (let i = 1; i < 8; i++) {
    const t = i / 8
    const px = x - w / 2 + w * t
    const py = y + 22 - 4 * h * t * (1 - t) * 2 * 0.5 * 2
    g.moveTo(px, py - 22)
    g.lineTo(px, py)
  }
  ink(g, 2.4)
  // Posts and the garland rail.
  const rail = (dy: number): void => {
    g.beginPath()
    g.moveTo(x - w / 2 + 6, y - 42 + dy)
    g.quadraticCurveTo(x, y - h * 2 - 42 + dy, x + w / 2 - 6, y - 42 + dy)
  }
  for (let i = 0; i <= 4; i++) {
    const t = i / 4
    const px = x - w / 2 + 8 + (w - 16) * t
    const py = y - 4 * h * t * (1 - t)
    g.beginPath()
    g.rect(px - 6, py - 46, 12, 48)
    fill(g, C.trunkShade)
    ink(g, 3)
  }
  rail(0)
  g.lineWidth = 16
  g.strokeStyle = INK
  g.stroke()
  g.lineWidth = 10
  g.strokeStyle = pot.base
  g.stroke()
  rail(-3)
  g.lineWidth = 3
  g.strokeStyle = pot.lite
  g.stroke()
  // Blossoms along the garland in the pot's shades.
  for (let i = 0; i <= 6; i++) {
    const t = i / 6
    const px = x - w / 2 + 6 + (w - 12) * t
    const py = y - 42 - 4 * h * t * (1 - t)
    flower(g, px, py, 9, i & 1 ? pot.lite : pot.shade, i)
  }
}

/** A stone well with a little roof, at (x, y). */
export const well = (g: G2D, x: number, y: number): void => {
  g.beginPath()
  g.ellipse(x, y - 30, 56, 20, 0, 0, TAU)
  fill(g, '#5a4a70')
  ink(g)
  g.beginPath()
  g.moveTo(x - 56, y - 30)
  g.lineTo(x - 56, y)
  g.ellipse(x, y, 56, 18, 0, PI, 0, true)
  g.lineTo(x + 56, y - 30)
  g.ellipse(x, y - 30, 56, 20, 0, 0, PI)
  fill(g, C.stone)
  ink(g)
  g.beginPath()
  for (let i = -2; i <= 2; i++) {
    g.moveTo(x + i * 22, y - 10)
    g.lineTo(x + i * 22 + 12, y - 10)
  }
  ink(g, 2.4)
  for (const d of [-1, 1]) {
    g.beginPath()
    g.rect(x + d * 46 - 5, y - 110, 10, 82)
    fill(g, C.trunk)
    ink(g, 3)
  }
  g.beginPath()
  g.moveTo(x - 72, y - 100)
  g.lineTo(x, y - 142)
  g.lineTo(x + 72, y - 100)
  g.closePath()
  fill(g, C.cap)
  ink(g)
}

/** A raised flower bed whose big blooms are the landmark, at (x, y), `w` wide. */
export const flowerBed = (g: G2D, x: number, y: number, w: number, pot: Pot, seed: number): void => {
  g.beginPath()
  g.roundRect(x - w / 2, y - 26, w, 34, 10)
  fill(g, C.trunk)
  ink(g)
  g.beginPath()
  g.ellipse(x, y - 26, w / 2 - 6, 14, 0, PI, 0)
  fill(g, '#8a5a3c')
  const r = seeded(seed)
  const n = Math.round(w / 34)
  for (let i = 0; i < n; i++) {
    const fx = x - w / 2 + 22 + (i / Math.max(1, n - 1)) * (w - 44)
    const fy = y - 40 - r() * 26
    g.beginPath()
    g.moveTo(fx, y - 22)
    g.quadraticCurveTo(fx - 6, fy + 20, fx, fy)
    ink(g, 3)
    g.lineWidth = 3
    g.strokeStyle = C.mossShade
    g.stroke()
    flower(g, fx, fy, 15 + r() * 6, i % 3 === 1 ? pot.lite : pot.base, r() * TAU)
  }
}

/** A striped beehive on a stump. */
export const beehive = (g: G2D, x: number, y: number): void => {
  g.beginPath()
  g.roundRect(x - 26, y - 24, 52, 24, 6)
  fill(g, C.trunk)
  ink(g, 4)
  for (let i = 0; i < 3; i++) {
    g.beginPath()
    g.ellipse(x, y - 34 - i * 18, 30 - i * 7, 12, 0, 0, TAU)
    fill(g, '#ffcf4a')
    ink(g, 3.5)
  }
  g.beginPath()
  g.arc(x, y - 36, 5, 0, TAU)
  fill(g, INK)
}

/** A great tree whose trunk holds a treehouse; its ROOF is the landmark. */
export const treehouse = (g: G2D, x: number, y: number, pot: Pot): void => {
  // Trunk.
  g.beginPath()
  g.moveTo(x - 42, y)
  g.bezierCurveTo(x - 30, y - 90, x - 34, y - 180, x - 22, y - 290)
  g.lineTo(x + 26, y - 290)
  g.bezierCurveTo(x + 36, y - 180, x + 30, y - 90, x + 48, y)
  g.closePath()
  fill(g, C.trunk)
  ink(g)
  g.save()
  g.clip()
  g.beginPath()
  g.rect(x + 8, y - 300, 60, 300)
  fill(g, C.trunkShade)
  g.restore()
  // Canopy crown behind the house.
  const lobes: Lobe[] = [[x - 110, y - 330, 80], [x, y - 400, 100], [x + 110, y - 330, 84], [x, y - 300, 90]]
  lumpy(g, lobes, C.canopy)
  g.save()
  blob(g, lobes)
  g.clip()
  blob(g, [[x + 70, y - 270, 90]])
  fill(g, C.canopyShade)
  blob(g, [[x - 50, y - 430, 50]])
  fill(g, C.canopyLite)
  g.restore()
  // The house on its platform.
  g.beginPath()
  g.rect(x - 90, y - 214, 180, 14)
  fill(g, C.trunkShade)
  ink(g, 4)
  g.beginPath()
  g.roundRect(x - 64, y - 290, 128, 78, 8)
  fill(g, C.wall)
  ink(g)
  g.beginPath()
  g.arc(x - 26, y - 252, 16, 0, TAU)
  fill(g, C.window)
  ink(g, 3.5)
  g.beginPath()
  g.roundRect(x + 14, y - 272, 32, 60, [14, 14, 2, 2])
  fill(g, C.door)
  ink(g, 3.5)
  const roof = (): void => {
    g.beginPath()
    g.moveTo(x - 86, y - 280)
    g.quadraticCurveTo(x - 20, y - 370, x, y - 378)
    g.quadraticCurveTo(x + 20, y - 370, x + 86, y - 280)
    g.closePath()
  }
  roof()
  fill(g, pot.base)
  g.save()
  roof()
  g.clip()
  g.beginPath()
  g.rect(x + 8, y - 390, 100, 120)
  fill(g, pot.shade)
  g.beginPath()
  g.ellipse(x - 24, y - 330, 20, 7, -0.6, 0, TAU)
  fill(g, pot.lite)
  g.restore()
  roof()
  ink(g)
  // A rope ladder down the trunk.
  g.beginPath()
  g.moveTo(x - 58, y - 200)
  g.lineTo(x - 58, y - 30)
  g.moveTo(x - 36, y - 200)
  g.lineTo(x - 36, y - 30)
  for (let i = 0; i < 7; i++) {
    g.moveTo(x - 58, y - 186 + i * 24)
    g.lineTo(x - 36, y - 186 + i * 24)
  }
  ink(g, 2.6)
}

/** The ancient heart-tree of a grove; its BLOSSOM canopy is the landmark. */
export const greatTree = (g: G2D, x: number, y: number, s: number, pot: Pot): void => {
  // Roots and trunk.
  g.beginPath()
  g.moveTo(x - 110 * s, y)
  g.quadraticCurveTo(x - 60 * s, y - 30 * s, x - 50 * s, y - 120 * s)
  g.bezierCurveTo(x - 60 * s, y - 220 * s, x - 30 * s, y - 280 * s, x - 34 * s, y - 330 * s)
  g.lineTo(x + 38 * s, y - 330 * s)
  g.bezierCurveTo(x + 34 * s, y - 280 * s, x + 64 * s, y - 220 * s, x + 54 * s, y - 120 * s)
  g.quadraticCurveTo(x + 64 * s, y - 30 * s, x + 120 * s, y)
  g.closePath()
  fill(g, C.trunk)
  ink(g, 6)
  g.save()
  g.clip()
  g.beginPath()
  g.rect(x + 10 * s, y - 340 * s, 140 * s, 360 * s)
  fill(g, C.trunkShade)
  g.restore()
  // A heart-shaped knot in the bark.
  g.beginPath()
  g.moveTo(x, y - 150 * s)
  g.bezierCurveTo(x - 24 * s, y - 170 * s, x - 18 * s, y - 196 * s, x, y - 184 * s)
  g.bezierCurveTo(x + 18 * s, y - 196 * s, x + 24 * s, y - 170 * s, x, y - 150 * s)
  fill(g, '#7a4e36')
  ink(g, 3)
  // The blossom canopy: the chapter's crown jewel.
  const lobes: Lobe[] = [
    [x - 200 * s, y - 360 * s, 110 * s], [x - 90 * s, y - 450 * s, 130 * s], [x + 70 * s, y - 460 * s, 130 * s],
    [x + 200 * s, y - 370 * s, 110 * s], [x, y - 340 * s, 120 * s]
  ]
  lumpy(g, lobes, pot.base, 6)
  g.save()
  blob(g, lobes)
  g.clip()
  blob(g, [[x + 150 * s, y - 300 * s, 130 * s], [x - 150 * s, y - 290 * s, 90 * s]])
  fill(g, pot.shade)
  blob(g, [[x - 110 * s, y - 520 * s, 70 * s], [x + 30 * s, y - 540 * s, 60 * s]])
  fill(g, pot.lite)
  g.restore()
  const r = seeded(91)
  for (let i = 0; i < 16; i++) {
    const [lx, ly, lr] = lobes[i % lobes.length]!
    const a = r() * TAU
    flower(g, lx + cos(a) * lr * 0.7, ly + sin(a) * lr * 0.6, 12 * s, i & 1 ? '#ffffff' : pot.lite, r() * TAU)
  }
}

/** A thorny bramble arch — Briar's gate — bursting into blossom once restored. */
export const brambleArch = (g: G2D, x: number, y: number, w: number, pot: Pot): void => {
  g.beginPath()
  g.moveTo(x - w / 2, y)
  g.bezierCurveTo(x - w / 2, y - w * 0.9, x + w / 2, y - w * 0.9, x + w / 2, y)
  g.lineWidth = 26
  g.strokeStyle = INK
  g.stroke()
  g.lineWidth = 16
  g.strokeStyle = '#6a8a3a'
  g.stroke()
  // Thorns, softened into little leaves, and blossoms along the arch.
  for (let i = 0; i <= 10; i++) {
    const t = i / 10
    const px = (1 - t) ** 3 * (x - w / 2) + 3 * (1 - t) ** 2 * t * (x - w / 2) + 3 * (1 - t) * t * t * (x + w / 2) + t ** 3 * (x + w / 2)
    const py = (1 - t) ** 3 * y + 3 * (1 - t) ** 2 * t * (y - w * 0.9) + 3 * (1 - t) * t * t * (y - w * 0.9) + t ** 3 * y
    if (i & 1) flower(g, px, py, 13, pot.base, i)
    else {
      g.beginPath()
      g.ellipse(px + 10, py - 6, 12, 6, -0.6, 0, TAU)
      fill(g, C.moss)
      ink(g, 2.4)
    }
  }
}

/** How long a falling streak is against its own width. */
const STREAK_TALL = 2.4

/** One streak of falling water about the origin, 1 unit wide. */
const streakShape = (g: G2D, col: string): void => {
  g.beginPath()
  g.roundRect(-0.5, -STREAK_TALL / 2, 1, STREAK_TALL, 0.5)
  fill(g, col)
}

/**
 * The streak a fall's flow is made of, as a painted still.
 *
 * §4b kept every fall's flow as "bands scrolling inside a clip of a path the
 * call site builds" — which is the description of a TEXTURE, not of a thing
 * with no shape. The clip is the call site's and stays drawn; the band inside
 * it is the same rounded streak at every position, in three chapters' worth of
 * water, rainbow and sand. So it is one tinted tile, blitted wherever the
 * clock has pushed it, and the fall it falls down is still the fall's own.
 */
export const STREAK_ART: ItemSpec = {
  ...PROP_ART.streak, frames: 1, tinted: true,
  draw: (g, s, _f, accent) => {
    g.save()
    g.scale(s, s)
    streakShape(g, accent.base)
    g.restore()
  }
}

/**
 * One streak `w` wide and `h` long with its top-left at (x, y), in `col`:
 * blits the painting and returns true, or adds the caller's own rounded bar
 * to the CURRENT PATH and returns false, so a fall that batches a dozen bands
 * into one fill keeps doing exactly that while it is unpainted.
 */
export const streakAt = (g: G2D, x: number, y: number, w: number, h: number, col: string): boolean => {
  g.save()
  g.translate(x + w / 2, y + h / 2)
  g.scale(1, h / (w * STREAK_TALL))
  const hit = drawItem(g, STREAK_ART, w, 0, col)
  g.restore()
  if (!hit) g.roundRect(x, y, w, h, w / 2)
  return hit
}

/** The fall's own size in SU: the proportions its painting is cut at. */
const FALL_W = 80
const FALL_H = 190

/** The falling column and the foam it throws, about its foot at the origin. */
const waterfallShape = (g: G2D): void => {
  g.beginPath()
  g.roundRect(-FALL_W / 2, -FALL_H, FALL_W, FALL_H, 16)
  fill(g, C.pond)
  ink(g, 5)
  blob(g, [[-FALL_W * 0.4, 0, 18], [0, 4, 24], [FALL_W * 0.4, 0, 18]])
  fill(g, '#ffffff')
  ink(g, 3)
}

/**
 * The waterfall as a painted still: the column of water and its splash, which
 * is the largest flat shape any woods sector still drew — a plum-ringed
 * rounded bar of flat blue laid over a painted rock face.
 *
 * Only the flow moves, and the flow is `STREAK_ART` scrolling under the same
 * clip as before, so the fall itself is a still and one picture serves it.
 */
export const WATERFALL_ART: ItemSpec = {
  ...PROP_ART.waterfall, frames: 1,
  draw: (g, s) => {
    g.save()
    g.scale(s / FALL_H, s / FALL_H)
    waterfallShape(g)
    g.restore()
  }
}

/** A waterfall down a rock face — a live prop (the bands scroll with `t`). */
export const waterfall = (g: G2D, x: number, y: number, w: number, h: number, t: number): void => {
  // The painting is cut at the fall's own 80 × 190, so a fall of another size
  // is that picture stretched — the way the drawing's own roundRect was.
  g.save()
  g.translate(x, y)
  g.scale(w / FALL_W, h / FALL_H)
  const painted = drawItem(g, WATERFALL_ART, FALL_H)
  g.restore()
  if (!painted) {
    g.beginPath()
    g.roundRect(x - w / 2, y - h, w, h, 16)
    fill(g, C.pond)
    ink(g, 5)
  }
  g.save()
  g.beginPath()
  g.roundRect(x - w / 2, y - h, w, h, 16)
  g.clip()
  g.fillStyle = C.pondLite
  for (let i = 0; i < 6; i++) {
    const yy = y - h + (((t * 90 + i * (h / 3)) % (h + 60)) - 30)
    g.beginPath()
    if (!streakAt(g, x - w / 2 + 10 + (i % 3) * (w / 3), yy, w / 5, 36, C.pondLite)) g.fill()
  }
  g.restore()
  if (painted) return
  // The splash pool's foam.
  blob(g, [[x - w * 0.4, y, 18], [x, y + 4, 24], [x + w * 0.4, y, 18]])
  fill(g, '#ffffff')
  ink(g, 3)
}

/* ------------------------------------------------------------ live props */

/** Chimney smoke: three soft puffs rising and swelling, looping. */
export const smoke = (g: G2D, x: number, y: number, t: number, alive: number): void => {
  for (let i = 0; i < 3; i++) {
    const k = (t * 0.35 + i / 3) % 1
    const px = x + sin(k * 5 + i) * 10 + k * 22
    const py = y - 8 - k * 120
    const r = 10 + k * 18
    g.globalAlpha = 0.7 * alive * (1 - k)
    if (puffAt(g, px, py, r, '#ffffff')) continue
    g.beginPath()
    g.arc(px, py, r, 0, TAU)
    fill(g, '#ffffff')
  }
  g.globalAlpha = 1
}

/**
 * One butterfly about the origin, wings `flap` open (0 folded … 1 wide).
 * Every chapter's butterfly is this shape — the woods' `butterfly`, the
 * ridge's `flutter`, the mirror lake's pair — so one painting serves them all.
 */
export const butterflyShape = (g: G2D, flap: number, col: string): void => {
  for (const side of [-1, 1]) {
    g.beginPath()
    g.ellipse(side * 9 * flap, -4, 10 * flap + 2, 12, side * 0.5, 0, TAU)
    fill(g, col)
    ink(g, 2.2)
  }
  g.beginPath()
  g.ellipse(0, 0, 2.6, 8, 0, 0, TAU)
  fill(g, INK)
}

/** The three wing openings the strip is painted at. */
const BUTTERFLY_FLAPS = [0.18, 0.6, 1] as const
/** The butterfly's own height in SU — `drawItem`'s scale for one of them. */
export const BUTTERFLY_UNIT = 24

/** The butterfly as a painted strip: folded, half open, wide open. The wings
 *  are the colour-me region, so one painting wears every chapter's hue. */
export const BUTTERFLY_ART: ItemSpec = {
  ...PROP_ART.butterfly, frames: 3, tinted: true,
  draw: (g, s, f, accent) => {
    g.save()
    g.scale(s / BUTTERFLY_UNIT, s / BUTTERFLY_UNIT)
    butterflyShape(g, BUTTERFLY_FLAPS[f] ?? 1, accent.base)
    g.restore()
  }
}

/** Where a wing opening of `flap` falls between the strip's three panels. */
export const butterflyFrame = (flap: number): number =>
  Math.max(0, Math.min(2, (flap - BUTTERFLY_FLAPS[0]) / (BUTTERFLY_FLAPS[1] - BUTTERFLY_FLAPS[0])))

/** Draw one butterfly at (x, y) — painted if its strip has landed. */
export const butterflyAt = (g: G2D, x: number, y: number, flap: number, col: string, size = BUTTERFLY_UNIT): void => {
  g.save()
  g.translate(x, y)
  if (!drawItem(g, BUTTERFLY_ART, size, butterflyFrame(flap), col)) {
    g.scale(size / BUTTERFLY_UNIT, size / BUTTERFLY_UNIT)
    butterflyShape(g, flap, col)
  }
  g.restore()
}

/** A butterfly on a lazy figure-eight about (cx, cy). */
export const butterfly = (g: G2D, cx: number, cy: number, t: number, i: number, col: string, alive: number): void => {
  const s = t * (0.45 + i * 0.12) + i * 2.1
  g.globalAlpha = alive
  butterflyAt(g, cx + sin(s) * 90, cy + sin(s * 2) * 34, Math.abs(sin(t * 11 + i)), col)
  g.globalAlpha = 1
}

/** A little white duck afloat about the origin, facing right. */
export const duckShape = (g: G2D): void => {
  g.beginPath()
  g.ellipse(0, 0, 20, 11, 0, 0, TAU)
  fill(g, '#ffffff')
  ink(g, 3)
  g.beginPath()
  g.arc(14, -12, 9, 0, TAU)
  fill(g, '#ffffff')
  ink(g, 3)
  g.beginPath()
  g.moveTo(21, -12)
  g.lineTo(31, -9)
  g.lineTo(21, -7)
  fill(g, '#ffb36b')
  ink(g, 2)
}

/** The duck's tail-to-beak length in SU. */
const DUCK_UNIT = 51

/** The duck as a painted still — the paddle and the bob stay the drawing's. */
export const DUCK_ART: ItemSpec = {
  ...PROP_ART.duck, frames: 1,
  draw: (g, s) => {
    g.save()
    g.scale(s / DUCK_UNIT, s / DUCK_UNIT)
    duckShape(g)
    g.restore()
  }
}

/** A duck paddling at (x, y) — a live prop. */
export const duck = (g: G2D, x: number, y: number): void => {
  g.save()
  g.translate(x, y)
  if (!drawItem(g, DUCK_ART, DUCK_UNIT)) duckShape(g)
  g.restore()
}

/** How long a bee's body is, in SU — `drawItem`'s scale for one of them. */
const BEE_UNIT = 14

/** Bees looping around a hive. */
export const bees = (g: G2D, x: number, y: number, t: number, alive: number): void => {
  g.globalAlpha = alive
  for (let i = 0; i < 3; i++) {
    const a = t * (1.6 + i * 0.3) + i * 2.1
    const bx = x + cos(a) * (40 + i * 12)
    const by = y + sin(a * 1.3) * 22 - 50
    g.save()
    g.translate(bx, by)
    const painted = drawItem(g, BEE_ART, BEE_UNIT)
    g.restore()
    if (painted) continue
    g.beginPath()
    g.ellipse(bx, by, 7, 5, 0, 0, TAU)
    fill(g, '#ffcf4a')
    ink(g, 2)
    g.beginPath()
    g.ellipse(bx - 2, by - 6, 5, 3, -0.4, 0, TAU)
    fill(g, 'rgba(255,255,255,0.85)')
  }
  g.globalAlpha = 1
}

/** The swing seat's width in SU — the only one in the game. */
const SEAT_UNIT = 60

/** The seat plank about the rope ends, `w` across. */
const seatShape = (g: G2D, w: number): void => {
  const k = w / SEAT_UNIT
  g.beginPath()
  g.roundRect(-30 * k, -4 * k, 60 * k, 12 * k, 4 * k)
  fill(g, C.trunk)
  ink(g, 3.5 * k)
}

/**
 * The swing's SEAT as a painted still.
 *
 * Only the seat: the two ropes are hairlines with no body — nothing to paint —
 * and they are what the angle actually moves. The plank itself stays level at
 * every angle, exactly as the drawing keeps it level.
 */
export const SWING_SEAT_ART: ItemSpec = {
  ...PROP_ART.swingSeat, frames: 1,
  draw: (g, s) => seatShape(g, s)
}

/** A rope swing hung from (x, y) at `angle`. */
export const swing = (g: G2D, x: number, y: number, len: number, angle: number): void => {
  const bx = x + sin(angle) * len
  const by = y + cos(angle) * len
  g.beginPath()
  g.moveTo(x - 20, y)
  g.lineTo(bx - 20, by)
  g.moveTo(x + 20, y)
  g.lineTo(bx + 20, by)
  ink(g, 3)
  g.save()
  g.translate(bx, by)
  if (!drawItem(g, SWING_SEAT_ART, SEAT_UNIT)) seatShape(g, SEAT_UNIT)
  g.restore()
}

/** A water wheel of eight paddles about the origin, at rest, radius `r`. */
export const waterwheelShape = (g: G2D, r: number): void => {
  g.beginPath()
  g.arc(0, 0, r, 0, TAU)
  g.arc(0, 0, r * 0.78, 0, TAU, true)
  fill(g, C.trunk)
  ink(g, 4)
  for (let i = 0; i < 8; i++) {
    const a = (i * TAU) / 8
    g.beginPath()
    g.moveTo(cos(a) * r * 0.2, sin(a) * r * 0.2)
    g.lineTo(cos(a) * r * 1.12, sin(a) * r * 1.12)
    ink(g, 6)
    g.lineWidth = 2.5
    g.strokeStyle = C.trunk
    g.stroke()
  }
  g.beginPath()
  g.arc(0, 0, r * 0.2, 0, TAU)
  fill(g, C.trunkShade)
  ink(g, 3)
}

/** The brook's wheel, the only one in the game: the size the reference's ink
 *  weight is judged against. */
const WHEEL_R = 52

/**
 * The wheel as a painted still. `s` is its radius; the turn is the transform,
 * and eight paddles at 45° make every turned copy of it a right one.
 *
 * Drawn through a SCALE rather than by passing the bench's `s` as the radius:
 * `ink` sets a width in the current transform, so a reference rendered at
 * twice the game's size with the game's line width comes back with hairline
 * spokes — and the painter paints the hairlines it is shown.
 */
export const WATERWHEEL_ART: ItemSpec = {
  ...PROP_ART.waterwheel, frames: 1,
  draw: (g, s) => {
    g.save()
    g.scale(s / WHEEL_R, s / WHEEL_R)
    waterwheelShape(g, WHEEL_R)
    g.restore()
  }
}

/** A water wheel of eight paddles about (x, y) — a live prop. */
export const waterwheel = (g: G2D, x: number, y: number, r: number, angle: number): void => {
  g.save()
  g.translate(x, y)
  g.rotate(angle)
  if (!drawItem(g, WATERWHEEL_ART, r)) waterwheelShape(g, r)
  g.restore()
}

/** Fireflies drifting in a box — a live prop. */
export const fireflies = (g: G2D, x: number, y: number, w: number, h: number, t: number, alive: number): void => {
  for (let i = 0; i < 8; i++) {
    const px = x + ((sin(t * 0.4 + i * 1.7) + 1) / 2) * w
    const py = y + ((sin(t * 0.55 + i * 2.3) + 1) / 2) * h
    const a = alive * (0.4 + 0.6 * Math.abs(sin(t * 2 + i)))
    g.globalAlpha = a
    if (moteAt(g, px, py, 12, '#fff6a8')) continue
    g.globalAlpha = a * 0.5
    g.beginPath()
    g.arc(px, py, 12, 0, TAU)
    fill(g, '#fff6a8')
    g.globalAlpha = a
    g.beginPath()
    g.arc(px, py, 4, 0, TAU)
    fill(g, '#ffffff')
  }
  g.globalAlpha = 1
}

/* ───────────────────────────────── the shared painted props (§8.8) ── */

/*
 * Four shapes every chapter draws in its own colours — a twinkle, a puff, a
 * glowing mote, a soap bubble — and two the hanging decoration is threaded
 * from: a bunting flag and a paper lantern.
 *
 * They live here, in the base kit, because five or six kits each wink, puff
 * and bubble in their own function and a sheet per kit would be the same
 * picture six times. Every one is painted ONCE and the kit that uses it keeps
 * the procedural part: where the point is, how big it is this frame, how it
 * fades, and what colour it wears.
 *
 * Each seam is a helper that RETURNS whether it painted: the vector versions
 * build one batched path and fill it once for a dozen points, and that stays
 * exactly as it was when no painting has landed. A mixed frame cannot happen —
 * the sheet is there for the whole frame or it is not.
 */

/** A four-point twinkle at (x, y), radius `r`, ADDED to the current path. */
export const twinkleStar = (g: G2D, x: number, y: number, r: number): void => {
  g.moveTo(x, y - r)
  g.quadraticCurveTo(x + r * 0.16, y - r * 0.16, x + r, y)
  g.quadraticCurveTo(x + r * 0.16, y + r * 0.16, x, y + r)
  g.quadraticCurveTo(x - r * 0.16, y + r * 0.16, x - r, y)
  g.quadraticCurveTo(x - r * 0.16, y - r * 0.16, x, y - r)
}

/**
 * The twinkle as a painted still — the most-used shape in the game: every
 * `twinkles`, `winks`, `glints`, `sandGlints` and shooting-star head is this
 * one star at a radius the clock sets.
 *
 * Drawn through a SCALE so `ink` is not asked for a hairline: the reference is
 * rendered at the bench's unit and the star is authored at 1.
 */
export const TWINKLE_ART: ItemSpec = {
  ...PROP_ART.twinkle, frames: 1, tinted: true,
  draw: (g, s, _f, accent) => {
    g.save()
    g.scale(s, s)
    g.beginPath()
    twinkleStar(g, 0, 0, 1)
    fill(g, accent.base)
    ink(g, 0.14)
    g.restore()
  }
}

/**
 * One twinkle of radius `r` in `col`: blits the painting and returns true, or
 * adds the star to the caller's current path and returns false so the caller
 * keeps its single batched fill.
 */
export const twinkleAt = (g: G2D, x: number, y: number, r: number, col: string): boolean => {
  g.save()
  g.translate(x, y)
  const hit = drawItem(g, TWINKLE_ART, r, 0, col)
  g.restore()
  if (!hit) twinkleStar(g, x, y, r)
  return hit
}

/** A soft round puff about the origin, radius 1 — smoke, spray, sand dust. */
const puffShape = (g: G2D, col: string): void => {
  g.beginPath()
  g.arc(0, 0, 1, 0, TAU)
  fill(g, col)
}

/** The puff as a painted still: chimney smoke, a fall's spray, a sandfall's
 *  dust. The rise, the swell and the fade stay the particle system's. */
export const PUFF_ART: ItemSpec = {
  ...PROP_ART.puff, frames: 1, tinted: true,
  draw: (g, s, _f, accent) => {
    g.save()
    g.scale(s, s)
    puffShape(g, accent.base)
    g.restore()
  }
}

/** One puff of radius `r` in `col` — painted if its sheet has landed. */
export const puffAt = (g: G2D, x: number, y: number, r: number, col: string): boolean => {
  g.save()
  g.translate(x, y)
  const hit = drawItem(g, PUFF_ART, r, 0, col)
  g.restore()
  return hit
}

/**
 * A glowing mote about the origin, halo radius 1: a soft ring of light with a
 * bright core — a firefly, a drifting spore.
 *
 * Drawn OPAQUE, where the live prop draws its halo at 45 %: a half-transparent
 * reference over magenta is a pink ring, and a painter paints the pink. The
 * fade is the game's `globalAlpha`, as it was.
 */
const moteShape = (g: G2D, col: string, lite: string): void => {
  g.beginPath()
  g.arc(0, 0, 1, 0, TAU)
  fill(g, lite)
  g.beginPath()
  g.arc(0, 0, 0.58, 0, TAU)
  fill(g, col)
  g.beginPath()
  g.arc(0, 0, 0.3, 0, TAU)
  fill(g, '#ffffff')
}

/** The mote as a painted still. It has a CORE, which is why it is painted and
 *  a bare `glow` is not: a wash with no core has no shape to paint. */
export const MOTE_ART: ItemSpec = {
  ...PROP_ART.mote, frames: 1, tinted: true,
  draw: (g, s, _f, accent) => {
    g.save()
    g.scale(s, s)
    moteShape(g, accent.base, accent.lite)
    g.restore()
  }
}

/** One mote with halo radius `r` in `col` — painted if its sheet has landed. */
export const moteAt = (g: G2D, x: number, y: number, r: number, col: string): boolean => {
  g.save()
  g.translate(x, y)
  const hit = drawItem(g, MOTE_ART, r, 0, col)
  g.restore()
  return hit
}

/**
 * A soap bubble about the origin, radius 1: a RING of skin and a highlight,
 * with the middle left open.
 *
 * The live bubble fills its disc, because a translucent fill is one call; the
 * reference draws the hole, because a reference that shows a solid ball and a
 * prompt that says "see-through" disagree, and the picture wins.
 */
const bubbleShape = (g: G2D, col: string): void => {
  g.beginPath()
  g.arc(0, 0, 1, 0, TAU)
  // Its own subpath, or the ring closes with a spoke across it at 3 o'clock —
  // and a painter paints the spoke.
  g.moveTo(0.78, 0)
  g.arc(0, 0, 0.78, 0, TAU, true)
  fill(g, col)
  ink(g, 0.09)
  g.beginPath()
  g.arc(-0.42, -0.42, 0.2, 0, TAU)
  fill(g, '#ffffff')
}

/** The bubble as a painted still — the rise and the wobble stay drawn. */
export const BUBBLE_ART: ItemSpec = {
  ...PROP_ART.bubble, frames: 1, tinted: true,
  draw: (g, s, _f, accent) => {
    g.save()
    g.scale(s, s)
    bubbleShape(g, accent.base)
    g.restore()
  }
}

/** One bubble of radius `r` in `col` — painted if its sheet has landed. */
export const bubbleAt = (g: G2D, x: number, y: number, r: number, col: string): boolean => {
  g.save()
  g.translate(x, y)
  const hit = drawItem(g, BUBBLE_ART, r, 0, col)
  g.restore()
  return hit
}

/** A bunting flag hanging from the origin, 1 unit wide: a little triangle. */
const flagShape = (g: G2D, col: string): void => {
  g.beginPath()
  g.moveTo(-0.5, 0)
  g.lineTo(0.5, 0)
  g.lineTo(0, 1.18)
  g.closePath()
  fill(g, col)
  ink(g, 0.12)
}

/**
 * The bunting flag as a painted still.
 *
 * The CORD is not here and never can be: it is a bezier through the points the
 * call site hands over, so it has no constant shape. The flag does — it is the
 * same little triangle at every station — so the kit threads the painting
 * along its own curve, exactly as it threaded the vector.
 */
export const FLAG_ART: ItemSpec = {
  ...PROP_ART.flag, frames: 1, tinted: true,
  draw: (g, s, _f, accent) => {
    g.save()
    g.scale(s, s)
    flagShape(g, accent.base)
    g.restore()
  }
}

/** One bunting flag `w` wide, `h` deep, in `col` — painted if its sheet has
 *  landed. The caller has already placed and tilted it. */
export const flagAt = (g: G2D, w: number, h: number, col: string): boolean => {
  g.save()
  g.scale(1, h / (w * 1.18))
  const hit = drawItem(g, FLAG_ART, w, 0, col)
  g.restore()
  return hit
}

/** A paper lantern hanging from the origin, 1 unit wide: a round body with a
 *  gold cap above and below. */
const lanternShape = (g: G2D, col: string): void => {
  g.beginPath()
  g.ellipse(0, 0, 0.5, 0.57, 0, 0, TAU)
  fill(g, col)
  ink(g, 0.1)
  g.beginPath()
  g.roundRect(-0.27, -0.75, 0.54, 0.22, 0.07)
  g.roundRect(-0.23, 0.53, 0.46, 0.2, 0.07)
  fill(g, '#ffd97a')
  ink(g, 0.07)
}

/** The paper lantern as a painted still — the oasis's string and the
 *  festival's. Its swing, its sag and its halo stay drawn. */
export const LANTERN_ART: ItemSpec = {
  ...PROP_ART.lantern, frames: 1, tinted: true,
  draw: (g, s, _f, accent) => {
    g.save()
    g.scale(s, s)
    lanternShape(g, accent.base)
    g.restore()
  }
}

/** One paper lantern `w` wide in `col`, already placed and swung by the
 *  caller — painted if its sheet has landed. */
export const lanternAt = (g: G2D, w: number, col: string): boolean => drawItem(g, LANTERN_ART, w, 0, col)

/** One bee about the origin, body 1 unit long: a fat amber body under a pale
 *  wing. Three of them loop round the woods' hive. */
const beeShape = (g: G2D): void => {
  g.beginPath()
  g.ellipse(0, 0, 0.5, 0.36, 0, 0, TAU)
  fill(g, '#ffcf4a')
  ink(g, 0.14)
  g.beginPath()
  g.ellipse(-0.14, -0.43, 0.36, 0.21, -0.4, 0, TAU)
  fill(g, 'rgba(255,255,255,0.85)')
}

/** The bee as a painted still — its loop round the hive stays the drawing's. */
export const BEE_ART: ItemSpec = {
  ...PROP_ART.bee, frames: 1,
  draw: (g, s) => {
    g.save()
    g.scale(s, s)
    beeShape(g)
    g.restore()
  }
}
