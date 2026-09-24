// THE SPELLBOOK IS A MENU (owner, 2026-09-24: "Spellbook is a menu and should
// pause gameplay and sound and music"; story-spec §8.36).
//
// It takes the path Options takes — every FModal acquires `acquireMenuOpen` —
// so while it is open: the menu flag is up (Poki's gameplayStop, like any
// menu), the pause gate is shut (the sim holds), the ONE audio orchestrator
// suspends the AudioContext, and the music gate stops the sequencer. Closing
// it undoes all four and hands the foe a second of grace (director.ts).
//
// What a unit test cannot see is whether the browser's AudioContext really
// suspended; that was checked in a real build (the report of this pass).

import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '@/i18n/locales/en'

const { suspendSpy, resumeSpy, musicSpy } = vi.hoisted(() => ({
  suspendSpy: vi.fn(),
  resumeSpy: vi.fn(),
  musicSpy: vi.fn()
}))

vi.mock('@/use/useAssets', async (orig) => ({
  ...(await orig<typeof import('@/use/useAssets')>()),
  suspendAllAudio: suspendSpy,
  resumeAllAudio: resumeSpy,
  killOneShotSfx: vi.fn()
}))
vi.mock('@/game/duel/audio', async (orig) => ({
  ...(await orig<typeof import('@/game/duel/audio')>()),
  setMusicPlaying: musicSpy,
  sfx: vi.fn()
}))

import SpellBook from '@/components/duel/SpellBook.vue'
import { isMenuOpen } from '@/use/useModalState'
import { isGamePaused, onPauseChange } from '@/use/useGamePause'
import { installGamePauseAudio, uninstallGamePauseAudio } from '@/use/useGamePauseAudio'
import { useMusic } from '@/use/useSound'
import { foeMayRelease, noteResume, resetDirector } from '@/game/duel/director'

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en: en as never } })
const global = { plugins: [i18n] }

afterEach(() => {
  uninstallGamePauseAudio()
})

describe('the spellbook is a menu (§8.36)', () => {
  it('pauses gameplay, SFX and music while open — through the same path as Options — and resumes after', () => {
    installGamePauseAudio()
    useMusic().startBattleMusic()
    expect(isGamePaused.value).toBe(false)
    musicSpy.mockClear()
    suspendSpy.mockClear()
    resumeSpy.mockClear()
    // AppScene's one line: a resume hands the foe her second of grace.
    resetDirector()
    const off = onPauseChange((paused) => { if (!paused) noteResume() })

    const w = mount(SpellBook, { global })
    expect(isMenuOpen.value, 'a menu, like Options').toBe(true)
    expect(isGamePaused.value, 'the game holds').toBe(true)
    expect(suspendSpy, 'the AudioContext and every sound suspended').toHaveBeenCalledTimes(1)
    expect(musicSpy, 'the music stopped').toHaveBeenLastCalledWith(false)
    expect(foeMayRelease()).toBe(true)

    w.unmount()
    expect(isMenuOpen.value).toBe(false)
    expect(isGamePaused.value).toBe(false)
    expect(resumeSpy, 'sound back').toHaveBeenCalledTimes(1)
    expect(musicSpy, 'music back').toHaveBeenLastCalledWith(true)
    expect(foeMayRelease(), 'and the foe waits a second').toBe(false)
    off()
  })
})
