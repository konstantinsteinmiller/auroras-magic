/**
 * renderScale.ts — how many pixels the game canvas has, and the controller
 * that takes them away from a phone that cannot fill them.
 *
 * ── THE MEASUREMENT THIS FILE IS BUILT ON (2026-09-24, PERF-LEDGER.md) ──
 *
 * A moto e(7i) power (PowerVR GE8322, 2 GB, Android 10 Go, DPR 1.75) played
 * the duel at 2–7 fps. The duel is not busy — it is WIDE: the cloth, the
 * page, the sky's wash, the clouds, the island and the vignette are each a
 * full-screen layer, laid every frame. On a software-raster proxy of that
 * phone (Chrome `--disable-gpu`, CPU ×10, 914 × 411 @ 1.75) the canvas's own
 * raster was ~58 % of the main thread and the game's script ~17 %; the tier-0
 * thrift the quality controller already falls to cuts SHAPES (cel bands,
 * hair locks), which a fill-bound device never notices. The lever it answers
 * to is the number of pixels: the same proxy at DPR 1 went from 30 to 60 fps.
 *
 * So the canvas's backing ratio is no longer a constant. It is the device's
 * ratio under a CAP, and the cap is this file's to lower:
 *
 *   • LIVE, DOWNWARD ONLY. Once the quality tier is already at 0 (the cheap
 *     cuts are spent) and the median frame interval is still slower than
 *     `SLOW` over two windows in a row, the cap drops — in ONE jump sized from the measured
 *     shortfall, since cost is at most proportional to area. Never raised in
 *     the same session: a resolution that breathes is a picture that pops.
 *   • REMEMBERED. The cap a device settled on is stored, so the next boot
 *     starts there instead of spending its first seconds as a slideshow.
 *   • EARNED BACK, ACROSS BOOTS. A session that holds a full-speed frame at
 *     its cap for `EARN` seconds stores one notch sharper for the NEXT boot —
 *     a phone that was hot or busy once is not blurred forever. Never live.
 *
 * The ONLY writer of the cap. `AppScene.resize` reads it through
 * `backingDpr()`, and every scene already draws through `S.dpr`, so a new cap
 * is one resize away from every renderer.
 */
import { S } from '@/game/duel/state'
import { safeGetItem, safeSetItem } from '@/utils/safeStorage'
import { track } from '@/use/useAnalytics'

const KEY = 'am.renderCap'
/** The cap every device had before this file: a 3x phone rasterised at 2. */
export const CEIL = 2
/**
 * The lowest the controller goes. At 0.7 a canvas pixel is ~2.5 of a 1.75
 * phone's — soft, and still a duel a child can read. Below it the runes
 * themselves blur, and a device that needs more than this is short of
 * something the resolution cannot give back.
 */
export const FLOOR = 0.7
/**
 * A window whose MEDIAN interval is slower than this is a device that needs
 * pixels taken away. Between the 33.3 and 50 ms vsync steps of a 60 Hz panel:
 * a steady 30 fps is left alone, and anything that misses it most of the time
 * is not.
 */
export const SLOW = 0.04
/**
 * Slow windows in a row before a drop. The boot's own stalls drop even a
 * desktop to tier 0 for a moment (PERF-LEDGER E1); one bad window must not be
 * able to blur a strong machine, and a store makes that mistake outlive the
 * session. A phone that genuinely cannot fill its screen fails both.
 */
const STRIKES = 2
/** What a drop aims for: the frame a 60 Hz panel shows at 30 fps. */
const TARGET = 1 / 30
/** Seconds of frames, and the fewest frames, one judgement is made on. */
export const WINDOW = 1.2
const MIN_FRAMES = 6
/**
 * Seconds ignored after a drop, and after every change of scene. The resize
 * re-bakes the arena and the map at the new scale, a new scene bakes its own
 * surfaces and decodes its paintings, and the frames right after either pay
 * for the uploads — a window that saw them would read a one-off as the
 * device, and drop again.
 */
export const SETTLE = 2
/** A window at or under this median is a device holding 60 on a 60 Hz panel. */
const GOOD = 0.0185
/** Seconds of GOOD windows, at a cap below `CEIL`, that earn the next boot one
 *  notch sharper. */
