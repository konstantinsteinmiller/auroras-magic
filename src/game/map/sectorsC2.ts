/**
 * sectorsC2.ts — chapter 2's five sectors, Bubble Bay (nodes 5–9), composed
 * from `kit.ts` and `kitBay.ts` against `sectorDef.ts` (story-spec §8.7–§8.8,
 * §10.2: "Umbra's tide took the sea unicorns' songs").
 *
 * Every sector: sky → sea → far isles → land → landmark (painted in the
 * picked pot) → dressing. Its props are the sea coming alive: lapping foam,
 * bobbing boats, gulls, twinkles, bubbles. Its tap creature is a sea-unicorn
 * foal peeking out from a different hiding place each time and blowing a
 * bubble ring. Coral Cove (7) holds the chapter's rescue, the Singing Shell.
 */
import type { SectorDef, SectorAccent } from '@/game/map/sectorDef'
import { type Pot, BAY_POTS, C, sky, cottage } from '@/game/map/kit'
import { sin } from '@/game/duel/util'
import {
  type Pt, type PeekSpot, type BoatCols, BAY, sea, farIsles, shore, lap, foam, boulder, cliff, palm, duneGrass, kelp,
  starfish, scallop, shells, branchCoral, fanCoral, brainCoral, anemone, sandcastle, bucket, parasol, lifebuoy,
  beachHut, lighthouse, lampOf, beam, house, bunting, lampPost, crate, barrel, ropeCoil, sailboat, rowboat, jetty,
  quay, bubbles, twinkles, gulls, crab, fishJump, ripples, seaStack, curlWave, peekFoal, singingShell, clam, pearlOf,
  pearlGlow, rockMass, cubicPts, buoy, farBoat
} from '@/game/map/kitBay'

const ACCENT: SectorAccent = { ribbon: '#4fc8ff', ribbonShade: '#2f9fd8', gem: '#7fe0ff' }

/** A little boat's colours, far out on the water. */
const DINGHY: BoatCols = { hull: C.cap, stripe: '#ffffff', sail: '#ffffff', sailBand: '#ffd34d', jib: '#ffffff' }

/** A gentle bob, zero at rest. */
const bob = (t: number, alive: number, amp = 3, f = 1.3): number => (alive > 0 ? sin(t * f) * amp * alive : 0)

/* ── 2-1 · Seashell Beach ─────────────────────────────────────────────── */
const BEACH_SHORE: readonly Pt[] = [[-40, 418], [160, 428], [380, 452], [620, 470], [840, 464], [1000, 450], [1200, 436]]
const beachRock = (g: CanvasRenderingContext2D): void => {
  boulder(g, 1010, 424, 150, 104, -1)
  boulder(g, 934, 430, 76, 46, 1)
  starfish(g, 1042, 386, 15, 0.5, C.flowerPink)
  foam(g, 990, 428, 210)
}
const BEACH_PEEK: PeekSpot = { x: 1008, y: 348, dir: -1, s: 0.8, waterY: 424, rise: 200, lean: -14 }

const seashellBeach: SectorDef = {
  node: 5,
  rvu: 1,
  pots: BAY_POTS,
  landmark: { x: 300, y: 290 },
  giftSpot: { x: 560, y: 600 },
  seed: 21,
  accent: ACCENT,
  paint: (g, pot) => {
    sky(g, { sun: [980, 104], clouds: [[330, 92, 0.9], [660, 64, 0.65], [1080, 230, 0.55]] })
    sea(g, 300, 5)
    farIsles(g, 300, [[150, 220, 34], [330, 110, 18]])
    beachRock(g)
    shore(g, BEACH_SHORE, 51)
    palm(g, 70, 520, 1, 0.3)
    beachHut(g, 300, 482, 190, pot)
    duneGrass(g, [[40, 560, 1], [160, 520, 0.8], [1110, 500, 0.9], [960, 530, 0.7]])
    parasol(g, 760, 560, 0.9, BAY.coralLilac, '#ffffff', '#3ee3d4')
    sandcastle(g, 170, 640, 0.9)
    bucket(g, 270, 652, 0.8, C.flowerPink)
    starfish(g, 900, 630, 20, 0.3)
    scallop(g, 1040, 600, 17, -0.2, '#ffd34d', '#ffffff')
    shells(g, 17, 18, 500, 668, [[440, 470, 250, 200], [640, 480, 270, 110], [80, 560, 250, 112], [0, 470, 120, 80]])
  },
  props: (g, t, alive) => {
    farBoat(g, 560, 322 + bob(t, alive, 2.5), 0.3, DINGHY, 1)
    lap(g, BEACH_SHORE, t, alive, [[-40, 40], [110, 176], [424, 782], [802, 1200]])
    crab(g, 410, 628, 0.9, t, alive, 40)
    if (alive <= 0) return
    twinkles(g, [[210, 350], [470, 380], [760, 340], [640, 420]], t, alive)
    gulls(g, 640, 150, t, alive)
  },
  tap: { x: 1004, y: 370, r: 70, draw: (g, k, t) => peekFoal(g, BEACH_PEEK, k, t, beachRock) }
}

