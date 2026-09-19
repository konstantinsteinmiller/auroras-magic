/**
 * PROCEDURAL AUDIO — Web Audio API only, zero asset bytes. Ported from the jam
 * build; the instrument, the cues and the mood morph are unchanged.
 *
 * WHAT CHANGED IN THE PORT: the graph lives on the app's SHARED AudioContext
 * (`getAudioContext()` in `useAssets`), which is the context every platform
 * gate already drives:
 *
 *   • the pause gate (ads, hidden tab, portal pause, modals) SUSPENDS it,
 *   • the portal / mobile mute suspends it and calls `killOneShotSfx()`,
 *     which hard-stops every voice registered here,
 *   • `forceStopMusic()` before an ad lands in `stopMusic()` below.
 *
 * So the ad-audio guarantee holds for this synth without a second driver.
 * Belt and braces, `V()` refuses to BUILD a voice while the context is held
 * suspended — a cue fired under an ad would otherwise sit in the frozen graph
 * and sound the moment the ad closes.
 *
 * SIGNAL FLOW — exactly ONE path:
 *   cue voice      -> sfx bus  ─┐
 *   piano voice    -> music bus ┤> master -> DynamicsCompressor -> destination
 *   ambience voice -> amb bus  ─┘
 * The amb bus (story-spec §8.5, §8.8) carries a restored biome's loop while
 * its sectors are in view; it follows the Sound Effects volume.
 * The bus gains are the player's sound / music volume (Options, desktop mute).
 * Only `level()` ever touches a bus gain, and only with setTargetAtTime — mixing
 * a direct `.value` write with scheduled automation on one AudioParam is the
 * classic Web Audio mute bug.
 *
 * THE MUSIC (GDD 2.3) is a slow piano piece, not an arpeggiator: a two-bar
 * chord progression in A with real voice-leading (`CH`), a rolled left hand,
 * and a sparse melody drawn from the chord tones. `setMood(S.sky)` morphs it
 * by MODE MIXTURE — losing is A aeolian, slow and thin; winning bends three
 * stored notes a semitone into A major with a real V-I cadence, a little
 * quicker and with the full triad plus more melody. The mode is sampled once
 * per chord so a drifting mood can never leave a chord detuned halfway.
 */
import { getAudioContext, isAudioSuspended, registerOneShotSource } from '@/use/useAssets'
import { rnd } from '@/game/duel/util'

/* Wave table: index 0 is the shared noise buffer, 1..3 are oscillators. */
const NOISE = 0
const SIN = 1
const TRI = 2
const SAW = 3
const W: readonly (OscillatorType | null)[] = [null, 'sine', 'triangle', 'sawtooth']

const MAXV = 40 // hard voice cap — drop rather than clip
const AHEAD = 0.25 // sequencer look-ahead, seconds
const VOL = 0.55 // master level at full volume

/* --------------------------------------------------------------- graph */
let A: AudioContext | null = null
let mst: GainNode | null = null
let sfxBus: GainNode | null = null
let musBus: GainNode | null = null
let ambBus: GainNode | null = null
let nz: AudioBuffer | null = null // the ONE shared noise buffer
let vc = 0 // live voice count

/* player levels (0..1), mirrored from settings by the scene */
let sfxLevel = 0.7
let musLevel = 0.6

/* mood: target + smoothed, 0 losing .. 1 winning */
let mood = 0.5
let mS = 0.5
/** Sampled mode, 0 = minor / aeolian, 1 = major. See `at`. */
let cb = 0

/* sequencer */
let playing = false // music requested
let nx = 0 // next step time, on the AudioContext clock
let step = 0 // step index (one eighth note)
let lastDraw = 0 // 'draw' rate limiter
let lastScrub = 0 // 'scrub' rate limiter
let lastMel = -9 // step of the last melody note — never two in a row
let mi = 0 // melodic contour index

/**
 * Sanitise AND clamp in one go: anything non-numeric (NaN, undefined, a
 * string, ±Infinity below the floor) fails the `> a` test and comes out as
 * `a`. Every number that reaches an AudioParam passes through here.
 */
const cl = (v: unknown, a: number, b: number): number => {
  const n = +(v as number)
  return n > a ? (n < b ? n : b) : a
}

/** The AudioContext clock, sanitised. Everything schedules against this. */
const now = (): number => cl(A ? A.currentTime : 0, 0, 1e7)

/** Semitones above A1 (55 Hz) -> Hz. The one tuning function in the file. */
const hz = (s: number): number => 55 * 2 ** (s / 12)

/** The ambience's own level under the sound-effects volume, 0..1 (a fade). */
let ambLevel = 0
/** The biome whose loop is playing: the chapter (0-based); -1 none. */
let ambBiome = -1
let ambNext = 0
/** The ambience sits well under everything else. */
const AMB_MIX = 0.55

