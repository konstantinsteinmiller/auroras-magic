/**
 * sim.ts — the duel itself. Owns every rule; draws nothing. The jam build's
 * duel, grown to the story (story-spec §6): foes come from a `FoeDef`, spells
 * from the generator, and the foe's pace from §6.14's rate chain.
 *
 * Flow: pointer stroke -> recognise() -> queue (max 3) -> cast -> a shot ->
 * resolve against barriers -> HP -> sky -> win/lose. The NPC runs the same
 * pipeline through `think`, so both duelists obey identical rules.
 *
 * BOUNDARY (§4.8.1): nothing here imports `src/game/campaign/` or
 * `src/game/flow/`. The campaign resolves a node into a `DuelSetup`-shaped
 * argument; the sim only ever sees a foe's numbers.
 */
import {
  AX, UX, GY, HDX, HDY, BOX, MAX_RUNES, HP_MAX, FIRE, WIND, ICE, EARTH, NATURE, WATER, LIGHTNING, ILLUSION,
  TIME, MOON, LOVE, PH_DUEL, PH_WIN, PH_LOSE, RUNES, NO_EASE, elemMul, resolveSpell, comboEnumerationIndex, comboKey,
  type DuelEase, type Rune, type ResolvedSpell
} from '@/game/duel/config'
import { FOES, tierRate, type FoeDef } from '@/game/duel/foes'
import {
  HASTE, foeDamageScale, hasteLevel, hasteRush, mercyFloor, noteAct, notePlayerCast, playerDamageScale, press,
  resetDirector, stepDirector, KO_HP, MERCY_FRAC, floorLifted, foeMayRelease, lifting, wardWill
} from '@/game/duel/director'
import { S, save, pop, POP_LIFE, type CastRefusal, type Shot } from '@/game/duel/state'
import { recognise, recogniseLocked, rawScore, strokeFeatures, FROZEN_MASK } from '@/game/duel/runes'
import {
  lessonCast, lessonCastOpen, lessonCastRefused, lessonMiss, lessonStored, lessonTakes, resetLesson, stepLesson,
  showLockedRune
} from '@/game/duel/lesson'
import { RUNE_DEFS } from '@/game/duel/runeDefs'
import { clamp, damp, rnd, pick, max, min, hypot, abs } from '@/game/duel/util'
import {
  impact, wardHit, castBurst, fireRain, barrier, rainbowBurst, shakeAdd, flashAdd, trail, gatherGlints, heal,
  decoyRise, decoyPop, decoyFade, reflectFlash, finisherBloom, frostBurst, seepThrough, lingerMote, hasteSpark,
  forgeSpark, liftBloom, liftMote, punchAdd, BAR_CRYSTAL, BAR_FROST
} from '@/game/duel/fx'
import { forgeDuration, forgeProgress, hornGlow } from '@/game/duel/forge'
import { duelPageHit } from '@/game/duel/duelPage'
import { mixRune } from '@/game/duel/spellArt'
import { sfx, setMood } from '@/game/duel/audio'
import { STARTING_RUNES } from '@/game/campaign/tables'

/* ------------------------------ tuning ------------------------------ */
/** Projectile speed per spell kind (stage units/sec); fields/heavies wait. */
const SPD = [980, 0, 0, 0, 1500]
/** Seconds a delayed spell hangs before it lands. GDD: Fire Rain ~2s. */
const DELAY = [0, 0.5, 0, 1.7, 0]
/** A slow with no strength of its own (the base runes' `wetBall`,
 *  `magmaShard`…) is the shipped 45 % (§6.7.7). */
const SLOW_BASE = 0.45
/** A reflected spell comes back at half its base damage (§6.5 says the
 *  whole base; the owner's child-first ruling, 2026-09-18, halves it: a
 *  child's first big combo bounced into her own face is the harshest
 *  lesson in the game, and a pierce or a short wait still beats the ward). */
const REFLECT_K = 0.5
/** Where a duelist's horn is, in stage coords. `e` = is this the foe. */
const hornX = (e: boolean | number): number => (e ? UX - HDX : AX + HDX)
const HORN_Y = GY + HDY

/* ------------------------------ events ------------------------------ */
/**
 * Moments the scene must react to — the portal bracket, haptics, the result
 * flow. The sim stays free of Vue and of every platform module; the scene
 * subscribes.
 *
 * `stroke` carries a `StrokeInfo` for every finished player stroke, and `rune`
 * carries the same record again when that stroke was STORED — versus' second
 * hand reports neither.
 */
export type DuelEvent = 'rune' | 'cast' | 'hurt' | 'hit' | 'finish' | 'stroke' | 'phase'
/** A miss scoring at least this is named as a near-miss (§5.12). Junk sits
 *  well under it; the accept line (`THRESH`) is 0.78. */
export const NEAR_MISS = 0.6

/** What a finished stroke was, for telemetry (`'stroke'` events only). */
export interface StrokeInfo {
  success: boolean
  /** The recognised rune, or on a miss the best-scoring one. */
  rune: number
  ec: number
  turn: number
  /** Best template score minus the 0.78 acceptance threshold. */
  margin: number
}
type Listener = (e: DuelEvent, won?: boolean, info?: StrokeInfo) => void
const listeners = new Set<Listener>()
export const onDuelEvent = (fn: Listener): (() => void) => {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}
const emit = (e: DuelEvent, won?: boolean, info?: StrokeInfo): void => {
  for (const fn of listeners) {
    try { fn(e, won, info) } catch (err) { console.warn('[duel] listener threw', err) }
  }
}

/**
 * What happened in THIS duel that no health bar shows — for tests and tuning
 * harnesses (story-spec §8.35's balance pass); the game itself never reads
 * it. Zeroed by `resetDuel`.
 */
export const duelTally = {
  /** Spells that found a ward's weak point and partly came through it. */
  seep: 0,
  /** Lingering spells that took hold (either side). */
  lingers: 0,
  /** HP the lingers' ticks took off the foe, and off the player. */
  lingerToFoe: 0,
  lingerToPlayer: 0
}

/**
 * The player drew or cast: she is here (director.ts's AFK rule). If she is
 * coming BACK and a blow took her under the mercy floor while she was away,
 * the director lifts her to it over `LIFT_S` — and it is shown on her, so the
 * bar filling back up has a cause a child can see (story-spec §8.36).
 */
const present = (): void => {
  if (!noteAct()) return
  liftBloom(AX, GY - 110)
  sfx('chime')
  pop('heal', '#9dffb0', AX, GY - 285, { n: max(1, Math.round(S.hpMax * MERCY_FRAC - S.hp)) })
}

/* ------------------------------ drawing ----------------------------- */
/**
 * Pointer went down (anywhere that is not a button). `e` = player 2's hand,
 * in local versus (§6.19): she draws into her own buffer, so two fingers on
 * one canvas never corrupt each other's strokes. A frozen hand cannot draw.
 */
export const strokeStart = (x: number, y: number, e = false): void => {
  if (e ? S.eFrozen > 0 : S.frozen > 0) return
  if (!e) present()
  const p = e ? S.epts : S.pts
  if (e) S.edraw = 1
  else S.draw = 1
  p.length = 0
  p.push(x, y)
}

/** Pointer moved while drawing. Trails are the only per-move cost. */
export const strokeMove = (x: number, y: number, e = false): void => {
  if (!(e ? S.edraw : S.draw)) return
  const p = e ? S.epts : S.pts
  const n = p.length
  // Keep a fine sample so the ink hugs the real path; 2.5 units is below what
  // the eye resolves but still throws away jitter while the pointer is still.
  if (n && hypot(x - p[n - 2]!, y - p[n - 1]!) < 2.5) return
  // Bound the buffer. The recogniser resamples to 32 points regardless.
  if (n < 1024) p.push(x, y)
  trail(x, y, (p.length * 0.013) % 1)
  sfx('draw', clamp((y - BOX.y) / BOX.h, 0, 1))
}

/** Pointer released: classify, then store or nudge. `calloutY` is where a
 *  refusal callout goes (the top of the drawing zone). */
export const strokeEnd = (calloutX = 640, calloutY = BOX.y - 46, e = false): void => {
  if (!(e ? S.edraw : S.draw)) return
  if (e) S.edraw = 0
  else S.draw = 0
  // A tap or a twitch is not a FAILED rune, it is not an attempt at all.
  // Without this every stray click would buzz and shake at the player.
  const p = e ? S.epts : S.pts
  let x0 = 1e9
  let y0 = 1e9
  let x1 = -1e9
  let y1 = -1e9
  for (let i = 0; i < p.length; i += 2) {
    if (p[i]! < x0) x0 = p[i]!
    if (p[i]! > x1) x1 = p[i]!
    if (p[i + 1]! < y0) y0 = p[i + 1]!
    if (p[i + 1]! > y1) y1 = p[i + 1]!
  }
  if (p.length < 12 || hypot(x1 - x0, y1 - y0) < 45) {
    p.length = 0
    return
  }
  // The runes this player can draw: the two she starts with plus every rune a
  // chest has granted (§4.4, §5.7.2, §8.30).
  // (In versus both players share the save, so both hold the full kit.)
  const active = (S.campaign.runesUnlocked | STARTING_RUNES) >>> 0
  const r = recognise(p, active)
  // Telemetry: what the stroke was, even when it was not a rune. Two more
  // passes over a 32-point stroke, once per pointer release.
  const f = strokeFeatures(p)
  const [best, sc] = rawScore(p, active)
  // The SAME record rides both events: `stroke` (every release, telemetry) and,
  // if the shape landed, `rune`. The perfect-rune sparkle (`duel/perfect.ts`)
  // needs the margin at the moment the rune is STORED — after the queue-full
  // refusal, which is not a rune the player gets to keep — and handing the
  // existing object on costs nothing and keeps every judgement about it
  // outside these rules.
  const info: StrokeInfo | undefined = e
    ? undefined
    : {
        success: r >= 0,
        rune: r >= 0 ? r : best,
        ec: f?.ec ?? 0,
        turn: f?.turn ?? 0,
        margin: sc - 0.78
      }
  if (info) emit('stroke', undefined, info)
  // A refused stroke that is a rune she has not earned yet (lesson.ts):
  // named, with its icon and a lock, instead of "not a rune". Judged at the
  // same bar an owned rune must clear (`recogniseLocked`).
  const locked = !e && r < 0 ? recogniseLocked(p, active) : -1
  p.length = 0
  // The first duel's lesson answers its own misses and refusals (lesson.ts).
  if (!e && S.intro && (r < 0 ? lessonMiss(calloutX, calloutY) : !lessonTakes(r, calloutX, calloutY))) return
  if (r < 0 && locked >= 0) {
    showLockedRune(locked, calloutX, calloutY)
    return
  }
  if (r < 0) {
    // The ONLY visual sign a stroke was rejected — muted players need it.
    // A stroke that was plausibly reaching for a rune the player HAS names it
    // instead: "Almost Fire!" (§5.12). Only once a new rune is unlocked, so a
    // chapter-1 player is never taught about shapes that do not exist yet.
    const near = (active & ~FROZEN_MASK) !== 0 && best >= 0 && sc >= NEAR_MISS && ((active >> best) & 1) === 1
    if (near) pop('almostRune', '#ffd76a', calloutX, calloutY, { rune: RUNE_DEFS[best]!.slug })
    else pop('notARune', '#ff6a8a', calloutX, calloutY)
    sfx('bad')
    return
  }
  const queue = e ? S.equeue : S.queue
  if (queue.length >= MAX_RUNES) {
    // Full: refuse rather than silently drop the rune they just drew.
    sfx('bad')
    pop('noSlots', '#ffd76a', calloutX, calloutY)
    return
  }
  const rune = r as Rune
  queue.push(rune)
  // The clean glyph flashes, then it is stored (GDD 2.2).
  if (e) {
    S.esnap = { r: rune, t: 0 }
    sfx('snap', rune)
    emit('rune')
    return
  }
  S.landed++
  S.snap = { r: rune, t: 0 }
  sfx('snap', rune)
  emit('rune', undefined, info)
  // The lessons, and the new-rune guide that ends on this rune (lesson.ts).
  lessonStored(rune)
}

