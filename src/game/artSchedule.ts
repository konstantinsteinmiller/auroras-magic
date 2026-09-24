/**
 * artSchedule.ts — WHICH paintings go on the wire, and WHEN (story-spec §9.13;
 * art-generation-pipeline LOADING.md). The one place the loading order lives.
 *
 * A first-time player does not see the map first: a fresh save boots straight
 * into node 0's DUEL (retention item 2), the picture book plays at the first
 * tap on a waiting gift, and chapter 2 is five duels and five cleanings away.
 * So the splash waits for what that duel draws — and for nothing else — and
 * every later screen's paintings go out one stage ahead of the child, in the
 * order she will meet them.
 *
 *   ┌────────┬────────┬──────────────────────────────────────────┬───────────────────────────────┐
 *   │ stage  │ lane   │ what                                     │ when                          │
 *   ├────────┼────────┼──────────────────────────────────────────┼───────────────────────────────┤
 *   │ HOLD   │ high   │ what THIS screen draws, for THIS save    │ the splash waits for it (the  │
 *   │        │        │ (fresh save: node 0's duel)              │ first screen); later screens  │
 *   │        │        │                                          │ get it at once, uncapped      │
 *   │ NEXT   │ normal │ the screens right after it: the win's    │ after the hold, ≤ 4 at a time │
 *   │        │        │ gift, the map page it lands on, the      │                               │
 *   │        │        │ picture book (first time), the cleaning  │                               │
 *   │ SOON   │ low    │ the next node: its duel page, its        │ idle time, ≤ 2 at a time,     │
 *   │        │        │ dialogue faces; the wardrobe off the map │ never beside a faster lane;   │
 *   │        │        │                                          │ skipped under Save-Data       │
 *   │ AHEAD  │ low    │ chapter c+1: its page, thumbnails, props │ entering chapter c's 4th node │
 *   │        │        │ and creatures, island, first duel page,  │ or its boss — only ever the   │
 *   │        │        │ first dialogue's faces                   │ chapter after her frontier    │
 *   └────────┴────────┴──────────────────────────────────────────┴───────────────────────────────┘
 *
 * Every screen is planned by `planFor(screen, save)`, which is pure: the same
 * table runs for a fresh player, a returning one in chapter 7 and a test. The
 * lanes themselves — the concurrency caps, the promotion of a painting that
 * turns out to be needed now, the idle gate — are `art.ts`'s queue.
 *
 * DERIVED, NEVER LISTED. A screen's paintings are read off the same data the
 * screen is drawn from: a node's runes from the campaign's rune mask and its
 * foe, its faces from its dialogue script, its gift and tool from the node
 * tables, and a sector's live props and creatures by RECORDING what its
 * painters ask `spriteFor` for (`recordArtWants`). A kit that gains a
 * butterfly, a script that gains a speaker, a node that gains a keepsake — the
 * schedule follows, with nothing to keep in step.
 *
 * NEVER AHEAD OF THE BOOK. A player cannot turn past her highest chapter, so
 * nothing from a chapter beyond the one after her frontier is ever
 * prefetched; a replay of an old chapter prefetches nothing ahead at all.
 *
 * NEVER BLOCKING. Every stage is a prefetch: a painting that has not arrived
 * when its screen is drawn is asked for by the renderer (lane `high`, jumping
 * whatever still waits), and the drawing stands in until it lands — exactly
 * as with the art layer off.
 */
