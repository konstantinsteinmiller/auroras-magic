/**
 * sectorsC5.ts — chapter 5, Mirror Mountains (nodes 20–24; story-spec §10.2:
 * "Umbra's mirrors now show only confusing illusions", Guardian Echo, who
 * repeats things and is never sure which reflection is real). Composed from
 * `kit.ts` and `kitMirror.ts` against `sectorDef.ts`, like chapters 1–3:
 * sky → far peaks → silver mountains → mint meadow → landmark → dressing.
 * Mirrors everywhere: still lakes holding the world upside down, gilded
 * standing mirrors on the slopes, and things that come in echoing pairs.
 *
 *   5-1 Mirror Lake Meadow — the lakeside gazebo's DOME
 *   5-2 Echo Valley        — the chalet's ROOF
 *   5-3 Hall of Mirrors    — the great mirror's FRAME; the chapter's rescue,
 *                            the Mended Mirror Shard, lies on the trail
 *   5-4 Silver Peak Pass   — the cable-car lookout's ROOF
 *   5-5 Echo's Mirror Palace — the boss sector (4× area): the palace DOMES
 *
 * Every sector has the chapter's tap creature (§8.8): a mirror sprite that
 * pops up from behind a boulder, a woodshed, a rose bush, a snowy rock or a
 * clipped hedge and waves — and its mirrored twin pops up beside it and
 * waves the very same wave.
 */
import type { SectorDef, SectorAccent } from '@/game/map/sectorDef'
import { MIRROR_POTS, INK, fill, ink, lumpy, pathway, bush, smoke, butterfly, type G2D } from '@/game/map/kit'
import { sin, cos, TAU } from '@/game/duel/util'
import type { Pt } from '@/game/map/kitBay'
import { pennant, twinkles, dove, cloudSea } from '@/game/map/kitSky'
import { shimmer, glow } from '@/game/map/kitCaves'
import {
  MIR, GILT, PEACHY, MINTY, skyM, farPeaks, mountain, meadowM, hillM, alpFlowers, alpPine, stone, railFence, woodshed,
  mirrorLake, reeds, standMirror, glassOf, mirrorGlint, gazebo, chalet, chaletChimney, chaletFlag, lookout, cabin, palace,
  palaceStars, echoBird, echoButterflies, driftCloud, spriteTap, mendedShard
} from '@/game/map/kitMirror'

/** The chapter's gift ribbon and chest gem (§8.2): mirror mint. */
export const C5_ACCENT: SectorAccent = { ribbon: '#52e3b8', ribbonShade: '#2fb892', gem: '#b8f7e4' }
export const C5_POTS = MIRROR_POTS

/* ── 5-1 · Mirror Lake Meadow ─────────────────────────────────────────── */
const LAKE = { x: 590, y: 470, rx: 410, ry: 84 }
const MEADOW_TOP: readonly Pt[] = [[-40, 384], [200, 376], [500, 388], [800, 384], [1000, 374], [1200, 382]]
const lakeHills = (g: G2D): void => {
  farPeaks(g, 330, [[120, 260, 170], [340, 300, 214], [560, 260, 156], [770, 320, 236], [1010, 280, 186]])
  mountain(g, 190, 386, 470, 262, 0.3)
  mountain(g, 1000, 386, 440, 240, -0.4)
}
const lakeStone = (g: G2D): void => stone(g, 330, 612, 200, 96, 1)
const lakeTap = spriteTap({ x: 330, y: 522, s: 0.9, ground: 612, rise: 92, gap: 68 }, lakeStone)
const LAKE_MIRROR: Pt = [140, 600]

