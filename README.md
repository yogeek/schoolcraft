# SchoolCraft

Application web (PWA) ludo-éducative pour enfants de 4 à 6 ans, dans un univers
« blocs / pixels » inspiré des jeux de construction type bac à sable (univers et personnages originaux).
Objectif : apprendre les bases de la lecture (sons → syllabes → mots) et du calcul
(compter, coup d'œil, additions), avec des récompenses à collectionner.

Plan de conception et feuille de route : [docs/PLAN.md](docs/PLAN.md)

## Ce que contient le jeu

- **Lire** — 12 niveaux, des voyelles jusqu'à la lecture en autonomie (contenu : `src/content/reading.ts`) :
  1. Les voyelles · 2. Grandes et petites lettres · 3. Premières syllabes (m, l, r, s)
  4. Nouvelles consonnes · 5. Syllabes jumelles (b/d, m/n…) · 6. Écouter des mots
  7. Construire des mots (poser les syllabes dans l'ordre) · 8. Sons à deux lettres (ou, on, an, in, oi, ch, eu)
  9. Syllabes à deux lettres · 10. Écouter des mots difficiles
  11. Lire sans aide (le mot est écrit, on touche la bonne image) · 12. Lire des mots difficiles
- **Compter** — 6 niveaux (contenu : `src/content/counting.ts`) : compter jusqu'à 4, 6, 10
  (on touche chaque bloc, la voix compte) → coup d'œil (les blocs se cachent après 2 s)
  → petites puis grandes additions.
- **Niveaux** — une partie réussie à 80 % du premier coup débloque le niveau suivant.
  Le bouton « Niveau N » permet de revenir à un niveau déjà atteint. Les sons et nombres ratés
  reviennent plus souvent (répétition espacée).
- **Mes héros** (récompense principale) — chaque bonne réponse rapporte un bloc (3 d'affilée = bloc d'or).
  Les blocs servent à colorier des héros en pixel-art (coloriage magique : une couleur = un chiffre,
  chaque couleur coûte un bloc). Un héros terminé se réveille (animation, phrase, effet) et rejoint
  la collection. 12 héros originaux dessinés dans `src/content/heroes.ts`.
- **Ma maison** — construction libre avec les blocs gagnés ; toucher un bloc posé le reprend,
  « Tout ranger » rend tous les blocs.
- **Pixel le renard** guide tout à la voix ; le toucher (ou le haut-parleur) répète la consigne.
- **Espace parents** (protégé par une multiplication) : choisir directement un niveau, voir ce qui est
  acquis / en cours / à revoir, limiter le temps de jeu (pause automatique), tout effacer.
- Sauvegarde sur l'appareil uniquement (aucun compte, aucun serveur, pas de pub).
- Installable sur téléphone (« Ajouter à l'écran d'accueil »), fonctionne hors ligne,
  s'adapte au téléphone (portrait ou paysage), à la tablette et à l'ordinateur.

## Lancer en local

```bash
npm install
npm run dev        # http://localhost:5173 (et sur le réseau local, pour tester sur téléphone)
npm run check      # vérifie le contenu (héros, mots, niveaux) — Node 22.6 ou plus
npm run build      # version de production dans dist/
```

## Mise en ligne

Le workflow `.github/workflows/deploy.yml` vérifie le contenu, construit le site et le publie sur
GitHub Pages à chaque push sur `main`. À activer une fois : *Settings → Pages → Source : GitHub Actions*.

## Ajouter un héros ou des mots

- **Héros** : dans `src/content/heroes.ts`, copier un héros et redessiner ses 14 lignes de 12 cases
  (`.` vide, `k` contour, `e` yeux, une lettre par couleur, 6 couleurs au plus).
- **Mots** : dans `src/content/reading.ts`, écrire le mot découpé en syllabes (`ba-teau`) et,
  pour les niveaux « lire », ajouter une image.
- Lancer `npm run check` : chaque erreur est expliquée en français (ligne trop longue, couleur manquante…).

## Règles pour les phrases dites par la voix

- Ne jamais placer un son ou un mot qui commence par une voyelle après un mot qui fait une liaison
  (« dans », « les », « c'est », « des », « plus »…) : la voix dirait « dans-z-école ».
  On écrit « comme école », et les consignes mettent « : » avant l'élément (« Touche le mot : avion »).
  `npm run check` signale les exemples fautifs.
- Éviter « tes héros », « les héros » (certaines voix disent « tes-z-héros ») : dire « tes amis ».

## Limites connues

- La voix dépend du navigateur et de l'appareil (meilleure sur Chrome/Android et Safari/iOS récents).
  À terme : enregistrer les sons pour une prononciation parfaite des sons isolés.
- Les images des niveaux « lire » sont des emojis : leur dessin varie selon le téléphone.