import { watch } from 'vue'
import {
  artOverridesEnabled, artSettled, holdBack, preloadArtOverrides, recordArtWants, type ArtWant, type FetchPriority
} from '@/game/art'
import {
  sectorArtId, islandArtId, pageArtId, frontPageArtId, runeArtId, RUNE_SLUGS, RIG_ART, ITEM_ART, STORY_PANELS,
  storyPanelId, portraitSetOf, portraitArtId, wardrobeArtId, WARDROBE_RUG, KEEPSAKE_ICON_SLUGS, keepsakeArtId, MOVIE_ICON
} from '@/game/artIds'
import {
  nodeChapter, nodePosInChapter, nodeIsBoss, toolOf, runeForNode, duelSetup, STARTING_RUNES, LAST_BUILT_NODE,
  COSMETICS, COSMETIC_SLOTS, NODES, GIFTS
} from '@/game/campaign/tables'
import { nextDuelNode, pendingSectorNode, type CampaignState } from '@/game/campaign/state'
import { dialogueFor, thanksLines, OPENING_NODE, type Bubble } from '@/game/story/story'
import { FOES } from '@/game/duel/foes'
import { BADGE_ART } from '@/game/map/badge'
import { BOOKMARK_ART } from '@/game/flow/pageTurn'
import { flowHud } from '@/use/useFlow'
import type { SceneId } from '@/game/flow/scene'

/* ─────────────────────────────── the inputs ─────────────────────────────── */

/** The slice of a save the schedule reads. `CampaignState` satisfies it. */
export type ScheduleSave = Pick<
  CampaignState,
  'furthestNode' | 'sectorsDone' | 'introSeen' | 'runesUnlocked' | 'giftsEquipped' | 'giftsOwned'
>

/** A screen being entered: a scene and the node it concerns (−1: none). */
export interface Screen { scene: SceneId; node: number; mode?: 'campaign' | 'versus' }

/** What the device looks like: which orientation's paintings, and whether the
 *  duel's letterbox shows the cloth at all. */
export interface ScheduleEnv { portrait: boolean; clothInDuel: boolean }

/** The four stages of one screen's plan, each in the order it goes out. */
export interface Plan {
  hold: ArtWant[]
  next: ArtWant[]
  soon: ArtWant[]
  ahead: ArtWant[]
  /** Sectors whose painters must be RECORDED into a stage: `[node, how]`. */
  record: { hold: SectorRec[]; next: SectorRec[]; soon: SectorRec[]; ahead: SectorRec[] }
  /** The chapter AHEAD prefetches, or −1. */
  aheadChapter: number
}

/**
 * A sector painter to record: `rest` is how the dust layer and a locked map
 * card draw it (props still, creature hidden); `alive` is a restored sector —
 * the cleaning's reveal, a done card, the picture book's meadow.
 */
export type SectorRec = readonly [number, 'rest' | 'alive']

/* ───────────────────────────── what screens draw ────────────────────────── */

const CLOTH: ArtWant = ['page', 'cover-cloth']
const RIG: ArtWant[] = Object.values(RIG_ART).map((a): ArtWant => [a.kind, a.id])
const BADGE: ArtWant = [BADGE_ART.kind, BADGE_ART.id]
const BOOKMARK: ArtWant = [BOOKMARK_ART.kind, BOOKMARK_ART.id]
const item = (a: { kind: ArtWant[0]; id: string }): ArtWant => [a.kind, a.id]
const lastBuiltChapter = (): number => nodeChapter(LAST_BUILT_NODE)

/** Aurora's portrait is painted only while she wears nothing it would hide
 *  (`portrait.ts` `auroraBare`): head, neck, mane and skin all empty. */
const auroraBare = (save: ScheduleSave): boolean =>
  (['head', 'neck', 'mane', 'skin'] as const).every((slot) => (save.giftsEquipped[COSMETIC_SLOTS.indexOf(slot)] ?? -1) < 0)

/** The portrait strips a run of dialogue shows. */
export const facesOf = (lines: readonly Bubble[], save: ScheduleSave): ArtWant[] => {
  const out: ArtWant[] = []
  for (const b of lines) {
    if (b.speaker === 'aurora' && !auroraBare(save)) continue
    const set = portraitSetOf(b.speaker, b.name ?? 'Twig')
    if (set) out.push(['portrait', portraitArtId(set.who)])
  }
  return out
}

/** The rune icons a node's duel HUD can show: hers, plus the foe's magic. */
export const runesOf = (n: number, save: ScheduleSave): ArtWant[] => {
  const setup = duelSetup(n)
  const magic = setup.usesMagic && FOES[setup.foe]!.magic >= 0 ? 1 << FOES[setup.foe]!.magic : 0
  const mask = save.runesUnlocked | STARTING_RUNES | magic
  return RUNE_SLUGS.map((_, k) => k).filter((k) => (mask >> k) & 1).map((k): ArtWant => ['rune', runeArtId(k)])
}

