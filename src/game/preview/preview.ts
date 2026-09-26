/**
 * preview.ts — the duel VS preview: five seconds in front of every duel,
 * after the two duelists are chosen and before the first rune (owner,
 * 2026-09-25; the build contract is `duel-preview-contract.md`).
 *
 * Both of them slide in onto their podiums facing each other, their names
 * unfurl on ribbons, the VS emblem slams down with the fanfare's hit, the
 * powers pop in (every rune she can draw in THIS duel; the foe's weakness and
 * magic), three little stars count down, and the whole page blooms into warm
 * light that fades off the duel's first frame. The same shape as a
 * Brawl-Stars "partners" screen, in the storybook's own voice.
 *
 * THIS FILE is the scene's clock, its timeline, its layout and its hand-off.
 * The canvas half is `previewDraw.ts`, the DOM half (ribbons, names, powers,
 * the VS emblem, the stars, the flash) is `components/preview/*`, and the two
 * meet only in `previewHud.ts`.
 *
 * THE CLOCK, `pt`, is the time the VS screen has been ON SCREEN. It runs while
 * the scene is `preview` and the game is not paused, from the very first frame
 * the preview shows — the first frame of the page turn into it, because a turn
 * switches the scene at once and swings the old page away over the new one.
 * The owner timed the first version by eye: 8 s for a session's first preview,
 * 6 s after. Three things added up to that: the clock waited for the turn to
 * finish; it then waited (up to 1.2 s, on a blank page) for the duelists'
 * paintings to be warm; and it advanced by the frame loop's step, which is
 * clamped at 0.25 s, so every stutter made the show LONGER in real time. So
 * now the turn is inside the five seconds, nothing waits (the duelists are
 * warmed ahead, `warmDuelists`), and the clock takes the real frame time,
 * capped only at `STEP_CAP` for a tab that comes back from the background. An
 * ad, a hidden tab or a menu still freezes it exactly where it stood. The
 * first frame fires the announcement and ducks the music; `then()` runs on
 * the frame that reaches `HANDOFF_AT`, so that the duel's own start-up frame
 * lands under the full flash and the duel is up at `PT_TOTAL`. Every threshold
 * is a pure function of `pt` (`beatAt`, the easings below), so the tests can
 * pin the whole show without a canvas.
 *
 * WHERE THE DUEL IS SET UP. Not here, and not before the preview: the caller
 * hands its whole old start (`resetDuel`, the theme, the duel page, the lesson
 * and director clocks) over as `then`. Nothing of the next duel exists while
 * the preview plays, so nothing of it can tick under it — the sim is stepped
 * only in the `duel` scene anyway, but a lesson or a help ghost armed early
 * would still have been one more thing to prove idle.
 *
 * A STALE `then` NEVER RUNS. Each begin bumps a generation, and `then` runs
 * only for the preview that is still current AND still on screen. Whatever
 * takes the scene away mid-preview (a harness jump, a queued page turn)
 * cancels it; a second begin replaces it.
 *
 * SKIP — the one addition to the owner's "exactly five seconds", flagged to
 * him: never on the session's FIRST preview (that one is the fanfare a new
 * player is meant to see); on any later one, from `pt` 1.0 a tap anywhere,
 * Space or Enter jumps to the exit, which still plays (0.45 s).
 *
 * THE LAYOUT is one function (`computePreviewLayout`) for both orientations.
 * The canvas draws from it and the DOM places itself by it, in CSS px; the
 * DOM's own sizes are the `PREVIEW_DOM` ratios of `lay.u`, and
 * `tests/preview/layout.test.ts` proves nothing overlaps at five reference
 * screens with exactly those ratios.
 */
import { S } from '@/game/duel/state'
import { FOES, VERSUS_FOE } from '@/game/duel/foes'
import { duelSetup, nodeChapter, nodePosInChapter, STARTING_RUNES } from '@/game/campaign/tables'
import { gotoScene } from '@/game/flow/scene'
import { isGamePaused } from '@/use/useGamePause'
import { reducedMotion } from '@/use/useAccessibility'
import { sfx, duckMusic } from '@/game/duel/audio'
import { track } from '@/use/useAnalytics'
import { readInsets, type Insets } from '@/game/duel/layout'
import {
  previewHud, type PreviewBeat, type PreviewChip, type PreviewLayout, type PreviewSide
} from '@/game/preview/previewHud'
import { SEAM_LAND, SEAM_PORT } from '@/game/preview/previewArt'
import { warmPuppet } from '@/game/duel/puppet'
import { equippedHooks } from '@/game/cosmetics/rig-cosmetics'

