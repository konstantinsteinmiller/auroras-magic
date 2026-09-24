/**
 * sectorsC8.ts — chapter 8, Twilight Tundra (nodes 35–39; story-spec §10.2:
 * "The auroras in the sky are trapped in dark ice", Guardian Glace (reused)).
 * Composed from `kit.ts`, `kitSky.ts` and `kitTundra.ts` against
 * `sectorDef.ts`, like chapters 1–3: twilight sky → far snow → snow hills →
 * the snowfield → landmark (in the picked pot) → dressing.
 *
 *   8-1 Snowy Village   — the big igloo's DOME
 *   8-2 Frozen Lake     — the skating hut's ROOF
 *   8-3 Aurora Grove    — the great tree's frosted CROWN; the chapter's rescue,
 *                         the Frozen Star Shard, sleeps in its ice block here
 *   8-4 Sled Hill       — the sled shed's A-frame ROOF
 *   8-5 Glace's Palace  — the boss sector (4× area): the palace's crystal SPIRES
 *
 * Its props are the tundra waking up: aurora ribbons rippling free, snow
 * drifting down, warm lanterns and windows glowing, chimney smoke, stars
 * winking. Every sector has the chapter's tap creature (§8.8): a snow-hare in
 * a different scarf, popping up from behind a snowbank, a snowman, a frosted
 * shrub, a little igloo or an ice hedge and shaking off a puff of frost.
 */
import type { SectorDef, SectorAccent, TapCreature } from '@/game/map/sectorDef'
import { TUNDRA_POTS, INK, ink, fill, smoke, twinkleAt, puffAt, type G2D } from '@/game/map/kit'
import { pennant } from '@/game/map/kitSky'
import {
  T, AUR, PINK_T, LILAC_T, SNOW_POT, HARE, type Ribbon, type Glow, type HareLook, type HareSpot, type SnowmanLook,
  skyT, aurora, farSnow, snowHill, snowField, drift, snowbank, snowDress, frostPine, frostShrub, candyTree,
  iceLantern, iceGlow, lampCrook, crookGlow, crookTip, lightString, stringPts, glows, bulbGlow, snowfall, winks, shootingStar, snowman,
  igloo, iglooPipe, skateHut, hutChimney, frozenLake, sled, chalet, icePalace, palaceFlags, iceHedge, auroraTree,
  peekHare, frostShard, twinkle, flake, chaletWindow, crystals, trail, hareTracks, sledRack, snowball
} from '@/game/map/kitTundra'
import { sin, cos, TAU, PI, clamp } from '@/game/duel/util'

/** The chapter's gift ribbon and chest gem (§8.2): ice blue. */
export const C8_ACCENT: SectorAccent = { ribbon: '#7fd4ff', ribbonShade: '#4fa8e0', gem: '#d0f0ff' }
export const C8_POTS = TUNDRA_POTS

/** A snow-hare hiding behind `cover`: out at `spot`, in the scarf `look`.
 *  The tap spot `ty` sits over the cover, big enough to take the hare too. */
const hareTap = (spot: HareSpot, look: HareLook, cover: (g: G2D) => void, ty: number, r = 76): TapCreature => ({
  x: spot.x + (spot.lean ?? 0) * 0.6,
  y: ty,
  r,
  draw: (g, k, t) => peekHare(g, spot, k, t, look, cover)
})

/** Three ribbon colours. */
const GREEN = { col: AUR.green, lite: AUR.greenLite }
const TEAL = { col: AUR.teal, lite: AUR.tealLite }
const PINKR = { col: AUR.pink, lite: AUR.pinkLite }

