// @vitest-environment node
// §12.2.2's timing gate: a standard sector, wiped with the Stardust Brush by a
// relaxed player, lands in the 12–20 s band — across ten timed passes.
//
// The band is set at §7.5's REFERENCE scale: the sector drawn at roughly its
// 317 650 RVU² reference area with the 36 px floor brush — a 760 × 456
// landscape view, which frames a 736 × 429 px sector (316 k px²). §7.5 is
// explicit that other screens drift from it: a phone renders the same sector
// smaller under the same finger-sized brush, so it clears faster; a big
// desktop view clears slower. Those are measured and
// reported here (and live, by `wipe_complete.durationMs` per viewport
// class), not forced into the band.

import { describe, expect, it } from 'vitest'
import { simulateWipe } from './wipeBot'

describe('wipe timing (§7.5, §12.2.2)', () => {
  it('lands a relaxed 500 px/s wipe in the 12–20 s band at the reference scale, ten times', () => {
    const times: number[] = []
    for (let seed = 1; seed <= 10; seed++) {
      const r = simulateWipe({ vw: 760, vh: 456, speed: 500, seed })
      times.push(r.seconds)
      expect(r.seconds, `seed ${seed}`).toBeGreaterThanOrEqual(12)
      expect(r.seconds, `seed ${seed}`).toBeLessThanOrEqual(20)
    }
    console.info('[wipe] reference 760×456 @500 px/s:', times.map((t) => t.toFixed(1)).join(' '))
  })

  it('reports how other screens drift from the reference (not gated)', () => {
    const rows: string[] = []
    for (const [label, vw, vh, speed] of [
      ['phone portrait 320×658', 320, 658, 500],
      ['phone portrait 390×844', 390, 844, 500],
      ['phone landscape 844×390', 844, 390, 500],
      ['tablet 1024×768', 1024, 768, 700],
      ['desktop 1280×720 (mouse)', 1280, 720, 900],
      ['desktop 1920×1080 (mouse)', 1920, 1080, 1100]
    ] as const) {
      const r = simulateWipe({ vw, vh, speed, seed: 3 })
      rows.push(`${label}: ${r.seconds.toFixed(1)} s (sector ${Math.round(r.frameW)} px wide, core ${r.core.toFixed(0)} px)`)
      expect(Number.isFinite(r.seconds)).toBe(true)
    }
    console.info('[wipe]\n  ' + rows.join('\n  '))
  })
})