/** THE ONLY WRITER of the bus gains — setTargetAtTime, always. */
const level = (): void => {
  if (!A || !sfxBus || !musBus || !ambBus) return
  const t = now()
  sfxBus.gain.setTargetAtTime(VOL * cl(sfxLevel, 0, 1), t, 0.03)
  musBus.gain.setTargetAtTime(VOL * cl(musLevel, 0, 1), t, 0.03)
  // A slow time constant: the biome breathes in and out as the map pans.
  ambBus.gain.setTargetAtTime(VOL * AMB_MIX * cl(sfxLevel, 0, 1) * cl(ambLevel, 0, 1), t, 0.4)
}

/** Build the graph on the shared context. Idempotent; safe before a gesture
 *  (the context is created suspended and resumed by the first input). */
const ensure = (): boolean => {
  if (A && mst) return true
  const ctx = getAudioContext()
  if (!ctx) return false
  try {
    A = ctx
    /* Limiter. knee/ratio/attack/release defaults are already what we want. */
    const lim = ctx.createDynamicsCompressor()
    lim.threshold.value = -12
    mst = ctx.createGain()
    sfxBus = ctx.createGain()
    musBus = ctx.createGain()
    ambBus = ctx.createGain()
    sfxBus.gain.value = 0
    musBus.gain.value = 0
    ambBus.gain.value = 0
    sfxBus.connect(mst)
    musBus.connect(mst)
    ambBus.connect(mst)
    mst.connect(lim).connect(ctx.destination)
    level()
    /* THE shared noise buffer: half a second, looped by every noise voice. */
    const sr = ctx.sampleRate
    nz = ctx.createBuffer(1, sr >> 1, sr)
    const b = nz.getChannelData(0)
    for (let i = b.length; i--;) b[i] = rnd() * 2 - 1
    return true
  } catch {
    A = null
    mst = null
    return false
  }
}

/* ---------------------------------------------------------------- voice */
/**
 * THE voice. Every sound in the game — cues and piano notes alike — is built
 * out of calls to this.
 *   w   wave index into W, or NOISE for the shared buffer
 *   f0  start frequency (Hz)      f1  end frequency, glides exponentially
 *   d   duration (s)              g   peak gain
 *   q   filter tracking: cutoff sweeps f0*q -> f1*q ("brightness")
 *   dl  delay before it starts (s)   a  attack (s, omitted = 4 ms)
 *   bus 0 = sfx, 1 = music, 2 = ambience
 * The gain envelope is a fast exponential attack into a long exponential
 * decay, which is exactly a struck-string envelope — see `pia`.
 */
const V = (
  w: number, f0: number, f1?: number, d?: number, g?: number, q?: number, dl?: number, a?: number, bus = 0
): void => {
  if (!A || !nz || isAudioSuspended() || vc >= MAXV) return
  const target = bus === 2 ? ambBus : bus ? musBus : sfxBus
  if (!target) return
  d = cl(d, 0.02, 4)
  g = cl(g, 1e-4, 0.9)
  f0 = cl(f0, 10, 18e3)
  f1 = f1 || f0
  a = a || 0.004
  q = q || 1
  const t = now() + (dl || 0)
  const e = t + d
  const flt = A.createBiquadFilter() // defaults to lowpass, Q 1
  const out = A.createGain()
  const gp = out.gain
  let s: OscillatorNode | AudioBufferSourceNode
  if (w) {
    const o = A.createOscillator()
    o.type = W[w]!
    o.frequency.setValueAtTime(f0, t)
    o.frequency.exponentialRampToValueAtTime(f1, e)
    s = o
  } else {
    const b = A.createBufferSource()
    b.buffer = nz
    b.loop = true // looped, so an exotic sampleRate can never run it dry
    flt.type = 'bandpass' // for noise the sweep IS the band
    s = b
  }
  flt.frequency.setValueAtTime(f0 * q, t)
  flt.frequency.exponentialRampToValueAtTime(f1 * q, e)
  /* click-free envelope: near-silent -> exponential attack -> exp tail */
  gp.setValueAtTime(1e-4, t)
  gp.exponentialRampToValueAtTime(g, t + a)
  gp.exponentialRampToValueAtTime(1e-4, e)
  s.connect(flt).connect(out).connect(target)
  s.start(t)
  s.stop(e)
  vc++
  // Registered with the app's one-shot registry so a mute / ad hard-stop
  // (`killOneShotSfx`) ends it outright instead of freezing it mid-tail.
  registerOneShotSource(s)
  s.onended = () => {
    vc--
    out.disconnect()
  }
}

/* ----------------------------------------------------------------- cues */
/**
 * Scale degrees for the one-shot cues, in the same key as the music so nothing
 * ever clashes with the bed. The ODD entries are the colour tones and rise a
 * semitone with `cb`, the same minor->major mixture the progression uses.
 */
const DEG = [0, 3, 7, 10, 12, 15]
const nf = (i: number): number => hz(12 + DEG[i % 6]! + (i & 1 ? cb : 0))

/**
 * The four runes, layer A (0..3) over layer B (4..7), so a player can name
 * the element with their eyes shut:
 *   FIRE  warm sawtooth chirp + ember crackle
 *   WIND  airy filtered noise sweep + breathy tail
 *   ICE   crystalline bell + inharmonic 2.76x partial
 *   EARTH low thunk + dusty thud
 */
