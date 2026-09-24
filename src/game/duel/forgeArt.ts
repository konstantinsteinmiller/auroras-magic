/**
 * forgeArt.ts — THE SPELL FORGE on the canvas (story-spec §8.37): the orb the
 * runes merge into, pouring into the horn, and the horn swelling in the
 * spell's main colour until the spell leaves.
 *
 * The runes themselves fly on the DOM (`SpellForge.vue`), because they leave
 * DOM slots: a canvas rune would start underneath the slot's opaque plate,
 * while the DOM one is the very glyph the slot was showing. They shrink into
 * the meeting point exactly as the orb is born there (`forge.orbAt`), so the
 * hand-over is one picture. Everything here draws in stage units, inside the
 * world pass (`render.ts`, after the duelists), which in portrait is the
 * picture's pane — the meeting point and the horn are both on the page.
 *
 * COLOUR, from the one table (`spellArt.ts`, `RUNES`): the orb's body is the
 * spell's LEAD rune — its main colour, the element the damage is scaled by —
 * and a mixed spell's second element rims it, as `Shot.m` rims a flying shot.
 * While it flows, a mote of each rune that made it still circles it, fading
 * as it pours in: the child sees which runes became this spell.
 *
 * CHEAP: no gradients, no blur, no allocation — stacked discs at low alpha,
 * the same trick as the old telegraph's horn glow, and one reused point.
 * Reduced motion: no orb and no closing ring — the slots cross-fade straight
 * to a steady horn glow, on the same clock (`forge.hornGlow`).
 */
import { PH_DUEL, RUNES } from '@/game/duel/config'
import { S, type Forge } from '@/game/duel/state'
import { BEAT, FORGE_S, HORN_Y, MERGE_Y, beat, hornGlow, hornX, mergeX, orbAt } from '@/game/duel/forge'
import { reducedMotion } from '@/use/useAccessibility'
import { TAU } from '@/game/duel/util'

type G2D = CanvasRenderingContext2D

/** The plum every spell body is inked in (`render.drawBody`). */
const INK = '#3A2340'
/** Reused: the orb's place this frame, and a place it passed (its wake). */
const ORB = { x: 0, y: 0, r: 0 }
const WAKE = { x: 0, y: 0, r: 0 }

const disc = (g: G2D, x: number, y: number, r: number): void => {
  g.beginPath()
  g.arc(x, y, r, 0, TAU)
  g.fill()
}

/** The merged spell, flowing: glow, the source runes' motes, the body, its
 *  catch-light and — mixed — the second element's rim. */
const drawOrb = (g: G2D, f: Forge, e: boolean, u: number, t: number): void => {
  const { x, y, r } = ORB
  const tones = RUNES[f.lead] ?? RUNES[0]!
  const col = tones[0]
  const lit = tones[1]
  g.save()
  g.globalCompositeOperation = 'lighter'
  g.fillStyle = lit
  // Its wake: where it was a few hundredths of the forge ago — it POURS.
  for (let k = 3; k >= 1; k--) {
    orbAt(u - 0.016 * k, e, false, WAKE)
    if (WAKE.r <= 0.5) continue
    g.globalAlpha = 0.16 * (4 - k)
    disc(g, WAKE.x, WAKE.y, WAKE.r * (1 - 0.18 * k))
  }
  g.globalAlpha = 0.24
  disc(g, x, y, r * 2.7)
  g.globalAlpha = 0.36
  disc(g, x, y, r * 1.7)
  g.restore()
  // The runes that made it, still circling it as it pours in.
  const fade = 1 - beat(u, BEAT.fly + 0.04, BEAT.flow)
  const n = f.q.length
  if (fade > 0 && n > 1) {
    g.save()
    g.lineWidth = Math.max(1.5, r * 0.09)
    g.strokeStyle = INK
    for (let i = 0; i < n; i++) {
      const a = t * 5.2 + (i * TAU) / n
      const mx = x + Math.cos(a) * r * 1.3
      const my = y + Math.sin(a) * r * 1.3 * 0.8
      g.globalAlpha = fade
      g.fillStyle = RUNES[f.q[i]!]?.[0] ?? col
      g.beginPath()
      g.arc(mx, my, r * 0.26, 0, TAU)
      g.fill()
      g.stroke()
    }
    g.restore()
  }
  // The body: the lead's colour, inked like every spell.
  g.fillStyle = col
  g.beginPath()
  g.arc(x, y, r, 0, TAU)
  g.fill()
  g.lineWidth = Math.max(2.5, r * 0.2)
  g.strokeStyle = INK
  g.stroke()
  g.save()
  g.globalAlpha = 0.85
  g.fillStyle = lit
  disc(g, x - r * 0.28, y - r * 0.32, r * 0.36)
  // A white-hot heart, so even the darkest element reads as LIGHT on the
  // dusk sky it crosses.
  g.globalCompositeOperation = 'lighter'
  g.globalAlpha = 0.5 + 0.15 * Math.sin(t * 14)
  g.fillStyle = '#fff6e6'
  disc(g, x, y, r * 0.42)
  g.restore()
  // A mixed spell's second element, round its edge (`Shot.m`).
  if (f.mix >= 0 && f.mix !== f.lead) {
    g.save()
    g.globalCompositeOperation = 'lighter'
    g.globalAlpha = 0.55 + 0.2 * Math.sin(t * 9)
    g.lineWidth = Math.max(1.5, r * 0.22)
    g.strokeStyle = RUNES[f.mix]?.[1] ?? lit
    g.beginPath()
    g.arc(x, y, r * 0.9, 0, TAU)
    g.stroke()
    g.restore()
  }
}

