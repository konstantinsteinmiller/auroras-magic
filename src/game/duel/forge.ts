/**
 * forge.ts — THE SPELL FORGE's clock and paths (story-spec §8.37). Pure data
 * and pure maths: no canvas, no DOM, no state writes.
 *
 * The owner (2026-09-24): *"the consumed runes are forging together into one
 * spell flowing from the rune slots into the unicorn's horn, which now glows
 * in the main spell's color … a full 1.5 seconds of spell release delay."*
 * The blind playtest's four testers all said the foe's hits "come from
 * nowhere": the old 0.75 s wind-up was too short to register. So EVERY cast,
 * on both sides, is now the same picture, in four beats — 1.5 s for a spell
 * that hits (and a decoy):
 *
 *   LIFT   0.00–0.24 s  the runes pop up out of their slots (the slots empty)
 *   FLY    0.24–0.84 s  each flies on its own curve, in its own colour, and
 *                       they meet: one orb, the spell's main colour
 *   FLOW   0.84–1.17 s  the orb flows down into the horn
 *   SWELL  1.17–1.50 s  the horn glows in that colour, swelling — and at
 *                       1.5 s the spell leaves (`sim.launch`, unchanged)
 *
 * A WARD SNAPS UP (owner, 2026-09-24, after blind playtest run 3: *"Walls and
 * barriers are faster, 0.4 s."*). A wall raised in answer to a 1.5 s forge
 * used to rise after the spell it answered had landed — "I blocked but still
 * lost health", "you can never defend". Every ward (`kind` 2: earth wall, wind
 * wall, ice pillar, bubble, Crystal Ward, Frost Lock's wall) now forges in
 * `WARD_FORGE_S`, on both sides: the same four beats, compressed in
 * proportion (lift 0.06, fly 0.22, flow 0.31, swell 0.4 s) — it still visibly
 * forges, just fast. `forgeDuration(kind)` is the one place that says which.
 *
 * THREE readers, one clock: the sim (`sim.stepForge` — when the spell leaves),
 * the canvas (`forgeArt.ts` — the orb and the horn) and the DOM overlay
 * (`SpellForge.vue` — the runes leaving the slots, which ARE DOM). They all
 * read the beats and the paths from here, so the rune the child watches
 * leave a slot arrives where the orb is born, and the orb goes into exactly
 * the point the spell leaves from.
 *
 * Coordinates are stage units (1280x720).
 */
import { AX, UX, GY, HDX, HDY } from '@/game/duel/config'
import { clamp } from '@/game/duel/util'

/**
 * The whole release, seconds: pressing CAST to the spell leaving the horn —
 * for every spell that HITS, and for a decoy (a decoy is not a barrier). A
 * WARD takes `WARD_FORGE_S` instead; ask `forgeDuration(kind)`, never this,
 * wherever the kind is known.
 */
export const FORGE_S = 1.5

/**
 * A WARD's release, seconds (owner, 2026-09-24: *"Walls and barriers are
 * faster, 0.4 s."*). Short enough that a wall started in answer to a foe's
 * 1.5 s forge stands before her spell lands — the reactive block that only
 * lesson 1 (which holds her spell at the horn) could teach before.
 */
export const WARD_FORGE_S = 0.4

/** The spell kind that is a ward (`config.SpellKind` 2, `sim.guardKind`). */
const WARD_KIND = 2

/** How long a spell of `kind` forges, seconds: a ward snaps up in
 *  `WARD_FORGE_S`; an attack and a decoy take the full `FORGE_S`. */
export const forgeDuration = (kind: number): number => (kind === WARD_KIND ? WARD_FORGE_S : FORGE_S)

/** How far through its forge a side is, 0..1 (0 when it is not forging) —
 *  the one progress every reader draws from (`Forge.t` over its own length). */
export const forgeProgress = (f: { readonly t: number; readonly kind: number }): number =>
  f.t >= 0 ? clamp(f.t / forgeDuration(f.kind), 0, 1) : 0

/** The beats' ENDS, as fractions of the forge's length (the swell ends at 1). */
export const BEAT = {
  lift: 0.16,
  fly: 0.56,
  flow: 0.78
} as const

/** Where a duelist's horn is, stage units — the very point a spell leaves
 *  from (`sim.hornX`, `HORN_Y`). `e` = the right-hand duelist. */
export const hornX = (e: boolean): number => (e ? UX - HDX : AX + HDX)
export const HORN_Y = GY + HDY

/**
 * Where the runes MEET, stage units: above and outside the caster's horn, on
 * the slots' side of her — inside the picture in both orientations (portrait
 * shows stage x 280..1000 from y 120, `layout.PORTRAIT_WIN`), so the orb is
 * born on the page, never on the HUD band.
 */
export const MERGE_DX = 72
export const MERGE_DY = -132
export const mergeX = (e: boolean): number => hornX(e) + (e ? MERGE_DX : -MERGE_DX)
export const MERGE_Y = HORN_Y + MERGE_DY

/** How high a rune pops up out of its slot, stage units, before it flies. */
export const LIFT_H = 26

