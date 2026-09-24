/**
 * icons.ts — shelf thumbnails for the wardrobe's items: each item's own draw
 * function, baked once onto a small badge and handed to the DOM as a data
 * URL (the chrome owns no canvas, §4.1.4). Also the ghost silhouettes of the
 * keepsakes still to find, and the Mane Color Palette's eight swatches —
 * each a colour disc WITH its own micro-glyph, so no swatch is told apart
 * by hue alone (§3.11).
 *
 * PAINTED (§8.27): the badges drawn for the shelf alone
 * (`KEEPSAKE_ICON_SLUGS`) each have a painting,
 * `images/cosmetics/keepsake-<slug>.webp`, blitted into the badge's own box
 * (`KEEPSAKE_ART`). The ghost of one still to find is cut from the painting
 * the same way as from the drawing. Every other badge draws the keepsake's
 * own WORN function, which paints itself (`KEEPSAKE_WORN_ART`): the crown and
 * the star since S6, the second shelf's hats, bow, pendant, wings, pack and
 * companions since 2026-09-24 — and their sparkles and bubbles are the
 * sectors' painted twinkle and bubble, tinted.
 */
import { ref } from 'vue'
import {
  drawFlowerCrown, drawSeashellNecklace, drawWingsFar, drawWingsNear, drawScarfAt, drawStarBody,
  sparklePath, MANE_SWATCHES, UMBRA_LOOK, PASTEL_DREAM, type SwatchGlyph
} from '@/game/cosmetics/rig-cosmetics'
import {
  drawAcornCap, drawStarTiara, drawExplorerGoggles, drawBowTie, drawMoonPendant,
  drawFlutterFar, drawFlutterNear, drawExplorerPackFar, drawExplorerPackNear,
  drawPetCloud, drawPetFirefly, MOONLIT_LOOK, SUNSET_LOOK, TRAIL_STYLES, particleArt
} from '@/game/cosmetics/rig-accessories'
import { COSMETIC_SLOTS, type CosmeticSlot } from '@/game/campaign/tables'
import { drawUnicorn, type Face, type RigAnchors } from '@/game/duel/chars'
import type { FoePalette } from '@/game/duel/foes'
import { TAU, PI, sin, cos } from '@/game/duel/util'
import { onArtChanged, withoutArt } from '@/game/art'
import { drawItem, type ItemSpec } from '@/game/artItem'
import { KEEPSAKE_ICON_SLUGS, KEEPSAKE_WORN_ART, keepsakeArtId } from '@/game/artIds'
import { TWINKLE_ART } from '@/game/map/kit'

type G2D = CanvasRenderingContext2D

const INK = '#3A2340'

/** A stand-in pose for items that hang off the body, framed for a badge. */
const BADGE_ANCHORS: RigAnchors = {
  neckCollar: [0, -8],
  neckDir: [0.55, -0.83],
  backWithers: [14, 16],
  tailBase: [-26, 30],
  t: 0.6,
  lift: 0,
  lose: 0,
  facing: 1,
  hoofFront: [0, 0],
  hoofHind: [0, 0],
  tailStage: [0, 0],
  bodyStage: [0, 0],
  headStage: [0, 0],
  portrait: true
}

/** The same, with the neck upright, so a necklace hangs level. */
const NECK_UP: RigAnchors = { ...BADGE_ANCHORS, neckDir: [0, -1] }

const HAPPY: Face = { brow: 0.25, eye: 1, mouth: 1, blush: 0.3 }

/**
 * The badge's own pixel space (128 × 128), wherever the badge is being drawn:
 * the shelf's 128 px canvas, or the bench's big reference. The painters below
 * that work in badge pixels return to it through here rather than to the
 * identity, so the same drawing can be drawn at any size.
 */
let badgeBase: DOMMatrix | null = null
const badgeSpace = (g: G2D): void => {
  if (badgeBase) g.setTransform(badgeBase)
  else g.setTransform(1, 0, 0, 1, 0, 0)
}

