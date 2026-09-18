// @vitest-environment node
// The wipe's coverage model (story-spec §9.3, §7.6): analytic, beside the
// dust canvas, never read back from it. These pin the arithmetic the brush,
// the 85 % rule and the save all rest on.

import { describe, expect, it } from 'vitest'
import {
  CELLS, CELL, SEC_W, SEC_H, DONE_AT, falloff, createCoverage, stamp, coverage01, cellCover,
  isCellDone, doneCount, clearCell, cellAt, packCoverage, unpackCoverage
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
