/**
 * artDraw.ts — the bench's side of the manifest (art-generation-pipeline,
 * S6): for every sheet `artSheet.ts` names, the GAME'S OWN painter that draws
 * its reference, and the lattice it is drawn on. Dev only: imported by the
 * `/art-sheets` bench and the `/playground`, never by the game.
 *
 * The lattice is the contract. An item panel holds the drawing's BOX
 * (`artItem.itemBox`) scaled to `ITEM_FILL` of the panel and centred in it;
 * the slicer cuts exactly that box back out (`crop`, in `sheet-index.json`),
 * and the renderer blits the painting into exactly that box. A rune panel IS
 * the `RuneGlyph` 100-unit box.
 */
import {
  ITEM_SHEETS, RUNE_SHEETS, KEEPSAKE_SHEETS, PORTRAIT_SHEETS, ISLAND_SHEETS, WORLD_UI_SHEETS, PROP_SHEETS, CREATURE_SHEETS, RIG_SHEETS,
  WARDROBE_ITEM_SHEETS, BRAND_MASCOT_SHEET, ITEM_FILL, itemSheetSize, sheetCols, SECTOR_REF,
  type BrandSheet, type Fit, type ItemSheet, type PageSheet, type SectorSheet, type StorySheet, type WardrobeSheet
} from '@/game/artSheet'
import { MOVIE_ICON, HP_FRAMES, type ItemName, type PropName, type CreatureName, type RigPart } from '@/game/artIds'
import { HP_FRAME_ART } from '@/game/duel/hpFrame'
import { itemBox, type ItemSpec } from '@/game/artItem'
import type { ArtBox } from '@/game/artBox'
import { NEUTRAL } from '@/game/artTint'
import {
  GIFT_ART, BOX_GIFT_ART, CHEST_ART, SPONGE_ART, ERASER_ART, SUNBEAM_ART, SUNBEAM_RAYS_ART, TWIN_GIFT_ART
} from '@/game/restore/gift'
import { POT_ART, PAINT_BLOB_ART } from '@/game/restore/potArt'
import { EMBLEM_ART } from '@/game/restore/emblem'
import { TENT_ART } from '@/game/map/tent'
import { CROWN_ART, PET_STAR_ART, PEGASUS_WING_ART, NECKLACE_SHELL_ART, SCARF_WRAP_ART } from '@/game/cosmetics/rig-cosmetics'
import {
  ACORN_CAP_ART, STAR_TIARA_ART, GOGGLES_ART, BOW_TIE_ART, MOON_PENDANT_ART, FLUTTER_ART, BEDROLL_ART, SATCHEL_ART,
  PET_CLOUD_ART, PET_FIREFLY_ART
} from '@/game/cosmetics/rig-accessories'
import { sectorOf, MOSS_SPRITE_ART } from '@/game/map/sectors'
import { drawGlyph } from '@/game/duel/glyph'
import { SEC_W, SEC_H } from '@/game/restore/mask'
import { CALF_ART, FALLEN_STAR_ART, PLANET_ART } from '@/game/map/kitSummit'
import { PORTRAIT_ART } from '@/game/story/portrait'
import { islandArt } from '@/game/duel/arena'
import { BARREL_ART, NECK_ART, HEAD_ART, EAR_ART, HORN_ART } from '@/game/duel/chars'
import { WARD_ART } from '@/game/duel/fx'
import { FROST_LOCK_ICE_ART } from '@/game/duel/stageArt'
import { KEEPSAKE_ART } from '@/game/cosmetics/icons'
import { BADGE_ART } from '@/game/map/badge'
import { GLOVE_ART } from '@/game/map/glove'
import { BOOK_BOARD_ART } from '@/game/map/bookBoard'
import { DOM_ART } from '@/game/domArt'
import { PICTO_SET_ART } from '@/components/story/pictoArt'
import {
  BUTTERFLY_ART, DUCK_ART, SAILS_ART, WATERWHEEL_ART, TWINKLE_ART, PUFF_ART, MOTE_ART, BUBBLE_ART,
  FLAG_ART, LANTERN_ART, BEE_ART, SWING_SEAT_ART, STREAK_ART, WATERFALL_ART, setRefInk,
  HOLLOW_LOG_ART, MOSS_BED_ART
} from '@/game/map/kit'
import { GULL_ART, CRAB_ART, FISH_ART, BOAT_ART, BUOY_ART, KELP_ART, SEA_FOAL_ART, SHELL_ART, BUBBLE_RING_ART } from '@/game/map/kitBay'
import {
  DOVE_ART, PENNANT_ART, MINI_BALLOON_ART, KITE_ART, PINWHEEL_ART, FLYER_ART, HEART_ART, STAR_ART, VANE_ART,
  PEGASUS_ART, KITE_BOW_ART, SLEEP_Z_ART
} from '@/game/map/kitSky'
import { SWALLOW_ART, WINDSOCK_ART, CHARM_ART, RAINBOW_ARC_ART, RAINBOW_FOAL_ART, PRISM_PETAL_ART } from '@/game/map/kitRidge'
import {
  CAVE_LANTERN_ART, CANOE_ART, MINECART_ART, CART_WHEEL_ART, WORM_ART, CLEAR_SHARD_ART, ROCK_NEST_ART, CANOE_POLE_ART
} from '@/game/map/kitCaves'
import { SNOWFLAKE_ART, HARE_ART, FROST_SHARD_ART, ICE_BLOCK_ART, SNOWBALL_ART } from '@/game/map/kitTundra'
import {
  BALLOON_ART, CONFETTI_ART, NOTE_ART, GONDOLA_ART, SPRIG_ART, CAROUSEL_DRUM_ART, CAROUSEL_HORSE_ART
} from '@/game/map/kitFestival'
import { FROND_ART, COCONUT_ART, FLAME_ART, FOX_ART, SAND_CLOCK_ART, GNOMON_ART } from '@/game/map/kitSands'
import { CABIN_ART, MIRROR_SPRITE_ART, MENDED_SHARD_ART, GLASS_CHIP_ART } from '@/game/map/kitMirror'
import { BUNNY_ART, FLOWER_HEAD_ART } from '@/game/map/bloom'
import { BOOKMARK_ART } from '@/game/flow/pageTurn'
import { renderIntroPanel } from '@/game/story/intro'
import { pageDecorBake } from '@/game/map/pageDecor'
import { PAGE_WASH, paintFrontPage, paintCloth } from '@/game/map/map'
import { RUG_ART, paintWardrobeRoom } from '@/game/cosmetics/wardrobe'
import { MASCOT_ART, paintLogoMark } from '@/game/brand'

