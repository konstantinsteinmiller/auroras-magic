// @vitest-environment node
// The family-friendly name rule: every name on the board is one the game
// minted, and the Worker refuses anything else. These tests keep the client's
// copy of the vocabulary and the Worker's copy identical, because a word that
// exists on only one side is either a rejected post or an unvalidated name.

import { describe, expect, it } from 'vitest'
import * as client from '@/game/leaderboardNames'
import * as worker from '../../worker/src/names'
import { mintName } from '@/use/usePlayerIdentity'

describe('leaderboard names (client ↔ Worker)', () => {
  it('ships the SAME vocabulary on both sides', () => {
    expect([...client.NAME_ADJECTIVES]).toEqual([...worker.NAME_ADJECTIVES])
    expect([...client.NAME_NOUNS]).toEqual([...worker.NAME_NOUNS])
    expect(client.NAME_MAX).toBe(worker.NAME_MAX)
  })

  it('mints only names the Worker will accept, and never truncates one', () => {
    for (let i = 0; i < 2000; i++) {
      const name = mintName()
      expect(worker.isMintedName(name), name).toBe(true)
      expect(name.length).toBeLessThanOrEqual(worker.NAME_MAX)
    }
  })

  it('can mint every word, so no word is dead weight', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 20000; i++) for (const w of mintName().split(' ').slice(0, 2)) seen.add(w)
    for (const w of [...client.NAME_ADJECTIVES, ...client.NAME_NOUNS]) expect(seen.has(w), w).toBe(true)
  })

  it('refuses free text, near-misses and injection shapes', () => {
    for (const bad of [
      'Hello World', 'sunny pony 482', 'Sunny Pony', 'Sunny Pony 48', 'Sunny Pony 4821',
      'Sunny Pony 082', 'Sunny  Pony 482', ' Sunny Pony 482', 'Sunny Pony 482 ',
      'Sunny Dragon 482', 'Grim Pony 482', 'Sunny Pony 482​', '<b>Sunny</b> Pony 482',
      '', null, 42, undefined
    ]) {
      expect(worker.isMintedName(bad), String(bad)).toBe(false)
    }
  })
})
