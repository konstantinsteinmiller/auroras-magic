/**
 * backdrop.ts — the duel's backdrop, composed ONCE and blitted, on a device
 * that is short of fill.
 *
 * The backdrop is four full-screen layers laid every frame: the page under
 * Umbra's dust (`duelPage.ts`), the sky's wash over it, the cloud band
 * multiplied and screened over that, and the painted island — plus, in
 * portrait, the page going on under the drawing pad with the sky's wash over
 * it too. On the weak-phone proxy at the resolution floor (PERF-LEDGER E3)
 * the frame was still ~80 % raster and no longer proportional to its area:
 * the layers themselves were the cost. Almost nothing in them MOVES. So on
 * the thrift tier they are composed into one canvas, and a frame is one blit.
 *
 * WHAT MAKES THE CACHE STALE — and nothing else does:
 *   • the page: a spell marked it, it re-baked, it reset (`duelPageVersion`);
 *   • the sky's balance, by a 64th. `S.sky` is DAMPED every frame, so it
 *     never rests after a hit; a 64th moves the wash's alpha by ~1 %, which
 *     is under what a player can see, and a transition steps ~10× a second;
 *   • the clouds' drift, by one device pixel at rest scale (7 stage units a
 *     second: a few recomposes a second, and fewer the fewer pixels there are);
 *   • a painting arriving (`onArtChanged`), the chapter's theme, versus;
 *   • the layout: the rest transform, or the portrait pad's foot.
 *
 * WHAT STAYS LIVE: the DRAWN island. Its tufts sway with `S.t`, so while its
 * painting has not arrived it is drawn over the blit every frame, exactly
 * where the live path draws it (after the sky).
 *
 * PIXEL-EXACT AT REST. The cache is composed on the device-pixel grid of the
 * camera at rest — no shake, no punch — at the fractional offset the live
 * path draws at, so an unshaken frame blits it 1:1 and it is the same picture
 * the live path would have drawn. A shaking or punching camera blits it
 * through the world transform, resampled, for the few frames the shake lasts.
 *
 * The thrift tier only (`S.q === 0`, a genuine per-device quality tier): a
 * device with room draws the backdrop live, as it always did.
 */
import { SW, SH } from '@/game/duel/config'
import { S } from '@/game/duel/state'
import { LAYOUT } from '@/game/duel/layout'
import { drawSky, drawSkyWash, drawIsland, islandIsPainting } from '@/game/duel/arena'
import { drawDuelPage, drawDuelPageBelow, duelPageVersion, onDuelPageReset } from '@/game/duel/duelPage'
import { onArtChanged } from '@/game/art'

type G2D = CanvasRenderingContext2D

/** A 64th of the sky's balance — see the header. */
const SKY_STEPS = 64
/** Stage units a shake can carry the world past the pane's edge (`fx.ts`:
 *  shake² × 26), so a portrait crop never runs out under a shaking camera. */
const SHAKE_ROOM = 30
/** How fast the clouds drift, stage units a second (`arena.ts` `drawSky`). */
const CLOUD_SPEED = 7

let cv: HTMLCanvasElement | null = null
let cx: G2D | null = null
/** Where the cache's pixel (0, 0) lands in the world, stage units. */
let ox = 0
let oy = 0
/** The key it was composed under. */
let kK = NaN
let kWX = NaN
let kWY = NaN
let kFoot = NaN
let kPage = -1
let kSky = -1
let kCloud = -1
let kTheme = -1
let kArt = -1
let kVersus = false
let kPortrait = false
let kIsle = false
/** Bumped by every painting that arrives. */
let artEpoch = 0
onArtChanged(() => { artEpoch++ })
onDuelPageReset(() => { releaseBackdrop() })

/** Whether this frame's backdrop comes from the cache. */
export const backdropCached = (): boolean => S.q === 0

/** Let the canvas go — the duel is over. */
export const releaseBackdrop = (): void => {
  cv = null
  cx = null
  kK = NaN
}

/**
 * Compose the cache if what it holds has changed. `foot` is the portrait
 * pad's foot in stage units (the live pad draws to it), NaN in landscape.
 */
