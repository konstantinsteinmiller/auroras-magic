/**
 * brand.ts — the game's MARK and its MASCOT, drawn with the game's own
 * painters (art-style.md §11; `art-generation-pipeline` Phase 1).
 *
 * Both are references first. The pipeline's rule is that a painter handed only
 * words paints *a* unicorn game and a painter handed the game's own drawing
 * paints *this* one, so neither picture is described from scratch: the mascot
 * is the duel rig itself (`drawUnicorn`), posed and placed here, and the mark
 * frames the same rig's head over the world's own rainbow. What the image
 * model then replaces is the RENDERING — the flat cel fills and the even
 * contour — never the layout, the proportions or the palette.
 *
 * They differ from every other family in the manifest in one way, and it is
 * worth being plain about it: **nothing falls back to these drawings**. A
 * missing sector painting means the sector paints itself; a missing mark means
 * the splash simply has no mark. So they are read as plain files by the DOM
 * (`/images/brand/…`) rather than through `spriteFor`, and these painters exist
 * to make the reference and to be the A/B, not to stand in at runtime.
 *
 * NO LETTERING, in either. The game's name is live i18n text the splash draws
 * over the mark (`t('gameName')`), because a title painted into a bitmap is an
 * English title in twenty-one locales — and because an image model asked for
 * letters returns letters that are nearly words.
 */
import { drawUnicorn, RIG_HEIGHT } from '@/game/duel/chars'
import { guardianOf } from '@/game/duel/foes'
import { EMOTE_FACE } from '@/game/story/portrait'
import { miniRainbow } from '@/game/map/kitRidge'
import { PI, TAU, cos, sin } from '@/game/duel/util'
import type { ItemSpec } from '@/game/artItem'

type G2D = CanvasRenderingContext2D

/** Umbra's palette — the same index her dialogue portrait asks for, so the
 *  mascot's Umbra and the story's Umbra are one character. */
const UMBRA_FOE = guardianOf(9)

/* ────────────────────────────────────────────────────────────── the mark ── */

/**
 * The mark's ground: the splash's own lilac, a shade lighter.
 *
 * The mark sits ON the splash (and on `index.html`'s static copy of it), and a
 * square of some other hue there would read as a card from another game pasted
 * onto the screen. In the same family it reads as what it is — the app tile,
 * sitting on the app's own background. As an icon on a home screen the square
 * IS the shape, and this is `manifest.json`'s `theme_color` family too.
 */
const SKY_LIT = '#C6ADE8'
const SKY_DEEP = '#6E52A0'

/** One four-point sparkle — a slim star, the shape the world's magic uses. */
const sparkle = (g: G2D, x: number, y: number, r: number, a: number): void => {
  g.save()
  g.translate(x, y)
  g.globalAlpha = a
  g.beginPath()
  for (let i = 0; i < 4; i++) {
    const t = (i * TAU) / 4
    const n = t + TAU / 8
    g.lineTo(cos(t) * r, sin(t) * r)
    g.quadraticCurveTo(cos(n) * r * 0.14, sin(n) * r * 0.14, cos(n) * r * 0.2, sin(n) * r * 0.2)
  }
  g.closePath()
  g.fillStyle = '#FFF6E4'
  g.fill()
  g.restore()
}

/**
 * The mark, full-bleed into a square of side `S`.
 *
 * Three layers and nothing else, because a mark is read at 48 px on a tab
 * strip as often as at 512 on a home screen (art-style.md §8.1): a warm sky,
 * the world's rainbow rising behind, and Aurora's head big enough to carry the
 * whole silhouette on its own — the horn is the one thing that still reads
 * when everything else has gone to mush.
 */
