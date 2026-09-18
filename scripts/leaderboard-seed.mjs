/**
 * ─── The seeded board, for the portals that can never gain a player ─────────
 *
 * Three builds cannot reach the leaderboard Worker at all, so they cannot READ
 * the board and can never WRITE to it:
 *   - Poki forbids every external runtime request;
 *   - Yandex's moderators reject third-party storage URLs in the bundle;
 *   - Playgama's archive is also the YouTube Playables submission, which
 *     forbids external calls.
 * Their baked copy is the whole board for the life of the build.
 *
 * WHAT THIS BOARD IS: a modelled population, generated from a stated
 * retention curve of LIFETIME DUELS WON, the same quantity the game posts
 * (`reportRun(S.wins, …)`). It exists for ONE thing: the result screen's rank
 * badge, "#1 130 of 3 000", which `rankFromDist` computes exactly from the
 * histogram below.
 *
 * NO INVENTED PEOPLE. The owner chose "rank badge only" for these builds
 * (2026-09-18): the top-100 list is not shown there, so this file publishes
 * NO rows and NO names. Only the histogram and the population. No fabricated
 * player appears anywhere, not even in the bundle's data.
 *
 * Determinism is the point: fixed anchors, no randomness, fixed epoch. Re-running
 * reproduces the committed file byte for byte, so a player's rank never moves
 * for a reason they cannot see.
 *
 *     pnpm leaderboard:seed
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const SEED_FILE = resolve(
  fileURLToPath(new URL('../data/leaderboard-seed.json', import.meta.url))
)

/**
 * How many players the board claims. Sized to what a new cozy portal game
 * plausibly has, not to what looks impressive. The sibling projects run from a
 * few hundred to ~5 000 on live traffic.
 */
export const TOTAL = 3_000

/**
 * The retention curve: `wins → fraction of players whose lifetime wins ≥ wins`.
 *
 * Only players with at least one win are on a board at all: `reportRun` never
 * posts a 0. The story campaign is 50 duels, so a finisher sits around 50–80
 * wins with its losses and replays. The long tail past that is the players who
 * keep duelling for fun.
 *
 *     1 → 1.000   everyone on the board has won once
 *     3 → 0.600   40 % stop after a win or two (the first-session drop)
 *     6 → 0.380   most early leavers are gone by chapter 1's boss
 *    11 → 0.220
 *    21 → 0.100   ~10 % reach chapter 4+
 *    36 → 0.042
 *    51 → 0.020   ~2 % have won as many duels as the whole story holds
 *    81 → 0.0070
 *   121 → 0.0022
 *   181 → 0.0006
 *   261 → 0.00012
 *   301 → 0       nobody past 300 (well under the Worker's 50 000 bound)
 *
 * Interpolated log-linearly between anchors, so the histogram decays smoothly
 * rather than stepping at the anchors.
 */
const SURVIVAL = [
  [1, 1],
  [3, 0.6],
  [6, 0.38],
  [11, 0.22],
  [21, 0.1],
  [36, 0.042],
  [51, 0.02],
  [81, 0.007],
  [121, 0.0022],
  [181, 0.0006],
  [261, 0.00012],
  [301, 0]
]

/** Fraction of players with at least `wins` wins. */
export const survival = (wins) => {
  if (wins <= 1) return 1
  for (let i = 0; i < SURVIVAL.length - 1; i++) {
    const [x0, y0] = SURVIVAL[i]
    const [x1, y1] = SURVIVAL[i + 1]
    if (wins < x0 || wins > x1) continue
    const t = (wins - x0) / (x1 - x0)
    if (y1 <= 0 || y0 <= 0) return y0 + (y1 - y0) * t
    return y0 * Math.pow(y1 / y0, t)
  }
  return 0
}

/** The board's stated build date. A CONSTANT, so the file is byte-reproducible. */
const SEED_EPOCH = Date.UTC(2026, 8, 18)

export const buildSeed = () => {
  // Per-score counts from the survival curve, score-DESC (the order every rank
  // walk in the game depends on).
  const maxWins = SURVIVAL[SURVIVAL.length - 1][0]
  const counts = []
  for (let wins = 1; wins <= maxWins; wins++) {
    const n = Math.round(TOTAL * (survival(wins) - survival(wins + 1)))
    if (n > 0) counts.push([wins, n])
  }
  counts.sort((a, b) => b[0] - a[0])

  // Rounding leaves the sum a little off; correct it on the biggest bucket.
  const sum = counts.reduce((a, [, n]) => a + n, 0)
  if (sum !== TOTAL) {
    let biggest = 0
    for (let i = 1; i < counts.length; i++) if (counts[i][1] > counts[biggest][1]) biggest = i
    counts[biggest][1] += TOTAL - sum
  }

  return {
    source: 'seeded:retention-curve',
    fetchedAt: SEED_EPOCH,
    updatedAt: SEED_EPOCH,
    total: counts.reduce((a, [, n]) => a + n, 0),
    // Deliberately empty: no invented names on a family-friendly board.
    entries: [],
    dist: counts
  }
}

// ─── CLI ────────────────────────────────────────────────────────────────────

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const seed = buildSeed()
  mkdirSync(dirname(SEED_FILE), { recursive: true })
  writeFileSync(SEED_FILE, JSON.stringify(seed, null, 2) + '\n', 'utf-8')

  const band = (lo, hi) => seed.dist.filter(([s]) => s >= lo && s <= hi).reduce((a, [, n]) => a + n, 0)
  const pct = (n) => `${((100 * n) / seed.total).toFixed(1)}%`
  console.log(`[seed] ${seed.total} players, top score ${seed.dist[0][0]} wins, no published rows`)
  for (const [lo, hi] of [[1, 2], [3, 5], [6, 10], [11, 20], [21, 50], [51, 300]]) {
    console.log(`[seed]   ${String(lo).padStart(3)}-${String(hi).padEnd(3)} wins ${String(band(lo, hi)).padStart(5)}  ${pct(band(lo, hi))}`)
  }
  console.log(`[seed] wrote ${SEED_FILE}`)
}