/* ── 8-1 · Snowy Village ─────────────────────────────────────────────────── */
const V_SKY: readonly Ribbon[] = [
  { pts: [[-40, 150], [170, 104], [380, 140], [600, 96], [820, 132], [1040, 118], [1200, 146]], w: 44, ph: 0, ...GREEN },
  { pts: [[80, 226], [300, 196], [520, 222], [740, 186], [960, 212], [1200, 190]], w: 28, ph: 2, ...PINKR }
]
const V_IGLOO = { x: 360, y: 492, R: 170 }
const V_SMALL = [[826, 430, 64], [1004, 414, 50]] as const
const V_POSTS = [[560, 560, 150, 1], [900, 548, 146, -1]] as const
const V_ICE = [[470, 610, 1], [206, 634, 0.9], [930, 634, 0.9]] as const
const V_GLOWS: readonly Glow[] = [...V_POSTS.map(([x, y, h, d]) => crookGlow(x, y, h, d)), ...V_ICE.map(([x, y, s]) => iceGlow(x, y, s))]
const V_BANK = { x: 1040, y: 612, s: 1.15 }
const vBank = (g: G2D): void => {
  snowbank(g, V_BANK.x, V_BANK.y, V_BANK.s)
  // A little shovel stuck in the bank.
  g.beginPath()
  g.roundRect(V_BANK.x + 34, V_BANK.y - 118, 8, 60, 4)
  fill(g, T.woodShade)
  ink(g, 3)
  g.beginPath()
  g.roundRect(V_BANK.x + 24, V_BANK.y - 70, 28, 30, [4, 4, 12, 12])
  fill(g, T.blue)
  ink(g, 3.5)
}
const V_A = crookTip(...V_POSTS[0])
const V_B = crookTip(...V_POSTS[1])
const V_STRING = stringPts(V_A[0], V_A[1], V_B[0], V_B[1], 30, 7)
const V_SNOWMAN: SnowmanLook = { scarf: T.pink, scarfShade: T.pinkShade, hat: 'beanie', hatCol: T.mint }
const snowyVillage: SectorDef = {
  node: 35,
  rvu: 1,
  pots: C8_POTS,
  landmark: { x: V_IGLOO.x, y: V_IGLOO.y - 80 },
  giftSpot: { x: 780, y: 630 },
  seed: 81,
  accent: C8_ACCENT,
  paint: (g, pot) => {
    skyT(g, { moon: [1000, 56, 38], stars: 81, wisps: [[250, 280, 0.7], [700, 300, 0.5]] })
    farSnow(g, 330, 372, 81, 12)
    snowHill(g, 560, 1210, 900, 336, 404)
    frostPine(g, 1110, 432, 0.72)
    frostPine(g, 672, 414, 0.52, LILAC_T)
    for (const [x, y, R] of V_SMALL) igloo(g, x, y, R, SNOW_POT, -1, false)
    snowField(g, 452, 490, 474, 35)
    // A trodden path from the igloo's door, and hare tracks to the snowbank.
    trail(g, [[430, 500], [470, 548], [560, 600], [620, 690]], 46)
    hareTracks(g, [[600, 610], [680, 592], [790, 560], [880, 566], [970, 590]], 1)
    frostPine(g, 70, 516, 1.02)
    candyTree(g, 186, 492, 0.62, PINK_T)
    igloo(g, V_IGLOO.x, V_IGLOO.y, V_IGLOO.R, pot, 1)
    // The village square: two lantern posts with a string of lights.
    for (const [x, y, h, d] of V_POSTS) lampCrook(g, x, y, h, T.pink, d)
    lightString(g, V_A[0], V_A[1], V_B[0], V_B[1], 30, 7, [T.lemon, T.pink, T.mint, T.blue])
    snowman(g, 660, 556, 0.7, V_SNOWMAN, 0, 1)
    for (const [x, y, s] of V_ICE) iceLantern(g, x, y, s)
    sled(g, 250, 600, 0.8, T.coral, 1)
    vBank(g)
    drift(g, [[-20, 660, 48], [60, 670, 36]])
    snowDress(g, 351, 22, 520, 664, [[680, 470, 200, 200], [180, 380, 380, 200], [960, 480, 180, 150], [410, 560, 120, 80]])
  },
  props: (g, t, alive) => {
    aurora(g, V_SKY, t, alive)
    const [px, py] = iglooPipe(V_IGLOO.x, V_IGLOO.y, V_IGLOO.R)
    smoke(g, px, py, t, alive)
    glows(g, V_GLOWS, t, alive)
    glows(g, [[V_IGLOO.x + V_IGLOO.R * 0.36, V_IGLOO.y - 36, 44]], t, alive, '#ffd98a')
    if (alive <= 0) return
    bulbGlow(g, V_STRING, t, alive)
    snowfall(g, 0, 0, 1152, 560, 16, t, alive)
    winks(g, [[140, 60, 11], [520, 44, 9], [760, 150, 10], [330, 120, 8]], t, alive)
  },
  tap: hareTap({ x: V_BANK.x - 14, y: V_BANK.y - 50, s: 0.78, dir: -1, rise: 170, ground: V_BANK.y }, HARE.pink!, vBank, V_BANK.y - 70)
}

