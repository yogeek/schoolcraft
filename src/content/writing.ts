// Contenu de l'activité « Écrire » : le tracé des lettres et des chiffres.
//
// Chaque tracé est une liste de traits (un trait = le doigt ne se lève pas), dans l'ordre et le
// sens où on les écrit. Coordonnées SVG dans une boîte de 100 de haut :
//   capitales et chiffres : du haut (y = 12) au bas (y = 88) ;
//   cursive : hampes en haut (y = 8), haut des lettres (y = 42), ligne d'écriture (y = 72),
//   jambages en bas (y = 96).
// Les familles suivent le geste (Zerbato-Poudou, documents académiques) : en cursive, les ronds,
// les coupes, les ponts, les boucles, les jambages, puis les lettres particulières.

export type Script = 'cap' | 'cur' | 'dig';

export interface Glyph {
  char: string;
  script: Script;
  /** largeur de la boîte */
  w: number;
  strokes: string[];
}

/** Nom de la lettre, écrit pour la voix, et un mot repère. */
export const LETTER_SPEECH: Record<string, { name: string; ex: string }> = {
  a: { name: 'a', ex: 'ananas' },
  b: { name: 'bé', ex: 'ballon' },
  c: { name: 'cé', ex: 'canard' },
  d: { name: 'dé', ex: 'dauphin' },
  e: { name: 'euh', ex: 'cheval' },
  f: { name: 'èfe', ex: 'fusée' },
  g: { name: 'jé', ex: 'gâteau' },
  h: { name: 'hache', ex: 'hibou' },
  i: { name: 'i', ex: 'souris' },
  j: { name: 'ji', ex: 'judo' },
  k: { name: 'ka', ex: 'kiwi' },
  l: { name: 'èle', ex: 'lune' },
  m: { name: 'ème', ex: 'moto' },
  n: { name: 'ène', ex: 'nuage' },
  o: { name: 'o', ex: 'orange' },
  p: { name: 'pé', ex: 'pomme' },
  q: { name: 'cu', ex: 'quatre' },
  r: { name: 'ère', ex: 'robot' },
  s: { name: 'èsse', ex: 'soleil' },
  t: { name: 'té', ex: 'tortue' },
  u: { name: 'u', ex: 'lune' },
  v: { name: 'vé', ex: 'vélo' },
  w: { name: 'double vé', ex: 'wagon' },
  x: { name: 'iks', ex: 'taxi' },
  y: { name: 'i grec', ex: 'yoyo' },
  z: { name: 'zède', ex: 'zèbre' },
};

const g = (script: Script, char: string, w: number, ...strokes: string[]): Glyph => ({ char, script, w, strokes });

