/**
 * map/twinGift.ts — the Twin Gift on the map, and the press-and-hold that
 * opens it (story-spec §3.3.4, §8.2–§8.3, §8.8.5).
 *
 * The OFFER (which sector, whether an ad is really there, the claim) is
 * `useDuelRewards.ts`. This module is its body on the map: the gift beside
 * the just-restored sector, its shimmer, and the hold —
 *
 *   • press and HOLD 1.2 s: a ring fills clockwise around the gift, and the
 *     bow loosens at 25 / 50 / 75 / 100 %, one soft tick each;
 *   • let go early (or move more than 12 px — the DOM button owns that): the
 *     ring recedes and the bow re-ties over 200 ms. No error, no buzz;
 *   • complete: a 250 ms silver-and-gold burst, then the ad through
 *     `claimTwinGift`; on success the sector blooms and the map celebrates it.
 *
 * The hold runs on the scene's `dt`, like every other timer, so an ad or a
 * hidden tab stops it where it is. The gift draws into the one canvas; the
 * accessible hold target is a DOM button in `MapScene.vue` laid over it.
 */
import { twinGift, rewardLive, claimTwinGift, TWIN_HOLD_MS } from '@/use/useDuelRewards'
import { drawTwinGift } from '@/game/restore/gift'
import { twinBurst } from '@/game/duel/fx'
import { sfx } from '@/game/duel/audio'
import { haptic } from '@/use/useHaptics'
import { clamp, sin, TAU, PI } from '@/game/duel/util'
import { drawItem } from '@/game/artItem'
import { TWINKLE_ART } from '@/game/map/kit'

type G2D = CanvasRenderingContext2D

const HOLD_S = TWIN_HOLD_MS / 1000
/** The bow re-ties this fast after an early release (§8.3). */
const RETIE_S = 0.2
/** The burst plays before the ad opens. */
const BURST_S = 0.25
/** The idle shimmer's period (§8.2): opacity 0.85 → 1 → 0.85. */
const SHIMMER_S = 1.1

let holding = false
let hold = 0
let ribbon = 0
let burstT = -1
let claiming = false
let lastStep = 0
let burstAt: [number, number] = [0, 0]

/** Is the Twin Gift on the map right now? */
export const twinShown = (): boolean => twinGift.node >= 0 && (rewardLive.value || claiming)

/** The hold began (the DOM button's pointerdown / key down). */
export const twinHoldStart = (): void => {
  if (!twinShown() || claiming || burstT >= 0) return
  holding = true
  lastStep = 0
}

/** The hold ended early — released, or the finger wandered off. */
export const twinHoldCancel = (): void => {
  if (!holding) return
  holding = false
  hold = 0
  lastStep = 0
}

/** 0..1 of the hold (the ring, and the DOM's aria-valuenow). */
export const twinHold01 = (): number => hold

/** One frame. `at` is where the gift stands on screen (CSS px). */
export const stepTwin = (dt: number, at: [number, number, number] | null): void => {
  if (burstT >= 0) {
    burstT += dt
    if (burstT >= BURST_S) {
      burstT = -1
      claiming = true
      void claimTwinGift().finally(() => {
        claiming = false
        hold = 0
        ribbon = 0
      })
    }
    return
  }
  if (holding) {
    if (!twinShown()) {
      twinHoldCancel()
      return
    }
    hold = Math.min(1, hold + dt / HOLD_S)
    // The bow loosens in four steps, each with a soft tick.
    const step = Math.floor(hold * 4 + 1e-6)
    if (step > lastStep) {
      lastStep = step
      if (step < 4) {
        sfx('chime', step + 1)
        haptic('tick')
      }
    }
    ribbon += (step / 4 - ribbon) * (1 - Math.exp(-dt * 30))
    if (hold >= 1) {
      holding = false
      burstT = 0
      if (at) {
        burstAt = [at[0], at[1] - at[2] * 0.45]
        twinBurst(burstAt[0], burstAt[1], 1)
      }
      sfx('unbox')
      haptic('reward')
    }
  } else if (!claiming) {
    ribbon = Math.max(0, ribbon - dt / RETIE_S)
    hold = Math.max(0, hold - dt / RETIE_S)
  }
}

/** The gift, its shimmer, and the hold ring. */
export const drawTwin = (g: G2D, x: number, y: number, s: number, t: number): void => {
  if (!twinShown() || burstT >= 0 || claiming) return
  // No idle shake — it is never confused with the tap-to-open gift. A slow
  // shimmer instead, and a sparkle crossing it now and then.
  const k = 0.5 - 0.5 * Math.cos((t / SHIMMER_S) * TAU)
  g.save()
  g.globalAlpha = 0.85 + 0.15 * k
  const glow = g.createRadialGradient(x, y - s * 0.4, 2, x, y - s * 0.4, s * 1.1)
  glow.addColorStop(0, `rgba(255, 240, 200, ${0.35 + 0.25 * k})`)
  glow.addColorStop(1, 'rgba(255, 240, 200, 0)')
  g.fillStyle = glow
  g.fillRect(x - s * 1.1, y - s * 1.5, s * 2.2, s * 2.2)
  drawTwinGift(g, x, y, s, ribbon)
  g.restore()
  // The ring: clockwise from 12 o'clock, in step with the hold.
  if (hold > 0.001) {
    const r = s * 0.78
    const cy = y - s * 0.4
    g.save()
    g.lineCap = 'round'
    g.beginPath()
    g.arc(x, cy, r, 0, TAU)
    g.lineWidth = Math.max(5, s * 0.1)
    g.strokeStyle = 'rgba(58, 35, 64, 0.45)'
    g.stroke()
    g.beginPath()
    g.arc(x, cy, r, -PI / 2, -PI / 2 + hold * TAU)
    g.lineWidth = Math.max(4, s * 0.075)
    g.strokeStyle = '#ffd36b'
    g.stroke()
    g.restore()
  }
  // A glint drifting across the lid.
  const gx = x + s * 0.4 * sin(t * 0.9)
  const gy = y - s * 0.62
  const gr = s * 0.07 * (0.6 + 0.4 * k)
  g.save()
  g.translate(gx, gy)
  g.rotate(t)
  // The shared painted twinkle once it has landed (B8), turning as this one
  // does; the drawing's own straight-edged star otherwise.
  g.globalAlpha = 0.9
  if (drawItem(g, TWINKLE_ART, gr, 0, '#ffffff')) {
    g.restore()
    return
  }
  g.beginPath()
  for (let i = 0; i < 8; i++) {
    const a = (i * PI) / 4
    const rr = i & 1 ? gr * 0.35 : gr
    if (i) g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
    else g.moveTo(rr, 0)
  }
  g.closePath()
  g.fillStyle = '#ffffff'
  g.globalAlpha = 0.9
  g.fill()
  g.restore()
}

/** Test seam. */
export const __resetTwin = (): void => {
  holding = claiming = false
  hold = ribbon = 0
  burstT = -1
  lastStep = 0
}

/** QA: where the hold is. */
export const __twinState = (): { holding: boolean; hold: number; claiming: boolean; burst: boolean } =>
  ({ holding, hold: clamp(hold, 0, 1), claiming, burst: burstT >= 0 })
