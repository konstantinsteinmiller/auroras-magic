/**
 * intro.ts — the first-launch intro (owner, 2026-09-19; story-spec §8.26).
 *
 * A picture book of five beats, ~17 s, with no words but the game's name and
 * a Play button. Anyone of any age (and any language) should come away
 * knowing what the game is about:
 *
 *   0  HELLO    a bright meadow; Aurora trots in and whinnies hello
 *   1  DUST     Umbra floats in on a little dark cloud, giggles, and blows
 *               grey dust across the meadow; Aurora says "aww"
 *   2  RUNE     Aurora's horn glows and a rune draws itself in the air — a
 *               fingertip rides its tip: YOU draw these
 *   3  CLEAN    her magic pops out a sponge, which scrubs the page in big
 *               zigzags — the colour comes back exactly where it passes,
 *               as it does under a player's finger — then a last wave of
 *               colour and a happy whinny
 *   4  PLAY     Aurora cheers; a big Play button
 *
 * A first-time player meets it in TWO PARTS (owner, 2026-09-24). The
 * PROLOGUE is beats 0–1, cut while Umbra is still hovering over the dust. It
 * plays in front of node 0's duel, so the child knows who she is fighting and
 * why. The LESSON is beats 2–4, at the first tap on a waiting gift, right
 * before the first cleaning it teaches. A replay from Options plays the whole
 * book. See `IntroPart`.
 *
 * It is drawn with the game's OWN painters — the 1-1 sector, the duel rig,
 * the rune glyph, the Stardust Sponge, the particles — so it can never drift
 * from the game it introduces. And every beat is paint-ready: when
 * `images/story/intro-<n>.webp` exists (the art pipeline's `story` kind), that
 * painted panel stands in for the beat's background and characters, and the
 * live layer (rune trace, sponge, sparkles, dust) is drawn over it.
 *
 * The first-load interstitial (C30) comes first: the intro holds on its
 * opening frame, silent, until that ad has settled.
 *
 * On a phone held upright the page is tall rather than a thin 12∶7 strip:
 * it shows the scene's full height, and a slow camera pans across the
 * meadow to keep the action in view (unlike the wipe, nothing here has to
 * stay reachable).
 */
import { S } from '@/game/duel/state'
import { SEC_W, SEC_H } from '@/game/restore/mask'
import { computeFrame } from '@/game/restore/frame'
import { readInsets } from '@/game/duel/layout'
import { makeCanvas, bakeDust } from '@/game/restore/dust'
import { sectorOf } from '@/game/map/sectors'
import { paintSectorArt, sectorPainted } from '@/game/map/sectorArt'
import { drawCloth } from '@/game/map/map'
import { drawUnicorn, type PoseState } from '@/game/duel/chars'
import { guardianOf } from '@/game/duel/foes'
import { EMOTE_FACE } from '@/game/story/portrait'
import { drawGlyph } from '@/game/duel/glyph'
import { drawSponge } from '@/game/restore/gift'
import { sparkleBurst, glint, puff, bubble, brushTrail, drawFxUnder, drawFxOver, resetFx } from '@/game/duel/fx'
import { sfx } from '@/game/duel/audio'
import { spriteFor } from '@/game/art'
import { drawItem } from '@/game/artItem'
import { GLOVE_ART } from '@/game/map/glove'
import { storyArtId, storyPanelOf, STORY_PANELS } from '@/game/artIds'
import { introHud } from '@/use/useIntroHud'
import { firstLoadAdSettled } from '@/use/useFirstLoadInterstitial'
import { clamp, ease, lerp, damp, sin, cos, TAU, PI, rnd } from '@/game/duel/util'
import type { Box } from '@/use/useRestoreHud'

type G2D = CanvasRenderingContext2D

/* ------------------------------------------------------------ timeline */

/** Each beat's length, seconds. The hello is short (owner, 2026-09-24): it
 *  stands in front of the first duel now, and Umbra arrives two seconds in —
 *  as soon as Aurora has trotted in and hopped hello. */
export const BEAT_LEN = [2.0, 4.2, 3.6, 4.4, 3.4] as const
export const INTRO_BEATS = BEAT_LEN.length
const STARTS = BEAT_LEN.map((_, i) => BEAT_LEN.slice(0, i).reduce((a, b) => a + b, 0))
export const INTRO_LEN = BEAT_LEN.reduce((a, b) => a + b, 0)
/** The moment of each PANEL's beat that its painting shows (the bench draws
 *  the reference at this time). Panel 4 serves the last two beats. Panel 1's
 *  2.6 s is past its now-2.0 s beat on purpose. The hop is over by 1.95 s, so
 *  it draws the same frame, and the painted panel's reference does not
 *  change. */
export const BEAT_KEY = [2.6, 2.7, 2.6, 4.2] as const