/** Aurora's head in a skin, on a round badge of its own (badge pixels). */
const headIn = (g: G2D, skin: FoePalette, back: string): void => {
  badgeSpace(g)
  g.save()
  g.beginPath()
  g.arc(64, 64, 56, 0, TAU)
  g.fillStyle = back
  g.fill()
  g.clip()
  const s = 0.95
  g.translate(64 - 18 * s, 66 + 128 * s)
  g.scale(s, s)
  drawUnicorn(g, 0, 0, -1, { face: HAPPY, skin }, 1.3)
  g.restore()
  g.beginPath()
  g.arc(64, 64, 56, 0, TAU)
  g.lineWidth = 5
  g.strokeStyle = INK
  g.stroke()
}

/** A few sparkles in badge pixels. */
const sparkles = (g: G2D, pts: readonly (readonly number[])[], fill: string): void => {
  g.beginPath()
  for (const [x, y, r] of pts) sparklePath(g, x!, y!, r!, 0.4)
  g.lineJoin = 'round'
  g.lineWidth = 3
  g.strokeStyle = INK
  g.stroke()
  g.fillStyle = fill
  g.fill()
}

/** The same sparkles as a KEEPSAKE shows them: the sectors' painted twinkle,
 *  tinted, once it has landed. (The slot tabs keep `sparkles` — they are
 *  deliberately flatter than a badge.) */
const twinkles = (g: G2D, pts: readonly (readonly number[])[], fill: string): void => {
  const rest = pts.filter(([x, y, r]) => !particleArt(g, TWINKLE_ART, x!, y!, r!, 0.4, fill))
  if (rest.length) sparkles(g, rest, fill)
}

