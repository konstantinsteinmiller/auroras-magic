/**
 * rig-accessories.ts — the wardrobe's SECOND shelf (story-spec §2.4 rule 20,
 * §9.7, C17).
 *
 * `rig-cosmetics.ts` holds the nine story keepsakes, one per chapter. It gave
 * every slot exactly one or two things, so a slot was never a CHOICE: a child
 * who did not like the flower crown had a bare head and no second opinion.
 * These fourteen are the alternatives — three or four options in every slot
 * the rig can carry — and rule 20 is the reason each slot's set spans more
 * than the soft-pastel default: an acorn cap beside a star tiara, a monarch
 * wing beside a pegasus one, a moonlit coat beside a pastel one.
 *
 *   slot       item                    hook
 *   head       Acorn Cap               `afterHead`, head space
 *              Star Tiara              `afterHead`, head space
 *              Explorer Goggles        `afterHead`, head space
 *   neck       Bow Tie                 `afterMane`, rig space
 *              Moon Pendant            `afterMane`, rig space
 *   back       Butterfly Wings         `beforeTorso` far + `afterMane` near
 *              Explorer Pack           `beforeTorso` far + `afterMane` near
 *   companion  Pet Cloud               `afterRig`, stage space
 *              Pet Firefly             `afterRig`, stage space
 *   trail      Petal Trail             `afterRig`, stage space — pooled
 *              Frost Trail             `afterRig`, stage space — pooled
 *              Bubble Trail            `afterRig`, stage space — pooled
 *   skin       Moonlit Look            `skin`, a palette on her own shape
 *              Sunset Look             `skin`, a palette on her own shape
 *
 * IT IMPORTS NOTHING FROM `rig-cosmetics.ts`, on purpose: that module reads
 * the registries at the bottom of this one to compose what is worn, so an
 * import back the other way would be a cycle, and a cycle between two modules
 * of top-level `const` records is a TDZ crash at import time rather than a
 * type error. The few helpers they have in common (a four-point sparkle, the
 * ink-then-fill order) are small enough to keep a copy of.
 *
 * NOT PAINTED YET (art-roadmap step 5's catalogue closed before these
 * existed): every item here draws itself, and none is registered in
 * `KEEPSAKE_ICON_SLUGS`/`ITEM_ART`, so nothing 404s and nothing is stamped
 * stale. `VECTOR_ONLY_KEEPSAKES` below is the list the art pass takes when it
 * reopens — see `tests/meta/artFamilies.test.ts`, which holds it to exactly
 * the unpainted set.
 */
import { S } from '@/game/duel/state'
import type { FoePalette } from '@/game/duel/foes'
import { TAU, PI, sin, cos, min, clamp } from '@/game/duel/util'
import type { RigAnchors } from '@/game/duel/chars'

type G2D = CanvasRenderingContext2D

const INK = '#3A2340'

/** Ink the current path the rig's way: a plum outline, the fill on top. */
const inkFill = (g: G2D, fill: string, w: number): void => {
  g.lineWidth = w
  g.strokeStyle = INK
  g.stroke()
  g.fillStyle = fill
  g.fill()
}

/* ================================ head ================================ */
/*
 * Head space: the skull is an ellipse of radius 25 x 23 at the origin, the
 * near ear sits at (0, -19), the horn leaves the brow at (9, -19) heading
 * up-and-forward, and the forelock is swept back over (1, -21). A head item
 * is therefore a BAND across the skull or a small thing perched behind the
 * ear — anything that fills the crown of the head swallows the horn.
 */

/** The band every head item hangs off: over the forelock root, ear to ear. */
const headBand = (g: G2D, lift: number, core: string): void => {
  g.beginPath()
  g.moveTo(-17, -12 - lift)
  g.quadraticCurveTo(-4, -30 - lift, 20, -17 - lift)
  g.lineWidth = 6
  g.strokeStyle = INK
  g.stroke()
  g.lineWidth = 3.4
  g.strokeStyle = core
  g.stroke()
}

/** A point on that band, 0 (far ear) to 1 (brow). */
const bandAt = (u: number, lift: number): [number, number] => [
  (1 - u) * (1 - u) * -17 + 2 * (1 - u) * u * -4 + u * u * 20,
  (1 - u) * (1 - u) * (-12 - lift) + 2 * (1 - u) * u * (-30 - lift) + u * u * (-17 - lift)
]

/**
 * The Acorn Cap: a nut's cup worn as a hat, perched on the back of the skull
 * behind the near ear and tilted over one eye.
 *
 * Behind the ear because the crown of the head belongs to the horn: a hat
 * drawn where a hat goes is a hat with a golden spike through it. The tilt is
 * what turns "a brown dome, badly placed" into "worn at an angle".
 */
