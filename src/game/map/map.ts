/**
 * map.ts — the map: the reward space (story-spec §3.5.1, §3.8, §8.10, §9.1).
 *
 * A pop-up book of chapter PAGES: ten pages laid end to end (landscape, pan
 * along x) or stacked (portrait, pan along y), after a small hub knoll. Each
 * page holds its chapter's five sectors along a winding trail, each sector a
 * live thumbnail of its own painting — dusty until restored, then in colour
 * with its props moving. One gesture vocabulary (§3.3.1): a press that moves
 * < 12 px within 250 ms is a TAP (resolved under the release point); anything
 * more is a PAN, with a little inertia. No pinch, no zoom.
 *
 * It draws into the ONE canvas the app root owns, from its one RAF; it never
 * calls `requestAnimationFrame` itself. A dialogue plays over it (dimmed).
 *
 * Nodes (§3.8): LOCKED — faded, not tappable (a tap wiggles it); CURRENT —
 * full colour and a breathing ring; COMPLETED — a star badge, tappable for a
 * practice replay. A won-but-unwiped sector carries its gift (or a boss's
 * chest), and the next node stays shut until it is opened (C9).
 *
 * After a win's reveal, the Twin Gift may sit beside the sector that was just
 * restored (`twinGift.ts`); a bloomed sector carries its Bloom (`bloom.ts`).
 */
import { S } from '@/game/duel/state'
import { hasBit, getPaintPick } from '@/game/campaign/bitset'
import { pendingSectorNode } from '@/game/campaign/state'
import { CHAPTERS, CHAPTER_COUNT, NODES_PER_CHAPTER, nodeChapter, nodeIsBoss, LAST_BUILT_NODE, toolOf } from '@/game/campaign/tables'
import { sectorOf } from '@/game/map/sectors'
import { SEC_W, SEC_H } from '@/game/restore/mask'
import { bakeDust, makeCanvas } from '@/game/restore/dust'
import { drawGift, drawBoxGift, drawChest, giftShake, chestRattle } from '@/game/restore/gift'
import { drawItem } from '@/game/artItem'
import { TENT_ART, tentShape } from '@/game/map/tent'
import { paintSectorArt, sectorPainted } from '@/game/map/sectorArt'
import { readInsets } from '@/game/duel/layout'
import { clamp, lerp, sin, TAU, PI } from '@/game/duel/util'
import { mapHud } from '@/use/useMapHud'
import { twinGift, isBloomed } from '@/use/useDuelRewards'
import { stepTwin, drawTwin, twinShown } from '@/game/map/twinGift'
import { drawBloom } from '@/game/map/bloom'
import { wanderHome, greetWanderer, drawWanderer } from '@/game/map/wanderer'
import { reducedMotion } from '@/use/useAccessibility'
import { drawFxUnder, drawFxOver, sparkleBurst } from '@/game/duel/fx'
import { sfx } from '@/game/duel/audio'
import { haptic } from '@/use/useHaptics'

type G2D = CanvasRenderingContext2D

/* ------------------------------------------------------------- geometry */

const PAGE_W = 1600
const PAGE_H = 900
const PAGE_WP = 900
const PAGE_HP = 1600
/** The hub knoll before chapter 1 (the wardrobe tent's home). */
const HUB = 380
const HUB_P = 300

interface Slot { x: number; y: number; w: number; h: number }
/** Sector thumbnails on a page, page-local map units: four, then the boss. */
const SLOTS: readonly Slot[] = [
  { x: 270, y: 600, w: 300, h: 175 }, { x: 580, y: 320, w: 300, h: 175 },
  { x: 890, y: 600, w: 300, h: 175 }, { x: 1190, y: 320, w: 300, h: 175 },
  { x: 1395, y: 610, w: 360, h: 210 }
]
const SLOTS_P: readonly Slot[] = [
  { x: 250, y: 250, w: 330, h: 193 }, { x: 650, y: 520, w: 330, h: 193 },
  { x: 250, y: 800, w: 330, h: 193 }, { x: 650, y: 1070, w: 330, h: 193 },
  { x: 450, y: 1360, w: 500, h: 292 }
]

let vw = 1
let vh = 1
let portrait = false
/** CSS px per map unit. */
let ms = 1
/** Camera: the map-unit offset along the scroll axis. */
let cam = 0
let camV = 0
let camTo: number | null = null
let camMax = 0
let insetTop = 0
let T = 0
/** The clock the AMBIENT loops draw with: `T`, or 0 — at rest — under reduced
 *  motion (§3.11). Set once per frame by `drawMap`. */