// ---------------------------------------------------------------- capitales d'imprimerie
const CAPS: Glyph[] = [
  // les traits droits
  g('cap', 'I', 60, 'M30 12 V88'),
  g('cap', 'L', 70, 'M20 12 V88 H58'),
  g('cap', 'T', 80, 'M14 12 H66', 'M40 12 V88'),
  g('cap', 'E', 70, 'M20 12 V88', 'M20 12 H56', 'M20 50 H50', 'M20 88 H56'),
  g('cap', 'F', 70, 'M20 12 V88', 'M20 12 H56', 'M20 50 H50'),
  g('cap', 'H', 80, 'M18 12 V88', 'M62 12 V88', 'M18 50 H62'),
  // les traits penchés
  g('cap', 'A', 80, 'M40 12 L14 88', 'M40 12 L66 88', 'M24 60 H56'),
  g('cap', 'V', 80, 'M14 12 L40 88 L66 12'),
  g('cap', 'M', 84, 'M16 88 V12', 'M16 12 L42 62 L68 12 V88'),
  g('cap', 'N', 80, 'M18 88 V12', 'M18 12 L62 88 V12'),
  g('cap', 'W', 96, 'M10 12 L28 88 L48 34 L68 88 L86 12'),
  g('cap', 'X', 80, 'M16 12 L64 88', 'M64 12 L16 88'),
  g('cap', 'Z', 80, 'M16 12 H64 L16 88 H64'),
  g('cap', 'K', 76, 'M18 12 V88', 'M60 12 L18 54 L60 88'),
  g('cap', 'Y', 80, 'M14 12 L40 50', 'M66 12 L40 50 V88'),
  // les ronds
  g('cap', 'O', 84, 'M42 12 C25 12 14 29 14 50 C14 71 25 88 42 88 C59 88 70 71 70 50 C70 29 59 12 42 12'),
  g('cap', 'C', 80, 'M64 24 C58 16 50 12 42 12 C25 12 14 29 14 50 C14 71 25 88 42 88 C50 88 58 84 64 76'),
  g('cap', 'G', 84, 'M64 24 C58 16 50 12 42 12 C25 12 14 29 14 50 C14 71 25 88 42 88 C57 88 68 78 68 62 V56 H48'),
  g('cap', 'Q', 84, 'M42 12 C25 12 14 29 14 50 C14 71 25 88 42 88 C59 88 70 71 70 50 C70 29 59 12 42 12', 'M48 66 L70 92'),
  g('cap', 'U', 80, 'M16 12 V60 C16 77 26 88 40 88 C54 88 64 77 64 60 V12'),
  g('cap', 'J', 70, 'M54 12 V64 C54 80 46 88 34 88 C24 88 16 82 14 72'),
  g('cap', 'S', 76, 'M60 22 C55 15 47 12 38 12 C25 12 17 20 17 31 C17 43 28 47 38 50 C50 53 61 57 61 69 C61 81 51 88 38 88 C27 88 18 83 14 76'),
  g('cap', 'D', 80, 'M18 12 V88', 'M18 12 H32 C53 12 66 28 66 50 C66 72 53 88 32 88 H18'),
  g('cap', 'P', 72, 'M18 12 V88', 'M18 12 H40 C55 12 62 21 62 32 C62 43 55 52 40 52 H18'),
  g('cap', 'B', 74, 'M18 12 V88', 'M18 12 H38 C52 12 58 20 58 30 C58 41 51 48 38 48 C55 48 62 57 62 68 C62 80 54 88 40 88 H18'),
  g('cap', 'R', 74, 'M18 12 V88', 'M18 12 H40 C55 12 62 21 62 32 C62 43 55 52 40 52 H18', 'M38 52 L62 88'),
];

// ---------------------------------------------------------------- chiffres
const DIGITS: Glyph[] = [
  g('dig', '1', 64, 'M22 32 L40 12 V88'),
  g('dig', '2', 76, 'M16 30 C16 19 26 12 38 12 C51 12 60 20 60 32 C60 46 47 56 16 88 H62'),
  g('dig', '3', 76, 'M16 22 C22 15 30 12 38 12 C51 12 59 20 59 30 C59 41 50 48 36 48 C52 48 62 56 62 68 C62 80 52 88 38 88 C28 88 20 84 15 77'),
  g('dig', '4', 76, 'M44 12 L12 62 H64', 'M50 34 V88'),
  g('dig', '5', 76, 'M58 12 H24 L20 46 C26 42 32 40 39 40 C53 40 62 50 62 64 C62 78 52 88 38 88 C28 88 20 84 15 77'),
  g('dig', '6', 76, 'M58 18 C52 14 46 12 40 12 C25 12 16 30 16 52 C16 74 25 88 40 88 C53 88 62 79 62 66 C62 53 53 45 40 45 C29 45 20 52 17 60'),
  g('dig', '7', 76, 'M14 12 H62 L30 88', 'M24 52 H54'),
  g('dig', '8', 76, 'M58 24 C56 16 48 12 38 12 C27 12 18 18 18 29 C18 40 28 45 38 49 C50 54 60 60 60 71 C60 82 50 88 38 88 C26 88 16 82 16 71 C16 60 26 54 38 49 C48 45 58 40 58 29 V24'),
  g('dig', '9', 76, 'M60 32 C60 20 50 12 38 12 C26 12 16 20 16 32 C16 44 26 52 38 52 C50 52 60 44 60 32 V60 C60 78 52 88 38 88 C30 88 23 85 18 80'),
  g('dig', '0', 76, 'M38 12 C24 12 16 30 16 50 C16 70 24 88 38 88 C52 88 60 70 60 50 C60 30 52 12 38 12'),
];

