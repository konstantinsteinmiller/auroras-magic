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
  HP_MAX, NO_EASE, PH_DUEL, type DuelEase, type Phase, type Rune, type SpellKind
} from '@/game/duel/config'
import { sin, TAU } from '@/game/duel/util'
import { getState, setStates } from '@/use/useGameState'
import {
  WINS_KEY, LOSSES_KEY, BEST_TIME_KEY, ONBOARDED_KEY, RUNS_KEY, CAMPAIGN_KEY, SCHEMA_KEY
} from '@/keys'
import { defaultCampaign, readCampaign, type CampaignState } from '@/game/campaign/state'
import { migrateToSchema2 } from '@/game/campaign/migrate'
// Type-only: erased at compile time, so it cannot form a runtime cycle with
// `flow/scene.ts`, which imports `S` from here.
import type { FlowState } from '@/game/flow/scene'

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
  /** Seconds of damage-over-time it leaves on the target. */
  dot: number
  /** Seconds of cast-slow it leaves on the target. */
  slow: number
  /** +1 flies right (cast by Aurora), -1 flies left (cast by the foe). */
  dir: number
  /** Super-effective — for the callout on impact. */
  w: 0 | 1
  /** Pierces every ward (Lightning, §6.8 rule 1): 1 = yes. */
  p: 0 | 1
  /** Runes in the cast, for the combo callout. */
  n: number
  delay: number
  life: number
  /** Its base damage, before the elemental multiplier — what a Crystal Ward
   *  bounces back (§6.5: the reflector's own `elemMul` never applies). */
  b: number
  /** Lifesteal: the caster heals this share of the damage it deals (Moon). */
  ls: number
  /** Slow strength, 0..1 (§6.7.7); 0 = the base runes' shipped 45 %. */
  sp: number
  /** Already reflected once: a second Crystal Ward only blocks it. */
  rf: 0 | 1
  /**
   * The element MIXED into the cast (§8.31): the strongest rune in it that is
   * not the lead. It never changes the damage — that is the lead's job — but
   * it tints the ribbon, the rim and half of what the hit leaves behind, so
   * Fire+Ice can be read as a wet ball before the callout says so. -1 (or
   * absent) = a pure cast.
   */
  m?: number
  /** The combo key this cast resolved to, when it is one of the golden 22:
   *  the spells with names of their own, and the only ones that fly with a
   *  flourish (`spellArt.SIG`). */
  sg?: string
  /** A lingering spell (§8.35): HP a second it leaves ticking on its target
   *  (the element already counted), for `lgT` seconds, wearing rune `lgR`'s
   *  afterlife. Absent on every other shot. */
  lg?: number
  lgT?: number
  lgR?: number
  /** THE CAST LOCK (§8.37): 1 while this shot holds its caster's lock — her
   *  next spell may not leave until it has landed or fizzled. A reflected
   *  copy holds nobody's. */
  lk?: 0 | 1
}

/**
 * A spell being FORGED (story-spec §8.37): pressing CAST lifts the runes out
 * of their slots, and for `forge.FORGE_S` they fly together into one orb, pour
 * into the horn and swell there before the spell leaves. One per side,
 * allocated once and reused — the slots, the renderer and the HUD all read it.
 */
export interface Forge {
  /** Seconds since CAST was pressed; -1 when this side is not forging. */
  t: number
  /** The runes it took, in slot order: slot i held `q[i]`. */
  q: Rune[]
  /** What it will be: the lead rune (the orb's main colour), the rune mixed
   *  into it (-1 = pure; it tints the orb's rim, like `Shot.m`), the spell
   *  kind and its combo key ('' unless it is one of the golden 22). */
  lead: number
  mix: number
  kind: number
  key: string
  /** Bumps on every new forge of this side — the slots' "pop" is keyed on it. */
  n: number
}
const forge = (): Forge => ({ t: -1, q: [], lead: 0, mix: -1, kind: 0, key: '', n: 0 })

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
  /** WHOSE it is (story-spec §8.36): the side that TOOK a blow — 0 Aurora, 1
   *  the foe. A damage number is tinted by it and drifts off that duelist, so
   *  a "−7" can never be read as the other one's. Absent on every other pop. */
  v?: 0 | 1
}