let Td = 0

const pageOrigin = (c: number): [number, number] => (portrait ? [0, HUB_P + c * PAGE_HP] : [HUB + c * PAGE_W, 0])
const slotOf = (n: number): Slot => {
  const [ox, oy] = pageOrigin(nodeChapter(n))
  const s = (portrait ? SLOTS_P : SLOTS)[n % NODES_PER_CHAPTER]!
  return { x: ox + s.x, y: oy + s.y, w: s.w, h: s.h }
}
/** Map units → CSS px. */
const sx = (mx: number): number => (portrait ? mx * ms : (mx - cam) * ms)
const sy = (my: number): number => (portrait ? (my - cam) * ms + insetTop : my * ms + (vh - PAGE_H * ms) / 2)
/** CSS px → map units. */
const mxOf = (x: number): number => (portrait ? x / ms : x / ms + cam)
const myOf = (y: number): number => (portrait ? (y - insetTop) / ms + cam : (y - (vh - PAGE_H * ms) / 2) / ms)

/* ---------------------------------------------------------------- state */

/** The furthest chapter reached (its page and the next are "resident"). */
const currentChapter = (): number => nodeChapter(Math.max(0, Math.min(LAST_BUILT_NODE, S.campaign.furthestNode + 1)))

export type NodeState = 'locked' | 'current' | 'done'
export const nodeState = (n: number): NodeState => {
  if (n <= S.campaign.furthestNode) return 'done'
  if (n === S.campaign.furthestNode + 1 && n <= LAST_BUILT_NODE) return 'current'
  return 'locked'
}

/* ------------------------------------------------------------ thumbnails */

const TW = 384
const TH = 224
const thumbs = new Map<number, { key: string; cv: HTMLCanvasElement }>()

const thumbOf = (n: number): HTMLCanvasElement => {
  const done = hasBit(S.campaign.sectorsDone, n)
  const pick = getPaintPick(S.campaign.paintPicks, n)
  // Whether its painting has decoded is part of the key: the thumb re-bakes
  // once when it lands (or when the art layer flips), and never again.
  const key = `${done ? 1 : 0}:${pick}:${sectorPainted(n, true) ? 1 : 0}`
  const hit = thumbs.get(n)
  if (hit && hit.key === key) return hit.cv
  const sec = sectorOf(n)
  const colour = makeCanvas(TW, TH)
  const g = colour.getContext('2d')
  if (g) {
    g.setTransform(TW / SEC_W, 0, 0, TH / SEC_H, 0, 0)
    const pot = sec.pots[Math.max(0, pick - 1)]!
    if (!paintSectorArt(g, n, sec, pot, true)) sec.paint(g, pot)
    g.setTransform(1, 0, 0, 1, 0, 0)
  }
  let cv = colour
  if (!done) {
    cv = makeCanvas(TW, TH)
    bakeDust(cv, colour, TW / SEC_W, n + 1, (dg) => {
      sec.props(dg, 0, 0)
      sec.tap?.draw(dg, 0, 0)
      sec.rescue?.draw(dg, 0, 0)
    })
  }
  thumbs.set(n, { key, cv })
  return cv
}

/* --------------------------------------------------------------- layout */

/** The strip of the view the map's own chrome covers (CSS px): the corner
 *  buttons along the bottom in portrait, the tab ribbon down the right in
 *  landscape. The camera may scroll the last page past it, and a focused
 *  node is centred in the view that is left — so no pulsing node is ever
 *  stuck under a button (a tap there would open the leaderboard). */
const CHROME_BOTTOM = 96
const CHROME_RIGHT = 64
let chromeB = CHROME_BOTTOM

export const mapResize = (w: number, h: number): void => {
  vw = w
  vh = h
  portrait = h >= w
  const ins = readInsets()
  insetTop = ins.top
  chromeB = CHROME_BOTTOM + ins.bottom
  if (portrait) {
    ms = w / PAGE_WP
    camMax = Math.max(0, HUB_P + CHAPTER_COUNT * PAGE_HP - (h - ins.top - chromeB) / ms)
  } else {
    ms = Math.min(w / PAGE_W, h / PAGE_H)
    camMax = Math.max(0, HUB + CHAPTER_COUNT * PAGE_W - (w - CHROME_RIGHT - ins.right) / ms)
  }
  cam = clamp(cam, 0, camMax)
  publish()
}

