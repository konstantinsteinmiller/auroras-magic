/**
 * sectorsC9.ts — chapter 9, Starlight Summit (nodes 40–44; story-spec §10.2:
 * "The night sky has gone dark; the stars need reigniting", Guardian Nova
 * (new)). Composed from `kit.ts`, `kitTundra.ts` and `kitSummit.ts` against
 * `sectorDef.ts`, like chapters 1–3: the night sky → far peaks → lilac rock
 * → the moon-meadow → landmark (in the picked pot) → dressing.
 *
 *   9-1 Lantern Path     — the Great Lantern's PAPER
 *   9-2 Observatory      — the telescope DOME
 *   9-3 Star Garden      — the giant star-lily's PETALS; the chapter's rescue,
 *                          a Fallen Star, lies asleep in the grass here
 *   9-4 Moon Bridge      — the bridge's ARCH and rails
 *   9-5 Nova's Throne    — the boss sector (4× area): the throne's STAR back
 *
 * Its props are the summit's night waking up: constellations lighting up
 * line by line, shooting stars, lanterns and glowing flowers breathing,
 * fireflies, the moon shimmering on the water. Every sector has the
 * chapter's tap creature (§8.8): a star-calf in a different bell collar that
 * blinks awake and peeks out from behind a stone lantern, a crate of star
 * charts, a flower bush, a mossy rock or a star urn.
 */
import type { SectorDef, SectorAccent, TapCreature } from '@/game/map/sectorDef'
import { SUMMIT_POTS, ink, fireflies, fence, type G2D } from '@/game/map/kit'
import { type Glow, type Pt, glows, winks, shootingStar, lampCrook, crookGlow } from '@/game/map/kitTundra'
import {
  N, BLUE_N, PINK_N, GOLD_T, CALF, type CalfLook, type CalfSpot,
  skyN, constellation, farPeaks, rockHill, meadowN, goldPath, starDress, starFlower, stoneLantern, stoneGlow,
  greatLantern, greatLanternAt, observatory, telescope, starLily, lilyHeart, moonPond, lilyPad, moonBridge,
  bridgeGlows, bridgeReflection, throne, throneOrbs, throneHalo, starCrate, moonRock, starBush, starUrn,
  peekCalf, fallenStar, starBed, flowerGlows, moonTree, scopeMouth, roundStar, halo
} from '@/game/map/kitSummit'
import { sin, cos, TAU, PI } from '@/game/duel/util'

/** The chapter's gift ribbon and chest gem (§8.2): night periwinkle. */
export const C9_ACCENT: SectorAccent = { ribbon: '#8c8cff', ribbonShade: '#6464e0', gem: '#d0d0ff' }
export const C9_POTS = SUMMIT_POTS

/** A star-calf hiding behind `cover`: out at `spot`, in the collar `look`.
 *  The tap spot `ty` sits over the cover, big enough to take the calf too. */
const calfTap = (spot: CalfSpot, look: CalfLook, cover: (g: G2D) => void, ty: number, r = 76): TapCreature => ({
  x: spot.x + (spot.lean ?? 0) * 0.6,
  y: ty,
  r,
  draw: (g, k, t) => peekCalf(g, spot, k, t, look, cover)
})

/** Heart-shaped constellation points about (x, y), size `s`. */
const heartStars = (x: number, y: number, s: number): Pt[] => [
  [x, y + 40 * s], [x - 34 * s, y + 6 * s], [x - 38 * s, y - 24 * s], [x - 16 * s, y - 36 * s], [x, y - 18 * s],
  [x + 16 * s, y - 36 * s], [x + 38 * s, y - 24 * s], [x + 34 * s, y + 6 * s]
]
const HEART_LINKS = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 0]] as const