// Moments inside the beats, seconds from the beat's start.
const ARRIVE = 1.25
const SWEEP_IN = 0.9
const SWEEP_OUT = 2.5
const UMBRA_LEAVE = 3.1

/**
 * Which part of the book is being played (owner, 2026-09-24):
 *
 *   prologue  beats 0–1, in front of node 0's duel. Aurora says hello, then
 *             Umbra floats in and dusts the meadow. It ends while she is still
 *             hovering there, because she is the one Aurora duels next.
 *   lesson    beats 2–4, at the first gift. Aurora's magic, the sponge
 *             scrubbing the colour back, and Play. It opens on the dusty
 *             meadow the prologue left.
 *   whole     all five beats: a replay from Options, or an old save that won
 *             its first duel before the prologue existed.
 */
export type IntroPart = 'prologue' | 'lesson' | 'whole'
/** Each part's span on the book's clock, seconds: [start, end). */
export const PART_SPAN: Readonly<Record<IntroPart, readonly [number, number]>> = {
  prologue: [0, STARTS[1]! + UMBRA_LEAVE],
  lesson: [STARTS[2]!, INTRO_LEN],
  whole: [0, INTRO_LEN]
}
const TRACE_IN = 0.7
const TRACE_LEN = 1.8
/** Beat 3: the sponge pops out of her horn, glides to the page's corner,
 *  scrubs, and a last wave of colour finishes what it missed. */
const SPONGE_IN = 0.55
const SCRUB_IN = 0.9
const SCRUB_OUT = 3.0
const WAVE_END = 3.45

/** Where the page's stars sit around the page (fractions of the screen). */
const TWINKLES: [number, number, number][] = (() => {
  let s = 11
  const r = (): number => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
  return Array.from({ length: 30 }, () => [r(), r(), 0.8 + r() * 1.6] as [number, number, number])
})()

/* --------------------------------------------------------------- state */

let running = false
/** Held on the opening frame until the first-load ad has settled (C30). */
let held = true
let t = 0
let beat = 0
let part: IntroPart = 'whole'
/** The book's clock time this part ends at. */
let endT = INTRO_LEN
let onDone: ((skipped: boolean, atBeat: number) => void) | null = null
let box: Box = { x: 0, y: 0, w: 1, h: 1 }
/** Sector units → the page: CSS = box + (su − ox) × k. `ox` is the camera's
 *  left edge, 0 unless the page is a portrait window onto the scene. */
const view = { k: 1, ox: 0 }
let portrait = false
/** The camera's centre, SU (portrait only). */
let camX = SEC_W / 2
let colourCv: HTMLCanvasElement | null = null
let dustCv: HTMLCanvasElement | null = null
/** Whether the meadow's painting was in hand when those two were baked. */
let bakedPainted = false
/** Which one-shot moments have fired (sounds, bursts), by key. */
const fired = new Set<string>()
let traceSfxT = 0
let scrubSfxT = 0
let fxT = 0
/** A tap on Aurora: a little hop and a whinny. */
let tapHopT = -1
let tapNeighAt = -9

const AURORA = { x: 600, y: 612, s: 1.3 }
const UMBRA_Y = 196
const RUNE = { x: 830, y: 250, r: 100 }
/** Aurora's horn tip, roughly, where she stands: her magic starts here. */
const HORN = { x: 700, y: 400 }

/** The sponge's scrubbing route, SU: five long passes, top to bottom, like a
 *  child cleaning a window. With `TRAIL_R` the bands overlap, so the trail
 *  alone uncovers nearly all of the page. */
const ROUTE: readonly (readonly [number, number])[] = [
  [110, 140], [1040, 190], [130, 330], [1030, 380], [120, 530], [1040, 570]
]
const TRAIL_R = 108
const SPONGE_SU = 150
const ROUTE_LEN: number[] = [0]
for (let i = 1; i < ROUTE.length; i++) {
  const [ax, ay] = ROUTE[i - 1]!
  const [bx, by] = ROUTE[i]!
  ROUTE_LEN.push(ROUTE_LEN[i - 1]! + Math.hypot(bx - ax, by - ay))
}
const ROUTE_TOTAL = ROUTE_LEN[ROUTE_LEN.length - 1]!

/** The point `s` (0..1) of the way along the route. */
const routeAt = (s: number): [number, number] => {
  const d = clamp(s, 0, 1) * ROUTE_TOTAL
  let i = 1
  while (i < ROUTE.length - 1 && ROUTE_LEN[i]! < d) i++
  const [ax, ay] = ROUTE[i - 1]!
  const [bx, by] = ROUTE[i]!
  const f = (d - ROUTE_LEN[i - 1]!) / Math.max(1, ROUTE_LEN[i]! - ROUTE_LEN[i - 1]!)
  return [lerp(ax, bx, f), lerp(ay, by, f)]
}

/* -------------------------------------------------------------- layers */

/** The meadow in colour and under dust, baked once (sector units). The
 *  props move on the colour side and rest, greyed, inside the dust — as in
 *  the restore view. */
