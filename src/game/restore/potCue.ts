/**
 * potCue.ts — "tap one of these" (story-spec §8.33).
 *
 * THE BUG THIS EXISTS TO FIX (owner, 2026-09-20): once the picture is clean,
 * the game asks for a colour. The blank landmark wore a breathing yellow ring
 * — the one moving, glowing thing on screen — and the three paint pots simply
 * rose and then sat there. So the game pointed hard at the DESTINATION and
 * not at all at the BUTTONS, and a child taps what is moving. The ring was
 * telling her to tap the thing she cannot tap.
 *
 * The cue turns that around, without a word (§8.2):
 *
 *   1. **each pot breathes in its own colour** — a halo behind the jar, so
 *      the pots are the brightest thing in the frame while nothing is picked;
 *   2. **a tap ripple runs across them, one at a time** — the gesture the
 *      game wants, performed on the thing it wants it performed on;
 *   3. **motes drift from the pots to the landmark** — the sentence "this
 *      colour goes there", drawn instead of written, which is what makes the
 *      ring make sense rather than compete.
 *
 * It is drawn BEHIND the pots (they are DOM buttons over the canvas, with an
 * opaque cream jar), so everything here reads as a halo around them rather
 * than a smear across them. Canvas space is CSS pixels, exactly the space
 * `restoreHud.pots` is laid out in.
 *
 * Nothing here is state: it is a pure function of the clock and the layout,
 * so it cannot drift out of step with the phase that draws it.
 */
import { TAU, sin, cos, clamp } from '@/game/duel/util'
import { reducedMotion } from '@/use/useAccessibility'

type G2D = CanvasRenderingContext2D

export interface PotCue {
  /** Pot centres, CSS px, in slot order. */
  pots: readonly { x: number; y: number }[]
  /** The pots' own colours, in the same order. */
  tones: readonly string[]
  /** Pot diameter, CSS px. */
  size: number
  /** Where the paint is going — the blank landmark, CSS px. */
  lx: number
  ly: number
  /** `S.t`, seconds. */
  t: number
  /** Seconds this phase has been up: the whole cue fades in over the first. */
  phaseT: number
  /** When the game picks for her if she never chooses (§8.7's 4 s). */
  autoAt: number
}

/** How long each pot holds the ripple before it passes to the next. */
const BEAT = 0.72
/** Motes travelling the path, and how long each takes end to end. */
const MOTES = 3
const DRIFT = 1.9

/** A gentle arc from a pot to the landmark: paint does not travel in a
 *  straight line, and the bow keeps the path clear of the pots beside it. */
const pathAt = (
  u: number, x0: number, y0: number, x1: number, y1: number
): [number, number] => {
  const mx = (x0 + x1) / 2
  const my = (y0 + y1) / 2 - Math.abs(x1 - x0) * 0.18 - 40
  const v = 1 - u
  return [
    v * v * x0 + 2 * v * u * mx + u * u * x1,
    v * v * y0 + 2 * v * u * my + u * u * y1
  ]
}

