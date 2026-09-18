// ─── Save merge policy ────────────────────────────────────────────────────
//
// Decides what to do when a hydrate brings back remote data that disagrees
// with the local snapshot. Pure module — no Vue, no I/O, no side effects.
// Strategies call into this; the SaveManager wires the result back into
// localStorage via the LocalStorageAccessor it owns.
//
// Each persisted save now carries a meta blob (`__save_meta__`) alongside
// the player's actual keys. The blob lets the next hydrate score local vs.
// remote and pick a winner deterministically without prompting.
//
// Score formula — the story's campaign (story-spec §4.16, M22):
//   (furthestNode + 1)  × 500
// + sectorsRestored     × 150
// + duelsPlayed         ×  10
//
// `furthestNode` is the headline progress number (the deepest node whose duel
// is won), restored sectors are the work the player put into the map, and
// the duel counter breaks ties between two saves at the same place. A
// snapshot with no `am_campaign` at all is a Step-1 save that has not been
// migrated yet: it keeps the old formula (ladder × 500 + rank levels × 150 +
// runs × 10), so it still outranks an empty device and the migration runs on
// the side that wins.
//
// Conflict policy:
//   - higher score wins
//   - tie on score → newer savedAt wins
//   - same time too → keep local (no needless writes)
//   - no consolation bonus: the story build has no currency (D3), so a lost
//     conflict pays nothing and the "bonus coins" banner never shows.

import { BEST_STAGE_KEY, COINS_KEY, UPGRADES_KEY, RUNS_KEY, CAMPAIGN_KEY } from '@/keys'
import { STATE_KEY } from '@/use/useGameState'

/** Where the meta blob is stored in localStorage / on the remote backend.
 *  NOT prefixed with `__save_internal__` — this key needs to round-trip
 *  through the strategy's mirror just like player data. */
export const META_KEY = '__save_meta__'

/** Bumped when the meta blob's shape changes in a non-additive way. A
 *  SEPARATE counter from the game's own `am_schema`: §4.16 changed which game
 *  field feeds the score, not the meta blob's shape, so this stays 1. */
export const SCHEMA_VERSION = 1

/** The consolation per stage of the winning save when a conflict is lost.
 *  0 — the story build has no currency (D3). */
export const CONFLICT_BONUS_PER_STAGE = 0

// ─── Game-specific keys the score formula needs to read ────────────────────
//
// Sourced from `src/keys.ts` (single source of truth shared with the
// composables that own these keys). Importing keeps this module pure (no
// Vue imports — `keys.ts` is a flat constants file) AND eliminates the
// drift risk the previous duplicated declaration had.

// ─── Types ─────────────────────────────────────────────────────────────────

export interface SaveMeta {
  /** ISO timestamp of when this save was generated. */
  savedAt: string
  /** Output of the score formula above. */
  progressScore: number
  schemaVersion: number
  /** Deepest stage the save represents — used to compute the conflict bonus. */
  maxStage: number
  /**
   * Cloud `savedAt` for which this client already received the conflict
   * bonus. Prevents repeat farming: if a player force-closes and reopens
   * (cloud unchanged, local possibly cleared), the strategy still sees
   * `remote-wins` would award `+N coins` — but if `bonusReceivedFor`
   * matches the cloud's `savedAt`, the bonus is suppressed because we
   * already paid it out. The flag is written into the META blob and
   * round-trips through cloud + IDB backup, so it survives whichever
   * partition the OS happens to clear.
   *
   * Optional for back-compat with legacy save blobs that predate this
   * field — `parseMeta` accepts records without it.
   */
  bonusReceivedFor?: string
}

/** Narrow read-only view over a localStorage snapshot. */
export interface SnapshotReader {
  get(key: string): string | null
}

/**
 * Hydrate-time merge resolution. The SaveManager's job is to:
 *   - apply the chosen side's keys to local
 *   - if `bonusCoins > 0`, add that to the merged COINS_KEY value
 *   - schedule a flush back to remote when the chosen side is local
 */
export type MergeResolution =
/** Remote had higher progress; overwrite local. Bonus may be 0 if local was empty. */
  | { kind: 'remote-wins'; bonusCoins: number }
  /** Local had higher progress; keep local and push it to remote on next flush. */
  | { kind: 'local-wins' }
  /** Local was empty; remote is the seed. Same as remote-wins but no bonus and no "loss". */
  | { kind: 'remote-only' }
  /** Remote returned no data; nothing to merge. */
  | { kind: 'local-only' }
  /** Both sides identical; keep local, skip the rewrite. */
  | { kind: 'tie-keep-local' }

