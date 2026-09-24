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
import { S, POP_LIFE, type CastRefusal, type Pop } from '@/game/duel/state'
import { perfectSlot, perfectToken } from '@/game/duel/perfect'
import { helpNoteUp, helpToken } from '@/game/duel/help'
import {
  castInvite, chipsCaptionDue, chipsDue, lockedHint, nudgeUp, runeGreat, runeGuideRune
} from '@/game/duel/lesson'
import { STARTING_RUNES } from '@/game/campaign/tables'
import { HP_MAX, MAX_RUNES, PH_DUEL, type Rune } from '@/game/duel/config'
import { spellOf, foeTell, castBusy } from '@/game/duel/sim'
import type { SpellNameParts } from '@/use/useSpellName'
import { LAYOUT, type DuelLayout } from '@/game/duel/layout'
import { clamp } from '@/game/duel/util'
import { barLowLevel, foeAlmost, gaugeFill, newGhost, resetGhost, stepGhost, writeGauge, type LowLevel } from '@/game/duel/hpGauge'

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
  /** Player 2's, in local versus. */
  ecast: SpellNameParts | null
  /** Lifetime duels won: the leaderboard's score. */
  wins: number
  /** The low-health glow on the player's HP bar (`hpGauge.lowLevel`): 0 none,
   *  1 a steady glow (≤ 30 %), 2 a gentle pulse (< 25 %). `elow` is player
   *  2's in local versus, and always 0 against a foe. */
  low: LowLevel
  elow: LowLevel
  /** The FOE's "almost there!" gold shimmer (`hpGauge.foeAlmost`): under a
   *  quarter of her HP — good news, never player 2's red glow. */
  ealmost: boolean
  /**
   * The perfect-rune sparkle (retention item 7). `perfect` is a token that
   * bumps on every perfect rune — the slot's twinkle is keyed on it, so the
   * same slot can sparkle twice — and `perfectSlot` is where it landed. Both
   * live in `game/duel/perfect.ts`, outside `S`, so no rule can read them.
   */
  perfect: number
  perfectSlot: number
  /** Aurora's after-two-losses note (retention item 8): the help token while
   *  the line is up, 0 when it is not. */
  help: number
  /** The first duel's lesson (`game/duel/lesson.ts`): the cast button's
   *  re-invite token, bumped when it opens and on every stroke after. */
  invite: number
  /** A lesson nudge's callout is up: the step's top caption stands aside. */
  nudge: boolean
  /** Her KNOWN runes as a bitmask while the pad's rune chips are due
   *  (`lesson.chipsDue`), 0 when they are not. */
  chips: number
  /** …and whether they wear their "Your runes" caption (`chipsCaptionDue`). */
  chipsCaption: boolean
  /** The new-rune guide (`lesson.runeGuideRune`): the rune it shows on the
   *  pad, -1 when none; and its "Great!" — a token while it is up (0 none)
   *  and the rune it praised. */
  runeGuide: number
  runeGreat: number
  runeGreatRune: number
  /** A stroke matched a rune she has not earned yet: the card's token (0 =
   *  none up), the rune, and where the refusal would have stood (stage). */
  locked: number
  lockedRune: number
  lockedX: number
  lockedY: number
  /** What the foe's slots warn of (`sim.foeTell`, story-spec §8.36): 2 a full
   *  hand winding up to hit, 1 two runes of one, 0 nothing. */
  eTell: number
  /** The depth glimpse's hint (§8.36): the rune it names while it shows, -1
   *  when it does not; and whether that rune has just found the gap. */
  glimpse: number
  glimpseYes: boolean
  /** THE CAST REFUSAL (story-spec §8.37), mirrored from `S.castRefusedAt` /
   *  `S.castRefusedWhy`: the `S.t` of the player's last refused cast request
   *  (-1 none this duel) — it changes on every refusal, so an animation can be
   *  keyed on it — and which rule refused it. */
  refusedAt: number
  refusedWhy: CastRefusal
  /** THE CAST LOCK (§8.37): a spell of the player's (`busy`) / of the right-hand
   *  side's (`ebusy`) is forging or still in flight, so a cast now is refused. */
  busy: boolean
  ebusy: boolean
  /** THE SPELL FORGE (§8.37), per side: is one forging now, its token (bumps
   *  on every new forge — the slots' "pop" is keyed on it) and the runes it
   *  took, in slot order. */
  forging: boolean
  eforging: boolean
  forgeN: number
  eforgeN: number
  forgeQ: number[]
  eforgeQ: number[]
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
  ecast: null,
  wins: 0,
  low: 0,
  elow: 0,
  ealmost: false,
  perfect: 0,
  perfectSlot: -1,
  help: 0,
  invite: 0,
  nudge: false,
  chips: 0,
  chipsCaption: false,
  runeGuide: -1,
  runeGreat: 0,
  runeGreatRune: -1,
  locked: 0,
  lockedRune: -1,
  lockedX: 0,
  lockedY: 0,
  eTell: 0,
  glimpse: -1,
  glimpseYes: false,
  refusedAt: -1,
  refusedWhy: '',
  busy: false,
  ebusy: false,
  forging: false,
  eforging: false,
  forgeN: 0,
  eforgeN: 0,
  forgeQ: [],
  eforgeQ: []
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

