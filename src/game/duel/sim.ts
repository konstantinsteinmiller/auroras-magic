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
  TIME, MOON, LOVE, PH_DUEL, PH_WIN, PH_LOSE, RUNES, elemMul, resolveSpell, comboEnumerationIndex,
  type Rune, type ResolvedSpell
} from '@/game/duel/config'
import { FOES, tierRate, type FoeDef } from '@/game/duel/foes'
import { S, save, pop, type Shot } from '@/game/duel/state'
import { recognise, rawScore, strokeFeatures, FROZEN_MASK } from '@/game/duel/runes'
import { RUNE_DEFS } from '@/game/duel/runeDefs'
import { clamp, damp, rnd, pick, max, min, hypot, abs } from '@/game/duel/util'
import {
  impact, castBurst, fireRain, barrier, rainbowBurst, shakeAdd, flashAdd, trail, gatherGlints, heal,
  decoyPoof, frostBurst, heartBurst, BAR_CRYSTAL, BAR_FROST
} from '@/game/duel/fx'
import { duelPageHit } from '@/game/duel/duelPage'
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

/* ------------------------------ drawing ----------------------------- */
/**
 * Pointer went down (anywhere that is not a button). `e` = player 2's hand,
 * in local versus (§6.19): she draws into her own buffer, so two fingers on
 * one canvas never corrupt each other's strokes. A frozen hand cannot draw.
 */
