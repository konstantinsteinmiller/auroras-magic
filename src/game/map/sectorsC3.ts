/**
 * sectorsC3.ts — chapter 3, Cloud Kingdom (nodes 10–14; story-spec §10.2:
 * "An endless storm has grounded the baby pegasi", Guardian Zephyr). Composed
 * from `kit.ts` and `kitSky.ts` against `sectorDef.ts`, like chapter 1:
 * sky → far cloud sea → cloud hills → the cloud ground → landmark → props.
 *
 *   3-1 Balloon Meadow   — the moored balloon's striped ENVELOPE
 *   3-2 Rainbow Bridge   — the dome cottage's ROOF
 *   3-3 Pegasus Stables  — the stable ROOFS; the chapter's rescue sleeps here
 *   3-4 Wind-Vane Tower  — the tower's cone ROOF
 *   3-5 Zephyr's Castle  — the boss sector (4× area): the castle's ROOFS
 *
 * Every sector has the chapter's tap creature (§8.8): a baby pegasus that
 * hops up from behind a cloud tuft, a planter, a haystack, a kite basket or
 * a hedge — a different colour on each sector.
 */
import type { SectorAccent, SectorDef, TapCreature } from '@/game/map/sectorDef'
import { tapCover } from '@/game/map/tapCover'
import { SKY_POTS, C, fill, ink, fence, smoke, type G2D } from '@/game/map/kit'
import {
  K, PINK, MINT, LEMON, PEG, type PegLook, skyK, cloudSea, farIsle, cloud, cloudRow, tuft, puffTree, starStones,
  skyFlowers, pole, balloon, miniBalloon, rainbowBridge, domeCottage, domeChimney, stable, stableFlag, windTower,
  towerVane, skyCastle, castleFlags, lampPost,
  planter, haystack, kiteBasket, topiary, nestBack, nestFront, pennant, bunting, pinwheel, pinStick, kite, vane,
  dove, flyer, twinkles, babyPegasus, joy, zzz, skyPuff, sparkle, star5, star5At, STAR_ART
} from '@/game/map/kitSky'
import { drawItem } from '@/game/artItem'
import { sectorShowsArt } from '@/game/map/sectorArt'
import { sin, cos, TAU, clamp, ease } from '@/game/duel/util'

/** The chapter's gift ribbon and chest gem (§8.2): sunny gold. */
const ACCENT: SectorAccent = { ribbon: '#ffd84d', ribbonShade: '#e8b030', gem: '#fff176' }
const REST = 0.35
const FLAGS = [K.pink, K.lemon, K.mint, '#56b6ff', K.coral] as const

/**
 * A baby pegasus hiding behind `cover` (whose base is at (x, y), `h` tall):
 * at k = 0 only the cover shows; at k = 1 the pegasus stands on top of it,
 * hopping, wings flapping.
 */
const pegTap = (x: number, y: number, h: number, look: PegLook, dir: number, s: number, cover: (g: G2D) => void): TapCreature => ({
  x,
  y: y - h * 0.55,
  r: 72,
  draw: (g, k, t) => {
    const e = ease(clamp(k, 0, 1))
    if (e > 0) {
      const hop = Math.abs(sin(t * 8)) * 16 * e
      const feet = y + 130 * s + (-(h - 8) - 130 * s) * e - hop
      g.save()
      g.beginPath()
      g.rect(x - 240, y - 480, 480, 480)
      g.clip()
      babyPegasus(g, x, feet, s, dir, look, { up: 1, wings: e, flap: sin(t * 16) * 0.45 * e, eye: 1 })
      g.restore()
    }
    tapCover(g, cover)
  }
})