// ---------------------------------------------------------------- cursive (lettres attachées)
// Trait d'attaque depuis la ligne, et petite sortie vers la droite, comme à l'école.
const ATTACK = 'M8 70 C12 62 16 52 18 42';
const LOOP_UP = 'M8 66 C18 60 30 44 30 24 C30 14 27 8 23 8 C18 8 16 14 16 24';
const CURSIVE: Glyph[] = [
  // les ronds
  g('cur', 'c', 54, 'M40 48 C37 44 33 42 29 42 C20 42 14 49 14 57 C14 66 20 72 28 72 C34 72 39 69 44 64'),
  g('cur', 'o', 60, 'M30 42 C21 42 15 49 15 57 C15 66 21 72 30 72 C39 72 45 66 45 57 C45 49 39 42 30 42 C34 46 41 46 50 43'),
  g('cur', 'a', 64, 'M42 47 C39 43 35 42 31 42 C22 42 15 49 15 57 C15 66 21 72 29 72 C36 72 41 66 43 57 L44 42 L44 65 C44 70 47 72 50 72 C53 72 56 70 58 66'),
  g('cur', 'd', 64, 'M42 47 C39 43 35 42 31 42 C22 42 15 49 15 57 C15 66 21 72 29 72 C36 72 41 66 43 57 L44 12 L44 65 C44 70 47 72 50 72 C53 72 56 70 58 66'),
  g('cur', 'q', 60, 'M42 47 C39 43 35 42 31 42 C22 42 15 49 15 57 C15 66 21 72 29 72 C36 72 41 66 43 57 L44 42 L44 96'),
  // les coupes
  g('cur', 'i', 48, `${ATTACK} L18 65 C18 70 21 72 25 72 C29 72 32 70 35 66`, 'M18 27 L18 30'),
  g('cur', 'u', 64, `${ATTACK} L18 62 C18 68 22 72 27 72 C34 72 39 66 41 57 L42 42 L42 65 C42 70 45 72 48 72 C51 72 54 70 57 66`),
  g('cur', 't', 50, 'M8 70 C12 60 17 46 20 24 L20 65 C20 70 23 72 27 72 C31 72 34 70 37 66', 'M10 42 H32'),
  // les ponts
  g('cur', 'n', 64, `${ATTACK} L18 72 L18 56 C20 47 25 42 31 42 C37 42 40 47 40 54 L40 65 C40 70 43 72 47 72 C50 72 53 70 56 66`),
  g('cur', 'm', 82, `${ATTACK} L18 72 L18 56 C20 47 24 42 29 42 C34 42 37 47 37 54 L37 72 L37 56 C39 47 43 42 48 42 C53 42 56 47 56 54 L56 65 C56 70 59 72 63 72 C66 72 69 70 72 66`),
  g('cur', 'p', 60, `${ATTACK} L18 96 L18 54 C21 46 26 42 32 42 C40 42 45 49 45 57 C45 66 39 72 31 72 C25 72 21 69 18 64`),
  // les boucles
  g('cur', 'e', 50, 'M10 62 C22 60 34 54 34 47 C34 44 31 42 27 42 C20 42 15 50 15 58 C15 66 21 72 29 72 C35 72 39 69 42 65'),
  g('cur', 'l', 50, `${LOOP_UP} L16 64 C16 69 20 72 25 72 C30 72 34 69 38 65`),
  g('cur', 'b', 58, `${LOOP_UP} L16 64 C16 69 20 72 26 72 C33 72 39 66 39 56 C39 48 35 43 31 43 C33 47 40 47 48 44`),
  g('cur', 'h', 64, `${LOOP_UP} L16 72 L16 56 C18 47 23 42 29 42 C35 42 38 47 38 54 L38 65 C38 70 41 72 45 72 C48 72 51 70 54 66`),
  g('cur', 'k', 62, `${LOOP_UP} L16 72 L16 58 C20 48 25 42 31 42 C36 42 38 45 38 48 C38 53 31 57 21 57 C29 58 34 62 36 66 C38 70 41 72 44 72 C47 72 50 70 53 66`),
  g('cur', 'f', 54, `${LOOP_UP} L16 88 C16 93 18 96 21 96 C24 96 26 92 25 86 C24 79 20 74 16 72 C24 72 33 70 42 66`),
  // les jambages
  g('cur', 'j', 46, `${ATTACK} L18 86 C18 92 15 96 11 96 C7 96 5 92 7 87 C10 80 18 76 32 70`, 'M18 27 L18 30'),
  g('cur', 'y', 64, `${ATTACK} L18 62 C18 68 22 72 27 72 C34 72 39 66 41 57 L42 42 L42 86 C42 92 39 96 35 96 C30 96 28 92 30 87 C33 80 41 76 54 70`),
  g('cur', 'g', 64, 'M42 47 C39 43 35 42 31 42 C22 42 15 49 15 57 C15 66 21 72 29 72 C36 72 41 66 43 57 L44 42 L44 86 C44 92 40 96 35 96 C29 96 27 92 29 87 C33 80 43 76 56 70'),
  // les lettres particulières
  g('cur', 's', 52, 'M8 70 C14 62 21 52 26 42 C30 49 37 55 37 62 C37 68 32 72 26 72 C21 72 18 70 16 67 C22 71 32 71 44 66'),
  g('cur', 'r', 54, 'M8 70 C12 62 16 52 18 42 C21 45 26 46 31 43 C30 50 30 58 31 65 C32 70 35 72 38 72 C41 72 44 70 47 66'),
  g('cur', 'v', 56, 'M8 66 C12 58 15 50 17 42 C20 52 24 63 28 72 C32 62 36 51 39 42 C41 45 45 46 50 43'),
  g('cur', 'w', 74, 'M8 66 C12 58 15 50 17 42 C20 52 23 63 26 72 C29 62 32 51 35 42 C38 52 41 63 44 72 C47 62 50 51 53 42 C55 45 59 46 64 43'),
  g('cur', 'x', 56, 'M12 46 C18 42 24 44 27 52 C30 62 34 72 42 72 C45 72 48 70 50 66', 'M42 44 L14 72'),
  g('cur', 'z', 56, 'M12 46 C18 42 26 42 40 42 L14 72 C22 70 30 72 38 72 C42 72 46 70 49 66'),
];

