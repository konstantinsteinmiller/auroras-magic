/**
 * director.ts — the invisible hand that keeps a duel TENSE without ever
 * killing the player (owner, 2026-09-21).
 *
 * The roster's `aiTier` decides how fast a foe forms runes and how cleverly
 * she answers; `ease` decides how much the campaign is currently forgiving.
 * Neither of them watches the fight. The result was a foe who either whiffed
 * for a minute or rolled a child in twenty seconds, and the owner's note was
 * exactly right: *"never hitting anything… it would be best if the enemy AI
 * is adaptive."*
 *
 * So this sits on top of both and does four things, in order of how much
 * they matter to a seven-year-old:
 *
 *  1. THE MERCY FLOOR. The foe's spells may not take the player below
 *     `MERCY_FRAC` of her health. Not "unlikely to" — CANNOT: the subtraction
 *     is clamped. A child at the floor is one good rune from turning the duel
 *     around and is never, ever killed mid-fight.
 *
 *  2. THE TRADE, IN BOTH DIRECTIONS. The two health bars are kept descending
 *     TOGETHER. Ahead on the trade the foe eases off and takes less off the
 *     player; behind it she presses — she forms runes FASTER (`foeRate`), and
 *     the player's own spells take a little less off her (`playerDamageScale`).
 *     That second half was missing at first, and its absence is exactly what
 *     "every fight is way too easy" looked like: a duel the player was winning
 *     ended in twenty seconds with three-quarters of her health untouched.
 *     A fight that is close is exciting, and a fight that is close is one the
 *     player can still win.
 *
 *  3. THE AFK RULE. The floor is the one thing that could let a player put
 *     the phone down and never lose. So after `AFK_S` seconds with no drawing
 *     at all, the floor lifts and the foe is allowed to finish. Touch the
 *     screen and it comes straight back — and if a blow took her UNDER it
 *     while she was away, she is lifted back up to it (`LIFT_S`, below):
 *     the floor re-anchors, it does not freeze where she happened to be.
 *     And a lifted floor never leaves a sliver: under `KO_HP` it is a
 *     knockout (story-spec §8.36).
 *
 *  4. THE HASTE (owner, 2026-09-23). A player who has learned to draw FAST
 *     out-paces all of the above: she lands a spell a second while the foe
 *     has barely got one off, and the duel is over before the trade can say
 *     anything. So the foe's forming speed follows the player's own — always
 *     running, continuously: the further ahead and the faster she is, the
 *     faster the foe forms, and the moment the bars are level it bleeds
 *     away. See the block below.
 *
 * NOT a difficulty setting, and deliberately not saved: it reads the live
 * fight and nothing else, so it cannot drift out of step with the campaign's
 * own tuning (`ease`, `onboard`, `dust`) or be stale after a migration.
 *
 * OFF in local versus, where both duelists are people and a rubber band on
 * one of them would be cheating.
 */
import { S } from '@/game/duel/state'
import { PH_DUEL } from '@/game/duel/config'
import { clamp, max, min } from '@/game/duel/util'

/** Seconds of no drawing before the foe is allowed to land the last blow. */
export const AFK_S = 10
/**
 * A PLAYTEST HARNESS'S IDLE WINDOW (second blind playtest, 2026-09-24). An AI
 * tester acts every 8–10 s, so the 10 s rule fired on it all the time and
 * skewed every loss it reported. A harness that announced itself before boot
 * (`window.__AM_QA__ === true` — no portal and no player ever sets it) may
 * also set `window.__AM_QA_AFK_S` to a number of seconds (> 0; `Infinity`
 * turns the rule off), and the rule uses that instead of `AFK_S`. Anything
 * else — either flag missing, a string, 0, NaN — is `AFK_S`. `__AM_QA_AFK_S`
 * is not even read without `__AM_QA__`.
 */
