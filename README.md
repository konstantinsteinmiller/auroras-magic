# Auroras Magic

A gesture-driven magic duel. Draw runes to duel a rival unicorn: sketch
**fire** (a triangle), **wind** (a wavy line), **ice** (a Z) and **earth** (a
square), stack up to three, and cast the combo before your rival lands hers.
The sky is the scoreboard. It clears to a rainbow as you win and darkens to
rain as you lose.

Born as **Rune-icorn: Duels**, a 13 kB js13k jam entry (source:
`../unicornbow`, branch `main`). It is now migrated onto a Vue 3 + Vite + pug +
Tailwind architecture with the full web-portal build matrix. The duel's
rules, recogniser, characters, effects and procedural score are the jam build's
own code, ported to TypeScript unchanged.

## Run it

```bash
pnpm install
pnpm dev          # http://localhost:2050
pnpm test         # vitest — recogniser, rules, layout, save + platform contracts
pnpm type-check   # vue-tsc
```

Debug: type `cmarc` in the game to toggle debug mode (FPS meter plus the
`window.__S` / `__step` / `__stroke` / `__frame` QA hooks). Cheats need
`localStorage.cheat = 'true'` (ctrl+shift+alt + `k` coins, `w` win, `l` lose,
`n` next rung).

## Build for the portals

Every portal build runs through the two-stage compressor (see
[`BUILD.md`](BUILD.md)): terser multi-pass inside Vite, then `tools/pack`
(minify, release gates, zopfli zip with round-trip verification, size budget).

```bash
pnpm build:all            # every portal → release/auroras-magic-<platform>.zip
pnpm build:poki           # one portal → dist/auroras-magic-poki.zip
pnpm build:crazy-web | build:playgama | build:gamepix | build:gamemonetize
pnpm build:game-distribution | build:yandex | build:glitch | build:itch
pnpm build:wavedash       # folder upload (wavedash-dist/); `pnpm push:wavedash` uploads
```

Per-portal settings live in the gitignored `.env.<mode>[.local]` files. The
game ids and tokens there are **blank on purpose**: the originals belonged to
another game. Fill in Auroras Magic's own ids before a release.

## Where things are

| Path | What |
| --- | --- |
| `src/game/duel/` | The duel: `config` (rules as data), `state` (the one `auroras_magic_state` object), `runes` (recogniser), `sim` (rules + NPC), `fx`, `arena`, `chars`, `audio` (procedural synth), `render`, `layout` |
| `src/components/duel/` | The HUD, callouts, result panel + element shop, spellbook (flagged off) |
| `src/views/GameScene.vue` | Canvas, input, fixed-step loop, the result flow, the portal bracket |
| `src/platforms/`, `src/use/ads/`, `src/utils/save/` | The multi-portal layer: SDK plugins, ad providers, save strategies |
| `src/i18n/locales/` | 21 locales, parity-tested |
| `tools/pack/` | The compressor's second stage and `build:all` |
| `tools/art-*`, `tools/slice-sheets.mjs`, `scripts/compress-images.mjs` | The art and image-compression pipelines (ready for the painted-art step) |
| `art-style.md` | The art style reference for that step |
| `game-implementation-plan.md` | The plan and its status: migration done; story extension and painted art next |
