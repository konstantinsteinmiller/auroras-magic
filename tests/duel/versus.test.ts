// Local 2P versus (story-spec §6.19, §12.2.6, C18) on the real sim: two
// hands drawing at once into their own stroke buffers — no cross-talk across
// 20 duels of interleaved pointer streams — player 2 is never the AI, both
// hold the full kit, the rules are symmetric, and a match counts no duel and
// leaves the campaign untouched.

import { beforeEach, describe, expect, it } from 'vitest'
import { RUNE_IDS, PH_DUEL, WIND, ICE, TIME, LOVE, type Rune } from '@/game/duel/config'
import { VERSUS_FOE } from '@/game/duel/foes'
import { S } from '@/game/duel/state'
import { defaultCampaign } from '@/game/campaign/state'
import { resetDuel, updateSim, strokeStart, strokeMove, strokeEnd, castSide, cast, finisherOpen } from '@/game/duel/sim'
import { DRAWN, realize, stream } from './rune-draws'

const STEP = 1 / 120
const run = (s: number): void => {
  for (let i = 0; i < Math.round(s / STEP); i++) updateSim(STEP)
}

beforeEach(() => {
  S.campaign = defaultCampaign()
  S.campaign.runesUnlocked = 0xfff
  S.campaign.signaturesUnlocked = 0b11
  S.wins = 7
  S.losses = 3
  S.intro = 0
  S.pops.length = 0
  resetDuel({ foe: VERSUS_FOE, usesMagic: false, lossStreak: 0, versus: true })
})

describe('local 2P versus (§6.19)', () => {
  it('two strokes at once, interleaved point by point, land in their own hands — 20 duels, no cross-talk', () => {
    const rnd = stream(1919)
    const slugs = [...RUNE_IDS]
    for (let d = 0; d < 20; d++) {
      resetDuel()
      const a = Math.floor(rnd() * 12)
      let b = Math.floor(rnd() * 12)
      if (b === a) b = (b + 5) % 12
      // Player 1 draws on the left half, player 2 on the right, at once.
      const pa = realize(DRAWN[slugs[a]!]!(rnd), { rotDeg: rnd() * 20 - 10, sx: 110, sy: 110 }, rnd).map((v, i) => (i & 1 ? v : v - 320))
      const pb = realize(DRAWN[slugs[b]!]!(rnd), { rotDeg: rnd() * 20 - 10, sx: 110, sy: 110 }, rnd).map((v, i) => (i & 1 ? v : v + 320))
      strokeStart(pa[0]!, pa[1]!, false)
      strokeStart(pb[0]!, pb[1]!, true)
      const n = Math.max(pa.length, pb.length)
      for (let i = 2; i < n; i += 2) {
        // A jittery, uneven interleave, like two real pointer streams.
        if (i < pa.length) strokeMove(pa[i]!, pa[i + 1]!, false)
        if (i < pb.length && rnd() < 0.9) strokeMove(pb[i]!, pb[i + 1]!, true)
      }
      strokeEnd(320, 120, false)
      strokeEnd(960, 120, true)
      expect(S.queue, `duel ${d}: player 1 drew ${slugs[a]}`).toEqual([a])
      expect(S.equeue, `duel ${d}: player 2 drew ${slugs[b]}`).toEqual([b])
    }
  })

  it('player 2 is never the AI: her hand only fills from her own strokes', () => {
    run(10)
    expect(S.equeue).toEqual([])
    expect(S.eForm).toBe(0)
    expect(S.phase).toBe(PH_DUEL)
  })

  it('is always the base fight: 100 HP a side, no easing, no weakness', () => {
    expect([S.hpMax, S.ehpMax, S.hp, S.ehp]).toEqual([100, 100, 100, 100])
    expect(S.dust).toBe(1)
    expect(S.onboard).toBe(1)
    S.queue.push(0 as Rune)
    cast()
    run(1)
    expect(S.ehp).toBe(92) // a plain fire bolt: no elemental bonus either way
  })

  it('both hold the full kit: player 2 can Frost Lock player 1, whose hand freezes', () => {
    S.queue.push(0 as Rune, 0 as Rune)
    S.equeue.push(WIND, ICE, ICE)
    castSide(true)
    expect(S.eGuardK).toBe(1)
    expect(S.frozen).toBeCloseTo(2.5, 5)
    expect(S.queue).toEqual([]) // discarded
    strokeStart(300, 300, false)
    expect(S.draw).toBe(0) // a frozen hand cannot draw
    cast()
    expect(S.shots.length).toBe(0) // nor cast
  })

  it("a slow landing on player 2 shaves her guard — versus has no forming timer (§6.19)", () => {
    S.equeue.push(WIND, WIND)
    castSide(true) // her wind wall
    const g = S.eGuard
    S.queue.push(TIME, TIME)
    cast() // an hourglass field: a field creeps under a wind wall
    run(0.6)
    expect(S.eGuard).toBeLessThan(g * 0.75)
    expect(S.eSlow).toBe(0)
  })

  it('the Love finisher gate is symmetric (§6.9)', () => {
    S.hitsLanded = 4
    expect(finisherOpen(true)).toBe(true)
    S.equeue.push(LOVE, LOVE, LOVE)
    castSide(true)
    expect(S.eUsedFinisher).toBe(true)
    expect(S.shots[0]!.k).toBe(3)
  })

  it('a match counts no duel and touches no campaign state', () => {
    const before = JSON.stringify(S.campaign)
    S.ehp = 0
    updateSim(STEP)
    expect(S.phase).not.toBe(PH_DUEL)
    expect([S.wins, S.losses]).toEqual([7, 3])
    expect(JSON.stringify(S.campaign)).toBe(before)
    // The next campaign duel is a campaign duel again.
    resetDuel({ foe: 0, usesMagic: false, lossStreak: 0, versus: false })
    expect(S.versus).toBe(false)
    expect(S.epts).toEqual([])
  })
})
