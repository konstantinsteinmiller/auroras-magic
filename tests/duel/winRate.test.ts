// @vitest-environment node
// §7.2's two-part difficulty target, measured on the REAL duel — `updateSim`
// with every chapter mechanic live (bubble wards, pierce, Crystal Ward's
// reflect, decoys, slows, lifesteal, each boss's phase 2, Umbra's phase 3
// finisher) — against §7.2's "core" player, a comfortable 7–10-year-old:
//   • 0.8 drawing attempts a second, 85 % of them recognised;
//   • builds two-rune combos, then casts;
//   • half the time draws the rune that counters the foe, when she owns it
//     (a counter whose pair is no damage spell — Water's ward, Illusion's
//     decoy — she casts alone); otherwise one of the four she learned first;
//   • never raises a shield on purpose — the pessimistic child.
// Targets, first attempt: standard ≥ 90 % (ch 1–6) / ≥ 85 % (ch 7–10); boss
// ≥ 75 % / ≥ 60 %. Within three attempts (Dream Dust easing each retry,
// §6.15): ≥ 95 %. Standard nodes are measured at nodes 1–2 and at 3–4, where
// the chapter's own magic is live (C14).
//
// ~2 minutes, so it is opt-in: `pnpm test:winrate` (WINRATE=1); the full
// suite skips it.

import { describe, expect, it, vi } from 'vitest'
import { appendFileSync } from 'node:fs'

// The sim draws its dice from `Math.random` captured at import time: seed it
// BEFORE anything imports, so every run measures the same duels.
//
// `reseed` is called at the top of every table below, because the dice are
// SHARED: without it, adding a measurement anywhere in this file silently
// re-rolls every measurement after it, and two tuning passes cannot be
// compared. Each table is now its own experiment.
const { reseed } = vi.hoisted(() => {
  const SEED = 20260919
  let s = SEED
  Math.random = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
  return { reseed: (): void => { s = SEED } }
})

import { CTR, FIRE, EARTH, NO_EASE, PH_DUEL, PH_WIN, resolveSpell, type DuelEase, type Rune } from '@/game/duel/config'
import { FOES, shadowOf, guardianOf } from '@/game/duel/foes'
import { duelSetup, nodeIsBoss, runeForNode } from '@/game/campaign/tables'
import { earlyEase } from '@/game/campaign/easing'
import { S } from '@/game/duel/state'
import { resetDuel, updateSim, cast } from '@/game/duel/sim'

const DT = 1 / 60
const MAX_T = 150
const N = 360

/**
 * ─── Who is holding the phone ───────────────────────────────────────────────
 *
 * Two models, because "is this too hard" has no answer without naming the
 * child. Every field is a thing a grown-up can watch a child do; none of them
 * is a difficulty knob.
 */
interface Player {
  id: string
  /** Seconds between attempts at a rune. */
  beat: number
  /** Chance the shape she drew is the shape she meant. */
  hand: number
  /** Chance she reaches for the counter when she owns it. */
  counter: number
  /** Chance she fires what is already in her hand instead of pairing it. */
  single?: number
  /** Chance a beat passes with her attention somewhere else. */
  idle?: number
}

/** §7.2's core child: a comfortable 7–10-year-old. The targets are hers. */
const CORE: Player = { id: 'core', beat: 1.25, hand: 0.85, counter: 0.5 }

/**
 * A SMALL CHILD — the owner's "below 9" (2026-09-20). Half the drawing speed,
 * a hand that misses two shapes in five, almost no counter-picking (she is
 * not thinking about what the foe is weak to), a thumb that fires a lone rune
 * rather than pairing it, and a beat in six spent looking somewhere else.
 *
 * Deliberately NOT a bad-luck version of the core child: every one of those
 * differences is something a five-year-old does that a nine-year-old has
 * stopped doing, and each one costs damage per second in a different way.
 */
const YOUNG: Player = { id: 'young', beat: 2, hand: 0.62, counter: 0.12, single: 0.3, idle: 0.15 }

/**
 * NOBODY. The phone is on the table, face up, and the duel runs. Every
 * kindness in `campaign/easing.ts` moves the floor as well as the ceiling,
 * and this is the policy that says where the floor ended up: a duel that can
 * be won without playing teaches nothing and is worth nothing to win.
 */
const NOBODY: Player = { id: 'nobody', beat: 999, hand: 0, counter: 0 }

/**
 * The runes a player owns ARRIVING AT node `n` (§8.30): the two she starts
 *  with, plus every rune a chest has given before it — the two of chapter 1
 *  and then each chapter's own.
 *
 * This is also what the FOE may draw (`chooseRune` reads the same save), so
 *  the model has to set it rather than assume the old frozen four: with it
 *  unset, chapter 7's shadow fights with Fire and Earth and every number here
 *  is flattering.
 */