/** Centre the camera on node `n`'s sector (or the current node). */
export const focusMap = (n = -1, animate = false): void => {
  const node = n >= 0 ? n : Math.max(0, Math.min(LAST_BUILT_NODE, S.campaign.furthestNode + 1))
  const s = slotOf(node)
  const target = clamp(portrait ? s.y - (vh - insetTop - chromeB) / ms / 2 : s.x - (vw - CHROME_RIGHT) / ms / 2, 0, camMax)
  if (animate) camTo = target
  else {
    cam = target
    camTo = null
  }
  camV = 0
  publish()
}

/** Page-turn to chapter `c` (the tab ribbon). */
export const showChapter = (c: number): void => {
  const [ox, oy] = pageOrigin(c)
  const target = portrait ? oy : ox + PAGE_W / 2 - (vw - CHROME_RIGHT) / ms / 2
  camTo = clamp(target, 0, camMax)
  camV = 0
}

/* ---------------------------------------------------------------- input */

let downX = 0
let downY = 0
let downT = 0
let lastX = 0
let lastY = 0
let lastT = 0
let dragging = false
let pressed = false

/** What a tap on the map may hit. */
export type MapTarget =
  | { kind: 'node'; node: number } | { kind: 'gift'; node: number } | { kind: 'tent' } | { kind: 'creature'; node: number }
  | { kind: 'umbra' }

/* ── The tap creatures (§8.8 beat 2): a ~900 ms peek-a-boo on a restored
 *    sector, re-triggerable forever, delight only. ── */
const peeks = new Map<number, number>()
/** 0 hidden … 1 out: up in 250 ms, a 400 ms hello, down in 250 ms. */
const peekK = (n: number): number => {
  const at = peeks.get(n)
  if (at === undefined) return 0
  const u = T - at
  if (u >= 0.9) {
    peeks.delete(n)
    return 0
  }
  const ez = (v: number): number => 1 - (1 - v) * (1 - v)
  return u < 0.25 ? ez(u / 0.25) : u < 0.65 ? 1 : 1 - ez((u - 0.65) / 0.25)
}
/** Tap: out it pops, with one chime-family note. */
export const peekCreature = (n: number): void => {
  if (peeks.has(n)) return
  peeks.set(n, T)
  sfx('peek', n % 6)
  haptic('tick')
}
/** A restored sector's tap spot on screen: [x, y, radius], CSS px. */
const tapScreen = (n: number): [number, number, number] | null => {
  const tp = sectorOf(n).tap
  if (!tp) return null
  const s = slotOf(n)
  const k = (s.w * ms) / SEC_W
  return [sx(s.x - s.w / 2 + (tp.x / SEC_W) * s.w), sy(s.y - s.h / 2 + (tp.y / SEC_H) * s.h), Math.max(26, tp.r * k)]
}
let onTap: (t: MapTarget) => void = () => {}
/** The flow tells the map what a tap means (kept out of this module). */
export const setMapTapHandler = (fn: (t: MapTarget) => void): void => { onTap = fn }

/** Node marker radius, CSS px: never below a 64 px target (§3.4). */
const markerR = (): number => Math.max(32, 30 * ms * 1.1)

const hitTest = (x: number, y: number): MapTarget | null => {
  const pending = pendingSectorNode(S.campaign)
  if (pending !== null) {
    const [gx, gy, gs] = giftScreen(pending)
    if (Math.hypot(x - gx, y - (gy - gs * 0.4)) < Math.max(40, gs * 0.75)) return { kind: 'gift', node: pending }
  }
  if (tentShown()) {
    const [tx, ty, ts] = tentScreen()
    if (Math.abs(x - tx) < Math.max(40, ts * 0.6) && y > ty - ts && y < ty + 12) return { kind: 'tent' }
  }
  // Umbra, visiting after the finale (§8.11): she stands beside a marker,
  // never on it, so she is tested first.
  const wh = wanderHome()
  if (wh >= 0) {
    const [ux, uy, uh] = wandererScreen(wh)
    if (Math.abs(x - ux) < Math.max(30, uh * 0.4) && y > uy - uh * 0.95 && y < uy + 8) return { kind: 'umbra' }
  }
  for (let n = 0; n <= LAST_BUILT_NODE; n++) {
    const [mx, my] = markerScreen(n)
    if (Math.hypot(x - mx, y - my) < markerR() + 8) return { kind: 'node', node: n }
  }
  // A restored sector's creature, before the thumbnail it lives in.
  for (let n = 0; n <= LAST_BUILT_NODE; n++) {
    if (!hasBit(S.campaign.sectorsDone, n)) continue
    const p = tapScreen(n)
    if (p && Math.hypot(x - p[0], y - p[1]) < p[2]) return { kind: 'creature', node: n }
  }
  for (let n = 0; n <= LAST_BUILT_NODE; n++) {
    // A tap on a thumbnail counts as its node, too — the bigger target.
    const s = slotOf(n)
    const x0 = sx(s.x - s.w / 2)
    const y0 = sy(s.y - s.h / 2)
    if (x >= x0 && x <= x0 + s.w * ms && y >= y0 && y <= y0 + s.h * ms) return { kind: 'node', node: n }
  }
  return null
}