export const POP_LIFE = 1.3

/** The clean rune flashing after a recognised stroke. */
export interface Snap { r: Rune; t: number }

/**
 * Why the player's last cast request was refused (`sim.castSide`, story-spec
 * §8.37): her hand was empty, a spell of hers is still forging or in flight
 * (the cast lock — or she is frozen), or the first duel's lesson holds the
 * cast shut. '' = nothing refused yet this duel.
 */
export type CastRefusal = '' | 'empty' | 'busy' | 'lesson'

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
  /** THE SPELL FORGE (story-spec §8.37) of each side — Aurora's and the
   *  right-hand duelist's (the foe, or player 2). It replaced §8.36's 0.75 s
   *  wind-up: the foe's forge IS her warning. */
  forge: Forge
  eForge: Forge
  /** The depth glimpse (§8.36): 0 none this duel, 1 armed, 2 her ward is up
   *  and the hint shows, 3 the hint's "yes!" beat, 4 done. */
  glimpse: number
  /** Seconds in the current glimpse stage. */
  glimpseT: number
  /** The rune the glimpse's hint names — one of hers that finds the gap. */
  glimpseRune: number
  guard: number
  eGuard: number
  /** Barrier flavour: 0 wind · 1 earth · 2 ice pillar. */
  guardK: number
  eGuardK: number
  /** A bubble ward's (guardK 3) remaining hit capacity (§6.3). */
  guardHits: number
  eGuardHits: number
  burn: number
  eBurn: number
  /** A LINGERING spell ticking on each side (§8.35): seconds left, HP a
   *  second, and the rune whose afterlife it wears (the victim's telegraph). */
  linger: number
  eLinger: number
  lingerRate: number
  eLingerRate: number
  lingerLook: number
  eLingerLook: number
  slow: number
  eSlow: number
  castAnim: number
  eCastAnim: number
  hurt: number
  eHurt: number
  /**
   * THE CAST REFUSAL (story-spec §8.37) — a contract the HUD reads (the cast
   * button's shake, the lesson). `castRefusedAt` is `S.t` (the app clock the
   * HUD's own timers run on) at the moment a cast request of the PLAYER's
   * (left side) was refused, -1 when none has been this duel; it changes on
   * every refusal, so a watcher can key an animation on it. `castRefusedWhy`
   * says which rule refused it. Set only by `sim.castSide`; reset by
   * `resetDuel`.
   */
  castRefusedAt: number
  castRefusedWhy: CastRefusal

  /* drawing */
  draw: 0 | 1
  pts: number[]
  snap: Snap | null

  /* spells in flight */
  shots: Shot[]

  /* the story duel (story-spec §6) */
  /** Max HP per side (F18) — a boss has more than the player. */
  hpMax: number
  ehpMax: number
  /** Heal-over-time seconds left, and its rate, per side (Nature's bloom). */
  regen: number
  eRegen: number
  regenRate: number
  eRegenRate: number
  /** A boss's phase (1, then 2 at half HP) and its wind-up seconds (§6.11). */
  ePhase: number
  eWindup: number
  /** Dream Dust's rate factor for this duel (§6.15), 0.6..1. */
  dust: number
  /** Onboarding's rate factor for this duel (§6.14), 0.7..1. */
  onboard: number
  /** What this NODE's duel is eased by for a beginner (`campaign/easing.ts`).
   *  Resolved by the campaign and handed over with the foe — the duel never
   *  reads a node (§4.8.1). All 1 for versus and from chapter 4 on. */
  ease: DuelEase
  /** C14's node-3 rule: the foe may cast her chapter's own magic. */
  usesMagic: boolean
  /** Runes the player has landed this duel (trace assist stops at 1, §5.13). */
  landed: number
  /** The chapter (0-based) the arena is dressed for (§9.6). Set by the flow. */
  theme: number
  /** A decoy's remaining hit capacity (Illusion, kind 5), how many mirror
   *  bodies it shows (Echo's phase 2 holds two), and its seconds left. */
  decoy: number
  eDecoy: number
  decoyN: number
  eDecoyN: number
  decoyT: number
  eDecoyT: number
  /** Frost Lock (§6.5): seconds frozen, then a per-target cooldown. The
   *  player's own pair only ever runs in 2P versus (§6.19). */
  frozen: number
  eFrozen: number
  freezeCd: number
  eFreezeCd: number
  /** How hard the foe is slowed while `eSlow` runs (§6.7.7): 0..1. */
  eSlowPct: number
  /** Hits landed by either side this duel — the Love finisher's gate (§6.9). */
  hitsLanded: number
  /** The finisher is once per duel, per side (§6.9). */
  usedFinisher: boolean
  eUsedFinisher: boolean
  /** Local 2P versus (§6.19, C18): the right-hand duelist is player 2 — no
   *  AI, her runes come from her own stroke buffer. Never persisted. */
  versus: boolean
  /** Player 2's stroke buffer, drawing flag and snap flash (versus only). */
  epts: number[]
  edraw: 0 | 1
  esnap: Snap | null

  /* scoring / meta */
  /** Index into `FOES` (`duel/foes.ts`) for the CURRENT duel. Not persisted. */
  foe: number
  wins: number
  losses: number
  best: number
  dur: number
  combo: number

  /* feel */
  shake: number
  flash: number
  /**
   * HIT-STOP (§8.31): the whole duel holds still for a few dozen
   * milliseconds when something lands, so a heavy hit reads as weight rather
   * than as a number going down. The sim freezes; the frame keeps drawing.
   */
  stop: number
  /** The camera's punch on that same hit, 0..1, decaying. */
  punch: number
  sky: number
  pops: Pop[]

  /* adaptive quality */
  /**
   * The quality TIER, an integer: 0 thrift, 1 the authored look, 2 sparkle.
   *
   *   0  cel bands, shade stripes, the aura and all but the hero hair lock are
   *      dropped; silhouettes, proportions and poses are untouched.
   *   1  the game as it is drawn everywhere. THE DEFAULT, and what every
   *      reference bake and every screenshot is taken at.
   *   2  a device with measured headroom spends it on extra DRAW work — a
   *      denser rim of grass, more motes, wider glows, longer twinkle trails
   *      (retention-roadmap item 17).
   *
   * Written ONLY by the hysteresis in `views/AppScene.vue`. Three rules every
   * reader of this field has to keep:
   *
   *   • It is a tier, not a multiplier. `n * S.q` is a bug at tier 2 — see the
   *     count cap in `duel/fx.ts`.
   *   • Tier 2 never changes how many particles an EMITTER spawns, because
   *     `fx.ts` rolls on the duel's own `Math.random` stream: a strong device
   *     would then roll different damage than a weak one.
   *   • Nothing about tier 2 may appear or vanish in one frame. Scale it on
   *     `qx` below, never on `S.q > 1` directly.
   */
  q: number
  /** Smoothed FRAME INTERVAL in seconds. Sees dropped frames; on a vsync-capped
   *  display it cannot see headroom, which is what `fw` is for. */
  fdt: number
  /** Smoothed WORK per frame in seconds — the time spent inside the RAF
   *  callback. The only signal that can tell a device with room to spare from
   *  one that is merely attached to a 60 Hz panel. */
  fw: number
  /** The sparkle MIX, 0..1: how far tier 2's extras have faded in. Eased
   *  towards the tier over ~1.5 s so entering or leaving never pops. */
  qx: number

  /* story (story-spec §4) */
  /** The story's progress. Persisted whole as `am_campaign`. */
  campaign: CampaignState
  /** Which scene the canvas shows. NOT persisted — like `pts` and `shots`. */
  flow: FlowState
}

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
  forge: forge(),
  eForge: forge(),
  glimpse: 0,
  glimpseT: 0,
  glimpseRune: -1,
  guard: 0,
  eGuard: 0,
  guardK: 0,
  eGuardK: 0,
  guardHits: 0,
  eGuardHits: 0,
  burn: 0,
  eBurn: 0,
  linger: 0,
  eLinger: 0,
  lingerRate: 0,
  eLingerRate: 0,
  lingerLook: 0,
  eLingerLook: 0,
  slow: 0,
  eSlow: 0,
  castAnim: 0,
  eCastAnim: 0,
  hurt: 0,
  eHurt: 0,
  castRefusedAt: -1,
  castRefusedWhy: '',

  draw: 0,
  pts: [],
  snap: null,

  shots: [],

  hpMax: HP_MAX,
  ehpMax: HP_MAX,
  regen: 0,
  eRegen: 0,
  regenRate: 0,
  eRegenRate: 0,
  ePhase: 1,
  eWindup: 0,
  dust: 1,
  onboard: 1,
  ease: { ...NO_EASE },
  usesMagic: false,
  landed: 0,
  theme: 0,
  decoy: 0,
  eDecoy: 0,
  decoyN: 0,
  eDecoyN: 0,
  decoyT: 0,
  eDecoyT: 0,
  frozen: 0,
  eFrozen: 0,
  freezeCd: 0,
  eFreezeCd: 0,
  eSlowPct: 0.45,
  hitsLanded: 0,
  usedFinisher: false,
  eUsedFinisher: false,
  versus: false,
  epts: [],
  edraw: 0,
  esnap: null,

  foe: 0,
  wins: 0,
  losses: 0,
  best: 0,
  dur: 0,
  combo: 0,

  shake: 0,
  flash: 0,
  stop: 0,
  punch: 0,
  sky: 0.5,
  pops: [],

  q: 1,
  fdt: 0.016,
  fw: 0.008,
  qx: 0,

  campaign: defaultCampaign(),
  flow: { scene: 'boot', node: -1, mode: 'campaign', overlay: null, armed: false }
}
/** Short alias. Same object — never reassign either binding. */
export const S = auroras_magic_state

