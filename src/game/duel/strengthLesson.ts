/**
 * duel/strengthLesson.ts — THE STRENGTH LESSON (story-spec §8.36a), a
 * wordless one.
 *
 * WHY (owner, 2026-09-27): a foe now resists one rune she owns (§6.6a), ×0.55
 * — but only on the rune that CLOSES a hand. "Fire, Wind" closes on Wind and
 * lands weak; "Wind, Fire" is the same spell, closed on Fire, and lands in
 * full. That is a rule about ORDER, which a child cannot read off a badge. So
 * once, early in her first duel with a strength, the game shows it:
 *
 *   HOLD     the foe holds still, as she does for the depth glimpse (§8.36):
 *            she forms nothing and casts nothing, and the HUD's strength
 *            badge pulses (`S.strongCue`).
 *   ✕ DEMO   a ghost finger draws the other rune, then her strength, on the
 *            pad; each drawn rune drops into Aurora's slots; the closing slot
 *            gets a ✕, and a dim ghost spell lands on the foe as a small puff
 *            behind a shield.
 *   ✓ DEMO   the same two runes, the other way round: the closing slot gets a
 *            mint ✓, and a bright ghost spell lands big.
 *            The two demos loop (`demoFrame`) while her hand is empty and she
 *            is not drawing; they step aside the moment she acts.
 *   HER TRY  as she builds a hand that will hit, her own closing slot shows ✕
 *            (it closes on the strength) or ✓ (two runes or more, closed on
 *            another). A cast of two runes or more that HITS and does NOT
 *            close on the strength is the answer: a mint ✓, a chime, the
 *            real hit (her strength untouched), and once it has landed and a
 *            beat has passed, the foe wakes. One
 *            that DOES lands resisted — the real ×0.55 and the resisted pop —
 *            and the demo plays again. A single rune, or a hand that does not
 *            hit (a ward, a decoy), is not a try: nothing is said, and the
 *            demo carries on.
 *   LET GO   nobody is ever stuck: after `STRENGTH_LESSON.tries` wrong hands,
 *            or `STRENGTH_LESSON.bail` seconds held, the foe simply wakes.
 *
 * Taught — the right hand, or a let-go — it is saved (`onTaught`, the
 * campaign's `strengthTaught`) and never plays again. WHICH duel is the
 * campaign's call (`campaign/strengthLesson.ts`), armed by the duel flow
 * after `resetDuel` like the new-rune guide; the duel never reads a node.
 *
 * TRUE IN THE RULES: the two runes are hers (`strengthPair`), both orders are
 * spells that HIT, and the pair is the chapter's weakness wherever that works
 * — the demo never shows a hand that would not do what it shows.
 *
 * THE DIRECTOR. The AFK clock is held at zero while she is held (`noteAct`,
 * as the first-duel lessons do), so the moment the foe wakes is never an
 * "away" moment; and her casts during the hold are kept out of the haste's
 * pace tally (`strengthLessonHolds`, `sim.castSide`) — a child answering a
 * held foe is not a fast player to be hurried against.
 *
 * Every timer runs on the SIM's clock (stepped from `sim.think`), so a pause,
 * the spellbook, Options or an ad freezes it. The picture is DOM
 * (`StrengthLesson.vue`), which reads `strengthView` once a frame.
 *
 * BOUNDARY: like `lesson.ts`, nothing here imports the campaign's progress,
 * the flow or the sim; the sim calls in.
 */
import { S } from '@/game/duel/state'
import { PH_DUEL, RAINBOW, closesOnStrength, closingRune, resolveSpell } from '@/game/duel/config'
import { FOES, weakTo } from '@/game/duel/foes'
import { noteAct } from '@/game/duel/director'
import { sfx } from '@/game/duel/audio'
import { STARTING_RUNES } from '@/game/campaign/tables'
import { max } from '@/game/duel/util'
import { track } from '@/use/useAnalytics'

