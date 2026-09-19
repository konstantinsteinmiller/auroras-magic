// @vitest-environment node
// §8.26–§8.27 — the art families added after S6: the intro's pages, the
// dialogue portraits, the duel islands and the wardrobe's keepsake badges.
//
// Each family is a promise that "everything the game draws can be painted".
// These pin the parts that can silently drift: a scripted face with no strip
// to paint it in, a keepsake with no badge, a chapter with no island, an
// intro page whose character models are attached after its reference (the
// painter then paints a stranger), and a family briefed in the wrong ground.

import { describe, expect, it } from 'vitest'
import {
  promptDocs, PORTRAIT_SHEETS, ISLAND_SHEETS, KEEPSAKE_SHEETS, STORY_SHEETS, ITEM_SHEETS, ART_STYLE_ID
} from '@/game/artSheet'
import {
  PORTRAIT_SETS, portraitSetOf, portraitArtId, KEEPSAKE_ICON_SLUGS, keepsakeArtId, ISLAND_SLUGS, islandArtId,
  STORY_PANELS, storyArtId, ITEM_ART, EMOTE_ORDER
} from '@/game/artIds'
import { ART_FOLDERS, artTarget } from '@/game/artFolders'
import { dialogueFor, thanksLines, FINALE_CAST } from '@/game/story/story'
import { COSMETICS } from '@/game/campaign/tables'
import { ARENA_THEMES } from '@/game/duel/arenaThemes'
import { ACTIVE_STYLE } from '@/game/artStyle'
// @ts-expect-error — a plain .mjs tool, parsed the way the desk parses
import { parsePromptDoc } from '../../tools/art-desk/jobs.mjs'

type Job = { title: string; refName: string; also: string[]; target: string | null; prompt: string }

/** Every face the script ever shows: (speaker, emote, creature name). */
const scriptedFaces = (): { speaker: string; emote: string; creature?: string }[] => {
  const out: { speaker: string; emote: string; creature?: string }[] = []
  for (let n = 0; n < 50; n++) {
    for (const b of [...dialogueFor(n), ...thanksLines(n)]) {
      out.push({ speaker: b.speaker, emote: b.emote, creature: b.speaker === 'creature' ? b.name : undefined })
    }
  }
  for (const [speaker, emote] of FINALE_CAST) out.push({ speaker, emote })
  return out
}

describe('the portrait strips (§8.27)', () => {
  it('give every face the script shows a panel to be painted in', () => {
    for (const f of scriptedFaces()) {
      const set = portraitSetOf(f.speaker, f.creature)
      expect(set, `${f.speaker} ${f.creature ?? ''}`).toBeTruthy()
      expect(set!.emotes, `${f.speaker}:${f.emote}`).toContain(f.emote)
    }
  })

  it('paint no expression nobody ever sees', () => {
    const seen = new Set(scriptedFaces().map((f) => `${f.creature ?? f.speaker}:${f.emote}`))
    for (const p of PORTRAIT_SETS) {
      for (const e of p.emotes) expect(seen.has(`${p.who}:${e}`), `${p.who}:${e}`).toBe(true)
    }
  })

  it('keep a strip\'s panels in the Emote order, one row the slicer can cut', () => {
    for (const p of PORTRAIT_SETS) {
      const idx = p.emotes.map((e) => EMOTE_ORDER.indexOf(e))
      expect(idx).toEqual([...idx].sort((a, b) => a - b))
      expect(p.emotes.length).toBeGreaterThan(0)
      expect(p.emotes.length).toBeLessThanOrEqual(5)
    }
    expect(PORTRAIT_SHEETS.map((s) => s.frames)).toEqual(PORTRAIT_SETS.map((p) => p.emotes.length))
  })

  it('file each strip where the portrait badge probes for it', () => {
    for (const [i, s] of PORTRAIT_SHEETS.entries()) {
      expect(s.kind).toBe('portrait')
      expect(s.id).toBe(portraitArtId(PORTRAIT_SETS[i]!.who))
      expect(s.target).toBe(artTarget('portrait', s.id))
    }
  })
})