const DRAW: Readonly<Record<string, (g: G2D) => void>> = {
  // Head-space items are framed around the crown's middle, near (1, -19).
  flowerCrown: drawFlowerCrown,
  seashellNecklace: (g) => {
    g.translate(1, -28)
    g.scale(1.6, 1.6)
    drawSeashellNecklace(g, NECK_UP)
  },
  pegasusWings: (g) => {
    g.translate(12, -2)
    g.scale(0.56, 0.56)
    drawWingsFar(g, BADGE_ANCHORS)
    drawWingsNear(g, BADGE_ANCHORS)
  },
  // The rest draw in badge pixels (128 × 128).
  hoofTrailVfx: (g) => {
    badgeSpace(g)
    g.lineJoin = g.lineCap = 'round'
    // A chunky little leg with a fluffy fetlock and its hoof, bottom right…
    g.beginPath()
    g.moveTo(76, 2)
    g.lineTo(108, 2)
    g.lineTo(98, 70)
    g.lineTo(74, 70)
    g.closePath()
    g.lineWidth = 7
    g.strokeStyle = INK
    g.stroke()
    g.fillStyle = '#fff1d6'
    g.fill()
    g.beginPath()
    g.moveTo(66, 76)
    g.lineTo(102, 76)
    g.lineTo(110, 104)
    g.lineTo(60, 104)
    g.closePath()
    g.lineWidth = 7
    g.stroke()
    g.fillStyle = '#d79a52'
    g.fill()
    g.beginPath()
    g.ellipse(86, 72, 19, 9, -0.08, 0, TAU)
    g.lineWidth = 6
    g.stroke()
    g.fillStyle = '#fff1d6'
    g.fill()
    // …and the sparkles streaming up and away from it, like a comet's tail.
    sparkles(g, [[46, 100, 12.5], [22, 44, 8]], '#fff09a')
    sparkles(g, [[28, 76, 10], [34, 18, 6.5]], '#ffb3da')
    sparkles(g, [[50, 60, 7.5], [10, 100, 6.5]], '#a6e4ff')
  },
  umbraSkin: (g) => headIn(g, UMBRA_LOOK, '#e6dcff'),
  pastelTheme: (g) => {
    headIn(g, PASTEL_DREAM, '#d6f1ff')
    sparkles(g, [[22, 30, 9]], '#ffb3de')
    sparkles(g, [[108, 96, 8]], '#b4f2dc')
    sparkles(g, [[104, 26, 7]], '#d9c2ff')
  },
  colorPicker: (g) => {
    // An artist's palette with a thumb hole and five dabs of paint.
    badgeSpace(g)
    g.lineJoin = g.lineCap = 'round'
    g.save()
    g.translate(64, 66)
    g.rotate(-0.25)
    g.beginPath()
    g.moveTo(-52, 4)
    g.bezierCurveTo(-56, -40, 10, -58, 44, -34)
    g.bezierCurveTo(66, -18, 58, 18, 36, 24)
    g.bezierCurveTo(20, 28, 22, 42, 6, 48)
    g.bezierCurveTo(-26, 58, -50, 36, -52, 4)
    g.closePath()
    g.lineWidth = 6
    g.strokeStyle = INK
    g.stroke()
    g.fillStyle = '#ffe3b5'
    g.fill()
    g.beginPath()
    g.ellipse(22, 8, 9, 7, 0.3, 0, TAU)
    g.fillStyle = '#ffffff'
    g.fill()
    g.lineWidth = 4
    g.stroke()
    const dabs: readonly (readonly [number, number, string])[] = [
      [-32, -2, '#c7a6ff'], [-24, -30, '#8fe8c6'], [4, -38, '#9fd8ff'], [32, -24, '#ff9ecf'], [-12, 28, '#ff9466']
    ]
    for (const [x, y, c] of dabs) {
      g.beginPath()
      g.arc(x, y, 10.5, 0, TAU)
      g.lineWidth = 4
      g.stroke()
      g.fillStyle = c
      g.fill()
      g.beginPath()
      g.arc(x - 3, y - 3.5, 3, 0, TAU)
      g.fillStyle = 'rgba(255,255,255,0.7)'
      g.fill()
    }
    g.restore()
  },
  winterScarf: (g) => {
    badgeSpace(g)
    g.translate(54, 30)
    g.scale(1.8, 1.8)
    drawScarfAt(g, 0, 0, 1, 0, 0.35, 0)
  },
  petStar: (g) => {
    badgeSpace(g)
    twinkles(g, [[20, 100, 9], [108, 22, 7]], '#fff4b8')
    g.translate(62, 68)
    g.rotate(-0.12)
    drawStarBody(g, 46, false, false)
  },

  /* --------------------------- the second shelf --------------------------- */
  // Every badge below draws the item's OWN function — the same code the rig
  // runs — rather than a second picture of it, so a shelf tile can never
  // drift away from what she is about to put on.

  // Head space, re-centred on the badge: `centreHead` puts the item's middle
  // where the crown's is and fills the tile with it.
  acornCap: (g) => centreHead(g, -9, -17, 1.7, drawAcornCap),
  starTiara: (g) => centreHead(g, 1, -25, 1.5, drawStarTiara),
  explorerGoggles: (g) => centreHead(g, 0, -22, 1.6, drawExplorerGoggles),
  bowTie: (g) => {
    g.translate(1, -30)
    g.scale(1.9, 1.9)
    drawBowTie(g, NECK_UP)
  },
  moonPendant: (g) => {
    g.translate(0, -51)
    g.scale(2, 2)
    drawMoonPendant(g, NECK_UP)
  },
  butterflyWings: (g) => {
    g.translate(12, -2)
    g.scale(0.56, 0.56)
    drawFlutterFar(g, BADGE_ANCHORS)
    drawFlutterNear(g, BADGE_ANCHORS)
  },
  // The satchel is the item; the bedroll is the detail. Framed on the bag,
  // because a badge framed on both came back as a picture of a green log.
  explorerPack: (g) => {
    g.translate(6.8, -39.8)
    g.scale(0.62, 0.62)
    drawExplorerPackFar(g, BADGE_ANCHORS)
    drawExplorerPackNear(g, BADGE_ANCHORS)
  },
  // Stage-space companions: the anchors are chosen so the float curve lands
  // the creature on the badge's middle at t = 0.6.
  petCloud: (g) => {
    badgeSpace(g)
    zoomBadge(g, 2.1)
    drawPetCloud(g, { ...BADGE_ANCHORS, portrait: false, t: 0.6, tailStage: [78, 110] })
  },
  petFirefly: (g) => {
    badgeSpace(g)
    zoomBadge(g, 2.4)
    drawPetFirefly(g, { ...BADGE_ANCHORS, portrait: false, t: 0.6, bodyStage: [26, 75] })
  },
  petalTrail: (g) => trailBadge(g, 'petalTrail'),
  frostTrail: (g) => trailBadge(g, 'frostTrail'),
  bubbleTrail: (g) => trailBadge(g, 'bubbleTrail'),
  moonlitLook: (g) => headIn(g, MOONLIT_LOOK, '#e2ecff'),
  sunsetLook: (g) => headIn(g, SUNSET_LOOK, '#ffe4cc')
}

