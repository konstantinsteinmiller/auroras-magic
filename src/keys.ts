// ─── Game-state field catalogue ─────────────────────────────────────────────
//
// Field names INSIDE the single `auroras_magic_state` blob (see
// `useGameState.ts`). These are NOT separate localStorage keys — they are
// properties of the one persisted object — but they are a contract with the
// player base: renaming one strands existing players' progress on the old
// field. Treat them as load-bearing constants.
//
// Everything is `am_`-prefixed so `SaveMergePolicy.isPayloadKey` can allowlist
// the whole surface with a single prefix.

// ─── Duel progression ───────────────────────────────────────────────────────
//
// The export NAMES below are shared with the platform layer, which predates
// this game: `SaveMergePolicy` ranks two saves by `BEST_STAGE_KEY`, `RUNS_KEY`,
// `UPGRADES_KEY` and `COINS_KEY`, and the GamePix plugin reports the first two.
// For a duel ladder they mean:

/** RETIRED (D3): the Step-1 coin balance. Read once by the schema-2
 *  migration and removed; the story build has no currency. */
export const COINS_KEY = 'am_coins'
/** RETIRED (D3): Step-1 element ranks. Read once by the migration, removed. */
export const UPGRADES_KEY = 'am_upgrades'
/** FROZEN: the Step-1 foe-ladder rung. Never written again; the story's
 *  progress is `am_campaign.furthestNode` (§4.7, §4.16). */
export const BEST_STAGE_KEY = 'am_ladder'
/** Duels played, won or lost. */
export const RUNS_KEY = 'am_duels'

/** Duels won. */
export const WINS_KEY = 'am_wins'
/** Duels lost. Read by the NPC: a player's very first duel eases off. */
export const LOSSES_KEY = 'am_losses'
/** Fastest win, seconds. 0 = never won. */
export const BEST_TIME_KEY = 'am_best_time'
/** RETIRED: Step-1 spell discoveries, `{ [comboKey]: 1 }`. Folded into
 *  `am_campaign.combosSeen` by the schema-2 migration, then removed. */
export const SPELLS_SEEN_KEY = 'am_spells_seen'
/** The three-beat onboarding finished (first cast landed). */
export const ONBOARDED_KEY = 'am_onboarded'
/** The story's progress — the nested `CampaignState` (story-spec §4.4). */
export const CAMPAIGN_KEY = 'am_campaign'
/** Schema version of the persisted blob. Absent means the Step-1 shape;
 *  `migrateToSchema2()` (§4.7) writes 2. */
export const SCHEMA_KEY = 'am_schema'

// ─── User settings ──────────────────────────────────────────────────────────

export const SOUND_KEY = 'am_user_sound_volume'
export const MUSIC_KEY = 'am_user_music_volume'
export const LANGUAGE_KEY = 'am_user_language'

/**
 * Mobile hard-mute (the speaker button on a phone). Only ever written on
 * mobile — see `useMobileAudioMute.ts`.
 */
export const MOBILE_MUTE_KEY = 'am_mobile_mute'

/**
 * Vibration on/off. Absent means ON — a device with a motor gets haptics until
 * the player turns them off in Options.
 */
export const HAPTICS_KEY = 'am_user_haptics'

/**
 * Show rune guides (story-spec §5.13): a faint ghost of the newest rune in the
 * drawing box until the first rune of a duel lands. Absent means OFF.
 */
export const TRACE_ASSIST_KEY = 'am_user_trace_assist'

/**
 * Reduced motion (§3.11). Absent means "follow the device's
 * `prefers-reduced-motion`"; true/false is the player's own choice.
 */
export const REDUCED_MOTION_KEY = 'am_user_reduced_motion'

/* ─── Leaderboard (worker/, `useLeaderboard`, `usePlayerIdentity`) ───────── */

/** The player's stable leaderboard id. Also mirrored to a standalone
 *  localStorage key OUTSIDE this prefix — see `usePlayerIdentity`. */
export const PLAYER_ID_KEY = 'am_player_id'
/** The minted display name ("Sunny Pony 482"), kept once minted. There is no
 *  player-chosen or portal-supplied tier: the board is family-friendly. */
export const ANON_NAME_KEY = 'am_anon_name'
/** The name the row currently carries on the server. A mismatch is what
 *  triggers the one relabel POST. */
export const POSTED_NAME_KEY = 'am_posted_name'
/** The best score (lifetime duels won) the server has ACCEPTED. The whole
 *  write rule is `score > this`, so it may only be set after a confirmed 200. */
export const SUBMITTED_SCORE_KEY = 'am_submitted_score'
/** The best score a PORTAL's own board accepted (e.g. Playgama's hosted board).
 *  Its own key: the two boards fail independently. Inert until a platform
 *  registers an adapter with `usePortalLeaderboard`. */
export const PORTAL_POSTED_SCORE_KEY = 'am_portal_posted_score'
/** Whether the player already has a row on the portal's own board. */
export const PORTAL_JOINED_KEY = 'am_portal_joined'
