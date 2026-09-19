/**
 * sectorsC7.ts — chapter 7, Sunken Sands (nodes 30–34; story-spec §10.2:
 * "Time stands still over the frozen sandfalls", Guardian Ember, warm and a
 * little dramatic, who has been holding the hourglass alone). Composed from
 * `kit.ts`, `kitRidge.ts` and `kitSands.ts` against `sectorDef.ts`, like
 * chapters 1–3: sky → far dunes → mesas → the sand → landmark → dressing.
 *
 *   7-1 Oasis Camp        — the caravan tent's STRIPES
 *   7-2 Sandfall Cliffs   — the adobe house's onion DOME
 *   7-3 Sundial Plaza     — the sundial's RIM and COLUMN; the stopped Sand-Clock sleeps here
 *   7-4 Caravan Market    — the big stall's AWNING
 *   7-5 Ember's Hourglass Temple — the boss sector (4× area): the giant hourglass's CAPS, DOME and PILLARS
 *
 * Every sector has the chapter's tap creature (§8.8): a sand-fox pup who
 * pops up from behind a tent, out of the sand, from behind a glazed pot or a
 * stack of baskets, or out of its burrow by the temple, holding up a trinket.
 * Once restored, time flows again: sandfalls pour, palms sway, the sundial's
 * shadow creeps round, lanterns bob and the hourglass runs.
 */
import type { SectorDef, SectorAccent } from '@/game/map/sectorDef'
import { type G2D, type Pot, SANDS_POTS, fill, ink, flower } from '@/game/map/kit'
import { K, pennant } from '@/game/map/kitSky'
import { candyHill, swallow, glints, type Tones } from '@/game/map/kitRidge'
import { duneGrass } from '@/game/map/kitBay'
import {
  SS, MESA, MESA_B, sandSky, farDunes, dunes, sandHeap, sandMound, sandfall, sandFlow, sandPuffs, sandGlints,
  palmTrunk, palmTop, palmCrown, cactus, oasis, camel, tent, tentFlag, ridgeTent, domeHouse, domeFinial, pyramid, sundial,
  dialCentre, dialShadow, plaza, arcade, stall, lanterns, rug, cushion, amphora, basketStack, brazier, flame, hgTower,
  hgTemple, hourglassOf, hgStream, foxTap, clockRescue
} from '@/game/map/kitSands'
import { sin, cos } from '@/game/duel/util'

/** The chapter's gift ribbon and chest gem (§8.2): desert orange. */
export const C7_ACCENT: SectorAccent = { ribbon: '#ff8a4d', ribbonShade: '#e0652a', gem: '#ffc9a8' }
export const C7_POTS = SANDS_POTS

const P_PINK: Pot = { id: 'pink', base: '#ff7fbf', shade: '#e2579f', lite: '#ffc4e1' }
const P_TEAL: Pot = { id: 'teal', base: '#45d6e0', shade: '#22aab8', lite: '#b8f4f8' }
const P_LILAC: Pot = { id: 'lilac', base: '#a77cff', shade: '#8558e8', lite: '#dccbff' }
const T_PINK: Tones = ['#ff7fbf', '#e2579f', '#ffc4e1']
const T_MINT: Tones = ['#45deb0', '#22b58c', '#aaf3dc']
const T_SAND: Tones = [SS.stone, SS.stoneShade, SS.stoneLite]
const LANTERNS = [SS.coral, '#45d6e0', SS.gold, '#a77cff'] as const

/** Palm sway (rad), zero at rest. */
const sway = (t: number, alive: number, ph = 0): number => (alive > 0 ? sin(t * 1.3 + ph) * 0.07 * alive : 0)

const mesaPath = (g: G2D, pts: readonly (readonly [number, number])[]): void => {
  g.beginPath()
  g.moveTo(pts[0]![0], pts[0]![1])
  for (let i = 1; i < pts.length - 2; i += 3) {
    const a = pts[i]!
    const b = pts[i + 1]!
    const c = pts[i + 2]!
    g.bezierCurveTo(a[0], a[1], b[0], b[1], c[0], c[1])
  }
  g.closePath()
}