export const qaAfkSeconds = (w: unknown): number => {
  const q = w as { __AM_QA__?: unknown; __AM_QA_AFK_S?: unknown } | null | undefined
  if (!q || q.__AM_QA__ !== true) return AFK_S
  const s = q.__AM_QA_AFK_S
  return typeof s === 'number' && s > 0 ? s : AFK_S
}
/** The idle window this session runs on — read ONCE, when this module loads. */
const afkS = qaAfkSeconds(typeof window === 'undefined' ? undefined : window)
/** The idle window in force (`AFK_S`, unless a harness widened it). */
export const afkSeconds = (): number => afkS
/** The share of her health the foe's spells can never take her below. */
export const MERCY_FRAC = 0.1
/**
 * THE KNOCKOUT LINE (story-spec §8.36). With the floor lifted — the player
 * away, or local versus — a duelist under this much health is knocked out,
 * not left standing on 0.4 HP: a bar that READS empty has to BE empty. The
 * blind playtest watched a child sit on "0" for 46 s, invulnerable, because a
 * burn tick had left her a fraction and the floor then re-formed around it.
 */
export const KO_HP = 0.5
/**
 * Seconds the RE-ANCHOR takes (story-spec §8.36): a player who comes back to
 * the phone below the floor — a blow landed while she was away — is lifted
 * back up to it, smoothly and visibly, rather than the floor re-forming
 * wherever she happened to be. That second thing is the freeze: the floor is
 * `min(10 %, hp)`, so a player on 0.4 HP who acts again has a floor of 0.4,
 * and nothing in the game can ever take the last step.
 */
export const LIFT_S = 0.6
/**
 * Seconds after the game RESUMES — a menu closed (Options, the spellbook), an
 * ad ended, the tab came back — in which the foe may not RELEASE a spell. She
 * keeps forming; she just cannot throw the combo she queued the instant the
 * book shuts in front of a child who is still finding the pad (owner,
 * 2026-09-24: "Spellbook is a menu").
 */
export const RESUME_GRACE_S = 1
/** How far apart the two bars may drift before the foe presses or eases. */
const SLACK = 0.08
/** The hardest and gentlest the foe's damage is ever scaled. */
const PRESS_MAX = 1.6
const EASE_MIN = 0.45
/** How quickly the scale follows the fight (per second, toward its target). */
const FOLLOW = 2.2

/** Seconds since the player last drew anything. */
let idle = 0
/** The live damage multiplier on the foe's spells. */
let scale = 1
/** The re-anchor under way: HP a second, and seconds left. */
let liftRate = 0
let liftT = 0
/** Seconds of the resume grace left. */
let grace = 0

/* ------------------------------ the haste ------------------------------ */
/**
 * The haste's numbers (story-spec §8.35). One object so the rule reads as a
 * table, and so `tests/duel/director.test.ts` and a tuning harness read what
 * they pin. Measured against the three player models of the balance pass: a
 * small child, §7.2's core child, and a fast grown-up drawing three-rune
 * spells.
 */
export const HASTE = {
  /** Seconds the player's pace and the bars' trend average over… */
  window: 6,
  /** …or everything since the duel began, while it is younger than that
   *  (never less than this). A fast grown-up ends an early duel in seven
   *  seconds; a tally that needed the whole window to fill had not noticed
   *  her by the end. */
  warm: 2,
  /** THE PACE THE ROSTER WAS TUNED FOR, runes cast a second: §7.2's core
   *  child (0.8 attempts a second, 85 % recognised). Every foe's pace in
   *  §6.14 was measured against a child drawing this fast, so the RATIO
   *  between the two is the game's balance — and the haste keeps that ratio
   *  for anyone faster. At or below it the haste has nothing to give. */
  designPace: 0.68,
  /** How far ahead the player must be heading (the lead, plus the trend
   *  `look` seconds on) for the foe to match her pace exactly… */
  leadFull: 0.2,
  /** …and how far past that a bigger lead may drive her: at most this many
   *  times the player's excess pace. For the fast grown-up (1.6 runes a
   *  second) that is a foe forming 1.2–1.3× as fast as HE casts — "a bit
   *  above" his pace. Not a cap on SPEED (a faster player still meets a
   *  faster foe), a cap on how hard a lead is paid. Measured 1.5 / 2.5 / 3:
   *  1.5 left him at 87 % end HP; 3 took the foe to the readability limit
   *  and her largest lead to 0.41 of a bar. */
  over: 2.5,
  /** Seconds the bars' trend is projected ahead: a player pulling away is
   *  answered before the gap is wide, and a foe catching up bleeds the haste
   *  off before she is level. */
  look: 4,
  /** Below this lead the push fades to nothing, so it meets zero smoothly at
   *  a level duel and is exactly zero once the foe leads. */
  soft: 0.05,
  /** Time constants, seconds: it comes on gently and goes off three times
   *  faster — a foe who has caught up must never arrive at a run. */
  rise: 1,
  fall: 0.35,
  /** SAFETY LIMIT, not a balance cap: the shortest time a foe's rune may take
   *  to form. Below it the ghost rune in her slot (the thing a player reads
   *  to counter her) changes faster than it can be read. Only a player
   *  casting well over two runes a second could ever reach it. */
  minForm: 0.4
} as const

