/**
 * sectors.ts — every sector the map and the restore view can show, composed
 * from `kit.ts` (story-spec §8.7–§8.8, §9.1, §9.14). One entry per node.
 *
 * Each sector names:
 *   • its LANDMARK — the one colour-me region the player's pot paints (§8.7);
 *   • where its gift sits before it opens (a boss's chest sits centred, §8.2);
 *   • its PROPS — the life that switches on when it is restored (§8.8's
 *     permanence): drawn at rest (`alive` 0) into the dust, then animating;
 *   • its size: a boss sector is 4× a standard sector's area (§8.14), so its
 *     tools are sized in restore-view units at 2 RVU per sector unit.
 *
 * Chapter 1 (Whispering Woods) is authored here; chapter 2 (Bubble Bay) in
 * `sectorsC2.ts`, chapter 3 (Cloud Kingdom) in `sectorsC3.ts`. Later chapters
 * are silhouette pages on the map until their stage.
 */

import {
  type G2D, type Pot, WOODS_POTS, C, INK, fill, ink, sky, farHills, hill, meadow, pathway, tree, pine, bush,
  flowers, mushrooms, log, stones, fence, pond, brook, cottage, millBody, sails, bridge, well, flowerBed,
  beehive, treehouse, greatTree, brambleArch, waterfall, smoke, butterfly, bees, swing, waterwheel, fireflies, duck
} from '@/game/map/kit'
import { sin, TAU, PI } from '@/game/duel/util'
import { drawItem, type ItemSpec } from '@/game/artItem'
import { tapCover } from '@/game/map/tapCover'
import { CREATURE_ART } from '@/game/artIds'
import type { SectorDef, TapCreature, RescueCollectible } from '@/game/map/sectorDef'
import { C2_SECTORS } from '@/game/map/sectorsC2'
import { C3_SECTORS } from '@/game/map/sectorsC3'
import { C4_SECTORS } from '@/game/map/sectorsC4'
import { C5_SECTORS } from '@/game/map/sectorsC5'
import { C6_SECTORS } from '@/game/map/sectorsC6'
import { C7_SECTORS } from '@/game/map/sectorsC7'
import { C8_SECTORS } from '@/game/map/sectorsC8'
import { C9_SECTORS } from '@/game/map/sectorsC9'
import { C10_SECTORS } from '@/game/map/sectorsC10'

export type { Pot } from '@/game/map/kit'

export type { SectorDef, SectorAccent, TapCreature, RescueCollectible } from '@/game/map/sectorDef'

const REST = 0.35

/** Whispering Woods' accent (§8.2): a moss-green ribbon, a leaf-green gem. */
const WOODS_ACCENT = { ribbon: '#63e24a', ribbonShade: '#3fb84a', gem: '#5ce05a' } as const

/* ── Permanence (§8.8): the woods' tap creature and its rescue ─────────── */

/**
 * A round moss-sprite: a green ball with leaf ears, a sprout, a face.
 * `awake` 0 = eyes shut, 1 = wide and smiling. Centred at (x, y).
 *
 * PAINTED (`CREATURE_ART.mossSprite`): the woods' tap creature AND its rescue
 * are the same sprite, so one sheet serves both. Its two panels are the two
 * states the drawing switches between, and the BALL is the tinted region —
 * the rescue brightens it as she wakes, which is one colour on one shape.
 */
const sprite = (g: G2D, x: number, y: number, s: number, awake: number, body = '#7ee85a'): void => {
  g.save()
  g.translate(x, y)
  const painted = drawItem(g, MOSS_SPRITE_ART, SPRITE_UNIT * s, awake > 0.5 ? 1 : 0, body)
  g.restore()
  if (painted) return
  spriteShape(g, x, y, s, awake, body)
}

/** The sprout tip (-28) to the foot of the ball (+11) at scale 1 — its own
 *  height in SU, which the SIZE clause and the line weight are judged by. */
const SPRITE_UNIT = 40

export const MOSS_SPRITE_ART: ItemSpec = {
  ...CREATURE_ART.mossSprite, frames: 2, tinted: true,
  draw: (g, s, f, accent) => {
    const k = s / SPRITE_UNIT
    g.save()
    g.scale(k, k)
    spriteShape(g, 0, 0, 1, f, accent.base)
    g.restore()
  }
}