/* ── 9-1 · Lantern Path ─────────────────────────────────────────────────── */
const LP = { x: 936, y: 404, h: 300 }
const LP_LAMP = greatLanternAt(LP.x, LP.y, LP.h)
const LP_PATH: readonly Pt[] = [[90, 700], [200, 612], [380, 590], [560, 548], [720, 500], [850, 440], [920, 404]]
const LP_POSTS = [[300, 586, 110, 1, N.pink], [640, 516, 104, -1, N.blue], [790, 462, 96, 1, N.pink]] as const
const LP_STONES = [[150, 574, 0.8], [500, 598, 0.8]] as const
const LP_CALF = { x: 1046, y: 632, s: 1.08 }
const lpCover = (g: G2D): void => stoneLantern(g, LP_CALF.x, LP_CALF.y, LP_CALF.s)
const LP_GLOWS: readonly Glow[] = [
  ...LP_POSTS.map(([x, y, h, d]) => crookGlow(x, y, h, d)), ...LP_STONES.map(([x, y, s]) => stoneGlow(x, y, s)), stoneGlow(LP_CALF.x, LP_CALF.y, LP_CALF.s)
]
const LP_HEART = heartStars(560, 116, 1.2)
const lanternPath: SectorDef = {
  node: 40,
  rvu: 1,
  pots: C9_POTS,
  landmark: { x: LP_LAMP[0], y: LP_LAMP[1] },
  giftSpot: { x: 600, y: 650 },
  seed: 91,
  accent: C9_ACCENT,
  paint: (g, pot) => {
    skyN(g, { moon: [150, 104, 44], stars: 91, milky: [640, 20, 1180, 250] })
    farPeaks(g, 360, 91, 6)
    rockHill(g, 560, 1230, 930, 404, 462)
    moonTree(g, 1110, 452, 0.62, PINK_N)
    meadowN(g, 480, 520, 530, 40)
    goldPath(g, LP_PATH, 54)
    moonTree(g, 70, 520, 0.9, BLUE_N)
    moonTree(g, 420, 520, 0.56, PINK_N)
    greatLantern(g, LP.x, LP.y, LP.h, pot)
    for (const [x, y, h, d, c] of LP_POSTS) lampCrook(g, x, y, h, c, d)
    for (const [x, y, s] of LP_STONES) stoneLantern(g, x, y, s)
    lpCover(g)
    starDress(g, 401, 26, 540, 664, [[500, 480, 200, 190], [960, 520, 170, 150], [60, 560, 140, 110], [260, 540, 90, 70]])
  },
  props: (g, t, alive) => {
    constellation(g, LP_HEART, HEART_LINKS, t, alive)
    glows(g, LP_GLOWS, t, alive, '#fff1a8')
    halo(g, LP_LAMP[0], LP_LAMP[1], LP_LAMP[2] * 1.02, LP_LAMP[2] * 1.75, t, alive)
    glows(g, [[LP_LAMP[0] - 5, LP_LAMP[1], LP_LAMP[2] * 0.36]], t, alive, '#fff8d0')
    if (alive <= 0) return
    fireflies(g, 160, 400, 700, 200, t, alive)
    shootingStar(g, 300, 40, 320, 110, t, alive, 6)
    winks(g, [[380, 60, 11], [800, 40, 10], [1060, 180, 9], [260, 240, 8]], t, alive)
  },
  tap: calfTap({ x: LP_CALF.x - 8, y: LP_CALF.y - 96, s: 0.8, dir: -1, rise: 150, ground: LP_CALF.y - 40 * LP_CALF.s, lean: -30 }, CALF.pink!, lpCover, LP_CALF.y - 90, 80)
}