/** The keepsake stills painted onto Aurora's rig, as worn. */
const wornStills = (save: ScheduleSave): ArtWant[] => {
  const out: ArtWant[] = []
  for (const id of save.giftsEquipped) {
    const slug = id >= 0 ? COSMETICS[id]?.slug : undefined
    if (slug === 'flowerCrown') out.push(item(ITEM_ART.crown))
    if (slug === 'petStar') out.push(item(ITEM_ART.petStar))
  }
  return out
}

/** A keepsake's shelf badge, when it has a painting. */
const keepsakeIcon = (cosmeticId: number): ArtWant[] => {
  const slug = COSMETICS[cosmeticId]?.slug
  if (!slug) return []
  if (slug === 'flowerCrown') return [item(ITEM_ART.crown)]
  if (slug === 'petStar') return [item(ITEM_ART.petStar)]
  return (KEEPSAKE_ICON_SLUGS as readonly string[]).includes(slug) ? [['cosmetic', keepsakeArtId(slug)]] : []
}

/** The keepsake node `n`'s chest gives, or −1. */
const keepsakeOf = (n: number): number => {
  const g = NODES[n]?.giftId
  const def = g === null || g === undefined ? undefined : GIFTS[g]
  return def?.kind === 'cosmetic' && def.cosmeticId !== undefined ? def.cosmeticId : -1
}

/** The closed gift node `n` leaves on the map and in the cleaning. */
const giftOf = (n: number): ArtWant =>
  item(nodeIsBoss(n) ? ITEM_ART.chest : toolOf(n) === 'eraser' ? ITEM_ART.boxGift : ITEM_ART.gift)

/** Node `n`'s DUEL: the page it is fought on, the island, the two duelists,
 *  the HUD's runes — and, on the cold boot's node, the opener's faces. */
export const duelWants = (n: number, save: ScheduleSave, env: ScheduleEnv): ArtWant[] => [
  ['sector', sectorArtId(n)],
  ['island', islandArtId(nodeChapter(n))],
  ...RIG,
  ...wornStills(save),
  ...runesOf(n, save),
  ...(n === OPENING_NODE ? facesOf(dialogueFor(n), save) : []),
  ...(env.clothInDuel ? [CLOTH] : [])
]

/** The WIN: the gift that drops on the island, a boss's thank-you, and the
 *  gift (a boss's chest) that then waits on her map card. */
export const winWants = (n: number, save: ScheduleSave): ArtWant[] => [
  item(toolOf(n) === 'eraser' ? ITEM_ART.boxGift : ITEM_ART.gift),
  ...facesOf(thanksLines(n), save),
  giftOf(n)
]

/** A chapter's BOOK PAGE: its painting, its five cards, the book's chrome. */
export const pageWants = (c: number, save: ScheduleSave, env: ScheduleEnv): ArtWant[] => {
  const pend = pendingSectorNode(save as CampaignState)
  return [
    CLOTH,
    ['page', pageArtId(c, env.portrait)],
    ...[0, 1, 2, 3, 4].map((i): ArtWant => ['sectorThumb', sectorArtId(c * 5 + i)]),
    BADGE,
    BOOKMARK,
    // The guardian's silhouette on a locked card is the duelists' rig.
    ...RIG,
    ...(pend !== null && nodeChapter(pend) === c ? [giftOf(pend)] : []),
    // Chapter 1's page faces the FRONT page, and the book glides across it.
    ...(c === 0 ? [['page', frontPageArtId(env.portrait)] as ArtWant, item(ITEM_ART.tent)] : [])
  ]
}

/** The book's FRONT page, where the first win lands: the knoll and the tent. */
export const frontWants = (env: ScheduleEnv): ArtWant[] =>
  [CLOTH, ['page', frontPageArtId(env.portrait)], item(ITEM_ART.tent), BOOKMARK]