/* ── 8-2 · Frozen Lake ───────────────────────────────────────────────────── */
const L_SKY: readonly Ribbon[] = [
  { pts: [[-40, 110], [180, 150], [400, 100], [620, 140], [860, 96], [1200, 130]], w: 40, ph: 1, ...TEAL },
  { pts: [[200, 60], [420, 84], [640, 50], [880, 76], [1200, 44]], w: 26, ph: 3, ...GREEN }
]
const L_LAKE = { x: 540, y: 540, rx: 300, ry: 84 }
const L_HUT = { x: 930, y: 488, w: 200 }
const L_MAN = { x: 1056, y: 640, s: 0.68 }
const L_SNOWMAN: SnowmanLook = { scarf: T.mint, scarfShade: '#22b58c', hat: 'muffs', hatCol: T.pink }
const lMan = (g: G2D): void => snowman(g, L_MAN.x, L_MAN.y, L_MAN.s, L_SNOWMAN, 0, -1)
const L_POSTS = [[58, 500, 130, 1, T.lemon]] as const
const L_ICE = [[440, 648, 0.9], [640, 650, 0.9], [812, 648, 0.9]] as const
const L_BENCH = [872, 574] as const
const L_GLOWS: readonly Glow[] = [...L_POSTS.map(([x, y, h, d]) => crookGlow(x, y, h, d)), ...L_ICE.map(([x, y, s]) => iceGlow(x, y, s))]
/** A figure-eight a glint skates along on the ice. */
const skate = (u: number): [number, number] => [L_LAKE.x + sin(u) * 190, L_LAKE.y + 6 + sin(u * 2) * 34]
const frozenLakeSector: SectorDef = {
  node: 36,
  rvu: 1,
  pots: C8_POTS,
  landmark: { x: L_HUT.x, y: L_HUT.y - 170 },
  giftSpot: { x: 150, y: 646 },
  seed: 82,
  accent: C8_ACCENT,
  paint: (g, pot) => {
    skyT(g, { moon: [160, 96, 38], stars: 82, wisps: [[560, 250, 0.6], [930, 230, 0.7]] })
    farSnow(g, 322, 362, 82, 14)
    snowHill(g, -60, 560, 150, 344, 410)
    frostPine(g, 60, 420, 0.8)
    frostPine(g, 260, 414, 0.58, LILAC_T)
    snowHill(g, 620, 1220, 1060, 360, 420)
    frostPine(g, 1120, 440, 0.68)
    snowField(g, 440, 452, 462, 36)
    frozenLake(g, L_LAKE.x, L_LAKE.y, L_LAKE.rx, L_LAKE.ry, 36)
    skateHut(g, L_HUT.x, L_HUT.y, L_HUT.w, pot)
    // A bench on the shore by the hut, for lacing up skates.
    const [bx, by] = L_BENCH
    g.beginPath()
    g.rect(bx + 10, by + 10, 8, 22)
    g.rect(bx + 72, by + 10, 8, 22)
    fill(g, T.woodShade)
    ink(g, 3)
    g.beginPath()
    g.roundRect(bx, by, 90, 12, 5)
    fill(g, T.wood)
    ink(g, 3.5)
    g.beginPath()
    g.ellipse(bx + 45, by, 38, 7, 0, PI, TAU)
    fill(g, T.snow)
    ink(g, 3)
    for (const [x, y, h, d, c] of L_POSTS) lampCrook(g, x, y, h, c, d)
    for (const [x, y, s] of L_ICE) iceLantern(g, x, y, s)
    frostPine(g, 1150, 560, 0.9)
    lMan(g)
    sled(g, 330, 652, 0.72, T.lilac, -1)
    drift(g, [[-20, 660, 44], [60, 676, 34]])
    snowDress(g, 362, 20, 590, 664, [[60, 490, 200, 180], [190, 450, 710, 170], [980, 500, 180, 170], [760, 480, 140, 100], [850, 550, 130, 80]])
  },
  props: (g, t, alive) => {
    aurora(g, L_SKY, t, alive)
    const [cx, cy] = hutChimney(L_HUT.x, L_HUT.y, L_HUT.w)
    smoke(g, cx, cy, t, alive)
    glows(g, L_GLOWS, t, alive)
    glows(g, [[L_HUT.x + L_HUT.w * 0.2, L_HUT.y - L_HUT.w * 0.3, 44]], t, alive, '#ffd98a')
    if (alive <= 0) return
    // A glint skating a figure-eight, a fading swirl behind it.
    const u = t * 0.9
    g.beginPath()
    for (let i = 0; i <= 10; i++) {
      const [x, y] = skate(u - i * 0.07)
      if (i) g.lineTo(x, y)
      else g.moveTo(x, y)
    }
    g.lineWidth = 5
    g.lineCap = 'round'
    g.strokeStyle = '#ffffff'
    g.globalAlpha = 0.7 * alive
    g.stroke()
    const [sx, sy] = skate(u)
    g.beginPath()
    g.globalAlpha = alive
    if (!twinkleAt(g, sx, sy - 4, 14, '#fffbe0')) fill(g, '#fffbe0')
    g.globalAlpha = 1
    snowfall(g, 0, 0, 1152, 600, 16, t, alive)
    winks(g, [[400, 40, 10], [700, 190, 9], [980, 30, 11], [300, 200, 8]], t, alive)
    shootingStar(g, 620, 40, 300, 110, t, alive, 7, 2)
  },
  tap: hareTap({ x: L_MAN.x, y: L_MAN.y - 40, s: 0.74, dir: -1, rise: 150, ground: L_MAN.y, lean: -58 }, HARE.mint!, lMan, L_MAN.y - 80)
}