type G2D = CanvasRenderingContext2D

export const ITEM_SPECS: Readonly<Record<ItemName, ItemSpec>> = {
  gift: GIFT_ART,
  boxGift: BOX_GIFT_ART,
  chest: CHEST_ART,
  sponge: SPONGE_ART,
  eraser: ERASER_ART,
  tent: TENT_ART,
  crown: CROWN_ART,
  petStar: PET_STAR_ART,
  pegasusWing: PEGASUS_WING_ART,
  seashell: NECKLACE_SHELL_ART,
  scarfWrap: SCARF_WRAP_ART,
  acornCap: ACORN_CAP_ART,
  starTiara: STAR_TIARA_ART,
  goggles: GOGGLES_ART,
  bowTie: BOW_TIE_ART,
  moonPendant: MOON_PENDANT_ART,
  butterflyWing: FLUTTER_ART,
  packBedroll: BEDROLL_ART,
  packSatchel: SATCHEL_ART,
  petCloud: PET_CLOUD_ART,
  petFirefly: PET_FIREFLY_ART,
  sunbeam: SUNBEAM_ART,
  sunbeamRays: SUNBEAM_RAYS_ART,
  paintPot: POT_ART,
  paintBlob: PAINT_BLOB_ART,
  twinGift: TWIN_GIFT_ART,
  emblemWard: EMBLEM_ART[0]!,
  emblemFrost: EMBLEM_ART[1]!
}

