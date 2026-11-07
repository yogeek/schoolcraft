// Contenu pédagogique de la lecture : sons, syllabes, mots.
// Modifiable sans toucher au code des jeux.
//
// Règle pour la voix : un son ou un mot qui commence par une voyelle ne doit JAMAIS suivre
// un mot qui fait une liaison (« dans », « les », « c'est », « des »…), sinon l'enfant entend
// « dans-z-école ». On écrit « comme école », et les consignes mettent « : » avant l'élément.

export interface Item {
  /** ce qui est écrit sur le bloc */
  text: string;
  /** ce que dit la voix (orthographié pour que la synthèse vocale dise le son, pas le nom de la lettre) */
  speak: string;
  /** pour les mots : les syllabes, lues une à une après une réussite */
  parts?: string[];
  /** un mot repère pour le son */
  example?: string;
  /** image (emoji) pour les niveaux « lis le mot » */
  pic?: string;
}

const item = (text: string, speak = text, example?: string): Item => ({ text, speak, example });

export const VOWELS: Item[] = [
  item('a', 'a', 'comme ananas'),
  item('i', 'i', 'comme dans souris'),
  item('o', 'o', 'comme dans moto'),
  item('u', 'u', 'comme dans tortue'),
  // « e » seul est lu « u » ou « eu » selon les voix ; « euh » donne le bon son
  item('e', 'euh', 'comme dans cheval'),
  item('é', 'é', 'comme école'),
];

export const COMPLEX_SOUNDS: Item[] = [
  item('ou', 'ou', 'comme dans loup'),
  item('on', 'on', 'comme dans mouton'),
  item('an', 'an', 'comme dans maman'),
  item('in', 'hein', 'comme dans lapin'),
  item('oi', 'oua', 'comme dans roi'),
  item('ch', 'che', 'comme dans chat'),
  item('eu', 'euh', 'comme dans feu'),
];

const SYL_VOWELS = ['a', 'i', 'o', 'u', 'é'];
export function syllables(consonants: string[]): Item[] {
  return consonants.flatMap((c) => SYL_VOWELS.map((v) => item(c + v)));
}

/** Syllabes avec sons complexes ; certaines sont dites via un vrai mot pour que la voix les prononce bien. */
export const COMPLEX_SYLLABLES: Item[] = [
  item('mou'),
  item('fou'),
  item('lou', 'loup'),
  item('chou'),
  item('son'),
  item('ton'),
  item('bon'),
  item('ron', 'rond'),
  item('man', 'ment'),
  item('lan', 'lent'),
  item('ran', 'rang'),
  item('pin'),
  item('lin'),
  item('vin'),
  item('moi'),
  item('toi'),
  item('roi'),
  item('feu'),
  item('jeu'),
];

function word(spec: string, pic?: string): Item {
  const parts = spec.split('-');
  const text = parts.join('');
  return { text, speak: text, parts, pic };
}

/** Mots simples (consonne + voyelle). */
export const SIMPLE_WORDS: Item[] = [
  'mo-to', 'la-ma', 'vé-lo', 'so-fa', 'ju-do', 'pa-pa', 'ma-mi', 'ra-di-o', 'do-mi-no', 'to-ma-te',
  'sa-la-de', 'ba-na-ne', 'pi-ra-te', 'ca-na-pé', 'ca-fé', 'ki-wi', 'li-mo-na-de', 'bé-bé',
].map((w) => word(w));

/** Mots simples avec image, pour lire seul. */
export const SIMPLE_PICTURE_WORDS: Item[] = [
  word('mo-to', '🏍️'),
  word('la-ma', '🦙'),
  word('vé-lo', '🚲'),
  word('ki-wi', '🥝'),
  word('to-ma-te', '🍅'),
  word('ba-na-ne', '🍌'),
  word('ra-di-o', '📻'),
  word('ca-fé', '☕'),
  word('ro-bot', '🤖'),
  word('so-fa', '🛋️'),
  word('bé-bé', '👶'),
  word('sa-la-de', '🥗'),
  word('tu-li-pe', '🌷'),
  word('lu-ne', '🌙'),
  word('fu-sée', '🚀'),
  word('dé', '🎲'),
];

