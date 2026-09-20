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
 * COST. Two small bakes (the page in colour, and under dust) and one mask,
 * all at half the sector's size, plus a composite that is rebuilt only when a
 * spell lands — the frame itself is two blits. Everything is dropped when the
 * duel ends.
 */
import { S } from '@/game/duel/state'
import { SW, SH } from '@/game/duel/config'
import { sectorOf } from '@/game/map/sectors'
import { paintSectorArt } from '@/game/map/sectorArt'
import { bakeDust, makeCanvas } from '@/game/restore/dust'
import {
  SEC_W, SEC_H, CELLS, cellCover, createCoverage, resetCoverage, stamp, coverage01, type Coverage
} from '@/game/restore/mask'
import { NEUTRAL } from '@/game/artTint'
import { getPaintPick, hasBit, packBits, unpackBits } from '@/game/campaign/bitset'
import { clamp, rnd } from '@/game/duel/util'

type G2D = CanvasRenderingContext2D

/** The page is baked at half the sector's size: it sits behind the duel. */
const RES = 0.5
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
 * Bake node `n`'s page for a duel. A sector already restored is fought on in
 * full colour; local versus (or anything without a sector) has no page.
 */
export const beginDuelPage = (n: number): void => {
  resetDuelPage()
  if (S.versus || n < 0 || n > 49) return
  node = n
  restored = hasBit(S.campaign.sectorsDone, n)
  const sec = sectorOf(n)
  const pick = getPaintPick(S.campaign.paintPicks, n)
  const pot = pick > 0 ? sec.pots[pick - 1] ?? { id: 'neutral', ...NEUTRAL } : { id: 'neutral', ...NEUTRAL }
  const w = Math.round(SEC_W * RES)
  const h = Math.round(SEC_H * RES)
  colour = makeCanvas(w, h)
  const g = colour.getContext('2d')
  if (!g) {
    resetDuelPage()
    return
  }
  g.setTransform(RES, 0, 0, RES, 0, 0)
  if (!paintSectorArt(g, n, sec, pot, false)) sec.paint(g, pot)
  g.setTransform(1, 0, 0, 1, 0, 0)
  if (restored) {
    // Nothing to clear: the page is hers already.
    shown = colour
    dust = null
    mask = null
    return
  }
  dust = makeCanvas(w, h)
  bakeDust(dust, colour, RES, n + 1, (dg) => sec.props(dg, 0, 0))
  mask = makeCanvas(MW, MH)
  shown = makeCanvas(w, h)
  dirty = true
  compose()
}

/** Drop the page's surfaces — the duel is over. The stash a won duel left
 *  for the wipe is not a surface, and stays. */
export const resetDuelPage = (): void => {
  node = -1
  colour = dust = mask = null
  shown = null
  restored = false
  dirty = false
  resetCoverage(cov)
}

/** Stage px → sector units. */
const toSecX = (x: number): number => (x / SW) * SEC_W
const toSecY = (y: number): number => (y / SH) * SEC_H

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
}

/**
 * Draw the page behind the duel, filling the stage. True when it drew, which
 * is the arena's cue to lay its sky over it rather than instead of it.
 */
export const drawDuelPage = (g: G2D): boolean => {
  if (!shown) return false
  if (dirty) compose()
  const k = Math.max(SW / SEC_W, SH / SEC_H)
  const w = SEC_W * k
  const h = SEC_H * k
  g.drawImage(shown, (SW - w) / 2, (SH - h) / 2, w, h)
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
