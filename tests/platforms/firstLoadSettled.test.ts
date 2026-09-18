// C30 / §11.7: the dialogue waits for a portal's mandatory first-load ad —
// and on every build that never shows one, it does not wait at all.

import { describe, expect, it } from 'vitest'
import { firstLoadAdSettled, FIRST_LOAD_AD_BUILD } from '@/use/useFirstLoadInterstitial'

describe('firstLoadAdSettled', () => {
  it('resolves at once on a build without a first-load ad', async () => {
    expect(FIRST_LOAD_AD_BUILD).toBe(false)
    let done = false
    void firstLoadAdSettled().then(() => { done = true })
    await Promise.resolve()
    await Promise.resolve()
    expect(done).toBe(true)
  })
})