/** The live props a transform carries (`artSheet.PROP_SHEETS`). */
export const PROP_SPECS: Readonly<Record<PropName, ItemSpec>> = {
  butterfly: BUTTERFLY_ART,
  gull: GULL_ART,
  dove: DOVE_ART,
  duck: DUCK_ART,
  swallow: SWALLOW_ART,
  fish: FISH_ART,
  crab: CRAB_ART,
  sails: SAILS_ART,
  waterwheel: WATERWHEEL_ART,
  twinkle: TWINKLE_ART,
  pennant: PENNANT_ART,
  flag: FLAG_ART,
  mote: MOTE_ART,
  puff: PUFF_ART,
  lantern: LANTERN_ART,
  caveLantern: CAVE_LANTERN_ART,
  bubble: BUBBLE_ART,
  balloon: BALLOON_ART,
  snowflake: SNOWFLAKE_ART,
  confetti: CONFETTI_ART,
  miniBalloon: MINI_BALLOON_ART,
  boat: BOAT_ART,
  kite: KITE_ART,
  pinwheel: PINWHEEL_ART,
  note: NOTE_ART,
  bee: BEE_ART,
  windsock: WINDSOCK_ART,
  charm: CHARM_ART,
  frond: FROND_ART,
  coconuts: COCONUT_ART,
  flyer: FLYER_ART,
  buoy: BUOY_ART,
  canoe: CANOE_ART,
  mineCart: MINECART_ART,
  cartWheel: CART_WHEEL_ART,
  heart: HEART_ART,
  rainbowArc: RAINBOW_ARC_ART,
  swingSeat: SWING_SEAT_ART,
  cabin: CABIN_ART,
  star: STAR_ART,
  kelp: KELP_ART,
  flame: FLAME_ART,
  waterfall: WATERFALL_ART,
  streak: STREAK_ART,
  vane: VANE_ART,
  gondola: GONDOLA_ART,
  // The sectors' live layers (paint-outstanding, 2026-09-24).
  hollowLog: HOLLOW_LOG_ART,
  mossBed: MOSS_BED_ART,
  rockNest: ROCK_NEST_ART,
  iceBlock: ICE_BLOCK_ART,
  bunny: BUNNY_ART,
  flowerHead: FLOWER_HEAD_ART,
  carouselDrum: CAROUSEL_DRUM_ART,
  carouselHorse: CAROUSEL_HORSE_ART,
  gnomon: GNOMON_ART,
  planet: PLANET_ART,
  snowball: SNOWBALL_ART,
  kiteBow: KITE_BOW_ART,
  bubbleRing: BUBBLE_RING_ART,
  canoePole: CANOE_POLE_ART,
  glassChip: GLASS_CHIP_ART,
  sleepZ: SLEEP_Z_ART,
  // The duel's wards and Frost Lock's ice (paint-outstanding, 2026-09-24).
  wardWind: WARD_ART.wind,
  wardIce: WARD_ART.ice,
  wardRock: WARD_ART.rock,
  wardBubble: WARD_ART.bubble,
  wardCrystal: WARD_ART.crystal,
  wardFrost: WARD_ART.frost,
  frostLockIce: FROST_LOCK_ICE_ART
}

/** The creatures a restored sector gets back (`artSheet.CREATURE_SHEETS`). */
export const CREATURE_SPECS: Readonly<Record<CreatureName, ItemSpec>> = {
  mossSprite: MOSS_SPRITE_ART,
  seaFoal: SEA_FOAL_ART,
  singingShell: SHELL_ART,
  babyPegasus: PEGASUS_ART,
  glowworm: WORM_ART,
  clearShard: CLEAR_SHARD_ART,
  mirrorSprite: MIRROR_SPRITE_ART,
  mendedShard: MENDED_SHARD_ART,
  rainbowFoal: RAINBOW_FOAL_ART,
  prismPetal: PRISM_PETAL_ART,
  sandFox: FOX_ART,
  sandClock: SAND_CLOCK_ART,
  snowHare: HARE_ART,
  frostShard: FROST_SHARD_ART,
  starCalf: CALF_ART,
  fallenStar: FALLEN_STAR_ART,
  sprig: SPRIG_ART
}

/** The duelists' own parts (`artSheet.RIG_SHEETS`). */
export const RIG_SPECS: Readonly<Record<RigPart, ItemSpec>> = {
  barrel: BARREL_ART,
  neck: NECK_ART,
  head: HEAD_ART,
  ear: EAR_ART,
  horn: HORN_ART
}