const owned = (n: number): number[] => {
  const held = new Set<number>([FIRE, EARTH])
  for (let k = 0; k < n; k++) {
    const r = runeForNode(k)
    if (r !== null) held.add(r)
  }
  return [...held]
}

/**
 * One duel on the real sim; true = won, false = lost or timed out.
 *
 * `played` is how many duels are behind her, which decides §6.14's onboarding
 * ramp. The chapter table below passes the default 20 — past the ramp, the
 * pessimistic reading — while the first-ten table passes the node, because a
 * child meeting duel 3 really has had two.
 */
const duel = (
  foe: number, node: number, usesMagic: boolean, lossStreak: number,
  p: Player = CORE, played = 20, ease: DuelEase = NO_EASE
): boolean => {
  S.wins = played
  S.losses = 0
  S.intro = 0
  S.campaign.signaturesUnlocked = 0
  const kit = owned(node)
  S.campaign.runesUnlocked = kit.reduce((m, r) => m | (1 << r), 0)
  resetDuel({ foe, usesMagic, lossStreak, ease })
  const el = FOES[foe]!.element
  const counter = el >= 0 && kit.includes(CTR[el]!) ? CTR[el]! : -1
  const solo = counter >= 0 && [2, 5].includes(resolveSpell([counter, counter]).kind)
  let clock = 0
  // A duel nobody plays runs its whole length — that is 9 000 steps a sample,
  // and the floor test takes thirty of them per node. It cannot be won after
  // the foe has had a minute either, so it is not measured for longer.
  const cap = p.hand > 0 ? MAX_T : 60
  for (let t = 0; t < cap; t += DT) {
    S.pops.length = 0
    clock += DT
    if (clock >= p.beat) {
      clock -= p.beat
      // The optional traits are rolled ONLY when the policy has them, so the
      // core child's dice are the same sequence they have always been and her
      // numbers stay comparable across every tuning pass.
      const away = p.idle !== undefined && Math.random() < p.idle
      if (!away && Math.random() < p.hand) {
        // She draws from what she OWNS — two runes in the first battles, more
        // as the chests give them.
        const r = counter >= 0 && Math.random() < p.counter ? counter : kit[(Math.random() * kit.length) | 0]!
        if (r === counter && solo && S.queue.length) cast()
        S.queue.push(r as Rune)
        const impatient = p.single !== undefined && Math.random() < p.single
        if (S.queue.length >= 2 || impatient || (r === counter && solo)) cast()
      }
    }
    updateSim(DT)
    if (S.phase !== PH_DUEL) return S.phase === PH_WIN
  }
  return false
}

const rate = (
  foe: number, node: number, usesMagic: boolean, streak = 0,
  p: Player = CORE, played = 20, ease: DuelEase = NO_EASE, n = N
): number => {
  let w = 0
  for (let i = 0; i < n; i++) if (duel(foe, node, usesMagic, streak, p, played, ease)) w++
  return w / n
}

/**
 * P(cleared within `k` attempts) — each attempt measured at ITS OWN loss
 * streak, because Dream Dust eases the next try by what the last one cost
 * (§6.15). Fewer samples per attempt than the headline tables: this is six
 * measurements per node and the shape is what matters, not the third digit.
 */
const withinK = (
  foe: number, node: number, usesMagic: boolean, k: number,
  p: Player, played: number, ease: DuelEase, n = 150
): number => {
  let lose = 1
  for (let s = 0; s < k; s++) lose *= 1 - rate(foe, node, usesMagic, s, p, played, ease, n)
  return 1 - lose
}

/** P(cleared within three tries), each retry eased by Dream Dust. */
const within3 = (
  foe: number, node: number, usesMagic: boolean, first: number,
  p: Player = CORE, played = 20, ease: DuelEase = NO_EASE
): number =>
  1 - (1 - first) *
    (1 - rate(foe, node, usesMagic, 1, p, played, ease)) *
    (1 - rate(foe, node, usesMagic, 2, p, played, ease))

const NL = String.fromCharCode(10)
const pct = (x: number): string => `${(x * 100).toFixed(1)} %`

/**
 * WHY she lost, not how often — the breakdown the tuning is actually aimed at.
 * A duel she runs out of clock on and a duel she is knocked out of are two
 * different problems with two different fixes, and the win rate cannot tell
 * them apart. `WINRATE_WHY=1` prints it.
 */
