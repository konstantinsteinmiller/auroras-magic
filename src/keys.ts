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

/** Coins — earned only by winning duels, spent on element ranks. */
export const COINS_KEY = 'am_coins'
/** Element ranks bought with coins, `[fire, wind, ice, earth]`, +12 % each. */
export const UPGRADES_KEY = 'am_upgrades'
/** Rung on the foe ladder (0 = Umbra … 5 = Prism) — the headline progress. */
export const BEST_STAGE_KEY = 'am_ladder'
/** Duels played, won or lost. */
export const RUNS_KEY = 'am_duels'

/** Duels won. */
export const WINS_KEY = 'am_wins'
/** Duels lost. Read by the NPC: a player's very first duel eases off. */
export const LOSSES_KEY = 'am_losses'
/** Fastest win, seconds. 0 = never won. */
export const BEST_TIME_KEY = 'am_best_time'
/** Spell combinations the player has cast, `{ [comboKey]: 1 }` — the spellbook. */
export const SPELLS_SEEN_KEY = 'am_spells_seen'
/** The three-beat onboarding finished (first cast landed). */
export const ONBOARDED_KEY = 'am_onboarded'

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
