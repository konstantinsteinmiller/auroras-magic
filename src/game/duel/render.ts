/**
 * render.ts — one frame of the WORLD, in order. Everything here draws in the
 * 1280x720 stage space; `layout.ts` owns the transform.
 *
 * Order: sky -> island -> fx under -> duelists -> shots -> fx over -> snap ->
 * the live stroke -> weather -> post, then (outside the stage clip) the
 * onboarding trace. The HUD, the callouts and the result panel are Vue
 * components layered over this canvas — see `components/duel/`.
 */
import { SW, SH, AX, UX, GY, RUNES, PH_WIN, PH_LOSE, PH_DUEL, WATER, LIGHTNING } from '@/game/duel/config'
import { S } from '@/game/duel/state'
import { drawSky, drawIsland, drawWeather } from '@/game/duel/arena'
import { drawDuelPage } from '@/game/duel/duelPage'
import { lookOf, bodyRadius, heft, type Body, type SpellLook } from '@/game/duel/spellArt'
import type { Shot } from '@/game/duel/state'
import { drawUnicorn, type PoseState } from '@/game/duel/chars'
import { drawFxUnder, drawFxOver, drawPost, shakeOffset } from '@/game/duel/fx'
import { drawGlyph } from '@/game/duel/glyph'
import { LAYOUT, PORTRAIT_WIN, zoneCentre, zoneSpan } from '@/game/duel/layout'
import { ease, clamp, max, TAU } from '@/game/duel/util'
import { arenaGiftShown, drawArenaGift } from '@/game/restore/gift'
import { equippedHooks } from '@/game/cosmetics/rig-cosmetics'
import { traceAssist } from '@/use/useAccessibility'
import { FROZEN_MASK } from '@/game/duel/runeDefs'
import { FOES } from '@/game/duel/foes'
import { decoyX } from '@/game/duel/sim'
import { STARTING_RUNES } from '@/game/campaign/tables'

type G2D = CanvasRenderingContext2D

/** Reused so a frame allocates nothing. */
const AST: PoseState = { cast: 0, hurt: 0, hp: 1, win: 0, lose: 0, form: 0 }
const UST: PoseState = { cast: 0, hurt: 0, hp: 1, win: 0, lose: 0, form: 0 }

/** Ink weight multiplier: on a small portrait stage the jam build's 17-unit
 *  line would be a 4 px hairline, so the ink keeps a floor in SCREEN px. */
const inkK = (): number => max(1, 0.55 / S.vs)

/** The stroke a player is drawing right now: `p` her buffer, `core` its
 *  ink (player 2's, in versus, is lilac, so two hands never read as one). */
const drawStroke = (g: G2D, p: readonly number[] = S.pts, core = '#fff'): void => {
  if (p.length < 4) return
  const k = inkK()
  g.save()
  g.lineCap = g.lineJoin = 'round'
  g.beginPath()
  g.moveTo(p[0]!, p[1]!)
  if (p.length < 8) {
    for (let i = 2; i < p.length; i += 2) g.lineTo(p[i]!, p[i + 1]!)
  } else {
    // Quadratics through segment midpoints: each sample becomes a control
    // point, so the curve passes smoothly along the pointer path.
    for (let i = 2; i < p.length - 2; i += 2) {
      g.quadraticCurveTo(p[i]!, p[i + 1]!, (p[i]! + p[i + 2]!) / 2, (p[i + 1]! + p[i + 3]!) / 2)
    }
    g.lineTo(p[p.length - 2]!, p[p.length - 1]!)
  }
  g.lineWidth = 17 * k
  g.strokeStyle = '#1a1030'
  g.stroke()
  g.lineWidth = 9 * k
  g.strokeStyle = core
  g.stroke()
  g.restore()
}

/**
 * Local versus (§3.12): a faint seam down the middle of the stage and a
 * dashed frame round each half — where each player draws.
 */
const drawVersusHalves = (g: G2D, t: number): void => {
  g.save()
  g.setLineDash([12, 14])
  g.lineDashOffset = -t * 12
  g.lineWidth = 3
  g.strokeStyle = 'rgba(255, 250, 240, 0.28)'
  g.beginPath()
  g.moveTo(640, 170)
  g.lineTo(640, 580)
  g.stroke()
  g.lineWidth = 2.5
  g.strokeStyle = 'rgba(255, 215, 106, 0.2)'
  g.beginPath()
  g.roundRect(24, 168, 596, 410, 22)
  g.stroke()
  g.strokeStyle = 'rgba(192, 140, 255, 0.24)'
  g.beginPath()
  g.roundRect(660, 168, 596, 410, 22)
  g.stroke()
  g.restore()
}

