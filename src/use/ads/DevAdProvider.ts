// ─── Simulated ads, for the DEV SERVER only ─────────────────────────────────
//
// Every real ad provider lives behind a portal build, so `pnpm dev` resolves
// the noop provider. With noop, no interstitial ever fires and every rewarded
// button is hidden (`isRewardGated` is false for noop, so the offer would be a
// free perk). The ad placements were therefore invisible exactly where the game
// is developed.
//
// This stands in for a portal SDK. It is ready at once. It shows an
// unmistakable "TEST AD" card, reports the impression, and resolves when the
// card closes. Pacing, the QA chord, the pause and audio gate, and the reward
// grant all run their real code paths against it. The rewarded card has a
// Skip button, so the refused-reward path can be exercised too.
//
// Never in a build. `resolveAdProvider` reaches it only behind
// `import.meta.env.DEV`, which stops the call. That guard alone did not keep
// the module out: the obfuscator hoists its strings before the env literal is
// folded. So `vite.config.ts` aliases this file to `DevAdProvider.stub.ts` on
// every build, and `tools/pack` fails any archive carrying the real one. Not
// under vitest either (mode `test`), where the suites assert the real
// resolution. The copy is plain English on purpose: a dev-only overlay is
// not player-facing.
//
// Opt out, then reload:  localStorage.setItem('am_dev_ads', 'off')
import { ref } from 'vue'
import { safeGetItem } from '@/utils/safeStorage'
import type { AdProvider } from './types'

const OPT_OUT_KEY = 'am_dev_ads'
/** How long each simulated ad stays up, ms. Short: this is for looking at the
 *  flow, not for sitting through. */
const INTERSTITIAL_MS = 2500
const REWARDED_MS = 4000

export const isDevAdsEnabled = (): boolean => safeGetItem(OPT_OUT_KEY) !== 'off'

type Kind = 'interstitial' | 'rewarded'

/** Put the card up; resolve `true` when it runs out, `false` when skipped. */
const showCard = (kind: Kind, ms: number, onImpression?: () => void): Promise<boolean> =>
  new Promise<boolean>((resolve) => {
    const card = document.createElement('div')
    card.dataset.devAd = kind
    card.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:2147483647', 'display:flex',
      'flex-direction:column', 'align-items:center', 'justify-content:center',
      'gap:14px', 'padding:16px', 'background:rgba(8,6,20,0.94)', 'color:#fff',
      'font:600 18px/1.3 system-ui,sans-serif', 'text-align:center',
      'user-select:none', 'touch-action:none'
    ].join(';')

    const title = document.createElement('div')
    title.textContent = `TEST AD · ${kind}`
    title.style.cssText = 'font-size:28px;font-weight:800;letter-spacing:0.04em'
    const count = document.createElement('div')
    count.style.cssText = 'font-size:44px;font-weight:800;color:#ffd76a'
    const note = document.createElement('div')
    note.textContent = `dev server only · disable: localStorage.setItem('${OPT_OUT_KEY}', 'off')`
    note.style.cssText = 'opacity:0.55;font-size:13px;font-weight:400'
    card.append(title, count)

    let timer = 0
    const close = (completed: boolean): void => {
      window.clearInterval(timer)
      card.remove()
      resolve(completed)
    }
    if (kind === 'rewarded') {
      const skip = document.createElement('button')
      skip.type = 'button'
      skip.textContent = 'Skip (no reward)'
      skip.style.cssText = 'font:inherit;padding:8px 18px;border-radius:10px;border:2px solid #fff;background:transparent;color:#fff;cursor:pointer'
      skip.addEventListener('click', () => close(false))
      card.append(skip)
    }
    card.append(note)
    // Full-screen and on top, so no press reaches the canvas underneath, as
    // with a real ad layer.
    document.body.appendChild(card)
    onImpression?.()

    const endsAt = performance.now() + ms
    const tick = (): void => {
      const left = endsAt - performance.now()
      count.textContent = String(Math.max(0, Math.ceil(left / 1000)))
      if (left <= 0) close(true)
    }
    tick()
    timer = window.setInterval(tick, 100)
  })

export const createDevAdProvider = (): AdProvider => {
  const on = ref(true)
  return {
    name: 'dev',
    isReady: on,
    isRewardedReady: on,
    isInterstitialReady: on,
    isAdsBlocked: ref(false),
    init: async () => {
      console.info('[ads] dev server: simulated ads (localStorage am_dev_ads=off to disable)')
    },
    showRewardedAd: (onImpression) => showCard('rewarded', REWARDED_MS, onImpression),
    showMidgameAd: async (onImpression) => { await showCard('interstitial', INTERSTITIAL_MS, onImpression) }
  }
}