const ensureLayers = (res: number): void => {
  // Whether the meadow's PAINTING was in hand when these were baked. It is
  // fetched lazily, so the first bake always draws the vectors; without this
  // check the drawn meadow would stand for the whole intro with the painting
  // decoded and unused. Re-baking is one canvas and only ever happens once,
  // when it lands (`wipe.ts` guards its own bake the same way).
  const painted = sectorPainted(0, false)
  if (colourCv && dustCv && painted === bakedPainted) return
  bakedPainted = painted
  const sec = sectorOf(0)
  colourCv = makeCanvas(Math.round(SEC_W * res), Math.round(SEC_H * res))
  dustCv = makeCanvas(colourCv.width, colourCv.height)
  const g = colourCv.getContext('2d')
  if (g) {
    g.setTransform(res, 0, 0, res, 0, 0)
    const pot = sec.pots[0]!
    if (!paintSectorArt(g, 0, sec, pot, false)) sec.paint(g, pot)
    g.setTransform(1, 0, 0, 1, 0, 0)
  }
  bakeDust(dustCv, colourCv, res, 1, (dg) => sec.props(dg, 0, 0))
}

/** The meadow in colour, its props alive. */
const drawColour = (g: G2D, time: number): void => {
  if (!colourCv) return
  g.drawImage(colourCv, 0, 0, SEC_W, SEC_H)
  sectorOf(0).props(g, time, 1)
}

/* ------------------------------------------------------------ painters */

const face = (e: keyof typeof EMOTE_FACE) => EMOTE_FACE[e]

const drawAurora = (g: G2D, x: number, y: number, st: PoseState, time: number): void => {
  g.save()
  g.translate(x, y)
  g.scale(AURORA.s, AURORA.s)
  drawUnicorn(g, 0, 0, -1, st, time)
  g.restore()
}

/** Umbra on her little dark cloud — cheeky, never scary. */
const drawUmbra = (g: G2D, x: number, y: number, time: number): void => {
  g.save()
  g.translate(x, y)
  // The cloud, under her hooves: a few soft lilac-grey puffs, plum-inked as
  // ONE shape — the outline stroked first and the fill laid over it, so the
  // puffs merge without seams.
  g.beginPath()
  for (const [cx, cy, r] of [[-70, 6, 34], [-24, -4, 44], [30, 0, 40], [74, 8, 30], [0, 18, 44]] as const) {
    g.moveTo(cx + r, cy)
    g.arc(cx, cy, r, 0, TAU)
  }
  g.lineWidth = 10
  g.strokeStyle = '#3A2340'
  g.stroke()
  g.fillStyle = '#6a5a8e'
  g.fill()
  g.beginPath()
  g.arc(-30, -14, 22, PI * 1.05, PI * 1.75)
  g.lineWidth = 6
  g.strokeStyle = 'rgba(255,255,255,0.35)'
  g.stroke()
  g.scale(0.82, 0.82)
  drawUnicorn(g, 0, -10, 1, { foe: guardianOf(9), face: face('cheering') }, time)
  g.restore()
}

/** Where Umbra's cloud is at time `u` of beat 1. */
const umbraAt = (u: number): [number, number] => {
  const bob = sin(u * 2.2) * 8
  if (u < SWEEP_IN) return [lerp(SEC_W + 220, 880, ease(u / SWEEP_IN)), UMBRA_Y + bob]
  if (u > UMBRA_LEAVE) {
    const k = ease(clamp((u - UMBRA_LEAVE) / 0.9, 0, 1))
    return [lerp(880, SEC_W + 260, k), UMBRA_Y + bob - 90 * k]
  }
  return [880, UMBRA_Y + bob]
}

/** Aurora's pose and place in beat `k` at time `u`, and her time for the rig. */
const auroraOf = (k: number, u: number): { x: number; y: number; st: PoseState } => {
  let x = AURORA.x
  let y = AURORA.y
  const st: PoseState = { face: face('happy') }
  if (k === 0) {
    const a = clamp(u / ARRIVE, 0, 1)
    x = lerp(-180, AURORA.x, ease(a))
    // A trot: a little bounce while she comes in.
    if (a < 1) y -= Math.abs(sin(u * 11)) * 10
    // Then a happy hop hello.
    if (u >= ARRIVE && u < ARRIVE + 0.7) st.win = sin(((u - ARRIVE) / 0.7) * PI) * 0.8
  } else if (k === 1) {
    st.face = face(u > 1.2 ? 'worriedMild' : 'happy')
  } else if (k === 2) {
    st.face = face('determined')
    st.form = clamp((u - 0.4) / 0.6, 0, 1)
  } else if (k === 3) {
    st.face = face(u > SCRUB_OUT ? 'cheering' : 'determined')
    if (u > WAVE_END) st.win = Math.max(0, sin((u - WAVE_END) * 6)) * 0.7
    if (u > 0.15 && u < 0.85) st.cast = sin(((u - 0.15) / 0.7) * PI)
    st.form = u < 0.3 ? 1 : 0
  } else {
    st.face = face('cheering')
    st.win = Math.max(0, sin(u * 5.2)) * 0.85
  }
  if (tapHopT >= 0) st.win = Math.max(st.win ?? 0, sin(clamp(tapHopT / 0.5, 0, 1) * PI) * 0.7)
  return { x, y, st }
}

