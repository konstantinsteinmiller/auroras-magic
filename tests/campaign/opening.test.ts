// The cold boot's opening (retention-roadmap item 2).
//
// A stranger's first seconds used to be spent watching: a 19 s picture book,
// then a chapter title page and three bubbles, and only then something to
// draw. What must now be true, and is easy to break again by accident:
//
//   • NODE 0 IS PLAYED, NOT READ. A fresh save meets the picture book's
//     ~5 s PROLOGUE (Aurora, then Umbra dusting the meadow), then goes
//     straight into the first duel — against Umbra — with the opener printed
//     over the arena, all three beats of it, turning themselves over (owner,
//     2026-09-23, 2026-09-24). The prologue plays once; a player who comes
//     back mid-duel goes straight into the duel;
//   • only node 0. Every other node keeps its full dialogue scene — the
//     branch is the whole risk here, because an arena opener quietly applied
//     to node 7 would put the story on a clock nobody asked for;
//   • THE SKIP AFFORDANCE SURVIVES, and skips the WHOLE sequence rather than
//     one beat of it. Over the arena there is no page to turn, so the icon is
//     the only way to put the words away without drawing, and it still
//     reports `dialogue_skip`;
//   • the bubbles take no taps. Every press belongs to the rune being drawn
//     under them, and the sequence ends wherever it has got to when the first
//     stroke lands — nobody waits for Umbra to answer;
//   • the rest of the book, its LESSON, still plays once — between that
//     first win and the first CLEANING, which it is the lesson for (owner,
//     2026-09-23) — and `introSeen` still means a returning player never sees
//     it again;
//   • a card with its gift still on it opens the gift. A won node is
//     otherwise practice, so a press on the picture instead of the bow sent
//     the owner back into the duel he had just won, twice.

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '@/i18n/locales/en'

// The duel, the map camera and the picture book are all somebody else's
// business here; what is under test is which of them is reached, and when.
vi.mock('@/game/flow/duelFlow', () => ({ startDuel: vi.fn() }))
vi.mock('@/game/map/map', () => ({ focusMap: vi.fn() }))
vi.mock('@/game/story/intro', () => ({ beginIntro: vi.fn() }))
// The cleaning is its own scene's business: what matters here is that the
// flow reaches it, and when.
vi.mock('@/game/flow/restoreFlow', () => ({ openSector: vi.fn() }))
// The page turn runs its body at once: these specs are about where the flow
// lands, not how long the paper takes to get there.
vi.mock('@/game/flow/transition', () => ({
  dipTo: (fn: () => void) => { fn() },
  fading: () => false,
  DIP_PUSH: 1,
  DIP_PAGE: 1
}))
vi.mock('@/use/useAnalytics', () => ({ track: vi.fn() }))
// Both are canvas work jsdom has no canvas for.
vi.mock('@/game/story/portrait', () => ({ portraitUrl: () => 'data:,' }))
vi.mock('@/game/duel/audio', () => ({ chatter: vi.fn(), sfx: vi.fn() }))

import DialogueBubbles from '@/components/story/DialogueBubbles.vue'
import { dialogueFor, openingLines, OPENING_NODE } from '@/game/story/story'
import { bootScene, openGift, playIntro, closeOpening, playNode } from '@/game/flow/nodes'
import { startDuel } from '@/game/flow/duelFlow'
import { openSector } from '@/game/flow/restoreFlow'
import { beginIntro } from '@/game/story/intro'
import { track } from '@/use/useAnalytics'
import { S } from '@/game/duel/state'
import { defaultCampaign } from '@/game/campaign/state'
import { setBit } from '@/game/campaign/bitset'
import { acquireAppPause } from '@/use/useGamePause'
import { openingHud } from '@/use/useFlow'

const freshSave = (): void => {
  S.campaign = defaultCampaign()
  S.flow.scene = 'boot'
  S.flow.node = -1
  openingHud.live = false
  vi.clearAllMocks()
}

/** A save that has won and restored node 0: the next node is 1. */
const pastNodeZero = (): void => {
  freshSave()
  S.campaign.furthestNode = 0
  S.campaign.sectorsDone = setBit(S.campaign.sectorsDone, 0)
  S.campaign.introSeen = true
  S.campaign.prologueSeen = true
}

/** The book's own end: watched through, or skipped at `beat`. */
const bookEnds = (skipped = false, beat = 4): void => {
  const done = vi.mocked(beginIntro).mock.calls.at(-1)![0]
  done(skipped, beat)
}
/** Which part of the book the last `beginIntro` played. */
const lastPart = (): unknown => vi.mocked(beginIntro).mock.calls.at(-1)![1]

