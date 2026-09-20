/**
 * flow/transition.ts — the page turn between scenes (story-spec §3.2.2,
 * §3.13, §8.28).
 *
 * The whole game is one storybook, so a scene change TURNS A PAGE. The frame
 * that is leaving is photographed, the new scene is switched in underneath it
 * at once, and the photograph is then swung away about the book's spine (the
 * left edge): it narrows as it turns edge-on, bowing a little the way paper
 * does, with its lit edge, its own shading and the shadow it casts on the
 * page underneath. A paper swish plays with it.
 *
 * The SNAPSHOT is what makes this one cheap draw instead of two live scenes:
 * no scene has to be able to render into a corner of the screen, and nothing
 * about the scenes themselves changes. It is taken in the draw, from the
 * fully drawn old frame — which is also the moment the scene is switched, so
 * everything the turn reveals is already the new scene.
 *
 * Reduced motion (§3.11) keeps the old behaviour: a dip through the paper
 * colour, no movement. So does a browser that will not give us a snapshot.
 *
 * Input is held for the whole turn (`fading()`), and only one runs at a time:
 * a second request during one is queued, never dropped, so a fast player
 * cannot strand the flow.
 */
import { reducedMotion } from '@/use/useAccessibility'
import { flowHud } from '@/use/useFlow'
import { sfx } from '@/game/duel/audio'
import { clamp, sin, PI } from '@/game/duel/util'
import { shadeTurn, turnAngle, turnWidth } from '@/game/flow/pageTurn'

/** §3.13's numbers: page-turn 450 ms, zoom 400 ms, node push-in 250 ms. */
export const DIP_PAGE = 0.45
export const DIP_ZOOM = 0.4
export const DIP_PUSH = 0.25

const PAPER = '#fff4e6'
/** Strips the turning page is drawn in: enough for its bow to read smooth. */
const STRIPS = 40

let t = -1
let dur = DIP_PAGE
let mid: (() => void) | null = null
const queue: { fn: () => void; dur: number }[] = []

/** The frame that is leaving, and whether it was captured this turn. */
let snap: HTMLCanvasElement | null = null
let snapped = false

/** Dip to paper, run `fn` at the midpoint, dip back in. */
export const dipTo = (fn: () => void, seconds = DIP_PAGE): void => {
  if (t >= 0) {
    queue.push({ fn, dur: seconds })
    return
  }
  t = 0
  dur = seconds
  mid = fn
  snapped = false
  // The scene's DOM chrome steps aside for the page (see `useFlow`).
  flowHud.turning = true
  if (!reducedMotion.value) sfx('page')
}

export const fading = (): boolean => t >= 0

/** Advance by `dt` seconds (only while the game is not paused). */
export const stepTransition = (dt: number): void => {
  if (t < 0) return
  t += dt
  // The switch normally happens in the draw, with the snapshot. This is the
  // safety net for a frame that never draws (a headless flush, a hidden tab):
  // the flow must never stall on a page that is not being turned.
  if (mid && t >= dur / 2) {
    const m = mid
    mid = null
    m()
  }
  if (t >= dur) {
    t = -1
    snapped = false
    flowHud.turning = false
    const next = queue.shift()
    if (next) dipTo(next.fn, next.dur)
  }
}

/** Photograph the frame that is leaving. False if this canvas will not give
 *  it to us, which drops the turn back to a paper dip. */
const photograph = (g: CanvasRenderingContext2D): boolean => {
  const cv = g.canvas
  if (!cv.width || !cv.height) return false
  try {
    if (!snap) snap = document.createElement('canvas')
    if (snap.width !== cv.width || snap.height !== cv.height) {
      snap.width = cv.width
      snap.height = cv.height
    }
    const s = snap.getContext('2d')
    if (!s) return false
    s.setTransform(1, 0, 0, 1, 0, 0)
    s.globalAlpha = 1
    s.globalCompositeOperation = 'copy'
    s.drawImage(cv, 0, 0)
    s.globalCompositeOperation = 'source-over'
    return true
  } catch {
    return false
  }
}

/** The paper dip: the fallback, and what reduced motion always gets. */
const drawDip = (g: CanvasRenderingContext2D): void => {
  const k = t / dur
  const a = k < 0.5 ? k * 2 : 2 - k * 2
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.globalAlpha = Math.max(0, Math.min(1, a * a * (3 - 2 * a)))
  g.fillStyle = PAPER
  g.fillRect(0, 0, g.canvas.width, g.canvas.height)
  g.globalAlpha = 1
}

/**
 * The turning page, in device pixels: the old frame swung about the spine at
 * the left edge, from flat (its full width) to edge-on (nothing).
 */
const drawPage = (g: CanvasRenderingContext2D, p: number): void => {
  const img = snap!
  const W = g.canvas.width
  const H = g.canvas.height
  const a = turnAngle(p)
  const w = turnWidth(p) * W
  if (w < 1) return
  // Paper bows as it lifts, so the strips are not a flat squeeze.
  const bow = sin(a) * 0.035
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.globalAlpha = 1
  for (let i = 0; i < STRIPS; i++) {
    const u0 = i / STRIPS
    const u1 = (i + 1) / STRIPS
    const k = bow * sin(((u0 + u1) / 2) * PI)
    g.drawImage(
      img,
      u0 * W, 0, (u1 - u0) * W, H,
      u0 * w, -H * k * 0.5, (u1 - u0) * w + 1, H * (1 + k)
    )
  }
  shadeTurn(g, 0, 0, w, H, a)
}

/** Paint the turn over whatever the frame drew. Device-pixel space. */
export const drawTransition = (g: CanvasRenderingContext2D): void => {
  if (t < 0) return
  if (reducedMotion.value) {
    drawDip(g)
    return
  }
  // The first drawn frame of a turn: photograph the old scene, then switch
  // to the new one underneath it.
  if (!snapped) {
    snapped = photograph(g)
    if (!snapped) {
      drawDip(g)
      return
    }
    if (mid) {
      const m = mid
      mid = null
      m()
    }
  }
  drawPage(g, clamp(t / dur, 0, 1))
}

/** Test/QA seam: finish any turn at once, running its midpoint. */
export const __flushTransition = (): void => {
  while (t >= 0) stepTransition(1)
}