/* ── 8-3 · Aurora Grove — the chapter's rescue ──────────────────────────── */
// The grove's great aurora, routed around the tree's crown (a prop draws
// over the painting, so a ribbon must never cross a landmark).
const G_SKY: readonly Ribbon[] = [
  { pts: [[440, 214], [580, 150], [720, 184], [880, 110], [1030, 150], [1200, 84]], w: 64, ph: 0, ...GREEN },
  { pts: [[-40, 64], [200, 40], [440, 76], [680, 34], [920, 66], [1200, 30]], w: 38, ph: 2.2, ...TEAL },
  { pts: [[480, 262], [640, 236], [800, 256], [960, 222], [1200, 240]], w: 26, ph: 4, ...PINKR }
]
const G_SHARD = { x: 606, y: 548 }
const G_SHRUB = { x: 1068, y: 620, s: 0.92 }
const gShrub = (g: G2D): void => frostShrub(g, G_SHRUB.x, G_SHRUB.y, G_SHRUB.s)
const G_ICE = [[520, 612, 1], [700, 620, 1], [140, 640, 0.9]] as const
const G_GLOWS: readonly Glow[] = G_ICE.map(([x, y, s]) => iceGlow(x, y, s))
const auroraGrove: SectorDef = {
  node: 37,
  rvu: 1,
  pots: C8_POTS,
  landmark: { x: 270, y: 290 },
  giftSpot: { x: 930, y: 640 },
  seed: 83,
  accent: C8_ACCENT,
  paint: (g, pot) => {
    skyT(g, { stars: 83 })
    farSnow(g, 350, 390, 83, 18)
    snowHill(g, 540, 1220, 960, 360, 420)
    frostPine(g, 520, 452, 0.5, PINK_T)
    frostPine(g, 660, 440, 0.44, LILAC_T)
    frostPine(g, 1110, 456, 0.84)
    frostPine(g, 760, 432, 0.56)
    frostPine(g, 870, 424, 0.66, LILAC_T)
    frostPine(g, 1000, 440, 0.6, PINK_T)
    snowField(g, 474, 500, 488, 37)
    candyTree(g, 470, 500, 0.5, PINK_T)
    auroraTree(g, 270, 540, 0.84, pot)
    // The shard's snow mound, with aurora crystals growing about the grove.
    drift(g, [[G_SHARD.x - 56, G_SHARD.y + 8, 26], [G_SHARD.x + 56, G_SHARD.y + 8, 24], [G_SHARD.x, G_SHARD.y + 4, 34]], G_SHARD.y + 20)
    crystals(g, 800, 560, 0.8, [AUR.teal, '#1fb8b0', AUR.tealLite])
    crystals(g, 440, 610, 0.62, [T.pink, T.pinkShade, T.pinkLite])
    crystals(g, 960, 470, 0.5, [T.mint, '#22b58c', '#aaf3dc'])
    for (const [x, y, s] of G_ICE) iceLantern(g, x, y, s)
    frostPine(g, 1150, 560, 0.7)
    frostPine(g, 34, 660, 0.72, LILAC_T)
    gShrub(g)
    snowDress(g, 373, 24, 520, 664, [[780, 480, 200, 190], [520, 430, 180, 140], [980, 480, 180, 150], [120, 480, 300, 80]])
  },
  props: (g, t, alive) => {
    aurora(g, G_SKY, t, alive)
    glows(g, G_GLOWS, t, alive)
    if (alive <= 0) return
    // Baubles and crystals glint.
    winks(g, [[144, 378, 10], [220, 344, 9], [304, 360, 11], [382, 372, 9], [800, 470, 10], [440, 560, 8]], t * 1.3, alive, '#ffffff')
    snowfall(g, 0, 0, 1152, 560, 14, t, alive)
    winks(g, [[520, 30, 10], [860, 300, 9], [1080, 180, 11], [640, 320, 8]], t, alive)
    shootingStar(g, 760, 20, 280, 90, t, alive, 8)
  },
  tap: hareTap({ x: G_SHRUB.x - 6, y: G_SHRUB.y - 64, s: 0.76, dir: -1, rise: 170, ground: G_SHRUB.y }, HARE.lemon!, gShrub, G_SHRUB.y - 64),
  rescue: {
    x: G_SHARD.x,
    y: G_SHARD.y - 50,
    r: 70,
    draw: (g, k, t) => frostShard(g, G_SHARD.x, G_SHARD.y, 1, k, t)
  }
}

