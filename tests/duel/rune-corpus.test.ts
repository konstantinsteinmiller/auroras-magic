// @vitest-environment node
// The frozen rune corpus (story-spec §5.10). It pins, stroke by stroke, what
// the recogniser answers for 500 variations of the four shipped runes plus 25
// junk strokes, so no new rune can quietly move a boundary the four rely on.
//
// Regenerate the fixture ONLY for a deliberate recogniser change, and commit
// the fixture diff alongside that change:
//
//   UPDATE_RUNE_CORPUS=1 pnpm vitest run tests/duel/rune-corpus.test.ts

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { recognise } from '@/game/duel/runes'
import { buildRuneCorpus } from './rune-corpus.gen'

const FIXTURE = join(process.cwd(), 'tests', 'duel', 'rune-corpus.fixture.json')

interface Fixture {
  /** Bump when the generator changes on purpose. */
  version: number
  count: number
  /** One entry per corpus stroke: the rune id, or -1 for "not a rune". */
  results: number[]
}

const corpus = buildRuneCorpus()

describe('rune corpus: the four shipped runes are frozen', () => {
  it('has the documented shape (500 rune strokes + 25 junk)', () => {
    expect(corpus.length).toBe(525)
    expect(corpus.filter((c) => c.bucket === 'junk').length).toBe(25)
  })

  it('classifies every stroke exactly as the checked-in fixture says', () => {
    const results = corpus.map((c) => recognise(c.stroke))
    if (!process.env.UPDATE_RUNE_CORPUS && !existsSync(FIXTURE)) {
      throw new Error(
        'rune-corpus.fixture.json is missing. Regenerate it on purpose: ' +
          'UPDATE_RUNE_CORPUS=1 pnpm vitest run tests/duel/rune-corpus.test.ts'
      )
    }
    if (process.env.UPDATE_RUNE_CORPUS) {
      const fx: Fixture = { version: 1, count: results.length, results }
      writeFileSync(FIXTURE, `${JSON.stringify(fx)}\n`)
    }
    const fixture = JSON.parse(readFileSync(FIXTURE, 'utf8')) as Fixture
    expect(fixture.count).toBe(corpus.length)
    expect(results).toEqual(fixture.results)
  })
})
