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
import { FIRE, WIND, ICE, EARTH, NATURE } from '@/game/duel/config'

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

/**
 * THE RUNES A PLAYER STARTS WITH (owner, 2026-09-20; §8.30): two, not four —
 * Fire to throw and Earth to hide behind, the two simplest shapes for a small
 * finger. Everything else is earned.
 */
export const STARTING_RUNES = (1 << FIRE) | (1 << EARTH)

/**
 * The runes the first chapter hands over, by the node whose chest gives them:
 * one after the first battle, one after the third. The fifth arrives at the
 * end of chapter 1 with the boss chest (`CHAPTERS[0].newRune`), and a chapter
 * has given one ever since — except the two Signature-Spell chapters, which
 * give a spell instead. Twelve runes, ten chapters, one schedule.
 */
export const EARLY_RUNES: Readonly<Record<number, number>> = { 0: ICE, 2: WIND }

export const CHAPTERS: readonly ChapterDef[] = [
  { id: 0, slug: 'c1', newRune: NATURE, signatureSpell: null, creature: 'Twig', built: true },
  { id: 1, slug: 'c2', newRune: 5, signatureSpell: null, creature: 'Shelly', built: true },
  { id: 2, slug: 'c3', newRune: 6, signatureSpell: null, creature: 'Puff', built: true },
  { id: 3, slug: 'c4', newRune: null, signatureSpell: 0, creature: 'Glint', built: true },
  { id: 4, slug: 'c5', newRune: 7, signatureSpell: null, creature: 'Blink', built: true },
  { id: 5, slug: 'c6', newRune: 8, signatureSpell: null, creature: 'Rio', built: true },
  { id: 6, slug: 'c7', newRune: 9, signatureSpell: null, creature: 'Dune', built: true },
  { id: 7, slug: 'c8', newRune: null, signatureSpell: 1, creature: 'Frosty', built: true },
  { id: 8, slug: 'c9', newRune: 10, signatureSpell: null, creature: 'Wisp', built: true },
  { id: 9, slug: 'c10', newRune: 11, signatureSpell: null, creature: 'Sprig', built: true }
]

/** Umbra's node, 10-5: its sector's restoration is the finale (§10.19). */
export const FINALE_NODE = CHAPTER_COUNT * NODES_PER_CHAPTER - 1

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
/**
 * Position is the bit in `giftsOwned`. APPEND ONLY, and ≤ 31 entries: the bit
 * lives in a plain int that `readCampaign` clamps to `0x7fffffff` (§4.3), and
 * an owned keepsake is remembered by its POSITION, so moving one hands every
 * save in the wild somebody else's hat.
 *
 * 0–8 are the nine story keepsakes, one per chapter, drawn by
 * `rig-cosmetics.ts`. 9–22 are the SECOND SHELF (`rig-accessories.ts`): the
 * alternatives that make a slot a choice rather than a switch, which is
 * §2.2's rule 20 — "no wardrobe slot ships with only one, narrowly gendered
 * default and no alternative". Every slot the rig can carry now offers three
 * or four, and each set spans more than the pastel default.
 */
export const COSMETICS: readonly CosmeticDef[] = [
  { slot: 'head', slug: 'flowerCrown' },
  { slot: 'neck', slug: 'seashellNecklace' },
  { slot: 'back', slug: 'pegasusWings' },
  { slot: 'trail', slug: 'hoofTrailVfx' },
  { slot: 'skin', slug: 'umbraSkin' },
  { slot: 'mane', slug: 'colorPicker' },
  { slot: 'skin', slug: 'pastelTheme' },
  { slot: 'neck', slug: 'winterScarf' },
  { slot: 'companion', slug: 'petStar' },
  // The second shelf (ids 9–22).
  { slot: 'head', slug: 'acornCap' },
  { slot: 'trail', slug: 'bubbleTrail' },
  { slot: 'companion', slug: 'petCloud' },
  { slot: 'head', slug: 'explorerGoggles' },
  { slot: 'companion', slug: 'petFirefly' },
  { slot: 'back', slug: 'butterflyWings' },
  { slot: 'back', slug: 'explorerPack' },
  { slot: 'trail', slug: 'frostTrail' },
  { slot: 'skin', slug: 'moonlitLook' },
  { slot: 'head', slug: 'starTiara' },
  { slot: 'neck', slug: 'bowTie' },
  { slot: 'neck', slug: 'moonPendant' },
  { slot: 'trail', slug: 'petalTrail' },
  { slot: 'skin', slug: 'sunsetLook' }
]

/** Every keepsake in a slot, in shelf order — the wardrobe's tab contents. */
export const cosmeticsIn = (slot: CosmeticSlot): number[] => {
  const out: number[] = []
  for (let i = 0; i < COSMETICS.length; i++) if (COSMETICS[i]!.slot === slot) out.push(i)
  return out
}

/**
 * The rune node `n`'s chest gives, or null: the early ones by node, then each
 * chapter's own at its boss.
 */
export const runeForNode = (n: number): number | null => {
  const early = EARLY_RUNES[n]
  if (early !== undefined) return early
  return nodeIsBoss(n) ? CHAPTERS[nodeChapter(n)]?.newRune ?? null : null
}

