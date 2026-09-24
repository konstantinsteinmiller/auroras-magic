// @vitest-environment node
// S6 — the painted-art manifest (story-spec §9.11; art-generation-pipeline).
//
// The prompt documents are copied from dozens of times per art pass, and the
// Art Desk sends exactly what it parses out of them: a heading it cannot parse
// is a drawable silently dropped from the queue, and a stray fence hands the
// painter half a prompt. The manifest is also the one table the renderer's
// probes, the slicer and `art:status` agree through — a target that drifts
// from `artTarget` is a painting nobody ever sees.

import { describe, expect, it } from 'vitest'
import {
  promptDocs, SECTOR_SHEETS, ITEM_SHEETS, RUNE_SHEETS, KEEPSAKE_SHEETS, PORTRAIT_SHEETS, ISLAND_SHEETS, STORY_SHEETS,
  PAGE_SHEETS, WORLD_UI_SHEETS, PROP_SHEETS, CREATURE_SHEETS, RIG_SHEETS, WARDROBE_SHEETS, WARDROBE_ITEM_SHEETS,
  BRAND_LOGO_SHEET, BRAND_MASCOT_SHEET,
  manifestTargets, NEUTRAL_HEX, sheetRows
} from '@/game/artSheet'
import { ART_FOLDERS, artTarget } from '@/game/artFolders'
import { ITEM_ART, SECTOR_SLUGS, sectorArtId, sectorNodeOf, RUNE_SLUGS, runeArtId } from '@/game/artIds'
import { SECTORS } from '@/game/map/sectors'
import { RUNES } from '@/game/duel/config'
import { NEUTRAL } from '@/game/artTint'
// @ts-expect-error — a plain .mjs tool, parsed the way the desk parses
import { parsePromptDoc } from '../../tools/art-desk/jobs.mjs'

type Job = { title: string; refName: string; target: string | null; prompt: string }

describe('the art manifest', () => {
  it('names every sector, every item and every rune', () => {
    expect(SECTOR_SHEETS).toHaveLength(50)
    expect(SECTOR_SLUGS).toHaveLength(Object.keys(SECTORS).length)
    expect(RUNE_SHEETS).toHaveLength(RUNES.length)
    expect(ITEM_SHEETS.map((s) => s.name).sort()).toEqual(Object.keys(ITEM_ART).sort())
  })

  it('files every painting where the renderer probes for it', () => {
    for (const s of SECTOR_SHEETS) {
      expect(s.target).toBe(artTarget('sector', sectorArtId(s.node)))
      expect(s.thumb).toBe(artTarget('sectorThumb', sectorArtId(s.node)))
      expect(sectorNodeOf(s.id)).toBe(s.node)
    }
    for (const s of ITEM_SHEETS) expect(s.target).toBe(artTarget(s.kind, s.id))
    RUNE_SLUGS.forEach((_, k) => expect(RUNE_SHEETS[k]!.target).toBe(artTarget('rune', runeArtId(k))))
    for (const t of manifestTargets().keys()) {
      expect(Object.values(ART_FOLDERS).some((f) => t.startsWith(`${f}/`))).toBe(true)
      expect(t).toMatch(/\.webp$/)
    }
  })

  it('never lets two drawables share a file or a reference', () => {
    const keyed = [
      ...ITEM_SHEETS, ...WORLD_UI_SHEETS, ...PROP_SHEETS, ...CREATURE_SHEETS, ...RIG_SHEETS, ...WARDROBE_ITEM_SHEETS, ...KEEPSAKE_SHEETS,
      ...RUNE_SHEETS, ...PORTRAIT_SHEETS, ...ISLAND_SHEETS, BRAND_MASCOT_SHEET
    ]
    const targets = [
      ...SECTOR_SHEETS.flatMap((s) => [s.target, s.thumb]), ...STORY_SHEETS.map((s) => s.target),
      ...PAGE_SHEETS.map((s) => s.target), ...WARDROBE_SHEETS.map((s) => s.target),
      BRAND_LOGO_SHEET.target, ...keyed.map((s) => s.target)
    ]
    expect(new Set(targets).size).toBe(targets.length)
    expect(manifestTargets().size).toBe(targets.length)
    const refs = sheetRows().map((r) => r.file)
    expect(new Set(refs).size).toBe(refs.length)
  })

  it('briefs the painter in the same neutral the game tints', () => {
    expect(NEUTRAL_HEX).toBe(NEUTRAL.base)
    for (const s of ITEM_SHEETS.filter((x) => x.tinted)) expect(s.name).toMatch(/^(gift|boxGift|chest)$/)
  })
})

