/**
 * The bubble pictograms (story-spec §10.6): 18 small, bold drawings that
 * carry a dialogue beat on their own, so a child who cannot read yet still
 * follows the story. Cel style — flat fills, one plum outline (art-style
 * §2) — on a 48 × 48 box. Rendered by `Picto.vue`.
 */
import type { Picto } from '@/game/story/story'

export interface PictoPart { d: string; fill: string; stroke?: boolean }

const star5 = (cx: number, cy: number, r: number, ir: number): string => {
  let d = ''
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = i & 1 ? ir : r
    d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)}`
  }
  return d + 'Z'
}
const HEART = 'M24 40 C10 30 6 22 8 15 C10 8 19 7 24 14 C29 7 38 8 40 15 C42 22 38 30 24 40 Z'
const CLOUD = 'M12 34 C5 34 4 25 11 23 C11 15 21 12 25 18 C28 12 39 13 38 22 C45 22 45 34 37 34 Z'

export const PICTOS: Readonly<Record<Picto, readonly PictoPart[]>> = {
  forest: [
    { d: 'M14 6 L24 24 H19 L27 38 H1 L9 24 H4 Z', fill: '#52e25e' },
    { d: 'M34 10 L44 28 H39 L46 40 H22 L29 28 H24 Z', fill: '#35b85a' },
    { d: 'M12 38 H16 V44 H12 Z M32 40 H36 V45 H32 Z', fill: '#c98a5a' }
  ],
  zzz: [
    { d: 'M6 24 H18 L8 36 H20 M24 12 H34 L26 22 H36 M36 4 H43 L37 11 H44', fill: 'none', stroke: true }
  ],
  crescentMoon: [{ d: 'M30 6 A18 18 0 1 0 42 34 A14 14 0 1 1 30 6 Z', fill: '#c7b2ff' }],
  sparkle: [
    { d: 'M24 4 C26 18 30 22 44 24 C30 26 26 30 24 44 C22 30 18 26 4 24 C18 22 22 18 24 4 Z', fill: '#fff1a0' },
    { d: 'M40 6 L41.5 10 L45 11 L41.5 12 L40 16 L38.5 12 L35 11 L38.5 10 Z', fill: '#ffd1ea' }
  ],
  heart: [{ d: HEART, fill: '#ff7fae' }],
  leaf: [
    { d: 'M8 40 C8 18 22 8 42 6 C40 28 30 40 8 40 Z', fill: '#5ce05a' },
    { d: 'M10 38 C20 28 28 20 38 10', fill: 'none', stroke: true }
  ],
  thorn: [
    { d: 'M6 40 C16 30 26 22 42 8', fill: 'none', stroke: true },
    { d: 'M14 31 L10 22 L19 27 Z M24 23 L22 13 L29 20 Z M33 15 L33 6 L38 13 Z M20 29 L29 32 L22 34 Z', fill: '#8a5a3c' }
  ],
  wave: [{ d: 'M4 30 C10 20 16 20 20 28 C24 36 30 36 34 28 C38 20 42 20 44 24 V42 H4 Z', fill: '#4fc8ff' }],
  musicalNote: [
    { d: 'M18 34 V10 L38 6 V30', fill: 'none', stroke: true },
    { d: 'M18 34 m-7 0 a7 5 0 1 0 14 0 a7 5 0 1 0 -14 0 M38 30 m-7 0 a7 5 0 1 0 14 0 a7 5 0 1 0 -14 0', fill: '#b58cff' }
  ],
  musicalNoteCrossed: [
    { d: 'M18 34 V10 L38 6 V30', fill: 'none', stroke: true },
    { d: 'M18 34 m-7 0 a7 5 0 1 0 14 0 a7 5 0 1 0 -14 0 M38 30 m-7 0 a7 5 0 1 0 14 0 a7 5 0 1 0 -14 0', fill: '#b9adc9' },
    { d: 'M6 6 L42 42', fill: 'none', stroke: true }
  ],
  sun: [
    { d: 'M24 2 V9 M24 39 V46 M2 24 H9 M39 24 H46 M8 8 L13 13 M35 35 L40 40 M8 40 L13 35 M35 13 L40 8', fill: 'none', stroke: true },
    { d: 'M24 13 A11 11 0 1 1 23.9 13 Z', fill: '#ffd34d' }
  ],
  cloud: [{ d: CLOUD, fill: '#f4f0ff' }],
  lightning: [{ d: 'M28 4 L10 27 H22 L18 44 L38 19 H26 Z', fill: '#ffd23a' }],
  wing: [{ d: 'M6 34 C8 16 22 6 42 8 C38 14 36 16 30 18 C36 20 34 24 28 26 C32 28 28 32 22 32 C18 36 12 36 6 34 Z', fill: '#fff6fb' }],
  duel: [
    { d: 'M8 40 L32 16 M40 40 L16 16', fill: 'none', stroke: true },
    { d: star5(33, 12, 8, 3.4), fill: '#ffd34d' },
    { d: star5(15, 12, 8, 3.4), fill: '#ff8fc4' }
  ],
  star: [{ d: star5(24, 25, 20, 8.5), fill: '#ffe36b' }],
  dustCloud: [
    { d: CLOUD, fill: '#9d92ad' },
    { d: 'M16 40 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0 M26 42 a2.5 2.5 0 1 0 5 0 a2.5 2.5 0 1 0 -5 0 M35 39 a1.6 1.6 0 1 0 3.2 0 a1.6 1.6 0 1 0 -3.2 0', fill: '#6e607c' }
  ],
  cheer: [
    { d: 'M24 26 L20 44 H28 Z', fill: '#c98a5a' },
    { d: 'M24 4 C30 6 34 10 36 14 C42 16 42 24 36 26 C34 32 26 34 24 30 C22 34 14 32 12 26 C6 24 6 16 12 14 C14 10 18 6 24 4 Z', fill: '#ff8fc4' }
  ]
}
