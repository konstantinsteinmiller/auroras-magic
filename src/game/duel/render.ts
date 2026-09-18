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
import { drawUnicorn, type PoseState } from '@/game/duel/chars'
import { drawFxUnder, drawFxOver, drawPost, shakeOffset } from '@/game/duel/fx'
import { drawGlyph } from '@/game/duel/glyph'
import { LAYOUT, PORTRAIT_WIN, zoneCentre, zoneSpan } from '@/game/duel/layout'
import { ease, clamp, max, TAU } from '@/game/duel/util'
import { arenaGiftShown, drawArenaGift } from '@/game/restore/gift'
import { equippedHooks } from '@/game/cosmetics/rig-cosmetics'
import { traceAssist } from '@/use/useAccessibility'
import { FROZEN_MASK } from '@/game/duel/runeDefs'

type G2D = CanvasRenderingContext2D

/** Reused so a frame allocates nothing. */
const AST: PoseState = { cast: 0, hurt: 0, hp: 1, win: 0, lose: 0, form: 0 }
const UST: PoseState = { cast: 0, hurt: 0, hp: 1, win: 0, lose: 0, form: 0 }

/** Ink weight multiplier: on a small portrait stage the jam build's 17-unit
 *  line would be a 4 px hairline, so the ink keeps a floor in SCREEN px. */
const inkK = (): number => max(1, 0.55 / S.vs)

/** The stroke the player is drawing right now. */
const drawStroke = (g: G2D): void => {
  const p = S.pts
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
  g.strokeStyle = '#fff'
  g.stroke()
  g.restore()
}

/** Spells in flight: a cel-shaded blob with a hard outline. */
const drawShots = (g: G2D): void => {
  for (const s of S.shots) {
    const [col, lit] = RUNES[s.r]!
    const r = (s.k === 3 ? 30 : s.k === 1 ? 24 : 17) * (1 + 0.12 * Math.sin(S.t * 22))
    g.save()
    g.translate(s.x, s.y)
    // Delayed spells hang overhead and pulse a warning before they fall.
    if (s.delay > 0) g.globalAlpha = 0.55 + 0.45 * Math.sin(S.t * 14)
    if (s.r === WATER) drawBubbleShot(g, r, col, lit)
    else if (s.r === LIGHTNING) drawBoltShot(g, r * 1.15, col, lit, s.dir)
    else {
      g.beginPath()
      g.arc(0, 0, r, 0, TAU)
      g.fillStyle = col
      g.fill()
      g.lineWidth = 5
      g.strokeStyle = '#1a1030'
      g.stroke()
      g.beginPath()
      g.arc(-r * 0.3, -r * 0.3, r * 0.34, 0, TAU)
      g.fillStyle = lit
      g.fill()
    }
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

/** The clean rune flashing before it is stored (GDD 2.2). */
const drawSnap = (g: G2D): void => {
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
  const extra = (S.campaign.runesUnlocked & ~FROZEN_MASK) >>> 0
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
  g.setTransform(k, 0, 0, k, (S.vx + so[0] * S.vs) * d, (S.vy + so[1] * S.vs) * d)
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

  drawSky(g, t)
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

  drawUnicorn(g, AX, GY, -1, AST, t)
  drawUnicorn(g, UX, GY, 1, UST, t)
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
  if (S.portrait) {
    g.restore()
    portraitClip(g)
  }
  drawWeather(g, t)
  drawPost(g)
  if (S.portrait) g.restore()
  g.restore()

  if (S.draw && S.portrait) drawStroke(g)
  if (S.intro && !S.book && S.phase === PH_DUEL && S.introStep < 1) drawIntroTrace(g, t)
  else if (traceAssist.value && !S.book && S.phase === PH_DUEL && S.landed === 0) drawAssistTrace(g, t)
}
