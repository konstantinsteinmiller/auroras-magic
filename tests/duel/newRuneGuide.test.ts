/**
 * The new-rune guide (owner, 2026-09-24): *"Teach the newest learnt rune
 * (wind, ice…) in the duel without blocking the duel."*
 *
 * Pinned here: WHICH duel shows it (`campaign/newRune.ts` — the newest rune a
 * chest has given by this node, hers, never drawn, and still new on a
 * replay); the save field that remembers what she has drawn, and its
 * migration off `combosSeen`; that in the duel it appears, holds NOTHING (a
 * duel with it runs frame-for-frame like one without), stands aside for the
 * lessons, versus, the book and the depth glimpse's hint, and ends on her
 * first successful draw of it with a "Great!"; and that the campaign
 * controller writes that draw into the save.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { reseed } = vi.hoisted(() => {
  const SEED = 20260924
  let s = SEED
  Math.random = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
  return { reseed: (): void => { s = SEED } }
})

import { S } from '@/game/duel/state'
import { EARTH, FIRE, ICE, PH_DUEL, WIND, comboEnumerationIndex } from '@/game/duel/config'
import { cast, resetDuel, strokeEnd, updateSim } from '@/game/duel/sim'
import { GREAT_S, armRuneGuide, runeGreat, runeGuideRune } from '@/game/duel/lesson'
import { markRuneTaught, newRuneDue, runeTaught, taughtFromCombos } from '@/game/campaign/newRune'
import { defaultCampaign, readCampaign, type CampaignState } from '@/game/campaign/state'
import { emptyBitset, setBit } from '@/game/campaign/bitset'
import { COMBO_COUNT } from '@/game/campaign/state'
import { STARTING_RUNES, duelSetup, newestRuneBy, runeForNode, runesHeldBy } from '@/game/campaign/tables'
import { earlyEase } from '@/game/campaign/easing'
import { installCampaignController } from '@/game/campaign/controller'
import { __resetAnalytics, analyticsLog } from '@/use/useAnalytics'
import { hud, syncHud } from '@/use/useDuelHud'
import { DRAWN, realize, stream } from './rune-draws'

const DT = 1 / 120
const step = (secs: number): void => {
  const n = Math.round(secs / DT)
  for (let i = 0; i < n; i++) updateSim(DT)
}
const shape = (slug: string): number[] =>
  realize(DRAWN[slug]!(stream(7)), { rotDeg: 0, sx: 120, sy: 120, jitterAmp: 0 }, stream(11))
const draw = (pts: readonly number[]): void => {
  S.draw = 1
  S.pts.length = 0
  S.pts.push(...pts)
  strokeEnd()
}
const propsOf = (ev: string): Record<string, unknown> | undefined => analyticsLog().find((r) => r.event === ev)?.props

/** A campaign as she arrives at node `n` on first play: every chest before it
 *  opened, nothing drawn but the starting pair. */
const arriving = (n: number, taught = STARTING_RUNES): CampaignState => ({
  ...defaultCampaign(),
  furthestNode: n - 1,
  runesUnlocked: runesHeldBy(n),
  runesTaught: taught
})

/** Node `n`'s duel, as the flow opens it, with the guide armed by the rule. */
const openAt = (n: number, cs = arriving(n)): void => {
  S.campaign = cs
  S.intro = 0
  S.wins = 3
  S.losses = 0
  S.pops.length = 0
  S.flow = { ...S.flow, scene: 'duel', node: n, mode: 'campaign' }
  const { foe, usesMagic } = duelSetup(n)
  resetDuel({ foe, usesMagic, lossStreak: 0, ease: earlyEase(n) })
  armRuneGuide(newRuneDue(n, S.campaign))
}

beforeEach(() => {
  __resetAnalytics()
})
afterEach(() => {
  S.glimpse = 0
  S.book = 0
  S.intro = 0
})