/** How far the dust has blown in, 0..1, at time `u` of beat 1. */
const sweepK = (u: number): number => ease(clamp((u - SWEEP_IN) / (SWEEP_OUT - SWEEP_IN), 0, 1))

/** The dust's rolling front at height `y`: a soft, billowing edge. */
const frontX = (y: number, u: number): number =>
  lerp(SEC_W + 120, -120, sweepK(u)) + sin(y * 0.018 + u * 5) * 26 + sin(y * 0.041 - u * 3) * 12

/** Clip to everything the dust has covered, at time `u` of beat 1. */
const clipSwept = (g: G2D, u: number): void => {
  g.beginPath()
  g.moveTo(SEC_W + 10, -10)
  for (let y = -10; y <= SEC_H + 10; y += 24) g.lineTo(frontX(y, u), y)
  g.lineTo(SEC_W + 10, SEC_H + 10)
  g.closePath()
  g.clip()
}

/** The rolling front itself: a row of soft dust billows riding its edge. */
const drawFront = (g: G2D, u: number): void => {
  const k = sweepK(u)
  if (k <= 0 || k >= 1) return
  g.fillStyle = 'rgba(122,110,142,0.5)'
  g.beginPath()
  for (let i = 0; i < 12; i++) {
    const y = (i + 0.5) * (SEC_H / 12) + sin(u * 4 + i) * 10
    const r = 34 + 14 * sin(u * 6 + i * 1.7)
    const x = frontX(y, u) + 10
    g.moveTo(x + r, y)
    g.arc(x, y, r, 0, TAU)
  }
  g.fill()
}

/** How far along its route the sponge is, 0..1, at time `u` of beat 3. */
const scrubK = (u: number): number => clamp((u - SCRUB_IN) / (SCRUB_OUT - SCRUB_IN), 0, 1)

/** The last wave's radius, from where the sponge finished. */
const waveR = (u: number): number =>
  ease(clamp((u - SCRUB_OUT) / (WAVE_END - SCRUB_OUT), 0, 1)) * Math.hypot(SEC_W, SEC_H)

/** Clip to everything the sponge has cleaned by time `u` of beat 3: its trail,
 *  a disc along every step of the route so far, then the last wave. */
const clipCleaned = (g: G2D, u: number): void => {
  const s = scrubK(u)
  g.beginPath()
  const n = Math.ceil((s * ROUTE_TOTAL) / 36)
  for (let i = 0; i <= n; i++) {
    const [x, y] = routeAt(n ? (s * i) / n : 0)
    g.moveTo(x + TRAIL_R, y)
    g.arc(x, y, s > 0 ? TRAIL_R : 0.01, 0, TAU)
  }
  const r = waveR(u)
  if (r > 0) {
    const [x, y] = routeAt(1)
    g.moveTo(x + r, y)
    g.arc(x, y, r, 0, TAU)
  }
  g.clip()
}

/** The meadow for beat `k` at time `u`: colour, dust, or the change between. */
const drawBackground = (g: G2D, k: number, u: number, time: number): void => {
  if (!colourCv || !dustCv) return
  if (k === 1 && u < SWEEP_OUT) {
    // The dust rolls in from Umbra's side.
    drawColour(g, time)
    g.save()
    clipSwept(g, u)
    g.drawImage(dustCv, 0, 0, SEC_W, SEC_H)
    g.restore()
    drawFront(g, u)
    return
  }
  if (k === 3 && u < WAVE_END) {
    // The colour comes back wherever the sponge has been.
    g.drawImage(dustCv, 0, 0, SEC_W, SEC_H)
    if (u > SCRUB_IN) {
      g.save()
      clipCleaned(g, u)
      drawColour(g, time)
      g.restore()
    }
    return
  }
  if (k === 0 || k >= 3) drawColour(g, time)
  else g.drawImage(dustCv, 0, 0, SEC_W, SEC_H)
}

/**
 * Beat `k` at time `u`, procedurally: the meadow and the characters — the
 * part a painted panel replaces. `time` drives the rig's idle motion.
 */
export const composeBeat = (g: G2D, k: number, u: number, time: number): void => {
  drawBackground(g, k, u, time)
  const a = auroraOf(k, u)
  drawAurora(g, a.x, a.y, a.st, time)
  if (k === 1) {
    const [ux, uy] = umbraAt(u)
    if (ux < SEC_W + 200) drawUmbra(g, ux, uy, time)
  }
}

