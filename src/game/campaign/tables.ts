/**
 * campaign/tables.ts — the story's shape as data (story-spec §4.3, §6.12,
 * §10.2, §10.13). Position in every array is a permanent id: nothing is
 * reordered or removed, only appended. The node grid is fixed at
 * 10 chapters × 5 nodes (C5); node 5 of every chapter is its boss.
 *
 * A node's identity IS its index 0..49. `chapter = ⌊n / 5⌋`,
 * `posInChapter = n % 5`, `isBoss = posInChapter === 4`.
 */
import { FOES, shadowOf, guardianOf, type FoeDef } from '@/game/duel/foes'
import { NATURE } from '@/game/duel/config'

export const CHAPTER_COUNT = 10
export const NODES_PER_CHAPTER = 5

export const nodeChapter = (n: number): number => Math.floor(n / NODES_PER_CHAPTER)
export const nodePosInChapter = (n: number): number => n % NODES_PER_CHAPTER
export const nodeIsBoss = (n: number): boolean => nodePosInChapter(n) === NODES_PER_CHAPTER - 1

/* ------------------------------ chapters ----------------------------- */
export interface ChapterDef {
  id: number
  /** `chapter.<slug>` — the chapter's name. */
  slug: string
  /** The rune the boss chest grants, or null on a Signature-Spell chapter. */
  newRune: number | null
  /** Index into `SIGNATURE_SPELLS`, or null. */
  signatureSpell: number | null
  /** The filler creature named in the standard-node templates (§10.8). A
   *  transliterated proper noun, plain data — never an i18n key. */
  creature: string
  /** Built (playable) in this build. Later chapters show as silhouettes. */
  built: boolean
}

export const CHAPTERS: readonly ChapterDef[] = [
  { id: 0, slug: 'c1', newRune: NATURE, signatureSpell: null, creature: 'Twig', built: true },
  { id: 1, slug: 'c2', newRune: 5, signatureSpell: null, creature: 'Shelly', built: false },
  { id: 2, slug: 'c3', newRune: 6, signatureSpell: null, creature: 'Puff', built: false },
  { id: 3, slug: 'c4', newRune: null, signatureSpell: 0, creature: 'Glint', built: false },
  { id: 4, slug: 'c5', newRune: 7, signatureSpell: null, creature: 'Blink', built: false },
  { id: 5, slug: 'c6', newRune: 8, signatureSpell: null, creature: 'Rio', built: false },
  { id: 6, slug: 'c7', newRune: 9, signatureSpell: null, creature: 'Dune', built: false },
  { id: 7, slug: 'c8', newRune: null, signatureSpell: 1, creature: 'Frosty', built: false },
  { id: 8, slug: 'c9', newRune: 10, signatureSpell: null, creature: 'Wisp', built: false },
  { id: 9, slug: 'c10', newRune: 11, signatureSpell: null, creature: 'Sprig', built: false }
]

/** The last node a player can reach in this build. */
export const LAST_BUILT_NODE = (() => {
  let last = -1
  for (const ch of CHAPTERS) if (ch.built) last = ch.id * NODES_PER_CHAPTER + NODES_PER_CHAPTER - 1
  return last
})()

/* ------------------------------ cosmetics ---------------------------- */
export type CosmeticSlot = 'head' | 'neck' | 'back' | 'companion' | 'trail' | 'mane' | 'skin'
export const COSMETIC_SLOTS: readonly CosmeticSlot[] = ['head', 'neck', 'back', 'companion', 'trail', 'mane', 'skin']

export interface CosmeticDef {
  slot: CosmeticSlot
  /** `gift.<slug>` — its display name. */
  slug: string
}
/** Position is the bit in `giftsOwned`. ≤ 32 entries (§4.3). */
export const COSMETICS: readonly CosmeticDef[] = [
  { slot: 'head', slug: 'flowerCrown' },
  { slot: 'neck', slug: 'seashellNecklace' },
  { slot: 'back', slug: 'pegasusWings' },
  { slot: 'trail', slug: 'hoofTrailVfx' },
  { slot: 'skin', slug: 'umbraSkin' },
  { slot: 'mane', slug: 'colorPicker' },
  { slot: 'skin', slug: 'pastelTheme' },
  { slot: 'neck', slug: 'winterScarf' },
  { slot: 'companion', slug: 'petStar' }
]

/** A boss chest's keepsake per chapter: a cosmetic, or (ch10) the versus unlock. */
export interface GiftDef { kind: 'cosmetic' | 'feature'; cosmeticId?: number; feature?: 'versus' }
export const GIFTS: readonly GiftDef[] = [
  ...COSMETICS.map((_, i): GiftDef => ({ kind: 'cosmetic', cosmeticId: i })),
  { kind: 'feature', feature: 'versus' }
]

/* -------------------------------- nodes ------------------------------ */
export interface NodeDef {
  /** A specific foe instead of the chapter default (rare). */
  foeIdOverride?: number
  /** The boss chest's keepsake (an index into GIFTS), or null. */
  giftId: number | null
}

export const NODES: readonly NodeDef[] = Array.from({ length: CHAPTER_COUNT * NODES_PER_CHAPTER }, (_, n) => ({
  giftId: nodeIsBoss(n) ? nodeChapter(n) : null
}))

/** The duel foe (an index into `FOES`) a node fights. */
export const nodeFoe = (n: number): number => {
  const ov = NODES[n]?.foeIdOverride
  if (ov !== undefined) return ov
  const ch = nodeChapter(n)
  return nodeIsBoss(n) ? guardianOf(ch) : shadowOf(ch)
}

/** Everything `resetDuel` needs about a node, resolved (§4.8.2). */
export interface DuelSetup {
  node: number
  foe: number
  def: FoeDef
  /** C14's node-3 rule: this chapter's foe may cast its new magic from node 3. */
  usesMagic: boolean
}
export const duelSetup = (n: number): DuelSetup => {
  const foe = nodeFoe(n)
  return { node: n, foe, def: FOES[foe]!, usesMagic: nodePosInChapter(n) >= 2 }
}
