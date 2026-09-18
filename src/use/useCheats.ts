// ─── Developer cheats ───────────────────────────────────────────────────────
//
// Two independent things, both inert for a normal player:
//
//   • THE DEBUG UNLOCK — typing `cmarc` anywhere (outside a text field) flips
//     debug mode (`toggleDebug`), which turns on the FPS meter and the
//     `window.__S` / `__step` / `__stroke` QA hooks. Installed at app boot so it
//     is reachable in every build.
//   • THE SHORTCUTS — only when `localStorage.cheat === 'true'`:
//       ctrl+shift+alt+k   +100 coins
//       ctrl+shift+alt+w   win the current duel (the foe's HP to 0)
//       ctrl+shift+alt+l   lose the current duel
//       ctrl+shift+alt+n   climb one rung of the ladder
//
// The duel is reached through a DYNAMIC import so none of it lands in the
// eager chunk, and the same singleton the scene renders is the one mutated.

import { onMounted, onUnmounted } from 'vue'
import { toggleDebug } from '@/use/useMatch'
import { safeGetBool } from '@/utils/safeStorage'

let debugUnlockInstalled = false

/** Attach the `cmarc` listener once for the app lifetime. */
export const installDebugUnlock = (): void => {
  if (typeof window === 'undefined' || debugUnlockInstalled) return
  debugUnlockInstalled = true
  const target = 'cmarc'
  let buf = ''
  const isTypingTarget = (el: EventTarget | null): boolean => {
    if (!(el instanceof HTMLElement)) return false
    const tag = el.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
    return el.isContentEditable
  }
  window.addEventListener('keydown', (e) => {
    if (isTypingTarget(e.target)) { buf = ''; return }
    const k = e.key.toLowerCase()
    if (k.length !== 1) return
    buf = (buf + k).slice(-target.length)
    if (buf === target) {
      buf = ''
      toggleDebug()
    }
  })
}

const useCheats = (): Record<string, never> => {
  if (!safeGetBool('cheat')) return {}

  const withDuel = (fn: (m: typeof import('@/game/duel/state')) => void): void => {
    void import('@/game/duel/state').then(fn).catch((e) => console.warn('[CHEAT] duel not loaded', e))
  }

  const shortcuts: Record<string, () => void> = {
    w: () => withDuel(({ S }) => { S.ehp = 0; console.warn('[CHEAT] duel won.') }),
    l: () => withDuel(({ S }) => { S.hp = 0; console.warn('[CHEAT] duel lost.') }),
    n: () => withDuel(({ S, save }) => {
      // Skip ahead: mark the next node won (its sector stays dusty).
      S.campaign.furthestNode = Math.min(49, S.campaign.furthestNode + 1)
      save()
      console.warn(`[CHEAT] furthest node ${S.campaign.furthestNode}.`)
    })
  }

  const onKey = (e: KeyboardEvent): void => {
    if (!((e.ctrlKey || e.metaKey) && e.shiftKey && e.altKey)) return
    const fn = shortcuts[e.key.toLowerCase()]
    if (!fn) return
    e.preventDefault()
    fn()
  }
  onMounted(() => window.addEventListener('keydown', onKey))
  onUnmounted(() => window.removeEventListener('keydown', onKey))
  return {}
}

export default useCheats
