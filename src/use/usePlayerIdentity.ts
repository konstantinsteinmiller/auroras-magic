import { getState, setState } from '@/use/useGameState'
import { flushSaveNow } from '@/use/useSaveStatus'
import { ANON_NAME_KEY, PLAYER_ID_KEY } from '@/keys'
import { NAME_ADJECTIVES, NAME_NOUNS, isMintedName } from '@/game/leaderboardNames'

/**
 * ─── Who the leaderboard row belongs to ─────────────────────────────────────
 *
 * Two questions, answered independently because they fail differently:
 *
 *   WHO   — a stable id. Gets it wrong and the player collects duplicate rows,
 *           which is unfixable from the client and looks like the board eating
 *           their progress.
 *   WHAT  — a display name. Auroras Magic is all-ages, so this is ALWAYS a
 *           name the game minted ("Sunny Pony 482"). There is no name field
 *           and no portal username: nothing a player types, and no real
 *           handle, ever reaches a public board children read. The Worker
 *           refuses anything that is not a minted name, so this is enforced
 *           twice.
 *
 * Neither ever prompts.
 */

export interface PlayerIdentity {
  id: string
  name: string
  source: 'save' | 'device' | 'fresh'
}

/**
 * The id's own localStorage key, deliberately OUTSIDE the `am_`-prefixed save
 * blob.
 *
 * That prefix is exactly what the cloud save layer allowlists and mirrors. A
 * hydrate from an older cloud blob could hand the game a save with no id in
 * it; the game would then mint a second one, and the player would have two
 * rows. This copy is the one thing a cloud round-trip cannot overwrite.
 */
const DEVICE_UID_KEY = 'auroras_magic_uid'
const DEVICE_NAME_KEY = 'auroras_magic_name'

/** The shape the Worker validates against. Keep the two in step. */
const ID_RE = /^[a-zA-Z0-9_-]{8,64}$/

const readLocal = (key: string): string => {
  try { return localStorage.getItem(key) ?? '' } catch { return '' }
}
const writeLocal = (key: string, value: string): void => {
  try { localStorage.setItem(key, value) } catch { /* private mode, quota */ }
}

/** Uniform below `max`, without the modulo bias a naive `% max` introduces. */
const randomBelow = (max: number): number => {
  const limit = Math.floor(0xffffffff / max) * max
  const buf = new Uint32Array(1)
  for (let i = 0; i < 20; i++) {
    crypto.getRandomValues(buf)
    if (buf[0]! < limit) return buf[0]! % max
  }
  return buf[0]! % max
}

const mintId = (): string => {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** "<Adjective> <Noun> <100-999>" — the only shape the board accepts. */
export const mintName = (): string =>
  `${NAME_ADJECTIVES[randomBelow(NAME_ADJECTIVES.length)]} ` +
  `${NAME_NOUNS[randomBelow(NAME_NOUNS.length)]} ${100 + randomBelow(900)}`

/**
 * The player's stable id, resolved once and written back everywhere.
 *
 * Save blob first, then the standalone device key, then a fresh mint. There is
 * no platform-SDK tier: the portals this game ships to either expose no stable
 * player id at all or expose one that changes between anonymous sessions, and a
 * "stable" id that is not is worse than an anonymous one that is.
 */
const resolveId = (): { id: string; source: PlayerIdentity['source'] } => {
  const saved = getState<string>(PLAYER_ID_KEY, '')
  if (ID_RE.test(saved)) return { id: saved, source: 'save' }

  const device = readLocal(DEVICE_UID_KEY)
  if (ID_RE.test(device)) return { id: device, source: 'device' }

  return { id: mintId(), source: 'fresh' }
}

/** The minted name: from the save, else this device, else a fresh one. */
const resolveName = (): string => {
  const saved = getState<string>(ANON_NAME_KEY, '')
  if (isMintedName(saved)) return saved
  const device = readLocal(DEVICE_NAME_KEY)
  if (isMintedName(device)) return device
  return mintName()
}

/**
 * Resolve both, persist anything that was missing, and flush.
 *
 * The flush is synchronous on purpose: the save layer debounces by 200 ms, and
 * a reload inside that window would mint a second identity — which is the one
 * failure mode that cannot be repaired later.
 */
export const resolveIdentity = async (): Promise<PlayerIdentity> => {
  const { id, source } = resolveId()
  const name = resolveName()

  let dirty = false
  if (getState<string>(PLAYER_ID_KEY, '') !== id) { setState(PLAYER_ID_KEY, id); dirty = true }
  if (readLocal(DEVICE_UID_KEY) !== id) writeLocal(DEVICE_UID_KEY, id)
  if (getState<string>(ANON_NAME_KEY, '') !== name) { setState(ANON_NAME_KEY, name); dirty = true }
  if (readLocal(DEVICE_NAME_KEY) !== name) writeLocal(DEVICE_NAME_KEY, name)
  if (dirty) void flushSaveNow()

  return { id, name, source }
}

/** The name the board would show right now. */
export const playerDisplayName = async (): Promise<string> => (await resolveIdentity()).name
