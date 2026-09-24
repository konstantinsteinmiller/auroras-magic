// The duel's HP bar as a child meets it: DOM (`components/duel/HpBar.vue`).
//
// The arithmetic is pinned in `hpGauge.test.ts`. What is left to go wrong is
// the wiring: a notch drawn at the wrong end of the foe's bar, a glow class
// that never lands, a pulse that ignores reduced motion — and the drawn
// frame's colours drifting away from the reference the painter was given.

import { afterEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { mount } from '@vue/test-utils'
import HpBar from '@/components/duel/HpBar.vue'
import { reducedMotion } from '@/use/useAccessibility'
import { REF_PAINT, paintedSlices, SLICE_L, SLICE_R_IN, END, WIN_X0, WIN_END_IN, WIN_R } from '@/game/duel/hpFrame'
import { gaugeFill, writeGauge } from '@/game/duel/hpGauge'

const bar = (props: Record<string, unknown> = {}) =>
  mount(HpBar, { props: { side: 'left', name: 'AURORA', label: 'AURORA', ...props } })

afterEach(() => { reducedMotion.value = false })

describe('the notches', () => {
  it('stand at a quarter, a half and three quarters — on the track, on the fill and on the chip', () => {
    const w = bar()
    for (const layer of ['.on-track', '.hp-fill', '.hp-ghost']) {
      const marks = w.findAll(`${layer} .hp-mark`)
      expect(marks.map((m) => (m.element as HTMLElement).style.left), layer).toEqual(['25%', '50%', '75%'])
    }
    // The half is the one the eye finds first.
    expect(w.findAll('.hp-fill .hp-mark.half')).toHaveLength(1)
  })

  it('count from the foe\'s own end of her bar', () => {
    const w = bar({ side: 'right', name: 'UMBRA', label: 'UMBRA' })
    const marks = w.findAll('.hp-fill .hp-mark').map((m) => (m.element as HTMLElement).style)
    expect(marks.map((s) => s.right)).toEqual(['25%', '50%', '75%'])
    expect(marks.every((s) => s.left === '')).toBe(true)
  })
})

describe('the fill, as the hot path writes it', () => {
  it('clips to the HP, and keeps its sliver cap only while there is HP', () => {
    const w = bar()
    const fill = w.find('.hp-fill').element as HTMLElement
    // The cap is the very next thing after the fill: the stylesheet hides it
    // with `.hp-fill.empty + .hp-fill-cap`.
    expect(fill.nextElementSibling?.classList.contains('hp-fill-cap')).toBe(true)
    writeGauge(fill, gaugeFill(0.3, 100), 'left')
    expect(fill.classList.contains('empty')).toBe(false)
    expect(fill.style.visibility).toBe('visible')
    writeGauge(fill, gaugeFill(0, 100), 'left')
    expect(fill.classList.contains('empty')).toBe(true)
    expect(fill.style.visibility).toBe('hidden')
  })
})

describe('the low-health glow', () => {
  it('is absent on a healthy bar', () => {
    const w = bar()
    expect(w.find('.hp-glow').exists()).toBe(false)
    expect(w.classes()).not.toContain('low-1')
  })

  it('glows at level 1 and pulses at level 2', () => {
    expect(bar({ low: 1 }).classes()).toContain('low-1')
    const w = bar({ low: 2 })
    expect(w.classes()).toContain('low-2')
    expect(w.find('.hp-glow').exists()).toBe(true)
    expect(w.classes()).not.toContain('still')
  })

  it('holds still under reduced motion', () => {
    reducedMotion.value = true
    const w = bar({ low: 2 })
    expect(w.classes()).toEqual(expect.arrayContaining(['low-2', 'still']))
  })
})

describe('the frame', () => {
  it('is drawn, name plate and all, while no painting is on', () => {
    const w = bar()
    expect(w.find('.hp-rail').exists()).toBe(true)
    expect(w.findAll('svg.hp-cap')).toHaveLength(2)
    expect(w.find('.hp-frame-art').exists()).toBe(false)
    expect(w.find('.hp-plate .hp-name').text()).toBe('AURORA')
    expect(w.attributes('aria-label')).toBe('AURORA')
    expect(w.classes()).toEqual(expect.arrayContaining(['left', 'aurora']))
  })

  it('wears the night frame on the right, with the foe\'s halo', () => {
    const w = bar({ side: 'right', name: 'UMBRA', label: 'UMBRA', tint: '#b7f' })
    expect(w.classes()).toEqual(expect.arrayContaining(['right', 'foe']))
    expect(w.find('.hp-halo').exists()).toBe(true)
  })

  it('slices the painting on plain rail, clear of both ends', () => {
    // Left of the near slice: the medallion and the track's round end.
    expect(SLICE_L).toBeGreaterThan(WIN_X0 + WIN_R)
    // Right of the far slice: the track's round end and the finial.
    expect(SLICE_R_IN).toBeGreaterThan(WIN_END_IN + WIN_R)
    // …and a real stretch of rail between them in the reference.
    expect(END - SLICE_R_IN - SLICE_L).toBeGreaterThan(1)
    const s = paintedSlices()
    for (const k of [s.top, s.bottom, s.near, s.far]) {
      expect(k).toBeGreaterThan(0)
      expect(k).toBeLessThan(0.5)
    }
    expect(s.near + s.far).toBeLessThan(1)
    expect(s.top + s.bottom).toBeLessThan(1)
  })

  it('draws its reference in the very colours its tokens hold', () => {
    const sass = readFileSync(resolve(__dirname, '../../src/assets/css/theme.sass'), 'utf-8')
    const token = (name: string): string => {
      const m = new RegExp(`^\\s*--${name}:\\s*(#[0-9A-Fa-f]{3,8})\\s*$`, 'm').exec(sass)
      expect(m, name).toBeTruthy()
      return m![1]!.toUpperCase()
    }
    const same: Record<string, string> = {
      'am-gold': REF_PAINT.aurora.ring,
      'am-gold-lite': REF_PAINT.aurora.ringLite,
      'am-gold-foot': REF_PAINT.aurora.ringShade,
      'am-paper': REF_PAINT.aurora.disc,
      'am-parchment': REF_PAINT.aurora.discShade,
      'am-moon-silver': REF_PAINT.foe.ring,
      'am-moon-silver-lite': REF_PAINT.foe.ringLite,
      'am-moon-silver-shade': REF_PAINT.foe.ringShade,
      'am-moon-night': REF_PAINT.foe.disc,
      'am-moon-night-deep': REF_PAINT.foe.discShade,
      'am-moon-stone': REF_PAINT.foe.bead,
      'am-ink': REF_PAINT.aurora.ink
    }
    for (const [name, hex] of Object.entries(same)) expect(token(name), name).toBe(hex.toUpperCase())
  })
})
