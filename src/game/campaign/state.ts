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
import { emptyBitset, hasBit, countBits } from '@/game/campaign/bitset'
import { STARTING_RUNES } from '@/game/campaign/tables'
import { taughtFromCombos } from '@/game/campaign/newRune'

export const NODE_COUNT = 50
/** 24 × 14 coverage cells per sector (C9). */
export const COVER_CELLS = 24 * 14
/** Every combination of 1..3 runes drawn from 12 (12 + 78 + 364). */
export const COMBO_COUNT = 454

/**
 * How many sessions are counted before the number stops moving. A counter in
 * a save blob is a number a player can hand-edit and a portal's cloud can
 * mangle, so it is bounded on the way in like every other int here; 99 999
 * sessions is several lifetimes of this game and reads as "a lot" either way.
 */
export const SESSIONS_MAX = 99999
/** Photo cards the album keeps (retention roadmap item 16). */
export const PHOTO_SLOTS = 6
/** Characters one photo recipe may spend. A recipe is a handful of ids, not
 *  an image: anything longer is a bug or a mangled blob, and is truncated. */
export const PHOTO_RECIPE_MAX = 64
/** The largest YYYYMMDD a sane clock can produce — the day fields' ceiling. */
const DAY_MAX = 99991231

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
  /** Bit i = rune i has been drawn (stored) by her hand at least once — the
   *  new-rune guide shows a rune on the pad until it is (`newRune.ts`). A save
   *  from before the field reads it off `combosSeen`; always ORs the pair. */
  runesTaught: number
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
  /** The first-launch intro has played, or was skipped (§8.26). A save from
   *  before the intro existed counts as seen once it has any progress — a
   *  returning player is never sent back through the picture book. */
  introSeen: boolean
  /** The book's PROLOGUE — Aurora's hello and Umbra's dust, its first two
   *  beats — has played in front of node 0's duel, or was skipped (owner,
   *  2026-09-24). The rest of the book (`introSeen`) waits for the first
   *  gift. A save with any progress counts as having met it, as does one
   *  that has seen the whole book. */
  prologueSeen: boolean

  /* ── The retention pass (retention-roadmap.md). Every field below names the
   *    roadmap item that owns it, because each is written by a different
   *    feature and they only look alike from here. ── */

  /** The LOCAL device date of the last session, YYYYMMDD; 0 = never played.
   *  Local on purpose: it is a calendar day, and a UTC day would hand a New
   *  Zealand child yesterday's gift. Nothing derived from it leaves the
   *  device, so no timezone identifies anybody (Poki/Playables). *(item 1)* */
  lastPlayedDay: number
  /** Sessions this profile has STARTED, clamped to `SESSIONS_MAX`. Counted at
   *  boot, so a session that ends in the first second still counts — that is
   *  exactly the session a funnel is asking about. *(item 1)* */
  sessions: number
  /** 50 bits: has this sector's tap creature ever popped out for this player?
   *  One bit per sector, so the album's cell is drawn from the sector's own
   *  `TapCreature` rather than a stored copy of it. *(item 3)* */
  creaturesMet: string
  /** The local device date the daily gift was last taken, YYYYMMDD; 0 = never.
   *  Never a streak (D1): missing a day costs nothing, so this is a "not
   *  today" latch and not a counter. *(item 5)* */
  giftDay: number
  /** Up to `PHOTO_SLOTS` photo-card RECIPES — a short string each, naming what
   *  to redraw (keepsakes, sector, pose), never an encoded image: the save blob
   *  round-trips through portal cloud stores with real size limits. *(item 16)* */
  photos: string[]
}

export const defaultCampaign = (): CampaignState => ({
  furthestNode: -1,
  sectorsDone: emptyBitset(NODE_COUNT),
  wipeCoverage: null,
  wipeHalf: null,
  runesUnlocked: STARTING_RUNES,
  runesTaught: STARTING_RUNES,
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
  finaleSeen: false,
  introSeen: false,
  prologueSeen: false,
  lastPlayedDay: 0,
  sessions: 0,
  creaturesMet: emptyBitset(NODE_COUNT),
  giftDay: 0,
  photos: []
})

const int = (v: unknown, lo: number, hi: number, dflt: number): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.trunc(n))) : dflt
}
const b64 = (v: unknown, dflt: string): string =>
  typeof v === 'string' && /^[A-Za-z0-9+/]*={0,2}$/.test(v) && v.length % 4 === 0 ? v : dflt

