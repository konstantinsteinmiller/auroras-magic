/**
 * lesson.ts — the first duel's lesson (node 0, first time only).
 *
 * WHY (the blind playtest, 2026-09-24): all four testers only ever drew the
 * triangle — 27 of 29 recognised runes were Fire. The first duel taught the
 * triangle and then let go, so the SECOND rune a new player holds (Earth, the
 * square, `STARTING_RUNES`) was only ever found by guessing, and nobody
 * learned that runes stack: they cast after every single rune and met the
 * foe's three-rune combos as something unfair.
 *
 * So the lesson now teaches BOTH starting runes and the stack, in five beats,
 * all inside the existing onboarding flag (`S.intro`, persisted as
 * `am_onboarded`, cleared by the first cast). A replay of node 0 or a
 * returning save never sees it, because that flag is already off for them.
 *
 *   A  TRIANGLE  the ghost triangle traces itself on a loop; only the triangle
 *                is stored ("DRAW THE RUNE" / "DRAW A TRIANGLE").
 *      STORED    "STORED! UP TO 3" reads for `STORED_S`.
 *   B  SQUARE    the ghost SQUARE traces itself the same way, from its start
 *                dot; only the square is stored ("DRAW A SQUARE" / "TWO RUNES
 *                MAKE A STRONGER SPELL"). The triangle again, or anything
 *                else, is refused with a gentle nudge and the demo restarts.
 *   C  LIGHTBOX  exactly `LIGHTBOX_S` of a soft plum scrim with a spotlight on
 *                her two filled slots, which glow.
 *   D  CAST      the cast button opens, pulses gold, with the arrow and "NOW
 *                CAST IT", until she casts — and her first spell is the
 *                two-rune one (Fire + Earth = Magma Shard, 15 against Fire
 *                Bolt's 8: the lesson's claim is true).
 *
 * THE GATES. From A to C every cast path is shut in ONE place — `castSide`
 * asks `lessonCastOpen()` — so the button, Space/Enter/E, the right mouse
 * button and the QA hook are all covered by the same line, and the HUD only
 * has to SHOW it (dimmed, not hidden). During C and D no stroke is stored, so
 * the first cast really is the two-rune spell.
 *
 * THE FOE is held for the whole lesson exactly as she always was through the
 * onboarding: while `S.intro` is on, `updateSim` steps this lesson INSTEAD of
 * her `think`, so she neither forms nor casts. She wakes on the first cast.
 *
 * THE AFK RULE (director.ts) counts seconds since the player last drew or
 * cast. Nothing can hurt her while the foe is held, but a child who watched
 * the lightbox and then took her time over the cast button would otherwise
 * walk into the fight with the floor already lifted. `stepLesson` marks her
 * present every step (`noteAct`), so the idle clock starts from zero at the
 * first cast. No hook in director.ts was needed.
 *
 * ROBUSTNESS. Every timer here runs on the SIM's clock, which stops for a
 * pause, the spellbook, Options and an ad, so a lesson paused mid-lightbox
 * resumes mid-lightbox. A new duel (a retry, leaving and coming back)
 * restarts the lesson from A (`resetLesson`, from `resetDuel`). A step whose
 * slots do not hold what it expects falls back to A instead of waiting for a
 * stroke it can no longer take. And a child who cannot manage the square yet
 * is not held forever: after `SQUARE_TRIES` refused strokes the cast opens on
 * the triangle alone — the square is still on the chips (`chipsDue`) and in
 * the spellbook.
 *
 * THE WIN-RATE HARNESS is untouched: it clears `S.intro` before every duel
 * (as every duel test does), and with the flag off each hook here is a no-op.
 *
 * BOUNDARY: like `sim.ts`, nothing here imports the campaign or the flow; the
 * chips' rule takes the node and the save's furthest node as arguments.
 */
import { S, pop, save, POP_LIFE } from '@/game/duel/state'
import { EARTH, FIRE, PH_DUEL } from '@/game/duel/config'
import { noteAct } from '@/game/duel/director'
import { sfx } from '@/game/duel/audio'
import { track } from '@/use/useAnalytics'

/** The beats, as `S.introStep` values. A TRIANGLE of 0 and a STORED of 1 are
 *  what they always were, so an old build's save means the same thing. */
export const LESSON = { TRIANGLE: 0, STORED: 1, SQUARE: 2, LIGHTBOX: 3, CAST: 4, DONE: 5 } as const
export type LessonStep = (typeof LESSON)[keyof typeof LESSON]

/** How long "STORED! UP TO 3" reads before the square is shown, sim seconds. */
export const STORED_S = 1.5
/** The lightbox's length, sim seconds — the owner's two. */
export const LIGHTBOX_S = 2
/** Refused strokes in the square beat before the cast opens without it. */
export const SQUARE_TRIES = 5
/** The callout colour of a nudge: the lesson's own gold. */
const NUDGE = '#ffd76a'

