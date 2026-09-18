/**
 * fx.ts — the whole juice layer. Ported unchanged from the jam build.
 *
 * ART DIRECTION (GDD 2.2): HAND-DRAWN CEL SPELL ART, not a particle system.
 * Every piece of a spell is a SOLID-COLOURED SILHOUETTE with a thick
 * near-black outline, and the silhouette — not the colour — is what makes the
 * element readable at a glance:
 *
 *   FIRE   curling flame tongues in deep-red -> orange -> pale-yellow bands,
 *          flying tip-first and CLIMBING (negative gravity)
 *   WIND   long tapering crescent swooshes, translucent white/cyan, spinning
 *          fast, hanging and drifting — line-work, not mass
 *   ICE    sharp faceted spindles that fall hard and skitter off the ground
 *   EARTH  chunky irregular rock blocks: heavy, tumbling, settling into a pile
 *
 * All of it comes out of ONE vocabulary of unit polygons (SIL) and ONE builder
 * (`shp`), so a shockwave, a shield and a spark are the same six outlines at
 * different scales. NOTHING cross-dissolves: hand-drawn effects POP, so shapes
 * die by shrinking out, never by fading.
 *
 * TIMING — all curve, no extra state:
 *   WIND-UP   every piece ramps from half to full size over its first TWO frames
 *   PEAK      a white silhouette of the element and a white-hot shock front
 *             hold for ~3 frames — the classic 2D "impact frame"
 *   FALLOFF   lifetimes are spread rnd*rnd, so most of the wave is gone within
 *             a few frames and a thin tail rides on
 *   SETTLE    what is left tumbles with DAMPED spin, falls, and pops out
 *   HOLD      a piece spawned with `dl` sits frozen and invisible until its beat
 *
 * PERFORMANCE CONTRACT
 *   - ONE flat pre-allocated Float32Array pool with a stride. No per-particle
 *     object is ever allocated; `updateFx` allocates nothing at all.
 *   - Ring allocator: a saturated pool recycles its oldest slot.
 *   - Colour strings are precomputed ONCE into PAL and indexed by integer.
 *   - Colour-batched draw: one path -> one fill -> one stroke per colour.
 *   - No shadowBlur, no save()/restore(), `lighter` only for glints.
 *
 * COORDINATES are stage units (1280x720). The scene owns the letterbox.
 */
import { RUNES, SW, SH, GY } from '@/game/duel/config'
import { S, rainbow } from '@/game/duel/state'
import { TAU, PI, sin, cos, rnd, min, max, clamp, atan2 } from '@/game/duel/util'

type G2D = CanvasRenderingContext2D

/* ------------------------------------------------------------------ *
 * Palette — built ONCE at module load. A particle stores an integer index
 * into it and never builds a colour string again.
 *
 *   0..3   rune primary   (FIRE, WIND, ICE, EARTH)
 *   4..7   rune highlight — the second tone of the two-tone cel look
 *   8      deep ember red — fire's third, darkest band
 *   9      white
 *   10..17 rainbow wheel  (drawing trail + victory)
 * ------------------------------------------------------------------ */
const PAL: string[] = [...RUNES.map((r) => r[0]), ...RUNES.map((r) => r[1]), '#e03a10', '#fff']
/** WIND is air: its two tones carry alpha in the colour itself, so translucent
 *  swooshes cost no globalAlpha juggling in the batched pass. */
PAL[1] += 'e0'
PAL[5] += 'd0'
/** The one outline colour. Thick + near-black = the whole cel look. */
const OUT = '#140d18'
const C_EMBER = 8
const C_WHITE = 9
const C_RB = 10

for (let i = 8; i--;) PAL[C_RB + i] = rainbow(i / 8, 62)

/* ------------------------------------------------------------------ *
 * THE SHAPE VOCABULARY. Six unit polygons, long axis on +x, tip at +x.
 * Packed one char per coordinate (v = (charCode - 77) / 24).
 *
 *   0 GLINT    four-point sparkle star
 *   1 FLAME    teardrop with a hooked tip, fuller along one edge
 *   2 SWOOSH   comma/crescent: thick head, long tapering tail
 *   3 CRYSTAL  sharp faceted spindle
 *   4 ROCK     chunky irregular hexagon with flat faces
 *   5 BLOCK    tilted slab (fire rain)
 * ------------------------------------------------------------------ */
