/**
 * render.ts — one frame of the WORLD, in order. Everything here draws in the
 * 1280x720 stage space; `layout.ts` owns the transform.
 *
 * Order: sky -> island -> fx under -> duelists -> shots -> fx over -> snap ->
 * the live stroke -> weather -> post, then (outside the stage clip) the
 * onboarding trace. The HUD, the callouts and the result panel are Vue
 * components layered over this canvas — see `components/duel/`.
 */
import { SW, SH, AX, UX, GY, RUNES, PH_WIN, PH_LOSE, PH_DUEL } from '@/game/duel/config'
import { S } from '@/game/duel/state'
import { drawSky, drawIsland, drawWeather } from '@/game/duel/arena'
import { drawUnicorn, type PoseState } from '@/game/duel/chars'
import { drawFxUnder, drawFxOver, drawPost, shakeOffset } from '@/game/duel/fx'
import { drawGlyph } from '@/game/duel/glyph'
import { LAYOUT, PORTRAIT_WIN, zoneCentre, zoneSpan } from '@/game/duel/layout'
import { ease, clamp, max, TAU } from '@/game/duel/util'

type G2D = CanvasRenderingContext2D

/** Reused so a frame allocates nothing. */
const AST: Required<PoseState> = { cast: 0, hurt: 0, hp: 1, win: 0, lose: 0, form: 0 }
const UST: Required<PoseState> = { cast: 0, hurt: 0, hp: 1, win: 0, lose: 0, form: 0 }

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
    g.restore()
  }
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
  UST.cast = clamp(S.eCastAnim / 0.55, 0, 1)
  UST.hurt = S.eHurt
  UST.hp = S.ehp / 100
  UST.win = AST.lose
  UST.lose = AST.win
  UST.form = S.eForm

  drawUnicorn(g, AX, GY, -1, AST, t)
  drawUnicorn(g, UX, GY, 1, UST, t)

  drawShots(g)
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
}