/* ------------------------------ casting ----------------------------- */
/**
 * Barrier flavour from the spell's leading element — no extra matrix column
 * needed. WIND (0) stops projectiles, EARTH (1) stops everything, ICE (2) is
 * a one-shot pillar, WATER's bubble ward (3, §6.3) holds for two hits, and
 * Crystal Ward (4, §6.5) stops everything and sends it back. Frost Lock is
 * an earth-strength wall (1) with a freeze riding on it.
 */
const guardKind = (sp: ResolvedSpell): number =>
  sp.reflect ? 4 : sp.freeze ? 1 : sp.wardHits ? 3 : sp.dominant === EARTH ? 1 : sp.dominant === ICE ? 2 : 0
/** How a barrier of flavour `gk` is drawn: its rune, or Crystal Ward's facets. */
const guardRune = (gk: number): number =>
  gk === 4 ? BAR_CRYSTAL : gk === 1 ? EARTH : gk === 2 ? ICE : gk === 3 ? WATER : WIND

/** Raise a barrier on one side (and its visual, `look`). */
const raise = (e: boolean, gk: number, secs: number, hits: number, look = guardRune(gk)): void => {
  if (e) {
    S.eGuard = secs
    S.eGuardK = gk
    S.eGuardHits = hits
  } else {
    S.guard = secs
    S.guardK = gk
    S.guardHits = hits
  }
  barrier(e ? UX : AX, GY - 70, look, secs, 0)
}

/** The spell a queue resolves to, with this save's unlocked Signature Spells. */
export const spellOf = (q: readonly number[]): ResolvedSpell => resolveSpell(q, S.campaign.signaturesUnlocked)
/** The foe's: only the Signature Spell her chapter lets her cast, from node 3
 *  (§6.10 — chapter 4's Crystal Ward). */
const foeSpellOf = (q: readonly number[]): ResolvedSpell => resolveSpell(q, S.usesMagic ? FOES[S.foe]!.sigs : 0)

/* ---------------------------- chapter magic ------------------------- */
/** Heal one side, capped at its own max, and show it. */
const mend = (e: boolean, n: number): void => {
  if (!(n > 0)) return
  if (e) S.ehp = min(S.ehpMax, S.ehp + n)
  else S.hp = min(S.hpMax, S.hp + n)
  heal(e ? UX : AX, GY - 110)
  pop('heal', '#9dffb0', e ? UX : AX, GY - 285, { n: Math.round(n) })
}

/**
 * The Love finisher's gate (§6.9): at least four hits have landed between
 * the two, or the caster is down to 30 % — and only once per duel, per side.
 */
export const finisherOpen = (e: boolean): boolean =>
  !(e ? S.eUsedFinisher : S.usedFinisher) &&
  (S.hitsLanded >= 4 || (e ? S.ehp <= S.ehpMax * 0.3 : S.hp <= S.hpMax * 0.3))

/** Where a side's decoy stands: `i` 0 in front of its caster, 1 behind. */
export const decoyX = (e: boolean, i: number): number => (e ? UX + (i ? 58 : -64) : AX + (i ? -58 : 64))

/**
 * Illusion's decoy (§6.3, kind 5): a shimmering mirror-twin that swallows
 * whole spells. A new one replaces the old — except Echo's in her phase 2,
 * who may hold two at once (§6.11).
 */
const summon = (e: boolean, hits: number, secs: number, two: boolean): void => {
  if (e) {
    if (two && S.eDecoy > 0) {
      S.eDecoy = min(4, S.eDecoy + hits)
      S.eDecoyN = 2
    } else {
      S.eDecoy = hits
      S.eDecoyN = 1
    }
    S.eDecoyT = secs
  } else {
    S.decoy = hits
    S.decoyN = 1
    S.decoyT = secs
  }
  decoyRise(decoyX(e, 0), GY - 90)
  sfx('decoy')
}

/** A decoy took a spell for its caster: one hit off, and it says so. */
const decoyHit = (e: boolean): void => {
  const left = (e ? S.eDecoy : S.decoy) - 1
  const x = decoyX(e, 0)
  if (e) {
    S.eDecoy = max(0, left)
    S.eDecoyN = min(S.eDecoyN, S.eDecoy)
    if (left <= 0) S.eDecoyT = 0
  } else {
    S.decoy = max(0, left)
    S.decoyN = min(S.decoyN, S.decoy)
    if (left <= 0) S.decoyT = 0
  }
  decoyPop(x, GY - 90, left <= 0)
  sfx('decoy')
  pop('decoy', '#ecdcff', x, GY - 230)
}

/**
 * Frost Lock lands on the caster's opponent (§6.5): her hand is discarded
 * and she does nothing at all for 2.5 s, then cannot be held again for 6 s.
 * Glace, in her phase 2, shrugs it off in 1.5 s (§6.11). The player's side
 * is only ever frozen in 2P versus (§6.19).
 */
const freeze = (onFoe: boolean, secs: number): void => {
  if (onFoe) {
    if (S.eFrozen > 0 || S.eFreezeCd > 0) return
    const foe = FOES[S.foe]!
    S.eFrozen = S.ePhase >= 2 && foe.phase2 === 'frostResist' ? 1.5 : secs
    S.equeue.length = 0
    S.eForm = 0
  } else {
    if (S.frozen > 0 || S.freezeCd > 0) return
    S.frozen = secs
    S.queue.length = 0
  }
  // A spell she was forging is part of her hand (§8.37): the ice takes it too.
  dropForge(onFoe)
  const x = onFoe ? UX : AX
  frostBurst(x, GY - 100)
  sfx('freeze')
  pop('frozen', '#bfe9ff', x, GY - 190)
}

/**
 * Crystal Ward (§6.5): the spell turns round at its BASE damage — the
 * reflecting side's own elemental bonus never applies — and the ward is
 * spent on it, like the ice pillar. A spell already reflected once is only
 * blocked, so two wards never play ping-pong.
 */
const reflect = (s: Shot, e: boolean): void => {
  const tx = e ? UX : AX
  if (e) S.eGuard = 0
  else S.guard = 0
  barrier(tx, GY - 70, BAR_CRYSTAL, 0)
  reflectFlash(tx - s.dir * 58, GY - 90, s.r)
  sfx('reflect')
  pop(s.rf ? 'blocked' : 'reflected', '#e0c4ff', tx, GY - 210)
  if (s.rf) return
  S.shots.push({
    ...s, x: tx - s.dir * 58, y: GY - 90, tx: e ? AX : UX, dir: -s.dir, dmg: s.b * REFLECT_K, w: 0, p: 0, ls: 0, rf: 1,
    // A lingering spell comes back as its hit alone (§8.35): a child's own
    // twenty seconds of embers bounced into her face is the harshest version
    // of the lesson §6.5's half-damage ruling already softened.
    lg: 0,
    // …and it holds nobody's cast lock (§8.37): it is the ward's now.
    lk: 0,
    delay: DELAY[s.k] ? 0.55 : 0, life: 0
  })
}

/** The last spell the PLAYER cast, for the listener that records discoveries. */
export interface CastInfo { key: string; index: number; count: number }
let lastCast: CastInfo = { key: '', index: -1, count: 0 }
export const lastPlayerCast = (): CastInfo => lastCast

/** Callout params naming a resolved spell — golden, signature or generated. */
export const spellPopParams = (sp: ResolvedSpell): Record<string, string | number> =>
  sp.nameId ? { spell: sp.nameId, n: sp.count } : { form: `k${sp.kind}.c${sp.count}`, rune: sp.dominant, n: sp.count }

/**
 * What a hand casts, decided at the moment CAST is pressed (§8.37): the orb
 * that forges is the spell that leaves. The Love finisher's gate is asked —
 * and spent — here too (§6.9): open, it is spent; closed, it softly becomes
 * the double — never a refusal (§6.8 rule 6).
 */
const resolveCast = (q: readonly number[], e: boolean): ResolvedSpell => {
  // Player 2 in versus casts from the shared save's kit, like player 1.
  const sp = e && !S.versus ? foeSpellOf(q) : spellOf(q)
  if (!sp.finisher) return sp
  if (!finisherOpen(e)) return resolveSpell([LOVE, LOVE])
  if (e) S.eUsedFinisher = true
  else S.usedFinisher = true
  return sp
}

/** Fire a spell `sp` (what `q` resolved to at the press). `e` = cast by the
 *  right-hand duelist. The forge's release (§8.37). */