/** Runes the player cast, per second over the window, and since the last step. */
let pace = 0
let runesIn = 0
/** How fast the lead is moving (bar shares a second, + = the player pulling
 *  away), over the window — the damage she LANDS against what she takes. */
let trend = 0
/** The lead last step. A duel opens level. */
let lastGap = 0
/** Seconds this duel has run, for the tallies' warm-up. */
let age = 0
/** The haste itself: the multiplier on the foe's forming speed, ≥ 1. */
let boost = 1

/** A fresh duel: nobody is idle and nothing has been traded yet. */
export const resetDirector = (): void => {
  idle = 0
  scale = 1
  pace = runesIn = trend = lastGap = age = 0
  boost = 1
  liftRate = liftT = grace = 0
}

/** The player cast `runes` runes (`sim.castSide`) — the haste's pace tally. */
export const notePlayerCast = (runes: number): void => {
  runesIn += runes
}

/** The health the floor stands at, whole: `MERCY_FRAC` of her maximum. */
const floorHp = (): number => S.hpMax * MERCY_FRAC

/**
 * The player drew or cast — she is here, and the mercy floor applies.
 *
 * Returns true when this is her COMING BACK from the AFK rule below the
 * floor: the re-anchor has started, and the caller (`sim.ts`) shows it on
 * her. Only a player who was away can be under the floor at all — every
 * damage path clamps to `mercyFloor()` while she is here.
 */
export const noteAct = (): boolean => {
  const back = idle >= afkS
  idle = 0
  if (!back || S.versus || S.phase !== PH_DUEL || !(S.hp > 0) || S.hp >= floorHp()) return false
  liftT = LIFT_S
  liftRate = (floorHp() - S.hp) / LIFT_S
  return true
}

/** Whether the player has been away long enough to be finished off. */
export const afk = (): boolean => idle >= afkS

/** Seconds of the re-anchor still to run — 0 when none is under way. */
export const lifting = (): number => liftT

/** Is the floor lifted — the player away, or a person on the other side?
 *  Then, and only then, a sliver of health is a knockout (`KO_HP`). */
export const floorLifted = (): boolean => S.versus || afk()

/** The game resumed (`AppScene`, on the pause gate's falling edge). */
export const noteResume = (): void => {
  grace = RESUME_GRACE_S
}

/** May the foe release a spell now? Not in the second after a resume. */
export const foeMayRelease = (): boolean => grace <= 0

/**
 * The lowest health the foe's spells may leave the player on.
 *
 * Zero in versus (a person on the other side earns the win), zero once the
 * player has gone quiet, and her own health if she is already under it — a
 * BLOW never heals her, it only refuses to take the last step. The one way
 * back up is the re-anchor (`noteAct`), which is how she can only ever be
 * under it: a blow that landed while she was away.
 *
 * EVERY damage path on the player clamps to this — the spell's hit and a
 * ward's seep (`sim.strike`, which a reflected spell also lands through), a
 * burn tick and a lingering spell's tick (`sim.tick`). A new one must too;
 * `tests/duel/director.test.ts` walks a present player through all of them.
 */
