/**
 * hpGauge.ts — the arithmetic of the duel's two HP bars (`HpBar.vue`).
 *
 * Plain numbers in, plain numbers out: no DOM, no Vue, no `S`. `useDuelHud`
 * feeds it once per rendered frame and writes what it answers straight onto
 * the bar's elements (the hot path — see the top of `useDuelHud.ts`).
 *
 * Three things testers could not read, and the rule each one became:
 *
 *   "no visible health numbers, just colour bars"
 *        → the bar is a MEASURE: a framed track with notches at 25 / 50 /
 *          75 % (`MARKS`), so "a quarter left" is something you can see.
 *   "my bar looked empty before the defeat"
 *        → EMPTY MEANS 0. Any HP above zero shows at least `MIN_SLIVER` of
 *          the track, and only a true 0 shows nothing. The director's mercy
 *          floor holds her at 10 %, which is two and a half slivers — plainly
 *          a bar with something in it.
 *   each hit landing as a colour change and nothing else
 *        → the CHIP (`Ghost`): the part a hit took away stays on the bar as
 *          a paler block for `GHOST_HOLD` seconds, then drains into the fill.
 *          The classic RPG nicety, and the thing that makes a hit readable.
 */

/** The notches on every bar, as fractions of the track. */
export const MARKS = [0.25, 0.5, 0.75] as const

/**
 * The least of the track any HP above zero is drawn as.
 *
 * 4 % is ~4 px on a 320 px portrait phone's bar and ~15 stage units on the
 * landscape one: a sliver, never a hairline. It is also well under the 10 %
 * mercy floor, so it only ever shows in the last hit's worth of a real defeat.
 */
export const MIN_SLIVER = 0.04

/** How long the chip a hit leaves stays put before it drains, in s. */
export const GHOST_HOLD = 0.4
/** How fast it drains once it goes: exponential, per second — a 20 HP chip
 *  is within 1 HP of the fill a third of a second after it lets go. */
export const GHOST_RATE = 9
/** The last quarter-HP (a quarter of a percent of the bar: under a pixel on
 *  most screens) is snapped rather than crept up on. */
const GHOST_SNAP = 0.25

/** The player's bar starts to glow at or under this share of her HP… */
export const LOW_GLOW = 0.3
/** …and pulses gently under this one. */
export const LOW_PULSE = 0.25

/**
 * How much of the track to fill for `hp` of `max`: 0 at 0 (and below), at
 * least `MIN_SLIVER` for anything above 0, 1 at or over `max`.
 */
export const gaugeFill = (hp: number, max: number): number => {
  if (!(hp > 0)) return 0
  const k = hp / (max > 0 ? max : 1)
  if (k >= 1) return 1
  return k < MIN_SLIVER ? MIN_SLIVER : k
}

/** The fill of a bar anchored on `side`, as the `clip-path` that draws it.
 *  A flat leading edge, like every health bar: the track's own rounded ends
 *  round the anchored one. */
export const gaugeClip = (k: number, side: 'left' | 'right'): string => {
  const cut = `${((1 - (k < 0 ? 0 : k > 1 ? 1 : k)) * 100).toFixed(2)}%`
  return side === 'left' ? `inset(0 ${cut} 0 0)` : `inset(0 0 0 ${cut})`
}

/**
 * 0: no glow · 1: a soft, steady warm glow · 2: the same glow, breathing.
 *
 * The CSS decides what a level looks like, and turns 2 into a still glow
 * under reduced motion; this decides only WHEN. At 0 HP nothing is left to
 * look after, and the result card is coming up over it — no glow.
 */
export type LowLevel = 0 | 1 | 2

export const lowLevel = (hp: number, max: number): LowLevel => {
  if (!(hp > 0) || !(max > 0)) return 0
  const k = hp / max
  return k > LOW_GLOW ? 0 : k < LOW_PULSE ? 2 : 1
}

/**
 * The glow belongs to a PLAYER's bar. The foe's never glows — a warning
 * about her health would read to a child as a warning about her own — but in
 * local versus the right-hand bar is player 2's, and glows like player 1's.
 */
export const barLowLevel = (hp: number, max: number, player: boolean, inDuel: boolean): LowLevel =>
  player && inDuel ? lowLevel(hp, max) : 0

/** The foe's bar shimmers gold under this share of her HP. */
export const ALMOST = 0.25

/**
 * "ALMOST THERE!" (second blind playtest, 2026-09-24): the foe's bar gets its
 * own cue under `ALMOST` — a soft GOLD shimmer, good news, never the player's
 * warm red warning (which is why the foe still gets no `LowLevel`). Only a
 * FOE's bar, and only while the duel is on: in local versus the right-hand
 * bar is player 2's, and that one glows red like player 1's.
 */
export const foeAlmost = (hp: number, max: number, player: boolean, inDuel: boolean): boolean =>
  !player && inDuel && hp > 0 && max > 0 && hp / max < ALMOST

/**
 * The chip a hit leaves behind: it snaps UP with the HP (a new duel, a heal),
 * HOLDS where it was for `GHOST_HOLD` s after every hit — a second hit inside
 * that window restarts it, so a combo reads as one bigger chunk — then drains
 * down into the fill.
 */
export interface Ghost {
  /** Where the chip's edge is, in HP. */
  v: number
  /** The HP it saw last frame, to notice a new hit. */
  last: number
  /** Seconds of hold left. */
  hold: number
}

export const newGhost = (hp: number): Ghost => ({ v: hp, last: hp, hold: 0 })

export const resetGhost = (g: Ghost, hp: number): void => {
  g.v = hp
  g.last = hp
  g.hold = 0
}

/** Advance the chip by `dt` s toward `hp`; returns its edge, in HP. A paused
 *  frame (`dt` 0) leaves it exactly where it is. */
export const stepGhost = (g: Ghost, hp: number, dt: number): number => {
  if (hp < g.last) g.hold = GHOST_HOLD
  g.last = hp
  if (hp >= g.v) {
    g.v = hp
    g.hold = 0
    return g.v
  }
  if (g.hold > 0) {
    const left = g.hold - dt
    g.hold = left > 0 ? left : 0
    // The part of this frame the hold did not use still drains.
    dt = left < 0 ? -left : 0
  }
  if (dt > 0) {
    g.v = hp + (g.v - hp) * Math.exp(-GHOST_RATE * dt)
    if (g.v - hp < GHOST_SNAP) g.v = hp
  }
  return g.v
}

/* ─────────────────────────────── the hot write ─────────────────────────── */

const written = new WeakMap<HTMLElement, string>()

/**
 * Write a fill (or a chip) straight onto its element: a `clip-path`, never a
 * width. The element spans the whole track, so the notches drawn INSIDE it
 * sit exactly over the ones drawn on the track and are cut away with it —
 * which is what lets a notch be dark on the fill and light on the empty
 * track at the same time. Only a CHANGED value reaches the DOM.
 *
 * `empty` is the one class the bar's stylesheet keys the fill's CAP on: a
 * short stub of fill at the anchored end, shown whenever the fill is not
 * empty, so the last sliver is never narrower than the track's own rounded
 * end — however narrow the bar (`HpBar.vue`, `.hp-fill-cap`).
 */
export const writeGauge = (el: HTMLElement | null, k: number, side: 'left' | 'right'): void => {
  if (!el) return
  const clip = gaugeClip(k, side)
  if (written.get(el) === clip) return
  written.set(el, clip)
  el.style.clipPath = clip
  el.style.visibility = k > 0 ? 'visible' : 'hidden'
  el.classList.toggle('empty', !(k > 0))
}
