/**
 * sectorsC4.ts — chapter 4, Crystal Caves (nodes 15–19; story-spec §10.2:
 * "The under-realm's crystals have shattered and gone dark", Guardian Terra).
 * Composed from `kit.ts` and `kitCaves.ts` against `sectorDef.ts`, like
 * chapters 1–3: far wall → far spires → icing-drip ceiling → rock → floor →
 * landmark → dressing. Underground is never dark here: periwinkle walls, an
 * orchid floor, glowing crystals and warm lanterns.
 *
 *   4-1 Glowshroom Grotto — the giant mushroom CAPS
 *   4-2 Crystal Lake      — the big crystal CLUSTER by the water
 *   4-3 Gem Mine          — the mine entrance's gable ROOF; the chapter's rescue,
 *                           the Shard of Clear Light, sleeps mid-sector
 *   4-4 Lantern Bridge    — the bridge house's ROOF over the (cozy) chasm
 *   4-5 Terra's Geode Hall — the boss sector (4× area): the giant open GEODE
 *
 * Every sector has the chapter's tap creature (§8.8): a glowworm peeking out
 * from behind a mossy rock, a crystal rock, a mine cart, two barrels or a
 * stalagmite, and lighting up one facet of the crystal beside it.
 */
import type { SectorDef, SectorAccent } from '@/game/map/sectorDef'
import { CAVE_POTS, fireflies, type G2D } from '@/game/map/kit'
import { sin, cos, TAU } from '@/game/duel/util'
import { type Pt, jetty } from '@/game/map/kitBay'
import { twinkles, skyPuff } from '@/game/map/kitSky'
import {
  CAVE, PINKC, AQUA, AMETHYST, GOLD, SAPPHIRE, CLUSTER, CLUSTER_SMALL, glow, caveBack, farSpires, farCrystals, ledge,
  rock, stalagmite, ceiling, ceilingY, caveFloor, groundPatch, moss, gems, gemHeap, crystal, cluster, clusterGeom, shroom,
  shroomSpots, lanternPost, lanternGlow, crate, barrel, rails, railAt, mineCart, caveLake, reflect, glowLily,
  canoe, giantShroom, mineMouth, mineLampOf, bridgeHouse, bridgeEaves, geode, throne, spores, drip, shimmer, swingLantern, lanternString,
  wormTap, clearShard
} from '@/game/map/kitCaves'

/** The chapter's gift ribbon and chest gem (§8.2): amethyst. */
export const C4_ACCENT: SectorAccent = { ribbon: '#b67bff', ribbonShade: '#8f55e0', gem: '#e0c4ff' }
export const C4_POTS = CAVE_POTS

const WARM = '255,236,170'
const TEAL = '140,255,230'
const PINK = '255,190,240'

/** A lantern's chain, hanging from the ceiling at (x, top) down to `y`. */
const chain = (g: G2D, x: number, top: number, y: number): void => {
  g.beginPath()
  g.moveTo(x, top)
  g.lineTo(x, y)
  g.lineWidth = 3
  g.strokeStyle = '#3A2340'
  g.setLineDash([7, 5])
  g.stroke()
  g.setLineDash([])
}

/* ── 4-1 · Glowshroom Grotto ──────────────────────────────────────────── */
const GROTTO_FLOOR: readonly Pt[] = [[-40, 506], [180, 494], [400, 512], [620, 522], [840, 508], [1000, 490], [1200, 476]]
const GROTTO_LAMPS: readonly Pt[] = [[640, 150], [846, 118]]
const grottoRock = (g: G2D): void => {
  rock(g, 930, 596, 180, 108, -1)
  moss(g, [[912, 498, 80]])
  cluster(g, 992, 566, 0.56, AQUA, CLUSTER_SMALL, false)
}
const grottoTap = wormTap(
  { x: 906, y: 520, dir: 1, s: 0.8, ground: 596, rise: 108, facet: clusterGeom(992, 566, 0.56, 2, CLUSTER_SMALL) },
  grottoRock
)
const BIG_SPOTS = shroomSpots(372, 548, 2.05, -0.1)

