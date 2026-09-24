/**
 * duelPage.ts — the duel is fought ON the page it is about to restore
 * (story-spec §8.29).
 *
 * Before this, a duel happened in an abstract storm sky and the cleaning that
 * followed was a separate chore. Now the sector Aurora is fighting for IS the
 * backdrop: her page, under Umbra's dust. Every spell of hers that lands
 * blows a patch of that dust away, and the colour underneath comes back
 * where it hit; every spell of Umbra's that lands puffs some of it over
 * again. When the duel is won, the patches travel into the wipe with her —
 * so a child arrives at the cleaning having already started it, with the
 * marks of her own spells on the page.
 *
 * TWO RULES KEEP IT KIND (D1, the children's-difficulty ruling):
 *   • the carry-over only ever GIVES. Umbra's dust is drawn back on the page
 *     but never taken off the record: the wipe is handed the most the page
 *     was ever cleared, never the least.
 *   • it is CAPPED (`CARRY_CAP`). Cleaning is the reward, not a chore to be
 *     skipped — a duel can hand the child a head start, never the whole job.
 *
 * A practice duel on a sector already restored is fought on the finished
 * page, in full colour, with nothing to clear; local versus has no page at
 * all and keeps the old sky.
 *
 * COST. Two bakes (the page in colour, and under dust) and one mask, plus a
 * composite rebuilt only when a spell lands — the frame itself is two blits.
 * The bakes are half the sector's size while the page is DRAWN and full size
 * once it is PAINTED (`RES_DRAWN` / `RES_PAINTED`), because half a painting
 * stretched back over the stage is visibly soft. Portrait adds the page's
 * soft double for the drawing pad (`drawDuelPageBelow`), re-made only when
 * the composite is, and only once a portrait frame asks for it. Everything
 * is dropped when the duel ends.
 */
import { S } from '@/game/duel/state'
import { SW, SH } from '@/game/duel/config'
import { sectorOf } from '@/game/map/sectors'
import { paintSectorArt, sectorPainted } from '@/game/map/sectorArt'
import { artSettled, forgetArt, onArtChanged } from '@/game/art'
import { sectorArtId } from '@/game/artIds'
import { bakeDust, makeCanvas, DUST_INK } from '@/game/restore/dust'
import {
  SEC_W, SEC_H, CELLS, cellCover, createCoverage, resetCoverage, stamp, coverage01, type Coverage
} from '@/game/restore/mask'
import { NEUTRAL } from '@/game/artTint'
import { getPaintPick, hasBit, packBits, unpackBits } from '@/game/campaign/bitset'
import { clamp, rnd } from '@/game/duel/util'
import { coverFit, type Fit } from '@/game/fit'

type G2D = CanvasRenderingContext2D

/**
 * WHERE THE PAGE LIES ON THE STAGE: it covers the 1280 x 720 stage at ONE
 * scale (`fit.ts`) — the full width, with 13 units of its 672-unit height
 * cropped off the top and the bottom. Everything that has to register to
 * the picture goes through this one placement: the draw, and the way a
 * spell's landing point is turned back into sector units for the mask.
 *
 * The screen never sees this box whole in portrait: `layout.ts` frames a
 * window of the STAGE, and that transform is uniform too, so the page a
 * phone held upright shows is a crop of the same picture, never a squash.
 */
export const PAGE_ON_STAGE: Readonly<Fit> = coverFit(SEC_W, SEC_H, SW, SH)

/**
 * What fraction of the sector's size the page is baked at.
 *
 * HALF was right while the page was flat vector art: it re-renders at any
 * resolution, and a 2× upscale of flat fills and hard edges is invisible.
 *
 * A PAINTING is 1152 × 672 of real brushwork, and baking that at half threw
 * away every second pixel and then stretched the result back across a 1280-
 * wide stage — a downsample followed by a 2.2× upsample, which is exactly as
 * soft as it sounds, and is why the painted duel backdrop looked blurred
 * while the rig and the island on top of it stayed sharp.
 *
 * At 1 the painting's own pixels all survive and the only resample left is
 * the single one at draw time. Going above 1 would buy nothing: the painting
 * has no more pixels to give, and the drawn path keeps its cheap half.
 */
const RES_DRAWN = 0.5
const RES_PAINTED = 1
/** The resolution the CURRENT bake used; `bakeLayers` picks it. */
let res = RES_DRAWN
/** The soft mask the colour comes back through, in cells × 4. */
const MW = 192
const MH = 112

