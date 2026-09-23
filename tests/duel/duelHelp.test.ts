// Visible help after two losses (retention-roadmap item 8).
//
// The contract, in four parts:
//   1. it fires at exactly two losses on the node — not one, not three;
//   2. it lights the rune ghost through a PER-DUEL override, and never
//      touches the saved "Show rune guides" setting a grown-up owns;
//   3. Aurora's line lives only while the help is useful — this duel, before
//      the first rune lands;
//   4. it clears when the duel ends, so the next fight opens without it.
import { beforeEach, describe, expect, it } from 'vitest'
import {
  HELP_AFTER_LOSSES, closeHelp, helpDue, helpNoteUp, helpOn, helpToken, installDuelHelp, openHelp
} from '@/game/duel/help'
import { setTraceAssist, traceAssist, traceAssistNow } from '@/use/useAccessibility'
import { TRACE_ASSIST_KEY } from '@/keys'
import { getState, hasState } from '@/use/useGameState'
import { __resetAnalytics, analyticsLog } from '@/use/useAnalytics'
import { NO_EASE, PH_DUEL, PH_WIN } from '@/game/duel/config'
import { S } from '@/game/duel/state'
import { resetDuel, updateSim } from '@/game/duel/sim'

beforeEach(() => {
  closeHelp()
  __resetAnalytics()
})

describe('when the help arrives', () => {
  it('is due at exactly two losses on the node', () => {
    expect(HELP_AFTER_LOSSES).toBe(2)
    expect(helpDue(0)).toBe(false)
    expect(helpDue(1)).toBe(false)
    expect(helpDue(2)).toBe(true)
    expect(helpDue(3)).toBe(true)
  })

  it('turns the ghost on at the second loss and not before', () => {
    openHelp(7, 1)
    expect(helpOn()).toBe(false)
    expect(traceAssistNow.value).toBe(false)

    openHelp(7, 2)
    expect(helpOn()).toBe(true)
    expect(traceAssistNow.value).toBe(true)
  })

  it('takes the help away again when the next duel does not need it', () => {
    openHelp(7, 2)
    expect(traceAssistNow.value).toBe(true)
    // She won her way onto a fresh node: the streak is 0 and so is the help.
    openHelp(8, 0)
    expect(helpOn()).toBe(false)
    expect(traceAssistNow.value).toBe(false)
  })

  it('reports itself once, with the node and the streak', () => {
    openHelp(7, 1)
    expect(analyticsLog().filter((r) => r.event === 'help_shown')).toEqual([])

    openHelp(7, 3)
    const shown = analyticsLog().filter((r) => r.event === 'help_shown')
    expect(shown.length).toBe(1)
    expect(shown[0]!.props).toEqual({ nodeId: 7, lossStreak: 3 })
  })

  it('plays its entrance again on every retry', () => {
    openHelp(7, 2)
    const first = helpToken()
    openHelp(7, 3)
    expect(helpToken()).toBe(first + 1)
  })
})

describe('the saved setting is not the duel’s to write', () => {
  it('never persists the per-duel override', () => {
    const before = getState<boolean | undefined>(TRACE_ASSIST_KEY, undefined)
    openHelp(7, 2)
    expect(traceAssistNow.value).toBe(true)
    // The Options ref and the save both stay exactly where they were: a
    // player who has never opened Options still finds the guides OFF.
    expect(traceAssist.value).toBe(false)
    expect(hasState(TRACE_ASSIST_KEY)).toBe(false)
    expect(getState<boolean | undefined>(TRACE_ASSIST_KEY, undefined)).toBe(before)

    closeHelp()
    expect(traceAssist.value).toBe(false)
    expect(hasState(TRACE_ASSIST_KEY)).toBe(false)
  })

  it('cannot switch a grown-up’s setting off when it ends', () => {
    setTraceAssist(true)
    try {
      openHelp(7, 2)
      expect(traceAssistNow.value).toBe(true)
      closeHelp()
      // The duel's help left; the SETTING is still on, because nobody turned
      // it off.
      expect(traceAssist.value).toBe(true)
      expect(traceAssistNow.value).toBe(true)
    } finally {
      setTraceAssist(false)
    }
  })
})

describe('Aurora’s line', () => {
  const inDuel = (): void => {
    S.phase = PH_DUEL
    S.book = 0
    S.landed = 0
    S.dur = 0
  }

  it('is up only while the help is', () => {
    inDuel()
    expect(helpNoteUp()).toBe(false)
    openHelp(7, 2)
    expect(helpNoteUp()).toBe(true)
  })

  it('leaves the moment she draws her first rune', () => {
    inDuel()
    openHelp(7, 2)
    S.landed = 1
    expect(helpNoteUp()).toBe(false)
    // …and the ghost itself is still lit: the line is a bonus, the guide is
    // the help.
    expect(traceAssistNow.value).toBe(true)
  })

  it('waits behind the spellbook and the result screen', () => {
    inDuel()
    openHelp(7, 2)
    S.book = 1
    expect(helpNoteUp()).toBe(false)
    S.book = 0
    S.phase = PH_WIN
    expect(helpNoteUp()).toBe(false)
    S.phase = PH_DUEL
    expect(helpNoteUp()).toBe(true)
  })

  it('does not sit there all fight', () => {
    inDuel()
    openHelp(7, 2)
    // `S.dur` is the duel's OWN clock, so an ad or an open modal never eats
    // the note's welcome.
    S.dur = 30
    expect(helpNoteUp()).toBe(false)
  })
})

describe('it ends with the duel', () => {
  it('clears on the sim’s own finish', () => {
    const stop = installDuelHelp()
    try {
      resetDuel({ foe: 0, usesMagic: false, lossStreak: 2, ease: NO_EASE })
      S.intro = 0
      openHelp(7, 2)
      expect(traceAssistNow.value).toBe(true)

      // The fight is won on the next step.
      S.ehp = 0
      updateSim(1 / 60)
      expect(S.phase).toBe(PH_WIN)

      expect(helpOn()).toBe(false)
      expect(traceAssistNow.value).toBe(false)
    } finally {
      stop()
    }
  })
})