/* ── 2-2 · Lighthouse Point ───────────────────────────────────────────── */
const POINT_SHORE: readonly Pt[] = [[-40, 520], [180, 540], [420, 574], [640, 598], [900, 606], [1200, 596]]
const KEEPER_ROOF: Pot = { id: 'keeper', base: C.cap, shade: '#d9465e', lite: '#ffb3c0' }
const pointWave = (g: CanvasRenderingContext2D): void => curlWave(g, 300, 452, 176, 92, 1)
const POINT_PEEK: PeekSpot = { x: 300, y: 392, dir: -1, s: 0.8, waterY: 452, rise: 200, lean: -10 }
const LAMP = lampOf(820, 432, 0.95)

const lighthousePoint: SectorDef = {
  node: 6,
  rvu: 1,
  pots: BAY_POTS,
  landmark: { x: 820, y: 290 },
  giftSpot: { x: 330, y: 616 },
  seed: 22,
  accent: ACCENT,
  paint: (g, pot) => {
    sky(g, { sun: [170, 100], clouds: [[470, 84, 0.8], [1030, 200, 0.55], [260, 230, 0.45]] })
    sea(g, 320, 6)
    farIsles(g, 320, [[470, 170, 22]])
    cliff(
      g,
      [[540, 640], [556, 540], [600, 478], [690, 444], [820, 430], [980, 432], [1200, 452], [1200, 700], [540, 700]],
      760,
      [[600, 474], [690, 442], [820, 428], [980, 430], [1200, 450]]
    )
    lighthouse(g, 820, 432, 0.95, pot)
    cottage(g, 1036, 446, 124, KEEPER_ROOF)
    duneGrass(g, [[660, 452, 0.7], [930, 440, 0.6], [1130, 460, 0.7]])
    pointWave(g)
    boulder(g, 560, 610, 120, 80, 1)
    boulder(g, 650, 624, 80, 50, -1)
    shore(g, POINT_SHORE, 62)
    // A rock pool with its starfish.
    g.beginPath()
    g.ellipse(120, 614, 96, 34, 0, 0, Math.PI * 2)
    g.fillStyle = BAY.rock
    g.fill()
    g.lineWidth = 5
    g.strokeStyle = '#3A2340'
    g.stroke()
    g.beginPath()
    g.ellipse(120, 610, 74, 22, 0, 0, Math.PI * 2)
    g.fillStyle = BAY.seaMid
    g.fill()
    g.lineWidth = 3.5
    g.stroke()
    starfish(g, 100, 610, 14, 0.4, C.flowerPink)
    anemone(g, 150, 616, 0.5, BAY.coralLilac, '#ffd34d')
    duneGrass(g, [[40, 604, 0.9], [520, 650, 0.7], [1110, 650, 0.9]])
    shells(g, 29, 14, 600, 668, [[210, 540, 250, 140], [0, 570, 230, 80], [480, 560, 240, 90]])
  },
  props: (g, t, alive) => {
    beam(g, LAMP[0], LAMP[1], t, alive)
    farBoat(g, 560, 330 + bob(t, alive, 2.5), 0.28, { ...DINGHY, hull: '#6d8bff', sailBand: C.flowerPink }, -1)
    lap(g, POINT_SHORE, t, alive, [[-40, 490]])
    buoy(g, 520, 470, t, alive)
    if (alive <= 0) return
    twinkles(g, [[120, 380], [420, 410], [180, 480], [640, 360]], t, alive)
    gulls(g, 600, 170, t, alive, 110)
  },
  tap: { x: 300, y: 400, r: 70, draw: (g, k, t) => peekFoal(g, POINT_PEEK, k, t, pointWave) }
}

/* ── 2-3 · Coral Cove (the chapter's rescue: the Singing Shell) ───────── */
const COVE_SHORE: readonly Pt[] = [[-40, 566], [180, 552], [400, 526], [620, 520], [820, 534], [1000, 562], [1200, 584]]
const coveCoral = (g: CanvasRenderingContext2D): void => {
  brainCoral(g, 372, 474, 116, 58, BAY.coralPink, BAY.coralPinkShade)
  foam(g, 372, 474, 136)
}
const COVE_PEEK: PeekSpot = { x: 372, y: 430, dir: 1, s: 0.8, waterY: 474, rise: 180, lean: 6 }
const SHELL: Pt = [560, 494]

