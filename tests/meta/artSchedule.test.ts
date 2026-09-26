// @vitest-environment node
// The art schedule (story-spec §9.13; `src/game/artSchedule.ts`): WHICH
// paintings go on the wire WHEN. These pin the promises the table makes —
// the ones that silently rot when a scene moves or a chapter is added:
//
//   • a fresh save's splash holds for the book's PROLOGUE, the first duel
//     right behind it, and neither the map nor the rest of the book;
//   • a save back mid-first-duel holds for that DUEL, not for the map;
//   • chapter c + 1 is asked for on chapter c's fourth node and its boss;
//   • nothing past the chapter after her frontier is ever asked for;
//   • a returning save holds for the screen it boots into.

import { beforeAll, describe, expect, it } from 'vitest'
import {
  planFor, bootScreenOf, aheadChapterFor, chapterLimit, recordSector, duelWants, facesOf, cleaningWants, winWants,
  previewWants, type ScheduleSave, type ScheduleEnv, type Screen
} from '@/game/artSchedule'
import { firstArtWants } from '@/game/artPreload'
import { artProbeCount, setArtOverrides, type ArtWant } from '@/game/art'
import { defaultCampaign, type CampaignState } from '@/game/campaign/state'
import { setBit } from '@/game/campaign/bitset'
import { LAST_BUILT_NODE, nodeChapter, STARTING_RUNES, duelSetup } from '@/game/campaign/tables'
import {
  sectorArtId, sectorNodeOf, islandArtId, pageArtId, RUNE_SLUGS, runeArtId, PUPPET_ART, STORY_PANELS, storyPanelId,
  CHAPTER_SLUGS
} from '@/game/artIds'
import { dialogueFor, OPENING_NODE } from '@/game/story/story'

const LAND: ScheduleEnv = { portrait: false, clothInDuel: false }
const PORT: ScheduleEnv = { portrait: true, clothInDuel: true }

/** A save that has won every node up to `furthest`, and cleaned all but the
 *  last when `pending` (its gift still waiting). */
const saveAt = (furthest: number, pending = false): CampaignState => {
  const s = defaultCampaign()
  s.furthestNode = furthest
  for (let n = 0; n <= furthest; n++) if (!(pending && n === furthest)) s.sectorsDone = setBit(s.sectorsDone, n)
  s.introSeen = furthest >= 0
  s.prologueSeen = furthest >= 0
  return s
}

const keys = (w: readonly ArtWant[]): string[] => w.map(([k, i]) => `${k}/${i}`)

/** The chapter a chapter-bound painting belongs to, or −1 for the rest. */
const chapterOfWant = ([kind, id]: ArtWant): number => {
  if (kind === 'sector' || kind === 'sectorThumb') return nodeChapter(sectorNodeOf(id))
  // A chapter's island is `island-<n>-<slug>`; the VS preview's podiums
  // (`vs-podium-*`) stand in every chapter.
  if (kind === 'island') {
    const m = /^island-(\d+)-/.exec(id)
    return m ? Number(m[1]) - 1 : -1
  }
  if (kind === 'page' && /^page-\d+-/.test(id)) return Number(/^page-(\d+)-/.exec(id)![1]) - 1
  return -1
}

beforeAll(() => {
  // The recorder only runs with the layer on; nothing here ever FETCHES.
  setArtOverrides(true, false)
})