const glowshroomGrotto: SectorDef = {
  node: 15,
  rvu: 1,
  pots: CAVE_POTS,
  landmark: { x: 380, y: 318 },
  giftSpot: { x: 690, y: 620 },
  seed: 41,
  accent: C4_ACCENT,
  paint: (g, pot) => {
    caveBack(g, { glows: [[800, 380, 330, TEAL], [1040, 250, 220, WARM], [280, 430, 260, PINK]] })
    farSpires(g, 480, [[70, 100, 250], [250, 80, 170], [720, 120, 290], [890, 90, 200], [1100, 130, 300]])
    farCrystals(g, [[790, 480, 110, -0.25], [826, 480, 156, 0.05], [862, 480, 92, 0.4], [1030, 480, 104, -0.3], [150, 480, 90, 0.2]])
    ceiling(g, 44, 124, 151, 1, [[300, 460]])
    for (const [x, y] of GROTTO_LAMPS) chain(g, x, ceilingY(x, 44, 124), y)
    caveFloor(g, GROTTO_FLOOR, 152)
    // A mossy step at the back right with a few little glow-shrooms.
    ledge(g, [[870, 530], [896, 468], [980, 436], [1090, 424], [1200, 430], [1200, 530]], 153, [[896, 466], [980, 434], [1090, 422], [1200, 428]])
    shroom(g, 1040, 440, 0.42, PINKC, -0.2, 4)
    shroom(g, 1100, 446, 0.3, GOLD, 0.2, 3.5)
    // The landmark: three giant glow mushrooms.
    giantShroom(g, 150, 520, 1.05, pot, -0.35)
    giantShroom(g, 598, 530, 1.38, pot, 0.28)
    giantShroom(g, 372, 548, 2.05, pot, -0.1)
    cluster(g, 770, 530, 0.62, AMETHYST, CLUSTER, true)
    moss(g, [[250, 604, 170], [520, 590, 80], [1000, 660, 150]])
    grottoRock(g)
    shroom(g, 70, 640, 0.56, AQUA, -0.2, 4)
    shroom(g, 116, 662, 0.36, PINKC, 0.3, 3.5)
    shroom(g, 500, 626, 0.46, GOLD, 0.15, 4)
    shroom(g, 1100, 644, 0.52, PINKC, -0.15, 4)
    shroom(g, 1060, 668, 0.3, AQUA, 0.2, 3)
    gemHeap(g, 860, 548, 80, 3)
    gems(g, 154, 16, 548, 666, [[590, 540, 220, 140], [840, 520, 200, 150], [0, 560, 170, 120], [440, 560, 120, 90], [1020, 580, 140, 100]])
  },
  props: (g, t, alive) => {
    for (let i = 0; i < GROTTO_LAMPS.length; i++) swingLantern(g, GROTTO_LAMPS[i]![0], GROTTO_LAMPS[i]![1], 0.9 - i * 0.1, t, alive, i * 1.7)
    if (alive <= 0) return
    // The big cap's spots breathe with light.
    for (let i = 0; i < BIG_SPOTS.length; i++) {
      const [x, y, r] = BIG_SPOTS[i]!
      glow(g, x, y, r * 2.2, alive * (0.5 + 0.5 * sin(t * 1.8 + i * 1.3)), '#ffffff')
    }
    spores(g, 220, 110, 460, 250, t, alive)
    spores(g, 510, 230, 190, 170, t + 3, alive, '#fff6d8', 4)
    fireflies(g, 680, 170, 380, 230, t, alive)
    twinkles(g, [[826, 350, 10], [1004, 470, 9], [790, 400, 8], [150, 400, 8]], t, alive)
  },
  tap: grottoTap
}

/* ── 4-2 · Crystal Lake ───────────────────────────────────────────────── */
const LAKE_Y = 430
const LAKE_FLOOR: readonly Pt[] = [[-40, 574], [200, 584], [460, 594], [700, 588], [940, 576], [1200, 562]]
const LAKE_BIG = { x: 262, y: 404, s: 1.62 }
const lakeCover = (g: G2D): void => {
  rock(g, 950, 614, 172, 84, 1)
  cluster(g, 1002, 586, 0.54, PINKC, CLUSTER_SMALL, false)
}
const lakeTap = wormTap(
  { x: 926, y: 558, dir: 1, s: 0.72, ground: 612, rise: 96, facet: clusterGeom(1002, 586, 0.54, 2, CLUSTER_SMALL) },
  lakeCover
)
const DRIPS: readonly (readonly [number, number, number])[] = [[574, 150, 2.9], [704, 120, 3.7]]

