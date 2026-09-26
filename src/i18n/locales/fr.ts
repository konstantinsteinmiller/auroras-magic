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
    'skip': 'Passer',
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
    'love': 'Amour',
    'newRune': 'Une nouvelle rune !',
    'howToDraw': 'Dessine-la comme ça',
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
    'frostLock': 'VERROU DE GIVRE',
    'wildfire': 'FEU SAUVAGE',
    'frostbite': 'MORSURE DU GEL',
    'bramble': 'RONCES'
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
    'blockCasting': 'ELLE LANCE UN SORT !',
    'blockSquare': 'DESSINEZ LE CARRÉ POUR BLOQUER !',
    'blocked': 'VOUS L’AVEZ BLOQUÉ !',
    'attack': 'ATTAQUEZ AVEC DEUX RUNES !',
    'draw': 'DESSINEZ LA RUNE',
    'triangle': 'DESSINEZ UN TRIANGLE',
    'square': 'DESSINEZ UN CARRÉ',
    'twoRunes': 'DEUX RUNES, SORT PLUS FORT !',
    'stored': 'STOCKÉE ! JUSQU’À 3',
    'cast': 'LANCEZ-LA MAINTENANT'
  },

  'pop': {
    'notARune': 'PAS UNE RUNE',
    'trySquare': 'ESSAYEZ LE CARRÉ !',
    'tryTriangle': 'ESSAYEZ LE TRIANGLE !',
    'noSlots': 'PLUS DE PLACE !',
    'blocked': 'BLOQUÉ',
    'hit': '-{n}',
    'weakHit': 'POINT FAIBLE ! -{n}',
    'combo': 'COMBO x{n}',
    'times': 'x{n}',
    'victory': 'VICTOIRE',
    'defeated': 'ZZZ…',
    'pierced': 'ZAP !',
    'reflected': 'BOING !',
    'decoy': 'POUF !',
    'frozen': 'GELÉ !',
    'heal': '+{n}'
  },

  'result': {
    'victory': 'VICTOIRE !',
    'defeated': 'Zzz... on réessaie ?',
    'tapToDuel': 'Touchez pour un duel',
    'tip': {
      'block': 'Quand ses runes filent vers sa corne, dessinez un CARRÉ pour bloquer !',
      'stack': 'Deux runes font un sort plus fort !',
      'keepDrawing': 'Continuez à dessiner ! Tant que vous dessinez, votre magie vous protège.',
      'drawBig': 'Les formes grandes et calmes marchent le mieux !',
      'mix': 'Mélangez des runes différentes pour trouver de nouveaux sorts !'
    }
  },

  'book': {
    'title': 'GRIMOIRE',
    'unknown': '? ? ?',
    'runes': 'Runes',
    'lockedRune': 'Une rune encore à trouver',
    'nextRune': 'La prochaine rune que tu recevras',
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
    'traceAssist': 'Afficher les guides des runes',
    'reducedMotion': 'Animations réduites',
    'watchIntro': 'Revoir l’intro',
    'leaveDuel': {
      'label': 'Quitter le duel',
      'title': 'Quitter ce duel ?',
      'body': 'Ta progression dans ce duel ne sera pas enregistrée.',
      'confirm': 'Quitter',
      'cancel': 'Rester'
    },
    'resetProgress': {
      'label': 'Réinitialiser la progression',
      'title': 'Recommencer toute l’histoire ?',
      'body': 'Tout ce que le jeu retient revient au début : la carte, les runes, les souvenirs et tes réglages.',
      'keptNote': 'Ta place dans le classement reste inchangée.',
      'confirm': 'Réinitialiser',
      'cancel': 'Garder'
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
    'of': 'sur {n} joueurs'
  },

  'a11y': {
    'backToMap': 'Retour à la carte',
    'wardrobeSlots': 'Endroits à habiller',
    'keepsakeToFind': 'Encore à trouver'
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
    'sunrise': 'Orange soleil levant',
    'amethyst': 'Violet améthyste',
    'aquamarine': 'Aigue-marine',
    'rosequartz': 'Rose quartz',
    'silverblue': 'Bleu argenté',
    'mintglass': 'Vert menthe',
    'peach': 'Pêche',
    'cherry': 'Rouge cerise',
    'tangerine': 'Orange mandarine',
    'lime': 'Vert citron',
    'terracotta': 'Terre cuite',
    'turquoise': 'Turquoise',
    'saffron': 'Or safran',
    'icicle': 'Bleu glaçon',
    'auroragreen': 'Vert aurore',
    'berry': 'Violet mûre',
    'stargold': 'Or étoilé',
    'midnight': 'Bleu nuit',
    'cosmicpink': 'Rose cosmique',
    'candypink': 'Rose bonbon',
    'lemon': 'Jaune citron',
    'mint': 'Menthe',
    'rainbow': 'Arc-en-ciel'
  },

  'tool': {
    'stardustSponge': 'Éponge de poussière d\'étoiles',
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
    'chapters': 'Chapitres',
    'tabLabel': '{name} — {n} duels gagnés sur {total}'
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
    'c4': {
      'n1': {
        'b1': 'Les Grottes de Cristal sont plongées dans le noir.',
        'b2': 'Tu brilles encore, Aurora ? Le noir, c’est reposant.',
        'b3': 'Terra, rallumons les cristaux ensemble !'
      },
      'n5': {
        'b1': 'Mes cristaux sont cassés. Laisse-les tranquilles.',
        'b2': 'Je peux les faire briller à nouveau !',
        'b3': 'Alors montre-moi ta lumière. En duel !',
        't1': 'Les grottes brillent de nouveau !',
        't2': 'Merci, Aurora. Tu es une vraie amie.'
      }
    },
    'c5': {
      'n1': {
        'b1': 'Les miroirs ne font plus que des farces.',
        'b2': 'Tu arrives à deviner laquelle, c’est moi ?',
        'b3': 'Trouvons ensemble ce qui est vrai !'
      },
      'n5': {
        'b1': 'Qui es-tu ? Qui es-tu ?',
        'b2': 'Je suis Aurora ! Et tu es Echo, c’est ça ?',
        'b3': 'C’est ça ? C’est ça ! Prouve que tu es vraie. En duel !',
        't1': 'Une seule Echo. Et c’est moi !',
        't2': 'Merci, Aurora. Merci, Aurora !'
      }
    },
    'c6': {
      'n1': {
        'b1': 'Le pont arc-en-ciel perd ses couleurs !',
        'b2': 'Le gris, c’est reposant... et un peu triste.',
        'b3': 'Prism, redonnons des couleurs à la crête !'
      },
      'n5': {
        'b1': 'Ne me regarde pas ! Je suis toute délavée !',
        'b2': 'Tes couleurs sont toujours là, Prism !',
        'b3': 'Alors fais-moi scintiller encore. En duel !',
        't1': 'Regarde-moi ! Toutes mes couleurs sont revenues !',
        't2': 'Merci, Aurora. Toi aussi, tu es éblouissante !'
      }
    },
    'c7': {
      'n1': {
        'b1': 'Le temps s’est arrêté dans les cascades de sable.',
        'b2': 'J’aime quand rien ne change.',
        'b3': 'Ember, faisons couler le sable à nouveau !'
      },
      'n5': {
        'b1': 'Je dois tenir le sablier. Toute seule !',
        'b2': 'Pas besoin de le faire toute seule !',
        'b3': 'Alors montre-moi ton feu. En duel !',
        't1': 'Le sable coule de nouveau. Je peux me reposer !',
        't2': 'Merci, Aurora. C’était si gentil.'
      }
    },
    'c8': {
      'n1': {
        'b1': 'Les aurores boréales sont prisonnières de la glace !',
        'b2': 'Les endroits froids sont... un peu solitaires.',
        'b3': 'Glace, libérons le ciel !'
      },
      'n5': {
        'b1': 'Reste en arrière. Je préfère garder mes distances.',
        'b2': 'Les amis peuvent se tenir chaud !',
        'b3': 'Hmph. Réchauffe-moi, alors. En duel.',
        't1': 'Les aurores dansent à nouveau. Comme c’est joli.',
        't2': 'Merci, Aurora. Passe me voir un de ces jours.'
      }
    },
    'c9': {
      'n1': {
        'b1': 'Toutes les étoiles se sont éteintes !',
        'b2': 'Une lumière éteinte, ça manquerait à quelqu’un ?',
        'b3': 'Chaque lumière compte. Rallumons-les !'
      },
      'n5': {
        'b1': 'Je suis trop pâle pour briller encore.',
        'b2': 'Je crois en toi, Nova !',
        'b3': 'Alors aide-moi à trouver mon étincelle. En duel !',
        't1': 'Je brille ! Toutes les étoiles brillent !',
        't2': 'Merci, Aurora. Tu as éclairé mon chemin.'
      }
    },
    'c10': {
      'n1': {
        'b1': 'Tout le monde prépare une fête pour Umbra !',
        'b2': 'Une fête ? Je n’en ai pas besoin.',
        'b3': 'Tout le monde a besoin d’amis. Même toi, Umbra !'
      },
      'n2': {
        'b1': 'Les bois ont envoyé des fleurs pour la fête !',
        'b2': 'Et les grottes, des lanternes de cristal !'
      },
      'n3': {
        'b1': 'On va chanter une chanson de bienvenue !',
        'b2': 'Bienvenue ! Bienvenue !'
      },
      'n4': {
        'b1': 'Je vais peindre le ciel rien que pour elle !',
        'b2': 'Toutes les étoiles brilleront ce soir !'
      },
      'n5': {
        'b1': 'Pourquoi vous ne me laissez pas tranquille ?',
        'b2': 'Parce qu’on te veut avec nous, Umbra !',
        'b3': 'D’accord. Mais je ne vais pas me laisser faire !',
        't1': 'Vous... voulez vraiment de moi à la fête ?',
        't2': 'Bien sûr ! Tu es notre amie, Umbra !',
        't3': 'Personne ne m’avait jamais invitée.',
        't4': 'Alors allons-y ! Que la fête commence !'
      }
    },
    'tmpl': {
      'curious': '{name} pointe son nez avec curiosité !',
      'dusty': 'Oh, il y a un peu de poussière sur {name}.',
      'cheerUp': 'Redonnons le sourire à {name} ensemble !',
      'almost': 'Presque fini — {name} t’encourage !'
    }
  },

  'finale': {
    'line': 'Umbra n’est plus seule.',
    'umbra1': 'Salut, Aurora ! Merci d’être mon amie.',
    'umbra2': 'Cet endroit est si joli maintenant !',
    'umbra3': 'Un petit duel pour s’amuser, un de ces jours ?'
  },
  'versus': {
    'play': 'Jouer ensemble',
    'player1': 'Joueur 1',
    'player2': 'Joueur 2',
    'ready': 'Prêt !',
    'turnSideways': 'Tourne ton appareil sur le côté pour jouer ensemble !',
    'greatDuel': 'Quel duel !',
    'castKey2': '[Entrée] Lancer'
  },

  'preview': {
    'vs': 'VS',
    'yourRunes': 'VOS RUNES',
    'weakTo': 'FAIBLE CONTRE',
    'magic': 'MAGIE',
    'epithet': {
      'aurora': 'Gardienne des Runes',
      'umbra': 'La Princesse de Poussière',
      'shadow': 'L’Ombre d’Umbra',
      'guardian': 'Gardienne de {place}'
    },
    'aria': '{hero} contre {foe}. Le duel commence dans un instant.'
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
    'acornCap': 'Chapeau de gland',
    'bubbleTrail': 'Traînée de bulles',
    'petCloud': 'Nuage compagnon',
    'explorerGoggles': 'Lunettes d\'explorateur',
    'petFirefly': 'Luciole compagnon',
    'butterflyWings': 'Ailes de papillon',
    'explorerPack': 'Sac d\'explorateur',
    'frostTrail': 'Traînée de givre',
    'moonlitLook': 'Allure lunaire',
    'starTiara': 'Diadème étoile',
    'bowTie': 'Nœud papillon',
    'moonPendant': 'Pendentif lune',
    'petalTrail': 'Traînée de pétales',
    'sunsetLook': 'Allure crépusculaire',
    'versusMode': 'Duo de l’amitié'
  },

  // The wardrobe's slot tabs — a PLACE on her, not a category.
  'slot': {
    'head': 'Tête',
    'neck': 'Cou',
    'back': 'Dos',
    'companion': 'Ami',
    'trail': 'Traînée',
    'mane': 'Crinière',
    'skin': 'Pelage'
  },

  'wardrobe': {
    'unlock': 'Débloquer',
    'getIt': 'Prendre',
    'unlockAria': 'Regarde une vidéo pour débloquer {name}',
    'getItAria': 'Prendre {name}',
    'noVideo': 'Vidéo pas encore prête',
    'tryOn': 'Essayer {name}'
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

  'daily': {
    'open': 'Ouvre le cadeau du jour',
    'stickerToast': 'Un nouvel ami pour ton album !'
  },

  'album': {
    'title': 'Album d’autocollants',
    'hint': 'Touche une créature dans un endroit qui a refleuri : son autocollant rejoint l’album.',
    'count': '{met} sur {total} trouvés',
    'chapter': 'Chapitre {n}',
    'found': 'Autocollant trouvé',
    'friend': 'Un ami sauvé',
    'dressTab': 'Habillage',
    'albumTab': 'Album d’autocollants'
  },

  'photo': {
    'title': 'Cartes photo',
    'take': 'Prendre une photo',
    'card': 'Carte photo {n}',
    'empty': 'Une carte photo vide',
    'fullHint': 'L’album garde {n} cartes. Une nouvelle photo prend la place de la plus ancienne.'
  },

  'duel': {
    'almostRune': 'PRESQUE {rune} !',
    'tryRune': 'Essaie la rune {rune} !',
    'comingSoon': 'BIENTÔT',
    'lockedRune': 'La rune {rune} arrive bientôt',
    'newRuneGuide': 'Nouvelle rune : {rune} !',
    'great': 'Bravo !'
  },

  'license': {
    'denied': 'Accès refusé : veuillez acheter une licence.'
  },

  'help': {
    'auroraLine': 'Viens — je la dessine avec toi !',
    'perfectRune': 'Joliment dessinée !'
  }
}