const SIL: number[][] = 'eMQRMaIR5MIHM9QH|iLUTFW9R<L6FGEUH|cTTYBW0MCPSOaL|lMTUBT4NBFTE|eTWaAa5LB:Z<|e^8b5<b7'
  .split('|')
  .map((s) => [...s].map((c) => (c.charCodeAt(0) - 77) / 24))

/* ------------------------------------------------------------------ *
 * The pool. ONE Float32Array, no objects, ever.
 *
 * stride 11:  0 x   1 y   2 vx  3 vy
 *             4 life-left  5 total life  6 radius  7 angle
 *             8 rate     — spin | growth (ring) | rest height (block)
 *             9 kind    10 palette index
 *
 * life-left ABOVE total life is the HOLD: the piece has been spawned but its
 * beat has not come up yet, so it sits frozen and invisible.
 * ------------------------------------------------------------------ */
const CAP = 360
const ST = 11
const P = new Float32Array(CAP * ST)
/** Which palette indices are live this frame — lets the draw pass skip fast. */
const USED = new Uint8Array(PAL.length)
let head = 0
let live = 0
let T = 0
let glow = 0

/* Kinds. A kind IS a silhouette plus the physics that silhouette implies. The
   four THROWN kinds are listed in RUNE ORDER, so rune r throws kind r + 1. */
const K_GLINT = 0
const K_FLAME = 1 // FIRE
const K_SWOOSH = 2 // WIND
const K_SHARD = 3 // ICE
const K_ROCK = 4 // EARTH
const K_BLOCK = 5
const K_RING = 6
/** Gravity per kind: fire climbs away, wind barely knows gravity exists, ice
 *  drops hard, rock drops harder. */
const G = [0, -380, -40, 760, 1050, 800, 0]
/** Drag per kind: wind hangs in the air, rock ploughs through it. */
const DR = [3.2, 2, 2.4, 0.7, 0.7, 0, 0]

/** Screen-shake offset. REUSED array — shakeOffset() never allocates. */
const SO: [number, number] = [0, 0]

/** Two barrier slots (left duelist / right duelist): tt, x, y, rune. */
const BR = new Float32Array(8)

/* ------------------------------- spawn ------------------------------ */

/** Ring allocator: always writes the oldest slot, so the pool is a hard cap.
 *  `dl` HOLDS the piece for that many seconds before it exists. */
const sp = (
  x: number, y: number, vx: number, vy: number, l: number, r: number, k: number, c: number,
  dl = 0, rate = (rnd() - 0.5) * 6
): void => {
  const i = head * ST
  head = (head + 1) % CAP
  if (P[i + 4]! <= 0) live++
  P[i] = x
  P[i + 1] = y
  P[i + 2] = vx
  P[i + 3] = vy
  P[i + 4] = (P[i + 5] = l) + dl
  P[i + 6] = r
  // Shaped debris flies POINT-FIRST. Aligning the silhouette to its velocity is
  // the whole difference between confetti and a corona of flames.
  P[i + 7] = k > 3 ? rnd() * TAU : atan2(vy, vx)
  P[i + 8] = rate
  P[i + 9] = k
  // FIRE is three bands, never one: its primary index fans out per particle
  // into deep ember / orange / pale yellow, which is the whole cel fire look.
  USED[(P[i + 10] = c || (rnd() < 0.4 ? C_EMBER : rnd() < 0.5 ? 4 : 0))] = 1
}

/** Radial spray. `r0` spawns on a circle instead of at a point — with a
 *  NEGATIVE speed that is an in-rush. `dl` staggers the spray across that many
 *  seconds. Lifetimes are rnd*rnd, i.e. front-loaded. */
