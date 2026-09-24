/**
 * sectorsC10.ts — chapter 10, Friendship Festival (nodes 45–49; story-spec
 * §10.2: "Umbra is only lonely. The Festival is thrown to invite her in",
 * Guardian Umbra herself). Composed from `kit.ts` and `kitFestival.ts`
 * against `sectorDef.ts`, like chapters 1–3: golden-hour sky → far hills
 * and a far fair → the meadow → the festival ground → landmark → dressing.
 *
 *   10-1 Festival Gate       — the welcome ARCH (candy pillars + banded arch)
 *   10-2 Carousel Square     — the carousel's striped CANOPY
 *   10-3 Lantern Market      — the three stalls' striped AWNINGS
 *   10-4 Ferris Wheel Hill   — the ferris wheel's RIM and hub
 *   10-5 The Festival Stage  — the boss sector (4× area): the pavilion ROOFS
 *
 * Every sector's tap creature (§8.8) is Sprig — chapter 1's moss-sprite,
 * back for the Festival in a party hat — popping out from behind a stack of
 * presents, a flowering hedge, a stall counter, a balloon bunch or a stage
 * curtain, waving a little flag. No rescue collectible: chapter 10 IS the
 * finale (§8.8).
 */
import type { SectorDef, SectorAccent } from '@/game/map/sectorDef'
import { FESTIVAL_POTS, C, type G2D, meadow, pathway, tree, bush, flowers, fence, hill } from '@/game/map/kit'
import { sin } from '@/game/duel/util'
import { sectorShowsArt } from '@/game/map/sectorArt'
import { scallop, starfish } from '@/game/map/kitBay'
import { pole, pennant, bunting, twinkles, miniBalloon, dove } from '@/game/map/kitSky'
import {
  F, PARTY, SPRIG, skyF, farBand, farPeaks, farFair, plaza, groundConfetti, tent, giftBox, giftStack, flowerBush,
  balloonCluster, cloudCandy, candyCart, picnic, welcomeArch, archBulbs, archFlags, carousel, carouselBulbs,
  carouselLive, stall, stallCounter, signShell, signCloud, signStar, crystals, snowglobe, starLantern, ferrisFrame,
  ferrisLive, pavilion, stageCurtain, stageFlags, stageBulbs, layerCake, cakeFlames, balloonBunch, lanternString,
  confetti, bursts, notes, bulbGlow, flameGlow, festivalBanner, sprigTap
} from '@/game/map/kitFestival'

/** The chapter's gift ribbon and chest gem (§8.2): love pink. */
export const C10_ACCENT: SectorAccent = { ribbon: '#ff6f9c', ribbonShade: '#e04a78', gem: '#ffc4d6' }
export const C10_POTS = FESTIVAL_POTS

/**
 * The Festival banner for the finale's map beat: a bunting garland `w` SU
 * wide, hung from (x, y) at its LEFT end to (x + w, y) at its right, little
 * pennants in the party colours and a heart hanging at its middle, gently
 * swaying with `t` (seconds). No text. Cheap enough for every frame.
 */
export const drawFestivalBanner = (g: G2D, x: number, y: number, w: number, t: number): void => festivalBanner(g, x, y, w, t)

