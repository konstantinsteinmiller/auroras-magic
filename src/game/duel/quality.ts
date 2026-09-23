/**
 * quality.ts — the adaptive quality controller. One function, called once a
 * frame from `views/AppScene.vue`, and the ONLY writer of `S.q` and `S.qx`.
 *
 * Three tiers — 0 thrift, 1 the authored look, 2 sparkle (retention-roadmap
 * item 17). `duel/state.ts` says what each one means to a renderer.
 *
 * ── THE MEASUREMENT THIS FILE IS BUILT ON (2026-09-23, PERF-LEDGER.md) ──
 *
 * The controller used to read one signal, the smoothed frame INTERVAL:
 *
 *     if (S.fdt > 0.024 && S.q > 0) S.q = 0
 *     else if (S.fdt < 0.015 && S.q < 1) S.q = 1
 *
 * A 60 Hz panel reports 16.7 ms per frame whether the frame cost 0.7 ms or
 * 15 ms. So `fdt < 0.015` is not a test of strength — it is a test of REFRESH
 * RATE, and on a 60 Hz display it can never be true. Measured on the built
 * bundle, unthrottled, in the opening duel: the boot's own slow frames push
 * `fdt` to 38 ms and drop the tier to 0 within two seconds; from then on `fdt`
 * reads 0.0167 forever while the work per frame is 0.7 ms — 96 % of the budget
 * idle — and the tier NEVER comes back. Every session on a 60 Hz display was
 * played in thrift: no cel bands, no limb or neck shade stripes, no dread
 * aura, one hair lock. A drop that is only ever a one-way door is not
 * hysteresis; it is a latch.
 *
 * So both climbs read `S.fw`, the time actually spent inside the RAF callback,
 * which AppScene measures with two `performance.now()` calls a frame. The DROP
 * still reads the interval, and still at 24 ms, because a missed vsync is the
 * one thing work-per-frame cannot see: GPU backpressure never appears in it.
 *
 * ── The two non-negotiables of the sparkle tier, and where they are kept ──
 *
 * A device that cannot hold the frame must NEVER reach tier 2. A climb needs
 * sustained room measured against THIS display's budget, held for `DWELL`
 * frames — three seconds of it. The fall needs no dwell at all: the smoothed
 * numbers crossing the exit line take the tier at once, and a RUN of overrun
 * frames takes it within three. Asymmetric on purpose — three seconds to
 * earn, three frames to lose. (Three frames and not one: see `STALL_LIMIT`,
 * which is a measurement.)
 *
 * Entering or leaving must not POP. No renderer branches on `S.q > 1`; they
 * scale on `S.qx`, which eases towards the tier over `SPARKLE_RAMP` seconds,
 * so the extra grass grows in and the extra glow widens instead of arriving
 * between two frames. Tier 0 and 1 are hard branches in the renderers and
 * always were, so the restore to 1 is rationed instead: a session may make
 * `MAX_RESTORES` of them and then stays where it is, and a device that keeps
 * falling over settles in thrift rather than breathing in and out of it.
 */
import { S } from '@/game/duel/state'
import { min, max } from '@/game/duel/util'
import { reducedMotion } from '@/use/useAccessibility'
import { track } from '@/use/useAnalytics'

/** The panic line. A smoothed interval above this is a loop missing vsync. */
const PANIC = 0.024
/** Work per frame under which the authored look is affordable again, and the
 *  share of the budget that is the same statement on a faster panel. */
const RESTORE_WORK = 0.011
const RESTORE_SHARE = 0.66
/** Work per frame below which a device is offered the sparkle tier. ~36 % of a
 *  60 Hz budget, which leaves the 10 ms of headroom the S8 pass measured. */
export const SPARKLE_ENTER = 0.006
/** …and above which it is taken away again. Well under the 16.7 ms budget: the
 *  tier is a luxury, so it goes long before anything a player would notice. */
export const SPARKLE_EXIT = 0.009
/**
 * The same two lines as a SHARE of the budget this display actually has.
 *
 * 6 ms is a third of a 60 Hz frame and almost the whole of a 144 Hz one, so a
 * fixed figure alone would hand the tier to a high-refresh device with nothing
 * left over — the loudest way to fail the first non-negotiable. Whichever of
 * the two is stricter wins, and entry stays well under exit so the hysteresis
 * survives the change of units.
 */
const ENTER_SHARE = 0.4
const EXIT_SHARE = 0.55
/** The smoothed interval that vetoes any climb. Above this the loop is already
 *  slipping, whatever the work number says about the CPU side. */