/** The picture book (§8.26): its four pages, over the first sector's meadow. */
export const introWants = (): ArtWant[] => [
  ...STORY_PANELS.map((_, i): ArtWant => ['story', storyPanelId(i)]),
  ['sector', sectorArtId(0)],
  item(ITEM_ART.sponge),
  ...RIG,
  CLOTH
]

/** Node `n`'s CLEANING: the page, the gift, the tool, what the chest gives. */
export const cleaningWants = (n: number): ArtWant[] => {
  const tool = toolOf(n)
  const rune = runeForNode(n)
  const keep = keepsakeOf(n)
  return [
    ['sector', sectorArtId(n)],
    CLOTH,
    giftOf(n),
    ...(tool === 'brush' ? [item(ITEM_ART.sponge)] : tool === 'eraser' ? [item(ITEM_ART.eraser)] : []),
    ...(rune !== null ? [['rune', runeArtId(rune)] as ArtWant] : []),
    ...(keep >= 0 ? keepsakeIcon(keep) : []),
    // The Twin Gift's rewarded button waits on the map after the reveal.
    item(MOVIE_ICON)
  ]
}

/** The Wardrobe Kiosk: the room in this orientation, the rug, the shelf. */
export const wardrobeWants = (save: ScheduleSave, env: ScheduleEnv): ArtWant[] => {
  const owned: ArtWant[] = []
  for (let id = 0; id < COSMETICS.length; id++) if ((save.giftsOwned >> id) & 1) owned.push(...keepsakeIcon(id))
  // The shelf's rewarded unlocks wear the movie camera.
  return [['wardrobe', wardrobeArtId(env.portrait)], item(WARDROBE_RUG), ...RIG, ...owned, item(MOVIE_ICON)]
}

/** A node's DIALOGUE: printed on its chapter's page, with its speakers' faces. */
export const dialogueWants = (n: number, save: ScheduleSave, env: ScheduleEnv): ArtWant[] =>
  [...pageWants(nodeChapter(n), save, env), ...facesOf(dialogueFor(n), save)]

/** Everything chapter `c` shows first: its page, the first duel, the first faces. */
export const chapterWants = (c: number, save: ScheduleSave, env: ScheduleEnv): ArtWant[] => [
  ...pageWants(c, save, env),
  ['island', islandArtId(c)],
  ['sector', sectorArtId(c * 5)],
  ...facesOf(dialogueFor(c * 5), save)
]

/* ──────────────────────────────── the table ─────────────────────────────── */

/**
 * The chapter AHEAD to prefetch when node `n` is entered, or −1: chapter
 * c + 1 once she stands on chapter c's fourth node or its boss — and only
 * when c is her FRONTIER (the chapter of the next node she has not won). A
 * replay of an old chapter prefetches nothing, and nothing past the chapter
 * after her frontier is ever asked for.
 */
export const aheadChapterFor = (n: number, save: ScheduleSave): number => {
  if (n < 0) return -1
  const c = nodeChapter(n)
  const frontier = nodeChapter(nextDuelNode(save as CampaignState))
  if (c !== frontier || nodePosInChapter(n) < 3 || c + 1 > lastBuiltChapter()) return -1
  return c + 1
}

/** The furthest chapter the schedule may ever touch for this save. */
export const chapterLimit = (save: ScheduleSave): number =>
  Math.min(lastBuiltChapter(), nodeChapter(nextDuelNode(save as CampaignState)) + 1)

/** Where a save boots (`flow/nodes.ts` `startFromSave`), predicted from the
 *  save alone so the first screen's paintings can go out before the game's
 *  code has even arrived. The real first scene corrects it. */
export const bootScreenOf = (save: ScheduleSave): Screen => {
  const pend = pendingSectorNode(save as CampaignState)
  if (pend !== null) return { scene: 'map', node: pend }
  const next = nextDuelNode(save as CampaignState)
  if (save.furthestNode >= LAST_BUILT_NODE || next > LAST_BUILT_NODE) return { scene: 'map', node: -1 }
  if (next === OPENING_NODE || !dialogueFor(next).length) return { scene: 'duel', node: next }
  return { scene: 'dialogue', node: next }
}

