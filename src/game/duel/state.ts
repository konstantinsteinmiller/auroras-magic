/**
 * SHARED CONTRACT — every duel module imports from here.
 *
 * ALL duel state lives in ONE object: `auroras_magic_state` (exported also as
 * `S`, a short alias for the same reference). Nothing else may hold mutable
 * duel state. It is deliberately a PLAIN object, not a Vue `reactive()`: the
 * simulation writes it 120 times a second and the renderer reads it every
 * frame, and routing that through dependency tracking would buy nothing. The
 * HUD sees it through `useDuelHud`, which copies out only what changed.
 *
 * Persistence is a small subset of it, written as `am_*` fields of the single
 * `auroras_magic_state` save blob (see `save` / `load` below and `src/keys.ts`),
 * so a platform build round-trips one object through its cloud store.
 */
import {
  HP_MAX, PH_DUEL, FOES, type Phase, type Rune, type SpellKind
} from '@/game/duel/config'
import { clamp, sin, TAU } from '@/game/duel/util'
import { getState, setStates } from '@/use/useGameState'
import {
  WINS_KEY, LOSSES_KEY, BEST_TIME_KEY, SPELLS_SEEN_KEY, ONBOARDED_KEY,
  BEST_STAGE_KEY, COINS_KEY, UPGRADES_KEY, RUNS_KEY
} from '@/keys'

/** A spell in flight. */
export interface Shot {
  x: number
  y: number
  /** Target x — the duelist it will land on. */
  tx: number
  /** Rune that colours it (the last one drawn). */
  r: Rune
  /** Spell kind. */
  k: SpellKind
  dmg: number
  /** Extra seconds (dot / slow) from the spell matrix. */
  ex: number
  /** +1 flies right (cast by Aurora), -1 flies left (cast by the foe). */
  dir: number
  /** Super-effective — for the callout on impact. */
  w: 0 | 1
  /** Runes in the cast, for the combo callout. */
  n: number
  delay: number
  life: number
}

/** A floating HUD callout. `k` is an i18n key under `pop.`; `p` its params. */
export interface Pop {
  id: number
  k: string
  p?: Record<string, string | number>
  c: string
  x: number
  y: number
  /** Age in seconds. The callout lives 1.3 s. */
  a: number
}

export const POP_LIFE = 1.3

/** The clean rune flashing after a recognised stroke. */
export interface Snap { r: Rune; t: number }

export interface DuelState {
  /* viewport + stage transform */
  w: number
  h: number
  dpr: number
  /** stage->screen offset and scale */
  vx: number
  vy: number
  vs: number
  /** portrait layout: the stage sits at the top and a drawing pad fills the rest */
  portrait: boolean
  t: number
  dt: number

  /* flow */
  phase: Phase
  /** Seconds since the duel ended — drives the win / collapse poses. */
  over: number
  /** The end panel is visible — false while an interstitial plays first. */
  resultUp: boolean
  /** Seconds the end panel has been visible — gates "tap to duel again". */
  panelT: number
  book: 0 | 1
  intro: 0 | 1
  introStep: number
  introT: number
  round: number

  /* duelists */
  hp: number
  ehp: number
  queue: Rune[]
  equeue: Rune[]
  eForm: number
  /** The rune the foe is forming, or -1 before the first pick. */
  eRune: number
  eThink: number
  guard: number
  eGuard: number
  /** Barrier flavour: 0 wind · 1 earth · 2 ice pillar. */
  guardK: number
  eGuardK: number
  burn: number
  eBurn: number
  slow: number
  eSlow: number
  castAnim: number
  eCastAnim: number
  hurt: number
  eHurt: number

  /* drawing */
  draw: 0 | 1
  pts: number[]
  snap: Snap | null

  /* spells in flight */
  shots: Shot[]

  /* scoring / meta */
  foe: number
  coins: number
  up: number[]
  wins: number
  losses: number
  best: number
  dur: number
  seen: Record<string, 1>
  combo: number
  /** Coins the last win paid — the rewarded ×2 doubles exactly this. */
  lastPay: number

  /* feel */
  shake: number
  flash: number
  sky: number
  pops: Pop[]

  /* adaptive quality */
  q: number
  fdt: number
}

const BASE_SEEN = (): Record<string, 1> => ({ '0': 1, '1': 1, '2': 1, '3': 1 })

