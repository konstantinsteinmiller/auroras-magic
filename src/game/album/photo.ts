/**
 * album/photo.ts — the dress-up photo card (retention roadmap item 16).
 *
 * A "pose" button in the album snapshots Aurora in whatever she is wearing,
 * standing in front of the last place she brought back to life. The album
 * keeps six of them.
 *
 * A CARD IS A RECIPE, NEVER A PICTURE. What the save blob holds is a short
 * string naming what to redraw — her seven keepsakes, her mane swatch, the
 * sector behind her and which pose she struck — and the card is drawn from
 * that on demand. An encoded image would be tens of kilobytes per card in a
 * blob that round-trips through portal cloud stores with real size limits
 * (§4.6), six of them, for a picture the game can redraw perfectly in a
 * millisecond. `PHOTO_RECIPE_MAX` is the ceiling the save's own reader
 * enforces; `encodePhoto` is bounded well inside it by construction.
 *
 * STRICTLY LOCAL (Poki, YouTube Playables): the card is drawn to a canvas in
 * the page and nothing else. No sharing, no upload, no download prompt, no
 * request of any kind.
 *
 * SIX SLOTS, AND THE SEVENTH IS NOT A REFUSAL. A child must never be told off
 * for taking one more photo, so the album is a ring: the seventh card takes
 * the oldest one's place and the newest is always last. Nothing is locked,
 * nothing scolds, and a card a child misses is one tap away from being
 * retaken.
 */
import { S, save } from '@/game/duel/state'
import { PHOTO_SLOTS, PHOTO_RECIPE_MAX, NODE_COUNT } from '@/game/campaign/state'
import { hasBit, getPaintPick } from '@/game/campaign/bitset'
import { COSMETIC_SLOTS } from '@/game/campaign/tables'
import { sectorOf } from '@/game/map/sectors'
import { paintSectorArt } from '@/game/map/sectorArt'
import { SEC_W, SEC_H } from '@/game/restore/mask'
import { makeCanvas } from '@/game/restore/dust'
import { drawUnicorn, type PoseState } from '@/game/duel/chars'
import { outfitHooks, maneSwatchIndex, MANE_SWATCHES } from '@/game/cosmetics/rig-cosmetics'
import { onArtChanged } from '@/game/art'
import { track } from '@/use/useAnalytics'
import { ref } from 'vue'

type G2D = CanvasRenderingContext2D

/** What one card names. Every field is bounded — see `decodePhoto`. */
export interface PhotoRecipe {
  /** The restored sector she stands in front of. */
  node: number
  /** Which of `PHOTO_POSES` she struck. */
  pose: number
  /** The mane swatch worn, `MANE_SWATCHES`' index. */
  mane: number
  /** One cosmetic id per slot, -1 for nothing — `COSMETIC_SLOTS`' order. */
  equipped: readonly number[]
}

/**
 * The recipe's version tag. A card written by a later shape of this feature
 * will carry a different one and simply not decode, which is the right
 * failure: an empty slot a child can fill again, never a wrong drawing.
 */
export const RECIPE_TAG = 'a1'

/** The poses the button cycles through, so six cards are not one card six
 *  times. `win` is a rear, `form` the light gathering at her horn. */
const POSES: readonly Readonly<PoseState>[] = [
  { form: 0.25 },
  { win: 0.9, form: 0.15 },
  { win: 0.38, form: 0.62 }
]
export const PHOTO_POSES = POSES.length

/** The instant a card is frozen at — a card never animates, so this is the
 *  only clock it has. Shared by every card, so two cards in the same pose
 *  really are the same picture. */
const STILL_T = 1.4

/** The save's own ceilings, mirrored here so `encodePhoto` cannot write a
 *  field its reader would clamp on the way back in. */
const MAX_COSMETIC = 31

const clampInt = (v: unknown, lo: number, hi: number, dflt: number): number => {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.trunc(n))) : dflt
}

