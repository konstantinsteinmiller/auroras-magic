// "Tap one of these" — the colour-picking cue (story-spec §8.33).
//
// The bug it exists for: the blank landmark wore the only moving, glowing
// thing on screen while the three paint pots sat still, so the game pointed
// at the destination and never at the buttons. What must stay true:
//
//   • every pot is marked, in ITS OWN colour — the choice being asked for is
//     the colour, so a cue that renders one pot in another's hue is worse
//     than none;
//   • the pots are marked more loudly than the landmark, always;
//   • the pot the game is about to pick for her (§8.7's 4 s) says so before
//     it happens;
//   • reduced motion (§3.11) still gets the invitation, just not the motion.

import { describe, expect, it, beforeEach } from 'vitest'
import { drawPotCue, drawLandmarkTarget } from '@/game/restore/potCue'
import { reducedMotion } from '@/use/useAccessibility'

interface Op { op: string; style: string; alpha: number; x: number; y: number; r: number }

/** A context that records what was painted, where, in what colour. */
const recorder = (): { g: CanvasRenderingContext2D; ops: Op[] } => {
  const ops: Op[] = []
  let cx = 0
  let cy = 0
  let cr = 0
  const g = {
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineDashOffset: 0,
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    setLineDash: () => {},
    arc: (x: number, y: number, r: number) => { cx = x; cy = y; cr = r },
    createRadialGradient: () => ({ addColorStop: () => {} }),
    fill: () => { ops.push({ op: 'fill', style: String(g.fillStyle), alpha: g.globalAlpha, x: cx, y: cy, r: cr }) },
    stroke: () => { ops.push({ op: 'stroke', style: String(g.strokeStyle), alpha: g.globalAlpha, x: cx, y: cy, r: cr }) }
  } as unknown as CanvasRenderingContext2D & { fillStyle: string; strokeStyle: string; globalAlpha: number }
  return { g: g as CanvasRenderingContext2D, ops }
}

const POTS = [{ x: 200, y: 600 }, { x: 290, y: 600 }, { x: 380, y: 600 }]
const TONES = ['#ff8fd0', '#ffd23a', '#59b6ff']
const cue = (phaseT: number, t = 3.1) => ({
  pots: POTS, tones: TONES, size: 64, lx: 300, ly: 300, t, phaseT, autoAt: 4
})

const run = (phaseT: number, t = 3.1): Op[] => {
  const { g, ops } = recorder()
  drawPotCue(g, cue(phaseT, t))
  return ops
}

describe('the pots are what the game points at (§8.33)', () => {
  beforeEach(() => { reducedMotion.value = false })

  it('waits for the pots to finish rising', () => {
    // They rise over 0.42 s; a cue that arrives with them is noise on top of
    // an animation, not an invitation.
    expect(run(0.2)).toHaveLength(0)
    expect(run(1.2).length).toBeGreaterThan(0)
  })

  it('marks every pot, each in its own colour', () => {
    const ops = run(1.2)
    for (let i = 0; i < POTS.length; i++) {
      const mine = ops.filter((o) => Math.abs(o.x - POTS[i]!.x) < 1 && o.style === TONES[i])
      expect(mine.length, `pot ${i} (${TONES[i]})`).toBeGreaterThan(0)
    }
    // …and never in a neighbour's.
    for (const o of ops) {
      const at = POTS.findIndex((p) => Math.abs(o.x - p.x) < 1)
      if (at >= 0 && TONES.includes(o.style)) expect(o.style, `pot ${at}`).toBe(TONES[at])
    }
  })

  it('is louder than the ring round the landmark', () => {
    const potInk = Math.max(...run(1.2).map((o) => o.alpha))
    const { g, ops } = recorder()
    drawLandmarkTarget(g, 300, 300, 900, 3.1, 1.2)
    const targetInk = Math.max(...ops.map((o) => o.alpha))
    // The destination is a label; the pots are the question.
    expect(potInk).toBeGreaterThan(targetInk)
  })

  it('tells her which pot it is about to pick', () => {
    // Mid-wait the ripple wanders; in the last second it settles on pot 0 —
    // the one §8.7 takes if she never chooses.
    const late = run(3.6)
    const ripple = late.filter((o) => o.op === 'stroke' && o.style === '#fff6c8')
    expect(ripple.length).toBeGreaterThan(0)
    for (const o of ripple) expect(o.x).toBeCloseTo(POTS[0]!.x)
    // And pot 0 is the brightest of the three by then.
    const bright = (i: number) => Math.max(...late.filter((o) => Math.abs(o.x - POTS[i]!.x) < 1).map((o) => o.alpha))
    expect(bright(0)).toBeGreaterThan(bright(1))
    expect(bright(0)).toBeGreaterThan(bright(2))
  })

  it('still invites when motion is reduced — it just stops moving', () => {
    reducedMotion.value = true
    const a = run(1.2, 3.1)
    const b = run(1.2, 9.7)
    expect(a.length).toBeGreaterThan(0)
    // Nothing in it may depend on the clock (§3.11).
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
    // Every pot is still marked in its own colour.
    for (let i = 0; i < POTS.length; i++) {
      expect(a.some((o) => Math.abs(o.x - POTS[i]!.x) < 1 && o.style === TONES[i]), `pot ${i}`).toBe(true)
    }
  })
})
