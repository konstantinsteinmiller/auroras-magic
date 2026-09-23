/**
 * perfect.ts — the perfect-rune sparkle (retention-roadmap item 7).
 *
 * WHY: drawing IS the game. A neat rune should feel different from a scrappy
 * one, because children draw more carefully when carefulness sparkles. It is
 * the only place in the duel that answers "how well did I do that", and the
 * answer is a star burst, a brighter chime and a little twinkle on the slot
 * the rune went into — never a number, never a grade, never a word.
 *
 * COSMETIC, AND PROVABLY SO. The tuned win rates (story-spec §8.18) must be
 * untouched, so nothing here is written into `S`: no rule in `sim.ts` can
 * read a flag that does not exist. The sim's only part in this is handing the
 * stroke record it already built to the `rune` event; the judgement, the
 * effects and the event all live out here.
 *
 * The one way a "cosmetic" burst could still have changed the fight is the
 * DICE. `fx.ts` rolls on `Math.random`, the same stream the duel's damage
 * rolls on, so ~34 extra draws per neat rune would shift every later roll and
 * a perfect rune really would change the next damage number. So the sparkle
 * brings its OWN stream (`borrowDice`), and `tests/duel/perfectRune.test.ts`
 * replays a whole scripted duel with the sparkle on and off and pins both HP
 * and the winner as identical.
 *
 * ─── Where the threshold comes from ─────────────────────────────────────
 *
 * `margin` is the recogniser's best template score minus the 0.78 acceptance
 * line, so it tops out at 0.22 and a barely-accepted stroke sits near 0.
 *
 * Measured against the real recogniser (`src/game/duel/runes.ts`) over the
 * spike's own draw generators (`tests/duel/rune-draws.ts`), 500 draws × 12
 * runes per hand. The shipped noise model only JITTERS a mathematically exact
 * polygon, which every hand scores ~1.0 on, so it cannot tell a careful draw
 * from a scrappy one at all; the hands below add what a real hand actually
 * does — a smooth low-frequency wander off the line, `w` in shape widths —
 * on top of it. Share of ALL attempts that clear each candidate:
 *
 *              0.185  0.190  0.195  0.200  0.205  0.210
 *   careful      79%    76%    73%    69%    65%    59%
 *   ordinary     70%    68%    64%    59%    52%    41%
 *   quick        56%    52%    46%    38%    27%    13%
 *   scribbly     31%    25%    19%    12%     6%     2%
 *
 * 0.19 is where three things hold at once:
 *
 *   • EVERY rune can earn it with a careful hand. The alphabet is not
 *     uniform — a heart and a spiral score far lower than a square however
 *     neatly they are drawn — and at 0.19 the hardest two still land it
 *     (love 10 %, illusion 38 %, rainbow 52 %, lightning 59 %), while at
 *     0.205 love reaches it once in a hundred and at 0.21 never. A reward no
 *     chapter-12 rune can ever win teaches the wrong thing.
 *   • Care is what moves it: 76 % careful against 25 % scribbly, a 3× gap
 *     that a child feels within a few strokes.
 *   • Junk cannot fake it. Of 6000 non-rune strokes the recogniser accepted
 *     24, and the best of those scored 0.094 — half the threshold. A false
 *     accept never sparkles.
 *
 * Re-measure with `pnpm rune:spike` after any change to the templates or the
 * envelopes: the numbers above describe THIS recogniser, and a rune added to
 * the bank moves all of them.
 */
import { onDuelEvent, type StrokeInfo } from '@/game/duel/sim'
import { borrowDice, sparkleBurst } from '@/game/duel/fx'
import { sfx } from '@/game/duel/audio'
import { zoneCentre } from '@/game/duel/layout'
import { S } from '@/game/duel/state'
import { seeded } from '@/game/duel/util'
import { track } from '@/use/useAnalytics'

/** Best template score minus the 0.78 accept line, above which a stroke is
 *  "perfect". See the header for the measurement that chose it. */
export const PERFECT_MARGIN = 0.19

/** Was this finished stroke a perfect rune? A rejected stroke never is, and
 *  the boundary itself counts as perfect — a child on the line earns it. */
export const isPerfect = (info: StrokeInfo | undefined): boolean =>
  !!info && info.success && info.margin >= PERFECT_MARGIN

/* ───────────────────────────── the HUD seam ──────────────────────────── */
/**
 * Plain numbers, read once per frame by `syncHud` — the same firewall the
 * rest of the duel chrome uses. `token` bumps on every perfect rune, which is
 * what re-keys the twinkle in `RuneSlot.vue` so its one-shot animation plays
 * again; `slot` is the queue index the rune landed in.
 */
let token = 0
let slot = -1
export const perfectToken = (): number => token
export const perfectSlot = (): number => slot

/** The sparkle's own dice — see the header. Seeded, so a burst is the same
 *  burst on every device and in every test run. */
const dice = seeded(20260923)

/**
 * The reward itself. Kept in one function so the whole of what a perfect rune
 * does is visible at once: a star burst where the stored glyph is flashing, a
 * bell over the snap, a twinkle on the slot, one event.
 */
const celebrate = (info: StrokeInfo): void => {
  token++
  slot = Math.max(0, S.queue.length - 1)
  // On the stored rune: `drawSnap` flashes the clean glyph at the drawing
  // zone's centre, and this lands on top of it. `sparkleBurst` already scales
  // its particle counts by `S.q`, so a weak device pays a ninth of this.
  const [cx, cy] = zoneCentre()
  borrowDice(dice, () => sparkleBurst(cx, cy, 0.55))
  sfx('perfect')
  track('perfect_rune', { rune: info.rune, margin: info.margin })
}

let off: (() => void) | null = null
/**
 * Subscribe to the sim. Called once, from `installDuelFlow`.
 *
 * The `rune` event fires only for a stroke that was RECOGNISED and STORED, so
 * a shape refused for a full hand never sparkles at a rune the player did not
 * get to keep.
 */
export const installPerfectSparkle = (): (() => void) => {
  if (off) return off
  const stop = onDuelEvent((e, _won, info) => {
    if (e === 'rune' && isPerfect(info)) celebrate(info!)
  })
  off = () => {
    stop()
    off = null
  }
  return off
}

/**
 * Forget the last sparkle. Called at the top of every duel (`duelFlow`), so
 * the mark from the last fight is not still sitting, spent and invisible, on
 * a slot of the new one — and by the tests.
 */
export const resetPerfectMark = (): void => {
  token = 0
  slot = -1
}