/** Draw a head-space item with its own middle (hx, hy) on the badge's. */
const centreHead = (g: G2D, hx: number, hy: number, k: number, draw: (g: G2D) => void): void => {
  g.translate(1, -19)
  g.scale(k, k)
  g.translate(-hx, -hy)
  draw(g)
}

/** Scale about the badge's middle, in badge pixels. */
const zoomBadge = (g: G2D, k: number): void => {
  g.translate(64, 64)
  g.scale(k, k)
  g.translate(-64, -64)
}

/**
 * A trail's badge: a rising cluster of its own shape in its own colours,
 * biggest at the bottom — the comet's tail the Sparkly Hoof-trail's badge
 * makes out of sparkles, made out of petals, flakes or bubbles instead.
 */
const TRAIL_PTS: readonly (readonly [number, number, number])[] = [
  [40, 96, 17], [72, 74, 13], [30, 52, 11], [86, 36, 9.5], [56, 22, 7.5], [100, 96, 8]
]
const trailBadge = (g: G2D, slug: string): void => {
  const st = TRAIL_STYLES[slug]
  if (!st) return
  badgeSpace(g)
  g.lineJoin = 'round'
  g.globalAlpha = st.alpha
  for (let c = 0; c < st.cols.length; c++) {
    g.beginPath()
    let any = false
    for (let i = 0; i < TRAIL_PTS.length; i++) {
      if (i % st.cols.length !== c) continue
      const [x, y, r] = TRAIL_PTS[i]!
      // The trail's own painted particle, when it has one (the bubbles).
      if (st.art && particleArt(g, st.art, x, y, r, st.artSpins ? i * 0.8 : 0, st.cols[c]!)) continue
      st.shape(g, x, y, r, i * 0.8)
      any = true
    }
    if (!any) continue
    g.lineWidth = 4
    g.strokeStyle = INK
    g.stroke()
    g.fillStyle = st.cols[c]!
    g.fill()
  }
  g.globalAlpha = 1
}

const cache = new Map<string, string>()

/** Draw `draw` as a badge, in the current transform's badge pixels. */
const drawBadge = (g: G2D, draw: (g: G2D) => void): void => {
  badgeBase = g.getTransform()
  g.save()
  // Items are authored in the rig's head space; the crown's middle sits near
  // (1, -19) and spans ~50 units. Centre it on the badge.
  g.translate(64 - 2.4, 64 + 19 * 2.4)
  g.scale(2.4, 2.4)
  draw(g)
  g.restore()
  badgeBase = null
}

/**
 * The shelf badges drawn for the shelf alone, as painted drawables (§8.27):
 * the whole badge, centred on the origin at scale `s` = the badge's width.
 * What the bench renders the reference from, and the box the painting is
 * blitted into.
 *
 * ALWAYS THE DRAWING (`withoutArt`): a badge draws the keepsake's own worn
 * function, and that function now paints itself — so without this a bench
 * with the art layer on would put last week's wing painting (or the rig's
 * painted head, in a look's badge) into this week's reference.
 */