/**
 * The most of the page one duel may hand to the wipe. A good duel is a head
 * start; the cleaning itself is the reward (§8.25) and is never skipped.
 */
export const CARRY_CAP = 0.2

/** How far a landing spell reaches, sector units. */
const HIT_R = 128

/**
 * How clean a cell has to LOOK on the page to count as cleared for the wipe.
 * Not the wipe's own `DONE_AT`: a blast leaves a soft-edged patch, and what
 * the child saw come back to colour is what she should not have to scrub.
 */
const CARRY_AT = 0.55

let node = -1
let colour: HTMLCanvasElement | null = null
let dust: HTMLCanvasElement | null = null
/** The soft reveal: white where the page has been blown clean. */
let mask: HTMLCanvasElement | null = null
/** Dust over colour, composited through the mask; rebuilt when a spell lands. */
let shown: HTMLCanvasElement | null = null
let dirty = false
/** What the wipe is owed: the most this page was ever cleared. */
const cov: Coverage = createCoverage()
let restored = false
/** What a won duel left for the wipe: the page it cleared, and whose. */
let stash: { node: number; packed: string } | null = null

/** Is a page being fought on? */
export const duelPageActive = (): boolean => !!shown

/** How much of the page this duel has blown clean, 0..1 (before the cap). */
export const duelPageCleared = (): number => (node < 0 || restored ? 0 : coverage01(cov))

/**
 * Bake — or RE-bake — the two layers derived from the sector's artwork:
 * `colour` (the page as it will look when clean) and `dust` (that page under
 * Umbra's dust, with the sector's props in it).
 *
 * Deliberately touches neither `mask` nor `cov`. Those are the child's own
 * work — the patches she has already blown clean — and a re-bake must never
 * cost her any of it. The dust is seeded by the node, so it comes back the
 * same shape and she cannot see it re-settle.
 */
const bakeLayers = (): boolean => {
  if (node < 0) return false
  const sec = sectorOf(node)
  const pick = getPaintPick(S.campaign.paintPicks, node)
  const pot = pick > 0 ? sec.pots[pick - 1] ?? { id: 'neutral', ...NEUTRAL } : { id: 'neutral', ...NEUTRAL }
  // Decided before the canvas exists, so ask the probe rather than the draw.
  res = sectorPainted(node, false) ? RES_PAINTED : RES_DRAWN
  const w = Math.round(SEC_W * res)
  const h = Math.round(SEC_H * res)
  const cv = makeCanvas(w, h)
  const g = cv.getContext('2d')
  if (!g) return false
  g.setTransform(res, 0, 0, res, 0, 0)
  if (!paintSectorArt(g, node, sec, pot, false)) sec.paint(g, pot)
  g.setTransform(1, 0, 0, 1, 0, 0)
  colour = cv
  softDirty = true
  if (restored) {
    // Nothing to clear: the page is hers already, and IS what is shown.
    shown = colour
    dust = null
    mask = null
    return true
  }
  const d = makeCanvas(w, h)
  bakeDust(d, colour, res, node + 1, (dg) => sec.props(dg, 0, 0))
  dust = d
  // A painting landing mid-duel raises `res`, so the composite it is drawn
  // into has to grow with it. The MASK does not: it is a fixed 192 × 112 and
  // `compose` already scales it to whatever `shown` is, so the patches the
  // child has blown clean survive the change untouched.
  if (!shown || shown.width !== w || shown.height !== h) shown = makeCanvas(w, h)
  return true
}

/**
 * Bake node `n`'s page for a duel. A sector already restored is fought on in
 * full colour; local versus (or anything without a sector) has no page.
 */
export const beginDuelPage = (n: number): void => {
  resetDuelPage()
  if (S.versus || n < 0 || n > 49) return
  node = n
  restored = hasBit(S.campaign.sectorsDone, n)
  // Ask for the full-size painting up front and at high priority, so it is on
  // the wire during the duel's opening beats instead of being kicked off by
  // the bake below — which reads it one tick too early to ever see it.
  artSettled('sector', sectorArtId(n), 'high')
  if (!bakeLayers()) {
    resetDuelPage()
    return
  }
  if (restored) return
  mask = makeCanvas(MW, MH)
  dirty = true
  compose()
}

