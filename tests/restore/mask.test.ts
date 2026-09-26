// @vitest-environment node
// The wipe's coverage model (story-spec §9.3, §7.6): analytic, beside the
// dust canvas, never read back from it. These pin the arithmetic the brush,
// the 85 % rule and the save all rest on.

import { describe, expect, it } from 'vitest'
import {
  CELLS, CELL, SEC_W, SEC_H, SUB, GRID_W, GRID_H, DONE_AT, COMPLETE_AT, falloff, createCoverage, stamp,
  coverage01, cellCover, isCellDone, doneCount, clearCell, cellAt, packCoverage, unpackCoverage,
  FAINT_AT, STOPPED_AT, LOOKS_CLEAN_AT, lookAt, looksDone, finishProgress, HELP_R, HELP_CORE, helpCells, type Coverage
} from '@/game/restore/mask'
import { seeded } from '@/game/duel/util'

describe('coverage model', () => {
  it('is the 24 × 14 grid C9 persists, over a 12∶7 sector of square cells', () => {
    expect(CELLS).toBe(336)
    expect(SEC_W / SEC_H).toBeCloseTo(12 / 7)
    expect(CELL).toBe(48)
  })

  it('uses the baked stamp’s own falloff: flat core, straight ramp, nothing past the rim', () => {
    expect(falloff(0, 0.7)).toBe(1)
    expect(falloff(0.7, 0.7)).toBe(1)
    expect(falloff(0.85, 0.7)).toBeCloseTo(0.5)
    expect(falloff(1, 0.7)).toBe(0)
    expect(falloff(2, 0.7)).toBe(0)
  })

  it('starts fully dusty', () => {
    const c = createCoverage()
    expect(coverage01(c)).toBe(0)
    expect(doneCount(c)).toBe(0)
  })

  it('removes a stamp’s strength from what REMAINS, like destination-out', () => {
    const c = createCoverage()
    const cell = cellAt(24, 24)
    stamp(c, 24, 24, 200, 0.99, 0.5)
    expect(cellCover(c, cell)).toBeCloseTo(0.5, 2)
    stamp(c, 24, 24, 200, 0.99, 0.5)
    expect(cellCover(c, cell)).toBeCloseTo(0.75, 2)
  })

  it('reports every cell a stamp touched, for the dwell clocks', () => {
    const c = createCoverage()
    const hit = stamp(c, CELL * 5, CELL * 5, CELL * 0.9, 0.7, 1)
    const cells = Array.from(hit.cells.subarray(0, hit.n)).sort((a, b) => a - b)
    expect(cells).toEqual([4 * 24 + 4, 4 * 24 + 5, 5 * 24 + 4, 5 * 24 + 5])
  })

  it('clamps at the sector edge and ignores a stamp off it', () => {
    const c = createCoverage()
    stamp(c, -10, -10, 30, 0.7, 1)
    expect(cellCover(c, 0)).toBeGreaterThan(0)
    const before = coverage01(c)
    stamp(c, 5000, 5000, 30, 0.7, 1)
    expect(coverage01(c)).toBe(before)
    expect(cellAt(-1, 0)).toBe(-1)
    expect(cellAt(SEC_W, 0)).toBe(-1)
  })

  it('counts a cell done at 224/255, a little past the 85 % target', () => {
    expect(DONE_AT).toBeCloseTo(0.878, 3)
    const c = createCoverage()
    clearCell(c, 7)
    expect(isCellDone(c, 7)).toBe(true)
    expect(isCellDone(c, 8)).toBe(false)
  })

  it('round-trips the in-progress save with zero corruption over ten cycles (§12.2.2)', () => {
    const r = seeded(99)
    const c = createCoverage()
    for (let cycle = 0; cycle < 10; cycle++) {
      // Brush some more, then save → reload → compare the done set.
      for (let i = 0; i < 25; i++) stamp(c, r() * SEC_W, r() * SEC_H, 60 + r() * 80, 0.75, 0.4 + r() * 0.6)
      const packed = packCoverage(c)
      expect(packed).toHaveLength(56)
      const wantDone = Array.from({ length: CELLS }, (_, i) => isCellDone(c, i))
      const back = createCoverage()
      const restored = unpackCoverage(back, packed)
      expect(restored.length).toBe(wantDone.filter(Boolean).length)
      for (let i = 0; i < CELLS; i++) expect(isCellDone(back, i), `cycle ${cycle} cell ${i}`).toBe(wantDone[i])
      // Resume from the RESTORED state, as a reload does.
      c.rem.set(back.rem)
    }
  })

  it('restores nothing from no save, and a done cell exactly clear', () => {
    const c = createCoverage()
    expect(unpackCoverage(c, null)).toEqual([])
    expect(coverage01(c)).toBe(0)
  })
})

