/**
 * sectorsC6.ts — chapter 6, Rainbow Ridge (nodes 25–29; story-spec §10.2:
 * "The world's colour is draining from the prismatic bridge", Guardian Prism,
 * playful and a little vain about her colours). Composed from `kit.ts` and
 * `kitRidge.ts` against `sectorDef.ts`, like chapters 1–3:
 * sky → far ridges → striped candy hills → the ground → landmark → dressing.
 *
 *   6-1 Rainbow Falls      — the giant water-lily's PETALS
 *   6-2 Paint-Pot Village  — the round house's PAINT-POT roof
 *   6-3 Prism Garden       — the Garden Prism's FACETS; the Prism Petal sleeps here
 *   6-4 Kite Cliffs        — the kite pavilion's CANOPY
 *   6-5 Prism's Rainbow Bridge — the boss sector (4× area): the bridge's GEM ARCH
 *
 * Every sector has the chapter's tap creature (§8.8): a rainbow-maned foal
 * that trots out from behind a rock, a paint bucket, a hedge, a picnic hamper
 * or a crystal cluster, leaving a rainbow streak on the grass.
 */
import type { SectorDef, SectorAccent } from '@/game/map/sectorDef'
import { type G2D, type Pot, RIDGE_POTS, fill, ink, flower, flowerBed, pathway, fence } from '@/game/map/kit'
import { boulder } from '@/game/map/kitBay'
import { PINK, MINT, LEMON, pole, bunting, pennant, kite } from '@/game/map/kitSky'
import {
  RAINBOW, STRIPES, CRYSTAL, ridgeSky, farRidges, candyHill, ground, rainbowFlowers, tulip, lollyTree, hedgeRow,
  rainbowFall, fallFlow, fallPath, mist, miniRainbow, pool, lilyPad, lotus, foam, crystalCluster, gardenPrism,
  prismBeams, prismHeart, potHouse, potMouth, paintBucket, easel, hedgeBall, hamper, kitePavilion, windsock,
  prismBridge, ridgeTower, towerFinial, charm, foalTap, petalCushion, petalRescue, flutter, colourBubbles, glints, swallow,
  starPath, lumps, mixPale
} from '@/game/map/kitRidge'
import { sin, cos, PI } from '@/game/duel/util'

/** The chapter's gift ribbon and chest gem (§8.2): rainbow pink. */
export const C6_ACCENT: SectorAccent = { ribbon: '#ff5fb8', ribbonShade: '#e03d95', gem: '#ffc0e2' }
export const C6_POTS = RIDGE_POTS

const P_BLUE: Pot = { id: 'blue', base: '#56b6ff', shade: '#3d8fe0', lite: '#b8e2ff' }
const P_YELLOW: Pot = { id: 'yellow', base: '#ffd84d', shade: '#eaa63a', lite: '#fff0a6' }
const P_LILAC: Pot = { id: 'lilac', base: '#a77cff', shade: '#8558e8', lite: '#dccbff' }
const P_BED: Pot = { id: 'bed', base: '#ff7fbf', shade: '#e2579f', lite: '#ffd84d' }
const FLAGS = [RAINBOW[0]!, RAINBOW[2]!, RAINBOW[3]!, RAINBOW[4]!, RAINBOW[5]!, RAINBOW[1]!] as const

/* ── 6-1 · Rainbow Falls ─────────────────────────────────────────────────── */
const FALL = { x: 596, top: 150, bot: 486, w: 124 }
const FALL2 = { x: 292, top: 306, bot: 486, w: 62 }
const fallsRock = (g: G2D): void => {
  boulder(g, 1010, 606, 176, 112, -1)
  lumps(g, 1010, 606, 170)
  for (let i = 0; i < 4; i++) {
    const a = -2.5 + i * 0.5
    flower(g, 1010 + cos(a) * 64, 590 + sin(a) * 74, 11, RAINBOW[(i * 2 + 1) % 6]!, i)
  }
}

