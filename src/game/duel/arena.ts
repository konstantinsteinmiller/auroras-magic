/**
 * ARENA — everything the duel happens *in*: the sky, the weather, and the
 * floating island the two unicorns stand on. Ported unchanged from the jam
 * build.
 *
 * THE SKY IS THE SCOREBOARD (GDD 2.3). Everything here is driven by one
 * number, `S.sky` (0..1):
 *
 *   0.0  losing  — clouds darken to near-black, light goes cold and low, rain
 *   0.5  even    — heavy dark grey storm
 *   1.0  winning — clouds thin and lift, sun breaks through, full rainbow arc
 *
 * COST MODEL. The island and the cloud band are baked ONCE into offscreen
 * canvases at the current device scale and blitted afterwards; they rebuild
 * only when that scale changes (or `resetArena()` is called). The sky gradient
 * is cached the same way. Only genuinely animated things — cloud drift,
 * rainbow alpha, rain, motes and the swaying grass tufts — are drawn live, and
 * every bit of variation comes from `seeded()` or from `t`, never
 * `Math.random()`, so nothing shimmers.
 *
 * THE ISLAND IS HAND-DRAWN, NOT PLOTTED. Every shape is deliberately irregular,
 * but the irregularity is *generated*: one wobble function shapes the whole
 * mossy cap, one seeded walk shapes the rock, and the tufts borrow the weather
 * particles as their jitter table. Flat colour, thick dark outline, hard cel
 * edges, no gradients.
 *
 * PAINTED (§8.27): each chapter's island is one painting
 * (`images/islands/island-<n>-<chapter>.webp`), registered onto this drawing's
 * own box (`islandArt`). When it has decoded it replaces the baked island and
 * the live tufts; the sky's mood still tints it, through the painting's own
 * silhouette.
 */
import { SW, SH } from '@/game/duel/config'
import { S, rainbow } from '@/game/duel/state'
import { TAU, PI, sin, cos, abs, sign, clamp, seeded } from '@/game/duel/util'
import { arenaTheme, type ArenaTheme } from '@/game/duel/arenaThemes'
import { spriteFor } from '@/game/art'
import { drawItem, itemBox, type ItemSpec } from '@/game/artItem'
import { islandArtId } from '@/game/artIds'

type G2D = CanvasRenderingContext2D
/** Anything a path can be traced into: a context or a Path2D. */
type PathSink = Pick<Path2D, 'moveTo' | 'quadraticCurveTo'>

/* ------------------------------- layout ---------------------------- */
const CX = 640 // island centre
const TY = 508 // island rim — the surface the duelists stand on
const RX = 300 // island rim half-width
const BY = 702 // jagged tip underneath
const IX = 326 // blit box of the baked island
const IY = 450
const IW = 628
const IH = 268
const CH = 340 // baked cloud-band height

/* ----------------------------- shorthands -------------------------- */
/* `D` is whichever context we are painting into right now. */
let D!: G2D
const BP = (): void => D.beginPath()
const AL = (a: number): void => { D.globalAlpha = a }
const SV = (): void => D.save()
const RS = (): void => D.restore()
const FL = (c?: string): void => {
  if (c) D.fillStyle = c
  D.fill()
}
const SK = (c?: string): void => {
  if (c) D.strokeStyle = c
  D.stroke()
}

/* ------------------------------- palette --------------------------- */
/**
 * Sky colour at balance `k`, as one closed form so no palette table is needed:
 *   hue    232 (cold blue-black) -> 225 (storm) -> 203 (open day)
 *   sat    dips to grey for the even duel, rises toward both extremes
 *   light  4% (near black) -> 31% (heavy grey) -> 58% (bright)
 * `d`=0 is the zenith, `d`=1 the horizon — always lighter, and as the player
 * wins it swings the LONG way round (violet, pink) to gold at 1.0, which is
 * the light breaking through. Going the short way would pass through green.
 */
const col = (k: number, d: number): string =>
  `hsl(${(232 - 29 * k * k + d * clamp(k * 2 - 1, 0, 1) ** 2 * 195) | 0},${(14 + 96 * abs(k - 0.5)) | 0}%,${(4 + 54 * k + d * 24) | 0}%)`

