/**
 * useCastNope — the HUD's answer to a REFUSED cast tap (second blind
 * playtest, 2026-09-24: testers tapped the dimmed Cast button during the
 * lesson, or Cast with an empty hand, and "nothing happened").
 *
 * The sim says a cast was refused (`S.castRefusedAt` / `S.castRefusedWhy`,
 * mirrored as `hud.refusedAt` / `hud.refusedWhy`); `DuelHud` answers it — the
 * button shakes (an outline flash under reduced motion), a soft "nope" plays,
 * and a hint depends on the reason — and bumps THIS, once per refusal, for
 * anything else that wants to answer the same moment:
 *
 *   token  bumps on every refusal the HUD answered (0 = none yet)
 *   why    'empty' — nothing in hand · 'busy' — a spell is still forging or
 *          in flight (or she is frozen) · 'lesson' — the first duel's lesson
 *          holds the cast shut
 *   at     `performance.now()` of it, ms
 *
 * THE LESSON'S PAD GUIDE is the intended reader of `why === 'lesson'` (and of
 * 'empty' while the lesson runs, where the idle "DRAW A RUNE" prompt is not
 * on screen to pulse): flash the guide when `token` changes, or — from canvas
 * code that draws every frame — while `castNopeFresh(ms)` holds. Canvas code
 * can equally read `S.castRefusedAt` against `S.t` directly.
 */
import { reactive } from 'vue'
import type { CastRefusal } from '@/game/duel/state'

export const castNope = reactive<{ token: number; why: CastRefusal; at: number }>({ token: 0, why: '', at: -1 })

/** The HUD answered a refusal (`DuelHud`'s watcher). */
export const noteCastNope = (why: CastRefusal): void => {
  castNope.why = why
  castNope.at = typeof performance !== 'undefined' ? performance.now() : Date.now()
  castNope.token++
}

/** Was a cast refused within the last `ms`, for this reason (any when omitted)? */
export const castNopeFresh = (ms: number, why?: CastRefusal): boolean => {
  if (castNope.token === 0 || (why && castNope.why !== why)) return false
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
  return now - castNope.at < ms
}
