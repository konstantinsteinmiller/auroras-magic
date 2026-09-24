// @vitest-environment node
// The book's chrome and the DOM's storybook marks (paint-outstanding.md P3,
// P5, P9, P14; art-roadmap.md "2026-09-24 — paint-outstanding pass (map &
// UI)"). These pin what can silently drift: a pictogram the script shows that
// no set carries (it would stay drawn beside painted ones), a set the slicer
// could not cut, a set briefed as "one object at different moments" (six
// pictograms back as one pictogram six times), and a stretched painting whose
// slices leave no plain middle to stretch.

import { describe, expect, it } from 'vitest'
import { promptDocs, WORLD_UI_SHEETS } from '@/game/artSheet'
import { CHROME_ART, PICTO_SETS, pictoSetArtId, pictoSlot } from '@/game/artIds'
import { artTarget } from '@/game/artFolders'
import { dialogueFor, thanksLines } from '@/game/story/story'
import { PICTOS } from '@/components/story/pictos'
import { LEAF_H, LEAF_SLICE, LEAF_W, leafSlices } from '@/game/domArt'
import { CORNER_R, HOLE_IN, LIP, PAGE_H, PAGE_W, SLICE } from '@/game/map/bookBoard'
import { storyChromeOf } from '@/game/artSchedule'
// @ts-expect-error — a plain .mjs tool, parsed the way the desk parses
import { parsePromptDoc } from '../../tools/art-desk/jobs.mjs'

type Job = { title: string; refName: string; target: string | null; prompt: string }

/** Every pictogram a line of the script shows. */
const scriptPictos = (): Set<string> => {
  const used = new Set<string>()
  for (let n = 0; n < 50; n++) {
    for (const b of [...dialogueFor(n), ...thanksLines(n)]) for (const p of b.pictos) used.add(p)
  }
  return used
}

describe('the dialogue pictograms, painted as sets (P5)', () => {
  it('give every pictogram the script shows a panel in exactly one set', () => {
    for (const p of scriptPictos()) expect(pictoSlot(p), p).not.toBeNull()
    const all = PICTO_SETS.flat() as string[]
    expect(new Set(all).size).toBe(all.length)
    for (const p of all) expect(Object.keys(PICTOS), p).toContain(p)
  })

  it('are strips the slicer can cut: one row each, never more than six', () => {
    const sets = WORLD_UI_SHEETS.filter((s) => s.set)
    expect(sets.map((s) => s.id)).toEqual(PICTO_SETS.map((_, k) => pictoSetArtId(k)))
    sets.forEach((s, k) => {
      expect(s.frames).toBe(PICTO_SETS[k]!.length)
      expect(s.frames).toBeLessThanOrEqual(6)
      expect(s.panels).toHaveLength(s.frames)
      expect(s.target).toBe(artTarget('worldUi', s.id))
    })
  })

  it('never brief a set as one object at different moments', () => {
    const items = parsePromptDoc(promptDocs()['PROMPTS-ITEMS.md']!, 'x') as Job[]
    for (const s of WORLD_UI_SHEETS.filter((x) => x.set)) {
      const j = items.find((x) => x.refName === `${s.file}.png`)!
      expect(j, s.file).toBeTruthy()
      expect(j.prompt).toContain('ONE HAND')
      expect(j.prompt).toContain(`Exactly ${s.frames} panels`)
      expect(j.prompt).not.toContain('at a different moment')
    }
  })

  it('ask a dialogue page for its leaf and two sets at most — three on a few late pages', () => {
    let three = 0
    for (let n = 0; n < 50; n++) {
      const wants = storyChromeOf(dialogueFor(n)).map(([k, id]) => `${k}/${id}`)
      expect(wants[0]).toBe(`${CHROME_ART.leaf.kind}/${CHROME_ART.leaf.id}`)
      expect(wants.length - 1, `node ${n}`).toBeLessThanOrEqual(3)
      if (wants.length - 1 === 3) three++
    }
    // The moon recurs to the end and lives with the woods: chapters 7, 9 and
    // 10's first pages and the finale's reach for a third set, nothing else.
    expect(three).toBeLessThanOrEqual(4)
    // The cold boot's opener, which the splash holds for: two.
    expect(storyChromeOf(dialogueFor(0))).toHaveLength(3)
    expect(storyChromeOf([])).toEqual([])
  })
})

describe('the stretched paintings keep a plain middle (P9, P14)', () => {
  it('slice the book board on plain board and plain leaves', () => {
    // Past the rounded corner, and past where the leaves end under the page.
    expect(SLICE).toBeGreaterThan(CORNER_R)
    expect(SLICE).toBeGreaterThan(1 + HOLE_IN)
    expect(LIP).toBeLessThan(1)
    // Room between the slices on the reference, in both directions.
    expect(PAGE_W + 2 - 2 * SLICE).toBeGreaterThan(0.5)
    expect(PAGE_H + 2 - 2 * SLICE).toBeGreaterThan(0.5)
  })

  it('slice the dialogue leaf on plain paper and plain edge', () => {
    const L = leafSlices()
    expect(LEAF_SLICE).toBeGreaterThan(1)
    expect(L.top * 2).toBeLessThan(1)
    expect(L.side * 2).toBeLessThan(1)
    // The slices are the reference's own geometry: its box is the leaf plus
    // `measureBox`'s 6 % air.
    expect(L.top).toBeCloseTo((L.out + LEAF_SLICE) / (LEAF_H + 2 * L.out), 6)
    expect(L.side).toBeCloseTo((L.out + LEAF_SLICE) / (LEAF_W + 2 * L.out), 6)
    expect(L.out).toBeCloseTo(Math.max(LEAF_W, LEAF_H) * 0.06, 6)
  })
})
