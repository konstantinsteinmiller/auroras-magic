/**
 * flow/duelFlow.ts — the duel controller (story-spec §4.1.5, §3.2.2–§3.2.5,
 * §11.3–§11.4). The sim-facing half of what `GameScene.vue` used to own:
 * which node is fought, and what happens when it ends. The duel's DOM chrome
 * (`GameScene.vue`) only calls in.
 *
 * WIN (§3.2.2 steps 1–4, §11.3): the flourish plays in full (1.4 s) while the
 * sector's gift drops onto the island; a boss adds her two-bubble thank-you
 * in the arena; THEN an interstitial if one is due; then the page turns to
 * the map, where the gift waits. The ad comes after the reward is seen and
 * before the next screen, never over either.
 *
 * LOSS (§3.2.4, §11.4, safety rule 14): the doze-off sting plays first,
 * uninterrupted; then an interstitial if due; then the loss beat in the arena:
 * Retry (straight back in, no dialogue) or Map. There is no reward offer on a
 * loss, ever (D3).
 *
 * REPLAY (§3.2.5, C24): no gift, no reward; the interstitial clock is checked
 * exactly as normal; the page turns straight back to the map.
 *
 * VERSUS (§6.19, C18, S5): local 2P from the `versusSetup` scene. The right
 * duelist is player 2 (no AI). No campaign side-effects, no duel counted;
 * the result is both players' together (§2.2 rule 21); the interstitial
 * clock is checked once per match; then back to the ready screen.
 */
import { S } from '@/game/duel/state'
import { PH_DUEL } from '@/game/duel/config'
import { FOES, VERSUS_FOE } from '@/game/duel/foes'
import { resetDuel, onDuelEvent } from '@/game/duel/sim'
import { resetFx } from '@/game/duel/fx'
import { resetAudio, sfx } from '@/game/duel/audio'
import { duelSetup, nodeChapter, nodeIsBoss, toolOf } from '@/game/campaign/tables'
import { isReplay, lossStreakOf } from '@/game/campaign/controller'
import { earlyEase } from '@/game/campaign/easing'
import { pendingSectorNode } from '@/game/campaign/state'
import { gotoScene, closeOverlay } from '@/game/flow/scene'
import { reconcileGameplayBracket } from '@/game/flow/bracket'
import { dipTo } from '@/game/flow/transition'
import { setArenaGift } from '@/game/restore/gift'
import { beginDuelPage, resetDuelPage, stashDuelClearing } from '@/game/duel/duelPage'
import { resetHudMirrors } from '@/use/useDuelHud'
import { useMusic } from '@/use/useSound'
import { isInterstitialReady, showMidgameAd } from '@/use/useAds'
import { canShowInterstitial, markInterstitialShown } from '@/use/useAdGate'
import { flushSaveNow } from '@/use/useSaveStatus'
import { haptic } from '@/use/useHaptics'
import { track } from '@/use/useAnalytics'
import { reportRun } from '@/use/useLeaderboard'
import { duelBeat } from '@/use/useDuelBeat'
import { sectorOf } from '@/game/map/sectors'
import { versusHud } from '@/use/useVersus'

/** The flourish / sting: an ad must never cut either off mid-note. */
export const AD_BEAT_MS = 1400
const wait = (ms: number): Promise<void> => new Promise((r) => window.setTimeout(r, ms))

const { startBattleMusic } = useMusic()

let startedAt = 0
let replay = false
/** Bumps on every duel start, so a stale result beat can tell it lost the race. */
let gen = 0

