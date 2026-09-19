/**
 * foes.ts — who stands on the right of the island (story-spec §6.10–§6.12,
 * §10.3). Rules as data, on the DUEL side: `sim.ts` reads a `FoeDef`, never a
 * campaign node (§4.8.1's boundary). `campaign/tables.ts` maps nodes to these.
 *
 * Standard nodes are Umbra's shadow clones, one tint per chapter
 * (`duelist.shadow`, one HP-bar label everywhere). Bosses are the nine
 * Guardians and, at 10-5, Umbra herself. Every foe is the same rig, recoloured
 * — zero new topology (§9.14).
 *
 * `element` is the weakness element: it is real from a chapter's first node,
 * so the counter is learnable before the fancy spell shows up. `magic` is the
 * chapter's own new rune, which the foe may cast only from node 3 of that
 * chapter onward (C14's node-3 rule, applied by the caller as `usesMagic`).
 */
import { NATURE } from '@/game/duel/config'

/** [coat, shadow, rim, mane, streak, horn, hoof, eye, glow, blush] — `chars.ts`'s palette row. */
export type FoePalette = readonly [string, string, string, string, string, string, string, string, string, string]

export interface FoeDef {
  /** `duelist.<slug>` — the HP-bar name. */
  slug: string
  /** Weakness element (a rune id), or -1 for none. */
  element: number
  hpMax: number
  aiTier: 0 | 1 | 2
  /** This chapter's new magic (a rune id) — castable from node 3 — or -1. */
  magic: number
  boss: boolean
  /** The boss's phase-2 mechanic at ≤ 50 % HP (§6.11). */
  phase2: Phase2 | null
  /** Signature Spells this foe may cast once `usesMagic` holds — a bitmask
   *  over `SIGNATURE_SPELLS`. Only Crystal Ward (chapter 4); Frost Lock is
   *  player-only (C14). */
  sigs: number
  pal: FoePalette
}

/**
 * Each chapter's boss phase 2 (§6.11), after the universal 1.8 s wind-up:
 *   natureRider  Briar — every spell of hers also carries Nature's dot
 *   wardOpen     Pearl — opens a bubble ward at the phase start
 *   pierceBolts  Zephyr — her bolts pierce (Lightning mechanics, M2)
 *   crystalLong  Terra — her Crystal Ward's window runs 7 s, not 5
 *   twoDecoys    Echo — may hold two decoys at once
 *   prismGlow    Prism — cosmetic only (an all-colour glow): out-played,
 *                never counter-picked
 *   slowDouble   Ember — her slow shaves twice as much off a guard (Time)
 *   frostResist  Glace — Frost Lock holds her 1.5 s, not 2.5
 *   lifestealUp  Nova — her lifesteal rises 40 % → 55 %
 *   umbraFalter  Umbra — phase 2 is a plain tell (she falters, she does not
 *                power up); phase 3 at 25 % opens her own Love finisher
 */
export type Phase2 =
  | 'natureRider' | 'wardOpen' | 'pierceBolts' | 'crystalLong' | 'twoDecoys'
  | 'prismGlow' | 'slowDouble' | 'frostResist' | 'lifestealUp' | 'umbraFalter'

const PHASE2: readonly Phase2[] = [
  'natureRider', 'wardOpen', 'pierceBolts', 'crystalLong', 'twoDecoys',
  'prismGlow', 'slowDouble', 'frostResist', 'lifestealUp', 'umbraFalter'
]
/** Chapter 4's foes may raise Crystal Ward from node 3 (§6.10). */
const SIGS: readonly number[] = [0, 0, 0, 0b01, 0, 0, 0, 0, 0, 0]

/** Umbra's own look: matte black coat, violet rim, neon cyan streaks. */
const UMBRA: FoePalette = ['#213', '#102', '#74c', '#84d', '#7ff', '#a5f', '#539', '#7ff', '#b7f', '#639']

/** A shadow clone in a chapter's tint: Umbra's coat, the chapter's mane and glow. */
const shade = (mane: string, streak: string, glow: string): FoePalette =>
  ['#213', '#102', glow, mane, streak, streak, '#539', streak, glow, '#639']

/**
 * HP by chapter (0-based), measured on the real duel against §7.2's core
 * child (S4 tuning, `tests/duel/winRate.test.ts`): a standard foe 100 + 1 per
 * chapter — flat 100 where she has no weakness to exploit — and a boss
 * 115 + 2 per chapter. (§6.12 had 100 + 3·(ch − 1) and +20 per boss, +16 at
 * 10-5: tuned on an abstract sim that was far kinder than the real one.)
 */
