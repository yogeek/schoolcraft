# SchoolCraft — Plan de conception

## État actuel (novembre 2026, v3)

L'étude pédagogique qui fonde la v3 (recherche, programmes 2025, applications de référence) est dans
[ETUDE.md](ETUDE.md).

| Prévu | Où on en est |
|---|---|
| Tout à la voix, pas d'échec punitif, grosses cibles | ✅ Voix partout, félicitations sur l'effort, toucher tolérant |
| Conscience phonologique | ✅ Syllabes au tambour, rimes, premier son (images nommées par la voix) |
| Lecture : sons → syllabes → mots → phrases | ✅ 19 niveaux en 5 chapitres, encodage (écrire avec des lettres), vrai ou faux, devinettes |
| Écriture | ✅ Tracé au doigt : capitales, chiffres, cursive par familles de gestes, « sans modèle » |
| Maths | ✅ 16 niveaux : compter, comparer, coup d'œil (dés, cadre de dix), course des nombres, grotte (décomposer), faire dix, additions, problèmes, 11 à 20 |
| Révisions espacées, niveaux qui se débloquent | ✅ Leitner à 3 boîtes, une question de révision par partie, niveau suivant à 80 % |
| Progression visible | ✅ Une carte par activité (chapitres, étoiles) |
| Régularité sans pression | ✅ L'aventure du jour et son coffre de blocs spéciaux |
| Récompenses | ✅ Coloriage de 12 héros originaux, maison en blocs, blocs spéciaux |
| Espace parents | ✅ Classe (MS, GS, CP), semaine, progrès par compétence, idées à faire ensemble, méthode, limite de temps |
| Profils multiples | ✅ Jusqu'à 4 enfants, avatar et progression séparés |
| PWA hors ligne, GitHub Pages | ✅ |
| Sons enregistrés, mots en cursive attachée | ⏳ Prochaines étapes (voir la feuille de route) |

Ce qui suit est le plan initial ; la feuille de route (§ 7) est à jour.

## 1. Principe : « J'apprends → je gagne des blocs → je construis »

La boucle de jeu tient en une phrase : chaque exercice réussi rapporte des
**blocs** (bois, pierre, verre, or…) et des **gemmes**. Les blocs servent à
construire son propre petit monde ; les gemmes débloquent des mini-jeux.
L'enfant voit sa progression *physiquement* : sa maison grandit.

Contraintes liées à l'âge (4–6 ans) :
- **Ne sait pas lire les consignes** → tout est **audio** (voix qui explique,
  qui félicite, qui prononce les sons). Aucune consigne écrite indispensable.
- **Doigts imprécis** → grosses cibles tactiles (≥ 64 px), glisser-déposer
  tolérant, pas de double-clic.
- **Attention courte** → exercices de 1–2 min, séances de 10–15 min,
  minuteur parental.
- **Pas d'échec punitif** → une erreur = « Essaie encore ! » + indice, jamais
  de perte de blocs.

## 2. Univers (original, *inspiré* de Minecraft — pas copié)

On ne réutilise **ni le nom, ni les personnages, ni les textures, ni les sons**
de Minecraft (droits de Mojang/Microsoft). On crée un univers propre :
- Style pixel-art en blocs, couleurs vives.
- Mascotte originale : p. ex. **« Pixel », un petit renard en blocs**, qui guide
  l'enfant.
- Des « biomes » = des chapitres : la Prairie (voyelles), la Forêt (premières
  consonnes), la Mine (syllabes), la Montagne (mots), le Village (chiffres).
- Les « monstres » sont gentils : les **Mélangeurs** qui ont mélangé les
  lettres ; on les « répare » en répondant juste.

## 3. Contenu pédagogique

Approche **syllabique** (alignée avec ce qui se fait en GS/CP en France) :
on apprend le **son** de la lettre (« mmm ») avant son nom (« èm »).

### Lecture — progression
| Étape | Notion | Exemples d'activités |
|---|---|---|
| 1 | Voyelles : a, i, o, u, e, é | « Touche le bloc qui fait *aaa* » |
| 2 | Consonnes « qui chantent » : l, m, r, s, f, ch, v, n | Associer son ↔ lettre, retrouver la lettre dans un mur de blocs |
| 3 | Majuscule ↔ minuscule ↔ cursive | Relier les paires (wagonnets) |
| 4 | Fusion C+V : *ma, li, ro, su* | Coller le bloc « m » au bloc « a » → la voix dit « mmm… a… **ma** » |
| 5 | Syllabes inverses / plus de consonnes (p, t, b, d, k…) | Mine : casser le bon minerai-syllabe |
| 6 | Mots de 2 syllabes : *moto, lama, vélo* | Assembler les syllabes pour construire l'objet (image) |
| 7 | Mini-phrases : *le lama a un vélo* | Lire et choisir la bonne image |

Bonus conscience phonologique (avant même les lettres) : compter les syllabes
d'un mot en tapant sur des blocs, trouver « le mot qui commence par *sss* ».

### Maths — progression
- Comptine numérique 1 → 10, puis 20.
- **Dénombrer** : « Mets 4 blocs dans le coffre ».
- **Reconnaître** les chiffres écrits, associer chiffre ↔ quantité.
- Reconnaissance instantanée (dés, doigts) jusqu'à 6.
- Comparer : « Quel tas a le plus de pommes ? »
- Premières additions concrètes : 2 blocs + 1 bloc.