/* ── 10-1 · Festival Gate ────────────────────────────────────────────────── */
const GATE = { x: 540, y: 500, w: 380 } as const
const GATE_BULBS = archBulbs(GATE.x, GATE.y, GATE.w)
const GATE_FLAGS = archFlags(GATE.x, GATE.y, GATE.w)
const STACK = { x: 170, y: 628 } as const
const t45 = sprigTap([200, 574, 76], [226, 626], [226, 532], 1.7, 1, SPRIG.lilac, [40, 360, 330, 266], (g) => giftStack(g, STACK.x, STACK.y))
const festivalGate: SectorDef = {
  node: 45,
  rvu: 1,
  pots: C10_POTS,
  landmark: { x: 540, y: 170 },
  giftSpot: { x: 840, y: 616 },
  seed: 101,
  accent: C10_ACCENT,
  paint: (g, pot) => {
    skyF(g, { sun: [1000, 214], puffs: [[210, 96, 0.9], [640, 60, 0.62], [890, 128, 0.5]] })
    farBand(g, 324, F.far, 451)
    farFair(g, [['wheel', 860, 300, 62], ['tent', 690, 352, 0.8], ['tent', 772, 356, 0.6], ['tent', 1010, 352, 0.75], ['tent', 400, 356, 0.6]])
    farBand(g, 364, F.far2, 452)
    meadow(g, 458, 470, 462)
    tree(g, 100, 486, 0.95, '#ff8fb8')
    tent(g, 936, 488, 150, F.lilac, F.lilacShade, F.pink)
    tree(g, 1102, 494, 0.8, '#ffd34d')
    fence(g, 70, 504, 6, 46, 0)
    fence(g, 792, 504, 7, 46, 0)
    pole(g, 36, 522, 228)
    pole(g, 1116, 528, 224)
    flowers(g, 45, 30, 512, 668, [
      [470, 470, 170, 210], [740, 540, 200, 132], [70, 500, 260, 172], [290, 440, 110, 90], [680, 440, 110, 90], [980, 580, 180, 90]
    ])
    pathway(g, [[560, 700], [556, 640], [548, 570], [540, 500], [540, 462]], 70, 453)
    groundConfetti(g, 455, 40, 380, 520, 720, 668)
    welcomeArch(g, GATE.x, GATE.y, GATE.w, pot)
    giftStack(g, STACK.x, STACK.y)
    bush(g, 1066, 646, 0.85, '#ff7fbf')
  },
  props: (g, t, alive) => {
    bunting(g, 36, 292, 310, 228, 14, PARTY, 5, t, alive)
    bunting(g, 770, 228, 1116, 302, 14, PARTY, 6, t, alive)
    balloonBunch(g, 318, 330, 1, [F.pink, F.lemon, F.sky, F.mint], t, alive, -1.6)
    balloonBunch(g, 762, 330, 1, [F.lilac, F.coral, F.lemon, F.mint], t, alive, 1.6, 2)
    for (let i = 0; i < GATE_FLAGS.length; i++) {
      const [x, y] = GATE_FLAGS[i]!
      pennant(g, x, y, 46, 22, i ? F.mint : F.lemon, t, alive, i * 1.7)
    }
    festivalBanner(g, 381, 262, 318, alive > 0 ? t : 0)
    bulbGlow(g, GATE_BULBS, t, alive, 6, 2, sectorShowsArt(45))
    if (alive <= 0) return
    confetti(g, 360, 180, 360, 300, t, alive, 12)
    bursts(g, [[190, 118, 58, F.pink, 0], [860, 70, 48, F.lilac, 1.5], [640, 44, 40, F.mint, 2.6]], t, alive)
  },
  tap: t45
}

/* ── 10-2 · Carousel Square ──────────────────────────────────────────────── */
const CARO = { x: 640, y: 520 } as const
const CARO_BULBS = carouselBulbs(CARO.x, CARO.y)
const t46 = sprigTap([1040, 566, 76], [1036, 604], [1036, 508], 1.7, -1, SPRIG.pink, [920, 360, 240, 276], (g) => flowerBush(g, 1040, 640, 1))
const carouselSquare: SectorDef = {
  node: 46,
  rvu: 1,
  pots: C10_POTS,
  landmark: { x: 640, y: 226 },
  giftSpot: { x: 272, y: 640 },
  seed: 102,
  accent: C10_ACCENT,
  paint: (g, pot) => {
    skyF(g, { sun: [150, 200], puffs: [[410, 84, 0.8], [900, 66, 0.9], [1080, 196, 0.48]] })
    farBand(g, 328, F.far, 461)
    farFair(g, [['wheel', 1064, 312, 56], ['tent', 170, 354, 0.7], ['tent', 300, 360, 0.55], ['tent', 960, 362, 0.55]])
    farBand(g, 366, F.far2, 462)
    meadow(g, 466, 456, 470)
    tree(g, 60, 494, 0.85, '#ffd34d')
    tree(g, 1112, 498, 0.78, '#ff8fb8')
    pole(g, 36, 540, 248)
    pole(g, 1118, 546, 248)
    flowers(g, 46, 26, 520, 668, [[180, 510, 940, 170], [0, 470, 250, 120], [940, 520, 212, 150]])
    plaza(g, 640, 596, 480, 78, 463)
    groundConfetti(g, 466, 36, 200, 610, 900, 664)
    candyCart(g, 150, 574)
    carousel(g, CARO.x, CARO.y, pot)
    flowerBush(g, 1040, 640, 1)
  },
  props: (g, t, alive) => {
    bunting(g, 630, 92, 36, 292, 30, PARTY, 7, t, alive)
    bunting(g, 650, 92, 1118, 298, 30, PARTY, 7, t, alive)
    pennant(g, CARO.x, CARO.y - 224 - 168 - 64, 52, 24, F.pink, t, alive)
    carouselLive(g, CARO.x, CARO.y, t, alive)
    bulbGlow(g, CARO_BULBS, t, alive, 5, 2, sectorShowsArt(46))
    balloonBunch(g, 96, 490, 0.9, [F.pink, F.sky, F.lemon], t, alive, -0.4)
    if (alive <= 0) return
    notes(g, 880, 380, t, alive)
    notes(g, 330, 400, t + 1.6, alive)
    confetti(g, 220, 120, 760, 360, t, alive, 12)
  },
  tap: t46
}