const mirrorLakeMeadow: SectorDef = {
  node: 20,
  rvu: 1,
  pots: MIRROR_POTS,
  landmark: { x: 910, y: 250 },
  giftSpot: { x: 640, y: 620 },
  seed: 51,
  accent: C5_ACCENT,
  paint: (g, pot) => {
    skyM(g, { sun: [760, 96], clouds: [[520, 60, 0.5], [1040, 150, 0.55]] })
    lakeHills(g)
    meadowM(g, MEADOW_TOP, 511)
    alpPine(g, 60, 420, 0.8)
    alpPine(g, 1120, 416, 0.86)
    alpPine(g, 1060, 404, 0.6)
    mirrorLake(g, LAKE.x, LAKE.y, LAKE.rx, LAKE.ry, [
      [382, () => lakeHills(g)],
      [446, () => gazebo(g, 910, 446, 0.92, pot)]
    ])
    reeds(g, [[210, 480, 0.9], [240, 500, 0.7], [960, 520, 0.8], [640, 560, 0.6]])
    // The landmark: the gazebo on its deck at the water's edge.
    gazebo(g, 910, 446, 0.92, pot)
    standMirror(g, LAKE_MIRROR[0], LAKE_MIRROR[1], 0.9)
    lakeStone(g)
    stone(g, 1060, 640, 110, 56, -1)
    alpFlowers(g, 512, 26, 560, 666, [[520, 560, 240, 112], [230, 520, 200, 100], [80, 500, 140, 110], [1000, 600, 120, 60]])
  },
  props: (g, t, alive) => {
    driftCloud(g, 250, 92, 0.8, t, alive, 40)
    if (alive <= 0) return
    shimmer(g, [[400, 440], [560, 470], [720, 450], [640, 510], [460, 500], [820, 490]], t, alive)
    const bx = 590 + sin(t * 0.2) * 300
    echoBird(g, bx, 300 + sin(t * 0.7) * 16, 382, [LAKE.x, LAKE.y, LAKE.rx, LAKE.ry], 1, sin(t * 7), cos(t * 0.2) >= 0 ? 1 : -1, alive)
    mirrorGlint(g, LAKE_MIRROR[0], LAKE_MIRROR[1], 0.9, t, alive)
    butterfly(g, 700, 560, t, 0, '#ff9fc4', alive)
    twinkles(g, [[910, 124, 11], [500, 452, 9], [700, 500, 8], [140, 470, 9]], t, alive)
  },
  tap: lakeTap
}

/* ── 5-2 · Echo Valley ────────────────────────────────────────────────── */
const VALLEY_TOP: readonly Pt[] = [[-40, 452], [240, 432], [576, 422], [880, 432], [1200, 450]]
const CHALET = { x: 590, y: 478, w: 248 }
const CHIMNEY = chaletChimney(CHALET.x, CHALET.y, CHALET.w)
const FLAG = chaletFlag(CHALET.x, CHALET.y, CHALET.w)
const shed = (g: G2D): void => woodshed(g, 300, 612, 0.95)
const valleyTap = spriteTap({ x: 300, y: 498, s: 0.9, ground: 612, rise: 104, gap: 64 }, shed)
const VALLEY_MIRROR: Pt = [900, 560]

const echoValley: SectorDef = {
  node: 21,
  rvu: 1,
  pots: MIRROR_POTS,
  landmark: { x: 590, y: 200 },
  giftSpot: { x: 800, y: 624 },
  seed: 52,
  accent: C5_ACCENT,
  paint: (g, pot) => {
    skyM(g, { sun: [150, 100], clouds: [[420, 76, 0.7], [800, 110, 0.6], [1060, 60, 0.5]] })
    farPeaks(g, 360, [[470, 260, 190], [600, 300, 250], [740, 250, 170]])
    mountain(g, 120, 440, 560, 360, 0.25, 0.3)
    mountain(g, 1040, 440, 540, 340, -0.25, 0.3)
    // The valley's green slopes.
    hillM(g, [[-40, 700], [-40, 420], [140, 392], [300, 420], [420, 470], [460, 700]])
    hillM(g, [[1200, 700], [1200, 410], [1020, 390], [860, 420], [740, 470], [700, 700]], [-30, 20])
    meadowM(g, VALLEY_TOP, 521)
    alpPine(g, 70, 430, 0.9)
    alpPine(g, 150, 452, 0.7)
    alpPine(g, 1080, 424, 0.92)
    alpPine(g, 1010, 446, 0.66)
    // The winding path down from the chalet door.
    pathway(g, [[590, 478], [560, 520], [620, 568], [700, 606], [660, 650], [620, 700]], 26, 522)
    // The landmark: the chalet.
    chalet(g, CHALET.x, CHALET.y, CHALET.w, pot)
    railFence(g, 380, 560, 520, 540, 4)
    standMirror(g, VALLEY_MIRROR[0], VALLEY_MIRROR[1], 0.86)
    shed(g)
    stone(g, 1090, 640, 120, 60, 1)
    alpFlowers(g, 523, 28, 560, 666, [[560, 470, 200, 200], [700, 560, 220, 112], [180, 480, 240, 140], [840, 460, 120, 110]])
  },
  props: (g, t, alive) => {
    smoke(g, CHIMNEY[0], CHIMNEY[1], t, alive)
    pennant(g, FLAG[0], FLAG[1], 44, 22, PEACHY[0], t, alive)
    if (alive <= 0) return
    mirrorGlint(g, VALLEY_MIRROR[0], VALLEY_MIRROR[1], 0.86, t, alive, 1)
    echoButterflies(g, 576, 360, t, alive, '#ff9fc4', 380)
    // Two doves, each the other's echo across the valley.
    const p = t * 0.35
    for (const d of [-1, 1]) dove(g, 576 + d * (230 + sin(p) * 120), 150 + sin(p * 2) * 24, 1, sin(t * 11), d < 0 ? -1 : 1)
    twinkles(g, [[120, 110, 10], [1040, 130, 10], [620, 120, 9]], t, alive)
  },
  tap: valleyTap
}

