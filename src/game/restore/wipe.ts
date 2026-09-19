/**
 * wipe.ts — one sector, from gift to permanence (story-spec §8, §9.3–§9.4,
 * §3.2.2 steps 6–13). The S1 restoration loop.
 *
 *   invite  the gift sits on the dusty sector, shaking now and then (§8.3)
 *   open    tap → the bow unties (300 ms) → burst (250 ms) → the Stardust
 *           Brush eases to the player's last touch point (700 ms)
 *   pots    three paint pots; tap one, or pot 1 is picked after 4 s (§8.7)
 *   paint   the paint flies to the landmark and splashes (600 ms)
 *   zoom    the camera settles and locks (400 ms, §3.2.2 step 9)
 *   wipe    the brush clears dust; a chime rings every 10 % (§8.5)
 *   freeze  ≥ 85 % and 1.5 s idle, or every cell clean → input freezes (550 ms)
 *   wave    the reveal wave rolls out from the last touch point (420 ms)
 *   admire  the sector is alive — the windmill turns, smoke curls up — and
 *           the player moves on when they are ready
 *
 * A BOSS sector (`rvu > 1`, §8.2–§8.6) runs the same loop with its own
 * numbers: the ornate Boss Chest (lid 450 ms, burst 550 ms, tool float
 * 1000 ms under the fanfare), the chapter's new rune tracing itself over the
 * sector as the chest bursts (§5.13), the SUNBEAM instead of the brush —
 * aim-and-release, `sunbeam.ts` — and the bigger reveal (650 ms freeze,
 * 850 ms wave, ~100 glints).
 *
 * Every timer runs on the frame's `dt`, and the scene only receives `dt`
 * while the game is not paused, so an ad or a hidden tab freezes the pots'
 * 4 s auto-pick and the 1.5 s idle grace exactly where they were (§3.10).
 *
 * WHAT IS PERSISTED, AND WHEN (C9):
 *   • the paint pick, the moment it is made;
 *   • the in-progress coverage as one bit per done cell (56 chars), plus one
 *     bit per half-brushed cell (a single pass, another 56), whenever either
 *     bitset changes, sampled every 250 ms, and again on leaving;
 *   • the done bit, the instant the wave finishes — `wipeCoverage` goes back
 *     to `null` in the same write, so a sector is never both done and
 *     in progress.
 *
 * The drawing is `drawRestore`. It runs from the scene's one RAF into the
 * one canvas. This module never calls `requestAnimationFrame` itself.
 */
import { S, save } from '@/game/duel/state'
import { hasBit, setBit, getPaintPick, setPaintPick } from '@/game/campaign/bitset'
import {
  SEC_W, SEC_H, CELLS, COMPLETE_AT, createCoverage, stamp as account, stampRect, coverage01, doneCount,
  cellAt, cellCover, clearAll, packCoverage, unpackCoverage, packHalf, unpackHalf, FIRST_PASS_CLEAR, cellRect, CELL
} from '@/game/restore/mask'
import { Brush, brushSize } from '@/game/restore/brush'
import { Eraser, eraserSize } from '@/game/restore/eraser'
import { toolOf, type ToolId } from '@/game/campaign/tables'
import { Sunbeam, BEAM_W, BEAM_RECHARGE } from '@/game/restore/sunbeam'
import { computeFrame } from '@/game/restore/frame'
import { makeCanvas, bakeStamp, bakeDust, eraseStamp, eraseCells, clearDust, sectorPx, bakePaddle, erasePaddle } from '@/game/restore/dust'
import { sectorOf, type SectorDef } from '@/game/map/sectors'
import { drawGift, drawBoxGift, drawBrush, drawEraser, giftShake, drawChest, chestRattle, drawSunbeam } from '@/game/restore/gift'
import { drawGlyph, glyphPoints } from '@/game/duel/glyph'
import {
  drawFxUnder, drawFxOver, resetFx, puff, glint, brushTrail, gatherGlints, sparkleBurst
} from '@/game/duel/fx'
import { sfx } from '@/game/duel/audio'
import { readInsets } from '@/game/duel/layout'
import { clamp, ease, lerp, rnd, TAU, sin, cos, PI } from '@/game/duel/util'
import { restoreHud, type RestorePhase, type Box } from '@/use/useRestoreHud'
import { haptic } from '@/use/useHaptics'
import { track } from '@/use/useAnalytics'
import { flushSaveNow } from '@/use/useSaveStatus'
import { gotoScene, type SceneId } from '@/game/flow/scene'
import { onUnboxed } from '@/game/flow/restoreFlow'
import { forgetArt, onArtChanged } from '@/game/art'
import { sectorArtId } from '@/game/artIds'
import { paintSectorArt, sectorPainted } from '@/game/map/sectorArt'

type G2D = CanvasRenderingContext2D

/* ------------------------------------------------------------ constants */

/** §8.3 / §8.6 / §3.2.2 beats, seconds. */
export const T_UNTIE = 0.3
export const T_BURST = 0.25
export const T_TOOL = 0.7
export const T_AUTOPICK = 4
export const T_PAINT = 0.6
export const T_ZOOM = 0.4
export const T_IDLE_GRACE = 1.5
export const T_FREEZE = 0.55
export const T_WAVE = 0.42
/** Coverage is checked this often, not every frame (§9.3). */
export const T_CHECK = 0.25
/** How long the restored sector plays before "continue" is offered. */
export const T_ADMIRE = 1.2
/** …and when it goes back to the map on its own (§3.2.2 step 13). */
export const T_ADMIRE_OUT = 3.6
/** The unbox framing sits a little wider, then settles into the lock. */
const ZOOM_UNBOX = 0.92

/** The Boss Chest's beats (§8.3) and the boss reveal (§8.6), seconds. */
export const T_UNTIE_BOSS = 0.45
export const T_BURST_BOSS = 0.55
export const T_TOOL_BOSS = 1.0
export const T_FREEZE_BOSS = 0.65
export const T_WAVE_BOSS = 0.85
/** The chest's new rune: it traces itself once, full-speed (§5.13), holds
 *  so it can be read, then fades into the sector. */
export const T_RUNE_TRACE = 1.2
export const T_RUNE_HOLD = 0.8
export const T_RUNE_FADE = 0.4
const T_RUNE = T_RUNE_TRACE + T_RUNE_HOLD + T_RUNE_FADE
/** The Sunbeam's puff curtain, puffs per second (§8.5: ≈4 per 100 ms). */
const BEAM_PUFFS = 40

export type RestoreEnd = 'restored' | 'left'

/* ---------------------------------------------------------------- state */

let node = -1
let phase: RestorePhase = 'idle'
let phaseT = 0
let onEnd: ((why: RestoreEnd) => void) | null = null

let res = 1
let colourCv: HTMLCanvasElement | null = null
let dustCv: HTMLCanvasElement | null = null
let stampCv: HTMLCanvasElement | null = null
let stampCore = -1

const cov = createCoverage()
let brush: Brush | null = null
/** Which tool this sector's gift holds (§8.4), and the Eraser when it is one. */
let tool: ToolId = 'brush'
let eraser: Eraser | null = null
let paddleCv: HTMLCanvasElement | null = null
/** The hand tool in use — the brush or the eraser (the Sunbeam aims instead). */
const hand = (): Brush | Eraser | null => (tool === 'eraser' ? eraser : brush)
let base: Box = { x: 0, y: 0, w: 1, h: 1 }
let zoom = 1

let pot = 0
let coverage = 0
let checkT = 0
let idleT = 0
let chimeStep = 0
let wipeT = 0
let reached85 = -1
let manual100 = false
let forcedReveal = false

/** Last touch point, CSS px — where the tool floats to and the wave starts. */
let touchX = 0
let touchY = 0
/** The floating tool, CSS px. */
let toolX = 0
let toolY = 0
let toolFromX = 0
let toolFromY = 0
let toolAng = PI * 0.75

let giftOpenAt = -1
let waveX = 0
let waveY = 0
let waveMax = 1
let lifeT = 0
/** The sector being restored. */
let sec: SectorDef = sectorOf(0)
/** A boss sector: the chest, the Sunbeam, the bigger reveal. */
let boss = false
let beam: Sunbeam | null = null
let beamPuffAcc = 0
let beamTrailT = 0
/** The beats of this sector's open and reveal (standard or boss). */
let tUntie = T_UNTIE
let tBurst = T_BURST
let tTool = T_TOOL
let tFreeze = T_FREEZE
let tWave = T_WAVE
/** The rune the chest just granted, tracing itself; -1 when none. */
let revealRune = -1
/** Or the Signature Spell it granted (§6.5): its recipe's three runes trace
 *  one after another, then its emblem blooms under them. -1 when none. */
