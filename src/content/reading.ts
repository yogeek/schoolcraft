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
  'mo-to', 'la-ma', 'vé-lo', 'so-fa', 'ju-do', 'pa-pa', 'do-do', 'ra-di-o', 'do-mi-no', 'to-ma-te',
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


// ---------------------------------------------------------------- conscience phonologique
// Des images que la voix nomme : l'enfant n'a rien à lire. On travaille des grandes unités vers les
// petites : la syllabe, la rime, puis le premier son.

export interface PicWord {
  /** le mot (dit par la voix) */
  word: string;
  pic: string;
  /** syllabes orales, écrites pour que la voix les dise bien (« pa-pi-yon ») */
  syl: string[];
  /** son final (groupe de rimes) */
  rime?: string;
  /** premier son, seulement quand le mot commence par consonne + voyelle (pas « crayon ») */
  onset?: string;
  /** nombre de syllabes discutable (« pi-a-no » ou « pia-no », « ce-rise » ou « crise ») : pas pour compter les syllabes */
  noClap?: boolean;
}

const pw = (word: string, pic: string, syl: string, rime?: string, onset?: string, noClap = false): PicWord => ({
  word,
  pic,
  syl: syl.split('-'),
  rime,
  onset,
  noClap,
});

export const PIC_WORDS: PicWord[] = [
  // une syllabe
  pw('chat', '🐱', 'chat', 'a', 'ch'),
  pw('rat', '🐀', 'rat', 'a', 'r'),
  pw('loup', '🐺', 'loup', 'ou', 'l'),
  pw('lit', '🛏️', 'lit', 'i', 'l'),
  pw('riz', '🍚', 'riz', 'i', 'r'),
  pw('dé', '🎲', 'dé', 'é', 'd'),
  pw('nez', '👃', 'nez', 'é', 'n'),
  pw('pied', '🦶', 'pied', 'é', 'p'),
  pw('fée', '🧚', 'fée', 'é', 'f'),
  pw('dent', '🦷', 'dent', 'an', 'd'),
  pw('gant', '🧤', 'gant', 'an', 'g'),
  pw('main', '✋', 'main', 'in', 'm'),
  pw('pain', '🍞', 'pain', 'in', 'p'),
  pw('feu', '🔥', 'feu', 'eu', 'f'),
  pw('roi', '👑', 'roi', 'oi', 'r'),
  pw('bouche', '👄', 'bouche', 'ouche', 'b'),
  pw('douche', '🚿', 'douche', 'ouche', 'd'),
  pw('pomme', '🍎', 'pomme', 'ome', 'p'),
  pw('lune', '🌙', 'lune', 'une', 'l'),
  pw('vache', '🐮', 'vache', 'ache', 'v'),
  pw('poule', '🐔', 'poule', 'oule', 'p'),
  pw('cœur', '❤️', 'cœur', 'eur', 'k'),
  // deux syllabes
  pw('panda', '🐼', 'pan-da', 'a', 'p'),
  pw('lama', '🦙', 'la-ma', 'a', 'l'),
  pw('sofa', '🛋️', 'so-fa', 'a', 's'),
  pw('hibou', '🦉', 'i-bou', 'ou'),
  pw('bisou', '😘', 'bi-sou', 'ou', 'b'),
  pw('souris', '🐭', 'sou-ri', 'i', 's'),
  pw('kiwi', '🥝', 'ki-wi', 'i', 'k'),
  pw('taxi', '🚕', 'ta-xi', 'i', 't'),
  pw('fourmi', '🐜', 'four-mi', 'i', 'f'),
  pw('moto', '🏍️', 'mo-to', 'o', 'm'),
  pw('vélo', '🚲', 'vé-lo', 'o', 'v'),
  pw('robot', '🤖', 'ro-bo', 'o', 'r'),
  pw('bateau', '⛵', 'ba-teau', 'o', 'b'),
  pw('gâteau', '🎂', 'gâ-teau', 'o', 'g'),
  pw('chapeau', '🎩', 'cha-peau', 'o', 'ch'),
  pw('chameau', '🐪', 'cha-meau', 'o', 'ch'),
  pw('cadeau', '🎁', 'ca-deau', 'o', 'k'),
  pw('oiseau', '🐦', 'oi-zo', 'o'),
  pw('piano', '🎹', 'pia-no', 'o', 'p', true),
  pw('mouton', '🐑', 'mou-ton', 'on', 'm'),
  pw('ballon', '🎈', 'ba-lon', 'on', 'b'),
  pw('cochon', '🐷', 'co-chon', 'on', 'k'),
  pw('poisson', '🐟', 'poi-sson', 'on', 'p'),
  pw('citron', '🍋', 'ci-tron', 'on', 's'),
  pw('avion', '✈️', 'a-vion', 'on'),
  pw('camion', '🚚', 'ca-mion', 'on', 'k'),
  pw('bonbon', '🍬', 'bon-bon', 'on', 'b'),
  pw('maison', '🏠', 'mai-zon', 'on', 'm'),
  pw('lapin', '🐰', 'la-pin', 'in', 'l'),
  pw('poussin', '🐤', 'pou-ssin', 'in', 'p'),
  pw('dauphin', '🐬', 'dau-fin', 'in', 'd'),
  pw('sapin', '🎄', 'sa-pin', 'in', 's'),
  pw('raisin', '🍇', 'rai-zin', 'in', 'r'),
  pw('fusée', '🚀', 'fu-zée', 'é', 'f'),
  pw('bébé', '👶', 'bé-bé', 'é', 'b'),
  pw('café', '☕', 'ca-fé', 'é', 'k'),
  pw('serpent', '🐍', 'ser-pent', 'an', 's'),
  pw('canard', '🦆', 'ca-nar', 'ar', 'k'),
  pw('renard', '🦊', 're-nar', 'ar', 'r', true),
  pw('homard', '🦞', 'o-mar', 'ar'),
  pw('nuage', '☁️', 'nu-age', 'age', 'n'),
  pw('fromage', '🧀', 'fro-mage', 'age'),
  pw('chaussette', '🧦', 'chau-ssette', 'ette', 'ch'),
  pw('baguette', '🥖', 'ba-guette', 'ette', 'b'),
  pw('lunettes', '👓', 'lu-nettes', 'ette', 'l'),
  pw('cerise', '🍒', 'ce-rise', 'ise', 's', true),
  pw('valise', '🧳', 'va-lise', 'ise', 'v'),
  pw('chemise', '👔', 'che-mise', 'ise', 'ch', true),
  pw('voiture', '🚗', 'voi-ture', 'ure', 'v'),
  pw('tortue', '🐢', 'tor-tue', 'u', 't'),
  pw('tomate', '🍅', 'to-mate', 'ate', 't'),
  pw('banane', '🍌', 'ba-nane', 'ane', 'b'),
  pw('soleil', '☀️', 'so-leil', 'eil', 's'),
  pw('abeille', '🐝', 'a-beille', 'eil'),
  pw('cheval', '🐴', 'che-val', 'al', 'ch', true),
  pw('gorille', '🦍', 'go-rille', 'ille', 'g'),
  pw('girafe', '🦒', 'gi-rafe', 'afe', 'j'),
  pw('tulipe', '🌷', 'tu-lipe', 'ipe', 't'),
  pw('salade', '🥗', 'sa-lade', 'ade', 's'),
  // trois syllabes et plus
  pw('kangourou', '🦘', 'kan-gou-rou', 'ou', 'k'),
  pw('éléphant', '🐘', 'é-lé-fant', 'an'),
  pw('papillon', '🦋', 'pa-pi-yon', 'on', 'p'),
  pw('champignon', '🍄', 'chan-pi-gnon', 'on', 'ch'),
  pw('escargot', '🐌', 'ès-car-go', 'o'),
  pw('dinosaure', '🦕', 'di-no-zor', 'or', 'd'),
  pw('parapluie', '☂️', 'pa-ra-pluie', 'ui', 'p'),
  pw('koala', '🐨', 'ko-a-la', 'a', 'k'),
  pw('coccinelle', '🐞', 'cok-si-nèl', 'elle', 'k'),
  pw('télévision', '📺', 'té-lé-vi-zion', 'on', 't'),
  pw('hippopotame', '🦛', 'i-po-po-tame', 'ame'),
  pw('ordinateur', '💻', 'or-di-na-teur', 'eur'),
];