describe('the opening lines', () => {
  beforeEach(freshSave)

  it('are chapter 1\'s whole opener — Umbra still answers', () => {
    const opener = dialogueFor(OPENING_NODE)
    expect(openingLines()).toEqual(opener)
    expect(openingLines().length).toBe(3)
    expect(openingLines().map((b) => b.speaker)).toEqual(['aurora', 'umbra', 'aurora'])
  })

  it('leave every other node its whole dialogue', () => {
    expect(dialogueFor(1).length).toBeGreaterThan(0)
    expect(dialogueFor(4).length).toBe(3)
  })
})

describe('a cold boot', () => {
  beforeEach(freshSave)

  it('opens the book\'s prologue — and only the prologue — in front of node 0', () => {
    bootScene()
    expect(beginIntro).toHaveBeenCalledTimes(1)
    expect(lastPart()).toBe('prologue')
    expect(S.flow.scene).toBe('intro')
    // Not yet: Umbra has to dust the meadow first.
    expect(startDuel).not.toHaveBeenCalled()
  })

  it('turns straight into node 0\'s duel when it ends, with the line over the arena', () => {
    bootScene()
    bookEnds(false, 1)
    expect(startDuel).toHaveBeenCalledWith(0)
    expect(openingHud.live).toBe(true)
    // No dialogue scene stood in front of it.
    expect(S.flow.scene).not.toBe('dialogue')
    // The prologue is met; the lesson is still to come, at the first gift.
    expect(S.campaign.prologueSeen).toBe(true)
    expect(S.campaign.introSeen).toBe(false)
  })

  it('…and just the same when it is skipped', () => {
    bootScene()
    bookEnds(true, 0)
    expect(startDuel).toHaveBeenCalledWith(0)
    expect(S.campaign.prologueSeen).toBe(true)
  })

  it('plays once: a player back mid-duel goes straight into the duel', () => {
    S.campaign.prologueSeen = true
    bootScene()
    expect(beginIntro).not.toHaveBeenCalled()
    expect(startDuel).toHaveBeenCalledWith(0)
    expect(openingHud.live).toBe(true)
  })

  it('records the opener as met, so nothing else offers to replay it', () => {
    bootScene()
    bookEnds()
    expect(S.campaign.dialoguesSeen).not.toEqual(defaultCampaign().dialoguesSeen)
  })

  it('folds away on demand, and never leaks into the next node', () => {
    bootScene()
    bookEnds()
    expect(openingHud.live).toBe(true)
    closeOpening()
    expect(openingHud.live).toBe(false)
    closeOpening()
    expect(openingHud.live).toBe(false)
  })
})

describe('every node after it', () => {
  beforeEach(pastNodeZero)

  it('still opens its full dialogue scene, with no bubble over the arena', () => {
    bootScene()
    expect(S.flow.scene).toBe('dialogue')
    expect(S.flow.node).toBe(1)
    expect(openingHud.live).toBe(false)
    expect(startDuel).not.toHaveBeenCalled()
  })

  it('…including when it is tapped on the map', () => {
    S.flow.scene = 'map'
    playNode(1)
    expect(S.flow.scene).toBe('dialogue')
    expect(openingHud.live).toBe(false)
  })
})

describe('the picture book\'s lesson', () => {
  /** Node 0 won, its gift still waiting, the prologue met and the rest of the
   *  book not: exactly where a brand-new player stands after her first duel. */
  const giftWaiting = (): void => {
    freshSave()
    S.campaign.furthestNode = 0
    S.campaign.prologueSeen = true
    S.flow.scene = 'map'
  }
  beforeEach(giftWaiting)

  it('plays when the first gift is opened, in front of the first cleaning', () => {
    openGift(0)
    expect(beginIntro).toHaveBeenCalledTimes(1)
    // The rest of the book, not the prologue again.
    expect(lastPart()).toBe('lesson')
    expect(S.flow.scene).toBe('intro')
    // Not yet: the lesson comes before the practice.
    expect(openSector).not.toHaveBeenCalled()
  })

  it('is the whole book for a save that won its first duel before the prologue existed', () => {
    S.campaign.prologueSeen = false
    openGift(0)
    expect(lastPart()).toBe('whole')
    bookEnds()
    expect(openSector).toHaveBeenCalledWith(0)
    expect(S.campaign.introSeen).toBe(true)
    expect(S.campaign.prologueSeen).toBe(true)
  })

  it('opens the very gift that was tapped when it ends, and counts as seen', () => {
    openGift(0)
    bookEnds()
    expect(openSector).toHaveBeenCalledWith(0)
    expect(S.campaign.introSeen).toBe(true)
  })

  it('still goes on into the cleaning when it is skipped', () => {
    openGift(0)
    bookEnds(true, 1)
    expect(openSector).toHaveBeenCalledWith(0)
    expect(S.campaign.introSeen).toBe(true)
  })

  it('never stands in front of a second cleaning', () => {
    S.campaign.introSeen = true
    openGift(0)
    expect(beginIntro).not.toHaveBeenCalled()
    expect(openSector).toHaveBeenCalledWith(0)
  })

  it('is not raised by a boot, even with the gift waiting and the book unseen', () => {
    bootScene()
    expect(beginIntro).not.toHaveBeenCalled()
    expect(S.flow.scene).toBe('map')
    expect(S.flow.node).toBe(0)
  })

  it('…and meets that player at the same tap instead', () => {
    bootScene()
    openGift(0)
    expect(beginIntro).toHaveBeenCalledTimes(1)
    bookEnds()
    expect(openSector).toHaveBeenCalledWith(0)
  })

  it('a replay from Options is the whole book, and comes back to where it was opened', () => {
    S.campaign.introSeen = true
    S.campaign.sectorsDone = setBit(S.campaign.sectorsDone, 0)
    playIntro(true)
    expect(lastPart()).toBe('whole')
    expect(S.flow.scene).toBe('intro')
    bookEnds()
    expect(S.flow.scene).toBe('map')
    expect(openSector).not.toHaveBeenCalled()
  })
})