type VoiceArgs = [number, number, number?, number?, number?, number?, number?, number?]
const SNAP: readonly VoiceArgs[] = [
  [SAW, 170, 540, 0.26, 0.2, 5],
  [NOISE, 380, 3600, 0.38, 0.16, 1, 0, 0.05],
  [SIN, 1180, 0, 0.7, 0.16],
  [TRI, 150, 42, 0.3, 0.28, 4],
  [NOISE, 1500, 620, 0.18, 0.08, 1.4, 0.01],
  [NOISE, 2600, 900, 0.3, 0.07, 1, 0.06, 0.08],
  [SIN, 3260, 0, 0.5, 0.07, 1, 0.005],
  [NOISE, 300, 80, 0.22, 0.12]
]

export type Cue =
  | 'draw' | 'snap' | 'bad' | 'cast' | 'hit' | 'guard' | 'hurt' | 'win' | 'lose' | 'ui'
  // restoration (story-spec §8.5)
  | 'scrub' | 'chime' | 'untie' | 'unbox' | 'paint' | 'whoosh' | 'reveal'
  // the boss chest and its Sunbeam (story-spec §8.3–§8.5)
  | 'fanfare' | 'beam' | 'ready'
  // permanence (§8.8): a tap creature peeks; a rescue is found
  | 'peek' | 'rescue'
  // chapter magic (story-spec §6.5–§6.9): Crystal Ward bounces a spell, a
  // decoy appears or pops, Frost Lock takes hold, the Love finisher
  | 'reflect' | 'decoy' | 'freeze' | 'finisher'
  // the first-launch intro (story-spec §8.26): the unicorns' own voices —
  // sounds, never words (D6)
  | 'neigh' | 'sigh' | 'giggle'