/** The HP bars' damage chips — animated mirrors of HP that must not pollute
 *  S: they snap UP (a new duel), and after a hit HOLD for a moment and then
 *  drain, so each hit reads as a pale chunk (`hpGauge.stepGhost`). */
const ha = newGhost(HP_MAX)
const ea = newGhost(HP_MAX)
/**
 * The spell forge's DOM layer (`SpellForge.vue`, story-spec §8.37): the runes
 * leaving the slots are moved by direct style writes once a frame, from
 * `syncHud` — the same frame the canvas draws the orb they turn into.
 */
let forgeLayer: (() => void) | null = null
export const registerForgeLayer = (fn: (() => void) | null): void => { forgeLayer = fn }

/** Circumference of the forming ring, set by the component that owns it. */
let ringLen = 0
export const setRingLength = (n: number): void => { ringLen = n }

const sameRunes = (a: readonly number[], b: readonly number[]): boolean =>
  a.length === b.length && a.every((v, i) => v === b[i])

/** Once per rendered frame, after the sim stepped. `dt` in seconds. */
export const syncHud = (dt: number): void => {
  // ── continuous: direct DOM writes ──
  // Per side (F18): a boss's bar is full at HER max, not the player's. The
  // fill never reads empty above 0 HP (`hpGauge.gaugeFill`), and the chip is
  // never shorter than the fill it trails.
  const hk = gaugeFill(S.hp, S.hpMax)
  const ek = gaugeFill(S.ehp, S.ehpMax)
  writeGauge(hot.hpFill, hk, 'left')
  writeGauge(hot.hpGhost, Math.max(hk, gaugeFill(stepGhost(ha, S.hp, dt), S.hpMax)), 'left')
  writeGauge(hot.ehpFill, ek, 'right')
  writeGauge(hot.ehpGhost, Math.max(ek, gaugeFill(stepGhost(ea, S.ehp, dt), S.ehpMax)), 'right')
  // The low-health glow: the player's bar, and player 2's in local versus.
  const inDuel = S.phase === PH_DUEL
  const low = barLowLevel(S.hp, S.hpMax, true, inDuel)
  if (hud.low !== low) hud.low = low
  const elow = barLowLevel(S.ehp, S.ehpMax, S.versus, inDuel)
  if (hud.elow !== elow) hud.elow = elow
  const ealmost = foeAlmost(S.ehp, S.ehpMax, S.versus, inDuel)
  if (hud.ealmost !== ealmost) hud.ealmost = ealmost
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
  // The foe's telegraph and the depth glimpse (§8.36).
  const tell = foeTell()
  if (hud.eTell !== tell) hud.eTell = tell
  const gl = S.phase === PH_DUEL && (S.glimpse === 2 || S.glimpse === 3) ? S.glimpseRune : -1
  if (hud.glimpse !== gl) hud.glimpse = gl
  const yes = gl >= 0 && S.glimpse === 3
  if (hud.glimpseYes !== yes) hud.glimpseYes = yes
  // The cast refusal and the cast lock (§8.37).
  if (hud.refusedAt !== S.castRefusedAt) hud.refusedAt = S.castRefusedAt
  if (hud.refusedWhy !== S.castRefusedWhy) hud.refusedWhy = S.castRefusedWhy
  const busy = inDuel && castBusy(false)
  if (hud.busy !== busy) hud.busy = busy
  const ebusy = inDuel && castBusy(true)
  if (hud.ebusy !== ebusy) hud.ebusy = ebusy
  // The forges (§8.37): whose, since when, and which runes left the slots.
  const fg = inDuel && S.forge.t >= 0
  if (hud.forging !== fg) hud.forging = fg
  const efg = inDuel && S.eForge.t >= 0
  if (hud.eforging !== efg) hud.eforging = efg
  if (hud.forgeN !== S.forge.n) {
    hud.forgeN = S.forge.n
    hud.forgeQ = [...S.forge.q]
  }
  if (hud.eforgeN !== S.eForge.n) {
    hud.eforgeN = S.eForge.n
    hud.eforgeQ = [...S.eForge.q]
  }
  // …and the runes flying out of the slots, which the forge layer moves by
  // hand every frame (`SpellForge.vue`), like the HP bars above.
  forgeLayer?.()
  // The CAST plate's spell: re-resolved only when the hand changes.
  if (castFor !== handKey()) {
    castFor = handKey()
    if (S.queue.length) {
      const sp = spellOf(S.queue)
      hud.cast = { nameId: sp.nameId, kind: sp.kind, count: sp.count, rune: sp.dominant }
    } else hud.cast = null
    // Player 2's plate, in local versus: her hand, the same resolution.
    if (S.versus && S.equeue.length) {
      const sp = spellOf(S.equeue)
      hud.ecast = { nameId: sp.nameId, kind: sp.kind, count: sp.count, rune: sp.dominant }
    } else hud.ecast = null
  }
  if (hud.wins !== S.wins) hud.wins = S.wins
  // Two int compares for the two retention beats that do not live in `S`.
  const pt = perfectToken()
  if (hud.perfect !== pt) {
    hud.perfect = pt
    hud.perfectSlot = perfectSlot()
  }
  const help = helpNoteUp() ? helpToken() : 0
  if (hud.help !== help) hud.help = help
  // The first duel's lesson and the pad's aids (`game/duel/lesson.ts`).
  const inv = castInvite()
  if (hud.invite !== inv) hud.invite = inv
  const ng = nudgeUp(S.t)
  if (hud.nudge !== ng) hud.nudge = ng
  const chips = S.phase === PH_DUEL && !S.intro && S.flow.mode === 'campaign' && chipsDue(S.flow.node, S.campaign.furthestNode)
    ? (S.campaign.runesUnlocked | STARTING_RUNES) >>> 0
    : 0
  if (hud.chips !== chips) hud.chips = chips
  const cap = chips !== 0 && chipsCaptionDue(S.flow.node, S.campaign.furthestNode)
  if (hud.chipsCaption !== cap) hud.chipsCaption = cap
  const rg = runeGuideRune()
  if (hud.runeGuide !== rg) hud.runeGuide = rg
  const great = runeGreat()
  const gt = great ? great.token : 0
  if (hud.runeGreat !== gt) {
    hud.runeGreat = gt
    if (great) hud.runeGreatRune = great.rune
  }
  const lk = lockedHint()
  const lkToken = lk ? lk.token : 0
  if (hud.locked !== lkToken) {
    hud.locked = lkToken
    if (lk) {
      hud.lockedRune = lk.rune
      hud.lockedX = lk.x
      hud.lockedY = lk.y
    }
  }

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
  resetGhost(ha, S.hpMax)
  resetGhost(ea, S.ehpMax)
  castFor = '-'
}

/** The hand the CAST plate last resolved, and the current one, as a key. */
let castFor = '-'
const handKey = (): string => `${S.queue.join('.')}|${S.versus ? S.equeue.join('.') : ''}`
