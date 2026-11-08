# SchoolCraft

Application web (PWA) ludo-éducative pour enfants de 4 à 7 ans (de la moyenne section au CP), dans un
univers « blocs / pixels » inspiré des jeux de construction type bac à sable (univers et personnages originaux).
Objectif : un vrai complément à l'école pour **lire**, **écrire** et **compter**, aligné sur les programmes 2025,
avec une progression pas à pas et des récompenses à collectionner.

- Étude pédagogique (recherche, applications de référence, choix du jeu) : [docs/ETUDE.md](docs/ETUDE.md)
- Plan de conception et feuille de route : [docs/PLAN.md](docs/PLAN.md)

## Ce que contient le jeu

- **L'aventure du jour** : une partie de Lire, d'Écrire et de Compter (une dizaine de minutes), puis un coffre
  de blocs spéciaux (briques, feuilles, fleurs, cristal) pour la maison. Pas de série à ne pas casser.
- **Une carte par activité** : les niveaux en chemin, groupés en chapitres, avec des étoiles ; le niveau en cours brille.
- **Lire** : 31 niveaux en 7 chapitres (contenu : `src/content/reading.ts`)
  1. *La prairie des sons* (conscience phonologique) : taper les syllabes sur un tambour, les rimes, le premier son
  2. *La forêt des lettres* : voyelles, grandes et petites lettres, premières syllabes, nouvelles consonnes, syllabes qui se ressemblent
  3. *La mine des mots* : écrire des syllabes avec des lettres (encodage), écouter des mots, construire des mots, lire sans aide, écrire des mots
  4. *La montagne des sons* : sons à deux lettres (ou, on, an, in, oi, ch, eu), syllabes et mots difficiles
  5. *Le château des phrases* : vrai ou faux ?, devinettes
- **Écrire** : 12 niveaux (contenu : `src/content/writing.ts`). Pixel montre le tracé en disant la lettre et un mot repère,
  puis l'enfant trace au doigt en suivant le chemin, dans le bon sens ; la lettre réussie se construit en blocs.
  Capitales (traits droits, traits penchés, ronds), chiffres, puis cursive par familles de gestes (ronds, coupes,
  ponts, boucles, jambages, lettres spéciales) et enfin « sans modèle ».
- **Compter** : 16 niveaux en 4 chapitres (contenu : `src/content/counting.ts`) : compter en touchant, le plus grand tas,
  coup d'œil (dés, cadre de dix), **la course des nombres** (plateau en ligne de 1 à 10 puis 20, on joue contre Pixel),
  **la grotte** (combien de blocs sont cachés ?), le plus grand nombre, additions, **faire dix**, petits problèmes racontés,
  **dix et encore** (11 à 20).
- **Révisions** : les éléments ratés reviennent plus souvent (répétition espacée), et chaque partie glisse une question
  d'un niveau déjà joué. Un niveau se débloque avec 80 % de réussite du premier coup.
- **Mes héros** (récompense principale) : chaque bonne réponse rapporte un bloc (3 d'affilée = bloc d'or).
  Les blocs servent à colorier des héros en pixel-art (une couleur = un chiffre, chaque couleur coûte un bloc).
  Un héros terminé se réveille (animation, phrase, effet) et rejoint la collection. 12 héros originaux dans `src/content/heroes.ts`.
- **Ma maison** : construction libre avec les blocs gagnés ; toucher un bloc posé le reprend, « Tout ranger » rend tous les blocs.
- **Pixel le renard** guide tout à la voix et félicite l'effort ; le toucher (ou le haut-parleur) répète la consigne.
- **Plusieurs enfants** : jusqu'à 4 profils, chacun avec son avatar et sa progression (« Qui joue ? » à l'accueil).
- **Espace parents** (protégé par une multiplication) : classe de l'enfant (MS, GS, CP) pour démarrer au bon niveau,
  temps de jeu de la semaine, progrès par compétence, idées d'activités à faire ensemble sans écran, la méthode,
  limite de temps (pause automatique), tout effacer.
- Sauvegarde sur l'appareil uniquement (aucun compte, aucun serveur, pas de pub, pas de micro).
- Installable sur téléphone (« Ajouter à l'écran d'accueil »), fonctionne hors ligne,
  s'adapte au téléphone (portrait ou paysage), à la tablette et à l'ordinateur.

## Lancer en local

```bash
npm install
npm run dev        # http://localhost:5173 (et sur le réseau local, pour tester sur téléphone)
npm run check      # vérifie le contenu (héros, mots, niveaux, tracés) : Node 22.6 ou plus
npm run build      # version de production dans dist/
```

## Mise en ligne

Le workflow `.github/workflows/deploy.yml` vérifie le contenu, construit le site et le publie sur
GitHub Pages à chaque push sur `main`. À activer une fois : *Settings → Pages → Source : GitHub Actions*.

## Ajouter un héros ou des mots

- **Héros** : dans `src/content/heroes.ts`, copier un héros et redessiner ses 14 lignes de 12 cases
  (`.` vide, `k` contour, `e` yeux, une lettre par couleur, 6 couleurs au plus).
- **Mots** : dans `src/content/reading.ts`, écrire le mot découpé en syllabes (`ba-teau`) et,
  pour les niveaux « lire », ajouter une image. Pour les jeux de sons (syllabes, rimes, premier son), ajouter
  une image à `PIC_WORDS` avec ses syllabes orales, son groupe de rime et son premier son.
- **Lettres à tracer** : dans `src/content/writing.ts`, chaque trait est un chemin SVG dans une boîte de 100 de haut,
  dans l'ordre et le sens où on l'écrit.
- Lancer `npm run check` : chaque erreur est expliquée en français (ligne trop longue, couleur manquante…).

## Règles pour les phrases dites par la voix

- Ne jamais placer un son ou un mot qui commence par une voyelle après un mot qui fait une liaison
  (« dans », « les », « c'est », « des », « plus »…) : la voix dirait « dans-z-école ».
  On écrit « comme école », et les consignes mettent « : » avant l'élément (« Touche le mot : avion »).
  `npm run check` signale les exemples fautifs.
- Éviter « tes héros », « les héros » (certaines voix disent « tes-z-héros ») : dire « tes amis ».

## Limites connues

- La voix de Pixel est enregistrée (environ 2 500 phrases créées avec ElevenLabs, voix « Adina ») et marche hors ligne ; une phrase non enregistrée est dite par la voix de l'appareil. Après avoir changé une phrase : `scripts/voice/lines.ts` puis `scripts/voice/generate.mjs`.
  À terme : enregistrer les sons pour une prononciation parfaite des sons isolés.
- Les images des niveaux « lire » sont des emojis : leur dessin varie selon le téléphone.
- Le tracé au doigt entraîne le geste et la forme des lettres ; il ne remplace pas le crayon sur papier.
- Pas de reconnaissance de la parole : quand Pixel demande de répéter, rien n'est vérifié (et la voix de l'enfant
  ne quitte jamais l'appareil).