const empty = (): Plan => ({
  hold: [], next: [], soon: [], ahead: [], aheadChapter: -1,
  record: { hold: [], next: [], soon: [], ahead: [] }
})

/** The next node she will play from here (her frontier), if it is built. */
const upNext = (save: ScheduleSave): number => {
  const n = nextDuelNode(save as CampaignState)
  return n <= LAST_BUILT_NODE && save.furthestNode < LAST_BUILT_NODE ? n : -1
}

/**
 * THE SCHEDULE: what entering `screen` puts on the wire, stage by stage.
 * Pure — a function of the screen, the save and the device.
 */
export const planFor = (screen: Screen, save: ScheduleSave, env: ScheduleEnv): Plan => {
  const p = empty()
  const n = screen.node
  const cap = chapterLimit(save)
  const ahead = (from: number): void => {
    const c = aheadChapterFor(from, save)
    if (c < 0 || c > cap) return
    p.aheadChapter = c
    p.ahead.push(...chapterWants(c, save, env))
    for (let i = 0; i < 5; i++) p.record.ahead.push([c * 5 + i, 'rest'])
  }
  /** The next node's own screens, for SOON: its dialogue's faces and the page
   *  its duel is fought on. */
  const soonNode = (k: number): void => {
    if (k < 0 || k > LAST_BUILT_NODE || nodeChapter(k) > cap) return
    p.soon.push(['sector', sectorArtId(k)], ...facesOf(dialogueFor(k), save))
    p.record.soon.push([k, 'rest'])
  }

  if (screen.mode === 'versus' || (screen.scene === 'duel' && n < 0) || screen.scene === 'versusSetup') {
    // Local 2P: the Festival's island and the two duelists; no page.
    p.hold.push(['island', islandArtId(9)], ...RIG)
    return p
  }

  switch (screen.scene) {
    case 'duel': {
      p.hold.push(...duelWants(n, save, env))
      p.record.hold.push([n, 'rest'])
      // The win, then where it lands: node 0's win lands on the FRONT page
      // (the book falls open there and turns itself to chapter 1), any other
      // on its own chapter's page, where the gift now waits.
      p.next.push(...winWants(n, save))
      if (n === OPENING_NODE) p.next.push(...frontWants(env))
      p.next.push(...pageWants(nodeChapter(n), save, env))
      p.record.next.push(...[0, 1, 2, 3, 4].map((i): SectorRec => [nodeChapter(n) * 5 + i, 'rest']))
      // The gift's tap: the picture book first, once — then the cleaning.
      if (!save.introSeen) {
        p.next.push(...introWants())
        p.record.next.push([0, 'alive'])
      }
      p.next.push(...cleaningWants(n))
      p.record.next.push([n, 'alive'])
      const keep = keepsakeOf(n)
      if (keep >= 0) p.next.push(...wardrobeWants({ ...save, giftsOwned: save.giftsOwned | (1 << keep) }, env))
      soonNode(n + 1)
      ahead(n)
      break
    }
    case 'dialogue': {
      p.hold.push(...dialogueWants(n, save, env))
      p.record.hold.push(...[0, 1, 2, 3, 4].map((i): SectorRec => [nodeChapter(n) * 5 + i, 'rest']))
      p.next.push(...duelWants(n, save, env), ...winWants(n, save))
      p.record.next.push([n, 'rest'])
      p.soon.push(...cleaningWants(n))
      p.record.soon.push([n, 'alive'])
      ahead(n)
      break
    }
    case 'map': {
      const pend = pendingSectorNode(save as CampaignState)
      const next = upNext(save)
      // The page on show: the focused node's chapter, else the one `focusMap`
      // opens by default — her frontier's (the last page, for a finished book).
      const focus = n >= 0 ? n : pend !== null ? pend : Math.max(0, Math.min(LAST_BUILT_NODE, save.furthestNode + 1))
      const c = Math.min(nodeChapter(focus), cap)
      // Node 0's win lands on the FRONT page and never focuses a card, so the
      // book is on its knoll when the map opens there.
      if (n === OPENING_NODE) p.hold.push(...frontWants(env))
      p.hold.push(...pageWants(c, save, env))
      p.record.hold.push(...[0, 1, 2, 3, 4].map((i): SectorRec => [c * 5 + i, 'rest']))
      if (pend !== null) {
        // A gift is waiting: its tap opens the book (first time), then the cleaning.
        if (!save.introSeen) {
          p.next.push(...introWants())
          p.record.next.push([0, 'alive'])
        }
        p.next.push(...cleaningWants(pend))
        p.record.next.push([pend, 'alive'])
      } else if (next >= 0) {
        p.next.push(...dialogueWants(next, save, env), ...duelWants(next, save, env))
        p.record.next.push([next, 'rest'])
      }
      // The tent stands on the front page, one turn away.
      p.soon.push(...wardrobeWants(save, env))
      if (next >= 0) ahead(next)
      break
    }
    case 'intro': {
      p.hold.push(...introWants())
      p.record.hold.push([0, 'alive'])
      const pend = pendingSectorNode(save as CampaignState)
      if (pend !== null) {
        p.next.push(...cleaningWants(pend))
        p.record.next.push([pend, 'alive'])
      }
      break
    }
    case 'unbox':
    case 'wipe': {
      p.hold.push(...cleaningWants(n))
      p.record.hold.push([n, 'alive'])
      // Back to the book after the reveal — through the wardrobe when the
      // chest gave a keepsake — and on to the next node from there.
      const keep = keepsakeOf(n)
      if (keep >= 0) p.next.push(...wardrobeWants({ ...save, giftsOwned: save.giftsOwned | (1 << keep) }, env))
      p.next.push(...pageWants(nodeChapter(n), save, env))
      const next = upNext(save)
      if (next >= 0 && next !== n) {
        p.soon.push(...dialogueWants(next, save, env), ...duelWants(next, save, env))
        p.record.soon.push([next, 'rest'])
        ahead(next)
      }
      break
    }
    case 'wardrobe': {
      p.hold.push(...wardrobeWants(save, env))
      const next = upNext(save)
      if (next >= 0) p.next.push(...pageWants(Math.min(nodeChapter(next), cap), save, env))
      break
    }
    default:
      break
  }
  return p
}