const coralCove: SectorDef = {
  node: 7,
  rvu: 1,
  pots: BAY_POTS,
  landmark: { x: 830, y: 430 },
  giftSpot: { x: 300, y: 620 },
  seed: 23,
  accent: ACCENT,
  paint: (g, pot) => {
    sky(g, { sun: [600, 110], clouds: [[420, 70, 0.6], [790, 110, 0.7]] })
    sea(g, 300, 7)
    farIsles(g, 300, [[640, 150, 20]])
    // The shallows: lighter water over sand near the beach.
    g.save()
    g.globalAlpha = 0.5
    g.beginPath()
    g.ellipse(600, 540, 520, 110, 0, 0, Math.PI * 2)
    g.fillStyle = BAY.seaLite
    g.fill()
    g.restore()
    cliff(
      g,
      [[-40, 600], [-40, 170], [60, 150], [180, 188], [256, 258], [300, 350], [318, 460], [300, 600]],
      200,
      [[-40, 168], [60, 148], [180, 186], [254, 254]]
    )
    cliff(
      g,
      [[870, 620], [884, 430], [918, 310], [1000, 232], [1100, 210], [1200, 218], [1200, 620]],
      1060,
      [[924, 300], [1000, 230], [1100, 208], [1200, 216]]
    )
    palm(g, 110, 176, 0.7, 0.45)
    palm(g, 1090, 214, 0.62, -0.5)
    coveCoral(g)
    boulder(g, SHELL[0], 512, 170, 34, 1)
    foam(g, SHELL[0], 512, 190)
    shore(g, COVE_SHORE, 73)
    // The landmark: a coral garden on its rock, in the picked pot.
    boulder(g, 840, 584, 190, 54, -1)
    fanCoral(g, 910, 556, 0.8, pot.lite, pot.shade)
    branchCoral(g, 810, 560, 1.55, pot.base, pot.shade, 9, pot.lite)
    branchCoral(g, 890, 566, 0.8, pot.shade, pot.shade, 4)
    branchCoral(g, 170, 600, 0.7, BAY.coralOrange, BAY.coralOrangeShade, 12)
    anemone(g, 240, 612, 0.7, BAY.coralLilac, '#ffd34d')
    anemone(g, 1040, 640, 0.8, BAY.coralPink, '#ffffff')
    starfish(g, 700, 630, 18, 0.2)
    scallop(g, 980, 610, 15, 0.3, '#ffd34d', '#ffffff')
    shells(g, 41, 12, 590, 668, [[180, 520, 250, 160], [440, 480, 240, 120], [720, 540, 300, 80]])
  },
  props: (g, t, alive) => {
    lap(g, COVE_SHORE, t, alive, [[322, 700]])
    kelp(g, 690, 514, 84, bob(t, alive, 14, 1.1), 3)
    if (alive <= 0) return
    bubbles(g, 470, 470, 140, t, alive)
    bubbles(g, 760, 500, 150, t + 1.3, alive, 3)
    fishJump(g, 620, 420, 130, 70, t, 4.2, alive, BAY.coralOrange)
    twinkles(g, [[420, 350], [700, 330], [560, 400]], t, alive)
    crab(g, 1000, 626, 0.8, t, alive, 34)
  },
  tap: { x: 372, y: 420, r: 70, draw: (g, k, t) => peekFoal(g, COVE_PEEK, k, t, coveCoral) },
  rescue: { x: SHELL[0], y: SHELL[1] - 44, r: 62, draw: (g, k, t) => singingShell(g, SHELL[0], SHELL[1], 0.9, k, t) }
}

/* ── 2-4 · Harbour Jetty ──────────────────────────────────────────────── */
const harbourRowboat = (g: CanvasRenderingContext2D): void => rowboat(g, 890, 566, 0.95, '#6d8bff', -1)
const HARBOUR_PEEK: PeekSpot = { x: 900, y: 520, dir: 1, s: 0.78, waterY: 560, rise: 180, lean: 46 }