/** Refused strokes in the square beat, this duel. */
let tries = 0
/** `S.t` when the guide's demo loop last (re)started — a nudge restarts it. */
let guideAt = 0
/** `S.t` of the last nudge, for the guide's brief flare. */
let nudgeAt = -99
/** Bumps whenever the cast button should invite again (a stroke in C/D). */
let invite = 0
/** Once-per-duel analytics latches. */
let shown = false
let lit = false
/** The locked-rune card (see "locked shapes" below): which rune, since when,
 *  its entrance token, and where the refusal would have stood (stage units). */
let lockedRune = -1
let lockedAt = -99
let lockedToken = 0
let lockedX = 0
let lockedY = 0
/** Where the last refusal callout stood (stage units) — a refused CAST has no
 *  pointer of its own, so its nudge goes where the strokes' went. */
let calloutX = 640
let calloutY = 122

/** Is the lesson running in the duel on screen? */
export const lessonOn = (): boolean => !!S.intro && !S.versus && S.phase === PH_DUEL

/** The current beat, or DONE when there is no lesson. */
export const lessonStep = (): number => (lessonOn() ? S.introStep : LESSON.DONE)

/** Which rune the pad's guide demonstrates right now, or -1 for none. */
export const guideRune = (): number => {
  if (!lessonOn()) return -1
  if (S.introStep === LESSON.TRIANGLE) return FIRE
  if (S.introStep === LESSON.SQUARE) return EARTH
  return -1
}

/** Seconds into the guide's current loop — a nudge starts it over, so the
 *  child sees the shape drawn from its start dot right after a miss. */
export const guideClock = (t: number): number => Math.max(0, t - guideAt)

/** 1 right after a nudge, easing to 0 over 0.7 s: the guide flares. */
export const guideFlare = (t: number): number => Math.max(0, 1 - (t - nudgeAt) / 0.7)

/** Is a nudge's callout still up? The step's own top caption stands aside
 *  for it (same place, and two shouts in one spot is none). */
export const nudgeUp = (t: number): boolean => lessonOn() && t - nudgeAt < POP_LIFE

/** The cast button's re-invite token (the HUD keys a pulse on it). */
export const castInvite = (): number => invite

/**
 * Is a cast allowed? Always, outside the lesson; inside it, only from beat D
 * on. The ONE gate every cast path passes through (`sim.castSide`).
 */
export const lessonCastOpen = (): boolean => !lessonOn() || S.introStep >= LESSON.CAST

/** A cast was tried while the lesson holds it shut: invite the next step. */
export const lessonCastRefused = (): void => {
  if (S.introStep === LESSON.SQUARE) {
    nudge('trySquare', calloutX, calloutY)
    return
  }
  // In the lightbox (or before the square is up) there is nothing to say —
  // the cast is two seconds away and already on its way.
}

const go = (step: LessonStep): void => {
  S.introStep = step
  S.introT = 0
}

/** The square beat has begun: the guide switches shape, from its start. */
const showSquare = (): void => {
  go(LESSON.SQUARE)
  guideAt = S.t
  if (!shown) {
    shown = true
    track('tutorial_square_shown', {})
  }
}

const openCast = (withSquare: boolean): void => {
  go(LESSON.CAST)
  invite++
  track('tutorial_cast_ready', { square: withSquare })
}

/** A refusal the child can act on: the callout, a soft click, the guide
 *  flaring and drawing itself again from the start dot. */
const nudge = (key: 'trySquare' | 'tryTriangle', x = calloutX, y = calloutY): void => {
  calloutX = x
  calloutY = y
  pop(key, NUDGE, x, y)
  sfx('ui')
  guideAt = nudgeAt = S.t
  track('tutorial_nudge', { step: S.introStep })
}

/** A wrong stroke in the square beat counts toward the way out. */
const missSquare = (x?: number, y?: number): void => {
  tries++
  if (tries >= SQUARE_TRIES && S.queue.length) {
    track('tutorial_square_skipped', { tries })
    openCast(false)
    return
  }
  nudge('trySquare', x, y)
}

/**
 * A stroke was recognised as `rune` and is about to be stored. Returns false
 * when the lesson refuses it (and has said so). Only called with the lesson on.
 */
export const lessonTakes = (rune: number, x?: number, y?: number): boolean => {
  if (!lessonOn()) return true
  switch (S.introStep) {
    case LESSON.TRIANGLE:
      if (rune === FIRE) return true
      nudge('tryTriangle', x, y)
      return false
    case LESSON.STORED:
    case LESSON.SQUARE:
      if (rune === EARTH) return true
      // Drawn during "STORED!" the square is taken early; anything else is
      // a miss, and the square beat starts now so the guide can answer it.
      if (S.introStep === LESSON.STORED) showSquare()
      missSquare(x, y)
      return false
    default:
      // The lightbox and the cast invite: the hand is already the lesson's
      // two runes, and the first cast must be exactly that spell.
      invite++
      return false
  }
}

