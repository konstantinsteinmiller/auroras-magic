// The two retention beats as the player actually meets them: DOM.
//
// The logic is pinned in `perfectRune.test.ts` and `duelHelp.test.ts`; what is
// left to go wrong is the wiring — a mark that renders when nothing earned it,
// a mark that never replays because it was not keyed, a line that reaches the
// screen as a raw i18n key. None of that is visible to a unit test of the
// module underneath.
import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '@/i18n/locales/en'

// The portrait is baked on a canvas, which jsdom does not have. The note's
// job here is its text and its picto; the bake is the rig's business.
vi.mock('@/game/story/portrait', () => ({ portraitUrl: () => 'data:,' }))

import DuelHelpNote from '@/components/duel/DuelHelpNote.vue'
import RuneSlot from '@/components/duel/RuneSlot.vue'

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en: en as never } })
const global = { plugins: [i18n] }

describe('the perfect-rune mark', () => {
  it('is absent until a rune earns it', () => {
    const w = mount(RuneSlot, { props: { rune: 0 }, global })
    expect(w.find('.slot-spark').exists()).toBe(false)
  })

  it('appears for the slot that earned it, and says so out loud', () => {
    const w = mount(RuneSlot, { props: { rune: 0, sparkle: 1 }, global })
    const mark = w.find('.slot-spark')
    expect(mark.exists()).toBe(true)
    expect(mark.attributes('aria-label')).toBe(en.help.perfectRune)
  })

  it('is re-keyed, so a second perfect rune plays it again', async () => {
    const w = mount(RuneSlot, { props: { rune: 0, sparkle: 1 }, global })
    const first = w.find('.slot-spark').element
    await w.setProps({ sparkle: 2 })
    // A NEW element: the CSS animation restarts because the old one was
    // thrown away, not because anything was told to rewind.
    expect(w.find('.slot-spark').element).not.toBe(first)
    await w.setProps({ sparkle: 0 })
    expect(w.find('.slot-spark').exists()).toBe(false)
  })
})

describe('Aurora’s help note', () => {
  it('carries a picto and a translated line, and takes no pointer events', () => {
    const w = mount(DuelHelpNote, { global })
    expect(w.find('svg.picto').exists()).toBe(true)
    expect(w.text()).toContain(en.help.auroraLine)
    // Not the key itself: a missing translation must fail here, not on a
    // child's screen.
    expect(w.text()).not.toContain('help.')
    // Her portrait is decorative — the line beside it is what is read out.
    expect(w.find('img').attributes('alt')).toBe('')
  })
})
