// Polish bundle — mirrors the key shape of en.ts (pinned by tests/i18nParity.test.ts).
export default {
  'gameName': 'Auroras Magic',
  'cancel': 'Anuluj',
  'close': 'Zamknij',
  'ok': 'Ok',
  'continue': 'Kontynuuj',
  'tapToContinue': 'Dotknij, aby kontynuować',
  'clickToContinue': 'Kliknij, aby kontynuować',
  'rewards': 'NAGRODY',
  'crazyGamesOnly': 'Ta gra jest dostępna tylko na',
  'loading': 'Wczytywanie…',

  'ui': {
    'next': 'Dalej',
    'replay': 'Powtórz',
    'back': 'Wstecz',
    'play': 'Graj',
    'pause': 'Pauza',
    'menu': 'Menu',
    'home': 'Ekran główny',
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
    'shadow': 'CIEŃ'
  },

  'rune': {
    'fire': 'Ogień',
    'wind': 'Wiatr',
    'ice': 'Lód',
    'earth': 'Ziemia',
    'nature': 'Natura',
    'water': 'Woda',
    'lightning': 'Piorun',
    'illusion': 'Iluzja',
    'rainbow': 'Tęcza',
    'time': 'Czas',
    'moon': 'Księżyc',
    'love': 'Miłość'
  },

  'spell': {
    'fireBolt': 'OGNISTY POCISK',
    'fireStorm': 'OGNISTA BURZA',
    'fireRain': 'OGNISTY DESZCZ',
    'bolt': 'PODMUCH',
    'windWall': 'ŚCIANA WIATRU',
    'cyclone': 'CYKLON',
    'iceBolt': 'LODOWY POCISK',
    'pillar': 'LODOWY FILAR',
    'blizzard': 'ŚNIEŻYCA',
    'earthWall': 'ŚCIANA ZIEMI',
    'earthShard': 'ODŁAMEK SKAŁY',
    'boulder': 'GŁAZ',
    'fireBall': 'KULA OGNIA',
    'wetBall': 'KULA WODY',
    'magmaShard': 'ODŁAMEK MAGMY',
    'frostGale': 'MROŹNY WICHER',
    'sandBlast': 'STRUGA PIASKU',
    'glacier': 'LODOWIEC',
    'prismNova': 'NOVA PRYZMATU',
    'ashStorm': 'BURZA POPIOŁU',
    'shatter': 'ROZPRYSK',
    'tempest': 'NAWAŁNICA',
    'wildSurge': 'DZIKA FALA',
    'crystalWard': 'KRYSZTAŁOWA TARCZA',
    'frostLock': 'MROŹNY ZAMEK'
  },

  // {A} is the rune's nominative name, so the form noun joins it with a hyphen.
  'spellForm': {
    'k0': { 'c1': '{A}-POCISK', 'c2': '{A}-SMUGA', 'c3': '{A}-SALWA' },
    'k1': { 'c1': '{A}-KRĄG', 'c2': '{A}-POLE', 'c3': '{A}-BURZA' },
    'k2': { 'c1': '{A}-TARCZA', 'c2': '{A}-MUR', 'c3': '{A}-TWIERDZA' },
    'k3': { 'c1': '{A}-KULA', 'c2': '{A}-GROM', 'c3': '{A}-NOVA' },
    'k4': { 'c1': '{A}-WIETRZYK', 'c2': '{A}-PODMUCH', 'c3': '{A}-WIR' },
    'k5': { 'c1': '{A}-DUSZEK', 'c2': '{A}-BLIŹNIAKI', 'c3': '{A}-PARADA' }
  },

  'hud': {
    'castKey': '[Spacja] Czaruj',
    'cast': 'CZARUJ',
    'drawARune': 'NARYSUJ RUNĘ',
    'castAria': 'Rzuć czar z zapisanych run',
    'yourRunes': 'Twoje runy',
    'foeRunes': 'Runy przeciwnika',
    'emptySlot': 'Puste miejsce',
    'forming': 'Tworzy się: {rune}',
    'weakness': '{rune} zadaje temu przeciwnikowi obrażenia: {n}',
    'sound': 'Włącz lub wyłącz dźwięk',
    'spellbook': 'Księga zaklęć',
    'hp': '{name}: zdrowie {n} z {max}'
  },

  'intro': {
    'draw': 'NARYSUJ RUNĘ',
    'stored': 'ZAPISANO! MAKS. 3',
    'cast': 'TERAZ RZUĆ CZAR'
  },

  'pop': {
    'notARune': 'TO NIE RUNA',
    'noSlots': 'BRAK MIEJSCA!',
    'blocked': 'ZABLOKOWANO',
    'hit': '-{n}',
    'weakHit': 'SŁABY PUNKT! -{n}',
    'combo': 'COMBO x{n}',
    'times': 'x{n}',
    'victory': 'ZWYCIĘSTWO',
    'defeated': 'CHRRR…',
    'pierced': 'TRZASK!'
  },

  'result': {
    'victory': 'ZWYCIĘSTWO!',
    'defeated': 'Chrrr... jeszcze raz?',
    'tapToDuel': 'Dotknij, aby walczyć'
  },

  'book': {
    'title': 'KSIĘGA ZAKLĘĆ',
    'unknown': '? ? ?',
    'runes': 'Runy',
    'lockedRune': 'Runa, którą trzeba jeszcze znaleźć',
    'count1': 'Zaklęcia z jednej runy',
    'count2': 'Zaklęcia z dwóch run',
    'count3': 'Zaklęcia z trzech run'
  },

  'options': {
    'title': 'Opcje',
    'general': 'Ogólne',
    'audio': 'Dźwięk',
    'language': 'Język',
    'soundEffects': 'Efekty dźwiękowe',
    'music': 'Muzyka',
    'haptics': 'Wibracje',
    'on': 'Wł.',
    'off': 'Wył.',
    'close': 'Zapisz i zamknij',
    'traceAssist': 'Pokazuj podpowiedzi run',
    'reducedMotion': 'Mniej animacji',
    'leaveDuel': {
      'label': 'Opuść pojedynek',
      'title': 'Opuścić ten pojedynek?',
      'body': 'Postęp w tym pojedynku nie zostanie zapisany.',
      'confirm': 'Wyjdź',
      'cancel': 'Zostań'
    },
    'parents': {
      'title': 'Dla rodziców',
      'aboutBody': 'W Auroras Magic nie ma czatu, kontaktu z nieznajomymi ani śledzenia lokalizacji. Do gry nie jest potrzebne konto.',
      'adsBody': 'Gra wyświetla reklamy wideo, dzięki którym jest darmowa. Niektórych reklam nie można pominąć; oglądanie reklamy z dodatkową nagrodą jest zawsze dobrowolne.',
      'adsNonPersonalisedNote': 'W tej wersji gry reklamy są wyświetlane bez personalizacji.',
      'purchasesBody': 'W grze nie ma zakupów w aplikacji.',
      'privacyBody': 'Postęp gry zapisujemy w pliku na tym urządzeniu lub w chmurze portalu z grami. Nie zbieramy żadnych danych osobowych.',
      'leaderboardBody': 'Ranking pokazuje tylko wymyśloną nazwę gracza i liczbę wygranych pojedynków.',
      'privacyLinkLabel': 'Pełna polityka prywatności'
    }
  },

  'saveStatus': {
    'restoredTitle': 'Zapis w chmurze przywrócony',
    'restoredBody': '+{n} monet bonusu za odzyskanie',
    'tap': 'dotknij',
    'pausedTitle': 'Synchronizacja wstrzymana',
    'pausedBody': 'Grasz offline. Postęp jest zapisywany tutaj.',
    'retry': 'Ponów',
    'dismiss': 'zamknij'
  },

  'adsBlocked': {
    'title': 'Nie udało się wyświetlić reklamy',
    'body': 'Chcieliśmy pokazać film, byś odebrał nagrodę, ale coś w przeglądarce blokuje reklamy.',
    'allowPrefix': 'Zezwól na reklamy na',
    'allowSuffix': '(lub wstrzymaj blokadę reklam dla tej gry) i spróbuj ponownie.',
    'gotIt': 'Rozumiem'
  },

  'leaderboard': {
    'title': 'Ranking',
    'rank': '#',
    'player': 'Gracz',
    'score': 'Wygrane',
    'flair': 'Postęp',
    'empty': 'Jeszcze nikt nie zagrał. Zacznij!',
    'failed': 'Nie udało się wczytać rankingu.',
    'loading': 'Wczytywanie…',
    'you': 'Ty',
    'yourRank': 'Jesteś #{n} z {total}',
    'of': 'z {n} graczy',
    'tabGlobal': 'Światowy'
  },

  'a11y': {
    'backToMap': 'Wróć do mapy'
  },

  'restore': {
    'openGift': 'Otwórz prezent',
    'pickColour': 'Wybierz kolor'
  },

  'paint': {
    'rose': 'Różany róż',
    'sunflower': 'Słonecznikowy żółty',
    'bluebell': 'Dzwonkowy błękit',
    'coral': 'Koralowy róż',
    'lagoon': 'Lagunowy błękit',
    'sunshell': 'Słoneczne złoto',
    'lavender': 'Lawendowy fiolet',
    'skyblue': 'Błękit nieba',
    'sunrise': 'Poranny pomarańcz'
  },

  'tool': {
    'stardustBrush': 'Pędzel gwiezdnego pyłu',
    'magicEraser': 'Magiczna gumka',
    'sunbeam': 'Promyk słońca'
  },

  'chapter': {
    'c1': 'Szepczący Las',
    'c2': 'Bąbelkowa Zatoka',
    'c3': 'Królestwo Chmur',
    'c4': 'Kryształowe Jaskinie',
    'c5': 'Lustrzane Góry',
    'c6': 'Tęczowa Grań',
    'c7': 'Zaginione Piaski',
    'c8': 'Tundra Zmierzchu',
    'c9': 'Gwiezdny Szczyt',
    'c10': 'Święto Przyjaźni'
  },

  'map': {
    'chapters': 'Rozdziały'
  },

  // {name} is a creature's name inserted as is — it always stands as the subject.
  'story': {
    'c1': {
      'n1': {
        'b1': 'W Szepczącym Lesie zrobiło się cicho.',
        'b2': 'Ciii... niech śpią razem ze mną.',
        'b3': 'Nie dziś, Umbro! Obudźmy je!'
      },
      'n5': {
        'b1': 'Kto budzi mój las? Idź sobie!',
        'b2': 'Chcę ci tylko pomóc, Briar!',
        'b3': 'Udowodnij to, mały jednorożcu! Stań do pojedynku!',
        't1': 'Och! W lesie znów jest ciepło.',
        't2': 'Dziękuję, Auroro. Wracaj, kiedy chcesz!'
      }
    },
    'c2': {
      'n1': {
        'b1': 'Bąbelkowa Zatoka straciła swoją piosenkę.',
        'b2': 'Cisza też jest przytulna, prawda?',
        'b3': 'Każdy głos zasługuje, by go usłyszeć!'
      },
      'n5': {
        'b1': 'Kto śmie marszczyć moje spokojne wody?',
        'b2': 'Przyszłam, żeby przywrócić piosenki!',
        'b3': 'To pokaż mi moc swojej piosenki. Do pojedynku!',
        't1': 'Fale znów są lekkie i jasne!',
        't2': 'Dziękuję, Auroro. Podpłyń do nas niedługo!'
      }
    },
    'c3': {
      'n1': {
        'b1': 'Przez burzę małe pegazy nie mogą latać.',
        'b2': 'Burza to dobra pogoda na drzemkę, hm?',
        'b3': 'Oczyśćmy razem niebo, Zephyr!'
      },
      'n5': {
        'b1': 'Kto śmie lecieć przez MOJĄ burzę?',
        'b2': 'Chcę, żeby pegazy znów szybowały!',
        'b3': 'Pokaż swoją iskrę. Stań do pojedynku!',
        't1': 'Niebo jest znów spokojne i czyste!',
        't2': 'Dziękuję, Auroro. Wpadnij wkrótce polatać z nami!'
      }
    },
    'tmpl': {
      'curious': '{name} zerka z ciekawością!',
      'dusty': 'Ojej, {name} jest trochę w kurzu.',
      'cheerUp': 'Niech {name} znów się uśmiechnie! Pomóżmy!',
      'almost': 'Już prawie — {name} trzyma za ciebie kciuki!'
    }
  },

  'gift': {
    'flowerCrown': 'Kwiatowa korona',
    'seashellNecklace': 'Naszyjnik z muszelek',
    'pegasusWings': 'Puszyste skrzydła pegaza',
    'hoofTrailVfx': 'Błyszczący ślad kopytek',
    'umbraSkin': 'Wygląd Umbry',
    'colorPicker': 'Paleta kolorów grzywy',
    'pastelTheme': 'Motyw „Pastelowy sen”',
    'winterScarf': 'Przytulny zimowy szalik',
    'petStar': 'Gwiezdny pupil',
    'versusMode': 'Przyjacielski duet'
  },

  'place': {
    'twinGift': 'Podwójny prezent'
  },

  'twinGift': {
    'holdLabel': 'Przytrzymaj, by zakwitło'
  },

  'bloom': {
    'claimedToast': 'To miejsce jest w pełnym rozkwicie!'
  },

  'duel': {
    'almostRune': 'PRAWIE {rune}!'
  },

  'license': {
    'denied': 'Odmowa dostępu: kup licencję.'
  }
}
