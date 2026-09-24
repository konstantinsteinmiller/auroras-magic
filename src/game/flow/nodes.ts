/**
 * flow/nodes.ts — how a player gets into a node, and where a session starts
 * (story-spec §3.2.1, §3.2.5, §4.4; retention-roadmap item 2).
 *
 * BOOT, from the save alone (no main menu, ever):
 *   • a gift is waiting (won, not yet wiped)   → the map, focused on it;
 *   • otherwise, a next node exists             → that node's dialogue;
 *   • everything built is done                  → the map, all restored.
 * A duel's own state is never saved, so a player who closed mid-duel simply
 * meets that node's dialogue again.
 *
 * THE PROLOGUE, THEN NODE 0 (owner, 2026-09-24). A brand-new save opens the
 * picture book (§8.26) at its first page and plays only its PROLOGUE: Aurora
 * says hello, and two seconds later Umbra floats in and blows dust over the
 * meadow. About five seconds, skippable from the first frame. It turns
 * straight into the campaign's first duel, against Umbra herself
 * (`foes.ts` `FIRST_UMBRA`), on that same dusty page. Without it, the duel
 * had no reason in the story. The opener is still printed over the arena, all
 * three beats turning themselves over, and the duel is drawable from the frame
 * it arrives on. The prologue plays once (`prologueSeen`). A player who closes
 * the tab mid-duel comes back straight into the duel.
 *
 * The REST of the book, the LESSON, still plays once between the first win
 * and the first CLEANING (`openGift`). It is the part that says what the
 * sponge is for (owner, 2026-09-23). `introSeen` is unchanged, so a returning
 * player is never sent back through it.
 *
 * ENTERING A NODE from the map: a node already won is practice (C24) — its
 * dialogue is skipped automatically, straight to the duel. Otherwise its
 * dialogue plays first. While a gift is still waiting, the NEXT node stays
 * shut: at most one sector may be in progress (C9), and a second pending
 * sector would never be reachable again.
 */
import { S, save } from '@/game/duel/state'
import { pendingSectorNode, nextDuelNode } from '@/game/campaign/state'
import { LAST_BUILT_NODE } from '@/game/campaign/tables'
import { isReplay, markDialogueSeen } from '@/game/campaign/controller'
import { dialogueFor, openingLines, OPENING_NODE } from '@/game/story/story'
import { gotoScene } from '@/game/flow/scene'
import { dipTo, fading, DIP_PUSH } from '@/game/flow/transition'
import { startDuel } from '@/game/flow/duelFlow'
import { openSector } from '@/game/flow/restoreFlow'
import { focusMap } from '@/game/map/map'
import { beginIntro, type IntroPart } from '@/game/story/intro'
import { openingHud } from '@/use/useFlow'
import { track } from '@/use/useAnalytics'

/** Where this session starts. Called once, after `load()`. */
export const bootScene = (): void => {
  startFromSave()
}

/**
 * The picture-book intro (§8.26), or one part of it (`IntroPart`). Watching
 * a part to the end and skipping it both count as seen: the prologue sets
 * `prologueSeen`, and the lesson or the whole book sets `introSeen` (which
 * covers the prologue too). With `then`, the book hands over to it when it
 * ends: the first duel after the prologue, the first cleaning after the
 * lesson. Without it, the book returns to the scene it was opened from (a
 * replay from Options).
 */
export const playIntro = (replay = false, then?: () => void, part: IntroPart = 'whole'): void => {
  const from = { scene: S.flow.scene, node: S.flow.node }
  gotoScene('intro')
  track('intro_start', { replay, part })
  beginIntro((skipped, beat) => {
    track('intro_end', { skipped, beat, replay, part })
    const cs = S.campaign
    const unrecorded = part === 'prologue' ? !cs.prologueSeen : !cs.introSeen || !cs.prologueSeen
    if (unrecorded) {
      cs.prologueSeen = true
      if (part !== 'prologue') cs.introSeen = true
      save()
    }
    // `then` turns its own page (the gift's zoom), so the book does not turn
    // one of its own first: two turns back to back read as a stutter.
    if (then) {
      then()
      return
    }
    dipTo(() => {
      if (from.scene !== 'intro' && from.scene !== 'boot') gotoScene(from.scene, from.node)
      else startFromSave()
    }, DIP_PUSH)
  }, part)
}

/**
 * A waiting gift was tapped (or its card, or Enter on the map) — the player's
 * one door into a cleaning.
 *
 * THE BOOK'S LESSON COMES FIRST, ONCE (owner, 2026-09-23). Aurora's magic
 * turns into a sponge and scrubs the dusty meadow clean. Played after the
 * first cleaning, it explained something the child had already done, so it
 * explained nothing. Here it sits between the first win and the first sponge,
 * and its last page's Play button opens the very gift that was tapped: the
 * lesson, then the practice, with nothing in between. A save that won its
 * first duel before the prologue existed never saw Umbra's dust, so it gets
 * the whole book here instead.
 *
 * Not at the win itself: the gift is the reward, and it is the child's tap on
 * it that says she is ready for what comes next. And it cannot be missed by
 * closing the tab — a save that boots with the gift waiting and the book
 * unseen meets it at the same tap.
 */