/** Spells in flight: a cel-shaded blob with a hard outline. */
/**
 * THE SPELL IN FLIGHT (story-spec §8.31).
 *
 * Four layers, in the order light behaves: the glow it throws ahead of
 * itself, the ribbon of where it has been, the body itself, and the rim the
 * light catches on it. Each element flies as its own silhouette
 * (`spellArt.ts`) — half of them are a shade of blue, so shape is what tells
 * Ice from Water at arm's length.
 *
 * The ribbon is sampled HERE, per drawn frame, from the shot's own position:
 * a trail is a picture of motion, not a fact about the simulation, and the
 * sim's fixed step must not carry per-frame presentation.
 */
const RIBBON = new WeakMap<object, number[]>()

const ribbonOf = (s: Shot, keep: number): number[] => {
  let tr = RIBBON.get(s)
  if (!tr) {
    tr = []
    RIBBON.set(s, tr)
  }
  const n = tr.length
  // Only sample when it has actually moved: a held spell hanging overhead
  // must not smear its own ribbon into a blob.
  if (n < 2 || Math.abs(tr[n - 2]! - s.x) + Math.abs(tr[n - 1]! - s.y) > 1.5) {
    tr.push(s.x, s.y)
    while (tr.length > keep * 2) tr.splice(0, 2)
  }
  return tr
}

/**
 * The ribbon: a tapering, fading stroke through where the shot has been.
 *
 * Drawn in THREE chunks per pass, not one stroke per sample: a twelve-sample
 * ribbon stroked segment by segment is two dozen stroke calls per shot per
 * frame, and three shots of that is a real cost on a phone. Three chunks of
 * increasing width and alpha read as the same taper for a tenth of the work.
 */
const CHUNKS = 3
const drawRibbon = (g: G2D, tr: number[], r: number, look: SpellLook, col: string, lit: string): void => {
  const pts = tr.length / 2
  if (pts < 3) return
  g.save()
  g.globalCompositeOperation = 'lighter'
  g.lineCap = 'round'
  g.lineJoin = 'round'
  for (let pass = 0; pass < 2; pass++) {
    // A soft wide wash, then a bright narrow core through it.
    const w = r * look.width * (pass ? 0.5 : 1.45)
    g.strokeStyle = pass ? lit : col
    for (let c = 0; c < CHUNKS; c++) {
      const from = Math.floor((c * (pts - 1)) / CHUNKS)
      const to = Math.floor(((c + 1) * (pts - 1)) / CHUNKS)
      if (to <= from) continue
      const f = (c + 1) / CHUNKS
      g.globalAlpha = (pass ? 0.72 : 0.42) * f * f
      g.lineWidth = Math.max(1, w * f)
      g.beginPath()
      g.moveTo(tr[from * 2]!, tr[from * 2 + 1]!)
      for (let i = from + 1; i <= to; i++) g.lineTo(tr[i * 2]!, tr[i * 2 + 1]!)
      g.stroke()
    }
  }
  g.restore()
}

/** The light a spell throws around itself, additive and cheap. */
const drawGlow = (g: G2D, r: number, reach: number, lit: string): void => {
  const grd = g.createRadialGradient(0, 0, r * 0.2, 0, 0, r * reach)
  grd.addColorStop(0, lit)
  grd.addColorStop(0.45, `${lit}55`)
  grd.addColorStop(1, `${lit}00`)
  g.save()
  g.globalCompositeOperation = 'lighter'
  g.globalAlpha = 0.55
  g.fillStyle = grd
  g.beginPath()
  g.arc(0, 0, r * reach, 0, TAU)
  g.fill()
  g.restore()
}

/** The body, in the element's own silhouette. Drawn around the origin, the
 *  shot's heading along +x. */
