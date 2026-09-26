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
 * EVERY OTHER LOOK IS A RECOLOUR of one of the two strips (owner, 2026-09-27:
 * "do all from the still open"): Umbra's friends are her strip in their own
 * hair; a Guardian is Aurora's or Umbra's (whichever is nearer her coat's
 * light) in her whole palette; a skin or a mane colour recolours Aurora. Each
 * strip ships a REGION mask beside it (`images/rig/<who>-regions.webp`: coat,
 * hair, horn, hoof, or as painted), made offline with the atlas, and the
 * recolour is the painted puppet's own (`puppetBake.recolourRegions`), measured
 * against the whole strip's light so every frame recolours alike. A frame is
 * baked the first time it is shown in a look — at most 256 × 256 px, so a
 * millisecond — into a small cache sized in pixels; `warmFrames` bakes a
 * look's common frames ahead, on the VS screen.
 *
 * The strips are small on purpose (owner: "save some space … max 256x256 per
 * frame"): 0.96 px per rig unit, every frame within 256 px.
 */
import { spriteFor } from '@/game/art'
import { FRAME_DATA, type FrameWho, type FrameSet } from '@/game/duel/frameData'
import { idle, recolourRegions, type Look } from '@/game/duel/puppetBake'

export type { FrameWho }
type G2D = CanvasRenderingContext2D
export type FramePart = 'head' | 'body' | 'fore' | 'hind'
/** What a duelist wears as painted poses: whose strip, and its recolour
 *  (null: as painted). `key` names the look for the bake cache. */
export interface FrameDress { who: FrameWho; look: Look | null; key: string }

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

interface Strip { img: HTMLImageElement; set: FrameSet; adj: Map<string, string[]> }
const STRIPS = new Map<FrameWho, Strip>()
/** The strip's art id (`images/rig/<who>-frames.webp`), preloaded with the duel
 *  (`artSchedule.ts`) and shipped like any painting. */
export const frameArtId = (who: FrameWho): string => `${who}-frames`
/** The strip's region mask (`images/rig/<who>-regions.webp`), needed only by a
 *  recoloured look. */
export const regionsArtId = (who: FrameWho): string => `${who}-regions`

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

/**
 * Is `dress`'s strip ready? The first ask starts the load; until it has
 * decoded (or with the art layer off) the duelist draws as she did. A
 * recoloured look needs the strip's region mask as well.
 */
export const framesOn = (dress: FrameDress | null): boolean => {
  if (!dress) return false
  const set = FRAME_DATA[dress.who]
  if (!set) return false
  // (null with the art layer off, or until it has decoded: the rig draws as before)
  const img = spriteFor('rig', frameArtId(dress.who))
  if (!img) return false
  if (dress.look && (!set.regions || !spriteFor('rig', regionsArtId(dress.who)))) return false
  const s = STRIPS.get(dress.who)
  if (!s || s.img !== img) STRIPS.set(dress.who, { img, set, adj: graphOf(set) })
  return true
}

/* ------------------------------------------------ the recoloured frames */

interface Bake { cv: HTMLCanvasElement; px: number }
/** Baked frames, least recently used first (a Map keeps insertion order). */
const BAKES = new Map<string, Bake>()
/** About 7 MB of baked frames: a whole look (23 frames) is well under half of it. */
const BUDGET_PX = 1_800_000
let bakedPx = 0
let scratch: CanvasRenderingContext2D | null = null
const scratchOf = (w: number, h: number): CanvasRenderingContext2D | null => {
  if (!scratch) scratch = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  if (!scratch) return null
  const cv = scratch.canvas
  if (cv.width < w || cv.height < h) {
    cv.width = Math.max(cv.width, w)
    cv.height = Math.max(cv.height, h)
  }
  scratch.setTransform(1, 0, 0, 1, 0, 0)
  scratch.globalCompositeOperation = 'source-over'
  scratch.globalAlpha = 1
  scratch.clearRect(0, 0, w, h)
  return scratch
}

/** Frame `name` in `dress`'s colours: baked on first use, then kept. */
const bakedFrame = (dress: FrameDress, name: string): HTMLCanvasElement | null => {
  const key = `${dress.key}#${name}`
  const hit = BAKES.get(key)
  if (hit) {
    BAKES.delete(key)
    BAKES.set(key, hit)
    return hit.cv
  }
  const s = STRIPS.get(dress.who)
  const r = s?.set.rects[name]
  const mask = spriteFor('rig', regionsArtId(dress.who))
  if (!s || !r || !mask || !dress.look || !s.set.regions) return null
  const x = r[0]!, y = r[1]!, w = r[2]!, h = r[3]!
  const g = scratchOf(w, h)
  if (!g) return null
  g.drawImage(mask, x, y, w, h, 0, 0, w, h)
  const m = g.getImageData(0, 0, w, h).data
  g.clearRect(0, 0, w, h)
  g.drawImage(s.img, x, y, w, h, 0, 0, w, h)
  const id = g.getImageData(0, 0, w, h)
  recolourRegions(id.data, w, h, m, s.set.regions, dress.look)
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  cv.getContext('2d')?.putImageData(id, 0, 0)
  BAKES.set(key, { cv, px: w * h })
  bakedPx += w * h
  for (const [k, b] of BAKES) {
    if (bakedPx <= BUDGET_PX || k === key) break
    BAKES.delete(k)
    bakedPx -= b.px
  }
  return cv
}

/** The frames a look shows first — standing, blinking, casting, hit — baked
 *  in that order. */
const WARM_FIRST: readonly string[] = ['idle', 'bl1', 'bl2', 'blink', 'c1a', 'c1x', 'cast1', 'c2a', 'c2b', 'cast2', 'h1', 'h2', 'hurt']
const warmed = new Set<string>()
/**
 * Bake a recoloured look's frames AHEAD of their first draw, one per idle
 * slice (the VS screen's warm-up, `preview.ts`); a frame not yet baked when
 * it is first shown simply bakes then. Cheap to repeat.
 */
export const warmFrames = (dress: FrameDress | null): void => {
  if (!dress?.look || warmed.has(dress.key) || !framesOn(dress)) return
  warmed.add(dress.key)
  const names = [...WARM_FIRST, ...(FRAME_DATA[dress.who]?.order ?? [])].filter((n, i, a) => a.indexOf(n) === i)
  const step = (i: number): void => {
    if (i >= names.length) return
    idle(() => {
      if (FRAME_DATA[dress.who]?.rects[names[i]!]) bakedFrame(dress, names[i]!)
      step(i + 1)
    })
  }
  step(0)
}

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
export const stepPose = (who: FrameWho, side: number, pose: FramePose, t: number): string => {
  const s = STRIPS.get(who)
  if (!s) return 'idle'
  const key = `${who}:${side}`
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

/**
 * Draw frame `name` in the current transform — the rig's standing frame:
 * origin at the rig's origin, +x toward the opponent, 1 unit = 1 rig unit.
 * The hit flash tints only this frame, on a scratch canvas: no tinted copy of
 * a whole strip is kept.
 */
export const drawFrame = (g: G2D, dress: FrameDress, name: string, flash: 0 | 1 | 2 = 0): void => {
  const s = STRIPS.get(dress.who)
  if (!s) return
  const r = s.set.rects[name]
  if (!r) return
  const { px, anchor, anchorRig } = s.set
  const k = 1 / px
  const w = r[2]!, h = r[3]!
  let src: CanvasImageSource = s.img
  let sx = r[0]!, sy = r[1]!
  if (dress.look) {
    const cv = bakedFrame(dress, name)
    if (cv) { src = cv; sx = 0; sy = 0 }
  }
  if (flash) {
    const t = scratchOf(w, h)
    if (t) {
      t.drawImage(src, sx, sy, w, h, 0, 0, w, h)
      t.globalCompositeOperation = 'source-atop'
      t.globalAlpha = flash === 1 ? 0.55 : 0.5
      t.fillStyle = flash === 1 ? '#fff' : '#ff5a5a'
      t.fillRect(0, 0, w, h)
      src = t.canvas
      sx = 0
      sy = 0
    }
  }
  g.drawImage(src, sx, sy, w, h, anchorRig[0] + (r[4]! - anchor[0]) * k, anchorRig[1] + (r[5]! - anchor[1]) * k, w * k, h * k)
}

/**
 * Where `part` of the rig at rest lands on frame `name`: a matrix from rig
 * units at rest (the mascot's fit) to rig units on that painting.
 */
export const framePart = (who: FrameWho, name: string, part: FramePart): DOMMatrix => {
  const f = FRAME_DATA[who]?.frames[name]
  const m = f ? f[part] : null
  return m ? new DOMMatrix(m as unknown as number[]) : new DOMMatrix()
}