/**
 * The rewarded-ad button's MOVIE CAMERA (`artIds.MOVIE_ICON`).
 *
 * The one reference in the catalogue with no game painter behind it: on screen
 * the button shows the shared `video` glyph (`iconPaths.ts`) until a painting
 * exists, so this is drawn here, on that glyph's own layout — a rounded body
 * with a flared lens on its right — plus the two film reels on top that make
 * it read as a MOVIE camera rather than a video call at 24 px, and a play
 * sign. Plum body, cream reels, gold play: dark against light inside the icon,
 * because it sits on the gold rewarded button AND on cream paper.
 *
 * Drawn in the glyph's 24-unit box around its centre, `s / 12` px per box
 * unit, so the whole icon spans about ±1 unit — well inside `measureBox`.
 */
const MOVIE_ICON_ART: ItemSpec = {
  kind: MOVIE_ICON.kind,
  id: MOVIE_ICON.id,
  frames: 1,
  draw: (g, s) => {
    const INK = '#3A2340'
    g.save()
    g.scale(s / 12, s / 12)
    g.translate(-12, -12)
    g.lineJoin = 'round'
    g.lineCap = 'round'
    g.lineWidth = 0.8
    g.strokeStyle = INK
    const disc = (x: number, y: number, r: number, fill: string, stroke = true): void => {
      g.beginPath()
      g.arc(x, y, r, 0, Math.PI * 2)
      g.fillStyle = fill
      g.fill()
      if (stroke) g.stroke()
    }
    // The reels first: the body overlaps their lower edge. Three holes round
    // the hub, or a cream disc with a dark middle is an EYE, and the painter
    // gives the camera a face.
    for (const [x, y, r, a] of [[6.2, 6.4, 3.3, 0.3], [12.2, 6.0, 3.6, 1.1]] as const) {
      disc(x, y, r, '#FFF3DC')
      disc(x, y, r * 0.2, '#6A4A94', false)
      for (let k = 0; k < 3; k++) {
        const t = a + (k * Math.PI * 2) / 3
        disc(x + Math.cos(t) * r * 0.55, y + Math.sin(t) * r * 0.55, r * 0.17, '#B79FD6', false)
      }
    }
    // The lens hood, flaring out to the right.
    g.beginPath()
    g.moveTo(15.2, 12.6)
    g.lineTo(21.2, 10.4)
    g.quadraticCurveTo(22.2, 10.1, 22.2, 11.2)
    g.lineTo(22.2, 18.8)
    g.quadraticCurveTo(22.2, 19.9, 21.2, 19.6)
    g.lineTo(15.2, 17.4)
    g.closePath()
    g.fillStyle = '#563A7E'
    g.fill()
    g.stroke()
    // The body: a soft rounded box, lighter along its top where the light lands.
    const body = (): void => {
      g.beginPath()
      g.roundRect(2.2, 9.2, 13.6, 11.2, 2.8)
    }
    body()
    g.fillStyle = '#6A4A94'
    g.fill()
    g.save()
    body()
    g.clip()
    g.fillStyle = '#8A6BB8'
    g.fillRect(2.2, 9.2, 13.6, 3.2)
    g.restore()
    body()
    g.stroke()
    // The play sign, pointing the way the lens does.
    g.beginPath()
    g.moveTo(7.0, 12.3)
    g.lineTo(12.0, 14.8)
    g.lineTo(7.0, 17.3)
    g.closePath()
    g.fillStyle = '#FFC93F'
    g.fill()
    g.lineWidth = 0.5
    g.stroke()
    g.restore()
  }
}

/**
 * The book's own furniture and the DOM's painted chrome, by id
 * (`WORLD_UI_SHEETS`). The two HP frames are drawn by `hpFrame.ts` from the
 * same paths the bar's drawn frame is made of, so the painter is shown the
 * exact layout the game lays the painting on — with the track left a hole.
 */
const WORLD_UI_SPECS: Readonly<Record<string, ItemSpec>> = {
  'node-badge': BADGE_ART,
  bookmark: BOOKMARK_ART,
  [MOVIE_ICON.id]: MOVIE_ICON_ART,
  [HP_FRAMES.aurora.id]: HP_FRAME_ART.aurora,
  [HP_FRAMES.foe.id]: HP_FRAME_ART.foe,
  // The 2026-09-24 paint-outstanding pass (map & UI): the show-how glove and
  // the book's board from their game painters, the DOM's marks from
  // `domArt.ts`, and the four pictogram sets from `Picto.vue`'s own paths.
  [GLOVE_ART.id]: GLOVE_ART,
  [BOOK_BOARD_ART.id]: BOOK_BOARD_ART,
  ...DOM_ART,
  ...Object.fromEntries(PICTO_SET_ART.map((s) => [s.id, s]))
}