// ─── Helpers ──────────────────────────────────────────────────────────────

const safeInt = (v: string | null, fallback: number): number => {
  if (v == null) return fallback
  const n = parseInt(v, 10)
  return Number.isFinite(n) ? n : fallback
}

const safeJson = <T>(v: string | null, fallback: T): T => {
  if (v == null) return fallback
  try {
    return JSON.parse(v) as T
  } catch {
    return fallback
  }
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Compute a fresh meta blob from the current localStorage snapshot.
 * Pure — no side effects.
 */
/** Pull a sub-field out of the consolidated `auroras_magic_state` blob if present.
 *  Falls through to a top-level read for back-compat with any pre-migration
 *  snapshot that still has individual keys (e.g. the score formula was just
 *  invoked between BlobStorage construction and the first migration write). */
const readField = (read: SnapshotReader, field: string): string | null => {
  const blob = read.get(STATE_KEY)
  if (blob != null) {
    try {
      const parsed = JSON.parse(blob)
      if (parsed && typeof parsed === 'object' && field in parsed) {
        const v = (parsed as Record<string, unknown>)[field]
        if (v == null) return null
        return typeof v === 'string' ? v : JSON.stringify(v)
      }
    } catch { /* fall through to direct read */ }
  }
  return read.get(field)
}

/** The story's campaign record, when the snapshot has one (§4.16). */
const readCampaign = (read: SnapshotReader): { furthestNode: number; sectorsDone: string } | null => {
  const raw = readField(read, CAMPAIGN_KEY)
  const c = safeJson<Record<string, unknown> | null>(raw, null)
  if (!c || typeof c !== 'object') return null
  const f = typeof c.furthestNode === 'number' && Number.isFinite(c.furthestNode) ? Math.trunc(c.furthestNode) : -1
  return { furthestNode: Math.max(-1, Math.min(49, f)), sectorsDone: typeof c.sectorsDone === 'string' ? c.sectorsDone : '' }
}

/** Set bits in a base64 bitset; junk counts as none. */
const countBits = (b64: string): number => {
  let n = 0
  try {
    const bin = atob(b64)
    for (let i = 0; i < bin.length; i++) {
      let v = bin.charCodeAt(i)
      while (v) {
        n += v & 1
        v >>= 1
      }
    }
  } catch {
    return 0
  }
  return n
}

export const computeMeta = (
  read: SnapshotReader,
  savedAt: string = new Date().toISOString()
): SaveMeta => {
  const runs = Math.max(0, safeInt(readField(read, RUNS_KEY), 0))
  const campaign = readCampaign(read)
  if (campaign) {
    // A fresh campaign (furthestNode −1, nothing restored) scores only its
    // duels, so a brand-new device can never beat a real cloud save.
    const reached = campaign.furthestNode + 1
    const restored = countBits(campaign.sectorsDone)
    const progressScore = reached * 500 + restored * 150 + runs * 10
    return { savedAt, progressScore, schemaVersion: SCHEMA_VERSION, maxStage: reached }
  }
  // A Step-1 snapshot (no campaign yet). `bestStage` is 0 for a player who has
  // never cleared a stage, so a brand-new local snapshot scores 0 and can
  // never beat a real cloud save on a tie.
  const bestStage = Math.max(0, safeInt(readField(read, BEST_STAGE_KEY), 0))

  // Upgrades are stored as a flat `{ id: level }` record. Summing the levels
  // (rather than counting the tracks) makes a deeply-invested save beat a
  // broadly-dabbled one, which is the right tie-break for a meta this small.
  const upgrades = safeJson<Record<string, number>>(readField(read, UPGRADES_KEY), {})
  let upgradeLevels = 0
  for (const v of Object.values(upgrades)) {
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) upgradeLevels += v
  }

  const progressScore =
    bestStage * 500
    + upgradeLevels * 150
    + runs * 10

  return { savedAt, progressScore, schemaVersion: SCHEMA_VERSION, maxStage: bestStage }
}

/**
 * Parse a meta blob from a stored value. Returns null for missing /
 * malformed blobs (treat as "no prior meta exists" — typically a save
 * that predates this layer or a value the SDK never wrote).
 */