/** The lesson's rules, seconds on the sim's clock. */
export const STRENGTH_LESSON = {
  /** Seconds into the duel before it may begin — the depth glimpse's six — and
   *  only at a calm moment (`calm`). */
  after: 6,
  /** The longest the foe is held, whatever happens. */
  bail: 20,
  /** Wrong hands (two runes or more, closed on her strength) before she wakes. */
  tries: 3,
  /** The ✓ beat, once the right hand's spell has landed… */
  yes: 1.2,
  /** …waited for no longer than this, if it never lands (a decoy, a duel end). */
  yesMax: 5,
  /** A breath after the hold, before the foe's first thought (the glimpse's). */
  wake: 1,
  /** How long a try's ✕ stays on her closing slot. */
  verdict: 1.3
} as const

/** The demo's beats, seconds. One half is the ✕ hand, the next the ✓ hand. */
export const DEMO = {
  /** The start dot alone, before the finger sets off. */
  lead: 0.35,
  /** The finger drawing one rune… */
  trace: 0.75,
  /** …and the drawn rune dropping into its slot. */
  fly: 0.3,
  /** The closing slot's ✕ or ✓, read before the cast. */
  verdict: 0.5,
  /** The ghost spell leaving the slots and flying to the foe… */
  orb: 0.55,
  /** …and landing: a puff behind a shield (✕), or a burst (✓). */
  hit: 0.75,
  /** A breath before the next half. */
  rest: 0.4
} as const
export const DEMO_HALF = DEMO.lead + 2 * (DEMO.trace + DEMO.fly) + DEMO.verdict + DEMO.orb + DEMO.hit + DEMO.rest
export const DEMO_LOOP = 2 * DEMO_HALF

/** Where the lesson is. */
export const SL = { OFF: 0, ARMED: 1, HELD: 2, YES: 3, DONE: 4 } as const

/** Does a hand HIT — a spell that flies at her, not a ward or a decoy? */
export const hits = (q: readonly number[], sigs: number): boolean => {
  const sp = resolveSpell(q, sigs)
  return sp.kind !== 2 && sp.kind !== 5 && sp.dmg > 0
}

/**
 * The rune the demo pairs with her strength `strong`, from the runes she owns
 * (`owned`), or −1 when no pair works. Both orders must be spells that HIT
 * (Nature, Wind is a ward — no hit to show), each closing where it says. Her
 * WEAKNESS (`weak`) if it works; otherwise the rune whose right-way-round hand
 * hits hardest. Never Rainbow: a closing Rainbow becomes another rune.
 */
export const strengthPair = (strong: number, owned: number, weak = -1, sigs = 0): number => {
  if (!(strong >= 0) || !((owned >>> strong) & 1)) return -1
  const ok = (r: number): boolean => {
    if (r === strong || r === RAINBOW || !((owned >>> r) & 1)) return false
    const bad = [r, strong]
    const good = [strong, r]
    return hits(bad, sigs) && hits(good, sigs) && closingRune(bad, sigs) === strong && closingRune(good, sigs) === r
  }
  if (weak >= 0 && ok(weak)) return weak
  let best = -1
  let top = 0
  for (let r = 0; r < 12; r++) {
    if (!ok(r)) continue
    const d = resolveSpell([strong, r], sigs).dmg
    if (d > top) {
      top = d
      best = r
    }
  }
  return best
}

/* ─────────────────────────────── the demo ─────────────────────────────── */

