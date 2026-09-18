/**
 * migrate.ts — the one-way Step-1 → schema-2 migration (story-spec §4.7).
 *
 * No build has ever shipped (F24), so the only Step-1 blobs are dev and QA
 * saves. The job is: never crash on the old shape, and land somewhere sane.
 *
 *   • `am_coins`, `am_upgrades` — D3 removed the currency and the element
 *     ranks. Read once, dropped; nothing migrates into them.
 *   • `am_spells_seen` — the old `{ '023': 1 }` discoveries fold into
 *     `am_campaign.combosSeen` through `comboEnumerationIndex`, then go.
 *   • `am_ladder` — frozen where it is. `furthestNode` is NOT derived from
 *     it (F24): a 0–5 rung means nothing on a 50-node map.
 *   • `am_campaign` — S1 already writes it (without `am_schema`), so this
 *     MERGES into whatever is there: a sector a player restored under S1
 *     survives the migration.
 *
 * Idempotent: once `am_schema` is 2 it returns at once.
 */
import { getState, setState, removeState } from '@/use/useGameState'
import { SCHEMA_KEY, CAMPAIGN_KEY, COINS_KEY, UPGRADES_KEY, SPELLS_SEEN_KEY } from '@/keys'
import { readCampaign } from '@/game/campaign/state'
import { setBit } from '@/game/campaign/bitset'
import { comboEnumerationIndex } from '@/game/duel/config'

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return Number.isFinite(n) ? n : 0
}

/** The four single-rune spells are the alphabet, known from the start. */
const BASE_COMBOS = [0, 1, 2, 3]

export const migrateToSchema2 = (): void => {
  if (num(getState(SCHEMA_KEY, 1)) >= 2) return

  // 1. The currency and the ranks: gone (D3).
  removeState(COINS_KEY)
  removeState(UPGRADES_KEY)

  // 2. Discoveries: the undelimited Step-1 keys can only hold ids 0–3, one
  //    digit each ('023' = [0, 2, 3]).
  const cs = readCampaign(getState<unknown>(CAMPAIGN_KEY, null))
  let combos = cs.combosSeen
  for (const i of BASE_COMBOS) combos = setBit(combos, i)
  const legacy = getState<unknown>(SPELLS_SEEN_KEY, null)
  if (legacy && typeof legacy === 'object') {
    for (const oldKey of Object.keys(legacy as Record<string, unknown>)) {
      if (!/^[0-3]{1,3}$/.test(oldKey)) continue
      const idx = comboEnumerationIndex([...oldKey].map(Number))
      if (idx >= 0) combos = setBit(combos, idx)
    }
  }
  removeState(SPELLS_SEEN_KEY)

  // 3. Everything else in the campaign keeps what S1 (if anything) wrote.
  //    What is known at the migration is not "new": the book's sparkle is
  //    for discoveries made from here on.
  setState(CAMPAIGN_KEY, { ...cs, combosSeen: combos, combosViewed: combos })
  setState(SCHEMA_KEY, 2)
}