export const mapPointerDown = (x: number, y: number, t: number): void => {
  pressed = true
  dragging = false
  downX = lastX = x
  downY = lastY = y
  downT = lastT = t
  camV = 0
  camTo = null
}

export const mapPointerMove = (x: number, y: number, t: number): void => {
  if (!pressed) return
  if (!dragging && Math.hypot(x - downX, y - downY) >= 12) dragging = true
  if (dragging) {
    const d = portrait ? lastY - y : lastX - x
    cam = clamp(cam + d / ms, 0, camMax)
    const dt = Math.max(1, t - lastT) / 1000
    camV = lerp(camV, d / ms / dt, 0.4)
  }
  lastX = x
  lastY = y
  lastT = t
}

export const mapPointerUp = (x: number, y: number, t: number): void => {
  if (!pressed) return
  pressed = false
  // A press that never travelled 12 px is a tap, however slowly a small hand
  // lifts; one that did is a pan, and never taps whatever it ends over (§3.3.1).
  void downT
  if (!dragging && Math.hypot(x - downX, y - downY) < 12) {
    const hit = hitTest(x, y)
    if (hit) onTap(hit)
  }
  if (!dragging) camV = 0
  dragging = false
}

/* --------------------------------------------------------------- update */

export const updateMap = (dt: number): void => {
  T += dt
  stepTwin(dt, twinGift.node >= 0 ? twinScreen(twinGift.node) : null)
  // A bloom just landed: celebrate it where it is.
  if (twinGift.bloomed >= 0) {
    const s = slotOf(twinGift.bloomed)
    sparkleBurst(sx(s.x), sy(s.y), 1.2)
    twinGift.bloomed = -1
  }
  if (camTo !== null) {
    cam = lerp(cam, camTo, 1 - Math.exp(-dt * 7))
    if (Math.abs(cam - camTo) < 0.5) {
      cam = camTo
      camTo = null
    }
  } else if (!pressed && Math.abs(camV) > 1) {
    cam = clamp(cam + camV * dt, 0, camMax)
    camV *= Math.exp(-dt * 4)
  }
  publish()
}

/* ----------------------------------------------------------------- draw */

let bg: CanvasGradient | null = null
let bgKey = ''

const markerScreen = (n: number): [number, number] => {
  const s = slotOf(n)
  return [sx(s.x), sy(s.y + s.h / 2)]
}
/** Where wandering Umbra stands on sector `n`: hooves (x, y), height, CSS px
 *  — its lower left corner, clear of the node marker (and, on a page's last
 *  sector, of the landscape tab ribbon down the right edge). */
const wandererScreen = (n: number): [number, number, number] => {
  const s = slotOf(n)
  return [sx(s.x - s.w * 0.34), sy(s.y + s.h * 0.46), Math.max(56, s.h * ms * 0.55)]
}
/** Her bubble's anchor, kept on screen whatever the sector's position. */
const sayAt = (x: number, y: number, h: number): { x: number; y: number } =>
  ({ x: Math.round(clamp(x, 140, vw - 140)), y: Math.round(Math.max(90, y - h)) })
let sayUntil = 0
/** Umbra was tapped: she answers (the bubble is the DOM's, `mapHud.umbraSay`). */
export const greetUmbra = (): void => {
  const key = greetWanderer(T)
  sayUntil = T + 2.8
  const wh = wanderHome()
  if (wh < 0) return
  const [x, y, h] = wandererScreen(wh)
  mapHud.umbraSay = { key, ...sayAt(x, y, h) }
}
const giftScreen = (n: number): [number, number, number] => {
  const s = slotOf(n)
  const sec = sectorOf(n)
  const gx = s.x - s.w / 2 + (sec.giftSpot.x / SEC_W) * s.w
  const gy = s.y - s.h / 2 + (sec.giftSpot.y / SEC_H) * s.h
  return [sx(gx), sy(gy), Math.max(46, s.h * ms * (nodeIsBoss(n) ? 0.5 : 0.42))]
}