/** One frame of the demo — what `StrengthLesson.vue` draws. Pure data. */
export interface DemoFrame {
  /** 0: the hand closed on her strength (✕); 1: the same runes, closed on
   *  the other (✓). */
  half: 0 | 1
  /** The hand, in the order drawn. */
  a: number
  b: number
  /** Whose start dot is up (0 or 1, before and while that rune is drawn), −1. */
  dot: number
  /** The rune the finger is drawing (0, 1) and how far along, 0..1; −1 none. */
  tracing: number
  traceF: number
  /** A drawn rune dropping into its slot (0, 1) and how far, 0..1; −1 none. */
  flying: number
  flyF: number
  /** Runes sitting in the slots, 0..2, and how present they are, 0..1 (they
   *  leave into the ghost spell). */
  inSlots: number
  slotA: number
  /** The closing slot's ✕ / ✓ is up. */
  verdict: boolean
  /** The ghost spell's flight, 0..1 (−1: none), and its landing, 0..1 (−1). */
  orbF: number
  hitF: number
}

/** The demo at `t` seconds into its loop, for her strength and its pair. */
export const demoFrame = (t: number, strong: number, other: number, out?: DemoFrame): DemoFrame => {
  const f: DemoFrame = out ?? {
    half: 0, a: -1, b: -1, dot: -1, tracing: -1, traceF: 0, flying: -1, flyF: 0, inSlots: 0, slotA: 1,
    verdict: false, orbF: -1, hitF: -1
  }
  const u = ((t % DEMO_LOOP) + DEMO_LOOP) % DEMO_LOOP
  f.half = u < DEMO_HALF ? 0 : 1
  f.a = f.half ? strong : other
  f.b = f.half ? other : strong
  f.dot = f.tracing = f.flying = -1
  f.traceF = f.flyF = 0
  f.inSlots = 0
  f.slotA = 1
  f.verdict = false
  f.orbF = f.hitF = -1
  let c = u - f.half * DEMO_HALF - DEMO.lead
  if (c < 0) {
    f.dot = 0
    return f
  }
  for (let i = 0; i < 2; i++) {
    f.inSlots = i
    if (c < DEMO.trace) {
      f.dot = f.tracing = i
      f.traceF = c / DEMO.trace
      return f
    }
    c -= DEMO.trace
    if (c < DEMO.fly) {
      f.flying = i
      f.flyF = c / DEMO.fly
      if (i === 0) f.dot = 1
      return f
    }
    c -= DEMO.fly
  }
  f.inSlots = 2
  f.verdict = true
  if (c < DEMO.verdict) return f
  c -= DEMO.verdict
  if (c < DEMO.orb) {
    f.orbF = c / DEMO.orb
    f.slotA = 1 - f.orbF
    return f
  }
  c -= DEMO.orb
  f.slotA = 0
  if (c < DEMO.hit) {
    f.hitF = c / DEMO.hit
    return f
  }
  // The rest: the slots empty, the verdict fading with the half.
  f.inSlots = 0
  f.verdict = false
  return f
}

/* ─────────────────────────────── the state ─────────────────────────────── */

let phase: number = SL.OFF
let strong = -1
let other = -1
let onTaught: (() => void) | null = null
/** Seconds held; seconds into the demo's loop (0 whenever it is off screen, so
 *  it plays from the top when it comes back); wrong hands; whether one whole
 *  ✕ half has been on screen (before that a hand is not judged). */
let heldT = 0
let demoT = 0
let shownT = 0
let fails = 0
/** The ✓ beat: seconds since the right hand's spell landed; seconds waited. */
let yesT = 0
let waitT = 0
/** Her last try's mark on her closing slot: ✓ or ✕, which slot, its age
 *  (−1: none), and a token that bumps with every try (the HUD keys on it). */
let verdictOk = false
let verdictSlot = -1
let verdictT = -1
let verdictN = 0

/** A spell of hers still in the air (and holding her cast lock)? */
const mineInAir = (): boolean => {
  for (const s of S.shots) if (s.lk && s.dir > 0) return true
  return false
}

/** A calm moment to begin: nothing in the air or forging on either side, no
 *  ward, decoy, wind-up or freeze of hers, the foe not nearly beaten, and
 *  Aurora not mid-stroke. */
