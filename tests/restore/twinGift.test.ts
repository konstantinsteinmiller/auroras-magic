// The Twin Gift's press-and-hold on the map (story-spec §3.3.4, §8.3): 1.2 s
// to open, a ring in step with the hold, the bow loosening in four steps, an
// early release receding with no penalty, then the burst and the claim.

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive, computed } from 'vue'

const claim = vi.fn(async () => {})
vi.mock('@/use/useDuelRewards', () => {
  const twinGift = reactive({ node: -1, rev: 0, bloomed: -1 })
  return {
    TWIN_HOLD_MS: 1200,
    twinGift,
    rewardLive: computed(() => true),
    claimTwinGift: () => claim()
  }
})
vi.mock('@/game/duel/audio', () => ({ sfx: vi.fn() }))
vi.mock('@/use/useHaptics', () => ({ haptic: vi.fn() }))

const load = async () => {
  const rewards = await import('@/use/useDuelRewards')
  const twin = await import('@/game/map/twinGift')
  return { ...rewards, ...twin }
}
const AT: [number, number, number] = [200, 300, 60]
const step = (fn: (dt: number, at: [number, number, number]) => void, seconds: number): void => {
  for (let t = 0; t < seconds - 1e-9; t += 1 / 60) fn(1 / 60, AT)
}

beforeEach(async () => {
  claim.mockClear()
  const m = await load()
  m.__resetTwin()
  m.twinGift.node = 2
})

describe('the Twin Gift hold', () => {
  it('opens after 1.2 s held — not before — then bursts and claims', async () => {
    const m = await load()
    m.twinHoldStart()
    step(m.stepTwin, 1.1)
    expect(m.twinHold01()).toBeGreaterThan(0.85)
    expect(m.__twinState().burst).toBe(false)
    step(m.stepTwin, 0.15)
    expect(m.__twinState().burst).toBe(true)
    expect(claim).not.toHaveBeenCalled() // the 250 ms burst plays first
    step(m.stepTwin, 0.3)
    expect(claim).toHaveBeenCalledTimes(1)
  })

  it('an early release recedes over 200 ms and pays nothing', async () => {
    const m = await load()
    m.twinHoldStart()
    step(m.stepTwin, 0.6)
    m.twinHoldCancel()
    expect(m.twinHold01()).toBe(0)
    step(m.stepTwin, 2)
    expect(claim).not.toHaveBeenCalled()
    // …and the next hold starts from zero: the rule is "don't let go".
    m.twinHoldStart()
    step(m.stepTwin, 0.6)
    expect(m.twinHold01()).toBeLessThan(0.55)
  })

  it('offers nothing when there is no gift on the map', async () => {
    const m = await load()
    m.twinGift.node = -1
    m.twinHoldStart()
    step(m.stepTwin, 2)
    expect(m.__twinState().holding).toBe(false)
    expect(claim).not.toHaveBeenCalled()
  })
})
