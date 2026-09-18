/**
 * useSpellName — the one place a spell's display name is assembled
 * (story-spec §10.12).
 *
 * Golden and Signature spells have a name of their own (`spell.<nameId>`).
 * Every other combo is named by the generator's grammar: a form-noun template
 * per kind and rune count (`spellForm.k{kind}.c{count}`), with the dominant
 * rune's name as `{A}`. Word order lives in each locale's template string, so
 * no locale needs code. The rune name is upper-cased by the LOCALE, because
 * the duel's chrome is shouted and CSS `uppercase` gets Turkish and German
 * wrong.
 */
import { RUNE_IDS } from '@/game/duel/config'

type T = (key: string, params?: Record<string, unknown>) => string

export interface SpellNameParts {
  nameId: string | null
  kind: number
  count: number
  /** The dominant rune — `{A}` in a generated name. */
  rune: number
}

export const spellName = (t: T, locale: string, s: SpellNameParts): string => {
  if (s.nameId) return t(`spell.${s.nameId}`)
  const rune = t(`rune.${RUNE_IDS[s.rune] ?? 'fire'}`).toLocaleUpperCase(locale)
  return t(`spellForm.k${s.kind}.c${Math.max(1, Math.min(3, s.count))}`, { A: rune })
}