/** Mots pour taper les syllabes : MS (1 à 3 syllabes). */
export const CLAP_WORDS = PIC_WORDS.filter((w) => !w.noClap && w.syl.length <= 4);
/** Mots qui riment avec au moins un autre mot. */
export const RHYME_WORDS = PIC_WORDS.filter((w) => w.rime && PIC_WORDS.some((o) => o !== w && o.rime === w.rime));
/** Mots dont le premier son est partagé par au moins un autre mot. */
export const ONSET_WORDS = PIC_WORDS.filter((w) => w.onset && PIC_WORDS.some((o) => o !== w && o.onset === w.onset));

// ---------------------------------------------------------------- encodage
// « Écrire » avec des lettres : on entend, on compose. Les graphèmes à plusieurs lettres sont une
// seule tuile (ch, ou, on…), comme on les apprend.
export const GRAPHEMES = ['eau', 'ch', 'ou', 'on', 'an', 'in', 'oi', 'eu', 'au', 'ai', 'gn'];

/** Découpe « chapeau » en ch-a-p-eau. */
export function graphemes(text: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < text.length) {
    const g = GRAPHEMES.find((x) => text.startsWith(x, i));
    out.push(g ?? text[i]);
    i += g ? g.length : 1;
  }
  return out;
}

/** Mots simples, sans lettre muette, pour les premiers mots écrits. */
export const SPELL_WORDS: Item[] = [
  'mo-to', 'la-ma', 'vé-lo', 'so-fa', 'ju-do', 'pa-pa', 'do-do', 'ki-wi', 'bé-bé', 'ca-fé',
  'ra-di-o', 'do-mi-no', 'ca-na-pé', 'tu-tu', 'lo-to', 'su-mo', 'ka-ra-té', 'vi-dé-o',
].map((w) => word(w));