/* -------------------------------- cache ---------------------------- */
let isle: HTMLCanvasElement | null = null // baked island
let clds: HTMLCanvasElement | null = null // baked, horizontally tileable cloud band
let sil: Path2D | null = null // island silhouette in stage space — doubles as tint mask
let bk = 0 // device scale the bakes were made at
let bt = -1 // chapter theme the bakes were made for (§9.6)
let TH: ArenaTheme = arenaTheme(0)
let grad: CanvasGradient | null = null // sky gradient
let gradCtx: G2D | null = null
let gk = -1 // sky bucket `grad` was built for
let K = 0.5 // S.sky, clamped
let W = 0 // winning 0..1
let L = 0 // losing 0..1

/** Weather particles [x, y, length, speed] — shared by rain and motes. */
const P: [number, number, number, number][] = []
const pr = seeded(1337)
for (let i = 0; i < 96; i++) P.push([pr() * SW, pr() * SH, 12 + pr() * 18, 0.6 + pr() * 0.8])

/** A fresh offscreen canvas `w`x`h` STAGE units, already scaled to the
    device, with `D` pointed at it. */
const cv = (w: number, h: number): HTMLCanvasElement => {
  const e = document.createElement('canvas')
  e.width = Math.max(1, Math.round(w * bk))
  e.height = Math.max(1, Math.round(h * bk))
  D = e.getContext('2d')!
  D.scale(bk, bk)
  return e
}
/** Quantised device scale — the bakes only rebuild when this actually moves. */
const qs = (): number => clamp(((S.vs * S.dpr * 2) | 0) / 2, 0.5, 2)

/* ------------------------------- baking ---------------------------- */

/**
 * ONE wobbly, scalloped disc, traced into `P` (a context or a Path2D).
 * The cap outline and every tone band call this, so the bands read as contour
 * lines of a single hand-drawn shape — and because they share the wobble they
 * can never cross each other. `s` bulges the quadratic control points outwards
 * into the soft scallops that make the moss look like it is spilling over the
 * rim. The wobble harmonic is a WHOLE number of cycles per turn, so the ring
 * closes on itself exactly.
 */
const cap = (p: PathSink, rx: number, ry: number, cy: number, s: number): void => {
  for (let i = 0; i <= 13; i++) {
    const a = (TAU * i) / 13
    const m = a - PI / 13
    const k = 1 + 0.07 * sin(a * 3 + 1)
    const x = CX + cos(a) * rx * k
    const y = cy + sin(a) * ry * k
    if (i) p.quadraticCurveTo(CX + cos(m) * (rx + s * 1.6), cy + sin(m) * (ry + s), x, y)
    else p.moveTo(x, y)
  }
}

/** Rock outline vertices, flat x,y — the cel planes are cut straight from
    these, so a plane can never spill past a crag. */
const V: number[] = []
/** Island outline in stage units: a chunky hanging rock plus the mossy cap. */
const buildSil = (): void => {
  const r = seeded(9)
  V.length = 0
  V.push(CX - RX, TY)
  /* Few points, big jitter: large irregular planes instead of a smooth cone.
     The alternating squeeze knocks every other vertex in, which turns the
     profile into jutting crags rather than a tidy taper. */
  for (let i = -6; i < 7; i++) {
    const u = 1 - abs(i) / 6.5
    V.push(
      CX + sign(i) * RX * (1 - u) * (0.58 + r() * 0.42) * (i & 1 ? 1 : 0.8),
      TY + (BY - TY) * u * (0.42 + u * 0.58)
    )
  }
  V.push(CX + RX, TY)
  const p = new Path2D()
  p.moveTo(V[0]!, V[1]!)
  for (let i = 2; i < V.length; i += 2) p.lineTo(V[i]!, V[i + 1]!)
  p.closePath()
  cap(p, RX, 34, TY, 15)
  sil = p
}

/** The island itself, in stage units, into `D` in theme `TH`: the rock, its
 *  cel planes, the roots, the mossy cap and the little stones. */