describe('the half-brushed resume (single passes survive a relaunch)', () => {
  it('saves cells past halfway but not done, and restores them at the first pass', async () => {
    const m = await import('@/game/restore/mask')
    const c = m.createCoverage()
    // One first pass over cell 30 (55 %), a full clear of cell 31.
    const [x0, y0] = m.cellRect(30)
    for (let j = 0; j < m.SUB; j++) for (let i = 0; i < m.SUB; i++) m.stamp(c, x0 + (i + 0.5) * (m.CELL / m.SUB), y0 + (j + 0.5) * (m.CELL / m.SUB), 4, 1, 0.55)
    m.clearCell(c, 31)
    expect(m.isCellDone(c, 30)).toBe(false)
    expect(m.cellCover(c, 30)).toBeGreaterThanOrEqual(m.HALF_AT)
    const done = m.packCoverage(c)
    const half = m.packHalf(c)
    const r = m.createCoverage()
    expect(m.unpackCoverage(r, done)).toEqual([31])
    expect(m.unpackHalf(r, half)).toEqual([30])
    expect(m.cellCover(r, 30)).toBeCloseTo(m.FIRST_PASS_CLEAR, 5)
    expect(m.isCellDone(r, 31)).toBe(true)
    expect(m.cellCover(r, 0)).toBe(0)
  })

  it('never lowers a cell the done bitset already cleared', async () => {
    const m = await import('@/game/restore/mask')
    // A half bit on a cell that is already clear (a stale pair) keeps it clear.
    const src = m.createCoverage()
    const [x0, y0] = m.cellRect(5)
    for (let j = 0; j < m.SUB; j++) for (let i = 0; i < m.SUB; i++) m.stamp(src, x0 + (i + 0.5) * (m.CELL / m.SUB), y0 + (j + 0.5) * (m.CELL / m.SUB), 4, 1, 0.55)
    const c = m.createCoverage()
    m.clearCell(c, 5)
    expect(m.unpackHalf(c, m.packHalf(src))).toEqual([5])
    expect(m.isCellDone(c, 5)).toBe(true)
  })
})

describe('the graceful finish (§8.6, owner 2026-09-20)', () => {
  /** One brush pass over the whole sector at strength `a`, sample by sample —
   *  a stamp small enough to land on exactly one sample. `skip` leaves a
   *  region untouched. */
  const pass = (c: Coverage, a: number, skip?: (i: number, j: number) => boolean): void => {
    const step = CELL / SUB
    for (let j = 0; j < GRID_H * SUB; j++) {
      for (let i = 0; i < GRID_W * SUB; i++) {
        if (skip?.(i, j)) continue
        stamp(c, (i + 0.5) * step, (j + 0.5) * step, step * 0.4, 1, a)
      }
    }
  }
  /** §8.4: one pass clears 55 % of what is there, a return pass the rest. */
  const FIRST = 0.55

  it('finishes an even haze too thin to see, though the arithmetic says 80 %', () => {
    const c = createCoverage()
    pass(c, FIRST)
    pass(c, FIRST)
    // Two first passes leave 45 % × 45 % ≈ 20 % — under the 85 % rule forever,
    // which is exactly the dead end this rule exists to end.
    expect(coverage01(c)).toBeCloseTo(1 - 0.45 * 0.45, 3)
    expect(coverage01(c)).toBeLessThan(COMPLETE_AT)
    const look = lookAt(c, STOPPED_AT)
    expect(look.clean).toBe(1)
    expect(looksDone(look)).toBe(true)
    expect(finishProgress(coverage01(c), look)).toBe(1)
  })

  it('still asks for another pass over dust anybody can see', () => {
    const c = createCoverage()
    pass(c, FIRST)
    expect(lookAt(c, STOPPED_AT).clean).toBe(0)
    expect(looksDone(lookAt(c, STOPPED_AT))).toBe(false)
    expect(looksDone(lookAt(c, FAINT_AT))).toBe(false)
  })

  it('only ends a wipe mid-stroke once nothing at all can be made out', () => {
    const c = createCoverage()
    pass(c, FIRST)
    pass(c, FIRST)
    // A 20 % haze: forgiven from a player who has stopped, not from one who is
    // still working — they can see it, so they are left something to aim at.
    expect(looksDone(lookAt(c, FAINT_AT))).toBe(false)
    pass(c, FIRST)
    expect(looksDone(lookAt(c, FAINT_AT))).toBe(true)
  })

  it('never finishes over a big visible chunk, however clean the rest is', () => {
    const c = createCoverage()
    // Everything hazed over twice except one 3 × 3 cell blotch (2.7 % of the
    // sector) nobody has been near.
    const blot = (i: number, j: number): boolean => i >= 40 && i < 52 && j >= 20 && j < 32
    pass(c, FIRST, blot)
    pass(c, FIRST, blot)
    const look = lookAt(c, STOPPED_AT)
    expect(look.clean).toBeGreaterThan(LOOKS_CLEAN_AT)
    expect(look.chunk).toBe(1)
    expect(looksDone(look)).toBe(false)
    // The ring stops just short of full: it never promises a finish the chunk
    // rule will refuse.
    expect(finishProgress(coverage01(c), look)).toBeLessThan(1)
    // Go over the blotch too, and the sector finishes.
    pass(c, FIRST)
    pass(c, FIRST)
    expect(looksDone(lookAt(c, STOPPED_AT))).toBe(true)
  })

  it('does not mistake the hairlines between strokes for a chunk', () => {
    const c = createCoverage()
    // Untouched hairlines one sample wide every 24 — 4 % of the sector, and
    // nothing solid anywhere.
    pass(c, 0.99, (i) => i % 24 === 0)
    const look = lookAt(c, STOPPED_AT)
    expect(look.clean).toBeGreaterThan(LOOKS_CLEAN_AT)
    expect(look.chunk).toBeLessThan(0.2)
    expect(looksDone(look)).toBe(true)
    // …while the same 4 % gathered into one place is a chunk, and is not.
    const c2 = createCoverage()
    pass(c2, 0.99, (i, j) => i >= 30 && i < 46 && j >= 20 && j < 34)
    expect(lookAt(c2, STOPPED_AT).clean).toBeGreaterThan(LOOKS_CLEAN_AT)
    expect(looksDone(lookAt(c2, STOPPED_AT))).toBe(false)
  })

  it('costs nothing per frame: the look is one pass over the lattice', () => {
    const c = createCoverage()
    pass(c, FIRST)
    const t0 = performance.now()
    for (let i = 0; i < 100; i++) lookAt(c, STOPPED_AT)
    // 100 looks — 400 s of play at one look per 250 ms — inside a frame budget.
    expect(performance.now() - t0).toBeLessThan(120)
  })
})