/* ── 5-3 · Hall of Mirrors trail — the chapter's rescue ───────────────── */
const TRAIL: readonly Pt[] = [[40, 700], [220, 620], [420, 566], [640, 520], [860, 470], [1060, 420], [1200, 400]]
const BIG_MIRROR = { x: 600, y: 470, s: 1.62 }
const HALL_MIRRORS: readonly (readonly [number, number, number])[] = [[250, 560, 0.9], [930, 452, 0.76], [380, 400, 0.46], [790, 380, 0.42]]
const SHARD: Pt = [470, 592]
const rose = (g: G2D): void => bush(g, 1030, 612, 1.5, '#ff9fc4')
const hallTap = spriteTap({ x: 1030, y: 554, s: 0.85, ground: 648, rise: 108, gap: 60 }, rose)

const hallOfMirrors: SectorDef = {
  node: 22,
  rvu: 1,
  pots: MIRROR_POTS,
  landmark: { x: 600, y: 270 },
  giftSpot: { x: 820, y: 616 },
  seed: 53,
  accent: C5_ACCENT,
  paint: (g, pot) => {
    skyM(g, { sun: [1030, 92], clouds: [[190, 80, 0.7], [470, 56, 0.45], [860, 150, 0.5]] })
    farPeaks(g, 330, [[100, 260, 180], [330, 280, 150], [760, 300, 220], [1000, 280, 200]])
    mountain(g, 930, 380, 520, 290, -0.2)
    mountain(g, 190, 390, 460, 250, 0.3, 0.3)
    meadowM(g, [[-40, 400], [300, 410], [600, 396], [900, 386], [1200, 376]], 531)
    alpPine(g, 1110, 420, 0.8)
    alpPine(g, 60, 440, 0.84)
    pathway(g, TRAIL, 34, 532)
    // Little mirrors up the far slope, then the trail's gilded mirrors.
    for (let i = 2; i < HALL_MIRRORS.length; i++) standMirror(g, HALL_MIRRORS[i]![0], HALL_MIRRORS[i]![1], HALL_MIRRORS[i]![2])
    // The landmark: the great mirror on its plinth, its frame in the pot.
    g.beginPath()
    g.roundRect(BIG_MIRROR.x - 90, BIG_MIRROR.y - 6, 180, 30, 8)
    fill(g, MIR.stone)
    ink(g)
    g.beginPath()
    g.roundRect(BIG_MIRROR.x - 70, BIG_MIRROR.y - 22, 140, 22, 6)
    fill(g, MIR.pearl)
    ink(g, 4)
    standMirror(g, BIG_MIRROR.x, BIG_MIRROR.y - 20, BIG_MIRROR.s, [pot.base, pot.shade, pot.lite])
    for (let i = 0; i < 2; i++) standMirror(g, HALL_MIRRORS[i]![0], HALL_MIRRORS[i]![1], HALL_MIRRORS[i]![2])
    rose(g)
    stone(g, 120, 640, 120, 60, 1)
    alpFlowers(g, 533, 30, 440, 666, [[380, 520, 180, 110], [720, 560, 200, 112], [460, 380, 280, 160], [930, 460, 220, 212], [0, 560, 120, 110]])
  },
  props: (g, t, alive) => {
    if (alive <= 0) return
    mirrorGlint(g, BIG_MIRROR.x, BIG_MIRROR.y - 20, BIG_MIRROR.s, t, alive, 0, 4)
    for (let i = 0; i < 2; i++) mirrorGlint(g, HALL_MIRRORS[i]![0], HALL_MIRRORS[i]![1], HALL_MIRRORS[i]![2], t, alive, 1.3 + i * 1.1)
    const [gx, gy] = glassOf(BIG_MIRROR.x, BIG_MIRROR.y - 20, BIG_MIRROR.s)
    glow(g, gx, gy, 150, alive * (0.35 + 0.15 * sin(t * 1.4)), '#ffffff')
    butterfly(g, 760, 300, t, 1, PEACHY[0], alive)
    butterfly(g, 330, 330, t, 2, MINTY[0], alive)
    twinkles(g, [[600, 80, 12], [250, 380, 9], [930, 300, 9], [380, 300, 7], [790, 290, 7]], t, alive)
  },
  tap: hallTap,
  rescue: { x: SHARD[0], y: SHARD[1] - 80, r: 80, draw: (g, k, t) => mendedShard(g, SHARD[0], SHARD[1], 0.8, k, t) }
}

