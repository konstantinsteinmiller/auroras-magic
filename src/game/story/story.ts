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

export type SpeakerId =
  | 'aurora' | 'umbra' | 'briar' | 'pearl' | 'zephyr' | 'terra' | 'echo' | 'prism' | 'ember' | 'glace' | 'nova' | 'creature'
export type Emote = 'happy' | 'sleepy' | 'worriedMild' | 'determined' | 'stern' | 'warmBlush' | 'cheering'
export type Picto =
  | 'forest' | 'zzz' | 'crescentMoon' | 'sparkle' | 'heart' | 'leaf' | 'thorn' | 'wave' | 'musicalNote'
  | 'musicalNoteCrossed' | 'sun' | 'cloud' | 'lightning' | 'wing' | 'duel' | 'star' | 'dustCloud' | 'cheer'
  // Chapters 4–10 (S4).
  | 'crystal' | 'mirror' | 'rainbow' | 'hourglass' | 'snowflake' | 'balloon'
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

/* ── Chapter openers and bosses, hand-written (§10.9, §10.10). Chapter 1
 *    shipped at S2; chapters 2 and 3 at S3; chapters 4–10 at S4. ── */
const OPENERS: Readonly<Record<number, readonly Bubble[]>> = {
  0: [
    b('story.c1.n1.b1', 'aurora', 'determined', ['forest', 'zzz'], 6, 'neutral'),
    b('story.c1.n1.b2', 'umbra', 'sleepy', ['crescentMoon'], 6, 'neutral'),
    b('story.c1.n1.b3', 'aurora', 'determined', ['sparkle'], 7, 'excite')
  ],
  1: [
    b('story.c2.n1.b1', 'aurora', 'worriedMild', ['wave', 'musicalNoteCrossed'], 6, 'neutral'),
    b('story.c2.n1.b2', 'umbra', 'sleepy', ['wave'], 7, 'ask'),
    b('story.c2.n1.b3', 'aurora', 'determined', ['sparkle'], 5, 'excite')
  ],
  2: [
    b('story.c3.n1.b1', 'aurora', 'worriedMild', ['cloud', 'lightning'], 7, 'neutral'),
    b('story.c3.n1.b2', 'umbra', 'sleepy', ['cloud'], 6, 'ask'),
    b('story.c3.n1.b3', 'aurora', 'determined', ['sparkle', 'cloud'], 6, 'excite')
  ],
  3: [
    b('story.c4.n1.b1', 'aurora', 'worriedMild', ['crystal', 'zzz'], 6, 'neutral'),
    b('story.c4.n1.b2', 'umbra', 'sleepy', ['crescentMoon'], 7, 'ask'),
    b('story.c4.n1.b3', 'aurora', 'determined', ['sparkle', 'crystal'], 6, 'excite')
  ],
  4: [
    b('story.c5.n1.b1', 'aurora', 'worriedMild', ['mirror', 'dustCloud'], 6, 'neutral'),
    b('story.c5.n1.b2', 'umbra', 'sleepy', ['mirror', 'crescentMoon'], 8, 'ask'),
    b('story.c5.n1.b3', 'aurora', 'determined', ['sparkle'], 5, 'excite')
  ],
  5: [
    b('story.c6.n1.b1', 'aurora', 'worriedMild', ['rainbow', 'dustCloud'], 7, 'excite'),
    b('story.c6.n1.b2', 'umbra', 'sleepy', ['dustCloud'], 6, 'neutral'),
    b('story.c6.n1.b3', 'aurora', 'determined', ['rainbow', 'sparkle'], 6, 'excite')
  ],
  6: [
    b('story.c7.n1.b1', 'aurora', 'worriedMild', ['hourglass', 'sun'], 6, 'neutral'),
    b('story.c7.n1.b2', 'umbra', 'sleepy', ['hourglass', 'crescentMoon'], 6, 'neutral'),
    b('story.c7.n1.b3', 'aurora', 'determined', ['sparkle', 'sun'], 6, 'excite')
  ],
  7: [
    b('story.c8.n1.b1', 'aurora', 'worriedMild', ['snowflake', 'star'], 6, 'excite'),
    b('story.c8.n1.b2', 'umbra', 'sleepy', ['snowflake'], 5, 'neutral'),
    b('story.c8.n1.b3', 'aurora', 'determined', ['sparkle', 'snowflake'], 6, 'excite')
  ],
  8: [
    b('story.c9.n1.b1', 'aurora', 'worriedMild', ['star', 'crescentMoon'], 6, 'excite'),
    b('story.c9.n1.b2', 'umbra', 'sleepy', ['star'], 8, 'ask'),
    b('story.c9.n1.b3', 'aurora', 'determined', ['sparkle', 'star'], 6, 'excite')
  ],
  9: [
    b('story.c10.n1.b1', 'aurora', 'happy', ['balloon', 'heart'], 6, 'excite'),
    b('story.c10.n1.b2', 'umbra', 'stern', ['crescentMoon'], 6, 'neutral'),
    b('story.c10.n1.b3', 'aurora', 'determined', ['heart', 'sparkle'], 6, 'excite')
  ]
}
const BOSSES: Readonly<Record<number, readonly Bubble[]>> = {
  0: [
    b('story.c1.n5.b1', 'briar', 'stern', ['thorn'], 5, 'excite'),
    b('story.c1.n5.b2', 'aurora', 'worriedMild', ['heart'], 7, 'excite'),
    b('story.c1.n5.b3', 'briar', 'stern', ['duel'], 5, 'excite')
  ],
  1: [
    b('story.c2.n5.b1', 'pearl', 'stern', ['wave'], 5, 'ask'),
    b('story.c2.n5.b2', 'aurora', 'happy', ['musicalNote', 'heart'], 7, 'excite'),
    b('story.c2.n5.b3', 'pearl', 'stern', ['duel'], 7, 'excite')
  ],
  2: [
    b('story.c3.n5.b1', 'zephyr', 'stern', ['lightning'], 6, 'ask'),
    b('story.c3.n5.b2', 'aurora', 'happy', ['wing', 'heart'], 7, 'excite'),
    b('story.c3.n5.b3', 'zephyr', 'stern', ['duel'], 6, 'excite')
  ],
  3: [
    b('story.c4.n5.b1', 'terra', 'stern', ['crystal'], 7, 'neutral'),
    b('story.c4.n5.b2', 'aurora', 'worriedMild', ['heart', 'sparkle'], 6, 'excite'),
    b('story.c4.n5.b3', 'terra', 'stern', ['duel'], 6, 'excite')
  ],
  4: [
    b('story.c5.n5.b1', 'echo', 'worriedMild', ['mirror'], 5, 'ask'),
    b('story.c5.n5.b2', 'aurora', 'happy', ['heart'], 6, 'ask'),
    b('story.c5.n5.b3', 'echo', 'stern', ['duel', 'mirror'], 6, 'excite')
  ],
  5: [
    b('story.c6.n5.b1', 'prism', 'stern', ['rainbow'], 7, 'excite'),
    b('story.c6.n5.b2', 'aurora', 'happy', ['heart', 'rainbow'], 7, 'excite'),
    b('story.c6.n5.b3', 'prism', 'stern', ['duel'], 6, 'excite')
  ],
  6: [
    b('story.c7.n5.b1', 'ember', 'stern', ['hourglass'], 6, 'excite'),
    b('story.c7.n5.b2', 'aurora', 'worriedMild', ['heart'], 7, 'excite'),
    b('story.c7.n5.b3', 'ember', 'stern', ['duel', 'sun'], 6, 'excite')
  ],
  7: [
    b('story.c8.n5.b1', 'glace', 'stern', ['snowflake'], 6, 'neutral'),
    b('story.c8.n5.b2', 'aurora', 'happy', ['heart'], 6, 'excite'),
    b('story.c8.n5.b3', 'glace', 'stern', ['duel'], 6, 'neutral')
  ],
  8: [
    b('story.c9.n5.b1', 'nova', 'worriedMild', ['star'], 6, 'neutral'),
    b('story.c9.n5.b2', 'aurora', 'happy', ['heart', 'star'], 5, 'excite'),
    b('story.c9.n5.b3', 'nova', 'determined', ['duel', 'star'], 7, 'excite')
  ],
  9: [
    b('story.c10.n5.b1', 'umbra', 'stern', ['crescentMoon'], 7, 'ask'),
    b('story.c10.n5.b2', 'aurora', 'worriedMild', ['heart'], 7, 'excite'),
    b('story.c10.n5.b3', 'umbra', 'stern', ['duel'], 7, 'excite')
  ]
}
const THANKS: Readonly<Record<number, readonly Bubble[]>> = {
  0: [
    b('story.c1.n5.t1', 'briar', 'happy', ['sun'], 6, 'excite'),
    b('story.c1.n5.t2', 'briar', 'warmBlush', ['heart'], 5, 'excite')
  ],
  1: [
    b('story.c2.n5.t1', 'pearl', 'happy', ['sun', 'wave'], 6, 'excite'),
    b('story.c2.n5.t2', 'pearl', 'warmBlush', ['heart'], 6, 'excite')
  ],
  2: [
    b('story.c3.n5.t1', 'zephyr', 'happy', ['sun', 'cloud'], 6, 'excite'),
    b('story.c3.n5.t2', 'zephyr', 'warmBlush', ['wing', 'heart'], 7, 'excite')
  ],
  3: [
    b('story.c4.n5.t1', 'terra', 'happy', ['crystal', 'sun'], 5, 'excite'),
    b('story.c4.n5.t2', 'terra', 'warmBlush', ['heart'], 7, 'excite')
  ],
  4: [
    b('story.c5.n5.t1', 'echo', 'happy', ['mirror', 'sparkle'], 6, 'excite'),
    b('story.c5.n5.t2', 'echo', 'warmBlush', ['heart'], 6, 'excite')
  ],
  5: [
    b('story.c6.n5.t1', 'prism', 'cheering', ['rainbow', 'sparkle'], 7, 'excite'),
    b('story.c6.n5.t2', 'prism', 'warmBlush', ['heart'], 6, 'excite')
  ],
  6: [
    b('story.c7.n5.t1', 'ember', 'happy', ['hourglass', 'sun'], 7, 'excite'),
    b('story.c7.n5.t2', 'ember', 'warmBlush', ['heart'], 7, 'excite')
  ],
  7: [
    b('story.c8.n5.t1', 'glace', 'happy', ['star', 'snowflake'], 6, 'neutral'),
    b('story.c8.n5.t2', 'glace', 'warmBlush', ['heart'], 6, 'neutral')
  ],
  8: [
    b('story.c9.n5.t1', 'nova', 'cheering', ['star', 'sparkle'], 6, 'excite'),
    b('story.c9.n5.t2', 'nova', 'warmBlush', ['heart'], 7, 'neutral')
  ],
  9: [
    b('story.c10.n5.t1', 'umbra', 'worriedMild', ['heart'], 6, 'ask'),
    b('story.c10.n5.t2', 'aurora', 'happy', ['heart', 'sparkle'], 5, 'excite'),
    b('story.c10.n5.t3', 'umbra', 'warmBlush', ['heart', 'balloon'], 6, 'neutral'),
    b('story.c10.n5.t4', 'umbra', 'cheering', ['balloon', 'star'], 7, 'excite')
  ]
}