describe('a card with its gift still on it', () => {
  beforeEach(() => {
    freshSave()
    S.campaign.furthestNode = 0
    S.campaign.introSeen = true
    S.flow.scene = 'map'
  })

  it('opens the gift, not a practice duel — every time it is pressed', () => {
    playNode(0)
    playNode(0)
    expect(startDuel).not.toHaveBeenCalled()
    expect(openSector).toHaveBeenCalledTimes(2)
    expect(openSector).toHaveBeenCalledWith(0)
  })

  it('opens the picture book first for a player who has not met it', () => {
    S.campaign.introSeen = false
    S.campaign.prologueSeen = true
    playNode(0)
    expect(startDuel).not.toHaveBeenCalled()
    expect(beginIntro).toHaveBeenCalledTimes(1)
  })

  it('once its sector is restored, it is practice again', () => {
    S.campaign.sectorsDone = setBit(S.campaign.sectorsDone, 0)
    playNode(0)
    expect(startDuel).toHaveBeenCalledWith(0)
    expect(openSector).not.toHaveBeenCalled()
  })
})

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en: en as never } })
const openOver = () => mount(DialogueBubbles, {
  props: { lines: openingLines(), node: OPENING_NODE, overArena: true, skippable: true },
  global: { plugins: [i18n] }
})
/** The first bubble waits for a portal's first-load ad to settle (C30); on a
 *  plain build that is one resolved promise away. */
const settle = async (w: ReturnType<typeof openOver>): Promise<void> => {
  await Promise.resolve()
  await Promise.resolve()
  await w.vm.$nextTick()
}

describe('the bubble over the arena', () => {
  beforeEach(freshSave)

  it('opens on the first beat, not the chapter title page', async () => {
    const w = openOver()
    await settle(w)
    expect(w.find('.title-leaf').exists()).toBe(false)
    expect(w.find('.leaf').exists()).toBe(true)
    expect(w.find('svg.picto').exists()).toBe(true)
    expect(w.text()).toContain(en.story.c1.n1.b1)
    w.unmount()
  })

  it('keeps the skip affordance, and reports it', async () => {
    const w = openOver()
    await settle(w)
    const skip = w.find('button.skip')
    expect(skip.exists()).toBe(true)
    expect(skip.attributes('aria-label')).toBe(en.ui.next)
    await skip.trigger('click')
    expect(w.emitted('done')).toHaveLength(1)
    expect(track).toHaveBeenCalledWith('dialogue_skip', { nodeId: OPENING_NODE })
    w.unmount()
  })

  it('turns no page: a tap on it is a tap on the rune underneath', async () => {
    const w = openOver()
    await settle(w)
    expect(w.classes()).toContain('over-arena')
    // No dimming scrim over a live duel, and no continue cue inviting a turn.
    expect(w.find('.dim').exists()).toBe(false)
    expect(w.find('.turn-cue').exists()).toBe(false)
    await w.trigger('click')
    expect(w.emitted('done')).toBeUndefined()
    w.unmount()
  })

  it('leaves the keyboard to the duel: Space casts, it does not advance', async () => {
    const w = openOver()
    await settle(w)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))
    await w.vm.$nextTick()
    expect(w.emitted('done')).toBeUndefined()
    w.unmount()
  })

  it('still opens as a dialogue page everywhere else', async () => {
    const w = mount(DialogueBubbles, {
      props: { lines: dialogueFor(1), node: 1 },
      global: { plugins: [i18n] }
    })
    await settle(w)
    expect(w.classes()).not.toContain('over-arena')
    expect(w.find('.dim').exists()).toBe(true)
    w.unmount()
  })
})