const launch = (q: Rune[], e: boolean, sp: ResolvedSpell): void => {
  const kind = sp.kind
  const foe = FOES[S.foe]!
  /** This boss's phase-2 mechanic, once she is in it (§6.11). */
  const boss2 = e && S.ePhase >= 2 ? foe.phase2 : null
  /**
   * Only the player's damage is scaled by elements: the element the cast
   * LEANS ON (the last rune drawn) against the foe's. (No ranks — removed per
   * D3.)
   */
  const dr = sp.lead
  // …and the foe's damage by the node's easing, which is 1 everywhere except
  // the teaching chapters: what a blow COSTS is what decides whether a small
  // child's mistake is survivable, and it changes no number she has to read.
  const mul = e ? S.ease.dmg : elemMul(dr, foe.element)
  const dmg = sp.dmg * mul
  const hx = hornX(e)
  const dir = e ? -1 : 1
  // Briar's phase 2 (§6.11): every non-Nature spell of hers also carries the
  // Nature dot rider — chip poison on everything.
  let dot = sp.dot ?? 0
  // (+1 s of Nature's 4/s: the first boss a child ever meets — S4 tuning.)
  if (boss2 === 'natureRider' && !q.includes(NATURE as Rune)) dot += 1

  // What ELSE went into this cast (§8.31) — the second colour every layer
  // downstream tints with. A Rainbow-completed spell is looked up as the
  // spell it completed INTO, so a wild Fire Ball flies as a Fire Ball.
  const mix = mixRune(q, dr)
  const artKey = sp.wild ? comboKey(sp.wild) : sp.key
  castBurst(hx, HORN_Y, dr, mix)
  sfx('cast', q.length)
  if (e) S.eCastAnim = 0.55
  else S.castAnim = 0.55

  // A caster heal-over-time (Nature's bloom) starts with the cast itself.
  if (sp.regen) {
    const [rate, secs] = sp.regen
    if (e) {
      S.eRegenRate = rate
      S.eRegen = max(S.eRegen, secs)
    } else {
      S.regenRate = rate
      S.regen = max(S.regen, secs)
    }
  }

  // WATER WASHES A LINGER OFF (§8.35): any spell with Water in it, cast by
  // the one it is ticking on — the answer a child can find on her own.
  if (q.includes(WATER as Rune) && (e ? S.eLinger : S.linger) > 0) {
    if (e) S.eLinger = 0
    else S.linger = 0
    heal(e ? UX : AX, GY - 110)
  }

  // Love heals its caster as it is cast (§6.3): a share of her own max HP,
  // or the finisher's flat +25.
  mend(e, (sp.healPct ?? 0) * (e ? S.ehpMax : S.hpMax) + (sp.healFlat ?? 0))
  if (sp.finisher) {
    finisherBloom(hx, HORN_Y - 10)
    sfx('finisher')
  }

  if (kind === 2) {
    // Barriers land on the caster, instantly.
    const k = guardKind(sp)
    // Terra's phase 2 (§6.11): her Crystal Ward holds 7 s, not 5.
    const secs = k === 4 && boss2 === 'crystalLong' ? 7 : sp.guard ?? 0
    raise(e, k, secs, k === 3 ? sp.wardHits ?? 2 : 0, sp.freeze ? BAR_FROST : guardRune(k))
    sfx('guard')
    if (sp.freeze) freeze(!e, sp.freeze)
  } else if (kind === 5) {
    // A summon is no shot at all: the decoy stands up beside its caster.
    summon(e, sp.decoyHits ?? 1, sp.decoySecs ?? 8, boss2 === 'twoDecoys')
  } else {
    // A Water rider (or the Tidal Wave itself) leaves the caster a 1-hit
    // personal ward for 2 s (§6.3) — never over a wall already standing.
    if (sp.wardHits && (e ? S.eGuard : S.guard) <= 0) raise(e, 3, 2, sp.wardHits)
    // Zephyr's phase 2 (§6.11): her bolts gain Lightning's pierce.
    const pierce = !!sp.pierce || (boss2 === 'pierceBolts' && kind === 0)
    // Ember's phase 2: her slow shaves twice as much off a guard; Nova's:
    // her lifesteal rises 40 % → 55 % (§6.11).
    let slowPct = sp.slowPct ?? 0
    if (boss2 === 'slowDouble' && sp.slow) slowPct = min(0.6, 2 * (slowPct || SLOW_BASE))
    let ls = sp.lifestealPct ?? 0
    if (boss2 === 'lifestealUp' && ls > 0) ls += 0.15
    S.shots.push({
      x: hx,
      y: HORN_Y,
      tx: e ? AX : UX,
      r: dr as Rune,
      k: kind,
      dmg,
      dot,
      slow: sp.slow ?? 0,
      dir,
      w: mul > 1.2 ? 1 : 0, // super-effective, for the callout on impact
      p: pierce ? 1 : 0,
      n: q.length,
      delay: DELAY[kind] ?? 0,
      life: 0,
      b: sp.dmg,
      ls,
      sp: slowPct,
      rf: 0,
      m: mix,
      sg: artKey,
      // THE CAST LOCK (§8.37): the caster's next spell waits for this one.
      lk: 1,
      // A lingering spell (§8.35) carries its ticks, the element counted.
      ...(sp.linger ? { lg: sp.linger[0] * mul, lgT: sp.linger[1], lgR: sp.lingerLook ?? dr } : {})
    })
  }

  if (!e) S.combo = q.length
  q.length = 0
}

/** Player pressed cast. Harmless when the queue is empty. */
export const cast = (): void => castSide(false)

/**
 * A cast request was refused (story-spec §8.37): the player's side says so on
 * `S.castRefusedAt` / `S.castRefusedWhy` — the HUD's contract for the cast
 * button's shake. The right-hand side (the foe, or player 2) writes nothing.
 */
const refuse = (e: boolean, why: CastRefusal): void => {
  if (e) return
  S.castRefusedAt = S.t
  S.castRefusedWhy = why
}

/* ------------------------------ the forge --------------------------- */
/**
 * THE SPELL FORGE AND THE CAST LOCK (owner, 2026-09-24; story-spec §8.37).
 *
 * *"The consumed runes are forging together into one spell flowing from the
 * rune slots into the unicorn's horn, which now glows in the main spell's
 * color … a full 1.5 seconds of spell release delay, meaning the player
 * cannot release another spell until the current one is cast and gone."*
 *
 * Pressing CAST no longer throws the spell. It takes the runes out of the
 * slots and starts a FORGE: for `forge.forgeDuration(kind)` they fly together
 * into one orb, pour into the horn and swell there (the four beats and their
 * paths are `forge.ts`; the picture is `forgeArt.ts` and `SpellForge.vue`),
 * and only then does the spell leave — `launch`, exactly as it always did. A
 * decoy stands up, and a ward rises, at that same moment: every cast is the
 * same picture, on both sides.
 *
 * A WARD SNAPS UP (owner, 2026-09-24: *"Walls and barriers are faster,
 * 0.4 s."*): its forge is `WARD_FORGE_S`, not 1.5 s, so a wall started in
 * answer to a forge the other side has only just begun stands before that
 * spell lands. Before, a wall answering a 1.5 s forge rose after the hit —
 * blind playtest run 3: "I blocked but still lost health". The foe's own snap
 * walls answer to the director (`director.wardWill`, `think`).
 *
 * THE LOCK: from the press until the spell has left AND its shot is gone
 * (landed, bounced back, or fizzled), that side cannot release another. It
 * may keep drawing into the freed slots — the lock is on releasing, never on
 * drawing. A cast asked for during it is refused (`castRefusedWhy` 'busy').
 * The foe obeys the same lock, and her forge replaced §8.36's 0.75 s wind-up:
 * her runes flying out of HER slots into HER horn is the warning.
 *
 * Every cast path goes through `castSide` — the button, the keys, the right
 * mouse button, the lesson, `__cast`, every harness — so every one of them
 * forges and every one of them is locked.
 */

/** What each side's forge will release (`resolveCast`, decided at the press). */
const forgeSp: (ResolvedSpell | null)[] = [null, null]
const forgeOf = (e: boolean) => (e ? S.eForge : S.forge)

/** A spell of this side's that is in flight and holds its lock (`Shot.lk`)? */
const lockedShot = (e: boolean): boolean => {
  for (const s of S.shots) if (s.lk && (s.dir > 0) !== e) return true
  return false
}

/** Is a side's cast locked right now — forging, or its spell still in the air? */
export const castBusy = (e: boolean): boolean => forgeOf(e).t >= 0 || lockedShot(e)

/** Is this side forging a spell that will HIT (anything but a ward or decoy)? */
const forgingHit = (e: boolean): boolean => {
  const f = forgeOf(e)
  return f.t >= 0 && f.kind !== 2 && f.kind !== 5
}

/** Where a spell's name rises while it forges (§8.37): where the player's
 *  always rose — between the two horns, clear of both forges' paths
 *  (`forge.ts`) — or, when the other side's name is still up (both forging at
 *  once: a wall answering a spell), a line below it, so the two never sit on
 *  each other (a pop rises 84 units in its `POP_LIFE`). */
const NAME_X = 640
const NAME_Y = 250
const NAME_BELOW = 66

/** CAST was pressed and allowed: the runes leave their slots and the forge
 *  begins. The slots are free from this moment on. */
const startForge = (q: Rune[], e: boolean): void => {
  const f = forgeOf(e)
  const sp = resolveCast(q, e)
  forgeSp[e ? 1 : 0] = sp
  f.q.length = 0
  for (let i = 0; i < q.length; i++) f.q.push(q[i]!)
  q.length = 0
  f.t = 0
  f.n++
  f.lead = sp.lead
  f.mix = mixRune(f.q, sp.lead)
  f.kind = sp.kind
  f.key = sp.wild ? comboKey(sp.wild) : sp.key
  // (A ward's forge is 0.4 s, and so is its sound.)
  sfx(sp.kind === 2 ? 'wardForge' : 'forge', f.q.length)
  // The spell's NAME shows while it forges, in its main colour.
  const other = forgeOf(!e)
  const below = other.t >= 0 && other.t < POP_LIFE ? NAME_BELOW : 0
  pop('spell', RUNES[sp.lead]?.[0] ?? '#fff', NAME_X, NAME_Y + below, spellPopParams(sp))
  if (!e) {
    // The press is the cast the child made: the spellbook's discovery, the
    // lesson's end and the first-cast beat all happen here, not 1.5 s on.
    lastCast = { key: sp.key, index: comboEnumerationIndex(f.q), count: f.q.length }
    if (S.intro) lessonCast()
    emit('cast')
  }
}

/** A side's forge ends without a spell — frozen mid-forge, or the duel over. */
const dropForge = (e: boolean): void => {
  const f = forgeOf(e)
  f.t = -1
  f.q.length = 0
  forgeSp[e ? 1 : 0] = null
}