const harbourJetty: SectorDef = {
  node: 8,
  rvu: 1,
  pots: BAY_POTS,
  landmark: { x: 420, y: 440 },
  giftSpot: { x: 720, y: 650 },
  seed: 24,
  accent: ACCENT,
  paint: (g, pot) => {
    sky(g, { sun: [160, 100], clouds: [[460, 96, 0.8], [800, 70, 0.6]] })
    sea(g, 318, 8)
    farIsles(g, 318, [[160, 200, 26], [420, 90, 14]])
    // The town bank across the harbour.
    g.beginPath()
    g.moveTo(590, 392)
    g.bezierCurveTo(640, 320, 760, 296, 880, 290)
    g.bezierCurveTo(1000, 286, 1100, 270, 1200, 262)
    g.lineTo(1200, 392)
    g.closePath()
    g.fillStyle = C.moss
    g.fill()
    g.lineWidth = 5
    g.strokeStyle = '#3A2340'
    g.stroke()
    const HOUSES: readonly (readonly [number, number, number, string, string])[] = [
      [680, 60, 54, C.flowerPink, C.cap], [744, 76, 50, '#ffd34d', '#6d8bff'], [810, 64, 58, '#4fe0ae', '#ffa45c'],
      [878, 86, 52, BAY.coralLilac, C.cap], [946, 70, 56, '#6db8ff', '#ffd34d'], [1016, 80, 50, C.flowerPink, '#6d8bff'],
      [1086, 66, 58, '#ffd34d', C.cap]
    ]
    for (const [x, h, w, wall, roof] of HOUSES) house(g, x, 372, w, h, wall, roof)
    // The harbour wall under the town.
    g.beginPath()
    g.roundRect(580, 366, 640, 30, 6)
    g.fillStyle = C.stone
    g.fill()
    g.lineWidth = 5
    g.stroke()
    g.beginPath()
    for (let x = 640; x < 1152; x += 64) {
      g.moveTo(x, 370)
      g.lineTo(x, 392)
    }
    g.lineWidth = 2.4
    g.stroke()
    jetty(g, -20, 700, 470, 74)
    lampPost(g, 110, 450, 110)
    lampPost(g, 560, 450, 110)
    bunting(g, 110, 312, 560, 312, 46, [C.flowerPink, '#ffd34d', '#3ee3d4', BAY.coralLilac])
    crate(g, 250, 450, 34)
    crate(g, 284, 450, 26)
    // The landmark: the big sailboat moored at the jetty, sails in the picked pot.
    sailboat(g, 420, 580, 1.1, { hull: '#ffffff', stripe: pot.shade, sail: pot.base, sailBand: pot.lite, jib: '#ffffff' }, -1)
    harbourRowboat(g)
    quay(g, 616, 88)
    crate(g, 70, 660, 50)
    crate(g, 128, 664, 36)
    barrel(g, 1060, 664, 0.9)
    ropeCoil(g, 960, 666, 34)
    lifebuoy(g, 190, 640, 20)
  },
  props: (g, t, alive) => {
    farBoat(g, 1060, 452 + bob(t, alive, 2), 0.3, { ...DINGHY, hull: '#ffd34d', sailBand: '#3ee3d4' }, 1)
    if (alive <= 0) return
    ripples(g, 740, 550, 70, t, alive)
    fishJump(g, 620, 590, 110, 60, t, 5, alive, '#ffd34d')
    twinkles(g, [[300, 380], [980, 470], [700, 420], [180, 560]], t, alive)
    gulls(g, 560, 160, t, alive, 160)
  },
  tap: { x: 910, y: 520, r: 72, draw: (g, k, t) => peekFoal(g, HARBOUR_PEEK, k, t, harbourRowboat) }
}

/* ── 2-5 · Pearl's Lagoon — the boss sector (4× area) ─────────────────── */
const LAGOON_SHORE: readonly Pt[] = [[-40, 536], [160, 556], [380, 592], [576, 602], [770, 592], [990, 556], [1200, 536]]
const lagoonStack = (g: CanvasRenderingContext2D): void => seaStack(g, 836, 522, 84, 130)
const LAGOON_PEEK: PeekSpot = { x: 836, y: 410, dir: -1, s: 0.75, waterY: 522, rise: 240, lean: -8 }
const PEARL = pearlOf(576, 452, 165)
const ARCH_CAP: readonly Pt[] = [
  ...cubicPts([66, 486], [40, 250], [210, 34], [576, 34], 0.42, 1, 7),
  ...cubicPts([576, 34], [942, 34], [1112, 250], [1086, 486], 0.08, 0.58, 6)
]