const why = (node: number, p: Player, n = 200, ease: DuelEase = earlyEase(node)): string => {
  const { foe, usesMagic } = duelSetup(node)
  let won = 0, ko = 0, timeout = 0, foeLeft = 0, ownLeft = 0, secs = 0
  for (let i = 0; i < n; i++) {
    const out = duel(foe, node, usesMagic, 0, p, node, ease)
    if (out) won++
    else if (S.hp <= 0) ko++
    else timeout++
    foeLeft += S.ehp / S.ehpMax
    ownLeft += S.hp / S.hpMax
    secs += S.dur
  }
  return `node ${node + 1}  won ${pct(won / n)}  knocked out ${pct(ko / n)}  ran out of clock ${pct(timeout / n)}` +
    `  foe left ${pct(foeLeft / n)}  her HP left ${pct(ownLeft / n)}  ${(secs / n).toFixed(0)} s`
}

describe.skipIf(!process.env.WINRATE_WHY)('what ends a small child duel', () => {
  it('prints the cause breakdown', () => {
    reseed()
    const rows: string[] = []
    for (const n of [0, 4, 9]) rows.push(`young  ${why(n, YOUNG)}`)
    for (const n of [0, 4, 9]) rows.push(`core   ${why(n, CORE)}`)
    console.info(`[why]${NL}${rows.join(NL)}`)
    if (process.env.WINRATE_OUT) appendFileSync(process.env.WINRATE_OUT, `why:${NL}${rows.join(NL)}${NL}`)
    expect(rows).toHaveLength(6)
  }, 300_000)
})

/**
 * ─── THE FIRST TEN DUELS, FOR A SMALL CHILD ─────────────────────────────────
 *
 * The owner's shape for the story (2026-09-20): chapters 1 and 2 — nodes 1-1
 * to 2-5 — have to be finishable by a child under nine; after that the game
 * may grow, but gently.
 *
 * Measured with YOUNG and with the onboarding ramp where it really is on a
 * first run (`played = node`), which is the honest model: at node 1 she has
 * played nothing, by node 6 §6.14's ramp has expired.
 *
 * `expect.soft` so one hard node does not hide the other nine: a difficulty
 * table you can only read one row of is not a table.
 */
describe.skipIf(!process.env.WINRATE)('the first ten duels, for a child under nine', () => {
  it('every one of nodes 1-1..2-5 is winnable on the first try, and near-certain within three', () => {
    reseed()
    const rows: string[] = []
    for (let n = 0; n < 10; n++) {
      const { foe, usesMagic } = duelSetup(n)
      const first = rate(foe, n, usesMagic, 0, YOUNG, n, earlyEase(n))
      const x3 = within3(foe, n, usesMagic, first, YOUNG, n, earlyEase(n))
      const label = `${Math.floor(n / 5) + 1}-${(n % 5) + 1}${nodeIsBoss(n) ? ' boss' : '     '}`
      rows.push(`${label}  first ${pct(first)}  ≤3 tries ${pct(x3)}`)
      // A boss is allowed to be a wall she bounces off once; a standard node
      // is not. Both have to fall inside three tries — that is the promise
      // Dream Dust makes (§6.15).
      expect.soft(first, `${label} first try`).toBeGreaterThanOrEqual(nodeIsBoss(n) ? 0.7 : 0.85)
      expect.soft(x3, `${label} within three`).toBeGreaterThanOrEqual(0.95)
    }
    const table = rows.join(NL)
    console.info(`[winrate young]${NL}${table}`)
    if (process.env.WINRATE_OUT) appendFileSync(process.env.WINRATE_OUT, `young:${NL}${table}${NL}`)
  }, 300_000)

  /**
   * AND THE FLOOR. Every one of those numbers moved the floor as well as the
   * ceiling: a foe with two thirds of her health, two thirds of her damage
   * and four fifths of her pace is, unavoidably, closer to one a phone left
   * on the table could out-live. This is the assertion that says it did not
   * get that far — the teaching chapters are easy, not automatic.
   */
  it('still has to be played: a duel nobody touches is a duel nobody wins', () => {
    reseed()
    for (let n = 0; n < 10; n++) {
      const { foe, usesMagic } = duelSetup(n)
      // Three tries, Dream Dust and all — she loses every one of them. Sixty
      // samples, not 360: this is an absolute claim, and a duel nobody plays
      // runs its whole length before it ends, which makes it the slowest
      // sample in the file.
      const first = rate(foe, n, usesMagic, 0, NOBODY, n, earlyEase(n), 60)
      const x3 = 1 - (1 - first) *
        (1 - rate(foe, n, usesMagic, 1, NOBODY, n, earlyEase(n), 60)) *
        (1 - rate(foe, n, usesMagic, 2, NOBODY, n, earlyEase(n), 60))
      expect.soft(first, `node ${n + 1} without playing`).toBe(0)
      expect.soft(x3, `node ${n + 1} without playing, three tries`).toBe(0)
    }
  }, 300_000)

  /**
   * AND THE REST OF THE STORY — "a bit harder, but not too much" (owner,
   * 2026-09-20), which is only a sentence until it is a number.
   *
   * Three groups per chapter, the same split the core child's table uses:
   * nodes 1–2 (the chapter's foe without her own magic), nodes 3–4 (with it,
   * C14) and the boss. Measuring only one of them hides the others — chapter
   * 4's first two nodes came out HARDER than its later ones, because a foe
   * who has learned Crystal Ward spends turns on it instead of on damage.
   *
   * The curve is allowed to climb; that is the story growing. What it may not
   * do is put a chapter out of reach, because there are nine behind it.
   */
  it('gets harder after the teaching chapters, and never out of reach', () => {
    reseed()
    const rows: string[] = []
    for (let c = 0; c < 10; c++) {
      const a = c * 5
      const b = c * 5 + 2
      const k = c * 5 + 4
      const r12 = rate(duelSetup(a).foe, a, false, 0, YOUNG, a, earlyEase(a))
      const r34 = rate(duelSetup(b).foe, b, true, 0, YOUNG, b, earlyEase(b))
      const rb = rate(duelSetup(k).foe, k, true, 0, YOUNG, k, earlyEase(k))
      // What the chapter costs her in TRIES, which is the thing she actually
      // experiences: a first-attempt rate of 40 % and one of 90 % are the same
      // afternoon if Dream Dust closes the gap, and very different if it does
      // not.
      const s6 = withinK(duelSetup(b).foe, b, true, 6, YOUNG, b, earlyEase(b))
      const b6 = withinK(duelSetup(k).foe, k, true, 6, YOUNG, k, earlyEase(k))
      rows.push(
        `ch${String(c + 1).padStart(2)}  nodes 1–2 ${pct(r12)}  nodes 3–4 ${pct(r34)}  boss ${pct(rb)}` +
        `   ≤6 tries: standard ${pct(s6)}  boss ${pct(b6)}`
      )
      // THE PROMISE, and the only one that holds all the way to the finale:
      // no duel in the story is a wall to her. The first try may well be a
      // loss in the late chapters — it is supposed to be, by then — but the
      // afternoon ends with the node cleared.
      expect.soft(s6, `chapter ${c + 1} standard node within six, small child`).toBeGreaterThanOrEqual(0.9)
      expect.soft(b6, `chapter ${c + 1} boss within six, small child`).toBeGreaterThanOrEqual(0.9)
    }
    const table = rows.join(NL)
    console.info(`[winrate young, whole story]${NL}${table}`)
    if (process.env.WINRATE_OUT) appendFileSync(process.env.WINRATE_OUT, `young story:${NL}${table}${NL}`)
    // The longest table in the file (~60 000 duels): on a machine running
    // other work it measured 14 minutes for the whole file and timed out at
    // five, with every number already written. A timeout is not a finding.
  }, 1_200_000)
})

