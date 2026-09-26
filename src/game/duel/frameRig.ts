/**
 * frameRig.ts — THE PAINTED POSES (owner, 2026-09-26): "Can you let the
 * animation states be painted by Gemini? So a rig is not necessary and the
 * animation is flawless, use the mascot Aurora as a reference." — then: "add
 * 2 additional frames in between each current state, so the animation is
 * fluid … for all transitions", and "fix the cosmetics positions".
 *
 * A rig — pieces laid over one another, or one painting cut into layers and
 * skinned — always leaves seams somewhere. Here every frame is its OWN whole
 * painting of the mascot's Aurora, painted by Gemini, one strip per character
 * (`images/rig/<who>-frames.webp`). The key poses are joined by painted
 * in-betweens into CHAINS; the duel walks from the frame on screen to the one
 * the pose wants along those chains, frame by frame, so every change of pose
 * is animated.
 *
 * Every frame was scaled so its HEAD matches the mascot's and placed by the
 * mascot's near hind hoof (`frameData.ts`, made offline by registering the
 * mascot's head, body and near hooves onto each painting). The same numbers
 * say, per frame, where the rig's head, body and hooves are: `framePart`
 * maps a point of the rig at rest — fitted to the mascot — onto that frame,
 * which is how anything worn follows a painted pose.
 *
 * UMBRA'S FRIENDS (owner, 2026-09-26: "variants of Umbra's model with
 * different hair colours and other names") are Umbra's strip with the hair
 * recoloured: a LOOK is `umbra~<mane>~<streak>` (`frameLook`), and its strip
 * is Umbra's painting re-inked through her hair mask (`images/rig/umbra-hair`,
 * made offline with the atlas), baked once per friend, ahead of her duel
 * (`warmFrames`).
 */
import { spriteFor } from '@/game/art'
import { FRAME_DATA, type FrameWho, type FrameSet } from '@/game/duel/frameData'

export type { FrameWho }
type G2D = CanvasRenderingContext2D
export type FramePart = 'head' | 'body' | 'fore' | 'hind'
/** A character's strip, or Umbra's with a friend's hair: `umbra~<mane>~<streak>`. */
export type FrameLook = string

/** The look for `who`, with `hair` ([mane, streak]) when she wears another's. */
export const frameLook = (who: FrameWho, hair?: readonly [string, string]): FrameLook => (hair ? `${who}~${hair[0]}~${hair[1]}` : who)
const whoOf = (look: FrameLook): FrameWho => look.split('~')[0] as FrameWho

/** The chains of painted frames, key pose to key pose (a frame a set lacks is skipped). */
const CHAINS: readonly (readonly string[])[] = [
  ['idle', 'bl1', 'bl2', 'blink'],
  // the cast: a lift, one hoof up, (halfway,) then the rear in three steps
  ['idle', 'c1a', 'c1x', 'mid', 'cast1', 'c2a', 'c2b', 'cast2'],
  ['cast2', 'w1', 'w2', 'win'],
  ['idle', 'h1', 'h2', 'hurt'],
  ['hurt', 'd1', 'd2', 'd3', 'down'],
  ['idle', 't1', 't2', 'tired']
]
const CAST = CHAINS[1]!

interface Strip { src: HTMLImageElement; img: CanvasImageSource; w: number; h: number; tint: Map<string, HTMLCanvasElement>; set: FrameSet; adj: Map<string, string[]> }
const STRIPS = new Map<FrameLook, Strip>()
/** The strip's art id (`images/rig/<who>-frames.webp`), preloaded with the duel
 *  (`artSchedule.ts`) and shipped like any painting. */
export const frameArtId = (who: FrameWho): string => `${who}-frames`
/** The strip's hair mask (`images/rig/<who>-hair.webp`, green = hair), for
 *  the friends' recolour; only a set with `hair` has one. */
export const hairArtId = (who: FrameWho): string => `${who}-hair`

/** The graph over the frames `set` actually has (a missing in-between is skipped). */
const graphOf = (set: FrameSet): Map<string, string[]> => {
  const adj = new Map<string, string[]>()
  const link = (a: string, b: string): void => {
    if (!adj.has(a)) adj.set(a, [])
    if (!adj.get(a)!.includes(b)) adj.get(a)!.push(b)
  }
  for (const chain of CHAINS) {
    const have = chain.filter((n) => set.frames[n])
    for (let i = 1; i < have.length; i++) { link(have[i - 1]!, have[i]!); link(have[i]!, have[i - 1]!) }
  }
  return adj
}