/* ── 7-1 · Oasis Camp ────────────────────────────────────────────────────── */
const TENT = { x: 862, y: 520, w: 290 }
const FLAG = tentFlag(TENT.x, TENT.y, TENT.w)
const PALMS_1 = [[56, 560, 1.05, 0.34], [470, 512, 0.9, -0.36]] as const
const campTent = (g: G2D): void => ridgeTent(g, 1070, 624, 150, P_LILAC.base, K.wall)

const oasisCamp: SectorDef = {
  node: 30,
  rvu: 1,
  pots: SANDS_POTS,
  landmark: { x: TENT.x, y: 380 },
  giftSpot: { x: 494, y: 648 },
  seed: 71,
  accent: C7_ACCENT,
  paint: (g, pot) => {
    sandSky(g, { sun: [170, 100], puffs: [[540, 80, 0.7], [880, 58, 0.55], [1070, 190, 0.4]] })
    farDunes(g, 312, 356, 71, [[960, 160, 100], [1070, 100, 60]])
    candyHill(g, () => mesaPath(g, [
      [-40, 700], [-40, 400], [-40, 260], [-40, 250],
      [20, 226], [180, 222], [250, 250], [300, 280], [320, 420], [340, 700]
    ]), [-40, 222, 380, 480], MESA, { lip: [[-30, 256], [40, 234], [190, 234], [250, 256]], capCol: SS.sand, capLip: SS.sandLite, seed: 21, band: 36 })
    dunes(g, [[-40, 470], [140, 448], [360, 466], [560, 452], [780, 472], [1000, 452], [1200, 468]], 711)
    oasis(g, 252, 520, 168, 38)
    duneGrass(g, [[96, 560, 0.7], [400, 546, 0.6], [330, 566, 0.5]])
    for (const [x, c] of [[140, '#ff7fbf'], [170, '#ffd84d'], [380, '#a77cff'], [214, '#ff7fbf']] as const) flower(g, x, 568 + (x % 5), 9, c, x)
    for (const [x, y, s, l] of PALMS_1) palmTrunk(g, x, y, s, l)
    tent(g, TENT.x, TENT.y, TENT.w, pot)
    camel(g, 684, 556, 0.8, -1)
    rug(g, TENT.x, 576, 220, 36, SS.coral, '#45d6e0')
    cushion(g, TENT.x - 88, 576, 44, '#a77cff')
    cushion(g, TENT.x + 90, 580, 40, '#45d6e0')
    cactus(g, 1120, 520, 0.56)
    cactus(g, 230, 646, 0.66, '#ffd84d')
    campTent(g)
  },
  props: (g, t, alive) => {
    for (let i = 0; i < PALMS_1.length; i++) {
      const [x, y, s, l] = PALMS_1[i]!
      const [tx, ty] = palmTop(x, y, s, l)
      palmCrown(g, tx, ty, s, l, sway(t, alive, i * 1.7))
    }
    pennant(g, FLAG[0], FLAG[1], 50, 24, SS.coral, t, alive)
    lanterns(g, [TENT.x + 150, 410], [1070, 470], 12, [LANTERNS[1], LANTERNS[2]], t, alive)
    if (alive <= 0) return
    glints(g, [[190, 510, 9], [300, 534, 8], [370, 506, 10], [150, 540, 7]], t, alive, '#ffffff')
    sandGlints(g, 80, 580, 1000, 80, t, alive)
    swallow(g, 480 + sin(t * 0.3) * 200, 180 + sin(t * 0.8) * 20, 0.8, sin(t * 9), cos(t * 0.3) >= 0 ? 1 : -1, '#ff7fbf')
  },
  tap: foxTap({ x: 1070, y: 624, s: 0.62, hid: 720, out: 552, item: 'gem' }, campTent)
}

