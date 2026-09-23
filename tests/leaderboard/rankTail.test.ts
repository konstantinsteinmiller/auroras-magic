import { describe, expect, it } from 'vitest'
import { createI18n } from 'vue-i18n'
import en from '@/i18n/locales/en'
import de from '@/i18n/locales/de'
import { LANGUAGES } from '@/utils/enums'
import { formatCount } from '@/utils/localeNumber'

/**
 * ─── "#1,130 of 2,531" — the badge's tail ───────────────────────────────────
 *
 * The rank badge on the storybook page is the whole leaderboard now (owner,
 * 2026-09-23: the top-100 modal and its footer are gone). What it prints in
 * words is ONE message, `leaderboard.of`, and the faults worth pinning in it
 * only show when it is RENDERED — a locale-parity suite passes on both:
 *
 *   1. `{n}` arrives as a STRING, already grouped for the player's language
 *      (`formatCount`) — that is what makes `2.531` German and `2,531`
 *      English. vue-i18n's plural selection needs a real number, so a locale
 *      that split this message on `|` would pick the wrong form silently, or
 *      print the raw pipe.
 *   2. The grouping must survive the message: the number the badge shows is
 *      the number the player's language would write.
 *
 * `leaderboard.title` is the badge's spoken name, so every locale must carry
 * it too.
 */

const i18nFor = (locale: string, messages: Record<string, unknown>) =>
  createI18n({ legacy: false, locale, fallbackLocale: 'en', messages: { [locale]: messages } })
    .global.t

describe('the badge\'s "of N" tail', () => {
  it('prints the population the way the active language groups it', () => {
    expect(i18nFor('en', en)('leaderboard.of', { n: formatCount(2531, 'en') })).toBe('of 2,531 players')
    expect(i18nFor('de', de)('leaderboard.of', { n: formatCount(2531, 'de') })).toBe('von 2.531 Spielern')
  })

  it('never pluralises on a value that arrives pre-formatted, in any shipped language', async () => {
    // Walks the project's OWN locale list, because the one locale that does
    // this is the one nobody on the team plays in.
    for (const code of LANGUAGES) {
      const mod = await import(`../../src/i18n/locales/${code}.ts`)
      const board = (mod.default as Record<string, Record<string, string>>).leaderboard
      expect(board?.of, `${code} is missing leaderboard.of`).toBeTypeOf('string')
      expect(board?.of, `${code} pluralises leaderboard.of on a pre-formatted value`).not.toContain('|')
      expect(board?.title, `${code} is missing leaderboard.title (the badge's spoken name)`).toBeTypeOf('string')
    }
  })

  it('keeps nothing the removed board used to print', async () => {
    // The modal's column heads, footer and states went with it. A key left
    // behind is a string 21 translators keep paying for.
    for (const code of LANGUAGES) {
      const mod = await import(`../../src/i18n/locales/${code}.ts`)
      const board = (mod.default as Record<string, Record<string, string>>).leaderboard
      expect(Object.keys(board ?? {}).sort(), code).toEqual(['of', 'title'])
    }
  })
})
