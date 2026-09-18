// Pins the literal string values of SAVE_KEYS. These keys are a contract with
// every player's save blob — renaming one strands existing players' progress on
// the old field, and the cloud strategies key their manifests off these exact
// strings. `src/keys.ts` is the single source of truth; this test is the tripwire
// that catches an accidental rename during a refactor.

import { describe, expect, it } from 'vitest'
import { SAVE_KEYS, isPayloadKey, META_KEY } from '@/utils/save/SaveMergePolicy'
import { STATE_KEY } from '@/use/useGameState'

describe('SAVE_KEYS values are stable', () => {
  it('BEST_STAGE key is the literal "am_ladder"', () => {
    expect(SAVE_KEYS.BEST_STAGE).toBe('am_ladder')
  })
  it('COINS key is the literal "am_coins"', () => {
    expect(SAVE_KEYS.COINS).toBe('am_coins')
  })
  it('UPGRADES key is the literal "am_upgrades"', () => {
    expect(SAVE_KEYS.UPGRADES).toBe('am_upgrades')
  })
  it('RUNS key is the literal "am_duels"', () => {
    expect(SAVE_KEYS.RUNS).toBe('am_duels')
  })
})

describe('the persisted surface is exactly one state blob plus the meta blob', () => {
  it('accepts the state blob and the meta blob', () => {
    expect(STATE_KEY).toBe('auroras_magic_state')
    expect(isPayloadKey(STATE_KEY)).toBe(true)
    expect(isPayloadKey(META_KEY)).toBe(true)
  })

  it('accepts stray per-field am_* writes so nothing is silently dropped', () => {
    expect(isPayloadKey(SAVE_KEYS.COINS)).toBe(true)
    expect(isPayloadKey('am_anything_new')).toBe(true)
  })

  it('rejects foreign keys so ad-tech / dev scribbles never reach the cloud', () => {
    for (const key of ['debug', 'cheat', 'prebid11_exp', 'li-module-enabled', 'epic_stage', 'spinner_user_language']) {
      expect(isPayloadKey(key)).toBe(false)
    }
  })
})