/**
 * The pace the arena's beats turn themselves over at, ms — the picture book's
 * shortest page (`intro.ts` `BEAT_LEN`), which is what `DialogueBubbles` uses
 * and what these specs pin. Change one and this fails, which is the point:
 * the number is a promise to a three-year-old about how long a picture stays.
 */
const HOLD_MS = 3400

describe('the arena\'s beats, turning themselves over', () => {
  beforeEach(() => {
    freshSave()
    // `performance` too: the hold is measured with `performance.now()`, not
    // with the interval's own count of ticks.
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'performance'] })
  })
  afterEach(() => { vi.useRealTimers() })

  const run = async (w: ReturnType<typeof openOver>, ms: number): Promise<void> => {
    vi.advanceTimersByTime(ms)
    await w.vm.$nextTick()
  }

  it('plays all three in order, then ends the sequence itself', async () => {
    const w = openOver()
    await settle(w)
    expect(w.text()).toContain(en.story.c1.n1.b1)
    await run(w, HOLD_MS)
    expect(w.text()).toContain(en.story.c1.n1.b2)
    await run(w, HOLD_MS)
    expect(w.text()).toContain(en.story.c1.n1.b3)
    expect(w.emitted('done')).toBeUndefined()
    await run(w, HOLD_MS)
    expect(w.emitted('done')).toHaveLength(1)
    w.unmount()
  })

  it('is over well inside the eleven seconds `help.ts` gives ONE line', () => {
    expect(HOLD_MS * openingLines().length).toBeLessThan(11_000)
  })

  it('holds each picture for its whole page — no flashcards', async () => {
    const w = openOver()
    await settle(w)
    await run(w, HOLD_MS - 200)
    expect(w.text()).toContain(en.story.c1.n1.b1)
    w.unmount()
  })

  it('the skip takes the WHOLE sequence, from whichever beat is up', async () => {
    const w = openOver()
    await settle(w)
    await run(w, HOLD_MS)
    expect(w.text()).toContain(en.story.c1.n1.b2)
    await w.find('button.skip').trigger('click')
    expect(w.emitted('done')).toHaveLength(1)
    expect(track).toHaveBeenCalledWith('dialogue_skip', { nodeId: OPENING_NODE })
    // …and the beats left behind never arrive, nor a second `done`.
    await run(w, HOLD_MS * 3)
    expect(w.emitted('done')).toHaveLength(1)
    w.unmount()
  })

  it('the hold stops with the game: an ad never eats a beat', async () => {
    const w = openOver()
    await settle(w)
    const release = acquireAppPause()
    await run(w, HOLD_MS * 2)
    expect(w.text()).toContain(en.story.c1.n1.b1)
    release()
    // No catch-up burst either: the clock resumes, it does not repay.
    await run(w, 200)
    expect(w.text()).toContain(en.story.c1.n1.b1)
    await run(w, HOLD_MS)
    expect(w.text()).toContain(en.story.c1.n1.b2)
    w.unmount()
  })

  it('says nothing when it is folded from outside, mid-sequence', async () => {
    const w = openOver()
    await settle(w)
    await run(w, HOLD_MS)
    // This is what the first stroke does: the parent drops the component.
    w.unmount()
    expect(w.emitted('done')).toBeUndefined()
  })
})

// The continue cue on an ordinary story page (the arena's leaf has none — see
// above): up once the dwell is over, wordless but labelled for a reader, and
// a real press that turns the page like a tap anywhere does.
describe('the continue cue on a story page', () => {
  beforeEach(() => {
    freshSave()
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'performance'] })
  })
  afterEach(() => { vi.useRealTimers() })

  it('waits out the dwell, is labelled through i18n, and turns the page', async () => {
    // A chapter's first node as a PAGE (not over the arena): it opens on the
    // title page, and the cue there turns to the first beat. That turn is
    // pinned too: the title leaf once shared key 0 with the first beat, Vue
    // patched one into the other, threw, and the chapter stayed on its title.
    const w = mount(DialogueBubbles, { props: { lines: openingLines(), node: OPENING_NODE }, global: { plugins: [i18n] } })
    await settle(w)
    expect(w.find('.title-leaf').exists()).toBe(true)
    expect(w.find('.turn-cue').exists()).toBe(false)
    vi.advanceTimersByTime(700)
    await w.vm.$nextTick()
    const cue = w.find('button.turn-cue')
    expect(cue.exists()).toBe(true)
    expect(cue.attributes('aria-label')).toBe(en.continue)
    expect(cue.text()).toBe('')
    await cue.trigger('click')
    expect(w.find('.title-leaf').exists()).toBe(false)
    expect(w.find('.words').text()).toContain(en.story.c1.n1.b1)
    // …and the next page's cue waits out its own dwell again.
    expect(w.find('.turn-cue').exists()).toBe(false)
    expect(w.emitted('done')).toBeUndefined()
    w.unmount()
  })
})