let revealSig = -1
const SIG_RECIPE: readonly (readonly number[])[] = [[2, 2, 3], [1, 2, 2]]
let revealT = 0
let revealSparkT = 0
/** The rescue collectible: its cells, and seconds since it was found (-1 =
 *  still asleep under the dust). */
const rescueCells: number[] = []
let rescueT = -1
let rescueByHand = false
/** The tap creature's peek on the admire view, seconds (-1 = hidden). */
let peekT = -1
/** Uncovered share of the rescue's silhouette that wakes it (§8.8). */
export const RESCUE_AT = 0.3
let trailT = 0
let puffT = 0
let buzzT = 0

/** Frame-cost samples, ms: the mask + dust work of each frame (§9.3.3). */
const PERF = new Float32Array(240)
let perfN = 0
/** Stamp work done in this frame's update, folded into its sample. */
let stampMs = 0

/* ------------------------------------------------------------ geometry */

/** The frame with the camera's zoom applied, about its centre. */
const view = (): Box => {
  const w = base.w * zoom
  const h = base.h * zoom
  return { x: base.x + (base.w - w) / 2, y: base.y + (base.h - h) / 2, w, h }
}

const toSU = (cx: number, cy: number): [number, number] => {
  const v = view()
  return [((cx - v.x) / v.w) * SEC_W, ((cy - v.y) / v.h) * SEC_H]
}
const toCss = (sx: number, sy: number): [number, number] => {
  const v = view()
  return [v.x + (sx / SEC_W) * v.w, v.y + (sy / SEC_H) * v.h]
}

/* -------------------------------------------------------------- baking */

/** Whether the colour layer was baked from the painting (S6). */
let bakedPainted = false

const bakeColour = (): void => {
  if (!colourCv) return
  const g = colourCv.getContext('2d')
  if (!g) return
  g.setTransform(res, 0, 0, res, 0, 0)
  bakedPainted = paintSectorArt(g, node, sec, sec.pots[pot]!, false)
  if (!bakedPainted) sec.paint(g, sec.pots[pot]!)
  g.setTransform(1, 0, 0, 1, 0, 0)
}

/** The colour layer, the dust baked from it, and the cells a resumed visit
 *  had already cleared. */
const bakeLayers = (): void => {
  if (!colourCv || !dustCv) return
  bakeColour()
  bakeDust(dustCv, colourCv, res, node + 1, (g) => {
    sec.props(g, 0, 0)
    sec.tap?.draw(g, 0, 0)
    sec.rescue?.draw(g, 0, 0)
  })
  const cells = unpackCoverage(cov, S.campaign.wipeCoverage)
  const half = unpackHalf(cov, S.campaign.wipeHalf)
  if (stampCv) {
    eraseCells(dustCv, stampCv, res, cells)
    eraseCells(dustCv, stampCv, res, half, FIRST_PASS_CLEAR)
  }
}

/**
 * The sector's painting can land after the sector opened: it is fetched when
 * the node is tapped, and a slow line may still be decoding it at the gift.
 * Until the first wipe stroke the dust is untouched, so both layers simply
 * re-bake from it — the player sees the gift, not the swap. Once wiping has
 * begun, this visit keeps what it started with: re-baking would put back
 * dust the child already cleared.
 */
const UNTOUCHED: ReadonlySet<RestorePhase> = new Set(['invite', 'open', 'pots', 'paint', 'zoom'])
onArtChanged((c) => {
  if (phase === 'idle' || !UNTOUCHED.has(phase)) return
  if (c && !(c.kind === 'sector' && c.id === sectorArtId(node))) return
  if (sectorPainted(node, false) !== bakedPainted) bakeLayers()
})

const ensureStamp = (): void => {
  if (!brush) return
  const core = Math.round(brush.coreFrac * 100) / 100
  if (stampCv && core === stampCore) return
  stampCore = core
  stampCv = bakeStamp(core)
}

/** Lay out everything that depends on the viewport. */
export const restoreResize = (): void => {
  if (phase === 'idle') return
  const ins = readInsets()
  base = computeFrame(S.w, S.h, ins)
  const size = brushSize(Math.min(S.w, S.h))
  if (brush) {
    brush.suPerCss = SEC_W / base.w
    brush.size = size
  } else brush = new Brush(SEC_W / base.w, size)
  if (tool === 'eraser') {
    const es = eraserSize(Math.min(S.w, S.h))
    if (eraser) {
      eraser.suPerCss = SEC_W / base.w
      eraser.size = es
    } else eraser = new Eraser(SEC_W / base.w, es)
    paddleCv ??= bakePaddle()
  }
  // The slingshot's longest pull: 30 % of the view's short side (§8.4).
  if (beam) beam.maxPull = 0.3 * Math.min(S.w, S.h) * (SEC_W / base.w)
  ensureStamp()
  publishLayout()
}

const publishLayout = (): void => {
  const portrait = S.h >= S.w
  restoreHud.portrait = portrait
  restoreHud.frame = { ...base }
  const gs = giftSize()
  const [gx, gy] = toCss(sec.giftSpot.x, sec.giftSpot.y)
  restoreHud.gift = boss
    ? { x: gx - gs * 0.7, y: gy - gs * 1.0, w: gs * 1.4, h: gs * 1.1 }
    : { x: gx - gs * 0.6, y: gy - gs * 1.1, w: gs * 1.2, h: gs * 1.3 }
  const size = 64
  const gap = 22
  const cy = portrait ? base.y + base.h + 70 : base.y + base.h - size / 2 - 22
  const cx = base.x + base.w / 2
  restoreHud.potSize = size
  restoreHud.pots = [-1, 0, 1].map((k) => ({ x: cx + k * (size + gap), y: cy }))
}

/** The gift's on-screen height, CSS px. The chest is the chapter's headline
 *  reward and sits a size up (§8.2). */
const giftSize = (): number => clamp(base.h * 0.26, 64, 150) * (boss ? 1.25 : 1)

/* ------------------------------------------------------------ lifecycle */

/**
 * Which FSM scene a phase belongs to (§4.1.1). The gift and the pots are
 * `unbox`; the camera lock through the reveal wave is `wipe` — the one live
 * stretch (§11.2). The restored sector at rest (`admire`) is not play any
 * more, so it goes back to `unbox` — the same restore drawing, with the
 * gameplay bracket closed — until the camera zooms out to the map.
 */
const SCENE_OF: Record<RestorePhase, SceneId> = {
  idle: 'duel',
  invite: 'unbox',
  open: 'unbox',
  pots: 'unbox',
  paint: 'unbox',
  zoom: 'wipe',
  wipe: 'wipe',
  freeze: 'wipe',
  wave: 'wipe',
  admire: 'unbox'
}

const setPhase = (p: RestorePhase): void => {
  phase = p
  phaseT = 0
  restoreHud.phase = p
  if (p !== 'idle' && S.flow.scene !== SCENE_OF[p]) gotoScene(SCENE_OF[p], node)
}

/**
 * Open node `n`'s sector. Resumes an opened-but-unfinished sector straight
 * into the wipe with its saved coverage; otherwise starts at the gift.
 */