const rainbowFalls: SectorDef = {
  node: 25,
  rvu: 1,
  pots: RIDGE_POTS,
  landmark: { x: 780, y: 440 },
  giftSpot: { x: 250, y: 628 },
  seed: 61,
  accent: C6_ACCENT,
  paint: (g, pot) => {
    ridgeSky(g, { sun: [150, 96], puffs: [[430, 76, 0.8], [880, 60, 0.62], [1070, 190, 0.45]] })
    farRidges(g, 250, 300, 61)
    lollyTree(g, 70, 300, 0.7, LEMON)
    candyHill(g, () => {
      g.beginPath()
      g.moveTo(-40, 700)
      g.lineTo(-40, 300)
      g.bezierCurveTo(40, 262, 200, 258, 290, 300)
      g.bezierCurveTo(350, 332, 364, 440, 384, 700)
      g.closePath()
    }, [-40, 260, 430, 440], STRIPES.cool, { cap: [[-40, 300], [70, 272], [190, 270], [290, 302]], seed: 3 })
    lollyTree(g, 1000, 262, 0.78, PINK)
    lollyTree(g, 1120, 280, 0.6, MINT)
    candyHill(g, () => {
      g.beginPath()
      g.moveTo(800, 700)
      g.bezierCurveTo(830, 440, 860, 300, 930, 268)
      g.bezierCurveTo(1010, 236, 1120, 246, 1200, 264)
      g.lineTo(1200, 700)
      g.closePath()
    }, [800, 240, 400, 460], STRIPES.sunny, { cap: [[900, 286], [960, 256], [1060, 246], [1200, 262]], seed: 4 })
    candyHill(g, () => {
      g.beginPath()
      g.moveTo(340, 700)
      g.bezierCurveTo(352, 420, 360, 230, 420, 172)
      g.bezierCurveTo(470, 128, 540, 132, 566, 148)
      g.quadraticCurveTo(596, 162, 626, 148)
      g.bezierCurveTo(680, 124, 760, 124, 800, 168)
      g.bezierCurveTo(850, 226, 850, 420, 870, 700)
      g.closePath()
    }, [340, 128, 530, 580], STRIPES.berry, { cap: [[416, 178], [470, 142], [540, 138], [596, 156], [660, 136], [740, 132], [800, 170]], seed: 5 })
    pool(g, 600, 500, 340, 58)
    rainbowFall(g, FALL2.x, FALL2.top, FALL2.bot, FALL2.w)
    rainbowFall(g, FALL.x, FALL.top, FALL.bot, FALL.w)
    foam(g, FALL.x, FALL.bot + 4, FALL.w * 1.3)
    foam(g, FALL2.x, FALL2.bot + 4, FALL2.w * 1.4)
    lilyPad(g, 430, 520, 30, 0.9)
    lilyPad(g, 480, 506, 20, 2.2)
    ground(g, [[-40, 546], [160, 538], [360, 556], [600, 560], [840, 552], [1000, 544], [1200, 548]], 611)
    lotus(g, 780, 510, 0.95, pot)
    for (const [x, c] of [[60, RAINBOW[0]!], [100, RAINBOW[2]!], [1110, RAINBOW[4]!], [1070, RAINBOW[5]!], [900, RAINBOW[1]!]] as const) tulip(g, x, 560 + (x % 7), 0.9, c)
    fallsRock(g)
    rainbowFlowers(g, 17, 30, 576, 668, [[150, 540, 200, 140], [880, 470, 250, 150]])
  },
  props: (g, t, alive) => {
    fallFlow(g, FALL.x, FALL.top, FALL.bot, FALL.w, t, alive)
    fallFlow(g, FALL2.x, FALL2.top, FALL2.bot, FALL2.w, t + 0.7, alive)
    flutter(g, 420, 600, t, 0, RAINBOW[0]!, alive)
    flutter(g, 700, 420, t, 1, RAINBOW[2]!, alive)
    if (alive <= 0) return
    mist(g, FALL.x, FALL.bot, FALL.w, t, alive)
    mist(g, FALL2.x, FALL2.bot, FALL2.w * 0.7, t + 0.4, alive)
    g.globalAlpha = alive * (0.55 + 0.25 * sin(t * 1.3))
    miniRainbow(g, FALL.x, FALL.bot - 10, 96, 7, PI * 1.05, PI * 1.95, 6)
    g.globalAlpha = 1
    glints(g, [[400, 486, 10], [690, 470, 9], [520, 524, 8], [860, 490, 10], [320, 516, 8]], t, alive, '#ffffff')
  },
  tap: foalTap({ x: 1010, y: 604, dir: -1, s: 0.72, out: 156 }, fallsRock)
}