export const mercyFloor = (): number => {
  if (S.versus || afk()) return 0
  const floor = S.hpMax * MERCY_FRAC
  return min(floor, S.hp)
}

/** The multiplier on what the foe's spells take off the player. */
export const foeDamageScale = (): number => (S.versus ? 1 : scale)

/** How much of a hit the foe soaks when the player is running away with it. */
const SOAK_MIN = 0.34
/** Below this share of her health, nothing protects her — the kill always lands. */
const FINISH_AT = 0.12

/**
 * The multiplier on what the PLAYER's spells take off the foe.
 *
 * THE TRADE WAS ONLY HALF BUILT. The foe eased off when she was ahead, but
 * nothing at all slowed the player when SHE was — so a duel the player was
 * winning ended in twenty seconds with three-quarters of her health still on
 * the bar, which is exactly what "every fight is way too easy" looks like
 * from the sofa. Far ahead on the trade, the foe now soaks a little more.
 *
 * It lets go completely once she is nearly finished, so a duel that is won is
 * never a duel that will not END — the brake is on the runaway, not on the
 * kill. It is also off in versus, where the other side is a person.
 */
export const playerDamageScale = (): number => {
  if (S.versus) return 1
  if (S.ehpMax > 0 && S.ehp <= S.ehpMax * FINISH_AT) return 1
  return 1 - (1 - SOAK_MIN) * press()
}

/**
 * How hard the foe is pushing ABOVE an even fight, 0..1 — read by the NPC to
 * decide how fast to form and how readily to throw a half-built hand.
 *
 * MEASURED FROM 1, NOT FROM `EASE_MIN`. The first version of this mapped
 * `scale` across its whole range, so an even duel — `scale` exactly 1 — read
 * as 0.48, and everything hung off it was pressing from the first frame of
 * every fight. That silently multiplied §6.14's documented rate chain on a
 * foe who was neither ahead nor behind, which is what `tests/duel/rules.ts`
 * pins. At neutral this is ZERO, and the chain is the chain.
 */
export const press = (): number => (S.versus ? 0 : clamp((scale - 1) / (PRESS_MAX - 1), 0, 1))

/**
 * What the haste wants, for a lead, a trend and a pace — pure, so a test can
 * walk it (story-spec §8.35).
 *
 *   excess = max(0, pace / designPace − 1)                  how much faster
 *            than the child the game was tuned for
 *   push   = clamp((lead + look·trend) / leadFull, 0, over)  how easily she
 *            is winning — now, and where it is heading
 *            × min(1, lead / soft)                           nothing once the
 *            foe is level or ahead, whatever the trend
 *   want   = 1 + excess · push
 *
 * At push 1 the foe forms `pace / designPace` times faster: the player's pace
 * against hers back to the ratio every foe was tuned at. A faster player gets
 * a faster foe, with no ceiling but `minForm`'s readability limit. A child at
 * or below the design pace gets nothing at all, however far ahead she is —
 * the trade's own press already answers her lead.
 */
export const hasteTarget = (lead: number, trendNow: number, paceNow: number): number => {
  if (!(lead > 0)) return 1
  const excess = max(0, paceNow / HASTE.designPace - 1)
  const push = clamp((lead + HASTE.look * trendNow) / HASTE.leadFull, 0, HASTE.over) * min(1, lead / HASTE.soft)
  return 1 + excess * push
}