describe('which duel shows it (campaign/newRune.ts)', () => {
  it('is the newest rune a chest has given by this node — Ice after node 0\'s chest, Wind after node 2\'s', () => {
    expect(runeForNode(0)).toBe(ICE)
    expect(runeForNode(2)).toBe(WIND)
    expect(newRuneDue(0, arriving(0)), 'node 0: the starting pair is all there is').toBe(-1)
    expect(newRuneDue(1, arriving(1))).toBe(ICE)
    expect(newRuneDue(2, arriving(2)), 'still Ice, until she draws it').toBe(ICE)
    expect(newRuneDue(3, arriving(3))).toBe(WIND)
    // A chapter's rune arrives at its boss's chest: shown in the next chapter.
    for (let n = 4; n < 20; n++) expect(newRuneDue(n, arriving(n))).toBe(newestRuneBy(n))
  })

  it('only while she holds it and has never drawn it', () => {
    const unopened = { ...arriving(1), runesUnlocked: STARTING_RUNES }
    expect(newRuneDue(1, unopened), 'a chest she has not opened gave her nothing').toBe(-1)
    expect(newRuneDue(1, arriving(1, STARTING_RUNES | (1 << ICE))), 'drawn once: done').toBe(-1)
    // Drawn Ice, not yet Wind: node 3 still teaches Wind.
    expect(newRuneDue(3, arriving(3, STARTING_RUNES | (1 << ICE)))).toBe(WIND)
  })

  it('on a replay only while it is still her newest rune', () => {
    // Node 1 won, Ice never drawn: a replay of node 1 still shows Ice.
    const justWon = { ...arriving(2) }
    expect(newRuneDue(1, justWon)).toBe(ICE)
    // Far past it: a replay of node 1 is an old node, and Ice is not new.
    const far = arriving(7)
    expect(newRuneDue(1, far)).toBe(-1)
    expect(newRuneDue(3, far)).toBe(-1)
    expect(newRuneDue(7, far)).toBe(newestRuneBy(7))
    // Not a campaign node.
    expect(newRuneDue(-1, far)).toBe(-1)
  })

  it('markRuneTaught sets the bit once', () => {
    const cs = defaultCampaign()
    expect(markRuneTaught(cs, ICE)).toBe(true)
    expect(runeTaught(cs, ICE)).toBe(true)
    expect(markRuneTaught(cs, ICE)).toBe(false)
    expect(markRuneTaught(cs, FIRE), 'the starting pair is taught from the start').toBe(false)
    expect(markRuneTaught(cs, -1)).toBe(false)
    expect(markRuneTaught(cs, 12)).toBe(false)
  })
})

describe('the save field and its migration', () => {
  it('a fresh save knows the starting pair', () => {
    expect(defaultCampaign().runesTaught).toBe(STARTING_RUNES)
    expect(readCampaign(null).runesTaught).toBe(STARTING_RUNES)
    expect(readCampaign({}).runesTaught).toBe(STARTING_RUNES)
  })

  it('a save from before the field counts every rune in a spell it has CAST as drawn', () => {
    let combos = emptyBitset(COMBO_COUNT)
    combos = setBit(combos, comboEnumerationIndex([FIRE, ICE]))
    const old = { furthestNode: 3, runesUnlocked: runesHeldBy(4), combosSeen: combos }
    const cs = readCampaign(old)
    expect(runeTaught(cs, ICE)).toBe(true)
    expect(runeTaught(cs, WIND), 'held, never cast: still to teach').toBe(false)
    expect(cs.runesTaught).toBe(taughtFromCombos(combos))
    // …so the returning player is shown only the rune she really never used:
    // Wind (node 2's chest) at node 4, never the Ice she has cast.
    expect(newestRuneBy(4)).toBe(WIND)
    expect(newRuneDue(4, cs)).toBe(WIND)
    expect(newRuneDue(2, { ...cs, furthestNode: 1 }), 'Ice, cast: not shown').toBe(-1)
  })

  it('an explicit field wins over the combos, keeps the pair, and survives junk and a round trip', () => {
    let combos = emptyBitset(COMBO_COUNT)
    combos = setBit(combos, comboEnumerationIndex([ICE]))
    const cs = readCampaign({ runesTaught: 1 << WIND, combosSeen: combos })
    expect(cs.runesTaught).toBe((STARTING_RUNES | (1 << WIND)) >>> 0)
    expect(runeTaught(cs, ICE), 'the field is the truth once it exists').toBe(false)
    expect(readCampaign({ runesTaught: 'junk' }).runesTaught).toBe(STARTING_RUNES)
    expect(readCampaign({ runesTaught: -5 }).runesTaught).toBe(STARTING_RUNES)
    expect(readCampaign(JSON.parse(JSON.stringify(cs))).runesTaught).toBe(cs.runesTaught)
  })
})

