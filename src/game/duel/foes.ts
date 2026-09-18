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
  /** The boss's phase-2 mechanic at ≤ 50 % HP (§6.11), if shipped. */
  phase2: 'natureRider' | null
  pal: FoePalette
}

/** Umbra's own look: matte black coat, violet rim, neon cyan streaks. */
const UMBRA: FoePalette = ['#213', '#102', '#74c', '#84d', '#7ff', '#a5f', '#539', '#7ff', '#b7f', '#639']

/** A shadow clone in a chapter's tint: Umbra's coat, the chapter's mane and glow. */
const shade = (mane: string, streak: string, glow: string): FoePalette =>
  ['#213', '#102', glow, mane, streak, streak, '#539', streak, glow, '#639']

const hp = (chapter: number, boss: boolean): number => 100 + 3 * chapter + (boss ? (chapter === 9 ? 16 : 20) : 0)
const tier = (chapter: number): 0 | 1 | 2 => Math.min(2, Math.floor(chapter / 3)) as 0 | 1 | 2

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
    slug: 'shadow', element, hpMax: hp(c, false), aiTier: tier(c), magic, boss: false, phase2: null,
    pal: c === 9 ? UMBRA : shade(mane, streak, glow)
  })
}
for (let c = 0; c < 10; c++) {
  const [element, magic] = CH[c]!
  const [slug, pal] = GUARDIAN[c]!
  roster.push({
    slug, element, hpMax: hp(c, true), aiTier: tier(c), magic, boss: true,
    phase2: c === 0 ? 'natureRider' : null, pal
  })
}

/**
 * The roster: index `c` (0..9) is chapter c's shadow clone, index `10 + c` is
 * its Guardian. Position is the id — never reordered.
 */
export const FOES: readonly FoeDef[] = roster
export const shadowOf = (chapter: number): number => chapter
export const guardianOf = (chapter: number): number => 10 + chapter

/** Rate of rune formation for an AI tier (§6.14). */
export const tierRate = (aiTier: number): number => 0.42 + 0.085 * aiTier