/* ─────────────────────── recording a sector's painters ──────────────────── */

type G2D = CanvasRenderingContext2D

/**
 * A context that draws nothing and answers everything — so a painter can be
 * run for the questions it asks (`recordArtWants`) without a canvas, a pixel
 * or a DOM. Any property is another such stub; any number read off it is 0.
 */
const nullContext = (): G2D => {
  const stub: unknown = new Proxy(function () { /* nothing */ }, {
    get: (_t, k) => {
      if (k === Symbol.toPrimitive) return () => 0
      if (k === Symbol.iterator) return function * () { /* empty */ }
      if (k === 'then') return undefined
      return stub
    },
    apply: () => stub,
    construct: () => stub as object,
    set: () => true
  })
  return stub as G2D
}

type SectorsModule = typeof import('@/game/map/sectors')
let sectorsMod: Promise<SectorsModule> | null = null
const recorded = new Map<string, ArtWant[]>()

/**
 * What sector `n`'s painters ask for, `how` it is drawn: its props, its tap
 * creature and its rescue. Recorded once per (node, how). Several clock
 * values, because a prop can have a moment (a fish that leaps every few
 * seconds) that a single frame would miss.
 */
export const recordSector = async (n: number, how: 'rest' | 'alive'): Promise<ArtWant[]> => {
  const key = `${n}:${how}`
  const hit = recorded.get(key)
  if (hit) return hit
  sectorsMod ??= import('@/game/map/sectors')
  const { sectorOf } = await sectorsMod
  const sec = sectorOf(n)
  const g = nullContext()
  const wants = recordArtWants(() => {
    if (how === 'rest') {
      sec.props(g, 0, 0)
      sec.tap?.draw(g, 0, 0)
      sec.rescue?.draw(g, 0, 0)
      return
    }
    for (const t of [0, 0.7, 1.9, 3.3, 5.1, 8.3]) {
      sec.props(g, t, 1)
      sec.tap?.draw(g, t % 1, t)
      sec.rescue?.draw(g, 1, t)
    }
    sec.tap?.draw(g, 1, 0)
  })
  recorded.set(key, wants)
  return wants
}