// ---------------------------------------------------------------- phrases et devinettes
export interface Sentence {
  text: string;
  /** vrai ou faux dans la vraie vie */
  truth: boolean;
}

const yes = (text: string): Sentence => ({ text, truth: true });
const no = (text: string): Sentence => ({ text, truth: false });

export const SENTENCES: Sentence[] = [
  yes('Le chat fait miaou.'),
  yes('La banane est jaune.'),
  yes('La tomate est rouge.'),
  yes('Le poisson nage dans la mer.'),
  yes('La lune brille la nuit.'),
  yes('Un vélo a deux roues.'),
  yes('Le roi a une couronne.'),
  yes('On dort dans le lit.'),
  yes('Le lapin mange une carotte.'),
  yes('La neige est froide.'),
  yes('Le canard fait coin coin.'),
  yes('La souris est petite.'),
  yes('Le soleil est chaud.'),
  no('La vache vole dans le ciel.'),
  no('Le feu est froid.'),
  no('Une moto a des plumes.'),
  no('Le poisson marche sur la route.'),
  no('La banane est bleue.'),
  no('Le chat fait coin coin.'),
  no('La lune est carrée.'),
  no('Le lapin a six pattes.'),
  no('Le bébé conduit le camion.'),
  no('La pomme chante.'),
  no('La neige est chaude.'),
];

export interface Riddle {
  text: string;
  pic: string;
  /** deux images fausses, choisies pour ne pas prêter à confusion */
  wrong: [string, string];
}