const burst = (
  x: number, y: number, n: number, spd: number, life: number, rad: number, k: number,
  c0: number, c1: number, dl = 0, spread = TAU, dir = 0, r0 = 0
): void => {
  n = max(1, (n * S.q) | 0)
  while (n--) {
    const a = dir + (rnd() - 0.5) * spread
    const ca = cos(a)
    const sa = sin(a)
    const v = spd * (0.35 + rnd() * 0.85)
    sp(
      x + ca * r0,
      y + sa * r0,
      ca * v,
      sa * v,
      life * (0.4 + rnd() * rnd() * 1.4),
      rad * (0.45 + rnd() * 0.75),
      k,
      rnd() < 0.5 ? c0 : c1,
      dl * rnd()
    )
  }
}

const ring = (x: number, y: number, c: number, r0: number, grow: number, life: number): void =>
  sp(x, y, 0, 0, life, r0, K_RING, c, 0, grow)

/* ------------------------------- public ----------------------------- */

export const shakeAdd = (v: number): number => (S.shake = min(1, S.shake + v))
export const flashAdd = (v: number): number => (S.flash = min(1, S.flash + v))

/** Glowing motes chasing the drawing finger. `hue` is 0..1 around the wheel. */
export const trail = (x: number, y: number, hue: number): void =>
  // white sparks salted through the colour
  burst(x, y, 1, 74, 0.45, 8, K_GLINT, C_WHITE, C_RB + (((hue * 8) | 0) & 7))

/**
 * ANTICIPATION — the beat shared by "a rune exists now", "a spell is leaving"
 * and "a shield slams up": element shapes rush INWARD off a circle while a ring
 * closes onto the same point, so energy visibly GATHERS instead of exploding.
 */
const gather = (x: number, y: number, rune: number, _p?: number): void => {
  burst(x, y, 7, -240, 0.27, 12, (rune & 3) + 1, rune, rune + 4, 0, TAU, 0, 68)
  ring(x, y, rune, 64, -460, 0.24)
  burst(x, y, 5, 180, 0.3, 6, K_GLINT, C_WHITE, rune)
  flashAdd(0.13)
}

/**
 * Horn discharge: anticipation at the horn, THEN the release — the cone is
 * held back a few frames and sweeps out over ~0.08s, so the gather is still
 * visibly closing when the spell tears out of it.
 */
export const castBurst = (x: number, y: number, rune: number): void => {
  gather(x, y, rune)
  burst(x, y, 9, 300, 0.5, 16, (rune & 3) + 1, rune, rune && rune + 4, 0.08, 1.3, x < SW / 2 ? 0 : PI)
  shakeAdd(0.16)
}

/**
 * Hit. The kind carries the element's whole behaviour: flames climb, crescents
 * hang and drift, shards fall hard, rocks tumble down and settle on the ground.
 * `p` is power 0..1 and scales count, speed, size, wave and shake.
 */
export const impact = (x: number, y: number, rune: number, p?: number): void => {
  p = clamp(+(p ?? 0) || 0, 0, 1)
  const k = (rune & 3) + 1
  // IMPACT FRAME: a white silhouette of the element, the biggest thing on
  // screen, ramping in over two frames and gone by the eighth.
  sp(x, y, 0, 0, 0.14, 30 + p * 34, k, C_WHITE)
  // Fire and ice (even runes) are the crisp elements and land on one beat;
  // wind and earth (odd) keep arriving. One bit of the rune buys the weight.
  burst(x, y, 7 + p * 11, 140 + p * 200, 1, 15 + p * 13, k, rune, rune && rune + 4, 0.03 + (rune & 1) * 0.13)
  ring(x, y, rune, 18, 340 + p * 240, 0.32 + p * 0.16)
  shakeAdd(0.22 + p * 0.55)
  flashAdd(0.1 + p * 0.3)
}

/**
 * THE signature effect: MANY small burning blocks patter out of an orange sky
 * over about a second and pile up, each landing lighting a flame where it
 * stops. They all spawn just above the frame and are HELD, so the rain arrives
 * as a stagger of individual hits instead of one wave.
 */
export const fireRain = (x: number, y: number, p: number): void => {
  p = clamp(+p || 0, 0, 1)
  let n = max(6, ((22 + 16 * p) * S.q) | 0)
  while (n--) {
    sp(
      x + (rnd() - 0.5) * 270,
      -30,
      (rnd() - 0.5) * 60,
      420 + rnd() * 220,
      2.9,
      5 + rnd() * 9, // small: a patter of chips, not a few boulders
      K_BLOCK,
      // Only the two BRIGHT bands: the sky wash behind is already ember.
      rnd() < 0.5 ? 0 : 4,
      rnd() * 0.85, // the patter: every block waits its own beat
      y - rnd() * 26 // where this block comes to rest — that IS the pile
    )
  }
  glow = max(glow, 1.6 + p)
  flashAdd(0.18)
}