/* ── 6-2 · Paint-Pot Village ─────────────────────────────────────────────── */
const HOUSE = { x: 600, y: 546, w: 236 }
const MOUTH = potMouth(HOUSE.x, HOUSE.y, HOUSE.w)
const SMALL_MOUTH = potMouth(150, 336, 112)
const BUNT = [[742, 486], [1112, 470]] as const
const villageBucket = (g: G2D): void => paintBucket(g, 176, 604, 0.86, RAINBOW[4]!, '#3d8fe0')

const paintPotVillage: SectorDef = {
  node: 26,
  rvu: 1,
  pots: RIDGE_POTS,
  landmark: { x: 600, y: 330 },
  giftSpot: { x: 830, y: 630 },
  seed: 62,
  accent: C6_ACCENT,
  paint: (g, pot) => {
    ridgeSky(g, { sun: [1010, 96], rainbow: [290, 460, 330], puffs: [[620, 70, 0.72], [900, 190, 0.45], [120, 120, 0.5]] })
    farRidges(g, 270, 318, 62)
    candyHill(g, () => {
      g.beginPath()
      g.moveTo(-40, 700)
      g.lineTo(-40, 336)
      g.bezierCurveTo(60, 318, 330, 300, 430, 312)
      g.bezierCurveTo(500, 322, 520, 420, 540, 700)
      g.closePath()
    }, [-40, 300, 580, 400], STRIPES.mintY, { cap: [[-40, 334], [100, 318], [260, 306], [430, 314]], seed: 7 })
    candyHill(g, () => {
      g.beginPath()
      g.moveTo(660, 700)
      g.bezierCurveTo(680, 420, 700, 360, 780, 346)
      g.bezierCurveTo(900, 330, 1100, 320, 1200, 330)
      g.lineTo(1200, 700)
      g.closePath()
    }, [660, 320, 540, 380], STRIPES.lilac, { cap: [[760, 350], [880, 336], [1040, 326], [1200, 330]], seed: 8 })
    potHouse(g, 150, 336, 112, P_BLUE)
    potHouse(g, 360, 320, 98, P_YELLOW)
    potHouse(g, 1010, 346, 120, P_LILAC)
    lollyTree(g, 470, 318, 0.5, MINT)
    lollyTree(g, 850, 346, 0.56, PINK)
    ground(g, [[-40, 486], [180, 476], [420, 494], [640, 500], [860, 486], [1200, 476]], 621)
    for (const [x, y] of BUNT) pole(g, x, y, 100)
    pathway(g, [[600, 546], [596, 590], [572, 640], [540, 700]], 40, 626)
    fence(g, 310, 548, 5, 36, 3)
    fence(g, 750, 552, 4, 36, -2)
    potHouse(g, HOUSE.x, HOUSE.y, HOUSE.w, pot)
    easel(g, 1060, 590, 0.86)
    villageBucket(g)
    for (const [x, c] of [[440, RAINBOW[0]!], [470, RAINBOW[2]!], [720, RAINBOW[4]!], [750, RAINBOW[5]!]] as const) tulip(g, x, 560, 0.8, c)
    rainbowFlowers(g, 29, 26, 570, 668, [[90, 470, 180, 150], [740, 540, 180, 130], [990, 480, 160, 130], [510, 520, 110, 160]])
  },
  props: (g, t, alive) => {
    bunting(g, BUNT[0][0], BUNT[0][1] - 100, BUNT[1][0], BUNT[1][1] - 100, 14, FLAGS, 7, t, alive)
    flutter(g, 400, 450, t, 2, RAINBOW[5]!, alive)
    flutter(g, 900, 560, t, 0, RAINBOW[1]!, alive)
    if (alive <= 0) return
    colourBubbles(g, MOUTH[0], MOUTH[1], 150, t, alive)
    colourBubbles(g, SMALL_MOUTH[0], SMALL_MOUTH[1], 70, t + 1.3, alive)
    glints(g, [[300, 200, 11], [520, 150, 9], [880, 240, 10], [760, 120, 8]], t, alive)
  },
  tap: foalTap({ x: 176, y: 604, dir: 1, s: 0.7, out: 158 }, villageBucket)
}