/* ── 10-3 · Lantern Market ───────────────────────────────────────────────── */
const MKT_Y = 548
const MKT_W = 236
const shellGoods = (g: G2D): void => {
  scallop(g, 140, 448, 24, -0.25, F.coral, '#ffffff')
  scallop(g, 176, 456, 15, 0.3, F.lemon, '#ffffff')
  starfish(g, 276, 450, 19, 0.3, F.orange)
}
const shellCover = (g: G2D): void => {
  stallCounter(g, 214, MKT_Y, MKT_W, F.sky, F.skyShade)
  shellGoods(g)
}
const t47 = sprigTap([214, 470, 72], [208, 545], [208, 444], 1.7, 1, SPRIG.mint, [104, 378, 220, 168], shellCover)
const lanternMarket: SectorDef = {
  node: 47,
  rvu: 1,
  pots: C10_POTS,
  landmark: { x: 576, y: 314 },
  giftSpot: { x: 740, y: 632 },
  seed: 103,
  accent: C10_ACCENT,
  paint: (g, pot) => {
    skyF(g, { sun: [1010, 226], puffs: [[250, 86, 0.8], [690, 54, 0.6]] })
    farBand(g, 330, F.far, 471)
    farFair(g, [['tent', 120, 356, 0.7], ['wheel', 520, 300, 56], ['tent', 690, 360, 0.6], ['tent', 860, 354, 0.72]])
    farBand(g, 370, F.far2, 472)
    meadow(g, 472, 468, 476)
    plaza(g, 576, 630, 660, 118, 471)
    for (const [x, h] of [[24, 452], [395, 448], [757, 448], [1128, 452]] as const) pole(g, x, 570, h)
    // The shell stall (Bubble Bay).
    stall(g, 214, MKT_Y, MKT_W, pot, signShell)
    shellCover(g)
    // The cloud-candy stall (Cloud Kingdom).
    stall(g, 576, MKT_Y, MKT_W, pot, signCloud)
    stallCounter(g, 576, MKT_Y, MKT_W, F.lilac, F.lilacShade)
    g.beginPath()
    g.roundRect(488, 452, 96, 16, 6)
    g.fillStyle = C.trunk
    g.fill()
    g.lineWidth = 3.5
    g.strokeStyle = '#3A2340'
    g.stroke()
    cloudCandy(g, 508, 454, 0.95, F.pinkLite)
    cloudCandy(g, 536, 452, 1.05, F.skyLite)
    cloudCandy(g, 564, 454, 0.95, F.lemonLite)
    giftBox(g, 648, 466, 50, 40, F.pink, F.pinkShade, F.lemon)
    // The crystal, snowglobe and star-lantern stall (Crystal Caves,
    // Twilight Tundra, Starlight Summit).
    stall(g, 938, MKT_Y, MKT_W, pot, signStar)
    stallCounter(g, 938, MKT_Y, MKT_W, F.coral, F.coralShade)
    crystals(g, 866, 466, 1, '#b06bff', '#8a45e0')
    snowglobe(g, 944, 466)
    starLantern(g, 1008, 466)
    // Front: a crate of spare lanterns (their balloons are props) and a hedge.
    giftBox(g, 1062, 656, 70, 50, F.mint, F.mintShade, F.pink, false)
    bush(g, 70, 660, 0.9, F.pink)
    groundConfetti(g, 473, 48, 40, 580, 1120, 664)
  },
  props: (g, t, alive) => {
    lanternString(g, 24, 118, 395, 122, 26, 4, [F.pink, F.lemon, F.mint, F.sky], t, alive)
    lanternString(g, 395, 122, 757, 122, 30, 4, [F.lilac, F.coral, F.lemon, F.pink], t, alive, 1.3)
    lanternString(g, 757, 122, 1128, 118, 26, 4, [F.mint, F.sky, F.pink, F.lemon], t, alive, 2.6)
    balloonBunch(g, 1062, 606, 0.85, [F.sky, F.pink, F.lemon], t, alive, 0.2)
    if (alive <= 0) return
    twinkles(g, [[200, 60, 11], [470, 80, 9], [690, 50, 12], [960, 70, 10], [330, 250, 8], [820, 240, 9]], t, alive)
    confetti(g, 60, 150, 1000, 380, t, alive, 12)
  },
  tap: t47
}

