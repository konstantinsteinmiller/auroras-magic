// @vitest-environment node
// The duel's VS preview as painted art (art-roadmap.md, 2026-09-25): eight
// sheets in three kinds that already exist — the backdrop (`page`), the two
// podiums (`island`), the ribbons, the medallion and the crown (`worldUi`).
// These pin what drifts silently:
//
//   • an id the preview asks for that the manifest files anywhere else — the
//     painting is then never found, and nothing says so;
//   • a ribbon slice that falls on its ornament — a painted star a little
//     bigger than the drawn one is cut, and its tip stretched across the name;
//   • a podium spec in a unit the bench cannot measure — its box came out as
//     the whole measuring canvas: a crop of the podium on the sheet, and a
//     painting a ninth of its size in the game;
//   • a backdrop brief whose seam is not the layout's, or that lets a round
//     thing into a picture the game stretches to every screen;
//   • a medallion brief that lets the painter letter it.

import { describe, expect, it } from 'vitest'
import {
  promptDocs, manifestTargets, sheetRows, PREVIEW_SHEETS, PREVIEW_BACKDROP_SHEETS, PREVIEW_BACKDROP_LONG
} from '@/game/artSheet'
import { VS_PREVIEW_ART } from '@/game/artIds'
import { artTarget } from '@/game/artFolders'
import { ACTIVE_STYLE } from '@/game/artStyle'
import { NEUTRAL } from '@/game/artTint'
import {
  PREVIEW_DOM_ART, PREVIEW_CANVAS_ART, VS_BACKDROP_KIND, VS_PODIUM_KIND, VS_PODIUM_IDS, VS_BACKDROP_REF_LONG,
  vsBackdropArtId, SEAM_LAND, SEAM_PORT, PODIUM_ART, PODIUM_UNIT
} from '@/game/preview/previewArt'
import { RIBBON_IDS, ribbonParts, SLICE_X, SLICE_AIR, TAIL, CAP, END } from '@/components/preview/ribbonFrame'
import { MARK_IDS } from '@/components/preview/vsMarks'
// @ts-expect-error — a plain .mjs tool, parsed the way the desk parses
import { parsePromptDoc } from '../../tools/art-desk/jobs.mjs'

type Job = { title: string; refName: string; also: string[]; target: string | null; prompt: string }

const jobs = (): Job[] => parsePromptDoc(promptDocs()['PROMPTS-PREVIEW.md']!, 'x') as Job[]
const jobOf = (id: string): Job => {
  const j = jobs().find((x) => x.refName === `${id}.png`)
  expect(j, id).toBeTruthy()
  return j!
}