export const KEEPSAKE_ART: Readonly<Record<string, ItemSpec>> = Object.fromEntries(KEEPSAKE_ICON_SLUGS.map((slug) => [slug, {
  kind: 'cosmetic' as const,
  id: keepsakeArtId(slug),
  frames: 1,
  draw: (g: G2D, s: number) => withoutArt(() => {
    g.save()
    g.scale(s / 128, s / 128)
    g.translate(-64, -64)
    drawBadge(g, DRAW[slug]!)
    g.restore()
  })
}]))

/**
 * The paintings a drawn badge can be made of besides its own: the worn stills
 * and the sectors' props the keepsakes route through, and the rig (a look's
 * badge is her head). Any of them landing re-bakes the shelf.
 */
const BADGE_PARTS: ReadonlySet<string> = new Set(
  Object.values(KEEPSAKE_WORN_ART).flat().map((a) => `${a.kind}/${a.id}`)
)

/** Bumped when a keepsake painting decodes: the shelf re-reads its badges. */
export const iconArtRev = ref(0)
onArtChanged((c) => {
  if (c && c.kind !== 'cosmetic' && c.kind !== 'rig' && !BADGE_PARTS.has(`${c.kind}/${c.id}`)) return
  cache.clear()
  iconArtRev.value++
})

/** Bake `slug`'s badge onto a fresh 128 px canvas: its painting, or its drawing. */
const bake = (slug: string, draw: (g: G2D) => void, ghost: boolean): string => {
  const cv = document.createElement('canvas')
  cv.width = cv.height = 128
  const g = cv.getContext('2d')
  if (!g) return ''
  const spec = KEEPSAKE_ART[slug]
  let painted = false
  if (spec) {
    g.save()
    g.translate(64, 64)
    painted = drawItem(g, spec, 128)
    g.restore()
  }
  if (!painted) drawBadge(g, draw)
  if (ghost) {
    // The keepsake still to find: its silhouette only (the ghost outline).
    badgeSpace(g)
    g.globalCompositeOperation = 'source-in'
    g.fillStyle = INK
    g.fillRect(0, 0, 128, 128)
  }
  return cv.toDataURL()
}

export const itemIconUrl = (slug: string, ghost = false): string => {
  void iconArtRev.value
  const key = ghost ? `ghost:${slug}` : slug
  const hit = cache.get(key)
  if (hit) return hit
  if (typeof document === 'undefined') return ''
  const draw = DRAW[slug]
  if (!draw) return ''
  const url = bake(slug, draw, ghost)
  if (url) cache.set(key, url)
  return url
}

/* ------------------------------ slot tabs ----------------------------- */
/*
 * The shelf holds 23 keepsakes now, which is three times what a 3 × 3 grid
 * ever fitted — so the shelf is a row of SLOT tabs over the one slot's
 * items. A tab is a place on her, not an item: a crown band for the head, a
 * cord for the neck, a wing for the back. Deliberately flatter and quieter
 * than an item badge (one ink line, one accent), because a tab that looks
 * like a keepsake gets tapped as one.
 *
 * Zero-text, like everything else in this scene (§8.2): the tab's name is
 * its `aria-label`, read aloud, never printed.
 */

/** Stroke then fill the current path, in the tab's flat style. */
const tabInk = (g: G2D, fill: string, w = 7): void => {
  g.lineJoin = g.lineCap = 'round'
  g.lineWidth = w
  g.strokeStyle = INK
  g.stroke()
  g.fillStyle = fill
  g.fill()
}