/* ── 10-4 · Ferris Wheel Hill ────────────────────────────────────────────── */
const WHEEL = { x: 790, y: 236, R: 180, ground: 470 } as const
const CLUSTER = { x: 170, y: 626 } as const
const t48 = sprigTap([220, 560, 80], [178, 540], [284, 590], 1.7, 1, SPRIG.sky, [40, 300, 360, 324], (g) => balloonCluster(g, CLUSTER.x, CLUSTER.y))
const ferrisWheelHill: SectorDef = {
  node: 48,
  rvu: 1,
  pots: C10_POTS,
  landmark: { x: WHEEL.x, y: WHEEL.y },
  giftSpot: { x: 580, y: 632 },
  seed: 104,
  accent: C10_ACCENT,
  paint: (g, pot) => {
    skyF(g, { sun: [560, 150], rainbow: [250, 470, 236], puffs: [[120, 90, 0.6], [1050, 110, 0.8], [420, 50, 0.45]] })
    farBand(g, 334, F.far, 481)
    farPeaks(g, [[110, 372, 150], [260, 378, 104], [420, 380, 128]])
    farFair(g, [['tent', 590, 368, 0.55], ['tent', 1080, 360, 0.6]])
    farBand(g, 384, F.far2, 482)
    hill(g, 430, 1152, 800, 446, 520)
    meadow(g, 548, 584, 612)
    ferrisFrame(g, WHEEL.x, WHEEL.y, WHEEL.R, WHEEL.ground, pot)
    flowers(g, 48, 32, 560, 668, [[80, 420, 260, 250], [300, 540, 400, 160], [520, 590, 140, 90], [820, 560, 250, 100]])
    pathway(g, [[330, 700], [410, 642], [520, 594], [620, 540], [676, 482]], 40, 483)
    groundConfetti(g, 484, 24, 460, 600, 900, 664)
    tree(g, 66, 560, 0.9, '#ffd34d')
    tree(g, 1100, 580, 0.72, '#ff8fb8')
    picnic(g, 950, 626)
    balloonCluster(g, CLUSTER.x, CLUSTER.y)
  },
  props: (g, t, alive) => {
    ferrisLive(g, WHEEL.x, WHEEL.y, WHEEL.R, t, alive)
    miniBalloon(g, 128 + sin(t * 0.19) * 36 * alive, 176 + sin(t * 0.8) * 8 * alive, 30, F.pink)
    miniBalloon(g, 420 + sin(t * 0.15 + 2) * 40 * alive, 250 + sin(t * 0.7 + 1) * 8 * alive, 20, F.mint)
    if (alive <= 0) return
    bursts(g, [[1030, 250, 52, F.pink, 0.4], [460, 60, 44, F.lemon, 2], [1080, 60, 40, F.mint, 1.2]], t, alive)
    for (let i = 0; i < 2; i++) {
      const k = (t * 0.045 + i * 0.5) % 1
      dove(g, 1240 - k * 1400, 110 + i * 60 + sin(t * 1.3 + i) * 10, 1, sin(t * 11 + i * 2), -1)
    }
  },
  tap: t48
}

