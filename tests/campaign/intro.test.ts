// The first-launch intro (story-spec §8.26): who sees it, how its clock runs,
// and how it ends.
//
//   • a fresh save has not seen it; a save from before it existed, with any
//     progress, counts as seen — a returning player is never sent back
//     through the picture book;
//   • it holds, silent, on its opening frame until the first-load ad has
//     settled (C30), then plays its five beats in order;
//   • it ends exactly once — at its last frame, from Play, or from Skip —
//     and says which, and at which beat;
//   • a first-time player meets it in two parts (owner, 2026-09-24): the
//     PROLOGUE (Aurora's hello, then Umbra's dust) in front of the first
//     duel, cut while Umbra is still there to be fought, and the LESSON (the
//     magic, the sponge, Play) at the first gift. `prologueSeen` records the
//     first, and a save already past it counts as having met it.

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

describe('who sees the prologue', () => {
  it('a fresh save has not', () => {
    expect(defaultCampaign().prologueSeen).toBe(false)
    expect(readCampaign(null).prologueSeen).toBe(false)
    expect(readCampaign({}).prologueSeen).toBe(false)
  })

  it('a save from before it, already past node 0\'s start, counts as seen', () => {
    // Mid-first-duel: the opener is recorded the moment it is raised.
    expect(readCampaign({ introSeen: false, dialoguesSeen: setBit(emptyBitset(NODE_COUNT), 0) }).prologueSeen).toBe(true)
    // A won duel, gift waiting, book unseen: past the prologue's place.
    expect(readCampaign({ furthestNode: 0, introSeen: false }).prologueSeen).toBe(true)
    // Saw the whole book.
    expect(readCampaign({ introSeen: true }).prologueSeen).toBe(true)
    expect(readCampaign({ furthestNode: -1, introSeen: false, dialoguesSeen: emptyBitset(NODE_COUNT) }).prologueSeen).toBe(false)
  })

  it('an explicit answer wins, and survives a round trip', () => {
    expect(readCampaign({ furthestNode: 3, prologueSeen: false }).prologueSeen).toBe(false)
    const c = defaultCampaign()
    c.prologueSeen = true
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

describe('the book in two parts', () => {
  beforeEach(() => { vi.resetModules() })

  const load = async () => {
    const intro = await import('@/game/story/intro')
    const { introHud } = await import('@/use/useIntroHud')
    return { ...intro, introHud }
  }
  /** Play a part to its end, recording the beats, the title and Play. */
  const playThrough = async (part: 'prologue' | 'lesson') => {
    const m = await load()
    const done = vi.fn()
    m.beginIntro(done, part)
    settle()
    await Promise.resolve()
    const beats: number[] = []
    let titled = false
    let played = false
    let ranFor = 0
    while (m.introState().running && ranFor < 30) {
      const s = m.introState()
      if (beats.at(-1) !== s.beat) beats.push(s.beat)
      m.updateIntro(1 / 30)
      ranFor += 1 / 30
      if (m.introHud.title) titled = true
      if (m.introHud.play) played = true
    }
    return { m, done, beats, titled, played, ranFor }
  }

  it('Umbra arrives two seconds in (owner, 2026-09-24)', async () => {
    const m = await load()
    expect(m.BEAT_LEN[0]).toBe(2)
  })

  it('the prologue: the hello, then Umbra\'s dust — and it ends while she is still there', async () => {
    const { m, done, beats, titled, played, ranFor } = await playThrough('prologue')
    expect(beats).toEqual([0, 1])
    expect(titled).toBe(true)
    // No Play button: it turns into the duel by itself.
    expect(played).toBe(false)
    expect(done).toHaveBeenCalledTimes(1)
    expect(done).toHaveBeenCalledWith(false, 1)
    // About five seconds: long enough for the dust to settle, short enough to
    // stand in front of the first duel.
    const [from, to] = m.PART_SPAN.prologue
    expect(from).toBe(0)
    expect(to - from).toBeLessThan(6)
    expect(ranFor).toBeCloseTo(to - from, 1)
    // Cut before beat 1 ends, which is when Umbra flies off.
    expect(to).toBeLessThan(m.BEAT_LEN[0] + m.BEAT_LEN[1])
  })

  it('a tap during the prologue does not end it; Skip does, at once', async () => {
    const m = await load()
    const done = vi.fn()
    m.beginIntro(done, 'prologue')
    settle()
    await Promise.resolve()
    for (let k = 0; k < 3; k += 1 / 30) m.updateIntro(1 / 30)
    m.introPointerDown(10, 10)
    expect(done).not.toHaveBeenCalled()
    m.skipIntro()
    expect(done).toHaveBeenCalledWith(true, 1)
  })

  it('the prologue holds for the first-load ad too — it is now the first screen', async () => {
    const m = await load()
    const done = vi.fn()
    m.beginIntro(done, 'prologue')
    for (let k = 0; k < 3; k += 1 / 30) m.updateIntro(1 / 30)
    expect(m.introState()).toMatchObject({ running: true, held: true, t: 0, beat: 0, part: 'prologue' })
    m.skipIntro()
  })

  it('the lesson: the magic, the sponge and Play — no title, no Umbra', async () => {
    const { m, done, beats, titled, played } = await playThrough('lesson')
    expect(beats).toEqual([2, 3, 4])
    expect(titled).toBe(false)
    expect(played).toBe(true)
    expect(done).toHaveBeenCalledWith(false, 4)
    expect(m.PART_SPAN.lesson).toEqual([m.BEAT_LEN[0] + m.BEAT_LEN[1], m.INTRO_LEN])
  })

  it('the lesson opens on its own first page, not on the hello', async () => {
    const m = await load()
    m.beginIntro(vi.fn(), 'lesson')
    expect(m.introState().beat).toBe(2)
    expect(m.introHud.beat).toBe(2)
    m.skipIntro()
  })

  it('together the two parts leave out only Umbra flying away', async () => {
    const m = await load()
    const [, pEnd] = m.PART_SPAN.prologue
    const [lStart, lEnd] = m.PART_SPAN.lesson
    expect(m.PART_SPAN.whole).toEqual([0, m.INTRO_LEN])
    expect(pEnd).toBeLessThanOrEqual(lStart)
    expect(lStart - pEnd).toBeLessThan(1.5)
    expect(lEnd).toBe(m.INTRO_LEN)
  })
})