export const beginRestore = (n: number, done: (why: RestoreEnd) => void): void => {
  node = n
  sec = sectorOf(n)
  boss = sec.rvu > 1
  tool = toolOf(n)
  if (tool !== 'eraser') eraser = null
  tUntie = boss ? T_UNTIE_BOSS : T_UNTIE
  tBurst = boss ? T_BURST_BOSS : T_BURST
  tTool = boss ? T_TOOL_BOSS : T_TOOL
  tFreeze = boss ? T_FREEZE_BOSS : T_FREEZE
  tWave = boss ? T_WAVE_BOSS : T_WAVE
  beam = boss ? new Sunbeam(1) : null
  beamPuffAcc = beamTrailT = 0
  revealRune = revealSig = -1
  onEnd = done
  resetFx()
  const pick = getPaintPick(S.campaign.paintPicks, n)
  const opened = pick !== 0
  pot = opened ? pick - 1 : 0
  phase = 'invite' // so restoreResize lays out
  restoreResize()
  // Resolution: no finer than the sector is drawn, never below half (§9.2).
  const want = (base.w * S.dpr) / SEC_W
  res = S.q > 0 ? clamp(Math.ceil(want * 4) / 4, 0.5, 1) : 0.5
  const [pw, ph] = sectorPx(res)
  colourCv = makeCanvas(pw, ph)
  dustCv = makeCanvas(pw, ph)
  // The chapter's rescue (§8.8 beat 3): which coverage cells its silhouette
  // covers, so the wipe can tell when a third of it is showing.
  rescueCells.length = 0
  rescueT = -1
  rescueByHand = false
  peekT = -1
  const rs = sec.rescue
  if (rs) {
    for (let c = 0; c < CELLS; c++) {
      const [cx, cy] = cellRect(c)
      if (Math.hypot(cx + CELL / 2 - rs.x, cy + CELL / 2 - rs.y) <= rs.r) rescueCells.push(c)
    }
  }
  bakeLayers()
  coverage = coverage01(cov)
  chimeStep = Math.floor(coverage * 10)
  restoreHud.coverage = coverage
  restoreHud.picked = opened ? pot : -1
  restoreHud.potDefs = sec.pots.map((p) => ({ ...p }))
  restoreHud.boss = sec.rvu > 1
  restoreHud.tool = tool
  restoreHud.showContinue = false
  checkT = idleT = wipeT = lifeT = 0
  reached85 = -1
  manual100 = forcedReveal = false
  giftOpenAt = -1
  const [gx, gy] = toCss(sec.giftSpot.x, sec.giftSpot.y - 60)
  touchX = toolX = gx
  touchY = toolY = gy
  if (opened) {
    zoom = ZOOM_UNBOX
    setPhase('zoom')
  } else {
    zoom = ZOOM_UNBOX
    setPhase('invite')
  }
  publishLayout()
}

const end = (why: RestoreEnd): void => {
  const cb = onEnd
  onEnd = null
  hand()?.release()
  beam?.stop()
  revealRune = revealSig = -1
  setPhase('idle')
  restoreHud.showContinue = false
  // Release the two sector-sized canvases; the stamp and noise are tiny and
  // kept for the next sector. The full-size painting goes too: fifty of
  // them decoded for the session would be ~150 MB (the map keeps its thumb).
  colourCv = dustCv = null
  forgetArt('sector', sectorArtId(node))
  resetFx()
  cb?.(why)
}

/** The player backed out mid-wipe (§3.3.5): keep what they cleared. */
export const leaveRestore = (): void => {
  if (phase === 'idle' || phase === 'freeze' || phase === 'wave' || phase === 'admire') return
  if (phase === 'wipe' || phase === 'zoom') {
    persistCoverage()
    track('wipe_interrupted', { sectorId: node, pctAtInterrupt: Math.round(coverage * 100), reason: 'left' })
  }
  void flushSaveNow()
  end('left')
}

/** "Continue" on the restored sector. */
export const continueRestore = (): void => {
  if (phase !== 'admire' || !restoreHud.showContinue) return
  sfx('ui')
  end('restored')
}

export const restoreActive = (): boolean => phase !== 'idle'

/** The biome for the ambience bus while a restored sector is admired. */
export const restoreAmbience = (): [number, number] =>
  phase === 'admire' || phase === 'wave' ? [Math.floor(node / 5), 1] : [-1, 0]

/* --------------------------------------------------------------- input */

export const restorePointerDown = (cx: number, cy: number, t: number): void => {
  touchX = cx
  touchY = cy
  idleT = 0
  if (phase === 'invite') {
    openGift()
    return
  }
  if (phase === 'admire' && sec.tap && peekT < 0) {
    // The restored sector's creature says hello (§8.8 beat 2).
    const [x, y] = toSU(cx, cy)
    if (Math.hypot(x - sec.tap.x, y - sec.tap.y) < Math.max(sec.tap.r, 40)) {
      peekT = 0
      sfx('peek', node % 6)
      haptic('tick')
    }
    return
  }
  if (phase !== 'wipe') return
  const [x, y] = toSU(cx, cy)
  if (beam) {
    // The Sunbeam: the press sets where the light starts (§8.4). A press
    // while it is still travelling or gathering is simply not taken.
    beam.aim(clamp(x, 0, SEC_W), clamp(y, 0, SEC_H))
    return
  }
  hand()?.press(x, y, cx, cy, t)
}

export const restorePointerMove = (cx: number, cy: number, t: number): void => {
  if (beam) {
    if (beam.state !== 'aiming') return
    idleT = 0
    touchX = cx
    touchY = cy
    const [x, y] = toSU(cx, cy)
    beam.drag(x, y)
    return
  }
  const h = hand()
  if (!h?.down) return
  if (Math.abs(cx - touchX) + Math.abs(cy - touchY) > 1) idleT = 0
  touchX = cx
  touchY = cy
  const [x, y] = toSU(cx, cy)
  h.move(x, y, cx, cy, t)
}

export const restorePointerUp = (): void => {
  if (beam) {
    if (beam.release()) fireBeam()
    return
  }
  hand()?.release()
}

/** The slingshot let go: the light is on its way. */
const fireBeam = (): void => {
  if (!beam) return
  idleT = 0
  // The reveal wave, if this is the last shot, starts where the light did.
  ;[touchX, touchY] = toCss(beam.ox, beam.oy)
  sfx('beam')
  haptic('tick')
}

/** The gift's own button (keyboard / screen reader). */
export const openGiftFromUi = (): void => {
  if (phase === 'invite') openGift()
}

const openGift = (): void => {
  giftOpenAt = 0
  sfx('untie')
  haptic('tick')
  setPhase('open')
}

export const pickPot = (i: number): void => {
  if (phase !== 'pots') return
  pot = clamp(i | 0, 0, sec.pots.length - 1)
  restoreHud.picked = pot
  S.campaign.paintPicks = setPaintPick(S.campaign.paintPicks, node, (pot + 1) as 1 | 2 | 3)
  save()
  sfx('paint', pot)
  haptic('reward')
  // The roof is under the dust, so the re-bake is invisible. The player
  // sees the paint land, and finds their colour as they wipe.
  bakeColour()
  const p = restoreHud.pots[pot]
  paintFrom = p ? [p.x, p.y] : [touchX, touchY]
  setPhase('paint')
}
let paintFrom: [number, number] = [0, 0]

/* ---------------------------------------------------------- the wipe */

const persistCoverage = (): void => {
  const packed = packCoverage(cov)
  const half = packHalf(cov)
  if (packed === S.campaign.wipeCoverage && half === S.campaign.wipeHalf) return
  S.campaign.wipeCoverage = packed
  S.campaign.wipeHalf = half
  save()
}

/** One stamp: paint it, account it, age the dwell clocks, kick up dust. */
const onStamp = (x: number, y: number, r: number, core: number, a: number, _speed: number, t: number): void => {
  if (dustCv && stampCv) eraseStamp(dustCv, stampCv, res, x, y, r, a)
  // Account with the SAME falloff the baked stamp carries (it is baked at a
  // rounded core share), so the model and the pixels cannot drift apart.
  account(cov, x, y, r, stampCore > 0 ? stampCore : core, a, t)
  // Dust puffs ride the erase BOUNDARY — the swath's edge — at ~1 per 120 ms
  // of contact, thinned on the low quality tier, hard-capped (§8.5, §9.10).
  if (puffT <= 0) {
    const side = rnd() < 0.5 ? -1 : 1
    const ang = Math.atan2(y - brushLastY, x - brushLastX) + side * PI * 0.5
    const px = x + cos(ang) * r * 0.85
    const py = y + sin(ang) * r * 0.85
    const c = cellAt(px, py)
    if (c >= 0 && cellCover(cov, c) < 0.9) {
      const [sx, sy] = toCss(px, py)
      const k = view().w / SEC_W
      puff(sx, sy, cos(ang) * 24 - (x - brushLastX) * k * 2, sin(ang) * 16 - 18, clamp(r * k * 0.28, 7, 22))
      puffT = S.q > 0 ? 0.12 : 0.24
    }
  }
  brushLastX = x
  brushLastY = y
}
let brushLastX = 0
let brushLastY = 0