/* ── 6-3 · Prism Garden — the chapter's rescue ───────────────────────────── */
const PRISM = { x: 890, y: 530, s: 0.9 }
const HEART = prismHeart(PRISM.x, PRISM.y, PRISM.s)
const PETAL = { x: 480, y: 566, s: 0.9 }
const gardenHedge = (g: G2D): void => hedgeBall(g, 110, 606, 0.82)

const prismGarden: SectorDef = {
  node: 27,
  rvu: 1,
  pots: RIDGE_POTS,
  landmark: { x: PRISM.x, y: 370 },
  giftSpot: { x: 676, y: 636 },
  seed: 63,
  accent: C6_ACCENT,
  paint: (g, pot) => {
    ridgeSky(g, { sun: [140, 96], puffs: [[470, 74, 0.8], [800, 110, 0.6], [1060, 60, 0.5]] })
    farRidges(g, 286, 336, 63)
    lollyTree(g, 90, 402, 0.8, LEMON)
    lollyTree(g, 360, 396, 0.64, PINK)
    lollyTree(g, 640, 400, 0.72, MINT)
    lollyTree(g, 1080, 404, 0.8, PINK)
    hedgeRow(g, -40, 1200, 404, 34, 90, 631)
    ground(g, [[-40, 462], [300, 470], [600, 466], [900, 470], [1200, 462]], 632)
    starPath(g, [[220, 648, 24], [300, 612, 21], [372, 584, 18], [560, 590, 17], [640, 574, 16], [720, 560, 15]])
    flowerBed(g, 980, 652, 190, P_BED, 633)
    gardenPrism(g, PRISM.x, PRISM.y, PRISM.s, pot)
    petalCushion(g, PETAL.x, PETAL.y, PETAL.s)
    for (const [x, c] of [[250, RAINBOW[0]!], [284, RAINBOW[1]!], [318, RAINBOW[2]!], [1060, RAINBOW[3]!], [1094, RAINBOW[4]!], [1128, RAINBOW[5]!]] as const) tulip(g, x, 520, 0.85, c)
    gardenHedge(g)
    rainbowFlowers(g, 37, 34, 492, 668, [[20, 480, 180, 160], [380, 470, 200, 120], [590, 540, 180, 140], [730, 430, 320, 150], [180, 600, 220, 70], [870, 590, 230, 90]])
  },
  props: (g, t, alive) => {
    prismBeams(g, HEART[0], HEART[1], PI * 0.87, 0.3, 430, t, alive)
    flutter(g, 560, 420, t, 1, RAINBOW[0]!, alive)
    flutter(g, 300, 520, t, 3, RAINBOW[4]!, alive)
    flutter(g, 1000, 560, t, 2, RAINBOW[2]!, alive)
    glints(g, [[HEART[0] - 60, HEART[1] - 40, 12], [HEART[0] + 70, HEART[1] + 20, 10], [HEART[0] - 20, HEART[1] - 140, 11], [700, 300, 9]], t, alive)
  },
  tap: foalTap({ x: 110, y: 604, dir: 1, s: 0.72, out: 160 }, gardenHedge),
  rescue: petalRescue(PETAL.x, PETAL.y - 6, PETAL.s)
}

/* ── 6-4 · Kite Cliffs ───────────────────────────────────────────────────── */
const PAV = { x: 290, y: 344, w: 204 }
const FINIAL = [PAV.x, PAV.y - (156 + 96 + 62 + 12) * (PAV.w / 220)] as const
const ANCHOR = [PAV.x + PAV.w * 0.44, PAV.y - 50] as const
const STAKE = [760, 556] as const
const STAKE_TOP = [STAKE[0], STAKE[1] - 34] as const
const SOCK = [1070, 156] as const
const cliffHamper = (g: G2D): void => hamper(g, 850, 612, 0.8)