const SLOT_DRAW: Readonly<Record<CosmeticSlot, (g: G2D) => void>> = {
  // A crown band with three points: the place on her head, not any one hat.
  head: (g) => {
    g.beginPath()
    g.moveTo(18, 86)
    g.lineTo(28, 40)
    g.lineTo(48, 62)
    g.lineTo(64, 28)
    g.lineTo(80, 62)
    g.lineTo(100, 40)
    g.lineTo(110, 86)
    g.closePath()
    tabInk(g, '#ffd36b')
  },
  // A cord round a throat, with one bead hanging off it.
  neck: (g) => {
    g.beginPath()
    g.moveTo(24, 34)
    g.quadraticCurveTo(64, 96, 104, 34)
    g.lineWidth = 8
    g.strokeStyle = INK
    g.lineCap = 'round'
    g.stroke()
    g.beginPath()
    g.arc(64, 82, 15, 0, TAU)
    tabInk(g, '#9fd8ff')
  },
  // One wing, the way both back items root it.
  back: (g) => {
    g.beginPath()
    g.moveTo(96, 96)
    g.bezierCurveTo(70, 88, 34, 70, 24, 34)
    g.quadraticCurveTo(52, 44, 58, 30)
    g.quadraticCurveTo(70, 56, 84, 56)
    g.quadraticCurveTo(84, 76, 96, 96)
    g.closePath()
    tabInk(g, '#e2d6fa')
  },
  // A little friend: a star with a face, which every companion is.
  companion: (g) => {
    g.beginPath()
    for (let i = 0; i < 10; i++) {
      const a = -PI / 2 + (i * PI) / 5
      const r = i & 1 ? 20 : 46
      const x = 64 + cos(a) * r
      const y = 64 + sin(a) * r
      if (i) g.lineTo(x, y)
      else g.moveTo(x, y)
    }
    g.closePath()
    tabInk(g, '#ffd84a')
    g.beginPath()
    for (const ex of [54, 76]) {
      g.moveTo(ex + 4, 58)
      g.arc(ex, 58, 4, 0, TAU)
    }
    g.fillStyle = INK
    g.fill()
  },
  // What she leaves behind her: three specks on a rising diagonal.
  trail: (g) => {
    sparkles(g, [[36, 96, 18], [70, 62, 13], [98, 32, 9]], '#fff09a')
  },
  // A lock of hair: three strands with a wave in them.
  mane: (g) => {
    g.lineJoin = g.lineCap = 'round'
    for (const [x, col] of [[38, '#fc3'], [64, '#ffd36b'], [90, '#fc3']] as const) {
      g.beginPath()
      g.moveTo(x, 22)
      g.bezierCurveTo(x - 20, 52, x + 20, 76, x - 6, 106)
      g.lineWidth = 15
      g.strokeStyle = INK
      g.stroke()
      g.lineWidth = 8
      g.strokeStyle = col
      g.stroke()
    }
  },
  // Her coat itself: one disc, two coats — which is the whole choice here.
  skin: (g) => {
    g.beginPath()
    g.arc(64, 64, 42, -PI / 2, PI / 2)
    g.closePath()
    g.fillStyle = '#3c4aa6'
    g.fill()
    g.beginPath()
    g.arc(64, 64, 42, PI / 2, -PI / 2)
    g.closePath()
    g.fillStyle = '#ffeecc'
    g.fill()
    g.beginPath()
    g.arc(64, 64, 42, 0, TAU)
    g.moveTo(64, 22)
    g.lineTo(64, 106)
    g.lineWidth = 7
    g.strokeStyle = INK
    g.stroke()
  }
}

/** Bake one 128 px glyph to a data URL, once, under `key`. */
const glyphUrl = (key: string, draw: (g: G2D) => void): string => {
  void iconArtRev.value
  const hit = cache.get(key)
  if (hit) return hit
  if (typeof document === 'undefined') return ''
  const cv = document.createElement('canvas')
  cv.width = cv.height = 128
  const g = cv.getContext('2d')
  if (!g) return ''
  draw(g)
  const url = cv.toDataURL()
  cache.set(key, url)
  return url
}

/** A slot tab's glyph, as a data URL (baked once, like the item badges). */
export const slotIconUrl = (slot: CosmeticSlot): string => glyphUrl(`slot:${slot}`, SLOT_DRAW[slot])

/* --------------------------- the tent's two pages --------------------- */
/*
 * The wardrobe tent holds two things now (retention item 3): the shelf she is
 * dressed from, and the album her stickers and photo cards live in. Their
 * tabs are drawn in the same flat, one-ink style as the slot tabs above and
 * for the same reason — a tab that looks like a keepsake gets tapped as one —
 * and they carry no text at all, only an `aria-label` (§8.2).
 */

