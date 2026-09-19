/**
 * The duel's rules as data — every constant the jam build kept in `state.js`,
 * grown to the story build's 12-rune alphabet (story-spec §6).
 *
 * COORDINATES
 *   Everything is laid out in a virtual 1280x720 stage. `layout.ts` computes
 *   one transform (`S.vx, S.vy, S.vs`) so every module works in stage units and
 *   the game fits any viewport identically. Pointer coords are converted to
 *   stage space before anything sees them.
 *
 * ART DIRECTION
 *   Hand-drawn CEL SHADING: flat colour fills with thick black outlines, no
 *   gradients on characters. Two chibi unicorns on a floating mossy island —
 *   AURORA (white/gold, cute, heroic) on the left, a foe on the right. The sky
 *   is the scoreboard: heavy grey storm while even, thinning toward a rainbow
 *   as you win, blackening to rain as you lose. The painted-art successor of
 *   this look is specified in `art-style.md`.
 *
 * D3 (owner, 2026-09-18): the story build has NO currency — no coins, no
 * element ranks, no shop. `winCoins`, `rankPrice` and `RANK_BONUS` are gone.
 */
import type { RuneId } from '@/game/duel/runeDefs'

/* ------------------------------ stage ------------------------------ */
export const SW = 1280
export const SH = 720

export interface Rect { x: number; y: number; w: number; h: number }

/** The drawing box: the central third of the stage (GDD 3.2). */
export const BOX: Readonly<Rect> = { x: 470, y: 168, w: 340, h: 300 }

/* --------------------------- the duelists -------------------------- */
/** Ground line: the island rim in arena.ts. The hooves stand here. */
export const GY = 508
/* The island spans x 326..954 (arena IX/IW) and the drawing box takes
   470..810, so the duelists live in the two strips left over. Any wider and
   they float off the rim; any narrower and they collide with the box. */
export const AX = 400 // Aurora, left
export const UX = 880 // the foe, right
/** Horn tip, where spells are born — offset from the hooves. Measured from
    the rendered rig: Aurora's tip sits at (x+58, y-168), Umbra's (larger head)
    at (x-61, y-174); one symmetric pair covers both within a few units. */
export const HDX = 59
export const HDY = -170

/* ------------------------------ phases ----------------------------- */
export const PH_DUEL = 0
export const PH_WIN = 1
export const PH_LOSE = 2
export type Phase = typeof PH_DUEL | typeof PH_WIN | typeof PH_LOSE

/* ------------------------------ runes ------------------------------ */
/* The four primitives of GDD 3.2, then the story's eight (§6.1). */
export const FIRE = 0
export const WIND = 1
export const ICE = 2
export const EARTH = 3
export const NATURE = 4
export const WATER = 5
export const LIGHTNING = 6
export const ILLUSION = 7
export const RAINBOW = 8
export const TIME = 9
export const MOON = 10
export const LOVE = 11
/** Any rune id, 0..11. */
export type Rune = RuneId
/** i18n ids of the runes, in rune order (`rune.<id>`). Also their save slugs. */
export const RUNE_IDS = [
  'fire', 'wind', 'ice', 'earth', 'nature', 'water', 'lightning', 'illusion', 'rainbow', 'time', 'moon', 'love'
] as const
/** [base, light] per rune — the glyph, the slot ring, the spell VFX. */
export const RUNES: readonly (readonly [string, string])[] = [
  ['#ff5a2b', '#ffb066'],
  ['#8ff0ff', '#d9ffff'],
  ['#59b6ff', '#cfe9ff'],
  ['#b08050', '#e0c39a'],
  // Nature — spring leaf, clearly apart from the moss the arena is made of.
  ['#5ce05a', '#c4f7a0'],
  ['#3fd8cf', '#c3f6f2'],
  ['#ffd23a', '#fff1a8'],
  ['#c28bff', '#ecdcff'],
  ['#ff8fd0', '#ffe0f2'],
  ['#e8b36b', '#fbe3bd'],
  ['#8ea0ff', '#e0e6ff'],
  ['#ff6f9c', '#ffd2df']
]

/**
 * What each rune adds when it is NOT the dominant rune of a cast (§6.1, §6.3's
 * rider table). The four base runes are `damage`: their due is already paid
 * through the elemental multiplier.
 */