export const parseMeta = (raw: string | null | undefined): SaveMeta | null => {
  if (!raw) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof parsed !== 'object' || parsed === null) return null
  const m = parsed as Partial<SaveMeta>
  if (
    typeof m.savedAt !== 'string' ||
    typeof m.progressScore !== 'number' || !Number.isFinite(m.progressScore) ||
    typeof m.schemaVersion !== 'number' || !Number.isFinite(m.schemaVersion) ||
    typeof m.maxStage !== 'number' || !Number.isFinite(m.maxStage)
  ) return null
  const out: SaveMeta = {
    savedAt: m.savedAt,
    progressScore: m.progressScore,
    schemaVersion: m.schemaVersion,
    maxStage: m.maxStage
  }
  if (typeof m.bonusReceivedFor === 'string') {
    out.bonusReceivedFor = m.bonusReceivedFor
  }
  return out
}

export const serializeMeta = (meta: SaveMeta): string => JSON.stringify(meta)

/**
 * Compare local and remote metas, return the resolution.
 *
 * Rules (in order):
 *   1. No remote → 'local-only'
 *   2. No local  → 'remote-only'  (nothing to lose; no bonus needed)
 *   3. remote.score > local.score → 'remote-wins' (bonus = remote.maxStage × CONFLICT_BONUS_PER_STAGE
 *      if local had any progress — 0 in the story build, D3)
 *   4. local.score > remote.score → 'local-wins'
 *   5. Equal scores → newer savedAt wins (no bonus on score-tie wins)
 *   6. Equal everything → 'tie-keep-local'
 */
export const decideMerge = (
  localMeta: SaveMeta | null,
  remoteMeta: SaveMeta | null
): MergeResolution => {
  if (!remoteMeta) return { kind: 'local-only' }
  if (!localMeta) return { kind: 'remote-only' }

  if (remoteMeta.progressScore > localMeta.progressScore) {
    const bonus = localMeta.progressScore > 0 ? remoteMeta.maxStage * CONFLICT_BONUS_PER_STAGE : 0
    return { kind: 'remote-wins', bonusCoins: bonus }
  }
  if (localMeta.progressScore > remoteMeta.progressScore) {
    return { kind: 'local-wins' }
  }

  // Equal scores → newer timestamp wins. No bonus on a score-tie win
  // because no progress was actually surpassed.
  const lt = Date.parse(localMeta.savedAt)
  const rt = Date.parse(remoteMeta.savedAt)
  if (Number.isFinite(rt) && Number.isFinite(lt) && rt > lt) {
    return { kind: 'remote-wins', bonusCoins: 0 }
  }
  return { kind: 'tie-keep-local' }
}

/**
 * Add the bonus to the local coin total. Returns the new value as a
 * string ready to be written back to COINS_KEY. Caller does the write.
 */
export const applyBonusCoins = (read: SnapshotReader, bonus: number): string => {
  const current = safeInt(read.get(COINS_KEY), 0)
  return String(current + Math.max(0, bonus))
}

/** Bonus-coin path: read the sub-field from auroras_magic_state if it exists. */
export const readCoinTotal = (read: SnapshotReader): number => {
  return safeInt(readField(read, COINS_KEY), 0)
}

/**
 * Allowlist of keys that participate in the persisted payload.
 *
 * Replacing the old "anything not internal" rule because that let
 * unrelated localStorage entries — vConsole layout, ad-tech experiment
 * flags (`prebid11_*`, `dummy_*_exp`, `li-module-enabled`, `bid_pf_*`),
 * dev toggles, and whatever the next library decides to scribble — get
 * mirrored to the cloud. The CrazyGames Data Module then included all
 * of that in its upload, ballooning the POST body and giving QA a
 * misleading picture of what the game stores.
 *
 * Single-blob model: every persisted gameplay value lives inside the
 * `auroras_magic_state` localStorage entry (see `useGameState.ts`). The cloud
 * therefore mirrors exactly TWO keys — the state blob and the meta blob.
 *
 * Individual `am_*` field keys are also accepted as payload so any stray
 * per-key write (defensive, or a mid-migration snapshot from an older client)
 * round-trips safely instead of being silently dropped.
 */
const PAYLOAD_PREFIXES = ['am_'] as const

export const isPayloadKey = (key: string): boolean => {
  if (key === META_KEY) return true
  if (key === STATE_KEY) return true
  for (const prefix of PAYLOAD_PREFIXES) {
    if (key.startsWith(prefix)) return true
  }
  return false
}

// Re-exported so tests / other modules don't have to re-declare them.
export const SAVE_KEYS = {
  BEST_STAGE: BEST_STAGE_KEY,
  COINS: COINS_KEY,
  UPGRADES: UPGRADES_KEY,
  RUNS: RUNS_KEY
} as const