export const strokeStart = (x: number, y: number, e = false): void => {
  if (e ? S.eFrozen > 0 : S.frozen > 0) return
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
  if (!e) {
    emit('stroke', undefined, {
      success: r >= 0,
      rune: r >= 0 ? r : best,
      ec: f?.ec ?? 0,
      turn: f?.turn ?? 0,
      margin: sc - 0.78
    })
  }
  p.length = 0
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
  emit('rune')
  if (S.intro && S.introStep < 1) {
    S.introStep = 1
    S.introT = 0
  }
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
  decoyPoof(decoyX(e, 0), GY - 90, 1)
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
  decoyPoof(x, GY - 90, left <= 0 ? 1 : 0.6)
  sfx('decoy')
  shakeAdd(0.1)
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
  impact(tx - s.dir * 58, GY - 90, ILLUSION, 0.5)
  sfx('reflect')
  shakeAdd(0.18)
  pop(s.rf ? 'blocked' : 'reflected', '#e0c4ff', tx, GY - 210)
  if (s.rf) return
  S.shots.push({
    ...s, x: tx - s.dir * 58, y: GY - 90, tx: e ? AX : UX, dir: -s.dir, dmg: s.b * REFLECT_K, w: 0, p: 0, ls: 0, rf: 1,
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

/** Fire a spell. `e` = cast by the foe. */
const launch = (q: Rune[], e: boolean): void => {
  // Player 2 in versus casts from the shared save's kit, like player 1.
  let sp = e && !S.versus ? foeSpellOf(q) : spellOf(q)
  // The Love finisher (§6.9): open, it is spent; closed, it softly becomes
  // the double — never a refusal (§6.8 rule 6).
  if (sp.finisher) {
    if (finisherOpen(e)) {
      if (e) S.eUsedFinisher = true
      else S.usedFinisher = true
    } else sp = resolveSpell([LOVE, LOVE])
  }
  const kind = sp.kind
  const foe = FOES[S.foe]!
  /** This boss's phase-2 mechanic, once she is in it (§6.11). */
  const boss2 = e && S.ePhase >= 2 ? foe.phase2 : null
  /**
   * Only the player's damage is scaled by elements: the element the cast
   * LEANS ON (the last rune drawn) against the foe's. The foe's own damage is
   * left flat. (No ranks — removed per D3.)
   */
  const dr = sp.lead
  const mul = e ? 1 : elemMul(dr, foe.element)
  const dmg = sp.dmg * mul
  const hx = hornX(e)
  const dir = e ? -1 : 1
  // Briar's phase 2 (§6.11): every non-Nature spell of hers also carries the
  // Nature dot rider — chip poison on everything.
  let dot = sp.dot ?? 0
  // (+1 s of Nature's 4/s: the first boss a child ever meets — S4 tuning.)
  if (boss2 === 'natureRider' && !q.includes(NATURE as Rune)) dot += 1

  castBurst(hx, HORN_Y, dr)
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

  // Love heals its caster as it is cast (§6.3): a share of her own max HP,
  // or the finisher's flat +25.
  mend(e, (sp.healPct ?? 0) * (e ? S.ehpMax : S.hpMax) + (sp.healFlat ?? 0))
  if (sp.finisher) {
    heartBurst(hx, HORN_Y - 10, 1)
    flashAdd(0.35)
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
      rf: 0
    })
  }

  if (!e) {
    S.combo = q.length
    lastCast = { key: sp.key, index: comboEnumerationIndex(q), count: q.length }
    pop('spell', RUNES[q[0]!]![0], 640, 250, spellPopParams(sp))
    if (S.intro) {
      S.intro = 0
      S.introStep = 3
      save()
    }
    emit('cast')
  }
  q.length = 0
}

/** Player pressed cast. Harmless when the queue is empty. */
export const cast = (): void => castSide(false)

/**
 * Cast one side's stored runes: `e` = the right-hand duelist — the foe, or
 * player 2 in local versus (§6.19). A frozen side cannot cast (§6.5).
 */
export const castSide = (e: boolean): void => {
  const q = e ? S.equeue : S.queue
  if (S.phase !== PH_DUEL || !q.length || (e ? S.eFrozen : S.frozen) > 0) return
  launch(q, e)
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

/** Land a resolved spell on a duelist. `e` = it hits the foe. */
const strike = (s: Shot, e: boolean): void => {
  const gk = e ? S.eGuardK : S.guardK
  const g = e ? S.eGuard : S.guard
  const tx = e ? UX : AX

  if (g > 0 && s.p) {
    // Lightning goes straight through (§6.8 rule 1) — and says so, so the
    // player learns what just happened to their shield.
    impact(tx - s.dir * 58, GY - 90, LIGHTNING, 0.3)
    pop('pierced', '#fff176', tx, GY - 210)
  } else if (g > 0 && stops(gk, s.k)) {
    if (gk === 4) {
      reflect(s, e)
      return
    }
    // Blocked. Still loud — a block the player cannot see is a bug report.
    impact(tx - s.dir * 58, GY - 90, guardRune(gk), 0.35)
    sfx('guard')
    shakeAdd(0.12)
    pop('blocked', '#8ff0ff', tx, GY - 210)
    if (gk === 2) {
      // The pillar spends itself on one hit. Tear the shield visual down too.
      if (e) S.eGuard = 0
      else S.guard = 0
      barrier(tx, GY - 70, ICE, 0)
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
    return
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
  if (s.k === 3 && s.r === FIRE) fireRain(tx, GY, p)
  impact(tx, GY - 90, s.r, s.k === 3 ? 1 : p)
  // …and it lands on the PAGE behind them (§8.29): Aurora's spells blow the
  // dust off it, Umbra's puff it back over.
  duelPageHit(tx, GY - 90, e, p)
  sfx('hit', p)
  sfx('hurt', p)
  shakeAdd(0.16 + p * 0.34)
  flashAdd(0.1 + p * 0.2)

  if (e) {
    S.ehp = max(0, S.ehp - s.dmg)
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
    emit('hit')
  } else {
    S.hp = max(0, S.hp - s.dmg)
    S.hurt = 0.3
    if (s.dot) S.burn = max(S.burn, s.dot)
    // On the player a slow never touches her hand — a child's drawing is the
    // real skill gate (§6.7.7): it shaves her active guard instead, once.
    if (s.slow && S.guard > 0) S.guard *= 1 - (s.sp || SLOW_BASE)
    emit('hurt')
  }
  // Moon's lifesteal (§6.7.9): the caster drinks a share of what landed.
  if (s.ls > 0) mend(!e, s.dmg * s.ls)
  // A weakness the player cannot SEE landing is a weakness they will not learn
  // to aim for, so the counter-hit says so in its own colour.
  pop(s.w ? 'weakHit' : 'hit', s.w ? '#7dffa8' : e ? '#ffd76a' : '#ff6a8a', tx, GY - 250, { n: s.dmg | 0 })
  if (s.n > 1 && e) pop('combo', '#fff', tx, GY - 300, { n: s.n })
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
 *   rate = base(aiTier) × onboarding × dreamDust × slow × phaseWindup
 * floored at 0.25 runes/s, except during a boss's phase wind-up, which is a
 * full pause by design (the universal tell, §6.11).
 */
export const foeRate = (): number => {
  if (S.eWindup > 0 || S.eFrozen > 0) return 0
  const foe = FOES[S.foe]!
  return max(0.25, tierRate(foe.aiTier) * S.onboard * S.dust * (S.eSlow > 0 ? 1 - S.eSlowPct : 1))
}

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
/** Half-way through a recipe she means to finish (Crystal Ward, Love). */
const building = (q: readonly number[]): boolean =>
  q.length > 0 && q.length < MAX_RUNES &&
  ((crystalOk() && within(q, CRYSTAL)) || (loveOk() && q.every((r) => r === LOVE)))

/**
 * The foe forms runes on a timer and casts on intent, never on a coin flip:
 * she answers what is actually on the field.
 */
const think = (dt: number): void => {
  // Frost Lock (§6.5): a frozen foe does nothing at all — no forming, no
  // casting, not even the panic dump.
  if (S.eFrozen > 0) return
  const lv = FOES[S.foe]!.aiTier
  const rate = foeRate()
  // Commit to the next rune BEFORE forming it, so the ghost in her slot shows
  // what is actually coming and the player has something to read.
  if (S.eRune < 0) S.eRune = chooseRune()
  S.eForm += dt * rate
  if (S.eForm >= 1) {
    S.eForm = 0
    if (S.equeue.length < MAX_RUNES) S.equeue.push(S.eRune as Rune)
    S.eRune = chooseRune()
  }

  S.eThink -= dt
  if (S.eThink > 0 || !S.equeue.length) return
  S.eThink = 0.25

  const q = S.equeue
  const incoming = S.shots.some((s) => s.dir > 0)
  const full = q.length >= MAX_RUNES

  // Cast when it means something: a full hand, a defensive answer to a shot
  // already in flight, or a hit that would end the duel now.
  const holding = building(q)
  const lethal = foeSpellOf(q).dmg >= S.hp
  // FROM TIER 2 SHE READS THE PLAYER'S SLOTS, so a player who telegraphs three
  // runes of damage meets a guard instead of a free hit.
  const threat = lv >= 2 && S.queue.length >= 2 && spellOf(S.queue).kind !== 2
  // A half-built attack in hand cannot become a wall, so she DUMPS it and
  // commits to EARTH — a lone EARTH is already a barrier, and `eRune` is the
  // ghost the player can see, so the panic is legible rather than magic.
  if (threat && S.eGuard <= 0 && q.length && !holding && foeSpellOf(q).kind !== 2) {
    q.length = 0
    S.eRune = EARTH
    S.eForm = max(S.eForm, 0.5)
  }
  const sp = foeSpellOf(q)
  const defend = !holding && (incoming || threat) && sp.kind === 2 && S.eGuard <= 0
  // Lightning's and Time's contract (§6.13): a pierce or a slow in hand goes
  // out the moment the player's guard is up — that is exactly what it is for.
  const zap = S.guard > 0 && (!!sp.pierce || !!sp.slowPct)
  // A decoy goes up the moment it is in her hand (§6.13).
  const summonNow = sp.kind === 5 && S.eDecoy <= 0
  // Nature "opens" as its pair (§6.13): she throws the Poison Bloom as soon
  // as she holds it, never saving up a Bloom Storm's 38 damage and 20 HP of
  // mending — the first chapter's trick must stay a trick (S4 tuning).
  const bloom = q.length === 2 && q[0] === NATURE && q[1] === NATURE
  if (full || defend || zap || summonNow || bloom || lethal || (!holding && q.length === 2 && rnd() < 0.02 + lv * 0.02)) launch(q, true)
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
    (q.length > 0 || S.queue.length >= 1 || S.shots.some((s) => s.dir > 0))) return nextOf(q, CRYSTAL)
  // A lone EARTH already IS a barrier, so under a read threat it is the
  // fastest wall she can put up.
  if (foe.aiTier >= 1 && S.queue.length >= 2 && S.eGuard <= 0 && !q.length && mayDraw(EARTH)) return EARTH
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
  if (magic === WATER && S.eGuard <= 0 && q.every((r) => r === WATER) && S.shots.some((s) => s.dir > 0)) return WATER
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
const tick = (dt: number): void => {
  // Damage over time, applied smoothly rather than in visible chunks.
  if (S.burn > 0) {
    S.burn -= dt
    S.hp = max(0, S.hp - 4 * dt)
    S.hurt = max(S.hurt, 0.06)
  }
  if (S.eBurn > 0) {
    S.eBurn -= dt
    S.ehp = max(0, S.ehp - 4 * dt)
    S.eHurt = max(S.eHurt, 0.06)
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
    if (S.decoy > 0) decoyPoof(decoyX(false, 0), GY - 90, 0.5)
    S.decoy = S.decoyN = S.decoyT = 0
  }
  if (S.eDecoyT > 0 && (S.eDecoyT -= dt) <= 0) {
    if (S.eDecoy > 0) decoyPoof(decoyX(true, 0), GY - 90, 0.5)
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

/** End the duel once, and only once. */
const finish = (won: boolean): void => {
  S.phase = won ? PH_WIN : PH_LOSE
  S.over = S.panelT = 0
  S.resultUp = false
  S.shots.length = 0
  S.queue.length = 0
  S.equeue.length = 0
  S.regen = S.eRegen = 0
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
    pop('defeated', '#ff6a8a', 640, 240)
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
  /** Local 2P versus (§6.19): the right-hand duelist is player 2. */
  versus?: boolean
}

/** Dream Dust: every loss on a node eases the foe 8 %, to a 40 % floor (§6.15). */
export const dreamDust = (lossStreak: number): number => max(0.6, 1 - 0.08 * max(0, lossStreak))
/** Onboarding: the foe ramps 0.7× → 1.0× over the player's first six duels (§6.14). */
export const onboarding = (duelsPlayed: number): number => 0.7 + 0.3 * min(1, max(0, duelsPlayed) / 5)

/**
 * Start (or restart) a duel without touching the meta-progress. With no
 * argument it re-runs the current foe (tests, debug hooks).
 */
export const resetDuel = (start?: DuelStart): void => {
  if (start) {
    S.foe = clamp(start.foe | 0, 0, FOES.length - 1)
    S.usesMagic = start.usesMagic
    S.versus = !!start.versus
    S.dust = S.versus ? 1 : dreamDust(start.lossStreak)
  }
  const foe: FoeDef = FOES[S.foe]!
  // Versus is always the base fight: 100 HP a side, no easing (§6.19).
  S.onboard = S.versus ? 1 : onboarding(S.wins + S.losses)
  S.phase = PH_DUEL
  S.hpMax = HP_MAX
  S.ehpMax = S.versus ? HP_MAX : foe.hpMax
  S.hp = S.hpMax
  S.ehp = S.ehpMax
  S.regen = S.eRegen = S.regenRate = S.eRegenRate = 0
  S.ePhase = 1
  S.eWindup = 0
  S.queue.length = S.equeue.length = S.shots.length = S.pts.length = 0
  S.eForm = S.guard = S.eGuard = S.burn = S.eBurn = S.slow = S.eSlow = 0
  S.guardHits = S.eGuardHits = 0
  S.decoy = S.eDecoy = S.decoyN = S.eDecoyN = S.decoyT = S.eDecoyT = 0
  S.frozen = S.eFrozen = S.freezeCd = S.eFreezeCd = 0
  S.eSlowPct = SLOW_BASE
  S.hitsLanded = 0
  S.usedFinisher = S.eUsedFinisher = false
  S.castAnim = S.eCastAnim = S.hurt = S.eHurt = S.draw = 0
  S.dur = S.over = S.panelT = 0
  S.resultUp = false
  S.eThink = 1.2 // a grace beat before the foe opens
  // Her committed next rune belongs to the last duel's foe: pick afresh.
  S.eRune = -1
  S.snap = S.esnap = null
  S.edraw = 0
  S.epts.length = 0
  S.landed = 0
  S.sky = 0.5
  S.round++
}

/** One simulation step. Called at a fixed timestep by the scene. */
export const updateSim = (dt: number): void => {
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
  if (S.intro) {
    // Beat 1 ("stored") reads for a moment, then hands over to beat 2 ("cast").
    S.introT += dt
    if (S.introStep === 1 && S.introT > 1.5) {
      S.introStep = 2
      S.introT = 0
    }
  } else if (!S.versus) think(dt)

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

  if (S.ehp <= 0) finish(true)
  else if (S.hp <= 0) finish(false)
}