/* ── 5-4 · Silver Peak Pass ───────────────────────────────────────────── */
const STATION = { x: 250, y: 380 }
const WHEEL: Pt = [STATION.x + 96, STATION.y - 126]
const PYLON: Pt = [786, 300]
const CABLE_SAG = 46
const cableAt = (u: number): Pt => {
  const x = WHEEL[0] + (PYLON[0] - WHEEL[0]) * u
  const y = WHEEL[1] + (PYLON[1] - WHEEL[1]) * u + CABLE_SAG * 4 * u * (1 - u)
  return [x, y]
}
const snowRock = (g: G2D): void => {
  stone(g, 1000, 616, 196, 100, -1)
  lumpy(g, [[950, 540, 20], [982, 524, 24], [1016, 522, 24], [1048, 536, 20]], MIR.snow, 3.5)
}
const peakTap = spriteTap({ x: 1000, y: 518, s: 0.9, ground: 616, rise: 100, gap: 64 }, snowRock)
const PEAK_MIRROR: Pt = [640, 560]

const silverPeakPass: SectorDef = {
  node: 23,
  rvu: 1,
  pots: MIRROR_POTS,
  landmark: { x: 250, y: 180 },
  giftSpot: { x: 470, y: 624 },
  seed: 54,
  accent: C5_ACCENT,
  paint: (g, pot) => {
    skyM(g, { sun: [1060, 86], clouds: [[150, 60, 0.5]] })
    cloudSea(g, 400, 450, 541)
    farPeaks(g, 440, [[430, 220, 170], [620, 260, 230]])
    // Silver Peak itself.
    mountain(g, 930, 520, 640, 470, -0.1, 0.46)
    // The cable's far pylon on the peak's shoulder.
    g.beginPath()
    g.moveTo(PYLON[0] - 26, PYLON[1] + 110)
    g.lineTo(PYLON[0] - 6, PYLON[1])
    g.lineTo(PYLON[0] + 6, PYLON[1])
    g.lineTo(PYLON[0] + 26, PYLON[1] + 110)
    g.lineWidth = 16
    g.strokeStyle = INK
    g.lineJoin = 'round'
    g.stroke()
    g.lineWidth = 7
    g.strokeStyle = GILT[1]
    g.stroke()
    g.beginPath()
    g.roundRect(PYLON[0] - 30, PYLON[1] - 8, 60, 14, 6)
    fill(g, GILT[0])
    ink(g, 3.5)
    // The outcrop the lookout stands on.
    hillM(g, [[-40, 700], [-40, 400], [100, 376], [260, 372], [400, 390], [480, 440], [500, 700]])
    alpPine(g, 430, 450, 0.62)
    stone(g, 70, 400, 90, 44, 1)
    lookout(g, STATION.x, STATION.y, pot)
    g.beginPath()
    g.moveTo(STATION.x, STATION.y - 258)
    g.lineTo(STATION.x, STATION.y - 300)
    ink(g, 3.5)
    alpFlowers(g, 545, 10, 400, 520, [[140, 300, 240, 120], [380, 300, 800, 300]])
    // The cable.
    g.beginPath()
    for (let i = 0; i <= 16; i++) {
      const [x, y] = cableAt(i / 16)
      if (i) g.lineTo(x, y)
      else g.moveTo(x, y)
    }
    ink(g, 3.5)
    meadowM(g, [[-40, 560], [300, 552], [600, 544], [900, 550], [1200, 540]], 542)
    alpPine(g, 40, 580, 0.9)
    alpPine(g, 120, 600, 0.7)
    pathway(g, [[380, 700], [460, 640], [560, 600], [640, 572], [720, 556], [820, 548]], 24, 543)
    standMirror(g, PEAK_MIRROR[0], PEAK_MIRROR[1], 0.8)
    snowRock(g)
    stone(g, 1120, 648, 100, 50, 1)
    alpFlowers(g, 544, 22, 580, 666, [[380, 560, 200, 112], [560, 520, 140, 60], [880, 480, 240, 192], [0, 540, 180, 80]])
  },
  props: (g, t, alive) => {
    pennant(g, STATION.x, STATION.y - 300, 40, 20, PEACHY[0], t, alive)
    // A cabin gliding up and down the cable.
    const u = 0.2 + (alive > 0 ? 0.55 * (0.5 - 0.5 * cos(t * 0.3)) * alive : 0)
    const [cx, cy] = cableAt(u)
    cabin(g, cx, cy, 0.62, MINTY)
    driftCloud(g, 560, 70, 0.6, t, alive, 50)
    if (alive <= 0) return
    mirrorGlint(g, PEAK_MIRROR[0], PEAK_MIRROR[1], 0.8, t, alive, 0.8)
    twinkles(g, [[930, 70, 12], [880, 150, 9], [990, 170, 9], [620, 230, 8], [430, 300, 7]], t, alive)
    for (let i = 0; i < 2; i++) {
      const p = t * 0.08 + i * 0.5
      const k = p % 1
      dove(g, 1200 - k * 1300, 200 + i * 60 + sin(t + i) * 10, 0.9, sin(t * 11 + i), -1)
    }
  },
  tap: peakTap
}