describe('in the duel', () => {
  it('appears for a newly earned rune, on the HUD too', () => {
    openAt(1)
    expect(runeGuideRune()).toBe(ICE)
    expect(propsOf('rune_guide_shown')).toMatchObject({ rune: ICE })
    syncHud(0)
    expect(hud.runeGuide).toBe(ICE)
  })

  it('NEVER pauses or holds anything: a duel with it runs frame-for-frame like one without', () => {
    const run = (armed: boolean): string => {
      reseed()
      openAt(1)
      if (!armed) armRuneGuide(-1)
      expect(runeGuideRune()).toBe(armed ? ICE : -1)
      const trace: string[] = []
      let foeCast = 0
      for (let i = 0; i < Math.round(9 / DT); i++) {
        if (i === Math.round(1 / DT)) draw(shape('fire'))
        if (i === Math.round(1.5 / DT)) cast()
        if (i === Math.round(4 / DT)) draw(shape('ice'))
        if (i === Math.round(4.5 / DT)) cast()
        if (S.eForge.t === 0) foeCast++
        updateSim(DT)
        if (i % 60 === 0) trace.push([S.hp, S.ehp, S.equeue.join(''), S.eForm, S.eForge.t, S.forge.t, S.shots.length].join('|'))
      }
      expect(foeCast, 'the foe fought on as ever').toBeGreaterThan(0)
      return trace.join('\n')
    }
    const withGuide = run(true)
    const without = run(false)
    expect(withGuide).toBe(without)
  })

  it('stores every stroke as ever, and ends on her first successful draw of that rune — "Great!"', () => {
    openAt(1)
    draw(shape('fire'))
    expect(S.queue).toEqual([FIRE])
    expect(runeGuideRune(), 'another rune does not end it').toBe(ICE)
    draw(shape('ice'))
    expect(S.queue).toEqual([FIRE, ICE])
    expect(runeGuideRune()).toBe(-1)
    const g = runeGreat()
    expect(g).toMatchObject({ rune: ICE })
    expect(propsOf('rune_guide_done')).toMatchObject({ rune: ICE, seen: true })
    syncHud(0)
    expect(hud.runeGreat).toBe(g!.token)
    expect(hud.runeGreatRune).toBe(ICE)
    // "Great!" has a life of its own, on the app's clock.
    S.t += GREAT_S + 0.01
    expect(runeGreat()).toBe(null)
    syncHud(0)
    expect(hud.runeGreat).toBe(0)
  })

  it('stands aside for the lessons, versus, the book, the result — and for the glimpse\'s hint', () => {
    openAt(1)
    S.intro = 1
    expect(runeGuideRune(), 'never over the lessons').toBe(-1)
    S.intro = 0
    S.book = 1
    expect(runeGuideRune()).toBe(-1)
    S.book = 0
    for (const st of [2, 3]) {
      S.glimpse = st
      expect(runeGuideRune(), `glimpse ${st}: one teacher at a time`).toBe(-1)
    }
    S.glimpse = 4
    expect(runeGuideRune(), 'back once the hint has gone').toBe(ICE)
    S.glimpse = 1
    expect(runeGuideRune()).toBe(ICE)
    S.glimpse = 0
    // The duel ends: gone with it.
    S.ehp = 0
    step(0.5)
    expect(S.phase).not.toBe(PH_DUEL)
    expect(runeGuideRune()).toBe(-1)
    // A new duel (a retry) forgets it until the campaign arms it again…
    resetDuel()
    expect(runeGuideRune()).toBe(-1)
    // …and versus never arms it.
    resetDuel({ foe: 0, usesMagic: false, lossStreak: 0, versus: true })
    armRuneGuide(ICE)
    expect(runeGuideRune()).toBe(-1)
    resetDuel({ foe: 0, usesMagic: false, lossStreak: 0 })
    S.versus = false
  })

  it('an Ice drawn under the glimpse\'s hint (its own answer) ends the guide quietly', () => {
    openAt(1)
    S.glimpse = 2
    draw(shape('ice'))
    expect(S.queue).toEqual([ICE])
    expect(runeGuideRune()).toBe(-1)
    expect(runeGreat()).toBe(null)
    expect(propsOf('rune_guide_done')).toMatchObject({ rune: ICE, seen: false })
    S.glimpse = 4
    expect(runeGuideRune(), 'and it does not come back').toBe(-1)
  })
})

describe('the campaign remembers what her hand has drawn', () => {
  let off: () => void = () => {}
  beforeEach(() => { off = installCampaignController() })
  afterEach(() => off())

  it('a stored rune is written to runesTaught, so the next duel does not show it again', () => {
    openAt(1)
    expect(runeTaught(S.campaign, ICE)).toBe(false)
    draw(shape('ice'))
    expect(runeTaught(S.campaign, ICE)).toBe(true)
    // Next duel: node 2 would have shown Ice — she has drawn it now.
    S.campaign.furthestNode = 1
    expect(newRuneDue(2, S.campaign)).toBe(-1)
  })

  it('a duel she ends without drawing it leaves it owed', () => {
    openAt(1)
    draw(shape('fire'))
    draw(shape('earth'))
    expect(runeTaught(S.campaign, ICE)).toBe(false)
    S.campaign.furthestNode = 1
    expect(newRuneDue(2, S.campaign), 'next duel, again').toBe(ICE)
  })

  it('versus writes nothing', () => {
    openAt(1)
    S.flow = { ...S.flow, mode: 'versus' }
    draw(shape('ice'))
    expect(runeTaught(S.campaign, ICE)).toBe(false)
    S.flow = { ...S.flow, mode: 'campaign' }
  })
})

// Earth is a starting rune: it is never a "new" one to teach.
it('never teaches the starting pair', () => {
  for (let n = 0; n < 50; n++) {
    const r = newRuneDue(n, arriving(n, 0))
    expect(r === FIRE || r === EARTH).toBe(false)
  }
})
