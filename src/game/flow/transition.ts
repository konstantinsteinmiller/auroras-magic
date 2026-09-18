/**
 * flow/transition.ts — the page-turn between scenes (story-spec §3.2.2, §3.13).
 *
 * A scene change dips through the storybook's paper colour: out for half the
 * beat, the switch at the midpoint (under full paper, so no half-drawn frame
 * of either scene is ever seen), back in for the other half. Input is held
 * for the whole length. The app root steps and draws it from its one RAF.
 *
 * Only one dip runs at a time. A second request during a dip is queued to run
 * right after it, never dropped, so a fast player can't strand the flow.
 */

/** §3.13's numbers: page-turn 450 ms, zoom 400 ms, node push-in 250 ms. */
export const DIP_PAGE = 0.45
export const DIP_ZOOM = 0.4
export const DIP_PUSH = 0.25

const PAPER = '#fff4e6'

let t = -1
let dur = DIP_PAGE
let mid: (() => void) | null = null
const queue: { fn: () => void; dur: number }[] = []

/** Dip to paper, run `fn` at the midpoint, dip back in. */
export const dipTo = (fn: () => void, seconds = DIP_PAGE): void => {
  if (t >= 0) {
    queue.push({ fn, dur: seconds })
    return
  }
  t = 0
  dur = seconds
  mid = fn
}

export const fading = (): boolean => t >= 0

/** Advance by `dt` seconds (only while the game is not paused). */
export const stepTransition = (dt: number): void => {
  if (t < 0) return
  t += dt
  if (mid && t >= dur / 2) {
    const m = mid
    mid = null
    m()
  }
  if (t >= dur) {
    t = -1
    const next = queue.shift()
    if (next) dipTo(next.fn, next.dur)
  }
}

/** Paint the paper over whatever the frame drew. Device-pixel space. */
export const drawTransition = (g: CanvasRenderingContext2D): void => {
  if (t < 0) return
  const k = t / dur
  const a = k < 0.5 ? k * 2 : 2 - k * 2
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.globalAlpha = Math.max(0, Math.min(1, a * a * (3 - 2 * a)))
  g.fillStyle = PAPER
  g.fillRect(0, 0, g.canvas.width, g.canvas.height)
  g.globalAlpha = 1
}

/** Test/QA seam: finish any dip at once, running its midpoint. */
export const __flushTransition = (): void => {
  while (t >= 0) stepTransition(1)
}