/* ── 5-5 · Echo's Mirror Palace — the boss sector (4× area) ───────────── */
const PAL = { x: 576, y: 462, s: 0.78 }
const STARS = palaceStars(PAL.x, PAL.y, PAL.s)
const POOL = { x: 576, y: 520, rx: 350, ry: 54 }
const hedge = (g: G2D, x: number, y: number, w: number, h: number): void => {
  const path = (): void => {
    g.beginPath()
    g.moveTo(x - w / 2, y)
    g.lineTo(x - w / 2, y - h + 14)
    const n = 5
    for (let i = 0; i < n; i++) {
      const x0 = x - w / 2 + (i / n) * w
      g.quadraticCurveTo(x0 + w / n / 2, y - h - 12, x0 + w / n, y - h + 14)
    }
    g.lineTo(x + w / 2, y)
    g.closePath()
  }
  path()
  fill(g, MIR.pine)
  g.save()
  path()
  g.clip()
  g.beginPath()
  g.rect(x + w * 0.2, y - h - 20, w, h + 20)
  fill(g, MIR.pineShade)
  g.restore()
  path()
  ink(g)
  g.beginPath()
  for (let i = 0; i < 5; i++) {
    const fx = x - w * 0.36 + i * w * 0.18
    const fy = y - h * (0.4 + ((i * 7) % 3) * 0.15)
    g.moveTo(fx + 6, fy)
    g.arc(fx, fy, 6, 0, TAU)
  }
  fill(g, '#ff9fc4')
  ink(g, 2.2)
}
const palaceHedge = (g: G2D): void => hedge(g, 250, 646, 184, 100)
const palaceTap = spriteTap({ x: 250, y: 550, s: 0.85, ground: 646, rise: 98, gap: 60 }, palaceHedge)
const PAL_MIRRORS: readonly Pt[] = [[120, 610], [1032, 610]]

