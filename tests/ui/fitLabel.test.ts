// ─── `v-fit`: the word gets smaller, the box never lies ─────────────────────
//
// The directive exists because a caption that does not fit is CUT, and a cut
// word reads as a broken game rather than a long translation. What must stay
// true:
//
//   • a caption too wide for its plate comes back smaller, in one step for the
//     common one-line case;
//   • a caption that already fits is not touched at all — no inline size, so
//     the stylesheet's `clamp()` keeps governing it;
//   • a SENTENCE (a label the stylesheet lets wrap) is fitted on both axes:
//     it wraps first and shrinks second;
//   • the face's own overhang — every font's ascent plus descent is taller
//     than a 1.0 line box — must NOT read as "still does not fit". That one
//     shipped: the loss title was fitted to the floor, 55 % of its size, by a
//     height test with no slack, on a box it had already wrapped into;
//   • the floor holds. Past it the box is wrong, not the word, and something
//     a designer can see is better than something nobody can read.
//
// jsdom has no layout, so the element models one: a monospace-ish metric where
// a glyph is 0.55 em, wrapped into as many lines as the box needs, plus the
// 0.15 em the face hangs out of its own line boxes. Heights are written as
// inline px because that is what a browser hands back from `getComputedStyle`
// — it resolves an `em` limit to px, and jsdom does not.

import { describe, expect, it, vi } from 'vitest'
import { vFit } from '@/use/vFit'

interface Box {
  /** The box the label has to fit into. */
  w: number
  /** A fixed height, the way a stage-coordinate band has one. */
  h?: number
  /** …or a ceiling, the way a fluid card's title has one. */
  max?: number
  chars: number
  /** `nowrap` (a shouted word) or `normal` (a sentence). */
  wrap?: boolean
}

const label = ({ w, h, max, chars, wrap = false }: Box): HTMLElement => {
  const el = document.createElement('span')
  el.style.whiteSpace = wrap ? 'normal' : 'nowrap'
  if (h !== undefined) el.style.height = `${h}px`
  if (max !== undefined) el.style.maxHeight = `${max}px`
  el.textContent = 'x'.repeat(chars)
  const size = (): number => Number.parseFloat(el.style.fontSize || '16')
  const inkWidth = (): number => chars * 0.55 * size()
  Object.defineProperties(el, {
    clientWidth: { get: () => w },
    clientHeight: { get: () => Math.min(h ?? Infinity, max ?? Infinity, el.scrollHeight) },
    scrollWidth: { get: () => (wrap ? Math.min(w, inkWidth()) : inkWidth()) },
    scrollHeight: {
      get: () => {
        const lines = wrap ? Math.max(1, Math.ceil(inkWidth() / w)) : 1
        // 1.3 line boxes, and the face hanging 0.15 em out of the block.
        return lines * 1.3 * size() + 0.15 * size()
      }
    }
  })
  return el
}

/** Mount it the way Vue would, and report the size it settled on. */
const mount = (el: HTMLElement, base?: number): number => {
  vFit.mounted?.(el, { value: base } as never, null as never, null as never)
  return Number.parseFloat(el.style.fontSize || '0')
}

describe('v-fit', () => {
  it('leaves a caption that already fits completely alone', () => {
    const el = label({ w: 300, h: 44, chars: 6 })
    mount(el, 28)
    // The base it was given, and nothing else written over the stylesheet.
    expect(el.style.fontSize).toBe('28px')
  })

  it('shrinks a one-line caption into its plate, in one step', () => {
    // "Нажмите, чтобы начать дуэль" — 27 characters — in the seat that holds
    // "Tap to duel" in English.
    const el = label({ w: 300, h: 84, chars: 27 })
    const size = mount(el, 28)
    expect(size).toBeLessThan(28)
    expect(size * 27 * 0.55).toBeLessThanOrEqual(301)
  })

  it('never goes below 55 % of the full size, however long the word', () => {
    const el = label({ w: 60, h: 60, chars: 40 })
    expect(mount(el, 40)).toBeCloseTo(22, 1)
  })

  it('wraps a sentence first and only then shrinks it', () => {
    // The loss title's band: 472 × 92 stage px. "Zzz... nochmal versuchen?" at
    // 46 px is two lines of 120 px, so it has to come down — and the whole
    // block, overhang included, has to end up inside the 92.
    const el = label({ w: 472, h: 92, chars: 25, wrap: true })
    const size = mount(el, 46)
    expect(size).toBeLessThan(46)
    expect(size).toBeGreaterThan(46 * 0.55)
    expect(el.scrollHeight).toBeLessThanOrEqual(93)
  })

  it('does not mistake the font own overhang for a line that does not fit', () => {
    // A fluid card's title: no height of its own, a 2.8 em ceiling. One line
    // of it is 1.45 em tall against a 1.3 em line box, and a test against the
    // element's own height would read that overhang as an overflow and shrink
    // a title that fits perfectly well.
    const el = label({ w: 400, max: 2.8 * 30, chars: 12, wrap: true })
    expect(mount(el, 30)).toBe(30)
  })

  it('holds a two-line ceiling: a third line brings the size down', () => {
    const el = label({ w: 200, max: 2.8 * 30, chars: 30, wrap: true })
    const size = mount(el, 30)
    expect(size).toBeLessThan(30)
    expect(el.scrollHeight).toBeLessThanOrEqual(2.8 * 30 + 1)
  })

  it('terminates even when the browser measures the content as zero', () => {
    // `clientWidth / scrollWidth` is Infinity when the content measures zero,
    // and `Infinity - 0.06` is still Infinity: unclamped, the shrink loop
    // never reaches the floor and the directive spins forever — which does not
    // fail a test, it freezes the game on the frame the label mounts.
    const el = document.createElement('span')
    el.style.whiteSpace = 'normal'
    el.style.height = '40px'
    Object.defineProperties(el, {
      clientWidth: { get: () => 200 },
      clientHeight: { get: () => 40 },
      scrollWidth: { get: () => 0 },
      scrollHeight: { get: () => 400 }
    })
    mount(el, 30)
    // At the floor, having tried, rather than still going.
    expect(Number.parseFloat(el.style.fontSize)).toBeCloseTo(30 * 0.55, 1)
  })

  it('re-fits on a rotation, and forgets a label once it is gone', () => {
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0)
      return 0
    })
    let boxWidth = 400
    const el = document.createElement('span')
    el.style.whiteSpace = 'nowrap'
    el.style.height = '40px'
    Object.defineProperties(el, {
      clientWidth: { get: () => boxWidth },
      clientHeight: { get: () => 40 },
      scrollWidth: { get: () => 20 * 0.55 * Number.parseFloat(el.style.fontSize || '16') },
      scrollHeight: { get: () => 1.45 * Number.parseFloat(el.style.fontSize || '16') }
    })
    Object.defineProperty(el, 'isConnected', { get: () => true })
    mount(el, 30)
    expect(el.style.fontSize).toBe('30px')

    // The window turns and the plate is half as wide.
    boxWidth = 150
    window.dispatchEvent(new Event('resize'))
    expect(Number.parseFloat(el.style.fontSize)).toBeLessThan(30)

    // Unmounted, it is no longer anybody's to re-fit.
    vFit.unmounted?.(el, {} as never, null as never, null as never)
    const settled = el.style.fontSize
    boxWidth = 40
    window.dispatchEvent(new Event('resize'))
    expect(el.style.fontSize).toBe(settled)
    raf.mockRestore()
  })
})