/* ── 9-2 · Observatory ─────────────────────────────────────────────────── */
const OB = { x: 780, y: 432, w: 216 }
const OB_SCOPE = -0.34
/** The Little Dipper-ish kite the telescope is looking at. */
const OB_STARS: readonly Pt[] = [[150, 70], [240, 110], [330, 96], [400, 150], [480, 130], [520, 200], [430, 226]]
const OB_LINKS = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]] as const
const OB_MOUTH = scopeMouth(OB.x, OB.y, OB.w, OB_SCOPE)
const OB_CRATE = { x: 1046, y: 632, s: 1 }
const obCover = (g: G2D): void => starCrate(g, OB_CRATE.x, OB_CRATE.y, OB_CRATE.s)
const OB_STONES = [[560, 560, 0.8], [960, 520, 0.7]] as const
const OB_GLOWS: readonly Glow[] = [
  ...OB_STONES.map(([x, y, s]) => stoneGlow(x, y, s)),
  [OB.x - OB.w * 0.24, OB.y - OB.w * 0.9 * 0.7 + OB.w * 0.1, 40], [OB.x + OB.w * 0.24, OB.y - OB.w * 0.9 * 0.7 + OB.w * 0.1, 40]
]
const observatorySector: SectorDef = {
  node: 41,
  rvu: 1,
  pots: C9_POTS,
  landmark: { x: OB.x, y: OB.y - OB.w * 0.9 - 60 },
  giftSpot: { x: 300, y: 646 },
  seed: 92,
  accent: C9_ACCENT,
  paint: (g, pot) => {
    skyN(g, { moon: [1040, 96, 40], stars: 92, milky: [-20, 280, 640, 0] })
    farPeaks(g, 366, 92, 7)
    rockHill(g, 470, 1230, 800, 432, 480)
    moonTree(g, 1110, 470, 0.66, PINK_N)
    meadowN(g, 490, 520, 540, 41)
    // Steps from the observatory's door down to the lawn.
    goldPath(g, [[780, 432], [740, 470], [660, 512], [560, 560], [470, 620], [420, 700]], 50)
    observatory(g, OB.x, OB.y, OB.w, pot, OB_SCOPE)
    moonTree(g, 90, 540, 0.9, BLUE_N)
    moonTree(g, 250, 520, 0.6, PINK_N)
    telescope(g, 150, 640, 1, -0.6)
    for (const [x, y, s] of OB_STONES) stoneLantern(g, x, y, s)
    obCover(g)
    starDress(g, 402, 24, 560, 664, [[210, 500, 180, 170], [980, 540, 150, 120], [90, 560, 120, 100], [380, 560, 200, 120]])
  },
  props: (g, t, alive) => {
    constellation(g, OB_STARS, OB_LINKS, t, alive)
    constellation(g, heartStars(1010, 214, 0.66), HEART_LINKS, t + 1.3, alive)
    glows(g, OB_GLOWS, t, alive, '#fff1a8')
    if (alive <= 0) return
    // The telescope's lens glints now and then.
    const [mx, my] = OB_MOUTH
    const u = (t * 0.4) % 1
    g.globalAlpha = alive * Math.max(0, sin(u * PI * 2))
    winks(g, [[mx, my, 16]], PI / 4.4, 1)
    g.globalAlpha = 1
    fireflies(g, 80, 440, 600, 180, t, alive)
    shootingStar(g, 620, 30, 300, 100, t, alive, 6.5, 2)
    winks(g, [[640, 90, 10], [960, 40, 11], [580, 260, 8], [60, 200, 9]], t, alive)
  },
  tap: calfTap({ x: OB_CRATE.x - 4, y: OB_CRATE.y - 72, s: 0.8, dir: -1, rise: 150, ground: OB_CRATE.y }, CALF.mint!, obCover, OB_CRATE.y - 70)
}

