/**
 * useMute — the on-screen mute toggle, shared by every scene's chrome.
 *
 * Mobile uses the game's own hard mute (it survives the OS audio focus); a
 * desktop portal build mirrors its SDK's mute. Two stores, one button.
 */
import { computed } from 'vue'
import { mobileCheck } from '@/utils/function'
import { isMuted, toggleMute } from '@/use/useCrazyMuteSync'
import { isMobileAudioMuted, toggleMobileAudioMute } from '@/use/useMobileAudioMute'

const onMobile = mobileCheck()

export const useMute = () => {
  const muted = computed(() => (onMobile ? isMobileAudioMuted.value : isMuted.value))
  const toggle = (): void => {
    if (onMobile) toggleMobileAudioMute()
    else toggleMute()
  }
  return { muted, toggle }
}
