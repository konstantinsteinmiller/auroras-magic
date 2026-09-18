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
 */
import { S } from '@/game/duel/state'
import { PH_DUEL } from '@/game/duel/config'
import { FOES } from '@/game/duel/foes'
import { resetDuel, onDuelEvent } from '@/game/duel/sim'
import { resetFx } from '@/game/duel/fx'
import { resetAudio, sfx } from '@/game/duel/audio'
import { duelSetup, nodeChapter, nodeIsBoss } from '@/game/campaign/tables'
import { isReplay, lossStreakOf } from '@/game/campaign/controller'
import { pendingSectorNode } from '@/game/campaign/state'
import { gotoScene } from '@/game/flow/scene'
import { reconcileGameplayBracket } from '@/game/flow/bracket'
import { dipTo } from '@/game/flow/transition'
import { setArenaGift } from '@/game/restore/gift'
import { resetHudMirrors } from '@/use/useDuelHud'
import { useMusic } from '@/use/useSound'
import { isInterstitialReady, showMidgameAd } from '@/use/useAds'
import { canShowInterstitial, markInterstitialShown } from '@/use/useAdGate'
import { flushSaveNow } from '@/use/useSaveStatus'
import { haptic } from '@/use/useHaptics'
import { track } from '@/use/useAnalytics'
import { reportRun } from '@/use/useLeaderboard'
import { duelBeat } from '@/use/useDuelBeat'

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
  resetDuel({ foe: setup.foe, usesMagic: setup.usesMagic, lossStreak: lossStreakOf(n) })
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

/** The duel ended (the sim's `finish`). */
const onFinish = async (won: boolean): Promise<void> => {
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
    // The controller already advanced `furthestNode`: a first win on this
    // node leaves its sector pending — that is the gift.
    const gift = !replay && pendingSectorNode(S.campaign) === n
    if (gift) setArenaGift(true)
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
  dipTo(() => gotoScene('map'))
}

/**
 * Options → Leave duel (§3.3.8): no win, no loss, no gift. Reported so
 * Dream Dust's question (does an abandon count?) can be answered from data.
 */
export const leaveDuel = (): void => {
  if (S.flow.scene !== 'duel' || S.phase !== PH_DUEL) return
  track('duel_abandon', { nodeId: S.flow.node, wasReplay: replay })
  gen++
  S.resultUp = false
  duelBeat.phase = 'idle'
  // Hold the duel where it stands; the map never steps the sim.
  dipTo(() => gotoScene('map'))
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
