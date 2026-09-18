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

import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, nextTick } from 'vue'
import { mount } from '@vue/test-utils'

import { useMusic } from '@/use/useSound'
import { isMusicPlaying, setMusicPlaying } from '@/game/duel/audio'
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