/* --------------------------------------------------- painted panels */

const stillOf = (k: number): HTMLImageElement | null => spriteFor('story', storyArtId(k))

/** A panel's slow storybook zoom at time `u` of beat `k`, continuous across
 *  the beats that share the panel. */
const stillZoom = (k: number, u: number): number => {
  const panel = storyPanelOf(k)
  let first = k
  while (first > 0 && storyPanelOf(first - 1) === panel) first--
  let len = 0
  for (let b = first; b < INTRO_BEATS && storyPanelOf(b) === panel; b++) len += BEAT_LEN[b]!
  return 1 + 0.035 * clamp((STARTS[k]! + u - STARTS[first]!) / len, 0, 1)
}

/** A painted panel at zoom `z`. */
const drawStill = (g: G2D, img: HTMLImageElement, z: number): void => {
  g.save()
  g.translate(SEC_W / 2, SEC_H / 2)
  g.scale(z, z)
  g.drawImage(img, -SEC_W / 2, -SEC_H / 2, SEC_W, SEC_H)
  g.restore()
}

/** The painted version of beat `k`, with its transition; false when the
 *  panels it needs are not all painted (the drawing then stands in). */
const drawPainted = (g: G2D, k: number, u: number): boolean => {
  const cur = stillOf(k)
  if (!cur) return false
  if (k === 1 && u < SWEEP_OUT) {
    const prev = stillOf(0)
    if (!prev) return false
    drawStill(g, prev, stillZoom(0, BEAT_LEN[0]))
    g.save()
    clipSwept(g, u)
    drawStill(g, cur, stillZoom(1, u))
    g.restore()
    drawFront(g, u)
    return true
  }
  if (k === 3 && u < WAVE_END) {
    const prev = stillOf(2)
    if (!prev) return false
    drawStill(g, prev, stillZoom(2, BEAT_LEN[2]))
    if (u > SCRUB_IN) {
      g.save()
      clipCleaned(g, u)
      drawStill(g, cur, stillZoom(3, u))
      g.restore()
    }
    return true
  }
  drawStill(g, cur, stillZoom(k, u))
  return true
}

/* ------------------------------------------------------- lifecycle */

/** Where the page sits: the sector's own frame (§8.1), so the intro, the
 *  restore view and the map are one picture book. */
export const introResize = (): void => {
  const ins = readInsets()
  portrait = S.h > S.w
  if (!portrait) {
    box = computeFrame(S.w, S.h, ins)
    view.k = box.w / SEC_W
  } else {
    // A tall page under the Skip icon, with room below it for the Play button.
    const w = Math.max(1, S.w - ins.left - ins.right - 24)
    const top = ins.top + 80
    const bottom = S.h - ins.bottom - 150
    let h = Math.max(1, Math.min(bottom - top, w * 1.45))
    view.k = h / SEC_H
    // Never zoomed out past the whole scene: then it is simply the full page.
    if (w / view.k > SEC_W) {
      view.k = w / SEC_W
      h = SEC_H * view.k
    }
    box = { x: ins.left + 12, y: top + Math.max(0, (bottom - top - h) * 0.4), w, h }
  }
  aimCamera(1)
  introHud.box = { ...box }
  introHud.portrait = portrait
  // The Play button: over the meadow to Aurora's right, or under a tall page.
  const s = clamp(Math.min(box.h * 0.24, S.h * 0.16), 88, 150)
  if (portrait) {
    const below = S.h - ins.bottom - (box.y + box.h)
    introHud.playAt = { x: box.x + box.w / 2, y: box.y + box.h + Math.min(below / 2, 96), s }
  } else {
    introHud.playAt = { x: box.x + box.w * 0.78, y: box.y + box.h * 0.5, s }
  }
}

/** What the camera wants to look at in beat `k` at time `u`, SU. */
const camTarget = (k: number, u: number): number => {
  if (k === 0) return Math.min(auroraOf(0, u).x + 60, 660)
  if (k === 1) return 745
  if (k === 2) return 737
  if (k === 3) return u > SCRUB_IN && u < SCRUB_OUT ? spongeAt(u)[0] : 640
  return 640
}

/** Ease the camera toward its target (`dt` = 1 jumps straight there). */
const aimCamera = (dt: number): void => {
  const vis = box.w / view.k
  if (!portrait || vis >= SEC_W) {
    camX = SEC_W / 2
    view.ox = 0
    return
  }
  const target = camTarget(beat, t - STARTS[beat]!)
  camX = dt >= 1 ? target : damp(camX, target, beat === 3 ? 2.2 : 3, dt)
  camX = clamp(camX, vis / 2, SEC_W - vis / 2)
  view.ox = camX - vis / 2
}

/** The beat the book's clock is on at `time`. */
const beatAt = (time: number): number => {
  let k = 0
  while (k < INTRO_BEATS - 1 && time >= STARTS[k + 1]!) k++
  return k
}