/** The sprite itself — the drawing the painting stands in for. */
const spriteShape = (g: G2D, x: number, y: number, s: number, awake: number, body: string): void => {
  for (const d of [-1, 1]) {
    g.beginPath()
    g.ellipse(x + d * 16 * s, y - 4 * s, 11 * s, 5 * s, d * -0.5, 0, TAU)
    fill(g, '#4fbf4a')
    ink(g, 2.6)
  }
  g.beginPath()
  g.arc(x, y + 2 * s, 18 * s, 0, TAU)
  fill(g, body)
  ink(g, 3.2)
  g.beginPath()
  g.moveTo(x, y - 15 * s)
  g.quadraticCurveTo(x + 2 * s, y - 24 * s, x - 1 * s, y - 28 * s)
  ink(g, 2.6)
  g.beginPath()
  g.ellipse(x + 5 * s, y - 27 * s, 6 * s, 3 * s, -0.6, 0, TAU)
  fill(g, '#5fd35a')
  ink(g, 2)
  for (const d of [-1, 1]) {
    g.beginPath()
    if (awake > 0.5) {
      g.ellipse(x + d * 7 * s, y + 1 * s, 2.6 * s, 3.8 * s, 0, 0, TAU)
      fill(g, INK)
    } else {
      g.arc(x + d * 7 * s, y + 2 * s, 3 * s, 0.2, PI - 0.2)
      ink(g, 2)
    }
  }
  g.globalAlpha = 0.55
  for (const d of [-1, 1]) {
    g.beginPath()
    g.ellipse(x + d * 12 * s, y + 8 * s, 3.5 * s, 2 * s, 0, 0, TAU)
    fill(g, '#ff9eb5')
  }
  g.globalAlpha = 1
  g.beginPath()
  g.arc(x, y + 8 * s, 3.2 * s, 0.2, PI - 0.2)
  ink(g, 2)
}

/**
 * The woods' tap creature: a sleepy moss-sprite in a hollow log, who pops up
 * to say hello (`k` 0 hidden … 1 fully out). Log centred at (x, y).
 *
 * THE LOG GOES THROUGH `tapCover` — both halves of it. It belongs to the
 * sector's `paint()`, so on a painted sector it is ALREADY there, and drawing
 * it again in vector put a second, crisp log on top of its own painted self
 * (the same "two boats, one wave" this chapter's cousins were fixed for on
 * 2026-09-21; chapter 1's was simply missed). Two covers, not one, because
 * the creature rises BETWEEN them: the hollow behind it, then the bark in
 * front.
 */
const logSprite = (x: number, y: number): TapCreature => {
  const w = 96
  const h = 34
  // The log's back rim and dark hollow, behind the creature.
  const back = (g: G2D): void => {
    g.beginPath()
    g.ellipse(x - w / 2 + 10, y, 14, h / 2, 0, 0, TAU)
    fill(g, '#9a6446')
    ink(g, 3)
  }
  // The log's front: bark, rings on the cut face, moss along its top.
  const front = (g: G2D): void => {
    g.beginPath()
    g.roundRect(x - w / 2 + 10, y - h / 2, w - 10, h, h / 2)
    fill(g, C.trunk)
    ink(g, 3.4)
    g.beginPath()
    g.ellipse(x + w / 2, y, 12, h / 2, 0, 0, TAU)
    fill(g, '#f0c48a')
    ink(g, 3)
    g.beginPath()
    g.ellipse(x + w / 2, y, 6, h / 4, 0, 0, TAU)
    ink(g, 1.8)
    g.beginPath()
    g.ellipse(x - 6, y - 6, 20, 5, 0.1, 0, TAU)
    fill(g, C.moss)
  }
  return {
    x,
    y: y - 22,
    r: 56,
    draw: (g, k, t) => {
      tapCover(g, back)
      // The sprite, rising from behind the log — clipped at the log's top.
      if (k > 0.01) {
        g.save()
        g.beginPath()
        g.rect(x - w, y - 120, w * 2, 120 - 4)
        g.clip()
        const hop = Math.sin(Math.min(1, k) * PI * 0.5)
        sprite(g, x + 4, y - 2 - hop * 38 + Math.sin(t * 9) * 1.5 * k, 1, k)
        g.restore()
      }
      tapCover(g, front)
    }
  }
}

/** The Wood Sprite, chapter 1's rescue (§8.8 beat 3): curled up asleep
 *  under the dust, then awake, bouncing, with little hearts. */
