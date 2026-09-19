/**
 * campaign/state.ts — `S.campaign`, the story's progress (story-spec §4.4).
 *
 * It nests inside the ONE state object (`auroras_magic_state.campaign`) and is
 * persisted as the single `am_campaign` field of the save blob. The full shape
 * lands now, at S1, even though S1 only writes the sector fields, so S2 grows
 * into it instead of migrating it.
 *
 * Enumerable sets are base64 bitsets (`bitset.ts`); a hot-checked set of at
 * most 16 members is a plain int bitmask (§4.5.1's rule).
 */
import { emptyBitset, hasBit } from '@/game/campaign/bitset'

export const NODE_COUNT = 50
/** 24 × 14 coverage cells per sector (C9). */
export const COVER_CELLS = 24 * 14
/** Every combination of 1..3 runes drawn from 12 (12 + 78 + 364). */
export const COMBO_COUNT = 454

export interface CampaignState {
  /** -1..49. Highest node whose DUEL is won. -1 = none. */
  furthestNode: number
  /** 50 bits: is sector N's dust cleared? Independent of `furthestNode` — a
   *  win can precede its wipe by a whole session. */
  sectorsDone: string
  /** 336 bits (24×14): the ONE sector mid-wipe, i.e. `furthestNode` while its
   *  `sectorsDone` bit is 0. `null` when none is in progress. */
  wipeCoverage: string | null
  /** The same sector's cells brushed past halfway but not done (a single
   *  pass), so a relaunch keeps them at the first pass's 55 %. `null` with
   *  `wipeCoverage`. */
  wipeHalf: string | null
  /** Bit i = rune i unlocked. Default: the frozen four. Written only by the
   *  campaign controller's unbox handler (S2). */
  runesUnlocked: number
  /** Bit i = `SIGNATURE_SPELLS[i]` unlocked. */
  signaturesUnlocked: number
  /** Over the fixed 454-combo enumeration (§4.3.1). */
  combosSeen: string
  /** The same enumeration: which discoveries the spellbook has shown (its
   *  row was on screen for 1 s, §3.9.1). Seen-but-not-viewed = "new". */
  combosViewed: string
  /** 50 bits: has this node's dialogue been viewed once? */
  dialoguesSeen: string
  /** Bitmask over `COSMETICS`. */
  giftsOwned: number
  /** One entry per cosmetic slot; -1 = nothing equipped. */
  giftsEquipped: [number, number, number, number, number, number, number]
  /** 2 bits per sector: 0 = no pick yet, 1..3 = paint pot + 1 (C11). */
  paintPicks: string
  /** 10-bit mask of rescued chapter collectibles. */
  rescued: number
  /** 50 bits: which sectors' Twin Gift bloom has been claimed (D3). */
  blooms: string
  /** Dream Dust per node (only non-zero entries), keyed by node index. */
  lossStreaks: Record<string, number>
  versusUnlocked: boolean
  /** The Mane Color Palette's pick (chapter 6's keepsake, C17): 0..7. */
  maneSwatch: number
  /** The Festival's finale card has been shown; Umbra wanders the map (§8.11). */
  finaleSeen: boolean
}

export const defaultCampaign = (): CampaignState => ({
  furthestNode: -1,
  sectorsDone: emptyBitset(NODE_COUNT),
  wipeCoverage: null,
  wipeHalf: null,
  runesUnlocked: 0b1111,
  signaturesUnlocked: 0,
  combosSeen: emptyBitset(COMBO_COUNT),
  combosViewed: emptyBitset(COMBO_COUNT),
  dialoguesSeen: emptyBitset(NODE_COUNT),
  giftsOwned: 0,
  giftsEquipped: [-1, -1, -1, -1, -1, -1, -1],
  paintPicks: emptyBitset(NODE_COUNT * 2),
  rescued: 0,
  blooms: emptyBitset(NODE_COUNT),
  lossStreaks: {},
  versusUnlocked: false,
  maneSwatch: 0,
  finaleSeen: false
})

const int = (v: unknown, lo: number, hi: number, dflt: number): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.trunc(n))) : dflt
}
const b64 = (v: unknown, dflt: string): string =>
  typeof v === 'string' && /^[A-Za-z0-9+/]*={0,2}$/.test(v) && v.length % 4 === 0 ? v : dflt

/**
 * A `CampaignState` from whatever the save blob holds — a fresh profile, an
 * older shape, or junk. Never throws; every field falls back to its default.
 */
export const readCampaign = (raw: unknown): CampaignState => {
  const d = defaultCampaign()
  if (!raw || typeof raw !== 'object') return d
  const r = raw as Record<string, unknown>
  const eq = Array.isArray(r.giftsEquipped) && r.giftsEquipped.length === 7
    ? (r.giftsEquipped.map((v) => int(v, -1, 31, -1)) as CampaignState['giftsEquipped'])
    : d.giftsEquipped
  const streaks: Record<string, number> = {}
  if (r.lossStreaks && typeof r.lossStreaks === 'object') {
    for (const [k, v] of Object.entries(r.lossStreaks as Record<string, unknown>)) {
      // A node outside the campaign is dropped, never clamped onto another's.
      const node = /^\d+$/.test(k) ? Number(k) : -1
      const n = int(v, 0, 8, 0)
      if (node >= 0 && node < NODE_COUNT && n > 0) streaks[String(node)] = n
    }
  }
  return {
    furthestNode: int(r.furthestNode, -1, NODE_COUNT - 1, -1),
    sectorsDone: b64(r.sectorsDone, d.sectorsDone),
    wipeCoverage: r.wipeCoverage === null || r.wipeCoverage === undefined ? null : b64(r.wipeCoverage, '') || null,
    wipeHalf: r.wipeHalf === null || r.wipeHalf === undefined ? null : b64(r.wipeHalf, '') || null,
    runesUnlocked: int(r.runesUnlocked, 0, 0xfff, d.runesUnlocked) | 0b1111,
    signaturesUnlocked: int(r.signaturesUnlocked, 0, 0b11, 0),
    combosSeen: b64(r.combosSeen, d.combosSeen),
    combosViewed: b64(r.combosViewed, d.combosViewed),
    dialoguesSeen: b64(r.dialoguesSeen, d.dialoguesSeen),
    giftsOwned: int(r.giftsOwned, 0, 0x7fffffff, 0),
    giftsEquipped: eq,
    paintPicks: b64(r.paintPicks, d.paintPicks),
    rescued: int(r.rescued, 0, 0x3ff, 0),
    blooms: b64(r.blooms, d.blooms),
    lossStreaks: streaks,
    versusUnlocked: r.versusUnlocked === true,
    maneSwatch: int(r.maneSwatch, 0, 7, 0),
    finaleSeen: r.finaleSeen === true
  }
}

/** The node whose gift is waiting to be unboxed/wiped, or null (§4.4). */
export const pendingSectorNode = (cs: CampaignState): number | null =>
  cs.furthestNode >= 0 && !hasBit(cs.sectorsDone, cs.furthestNode) ? cs.furthestNode : null

export const nextDuelNode = (cs: CampaignState): number => Math.min(NODE_COUNT - 1, cs.furthestNode + 1)
