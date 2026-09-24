/**
 * map.ts — the map: the reward space (story-spec §3.5.1, §3.8, §8.10, §9.1,
 * §8.28).
 *
 * A BOUND BOOK of pages, one on screen at a time: the front page (the knoll
 * where the wardrobe tent stands), then one page per chapter, each holding
 * its five sectors along a winding trail — every sector a live thumbnail of
 * its own painting, dusty until restored, then in colour with its props
 * moving.
 *
 * Turning is the whole navigation (§8.28): drag the page sideways and it
 * follows the finger, swinging about the spine on its left with the next page
 * already underneath; let go past a third of the way (or flick) and it falls
 * over, otherwise it falls back. Tapping a folded corner turns one page, and
 * the chapter tabs turn straight to their page. One gesture vocabulary
 * (§3.3.1): a press that moves < 12 px is a TAP (resolved under the release
 * point); anything more is a page turn. No pinch, no zoom, and no free
 * panning — a book has pages, not a scroll.
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
import { meetCreature } from '@/game/campaign/controller'
import { CHAPTERS, CHAPTER_COUNT, NODES_PER_CHAPTER, nodeChapter, nodeIsBoss, LAST_BUILT_NODE, toolOf } from '@/game/campaign/tables'
import { sectorOf } from '@/game/map/sectors'
import { SEC_W, SEC_H } from '@/game/restore/mask'
import { bakeDust, makeCanvas } from '@/game/restore/dust'
import { drawGift, drawBoxGift, drawChest, giftShake, chestRattle } from '@/game/restore/gift'
import { drawItem } from '@/game/artItem'
import { TENT_ART, tentShape } from '@/game/map/tent'
import { badgeFrame, drawBadge, paintStarSticker } from '@/game/map/badge'
import { hasStar } from '@/game/campaign/stars'
import { paintSectorArt, sectorPainted } from '@/game/map/sectorArt'
import { withCoverLayer, type CoverLayer } from '@/game/map/tapCover'
import { readInsets } from '@/game/duel/layout'
import { clamp, ease, lerp, seeded, sin, TAU, PI } from '@/game/duel/util'
import { mapHud, rankInset } from '@/use/useMapHud'
import { twinGift, isBloomed } from '@/use/useDuelRewards'
import { stepTwin, drawTwin, twinShown } from '@/game/map/twinGift'
import { dailyGift, drawDaily } from '@/game/map/dailyGift'
import { drawBloom } from '@/game/map/bloom'
import { pageDecorBake, type KeepOut } from '@/game/map/pageDecor'
import { spriteFor, onArtChanged } from '@/game/art'
import { drawSheetTiled } from '@/game/fit'
import { pageArtId, frontPageArtId } from '@/game/artIds'
import { wanderHome, greetWanderer, drawWanderer } from '@/game/map/wanderer'
import { reducedMotion } from '@/use/useAccessibility'
import { drawBookmark, drawDogEar, drawSpine, drawTurned, shadeTurnEdge, turnAngle, turnWidth } from '@/game/flow/pageTurn'
import { drawUnicorn, RIG_HEIGHT, type Face } from '@/game/duel/chars'
import { guardianOf, type FoePalette } from '@/game/duel/foes'
import { equippedHooks } from '@/game/cosmetics/rig-cosmetics'
import { drawFxUnder, drawFxOver, sparkleBurst, trail, glint } from '@/game/duel/fx'
import { sfx } from '@/game/duel/audio'
import { haptic } from '@/use/useHaptics'
import { registerBookmarkTap, breakBookmarkChain } from '@/use/useQaAdTrigger'

type G2D = CanvasRenderingContext2D

/* ------------------------------------------------------------- geometry */

const PAGE_W = 1600
const PAGE_H = 900
const PAGE_WP = 900
const PAGE_HP = 1600
/** The front page — the knoll the wardrobe tent stands on — is a page like
 *  any other, so every page turn moves by exactly one page. */
const HUB = PAGE_W
const HUB_P = PAGE_HP