/** `RuneGlyph.vue`'s box: 100 units around a glyph of radius 30, in units of R. */
const RUNE_BOX: ArtBox = { x: -50 / 30, y: -50 / 30, w: 100 / 30, h: 100 / 30 }

const runeOf = (sheet: ItemSheet): number => Number(String(sheet.name).split(':')[1])

/** The spec behind any keyed sheet: an item, a rune, a keepsake badge, a
 *  portrait strip or an island — each the game's own drawing of it. */
export const specOf = (sheet: ItemSheet): ItemSpec => {
  if (sheet.kind === 'rune') return { kind: 'rune', id: sheet.id, frames: 1, draw: (g, s) => drawGlyph(g, runeOf(sheet), 0, 0, s, 1, 1) }
  const [family, key] = String(sheet.name).split(':') as [string, string | undefined]
  if (family === 'portrait') return PORTRAIT_ART[key!]!
  if (family === 'island') return islandArt(Number(key))
  if (family === 'keepsake') return KEEPSAKE_ART[key!]!
  if (family === 'worldUi') return WORLD_UI_SPECS[key!]!
  if (family === 'prop') return PROP_SPECS[key as PropName]!
  if (family === 'creature') return CREATURE_SPECS[key as CreatureName]!
  if (family === 'rig') return RIG_SPECS[key as RigPart]!
  if (family === 'wardrobe') return RUG_ART
  if (family === 'brand') return MASCOT_ART
  return ITEM_SPECS[sheet.name as ItemName]
}

export interface Layout {
  w: number
  h: number
  frames: number
  /** The lattice: `cols` panels a row, `rows` rows (`ItemSheet.rows`); one
   *  row for every sheet that does not ask. Panel `f` is at column
   *  `f % cols`, row `floor(f / cols)`. */
  cols: number
  rows: number
  panelW: number
  panelH: number
  /** Pixels per unit of the drawing's scale. */
  k: number
  /** The box, in one panel's pixels — what the slicer cuts out. */
  crop: { x: number; y: number; w: number; h: number }
  /** The drawing's origin, in one panel's pixels. */
  ox: number
  oy: number
}

export const layoutOf = (sheet: ItemSheet): Layout => {
  // A sheet may carry a canvas of its own (`ItemSheet.canvas`) when neither
  // default aspect fits its subject — the mascot is one wide panel, and a
  // square would spend two thirds of the return on magenta.
  const { w, h, panelW, panelH } = sheet.canvas
    ? { w: sheet.canvas.w * sheet.frames, h: sheet.canvas.h, panelW: sheet.canvas.w, panelH: sheet.canvas.h }
    : itemSheetSize(sheet.frames, sheet.rows)
  const rows = sheet.canvas ? 1 : sheet.rows ?? 1
  const cols = sheet.canvas ? sheet.frames : sheetCols(sheet)
  const box = sheet.kind === 'rune' ? RUNE_BOX : itemBox(specOf(sheet))
  const k = sheet.kind === 'rune'
    ? panelW / box.w
    : ITEM_FILL * Math.min(panelW / box.w, panelH / box.h)
  const cw = box.w * k
  const ch = box.h * k
  const cx = (panelW - cw) / 2
  const cy = (panelH - ch) / 2
  return {
    w, h, frames: sheet.frames, cols, rows, panelW, panelH, k,
    crop: { x: Math.round(cx), y: Math.round(cy), w: Math.round(cw), h: Math.round(ch) },
    ox: cx - box.x * k,
    oy: cy - box.y * k
  }
}

const canvasOf = (w: number, h: number): [HTMLCanvasElement, G2D] => {
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  return [cv, cv.getContext('2d', { willReadFrequently: true })!]
}

/** Draw panel `f` of `sheet` at its place on the lattice. */
const drawPanel = (g: G2D, sheet: ItemSheet, L: Layout, f: number): void => {
  g.save()
  g.translate((f % L.cols) * L.panelW + L.ox, Math.floor(f / L.cols) * L.panelH + L.oy)
  specOf(sheet).draw(g, L.k, f, NEUTRAL)
  g.restore()
}