const ensure = (t: number, foot: number): void => {
  const k = S.vs * S.dpr
  const WX = S.vx * S.dpr
  const WY = S.vy * S.dpr
  const page = duelPageVersion()
  const sky = Math.round(S.sky * SKY_STEPS)
  const cloud = Math.floor(((t * CLOUD_SPEED) % SW) * k)
  const isle = islandIsPainting()
  if (
    cv && k === kK && WX === kWX && WY === kWY && (foot === kFoot || (foot !== foot && kFoot !== kFoot)) &&
    page === kPage && sky === kSky && cloud === kCloud && S.theme === kTheme && artEpoch === kArt &&
    S.versus === kVersus && S.portrait === kPortrait && isle === kIsle
  ) return

  // The world rect to hold: the stage in landscape; in portrait the part of it
  // the page card can show, down to the pad's foot, with room for the shake.
  let x0 = 0
  let y0 = 0
  let x1 = SW
  let y1 = SH
  if (S.portrait) {
    const c = LAYOUT.card
    x0 = Math.max(-SW, (c.x - S.vx) / S.vs - SHAKE_ROOM)
    x1 = Math.min(2 * SW, (c.x + c.w - S.vx) / S.vs + SHAKE_ROOM)
    y0 = Math.max(0, (c.y - S.vy) / S.vs - SHAKE_ROOM)
    y1 = foot
  }
  // Snap the cache to the device-pixel grid of the camera at rest.
  const bx = Math.floor(WX + x0 * k)
  const by = Math.floor(WY + y0 * k)
  const w = Math.max(1, Math.ceil(WX + x1 * k) - bx)
  const h = Math.max(1, Math.ceil(WY + y1 * k) - by)
  if (!cv) {
    cv = document.createElement('canvas')
    cx = cv.getContext('2d')
  }
  if (cv.width !== w || cv.height !== h) {
    cv.width = w
    cv.height = h
  }
  const c = cx
  if (!c) return
  c.setTransform(1, 0, 0, 1, 0, 0)
  c.globalAlpha = 1
  c.globalCompositeOperation = 'source-over'
  c.clearRect(0, 0, w, h)
  // World → cache pixels: exactly the live path's world → device, less (bx, by).
  c.setTransform(k, 0, 0, k, WX - bx, WY - by)
  if (S.portrait) {
    // The pad's half, as the live pad draws it — the stage above keeps its own.
    c.save()
    c.beginPath()
    c.rect(x0, SH, x1 - x0, y1 - SH)
    c.clip()
    drawSkyWash(c, drawDuelPageBelow(c, foot), SH - 40, foot)
    c.restore()
  }
  c.save()
  c.beginPath()
  c.rect(0, 0, SW, SH)
  c.clip()
  drawSky(c, t, drawDuelPage(c))
  if (isle) drawIsland(c)
  c.restore()
  c.setTransform(1, 0, 0, 1, 0, 0)

  ox = (bx - WX) / k
  oy = (by - WY) / k
  kK = k
  kWX = WX
  kWY = WY
  kFoot = foot
  kPage = page
  kSky = sky
  kCloud = cloud
  kTheme = S.theme
  kArt = artEpoch
  kVersus = S.versus
  kPortrait = S.portrait
  kIsle = isle
}

/** The cache, through the world transform already set on `g`. */
const blit = (g: G2D): void => {
  if (!cv) return
  const k = kK
  g.drawImage(cv, ox, oy, cv.width / k, cv.height / k)
}

/**
 * Portrait: the page and the sky's wash under the drawing pad. `g` is in the
 * world transform, clipped to the pad.
 */
export const drawBackdropPad = (g: G2D, t: number, foot: number): void => {
  if (!backdropCached()) {
    drawSkyWash(g, drawDuelPageBelow(g, foot), SH - 40, foot)
    return
  }
  ensure(t, foot)
  blit(g)
}

/**
 * The page, the sky and the island over the stage. `g` is in the world
 * transform, clipped to the stage (landscape) or the picture's pane.
 */
export const drawBackdrop = (g: G2D, t: number, foot: number): void => {
  if (!backdropCached()) {
    const onPage = drawDuelPage(g)
    drawSky(g, t, onPage)
    drawIsland(g)
    return
  }
  ensure(t, S.portrait ? foot : NaN)
  blit(g)
  // The drawn island sways; it is never in the cache.
  if (!kIsle) drawIsland(g)
}
