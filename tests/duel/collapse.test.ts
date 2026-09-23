// A LOST DUEL LAYS THE UNICORN DOWN (chars.ts's `*_LIE` pose): flat on her
// belly, on the island, the right way up. The pose itself is drawn, so what a
// test can read is the rig's own anchors (§9.7's `afterRig`) — and those are
// exactly the three things that went wrong before: a rig that tipped over
// nose-first, hooves that floated, and a leg hanging off the island's edge.

import { describe, expect, it } from 'vitest'
import { drawUnicorn, type PoseState, type RigAnchors } from '@/game/duel/chars'
import { AX, UX, GY } from '@/game/duel/config'

/** `arena.ts`: the island's rim is 300 either side of the stage's middle. */
const RIM0 = 640 - 300
const RIM1 = 640 + 300

/** A 2D context that draws nothing: the anchors are arithmetic, not pixels. */
const fakeCtx = (): CanvasRenderingContext2D => {
  const store: Record<string | symbol, unknown> = {}
  return new Proxy(store, {
    get: (o, k) => (k in o ? o[k] : () => undefined),
    set: (o, k, v) => { o[k] = v; return true }
  }) as unknown as CanvasRenderingContext2D
}

/** Draw one duelist `lose` of the way down; hand back the anchors she filled. */
const poseAt = (lose: number, side: -1 | 1): RigAnchors => {
  let got: RigAnchors | null = null
  const st: PoseState = {
    hp: 0,
    lose,
    afterRig: (_g, a) => {
      // ANC is one reused object: copy every pair out of it.
      got = { ...a, hoofFront: [...a.hoofFront], hoofHind: [...a.hoofHind], bodyStage: [...a.bodyStage], headStage: [...a.headStage], tailStage: [...a.tailStage] }
    }
  }
  drawUnicorn(fakeCtx(), side < 0 ? AX : UX, GY, side, st, 3.2)
  if (!got) throw new Error('afterRig never ran')
  return got
}

describe.each([['Aurora', -1], ['the foe', 1]] as const)('%s goes down', (_who, side) => {
  it('keeps every hoof on the island, all the way down', () => {
    for (const l of [0, 0.25, 0.5, 0.75, 1]) {
      const a = poseAt(l, side)
      for (const [x] of [a.hoofFront, a.hoofHind, a.bodyStage, a.headStage, a.tailStage]) {
        expect(x).toBeGreaterThan(RIM0)
        expect(x).toBeLessThan(RIM1)
      }
    }
  })

  it('rests both hooves ON the ground once she is down', () => {
    const a = poseAt(1, side)
    expect(Math.abs(a.hoofFront[1] - GY)).toBeLessThan(12)
    expect(Math.abs(a.hoofHind[1] - GY)).toBeLessThan(12)
  })

  it('never tips over: the head stays above the barrel and out of the ground', () => {
    // The rig that tipped nose-first put the skull under the belly and into
    // the island. Lying down, the head is still the topmost mass.
    for (const l of [0, 0.3, 0.6, 0.85, 1]) {
      const a = poseAt(l, side)
      expect(a.headStage[1]).toBeLessThan(a.bodyStage[1])
      expect(a.headStage[1]).toBeLessThan(GY)
    }
  })

  it('lowers the head and the barrel the whole way down, and lands them there', () => {
    const y = [0, 0.25, 0.5, 0.75, 1].map((l) => poseAt(l, side))
    for (let i = 1; i < y.length; i++) {
      expect(y[i]!.headStage[1]).toBeGreaterThan(y[i - 1]!.headStage[1])
    }
    // Down is DOWN: the barrel ends within a body's depth of the ground.
    expect(GY - y[4]!.bodyStage[1]).toBeLessThan(40)
    expect(y[4]!.lose).toBe(1)
  })
})