describe('the prompt documents', () => {
  const docs = promptDocs()

  it('hold one fenced block per drawable, with no stray fence inside one', () => {
    const want: Record<string, number> = {
      // Items: 8 items, 5 world-UI sheets (node badges, bookmark, the
      // rewarded-ad movie camera, the two HP-bar frames) and 7 keepsake badges.
      'PROMPTS-SECTORS.md': 50, 'PROMPTS-ITEMS.md': 20, 'PROMPTS-RUNES.md': 12,
      'PROMPTS-PORTRAITS.md': 20, 'PROMPTS-ISLANDS.md': 10, 'PROMPTS-STORY.md': 4,
      'PROMPTS-PROPS.md': 46,
      // A chapter's tap creature and its rescue, one sheet per body (§8.8).
      'PROMPTS-CREATURES.md': 17,
      // The duelists' barrel, neck, head, ear and horn (§9.7). The legs stayed
      // drawn: a painted capsule per bone reads as a jointed doll.
      'PROMPTS-RIG.md': 5,
      // The cloth, the front page (both ways) and two per chapter.
      'PROMPTS-PAGES.md': 23,
      // The tent's room both ways, and the rug.
      'PROMPTS-WARDROBE.md': 3,
      // The mark and the mascot (art-style.md §11).
      'PROMPTS-BRAND.md': 2
    }
    expect(Object.keys(docs).sort()).toEqual(Object.keys(want).sort())
    for (const [name, text] of Object.entries(docs)) {
      const lines = text.split('\n')
      expect(lines.filter((l) => l.startsWith('## ')).length, name).toBe(want[name])
      let open: string | null = null
      let blocks = 0
      for (const l of lines) {
        const m = /^(`{3,})(text)?$/.exec(l)
        if (!m) continue
        if (!open) {
          expect(m[2], `${name}: a fence opens without "text"`).toBe('text')
          open = m[1]!
        } else {
          expect(l, `${name}: a fence inside a block`).toBe(open)
          open = null
          blocks++
        }
      }
      expect(open).toBeNull()
      expect(blocks).toBe(want[name])
    }
  })

  it('parse in the Art Desk to every reference and target, in order', () => {
    const jobs: Job[] = Object.entries(docs).flatMap(([name, text]) => parsePromptDoc(text, name) as Job[])
    expect(jobs).toHaveLength(212)
    const rows = sheetRows()
    const byRef = new Map(jobs.map((j) => [j.refName, j]))
    for (const r of rows) {
      const j = byRef.get(`${r.file}.png`)
      expect(j, r.file).toBeTruthy()
      expect(j!.target).toBe(r.target)
      // The heading is the operator's; the prompt must not carry it.
      expect(j!.prompt).not.toMatch(/^## /m)
      expect(j!.prompt).not.toContain('.png →')
    }
  })

  it('state the deliverable first and last, and the ground rule for each family', () => {
    for (const s of SECTOR_SHEETS) {
      const j = (parsePromptDoc(docs['PROMPTS-SECTORS.md']!, 'x') as Job[]).find((x) => x.refName === `${s.file}.png`)!
      expect(j.prompt.startsWith('WHAT COMES BACK')).toBe(true)
      expect(j.prompt.trim().split('\n').at(-1)).toMatch(/^OUTPUT: .*16:9/)
      expect(j.prompt).toContain('IT FILLS THE IMAGE')
      expect(j.prompt).not.toContain('#FF00FF')
      expect(j.prompt).toContain(s.landmark)
    }
    const items = parsePromptDoc(docs['PROMPTS-ITEMS.md']!, 'x') as Job[]
    for (const j of items) {
      expect(j.prompt.startsWith('WHAT COMES BACK')).toBe(true)
      expect(j.prompt).toContain('EXACTLY #FF00FF')
      expect(j.prompt.trim().split('\n').at(-1)).toMatch(/^OUTPUT: /)
    }
    // A strip names its panel count, and the wrong counts.
    const star = items.find((j) => j.refName === 'item-pet-star.png')!
    expect(star.prompt).toContain('Exactly 3 panels. Not 1, not 4, not 6.')
  })

  it('work the measured fit into the SIZE clause when there is one', () => {
    const fitted = promptDocs({ 'item-standard-gift': { h: 0.524, w: 0.635, bottom: 0.763, cx: 0.5 } })
    expect(fitted['PROMPTS-ITEMS.md']).toContain('spans 64% of the panel\'s width and 52% of its height')
    expect(docs['PROMPTS-ITEMS.md']).toContain('a little under three quarters of its panel')
  })
})