/* ─────────────────────────────── the timeline ──────────────────────────── */

/** The VS screen on screen, its first frame to the duel's (owner: exactly 5). */
export const PT_TOTAL = 5.0
/**
 * How long before `PT_TOTAL` the duel is handed over. The duel's own start —
 * its page bake, its HUD mounting — is one frame of ~0.1–0.15 s on a desktop
 * (more on a phone), and it cannot be sliced. Started AT five seconds it ran
 * after them, on a frozen cream screen, and the owner's stopwatch counted it.
 * Started this much earlier, it runs under the flash that has already reached
 * full cream (`flashAt` peaks here), inside the five seconds.
 */
export const HANDOFF_LEAD = 0.15
/** The hand-off: `then()` runs on the first frame that reaches it. */
export const HANDOFF_AT = PT_TOTAL - HANDOFF_LEAD
/** A later preview may be skipped from here… */
export const SKIP_FROM = 1.0
/** …straight to the exit, which still plays (0.3 s to the hand-off). */
export const SKIP_TO = 4.55
/** The exit flash's fade over the duel's first frames, seconds — short: the
 *  owner times the preview to when the duel is on screen. */
export const AFTER_FADE = 0.25
/** The flash's peak; softer under reduced motion (no strobe, contract §perf). */
export const FLASH_PEAK = 1
export const FLASH_PEAK_REDUCED = 0.7

/** Each beat and the `pt` it starts at, in order. `done` is the hand-off. */
export const BEATS: readonly (readonly [PreviewBeat, number])[] = [
  ['enter', 0],
  ['ribbons', 0.5],
  ['vs', 0.9],
  ['powers', 1.1],
  ['hold', 2.0],
  ['count1', 2.8],
  ['count2', 3.5],
  ['count3', 4.2],
  ['go', 4.45],
  ['exit', SKIP_TO],
  ['done', HANDOFF_AT]
]

/** The three count beats' `pt`, in order (`sfx('vsTick', i)`). */
export const COUNT_AT: readonly number[] = [2.8, 3.5, 4.2]
/** The stars burst (`sfx('vsGo')`). */
export const GO_AT = 4.45
/** The VS slam: the fanfare's main hit lands here (the cue's impact is at +0.90). */
export const VS_AT = 0.9
/** Where each duelist lands on her mark (the slide ends). */
export const HERO_LAND = 0.55
export const FOE_LAND = 0.65
/** The show-off rears: Aurora's, then the foe's (0.6 s each). */
export const HERO_SHOW = 2.3
export const FOE_SHOW = 2.9
export const SHOW_LEN = 0.6

/** Float slack: 300 frames of 1/60 s must land on 5.0, not 4.9999999. */
const EPS = 1e-6

/** The beat `pt` is in. */
export const beatAt = (pt: number): PreviewBeat => {
  let b: PreviewBeat = 'enter'
  for (const [id, at] of BEATS) if (pt + EPS >= at) b = id
  return b
}
const beatIndex = (pt: number): number => {
  let k = 0
  for (let i = 0; i < BEATS.length; i++) if (pt + EPS >= BEATS[i]![1]) k = i
  return k
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v)
export const easeOutCubic = (k: number): number => 1 - (1 - clamp01(k)) ** 3
/** A slide that overshoots its mark a little and settles back — a landing. */
export const easeOutBack = (k: number): number => {
  const x = clamp01(k)
  const c1 = 1.55
  const c3 = c1 + 1
  return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2
}
const smooth = (k: number): number => {
  const x = clamp01(k)
  return x * x * (3 - 2 * x)
}

/** The two halves sweeping in from the sides, 0..1 (0–0.40 s). */
export const halvesIn = (pt: number): number => easeOutCubic(pt / 0.4)
/** Aurora's slide from off-left to her mark (0.10–0.55 s). */
export const heroIn = (pt: number): number => easeOutBack((pt - 0.1) / (HERO_LAND - 0.1))
/** The foe's, from off-right (0.20–0.65 s). */
export const foeIn = (pt: number): number => easeOutBack((pt - 0.2) / (FOE_LAND - 0.2))
/** The little hop on landing, 0..1 (a quarter second). */
export const hopAt = (pt: number, land: number): number => {
  const k = (pt - land) / 0.26
  return k > 0 && k < 1 ? Math.sin(Math.PI * k) : 0
}
/** A show-off rear (`PoseState.cast`), 0..1 and back over `SHOW_LEN`. */
export const showAt = (pt: number, at: number): number => {
  const k = (pt - at) / SHOW_LEN
  return k > 0 && k < 1 ? Math.sin(Math.PI * k) ** 2 : 0
}
/** How far into the exit, 0..1 (4.55–5.00). */
export const exitK = (pt: number): number => clamp01((pt - SKIP_TO) / (HANDOFF_AT - SKIP_TO))
/** The exit's cream-gold flash, 0 → peak. */
export const flashAt = (pt: number, reduced = false): number =>
  (reduced ? FLASH_PEAK_REDUCED : FLASH_PEAK) * smooth(exitK(pt))