const calm = (): boolean =>
  S.phase === PH_DUEL && S.dur >= STRENGTH_LESSON.after && !S.shots.length && S.forge.t < 0 && S.eForge.t < 0 &&
  S.eGuard <= 0 && S.eDecoy <= 0 && S.eWindup <= 0 && S.eFrozen <= 0 && S.ehp >= S.ehpMax * 0.25 && !S.draw

/** Is the demo on screen: held, her hand empty, not drawing, nothing of hers
 *  forging or in the air, and no book over the duel. */
export const strengthDemoUp = (): boolean =>
  phase === SL.HELD && S.phase === PH_DUEL && !S.book && !S.queue.length && !S.draw && S.forge.t < 0 && !mineInAir()

/** Is the lesson holding the foe (the demo, her tries, or the ✓ beat)? */
export const strengthLessonHolds = (): boolean => phase === SL.HELD || phase === SL.YES

/** Taught — the right hand, or a let-go: saved once, reported once. */
const teach = (how: 'cast' | 'tries' | 'time'): void => {
  const cb = onTaught
  onTaught = null
  cb?.()
  track('strength_lesson_done', { how, fails, secs: Math.round(heldT * 10) / 10, rune: strong })
}

/** The hold ends: the badge settles and the foe wakes, after a breath. */
const wake = (): void => {
  phase = SL.DONE
  S.strongCue = false
  S.eThink = max(S.eThink, STRENGTH_LESSON.wake)
}

/**
 * Arm the lesson for the duel just reset (`sim.resetDuel`), or not (`null`).
 * `onTaught` runs once, when it has been taught. Refused — false — in versus,
 * during the first-duel lessons, with no strength live, or when her runes
 * hold no pair that shows it (`strengthPair`).
 */
export const armStrengthLesson = (arm: { onTaught: () => void } | null): boolean => {
  resetStrengthLesson()
  if (!arm || S.versus || S.intro || S.eStrong < 0) return false
  const owned = (S.campaign.runesUnlocked | STARTING_RUNES) >>> 0
  const sigs = S.campaign.signaturesUnlocked
  const pair = strengthPair(S.eStrong, owned, weakTo(FOES[S.foe], owned), sigs)
  if (pair < 0) return false
  strong = S.eStrong
  other = pair
  onTaught = arm.onTaught
  phase = SL.ARMED
  return true
}

/** A duel starts (`sim.resetDuel`): no lesson until the flow arms one. */
export const resetStrengthLesson = (): void => {
  phase = SL.OFF
  strong = other = -1
  onTaught = null
  heldT = demoT = shownT = yesT = waitT = 0
  fails = 0
  verdictOk = false
  verdictSlot = verdictT = -1
}

/** The duel ended (`sim.finish`): whatever was up goes, untaught if it was not
 *  taught yet — the next duel with a strength tries again. */
export const endStrengthLesson = (): void => {
  if (phase === SL.OFF || phase === SL.DONE) return
  phase = SL.DONE
  onTaught = null
  S.strongCue = false
}

/**
 * One sim step, from the foe's `think`. True while she is held: she forms
 * nothing and casts nothing.
 */
export const stepStrengthLesson = (dt: number): boolean => {
  if (phase === SL.ARMED) {
    if (!calm()) return false
    phase = SL.HELD
    heldT = demoT = shownT = 0
    fails = 0
    verdictT = -1
    S.strongCue = true
    noteAct()
    track('strength_lesson_shown', { rune: strong, other })
    return true
  }
  if (phase !== SL.HELD && phase !== SL.YES) return false
  // Present, by definition: the AFK clock must not run through the hold.
  noteAct()
  if (verdictT >= 0) verdictT += dt
  if (phase === SL.YES) {
    waitT += dt
    if ((S.forge.t < 0 && !mineInAir()) || waitT >= STRENGTH_LESSON.yesMax) yesT += dt
    if (yesT < STRENGTH_LESSON.yes) return true
    wake()
    return false
  }
  heldT += dt
  if (strengthDemoUp()) {
    demoT += dt
    shownT = max(shownT, demoT)
  } else demoT = 0
  if (heldT < STRENGTH_LESSON.bail) return true
  teach('time')
  wake()
  return false
}

