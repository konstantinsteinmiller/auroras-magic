/**
 * lesson.ts — the first duel's two lessons (node 0, first time only), the
 * new-rune guide on the pad, the locked-shape card and the rune chips' window.
 *
 * WHY (the second blind playtest, 2026-09-24): all four testers finished the
 * square beat first try — and all four learned the square as an INGREDIENT
 * ("two runes, stronger spell"), not as the SHIELD, and all four said the
 * foe's hits came "from nowhere". The first thing the duel teaches is now the
 * block; the stack comes second. Both inside the existing onboarding flag
 * (`S.intro`, persisted as `am_onboarded`, cleared by lesson 2's cast), so a
 * replay of node 0 or a returning save never sees either.
 *
 *   LESSON 1 — BLOCK
 *     BLOCK       the foe casts a spell at Aurora through the fight's own
 *                 path: three runes form in her slots one by one, the full
 *                 hand pulses (`sim.foeTell`), and she casts it — the sim's
 *                 `castSide(true)`, so her runes fly out of her slots into her
 *                 horn (the spell forge, `forge.ts`, §8.37). The forge is
 *                 HELD at its last moment, horn swollen, so there is no time
 *                 pressure at all. "SHE'S CASTING!" / "DRAW THE SQUARE TO
 *                 BLOCK!", with the square's guide tracing itself on the pad.
 *                 Only the square is stored.
 *     BLOCK_CAST  "NOW CAST IT": the cast button opens and pulses. Her cast is
 *                 the Earth Wall, through the normal cast path (and forge).
 *     BLOCK_WAIT  her wall rises at the end of her forge; `WALL_BEAT` later
 *                 the foe's held forge is let go and her spell leaves into it.
 *                 The wall is kept standing until the spell has broken on it.
 *     BLOCKED     the ward ripples and "BLOCKED" pops (both `sim.strike`'s
 *                 own); the lesson adds "YOU BLOCKED IT!", a bell and a
 *                 sparkle on the wall for `BLOCKED_S`.
 *   LESSON 2 — COMBO (the 2026-09-24 lesson, unchanged but for its opener)
 *     TRIANGLE    "NOW ATTACK WITH TWO RUNES!" / "DRAW A TRIANGLE".
 *     STORED      "STORED! UP TO 3" reads for `STORED_S`.
 *     SQUARE      the square's guide again; "TWO RUNES, STRONGER SPELL!".
 *     LIGHTBOX    exactly `LIGHTBOX_S` of scrim with a spotlight on her two
 *                 filled slots.
 *     CAST        the cast opens and pulses; her cast is Fire + Earth = Magma
 *                 Shard, and it ends the lesson.
 *
 * THE GATES. Every cast path is shut in ONE place — `castSide` asks
 * `lessonCastOpen()` — so the button, Space/Enter/E, the right mouse button
 * and the QA hook are all covered by one line; it is open only in BLOCK_CAST
 * and CAST. The HUD only SHOWS it (dimmed, not hidden).
 *
 * THE FOE. While `S.intro` is on, `updateSim` steps this lesson INSTEAD of her
 * `think`. In lesson 1 the lesson plays her hand itself (`stepFoeHand`): the
 * same slots and forming ring the fight uses, and her cast is the sim's real
 * cast and forge — only its last moment is held. After that she is held,
 * empty-handed, exactly as she always was, until lesson 2's cast wakes her.
 *
 * THE AFK RULE (director.ts) counts seconds since the player last drew or
 * cast. `stepLesson` marks her present every step (`noteAct`), so the idle
 * clock starts from zero when the lessons end.
 *
 * ROBUSTNESS. Every timer here runs on the SIM's clock, which stops for a
 * pause, the spellbook, Options and an ad; the layout is the HUD's, so a
 * resize or a rotation changes nothing here. A new duel starts the lessons
 * over from BLOCK (`resetLesson`, from `resetDuel`). A beat whose slots no
 * longer hold what it expects steps back to the beat that fills them. And no
 * beat can hold a child forever: after `TRIES` refused tries in a drawing
 * beat the lesson does that beat for her (lesson 1's square is placed in her
 * slot, lesson 2's triangle likewise; lesson 2's square lets her through on
 * the triangle alone, as before), after `TRIES` strokes in a cast beat it
 * casts for her, and lesson 1's wait for a wall or for the block gives up
 * after `WAIT_MAX` and moves on.
 *
 * THE WIN-RATE HARNESS is untouched: it clears `S.intro` before every duel
 * (as every duel test does), and with the flag off each hook here is a no-op.
 *
 * BOUNDARY: like `sim.ts`, nothing here imports the campaign or the flow. The
 * sim hands `stepLesson` its own `castSide`, so this module never imports the
 * sim either; the new-rune guide's rune and the chips' rule are handed in.
 */
