<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { EARTH, GY, RUNES, RUNE_IDS, UX } from '@/game/duel/config'
import { glyphPoints, GLYPH_INK, GLYPH_INK_W, GLYPH_COL_W } from '@/game/duel/glyph'
import { strengthView, type DemoFrame } from '@/game/duel/strengthLesson'
import { hudLayout } from '@/use/useDuelHud'
import { reducedMotion } from '@/use/useAccessibility'
import RuneGlyph from '@/components/duel/RuneGlyph.vue'
import GameIcon from '@/components/icons/GameIcon.vue'

/**
 * THE STRENGTH LESSON's picture (story-spec §8.36a; the rules are
 * `game/duel/strengthLesson.ts`). WORDLESS: glyphs, rune icons, a ✕ and a ✓,
 * a ghost finger and motion — no caption. The foe is held; this shows, on a
 * loop, a hand closed on her strength landing weak and the same two runes
 * closed the other way round landing big, and marks Aurora's own closing slot
 * ✕ or ✓ as she builds her hand.
 *
 * THE DEMO, per half (`strengthLesson.demoFrame`): the ghost finger draws a
 * rune on the pad from a gold start dot — the first-duel lesson's own finger
 * (`render.drawIntroTrace`), in SVG here so the whole demo keeps one clock —
 * and the drawn rune drops into her slot; then the next; the closing slot gets
 * its ✕ (a coral chip: the game's "no", never a hard red) or its ✓ (mint);
 * the two runes lift out into one ghost spell that flies to the foe, where it
 * lands as a small puff behind a shield in the strength colour, or as a big
 * burst in its own. The HUD's strength badge pulses meanwhile — the sim sets
 * `S.strongCue` and `DuelHud` binds it.
 *
 * WHERE. Mounted beside the duel HUD (`GameScene.vue`), over it, as one layer
 * in CSS px: her slots are measured off the DOM (`[data-my-slot]`, the way
 * `SpellForge.vue` finds them), the pad is the live layout's `zonePx` and the
 * foe the stage point mapped through it — so one layer is right in landscape
 * and in portrait, and it re-measures on every resize or rotation.
 *
 * CHEAP. Always mounted, it does nothing while the lesson is off but read one
 * flag a frame; while it is on, the moving parts are written straight to the
 * DOM once a frame, and Vue only hears about which runes and marks are up.
 * It reads the sim's clock, so it stops with the game.
 *
 * Reduced motion: the finger does not travel — each rune appears whole and
 * then sits in its slot; no spell flies, the landing simply shows at the foe.
 */
const { t } = useI18n()

const root = ref<HTMLElement | null>(null)
const on = ref(false)
/** The strength and its pair, for the label. */
const strong = ref(-1)
const yes = ref(false)
/** The demo's discrete parts. */
const demoUp = ref(false)
const runeA = ref(-1)
const runeB = ref(-1)
const half = ref(0)
const markUp = ref(false)
/** The rune dropping into a slot right now (-1 none). */
const flyRune = ref(-1)
/** A slot glyph's edge, CSS px (94.4 % of the slot, `RuneSlot.vue`), and a
 *  token that bumps on every measure — the marks' places are read off it. */
const glyphPx = ref(48)
const measures = ref(0)
/** Her own closing slot's mark. */
const mine = reactive({ slot: -1, ok: false, n: 0 })

const aria = computed(() => (yes.value
  ? t('duel.great')
  : strong.value >= 0 ? t('lesson.strength.hint', { rune: t(`rune.${RUNE_IDS[strong.value]}`) }) : ''))

/* ── the moving parts, written by hand ── */
const svg = ref<SVGSVGElement | null>(null)
const ghostInk = ref<SVGPathElement | null>(null)
const ghostCol = ref<SVGPathElement | null>(null)
const traceInk = ref<SVGPathElement | null>(null)
const traceCol = ref<SVGPathElement | null>(null)
const dot = ref<SVGCircleElement | null>(null)
const finger = ref<SVGCircleElement | null>(null)
const slotEls: (HTMLElement | null)[] = [null, null]
const bindSlot = (i: number) => (el: unknown): void => { slotEls[i] = (el as HTMLElement | null) ?? null }
const fly = ref<HTMLElement | null>(null)
const orb = ref<HTMLElement | null>(null)
const hit = ref<HTMLElement | null>(null)

/** Her three slots' centres and glyph size, CSS px in this layer. */
const sx = [0, 0, 0]
const sy = [0, 0, 0]
let slotW = 48
let measured = false