/* ── 3-1 · Balloon Meadow ────────────────────────────────────────────────── */
const ROPE: readonly [number, number, number, number] = [366, 488, 548, 556]
const t10 = pegTap(960, 612, 108, PEG.pink, -1, 0.7, (g) => tuft(g, 960, 612, 1.4))
const balloonMeadow: SectorDef = {
  node: 10,
  rvu: 1,
  pots: SKY_POTS,
  landmark: { x: 330, y: 276 },
  giftSpot: { x: 720, y: 596 },
  seed: 31,
  accent: ACCENT,
  paint: (g, pot) => {
    skyK(g, { sun: [1010, 100], puffs: [[690, 84, 0.9], [110, 120, 0.55], [1000, 256, 0.5]] })
    cloudSea(g, 332, 372, 11)
    farIsle(g, 820, 316, 170, 3)
    cloud(g, [[760, 476, 58], [850, 440, 78], [975, 412, 96], [1105, 424, 88], [1190, 456, 70]], 700)
    puffTree(g, 880, 452, 0.62, PINK)
    puffTree(g, 1070, 430, 0.82, MINT)
    cloudRow(g, -40, 472, 1200, 500, 56, 12, 10)
    starStones(g, [[470, 664, 26], [420, 618, 23], [382, 578, 20], [352, 545, 17]])
    balloon(g, 330, 280, 120, pot)
    // The mooring rope from the basket to its peg (its flags are props).
    g.beginPath()
    g.moveTo(ROPE[0], ROPE[1])
    g.quadraticCurveTo((ROPE[0] + ROPE[2]) / 2, (ROPE[1] + ROPE[3]) / 2 + 36, ROPE[2], ROPE[3])
    ink(g, 3)
    pole(g, ROPE[2], ROPE[3] + 26, 26)
    cloud(g, [[-30, 650, 60], [60, 640, 48], [150, 664, 44]])
    tuft(g, 960, 612, 1.4)
    tuft(g, 1100, 560, 0.8)
    tuft(g, 190, 520, 0.7)
    skyFlowers(g, 51, 30, 520, 664, [[600, 470, 240, 200], [860, 520, 200, 110], [320, 510, 190, 170], [0, 600, 200, 80]])
  },
  props: (g, t, alive) => {
    miniBalloon(g, 620 + sin(t * 0.21) * 40 * alive, 196 + sin(t * 0.9) * 10 * alive, 34, K.pink)
    miniBalloon(g, 870 + sin(t * 0.17 + 2) * 46 * alive, 250 + sin(t * 0.8 + 1) * 10 * alive, 26, K.mint)
    g.beginPath()
    g.moveTo(330, 160)
    g.lineTo(330, 126)
    ink(g, 3)
    pennant(g, 330, 126, 46, 22, K.pink, t, alive)
    // The rope itself is paint (above) on this very curve: over a PAINTED
    // sector only the flags are live (B14); the drawing keeps its cord.
    bunting(g, ROPE[0], ROPE[1], ROPE[2], ROPE[3], 18, FLAGS, 4, t, alive, !sectorShowsArt(10))
    if (alive <= 0) return
    for (let i = 0; i < 2; i++) {
      const k = ((t * 0.05 + i * 0.5) % 1)
      dove(g, -60 + k * 1300, 150 + i * 70 + sin(t * 1.3 + i) * 12, 1.1, sin(t * 11 + i * 2), 1)
    }
  },
  tap: t10
}