const CUES: Record<Cue, (v?: number) => void> = {
  /* Called many times per second while the finger moves: hard rate limit,
     soft voice, pitched up the current (mood-bent) scale so drawing feels
     like singing on the surface rather than a machine gun. v = 0..1 stroke. */
  draw: (v) => {
    const t = now()
    if (t - lastDraw < 0.055) return
    lastDraw = t
    const f = nf((cl(v, 0, 1) * 5) | 0) * 2
    V(TRI, f, f * 1.01, 0.11, 0.038, 5)
  },

  /* A rune was RECOGNISED. v = rune id 0..3. */
  snap: (v) => {
    const id = (v ?? 0) | 0
    if (id >= 4) {
      // The story's runes: a leafy rustle under a rising pluck for Nature;
      // later runes borrow the pluck on their own scale degree until they
      // get a voice of their own with their chapter.
      if (id === 4) V(NOISE, 2600, 1300, 0.22, 0.05, 1, 0, 0.02)
      const f = nf(id % 6) * 4
      V(TRI, f, f * 1.5, 0.26, 0.1, 4)
      V(SIN, f * 2, 0, 0.35, 0.04, 1, 0.03)
      return
    }
    const r = cl(id, 0, 3)
    V(...SNAP[r]!)
    V(...SNAP[r + 4]!)
  },

  /* Shape not recognised: a soft falling minor second. A shrug, not a slap. */
  bad: () => {
    V(TRI, 330, 250, 0.18, 0.1)
    V(TRI, 311, 236, 0.22, 0.07, 1, 0.07)
  },

  /* The spell launches. v = rune count 1..3: a modest zap, or a layered
     riser under a full triad that bends minor->major with the mood. */
  cast: (v) => {
    const n = cl((v ?? 1) | 0, 1, 3)
    V(NOISE, 300, 1200 + 2600 * n, 0.25 + 0.18 * n, 0.05 + 0.03 * n, 1, 0, 0.1 * n)
    V(SIN, 120, 46, 0.4, 0.18, 1, 0.04 * n)
    for (let i = 0; i < n; i++) {
      const f = nf(i) * 2
      V(SAW, f, f * 2, 0.3 + 0.12 * n, 0.07 + 0.02 * n, 3 + 2 * n, i * 0.045)
    }
  },

  /* Spell connects. v = power 0..1 scales body, brightness and length. */
  hit: (v) => {
    const p = cl(v, 0, 1)
    V(NOISE, 260 + 700 * p, 90, 0.18 + 0.3 * p, 0.18 + 0.18 * p)
    V(SIN, 180 + 120 * p, 44, 0.22 + 0.25 * p, 0.2 + 0.2 * p)
  },

  /* A barrier eats the hit: glassy shimmer over a rising chime. */
  guard: () => {
    V(NOISE, 1600, 2600, 0.22, 0.1)
    V(SIN, 620, 940, 0.35, 0.12)
  },

  /* You take damage: a sagging saw and a dull thud. */
  hurt: () => {
    V(SAW, 240, 62, 0.5, 0.22, 4)
    V(NOISE, 900, 200, 0.35, 0.12)
  },

  /* Triumphant flourish. Forcing mood AND the sampled mode to 1 snaps the
     scale to major for the flourish itself. */
  win: () => {
    mood = mS = cb = 1
    for (let i = 0; i < 6; i++) {
      const f = nf(i) * 2
      V(TRI, f, 0, 0.9, 0.11, 6, i * 0.1)
      V(SIN, f * 4, 0, 0.7, 0.05, 1, i * 0.1 + 0.02)
    }
    V(NOISE, 900, 7000, 1.2, 0.07, 1, 0, 0.3)
  },

  /* Melancholic low drone: two saws beating a half-hertz apart over a sub,
     and the mood dropped to 0 so the piano falls back to aeolian. */
  lose: () => {
    mood = mS = cb = 0
    V(SAW, 110, 41, 2.2, 0.16, 2.5, 0, 0.5)
    V(SAW, 109, 40.5, 2.4, 0.13, 2, 0.05, 0.6)
    V(SIN, 55, 27, 2.6, 0.18, 1, 0, 0.4)
  },

  ui: () => V(TRI, 760, 900, 0.09, 0.09),

  /* ── RESTORATION (story-spec §8.5). No sustained oscillator anywhere: the
        continuous scrub is short overlapping one-shots, like everything else. */

  /* The brush on the dust: a 120 ms band of noise every ~90 ms while the
     brush moves. v = stroke speed, CSS px/s. The band's centre tracks it, so
     a quick pass sounds bright and airy and a slow one low and gritty. It is
     sand being swept, not a note. */
  scrub: (v) => {
    const t = now()
    if (t - lastScrub < 0.09) return
    lastScrub = t
    const sp = cl(v, 0, 2000)
    const f = cl(900 + 2.4 * sp, 700, 3200)
    V(NOISE, f, f * 0.86, 0.12, 0.028 + 0.02 * Math.min(1, sp / 600), 1, 0, 0.03)
  },

  /* One rung of the coverage ladder: every 10 % cleared rings one step up
     the same scale the music uses, so the chimes never clash with the bed.
     v = step 1..10. */
  chime: (v) => {
    const i = cl((v ?? 1) | 0, 1, 10)
    const f = nf(i % 6) * 2 * (i >= 6 ? 2 : 1)
    V(TRI, f, f * 1.02, 0.35, 0.12, 5)
    V(SIN, f * 2, 0, 0.5, 0.035, 1, 0.02)
  },

  /* The bow slipping loose: a soft ribbon swish into a little pluck. */
  untie: () => {
    V(NOISE, 1400, 4200, 0.2, 0.06, 1, 0, 0.04)
    V(TRI, nf(2) * 2, nf(4) * 2, 0.22, 0.09, 4, 0.12)
  },

  /* The gift opens: a quick rising sparkle arpeggio over a soft pop. */
  unbox: () => {
    V(SIN, 220, 90, 0.18, 0.2)
    V(NOISE, 800, 6000, 0.4, 0.05, 1, 0, 0.02)
    for (let i = 0; i < 4; i++) {
      const f = nf(i + 1) * 4
      V(TRI, f, f, 0.4, 0.07, 6, 0.05 + i * 0.06)
    }
  },

  /* A paint pot picked: a round "blop" and one bright chime. v = pot 0..2. */
  paint: (v) => {
    V(SIN, 520, 180, 0.16, 0.18, 1, 0, 0.01)
    V(TRI, nf(cl((v ?? 0) | 0, 0, 2) * 2) * 4, 0, 0.45, 0.06, 5, 0.08)
  },

  /* The reveal wave travelling out: an airy rising sweep. */
  whoosh: () => {
    V(NOISE, 500, 5200, 0.45, 0.08, 1, 0, 0.2)
  },

  /* The sector restored — the same six-voice flourish as `win`, shorter and
     softer, and it leaves the mood where it was: a restoration is a quiet
     joy, not a second victory. */
  reveal: () => {
    for (let i = 0; i < 6; i++) {
      const f = nf(i) * 4
      V(TRI, f, 0, 0.7, 0.07, 6, i * 0.07)
      V(SIN, f * 2, 0, 0.5, 0.03, 1, i * 0.07 + 0.02)
    }
    V(NOISE, 1200, 8000, 0.8, 0.05, 1, 0, 0.25)
  },

  /* The boss chest's flourish, under the Sunbeam's float (§8.5): the six
     voices of `win`, an octave lower and slower, with a held fifth under
     them — "this chapter's magic", not "victory again", so the mood stays. */
  fanfare: () => {
    for (let i = 0; i < 6; i++) {
      const f = nf(i) * 2
      V(TRI, f, 0, 1.1, 0.09, 6, i * 0.12)
      V(SIN, f * 2, 0, 0.8, 0.035, 1, i * 0.12 + 0.03)
    }
    V(TRI, nf(0), nf(0), 1.6, 0.07, 3, 0.1, 0.2)
    V(TRI, nf(4), nf(4), 1.6, 0.05, 3, 0.1, 0.2)
    V(NOISE, 900, 7000, 1.4, 0.05, 1, 0, 0.4)
  },

  /* The Sunbeam let go: a bright airy rush that climbs as the band travels. */
  beam: () => {
    V(NOISE, 700, 6200, 0.7, 0.07, 1, 0, 0.05)
    V(TRI, nf(2) * 2, nf(2) * 4, 0.55, 0.07, 5, 0.02)
    V(SIN, nf(4) * 4, nf(4) * 8, 0.5, 0.03, 1, 0.05)
  },

  /* A tap creature pops out: a quick "boop" up a fifth, one chime-family note. */
  peek: (v) => {
    const f = nf(cl((v ?? 0) | 0, 0, 5)) * 4
    V(SIN, f, f * 1.5, 0.14, 0.07, 1)
    V(TRI, f * 1.5, 0, 0.35, 0.05, 5, 0.1)
  },

  /* The chapter's rescue collectible is found: a bright twinkling run and a
     warm held third — the "you found someone!" moment, distinct from a chime. */
  rescue: () => {
    for (let i = 0; i < 5; i++) V(TRI, nf(i) * 8, 0, 0.3, 0.05, 6, i * 0.06)
    V(SIN, nf(2) * 4, nf(2) * 4, 1.1, 0.06, 1, 0.3, 0.08)
    V(SIN, nf(4) * 4, nf(4) * 4, 1.1, 0.045, 1, 0.3, 0.08)
    V(NOISE, 3000, 9000, 0.6, 0.03, 1, 0, 0.1)
  },

  /* A cute unicorn whinny (the intro, §8.26): "nee-hee-hee" — a quick, high,
     sing-song trill built from alternating short blips (a vibrato the one
     voice cannot do on its own), rising for a moment and then tumbling down,
     with a little breathy snort at the end. `v` = 1 is Aurora's, 0.5 an
     older, lower unicorn. Always on the music's scale, so it never clashes. */
  neigh: (v) => {
    const oct = (v ?? 1) >= 1 ? 4 : 2
    const base = nf(4) * oct
    const n = 12
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1)
      // Up for the first quarter, then a tumbling fall of about a fifth.
      const contour = k < 0.25 ? 1 + k * 0.6 : 1.15 - (k - 0.25) * 0.55
      const f = base * contour * (i & 1 ? 1.12 : 0.93)
      V(i & 1 ? TRI : SIN, f, f * (i & 1 ? 0.94 : 1.06), 0.07, 0.05 * (1 - k * 0.4), 3, i * 0.045, 0.006)
    }
    V(NOISE, 1400, 500, 0.2, 0.045, 1, n * 0.045 + 0.03, 0.02)
  },

  /* Aurora's little "oh no": a soft falling "aww", wobbling as it droops. */
  sigh: () => {
    const f0 = nf(3) * 4
    for (let i = 0; i < 6; i++) {
      const f = f0 * (1 - i * 0.07) * (i & 1 ? 1.05 : 0.97)
      V(SIN, f, f * 0.95, 0.12, 0.05, 1, i * 0.09, 0.02)
    }
    V(NOISE, 900, 300, 0.4, 0.025, 1, 0.1, 0.1)
  },

  /* Umbra's cheeky giggle: three quick "hee!"s, low for a unicorn, each one
     bouncing up — mischief, not menace (art-style: rivals are cheeky). */
  giggle: () => {
    for (let i = 0; i < 3; i++) {
      const f = nf(2 + (i & 1)) * 2
      V(TRI, f, f * 1.35, 0.1, 0.06, 3, i * 0.12, 0.008)
      V(SIN, f * 2, f * 2.5, 0.08, 0.025, 1, i * 0.12 + 0.01, 0.008)
    }
  },

  /* The Sunbeam has gathered its light again: one small bell. */
  ready: () => {
    V(TRI, nf(4) * 4, 0, 0.3, 0.05, 6)
    V(SIN, nf(4) * 8, 0, 0.3, 0.02, 1, 0.02)
  },

  /* Crystal Ward sends a spell back: a glassy "ting" that flips upward —
     a mirror, not a wall (the plain block keeps `guard`). */
  reflect: () => {
    V(SIN, nf(3) * 4, nf(3) * 8, 0.28, 0.1, 1)
    V(TRI, nf(5) * 4, nf(1) * 8, 0.32, 0.06, 5, 0.04)
    V(NOISE, 4200, 9000, 0.25, 0.05, 1, 0, 0.02)
  },

  /* A decoy shimmers in, or a spell passes through one: a soft wobbling
     pair a hair apart — two of the same note, like a reflection. */
  decoy: () => {
    const f = nf(2) * 4
    V(SIN, f, f * 0.98, 0.4, 0.06, 1)
    V(SIN, f * 1.01, f * 1.03, 0.4, 0.05, 1, 0.05)
    V(NOISE, 2400, 5200, 0.3, 0.03, 1, 0, 0.05)
  },

  /* Frost Lock takes hold: a crackle of ice and a high, still bell. */
  freeze: () => {
    V(NOISE, 5000, 1800, 0.35, 0.1)
    V(TRI, nf(4) * 8, 0, 0.8, 0.05, 6, 0.05)
    V(SIN, nf(4) * 16, 0, 0.6, 0.02, 1, 0.08)
  },

  /* The Love finisher: a warm rising arpeggio, major, and a soft swell. */
  finisher: () => {
    mood = mS = cb = 1
    for (let i = 0; i < 4; i++) V(TRI, nf(i * 2) * 4, 0, 0.6, 0.08, 6, i * 0.08)
    V(SIN, nf(0) * 2, nf(0) * 2, 1.2, 0.08, 1, 0.1, 0.2)
    V(NOISE, 2000, 8000, 0.9, 0.04, 1, 0.05, 0.3)
  }
}