const drawBody = (g: G2D, body: Body, r: number, col: string, lit: string, t: number): void => {
  const ink = '#1a1030'
  g.lineWidth = Math.max(3, r * 0.26)
  g.strokeStyle = ink
  g.lineJoin = 'round'
  g.beginPath()
  switch (body) {
    case 'flame': {
      // A teardrop with a licking tip, wobbling as it burns.
      const w = 1 + 0.12 * Math.sin(t * 26)
      g.moveTo(r * 1.5 * w, 0)
      g.quadraticCurveTo(r * 0.2, -r * 1.02, -r * 0.55, -r * 0.62)
      g.quadraticCurveTo(-r * 1.25, 0, -r * 0.55, r * 0.62)
      g.quadraticCurveTo(r * 0.2, r * 1.02, r * 1.5 * w, 0)
      break
    }
    case 'gust': {
      // Three stacked crescents, the middle one longest.
      for (let i = -1; i <= 1; i++) {
        const rr = r * (1 - Math.abs(i) * 0.3)
        g.moveTo(-rr * 0.9, i * r * 0.62)
        g.quadraticCurveTo(rr * 0.35, i * r * 0.95, rr * 1.25, i * r * 0.2)
        g.quadraticCurveTo(rr * 0.35, i * r * 0.35, -rr * 0.9, i * r * 0.62)
      }
      break
    }
    case 'shard': {
      g.moveTo(r * 1.5, 0)
      g.lineTo(-r * 0.1, -r * 0.82)
      g.lineTo(-r * 1.1, -r * 0.2)
      g.lineTo(-r * 0.5, r * 0.5)
      g.lineTo(r * 0.2, r * 0.86)
      g.closePath()
      break
    }
    case 'boulder': {
      const n = 7
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * TAU
        const rr = r * (0.82 + 0.3 * Math.sin(i * 2.7))
        const x = Math.cos(a) * rr
        const y = Math.sin(a) * rr
        if (i) g.lineTo(x, y)
        else g.moveTo(x, y)
      }
      g.closePath()
      break
    }
    case 'leaf': {
      g.moveTo(r * 1.35, 0)
      g.quadraticCurveTo(0, -r * 1.05, -r * 1.2, 0)
      g.quadraticCurveTo(0, r * 1.05, r * 1.35, 0)
      break
    }
    case 'bubble': {
      const w = 1 + 0.1 * Math.sin(t * 17)
      g.ellipse(0, 0, r * w, r * (2 - w), 0, 0, TAU)
      break
    }
    case 'bolt': {
      g.moveTo(r * 1.6, 0)
      g.lineTo(-r * 0.1, -r * 0.35)
      g.lineTo(r * 0.35, -r * 0.05)
      g.lineTo(-r * 1.55, r * 0.45)
      g.lineTo(-r * 0.2, r * 0.05)
      g.lineTo(-r * 0.6, -r * 0.25)
      g.closePath()
      break
    }
    case 'wisp': {
      // A comma of smoke: fat head, curling tail.
      g.moveTo(r * 1.1, -r * 0.1)
      g.quadraticCurveTo(r * 0.3, -r * 1.05, -r * 0.7, -r * 0.5)
      g.quadraticCurveTo(-r * 1.4, r * 0.1, -r * 0.2, r * 0.75)
      g.quadraticCurveTo(r * 0.7, r * 0.9, r * 1.1, -r * 0.1)
      break
    }
    case 'prism': {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + t * 0.6
        const rr = r * (i % 2 ? 0.62 : 1.18)
        const x = Math.cos(a) * rr
        const y = Math.sin(a) * rr
        if (i) g.lineTo(x, y)
        else g.moveTo(x, y)
      }
      g.closePath()
      break
    }
    case 'sand': {
      // An hourglass on its side: two cones meeting at the waist.
      g.moveTo(-r * 1.2, -r * 0.85)
      g.lineTo(0, -r * 0.12)
      g.lineTo(r * 1.2, -r * 0.85)
      g.lineTo(r * 1.2, r * 0.85)
      g.lineTo(0, r * 0.12)
      g.lineTo(-r * 1.2, r * 0.85)
      g.closePath()
      break
    }
    case 'crescent': {
      g.arc(0, 0, r * 1.1, 0.75, -0.75)
      g.arc(r * 0.5, 0, r * 0.95, -0.95, 0.95, true)
      g.closePath()
      break
    }
    case 'heart': {
      g.moveTo(0, r * 0.95)
      g.bezierCurveTo(-r * 1.5, r * 0.02, -r * 0.85, -r * 1.15, 0, -r * 0.45)
      g.bezierCurveTo(r * 0.85, -r * 1.15, r * 1.5, r * 0.02, 0, r * 0.95)
      break
    }
  }
  g.fillStyle = col
  g.fill()
  g.stroke()
  // The rim the light catches, up and ahead.
  g.beginPath()
  g.arc(r * 0.22, -r * 0.34, r * 0.4, 0, TAU)
  g.globalAlpha = 0.85
  g.fillStyle = lit
  g.fill()
  g.globalAlpha = 1
}

