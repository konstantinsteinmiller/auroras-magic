// ─── DevAdProvider stub (every `vite build`) ────────────────────────────────
//
// The simulated ads are for the dev server only, and `resolveAdProvider` gates
// them behind `import.meta.env.DEV`. That guard stops the CALL, but not the
// module: the obfuscator hoists the module's strings before esbuild folds the
// env literal, so the whole "TEST AD" card survived into the GameMonetize
// bundle. `vite.config.ts` aliases the module here on every build instead, and
// `tools/pack` refuses any archive that still carries the real one.
import { createNoopProvider } from './NoopProvider'
import type { AdProvider } from './types'

export const isDevAdsEnabled = (): boolean => false

export const createDevAdProvider = (): AdProvider => createNoopProvider()