const stepWipe = (dt: number, now: number): void => {
  if (beam) {
    stepBeam(dt, now)
    return
  }
  if (eraser) {
    stepEraser(dt, now)
    return
  }
  if (!brush) return
  wipeT += dt
  idleT += dt
  trailT -= dt
  puffT -= dt
  buzzT -= dt
  if (brush.down) {
    const t0 = performance.now()
    const laid = brush.flush(now, cov, onStamp)
    stampMs += performance.now() - t0
    const sp = brush.speed
    if (laid && sp > 20) sfx('scrub', sp)
    // The sparkle trail rides the tip: one glint per 55 ms of contact, two
    // when the brush is really moving (§8.4).
    if (trailT <= 0) {
      trailT = 0.055
      brushTrail(touchX, touchY, sp > 250 ? 2 : 1)
    }
    if (sp > 20 && buzzT <= 0) {
      const k = clamp(sp / 400, 0, 1)
      haptic('scrub', 10 + 20 * (1 - k))
      buzzT = (70 + 50 * (1 - k)) / 1000
    }
  }
  checkCoverage(dt)
}

/** One Magic Eraser paddle: one contact clears (§8.4). Denser puffs than the
 *  brush's (≈ 1 per 90 ms), kicked off the paddle's sides. */
const onPaddle = (x: number, y: number, hw: number, hh: number, ang: number, a: number, t: number): void => {
  if (dustCv && paddleCv) erasePaddle(dustCv, paddleCv, res, x, y, hw, hh, ang, a)
  stampRect(cov, x, y, hw, hh, ang, a, t)
  if (puffT <= 0) {
    const side = rnd() < 0.5 ? -1 : 1
    const nx = -Math.sin(ang) * side
    const ny = Math.cos(ang) * side
    const px = x + nx * hh * 1.1
    const py = y + ny * hh * 1.1
    const c = cellAt(px, py)
    if (c >= 0 && cellCover(cov, c) < 0.9) {
      const [sx, sy] = toCss(px, py)
      const k = view().w / SEC_W
      puff(sx, sy, nx * 30, ny * 20 - 18, clamp(hh * k * 0.4, 8, 24))
      puffT = S.q > 0 ? 0.09 : 0.18
    }
  }
}

const stepEraser = (dt: number, now: number): void => {
  if (!eraser) return
  wipeT += dt
  idleT += dt
  trailT -= dt
  puffT -= dt
  buzzT -= dt
  if (eraser.down) {
    const t0 = performance.now()
    const laid = eraser.flush(now, onPaddle)
    stampMs += performance.now() - t0
    const sp = eraser.speed
    if (laid && sp > 20) sfx('scrub', sp)
    // A fixed two glints per tick, no speed scaling (§8.4).
    if (trailT <= 0) {
      trailT = 0.055
      brushTrail(touchX, touchY, 2)
    }
    // Haptics at the formulas' midpoint: 20 ms every 95 ms (§8.5).
    if (sp > 20 && buzzT <= 0) {
      haptic('scrub', 20)
      buzzT = 0.095
    }
  }
  checkCoverage(dt)
}

/** The coverage ladder, the save, and the two ways a wipe ends (§8.6). */
const checkCoverage = (dt: number): void => {
  checkT += dt
  if (checkT >= T_CHECK) {
    checkT = 0
    coverage = coverage01(cov)
    restoreHud.coverage = coverage
    if (coverage >= COMPLETE_AT && reached85 < 0) reached85 = wipeT
    // The chime ladder: one rung per 10 % crossed. Rungs 9 and 10 belong to
    // the reveal's flourish (§8.5).
    const step = Math.min(8, Math.floor(coverage * 10))
    while (chimeStep < step) {
      chimeStep++
      sfx('chime', chimeStep)
    }
    persistCoverage()
    // A third of the rescue showing: it wakes, found by the player's own hand.
    if (rescueT < 0 && rescueCells.length && rescueCover() >= RESCUE_AT) wakeRescue(true)
    if (doneCount(cov) >= CELLS) {
      manual100 = true
      startReveal()
      return
    }
  }
  // Auto-complete: ≥ 85 % AND the tool has stopped for 1.5 s (C25). An
  // active perfectionist sails straight past 85 % without interruption.
  if (coverage >= COMPLETE_AT && idleT >= T_IDLE_GRACE) startReveal()
}

/** One stamp of the Sunbeam's band: no dwell, one pass clears (§8.4). */
const onBeamStamp = (x: number, y: number, r: number, core: number, a: number, _speed: number, t: number): void => {
  if (dustCv && stampCv) eraseStamp(dustCv, stampCv, res, x, y, r, a)
  account(cov, x, y, r, stampCore > 0 ? stampCore : core, a, t)
}

/** A puff of the curtain the band drags behind it (§8.5): along its edges,
 *  a little behind the head, drifting out and back — only where there is
 *  dust beside the band to kick up. */
const beamPuff = (): void => {
  if (!beam) return
  const d = beam.at - Math.min(beam.at, 260) * rnd()
  const side = rnd() < 0.5 ? -1 : 1
  const nx = -beam.dy * side
  const ny = beam.dx * side
  const w = BEAM_W * (0.42 + rnd() * 0.16)
  const x = beam.ox + beam.dx * d + nx * w
  const y = beam.oy + beam.dy * d + ny * w
  const out = cellAt(x + nx * BEAM_W * 0.5, y + ny * BEAM_W * 0.5)
  if (out < 0 || cellCover(cov, out) >= 0.9) return
  const [cx, cy] = toCss(x, y)
  const k = view().w / SEC_W
  puff(cx, cy, nx * 46 - beam.dx * 36, ny * 46 - beam.dy * 36 - 16, clamp(BEAM_W * k * 0.34, 8, 26))
}

const stepBeam = (dt: number, now: number): void => {
  if (!beam) return
  wipeT += dt
  const busy = beam.state === 'aiming' || beam.state === 'firing'
  idleT = busy ? 0 : idleT + dt
  const was = beam.state
  const t0 = performance.now()
  const landed = beam.step(dt, now, onBeamStamp)
  stampMs += performance.now() - t0
  if (beam.state === 'firing' || landed) {
    // A streaming glint trail at the head, and the puff curtain behind it.
    const [hx, hy] = toCss(...beam.head())
    beamTrailT -= dt
    if (beamTrailT <= 0) {
      beamTrailT = 0.03
      brushTrail(hx, hy, S.q > 0 ? 2 : 1, 1.3)
    }
    beamPuffAcc += dt * BEAM_PUFFS * (S.q > 0 ? 1 : 0.5)
    while (beamPuffAcc >= 1) {
      beamPuffAcc--
      beamPuff()
    }
  }
  if (landed) {
    // The recharge: light rushes back into the sun before the next shot
    // (§8.4, the `gather` anticipation) — never a dead pause.
    const [ox, oy] = toCss(beam.ox, beam.oy)
    gatherGlints(ox, oy, 1.1)
    beamPuffAcc = 0
  }
  if (was === 'recharge' && beam.state === 'ready') sfx('ready')
  checkCoverage(dt)
}

const startReveal = (): void => {
  hand()?.release()
  beam?.stop()
  const [sx, sy] = toSU(touchX, touchY)
  waveX = clamp(sx, 0, SEC_W)
  waveY = clamp(sy, 0, SEC_H)
  waveMax = Math.max(
    Math.hypot(waveX, waveY), Math.hypot(SEC_W - waveX, waveY),
    Math.hypot(waveX, SEC_H - waveY), Math.hypot(SEC_W - waveX, SEC_H - waveY)
  )
  gatherGlints(touchX, touchY, 1.2)
  sfx('chime', 9)
  setPhase('freeze')
}

/** Mean clear share over the rescue's cells. */
const rescueCover = (): number => {
  let s = 0
  for (const c of rescueCells) s += cellCover(cov, c)
  return s / rescueCells.length
}

/** The rescue wakes up: a denser sparkle cue than any wipe glint, its own
 *  sound, and the chapter's `rescued` bit. The auto-pop calls this too, so
 *  no player ever misses it (§8.6). */
const wakeRescue = (byHand: boolean): void => {
  const rs = sec.rescue
  if (!rs || rescueT >= 0) return
  rescueT = 0
  rescueByHand = byHand
  const [x, y] = toCss(rs.x, rs.y)
  const k = view().w / SEC_W
  for (let i = 0; i < 26; i++) {
    const a = rnd() * TAU
    const d = rnd() * rs.r * k
    glint(x + cos(a) * d, y + sin(a) * d, 8 + rnd() * 9, rnd() * 0.25, cos(a) * 60, sin(a) * 60 - 40)
  }
  sparkleBurst(x, y, 0.7)
  sfx('rescue')
  haptic('reward')
  const ch = Math.floor(node / 5)
  S.campaign.rescued = (S.campaign.rescued | (1 << ch)) >>> 0
  save()
}