/**
 * How much of the kit's contour a CREATURE's reference keeps (`kit.setRefInk`).
 *
 * The creatures are the one family whose reference is a single inked FIGURE
 * filling its panel, and three returns running traced that ink back as an even
 * contour — the sticker look the style exists to stop. Thinned to a guide, the
 * shapes and their overlaps still say exactly where a line belongs, and the
 * painter has nothing uniform to copy. Not zero: a creature is shown about the
 * size of a thumb and its silhouette still has to read.
 */
const CREATURE_REF_INK = 0.4

/**
 * Every stroke made on reference canvas `g` at `k` × its width — for a
 * drawing that strokes its own lines rather than the kit's `ink`. The canvas
 * is the bench's own and thrown away after, so nothing is put back.
 */
const thinStrokes = (g: G2D, k: number): void => {
  const stroke = g.stroke.bind(g)
  g.stroke = ((path?: Path2D): void => {
    const w = g.lineWidth
    g.lineWidth = w * k
    if (path) stroke(path)
    else stroke()
    g.lineWidth = w
  }) as typeof g.stroke
}

/** The reference: every panel on flat magenta, no gutters, no captions. */
export const renderItemSheet = (sheet: ItemSheet, ground: string | null = '#ff00ff'): HTMLCanvasElement => {
  const L = layoutOf(sheet)
  const [cv, g] = canvasOf(L.w, L.h)
  if (ground) {
    g.fillStyle = ground
    g.fillRect(0, 0, L.w, L.h)
  }
  // Around the panels only, and always put back — the game draws through the
  // very same `ink`, and a leaked scale would thin every sector on the map.
  // Any sheet whose painting came back as a trace says so itself
  // (`ItemSheet.refInk`); a creature keeps its family's thinning.
  const refInk = sheet.refInk ?? (sheet.kind === 'creature' ? CREATURE_REF_INK : 1)
  // Props and the pictogram sets thin through the kit's `ink`, which is how
  // their references were cut (2026-09-25). A gift, a chest, a phone or a
  // shelf badge strokes its OWN lines and never meets `ink` — for those every
  // stroke on this canvas is thinned instead (2026-09-26).
  const ownLines = sheet.refInk !== undefined && sheet.kind !== 'prop' && !sheet.set
  if (refInk !== 1 && !ownLines) setRefInk(refInk)
  if (ownLines) thinStrokes(g, refInk)
  try {
    for (let f = 0; f < L.frames; f++) drawPanel(g, sheet, L, f)
  } finally {
    setRefInk(1)
  }
  return cv
}

/**
 * The fit the slicer registers a return against: the drawing's SOLID extent
 * (α > 140, so a soft glow is light rather than size), measured on a
 * transparent render — the magenta sheet has no alpha to measure — as
 * fractions of one panel, the union over every panel.
 */
export const measureFit = (sheet: ItemSheet): Fit => {
  const L = layoutOf(sheet)
  const cv = renderItemSheet(sheet, null)
  const d = cv.getContext('2d')!.getImageData(0, 0, L.w, L.h).data
  let x0 = L.panelW, y0 = L.panelH, x1 = -1, y1 = -1
  const top = new Array<number>(L.frames).fill(L.panelH)
  const bot = new Array<number>(L.frames).fill(-1)
  for (let y = 0; y < L.rows * L.panelH; y++) {
    for (let x = 0; x < L.cols * L.panelW; x++) {
      if (d[(y * L.w + x) * 4 + 3]! <= 140) continue
      const col = Math.floor(x / L.panelW)
      const row = Math.floor(y / L.panelH)
      const f = row * L.cols + col
      if (f >= L.frames) continue
      const px = x - col * L.panelW
      const py = y - row * L.panelH
      if (px < x0) x0 = px
      if (px > x1) x1 = px
      if (py < y0) y0 = py
      if (py > y1) y1 = py
      if (py < top[f]!) top[f] = py
      if (py > bot[f]!) bot[f] = py
    }
  }
  if (x1 < 0) return { h: 0, w: 0, bottom: 0, cx: 0.5 }
  const r = (v: number): number => Math.round(v * 1000) / 1000
  return {
    h: r((y1 - y0 + 1) / L.panelH),
    w: r((x1 - x0 + 1) / L.panelW),
    bottom: r((y1 + 1) / L.panelH),
    cx: r((x0 + x1 + 1) / 2 / L.panelW),
    ...(L.frames > 1 ? { ph: top.map((t, f) => r((bot[f]! - t + 1) / L.panelH)) } : {})
  }
}

