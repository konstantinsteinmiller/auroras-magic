// ─── The reactivity firewall between the duel and the HUD ──────────────────
//
// The duel state (`S` in `game/duel/state.ts`) is a plain object that the
// simulation rewrites 120 times a second. The HUD is Vue. Making `S` reactive
// would put dependency tracking on every write of every particle-adjacent
// field; instead, once per rendered frame, `syncHud()` copies out the handful
// of DISCRETE values the HUD shows — and assigns only the ones that changed,
// so Vue re-renders only when something a player can see actually moved.
//
// The CONTINUOUS values (the HP bars draining, the foe's rune-forming ring)
// change every frame while they animate. Those bypass Vue entirely: the
// components register their elements here and `syncHud()` writes the style
// directly — the hot-path DOM write the playbook asks for.

import { reactive, shallowRef } from 'vue'
import { S, POP_LIFE, type Pop } from '@/game/duel/state'
import { HP_MAX, MAX_RUNES, PH_DUEL, type Rune } from '@/game/duel/config'
import { spellOf } from '@/game/duel/sim'
import type { SpellNameParts } from '@/use/useSpellName'
import { LAYOUT, type DuelLayout } from '@/game/duel/layout'
import { damp, clamp } from '@/game/duel/util'

export interface HudState {
  phase: number
  resultUp: boolean
  /** The panel has been up long enough to accept "tap to duel". */
  tapReady: boolean
  intro: boolean
  introStep: number
  book: boolean
  foe: number
  queue: Rune[]
  equeue: Rune[]
  /** Slot index the foe's next rune is forming in, or -1 when her hand is full. */
  eSlot: number
  eRune: number
  /** The spell the CAST button would throw, or null when the hand is empty. */
  cast: SpellNameParts | null
  /** Lifetime duels won: the leaderboard's score. */
  wins: number
}

export const hud = reactive<HudState>({
  phase: PH_DUEL,
  resultUp: false,
  tapReady: false,
  intro: true,
  introStep: 0,
  book: false,
  foe: 0,
  queue: [],
  equeue: [],
  eSlot: 0,
  eRune: -1,
  cast: null,
  wins: 0
})

/** Callouts on screen. Membership is reactive; the motion is a CSS animation. */
export const hudPops = shallowRef<Pop[]>([])

/** The live layout, re-published on resize. */
export const hudLayout = shallowRef<DuelLayout>(LAYOUT)
export const publishLayout = (l: DuelLayout): void => { hudLayout.value = l }

/* ---------------------------- hot elements ---------------------------- */

interface Hot {
  hpFill: HTMLElement | null
  hpGhost: HTMLElement | null
  ehpFill: HTMLElement | null
  ehpGhost: HTMLElement | null
  /** SVG circle whose dash offset draws the foe's forming progress. */
  formRing: SVGCircleElement | null
  /** The ghost glyph of the rune being formed (its opacity tracks progress). */
  formGhost: HTMLElement | SVGElement | null
  /** The foe's whole HP plate. Never written, only hit-tested (`isOnFoeHpBar`). */
  ehpBar: HTMLElement | null
}
const hot: Hot = { hpFill: null, hpGhost: null, ehpFill: null, ehpGhost: null, formRing: null, formGhost: null, ehpBar: null }
export const registerHot = <K extends keyof Hot>(k: K, el: Hot[K]): void => { hot[k] = el }
/** Clear a registration only if it is still `el` — see `RuneSlot.vue`. */
export const releaseHot = <K extends keyof Hot>(k: K, el: Hot[K]): void => {
  if (hot[k] === el) hot[k] = null
}

/**
 * Is the viewport point (x, y) on the foe's HP bar? This is the target of the
 * hidden QA ad chord (`useQaAdTrigger`). The bar takes no pointer events,
 * because a stroke may start on top of it, so the scene hit-tests its box
 * instead. Read on a press, never per frame.
 */
export const isOnFoeHpBar = (x: number, y: number): boolean => {
  const el = hot.ehpBar
  if (!el) return false
  const r = el.getBoundingClientRect()
  return r.width > 0 && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
}

/** Animated mirrors of HP that must not pollute S: they snap UP (a new duel)
 *  and lag DOWN, so damage drains as a red chunk. */
