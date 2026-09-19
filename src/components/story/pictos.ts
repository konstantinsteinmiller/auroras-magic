/**
 * The bubble pictograms (story-spec §10.6): 24 small, bold drawings that
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

const pts = (list: readonly (readonly [number, number])[]): string =>
  list.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('') + 'Z'

/** One pointed crystal standing on (bx, by), leaning by `a`: a light and a
 *  dark facet, so the plum line between them is the ridge. */
const crystal = (bx: number, by: number, w: number, h: number, a: number, light: string, dark: string): PictoPart[] => {
  const c = Math.cos(a)
  const s = Math.sin(a)
  const at = (x: number, y: number): [number, number] => [bx + x * c - y * s, by + x * s + y * c]
  const tip = h * 0.24
  return [
    { d: pts([at(-w / 2, 0), at(-w / 2, -h + tip), at(0, -h), at(0, 0)]), fill: light },
    { d: pts([at(0, 0), at(0, -h), at(w / 2, -h + tip), at(w / 2, 0)]), fill: dark }
  ]
}

/** A six-armed snowflake as ONE outline, so the plum line never crosses its
 *  middle: each arm a bar with one V of branches. */
const snowflake = (cx: number, cy: number): string => {
  const w = 2.5 // arm half-width
  const len = 20 // centre → arm end
  const b = 9.5 // where the branches leave the arm
  const lb = 7.5 // branch length
  const w2 = 2 // branch half-width
  const s = Math.SQRT1_2
  const t1 = w / s - w2
  const t2 = w / s + w2
  const right: [number, number][] = [
    [w, -w * Math.sqrt(3)],
    [w, -b + s * w2 - s * t1],
    [s * (w2 + lb), -b + s * w2 - s * lb],
    [s * (w2 + lb), -b - s * (w2 + lb)],
    [s * (lb - w2), -b - s * (w2 + lb)],
    [w, -b - s * w2 - s * t2],
    [w, -len]
  ]
  const arm: [number, number][] = [...right, [0, -len - w], ...right.slice(1).reverse().map(([x, y]): [number, number] => [-x, y])]
  const all: [number, number][] = []
  for (let k = 0; k < 6; k++) {
    const t = (-k * Math.PI) / 3
    const c = Math.cos(t)
    const sn = Math.sin(t)
    for (const [x, y] of arm) all.push([cx + x * c - y * sn, cy + x * sn + y * c])
  }
  return pts(all)
}

/** The part of an ellipse between two parallel lines — n·(p − c) in
 *  [lo, hi], n at angle `a` — as a polygon: a shine band across a mirror's
 *  glass that stops exactly at its rim. */
const ellipseBand = (cx: number, cy: number, rx: number, ry: number, a: number, lo: number, hi: number): string => {
  let poly: [number, number][] = []
  for (let i = 0; i < 48; i++) {
    const t = (i / 48) * Math.PI * 2
    poly.push([cx + Math.cos(t) * rx, cy + Math.sin(t) * ry])
  }
  const nx = Math.cos(a)
  const ny = Math.sin(a)
  const side = ([x, y]: [number, number]): number => (x - cx) * nx + (y - cy) * ny
  const clip = (keep: (v: number) => boolean, edge: number): void => {
    const out: [number, number][] = []
    poly.forEach((p, i) => {
      const q = poly[(i + 1) % poly.length]!
      const sp = side(p)
      const sq = side(q)
      if (keep(sp)) out.push(p)
      if (keep(sp) !== keep(sq)) {
        const t = (edge - sp) / (sq - sp)
        out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t])
      }
    })
    poly = out
  }
  clip((v) => v >= lo, lo)
  clip((v) => v <= hi, hi)
  return pts(poly)
}

/** A rainbow band: the half-annulus between radii r1 > r2 over (24, 36). */
const arch = (r1: number, r2: number): string =>
  `M${24 - r1} 36 A${r1} ${r1} 0 0 1 ${24 + r1} 36 H${24 + r2} A${r2} ${r2} 0 0 0 ${24 - r2} 36 Z`
const SMALL_CLOUD = 'M4 45 C0 45 0 38.5 4.5 38 C4.5 33 11 31.5 13.5 35 C16 32 22 33.5 21.5 38.5 C25 39 25 45 21 45 Z'
const mirrorX = (d: string): string => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x: string, y: string) => `${48 - Number(x)} ${y}`)

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
  ],
  // Chapters 4–10 (S4).
  crystal: [
    ...crystal(14, 43, 11, 26, -0.42, '#dcfbff', '#7fdcf0'),
    ...crystal(35, 43, 10, 22, 0.45, '#ffe2f3', '#ff9ecf'),
    ...crystal(24, 43, 16, 40, 0, '#ece2ff', '#b58cff')
  ],
  mirror: [
    { d: 'M21 32 H27 L27.5 41.5 C30 42.5 30 46.5 24 46.5 C18 46.5 18 42.5 20.5 41.5 Z', fill: '#c9a0f5' },
    { d: 'M24 1.5 A15 17 0 1 1 23.99 1.5 Z', fill: '#c9a0f5' },
    { d: 'M24 5 A11.5 13.5 0 1 1 23.99 5 Z', fill: '#bfe0ff' },
    { d: ellipseBand(24, 18.5, 11.5, 13.5, 0.75, -6.5, 0.5), fill: '#ffffff' },
    { d: 'M42 1 L43.3 4.7 L47 6 L43.3 7.3 L42 11 L40.7 7.3 L37 6 L40.7 4.7 Z', fill: '#fff1a0' }
  ],
  rainbow: [
    { d: arch(23, 17), fill: '#ff8fb8' },
    { d: arch(17, 11), fill: '#ffe36b' },
    { d: arch(11, 5), fill: '#6ec8ff' },
    { d: SMALL_CLOUD, fill: '#ffffff' },
    { d: mirrorX(SMALL_CLOUD), fill: '#ffffff' }
  ],
  hourglass: [
    { d: 'M13 8 H35 C35 18 27 21 26 24 C27 27 35 30 35 40 H13 C13 30 21 27 22 24 C21 21 13 18 13 8 Z', fill: '#e6f6ff' },
    { d: 'M16 16 H32 C30 19.5 26.5 21 24 23 C21.5 21 18 19.5 16 16 Z', fill: '#ffd36b' },
    { d: 'M14.5 39.5 C16 35 20.5 33 23 32.5 V25 H25 V32.5 C27.5 33 32 35 33.5 39.5 Z', fill: '#ffd36b' },
    { d: 'M10 3.5 H38 A2.75 2.75 0 0 1 38 9 H10 A2.75 2.75 0 0 1 10 3.5 Z', fill: '#c98a5a' },
    { d: 'M10 39 H38 A2.75 2.75 0 0 1 38 44.5 H10 A2.75 2.75 0 0 1 10 39 Z', fill: '#c98a5a' }
  ],
  snowflake: [{ d: snowflake(24, 24), fill: '#cdeeff' }],
  balloon: [
    { d: 'M24 40.5 C19 43 29 44.5 24 47.5', fill: 'none', stroke: true },
    { d: 'M21 41 L24 36.5 L27 41 Z', fill: '#ff7fae' },
    { d: 'M24 3 C34 3 40 11 40 19.5 C40 29 31.5 36 24 37 C16.5 36 8 29 8 19.5 C8 11 14 3 24 3 Z', fill: '#ff7fae' },
    { d: 'M13.5 17 C13.5 11.5 17 8 21 7.5 C18.5 10.5 17 13.5 17 18 Z', fill: '#ffffff' }
  ]
}
