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
    'skip': 'Skip',
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
    'love': 'Love',
    // A chest has just given this rune (§8.30): the reveal, and the
    // panel that shows how to draw it.
    'newRune': 'A new rune!',
    'howToDraw': 'Draw it like this',
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
    'frostLock': 'FROST LOCK',
    // The three lingering spells (§8.35): an element, twice, and one Nature.
    'wildfire': 'WILDFIRE',
    'frostbite': 'FROSTBITE',
    'bramble': 'BRAMBLE'
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
    // Under beat 0's ghost trace: the shape, named, for the players the
    // animated finger alone does not reach.
    'triangle': 'DRAW A TRIANGLE',
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
    'defeated': 'ZZZ…',
    // Lightning went straight through a shield (§6.8).
    'pierced': 'ZAP!',
    // Crystal Ward sent a spell back at its caster (§6.5).
    'reflected': 'BOUNCE!',
    // A spell hit a decoy — a mirror-twin — and vanished (§6.3).
    'decoy': 'POOF!',
    // Frost Lock froze the opponent in ice (§6.5).
    'frozen': 'FROZEN!',
    // HP mended (Love's heal, Moon's lifesteal). {n} is a number.
    'heal': '+{n}'
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
    'nextRune': 'The next rune you will be given',
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
    // Replays the first-launch intro (§8.26); on the map and in a dialogue.
    'watchIntro': 'Watch the intro',
    // Leaving a duel mid-fight, with one gentle confirm (§10.13.G).
    'leaveDuel': {
      'label': 'Leave Duel',
      'title': 'Leave this duel?',
      'body': "Your progress in this duel won't be saved.",
      'confirm': 'Leave',
      'cancel': 'Stay'
    },
    // The "For Parents" tab (story-spec §2.7). Written for the adult reader:
    // full sentences are fine here, unlike anywhere else in the game.
    // Start the whole story again (`useResetProgress`). `keptNote` is the
    // reassurance, and it is load-bearing copy rather than politeness: the
    // leaderboard row is the server's and a client cannot delete it, so the
    // dialog must not imply otherwise.
    'resetProgress': {
      'label': 'Reset progress',
      'title': 'Start the whole story again?',
      'body': 'Everything the game remembers goes back to the beginning: the map, the runes, the keepsakes — and your settings.',
      'keptNote': 'Your place on the leaderboard stays as it is.',
      'confirm': 'Reset',
      'cancel': 'Keep'
    },
    'parents': {
      'title': 'For Parents',
      'aboutBody': 'Auroras Magic has no chat, no strangers, and no location. No account is needed to play.',
      'adsBody': "This game shows video ads to stay free. Some ads can't be skipped; watching a bonus-reward ad is always optional.",
      'adsNonPersonalisedNote': 'Ads in this build are shown without personalisation.',
      'purchasesBody': 'There are no in-app purchases.',
      'privacyBody': "We store a save file on this device or the portal's cloud save. No personal information is collected.",
      'leaderboardBody': 'The leaderboard shows only a made-up player name and the number of duels won.',
      'privacyLinkLabel': 'Full privacy policy'
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
    'of': 'of {n} players'
  },

  // ─── Restoration (story-spec §8) ──────────────────────────────────────────
  // The restore view is zero-UI: every string here is READ ALOUD (aria-labels
  // on icon-only controls), never painted on screen.
  'a11y': {
    'backToMap': 'Back to map',
    'wardrobeSlots': 'Places to dress',
    // Read over an unearned keepsake in the wardrobe AND over an unmet
    // sticker in the album (`album.toFind` was a second copy of this exact
    // sentence in all 21 locales, and is gone).
    'keepsakeToFind': 'Still to find'
  },

  'restore': {
    'openGift': 'Open your gift',
    'pickColour': 'Pick a colour'
  },

  'paint': {
    'rose': 'Rose pink',
    'sunflower': 'Sunflower yellow',
    'bluebell': 'Bluebell blue',
    'coral': 'Coral pink',
    'lagoon': 'Lagoon blue',
    'sunshell': 'Sunny gold',
    'lavender': 'Lavender',
    'skyblue': 'Sky blue',
    'sunrise': 'Sunrise orange',
    'amethyst': 'Amethyst purple',
    'aquamarine': 'Aquamarine',
    'rosequartz': 'Rose quartz pink',
    'silverblue': 'Silver blue',
    'mintglass': 'Mint green',
    'peach': 'Peach',
    'cherry': 'Cherry red',
    'tangerine': 'Tangerine orange',
    'lime': 'Lime green',
    'terracotta': 'Terracotta',
    'turquoise': 'Turquoise',
    'saffron': 'Saffron gold',
    'icicle': 'Icicle blue',
    'auroragreen': 'Aurora green',
    'berry': 'Berry purple',
    'stargold': 'Star gold',
    'midnight': 'Midnight blue',
    'cosmicpink': 'Cosmic pink',
    'candypink': 'Candy pink',
    'lemon': 'Lemon yellow',
    'mint': 'Mint',
    // A mane swatch (the Mane Color Palette keepsake), not a pot: every colour.
    'rainbow': 'Rainbow'
  },

  'tool': {
    'stardustSponge': 'Stardust Sponge',
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
    'c2': {
      'n1': {
        'b1': 'Bubble Bay has lost its song.',
        'b2': "Quiet is cozy too, don't you think?",
        'b3': 'Every voice deserves to be heard!'
      },
      'n5': {
        'b1': 'Who dares ripple my calm waters?',
        'b2': "I'm here to bring the songs back!",
        'b3': 'Then sing your strength to me. Duel!',
        't1': 'The tide feels light and bright!',
        't2': 'Thank you, Aurora. Swim by soon!'
      }
    },
    'c3': {
      'n1': {
        'b1': "The storm won't let the pegasi fly.",
        'b2': 'Storms make good napping weather, hmm?',
        'b3': "Let's clear the sky together, Zephyr!"
      },
      'n5': {
        'b1': 'Who dares fly through MY storm?',
        'b2': 'I want the pegasi to soar again!',
        'b3': 'Prove your spark. Duel me now!',
        't1': 'The sky feels calm and clear!',
        't2': 'Thank you, Aurora. Fly with us soon!'
      }
    },
    'c4': {
      'n1': {
        'b1': 'The Crystal Caves have gone dark.',
        'b2': 'Still shining, Aurora? The dark is restful.',
        'b3': "Terra, let's light the crystals together!"
      },
      'n5': {
        'b1': 'My crystals are broken. Leave them be.',
        'b2': 'I can help them glow again!',
        'b3': 'Show me your light, then. Duel!',
        't1': 'The caves are glowing again!',
        't2': "Thank you, Aurora. You're a true friend."
      }
    },
    'c5': {
      'n1': {
        'b1': 'The mirrors only show tricks now.',
        'b2': 'Can you even tell which one is me?',
        'b3': "Let's find what's real, together!"
      },
      'n5': {
        'b1': 'Who are you? Who are you?',
        'b2': "I'm Aurora! And you're Echo, right?",
        'b3': "Right? Right! Prove you're real. Duel!",
        't1': "Only one of me. That's me!",
        't2': 'Thank you, Aurora. Thank you, Aurora!'
      }
    },
    'c6': {
      'n1': {
        'b1': 'The rainbow bridge is losing its colours!',
        'b2': 'Grey is restful... and a little sad.',
        'b3': "Prism, let's paint the ridge again!"
      },
      'n5': {
        'b1': "Don't look at me! I'm all faded!",
        'b2': 'Your colours are still in there, Prism!',
        'b3': 'Then make me sparkle again. Duel!',
        't1': 'Look at me! Every colour is back!',
        't2': "Thank you, Aurora. You're dazzling too!"
      }
    },
    'c7': {
      'n1': {
        'b1': 'Time has stopped in the sandfalls.',
        'b2': 'I like it when nothing changes.',
        'b3': "Ember, let's get the sands flowing!"
      },
      'n5': {
        'b1': 'I must hold the hourglass. Alone!',
        'b2': "You don't have to do it alone!",
        'b3': 'Then show me your fire. Duel!',
        't1': 'The sands flow again. I can rest!',
        't2': 'Thank you, Aurora. That was so kind.'
      }
    },
    'c8': {
      'n1': {
        'b1': 'The auroras are trapped in ice!',
        'b2': 'Cold places are... a little lonely.',
        'b3': "Glace, let's set the sky free!"
      },
      'n5': {
        'b1': 'Stay back. I prefer my distance.',
        'b2': 'Friends can keep each other warm!',
        'b3': 'Hmph. Warm me up, then. Duel.',
        't1': 'The auroras dance again. How lovely.',
        't2': 'Thank you, Aurora. Visit me sometime.'
      }
    },
    'c9': {
      'n1': {
        'b1': 'The stars have all gone out!',
        'b2': 'Would anyone miss a light that went dark?',
        'b3': "Every light matters. Let's relight them!"
      },
      'n5': {
        'b1': "I'm too dim to shine anymore.",
        'b2': 'I believe in you, Nova!',
        'b3': 'Then help me find my spark. Duel!',
        't1': "I'm shining! Every star is shining!",
        't2': 'Thank you, Aurora. You lit my way.'
      }
    },
    'c10': {
      'n1': {
        'b1': "Everyone's making a festival for Umbra!",
        'b2': "A festival? I don't need one.",
        'b3': 'Everyone needs friends. Even you, Umbra!'
      },
      'n2': {
        'b1': 'The woods sent flowers for the party!',
        'b2': 'And the caves sent crystal lanterns!'
      },
      'n3': {
        'b1': "We'll sing a welcome song!",
        'b2': 'Welcome song! Welcome song!'
      },
      'n4': {
        'b1': "I'll paint the sky just for her!",
        'b2': 'Every star will shine tonight!'
      },
      'n5': {
        'b1': "Why won't you all leave me alone?",
        'b2': 'Because we want you with us, Umbra!',
        'b3': "Fine. But I won't make it easy!",
        't1': 'You... really want me at the festival?',
        't2': "Of course! You're our friend, Umbra!",
        't3': 'No one ever invited me before.',
        't4': "Then let's go! Let the festival begin!"
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

  // The finale (§10.19, §8.11): the capstone line on the Festival's card, and
  // what Umbra says when tapped as she wanders the restored map afterwards.
  'finale': {
    'line': "Umbra isn't lonely anymore.",
    'umbra1': 'Hi, Aurora! Thanks for being my friend.',
    'umbra2': 'This place looks so pretty now!',
    'umbra3': 'Want to duel for fun sometime?'
  },

  // Local 2P versus (§3.12, S5): two players on one wide screen.
  'versus': {
    // The map's button (read aloud) — the Friendship Duo, chapter 10's gift.
    'play': 'Play together',
    'player1': 'Player 1',
    'player2': 'Player 2',
    'ready': 'Ready!',
    // Shown when the screen is too narrow for two halves, or held upright.
    'turnSideways': 'Turn your device sideways to play together!',
    // The match's end, for both players at once — never a lone winner.
    'greatDuel': 'What a duel!',
    // Player 2's empty CAST button on a keyboard device.
    'castKey2': '[Enter] Cast'
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
    'acornCap': 'Acorn Cap',
    'bubbleTrail': 'Bubble Trail',
    'petCloud': 'Pet Cloud',
    'explorerGoggles': 'Explorer Goggles',
    'petFirefly': 'Pet Firefly',
    'butterflyWings': 'Butterfly Wings',
    'explorerPack': 'Explorer Pack',
    'frostTrail': 'Frosty Trail',
    'moonlitLook': 'Moonlit Look',
    'starTiara': 'Star Tiara',
    'bowTie': 'Bow Tie',
    'moonPendant': 'Moon Pendant',
    'petalTrail': 'Petal Trail',
    'sunsetLook': 'Sunset Look',
    'versusMode': 'Friendship Duo'
  },

  // The wardrobe's slot tabs — a PLACE on her, not a category.
  'slot': {
    'head': 'Head',
    'neck': 'Neck',
    'back': 'Back',
    'companion': 'Friend',
    'trail': 'Hoof trail',
    'mane': 'Mane',
    'skin': 'Coat'
  },

  // The dressing room's rewarded alternatives (owner, 2026-09-23): the second
  // shelf is unlocked in the wardrobe, one video each — or free, where no video
  // can play. `unlock` wears the movie icon in front of it; `getIt` is the free
  // path's plain label. The `…Aria` pair and `tryOn` are read aloud.
  'wardrobe': {
    'unlock': 'Unlock',
    'getIt': 'Get it',
    'unlockAria': 'Watch a video to unlock {name}',
    'getItAria': 'Get {name}',
    'noVideo': 'Video not ready yet',
    'tryOn': 'Try on {name}'
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

  // The replay stars (retention item 4). Nothing about them is READ on
  // screen: the map draws a star on the card and `★ 3/5` on the chapter tab,
  // both glyph and number. This is the spoken version of that tab, for a
  // screen reader — the only place the feature needs words at all.
  'star': {
    'tabLabel': '{name} — {n} of {total} stars'
  },

  // The daily gift (retention item 5). Never a streak: nothing here counts
  // days, threatens a loss, or mentions tomorrow.
  'daily': {
    'open': 'Open today’s gift',
    'stickerToast': 'A new friend for your album!'
  },

  // ─── The tent's second page: the sticker album (retention item 3) ─────────
  // Almost all of this is read aloud rather than printed: the album is a page
  // of drawings, and a child who cannot read yet must be able to fill it. The
  // hint is the one line meant for the grown-up reading over their shoulder.
  // An unmet sticker reads `a11y.keepsakeToFind` — the same sentence the
  // wardrobe already reads over an unearned keepsake, not a second copy.
  'album': {
    'title': 'Sticker Album',
    'hint': 'Tap a creature on a place you have brought back, and its sticker comes home.',
    'count': '{met} of {total} found',
    'chapter': 'Chapter {n}',
    'found': 'Sticker found',
    'friend': 'A rescued friend',
    'dressTab': 'Dressing up',
    'albumTab': 'Sticker album'
  },

  // ─── The dress-up photo cards, kept in the album (retention item 16) ──────
  // `fullHint` takes `{n}` rather than spelling the number out: `PHOTO_SLOTS`
  // (`game/campaign/state.ts`) owns how many cards there are, and a numeral
  // written into prose in 21 languages is 21 places to forget when it moves.
  'photo': {
    'title': 'Photo cards',
    'take': 'Take a photo',
    'card': 'Photo card {n}',
    'empty': 'An empty photo card',
    'fullHint': 'The album keeps {n} cards. A new photo takes the oldest one’s place.'
  },

  // The near-miss callout (§5.12): shouted like the other callouts; the
  // rune's name is upper-cased by the locale at render time.
  'duel': {
    'almostRune': 'ALMOST {rune}!'
  },

  'license': {
    'denied': 'Access Denied: Please purchase a license.'
  },

  // ─── Help a child can SEE (retention roadmap items 7 and 8) ───────────────
  //
  // `auroraLine` is what Aurora says when a second loss on a node lights the
  // rune ghost for her. It is a reading BONUS — the picto beside it and the
  // glowing shape in the box carry the whole meaning for the three-year-olds
  // this exists for — so it must never be the only place the offer is made.
  // Tone: a friend leaning over with a crayon. It never counts the losses,
  // never says the word lose, and is never about the player.
  'help': {
    'auroraLine': "Here — I'll draw it with you!",
    // The little star on a rune slot, for a stroke drawn well past the
    // recogniser's line. Spoken, because it is the reward itself.
    'perfectRune': 'Beautifully drawn!'
  }
}