/* ── 10-5 · The Festival Stage — the boss sector (4× area) ───────────────── */
const STG = { x: 576, y: 496 } as const
const STG_FLAGS = stageFlags(STG.x)
const STG_BULBS = stageBulbs(STG.x)
const CAKE = { x: 576, y: 470, s: 0.9 } as const
const FLAMES = cakeFlames(CAKE.x, CAKE.y, CAKE.s)
const t49 = sprigTap([410, 430, 66], [390, 446], [466, 438], 1.6, 1, SPRIG.lemon, [361, 300, 260, 168], (g) => {
  g.save()
  g.beginPath()
  g.rect(361, 300, 130, 168)
  g.clip()
  stageCurtain(g, STG.x, STG.y, -1)
  g.restore()
})
const festivalStage: SectorDef = {
  node: 49,
  rvu: 2,
  pots: C10_POTS,
  landmark: { x: 576, y: 140 },
  giftSpot: { x: 576, y: 640 },
  seed: 105,
  accent: C10_ACCENT,
  paint: (g, pot) => {
    skyF(g, { sun: [1066, 104], rainbow: [576, 520, 494], puffs: [[150, 74, 0.7], [410, 40, 0.5], [980, 200, 0.45]] })
    farBand(g, 338, F.far, 491)
    farFair(g, [['wheel', 108, 300, 58], ['tent', 230, 362, 0.5], ['tent', 1010, 358, 0.7], ['tent', 1110, 362, 0.55]])
    farBand(g, 376, F.far2, 492)
    meadow(g, 474, 484, 474)
    pole(g, 30, 530, 236)
    pole(g, 1122, 530, 236)
    flowers(g, 49, 20, 590, 668, [[180, 540, 800, 140], [40, 560, 150, 110], [950, 560, 200, 110]])
    plaza(g, 576, 614, 566, 70, 493)
    pavilion(g, STG.x, STG.y, pot)
    layerCake(g, CAKE.x, CAKE.y, CAKE.s)
    flowerBush(g, 112, 652, 0.78)
    giftBox(g, 1004, 660, 76, 56, F.lilac, F.lilacShade, F.lemon)
    giftBox(g, 1068, 664, 58, 44, F.sky, F.skyShade, F.pink)
    giftBox(g, 1034, 604, 48, 38, F.lemon, F.lemonShade, F.coral)
    groundConfetti(g, 494, 44, 60, 580, 1100, 668)
  },
  props: (g, t, alive) => {
    for (let i = 0; i < STG_FLAGS.length; i++) {
      const [x, y] = STG_FLAGS[i]!
      pennant(g, x, y, i === 2 ? 58 : 46, i === 2 ? 26 : 22, i === 2 ? F.love : i ? F.mint : F.lemon, t, alive, i * 1.3)
    }
    bunting(g, 284, 96, 30, 298, 22, PARTY, 6, t, alive)
    bunting(g, 868, 96, 1122, 298, 22, PARTY, 6, t, alive)
    balloonBunch(g, 214, 420, 1, [F.pink, F.lemon, F.sky, F.lilac], t, alive, -1.3)
    balloonBunch(g, 938, 420, 1, [F.mint, F.coral, F.lemon, F.pink], t, alive, 1.3, 2.4)
    bulbGlow(g, STG_BULBS, t, alive, 5, 2, sectorShowsArt(49))
    if (alive <= 0) return
    flameGlow(g, FLAMES, t, alive, sectorShowsArt(49))
    bursts(g, [
      [150, 130, 64, F.pink, 0], [990, 250, 56, F.lemon, 1.1], [420, 44, 46, F.mint, 2.2], [760, 40, 50, F.sky, 0.6], [1070, 40, 40, F.lilac, 2.8]
    ], t, alive)
    confetti(g, 250, 60, 650, 420, t, alive, 16)
    twinkles(g, [[430, 270, 9], [720, 250, 10], [505, 236, 8], [700, 400, 8], [60, 200, 10], [1100, 190, 9]], t, alive)
  },
  tap: t49
}

export const C10_SECTORS: readonly SectorDef[] = [festivalGate, carouselSquare, lanternMarket, ferrisWheelHill, festivalStage]
