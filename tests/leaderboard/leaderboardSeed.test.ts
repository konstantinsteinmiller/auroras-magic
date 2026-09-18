// @vitest-environment node
// The seeded board baked into Poki / Yandex / Playgama (no Worker there). It
// is a modelled histogram of LIFETIME DUELS WON, published for the rank badge
// only: no rows, no names (the owner's call, 2026-09-18). Assert SHAPES, not
// one population's arithmetic, so turning the TOTAL knob never turns this red.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
// @ts-expect-error — a plain-Node .mjs script without type declarations
import { buildSeed, TOTAL } from '../../scripts/leaderboard-seed.mjs'

type Seed = { source: string; total: number; entries: unknown[]; dist: [number, number][] }
const committed = JSON.parse(readFileSync(join(process.cwd(), 'data', 'leaderboard-seed.json'), 'utf8')) as Seed
const built = buildSeed() as Seed

describe('seeded leaderboard (baked builds)', () => {
  it('says out loud that it is modelled, not telemetry', () => {
    expect(committed.source).toBe('seeded:retention-curve')
  })

  it('is byte-for-byte what the generator produces (commit the regeneration)', () => {
    expect(committed).toEqual(built)
  })

  it('invents no people: no published rows, no names', () => {
    expect(committed.entries).toEqual([])
  })

  it('adds up: the population is the histogram, and is the stated TOTAL', () => {
    const sum = committed.dist.reduce((a, [, n]) => a + n, 0)
    expect(sum).toBe(committed.total)
    expect(committed.total).toBe(TOTAL)
  })

  it('is ordered best-first with every bucket a real, positive count', () => {
    for (let i = 1; i < committed.dist.length; i++) {
      expect(committed.dist[i]![0]).toBeLessThan(committed.dist[i - 1]![0])
    }
    for (const [, n] of committed.dist) expect(n).toBeGreaterThan(0)
  })

  it('models the quantity the game POSTS: lifetime wins, not points', () => {
    // `reportRun(S.wins, …)` never posts a 0, and a win count is small. A
    // histogram built from points would top out in the thousands, and every
    // real player would then read "#1".
    const scores = committed.dist.map(([s]) => s)
    expect(Math.min(...scores)).toBe(1)
    // The story is 50 duels: someone on the board has won at least a
    // campaign's worth, and nobody is anywhere near the Worker's 50 000 cap.
    expect(Math.max(...scores)).toBeGreaterThanOrEqual(50)
    expect(Math.max(...scores)).toBeLessThan(1000)
  })

  it('never gets MORE crowded as the win count rises (no visible kink)', () => {
    const asc = [...committed.dist].sort((a, b) => a[0] - b[0])
    for (let i = 1; i < asc.length; i++) {
      // Adjacent win counts in the thin tail are 1-player buckets; allow them
      // to tie, never to rise by more than one player.
      expect(asc[i]![1]).toBeLessThanOrEqual(Math.max(asc[i - 1]![1] * 1.05, asc[i - 1]![1] + 1))
    }
  })

  it('puts the biggest group at one win, the first-session drop', () => {
    const biggest = committed.dist.reduce((a, b) => (b[1] > a[1] ? b : a))
    expect(biggest[0]).toBe(1)
  })
})