/** Start the intro, or one `IntroPart` of it; `done` is called once, when it
 *  ends or is skipped. */
export const beginIntro = (done: (skipped: boolean, atBeat: number) => void, which: IntroPart = 'whole'): void => {
  onDone = done
  running = true
  held = true
  part = which
  ;[t, endT] = PART_SPAN[which]
  beat = beatAt(t)
  fired.clear()
  tapHopT = -1
  resetFx()
  introResize()
  // Sharp on the page it fills, never past the sector's own size.
  ensureLayers(clamp(view.k * S.dpr, 0.5, 1))
  introHud.beat = beat
  introHud.title = false
  introHud.play = false
  void firstLoadAdSettled().then(() => { held = false })
}

const finish = (skipped: boolean): void => {
  if (!running) return
  running = false
  introHud.title = false
  introHud.play = false
  introHud.beat = -1
  const cb = onDone
  onDone = null
  const at = beat
  // The meadow's two layers are ~2 MB; the intro will not be back soon.
  colourCv = dustCv = null
  cb?.(skipped, at)
}

/** The Skip button. */
export const skipIntro = (): void => finish(true)

/** The Play button, or a tap on the last beat. */
export const playFromIntro = (): void => finish(false)

export const introRunning = (): boolean => running

/* --------------------------------------------------------- update */

const once = (key: string, fn: () => void): void => {
  if (fired.has(key)) return
  fired.add(key)
  fn()
}

/** Sector units → CSS px on the page. */
const toCss = (x: number, y: number): [number, number] =>
  [box.x + (x - view.ox) * view.k, box.y + y * view.k]

export const updateIntro = (dt: number): void => {
  if (!running) return
  if (tapHopT >= 0) {
    tapHopT += dt
    if (tapHopT > 0.5) tapHopT = -1
  }
  if (held) {
    aimCamera(dt)
    return
  }
  t += dt
  if (t >= endT) {
    finish(false)
    return
  }
  const k = beatAt(t)
  beat = k
  introHud.beat = k
  const u = t - STARTS[k]!
  aimCamera(dt)
  fxT -= dt
  if (k === 0) {
    introHud.title = u > 0.2
    if (u >= ARRIVE) once('hello', () => {
      sfx('neigh')
      const [x, y] = toCss(AURORA.x + 40, AURORA.y - 190)
      sparkleBurst(x, y, 0.6)
    })
    if (fxT <= 0) {
      fxT = 0.18
      const [x, y] = toCss(view.ox + rnd() * (box.w / view.k), 80 + rnd() * 380)
      glint(x, y, 6 + rnd() * 6, 0, 0, -20)
    }
  } else if (k === 1) {
    introHud.title = false
    if (u > 0.4) once('giggle1', () => sfx('giggle'))
    if (u > SWEEP_IN) once('whoosh', () => sfx('whoosh'))
    if (u > 1.5) once('sigh', () => sfx('sigh'))
    if (u > UMBRA_LEAVE + 0.1) once('giggle2', () => sfx('giggle'))
    if (u > SWEEP_IN && u < SWEEP_OUT && fxT <= 0) {
      // Dust blown off her cloud, tumbling ahead of the rolling front.
      fxT = 0.035
      const fy = 40 + rnd() * (SEC_H - 80)
      const [x, y] = toCss(frontX(fy, u) - 10, fy)
      puff(x, y, -90 - rnd() * 60, (rnd() - 0.5) * 30, (16 + rnd() * 16) * view.k * 1.6)
    }
  } else if (k === 2) {
    if (u > 0.4) once('glow', () => sfx('chime', 3))
    const f = (u - TRACE_IN) / TRACE_LEN
    if (f > 0 && f < 1) {
      traceSfxT -= dt
      if (traceSfxT <= 0) {
        traceSfxT = 0.09
        sfx('draw', f)
      }
    }
    if (f >= 1) once('snap', () => {
      sfx('snap', 0)
      const [x, y] = toCss(RUNE.x, RUNE.y)
      sparkleBurst(x, y, 0.8)
    })
  } else if (k === 3) {
    if (u > 0.15) once('cast', () => {
      sfx('cast', 0)
      const [x, y] = toCss(HORN.x, HORN.y)
      sparkleBurst(x, y, 0.7)
    })
    // Pop! The magic turns into a sponge.
    if (u > SPONGE_IN) once('sponge', () => {
      sfx('chime', 5)
      const [x, y] = toCss(HORN.x, HORN.y)
      sparkleBurst(x, y, 0.5)
    })
    if (u > SCRUB_IN && u < SCRUB_OUT) {
      scrubSfxT -= dt
      if (scrubSfxT <= 0) {
        scrubSfxT = 0.09
        sfx('scrub', 520)
      }
      if (fxT <= 0) {
        fxT = 0.05
        const [sx, sy] = spongeAt(u)
        const [x, y] = toCss(sx, sy)
        const s = SPONGE_SU * view.k
        bubble(x + (rnd() - 0.5) * s * 0.8, y - s * 0.1, (rnd() - 0.5) * 50, -40 - rnd() * 50, s * (0.04 + rnd() * 0.06))
        brushTrail(x, y, 1)
      }
      // A chime at each pass's turn, climbing — the wipe's own coverage ladder.
      const pass = Math.floor(scrubK(u) * (ROUTE.length - 1))
      if (pass > 0) once(`pass${pass}`, () => sfx('chime', pass + 1))
    }
    if (u >= SCRUB_OUT) once('reveal', () => {
      sfx('reveal')
      const [x, y] = toCss(...routeAt(1))
      sparkleBurst(x, y, 1.1)
    })
    if (u >= WAVE_END) once('yay', () => {
      sfx('neigh')
      const [x, y] = toCss(AURORA.x + 40, AURORA.y - 190)
      sparkleBurst(x, y, 0.8)
    })
  } else {
    introHud.play = true
    if (u > 0.35) once('cheer', () => sfx('neigh'))
    if (fxT <= 0) {
      fxT = 0.22
      const [x, y] = toCss(AURORA.x + (rnd() - 0.5) * 260, AURORA.y - 120 - rnd() * 200)
      glint(x, y, 7 + rnd() * 7, 0, 0, -30)
    }
  }
}

