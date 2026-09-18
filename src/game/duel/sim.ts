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
  AX, UX, GY, HDX, HDY, BOX, MAX_RUNES, HP_MAX, FIRE, WIND, ICE, EARTH, NATURE, WATER, LIGHTNING,
  PH_DUEL, PH_WIN, PH_LOSE, RUNES, elemMul, resolveSpell, comboEnumerationIndex,
  type Rune, type ResolvedSpell
} from '@/game/duel/config'
import { FOES, tierRate, type FoeDef } from '@/game/duel/foes'
import { S, save, pop, type Shot } from '@/game/duel/state'
import { recognise, rawScore, strokeFeatures, FROZEN_MASK } from '@/game/duel/runes'
import { RUNE_DEFS } from '@/game/duel/runeDefs'
import { clamp, damp, rnd, pick, max, min, hypot, abs } from '@/game/duel/util'
import { impact, castBurst, fireRain, barrier, rainbowBurst, shakeAdd, flashAdd, trail, gatherGlints } from '@/game/duel/fx'
import { sfx, setMood } from '@/game/duel/audio'

/* ------------------------------ tuning ------------------------------ */
/** Projectile speed per spell kind (stage units/sec); fields/heavies wait. */
const SPD = [980, 0, 0, 0, 1500]
/** Seconds a delayed spell hangs before it lands. GDD: Fire Rain ~2s. */
const DELAY = [0, 0.5, 0, 1.7, 0]
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
/** Pointer went down (anywhere that is not a button). */
export const strokeStart = (x: number, y: number): void => {
  S.draw = 1
  S.pts.length = 0
  S.pts.push(x, y)
}

/** Pointer moved while drawing. Trails are the only per-move cost. */
export const strokeMove = (x: number, y: number): void => {
  if (!S.draw) return
  const n = S.pts.length
  // Keep a fine sample so the ink hugs the real path; 2.5 units is below what
  // the eye resolves but still throws away jitter while the pointer is still.
  if (n && hypot(x - S.pts[n - 2]!, y - S.pts[n - 1]!) < 2.5) return
  // Bound the buffer. The recogniser resamples to 32 points regardless.
  if (n < 1024) S.pts.push(x, y)
  trail(x, y, (S.pts.length * 0.013) % 1)
  sfx('draw', clamp((y - BOX.y) / BOX.h, 0, 1))
}

/** Pointer released: classify, then store or nudge. `calloutY` is where a
 *  refusal callout goes (the top of the drawing zone). */