/** The flash after the hand-off, `t` seconds into the duel: peak → 0. */
export const afterFlash = (t: number, reduced = false): number =>
  (reduced ? FLASH_PEAK_REDUCED : FLASH_PEAK) * (1 - smooth(t / AFTER_FADE))
/** The exit's zoom on the whole composition, 1 → 1.06, about the VS. */
export const zoomAt = (pt: number): number => 1 + 0.06 * smooth(exitK(pt))
/** The VS micro-shake, CSS px (≤ 6; none under reduced motion). */
export const shakeAt = (pt: number, reduced = false): number => {
  if (reduced) return 0
  const k = (pt - VS_AT) / 0.2
  return k > 0 && k < 1 ? 6 * (1 - k) * Math.sin(k * 38) : 0
}

/* ──────────────────────────────── the content ──────────────────────────── */

/** The rune ids set in a mask, in rune order. */
export const runesOfMask = (mask: number): number[] => {
  const out: number[] = []
  for (let k = 0; k < 12; k++) if ((mask >>> k) & 1) out.push(k)
  return out
}

/**
 * Every rune the player can DRAW in a duel: the two she starts with plus
 * every one a chest has given her — the same mask the sim recognises strokes
 * against (`sim.ts`, the `active` mask). In versus both players share the
 * save, so both hold exactly this kit.
 */
export const drawableMask = (runesUnlocked: number): number => (runesUnlocked | STARTING_RUNES) >>> 0

/** Everything the preview shows about one duel — built once, at begin. */
export interface PreviewSpec {
  mode: 'campaign' | 'versus'
  /** The node (−1 in versus). */
  node: number
  /** Index into `FOES`: who stands on the right. */
  foe: number
  chapter: number
  pos: number
  hero: PreviewSide
  foeSide: PreviewSide
}

/** Node `n`'s preview, for a save holding `runesUnlocked`. Pure. */
export const campaignSpec = (n: number, runesUnlocked: number): PreviewSpec => {
  const setup = duelSetup(n)
  const def = setup.def
  const ch = nodeChapter(n)
  // Umbra is Umbra wherever she stands — node 0 and the Festival's boss; a
  // chapter's Guardian is named for her place; everyone else is a shadow.
  const epithet = def.slug === 'umbra' ? 'preview.epithet.umbra' : def.boss ? 'preview.epithet.guardian' : 'preview.epithet.shadow'
  const chips: PreviewChip[] = []
  if (def.element >= 0) chips.push({ kind: 'weak', rune: def.element })
  if (setup.usesMagic && def.magic >= 0) chips.push({ kind: 'magic', rune: def.magic })
  return {
    mode: 'campaign',
    node: n,
    foe: setup.foe,
    chapter: ch,
    pos: nodePosInChapter(n),
    hero: {
      name: 'duelist.aurora',
      epithet: 'preview.epithet.aurora',
      runes: runesOfMask(drawableMask(runesUnlocked)),
      chips: [],
      boss: false,
      tint: ''
    },
    foeSide: {
      name: `duelist.${def.slug}`,
      epithet,
      ...(epithet === 'preview.epithet.guardian' ? { epithetArgs: { place: `chapter.c${ch + 1}` } } : {}),
      runes: [],
      chips,
      boss: def.boss,
      tint: def.pal[8]
    }
  }
}

/** Local versus: Aurora (player 1) and the befriended Umbra (player 2). */
export const versusSpec = (runesUnlocked: number): PreviewSpec => {
  const runes = runesOfMask(drawableMask(runesUnlocked))
  const def = FOES[VERSUS_FOE]!
  return {
    mode: 'versus',
    node: -1,
    foe: VERSUS_FOE,
    chapter: 9,
    pos: 0,
    hero: { name: 'duelist.aurora', epithet: 'versus.player1', runes, chips: [], boss: false, tint: '' },
    foeSide: { name: 'duelist.umbra', epithet: 'versus.player2', runes: [...runes], chips: [], boss: false, tint: def.pal[8] }
  }
}