### Moteur d'apprentissage
- **Difficulté adaptative** : 3 réussites d'affilée → on monte ; 2 erreurs →
  on redescend / on donne un indice.
- **Révisions espacées** : une lettre ratée revient plus souvent
  (Leitner simplifié, 3 boîtes).
- Une notion est « maîtrisée » à ~80 % de réussite sur les 10 derniers essais.

## 4. Mini-jeux de récompense
1. **Mode construction** (le cœur) : poser les blocs gagnés sur une grille 2D
   (vue de côté) pour bâtir maison, ferme, château. Sauvegardé.
2. **Course dans la mine** : runner simple, on saute avec un tap, on ramasse
   des gemmes.
3. **La ferme** : planter des graines, elles poussent entre deux séances
   (incite à revenir… avec modération).
4. **Mémory de blocs** — qui fait aussi travailler la mémoire visuelle.

Règle : un mini-jeu dure ~2 min et coûte des gemmes, pour que l'apprentissage
reste l'activité principale.

## 5. Espace parents (protégé par un petit calcul « 7 × 8 = ? »)
- Progression par notion (lettres connues, syllabes, nombres).
- Durée de séance max, pause obligatoire.
- Choix de la voix de l'appareil (avec un bouton pour l'écouter), prénom et avatar de chaque enfant.

## 6. Choix techniques

| Besoin | Choix | Pourquoi |
|---|---|---|
| Téléphone + ordinateur, sans store | **PWA** (Progressive Web App) | Installable sur l'écran d'accueil, fonctionne **hors-ligne**, une seule base de code |
| Code | **TypeScript + Vite** | Simple, rapide, typé |
| Jeux / animations | **Phaser 3** (moteur 2D) ou Canvas + DOM pour les exercices simples | Gère sprites, tactile, sons, scènes |
| Graphismes | Pixel-art original (Aseprite / Piskel, ou générés puis retouchés) en sprites 16×16 agrandis | Look « blocs » léger |
| Voix | **Enregistrements audio** (voix d'un parent, ou TTS de qualité généré une fois en fichiers mp3/ogg) | La synthèse vocale du navigateur prononce mal les sons isolés (« mmm ») |
| Sauvegarde | **IndexedDB / localStorage** sur l'appareil | Pas de compte, pas de données d'enfant sur un serveur (RGPD) |
| Hébergement | **GitHub Pages** ou Cloudflare Pages | Gratuit, HTTPS (requis pour PWA), déploiement auto via GitHub Actions |
| Plus tard (option) | Synchro multi-appareils (Supabase/Firebase) ; app stores via **Capacitor** | Seulement si besoin |

Pas de pub, pas d'achats intégrés, pas de traqueurs.

## 7. Feuille de route

**Fait**
- Prototype puis MVP : PWA installable et hors ligne, Pixel le renard, voix, blocs à gagner.
- v2 : lecture en 12 niveaux, calcul en 6 niveaux, répétition espacée, coloriage de héros, maison, espace parents.
- v3 (étude dans `ETUDE.md`) : activité Écrire (tracé au doigt), phonologie, encodage, phrases et devinettes,
  10 nouveaux niveaux de calcul (dont la course des nombres et la grotte), moteur de partie commun avec révision,
  cartes par chapitres et étoiles, aventure du jour et coffre, profils, espace parents enrichi.
- Voix enregistrée : toutes les phrases du jeu (environ 2 500) générées une fois avec ElevenLabs (modèle v4,
  voix « Adina »), vérifiées par reconnaissance vocale, jouées hors ligne ; la voix de l'appareil reste en secours.

**Prochaines étapes possibles**
- Faire écouter les sons isolés (« mmm », « sss ») et les syllabes par un adulte, et réenregistrer ceux qui sonnent faux.
- Écrire des syllabes et des mots en cursive attachée (lettres reliées).
- Lecture : lettres muettes, sons é/è/ai, petites histoires à lire avec questions de compréhension, fluence (lire vite et bien).
- Calcul : nombres jusqu'à 100 (dizaines), soustractions par complément, doubles.
- Mesurer avec des familles : un court test au début et après quelques semaines, pour vérifier l'effet.

## 8. Structure du projet
```
src/
  content/     # contenu modifiable sans programmer : lecture, écriture (tracés), calcul, héros, idées parents
  games/       # types de jeux : reading.ts, counting.ts, trace.ts (tracé au doigt)
  screens/     # écrans : accueil, carte, activité, récompense, coffre, héros/coloriage, maison, parents, profils
  game.ts      # moteur de partie commun (questions, blocs, félicitations, révision, fin de partie)
  state.ts     # sauvegarde sur l'appareil (profils, réparation et migration des anciennes sauvegardes)
  levels.ts    # niveaux, chapitres, étoiles, classe · playtime.ts : limite de temps
  nav.ts       # changement d'écran (la voix s'arrête quand on quitte un écran)
  audio.ts     # voix et petits sons · ui.ts : boutons, bulles, toucher fiable
scripts/check-content.ts   # vérifie le contenu (npm run check)
public/      # icônes, manifeste
```
Le contenu (listes de syllabes, mots, images, tracés) est séparé du code : on peut
ajouter des mots ou des lettres sans programmer.