export type RuneTag = 'damage' | 'dot' | 'ward' | 'pierce' | 'decoy' | 'wildcard' | 'slow' | 'lifesteal' | 'finisher'
export const RUNE_TAGS: readonly RuneTag[] = [
  'damage', 'damage', 'damage', 'damage', 'dot', 'ward', 'pierce', 'decoy', 'wildcard', 'slow', 'lifesteal', 'finisher'
]

/* --------------------------- spell matrix -------------------------- */
/**
 * Spell kinds:
 *   0 bolt (fast projectile) · 1 field (delayed area) · 2 barrier
 *   3 heavy (delayed, big) · 4 push · 5 summon (story, S4)
 */
export type SpellKind = 0 | 1 | 2 | 3 | 4 | 5
/**
 * [nameId, kind, damage, extra]. `nameId` is the i18n key under `spell.`;
 * extra = dot seconds / barrier seconds / slow seconds, per spell.
 */
export type Spell = readonly [string, SpellKind, number, number]

/**
 * The GOLDEN 22 — the jam build's whole matrix, byte-identical in value
 * (§6.4). Keys are the DELIMITED form (C15): once rune ids reach double
 * digits, '11' would mean both [11] and [1, 1].
 */
export const SPELLS: Readonly<Record<string, Spell>> = {
  '0': ['fireBolt', 0, 8, 0],
  '0.0': ['fireStorm', 1, 14, 3],
  '0.0.0': ['fireRain', 3, 30, 0],
  '1': ['bolt', 4, 5, 0],
  '1.1': ['windWall', 2, 0, 6],
  '1.1.1': ['cyclone', 4, 16, 0],
  '2': ['iceBolt', 0, 8, 0],
  '2.2': ['pillar', 2, 0, 4],
  '2.2.2': ['blizzard', 1, 22, 3],
  '3': ['earthWall', 2, 0, 2],
  '3.3': ['earthShard', 0, 16, 0],
  '3.3.3': ['boulder', 3, 34, 0],
  '0.1': ['fireBall', 0, 16, 0],
  '0.2': ['wetBall', 0, 20, 2],
  '0.3': ['magmaShard', 0, 15, 2],
  '1.2': ['frostGale', 1, 14, 3],
  '1.3': ['sandBlast', 0, 13, 0],
  '2.3': ['glacier', 3, 24, 0],
  '0.1.2': ['prismNova', 3, 32, 2],
  '0.1.3': ['ashStorm', 1, 24, 3],
  '0.2.3': ['shatter', 3, 30, 0],
  '1.2.3': ['tempest', 1, 26, 3]
}
/** Defensive fallback only — the generator below is total (§4.0). */
export const WILD: Spell = ['wildSurge', 0, 11, 0]

export const MAX_RUNES = 3
export const HP_MAX = 100

/** Key of a rune queue: the sorted ids, dot-joined (C15). */
export const comboKey = (q: readonly number[]): string => [...q].sort((a, b) => a - b).join('.')

/* -------------------------- combo indexing ------------------------- */
/**
 * One stable index 0..453 for every multiset of 1–3 runes out of 12
 * (12 + 78 + 364), by length first, then lexicographically over the sorted
 * ids (§6.2). Shared by the save (`combosSeen`), the spellbook and the golden
 * tests, so "which index is combo X" has exactly one answer.
 */
const N_RUNES = 12
const rank2 = (a: number, b: number): number => N_RUNES * a - (a * (a - 1)) / 2 + (b - a)
const triplesBefore = (a: number): number => {
  let s = 0
  for (let i = 0; i < a; i++) s += ((N_RUNES - i) * (N_RUNES - i + 1)) / 2
  return s
}
export const COMBO_COUNT = 12 + 78 + 364

export const comboEnumerationIndex = (q: readonly number[]): number => {
  const s = [...q].sort((x, y) => x - y)
  if (s.some((r) => !(r >= 0 && r < N_RUNES && Number.isInteger(r)))) return -1
  if (s.length === 1) return s[0]!
  if (s.length === 2) return 12 + rank2(s[0]!, s[1]!)
  if (s.length === 3) {
    const [a, b, c] = s as [number, number, number]
    let r = triplesBefore(a)
    for (let j = a; j < b; j++) r += N_RUNES - j
    return 90 + r + (c - b)
  }
  return -1
}