export const strokeEnd = (calloutX = 640, calloutY = BOX.y - 46): void => {
  if (!S.draw) return
  S.draw = 0
  // A tap or a twitch is not a FAILED rune, it is not an attempt at all.
  // Without this every stray click would buzz and shake at the player.
  const p = S.pts
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
  // The runes this player can draw: the frozen four plus every rune a boss
  // chest has granted (§4.4, §5.7.2).
  const active = (S.campaign.runesUnlocked | FROZEN_MASK) >>> 0
  const r = recognise(S.pts, active)
  // Telemetry: what the stroke was, even when it was not a rune. Two more
  // passes over a 32-point stroke, once per pointer release.
  const f = strokeFeatures(S.pts)
  const [best, sc] = rawScore(S.pts, active)
  emit('stroke', undefined, {
    success: r >= 0,
    rune: r >= 0 ? r : best,
    ec: f?.ec ?? 0,
    turn: f?.turn ?? 0,
    margin: sc - 0.78
  })
  S.pts.length = 0
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
  if (S.queue.length >= MAX_RUNES) {
    // Full: refuse rather than silently drop the rune they just drew.
    sfx('bad')
    pop('noSlots', '#ffd76a', calloutX, calloutY)
    return
  }
  const rune = r as Rune
  S.queue.push(rune)
  S.landed++
  S.snap = { r: rune, t: 0 } // the clean glyph flashes, then it is stored (GDD 2.2)
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
 * a one-shot pillar, and WATER's bubble ward (3, §6.3) holds for two hits.
 */
const guardKind = (sp: ResolvedSpell): number =>
  sp.wardHits ? 3 : sp.dominant === EARTH ? 1 : sp.dominant === ICE ? 2 : 0
/** The rune a barrier of flavour `gk` is drawn as. */
const guardRune = (gk: number): number => (gk === 1 ? EARTH : gk === 2 ? ICE : gk === 3 ? WATER : WIND)

/** Raise a barrier on one side (and its visual). */
const raise = (e: boolean, gk: number, secs: number, hits: number): void => {
  if (e) {
    S.eGuard = secs
    S.eGuardK = gk
    S.eGuardHits = hits
  } else {
    S.guard = secs
    S.guardK = gk
    S.guardHits = hits
  }
  barrier(e ? UX : AX, GY - 70, guardRune(gk), secs, 0)
}

/** The spell a queue resolves to, with this save's unlocked Signature Spells. */
export const spellOf = (q: readonly number[]): ResolvedSpell => resolveSpell(q, S.campaign.signaturesUnlocked)

/** The last spell the PLAYER cast, for the listener that records discoveries. */
export interface CastInfo { key: string; index: number; count: number }
let lastCast: CastInfo = { key: '', index: -1, count: 0 }
export const lastPlayerCast = (): CastInfo => lastCast

/** Callout params naming a resolved spell — golden, signature or generated. */
export const spellPopParams = (sp: ResolvedSpell): Record<string, string | number> =>
  sp.nameId ? { spell: sp.nameId, n: sp.count } : { form: `k${sp.kind}.c${sp.count}`, rune: sp.dominant, n: sp.count }

/** Fire a spell. `e` = cast by the foe. */
const launch = (q: Rune[], e: boolean): void => {
  const sp = spellOf(q)
  const kind = sp.kind
  const foe = FOES[S.foe]!
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
  if (e && S.ePhase === 2 && foe.phase2 === 'natureRider' && !q.includes(NATURE as Rune)) dot += 2

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

  if (kind === 2) {
    // Barriers land on the caster, instantly.
    const k = guardKind(sp)
    raise(e, k, sp.guard ?? 0, k === 3 ? sp.wardHits ?? 2 : 0)
    sfx('guard')
  } else {
    // A Water rider (or the Tidal Wave itself) leaves the caster a 1-hit
    // personal ward for 2 s (§6.3) — never over a wall already standing.
    if (sp.wardHits && (e ? S.eGuard : S.guard) <= 0) raise(e, 3, 2, sp.wardHits)
    // Zephyr's phase 2 (§6.11): her bolts gain Lightning's pierce.
    const pierce = !!sp.pierce || (e && S.ePhase === 2 && foe.phase2 === 'pierceBolts' && kind === 0)
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
      life: 0
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
export const cast = (): void => {
  if (S.phase !== PH_DUEL || !S.queue.length) return
  launch(S.queue, false)
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
 * A piercing shot never asks (§6.8 rule 1).
 */
export const stops = (gk: number, kind: number): boolean =>
  gk === 1 || (gk === 3 ? kind === 0 || kind === 1 || kind === 4 : kind === 0 || kind === 4 || (!gk && kind === 3))

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

  const p = clamp(s.dmg / 40, 0.15, 1)
  // fireRain is FIRE-flavoured art, so it only fits a fire heavy. Non-fire
  // heavies get a full-power elemental impact.
  if (s.k === 3 && s.r === FIRE) fireRain(tx, GY, p)
  impact(tx, GY - 90, s.r, s.k === 3 ? 1 : p)
  sfx('hit', p)
  sfx('hurt', p)
  shakeAdd(0.16 + p * 0.34)
  flashAdd(0.1 + p * 0.2)

  if (e) {
    S.ehp = max(0, S.ehp - s.dmg)
    S.eHurt = 0.3
    if (s.dot) S.eBurn = max(S.eBurn, s.dot)
    if (s.slow) S.eSlow = max(S.eSlow, s.slow)
    if (s.k === 4) S.eForm = max(0, S.eForm - 0.5) // pushback disrupts casting
    emit('hit')
  } else {
    S.hp = max(0, S.hp - s.dmg)
    S.hurt = 0.3
    if (s.dot) S.burn = max(S.burn, s.dot)
    if (s.slow) S.slow = max(S.slow, s.slow)
    emit('hurt')
  }
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
  if (S.eWindup > 0) return 0
  const foe = FOES[S.foe]!
  return max(0.25, tierRate(foe.aiTier) * S.onboard * S.dust * (S.eSlow > 0 ? 0.55 : 1))
}

/**
 * The foe forms runes on a timer and casts on intent, never on a coin flip:
 * she answers what is actually on the field.
 */
const think = (dt: number): void => {
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
  // already in flight, or a finisher that would end the duel now.
  const finisher = spellOf(q).dmg >= S.hp
  // FROM TIER 2 SHE READS THE PLAYER'S SLOTS, so a player who telegraphs three
  // runes of damage meets a guard instead of a free hit.
  const threat = lv >= 2 && S.queue.length >= 2 && spellOf(S.queue).kind !== 2
  // A half-built attack in hand cannot become a wall, so she DUMPS it and
  // commits to EARTH — a lone EARTH is already a barrier, and `eRune` is the
  // ghost the player can see, so the panic is legible rather than magic.
  if (threat && S.eGuard <= 0 && q.length && spellOf(q).kind !== 2) {
    q.length = 0
    S.eRune = EARTH
    S.eForm = max(S.eForm, 0.5)
  }
  const defend = (incoming || threat) && spellOf(q).kind === 2 && S.eGuard <= 0
  // Lightning's contract (§6.13): a pierce in hand goes out the moment the
  // player's guard is up — that is exactly what it is for.
  const zap = S.guard > 0 && !!spellOf(q).pierce
  if (full || defend || zap || finisher || (q.length === 2 && rnd() < 0.02 + lv * 0.02)) launch(q, true)
}

/** Which rune the foe reaches for, given the state of the duel. */
const chooseRune = (): Rune => {
  const q = S.equeue
  const foe = FOES[S.foe]!
  // C14's node-3 rule: a chapter's own magic is hers from node 3 on. Before
  // that she draws only the base four, however she is themed.
  const magic = S.usesMagic && foe.magic >= 0 ? (foe.magic as Rune) : -1
  // A lone EARTH already IS a barrier, so under a read threat it is the
  // fastest wall she can put up.
  if (foe.aiTier >= 1 && S.queue.length >= 2 && S.eGuard <= 0 && !q.length) return EARTH
  // Answer pressure with defence, otherwise build toward damage.
  if (S.ehp < S.ehpMax * 0.3 && S.eGuard <= 0 && !q.length && rnd() < 0.45) return pick([EARTH, ICE, WIND] as const)
  if (q.length === 1 && rnd() < 0.55) return q[0]! // doubling up is the strong play
  // Her chapter's magic (§6.13):
  //   Water raises a ward against a shot in flight — builds toward the pair;
  //   Lightning is what she reaches for while the player's guard is up;
  //   Nature opens more once her own HP is < 60 %.
  if (magic === WATER && S.eGuard <= 0 && q.every((r) => r === WATER) && S.shots.some((s) => s.dir > 0)) return WATER
  if (magic === LIGHTNING && S.guard > 0 && rnd() < 0.7) return LIGHTNING
  if (magic >= 0 && rnd() < (S.ehp < S.ehpMax * 0.6 ? 0.6 : 0.3)) return magic as Rune
  // A foe themed to a BASE element leans on it — that is what makes it
  // readable, and therefore what makes its weakness worth learning.
  const el = foe.element
  return el >= 0 && el < 4 && rnd() >= 0.4 ? (el as Rune) : pick([FIRE, FIRE, ICE, ICE, EARTH, WIND] as const)
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
    S.dust = dreamDust(start.lossStreak)
  }
  const foe: FoeDef = FOES[S.foe]!
  S.onboard = onboarding(S.wins + S.losses)
  S.phase = PH_DUEL
  S.hpMax = HP_MAX
  S.ehpMax = foe.hpMax
  S.hp = S.hpMax
  S.ehp = S.ehpMax
  S.regen = S.eRegen = S.regenRate = S.eRegenRate = 0
  S.ePhase = 1
  S.eWindup = 0
  S.queue.length = S.equeue.length = S.shots.length = S.pts.length = 0
  S.eForm = S.guard = S.eGuard = S.burn = S.eBurn = S.slow = S.eSlow = 0
  S.guardHits = S.eGuardHits = 0
  S.castAnim = S.eCastAnim = S.hurt = S.eHurt = S.draw = 0
  S.dur = S.over = S.panelT = 0
  S.resultUp = false
  S.eThink = 1.2 // a grace beat before the foe opens
  S.snap = null
  S.landed = 0
  S.sky = 0.5
  S.round++
}

/** One simulation step. Called at a fixed timestep by the scene. */
export const updateSim = (dt: number): void => {
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
  } else think(dt)

  // A boss crossing half her HP shifts phase (§6.11): a 1.8 s wind-up in which
  // she forms nothing — the universal tell — then her chapter's mechanic.
  const foe = FOES[S.foe]!
  if (foe.boss && S.ePhase === 1 && S.ehp > 0 && S.ehp <= S.ehpMax * 0.5) {
    S.ePhase = 2
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