/**
 * THE single duel-state object. Everything mutable lives here.
 * (Exported as both `auroras_magic_state` and the short alias `S`.)
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const auroras_magic_state: DuelState = {
  w: 0,
  h: 0,
  dpr: 1,
  vx: 0,
  vy: 0,
  vs: 1,
  portrait: false,
  t: 0,
  dt: 0,

  phase: PH_DUEL,
  over: 0,
  resultUp: false,
  panelT: 0,
  book: 0,
  intro: 1,
  introStep: 0,
  introT: 0,
  round: 1,

  hp: HP_MAX,
  ehp: HP_MAX,
  queue: [],
  equeue: [],
  eForm: 0,
  /* Umbra commits to her rune up front so the player can READ her and
     counter — GDD 3.4 wants a ghostly outline of the real rune. */
  eRune: -1,
  eThink: 1.2,
  guard: 0,
  eGuard: 0,
  guardK: 0,
  eGuardK: 0,
  burn: 0,
  eBurn: 0,
  slow: 0,
  eSlow: 0,
  castAnim: 0,
  eCastAnim: 0,
  hurt: 0,
  eHurt: 0,

  draw: 0,
  pts: [],
  snap: null,

  shots: [],

  foe: 0,
  coins: 0,
  up: [0, 0, 0, 0],
  wins: 0,
  losses: 0,
  best: 0,
  dur: 0,
  /* The four single-rune spells start KNOWN — they are the alphabet, not a
     secret, and a book that opens completely blank teaches nothing. */
  seen: BASE_SEEN(),
  combo: 0,
  lastPay: 0,

  shake: 0,
  flash: 0,
  sky: 0.5,
  pops: [],

  q: 1,
  fdt: 0.016
}
/** Short alias. Same object — never reassign either binding. */
export const S = auroras_magic_state

/* --------------------------- persistence --------------------------- */

/** Write the handful of fields worth surviving a reload into the save blob. */
export const save = (): void => {
  setStates({
    [WINS_KEY]: S.wins,
    [LOSSES_KEY]: S.losses,
    [RUNS_KEY]: S.wins + S.losses,
    [BEST_TIME_KEY]: S.best,
    [SPELLS_SEEN_KEY]: { ...S.seen },
    [ONBOARDED_KEY]: S.intro ? 0 : 1,
    [BEST_STAGE_KEY]: S.foe,
    [COINS_KEY]: S.coins,
    [UPGRADES_KEY]: [...S.up]
  })
}

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return Number.isFinite(n) ? n : 0
}

/** Read the persisted fields back. Safe on a fresh profile and on junk. */
export const load = (): void => {
  S.wins = num(getState(WINS_KEY, 0)) | 0
  S.losses = num(getState(LOSSES_KEY, 0)) | 0
  S.best = num(getState(BEST_TIME_KEY, 0))
  // Merge, so the four base runes stay known even for an older save.
  const seen = getState<Record<string, 1> | null>(SPELLS_SEEN_KEY, null)
  S.seen = { ...BASE_SEEN(), ...(seen && typeof seen === 'object' ? seen : {}) }
  S.intro = num(getState(ONBOARDED_KEY, 0)) ? 0 : 1
  // clamp: a hand-edited save must not index past the roster.
  S.foe = clamp(num(getState(BEST_STAGE_KEY, 0)) | 0, 0, FOES.length - 1)
  S.coins = Math.max(0, num(getState(COINS_KEY, 0)) | 0)
  const up = getState<unknown>(UPGRADES_KEY, null)
  S.up = Array.isArray(up) && up.length === 4 ? up.map((v) => Math.max(0, num(v) | 0)) : [0, 0, 0, 0]
}

/* ----------------------------- helpers ----------------------------- */
export const rainbow = (v: number, l = 60, a = 1): string =>
  `hsla(${(((v * 360) % 360) + 360) % 360},100%,${l}%,${a})`
export const pulse = (t: number, speed = 1): number => 0.5 + 0.5 * sin(t * speed * TAU)

let popId = 0
/** Queue a HUD callout at stage coords (x, y). */
export const pop = (k: string, c?: string, x?: number, y?: number, p?: Pop['p']): void => {
  S.pops.push({ id: ++popId, k, p, c: c || '#fff', x: x ?? 640, y: y ?? 300, a: 0 })
  if (S.pops.length > 6) S.pops.shift()
}