/** Mots avec sons complexes, avec image. */
export const COMPLEX_WORDS: Item[] = [
  word('mou-ton', '🐑'),
  word('la-pin', '🐰'),
  word('pois-son', '🐟'),
  word('chat', '🐱'),
  word('loup', '🐺'),
  word('ca-deau', '🎁'),
  word('ba-teau', '⛵'),
  word('gâ-teau', '🎂'),
  word('cha-peau', '🎩'),
  word('cha-meau', '🐪'),
  word('bal-lon', '🎈'),
  word('mai-son', '🏠'),
  word('ci-tron', '🍋'),
  word('a-vion', '✈️'),
  word('ca-mion', '🚚'),
  word('roi', '👑'),
  word('é-toi-le', '⭐'),
  word('co-chon', '🐷'),
  word('pom-me', '🍎'),
  word('four-mi', '🐜'),
  word('pou-le', '🐔'),
  word('oi-seau', '🐦'),
  word('pin-gouin', '🐧'),
  word('bon-bon', '🍬'),
  word('pous-sin', '🐤'),
  word('dau-phin', '🐬'),
  word('so-leil', '☀️'),
  word('cra-yon', '✏️'),
];

export type LevelKind = 'sound' | 'word' | 'build' | 'read';

export interface ReadingLevel {
  name: string;
  /** consigne courte, dite au début */
  intro: string;
  items: Item[];
  choices: number;
  kind: LevelKind;
  /** distracteurs qui se ressemblent */
  similar?: boolean;
  /** quelques lettres en majuscules */
  mixedCase?: boolean;
}

export const READING_LEVELS: ReadingLevel[] = [
  { name: 'Les voyelles', intro: 'Écoute le son, et touche le bon bloc.', items: VOWELS, choices: 3, kind: 'sound' },
  { name: 'Grandes et petites lettres', intro: 'Les lettres peuvent être grandes ou petites.', items: VOWELS, choices: 5, mixedCase: true, kind: 'sound' },
  { name: 'Premières syllabes', intro: 'Écoute bien la syllabe.', items: syllables(['m', 'l', 'r', 's']), choices: 4, kind: 'sound' },
  { name: 'Nouvelles consonnes', intro: 'De nouvelles lettres arrivent !', items: syllables(['p', 't', 'n', 'v', 'f', 'ch', 'j']), choices: 4, similar: true, kind: 'sound' },
  { name: 'Syllabes jumelles', intro: 'Attention, elles se ressemblent !', items: syllables(['b', 'd', 'p', 'm', 'n', 't']), choices: 5, similar: true, kind: 'sound' },
  { name: 'Écouter des mots', intro: 'Écoute le mot, et trouve-le.', items: SIMPLE_WORDS, choices: 4, similar: true, kind: 'word' },
  { name: 'Construire des mots', intro: 'Mets les syllabes dans le bon ordre pour construire le mot.', items: SIMPLE_WORDS, choices: 0, kind: 'build' },
  { name: 'Sons à deux lettres', intro: 'Parfois, deux lettres font un seul son.', items: COMPLEX_SOUNDS, choices: 4, kind: 'sound' },
  { name: 'Syllabes à deux lettres', intro: 'Écoute bien la syllabe.', items: COMPLEX_SYLLABLES, choices: 4, similar: true, kind: 'sound' },
  { name: 'Écouter des mots difficiles', intro: 'Écoute le mot, et trouve-le.', items: COMPLEX_WORDS, choices: 4, similar: true, kind: 'word' },
  { name: 'Lire tout seul', intro: 'Maintenant, tu lis tout seul ! Lis le mot, et touche la bonne image.', items: SIMPLE_PICTURE_WORDS, choices: 3, kind: 'read' },
  { name: 'Grand lecteur', intro: 'Lis le mot en entier, et touche la bonne image.', items: COMPLEX_WORDS, choices: 4, similar: true, kind: 'read' },
];

/** Syllabes « pièges » pour le niveau Construire des mots. */
export const DECOY_SYLLABLES = syllables(['m', 'l', 'r', 's', 'p', 't', 'n', 'v', 'b', 'd']).map((i) => i.text);