const crystalLake: SectorDef = {
  node: 16,
  rvu: 1,
  pots: CAVE_POTS,
  landmark: { x: 262, y: 262 },
  giftSpot: { x: 560, y: 628 },
  seed: 42,
  accent: C4_ACCENT,
  paint: (g, pot) => {
    const T = [pot.base, pot.shade, pot.lite] as const
    caveBack(g, { glows: [[600, 420, 380, TEAL], [920, 300, 240, PINK], [120, 200, 200, WARM]] })
    farSpires(g, 420, [[500, 90, 210], [630, 70, 150], [860, 110, 260], [1030, 80, 180], [1130, 90, 230]])
    ceiling(g, 36, 110, 161, 1.35, [[150, 380]])
    // The far shore across the water, crystals twinkling on it.
    ledge(g, [[420, 452], [470, 408], [600, 392], [800, 400], [1000, 386], [1200, 378], [1200, 452]], 162, [[470, 406], [600, 390], [800, 398], [1000, 384], [1200, 376]])
    cluster(g, 700, 404, 0.46, AQUA, CLUSTER_SMALL, false)
    cluster(g, 1080, 392, 0.52, GOLD, CLUSTER_SMALL, false)
    caveLake(g, LAKE_Y, 16)
    // The big cluster's reflection, still on the water.
    reflect(g, 458, [0, LAKE_Y, 1152, 240], 0.32, () => cluster(g, LAKE_BIG.x, LAKE_BIG.y, LAKE_BIG.s, T, CLUSTER, false))
    reflect(g, 404, [420, LAKE_Y, 780, 200], 0.28, () => {
      cluster(g, 700, 404, 0.46, AQUA, CLUSTER_SMALL, false)
      cluster(g, 1080, 392, 0.52, GOLD, CLUSTER_SMALL, false)
    })
    // The promontory the landmark grows on.
    ledge(
      g,
      [[-40, 560], [-40, 300], [60, 318], [170, 360], [300, 392], [420, 424], [476, 470], [430, 500], [300, 516], [-40, 520]],
      163,
      [[-40, 298], [60, 316], [170, 358], [300, 390], [420, 422], [470, 464]]
    )
    cluster(g, LAKE_BIG.x, LAKE_BIG.y, LAKE_BIG.s, T, CLUSTER, false)
    cluster(g, 410, 430, 0.44, AMETHYST, CLUSTER_SMALL, false)
    moss(g, [[180, 396, 150], [370, 434, 70]])
    glowLily(g, 560, 500, 0.9, PINKC)
    glowLily(g, 470, 540, 0.7, GOLD)
    glowLily(g, 700, 468, 0.62, AMETHYST)
    jetty(g, 880, 1200, 520, 60)
    caveFloor(g, LAKE_FLOOR, 164)
    lakeCover(g)
    shroom(g, 90, 650, 0.5, AQUA, -0.2, 4)
    shroom(g, 1110, 648, 0.5, GOLD, 0.2, 4)
    moss(g, [[250, 628, 150], [800, 650, 110]])
    gems(g, 165, 14, 600, 666, [[440, 570, 240, 110], [860, 560, 180, 120], [40, 600, 110, 72], [1060, 600, 100, 72]])
  },
  props: (g, t, alive) => {
    const bob = alive > 0 ? sin(t * 1.2) * 3 * alive : 0
    canoe(g, 790, 546 + bob, 0.8, SAPPHIRE)
    lanternGlow(g, 790 + 62 * 0.8, 546 + bob - 98 * 0.8 + 34, 44, t, alive)
    const post: Pt = [896, 520]
    lanternGlow(g, post[0] - 38, post[1] - 118 + 40, 40, t, alive, 1)
    if (alive <= 0) return
    shimmer(g, [[520, 450], [640, 470], [760, 452], [880, 470], [620, 520], [360, 520], [960, 500]], t, alive)
    for (const [x, y0, p] of DRIPS) drip(g, x, ceilingY(x, 36, 110) + 16 + y0 - 100, 500, t, alive, p, x)
    for (const [x, y] of [[560, 480], [470, 524], [700, 452]] as const) glow(g, x, y, 34, alive * (0.6 + 0.4 * sin(t * 2 + x)), '#fff0fa')
    twinkles(g, [[262, 150, 12], [220, 260, 9], [320, 230, 10], [700, 350, 8], [1080, 330, 8], [262, 620, 8]], t, alive)
    spores(g, 480, 260, 420, 200, t, alive, '#e8fbff', 5)
  },
  tap: lakeTap
}