/* ── 3-2 · Rainbow Bridge ────────────────────────────────────────────────── */
const ARCH = { x0: 300, x1: 790, y: 492, h: 196 }
const ARC = (() => {
  const c = (ARCH.x1 - ARCH.x0) / 2
  const R = (c * c + ARCH.h * ARCH.h) / (2 * ARCH.h)
  const a = Math.asin(c / R)
  return { cx: (ARCH.x0 + ARCH.x1) / 2, cy: ARCH.y - ARCH.h + R, R, a0: -Math.PI / 2 - a, a1: -Math.PI / 2 + a }
})()
const CHIMNEY = domeChimney(950, 486, 190)
const t11 = pegTap(150, 596, 124, PEG.mint, 1, 0.68, (g) => planter(g, 150, 596, 1))
const rainbowBridgeSector: SectorDef = {
  node: 11,
  rvu: 1,
  pots: SKY_POTS,
  landmark: { x: 950, y: 356 },
  giftSpot: { x: 770, y: 640 },
  seed: 32,
  accent: ACCENT,
  paint: (g, pot) => {
    skyK(g, { sun: [150, 106], puffs: [[520, 72, 0.8], [880, 96, 0.9], [330, 226, 0.45]] })
    cloudSea(g, 420, 470, 23)
    // The left island.
    cloud(g, [
      [-20, 504, 70], [80, 478, 70], [190, 486, 70], [290, 504, 60], [352, 534, 46],
      [30, 590, 84], [160, 604, 92], [290, 590, 70], [90, 686, 90], [240, 690, 80], [180, 540, 80]
    ])
    puffTree(g, 70, 488, 0.78, LEMON)
    // The right island.
    cloud(g, [
      [700, 530, 54], [778, 492, 70], [896, 468, 84], [1026, 462, 88], [1150, 476, 80],
      [740, 600, 76], [880, 608, 100], [1040, 600, 100], [1180, 620, 80], [800, 694, 86], [990, 700, 96],
      [960, 540, 84], [1110, 670, 74], [1150, 560, 64], [820, 540, 60]
    ])
    puffTree(g, 1100, 470, 0.74, PINK)
    rainbowBridge(g, ARCH.x0, ARCH.x1, ARCH.y, ARCH.h)
    tuft(g, ARCH.x0 + 4, ARCH.y + 26, 1.05)
    tuft(g, ARCH.x1 - 4, ARCH.y + 20, 1.05)
    domeCottage(g, 950, 486, 190, pot)
    planter(g, 150, 596, 1)
    skyFlowers(g, 63, 22, 520, 650, [[380, 440, 330, 240], [690, 470, 220, 202], [60, 470, 190, 150], [840, 420, 220, 90]])
  },
  props: (g, t, alive) => {
    // A little cloud drifting through the gap under the bridge.
    skyPuff(g, 520 + sin(t * 0.18) * 50 * alive, 586, 0.5)
    if (alive <= 0) return
    // A glint running along the rainbow's crest.
    const k = (t * 0.22) % 1.3
    if (k < 1) {
      const a = ARC.a0 + (ARC.a1 - ARC.a0) * k
      const R = ARC.R - 9
      g.globalAlpha = alive * sin(k * Math.PI)
      g.beginPath()
      g.arc(ARC.cx, ARC.cy, R, a - 0.1, a + 0.1)
      g.lineWidth = 6
      g.strokeStyle = '#ffffff'
      g.stroke()
      sparkle(g, ARC.cx + cos(a) * R, ARC.cy + sin(a) * R, 17)
      g.globalAlpha = 1
    }
    smoke(g, CHIMNEY[0], CHIMNEY[1], t, alive)
    for (let i = 0; i < 2; i++) {
      const p = t * 0.3 + i * 3.1
      dove(g, 545 + cos(p) * 110, 470 + sin(p * 2) * 26 + i * 40, 1, sin(t * 11 + i * 2), -sin(p) >= 0 ? 1 : -1)
    }
  },
  tap: t11
}

