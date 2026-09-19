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
| 2026-09-19 | *S8 release baseline:* every scene holds 60 fps on the mid-range Android proxy with headroom, so nothing needs optimising. | `scripts/perf-scenes.mjs` on the built web bundle, headed Chrome, CPU ×4, DPR 2, 915×412 landscape and 412×915 portrait; duel 60 s (the 10-5 boss, both sides casting the late kit), map, boss wipe, versus, wardrobe 15 s each | Landscape p95 work per frame: duel 3.8 ms (p99 5.3), map 3.9, wipe 2.4, versus 3.5, wardrobe 3.0. Portrait: 3.4 / 4.1 / 2.6 / 4.2 / 3.5. RAF interval p95 17.4–17.8 ms everywhere, zero long tasks, heap slope within ±1 kB/frame. Boot (gzip, Fast 3G, CPU ×4): 4.1 s to the splash clearing | **already fast enough.** The worst p95 is about 25 % of the 16.7 ms budget; per the skill, nothing is changed. `desktop-proxy-only` until a real phone confirms it |
| 2026-09-19 | *Painted-art census (scoped-art-invalidation):* with the art layer on, a painting's arrival re-bakes only what was built from it. | the same run with synthetic paintings, `art=off` vs `art=on` | Canvases created over the whole session: 59 off vs 126 on. The extra 67 are one-time bakes (tint masks, the page's thumbnails, the tinted gift strips) that track scene visits, not arrivals. Frame p95 unchanged (duel 3.6 vs 3.0, map 3.7 vs 3.9, wipe 2.8 vs 2.4 ms). Boot 4.2 s vs 5.4 s: the splash holding for the first screen's paintings, as designed, capped at 4 s | **holds** — no invalidation storm. Re-run the census when real paintings land, since they are heavier |
| 2026-09-19 | *Entry chunk:* vue-i18n's message compiler (~30–40 kB min) could be dropped by precompiling the locale files. | not built: the production build already aliases vue-i18n to its runtime build; the 21 locales are TS objects, which the plugin does not precompile | Upper bound on the gain: ~12 kB gzipped, about 0.06 s on Fast 3G, against a 4.1 s boot (< 2 %) | **closed, not worth it.** It is below the skill's 5 % bar and would mean converting 21 locale files. Reopen only if the boot budget tightens |
