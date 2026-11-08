// Vérifie le contenu du jeu (héros dessinés, mots, niveaux) et explique les erreurs en français.
// Lancer : npm run check   (Node 22.6+ : les types TypeScript sont simplement ignorés)
import { COUNT_CHAPTERS, COUNT_LEVELS, DICE, NUMBER_WORDS, THINGS } from '../src/content/counting.ts';
import { HEROES, regions } from '../src/content/heroes.ts';
import { ARTICLES, decode, DECOY_SYLLABLES, graphemes, PIC_WORDS, READING_CHAPTERS, READING_LEVELS, SIGHT_WORDS } from '../src/content/reading.ts';
import { TIPS } from '../src/content/tips.ts';
import { GLYPHS, LETTER_SPEECH, WRITING_CHAPTERS, WRITING_LEVELS } from '../src/content/writing.ts';
import { existsSync, readdirSync, readFileSync } from 'node:fs';

const errors: string[] = [];
const err = (m: string) => errors.push(m);

// ---------------------------------------------------------------- héros
const ROWS = 14;
const COLS = 12;
const ids = new Set<string>();
for (const h of HEROES) {
  const who = `Héros « ${h.name} »`;
  if (ids.has(h.id)) err(`${who} : l'identifiant « ${h.id} » existe déjà`);
  ids.add(h.id);
  if (h.rows.length !== ROWS) err(`${who} : ${h.rows.length} lignes, il en faut ${ROWS}`);
  const zones = regions(h);
  if (zones.length === 0) err(`${who} : aucune couleur dans la palette`);
  if (zones.length > 6) err(`${who} : ${zones.length} couleurs, 6 au maximum (les chiffres restent simples)`);
  for (const z of zones) if (z.length !== 1 || '.ke'.includes(z)) err(`${who} : « ${z} » ne peut pas être une couleur (lettres réservées : . k e)`);
  h.rows.forEach((row, i) => {
    const cells = [...row];
    if (cells.length !== COLS) err(`${who}, ligne ${i + 1} : ${cells.length} cases, il en faut ${COLS}`);
    for (const ch of cells) if (!'.ke'.includes(ch) && !(ch in h.palette)) err(`${who}, ligne ${i + 1} : la lettre « ${ch} » n'est pas dans la palette`);
  });
  const drawn = h.rows.join('');
  for (const z of zones) if (!drawn.includes(z)) err(`${who} : la couleur « ${z} » (${h.palette[z].name}) n'est dessinée nulle part`);
  for (const [z, p] of Object.entries(h.palette)) {
    if (!/^#[0-9a-f]{6}$/i.test(p.color)) err(`${who} : couleur « ${z} » invalide (${p.color}), format attendu #rrggbb`);
    if (!p.name.trim()) err(`${who} : la couleur « ${z} » n'a pas de nom (la voix le dit)`);
  }
  if (!h.line.trim() || !h.title.trim()) err(`${who} : il manque le titre ou la phrase`);
}

// ---------------------------------------------------------------- lecture
// a word with a liaison just before a vowel makes the voice say « dans-z-école »
const LIAISON = /\b(dans|les|des|mes|tes|ses|nos|vos|aux|c'est|plus|très|deux|trois|six|dix|un|mon|ton|son|en|on|nous|vous|ils|elles|tout|chez|quand)\s+[aeiouyéèêàâîôûœ]/i;

const chapters = (name: string, levels: { chapter: number }[], titles: string[]) => {
  levels.forEach((l, i) => {
    if (l.chapter < 0 || l.chapter >= titles.length) err(`${name}, niveau ${i + 1} : chapitre ${l.chapter} inconnu`);
    if (i > 0 && l.chapter < levels[i - 1].chapter) err(`${name}, niveau ${i + 1} : les chapitres doivent se suivre`);
  });
};
chapters('Lire', READING_LEVELS, READING_CHAPTERS);
chapters('Compter', COUNT_LEVELS, COUNT_CHAPTERS);
chapters('Écrire', WRITING_LEVELS, WRITING_CHAPTERS);

READING_LEVELS.forEach((l, i) => {
  const where = `Lire, niveau ${i + 1} (${l.name})`;
  if (!l.intro.trim()) err(`${where} : consigne vide`);
  if (l.kind === 'clap' || l.kind === 'rhyme' || l.kind === 'initial') {
    if (l.words.length < 4) err(`${where} : trop peu d'images (${l.words.length})`);
    for (const w of l.words) {
      if (l.kind === 'clap' && (w.syl.length < 1 || w.syl.length > 4)) err(`${where} : « ${w.word} » doit avoir de 1 à 4 syllabes`);
      if (l.kind === 'rhyme' && !w.rime) err(`${where} : « ${w.word} » n'a pas de rime`);
      if (l.kind === 'initial' && !w.onset) err(`${where} : « ${w.word} » n'a pas de premier son`);
    }
    return;
  }
  if (l.kind === 'sentence') {
    if (l.sentences.filter((x) => x.truth).length < 3 || l.sentences.filter((x) => !x.truth).length < 3) err(`${where} : il faut au moins 3 phrases vraies et 3 fausses`);
    for (const x of l.sentences) if (!/[.!?]$/.test(x.text)) err(`${where} : « ${x.text} » doit finir par un point`);
    return;
  }
  if (l.kind === 'riddle') {
    for (const x of l.riddles) {
      if (new Set([x.pic, ...x.wrong]).size !== 3) err(`${where} : la devinette « ${x.text} » a deux images identiques`);
    }
    return;
  }
  const texts = l.items.map((it) => it.text);
  const dup = texts.filter((t, k) => texts.indexOf(t) !== k);
  if (dup.length) err(`${where} : en double : ${[...new Set(dup)].join(', ')}`);
  const free = l.kind === 'build' || l.kind === 'spell';
  if (!free && l.items.length < l.choices) err(`${where} : ${l.items.length} éléments pour ${l.choices} choix`);
  if (!free && l.choices < 2) err(`${where} : il faut au moins 2 choix`);
  for (const it of l.items) {
    if (!it.speak.trim()) err(`${where} : « ${it.text} » n'a rien à dire pour la voix`);
    if (l.kind !== 'sound' && l.kind !== 'spell' && (!it.parts || it.parts.join('') !== it.text)) err(`${where} : « ${it.text} » doit être découpé en syllabes (ex. mo-to)`);
    if (l.kind === 'build' && it.parts && it.parts.length > 4) err(`${where} : « ${it.text} » a plus de 4 syllabes (trop large pour l'écran)`);
    if (l.kind === 'spell' && graphemes(it.text).length > 6) err(`${where} : « ${it.text} » a trop de lettres pour l'écran`);
    if (l.kind === 'read' && !it.pic) err(`${where} : « ${it.text} » n'a pas d'image`);
    if (it.example && LIAISON.test(it.example)) err(`${where} : « ${it.example} » fait une liaison avant une voyelle (écrire « comme école », pas « comme dans école »)`);
  }
  if (l.kind === 'read') {
    const pics = l.items.map((it) => it.pic);
    if (new Set(pics).size !== pics.length) err(`${where} : deux mots ont la même image`);
  }
});

// déchiffrable : chaque mot à lire ne demande que des sons appris aux niveaux d'avant (ou à celui-ci)
{
  const known = new Set<string>();
  /** a word of a sentence: final silent letters as in most words (e, s, t, d, x, z, p, h), a silent h first */
  const sentenceWord = (w: string) => {
    const mute: number[] = [];
    if (w.startsWith('h')) mute.push(0);
    let end = w.length - 1;
    if (end > 1 && 'stdxzph'.includes(w[end])) mute.push(end--);
    if (end > 1 && w[end] === 'e' && !'aeiouéè'.includes(w[end - 1])) mute.push(end);
    return decode(w, mute);
  };
  READING_LEVELS.forEach((l, i) => {
    for (const c of l.teaches ?? []) known.add(c);
    const where = `Lire, niveau ${i + 1} (${l.name})`;
    const check = (what: string, codes: string[]) => {
      const unknown = [...new Set(codes.filter((c) => !known.has(c)))];
      if (unknown.length) err(`${where} : « ${what} » demande des sons pas encore appris : ${unknown.join(', ')}`);
    };
    if ('items' in l && l.kind !== 'sound') {
      for (const it of l.items) {
        if (it.mute && !known.has('muette')) err(`${where} : « ${it.text} » a une lettre muette avant le niveau des lettres muettes`);
        if (l.kind !== 'spell' || it.parts) check(it.text, decode(it.text, it.mute));
      }
    }
    // (« Vrai » et « Faux » sont écrits sur les boutons)
    const sentence = (text: string) => {
      for (const w of text.toLowerCase().split(/[^a-zàâçéèêëîïôûùœ']+/).filter(Boolean)) {
        const bare = w.replace(/^[a-z]'/, '');
        if (!bare || SIGHT_WORDS.includes(bare)) continue;
        check(w, sentenceWord(bare));
      }
    };
    if (l.kind === 'sentence') ['vrai', 'faux', ...l.sentences.map((x) => x.text)].forEach(sentence);
    if (l.kind === 'riddle') l.riddles.forEach((x) => sentence(x.text));
  });
}
// même son : deux blocs d'un même groupe ne doivent pas pouvoir être la seule bonne réponse ensemble
READING_LEVELS.forEach((l, i) => {
  if (!('items' in l) || l.kind !== 'sound') return;
  const groups = new Set(l.items.map((it) => it.group ?? it.text));
  if (groups.size < l.choices) err(`Lire, niveau ${i + 1} (${l.name}) : ${groups.size} sons différents pour ${l.choices} choix`);
});

// un mot d'une syllabe répété après une réussite a besoin de son article (« Le pain ! »)
READING_LEVELS.forEach((l, i) => {
  const need = (w: string) => !ARTICLES[w] && err(`Lire, niveau ${i + 1} (${l.name}) : « ${w} » (une syllabe) n'a pas d'article dans ARTICLES`);
  if ('items' in l && l.kind !== 'sound') for (const it of l.items) if (it.parts?.length === 1 && !it.example) need(it.text);
  if (l.kind === 'clap') for (const w of l.words) if (w.syl.length === 1) need(w.word);
});

// banque d'images (syllabes, rimes, premier son)
{
  const words = PIC_WORDS.map((w) => w.word);
  const dupW = words.filter((w, k) => words.indexOf(w) !== k);
  if (dupW.length) err(`Images : mots en double : ${[...new Set(dupW)].join(', ')}`);
  const pics = PIC_WORDS.map((w) => w.pic);
  const dupP = pics.filter((p, k) => pics.indexOf(p) !== k);
  if (dupP.length) err(`Images : la même image pour deux mots : ${[...new Set(dupP)].join(' ')}`);
  for (const w of PIC_WORDS) if (!w.syl.every((x) => x.trim())) err(`Images : « ${w.word} » a une syllabe vide`);
}
if (new Set(DECOY_SYLLABLES).size !== DECOY_SYLLABLES.length) err('Syllabes pièges : en double');

// ---------------------------------------------------------------- calcul
if (NUMBER_WORDS.length < 21) err('Il manque des nombres en lettres (jusqu’à vingt)');
COUNT_LEVELS.forEach((l, i) => {
  const where = `Compter, niveau ${i + 1} (${l.name})`;
  if (l.min < 1 || l.max > 20 || l.min >= l.max) err(`${where} : nombres de ${l.min} à ${l.max} (entre 1 et 20, min < max)`);
  const asks = ['count', 'flash', 'frame', 'hide', 'make10', 'add', 'problem', 'tens'].includes(l.mode);
  if (asks && (l.choices < 2 || l.choices > 6)) err(`${where} : ${l.choices} choix (de 2 à 6)`);
  if (l.mode === 'flash' && l.max > Math.max(...Object.keys(DICE).map(Number))) err(`${where} : pas de dé pour ${l.max}`);
  if ((l.mode === 'frame' || l.mode === 'make10') && l.max > 10) err(`${where} : le cadre de dix ne va pas au-delà de 10`);
  if (l.mode === 'make10' && l.max > 9) err(`${where} : il doit manquer au moins un bloc pour faire dix`);
  if (l.mode === 'add' && l.min < 2) err(`${where} : une addition demande au moins 2 blocs`);
  if (l.mode === 'hide' && l.min < 2) err(`${where} : il faut au moins 2 blocs pour en cacher`);
  if (l.mode === 'tens' && (l.min < 11 || l.max > 20)) err(`${where} : de 11 à 20`);
  if (l.mode === 'race' && (!l.die || l.die < 1 || l.die > 6 || l.die * 5 < l.max)) err(`${where} : dé de 1 à ${l.die}, impossible d'arriver en 5 tours`);
  if (!l.intro.trim()) err(`${where} : consigne vide`);
});
for (const t of THINGS) {
  if (/^[aeiouyéèêh]/i.test(t.many)) err(`Problèmes : « ${t.many} » commence par une voyelle (liaison)`);
  if (!t.gone.includes('{n}')) err(`Problèmes : « ${t.gone} » doit contenir {n}`);
}

// ---------------------------------------------------------------- écriture
const isPath = /^M[\d\s.,MLHVCSQTAZmlhvcsqtaz-]+$/;
for (const g of GLYPHS) {
  const who = `Tracé « ${g.char} » (${g.script})`;
  if (!g.strokes.length) err(`${who} : aucun trait`);
  for (const d of g.strokes) {
    if (!isPath.test(d)) err(`${who} : trait invalide « ${d} »`);
    const nums = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
    if (nums.some((n) => n < 0 || n > 100)) err(`${who} : un point sort de la boîte (0 à 100)`);
  }
  if (g.w < 30 || g.w > 100) err(`${who} : largeur ${g.w} (de 30 à 100)`);
  if (g.script !== 'dig' && !LETTER_SPEECH[g.char.toLowerCase()]) err(`${who} : pas de nom pour la voix`);
}
WRITING_LEVELS.forEach((l, i) => {
  const where = `Écrire, niveau ${i + 1} (${l.name})`;
  if (!l.intro.trim()) err(`${where} : consigne vide`);
  if (l.chars.length < 2) err(`${where} : au moins 2 lettres`);
  for (const c of l.chars) if (!GLYPHS.some((g) => g.script === l.script && g.char === c)) err(`${where} : pas de tracé pour « ${c} »`);
});

// ---------------------------------------------------------------- idées pour les parents
(['sounds', 'write', 'count'] as const).forEach((a) => {
  const n = a === 'sounds' ? READING_CHAPTERS.length : a === 'write' ? WRITING_CHAPTERS.length : COUNT_CHAPTERS.length;
  if (TIPS[a].length !== n) err(`Idées parents (${a}) : ${TIPS[a].length} listes pour ${n} chapitres`);
});

// ---------------------------------------------------------------- voix enregistrée
const voiceDir = new URL('../public/voice/', import.meta.url);
const clips: Record<string, string> = existsSync(new URL('../src/voice.json', import.meta.url)) ? JSON.parse(readFileSync(new URL('../src/voice.json', import.meta.url), 'utf8')) : {};
const files = new Set(existsSync(voiceDir) ? readdirSync(voiceDir) : []);
for (const [k, f] of Object.entries(clips)) if (!files.has(f)) err(`Voix : fichier manquant ${f} pour « ${k} »`);
const used = new Set(Object.values(clips));
for (const f of files) if (!used.has(f)) err(`Voix : public/voice/${f} n'est plus utilisé (relancer scripts/voice/generate.mjs)`);

if (errors.length) {
  console.error(`✗ ${errors.length} problème(s) dans le contenu :\n - ${errors.join('\n - ')}`);
  process.exit(1);
}
console.log(`✓ Contenu valide : ${HEROES.length} héros, ${READING_LEVELS.length} niveaux de lecture, ${WRITING_LEVELS.length} niveaux d'écriture, ${COUNT_LEVELS.length} niveaux de calcul, ${GLYPHS.length} tracés, ${Object.keys(clips).length} phrases enregistrées.`);