/* ── 4-3 · Gem Mine — the chapter's rescue ────────────────────────────── */
const MINE_FLOOR: readonly Pt[] = [[-40, 504], [200, 496], [420, 510], [640, 522], [860, 514], [1040, 500], [1200, 490]]
const MINE_RAILS: readonly Pt[] = [[268, 500], [282, 534], [360, 564], [520, 584], [720, 588], [900, 580], [1060, 570], [1200, 564]]
const CART = railAt(MINE_RAILS, 0.8)
const SHARD: Pt = [668, 540]
const mineCartFront = (g: G2D): void => {
  cluster(g, CART[0] + 74, CART[1] - 24, 0.46, GOLD, CLUSTER_SMALL, false)
  mineCart(g, CART[0], CART[1] + 4, 0.92, PINKC, true, CART[2])
}
const mineTap = wormTap(
  { x: CART[0] - 6, y: CART[1] - 50, dir: 1, s: 0.72, ground: CART[1] - 4, rise: 70, facet: clusterGeom(CART[0] + 74, CART[1] - 24, 0.46, 2, CLUSTER_SMALL) },
  mineCartFront
)
const MINE_LAMP = mineLampOf(268, 506, 220)

const gemMine: SectorDef = {
  node: 17,
  rvu: 1,
  pots: CAVE_POTS,
  landmark: { x: 268, y: 236 },
  giftSpot: { x: 450, y: 632 },
  seed: 43,
  accent: C4_ACCENT,
  paint: (g, pot) => {
    caveBack(g, { glows: [[640, 380, 300, WARM], [940, 300, 260, TEAL], [520, 200, 200, PINK]] })
    farSpires(g, 470, [[600, 90, 200], [760, 120, 280], [940, 80, 170], [1110, 110, 250]])
    farCrystals(g, [[700, 470, 100, -0.3], [730, 470, 140, 0.05], [990, 470, 120, 0.25]])
    ceiling(g, 40, 104, 171, 0.9)
    // The rock face the mine runs into.
    ledge(g, [[-40, 540], [-40, 70], [110, 96], [300, 118], [450, 162], [530, 250], [548, 380], [528, 480], [500, 540]], 172)
    // Crystal veins breaking out of the rock face.
    crystal(g, 506, 266, 18, 44, 0.55, AQUA, 3.5)
    crystal(g, 520, 300, 24, 64, 0.95, AQUA, 4)
    crystal(g, 522, 336, 16, 40, 1.3, AQUA, 3.5)
    cluster(g, 90, 250, 0.44, GOLD, CLUSTER_SMALL)
    cluster(g, 452, 196, 0.36, PINKC, CLUSTER_SMALL)
    mineMouth(g, 268, 506, 220, pot)
    // The right-hand wall with a vein of crystals.
    ledge(g, [[1200, 520], [1010, 520], [1030, 420], [1080, 330], [1160, 300], [1200, 296]], 173, [[1030, 418], [1080, 328], [1160, 298], [1200, 294]])
    cluster(g, 1086, 452, 0.6, AMETHYST, CLUSTER_SMALL, false)
    caveFloor(g, MINE_FLOOR, 174)
    rails(g, MINE_RAILS, 40)
    gemHeap(g, 930, 512, 130, 5)
    gemHeap(g, 590, 520, 70, 2)
    crate(g, 90, 600, 60)
    crate(g, 140, 608, 44)
    lanternPost(g, 40, 604, 150, 1, 0.8)
    mineCartFront(g)
    moss(g, [[250, 650, 120], [1010, 650, 130]])
    shroom(g, 1110, 636, 0.46, AQUA, -0.2, 4)
    gems(g, 175, 14, 600, 666, [[360, 580, 230, 100], [760, 580, 230, 100], [0, 540, 200, 132], [1060, 590, 100, 80]])
  },
  props: (g, t, alive) => {
    lanternGlow(g, MINE_LAMP[0], MINE_LAMP[1], 50, t, alive)
    lanternGlow(g, 40 + 38, 604 - 150 + 42, 42, t, alive, 2)
    // A little cart trundling out of the tunnel and back.
    const u = 0.2 + (alive > 0 ? 0.2 * (0.5 - 0.5 * cos(t * 0.5)) * alive : 0)
    const [x, y, a] = railAt(MINE_RAILS, u)
    mineCart(g, x, y + 3, 0.58, SAPPHIRE, true, a, u * 60)
    lanternString(g, 470, 150, 1120, 128, 60, 4, t, alive)
    if (alive <= 0) return
    twinkles(g, [[930, 470, 11], [590, 494, 9], [1086, 400, 10], [268, 160, 9], [CART[0], CART[1] - 104, 9]], t, alive)
    spores(g, 560, 260, 420, 220, t, alive, '#fff6d8', 5)
  },
  tap: mineTap,
  rescue: { x: SHARD[0], y: SHARD[1] - 62, r: 80, draw: (g, k, t) => clearShard(g, SHARD[0], SHARD[1], 0.82, k, t) }
}