describe('the VS preview\'s paintings', () => {
  it('are filed where the preview asks for them, in the kinds it asks in', () => {
    const asked = [...PREVIEW_DOM_ART, ...PREVIEW_CANVAS_ART].map(([k, id]) => `${k}/${id}`).sort()
    const filed = Object.values(VS_PREVIEW_ART).map(({ kind, id }) => `${kind}/${id}`).sort()
    expect(asked).toEqual(filed)
    expect(VS_BACKDROP_KIND).toBe('page')
    expect(VS_PODIUM_KIND).toBe('island')
    expect(RIBBON_IDS).toEqual({ aurora: VS_PREVIEW_ART.ribbonAurora.id, foe: VS_PREVIEW_ART.ribbonFoe.id })
    expect(MARK_IDS).toEqual({ emblem: VS_PREVIEW_ART.emblem.id, crown: VS_PREVIEW_ART.crown.id })
    expect(VS_PODIUM_IDS).toEqual({ dawn: VS_PREVIEW_ART.podiumDawn.id, night: VS_PREVIEW_ART.podiumNight.id })
    expect([vsBackdropArtId(false), vsBackdropArtId(true)]).toEqual([VS_PREVIEW_ART.backdropLand.id, VS_PREVIEW_ART.backdropPort.id])
    const targets = manifestTargets()
    for (const { kind, id } of Object.values(VS_PREVIEW_ART)) expect(targets.get(artTarget(kind, id))).toEqual({ kind, id })
    // One reference each, named by its id: the stems the desk queues.
    const rows = sheetRows().filter((r) => r.family === 'preview')
    expect(rows.map((r) => r.file).sort()).toEqual(Object.values(VS_PREVIEW_ART).map((p) => p.id).sort())
    expect(PREVIEW_BACKDROP_LONG).toBe(VS_BACKDROP_REF_LONG)
    expect(PREVIEW_BACKDROP_SHEETS.map((s) => [s.w, s.h])).toEqual([[1152, 648], [648, 1152]])
  })

  it('slice a ribbon on plain satin, well clear of its ornaments', () => {
    expect(SLICE_X).toBeCloseTo(TAIL + CAP + SLICE_AIR, 9)
    for (const side of ['aurora', 'foe'] as const) {
      const parts = ribbonParts(side)
      const orn = parts.filter((p) => p.paint.startsWith('orn')).flatMap((p) => p.pts.map(([x]) => x))
      // The left end's ornaments, and the right end's (mirrored about the middle).
      expect(Math.max(...orn.filter((x) => x < END / 2)), side).toBeLessThan(SLICE_X - 0.1)
      expect(Math.min(...orn.filter((x) => x > END / 2)), side).toBeGreaterThan(END - SLICE_X + 0.1)
      // The tails and folds, behind the band's ends, never reach the stretch.
      const behind = parts.filter((p) => /^(tail|fold)/.test(p.paint)).flatMap((p) => p.pts.map(([x]) => x))
      expect(Math.max(...behind.filter((x) => x < END / 2)), side).toBeLessThan(SLICE_X)
    }
  })

  it('measure a podium in a unit the bench can hold', () => {
    // A recording context: the extent of every shape the spec draws at the
    // bench's 120 px a unit (`artBox.measureBox` measures on a canvas ±320 px
    // across and stops growing at ±1280).
    let x0 = Infinity
    let x1 = -Infinity
    let y0 = Infinity
    let y1 = -Infinity
    const at = (x: number, y: number): void => {
      x0 = Math.min(x0, x)
      x1 = Math.max(x1, x)
      y0 = Math.min(y0, y)
      y1 = Math.max(y1, y)
    }
    const g = new Proxy({}, {
      get: (_, k) => {
        if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => ({ addColorStop: () => {} })
        if (k === 'arc') return (x: number, y: number, r: number) => { at(x - r, y - r); at(x + r, y + r) }
        if (k === 'ellipse') return (x: number, y: number, rx: number, ry: number) => { at(x - rx, y - ry); at(x + rx, y + ry) }
        if (k === 'rect') return (x: number, y: number, w: number, h: number) => { at(x, y); at(x + w, y + h) }
        if (k === 'moveTo' || k === 'lineTo') return (x: number, y: number) => at(x, y)
        if (k === 'quadraticCurveTo') return (_cx: number, _cy: number, x: number, y: number) => at(x, y)
        return () => {}
      },
      set: () => true
    }) as unknown as CanvasRenderingContext2D
    for (const spec of [PODIUM_ART.dawn, PODIUM_ART.night]) {
      x0 = y0 = Infinity
      x1 = y1 = -Infinity
      spec.draw(g, 120, 0, NEUTRAL)
      expect(Math.max(-x0, x1, -y0, y1), spec.id).toBeLessThan(320)
      // …and it is the whole podium, not a sliver of it: ±97 stage units.
      expect(((x1 - x0) / 120) * PODIUM_UNIT, spec.id).toBeGreaterThan(180)
    }
  })

  it('brief the backdrop with the layout\'s own seam, full-bleed, and nothing round in it', () => {
    // Where each seam meets the picture's edges, from the fractions the layout,
    // the live seam light and the halves' sweep-in all use.
    const land = [SEAM_LAND.cx - (SEAM_LAND.cy * SEAM_LAND.dx) / SEAM_LAND.dy, SEAM_LAND.cx + ((1 - SEAM_LAND.cy) * SEAM_LAND.dx) / SEAM_LAND.dy]
    const port = [SEAM_PORT.cy - (SEAM_PORT.cx * SEAM_PORT.dy) / SEAM_PORT.dx, SEAM_PORT.cy + ((1 - SEAM_PORT.cx) * SEAM_PORT.dy) / SEAM_PORT.dx]
    const pc = (v: number): string => `${Math.round(v * 100)}%`
    const L = jobOf(VS_PREVIEW_ART.backdropLand.id).prompt
    const P = jobOf(VS_PREVIEW_ART.backdropPort.id).prompt
    expect(L).toContain(`TOP edge ${pc(land[0]!)} of the way across`)
    expect(L).toContain(`BOTTOM edge ${pc(land[1]!)} of the way across`)
    expect(P).toContain(`LEFT edge ${pc(port[0]!)} of the way down`)
    expect(P).toContain(`RIGHT edge ${pc(port[1]!)} of the way down`)
    for (const [p, ratio] of [[L, '16:9'], [P, '9:16']] as const) {
      expect(p.startsWith('WHAT COMES BACK')).toBe(true)
      expect(p).toContain('IT FILLS THE IMAGE')
      expect(p).not.toContain('#FF00FF')
      expect(p.trim().split('\n').at(-1)).toMatch(new RegExp(`^OUTPUT: .*${ratio}`))
      expect(p).toContain('NOTHING ROUND OR SOLID IN THE SKY')
      expect(p).toContain('no moon')
      expect(p).toContain('THE SEAM IS A CONTRACT')
      expect(p).toContain(ACTIVE_STYLE.headline)
    }
    // No style anchor: an all-sky picture has nothing to take from a meadow swatch.
    for (const s of PREVIEW_BACKDROP_SHEETS) expect(jobOf(s.id).also).toEqual([])
  })

  it('key the other six on magenta, keep the ribbons plain, the podiums\' tops flat and the medallion wordless', () => {
    const chibi = ACTIVE_STYLE.character[0]!
    for (const s of PREVIEW_SHEETS) {
      const p = jobOf(s.id).prompt
      expect(p.startsWith('WHAT COMES BACK')).toBe(true)
      expect(p).toContain('EXACTLY #FF00FF')
      expect(p).toContain('ONE UNBROKEN SHEET')
      expect(p.trim().split('\n').at(-1)).toMatch(/^OUTPUT: /)
      expect(p).not.toContain(chibi)
    }
    for (const id of [VS_PREVIEW_ART.ribbonAurora.id, VS_PREVIEW_ART.ribbonFoe.id]) {
      const p = jobOf(id).prompt
      expect(p).toContain('THE MIDDLE OF THE BAND IS PLAIN SATIN')
      expect(p).toContain('Cover both ends with your hands')
      expect(p).toContain('THE BAND IS STRAIGHT AND LEVEL')
      expect(p).toContain('NO TEXT')
    }
    for (const id of [VS_PREVIEW_ART.podiumDawn.id, VS_PREVIEW_ART.podiumNight.id]) {
      const p = jobOf(id).prompt
      expect(p).toContain('KEEP THE TOP')
      expect(p).toContain('A CLOUD HAS NO LINE')
      expect(PREVIEW_SHEETS.find((s) => s.id === id)!.anchor).toBe('top')
    }
    const medal = jobOf(VS_PREVIEW_ART.emblem.id).prompt
    expect(medal).toContain('NO TEXT OF ANY KIND')
    expect(medal).toContain('keep it WORDLESS')
    expect(medal).toContain('NOT ONE LETTER')
    // The one DOM-sized file here big enough on screen to need more than the
    // slicer's 256 px (`ItemSheet.exact`); nothing else in the family lifts it.
    expect(PREVIEW_SHEETS.filter((s) => s.exact).map((s) => s.id)).toEqual([VS_PREVIEW_ART.emblem.id])
  })
})