export const drawAcornCap = (g: G2D): void => {
  g.save()
  // Low enough that the brim CUTS the skull rather than floating over it:
  // the first placement sat a few units clear and read as a nut hovering
  // beside her ear, which is the whole difference between worn and pasted.
  g.translate(-6, -13)
  g.rotate(-0.28)
  g.lineJoin = g.lineCap = 'round'
  // The cup: a half-dome with a straight brim.
  g.beginPath()
  g.ellipse(0, 0, 14, 11.5, 0, PI, TAU)
  g.closePath()
  inkFill(g, '#a9714a', 3)
  // Its cross-hatch, clipped to the dome so no stitch runs off the felt.
  g.save()
  g.clip()
  g.beginPath()
  for (let i = -3; i <= 3; i++) {
    g.moveTo(i * 4.6, -12)
    g.lineTo(i * 4.6, 0)
  }
  for (let j = 1; j <= 2; j++) {
    g.moveTo(-14, -j * 3.6)
    g.lineTo(14, -j * 3.6)
  }
  g.lineWidth = 1.1
  g.strokeStyle = '#7d4f33'
  g.stroke()
  g.restore()
  // The brim, drawn back over the hatching, and the stalk.
  g.beginPath()
  g.moveTo(-14, 0)
  g.lineTo(14, 0)
  g.lineWidth = 3.2
  g.strokeStyle = '#7d4f33'
  g.stroke()
  g.beginPath()
  g.moveTo(0, -11)
  g.quadraticCurveTo(1.5, -17, 4.5, -19)
  g.lineWidth = 5
  g.strokeStyle = INK
  g.stroke()
  g.lineWidth = 2.6
  g.strokeStyle = '#5c3a24'
  g.stroke()
  g.restore()
}

/** A five-point star on the current path (no beginPath), centred (x, y). */
const starPath = (g: G2D, x: number, y: number, r: number, rot: number): void => {
  for (let i = 0; i < 10; i++) {
    const a = rot - PI / 2 + (i * PI) / 5
    const rr = i & 1 ? r * 0.44 : r
    const px = x + cos(a) * rr
    const py = y + sin(a) * rr
    if (i) g.lineTo(px, py)
    else g.moveTo(px, py)
  }
  g.closePath()
}

/**
 * The Star Tiara: a slim silver band with three points and a sky-blue star
 * over the brow — the "dressed up" option the crown used to be alone in
 * serving, in silver and blue rather than blossom pink.
 */
export const drawStarTiara = (g: G2D): void => {
  g.lineJoin = g.lineCap = 'round'
  headBand(g, 0, '#dfe8ff')
  // Three rising points along the band, tallest in the middle.
  for (const [u, h] of [[0.28, 6], [0.5, 10], [0.72, 6]] as const) {
    const [x, y] = bandAt(u, 0)
    const [x2, y2] = bandAt(u + 0.06, 0)
    const nx = (y2 - y) / Math.hypot(x2 - x, y2 - y)
    const ny = -(x2 - x) / Math.hypot(x2 - x, y2 - y)
    g.beginPath()
    g.moveTo(x - nx * 3.4, y - ny * 3.4)
    g.lineTo(x + nx * h, y + ny * h)
    g.lineTo(x + nx * 3.4, y + ny * 3.4)
    g.closePath()
    inkFill(g, '#dfe8ff', 2)
  }
  const [cx, cy] = bandAt(0.5, 0)
  g.beginPath()
  starPath(g, cx, cy - 11, 6.4, 0)
  inkFill(g, '#9fd8ff', 2.2)
  g.beginPath()
  g.arc(cx, cy - 11, 2, 0, TAU)
  g.fillStyle = '#ffffff'
  g.fill()
}

/**
 * The Explorer Goggles: brass-rimmed lenses on a leather strap, pushed UP
 * onto the forehead the way a goggle is worn when it is not being used.
 *
 * Pushed up, and not over the eyes, for the reason the whole cast has huge
 * eyes: those eyes carry every expression the game has, and a lens over one
 * of them silences her face in every portrait and every duel.
 */
export const drawExplorerGoggles = (g: G2D): void => {
  g.lineJoin = g.lineCap = 'round'
  headBand(g, -3, '#8a5a3c')
  // The strap's keeper, where it tucks behind the far ear.
  const [kx, ky] = bandAt(0.12, -3)
  g.beginPath()
  g.rect(kx - 2.6, ky - 2.6, 5.2, 5.2)
  inkFill(g, '#5c3a24', 1.8)
  // Two lenses, the far one smaller and behind: brass rim, glass, glint.
  for (const [u, r] of [[0.42, 6.9], [0.74, 6.2]] as const) {
    const [x, y] = bandAt(u, -3)
    g.beginPath()
    g.arc(x, y + 1, r, 0, TAU)
    inkFill(g, '#e0b060', 2.6)
    g.beginPath()
    g.arc(x, y + 1, r - 2.2, 0, TAU)
    inkFill(g, '#a8e0ff', 1.4)
    g.beginPath()
    g.arc(x - r * 0.3, y + 1 - r * 0.3, r * 0.3, 0, TAU)
    g.fillStyle = '#ffffff'
    g.fill()
  }
}

/* ================================ neck ================================ */
/*
 * Rig space, off the anchors: `neckCollar` is 70 % up the neck tube and
 * `neckDir` points chest → poll, so an item is placed by stepping DOWN the
 * neck from the collar and out along its normal. Both items below sit as low
 * as the seashell necklace does, clear of the head drawn over them.
 */

/** The collar's frame: the point to hang from, and the neck's normal. */
const collarFrame = (a: RigAnchors, drop: number): [number, number, number, number] => {
  const [dx, dy] = a.neckDir
  return [a.neckCollar[0] - dx * drop, a.neckCollar[1] - dy * drop, -dy, dx]
}

/**
 * The Bow Tie: a proper navy bow at the throat — two loops, a knot and two
 * short tails, squared up to the neck so it reads as tied rather than stuck.
 */