export const openGift = (n: number): void => {
  if (S.campaign.introSeen) {
    openSector(n)
    return
  }
  const part: IntroPart = S.campaign.prologueSeen ? 'lesson' : 'whole'
  dipTo(() => playIntro(false, () => openSector(n), part), DIP_PUSH)
}

/**
 * Node 0, for a player who has not met Umbra yet: the book's prologue first.
 * It turns straight into the duel when it ends, whether watched or skipped.
 * The prologue's last frame is the dusty meadow the duel is fought on, so the
 * page turn is the only thing between them.
 */
const playPrologue = (n: number): void => {
  playIntro(false, () => dipTo(() => openOnArena(n), DIP_PUSH), 'prologue')
}

/** Where the save says to start: a waiting gift, the next dialogue, or the map. */
const startFromSave = (): void => {
  const cs = S.campaign
  const pending = pendingSectorNode(cs)
  if (pending !== null) {
    gotoScene('map', pending)
    return
  }
  const next = nextDuelNode(cs)
  if (cs.furthestNode >= LAST_BUILT_NODE || next > LAST_BUILT_NODE) {
    gotoScene('map')
    return
  }
  enterDialogue(next)
}

/** Can the player start node `n` from the map right now? */
export const nodePlayable = (n: number): boolean => {
  if (n < 0 || n > LAST_BUILT_NODE) return false
  if (isReplay(n)) return true
  return n === nextDuelNode(S.campaign) && pendingSectorNode(S.campaign) === null
}

const enterDialogue = (n: number): void => {
  // NODE 0 IS PLAYED, NOT READ (retention item 2). It is the node a stranger
  // meets and the one every portal grades conversion on, so its opener is
  // printed over the arena (see `openOnArena`) and the duel is drawable from
  // the frame it arrives on. The only thing in front of it is the book's
  // ~5 s prologue, once, which is the reason for the fight.
  if (n === OPENING_NODE) {
    if (!S.campaign.prologueSeen) playPrologue(n)
    else openOnArena(n)
    return
  }
  if (!dialogueFor(n).length) {
    startDuel(n)
    return
  }
  // The story is printed on the page it happens on (§8.28): open the book at
  // this node's chapter, so the words sit under its own picture.
  focusMap(n)
  gotoScene('dialogue', n)
}

/* ───────────────────── node 0: the opening, over the arena ───────────── */

/**
 * Straight into the duel, with the opener laid over it.
 *
 * The bubbles are chrome, not a scene: they take no taps (the canvas
 * underneath keeps every one of them), they pause nothing, they turn
 * themselves over on the book's own page pace, and the foe holds still behind
 * them exactly as she does through the onboarding beats. So the player may
 * start drawing the instant the first one appears — that stroke ends the
 * sequence wherever it has reached — or ignore the whole thing.
 */
const openOnArena = (n: number): void => {
  // Recorded as met the moment it is RAISED, not when it is put away: most
  // players will never see the last beat, because they will be drawing by
  // then, and a sequence nobody is waiting on has no other moment to record.
  // It is printed again on a second visit — it costs a player who came back
  // mid-node nothing, because it never stood in their way the first time.
  markDialogueSeen(n)
  openingHud.live = openingLines().length > 0
  startDuel(n)
}

/**
 * Fold the opening away, at whatever beat it has reached. Called when the
 * first real stroke lands (the player is playing, and the story has had as
 * long as she was willing to give it), when the skip icon is pressed, when
 * the last beat runs out, and whenever the duel scene is left. Idempotent.
 */
export const closeOpening = (): void => {
  openingHud.live = false
}

/** A node was tapped on the map. */
export const playNode = (n: number): void => {
  // A card with its gift still on it opens the GIFT. The present is a small
  // target on a big card, and a won node otherwise counts as practice — so a
  // child who pressed the picture instead of the bow was sent back into the
  // duel she had just won, and again after winning it, and never reached the
  // cleaning at all (owner, 2026-09-23). A pending sector has nothing to
  // practise: it is the one place on the map that is waiting for her.
  if (pendingSectorNode(S.campaign) === n) {
    openGift(n)
    return
  }
  if (!nodePlayable(n)) return
  if (isReplay(n)) {
    // A finished node played again — what there is to do after the finale,
    // and the number item 4's replay goals will be judged against.
    track('node_replay', { nodeId: n })
    dipTo(() => startDuel(n), DIP_PUSH)
  } else dipTo(() => enterDialogue(n), DIP_PUSH)
}

/** The node's dialogue finished (or was skipped): into the duel. */
export const dialogueDone = (): void => {
  // Once per dialogue: a second "done" (a double tap, the skip icon and the
  // last bubble together) must not queue a second duel start.
  if (S.flow.scene !== 'dialogue' || fading()) return
  const n = S.flow.node
  markDialogueSeen(n)
  dipTo(() => startDuel(n), DIP_PUSH)
}

/** The dialogue's map-jump (back) icon. */
export const dialogueToMap = (): void => {
  dipTo(() => gotoScene('map'))
}
