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
 *
 * EVERY DUEL IS ANNOUNCED (owner, 2026-09-25). `startDuel` and
 * `startVersus` no longer open the arena: they play the five-second VS
 * preview (`game/preview/preview.ts`, scene `preview`) and hand it the duel's
 * real start as its `then`. So there is exactly one door into a duel and it
 * goes through the preview — a map tap, a dialogue's end, the prologue's
 * hand-off, a retry, versus, and the QA jumps alike.
 *
 * WHERE THE DUEL IS SET UP: at the hand-off, all of it. The preview needs
 * nothing of the next duel but its names and its runes (read off the tables
 * and the save), so `resetDuel`, the theme, the duel page, the help ghost, the
 * lesson's and the director's clocks, the HUD mirrors and `duel_start` all
 * run in `beginDuel` — nothing of the fight exists to tick under the fanfare.
 * The MUSIC is the exception: it starts from the top as the preview appears
 * (`resetAudio` first, so the fanfare's cues never sound over a mood the
 * last duel left minor), the fanfare ducks it, and it carries straight on
 * into the fight — `beginDuel` never resets it again.
 */
import { S, save } from '@/game/duel/state'
import { PH_DUEL } from '@/game/duel/config'
import { FOES, VERSUS_FOE } from '@/game/duel/foes'
import { resetDuel, onDuelEvent } from '@/game/duel/sim'
import { resetFx } from '@/game/duel/fx'
import { resetAudio, sfx } from '@/game/duel/audio'
import { STARTING_RUNES, duelSetup, nodeChapter, nodeIsBoss, toolOf } from '@/game/campaign/tables'
import { isReplay, lossStreakOf } from '@/game/campaign/controller'
import { noteFirstWin } from '@/game/campaign/session'
import { earlyEase, duelHpScale } from '@/game/campaign/easing'
import { glimpseDue } from '@/game/campaign/glimpse'
import { newRuneDue } from '@/game/campaign/newRune'
import { armRuneGuide } from '@/game/duel/lesson'
import { markStrengthTaught, strengthLessonDue } from '@/game/campaign/strengthLesson'
import { armStrengthLesson } from '@/game/duel/strengthLesson'
import { pendingSectorNode } from '@/game/campaign/state'
import { gotoScene, closeOverlay } from '@/game/flow/scene'
import { reconcileGameplayBracket } from '@/game/flow/bracket'
import { dipTo, DIP_PUSH } from '@/game/flow/transition'
import { setArenaGift } from '@/game/restore/gift'
import { beginDuelPage, resetDuelPage, stashDuelClearing } from '@/game/duel/duelPage'
import { resetHudMirrors } from '@/use/useDuelHud'
import { closeHelp, helpDue, installDuelHelp, openHelp } from '@/game/duel/help'
import { installPerfectSparkle, resetPerfectMark } from '@/game/duel/perfect'
import { useMusic } from '@/use/useSound'
import { isInterstitialReady, showMidgameAd } from '@/use/useAds'
import { canShowInterstitial, markInterstitialShown, duelEndMoment, type DuelEndMoment } from '@/use/useAdGate'
import { flushSaveNow } from '@/use/useSaveStatus'
import { haptic } from '@/use/useHaptics'
import { track } from '@/use/useAnalytics'
import { reportRun } from '@/use/useLeaderboard'
import { duelBeat } from '@/use/useDuelBeat'
import { sectorOf } from '@/game/map/sectors'
import { versusHud } from '@/use/useVersus'
import { beginPreview, campaignSpec, versusSpec } from '@/game/preview/preview'

/** The flourish / sting: an ad must never cut either off mid-note. */
export const AD_BEAT_MS = 1400
/** A loss's whole knockout beat (story-spec §8.36): the sting, plus the time
 *  to watch her fall asleep before the result card (or an ad) arrives. */
export const KO_BEAT_MS = AD_BEAT_MS + 700
const wait = (ms: number): Promise<void> => new Promise((r) => window.setTimeout(r, ms))

const { startBattleMusic } = useMusic()

let startedAt = 0
let replay = false
/** Bumps on every duel start, so a stale result beat can tell it lost the race. */
let gen = 0

/**
 * What every preview does to the flow first: the last duel's beats lose their
 * race (a result beat still awaiting a wait or an ad checks `gen`), nothing
 * can ask for a second retry, and the music starts from the top.
 */
const enterPreview = (): void => {
  gen++
  duelBeat.phase = 'idle'
  S.resultUp = false
  resetAudio()
  startBattleMusic()
}

/**
 * Node `n`'s duel is chosen (its dialogue, if any, already played): its VS
 * preview plays, and then the duel begins. `onBegin` runs the moment it does,
 * after the arena is up — node 0's opener is raised there (`nodes.ts`),
 * because it is chrome over the arena and must not exist before one.
 */
export const startDuel = (n: number, onBegin?: () => void): void => {
  enterPreview()
  beginPreview(campaignSpec(n, S.campaign.runesUnlocked), () => {
    beginDuel(n)
    onBegin?.()
  })
}