const hp = (chapter: number, boss: boolean, element: number): number =>
  boss ? 115 + 2 * chapter : element < 0 ? 100 : 100 + chapter
/**
 * §6.14's tier by chapter (0-based): 1–3 → 0, 4–6 → 1, 7–10 → 2 — one tier
 * gentler for a foe with no weakness to exploit (Prism, Ember, Umbra and
 * their shadows): measured on the real duel, a child who cannot counter-pick
 * needs the slower hand to stay inside §7.2's targets (S4 tuning).
 */
const tier = (chapter: number, element: number): 0 | 1 | 2 =>
  Math.max(0, Math.min(2, Math.floor(chapter / 3)) - (element < 0 ? 1 : 0)) as 0 | 1 | 2

/** Chapter index (0-based) → [weakness element, new magic]. */
const CH: readonly (readonly [number, number])[] = [
  [NATURE, NATURE], // 1 Whispering Woods — Nature
  [5, 5], // 2 Bubble Bay — Water
  [6, 6], // 3 Cloud Kingdom — Lightning
  [3, -1], // 4 Crystal Caves — Earth weakness, Crystal Ward (a Signature Spell)
  [7, 7], // 5 Mirror Mountains — Illusion
  [-1, -1], // 6 Rainbow Ridge — exempt; wildcard is player-only
  [-1, 9], // 7 Sunken Sands — exempt, Time
  [2, -1], // 8 Twilight Tundra — Ice weakness, Frost Lock is player-only
  [10, 10], // 9 Starlight Summit — Moon
  [-1, -1] // 10 Friendship Festival — Umbra, exempt
]

const SHADOW_TINT: readonly (readonly [string, string, string])[] = [
  ['#3fae4a', '#a6f58a', '#5fd35a'], // mossy green
  ['#2f8fb0', '#8ff0ff', '#4fc8ff'],
  ['#6f79c9', '#e6ecff', '#9fb0ff'],
  ['#5a6f9a', '#bfe9ff', '#8fd0ff'],
  ['#8a6fc0', '#e9dcff', '#c7a6ff'],
  ['#c05a9a', '#ffd0ec', '#ff8fd0'],
  ['#a07a3a', '#ffe0a0', '#e8b36b'],
  ['#4a8ab0', '#dff4ff', '#9fd8ff'],
  ['#4a5aa0', '#fff6b0', '#8ea0ff'],
  ['#84d', '#7ff', '#b7f']
]

const GUARDIAN: readonly (readonly [string, FoePalette])[] = [
  // Briar — bark coat, leafy mane with blossom streaks, a wooden horn.
  ['briar', ['#8a5a3c', '#6b4230', '#c98a5a', '#4fbf4a', '#ff8fb8', '#b98a52', '#5a3a2e', '#2f6b2a', '#7ee06a', '#ff9eb5']],
  ['pearl', ['#e8f4ff', '#c8dcf0', '#ffffff', '#4fc8e8', '#ffd1ea', '#f4e6ff', '#9ab0c8', '#2f6f96', '#8ff0ff', '#ffb3d2']],
  ['zephyr', ['#3F4F7A', '#2e3a5e', '#8FF0E0', '#8FF0E0', '#E4FFFB', '#E4FFFB', '#2e3a5e', '#E4FFFB', '#8FF0E0', '#639']],
  ['terra', ['#4E3F62', '#3a2e4a', '#C9955E', '#C9955E', '#EED0A6', '#EED0A6', '#3a2e4a', '#EED0A6', '#C9955E', '#639']],
  ['echo', ['#d8d0f0', '#b8acd8', '#ffffff', '#b58cff', '#ffffff', '#e0d6ff', '#8a7ab0', '#5a4a8a', '#d9c7ff', '#ffb3d2']],
  ['prism', ['#3A2F66', '#2a2250', '#FF9ECF', '#FF9ECF', '#9FF0D0', '#FFD36B', '#2a2250', '#9FD8FF', '#C7A6FF', '#639']],
  ['ember', ['#5A3B6E', '#442c55', '#FF7A59', '#FF7A59', '#FFB36B', '#FFB36B', '#442c55', '#FFB36B', '#FF7A59', '#639']],
  ['glace', ['#3D4A82', '#2e3866', '#7CC7FF', '#7CC7FF', '#DDF2FF', '#DDF2FF', '#2e3866', '#DDF2FF', '#7CC7FF', '#639']],
  ['nova', ['#2c2f5a', '#1f2146', '#fff6b0', '#8ea0ff', '#fff6b0', '#fff1c8', '#1f2146', '#fff6b0', '#c8d0ff', '#639']],
  ['umbra', UMBRA]
]