export const drawBowTie = (g: G2D, a: RigAnchors): void => {
  const [cx, cy, nx, ny] = collarFrame(a, 13)
  g.save()
  g.translate(cx, cy)
  g.rotate(Math.atan2(ny, nx))
  g.lineJoin = g.lineCap = 'round'
  // The two tails first, so the knot lands over their roots.
  g.beginPath()
  g.moveTo(-2, 1)
  g.lineTo(-7, 12)
  g.lineTo(-1.5, 10)
  g.closePath()
  g.moveTo(2, 1)
  g.lineTo(7.5, 11)
  g.lineTo(2, 10)
  g.closePath()
  inkFill(g, '#3a58ae', 2.2)
  // The loops: a pinched triangle either side of the knot.
  for (const s of [-1, 1] as const) {
    g.beginPath()
    g.moveTo(s * 1.5, 0)
    g.quadraticCurveTo(s * 9, -8, s * 13, -5)
    g.quadraticCurveTo(s * 11, 0, s * 13, 5)
    g.quadraticCurveTo(s * 9, 8, s * 1.5, 0)
    g.closePath()
    inkFill(g, '#4a6fd0', 2.4)
  }
  g.beginPath()
  g.ellipse(0, 0, 3.6, 4.6, 0, 0, TAU)
  inkFill(g, '#3a58ae', 2.2)
  g.restore()
}

/**
 * The Moon Pendant: a silver crescent and two small stars on a dark cord —
 * the night-sky answer to the seashells, and the neck slot's non-pastel one.
 */
export const drawMoonPendant = (g: G2D, a: RigAnchors): void => {
  const [cx, cy, nx, ny] = collarFrame(a, 12)
  const ax = cx + nx * 12
  const ay = cy + ny * 12
  const bx = cx - nx * 12
  const by = cy - ny * 12
  const kx = cx + 7
  const ky = cy + 11
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(ax, ay)
  g.quadraticCurveTo(kx, ky, bx, by)
  // A dark cord, and a heavy one: at duel size the first pass drew a pale
  // thread on a cream coat, which is a necklace nobody can see her wearing.
  g.lineWidth = 3.4
  g.strokeStyle = INK
  g.stroke()
  g.lineWidth = 1.8
  g.strokeStyle = '#6a5a86'
  g.stroke()
  const at = (u: number): [number, number] => [
    (1 - u) * (1 - u) * ax + 2 * (1 - u) * u * kx + u * u * bx,
    (1 - u) * (1 - u) * ay + 2 * (1 - u) * u * ky + u * u * by
  ]
  for (const u of [0.26, 0.74]) {
    const [x, y] = at(u)
    g.beginPath()
    starPath(g, x, y + 2, 3.6, 0.3)
    inkFill(g, '#ffe9a8', 1.6)
  }
  // The crescent: a disc with a second disc bitten out of it, drawn as one
  // path so the ink runs round the horns instead of across the bite.
  const [mx, my] = at(0.5)
  g.beginPath()
  g.arc(mx, my + 9, 9.6, 0.5, TAU - 0.5)
  g.arc(mx + 4.6, my + 9, 8.6, TAU - 0.75, 0.75, true)
  g.closePath()
  inkFill(g, '#eef4ff', 2.6)
}

/* ================================ back ================================ */

/** A wing's beat: a slow breath at rest, a real flap on a hop, still once
 *  she is down. (The pegasus wings' own curve, kept in step with them.) */
const flapOf = (a: RigAnchors): number =>
  (0.5 + 0.5 * sin(a.t * (2.2 + a.lift * 5)) * (0.25 + 0.75 * a.lift)) * (1 - a.lose)

/** Sweep a back item down and in as the rig collapses. */
const fold = (g: G2D, x: number, y: number, lose: number): void => {
  if (!lose) return
  g.translate(x, y)
  g.rotate(lose * 0.6)
  g.scale(1 - lose * 0.14, 1 - lose * 0.14)
  g.translate(-x, -y)
}

/** One butterfly wing: a big upper lobe and a smaller lower one, rooted at
 *  (x, y) and sweeping up and back; `flap` 0..1 opens it. */
const flutterWing = (
  g: G2D, x: number, y: number, s: number, flap: number, fill: string, edge: string
): void => {
  g.save()
  g.translate(x, y)
  g.rotate(0.12 + flap * 0.42)
  g.scale(s, s)
  g.lineJoin = g.lineCap = 'round'
  // The upper lobe — big and round, the half a butterfly is known by.
  g.beginPath()
  g.moveTo(-2, -4)
  g.bezierCurveTo(-10, -30, -30, -48, -45, -39)
  g.bezierCurveTo(-54, -31, -38, -12, -18, -6)
  g.closePath()
  inkFill(g, fill, 2.8)
  // …and the lower one, clearly a SECOND lobe. The first pair met in the
  // middle and the silhouette came back reading as one leaf.
  g.beginPath()
  g.moveTo(-6, -3)
  g.bezierCurveTo(-20, 1, -35, 9, -32, 18)
  g.bezierCurveTo(-29, 26, -10, 17, -2, 4)
  g.closePath()
  inkFill(g, fill, 2.6)
  // The dark edging and its row of pale eyespots — what makes it a monarch
  // rather than a leaf.
  g.beginPath()
  g.moveTo(-45, -39)
  g.bezierCurveTo(-54, -31, -38, -12, -18, -6)
  g.moveTo(-32, 18)
  g.bezierCurveTo(-29, 26, -10, 17, -2, 4)
  g.lineWidth = 3.6
  g.strokeStyle = edge
  g.stroke()
  g.beginPath()
  for (const [px, py, pr] of [[-34, -31, 2.8], [-27, -20, 2.4], [-19, -28, 2.2], [-22, 11, 2.1], [-12, 9, 1.9]] as const) {
    g.moveTo(px + pr, py)
    g.arc(px, py, pr, 0, TAU)
  }
  g.fillStyle = '#fff6e8'
  g.fill()
  g.restore()
}