/* ── 7-2 · Sandfall Cliffs ───────────────────────────────────────────────── */
const FALL_L = { x: 350, top: 240, bot: 526, w: 72 }
const FALL_R = { x: 876, top: 216, bot: 526, w: 86 }
const DOME = { x: 590, y: 456, w: 190 }
const DOME_TOP = domeFinial(DOME.x, DOME.y, DOME.w)
const cliffMound = (g: G2D): void => sandMound(g, 960, 616, 140, 44)

const sandfallCliffs: SectorDef = {
  node: 31,
  rvu: 1,
  pots: SANDS_POTS,
  landmark: { x: DOME.x, y: 320 },
  giftSpot: { x: 290, y: 630 },
  seed: 72,
  accent: C7_ACCENT,
  paint: (g, pot) => {
    sandSky(g, { sun: [590, 92], puffs: [[240, 80, 0.62], [960, 70, 0.7], [420, 200, 0.4]] })
    farDunes(g, 332, 380, 72, [[470, 110, 70], [712, 150, 96]])
    candyHill(g, () => {
      g.beginPath()
      g.moveTo(-40, 700)
      g.lineTo(-40, 240)
      g.bezierCurveTo(-20, 222, 40, 214, 120, 212)
      g.lineTo(300, 214)
      g.quadraticCurveTo(318, 214, 322, 228)
      g.quadraticCurveTo(350, 250, 378, 228)
      g.quadraticCurveTo(384, 214, 400, 216)
      g.bezierCurveTo(430, 222, 440, 260, 444, 320)
      g.bezierCurveTo(448, 420, 452, 560, 456, 700)
      g.closePath()
    }, [-40, 210, 500, 490], MESA, { lip: [[-30, 242], [60, 220], [296, 220]], capCol: SS.sand, capLip: SS.sandLite, seed: 22, band: 38 })
    candyHill(g, () => {
      g.beginPath()
      g.moveTo(750, 700)
      g.bezierCurveTo(752, 520, 758, 300, 780, 232)
      g.bezierCurveTo(790, 202, 810, 192, 836, 192)
      g.quadraticCurveTo(846, 192, 850, 206)
      g.quadraticCurveTo(876, 226, 902, 206)
      g.quadraticCurveTo(906, 190, 922, 188)
      g.bezierCurveTo(1000, 180, 1150, 180, 1200, 186)
      g.lineTo(1200, 700)
      g.closePath()
    }, [750, 180, 450, 520], MESA_B, { lip: [[930, 194], [1060, 186], [1200, 190]], capCol: SS.sand, capLip: SS.sandLite, seed: 23, band: 40 })
    cactus(g, 150, 218, 0.46)
    cactus(g, 1090, 188, 0.4, '#ffd84d')
    sandfall(g, FALL_L.x, FALL_L.top, FALL_L.bot, FALL_L.w)
    sandfall(g, FALL_R.x, FALL_R.top, FALL_R.bot, FALL_R.w)
    dunes(g, [[410, 600], [470, 488], [590, 448], [712, 482], [780, 600]], 721)
    domeHouse(g, DOME.x, DOME.y, DOME.w, pot)
    sandHeap(g, FALL_L.x, 540, 150, 44)
    sandHeap(g, FALL_R.x, 540, 172, 48)
    dunes(g, [[-40, 548], [180, 530], [420, 556], [620, 566], [860, 536], [1040, 548], [1200, 540]], 722)
    pyramid(g, 1080, 560, 120, 84, T_SAND)
    cactus(g, 140, 606, 0.8)
    cactus(g, 1110, 620, 0.56, '#ffd84d')
    cliffMound(g)
  },
  props: (g, t, alive) => {
    sandFlow(g, FALL_L.x, FALL_L.top, FALL_L.bot, FALL_L.w, t, alive)
    sandFlow(g, FALL_R.x, FALL_R.top, FALL_R.bot, FALL_R.w, t + 0.9, alive)
    g.beginPath()
    g.moveTo(DOME_TOP[0], DOME_TOP[1] + 4)
    g.lineTo(DOME_TOP[0], DOME_TOP[1] - 34)
    ink(g, 3)
    pennant(g, DOME_TOP[0], DOME_TOP[1] - 34, 44, 20, '#45d6e0', t, alive)
    if (alive <= 0) return
    sandPuffs(g, FALL_L.x, 520, FALL_L.w, t, alive)
    sandPuffs(g, FALL_R.x, 520, FALL_R.w, t + 0.5, alive)
    sandGlints(g, 60, 440, 1040, 160, t, alive, 7)
    for (let i = 0; i < 2; i++) {
      const p = t * (0.3 + i * 0.07) + i * 3
      swallow(g, 590 + cos(p) * (260 - i * 60), 140 + i * 50 + sin(p * 2) * 20, 0.8, sin(t * 9 + i), -sin(p) >= 0 ? 1 : -1, i ? '#45d6e0' : '#ff7fbf')
    }
  },
  tap: foxTap({ x: 960, y: 616, s: 0.62, hid: 740, out: 604, item: 'shell', dig: true }, cliffMound)
}