const measure = (): void => {
  const host = root.value
  const scene = host?.closest('.duel-scene') ?? host?.parentElement
  if (!host || !scene) return
  const o = host.getBoundingClientRect()
  const list = scene.querySelectorAll<HTMLElement>('[data-my-slot]')
  let ok = false
  for (let i = 0; i < 3; i++) {
    const r = list[i]?.getBoundingClientRect()
    if (!r || !(r.width > 0)) continue
    sx[i] = r.left + r.width / 2 - o.left
    sy[i] = r.top + r.height / 2 - o.top
    slotW = r.width
    ok = true
  }
  measured = ok
  glyphPx.value = Math.round(slotW * 0.944)
  measures.value++
  const w = svg.value
  if (w) {
    w.setAttribute('width', String(o.width))
    w.setAttribute('height', String(o.height))
    w.setAttribute('viewBox', `0 0 ${o.width} ${o.height}`)
  }
}

/* ── the traced glyph: its polyline, walked by length ── */
interface Walk { k: number; R: number; cx: number; cy: number; subs: [number, number][][]; total: number }
let walk: Walk | null = null
const walkOf = (k: number, cx: number, cy: number, R: number): Walk => {
  if (walk && walk.k === k && walk.R === R && walk.cx === cx && walk.cy === cy) return walk
  // The square from its top-left corner, as a child writes it (the lesson's).
  const { paths } = glyphPoints(k, cx, cy, R, 1, k === EARTH ? 2 : 0)
  let total = 0
  for (const sub of paths) {
    for (let j = 1; j < sub.length; j++) total += Math.hypot(sub[j]![0] - sub[j - 1]![0], sub[j]![1] - sub[j - 1]![1])
  }
  walk = { k, R, cx, cy, subs: paths, total }
  return walk
}
const HEAD = { x: 0, y: 0 }
/** The path `d` of the first `f` of the glyph; its head lands in `HEAD`. */
const partial = (w: Walk, f: number): string => {
  let left = Math.max(0, Math.min(1, f)) * w.total
  let d = ''
  HEAD.x = w.subs[0]?.[0]?.[0] ?? w.cx
  HEAD.y = w.subs[0]?.[0]?.[1] ?? w.cy
  for (const sub of w.subs) {
    if (!sub.length) continue
    d += `M${sub[0]![0].toFixed(1)} ${sub[0]![1].toFixed(1)}`
    HEAD.x = sub[0]![0]
    HEAD.y = sub[0]![1]
    for (let j = 1; j < sub.length; j++) {
      const [ax, ay] = sub[j - 1]!
      const [bx, by] = sub[j]!
      const L = Math.hypot(bx - ax, by - ay)
      if (left >= L) {
        d += `L${bx.toFixed(1)} ${by.toFixed(1)}`
        left -= L
        HEAD.x = bx
        HEAD.y = by
        continue
      }
      const u = L > 0 ? left / L : 0
      HEAD.x = ax + (bx - ax) * u
      HEAD.y = ay + (by - ay) * u
      return `${d}L${HEAD.x.toFixed(1)} ${HEAD.y.toFixed(1)}`
    }
  }
  return d
}
const whole = (w: Walk): string => partial(w, 1)