/* --------------------------- persistence --------------------------- */

/**
 * Write the handful of fields worth surviving a reload into the save blob.
 * Schema 2 (§4.6): the story lives in `am_campaign`; `am_coins`,
 * `am_upgrades` and `am_spells_seen` are retired (D3, §4.7) and `am_ladder`
 * is frozen — nothing writes them any more.
 */
export const save = (): void => {
  setStates({
    [SCHEMA_KEY]: 2,
    [WINS_KEY]: S.wins,
    [LOSSES_KEY]: S.losses,
    [RUNS_KEY]: S.wins + S.losses,
    [BEST_TIME_KEY]: S.best,
    [ONBOARDED_KEY]: S.intro ? 0 : 1,
    // A copy: the save layer must never hold a live reference it could see
    // change under a debounced write. Every nested container gets its own —
    // the spread only copies the top level, and `photos` (retention item 16)
    // is appended to in place.
    [CAMPAIGN_KEY]: {
      ...S.campaign,
      giftsEquipped: [...S.campaign.giftsEquipped],
      lossStreaks: { ...S.campaign.lossStreaks },
      photos: [...S.campaign.photos]
    }
  })
}

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return Number.isFinite(n) ? n : 0
}

/**
 * Read the persisted fields back. Safe on a fresh profile and on junk. Runs
 * the one-way Step-1 → schema-2 migration first (§4.7), so nothing below
 * ever sees the old shape.
 */