/** The duel of node `n` begins now (dialogue, if any, already played). */
export const startDuel = (n: number): void => {
  const setup = duelSetup(n)
  replay = isReplay(n)
  resetFx()
  setArenaGift(false)
  resetDuel({
    foe: setup.foe, usesMagic: setup.usesMagic, lossStreak: lossStreakOf(n),
    // The teaching chapters cost a beginner less (`campaign/easing.ts`); from
    // chapter 4 on this is all 1 and the fight is the roster's own.
    ease: earlyEase(n), versus: false
  })
  // The island dresses for the chapter (§9.6); `arena.ts` rebakes on change.
  S.theme = nodeChapter(n)
  // …and the duel is fought over that sector's own page (§8.29).
  beginDuelPage(n)
  resetAudio()
  resetHudMirrors()
  duelBeat.phase = 'fight'
  duelBeat.node = n
  gen++
  startedAt = performance.now()
  startBattleMusic()
  // A same-scene re-entry (a retry) goes through gotoScene too, so the
  // bracket sees the duel phase rejoin PH_DUEL (§4.1.3).
  gotoScene('duel', n)
  reconcileGameplayBracket()
  track('duel_start', {
    nodeId: n, chapter: nodeChapter(n), isBoss: nodeIsBoss(n), wins: S.wins, losses: S.losses,
    lossStreak: lossStreakOf(n), duelsPlayedTotal: S.wins + S.losses
  })
}

/**
 * The between-duels break, after a win AND after a loss (F25). How often is
 * the shared clock's business: nothing in the session's first four minutes,
 * then ≥ 121 s between any two ads.
 */
const maybeShowInterstitial = async (trigger: 'win' | 'loss'): Promise<void> => {
  if (!isInterstitialReady.value || !canShowInterstitial()) return
  markInterstitialShown()
  track('ad_interstitial_shown', { trigger })
  try {
    await showMidgameAd()
  } finally {
    // The ad path hard-stops the music; bring it back through the normal
    // start, so a portal mute that arrived meanwhile still wins.
    startBattleMusic()
  }
}

/* ─────────────────────────── local 2P versus ─────────────────────────── */

/** The arena set for a versus match: both duelists at full HP, the
 *  Festival's island (chapter 10's theme — where the two became friends). */
const prepVersus = (): void => {
  resetFx()
  setArenaGift(false)
  resetDuel({ foe: VERSUS_FOE, usesMagic: false, lossStreak: 0, versus: true })
  S.theme = 9
  resetHudMirrors()
  versusHud.winner = -1
}

/** The map's versus affordance: to the ready screen (§4.1.3). */
export const openVersus = (): void => {
  dipTo(() => {
    prepVersus()
    versusHud.ready = [false, false]
    duelBeat.phase = 'idle'
    gotoScene('versusSetup')
  }, 0.4)
}

/** Both players ready: the match begins. */
export const startVersus = (): void => {
  prepVersus()
  resetAudio()
  duelBeat.phase = 'fight'
  duelBeat.node = -1
  gen++
  startedAt = performance.now()
  startBattleMusic()
  gotoScene('duel', -1, 'versus')
  reconcileGameplayBracket()
  track('versus_start', {})
}

/** Back to the map from the ready screen: versus is over. */
export const leaveVersus = (): void => {
  S.versus = false
  versusHud.ready = [false, false]
  dipTo(() => gotoScene('map'), 0.4)
}

/** A match ended: both players see it together, then the ready screen. */
const onVersusFinish = async (p1Won: boolean): Promise<void> => {
  const my = gen
  reconcileGameplayBracket()
  track('versus_end', { p1Won, durationMs: Math.round(performance.now() - startedAt) })
  haptic('reward')
  versusHud.winner = p1Won ? 0 : 1
  duelBeat.phase = 'versusEnd'
  await wait(2600)
  if (my !== gen) return
  await maybeShowInterstitial('win')
  if (my !== gen) return
  dipTo(() => {
    duelBeat.phase = 'idle'
    versusHud.ready = [false, false]
    prepVersus()
    gotoScene('versusSetup')
  }, 0.4)
}

