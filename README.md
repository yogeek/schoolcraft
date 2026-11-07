# SchoolCraft

Application web (PWA) ludo-éducative pour enfants de 4 à 6 ans, dans un univers
« blocs / pixels » inspiré des jeux de construction type bac à sable.
Objectif : apprendre les bases de la lecture (lettres → sons → syllabes → mots)
et du calcul (compter, dénombrer, comparer), avec des mini-jeux en récompense.

Plan détaillé : [docs/PLAN.md](docs/PLAN.md)

## Prototype (v0.1)

- **Les sons** — Pixel le renard dit un son ; l'enfant touche le bon bloc. Les sons ratés reviennent plus souvent.
  6 niveaux : voyelles → majuscules/minuscules → syllabes (m, l, r, s) → autres consonnes
  → syllabes jumelles (b/d, m/n…) → lire des mots.
- **Compter** — 6 niveaux : compter jusqu'à 4, 6, 10 (on touche chaque bloc, la voix compte)
  → coup d'œil (les blocs se cachent après 2 s) → additions jusqu'à 6, puis 10.
- **Niveaux** — une partie réussie à 80 % du premier coup débloque le niveau suivant.
  Le bouton « Niveau N » permet de revenir à un niveau déjà atteint.
- **Construire** — chaque bonne réponse rapporte un bloc (3 réussites d'affilée = bloc d'or) ;
  on les pose sur une grille pour bâtir sa maison. Toucher un bloc posé le récupère.
- Tout est guidé à la voix (synthèse vocale du navigateur, en français).
- Sauvegarde sur l'appareil uniquement (localStorage). Bouton « Parents » (calcul) pour tout effacer.
- Installable sur téléphone (« Ajouter à l'écran d'accueil ») et utilisable hors-ligne.

## Lancer en local

```bash
npm install
npm run dev        # http://localhost:5173 (et sur le réseau local, pour tester sur téléphone)
npm run build      # version de production dans dist/
```

## Mise en ligne

Le workflow `.github/workflows/deploy.yml` publie le site sur GitHub Pages à chaque push sur `main`.
À activer une fois : *Settings → Pages → Source : GitHub Actions*.

## Limites connues du prototype

- La voix dépend du navigateur/appareil (meilleure sur Chrome/Android et Safari/iOS récents).
  À terme : enregistrer les sons pour une prononciation parfaite des sons isolés.
- Pas encore d'exercice de fusion où l'on assemble soi-même « m + a = ma ».
