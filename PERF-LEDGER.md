# Perf ledger — Auroras Magic

Every optimisation is a hypothesis until it beats the un-optimised build on a
throttled or real device (`web-game-performance-optimize`). Record the result
here, including null results, so a rejected idea is not tried again next month.

## Seams in place (from the jam build and the migration)

| Seam | Where | Notes |
| --- | --- | --- |
| One RAF, fixed 1/120 s sim step, render once per frame | `views/GameScene.vue` | Identical duel at 30 or 144 Hz; dt clamped to 0.25 s. |
| Adaptive quality `S.q` with hysteresis (drop above 24 ms, restore below 15 ms smoothed) | `GameScene.vue` → `S.q` | `q = 0` drops cel bands, shade stripes, aura, hair locks and half the grass; the silhouettes stay. |
| DPR capped at 2 | `GameScene.resize` | |
| Particle pool: one `Float32Array`, ring allocator, colour-batched draw, zero allocation per frame | `game/duel/fx.ts` | Hard cap of 360 particles. |
| Baked arena (island, cloud band, sky gradient), rebuilt only when the quantised device scale changes; primed behind the splash | `game/duel/arena.ts`, `use/useAssets.ts` | |
| Reactivity firewall: `S` is a plain object; the HUD gets a copy of the values that changed, and HP bars and the forming ring are written directly to the DOM | `use/useDuelHud.ts` | |
| Probe + A/B harness | `use/usePerfProbe.ts`, `use/perfVariants.ts`, `scripts/perf-ab.mjs`, `components/atoms/FPerfMeter.vue` (debug) | `?perfprobe=1` |

## Experiments

| Date | Hypothesis | Arms | Result | Verdict |
| --- | --- | --- | --- | --- |
| — | *Entry chunk:* vue-i18n's full build carries its message compiler (~30–40 kB min). Precompiling the locale files and aliasing the runtime-only build would drop it. | — | not run | open — measure the initial-load gain on a throttled phone before doing it |