/**
 * The painted sector arriving mid-duel.
 *
 * `spriteFor` is lazy and asynchronous: the first ask returns null and only
 * starts the fetch, so the bake at `beginDuelPage` ALWAYS draws the vectors,
 * and without this the whole duel is fought on the drawn page while the
 * painting sits decoded and unused. Only this node's painting matters; a
 * flag flip or a refresh passes null and re-bakes too.
 *
 * A PROP painting counts as well: `bakeDust` draws the sector's props at rest
 * into the dust layer, so a butterfly or a mill sail landing mid-duel leaves
 * its vector baked under the dust until something re-bakes.
 */
onArtChanged((c) => {
  if (node < 0) return
  const mine = !c || c.kind === 'prop' || (c.kind === 'sector' && c.id === sectorArtId(node))
  if (!mine) return
  if (bakeLayers()) dirty = true
})

/** Drop the page's surfaces — the duel is over. The stash a won duel left
 *  for the wipe is not a surface, and stays. */
export const resetDuelPage = (): void => {
  // …and the full-size PAINTING with them. The duel asks for it at `'high'`
  // (1152 × 672, ~3 MB decoded) and `wipe.ts` was the only place that ever
  // handed one back, so every duel that did not lead straight into a wipe — a
  // loss, an abandon, a practice replay — left one decoded for the rest of the
  // session. Every exit from here goes to the MAP, which draws the 384 × 224
  // thumb under a different key, so nothing on the other side wants it; the
  // wipe re-fetches from the HTTP cache, which is what `forgetArt` is for.
  if (node >= 0) forgetArt('sector', sectorArtId(node))
  node = -1
  colour = dust = mask = null
  shown = null
  soft = softTmp = softBlur = null
  softDirty = true
  restored = false
  dirty = false
  resetCoverage(cov)
}

/**
 * Stage px → sector units, back through the page's own placement. These used
 * to be `x / SW * SEC_W` and `y / SH * SEC_H` — two DIFFERENT scales (0.900
 * and 0.933) for a page that is drawn at one, so a blast's cleared patch
 * landed up to 12 sector units off the spot it hit, vertically only.
 */
export const toSecX = (x: number): number => (x - PAGE_ON_STAGE.x) / PAGE_ON_STAGE.k
export const toSecY = (y: number): number => (y - PAGE_ON_STAGE.y) / PAGE_ON_STAGE.k

/**
 * A spell landed at stage `(x, y)`. `clean` — Aurora's, which blows the dust
 * off — or Umbra's, which puffs it back over. `power` 0..1 scales the patch.
 */
export const duelPageHit = (x: number, y: number, clean: boolean, power: number): void => {
  if (!mask || !dust || restored || node < 0) return
  const m = mask.getContext('2d')
  if (!m) return
  const p = clamp(power, 0, 1)
  const sx = toSecX(x)
  const sy = toSecY(y)
  // The blast itself, and the dust it throws off around it: without the
  // scatter every spell lands in the same place (the foe stands still) and
  // the page comes back as one porthole instead of a fight.
  const blow = (bx: number, by: number, r: number, a: number): void => {
    const mx = (bx / SEC_W) * MW
    const my = (by / SEC_H) * MH
    const mr = Math.max(1, (r / SEC_W) * MW)
    const grd = m.createRadialGradient(mx, my, mr * 0.25, mx, my, mr)
    grd.addColorStop(0, `rgba(255,255,255,${a})`)
    grd.addColorStop(0.7, `rgba(255,255,255,${a * 0.8})`)
    grd.addColorStop(1, 'rgba(255,255,255,0)')
    m.globalCompositeOperation = clean ? 'source-over' : 'destination-out'
    m.fillStyle = grd
    m.beginPath()
    m.arc(mx, my, mr, 0, Math.PI * 2)
    m.fill()
    m.globalCompositeOperation = 'source-over'
    // The record the wipe inherits only ever grows: Umbra can smudge the
    // page, but she cannot take back what Aurora already won (D1).
    if (clean && a > 0.6) stamp(cov, bx, by, r, 0.55, 1)
  }
  const r = HIT_R * (0.7 + 0.5 * p)
  blow(sx, sy, r, 1)
  for (let i = 0; i < 2; i++) {
    const a = rnd() * Math.PI * 2
    const d = r * (0.9 + rnd() * 1.4)
    blow(
      clamp(sx + Math.cos(a) * d, 40, SEC_W - 40),
      clamp(sy + Math.sin(a) * d * 0.7, 40, SEC_H - 40),
      r * (0.45 + rnd() * 0.3),
      0.7 + 0.25 * p
    )
  }
  dirty = true
}