describe.skipIf(!process.env.WINRATE)('difficulty on the real duel (§7.2, the core child)', () => {
  for (let c = 0; c < 10; c++) {
    const stdTarget = c < 6 ? 0.9 : 0.85
    const bossTarget = c < 6 ? 0.75 : 0.6
    it(`chapter ${c + 1}: standard ≥ ${stdTarget * 100} %, boss ≥ ${bossTarget * 100} %, all ≥ 95 % within 3`, () => {
      reseed()
      // Each group is measured with the kit its FIRST node is reached with.
      const n12 = rate(shadowOf(c), c * 5, false)
      const n34 = rate(shadowOf(c), c * 5 + 2, true)
      const boss = rate(guardianOf(c), c * 5 + 4, true)
      const n34x3 = within3(shadowOf(c), c * 5 + 2, true, n34)
      const bossx3 = within3(guardianOf(c), c * 5 + 4, true, boss)
      const row = `ch${c + 1}  nodes 1–2 ${pct(n12)}  nodes 3–4 ${pct(n34)}  boss ${pct(boss)}  ≤3 tries: ${pct(n34x3)} / ${pct(bossx3)}`
      console.info(`[winrate] ${row}`)
      // WINRATE_OUT=<file> keeps the table (a passing test's console is hidden).
      if (process.env.WINRATE_OUT) appendFileSync(process.env.WINRATE_OUT, `${row}\n`)
      expect(n12, 'nodes 1–2').toBeGreaterThanOrEqual(stdTarget)
      expect(n34, 'nodes 3–4').toBeGreaterThanOrEqual(stdTarget)
      expect(boss, 'boss').toBeGreaterThanOrEqual(bossTarget)
      expect(n34x3, 'nodes 3–4 within three').toBeGreaterThanOrEqual(0.95)
      expect(bossx3, 'boss within three').toBeGreaterThanOrEqual(0.95)
    }, 120_000)
  }
})