/** Every recording a stage asks for. A failure (the sector code would not
 *  load) costs only the recorded part: the stage's own list still goes out. */
const recordAll = async (recs: readonly SectorRec[]): Promise<ArtWant[]> => {
  const out: ArtWant[] = []
  try {
    for (const [n, how] of recs) if (n >= 0 && n <= LAST_BUILT_NODE) out.push(...await recordSector(n, how))
  } catch (e) {
    console.warn('[art] could not record a sector\'s paintings; they load when drawn', e)
  }
  return out
}

/* ─────────────────────────────── the runtime ────────────────────────────── */

/** Is the player asking the browser to spare her data? Then SOON and AHEAD
 *  wait for the screen that needs them, like everything did before staging. */
const saveData = (): boolean => {
  const c = (globalThis.navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } } | undefined)?.connection
  return !!c && (c.saveData === true || /(^|-)2g$/.test(c.effectiveType ?? ''))
}

/** This device, now. The duel's stage is 16:9; the cloth shows only in the
 *  bars around it (or under the portrait pad). */
export const currentEnv = (): ScheduleEnv => {
  const w = typeof window !== 'undefined' ? window.innerWidth : 1280
  const h = typeof window !== 'undefined' ? window.innerHeight : 720
  const portrait = h > w
  const bars = Math.max(w - (h * 16) / 9, h - (w * 9) / 16)
  return { portrait, clothInDuel: portrait || bars > 12 }
}

interface LogEntry { t: number; scene: SceneId; node: number; stage: string; wants: string[] }
const log: LogEntry[] = []
const qa = typeof window !== 'undefined' && (window as unknown as { __AM_QA__?: boolean }).__AM_QA__ === true
const note = (screen: Screen, stage: string, wants: readonly ArtWant[]): void => {
  if (!qa || !wants.length) return
  log.push({ t: Math.round(performance.now()), scene: screen.scene, node: screen.node, stage, wants: wants.map(([k, i]) => `${k}/${i}`) })
}

const request = (wants: readonly ArtWant[], lane: FetchPriority): void => {
  for (const [kind, id] of wants) void artSettled(kind, id, lane)
}

/** Put a screen's NEXT, SOON and AHEAD stages in their lanes, in order. */
const enqueueAfterHold = async (screen: Screen, plan: Plan): Promise<void> => {
  const next = [...plan.next, ...await recordAll(plan.record.next)]
  request(next, 'normal')
  note(screen, 'next', next)
  if (saveData()) return
  const soon = [...plan.soon, ...await recordAll(plan.record.soon)]
  request(soon, 'low')
  note(screen, 'soon', soon)
  const ahead = [...plan.ahead, ...await recordAll(plan.record.ahead)]
  request(ahead, 'low')
  note(screen, `ahead:${plan.aheadChapter}`, ahead)
}

type DuelStateModule = typeof import('@/game/duel/state')
let duelState: DuelStateModule | null = null
/** The live campaign once the game has booted; the persisted one before. */
const liveSave = (fallback: ScheduleSave): ScheduleSave => duelState?.S.campaign ?? fallback

let installed = false
let bootSave: ScheduleSave | null = null
/** Resolves with the first real scene the game boots into. */
let firstScene: Promise<Screen> | null = null