/**
 * The haste as a multiplier on the foe's forming speed, ≥ 1 — exactly 1 in
 * versus.
 *
 * THE RATE CHAIN, whole (applied in `sim.think`):
 *
 *   rate = min(1 / minForm, §6.14's chain × max(pressRush, hasteRush))
 *   pressRush = 1 + 1.6 × press()   — the trade: how FAR ahead she is
 *   hasteRush = this                — the haste: how FAST she is, too
 *
 * The LARGER of the two, never the product: both answer the same lead, and a
 * product would pay it twice. (The first version capped the haste at 2 and took
 * the larger — and did nothing, because a capped haste was never bigger than
 * the press a fast player already earned. Uncapped, it is.) The chain itself
 * (`sim.foeRate`, which `tests/duel/rules.test.ts` pins) is untouched, and so
 * are the campaign's reliefs inside it: a node's `ease.rate`, Dream Dust and
 * onboarding still slow a boosted foe exactly as much as a plain one.
 */
export const hasteRush = (): number => (S.versus ? 1 : boost)

/** How far the haste has come on, 0..1, for its one visual tell (sparks at
 *  her horn): 0 at rest, 1 at three times her pace and beyond. */
export const hasteLevel = (): number => clamp((hasteRush() - 1) / 2, 0, 1)

/* ---------------------------- the snap wall ---------------------------- */
/**
 * THE SNAP WALL'S NUMBERS (owner, 2026-09-24; story-spec §8.37). A ward
 * forges in 0.4 s now, on both sides (`forge.WARD_FORGE_S`), so the foe too
 * can wall a spell the player is still forging — and left to herself she
 * would wall every one she held a wall for. A child whose whole skill is
 * getting her runes drawn would meet a wall for her best spells, which is the
 * one thing the change must not do. So her ANSWERING wall — the one she puts
 * up because a blow of the player's is coming, or loaded in the player's
 * slots — answers to the director, like her damage and her pace do.
 */
export const WARD_WILL = {
  /** At an even fight: the share of the player's spells she answers. */
  even: 0.3,
  /** The push (`press`, or the haste) at which she answers EVERY one:
   *  `press` 0.25 is a player some third of a bar ahead on the trade, and
   *  `hasteLevel` 0.25 a fast one pulling away. Measured (story-spec §8.37):
   *  0.5 gave a fast grown-up no more walls than raising `even` to 0.5 did,
   *  and that cost the small child a fifth more of hers. */
  full: 0.25,
  /** How fast the easing takes it away: once `even / drop` of it is on
   *  (`scale` 0.945 — a player about a sixth of a bar behind) she answers
   *  none. */
  drop: 3
} as const

/**
 * How readily the foe answers a spell of the player's with a wall, 0..1.
 *
 *   pushing = max(press, hasteLevel)       she is ahead — or ahead and FAST
 *   easing  = (1 − scale) / (1 − EASE_MIN)  she is behind, the foe easing off
 *   will    = even + (1 − even) · min(1, pushing / full) − drop · easing,
 *             clamped 0..1
 *
 * A struggling child — behind on the trade, and at the mercy floor always —
 * has her spells walled rarely or never; a level fight meets the odd wall; a
 * grown-up running away with it meets a wall for every blow she has one for.
 * `sim.think` asks it ONCE per spell of the player's, never per thought, so a
 * wall is a thing she decides, not a coin flipped four times a second. Only
 * her answering walls ask: a ward that is simply the hand she built (Crystal
 * Ward, a boss's contract, her low-health defence) is hers to cast as ever.
 * Never asked in versus, where the right-hand side is a person.
 */
export const wardWill = (): number => {
  const pushing = max(press(), hasteLevel())
  const easing = clamp((1 - scale) / (1 - EASE_MIN), 0, 1)
  return clamp(
    WARD_WILL.even + (1 - WARD_WILL.even) * min(1, pushing / WARD_WILL.full) - WARD_WILL.drop * easing, 0, 1
  )
}

/** What the haste is reading, for tests and a tuning harness. */
export const hasteReadout = (): { pace: number; trend: number; boost: number; level: number } =>
  ({ pace, trend, boost: hasteRush(), level: hasteLevel() })