/* ── 8-4 · Sled Hill ─────────────────────────────────────────────────────── */
const S_SKY: readonly Ribbon[] = [
  { pts: [[300, 120], [520, 80], [740, 126], [960, 70], [1200, 104]], w: 40, ph: 1.5, ...PINKR },
  { pts: [[-40, 60], [200, 40], [440, 70], [680, 30], [920, 56], [1200, 24]], w: 28, ph: 0.5, ...GREEN }
]
const S_SHED = { x: 190, y: 328, w: 236 }
/** Slalom flags down the run: foot x, y, colour. */
const S_SLALOM = [[600, 404, T.pink], [712, 452, T.lemon], [836, 508, AUR.teal]] as const
/** The sled run, top to bottom. */
const RUN: readonly (readonly [number, number])[] = [[330, 318], [470, 340], [560, 400], [640, 440], [760, 480], [860, 530], [960, 566]]
const runAt = (u: number): [number, number, number] => {
  const f = clamp(u, 0, 0.999) * (RUN.length - 1)
  const i = Math.floor(f)
  const k = f - i
  const [ax, ay] = RUN[i]!
  const [bx, by] = RUN[i + 1]!
  return [ax + (bx - ax) * k, ay + (by - ay) * k, Math.atan2(by - ay, bx - ax)]
}
const S_IGLOO = { x: 134, y: 640, R: 62 }
const sIgloo = (g: G2D): void => igloo(g, S_IGLOO.x, S_IGLOO.y, S_IGLOO.R, SNOW_POT, 1, false)
const S_MAN: SnowmanLook = { scarf: T.blue, scarfShade: '#3d8fe0', hat: 'top', hatCol: T.lilac }
const S_FLAG: readonly [number, number] = [372, 306]
const S_POSTS = [[500, 396, 110, 1, T.lemon], [912, 566, 110, -1, T.pink]] as const
const S_ICE = [[380, 646, 0.9], [880, 650, 0.9]] as const
const S_GLOWS: readonly Glow[] = [...S_POSTS.map(([x, y, h, d]) => crookGlow(x, y, h, d)), ...S_ICE.map(([x, y, s]) => iceGlow(x, y, s))]
const sledHill: SectorDef = {
  node: 38,
  rvu: 1,
  pots: C8_POTS,
  landmark: { x: S_SHED.x, y: S_SHED.y - 150 },
  giftSpot: { x: 560, y: 636 },
  seed: 84,
  accent: C8_ACCENT,
  paint: (g, pot) => {
    skyT(g, { moon: [1040, 170, 40], stars: 84, wisps: [[800, 250, 0.6]] })
    farSnow(g, 330, 380, 84, 12)
    frostPine(g, 690, 400, 0.5, LILAC_T)
    frostPine(g, 1080, 420, 0.62)
    // The big hill: a crest on the left, the run sweeping down to the right.
    const hillPath = (): void => {
      g.beginPath()
      g.moveTo(-10, 300)
      g.bezierCurveTo(120, 290, 300, 296, 380, 318)
      g.bezierCurveTo(560, 370, 720, 470, 1000, 560)
      g.quadraticCurveTo(1100, 590, 1170, 594)
      g.lineTo(1170, 690)
      g.lineTo(-10, 690)
      g.closePath()
    }
    hillPath()
    fill(g, T.snow)
    g.save()
    hillPath()
    g.clip()
    g.beginPath()
    g.moveTo(420, 690)
    g.bezierCurveTo(520, 520, 700, 480, 1170, 600)
    g.lineTo(1170, 690)
    g.closePath()
    fill(g, T.snowShade)
    g.beginPath()
    g.moveTo(0, 308)
    g.bezierCurveTo(120, 298, 300, 304, 380, 326)
    g.lineWidth = 8
    g.strokeStyle = T.snowPink
    g.stroke()
    g.restore()
    hillPath()
    ink(g)
    // Sled tracks carving down the run.
    for (const off of [-9, 9]) {
      g.beginPath()
      g.moveTo(RUN[0]![0], RUN[0]![1] + off)
      for (let i = 1; i < RUN.length - 1; i++) {
        const [ax, ay] = RUN[i]!
        const [bx, by] = RUN[i + 1]!
        g.quadraticCurveTo(ax, ay + off, (ax + bx) / 2, (ay + by) / 2 + off)
      }
      g.lineWidth = 4.5
      g.strokeStyle = T.snowDeep
      g.lineCap = 'round'
      g.stroke()
    }
    frostPine(g, 36, 318, 0.74)
    frostPine(g, 440, 318, 0.46, PINK_T)
    chalet(g, S_SHED.x, S_SHED.y, S_SHED.w, pot)
    sled(g, 334, 330, 0.62, T.coral, 1, -1.05)
    // The start flag's pole and the slalom poles (their flags stream as props).
    g.beginPath()
    g.roundRect(S_FLAG[0] - 4, S_FLAG[1] - 70, 8, 72, 4)
    for (const [x, y] of S_SLALOM) g.roundRect(x - 3.5, y - 60, 7, 62, 3)
    fill(g, T.woodShade)
    ink(g, 3)
    for (const [x, y, h, d, c] of S_POSTS) lampCrook(g, x, y, h, c, d)
    trail(g, [[250, 700], [300, 600], [292, 548]], 40)
    sledRack(g, 300, 536, [T.pink, T.lemon, AUR.teal])
    // The bottom of the run: a big snowman, a parked sled, drifts.
    snowman(g, 1010, 624, 0.98, S_MAN, 0, -1)
    sled(g, 760, 640, 0.8, T.mint, 1)
    drift(g, [[1110, 660, 50], [1180, 640, 40]])
    for (const [x, y, s] of S_ICE) iceLantern(g, x, y, s)
    sIgloo(g)
    snowDress(g, 384, 20, 560, 664, [[450, 490, 220, 190], [60, 520, 150, 150], [930, 460, 200, 200], [680, 560, 170, 100]])
  },
  props: (g, t, alive) => {
    aurora(g, S_SKY, t, alive)
    g.beginPath()
    g.arc(S_FLAG[0], S_FLAG[1] - 72, 6, 0, TAU)
    fill(g, T.lemon)
    ink(g, 2.4)
    pennant(g, S_FLAG[0], S_FLAG[1] - 66, 46, 22, T.pink, t, alive)
    for (let i = 0; i < S_SLALOM.length; i++) {
      const [x, y, c] = S_SLALOM[i]!
      pennant(g, x, y - 58, 30, 18, c, t, alive, i * 1.7)
    }
    glows(g, S_GLOWS, t, alive)
    glows(g, [chaletWindow(S_SHED.x, S_SHED.y, S_SHED.w)], t, alive, '#ffd98a')
    if (alive <= 0) return
    // A snowball rolls down the run, growing, then puffs into a drift.
    const u = (t * 0.16) % 1.25
    if (u < 1) {
      const [x, y, a] = runAt(u)
      const r = 9 + u * 22
      g.globalAlpha = alive
      snowball(g, x, y - r + 4, r, a + t * 6)
      g.globalAlpha = 1
    } else {
      const k = (u - 1) / 0.25
      g.globalAlpha = alive * (1 - k)
      g.beginPath()
      for (let i = 0; i < 6; i++) {
        const ang = -PI * 0.1 - (i / 5) * PI * 0.8
        const px = RUN[RUN.length - 1]![0] + cos(ang) * (20 + 50 * k)
        const py = RUN[RUN.length - 1]![1] - 20 + sin(ang) * (20 + 40 * k)
        // The burst is the shared painted puff, white, once it has landed.
        if (puffAt(g, px, py, 10 * (1 - k * 0.5), '#ffffff')) continue
        g.moveTo(px + 10, py)
        g.arc(px, py, 10 * (1 - k * 0.5), 0, TAU)
      }
      g.fillStyle = '#ffffff'
      g.fill()
      g.globalAlpha = 1
    }
    snowfall(g, 0, 0, 1152, 600, 16, t, alive)
    winks(g, [[560, 40, 10], [300, 120, 9], [880, 200, 10], [130, 60, 8]], t, alive)
    shootingStar(g, 700, 30, 260, 100, t, alive, 6.5, 3)
  },
  tap: hareTap({ x: S_IGLOO.x + 8, y: S_IGLOO.y - 20, s: 0.7, dir: 1, rise: 150, ground: S_IGLOO.y }, HARE.sky!, sIgloo, S_IGLOO.y - 56)
}