/** The Butterfly Wings, far layer (behind the body): rooted high and swept
 *  up, so it clears the near one instead of hiding underneath it. */
export const drawFlutterFar = (g: G2D, a: RigAnchors): void => {
  const [x, y] = a.backWithers
  fold(g, x - 4, y - 10, a.lose)
  flutterWing(g, x - 4, y - 10, 1.4, flapOf(a) * 0.75, '#e0903f', '#8a4a22')
}

/** …and the near layer, over the body and the mane. */
export const drawFlutterNear = (g: G2D, a: RigAnchors): void => {
  const [x, y] = a.backWithers
  fold(g, x - 20, y + 8, a.lose)
  flutterWing(g, x - 20, y + 8, 1.6, flapOf(a), '#ffb35a', '#b25a20')
}

/**
 * The Explorer Pack, far layer: the bedroll strapped across the back behind
 * the withers, sticking out either side of her.
 */
export const drawExplorerPackFar = (g: G2D, a: RigAnchors): void => {
  const [x, y] = a.backWithers
  fold(g, x - 14, y - 20, a.lose)
  g.save()
  // WELL above the withers: the far layer draws behind the barrel, so a
  // bedroll seated on her back is a bedroll inside her — it has to clear
  // the topline before any of it is visible at all.
  g.translate(x - 15, y - 21)
  g.rotate(-0.16)
  g.lineJoin = g.lineCap = 'round'
  g.beginPath()
  g.roundRect(-20, -9, 40, 15, 7)
  inkFill(g, '#8fb28a', 2.6)
  // The rolled ends, and two ties round the roll.
  for (const s of [-1, 1] as const) {
    g.beginPath()
    g.ellipse(s * 19.5, -1.5, 3.2, 7, 0, 0, TAU)
    inkFill(g, '#6f8f6c', 2)
  }
  g.beginPath()
  for (const tx of [-9, 9]) {
    g.moveTo(tx, -9)
    g.lineTo(tx, 6)
  }
  g.lineWidth = 2.4
  g.strokeStyle = '#7d5a3c'
  g.stroke()
  g.restore()
}

/**
 * …and the near layer: the satchel itself on her side, its strap running up
 * over the withers, with a buckle and a little lantern swinging off it.
 */
export const drawExplorerPackNear = (g: G2D, a: RigAnchors): void => {
  const [x, y] = a.backWithers
  fold(g, x - 16, y + 8, a.lose)
  const sway = sin(a.t * 2.4) * (0.06 + a.lift * 0.12) * (1 - a.lose)
  g.save()
  g.translate(x - 26, y + 16)
  g.lineJoin = g.lineCap = 'round'
  // The strap, over the withers and down behind the shoulder.
  g.beginPath()
  g.moveTo(14, -14)
  g.quadraticCurveTo(6, -4, 4, 8)
  g.lineWidth = 5.4
  g.strokeStyle = INK
  g.stroke()
  g.lineWidth = 3
  g.strokeStyle = '#7d5a3c'
  g.stroke()
  // The bag: a soft canvas square with a flap and a buckle.
  g.beginPath()
  g.roundRect(-13, 0, 26, 22, 5)
  inkFill(g, '#c8a887', 2.8)
  g.beginPath()
  g.roundRect(-13, -2, 26, 10, 4)
  inkFill(g, '#a98868', 2.4)
  g.beginPath()
  g.rect(-3, 5, 6, 5)
  inkFill(g, '#e8c46a', 1.8)
  // The lantern, hung off the back corner and swinging with her.
  g.save()
  g.translate(-11, 20)
  g.rotate(sway)
  g.beginPath()
  g.moveTo(0, 0)
  g.lineTo(0, 5)
  g.lineWidth = 2
  g.strokeStyle = INK
  g.stroke()
  g.beginPath()
  g.roundRect(-4.5, 5, 9, 11, 2.5)
  inkFill(g, '#ffd76a', 2.2)
  g.beginPath()
  g.moveTo(-4.5, 8.5)
  g.lineTo(4.5, 8.5)
  g.moveTo(-4.5, 12.5)
  g.lineTo(4.5, 12.5)
  g.lineWidth = 1.2
  g.strokeStyle = '#b2892e'
  g.stroke()
  g.restore()
  g.restore()
}

/* ============================= companions ============================= */
/*
 * Stage space, after the whole rig: a companion floats near her and follows
 * the pose through the anchors, exactly as the Pet Star does. Both below are
 * driven by the rig's own clock (`a.t`), so a paused duel freezes them, and
 * both draw a fixed still in a portrait, where no clock runs between frames.
 */