const rgbOf = (c: string): [number, number, number] => {
  const s = c.replace('#', '')
  const h = s.length === 3 ? s.split('').map((x) => x + x).join('') : s
  const n = parseInt(h, 16)
  return Number.isFinite(n) ? [(n >> 16) & 255, (n >> 8) & 255, n & 255] : [160, 140, 220]
}

/**
 * Umbra's strip with a friend's hair, re-inked through the hair mask. The
 * painting's own light and shade stay: each hair pixel's lightness, measured
 * against her hair's mid-tone (`set.hair`), carries the new colour — darker
 * than the mid-tone scales it down, lighter blends it toward white. A pixel
 * leaning cyan is a STREAK and takes the streak colour; the rest the mane's.
 */
const recolour = (img: HTMLImageElement, mask: HTMLImageElement, set: FrameSet, mane: string, streak: string): HTMLCanvasElement | null => {
  const w = img.naturalWidth, h = img.naturalHeight
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  const g = cv.getContext('2d', { willReadFrequently: true })
  if (!g) return null
  g.drawImage(mask, 0, 0, w, h)
  const m = g.getImageData(0, 0, w, h).data
  g.clearRect(0, 0, w, h)
  g.drawImage(img, 0, 0)
  const id = g.getImageData(0, 0, w, h)
  const d = id.data
  const [lilacL, streakL] = set.hair ?? [0.78, 0.8]
  const M = rgbOf(mane), K = rgbOf(streak)
  for (let i = 0; i < d.length; i += 4) {
    const a = m[i + 1]! / 255
    if (a <= 0 || d[i + 3] === 0) continue
    const r = d[i]!, gg = d[i + 1]!, b = d[i + 2]!
    const l = (0.299 * r + 0.587 * gg + 0.114 * b) / 255
    const sw = Math.max(0, Math.min(1, (gg - r) / 40))
    for (let c = 0; c < 3; c++) {
      const t = M[c]! + (K[c]! - M[c]!) * sw
      const ref = lilacL + (streakL - lilacL) * sw
      const q = l / ref
      const v = q <= 1 ? t * q : t + (255 - t) * Math.min(1, (q - 1) / (1 / ref - 1))
      d[i + c] = Math.round(d[i + c]! + (v - d[i + c]!) * a)
    }
  }
  g.putImageData(id, 0, 0)
  return cv
}

/**
 * Is `look`'s painted strip ready? The first ask starts the load; until it
 * has decoded (or with the art layer off) the duelist draws as she did. A
 * friend's look also needs Umbra's hair mask, and is baked here if
 * `warmFrames` has not baked it already.
 */
export const framesOn = (look: FrameLook | null): boolean => {
  if (!look) return false
  const who = whoOf(look)
  const set = FRAME_DATA[who]
  if (!set) return false
  // (null with the art layer off, or until it has decoded: the rig draws as before)
  const src = spriteFor('rig', frameArtId(who))
  if (!src) return false
  const s = STRIPS.get(look)
  if (s && s.src === src) return true
  let img: CanvasImageSource = src
  if (look !== who) {
    const [, mane, streak] = look.split('~')
    const mask = set.hair ? spriteFor('rig', hairArtId(who)) : null
    const cv = mask && recolour(src, mask, set, mane!, streak!)
    if (!cv) return false
    img = cv
  }
  STRIPS.set(look, { src, img, w: src.naturalWidth, h: src.naturalHeight, tint: new Map(), set, adj: graphOf(set) })
  return true
}

/** Bake `look`'s strip now, off the duel's clock (the VS screen's warm-up, `preview.ts`). */
export const warmFrames = (look: FrameLook | null): void => { framesOn(look) }

/** The pose, as `chars.ts` computes it (the raw values, before any geometry). */
export interface FramePose { rear: number; win: number; lose: number; hit: number; blink: number; hp: number }

/** The key frame (or cast frame) a pose wants, among the frames `set` has. */
const targetFor = (p: FramePose, set: FrameSet): string => {
  if (p.lose > 0) return p.lose < 0.3 ? 'hurt' : 'down'
  if (p.win > 0.2) return 'win'
  if (p.hit > 0.25) return 'hurt'
  // the cast chain follows the rear itself, in-betweens and all
  if (p.rear > 0.04) {
    const cast = CAST.filter((n) => set.frames[n])
    return cast[Math.max(1, Math.min(cast.length - 1, Math.round(p.rear * (cast.length - 1))))]!
  }
  if (p.hp < 0.3) return 'tired'
  if (p.blink > 0.5) return 'blink'
  return 'idle'
}

