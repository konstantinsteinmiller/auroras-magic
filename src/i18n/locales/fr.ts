// French bundle — mirrors the key shape of en.ts (pinned by tests/i18nParity.test.ts).
export default {
  'gameName': 'Auroras Magic',
  'cancel': 'Annuler',
  'close': 'Fermer',
  'ok': 'Ok',
  'continue': 'Continuer',
  'tapToContinue': 'Touchez pour continuer',
  'clickToContinue': 'Cliquez pour continuer',
  'rewards': 'RÉCOMPENSES',
  'crazyGamesOnly': 'Ce jeu est uniquement disponible sur',
  'loading': 'Chargement…',

  'ui': {
    'next': 'Suivant',
    'replay': 'Rejouer',
    'back': 'Retour',
    'play': 'Jouer',
    'pause': 'Pause',
    'menu': 'Menu',
    'home': 'Accueil',
    'info': 'Infos'
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
    'shadow': 'OMBRE'
  },

  'rune': {
    'fire': 'Feu',
    'wind': 'Vent',
    'ice': 'Glace',
    'earth': 'Terre',
    'nature': 'Nature',
    'water': 'Eau',
    'lightning': 'Éclair',
    'illusion': 'Illusion',
    'rainbow': 'Arc-en-ciel',
    'time': 'Temps',
    'moon': 'Lune',
    'love': 'Amour'
  },

  'spell': {
    'fireBolt': 'TRAIT DE FEU',
    'fireStorm': 'TEMPÊTE DE FEU',
    'fireRain': 'PLUIE DE FEU',
    'bolt': 'RAFALE',
    'windWall': 'MUR DE VENT',
    'cyclone': 'CYCLONE',
    'iceBolt': 'TRAIT DE GLACE',
    'pillar': 'PILIER GLACÉ',
    'blizzard': 'BLIZZARD',
    'earthWall': 'MUR DE TERRE',
    'earthShard': 'ÉCLAT DE ROCHE',
    'boulder': 'ROCHER',
    'fireBall': 'BOULE DE FEU',
    'wetBall': 'BOULE D’EAU',
    'magmaShard': 'ÉCLAT DE MAGMA',
    'frostGale': 'VENT GLACIAL',
    'sandBlast': 'JET DE SABLE',
    'glacier': 'GLACIER',
    'prismNova': 'NOVA PRISME',
    'ashStorm': 'NUÉE DE CENDRE',
    'shatter': 'ÉCLATEMENT',
    'tempest': 'TOURMENTE',
    'wildSurge': 'VAGUE SAUVAGE',
    'crystalWard': 'BOUCLIER DE CRISTAL',
    'frostLock': 'VERROU DE GIVRE'
  },

  // Apposition (« NOVA PRISME », « LASER GLACE »), not « … DE {A} »: French
  // elides « de » before a vowel (EAU, AMOUR, ILLUSION, ARC-EN-CIEL), which a
  // fixed template cannot do.
  'spellForm': {
    'k0': { 'c1': 'TRAIT {A}', 'c2': 'RAYON {A}', 'c3': 'SALVE {A}' },
    'k1': { 'c1': 'CERCLE {A}', 'c2': 'CHAMP {A}', 'c3': 'TEMPÊTE {A}' },
    'k2': { 'c1': 'BOUCLIER {A}', 'c2': 'MUR {A}', 'c3': 'CHÂTEAU {A}' },
    'k3': { 'c1': 'ORBE {A}', 'c2': 'IMPACT {A}', 'c3': 'NOVA {A}' },
    'k4': { 'c1': 'SOUFFLE {A}', 'c2': 'RAFALE {A}', 'c3': 'TOURBILLON {A}' },
    'k5': { 'c1': 'LUTIN {A}', 'c2': 'JUMEAUX {A}', 'c3': 'PARADE {A}' }
  },

  'hud': {
    'castKey': '[Espace] Lancer',
    'cast': 'LANCER',
    'drawARune': 'DESSINEZ UNE RUNE',
    'castAria': 'Lancer les runes stockées',
    'yourRunes': 'Vos runes',
    'foeRunes': 'Runes de l’adversaire',
    'emptySlot': 'Emplacement vide',
    'forming': 'En formation : {rune}',
    'weakness': '{rune} inflige {n} dégâts à cet adversaire',
    'sound': 'Activer ou couper le son',
    'spellbook': 'Grimoire',
    'hp': '{name} : {n} sur {max} points de vie'
  },

  'intro': {
    'draw': 'DESSINEZ LA RUNE',
    'stored': 'STOCKÉE ! JUSQU’À 3',
    'cast': 'LANCEZ-LA MAINTENANT'
  },

  'pop': {
    'notARune': 'PAS UNE RUNE',
    'noSlots': 'PLUS DE PLACE !',
    'blocked': 'BLOQUÉ',
    'hit': '-{n}',
    'weakHit': 'POINT FAIBLE ! -{n}',
    'combo': 'COMBO x{n}',
    'times': 'x{n}',
    'victory': 'VICTOIRE',
    'defeated': 'ZZZ…',
    'pierced': 'ZAP !'
  },

  'result': {
    'victory': 'VICTOIRE !',
    'defeated': 'Zzz... on réessaie ?',
    'tapToDuel': 'Touchez pour un duel'
  },

  'book': {
    'title': 'GRIMOIRE',
    'unknown': '? ? ?',
    'runes': 'Runes',
    'lockedRune': 'Une rune encore à trouver',
    'count1': 'Sorts à une rune',
    'count2': 'Sorts à deux runes',
    'count3': 'Sorts à trois runes'
  },

  'options': {
    'title': 'Options',
    'general': 'Général',
    'audio': 'Audio',
    'language': 'Langue',
    'soundEffects': 'Effets sonores',
    'music': 'Musique',
    'haptics': 'Vibration',
    'on': 'Activé',
    'off': 'Désactivé',
    'close': 'Enregistrer et fermer',
    'traceAssist': 'Afficher les guides des runes',
    'reducedMotion': 'Animations réduites',
    'leaveDuel': {
      'label': 'Quitter le duel',
      'title': 'Quitter ce duel ?',
      'body': 'Ta progression dans ce duel ne sera pas enregistrée.',
      'confirm': 'Quitter',
      'cancel': 'Rester'
    },
    'parents': {
      'title': 'Pour les parents',
      'aboutBody': 'Auroras Magic ne comporte ni chat, ni contact avec des inconnus, ni géolocalisation. Aucun compte n’est nécessaire pour jouer.',
      'adsBody': 'Ce jeu affiche des publicités vidéo pour rester gratuit. Certaines publicités ne peuvent pas être passées ; regarder une publicité pour obtenir une récompense bonus est toujours facultatif.',
      'adsNonPersonalisedNote': 'Dans cette version, les publicités sont affichées sans personnalisation.',
      'purchasesBody': 'Il n’y a aucun achat intégré.',
      'privacyBody': 'Nous enregistrons une sauvegarde sur cet appareil ou dans la sauvegarde cloud du portail. Aucune information personnelle n’est collectée.',
      'leaderboardBody': 'Le classement affiche uniquement un nom de joueur inventé et le nombre de duels gagnés.',
      'privacyLinkLabel': 'Politique de confidentialité complète'
    }
  },

  'saveStatus': {
    'restoredTitle': 'Sauvegarde cloud restaurée',
    'restoredBody': '+{n} pièces bonus pour la récupération',
    'tap': 'toucher',
    'pausedTitle': 'Synchronisation en pause',
    'pausedBody': 'Vous jouez hors ligne. Votre progression est enregistrée ici.',
    'retry': 'Réessayer',
    'dismiss': 'ignorer'
  },

  'adsBlocked': {
    'title': 'Impossible d’afficher la publicité',
    'body': 'Nous avons essayé de vous montrer une vidéo pour votre récompense, mais quelque chose dans votre navigateur bloque les publicités.',
    'allowPrefix': 'Autorisez les publicités sur',
    'allowSuffix': '(ou mettez votre bloqueur en pause pour ce jeu) puis réessayez.',
    'gotIt': 'Compris'
  },

  'leaderboard': {
    'title': 'Classement',
    'rank': '#',
    'player': 'Joueur',
    'score': 'Victoires',
    'flair': 'Progression',
    'empty': 'Aucun duel enregistré pour l\'instant. À toi de jouer !',
    'failed': 'Impossible de joindre le classement.',
    'loading': 'Chargement…',
    'you': 'Toi',
    'yourRank': 'Tu es #{n} sur {total}',
    'of': 'sur {n} joueurs',
    'tabGlobal': 'Mondial'
  },

  'a11y': {
    'backToMap': 'Retour à la carte'
  },

  'restore': {
    'openGift': 'Ouvre ton cadeau',
    'pickColour': 'Choisis une couleur'
  },

  'paint': {
    'rose': 'Rose',
    'sunflower': 'Jaune tournesol',
    'bluebell': 'Bleu jacinthe',
    'coral': 'Rose corail',
    'lagoon': 'Bleu lagon',
    'sunshell': 'Or soleil',
    'lavender': 'Lavande',
    'skyblue': 'Bleu ciel',
    'sunrise': 'Orange soleil levant'
  },

  'tool': {
    'stardustBrush': 'Pinceau de poussière d\'étoiles',
    'magicEraser': 'Gomme magique',
    'sunbeam': 'Rayon de soleil'
  },

  'chapter': {
    'c1': 'Bois des Murmures',
    'c2': 'Baie des Bulles',
    'c3': 'Royaume des Nuages',
    'c4': 'Grottes de Cristal',
    'c5': 'Monts Miroirs',
    'c6': 'Crête Arc-en-ciel',
    'c7': 'Sables Engloutis',
    'c8': 'Toundra du Crépuscule',
    'c9': 'Sommet des Étoiles',
    'c10': 'Fête de l’Amitié'
  },

  'map': {
    'chapters': 'Chapitres'
  },

  'story': {
    'c1': {
      'n1': {
        'b1': 'Le Bois des Murmures est tout silencieux.',
        'b2': 'Chut... laisse-les dormir avec moi.',
        'b3': 'Pas aujourd’hui, Umbra ! Réveillons-les !'
      },
      'n5': {
        'b1': 'Qui réveille mes bois ? Va-t’en !',
        'b2': 'Je veux juste t’aider, Briar !',
        'b3': 'Prouve-le, petite licorne. Affronte-moi !',
        't1': 'Oh ! Les bois sont de nouveau tout chauds.',
        't2': 'Merci, Aurora. Reviens quand tu veux !'
      }
    },
    'c2': {
      'n1': {
        'b1': 'La Baie des Bulles a perdu sa chanson.',
        'b2': 'Le silence, c’est douillet aussi, non ?',
        'b3': 'Chaque voix mérite d’être entendue !'
      },
      'n5': {
        'b1': 'Qui ose agiter mes eaux calmes ?',
        'b2': 'Je suis là pour ramener les chansons !',
        'b3': 'Alors chante-moi ta force. En duel !',
        't1': 'La marée est toute légère et lumineuse !',
        't2': 'Merci, Aurora. Reviens vite nager ici !'
      }
    },
    'c3': {
      'n1': {
        'b1': 'L’orage empêche les petits pégases de voler.',
        'b2': 'L’orage, c’est parfait pour la sieste, hmm ?',
        'b3': 'Dégageons le ciel ensemble, Zephyr !'
      },
      'n5': {
        'b1': 'Qui ose voler dans MON orage ?',
        'b2': 'Je veux que les pégases volent à nouveau !',
        'b3': 'Montre ton étincelle. Affronte-moi maintenant !',
        't1': 'Le ciel est calme et tout dégagé !',
        't2': 'Merci, Aurora. Reviens vite voler avec nous !'
      }
    },
    'tmpl': {
      'curious': '{name} pointe son nez avec curiosité !',
      'dusty': 'Oh, il y a un peu de poussière sur {name}.',
      'cheerUp': 'Redonnons le sourire à {name} ensemble !',
      'almost': 'Presque fini — {name} t’encourage !'
    }
  },

  'gift': {
    'flowerCrown': 'Couronne de fleurs',
    'seashellNecklace': 'Collier de coquillages',
    'pegasusWings': 'Ailes de Pégase toutes douces',
    'hoofTrailVfx': 'Traînée de sabots scintillante',
    'umbraSkin': 'Style Umbra',
    'colorPicker': 'Palette de couleurs de crinière',
    'pastelTheme': 'Thème Rêve pastel',
    'winterScarf': 'Écharpe d’hiver douillette',
    'petStar': 'Étoile de compagnie',
    'versusMode': 'Duo de l’amitié'
  },

  'place': {
    'twinGift': 'Cadeau jumeau'
  },

  'twinGift': {
    'holdLabel': 'Maintiens pour faire fleurir'
  },

  'bloom': {
    'claimedToast': 'Cet endroit est en pleine floraison !'
  },

  'duel': {
    'almostRune': 'PRESQUE {rune} !'
  },

  'license': {
    'denied': 'Accès refusé : veuillez acheter une licence.'
  }
}