import { S, pop, save, POP_LIFE } from '@/game/duel/state'
import { AX, EARTH, FIRE, GY, MAX_RUNES, PH_DUEL, RUNES, type Rune } from '@/game/duel/config'
import { noteAct } from '@/game/duel/director'
import { sfx } from '@/game/duel/audio'
import { barrier, borrowDice, sparkleBurst } from '@/game/duel/fx'
import { FORGE_S } from '@/game/duel/forge'
import { zoneCentre } from '@/game/duel/layout'
import { max, min, seeded } from '@/game/duel/util'
import { track } from '@/use/useAnalytics'

/** The beats, as `S.introStep` values (never persisted: a duel always opens
 *  the lessons at BLOCK). */
export const LESSON = {
  BLOCK: 0, BLOCK_CAST: 1, BLOCK_WAIT: 2, BLOCKED: 3,
  TRIANGLE: 4, STORED: 5, SQUARE: 6, LIGHTBOX: 7, CAST: 8,
  DONE: 9
} as const
export type LessonStep = (typeof LESSON)[keyof typeof LESSON]

/** Is `step` a beat in which the cast is open? */
export const isCastStep = (step: number): boolean => step === LESSON.BLOCK_CAST || step === LESSON.CAST

/** How long "STORED! UP TO 3" reads before the square is shown, sim seconds. */
export const STORED_S = 1.5
/** The lightbox's length, sim seconds — the owner's two. */
export const LIGHTBOX_S = 2
/** Refused tries in any one beat before the lesson does that beat for her. */
export const TRIES = 5
/** Lesson 2's square beat: the same five (the name its tests grew up with). */
export const SQUARE_TRIES = TRIES

/** Lesson 1's foe: a breath before her first rune forms, seconds… */
export const FOE_GRACE = 0.7
/** …seconds per rune as her hand fills… */
export const FOE_RUNE_S = 0.55
/** …the hand itself (Fire Rain: a spell that plainly HITS, and one an earth
 *  wall stops dead — `sim.stops`)… */
export const FOE_HAND: readonly Rune[] = [FIRE, FIRE, FIRE]
/** …how long the full hand pulses in her slots before she casts it… */
export const FOE_FULL_S = 0.6
/** …and how much of her forge is left when it is HELD — its last moment,
 *  the orb in her horn and the horn swollen (`forge.hornGlow` ≈ 0.9). */
export const HOLD_AT = 0.12
/** Seconds her wall stands before the held spell is let go into it. */
export const WALL_BEAT = 0.35
/** The wall is kept at least this tall (seconds) until the block has landed. */
const WALL_HOLD = 0.5
/** "YOU BLOCKED IT!" — the celebration beat, sim seconds. */
export const BLOCKED_S = 1.8
/** The most lesson 1 waits for her wall, or for the block after the release. */
export const WAIT_MAX = 8
/** The callout colour of a nudge: the lesson's own gold. */
const NUDGE = '#ffd76a'

/** Refused tries in the current beat (reset by every beat change). */
let tries = 0
/** `S.t` when the guide's demo loop last (re)started — a nudge restarts it. */
let guideAt = 0
/** `S.t` of the last nudge, for the guide's brief flare. */
let nudgeAt = -99
/** Bumps whenever the cast button should invite again (a stroke in a cast beat). */
let invite = 0
/** Once-per-duel analytics latches. */
let shown = false
let lit = false
/** Lesson 1's foe: seconds into her scripted hand, when it filled, whether
 *  her held forge has been let go, the lesson clock at the release, and the
 *  callout watermark (the last pop id before the release — a newer "blocked"
 *  is the block). */
let foeT = 0
let fullAt = 0
let released = false
let releasedAt = 0
let popMark = 0
/** Seconds her wall has stood in BLOCK_WAIT. */
let wallT = 0
/** The cast beat's way out, owed to the next step (a stroke cannot cast),
 *  and whether the cast in progress is that one. */