export const EARN = 20
/** One notch: ~30 % fewer pixels going down, the same back going up. */
const NOTCH = 1.2
/**
 * The first cap a device gets when nothing is stored. A reported 2 GB or less
 * is the low-end Android class (the moto above; Chrome reports `deviceMemory`
 * rounded down), and starting it at 1 spares a first session the slideshow
 * the controller would otherwise need a few seconds to measure its way out of.
 * Everything else starts at the old ceiling and is measured.
 */
const LOW_MEMORY_GB = 2
const LOW_MEMORY_CAP = 1

const round = (v: number): number => Math.round(v * 100) / 100
const valid = (v: number): boolean => Number.isFinite(v) && v >= FLOOR && v <= CEIL

const firstCap = (): number => {
  const stored = Number.parseFloat(safeGetItem(KEY) ?? '')
  if (valid(stored)) return stored
  const mem = typeof navigator !== 'undefined' ? (navigator as { deviceMemory?: number }).deviceMemory : undefined
  return typeof mem === 'number' && mem > 0 && mem <= LOW_MEMORY_GB ? LOW_MEMORY_CAP : CEIL
}

let cap = firstCap()
/** Whether this session already stored a sharper cap for the next boot. */
let earned = false
let settle = 0
let strikes = 0
let good = 0
let lastScene = ''
const win = new Float32Array(64)
let n = 0
let span = 0

const deviceRatio = (): number =>
  typeof window !== 'undefined' && window.devicePixelRatio > 0 ? window.devicePixelRatio : 1

/** The canvas's backing ratio: the device's own, under the cap. */
export const backingDpr = (): number => Math.min(deviceRatio(), cap)

/** The cap in force (for the perf meter and the tests). */
export const renderCap = (): number => cap

const median = (): number => {
  // Insertion sort of at most 64 floats, once per window — not per frame.
  for (let i = 1; i < n; i++) {
    const v = win[i]!
    let j = i - 1
    while (j >= 0 && win[j]! > v) { win[j + 1] = win[j]!; j-- }
    win[j + 1] = v
  }
  return n & 1 ? win[n >> 1]! : (win[(n >> 1) - 1]! + win[n >> 1]!) / 2
}

/**
 * One frame of the controller. `raw` is this frame's interval in seconds;
 * `measuring` is false while the frame is no evidence about the device (the
 * game is paused under an ad or a menu, the tab is hidden, the boot is still
 * loading, a page is turning). `scene` is the scene being drawn. Returns true
 * when the cap dropped — the caller then resizes the canvas.
 */
export const stepRenderScale = (raw: number, measuring: boolean, scene: string): boolean => {
  if (scene !== lastScene) {
    lastScene = scene
    settle = SETTLE
    strikes = 0
    n = 0
    span = 0
  }
  if (!measuring) {
    n = 0
    span = 0
    return false
  }
  // A stall this long is a tab coming back or a scene loading, not a frame.
  const f = Math.min(raw, 0.5)
  if (settle > 0) {
    settle -= f
    return false
  }
  if (n < win.length) win[n++] = f
  span += f
  if (span < WINDOW || n < MIN_FRAMES) return false
  const m = median()
  const seen = span
  n = 0
  span = 0

  const eff = backingDpr()
  strikes = m > SLOW && S.q === 0 && eff > FLOOR ? strikes + 1 : 0
  if (strikes >= STRIKES) {
    // Cost is at most proportional to area, so the area has to shrink by at
    // least the shortfall: the ratio by its square root. Fixed costs (script,
    // compositing) do not shrink with it, so this never overshoots — and a
    // drop is always at least one notch, so a device just over the line moves.
    const want = eff * Math.sqrt(TARGET / m)
    cap = round(Math.max(FLOOR, Math.min(want, eff / NOTCH)))
    safeSetItem(KEY, String(cap))
    settle = SETTLE
    strikes = 0
    good = 0
    track('render_scale', { cap, from: round(eff), medianMs: Math.round(m * 1000) })
    return true
  }

  if (m <= GOOD) {
    good += seen
    if (!earned && good >= EARN && cap < CEIL) {
      earned = true
      safeSetItem(KEY, String(round(Math.min(CEIL, cap * NOTCH))))
    }
  } else good = 0
  return false
}

/** Test seam: forget the session, and start from `start` (or what a fresh
 *  boot would pick). Never called by the game — one boot is one session. */
export const __resetRenderScale = (start?: number): void => {
  cap = start ?? firstCap()
  earned = false
  settle = 0
  strikes = 0
  good = 0
  lastScene = ''
  n = 0
  span = 0
}
