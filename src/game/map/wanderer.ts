/**
 * wanderer.ts — after the finale, Umbra wanders the restored world (story-spec
 * §8.11). Each time the map opens she is visiting one RESTORED sector — never
 * a dusty one: she belongs to the world she has rejoined — chosen by a seeded
 * pick, so where she turns up feels chosen rather than glitchy. She stands at
 * the sector's corner with a small visiting idle (a sway, a blink of hearts);
 * a tap makes her hop and say one of three friendly lines, in turn, in her
 * own babble voice.
 *
 * State here is the map's presentation only (like the tap creatures' peeks):
 * nothing is saved but `finaleSeen`, which unlocks her.
 */
import { S } from '@/game/duel/state'
import { drawUnicorn, type PoseState } from '@/game/duel/chars'
import { guardianOf } from '@/game/duel/foes'
import { hasBit } from '@/game/campaign/bitset'
import { LAST_BUILT_NODE, nodeChapter } from '@/game/campaign/tables'
import { mapHud } from '@/use/useMapHud'
import { chatter, sfx } from '@/game/duel/audio'
import { seeded } from '@/game/duel/util'

type G2D = CanvasRenderingContext2D

/** Her three lines (§8.11: the slot is §8's, the words are §10's). */
export const WANDER_LINES = ['finale.umbra1', 'finale.umbra2', 'finale.umbra3'] as const
const BEATS = [7, 6, 6] as const

let home = -1
let opens = 0
let hopAt = -1e9
let line = 0

/** Is Umbra out wandering? Only after the finale has been seen. */
export const wandering = (): boolean => S.campaign.finaleSeen && home >= 0

/**
 * The map opened: she picks a restored sector to visit this time — on the
 * page in view when it has one, so she is found rather than hunted for.
 */
export const wanderOnMapOpen = (): void => {
  home = -1
  if (!S.campaign.finaleSeen) return
  const done: number[] = []
  const here: number[] = []
  for (let n = 0; n <= LAST_BUILT_NODE; n++) {
    if (!hasBit(S.campaign.sectorsDone, n)) continue
    done.push(n)
    if (nodeChapter(n) === mapHud.visible) here.push(n)
  }
  const pool = here.length ? here : done
  if (!pool.length) return
  opens++
  const r = seeded(9173 + opens * 7919)
  r()
  home = pool[Math.floor(r() * pool.length)]!
}

/** The sector she is visiting, or -1. */
export const wanderHome = (): number => (wandering() ? home : -1)

/** Tapped: a hop, a line, her voice. Returns the line's i18n key. */
export const greetWanderer = (t: number): string => {
  hopAt = t
  const key = WANDER_LINES[line]!
  chatter('umbra', BEATS[line]!, line === 2 ? 'ask' : 'excite')
  sfx('peek', 3)
  line = (line + 1) % WANDER_LINES.length
  return key
}

const POSE: PoseState = { cast: 0, hurt: 0, hp: 1, win: 0, lose: 0, form: 0, foe: guardianOf(9) }

/**
 * Draw her standing with her hooves at (x, y) CSS px, `h` px tall, facing
 * right into the sector (her rig faces left; the map mirrors it). `t`
 * seconds drives the sway, the hop and the hearts.
 */
export const drawWanderer = (g: G2D, x: number, y: number, h: number, t: number): void => {
  const u = t - hopAt
  const hop = u >= 0 && u < 0.5 ? Math.sin((u / 0.5) * Math.PI) : 0
  POSE.win = hop > 0 ? 0.6 : 0
  POSE.form = 0.25 + 0.15 * Math.sin(t * 1.7)
  const k = h / 200
  g.save()
  g.translate(x, y - hop * h * 0.22)
  g.scale(-k, k)
  drawUnicorn(g, 0, 0, 1, POSE, t)
  g.restore()
  // A little heart floats up now and then — the "visiting" beat.
  const hc = (t * 0.45) % 1
  if (hc < 0.6) {
    const q = hc / 0.6
    const hx = x + h * 0.05 + Math.sin(t * 3) * h * 0.04
    const hy = y - h * (0.95 + q * 0.35)
    const s = h * 0.07 * (0.6 + 0.4 * q)
    g.save()
    g.globalAlpha = Math.sin(q * Math.PI) * 0.9
    g.beginPath()
    g.moveTo(hx, hy + s)
    g.bezierCurveTo(hx - s * 1.6, hy - s * 0.4, hx - s * 0.6, hy - s * 1.4, hx, hy - s * 0.5)
    g.bezierCurveTo(hx + s * 0.6, hy - s * 1.4, hx + s * 1.6, hy - s * 0.4, hx, hy + s)
    g.fillStyle = '#ff7fae'
    g.fill()
    g.lineWidth = Math.max(1.5, s * 0.25)
    g.strokeStyle = '#3A2340'
    g.stroke()
    g.restore()
  }
}

/** Test seam. */
export const __resetWanderer = (): void => {
  home = -1
  opens = 0
  hopAt = -1e9
  line = 0
}
