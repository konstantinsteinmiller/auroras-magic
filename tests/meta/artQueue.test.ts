// The art layer's fetch queue (`src/game/art.ts`): "only what is needed next
// goes first". A `high` ask (on screen now, or the splash's hold) must never
// wait behind a pile of prefetches, `low` must never share the wire with
// anything more urgent, and a prefetch that turns out to be needed NOW is
// promoted rather than left in its slow lane.
//
// The browser's `Image` is replaced by a fake that records every request and
// lets the test decide when each one lands; `requestIdleCallback` by a queue
// the test drains. Each case re-imports the module, so no state leaks.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type ArtModule = typeof import('@/game/art')

class FakeImage {
  static all: FakeImage[] = []
  src = ''
  decoding = ''
  fetchPriority?: string
  naturalWidth = 0
  private listeners = new Map<string, () => void>()
  constructor () { FakeImage.all.push(this) }
  addEventListener (type: string, fn: () => void): void { this.listeners.set(type, fn) }
  decode (): Promise<void> { return Promise.resolve() }
  /** The file arrives (or 404s). */
  land (ok = true): void {
    if (ok) {
      this.naturalWidth = 64
      this.listeners.get('load')?.()
    } else this.listeners.get('error')?.()
  }
}

const idle: (() => void)[] = []
const flushIdle = async (): Promise<void> => {
  for (let i = 0; i < 50 && idle.length; i++) idle.shift()!()
  await Promise.resolve()
}
const settle = async (): Promise<void> => { for (let i = 0; i < 5; i++) await Promise.resolve() }
/** What went on the wire, as `folder/file` (the refresh's cache-buster off). */
const requested = (): string[] => FakeImage.all.map((i) => i.src.replace(/^.*images\//, '').replace(/\?.*$/, ''))
const imgOf = (frag: string): FakeImage => FakeImage.all.find((i) => i.src.includes(frag))!

let art: ArtModule

beforeEach(async () => {
  FakeImage.all = []
  idle.length = 0
  vi.stubGlobal('Image', FakeImage)
  vi.stubGlobal('requestIdleCallback', (fn: () => void) => { idle.push(fn); return idle.length })
  vi.resetModules()
  art = await import('@/game/art')
  art.setArtOverrides(true, false)
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('the lanes', () => {
  it('a high ask goes on the wire at once, even behind ten waiting prefetches', async () => {
    for (let k = 0; k < 10; k++) void art.artSettled('prop', `p${k}`, 'low')
    // Nothing low starts before an idle gap…
    expect(requested()).toEqual([])
    expect(art.spriteFor('sector', 'visible-now')).toBeNull()
    // …but the painting on screen does, immediately.
    expect(requested()).toEqual(['sectors/visible-now.webp'])
    expect(imgOf('visible-now').fetchPriority).toBe('high')
  })

  it('low waits for idle time AND for everything more urgent to land', async () => {
    void art.artSettled('page', 'hold-me', 'high')
    void art.artSettled('prop', 'later', 'low')
    await flushIdle()
    // The high one is still in flight: the low one must not share the wire.
    expect(requested()).toEqual(['pages/hold-me.webp'])
    imgOf('hold-me').land()
    await settle()
    await flushIdle()
    expect(requested()).toContain('props/later.webp')
    expect(imgOf('later').fetchPriority).toBe('low')
  })

  it('at most two low fetches at a time', async () => {
    for (let k = 0; k < 6; k++) void art.artSettled('prop', `p${k}`, 'low')
    for (let i = 0; i < 6; i++) await flushIdle()
    expect(requested().length).toBe(2)
    imgOf('p0').land()
    await settle()
    await flushIdle()
    expect(requested().length).toBe(3)
  })

  it('normal goes out in order, a few at a time, never ahead of a waiting high', async () => {
    for (let k = 0; k < 7; k++) void art.artSettled('page', `n${k}`, 'normal')
    const first = requested()
    expect(first).toEqual(['pages/n0.webp', 'pages/n1.webp', 'pages/n2.webp', 'pages/n3.webp'])
    imgOf('n0').land()
    await settle()
    expect(requested()[4]).toBe('pages/n4.webp')
  })

  it('normal never shares the line with a high fetch', async () => {
    void art.artSettled('page', 'held', 'high')
    void art.artSettled('page', 'next', 'normal')
    expect(requested()).toEqual(['pages/held.webp'])
    imgOf('held').land()
    await settle()
    expect(requested()).toContain('pages/next.webp')
  })

  it('a held-back painting the renderer asks for waits its turn until released', async () => {
    const release = art.holdBack('page', 'cover-cloth')
    void art.artSettled('sector', 'hold', 'high')
    // Drawn every frame, shown nowhere: its asks queue in `normal`, behind the hold.
    expect(art.spriteFor('page', 'cover-cloth')).toBeNull()
    expect(art.spriteFor('page', 'cover-cloth')).toBeNull()
    expect(requested()).toEqual(['sectors/hold.webp'])
    release()
    // Released: the next draw-time ask promotes it at once.
    expect(art.spriteFor('page', 'cover-cloth')).toBeNull()
    expect(requested()).toContain('pages/cover-cloth.webp')
    expect(imgOf('cover-cloth').fetchPriority).toBe('high')
  })

  it('a prefetch the renderer turns out to need NOW is promoted', async () => {
    void art.artSettled('page', 'busy', 'high')
    void art.artSettled('prop', 'butterfly', 'low')
    expect(requested()).toEqual(['pages/busy.webp'])
    // The renderer draws it: it jumps the queue, at high.
    expect(art.spriteFor('prop', 'butterfly')).toBeNull()
    expect(requested()).toContain('props/butterfly.webp')
    expect(imgOf('butterfly').fetchPriority).toBe('high')
  })
})

describe('probes', () => {
  it('ready only once decoded; a 404 is remembered and never re-asked', async () => {
    expect(art.spriteFor('rune', 'fire')).toBeNull()
    imgOf('fire').land()
    await settle()
    expect(art.spriteFor('rune', 'fire')).not.toBeNull()
    expect(art.spriteFor('rune', 'nope')).toBeNull()
    imgOf('nope').land(false)
    await settle()
    expect(art.spriteFor('rune', 'nope')).toBeNull()
    expect(requested().filter((r) => r.includes('nope')).length).toBe(1)
  })

  it('forgetting a probe still waiting for the wire settles it, so no hold waits forever', async () => {
    void art.artSettled('page', 'busy', 'high')
    const p = art.artSettled('prop', 'queued', 'low')!
    art.forgetArt('prop', 'queued')
    await expect(p).resolves.toBeUndefined()
    for (let i = 0; i < 4; i++) await flushIdle()
    imgOf('busy').land()
    await settle()
    for (let i = 0; i < 4; i++) await flushIdle()
    expect(requested()).not.toContain('props/queued.webp')
  })

  it('recording what a drawing asks for fetches nothing', () => {
    const wants = art.recordArtWants(() => {
      art.spriteFor('prop', 'a')
      art.spriteFor('creature', 'b')
      art.spriteFor('prop', 'a')
    })
    expect(wants).toEqual([['prop', 'a'], ['creature', 'b']])
    expect(requested()).toEqual([])
    expect(art.artProbeCount()).toBe(0)
  })

  it('measuring against the drawings alone neither fetches nor answers a painting', async () => {
    expect(art.spriteFor('rig', 'rig-head')).toBeNull()
    imgOf('rig-head').land()
    await settle()
    expect(art.spriteFor('rig', 'rig-head')).not.toBeNull()
    // Inside `withoutArt` the decoded painting is not handed out, and nothing
    // new goes on the wire.
    const inside = art.withoutArt(() => [art.spriteFor('rig', 'rig-head'), art.spriteFor('rig', 'rig-ear')])
    expect(inside).toEqual([null, null])
    expect(requested()).toEqual(['rig/rig-head.webp'])
    expect(art.spriteFor('rig', 'rig-head')).not.toBeNull()
  })

  it('announces each arrival by name, once decoded', async () => {
    const seen: string[] = []
    art.onArtChanged((c) => { if (c) seen.push(`${c.kind}/${c.id}`) })
    void art.artSettled('island', 'isle', 'high')
    expect(seen).toEqual([])
    imgOf('isle').land()
    await settle()
    expect(seen).toEqual(['island/isle'])
  })

  it('with the layer off, asks for nothing at all', () => {
    art.setArtOverrides(false, false)
    expect(art.spriteFor('sector', 'x')).toBeNull()
    expect(art.artSettled('sector', 'x', 'high')).toBeNull()
    expect(requested()).toEqual([])
  })
})