/* ── 4-4 · Lantern Bridge ─────────────────────────────────────────────── */
const BRIDGE = { x0: 414, x1: 744, y: 466 }
const barrels = (g: G2D): void => {
  barrel(g, 150, 536, 1, PINKC[0])
  barrel(g, 206, 542, 0.86, GOLD[0])
  cluster(g, 250, 546, 0.46, AQUA, CLUSTER_SMALL, false)
}
const bridgeTap = wormTap(
  { x: 174, y: 478, dir: 1, s: 0.72, ground: 538, rise: 92, facet: clusterGeom(250, 546, 0.46, 2, CLUSTER_SMALL) },
  barrels
)
const EAVES = bridgeEaves(BRIDGE.x0, BRIDGE.x1, BRIDGE.y)
const POSTS: readonly (readonly [number, number, number])[] = [[400, 480, -1], [758, 476, 1]]
/** A plateau: its lilac rock body `body`, its orchid top `top`. */
const plateau = (g: G2D, body: readonly Pt[], top: readonly Pt[], seed: number): void => {
  ledge(g, body, seed)
  groundPatch(g, top, seed + 1)
}

const lanternBridge: SectorDef = {
  node: 18,
  rvu: 1,
  pots: CAVE_POTS,
  landmark: { x: 580, y: 318 },
  giftSpot: { x: 930, y: 508 },
  seed: 44,
  accent: C4_ACCENT,
  paint: (g, pot) => {
    caveBack(g, { low: 0.72, glows: [[180, 300, 240, TEAL], [990, 290, 250, PINK], [580, 600, 300, PINK]] })
    farSpires(g, 470, [[70, 100, 250], [290, 80, 160], [870, 90, 190], [1070, 120, 280]])
    farCrystals(g, [[180, 470, 100, -0.2], [214, 470, 140, 0.1], [960, 470, 120, 0.3]])
    ceiling(g, 40, 112, 181, 1, [[500, 660]])
    // The chasm: a soft glowing depth of pink mist, never a dark drop.
    const gr = g.createLinearGradient(0, 400, 0, 672)
    gr.addColorStop(0, '#cdb2ff')
    gr.addColorStop(0.5, CAVE.mist)
    gr.addColorStop(1, '#fff5fc')
    g.fillStyle = gr
    g.fillRect(360, 400, 440, 272)
    farCrystals(g, [[452, 600, 64, 0.5], [470, 646, 46, 0.8], [712, 610, 60, -0.5], [696, 656, 42, -0.8]], '#ffffff')
    for (const [x, y, s] of [[520, 660, 0.9], [680, 628, 0.7], [600, 560, 0.5]] as const) skyPuff(g, x, y, s, 0.85)
    // The two plateaus either side.
    plateau(
      g,
      [[-40, 700], [-40, 474], [150, 462], [330, 468], [430, 480], [442, 560], [426, 630], [418, 700]],
      [[-40, 474], [150, 462], [330, 468], [430, 480], [438, 548], [300, 566], [130, 560], [-40, 570]],
      182
    )
    plateau(
      g,
      [[1200, 700], [1200, 468], [1000, 458], [850, 464], [728, 478], [716, 556], [732, 630], [742, 700]],
      [[1200, 468], [1000, 458], [850, 464], [728, 478], [720, 546], [860, 564], [1040, 558], [1200, 566]],
      184
    )
    // Crystals and glow-moss on the cliff faces.
    cluster(g, 110, 650, 0.5, PINKC, CLUSTER_SMALL, false)
    cluster(g, 330, 616, 0.4, GOLD, CLUSTER_SMALL, false)
    cluster(g, 1060, 648, 0.52, AQUA, CLUSTER_SMALL, false)
    cluster(g, 830, 620, 0.4, PINKC, CLUSTER_SMALL, false)
    moss(g, [[220, 674, 120], [960, 676, 130]])
    // The landmark: the lantern house on its bridge.
    bridgeHouse(g, BRIDGE.x0, BRIDGE.x1, BRIDGE.y, pot)
    for (const [x, y, d] of POSTS) lanternPost(g, x, y, 116, d, 0.82)
    cluster(g, 1060, 478, 0.52, AMETHYST, CLUSTER_SMALL, false)
    shroom(g, 1110, 534, 0.66, PINKC, -0.1, 4.5)
    shroom(g, 1160, 548, 0.4, AQUA, 0.25, 3.5)
    moss(g, [[800, 540, 90], [330, 540, 110]])
    barrels(g)
    crate(g, 320, 530, 46)
    shroom(g, 40, 540, 0.5, GOLD, 0.2, 4)
    gems(g, 184, 8, 500, 556, [[840, 440, 200, 140], [100, 440, 180, 140], [360, 380, 440, 300]])
  },
  props: (g, t, alive) => {
    for (let i = 0; i < POSTS.length; i++) {
      const [x, y, d] = POSTS[i]!
      lanternGlow(g, x + d * 38, y - 116 + 42, 40, t, alive, i)
    }
    for (let i = 0; i < EAVES.length; i++) swingLantern(g, EAVES[i]![0], EAVES[i]![1], 0.7, t, alive, i * 2)
    if (alive <= 0) return
    // The house's windows glow; mist rises out of the chasm.
    for (const [x, y] of [[523, 438], [635, 438]] as const) glow(g, x, y, 40, alive * (0.8 + 0.2 * sin(t * 2.3 + x)), '#fff1a8')
    for (let i = 0; i < 3; i++) {
      const k = (t * 0.06 + i / 3) % 1
      skyPuff(g, 500 + i * 70 + sin(t * 0.4 + i) * 20, 710 - k * 220, 0.45 + 0.2 * k, alive * sin(k * Math.PI) * 0.8)
    }
    fireflies(g, 440, 500, 280, 150, t, alive)
    twinkles(g, [[196, 350, 10], [960, 360, 10], [1060, 420, 9], [452, 580, 8], [712, 590, 8]], t, alive)
  },
  tap: bridgeTap
}