describe('a fresh save: the splash holds for the PROLOGUE (owner, 2026-09-24)', () => {
  const fresh = defaultCampaign()

  it('boots into the book\'s prologue', () => {
    expect(bootScreenOf(fresh)).toEqual({ scene: 'intro', node: -1 })
  })

  it('holds its two pages and the meadow, and not the rest of the book', () => {
    const hold = keys(firstArtWants(fresh, LAND))
    expect(hold).toContain(`story/${storyPanelId(0)}`)
    expect(hold).toContain(`story/${storyPanelId(1)}`)
    expect(hold).not.toContain(`story/${storyPanelId(2)}`)
    expect(hold).not.toContain(`story/${storyPanelId(3)}`)
    expect(hold).toContain(`sector/${sectorArtId(0)}`)
    // No sponge, no glove: those are the lesson's, at the first gift.
    expect(hold).not.toContain('tool/stardust-sponge')
    // The one thing past the prologue that holds too: node 0's VS PREVIEW,
    // which the prologue hands over to in five seconds (owner, 2026-09-25) —
    // its backdrop, podiums, ribbons and emblem, and the runes it shows. The
    // duel itself does not hold.
    const preview = keys(previewWants(OPENING_NODE, fresh, LAND))
    for (const k of preview) expect(hold).toContain(k)
    expect(hold).toContain('page/vs-backdrop-land')
    expect(hold).not.toContain('page/vs-backdrop-port')
    expect(hold).not.toContain(`island/${islandArtId(0)}`)
    for (const k of hold) {
      if (preview.includes(k)) continue
      expect(k).not.toMatch(/^(sectorThumb|wardrobe|gift|tool|rune)\//)
    }
  })

  it('puts node 0\'s duel right behind it, then the win, the front page and the lesson', () => {
    const plan = planFor(bootScreenOf(fresh), fresh, LAND)
    const next = keys(plan.next)
    const hold = keys(plan.hold)
    const duelHold = keys(planFor({ scene: 'duel', node: OPENING_NODE }, { ...fresh, prologueSeen: true }, LAND).hold)
    // All of it is on the wire by then: the preview's part already held,
    // the rest NEXT — and nothing asked for twice.
    for (const k of duelHold) expect([...hold, ...next]).toContain(k)
    for (const k of next) expect(hold).not.toContain(k)
    const at = (k: string): number => next.indexOf(k)
    expect(at(`island/${islandArtId(0)}`)).toBeLessThan(at('page/page-front-land'))
    expect(at('page/page-front-land')).toBeLessThan(at(`story/${storyPanelId(2)}`))
    expect(at(`story/${storyPanelId(2)}`)).toBeLessThan(at('tool/stardust-sponge'))
    // The prologue's pages are not asked for a second time.
    expect(next).not.toContain(`story/${storyPanelId(0)}`)
    expect(plan.aheadChapter).toBe(-1)
  })
})

describe('back mid-first-duel: the splash holds for the first DUEL', () => {
  const fresh = { ...defaultCampaign(), prologueSeen: true }

  it('boots into node 0\'s duel', () => {
    expect(bootScreenOf(fresh)).toEqual({ scene: 'duel', node: OPENING_NODE })
  })

  it('holds the duel\'s own paintings, and only those — behind its VS preview\'s', () => {
    const all = keys(firstArtWants(fresh, LAND))
    // Every duel opens with its VS preview, so the preview's paintings hold
    // first: this orientation's backdrop, the podiums, the DOM's ribbons and
    // emblem (no crown: Umbra is not a boss here), her runes and the foe's
    // weakness chip.
    const preview = keys(previewWants(OPENING_NODE, fresh, LAND))
    for (const k of preview) expect(all).toContain(k)
    expect(preview).toContain('page/vs-backdrop-land')
    expect(preview).toContain('island/vs-podium-dawn')
    expect(preview).toContain('island/vs-podium-night')
    expect(preview).toContain('worldUi/vs-emblem')
    expect(preview).not.toContain('worldUi/vs-crown')
    for (const k of preview) expect(k).toMatch(/^(page\/vs-|island\/vs-|worldUi\/vs-|rune\/)/)
    // The rest is the duel's own.
    const hold = all.filter((k) => !preview.includes(k))
    // The page the duel is fought on, chapter 1's island, the duelists' rig.
    expect(hold).toContain(`sector/${sectorArtId(0)}`)
    expect(hold).toContain(`island/${islandArtId(0)}`)
    // Both painted duelists, every piece: the puppet stands in only once a
    // whole set has decoded, so a set held in part is a set not shown.
    for (const set of Object.values(PUPPET_ART)) for (const r of Object.values(set)) expect(hold).toContain(`${r.kind}/${r.id}`)
    // The runes: her two (the HUD's, and the preview's row), and the foe's
    // weakness on the preview's chip — not the twelve.
    const runes = [...new Set(all.filter((k) => k.startsWith('rune/')))]
    const hers = RUNE_SLUGS.map((_, k) => k).filter((k) => (STARTING_RUNES >> k) & 1)
    const weak = duelSetup(OPENING_NODE).def.element
    expect(runes.sort()).toEqual([...new Set([...hers, weak])].map((k) => `rune/${runeArtId(k)}`).sort())
    // The opener printed over the arena: exactly its speakers' faces.
    const faces = [...new Set(keys(facesOf(dialogueFor(OPENING_NODE), fresh)))]
    expect(faces.length).toBeGreaterThan(0)
    for (const f of faces) expect(hold).toContain(f)
    // The HUD's two HP frames, on screen from the duel's first frame.
    expect(hold).toContain('worldUi/hp-frame-aurora')
    expect(hold).toContain('worldUi/hp-frame-foe')
    // …and the paper leaf it is printed on, with its lines' pictogram sets —
    // the opener's two, not all four.
    expect(hold).toContain('worldUi/dialogue-leaf')
    const sets = hold.filter((k) => k.startsWith('worldUi/picto-set-'))
    expect(sets.length).toBeGreaterThan(0)
    expect(sets.length).toBeLessThanOrEqual(2)
    // NOT the map: no page, no thumbnail, no badge, no gift, no tool, no
    // picture book, no wardrobe — none of it is drawn before the first win.
    // The HP frames and the opener's leaf and pictograms are the only
    // world-UI a duel draws.
    for (const k of hold) {
      expect(k).not.toMatch(/^(sectorThumb|story|wardrobe|gift|tool)\//)
      expect(k).not.toMatch(/^worldUi\/(?!hp-frame-|dialogue-leaf$|picto-set-)/)
      expect(k).not.toMatch(/^page\/page-/)
    }
    // 16 until the duelists were painted whole (2026-09-25): their five
    // neutral parts became two painted sets of nine — the two characters
    // the whole first screen is about.
    expect(new Set(hold).size).toBeLessThanOrEqual(29)
  })

  it('holds the cloth only when the duel\'s letterbox actually shows it', () => {
    expect(keys(firstArtWants(fresh, LAND))).not.toContain('page/cover-cloth')
    expect(keys(firstArtWants(fresh, PORT))).toContain('page/cover-cloth')
  })

  it('puts the win, the front page, chapter 1\'s page, the book\'s lesson and the cleaning NEXT', () => {
    const plan = planFor({ scene: 'duel', node: 0 }, fresh, LAND)
    const next = keys(plan.next)
    expect(next).toContain('page/page-front-land')
    expect(next).toContain(`page/${pageArtId(0, false)}`)
    for (let i = 0; i < 5; i++) expect(next).toContain(`sectorThumb/${sectorArtId(i)}`)
    // The lesson's two pages; the prologue's were met in front of this duel.
    expect(next).toContain(`story/${storyPanelId(2)}`)
    expect(next).toContain(`story/${storyPanelId(3)}`)
    expect(next).not.toContain(`story/${storyPanelId(0)}`)
    expect(next).toContain('tool/stardust-sponge')
    // …in the order she meets them: the win's gift, the page it lands on,
    // the book, then the cleaning's tool.
    const at = (k: string): number => next.indexOf(k)
    expect(at('page/page-front-land')).toBeLessThan(at(`story/${storyPanelId(2)}`))
    expect(at(`story/${storyPanelId(2)}`)).toBeLessThan(at('tool/stardust-sponge'))
    // Nothing of chapter 2 yet: node 0 is not the fourth node.
    expect(plan.aheadChapter).toBe(-1)
    expect(plan.ahead).toEqual([])
  })

  it('a seen picture book is not fetched again', () => {
    const seen = { ...fresh, introSeen: true }
    const next = keys(planFor({ scene: 'duel', node: 0 }, seen, LAND).next)
    expect(next.some((k) => k.startsWith('story/'))).toBe(false)
  })

  it('a save that never met the prologue gets all four pages at its gift', () => {
    const old = { ...fresh, prologueSeen: false, furthestNode: 0 }
    const plan = planFor({ scene: 'map', node: 0 }, old, LAND)
    for (let i = 0; i < STORY_PANELS.length; i++) expect(keys(plan.next)).toContain(`story/${storyPanelId(i)}`)
    const book = planFor({ scene: 'intro', node: -1 }, old, LAND)
    for (let i = 0; i < STORY_PANELS.length; i++) expect(keys(book.hold)).toContain(`story/${storyPanelId(i)}`)
  })
})

describe('the next chapter: on chapter c\'s 4th node or its boss', () => {
  it('asks for chapter c + 1 on node pos 3 and on the boss, and not before', () => {
    for (let c = 0; c < nodeChapter(LAST_BUILT_NODE); c++) {
      for (const pos of [0, 1, 2, 3, 4]) {
        const n = c * 5 + pos
        const save = saveAt(n - 1)
        const plan = planFor({ scene: 'duel', node: n }, save, LAND)
        if (pos >= 3) {
          expect(plan.aheadChapter, `node ${n}`).toBe(c + 1)
          const ahead = keys(plan.ahead)
          expect(ahead).toContain(`page/${pageArtId(c + 1, false)}`)
          expect(ahead).toContain(`island/${islandArtId(c + 1)}`)
          expect(ahead).toContain(`sector/${sectorArtId((c + 1) * 5)}`)
          for (let i = 0; i < 5; i++) expect(ahead).toContain(`sectorThumb/${sectorArtId((c + 1) * 5 + i)}`)
        } else {
          expect(plan.aheadChapter, `node ${n}`).toBe(-1)
        }
      }
    }
  })

  it('from the map and the dialogue too, when the next node is the 4th or the boss', () => {
    const save = saveAt(2) // nodes 0–2 done → node 3 next
    expect(planFor({ scene: 'map', node: -1 }, save, LAND).aheadChapter).toBe(1)
    expect(planFor({ scene: 'dialogue', node: 3 }, save, LAND).aheadChapter).toBe(1)
    expect(planFor({ scene: 'map', node: -1 }, saveAt(1), LAND).aheadChapter).toBe(-1)
  })

  it('a replay of an old chapter prefetches nothing ahead', () => {
    const save = saveAt(22) // frontier: chapter 5
    for (const n of [3, 4, 8, 9, 13]) expect(aheadChapterFor(n, save), `node ${n}`).toBe(-1)
    expect(planFor({ scene: 'duel', node: 3 }, save, LAND).ahead).toEqual([])
  })
})

describe('never past the chapter after her frontier', () => {
  const scenes: Screen['scene'][] = ['duel', 'dialogue', 'map', 'wipe', 'unbox', 'intro', 'wardrobe']

  it('holds for every save, every screen she can reach', () => {
    const bad: string[] = []
    for (let furthest = -1; furthest < LAST_BUILT_NODE; furthest++) {
      for (const pending of [false, true]) {
        if (pending && furthest < 0) continue
        const save = saveAt(furthest, pending)
        const limit = chapterLimit(save)
        if (limit > nodeChapter(Math.min(LAST_BUILT_NODE, furthest + 1)) + 1) bad.push(`limit ${limit} @${furthest}`)
        // Every node she can stand on: anything won, plus the next one.
        for (let n = -1; n <= Math.min(LAST_BUILT_NODE, furthest + 1); n++) {
          for (const scene of scenes) {
            // A duel with no node is local versus: the Festival's island, a
            // screen of its own that only a finished book unlocks.
            if (scene === 'duel' && n < 0) continue
            const plan = planFor({ scene, node: n }, save, LAND)
            for (const w of [...plan.hold, ...plan.next, ...plan.soon, ...plan.ahead]) {
              if (chapterOfWant(w) > limit) bad.push(`${scene} ${n} @furthest ${furthest}: ${w.join('/')}`)
            }
            for (const [node] of [...plan.record.hold, ...plan.record.next, ...plan.record.soon, ...plan.record.ahead]) {
              if (nodeChapter(node) > limit) bad.push(`${scene} ${n} @furthest ${furthest}: records node ${node}`)
            }
          }
        }
      }
    }
    expect(bad.slice(0, 10)).toEqual([])
  })
})

describe('a returning save holds for the screen it boots into', () => {
  it('chapter 3, mid-chapter: its dialogue, on chapter 3\'s page', () => {
    const save = saveAt(11) // chapter 3's first two nodes done → node 12 next
    const screen = bootScreenOf(save)
    expect(screen).toEqual({ scene: 'dialogue', node: 12 })
    const hold = keys(planFor(screen, save, LAND).hold)
    expect(hold).toContain(`page/${pageArtId(2, false)}`)
    for (let i = 10; i < 15; i++) expect(hold).toContain(`sectorThumb/${sectorArtId(i)}`)
    for (const f of keys(facesOf(dialogueFor(12), save))) expect(hold).toContain(f)
    // Not the duel's island or its page: the duel is NEXT, behind the splash.
    expect(hold).not.toContain(`island/${islandArtId(2)}`)
    expect(keys(planFor(screen, save, LAND).next)).toContain(`sector/${sectorArtId(12)}`)
    // Node 12 is chapter 3's THIRD node: chapter 4 is not due yet…
    expect(planFor(screen, save, LAND).aheadChapter).toBe(-1)
    // …and on its fourth it is.
    const later = saveAt(12)
    expect(planFor(bootScreenOf(later), later, LAND).aheadChapter).toBe(3)
  })

  it('a waiting gift: the map at its chapter, and the cleaning next', () => {
    const save = saveAt(13, true)
    const screen = bootScreenOf(save)
    expect(screen).toEqual({ scene: 'map', node: 13 })
    const plan = planFor(screen, save, LAND)
    expect(keys(plan.hold)).toContain(`page/${pageArtId(2, false)}`)
    // Chapter 3 still cleans with the sponge, so its gift is the ribboned one.
    expect(keys(plan.hold)).toContain('gift/standard-gift')
    expect(keys(plan.next)).toContain(`sector/${sectorArtId(13)}`)
  })

  it('a finished book: the map, nothing ahead', () => {
    const save = saveAt(LAST_BUILT_NODE)
    expect(bootScreenOf(save).scene).toBe('map')
    expect(planFor(bootScreenOf(save), save, LAND).aheadChapter).toBe(-1)
  })
})

describe('recording what a sector draws', () => {
  it('writes down its props and creatures, and fetches nothing', async () => {
    const before = artProbeCount()
    const rest = await recordSector(0, 'rest')
    const alive = await recordSector(0, 'alive')
    expect(artProbeCount()).toBe(before)
    for (const [kind] of [...rest, ...alive]) expect(['prop', 'creature']).toContain(kind)
    // A restored sector shows at least what its dust layer does.
    expect(alive.length).toBeGreaterThan(0)
  })

  it('every chapter\'s sectors record without throwing', async () => {
    for (let n = 0; n <= LAST_BUILT_NODE; n++) {
      await expect(recordSector(n, 'rest')).resolves.toBeInstanceOf(Array)
      await expect(recordSector(n, 'alive')).resolves.toBeInstanceOf(Array)
    }
  })
})

describe('the duel\'s runes follow the save', () => {
  it('a runes-earned save shows what she holds, and the foe\'s magic from node pos 2', () => {
    const save: ScheduleSave = { ...saveAt(6), runesUnlocked: STARTING_RUNES | (1 << 2) }
    const runes = keys(duelWants(6, save, LAND)).filter((k) => k.startsWith('rune/'))
    expect(runes).toContain(`rune/${runeArtId(2)}`)
    expect(runes.length).toBeLessThanOrEqual(4)
  })

  it('chapter slugs stay in step with the page ids the schedule builds', () => {
    for (let c = 0; c < CHAPTER_SLUGS.length; c++) expect(chapterOfWant(['page', pageArtId(c, true)])).toBe(c)
  })
})

describe('the cleaning plans what the restore draws (2026-09-24 restore pass)', () => {
  it('the tool in hand — the Sunbeam\'s two sheets on a boss, the sponge\'s twinkle with it', () => {
    const boss = keys(cleaningWants(4))
    expect(boss).toContain('tool/sunbeam')
    expect(boss).toContain('tool/sunbeam-rays')
    expect(boss).not.toContain('tool/stardust-sponge')
    const first = keys(cleaningWants(0))
    expect(first).toContain('tool/stardust-sponge')
    expect(first).toContain('prop/prop-twinkle')
    expect(first).not.toContain('tool/sunbeam')
  })

  it('the paint pot and its blob, and the Twin Gift, on every cleaning', () => {
    for (let n = 0; n <= LAST_BUILT_NODE; n++) {
      const w = keys(cleaningWants(n))
      for (const k of ['tool/paint-pot', 'tool/paint-blob', 'gift/twin-gift']) expect(w, `node ${n}`).toContain(k)
    }
  })

  it('a Signature Spell boss plans its emblem, and no other node does', () => {
    const emblems = (n: number): string[] => keys(cleaningWants(n)).filter((k) => k.startsWith('gift/emblem-'))
    for (let n = 0; n <= LAST_BUILT_NODE; n++) {
      if (n === 19) expect(emblems(n)).toEqual(['gift/emblem-crystal-ward'])
      else if (n === 39) expect(emblems(n)).toEqual(['gift/emblem-frost-lock'])
      else expect(emblems(n), `node ${n}`).toEqual([])
    }
  })

  it('a boss win drops the CHEST on the island, not a parcel', () => {
    const win = keys(winWants(4, saveAt(3)))
    expect(win).toContain('gift/boss-chest')
    expect(win).not.toContain('gift/standard-gift')
  })
})

describe('the VS preview in front of every duel (2026-09-25)', () => {
  it('plans exactly what its duel plans — the duel\'s hold already carries it', () => {
    for (const n of [0, 3, 4, 12, 24]) {
      const save = saveAt(n - 1)
      for (const env of [LAND, PORT]) {
        expect(planFor({ scene: 'preview', node: n }, save, env)).toEqual(planFor({ scene: 'duel', node: n }, save, env))
        const hold = keys(planFor({ scene: 'duel', node: n }, save, env).hold)
        for (const k of keys(previewWants(n, save, env))) expect(hold, `node ${n}`).toContain(k)
      }
    }
  })

  it('holds this orientation\'s backdrop only, and a boss\'s crown only for a boss', () => {
    const save = saveAt(3)
    const boss = keys(previewWants(4, save, PORT))
    expect(boss).toContain('page/vs-backdrop-port')
    expect(boss).not.toContain('page/vs-backdrop-land')
    expect(boss).toContain('worldUi/vs-crown')
    expect(keys(previewWants(3, saveAt(2), PORT))).not.toContain('worldUi/vs-crown')
  })

  it('shows her runes, and the foe\'s weakness and magic chips once her magic is in play', () => {
    // Chapter 2 (Bubble Bay): weak to Water, casting Water from node pos 2.
    const save = saveAt(6)
    const runes = (n: number): string[] => keys(previewWants(n, save, LAND)).filter((k) => k.startsWith('rune/'))
    expect(runes(5)).toContain(`rune/${runeArtId(5)}`)
    for (const k of RUNE_SLUGS.map((_, i) => i).filter((i) => ((save.runesUnlocked | STARTING_RUNES) >> i) & 1)) {
      expect(runes(7)).toContain(`rune/${runeArtId(k)}`)
    }
  })

  it('travels with the duel wherever the duel is planned ahead', () => {
    const save = saveAt(1)
    const pv = keys(previewWants(2, save, LAND))
    const dialogueNext = keys(planFor({ scene: 'dialogue', node: 2 }, save, LAND).next)
    for (const k of pv) expect(dialogueNext).toContain(k)
    const mapNext = keys(planFor({ scene: 'map', node: -1 }, save, LAND).next)
    for (const k of pv) expect(mapNext).toContain(k)
  })

  it('and with a versus match: after the ready screen, then held by the match', () => {
    const save = saveAt(LAST_BUILT_NODE)
    const pv = keys(previewWants(-1, save, LAND))
    expect(keys(planFor({ scene: 'versusSetup', node: -1 }, save, LAND).next)).toEqual(expect.arrayContaining(pv))
    expect(keys(planFor({ scene: 'preview', node: -1, mode: 'versus' }, save, LAND).hold)).toEqual(expect.arrayContaining(pv))
  })
})