/** The duel ended (the sim's `finish`). */
const onFinish = async (won: boolean): Promise<void> => {
  // The fight is over, so the book shuts now rather than at the page turn
  // two seconds later: an overlay pauses the game, and a flourish nobody can
  // see is not a celebration (§8.32).
  closeOverlay()
  if (S.flow.mode === 'versus') return onVersusFinish(won)
  const n = S.flow.node
  const my = gen
  // The live window closed the instant S.phase left PH_DUEL (§11.2).
  reconcileGameplayBracket()
  track('duel_end', {
    nodeId: n, chapter: nodeChapter(n), isBoss: nodeIsBoss(n), won,
    durationMs: Math.round(performance.now() - startedAt), lossStreak: lossStreakOf(n)
  })
  void flushSaveNow()
  if (won) {
    haptic('reward')
    // What her spells blew off the page travels with her into the wipe
    // (§8.29). Only a WON duel leaves it: a loss changes nothing.
    stashDuelClearing(n)
    // The controller already advanced `furthestNode`: a first win on this
    // node leaves its sector pending — that is the gift.
    const gift = !replay && pendingSectorNode(S.campaign) === n
    if (gift) setArenaGift(true, sectorOf(n).accent, toolOf(n) === 'eraser')
    duelBeat.phase = 'flourish'
    await wait(AD_BEAT_MS)
    if (my !== gen) return
    // A boss's thank-you, in the arena, while she is still on screen (§3.2.3).
    if (gift && nodeIsBoss(n)) {
      duelBeat.phase = 'thanks'
      await new Promise<void>((r) => { thanksDone = r })
      if (my !== gen) return
    }
    duelBeat.phase = 'toMap'
    await maybeShowInterstitial('win')
    if (my !== gen) return
    // Fire and forget, after the win: lifetime duels won, tie-broken by the
    // furthest node reached.
    void reportRun(S.wins, S.campaign.furthestNode + 1)
    dipTo(() => {
      setArenaGift(false)
      resetDuelPage()
      duelBeat.phase = 'idle'
      gotoScene('map', gift ? n : -1)
    })
    return
  }
  // LOSS: the doze-off sting plays uninterrupted first (safety rule 14).
  duelBeat.phase = 'sting'
  await wait(AD_BEAT_MS)
  if (my !== gen) return
  await maybeShowInterstitial('loss')
  if (my !== gen) return
  duelBeat.phase = 'loss'
  S.resultUp = true
  S.panelT = 0
  reconcileGameplayBracket()
}

let thanksDone: (() => void) | null = null
/** The thank-you bubbles were read (or skipped). */
export const finishThanks = (): void => {
  const r = thanksDone
  thanksDone = null
  r?.()
}

/** Loss beat → Retry: the same node, straight back in, dialogue not replayed. */
export const retry = (): void => {
  if (duelBeat.phase !== 'loss') return
  sfx('ui')
  S.resultUp = false
  startDuel(S.flow.node)
}

/** Loss beat → Map (or a replay's end): page-turn to the idle map. */
export const toMap = (): void => {
  sfx('ui')
  S.resultUp = false
  duelBeat.phase = 'idle'
  dipTo(() => {
    resetDuelPage()
    gotoScene('map')
  })
}

/**
 * Options → Leave duel (§3.3.8): no win, no loss, no gift. Reported so
 * Dream Dust's question (does an abandon count?) can be answered from data.
 */
export const leaveDuel = (): void => {
  if (S.flow.scene !== 'duel' || S.phase !== PH_DUEL) return
  if (S.flow.mode === 'versus') {
    gen++
    duelBeat.phase = 'idle'
    leaveVersus()
    return
  }
  track('duel_abandon', { nodeId: S.flow.node, wasReplay: replay })
  gen++
  S.resultUp = false
  duelBeat.phase = 'idle'
  // Hold the duel where it stands; the map never steps the sim.
  dipTo(() => {
    resetDuelPage()
    gotoScene('map')
  })
}

let off: (() => void) | null = null
/** Subscribe to the sim. Called once by the app root. */
export const installDuelFlow = (): (() => void) => {
  if (off) return off
  const stop = onDuelEvent((e, won) => {
    if (e === 'finish') void onFinish(!!won)
  })
  off = () => {
    stop()
    off = null
  }
  return off
}

/** The foe of the duel on screen — for chrome that names her. */
export const currentFoe = () => FOES[S.foe]!