/**
 * A soft round glow, three alpha steps rather than a per-frame gradient (which
 * allocates in a draw path — see the Pet Star's baked one).
 *
 * The sparkle tier (retention-roadmap item 17) buys two OUTER steps, at a
 * wider radius and a lower alpha, which is what turns a hard-stepped glow into
 * one with a falloff. Their alpha rides `S.qx`, so the extra reach fades in
 * and out with the tier and a keepsake never blinks.
 */
const SOFT_STEPS = [[1, 0.1], [0.66, 0.14], [0.36, 0.22]] as const
const SOFT_WIDE = [[1.9, 0.045], [1.42, 0.07]] as const
const softGlow = (g: G2D, x: number, y: number, r: number, col: string): void => {
  if (!S.q) return
  g.fillStyle = col
  if (S.qx > 0.01) {
    for (const [k, al] of SOFT_WIDE) {
      g.globalAlpha = al * S.qx
      g.beginPath()
      g.arc(x, y, r * k, 0, TAU)
      g.fill()
    }
  }
  for (const [k, al] of SOFT_STEPS) {
    g.globalAlpha = al
    g.beginPath()
    g.arc(x, y, r * k, 0, TAU)
    g.fill()
  }
  g.globalAlpha = 1
}

/**
 * The Pet Cloud: a small, sleepy rain cloud that drifts over her tail,
 * blinks, and lets go of a sparkle of rain now and then — which is the joke,
 * because in this world rain is what makes a meadow come back.
 */
export const drawPetCloud = (g: G2D, a: RigAnchors): void => {
  const t = a.t
  const f = a.facing
  const x = a.portrait ? a.headStage[0] - f * 46 : a.tailStage[0] + f * (-18 + sin(t * 0.9) * 7)
  const y = (a.portrait ? a.headStage[1] - 30 : a.tailStage[1] - 54 + sin(t * 1.8) * 4) - a.lift * 6
  g.save()
  g.translate(x, y)
  g.lineJoin = g.lineCap = 'round'
  // The three rain sparkles fall UNDER the cloud, each on its own beat.
  if (!a.portrait) {
    g.beginPath()
    let any = false
    for (let i = 0; i < 3; i++) {
      const p = (t * 0.7 + i * 0.33) % 1
      if (p > 0.85) continue
      const dy = 12 + p * 26
      const r = 2.6 * (1 - p * 0.5)
      g.moveTo((i - 1) * 8, dy - r * 1.6)
      g.quadraticCurveTo((i - 1) * 8 + r, dy, (i - 1) * 8, dy + r * 1.2)
      g.quadraticCurveTo((i - 1) * 8 - r, dy, (i - 1) * 8, dy - r * 1.6)
      any = true
    }
    if (any) {
      g.fillStyle = '#a6e4ff'
      g.fill()
    }
  }
  // The body: three puffs and a flat base, inked as one mass.
  g.beginPath()
  g.moveTo(-17, 6)
  g.arc(-10, 0, 9, PI * 0.9, PI * 1.85)
  g.arc(1, -5, 11, PI * 1.2, PI * 1.95)
  g.arc(12, 1, 8.5, PI * 1.3, PI * 0.15)
  g.lineTo(-17, 6)
  g.closePath()
  inkFill(g, '#f2f7ff', 3)
  // Its face: two blinking dots and a little smile.
  const blink = !a.portrait && (t * 0.31 + 0.2) % 1 < 0.05
  g.beginPath()
  for (const ex of [-4, 7]) {
    if (blink) {
      g.moveTo(ex - 2.4, -2)
      g.lineTo(ex + 2.4, -2)
    } else {
      g.moveTo(ex + 1.9, -2)
      g.arc(ex, -2, 1.9, 0, TAU)
    }
  }
  if (blink) {
    g.lineWidth = 1.6
    g.strokeStyle = INK
    g.stroke()
  } else {
    g.fillStyle = INK
    g.fill()
  }
  g.beginPath()
  g.arc(1.5, 0, 3.4, 0.25, PI - 0.25)
  g.lineWidth = 1.6
  g.strokeStyle = INK
  g.stroke()
  g.restore()
}

/**
 * The Pet Firefly: a warm little lantern-bug looping a lazy figure-eight
 * around her, with a glow and a short trail of where it has just been.
 */