/* ──────────────────────────────── the layout ───────────────────────────── */

/**
 * The rig's box in its own stage units, facing +x (Aurora), hooves at the
 * origin — the STANDING pose, with a little room for the breathing and the
 * tail's sway. Re-measured for the painted CHIBI rig (2026-09-25, by the
 * painted-rig session, alpha > 24 over t 1..2.2). Round 5, the three-quarter
 * head with both eyes on the opponent: standing Aurora back 82, front 96, up
 * 205, down 4; Umbra 80 / 99 / 204 / 4 — the muzzle now comes further out of
 * the head than round 4's 91, so `x1` grew 94 → 100 (the drawn rig: 70 / 66 /
 * 191 / 4). A full cast rear reaches up 252 / back 106, which is why the
 * show-off is a half rear (`previewDraw.ts` `SHOW_REAR`). Re-measure when the
 * rig changes shape.
 */
export const RIG_BOX = { x0: -88, x1: 100, up: 206, down: 6 } as const
/** The rig's nominal height, hooves → horn tip (`chars.RIG_HEIGHT`). */
const RIG_H = 197
/** Its visual centre, left of the hooves by this (the tail is longer than the nose). */
const RIG_MID = (RIG_BOX.x0 + RIG_BOX.x1) / 2
/** The podium under her, in the same units: its half width either side of her
 *  visual centre, its top a whisker above the hooves, its underside below. */
export const PODIUM_BOX = { half: 102, top: -10, depth: 46 } as const
/** Where the barrel sits over the hooves — the VS aims for the bodies' height. */
const BODY_Y = 89

/**
 * The DOM's sizes, as multiples of `lay.u` — what the layout RESERVES for
 * each piece, and so the most the DOM may draw it at. The DOM agent matches
 * these; `tests/preview/layout.test.ts` checks the layout against them.
 */
export const PREVIEW_DOM = {
  /** Screen edge → anything (plus the safe-area inset). */
  margin: 0.03,
  /** Between two neighbours. */
  gap: 0.016,
  /** The chapter banner's height. */
  bannerH: 0.075,
  /** A ribbon's height, tails included. */
  ribbonH: 0.12,
  /** How far a boss's crown pokes up above her ribbon. */
  crownPoke: 0.07,
  /** The VS emblem's radius (`lay.vs.r`). */
  vsR: 0.1,
  /** The countdown stars' row under the emblem: its gap, height and width. */
  starsGap: 0.02,
  starsH: 0.05,
  starsW: 0.26,
  /** The powers block: the epithet line, the caption line, the rune icons
   *  (shrunk to fit the block's `w`), and a chip row (the foe's). */
  epithetH: 0.05,
  captionH: 0.034,
  runeIcon: 0.08,
  runeGap: 0.014,
  chipH: 0.07,
  lineGap: 0.01,
  /** The skip glyph's radius (`lay.skip.r`). */
  skipR: 0.045
} as const

const D = PREVIEW_DOM

/** The DOM's unit: the short side, but never more than 0.56 of the long one
 *  (0.5 upright, where the whole show is stacked) — a square-ish tablet must
 *  not blow the chrome up to the size of the rigs. */
export const previewUnit = (w: number, h: number): number =>
  Math.min(w, h, (h > w ? 0.5 : 0.56) * Math.max(w, h))

/** The tallest a powers block may be: an epithet, a caption and a row of icons. */
export const powersHeight = (u: number): number =>
  u * (D.epithetH + D.lineGap + D.captionH + D.lineGap + D.runeIcon)

export { SEAM_LAND, SEAM_PORT }

const seamOf = (w: number, h: number, portrait: boolean): PreviewLayout['seam'] => {
  const n = portrait ? SEAM_PORT : SEAM_LAND
  const dx = n.dx * w
  const dy = n.dy * h
  const l = Math.hypot(dx, dy) || 1
  return { x: n.cx * w, y: n.cy * h, dx: dx / l, dy: dy / l }
}

const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 }

/**
 * THE layout, CSS px, for a `w` × `h` screen with its safe-area insets.
 * Pure. Landscape: Aurora left, the foe right, the VS between them and the
 * banner at the top between the two ribbons. Portrait: the foe top-right with
 * her powers beside her, the VS in the middle, Aurora bottom-left with her
 * runes along the foot.
 */