/**
 * Aurora pressed CAST and it was allowed (`sim.startForge`): `q` is her hand.
 * The answer, a wrong hand, or nothing at all: a single rune, or a hand that
 * does not HIT (a ward, a decoy, a heal — Nature, Ice is a wall) is no try —
 * no mark, nothing counted, and the demo carries on after it.
 */
export const strengthLessonCast = (q: readonly number[]): void => {
  const sigs = S.campaign.signaturesUnlocked
  if (phase !== SL.HELD || q.length < 2 || !hits(q, sigs)) return
  const bad = closesOnStrength(q, strong, sigs)
  verdictOk = !bad
  verdictSlot = q.length - 1
  verdictT = 0
  verdictN++
  if (!bad) {
    phase = SL.YES
    yesT = waitT = 0
    sfx('chime')
    teach('cast')
    return
  }
  demoT = 0
  // Before one whole ✕ demo has been on screen a wrong hand is not held
  // against her: she has not been shown anything yet.
  if (shownT < DEMO_HALF) return
  if (++fails < STRENGTH_LESSON.tries) return
  teach('tries')
  wake()
}

/* ─────────────────────────────── the view ─────────────────────────────── */

/** What `StrengthLesson.vue` draws this frame. Reused: read, never kept. */
export interface StrengthView {
  /** The lesson is on screen (held, or the ✓ beat). */
  on: boolean
  strong: number
  other: number
  /** The demo, while it is on screen; else null. */
  demo: DemoFrame | null
  /** Her own closing slot's mark — the live one on the hand she is building,
   *  or her last try's — as slot and ✓ (`ok`); `slot` −1 for none. `n` keys
   *  the mark's pop: it changes whenever the mark does. */
  slot: number
  ok: boolean
  n: number
  /** The ✓ beat: she found it. */
  yes: boolean
}
const VIEW: StrengthView = { on: false, strong: -1, other: -1, demo: null, slot: -1, ok: false, n: 0, yes: false }
const FRAME = demoFrame(0, 0, 0)

/** This frame's picture of the lesson. */
export const strengthView = (): StrengthView => {
  const v = VIEW
  v.on = strengthLessonHolds() && S.phase === PH_DUEL
  v.strong = strong
  v.other = other
  v.demo = v.on && strengthDemoUp() ? demoFrame(demoT, strong, other, FRAME) : null
  v.slot = -1
  v.ok = false
  v.yes = v.on && phase === SL.YES
  if (!v.on) return v
  if (phase === SL.YES || (verdictT >= 0 && verdictT < STRENGTH_LESSON.verdict)) {
    // Her last try: on the slot it closed on, as long as it reads.
    v.slot = verdictSlot
    v.ok = verdictOk
    v.n = verdictN * 16 + v.slot
  } else if (S.queue.length) {
    // The hand she is building, when it is a spell that will HIT: ✕ the moment
    // it closes on her strength, ✓ once it is two runes or more closed on
    // another. A hand that would not hit (a ward) gets no mark either way.
    const n = S.queue.length
    const sigs = S.campaign.signaturesUnlocked
    const bad = closesOnStrength(S.queue, strong, sigs)
    if ((bad || n >= 2) && hits(S.queue, sigs)) {
      v.slot = n - 1
      v.ok = !bad
      v.n = -(n * 2 + (bad ? 0 : 1))
    }
  }
  return v
}

/** For tests and the QA harness: where the lesson is. */
export const strengthLessonState = (): {
  phase: number; strong: number; other: number; fails: number; heldT: number; demoT: number; shownT: number
} => ({ phase, strong, other, fails, heldT, demoT, shownT })