/* ── 4-5 · Terra's Geode Hall — the boss sector (4× area) ─────────────── */
const HALL_FLOOR: readonly Pt[] = [[-40, 548], [200, 538], [400, 546], [576, 542], [760, 546], [960, 538], [1200, 548]]
const HALL_POSTS: readonly (readonly [number, number, number])[] = [[330, 596, 1], [822, 596, -1]]
const MINI = { x: 190, y: 640 }
const hallMite = (g: G2D): void => {
  stalagmite(g, MINI.x, MINI.y, 116, 150)
  crystal(g, MINI.x + 58, MINI.y - 4, 26, 72, 0.36, AQUA, 4)
  moss(g, [[MINI.x - 10, MINI.y + 4, 110]])
}
const hallTap = wormTap(
  { x: MINI.x - 4, y: MINI.y - 118, dir: 1, s: 0.74, ground: MINI.y - 6, rise: 92, facet: [MINI.x + 58, MINI.y - 4, 26, 72, 0.36] },
  hallMite
)
const HALL_SPARKS: readonly (readonly [number, number, number])[] = [
  [290, 200, 12], [860, 200, 12], [420, 90, 11], [740, 96, 11], [576, 64, 13], [250, 360, 10], [900, 370, 10], [576, 250, 10]
]

const terrasGeodeHall: SectorDef = {
  node: 19,
  rvu: 2,
  pots: CAVE_POTS,
  landmark: { x: 576, y: 250 },
  giftSpot: { x: 576, y: 640 },
  seed: 45,
  accent: C4_ACCENT,
  paint: (g, pot) => {
    caveBack(g, { glows: [[576, 360, 460, WARM], [120, 300, 220, TEAL], [1030, 300, 220, PINK]] })
    farSpires(g, 520, [[70, 110, 320], [230, 80, 200], [920, 90, 210], [1080, 120, 320]])
    ceiling(g, 30, 120, 191, 1)
    // Terra's giant open geode: the landmark.
    geode(g, 576, 292, 372, 250, pot, 19)
    caveFloor(g, HALL_FLOOR, 192)
    // The dais and its two soft steps.
    for (const [y, rx, ry, col] of [[574, 300, 30, CAVE.rockLite], [556, 230, 24, '#fff1dc']] as const) {
      g.beginPath()
      g.ellipse(576, y, rx, ry, 0, 0, TAU)
      g.fillStyle = col
      g.fill()
      g.lineWidth = 5
      g.strokeStyle = '#3A2340'
      g.stroke()
    }
    throne(g, 576, 552, 0.96)
    // Crystal pillars and lanterns either side.
    cluster(g, 90, 570, 1.05, GOLD)
    cluster(g, 1064, 570, 1.05, PINKC)
    for (const [x, y, d] of HALL_POSTS) lanternPost(g, x, y, 150, d, 0.9)
    shroom(g, 1110, 664, 0.56, AQUA, -0.15, 4)
    shroom(g, 1010, 648, 0.4, GOLD, 0.2, 3.5)
    shroom(g, 420, 664, 0.36, AQUA, 0.2, 3.5)
    gemHeap(g, 330, 660, 100, 7)
    gemHeap(g, 850, 664, 110, 9)
    hallMite(g)
    moss(g, [[960, 600, 130], [40, 660, 90]])
    gems(g, 193, 12, 600, 668, [[400, 560, 352, 112], [100, 560, 200, 112], [760, 610, 180, 60]])
  },
  props: (g, t, alive) => {
    for (let i = 0; i < HALL_POSTS.length; i++) {
      const [x, y, d] = HALL_POSTS[i]!
      lanternGlow(g, x + d * 38, y - 150 + 46, 46, t, alive, i * 2)
    }
    if (alive <= 0) return
    // The geode's heart breathes light; motes drift up; crystals twinkle.
    glow(g, 576, 300, 230 + 16 * sin(t * 1.2), alive * (0.55 + 0.25 * sin(t * 1.2)), '#ffffff')
    glow(g, 576, 430, 40, alive * (0.6 + 0.4 * sin(t * 2.4)), '#eaffb8')
    spores(g, 330, 120, 500, 380, t, alive, '#ffffff', 8)
    twinkles(g, HALL_SPARKS, t, alive)
    twinkles(g, [[90, 420, 10], [1064, 420, 10]], t + 1, alive)
  },
  tap: hallTap
}

export const C4_SECTORS: readonly SectorDef[] = [glowshroomGrotto, crystalLake, gemMine, lanternBridge, terrasGeodeHall]