const woodSprite = (x: number, y: number): RescueCollectible => ({
  x,
  y,
  r: 44,
  draw: (g, k, t) => {
    const bounce = k > 0.99 ? Math.abs(Math.sin(t * 3)) * 6 : k * 10
    // A bed of moss.
    g.beginPath()
    g.ellipse(x, y + 20, 42, 11, 0, 0, TAU)
    fill(g, C.mossShade)
    ink(g, 3)
    sprite(g, x, y - bounce, 1.35, k, k > 0.5 ? '#9ff07a' : '#7ee85a')
    if (k > 0.5) {
      g.globalAlpha = Math.min(1, (k - 0.5) * 2)
      for (const [dx, ph] of [[-30, 0], [30, 1.7]] as const) {
        const hy = y - 44 - ((t * 0.6 + ph) % 1) * 26
        g.beginPath()
        g.moveTo(x + dx, hy + 4)
        g.bezierCurveTo(x + dx - 8, hy - 3, x + dx - 3, hy - 9, x + dx, hy - 3)
        g.bezierCurveTo(x + dx + 3, hy - 9, x + dx + 8, hy - 3, x + dx, hy + 4)
        fill(g, '#ff8fb8')
        ink(g, 1.8)
      }
      g.globalAlpha = 1
    } else {
      // Asleep: a little "z" drawn, not typed.
      g.beginPath()
      g.moveTo(x + 22, y - 40)
      g.lineTo(x + 32, y - 40)
      g.lineTo(x + 22, y - 30)
      g.lineTo(x + 32, y - 30)
      ink(g, 2.4)
    }
  }
})

/* ── 1-1 · Cottage Meadow (the S1 sector) ───────────────────────────────── */
const cottageMeadow: SectorDef = {
  node: 0,
  rvu: 1,
  pots: WOODS_POTS,
  landmark: { x: 330, y: 302 },
  giftSpot: { x: 590, y: 520 },
  seed: 1,
  paint: (g, pot) => {
    sky(g, { sun: [990, 108], rainbow: [190, 430, 250], clouds: [[600, 92, 1], [180, 70, 0.8], [1060, 250, 0.7]] })
    farHills(g, 300, 336, 11)
    hill(g, 560, 1152, 860, 396, 470)
    meadow(g, 440, 470, 500)
    tree(g, 1000, 470, 0.72)
    millBody(g, 842, 430, 214)
    pathway(g, [[640, 680], [560, 600], [450, 530], [368, 462]], 46, 77)
    tree(g, 92, 462, 1.1)
    tree(g, 520, 440, 0.55)
    cottage(g, 330, 452, 196, pot)
    fence(g, 470, 470, 5, 30, 6)
    bush(g, 40, 470, 1.1)
    bush(g, 610, 458, 0.8)
    bush(g, 1120, 520, 1)
    pond(g, 150, 590, 128, 44)
    log(g, 900, 574, 150)
    mushrooms(g, [[880, 624, 1], [1080, 640, 0.8], [850, 640, 0.6]])
    flowers(g, 31, 34, 480, 660, [[440, 520, 300, 160], [0, 540, 290, 140], [840, 560, 260, 120]])
    tree(g, 1090, 560, 0.9)
  },
  props: (g, t, alive) => {
    sails(g, 842, 214, REST + alive * t * 0.9)
    if (alive <= 0) return
    smoke(g, 382, 256, t, alive)
    butterfly(g, 470, 360, t, 0, '#c7a6ff', alive)
    butterfly(g, 760, 300, t, 1, '#ffb36b', alive)
  }
}

/* ── 1-2 · Brook Bridge ──────────────────────────────────────────────────── */
const BROOK: readonly (readonly [number, number])[] = [
  [1180, 440], [1040, 470], [900, 520], [760, 580], [600, 610], [440, 612], [300, 632], [150, 672], [60, 700]
]
const brookBridge: SectorDef = {
  node: 1,
  rvu: 1,
  pots: WOODS_POTS,
  landmark: { x: 600, y: 530 },
  giftSpot: { x: 860, y: 640 },
  seed: 2,
  paint: (g, pot) => {
    sky(g, { sun: [180, 118], clouds: [[520, 80, 0.9], [900, 130, 1], [320, 200, 0.6]] })
    farHills(g, 310, 350, 23)
    hill(g, 0, 620, 260, 380, 460)
    meadow(g, 470, 490, 470)
    pine(g, 1040, 470, 0.82)
    pine(g, 1100, 500, 0.62)
    // The water-wheel hut up the brook.
    g.beginPath()
    g.roundRect(930, 382, 120, 92, 8)
    fill(g, C.wall)
    ink(g)
    g.beginPath()
    g.moveTo(916, 390)
    g.lineTo(990, 330)
    g.lineTo(1064, 390)
    g.closePath()
    fill(g, C.cap)
    ink(g)
    g.beginPath()
    g.arc(990, 420, 14, 0, TAU)
    fill(g, C.window)
    ink(g, 3.5)
    brook(g, BROOK, 70)
    stones(g, [[780, 590, 16], [420, 616, 12], [250, 646, 14]])
    tree(g, 150, 470, 0.95, '#ffd34d')
    tree(g, 340, 450, 0.6)
    bush(g, 60, 520, 0.9, '#ff7fbf')
    bush(g, 700, 486, 0.75)
    bridge(g, 600, 612, 250, pot)
    mushrooms(g, [[1010, 650, 0.8], [1060, 664, 0.55]])
    flowers(g, 47, 30, 490, 668, [[480, 560, 250, 100], [700, 540, 300, 80], [100, 610, 260, 70]])
    bush(g, 1120, 600, 0.95)
  },
  props: (g, t, alive) => {
    waterwheel(g, 1070, 450, 52, alive * t * 1.2)
    if (alive <= 0) return
    butterfly(g, 380, 380, t, 0, '#ff9ecf', alive)
    butterfly(g, 760, 420, t, 1, '#9fd8ff', alive)
    // A duck paddling up and down the brook.
    const k = (sin(t * 0.25) + 1) / 2
    g.globalAlpha = alive
    duck(g, 300 + k * 460, 628 - k * 36 + sin(t * 2) * 2)
    g.globalAlpha = 1
  }
}