const pearlsLagoon: SectorDef = {
  node: 9,
  rvu: 2,
  pots: BAY_POTS,
  landmark: { x: 576, y: 350 },
  giftSpot: { x: 576, y: 640 },
  seed: 25,
  accent: ACCENT,
  paint: (g, pot) => {
    sky(g, { sun: [1010, 96], rainbow: [576, 520, 360], clouds: [[170, 90, 0.7], [760, 64, 0.5], [420, 150, 0.45]] })
    sea(g, 332, 9)
    farIsles(g, 332, [[380, 150, 22], [790, 110, 16]])
    // The great sea arch, capped with grass and sea-pinks.
    rockMass(g, () => {
      g.beginPath()
      g.moveTo(66, 486)
      g.bezierCurveTo(40, 250, 210, 34, 576, 34)
      g.bezierCurveTo(942, 34, 1112, 250, 1086, 486)
      g.lineTo(912, 486)
      g.bezierCurveTo(914, 330, 800, 176, 576, 176)
      g.bezierCurveTo(352, 176, 238, 330, 240, 486)
      g.closePath()
    }, [60, 60, 1030, 420], 31, [30, 26], ARCH_CAP, 0.55)
    g.beginPath()
    for (let i = 1; i < ARCH_CAP.length - 1; i += 2) {
      const [x, y] = ARCH_CAP[i]!
      g.moveTo(x + 8, y - 4)
      g.arc(x, y - 4, 8, 0, Math.PI * 2)
    }
    g.fillStyle = C.flowerPink
    g.fill()
    g.lineWidth = 2.4
    g.strokeStyle = '#3A2340'
    g.stroke()
    starfish(g, 150, 330, 22, 0.3, C.flowerPink)
    scallop(g, 1010, 300, 20, 0.2, '#ffd34d', '#ffffff')
    foam(g, 153, 486, 200)
    foam(g, 999, 486, 200)
    // The calm lagoon: glassy light under the arch, the pearl's reflection.
    g.save()
    g.globalAlpha = 0.4
    g.beginPath()
    g.ellipse(576, 540, 470, 90, 0, 0, Math.PI * 2)
    g.fillStyle = BAY.seaLite
    g.fill()
    g.globalAlpha = 0.8
    g.beginPath()
    for (const [y, w] of [[540, 70], [556, 50], [570, 28]] as const) {
      g.moveTo(576 - w, y)
      g.lineTo(576 + w, y)
    }
    g.lineWidth = 5
    g.lineCap = 'round'
    g.strokeStyle = '#ffffff'
    g.stroke()
    g.restore()
    lagoonStack(g)
    // Pearl's clam on its rock: the landmark.
    boulder(g, 576, 516, 330, 84, 1)
    foam(g, 576, 516, 350)
    clam(g, 576, 452, 165, pot)
    shore(g, LAGOON_SHORE, 97)
    palm(g, 40, 604, 1.1, 0.35)
    palm(g, 1112, 596, 1.05, -0.4)
    branchCoral(g, 290, 604, 0.8, BAY.coralPink, BAY.coralPinkShade, 5)
    anemone(g, 370, 632, 0.7, BAY.coralOrange, '#ffffff')
    fanCoral(g, 966, 622, 0.66, BAY.coralLilac, BAY.coralLilacShade)
    duneGrass(g, [[120, 640, 0.9], [1030, 640, 0.9]])
    starfish(g, 800, 646, 18, 0.5)
    shells(g, 53, 14, 600, 668, [[420, 520, 312, 160], [0, 560, 90, 120], [1060, 560, 100, 120], [250, 560, 150, 80], [900, 560, 140, 80]])
  },
  props: (g, t, alive) => {
    lap(g, LAGOON_SHORE, t, alive, [[92, 244], [336, 900], [1030, 1076]])
    kelp(g, 318, 540, 64, bob(t, alive, 12, 1.1), 2)
    kelp(g, 734, 546, 56, bob(t + 1, alive, 12, 1.1), 2)
    if (alive <= 0) return
    pearlGlow(g, PEARL[0], PEARL[1], PEARL[2], t, alive)
    ripples(g, 576, 530, 220, t, alive)
    bubbles(g, 420, 540, 150, t, alive)
    bubbles(g, 690, 546, 160, t + 1.7, alive, 3)
    fishJump(g, 250, 520, 120, 76, t, 4.6, alive, '#ffd34d')
    twinkles(g, [[300, 440], [768, 456], [460, 300], [700, 250]], t, alive)
    gulls(g, 360, 120, t, alive, 100)
  },
  tap: { x: 836, y: 430, r: 64, draw: (g, k, t) => peekFoal(g, LAGOON_PEEK, k, t, lagoonStack) }
}

export const C2_SECTORS: readonly SectorDef[] = [seashellBeach, lighthousePoint, coralCove, harbourJetty, pearlsLagoon]