const ease = (x: number): number => 1 - (1 - x) * (1 - x)
const lerp = (a: number, b: number, u: number): number => a + (b - a) * u
const show = (el: Element | null | undefined, a: number): void => {
  if (el) (el as HTMLElement).style.opacity = a > 0.001 ? a.toFixed(3) : '0'
}
const place = (el: HTMLElement | null | undefined, x: number, y: number, s = 1): void => {
  if (el) el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) translate(-50%,-50%) scale(${s.toFixed(3)})`
}

const hideDemo = (): void => {
  for (const el of [ghostInk.value, ghostCol.value, traceInk.value, traceCol.value, dot.value, finger.value]) show(el, 0)
  for (const el of slotEls) show(el, 0)
  show(fly.value, 0)
  show(orb.value, 0)
  show(hit.value, 0)
}

/** Draw one demo frame. */
const drawDemo = (d: DemoFrame, now: number): void => {
  const L = hudLayout.value
  const z = L.zonePx
  const cx = z.x + z.w / 2
  const cy = z.y + z.h / 2
  const R = Math.min(z.w, z.h) * 0.26
  const still = reducedMotion.value
  const hand = [d.a, d.b]
  // ── the finger on the pad ──
  const k = d.tracing >= 0 ? hand[d.tracing]! : d.dot >= 0 ? hand[d.dot]! : -1
  if (k >= 0) {
    const w = walkOf(k, cx, cy, R)
    const col = RUNES[k]?.[0] ?? GLYPH_INK
    const full = whole(w)
    for (const [el, width, stroke] of [
      [ghostInk.value, R * GLYPH_INK_W, GLYPH_INK], [ghostCol.value, R * GLYPH_COL_W, col]
    ] as const) {
      if (!el) continue
      el.setAttribute('d', full)
      el.setAttribute('stroke-width', width.toFixed(1))
      el.setAttribute('stroke', stroke)
      show(el, 0.18)
    }
    const f = d.tracing >= 0 ? (still ? 1 : d.traceF) : 0
    const part = f > 0.001 ? partial(w, f) : ''
    for (const [el, width, stroke] of [
      [traceInk.value, R * GLYPH_INK_W, GLYPH_INK], [traceCol.value, R * GLYPH_COL_W, col]
    ] as const) {
      if (!el) continue
      el.setAttribute('d', part)
      el.setAttribute('stroke-width', width.toFixed(1))
      el.setAttribute('stroke', stroke)
      show(el, part ? (still ? Math.min(1, d.traceF * 3) : 1) : 0)
    }
    // Where the finger sets off — over the stroke, so it stays put.
    const s0 = w.subs[0]?.[0]
    const dt = dot.value
    if (dt && s0) {
      dt.setAttribute('cx', s0[0].toFixed(1))
      dt.setAttribute('cy', s0[1].toFixed(1))
      dt.setAttribute('r', (R * (0.13 + (still ? 0.03 : 0.05 * (0.5 + 0.5 * Math.sin(now * 5.6))))).toFixed(1))
      dt.setAttribute('stroke-width', (R * 0.045).toFixed(1))
      show(dt, 1)
    }
    const fg = finger.value
    if (fg && d.tracing >= 0 && !still) {
      partial(w, d.traceF)
      fg.setAttribute('cx', HEAD.x.toFixed(1))
      fg.setAttribute('cy', HEAD.y.toFixed(1))
      fg.setAttribute('r', (R * 0.18).toFixed(1))
      fg.setAttribute('stroke-width', (R * 0.05).toFixed(1))
      show(fg, 1)
    } else show(fg, 0)
  } else {
    for (const el of [ghostInk.value, ghostCol.value, traceInk.value, traceCol.value, dot.value, finger.value]) show(el, 0)
  }
  // ── the drawn rune dropping into its slot ──
  const fl = fly.value
  if (fl && d.flying >= 0) {
    const i = d.flying
    const u = still ? 1 : ease(d.flyF)
    // From the drawn glyph's own size on the pad (a glyph of radius R fills
    // 60 % of a RuneGlyph box) to the slot's.
    const from = (R * 100) / 30
    const to = glyphPx.value
    const size = lerp(from, to, u)
    place(fl, lerp(cx, sx[i]!, u), lerp(cy, sy[i]!, u), size / to)
    show(fl, still ? (d.flyF > 0.5 ? 0 : 1) : 1)
  } else show(fl, 0)
  // ── the runes in her slots ──
  for (let i = 0; i < 2; i++) {
    const el = slotEls[i]
    if (!el) continue
    const inSlot = i < d.inSlots || (still && d.flying === i && d.flyF > 0.5)
    place(el, sx[i]!, sy[i]!)
    // A ghost of a rune — never mistaken for one she drew herself.
    show(el, inSlot ? 0.82 * d.slotA : 0)
  }
  // ── the ghost spell, and where it lands ──
  // The ghost spell flies as the rune that closed it.
  const lead = d.b
  const ok = d.half === 1
  const fx = L.vx + UX * L.vs
  const fy = L.vy + (GY - 90) * L.vs
  const ob = orb.value
  if (ob && d.orbF >= 0 && !still) {
    const u = ease(d.orbF)
    const ox = (sx[0]! + sx[1]!) / 2
    const oy = (sy[0]! + sy[1]!) / 2
    ob.style.setProperty('--glow', RUNES[lead]?.[1] ?? 'transparent')
    ob.style.setProperty('--core', RUNES[lead]?.[0] ?? 'transparent')
    const base = slotW * (ok ? 1.5 : 0.7)
    ob.style.width = ob.style.height = `${base}px`
    place(ob, lerp(ox, fx, u), lerp(oy, fy, u) - Math.sin(u * Math.PI) * slotW * 0.8, 0.6 + 0.4 * u)
    show(ob, ok ? 1 : 0.5)
  } else show(ob, 0)
  const ht = hit.value
  if (ht && d.hitF >= 0) {
    const u = d.hitF
    ht.style.setProperty('--glow', RUNES[lead]?.[1] ?? 'transparent')
    const base = slotW * (ok ? 3 : 1.4)
    ht.style.width = ht.style.height = `${base}px`
    place(ht, fx, fy, still ? 1 : ok ? 0.5 + 0.9 * ease(u) : 0.8 + 0.25 * ease(u))
    show(ht, u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3)
  } else show(ht, 0)
}

let raf = 0
let lastN = Number.NaN
const frame = (now: number): void => {
  raf = requestAnimationFrame(frame)
  const v = strengthView()
  if (on.value !== v.on) {
    on.value = v.on
    if (v.on) {
      measured = false
      void nextTick(() => { measure() })
    }
  }
  if (!v.on) {
    if (demoUp.value) demoUp.value = false
    if (mine.slot !== -1) mine.slot = -1
    if (yes.value) yes.value = false
    return
  }
  if (strong.value !== v.strong) strong.value = v.strong
  if (yes.value !== v.yes) yes.value = v.yes
  if (!measured) measure()
  // Her own mark: discrete, keyed so each new one pops.
  if (mine.slot !== v.slot || mine.ok !== v.ok || lastN !== v.n) {
    lastN = v.n
    mine.slot = v.slot
    mine.ok = v.ok
    mine.n++
  }
  const d = v.demo
  if (!d) {
    if (demoUp.value) {
      demoUp.value = false
      hideDemo()
    }
    return
  }
  if (!demoUp.value) demoUp.value = true
  if (runeA.value !== d.a) runeA.value = d.a
  if (runeB.value !== d.b) runeB.value = d.b
  if (half.value !== d.half) half.value = d.half
  if (markUp.value !== d.verdict) markUp.value = d.verdict
  const fr = d.flying >= 0 ? (d.flying ? d.b : d.a) : -1
  if (flyRune.value !== fr) flyRune.value = fr
  drawDemo(d, now / 1000)
}

/** A mark's place: slot `i`'s top-right corner (re-read on every measure). */
const markAt = (i: number): Record<string, string> => {
  void measures.value
  if (i < 0) return {}
  // Big enough to read at a glance on a phone: most of a slot.
  const s = Math.round(slotW * 0.62)
  return {
    width: `${s}px`,
    height: `${s}px`,
    left: `${(sx[i]! + slotW * 0.42).toFixed(1)}px`,
    top: `${(sy[i]! - slotW * 0.42).toFixed(1)}px`
  }
}
const glyphBox = computed(() => ({ width: `${glyphPx.value}px`, height: `${glyphPx.value}px` }))

onMounted(() => { raf = requestAnimationFrame(frame) })
onUnmounted(() => cancelAnimationFrame(raf))
// A resize or a rotation: the slots and the pad moved.
watch(hudLayout, () => {
  walk = null
  void nextTick(() => { if (on.value) measure() })
})
</script>

<template lang="pug">
  div.strength-lesson(ref="root" v-show="on" role="img" :aria-label="aria" :class="{ still: reducedMotion, yes }")
    //- The ghost finger on the pad: the rune faint, its stroke so far, the
    //- gold start dot and the finger itself.
    svg.sl-pad(ref="svg" aria-hidden="true" focusable="false")
      path(ref="ghostInk" fill="none" stroke-linecap="round" stroke-linejoin="round")
      path(ref="ghostCol" fill="none" stroke-linecap="round" stroke-linejoin="round")
      path(ref="traceInk" fill="none" stroke-linecap="round" stroke-linejoin="round")
      path(ref="traceCol" fill="none" stroke-linecap="round" stroke-linejoin="round")
      circle.sl-dot(ref="dot")
      circle.sl-finger(ref="finger")
    template(v-if="demoUp")
      //- The demo's two runes in her slots — ghosts of runes.
      div.sl-rune(:ref="bindSlot(0)" :style="glyphBox" aria-hidden="true")
        RuneGlyph(v-if="runeA >= 0" :rune="runeA")
      div.sl-rune(:ref="bindSlot(1)" :style="glyphBox" :class="{ dull: markUp && half === 0 }" aria-hidden="true")
        RuneGlyph(v-if="runeB >= 0" :rune="runeB")
      //- A drawn rune on its way from the pad into its slot.
      div.sl-rune.sl-fly(ref="fly" :style="glyphBox" aria-hidden="true")
        RuneGlyph(v-if="flyRune >= 0" :rune="flyRune")
      //- The closing slot's verdict.
      div.sl-mark(v-if="markUp" :key="'d' + half" :class="half ? 'ok' : 'no'" :style="markAt(1)" aria-hidden="true")
        GameIcon(:name="half ? 'check' : 'close'")
      //- The ghost spell, and where it lands.
      div.sl-orb(ref="orb" aria-hidden="true")
      div.sl-hit(ref="hit" :class="half ? 'ok' : 'no'" aria-hidden="true")
        span.sl-burst
        span.sl-shield(v-if="!half")
          GameIcon(name="shield")
    //- Her own closing slot: ✕ on a hand that closes on the strength, ✓ once
    //- it is two runes or more closed on another.
    div.sl-mark(v-if="mine.slot >= 0" :key="'m' + mine.n" :class="mine.ok ? 'ok' : 'no'" :style="markAt(mine.slot)" aria-hidden="true")
      GameIcon(:name="mine.ok ? 'check' : 'close'")
</template>

<style scoped lang="sass">
.strength-lesson
  position: absolute
  inset: 0
  pointer-events: none
  overflow: hidden

.sl-pad
  position: absolute
  left: 0
  top: 0
  overflow: visible
  path, circle
    opacity: 0

.sl-dot
  fill: var(--am-gold)
  stroke: var(--am-ink)

.sl-finger
  fill: var(--am-paper-raised)
  stroke: var(--am-ink)

// Placed by hand once a frame (`place`): a box at the layer's origin,
// translated so its centre is the point, scaled about that centre.
.sl-rune, .sl-orb, .sl-hit
  position: absolute
  left: 0
  top: 0
  opacity: 0
  will-change: transform, opacity

.sl-rune
  :deep(svg)
    display: block
    width: 100%
    height: 100%
  // A GHOST of a rune: a soft light behind it, so it never reads as one she
  // drew herself.
  filter: drop-shadow(0 0 5px var(--am-paper-raised))
  &.dull
    filter: grayscale(0.7) brightness(0.8)
    transition: filter var(--am-dur-ui) var(--am-ease-out)

// The verdict: a round chip at the closing slot's corner. ✕ is the game's
// "no" — a soft coral chip with a plum mark (ui-design-system §3.11), never a
// hard red; ✓ is mint. Both ringed in the chrome's plum. Placed by `left` /
// `top` (it only moves with the layout), centred by its own translate — which
// the pop's keyframes carry, so it swells in place.
.sl-mark
  position: absolute
  display: flex
  align-items: center
  justify-content: center
  border-radius: 50%
  color: var(--am-ink)
  box-shadow: 0 0 0 3px var(--am-ink), var(--am-shadow-chip)
  transform: translate(-50%, -50%)
  animation: sl-pop 0.4s var(--am-ease-pop) both
  &.no
    background: linear-gradient(to bottom, var(--am-coral), var(--am-coral-foot))
  &.ok
    background: linear-gradient(to bottom, var(--am-mint), var(--am-mint-foot))
  // (Its own share of the chip: a padding percentage would be the LAYER's.)
  :deep(.game-icon)
    width: 74%
    height: 74%

// The ghost spell: the closing rune's own light (`RUNES`, data), a bright core.
.sl-orb
  border-radius: 50%
  background: radial-gradient(closest-side, var(--core) 0 28%, var(--glow) 55%, transparent)

.sl-hit
  display: flex
  align-items: center
  justify-content: center

.sl-burst
  position: absolute
  inset: 0
  border-radius: 50%
  background: radial-gradient(closest-side, var(--glow) 0 35%, transparent)
.sl-hit.ok .sl-burst
  background: radial-gradient(closest-side, var(--am-paper-raised) 0 18%, var(--glow) 40%, transparent 72%)
  box-shadow: 0 0 0 4px var(--am-mint)
.sl-hit.no .sl-burst
  opacity: 0.55

// Her strength held it off: a shield in the strength colour, in the plum
// outline the token asks for.
.sl-shield
  position: relative
  width: 62%
  height: 62%
  color: var(--am-resist)
  filter: drop-shadow(1.5px 0 0 var(--am-ink)) drop-shadow(-1.5px 0 0 var(--am-ink)) drop-shadow(0 1.5px 0 var(--am-ink)) drop-shadow(0 -1.5px 0 var(--am-ink))

// The pop is the mark itself, so it keeps it under reduced motion.
@keyframes sl-pop
  0%
    transform: translate(-50%, -50%) scale(0.4)
  60%
    transform: translate(-50%, -50%) scale(1.25)
  100%
    transform: translate(-50%, -50%) scale(1)
</style>