/* ---------------------------------------------------------------- music */
/**
 * THE PROGRESSION. Eight chords, two bars each, written out as four voices —
 * bass, then the three right-hand voices low to high — in semitones above
 * A1 (55 Hz). Hand-voiced so that NO right-hand voice ever moves more than a
 * whole tone between chords; the bass carries the harmonic motion:
 *
 *   Am(A)  Fmaj7  C   G   Am7(A7)  Dm7  Fmaj7  Em(E)
 *   i/I    bVI    bIII bVII i7/I7  iv7  bVI    v/V
 *
 * ENCODING: one character per voice, code = 42 + 2*semitone + bendable.
 * So `c>>1` minus 21 is the semitone and `c&1` is the bend flag.
 */
const CH = '*ahr:`hr0`hn>^dn*ahn4`jr:`hr8^ho'
/** Decode voice `i` of the table at the currently sampled mode. */
const at = (i: number): number => {
  const c = CH.charCodeAt(i)
  return (c >> 1) - 21 + (c & 1) * cb
}

/**
 * ONE PIANO NOTE, at semitone `s`, from three voices: the fundamental (a
 * triangle under a lowpass at 2.4x), the 2nd partial slightly sharp and
 * decaying in HALF the time, and a 30 ms band-swept noise blip — the hammer.
 * Gain and timing are jittered per note so no two strikes are identical. The
 * fundamental is scheduled FIRST, so under voice pressure the partials are
 * what get dropped and a note degrades instead of disappearing.
 */