const roster: FoeDef[] = []
for (let c = 0; c < 10; c++) {
  const [element, magic] = CH[c]!
  const [mane, streak, glow] = SHADOW_TINT[c]!
  roster.push({
    slug: 'shadow', element, hpMax: hp(c, false, element), aiTier: tier(c, element), magic, boss: false, phase2: null, sigs: SIGS[c]!,
    pal: c === 9 ? UMBRA : shade(mane, streak, glow)
  })
}
for (let c = 0; c < 10; c++) {
  const [element, magic] = CH[c]!
  const [slug, pal] = GUARDIAN[c]!
  roster.push({
    slug, element, hpMax: hp(c, true, element), aiTier: tier(c, element), magic, boss: true,
    phase2: PHASE2[c] ?? null, sigs: SIGS[c]!, pal
  })
}

/**
 * The roster: index `c` (0..9) is chapter c's shadow clone, index `10 + c` is
 * its Guardian. Position is the id — never reordered.
 */
export const FOES: readonly FoeDef[] = roster
export const shadowOf = (chapter: number): number => chapter
export const guardianOf = (chapter: number): number => 10 + chapter

/**
 * Rate of rune formation for an AI tier (§6.14): 0.40 / 0.43 / 0.46 runes/s.
 * §6.14 had 0.42 + 0.085 per tier; measured on the real duel against §7.2's
 * core child (`tests/duel/winRate.test.ts`, S4) that curve put chapters 7–10
 * at 25–40 % first-attempt wins, so the tiers step gently and a hair lower.
 */
export const tierRate = (aiTier: number): number => 0.4 + 0.03 * aiTier

/**
 * The NPC contract per magic (§6.13, M26), as a record a test can assert:
 * when a foe may use each magic, and what answers it. The prose table in
 * the spec is what a reviewer reads; `sim.ts`'s `chooseRune`/`think` are
 * what the foe does. Ten entries: the eight rune magics and the two
 * Signature Spells.
 */
export interface AiContract {
  magic: 'dot' | 'ward' | 'pierce' | 'crystal' | 'decoy' | 'wildcard' | 'slow' | 'frostLock' | 'lifesteal' | 'finisher'
  /** C14: 1 = no restriction, 3 = only from node 3 of the chapter. */
  usesFromNode: 1 | 3
  usesWhen: string
  /** Never cast by a foe at all. */
  aiOnly: boolean
  counteredBy: 'dot' | 'ward' | 'pierce' | 'decoy' | 'none' | 'tank'
  /** The chapter's boss gains a phase-2 tie to this magic (§6.11). */
  bossPhase2?: true
  /** Built: S2 dot, S3 ward + pierce, S4 the rest. */
  built: boolean
}

export const AI_CONTRACTS: readonly AiContract[] = [
  { magic: 'dot', usesFromNode: 3, usesWhen: 'own HP < 60%', aiOnly: false, counteredBy: 'none', bossPhase2: true, built: true },
  { magic: 'ward', usesFromNode: 3, usesWhen: 'incoming shot', aiOnly: false, counteredBy: 'pierce', bossPhase2: true, built: true },
  { magic: 'pierce', usesFromNode: 3, usesWhen: 'player guard>0', aiOnly: false, counteredBy: 'decoy', bossPhase2: true, built: true },
  { magic: 'crystal', usesFromNode: 3, usesWhen: 'defensive default', aiOnly: false, counteredBy: 'pierce', bossPhase2: true, built: true },
  { magic: 'decoy', usesFromNode: 3, usesWhen: 'own HP < 30%', aiOnly: false, counteredBy: 'tank', bossPhase2: true, built: true },
  { magic: 'wildcard', usesFromNode: 1, usesWhen: 'never', aiOnly: true, counteredBy: 'none', built: true },
  { magic: 'slow', usesFromNode: 3, usesWhen: 'player guard>0', aiOnly: false, counteredBy: 'none', bossPhase2: true, built: true },
  { magic: 'frostLock', usesFromNode: 1, usesWhen: 'never', aiOnly: true, counteredBy: 'none', built: true },
  { magic: 'lifesteal', usesFromNode: 3, usesWhen: 'own HP < 50%', aiOnly: false, counteredBy: 'decoy', bossPhase2: true, built: true },
  { magic: 'finisher', usesFromNode: 1, usesWhen: 'Umbra only, own HP <=25% (phase 3)', aiOnly: false, counteredBy: 'none', built: true }
]
