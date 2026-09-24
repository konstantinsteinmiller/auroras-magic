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
  promptDocs, PORTRAIT_SHEETS, ISLAND_SHEETS, KEEPSAKE_SHEETS, STORY_SHEETS, ITEM_SHEETS, PROP_SHEETS,
  WARDROBE_SHEETS, WARDROBE_ITEM_SHEETS, ART_STYLE_ID
} from '@/game/artSheet'
import {
  PORTRAIT_SETS, portraitSetOf, portraitArtId, KEEPSAKE_ICON_SLUGS, keepsakeArtId, ISLAND_SLUGS, islandArtId,
  STORY_PANELS, storyArtId, ITEM_ART, PROP_ART, EMOTE_ORDER, wardrobeArtId, WARDROBE_FLOOR, WARDROBE_RUG,
  type PropName
} from '@/game/artIds'
import { firstArtWants } from '@/game/artPreload'
import { recordSector } from '@/game/artSchedule'
// The specs themselves, from the kits — not through `artDraw`, which pulls the
// whole renderer (and a `window`) in behind it.
import {
  BUTTERFLY_ART, DUCK_ART, SAILS_ART, WATERWHEEL_ART, TWINKLE_ART, PUFF_ART, MOTE_ART, BUBBLE_ART,
  FLAG_ART, LANTERN_ART, BEE_ART, SWING_SEAT_ART, STREAK_ART, WATERFALL_ART
} from '@/game/map/kit'
import { GULL_ART, CRAB_ART, FISH_ART, BOAT_ART, BUOY_ART, KELP_ART } from '@/game/map/kitBay'
import {
  DOVE_ART, PENNANT_ART, MINI_BALLOON_ART, KITE_ART, PINWHEEL_ART, FLYER_ART, HEART_ART, STAR_ART, VANE_ART
} from '@/game/map/kitSky'
import { SWALLOW_ART, WINDSOCK_ART, CHARM_ART, RAINBOW_ARC_ART } from '@/game/map/kitRidge'
import { CAVE_LANTERN_ART, CANOE_ART, MINECART_ART, CART_WHEEL_ART } from '@/game/map/kitCaves'
import { SNOWFLAKE_ART } from '@/game/map/kitTundra'
import { BALLOON_ART, CONFETTI_ART, NOTE_ART, GONDOLA_ART } from '@/game/map/kitFestival'
import { FROND_ART, COCONUT_ART, FLAME_ART } from '@/game/map/kitSands'
import { CABIN_ART } from '@/game/map/kitMirror'
import type { ItemSpec } from '@/game/artItem'
import { ART_FOLDERS, artTarget } from '@/game/artFolders'
import { dialogueFor, thanksLines, FINALE_CAST } from '@/game/story/story'
import { COSMETICS } from '@/game/campaign/tables'
import { VECTOR_ONLY_KEEPSAKES } from '@/game/cosmetics/rig-accessories'
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
  it('give every keepsake on the shelf a painting, or declare it unpainted', () => {
    // The crown's and the star's badges draw their S6 item paintings.
    const covered = new Set<string>([...KEEPSAKE_ICON_SLUGS, 'flowerCrown', 'petStar'])
    // The second shelf (§2.4 rule 20) landed after the art catalogue closed,
    // so its fourteen draw themselves and are DECLARED unpainted rather than
    // silently missing. The two sets must not overlap and must not drift:
    // painting one means deleting its name from that list, which is what
    // makes this a to-do rather than an excuse.
    const vector = new Set(VECTOR_ONLY_KEEPSAKES)
    for (const slug of vector) expect(covered.has(slug), `${slug} is painted — drop it from the list`).toBe(false)
    for (const c of COSMETICS) expect(covered.has(c.slug) || vector.has(c.slug), c.slug).toBe(true)
    for (const slug of vector) expect(COSMETICS.some((c) => c.slug === slug), `${slug} is not a keepsake`).toBe(true)
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

const PROP_SPECS: Readonly<Record<PropName, ItemSpec>> = {
  butterfly: BUTTERFLY_ART, gull: GULL_ART, dove: DOVE_ART, duck: DUCK_ART, swallow: SWALLOW_ART,
  fish: FISH_ART, crab: CRAB_ART, sails: SAILS_ART, waterwheel: WATERWHEEL_ART,
  twinkle: TWINKLE_ART, pennant: PENNANT_ART, flag: FLAG_ART, mote: MOTE_ART, puff: PUFF_ART,
  lantern: LANTERN_ART, caveLantern: CAVE_LANTERN_ART, bubble: BUBBLE_ART, balloon: BALLOON_ART,
  snowflake: SNOWFLAKE_ART, confetti: CONFETTI_ART, miniBalloon: MINI_BALLOON_ART, boat: BOAT_ART,
  kite: KITE_ART, pinwheel: PINWHEEL_ART, note: NOTE_ART, bee: BEE_ART, windsock: WINDSOCK_ART,
  charm: CHARM_ART, frond: FROND_ART, coconuts: COCONUT_ART, flyer: FLYER_ART, buoy: BUOY_ART,
  canoe: CANOE_ART, mineCart: MINECART_ART, cartWheel: CART_WHEEL_ART, heart: HEART_ART,
  rainbowArc: RAINBOW_ARC_ART, swingSeat: SWING_SEAT_ART, cabin: CABIN_ART, star: STAR_ART,
  kelp: KELP_ART, flame: FLAME_ART, waterfall: WATERFALL_ART, streak: STREAK_ART, vane: VANE_ART,
  gondola: GONDOLA_ART
}

describe('the sectors\' live props (§8.8)', () => {
  it('paints only the props a transform carries, and no particle system or light', () => {
    expect(PROP_SHEETS.map((s) => s.id).sort()).toEqual(Object.values(PROP_ART).map((p) => p.id).sort())
    for (const s of PROP_SHEETS) {
      expect(s.kind).toBe('prop')
      expect(s.target).toBe(artTarget('prop', s.id))
      // The strip's panel count and the drawing's states are one decision:
      // a manifest that promises four panels and a spec that draws three
      // leaves the slicer cutting a panel nobody painted.
      const spec = PROP_SPECS[s.name.split(':')[1] as PropName]!
      expect(spec.frames, s.id).toBe(s.frames)
      expect(spec.id).toBe(s.id)
    }
    // What the §4b audit rules out for good, after its 2026-09-21 revision.
    // NOT particles and not lights any more — a puff, a flake and a twinkle are
    // one constant shape a transform repeats, and they are painted. These four
    // have no constant shape AT ALL: a wave that follows an arbitrary
    // shoreline polyline, a cone of light whose angle opens per frame, a ring
    // whose stroke stays put while its radius grows, and lines drawn between
    // points the sector hands over. A prop named after one is the mistake.
    for (const banned of ['lap', 'beam', 'ripple', 'constellation', 'aurora', 'reflection']) {
      expect(PROP_SHEETS.some((s) => s.id.includes(banned)), banned).toBe(false)
    }
    // And a bare GLOW stays drawn for a different reason: it is a wash with no
    // outline and no silhouette, so there is nothing to paint. What is painted
    // is the `mote`, which has a bright core — a shape — inside its glow.
    expect(PROP_SHEETS.some((s) => /glow|halo|shimmer/.test(s.id))).toBe(false)
  })

  it('holds the first screen for ITS OWN props, and streams the rest', async () => {
    // The hold once carried the ubiquitous props for a MAP-first boot, and
    // before that the whole family (~350 kB at forty-six sheets). A fresh
    // save boots into node 0's DUEL (retention item 2), whose only props are
    // the ones its page's dust layer bakes — and those are RECORDED off the
    // sector's own painters (`artSchedule.recordSector`), never listed here.
    const wants = firstArtWants().map(([kind, id]) => `${kind}/${id}`)
    expect(wants.filter((k) => k.startsWith('prop/'))).toEqual([])
    const rec = (await recordSector(0, 'rest')).map(([kind, id]) => `${kind}/${id}`)
    // If this creeps back toward the whole family the budget is gone again,
    // and nobody notices until someone measures a first load.
    const held = Object.values(PROP_ART).filter((q) => rec.includes(`${q.kind}/${q.id}`))
    expect(held.length).toBeLessThanOrEqual(10)
  })

  it('tells the painter it is drawn standing still, and how small it is', () => {
    for (const j of parsePromptDoc(promptDocs()['PROMPTS-PROPS.md']!, 'x') as Job[]) {
      expect(j.prompt).toContain('HOW BIG IT IS IN PLAY')
      expect(j.prompt).toContain('EXACTLY #FF00FF')
      expect(j.prompt.startsWith('WHAT COMES BACK')).toBe(true)
    }
  })
})

describe('the wardrobe kiosk\'s room (§3.5.4)', () => {
  it('paints the tent once per orientation, and the rug apart from it', () => {
    expect(WARDROBE_SHEETS.map((s) => s.id)).toEqual([wardrobeArtId(false), wardrobeArtId(true)])
    for (const s of WARDROBE_SHEETS) {
      expect(s.target).toBe(artTarget('wardrobe', s.id))
      // The two are a true 16:9 and 9:16 — a return re-composed to another
      // aspect cannot be cut, and those are the two a painter is asked for.
      expect(s.portrait ? s.h / s.w : s.w / s.h).toBeCloseTo(16 / 9, 2)
      expect(s.floor).toBe(s.portrait ? WARDROBE_FLOOR.port : WARDROBE_FLOOR.land)
    }
    expect(WARDROBE_ITEM_SHEETS.map((s) => s.target)).toEqual([artTarget('wardrobe', WARDROBE_RUG.id)])
    expect(ART_FOLDERS.wardrobe).toBe('images/wardrobe')
  })

  it('pins the floor line the renderer cuts the painting on', () => {
    // `drawWardrobe` blits the wall band and the floor band either side of
    // this fraction. A brief that names a different one hands back a horizon
    // the renderer then lands somewhere else again, on every screen.
    const jobs = parsePromptDoc(promptDocs()['PROMPTS-WARDROBE.md']!, 'x') as Job[]
    for (const [i, s] of WARDROBE_SHEETS.entries()) {
      expect(jobs[i]!.refName).toBe(`${s.file}.png`)
      expect(jobs[i]!.prompt).toContain(`${Math.round(s.floor * 100)}% of the way down`)
      expect(jobs[i]!.prompt).toContain('IT FILLS THE IMAGE')
      expect(jobs[i]!.prompt).not.toContain('#FF00FF')
    }
  })

  it('forbids the host painting what the game lays on top of it', () => {
    const [land, , rug] = parsePromptDoc(promptDocs()['PROMPTS-WARDROBE.md']!, 'x') as Job[]
    // Each of these is drawn over the painting every frame: a rug that moves
    // with Aurora, a halo that pulses, a corner wash that would otherwise be
    // welded into the biggest bitmap the wardrobe ships.
    expect(land!.prompt).toContain('NO RUG')
    expect(land!.prompt).toContain('NO GLOW')
    expect(land!.prompt).toContain('no vignette')
    expect(land!.prompt).toContain('THE REFERENCE IS A DIAGRAM, NOT A STYLE')
    // And the rug, which lies ON a painted floor, may bring none of it.
    expect(rug!.prompt).toContain('EXACTLY #FF00FF')
    expect(rug!.prompt).toContain('NO shadow')
  })

  it('leaves the room out of the splash: nobody opens it in the first seconds', () => {
    const wants = firstArtWants().map(([kind, id]) => `${kind}/${id}`)
    for (const s of WARDROBE_SHEETS) expect(wants).not.toContain(`wardrobe/${s.id}`)
    expect(wants).not.toContain(`${WARDROBE_RUG.kind}/${WARDROBE_RUG.id}`)
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