export const comboFromIndex = (index: number): number[] => {
  if (!(index >= 0 && index < COMBO_COUNT)) return []
  if (index < 12) return [index]
  if (index < 90) {
    let r = index - 12
    for (let a = 0; a < N_RUNES; a++) {
      const n = N_RUNES - a
      if (r < n) return [a, a + r]
      r -= n
    }
    return []
  }
  let r = index - 90
  for (let a = 0; a < N_RUNES; a++) {
    const n = ((N_RUNES - a) * (N_RUNES - a + 1)) / 2
    if (r < n) {
      for (let b = a; b < N_RUNES; b++) {
        const m = N_RUNES - b
        if (r < m) return [a, b, b + r]
        r -= m
      }
    }
    r -= n
  }
  return []
}

/* ------------------------- the new-rune table ---------------------- */
/**
 * Riders a spell may carry beyond its kind/damage (§6.3, §6.5). All of them
 * are wired in `sim.ts`.
 */
export interface SpellRiders {
  /** Seconds of the 4/s damage-over-time on the target. */
  dot?: number
  /** Seconds of the foe's cast slow. */
  slow?: number
  /** Barrier seconds (kind 2). */
  guard?: number
  /** Caster heal-over-time: [hp per second, seconds]. */
  regen?: readonly [number, number]
  pierce?: boolean
  lifestealPct?: number
  slowPct?: number
  healPct?: number
  wardHits?: number
  decoyHits?: number
  /** Seconds a summoned decoy (kind 5) lasts before it fades (§6.3). */
  decoySecs?: number
  /** A flat heal on the caster when the spell is cast (Love). */
  healFlat?: number
  /** The Love finisher: gated, once per duel per side (§6.9). */
  finisher?: boolean
  /** Crystal Ward: the barrier REFLECTS (guardK 4, §6.5). */
  reflect?: boolean
  /** Frost Lock: seconds the opponent is frozen, her hand discarded (§6.5). */
  freeze?: number
}

export interface SpellTriple extends SpellRiders { kind: SpellKind; dmg: number }

/** The eight new runes' pure spells at lengths 1, 2, 3 (§6.3 — 24 fixed numbers). */
export const NEW_RUNE_BASE: Readonly<Record<number, readonly [SpellTriple, SpellTriple, SpellTriple]>> = {
  4: [
    { kind: 0, dmg: 6 },
    { kind: 1, dmg: 10, dot: 4, regen: [3, 3] },
    { kind: 3, dmg: 22, dot: 4, regen: [5, 4] }
  ],
  5: [
    { kind: 0, dmg: 8 },
    { kind: 2, dmg: 0, guard: 5, wardHits: 2 },
    { kind: 3, dmg: 26, wardHits: 1 }
  ],
  6: [
    { kind: 0, dmg: 9, pierce: true },
    { kind: 0, dmg: 16, pierce: true },
    { kind: 3, dmg: 28, pierce: true }
  ],
  7: [
    { kind: 0, dmg: 7 },
    { kind: 5, dmg: 0, decoyHits: 1, decoySecs: 8 },
    { kind: 5, dmg: 0, decoyHits: 2, decoySecs: 10 }
  ],
  8: [
    { kind: 0, dmg: 8 },
    { kind: 1, dmg: 12, dot: 3 },
    { kind: 3, dmg: 24 }
  ],
  9: [
    { kind: 0, dmg: 7, slowPct: 0.15, slow: 2 },
    { kind: 1, dmg: 12, dot: 3, slowPct: 0.3, slow: 3 },
    { kind: 3, dmg: 24, slowPct: 0.3, slow: 5 }
  ],
  10: [
    { kind: 0, dmg: 7, lifestealPct: 0.3 },
    { kind: 1, dmg: 12, dot: 3, lifestealPct: 0.4 },
    { kind: 3, dmg: 22, lifestealPct: 0.5 }
  ],
  // Love's heals are on the caster: 10 % / 20 % of her own max HP, and the
  // finisher's flat +25 (§6.3). The triple IS the finisher — gated (§6.9).
  11: [
    { kind: 0, dmg: 8, healPct: 0.1 },
    { kind: 1, dmg: 16, dot: 2, healPct: 0.2 },
    { kind: 3, dmg: 40, healFlat: 25, finisher: true }
  ]
}

/** The rider a MINORITY rune adds, by its tag (§6.3). */
const RIDER: Readonly<Partial<Record<RuneTag, SpellRiders>>> = {
  dot: { dot: 2 },
  ward: { wardHits: 1 },
  pierce: { pierce: true },
  slow: { slowPct: 0.15, slow: 2 },
  lifesteal: { lifestealPct: 0.15 },
  finisher: { healFlat: 5 }
}

