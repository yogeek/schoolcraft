// Contenu pédagogique du calcul : niveaux de « Compter ».
// Même règle pour la voix que pour la lecture : pas de mot à liaison juste avant un nombre
// qui commence par une voyelle (« un », « huit », « onze »…).

export const NUMBER_WORDS = [
  'zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix',
  'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf', 'vingt',
];

export type CountMode =
  /** toucher chaque bloc pour le compter, puis choisir le nombre */
  | 'count'
  /** coup d'œil : des blocs rangés comme sur un dé se cachent */
  | 'flash'
  /** coup d'œil sur un cadre de dix (cinq et encore) */
  | 'frame'
  /** deux tas : lequel en a le plus (ou le moins) ? */
  | 'compare'
  /** deux nombres écrits : lequel est le plus grand ? */
  | 'digits'
  /** jeu de plateau linéaire : on lance le dé, on touche la case d'arrivée */
  | 'race'
  /** la grotte : combien de blocs sont cachés ? (décomposer) */
  | 'hide'
  /** cadre de dix : combien en manque-t-il pour faire dix ? */
  | 'make10'
  /** deux tas à additionner */
  | 'add'
  /** petits problèmes racontés (ajouter, enlever) */
  | 'problem'
  /** une tour de dix et des blocs seuls : 11 à 20 */
  | 'tens';

export interface CountLevel {
  name: string;
  /** consigne dite au début du niveau */
  intro: string;
  mode: CountMode;
  /** plus petit et plus grand nombre en jeu (pour la course : la dernière case) */
  min: number;
  max: number;
  /** nombre de réponses proposées (0 : on répond autrement) */
  choices: number;
  /** chapitre de la carte */
  chapter: number;
  /** course : plus grande face du dé */
  die?: number;
  /** problèmes : aussi des soustractions */
  sub?: boolean;
}

export const COUNT_CHAPTERS = ['Les petits nombres', "Jusqu'à dix", 'Calculer', "Jusqu'à vingt"];

export const COUNT_LEVELS: CountLevel[] = [
  // 1. les petits nombres (MS)
  { chapter: 0, name: "Compter jusqu'à 4", intro: 'Touche chaque bloc pour le compter, puis choisis le bon nombre.', mode: 'count', min: 1, max: 4, choices: 3 },
  { chapter: 0, name: "Compter jusqu'à 6", intro: 'Encore plus de blocs ! Compte-les bien.', mode: 'count', min: 1, max: 6, choices: 3 },
  { chapter: 0, name: 'Le plus grand tas', intro: 'Regarde bien les deux tas de blocs.', mode: 'compare', min: 1, max: 6, choices: 0 },
  { chapter: 0, name: "Coup d'œil", intro: 'Regarde bien les blocs : ils vont se cacher !', mode: 'flash', min: 1, max: 6, choices: 4 },
  // 2. jusqu'à dix (GS)
  { chapter: 1, name: "Compter jusqu'à 10", intro: "Maintenant, on compte jusqu'à dix !", mode: 'count', min: 3, max: 10, choices: 4 },
  { chapter: 1, name: 'La course des nombres', intro: 'On fait la course ! Lance le dé, et touche la case où tu arrives.', mode: 'race', min: 1, max: 10, choices: 0, die: 3 },
  { chapter: 1, name: "Coup d'œil jusqu'à 10", intro: 'Une rangée, c’est cinq. Regarde vite !', mode: 'frame', min: 3, max: 10, choices: 4 },
  { chapter: 1, name: 'La grotte', intro: 'Des blocs vont se cacher dans la grotte !', mode: 'hide', min: 3, max: 5, choices: 3 },
  { chapter: 1, name: 'Le plus grand nombre', intro: 'Maintenant, les nombres sont écrits !', mode: 'digits', min: 1, max: 10, choices: 0 },
  { chapter: 1, name: "La grotte jusqu'à 10", intro: 'Encore plus de blocs dans la grotte !', mode: 'hide', min: 6, max: 10, choices: 4 },
  // 3. calculer (GS, CP)
  { chapter: 2, name: 'Petites additions', intro: 'On met deux tas de blocs ensemble. Combien ça fait ?', mode: 'add', min: 2, max: 6, choices: 3 },
  { chapter: 2, name: 'Faire dix', intro: 'Il faut dix blocs pour remplir la boîte !', mode: 'make10', min: 4, max: 9, choices: 4 },
  { chapter: 2, name: 'Grandes additions', intro: 'Des additions plus grandes, pour aller encore plus loin !', mode: 'add', min: 4, max: 10, choices: 4 },
  { chapter: 2, name: 'Petits problèmes', intro: 'Écoute bien la petite histoire.', mode: 'problem', min: 2, max: 10, choices: 4, sub: true },
  // 4. jusqu'à vingt (CP)
  { chapter: 3, name: 'Dix et encore', intro: 'Les grands nombres, de onze à vingt !', mode: 'tens', min: 11, max: 20, choices: 4 },
  { chapter: 3, name: 'La grande course', intro: "La course jusqu'à vingt ! Lance le dé, et touche la case où tu arrives.", mode: 'race', min: 1, max: 20, choices: 0, die: 6 },
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

/** Objets des petits problèmes (noms qui commencent par une consonne : aucune liaison). */
export interface Thing {
  pic: string;
  /** singulier, avec l'article : « une pomme » */
  one: string;
  /** pluriel sans article : « pommes » */
  many: string;
  fem: boolean;
  /** ce qui en fait partir, {n} = le nombre : « Il en mange {n}. » */
  gone: string;
}

export const THINGS: Thing[] = [
  { pic: '🍎', one: 'une pomme', many: 'pommes', fem: true, gone: 'Il en mange {n}.' },
  { pic: '🍓', one: 'une fraise', many: 'fraises', fem: true, gone: 'Il en mange {n}.' },
  { pic: '🍬', one: 'un bonbon', many: 'bonbons', fem: false, gone: 'Il en donne {n}.' },
  { pic: '🎈', one: 'un ballon', many: 'ballons', fem: false, gone: 'Il en perd {n}.' },
  { pic: '🐟', one: 'un poisson', many: 'poissons', fem: false, gone: "Il en remet {n} dans l'eau." },
  { pic: '🌸', one: 'une fleur', many: 'fleurs', fem: true, gone: 'Il en donne {n}.' },
  { pic: '🥕', one: 'une carotte', many: 'carottes', fem: true, gone: 'Il en mange {n}.' },
];