/** Where the sponge is at time `u` of beat 3, SU: out of her horn, off to
 *  the page's corner, then along its route with a little scrubbing jiggle. */
const spongeAt = (u: number): [number, number] => {
  const [x0, y0] = routeAt(0)
  if (u < SCRUB_IN) {
    const f = ease(clamp((u - SPONGE_IN) / (SCRUB_IN - SPONGE_IN), 0, 1))
    return [lerp(HORN.x, x0, f), lerp(HORN.y, y0, f) - sin(f * PI) * 90]
  }
  const [x, y] = routeAt(scrubK(u))
  return [x + sin(u * 23) * 14, y + cos(u * 19) * 10]
}
/** The sponge's size and squish at time `u`: it pops up out of the magic. */
const spongeScale = (u: number): number => {
  const f = clamp((u - SPONGE_IN) / 0.25, 0, 1)
  const out = 1 - clamp((u - SCRUB_OUT - 0.1) / 0.3, 0, 1)
  return ease(f) * (1 + 0.25 * sin(f * PI)) * out
}

/* ----------------------------------------------------------- input */

/** A tap on the page: a sparkle where it lands; on Aurora, a hop and a
 *  whinny; on the last beat, off we go. */
export const introPointerDown = (cx: number, cy: number): void => {
  if (!running) return
  brushTrail(cx, cy, 3)
  if (beat === INTRO_BEATS - 1 && !held) {
    playFromIntro()
    return
  }
  const a = auroraOf(beat, t - STARTS[beat]!)
  const [ax, ay] = toCss(a.x, a.y - 120 * AURORA.s)
  if (Math.hypot(cx - ax, cy - ay) < view.k * 150 && performance.now() - tapNeighAt > 800) {
    tapNeighAt = performance.now()
    tapHopT = 0
    sfx('neigh')
  }
}

/* ------------------------------------------------------------ draw */