const paintIsle = (s: Path2D): void => {
  D.lineJoin = D.lineCap = 'round'
  D.lineWidth = 6
  D.fillStyle = TH.rock
  D.strokeStyle = '#112'
  D.fill(s)
  D.stroke(s)

  /* Two big cel planes over the lit base tone, each one running from a point
     along the rim down to the tip and back up the right flank. Large flat
     faces plus the outline's own jutting crags is what makes rock read as
     chunky. */
  for (let j = 0; j < 2; j++) {
    BP()
    D.moveTo(CX - 40 + j * 90, TY)
    /* 30 == V.length: 13 walked vertices plus the two rim ends. */
    for (let i = 10 + j * 4; i < 30; i += 2) D.lineTo(V[i]!, V[i + 1]!)
    FL(j ? TH.plane2 : TH.plane1)
  }

  /* roots trailing out from under the moss */
  const dr = seeded(23)
  D.lineWidth = 3
  BP()
  for (let i = 3; i--;) {
    const x = 430 + dr() * 420
    D.moveTo(x, TY + 22)
    D.quadraticCurveTo(x - 28, TY + 58, x + dr() * 30, TY + 76)
  }
  SK(TH.roots)

  /* ---- mossy cap: one wobbly disc, three cel bands and a rim-lit lip.
          The bright band is laid down 4px high and then covered by the lit
          top, so all that survives is a lip along the sunward edge. ---- */
  D.lineWidth = 6
  BP()
  cap(D, RX, 34, TY, 15)
  FL(TH.cap)
  SK('#112')
  BP()
  cap(D, RX - 12, 30, TY - 3, 1)
  FL(TH.capMid)
  BP()
  cap(D, RX - 39, 22, TY - 8, 1)
  FL(TH.capLip)
  BP()
  cap(D, RX - 40, 22, TY - 4, 1)
  FL(TH.capTop)

  /* ---- things living up there: pale mossy stones and warm little blossoms,
          alternating, every one a different size and none evenly spaced. Kept
          small and low-contrast so they stay behind the duelists. ---- */
  D.lineWidth = 2
  for (let i = 8; i--;) {
    const sz = 4 + dr() * 5
    BP()
    D.ellipse(408 + dr() * 466, TY - 13 + dr() * 22, sz, sz * 0.7, 0, 0, TAU)
    FL(i & 1 ? TH.dotA : TH.dotB)
    SK()
  }
}

const bake = (): void => {
  bk = qs()
  bt = S.theme
  TH = arenaTheme(bt)
  buildSil()

  /* ---- island: flat fills, thick dark outline, faceted rock ---- */
  isle = cv(IW, IH)
  D.translate(-IX, -IY)
  paintIsle(sil!)

  /* ---- cloud band: one silhouette, tileable, re-tinted at draw time ---- */
  clds = cv(SW, CH)
  const br = seeded(5)
  const B: [number, number, number][] = []
  for (let i = 0; i < 30; i++) B.push([br() * SW, 70 + br() * 100, 60 + br() * 66])
  /** One pass over every blob, plus its wrap copies so the band tiles. */
  const pass = (grow: number, dy: number, c: string): void => {
    D.fillStyle = c
    for (const b of B) {
      for (let o = -1; o < 2; o++) {
        BP()
        D.arc(b[0] + o * SW, b[1] + dy, b[2] + grow, 0, TAU)
        D.fill()
      }
    }
  }
  pass(5, 0, '#112') // one thick dark outline around the whole union
  D.fillStyle = TH.cloud // solid ceiling: the band never gaps at the top
  D.fillRect(0, 0, SW, 92)
  pass(0, 0, TH.cloud)
  pass(-18, -16, TH.cloudLit) // lit tops
}

/** Point the shorthands at `g`, refresh the balance, bake if we must. */
const sync = (g: G2D): void => {
  K = clamp(S.sky, 0, 1)
  W = clamp(K * 2 - 1, 0, 1)
  L = clamp(1 - K * 2, 0, 1)
  if (!isle || qs() !== bk || bt !== S.theme) bake()
  D = g
}

