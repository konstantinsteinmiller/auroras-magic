/**
 * useAccessibility — the two comfort settings the story adds to Options
 * (story-spec §3.11, §5.13):
 *
 *   • TRACE ASSIST ("Show rune guides", off by default): before the first
 *     rune of a duel lands, the newest rune the chests have given is ghosted,
 *     tracing itself, in the drawing box — so a new shape is less scary to
 *     try. It stops the moment a rune lands; it is never a permanent overlay.
 *   • REDUCED MOTION: follows the device's `prefers-reduced-motion` until the
 *     player chooses. When on, the AMBIENT loops (map sparkles, breathing
 *     markers, the wardrobe's idle bob) settle instead of looping; the
 *     one-shot reward beats — the reveal, the unbox, the bloom — keep full
 *     motion, because muting those would mute the reward itself.
 *
 * Both are persisted like the haptics toggle, and re-read on a hydrate bump.
 */
import { ref, watch } from 'vue'
import { getState, setState } from '@/use/useGameState'
import { saveDataVersion } from '@/use/useSaveStatus'
import { TRACE_ASSIST_KEY, REDUCED_MOTION_KEY } from '@/keys'

const devicePrefersReduced = (): boolean => {
  try {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

const readTrace = (): boolean => getState<boolean>(TRACE_ASSIST_KEY, false) === true
const readReduced = (): boolean => {
  const v = getState<boolean | null>(REDUCED_MOTION_KEY, null)
  return v === null || v === undefined ? devicePrefersReduced() : v === true
}

export const traceAssist = ref<boolean>(readTrace())
export const reducedMotion = ref<boolean>(readReduced())

watch(saveDataVersion, () => {
  traceAssist.value = readTrace()
  reducedMotion.value = readReduced()
})

export const setTraceAssist = (on: boolean): void => {
  traceAssist.value = on
  setState(TRACE_ASSIST_KEY, on)
}

export const setReducedMotion = (on: boolean): void => {
  reducedMotion.value = on
  setState(REDUCED_MOTION_KEY, on)
}