const pathTo = (s: Strip, from: string, to: string): string[] => {
  if (from === to) return []
  const prev = new Map<string, string>([[from, '']])
  const q = [from]
  while (q.length) {
    const n = q.shift()!
    for (const m of s.adj.get(n) ?? []) {
      if (prev.has(m)) continue
      prev.set(m, n)
      if (m === to) {
        const out = [m]
        for (let k = n; k !== from; k = prev.get(k)!) out.unshift(k)
        return out
      }
      q.push(m)
    }
  }
  return [to] // not joined: cut straight to it
}

/** Frames a second while walking a chain, and the longest a change may take. */
const FPS = 22
const MAX_S = 0.3

interface Shown { cur: string; target: string; path: string[]; next: number; last: number }
const SHOWN = new Map<string, Shown>()

/**
 * Advance `side`'s animation to time `t` for `pose` and return the frame to
 * show. The walk is by the clock, frame by frame along the chains, never
 * slower than FPS and never longer than MAX_S for the whole change.
 */
export const stepPose = (look: FrameLook, side: number, pose: FramePose, t: number): string => {
  const s = STRIPS.get(look)
  if (!s) return 'idle'
  const key = `${whoOf(look)}:${side}`
  const t0 = targetFor(pose, s.set)
  const want = s.set.frames[t0] ? t0 : 'idle'
  let st = SHOWN.get(key)
  if (!st || t < st.last - 0.5 || t > st.last + 2) {
    // first draw, or the clock jumped (a new duel, a paused tab): start there
    st = { cur: want, target: want, path: [], next: t, last: t }
    SHOWN.set(key, st)
  }
  if (want !== st.target) {
    st.target = want
    st.path = pathTo(s, st.cur, want)
    const dt = Math.min(1 / FPS, MAX_S / Math.max(1, st.path.length))
    st.next = Math.min(st.next, t + dt)
  }
  while (st.path.length && t >= st.next) {
    st.cur = st.path.shift()!
    st.next += Math.min(1 / FPS, MAX_S / Math.max(1, st.path.length + 1))
  }
  if (!st.path.length) st.next = Math.max(st.next, t)
  st.last = t
  return st.cur
}

/** The strip tinted toward the hit flash's colour (built once, on the first hit). */
const tinted = (s: Strip, flash: 1 | 2): HTMLCanvasElement => {
  const key = String(flash)
  let cv = s.tint.get(key)
  if (cv) return cv
  cv = document.createElement('canvas')
  cv.width = s.w
  cv.height = s.h
  const g = cv.getContext('2d')!
  g.drawImage(s.img, 0, 0)
  g.globalCompositeOperation = 'source-atop'
  g.globalAlpha = flash === 1 ? 0.55 : 0.5
  g.fillStyle = flash === 1 ? '#fff' : '#ff5a5a'
  g.fillRect(0, 0, cv.width, cv.height)
  s.tint.set(key, cv)
  return cv
}

/**
 * Draw frame `name` in the current transform — the rig's standing frame:
 * origin at the rig's origin, +x toward the opponent, 1 unit = 1 rig unit.
 */
export const drawFrame = (g: G2D, look: FrameLook, name: string, flash: 0 | 1 | 2 = 0): void => {
  const s = STRIPS.get(look)
  if (!s) return
  const r = s.set.rects[name]
  if (!r) return
  const { px, anchor, anchorRig } = s.set
  const k = 1 / px
  g.drawImage(flash ? tinted(s, flash) : s.img, r[0]!, r[1]!, r[2]!, r[3]!, anchorRig[0] + (r[4]! - anchor[0]) * k, anchorRig[1] + (r[5]! - anchor[1]) * k, r[2]! * k, r[3]! * k)
}

/**
 * Where `part` of the rig at rest lands on frame `name`: a matrix from rig
 * units at rest (the mascot's fit) to rig units on that painting.
 */
export const framePart = (look: FrameLook, name: string, part: FramePart): DOMMatrix => {
  const f = FRAME_DATA[whoOf(look)]?.frames[name]
  const m = f ? f[part] : null
  return m ? new DOMMatrix(m as unknown as number[]) : new DOMMatrix()
}
