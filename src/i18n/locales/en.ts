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
    'prism': 'PRISM',
    // The story's Guardians (story-spec §10.3) and the chapter's shadow clone.
    'briar': 'BRIAR',
    'pearl': 'PEARL',
    'echo': 'ECHO',
    'nova': 'NOVA',
    'shadow': 'SHADOW'
  },

  // ─── The runes (read aloud on the glyph-only slots; `{A}` in spell names) ──
  // The story's eight join the frozen four (story-spec §10.13.A).
  'rune': {
    'fire': 'Fire',
    'wind': 'Wind',
    'ice': 'Ice',
    'earth': 'Earth',
    'nature': 'Nature',
    'water': 'Water',
    'lightning': 'Lightning',
    'illusion': 'Illusion',
    'rainbow': 'Rainbow',
    'time': 'Time',
    'moon': 'Moon',
    'love': 'Love'
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
    'wildSurge': 'WILD SURGE',
    // The two Signature Spells (§10.13.B): hand-named, never generated.
    'crystalWard': 'CRYSTAL WARD',
    'frostLock': 'FROST LOCK'
  },

  // ─── Generated spell names (story-spec §10.12) ────────────────────────────
  // Every combo without a name of its own: a form noun per spell kind and
  // rune count, with the leading rune's name as {A} (upper-cased by the
  // locale in code). Word order lives here, per locale.
  //   k0 bolt · k1 field · k2 barrier · k3 heavy · k4 push · k5 summon
  'spellForm': {
    'k0': { 'c1': '{A} BOLT', 'c2': '{A} STREAK', 'c3': '{A} BURST' },
    'k1': { 'c1': '{A} PATCH', 'c2': '{A} FIELD', 'c3': '{A} STORM' },
    'k2': { 'c1': '{A} SHIELD', 'c2': '{A} WALL', 'c3': '{A} FORTRESS' },
    'k3': { 'c1': '{A} ORB', 'c2': '{A} CRASH', 'c3': '{A} NOVA' },
    'k4': { 'c1': '{A} PUFF', 'c2': '{A} GUST', 'c3': '{A} WHIRL' },
    'k5': { 'c1': '{A} SPRITE', 'c2': '{A} TWINS', 'c3': '{A} PARADE' }
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
    // A loss is a doze, never a defeat (story-spec §10.19, C27).
    'defeated': 'ZZZ…'
  },

  // ─── The duel's end (story-spec §10.19). No coins, no shop (D3). ─────────
  'result': {
    'victory': 'VICTORY!',
    // The loss beat's title: she dozed off, and may try again.
    'defeated': 'Zzz... try again?',
    // Reused as the Retry button's name after a loss.
    'tapToDuel': 'Tap to duel'
  },

  // ─── Spellbook (story-spec §3.9.1) ────────────────────────────────────────
  'book': {
    'title': 'SPELLBOOK',
    'unknown': '? ? ?',
    // Read aloud: the rune strip, a rune not found yet, the three sections.
    'runes': 'Runes',
    'lockedRune': 'A rune still to find',
    'count1': 'One-rune spells',
    'count2': 'Two-rune spells',
    'count3': 'Three-rune spells'
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
    'close': 'Save & Close',
    // Comfort settings (story-spec §3.11, §5.13).
    'traceAssist': 'Show rune guides',
    'reducedMotion': 'Reduced motion',
    // Leaving a duel mid-fight, with one gentle confirm (§10.13.G).
    'leaveDuel': {
      'label': 'Leave Duel',
      'title': 'Leave this duel?',
      'body': "Your progress in this duel won't be saved.",
      'confirm': 'Leave',
      'cancel': 'Stay'
    }
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

  'leaderboard': {
    'title': 'Leaderboard',
    'rank': '#',
    'player': 'Player',
    'score': 'Duels won',
    'flair': 'Progress',
    'empty': 'No duels posted yet. Be the first!',
    'failed': 'Couldn\'t reach the leaderboard.',
    'loading': 'Loading…',
    'you': 'You',
    'yourRank': 'You are #{n} of {total}',
    'of': 'of {n} players',
    'tabGlobal': 'Global'
  },

  // ─── Restoration (story-spec §8) ──────────────────────────────────────────
  // The restore view is zero-UI: every string here is READ ALOUD (aria-labels
  // on icon-only controls), never painted on screen.
  'a11y': {
    'backToMap': 'Back to map'
  },

  'restore': {
    'openGift': 'Open your gift',
    'pickColour': 'Pick a colour'
  },

  'paint': {
    'rose': 'Rose pink',
    'sunflower': 'Sunflower yellow',
    'bluebell': 'Bluebell blue'
  },

  'tool': {
    'stardustBrush': 'Stardust Brush',
    'magicEraser': 'Magic Eraser',
    'sunbeam': 'Sunbeam'
  },

  // ─── The story (story-spec §10) ───────────────────────────────────────────
  // Chapter titles translate (§10.5): they are places, not brands.
  'chapter': {
    'c1': 'Whispering Woods',
    'c2': 'Bubble Bay',
    'c3': 'Cloud Kingdom',
    'c4': 'Crystal Caves',
    'c5': 'Mirror Mountains',
    'c6': 'Rainbow Ridge',
    'c7': 'Sunken Sands',
    'c8': 'Twilight Tundra',
    'c9': 'Starlight Summit',
    'c10': 'Friendship Festival'
  },

  'map': {
    // Read aloud: the chapter-tab ribbon.
    'chapters': 'Chapters'
  },

  // Dialogue bubbles: at most eight words, every worry resolved in the same
  // exchange (§10.6). {name} is a creature's proper name — keep it as is.
  'story': {
    'c1': {
      'n1': {
        'b1': 'The Whispering Woods have gone quiet.',
        'b2': 'Shh... let them sleep with me.',
        'b3': "Not today, Umbra! Let's wake them up!"
      },
      'n5': {
        'b1': 'Who wakes my woods? Go away!',
        'b2': 'I just want to help you, Briar!',
        'b3': 'Prove it, little unicorn. Duel me!',
        't1': 'Oh! The woods feel warm again.',
        't2': 'Thank you, Aurora. Come back anytime!'
      }
    },
    // The shared beats of every chapter's nodes 2–4 (§10.8).
    'tmpl': {
      'curious': '{name} peeks out, curious!',
      'dusty': 'Aww, {name} looks a little dusty.',
      'cheerUp': "Let's cheer {name} up together!",
      'almost': 'Almost there — {name} is cheering for you!'
    }
  },

  // Wardrobe keepsakes, one per chapter's boss chest (§10.13.C).
  'gift': {
    'flowerCrown': 'Flower Crown',
    'seashellNecklace': 'Seashell Necklace',
    'pegasusWings': 'Fluffy Pegasus Wings',
    'hoofTrailVfx': 'Sparkly Hoof-trail',
    'umbraSkin': 'Umbra Look',
    'colorPicker': 'Mane Color Palette',
    'pastelTheme': 'Pastel Dream Theme',
    'winterScarf': 'Cozy Winter Scarf',
    'petStar': 'Pet Star',
    'versusMode': 'Friendship Duo'
  },

  'place': {
    'twinGift': 'Twin Gift'
  },

  // The Twin Gift's hold target (read aloud) and the bloom it pays (D3).
  'twinGift': {
    'holdLabel': 'Hold to Bloom'
  },

  'bloom': {
    'claimedToast': 'This place is in full bloom!'
  },

  // The near-miss callout (§5.12): shouted like the other callouts; the
  // rune's name is upper-cased by the locale at render time.
  'duel': {
    'almostRune': 'ALMOST {rune}!'
  },

  'license': {
    'denied': 'Access Denied: Please purchase a license.'
  }
}