const pia = (s: number, d: number, g: number, dl: number): void => {
  const f = hz(s)
  g *= 0.72 + 0.5 * rnd()
  dl += rnd() * 0.02
  V(TRI, f, 0, d, g, 2.4, dl, 0.005, 1)
  V(SIN, f * 2.004, 0, d * 0.5, g * 0.48, 2, dl, 0.004, 1)
  V(NOISE, f * 5, f * 1.6, 0.03, g * 0.4, 1, dl, 0, 1)
}

/**
 * One eighth note, scheduled at absolute AudioContext time `t`. `i & 15` is
 * the position inside the current two-bar chord and `i >> 4 & 7` picks the
 * chord. The rhythm is deliberately sparse — this loops for a whole session.
 */
const seq = (t: number, i: number): void => {
  if (vc > 26) return // the piano always yields to gameplay cues
  const m = mS
  const k = i & 15
  const c = ((i >> 4) & 7) * 4
  const dl = t - now()
  const v = (j: number): number => at(c + j)
  if (!k) {
    /* Sample the mode ONCE per chord. */
    cb = m > 0.55 ? 1 : 0
    /* Downbeat: bass, then the right hand rolled upward like a real wrist.
       The top voice only joins once you are not losing. */
    pia(v(0), 3.4, 0.05, dl)
    pia(v(1), 2.6, 0.026, dl + 0.03)
    pia(v(2), 2.6, 0.024, dl + 0.07)
    if (m > 0.45) pia(v(3), 2.4, 0.022, dl + 0.11)
  } else if (k === 8) {
    /* Second bar: the fifth under the same chord, and one inner voice. */
    pia(v(0) + 7, 2.8, 0.036, dl)
    pia(v(2), 2.2, 0.02, dl + 0.05)
  }
  /* The melody: chord tones an octave up; the contour index steps by one or
     two, so the line wanders instead of arpeggiating, and it is never allowed
     on two consecutive eighths. */
  if (i - lastMel > 1 && rnd() < 0.09 + 0.24 * m) {
    lastMel = i
    mi = (mi + 1 + (rnd() < 0.45 ? 1 : 0)) % 4
    pia(12 + v((mi % 3) + 1), 1.8, 0.034, dl)
  }
}

/* -------------------------------------------------------------- exports */

/** Create (or join) the graph. Safe on every gesture, repeatedly. */
export const initAudio = (): void => {
  if (!ensure() || !A) return
  if (A.state === 'suspended' && !isAudioSuspended()) void A.resume().catch(() => {})
}

/** One-shot cue. Unknown names are ignored; `v` is per cue, see CUES. */
export const sfx = (n: Cue, v?: number): void => {
  if (!A) return
  CUES[n]?.(v)
}

/* ---------------------------------------------------------------- babble */
/**
 * The dialogue babble (story-spec §10.11, D6: babble only, no voice-over).
 * One soft blip per BEAT — a number fixed from the English source, never the
 * on-screen string, so every locale babbles the same rhythm. Each speaker has
 * a fixed register on the music's own scale (nothing clashes with the bed):
 * Aurora bright and quick, Umbra lowest and slowest, a Guardian in between, a
 * wood sprite highest of all. `ask` bends the last blip up; `excite` is a
 * touch louder and quicker. It inherits every mute/pause/ad gate through V().
 */