/* ── 1-3 · Flower Garden ─────────────────────────────────────────────────── */
const flowerGarden: SectorDef = {
  node: 2,
  rvu: 1,
  pots: WOODS_POTS,
  landmark: { x: 576, y: 510 },
  giftSpot: { x: 420, y: 640 },
  seed: 3,
  paint: (g, pot) => {
    sky(g, { sun: [960, 90], rainbow: [980, 460, 230], clouds: [[260, 100, 0.9], [640, 70, 0.7]] })
    farHills(g, 300, 342, 37)
    hill(g, 0, 700, 300, 400, 470)
    meadow(g, 470, 480, 470)
    tree(g, 90, 470, 0.9)
    pine(g, 1080, 470, 0.72)
    pathway(g, [[600, 690], [600, 620], [580, 590]], 40, 83)
    fence(g, 330, 470, 8, 38, 0)
    well(g, 930, 540)
    beehive(g, 230, 560)
    flowerBed(g, 576, 560, 380, pot, 5)
    flowerBed(g, 250, 640, 200, { ...pot, base: C.flowerLilac, lite: '#d9c7ff' }, 6)
    flowerBed(g, 920, 640, 220, { ...pot, base: C.flowerYellow, lite: '#fff1a8' }, 7)
    bush(g, 1120, 560, 0.9, '#ff5a74')
    flowers(g, 59, 22, 480, 600, [[380, 480, 400, 120], [860, 460, 160, 100], [180, 480, 120, 100]])
  },
  props: (g, t, alive) => {
    if (alive <= 0) return
    bees(g, 230, 520, t, alive)
    butterfly(g, 480, 390, t, 0, '#ffb36b', alive)
    butterfly(g, 720, 360, t, 1, '#c7a6ff', alive)
    butterfly(g, 900, 420, t, 2, '#ff9ecf', alive)
  }
}

/* ── 1-4 · Treehouse Hollow ──────────────────────────────────────────────── */
const treehouseHollow: SectorDef = {
  node: 3,
  rvu: 1,
  pots: WOODS_POTS,
  landmark: { x: 700, y: 210 },
  giftSpot: { x: 420, y: 610 },
  seed: 4,
  paint: (g, pot) => {
    sky(g, { sun: [160, 100], clouds: [[420, 90, 0.8], [1010, 110, 0.9]] })
    farHills(g, 320, 360, 41)
    meadow(g, 480, 500, 480)
    pine(g, 90, 500, 1)
    pine(g, 200, 480, 0.7)
    tree(g, 1060, 500, 1.05, '#ffd34d')
    // The branch the swing hangs from.
    g.beginPath()
    g.moveTo(1000, 330)
    g.quadraticCurveTo(930, 300, 850, 318)
    g.lineWidth = 22
    g.strokeStyle = INK
    g.stroke()
    g.lineWidth = 14
    g.strokeStyle = C.trunk
    g.stroke()
    treehouse(g, 700, 580, pot)
    log(g, 300, 600, 140)
    mushrooms(g, [[520, 640, 0.8], [560, 652, 0.6], [600, 644, 0.7], [480, 656, 0.55]])
    bush(g, 250, 530, 0.8, '#ff7fbf')
    bush(g, 1120, 600, 0.9)
    flowers(g, 73, 26, 500, 668, [[560, 520, 280, 150], [280, 580, 200, 80]])
  },
  props: (g, t, alive) => {
    swing(g, 880, 322, 150, alive > 0 ? sin(t * 1.6) * 0.35 * alive : 0)
    // Lanterns strung along the platform: warm once restored.
    for (let i = 0; i < 5; i++) {
      const x = 600 + i * 50
      const y = 392 + sin(i * 1.3) * 6
      if (alive > 0) {
        g.globalAlpha = alive * (0.35 + 0.2 * sin(t * 2 + i))
        g.beginPath()
        g.arc(x, y, 18, 0, TAU)
        fill(g, '#fff1a8')
        g.globalAlpha = 1
      }
      g.beginPath()
      g.ellipse(x, y, 8, 10, 0, 0, TAU)
      fill(g, i & 1 ? '#ff8fc4' : '#ffd34d')
      ink(g, 2.4)
    }
    if (alive <= 0) return
    butterfly(g, 420, 380, t, 0, '#9fd8ff', alive)
  }
}