/** The shelf: a coat hanger, which is what a wardrobe looks like from across
 *  a room, at every age and in every language. */
const dressTab = (g: G2D): void => {
  g.lineJoin = g.lineCap = 'round'
  g.beginPath()
  g.moveTo(64, 46)
  g.quadraticCurveTo(64, 26, 50, 26)
  g.quadraticCurveTo(38, 26, 38, 38)
  g.lineWidth = 8
  g.strokeStyle = INK
  g.stroke()
  g.beginPath()
  g.moveTo(64, 44)
  g.lineTo(18, 88)
  g.lineTo(110, 88)
  g.closePath()
  tabInk(g, '#ffd36b')
}

/** The album: a page with four stickers stuck on it. */
const albumTab = (g: G2D): void => {
  g.lineJoin = g.lineCap = 'round'
  g.beginPath()
  g.roundRect(20, 18, 88, 94, 10)
  tabInk(g, '#fff6e2')
  const dots: readonly (readonly [number, number, string])[] = [
    [46, 44, '#ff9ecf'], [82, 44, '#9fd8ff'], [46, 84, '#9ff0d0'], [82, 84, '#c7a6ff']
  ]
  for (const [x, y, col] of dots) {
    g.beginPath()
    g.arc(x, y, 14, 0, TAU)
    tabInk(g, col, 5)
  }
}

const TAB_DRAW: Readonly<Record<'dress' | 'album', (g: G2D) => void>> = { dress: dressTab, album: albumTab }

/** One of the tent's two page tabs, as a data URL. */
export const tentTabUrl = (tab: 'dress' | 'album'): string => glyphUrl(`tent:${tab}`, TAB_DRAW[tab])

/** The album's "pose" button: a little camera. Never a share glyph — the card
 *  never leaves the device (item 16, Poki/Playables). */
export const poseIconUrl = (): string => glyphUrl('pose', (g) => {
  g.lineJoin = g.lineCap = 'round'
  g.beginPath()
  g.moveTo(44, 34)
  g.lineTo(84, 34)
  g.lineTo(90, 46)
  g.lineTo(38, 46)
  g.closePath()
  tabInk(g, '#ffb3da', 6)
  g.beginPath()
  g.roundRect(14, 42, 100, 70, 14)
  tabInk(g, '#9fd8ff')
  g.beginPath()
  g.arc(64, 78, 26, 0, TAU)
  tabInk(g, '#fff6e2', 6)
  g.beginPath()
  g.arc(64, 78, 11, 0, TAU)
  tabInk(g, '#ffd36b', 5)
})

/** Every slot, in shelf order — the tab strip. */
export const SLOT_TABS: readonly CosmeticSlot[] = COSMETIC_SLOTS

/* ------------------------------ swatches ------------------------------ */