/** The Twin Gift stands at the sector's lower-right corner, over its frame. */
const twinScreen = (n: number): [number, number, number] => {
  const s = slotOf(n)
  return [sx(s.x + s.w * 0.5 - s.w * 0.07), sy(s.y + s.h * 0.5 + s.h * 0.06), Math.max(52, s.h * ms * 0.34)]
}

/** The wardrobe tent stands on the hub knoll once there is something to wear. */
const tentShown = (): boolean => S.campaign.giftsOwned !== 0
const tentScreen = (): [number, number, number] => {
  const mx = portrait ? PAGE_WP * 0.72 : HUB * 0.52
  const my = portrait ? HUB_P * 0.78 : PAGE_H * 0.62
  return [sx(mx), sy(my), Math.max(70, 150 * ms)]
}

const drawBackdrop = (g: G2D): void => {
  const key = `${vw}x${vh}`
  if (!bg || key !== bgKey) {
    bgKey = key
    bg = g.createLinearGradient(0, 0, 0, vh)
    bg.addColorStop(0, '#2b2048')
    bg.addColorStop(1, '#503a74')
  }
  g.fillStyle = bg
  g.fillRect(0, 0, vw, vh)
}

/** Each built chapter's page wash — its biome, in two soft bands. */
const PAGE_WASH: readonly (readonly [string, string])[] = [
  ['#c9f5b4', '#a8eb92'], // Whispering Woods: meadow greens
  ['#ffe9b0', '#a6e6f5'], // Bubble Bay: sand over a sea band
  ['#e6e9ff', '#cfd6fa'], // Cloud Kingdom: cloud and lavender
  ['#e3d6ff', '#c9b6f5'], // Crystal Caves: amethyst glow
  ['#dcf5ee', '#c2e6f0'], // Mirror Mountains: mint glass and silver
  ['#ffe0ef', '#ffe9c4'], // Rainbow Ridge: pink into peach
  ['#ffe8c4', '#ffd6a8'], // Sunken Sands: warm dunes
  ['#e0f4ff', '#d8ecf8'], // Twilight Tundra: snow and ice
  ['#d8dcff', '#c4c6f5'], // Starlight Summit: night periwinkle
  ['#ffe0ea', '#fff0c8'] // Friendship Festival: candy and lemon
]

/** One chapter page: a paper card with a soft biome wash and the trail. */
const drawPage = (g: G2D, c: number): void => {
  const [ox, oy] = pageOrigin(c)
  const pw = portrait ? PAGE_WP : PAGE_W
  const ph = portrait ? PAGE_HP : PAGE_H
  const pad = 26
  const x = sx(ox + pad)
  const y = sy(oy + pad)
  const w = (pw - pad * 2) * ms
  const h = (ph - pad * 2) * ms
  if (x > vw + 40 || x + w < -40 || y > vh + 40 || y + h < -40) return
  const built = CHAPTERS[c]?.built ?? false
  const r = 28 * ms
  g.fillStyle = 'rgba(20,10,30,0.35)'
  g.beginPath()
  g.roundRect(x + 8, y + 10, w, h, r)
  g.fill()
  g.beginPath()
  g.roundRect(x, y, w, h, r)
  g.fillStyle = built ? '#fff4e6' : '#d8cfe6'
  g.fill()
  g.lineWidth = 3
  g.strokeStyle = '#3A2340'
  g.stroke()
  g.save()
  g.beginPath()
  g.roundRect(x, y, w, h, r)
  g.clip()
  // The biome wash: rolling hills along the page's foot (portrait: its side).
  const wash = built ? PAGE_WASH[c] ?? PAGE_WASH[0]! : ['#c8bedb', '#b7abcc']
  for (let i = 0; i < 2; i++) {
    g.beginPath()
    if (portrait) {
      g.moveTo(x, y + h * (0.12 + i * 0.05))
      for (let k = 0; k <= 8; k++) g.lineTo(x + w * (0.1 + 0.08 * sin(k * 1.7 + i)), y + (h * k) / 8)
      g.lineTo(x, y + h)
    } else {
      g.moveTo(x, y + h * (0.78 - i * 0.08))
      for (let k = 0; k <= 8; k++) g.lineTo(x + (w * k) / 8, y + h * (0.72 - i * 0.07 + 0.05 * sin(k * 1.9 + i)))
      g.lineTo(x + w, y + h)
      g.lineTo(x, y + h)
    }
    g.closePath()
    g.fillStyle = wash[i]!
    g.fill()
  }
  g.restore()
  if (!built) {
    // A sleepy silhouette: the page exists, its story comes later (§3.7).
    g.globalAlpha = 0.5
    for (let i = 0; i < NODES_PER_CHAPTER; i++) {
      const s = slotOf(c * NODES_PER_CHAPTER + i)
      g.beginPath()
      g.roundRect(sx(s.x - s.w / 2), sy(s.y - s.h / 2), s.w * ms, s.h * ms, 14 * ms)
      g.fillStyle = '#a99dc0'
      g.fill()
    }
    g.globalAlpha = 1
    // Asleep, not locked: a crescent moon dozing over the page, with a drawn
    // Z — "this part of the story is still sleeping" (no words, §3.7).
    const mx = x + w * 0.5
    const my = y + h * (portrait ? 0.08 : 0.16)
    const mr = Math.max(16, 44 * ms)
    g.beginPath()
    g.arc(mx, my, mr, 0.35 * PI, 1.65 * PI, false)
    g.arc(mx + mr * 0.42, my - mr * 0.12, mr * 0.78, 1.5 * PI, 0.5 * PI, true)
    g.closePath()
    g.fillStyle = '#e8dcff'
    g.fill()
    g.lineWidth = Math.max(2, 4 * ms)
    g.strokeStyle = '#3A2340'
    g.stroke()
    const zb = Math.sin(Td * 1.5) * 4 * ms
    for (const [k, sz] of [[0, 1], [1, 0.7]] as const) {
      const zx = mx + mr * (1 + k * 0.7)
      const zy = my - mr * (0.6 + k * 0.7) + zb
      const zs = mr * 0.32 * sz
      g.beginPath()
      g.moveTo(zx - zs, zy - zs)
      g.lineTo(zx + zs, zy - zs)
      g.lineTo(zx - zs, zy + zs)
      g.lineTo(zx + zs, zy + zs)
      g.lineWidth = Math.max(2, 4 * ms * sz)
      g.stroke()
    }
    return
  }
  // The trail between the sectors, as a dotted path.
  g.save()
  g.setLineDash([10 * ms + 4, 12 * ms + 4])
  g.lineWidth = Math.max(3, 8 * ms)
  g.lineCap = 'round'
  g.strokeStyle = '#e7b76a'
  g.beginPath()
  for (let i = 0; i < NODES_PER_CHAPTER; i++) {
    const [mx, my] = markerScreen(c * NODES_PER_CHAPTER + i)
    if (i) g.lineTo(mx, my)
    else g.moveTo(mx, my)
  }
  g.stroke()
  g.restore()
}