export const paintLogoMark = (g: G2D, S: number): void => {
  const sky = g.createRadialGradient(S * 0.5, S * 0.4, S * 0.04, S * 0.5, S * 0.46, S * 0.82)
  sky.addColorStop(0, SKY_LIT)
  sky.addColorStop(1, SKY_DEEP)
  g.fillStyle = sky
  g.fillRect(0, 0, S, S)

  // The rainbow, rising from behind her and running off the square's own
  // edges — an arc that fits politely inside the tile reads as a sticker, and
  // one whose legs STOP inside it reads as a flag. Centred below the bottom
  // edge and wider than the tile, so both legs leave through the bottom
  // corners and the crown is hidden behind her head: what is left is two
  // bands sweeping up past her on either side.
  g.save()
  miniRainbow(g, S * 0.5, S * 1.0, S * 0.66, S * 0.04, PI, TAU, 6)
  g.restore()

  // A handful of sparkles, none of them in the outer eighth: every store crops
  // an icon to a shape nobody warned you about, and a rounded mask eats the
  // corners first.
  for (const [x, y, r, a] of [
    [0.20, 0.22, 0.045, 0.9], [0.83, 0.17, 0.032, 0.75], [0.87, 0.45, 0.022, 0.6],
    [0.15, 0.52, 0.026, 0.55], [0.72, 0.72, 0.02, 0.45]
  ] as const) sparkle(g, S * x, S * y, S * r, a)

  // Her head, BIG — and the rest of her simply off the bottom of the square.
  //
  // A dialogue badge gets its bust by clipping the rig to a circle; a
  // full-bleed tile has no clip, so the crop is done by placing the rig so
  // that only the head is inside the frame. The three numbers are measured off
  // the rig rather than reasoned about: at one px per rig unit the head group
  // (horn tip to chin) is ~96 units tall, its centre sits ~27 units right of
  // the rig's origin, and the origin is the hooves — 197 units below the horn.
  //
  // Why a head and not the whole unicorn: this file is read at 32 px on a tab
  // strip more often than at 512 on a home screen, and a whole chibi unicorn
  // at 32 px is a cream smudge. The horn and the ear tips are the only things
  // that survive, and they are all head (art-style.md §8.1).
  //
  // The horn tip starts a fourteenth of the way down rather than hard against
  // the top edge: iOS crops an icon to a squircle and Android to a circle, and
  // the horn is the one part of the silhouette that cannot be spared.
  const HEAD_SPAN = S * 0.78 / 96 // px per rig unit: the head fills four fifths
  g.save()
  g.translate(S * 0.5 - 27 * HEAD_SPAN, S * 0.07 + 197 * HEAD_SPAN)
  g.scale(HEAD_SPAN, HEAD_SPAN)
  drawUnicorn(g, 0, 0, -1, { face: EMOTE_FACE.happy, onKey: true }, 1.3)
  g.restore()
}

/* ──────────────────────────────────────────────────────────── the mascot ── */

/**
 * How far apart the two stand, measured from each rig's own origin, in rig
 * units (a rig is `RIG_HEIGHT` = 197 tall and ~130 wide, so ±108 leaves about
 * 78 units of clear magenta between the two muzzles).
 *
 * Far enough that neither silhouette touches the other — two chibi unicorns
 * whose muzzles overlap read as one strange animal at splash size — and close
 * enough that the gap is a look rather than a corridor. It is also what keeps
 * the PAIR narrower than 16:9: wider, and `ITEM_FILL` scales the sheet by its
 * width instead of its height and both of them come back a quarter smaller.
 */
const APART = 108

/**
 * Aurora and Umbra, standing on nothing, looking at each other.
 *
 * `side` is the whole of "looking at each other": the rig is authored facing
 * +x, and `-1` leaves Aurora facing right while `+1` mirrors Umbra to face
 * left, exactly as the duel stands them. Their faces are the two the story
 * gives them when they are being friendly rather than fighting — Aurora open
 * and delighted, Umbra warm and a little caught out — because this picture is
 * the game's handshake, not its fight.
 *
 * `onKey` is load-bearing, not tidiness: it drops the rig's contact shadow and
 * Umbra's dread aura, both of which would land on the magenta as a DARKER
 * magenta the slicer's key cannot cut, and ship as a pink smear welded under
 * the pair (`chars.ts`'s `PoseState.onKey`).
 */
export const MASCOT_ART: ItemSpec = {
  kind: 'brand',
  id: 'mascot',
  frames: 1,
  // `s` is px per unit, and one unit here is A UNICORN TALL — so the box this
  // measures out is ~2.6 wide by ~1.15 high whatever size it is asked for.
  draw: (g: G2D, s: number): void => {
    g.save()
    g.scale(s / RIG_HEIGHT, s / RIG_HEIGHT)
    drawUnicorn(g, -APART, 0, -1, { face: EMOTE_FACE.happy, onKey: true }, 1.3)
    drawUnicorn(g, APART, 0, 1, { face: EMOTE_FACE.warmBlush, foe: UMBRA_FOE, onKey: true }, 1.3)
    g.restore()
  }
}
