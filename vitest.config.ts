import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  // Vite's production config (`vite.config.ts`) injects `APP_VERSION` at
  // build time via `define`. Vitest doesn't run that plugin, so any
  // module that reads `APP_VERSION` at import time (e.g. `useUser.ts`)
  // throws ReferenceError under tests. Mirror the define here so test
  // imports of those modules don't trip on a missing global.
  define: {
    APP_VERSION: JSON.stringify('test')
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue']
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/save/setup.ts'],
    // Some suites dynamically `import()` large module graphs on their first
    // assertion; on a cold transform cache that alone can exceed the 5 s
    // default. The work is transform time, not test time.
    testTimeout: 30_000,
    // tests/e2e runs under Playwright + a real Vite dev server (Node env,
    // not jsdom). Excluded from the default suite so `pnpm test` stays
    // fast; run them with `pnpm test:e2e`.
    // `.claude/**` holds git WORKTREES, which are full checkouts of this same
    // repository sitting inside it. Without this, a worktree's `tests/` is
    // discovered as if it were ours: a run on `main` picked up an agent
    // branch's specs, failed on constants that exist only there, and reported
    // a green tree as broken. Test discovery must never wander into a checkout
    // that is not this one.
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/e2e/**', '**/.claude/**']
  }
})