export const computePreviewLayout = (w: number, h: number, ins: Insets = NO_INSETS): PreviewLayout => {
  const portrait = h >= w
  const u = previewUnit(w, h)
  const mT = ins.top + D.margin * u
  const mB = ins.bottom + D.margin * u
  const mL = ins.left + D.margin * u
  const mR = ins.right + D.margin * u
  const g = D.gap * u
  const seam = seamOf(w, h, portrait)
  const vs = { x: seam.x, y: seam.y, r: D.vsR * u }
  const ribH = D.ribbonH * u
  const powH = powersHeight(u)
  const skipR = D.skipR * u
  const tall = RIG_BOX.up + PODIUM_BOX.depth
  // The biggest the rigs may be: 40–45 % of the height in landscape.
  const sMax = (0.44 * h) / RIG_H
  return portrait
    ? portraitLayout(w, h, u, mT, mB, mL, mR, g, seam, vs, ribH, skipR, tall, sMax)
    : landscapeLayout(w, h, u, mT, mB, mL, mR, g, seam, vs, ribH, powH, skipR, tall, sMax)
}

type Vs = PreviewLayout['vs']
type Seam = PreviewLayout['seam']

const landscapeLayout = (
  w: number, h: number, u: number, mT: number, mB: number, mL: number, mR: number, g: number,
  seam: Seam, vs: Vs, ribH: number, powH: number, skipR: number, tall: number, sMax: number
): PreviewLayout => {
  // Each duelist is centred in the room between her screen edge and the VS.
  const hcx = (mL + vs.x - vs.r * 0.5) / 2
  const fcx = (vs.x + vs.r * 0.5 + w - mR) / 2
  // Her podium is the widest thing she brings: it must clear the edge and the VS.
  const sW = Math.min(hcx - mL, vs.x - vs.r - g - hcx, w - mR - fcx, fcx - (vs.x + vs.r + g)) / PODIUM_BOX.half
  // The ribbons share the banner's band when the banner still gets a fair
  // width between them; a squarer screen stacks them under it instead.
  const ribW = Math.min(2 * (hcx - mL), 0.26 * w)
  const between = fcx - hcx - ribW - 2 * g
  const stacked = between < 0.18 * w
  const bannerW = stacked ? Math.min(0.5 * w, w - 2 * (mR + 2 * skipR + g)) : Math.min(between, 0.34 * w)
  const bandTop = stacked ? mT + D.bannerH * u + g + D.crownPoke * u : mT + D.crownPoke * u
  const powTop = h - mB - powH
  const bandBottom = powTop - g
  const sV = (bandBottom - bandTop - ribH - g) / tall
  const s = Math.max(0.2, Math.min(sV, sW, sMax))
  // Aim the bodies at the VS's height, inside the band.
  const lo = bandTop + ribH + g + RIG_BOX.up * s
  const hi = bandBottom - PODIUM_BOX.depth * s
  const hoof = Math.min(hi, Math.max(lo, vs.y + BODY_Y * s))
  const horn = hoof - RIG_H * s
  const ribY = hoof - RIG_BOX.up * s - g - ribH / 2
  const powW = 2 * Math.min(hcx - mL, vs.x - g / 2 - hcx)
  return {
    w, h, portrait: false,
    hero: { x: hcx - RIG_MID * s, y: hoof, head: horn },
    foe: { x: fcx + RIG_MID * s, y: hoof, head: horn },
    heroRibbon: { x: hcx, y: ribY, w: ribW },
    foeRibbon: { x: fcx, y: ribY, w: ribW },
    heroPowers: { x: hcx, y: powTop, w: powW, h: powH, align: 'center' },
    foePowers: { x: fcx, y: powTop, w: powW, h: powH, align: 'center' },
    vs,
    banner: { x: w / 2, y: mT + (D.bannerH * u) / 2, w: bannerW },
    scale: s,
    u,
    seam,
    skip: { x: w - mR - skipR, y: mT + skipR, r: skipR }
  }
}