const kiteCliffs: SectorDef = {
  node: 28,
  rvu: 1,
  pots: RIDGE_POTS,
  landmark: { x: PAV.x, y: 190 },
  giftSpot: { x: 520, y: 628 },
  seed: 64,
  accent: C6_ACCENT,
  paint: (g, pot) => {
    ridgeSky(g, { sun: [1030, 100], rainbow: [770, 560, 250], puffs: [[620, 90, 0.7], [180, 70, 0.5], [860, 250, 0.42]] })
    farRidges(g, 420, 470, 64, 90, 70)
    // The far valley floor, pale and unoutlined.
    g.beginPath()
    g.moveTo(-40, 520)
    g.bezierCurveTo(300, 500, 700, 520, 1200, 506)
    g.lineTo(1200, 700)
    g.lineTo(-40, 700)
    g.closePath()
    fill(g, '#c9f2d6')
    // The far cliff on the right, with its windsock.
    candyHill(g, () => {
      g.beginPath()
      g.moveTo(960, 700)
      g.bezierCurveTo(970, 420, 990, 260, 1060, 226)
      g.bezierCurveTo(1110, 204, 1180, 210, 1210, 220)
      g.lineTo(1210, 700)
      g.closePath()
    }, [960, 200, 250, 500], STRIPES.lilac, { cap: [[1040, 238], [1100, 216], [1210, 220]], seed: 9 })
    pole(g, SOCK[0], 230, 230 - SOCK[1])
    // The terraced bluff: a lower step, then the top with the pavilion.
    candyHill(g, () => {
      g.beginPath()
      g.moveTo(-40, 700)
      g.lineTo(-40, 446)
      g.bezierCurveTo(200, 430, 520, 432, 640, 450)
      g.bezierCurveTo(700, 462, 720, 560, 740, 700)
      g.closePath()
    }, [-40, 430, 780, 270], STRIPES.berry, { cap: [[-40, 446], [200, 436], [460, 436], [640, 452]], seed: 10 })
    candyHill(g, () => {
      g.beginPath()
      g.moveTo(-40, 470)
      g.lineTo(-40, 352)
      g.bezierCurveTo(100, 336, 400, 332, 500, 348)
      g.bezierCurveTo(560, 360, 570, 420, 580, 470)
      g.closePath()
    }, [-40, 332, 620, 140], STRIPES.peach, { cap: [[-40, 352], [120, 340], [340, 336], [500, 350]], seed: 11, band: 34 })
    kitePavilion(g, PAV.x, PAV.y, PAV.w, pot)
    ground(g, [[-40, 540], [240, 530], [520, 540], [760, 550], [900, 566], [990, 610], [1030, 700]], 641)
    pole(g, STAKE[0], STAKE[1], 34)
    lollyTree(g, 60, 336, 0.56, MINT)
    cliffHamper(g)
    rainbowFlowers(g, 41, 26, 566, 668, [[420, 540, 200, 140], [730, 500, 220, 170], [700, 520, 90, 50]], 20, 960)
  },
  props: (g, t, alive) => {
    const kites = [
      [560, 150, 0.9, RAINBOW[0]!, RAINBOW[2]!, ANCHOR], [760, 90, 1, RAINBOW[4]!, RAINBOW[3]!, ANCHOR],
      [900, 250, 0.8, RAINBOW[5]!, RAINBOW[1]!, STAKE_TOP], [660, 300, 0.7, RAINBOW[2]!, RAINBOW[0]!, STAKE_TOP]
    ] as const
    for (let i = 0; i < kites.length; i++) {
      const [x, y, s, c1, c2, [ax, ay]] = kites[i]!
      const bob = sin(t * 1.1 + i * 2) * 14 * alive
      const drift = sin(t * 0.6 + i) * 18 * alive
      const tilt = (1 - alive) * 0.4 * (i - 1.5) + sin(t * 1.3 + i) * 0.2 * alive
      kite(g, x + drift, y + bob + (1 - alive) * 30, s, c1, c2, tilt, t * 3 * alive + i, ax, ay)
    }
    g.beginPath()
    g.moveTo(FINIAL[0], FINIAL[1] + 6)
    g.lineTo(FINIAL[0], FINIAL[1] - 30)
    ink(g, 3)
    pennant(g, FINIAL[0], FINIAL[1] - 30, 46, 22, RAINBOW[4]!, t, alive)
    windsock(g, SOCK[0], SOCK[1] - 2, 0.9, t, alive, -1)
    if (alive <= 0) return
    for (let i = 0; i < 2; i++) {
      const k = (t * 0.05 + i * 0.5) % 1
      swallow(g, -60 + k * 1300, 200 + i * 80 + sin(t * 1.3 + i) * 12, 0.9, sin(t * 9 + i * 2), 1, i ? RAINBOW[5]! : RAINBOW[0]!)
    }
    flutter(g, 380, 600, t, 1, RAINBOW[2]!, alive)
  },
  tap: foalTap({ x: 850, y: 610, dir: -1, s: 0.72, out: 150 }, cliffHamper)
}