const drawShots = (g: G2D): void => {
  for (const s of S.shots) {
    const [col, lit] = RUNES[s.r]!
    const look = lookOf(s.r)
    const hv = heft(s.k)
    const r = bodyRadius(s.k) * (1 + look.pulse * 0.5 * Math.sin(S.t * 22))
    // Where it has been, and therefore which way it is pointing.
    const tr = ribbonOf(s, look.tail)
    drawRibbon(g, tr, r * hv, look, col, lit)
    const n = tr.length
    const head = n >= 4
      ? Math.atan2(s.y - tr[n - 3]!, s.x - tr[n - 4]!)
      : s.dir > 0 ? 0 : Math.PI
    g.save()
    g.translate(s.x, s.y)
    // Delayed spells hang overhead and pulse a warning before they fall.
    if (s.delay > 0) g.globalAlpha = 0.55 + 0.45 * Math.sin(S.t * 14)
    drawGlow(g, r, look.glow * hv, lit)
    g.rotate(look.spin ? S.t * look.spin : head)
    if (s.r === WATER) drawBubbleShot(g, r, col, lit)
    else if (s.r === LIGHTNING) drawBoltShot(g, r * 1.15, col, lit, s.dir)
    else drawBody(g, look.body, r, col, lit, S.t)
    // A piercing shot crackles, so "this one goes through shields" can be
    // read before it lands (§6.8).
    if (s.p) {
      g.rotate(S.t * 9)
      g.beginPath()
      for (let k = 0; k < 4; k++) {
        const a = (k * Math.PI) / 2
        g.moveTo(Math.cos(a) * r * 1.2, Math.sin(a) * r * 1.2)
        g.lineTo(Math.cos(a + 0.35) * r * 1.55, Math.sin(a + 0.35) * r * 1.55)
      }
      g.lineWidth = 3
      g.strokeStyle = '#fff6a0'
      g.stroke()
    }
    g.restore()
  }
}

/** Water: a wobbling soap bubble with a catch-light. */
const drawBubbleShot = (g: G2D, r: number, col: string, lit: string): void => {
  const w = 1 + 0.08 * Math.sin(S.t * 17)
  g.save()
  g.scale(w, 2 - w)
  g.beginPath()
  g.arc(0, 0, r * 1.05, 0, TAU)
  g.globalAlpha *= 0.55
  g.fillStyle = lit
  g.fill()
  g.globalAlpha /= 0.55
  g.lineWidth = 4
  g.strokeStyle = '#1a1030'
  g.stroke()
  g.beginPath()
  g.arc(0, 0, r * 0.8, Math.PI * 0.15, Math.PI * 0.85)
  g.lineWidth = 3
  g.strokeStyle = col
  g.stroke()
  g.beginPath()
  g.ellipse(-r * 0.35, -r * 0.4, r * 0.22, r * 0.12, -0.7, 0, TAU)
  g.fillStyle = '#ffffff'
  g.fill()
  g.restore()
}

/** Lightning: a chunky zig-zag bolt, pointing the way it flies. */
const drawBoltShot = (g: G2D, r: number, col: string, lit: string, dir: number): void => {
  g.save()
  g.scale(dir, 1)
  g.rotate(0.35)
  g.beginPath()
  g.moveTo(r * 1.1, -r * 0.1)
  g.lineTo(-r * 0.1, -r * 0.9)
  g.lineTo(0, -r * 0.2)
  g.lineTo(-r * 1.1, 0.1 * r)
  g.lineTo(r * 0.1, r * 0.9)
  g.lineTo(0, r * 0.2)
  g.closePath()
  g.fillStyle = col
  g.fill()
  g.lineWidth = 4
  g.lineJoin = 'round'
  g.strokeStyle = '#1a1030'
  g.stroke()
  g.beginPath()
  g.moveTo(r * 0.55, -r * 0.1)
  g.lineTo(-r * 0.05, -r * 0.5)
  g.lineWidth = 3
  g.strokeStyle = lit
  g.stroke()
  g.restore()
}