/** The page as it stands: dust, with the colour back where it was cleared. */
const compose = (): void => {
  if (!shown || !colour || !dust || !mask) return
  const g = shown.getContext('2d')
  if (!g) return
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.globalCompositeOperation = 'copy'
  g.drawImage(colour, 0, 0)
  g.globalCompositeOperation = 'destination-in'
  g.drawImage(mask, 0, 0, shown.width, shown.height)
  g.globalCompositeOperation = 'destination-over'
  g.drawImage(dust, 0, 0)
  g.globalCompositeOperation = 'source-over'
  dirty = false
  softDirty = true
}

/**
 * Draw the page behind the duel, filling the stage. True when it drew, which
 * is the arena's cue to lay its sky over it rather than instead of it.
 */
export const drawDuelPage = (g: G2D): boolean => {
  if (!shown) return false
  if (dirty) compose()
  const P = PAGE_ON_STAGE
  g.drawImage(shown, P.x, P.y, P.w, P.h)
  return true
}

/* ─────────────────── the page below the window (portrait) ─────────────────── */

/**
 * The page as a soft, blurred double: 1/24 of the sector each way (the SAME
 * factor on both axes, so it is a smaller picture, not a squashed one), then
 * a 3 x 3 box pass. Blown back up across the pad it keeps the page's colours
 * — which way the light falls, where the ground is darker — and loses every
 * shape, so nothing reads as an upside-down mushroom.
 *
 * The blurred 48 x 28 is enlarged ONCE, here, 4x at high quality, so the
 * frame's own draw is a cheap bilinear one that shows no interpolation grid.
 */
const SOFT_W = SEC_W / 24
const SOFT_H = SEC_H / 24
const SOFT_UP = 4
let soft: HTMLCanvasElement | null = null
let softTmp: HTMLCanvasElement | null = null
let softBlur: HTMLCanvasElement | null = null
/** `soft` is stale: the page was re-baked or a spell changed what it shows. */
let softDirty = true

const bakeSoft = (): void => {
  if (!shown) return
  softTmp ??= makeCanvas(SOFT_W, SOFT_H)
  softBlur ??= makeCanvas(SOFT_W, SOFT_H)
  soft ??= makeCanvas(SOFT_W * SOFT_UP, SOFT_H * SOFT_UP)
  const a = softTmp.getContext('2d')
  const b = softBlur.getContext('2d')
  const c = soft.getContext('2d')
  if (!a || !b || !c) return
  a.setTransform(1, 0, 0, 1, 0, 0)
  a.globalCompositeOperation = 'copy'
  a.imageSmoothingEnabled = true
  a.imageSmoothingQuality = 'high'
  a.drawImage(shown, 0, 0, SOFT_W, SOFT_H)
  a.globalCompositeOperation = 'source-over'
  // A box blur that is exact at the edges: nine shifted copies ADDED at a
  // ninth each, and then the unshifted picture laid UNDER the result, which
  // fills in exactly the share an edge pixel's missing neighbours left out.
  b.setTransform(1, 0, 0, 1, 0, 0)
  b.globalAlpha = 1
  b.globalCompositeOperation = 'source-over'
  b.clearRect(0, 0, SOFT_W, SOFT_H)
  b.globalCompositeOperation = 'lighter'
  b.globalAlpha = 1 / 9
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) b.drawImage(softTmp, dx, dy)
  b.globalAlpha = 1
  b.globalCompositeOperation = 'destination-over'
  b.drawImage(softTmp, 0, 0)
  b.globalCompositeOperation = 'source-over'
  c.setTransform(1, 0, 0, 1, 0, 0)
  c.globalCompositeOperation = 'copy'
  c.imageSmoothingEnabled = true
  c.imageSmoothingQuality = 'high'
  c.drawImage(softBlur, 0, 0, SOFT_W * SOFT_UP, SOFT_H * SOFT_UP)
  c.globalCompositeOperation = 'source-over'
  softDirty = false
}

let veil: CanvasGradient | null = null
let veilCtx: G2D | null = null
let veilKey = NaN