export const SPARKLE_SLIP = 0.020
/** A single interval this long is a frame the player SAW drop. */
export const SPARKLE_STALL = 0.030
/**
 * Stalled frames the sparkle tier survives before it goes.
 *
 * Measured, not chosen: at one stall the tier flickered out and back roughly
 * every fifteen seconds on an unthrottled desktop sitting at 1.1 ms a frame —
 * a GC or an asset decode, not a device in trouble. A tier that leaves on
 * every collection is a tier that breathes in and out of view all session.
 * So an isolated stall only resets the dwell; the tier goes when stalls come
 * in a RUN, or when the smoothed numbers say the device is genuinely short —
 * which they do within ten or twenty frames, well inside "the moment frames
 * slow". Each stall is forgiven after `STALL_FORGIVE` seconds.
 */
const STALL_LIMIT = 3
const STALL_FORGIVE = 1.2
/** Consecutive qualifying frames before a climb. ~3 s at 60 Hz — long enough
 *  that a lull between two casts cannot buy a tier. */
export const SPARKLE_DWELL = 180
/** How long the sparkle mix takes to travel the whole way, in seconds. */
export const SPARKLE_RAMP = 1.5
/** Restores to the authored look one session may make. Tier 0 and 1 differ by
 *  hard branches in the renderers, so each one is a visible change; a device
 *  that has fallen over three times is told to stay down. */
const MAX_RESTORES = 2
/** Frames a tier must hold before it is reported. Half a second: the event
 *  says where the session SETTLED, not everywhere it passed through. */
const REPORT_HOLD = 30

let held = 0
let drops = 0
let stalls = 0
/** The last tier handed to analytics. -1, so the settled boot tier is news. */
let reported = -1
let settled = 0

/** Sustained room for the tier above this one. `cap` and `share` are that
 *  tier's entry lines; a single stalled frame resets the count. */
const room = (raw: number, work: number, cap: number, share: number): boolean =>
  S.fdt < SPARKLE_SLIP && raw < SPARKLE_STALL && work < cap * 2 && S.fw < min(cap, S.fdt * share)

/** The sparkle tier's exit line. Looser than `room`, which is the hysteresis:
 *  a device sitting on the line neither climbs nor falls. */
const overspending = (): boolean =>
  S.fw > min(SPARKLE_EXIT, S.fdt * EXIT_SHARE) || S.fdt > SPARKLE_SLIP

/** Did THIS frame overrun? One does not cost the tier; a run of them does. */
const stalled = (raw: number, work: number): boolean =>
  raw > SPARKLE_STALL || work > min(SPARKLE_EXIT, S.fdt * EXIT_SHARE) * 2

/**
 * One frame of the controller.
 *
 * @param raw   the interval this frame took, in seconds
 * @param work  what the PREVIOUS frame spent inside the RAF callback, in
 *              seconds — the newest honest sample, since this one has not
 *              finished yet
 * @param dt    the clamped delta the rest of the frame runs on
 */
export const stepQuality = (raw: number, work: number, dt: number): void => {
  S.fdt += (raw - S.fdt) * 0.1
  S.fw += (work - S.fw) * 0.1

  const was = S.q

  // The panic valve, in the signal and at the threshold it always had.
  if (S.fdt > PANIC && S.q > 0) {
    S.q = 0
    drops++
    held = 0
  }

  if (S.q < 1) {
    // Back to the authored look, if the work says there is room for it and the
    // session has not already spent its restores.
    if (drops > MAX_RESTORES || !room(raw, work, RESTORE_WORK, RESTORE_SHARE)) held = 0
    else if (++held >= SPARKLE_DWELL) { S.q = 1; held = 0 }
  } else {
    // Tier 2 never rescues a struggling device: it is offered only from tier 1,
    // and any drop out of tier 1 takes it with it. Reduced motion holds at 1
    // too — every one of the tier's extras is more moving parts on screen,
    // which is the thing that setting exists to reduce.
    stalls = stalled(raw, work) ? stalls + 1 : max(0, stalls - dt / STALL_FORGIVE)
    if (reducedMotion.value || overspending() || stalls >= STALL_LIMIT) {
      held = 0
      stalls = 0
      if (S.q > 1) S.q = 1
    } else if (room(raw, work, SPARKLE_ENTER, ENTER_SHARE)) {
      if (++held >= SPARKLE_DWELL) S.q = 2
    } else held = 0
  }

  // The mix every renderer actually reads. Never snapped, in either direction.
  const want = S.q > 1 ? 1 : 0
  const travel = dt / SPARKLE_RAMP
  S.qx = want > S.qx ? min(want, S.qx + travel) : max(want, S.qx - travel)

  // One event per tier the session settles on — never per frame, and never for
  // a tier the controller passed through on its way somewhere else.
  if (S.q !== was) settled = 0
  else if (S.q !== reported && ++settled > REPORT_HOLD) {
    reported = S.q
    track('quality_tier', { tier: S.q, fdt: +S.fdt.toFixed(4) })
  }
}

/** Test seam: forget everything the controller has latched. Never called by
 *  the game — one boot is one session. */
export const __resetQuality = (): void => {
  held = 0
  drops = 0
  stalls = 0
  reported = -1
  settled = 0
  S.q = 1
  S.qx = 0
  S.fdt = 0.016
  S.fw = 0.008
}
