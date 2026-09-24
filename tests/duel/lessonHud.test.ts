// The first duel's lesson, the locked-shape card and the rune chips as the
// player MEETS them: DOM. The rules are pinned in `lesson.test.ts`; what is
// left to go wrong is the wiring — a cast button that looks live while the
// lesson holds it shut, a card that reaches the screen as a raw i18n key, a
// spotlight cut somewhere other than round her slots.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createI18n } from 'vue-i18n'
import en from '@/i18n/locales/en'

// The HP plates and the help note bake portraits on a canvas, which jsdom
// does not have; their pixels are not what is under test here.
vi.mock('@/game/story/portrait', () => ({ portraitUrl: () => 'data:,' }))

import DuelHud from '@/components/duel/DuelHud.vue'
import RuneChips from '@/components/duel/RuneChips.vue'
import LockedRuneHint from '@/components/duel/LockedRuneHint.vue'
import DuelLightbox from '@/components/duel/DuelLightbox.vue'
import { hud } from '@/use/useDuelHud'
import { LESSON } from '@/game/duel/lesson'
import { EARTH, FIRE, PH_DUEL, WATER } from '@/game/duel/config'

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en: en as never } })
const global = { plugins: [i18n] }

afterEach(() => {
  hud.intro = false
  hud.introStep = 0
  hud.queue = []
  hud.locked = 0
  hud.lockedRune = -1
  hud.chips = 0
})

describe('the cast button through the lesson', () => {
  const castBtn = (w: ReturnType<typeof mount>) => w.find('button.cast-btn')

  it('is dimmed with a lock — not hidden — while the lesson holds it shut', async () => {
    hud.phase = PH_DUEL
    hud.intro = true
    hud.introStep = LESSON.SQUARE
    hud.queue = [FIRE]
    const w = mount(DuelHud, { props: { muted: false, keyboard: false, paused: false }, global })
    await nextTick()
    const b = castBtn(w)
    expect(b.exists()).toBe(true)
    expect(b.classes()).toContain('locked')
    expect(b.classes()).not.toContain('live')
    expect(b.attributes('aria-disabled')).toBe('true')
    expect(b.find('.cast-lock').exists()).toBe(true)
    // …and says what to draw instead, as words.
    expect(w.text()).toContain(en.intro.square)
    expect(w.text()).toContain(en.intro.twoRunes)
    w.unmount()
  })

  it('opens, live and inviting, at beat D', async () => {
    hud.phase = PH_DUEL
    hud.intro = true
    hud.introStep = LESSON.CAST
    hud.queue = [FIRE, EARTH]
    const w = mount(DuelHud, { props: { muted: false, keyboard: false, paused: false }, global })
    await nextTick()
    const b = castBtn(w)
    expect(b.classes()).toEqual(expect.arrayContaining(['live', 'invite']))
    expect(b.attributes('aria-disabled')).toBeUndefined()
    expect(b.find('.cast-invite').exists()).toBe(true)
    expect(b.find('.cast-lock').exists()).toBe(false)
    expect(w.text()).toContain(en.intro.cast)
    w.unmount()
  })

  it('lights her slots and raises the lightbox at beat C', async () => {
    hud.phase = PH_DUEL
    hud.intro = true
    hud.introStep = LESSON.LIGHTBOX
    hud.queue = [FIRE, EARTH]
    const w = mount(DuelHud, { props: { muted: false, keyboard: false, paused: false }, global })
    await nextTick()
    expect(w.findAll('[data-my-slot].lesson-lit').length).toBe(2)
    expect(w.find('.lesson-lightbox').exists()).toBe(true)
    w.unmount()
  })

  it('shows the idle prompt in gold once the lesson is over', async () => {
    hud.phase = PH_DUEL
    hud.intro = false
    hud.queue = []
    const w = mount(DuelHud, { props: { muted: false, keyboard: false, paused: false }, global })
    await nextTick()
    const prompt = w.find('.prompt')
    expect(prompt.text()).toBe(en.hud.drawARune)
    expect(prompt.attributes('style')).toContain('var(--am-gold)')
    w.unmount()
  })
})

describe('the locked-shape card', () => {
  it('names the rune with its icon, a lock and "coming soon"', () => {
    hud.locked = 1
    hud.lockedRune = WATER
    hud.lockedX = 640
    hud.lockedY = 122
    const w = mount(LockedRuneHint, { props: { portrait: false }, global })
    expect(w.text()).toContain(en.duel.comingSoon)
    expect(w.attributes('aria-label')).toBe('The Water rune is coming soon')
    expect(w.find('.rune-glyph').exists()).toBe(true)
    expect(w.find('.lh-lock .game-icon').exists()).toBe(true)
    expect(w.text()).not.toContain('duel.')
  })
})

describe('the rune chips', () => {
  it('show exactly the known runes, each named for a screen reader', () => {
    const w = mount(RuneChips, { props: { mask: (1 << FIRE) | (1 << EARTH), portrait: false }, global })
    const chips = w.findAll('.rune-chip')
    expect(chips.length).toBe(2)
    expect(chips.map((c) => c.attributes('aria-label'))).toEqual([en.rune.fire, en.rune.earth])
  })
})

describe('the lightbox', () => {
  it('cuts its spotlight round her filled slots', async () => {
    hud.queue = [FIRE, EARTH]
    const host = document.createElement('div')
    host.className = 'duel-hud'
    document.body.appendChild(host)
    const rect = (x: number) => ({ left: x, top: 80, right: x + 60, bottom: 140, width: 60, height: 60, x, y: 80, toJSON: () => ({}) }) as DOMRect
    for (const x of [30, 94, 158]) {
      const s = document.createElement('div')
      s.setAttribute('data-my-slot', '')
      s.getBoundingClientRect = () => rect(x)
      host.appendChild(s)
    }
    host.getBoundingClientRect = () => ({ left: 0, top: 0, right: 1280, bottom: 720, width: 1280, height: 720, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect
    const w = mount(DuelLightbox, { attachTo: host, global })
    await nextTick()
    await nextTick()
    const hole = w.find('.lb-hole')
    expect(hole.exists()).toBe(true)
    const st = hole.attributes('style') ?? ''
    // Two slots (30..154) and a pad of 0.24 × 60 = 14.4 on each side.
    expect(st).toContain('left: 15.6px')
    expect(st).toContain('width: 152.8px')
    w.unmount()
    host.remove()
  })
})