export const load = (): void => {
  migrateToSchema2()
  S.wins = num(getState(WINS_KEY, 0)) | 0
  S.losses = num(getState(LOSSES_KEY, 0)) | 0
  S.best = num(getState(BEST_TIME_KEY, 0))
  S.intro = num(getState(ONBOARDED_KEY, 0)) ? 0 : 1
  S.campaign = readCampaign(getState<unknown>(CAMPAIGN_KEY, null))
}

/* ----------------------------- helpers ----------------------------- */
export const rainbow = (v: number, l = 60, a = 1): string =>
  `hsla(${(((v * 360) % 360) + 360) % 360},100%,${l}%,${a})`
export const pulse = (t: number, speed = 1): number => 0.5 + 0.5 * sin(t * speed * TAU)

let popId = 0
/** Queue a HUD callout at stage coords (x, y). `v` = the side that took the
 *  blow it counts, for a damage number (`Pop.v`). */
export const pop = (k: string, c?: string, x?: number, y?: number, p?: Pop['p'], v?: 0 | 1): void => {
  S.pops.push({ id: ++popId, k, p, c: c || '#fff', x: x ?? 640, y: y ?? 300, a: 0, ...(v === undefined ? {} : { v }) })
  if (S.pops.length > 6) S.pops.shift()
}