/** A sector's thumbnail in its frame, with its props alive once restored. */
const drawSector = (g: G2D, n: number, liveBudget: { n: number }): void => {
  const s = slotOf(n)
  const x = sx(s.x - s.w / 2)
  const y = sy(s.y - s.h / 2)
  const w = s.w * ms
  const h = s.h * ms
  if (x > vw || x + w < 0 || y > vh || y + h < 0) return
  const st = nodeState(n)
  const done = hasBit(S.campaign.sectorsDone, n)
  const b = Math.max(3, 6 * ms)
  g.fillStyle = 'rgba(20,10,30,0.35)'
  g.beginPath()
  g.roundRect(x - b + 4, y - b + 6, w + 2 * b, h + 2 * b, b * 2)
  g.fill()
  g.fillStyle = st === 'current' ? '#fff1b8' : '#ffffff'
  g.beginPath()
  g.roundRect(x - b, y - b, w + 2 * b, h + 2 * b, b * 2)
  g.fill()
  g.lineWidth = 2.5
  g.strokeStyle = '#3A2340'
  g.stroke()
  g.save()
  if (st === 'locked') g.globalAlpha = 0.45
  g.drawImage(thumbOf(n), x, y, w, h)
  // A restored sector's props keep moving on the map (§8.8) — up to a cap,
  // past which they rest on their first frame (§9.5's ≤ 16).
  // A bloomed sector's extra life rides the same budget (§8.8.5): extra props
  // within the cap, resting on a still frame when the cap is spent.
  const live = done && liveBudget.n > 0
  const bloomed = done && isBloomed(n)
  if (live || bloomed) {
    if (live) liveBudget.n--
    g.beginPath()
    g.rect(x, y, w, h)
    g.clip()
    const k = w / SEC_W
    g.translate(x, y)
    g.scale(k, h / SEC_H)
    const sec = sectorOf(n)
    if (live) {
      sec.props(g, Td + n * 1.7, 1)
      // The permanence beats a done sector always shows (§8.8): its creature
      // (peeking when tapped) and, on the chapter's one, the rescued friend.
      sec.tap?.draw(g, peekK(n), T)
      sec.rescue?.draw(g, 1, Td + n)
    }
    if (bloomed) drawBloom(g, n, live ? Td + n * 0.9 : 0)
  }
  g.restore()
}