/**
 * PORTRAIT: the page goes on under the drawing pad (`layout.ts`), so the
 * child draws her runes on the same dusty page she is fighting over — as she
 * does in landscape, where the pad IS the page.
 *
 * There is no more painting below the picture's foot, so the page is
 * CONTINUED, never stretched: its soft double, mirrored about the stage's
 * bottom edge (where the portrait window ends, so the colours meet their own
 * reflection at the seam), and upright again below that on a very tall
 * phone. Then a veil of the dust's own plum that deepens toward the CAST bar.
 *
 * `bottom` is the pad's foot in stage units. Draws nothing — and returns
 * false — when no page is being fought on.
 */
export const drawDuelPageBelow = (g: G2D, bottom: number): boolean => {
  if (!shown) return false
  if (dirty) compose()
  if (softDirty || !soft) bakeSoft()
  if (!soft) return false
  const P = PAGE_ON_STAGE
  g.save()
  g.beginPath()
  g.rect(-SW, SH, SW * 3, Math.max(0, bottom - SH) + 4)
  g.clip()
  g.imageSmoothingEnabled = true
  // Mirrored about y = SH: a point d below the edge shows the page d above it.
  g.save()
  g.translate(0, 2 * SH)
  g.scale(1, -1)
  g.drawImage(soft, P.x, P.y, P.w, P.h)
  g.restore()
  // The mirror ends at 2·SH − (P.y + P.h); a taller pad gets the page upright
  // again from there, which meets the mirror's edge with its own.
  const turn = 2 * SH - P.y
  if (bottom > turn) g.drawImage(soft, P.x, turn, P.w, P.h)
  if (!veil || veilCtx !== g || veilKey !== bottom) {
    veilCtx = g
    veilKey = bottom
    veil = g.createLinearGradient(0, SH, 0, Math.max(SH + 1, bottom))
    veil.addColorStop(0, `${DUST_INK}00`)
    veil.addColorStop(0.45, `${DUST_INK}40`)
    veil.addColorStop(1, `${DUST_INK}8c`)
  }
  g.fillStyle = veil
  g.fillRect(-SW, SH, SW * 3, Math.max(0, bottom - SH) + 4)
  g.restore()
  return true
}

/**
 * Put what this duel blew clean aside for the wipe that follows. Called when
 * the duel is WON: a duel that was lost or left leaves the page as it was.
 */
export const stashDuelClearing = (n: number): void => {
  if (node !== n || restored) return
  const done: number[] = []
  for (let i = 0; i < CELLS; i++) if (cellCover(cov, i) >= CARRY_AT) done.push(i)
  if (!done.length) return
  // Capped, in the grid's own order, so a duel always hands over the same
  // page — and never more than a head start.
  const most = Math.max(1, Math.floor(CELLS * CARRY_CAP))
  const keep = new Set(done.length > most ? done.slice(0, most) : done)
  stash = { node: n, packed: packBits(CELLS, (i) => keep.has(i)) }
}

/**
 * The head start node `n`'s wipe inherits from the duel just won: the packed
 * cells, or null. Handed over once — a wipe left and returned to starts from
 * what the child has actually cleaned.
 */
export const takeDuelClearing = (n: number): string | null => {
  if (!stash || stash.node !== n) return null
  const packed = stash.packed
  stash = null
  return packed
}

/**
 * The coverage a wipe of node `n` should open with: what the save already
 * holds, plus the head start the duel just won, as one bitset. The stash is
 * spent by the call, so the head start is granted once.
 *
 * It returns `saved` untouched when there is nothing to add, which is every
 * wipe that did not just follow a won duel.
 */
export const duelHeadStart = (n: number, saved: string | null): string | null => {
  const won = takeDuelClearing(n)
  if (!won) return saved
  if (!saved) return won
  const a = new Uint8Array(CELLS)
  const b = new Uint8Array(CELLS)
  unpackBits(saved, a)
  unpackBits(won, b)
  return packBits(CELLS, (i) => !!a[i] || !!b[i])
}

/** Test and QA seam. */
export const duelPageState = (): { node: number; cleared: number; cells: number; stashed: boolean } => {
  let cells = 0
  for (let i = 0; i < CELLS; i++) if (cellCover(cov, i) >= CARRY_AT) cells++
  return { node, cleared: duelPageCleared(), cells, stashed: !!stash }
}
