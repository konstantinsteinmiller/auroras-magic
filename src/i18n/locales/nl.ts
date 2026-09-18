// Dutch bundle — mirrors the key shape of en.ts (pinned by tests/i18nParity.test.ts).
export default {
  'gameName': 'Auroras Magic',
  'cancel': 'Annuleren',
  'close': 'Sluiten',
  'ok': 'Ok',
  'continue': 'Doorgaan',
  'tapToContinue': 'Tik om door te gaan',
  'clickToContinue': 'Klik om door te gaan',
  'rewards': 'BELONINGEN',
  'crazyGamesOnly': 'Dit spel is alleen beschikbaar op',
  'loading': 'Laden…',

  'ui': {
    'next': 'Volgende',
    'replay': 'Opnieuw',
    'back': 'Terug',
    'play': 'Spelen',
    'pause': 'Pauze',
    'menu': 'Menu',
    'home': 'Start',
    'info': 'Info'
  },

  'duelist': {
    'aurora': 'AURORA',
    'umbra': 'UMBRA',
    'ember': 'EMBER',
    'zephyr': 'ZEPHYR',
    'glace': 'GLACE',
    'terra': 'TERRA',
    'prism': 'PRISM',
    'briar': 'BRIAR',
    'pearl': 'PEARL',
    'echo': 'ECHO',
    'nova': 'NOVA',
    'shadow': 'SCHADUW'
  },

  'rune': {
    'fire': 'Vuur',
    'wind': 'Wind',
    'ice': 'IJs',
    'earth': 'Aarde',
    'nature': 'Natuur',
    'water': 'Water',
    'lightning': 'Bliksem',
    'illusion': 'Illusie',
    'rainbow': 'Regenboog',
    'time': 'Tijd',
    'moon': 'Maan',
    'love': 'Liefde'
  },

  'spell': {
    'fireBolt': 'VUURPIJL',
    'fireStorm': 'VUURSTORM',
    'fireRain': 'VUURREGEN',
    'bolt': 'WINDSTOOT',
    'windWall': 'WINDMUUR',
    'cyclone': 'CYCLOON',
    'iceBolt': 'IJSPIJL',
    'pillar': 'IJSZUIL',
    'blizzard': 'SNEEUWSTORM',
    'earthWall': 'AARDMUUR',
    'earthShard': 'AARDSCHERF',
    'boulder': 'ROTSBLOK',
    'fireBall': 'VUURBAL',
    'wetBall': 'WATERBAL',
    'magmaShard': 'MAGMASCHERF',
    'frostGale': 'VORSTWIND',
    'sandBlast': 'ZANDSTRAAL',
    'glacier': 'GLETSJER',
    'prismNova': 'PRISMA-NOVA',
    'ashStorm': 'ASWOLK',
    'shatter': 'VERBRIJZELEN',
    'tempest': 'NOODWEER',
    'wildSurge': 'WILDE GOLF',
    'crystalWard': 'KRISTALSCHILD',
    'frostLock': 'VORSTSLOT'
  },

  // A hyphen joins {A} to the form noun, so every rune (AARDE-ELFJE) stays legible.
  'spellForm': {
    'k0': { 'c1': '{A}-PIJL', 'c2': '{A}-STRAAL', 'c3': '{A}-SALVO' },
    'k1': { 'c1': '{A}-PLEK', 'c2': '{A}-VELD', 'c3': '{A}-STORM' },
    'k2': { 'c1': '{A}-SCHILD', 'c2': '{A}-MUUR', 'c3': '{A}-BURCHT' },
    'k3': { 'c1': '{A}-BOL', 'c2': '{A}-KLAP', 'c3': '{A}-NOVA' },
    'k4': { 'c1': '{A}-ZUCHTJE', 'c2': '{A}-VLAAG', 'c3': '{A}-WERVELING' },
    'k5': { 'c1': '{A}-ELFJE', 'c2': '{A}-TWEELING', 'c3': '{A}-PARADE' }
  },

  'hud': {
    'castKey': '[Spatie] Toveren',
    'cast': 'TOVEREN',
    'drawARune': 'TEKEN EEN RUNE',
    'castAria': 'Tover met de opgeslagen runen',
    'yourRunes': 'Jouw runen',
    'foeRunes': 'Runen van de tegenstander',
    'emptySlot': 'Leeg vak',
    'forming': 'Vormt zich: {rune}',
    'weakness': '{rune} doet {n} schade bij deze tegenstander',
    'sound': 'Geluid aan of uit',
    'spellbook': 'Spreukenboek',
    'hp': '{name}: {n} van {max} levenspunten'
  },

  'intro': {
    'draw': 'TEKEN DE RUNE',
    'stored': 'OPGESLAGEN! TOT 3',
    'cast': 'TOVER NU'
  },

  'pop': {
    'notARune': 'GEEN RUNE',
    'noSlots': 'GEEN PLEK!',
    'blocked': 'GEBLOKKEERD',
    'hit': '-{n}',
    'weakHit': 'ZWAKKE PLEK! -{n}',
    'combo': 'x{n} COMBO',
    'times': 'x{n}',
    'victory': 'OVERWINNING',
    'defeated': 'ZZZ…'
  },

  'result': {
    'victory': 'OVERWINNING!',
    'defeated': 'Zzz... nog een keer?',
    'tapToDuel': 'Tik om te duelleren'
  },

  'book': {
    'title': 'SPREUKENBOEK',
    'unknown': '? ? ?',
    'runes': 'Runen',
    'lockedRune': 'Een rune die je nog moet vinden',
    'count1': 'Spreuken met één rune',
    'count2': 'Spreuken met twee runen',
    'count3': 'Spreuken met drie runen'
  },

  'options': {
    'title': 'Opties',
    'general': 'Algemeen',
    'audio': 'Audio',
    'language': 'Taal',
    'soundEffects': 'Geluidseffecten',
    'music': 'Muziek',
    'haptics': 'Trillen',
    'on': 'Aan',
    'off': 'Uit',
    'close': 'Opslaan en sluiten',
    'traceAssist': 'Runehulplijnen tonen',
    'reducedMotion': 'Minder beweging',
    'leaveDuel': {
      'label': 'Duel verlaten',
      'title': 'Dit duel verlaten?',
      'body': 'Je voortgang in dit duel wordt niet opgeslagen.',
      'confirm': 'Verlaten',
      'cancel': 'Blijven'
    }
  },

  'saveStatus': {
    'restoredTitle': 'Cloudopslag hersteld',
    'restoredBody': '+{n} bonusmunten voor het herstel',
    'tap': 'tik',
    'pausedTitle': 'Cloudsync gepauzeerd',
    'pausedBody': 'Je speelt offline. Je voortgang wordt hier opgeslagen.',
    'retry': 'Opnieuw',
    'dismiss': 'sluiten'
  },

  'adsBlocked': {
    'title': 'Advertentie kon niet worden getoond',
    'body': 'We wilden je een video tonen zodat je je beloning kon verdienen, maar iets in je browser blokkeert advertenties.',
    'allowPrefix': 'Sta advertenties toe op',
    'allowSuffix': '(of pauzeer je adblocker voor dit spel) en probeer het opnieuw.',
    'gotIt': 'Begrepen'
  },

  'leaderboard': {
    'title': 'Ranglijst',
    'rank': '#',
    'player': 'Speler',
    'score': 'Gewonnen',
    'flair': 'Voortgang',
    'empty': 'Nog geen duels. Wees de eerste!',
    'failed': 'Kan de ranglijst niet bereiken.',
    'loading': 'Laden…',
    'you': 'Jij',
    'yourRank': 'Je bent #{n} van {total}',
    'of': 'van {n} spelers',
    'tabGlobal': 'Wereldwijd'
  },

  'a11y': {
    'backToMap': 'Terug naar de kaart'
  },

  'restore': {
    'openGift': 'Open je cadeau',
    'pickColour': 'Kies een kleur'
  },

  'paint': {
    'rose': 'Rozenroze',
    'sunflower': 'Zonnebloemgeel',
    'bluebell': 'Klokjesblauw'
  },

  'tool': {
    'stardustBrush': 'Sterrenstofpenseel',
    'magicEraser': 'Tovergum',
    'sunbeam': 'Zonnestraal'
  },

  'chapter': {
    'c1': 'Fluisterbos',
    'c2': 'Bellenbaai',
    'c3': 'Wolkenrijk',
    'c4': 'Kristalgrotten',
    'c5': 'Spiegelbergen',
    'c6': 'Regenboogkam',
    'c7': 'Verzonken Zanden',
    'c8': 'Schemertoendra',
    'c9': 'Sterrentop',
    'c10': 'Vriendschapsfeest'
  },

  'map': {
    'chapters': 'Hoofdstukken'
  },

  'story': {
    'c1': {
      'n1': {
        'b1': 'Het Fluisterbos is stil geworden.',
        'b2': 'Sst... laat ze lekker met mij slapen.',
        'b3': 'Vandaag niet, Umbra! Laten we ze wekken!'
      },
      'n5': {
        'b1': 'Wie maakt mijn bos wakker? Ga weg!',
        'b2': 'Ik wil je alleen maar helpen, Briar!',
        'b3': 'Bewijs het maar, kleine eenhoorn. Duelleer met mij!',
        't1': 'Oh! Het bos voelt weer warm.',
        't2': 'Dank je, Aurora. Kom gerust nog eens!'
      }
    },
    'tmpl': {
      'curious': '{name} kijkt nieuwsgierig om het hoekje!',
      'dusty': 'Ach, {name} is een beetje stoffig.',
      'cheerUp': 'Laten we {name} samen opvrolijken!',
      'almost': 'Nog even — {name} moedigt je aan!'
    }
  },

  'gift': {
    'flowerCrown': 'Bloemenkroon',
    'seashellNecklace': 'Schelpenketting',
    'pegasusWings': 'Pluizige pegasusvleugels',
    'hoofTrailVfx': 'Glinsterend hoefspoor',
    'umbraSkin': 'Umbra-look',
    'colorPicker': 'Kleurpalet voor je manen',
    'pastelTheme': 'Pasteldroom-thema',
    'winterScarf': 'Knusse wintersjaal',
    'petStar': 'Sterrenvriendje',
    'versusMode': 'Vriendschapsduo'
  },

  'place': {
    'twinGift': 'Dubbel cadeau'
  },

  'twinGift': {
    'holdLabel': 'Houd vast om te laten bloeien'
  },

  'bloom': {
    'claimedToast': 'Deze plek staat in volle bloei!'
  },

  'duel': {
    'almostRune': 'BIJNA {rune}!'
  },

  'license': {
    'denied': 'Toegang geweigerd: koop een licentie.'
  }
}