/* ── 6-5 · Prism's Rainbow Bridge — the boss sector (4× area) ────────────── */
const ARCH = (() => {
  const x0 = 214
  const x1 = 944
  const y = 318
  const h = 196
  const c = (x1 - x0) / 2
  const R = (c * c + h * h) / (2 * h)
  const a = Math.asin(c / R)
  return { cx: (x0 + x1) / 2, cy: y - h + R, R, a0: -PI / 2 - a, a1: -PI / 2 + a }
})()
const GEM_T = 58
const DECK = 48
const TOWER_L = [214, 330] as const
const TOWER_R = [944, 318] as const
const TW = 76
const TH = 118
const FLAG_L = towerFinial(TOWER_L[0], TOWER_L[1], TW, TH)
const FLAG_R = towerFinial(TOWER_R[0], TOWER_R[1], TW, TH)
const bridgeCrystals = (g: G2D): void => crystalCluster(g, 118, 614, 0.84)
/** Crystal charms hung under the arch: foot on the inner edge, string length, tones. */
const CHARMS = [0.3, 0.5, 0.7].map((u, i) => {
  const a = ARCH.a0 + (ARCH.a1 - ARCH.a0) * u
  const r = ARCH.R - GEM_T
  return [ARCH.cx + cos(a) * r, ARCH.cy + sin(a) * r, i === 1 ? 64 : 40, [CRYSTAL.sky, CRYSTAL.pink, CRYSTAL.mint][i]!] as const
})