export const drawPetFirefly = (g: G2D, a: RigAnchors): void => {
  const t = a.t
  const f = a.facing
  const cx = a.portrait ? a.headStage[0] : a.bodyStage[0]
  const cy = a.portrait ? a.headStage[1] : a.bodyStage[1]
  // The figure-eight: twice around in x for once in y, so it crosses in
  // front of her and comes back over her rump.
  const at = (tt: number): [number, number] => [
    cx + f * sin(tt * 0.9) * (a.portrait ? 46 : 74),
    cy - 34 + sin(tt * 1.8) * (a.portrait ? 18 : 26) - a.lift * 8
  ]
  const [x, y] = a.portrait ? [cx - f * 44, cy - 30] : at(t)
  g.save()
  if (!a.portrait && S.q) {
    // The trail: its own path a moment ago, shrinking. Costs no state.
    g.beginPath()
    for (let j = 1; j <= 4; j++) {
      const [px, py] = at(t - j * 0.09)
      g.moveTo(px + 3.4 - j * 0.7, py)
      g.arc(px, py, 3.4 - j * 0.7, 0, TAU)
    }
    g.globalAlpha = 0.4
    g.fillStyle = '#ffe9a0'
    g.fill()
    g.globalAlpha = 1
  }
  softGlow(g, x, y, 30, '#ffe08a')
  g.translate(x, y)
  // Half again as big as first drawn: at duel size a 6-unit beetle with a
  // glow round it reads as a speck of dust on the screen, not a friend.
  g.scale(1.5, 1.5)
  g.lineJoin = g.lineCap = 'round'
  // Wings: a blur either side, opening and closing far too fast to see.
  const w = 0.5 + 0.5 * sin(t * 26)
  g.globalAlpha = 0.5
  for (const s of [-1, 1] as const) {
    g.beginPath()
    g.ellipse(s * 4, -4, 5.5, 2.6 + w * 2.4, s * 0.6, 0, TAU)
    g.fillStyle = '#e8f4ff'
    g.fill()
  }
  g.globalAlpha = 1
  // The body: a dark little beetle with a lit tail.
  g.beginPath()
  g.ellipse(0, 0, 6.4, 4.4, 0, 0, TAU)
  inkFill(g, '#5a4632', 2)
  g.beginPath()
  g.arc(-4.6, 1, 3.4, 0, TAU)
  inkFill(g, '#ffe08a', 1.6)
  g.beginPath()
  g.arc(4.4, -0.6, 2.4, 0, TAU)
  inkFill(g, '#3a2c20', 1.4)
  g.restore()
}

/* =============================== trails =============================== */
/*
 * One pooled emitter for all three trails, because only one can be worn at a
 * time: 36 particles in typed arrays, round-robin reuse, a seeded PRNG, no
 * allocation per frame — the Sparkly Hoof-trail's own contract, and the
 * reason it is a copy rather than an import is at the top of this file.
 *
 * A style decides everything else: the shape drawn, the colours it is
 * batched into, whether it rises or falls, and how fast it comes.
 */
const P_MAX = 36
const PX = new Float32Array(P_MAX)
const PY = new Float32Array(P_MAX)
const PVX = new Float32Array(P_MAX)
const PVY = new Float32Array(P_MAX)
const PAGE = new Float32Array(P_MAX).fill(1)
const PLIFE = new Float32Array(P_MAX)
const PSIZE = new Float32Array(P_MAX)
const PROT = new Float32Array(P_MAX)
const PCOL = new Uint8Array(P_MAX)

interface TrailStyle {
  /** The colours particles are batched into — one fill per colour, per frame. */
  cols: readonly string[]
  /** Stage px/s²: negative floats them up, positive lets them fall. */
  gy: number
  /** Particles per second at rest (a rear and a hop scale it). */
  rate: number
  /** Size and life ranges, [min, span]. */
  size: readonly [number, number]
  life: readonly [number, number]
  /** Sideways speed away from the hoof, and upward speed off it. */
  push: readonly [number, number]
  spin: number
  /** Ink outline width at full quality, 0 for none (a bubble has no ink). */
  ink: number
  alpha: number
  shape: (g: G2D, x: number, y: number, r: number, rot: number) => void
}

/** A soft petal: a rounded teardrop with a folded edge. */
const petalPath = (g: G2D, x: number, y: number, r: number, rot: number): void => {
  const c = cos(rot)
  const s = sin(rot)
  const at = (u: number, v: number): [number, number] => [x + u * c - v * s, y + u * s + v * c]
  const [ax, ay] = at(-r, 0)
  const [bx, by] = at(r, 0)
  g.moveTo(ax, ay)
  g.quadraticCurveTo(...at(0, -r * 0.95), bx, by)
  g.quadraticCurveTo(...at(0, r * 0.5), ax, ay)
  g.closePath()
}

/** A six-armed flake: a star with long thin arms. */
const flakePath = (g: G2D, x: number, y: number, r: number, rot: number): void => {
  for (let i = 0; i < 12; i++) {
    const a = rot + (i * PI) / 6
    const rr = i & 1 ? r * 0.3 : r
    const px = x + cos(a) * rr
    const py = y + sin(a) * rr
    if (i) g.lineTo(px, py)
    else g.moveTo(px, py)
  }
  g.closePath()
}

/** A bubble: the skin, plus a glint that is part of the same path. */
const bubblePath = (g: G2D, x: number, y: number, r: number, rot: number): void => {
  g.moveTo(x + r, y)
  g.arc(x, y, r, 0, TAU)
  const gx = x - r * 0.35
  const gy = y - r * 0.4 + sin(rot) * 0.4
  g.moveTo(gx + r * 0.22, gy)
  g.arc(gx, gy, r * 0.22, 0, TAU)
}

const PETAL: TrailStyle = {
  cols: ['#ffc2dd', '#fff0f6', '#ffd9a8', '#f7b6cf'],
  gy: 42, rate: 8, size: [6.5, 3.5], life: [1.1, 0.8], push: [16, 14], spin: 1.6, ink: 1.8, alpha: 1,
  shape: petalPath
}
const FROST: TrailStyle = {
  cols: ['#dff4ff', '#ffffff', '#a6d8ff'],
  gy: 26, rate: 9, size: [5.4, 3], life: [1.2, 0.7], push: [14, 20], spin: 0.9, ink: 1.4, alpha: 1,
  shape: flakePath
}
const BUBBLE: TrailStyle = {
  cols: ['#cfeeff', '#eafaff', '#ffffff'],
  gy: -34, rate: 6, size: [4.5, 4], life: [1.4, 0.9], push: [12, 26], spin: 2.2, ink: 1.6, alpha: 0.72,
  shape: bubblePath
}

