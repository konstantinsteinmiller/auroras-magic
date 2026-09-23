// @vitest-environment node
//
// The copy-fit guard only guards what it VISITS (`tools/locale-fit/audit.mjs`).
//
// That tool's own rule is that a screen it cannot reach is reported as SKIPPED
// rather than counted as clean — which is honest, but nobody reads a "not
// reached" line on a sweep that takes half an hour and prints zero problems.
// The failure this pins is therefore the quiet one: a surface ships, the tour
// is never extended, and twenty-one languages go out unmeasured. That is
// exactly what happened to the four retention surfaces of 2026-09 (the sticker
// album, the photo cards, Aurora's help note and the daily gift).
//
// Two tripwires, no browser:
//
//   • every step declares the marker it waits for, and the ids are unique;
//   • the marker each retention step waits for still EXISTS in the component
//     that prints the copy. Renaming `.album-panel` would not break a single
//     other test — it would just turn that step into a silent SKIP.
//
// It deliberately does not pin the step LIST: a tour is allowed to grow. It
// pins the four that carry copy nothing else measures.

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = resolve(__dirname, '..', '..')
const read = (rel: string): string => readFileSync(resolve(ROOT, rel), 'utf8')

const AUDIT = read('tools/locale-fit/audit.mjs')

/** `id: 'x'` / `need: '.y'`, in source order — the tool is data, not a module
 *  we can import: it launches a browser and a dev server on import. */
const steps = (): { id: string; need: string | null }[] => {
  const at: { id: string; i: number }[] = []
  const re = /^ {4}id: '([^']+)',$/gm
  let m: RegExpExecArray | null
  while ((m = re.exec(AUDIT))) at.push({ id: m[1]!, i: m.index })
  // A step's text runs to the NEXT step's `id:`, never a fixed window — the
  // comment above `need` is the longest part of some of these.
  return at.map(({ id, i }, k) => {
    const body = AUDIT.slice(i, at[k + 1]?.i ?? AUDIT.length)
    const need = /^ {4}need: '([^']+)'/m.exec(body)
    return { id, need: need ? need[1]! : null }
  })
}

const TOUR = steps()

describe('the locale-fit tour is well formed', () => {
  it('found the step list at all', () => {
    // A parse that silently matches nothing would make every assertion below
    // vacuously true.
    expect(TOUR.length).toBeGreaterThan(15)
  })

  it('gives every step a unique id', () => {
    const ids = TOUR.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gives every step the marker that proves the screen came up', () => {
    expect(TOUR.filter((s) => !s.need).map((s) => s.id)).toEqual([])
  })
})

// Each retention surface, the step that reaches it, and the selectors that
// step depends on — paired with the file that has to keep printing them.
const SURFACES: { step: string; file: string; selectors: string[] }[] = [
  {
    // Aurora's note after two losses: `.line` is capped at two lines, which is
    // the one box in this group that a long translation can overflow.
    step: 'duel-help',
    file: 'src/components/duel/DuelHelpNote.vue',
    selectors: ['help-note', 'line']
  },
  {
    // The daily gift's tap target, and the toast the sticker branch raises.
    step: 'map-daily',
    file: 'src/views/MapScene.vue',
    selectors: ['map-scene', 'daily', 'bloom-toast']
  },
  {
    // The album sheet: its count line, its hints, and the button that fills a
    // photo card so `photo.fullHint` is measured under a full row.
    step: 'album',
    file: 'src/components/album/AlbumPanel.vue',
    selectors: ['album-panel', 'count', 'hint', 'pose']
  },
  {
    // …reached through the tent's second picture tab.
    step: 'album',
    file: 'src/views/WardrobeScene.vue',
    selectors: ['wardrobe-scene', 'tent-tab']
  }
]

describe('the four retention surfaces are toured', () => {
  for (const { step, file, selectors } of SURFACES) {
    it(`${step} reaches ${file}`, () => {
      expect(TOUR.map((s) => s.id)).toContain(step)
      const src = read(file)
      for (const cls of selectors) {
        // `.cls` not followed by another word character: `.line` must not be
        // satisfied by `.line-through`.
        expect(src, `${file} no longer has .${cls}, so the tour would SKIP`)
          .toMatch(new RegExp(`\\.${cls}(?![\\w-])`))
      }
    })
  }

  it('says out loud which of the new strings it cannot measure', () => {
    // A picture tab's `aria-label` has no box, so no sweep can clear it. The
    // header must keep saying so rather than let the surface look covered.
    expect(AUDIT).toMatch(/WHAT IT CANNOT MEASURE/)
    for (const key of ['star.tabLabel', 'daily.open']) expect(AUDIT).toContain(key)
  })
})