export const drawIntro = (g: G2D): void => {
  if (!running) return
  const d = S.dpr
  g.setTransform(d, 0, 0, d, 0, 0)
  g.globalAlpha = 1
  g.globalCompositeOperation = 'source-over'
  // The cloth around the book, with its slow motes — the map's own cloth, so
  // the very first screen is not the one flat-coloured surround in the game.
  drawCloth(g, S.w, S.h)
  // The motes drifting on the cloth around the page. They used to be cream
  // stars on a night-blue void; on the lilac cloth a LIGHT mote washes out
  // exactly where the gradient is lightest (measured: cream at 0.32 alpha is
  // 1.78:1 against the top stop but 1.25:1 against the bottom one, i.e. gone).
  // A PLUM mote is the even one across the whole ramp (1.37 / 1.52 / 1.70), and
  // it reads as petals and dust on daylight cloth rather than stars at night —
  // which is what this surround now is. Alpha is scaled down to match the old
  // visual weight, because a darker-than-ground mote carries further than a
  // lighter-than-ground one at the same alpha.
  g.fillStyle = '#3A2340'
  for (let band = 0; band < 3; band++) {
    g.globalAlpha = 0.10 + 0.14 * (0.5 + 0.5 * sin(S.t * (0.9 + band * 0.4) + band * 2.1))
    g.beginPath()
    for (let i = band; i < TWINKLES.length; i += 3) {
      const [u, w, r] = TWINKLES[i]!
      g.moveTo(u * S.w + r, w * S.h)
      g.arc(u * S.w, w * S.h, r, 0, TAU)
    }
    g.fill()
  }
  g.globalAlpha = 1
  // The page.
  const b = Math.max(4, box.w * 0.008)
  g.fillStyle = 'rgba(20,10,30,0.35)'
  g.beginPath()
  g.roundRect(box.x - b + 5, box.y - b + 7, box.w + 2 * b, box.h + 2 * b, b * 2)
  g.fill()
  g.fillStyle = '#fff4e6'
  g.beginPath()
  g.roundRect(box.x - b, box.y - b, box.w + 2 * b, box.h + 2 * b, b * 2)
  g.fill()
  g.lineWidth = 2.5
  g.strokeStyle = '#3A2340'
  g.stroke()

  const u = t - STARTS[beat]!
  const k = view.k
  g.save()
  g.beginPath()
  g.rect(box.x, box.y, box.w, box.h)
  g.clip()
  g.setTransform(d * k, 0, 0, d * k, d * (box.x - view.ox * k), d * box.y)
  if (!drawPainted(g, beat, u)) composeBeat(g, beat, u, S.t)
  // The live layer, over painted and drawn alike.
  if (beat === 2) drawRuneTrace(g, u)
  if (beat === 3 && u > SPONGE_IN) {
    const sc = spongeScale(u)
    if (sc > 0.01) {
      const [sx, sy] = spongeAt(u)
      const press = u > SCRUB_IN && u < SCRUB_OUT ? 1 : 0
      drawSponge(g, sx, sy, SPONGE_SU * sc, press * sin(u * 16) * 0.2, S.t, press, u * 30)
    }
  }
  g.setTransform(d, 0, 0, d, 0, 0)
  g.restore()
  drawFxUnder(g)
  drawFxOver(g)
}

/** The rune drawing itself, with a fingertip riding its tip: you draw these. */
const drawRuneTrace = (g: G2D, u: number): void => {
  const f = clamp((u - TRACE_IN) / TRACE_LEN, 0, 1)
  if (u < TRACE_IN - 0.2) return
  // A faint ghost of the whole rune first, then the bright trace over it.
  drawGlyph(g, 0, RUNE.x, RUNE.y, RUNE.r, 0.18 * clamp((u - TRACE_IN + 0.2) / 0.2, 0, 1), 1)
  if (f <= 0) return
  const [hx, hy] = drawGlyph(g, 0, RUNE.x, RUNE.y, RUNE.r, 1, f)
  if (f < 1) {
    const ripple = (): void => {
      g.beginPath()
      g.arc(hx, hy + 6, 30 + (u * 60) % 18, 0, TAU)
      g.lineWidth = 3
      g.strokeStyle = 'rgba(255,255,255,0.5)'
      g.stroke()
    }
    // With the art layer on, the fingertip is the map's painted show-how
    // GLOVE (`map/glove.ts`, paint-outstanding.md P3): the same "put your
    // finger here" the front page uses, its fingertip riding the rune's tip,
    // tipped the way the map's is, over the drawn ripple.
    if (spriteFor(GLOVE_ART.kind, GLOVE_ART.id)) {
      ripple()
      g.save()
      g.translate(hx, hy)
      g.rotate(-0.35)
      drawItem(g, GLOVE_ART, GLOVE_U)
      g.restore()
      return
    }
    // The fingertip: a soft round pad with a ripple, pressing along.
    g.beginPath()
    g.arc(hx, hy + 6, 22, 0, TAU)
    g.fillStyle = 'rgba(255,255,255,0.92)'
    g.fill()
    g.lineWidth = 5
    g.strokeStyle = '#3A2340'
    g.stroke()
    ripple()
  }
}

/** The glove's finger width in the intro, sector units: a finger about as
 *  wide as the drawn pad's radius, so the hand reads as a hand without
 *  hiding the rune it is teaching. */
const GLOVE_U = 24

/* ------------------------------------------------------ the bench */

/**
 * Panel `k`'s reference for the art pipeline (§8.26): its beat's background
 * and characters at `BEAT_KEY[k]`, no live layer — exactly what a painted
 * `intro-<k+1>` stands in for. `px` is the panel's width.
 */
export const INTRO_PANELS = STORY_PANELS.length
export const renderIntroPanel = (k: number, px: number): HTMLCanvasElement => {
  const cv = makeCanvas(px, Math.round((px * SEC_H) / SEC_W))
  const g = cv.getContext('2d')
  if (!g) return cv
  const keep = [colourCv, dustCv] as const
  colourCv = dustCv = null
  ensureLayers(1)
  g.setTransform(px / SEC_W, 0, 0, px / SEC_W, 0, 0)
  composeBeat(g, k, BEAT_KEY[k]!, 1.3)
  ;[colourCv, dustCv] = keep
  return cv
}

/** Test and QA seam. */
export const introState = (): { running: boolean; held: boolean; t: number; beat: number; part: IntroPart } =>
  ({ running, held, t, beat, part })
