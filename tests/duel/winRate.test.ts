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
vi.hoisted(() => {
  let s = 20260919
  Math.random = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
})

import { CTR, PH_DUEL, PH_WIN, resolveSpell, type Rune } from '@/game/duel/config'
import { FOES, shadowOf, guardianOf } from '@/game/duel/foes'
import { CHAPTERS } from '@/game/campaign/tables'
import { S } from '@/game/duel/state'
import { resetDuel, updateSim, cast } from '@/game/duel/sim'

const DT = 1 / 60
const MAX_T = 150
const N = 360

/** The runes a player owns on reaching chapter `c` (0-based): the first
 *  four, plus the rune of every boss chest before it. */
const owned = (c: number): number[] => [
  0, 1, 2, 3, ...CHAPTERS.slice(0, c).flatMap((ch) => (ch.newRune === null ? [] : [ch.newRune]))
]

/** One duel on the real sim; true = won, false = lost or timed out. */
const duel = (foe: number, c: number, usesMagic: boolean, lossStreak: number): boolean => {
  S.wins = 20 // past onboarding (§6.14)
  S.losses = 0
  S.intro = 0
  S.campaign.signaturesUnlocked = 0
  resetDuel({ foe, usesMagic, lossStreak })
  const el = FOES[foe]!.element
  const counter = el >= 0 && owned(c).includes(CTR[el]!) ? CTR[el]! : -1
  const solo = counter >= 0 && [2, 5].includes(resolveSpell([counter, counter]).kind)
  let clock = 0
  for (let t = 0; t < MAX_T; t += DT) {
    S.pops.length = 0
    clock += DT
    if (clock >= 1.25) {
      clock -= 1.25
      if (Math.random() < 0.85) {
        const r = counter >= 0 && Math.random() < 0.5 ? counter : (Math.random() * 4) | 0
        if (r === counter && solo && S.queue.length) cast()
        S.queue.push(r as Rune)
        if (S.queue.length >= 2 || (r === counter && solo)) cast()
      }
    }
    updateSim(DT)
    if (S.phase !== PH_DUEL) return S.phase === PH_WIN
  }
  return false
}

const rate = (foe: number, c: number, usesMagic: boolean, streak = 0): number => {
  let w = 0
  for (let i = 0; i < N; i++) if (duel(foe, c, usesMagic, streak)) w++
  return w / N
}

/** P(cleared within three tries), each retry eased by Dream Dust. */
const within3 = (foe: number, c: number, usesMagic: boolean, first: number): number =>
  1 - (1 - first) * (1 - rate(foe, c, usesMagic, 1)) * (1 - rate(foe, c, usesMagic, 2))

const pct = (x: number): string => `${(x * 100).toFixed(1)} %`

describe.skipIf(!process.env.WINRATE)('difficulty on the real duel (§7.2, the core child)', () => {
  for (let c = 0; c < 10; c++) {
    const stdTarget = c < 6 ? 0.9 : 0.85
    const bossTarget = c < 6 ? 0.75 : 0.6
    it(`chapter ${c + 1}: standard ≥ ${stdTarget * 100} %, boss ≥ ${bossTarget * 100} %, all ≥ 95 % within 3`, () => {
      const n12 = rate(shadowOf(c), c, false)
      const n34 = rate(shadowOf(c), c, true)
      const boss = rate(guardianOf(c), c, true)
      const n34x3 = within3(shadowOf(c), c, true, n34)
      const bossx3 = within3(guardianOf(c), c, true, boss)
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