/* ── 9-3 · Star Garden — the chapter's rescue ─────────────────────────── */
const SG_LILY = { x: 256, y: 572, s: 0.95 }
const SG_STAR = { x: 626, y: 552 }
const SG_BUSH = { x: 1064, y: 628, s: 1 }
const sgCover = (g: G2D): void => starBush(g, SG_BUSH.x, SG_BUSH.y, SG_BUSH.s)
const SG_STONES = [[480, 616, 0.8], [764, 604, 0.8]] as const
const SG_FLOWERS: readonly Glow[] = [[150, 612, 26], [420, 520, 22], [830, 520, 24], [980, 470, 22], [720, 640, 24]]
const SG_GLOWS: readonly Glow[] = SG_STONES.map(([x, y, s]) => stoneGlow(x, y, s))
const starGarden: SectorDef = {
  node: 42,
  rvu: 1,
  pots: C9_POTS,
  landmark: { x: SG_LILY.x + 20 * SG_LILY.s, y: SG_LILY.y - 300 * SG_LILY.s },
  giftSpot: { x: 900, y: 640 },
  seed: 93,
  accent: C9_ACCENT,
  paint: (g, pot) => {
    skyN(g, { moon: [990, 100, 38], stars: 93, milky: [300, 0, 1152, 240] })
    farPeaks(g, 370, 93, 6)
    rockHill(g, 560, 1230, 1000, 420, 470)
    moonTree(g, 800, 480, 0.56, BLUE_N)
    moonTree(g, 1110, 470, 0.7, PINK_N)
    meadowN(g, 480, 500, 500, 42)
    // The garden: a little picket fence and beds of glowing star-flowers.
    fence(g, 700, 520, 6, 40, -3)
    for (const [x, y, r] of SG_FLOWERS) {
      for (let i = 0; i < 3; i++) starFlower(g, x + (i - 1) * r * 0.9, y - (i % 2) * r * 0.5, r * 0.55, [N.pink, N.gold, N.blue][i]!, i)
    }
    starLily(g, SG_LILY.x, SG_LILY.y, SG_LILY.s, pot)
    starBed(g, SG_STAR.x, SG_STAR.y, 1)
    for (const [x, y, s] of SG_STONES) stoneLantern(g, x, y, s)
    moonTree(g, 40, 650, 0.6, GOLD_T)
    sgCover(g)
    starDress(g, 403, 26, 540, 664, [[800, 480, 200, 190], [530, 500, 200, 110], [980, 520, 170, 150], [150, 480, 220, 120]])
  },
  props: (g, t, alive) => {
    constellation(g, [[420, 60], [520, 100], [600, 60], [690, 110], [780, 70]], [[0, 1], [1, 2], [2, 3], [3, 4]], t, alive)
    glows(g, SG_GLOWS, t, alive, '#fff1a8')
    flowerGlows(g, [lilyHeart(SG_LILY.x, SG_LILY.y, SG_LILY.s), ...SG_FLOWERS], t, alive)
    if (alive <= 0) return
    fireflies(g, 360, 380, 700, 220, t, alive)
    shootingStar(g, 700, 20, 300, 110, t, alive, 7, 4)
    winks(g, [[160, 60, 11], [880, 250, 9], [1100, 40, 10], [60, 300, 8]], t, alive)
  },
  tap: calfTap({ x: SG_BUSH.x - 4, y: SG_BUSH.y - 60, s: 0.8, dir: -1, rise: 150, ground: SG_BUSH.y }, CALF.sky!, sgCover, SG_BUSH.y - 64),
  rescue: {
    x: SG_STAR.x,
    y: SG_STAR.y - 44,
    r: 70,
    draw: (g, k, t) => fallenStar(g, SG_STAR.x, SG_STAR.y, 1, k, t)
  }
}