/** One sim step of a side's forge: at its length (`forgeDuration` — 1.5 s,
 *  a ward's 0.4 s) it leaves. (What it looks like on the way is drawn from
 *  `f.t` alone — `forgeArt.ts`.) */
const stepForge = (e: boolean, dt: number): void => {
  const f = forgeOf(e)
  if (f.t < 0) return
  f.t += dt
  // (The epsilon: 180 steps of 1/120 must be 1.5 s, not a hair under it —
  // and 48 of them a ward's 0.4 s.)
  if (f.t < forgeDuration(f.kind) - 1e-9) return
  const sp = forgeSp[e ? 1 : 0]
  f.t = -1
  forgeSp[e ? 1 : 0] = null
  if (sp) launch(f.q, e, sp)
  f.q.length = 0
}

/** What the QA harness reads (`window.__forge()`): the side forging — the
 *  one further along, if both are — how far, 0..1 of its OWN length, how
 *  long that is (1.5 s, a ward's 0.4 s), and the spell. */
export interface ForgeReadout {
  side: 'player' | 'foe' | null
  progress: number
  /** The picked forge's whole length, seconds (`forgeDuration`); 0 if none. */
  secs: number
  spell: string
  kind: number
  lead: number
  mix: number
  runes: number[]
  /** Both sides, whether or not they are forging. */
  player: { forging: boolean; progress: number; busy: boolean }
  foe: { forging: boolean; progress: number; busy: boolean }
}
export const forgeReadout = (): ForgeReadout => {
  const p = S.forge
  const q = S.eForge
  // "Further along" is the share of its own forge: a ward half-way through
  // its 0.4 s is as far along as a bolt half-way through its 1.5 s.
  const pick = p.t >= 0 && (q.t < 0 || forgeProgress(p) >= forgeProgress(q)) ? p : q.t >= 0 ? q : null
  const u = forgeProgress
  return {
    side: pick === p ? 'player' : pick === q ? 'foe' : null,
    progress: pick ? u(pick) : 0,
    secs: pick ? forgeDuration(pick.kind) : 0,
    spell: pick ? pick.key : '',
    kind: pick ? pick.kind : -1,
    lead: pick ? pick.lead : -1,
    mix: pick ? pick.mix : -1,
    runes: pick ? [...pick.q] : [],
    player: { forging: p.t >= 0, progress: u(p), busy: castBusy(false) },
    foe: { forging: q.t >= 0, progress: u(q), busy: castBusy(true) }
  }
}

/**
 * Cast one side's stored runes: `e` = the right-hand duelist — the foe, or
 * player 2 in local versus (§6.19). A frozen side cannot cast (§6.5), and a
 * side whose last spell is still forging or in flight is locked (§8.37).
 */
export const castSide = (e: boolean): void => {
  const q = e ? S.equeue : S.queue
  if (S.phase !== PH_DUEL) return
  // Casting counts as being here, not just drawing does: the AFK rule is
  // about a player who has put the phone down, and this is also the only
  // signal a programmatic player (the win-rate harness) ever sends. A press
  // the rules refuse (§8.37) is a player at the phone just the same.
  if (!e && q.length) present()
  if (!q.length) {
    refuse(e, 'empty')
    return
  }
  // The first duel's lessons hold every cast path shut outside their two
  // cast beats (lesson.ts) — the button, the keys, the right mouse button.
  if (!e && S.intro && !lessonCastOpen()) {
    refuse(e, 'lesson')
    lessonCastRefused()
    return
  }
  if ((e ? S.eFrozen : S.frozen) > 0 || castBusy(e)) {
    refuse(e, 'busy')
    return
  }
  // The haste's pace tally (§8.35): how many runes a second she is casting.
  if (!e && !S.versus) notePlayerCast(q.length)
  startForge(q, e)
}

/* ----------------------------- resolution --------------------------- */
/**
 * Does an active barrier of flavour `gk` stop a spell of `kind`?
 *   earth (1) stops everything.
 *   wind (0) stops anything PHYSICAL — bolts, pushes, and falling debris; only
 *     ground-level fields (kind 1) still creep underneath it.
 *   ice pillar (2) eats a single incoming projectile; it is a wall, not a
 *     roof, so things falling from above go straight over it.
 *   bubble ward (3) catches bolts, fields and pushes — two of them — but a
 *     heavy falls from above, straight onto it (§6.3).
 *   crystal ward (4) stops everything, and sends it back (§6.5).
 * A piercing shot never asks (§6.8 rule 1).
 */
export const stops = (gk: number, kind: number): boolean =>
  gk === 1 || gk === 4 ||
  (gk === 3 ? kind === 0 || kind === 1 || kind === 4 : kind === 0 || kind === 4 || (!gk && kind === 3))

/* ---------------------------- weak points --------------------------- */
/**
 * EVERY WARD HAS A WEAK POINT (owner, 2026-09-23; story-spec §8.35): *"block
 * spells are quite op and might need some weak points, e.g. a water spell
 * raining from above should be able to penetrate earth wall with 50% damage
 * or the wind shield should be able to still take 25% damage from hard
 * projectiles like earth attacks or frost attacks."*
 *
 * One element per ward, each something a child already knows about the
 * world, and each a SHARE of the spell — the ward still takes the rest:
 *
 *   earth wall (1)     rain soaks through soil — Water FROM ABOVE: 50 %
 *   wind wall (0)      rock and ice are too heavy to blow aside — Earth,
 *                      Ice: 25 %
 *   ice pillar (2)     fire melts ice — Fire: 50 % (and the pillar is spent,
 *                      as it is by anything it stops)
 *   crystal ward (4)   a rock cracks crystal — Earth: 50 %, and the ward
 *                      SHATTERS instead of bouncing it back
 *   bubble ward (3)    none new: a heavy already falls straight onto it and
 *                      it only ever holds two
 *
 * On top of what each ward never stopped (§6.8's pierce; a field creeps under
 * wind; a heavy falls over a pillar or onto a bubble). The element that
 * counts is the LEAD — the last rune drawn, the one the shot is drawn as and
 * the one `elemMul` pays — so what a child sees flying is what finds the
 * gap. "From above" is the trajectory the duel already has: a field or a
 * heavy hangs over its target and falls (`DELAY`).
 *
 * What comes through is its share of the DAMAGE and nothing else — no dot,
 * slow, lifesteal or linger: the ward still took the spell. It is a hit like
 * any other after that: a decoy still swallows it, the mercy floor still
 * holds, the director's scales still apply.
 */
export interface WeakPoint {
  /** The ward flavour (`guardK`). */
  ward: number
  /** The lead elements that find it. */
  runes: readonly number[]
  /** Only a spell that falls from above (a field or a heavy). */
  above?: true
  /** The share of the spell's damage that carries through. */
  share: number
}
export const WEAK_POINTS: readonly WeakPoint[] = [
  { ward: 1, runes: [WATER], above: true, share: 0.5 },
  { ward: 0, runes: [EARTH, ICE], share: 0.25 },
  { ward: 2, runes: [FIRE], share: 0.5 },
  { ward: 4, runes: [EARTH], share: 0.5 }
]
/** A field or a heavy hangs over its target and falls onto it (`DELAY`). */
export const fromAbove = (kind: number): boolean => (DELAY[kind] ?? 0) > 0
/** The share of a spell (spell `kind`, lead `rune`) a ward of flavour `gk`
 *  that STOPS it still lets through — 0 at every ward's strong side. */
export const seep = (gk: number, kind: number, rune: number): number => {
  for (const w of WEAK_POINTS) {
    if (w.ward === gk && w.runes.includes(rune) && (!w.above || fromAbove(kind))) return w.share
  }
  return 0
}