/* ── 7-3 · Sundial Plaza — the chapter's rescue ──────────────────────────── */
const DIAL = { x: 720, y: 584, s: 1 }
const DIAL_C = dialCentre(DIAL.x, DIAL.y, DIAL.s)
const DOMES_3 = [[150, '#a77cff'], [576, '#45d6e0'], [1010, '#ff7fbf']] as const
const ARC_TOP = 440 - 150
const PALM_3 = [1080, 470, 0.86, -0.3] as const
const CLOCK = { x: 380, y: 574, s: 1.05 }
const plazaPot = (g: G2D): void => amphora(g, 140, 628, 0.8, '#45d6e0', '#22aab8')

const sundialPlaza: SectorDef = {
  node: 32,
  rvu: 1,
  pots: SANDS_POTS,
  landmark: { x: DIAL.x, y: DIAL_C[1] + 30 },
  giftSpot: { x: 990, y: 632 },
  seed: 73,
  accent: C7_ACCENT,
  paint: (g, pot) => {
    sandSky(g, { sun: [1030, 96], puffs: [[300, 80, 0.7], [700, 60, 0.5], [120, 190, 0.4]] })
    farDunes(g, 300, 336, 73, [[330, 120, 70]])
    arcade(g, -20, 1172, 440, 150, 7, DOMES_3)
    palmTrunk(g, PALM_3[0], PALM_3[1], PALM_3[2], PALM_3[3])
    plaza(g, 440)
    // A round planter at the palm's foot.
    g.beginPath()
    g.roundRect(PALM_3[0] - 50, PALM_3[1] - 20, 100, 44, [6, 6, 18, 18])
    fill(g, SS.coral)
    ink(g)
    g.beginPath()
    g.roundRect(PALM_3[0] - 56, PALM_3[1] - 28, 112, 16, 8)
    fill(g, SS.gold)
    ink(g, 3.5)
    sundial(g, DIAL.x, DIAL.y, DIAL.s, pot)
    cushion(g, CLOCK.x, CLOCK.y + 16, 168, '#45d6e0')
    plazaPot(g)
  },
  props: (g, t, alive) => {
    dialShadow(g, DIAL_C[0], DIAL_C[1], 104 * DIAL.s, 0.95 + (alive > 0 ? t * 0.35 * alive : 0))
    for (let i = 0; i < DOMES_3.length; i++) {
      const x = DOMES_3[i]![0]
      g.beginPath()
      g.moveTo(x, ARC_TOP - 90)
      g.lineTo(x, ARC_TOP - 122)
      ink(g, 3)
      pennant(g, x, ARC_TOP - 122, 40, 18, i === 1 ? SS.coral : SS.gold, t, alive, i * 1.4)
    }
    const [tx, ty] = palmTop(PALM_3[0], PALM_3[1], PALM_3[2], PALM_3[3])
    palmCrown(g, tx, ty, PALM_3[2], PALM_3[3], sway(t, alive))
    if (alive <= 0) return
    sandGlints(g, 60, 470, 1040, 150, t, alive, 6)
    for (let i = 0; i < 2; i++) {
      const p = t * (0.28 + i * 0.07) + i * 2.4
      swallow(g, 480 + cos(p) * (300 - i * 70), 150 + i * 44 + sin(p * 2) * 18, 0.8, sin(t * 9 + i), -sin(p) >= 0 ? 1 : -1, i ? '#a77cff' : '#45d6e0')
    }
  },
  tap: foxTap({ x: 140, y: 628, s: 0.62, hid: 740, out: 552, item: 'coin' }, plazaPot),
  rescue: clockRescue(CLOCK.x, CLOCK.y, CLOCK.s)
}

