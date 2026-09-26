/**
 * previewHud.ts — the reactive mirror of the duel VS preview, for the Vue
 * chrome (`components/preview/DuelPreview.vue`).
 *
 * The preview is two layers, like every scene: the canvas (`previewDraw.ts`
 * — backdrop, podiums, the two duelists, glitter) and the DOM on top (the
 * ribbons with the names, the powers, the VS emblem, the countdown stars).
 * They meet HERE and nowhere else: `preview.ts` writes this object, the DOM
 * only reads it.
 *
 * Written rarely: `beat` moves at the timeline's thresholds (a handful of
 * writes per preview), `lay` on a resize, `flash` per frame only while the
 * exit flash is up (under a second). Never a per-frame mirror of the clock —
 * the DOM runs its own CSS animations off the beat classes.
 *
 * Names, epithets and captions travel as i18n KEYS (and `epithetArgs` values
 * are keys too): the DOM translates, so a language switch mid-preview simply
 * re-renders.
 */
import { reactive } from 'vue'

export type PreviewBeat =
  | 'enter' | 'ribbons' | 'vs' | 'powers' | 'hold'
  | 'count1' | 'count2' | 'count3' | 'go' | 'exit' | 'done'

export interface PreviewChip {
  kind: 'weak' | 'magic'
  /** Rune id (`duel/config.ts`). */
  rune: number
}

export interface PreviewSide {
  /** i18n KEY, e.g. `duelist.aurora`. */
  name: string
  /** i18n KEY. */
  epithet: string
  /** Interpolation for the epithet; each VALUE is an i18n key too. */
  epithetArgs?: Record<string, string>
  /** Rune ids shown as this side's powers (the hero: every rune she can draw). */
  runes: number[]
  chips: PreviewChip[]
  /** A chapter's Guardian (or Umbra at 10-5): a crown on her ribbon. */
  boss: boolean
  /** The side's accent colour — the foe's glow; '' means "use the token". */
  tint: string
}

/**
 * Everything in CSS px, in the app root's full-screen box. Computed by ONE
 * function (`preview.ts` `computePreviewLayout`), which is also what the
 * canvas draws from — so a box here is exactly where the canvas left room.
 *
 * The DOM sizes itself in `u` (below) with the ratios in `preview.ts`
 * `PREVIEW_DOM`: those ratios are the estimates the layout reserved, and the
 * unit test (`tests/preview/layout.test.ts`) proves nothing overlaps with
 * them at the five reference screens. A DOM element bigger than its ratio is
 * a DOM element that can overlap something.
 */
export interface PreviewLayout {
  w: number
  h: number
  portrait: boolean
  /** Hoof point (x, y) and the y of the horn tip. */
  hero: { x: number; y: number; head: number }
  foe: { x: number; y: number; head: number }
  /** Centre x, centre y, and the widest the ribbon may be. */
  heroRibbon: { x: number; y: number; w: number }
  foeRibbon: { x: number; y: number; w: number }
  /**
   * The powers block (epithet, caption, rune icons or chips): `x` is its
   * anchor on the `align` edge ('start' = its left edge, 'center' = its
   * centre, 'end' = its right edge), `y` is its TOP edge, `w` its max width
   * and `h` its max height — the icons wrap and shrink to fit both.
   */
  heroPowers: { x: number; y: number; w: number; h: number; align: 'start' | 'center' | 'end' }
  foePowers: { x: number; y: number; w: number; h: number; align: 'start' | 'center' | 'end' }
  /** The VS emblem: centre and radius. The three countdown stars sit under
   *  it (`PREVIEW_DOM.starsGap` / `starsH` / `starsW`). */
  vs: { x: number; y: number; r: number }
  /** The chapter banner at the top: centre and max width. */
  banner: { x: number; y: number; w: number }
  /** The rigs' scale, stage units → CSS px. */
  scale: number
  /** The DOM's size unit, CSS px: every `PREVIEW_DOM` ratio is a multiple of it. */
  u: number
  /** The seam between the two halves: a point on it (the VS centre) and its
   *  unit direction. The hero's half is the side her hoof point is on. */
  seam: { x: number; y: number; dx: number; dy: number }
  /** A free corner for the skip glyph: centre and radius (`PREVIEW_DOM.skipR`). */
  skip: { x: number; y: number; r: number }
}

const side = (): PreviewSide => ({ name: '', epithet: '', runes: [], chips: [], boss: false, tint: '' })
const box = () => ({ x: 0, y: 0, w: 0 })

export const previewHud = reactive({
  /** Mounted and running (scene `preview`). */
  live: false,
  beat: 'enter' as PreviewBeat,
  /** The game is paused (an ad, a hidden tab, a menu): CSS animations hold. */
  paused: false,
  /** A tap may skip to the exit (never the session's first preview). */
  skippable: false,
  /** 0..1, the exit flash — still painted after `done` while > 0. */
  flash: 0,
  mode: 'campaign' as 'campaign' | 'versus',
  /** Chapter index 0..9, and the node's place in it 0..4 (4 = the boss). */
  chapter: 0,
  pos: 0,
  hero: side(),
  foe: side(),
  lay: {
    w: 0, h: 0, portrait: false,
    hero: { x: 0, y: 0, head: 0 },
    foe: { x: 0, y: 0, head: 0 },
    heroRibbon: box(),
    foeRibbon: box(),
    heroPowers: { ...box(), h: 0, align: 'center' },
    foePowers: { ...box(), h: 0, align: 'center' },
    vs: { x: 0, y: 0, r: 0 },
    banner: box(),
    scale: 1,
    u: 0,
    seam: { x: 0, y: 0, dx: 0, dy: 1 },
    skip: { x: 0, y: 0, r: 0 }
  } as PreviewLayout,
  /** Bumps on every begin: the DOM keys its tree on it so CSS animations restart. */
  gen: 0
})