/** Land a resolved spell on a duelist. `e` = it hits the foe. */
const strike = (shot: Shot, e: boolean): void => {
  const gk = e ? S.eGuardK : S.guardK
  const g = e ? S.eGuard : S.guard
  const tx = e ? UX : AX
  /** What actually lands: the shot, or the share of it a weak point let by. */
  let s = shot
  let seeped = false

  if (g > 0 && s.p) {
    // Lightning goes straight through (§6.8 rule 1) — and says so, so the
    // player learns what just happened to their shield.
    impact(tx - s.dir * 58, GY - 90, LIGHTNING, 0.3)
    pop('pierced', '#fff176', tx, GY - 210)
  } else if (g > 0 && stops(gk, s.k)) {
    // A ward's weak point (§8.35): the share of this spell it lets through.
    const share = seep(gk, s.k, s.r)
    if (gk === 4 && !share) {
      reflect(s, e)
      return
    }
    // Blocked. Still loud — a block the player cannot see is a bug report.
    wardHit(tx - s.dir * 58, GY - 90, guardRune(gk), 0.35)
    sfx('guard')
    shakeAdd(0.12)
    if (!share) pop('blocked', '#8ff0ff', tx, GY - 210)
    if (gk === 2 || gk === 4) {
      // The pillar spends itself on one hit — and a crystal a rock found the
      // flaw in shatters rather than bounce it. Tear the visual down too.
      if (e) S.eGuard = 0
      else S.guard = 0
      barrier(tx, GY - 70, guardRune(gk), 0)
    } else if (gk === 3) {
      // The bubble cracks on its first hit and pops on its last.
      const left = (e ? S.eGuardHits : S.guardHits) - 1
      if (e) S.eGuardHits = left
      else S.guardHits = left
      if (left <= 0) {
        if (e) S.eGuard = 0
        else S.guard = 0
        barrier(tx, GY - 70, WATER, 0)
      } else barrier(tx, GY - 70, WATER, e ? S.eGuard : S.guard, 1)
    }
    if (!share) return
    // …and a SMALLER part of it carries on through: its share of the damage,
    // none of its riders (the ward still took the spell), seen as the same
    // element arriving thinner past the ward.
    duelTally.seep++
    seepThrough(tx - s.dir * 58, tx, GY - 90, s.r, share, fromAbove(s.k))
    s = { ...s, dmg: s.dmg * share, dot: 0, slow: 0, ls: 0, lg: 0 }
    seeped = true
    // The depth glimpse's answer, found (§8.36): the hint says yes.
    if (e && S.glimpse === 2) {
      S.glimpse = 3
      S.glimpseT = 0
    }
  }

  // A decoy swallows the WHOLE spell (§6.8 rule 3) — no HP, no rider, and a
  // pierce does not get past it: it is a body in the way, not a ward.
  if ((e ? S.eDecoy : S.decoy) > 0) {
    decoyHit(e)
    return
  }

  S.hitsLanded++
  const p = clamp(s.dmg / 40, 0.15, 1)
  // fireRain is FIRE-flavoured art, so it only fits a fire heavy. Non-fire
  // heavies get a full-power elemental impact.
  if (s.k === 3 && s.r === FIRE && !seeped) fireRain(tx, GY, p)
  // A heavy lands at full power — except the share of one a ward let
  // through, which lands as the smaller thing it is: stacked on the ward's
  // own flash, a full heavy impact whited the screen out.
  impact(tx, GY - 90, s.r, s.k === 3 && !seeped ? 1 : p, s.m)
  // …and it lands on the PAGE behind them (§8.29): Aurora's spells blow the
  // dust off it, Umbra's puff it back over.
  duelPageHit(tx, GY - 90, e, p)
  sfx('hit', p)
  sfx('hurt', p)
  shakeAdd(0.16 + p * 0.34)
  flashAdd(0.1 + p * 0.2)

  if (e) {
    S.ehp = max(0, S.ehp - s.dmg * playerDamageScale())
    S.eHurt = 0.3
    if (s.dot) S.eBurn = max(S.eBurn, s.dot)
    if (s.slow) {
      const pct = s.sp || SLOW_BASE
      if (S.versus) {
        // Player 2 has no forming timer to throttle: in versus a slow always
        // shaves the guard, for both players (§6.19).
        if (S.eGuard > 0) S.eGuard *= 1 - pct
      } else {
        // On the foe a slow throttles her hand (§6.7.7): the stronger one wins.
        S.eSlowPct = S.eSlow > 0 ? max(S.eSlowPct, pct) : pct
        S.eSlow = max(S.eSlow, s.slow)
      }
    }
    if (s.k === 4) S.eForm = max(0, S.eForm - 0.5) // pushback disrupts casting
    if (s.lg && s.lgT) {
      // A lingering spell takes hold (§8.35): refreshed, never stacked — the
      // clock restarts and the stronger of the two rates ticks on.
      S.eLingerRate = S.eLinger > 0 ? max(S.eLingerRate, s.lg) : s.lg
      S.eLinger = s.lgT
      S.eLingerLook = s.lgR ?? s.r
      duelTally.lingers++
    }
    emit('hit')
  } else {
    // The director (§6.14b): the foe's damage is scaled to keep the two bars
    // together, and CLAMPED so it can never take the last step — unless the
    // player has gone quiet, which lifts the floor.
    S.hp = max(mercyFloor(), S.hp - s.dmg * foeDamageScale())
    S.hurt = 0.3
    if (s.dot) S.burn = max(S.burn, s.dot)
    // On the player a slow never touches her hand — a child's drawing is the
    // real skill gate (§6.7.7): it shaves her active guard instead, once.
    if (s.slow && S.guard > 0) S.guard *= 1 - (s.sp || SLOW_BASE)
    if (s.lg && s.lgT) {
      S.lingerRate = S.linger > 0 ? max(S.lingerRate, s.lg) : s.lg
      S.linger = s.lgT
      S.lingerLook = s.lgR ?? s.r
      duelTally.lingers++
    }
    emit('hurt')
  }
  // Moon's lifesteal (§6.7.9): the caster drinks a share of what landed.
  if (s.ls > 0) mend(!e, s.dmg * s.ls)
  // A weakness the player cannot SEE landing is a weakness they will not learn
  // to aim for, so the counter-hit says so in its own colour.
  // WHOSE it is (§8.36): over the one who took it, in her side's colour,
  // drifting off her — the HUD reads `v` (`DuelPopups.vue`).
  pop(s.w ? 'weakHit' : 'hit', s.w ? '#7dffa8' : e ? '#ffd76a' : '#ff6a8a', tx, GY - 250, { n: s.dmg | 0 }, e ? 1 : 0)
  if (s.n > 1 && e && !seeped) pop('combo', '#fff', tx, GY - 300, { n: s.n })
}

const stepShots = (dt: number): void => {
  for (let i = S.shots.length; i--;) {
    const s = S.shots[i]!
    s.life += dt
    if (s.delay > 0) {
      // Fields and heavies hang over the target, then fall.
      s.delay -= dt
      s.x = s.tx
      s.y = GY - 240
      if (s.delay <= 0) {
        strike(s, s.dir > 0)
        S.shots.splice(i, 1)
      }
      continue
    }
    s.x += SPD[s.k]! * s.dir * dt
    // Gentle arc so bolts read as thrown, not slid.
    s.y = HORN_Y + (GY - 90 - HORN_Y) * clamp(abs(s.x - hornX(s.dir < 0)) / 700, 0, 1)
    if ((s.dir > 0 && s.x >= s.tx) || (s.dir < 0 && s.x <= s.tx)) {
      strike(s, s.dir > 0)
      S.shots.splice(i, 1)
    } else if (s.life > 4) S.shots.splice(i, 1)
  }
}

/* ------------------------------ the NPC ----------------------------- */
/**
 * The foe's pace — §6.14's whole chain:
 *   rate = base(aiTier) × onboarding × dreamDust × earlyEase × slow × phaseWindup
 * floored at 0.25 runes/s, except during a boss's phase wind-up, which is a
 * full pause by design (the universal tell, §6.11).
 */
export const foeRate = (): number => {
  if (S.eWindup > 0 || S.eFrozen > 0) return 0
  const foe = FOES[S.foe]!
  return max(0.25, tierRate(foe.aiTier) * S.onboard * S.dust * S.ease.rate * (S.eSlow > 0 ? 1 - S.eSlowPct : 1))
}

/**
 * How much faster than §6.14's chain the director is currently driving her.
 *
 * PRESSING MEANS FORMING FASTER, NOT THROWING WORSE. The press used to arrive
 * as eagerness — she dumped every two-rune hand the moment she had it — which
 * is the opposite of pressing: a two-rune spell is far weaker than the three
 * she was one rune away from, and she never stood a ward up at all, because a
 * ward is three runes. "The enemies are not defending themselves."
 *
 * It multiplies at the point of USE rather than inside `foeRate`, so the rate
 * itself stays exactly the documented chain that `tests/duel/rules.ts` pins
 * and that the Time slow is measured against.
 *
 * THE HASTE (director.ts, owner 2026-09-23) is the other reason she forms
 * faster: a player out-PACING her, not just out-scoring her. Both answer the
 * same lead, so she forms at the chain × the LARGER of the two, never the
 * product. The whole chain, and its one safety limit, is written out at
 * `hasteRush`; `tests/duel/director.test.ts` pins it.
 */
export const foeRush = (): number => max(1 + 1.6 * press(), hasteRush())

/** Chapter 4's Crystal Ward is hers from node 3 (§6.10). */
const crystalOk = (): boolean => S.usesMagic && (FOES[S.foe]!.sigs & 1) !== 0
/** Umbra's phase 3 (§6.11): the one foe who may reach for Love, once. */
const loveOk = (): boolean => S.ePhase >= 3 && !S.eUsedFinisher && FOES[S.foe]!.phase2 === 'umbraFalter'
const CRYSTAL: readonly Rune[] = [ICE, ICE, EARTH]
/** Is `q` part of `recipe` (as a multiset)? */
const within = (q: readonly number[], recipe: readonly number[]): boolean => {
  const left = [...recipe]
  for (const x of q) {
    const i = left.indexOf(x)
    if (i < 0) return false
    left.splice(i, 1)
  }
  return true
}
/** The rune `q` still needs to complete `recipe`. */
const nextOf = (q: readonly number[], recipe: readonly Rune[]): Rune => {
  const left = [...recipe]
  for (const x of q) left.splice(left.indexOf(x as Rune), 1)
  return left[0]!
}
/**
 * Would an earth wall only HALVE what the player has loaded (§8.35)? Rain
 * soaks through soil, so against a Water spell falling from above the foe
 * does not throw her own hand away for a lone-Earth wall — she keeps
 * building. The whole of her answer to the weak points: simple, and it only
 * ever changes what she does against a spell that is already half through.
 */
const earthHalves = (): boolean => {
  if (!S.queue.length) return false
  const sp = spellOf(S.queue)
  return seep(1, sp.kind, sp.lead) > 0
}

/** Half-way through a recipe she means to finish (Crystal Ward, Love). */
const building = (q: readonly number[]): boolean =>
  q.length > 0 && q.length < MAX_RUNES &&
  ((crystalOk() && within(q, CRYSTAL)) || (loveOk() && q.every((r) => r === LOVE)))

/**
 * WILL SHE WALL THIS ONE? (§8.37, owner 2026-09-24.) A ward snaps up in 0.4 s
 * now, so she can answer a spell the player is still forging — and whether
 * she does is the director's say (`director.wardWill`): a struggling child
 * rarely meets a wall, a grown-up running away with the duel meets one for
 * every blow she has one for.
 *
 * Asked ONCE per spell of the player's, the first time an answering wall is
 * possible, and remembered: the spell is named by the token of the forge it
 * is (or will be) — `S.forge.n` for the one forging or in the air, `+ 1` for
 * the hand loaded in her slots. Two slots, by parity, because both can be in
 * question in the same thought.
 */
const wallTok = [-1, -1]
const wallYes = [false, false]
const willWall = (token: number): boolean => {
  const i = token & 1
  if (wallTok[i] !== token) {
    wallTok[i] = token
    wallYes[i] = rnd() < wardWill()
  }
  return wallYes[i]!
}

/**
 * The foe forms runes on a timer and casts on intent, never on a coin flip:
 * she answers what is actually on the field.
 */