/* -------------------------------- API ------------------------------ */

/** Drop every cached surface — call on viewport change. */
export const resetArena = (): void => {
  isle = clds = null
  sil = null
  grad = null
  bk = 0
  gk = -1
}

/**
 * Bake the island and cloud band NOW, at the current stage scale. The loader
 * calls this behind the splash (the playbook's "procedural assets are assets"
 * rule) so the first frame of the duel does not pay for it.
 */
export const primeArena = (): void => {
  if (!isle || qs() !== bk || bt !== S.theme) bake()
}

/** True once the arena's baked surfaces exist at the current scale. */
export const arenaReady = (): boolean => !!isle && qs() === bk && bt === S.theme

/** Sky, clouds, rainbow. Fills the whole stage; draw this first. */
export const drawSky = (g: G2D, t: number): void => {
  sync(g)
  SV()

  /* body of the sky — rebuilt only when the balance moves a whole bucket */
  const b = (K * 32) | 0
  if (b !== gk || gradCtx !== g || !grad) {
    gk = b
    gradCtx = g
    grad = g.createLinearGradient(0, 0, 0, SH)
    grad.addColorStop(0, col(K, 0))
    grad.addColorStop(1, col(K, 1))
  }
  D.fillStyle = grad
  D.fillRect(0, 0, SW, SH)

  /* the rainbow — a hint from 0.52 up, a full brilliant arc at 1.0 */
  const ra = clamp(K * 2.2 - 1.15, 0, 1)
  if (ra > 0.01) {
    AL(ra)
    D.lineWidth = 22
    for (let i = 0; i < 7; i++) {
      BP()
      D.arc(CX, 760, 500 - i * 22, PI, TAU)
      SK(rainbow(i * 0.115, 62, 0.82))
    }
    AL(1)
  }

  /* Clouds. The band is baked mid-grey, so MULTIPLYing it darkens the sky
     into a heavy storm, and SCREENing it turns the same shapes into thin
     bright cloud. Crossfade between the two, and lift the band as we win. */
  const cy = -18 - 170 * W
  const dx = -((t * 7) % SW)
  SV()
  for (let i = 0; i < 2; i++) {
    const a = i ? W * 0.55 : 1 - W
    if (a > 0.03 && clds) {
      AL(a)
      D.globalCompositeOperation = i ? 'screen' : 'multiply'
      D.drawImage(clds, dx, cy, SW, CH)
      D.drawImage(clds, dx + SW, cy, SW, CH)
    }
  }
  RS()

  RS()
}

/**
 * Grass tufts along the rim. Drawn LIVE over the blit — one path, one fill —
 * so they can breathe without ever re-baking the island. The weather particles
 * already hold four seeded randoms each, so `P` doubles as the tuft jitter
 * table. Time comes from `S.t`.
 */
const grass = (): void => {
  const n = S.q > 0.6 ? 40 : 22
  BP()
  for (let i = n; i--;) {
    const o = P[i]!
    const a = PI + (PI * (i + o[0] / 430)) / n
    const x = CX + cos(a) * RX * 0.94
    const y = TY + sin(a) * 30 + 6
    const h = o[2] * o[3] * 1.4
    const w = h / 9
    const s = o[1] / 16 - 22 + sin(S.t * 1.6 + x * 0.05) * 4
    D.moveTo(x - w, y)
    D.quadraticCurveTo(x, y - h * 0.85, x + s, y - h)
    D.quadraticCurveTo(x + w + s * 0.4, y - h * 0.4, x + w, y)
  }
  FL(L > 0.4 ? TH.tuftDark : TH.tuft)
}

/* ------------------------------ painted ----------------------------- */

const islandSpecs = new Map<number, ItemSpec>()

/**
 * Chapter theme `theme`'s island as a painted drawable (§8.27): the island
 * alone — no clouds, no tufts — centred on the origin at scale `s` = its
 * blit box's width. The bench renders the reference from it, and the
 * painting is blitted back into the box measured from it.
 */