/** The clean rune flashing before it is stored (GDD 2.2). In versus, over
 *  each player's own half. */
const drawSnap = (g: G2D): void => {
  if (S.versus) {
    for (const [sn, cx] of [[S.snap, 320], [S.esnap, 960]] as const) {
      if (!sn) continue
      const k = clamp(sn.t / 0.45, 0, 1)
      drawGlyph(g, sn.r, cx, 370, 110 * (1 + ease(k) * 0.5), 1 - k)
    }
    return
  }
  if (!S.snap) return
  const k = clamp(S.snap.t / 0.45, 0, 1)
  const [cx, cy] = zoneCentre()
  drawGlyph(g, S.snap.r, cx, cy, zoneSpan() * 0.32 * (1 + ease(k) * 0.5), 1 - k)
}

/**
 * Onboarding beat 0: a ghost finger traces a glowing triangle on a loop, then
 * a short beat of held shape before the loop restarts. The caption is DOM.
 */
const drawIntroTrace = (g: G2D, t: number): void => {
  const [cx, cy] = zoneCentre()
  const R = zoneSpan() * 0.26
  drawGlyph(g, 0, cx, cy, R, 0.16)
  const p = drawGlyph(g, 0, cx, cy, R, 1, clamp(((t * 0.45) % 1.3) * 1.18, 0, 1))
  g.beginPath()
  g.arc(p[0], p[1], R * 0.18, 0, TAU)
  g.fillStyle = '#fff'
  g.fill()
  g.lineWidth = R * 0.05
  g.strokeStyle = '#0a0713'
  g.stroke()
}

/**
 * Trace assist (§5.13, off by default): the NEWEST rune the chests have
 * given, ghosted in the drawing box and tracing itself slowly, until the
 * first rune of the duel lands. The frozen four have the onboarding for
 * that; this is for the shapes that arrive later.
 */
const newestRune = (): number => {
  const extra = (S.campaign.runesUnlocked & ~STARTING_RUNES) >>> 0
  return extra ? 31 - Math.clz32(extra) : -1
}
const drawAssistTrace = (g: G2D, t: number): void => {
  const k = newestRune()
  if (k < 0) return
  const [cx, cy] = zoneCentre()
  const R = zoneSpan() * 0.26
  drawGlyph(g, k, cx, cy, R, 0.1)
  const p = drawGlyph(g, k, cx, cy, R, 0.32, clamp(((t * 0.3) % 1.4) * 1.12, 0, 1))
  g.beginPath()
  g.arc(p[0], p[1], R * 0.12, 0, TAU)
  g.fillStyle = 'rgba(255,255,255,0.5)'
  g.fill()
}

/**
 * Dream Dust (§6.15): on a retry the foe is a little drowsy. Lilac motes
 * drift lazily round her head — one per loss in the streak, up to five, the
 * same count the loss beat showed — and a small Z floats up now and then.
 * The ease itself is in her rate; this is how the player SEES it.
 */
