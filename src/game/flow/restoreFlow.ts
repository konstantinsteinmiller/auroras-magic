/**
 * flow/restoreFlow.ts — what happens around a sector's restoration
 * (story-spec §3.2.2 steps 6–13, §3.2.3, §3.9.2, §11.6).
 *
 *   • the unbox beat's end: the campaign controller grants a boss chest's
 *     rune and keepsake (R-1b), and — when something was unlocked — the one
 *     happy-moment call of the chapter fires, at the unbox (§11.6: unlock
 *     outranks boss clear and chapter restored);
 *   • after the reveal: the camera zooms back out to the map, at the sector
 *     that was just restored (§3.2.2 step 13), where the Twin Gift may be
 *     waiting beside it;
 *   • a chapter's FIRST keepsake gets its admire moment in the wardrobe
 *     between the reveal and the idle map (§3.9.2 item 3).
 */
import { S, save } from '@/game/duel/state'
import { COSMETIC_SLOTS, COSMETICS, FINALE_NODE } from '@/game/campaign/tables'
import { onUnboxComplete, type ChestGrant } from '@/game/campaign/controller'
import { gotoScene } from '@/game/flow/scene'
import { dipTo, DIP_ZOOM } from '@/game/flow/transition'
import { focusMap } from '@/game/map/map'
import { admire } from '@/game/cosmetics/wardrobe'
import { triggerHappytime } from '@/use/useCrazyGames'
import { gamePixHappyMoment } from '@/utils/gamepixPlugin'
import { offerTwinGift } from '@/use/useDuelRewards'
import { beginRestore, type RestoreEnd } from '@/game/restore/wipe'
import { mapHud } from '@/use/useMapHud'
import { artSettled } from '@/game/art'
import { sectorArtId } from '@/game/artIds'

let lastGrant: ChestGrant = { rune: null, signature: null, cosmetic: null }
let lastNode = -1
/** The wardrobe is up because a boss chest just gave a keepsake. */
let admiringKeepsake = false

/** Open node `n`'s waiting gift: zoom in to its sector (§3.2.2 steps 6–9). */
export const openSector = (n: number): void => {
  lastNode = n
  // Its full-size painting starts on the wire now, under the zoom, so it has
  // usually decoded by the time the gift is on screen (a no-op, and no
  // request, with the art layer off).
  void artSettled('sector', sectorArtId(n), 'high')
  dipTo(() => beginRestore(n, onRestoreFinished), DIP_ZOOM)
}

/** The unbox beat of node `n` finished (called by the restore controller). */
export const onUnboxed = (n: number): ChestGrant => {
  lastNode = n
  lastGrant = onUnboxComplete(n)
  if (lastGrant.rune !== null || lastGrant.signature !== null) {
    // §11.6: exactly one happy moment per chapter, here at the chest.
    triggerHappytime()
    gamePixHappyMoment()
  }
  return lastGrant
}

/** The restore loop handed control back (restored, or the player left). */
export const onRestoreFinished = (why: RestoreEnd): void => {
  const n = lastNode
  const keepsake = why === 'restored' ? lastGrant.cosmetic : null
  lastGrant = { rune: null, signature: null, cosmetic: null }
  dipTo(() => {
    if (keepsake !== null) {
      // Wear it at once, and admire it: the first thing the chest gave.
      const slot = COSMETIC_SLOTS.indexOf(COSMETICS[keepsake]!.slot)
      const eq = [...S.campaign.giftsEquipped] as typeof S.campaign.giftsEquipped
      eq[slot] = keepsake
      S.campaign.giftsEquipped = eq
      save()
      admiringKeepsake = true
      gotoScene('wardrobe')
      admire(keepsake)
      return
    }
    gotoScene('map', n)
    focusMap(n)
    // The Festival's own sector, restored for the first time: the finale
    // (§10.19). Its card comes up over the map, once; after it, Umbra
    // wanders the restored world (§8.11).
    if (why === 'restored' && n === FINALE_NODE && !S.campaign.finaleSeen) {
      S.campaign.finaleSeen = true
      save()
      mapHud.finale = true
      return
    }
    if (why === 'restored') offerTwinGift(n)
  }, DIP_ZOOM)
}

/**
 * Back from the wardrobe to the map. Straight after a boss chest's keepsake
 * the camera glides on to the next chapter's first node, so the way on is
 * on screen — in portrait that page sits below the fold, and a child who
 * cannot see a pulsing node has nowhere to go.
 */
export const leaveWardrobe = (): void => {
  const onward = admiringKeepsake
  admiringKeepsake = false
  dipTo(() => {
    gotoScene('map')
    if (onward) focusMap(-1, true)
  }, 0.4)
}

/** The node whose sector the restore loop last opened. */
export const restoredNode = (): number => lastNode