/** Smooth in and out. */
const smooth = (k: number): number => k * k * (3 - 2 * k)
/** Out with a small overshoot: the pop. */
const backOut = (k: number): number => {
  const c = 1.9
  const m = k - 1
  return 1 + (c + 1) * m * m * m + c * m * m
}

/** Progress through a beat: 0 before it starts, 1 once it has ended. */
export const beat = (u: number, from: number, to: number): number => clamp((u - from) / (to - from), 0, 1)

/**
 * One flying rune at forge progress `u` (0..1, `forgeProgress`): where it is, how
 * big (× its size in the slot) and how visible, written into `out` (no
 * allocation). `i` is its slot, `n` how many runes the forge took, (sx, sy)
 * its slot's centre and `e` the side — all stage units.
 *
 * It pops up, then flies on a curve bowed away from the others (the middle
 * one straightest), accelerating as it is drawn in, shrinking to a spark as it
 * arrives: the runes of one spell meet on the same frame, however far apart
 * their slots are. Under reduced motion it does not move at all: it fades
 * where it stands, on the same clock (`still`).
 */
export const runeAt = (
  u: number, i: number, n: number, sx: number, sy: number, e: boolean, still: boolean,
  out: { x: number; y: number; s: number; a: number }
): void => {
  if (still) {
    out.x = sx
    out.y = sy
    out.s = 1
    out.a = 1 - beat(u, 0, BEAT.fly)
    return
  }
  const lift = backOut(beat(u, 0, BEAT.lift))
  const ly = sy - LIFT_H * lift
  if (u <= BEAT.lift) {
    out.x = sx
    out.y = ly
    out.s = 1 + 0.18 * lift
    out.a = 1
    return
  }
  // Each rune sets off a hair after the one before it — a ripple along the
  // row — and all of them arrive together.
  const start = BEAT.lift + 0.035 * i
  const k = beat(u, start, BEAT.fly)
  const f = k * k * (1.6 - 0.6 * k) // drawn in: slow away, fast home
  const mx = mergeX(e)
  const my = MERGE_Y
  // The control point: half-way, bowed out to the side facing the middle of
  // the duel (up and in, from a landscape corner; in, from the portrait
  // band), and bowed further the later the rune's slot — so three runes fly
  // three nested curves instead of one line.
  const dx = mx - sx
  const dy = my - ly
  const len = Math.hypot(dx, dy) || 1
  const nx = (e ? -dy : dy) / len
  const ny = (e ? dx : -dx) / len
  const bow = 40 + 22 * (i - (n - 1) / 2)
  const cx = (sx + mx) / 2 + nx * bow
  const cy = (ly + my) / 2 + ny * bow
  const w = 1 - f
  out.x = w * w * sx + 2 * w * f * cx + f * f * mx
  out.y = w * w * ly + 2 * w * f * cy + f * f * my
  // Big and bright the whole way — which rune it is has to be legible in
  // flight — and only in the last stretch squeezed into the meeting point.
  out.s = 1.18 + 0.12 * Math.sin(Math.PI * Math.min(1, k / 0.7)) - 0.78 * smooth(beat(k, 0.7, 1))
  out.a = k < 0.92 ? 1 : 1 - (k - 0.92) / 0.08
}

/** The orb's radius as it is born, stage units — a heavy's own body size
 *  (`spellArt.bodyRadius`), so it reads as the spell, not as a spark. */
export const ORB_R = 30

/**
 * The ORB at forge progress `u`: where it is and its radius (0 = not there),
 * into `out`. Born at the meeting point as the runes arrive, it flows down
 * into the horn and shrinks into its tip. Under reduced motion there is no
 * orb — the slots cross-fade straight to the horn's glow.
 */
export const orbAt = (u: number, e: boolean, still: boolean, out: { x: number; y: number; r: number }): void => {
  out.r = 0
  if (still || u < BEAT.fly - 0.05 || u >= BEAT.flow) {
    out.x = hornX(e)
    out.y = HORN_Y
    return
  }
  const born = beat(u, BEAT.fly - 0.05, BEAT.fly + 0.03)
  const k = smooth(beat(u, BEAT.fly, BEAT.flow))
  const mx = mergeX(e)
  const hx = hornX(e)
  // A shallow arc over the top, so it pours in rather than slides.
  const cx = (mx + hx) / 2
  const cy = Math.min(MERGE_Y, HORN_Y) - 30
  const w = 1 - k
  out.x = w * w * mx + 2 * w * k * cx + k * k * hx
  out.y = w * w * MERGE_Y + 2 * w * k * cy + k * k * HORN_Y
  out.r = ORB_R * backOut(born) * (1 - 0.6 * k)
}

/**
 * How brightly the horn glows at forge progress `u`, 0..1: nothing until the
 * orb reaches it, then swelling to full at the release. Under reduced motion
 * it fades in from the moment the runes start to leave, so the cross-fade
 * from the slots to the horn takes the forge's own length (1.5 s, a ward's
 * 0.4 s) — the release is never later for a child who asked for less motion.
 */
export const hornGlow = (u: number, still: boolean): number =>
  still ? smooth(beat(u, 0.1, 1)) : smooth(beat(u, BEAT.flow - 0.06, 1))