/** Shield around a duelist. Safe to call once with the full duration OR every
 *  frame with the remaining time — either way it expires on its own.
 *  `tt <= 0` tears it down NOW (an ice pillar spends itself on one hit). */
export const barrier = (x: number, y: number, rune: number, tt: number): void => {
  const i = x < SW / 2 ? 0 : 4
  // A shield is an EVENT, not a state. Going up, it gathers into place; going
  // down it SHATTERS into its own element — deliberately a WEAK hit, since a
  // shield timing out happens on a clock the player did not press.
  if ((BR[i]! > 0) !== (tt > 0)) (tt > 0 ? gather : impact)(x, y - 30, rune, 0.3)
  BR[i] = tt
  BR[i + 1] = x
  BR[i + 2] = y
  BR[i + 3] = rune
}

export const heal = (x: number, y: number): void => burst(x, y, 12, 70, 1, 6, K_GLINT, C_WHITE, C_RB + 2)

/** Victory: the whole vocabulary at once, in the whole rainbow, unrolling over
 *  a fifth of a second so the colours arrive in waves. */
export const rainbowBurst = (x: number, y: number): void => {
  for (let i = 8; i--;) burst(x, y, 4, 260, 1.2, 15, 1 + (i & 3), C_RB + i, C_RB + ((i + 1) & 7), 0.2)
  ring(x, y, C_WHITE, 12, 900, 0.55)
  shakeAdd(0.35)
  flashAdd(0.5)
}

/* -------------------------------- step ------------------------------ */

export const updateFx = (dt: number): void => {
  dt = min(0.05, dt > 0 ? dt : 0) // junk/negative -> 0; a tab-switch spike can't teleport
  T += dt
  USED.fill(0)

  for (let i = 0; i < P.length; i += ST) {
    let l = P[i + 4]!
    if (l <= 0) continue
    if ((l -= dt) <= 0) {
      P[i + 4] = 0
      live--
      continue
    }
    // Still held back: frozen, invisible, waiting its turn in the stagger.
    if (l > P[i + 5]!) {
      P[i + 4] = l
      continue
    }
    const k = P[i + 9]!
    const d = max(0, 1 - DR[k]! * dt)
    let vx = P[i + 2]! * d
    let vy = P[i + 3]! * d + G[k]! * dt
    const x = P[i]! + vx * dt
    let y = P[i + 1]! + vy * dt
    let landed = false
    if (k === K_BLOCK) {
      // Blocks stop dead where they land — that IS the pile. `landed` reads the
      // STORED velocity, so a resting block fires its flare exactly once.
      if (y >= P[i + 8]!) {
        y = P[i + 8]!
        landed = P[i + 3]! > 0
        vx = vy = 0
      }
    } else if (k === K_RING) {
      // A shock front leaves FAST and decelerates.
      P[i + 6]! += P[i + 8]! * dt
      P[i + 8]! *= 1 - 3.2 * dt // dt is clamped to 50ms, so this never flips sign
    } else {
      // A flame re-aims at its velocity every frame, so the tongue CURLS as
      // gravity bends its path. Everything else spins, and the spin DAMPS.
      P[i + 7] = k === K_FLAME ? atan2(vy, vx) : P[i + 7]! + (P[i + 8]! *= 1 - 2.2 * dt) * dt
      // Ice and earth are the heavy elements: they meet the ground and settle.
      if (k > 2 && y > GY) {
        y = GY
        vy *= -0.32
        vx *= 0.62
      }
    }
    P[i] = x
    P[i + 1] = y
    P[i + 2] = vx
    P[i + 3] = vy
    P[i + 4] = l
    USED[P[i + 10]!] = 1
    if (landed) {
      shakeAdd(0.05)
      // ...and the flame catches a couple of frames LATER, not on contact.
      burst(x, y - 8, 3, 120, 0.55, 8, K_FLAME, 0, 0, 0.07)
    }
  }

  // Barriers run their own countdown back through `barrier`, so running out is
  // the same event as being torn down and shatters the same way.
  for (let i = 0; i < 8; i += 4) if (BR[i]! > 0) barrier(BR[i + 1]!, BR[i + 2]!, BR[i + 3]!, BR[i]! - dt)
  glow = max(0, glow - dt)

  S.flash = max(0, S.flash - dt * 2.6)
  // Trauma-based: offset scales with shake SQUARED, so small hits barely move.
  const s = (S.shake = max(0, S.shake - dt * 1.9))
  const p = s * s * 26
  SO[0] = sin(T * 61) * p
  SO[1] = sin(T * 77 + 2) * p
}