export const islandArt = (theme: number): ItemSpec => {
  const hit = islandSpecs.get(theme)
  if (hit) return hit
  const spec: ItemSpec = {
    kind: 'island',
    id: islandArtId(theme),
    frames: 1,
    draw: (g, s) => {
      if (!sil) buildSil()
      const keepD = D
      const keepTH = TH
      D = g
      TH = arenaTheme(theme)
      g.save()
      g.scale(s / IW, s / IW)
      g.translate(-IX - IW / 2, -IY - IH / 2)
      paintIsle(sil!)
      g.restore()
      D = keepD
      TH = keepTH
    }
  }
  islandSpecs.set(theme, spec)
  return spec
}

/** The painting's silhouette in one flat colour, for the sky's mood tint. */
const moods = new Map<string, HTMLCanvasElement>()
const moodOf = (img: HTMLImageElement, colour: string): HTMLCanvasElement => {
  const key = `${img.src}|${colour}`
  const hit = moods.get(key)
  if (hit) return hit
  const c = document.createElement('canvas')
  c.width = img.naturalWidth
  c.height = img.naturalHeight
  const m = c.getContext('2d')!
  m.drawImage(img, 0, 0)
  m.globalCompositeOperation = 'source-in'
  m.fillStyle = colour
  m.fillRect(0, 0, c.width, c.height)
  if (moods.size > 8) moods.clear()
  moods.set(key, c)
  return c
}

/** The painted island, if its painting has decoded: true when it drew. */
const drawPaintedIsland = (g: G2D): boolean => {
  const img = spriteFor('island', islandArtId(S.theme))
  if (!img) return false
  const spec = islandArt(S.theme)
  g.save()
  g.translate(IX + IW / 2, IY + IH / 2)
  const drew = drawItem(g, spec, IW)
  const a = abs(K * 2 - 1)
  if (drew && a > 0.02) {
    const box = itemBox(spec)
    g.globalAlpha = a * (L ? 0.5 : 0.22)
    g.drawImage(moodOf(img, L ? '#012' : '#fea'), box.x * IW, box.y * IW, box.w * IW, box.h * IW)
    g.globalAlpha = 1
  }
  g.restore()
  return drew
}

/** The floating island: one blit, the live tufts, one mask-fill of tint. */
export const drawIsland = (g: G2D): void => {
  sync(g)
  if (drawPaintedIsland(g)) return
  if (isle) g.drawImage(isle, IX, IY, IW, IH)
  grass()
  /* the silhouette doubles as a mask, so the ground picks up the sky's mood
     without a second offscreen surface: cold and dark, or warm and lit */
  const a = abs(K * 2 - 1)
  if (a > 0.02 && sil) {
    AL(a * (L ? 0.5 : 0.22))
    D.fillStyle = L ? '#012' : '#fea'
    D.fill(sil)
    AL(1)
  }
}

/** Foreground weather — rain while losing, drifting motes while winning. */
export const drawWeather = (g: G2D, t: number): void => {
  sync(g)
  const q = clamp(S.q || 1, 0.3, 1)
  const rain = clamp(1 - K * 2.2, 0, 1)
  SV()

  if (rain > 0.02) {
    AL(0.2 + rain * 0.4)
    D.lineWidth = 1.7
    D.lineCap = 'round'
    BP()
    for (let i = (96 * rain * q) | 0; i--;) {
      const o = P[i]!
      const y = ((o[1] + t * o[3] * 620) % (SH + 140)) - 70
      const x = (o[0] - y * 0.16 + 2560) % SW
      D.moveTo(x, y)
      D.lineTo(x - o[2] * 0.16, y + o[2] * 1.5)
    }
    SK('#bad')
  }

  if (W > 0.03) {
    D.fillStyle = '#fed'
    for (let i = (44 * q) | 0; i--;) {
      const o = P[i]!
      AL(W * (0.25 + 0.18 * (1 + sin(t * 1.7 + o[0]))))
      D.fillRect((o[0] + t * o[3] * 22) % SW, o[1], 2.4, 2.4)
    }
  }
  RS()
}