export const GLYPHS: Glyph[] = [...CAPS, ...DIGITS, ...CURSIVE];

export function glyph(script: Script, char: string): Glyph {
  const found = GLYPHS.find((x) => x.script === script && x.char === char);
  if (!found) throw new Error(`glyph ${script}:${char}`);
  return found;
}

export interface WritingLevel {
  name: string;
  intro: string;
  chapter: number;
  script: Script;
  chars: string[];
  /** sans modèle : le chemin n'est presque plus visible, seul le point de départ guide */
  memory?: boolean;
}

export const WRITING_CHAPTERS = ['Les grandes lettres', 'Les chiffres', "L'écriture attachée"];

const chars = (s: string) => [...s];

export const WRITING_LEVELS: WritingLevel[] = [
  // 1. les capitales (MS)
  { chapter: 0, script: 'cap', name: 'Les traits droits', intro: 'Regarde bien Pixel, puis trace la lettre avec ton doigt.', chars: chars('ILTEFH') },
  { chapter: 0, script: 'cap', name: 'Les traits penchés', intro: 'Des lettres avec des pointes !', chars: chars('AVMNWXZKY') },
  { chapter: 0, script: 'cap', name: 'Les ronds', intro: 'Des lettres toutes rondes. On tourne comme ça !', chars: chars('OCGQUJSDPBR') },
  // 2. les chiffres (MS, GS)
  { chapter: 1, script: 'dig', name: 'Les chiffres de 1 à 5', intro: 'On apprend à écrire les chiffres.', chars: chars('12345') },
  { chapter: 1, script: 'dig', name: 'Les chiffres de 6 à 0', intro: 'Encore des chiffres !', chars: chars('67890') },
  // 3. la cursive (GS, CP)
  { chapter: 2, script: 'cur', name: 'Les ronds', intro: "L'écriture attachée ! On commence par les lettres rondes.", chars: chars('coadq') },
  { chapter: 2, script: 'cur', name: 'Les coupes', intro: 'Des lettres qui montent et qui descendent.', chars: chars('iut') },
  { chapter: 2, script: 'cur', name: 'Les ponts', intro: 'Des lettres avec des ponts !', chars: chars('nmp') },
  { chapter: 2, script: 'cur', name: 'Les boucles', intro: 'Des lettres avec des boucles.', chars: chars('elbhkf') },
  { chapter: 2, script: 'cur', name: 'Les jambages', intro: 'Des lettres qui descendent sous la ligne.', chars: chars('jyg') },
  { chapter: 2, script: 'cur', name: 'Les lettres spéciales', intro: 'Des lettres un peu spéciales.', chars: chars('srvwxz') },
  { chapter: 2, script: 'cur', name: 'Sans modèle', intro: 'Maintenant, le chemin se cache ! Écris la lettre de mémoire.', chars: chars('coaditunmpelbhfjgsrv'), memory: true },
];