/* ── 7-4 · Caravan Market ────────────────────────────────────────────────── */
const STALLS = [[216, 566, 196, P_PINK, 3], [590, 566, 256, null, 1], [964, 566, 196, P_TEAL, 5]] as const
const corners = (x: number, y: number, w: number): readonly [readonly [number, number], readonly [number, number]] => {
  const top = y - w * 0.86
  return [[x - w * 0.56 + 8, top + 30], [x + w * 0.56 - 8, top + 30]]
}
const C_L = corners(STALLS[0][0], STALLS[0][1], STALLS[0][2])
const C_M = corners(STALLS[1][0], STALLS[1][1], STALLS[1][2])
const C_R = corners(STALLS[2][0], STALLS[2][1], STALLS[2][2])
const PALM_4 = [40, 470, 0.9, 0.3] as const
const marketBaskets = (g: G2D): void => basketStack(g, 404, 628, 0.84)

const caravanMarket: SectorDef = {
  node: 33,
  rvu: 1,
  pots: SANDS_POTS,
  landmark: { x: STALLS[1][0], y: 340 },
  giftSpot: { x: 800, y: 634 },
  seed: 74,
  accent: C7_ACCENT,
  paint: (g, pot) => {
    sandSky(g, { sun: [160, 100], puffs: [[500, 70, 0.7], [860, 110, 0.55], [1080, 50, 0.45]] })
    farDunes(g, 316, 356, 74, [[860, 150, 96], [990, 100, 60]])
    domeHouse(g, 120, 452, 120, P_TEAL)
    domeHouse(g, 1060, 450, 130, P_PINK)
    pyramid(g, 760, 452, 150, 100, T_SAND)
    palmTrunk(g, PALM_4[0], PALM_4[1], PALM_4[2], PALM_4[3])
    dunes(g, [[-40, 452], [300, 446], [600, 452], [900, 444], [1200, 452]], 741)
    for (const [x, y, w, p, goods] of STALLS) stall(g, x, y, w, p ?? pot, goods)
    rug(g, 1010, 640, 170, 28, '#a77cff', SS.coral)
    amphora(g, 76, 640, 0.6)
    amphora(g, 1120, 610, 0.5, '#a77cff', '#8558e8')
    marketBaskets(g)
  },
  props: (g, t, alive) => {
    lanterns(g, C_L[1], C_M[0], 30, [LANTERNS[0], LANTERNS[1]], t, alive)
    lanterns(g, C_M[1], C_R[0], 30, [LANTERNS[2], LANTERNS[3]], t + 1, alive)
    const [tx, ty] = palmTop(PALM_4[0], PALM_4[1], PALM_4[2], PALM_4[3])
    palmCrown(g, tx, ty, PALM_4[2], PALM_4[3], sway(t, alive))
    if (alive <= 0) return
    sandGlints(g, 60, 560, 1040, 90, t, alive, 6)
    for (let i = 0; i < 2; i++) {
      const k = (t * 0.05 + i * 0.5) % 1
      swallow(g, -60 + k * 1300, 150 + i * 60 + sin(t * 1.3 + i) * 12, 0.8, sin(t * 9 + i * 2), 1, i ? '#45d6e0' : '#ff7fbf')
    }
  },
  tap: foxTap({ x: 404, y: 628, s: 0.62, hid: 740, out: 530, item: 'key' }, marketBaskets)
}