/**
 * The key: the reference, faded, with each panel's moment written under it.
 * Captions never go on the reference itself — an image model paints text it
 * is shown.
 */
export const renderKeySheet = (sheet: ItemSheet): HTMLCanvasElement => {
  const L = layoutOf(sheet)
  const [cv, g] = canvasOf(L.w, L.h + 120)
  g.fillStyle = '#ffffff'
  g.fillRect(0, 0, cv.width, cv.height)
  g.globalAlpha = 0.5
  g.drawImage(renderItemSheet(sheet), 0, 0)
  g.globalAlpha = 1
  g.strokeStyle = '#3A2340'
  g.lineWidth = 2
  g.fillStyle = '#3A2340'
  g.font = 'bold 26px system-ui, sans-serif'
  g.textAlign = 'center'
  for (let f = 0; f < L.frames; f++) {
    const x = (f % L.cols) * L.panelW
    const y = Math.floor(f / L.cols) * L.panelH
    g.strokeRect(x + 1, y + 1, L.panelW - 2, (L.rows > 1 ? L.panelH : L.h) - 2)
    const text = (sheet.panels[f] ?? '').replace(/^Panel \d+:\s*/, '').split(/[.—]/)[0]!.trim()
    // One row: under the sheet, as always. A grid: inside the foot of its cell.
    g.fillText(`${f + 1} · ${text}`, x + L.panelW / 2, L.rows > 1 ? y + L.panelH - 18 : L.h + 70)
  }
  return cv
}

/** A sector's reference: its static painting at 1:1, landmark neutral. */
/**
 * A context that draws the same picture in SOFT ink — for reference sheets
 * only, never for the game.
 *
 * Three rounds of prompt wording failed to stop returns coming back with a
 * hard dark line round every shape, most stubbornly round CLOUDS, which have
 * no edge in life at all. It was never going to yield to words: the reference
 * IS a line drawing, and a painter shown a line draws a line. The front page
 * had the same problem and it was fixed by not drawing the line in the
 * reference. This is that fix for every sector.
 *
 * Done by INTERCEPTING THE CONTEXT rather than by editing the kits. There are
 * some 270 places that set a stroke colour across ten kit files and several
 * private helpers that never go through `ink()` at all — `kitSky.inkFill`
 * strokes at DOUBLE width and is why Cloud Kingdom came back the most heavily
 * outlined chapter of the ten. A rule applied at the seam cannot be missed by
 * one of them.
 *
 * Softened, not removed: the reference still has to show where one shape ends
 * and the next begins. A white cloud on a pale sky with no edge at all is a
 * shape the painter cannot see, and an unseen shape is one that gets left out
 * — a trap this project has already paid for once.
 */
const INK_SOFT = 'rgba(70,52,78,0.2)'
/** How much of a drawn line survives into a reference sheet. */
const REF_INK = 0.4
/** Is this colour dark enough to be ink rather than paint? */
const isInk = (v: string): boolean => {
  const h = v.trim().toLowerCase()
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(h)
  if (!m) return false
  const d = m[1]!
  const [r, g, b] = d.length === 3
    ? [d[0]! + d[0]!, d[1]! + d[1]!, d[2]! + d[2]!]
    : [d.slice(0, 2), d.slice(2, 4), d.slice(4, 6)]
  // Rec. 601 luma, 0..255. Every ink in the kits sits under 60; the darkest
  // colour that is genuinely PAINT (a tree trunk, a rock) sits well above it.
  return (0.299 * parseInt(r!, 16) + 0.587 * parseInt(g!, 16) + 0.114 * parseInt(b!, 16)) < 62
}
const softInk = (g: G2D): G2D => new Proxy(g, {
  get(t, k) {
    const v = Reflect.get(t, k) as unknown
    return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(t) : v
  },
  set(t, k, v) {
    let out = v
    if ((k === 'strokeStyle' || k === 'fillStyle') && typeof v === 'string' && isInk(v)) out = INK_SOFT
    else if (k === 'lineWidth' && typeof v === 'number') out = v * REF_INK
    return Reflect.set(t, k, out)
  }
}) as G2D

