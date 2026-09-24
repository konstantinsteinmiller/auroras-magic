/**
 * The playtest harness's idle window (`director.ts`, `qaAfkSeconds`).
 *
 * AI playtesters act every 8–10 s, which trips the 10 s AFK rule and skews
 * every loss they report. A harness that announced itself before boot
 * (`window.__AM_QA__ === true`) may set `window.__AM_QA_AFK_S` to widen the
 * window; nothing else may. The flags are read ONCE, when the director loads —
 * so this file sets them before any import (`vi.hoisted`), and the "normal
 * build" half re-imports a fresh module graph without them.
 */
import { describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  const w = window as unknown as Record<string, unknown>
  w.__AM_QA__ = true
  w.__AM_QA_AFK_S = 25
})

import { AFK_S, afk, afkSeconds, qaAfkSeconds } from '@/game/duel/director'
import { NO_EASE, PH_DUEL, PH_LOSE } from '@/game/duel/config'
import { S } from '@/game/duel/state'
import { resetDuel, updateSim } from '@/game/duel/sim'
import { duelSetup } from '@/game/campaign/tables'

const DT = 1 / 60

const quietDuel = (): void => {
  S.intro = 0
  S.wins = 20
  S.losses = 0
  S.campaign.runesUnlocked = 0xfff
  resetDuel({ foe: duelSetup(12).foe, usesMagic: false, lossStreak: 0, ease: { ...NO_EASE } })
}
const run = (seconds: number): void => {
  for (let t = 0; t < seconds; t += DT) {
    S.pops.length = 0
    updateSim(DT)
    if (S.phase !== PH_DUEL) return
  }
}

describe('qaAfkSeconds — who may widen the idle window', () => {
  it('is AFK_S unless a QA harness asked, with a positive number', () => {
    expect(AFK_S).toBe(10)
    expect(qaAfkSeconds(undefined)).toBe(AFK_S)
    expect(qaAfkSeconds(null)).toBe(AFK_S)
    expect(qaAfkSeconds({})).toBe(AFK_S)
    // The seconds alone do nothing: a page cannot widen it without the QA flag.
    expect(qaAfkSeconds({ __AM_QA_AFK_S: 30 })).toBe(AFK_S)
    expect(qaAfkSeconds({ __AM_QA__: 'true', __AM_QA_AFK_S: 30 })).toBe(AFK_S)
    expect(qaAfkSeconds({ __AM_QA__: 1, __AM_QA_AFK_S: 30 })).toBe(AFK_S)
    // The QA flag alone changes nothing either.
    expect(qaAfkSeconds({ __AM_QA__: true })).toBe(AFK_S)
    // Only a real, positive number.
    for (const bad of ['30', 0, -5, Number.NaN, null, {}]) {
      expect(qaAfkSeconds({ __AM_QA__: true, __AM_QA_AFK_S: bad }), String(bad)).toBe(AFK_S)
    }
    expect(qaAfkSeconds({ __AM_QA__: true, __AM_QA_AFK_S: 30 })).toBe(30)
    expect(qaAfkSeconds({ __AM_QA__: true, __AM_QA_AFK_S: 4.5 })).toBe(4.5)
    expect(qaAfkSeconds({ __AM_QA__: true, __AM_QA_AFK_S: Number.POSITIVE_INFINITY })).toBe(Number.POSITIVE_INFINITY)
  })

  it('never reads the seconds without the QA flag', () => {
    let read = false
    const probe = { get __AM_QA_AFK_S () { read = true; return 30 } }
    expect(qaAfkSeconds(probe)).toBe(AFK_S)
    expect(read).toBe(false)
  })
})

describe('the idle window a QA harness set before boot', () => {
  it('was read at load: the rule waits 25 s, not 10', () => {
    expect(afkSeconds()).toBe(25)
    quietDuel()
    run(AFK_S + 2)
    expect(S.phase).toBe(PH_DUEL)
    expect(afk(), '12 s of quiet is not away under a 25 s window').toBe(false)
    run(25 - (AFK_S + 2) + 0.5)
    expect(afk(), '25.5 s is').toBe(true)
  })

  it('is read ONCE: changing the flags after boot changes nothing', () => {
    const w = window as unknown as Record<string, unknown>
    w.__AM_QA_AFK_S = 3
    expect(afkSeconds()).toBe(25)
    w.__AM_QA_AFK_S = 25
  })

  it('a normal boot (no flags) runs on AFK_S, and the quiet player is still finished off', async () => {
    const w = window as unknown as Record<string, unknown>
    delete w.__AM_QA__
    delete w.__AM_QA_AFK_S
    vi.resetModules()
    const dir = await import('@/game/duel/director')
    const st = await import('@/game/duel/state')
    const sim = await import('@/game/duel/sim')
    const cfg = await import('@/game/duel/config')
    const tables = await import('@/game/campaign/tables')
    expect(dir.afkSeconds()).toBe(dir.AFK_S)
    const s = st.S
    s.intro = 0
    s.wins = 20
    s.losses = 0
    s.campaign.runesUnlocked = 0xfff
    sim.resetDuel({ foe: tables.duelSetup(12).foe, usesMagic: false, lossStreak: 0, ease: { ...cfg.NO_EASE } })
    for (let t = 0; t < dir.AFK_S + 0.5; t += DT) sim.updateSim(DT)
    expect(dir.afk()).toBe(true)
    for (let t = 0; t < 90 && s.phase === cfg.PH_DUEL; t += DT) {
      s.pops.length = 0
      sim.updateSim(DT)
    }
    expect(s.phase).toBe(PH_LOSE)
  })
})