/**
 * The runes a player is CERTAIN to hold arriving at node `n`: the two she
 * starts with, plus every rune a chest before it has handed over (§8.30). A
 * bitmask, like `S.campaign.runesUnlocked`.
 *
 * The schedule, not the save — which is the point. Anything derived from a
 * node (a replay goal, a difficulty read, the win-rate harness's kit) has to
 * ask what that node can be played WITH, and a save answers a different
 * question: a player replaying node 3 with all twelve runes in hand would
 * make node 3's own goal look reachable when, on the run that matters, it
 * was not.
 */
export const runesHeldBy = (n: number): number => {
  let held = STARTING_RUNES
  for (let k = 0; k < Math.min(n, CHAPTER_COUNT * NODES_PER_CHAPTER); k++) {
    const r = runeForNode(k)
    if (r !== null) held |= 1 << r
  }
  return held
}

/** The newest rune a chest had handed over before node `n`, or null at the
 *  very first node, where the starting pair is all there is. */
export const newestRuneBy = (n: number): number | null => {
  for (let k = Math.min(n, CHAPTER_COUNT * NODES_PER_CHAPTER) - 1; k >= 0; k--) {
    const r = runeForNode(k)
    if (r !== null) return r
  }
  return null
}

/**
 * The rune the NEXT chest owes this player — the one to tease in the
 * spellbook (§8.30). It is whatever `runeForNode` owes at the first node from
 * `from` on that she has not been given yet, or null once she holds them all.
 */
export const nextRuneAfter = (from: number, held: number): number | null => {
  for (let n = Math.max(0, from); n < CHAPTER_COUNT * NODES_PER_CHAPTER; n++) {
    const r = runeForNode(n)
    if (r !== null && !((held >> r) & 1)) return r
  }
  return null
}

/** A boss chest's keepsake per chapter: a cosmetic, or (ch10) the versus unlock. */
export interface GiftDef { kind: 'cosmetic' | 'feature'; cosmeticId?: number; feature?: 'versus' }
export const GIFTS: readonly GiftDef[] = [
  ...COSMETICS.map((_, i): GiftDef => ({ kind: 'cosmetic', cosmeticId: i })),
  { kind: 'feature', feature: 'versus' }
]

/** The Friendship Duo's gift id — after every cosmetic, so appending a
 *  keepsake never moves it (it used to be a bare `9`, which was the same
 *  number as chapter 9 by coincidence and broke the moment the shelf grew). */
export const VERSUS_GIFT = COSMETICS.length

/* -------------------------------- nodes ------------------------------ */
export interface NodeDef {
  /** A specific foe instead of the chapter default (rare). */
  foeIdOverride?: number
  /** The boss chest's keepsake (an index into GIFTS), or null. */
  giftId: number | null
}

/**
 * The node whose chest gives the FIRST keepsake (owner, 2026-09-21): after
 * the second battle, not after the chapter's boss. A wardrobe with one thing
 * in it teaches a child what the wardrobe is for; an empty one teaches
 * nothing, and five duels is a long time to wait to find out.
 */
export const FIRST_GIFT_NODE = 1

/**
 * The SECOND SHELF's chests (keepsakes 9–22), by node.
 *
 * A boss chest per chapter could only ever hand out ten things, which is why
 * a slot had one item in it. These fourteen ride the chapter's FOURTH node
 * (`pos 3`) all the way down, plus the second node of chapters 2, 4, 6 and 8
 * — nodes that gave a tool and nothing else, and are the two duels furthest
 * from a chest under the old schedule.
 *
 * Each is matched to where it is found rather than dealt out: the acorn cap
 * comes out of the woods, the bubble trail out of the bay, the pet cloud out
 * of the Cloud Kingdom, the goggles out of the Crystal Caves, the moonlit
 * coat off the Starlight Summit, the tiara out of the Festival.
 */
const SECOND_SHELF: Readonly<Record<number, number>> = {
  3: 9, 6: 19, 8: 10, 13: 11, 16: 20, 18: 12, 23: 13, 26: 21, 28: 14, 33: 15, 36: 22, 38: 16, 43: 17, 48: 18
}

export const NODES: readonly NodeDef[] = Array.from({ length: CHAPTER_COUNT * NODES_PER_CHAPTER }, (_, n) => ({
  // Chapter 1's boss gives no keepsake, because its crown moved forward to
  // `FIRST_GIFT_NODE` — and that chest is far from empty: it is the one that
  // hands over the Nature rune. Every other chapter keeps its own, the last
  // chapter's boss gives the Friendship Duo instead, and the second shelf
  // fills in between: all 23 keepsakes given exactly once, and none twice.
  giftId: n === FIRST_GIFT_NODE
    ? 0
    : SECOND_SHELF[n] ?? (nodeIsBoss(n) && nodeChapter(n) > 0
      ? (nodeChapter(n) === CHAPTER_COUNT - 1 ? VERSUS_GIFT : nodeChapter(n))
      : null)
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

/** The restoration tool a node's gift holds (§8.4 — by node type and
 *  chapter, never random): the Sunbeam in every boss chest; the Stardust
 *  Brush for standard nodes through chapter 3; the Magic Eraser from chapter
 *  4 on (the chapter-3 boss chest unlocks it). */
export type ToolId = 'brush' | 'eraser' | 'sunbeam'
export const toolOf = (n: number): ToolId => (nodeIsBoss(n) ? 'sunbeam' : nodeChapter(n) >= 3 ? 'eraser' : 'brush')
