// Runs the real-duel difficulty harness (tests/duel/winRate.test.ts), which
// the full suite skips: ~2 minutes of simulated duels (story-spec §7.2).
import { spawnSync } from 'node:child_process'

const r = spawnSync('npx', ['vitest', 'run', 'tests/duel/winRate.test.ts'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, WINRATE: '1' }
})
process.exit(r.status ?? 1)