/* -------------------------------- draw ------------------------------ */

/**
 * Append silhouette `k` at (x,y), scaled by r and rotated by a, to the CURRENT
 * path. No transform, no save — so a hundred shapes stay one fill + one stroke.
 */
const shp = (g: G2D, k: number, x: number, y: number, r: number, a: number): void => {
  const p = SIL[k]!
  const c = cos(a) * r
  const s = sin(a) * r
  for (let i = 0; i < p.length; i += 2) {
    const X = x + p[i]! * c - p[i + 1]! * s
    const Y = y + p[i]! * s + p[i + 1]! * c
    if (i) g.lineTo(X, Y)
    else g.moveTo(X, Y)
  }
  g.closePath()
}

/**
 * One batched pass over the pool: for every palette index in use, build a
 * SINGLE path out of every particle sharing it, then fill (and outline) once.
 * `dot` picks the additive glints instead of the outlined cel shapes.
 */
const pass = (g: G2D, dot: boolean): void => {
  for (let b = 0; b < USED.length; b++) {
    if (!USED[b]) continue
    g.beginPath()
    let n = 0
    for (let i = 0; i < P.length; i += ST) {
      const k = P[i + 9]!
      if (P[i + 4]! <= 0 || P[i + 10] !== b || k === K_RING || (dot ? k : !k)) continue
      n = 1
      const t = P[i + 5]!
      const q = P[i + 4]! / t
      // THE ENVELOPE, and the only place timing is shaped:
      //   30 * t * (1 - q)  a REAL-TIME ramp — half size on the first frame,
      //                     full on the second. Negative while held back.
      //   q * 3             the pop-out: cel shapes hold full size and shrink
      //                     away over their last third.
      //   dot ? q : 1       glints have no body to hold, so they just taper.
      shp(g, k, P[i]!, P[i + 1]!, P[i + 6]! * max(0, min(dot ? q : 1, q * 3, 30 * t * (1 - q))), P[i + 7]!)
    }
    if (n) {
      g.fillStyle = PAL[b]!
      g.fill()
      if (!dot) g.stroke()
    }
  }
}

/**
 * Shields (GDD 4) — three flavours, three silhouettes, one code path:
 *   WIND  a translucent shimmering air sphere with crescents turning inside
 *   ICE   one solid faceted crystal pillar planted in front of the caster
 *   EARTH a stack of crumbled rock blocks
 */
const drawBar = (g: G2D, i: number): void => {
  const tt = BR[i]!
  // Blink out over the last second so the player sees the shield expiring.
  if (tt <= 0 || (tt < 1 && sin(T * 26) < 0)) return
  const r = BR[i + 3]!
  const x = BR[i + 1]!
  const y = BR[i + 2]!
  const f = x < SW / 2 ? 1 : -1 // which way "in front of me" points
  g.beginPath()
  if (r === 2) {
    // Body + a second, narrower spindle: the INK LINE where they overlap is the
    // flat facet, so the pillar reads as cut crystal. Rocking the inner spindle
    // SLIDES the facet across the face — a held shield has to be alive.
    shp(g, K_SHARD, x + f * 76, GY - 86, 98, -PI / 2)
    shp(g, K_SHARD, x + f * 92, GY - 92, 64, sin(T * 3) / 15 - PI / 2)
  } else if (r === 3) {
    for (let k = 6; k--;) shp(g, K_ROCK, x + f * (48 + (k & 1) * 40), GY - 26 - (k >> 1) * 46, 28, k * 2)
  } else {
    // Outer circle clockwise, inner circle ANTIclockwise: the fill is a hollow
    // shell, so the sphere shimmers around the caster without hiding them.
    g.arc(x, y, 60, 0, TAU)
    g.arc(x, y, 44, 0, TAU, true)
    for (let k = 4; k--;) {
      const a = k * 1.571 + T * 1.6
      shp(g, K_SWOOSH, x + cos(a) * 30, y + sin(a) * 27, 23, a + 1.9)
    }
  }
  // Translucent fill, SOLID outline: air you can see through, drawn in ink.
  g.globalAlpha = r === 1 ? 0.6 : 1
  g.fillStyle = PAL[r]!
  g.fill()
  g.globalAlpha = 1
  g.stroke()
}

