// @vitest-environment node
// The S0 gate for the full 12-rune alphabet (story-spec §5.11), run with the
// normal suite. Deterministic: fixed seed, fixed draw count. The same draws
// are printed as a confusion report by
//   node --import ./tools/ts-resolve.mjs tools/rune-spike/measure.mjs

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { recognise, ALL_RUNES_MASK, FROZEN_MASK, templateCounts } from '@/game/duel/runes'
import { RUNE_DEFS } from '@/game/duel/runeDefs'
import { buildRuneCorpus } from './rune-corpus.gen'
import { stream, sloppy, junkDraw, JUNK } from './rune-draws'

const DRAWS = 600

describe('rune alphabet: the 12-rune S0 gate', () => {
  it('builds the documented template bank', () => {
    // 4 frozen (16+6+2+16) + 8 story runes. LIGHTNING carries 4 turn-count
    // variants, ×2 directions.
    expect(templateCounts()).toEqual([16, 6, 2, 16, 2, 16, 8, 16, 2, 16, 16, 16])
  })

  it('recognises every story rune ≥ 95 % of the time with all 12 runes live', () => {
    const rnd = stream(2026)
    for (const def of RUNE_DEFS) {
      if (def.id < 4) continue
      let ok = 0
      for (let i = 0; i < DRAWS; i++) if (recognise(sloppy(def.slug, rnd), ALL_RUNES_MASK) === def.id) ok++
      expect(ok / DRAWS, `${def.slug} recall`).toBeGreaterThanOrEqual(0.95)
    }
  })

  it('still reads the four shipped runes ≥ 99 % of the time with all 12 live', () => {
    const rnd = stream(918)
    for (const def of RUNE_DEFS.slice(0, 4)) {
      let ok = 0
      for (let i = 0; i < DRAWS; i++) if (recognise(sloppy(def.slug, rnd), ALL_RUNES_MASK) === def.id) ok++
      expect(ok / DRAWS, `${def.slug} recall`).toBeGreaterThanOrEqual(0.99)
    }
  })

  it('accepts junk ≤ 5 % of the time with all 12 live', () => {
    const rnd = stream(77)
    for (const name of Object.keys(JUNK)) {
      let accepted = 0
      for (let i = 0; i < DRAWS; i++) if (recognise(junkDraw(name, rnd), ALL_RUNES_MASK) >= 0) accepted++
      expect(accepted / DRAWS, `${name} false-accept`).toBeLessThanOrEqual(0.05)
    }
  })

  it('never lets a story rune steal a shipped rune\'s stroke (frozen corpus, all 12 live)', () => {
    const fixture = JSON.parse(
      readFileSync(join(process.cwd(), 'tests', 'duel', 'rune-corpus.fixture.json'), 'utf8')
    ) as { results: number[] }
    const corpus = buildRuneCorpus()
    corpus.forEach((c, i) => {
      if (c.bucket === 'junk') return
      expect(recognise(c.stroke, ALL_RUNES_MASK), `corpus stroke ${i} (${c.bucket})`).toBe(fixture.results[i])
    })
  })

  it('an unearned rune is no target: a circle is not WATER until WATER is unlocked', () => {
    const rnd = stream(5)
    const circle = sloppy('water', rnd)
    expect(recognise(circle)).toBe(-1)
    expect(recognise(circle, FROZEN_MASK)).toBe(-1)
    expect(recognise(circle, FROZEN_MASK | (1 << 5))).toBe(5)
  })
})