let ha = HP_MAX
let ea = HP_MAX
/** Circumference of the forming ring, set by the component that owns it. */
let ringLen = 0
export const setRingLength = (n: number): void => { ringLen = n }

/** Width, not scaleX: the fill is a pill, and scaling it would squash its
 *  rounded ends exactly when the bar is nearly empty and most watched. */
const setWidth = (el: HTMLElement | null, v: number, vmax: number): void => {
  if (!el) return
  const k = clamp(v / (vmax || HP_MAX), 0, 1)
  el.style.width = `${(k * 100).toFixed(2)}%`
  el.style.visibility = k > 0.006 ? 'visible' : 'hidden'
}

const sameRunes = (a: readonly number[], b: readonly number[]): boolean =>
  a.length === b.length && a.every((v, i) => v === b[i])

/** Once per rendered frame, after the sim stepped. `dt` in seconds. */
export const syncHud = (dt: number): void => {
  // ── continuous: direct DOM writes ──
  ha = S.hp > ha ? S.hp : damp(ha, S.hp, 5, dt)
  ea = S.ehp > ea ? S.ehp : damp(ea, S.ehp, 5, dt)
  // Per side (F18): a boss's bar is full at HER max, not the player's.
  setWidth(hot.hpFill, S.hp, S.hpMax)
  setWidth(hot.hpGhost, ha, S.hpMax)
  setWidth(hot.ehpFill, S.ehp, S.ehpMax)
  setWidth(hot.ehpGhost, ea, S.ehpMax)
  if (hot.formRing && ringLen) hot.formRing.style.strokeDashoffset = String(ringLen * (1 - clamp(S.eForm, 0, 1)))
  if (hot.formGhost) hot.formGhost.style.opacity = String(0.22 + 0.7 * clamp(S.eForm, 0, 1))

  // ── discrete: assign only on change ──
  if (hud.phase !== S.phase) hud.phase = S.phase
  if (hud.resultUp !== S.resultUp) hud.resultUp = S.resultUp
  const tap = S.resultUp && S.panelT > 0.5
  if (hud.tapReady !== tap) hud.tapReady = tap
  if (hud.intro !== !!S.intro) hud.intro = !!S.intro
  if (hud.introStep !== S.introStep) hud.introStep = S.introStep
  if (hud.book !== !!S.book) hud.book = !!S.book
  if (hud.foe !== S.foe) hud.foe = S.foe
  if (!sameRunes(hud.queue, S.queue)) hud.queue = [...S.queue]
  if (!sameRunes(hud.equeue, S.equeue)) hud.equeue = [...S.equeue]
  const eSlot = S.equeue.length < MAX_RUNES && S.eForm > 0 ? S.equeue.length : -1
  if (hud.eSlot !== eSlot) hud.eSlot = eSlot
  if (hud.eRune !== S.eRune) hud.eRune = S.eRune
  // The CAST plate's spell: re-resolved only when the hand changes.
  if (castFor !== handKey()) {
    castFor = handKey()
    if (S.queue.length) {
      const sp = spellOf(S.queue)
      hud.cast = { nameId: sp.nameId, kind: sp.kind, count: sp.count, rune: sp.dominant }
    } else hud.cast = null
  }
  if (hud.wins !== S.wins) hud.wins = S.wins

  // ── callouts: age while the game runs, publish membership changes ──
  const list = hudPops.value
  if (list.length !== S.pops.length || list.some((p, i) => p !== S.pops[i])) hudPops.value = [...S.pops]
}

/** Age the callouts. Called from the unpaused part of the frame, so a callout
 *  under an ad or an open modal waits instead of expiring unseen. */
export const agePops = (dt: number): void => {
  for (let i = S.pops.length; i--;) {
    const p = S.pops[i]!
    p.a += dt
    if (p.a > POP_LIFE) S.pops.splice(i, 1)
  }
}

/** A new duel: the ghost bars snap back to full. */
export const resetHudMirrors = (): void => {
  ha = S.hpMax
  ea = S.ehpMax
  castFor = '-'
}

/** The hand the CAST plate last resolved, and the current one, as a key. */
let castFor = '-'
const handKey = (): string => S.queue.join('.')