/** The rescue's wake-up, 0 asleep … 1 free. */
const rescueK = (): number => (rescueT < 0 ? 0 : clamp(rescueT / 1.2, 0, 1))

/** The tap creature's peek on the admire view, 0 … 1 … 0 over 900 ms. */
const peekK = (): number => {
  if (peekT < 0) return 0
  const ez = (v: number): number => 1 - (1 - v) * (1 - v)
  return peekT < 0.25 ? ez(peekT / 0.25) : peekT < 0.65 ? 1 : 1 - ez(clamp((peekT - 0.65) / 0.25, 0, 1))
}

const startWave = (): void => {
  setPhase('wave')
  // The pop never skips the chapter's friend: it surfaces inline (§8.6).
  if (rescueCells.length && rescueT < 0) wakeRescue(false)
  sfx('whoosh')
  sfx('reveal')
  haptic(boss ? 'restoredBoss' : 'restored')
  // 40–60 glints staggered along the wave front (≈100 on a boss sector):
  // each is HELD until the front reaches it (§8.6, the `fireRain` stagger
  // technique). The hold inverts the front's ease-out, so a glint appears
  // exactly as the light passes it.
  const n = boss ? 100 : 50
  for (let i = 0; i < n; i++) {
    const a = rnd() * TAU
    const d = rnd() * waveMax
    const x = clamp(waveX + cos(a) * d, 0, SEC_W)
    const y = clamp(waveY + sin(a) * d, 0, SEC_H)
    const [cx, cy] = toCss(x, y)
    const reach = 1 - Math.cbrt(1 - d / waveMax)
    glint(cx, cy, 9 + rnd() * 8, reach * tWave, cos(a) * 40, sin(a) * 40 - 30)
  }
  // The scaled-down flourish at the wave's origin (§8.6 step 5). The wave's
  // own front, drawn in `drawWaveFront`, is the shockwave scaled to the sector.
  sparkleBurst(touchX, touchY, boss ? 1.3 : 1)
  if (manual100 && dustCv) clearDust(dustCv)
}

const finishWave = (): void => {
  if (dustCv) clearDust(dustCv)
  clearAll(cov)
  coverage = 1
  restoreHud.coverage = 1
  S.campaign.sectorsDone = setBit(S.campaign.sectorsDone, node)
  S.campaign.wipeCoverage = null
  S.campaign.wipeHalf = null
  save()
  void flushSaveNow()
  track('wipe_complete', {
    sectorId: node,
    chapter: Math.floor(node / 5),
    isBoss: boss,
    tool: boss ? 'sunbeam' : tool === 'eraser' ? 'magicEraser' : 'stardustBrush',
    durationMs: Math.round(wipeT * 1000),
    coverage85AtMs: reached85 >= 0 ? Math.round(reached85 * 1000) : -1,
    coveragePct: Math.round((forcedReveal ? 100 : coverageAtReveal * 100)),
    strokeOrSweepCount: beam ? beam.sweeps : hand()?.strokes ?? 0,
    manualTo100: manual100,
    rescueFound: rescueByHand
  })
  setPhase('admire')
}
let coverageAtReveal = 0

/* -------------------------------------------------------- rune reveal */

/** Where the new rune draws itself: over the sector, a little above centre. */
const runeFrame = (): [number, number, number] => {
  const v = view()
  return [v.x + v.w / 2, v.y + v.h * 0.44, Math.min(v.w, v.h) * 0.27]
}

/** The chest just granted rune `k`: it traces itself once over the sector,
 *  full-speed, as "here's how it goes" (§5.13, §8.3's 950–1500 ms beat). */
const beginRuneReveal = (k: number): void => {
  revealRune = k
  revealSig = -1
  revealT = revealSparkT = 0
}
/** The chest just granted Signature Spell `i`: its recipe writes itself. */
const beginSignatureReveal = (i: number): void => {
  revealSig = i
  revealRune = -1
  revealT = revealSparkT = 0
}
/** Is a chest's grant still being read? The pots wait for it. */
const revealing = (): boolean => revealRune >= 0 || revealSig >= 0

/** Where glyph `i` of a recipe's three sits, and how big (CSS px). */
const recipeSlot = (i: number): [number, number, number] => {
  const [cx, cy, r] = runeFrame()
  return [cx + (i - 1) * r * 0.95, cy - r * 0.18, r * 0.4]
}

const stepRuneReveal = (dt: number): void => {
  if (!revealing()) return
  const was = revealT
  revealT += dt
  const [cx, cy, r] = runeFrame()
  if (revealSig >= 0) {
    // Three glyphs, a third of the trace each, a snap as each one lands.
    const recipe = SIG_RECIPE[revealSig]!
    const per = T_RUNE_TRACE / 3
    const i = Math.min(2, Math.floor(revealT / per))
    if (revealT < T_RUNE_TRACE) {
      revealSparkT -= dt
      if (revealSparkT <= 0) {
        revealSparkT = 0.04
        const [gx, gy, gr] = recipeSlot(i)
        const [hx, hy] = glyphPoints(recipe[i]!, gx, gy, gr, ease((revealT - i * per) / per)).head
        brushTrail(hx, hy, 1, 0.9)
      }
    }
    for (let k = 0; k < 3; k++) {
      if (was < (k + 1) * per && revealT >= (k + 1) * per) sfx('snap', recipe[k])
    }
    if (was < T_RUNE_TRACE && revealT >= T_RUNE_TRACE) {
      haptic('reward')
      sparkleBurst(cx, cy + r * 0.62, 1)
    }
    if (revealT >= T_RUNE) revealSig = -1
    return
  }
  if (revealT < T_RUNE_TRACE) {
    // A spark rides the tip of the stroke, the way a finger would.
    revealSparkT -= dt
    if (revealSparkT <= 0) {
      revealSparkT = 0.04
      const [hx, hy] = glyphPoints(revealRune, cx, cy, r, ease(revealT / T_RUNE_TRACE)).head
      brushTrail(hx, hy, 1, 1.2)
    }
  }
  if (was < T_RUNE_TRACE && revealT >= T_RUNE_TRACE) {
    sfx('snap', revealRune)
    haptic('reward')
    sparkleBurst(cx, cy, 0.9)
  }
  if (revealT >= T_RUNE) revealRune = -1
}

/* ------------------------------------------------------------- update */

