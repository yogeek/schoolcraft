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
  /** lettres muettes (positions dans `text`) : écrites en gris, comme dans les livres de CP */
  mute?: number[];
  /** même son qu'un autre bloc du niveau (o, au, eau) : ils ne sont jamais proposés ensemble */
  group?: string;
}

const item = (text: string, speak = text, example?: string, group?: string): Item => ({ text, speak, example, group });

export const VOWELS: Item[] = [
  item('a', 'a', 'comme ananas'),
  item('i', 'i', 'comme dans souris'),
  item('o', 'o', 'comme dans moto'),
  item('u', 'u', 'comme dans tortue'),
  // « e » seul est lu « u » ou « eu » selon les voix ; « euh » donne le bon son
  item('e', 'euh', 'comme dans cheval'),
  item('é', 'é', 'comme école'),
];

/** Sons à deux lettres les plus fréquents (CP, première période). « ch » est déjà vu avec les consonnes. */
export const COMPLEX_SOUNDS: Item[] = [
  item('ou', 'ou', 'comme dans loup'),
  item('on', 'on', 'comme dans mouton'),
  item('an', 'an', 'comme dans maman'),
  item('in', 'hein', 'comme dans lapin'),
  item('oi', 'oua', 'comme dans roi'),
  // « eu » est le son de « feu », pas celui du « e » de « cheval » : « eux » le fait bien dire
  item('eu', 'eux', 'comme dans feu'),
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

/** Le son k (c, k, qu) et le son g (g, gu), avec d'autres syllabes pour ne pas confondre. */
export const HARD_CG: Item[] = [
  item('ca', 'ca', undefined, 'ka'),
  item('ka', 'ka', undefined, 'ka'),
  item('co', 'co', undefined, 'ko'),
  item('ki', 'qui', undefined, 'ki'),
  item('qui', 'qui', undefined, 'ki'),
  item('ga'),
  item('go'),
  item('gui', 'gui', undefined, 'gi'),
  item('gué'),
  item('ta'),
  item('to'),
  item('da'),
];

/** Le c et le g qui changent de son devant e et i (et le ç). */
export const SOFT_CG: Item[] = [
  item('ca'),
  item('co'),
  item('ce', 'ce', undefined, 'se'),
  item('ci', 'si', undefined, 'si'),
  item('ça', 'ça', undefined, 'sa'),
  item('ga'),
  item('go'),
  item('ge', 'je', undefined, 'je'),
  item('gi', "j'y", undefined, 'ji'),
];

/** Un son, plusieurs écritures. Les blocs d'un même groupe ne sont jamais proposés ensemble. */
export const SAME_SOUNDS: Item[] = [
  item('è', 'è', 'comme dans zèbre', 'è'),
  item('ai', 'è', 'comme dans lait', 'è'),
  item('ei', 'è', 'comme dans baleine', 'è'),
  item('au', 'o', 'comme dans jaune', 'o'),
  item('eau', 'o', 'comme dans bateau', 'o'),
  item('en', 'an', 'comme dans dent', 'an'),
  item('am', 'an', 'comme dans jambe', 'an'),
  item('ain', 'hein', 'comme dans pain', 'in'),
  item('om', 'on', 'comme dans pompier', 'on'),
  item('ou', 'ou', 'comme dans loup'),
  item('oi', 'oua', 'comme dans roi'),
  item('u', 'u', 'comme dans tortue'),
];

/** Sons écrits avec plusieurs lettres, plus rares. */
export const RARE_SOUNDS: Item[] = [
  item('gn', 'gne', 'comme dans montagne'),
  item('ill', 'ille', 'comme dans fille'),
  item('ph', 'feu', 'comme dans dauphin', 'f'),
  item('oin', 'ouin', 'comme dans coin'),
  item('ch', 'che', 'comme dans chapeau'),
  item('j', 'je', 'comme dans judo'),
];

/** Deux consonnes accrochées (consonne + r ou l). */
export const CLUSTER_SYLLABLES: Item[] = ['bra', 'bri', 'cra', 'cro', 'dra', 'fra', 'fri', 'gra', 'gro', 'pra', 'pri', 'tra', 'tri', 'vra', 'bla', 'cla', 'clo', 'fla', 'flo', 'gla', 'pla', 'plu'].map((x) => item(x));

/**
 * Un mot, découpé en syllabes écrites : « mou-ton ». Les lettres muettes sont entre crochets :
 * « lou[p] », « to-ma-t[e] » (elles s'affichent en gris et ne se disent pas).
 */
function word(spec: string, pic?: string): Item {
  const mute: number[] = [];
  let text = '';
  let quiet = false;
  for (const ch of spec) {
    if (ch === '[') quiet = true;
    else if (ch === ']') quiet = false;
    else if (ch !== '-') {
      if (quiet) mute.push(text.length);
      text += ch;
    }
  }
  const parts = spec.replace(/[[\]]/g, '').split('-');
  return { text, speak: text, parts, pic, ...(mute.length ? { mute } : {}) };
}

// Chaque liste n'a que des mots déchiffrables avec les sons déjà appris à ce niveau
// (vérifié par `npm run check`, voir `decode()` plus bas).

/** Mots simples (consonne + voyelle), pour écouter et construire. */
export const SIMPLE_WORDS: Item[] = [
  'mo-to', 'la-ma', 'vé-lo', 'so-fa', 'ju-do', 'pa-pa', 'do-do', 'ra-di-o', 'do-mi-no', 'bé-bé',
  'pi-ja-ma', 'tu-tu', 'lo-to', 'vi-dé-o', 'sa-la-mi', 'jo-li', 'pu-ma', 'a-mi',
].map((w) => word(w));

/** Mots simples avec image, pour lire seul. */
export const SIMPLE_PICTURE_WORDS: Item[] = [
  word('mo-to', '🏍️'),
  word('la-ma', '🦙'),
  word('vé-lo', '🚲'),
  word('so-fa', '🛋️'),
  word('ra-di-o', '📻'),
  word('bé-bé', '👶'),
  word('ju-do', '🥋'),
  word('dé', '🎲'),
  word('mur', '🧱'),
  word('bol', '🥣'),
  word('pi-a-no', '🎹'),
  word('fil', '🧵'),
  word('bus', '🚌'),
];

/** Mots avec des lettres muettes (en gris). */
export const MUTE_WORDS: Item[] = [
  word('lu-n[e]', '🌙'),
  word('to-ma-t[e]', '🍅'),
  word('ba-na-n[e]', '🍌'),
  word('tu-li-p[e]', '🌷'),
  word('sa-la-d[e]', '🥗'),
  word('ro-bo[t]', '🤖'),
  word('li[t]', '🛏️'),
  word('ri[z]', '🍚'),
  word('cha[t]', '🐱'),
  word('ra[t]', '🐀'),
  word('va-ch[e]', '🐮'),
  word('pi-ra-t[e]', '🏴‍☠️'),
];

/** Mots avec ou, on, an, in, oi, eu. */
export const SOUND_WORDS: Item[] = [
  word('mou-ton', '🐑'),
  word('la-pin', '🐰'),
  word('lou[p]', '🐺'),
  word('bon-bon', '🍬'),
  word('four-mi', '🐜'),
  word('pou-l[e]', '🐔'),
  word('roi', '👑'),
  word('é-toi-l[e]', '⭐'),
  word('sa-pin', '🎄'),
  word('pan-da', '🐼'),
  word('li-on', '🦁'),
  word('ru-ban', '🎀'),
  word('sou-ri[s]', '🐭'),
  word('vi-o-lon', '🎻'),
  word('nou-nour[s]', '🧸'),
  word('[h]i-bou', '🦉'),
  word('dou-ch[e]', '🚿'),
  word('bou-ch[e]', '👄'),
  word('mou-ch[e]', '🪰'),
  word('feu', '🔥'),
  word('lou-p[e]', '🔍'),
];

/** Mots avec c, g, s qui changent, et les autres écritures d'un son. */
export const COMPLEX_WORDS: Item[] = [
  word('ca-deau', '🎁'),
  word('ba-teau', '⛵'),
  word('gâ-teau', '🎂'),
  word('cha-peau', '🎩'),
  word('cha-meau', '🐪'),
  word('mai-son', '🏠'),
  word('ca-mion', '🚚'),
  word('co-chon', '🐷'),
  word('oi-seau', '🐦'),
  word('dau-phin', '🐬'),
  word('so-leil', '☀️'),
  word('a-beil-l[e]', '🐝'),
  word('go-ril-l[e]', '🦍'),
  word('gi-ra-f[e]', '🦒'),
  word('ca-nar[d]', '🦆'),
  word('ce-ri-s[e]', '🍒'),
  word('va-li-s[e]', '🧳'),
  word('fu-sé[e]', '🚀'),
  word('pom-m[e]', '🍎'),
  word('bal-lon', '🎈'),
  word('pois-son', '🐟'),
  word('pous-sin', '🐤'),
  word('ca-rot-t[e]', '🥕'),
  word('gui-ta-r[e]', '🎸'),
  word('ca-fé', '☕'),
  word('pin-gouin', '🐧'),
  word('mon-ta-gn[e]', '🏔️'),
  word('rai-sin', '🍇'),
  word('ba-lei-n[e]', '🐋'),
  word('che-val', '🐴'),
  word('ser-pen[t]', '🐍'),
  word('den[t]', '🦷'),
  word('gan[t]', '🧤'),
  word('pain', '🍞'),
  word('lai[t]', '🥛'),
  word('quil-l[e]', '🎳'),
  word('voi-tu-r[e]', '🚗'),
];

/** Mots avec deux consonnes accrochées. */
export const CLUSTER_WORDS: Item[] = [
  word('ci-tron', '🍋'),
  word('cra-b[e]', '🦀'),
  word('cro-co-di-l[e]', '🐊'),
  word('dra-peau', '🚩'),
  word('fleur', '🌸'),
  word('fro-ma-g[e]', '🧀'),
  word('gla-c[e]', '🧊'),
  word('pla-g[e]', '🏖️'),
  word('clé', '🔑'),
  word('bra[s]', '💪'),
  word('trac-teur', '🚜'),
  word('train', '🚂'),
  word('gre-nouil-l[e]', '🐸'),
  word('pri-s[e]', '🔌'),
  word('ar-br[e]', '🌳'),
  word('li-vr[e]', '📖'),
  word('bro-co-li', '🥦'),
  word('frai-s[e]', '🍓'),
  word('pla-nè-t[e]', '🪐'),
  word('dra-gon', '🐉'),
  word('gru[e]', '🏗️'),
  word('prin-ces-s[e]', '👸'),
];

/** Les petits mots qu'on lit partout (mots-outils), redits dans un bout de phrase après une réussite. */
const TOOL_EXAMPLES: Record<string, string> = {
  le: 'le chat',
  la: 'la lune',
  les: 'les chats',
  un: 'un chat',
  une: 'une pomme',
  il: 'il joue',
  elle: 'elle chante',
  on: 'on joue',
  dans: 'dans la boîte',
  sur: 'sur la table',
  avec: 'avec papa',
  mon: 'mon vélo',
  ma: 'ma maison',
  des: 'des bonbons',
  du: 'du pain',
  pour: 'pour toi',
};
const TOOL_SPELLING: Record<string, string> = { les: 'le[s]', des: 'de[s]', dans: 'dan[s]' };
export const TOOL_WORDS: Item[] = Object.entries(TOOL_EXAMPLES).map(([w, example]) => ({ ...word(TOOL_SPELLING[w] ?? w), example }));

/**
 * Ce qu'il faut savoir pour lire un mot : la suite de ses « codes » (graphèmes, avec le c, le g et le
 * s qui changent selon la lettre d'après). Sert à vérifier qu'un niveau ne donne à lire que des mots
 * déchiffrables avec ce qui a été appris avant (`npm run check`).
 */
export function decode(text: string, mute: number[] = []): string[] {
  return segments(text, mute).flatMap((g) => (g.cluster ? [g.code, 'consonnes accrochées'] : [g.code]));
}

/** a grapheme of a word: its code (see `decode()`), where it starts and how many letters it takes */
export interface Segment {
  code: string;
  at: number;
  len: number;
  /** a consonant hooked to the one before (« br », « cl ») */
  cluster?: boolean;
}

export function segments(text: string, mute: number[] = []): Segment[] {
  // look-ahead uses the written letters (a silent e still makes the c of « glace » soft)
  const t = [...text.toLowerCase()];
  const vowel = (c: string | undefined) => !!c && 'aeiouyéèêëàâîïôûùœ'.includes(c);
  const soft = (c: string | undefined) => !!c && 'eiyéèêë'.includes(c);
  const is = (c: string | undefined, set: string) => !!c && set.includes(c);
  const ACCENT: Record<string, string> = { à: 'a', â: 'a', î: 'i', ï: 'i', ô: 'o', û: 'u', ù: 'u', ê: 'è', ë: 'è' };
  const MULTI = ['eau', 'oin', 'ain', 'ein', 'ill', 'ou', 'oi', 'eu', 'œu', 'au', 'ai', 'ei', 'ch', 'gn', 'ph', 'qu'];
  const NASAL = ['an', 'en', 'on', 'in', 'un', 'am', 'em', 'om', 'im'];
  const spoken = (i: number, n: number) => Array.from({ length: n }, (_, k) => i + k).every((k) => k < t.length && !mute.includes(k));
  const out: Segment[] = [];
  const push = (code: string, at: number, len: number, cluster = false) => out.push({ code, at, len, ...(cluster ? { cluster } : {}) });
  for (let i = 0; i < t.length; ) {
    const c = t[i];
    if (mute.includes(i)) {
      i++;
      continue;
    }
    const r = t.slice(i).join('');
    // « eil », « eille », « ail », « ouille »… : the vowel, then the sound « ill » (soleil, abeille, grenouille)
    const yod = ['euill', 'ouill', 'eill', 'aill', 'euil', 'ouil', 'eil', 'ail'].find((m) => r.startsWith(m) && (m.endsWith('ll') || r === m) && spoken(i, m.length - 2));
    if (yod) {
      const v = yod.slice(0, yod.indexOf('i'));
      push(v === 'e' ? 'è' : v, i, v.length);
      push('ill', i + v.length, yod.length - v.length);
      i += yod.length;
      continue;
    }
    // « ain », « ein », « oin » are one sound unless a vowel or another n follows (« laine », « moins »… )
    const multi = MULTI.find((m) => r.startsWith(m) && spoken(i, m.length) && !(m.length === 3 && m.endsWith('n') && (vowel(t[i + 3]) || t[i + 3] === 'n')));
    if (multi) {
      push(multi === 'œu' ? 'eu' : multi, i, multi.length);
      i += multi.length;
      continue;
    }
    // vowel + n (or m before b, p) is a nasal sound when no vowel and no second n / m follows
    const nasal = NASAL.find((m) => r.startsWith(m) && spoken(i, 2) && !vowel(t[i + 2]) && t[i + 2] !== m[1] && (m[1] === 'n' || is(t[i + 2], 'bp')));
    if (nasal) {
      push(nasal === 'un' ? 'in' : nasal, i, 2);
      i += 2;
      continue;
    }
    if (c === 'g' && t[i + 1] === 'u' && soft(t[i + 2])) {
      push('gu', i, 2);
      i += 2;
      continue;
    }
    if (is(c, 'bcdfglmnprst') && t[i + 1] === c && spoken(i, 2)) {
      push('double', i, 2);
      i += 2;
      continue;
    }
    if (c === 'c') push(soft(t[i + 1]) ? 'c doux' : 'c', i, 1);
    else if (c === 'ç') push('c doux', i, 1);
    else if (c === 'g') push(soft(t[i + 1]) ? 'g doux' : 'g', i, 1);
    else if (c === 's' && vowel(t[i - 1]) && vowel(t[i + 1])) push('s entre voyelles', i, 1);
    else push(ACCENT[c] ?? c, i, 1, is(c, 'lr') && is(t[i - 1], 'bcdfgptv') && !mute.includes(i - 1));
    i++;
  }
  return out;
}

// ---------------------------------------------------------------- prononciation (alphabet phonétique)
// La voix enregistrée (ElevenLabs, eleven_v4) lit l'alphabet phonétique écrit entre barres obliques
// (« /ʒi/. /ʁaf/. »). Les sons et les syllabes isolés lui sont donnés ainsi : écrits en lettres, elle les
// lisait comme des abréviations (« dra » : docteur), en anglais (« pin ») ou comme des interjections
// (« euh », « ouin »). Les mots, eux, restent écrits : dans une phrase, elle les dit bien.

const IPA: Record<string, string> = {
  a: 'a', i: 'i', o: 'o', u: 'y', é: 'e', è: 'ɛ', ai: 'ɛ', ei: 'ɛ', ou: 'u', oi: 'wa', eu: 'ø', au: 'o', eau: 'o',
  on: 'ɔ̃', om: 'ɔ̃', an: 'ɑ̃', en: 'ɑ̃', am: 'ɑ̃', em: 'ɑ̃', in: 'ɛ̃', ain: 'ɛ̃', ein: 'ɛ̃', im: 'ɛ̃', oin: 'wɛ̃',
  ch: 'ʃ', j: 'ʒ', gn: 'ɲ', ill: 'j', ph: 'f', qu: 'k', gu: 'g', c: 'k', 'c doux': 's', g: 'g', 'g doux': 'ʒ',
  's entre voyelles': 'z', z: 'z', k: 'k', x: 'ks', r: 'ʁ', y: 'i', w: 'w', h: '', m: 'm', n: 'n', l: 'l', p: 'p',
  t: 't', b: 'b', d: 'd', f: 'f', v: 'v', s: 's', q: 'k',
};
const VOWEL_CODES = new Set(['a', 'i', 'o', 'u', 'e', 'é', 'è', 'ai', 'ei', 'ou', 'oi', 'eu', 'au', 'eau', 'on', 'om', 'an', 'en', 'am', 'em', 'in', 'ain', 'ein', 'im', 'oin', 'y']);

/** a grapheme and how it is said */
interface Phone extends Segment {
  p: string;
  vowel: boolean;
}

/**
 * How each grapheme of a word (or of a syllable) is said, in IPA. `mute`: silent letters. `final`: the
 * letters end a word, so a last e is silent (« lise » /liz/). `guess`: no silent letter is marked, so a
 * last t, d, s, x, z or p after a vowel is taken as silent (« chat », « dent »), as in most words.
 */
function phones(text: string, mute: number[] = [], final = true, guess = false, cuts: number[] = []): Phone[] {
  const t = text.toLowerCase();
  const silent = [...mute];
  if (guess && final && t.length > 2 && 'tdsxzp'.includes(t[t.length - 1]) && /[aeiouéèênm]/.test(t[t.length - 2])) silent.push(t.length - 1);
  const segs = segments(t, silent);
  const out: Phone[] = [];
  segs.forEach((g, k) => {
    const next = segs[k + 1];
    const prev = out[k - 1];
    const after = segs.slice(k + 1);
    let vowel = VOWEL_CODES.has(g.code);
    let p = IPA[g.code] ?? g.code;
    if (g.code === 'double') p = IPA[t[g.at]] ?? t[g.at];
    // « ill » after a vowel is a glide (soleil), after a consonant it is « ij » (fille, gorille)
    if (g.code === 'ill') {
      vowel = !prev?.vowel;
      p = vowel ? 'ij' : 'j';
    }
    if (g.code === 'e' || g.code === 'eu') {
      const nextVowel = !!next && VOWEL_CODES.has(next.code);
      const closed = !!next && !nextVowel && (next.code === 'double' || after.length === 1 || !VOWEL_CODES.has(after[1].code));
      // a silent consonant at the end (« nez », « pied », « les ») makes e say « é »
      const beforeSilent = !next && silent.includes(g.at + 1) && g.at + 2 === t.length && t[g.at + 1] !== 's';
      if (g.code === 'eu') p = closed ? 'œ' : 'ø';
      // « les », « des », but « lunettes » /lynɛt/: a final silent s after another vowel keeps e silent
      else if (beforeSilent || (!next && 'sz'.includes(t[g.at + 1] ?? '') && silent.includes(g.at + 1) && !out.some((x) => x.vowel))) p = 'e';
      else if (!next && final && out.some((x) => x.vowel)) {
        p = '';
        vowel = false;
      }
      else if (closed) p = 'ɛ';
      else p = 'ə';
    }
    out.push({ ...g, p, vowel });
  });
  // i, u, ou before a vowel glide (« pluie » /plɥi/, « pingouin » /pɛ̃gwɛ̃/), but not across a cut
  // between written syllables (« pi-a-no », « li-on » are said in full)
  out.forEach((x, k) => {
    const next = out[k + 1];
    if (!next?.vowel || next.p === '' || next.p === 'ə' || cuts.includes(next.at)) return;
    if (x.code === 'i' || x.code === 'y') Object.assign(x, { p: 'j', vowel: false });
    else if (x.code === 'u' && next.code === 'i') Object.assign(x, { p: 'ɥ', vowel: false });
    else if (x.code === 'ou') Object.assign(x, { p: 'w', vowel: false });
  });
  return out;
}

/** The pronunciation of a syllable, a grapheme or a word, in IPA (see `phones()`). */
export function ipa(text: string, mute: number[] = [], final = true, guess = !mute.length): string {
  return phones(text, mute, final, guess)
    .map((x) => x.p)
    .join('');
}

/** A sound or a syllable said on its own, in IPA: a consonant alone gets a light « e » (« gne » /ɲə/). */
export function soundIpa(text: string): string {
  const FIX: Record<string, string> = { e: 'ə', in: 'ɛ̃', am: 'ɑ̃', om: 'ɔ̃', em: 'ɑ̃', im: 'ɛ̃' };
  if (FIX[text]) return FIX[text];
  const ph = phones(text, [], false);
  const p = ph.map((x) => x.p).join('');
  return ph.some((x) => x.vowel) ? p : `${p}ə`;
}

/**
 * The syllables the voice says for a written word: silent letters dropped, a part left without a vowel
 * joined to the one before (« va-li-s[e] » → va, lis), a doubled letter said once, with the next part
 * (« bal-lon » → ba, lon). Each is said as in the whole word (« mai-son » → mɛ, zɔ̃).
 * `chips`: which written parts light up with each spoken syllable.
 */
export function spokenSyllables(it: Item): { ipa: string; chips: number[] }[] {
  const parts = it.parts ?? [it.text];
  const starts: number[] = [];
  parts.reduce((at, p) => (starts.push(at), at + p.length), 0);
  const ph = phones(it.text, it.mute ?? [], true, false, starts);
  const partOf = (at: number) => starts.filter((x) => x <= at).length - 1;
  const groups: { ph: Phone[]; chips: number[] }[] = parts.map((_, k) => ({ ph: [], chips: [k] }));
  for (const x of ph) {
    let k = partOf(x.at);
    if (x.code === 'double' && partOf(x.at + 1) > k) k++;
    groups[k].ph.push(x);
  }
  const merged: typeof groups = [];
  for (const gr of groups) {
    const last = merged[merged.length - 1];
    if (last && !gr.ph.some((x) => x.vowel)) {
      last.ph.push(...gr.ph);
      last.chips.push(...gr.chips);
    } else merged.push({ ph: [...gr.ph], chips: [...gr.chips] });
  }
  return merged.map((gr) => ({ ipa: gr.ph.map((x) => x.p).join(''), chips: gr.chips }));
}

/**
 * Ce que dit Pixel quand un mot est trouvé : ses syllabes une à une, puis le mot dans une petite phrase
 * (seul et avec « ! », un mot répété prenait parfois un accent anglais : « sapine », « payne »).
 * Les syllabes et le mot s'allument à l'écran au moment où ils sont dits.
 */
export const syllableLine = (parts: string[], word: string): string => `${parts.join('… ')}… ça fait : ${word} !`;

/**
 * The syllables of a word as they are said (written letters of each spoken syllable: « va… lise… »),
 * or null when the word is said in one go (« lune »: one syllable out loud, said with its article).
 */
export function spokenParts(it: Item): string[] | null {
  if (!it.parts || it.parts.length < 2) return null;
  const sp = spokenSyllables(it);
  if (sp.length < 2) return null;
  return sp.map((x) => x.chips.map((k) => it.parts![k]).join(''));
}

/** The help « Écoute : va… lise. »: the syllables heard, or the word said in one go. */
export const listenLine = (it: Item): string => `Écoute : ${(spokenParts(it) ?? [it.speak]).join('… ')}.`;

/** What Pixel says when a word is found (see `syllableLine()` and `wordLine()`). */
export function foundLine(it: Item): string {
  const sp = spokenParts(it);
  if (sp) return syllableLine(sp, it.speak);
  return it.example ? `${it.speak}, ${it.example}.` : wordLine(it.speak);
}

/** l'article des mots d'une syllabe : « Le pain ! » sonne français, « Pain ! » seul sonnait anglais (choisi à l'oreille) */
export const ARTICLES: Record<string, string> = {
  chat: 'le', rat: 'le', loup: 'le', lit: 'le', riz: 'le', dé: 'le', nez: 'le', pied: 'le', fée: 'la', dent: 'la',
  gant: 'le', main: 'la', pain: 'le', feu: 'le', roi: 'le', bouche: 'la', douche: 'la', pomme: 'la', lune: 'la',
  vache: 'la', poule: 'la', cœur: 'le', mur: 'le', bol: 'le', fil: 'le', bus: 'le', lait: 'le', fleur: 'la',
  clé: 'la', bras: 'le', train: 'le', grue: 'la', mouche: 'la', loupe: 'la', quille: 'la', glace: 'la', plage: 'la',
  crabe: 'le', prise: 'la', arbre: "l'", livre: 'le', fraise: 'la',
};
/** un mot répété après une réussite, sans ses syllabes : avec son article, ou « Ça fait : panda ! » */
export function wordLine(word: string): string {
  const a = ARTICLES[word];
  if (!a) return `Ça fait : ${word} !`;
  return a.endsWith("'") ? `L'${word} !` : `${a[0].toUpperCase()}${a.slice(1)} ${word} !`;
}

/** Les petits mots des phrases, appris en entier (et pas encore déchiffrables pour certains). */
export const SIGHT_WORDS = ['le', 'la', 'les', 'un', 'une', 'il', 'elle', 'on', 'dans', 'sur', 'avec', 'mon', 'ma', 'des', 'du', 'pour', 'et', 'est', 'a', 'de', 'au', 'aux'];

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
  pw('bisou', '😘', 'bi-zou', 'ou', 'b'),
  pw('souris', '🐭', 'sou-ri', 'i', 's'),
  pw('kiwi', '🥝', 'ki-wi', 'i', 'k'),
  pw('taxi', '🚕', 'tak-si', 'i', 't'),
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
/**
 * Words to clap: not those ending in a silent e after a consonant (« bouche », « girafe »). Their count
 * depends on the region and on how carefully they are said: one syllable in standard French, two when
 * the e is said (« bou-che », as in the South and often at school). Eduscol advises to avoid them.
 */
export const CLAP_WORDS = PIC_WORDS.filter((w) => !w.noClap && w.syl.length <= 4 && !/[^aeiouyéèêë]es?$/.test(w.word));
/** Mots qui riment avec au moins un autre mot. */
export const RHYME_WORDS = PIC_WORDS.filter((w) => w.rime && PIC_WORDS.some((o) => o !== w && o.rime === w.rime));
/** Mots dont le premier son est partagé par au moins un autre mot. */
export const ONSET_WORDS = PIC_WORDS.filter((w) => w.onset && PIC_WORDS.some((o) => o !== w && o.onset === w.onset));

// ---------------------------------------------------------------- encodage
// « Écrire » avec des lettres : on entend, on compose. Les graphèmes à plusieurs lettres sont une
// seule tuile (ch, ou, on…), comme on les apprend.
export const GRAPHEMES = ['eau', 'ch', 'ou', 'on', 'an', 'in', 'oi', 'eu', 'au', 'ai', 'gn', 'ph'];

/**
 * Découpe « chapeau » en ch-a-p-eau, syllabe par syllabe (`parts`) : « do-mi-no » donne d-o-m-i-n-o,
 * pas un « in » à cheval sur deux syllabes. Une voyelle suivie de n ou m n'est un son nasal que si
 * aucune voyelle ne suit (« a-mi », « ca-na-pé »).
 */
export function graphemes(text: string, parts: string[] = [text]): string[] {
  const out: string[] = [];
  for (const part of parts) {
    let i = 0;
    while (i < part.length) {
      const g = GRAPHEMES.find((x) => part.startsWith(x, i) && !(/[nm]$/.test(x) && /[aeiouyéèêàâîôûh]/.test(part[i + x.length] ?? '')));
      out.push(g ?? part[i]);
      i += g ? g.length : 1;
    }
  }
  return out;
}

/** Mots simples, sans lettre muette, pour les premiers mots écrits. */
export const SPELL_WORDS: Item[] = [
  'mo-to', 'la-ma', 'vé-lo', 'so-fa', 'ju-do', 'pa-pa', 'do-do', 'bé-bé', 'ra-di-o', 'do-mi-no',
  'tu-tu', 'lo-to', 'su-mo', 'vi-dé-o', 'pu-ma', 'a-mi', 'jo-li', 'pi-ja-ma',
].map((w) => word(w));

/** Mots à écrire avec des sons à plusieurs lettres (une tuile par son : ch, ou, eau…), sans lettre muette. */
export const SPELL_WORDS_2: Item[] = ['ca-deau', 'ba-teau', 'cha-peau', 'cha-meau', 'co-chon', 'ca-fé', 'dau-phin', 'ca-mion', 'mou-ton', 'la-pin', 'bon-bon', 'cou-teau'].map((w) => word(w));

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

export type ReadingLevel = (
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
  | (LevelBase & { kind: 'riddle'; riddles: Riddle[] })
) & {
  /** ce que ce niveau apprend à lire (codes de `decode()`), pour vérifier les mots des niveaux suivants */
  teaches?: string[];
};

export type LevelKind = ReadingLevel['kind'];

/** Chapitres de la carte « Lire ». */
export const READING_CHAPTERS = ['La prairie des sons', 'La forêt des lettres', 'La mine des mots', 'La montagne des sons', 'La rivière des lettres', 'Le pont des sons accrochés', 'Le château des phrases'];

// L'ordre suit celui des méthodes syllabiques de CP : les sons qui se prolongent et les plus fréquents
// d'abord, puis les sons à deux lettres, les lettres qui changent de son, les autres écritures d'un
// son, et enfin les consonnes accrochées (voir docs/ETUDE.md).
export const READING_LEVELS: ReadingLevel[] = [
  // 1. la prairie des sons : conscience phonologique (MS, GS)
  { chapter: 0, name: 'Taper les syllabes', intro: 'Écoute le mot, et tape sur le tambour une fois pour chaque syllabe.', words: CLAP_WORDS, choices: 0, kind: 'clap' },
  { chapter: 0, name: 'Les rimes', intro: 'Écoute bien la fin des mots.', words: RHYME_WORDS, choices: 3, kind: 'rhyme' },
  { chapter: 0, name: 'Le premier son', intro: 'Écoute bien le début des mots.', words: ONSET_WORDS, choices: 3, kind: 'initial' },
  // 2. la forêt des lettres : lettres, sons et syllabes (GS)
  { chapter: 1, name: 'Les voyelles', intro: 'Écoute le son, et touche le bon bloc.', items: VOWELS, choices: 3, kind: 'sound', teaches: ['a', 'i', 'o', 'u', 'e', 'é'] },
  { chapter: 1, name: 'Grandes et petites lettres', intro: 'Les lettres peuvent être grandes ou petites.', items: VOWELS, choices: 5, mixedCase: true, kind: 'sound' },
  { chapter: 1, name: 'Premières syllabes', intro: 'Écoute bien la syllabe.', items: syllables(['m', 'l', 'r', 's']), choices: 4, kind: 'sound', teaches: ['m', 'l', 'r', 's'] },
  { chapter: 1, name: 'Nouvelles consonnes', intro: 'De nouvelles lettres arrivent !', items: syllables(['p', 't', 'n', 'v', 'f', 'ch', 'j']), choices: 4, similar: true, kind: 'sound', teaches: ['p', 't', 'n', 'v', 'f', 'ch', 'j'] },
  { chapter: 1, name: 'Syllabes jumelles', intro: 'Attention, elles se ressemblent !', items: syllables(['b', 'd', 'p', 'm', 'n', 't']), choices: 5, similar: true, kind: 'sound', teaches: ['b', 'd'] },
  // 3. la mine des mots : encodage et premiers mots (GS, CP)
  { chapter: 2, name: 'Écrire des syllabes', intro: 'Écoute la syllabe, et écris-la avec les lettres.', items: syllables(['m', 'l', 'r', 's', 'p', 't']), choices: 0, kind: 'spell' },
  { chapter: 2, name: 'Écouter des mots', intro: 'Écoute le mot, et trouve-le.', items: SIMPLE_WORDS, choices: 4, similar: true, kind: 'word' },
  { chapter: 2, name: 'Construire des mots', intro: 'Mets les syllabes dans le bon ordre pour construire le mot.', items: SIMPLE_WORDS, choices: 0, kind: 'build' },
  { chapter: 2, name: 'Lire sans aide', intro: "Maintenant, c'est toi qui lis ! Lis le mot, et touche la bonne image.", items: SIMPLE_PICTURE_WORDS, choices: 3, kind: 'read' },
  { chapter: 2, name: 'Écrire des mots', intro: 'Écoute le mot, et écris-le avec les lettres.', items: SPELL_WORDS, choices: 0, kind: 'spell' },
  { chapter: 2, name: 'Les lettres muettes', intro: 'Les lettres en gris ne se disent pas. Lis le mot, et touche la bonne image.', items: MUTE_WORDS, choices: 3, kind: 'read', teaches: ['muette'] },
  // 4. la montagne des sons : sons à deux lettres (CP)
  { chapter: 3, name: 'Sons à deux lettres', intro: 'Parfois, deux lettres font un seul son.', items: COMPLEX_SOUNDS, choices: 4, kind: 'sound', teaches: ['ou', 'on', 'an', 'in', 'oi', 'eu'] },
  { chapter: 3, name: 'Syllabes à deux lettres', intro: 'Écoute bien la syllabe.', items: COMPLEX_SYLLABLES, choices: 4, similar: true, kind: 'sound' },
  { chapter: 3, name: 'Écouter des mots avec ou, on, an', intro: 'Écoute le mot, et trouve-le.', items: SOUND_WORDS, choices: 4, similar: true, kind: 'word' },
  { chapter: 3, name: 'Lire des mots avec ou, on, an', intro: 'Lis le mot en entier, et touche la bonne image.', items: SOUND_WORDS, choices: 4, similar: true, kind: 'read' },
  // 5. la rivière des lettres : lettres qui changent de son, autres écritures d'un son (CP)
  { chapter: 4, name: 'Les sons k et g', intro: 'Le c, le k et le q font le même son. Écoute bien !', items: HARD_CG, choices: 4, similar: true, kind: 'sound', teaches: ['c', 'k', 'qu', 'g', 'gu'] },
  { chapter: 4, name: 'Le c et le g qui changent', intro: 'Devant le e et le i, le c et le g changent de son !', items: SOFT_CG, choices: 4, similar: true, kind: 'sound', teaches: ['c doux', 'g doux', 's entre voyelles', 'z'] },
  { chapter: 4, name: 'Un son, plusieurs écritures', intro: 'Un même son peut s’écrire de plusieurs façons.', items: SAME_SOUNDS, choices: 4, kind: 'sound', teaches: ['è', 'ai', 'ei', 'au', 'eau', 'en', 'am', 'em', 'ain', 'ein', 'om', 'im'] },
  { chapter: 4, name: 'Des sons plus rares', intro: 'Encore des sons écrits avec plusieurs lettres !', items: RARE_SOUNDS, choices: 4, kind: 'sound', teaches: ['gn', 'ill', 'ph', 'oin', 'double'] },
  { chapter: 4, name: 'Écouter des mots difficiles', intro: 'Écoute le mot, et trouve-le.', items: COMPLEX_WORDS, choices: 4, similar: true, kind: 'word' },
  { chapter: 4, name: 'Lire des mots difficiles', intro: 'Lis le mot en entier, et touche la bonne image.', items: COMPLEX_WORDS, choices: 4, similar: true, kind: 'read' },
  { chapter: 4, name: 'Écrire des mots difficiles', intro: 'Écoute le mot, et écris-le avec les lettres.', items: SPELL_WORDS_2, choices: 0, kind: 'spell' },
  // 6. le pont des sons accrochés : consonne + r ou l (CP)
  { chapter: 5, name: 'Les sons accrochés', intro: 'Deux consonnes peuvent s’accrocher : écoute bien !', items: CLUSTER_SYLLABLES, choices: 4, similar: true, kind: 'sound', teaches: ['consonnes accrochées'] },
  { chapter: 5, name: 'Construire des mots accrochés', intro: 'Mets les syllabes dans le bon ordre pour construire le mot.', items: CLUSTER_WORDS.filter((w) => w.parts!.length > 1), choices: 0, kind: 'build' },
  { chapter: 5, name: 'Lire des mots accrochés', intro: 'Lis le mot en entier, et touche la bonne image.', items: CLUSTER_WORDS, choices: 4, similar: true, kind: 'read' },
  // 7. le château des phrases : comprendre ce qu'on lit (CP)
  { chapter: 6, name: 'Les petits mots', intro: 'Des petits mots qu’on lit partout. Écoute, et trouve-le !', items: TOOL_WORDS, choices: 4, kind: 'word' },
  { chapter: 6, name: 'Vrai ou faux ?', intro: 'Le château des phrases ! Ici, c’est toi qui lis.', sentences: SENTENCES, kind: 'sentence' },
  { chapter: 6, name: 'Devinettes', intro: 'Des devinettes ! C’est toi qui lis.', riddles: RIDDLES, kind: 'riddle' },
];

/** Syllabes « pièges » pour le niveau Construire des mots. */
export const DECOY_SYLLABLES = syllables(['m', 'l', 'r', 's', 'p', 't', 'n', 'v', 'b', 'd']).map((i) => i.text);

/** Lettres qui se confondent, pour les pièges de l'encodage. */
export const LOOKALIKE: Record<string, string> = { b: 'dp', d: 'bq', p: 'bq', q: 'pd', m: 'n', n: 'mu', u: 'n', a: 'o', o: 'a', i: 'l', l: 'i', t: 'f', f: 't', é: 'e', e: 'é', s: 'z', v: 'f', r: 'l' };