/**
 * The photo album's recipes (item 16), from whatever the blob holds.
 *
 * Three separate things can be wrong and each is survivable on its own: not an
 * array (→ none), too many entries (→ the first `PHOTO_SLOTS`, the oldest
 * kept, since a card a player made is not something to drop at random), and an
 * entry that is not a short string (→ dropped, never coerced — `String(obj)`
 * would store the literal "[object Object]" as a card and the album would try
 * to draw it).
 */
const photoList = (v: unknown): string[] => {
  if (!Array.isArray(v)) return []
  const out: string[] = []
  for (const e of v) {
    if (typeof e !== 'string' || !e) continue
    out.push(e.slice(0, PHOTO_RECIPE_MAX))
    if (out.length >= PHOTO_SLOTS) break
  }
  return out
}

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
  const furthestNode = int(r.furthestNode, -1, NODE_COUNT - 1, -1)
  const dialoguesSeen = b64(r.dialoguesSeen, d.dialoguesSeen)
  const combosSeen = b64(r.combosSeen, d.combosSeen)
  return {
    furthestNode,
    sectorsDone: b64(r.sectorsDone, d.sectorsDone),
    wipeCoverage: r.wipeCoverage === null || r.wipeCoverage === undefined ? null : b64(r.wipeCoverage, '') || null,
    wipeHalf: r.wipeHalf === null || r.wipeHalf === undefined ? null : b64(r.wipeHalf, '') || null,
    // A save from before the runes were earned (§8.30) holds the old frozen
    // four and keeps them: nobody is taken back down to two.
    runesUnlocked: int(r.runesUnlocked, 0, 0xfff, d.runesUnlocked) | STARTING_RUNES,
    // The new-rune guide's memory (`newRune.ts`). A save from before it counts
    // every rune in a spell it has CAST as drawn — it clearly was.
    runesTaught: r.runesTaught === undefined || r.runesTaught === null
      ? taughtFromCombos(combosSeen)
      : (int(r.runesTaught, 0, 0xfff, d.runesTaught) | STARTING_RUNES) >>> 0,
    signaturesUnlocked: int(r.signaturesUnlocked, 0, 0b11, 0),
    combosSeen,
    combosViewed: b64(r.combosViewed, d.combosViewed),
    dialoguesSeen,
    giftsOwned: int(r.giftsOwned, 0, 0x7fffffff, 0),
    giftsEquipped: eq,
    paintPicks: b64(r.paintPicks, d.paintPicks),
    rescued: int(r.rescued, 0, 0x3ff, 0),
    blooms: b64(r.blooms, d.blooms),
    lossStreaks: streaks,
    versusUnlocked: r.versusUnlocked === true,
    maneSwatch: int(r.maneSwatch, 0, 7, 0),
    finaleSeen: r.finaleSeen === true,
    introSeen: typeof r.introSeen === 'boolean'
      ? r.introSeen
      : furthestNode >= 0 || countBits(dialoguesSeen) > 0,
    // A save from before the prologue came first: anyone who has already met
    // node 0's opener (it is recorded the moment it is raised), won anything
    // or seen the whole book is past the point where the prologue plays.
    prologueSeen: typeof r.prologueSeen === 'boolean'
      ? r.prologueSeen
      : r.introSeen === true || furthestNode >= 0 || countBits(dialoguesSeen) > 0,
    // The retention fields. A blob written before they existed simply has
    // none of them, and every one falls back to "fresh": never played, no
    // sessions, nothing met, no gift taken, no photos. That is why
    // they need no schema bump — `migrate.ts` reads through this same reader
    // and writes the result back, so schema 2 already grows them.
    lastPlayedDay: int(r.lastPlayedDay, 0, DAY_MAX, 0),
    sessions: int(r.sessions, 0, SESSIONS_MAX, 0),
    creaturesMet: b64(r.creaturesMet, d.creaturesMet),
    giftDay: int(r.giftDay, 0, DAY_MAX, 0),
    photos: photoList(r.photos)
  }
}

/** The node whose gift is waiting to be unboxed/wiped, or null (§4.4). */
export const pendingSectorNode = (cs: CampaignState): number | null =>
  cs.furthestNode >= 0 && !hasBit(cs.sectorsDone, cs.furthestNode) ? cs.furthestNode : null

export const nextDuelNode = (cs: CampaignState): number => Math.min(NODE_COUNT - 1, cs.furthestNode + 1)
