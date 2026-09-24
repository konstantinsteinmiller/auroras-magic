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
import { drawItem, itemBox, type ItemSpec } from '@/game/artItem'
import { spriteFor } from '@/game/art'
import { STAR_ART } from '@/game/map/kitSky'
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
    // The earned star is the shared painted five-point star, tinted gold,
    // once it has landed; the halo behind it is light and stays drawn. The
    // hollow one below is a faint outline — a space, not a shape — and stays.
    if (!drawItem(g, STAR_ART, r, 0, '#ffd76a')) {
      starPath(g, r)
      g.fillStyle = '#ffd76a'
      g.fill()
      g.lineWidth = Math.max(1.5, r * 0.22)
      g.strokeStyle = '#3A2340'
      g.stroke()
    }
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

/* ─────────────────── the painted badge, seated on its node ─────────────────
 *
 * THE PAINTER DID NOT SPACE THE FIVE DISCS A FIFTH APART (2026-09-23). They
 * came back ~7 px of a 196 px panel closer together than the lattice, so each
 * one drifts across its own panel: the padlock sits 7 % of the box right of
 * centre, the NEXT star 3.6 % right, the NEXT crown dead centre, the gold star
 * and crown 3 % and 7 % left. The strip is registered as ONE picture, so
 * nothing in the pipeline could see it — but the breathing ring is drawn
 * round the node's true centre, and a star button sitting off-centre in its
 * own attention ring is the first thing the eye finds. The discs also came
 * back ~8 % smaller than the drawing, which widened the ring's gap all round.
 *
 * So each panel's disc is MEASURED once, when the strip decodes, and the
 * painting is moved and scaled so that disc lands exactly where the drawn one
 * was: centred on the node, the drawn disc's size. A repaint that fixes the
 * spacing measures as centred and is left alone.
 */

/** The drawn disc's outer edge — the radius plus half its ink ring — in
 *  units of `r` (`paintBadge` strokes it `4 * r / 28` wide). */
const DRAWN_OUTER = 1 + 2 / 28

/** How to seat one panel's painted disc: the offset of its centre from the
 *  origin and the scale that makes it the drawn disc's size (units of `r`). */
interface DiscFit { dx: number; dy: number; k: number }
const discFits = new WeakMap<HTMLImageElement, readonly (DiscFit | null)[] | null>()

/** Each panel's solid disc (α > 128, so the soft rim is light, not size). */
const measureDiscs = (img: HTMLImageElement): readonly (DiscFit | null)[] | null => {
  const W = img.naturalWidth
  const H = img.naturalHeight
  if (!W || !H) return null
  try {
    const cv = document.createElement('canvas')
    cv.width = W
    cv.height = H
    const c = cv.getContext('2d', { willReadFrequently: true })
    if (!c) return null
    c.drawImage(img, 0, 0)
    const d = c.getImageData(0, 0, W, H).data
    const box = itemBox(BADGE_ART)
    const n = BADGE_ART.frames
    const fw = W / n
    const out: (DiscFit | null)[] = []
    for (let f = 0; f < n; f++) {
      const xa = Math.round(f * fw)
      const xb = Math.round((f + 1) * fw)
      let x0 = xb, y0 = H, x1 = -1, y1 = -1
      for (let y = 0; y < H; y++) {
        for (let x = xa; x < xb; x++) {
          if (d[(y * W + x) * 4 + 3]! <= 128) continue
          if (x < x0) x0 = x
          if (x > x1) x1 = x
          if (y < y0) y0 = y
          if (y > y1) y1 = y
        }
      }
      if (x1 < 0) {
        out.push(null)
        continue
      }
      // Panel pixels → the box `drawItem` blits the panel into, units of r.
      const ux = box.w / fw
      const uy = box.h / H
      const outer = ((x1 - x0 + 1) * ux + (y1 - y0 + 1) * uy) / 4
      out.push({
        dx: box.x + ((x0 + x1 + 1) / 2 - f * fw) * ux,
        dy: box.y + ((y0 + y1 + 1) / 2) * uy,
        k: DRAWN_OUTER / outer
      })
    }
    return out
  } catch {
    // An undecoded or tainted strip: blit it as it comes.
    return null
  }
}

/** Panel `f`'s seat, or null when there is no painting (or no measure). */
const discFit = (f: BadgeFrame): DiscFit | null => {
  const img = spriteFor(BADGE_ART.kind, BADGE_ART.id)
  if (!img) return null
  let fits = discFits.get(img)
  if (fits === undefined) {
    fits = measureDiscs(img)
    discFits.set(img, fits)
  }
  return fits?.[f] ?? null
}

/**
 * One badge centred on the origin, `r` its radius — painted when the strip
 * has decoded, with its disc seated on the origin (see above), and drawn
 * otherwise. Either way the disc's edge is where `paintBadge`'s is, so a ring
 * drawn round the origin at `r + gap` is concentric with it.
 */
export const drawBadge = (g: G2D, r: number, f: BadgeFrame): void => {
  const fit = discFit(f)
  g.save()
  if (fit) {
    g.scale(fit.k, fit.k)
    g.translate(-fit.dx * r, -fit.dy * r)
  }
  const painted = drawItem(g, BADGE_ART, r, f)
  g.restore()
  if (!painted) paintBadge(g, r, f)
}