const rainbowBridge: SectorDef = {
  node: 29,
  rvu: 2,
  pots: RIDGE_POTS,
  landmark: { x: ARCH.cx, y: ARCH.cy - ARCH.R + GEM_T / 2 },
  giftSpot: { x: 576, y: 640 },
  seed: 65,
  accent: C6_ACCENT,
  paint: (g, pot) => {
    ridgeSky(g, { sun: [1060, 88], puffs: [[170, 90, 0.7], [760, 58, 0.5], [420, 150, 0.45]] })
    farRidges(g, 380, 430, 65, 120, 90)
    // A far rainbow fall in the valley, pale and unoutlined, seen under the arch.
    fallPath(g, 610, 300, 470, 70)
    g.save()
    g.clip()
    for (let i = 0; i < RAINBOW.length; i++) {
      g.fillStyle = mixPale(RAINBOW[i]!)
      g.fillRect(610 - 35 + i * (70 / 6) - 0.5, 270, 70 / 6 + 1, 220)
    }
    g.restore()
    // The valley floor.
    ground(g, [[-40, 486], [300, 478], [576, 490], [860, 480], [1200, 486]], 651)
    lollyTree(g, 520, 492, 0.5, MINT)
    lollyTree(g, 668, 494, 0.56, PINK)
    potHouse(g, 744, 500, 70, P_BLUE)
    potHouse(g, 424, 498, 64, P_YELLOW)
    // The two peaks.
    candyHill(g, () => {
      g.beginPath()
      g.moveTo(-60, 700)
      g.lineTo(-60, 372)
      g.bezierCurveTo(0, 346, 80, 326, 150, 324)
      g.lineTo(270, 326)
      g.bezierCurveTo(330, 334, 350, 430, 368, 520)
      g.bezierCurveTo(382, 600, 394, 660, 400, 700)
      g.closePath()
    }, [-60, 320, 460, 380], STRIPES.berry, { cap: [[-60, 372], [40, 340], [150, 326], [280, 330]], seed: 13, band: 42 })
    candyHill(g, () => {
      g.beginPath()
      g.moveTo(770, 700)
      g.bezierCurveTo(780, 600, 800, 420, 846, 340)
      g.bezierCurveTo(866, 318, 900, 314, 950, 314)
      g.lineTo(1060, 316)
      g.bezierCurveTo(1140, 320, 1200, 344, 1220, 364)
      g.lineTo(1220, 700)
      g.closePath()
    }, [770, 310, 450, 390], STRIPES.sunny, { cap: [[852, 336], [950, 318], [1060, 318], [1220, 364]], seed: 14, band: 42 })
    prismBridge(g, ARCH.cx, ARCH.cy, ARCH.R, ARCH.a0, ARCH.a1, GEM_T, DECK, pot)
    ridgeTower(g, TOWER_L[0], TOWER_L[1], TW, TH, CRYSTAL.pink)
    ridgeTower(g, TOWER_R[0], TOWER_R[1], TW, TH, CRYSTAL.lilac)
    // The foreground meadow round the chest.
    ground(g, [[-40, 592], [200, 594], [420, 612], [576, 616], [760, 610], [960, 594], [1200, 590]], 652)
    lollyTree(g, 1060, 600, 0.84, LEMON)
    crystalCluster(g, 960, 612, 0.56)
    for (const [x, c] of [[300, RAINBOW[0]!], [340, RAINBOW[2]!], [820, RAINBOW[4]!], [860, RAINBOW[5]!]] as const) tulip(g, x, 628, 0.9, c)
    bridgeCrystals(g)
    rainbowFlowers(g, 53, 26, 620, 668, [[400, 580, 360, 100], [30, 540, 190, 140], [900, 560, 250, 120]])
  },
  props: (g, t, alive) => {
    for (let i = 0; i < CHARMS.length; i++) {
      const [x, y, len, tone] = CHARMS[i]!
      charm(g, x, y, len, (alive > 0 ? sin(t * 1.4 + i * 1.3) * 0.16 * alive : 0), tone)
    }
    for (const [[x, y], c, ph] of [[FLAG_L, RAINBOW[4]!, 0], [FLAG_R, RAINBOW[0]!, 1.7]] as const) {
      g.beginPath()
      g.moveTo(x, y + 4)
      g.lineTo(x, y - 34)
      ink(g, 3)
      pennant(g, x, y - 34, 50, 24, c, t, alive, ph)
    }
    if (alive <= 0) return
    // A glint racing along the rainbow deck.
    const k = (t * 0.2) % 1.3
    if (k < 1) {
      const a = ARCH.a0 + (ARCH.a1 - ARCH.a0) * k
      const R = ARCH.R + DECK - 8
      g.globalAlpha = alive * sin(k * PI)
      g.beginPath()
      g.arc(ARCH.cx, ARCH.cy, R, a - 0.06, a + 0.06)
      g.lineWidth = 7
      g.strokeStyle = '#ffffff'
      g.stroke()
      g.beginPath()
      glintStar(g, ARCH.cx + cos(a) * R, ARCH.cy + sin(a) * R, 18)
      g.globalAlpha = 1
    }
    for (let i = 0; i < 2; i++) {
      const p = t * (0.3 + i * 0.08) + i * 3
      swallow(g, 576 + cos(p) * (360 - i * 80), 190 + i * 90 + sin(p * 2) * 30, 0.9 - i * 0.15, sin(t * 9 + i), -sin(p) >= 0 ? 1 : -1, i ? RAINBOW[2]! : RAINBOW[5]!)
    }
    flutter(g, 300, 560, t, 0, RAINBOW[0]!, alive)
    flutter(g, 860, 560, t, 2, RAINBOW[4]!, alive)
    glints(g, [[360, 150, 12], [800, 110, 12], [576, 60, 10], [250, 330, 9], [930, 360, 10]], t, alive)
  },
  tap: foalTap({ x: 118, y: 612, dir: 1, s: 0.7, out: 160 }, bridgeCrystals)
}

/** One outlined twinkle star (the deck glint's head). */
const glintStar = (g: G2D, x: number, y: number, r: number): void => {
  g.moveTo(x, y - r)
  g.quadraticCurveTo(x + r * 0.16, y - r * 0.16, x + r, y)
  g.quadraticCurveTo(x + r * 0.16, y + r * 0.16, x, y + r)
  g.quadraticCurveTo(x - r * 0.16, y + r * 0.16, x - r, y)
  g.quadraticCurveTo(x - r * 0.16, y - r * 0.16, x, y - r)
  fill(g, '#fffbe0')
  ink(g, 2)
}

export const C6_SECTORS: readonly SectorDef[] = [rainbowFalls, paintPotVillage, prismGarden, kiteCliffs, rainbowBridge]
