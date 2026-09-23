import { replaceGameState, STATE_KEY } from '@/use/useGameState'
import { flushSaveNow } from '@/use/useSaveStatus'
import {
  ANON_NAME_KEY, PLAYER_ID_KEY, PORTAL_JOINED_KEY, PORTAL_POSTED_SCORE_KEY,
  POSTED_NAME_KEY, SUBMITTED_SCORE_KEY
} from '@/keys'

/**
 * ─── Start the whole story again ────────────────────────────────────────────
 *
 * Wipes everything the game remembers about this player and reloads, so the
 * next boot is a first boot: the intro plays, the map is dark, two runes, no
 * keepsakes, default settings.
 *
 * ONE EXCEPTION, AND IT IS THE POINT: the leaderboard's numbers are left
 * alone.
 *
 * "Reset everything except the total leaderboard players" reads at first like
 * one field — the count under the rank badge — and it is really two things,
 * because the count is not ours to reset:
 *
 *   1. **The board cache** (`auroras_magic_board_cache`) is a per-device copy
 *      of PUBLIC data — the published top hundred and the population the rank
 *      is out of. It is identical for every player, it is not this player's
 *      progress, and it is deliberately outside the `am_` prefix so it never
 *      round-trips to a portal's cloud save. Wiping it would buy nothing and
 *      cost the player a board on the next plane journey. This function simply
 *      never touches it — it is not in the blob.
 *   2. **The player's IDENTITY** (`KEPT`, below) has to survive, or resetting
 *      would CHANGE the total rather than preserve it. The id is what names
 *      this player's single row on the Worker's board. Mint a new one and the
 *      old row does not go away: it is stranded, the player collects a second
 *      one, and the global population goes up by one for every reset anybody
 *      ever does. That is unfixable from the client, so the id, the minted
 *      name, and the two "what the server already has" mirrors stay.
 *
 * The score the board shows therefore stays too — the row is the server's, and
 * a client cannot delete it. That is the honest behaviour and the confirm copy
 * says so: the story starts again, the leaderboard place does not.
 *
 * Everything else in `keys.ts` goes, settings included. The button says
 * "progress" and the confirm says "and your settings", because a reset that
 * quietly kept the volume and the language would be a reset nobody could
 * describe.
 */

/**
 * The fields a reset keeps. An ALLOW-list: anything added to `keys.ts` later
 * is wiped unless somebody deliberately puts it here.
 */
export const KEPT_ON_RESET: readonly string[] = [
  PLAYER_ID_KEY,
  ANON_NAME_KEY,
  POSTED_NAME_KEY,
  SUBMITTED_SCORE_KEY,
  PORTAL_POSTED_SCORE_KEY,
  PORTAL_JOINED_KEY
]

/**
 * Raw `am_*` entries beside the blob, folded away.
 *
 * `useGameState.buildInitial` folds any loose `am_*` localStorage key INTO the
 * blob on the next boot, which is a migration path for an older client's
 * per-key writes — and a way for wiped progress to walk back in. Rare, and
 * cheap to close: enumerate and remove. These go through the PATCHED
 * `removeItem`, so a cloud strategy mirrors the removal rather than finding
 * them again on the next hydrate.
 */
const dropStrayFields = (): void => {
  try {
    const stray: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k !== STATE_KEY && k.startsWith('am_')) stray.push(k)
    }
    for (const k of stray) {
      try { localStorage.removeItem(k) } catch { /* one stray key is not worth failing a reset over */ }
    }
  } catch { /* no storage at all: there is nothing to strand */ }
}

/**
 * Wipe, push, reload.
 *
 * The reload is not laziness. Half the game's state lives in module-level refs
 * that were seeded from the save at import time — the campaign, the rune
 * gifts, the wardrobe, the flow's current scene — and a reset that only
 * emptied the blob would leave every one of them holding the old numbers until
 * something happened to re-read them. A reload is the one move that is correct
 * for all of them at once, and it is what a first boot is anyway.
 *
 * The flush is AWAITED before the reload for the same reason `resolveIdentity`
 * flushes synchronously: the persist layer debounces by 200 ms and the
 * strategy by another 250, and a reload inside that window would take the
 * wiped save down with it and boot the player straight back into their old
 * one.
 *
 * ONE HONEST LIMIT, on a cloud build only. If the device is offline when the
 * player resets, the push cannot land, and the next boot compares an empty
 * local save against the portal's full cloud one and — correctly, by the merge
 * policy that exists to stop a bad hydrate eating a save — restores it. The
 * progress comes back. That is the same rule that protects every player from
 * losing a save to a flaky network, and it is not worth special-casing here:
 * the alternative is a client that can order the cloud to forget, which is how
 * saves get lost for real.
 */
export const resetProgress = async (): Promise<void> => {
  // `replaceGameState` persists synchronously rather than on the 200 ms
  // debounce, so what is on disk after this line is already the wiped save.
  replaceGameState(KEPT_ON_RESET)
  dropStrayFields()
  // Drains the strategy's queue to the backend, and (on every cloud strategy)
  // recomputes `__save_meta__` from what is on disk NOW — so the save the
  // cloud ends up holding scores as the empty save it is, rather than keeping
  // the old blob's meta and out-ranking us on the next boot.
  await flushSaveNow()
  if (typeof window === 'undefined') return
  // Back to the root route before reloading: the router is on hash history, so
  // a straight `reload()` would boot back into `#/game` — a duel that no
  // longer exists, with a campaign that has just been emptied under it.
  try { window.location.hash = '#/' } catch { /* not fatal; the reload still happens */ }
  window.location.reload()
}