const think = (dt: number): void => {
  // Frost Lock (§6.5): a frozen foe does nothing at all — no forming, no
  // casting, not even the panic dump.
  if (S.eFrozen > 0) return
  // The depth glimpse (§8.36): while her teaching ward stands and the hint
  // shows, she neither forms nor casts.
  if (stepGlimpse(dt)) return
  const lv = FOES[S.foe]!.aiTier
  // HASTE.minForm is a readability limit, not a balance cap (director.ts).
  const rate = min(1 / HASTE.minForm, foeRate() * foeRush())
  // Commit to the next rune BEFORE forming it, so the ghost in her slot shows
  // what is actually coming and the player has something to read.
  if (S.eRune < 0) S.eRune = chooseRune()
  S.eForm += dt * rate
  if (S.eForm >= 1) {
    S.eForm = 0
    // She keeps forming through her own forge and her spell's flight (§8.37),
    // exactly as the child keeps drawing through hers.
    if (S.equeue.length < MAX_RUNES) S.equeue.push(S.eRune as Rune)
    S.eRune = chooseRune()
  }

  S.eThink -= dt
  if (S.eThink > 0 || !S.equeue.length) return
  S.eThink = 0.25

  const q = S.equeue
  const eta = incomingEta()
  const full = q.length >= MAX_RUNES

  // Cast when it means something: a full hand, a defensive answer to a shot
  // already in flight, or a hit that would end the duel now.
  const holding = building(q)
  const lethal = foeSpellOf(q).dmg >= S.hp
  // FROM TIER 2 SHE READS THE PLAYER'S SLOTS, so a player who telegraphs three
  // runes of damage meets a guard instead of a free hit.
  const threat = lv >= 2 && S.queue.length >= 2 && spellOf(S.queue).kind !== 2
  /** The player's loaded hand, as the spell it will be (`willWall`). */
  const next = S.forge.n + 1
  // A half-built attack in hand cannot become a wall, so she DUMPS it and
  // commits to EARTH — a lone EARTH is already a barrier, and `eRune` is the
  // ghost the player can see, so the panic is legible rather than magic. Only
  // for a spell she means to wall (§8.37): otherwise she keeps building.
  if (threat && S.eGuard <= 0 && q.length && !holding && foeSpellOf(q).kind !== 2 && !earthHalves() && willWall(next)) {
    q.length = 0
    S.eRune = EARTH
    S.eForm = max(S.eForm, 0.5)
  }
  // THE CAST LOCK (§8.37): her last spell is still forging or in the air, so
  // nothing leaves — she only builds.
  if (castBusy(true)) return
  const sp = foeSpellOf(q)
  // A wall takes a forge to rise, like any spell of hers (§8.37) — a ward's
  // 0.4 s: she answers a blow only if a wall started NOW stands before it
  // lands, and is still standing when it does (a lone Earth holds 2 s, and a
  // heavy hangs 1.7 s after its 1.5 s forge). The player's own forge is as
  // loud to her as hers is to the child. And only if she means to wall this
  // spell at all — the director's say, asked last so no dice are spent on a
  // wall she could not raise anyway.
  // (A tenth of a second spare at the far end: a wall that runs out on the
  // very step the rain lands has not blocked it — the guard ticks down first.)
  const rise = forgeDuration(sp.kind)
  const inTime = eta >= rise - 0.05 && eta <= rise + (sp.guard ?? 0) - 0.1
  const defend = !holding && sp.kind === 2 && S.eGuard <= 0 &&
    ((inTime && willWall(S.forge.n)) || (threat && willWall(next)))
  // Lightning's and Time's contract (§6.13): a pierce or a slow in hand goes
  // out the moment the player's guard is up — that is exactly what it is for
  // — if the guard will still be standing when it arrives.
  const zap = S.guard > forgeDuration(sp.kind) && (!!sp.pierce || !!sp.slowPct)
  // A decoy goes up the moment it is in her hand (§6.13).
  const summonNow = sp.kind === 5 && S.eDecoy <= 0
  // Nature "opens" as its pair (§6.13): she throws the Poison Bloom as soon
  // as she holds it, never saving up a Bloom Storm's 38 damage and 20 HP of
  // mending — the first chapter's trick must stay a trick (S4 tuning).
  const bloom = q.length === 2 && q[0] === NATURE && q[1] === NATURE
  // The opportunistic two-rune throw. Behind on the trade she stops saving
  // up for a perfect three-rune spell and starts actually swinging — which
  // is what "the foe never hits anything" looked like from the sofa: she was
  // holding a good hand and waiting for a better one.
  const eager = (0.02 + lv * 0.02) * (1 + 0.5 * press())
  // Nothing leaves in the second after a menu closes (director.ts).
  if (!foeMayRelease()) return
  if (full || defend || zap || summonNow || bloom || lethal || (!holding && q.length === 2 && rnd() < eager)) castSide(true)
}

/** How long a spell of `kind` flies from the horn to the other duelist. */
const flightOf = (kind: number): number => DELAY[kind] || (UX - AX - 2 * HDX) / (SPD[kind] || 1000)

/**
 * Seconds until the player's next blow lands on the foe — a shot in the air,
 * or a hit she is forging (§8.37) — or Infinity when nothing is coming.
 */
const incomingEta = (): number => {
  let eta = Infinity
  for (const s of S.shots) {
    if (s.dir <= 0) continue
    const t = s.delay > 0 ? s.delay : abs(s.tx - s.x) / (SPD[s.k] || 1000)
    if (t < eta) eta = t
  }
  if (forgingHit(false)) eta = min(eta, forgeDuration(S.forge.kind) - S.forge.t + flightOf(S.forge.kind))
  return eta
}

/* ---------------------------- the telegraph ------------------------- */
/**
 * THE FOE'S TELL (story-spec §8.36, §8.37). §8.36 wound a full hand that
 * would HIT up for 0.75 s — too short, the second playtest said, to register.
 * The spell forge replaced it (`startForge`): every spell of hers that hits
 * now takes 1.5 s to leave, her runes flying out of her slots into her horn, which is
 * the warning. What is left here is the quieter tell BEFORE she starts: her
 * slots glow when two runes of a hit are in them, and more when three are —
 * a full hand she is holding while her last spell is still in the air.
 */
/** Does a spell of hers HIT — anything but a ward or a decoy? */
const hits = (sp: ResolvedSpell): boolean => sp.kind !== 2 && sp.kind !== 5

let tellKey = -1
let tellVal = 0
/**
 * What her slots warn of (§8.36): 2 = a full hand that will hit (they pulse),
 * 1 = two runes of a hit (a softer, still glow), 0 = nothing to fear. Never
 * in versus, where the right-hand slots are a person's. Memoised on her hand,
 * so the HUD may ask every frame.
 */
export const foeTell = (): number => {
  const q = S.equeue
  if (S.versus || S.phase !== PH_DUEL || q.length < 2) return 0
  const key = ((S.foe * 2 + (S.usesMagic ? 1 : 0)) * 4 + q.length) * 4096 + q[0]! * 256 + q[1]! * 16 + (q[2] ?? 0)
  if (key !== tellKey) {
    tellKey = key
    tellVal = hits(foeSpellOf(q)) ? (q.length >= MAX_RUNES ? 2 : 1) : 0
  }
  return tellVal
}

/* --------------------------- the depth glimpse ---------------------- */
/**
 * ONE EARLY LOOK AT THE RULES' DEPTH (story-spec §8.36). The playtest's gamer
 * "exhausted the strategy space in a minute": nothing early in the story shows
 * that runes answer each other. So once, early, the foe raises a ward the
 * player's likely spell does not beat — a WIND WALL, which stops a Fire bolt
 * dead — and a small hint over it shows the rune of HERS that gets through:
 * Ice, which `WEAK_POINTS` lets a quarter through a wind wall (rock and ice
 * are too heavy to blow aside).
 *
 * True in the rules, not staged: the rune is read off `WEAK_POINTS` and her
 * own kit (`glimpseRuneFor`), and the ward is the real wind wall, so Fire is
 * blocked, Ice seeps through and two Fires — a FIELD — creep under it, exactly
 * as they always do. The hint is the HUD's (`DuelGlimpse.vue`).
 *
 * It must not cost a child the duel: from the moment the ward goes up until
 * the hint is gone the foe forms nothing and casts nothing, and it happens
 * once — one ward, in one duel (which duel is the campaign's call,
 * `campaign/glimpse.ts`, handed over as `DuelStart.glimpse`).
 */
export const GLIMPSE = {
  /** The ward: a wind wall (`guardK` 0). */
  ward: 0,
  /** How long it stands, seconds — the wind wall's own 6, and one to read. */
  secs: 7,
  /** Seconds into the duel before it may come up (it also waits for a calm
   *  moment: nothing in flight, no ward or wind-up of hers). */
  after: 6,
  /** The "yes!" beat once her rune found the gap, before the foe wakes. */
  yes: 1.2,
  /** A breath after the hint goes, before the foe's first thought. */
  wake: 1
} as const

/**
 * Which of the player's runes (`mask`) finds the glimpse ward's weak point
 * cast ALONE — a spell that hits, that the ward stops, and that a share of
 * gets through anyway. -1 if none does (node 0's Fire and Earth: a lone Earth
 * is a wall of her own, and Fire is exactly what a wind wall stops).
 */
export const glimpseRuneFor = (mask: number): number => {
  for (let r = 0; r < RUNES.length; r++) {
    if (!((mask >> r) & 1)) continue
    const sp = resolveSpell([r])
    if (hits(sp) && stops(GLIMPSE.ward, sp.kind) && seep(GLIMPSE.ward, sp.kind, sp.lead) > 0) return r
  }
  return -1
}

/** One step of the glimpse, inside the foe's `think`. True while she is held. */
const stepGlimpse = (dt: number): boolean => {
  const st = S.glimpse
  if (st !== 1 && st !== 2 && st !== 3) return false
  S.glimpseT += dt
  if (st === 1) {
    if (S.dur < GLIMPSE.after || S.shots.length || S.eGuard > 0 || S.forge.t >= 0 || S.eForge.t >= 0 || S.eWindup > 0 ||
      S.ehp < S.ehpMax * 0.25) return false
    S.glimpse = 2
    S.glimpseT = 0
    // She raises it like any cast of hers: the gather at her horn, the wall.
    castBurst(hornX(true), HORN_Y, WIND)
    S.eCastAnim = 0.55
    raise(true, GLIMPSE.ward, GLIMPSE.secs, 0)
    sfx('guard')
    return true
  }
  // The ward stands and the hint shows — or her rune found the gap, and the
  // "yes!" beat reads for a moment. Then the foe wakes, after a breath.
  if (st === 2 ? S.eGuard > 0 : S.glimpseT < GLIMPSE.yes) return true
  S.glimpse = 4
  S.glimpseT = 0
  S.eThink = max(S.eThink, GLIMPSE.wake)
  return false
}

/** Which rune the foe reaches for, given the state of the duel. */
/**
 * The runes SHE may reach for (§8.30): the ones the player holds, plus her
 * own chapter's magic — the rune this chapter's chest is about to give. A
 * child cannot answer, or even read, a shape she has never been shown; the
 * one exception is the rune she is about to be given, and meeting it in the
 * foe's hand first is how the chapter introduces it.
 *
 * Her scripted contracts (§6.11, §6.13 — the Love finisher, Crystal Ward, a
 * decoy) are not filtered: they are the boss's identity, and each is already
 * gated on its own condition.
 */