let autoCast = false
let casting = false
/** The square of lesson 1 was placed for her (for the analytics). */
let helped = false
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
/** The lesson's own dice for its sparkles: `fx` rolls on `Math.random`, the
 *  stream the duel's damage rolls on (see `perfect.ts`). */
const dice = seeded(20260924)

/** Is the lesson running in the duel on screen? */
export const lessonOn = (): boolean => !!S.intro && !S.versus && S.phase === PH_DUEL

/** The current beat, or DONE when there is no lesson. */
export const lessonStep = (): number => (lessonOn() ? S.introStep : LESSON.DONE)

/** Which rune the pad's lesson guide demonstrates right now, or -1 for none. */
export const guideRune = (): number => {
  if (!lessonOn()) return -1
  if (S.introStep === LESSON.BLOCK || S.introStep === LESSON.SQUARE) return EARTH
  if (S.introStep === LESSON.TRIANGLE) return FIRE
  return -1
}

/** Seconds into the guide's current loop — a nudge starts it over, so the
 *  child sees the shape drawn from its start dot right after a miss. */
export const guideClock = (t: number): number => Math.max(0, t - guideAt)

/** 1 right after a nudge — or a refused tap on the cast button, the sim's
 *  `S.castRefusedAt` (an empty hand never reaches the lesson's own gate) —
 *  easing to 0 over 0.7 s: the guide flares, pointing back at the shape. */
export const guideFlare = (t: number): number => {
  const tap = S.castRefusedAt >= 0 ? t - S.castRefusedAt : 99
  return Math.max(0, 1 - (t - nudgeAt) / 0.7, 1 - tap / 0.7)
}

/** Is a nudge's callout still up? The step's own top caption stands aside
 *  for it (same place, and two shouts in one spot is none). */
export const nudgeUp = (t: number): boolean => lessonOn() && t - nudgeAt < POP_LIFE

/** The cast button's re-invite token (the HUD keys a pulse on it). */
export const castInvite = (): number => invite

/**
 * Is a cast allowed? Always, outside the lesson; inside it, only in its two
 * cast beats. The ONE gate every cast path passes through (`sim.castSide`).
 */
export const lessonCastOpen = (): boolean => !lessonOn() || isCastStep(S.introStep)

/** A cast was tried while the lesson holds it shut: invite the next step. */
export const lessonCastRefused = (): void => {
  if (S.introStep === LESSON.BLOCK || S.introStep === LESSON.SQUARE) nudge('trySquare', calloutX, calloutY)
  // Anywhere else there is nothing to say: the cast is a timed beat away, or
  // her spell is already on its way.
}