/** The horn, swelling in the spell's colour (`k` 0..1 → the release). */
const drawHorn = (g: G2D, f: Forge, e: boolean, k: number, t: number, still: boolean): void => {
  const tones = RUNES[f.lead] ?? RUNES[0]!
  const col = tones[0]
  const lit = tones[1]
  const x = hornX(e)
  const y = HORN_Y
  const p = still ? 0.7 : 0.5 + 0.5 * Math.sin(t * TAU * 2.6)
  const r = 7 + 19 * k + 4 * p * k
  g.save()
  g.globalCompositeOperation = 'lighter'
  g.fillStyle = lit
  g.globalAlpha = 0.14 + 0.2 * k
  disc(g, x, y, r * 2.2)
  g.fillStyle = col
  g.globalAlpha = 0.3 + 0.3 * k
  disc(g, x, y, r * 1.25)
  g.fillStyle = '#fff6e6'
  g.globalAlpha = 0.4 + 0.45 * k
  disc(g, x, y, r * 0.5)
  g.globalCompositeOperation = 'source-over'
  if (!still && k < 0.995) {
    // A ring of the spell's light closing onto the tip as the swell comes on:
    // the release reads as the end of what was building.
    g.globalAlpha = 0.35 + 0.55 * k
    g.lineWidth = 3
    g.strokeStyle = lit
    g.beginPath()
    g.arc(x, y, 16 + 62 * (1 - k), 0, TAU)
    g.stroke()
  }
  if (f.mix >= 0 && f.mix !== f.lead) {
    g.globalAlpha = 0.3 + 0.4 * k
    g.lineWidth = 2
    g.strokeStyle = RUNES[f.mix]?.[1] ?? lit
    g.beginPath()
    g.arc(x, y, r * 1.55, 0, TAU)
    g.stroke()
  }
  g.restore()
}

/** The runes MEET: one ring of the spell's light thrown off the meeting point
 *  as the orb is born (and a thinner one of the rune mixed into it). */
const drawMeet = (g: G2D, f: Forge, e: boolean, u: number): void => {
  const k = beat(u, BEAT.fly - 0.02, BEAT.fly + 0.1)
  if (k <= 0 || k >= 1) return
  const tones = RUNES[f.lead] ?? RUNES[0]!
  const x = mergeX(e)
  g.save()
  g.globalCompositeOperation = 'lighter'
  g.globalAlpha = 0.75 * (1 - k)
  g.lineWidth = 5 * (1 - k) + 1.5
  g.strokeStyle = tones[1]
  g.beginPath()
  g.arc(x, MERGE_Y, 14 + 62 * k, 0, TAU)
  g.stroke()
  if (f.mix >= 0 && f.mix !== f.lead) {
    g.lineWidth = 2
    g.strokeStyle = RUNES[f.mix]?.[1] ?? tones[1]
    g.beginPath()
    g.arc(x, MERGE_Y, 8 + 44 * k, 0, TAU)
    g.stroke()
  }
  g.restore()
}

const drawSide = (g: G2D, f: Forge, e: boolean, t: number, still: boolean): void => {
  if (f.t < 0) return
  const u = f.t / FORGE_S
  const k = hornGlow(u, still)
  if (k > 0.01) drawHorn(g, f, e, k, t, still)
  if (still) return
  drawMeet(g, f, e, u)
  orbAt(u, e, still, ORB)
  if (ORB.r > 0.5) drawOrb(g, f, e, u, t)
}

/**
 * Both sides' forges, over the duelists and under the spells in flight.
 * Called once a frame from `render.ts`, in stage space.
 */
export const drawForge = (g: G2D, t: number): void => {
  if (S.phase !== PH_DUEL || (S.forge.t < 0 && S.eForge.t < 0)) return
  const still = reducedMotion.value
  drawSide(g, S.forge, false, t, still)
  drawSide(g, S.eForge, true, t, still)
}