export const drawPotCue = (g: G2D, c: PotCue): void => {
  const n = c.pots.length
  if (!n) return
  // Reduced motion (§3.11): the invitation still has to be made, so the
  // haloes stay — held at their brightest instead of breathing — and the
  // path to the landmark is drawn as a line of grains rather than as grains
  // that travel. Nothing moves; everything still points.
  const still = reducedMotion.value
  /**
   * The last second before the game picks for her (§8.7): the cue gathers on
   * the pot it is about to take, so a child who never chose still sees WHICH
   * one was chosen and why the picture turns that colour. Nobody is hurried —
   * it announces the default, it does not count down to it.
   */
  const tell = clamp((c.phaseT - (c.autoAt - 1.1)) / 1.1, 0, 1)
  // Up over the first half-second, so it arrives after the pots have risen
  // rather than with them.
  const fade = clamp((c.phaseT - 0.35) / 0.5, 0, 1)
  if (fade <= 0) return
  const r = c.size / 2
  g.save()

  // 1. THE HALOES: each pot breathing in its own colour, out of phase with
  //    its neighbours so the row shimmers rather than flashes.
  for (let i = 0; i < n; i++) {
    const p = c.pots[i]
    if (!p) continue
    const breath = still ? 1 : 0.5 + 0.5 * sin(c.t * 3.1 - i * 0.7)
    const rad = r * (1.18 + 0.1 * breath)
    const grd = g.createRadialGradient(p.x, p.y, r * 0.7, p.x, p.y, rad * 1.5)
    const tone = c.tones[i] ?? '#ffffff'
    grd.addColorStop(0, tone)
    grd.addColorStop(1, `${tone}00`)
    const bias = i === 0 ? 1 + tell * 0.7 : 1 - tell * 0.45
    g.fillStyle = grd
    g.beginPath()
    g.arc(p.x, p.y, rad * 1.5, 0, TAU)
    // TWICE, and the order matters. An additive halo alone takes the colour
    // of what is behind it — over the sector's green grass a pink pot glowed
    // GREEN, which is the one thing this cue must never do, since the choice
    // being asked for IS the colour. So: a colour-true wash first, then a
    // small additive bloom on top for the lit feel.
    g.globalCompositeOperation = 'source-over'
    g.globalAlpha = fade * (0.3 + 0.2 * breath) * bias
    g.fill()
    g.globalCompositeOperation = 'lighter'
    g.globalAlpha = fade * (0.12 + 0.14 * breath) * bias
    g.fill()
    // A soft wash is quiet over a bright sector — the grass is nearly as
    // light as the glow — so each jar also wears a RING of its own colour.
    // An outline holds up against any backdrop the ten biomes can put behind
    // it, which a glow does not.
    g.globalCompositeOperation = 'source-over'
    g.globalAlpha = fade * (0.5 + 0.35 * breath) * bias
    g.strokeStyle = tone
    g.lineWidth = Math.max(3, r * 0.2)
    g.beginPath()
    g.arc(p.x, p.y, r * 1.14, 0, TAU)
    g.stroke()
  }

  // 2. THE TAP: one pot at a time wears an expanding ring — the gesture the
  //    game is asking for, shown on the thing to do it to.
  g.globalCompositeOperation = 'lighter'
  // …and in that last second the ripple stops wandering and settles on it.
  const which = tell > 0.3 ? 0 : Math.floor(c.t / BEAT) % n
  const u = (c.t % BEAT) / BEAT
  const tap = c.pots[which]
  if (!still && tap && u < 0.72) {
    const k = u / 0.72
    g.globalAlpha = fade * (1 - k) * 0.85
    g.strokeStyle = '#fff6c8'
    g.lineWidth = Math.max(2.5, r * 0.16) * (1 - k * 0.5)
    g.beginPath()
    g.arc(tap.x, tap.y, r * (1.05 + k * 0.85), 0, TAU)
    g.stroke()
  }

  // 3. THE SENTENCE: motes leaving the pots for the landmark. Each carries
  //    the colour of the pot it left, so three colours are on their way to
  //    one place — which is exactly the choice being asked for.
  for (let i = 0; i < n; i++) {
    const p = c.pots[i]
    if (!p) continue
    for (let m = 0; m < MOTES; m++) {
      // Held in place when motion is reduced: the same grains, not moving.
      const u2 = still ? 0.3 + (m / MOTES) * 0.45 : (c.t / DRIFT + m / MOTES + i * 0.19) % 1
      const [mx, my] = pathAt(u2, p.x, p.y - r * 0.5, c.lx, c.ly)
      // Fade in off the pot and out again at the landmark: a mote that
      // arrives and stops reads as an object, not as a hint.
      const a = sin(u2 * Math.PI)
      g.globalAlpha = fade * a * 0.5
      g.fillStyle = c.tones[i] ?? '#ffffff'
      g.beginPath()
      g.arc(mx, my, Math.max(2, r * 0.12) * (0.6 + 0.4 * a), 0, TAU)
      g.fill()
    }
  }
  g.restore()
}

/** The ring round the blank landmark, drawn here so the two cues cannot
 *  drift apart: the same dashes, quieter than the pots, because it is the
 *  DESTINATION and not the button. */
export const drawLandmarkTarget = (
  g: G2D, lx: number, ly: number, w: number, t: number, phaseT: number
): void => {
  const still = reducedMotion.value
  const r = w * (0.09 + (still ? 0 : 0.012 * sin(t * 4)))
  g.save()
  g.globalAlpha = clamp(phaseT / 0.4, 0, 1) * (still ? 0.36 : 0.3 + 0.14 * sin(t * 4))
  g.beginPath()
  g.arc(lx, ly, r, 0, TAU)
  g.lineWidth = Math.max(2.5, w * 0.005)
  g.strokeStyle = '#fff6c8'
  g.setLineDash([10, 9])
  g.lineDashOffset = still ? 0 : -t * 30
  g.stroke()
  g.restore()
  // A few grains of light settling INTO it, so it reads as somewhere paint
  // is landing rather than somewhere to press.
  g.save()
  g.globalCompositeOperation = 'lighter'
  for (let i = 0; still === false && i < 3; i++) {
    const u = (t / 1.6 + i / 3) % 1
    const a = TAU * (i / 3) + t * 0.6
    const d = r * (1.5 - u)
    g.globalAlpha = clamp(phaseT / 0.4, 0, 1) * sin(u * Math.PI) * 0.4
    g.fillStyle = '#fff6c8'
    g.beginPath()
    g.arc(lx + cos(a) * d, ly + sin(a) * d * 0.7, Math.max(1.5, w * 0.004), 0, TAU)
    g.fill()
  }
  g.restore()
}