/**
 * The three styles by slug, for anything that wants to draw one WITHOUT the
 * emitter: the shelf badge draws a fixed cluster of the shape in its own
 * colours, so a badge is the trail's actual petal rather than a picture of
 * one that can drift away from it.
 */
export const TRAIL_STYLES: Readonly<Record<string, TrailStyle>> = {
  petalTrail: PETAL,
  frostTrail: FROST,
  bubbleTrail: BUBBLE
}
export type { TrailStyle }

let pNext = 0
let pClock = Number.NaN
let pLift = 0
let pAcc = 0
let pHoof = 0
let pSeed = 11
let pStyle: TrailStyle | null = null
/** The trail's own deterministic dice (no Math.random in a draw path). */
const prnd = (): number => ((pSeed = (pSeed * 16807) % 2147483647) - 1) / 2147483646

/** Live particles right now (for tests and the frame budget). */
export const sideTrailLive = (): number => {
  let n = 0
  for (let i = 0; i < P_MAX; i++) if (PAGE[i]! < PLIFE[i]!) n++
  return n
}
export const SIDE_TRAIL_MAX = P_MAX

const pSpawn = (st: TrailStyle, x: number, y: number, vx: number, vy: number, age = 0): void => {
  const i = pNext
  pNext = (i + 1) % P_MAX
  PX[i] = x + vx * age
  PY[i] = y + vy * age
  PVX[i] = vx
  PVY[i] = vy
  PAGE[i] = age
  PLIFE[i] = st.life[0] + prnd() * st.life[1]
  PSIZE[i] = st.size[0] + prnd() * st.size[1]
  PROT[i] = prnd() * TAU
  PCOL[i] = (prnd() * st.cols.length) | 0
}

const pEmit = (st: TrailStyle, a: RigAnchors, age: number): void => {
  const h = (pHoof ^= 1) ? a.hoofFront : a.hoofHind
  pSpawn(
    st,
    h[0] - a.facing * 4 + (prnd() - 0.5) * 16, h[1] - 3 - prnd() * 8,
    -a.facing * (st.push[0] * (0.5 + prnd())), -(st.push[1] * (0.6 + prnd() * 0.8)),
    age
  )
}

const pStep = (st: TrailStyle, a: RigAnchors, dt: number): void => {
  const drag = 1 - min(1, 0.85 * dt)
  for (let i = 0; i < P_MAX; i++) {
    if (PAGE[i]! >= PLIFE[i]!) continue
    PAGE[i] = PAGE[i]! + dt
    PVX[i] = PVX[i]! * drag
    PVY[i] = PVY[i]! * drag + st.gy * dt
    PX[i] = PX[i]! + PVX[i]! * dt
    PY[i] = PY[i]! + PVY[i]! * dt
  }
  pAcc += st.rate * (1 + 2 * a.lift) * (1 - a.lose) * dt
  while (pAcc >= 1) {
    pAcc -= 1
    pEmit(st, a, 0)
  }
  // The burst: the rising edge of a hop or a cast.
  if (a.lift > 0.45 && pLift <= 0.45 && a.lose < 0.5) {
    for (let k = 0; k < 10; k++) {
      const h = k & 1 ? a.hoofHind : a.hoofFront
      const ang = -PI / 2 + (prnd() - 0.5) * 2.4
      const sp = 40 + prnd() * 60
      pSpawn(st, h[0], h[1] - 4, cos(ang) * sp, sin(ang) * sp)
    }
  }
  pLift = a.lift
}

const pRestart = (st: TrailStyle, a: RigAnchors): void => {
  PAGE.fill(1)
  PLIFE.fill(0)
  pAcc = 0
  pLift = a.lift
  if (a.lose < 0.5) for (let k = 0; k < 9; k++) pEmit(st, a, k * 0.11)
}

/** Where a portrait's still sits: in front of her chest, rising into shot. */
const STILL: readonly (readonly number[])[] = [
  [14, 42, 1], [32, 32, 0.85], [-4, 52, 0.9], [40, 50, 1.05], [24, 58, 0.75]
]

const drawTrail = (g: G2D, a: RigAnchors, st: TrailStyle): void => {
  g.lineJoin = 'round'
  if (a.portrait) {
    g.globalAlpha = st.alpha
    for (let c = 0; c < st.cols.length; c++) {
      g.beginPath()
      let any = false
      for (let i = 0; i < STILL.length; i++) {
        if (i % st.cols.length !== c) continue
        const s = STILL[i]!
        st.shape(g, a.headStage[0] + a.facing * s[0]!, a.headStage[1] + s[1]!, (st.size[0] + 1) * s[2]!, i * 0.7)
        any = true
      }
      if (!any) continue
      if (st.ink && S.q) {
        g.lineWidth = st.ink
        g.strokeStyle = INK
        g.stroke()
      }
      g.fillStyle = st.cols[c]!
      g.fill()
    }
    g.globalAlpha = 1
    return
  }
  // A style change starts the pool over: mixing two shapes in one pool would
  // draw last second's petals as snowflakes.
  const dt = a.t - pClock
  if (st !== pStyle || !(dt >= 0 && dt < 0.5)) {
    pStyle = st
    pRestart(st, a)
  } else if (dt > 0) pStep(st, a, min(dt, 0.1))
  pClock = a.t
  g.globalAlpha = st.alpha
  for (let c = 0; c < st.cols.length; c++) {
    g.beginPath()
    let any = false
    for (let i = 0; i < P_MAX; i++) {
      if (PCOL[i] !== c || PAGE[i]! >= PLIFE[i]!) continue
      const age = PAGE[i]!
      const k = age / PLIFE[i]!
      // Snaps in, then shrinks out rather than fading (art-style.md §6).
      const r = PSIZE[i]! * min(1, age * 14) * (k > 0.6 ? (1 - k) / 0.4 : 1)
      st.shape(g, PX[i]!, PY[i]!, r, PROT[i]! + age * st.spin)
      any = true
    }
    if (!any) continue
    if (st.ink && S.q) {
      g.lineWidth = st.ink
      g.strokeStyle = INK
      g.stroke()
    }
    g.fillStyle = st.cols[c]!
    g.fill()
  }
  g.globalAlpha = 1
}