interface Slot { x: number; y: number; w: number; h: number }
/** Sector thumbnails on a page, page-local map units: four, then the boss. */
// `x` is the card's CENTRE. A card also draws a frame `b` outside its picture
// and a drop shadow outside that, so its real extent is `w / 2 + ~11` units
// either side — which is how the boss card, the one that is 360 wide instead
// of 300, ended up hanging over the fore-edge of the page while thirty units
// of margin sat unused on the other side. The trail is centred now: the first
// card's left margin and the boss card's right margin are both ~40 units.
const SLOTS: readonly Slot[] = [
  { x: 225, y: 600, w: 300, h: 175 }, { x: 535, y: 320, w: 300, h: 175 },
  { x: 845, y: 600, w: 300, h: 175 }, { x: 1145, y: 320, w: 300, h: 175 },
  { x: 1345, y: 610, w: 360, h: 210 }
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
/** Camera: the map-unit offset along the scroll axis. It only ever rests ON
 *  a page (`camOf`); what moves between two pages is the page itself. */
let cam = 0
let camMax = 0
/** The visible width of the book, map units (landscape). */
let visW = 0
let insetTop = 0
let T = 0
/** The clock the AMBIENT loops draw with: `T`, or 0 — at rest — under reduced
 *  motion (§3.11). Set once per frame by `drawMap`. */
let Td = 0

const pageOrigin = (c: number): [number, number] => (portrait ? [0, HUB_P + c * PAGE_HP] : [HUB + c * PAGE_W, 0])

/* --------------------------------------------------------------- the book */

/** The front page, then one per chapter. */
const PAGE_COUNT = CHAPTER_COUNT + 1
/** The page on screen — the destination, while one is turning. */
let page = 0
/** The page being left, or -1 when nothing is turning. */
let turnFrom = -1
/** How far it has swung (0 flat … 1 over), and where it is heading. */
let turnP = 0
let turnTo = 1
let turnDir: 1 | -1 = 1
/** A finger is dragging it over: no clock until it lets go. */
let turnHeld = false

const turning = (): boolean => turnFrom >= 0

/** Where the camera rests for page `p`. */
const camOf = (p: number): number => {
  if (p <= 0) return 0
  const [ox, oy] = pageOrigin(p - 1)
  return portrait ? oy : ox + PAGE_W / 2 - visW / 2
}

/** The page a node lives on. */
const pageOfNode = (n: number): number => nodeChapter(n) + 1
const slotOf = (n: number): Slot => {
  const [ox, oy] = pageOrigin(nodeChapter(n))
  const s = (portrait ? SLOTS_P : SLOTS)[n % NODES_PER_CHAPTER]!
  return { x: ox + s.x, y: oy + s.y, w: s.w, h: s.h }
}
/** The binding's own strip down the left of the screen, CSS px: the book is
 *  laid out to the right of it, so the spine always has somewhere to be. */
let gut = 18
/** Map units → CSS px. */
const sx = (mx: number): number => (portrait ? mx * ms : (mx - cam) * ms) + padX
const sy = (my: number): number => (portrait ? (my - cam) * ms : my * ms) + padY
/** CSS px → map units. */
const mxOf = (x: number): number => (portrait ? (x - padX) / ms : (x - padX) / ms + cam)
const myOf = (y: number): number => (portrait ? (y - padY) / ms + cam : (y - padY) / ms)

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
const TRES = TW / SEC_W
/** A baked thumb. `paintLayer` is the static layer a tap creature's cover is
 *  cut from (`tapCover.ts`) — only a DONE thumb is that layer itself, and only
 *  when a painting went into it. */
interface Thumb { key: string; cv: HTMLCanvasElement; paintLayer: CoverLayer | null }
const thumbs = new Map<number, Thumb>()

/**
 * Bumped when a live PROP's painting lands. A sector that is not done yet
 * bakes its props AT REST into the dust, so that bake is only as painted as
 * the props that had decoded when it ran — and a prop arriving afterwards
 * would leave a vector silhouette in the dust for the rest of the session.
 * Scoped to the `prop` kind, so the other ~190 paintings decoding during boot
 * do not re-bake sixteen thumbnails each (`scoped-art-invalidation`).
 */
let propGen = 0
onArtChanged((c) => { if (!c || c.kind === 'prop') propGen++ })

const thumbOf = (n: number): Thumb => {
  const done = hasBit(S.campaign.sectorsDone, n)
  const pick = getPaintPick(S.campaign.paintPicks, n)
  // Whether its painting has decoded is part of the key: the thumb re-bakes
  // once when it lands (or when the art layer flips), and never again. A done
  // thumb is the colour layer alone and has no props baked into it, so it
  // ignores `propGen`.
  const key = `${done ? 1 : 0}:${pick}:${sectorPainted(n, true) ? 1 : 0}:${done ? 0 : propGen}`
  const hit = thumbs.get(n)
  if (hit && hit.key === key) return hit
  const sec = sectorOf(n)
  const colour = makeCanvas(TW, TH)
  const g = colour.getContext('2d')
  let painted = false
  if (g) {
    g.setTransform(TRES, 0, 0, TH / SEC_H, 0, 0)
    const pot = sec.pots[Math.max(0, pick - 1)]!
    painted = paintSectorArt(g, n, sec, pot, true)
    if (!painted) sec.paint(g, pot)
    g.setTransform(1, 0, 0, 1, 0, 0)
  }
  const src: CoverLayer | null = painted ? { cv: colour, res: TRES, key: `${n}:${key}` } : null
  let cv = colour
  if (!done) {
    cv = makeCanvas(TW, TH)
    bakeDust(cv, colour, TRES, n + 1, (dg) => {
      sec.props(dg, 0, 0)
      withCoverLayer(src, () => sec.tap?.draw(dg, 0, 0))
      sec.rescue?.draw(dg, 0, 0)
    })
  }
  const th: Thumb = { key, cv, paintLayer: done ? src : null }
  thumbs.set(n, th)
  return th
}

/* --------------------------------------------------------------- layout */

/** The strip of the view the map's own chrome covers (CSS px): the corner
 *  buttons along the bottom in portrait, the tab ribbon down the right in
 *  landscape. The camera may scroll the last page past it, and a focused
 *  node is centred in the view that is left — so no pulsing node is ever
 *  stuck under a button (a tap there would open the options or the book). */
const CHROME_BOTTOM = 96
const CHROME_RIGHT = 64
/** Portrait: the chapter ribbon runs across the TOP, and the page starts
 *  under it. A page that starts behind the tabs reads as a page that does not
 *  fit the book. */
const CHROME_TOP_P = 58
let chromeB = CHROME_BOTTOM
/** Where the page is pinned on screen, CSS px (the binding's side, and the
 *  head of the page). */
let padX = 0
let padY = 0

export const mapResize = (w: number, h: number): void => {
  vw = w
  vh = h
  portrait = h >= w
  const ins = readInsets()
  insetTop = ins.top
  chromeB = CHROME_BOTTOM + ins.bottom
  gut = clamp(w * 0.02, 14, 34)
  if (portrait) {
    // ONE PAGE, WHOLE. Held upright, the page is fitted to the screen on BOTH
    // axes — a page taller than the view let the next one bleed in under it,
    // which is a scroll, not a book (owner, 2026-09-20).
    const top = ins.top + CHROME_TOP_P
    const bottom = h - chromeB
    const availW = w - gut - ins.left - ins.right
    const availH = Math.max(120, bottom - top)
    ms = Math.min(availW / PAGE_WP, availH / PAGE_HP)
    padX = gut + ins.left + Math.max(0, (availW - PAGE_WP * ms) / 2)
    padY = top + Math.max(0, (availH - PAGE_HP * ms) / 2)
    visW = PAGE_WP
    camMax = Math.max(0, HUB_P + CHAPTER_COUNT * PAGE_HP - availH / ms)
  } else {
    ms = Math.min((w - CHROME_RIGHT - gut - ins.left - ins.right) / PAGE_W, h / PAGE_H)
    visW = (w - CHROME_RIGHT - gut - ins.right) / ms
    padX = gut + ins.left
    padY = (h - PAGE_H * ms) / 2
    camMax = Math.max(0, HUB + CHAPTER_COUNT * PAGE_W - visW)
  }
  cam = camOf(page)
  publish()
}

/** The page card's rectangle on screen, CSS px. Every page shows in the same
 *  place, so the spine, the corners and the bookmark never move. */
const PAGE_PAD = 26
const pageRect = (p: number): { x: number; y: number; w: number; h: number } => {
  const [ox, oy] = p <= 0 ? [0, 0] : pageOrigin(p - 1)
  const pw = portrait ? PAGE_WP : PAGE_W
  const ph = portrait ? PAGE_HP : PAGE_H
  return {
    x: sx(ox + PAGE_PAD),
    y: sy(oy + PAGE_PAD),
    w: (pw - PAGE_PAD * 2) * ms,
    h: (ph - PAGE_PAD * 2) * ms
  }
}

/** Begin turning to page `to`. `held` = a finger is driving it. */
const startTurn = (to: number, held = false): boolean => {
  if (turning() || to === page || to < 0 || to >= PAGE_COUNT) return false
  turnFrom = page
  turnDir = to > page ? 1 : -1
  page = to
  turnP = 0
  turnTo = 1
  turnHeld = held
  cam = camOf(page)
  if (!held) sfx('page')
  publish()
  return true
}

/** The turn is over: it fell over (`done`), or back where it came from. */
const settleTurn = (done: boolean): void => {
  if (!done) {
    page = turnFrom
    cam = camOf(page)
  }
  turnFrom = -1
  turnP = 0
  turnHeld = false
  dropSwing()
  if (done && wayLanding >= 0) landWayOn()
  wayLanding = -1
  publish()
}

/** A page turned by the player's own hand — a corner or a chapter tab. */
const turnByHand = (to: number): boolean => {
  if (!startTurn(to)) return false
  handTurned = true
  return true
}

/** Open the book at node `n`'s page (or the current node's). */
export const focusMap = (n = -1, animate = false): void => {
  const node = n >= 0 ? n : Math.max(0, Math.min(LAST_BUILT_NODE, S.campaign.furthestNode + 1))
  const p = pageOfNode(node)
  if (animate) {
    if (p !== page) startTurn(p)
    return
  }
  turnFrom = -1
  turnP = 0
  turnHeld = false
  page = p
  cam = camOf(page)
  publish()
}

/** Turn to chapter `c`'s page (the tab ribbon). */
export const showChapter = (c: number): void => {
  dropNextUp()
  turnByHand(clamp(c + 1, 0, PAGE_COUNT - 1))
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
/** The finger's speed along the turn, CSS px/s: a flick turns the page. */
let dragV = 0

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
  // …and the album remembers it was met (retention item 3). The campaign owns
  // that bit and only writes when it changes, so a child tapping the same
  // creature all afternoon costs nothing.
  meetCreature(n)
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
/** The chrome's wardrobe button (`MapScene`): exactly a tap on the tent, so
 *  the dressing room opens one way whichever of the two the player used. */
export const openTent = (): void => { if (tentShown()) onTap({ kind: 'tent' }) }

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
  // The hidden QA ad chord (`useQaAdTrigger`): twenty presses in a row on the
  // ribbon; any other press on the book starts the count over. Silent.
  if (onBookmark(x, y)) registerBookmarkTap()
  else breakBookmarkChain()
  // The first touch ends the "next up" peek: the player is steering now, and
  // a page that turns itself under a finger is the camera fight item 6 is
  // explicitly not allowed to start.
  dropNextUp()
  // …and the front page is not idle: its self-turn counts untouched time.
  wayT = 0
  pressed = true
  dragging = false
  downX = lastX = x
  downY = lastY = y
  downT = lastT = t
  dragV = 0
}

export const mapPointerMove = (x: number, y: number, t: number): void => {
  if (!pressed) return
  if (!dragging && Math.hypot(x - downX, y - downY) >= 12) dragging = true
  if (dragging) {
    // Sideways, in both orientations: a page turns about its spine, and the
    // spine is on the left however the book is held.
    const dx = x - downX
    if (!turning() && Math.abs(dx) > 10) startTurn(dx < 0 ? page + 1 : page - 1, true)
    if (turnHeld) {
      const span = Math.max(80, pageRect(page).w) * 0.7
      turnP = clamp((turnDir > 0 ? downX - x : x - downX) / span, 0, 1)
    }
    dragV = (x - lastX) / Math.max(1, t - lastT) * 1000
  }
  lastX = x
  lastY = y
  lastT = t
}

export const mapPointerUp = (x: number, y: number, t: number): void => {
  if (!pressed) return
  pressed = false
  // A press that never travelled 12 px is a tap, however slowly a small hand
  // lifts; one that did is a page turn, and never taps whatever it ends over
  // (§3.3.1). A folded corner answers before anything on the page does.
  void downT
  void t
  if (!dragging && Math.hypot(x - downX, y - downY) < 12) {
    if (!tapCorner(x, y)) {
      const hit = hitTest(x, y)
      if (hit) onTap(hit)
    }
  }
  if (turnHeld) {
    turnHeld = false
    // Let go past a third of the way — or flick it — and the page falls over.
    // A flick turns the page, but it still has to have travelled: a small
    // fast nudge is a child steadying the tablet, not a turn.
    const flick = turnP > 0.12 && (turnDir > 0 ? dragV < -520 : dragV > 520)
    turnTo = turnP > 0.32 || flick ? 1 : 0
    if (turnTo === 1) {
      sfx('page')
      handTurned = true
    }
  }
  dragV = 0
  dragging = false
}

/** The folded corners: bottom-outer turns forward, bottom-inner turns back. */
const earSize = (): number => Math.max(28, Math.min(74, pageRect(page).h * 0.085))
const tapCorner = (x: number, y: number): boolean => {
  if (turning()) return false
  const r = pageRect(page)
  const s = earSize() * 1.25
  if (y < r.y + r.h - s || y > r.y + r.h + s * 0.4) return false
  if (x > r.x + r.w - s && page < PAGE_COUNT - 1) return turnByHand(page + 1)
  if (x < r.x + s && page > 0) return turnByHand(page - 1)
  return false
}

/* ────────────────── "next up", after a restore (item 4 of the map's
 *                    reward loop; retention-roadmap item 6) ────────────── */
//
// The moment a sector turns to colour is the moment most likely to end a
// session, so the book shows where the story goes next: it settles on the
// sector just restored, holds a beat, then opens the page the NEXT node is
// on and gives that node's badge one wiggle — the same ±4° shake an unopened
// gift does, because a child already knows that shake means "this one".
//
// It is a peek, not a cutscene. Nothing here gates input: the whole beat is
// one page turn and one wiggle, and the first touch on the book cancels it
// (`mapPointerDown`) so a child who taps straight through is never fighting
// the camera. There is no peek at the finale — node 49 has nothing after it.
const NEXT_UP_HOLD = 0.8
/** How long the wiggle and the boss flash last, from the hold on. */
const NEXT_UP_LIFE = 2.4
/** The Guardian's shadow fades up and out over this, inside the hold. */
const NEXT_UP_FLASH = 1.1
/** A silhouette: one deep plum in all ten palette slots, so the rig comes out
 *  as a shape rather than a character standing on a card. */
const GUARDIAN_SHADOW = Array.from({ length: 10 }, () => '#2a1636') as unknown as FoePalette

let nextUpNode = -1
let nextUpAt = 0
/** The page has been opened; the wiggle runs from here. */
let nextUpTurned = false

/** Stop peeking: the player has taken the book over. */
const dropNextUp = (): void => { nextUpNode = -1 }

/**
 * Sector `from` was just restored — peek at whatever comes after it.
 *
 * Called by the restore flow once the camera is back on the map. Silent at
 * the last built node, which is the finale: there is nothing to point at, and
 * pointing at nothing reads as the game having lost its place.
 */
export const peekNextUp = (from: number): void => {
  const next = from + 1
  if (from < 0 || next > LAST_BUILT_NODE) {
    dropNextUp()
    return
  }
  nextUpNode = next
  nextUpAt = T
  nextUpTurned = false
}

/** 0..1 of the peek's wiggle for node `n`, or 0 when it is not the one. */
const nextUpK = (n: number): number => {
  if (nextUpNode !== n || !nextUpTurned) return 0
  const u = T - nextUpAt - NEXT_UP_HOLD
  return u >= 0 && u < NEXT_UP_LIFE ? 1 : 0
}

/** The Guardian's shadow on a boss card, 0 … 1 … 0 over `NEXT_UP_FLASH`. */
const nextUpShadow = (n: number): number => {
  if (!nextUpK(n) || !nodeIsBoss(n)) return 0
  const u = T - nextUpAt - NEXT_UP_HOLD
  return u < NEXT_UP_FLASH ? sin((u / NEXT_UP_FLASH) * PI) : 0
}

/** Test/QA seam: which node is being peeked at, or -1. */
export const peekingNextUp = (): number => nextUpNode

/* ──────────────── the front page's way on (owner, 2026-09-23) ─────────── */
//
// The front page is where the book lies open when nothing has opened it
// anywhere else — above all right after the very first duel, which a cold
// boot goes straight into. Its only way on was a folded corner, and a child
// who has never turned this book's pages does not see one: the owner found
// the cover "staying up forever". So, for a player who has not yet turned a
// page by hand this session:
//
//   • A RAINBOW SWIPE crosses the page: a fingertip presses beside the folded
//     corner — which lifts — and sweeps the page over from right to left,
//     trailing colour and sparkles. The gesture itself, shown; no words.
//   • ONCE A SESSION, a front page left untouched for `WAY_AUTO` seconds turns
//     itself to the page the player is up to (her gift's, or her next node's)
//     and sparkles there, so nobody can be left on the cover.
//
// Any page turned by hand — a drag, a corner, a chapter tab — ends both for
// the session: she knows the way, and a front page she opens on purpose (the
// wardrobe lives there) is hers to stay on. The self-turn is a single page
// turn a child can interrupt with one touch, never a camera she has to fight.
const WAY_AUTO = 8
/** The swipe fades in this long after the page comes up (or is let go of). */
const WAY_IN = 1.1
/** One swipe and the rest after it, seconds. */
const WAY_CYCLE = 2.8
/** Inside a cycle: the press, the sweep, the lift. */
const WAY_PRESS = 0.35
const WAY_SWEEP = 1.2
const WAY_LIFT = 0.4
/** Seconds the front page has been up and untouched. */
let wayT = 0
/** The front page was up last frame (so a return to it starts afresh). */
let wayWas = false
/** The player has turned a page herself this session. */
let handTurned = false
/** The book has turned itself once this session. */
let wayAutoUsed = false
/** The node a self-turn is carrying her to, until the page lands. */
let wayLanding = -1
/** When the next sparkle leaves the swipe's fingertip. */
let wayFx = 0

type Rect = { x: number; y: number; w: number; h: number }

/** Is the front page showing its way on right now? */
const wayOn = (): boolean => page === 0 && !turning() && !handTurned && S.flow.scene === 'map'

/** The node the book should open at: the gift waiting, or the next node. */
const wayOnNode = (): number => pendingSectorNode(S.campaign) ?? clamp(S.campaign.furthestNode + 1, 0, LAST_BUILT_NODE)

/** The swipe's clock: the moment inside its cycle, or -1 while it has not
 *  faded in yet. Held still under reduced motion (§3.11) — a swipe drawn
 *  once, mid-stroke, still says which way the page goes. */
const wayU = (): number => {
  if (wayT < WAY_IN) return -1
  return reducedMotion.value ? WAY_PRESS + WAY_SWEEP * 0.7 : (wayT - WAY_IN) % WAY_CYCLE
}

/** The swipe's path at 0..1 over the front page's rect `r`: in from the
 *  fore-edge side, bowing up, and across toward the spine — the way a page
 *  is pulled over. Always in the open sky (in portrait the scene is only the
 *  page's bottom 40 %), so it never hides Aurora or the tent. */
const wayAt = (r: Rect, f: number): [number, number] => {
  const yb = r.y + r.h * (portrait ? 0.44 : 0.36)
  const x0 = r.x + r.w * (portrait ? 0.86 : 0.88)
  const y0 = yb
  const x1 = r.x + r.w * (portrait ? 0.14 : 0.2)
  const y1 = yb - r.w * 0.035
  const cx = lerp(x0, x1, 0.45)
  const cy = yb - r.w * 0.13
  const a = (1 - f) * (1 - f)
  const m = 2 * f * (1 - f)
  const c = f * f
  return [a * x0 + m * cx + c * x1, a * y0 + m * cy + c * y1]
}

/** Head and tail of the swipe (0..1 along the path) at cycle time `u`. */
const wayEnds = (u: number): [number, number] => {
  const head = ease(clamp((u - WAY_PRESS) / WAY_SWEEP, 0, 1))
  const tail = ease(clamp((u - WAY_PRESS - 0.2) / (WAY_SWEEP + WAY_LIFT - 0.2), 0, 1))
  return [head, reducedMotion.value ? 0.08 : tail]
}

const stepWayOn = (dt: number): void => {
  const on = wayOn()
  if (on && !wayWas) wayT = 0
  wayWas = on
  if (!on) return
  if (!pressed) wayT += dt
  if (!wayAutoUsed && wayT >= WAY_AUTO) {
    wayAutoUsed = true
    const n = wayOnNode()
    if (startTurn(pageOfNode(n))) wayLanding = n
    return
  }
  // Sparkles shed off the fingertip while it sweeps.
  const u = wayU()
  if (u < WAY_PRESS || u > WAY_PRESS + WAY_SWEEP || reducedMotion.value) return
  wayFx -= dt
  if (wayFx > 0) return
  wayFx = 0.035
  const [head] = wayEnds(u)
  const [x, y] = wayAt(pageRect(0), head)
  trail(x, y, head)
  if (Math.random() < 0.35) glint(x, y, 5 + Math.random() * 5, 0, (Math.random() - 0.5) * 40, -30 - Math.random() * 40)
}

/** The self-turn landed: sparkle on what she is up to (her gift, or the
 *  next node's badge), so the page she was carried to says why. */
const landWayOn = (): void => {
  const n = wayLanding
  if (n < 0) return
  if (pendingSectorNode(S.campaign) === n) {
    const [gx, gy, gs] = giftScreen(n)
    sparkleBurst(gx, gy - gs * 0.4, 0.9)
  } else {
    const [mx, my] = markerScreen(n)
    sparkleBurst(mx, my, 0.8)
  }
}

/** How far the swipe lifts the folded corner, 0..1: it rises as the
 *  fingertip presses and settles as the sweep carries on. */
const wayLift = (): number => {
  if (!wayOn()) return 0
  const u = wayU()
  if (u < 0) return 0
  if (reducedMotion.value) return 0.6
  return u < WAY_PRESS ? ease(u / WAY_PRESS) : 1 - ease(clamp((u - WAY_PRESS) / 0.8, 0, 1))
}

/** The swipe's ribbon, top stripe to bottom — the page's own rainbow, turned
 *  up bright enough to be seen across the room. */
const WAY_STRIPES = ['#ff6f9f', '#ffa24a', '#ffd84a', '#6fdc7a', '#5cb8ff', '#a883ff'] as const
const WAY_INK = '#3A2340'
/** The ribbon's spine, sampled once per frame (tail → head), and its normals. */
const WAY_N = 28
const wayPts = new Float32Array((WAY_N + 1) * 4)

/**
 * A white cartoon glove with its index finger out — the universal "put your
 * finger here" — its fingertip at (0, 0), pointing up, `u` a finger's width.
 * Drawn as one silhouette: every part stroked fat in ink first, then every
 * part filled over it, so the outline runs round the whole hand and never
 * between its parts.
 */
const drawGlove = (g: G2D, u: number): void => {
  const parts = (): void => {
    // The index finger, rounded at its tip.
    g.beginPath()
    g.roundRect(-0.46 * u, 0, 0.92 * u, 2.5 * u, 0.46 * u)
    g.moveTo(0, 0)
    // The three curled fingers, as knuckles along the palm's top.
    g.moveTo(1.2 * u, 2.05 * u)
    g.arc(0.8 * u, 2.05 * u, 0.4 * u, 0, TAU)
    g.moveTo(1.8 * u, 2.2 * u)
    g.arc(1.42 * u, 2.2 * u, 0.38 * u, 0, TAU)
    g.moveTo(2.3 * u, 2.45 * u)
    g.arc(1.96 * u, 2.45 * u, 0.34 * u, 0, TAU)
    // The palm.
    g.moveTo(2.25 * u, 3.1 * u)
    g.ellipse(0.9 * u, 3.1 * u, 1.35 * u, 1.05 * u, 0, 0, TAU)
    // The thumb, reaching up the index finger's side.
    g.moveTo(-0.2 * u, 2.2 * u)
    g.ellipse(-0.55 * u, 2.65 * u, 0.36 * u, 0.62 * u, -0.6, 0, TAU)
  }
  const cuff = (): void => {
    g.beginPath()
    g.roundRect(0.05 * u, 3.75 * u, 1.75 * u, 0.75 * u, 0.3 * u)
  }
  const ink = Math.max(2, u * 0.2)
  g.lineJoin = 'round'
  g.lineWidth = ink * 2
  g.strokeStyle = WAY_INK
  parts()
  g.stroke()
  cuff()
  g.stroke()
  g.fillStyle = '#ffffff'
  parts()
  g.fill()
  g.fillStyle = '#d9c8ff'
  cuff()
  g.fill()
  // The creases between the curled fingers, and the nail's shine.
  g.lineWidth = ink * 0.7
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(1.12 * u, 2.2 * u)
  g.lineTo(1.1 * u, 2.6 * u)
  g.moveTo(1.72 * u, 2.4 * u)
  g.lineTo(1.68 * u, 2.75 * u)
  g.stroke()
  g.beginPath()
  g.ellipse(-0.08 * u, 0.42 * u, 0.13 * u, 0.2 * u, 0, 0, TAU)
  g.fillStyle = 'rgba(58,35,64,0.12)'
  g.fill()
}

/** The rainbow swipe over the front page's rect `r`. */
const drawWayOn = (g: G2D, r: Rect): void => {
  if (!wayOn()) return
  const u = wayU()
  if (u < 0) return
  const fade = clamp((wayT - WAY_IN) / 0.45, 0, 1)
  const [head, tail] = wayEnds(u)
  // The hand: down with the press, up and away with the lift.
  const lift = clamp((u - WAY_PRESS - WAY_SWEEP) / WAY_LIFT, 0, 1)
  const hand = reducedMotion.value ? 1 : ease(clamp(u / (WAY_PRESS * 0.7), 0, 1)) * (1 - lift)
  if (fade <= 0 || (hand <= 0 && head - tail < 0.01)) return
  // Sized off the page's short side — but never below half its long one, or
  // a phone held upright (a page ~390 px wide) gets a hand smaller than the
  // finger it is asking for.
  const side = Math.max(Math.min(r.w, r.h), Math.max(r.w, r.h) * 0.45)
  const W = clamp(side * 0.075, 16, 52)
  g.save()
  g.globalAlpha = fade
  g.lineCap = 'round'
  g.lineJoin = 'round'
  // THE RIBBON: six stripes laid side by side along the swipe, as a rainbow
  // is — widest at the hand and drawn to a point at the tail, so it reads as
  // a comet the hand is pulling across the page. A soft white halo lifts it
  // off a pale sky; a thin ink edge ties it to the book's drawn line.
  const span = head - tail
  if (span > 0.004) {
    for (let i = 0; i <= WAY_N; i++) {
      const [x, y] = wayAt(r, tail + (span * i) / WAY_N)
      wayPts[i * 4] = x
      wayPts[i * 4 + 1] = y
    }
    for (let i = 0; i <= WAY_N; i++) {
      const a = Math.max(0, i - 1)
      const b = Math.min(WAY_N, i + 1)
      const dx = wayPts[b * 4]! - wayPts[a * 4]!
      const dy = wayPts[b * 4 + 1]! - wayPts[a * 4 + 1]!
      const d = Math.hypot(dx, dy) || 1
      // The half-width rides along the normal: a point at the tail, full at
      // the head (a square root, so the comet fattens quickly and then holds).
      const hw = (W / 2) * Math.sqrt(i / WAY_N)
      // The normal that points UP while the swipe runs right to left, so
      // the first stripe is the outer one, as it is in a rainbow.
      wayPts[i * 4 + 2] = (dy / d) * hw
      wayPts[i * 4 + 3] = (-dx / d) * hw
    }
    const band = (f0: number, f1: number): void => {
      g.beginPath()
      for (let i = 0; i <= WAY_N; i++) {
        const o = i * 4
        const x = wayPts[o]! + wayPts[o + 2]! * f0
        const y = wayPts[o + 1]! + wayPts[o + 3]! * f0
        if (i) g.lineTo(x, y)
        else g.moveTo(x, y)
      }
      for (let i = WAY_N; i >= 0; i--) {
        const o = i * 4
        g.lineTo(wayPts[o]! + wayPts[o + 2]! * f1, wayPts[o + 1]! + wayPts[o + 3]! * f1)
      }
      g.closePath()
    }
    // The halo, then the ink edge, then the stripes over both.
    band(-1.7, 1.7)
    g.fillStyle = 'rgba(255,255,255,0.45)'
    g.fill()
    band(-1, 1)
    g.lineWidth = Math.max(1.5, W * 0.06)
    g.strokeStyle = 'rgba(58,35,64,0.55)'
    g.stroke()
    const n = WAY_STRIPES.length
    for (let j = 0; j < n; j++) {
      // A hair of overlap, so no paper shows between two stripes.
      band(-1 + (2 * j) / n - 0.01, -1 + (2 * (j + 1)) / n + 0.01)
      g.fillStyle = WAY_STRIPES[j]!
      g.fill()
    }
    // A sheen along the top stripes: the ribbon is satin, not paint.
    band(-0.62, -0.42)
    g.fillStyle = 'rgba(255,255,255,0.4)'
    g.fill()
  }
  if (hand > 0) {
    const [hx, hy] = wayAt(r, head)
    // The press: two rings rippling out from the fingertip as it lands.
    if (!reducedMotion.value && u < WAY_PRESS + 0.45) {
      for (let k2 = 0; k2 < 2; k2++) {
        const k = clamp((u - k2 * 0.12) / (WAY_PRESS + 0.33), 0, 1)
        if (k <= 0 || k >= 1) continue
        g.beginPath()
        g.arc(hx, hy, W * (0.35 + k * 1.3), 0, TAU)
        g.lineWidth = Math.max(2, W * 0.12 * (1 - k))
        g.strokeStyle = WAY_STRIPES[(k2 * 3) % WAY_STRIPES.length]!
        g.globalAlpha = fade * (1 - k)
        g.stroke()
      }
    }
    // The glove, tipped toward the way it is going. It sits a touch smaller
    // while pressed and rises off the page with the lift.
    const press = u >= WAY_PRESS * 0.7 && u < WAY_PRESS + WAY_SWEEP ? 0.93 : 1
    const s = side * 0.031 * lerp(0.7, 1, hand) * press
    g.globalAlpha = fade * clamp(hand * 1.3, 0, 1)
    g.save()
    g.translate(hx + lift * s * 0.8, hy - lift * s * 1.4)
    g.rotate(-0.35 - lift * 0.15)
    // Its shadow on the paper, falling down-right, lifting away with it.
    g.save()
    g.translate(s * (0.5 + lift * 0.8), s * (0.55 + lift * 1.1))
    g.fillStyle = 'rgba(58,35,64,0.11)'
    g.beginPath()
    g.ellipse(0.9 * s, 2.6 * s, 1.6 * s, 1.8 * s, 0, 0, TAU)
    g.fill()
    g.restore()
    drawGlove(g, s)
    g.restore()
  }
  g.restore()
}

/** Test seam: a new session, as far as the front page's way on is concerned. */
export const __resetWayOn = (): void => {
  wayT = 0
  wayWas = false
  handTurned = false
  wayAutoUsed = false
  wayLanding = -1
}

/* --------------------------------------------------------------- update */

export const updateMap = (dt: number): void => {
  T += dt
  stepWayOn(dt)
  stepTwin(dt, twinGift.node >= 0 ? twinScreen(twinGift.node) : null)
  // The peek's one page turn, a beat after the restored sector settled.
  if (nextUpNode >= 0) {
    const u = T - nextUpAt
    if (!nextUpTurned && u >= NEXT_UP_HOLD) {
      nextUpTurned = true
      const p = pageOfNode(nextUpNode)
      // Already on the right page (the usual case: the next node is the next
      // card along) — then the wiggle alone is the whole peek.
      if (p !== page && !turning()) startTurn(p)
      const [mx, my] = markerScreen(nextUpNode)
      sparkleBurst(mx, my, 0.8)
    }
    if (u >= NEXT_UP_HOLD + NEXT_UP_LIFE) dropNextUp()
  }
  // A bloom just landed: celebrate it where it is.
  if (twinGift.bloomed >= 0) {
    const s = slotOf(twinGift.bloomed)
    sparkleBurst(sx(s.x), sy(s.y), 1.2)
    twinGift.bloomed = -1
  }
  // The daily gift's sticker landed on a sector (item 5): the same beat, on
  // its own channel, because it is not a bloom and the map must not say so.
  if (dailyGift.celebrate >= 0) {
    const s = slotOf(dailyGift.celebrate)
    sparkleBurst(sx(s.x), sy(s.y), 1.2)
    dailyGift.celebrate = -1
  }
  if (turning() && !turnHeld) {
    const step = dt / 0.42
    turnP += turnTo > turnP ? step : -step
    if (turnP >= 1) settleTurn(true)
    else if (turnP <= 0) settleTurn(false)
  }
  publish()
}

/* ----------------------------------------------------------------- draw */


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

/** The daily gift stands at the LOWER-LEFT corner, the Twin Gift's mirror
 *  (item 5): the two are different offers and must never be one shape in two
 *  places, nor ever overlap on a card that carries both. */
const dailyScreen = (n: number): [number, number, number] => {
  const s = slotOf(n)
  return [sx(s.x - s.w * 0.5 + s.w * 0.07), sy(s.y + s.h * 0.5 + s.h * 0.06), Math.max(48, s.h * ms * 0.3)]
}

/** The wardrobe tent stands on the hub knoll once there is something to wear. */
const tentShown = (): boolean => S.campaign.giftsOwned !== 0
const tentScreen = (): [number, number, number] => {
  const mx = portrait ? PAGE_WP * 0.72 : HUB * 0.52
  // The tent stands on the knoll, so it is seated on the front page's SCENE
  // rather than on the page — one fraction for both orientations, instead of
  // two constants that had to be re-tuned by eye every time the page moved.
  // 0.672 was measured off the landscape painting's own grass line.
  const pw = portrait ? PAGE_WP : HUB
  const ph = portrait ? HUB_P : PAGE_H
  const [gy, sh] = frontScene(PAGE_PAD, pw - PAGE_PAD * 2, ph - PAGE_PAD * 2)
  return [sx(mx), sy(gy + sh * 0.672), Math.max(70, 150 * ms)]
}

/**
 * The cloth the book lies on, into the box (0, 0, w, h). Warm lilac into dawn
 * light, not a night void — ui-design-system.md §3.16. Pure, so the art bench
 * renders the painting's reference from the same painter.
 */
export const paintCloth = (g: G2D, w: number, h: number): void => {
  const grad = g.createLinearGradient(0, 0, 0, h)
  grad.addColorStop(0, '#7B5EA8')
  grad.addColorStop(1, '#CBA6D6')
  g.fillStyle = grad
  g.fillRect(0, 0, w, h)
}

/**
 * The cloth the book lies on, into a box `w` x `h` from the origin — wherever
 * the book is.
 *
 * Painted (§9.11): one square sheet serves every screen shape — but it is
 * never STRETCHED to one (`fit.ts`). It used to be drawn `w` x `h`, which on
 * a phone held upright pulled the weave out 2x vertically into streaks,
 * behind most of the duel's screen. Now its height fits the box (so the
 * whole dusk-to-dawn shading shows everywhere) and its width is cropped, or
 * on a wide screen continued by mirrored copies. A miss keeps the gradient,
 * which is what it was.
 *
 * EXPORTED because the book is not only on the map. The wipe, the intro and
 * the duel's letterbox each drew this same cloth for themselves — two of them
 * as a flat colour — so with the art layer on, a child tapping a gift went
 * from a woven cloth to a plain one and back. Four copies of one surface is
 * four chances to disagree; there is one now.
 */
export const drawCloth = (g: G2D, w: number, h: number): void => {
  const art = spriteFor('page', 'cover-cloth')
  if (art) {
    drawSheetTiled(g, art, art.naturalWidth || 1, art.naturalHeight || 1, w, h)
    return
  }
  paintCloth(g, w, h)
}

const drawBackdrop = (g: G2D): void => drawCloth(g, vw, vh)

/** Each built chapter's page wash — its biome, in two soft bands. */
/** The front page's blossoms: seeded, so they never shimmer. */
const seededFront = (): (() => number) => seeded(77)

/**
 * The front page's little scene — sky, rainbow, knoll, trail — sits along the
 * BOTTOM of the page and is shaped by its WIDTH.
 *
 * Every vertical in it used to be a fraction of the page's own height, which
 * is right in landscape and nonsense in portrait, where the page is twice as
 * tall as it is wide: the rainbow came out with a radius wider than the page
 * it had to arc over, and the meadow's gentle 5 %-of-height wobble became two
 * spiky mountain peaks. Nobody had looked at it, but the PAINTER had — it
 * repainted those peaks faithfully, in ink, and that is what shipped.
 *
 * Returns the scene's top edge and its height. In landscape the page is
 * already wider than 1 / 0.75 of its height, so this is the page itself and
 * nothing moves; in portrait it is the bottom 40 %, under a tall open sky.
 */
const frontScene = (y: number, w: number, h: number): [number, number] => {
  const sh = Math.min(h, w * 0.75)
  return [y + h - sh, sh]
}

/** How Aurora waits on the front page: pleased to see you. */
const FRONT_FACE: Face = { brow: 0.25, eye: 1, mouth: 1, blush: 0.35 }

/** The biome colours washed along a built page's foot. Exported for the art
 *  bench, which draws a page's reference from the same table the map does. */
export const PAGE_WASH: readonly (readonly [string, string])[] = [
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
/** A chapter that has not been built yet: no biome to show, so lilac. */
const ASLEEP_WASH: readonly [string, string] = ['#c8bedb', '#b7abcc']

/** The paper card every page is printed on. */
const drawCard = (g: G2D, x: number, y: number, w: number, h: number, built: boolean): number[] => {
  // SQUARE ON THE BOUND EDGE. A leaf in a book is guillotined straight where
  // it meets the spine and only its free corners are rounded — a page rounded
  // on all four reads as a loose card lying on the binding rather than part
  // of the book. The binding is the left edge in both orientations
  // (`drawSpine` runs its stitches down `r.x`), so: [tl, tr, br, bl].
  const c = 28 * ms
  const r = [0, c, c, 0]
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
  return r
}

/**
 * THE BOOK AS AN OBJECT, under the page: its cover boards, the block of
 * leaves they hold, and the shadow it casts on the cloth.
 *
 * Without it the map is a sheet of paper lying on a purple cloth with a strip
 * of binding beside it — every part drawn correctly, and nothing that says
 * BOOK. What a real one gives you, and this now draws, is three things: the
 * cover is cut LARGER than the paper (a binder's "squares"), the leaves under
 * the open page show as a pale striated block in that margin, and the whole
 * thing sits ON something, with weight.
 *
 * Square on the left in both orientations, because that is where the binding
 * is — the same rule `drawCard` follows for the paper itself.
 */
const drawBoard = (g: G2D): void => {
  const r = pageRect(page)
  const over = Math.max(9, 19 * ms)
  const c = 30 * ms
  const round = [0, c, c, 0]
  // The shadow it throws on the cloth, offset down and out: the light in this
  // book comes from the upper left, the same as every page's own shading.
  g.save()
  g.filter = `blur(${Math.max(3, 9 * ms).toFixed(1)}px)`
  g.fillStyle = 'rgba(24,10,34,0.42)'
  g.beginPath()
  g.roundRect(r.x - over, r.y - over + 7 * ms, r.w + over * 2, r.h + over * 2, round)
  g.fill()
  g.restore()
  // The cover board: cloth over card, lit along the top-left fold.
  const board = g.createLinearGradient(r.x, r.y - over, r.x + r.w, r.y + r.h + over)
  board.addColorStop(0, '#5d4382')
  board.addColorStop(0.5, '#43305f')
  board.addColorStop(1, '#2d1f42')
  g.fillStyle = board
  g.beginPath()
  g.roundRect(r.x - over, r.y - over, r.w + over * 2, r.h + over * 2, round)
  g.fill()
  // THE LEAVES: the block of paper this open page is the top of, showing in
  // the cover's margin — cream, with the fine striation of a lot of sheets
  // seen edge-on. A ring, because the page itself covers the middle.
  const lip = over * 0.58
  g.save()
  g.beginPath()
  g.roundRect(r.x - lip, r.y - lip, r.w + lip * 2, r.h + lip * 2, round)
  g.clip()
  g.fillStyle = '#efe2cb'
  g.fillRect(r.x - lip, r.y - lip, r.w + lip * 2, r.h + lip * 2)
  g.strokeStyle = 'rgba(96,74,60,0.3)'
  g.lineWidth = Math.max(0.6, ms * 0.9)
  g.beginPath()
  for (let i = 1; i * 3.4 * ms < lip; i++) {
    const d = i * 3.4 * ms
    g.roundRect(r.x - lip + d, r.y - lip + d, r.w + (lip - d) * 2, r.h + (lip - d) * 2, round)
  }
  g.stroke()
  g.restore()
}


/**
 * The book's front page: the knoll the wardrobe tent stands on, with the
 * trail setting off toward chapter 1. It is where the book falls open before
 * the story starts, and where the wardrobe lives for the whole game.
 */
/**
 * Everything PRINTED on the front page — the sky, the rainbow, the meadow
 * bands, the knoll and the trail that sets off toward chapter 1 — drawn into
 * the box (x, y, w, h).
 *
 * Aurora and the wardrobe tent are NOT in here: they move, and are drawn over
 * this. Pure apart from the box and a scale, so the art bench renders the
 * painting's reference from the very same function the map draws with
 * (`artDraw.renderFrontPageSheet`), exactly as `pageDecorBake` serves a
 * chapter page.
 */
export const paintFrontPage = (
  g: G2D, x: number, y: number, w: number, h: number, scale: number, forRef = false
): void => {
  const [gy, sh] = frontScene(y, w, h)
  // A soft sky, a rainbow, and the meadow the knoll rises out of.
  const sky = g.createLinearGradient(0, y, 0, y + h)
  sky.addColorStop(0, '#eaf6ff')
  sky.addColorStop(1, '#fff4e6')
  g.fillStyle = sky
  g.fillRect(x, y, w, h)
  const rb = ['#ffd0e4', '#ffe6b8', '#d8f5c8', '#cfe9ff', '#e2d6ff']
  for (let i = 0; i < rb.length; i++) {
    g.beginPath()
    g.arc(x + w * 0.5, gy + sh * 0.92, sh * (0.52 - i * 0.035), PI, TAU)
    g.lineWidth = sh * 0.032
    g.strokeStyle = rb[i]!
    g.stroke()
  }
  const [g1, g2] = PAGE_WASH[0]!
  for (let i = 0; i < 2; i++) {
    g.beginPath()
    g.moveTo(x, gy + sh * (0.74 - i * 0.07))
    for (let k = 0; k <= 8; k++) g.lineTo(x + (w * k) / 8, gy + sh * (0.7 - i * 0.07 + 0.05 * sin(k * 1.9 + i)))
    g.lineTo(x + w, y + h)
    g.lineTo(x, y + h)
    g.closePath()
    g.fillStyle = (i ? g1 : g2)!
    g.fill()
  }
  // The knoll itself, under where the tent stands.
  //
  // NO OUTLINE WHEN THIS IS A REFERENCE. The painter traces what it is shown,
  // and the ink line that reads as a soft crest in the drawing came back as
  // two hard black arcs across the finished painting — the dome's two ends,
  // with the middle lost behind the hills. A ground line is a change of
  // colour, not a drawn edge, so the reference simply does not draw one.
  g.beginPath()
  g.ellipse(x + w * 0.5, gy + sh * 0.82, w * 0.3, sh * 0.16, 0, PI, TAU)
  g.fillStyle = g1!
  g.fill()
  if (!forRef) {
    g.lineWidth = 2.5
    g.strokeStyle = 'rgba(58,35,64,0.35)'
    g.stroke()
  }
  // The trail setting off toward chapter 1 — the page wants turning.
  //
  // DASHES ARE UI, NOT LANDSCAPE. Shown a dashed line the painter painted a
  // dashed line, on top of the winding road it had already painted, so the
  // page ended up with two paths. The reference shows ONE soft path and the
  // live page keeps its dashes, which are the "turn me" hint.
  g.beginPath()
  g.moveTo(x + w * 0.55, gy + sh * 0.8)
  g.quadraticCurveTo(x + w * 0.8, gy + sh * 0.76, x + w * 1.02, gy + sh * 0.84)
  g.lineWidth = Math.max(3, (forRef ? 13 : 7) * scale)
  g.strokeStyle = '#e8c07a'
  if (!forRef) g.setLineDash([Math.max(8, 16 * scale), Math.max(7, 14 * scale)])
  g.lineCap = 'round'
  g.stroke()
  g.setLineDash([])
  // A few blossoms and a sparkle or two, the way a title page is dressed.
  const fr = seededFront()
  for (let i = 0; i < 14; i++) {
    const fx = x + w * (0.08 + fr() * 0.84)
    const fy = gy + sh * (0.74 + fr() * 0.22)
    g.beginPath()
    g.arc(fx, fy, Math.max(2, sh * 0.008), 0, TAU)
    g.fillStyle = ['#ff9ecf', '#ffd36b', '#ffffff', '#c7a6ff'][i % 4]!
    g.fill()
  }
}

/**
 * The book's front page: the knoll the wardrobe tent stands on, with the
 * trail setting off toward chapter 1. It is where the book falls open before
 * the story starts, and where the wardrobe lives for the whole game.
 */
const drawFrontPage = (g: G2D): void => {
  const pw = portrait ? PAGE_WP : HUB
  const ph = portrait ? HUB_P : PAGE_H
  const x = sx(PAGE_PAD)
  const y = sy(PAGE_PAD)
  const w = (pw - PAGE_PAD * 2) * ms
  const h = (ph - PAGE_PAD * 2) * ms
  if (x > vw + 40 || x + w < -40 || y > vh + 40 || y + h < -40) return
  const r = drawCard(g, x, y, w, h, true)
  g.save()
  g.beginPath()
  g.roundRect(x, y, w, h, r)
  g.clip()
  // Painted (§9.11) when its picture has decoded; the drawing otherwise.
  const art = spriteFor('page', frontPageArtId(portrait))
  if (art) g.drawImage(art, x, y, w, h)
  else paintFrontPage(g, x, y, w, h, ms)
  // And Aurora herself, wearing whatever she is wearing, waiting on the knoll
  // by her wardrobe and looking off toward chapter 1.
  const [gy, sh] = frontScene(y, w, h)
  const ah = sh * 0.3
  g.save()
  g.translate(x + w * (tentShown() ? 0.36 : 0.5), gy + sh * 0.84 + sin(Td * 1.6) * ah * 0.012)
  g.scale(ah / 150, ah / 150)
  drawUnicorn(g, 0, 0, -1, { face: FRONT_FACE, ...equippedHooks() }, Td * 0.6 + 1.3)
  g.restore()
  g.restore()
}

/**
 * Where a page's marginalia may not go (§8.32): the five beat cards, each
 * grown to take in its frame and its shadow, and the badge that hangs off the
 * card's foot. Circles rather than rectangles — a motif only needs to keep
 * clear, not to tile around.
 */
const keepOut = (c: number, px: number, py: number): KeepOut[] => {
  const out: KeepOut[] = []
  for (let i = 0; i < NODES_PER_CHAPTER; i++) {
    const n = c * NODES_PER_CHAPTER + i
    const s = slotOf(n)
    out.push({ x: sx(s.x) - px, y: sy(s.y) - py, r: Math.hypot(s.w, s.h) * 0.5 * ms + 10 })
    const [mx, my] = markerScreen(n)
    out.push({ x: mx - px, y: my - py, r: markerR() + 10 })
  }
  return out
}

/** One chapter page: a paper card with a soft biome wash and the trail. */
const drawPage = (g: G2D, c: number): void => {
  const [ox, oy] = pageOrigin(c)
  const pw = portrait ? PAGE_WP : PAGE_W
  const ph = portrait ? PAGE_HP : PAGE_H
  const pad = PAGE_PAD
  const x = sx(ox + pad)
  const y = sy(oy + pad)
  const w = (pw - pad * 2) * ms
  const h = (ph - pad * 2) * ms
  if (x > vw + 40 || x + w < -40 || y > vh + 40 || y + h < -40) return
  const built = CHAPTERS[c]?.built ?? false
  const r = drawCard(g, x, y, w, h, built)
  g.save()
  g.beginPath()
  g.roundRect(x, y, w, h, r)
  g.clip()
  // Everything printed on this page behind its beats (§8.32), as ONE baked
  // image: the light on the sheet, the chapter's own world in thin ink, the
  // biome wash along the foot and the paper fibre over the lot. None of it
  // moves, and every separate fill here would be another full-page composite
  // through the page's rounded clip. Each beat card and badge on the page is
  // handed over as somewhere a motif may NOT go.
  const wash = built ? PAGE_WASH[c] ?? PAGE_WASH[0]! : ASLEEP_WASH
  // Painted (§9.11): a built chapter's page can be one painting — the paper,
  // its marginalia and its wash together. Only the BUILT page: a sleeping
  // chapter is a different picture (lilac, fainter ink, a dozing moon), not
  // this one tinted, so it keeps drawing itself. A miss draws as before.
  const painted = built ? spriteFor('page', pageArtId(c, portrait)) : null
  g.drawImage(
    painted ?? pageDecorBake(w, h, c, built, portrait, wash, keepOut(c, x, y), portrait ? w * 0.2 : h * 0.62),
    x, y, w, h
  )
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
  // The picture takes the CARD's corners. The card is a rounded rect of
  // radius `b * 2` drawn `b` outside the picture, so a concentric inner
  // radius is `b` — without this the painting's square corners poke into the
  // card's rounded ones and the mount reads as two separate things.
  g.beginPath()
  g.roundRect(x, y, w, h, b)
  g.clip()
  if (st === 'locked') g.globalAlpha = 0.45
  const th = thumbOf(n)
  g.drawImage(th.cv, x, y, w, h)
  // A boss is next (item 6): her Guardian's shadow rises on the card and is
  // gone in a second — who is waiting, without a word and without a screen.
  const shade = nextUpShadow(n)
  if (shade > 0) {
    g.save()
    // Absolute, not multiplied: the card under it is a LOCKED one and already
    // at 45 %, and a flash that inherits the fade is a smudge.
    g.globalAlpha = shade * 0.6
    const k = (h * 0.82) / RIG_HEIGHT
    g.translate(x + w * 0.5, y + h * 0.94)
    g.scale(k, k)
    // `onKey` because a card is not the arena: no contact shadow, no dread
    // aura — just the silhouette, inside the card's own clip.
    drawUnicorn(g, 0, 0, 1, { foe: guardianOf(nodeChapter(n)), skin: GUARDIAN_SHADOW, onKey: true }, T)
    g.restore()
  }
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
      withCoverLayer(th.paintLayer, () => {
        sec.tap?.draw(g, peekK(n), T)
        // The rescue is INSIDE the cover layer too: chapter 3's redraws the
        // nest's front over itself, and that nest is in the sector's paint().
        sec.rescue?.draw(g, 1, Td + n)
      })
    }
    if (bloomed) drawBloom(g, n, live ? Td + n * 0.9 : 0)
  }
  g.restore()
  // The replay star (item 4), pressed onto the card's top-right corner —
  // OUTSIDE the picture's clip, so it sits on the mount like a sticker and
  // never covers the sector. Only a node that has been played shows one.
  if (st === 'done') {
    const sr = Math.max(7, h * 0.12)
    g.save()
    g.translate(x + w - b * 0.4, y - b * 0.2)
    paintStarSticker(g, sr, hasStar(n))
    g.restore()
  }
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
  // The badge itself — painted when its strip has decoded, drawn otherwise.
  // `drawBadge` seats the painted disc exactly where `paintBadge`'s is (the
  // painter drifted each one across its panel), so the ring above is round it.
  const f = badgeFrame(st, nodeIsBoss(n))
  g.save()
  g.translate(x, y)
  // The "next up" peek (item 6): the badge takes the unopened gift's own
  // shake, so the invitation is a shape the player has already learned. A
  // one-shot reward beat, so it runs on `T` and not on the ambient `Td` —
  // reduced motion silences the loops, not the moments (§3.11).
  if (nextUpK(n)) g.rotate(giftShake(T - nextUpAt - NEXT_UP_HOLD))
  drawBadge(g, r, f)
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

/** Everything ON the pages, at whatever the camera is pointed at. */
const drawWorld = (g: G2D): void => {
  drawFrontPage(g)
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
  if (dailyGift.node >= 0) {
    const [x, y, s] = dailyScreen(dailyGift.node)
    if (x > -s && x < vw + s && y > -s && y < vh + s * 1.5) drawDaily(g, x, y, s, Td)
  }
}

/** Page `p`, swung `prog` of the way over: its own contents, squeezed about
 *  the spine, and the paper over them. */
/**
 * The page being turned, rendered once per frame so it can be WARPED.
 *
 * A real turn needs the leaf as a bitmap: the projection cuts it into strips
 * and gives each one its own height, and there is no canvas transform that
 * does that to a live draw. So the page goes to an offscreen surface the size
 * of the page rect, and `drawTurned` blits the strips out of it. It is only
 * alive for the few hundred milliseconds a turn lasts — `settleTurn` drops it.
 */
let swingCv: HTMLCanvasElement | null = null
const swingSurface = (r: { x: number; y: number; w: number; h: number }): G2D | null => {
  const d = S.dpr
  const w = Math.max(1, Math.round(r.w * d))
  const h = Math.max(1, Math.round(r.h * d))
  if (!swingCv || swingCv.width !== w || swingCv.height !== h) swingCv = makeCanvas(w, h)
  const c = swingCv.getContext('2d')
  if (!c) return null
  c.setTransform(1, 0, 0, 1, 0, 0)
  c.clearRect(0, 0, w, h)
  // The world draws in screen CSS px; slide it so the page rect lands on the
  // surface's own origin.
  c.setTransform(d, 0, 0, d, -r.x * d, -r.y * d)
  return c
}

/** Let the surface go — a full page of device pixels is not small. */
const dropSwing = (): void => { swingCv = null }

const drawSwing = (g: G2D, p: number, prog: number): void => {
  const keep = cam
  cam = camOf(p)
  const r = pageRect(p)
  const w = turnWidth(prog)
  const c = w > 0.004 ? swingSurface(r) : null
  if (c) {
    c.save()
    c.beginPath()
    c.rect(r.x, r.y, r.w, r.h)
    c.clip()
    drawWorld(c)
    c.restore()
    const a = turnAngle(prog)
    const e = drawTurned(g, swingCv!, swingCv!.width, swingCv!.height, r.x, r.y, r.w, r.h, a)
    shadeTurnEdge(g, e.x, e.y, e.h, r.h, a)
  }
  cam = keep
}

/** The binding, the reader's ribbon, the folded corners and the page dots. */
/**
 * The colour a page's folded corner shows, sampled from that page's own
 * PAINTING — the fold is the leaf's reverse, so a constant cream read as a
 * white sticker taped onto a painted meadow.
 *
 * Sampled once per page from the bottom outer corner (where the fold
 * actually is) into a 1x1 canvas, then cached: the average of a whole page
 * is a muddy grey-green, while the corner is the paper the fold would show.
 * Falls back to the drawn paper whenever there is no painting yet.
 */
const PAPER_FALLBACK = '#fff4e6'
/** The painting page `p` is printed from, if it has decoded. */
const pageArt = (p: number): HTMLImageElement | null =>
  p === 0
    ? spriteFor('page', frontPageArtId(portrait))
    : spriteFor('page', pageArtId(p - 1, portrait))
const tones = new Map<number, string>()
const pageTone = (p: number): string => {
  const hit = tones.get(p)
  if (hit) return hit
  const img = pageArt(p)
  if (!img) return PAPER_FALLBACK
  let tone = PAPER_FALLBACK
  try {
    const cv = makeCanvas(1, 1)
    const cg = cv.getContext('2d', { willReadFrequently: true })
    if (cg) {
      const sw = Math.max(1, Math.round(img.naturalWidth * 0.18))
      const sh = Math.max(1, Math.round(img.naturalHeight * 0.18))
      cg.drawImage(img, img.naturalWidth - sw, img.naturalHeight - sh, sw, sh, 0, 0, 1, 1)
      const [r, gr, b] = cg.getImageData(0, 0, 1, 1).data
      // Lifted toward the light: a fold catches more of it than the flat page.
      const up = (v: number): number => Math.round(Math.min(255, v * 0.55 + 255 * 0.45))
      tone = `rgb(${up(r!)}, ${up(gr!)}, ${up(b!)})`
    }
  } catch { /* a tainted or undecoded image: keep the paper */ }
  tones.set(p, tone)
  return tone
}

/**
 * Where the ribbon hangs (its centre, CSS px): just LEFT of the rank badge
 * printed in the page's top-right corner, so the badge reads as sitting right
 * of the bookmark (owner, 2026-09-23). The badge's width comes back from the
 * DOM (`mapHud.rankW`) — only it knows how long the placing is in the player's
 * language — and the ribbon moves to make room rather than the badge wrapping
 * or sliding under it. With no badge on the page it keeps its old place near
 * the fore-edge. Held upright, it never hangs further in than 56 % of the
 * page: the first beat card's frame ends at ~49 %, and the ribbon is long
 * enough to reach it there (in landscape the top row starts below its tail).
 */
const bookmarkX = (r: { x: number; y: number; w: number; h: number }, bw: number): number => {
  const home = r.x + r.w * 0.86
  const badge = mapHud.rankW
  if (badge <= 0) return home
  const gap = Math.max(6, bw * 0.4)
  const beside = r.x + r.w - rankInset(r.h) - badge - gap - bw / 2
  return clamp(beside, r.x + r.w * (portrait ? 0.56 : 0.2), home)
}

/**
 * Where `drawBook` hangs the ribbon (its centre x, its hang point, its width),
 * or null while it is not drawn — off the page the player is up to, or mid-turn.
 * `onBookmark` is a press on it, never narrower than a 44 px target, which the
 * ribbon itself is on a phone. For the hidden QA ad chord only: the ribbon
 * does nothing when tapped.
 */
const bookmarkBox = (): { x: number; top: number; bw: number } | null => {
  if (page !== currentChapter() + 1 || turning()) return null
  const r = pageRect(page)
  const bw = Math.max(14, r.h * 0.05)
  return { x: bookmarkX(r, bw), top: r.y - r.h * 0.035, bw }
}
const onBookmark = (x: number, y: number): boolean => {
  const b = bookmarkBox()
  if (!b) return false
  // `bookmarkShape` spans −0.6 w above its hang point to its tails, 3.2 w below.
  return Math.abs(x - b.x) <= Math.max(22, b.bw * 0.75)
    && y >= b.top - b.bw * 0.6 - 8 && y <= b.top + b.bw * 3.2 + 8
}

const drawBook = (g: G2D): void => {
  const r = pageRect(page)
  // The binding sits in the gutter beside the page — a band, not a slab: on
  // a wide screen the page is centred and the gutter is most of the margin.
  drawSpine(g, r.x, r.y, r.h, clamp(r.x, 9, Math.max(12, 20 * ms)))
  // The ribbon marks the chapter the player is actually up to.
  const mark = currentChapter() + 1
  if (page === mark && !turning()) {
    const wash = PAGE_WASH[currentChapter()] ?? PAGE_WASH[0]!
    const bw = Math.max(14, r.h * 0.05)
    drawBookmark(g, bookmarkX(r, bw), r.y - r.h * 0.035, r.h * 0.16, bw, wash[1]!, Td)
  }
  if (!turning()) {
    const s = earSize()
    const hint = reducedMotion.value ? 0.35 : 0.35 + 0.35 * (0.5 + 0.5 * sin(Td * 2))
    const tone = pageTone(page)
    const art = pageArt(page)
    // On the front page the swipe lifts the corner it is showing off.
    const lift = wayLift()
    if (page < PAGE_COUNT - 1) drawDogEar(g, r.x, r.y, r.w, r.h, 1, s * (1 + lift * 0.2), hint + lift * 0.8, tone, art)
    if (page > 0) drawDogEar(g, r.x, r.y, r.w, r.h, -1, s, hint, tone, art)
    drawWayOn(g, r)
  }
  // Where in the book this page is: one dot per page along the foot.
  const dr = Math.max(2.5, r.h * 0.008)
  const gap = dr * 3.4
  const x0 = r.x + r.w / 2 - (gap * (PAGE_COUNT - 1)) / 2
  const y0 = r.y + r.h - dr * 2.1
  for (let i = 0; i < PAGE_COUNT; i++) {
    g.beginPath()
    g.arc(x0 + i * gap, y0, i === page ? dr * 1.7 : dr, 0, TAU)
    g.fillStyle = i === page ? '#3A2340' : 'rgba(58,35,64,0.32)'
    g.fill()
  }
}

export const drawMap = (g: G2D): void => {
  Td = reducedMotion.value ? 0 : T
  const d = S.dpr
  g.setTransform(d, 0, 0, d, 0, 0)
  g.globalAlpha = 1
  g.globalCompositeOperation = 'source-over'
  drawBackdrop(g)
  drawBoard(g)
  // A bound book shows one page: clip to it, so the pages either side of it
  // never bleed into the gutter or past the fore-edge.
  const open = pageRect(page)
  g.save()
  g.beginPath()
  // Its own card, its drop shadow and nothing else: the pages either side of
  // it never show past the gutter or under the fore-edge.
  g.rect(open.x - 1, open.y - 1, open.w + 14, open.h + 16)
  g.clip()
  if (turning()) {
    // Forward, the page being left swings away over the one arriving; back,
    // the page arriving falls onto the one being left.
    const under = turnDir > 0 ? page : turnFrom
    const over = turnDir > 0 ? turnFrom : page
    const keep = cam
    cam = camOf(under)
    drawWorld(g)
    cam = keep
    drawSwing(g, over, turnDir > 0 ? turnP : 1 - turnP)
  } else drawWorld(g)
  g.restore()
  drawBook(g)
  drawFxUnder(g)
  drawFxOver(g)
}

/* --------------------------------------------------------------- chrome */

/** Publish what the DOM chrome needs (tabs, a11y targets). Cheap; on change. */
const publish = (): void => {
  const reached = currentChapter()
  const visible = clamp(page - 1, 0, CHAPTER_COUNT - 1)
  if (mapHud.reached !== reached) mapHud.reached = reached
  if (mapHud.visible !== visible) mapHud.visible = visible
  if (mapHud.front !== (page === 0)) mapHud.front = page === 0
  if (mapHud.portrait !== portrait) mapHud.portrait = portrait
  if (mapHud.versus !== S.campaign.versusUnlocked) mapHud.versus = S.campaign.versusUnlocked
  // The wardrobe button stands wherever the tent does (something to wear),
  // and steps aside with the page-pinned chrome while a leaf is in the air.
  if (mapHud.wardrobe !== tentShown()) mapHud.wardrobe = tentShown()
  if (mapHud.turning !== turning()) mapHud.turning = turning()
  // The paper itself, for chrome that is printed ON the page (the rank plate,
  // §8.33). `pageRect` puts every page in the same place, so this settles on
  // the first frame and then only moves on a resize.
  const pr = pageRect(Math.max(1, page))
  const mp = mapHud.page
  if (mp.x !== pr.x || mp.y !== pr.y || mp.w !== pr.w || mp.h !== pr.h) mapHud.page = pr
  // The Twin Gift's DOM hold target follows the gift from page to page. It
  // steps aside while a page is turning: it is a hole in the chrome laid over
  // a canvas that is, for those few hundred milliseconds, two pages at once.
  if (twinGift.node >= 0 && twinShown() && !turning()) {
    const [x, y, s] = twinScreen(twinGift.node)
    const size = Math.max(64, Math.round(s * 1.25))
    const bx = Math.round(x - size / 2)
    const by = Math.round(y - s * 0.4 - size / 2)
    const tw = mapHud.twin
    if (!tw || tw.x !== bx || tw.y !== by || tw.size !== size) mapHud.twin = { x: bx, y: by, size }
  } else if (mapHud.twin) mapHud.twin = null
  // The daily gift's own tap target (item 5), on the same terms: it is what
  // makes the gift reachable by keyboard and readable by a screen reader,
  // which a canvas tap never is, and it steps aside while a page turns.
  if (dailyGift.node >= 0 && !turning()) {
    const [x, y, s] = dailyScreen(dailyGift.node)
    const size = Math.max(64, Math.round(s * 1.25))
    const bx = Math.round(x - size / 2)
    const by = Math.round(y - s * 0.4 - size / 2)
    const d = mapHud.daily
    if (!d || d.x !== bx || d.y !== by || d.size !== size) mapHud.daily = { x: bx, y: by, size }
  } else if (mapHud.daily) mapHud.daily = null
  // Umbra's line follows her from page to page, and ends on its own.
  if (mapHud.umbraSay) {
    const wh = wanderHome()
    if (wh < 0 || T > sayUntil || turning()) mapHud.umbraSay = null
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
  /** The ribbon's middle on screen while it hangs, or null (the QA ad chord). */
  bookmarkAt: (): [number, number] | null => {
    const b = bookmarkBox()
    return b ? [b.x, b.top + b.bw * 1.3] : null
  },
  /** The book (§8.28): which page is open, and any turn in flight. */
  page: (): number => page,
  pages: (): number => PAGE_COUNT,
  turn: (): { from: number; to: number; p: number } | null =>
    (turning() ? { from: turnFrom, to: page, p: turnP } : null),
  toPage: (p: number): boolean => startTurn(p),
  state: nodeState,
  /** The front page's way on: is the swipe showing, how long the page has
   *  sat untouched, and whether the book has turned itself yet. */
  way: (): { on: boolean; t: number; handTurned: boolean; autoUsed: boolean } =>
    ({ on: wayOn(), t: wayT, handTurned, autoUsed: wayAutoUsed })
}

/**
 * The biome in view, for the ambience bus (§8.8 beat 1): the page nearest the
 * middle of the view, at full level while any of its sectors is restored.
 */
export const mapAmbience = (): [number, number] => {
  if (page === 0) return [-1, 0]
  const c = mapHud.visible
  if (!CHAPTERS[c]?.built) return [-1, 0]
  for (let i = 0; i < NODES_PER_CHAPTER; i++) {
    if (hasBit(S.campaign.sectorsDone, c * NODES_PER_CHAPTER + i)) return [c, 1]
  }
  return [c, 0]
}