const portraitLayout = (
  w: number, h: number, u: number, mT: number, mB: number, mL: number, mR: number, g: number,
  seam: Seam, vs: Vs, ribH: number, skipR: number, tall: number, sMax: number
): PreviewLayout => {
  // The foe right of centre, Aurora left of it: the diagonal the seam cuts.
  const fcx = 0.62 * w
  const hcx = 0.38 * w
  const sW = Math.min(w - mR - fcx, hcx - mL) / PODIUM_BOX.half
  const bannerH = D.bannerH * u
  // The foe's band: under the banner, down to the VS.
  const fTop = mT + bannerH + g + D.crownPoke * u
  const fBottom = vs.y - vs.r - g
  // Aurora's: under the countdown stars, down to the foot of the page.
  const hTop = vs.y + vs.r + (D.starsGap + D.starsH) * u + g
  const hBottom = h - mB
  const sF = (fBottom - fTop - ribH - g) / tall
  const sH = (hBottom - hTop - ribH - g) / tall
  const s = Math.max(0.2, Math.min(sF, sH, sW, sMax))
  // Both hug the VS: the slack goes to the outer edges, where there is nothing.
  const fHoof = fBottom - PODIUM_BOX.depth * s
  const hHoof = hTop + ribH + g + RIG_BOX.up * s
  const fRibY = fHoof - RIG_BOX.up * s - g - ribH / 2
  const hRibY = hHoof - RIG_BOX.up * s - g - ribH / 2
  // Each one's powers stand beside her, on the side she FACES — the foe's
  // left of her, Aurora's right of her — under her ribbon and clear of the
  // podium: the diagonal again, mirrored. Anchored at her face, so on a wide
  // tablet they stay hers instead of drifting off to the screen's edge. A
  // long rune row wraps (`h`).
  const reach = (RIG_BOX.x1 - RIG_MID) * s
  const fPowTop = fRibY + ribH / 2 + g
  const hPowTop = hRibY + ribH / 2 + g
  const fPowH = fHoof + PODIUM_BOX.top * s - g - fPowTop
  const hPowH = hHoof + PODIUM_BOX.top * s - g - hPowTop
  const fx = fcx + RIG_MID * s
  const hx = hcx - RIG_MID * s
  return {
    w, h, portrait: true,
    hero: { x: hx, y: hHoof, head: hHoof - RIG_H * s },
    foe: { x: fx, y: fHoof, head: fHoof - RIG_H * s },
    heroRibbon: { x: hcx, y: hRibY, w: Math.min(2 * (hcx - mL), 0.7 * w) },
    foeRibbon: { x: fcx, y: fRibY, w: Math.min(2 * (w - mR - fcx), 0.7 * w) },
    heroPowers: { x: hcx + reach + g, y: hPowTop, w: Math.max(0, w - mR - (hcx + reach + g)), h: hPowH, align: 'start' },
    foePowers: { x: fcx - reach - g, y: fPowTop, w: Math.max(0, fcx - reach - g - mL), h: fPowH, align: 'end' },
    vs,
    banner: { x: w / 2, y: mT + bannerH / 2, w: Math.min(0.7 * w, w - 2 * (mR + 2 * skipR + g)) },
    scale: s,
    u,
    seam,
    skip: { x: w - mR - skipR, y: mT + skipR, r: skipR }
  }
}

/* ─────────────────────────────── the running state ─────────────────────── */

/**
 * The preview in progress, read by `previewDraw.ts` every frame. A plain
 * object (the canvas reads it 60 times a second); the DOM reads `previewHud`.
 */
export const pv = {
  /** The show's clock (see the header). */
  pt: 0,
  /** The picture's own clock: breathing, rays, glitter. Stops while held or
   *  paused, so a frozen frame is frozen all the way through. */
  vt: 0,
  /** Bumps on every begin (and on a cancel): a stale `then` checks it. */
  gen: 0,
  /** Begun and not yet handed over (or cancelled). */
  running: false,
  /** The first running frame has happened (the announcement fired). */
  started: false,
  spec: null as PreviewSpec | null,
  lay: previewHud.lay as PreviewLayout
}

let then: (() => void) | null = null
/** Previews begun this session: the first is never skippable. */
let begun = 0
let first = true
let beatIdx = 0
let skipped = false
/** Seconds the player actually watched (a skip's jump is not watched). */
let watched = 0
/** Seconds since the hand-off while the flash fades over the duel; −1 none. */
let after = -1
/** QA: the `pt` the clock stops at (−1: not held). */
let holdAt = -1

const layoutNow = (): PreviewLayout => {
  const w = S.w || (typeof window !== 'undefined' ? window.innerWidth : 1280)
  const h = S.h || (typeof window !== 'undefined' ? window.innerHeight : 720)
  return computePreviewLayout(w, h, readInsets())
}

/** The screen changed size or turned: lay the preview out again. */
export const previewResize = (): void => {
  if (!pv.running && after < 0 && S.flow.scene !== 'preview') return
  pv.lay = layoutNow()
  previewHud.lay = pv.lay
}

/**
 * The preview of `spec` begins now: the scene switches to `preview` and,
 * `HANDOFF_AT` running seconds later, `then` hands over to the duel. Replaces
 * any preview still running (whose `then` will never run).
 */
