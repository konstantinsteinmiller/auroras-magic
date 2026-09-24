<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { PH_DUEL, RUNES } from '@/game/duel/config'
import { S, type Forge } from '@/game/duel/state'
import { FORGE_S, runeAt } from '@/game/duel/forge'
import { hudLayout, registerForgeLayer } from '@/use/useDuelHud'
import { reducedMotion } from '@/use/useAccessibility'
import RuneGlyph from '@/components/duel/RuneGlyph.vue'

/**
 * THE SPELL FORGE's runes (story-spec §8.37): pressing CAST lifts the runes
 * out of their slots, and they fly on their own curves, each in its own
 * colour, to the point where they merge into one orb (`forgeArt.ts` draws the
 * orb, the horn and the swell on the canvas).
 *
 * WHY THE DOM. The slots are DOM, with opaque plates: a rune drawn on the
 * canvas would start underneath its own slot. Here the rune that leaves is
 * the very glyph the slot was showing — `RuneGlyph`, painted where the art
 * layer has a painting, drawn where it has not — at the slot's own size, on
 * the slot's own centre, so it visibly LIFTS OUT of it.
 *
 * WHERE. The slots are measured off the DOM (`[data-my-slot]` /
 * `[data-foe-slot]`, `DuelHud.vue`), the way the lesson's lightbox does, so
 * one layer is right in landscape (the scaled stage layer) and in portrait
 * (the flexed HUD band); they are re-measured when a forge begins and on
 * every resize or rotation. The paths are stage units (`forge.runeAt`),
 * mapped to the screen through the live layout, the same mapping the canvas
 * uses — so the runes arrive exactly where the canvas's orb is born.
 *
 * CHEAP. Six pooled elements (three a side), always mounted; once a frame
 * `syncHud` calls `frame` (the same hook as the HP bars), which writes a
 * transform and an opacity per visible rune and nothing else. Which rune an
 * element shows changes only when a forge begins. It pauses with the game:
 * it reads the sim's forge clock, which stops when the game does.
 *
 * Reduced motion: the runes do not fly — they fade where they stand, while
 * the horn's glow fades in (`forge.hornGlow`): the same 1.5 s, a cross-fade.
 */
const root = ref<HTMLElement | null>(null)
/** The rune each pooled element shows (-1 none): 0..2 Aurora's, 3..5 the
 *  right-hand side's. Reactive, but written only when a forge begins. */
const ids = reactive<number[]>([-1, -1, -1, -1, -1, -1])
/** The rune the pooled element `k` (1-based, as `v-for` counts) shows. */
const runeOf = (k: number): number => ids[k - 1] ?? -1
const els: (HTMLElement | null)[] = [null, null, null, null, null, null]
const bind = (k: number) => (el: unknown): void => { els[k] = (el as HTMLElement | null) ?? null }
/** The slot centres (stage units) each pooled rune leaves from. */
const sx = new Float64Array(6)
const sy = new Float64Array(6)
/** The glyph's size in its slot, CSS px, per side. */
const size = [0, 0]
/** The forge token (`Forge.n`) each side last started from. */
const seen = [-1, -1]
/** Whether each pooled element is showing (so hiding it is one write). */
const shown = [false, false, false, false, false, false]
/** Where the layer's box sits on the screen (the HUD's own origin). */
let ox = 0
let oy = 0
/** Reused: one rune's place this frame. */
const P = { x: 0, y: 0, s: 1, a: 1 }

/** Measure one side's slots off the DOM: centres into stage units. */
const measure = (side: number): void => {
  const host = root.value?.closest('.duel-hud')
  if (!host) return
  const box = host.getBoundingClientRect()
  ox = box.left
  oy = box.top
  const L = hudLayout.value
  const list = host.querySelectorAll<HTMLElement>(side ? '[data-foe-slot]' : '[data-my-slot]')
  for (let i = 0; i < 3; i++) {
    const r = list[i]?.getBoundingClientRect()
    if (!r || !(r.width > 0)) continue
    // The slot's glyph is 94.4 % of its box (`RuneSlot.vue`).
    size[side] = r.width * 0.944
    sx[side * 3 + i] = (r.left + r.width / 2 - ox - L.vx) / L.vs
    sy[side * 3 + i] = (r.top + r.height / 2 - oy - L.vy) / L.vs
  }
}

/** A forge began on `side`: which runes, from where, at what size. */
const begin = (side: number, f: Forge): void => {
  measure(side)
  for (let i = 0; i < 3; i++) {
    const k = side * 3 + i
    const r = i < f.q.length ? f.q[i]! : -1
    if (ids[k] !== r) ids[k] = r
    const el = els[k]
    if (el) {
      el.style.width = el.style.height = `${size[side]}px`
      el.style.setProperty('--glow', r >= 0 ? RUNES[r]![1] : 'transparent')
    }
  }
}

const hide = (k: number): void => {
  if (!shown[k]) return
  shown[k] = false
  const el = els[k]
  if (el) el.style.opacity = '0'
}

/** Once a frame (`syncHud`): place every rune that is in flight. */
const frame = (): void => {
  const L = hudLayout.value
  const still = reducedMotion.value
  for (let side = 0; side < 2; side++) {
    const f = side ? S.eForge : S.forge
    const live = f.t >= 0 && S.phase === PH_DUEL
    if (live && f.n !== seen[side]) {
      seen[side] = f.n
      begin(side, f)
    }
    const half = size[side]! / 2
    for (let i = 0; i < 3; i++) {
      const k = side * 3 + i
      const el = els[k]
      if (!el || !live || i >= f.q.length) {
        hide(k)
        continue
      }
      runeAt(f.t / FORGE_S, i, f.q.length, sx[k]!, sy[k]!, side === 1, still, P)
      if (P.a <= 0.001) {
        hide(k)
        continue
      }
      const x = L.vx + P.x * L.vs - half
      const y = L.vy + P.y * L.vs - half
      el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) scale(${P.s.toFixed(3)})`
      el.style.opacity = P.a.toFixed(3)
      shown[k] = true
    }
  }
}

onMounted(() => registerForgeLayer(frame))
onUnmounted(() => registerForgeLayer(null))
// A resize or a rotation mid-forge: the slots moved, so measure them again.
watch(hudLayout, () => {
  void nextTick(() => {
    if (S.forge.t >= 0) measure(0)
    if (S.eForge.t >= 0) measure(1)
  })
})
</script>

<template lang="pug">
  div.spell-forge(ref="root" aria-hidden="true")
    div.forge-rune(v-for="k in 6" :key="k" :ref="bind(k - 1)")
      span.forge-halo
      RuneGlyph.forge-glyph(v-if="runeOf(k) >= 0" :rune="runeOf(k)")
</template>

<style scoped lang="sass">
.spell-forge
  position: absolute
  inset: 0
  pointer-events: none
  overflow: hidden

// Sized and moved by hand (`frame`): a box the size of the slot's glyph,
// translated so its centre is the rune's place, scaled about that centre.
.forge-rune
  position: absolute
  left: 0
  top: 0
  width: 0
  height: 0
  opacity: 0
  transform-origin: 50% 50%
  will-change: transform, opacity

// The rune's own light around it as it flies: its element's second tone
// (`RUNES`), set per forge as `--glow`. A soft disc, not a filter — a
// drop-shadow on a moving element is repainted every frame.
.forge-halo
  position: absolute
  inset: -38%
  border-radius: 50%
  background: radial-gradient(closest-side, var(--glow), transparent)
  opacity: 0.85

.forge-glyph
  position: absolute
  left: 0
  top: 0
  width: 100%
  height: 100%
</style>