/** One frame of the scene. `dt` is 0-free: the caller skips paused frames. */
export const updateRestore = (dt: number, now: number): void => {
  if (phase === 'idle') return
  phaseT += dt
  switch (phase) {
    case 'invite':
      break
    case 'open': {
      const was = giftOpenAt
      giftOpenAt += dt
      if (giftOpenAt >= tUntie && was < tUntie) {
        const [gx, gy] = toCss(sec.giftSpot.x, sec.giftSpot.y - (boss ? 70 : 40))
        sfx('unbox')
        haptic('reward')
        // §8.3: the victory burst's convention — ~40 % size in the Brush's
        // soft pastel glints for a gift, full size for the chest.
        sparkleBurst(gx, gy, boss ? 1.5 : 0.85)
        // The unbox beat's payload: a boss chest's rune and keepsake are
        // granted HERE, riding the burst (R-1b, §8.3) — not at the win.
        const grant = onUnboxed(node)
        if (grant.rune !== null) beginRuneReveal(grant.rune)
        else if (grant.signature !== null) beginSignatureReveal(grant.signature)
        toolFromX = toolX = gx
        toolFromY = toolY = gy
      }
      // The Sunbeam's float rides the boss fanfare (§8.5).
      if (boss && giftOpenAt >= tUntie + tBurst && was < tUntie + tBurst) sfx('fanfare')
      if (giftOpenAt >= tUntie + tBurst) {
        const k = clamp((giftOpenAt - tUntie - tBurst) / tTool, 0, 1)
        const e = 1 - (1 - k) ** 3 // ease-out cubic (§8.3)
        toolX = lerp(toolFromX, touchX, e)
        toolY = lerp(toolFromY, touchY, e)
        // The pots wait for the new rune to finish being read.
        if (k >= 1 && !revealing()) setPhase('pots')
      }
      break
    }
    case 'pots':
      if (phaseT >= T_AUTOPICK) pickPot(0)
      break
    case 'paint':
      if (phaseT >= T_PAINT) {
        const [lx, ly] = toCss(sec.landmark.x, sec.landmark.y)
        for (let i = 0; i < 14; i++) {
          const a = rnd() * TAU
          glint(lx, ly, 8 + rnd() * 6, 0, cos(a) * 120, sin(a) * 120)
        }
        sparkleBurst(lx, ly, 0.35)
        setPhase('zoom')
      }
      break
    case 'zoom':
      zoom = lerp(ZOOM_UNBOX, 1, ease(clamp(phaseT / T_ZOOM, 0, 1)))
      if (phaseT >= T_ZOOM) {
        zoom = 1
        publishLayout()
        track('wipe_start', {
          sectorId: node,
          chapter: Math.floor(node / 5),
          isBoss: boss,
          tool: boss ? 'sunbeam' : tool === 'eraser' ? 'magicEraser' : 'stardustBrush',
          // §7.5: the constant standard area, and the boss's 4×.
          sectorAreaRvu2: boss ? 1270600 : 317650
        })
        setPhase('wipe')
      }
      break
    case 'wipe':
      stepWipe(dt, now)
      break
    case 'freeze':
      if (phaseT >= tFreeze) {
        coverageAtReveal = coverage
        startWave()
      }
      break
    case 'wave':
      if (phaseT >= tWave) finishWave()
      break
    case 'admire':
      lifeT += dt
      if (phaseT >= T_ADMIRE && !restoreHud.showContinue) restoreHud.showContinue = true
      if (phaseT >= T_ADMIRE_OUT) {
        end('restored')
        return
      }
      break
  }
  stepRuneReveal(dt)
  if (rescueT >= 0) rescueT += dt
  if (peekT >= 0) {
    peekT += dt
    if (peekT >= 0.9) peekT = -1
  }
  // The Sunbeam jumps to where the light will start, quickly but not in one
  // frame, and stays there while the band travels and it gathers again.
  if (phase === 'wipe' && beam && beam.state !== 'ready') {
    const [ox, oy] = toCss(beam.ox, beam.oy)
    const k = 1 - Math.exp(-dt * 24)
    toolX += (ox - toolX) * k
    toolY += (oy - toolY) * k
  }
  // The tool follows the finger with a little lag, and tilts with its travel.
  if (phase === 'wipe' && hand()?.down && !beam) {
    const k = 1 - Math.exp(-dt * 28)
    const vx = touchX - toolX
    toolX += vx * k
    toolY += (touchY - toolY) * k
    // The brush tilts with its travel; the eraser's paddle points along it.
    toolAng = eraser
      ? eraser.ang
      : lerp(toolAng, PI * 0.75 - clamp(vx * 0.01, -0.35, 0.35), 1 - Math.exp(-dt * 10))
  }
}

/* --------------------------------------------------------------- draw */

let bg: CanvasGradient | null = null
let bgKey = ''

const drawBackdrop = (g: G2D): void => {
  const key = `${S.w}x${S.h}`
  if (!bg || key !== bgKey) {
    bgKey = key
    bg = g.createLinearGradient(0, 0, 0, S.h)
    bg.addColorStop(0, '#2b2048')
    bg.addColorStop(1, '#503a74')
  }
  g.fillStyle = bg
  g.fillRect(0, 0, S.w, S.h)
  // A few slow twinkles on the night page around the sector, so a tall phone
  // is not a sector floating in a flat void. One path, one fill per band.
  g.fillStyle = '#fff4d6'
  for (let band = 0; band < 3; band++) {
    g.globalAlpha = 0.18 + 0.22 * (0.5 + 0.5 * sin(S.t * (0.9 + band * 0.4) + band * 2.1))
    g.beginPath()
    for (let i = band; i < TWINKLES.length; i += 3) {
      const [u, w, r] = TWINKLES[i]!
      const x = u * S.w
      const y = w * S.h
      g.moveTo(x + r, y)
      g.arc(x, y, r, 0, TAU)
    }
    g.fill()
  }
  g.globalAlpha = 1
}
const TWINKLES: [number, number, number][] = (() => {
  let s = 7
  const r = (): number => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
  return Array.from({ length: 36 }, () => [r(), r(), 0.8 + r() * 1.6] as [number, number, number])
})()

/** The sector's page: a paper border with a cel drop shadow. */
const drawPage = (g: G2D, v: Box): void => {
  const b = Math.max(4, v.w * 0.008)
  g.fillStyle = 'rgba(20,10,30,0.35)'
  g.beginPath()
  g.roundRect(v.x - b + 5, v.y - b + 7, v.w + 2 * b, v.h + 2 * b, b * 2)
  g.fill()
  g.fillStyle = '#fff4e6'
  g.beginPath()
  g.roundRect(v.x - b, v.y - b, v.w + 2 * b, v.h + 2 * b, b * 2)
  g.fill()
  g.lineWidth = 2.5
  g.strokeStyle = '#3A2340'
  g.stroke()
}

export const drawRestore = (g: G2D): void => {
  if (phase === 'idle' || !colourCv || !dustCv) return
  const d = S.dpr
  g.setTransform(d, 0, 0, d, 0, 0)
  g.globalAlpha = 1
  g.globalCompositeOperation = 'source-over'
  drawBackdrop(g)
  const v = view()
  drawPage(g, v)

  const t0 = performance.now()
  g.drawImage(colourCv, v.x, v.y, v.w, v.h)
  // Live props, in sector units, UNDER the dust so they are revealed with it.
  const k = v.w / SEC_W
  g.save()
  g.beginPath()
  g.rect(v.x, v.y, v.w, v.h)
  g.clip()
  g.setTransform(d * k, 0, 0, d * k, d * v.x, d * v.y)
  sec.props(g, lifeT, clamp(lifeT / 0.8, 0, 1))
  sec.tap?.draw(g, peekK(), lifeT)
  sec.rescue?.draw(g, rescueK(), rescueT < 0 ? 0 : rescueT)
  g.setTransform(d, 0, 0, d, 0, 0)
  if (phase === 'wave') {
    // The wave clears by CLIPPING the dust outside its growing disc — no
    // per-frame erase over the whole dust canvas (that pass cost ~4 ms on a
    // CPU rasteriser). The dust is cleared for good when the wave lands.
    const r = waveRadius() * k
    g.save()
    g.beginPath()
    g.rect(v.x, v.y, v.w, v.h)
    g.arc(v.x + waveX * k, v.y + waveY * k, Math.max(0, r), 0, TAU, true)
    g.clip()
    g.drawImage(dustCv, v.x, v.y, v.w, v.h)
    g.restore()
    drawWaveFront(g, v, k)
  } else if (phase !== 'admire') g.drawImage(dustCv, v.x, v.y, v.w, v.h)
  if (phase === 'wipe' && beam) drawBeam(g, k)
  g.restore()
  sample(performance.now() - t0 + stampMs)
  stampMs = 0

  const chestUp = boss && phase === 'open' && giftOpenAt < tUntie + tBurst + 0.5
  if (phase === 'invite' || chestUp || (phase === 'open' && giftOpenAt < tUntie + 0.05)) drawOpeningGift(g)
  if (phase === 'paint') drawPaintFlight(g)
  drawRuneReveal(g)
  const showTool = phase === 'open' ? giftOpenAt >= tUntie : phase === 'pots' || phase === 'paint' || phase === 'zoom' || phase === 'wipe'
  if (showTool) {
    const s = clamp(base.h * 0.2, 64, 110)
    if (beam) {
      const aiming = phase === 'wipe' && beam.state === 'aiming'
      if (aiming) drawSling(g)
      const bob = beam.state === 'ready' ? sin(S.t * 3) * 3 : 0
      drawSunbeam(g, toolX, toolY + bob, s, S.t, phase === 'wipe' ? beam.charge() : 1, aiming ? beam.pull : 0)
    } else if (eraser) {
      const bob = eraser.down ? 0 : sin(S.t * 3) * 3
      drawEraser(g, toolX, toolY + bob, s, eraser.down ? toolAng : -0.3)
    } else {
      const bob = brush?.down ? 0 : sin(S.t * 3) * 3
      if (phase === 'wipe' && brush?.down) drawCursor(g)
      drawBrush(g, toolX, toolY + bob, s, toolAng, S.t)
    }
  }
  drawFxUnder(g)
  drawFxOver(g)
  if (S.flash > 0) {
    g.globalAlpha = S.flash * 0.55
    g.fillStyle = '#fff'
    g.fillRect(v.x, v.y, v.w, v.h)
    g.globalAlpha = 1
  }
}