const go = (step: LessonStep): void => {
  S.introStep = step
  S.introT = 0
  tries = 0
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

/** The lesson does a drawing beat for her: rune `r` lands in her slot as a
 *  stored stroke would — the clean glyph flashes and it is filed. */
const giveRune = (r: Rune): void => {
  if (S.queue.length >= MAX_RUNES) return
  S.queue.push(r)
  S.landed++
  S.snap = { r, t: 0 }
  sfx('snap', r)
}

/* ─────────────────────────────── lesson 1 ─────────────────────────────── */

/** The square is in her hand: the cast opens and invites. */
const openBlockCast = (): void => {
  track('tutorial_block_square', { tries, helped })
  go(LESSON.BLOCK_CAST)
  invite++
  sfx('chime')
}

/** A wrong try in the BLOCK beat: a nudge, or after `TRIES` the square. */
const missBlock = (x?: number, y?: number): void => {
  if (++tries >= TRIES) {
    helped = true
    giveRune(EARTH as Rune)
    openBlockCast()
    return
  }
  nudge('trySquare', x, y)
}

/** The forge clock at which the foe's spell is held (`S.eForge.t`). */
const HELD_T = FORGE_S - HOLD_AT

/**
 * Lesson 1's foe hand — the slots and forming ring the fight uses, played by
 * the lesson instead of by her `think`; then her cast, through the sim's own
 * `castSide(true)` and its forge, which is HELD at its last moment until her
 * hold is let go (`released`). The sim steps the forge before the lesson, and
 * one step is far shorter than `HOLD_AT`, so the forge never reaches its end
 * while it is held.
 */
const stepFoeHand = (dt: number, castFor: (e: boolean) => void): void => {
  if (released) return
  const f = S.eForge
  if (f.t >= 0) {
    // She is about to let go, and does not.
    if (f.t > HELD_T) f.t = HELD_T
    return
  }
  foeT += dt
  const q = S.equeue
  if (q.length < MAX_RUNES) {
    if (foeT < FOE_GRACE) return
    S.eRune = FOE_HAND[q.length]!
    S.eForm = min(1, S.eForm + dt / FOE_RUNE_S)
    if (S.eForm >= 1) {
      S.eForm = 0
      q.push(S.eRune as Rune)
      if (q.length >= MAX_RUNES) {
        // Full: the hand pulses in her slots (`sim.foeTell`) for a moment.
        S.eRune = -1
        fullAt = foeT
      } else S.eRune = FOE_HAND[q.length]!
    }
    return
  }
  if (foeT - fullAt >= FOE_FULL_S) castFor(true)
}

/** Is the foe's spell forged and held at its last moment? */
const foeHeld = (): boolean => !released && S.eForge.t >= HELD_T - 1e-6

/** Her wall stands until the block has landed (an Earth Wall alone is two
 *  seconds, and her forge and the spell's fall can take longer than that). */
const holdWall = (): void => {
  if (S.guard > 0 && S.guard < WALL_HOLD) {
    S.guard = WALL_HOLD
    barrier(AX, GY - 70, EARTH, WALL_HOLD)
  }
}

/** The newest callout's id — a "blocked" newer than this is the block. */
const lastPopId = (): number => S.pops.reduce((m, p) => max(m, p.id), 0)

/** The foe's held forge is let go: it runs out its last `HOLD_AT` and her
 *  spell leaves, exactly as any spell of hers does (`sim.stepForge`). */
const release = (): void => {
  released = true
  releasedAt = S.introT
  popMark = lastPopId()
}

/** The block landed: the celebration. */
const blocked = (): void => {
  go(LESSON.BLOCKED)
  sfx('perfect')
  borrowDice(dice, () => sparkleBurst(AX + 58, GY - 110, 0.8))
  track('tutorial_block_done', {})
}

/** Lesson 1 could not finish (no wall came, or no block was seen): her hand
 *  is quietly put away and lesson 2 begins. Never a deadlock. */
const giveUpBlock = (why: 'noWall' | 'noBlock'): void => {
  track('tutorial_block_skipped', { why })
  if (!released) {
    // A spell still held in her horn goes nowhere: the forge simply ends.
    S.eForge.t = -1
    S.eForge.q.length = 0
  }
  released = true
  S.equeue.length = 0
  S.eForm = 0
  S.eRune = -1
  startCombo()
}

const stepBlockWait = (dt: number): void => {
  holdWall()
  if (!released) {
    if (S.guard > 0) wallT += dt
    if (wallT >= WALL_BEAT && foeHeld()) release()
    // Her own forge raises the wall 1.5 s after the press; the foe's hand
    // takes a few seconds to reach its hold. A wall that never came is the
    // only thing worth giving up on.
    else if (S.introT >= WAIT_MAX && S.guard <= 0) giveUpBlock('noWall')
    return
  }
  if (S.pops.some((p) => p.k === 'blocked' && p.id > popMark)) blocked()
  else if (S.introT - releasedAt >= WAIT_MAX) giveUpBlock('noBlock')
}

/* ─────────────────────────────── lesson 2 ─────────────────────────────── */

/** Lesson 2 begins: the triangle, from its start dot. */
const startCombo = (): void => {
  go(LESSON.TRIANGLE)
  guideAt = S.t
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

/** A wrong try in the TRIANGLE beat: a nudge, or after `TRIES` the triangle. */
const missTriangle = (x?: number, y?: number): void => {
  if (++tries >= TRIES) {
    track('tutorial_helped', { step: LESSON.TRIANGLE, tries })
    giveRune(FIRE as Rune)
    go(LESSON.STORED)
    return
  }
  nudge('tryTriangle', x, y)
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

/** A stroke in a cast beat: the button invites again, and after `TRIES` the
 *  lesson presses it for her (on its next step — a stroke is not a cast). */
const strokeInCast = (): void => {
  invite++
  if (++tries >= TRIES) autoCast = true
}

/* ──────────────────────────── the sim's hooks ─────────────────────────── */

/**
 * A stroke was recognised as `rune` and is about to be stored. Returns false
 * when the lesson refuses it (and has said so). Only called with the lesson on.
 */
export const lessonTakes = (rune: number, x?: number, y?: number): boolean => {
  if (!lessonOn()) return true
  switch (S.introStep) {
    case LESSON.BLOCK:
      if (rune === EARTH) return true
      missBlock(x, y)
      return false
    case LESSON.TRIANGLE:
      if (rune === FIRE) return true
      missTriangle(x, y)
      return false
    case LESSON.STORED:
    case LESSON.SQUARE:
      if (rune === EARTH) return true
      // Drawn during "STORED!" the square is taken early; anything else is
      // a miss, and the square beat starts now so the guide can answer it.
      if (S.introStep === LESSON.STORED) showSquare()
      missSquare(x, y)
      return false
    case LESSON.BLOCK_CAST:
    case LESSON.CAST:
      // The hand is already the lesson's, and the cast must be exactly that.
      strokeInCast()
      return false
    case LESSON.LIGHTBOX:
      invite++
      return false
    default:
      // Her wall is rising or the block is being celebrated: let it play.
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
    case LESSON.BLOCK:
      missBlock(x, y)
      return true
    case LESSON.TRIANGLE:
      missTriangle(x, y)
      return true
    case LESSON.STORED:
      showSquare()
      missSquare(x, y)
      return true
    case LESSON.SQUARE:
      missSquare(x, y)
      return true
    case LESSON.BLOCK_CAST:
    case LESSON.CAST:
      strokeInCast()
      return true
    case LESSON.LIGHTBOX:
      invite++
      return true
    default:
      return true
  }
}

/**
 * A stroke of `rune` was just stored (`sim.strokeEnd`, after the push). Called
 * for EVERY stored stroke of hers, lesson or not: the new-rune guide listens
 * here too.
 */
export const lessonStored = (rune = -1): void => {
  runeGuideStored(rune)
  if (!lessonOn()) return
  switch (S.introStep) {
    case LESSON.BLOCK:
      openBlockCast()
      return
    case LESSON.TRIANGLE:
      go(LESSON.STORED)
      return
    case LESSON.STORED:
    case LESSON.SQUARE:
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

/**
 * The player cast during the lesson (`sim.castSide`, past the gate): lesson
 * 1's wall starts the wait for the block; any cast from lesson 2 on ends the
 * lesson.
 */
export const lessonCast = (): void => {
  if (!S.intro) return
  if (lessonOn() && S.introStep < LESSON.TRIANGLE) {
    track('tutorial_block_cast', { auto: casting })
    go(LESSON.BLOCK_WAIT)
    wallT = 0
    return
  }
  endLesson()
}

/**
 * One sim step of the lesson — run INSTEAD of the foe's `think`. `castFor` is
 * the sim's own `castSide`: the foe's release and the cast beats' way out go
 * through exactly the path a real cast takes.
 */
export const stepLesson = (dt: number, castFor: (e: boolean) => void = () => {}): void => {
  if (!lessonOn()) return
  // Present, by definition: the AFK clock must not run through the lesson.
  noteAct()
  S.introT += dt
  const step = S.introStep
  if (step <= LESSON.BLOCK_WAIT) stepFoeHand(dt, castFor)
  if (autoCast) {
    autoCast = false
    if (isCastStep(step) && S.queue.length) {
      track('tutorial_helped', { step, tries })
      casting = true
      castFor(false)
      casting = false
      return
    }
  }
  // Never wait for a stroke the slots can no longer take: a beat that expects
  // runes in hand and finds none steps back to the beat that fills them.
  const n = S.queue.length
  if (step === LESSON.BLOCK_CAST && n === 0) {
    go(LESSON.BLOCK)
    guideAt = S.t
    return
  }
  if (step > LESSON.TRIANGLE && step < LESSON.DONE && n === 0) {
    startCombo()
    return
  }
  if (step === LESSON.BLOCK_WAIT) stepBlockWait(dt)
  else if (step === LESSON.BLOCKED && S.introT >= BLOCKED_S) startCombo()
  else if (step === LESSON.STORED && S.introT >= STORED_S) showSquare()
  else if (step === LESSON.LIGHTBOX && S.introT >= LIGHTBOX_S - 1e-9) openCast(true)
}

/** Lesson 2's cast: the lessons are over and the flag is saved off. */
export const endLesson = (): void => {
  if (!S.intro) return
  S.intro = 0
  S.introStep = LESSON.DONE
  S.introT = 0
  save()
}

/** A duel starts (`sim.resetDuel`): the lessons, if still owed, from BLOCK;
 *  and no new-rune guide until the campaign arms one (`armRuneGuide`). */
export const resetLesson = (): void => {
  tries = 0
  invite = 0
  nudgeAt = -99
  guideAt = S.t
  shown = lit = false
  foeT = fullAt = wallT = releasedAt = 0
  released = autoCast = casting = helped = false
  popMark = 0
  lockedRune = -1
  newRune = -1
  greatAt = -99
  if (S.intro) {
    go(LESSON.BLOCK)
    if (!S.versus) track('tutorial_block_shown', {})
  }
}

/* ─────────────────────────── the new-rune guide ──────────────────────────
 *
 * "Teach the newest learnt rune in the duel without blocking the duel"
 * (owner, 2026-09-24). A chest hands her a rune on the map; the next duel she
 * arrives at with that rune never yet drawn, the pad shows it: the rune's
 * painted icon and "New rune: ICE!" (`NewRuneGuide.vue`), and its glyph
 * tracing itself faintly on the pad on a loop (`render.drawNewRuneGuide`,
 * drawn UNDER her strokes).
 *
 * IT HOLDS NOTHING: no pause, no gate, no hold on the foe — the duel runs as
 * it always does, and every stroke is stored exactly as it would be. It ends
 * the first time she stores that rune (a "Great!" and a sparkle), or with the
 * duel; the next duel shows it again until she has.
 *
 * WHICH RUNE, AND WHEN, is the campaign's call (`campaign/newRune.ts`: the
 * newest rune a chest has given by this node, hers and never yet drawn, and
 * not on a replay where it is no longer new), handed over after `resetDuel`
 * by the duel flow — the duel never reads a node. It never shows during the
 * lessons, in versus, or while the depth glimpse's "Try Ice!" is up (the
 * glimpse teaches the same rune at node 2, and two teachers at once is none).
 */
/** How long "Great!" stays after she draws the new rune, app seconds. */
export const GREAT_S = 1.4

/** The rune the guide teaches in this duel, -1 for none. */
let newRune = -1
/** "Great!": since when, its entrance token, and which rune it praised. */
let greatAt = -99
let greatToken = 0
let greatRune = -1

/** Arm the guide for the duel just reset (-1 arms none). */
export const armRuneGuide = (rune: number): void => {
  newRune = rune >= 0 && rune < RUNES.length ? rune : -1
  if (newRune >= 0) track('rune_guide_shown', { rune: newRune })
}

/** The rune the new-rune guide shows right now, or -1 — never over the
 *  lessons, in versus, with the book open, outside the fight, or while the
 *  depth glimpse's hint is up (`S.glimpse` 2 and 3). */
export const runeGuideRune = (): number =>
  newRune >= 0 && !S.intro && !S.versus && !S.book && S.phase === PH_DUEL && S.glimpse !== 2 && S.glimpse !== 3
    ? newRune
    : -1

/** A stored stroke: the guide's rune ends it. Praised only if she could see
 *  it at the time (drawn under the glimpse's hint, it simply goes). */
const runeGuideStored = (rune: number): void => {
  if (newRune < 0 || rune !== newRune) return
  const seen = runeGuideRune() >= 0
  newRune = -1
  track('rune_guide_done', { rune, seen })
  if (!seen) return
  greatAt = S.t
  greatToken++
  greatRune = rune
  const [cx, cy] = zoneCentre()
  borrowDice(dice, () => sparkleBurst(cx, cy, 0.7))
  sfx('chime')
}

/** "Great!" on screen now, or null. `token` keys its entrance. */
export const runeGreat = (): { token: number; rune: number } | null =>
  greatToken > 0 && S.phase === PH_DUEL && S.t - greatAt < GREAT_S ? { token: greatToken, rune: greatRune } : null

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
 *
 * THE CAPTION (playtest 2: "legend or buttons?"): the first duel they appear
 * in — node 0 before its first win, retries included — they carry a tiny
 * "Your runes" over them. By node 1 she knows what they are.
 */
export const CHIP_NODES = 3

/** Do the chips show for a campaign duel on `node`? Pure. */
export const chipsDue = (node: number, furthestNode: number): boolean =>
  node >= 0 && node < CHIP_NODES && node > furthestNode

/** …and do they wear their "Your runes" caption? Pure. */
export const chipsCaptionDue = (node: number, furthestNode: number): boolean =>
  chipsDue(node, furthestNode) && furthestNode < 0