/* ── 1-5 · Briar's Grove — the boss sector (4× area) ─────────────────────── */
const briarsGrove: SectorDef = {
  node: 4,
  rvu: 2,
  pots: WOODS_POTS,
  landmark: { x: 576, y: 260 },
  giftSpot: { x: 576, y: 640 },
  seed: 5,
  paint: (g, pot) => {
    sky(g, { sun: [1000, 90], rainbow: [576, 520, 330], clouds: [[200, 80, 0.7], [420, 130, 0.5], [860, 150, 0.55]] })
    farHills(g, 330, 372, 53)
    // A grove twice the size of a meadow: everything behind is drawn small.
    for (const [x, y, s] of [[60, 420, 0.45], [150, 430, 0.38], [980, 420, 0.4], [1090, 430, 0.5], [320, 440, 0.34], [830, 440, 0.34]] as const) {
      pine(g, x, y, s)
    }
    meadow(g, 450, 470, 450)
    // The rock face and its waterfall.
    g.beginPath()
    g.moveTo(900, 470)
    g.lineTo(930, 290)
    g.lineTo(1040, 270)
    g.lineTo(1100, 320)
    g.lineTo(1120, 470)
    g.closePath()
    fill(g, C.stone)
    ink(g)
    greatTree(g, 576, 600, 0.9, pot)
    brambleArch(g, 200, 610, 240, pot)
    stones(g, [[380, 600, 20], [770, 600, 22], [440, 640, 14], [720, 648, 16], [300, 560, 12], [860, 566, 13]])
    bush(g, 60, 560, 0.8, '#ff7fbf')
    bush(g, 1120, 600, 0.9, '#ffd34d')
    mushrooms(g, [[340, 660, 0.6], [820, 668, 0.55], [880, 650, 0.5]])
    flowers(g, 97, 40, 470, 668, [[440, 520, 280, 150], [120, 500, 180, 150], [960, 470, 170, 120]])
  },
  props: (g, t, alive) => {
    waterfall(g, 1010, 470, 80, 190, alive * t)
    if (alive <= 0) return
    fireflies(g, 250, 280, 650, 240, t, alive)
    butterfly(g, 330, 420, t, 0, '#ffb36b', alive)
    butterfly(g, 820, 380, t, 1, '#c7a6ff', alive)
  }
}

/** Where each woods sector's log lies (open ground, clear of its gift). */
const LOGS: readonly (readonly [number, number])[] = [[930, 600], [230, 600], [330, 500], [860, 600], [230, 610]]

const WOODS: readonly SectorDef[] = [cottageMeadow, brookBridge, flowerGarden, treehouseHollow, briarsGrove]
  .map((s, i) => ({
    ...s,
    accent: s.accent ?? WOODS_ACCENT,
    tap: s.tap ?? logSprite(LOGS[i]![0], LOGS[i]![1]),
    // The Wood Sprite sleeps in the Flower Garden (§8.8).
    rescue: s.rescue ?? (i === 2 ? woodSprite(735, 612) : undefined)
  }))

export const SECTORS: Readonly<Record<number, SectorDef>> = Object.fromEntries(
  [...WOODS, ...C2_SECTORS, ...C3_SECTORS, ...C4_SECTORS, ...C5_SECTORS, ...C6_SECTORS, ...C7_SECTORS, ...C8_SECTORS, ...C9_SECTORS, ...C10_SECTORS].map((s) => [s.node, s])
)

/** The sector of node `n` (a chapter-1 sector stands in for unbuilt ones). */
export const sectorOf = (n: number): SectorDef => SECTORS[n] ?? SECTORS[n % 5] ?? cottageMeadow