describe('the keepsake badges and the islands (§8.27)', () => {
  it('give every keepsake on the shelf a painting', () => {
    // The crown's and the star's badges draw their S6 item paintings.
    const covered = new Set<string>([...KEEPSAKE_ICON_SLUGS, 'flowerCrown', 'petStar'])
    for (const c of COSMETICS) expect(covered.has(c.slug), c.slug).toBe(true)
    expect(ITEM_ART.crown.id).toBe('flower-crown')
    expect(ITEM_ART.petStar.id).toBe('pet-star')
    expect(KEEPSAKE_SHEETS.map((s) => s.target)).toEqual(KEEPSAKE_ICON_SLUGS.map((k) => artTarget('cosmetic', keepsakeArtId(k))))
  })

  it('give every chapter theme its island, anchored by the top the duelists stand on', () => {
    expect(ISLAND_SLUGS).toHaveLength(ARENA_THEMES.length)
    expect(ISLAND_SHEETS).toHaveLength(ARENA_THEMES.length)
    ISLAND_SHEETS.forEach((s, c) => {
      expect(s.anchor).toBe('top')
      expect(s.target).toBe(artTarget('island', islandArtId(c)))
    })
    expect(ART_FOLDERS.island).toBe('images/islands')
  })
})

describe('the intro\'s pages (§8.26)', () => {
  it('have one painting per page, the last two beats sharing the restored meadow', () => {
    expect(STORY_SHEETS).toHaveLength(STORY_PANELS.length)
    expect(storyArtId(3)).toBe(storyArtId(4))
    expect(new Set([0, 1, 2, 3].map(storyArtId)).size).toBe(4)
    for (const s of STORY_SHEETS) expect(s.target).toBe(artTarget('story', s.id))
  })

  it('list the character models BEFORE the reference, so the desk attaches them first', () => {
    const jobs = parsePromptDoc(promptDocs()['PROMPTS-STORY.md']!, 'x') as Job[]
    expect(jobs).toHaveLength(STORY_SHEETS.length)
    for (const [i, j] of jobs.entries()) {
      expect(j.refName).toBe(`${STORY_SHEETS[i]!.file}.png`)
      expect(j.also).toEqual(STORY_SHEETS[i]!.also)
      expect(j.also).toContain('painted/portrait-aurora.png')
      // The models are the paintings the portrait strips are sliced from.
      for (const a of j.also) expect(PORTRAIT_SHEETS.some((p) => `painted/${p.file}.png` === a)).toBe(true)
    }
    expect(jobs[1]!.also).toContain('painted/portrait-umbra.png')
  })
})

describe('every new family\'s brief', () => {
  const docs = promptDocs()
  const parse = (name: string): Job[] => parsePromptDoc(docs[name]!, name) as Job[]

  it('keys the keyed families on magenta and keeps the pages full-bleed', () => {
    for (const name of ['PROMPTS-PORTRAITS.md', 'PROMPTS-ISLANDS.md']) {
      for (const j of parse(name)) {
        expect(j.prompt.startsWith('WHAT COMES BACK')).toBe(true)
        expect(j.prompt).toContain('EXACTLY #FF00FF')
        expect(j.prompt.trim().split('\n').at(-1)).toMatch(/^OUTPUT: /)
      }
    }
    for (const j of parse('PROMPTS-STORY.md')) {
      expect(j.prompt).toContain('IT FILLS THE IMAGE')
      expect(j.prompt).not.toContain('#FF00FF')
      expect(j.prompt.trim().split('\n').at(-1)).toMatch(/^OUTPUT: .*16:9/)
    }
  })

  it('gives the characters the character rules, and nothing else them', () => {
    const chibi = ACTIVE_STYLE.character[0]!
    for (const j of [...parse('PROMPTS-PORTRAITS.md'), ...parse('PROMPTS-STORY.md')]) expect(j.prompt).toContain(chibi)
    for (const j of [...parse('PROMPTS-ISLANDS.md'), ...parse('PROMPTS-ITEMS.md')]) expect(j.prompt).not.toContain(chibi)
  })

  it('never asks for a portrait ring or a backdrop, and keeps an island\'s top', () => {
    for (const j of parse('PROMPTS-PORTRAITS.md')) expect(j.prompt).toContain('no badge, no ring, no frame')
    for (const j of parse('PROMPTS-ISLANDS.md')) expect(j.prompt).toContain('KEEP THE TOP')
  })

  it('is written in the one active style', () => {
    for (const name of ['PROMPTS-PORTRAITS.md', 'PROMPTS-ISLANDS.md', 'PROMPTS-STORY.md']) {
      for (const j of parse(name)) expect(j.prompt).toContain(ACTIVE_STYLE.headline)
    }
    expect(ART_STYLE_ID).toBe(ACTIVE_STYLE.id)
    // The items document still carries the original eight, first.
    expect(parse('PROMPTS-ITEMS.md').slice(0, ITEM_SHEETS.length).map((j) => j.refName)).toEqual(ITEM_SHEETS.map((s) => `${s.file}.png`))
  })
})