const echosPalace: SectorDef = {
  node: 24,
  rvu: 2,
  pots: MIRROR_POTS,
  landmark: { x: 576, y: 170 },
  giftSpot: { x: 576, y: 640 },
  seed: 55,
  accent: C5_ACCENT,
  paint: (g, pot) => {
    skyM(g, { sun: [1040, 80], rainbow: [576, 470, 500], clouds: [[170, 90, 0.7], [960, 170, 0.5], [380, 50, 0.42]] })
    farPeaks(g, 380, [[120, 260, 200], [330, 240, 150], [820, 240, 150], [1030, 260, 200]])
    mountain(g, 110, 440, 440, 310, 0.2)
    mountain(g, 1042, 440, 440, 300, -0.2)
    meadowM(g, [[-40, 470], [300, 460], [576, 456], [852, 460], [1200, 470]], 551)
    for (const [x, y, s] of [[70, 500, 0.9], [170, 480, 0.66], [1082, 500, 0.9], [982, 480, 0.66]] as const) alpPine(g, x, y, s)
    // The landmark: Echo's palace, and its double in the pool.
    palace(g, PAL.x, PAL.y, PAL.s, pot)
    mirrorLake(g, POOL.x, POOL.y, POOL.rx, POOL.ry, [[PAL.y, () => palace(g, PAL.x, PAL.y, PAL.s, pot)]], 0.45)
    // The path from the pool to the chest.
    g.beginPath()
    g.moveTo(520, 574)
    g.quadraticCurveTo(500, 630, 460, 690)
    g.lineTo(692, 690)
    g.quadraticCurveTo(652, 630, 632, 574)
    g.closePath()
    fill(g, '#ffd46a')
    ink(g, 4)
    for (const [x, y] of PAL_MIRRORS) standMirror(g, x, y, 0.94)
    palaceHedge(g)
    hedge(g, 902, 646, 184, 100)
    alpFlowers(g, 552, 24, 590, 668, [[420, 560, 312, 112], [140, 530, 220, 140], [800, 530, 220, 140], [60, 480, 120, 150], [980, 480, 120, 150]])
  },
  props: (g, t, alive) => {
    for (let i = 0; i < STARS.length; i++) {
      const [x, y] = STARS[i]!
      if (alive > 0) glow(g, x, y, 34, alive * (0.6 + 0.4 * sin(t * 2 + i)), '#fff6c0')
      if (i === 2) continue
      g.beginPath()
      g.moveTo(x, y - 10)
      g.lineTo(x, y - 46)
      ink(g, 3)
      pennant(g, x, y - 46, 40, 20, i ? PEACHY[0] : MINTY[0], t, alive, i * 1.3)
    }
    if (alive <= 0) return
    shimmer(g, [[420, 506], [560, 530], [720, 510], [640, 548], [480, 546]], t, alive)
    const bx = 576 + sin(t * 0.22) * 260
    echoBird(g, bx, 386 + sin(t * 0.8) * 10, PAL.y, [POOL.x, POOL.y, POOL.rx, POOL.ry], 0.9, sin(t * 7), cos(t * 0.22) >= 0 ? 1 : -1, alive)
    for (let i = 0; i < PAL_MIRRORS.length; i++) mirrorGlint(g, PAL_MIRRORS[i]![0], PAL_MIRRORS[i]![1], 0.94, t, alive, i * 1.7)
    echoButterflies(g, 576, 420, t, alive, '#ff9fc4', 700)
    twinkles(g, [[576, 180, 12], [420, 250, 10], [732, 250, 10], [300, 120, 9], [852, 120, 9]], t, alive)
  },
  tap: palaceTap
}

export const C5_SECTORS: readonly SectorDef[] = [mirrorLakeMeadow, echoValley, hallOfMirrors, silverPeakPass, echosPalace]