/** Path one micro-glyph, centred on the origin, radius `r`. */
const glyphPath = (g: G2D, kind: SwatchGlyph, r: number): void => {
  g.beginPath()
  switch (kind) {
    case 'star':
      for (let i = 0; i < 10; i++) {
        const a = -PI / 2 + (i * PI) / 5
        const rr = i & 1 ? r * 0.46 : r
        if (i) g.lineTo(cos(a) * rr, sin(a) * rr)
        else g.moveTo(cos(a) * rr, sin(a) * rr)
      }
      g.closePath()
      break
    case 'flower':
      for (let i = 0; i < 5; i++) {
        const a = -PI / 2 + (i * TAU) / 5
        const px = cos(a) * r * 0.52
        const py = sin(a) * r * 0.52
        g.moveTo(px + r * 0.44, py)
        g.arc(px, py, r * 0.44, 0, TAU)
      }
      break
    case 'leaf':
      g.moveTo(-r * 0.72, r * 0.72)
      g.quadraticCurveTo(-r * 0.9, -r * 0.6, r * 0.78, -r * 0.78)
      g.quadraticCurveTo(r * 0.6, r * 0.9, -r * 0.72, r * 0.72)
      g.closePath()
      break
    case 'drop':
      g.moveTo(0, -r)
      g.quadraticCurveTo(r * 0.72, -r * 0.1, r * 0.66, r * 0.3)
      g.arc(0, r * 0.3, r * 0.66, 0, PI)
      g.quadraticCurveTo(-r * 0.72, -r * 0.1, 0, -r)
      g.closePath()
      break
    case 'heart':
      g.moveTo(0, r * 0.86)
      g.bezierCurveTo(-r * 1.25, r * 0.02, -r * 0.72, -r * 1.0, 0, -r * 0.42)
      g.bezierCurveTo(r * 0.72, -r * 1.0, r * 1.25, r * 0.02, 0, r * 0.86)
      g.closePath()
      break
    case 'dot':
      g.arc(0, 0, r * 0.6, 0, TAU)
      break
    case 'diamond':
      g.moveTo(0, -r)
      g.lineTo(r * 0.74, 0)
      g.lineTo(0, r)
      g.lineTo(-r * 0.74, 0)
      g.closePath()
      break
    case 'moon': {
      // A crescent: the outer circle's left side and a bite out of the right.
      const d = r * 0.45
      const ri = r * 0.72
      const x = (r * r - ri * ri + d * d) / (2 * d)
      const y = Math.sqrt(Math.max(0, r * r - x * x))
      const a = Math.atan2(y, x)
      const b = Math.atan2(y, x - d)
      g.arc(0, 0, r, a, TAU - a)
      g.arc(d, 0, ri, -b, b, true)
      g.closePath()
      break
    }
  }
}

/** The rainbow swatch's wedges (art-style §4.2's rainbow). */
const RAINBOW = ['#ff9ecf', '#ffb36b', '#ffe08a', '#9ff0d0', '#9fd8ff', '#c7a6ff'] as const

/**
 * Swatch `i` as a data URL: a disc of its mane colour with a lock of its
 * streak colour, and its micro-glyph in the middle. `own` is swatch 0's
 * colours (her mane under whatever skin she wears).
 */
export const swatchIconUrl = (i: number, own: readonly [string, string]): string => {
  const sw = MANE_SWATCHES[i]
  if (!sw) return ''
  const cols = sw.mane === 'rainbow' ? RAINBOW : sw.mane ?? own
  const key = `swatch:${i}:${cols.join(',')}`
  const hit = cache.get(key)
  if (hit) return hit
  if (typeof document === 'undefined') return ''
  const cv = document.createElement('canvas')
  cv.width = cv.height = 96
  const g = cv.getContext('2d')
  if (!g) return ''
  g.translate(48, 48)
  g.lineJoin = g.lineCap = 'round'
  const R = 42
  g.save()
  g.beginPath()
  g.arc(0, 0, R, 0, TAU)
  g.clip()
  if (sw.mane === 'rainbow') {
    for (let k = 0; k < RAINBOW.length; k++) {
      g.beginPath()
      g.moveTo(0, 0)
      g.arc(0, 0, R + 2, -PI / 2 + (k * TAU) / 6, -PI / 2 + ((k + 1) * TAU) / 6)
      g.closePath()
      g.fillStyle = RAINBOW[k]!
      g.fill()
    }
  } else {
    g.fillStyle = cols[0]!
    g.fillRect(-R, -R, R * 2, R * 2)
    // One soft lock of the streak colour sweeping across.
    g.beginPath()
    g.moveTo(-R, R * 0.2)
    g.quadraticCurveTo(-R * 0.1, -R * 0.55, R, -R * 0.35)
    g.lineWidth = 17
    g.strokeStyle = cols[1]!
    g.stroke()
  }
  g.restore()
  g.beginPath()
  g.arc(0, 0, R, 0, TAU)
  g.lineWidth = 5
  g.strokeStyle = INK
  g.stroke()
  // The micro-glyph: white with a plum outline, readable on every hue.
  glyphPath(g, sw.glyph, 19)
  g.lineWidth = 6
  g.strokeStyle = INK
  g.stroke()
  g.fillStyle = '#ffffff'
  g.fill()
  const url = cv.toDataURL()
  cache.set(key, url)
  return url
}