describe('the invisible helper (owner, 2026-09-26)', () => {
  const LW = GRID_W * SUB
  /** Set the remaining dust of samples (i, j) — lattice indices — in a box. */
  const fill = (c: Coverage, i0: number, j0: number, w: number, h: number, v: number): void => {
    for (let j = j0; j < j0 + h; j++) for (let i = i0; i < i0 + w; i++) c.rem[j * LW + i] = v
  }
  /** A sector brushed over everywhere, twice: §8.4's two first passes leave
   *  an even 45 % × 45 % ≈ 20 % haze. */
  const hazed = (v = 0.2): Coverage => {
    const c = createCoverage()
    c.rem.fill(v)
    return c
  }
  const cellOf = (i: number, j: number): number => Math.floor(j / SUB) * GRID_W + Math.floor(i / SUB)
  /** What the wipe does to one picked cell, frame by frame: the cone stamp
   *  on its centre, each frame taking its share of the fade's time LEFT
   *  (`T_HELP_FADE` 0.6 s), so the last frame takes the rest. */
  const dissolve = (c: Coverage, cell: number, fps = 60): void => {
    const x = ((cell % GRID_W) + 0.5) * CELL
    const y = (Math.floor(cell / GRID_W) + 0.5) * CELL
    const dt = 1 / fps
    for (let age = 0; ; age += dt) {
      const left = 0.6 - age
      const a = left <= dt ? 1 : dt / left
      stamp(c, x, y, HELP_R, HELP_CORE, a)
      if (a >= 1) return
    }
  }
  /** Run the helper at the wipe's own pace (`HELP_BUDGET` 20 samples, at most
   *  `HELP_MAX` 12 cells, per 250 ms check) until the stopped finish is met;
   *  returns how many checks that took. */
  const helpUntilDone = (c: Coverage): number => {
    const out = new Int32Array(12)
    for (let checks = 1; checks <= 400; checks++) {
      const n = helpCells(c, STOPPED_AT, out, 20)
      for (let k = 0; k < n; k++) dissolve(c, out[k]!)
      if (looksDone(lookAt(c, STOPPED_AT)) || coverage01(c) >= COMPLETE_AT) return checks
    }
    return Infinity
  }

  it('takes an untouched cell to its corners, under the faint floor, even at 20 fps', () => {
    for (const fps of [60, 20]) {
      const c = createCoverage()
      dissolve(c, cellOf(40, 20), fps)
      for (let j = 20; j < 24; j++) for (let i = 40; i < 44; i++) expect(c.rem[j * LW + i], `${fps} fps (${i}, ${j})`).toBeLessThan(FAINT_AT)
    }
  })

  it('takes the least dusty cell first, and a solid patch last', () => {
    const c = hazed()
    fill(c, 4, 4, 2, 2, 0.4) // a faint speck
    fill(c, 40, 20, 4, 4, 1) // an untouched cell the child can plainly see
    fill(c, 80, 40, 4, 4, 0.5) // a light cloud
    const out = new Int32Array(3)
    expect(helpCells(c, STOPPED_AT, out, 99)).toBe(3)
    expect(Array.from(out)).toEqual([cellOf(4, 4), cellOf(80, 40), cellOf(40, 20)])
  })

  it('paces by the amount of dust: many specks at once, a solid cell or two', () => {
    const c = hazed()
    for (let k = 0; k < 30; k++) fill(c, 2 + k * 3, 30, 1, 1, 0.5)
    fill(c, 40, 4, 12, 4, 1)
    const out = new Int32Array(12)
    // The specks are the lighter cells: the whole twelve go in one check…
    expect(helpCells(c, STOPPED_AT, out, 20)).toBe(12)
    for (let k = 0; k < 12; k++) dissolve(c, out[k]!)
    for (let k = 0; k < 30; k++) fill(c, 2 + k * 3, 30, 1, 1, 0.2)
    // …while solid dust fills the same budget in two cells.
    expect(helpCells(c, STOPPED_AT, out, 20)).toBe(2)
  })

  it('leaves dust under the floor alone, and skips cells already dissolving', () => {
    const c = hazed()
    fill(c, 4, 4, 2, 2, 0.4)
    fill(c, 80, 40, 4, 4, 0.5)
    fill(c, 60, 10, 4, 4, 0.3) // under the stopped floor: already reads as gone
    const out = new Int32Array(3)
    expect(helpCells(c, STOPPED_AT, out, 99)).toBe(2)
    expect(helpCells(c, STOPPED_AT, out, 99, (cell) => cell === cellOf(4, 4))).toBe(1)
    expect(out[0]).toBe(cellOf(80, 40))
    // Aiming at the mid-stroke finish, the faint cell counts too.
    expect(helpCells(c, FAINT_AT, out, 99)).toBe(3)
  })

  it('goes straight for the chunk once that is all that blocks the finish', () => {
    const c = hazed()
    for (let k = 0; k < 20; k++) fill(c, 2 + k * 4, 2, 1, 1, 0.5) // specks the look no longer counts
    fill(c, 48, 24, 8, 8, 0.45) // one light 2 × 2 cell cloud
    const look = lookAt(c, STOPPED_AT)
    expect(look.clean).toBeGreaterThan(LOOKS_CLEAN_AT)
    expect(looksDone(look)).toBe(false)
    const out = new Int32Array(12)
    const n = helpCells(c, STOPPED_AT, out, 99)
    expect(n).toBe(4)
    const cloud = new Set([cellOf(48, 24), cellOf(52, 24), cellOf(48, 28), cellOf(52, 28)])
    for (let k = 0; k < n; k++) expect(cloud.has(out[k]!)).toBe(true)
  })

  it('ends the owner’s dead end — a few light clouds nobody can find — within a second', () => {
    const c = hazed()
    fill(c, 10, 6, 6, 6, 0.45)
    fill(c, 70, 12, 5, 6, 0.4)
    fill(c, 30, 40, 8, 8, 0.4)
    // Genuinely stuck: past the helper's 75 %, short of 85 %, and the look
    // still refuses (the biggest cloud is a chunk).
    expect(coverage01(c)).toBeGreaterThan(0.75)
    expect(coverage01(c)).toBeLessThan(COMPLETE_AT)
    expect(looksDone(lookAt(c, STOPPED_AT))).toBe(false)
    expect(helpUntilDone(c)).toBeLessThanOrEqual(4)
  })

  it('clears a scatter of stray specks in a couple of seconds', () => {
    const c = hazed()
    for (let k = 0; k < 400; k++) fill(c, (k * 37) % LW, (k * 11) % (GRID_H * SUB), 1, 1, 0.5)
    expect(coverage01(c)).toBeGreaterThan(0.75)
    expect(looksDone(lookAt(c, STOPPED_AT))).toBe(false)
    expect(helpUntilDone(c)).toBeLessThanOrEqual(12)
  })

  it('leaves a whole patch still showing mostly to the child', () => {
    const c = hazed(0.1)
    // Four cells' width never brushed: past 75 %, but plainly not done.
    fill(c, 72, 0, 16, GRID_H * SUB, 0.9)
    expect(coverage01(c)).toBeGreaterThan(0.75)
    const checks = helpUntilDone(c)
    expect(checks).toBeLessThan(Infinity)
    // Over two seconds of the helper — a child still brushing gets there first.
    expect(checks).toBeGreaterThan(8)
  })
})