const drawOpeningGift = (g: G2D): void => {
  const [x, y] = toCss(sec.giftSpot.x, sec.giftSpot.y)
  const s = giftSize()
  const u = phase === 'open' ? clamp(giftOpenAt / tUntie, 0, 1) : 0
  // Waiting: a soft glow pulse under it, and the shake. Untying: it swells.
  if (phase === 'invite') {
    g.save()
    g.globalAlpha = 0.45 + 0.2 * sin(S.t * 3)
    const gr = g.createRadialGradient(x, y - s * 0.4, 4, x, y - s * 0.4, s * 1.1)
    gr.addColorStop(0, '#fff6c8')
    gr.addColorStop(1, 'rgba(255,246,200,0)')
    g.fillStyle = gr
    g.fillRect(x - s * 1.1, y - s * 1.5, s * 2.2, s * 2.2)
    g.restore()
  }
  if (boss) {
    // The chest: the clasp flickers while it waits; tapped, the lid creaks up
    // (450 ms), and after the burst the open chest fades into the sector.
    const fade = 1 - clamp((giftOpenAt - tUntie - tBurst) / 0.5, 0, 1)
    g.save()
    g.globalAlpha = phase === 'open' ? fade : 1
    drawChest(g, x, y, s, {
      rot: phase === 'invite' ? chestRattle(S.t) : 0,
      open: ease(u),
      gleam: phase === 'invite' ? 0.35 + 0.65 * Math.max(0, sin(S.t * 5)) : 1
    }, sec.accent?.gem)
    g.restore()
    return
  }
  ;(tool === 'eraser' ? drawBoxGift : drawGift)(g, x, y, s * (1 + u * 0.12), {
    rot: phase === 'invite' ? giftShake(S.t) : 0, untie: u, squash: 1 + u * 0.05,
    ribbon: sec.accent?.ribbon, ribbonShade: sec.accent?.ribbonShade
  })
}

/**
 * A Signature Spell's emblem (§6.5), under its recipe: Crystal Ward's prism
 * cluster, Frost Lock's snowflake. Drawn, never written — zero-UI (§8.2).
 */
const drawSigEmblem = (g: G2D, i: number, x: number, y: number, s: number): void => {
  g.save()
  g.lineJoin = 'round'
  g.lineCap = 'round'
  g.lineWidth = Math.max(2.5, s * 0.09)
  g.strokeStyle = '#3A2340'
  if (i === 0) {
    const P3: readonly (readonly [number, number])[] = [[-0.42, 0.62], [0, 1], [0.42, 0.7]]
    for (const [dx, h] of P3) {
      const px = x + dx * s
      g.beginPath()
      g.moveTo(px - s * 0.2, y + s * 0.5)
      g.lineTo(px - s * 0.2, y + s * 0.5 - h * s * 0.8)
      g.lineTo(px, y + s * 0.5 - h * s)
      g.lineTo(px + s * 0.2, y + s * 0.5 - h * s * 0.8)
      g.lineTo(px + s * 0.2, y + s * 0.5)
      g.closePath()
      g.fillStyle = '#c9a2ff'
      g.fill()
      g.stroke()
    }
  } else {
    g.strokeStyle = '#ffffff'
    g.lineWidth = Math.max(4, s * 0.16)
    for (let k = 0; k < 2; k++) {
      g.beginPath()
      for (let j = 0; j < 3; j++) {
        const a = (j * PI) / 3
        g.moveTo(x - cos(a) * s * 0.6, y - sin(a) * s * 0.6)
        g.lineTo(x + cos(a) * s * 0.6, y + sin(a) * s * 0.6)
        for (const sg of [-1, 1]) {
          const bx = x + sg * cos(a) * s * 0.36
          const by = y + sg * sin(a) * s * 0.36
          g.moveTo(bx, by)
          g.lineTo(bx + sg * cos(a + 0.8) * s * 0.18, by + sg * sin(a + 0.8) * s * 0.18)
          g.moveTo(bx, by)
          g.lineTo(bx + sg * cos(a - 0.8) * s * 0.18, by + sg * sin(a - 0.8) * s * 0.18)
        }
      }
      g.stroke()
      g.strokeStyle = '#7fd4ff'
      g.lineWidth = Math.max(2, s * 0.07)
    }
  }
  g.restore()
}

/** The new rune writing itself over the sector, on a warm glow. */
const drawRuneReveal = (g: G2D): void => {
  if (revealSig >= 0) {
    drawSignatureReveal(g)
    return
  }
  if (revealRune < 0) return
  const [cx, cy, r] = runeFrame()
  const f = ease(clamp(revealT / T_RUNE_TRACE, 0, 1))
  const out = clamp((revealT - T_RUNE_TRACE - T_RUNE_HOLD) / T_RUNE_FADE, 0, 1)
  const a = clamp(revealT / 0.2, 0, 1) * (1 - out)
  if (a <= 0) return
  // It swells a touch as it is read, and again as it melts into the page.
  const pop = revealT > T_RUNE_TRACE ? 1 + 0.08 * sin(clamp((revealT - T_RUNE_TRACE) / 0.3, 0, 1) * PI) : 1
  const rr = r * pop * (1 + 0.1 * out)
  g.save()
  g.globalAlpha = a * 0.9
  const halo = g.createRadialGradient(cx, cy, r * 0.15, cx, cy, r * 1.7)
  halo.addColorStop(0, 'rgba(255, 248, 222, 0.95)')
  halo.addColorStop(1, 'rgba(255, 248, 222, 0)')
  g.fillStyle = halo
  g.fillRect(cx - r * 1.7, cy - r * 1.7, r * 3.4, r * 3.4)
  g.restore()
  // The whole glyph, faint, so the eye knows where the stroke is going.
  drawGlyph(g, revealRune, cx, cy, rr, a * 0.16, 1)
  drawGlyph(g, revealRune, cx, cy, rr, a, f)
}

/** A Signature Spell's recipe writing itself, rune by rune, then its emblem. */
const drawSignatureReveal = (g: G2D): void => {
  const [cx, cy, r] = runeFrame()
  const out = clamp((revealT - T_RUNE_TRACE - T_RUNE_HOLD) / T_RUNE_FADE, 0, 1)
  const a = clamp(revealT / 0.2, 0, 1) * (1 - out)
  if (a <= 0) return
  g.save()
  g.globalAlpha = a * 0.9
  const halo = g.createRadialGradient(cx, cy, r * 0.15, cx, cy, r * 1.9)
  halo.addColorStop(0, 'rgba(255, 248, 222, 0.95)')
  halo.addColorStop(1, 'rgba(255, 248, 222, 0)')
  g.fillStyle = halo
  g.fillRect(cx - r * 1.9, cy - r * 1.9, r * 3.8, r * 3.8)
  g.restore()
  const recipe = SIG_RECIPE[revealSig]!
  const per = T_RUNE_TRACE / 3
  for (let i = 0; i < 3; i++) {
    const [gx, gy, gr] = recipeSlot(i)
    const f = ease(clamp((revealT - i * per) / per, 0, 1))
    drawGlyph(g, recipe[i]!, gx, gy, gr, a * 0.16, 1)
    if (f > 0) drawGlyph(g, recipe[i]!, gx, gy, gr, a, f)
  }
  // The emblem blooms in as the last glyph lands.
  const e = clamp((revealT - T_RUNE_TRACE) / 0.3, 0, 1)
  if (e > 0) {
    g.save()
    g.globalAlpha = a * e
    drawSigEmblem(g, revealSig, cx, cy + r * 0.62, r * 0.36 * (0.7 + 0.3 * ease(e)))
    g.restore()
  }
}

/**
 * The Sunbeam on the page (clipped to the sector): while AIMING, a soft band
 * shows exactly what the light will clear, with a dotted centre line; while
 * it TRAVELS, the band of light itself, hot at the head and cooling behind;
 * as it gathers again, the band fades out.
 */
