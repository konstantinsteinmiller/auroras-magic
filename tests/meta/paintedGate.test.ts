// The painted-art index (vite.config.ts `paintedArtPlugin` → `virtual:painted-art`).
// A build lists the paintings on disk, and `art.ts` asks for nothing else, so a
// sheet registered before it is painted never shows up in a portal's console as
// a 404. Under the dev server and in the other suites the index is null.
import { describe, expect, it, vi } from 'vitest'

vi.mock('virtual:painted-art', () => ({ default: ['images/runes/rune-fire', 'images/world-ui/bookmark'] }))

describe('the painted-art index', () => {
  it('ships exactly the paintings the build found on disk', async () => {
    const { shipsPainting } = await import('@/game/art')
    expect(shipsPainting('rune', 'rune-fire')).toBe(true)
    expect(shipsPainting('worldUi', 'bookmark')).toBe(true)
    // Registered in the catalogue, not painted yet: never requested.
    expect(shipsPainting('rune', 'rune-ice')).toBe(false)
    expect(shipsPainting('worldUi', 'show-glove')).toBe(false)
  })

  it('never requests an unpainted sheet, even when asked to prefetch it', async () => {
    const created: string[] = []
    const RealImage = globalThis.Image
    globalThis.Image = class extends RealImage {
      set src(v: string) { created.push(v) }
    } as typeof Image
    try {
      const art = await import('@/game/art')
      art.setArtOverrides(true, false)
      const settled = art.artSettled('worldUi', 'show-glove')
      if (settled) await settled
      expect(art.spriteFor('worldUi', 'show-glove')).toBeNull()
      expect(created.filter((u) => u.includes('show-glove'))).toEqual([])
    } finally {
      globalThis.Image = RealImage
    }
  })
})