/** STAGE space, behind the duelists: fire-rain sky wash + shockwaves. */
export const drawFxUnder = (g: G2D): void => {
  if (glow > 0) {
    // Posterised bands instead of a gradient: cheaper AND more cel-shaded.
    for (let i = 0; i < 3; i++) {
      g.globalAlpha = min(0.42, glow * 0.3) * (1 - i / 3)
      g.fillStyle = PAL[i ? 0 : C_EMBER]!
      g.fillRect(0, 0, SW, 150 + i * 120)
    }
    g.globalAlpha = 1
  }
  g.lineJoin = 'round'
  g.lineWidth = 4
  g.strokeStyle = OUT
  for (let i = 0; i < P.length; i += ST) {
    if (P[i + 4]! <= 0 || P[i + 9] !== K_RING) continue
    const q = P[i + 4]! / P[i + 5]!
    const r = max(0, P[i + 6]!)
    const c = P[i + 10]!
    // The shockwave is NOT a circle: six element silhouettes ride the front, so
    // ice shatters outward in spikes where fire blooms in tongues and wind
    // turns. They THIN as the front travels.
    g.beginPath()
    for (let j = 6; j--;) {
      const a = P[i + 7]! + j * 1.05
      shp(g, (c & 3) + 1, P[i]! + cos(a) * r, P[i + 1]! + sin(a) * r, q * q * (18 + r * 0.26), a)
    }
    // ...and for its first three frames the whole front is WHITE-HOT.
    g.fillStyle = q > 0.88 ? PAL[C_WHITE]! : PAL[c]!
    g.fill()
    g.stroke()
  }
}

/** STAGE space, in front of the duelists: debris, blocks, glints, barriers. */
export const drawFxOver = (g: G2D): void => {
  g.lineJoin = 'round'
  g.lineWidth = 4
  g.strokeStyle = OUT
  pass(g, false)
  g.globalCompositeOperation = 'lighter'
  pass(g, true)
  g.globalCompositeOperation = 'source-over'
  drawBar(g, 0)
  drawBar(g, 4)
}

/** The vignette gradient is built ONCE per context (stage space never resizes). */
let VG: CanvasGradient | null = null
let VGctx: G2D | null = null

/** STAGE space, full screen: hit flash + mood vignette. */
export const drawPost = (g: G2D): void => {
  const f = S.flash
  if (f > 0) {
    g.globalAlpha = f * 0.85
    g.fillStyle = '#fff'
    g.fillRect(0, 0, SW, SH)
  }
  if (!VG || VGctx !== g) {
    VGctx = g
    VG = g.createRadialGradient(SW / 2, SH / 2, 250, SW / 2, SH / 2, 800)
    VG.addColorStop(0, '#0d081200')
    VG.addColorStop(1, '#0d0812')
  }
  // Darker as the duel turns against the player (S.sky: 1 rainbow, 0 storm).
  g.globalAlpha = 0.25 + 0.3 * (1 - S.sky)
  g.fillStyle = VG
  g.fillRect(0, 0, SW, SH)
  g.globalAlpha = 1
}

/** REUSED array — never allocates. */
export const shakeOffset = (): readonly [number, number] => SO

export const resetFx = (): void => {
  P.fill(0)
  BR.fill(0)
  USED.fill(0)
  live = head = glow = SO[0] = SO[1] = 0
  S.shake = S.flash = 0
}

export const fxCount = (): number => live
