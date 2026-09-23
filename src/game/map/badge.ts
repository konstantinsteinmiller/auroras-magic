/**
 * badge.ts — the little round badge that hangs off every node on a map page
 * (story-spec §3.8): a coloured disc with one glyph on it, saying whether
 * that sector is yours, next, or still shut.
 *
 * Pulled out of `map.ts` so the art bench can render its reference from the
 * game's own painter, exactly as `tent.ts` does for the wardrobe. The BADGE
 * is static and paintable; the breathing ring that pulses around the current
 * one is not, and stays in `map.ts` where it is drawn over the top.
 *
 * FIVE badges, which is every combination the map can actually show — a
 * locked node shows its lock whether or not it is a boss, so "locked boss"
 * is not a sixth:
 *
 *   0  locked   lilac  + padlock
 *   1  current  violet + star
 *   2  current  violet + crown   (a chapter's boss)
 *   3  done     gold   + star
 *   4  done     gold   + crown
 */
import type { ItemSpec } from '@/game/artItem'
import { TAU, PI } from '@/game/duel/util'

type G2D = CanvasRenderingContext2D

/** A badge's state, as the strip orders them. */
export type BadgeFrame = 0 | 1 | 2 | 3 | 4

/** The disc colour of each frame. */
const DISC = ['#a99dc0', '#8f6cff', '#8f6cff', '#ffd76a', '#ffd76a'] as const
/** The glyph ink of each frame. */
const GLYPH = ['#ffffff', '#ffffff', '#ffffff', '#fff6d0', '#fff6d0'] as const

/** Which badge frame a node in state `st` (boss or not) shows. */
export const badgeFrame = (st: 'locked' | 'current' | 'done', boss: boolean): BadgeFrame =>
  st === 'locked' ? 0 : st === 'current' ? (boss ? 2 : 1) : boss ? 4 : 3

/**
 * One badge, centred on the origin, `r` px across. The caller has already
 * put it where it goes — and, for the current one, drawn its ring.
 */
export const paintBadge = (g: G2D, r: number, f: BadgeFrame): void => {
  g.beginPath()
  g.arc(0, 0, r, 0, TAU)
  g.fillStyle = DISC[f]!
  g.fill()
  g.lineWidth = 4 * (r / 28)
  g.strokeStyle = '#3A2340'
  g.stroke()
  g.save()
  g.fillStyle = GLYPH[f]!
  g.strokeStyle = '#3A2340'
  g.lineWidth = 2.5 * (r / 28)
  g.beginPath()
  const R = r * 0.55
  if (f === 0) {
    // A little padlock: the shackle is an arc, the body a rounded block.
    g.roundRect(-R * 0.6, -R * 0.1, R * 1.2, R * 0.9, 4 * (r / 28))
    g.moveTo(-R * 0.35, -R * 0.1)
    g.arc(0, -R * 0.1, R * 0.35, PI, 0)
  } else if (f === 2 || f === 4) {
    // A crown, for the chapter's last sector.
    g.moveTo(-R, R * 0.5)
    g.lineTo(-R, -R * 0.4)
    g.lineTo(-R * 0.45, R * 0.05)
    g.lineTo(0, -R * 0.7)
    g.lineTo(R * 0.45, R * 0.05)
    g.lineTo(R, -R * 0.4)
    g.lineTo(R, R * 0.5)
    g.closePath()
  } else {
    // A five-pointed star.
    for (let i = 0; i < 10; i++) {
      const a = -PI / 2 + (i * PI) / 5
      const rr = i & 1 ? R * 0.45 : R
      if (i) g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
      else g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr)
    }
    g.closePath()
  }
  g.fill()
  g.stroke()
  g.restore()
}

/* ───────────────── the replay star (retention item 4) ────────────────── */
//
// A separate emblem from the badge above, and deliberately so: the badge says
// what the node IS (shut, yours, done) and hangs off its foot, while this
// says what the player DID and sits on the card's corner like a sticker
// pressed onto a page. Same five-pointed shape, because a child who has read
// the gold badge's star once should not have to learn a second symbol.
//
// Unearned it is drawn hollow and faint, on DONE cards only. That is not a
// scold — it is the only way a wordless game can say "there is one here",
// and a node still to be played never shows one at all, so nothing on the
// map ever reads as a list of things missed.

/** The star outline, centred on the origin, `r` across. */
const starPath = (g: G2D, r: number): void => {
  g.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = -PI / 2 + (i * PI) / 5
    const rr = i & 1 ? r * 0.44 : r
    if (i) g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
    else g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr)
  }
  g.closePath()
}

/**
 * The replay star, centred on the origin, `r` across. `earned` fills it gold
 * with the map's plum ink; otherwise it is the same outline, hollow and low
 * enough in contrast that it reads as a space waiting rather than a mark.
 */
export const paintStarSticker = (g: G2D, r: number, earned: boolean): void => {
  g.save()
  if (earned) {
    // A soft halo, so a gold star still separates from a cream card.
    const halo = g.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 1.9)
    halo.addColorStop(0, 'rgba(255, 246, 200, 0.85)')
    halo.addColorStop(1, 'rgba(255, 246, 200, 0)')
    g.fillStyle = halo
    g.fillRect(-r * 2, -r * 2, r * 4, r * 4)
    starPath(g, r)
    g.fillStyle = '#ffd76a'
    g.fill()
    g.lineWidth = Math.max(1.5, r * 0.22)
    g.strokeStyle = '#3A2340'
    g.stroke()
  } else {
    starPath(g, r)
    g.lineWidth = Math.max(1.2, r * 0.18)
    g.strokeStyle = 'rgba(58, 35, 64, 0.32)'
    g.stroke()
  }
  g.restore()
}

/** The bench's handle on it: five panels, drawn at `s` = the badge's radius. */
export const BADGE_ART: ItemSpec = {
  kind: 'worldUi',
  id: 'node-badge',
  frames: 5,
  draw: (g, s, f) => paintBadge(g, s, (f as BadgeFrame))
}