export const beginPreview = (spec: PreviewSpec, next: () => void): void => {
  pv.gen++
  pv.spec = spec
  pv.running = true
  pv.started = false
  warmDuelistsOf(spec.foe)
  pv.pt = 0
  pv.vt = 0
  then = next
  first = begun === 0
  begun++
  beatIdx = 0
  skipped = false
  watched = 0
  after = -1
  holdAt = -1
  pv.lay = layoutNow()
  previewHud.lay = pv.lay
  previewHud.mode = spec.mode
  previewHud.chapter = spec.chapter
  previewHud.pos = spec.pos
  previewHud.hero = spec.hero
  previewHud.foe = spec.foeSide
  previewHud.beat = 'enter'
  // Held until the clock's first running frame (`previewFrame`).
  previewHud.paused = true
  previewHud.skippable = false
  previewHud.flash = 0
  previewHud.live = true
  previewHud.gen++
  gotoScene('preview', spec.node, spec.mode)
}

/**
 * THE DUELISTS ARE BAKED BEFORE THE SHOW. A painted duelist's look is baked
 * the first time it is drawn (`puppetBake.ts`); left to the stage, a
 * first-time player's bakes landed in the ENTRANCE — hitches under the
 * fanfare's build-up (measured 2026-09-25). So node `n`'s two looks are baked
 * AHEAD, in idle slices (`puppet.ts` `warmPuppet`: a no-op until a set has
 * decoded, and cheap to repeat), wherever the next duel is known before its
 * page turns — the prologue and a dialogue opening (`nodes.ts`
 * `enterDialogue`), a map tap (`playNode`) — and again at the preview's
 * begin; `previewDraw.ts` also draws each rig once off screen before they
 * enter. Nothing WAITS for any of it: a wait was time on screen the owner
 * counted.
 */
export const warmDuelists = (n: number): void => {
  if (n < 0) return
  warmDuelistsOf(duelSetup(n).foe)
}
const warmDuelistsOf = (foe: number): void => {
  warmPuppet({ ...equippedHooks() }, -1, 0)
  warmPuppet({ foe }, 1, foe)
}

/**
 * The most one frame may add to the clock. The frame loop clamps its own step
 * at 0.25 s, which is right for a sim (a shot must not teleport) and wrong for
 * a show of fixed length: every stutter over a quarter second then made the
 * preview LONGER. A real stutter is well under a second; a longer gap is a tab
 * coming back from the background, and at most this much of it is skipped.
 */
export const STEP_CAP = 1

/** The preview is gone without handing over (its scene was taken away). */
export const cancelPreview = (): void => {
  if (!pv.running) return
  pv.gen++
  pv.running = false
  then = null
  holdAt = -1
  previewHud.live = false
  previewHud.skippable = false
  previewHud.paused = false
  previewHud.flash = 0
  after = -1
}

/** Write the beat (and what hangs off it) when `pt` crosses a threshold. */
const syncBeat = (): void => {
  const k = beatIndex(pv.pt)
  if (k !== beatIdx) {
    beatIdx = k
    previewHud.beat = BEATS[k]![0]
  }
  const sk = !first && pv.running && pv.pt + EPS >= SKIP_FROM && pv.pt < SKIP_TO - EPS
  if (sk !== previewHud.skippable) previewHud.skippable = sk
}

/** The cues between two clock readings (each fires once, on its threshold). */
const cues = (a: number, b: number): void => {
  for (let i = 0; i < COUNT_AT.length; i++) {
    const at = COUNT_AT[i]!
    if (a + EPS < at && b + EPS >= at) sfx('vsTick', i)
  }
  if (a + EPS < GO_AT && b + EPS >= GO_AT) sfx('vsGo')
}

/** The hand-off: the duel begins (once, and only for the current preview). */
const done = (flash: boolean): void => {
  const my = pv.gen
  const spec = pv.spec
  pv.pt = HANDOFF_AT
  pv.running = false
  holdAt = -1
  syncBeat()
  previewHud.beat = 'done'
  previewHud.live = false
  previewHud.skippable = false
  previewHud.paused = false
  after = flash ? 0 : -1
  previewHud.flash = flash ? afterFlash(0, reducedMotion.value) : 0
  track('duel_preview', {
    nodeId: spec?.node ?? -1, mode: spec?.mode ?? 'campaign', skipped, shownMs: Math.round(watched * 1000)
  })
  const fn = then
  then = null
  // Whatever took the scene away got here first: nothing to hand over to.
  if (my !== pv.gen || S.flow.scene !== 'preview') return
  fn?.()
}