const drawDreamDust = (g: G2D, t: number): void => {
  if (S.dust >= 1 || S.phase !== PH_DUEL) return
  const n = Math.max(1, Math.min(5, Math.round((1 - S.dust) / 0.08)))
  const hx = UX - 44
  const hy = GY - 168
  g.save()
  g.lineJoin = 'round'
  for (let i = 0; i < n; i++) {
    const a = t * 0.7 + (i * TAU) / n
    const x = hx + Math.cos(a) * 50
    const y = hy + Math.sin(a) * 15 + Math.sin(t * 1.3 + i) * 4
    const r = 6.5 + 1.5 * Math.sin(t * 2.1 + i * 1.7)
    g.globalAlpha = 0.6 + 0.35 * Math.sin(t * 2 + i)
    g.beginPath()
    for (let k = 0; k < 8; k++) {
      const b = (k * Math.PI) / 4 + t * 0.5
      const rr = k & 1 ? r * 0.38 : r
      if (k) g.lineTo(x + Math.cos(b) * rr, y + Math.sin(b) * rr)
      else g.moveTo(x + rr, y)
    }
    g.closePath()
    g.fillStyle = '#e2cfff'
    g.fill()
    g.lineWidth = 2
    g.strokeStyle = '#3A2340'
    g.stroke()
  }
  // The Z: drawn, not typed — a picture of sleep, the same in every locale.
  const zt = (t % 2.6) / 2.6
  const s = 9 + zt * 7
  const zx = hx + 34 + zt * 24
  const zy = hy - 34 - zt * 46
  g.globalAlpha = Math.sin(zt * Math.PI) * 0.85
  g.beginPath()
  g.moveTo(zx - s, zy - s)
  g.lineTo(zx + s, zy - s)
  g.lineTo(zx - s, zy + s)
  g.lineTo(zx + s, zy + s)
  g.lineCap = 'round'
  g.lineWidth = 6
  g.strokeStyle = '#0a0713'
  g.stroke()
  g.lineWidth = 3
  g.strokeStyle = '#e7d6ff'
  g.stroke()
  g.restore()
}

/* ── Chapter magic on the duelists (S4) ─────────────────────────────── */

/** A decoy's pose: its caster's, without her keepsakes — an illusion. */
const DST: PoseState = { cast: 0, hurt: 0, hp: 1, win: 0, lose: 0, form: 0 }
/** The offscreen the decoys are drawn through: the rig sets its own alpha
 *  part by part, so a see-through twin has to be composited as one image. */
let ghostCv: HTMLCanvasElement | null = null
const GW = 300
const GH = 290
const GFOOT = 36

/** One see-through mirror-twin standing at stage x, hooves on the ground. */
const drawGhost = (g: G2D, x: number, side: number, st: PoseState, t: number, alpha: number): void => {
  const k = S.vs * S.dpr
  const w = Math.ceil(GW * k)
  const h = Math.ceil(GH * k)
  if (!ghostCv || ghostCv.width < w || ghostCv.height < h) {
    ghostCv = document.createElement('canvas')
    ghostCv.width = w
    ghostCv.height = h
  }
  const c = ghostCv.getContext('2d')
  if (!c) return
  c.setTransform(1, 0, 0, 1, 0, 0)
  c.clearRect(0, 0, w, h)
  c.setTransform(k, 0, 0, k, (GW / 2) * k, (GH - GFOOT) * k)
  drawUnicorn(c, 0, 0, side, st, t)
  // A lilac mirror sheen over the whole silhouette, and a light band across it.
  c.setTransform(1, 0, 0, 1, 0, 0)
  c.globalCompositeOperation = 'source-atop'
  c.fillStyle = 'rgba(214, 190, 255, 0.42)'
  c.fillRect(0, 0, w, h)
  const u = (t * 0.6 + x * 0.01) % 1
  c.fillStyle = 'rgba(255, 255, 255, 0.5)'
  c.beginPath()
  c.moveTo((u * 1.4 - 0.2) * w, 0)
  c.lineTo((u * 1.4 - 0.1) * w, 0)
  c.lineTo((u * 1.4 - 0.3) * w, h)
  c.lineTo((u * 1.4 - 0.4) * w, h)
  c.closePath()
  c.fill()
  c.globalCompositeOperation = 'source-over'
  g.save()
  g.globalAlpha = alpha
  g.drawImage(ghostCv, 0, 0, w, h, x - GW / 2, GY - (GH - GFOOT), GW, GH)
  g.restore()
}

/**
 * Illusion's decoys (§6.3): mirror-twins of their caster copying her pose a
 * beat late, see-through and shimmering. The first stands in front of her,
 * Echo's second (her phase 2) behind. Each blinks out over its last second.
 */
const drawDecoys = (g: G2D, e: boolean, from: PoseState, t: number, front: boolean): void => {
  const n = e ? S.eDecoyN : S.decoyN
  if (!n || S.phase !== PH_DUEL) return
  DST.cast = from.cast
  DST.hurt = 0
  DST.hp = from.hp
  DST.form = from.form
  const left = e ? S.eDecoyT : S.decoyT
  const a = (left < 1 ? left : 1) * (0.62 + 0.08 * Math.sin(t * 6))
  for (let i = 0; i < n; i++) {
    if ((i === 0) !== front) continue
    drawGhost(g, decoyX(e, i), e ? 1 : -1, DST, t - 0.12 - i * 0.1, a)
  }
}