/**
 * The haste's step (owner, 2026-09-23): *"if the player is dealing a lot of
 * damage while the enemy is barely firing a spell off, the AI gets a faster
 * rune drawing bonus… until the enemy is on par in health with the player"* —
 * and then, reviewing the first version: not capped, not only when she is
 * far ahead, ADAPTIVE, *"so the player is kinda always challenged"*, without
 * the foe overkilling her.
 *
 * So it is a controller, always running, on two tallies over the last
 * `HASTE.window` seconds — the runes the player casts (her PACE) and how fast
 * the lead is moving (the TREND: the damage she lands against what she takes)
 * — and the lead itself. `hasteTarget` turns them into a wanted forming
 * speed; the haste follows it slowly up (`rise`) and quickly down (`fall`).
 *
 * THE ANTI-OVERKILL, three ways. The push reaches zero as the bars level and
 * IS zero once the foe leads; the trend bleeds it before she gets there, as
 * she catches up; and it falls three times faster than it rises. It only ever
 * changes how fast she forms: the trade's damage scale, the mercy floor and
 * the AFK rule are what they always were — and an absent player's pace decays
 * to nothing, so a foe is never hurried against someone who is not there.
 *
 * THE CHILDREN, by construction: a child drawing no faster than §7.2's core
 * child has no excess pace, so the haste has nothing to multiply. Measured,
 * the small child never sees it and the core child only in her quickest
 * seconds, under the trade's own press (story-spec §8.35).
 */
const stepHaste = (dt: number, mine: number, hers: number): void => {
  age += dt
  // A running average over the window, or over the duel so far while it is
  // younger than that (`HASTE.warm`).
  const w = clamp(age, HASTE.warm, HASTE.window)
  const k = min(1, dt / w)
  pace += runesIn / w - pace * k
  runesIn = 0
  const gap = mine - hers
  trend += (gap - lastGap) / w - trend * k
  lastGap = gap
  const want = hasteTarget(gap, trend, pace)
  boost += (want - boost) * min(1, dt / (want > boost ? HASTE.rise : HASTE.fall))
}

/**
 * Follow the fight. `dt` seconds.
 *
 * The target is set by the GAP between the two health bars: the player ahead
 * means the foe has been missing and should press; the player behind means
 * she is being beaten up and it should let go. `FOLLOW` keeps the change
 * gradual, so a single unlucky spell never swings the whole fight.
 */
export const stepDirector = (dt: number): void => {
  idle += dt
  if (grace > 0) grace = max(0, grace - dt)
  // THE RE-ANCHOR: she came back under the floor, so she rises to it over
  // `LIFT_S`. Only ever UP, only as far as the floor, only in a live duel —
  // her own heals may have got there first, and a won duel is not lifted.
  if (liftT > 0) {
    const t = min(dt, liftT)
    liftT = max(0, liftT - dt)
    const floor = floorHp()
    if (S.phase !== PH_DUEL || !(S.hp > 0) || S.hp >= floor) liftT = 0
    else S.hp = liftT > 0 ? min(floor, S.hp + liftRate * t) : floor
  }
  if (S.versus) {
    scale = 1
    boost = 1
    return
  }
  const mine = S.hpMax > 0 ? S.hp / S.hpMax : 1
  const hers = S.ehpMax > 0 ? S.ehp / S.ehpMax : 1
  stepHaste(dt, mine, hers)
  // > 0 when the player is winning the trade, < 0 when she is losing it.
  const gap = mine - hers
  const want = gap > SLACK
    ? 1 + (PRESS_MAX - 1) * min(1, (gap - SLACK) / (1 - SLACK))
    : gap < -SLACK
      ? 1 - (1 - EASE_MIN) * min(1, (-gap - SLACK) / (1 - SLACK))
      : 1
  scale += (want - scale) * min(1, dt * FOLLOW)
  scale = clamp(scale, EASE_MIN, PRESS_MAX)
  // A player sitting at the floor has nothing left to lose and the fight has
  // stopped moving: stop hitting her so the bar is not pinned, and let her
  // read the field and draw her way out.
  if (mine <= MERCY_FRAC + 0.01 && !afk()) scale = min(scale, 0.8)

}