/** Watch the scene mirror; every screen after the first is planned on entry. */
const install = (): Promise<Screen> => {
  if (firstScene) return firstScene
  installed = true
  let resolveFirst: (s: Screen) => void = () => {}
  firstScene = new Promise<Screen>((r) => { resolveFirst = r })
  let booted = false
  watch(
    () => [flowHud.scene, flowHud.node, flowHud.mode] as const,
    ([scene, node, mode]) => {
      if (scene === 'boot') return
      const screen: Screen = { scene, node, mode }
      if (!booted) {
        booted = true
        resolveFirst(screen)
        return
      }
      if (!artOverridesEnabled()) return
      void onScreen(screen)
    },
    { immediate: true }
  )
  return firstScene
}

/** A later screen: its hold at once (promoting anything still waiting), then
 *  the stages behind it. */
const onScreen = async (screen: Screen): Promise<void> => {
  const save = liveSave(bootSave!)
  const plan = planFor(screen, save, currentEnv())
  const hold = [...plan.hold, ...await recordAll(plan.record.hold)]
  request(hold, 'high')
  note(screen, 'hold', hold)
  await enqueueAfterHold(screen, plan)
}

/** The cloth under a duel that shows none of it: its draw-time asks wait. */
let releaseCloth: (() => void) | null = null
let prefetched = false

/**
 * STEP 1 of the splash's wait: PREDICT the first screen from the save and put
 * its paintings on the wire now. Called by `main.ts` the moment the save has
 * hydrated — before `App.vue` is even imported — so the first screen's page,
 * island, duelists, runes and faces travel alongside the game's own code and
 * are usually decoded before the scene mounts: its first bake is already the
 * painted one. Idempotent; with the art layer off, asks for nothing.
 */
export const prefetchFirstScreen = (save: ScheduleSave): void => {
  if (prefetched || !artOverridesEnabled()) return
  prefetched = true
  bootSave = save
  const env = currentEnv()
  const predicted = bootScreenOf(save)
  // The duel paints the cloth under its stage every frame; in a 16:9 view no
  // letterbox shows it, and 187 kB of weave must not ride beside the hold.
  if (predicted.scene === 'duel' && !env.clothInDuel) releaseCloth = holdBack(CLOTH[0], CLOTH[1])
  const early = planFor(predicted, save, env)
  request(early.hold, 'high')
  note(predicted, 'hold:predicted', early.hold)
}

/**
 * THE SPLASH'S WAIT: the paintings of the first screen this save boots into.
 *
 * Two steps, so the wire is never idle while the game's own code downloads:
 *
 *   1. PREDICTED from the save (`prefetchFirstScreen`, from `main.ts` as soon
 *      as the save is readable) and requested at once;
 *   2. CONFIRMED against the scene the game really booted into, plus the
 *      props and creatures its painters ask for (recorded, which needs the
 *      sector code), and awaited.
 *
 * Only then do the NEXT, SOON and AHEAD stages go out, so nothing competes
 * with the splash. Never rejects; with the art layer off, asks for nothing.
 */
export const holdFirstScreen = async (
  save: ScheduleSave, onProgress?: (done: number, total: number) => void
): Promise<void> => {
  if (!artOverridesEnabled()) return
  prefetchFirstScreen(save)
  const booted = install()
  try {
    const [screen, mod] = await Promise.all([booted, import('@/game/duel/state').catch(() => null)])
    duelState = mod
    const live = liveSave(bootSave ?? save)
    const plan = planFor(screen, live, currentEnv())
    const hold = [...plan.hold, ...await recordAll(plan.record.hold)]
    note(screen, 'hold', hold)
    await preloadArtOverrides(hold, onProgress, 'high')
    void enqueueAfterHold(screen, plan)
  } finally {
    releaseCloth?.()
    releaseCloth = null
  }
}

/** Has the schedule been started (the art layer was on at boot)? */
export const artScheduleInstalled = (): boolean => installed

/** Resolves once the game has booted into its first real scene (at once if
 *  the schedule was never started). */
export const firstSceneBooted = async (): Promise<void> => { await firstScene }

if (qa) {
  ;(window as unknown as Record<string, unknown>).__artSchedule = {
    log: () => log,
    plan: (scene: SceneId, node: number) => planFor({ scene, node }, liveSave(bootSave ?? duelState!.S.campaign), currentEnv())
  }
}