/* ── 7-5 · Ember's Hourglass Temple — the boss sector (4× area) ──────────── */
const TEMPLE = { x: 576, y: 520 }
const HG = hourglassOf(TEMPLE.x, TEMPLE.y)
const TOWERS = [[106, 520, T_PINK, '#45d6e0'], [1046, 520, T_MINT, SS.coral]] as const
const TOWER_FLAGS = [[106, 520 - 210 - 10 - 70 - 12], [1046, 520 - 210 - 10 - 70 - 12]] as const
const FIRES = [[250, 580], [902, 580]] as const
const FIRE_TOPS = FIRES.map(([x, y]) => [x, y - 64 * 0.9] as const)
const templeMound = (g: G2D): void => sandMound(g, 1006, 632, 130, 42)

const hourglassTemple: SectorDef = {
  node: 34,
  rvu: 2,
  pots: SANDS_POTS,
  landmark: { x: TEMPLE.x, y: HG.mid },
  giftSpot: { x: 576, y: 640 },
  seed: 75,
  accent: C7_ACCENT,
  paint: (g, pot) => {
    sandSky(g, { sun: [1040, 88], puffs: [[190, 70, 0.7], [700, 46, 0.5], [880, 190, 0.4]] })
    farDunes(g, 368, 404, 75, [[250, 170, 110], [390, 110, 70], [880, 130, 80]])
    dunes(g, [[-40, 520], [300, 514], [576, 522], [860, 514], [1200, 520]], 751)
    for (const [x, y, tones] of TOWERS) hgTower(g, x, y, 1, tones)
    hgTemple(g, TEMPLE.x, TEMPLE.y, pot)
    for (const [x, y] of FIRES) brazier(g, x, y, 0.9)
    cactus(g, 60, 640, 0.76)
    cactus(g, 1110, 648, 0.6, '#ffd84d')
    templeMound(g)
  },
  props: (g, t, alive) => {
    hgStream(g, HG.x, HG.mid, HG.bot, t, alive)
    for (let i = 0; i < FIRE_TOPS.length; i++) flame(g, FIRE_TOPS[i]![0], FIRE_TOPS[i]![1], 0.9, t + i * 0.7, alive)
    for (let i = 0; i < TOWER_FLAGS.length; i++) {
      const [x, y] = TOWER_FLAGS[i]!
      g.beginPath()
      g.moveTo(x, y + 4)
      g.lineTo(x, y - 34)
      ink(g, 3)
      pennant(g, x, y - 34, 48, 22, TOWERS[i]![3], t, alive, i * 1.6)
    }
    if (alive <= 0) return
    glints(g, [[HG.x - 150, HG.mid - 60, 12], [HG.x + 160, HG.mid - 20, 11], [HG.x - 120, HG.top - 40, 10], [HG.x + 110, HG.bot + 10, 9]], t, alive)
    sandGlints(g, 60, 540, 1040, 90, t, alive, 6)
    for (let i = 0; i < 2; i++) {
      const p = t * (0.3 + i * 0.08) + i * 3
      swallow(g, 576 + cos(p) * (420 - i * 90), 130 + i * 70 + sin(p * 2) * 26, 0.85 - i * 0.15, sin(t * 9 + i), -sin(p) >= 0 ? 1 : -1, i ? '#45d6e0' : '#ff7fbf')
    }
  },
  tap: foxTap({ x: 1006, y: 632, s: 0.62, hid: 760, out: 620, item: 'star', dig: true }, templeMound)
}

export const C7_SECTORS: readonly SectorDef[] = [oasisCamp, sandfallCliffs, sundialPlaza, caravanMarket, hourglassTemple]