/**
 * `a1|<node>|<pose>|<mane>|<e0>,…,<e6>` — 30 characters at its very longest
 * (node 49, seven two-digit ids), against a 64-character budget. Positional
 * rather than named because the whole point is to be short, and versioned so
 * it can stop being positional later.
 */
export const encodePhoto = (r: PhotoRecipe): string => {
  const eq: number[] = []
  for (let i = 0; i < COSMETIC_SLOTS.length; i++) eq.push(clampInt(r.equipped[i], -1, MAX_COSMETIC, -1))
  const node = clampInt(r.node, 0, NODE_COUNT - 1, 0)
  const pose = clampInt(r.pose, 0, PHOTO_POSES - 1, 0)
  const mane = clampInt(r.mane, 0, MANE_SWATCHES.length - 1, 0)
  return `${RECIPE_TAG}|${node}|${pose}|${mane}|${eq.join(',')}`
}

/**
 * A recipe back out of a string, or null.
 *
 * Tolerant in exactly the way every other reader of this save is: a string
 * that is too long, carries another version's tag, or has lost a field is not
 * a card, and a field that is out of range is clamped rather than thrown.
 * These strings come out of a blob a player — or a portal's cloud — may have
 * mangled, and a mangled card must cost an empty slot, not a crash.
 */
export const decodePhoto = (s: string): PhotoRecipe | null => {
  if (typeof s !== 'string' || !s || s.length > PHOTO_RECIPE_MAX) return null
  const parts = s.split('|')
  if (parts.length !== 5 || parts[0] !== RECIPE_TAG) return null
  const ids = parts[4]!.split(',')
  if (ids.length !== COSMETIC_SLOTS.length) return null
  const equipped: number[] = []
  for (const id of ids) {
    if (!/^-?\d+$/.test(id)) return null
    equipped.push(clampInt(id, -1, MAX_COSMETIC, -1))
  }
  if (!/^\d+$/.test(parts[1]!) || !/^\d+$/.test(parts[2]!) || !/^\d+$/.test(parts[3]!)) return null
  return {
    node: clampInt(parts[1], 0, NODE_COUNT - 1, 0),
    pose: clampInt(parts[2], 0, PHOTO_POSES - 1, 0),
    mane: clampInt(parts[3], 0, MANE_SWATCHES.length - 1, 0),
    equipped
  }
}

/** The last place she brought back to life — the backdrop a photo gets. Falls
 *  back to the first sector, which is a picture either way: `paint()` draws a
 *  sector in full colour, and the dust is a layer the album never asks for. */
const backdropNode = (): number => {
  for (let n = NODE_COUNT - 1; n >= 0; n--) if (hasBit(S.campaign.sectorsDone, n)) return n
  return 0
}

/**
 * The photo this moment would make: what she has on, where she has been, and
 * the next pose in the cycle — so a child who taps "pose" six times gets six
 * different pictures without ever being asked to choose one.
 */
export const currentPhoto = (): PhotoRecipe => ({
  node: backdropNode(),
  pose: S.campaign.photos.length % PHOTO_POSES,
  mane: maneSwatchIndex(),
  equipped: [...S.campaign.giftsEquipped]
})

/**
 * The album's six slots, oldest first: each one's recipe STRING, or null.
 *
 * Always six, because the empty places are part of the page — six frames
 * visibly waiting say "you can take six" before the first photo rather than
 * after the sixth. A stored string that will not decode comes back null too,
 * so a mangled blob costs an empty slot and never a broken card.
 */
export const photoSlots = (): (string | null)[] => {
  const out: (string | null)[] = []
  for (let i = 0; i < PHOTO_SLOTS; i++) {
    const s = S.campaign.photos[i]
    out.push(s && decodePhoto(s) ? s : null)
  }
  return out
}

export const photosFull = (): boolean => S.campaign.photos.length >= PHOTO_SLOTS

/** Bumped on every card taken, so the album's DOM re-reads the save. */
export const photoRev = ref(0)

/**
 * Take the photo. Returns the slot it landed in — always the last one — or
 * -1 if the recipe somehow came out longer than the save's field allows,
 * which would be a bug rather than a player's doing and must not be written.
 */
