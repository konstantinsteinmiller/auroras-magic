// English source bundle. Single source of truth for translation keys — every
// new player-facing string gets a key here first; the per-language files in
// this folder mirror the shape (pinned by `tests/i18nParity.test.ts`). Vite
// ships each non-English locale as its own lazy chunk (see `src/i18n/index.ts`).
//
// CASE. The duel's chrome is shouted in capitals, as in the jam build. That is
// written INTO the strings rather than applied with `text-transform`, because
// `uppercase` is a Latin idiom: scripts without case must simply not have it,
// and a German `ß` or a Turkish dotted `i` uppercase differently than CSS would.
export default {
  'gameName': 'Auroras Magic',
  'cancel': 'Cancel',
  'close': 'Close',
  'ok': 'Ok',
  'continue': 'Continue',
  'tapToContinue': 'Tap to continue',
  'clickToContinue': 'Click to continue',
  'rewards': 'REWARDS',
  'crazyGamesOnly': 'This game is only available on',
  'loading': 'Loading…',

  // ─── Shared UI labels ─────────────────────────────────────────────────────
  // Read aloud, not seen: the `aria-label` floor under icon-only controls
  // (see `components/icons/iconLabels.ts`).
  'ui': {
    'next': 'Next',
    'replay': 'Replay',
    'back': 'Back',
    'play': 'Play',
    'pause': 'Pause',
    'menu': 'Menu',
    'home': 'Home',
    'info': 'Info'
  },

  // ─── The duelists ─────────────────────────────────────────────────────────
  // Proper names. Latin-script locales keep them as they are; the others
  // transliterate so the HP bar never mixes scripts.
  'duelist': {
    'aurora': 'AURORA',
    'umbra': 'UMBRA',
    'ember': 'EMBER',
    'zephyr': 'ZEPHYR',
    'glace': 'GLACE',
    'terra': 'TERRA',
    'prism': 'PRISM'
  },

  // ─── The four runes (read aloud on the glyph-only slots and shop plates) ──
  'rune': {
    'fire': 'Fire',
    'wind': 'Wind',
    'ice': 'Ice',
    'earth': 'Earth'
  },

  // ─── Spell names — the CAST button shows the one that is loaded ───────────
  // Keep them short: the button is ~340 stage units wide at 34 px type.
  'spell': {
    'fireBolt': 'FIRE BOLT',
    'fireStorm': 'FIRE STORM',
    'fireRain': 'FIRE RAIN',
    'bolt': 'BOLT',
    'windWall': 'WIND WALL',
    'cyclone': 'CYCLONE',
    'iceBolt': 'ICE BOLT',
    'pillar': 'PILLAR',
    'blizzard': 'BLIZZARD',
    'earthWall': 'EARTH WALL',
    'earthShard': 'EARTH SHARD',
    'boulder': 'BOULDER',
    'fireBall': 'FIRE BALL',
    'wetBall': 'WET BALL',
    'magmaShard': 'MAGMA SHARD',
    'frostGale': 'FROST GALE',
    'sandBlast': 'SAND BLAST',
    'glacier': 'GLACIER',
    'prismNova': 'PRISM NOVA',
    'ashStorm': 'ASH STORM',
    'shatter': 'SHATTER',
    'tempest': 'TEMPEST',
    'wildSurge': 'WILD SURGE'
  },

  // ─── Duel HUD ─────────────────────────────────────────────────────────────
  'hud': {
    // The empty CAST button. `castKey` on a keyboard device, `cast` on touch.
    'castKey': '[Space] Cast',
    'cast': 'CAST',
    // Pulses under the HP bars until the first rune of a duel is stored.
    'drawARune': 'DRAW A RUNE',
    // Screen-reader names for the glyph-only controls and slots.
    'castAria': 'Cast the stored runes',
    'yourRunes': 'Your runes',
    'foeRunes': 'Opponent runes',
    'emptySlot': 'Empty slot',
    'forming': 'Forming: {rune}',
    'weakness': '{rune} deals {n} damage to this opponent',
    'sound': 'Sound on or off',
    'spellbook': 'Spellbook',
    'hp': '{name}: {n} of {max} health'
  },

  // ─── Onboarding — three beats, none of which block play ───────────────────
  'intro': {
    'draw': 'DRAW THE RUNE',
    'stored': 'STORED! UP TO 3',
    'cast': 'NOW CAST IT'
  },

  // ─── Floating callouts ────────────────────────────────────────────────────
  'pop': {
    'notARune': 'NOT A RUNE',
    'noSlots': 'NO SLOTS!',
    'blocked': 'BLOCKED',
    'hit': '-{n}',
    'weakHit': 'WEAK! -{n}',
    'combo': 'x{n} COMBO',
    // Appended to a spell name when more than one rune went into it.
    'times': 'x{n}',
    'victory': 'VICTORY',
    'defeated': 'DEFEATED',
    'coins': '+{n} COINS'
  },

  // ─── Result panel + the element shop that lives on it ─────────────────────
  'result': {
    'victory': 'VICTORY!',
    'defeated': 'DEFEATED',
    'tapToDuel': 'Tap to duel',
    'coins': 'Coins: {n}',
    // A shop plate: the element's current damage bonus.
    'rankBonus': '+{n}%',
    // Its price for the next rank.
    'price': '{n}',
    'buyRank': '{rune} +12% damage, costs {price} coins',
    // Rewarded ads. `double` after a win (it doubles that win's coins),
    // `bonus` after a loss (a consolation purse so a stuck player can still
    // buy a rank). Both sit on a button with a play glyph beside them.
    'double': 'x2 COINS',
    'bonus': '+{n} COINS',
    'watchAd': 'Watch an ad: {reward}',
    'claimed': 'CLAIMED!'
  },

  // ─── Spellbook (feature-flagged off, as in the jam build) ─────────────────
  'book': {
    'title': 'SPELLBOOK',
    'unknown': '? ? ?'
  },

  // ─── Options ──────────────────────────────────────────────────────────────
  'options': {
    'title': 'Options',
    'general': 'General',
    'audio': 'Audio',
    'language': 'Language',
    'soundEffects': 'Sound Effects',
    'music': 'Music',
    // Rendered ONLY on a device that actually has a motor (see
    // `useHaptics.hapticsAvailable`). `on` / `off` label a two-item dropdown.
    'haptics': 'Vibration',
    'on': 'On',
    'off': 'Off',
    'close': 'Save & Close'
  },

  'saveStatus': {
    'restoredTitle': 'Cloud save restored',
    'restoredBody': '+{n} bonus coins for the recovery',
    'tap': 'tap',
    'pausedTitle': 'Cloud sync paused',
    'pausedBody': 'Playing offline. Your progress is saved here.',
    'retry': 'Retry',
    'dismiss': 'dismiss'
  },

  'adsBlocked': {
    'title': "Couldn't show ad",
    'body': 'We tried to show you a video so you could earn your reward, but something on your browser is blocking ads.',
    'allowPrefix': 'Please allow ads on',
    'allowSuffix': '(or pause your ad-blocker for this game) and try again.',
    'gotIt': 'Got it'
  },

  'license': {
    'denied': 'Access Denied: Please purchase a license.'
  }
}
