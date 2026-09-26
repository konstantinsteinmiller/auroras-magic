// Every duel is announced (owner, 2026-09-25): `startDuel` / `startVersus`
// (`src/game/flow/duelFlow.ts`) no longer open the arena — they play the VS
// preview and hand it the duel's real start. What must hold:
//
//   • `startDuel(n)` lands in `preview`, NOT `duel`, and nothing of the duel
//     exists yet (no `duel_start`, the result beat let go);
//   • five running seconds later the duel begins — scene `duel`, the fight's
//     phase live, `duel_start` reported — and `onBegin` runs after it;
//   • a retry turns the page into a fresh preview of the same node;
//   • versus goes through a preview of its own;
//   • the music starts from the top under the preview and is NOT reset at
//     the hand-off (the fanfare's cues must not fall back to a minor mood).

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/game/duel/audio', async (orig) => ({
  ...(await orig<typeof import('@/game/duel/audio')>()),
  sfx: vi.fn(),
  duckMusic: vi.fn(),
  resetAudio: vi.fn()
}))
vi.mock('@/use/useAnalytics', async (orig) => ({
  ...(await orig<typeof import('@/use/useAnalytics')>()),
  track: vi.fn()
}))

import { S } from '@/game/duel/state'
import { PH_DUEL, PH_LOSE } from '@/game/duel/config'
import { resetAudio } from '@/game/duel/audio'
import { track } from '@/use/useAnalytics'
import { duelBeat } from '@/use/useDuelBeat'
import { gotoScene } from '@/game/flow/scene'
import { __flushTransition } from '@/game/flow/transition'
import { startDuel, startVersus, retry } from '@/game/flow/duelFlow'
import { defaultCampaign } from '@/game/campaign/state'
import { previewHud } from '@/game/preview/previewHud'
import { updatePreview, previewQa, __resetPreview, HANDOFF_AT } from '@/game/preview/preview'

/** Let the preview play out, frame by frame, as the loop would. */
const playPreview = (): void => {
  for (let i = 0; i < Math.round(HANDOFF_AT * 60) + 2 && S.flow.scene === 'preview'; i++) updatePreview(1 / 60)
}

beforeEach(() => {
  __resetPreview()
  __flushTransition()
  vi.clearAllMocks()
  S.campaign = defaultCampaign()
  S.w = 1280
  S.h = 720
  duelBeat.phase = 'idle'
  gotoScene('map')
})

describe('startDuel', () => {
  it('opens the preview, not the arena', () => {
    startDuel(3)
    expect(S.flow.scene).toBe('preview')
    expect(S.flow.node).toBe(3)
    expect(previewHud.live).toBe(true)
    expect(previewHud.foe.name).toBe('duelist.shadow')
    expect(vi.mocked(track).mock.calls.some(([e]) => e === 'duel_start')).toBe(false)
    // The music started from the top as the preview appeared.
    expect(resetAudio).toHaveBeenCalledTimes(1)
  })

  it('begins the duel when the preview hands over — and only then runs `onBegin`', () => {
    const onBegin = vi.fn(() => {
      expect(S.flow.scene).toBe('duel')
    })
    startDuel(3, onBegin)
    expect(onBegin).not.toHaveBeenCalled()
    playPreview()
    expect(S.flow.scene).toBe('duel')
    expect(S.flow.mode).toBe('campaign')
    expect(S.phase).toBe(PH_DUEL)
    expect(duelBeat.phase).toBe('fight')
    expect(onBegin).toHaveBeenCalledTimes(1)
    expect(vi.mocked(track).mock.calls.filter(([e]) => e === 'duel_start')).toHaveLength(1)
    // …and the music is not reset under the exit's bright sting.
    expect(resetAudio).toHaveBeenCalledTimes(1)
  })

  it('a retry turns the page into a fresh preview of the same node', () => {
    startDuel(2)
    previewQa.finish()
    expect(S.flow.scene).toBe('duel')
    S.phase = PH_LOSE
    duelBeat.phase = 'loss'
    retry()
    // A second press during the turn cannot queue a second retry.
    retry()
    __flushTransition()
    expect(S.flow.scene).toBe('preview')
    expect(S.flow.node).toBe(2)
    expect(duelBeat.phase).toBe('idle')
    playPreview()
    expect(S.flow.scene).toBe('duel')
    expect(vi.mocked(track).mock.calls.filter(([e]) => e === 'duel_start')).toHaveLength(2)
  })
})

describe('startVersus', () => {
  it('announces the match too, then opens it in versus mode', () => {
    startVersus()
    expect(S.flow.scene).toBe('preview')
    expect(S.flow.mode).toBe('versus')
    expect(previewHud.mode).toBe('versus')
    playPreview()
    expect(S.flow.scene).toBe('duel')
    expect(S.flow.mode).toBe('versus')
    expect(S.versus).toBe(true)
    expect(vi.mocked(track).mock.calls.some(([e]) => e === 'versus_start')).toBe(true)
  })
})
