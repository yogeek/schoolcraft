// Contenu pédagogique du calcul : niveaux de « Compter ».
// Même règle pour la voix que pour la lecture : pas de mot à liaison juste avant un nombre
// qui commence par une voyelle (« un », « huit »…).

export const NUMBER_WORDS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix'];

export interface CountLevel {
  name: string;
  /** consigne dite au début du niveau */
  intro: string;
  /** count : toucher pour compter · flash : les blocs se cachent · add : deux tas à additionner */
  mode: 'count' | 'flash' | 'add';
  /** plus petit et plus grand nombre à trouver */
  min: number;
  max: number;
  /** nombre de réponses proposées */
  choices: number;
}

export const COUNT_LEVELS: CountLevel[] = [
  { name: "Compter jusqu'à 4", intro: 'Touche chaque bloc pour le compter, puis choisis le bon nombre.', mode: 'count', min: 1, max: 4, choices: 3 },
  { name: "Compter jusqu'à 6", intro: 'Encore plus de blocs ! Compte-les bien.', mode: 'count', min: 1, max: 6, choices: 3 },
  { name: "Compter jusqu'à 10", intro: "Maintenant, on compte jusqu'à dix !", mode: 'count', min: 3, max: 10, choices: 4 },
  { name: "Coup d'œil", intro: 'Regarde bien les blocs : ils vont se cacher !', mode: 'flash', min: 1, max: 6, choices: 4 },
  { name: 'Petites additions', intro: 'On met deux tas de blocs ensemble. Combien ça fait ?', mode: 'add', min: 2, max: 6, choices: 3 },
  { name: 'Grandes additions', intro: 'Des additions plus grandes, pour aller encore plus loin !', mode: 'add', min: 4, max: 10, choices: 4 },
];

/** Dés : position des blocs sur une grille 3 × 3. */
export const DICE: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};
