// The portal mute has to stop music that has not STARTED yet.
//
// This pins the exact flow portal QA runs and the exact way the obvious
// implementation fails it (Playgama filed it against tower-siege after the
// initial-state read was already in place):
//
//   1. the portal is muted, and the player RELOADS;
//   2. the SDK reports "muted" during boot, before any audio is playing;
//   3. `setPlatformAudioMuted(true)` suspends an audio layer that is still
//      empty — there is nothing to pause, so nothing happens;
//   4. a second later the duel starts and `startBattleMusic()` plays.
//
// Every mid-session test passes and the graded one fails. The fix is that the
// mute is a REACTIVE ref the music start READS, not an edge it is merely
// notified of — plus the false-edge re-fire, without which a player who unmutes
// gets a permanently silent game.
//
// Auroras Magic's score is synthesised (`game/duel/audio.ts`), so the thing
// asserted is whether the sequencer was asked to play — the same switch the
// real-browser check reads through `__voiceCount`.

import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, nextTick } from 'vue'
import { mount } from '@vue/test-utils'

import { useMusic } from '@/use/useSound'
import { __voiceCount, DUEL_CALL_DUCK, duckMusic, initAudio, isMusicPlaying, setMusicPlaying, sfx, tickAudio } from '@/game/duel/audio'
import { setPlatformAudioMuted } from '@/use/useGamePauseAudio'

/** Mount a host component that owns the music singleton, and hand back its
 *  controls — `initMusic` installs its watchers inside a component scope. */
const mountMusic = () => {
  let api!: ReturnType<typeof useMusic>
  const wrapper = mount(defineComponent({
    setup() {
      api = useMusic()
      api.initMusic()
      return () => null
    }
  }))
  return { wrapper, api: api! }
}

afterEach(async () => {
  setPlatformAudioMuted(false)
  await nextTick()
  setMusicPlaying(false)
})

describe('portal mute gates the music START, not just running audio', () => {
  it('CONTROL: unmuted, starting a duel really does start the score', () => {
    // Without this the mute assertions below prove nothing.
    const { wrapper, api } = mountMusic()
    api.startBattleMusic()
    expect(isMusicPlaying()).toBe(true)
    wrapper.unmount()
  })

  it('a mute that lands BEFORE the music exists still silences it', () => {
    setPlatformAudioMuted(true)
    const { wrapper, api } = mountMusic()
    api.startBattleMusic()
    expect(isMusicPlaying()).toBe(false)
    wrapper.unmount()
  })

  it('unmuting brings the music back for a duel that is still going', async () => {
    setPlatformAudioMuted(true)
    const { wrapper, api } = mountMusic()
    api.startBattleMusic()
    expect(isMusicPlaying()).toBe(false)

    setPlatformAudioMuted(false)
    await nextTick()

    expect(isMusicPlaying()).toBe(true)
    wrapper.unmount()
  })

  it('a mute arriving MID-DUEL stops the score and blocks the NEXT start', () => {
    const { wrapper, api } = mountMusic()
    api.startBattleMusic()
    expect(isMusicPlaying()).toBe(true)

    setPlatformAudioMuted(true)
    expect(isMusicPlaying()).toBe(false) // stopped as the mute landed
    api.stopBattleMusic()   // duel over
    api.startBattleMusic()  // next duel begins, portal still muted

    expect(isMusicPlaying()).toBe(false)
    wrapper.unmount()
  })
})