/**
 * Frost Lock (§6.5): the frozen duelist stands in a block of ice — a pale,
 * faceted shell with a frosty rim and drifting snow. It cracks away in its
 * last quarter second.
 */
const drawIce = (g: G2D, x: number, left: number, t: number): void => {
  if (left <= 0) return
  const a = Math.min(1, left * 4)
  g.save()
  g.lineJoin = 'round'
  g.globalAlpha = 0.46 * a
  g.fillStyle = '#bfe9ff'
  g.beginPath()
  g.roundRect(x - 84, GY - 214, 168, 214, 30)
  g.fill()
  g.globalAlpha = a
  g.lineWidth = 5
  g.strokeStyle = '#150f1c'
  g.stroke()
  // Facets: two light planes and a highlight edge.
  g.globalAlpha = 0.5 * a
  g.fillStyle = '#ffffff'
  g.beginPath()
  g.moveTo(x - 70, GY - 200)
  g.lineTo(x - 30, GY - 200)
  g.lineTo(x - 64, GY - 120)
  g.closePath()
  g.fill()
  g.beginPath()
  g.moveTo(x + 40, GY - 30)
  g.lineTo(x + 72, GY - 60)
  g.lineTo(x + 72, GY - 16)
  g.closePath()
  g.fill()
  // Snowflakes drifting down its face.
  g.globalAlpha = 0.9 * a
  g.strokeStyle = '#ffffff'
  g.lineWidth = 2.5
  for (let k = 0; k < 4; k++) {
    const sx = x - 50 + k * 34
    const sy = GY - 190 + (((t * 22 + k * 53) % 170))
    g.beginPath()
    for (let j = 0; j < 3; j++) {
      const b = (j * Math.PI) / 3
      g.moveTo(sx - Math.cos(b) * 6, sy - Math.sin(b) * 6)
      g.lineTo(sx + Math.cos(b) * 6, sy + Math.sin(b) * 6)
    }
    g.stroke()
  }
  g.restore()
}

/**
 * Prism's phase 2 (§6.11): cosmetic only — an all-colour glow blazing up
 * behind her. She is out-played, never counter-picked.
 */
const drawPrismGlow = (g: G2D, t: number): void => {
  const foe = FOES[S.foe]
  if (!foe || foe.phase2 !== 'prismGlow' || S.ePhase < 2 || S.phase !== PH_DUEL) return
  g.save()
  g.lineCap = 'round'
  for (let i = 0; i < 6; i++) {
    g.globalAlpha = 0.28
    g.strokeStyle = RUNES[[0, 6, 4, 5, 2, 7][i]!]![0]
    g.lineWidth = 9
    g.beginPath()
    const r = 118 - i * 11 + Math.sin(t * 2.4 + i) * 3
    g.arc(UX, GY - 90, r, Math.PI * 1.05 + t * 0.3, Math.PI * 1.95 + t * 0.3)
    g.stroke()
  }
  g.restore()
}

/** Portrait: clip to the visible duel window (saves; the caller restores). */
const portraitClip = (g: G2D): void => {
  g.save()
  g.beginPath()
  g.rect(-S.vx / S.vs, PORTRAIT_WIN.y0, S.w / S.vs, SH - PORTRAIT_WIN.y0)
  g.clip()
}

/** Portrait: a faint dashed frame so the pad reads as a place to draw. */
const drawPadFrame = (g: G2D): void => {
  const z = LAYOUT.zone
  const k = 1 / S.vs
  g.save()
  g.setLineDash([10 * k, 12 * k])
  g.lineWidth = 2.5 * k
  g.strokeStyle = 'rgba(207,196,255,0.16)'
  g.beginPath()
  g.roundRect(z.x, z.y, z.w, z.h, 22 * k)
  g.stroke()
  g.restore()
}