/** A golden entry's `extra`, read the way the jam build read it. */
const goldenRiders = (sp: Spell): SpellRiders =>
  sp[1] === 1 ? { dot: sp[3] } : sp[1] === 2 ? { guard: sp[3] } : sp[3] && (sp[1] === 0 || sp[1] === 3) ? { slow: sp[3] } : {}

/* --------------------------- the generator -------------------------- */
export interface ResolvedSpell extends SpellRiders {
  /** The delimited combo key. */
  key: string
  /** `spell.<nameId>` for a golden or signature spell; null = a generated name. */
  nameId: string | null
  kind: SpellKind
  /** Base damage, before the elemental multiplier; the combo bonus applied. */
  dmg: number
  /** How many runes went in. */
  count: number
  /** The rune whose pure spell this is — names a generated spell. */
  dominant: number
  /** The last rune drawn: colours the cast and decides the element (§6.2 step 7). */
  lead: number
  /** Rainbow completed this cast (§6.20): the queue it resolved as. */
  wild?: readonly number[]
}

/** A Signature Spell (§6.5), gated on its unlock bit. */
export interface SignatureSpell { key: string; nameId: string; kind: SpellKind; dmg: number; riders: SpellRiders }
export const SIGNATURE_SPELLS: readonly SignatureSpell[] = [
  // ch4 — Crystal Ward: the reflect barrier (guardK 4), one-shot.
  { key: '2.2.3', nameId: 'crystalWard', kind: 2, dmg: 0, riders: { guard: 5, reflect: true } },
  // ch8 — Frost Lock: an earth-strength barrier that also freezes the foe for
  // 2.5 s and discards her hand. Player-only (C14).
  { key: '1.2.2', nameId: 'frostLock', kind: 2, dmg: 0, riders: { guard: 3, freeze: 2.5 } }
]

/**
 * The dominant rune of a queue: the most frequent; a tie breaks toward the
 * LAST-DRAWN rune — the one whose colour the player sees flying (§6.2 step 4).
 */
export const dominantRune = (q: readonly number[]): number => {
  let best = q[q.length - 1]!
  let bestN = 0
  for (let i = q.length - 1; i >= 0; i--) {
    const r = q[i]!
    let n = 0
    for (const x of q) if (x === r) n++
    if (n > bestN) {
      bestN = n
      best = r
    }
  }
  return best
}

/** The base spell of `r` at queue length `len` (1..3): golden for 0–3, §6.3 for 4–11. */
const pureOf = (r: number, len: number): { nameId: string | null; t: SpellTriple } => {
  if (r < 4) {
    const sp = SPELLS[Array(len).fill(r).join('.')]!
    return { nameId: sp[0], t: { kind: sp[1], dmg: sp[2], ...goldenRiders(sp) } }
  }
  const row = NEW_RUNE_BASE[r]
  const t = row ? row[Math.max(0, Math.min(2, len - 1))]! : { kind: WILD[1], dmg: WILD[2] }
  return { nameId: null, t }
}

const mergeRiders = (into: SpellRiders, add: SpellRiders): void => {
  if (add.dot) into.dot = (into.dot ?? 0) + add.dot
  if (add.slow) into.slow = Math.max(into.slow ?? 0, add.slow)
  if (add.slowPct) into.slowPct = Math.max(into.slowPct ?? 0, add.slowPct)
  if (add.pierce) into.pierce = true
  if (add.lifestealPct) into.lifestealPct = (into.lifestealPct ?? 0) + add.lifestealPct
  if (add.healPct) into.healPct = (into.healPct ?? 0) + add.healPct
  if (add.healFlat) into.healFlat = (into.healFlat ?? 0) + add.healFlat
  if (add.wardHits) into.wardHits = (into.wardHits ?? 0) + add.wardHits
}