/**
 * A stroke that is no rune at all. Returns true when the lesson answered it,
 * so the sim does not add its own "NOT A RUNE" on top.
 */
export const lessonMiss = (x?: number, y?: number): boolean => {
  if (!lessonOn()) return false
  switch (S.introStep) {
    case LESSON.TRIANGLE:
      nudge('tryTriangle', x, y)
      return true
    case LESSON.STORED:
      showSquare()
      missSquare(x, y)
      return true
    case LESSON.SQUARE:
      missSquare(x, y)
      return true
    default:
      invite++
      return true
  }
}

/** The lesson's rune was just stored (`sim.strokeEnd`, after the push). */
export const lessonStored = (): void => {
  if (!lessonOn()) return
  if (S.introStep === LESSON.TRIANGLE) {
    go(LESSON.STORED)
    return
  }
  if (S.introStep === LESSON.STORED || S.introStep === LESSON.SQUARE) {
    if (!shown) {
      shown = true
      track('tutorial_square_shown', {})
    }
    track('tutorial_square_done', { tries })
    go(LESSON.LIGHTBOX)
    if (!lit) {
      lit = true
      track('tutorial_lightbox', { runes: S.queue.length })
    }
    sfx('chime')
  }
}

/** One sim step of the lesson — run INSTEAD of the foe's `think`. */
export const stepLesson = (dt: number): void => {
  if (!lessonOn()) return
  // Present, by definition: the AFK clock must not run through the lesson.
  noteAct()
  S.introT += dt
  const n = S.queue.length
  const step = S.introStep
  // Never wait for a stroke the slots can no longer take: a beat that expects
  // runes in hand and finds none starts over from the triangle.
  if (step > LESSON.TRIANGLE && step < LESSON.DONE && n === 0) {
    go(LESSON.TRIANGLE)
    guideAt = S.t
    return
  }
  if (step === LESSON.STORED && S.introT >= STORED_S) showSquare()
  else if (step === LESSON.LIGHTBOX && S.introT >= LIGHTBOX_S - 1e-9) openCast(true)
}

/** The first cast: the lesson is over and the flag is saved off. */
export const endLesson = (): void => {
  if (!S.intro) return
  S.intro = 0
  S.introStep = LESSON.DONE
  S.introT = 0
  save()
}

/** A duel starts (`sim.resetDuel`): the lesson, if still owed, from beat A. */
export const resetLesson = (): void => {
  tries = 0
  invite = 0
  nudgeAt = -99
  guideAt = S.t
  shown = lit = false
  lockedRune = -1
  if (S.intro) go(LESSON.TRIANGLE)
}

/* ──────────────────────────── locked shapes ──────────────────────────────
 *
 * A stroke her runes refused but that IS a rune she has not earned yet
 * (`runes.recogniseLocked`, at the same bar an owned rune clears): the HUD
 * shows that rune's painted icon with a small lock and "COMING SOON" where the
 * refusal callout would have stood. Nothing is stored, nothing is spent — it
 * is a promise, not a mistake, so it clicks softly instead of buzzing.
 */
/** How long the locked-rune card stays, sim seconds (a callout lives 1.3). */
export const LOCKED_S = 1.9

/** Name the locked rune a stroke matched, at stage point (x, y). */
export const showLockedRune = (rune: number, x = 640, y = 122): void => {
  lockedRune = rune
  lockedAt = S.t
  lockedToken++
  lockedX = x
  lockedY = y
  sfx('ui')
  track('locked_rune', { rune })
}

/** The locked-rune card on screen now, or null. `token` keys its entrance. */
export const lockedHint = (): { token: number; rune: number; x: number; y: number } | null =>
  lockedRune >= 0 && S.phase === PH_DUEL && S.t - lockedAt < LOCKED_S
    ? { token: lockedToken, rune: lockedRune, x: lockedX, y: lockedY }
    : null

/* ──────────────────────────── the rune chips ─────────────────────────────
 *
 * Task 2 of the playtest pass: a new player forgets which shapes she owns the
 * moment the guide is gone. For her first few duels her KNOWN runes sit as
 * small painted chips along the pad's edge — quiet, display-only, never over
 * the pad's centre.
 *
 * THE RULE: nodes 0..CHIP_NODES-1 (chapter 1's first three duels, where the
 * alphabet grows from two runes to four), on FIRST play only — a node she has
 * not yet won (`node > furthestNode`), retries included, replays not — and
 * never during the lesson, whose own guide is the teacher there. A node was
 * chosen over "until she has cast each rune once" because it needs no new
 * save field and ends on a date the player can see: the chapter moves on.
 */
export const CHIP_NODES = 3

/** Do the chips show for a campaign duel on `node`? Pure. */
export const chipsDue = (node: number, furthestNode: number): boolean =>
  node >= 0 && node < CHIP_NODES && node > furthestNode