/* ── 3-3 · Pegasus Stables — the chapter's rescue ────────────────────────── */
const NEST = { x: 420, y: 540 }
/** The nest's front, as a stable identity so `tapCover` can cache its stamp. */
const nestCover = (g: G2D): void => nestFront(g, NEST.x, NEST.y, 1)
const CUPOLA = stableFlag(770, 488, 300)
const t12 = pegTap(150, 616, 114, PEG.peach, 1, 0.68, (g) => haystack(g, 150, 616, 1))
const pegasusStables: SectorDef = {
  node: 12,
  rvu: 1,
  pots: SKY_POTS,
  landmark: { x: 770, y: 292 },
  giftSpot: { x: 870, y: 640 },
  seed: 33,
  accent: ACCENT,
  paint: (g, pot) => {
    skyK(g, { sun: [1000, 96], rainbow: [210, 450, 250], puffs: [[440, 76, 0.8], [640, 150, 0.5]] })
    cloudSea(g, 322, 364, 37)
    cloud(g, [[-30, 452, 80], [80, 420, 88], [210, 430, 78], [320, 462, 60]], 700)
    puffTree(g, 80, 432, 0.7, LEMON)
    puffTree(g, 236, 452, 0.55, PINK)
    cloudRow(g, -40, 486, 1200, 474, 54, 13, 6)
    stable(g, 770, 488, 300, pot)
    fence(g, 250, 506, 6, 38, -4)
    // A water trough by the stalls.
    g.beginPath()
    g.roundRect(1016, 552, 110, 40, [4, 4, 12, 12])
    fill(g, C.trunk)
    ink(g)
    g.beginPath()
    g.ellipse(1071, 554, 50, 9, 0, 0, TAU)
    fill(g, C.pond)
    ink(g, 3)
    haystack(g, 150, 616, 1)
    nestBack(g, NEST.x, NEST.y, 1)
    nestFront(g, NEST.x, NEST.y, 1)
    cloud(g, [[1130, 660, 60], [1040, 676, 44]])
    skyFlowers(g, 71, 24, 520, 664, [[310, 470, 230, 110], [780, 490, 200, 182], [40, 480, 230, 150], [990, 520, 150, 80]])
  },
  props: (g, t, alive) => {
    pennant(g, CUPOLA[0], CUPOLA[1], 44, 20, K.coral, t, alive, 1)
    if (alive <= 0) return
    // The pegasi fly again: two of them looping over the meadow.
    for (let i = 0; i < 2; i++) {
      const p = t * (0.42 + i * 0.1) + i * 2.4
      const x = 470 + cos(p) * (300 - i * 60)
      const y = 150 + i * 60 + sin(p * 2) * 36
      g.globalAlpha = alive
      flyer(g, x, y, 0.9 - i * 0.2, sin(t * 9 + i) * 0.5, -sin(p) >= 0 ? 1 : -1, i ? PEG.lemon : PEG.pink)
    }
    g.globalAlpha = 1
    twinkles(g, [[330, 200, 12], [620, 120, 10], [920, 250, 11], [140, 300, 9]], t, alive)
  },
  tap: t12,
  rescue: {
    x: NEST.x + 8,
    y: NEST.y - 42,
    r: 80,
    draw: (g, k, t) => {
      const e = ease(clamp(k, 0, 1))
      const hover = e * (12 + sin(t * 2.6) * 6)
      babyPegasus(g, NEST.x - 6, NEST.y - 8 - hover, 1.05, 1, PEG.sky, {
        up: e, wings: e, flap: e * sin(t * 7) * 0.3, eye: clamp(k * 2 - 0.5, 0, 1), dim: 1 - e
      })
      // The nest is in this sector's `paint()`, so its front comes out of
      // the PAINTING (`tapCover.ts`) rather than being drawn a second time.
      tapCover(g, nestCover)
      zzz(g, NEST.x + 70, NEST.y - 76, t, 1 - clamp(k * 3, 0, 1))
      joy(g, NEST.x, NEST.y - 150, t, clamp((k - 0.4) / 0.6, 0, 1))
    }
  }
}