/** The duel of node `n` begins now — the preview has handed over. */
const beginDuel = (n: number): void => {
  const setup = duelSetup(n)
  replay = isReplay(n)
  resetFx()
  setArenaGift(false)
  resetDuel({
    foe: setup.foe, usesMagic: setup.usesMagic, lossStreak: lossStreakOf(n),
    // Her strength, from chapter 2 on (§6.6a): the rune she resists.
    strong: setup.strong,
    // The teaching chapters cost a beginner less (`campaign/easing.ts`); from
    // chapter 4 on this is all 1 and the fight is the roster's own.
    ease: earlyEase(n), versus: false,
    // The first duel starts both bars at half (owner, 2026-09-25).
    hpScale: duelHpScale(n),
    // One early look at how the runes answer each other (story-spec §8.36).
    glimpse: glimpseDue(n, replay)
  })
  // A rune a chest gave her that her hand has never drawn: its guide on the
  // pad for this duel, holding nothing (`campaign/newRune.ts`, `lesson.ts`).
  const guide = newRuneDue(n, S.campaign)
  armRuneGuide(guide)
  // The strength lesson (story-spec §8.36a): the first duel whose strength she
  // owns, once — unless this duel already has a teacher (the rune guide, the
  // glimpse, the help after two losses); then the next duel with a strength.
  const strengthDue = strengthLessonDue({
    strong: setup.strong,
    owned: (S.campaign.runesUnlocked | STARTING_RUNES) >>> 0,
    taught: S.campaign.strengthTaught,
    intro: !!S.intro,
    versus: false,
    runeGuide: guide,
    glimpse: S.glimpse > 0,
    help: helpDue(lossStreakOf(n))
  })
  armStrengthLesson(strengthDue ? { onTaught: () => { if (markStrengthTaught(S.campaign)) save() } } : null)
  // The island dresses for the chapter (§9.6); `arena.ts` rebakes on change.
  S.theme = nodeChapter(n)
  // …and the duel is fought over that sector's own page (§8.29).
  beginDuelPage(n)
  // (No `resetAudio` here: the music started from the top under the preview
  // and plays on into the fight; resetting it now would darken the mood in
  // the middle of the exit's bright sting.)
  resetHudMirrors()
  resetPerfectMark()
  // Visible help after two losses (retention item 8). Called for EVERY duel,
  // due or not, so the last duel's help can never follow the player into the
  // next one — and before the first frame, so a retry opens with the ghost
  // already there rather than a beat later.
  openHelp(n, lossStreakOf(n))
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
 * the shared clock's business (`useAdGate`): nothing in the session's first
 * four minutes of play — unless a chapter's boss was just beaten, first time
 * or replay (`'boss'`, owner 2026-09-24) — then ≥ 160 s of play between any
 * two ads.
 */
const maybeShowInterstitial = async (trigger: DuelEndMoment): Promise<void> => {
  if (!isInterstitialReady.value || !canShowInterstitial(Date.now(), trigger === 'boss')) return
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
  closeHelp()
  resetPerfectMark()
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

/** Both players ready: the match's VS preview, then the match. */
export const startVersus = (): void => {
  enterPreview()
  beginPreview(versusSpec(S.campaign.runesUnlocked), beginVersus)
}

/** The match begins now — the preview has handed over. */
const beginVersus = (): void => {
  prepVersus()
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
    // The funnel's fourth step (retention item 1): a replay counts, because
    // "did this session end in a win" is the question, not "was it new".
    noteFirstWin()
    haptic('reward')
    // What her spells blew off the page travels with her into the wipe
    // (§8.29). Only a WON duel leaves it: a loss changes nothing.
    stashDuelClearing(n)
    // The controller already advanced `furthestNode`: a first win on this
    // node leaves its sector pending — that is the gift.
    const gift = !replay && pendingSectorNode(S.campaign) === n
    if (gift) setArenaGift(true, sectorOf(n).accent, toolOf(n) === 'eraser', nodeIsBoss(n))
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
    // A chapter's boss beaten — replays included — is a break of its own: it
    // may bring the session's first ad before the four-minute mark.
    await maybeShowInterstitial(duelEndMoment(true, nodeIsBoss(n)))
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
  // LOSS: the doze-off sting plays uninterrupted first (safety rule 14) —
  // and long enough to SEE her doze (§8.36): the finishing blow's hold, the
  // fold, then her Zzz for a moment before the card covers the arena.
  duelBeat.phase = 'sting'
  await wait(KO_BEAT_MS)
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

/**
 * Loss beat → Retry: the same node again, dialogue not replayed — through its
 * VS preview like every duel, so the page turns to it. The beat is let go at
 * once, so a second press during the turn cannot queue a second retry.
 */
export const retry = (): void => {
  if (duelBeat.phase !== 'loss') return
  sfx('ui')
  S.resultUp = false
  duelBeat.phase = 'idle'
  const n = S.flow.node
  dipTo(() => startDuel(n), DIP_PUSH)
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
  closeHelp()
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
  // The perfect-rune sparkle listens to the same sim (retention item 7). It
  // is installed from here rather than from the scene so that everything the
  // duel's own flow subscribes to is turned on in one place.
  const stopSparkle = installPerfectSparkle()
  // …and the after-two-losses help closes itself on the sim's own `finish`
  // (retention item 8), for the same reason.
  const stopHelp = installDuelHelp()
  off = () => {
    stop()
    stopSparkle()
    stopHelp()
    off = null
  }
  return off
}

/** The foe of the duel on screen — for chrome that names her. */
export const currentFoe = () => FOES[S.foe]!