const foeMask = (): number => {
  const foe = FOES[S.foe]!
  const magic = S.usesMagic && foe.magic >= 0 ? 1 << foe.magic : 0
  return ((S.campaign.runesUnlocked | STARTING_RUNES | magic) >>> 0)
}
const mayDraw = (r: number): boolean => !!((foeMask() >> r) & 1)
/** `pool` with everything the player has never seen taken out. */
const hers = (pool: readonly Rune[]): readonly Rune[] => {
  const ok = pool.filter(mayDraw)
  return ok.length ? ok : ([FIRE] as const)
}

const chooseRune = (): Rune => {
  const q = S.equeue
  const foe = FOES[S.foe]!
  // C14's node-3 rule: a chapter's own magic is hers from node 3 on. Before
  // that she draws only the base four, however she is themed.
  const magic = S.usesMagic && foe.magic >= 0 ? (foe.magic as Rune) : -1
  // Umbra's phase 3 (§6.11): she reaches for the Love finisher — three
  // hearts forming in her slots, telegraphed, answerable like any heavy.
  if (loveOk() && q.every((r) => r === LOVE)) return LOVE
  // Crystal Ward is chapter 4's defensive default (§6.13): under pressure she
  // builds Ice, Ice, Earth — and a half-built one she finishes.
  if (crystalOk() && S.eGuard <= 0 && q.length < MAX_RUNES && within(q, CRYSTAL) &&
    (q.length > 0 || S.queue.length >= 1 || incomingEta() < Infinity)) return nextOf(q, CRYSTAL)
  // A lone EARTH already IS a barrier, so under a read threat it is the
  // fastest wall she can put up — for a spell she means to wall (§8.37).
  if (foe.aiTier >= 1 && S.queue.length >= 2 && S.eGuard <= 0 && !q.length && mayDraw(EARTH) && !earthHalves() &&
    willWall(S.forge.n + 1)) {
    return EARTH
  }
  // Answer pressure with defence — in chapter 5, maybe a decoy (§6.13) —
  // otherwise build toward damage.
  if (S.ehp < S.ehpMax * 0.3 && S.eGuard <= 0 && !q.length && rnd() < 0.45) {
    return magic === ILLUSION && S.eDecoy <= 0 && rnd() < 0.5 ? ILLUSION : pick(hers([EARTH, ICE, WIND] as const))
  }
  if (q.length === 1 && rnd() < 0.55) return q[0]! // doubling up is the strong play
  // Her chapter's magic, exactly when its contract says (§6.13) — never at
  // random on top, so a chapter's node 3 is its node 1 plus a readable trick:
  //   Nature, once her own HP is under 60 % (dot + a little heal);
  //   Water raises a ward against a shot in flight — builds toward the pair;
  //   Lightning and Time, while the player's guard is up (a pierce goes
  //   through it, a slow shaves it);
  //   Moon, once her own HP is under half (lifesteal mends her);
  //   Illusion only as the low-HP decoy above.
  if (magic === NATURE && S.ehp < S.ehpMax * 0.6 && rnd() < 0.12) return NATURE
  if (magic === WATER && S.eGuard <= 0 && q.every((r) => r === WATER) && incomingEta() < Infinity) return WATER
  if ((magic === LIGHTNING || magic === TIME) && S.guard > 0 && rnd() < 0.7) return magic
  if (magic === MOON && S.ehp < S.ehpMax * 0.5 && rnd() < 0.6) return MOON
  // A foe themed to a BASE element leans on it — that is what makes it
  // readable, and therefore what makes its weakness worth learning.
  const el = foe.element
  return el >= 0 && el < 4 && mayDraw(el) && rnd() >= 0.4
    ? (el as Rune)
    : pick(hers([FIRE, FIRE, ICE, ICE, EARTH, WIND] as const))
}

/* ------------------------------- update ----------------------------- */
/** How often the continuous tells emit (a linger's motes, the haste's sparks). */
const TELL_S = 0.16
let tellT = 0

const tick = (dt: number): void => {
  // Damage over time, applied smoothly rather than in visible chunks.
  if (S.burn > 0) {
    S.burn -= dt
    // THE FLOOR HOLDS HERE TOO. It was written into the spell impact only, so
    // a poison or a burn walked a child who was sitting at the floor straight
    // through it and killed her — the one thing the floor exists to prevent,
    // and the likeliest way for it to happen, since a dot is what is ticking
    // while she is scrambling to draw her way out.
    S.hp = max(mercyFloor(), S.hp - 4 * dt)
    S.hurt = max(S.hurt, 0.06)
  }
  if (S.eBurn > 0) {
    S.eBurn -= dt
    S.ehp = max(0, S.ehp - 4 * dt)
    S.eHurt = max(S.eHurt, 0.06)
  }
  // A LINGERING spell's ticks (§8.35). Through the director like every blow:
  // the mercy floor and the AFK rule on the player, the trade's scales on
  // both sides. No flinch — twenty seconds of twitching would read as a
  // broken rig; the telegraph is the element's own afterlife, below.
  if (S.linger > 0) {
    const t = min(dt, S.linger)
    S.linger -= dt
    const was = S.hp
    S.hp = max(mercyFloor(), S.hp - S.lingerRate * t * foeDamageScale())
    duelTally.lingerToPlayer += was - S.hp
  }
  if (S.eLinger > 0) {
    const t = min(dt, S.eLinger)
    S.eLinger -= dt
    const was = S.ehp
    S.ehp = max(0, S.ehp - S.eLingerRate * t * playerDamageScale())
    duelTally.lingerToFoe += was - S.ehp
  }
  // The continuous tells, a few times a second: a linger's afterlife on its
  // victim, and the haste quickening at the foe's horn.
  tellT += dt
  if (tellT >= TELL_S) {
    tellT -= TELL_S
    if (S.linger > 0) lingerMote(AX, GY - 100, S.lingerLook)
    if (S.eLinger > 0) lingerMote(UX, GY - 100, S.eLingerLook)
    const h = hasteLevel()
    if (h > 0.05) hasteSpark(hornX(true), HORN_Y, h)
    // A forge swelling in a horn (§8.37): sparks of the spell's own colour
    // rush in to it — and the re-anchor lifting Aurora (§8.36).
    for (let side = 0; side < 2; side++) {
      const f = side ? S.eForge : S.forge
      const k = f.t >= 0 ? hornGlow(forgeProgress(f), false) : 0
      if (k > 0.05) forgeSpark(hornX(side === 1), HORN_Y, f.lead, k)
    }
    if (lifting() > 0) liftMote(AX, GY - 120)
  }
  // Heal over time (Nature's bloom), capped at the side's own max.
  if (S.regen > 0) {
    S.regen -= dt
    S.hp = min(S.hpMax, S.hp + S.regenRate * dt)
  }
  if (S.eRegen > 0) {
    S.eRegen -= dt
    S.ehp = min(S.ehpMax, S.ehp + S.eRegenRate * dt)
  }
  if (S.eWindup > 0) {
    S.eWindup = max(0, S.eWindup - dt)
    // Pearl's phase 2 (§6.11): the wind-up ends in a bubble ward, raised
    // proactively rather than only in answer to a shot.
    if (S.eWindup === 0 && S.ePhase === 2 && FOES[S.foe]!.phase2 === 'wardOpen' && S.eGuard <= 0) {
      raise(true, 3, 5, 2)
      sfx('guard')
    }
  }
  // A decoy fades on its own clock (8 s / 10 s cap, §6.3).
  if (S.decoyT > 0 && (S.decoyT -= dt) <= 0) {
    if (S.decoy > 0) decoyFade(decoyX(false, 0), GY - 90)
    S.decoy = S.decoyN = S.decoyT = 0
  }
  if (S.eDecoyT > 0 && (S.eDecoyT -= dt) <= 0) {
    if (S.eDecoy > 0) decoyFade(decoyX(true, 0), GY - 90)
    S.eDecoy = S.eDecoyN = S.eDecoyT = 0
  }
  // Frost Lock thaws, then the 6 s before it can hold again (§6.5).
  if (S.eFrozen > 0) {
    if ((S.eFrozen -= dt) <= 0) {
      S.eFrozen = 0
      S.eFreezeCd = 6
      impact(UX, GY - 100, ICE, 0.4)
    }
  } else if (S.eFreezeCd > 0) S.eFreezeCd = max(0, S.eFreezeCd - dt)
  if (S.frozen > 0) {
    if ((S.frozen -= dt) <= 0) {
      S.frozen = 0
      S.freezeCd = 6
      impact(AX, GY - 100, ICE, 0.4)
    }
  } else if (S.freezeCd > 0) S.freezeCd = max(0, S.freezeCd - dt)
  if (S.guard > 0) S.guard -= dt
  if (S.eGuard > 0) S.eGuard -= dt
  if (S.guard <= 0) S.guardHits = 0
  if (S.eGuard <= 0) S.eGuardHits = 0
  if (S.slow > 0) S.slow -= dt
  if (S.eSlow > 0) S.eSlow -= dt
  S.castAnim = max(0, S.castAnim - dt)
  S.eCastAnim = max(0, S.eCastAnim - dt)
  S.hurt = max(0, S.hurt - dt)
  S.eHurt = max(0, S.eHurt - dt)
  if (S.snap) {
    S.snap.t += dt
    if (S.snap.t > 0.45) S.snap = null
  }
  if (S.esnap) {
    S.esnap.t += dt
    if (S.esnap.t > 0.45) S.esnap = null
  }
}

/** The finishing blow's hold, seconds (§8.36): twice the longest hit-stop
 *  a blow gets mid-fight (`fx.stopAdd`'s tenth), so the end is felt. */
export const KO_STOP = 0.2