/* ── 3-4 · Wind-Vane Tower ───────────────────────────────────────────────── */
const KITE_POST: readonly [number, number] = [400, 540]
const VANE = towerVane(840, 452, 200)
const PINS = [[210, 548, 110, K.pink, K.lemon], [284, 580, 88, '#56b6ff', K.mint], [120, 590, 96, K.coral, K.lilac]] as const
const t13 = pegTap(1010, 618, 92, PEG.lemon, -1, 0.7, (g) => kiteBasket(g, 1010, 618, 1))
const windVaneTower: SectorDef = {
  node: 13,
  rvu: 1,
  pots: SKY_POTS,
  landmark: { x: 840, y: 172 },
  giftSpot: { x: 600, y: 610 },
  seed: 34,
  accent: ACCENT,
  paint: (g, pot) => {
    skyK(g, { sun: [150, 100], puffs: [[560, 70, 0.8], [1040, 250, 0.5], [340, 250, 0.42]] })
    cloudSea(g, 334, 374, 41)
    farIsle(g, 390, 334, 140, 2)
    cloud(g, [[600, 478, 58], [700, 446, 80], [830, 430, 96], [960, 438, 90], [1090, 446, 90], [1190, 466, 70]], 700)
    puffTree(g, 1060, 446, 0.7, PINK)
    windTower(g, 840, 452, 200, pot)
    cloudRow(g, -40, 494, 1200, 484, 52, 14, 4)
    // The kite post, its three strings rise to the kites (props).
    pole(g, KITE_POST[0], KITE_POST[1] + 20, 44)
    for (const [x, y, h] of PINS) pinStick(g, x, y, h)
    kiteBasket(g, 1010, 618, 1)
    tuft(g, 1110, 560, 0.8)
    tuft(g, 760, 520, 0.7)
    skyFlowers(g, 83, 26, 520, 664, [[500, 470, 220, 200], [900, 500, 220, 180], [60, 430, 280, 200], [350, 500, 100, 80]])
  },
  props: (g, t, alive) => {
    const [ax, ay] = [KITE_POST[0], KITE_POST[1] - 24]
    const kites = [[250, 180, 0.9, K.pink, K.lemon], [470, 112, 1, '#56b6ff', K.mint], [640, 250, 0.78, K.coral, K.lilac]] as const
    for (let i = 0; i < kites.length; i++) {
      const [x, y, s, c1, c2] = kites[i]!
      const bob = sin(t * 1.1 + i * 2) * 14 * alive
      const drift = sin(t * 0.6 + i) * 18 * alive
      const tilt = (1 - alive) * 0.5 * (i - 1) + sin(t * 1.3 + i) * 0.2 * alive
      kite(g, x + drift, y + bob + (1 - alive) * 40, s, c1, c2, tilt, t * 3 * alive + i, ax, ay)
    }
    for (let i = 0; i < PINS.length; i++) {
      const [x, y, h, c1, c2] = PINS[i]!
      pinwheel(g, x, y - h, 26, REST + i + alive * t * (3 + i * 0.6), c1, c2)
    }
    vane(g, VANE[0], VANE[1], REST + alive * t * 1.2)
  },
  tap: t13
}