export const RIDDLES: Riddle[] = [
  { text: 'Il est jaune et il brille dans le ciel.', pic: '☀️', wrong: ['🌳', '🐟'] },
  { text: 'Il a de grandes oreilles et il mange des carottes.', pic: '🐰', wrong: ['🐟', '🚗'] },
  { text: 'Il vit dans la mer et il fait des bulles.', pic: '🐟', wrong: ['🐮', '🚲'] },
  { text: 'On le met sur la tête.', pic: '🎩', wrong: ['🧦', '🍌'] },
  { text: 'Elle a deux roues et on pédale.', pic: '🚲', wrong: ['🚂', '🍎'] },
  { text: 'Il vole et il fait cui-cui.', pic: '🐦', wrong: ['🐱', '🚗'] },
  { text: 'On le mange pour son anniversaire.', pic: '🎂', wrong: ['🧦', '🚀'] },
  { text: 'Il a une trompe et de grandes oreilles.', pic: '🐘', wrong: ['🐟', '🐔'] },
  { text: 'On le prend pour écrire et dessiner.', pic: '✏️', wrong: ['🍎', '🧦'] },
  { text: 'Il roule sur les rails et il fait tchou-tchou.', pic: '🚂', wrong: ['🚲', '🐮'] },
  { text: 'On dort dedans.', pic: '🛏️', wrong: ['🍌', '🚀'] },
  { text: 'Elle fait meuh et elle donne du lait.', pic: '🐮', wrong: ['🐦', '🐟'] },
  { text: 'Il part très haut dans le ciel, vers la lune.', pic: '🚀', wrong: ['🐢', '🛏️'] },
  { text: 'Il est très chaud et il fait des flammes.', pic: '🔥', wrong: ['🧊', '🐟'] },
  { text: 'On le met aux pieds avant les chaussures.', pic: '🧦', wrong: ['🎩', '🍞'] },
];

// ---------------------------------------------------------------- niveaux
interface LevelBase {
  name: string;
  /** consigne courte, dite au début */
  intro: string;
  /** chapitre de la carte */
  chapter: number;
}

export type ItemKind = 'sound' | 'word' | 'build' | 'read' | 'spell';
export type PicKind = 'clap' | 'rhyme' | 'initial';

export type ReadingLevel =
  | (LevelBase & {
      kind: ItemKind;
      items: Item[];
      choices: number;
      /** distracteurs qui se ressemblent */
      similar?: boolean;
      /** quelques lettres en majuscules */
      mixedCase?: boolean;
    })
  | (LevelBase & { kind: PicKind; words: PicWord[]; choices: number })
  | (LevelBase & { kind: 'sentence'; sentences: Sentence[] })
  | (LevelBase & { kind: 'riddle'; riddles: Riddle[] });

export type LevelKind = ReadingLevel['kind'];

/** Chapitres de la carte « Lire ». */
export const READING_CHAPTERS = ['La prairie des sons', 'La forêt des lettres', 'La mine des mots', 'La montagne des sons', 'Le château des phrases'];