/* ── 9-4 · Moon Bridge ─────────────────────────────────────────────────── */
const MB = { x: 640, y: 560, w: 400 }
const MB_POND = { x: 640, y: 572, rx: 390, ry: 80 }
const MB_ROCK = { x: 1080, y: 640, s: 0.9 }
const mbCover = (g: G2D): void => moonRock(g, MB_ROCK.x, MB_ROCK.y, MB_ROCK.s)
const MB_GLOWS: readonly Glow[] = bridgeGlows(MB.x, MB.y, MB.w)
const moonBridgeSector: SectorDef = {
  node: 43,
  rvu: 1,
  pots: C9_POTS,
  landmark: { x: MB.x, y: MB.y - 150 },
  giftSpot: { x: 140, y: 640 },
  seed: 94,
  accent: C9_ACCENT,
  paint: (g, pot) => {
    skyN(g, { moon: [MB.x, 130, 62, true], stars: 94, milky: [-20, 200, 480, 0] })
    farPeaks(g, 380, 94, 6)
    rockHill(g, -60, 420, 110, 420, 470)
    rockHill(g, 880, 1230, 1100, 430, 480)
    meadowN(g, 480, 486, 484, 43)
    moonPond(g, MB_POND.x, MB_POND.y, MB_POND.rx, MB_POND.ry, MB.x)
    // The bridge's reflection, clipped to the water.
    g.save()
    g.beginPath()
    g.ellipse(MB_POND.x, MB_POND.y, MB_POND.rx, MB_POND.ry, 0, 0, TAU)
    g.clip()
    bridgeReflection(g, MB.x, MB.y, MB.w, pot)
    g.restore()
    moonBridge(g, MB.x, MB.y, MB.w, pot)
    lilyPad(g, 330, 590, 26, N.pink)
    lilyPad(g, 380, 620, 18, N.gold)
    lilyPad(g, 930, 600, 24, N.blue)
    moonTree(g, 120, 520, 0.84, PINK_N)
    moonTree(g, 1030, 500, 0.7, BLUE_N)
    stoneLantern(g, 250, 560, 0.8)
    moonRock(g, 290, 670, 0.5)
    mbCover(g)
    starDress(g, 404, 18, 610, 668, [[40, 520, 200, 160], [240, 560, 820, 110], [980, 540, 170, 140]])
  },
  props: (g, t, alive) => {
    constellation(g, heartStars(250, 150, 1), HEART_LINKS, t, alive)
    constellation(g, [[860, 70], [940, 120], [1030, 90], [1090, 170]], [[0, 1], [1, 2], [2, 3]], t + 2, alive)
    glows(g, MB_GLOWS, t, alive, '#fff1a8')
    glows(g, [stoneGlow(250, 560, 0.8)], t, alive, '#fff1a8')
    if (alive <= 0) return
    // The moon's reflection shimmers.
    g.beginPath()
    for (let i = 0; i < 4; i++) {
      const y = MB_POND.y - 30 + i * 18
      const w = 40 - i * 7 + sin(t * 2 + i) * 8
      const dx = sin(t * 1.3 + i * 1.7) * 10
      g.moveTo(MB.x - w + dx, y)
      g.lineTo(MB.x + w + dx, y)
    }
    g.lineWidth = 4
    g.lineCap = 'round'
    g.strokeStyle = '#ffffff'
    g.globalAlpha = 0.7 * alive
    g.stroke()
    g.globalAlpha = 1
    fireflies(g, 200, 380, 800, 180, t, alive)
    shootingStar(g, 820, 30, 280, 100, t, alive, 6, 1)
    winks(g, [[460, 50, 10], [800, 200, 9], [1100, 60, 10], [60, 300, 8]], t, alive)
  },
  tap: calfTap({ x: MB_ROCK.x - 10, y: MB_ROCK.y - 70, s: 0.78, dir: -1, rise: 150, ground: MB_ROCK.y }, CALF.lilac!, mbCover, MB_ROCK.y - 66)
}