// The VS preview's sound (duel-preview contract): its three cues and the
// music duck under the fanfare. The duck rides the same bus the mute gates
// drive, so it must never be the thing that leaves the music stuck low.
describe('the VS preview sound', () => {
  it('is a no-op before the audio graph exists (jsdom has no AudioContext)', () => {
    expect(() => {
      sfx('duelCall'); sfx('vsTick', 0); sfx('vsTick', 2); sfx('vsGo')
      duckMusic(2.2); duckMusic(2.2, 0.1); duckMusic(0)
    }).not.toThrow()
    expect(__voiceCount()).toBe(0)
  })

  it('builds its cues inside the voice budget, books the fanfare, and ducks the music', () => {
    // The smallest context the synth can build on: every param records its
    // automation, no voice ever ends (so the count is what each cue built),
    // and the test owns the audio clock.
    const params: { setTargetAtTime: ReturnType<typeof vi.fn> }[] = []
    const param = () => {
      const p = { value: 0, setValueAtTime: vi.fn(), setTargetAtTime: vi.fn(), cancelScheduledValues: vi.fn(), exponentialRampToValueAtTime: vi.fn() }
      params.push(p)
      return p
    }
    const nodes: { onended: (() => void) | null }[] = []
    const node = () => {
      const n = {
        connect: (x: unknown) => x, disconnect: () => {}, start: () => {}, stop: () => {}, addEventListener: () => {},
        gain: param(), frequency: param(), threshold: param(), onended: null as (() => void) | null
      }
      nodes.push(n)
      return n
    }
    /** Every voice built so far ends (the count returns to zero). */
    const endAll = (): void => {
      for (const n of nodes) { n.onended?.(); n.onended = null }
      expect(__voiceCount()).toBe(0)
    }
    let ctx!: FakeCtx
    class FakeCtx {
      currentTime = 0; sampleRate = 8000; state = 'running'; destination = node()
      createGain = node; createDynamicsCompressor = node; createBiquadFilter = node
      createOscillator = node; createBufferSource = node
      createBuffer = (_c: number, n: number) => ({ getChannelData: () => new Float32Array(n) })
      resume = () => Promise.resolve(); suspend = () => Promise.resolve()
      constructor () { ctx = this }
    }
    vi.stubGlobal('AudioContext', FakeCtx)
    initAudio()
    const built = (fire: () => void): number => {
      const v0 = __voiceCount()
      fire()
      return __voiceCount() - v0
    }
    /** Run the frame loop's audio tick from the clock's time to `t1`. */
    const frames = (t1: number): number => {
      let n = 0
      for (let t = ctx.currentTime; t < t1; t += 1 / 60) {
        ctx.currentTime = t
        n += built(() => tickAudio(1 / 60))
      }
      return n
    }
    const lastTwo = (calls: unknown[][]) => [calls[calls.length - 2]!, calls[calls.length - 1]!] as [number[], number[]]

    // A plain duck: a dip to 0.25 x NOW and the swell back to the full level
    // at +2.2 s on the audio clock — both on the one bus, both setTargetAtTime.
    duckMusic(2.2)
    const bus = params.find((p) => p.setTargetAtTime.mock.calls.some((c) => c[1] === 2.2))
    expect(bus).toBeDefined()
    let [dip, back] = lastTwo(bus!.setTargetAtTime.mock.calls)
    expect([dip[1], back[1]]).toEqual([0, 2.2])
    expect(dip[0]! / back[0]!).toBeCloseTo(0.25, 5)
    duckMusic(0)

    expect(built(() => sfx('vsTick', 1))).toBeGreaterThan(0)
    expect(built(() => sfx('vsGo'))).toBeGreaterThan(0)
    endAll()

    // The announcement builds only what sounds at once — the rest is booked,
    // so it never holds its whole voice count (MAXV 40, the piano yields
    // above 26) from its first frame…
    const first = built(() => sfx('duelCall'))
    expect(first).toBeGreaterThan(0)
    expect(first).toBeLessThanOrEqual(8)
    // …and it ducks the music itself, deeper than the default. The preview's
    // own longer duck keeps that depth to its later release.
    ;[dip, back] = lastTwo(bus!.setTargetAtTime.mock.calls)
    expect(dip[1]).toBe(0)
    expect(back[1]).toBeGreaterThan(1.5)
    expect(dip[0]! / back[0]!).toBeCloseTo(DUEL_CALL_DUCK, 5)
    duckMusic(2.2)
    ;[dip, back] = lastTwo(bus!.setTargetAtTime.mock.calls)
    expect(back[1]).toBe(2.2)
    expect(dip[0]! / back[0]!).toBeCloseTo(DUEL_CALL_DUCK, 5)
    // The booked voices are built as the clock reaches them.
    const later = frames(2.3)
    expect(later).toBeGreaterThan(first)
    expect(first + later).toBeLessThanOrEqual(64)
    endAll()

    // A booking belongs to its moment: if the world stops — a mute or an ad
    // suspends the context while wall time runs on — it is dropped, never
    // played late (a fanfare's tail must not surface minutes into a duel).
    let wallMs = 1e6
    const clock = vi.spyOn(performance, 'now').mockImplementation(() => wallMs)
    ctx.currentTime = 10
    expect(built(() => sfx('duelCall'))).toBe(first)
    wallMs += 60_000
    expect(frames(12.5)).toBe(0)
    clock.mockRestore()
    vi.unstubAllGlobals()
  })
})