export const READING_LEVELS: ReadingLevel[] = [
  // 1. la prairie des sons : conscience phonologique (MS, GS)
  { chapter: 0, name: 'Taper les syllabes', intro: 'Écoute le mot, et tape sur le tambour une fois pour chaque syllabe.', words: CLAP_WORDS, choices: 0, kind: 'clap' },
  { chapter: 0, name: 'Les rimes', intro: 'Écoute bien la fin des mots.', words: RHYME_WORDS, choices: 3, kind: 'rhyme' },
  { chapter: 0, name: 'Le premier son', intro: 'Écoute bien le début des mots.', words: ONSET_WORDS, choices: 3, kind: 'initial' },
  // 2. la forêt des lettres : lettres, sons et syllabes (GS)
  { chapter: 1, name: 'Les voyelles', intro: 'Écoute le son, et touche le bon bloc.', items: VOWELS, choices: 3, kind: 'sound' },
  { chapter: 1, name: 'Grandes et petites lettres', intro: 'Les lettres peuvent être grandes ou petites.', items: VOWELS, choices: 5, mixedCase: true, kind: 'sound' },
  { chapter: 1, name: 'Premières syllabes', intro: 'Écoute bien la syllabe.', items: syllables(['m', 'l', 'r', 's']), choices: 4, kind: 'sound' },
  { chapter: 1, name: 'Nouvelles consonnes', intro: 'De nouvelles lettres arrivent !', items: syllables(['p', 't', 'n', 'v', 'f', 'ch', 'j']), choices: 4, similar: true, kind: 'sound' },
  { chapter: 1, name: 'Syllabes jumelles', intro: 'Attention, elles se ressemblent !', items: syllables(['b', 'd', 'p', 'm', 'n', 't']), choices: 5, similar: true, kind: 'sound' },
  // 3. la mine des mots : encodage et premiers mots (GS, CP)
  { chapter: 2, name: 'Écrire des syllabes', intro: 'Écoute la syllabe, et écris-la avec les lettres.', items: syllables(['m', 'l', 'r', 's', 'p', 't']), choices: 0, kind: 'spell' },
  { chapter: 2, name: 'Écouter des mots', intro: 'Écoute le mot, et trouve-le.', items: SIMPLE_WORDS, choices: 4, similar: true, kind: 'word' },
  { chapter: 2, name: 'Construire des mots', intro: 'Mets les syllabes dans le bon ordre pour construire le mot.', items: SIMPLE_WORDS, choices: 0, kind: 'build' },
  { chapter: 2, name: 'Lire sans aide', intro: "Maintenant, c'est toi qui lis ! Lis le mot, et touche la bonne image.", items: SIMPLE_PICTURE_WORDS, choices: 3, kind: 'read' },
  { chapter: 2, name: 'Écrire des mots', intro: 'Écoute le mot, et écris-le avec les lettres.', items: SPELL_WORDS, choices: 0, kind: 'spell' },
  // 4. la montagne des sons : graphèmes complexes (CP)
  { chapter: 3, name: 'Sons à deux lettres', intro: 'Parfois, deux lettres font un seul son.', items: COMPLEX_SOUNDS, choices: 4, kind: 'sound' },
  { chapter: 3, name: 'Syllabes à deux lettres', intro: 'Écoute bien la syllabe.', items: COMPLEX_SYLLABLES, choices: 4, similar: true, kind: 'sound' },
  { chapter: 3, name: 'Écouter des mots difficiles', intro: 'Écoute le mot, et trouve-le.', items: COMPLEX_WORDS, choices: 4, similar: true, kind: 'word' },
  { chapter: 3, name: 'Lire des mots difficiles', intro: 'Lis le mot en entier, et touche la bonne image.', items: COMPLEX_WORDS, choices: 4, similar: true, kind: 'read' },
  // 5. le château des phrases : comprendre ce qu'on lit (CP)
  { chapter: 4, name: 'Vrai ou faux ?', intro: 'Le château des phrases ! Ici, c’est toi qui lis.', sentences: SENTENCES, kind: 'sentence' },
  { chapter: 4, name: 'Devinettes', intro: 'Des devinettes ! C’est toi qui lis.', riddles: RIDDLES, kind: 'riddle' },
];

/** Syllabes « pièges » pour le niveau Construire des mots. */
export const DECOY_SYLLABLES = syllables(['m', 'l', 'r', 's', 'p', 't', 'n', 'v', 'b', 'd']).map((i) => i.text);

/** Lettres qui se confondent, pour les pièges de l'encodage. */
export const LOOKALIKE: Record<string, string> = { b: 'dp', d: 'bq', p: 'bq', q: 'pd', m: 'n', n: 'mu', u: 'n', a: 'o', o: 'a', i: 'l', l: 'i', t: 'f', f: 't', é: 'e', e: 'é', s: 'z', v: 'f', r: 'l' };