const CHATTER: Readonly<Record<string, readonly [number, number, number]>> = {
  // [scale-degree offset, octave multiplier, gap between blips (s)]
  aurora: [2, 4, 0.1],
  umbra: [0, 1, 0.15],
  briar: [1, 2, 0.12],
  // Pearl sings (a high, rounded voice); Zephyr is quick and breezy.
  pearl: [3, 4, 0.13],
  zephyr: [2, 2, 0.08],
  // Terra slow and low; Echo quick and high (she repeats herself); Prism
  // bright; Ember warm and a touch dramatic; Glace cool and even; Nova soft.
  terra: [0, 1, 0.17],
  echo: [4, 4, 0.09],
  prism: [3, 4, 0.1],
  ember: [1, 2, 0.12],
  glace: [2, 2, 0.14],
  nova: [4, 4, 0.14],
  creature: [4, 8, 0.085]
}
/**
 * The babble's voice budget (§10.11's `CHATTER_MAXV = 4`) holds by
 * construction: blips are 90–140 ms long and start 85–150 ms apart, so at
 * most two ever overlap, and a new bubble cannot start before the 600 ms
 * dwell of the last. Dialogue also runs outside the gameplay bracket, so it
 * never competes with combat cues for `MAXV`.
 */
export const CHATTER_MAXV = 4

export const chatter = (speaker: string, beats: number, tone: 'neutral' | 'ask' | 'excite'): void => {
  if (!A || isAudioSuspended()) return
  const [deg, oct, gap0] = CHATTER[speaker] ?? CHATTER.aurora!
  const n = cl(beats | 0, 3, 9)
  const excite = tone === 'excite'
  const gap = gap0 * (excite ? 0.85 : 1)
  let d = deg
  for (let i = 0; i < n; i++) {
    // A wandering contour, a step or two at a time, like a sung syllable.
    d = Math.max(0, Math.min(5, d + (rnd() < 0.5 ? -1 : 1) * (rnd() < 0.3 ? 2 : 1)))
    const f = nf(d) * oct
    const last = i === n - 1
    const bend = last && tone === 'ask' ? 1.35 : last ? 0.94 : 1
    const len = 0.09 + rnd() * 0.05
    const g0 = (excite ? 0.055 : 0.04) * (0.8 + rnd() * 0.4)
    V(i & 1 ? SIN : TRI, f, f * bend, len, g0, 3, i * gap + rnd() * 0.012, 0.01)
  }
}

/** 0 = losing (dark) .. 0.5 even .. 1 = winning (bright). Feed it S.sky. */
export const setMood = (v: number): void => {
  mood = cl(v, 0, 1)
}

/** Start/stop the piano. Safe (and remembered) before initAudio. */
export const setMusicPlaying = (v: boolean): void => {
  if (playing === v) return
  playing = v
  // Resync on (re)start so a long-stopped sequencer does not burst to catch up.
  if (v) nx = 0
}

export const isMusicPlaying = (): boolean => playing

/** Player volumes, 0..1 each. Sound drives the cues, music the piano. */
export const setAudioLevels = (sound: number, music: number): void => {
  sfxLevel = cl(sound, 0, 1)
  musLevel = cl(music, 0, 1)
  level()
}

/* ------------------------------------------------------------- ambience */
/**
 * A restored biome's loop (story-spec §8.8 beat 1): no sustained oscillator,
 * just short voices re-triggered a little irregularly on the amb bus, so it
 * breathes instead of repeating. The bus gain does the fading.
 *   woods     leaf rustle + a distant bird's two-note chirp
 *   bay       a slow lapping swell + a few rising bubbles
 *   clouds    an airy wind sweep + now and then a soft high chime
 *   caves     crystalline bell partials, one struck at a time, and a drip
 *   mirrors   an echoing breeze + a chime and its softer echo
 *   ridge     a bright rising arpeggio shimmer
 *   sands     a slow dry tick + a warm wind
 *   tundra    a soft wind-chime + far off, a friendly two-note hoot
 *   summit    a twinkling high-bell pattern
 *   festival  warm festival bells + a soft crowd murmur
 */