/**
 * One frame of the clock, with the REAL frame time (the loop passes its
 * unclamped step; see `STEP_CAP`). Called by the frame loop in the unpaused
 * branch while the scene is `preview`; it checks every running condition
 * itself, so a paused frame (or a stray call) never advances anything. A page
 * turn does NOT stop it: the turn into the preview is the preview on screen.
 */
export const updatePreview = (frameDt: number): void => {
  if (!pv.running || S.flow.scene !== 'preview' || isGamePaused.value) return
  if (!pv.started) {
    // The first frame on screen: the announcement, over ducked music.
    pv.started = true
    sfx('duelCall')
    duckMusic(2.2)
    syncBeat()
    return
  }
  if (holdAt >= 0 && pv.pt >= holdAt - EPS) return
  const dt = Math.min(Math.max(frameDt, 0), STEP_CAP)
  const a = pv.pt
  let b = a + dt
  if (holdAt >= 0 && b > holdAt) b = holdAt
  watched += b - a
  pv.pt = b
  pv.vt += dt
  cues(a, b)
  syncBeat()
  if (pv.pt >= SKIP_TO - EPS) previewHud.flash = flashAt(pv.pt, reducedMotion.value)
  if (pv.pt + EPS >= HANDOFF_AT) done(true)
}

/**
 * Every frame, paused or not (like the page turn's own step): the pause
 * mirror, a preview whose scene was taken away, and the flash fading off the
 * duel's first frames — a fade is chrome, never frozen by a pause.
 */
export const previewFrame = (dt: number, paused: boolean): void => {
  if (pv.running) {
    if (S.flow.scene !== 'preview') cancelPreview()
    else {
      // "Paused" to the DOM means "the clock is not running": a real pause,
      // a QA hold, or the first frame not yet reached — so the DOM's CSS
      // animations start with `pt`, turn included, never ahead of it.
      const p = paused || !pv.started || (holdAt >= 0 && pv.pt >= holdAt - EPS)
      if (p !== previewHud.paused) previewHud.paused = p
    }
  }
  if (after >= 0) {
    after += dt
    const f = afterFlash(after, reducedMotion.value)
    if (f <= 0.001) {
      after = -1
      previewHud.flash = 0
    } else previewHud.flash = f
  }
}

/**
 * A tap, Space or Enter: to the exit — never on the session's first preview,
 * never before `SKIP_FROM`, and not once the exit has begun. True if it did.
 */
export const skipPreview = (force = false): boolean => {
  if (!pv.running || !pv.started) return false
  if (!force && (first || pv.pt + EPS < SKIP_FROM)) return false
  if (pv.pt >= SKIP_TO - EPS) return false
  skipped = true
  holdAt = -1
  pv.pt = SKIP_TO
  syncBeat()
  // The stars' bright sting lands with the flash the skip goes straight to,
  // and the music comes back up for the exit: a skip from inside the
  // fanfare's duck must not start the duel ducked (`audio.ts` `duckMusic`).
  sfx('vsGo')
  duckMusic(0)
  return true
}

/** Is a preview up (or its flash still fading)? */
export const previewShowing = (): boolean => pv.running || after >= 0

/* ────────────────────────────── the QA seam ────────────────────────────── */

/**
 * `window.__preview` (debug builds, the dev server, a harness): freeze the
 * clock at a `pt` for a screenshot, let it go, skip, or finish at once.
 * `hold(pt)` ahead of the clock RUNS to it — so the canvas's bursts and the
 * DOM's own animations are exactly what a player sees there — and stops;
 * behind the clock it jumps back silently.
 */
export const previewQa = {
  hold: (at?: number): boolean => {
    if (!pv.running) return false
    const target = at === undefined ? pv.pt : Math.max(0, Math.min(HANDOFF_AT - 0.01, at))
    if (target < pv.pt) {
      pv.pt = target
      syncBeat()
    }
    holdAt = target
    return true
  },
  release: (): boolean => {
    holdAt = -1
    return true
  },
  skip: (): boolean => skipPreview(true),
  /** Straight into the duel, no flash: a harness's fast path. */
  finish: (): boolean => {
    if (!pv.running) return false
    done(false)
    return true
  },
  state: () => ({
    pt: pv.pt, beat: previewHud.beat, running: pv.running, started: pv.started, first,
    held: holdAt >= 0 && pv.started && pv.pt >= holdAt - EPS, flash: previewHud.flash
  })
}

/** Test seam: forget the session (the next preview is the first again). */
export const __resetPreview = (): void => {
  cancelPreview()
  begun = 0
  first = true
  after = -1
  previewHud.flash = 0
  pv.spec = null
}
