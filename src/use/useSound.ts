// ─── Music + UI sound facade over the procedural synth ─────────────────────
//
// Auroras Magic ships NO audio files: the piano and every cue are synthesised
// by `game/duel/audio.ts` on the app's shared AudioContext. This module keeps
// the API the platform layer was written against — `forceStopMusic` before an
// ad, `resumeMusicAfterAd` after a first-load interstitial, the start/stop
// pair the scene brackets a duel with — and maps it onto the sequencer.
//
// THE MUSIC INTENT (`shouldPlay`) and THE MUSIC ITSELF are separate on
// purpose, exactly as they were for the file-based track this replaces:
//
//   • `startBattleMusic()` sets the intent and starts the sequencer — unless a
//     gate says silence: the pause gate (ad / hidden tab / portal pause /
//     modal), the mobile hard-mute or the PORTAL mute. A portal mute that lands
//     during boot, before anything is playing, must still stop the first start
//     (the "mute the portal, then reload" QA flow).
//   • when every gate clears, the watchers below re-start a sequencer whose
//     intent is still set — without that, a player who unmutes stays silent.
//   • `forceStopMusic()` clears the INTENT, so an ad whose SDK promise
//     resolves early can never have the music restart underneath it.

import { effectScope, ref, watch } from 'vue'
import useUser from '@/use/useUser'
import { isGamePaused } from '@/use/useGamePause'
import { isPlatformAudioMuted } from '@/use/useGamePauseAudio'
import { isMobileAudioMuted } from '@/use/useMobileAudioMute'
import { setMusicPlaying, isMusicPlaying as synthPlaying, setAudioLevels, sfx } from '@/game/duel/audio'

/** Music is WANTED — a duel is running. */
const shouldPlay = ref(false)

/** Every reason the music must stay silent right now. */
const silenced = (): boolean => isGamePaused.value || isMobileAudioMuted.value || isPlatformAudioMuted.value

const start = (): void => {
  if (!shouldPlay.value || silenced()) return
  setMusicPlaying(true)
}
const stop = (): void => {
  setMusicPlaying(false)
}

/**
 * Hard-stop the music and clear the play INTENT. Use right before an
 * interstitial / rewarded ad is requested. The next duel's
 * `startBattleMusic()` brings it back — or, for an ad that interrupts a LIVE
 * duel, `resumeMusicAfterAd()`.
 */
export const forceStopMusic = (): void => {
  shouldPlay.value = false
  stop()
}

/** Bring the music back after an ad that interrupted a LIVE duel. Goes
 *  through the normal start path, so a portal mute still wins. */
export const resumeMusicAfterAd = (): void => {
  shouldPlay.value = true
  start()
}

let installed = false
/**
 * Wire the gates once for the app lifetime. Idempotent.
 *
 * In a DETACHED effect scope: the first caller is usually a component's setup
 * (App.vue's `initMusic`), and watchers created there die with that component.
 * The gate has to outlive whoever happened to install it — a music start that
 * stops listening for the portal's unmute is a permanently silent game.
 */
const install = (): void => {
  if (installed) return
  installed = true
  effectScope(true).run(installWatchers)
}
const installWatchers = (): void => {
  const { userSoundVolume, userMusicVolume } = useUser()
  // Player levels drive the two synth buses (Options sliders, desktop mute).
  watch([userSoundVolume, userMusicVolume], ([s, m]) => setAudioLevels(s, m), { immediate: true })
  // Any gate rising stops the sequencer; the last one falling restarts it if
  // a duel still wants music.
  watch([isGamePaused, isMobileAudioMuted, isPlatformAudioMuted], () => {
    if (silenced()) stop()
    else start()
  }, { flush: 'sync' })
}

export const useMusic = () => {
  const initMusic = (): void => install()
  const startBattleMusic = (): void => {
    install()
    shouldPlay.value = true
    start()
  }
  const stopBattleMusic = (): void => {
    shouldPlay.value = false
    stop()
  }
  /** Tab hidden (App.vue). The pause gate already covers it; kept for the API. */
  const pauseMusic = (): void => stop()
  const continueMusic = (): void => start()
  const isMusicPlaying = (): boolean => synthPlaying()
  return { initMusic, startBattleMusic, stopBattleMusic, pauseMusic, continueMusic, isMusicPlaying }
}

/** UI one-shots. Every named UI sound maps onto the synth's soft click. */
const useSounds = () => {
  const playSound = (_effect: string, _ratio?: number, _pitch?: number): void => sfx('ui')
  return { playSound }
}

export default useSounds