/** §6.2 steps 1–6: the spell a queue resolves to, before elements and the combo bonus. */
const resolveRaw = (q: readonly number[], signatures: number): ResolvedSpell => {
  const key = comboKey(q)
  const lead = q[q.length - 1] ?? 0
  const count = q.length
  // Step 1: overrides — an unlocked Signature Spell, then the golden 22.
  for (let i = 0; i < SIGNATURE_SPELLS.length; i++) {
    const sg = SIGNATURE_SPELLS[i]!
    if (sg.key === key && (signatures >> i) & 1) {
      return { key, nameId: sg.nameId, kind: sg.kind, dmg: sg.dmg, count, dominant: lead, lead, ...sg.riders }
    }
  }
  const golden = SPELLS[key]
  if (golden) {
    return { key, nameId: golden[0], kind: golden[1], dmg: golden[2], count, dominant: lead, lead, ...goldenRiders(golden) }
  }
  // Step 2: Rainbow completes whatever else is in the hand (§6.20).
  const wild = substitute(q, signatures)
  if (wild) return wild
  // Steps 3–5: the dominant rune's pure spell at this length.
  const dominant = dominantRune(q)
  const base = pureOf(dominant, count)
  const out: ResolvedSpell = { key, nameId: null, count, dominant, lead, ...base.t }
  // A base-rune dominant IS a golden spell, and keeps its golden name (the
  // minority rune shows as a rider); a new rune's name is generated (§10.12).
  if (dominant < 4) out.nameId = base.nameId
  // Step 6: every non-dominant rune present adds its tag's rider.
  const seen = new Set<number>()
  for (const r of q) {
    if (r === dominant || seen.has(r)) continue
    seen.add(r)
    const rider = RIDER[RUNE_TAGS[r]!]
    if (rider) mergeRiders(out, rider)
  }
  return out
}

/**
 * Rainbow, the wildcard (§6.20). With at least one other rune in the hand,
 * every Rainbow stands in for one of them: each distinct other rune is tried
 * (all Rainbows replaced by it) through the whole generator — so a Rainbow can
 * complete a golden spell — and the strongest wins, a tie going to the rune
 * drawn LAST. (§6.20's "shared tag" rule never separates the candidates: each
 * one IS one of the other runes, so they all match any tag those share.) A
 * hand of nothing but Rainbow is its own colourless spell (§6.3); null here.
 */
const substitute = (q: readonly number[], signatures: number): ResolvedSpell | null => {
  if (!q.includes(RAINBOW)) return null
  let best: ResolvedSpell | null = null
  let bestAt = -1
  for (let i = 0; i < q.length; i++) {
    const r = q[i]!
    if (r === RAINBOW || q.indexOf(r) !== i) continue
    const cand = q.map((x) => (x === RAINBOW ? r : x))
    const sp = resolveRaw(cand, signatures)
    const at = q.lastIndexOf(r)
    if (!best || sp.dmg > best.dmg || (sp.dmg === best.dmg && at > bestAt)) {
      best = { ...sp, key: comboKey(q), wild: cand }
      bestAt = at
    }
  }
  return best
}

/**
 * The combo bonus (§6.16): a 3-rune damage cast is never worse than 1.5× the
 * best pair inside it. A runtime multiplier; the stored numbers stay golden.
 */
const DAMAGE_KINDS = new Set<number>([0, 1, 3, 4])
export const comboBonus = (q: readonly number[], raw: ResolvedSpell, signatures = 0): number => {
  if (q.length !== 3 || !DAMAGE_KINDS.has(raw.kind) || raw.dmg <= 0) return 1
  let bestPair = 0
  for (let i = 0; i < 3; i++) {
    const pair = q.filter((_, j) => j !== i)
    bestPair = Math.max(bestPair, resolveRaw(pair, signatures).dmg)
  }
  return Math.max(1, (bestPair * 1.5) / raw.dmg)
}

/** The whole generator (§6.2 steps 1–6 and 8). Step 7 (elements) is the caller's. */
export const resolveSpell = (q: readonly number[], signatures = 0): ResolvedSpell => {
  const raw = resolveRaw(q, signatures)
  const mul = comboBonus(q, raw, signatures)
  return mul > 1 ? { ...raw, dmg: raw.dmg * mul } : raw
}

/* ----------------------------- elements ----------------------------- */
/**
 * CTR[e] is the rune that COUNTERS element e (§6.6). Cycle A, frozen: fire
 * melts ice, ice freezes wind, wind erodes earth, earth smothers fire. Cycle
 * B, new: Moon → Nature → Water → Lightning → Illusion → Moon. Rainbow, Time
 * and Love are exempt (-1).
 */
export const CTR: readonly number[] = [3, 2, 0, 1, 10, 4, 5, 6, -1, -1, 7, -1]
/**
 * Damage scale for rune `r` against foe element `f`. The rune that counts is
 * the LAST one drawn — which is already the one that colours the projectile
 * and its impact, so the element the player sees flying is the element that
 * gets the bonus.
 */
export const elemMul = (r: number, f: number): number => (f < 0 ? 1 : r === f ? 0.55 : CTR[f] === r ? 1.7 : 1)

/* ------------------------------ features ---------------------------- */
/** The spellbook is part of the story build (§3.9, C16). */
export const SPELLBOOK = true