/* ── 3-5 · Zephyr's Sky Castle — the boss sector (4× area) ───────────────── */
const FLAG_FEET = castleFlags(576, 504)
const LAMPS = [[488, 524, 30], [664, 524, 30], [392, 624, 60], [760, 624, 60]] as const
const t14 = pegTap(170, 614, 154, PEG.lilac, 1, 0.7, (g) => topiary(g, 170, 614, 1))
const zephyrsCastle: SectorDef = {
  node: 14,
  rvu: 2,
  pots: SKY_POTS,
  landmark: { x: 576, y: 190 },
  giftSpot: { x: 576, y: 640 },
  seed: 35,
  accent: ACCENT,
  paint: (g, pot) => {
    skyK(g, { sun: [1050, 92], rainbow: [576, 500, 500], puffs: [[180, 80, 0.7], [900, 170, 0.5], [390, 50, 0.45]] })
    cloudSea(g, 352, 392, 53)
    farIsle(g, 120, 330, 150, 2)
    farIsle(g, 1040, 346, 120, 1)
    cloud(g, [[-30, 470, 80], [100, 446, 86], [230, 466, 70], [300, 488, 50]], 700)
    cloud(g, [[850, 488, 50], [930, 462, 70], [1050, 444, 88], [1180, 462, 80]], 700)
    puffTree(g, 86, 456, 0.72, PINK)
    puffTree(g, 1070, 450, 0.76, MINT)
    puffTree(g, 950, 476, 0.48, LEMON)
    cloudRow(g, -40, 498, 1200, 498, 54, 15, 14)
    skyCastle(g, 576, 504, pot)
    // Puffs hugging the castle's feet, clear of the gate.
    cloud(g, [[330, 508, 44], [400, 516, 36], [290, 520, 34]])
    cloud(g, [[822, 508, 44], [752, 516, 36], [862, 520, 34]])
    // The golden path from the gate down to the chest.
    g.beginPath()
    g.moveTo(538, 504)
    g.quadraticCurveTo(520, 600, 470, 690)
    g.lineTo(682, 690)
    g.quadraticCurveTo(632, 600, 614, 504)
    g.closePath()
    fill(g, C.path)
    ink(g, 4)
    starStones(g, [[576, 530, 12], [576, 574, 15]])
    for (const [x, y, h] of LAMPS) lampPost(g, x, y, h)
    topiary(g, 170, 614, 1)
    tuft(g, 990, 600, 1.1)
    cloud(g, [[1110, 650, 60], [1180, 620, 50], [1030, 676, 44]])
    cloud(g, [[-10, 676, 50], [60, 690, 40]])
    skyFlowers(g, 97, 28, 540, 664, [[400, 490, 360, 190], [60, 470, 220, 190], [900, 520, 180, 110], [1000, 580, 160, 100]])
  },
  props: (g, t, alive) => {
    for (let i = 0; i < FLAG_FEET.length; i++) {
      const [x, y] = FLAG_FEET[i]!
      g.beginPath()
      g.moveTo(x, y)
      g.lineTo(x, y - 34)
      ink(g, 3)
      pennant(g, x, y - 34, i === 4 ? 56 : 44, i === 4 ? 26 : 20, i === 4 ? K.lemon : i & 1 ? K.pink : K.mint, t, alive, i * 1.3)
    }
    // The star lamps light up.
    for (let i = 0; i < LAMPS.length; i++) {
      const [x, y, h] = LAMPS[i]!
      if (alive <= 0) break
      const glow = alive * (0.22 + 0.1 * sin(t * 2 + i))
      g.globalAlpha = glow
      g.beginPath()
      g.arc(x, y - h - 14, 36, 0, TAU)
      fill(g, '#fff1a8')
      g.beginPath()
      g.arc(x, y - h - 14, 25, 0, TAU)
      fill(g, '#fff1a8')
      g.globalAlpha = alive
      // The lamp is LIT by this star: on a painted sector the lamp's own star
      // is in the painting, so the lit one is blitted over it at the painted
      // star's size (`lampPost`'s radius 10) — the painted star turning pale,
      // never a second, larger star round it (B14).
      g.save()
      g.translate(x, y - h - 14)
      const lit = drawItem(g, STAR_ART, 10, 0, '#fffbe0')
      g.restore()
      if (!lit && !star5At(g, x, y - h - 14, 11, '#fffbe0')) {
        fill(g, '#fffbe0')
        ink(g, 2)
      }
      g.globalAlpha = 1
    }
    if (alive <= 0) return
    for (let i = 0; i < 2; i++) {
      const p = t * (0.36 + i * 0.08) + i * 3
      const x = 576 + cos(p) * (440 - i * 90)
      const y = 150 + i * 90 + sin(p * 2) * 40
      g.globalAlpha = alive
      flyer(g, x, y, 0.8 - i * 0.16, sin(t * 9 + i) * 0.5, -sin(p) >= 0 ? 1 : -1, i ? PEG.mint : PEG.pink)
    }
    g.globalAlpha = 1
    twinkles(g, [[360, 150, 13], [800, 110, 12], [250, 330, 10], [930, 330, 11], [576, 20, 10], [690, 300, 9]], t, alive)
  },
  tap: t14
}

export const C3_SECTORS: readonly SectorDef[] = [balloonMeadow, rainbowBridgeSector, pegasusStables, windVaneTower, zephyrsCastle]