/* ── 9-5 · Nova's Starlight Throne — the boss sector (4× area) ───────── */
const TH = { x: 576, y: 520 }
const TH_HALO = throneHalo(TH.x, TH.y)
const TH_URN = { x: 164, y: 626, s: 0.94 }
const thCover = (g: G2D): void => starUrn(g, TH_URN.x, TH_URN.y, TH_URN.s)
const TH_STONES = [[384, 612, 0.9], [768, 612, 0.9]] as const
const TH_GLOWS: readonly Glow[] = [...TH_STONES.map(([x, y, s]) => stoneGlow(x, y, s)), ...throneOrbs(TH.x, TH.y)]
const novasThrone: SectorDef = {
  node: 44,
  rvu: 2,
  pots: C9_POTS,
  landmark: { x: TH.x, y: TH_HALO[1] },
  giftSpot: { x: 576, y: 640 },
  seed: 95,
  accent: C9_ACCENT,
  paint: (g, pot) => {
    skyN(g, { moon: [1050, 90, 38], stars: 95, milky: [-20, 120, 1180, 60] })
    farPeaks(g, 390, 95, 7)
    rockHill(g, -60, 330, 60, 420, 470)
    rockHill(g, 820, 1230, 1100, 424, 474)
    meadowN(g, 504, 520, 504, 44)
    moonTree(g, 80, 520, 0.8, BLUE_N)
    moonTree(g, 1080, 520, 0.8, PINK_N)
    throne(g, TH.x, TH.y, pot)
    // A royal runner from the dais down to the chest, gold-edged, starred.
    const runner = (): void => {
      g.beginPath()
      g.moveTo(534, 518)
      g.lineTo(618, 518)
      g.quadraticCurveTo(636, 600, 676, 690)
      g.lineTo(476, 690)
      g.quadraticCurveTo(516, 600, 534, 518)
      g.closePath()
    }
    runner()
    g.fillStyle = N.pink
    g.fill()
    g.save()
    runner()
    g.clip()
    g.beginPath()
    g.moveTo(548, 518)
    g.quadraticCurveTo(532, 600, 498, 690)
    g.moveTo(604, 518)
    g.quadraticCurveTo(620, 600, 654, 690)
    g.lineWidth = 6
    g.strokeStyle = N.gold
    g.stroke()
    g.beginPath()
    g.rect(590, 510, 120, 190)
    g.globalAlpha = 0.35
    g.fillStyle = N.pinkShade
    g.fill()
    g.globalAlpha = 1
    g.restore()
    runner()
    ink(g, 4)
    for (const [x, y, r] of [[576, 548, 9], [576, 590, 11]] as const) {
      roundStar(g, x, y, r, 0)
      g.fillStyle = N.goldLite
      g.fill()
      ink(g, 2.4)
    }
    for (const [x, y, s] of TH_STONES) stoneLantern(g, x, y, s)
    thCover(g)
    starUrn(g, 990, 630, 0.9)
    starDress(g, 405, 24, 560, 664, [[400, 500, 360, 190], [60, 500, 220, 170], [900, 500, 180, 160]])
  },
  props: (g, t, alive) => {
    constellation(g, heartStars(160, 170, 1.1), HEART_LINKS, t, alive)
    constellation(g, [[944, 250], [992, 206], [1046, 246], [1098, 212], [1126, 156]], [[0, 1], [1, 2], [2, 3], [3, 4]], t + 1.7, alive)
    glows(g, TH_GLOWS, t, alive, '#fff1a8')
    // Three little planets ride the halo ring.
    const [hx, hy, hr] = TH_HALO
    const PL = [N.pink, N.blue, N.mint] as const
    for (let i = 0; i < 3; i++) {
      const a = -PI / 2 + (i * TAU) / 3 + t * 0.25 * alive
      const px = hx + cos(a) * hr
      const py = hy + sin(a) * hr
      g.beginPath()
      g.arc(px, py, 15, 0, TAU)
      g.fillStyle = PL[i]!
      g.fill()
      ink(g, 3.5)
      g.beginPath()
      g.ellipse(px, py, 24, 6, -0.4, 0, TAU)
      ink(g, 2.4)
    }
    if (alive <= 0) return
    fireflies(g, 120, 420, 900, 160, t, alive)
    shootingStar(g, 200, 30, 300, 110, t, alive, 6)
    shootingStar(g, 700, 20, 280, 120, t, alive, 7.5, 3)
    winks(g, [[330, 60, 11], [820, 70, 10], [60, 330, 9], [1100, 330, 9], [576, 16, 10]], t, alive)
  },
  tap: calfTap({ x: TH_URN.x + 6, y: TH_URN.y - 118, s: 0.8, dir: 1, rise: 200, ground: TH_URN.y }, CALF.coral!, thCover, TH_URN.y - 96, 86)
}

export const C9_SECTORS: readonly SectorDef[] = [lanternPath, observatorySector, starGarden, moonBridgeSector, novasThrone]
