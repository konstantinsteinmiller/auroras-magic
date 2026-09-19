// The first-launch intro (story-spec §8.26): who sees it, how its clock runs,
// and how it ends.
//
//   • a fresh save has not seen it; a save from before it existed, with any
//     progress, counts as seen — a returning player is never sent back
//     through the picture book;
//   • it holds, silent, on its opening frame until the first-load ad has
//     settled (C30), then plays its five beats in order;
//   • it ends exactly once — at its last frame, from Play, or from Skip —
//     and says which, and at which beat.

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultCampaign, readCampaign, NODE_COUNT } from '@/game/campaign/state'
import { emptyBitset, setBit } from '@/game/campaign/bitset'

let settle: () => void = () => {}
vi.mock('@/use/useFirstLoadInterstitial', () => ({
  firstLoadAdSettled: () => new Promise<void>((r) => { settle = r })
}))

describe('who sees the intro', () => {
  it('a fresh save has not', () => {
    expect(defaultCampaign().introSeen).toBe(false)
    expect(readCampaign(null).introSeen).toBe(false)
    expect(readCampaign({}).introSeen).toBe(false)
  })

  it('a save from before the intro, with progress, counts as seen', () => {
    expect(readCampaign({ furthestNode: 0 }).introSeen).toBe(true)
    expect(readCampaign({ furthestNode: -1, dialoguesSeen: setBit(emptyBitset(NODE_COUNT), 0) }).introSeen).toBe(true)
    expect(readCampaign({ furthestNode: -1, dialoguesSeen: emptyBitset(NODE_COUNT) }).introSeen).toBe(false)
  })

  it('an explicit answer always wins, and survives a round trip', () => {
    expect(readCampaign({ furthestNode: 7, introSeen: false }).introSeen).toBe(false)
    expect(readCampaign({ introSeen: true }).introSeen).toBe(true)
    const c = defaultCampaign()
    c.introSeen = true
    expect(readCampaign(JSON.parse(JSON.stringify(c)))).toEqual(c)
  })
})

describe('the intro\'s clock', () => {
  beforeEach(() => { vi.resetModules() })

  const load = async () => {
    const intro = await import('@/game/story/intro')
    const { introHud } = await import('@/use/useIntroHud')
    return { ...intro, introHud }
  }
  const run = (step: (dt: number) => void, s: number): void => {
    for (let k = 0; k < s; k += 1 / 30) step(1 / 30)
  }

  it('holds on its first frame until the first-load ad has settled', async () => {
    const m = await load()
    const done = vi.fn()
    m.beginIntro(done)
    run(m.updateIntro, 3)
    expect(m.introState()).toMatchObject({ running: true, held: true, t: 0, beat: 0 })
    settle()
    await Promise.resolve()
    run(m.updateIntro, 1)
    expect(m.introState().held).toBe(false)
    expect(m.introState().t).toBeGreaterThan(0.9)
    expect(done).not.toHaveBeenCalled()
    m.skipIntro()
  })

  it('plays five beats in order, shows the title then Play, and ends once', async () => {
    const m = await load()
    const done = vi.fn()
    m.beginIntro(done)
    settle()
    await Promise.resolve()
    expect(m.INTRO_BEATS).toBe(5)
    expect(m.INTRO_LEN).toBeCloseTo(m.BEAT_LEN.reduce((a, b) => a + b, 0))
    expect(m.INTRO_LEN).toBeLessThan(22) // short: a first-time player is waiting to play
    const beats: number[] = []
    let titled = false
    let played = false
    for (let k = 0; k < m.INTRO_LEN + 1; k += 1 / 30) {
      m.updateIntro(1 / 30)
      const s = m.introState()
      if (s.running && beats.at(-1) !== s.beat) beats.push(s.beat)
      if (m.introHud.title) titled = true
      if (m.introHud.play) {
        played = true
        expect(s.beat).toBe(4)
      }
    }
    expect(beats).toEqual([0, 1, 2, 3, 4])
    expect(titled).toBe(true)
    expect(played).toBe(true)
    expect(done).toHaveBeenCalledTimes(1)
    expect(done).toHaveBeenCalledWith(false, 4)
    expect(m.introState().running).toBe(false)
    // A late Skip after the end changes nothing.
    m.skipIntro()
    expect(done).toHaveBeenCalledTimes(1)
  })

  it('Skip ends it at once, saying so and where', async () => {
    const m = await load()
    const done = vi.fn()
    m.beginIntro(done)
    settle()
    await Promise.resolve()
    run(m.updateIntro, 5)
    m.skipIntro()
    expect(done).toHaveBeenCalledWith(true, 1)
    expect(m.introHud.beat).toBe(-1)
    expect(m.introHud.title).toBe(false)
    expect(m.introHud.play).toBe(false)
  })

  it('a tap on the last page plays, a tap before it does not', async () => {
    const m = await load()
    const done = vi.fn()
    m.beginIntro(done)
    settle()
    await Promise.resolve()
    run(m.updateIntro, 2)
    m.introPointerDown(10, 10)
    expect(done).not.toHaveBeenCalled()
    run(m.updateIntro, m.INTRO_LEN - m.BEAT_LEN[4] - 2 + 0.5)
    expect(m.introState().beat).toBe(4)
    m.introPointerDown(10, 10)
    expect(done).toHaveBeenCalledWith(false, 4)
  })
})