export const render = (g: G2D): void => {
  const t = S.t
  // The canvas backing store is CSS size x dpr, so EVERY transform here must
  // carry dpr.
  const d = S.dpr
  g.setTransform(1, 0, 0, 1, 0, 0)
  // Letterbox bars (and the portrait pad) stay near-black.
  g.fillStyle = '#07060f'
  g.fillRect(0, 0, S.w * d, S.h * d)

  const so = shakeOffset()
  const k = S.vs * d
  // THE PUNCH (§8.31): the camera leans in on a hit — a couple of per cent,
  // about the stage's own middle, so nothing slides and the blow lands in
  // the whole frame rather than only where it hit.
  const pz = 1 + S.punch * 0.022
  const px = (pz - 1) * (SW / 2) * k
  const py = (pz - 1) * (SH / 2) * k
  g.setTransform(k * pz, 0, 0, k * pz, (S.vx + so[0] * S.vs) * d - px, (S.vy + so[1] * S.vs) * d - py)
  if (S.portrait) drawPadFrame(g)

  g.save()
  // Landscape clips to the stage like the jam build. Portrait does not: the
  // stroke, its sparkles and the snap live on the pad BELOW the stage.
  if (!S.portrait) {
    g.beginPath()
    g.rect(0, 0, SW, SH)
    g.clip()
  } else {
    // The portrait window: the stage from PORTRAIT_WIN.y0 down, across the
    // whole screen width. Everything above is the HUD band.
    portraitClip(g)
  }

  // The duel is fought over the page it is about to restore (§8.29): the
  // sector under Umbra's dust, with the sky's mood laid over it.
  const onPage = drawDuelPage(g)
  drawSky(g, t, onPage)
  drawIsland(g)
  drawFxUnder(g)

  AST.cast = clamp(S.castAnim / 0.55, 0, 1)
  AST.hurt = S.hurt
  AST.hp = S.hp / 100
  AST.win = S.phase === PH_WIN ? clamp(S.over, 0, 1) : 0
  AST.lose = S.phase === PH_LOSE ? clamp(S.over, 0, 1) : 0
  AST.form = S.queue.length / 3
  // What Aurora wears (the wardrobe, C17) she wears into every duel.
  Object.assign(AST, equippedHooks())
  UST.cast = clamp(S.eCastAnim / 0.55, 0, 1)
  UST.hurt = S.eHurt
  UST.hp = S.ehp / 100
  UST.win = AST.lose
  UST.lose = AST.win
  // A boss winding up her phase shift glows at the horn (§6.11's tell).
  UST.form = S.eWindup > 0 ? Math.max(S.eForm, 1 - S.eWindup / 1.8) : S.eForm

  if (S.versus && !S.portrait) drawVersusHalves(g, t)
  drawPrismGlow(g, t)
  drawDecoys(g, false, AST, t, false)
  drawDecoys(g, true, UST, t, false)
  drawUnicorn(g, AX, GY, -1, AST, t)
  drawUnicorn(g, UX, GY, 1, UST, t)
  drawIce(g, AX, S.frozen, t)
  drawIce(g, UX, S.eFrozen, t)
  drawDecoys(g, false, AST, t, true)
  drawDecoys(g, true, UST, t, true)
  drawDreamDust(g, t)

  drawShots(g)
  // A won sector's gift drops onto the island during the flourish (§3.2.2).
  if (arenaGiftShown() && S.phase === PH_WIN) drawArenaGift(g, 640, GY + 8, S.over)
  if (S.portrait) {
    // The stage clip ends here: debris and the stroke's sparkles may spill
    // DOWN onto the pad, never up into the HUD band.
    g.restore()
    g.save()
    g.beginPath()
    g.rect(-S.vx / S.vs, PORTRAIT_WIN.y0, S.w / S.vs, S.h / S.vs)
    g.clip()
  }
  drawFxOver(g)
  drawSnap(g)
  if (S.draw && !S.portrait) drawStroke(g)
  if (S.versus && S.edraw) drawStroke(g, S.epts, '#ecdcff')
  if (S.portrait) {
    g.restore()
    portraitClip(g)
  }
  drawWeather(g, t)
  drawPost(g)
  if (S.portrait) g.restore()
  g.restore()

  if (S.draw && S.portrait) drawStroke(g)
  if (S.versus) return
  if (S.intro && !S.book && S.phase === PH_DUEL && S.introStep < 1) drawIntroTrace(g, t)
  else if (traceAssist.value && !S.book && S.phase === PH_DUEL && S.landed === 0) drawAssistTrace(g, t)
}