export const takePhoto = (): number => {
  const recipe = encodePhoto(currentPhoto())
  if (recipe.length > PHOTO_RECIPE_MAX) return -1
  const list = [...S.campaign.photos]
  // Full: the oldest leaves so the newest can arrive. Nothing is refused.
  if (list.length >= PHOTO_SLOTS) list.splice(0, list.length - PHOTO_SLOTS + 1)
  list.push(recipe)
  S.campaign.photos = list
  save()
  photoRev.value++
  const slot = list.length - 1
  track('photo_taken', { slot })
  return slot
}

/* ------------------------------- the draw ------------------------------ */

/**
 * Where she stands on the card, as fractions of it.
 *
 * A card is cropped from the sector's full HEIGHT (a 3:2 card against a
 * 1152 × 672 sector loses width, never sky or ground), so the sector's own
 * ground line lands at a fixed fraction of the card whatever size it is
 * drawn at — which is why she can be placed in card space and still have her
 * hooves on the grass.
 */
const FEET_Y = 0.9
const HER_X = 0.44
const HER_H = 0.56
/** Nominal rig height, hooves to horn (`chars.ts`' HT). */
const RIG_H = 197

/** Draw card `r` into the box (0, 0, w, h) of `g`. Clips to the box. */
export const drawPhotoCard = (g: G2D, w: number, h: number, r: PhotoRecipe): void => {
  const sec = sectorOf(r.node)
  const pot = sec.pots[Math.max(0, getPaintPick(S.campaign.paintPicks, r.node) - 1)] ?? sec.pots[0]!
  g.save()
  g.beginPath()
  g.rect(0, 0, w, h)
  g.clip()
  // Cover-fit: fill the card, crop the overhang, keep the middle.
  const k = Math.max(w / SEC_W, h / SEC_H)
  g.translate((w - SEC_W * k) / 2, (h - SEC_H * k) / 2)
  g.scale(k, k)
  if (!paintSectorArt(g, r.node, sec, pot, true)) sec.paint(g, pot)
  g.restore()
  // Aurora, in the outfit the recipe names, with every pooled emitter frozen
  // (`outfitHooks`' `still`): a card is one frame and owns no clock.
  const size = h * HER_H
  const pose: PoseState = { ...POSES[r.pose % PHOTO_POSES]!, ...outfitHooks(r.equipped, r.mane, true) }
  g.save()
  g.beginPath()
  g.rect(0, 0, w, h)
  g.clip()
  g.translate(w * HER_X, h * FEET_Y)
  g.scale(size / RIG_H, size / RIG_H)
  drawUnicorn(g, 0, 0, -1, pose, STILL_T)
  g.restore()
}

const bakes = new Map<string, HTMLCanvasElement>()
onArtChanged(() => bakes.clear())

/**
 * Card `recipe` on a canvas of `w` × `h` device pixels, baked once and kept.
 *
 * Keyed on the recipe string AND the size, because the recipe IS the
 * picture — two slots holding the same string are the same photograph and
 * share one bake. Six sector paintings on the frame that opens the album is
 * the most expensive thing this feature does, and it happens once.
 */
export const bakePhotoCard = (recipe: string, w: number, h: number): HTMLCanvasElement | null => {
  const pw = Math.max(1, Math.round(w))
  const ph = Math.max(1, Math.round(h))
  const key = `${recipe}@${pw}x${ph}`
  const hit = bakes.get(key)
  if (hit) return hit
  const r = decodePhoto(recipe)
  if (!r) return null
  const cv = makeCanvas(pw, ph)
  const g = cv.getContext('2d')
  if (!g) return null
  drawPhotoCard(g, pw, ph, r)
  // A card's bake is big next to a sticker's, and the album holds at most six
  // at one size; anything beyond that is a stale size from a resize.
  if (bakes.size > PHOTO_SLOTS * 2) bakes.clear()
  bakes.set(key, cv)
  return cv
}

/** Test seam: forget every card bake. */
export const clearPhotoBakes = (): void => bakes.clear()