const drawMarker = (g: G2D, n: number): void => {
  const [x, y] = markerScreen(n)
  if (x < -60 || x > vw + 60 || y < -60 || y > vh + 60) return
  const st = nodeState(n)
  const r = markerR() * (nodeIsBoss(n) ? 1.15 : 1)
  if (st === 'current' && pendingSectorNode(S.campaign) === null) {
    // The breathing ring: "this one is yours to play".
    const k = 0.5 + 0.5 * sin(Td * 3.2)
    g.beginPath()
    g.arc(x, y, r + 6 + k * 8, 0, TAU)
    g.lineWidth = 5
    g.strokeStyle = `rgba(255, 215, 106, ${0.35 + 0.5 * k})`
    g.stroke()
  }
  g.beginPath()
  g.arc(x, y, r, 0, TAU)
  g.fillStyle = st === 'done' ? '#ffd76a' : st === 'current' ? '#8f6cff' : '#a99dc0'
  g.fill()
  g.lineWidth = 4
  g.strokeStyle = '#3A2340'
  g.stroke()
  // The glyph: a star when done, a crown for a boss, a sparkle when current,
  // a little lock when shut.
  g.save()
  g.translate(x, y)
  g.fillStyle = st === 'done' ? '#fff6d0' : '#ffffff'
  g.strokeStyle = '#3A2340'
  g.lineWidth = 2.5
  g.beginPath()
  const R = r * 0.55
  if (st === 'locked') {
    g.roundRect(-R * 0.6, -R * 0.1, R * 1.2, R * 0.9, 4)
    g.moveTo(-R * 0.35, -R * 0.1)
    g.arc(0, -R * 0.1, R * 0.35, PI, 0)
  } else if (nodeIsBoss(n)) {
    g.moveTo(-R, R * 0.5)
    g.lineTo(-R, -R * 0.4)
    g.lineTo(-R * 0.45, R * 0.05)
    g.lineTo(0, -R * 0.7)
    g.lineTo(R * 0.45, R * 0.05)
    g.lineTo(R, -R * 0.4)
    g.lineTo(R, R * 0.5)
    g.closePath()
  } else {
    for (let i = 0; i < 10; i++) {
      const a = -PI / 2 + (i * PI) / 5
      const rr = i & 1 ? R * 0.45 : R
      if (i) g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
      else g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr)
    }
    g.closePath()
  }
  g.fill()
  g.stroke()
  g.restore()
}

const drawPendingGift = (g: G2D): void => {
  const n = pendingSectorNode(S.campaign)
  if (n === null) return
  const [x, y, s] = giftScreen(n)
  if (x < -s || x > vw + s || y < -s || y > vh + s) return
  // A breathing glow: it is waiting for the player (§3.2.2 step 5).
  g.save()
  g.globalAlpha = 0.45 + 0.2 * sin(Td * 3)
  const gr = g.createRadialGradient(x, y - s * 0.4, 4, x, y - s * 0.4, s * 1.2)
  gr.addColorStop(0, '#fff6c8')
  gr.addColorStop(1, 'rgba(255,246,200,0)')
  g.fillStyle = gr
  g.fillRect(x - s * 1.3, y - s * 1.7, s * 2.6, s * 2.6)
  g.restore()
  const ac = sectorOf(n).accent
  if (nodeIsBoss(n)) drawChest(g, x, y, s, { rot: chestRattle(Td), open: 0, gleam: 0.5 + 0.5 * sin(Td * 4) }, ac?.gem)
  else (toolOf(n) === 'eraser' ? drawBoxGift : drawGift)(g, x, y, s, { rot: giftShake(Td), untie: 0, squash: 1, ribbon: ac?.ribbon, ribbonShade: ac?.ribbonShade })
}

/** The wardrobe tent on the hub knoll (C17): a striped pavilion with a pennant. */
const drawTent = (g: G2D): void => {
  if (!tentShown()) return
  const [x, y, s] = tentScreen()
  if (x < -s || x > vw + s || y < -s * 1.4 || y > vh + s) return
  g.save()
  g.translate(x, y)
  if (!drawItem(g, TENT_ART, s)) {
    const k = s / 150
    g.scale(k, k)
    tentShape(g, sin(Td * 3) * 4)
  }
  g.restore()
}