/* ── Chapter 10's lead-up (§10.10): no filler creature — every earlier
 *    Guardian comes back to help set up the Festival, two to a node. ── */
const FESTIVAL: Readonly<Record<number, readonly Bubble[]>> = {
  1: [
    b('story.c10.n2.b1', 'briar', 'happy', ['forest', 'balloon'], 7, 'excite'),
    b('story.c10.n2.b2', 'terra', 'happy', ['crystal'], 6, 'excite')
  ],
  2: [
    b('story.c10.n3.b1', 'pearl', 'happy', ['musicalNote', 'wave'], 5, 'excite'),
    b('story.c10.n3.b2', 'echo', 'cheering', ['musicalNote'], 4, 'excite')
  ],
  3: [
    b('story.c10.n4.b1', 'prism', 'cheering', ['rainbow'], 6, 'excite'),
    b('story.c10.n4.b2', 'nova', 'happy', ['star', 'cheer'], 5, 'excite')
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
  if (ch === 9) return FESTIVAL[pos] ?? []
  return tmpl(ch, pos)
}

/** The node a cold boot opens on: the first duel of the campaign. */
export const OPENING_NODE = 0

/**
 * What a cold boot prints OVER the arena instead of playing as a scene in
 * front of it (retention-roadmap item 2).
 *
 * The WHOLE opener, not an extract: a stranger's first ten seconds decide
 * whether there is a second minute, but what cost those seconds was never the
 * three bubbles — it was standing in front of the game holding a tap hostage
 * for each one. Laid over a duel that is already drawable they cost nobody
 * anything: they turn themselves over, the first stroke takes whichever one
 * is up away with it, and a child who never waits never learns they were
 * there. So Umbra still floats in and still answers, which is the entire
 * point of the beat — the forest is asleep, and somebody did it on purpose.
 *
 * Only the chapter title page is dropped, because the arena is the page.
 */
export const openingLines = (): readonly Bubble[] => dialogueFor(OPENING_NODE)

/** A boss's thank-you, played in the arena after she is befriended (§3.2.3). */
export const thanksLines = (n: number): readonly Bubble[] => (nodeIsBoss(n) ? THANKS[nodeChapter(n)] ?? [] : [])

/** The Festival's finale card (§10.19): the whole cast together, and the face
 *  each of them wears there. */
export const FINALE_CAST: readonly (readonly [SpeakerId, Emote])[] = [
  ['briar', 'happy'], ['pearl', 'happy'], ['zephyr', 'cheering'], ['terra', 'happy'], ['echo', 'cheering'],
  ['aurora', 'cheering'], ['umbra', 'warmBlush'],
  ['prism', 'cheering'], ['ember', 'happy'], ['glace', 'happy'], ['nova', 'cheering']
]

/** Every story text key this build uses — the i18n parity test's list. */
export const STORY_KEYS: readonly string[] = [
  ...Object.values(OPENERS).flat(),
  ...Object.values(BOSSES).flat(),
  ...Object.values(THANKS).flat(),
  ...Object.values(FESTIVAL).flat(),
  ...[1, 2, 3].flatMap((p) => tmpl(0, p))
].map((x) => x.key)