const AMBIENCE: readonly ((t: number) => number)[] = [
  () => {
    V(NOISE, 1900, 1300, 1.1, 0.035, 1, 0, 0.35, 2)
    if (rnd() < 0.45) {
      const f = 2300 + rnd() * 700
      V(TRI, f, f * 1.25, 0.07, 0.022, 6, 0.3, 0.005, 2)
      V(TRI, f * 1.1, f * 1.3, 0.07, 0.02, 6, 0.42, 0.005, 2)
    }
    return 1.1 + rnd() * 0.9
  },
  () => {
    V(NOISE, 520, 330, 1.6, 0.055, 1, 0, 0.6, 2)
    if (rnd() < 0.5) {
      for (let i = (2 + rnd() * 3) | 0; i--;) {
        const f = 500 + rnd() * 400
        V(SIN, f, f * 2.2, 0.06, 0.018, 1, 0.4 + i * 0.09, 0.004, 2)
      }
    }
    return 1.5 + rnd() * 0.8
  },
  () => {
    V(NOISE, 650, 2600, 2.4, 0.032, 1, 0, 1, 2)
    if (rnd() < 0.25) V(TRI, nf(4) * 8, 0, 1.3, 0.012, 5, 0.6, 0.01, 2)
    return 2 + rnd() * 1.2
  },
  () => {
    const f = nf((rnd() * 6) | 0) * 8
    V(SIN, f, f, 1.6, 0.016, 1, 0, 0.004, 2)
    V(SIN, f * 2.76, f * 2.76, 0.9, 0.006, 1, 0.01, 0.004, 2)
    if (rnd() < 0.3) V(SIN, 1800, 900, 0.12, 0.012, 1, 0.5, 0.003, 2)
    return 1.3 + rnd() * 1.1
  },
  () => {
    V(NOISE, 800, 1400, 2, 0.026, 1, 0, 0.8, 2)
    if (rnd() < 0.4) {
      const f = nf((rnd() * 6) | 0) * 8
      V(TRI, f, 0, 0.8, 0.014, 5, 0.3, 0.006, 2)
      V(TRI, f, 0, 0.8, 0.006, 5, 0.62, 0.006, 2)
    }
    return 1.8 + rnd() * 1
  },
  () => {
    const d0 = (rnd() * 3) | 0
    for (let i = 0; i < 4; i++) V(TRI, nf(d0 + i) * 8, 0, 0.35, 0.012, 6, i * 0.09, 0.004, 2)
    return 1.6 + rnd() * 1.2
  },
  () => {
    V(NOISE, 3200, 2800, 0.04, 0.02, 3, 0, 0.002, 2)
    V(NOISE, 3000, 2600, 0.04, 0.014, 3, 0.5, 0.002, 2)
    if (rnd() < 0.35) V(NOISE, 400, 900, 2.2, 0.03, 1, 0.2, 0.9, 2)
    return 1
  },
  () => {
    if (rnd() < 0.6) {
      for (let i = (2 + rnd() * 2) | 0; i--;) V(SIN, nf((rnd() * 6) | 0) * 16, 0, 0.7, 0.008, 1, i * 0.12, 0.004, 2)
    }
    if (rnd() < 0.15) {
      V(SIN, nf(2) * 2, nf(2) * 2, 0.5, 0.01, 1, 0.3, 0.1, 2)
      V(SIN, nf(0) * 2, nf(0) * 2, 0.7, 0.01, 1, 0.85, 0.1, 2)
    }
    V(NOISE, 900, 1600, 2, 0.02, 1, 0, 0.8, 2)
    return 2 + rnd() * 1
  },
  () => {
    for (let i = (2 + rnd() * 3) | 0; i--;) V(SIN, nf((rnd() * 6) | 0) * 16, 0, 0.5, 0.008, 1, i * 0.14 + rnd() * 0.05, 0.003, 2)
    return 1.4 + rnd() * 1
  },
  () => {
    if (rnd() < 0.55) for (let i = 0; i < 3; i++) V(TRI, nf(i * 2) * 8, 0, 0.9, 0.012, 6, i * 0.16, 0.004, 2)
    V(NOISE, 300, 500, 1.8, 0.02, 1, 0, 0.6, 2)
    return 1.6 + rnd() * 1.1
  }
]

/**
 * Which biome is in view and how much of it (0..1). Called every frame by the
 * app root; cheap when nothing changes. `biome` -1 fades the ambience out.
 */
export const setAmbience = (biome: number, k: number): void => {
  const want = biome >= 0 && biome < AMBIENCE.length ? cl(k, 0, 1) : 0
  if (biome >= 0 && biome < AMBIENCE.length && biome !== ambBiome && want > 0) ambBiome = biome
  if (Math.abs(want - ambLevel) > 0.05 || (want === 0 && ambLevel !== 0)) {
    ambLevel = want
    level()
  }
}

/** Per frame: smooth the mood, then schedule ahead on the AudioContext clock. */
export const tickAudio = (dt: number): void => {
  if (!A) return
  dt = cl(dt, 0, 0.1)
  mS += (mood - mS) * dt * 3 // dt is capped, so this can never overshoot
  // The ambience keeps its own light clock, independent of the music.
  if (ambBiome >= 0 && ambLevel > 0 && !isAudioSuspended() && A.state === 'running') {
    const t0 = now()
    if (!(ambNext > t0 - 1)) ambNext = t0
    if (ambNext <= t0) ambNext = t0 + AMBIENCE[ambBiome]!(t0)
  }
  if (!playing || isAudioSuspended() || A.state !== 'running') return
  const t = now()
  if (!(nx > t)) nx = t + 0.05 // first note, or we fell behind: resync
  /* One eighth note. 52 bpm when you are losing, 70 when you are winning. */
  const sl = 30 / (52 + 18 * mS)
  for (let n = 0; nx < t + AHEAD && n < 8; n++) {
    seq(nx, step++)
    nx += sl
  }
}

/** Clean slate for a new duel — keeps the context (and the gesture) alive. */
export const resetAudio = (): void => {
  mood = mS = 0.5
  step = nx = lastDraw = mi = 0
  lastMel = -9
}

/** Test seam: how many voices are sounding. */
export const __voiceCount = (): number => vc
