/**
 * story.ts — who says what, and how, at every node (story-spec §10.6–§10.9).
 *
 * The TEXT lives in the locale files under `story.*`; everything that must
 * never be translated lives here: the speaker, the emote on the portrait,
 * the 1–2 pictograms that carry the beat for a pre-reader, and the babble's
 * rhythm (`beats`, `tone`) — fixed from the English source, so a German or
 * Thai wrap of a bubble babbles exactly like the English one (§10.11).
 *
 * Grammar (C12): portrait + emote + pictograms + optional text of ≤ 8 words.
 * Every bubble that names a problem resolves it in the same exchange.
 *
 * Nodes 2–4 of every chapter share four templates (§10.8), with the
 * chapter's filler creature as `{name}` — a transliterated proper noun, plain
 * data, never an i18n key.
 */
import { CHAPTERS, nodeChapter, nodePosInChapter, nodeIsBoss } from '@/game/campaign/tables'

export type SpeakerId = 'aurora' | 'umbra' | 'briar' | 'creature'
export type Emote = 'happy' | 'sleepy' | 'worriedMild' | 'determined' | 'stern' | 'warmBlush' | 'cheering'
export type Picto =
  | 'forest' | 'zzz' | 'crescentMoon' | 'sparkle' | 'heart' | 'leaf' | 'thorn' | 'wave' | 'musicalNote'
  | 'musicalNoteCrossed' | 'sun' | 'cloud' | 'lightning' | 'wing' | 'duel' | 'star' | 'dustCloud' | 'cheer'
export type Tone = 'neutral' | 'ask' | 'excite'

export interface Bubble {
  /** The i18n key of the (optional) text. */
  key: string
  speaker: SpeakerId
  emote: Emote
  pictos: readonly Picto[]
  /** Babble blips, 3–9, from the English source. */
  beats: number
  tone: Tone
  /** `{name}` in the text — the chapter's filler creature. */
  name?: string
}

const b = (key: string, speaker: SpeakerId, emote: Emote, pictos: Picto[], beats: number, tone: Tone): Bubble =>
  ({ key, speaker, emote, pictos, beats, tone })

/* ── Chapter openers and bosses, hand-written (§10.9). Chapter 1 ships at S2. ── */
const OPENERS: Readonly<Record<number, readonly Bubble[]>> = {
  0: [
    b('story.c1.n1.b1', 'aurora', 'determined', ['forest', 'zzz'], 6, 'neutral'),
    b('story.c1.n1.b2', 'umbra', 'sleepy', ['crescentMoon'], 6, 'neutral'),
    b('story.c1.n1.b3', 'aurora', 'determined', ['sparkle'], 7, 'excite')
  ]
}
const BOSSES: Readonly<Record<number, readonly Bubble[]>> = {
  0: [
    b('story.c1.n5.b1', 'briar', 'stern', ['thorn'], 5, 'excite'),
    b('story.c1.n5.b2', 'aurora', 'worriedMild', ['heart'], 7, 'excite'),
    b('story.c1.n5.b3', 'briar', 'stern', ['duel'], 5, 'excite')
  ]
}
const THANKS: Readonly<Record<number, readonly Bubble[]>> = {
  0: [
    b('story.c1.n5.t1', 'briar', 'happy', ['sun'], 6, 'excite'),
    b('story.c1.n5.t2', 'briar', 'warmBlush', ['heart'], 5, 'excite')
  ]
}

/* ── The shared standard-node templates (§10.8). ── */
const tmpl = (ch: number, pos: number): Bubble[] => {
  const name = CHAPTERS[ch]?.creature ?? 'Twig'
  const t = (key: string, emote: Emote, pictos: Picto[], beats: number, tone: Tone): Bubble =>
    ({ key, speaker: 'creature', emote, pictos, beats, tone, name })
  if (pos === 1) return [t('story.tmpl.curious', 'happy', ['sparkle'], 4, 'excite')]
  if (pos === 2) {
    return [
      t('story.tmpl.dusty', 'worriedMild', ['dustCloud'], 6, 'neutral'),
      { ...t('story.tmpl.cheerUp', 'cheering', ['heart'], 5, 'excite'), speaker: 'aurora' }
    ]
  }
  if (pos === 3) return [t('story.tmpl.almost', 'cheering', ['cheer'], 7, 'excite')]
  return []
}

/** The bubbles before node `n`'s duel. */
export const dialogueFor = (n: number): readonly Bubble[] => {
  const ch = nodeChapter(n)
  const pos = nodePosInChapter(n)
  if (pos === 0) return OPENERS[ch] ?? []
  if (nodeIsBoss(n)) return BOSSES[ch] ?? []
  return tmpl(ch, pos)
}

/** A boss's thank-you, played in the arena after she is befriended (§3.2.3). */
export const thanksLines = (n: number): readonly Bubble[] => (nodeIsBoss(n) ? THANKS[nodeChapter(n)] ?? [] : [])

/** Every story text key this build uses — the i18n parity test's list. */
export const STORY_KEYS: readonly string[] = [
  ...Object.values(OPENERS).flat(),
  ...Object.values(BOSSES).flat(),
  ...Object.values(THANKS).flat(),
  ...[1, 2, 3].flatMap((p) => tmpl(0, p))
].map((x) => x.key)