const drawBeam = (g: G2D, k: number): void => {
  if (!beam) return
  const [ox, oy] = toCss(beam.ox, beam.oy)
  const w = BEAM_W * k
  g.save()
  g.lineCap = 'round'
  if (beam.state === 'aiming') {
    if (beam.pull < 0.05) {
      g.restore()
      return
    }
    const [ex, ey] = toCss(...beam.guideEnd())
    const a = clamp(beam.pull / 0.3, 0, 1)
    g.globalAlpha = 0.22 * a
    g.beginPath()
    g.moveTo(ox, oy)
    g.lineTo(ex, ey)
    g.lineWidth = w
    g.strokeStyle = '#fff2b8'
    g.stroke()
    g.globalAlpha = 0.85 * a
    g.setLineDash([2, 14])
    g.lineDashOffset = -S.t * 40
    g.lineWidth = Math.max(4, w * 0.12)
    g.strokeStyle = '#fff8dc'
    g.stroke()
    g.setLineDash([])
  } else if (beam.state === 'firing' || (beam.state === 'recharge' && beam.wait > BEAM_RECHARGE - 0.3)) {
    const [hx, hy] = toCss(...beam.head())
    const fade = beam.state === 'firing' ? 1 : (beam.wait - (BEAM_RECHARGE - 0.3)) / 0.3
    const gr = g.createLinearGradient(ox, oy, hx, hy)
    gr.addColorStop(0, 'rgba(255, 236, 160, 0.05)')
    gr.addColorStop(0.7, 'rgba(255, 240, 180, 0.45)')
    gr.addColorStop(1, 'rgba(255, 250, 220, 0.8)')
    g.globalAlpha = fade
    g.beginPath()
    g.moveTo(ox, oy)
    g.lineTo(hx, hy)
    g.lineWidth = w * 1.1
    g.strokeStyle = gr
    g.stroke()
    g.lineWidth = w * 0.36
    g.strokeStyle = 'rgba(255, 255, 245, 0.85)'
    g.stroke()
    if (beam.state === 'firing') {
      const head = g.createRadialGradient(hx, hy, 0, hx, hy, w * 0.8)
      head.addColorStop(0, 'rgba(255, 255, 255, 1)')
      head.addColorStop(1, 'rgba(255, 244, 190, 0)')
      g.fillStyle = head
      g.fillRect(hx - w * 0.8, hy - w * 0.8, w * 1.6, w * 1.6)
    }
  }
  g.restore()
}

/** The slingshot's band, from the sun back to the finger pulling it. */
const drawSling = (g: G2D): void => {
  if (!beam) return
  const pull = beam.pull
  g.save()
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(toolX, toolY)
  g.lineTo(touchX, touchY)
  g.lineWidth = 7 - pull * 3
  g.strokeStyle = '#3A2340'
  g.stroke()
  g.lineWidth = 4 - pull * 2
  g.strokeStyle = pull >= 0.15 ? '#ffd36b' : '#c9b48a'
  g.stroke()
  g.beginPath()
  g.arc(touchX, touchY, 9, 0, TAU)
  g.fillStyle = '#fff4d6'
  g.fill()
  g.lineWidth = 2.5
  g.strokeStyle = '#3A2340'
  g.stroke()
  g.restore()
}

const drawPaintFlight = (g: G2D): void => {
  const k = clamp(phaseT / T_PAINT, 0, 1)
  const [lx, ly] = toCss(sec.landmark.x, sec.landmark.y)
  const [fx, fy] = paintFrom
  const e = ease(k)
  const x = lerp(fx, lx, e)
  const y = lerp(fy, ly, e) - sin(k * PI) * 90
  const r = 12 + 6 * sin(k * PI)
  g.beginPath()
  g.arc(x, y, r, 0, TAU)
  g.fillStyle = sec.pots[pot]!.base
  g.fill()
  g.lineWidth = 3
  g.strokeStyle = '#3A2340'
  g.stroke()
  g.beginPath()
  g.arc(x - r * 0.3, y - r * 0.3, r * 0.3, 0, TAU)
  g.fillStyle = 'rgba(255,255,255,0.8)'
  g.fill()
}

/** The brush's footprint while it touches: a soft ring at its core radius. */
const drawCursor = (g: G2D): void => {
  if (!brush) return
  g.beginPath()
  g.arc(touchX, touchY, brush.size.core, 0, TAU)
  g.lineWidth = 2
  g.strokeStyle = 'rgba(255,255,255,0.55)'
  g.setLineDash([6, 6])
  g.stroke()
  g.setLineDash([])
}

/** The wave's radius now, SU: out fast, settling at the far corner. */
const waveRadius = (): number => waveMax * (1 - (1 - clamp(phaseT / tWave, 0, 1)) ** 3)

/** The wave's front: a soft light band, white-hot for its first ~120 ms
 *  (the duel's impact-frame convention, §8.6 step 3). It also hides the
 *  clip's hard edge. */
const drawWaveFront = (g: G2D, v: Box, k: number): void => {
  const r = waveRadius() * k
  const hot = clamp(1 - phaseT / 0.12, 0, 1)
  const cx = v.x + waveX * k
  const cy = v.y + waveY * k
  const w = Math.max(10, 40 * k)
  g.save()
  g.beginPath()
  g.rect(v.x, v.y, v.w, v.h)
  g.clip()
  g.beginPath()
  g.arc(cx, cy, Math.max(1, r), 0, TAU)
  g.lineWidth = w * (1 + hot)
  g.strokeStyle = `rgba(255,250,235,${0.3 + 0.5 * hot})`
  g.stroke()
  g.lineWidth = w * 0.35
  g.strokeStyle = `rgba(255,255,255,${0.55 + 0.45 * hot})`
  g.stroke()
  g.restore()
}

/* ---------------------------------------------------------------- perf */

/** The worst frame seen, and the phase it happened in — a spike needs a
 *  cause, not just a number. */
let worst = { ms: 0, phase: 'idle' as RestorePhase }
const sample = (ms: number): void => {
  PERF[perfN++ % PERF.length] = ms
  if (ms > worst.ms) worst = { ms, phase }
}

/** The mask + dust cost per frame over the last ~4 s: avg / p95 / max, ms. */
export const restorePerf = (): { avg: number; p95: number; max: number; n: number; worst: { ms: number; phase: RestorePhase } } => {
  const n = Math.min(perfN, PERF.length)
  if (!n) return { avg: 0, p95: 0, max: 0, n: 0, worst }
  const a = Array.from(PERF.subarray(0, n)).sort((x, y) => x - y)
  return { avg: a.reduce((s, x) => s + x, 0) / n, p95: a[Math.floor(n * 0.95)] ?? 0, max: a[n - 1] ?? 0, n, worst }
}

/* ----------------------------------------------------------------- QA */

export const qaWipe = {
  /** Jump the in-progress sector to done through the real reveal path. */
  complete: (): void => {
    if (phase !== 'wipe') return
    forcedReveal = true
    coverage = 1
    startReveal()
  },
  coverage: (): number => coverage01(cov),
  phase: (): RestorePhase => phase,
  perf: restorePerf,
  /** Drop sector `n`'s progress (done bit, pick, coverage) for a replay. */
  reset: (n = 0): void => {
    S.campaign.sectorsDone = setBit(S.campaign.sectorsDone, n, false)
    S.campaign.paintPicks = setPaintPick(S.campaign.paintPicks, n, 0)
    S.campaign.wipeCoverage = null
    S.campaign.wipeHalf = null
    if (S.campaign.furthestNode >= n) S.campaign.furthestNode = n - 1
    save()
  },
  isDone: (n = 0): boolean => hasBit(S.campaign.sectorsDone, n),
  /** Paint (brush) a straight stroke in CSS px, sample by sample — for
   *  harnesses that cannot drive real touches. */
  stroke: (pts: number[], t0 = performance.now(), dtMs = 16): void => {
    restorePointerDown(pts[0]!, pts[1]!, t0)
    for (let i = 2; i < pts.length; i += 2) {
      restorePointerMove(pts[i]!, pts[i + 1]!, t0 + (i / 2) * dtMs)
      if (i % 4 === 0) stepWipe(dtMs / 1000, t0 + (i / 2) * dtMs)
    }
    restorePointerUp()
  },
  frame: (): Box => view(),
  /** The Sunbeam: press at (x0, y0), pull back to (x1, y1), let go — CSS px. */
  shoot: (x0: number, y0: number, x1: number, y1: number): boolean => {
    if (!beam || phase !== 'wipe') return false
    restorePointerDown(x0, y0, performance.now())
    restorePointerMove(x1, y1, performance.now())
    const fired = beam.state === 'aiming' && beam.pull >= 0.15
    restorePointerUp()
    return fired
  },
  beamState: (): string => beam?.state ?? 'none',
  rescue: (): { cells: number; cover: number; found: boolean; byHand: boolean } =>
    ({ cells: rescueCells.length, cover: rescueCells.length ? rescueCover() : 0, found: rescueT >= 0, byHand: rescueByHand }),
  beam: (): Record<string, number | string> | null =>
    beam ? { state: beam.state, ox: beam.ox, oy: beam.oy, dx: beam.dx, dy: beam.dy, len: beam.len, at: beam.at, pull: beam.pull, max: beam.maxPull } : null,
  sweeps: (): number => beam?.sweeps ?? 0
}
