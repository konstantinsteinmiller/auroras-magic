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

## Seams added by story stage S1 (the wipe, story-spec §9.3, §9.15)

| Seam | Where | Notes |
| --- | --- | --- |
| Analytic coverage model, no `getImageData` in the wipe path | `game/restore/mask.ts` | 24×14 save/threshold grid over a 96×56 sample lattice. Every stamp is accounted with the baked stamp's own falloff. |
| Dust composited ONCE per sector visit, then erased in place | `game/restore/dust.ts` | Drain (`saturation`), ink (`multiply`) and grain (`overlay`) are done when the sector opens. A frame is two blits plus the stamps. §9.4 had budgeted a live composite every frame. |
| Pre-baked 96×96 soft stamp, no `ctx.filter` | `game/restore/dust.ts` | Re-baked only when the brush's core share changes (a resize). |
| One stamp batch per RAF, not per `pointermove` | `game/restore/brush.ts` | Coalesced samples buffer; `flush()` once per frame. |
| Reveal wave clips the dust instead of erasing it | `game/restore/wipe.ts` | A full-canvas `destination-out` per wave frame cost ~3.8 ms. The clip costs nothing extra. |
| Sector canvases at the resolution the sector is DRAWN at (0.5–1 × 1152×672, ¼ steps; 0.5 on `S.q = 0`) | `game/restore/wipe.ts` | Released when the scene ends. |
| Frame-cost probe: mask + dust work per frame, with the phase of the worst frame | `game/restore/wipe.ts` → `__wipe.perf()` | |

## Experiments

| Date | Hypothesis | Arms | Result | Verdict |
| --- | --- | --- | --- | --- |
| 2026-09-18 | *S1 wipe:* mask + dust stays ≤ 3 ms/frame for a standard sector (§9.3.3). | headless Chrome: 1280×720 @1×, 320×658 @2× touch, 320×658 @2× with CPU ×4 | Wipe frames: avg 0.09–0.13 ms, p95 0.2–0.4 ms, max 0.9 ms unthrottled. At CPU ×4: avg 0.9–1.0 ms, p95 1.8–2.1 ms, max 4.2 ms. Worst one-off frames at CPU ×4: 30 ms on the scene's first frame (the GPU upload of the fresh bakes, hidden under the page dip) and 23 ms once in the restored view (after the save write, most likely GC) | **holds** — the steady wipe p95 is within budget even at ×4. The live-composite arm §9.15 queued was never needed: baking the dust once took the per-frame composite off the table |
| 2026-09-18 | *S1 reveal wave:* erasing the dust with a growing stamp each frame is affordable. | per-frame full-canvas `destination-out` vs a clip of the dust draw | erase: one 3.8 ms frame unthrottled; clip: the wave frames are gone from the top of the list | **rejected** the erase — the clip ships |
| — | *Entry chunk:* vue-i18n's full build carries its message compiler (~30–40 kB min). Precompiling the locale files and aliasing the runtime-only build would drop it. | — | not run | open — measure the initial-load gain on a throttled phone before doing it |