/** Blossom petals, falling and drifting back behind her. */
export const drawPetalTrail = (g: G2D, a: RigAnchors): void => drawTrail(g, a, PETAL)
/** Little six-armed flakes, settling slowly. */
export const drawFrostTrail = (g: G2D, a: RigAnchors): void => drawTrail(g, a, FROST)
/** Soap bubbles, rising and popping. */
export const drawBubbleTrail = (g: G2D, a: RigAnchors): void => drawTrail(g, a, BUBBLE)

/* ================================ skins =============================== */
/*
 * A skin is a palette and nothing else (§9.7's `skin` split, C31):
 * [coat, shadow, rim, mane, mane streak, horn, hoof, eye, glow, blush].
 * The rig decides everything else, so a skin on Aurora is only a recolour.
 */

/**
 * The Moonlit Look: a silver-blue coat, a deep indigo mane with frost-white
 * streaks and a pale blue horn — the wardrobe's cool, non-pastel skin, and
 * the one §2.4 rule 20 is really asking for in this slot.
 */
export const MOONLIT_LOOK: FoePalette = [
  '#d8e4fb', '#9aaad4', '#ffffff', '#3c4aa6', '#cfe4ff', '#bcd6ff', '#6b7bb5', '#2b2b52', '#a9dcff', '#ff9fc0'
]

/**
 * The Sunset Look: a warm apricot coat with a rose shadow, a sunset-orange
 * mane shot with gold, and a honey horn — evening light, where the Pastel
 * Dream is morning.
 */
export const SUNSET_LOOK: FoePalette = [
  '#ffd7b4', '#e59a84', '#fff3e0', '#ff7a59', '#ffd36b', '#ffb36b', '#c9744a', '#4a2438', '#ffb36b', '#ff8f9c'
]

/* ============================== registries ============================ */
/*
 * `rig-cosmetics.ts` spreads each of these into its own registry, which is
 * the whole of the wiring: one import and four spreads there, every item
 * here. `composeHooks` then treats a second-shelf item exactly like a
 * keepsake — nothing downstream knows the difference.
 */

export const HEAD_DRAW_X: Readonly<Record<string, (g: G2D) => void>> = {
  acornCap: drawAcornCap,
  starTiara: drawStarTiara,
  explorerGoggles: drawExplorerGoggles
}

export const NECK_DRAW_X: Readonly<Record<string, (g: G2D, a: RigAnchors) => void>> = {
  bowTie: drawBowTie,
  moonPendant: drawMoonPendant
}

export const BACK_DRAW_X: Readonly<
  Record<string, readonly [(g: G2D, a: RigAnchors) => void, (g: G2D, a: RigAnchors) => void]>
> = {
  butterflyWings: [drawFlutterFar, drawFlutterNear],
  explorerPack: [drawExplorerPackFar, drawExplorerPackNear]
}

export const COMPANION_DRAW_X: Readonly<Record<string, (g: G2D, a: RigAnchors) => void>> = {
  petCloud: drawPetCloud,
  petFirefly: drawPetFirefly
}

export const TRAIL_DRAW_X: Readonly<Record<string, (g: G2D, a: RigAnchors) => void>> = {
  petalTrail: drawPetalTrail,
  frostTrail: drawFrostTrail,
  bubbleTrail: drawBubbleTrail
}

export const SKIN_PAL_X: Readonly<Record<string, FoePalette>> = {
  moonlitLook: MOONLIT_LOOK,
  sunsetLook: SUNSET_LOOK
}

/**
 * The second shelf's slugs, in one list: what the art pass has NOT painted.
 *
 * Every keepsake on the first shelf has a badge sheet and (for the crown and
 * the star) an item sheet; these fourteen have neither yet, and the art
 * catalogue was closed before they existed. The test that would otherwise
 * read "a keepsake with no badge" as drift reads this list instead, so the
 * gap is declared rather than silent — and deleting a name from here is the
 * first half of painting it.
 */
export const VECTOR_ONLY_KEEPSAKES: readonly string[] = [
  ...Object.keys(HEAD_DRAW_X), ...Object.keys(NECK_DRAW_X), ...Object.keys(BACK_DRAW_X),
  ...Object.keys(COMPANION_DRAW_X), ...Object.keys(TRAIL_DRAW_X), ...Object.keys(SKIN_PAL_X)
]

/** How much of a rig unit one stage unit is, for a still drawn by hand. */
export const clampUnit = clamp
