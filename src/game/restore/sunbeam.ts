/**
 * sunbeam.ts — the Sunbeam, the boss chest's tool (story-spec §8.4, §7.5).
 *
 * Not a scrubber — a conductor. AIM: press where the light should start and
 * pull back, slingshot-style; the beam will fly the OTHER way, and a dotted
 * guide shows where. The pull is capped at 30 % of the view's short side, so
 * a small hand can't over-draw it. RELEASE: the beam travels in a straight
 * band from the press point to the sector's edge, clearing everything it
 * crosses in one pass (no dwell, no speed response). Then it RECHARGES for a
 * moment — light gathering back into the tool — before the next shot, so the
 * player is never left with nothing happening.
 *
 * Sizes are in sector units (SU). The boss sector is 4× a standard one's area
 * (§8.14); these numbers clear its 85 % in ~13–15 sweeps of ~3 s each — the
 * ~45 s target (§7.5's back-solve, measured by `tests/restore/sunbeamTiming`).
 *
 * Pure: no canvas. `onStamp` receives each stamp of the band, like the brush's.
 */
import type { StampFn } from '@/game/restore/brush'
import { SEC_W, SEC_H } from '@/game/restore/mask'

/** The band's width, SU. */
export const BEAM_W = 92
/** Travel speed, SU per second. */
export const BEAM_SPEED = 980
/** The recharge between shots, seconds (the gather beat). */
export const BEAM_RECHARGE = 0.6
/** A pull shorter than this share of the max is a tap, not a shot. */
export const MIN_PULL = 0.15
/** Stamps laid along the band, as a share of its width. */
const SPACING = 0.3

export type BeamState = 'ready' | 'aiming' | 'firing' | 'recharge'

export class Sunbeam {
  state: BeamState = 'ready'
  /** Where the beam starts, SU. */
  ox = 0
  oy = 0
  /** Unit heading of the shot. */
  dx = 1
  dy = 0
  /** 0..1 of the max pull. */
  pull = 0
  /** How far the beam has travelled, and how far it will go, SU. */
  at = 0
  len = 0
  /** Seconds left in the recharge. */
  wait = 0
  sweeps = 0
  private laid = 0

  /** `maxPull` is the cap in SU (30 % of the view's short side). */
  constructor (public maxPull: number) {}

  aim (x: number, y: number): boolean {
    if (this.state !== 'ready') return false
    this.state = 'aiming'
    this.ox = x
    this.oy = y
    this.pull = 0
    return true
  }

  drag (x: number, y: number): void {
    if (this.state !== 'aiming') return
    const vx = this.ox - x
    const vy = this.oy - y
    const d = Math.hypot(vx, vy)
    this.pull = Math.min(1, d / this.maxPull)
    if (d > 1) {
      this.dx = vx / d
      this.dy = vy / d
    }
  }

  /** Let go: fire if the pull was a real one. Returns whether it fired. */
  release (): boolean {
    if (this.state !== 'aiming') return false
    if (this.pull < MIN_PULL) {
      this.state = 'ready'
      return false
    }
    this.state = 'firing'
    this.at = 0
    this.laid = 0
    this.len = exitDistance(this.ox, this.oy, this.dx, this.dy) + BEAM_W * 0.5
    this.sweeps++
    return true
  }

  /** Advance the beam; lays its stamps. Returns true on the frame it lands. */
  step (dt: number, t: number, onStamp: StampFn): boolean {
    if (this.state === 'recharge') {
      this.wait -= dt
      if (this.wait <= 0) this.state = 'ready'
      return false
    }
    if (this.state !== 'firing') return false
    this.at = Math.min(this.len, this.at + BEAM_SPEED * dt)
    const step = BEAM_W * SPACING
    while (this.laid <= this.at) {
      const x = this.ox + this.dx * this.laid
      const y = this.oy + this.dy * this.laid
      onStamp(x, y, BEAM_W * 0.62, 0.8, 1, 0, t)
      this.laid += step
    }
    if (this.at >= this.len) {
      this.state = 'recharge'
      this.wait = BEAM_RECHARGE
      return true
    }
    return false
  }

  /** Drop whatever it was doing (the reveal took over, or the scene ended). */
  stop (): void {
    this.state = 'ready'
    this.pull = 0
  }

  /** 0 right after a shot … 1 ready again. */
  charge (): number {
    if (this.state === 'recharge') return 1 - Math.max(0, this.wait) / BEAM_RECHARGE
    return this.state === 'firing' ? 0 : 1
  }

  /** The beam's head, SU. */
  head (): [number, number] {
    return [this.ox + this.dx * this.at, this.oy + this.dy * this.at]
  }

  /** The end of the guide line while aiming, SU. */
  guideEnd (): [number, number] {
    const d = exitDistance(this.ox, this.oy, this.dx, this.dy)
    return [this.ox + this.dx * d, this.oy + this.dy * d]
  }
}

/** Distance from (x, y) along (dx, dy) to the sector's edge. */
export const exitDistance = (x: number, y: number, dx: number, dy: number): number => {
  let t = Infinity
  if (dx > 1e-6) t = Math.min(t, (SEC_W - x) / dx)
  if (dx < -1e-6) t = Math.min(t, -x / dx)
  if (dy > 1e-6) t = Math.min(t, (SEC_H - y) / dy)
  if (dy < -1e-6) t = Math.min(t, -y / dy)
  return Number.isFinite(t) ? Math.max(0, t) : 0
}
