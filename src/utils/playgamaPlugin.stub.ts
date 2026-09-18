// ─── playgamaPlugin no-op stub (non-Playgama builds only) ───────────────────
//
// Replaces `@/utils/playgamaPlugin` on every build except Playgama's, via
// `resolve.alias` in `vite.config.ts`. Same mechanism, and the same reason, as
// `yandexPlugin.stub.ts`, `pokiPlugin.stub.ts` and `gamepixPlugin.stub.ts`.
//
// WHY: `main.ts`, `FLogoProgress.vue`, `useGameplayLifecycle.ts` and
// `resolveSaveStrategy.ts` reach the real module through `await import(...)`,
// and a dynamic import is a CHUNK — every build emitted a `playgamaPlugin-*.js`
// whether or not anything could call it (found in the CrazyGames, Poki, Yandex,
// GameDistribution, Glitch, itch and Wavedash archives by `pnpm build:all`).
// Another portal's SDK glue riding along in a bundle is what Yandex moderation
// rejects ("Service storage URL detected") and what a Poki reviewer greps for.
// The env-literal `if` at each call site does not remove it: the obfuscator
// hoists string literals before esbuild folds the comparison.
//
// Aliasing keeps the module OUT of the bundle and still gives every dynamic
// importer a valid module to resolve — no chunk deletion, no 404.
//
// Must match the real module's FULL export surface.

import { ref } from 'vue'
import type { Ref } from 'vue'
import type { SaveStrategy } from '@/utils/save/types'
import { LocalStorageStrategy } from '@/utils/save/LocalStorageStrategy'

export const isPlaygamaSdkActive: Ref<boolean> = ref(false)
export const isPlaygamaAdsBlocked: Ref<boolean> = ref(false)
export const playgamaLocale: Ref<string | null> = ref(null)
export const playgamaDetectedId: Ref<string | null> = ref(null)

export const getPlaygamaBridge = (): null => null
export const normalizePlaygamaLanguage = (_raw: unknown): string | null => null
export const __stopPlaygamaLanguageWatch = (): void => {}

export const playgamaPlugin = async (): Promise<void> => {}
export const playgamaLoadingStart = (): void => {}
export const playgamaGameLoadingStop = (): void => {}
export const playgamaGameplayStart = (): void => {}
export const playgamaGameplayStop = (): void => {}

export const showInterstitialPG = async (_onImpression?: () => void): Promise<void> => {}
export const showRewardedPG = async (_onImpression?: () => void): Promise<boolean> => false

export const createPlaygamaSaveStrategy = async (): Promise<SaveStrategy> => new LocalStorageStrategy()