/* ── 8-5 · Glace's Ice Palace — the boss sector (4× area) ────────────────── */
// A crown of aurora arching OVER the spires, and two curtains hanging either
// side of the palace — never across it (props draw over the painting).
const P_SKY: readonly Ribbon[] = [
  { pts: [[-40, 196], [80, 120], [220, 62], [400, 26], [576, 14], [752, 26], [932, 62], [1072, 120], [1192, 196]], w: 34, ph: 0, ...PINKR },
  { pts: [[-40, 340], [30, 262], [96, 190], [150, 124], [194, 80]], w: 42, ph: 2, ...GREEN },
  { pts: [[958, 80], [1002, 124], [1056, 190], [1122, 262], [1192, 340]], w: 42, ph: 3.1, ...TEAL }
]
const P = { x: 576, y: 506 }
const P_FLAGS = palaceFlags(P.x, P.y)
const P_HEDGE = { x: 166, y: 620, s: 0.96 }
const pHedge = (g: G2D): void => iceHedge(g, P_HEDGE.x, P_HEDGE.y, P_HEDGE.s)
const P_MAN: SnowmanLook = { scarf: T.lilac, scarfShade: '#8458e6', hat: 'top', hatCol: T.blue }
const P_ICE = [[480, 548, 0.9], [672, 548, 0.9], [404, 640, 1.1], [748, 640, 1.1]] as const
const P_GLOWS: readonly Glow[] = P_ICE.map(([x, y, s]) => iceGlow(x, y, s))
const FLAG_COLS = [T.pink, T.pink, AUR.teal, AUR.teal, T.lemon] as const
const glacesPalace: SectorDef = {
  node: 39,
  rvu: 2,
  pots: C8_POTS,
  landmark: { x: 576, y: 190 },
  giftSpot: { x: 576, y: 640 },
  seed: 85,
  accent: C8_ACCENT,
  paint: (g, pot) => {
    skyT(g, { moon: [1050, 110, 36], stars: 85 })
    farSnow(g, 350, 392, 85, 14)
    snowHill(g, -60, 420, 90, 380, 440)
    snowHill(g, 730, 1220, 1070, 386, 446)
    frostPine(g, 60, 470, 0.84)
    frostPine(g, 1096, 474, 0.84)
    frostPine(g, 180, 460, 0.56, LILAC_T)
    frostPine(g, 980, 466, 0.56, LILAC_T)
    snowField(g, 490, 510, 492, 39)
    icePalace(g, P.x, P.y, pot)
    // Drifts hugging the palace's feet, clear of the gate.
    drift(g, [[300, 512, 40], [370, 520, 32], [262, 524, 30]])
    drift(g, [[852, 512, 40], [782, 520, 32], [890, 524, 30]])
    // The ice path from the gate down to the chest, snowflake stones in it.
    g.beginPath()
    g.moveTo(534, 506)
    g.quadraticCurveTo(516, 600, 462, 690)
    g.lineTo(690, 690)
    g.quadraticCurveTo(636, 600, 618, 506)
    g.closePath()
    fill(g, T.iceLite)
    ink(g, 4)
    g.save()
    g.clip()
    g.beginPath()
    g.moveTo(560, 506)
    g.quadraticCurveTo(556, 600, 540, 690)
    g.lineWidth = 8
    g.strokeStyle = '#ffffff'
    g.stroke()
    g.restore()
    for (const [x, y, r] of [[576, 534, 10], [576, 572, 13]] as const) {
      flake(g, x, y, r, PI / 6)
      g.lineWidth = 7
      g.strokeStyle = INK
      g.stroke()
      g.lineWidth = 3.5
      g.strokeStyle = T.blue
      g.stroke()
    }
    for (const [x, y, s] of P_ICE) iceLantern(g, x, y, s)
    pHedge(g)
    snowman(g, 1010, 630, 0.82, P_MAN, 0, -1)
    frostPine(g, 1150, 600, 0.66, PINK_T)
    drift(g, [[-10, 676, 48], [70, 686, 36]])
    snowDress(g, 395, 22, 540, 664, [[380, 490, 400, 190], [60, 470, 220, 190], [930, 480, 180, 150], [1080, 500, 80, 80]])
  },
  props: (g, t, alive) => {
    aurora(g, P_SKY, t, alive)
    for (let i = 0; i < P_FLAGS.length; i++) {
      const [x, y] = P_FLAGS[i]!
      g.beginPath()
      g.moveTo(x, y + 8)
      g.lineTo(x, y - 30)
      ink(g, 3)
      pennant(g, x, y - 30, i === 4 ? 56 : 42, i === 4 ? 26 : 20, FLAG_COLS[i]!, t, alive, i * 1.3)
    }
    glows(g, P_GLOWS, t, alive)
    glows(g, [[P.x, P.y - 60, 80]], t, alive, '#ffd98a')
    if (alive <= 0) return
    // A glint climbing each spire in turn.
    const k = (t * 0.5) % P_FLAGS.length
    const [fx, fy] = P_FLAGS[Math.floor(k)]!
    const u = k % 1
    g.globalAlpha = alive * sin(u * PI)
    g.beginPath()
    if (!twinkleAt(g, fx, fy + 120 * (1 - u), 16, '#ffffff')) fill(g, '#ffffff')
    g.globalAlpha = 1
    snowfall(g, 0, 0, 1152, 560, 18, t, alive)
    winks(g, [[200, 60, 11], [930, 40, 10], [320, 260, 9], [840, 280, 9], [120, 190, 8], [1020, 220, 8]], t, alive)
    shootingStar(g, 180, 30, 280, 110, t, alive, 7, 1)
  },
  tap: hareTap({ x: P_HEDGE.x + 4, y: P_HEDGE.y - 128, s: 0.74, dir: 1, rise: 220, ground: P_HEDGE.y }, HARE.lilac!, pHedge, P_HEDGE.y - 96, 86)
}

export const C8_SECTORS: readonly SectorDef[] = [snowyVillage, frozenLakeSector, auroraGrove, sledHill, glacesPalace]