/** End the duel once, and only once. */
const finish = (won: boolean): void => {
  S.phase = won ? PH_WIN : PH_LOSE
  // THE KNOCKOUT BEAT (story-spec §8.36): the loser's bar reads EXACTLY
  // empty — a knockout under `KO_HP` leaves no sliver to argue with — and the
  // finishing blow is HELD, longer than any hit-stop mid-fight, so the end is
  // a beat of its own: the blow, the hold, then she folds and drifts off to
  // sleep (`render.drawKoSleep`), and only then the result.
  if (won) S.ehp = 0
  else S.hp = 0
  S.stop = max(S.stop, KO_STOP)
  punchAdd(0.45)
  // A spell still forging when the duel ends never leaves (§8.37).
  dropForge(false)
  dropForge(true)
  if (S.glimpse) S.glimpse = 4
  S.over = S.panelT = 0
  S.resultUp = false
  S.shots.length = 0
  S.queue.length = 0
  S.equeue.length = 0
  S.regen = S.eRegen = 0
  S.linger = S.eLinger = 0
  S.decoy = S.eDecoy = S.decoyN = S.eDecoyN = S.decoyT = S.eDecoyT = 0
  S.frozen = S.eFrozen = 0
  S.edraw = 0
  S.epts.length = 0
  if (S.versus) {
    // A versus match is a game between friends: no duel counts (the
    // leaderboard's score is duels won), nothing is saved, and the result is
    // both players' together (§2.2 rule 21) — the chrome shows it.
    rainbowBurst(won ? UX : AX, GY - 120)
    flashAdd(0.6)
    shakeAdd(0.5)
    sfx('win')
    emit('finish', won)
    return
  }
  if (won) {
    S.wins++
    if (!S.best || S.dur < S.best) S.best = S.dur
    rainbowBurst(UX, GY - 120)
    flashAdd(0.7)
    pop('victory', '#ffe98a', 640, 240)
  } else {
    S.losses++
    // No "ZZZ…" shouted from the middle of the screen the instant the blow
    // lands: she has not fallen asleep yet. The Zzz is drawn over HER, once
    // she has folded (§8.36) — a picture of sleep, the same in every locale.
  }
  shakeAdd(0.6)
  sfx(won ? 'win' : 'lose')
  save()
  emit('finish', won)
}

/** What a duel needs to know about its node — resolved by the campaign. */
export interface DuelStart {
  /** Index into `FOES`. */
  foe: number
  /** C14's node-3 rule. */
  usesMagic: boolean
  /** Dream Dust: this node's current loss streak (§6.15). */
  lossStreak: number
  /** What this node's duel is eased by for a beginner (`campaign/easing.ts`).
   *  Omitted — a test, a debug hook, versus — means the plain fight. */
  ease?: DuelEase
  /** Local 2P versus (§6.19): the right-hand duelist is player 2. */
  versus?: boolean
  /** Arm the depth glimpse (§8.36) for this duel — the campaign's call. */
  glimpse?: boolean
}

/** Dream Dust: every loss on a node eases the foe 8 %, to a 40 % floor (§6.15).
 *  This is the PACE dial, and also what the arena's motes count (`render.ts`). */
export const dreamDust = (lossStreak: number): number => max(0.6, 1 - 0.08 * max(0, lossStreak))

/**
 * …and what the same losses take off her HEALTH and her BLOWS (§6.15, owner
 * 2026-09-20).
 *
 * Dream Dust was one dial — the foe's pace — and one dial is not enough for
 * the child it exists for. Measured on the real duel, the small child of
 * `tests/duel/winRate.test.ts` reached chapter 9 with a 3.6 % chance per
 * attempt; a slower foe with the same health and the same blows still needs
 * more damage than she can deal before she runs out of health, so more tries
 * bought her almost nothing.
 *
 * Health ends the grind sooner and damage decides whether her mistake is
 * survivable — the two things pace cannot do. Same 5-loss span as the motes,
 * and a floor that leaves a duel she still has to play: a foe at 66 % health
 * and 60 % damage is gentle, not absent (pinned by the "a duel nobody touches
 * is a duel nobody wins" test, which holds at full dust).
 *
 * It costs a competent player NOTHING: she never has the losses.
 */
export const dustEase = (lossStreak: number): { hp: number; dmg: number } => {
  const k = max(0, lossStreak)
  return { hp: max(0.66, 1 - 0.07 * k), dmg: max(0.6, 1 - 0.08 * k) }
}
/** Onboarding: the foe ramps 0.7× → 1.0× over the player's first six duels (§6.14). */
export const onboarding = (duelsPlayed: number): number => 0.7 + 0.3 * min(1, max(0, duelsPlayed) / 5)

/**
 * Start (or restart) a duel without touching the meta-progress. With no
 * argument it re-runs the current foe (tests, debug hooks).
 */
export const resetDuel = (start?: DuelStart): void => {
  resetDirector()
  if (start) {
    S.foe = clamp(start.foe | 0, 0, FOES.length - 1)
    S.usesMagic = start.usesMagic
    S.versus = !!start.versus
    S.dust = S.versus ? 1 : dreamDust(start.lossStreak)
    // Versus is the plain fight both ways (§6.19): the second player is a
    // person, and a handicap nobody asked for is not a kindness.
    // Two reliefs, one product: where the node is in the story, and how this
    // child is actually doing on it.
    const node = start.ease ?? NO_EASE
    const dust = dustEase(start.lossStreak)
    S.ease = S.versus
      ? { ...NO_EASE }
      : { hp: node.hp * dust.hp, rate: node.rate, dmg: node.dmg * dust.dmg }
  }
  const foe: FoeDef = FOES[S.foe]!
  // Versus is always the base fight: 100 HP a side, no easing (§6.19).
  S.onboard = S.versus ? 1 : onboarding(S.wins + S.losses)
  S.phase = PH_DUEL
  S.hpMax = HP_MAX
  // Rounded, because a health bar is a number a child reads out loud.
  S.ehpMax = S.versus ? HP_MAX : Math.round(foe.hpMax * S.ease.hp)
  S.hp = S.hpMax
  S.ehp = S.ehpMax
  S.regen = S.eRegen = S.regenRate = S.eRegenRate = 0
  S.ePhase = 1
  S.eWindup = 0
  S.queue.length = S.equeue.length = S.shots.length = S.pts.length = 0
  S.eForm = S.guard = S.eGuard = S.burn = S.eBurn = S.slow = S.eSlow = 0
  S.linger = S.eLinger = S.lingerRate = S.eLingerRate = 0
  duelTally.seep = duelTally.lingers = duelTally.lingerToFoe = duelTally.lingerToPlayer = 0
  S.guardHits = S.eGuardHits = 0
  S.decoy = S.eDecoy = S.decoyN = S.eDecoyN = S.decoyT = S.eDecoyT = 0
  S.frozen = S.eFrozen = S.freezeCd = S.eFreezeCd = 0
  S.eSlowPct = SLOW_BASE
  S.hitsLanded = 0
  S.usedFinisher = S.eUsedFinisher = false
  S.castAnim = S.eCastAnim = S.hurt = S.eHurt = S.draw = 0
  S.castRefusedAt = -1
  S.castRefusedWhy = ''
  // A duel never OPENS frozen (§8.31): a retry straight out of a hit-stop
  // would otherwise spend its first frames holding the last duel's blow.
  S.stop = S.punch = 0
  S.dur = S.over = S.panelT = 0
  S.resultUp = false
  S.eThink = 1.2 // a grace beat before the foe opens
  // The forges (§8.37), the tell and the depth glimpse (§8.36) start clean;
  // the glimpse only when the campaign armed it, and only if her kit holds a
  // rune that answers.
  dropForge(false)
  dropForge(true)
  tellKey = -1
  // …and she has decided nothing yet about walling the player's spells.
  wallTok[0] = wallTok[1] = -1
  S.glimpseRune = start?.glimpse && !S.versus ? glimpseRuneFor((S.campaign.runesUnlocked | STARTING_RUNES) >>> 0) : -1
  S.glimpse = S.glimpseRune >= 0 ? 1 : 0
  S.glimpseT = 0
  // Her committed next rune belongs to the last duel's foe: pick afresh.
  S.eRune = -1
  S.snap = S.esnap = null
  S.edraw = 0
  S.epts.length = 0
  S.landed = 0
  S.sky = 0.5
  S.round++
  // A lesson still owed starts over from its first beat (lesson.ts).
  resetLesson()
}

/** One simulation step. Called at a fixed timestep by the scene. */
export const updateSim = (dt: number): void => {
  stepDirector(dt)
  // HIT-STOP (§8.31): the duel holds still for a few dozen milliseconds when
  // something lands, so a blow reads as weight. The SIM owns the clock — a
  // harness that steps the sim alone (every duel test) must thaw on its own.
  if (S.stop > 0) {
    S.stop = max(0, S.stop - dt)
    return
  }
  if (S.phase !== PH_DUEL) {
    S.over += dt
    if (S.resultUp) S.panelT += dt
    setMood(S.phase === PH_WIN ? 1 : 0)
    S.sky = damp(S.sky, S.phase === PH_WIN ? 1 : 0, 2.5, dt)
    return
  }
  S.dur += dt
  tick(dt)
  stepShots(dt)
  // The forges (§8.37): a spell whose 1.5 s (a ward's 0.4) are up leaves its horn. A player
  // whose spell is forging or flying is HERE — that is activity, not idle,
  // for the AFK rule, however long the spell hangs before it falls.
  stepForge(false, dt)
  stepForge(true, dt)
  if (!S.versus && castBusy(false)) present()
  // The first duel's lessons run INSTEAD of the foe: lesson 1 plays her hand
  // through this very `castSide`, then she is held until lesson 2's cast.
  if (S.intro) stepLesson(dt, castSide)
  else if (!S.versus) think(dt)

  // A boss crossing half her HP shifts phase (§6.11): a 1.8 s wind-up in which
  // she forms nothing — the universal tell — then her chapter's mechanic.
  // Umbra alone has a third, at a quarter: she falters, then reaches for Love.
  const foe = FOES[S.foe]!
  const next = foe.boss && S.ehp > 0
    ? S.ePhase === 1 && S.ehp <= S.ehpMax * 0.5 ? 2
      : S.ePhase === 2 && foe.phase2 === 'umbraFalter' && S.ehp <= S.ehpMax * 0.25 ? 3 : 0
    : 0
  if (next) {
    S.ePhase = next
    S.eWindup = 1.8
    gatherGlints(UX, GY - 150, 1.4)
    shakeAdd(0.25)
    sfx('guard')
    emit('phase')
  }

  // The sky IS the scoreboard (GDD 2.3): it tracks the HP balance per side
  // (F18: a boss's extra HP must not read as a blowout), damped so a single
  // bolt tilts the weather rather than snapping it.
  const bal = 0.5 + (S.hp / S.hpMax - S.ehp / S.ehpMax) / 2
  S.sky = damp(S.sky, clamp(bal, 0, 1), 1.4, dt)
  setMood(S.sky)

  // A knockout (§8.36). The foe has no floor, so a sliver of hers is a
  // knockout too; the player's is only while her floor is lifted (away, or
  // versus) — while she is here the floor stands at 10 % and she never gets
  // near it.
  if (S.ehp < KO_HP) finish(true)
  else if (S.hp <= 0 || (S.hp < KO_HP && floorLifted())) finish(false)
}