export const renderSectorSheet = (s: SectorSheet): HTMLCanvasElement => {
  const [cv, g] = canvasOf(SECTOR_REF.w, SECTOR_REF.h)
  g.setTransform(SECTOR_REF.w / SEC_W, 0, 0, SECTOR_REF.h / SEC_H, 0, 0)
  sectorOf(s.node).paint(softInk(g), { id: 'neutral', ...NEUTRAL })
  return cv
}

/** An intro page's reference: its beat at the key moment, 1:1, no live layer. */
export const renderStorySheet = (s: StorySheet): HTMLCanvasElement => renderIntroPanel(s.panel - 1, SECTOR_REF.w)

/**
 * A chapter page's reference: the paper, its marginalia and its biome wash,
 * with NO beat cards on it.
 *
 * `keepOut` is empty on purpose. On a real page the marginalia is
 * rejection-sampled away from the five cards; here there are no cards to
 * avoid, so the sheet shows the motifs spread over the whole page and the
 * painter sees the full vocabulary. The cards are opaque and drawn on top at
 * runtime, so whatever ends up beneath one is simply never seen.
 */
export const renderPageSheet = (s: PageSheet): HTMLCanvasElement => {
  // The CLOTH is a surface: the same gradient the map lays behind the book.
  if (s.chapter === -2) {
    const [cv, g] = canvasOf(s.w, s.h)
    paintCloth(g, s.w, s.h)
    return cv
  }
  // The FRONT page is a picture, not paper: its own painter draws it, and
  // Aurora and the tent are left off exactly as they are in the game.
  if (s.chapter < 0) {
    const [cv, g] = canvasOf(s.w, s.h)
    paintFrontPage(g, 0, 0, s.w, s.h, s.w / 1548, true)
    return cv
  }
  const [cv, g] = canvasOf(s.w, s.h)
  // The card the page is printed on (map.ts's `drawCard`), under the bake.
  g.fillStyle = '#fff4e6'
  g.fillRect(0, 0, s.w, s.h)
  const wash = PAGE_WASH[s.chapter] ?? PAGE_WASH[0]!
  const ground = s.portrait ? s.w * 0.2 : s.h * 0.62
  g.drawImage(pageDecorBake(s.w, s.h, s.chapter, true, s.portrait, wash, [], ground), 0, 0, s.w, s.h)
  return cv
}

/**
 * The wardrobe room's reference: the tent as the game draws it, with its
 * floor line at the fraction the renderer will blit it back to.
 *
 * Nothing in the diorama that moves is in here — not Aurora, not her rug, not
 * the corner shadow, not the bulbs' pulse. The painter draws exactly what a
 * painting can hold, which is why there is no `forRef` gate on any of them.
 */
export const renderWardrobeSheet = (s: WardrobeSheet): HTMLCanvasElement => {
  const [cv, g] = canvasOf(s.w, s.h)
  paintWardrobeRoom(g, 0, 0, s.w, s.h, s.h * s.floor, true)
  return cv
}

/**
 * The MARK's reference: opaque and full-bleed like a book page, because an app
 * icon is its own ground (`brand.ts`).
 *
 * The MASCOT has no painter here — it is a keyed one-panel sheet like any
 * other item, so `specOf` hands it to `MASCOT_ART` and the shared lattice
 * draws it.
 */
export const renderBrandSheet = (s: BrandSheet): HTMLCanvasElement => {
  const [cv, g] = canvasOf(s.w, s.h)
  paintLogoMark(g, s.w)
  return cv
}

export const ALL_ITEM_SHEETS: readonly ItemSheet[] = [
  ...ITEM_SHEETS, ...WORLD_UI_SHEETS, ...KEEPSAKE_SHEETS, ...PROP_SHEETS, ...CREATURE_SHEETS, ...RIG_SHEETS, ...WARDROBE_ITEM_SHEETS, ...RUNE_SHEETS,
  ...PORTRAIT_SHEETS, ...ISLAND_SHEETS, BRAND_MASCOT_SHEET
]