export const drawMap = (g: G2D): void => {
  Td = reducedMotion.value ? 0 : T
  const d = S.dpr
  g.setTransform(d, 0, 0, d, 0, 0)
  g.globalAlpha = 1
  g.globalCompositeOperation = 'source-over'
  drawBackdrop(g)
  for (let c = 0; c < CHAPTER_COUNT; c++) drawPage(g, c)
  drawTent(g)
  const budget = { n: S.q > 0 ? 16 : 8 }
  for (let n = 0; n <= LAST_BUILT_NODE; n++) drawSector(g, n, budget)
  for (let n = 0; n <= LAST_BUILT_NODE; n++) drawMarker(g, n)
  drawPendingGift(g)
  const wh = wanderHome()
  if (wh >= 0) {
    const [ux, uy, uh] = wandererScreen(wh)
    if (ux > -uh && ux < vw + uh && uy > -uh && uy < vh + uh) drawWanderer(g, ux, uy, uh, Td)
  }
  if (twinGift.node >= 0) {
    const [x, y, s] = twinScreen(twinGift.node)
    if (x > -s && x < vw + s && y > -s && y < vh + s * 1.5) drawTwin(g, x, y, s, Td)
  }
  drawFxUnder(g)
  drawFxOver(g)
}

/* --------------------------------------------------------------- chrome */

/** Publish what the DOM chrome needs (tabs, a11y targets). Cheap; on change. */
const publish = (): void => {
  const reached = currentChapter()
  const visible = portrait ? clamp(Math.floor((cam + (vh / ms) / 2 - HUB_P) / PAGE_HP), 0, 9) : clamp(Math.floor((cam + vw / ms / 2 - HUB) / PAGE_W), 0, 9)
  if (mapHud.reached !== reached) mapHud.reached = reached
  if (mapHud.visible !== visible) mapHud.visible = visible
  if (mapHud.portrait !== portrait) mapHud.portrait = portrait
  if (mapHud.versus !== S.campaign.versusUnlocked) mapHud.versus = S.campaign.versusUnlocked
  // The Twin Gift's DOM hold target follows the gift as the map pans.
  if (twinGift.node >= 0 && twinShown()) {
    const [x, y, s] = twinScreen(twinGift.node)
    const size = Math.max(64, Math.round(s * 1.25))
    const bx = Math.round(x - size / 2)
    const by = Math.round(y - s * 0.4 - size / 2)
    const tw = mapHud.twin
    if (!tw || tw.x !== bx || tw.y !== by || tw.size !== size) mapHud.twin = { x: bx, y: by, size }
  } else if (mapHud.twin) mapHud.twin = null
  // Umbra's line follows her as the map pans, and ends on its own.
  if (mapHud.umbraSay) {
    const wh = wanderHome()
    if (wh < 0 || T > sayUntil) mapHud.umbraSay = null
    else {
      const [x, y, h] = wandererScreen(wh)
      const p = sayAt(x, y, h)
      if (mapHud.umbraSay.x !== p.x || mapHud.umbraSay.y !== p.y) mapHud.umbraSay = { ...mapHud.umbraSay, ...p }
    }
  }
}

/** Test/QA seams. */
export const qaMap = {
  cam: (): number => cam,
  markerAt: (n: number): [number, number] => markerScreen(n),
  giftAt: (n: number): [number, number] => {
    const [x, y, s] = giftScreen(n)
    return [x, y - s * 0.4]
  },
  twinAt: (): [number, number] | null => {
    if (twinGift.node < 0) return null
    const [x, y, s] = twinScreen(twinGift.node)
    return [x, y - s * 0.4]
  },
  creatureAt: (n: number): [number, number] | null => {
    const p = tapScreen(n)
    return p ? [p[0], p[1]] : null
  },
  peeking: (n: number): boolean => peeks.has(n),
  /** Wandering Umbra's hooves on screen, or null (§8.11). */
  umbraAt: (): [number, number] | null => {
    const wh = wanderHome()
    if (wh < 0) return null
    const [x, y, h] = wandererScreen(wh)
    return [x, y - h * 0.4]
  },
  tentAt: (): [number, number] => {
    const [x, y, s] = tentScreen()
    return [x, y - s * 0.4]
  },
  state: nodeState
}

/**
 * The biome in view, for the ambience bus (§8.8 beat 1): the page nearest the
 * middle of the view, at full level while any of its sectors is restored.
 */
export const mapAmbience = (): [number, number] => {
  const c = mapHud.visible
  if (!CHAPTERS[c]?.built) return [-1, 0]
  for (let i = 0; i < NODES_PER_CHAPTER; i++) {
    if (hasBit(S.campaign.sectorsDone, c * NODES_PER_CHAPTER + i)) return [c, 1]
  }
  return [c, 0]
}
