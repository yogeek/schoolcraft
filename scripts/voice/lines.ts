// Every sentence SchoolCraft can say, for the recorded voice (scripts/voice/generate.mjs).
//   node --experimental-strip-types scripts/voice/lines.ts   →  scripts/voice/lines.json
//
// Fixed sentences are read from the code (string literals given to `say()`); sentences built from
// content are listed here, template by template, like the games build them. A sentence missing
// from this list is simply spoken by the device's voice; in dev, `window.__missing` lists them.
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { COUNT_LEVELS, NUMBER_WORDS as W, THINGS } from '../../src/content/counting.ts';
import { HEROES } from '../../src/content/heroes.ts';
import { DECOY_SYLLABLES, PIC_WORDS, READING_LEVELS, foundLine, ipa, listenLine, soundIpa, spokenParts, spokenSyllables, wordLine, type Item, type PicWord } from '../../src/content/reading.ts';
import { LETTER_SPEECH, WRITING_LEVELS } from '../../src/content/writing.ts';
import { BLOCK_NAMES } from '../../src/pixel.ts';
import { pieces, sentences, voiceKey } from '../../src/voiceKey.ts';

const ROOT = new URL('../../', import.meta.url).pathname;
const lines = new Map<string, { text: string; tag?: string; say?: string; marks?: number[] }>();
/** add every sentence of a text */
function add(text: string, tag?: string): void {
  for (const s of sentences(text)) {
    const key = voiceKey(s);
    if (!key || !/[a-zà-ÿœ]/i.test(key)) continue;
    if (!lines.has(key)) lines.set(key, { text: s, tag });
  }
}
/** a sentence played piece by piece (« mouton… bateau… »): record each piece */
function addPieces(text: string): void {
  for (const s of sentences(text)) for (const p of pieces(s)) add(p);
}
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ---------------------------------------------------------------- fixed sentences from the code
const files = (d: string): string[] =>
  readdirSync(d).flatMap((f) => {
    const p = join(d, f);
    return statSync(p).isDirectory() ? (f === 'content' ? [] : files(p)) : f.endsWith('.ts') ? [p] : [];
  });
const PRAISE_LIST = /(?:PRAISE|COUNTED|praise)\s*[:=]\s*(?:[^[;]*\?\s*)?\[([^\]]*)\]/g;
const STRING = /(['"])((?:\\.|(?!\1).)*)\1/g;
/** a complete utterance, not a piece of a template (« le plus grand ») */
const complete = (s: string) => /^[A-ZÀ-ÖØ-Þ]/.test(s) && /[.!?:]$/.test(s);
function templates(code: string): void {
  for (const t of code.matchAll(/`([^`]*)`/g)) for (const s of sentences(t[1].replace(/\$\{[^}]*\}/g, '\u0000'))) if (!/[\u0000${}`]/.test(s) && complete(s)) add(s);
}
for (const f of files(join(ROOT, 'src'))) {
  const src = readFileSync(f, 'utf8');
  const spoken = new Set<string>();
  // say('…'), say(cond ? '…' : '…'), and variables given to say()
  for (const m of src.matchAll(/say\(([^;]{0,400})/g)) {
    const call = m[1].split(/\)\s*(?:;|\.then|,\s*bub)/)[0];
    for (const s of call.replace(/`[^`]*`/g, '').matchAll(STRING)) spoken.add(s[2]);
    const v = call.match(/^\s*([A-Za-z]\w*)\s*(?:[,)]|$)/)?.[1];
    if (v) for (const d of src.matchAll(new RegExp(`(?:const|let) ${v}\\b[^=]*=([^;]{0,700})`, 'g'))) for (const s of d[1].replace(/`[^`]*`/g, '').matchAll(STRING)) spoken.add(s[2]);
  }
  // template literals: their fixed sentences (« À moi ! » in `À moi ! Le dé dit : ${…}.`)
  for (const m of src.matchAll(/say\(([^;]{0,400})/g)) templates(m[1].split(/\)\s*(?:;|\.then|,\s*bub)/)[0]);
  for (const m of src.matchAll(/(?:const|let) (?:speech|story|s1|s2|q)\b[^=]*=([^;]{0,700})/g)) {
    templates(m[1]);
    for (const s of m[1].replace(/`[^`]*`/g, '').matchAll(STRING)) spoken.add(s[2]);
  }
  for (const m of src.matchAll(PRAISE_LIST)) for (const s of m[1].matchAll(STRING)) add(s[2].replace(/\\'/g, "'"), 'praise');
  for (const s of spoken) if (complete(s)) add(s.replace(/\\'/g, "'"));
}
// praise is said with joy
for (const s of ['Tu as réessayé, et tu as trouvé !', "Bravo, tu n'as rien lâché !", 'Oui ! En cherchant bien, tu as trouvé.', 'Bien joué, tu as continué !']) add(s, 'praise');

// « Super ! » said with joy took an English accent: in IPA, plainly
lines.set(voiceKey('Super !'), { text: 'Super !', tag: 'praise', say: '/sypɛʁ/ !' });

// ---------------------------------------------------------------- sessions
const maxLevel = Math.max(READING_LEVELS.length, WRITING_LEVELS.length, COUNT_LEVELS.length);
for (const n of range(1, maxLevel)) add(`Niveau ${n}.`);
for (const l of [...READING_LEVELS, ...WRITING_LEVELS, ...COUNT_LEVELS]) add(l.intro);
add('Petite révision !');

// ---------------------------------------------------------------- reward screen
for (const n of range(0, 12)) add(`Tu as gagné ${n} bloc${n > 1 ? 's' : ''} !`);
for (const n of range(2, maxLevel)) {
  add(`Et tu passes au niveau ${n} !`);
  add(`On passe au niveau ${n}.`);
}
for (const v of ['lire', 'écrire', 'compter']) add(`Maintenant, on va ${v} !`);
add('Bien joué !');
add('Tu as réussi le dernier niveau !');
add("Encore un peu d'entraînement et tu passeras au niveau suivant !");
add("Encore un peu d'entraînement et tu réussiras ce niveau !");

// ---------------------------------------------------------------- chest, build, heroes
const specials = ['brick', 'leaves', 'flower', 'crystal'] as const;
for (const a of specials) {
  add(`Des blocs spéciaux pour ta maison : ${BLOCK_NAMES[a]} !`);
  for (const b of specials) if (a !== b) add(`Des blocs spéciaux pour ta maison : ${BLOCK_NAMES[a]}, et ${BLOCK_NAMES[b]} !`);
}
add("Et de l'or !");
for (const name of Object.values(BLOCK_NAMES)) {
  add(cap(name));
  add(`Tu n'as pas encore de blocs ${/^[aeiouéh]/.test(name) ? `d'${name}` : `de ${name}`}.`);
}
const NUMBERS = W.slice(0, 10);
for (const hero of HEROES) {
  add(`Tu as réveillé ${hero.name}, ${hero.title} !`);
  add(`${hero.name}, ${hero.title} !`);
  add(hero.line);
  for (const z of Object.values(hero.palette)) add(/^[aeiouyéèêh]/i.test(z.name) ? `L'${z.name}.` : `Le ${z.name}.`);
}
for (const n of range(1, 9)) {
  add(`Touche les cases avec le chiffre : ${NUMBERS[n]} !`);
  add(`Ici, c'est le chiffre ${NUMBERS[n]}.`);
  add(`Cherche le chiffre ${NUMBERS[n]} !`);
  if (n > 1) add(`Encore ${NUMBERS[n]} couleurs.`);
}

// ---------------------------------------------------------------- Lire
// Sounds, syllables and words said alone are sent in IPA between slashes (`say`): written out, the
// voice read « no » as « numéro », « xi » as « onze », « che » as « tché », and many syllables as
// English. The app's text stays the key; `marks` are the characters where each syllable and the word
// start, so the screen lights them as they are said (games/reading.ts: sayWord(), the clap).
const LEAD = '[calmly] ';
/** one sentence, with what the voice is sent */
function addSay(text: string, say: string, marks?: number[], tag?: string): void {
  // a text that starts with a slash made the voice say « slash »: a tone tag before it does not
  if (say.startsWith('/')) {
    say = `${LEAD}${say}`;
    marks = marks?.map((m) => m + LEAD.length);
  }
  const key = voiceKey(text);
  if (!lines.has(key)) lines.set(key, { text, tag, say, ...(marks ? { marks } : {}) });
}
/** « /va/. /liz/. » then the rest: the marks at each syllable, and at `word` in the rest */
function sylSay(ipas: string[], head: string, tail: string, word?: string): { say: string; marks: number[] } {
  let say = head;
  const marks: number[] = [];
  for (const x of ipas) {
    marks.push(say.length + 1); // the first sound, after the slash
    say += `/${x}/. `;
  }
  say = (say + tail).trim();
  if (word) marks.push(say.lastIndexOf(word));
  return { say, marks };
}
const sound = (it: Item) => `/${soundIpa(it.text)}/`;
const wordIpa = (it: Item) => `/${ipa(it.text, it.mute ?? [])}/`;
const sylIpa = (p: string) => `/${soundIpa(p)}/`;
/** a word found: its syllables heard, then « Ça fait : sapin ! »; or the word with its article */
function found(it: Item): void {
  const sp = spokenParts(it);
  if (sp) {
    const { say, marks } = sylSay(spokenSyllables(it).map((x) => x.ipa), '', `Ça fait : ${it.speak} !`, it.speak);
    addSay(foundLine(it), say, marks);
  } else add(foundLine(it));
}
/** the help « Écoute : va… lise. » */
function listen(it: Item): void {
  if (spokenParts(it)) {
    const { say, marks } = sylSay(spokenSyllables(it).map((x) => x.ipa), 'Écoute : ', '');
    addSay(listenLine(it), say, marks);
  }
  else addSay(listenLine(it), `Écoute : ${wordIpa(it)}.`);
}
for (const level of READING_LEVELS) {
  if ('items' in level) {
    for (const it of level.items) {
      const s = it.speak;
      switch (level.kind) {
        case 'sound':
          // a sound or a syllable: the voice says « le son : /…/ » (alone, it read « no » as « numéro »)
          addSay(`Touche le bloc qui fait le son : ${s} !`, `Touche le bloc qui fait le son : ${sound(it)} !`);
          addSay(`Celui-là, c'est : ${s}.`, `Celui-là, c'est le son : ${sound(it)}.`);
          addSay(`Cherche : ${s}.`, `Cherche le son : ${sound(it)}.`);
          if (it.example) addSay(`${s}, ${it.example}.`, `${sound(it)}, ${it.example}.`);
          else addSay(`${s} !`, `Le son : ${sound(it)} !`);
          break;
        case 'word':
          found(it);
          listen(it);
          addSay(`Touche le mot : ${s} !`, `Touche le mot : ${wordIpa(it)} !`);
          addSay(`Celui-là, c'est : ${s}.`, `Celui-là, c'est : ${wordIpa(it)}.`);
          addSay(`Cherche : ${s}.`, `Cherche : ${wordIpa(it)}.`);
          if (it.example) add(`${s}, ${it.example}.`);
          break;
        case 'read':
          found(it);
          listen(it);
          addSay(`Ça, c'est : ${s}.`, `Ça, c'est : ${wordIpa(it)}.`);
          break;
        case 'build':
          found(it);
          listen(it);
          add(`Construis le mot : ${s} !`);
          for (const p of it.parts!) {
            addSay(`Celui-là, c'est : ${p}.`, `Celui-là, c'est : ${sylIpa(p)}.`);
            addSay(`Cherche : ${p}.`, `Cherche : ${sylIpa(p)}.`);
          }
          break;
        case 'spell':
          if (it.parts && it.parts.length > 1) {
            found(it);
            add(`Écris le mot : ${s} !`);
            addSay(`Écoute bien : ${s}.`, `Écoute bien : ${wordIpa(it)}.`);
          } else {
            addSay(`Écris la syllabe : ${s} !`, `Écris la syllabe : ${sound(it)} !`);
            addSay(`Écoute bien : ${s}.`, `Écoute bien : ${sound(it)}.`);
            addSay(`${s} !`, `Le son : ${sound(it)} !`);
          }
          break;
      }
    }
  }
  if (level.kind === 'build') for (const d of DECOY_SYLLABLES) addSay(`Celui-là, c'est : ${d}.`, `Celui-là, c'est : ${sylIpa(d)}.`);
  if (level.kind === 'sentence') for (const s of level.sentences) add(s.text);
  if (level.kind === 'riddle') for (const x of level.riddles) add(x.text);
}
for (const n of ['Une syllabe !', 'Deux syllabes !', 'Trois syllabes !', 'Quatre syllabes !']) add(n);
// pictures: named one by one, compared piece by piece (« mouton… bateau… »), in IPA from their oral
// syllables (« ca-nard », not the d of « canard »); the clap says the syllables after « Écoute : »
const picIpa = (w: PicWord) => w.syl.map((s, i) => ipa(s, [], i === w.syl.length - 1, i === w.syl.length - 1));
const picSay = (w: PicWord) => `/${picIpa(w).join('')}/`;
for (const w of PIC_WORDS) {
  addSay(w.word, `${picSay(w)}.`);
  addSay(`${w.word}…`, `${picSay(w)}.`);
  addSay(`Écoute : ${w.word}.`, `Écoute : ${picSay(w)}.`);
}
for (const level of READING_LEVELS) {
  if (level.kind !== 'clap' && level.kind !== 'rhyme' && level.kind !== 'initial') continue;
  for (const w of level.words) {
    if (level.kind === 'clap') {
      add(`Tape les syllabes du mot : ${w.word} !`);
      add(wordLine(w.word));
      if (w.syl.length > 1) {
        const { say, marks } = sylSay(picIpa(w), 'Écoute : ', '');
        addSay(`Écoute : ${w.syl.join('… ')}.`, say, marks);
      }
    } else {
      const q = level.kind === 'rhyme' ? 'Quelle image finit comme' : 'Quelle image commence comme';
      addSay(`${q} : ${w.word} ?`, `${q} : ${picSay(w)} ?`);
    }
  }
}

// ---------------------------------------------------------------- Écrire
// letter names the voice got wrong when written (« euh » hesitant, « k » English): in IPA
const LETTER_IPA: Record<string, string> = { euh: 'ə', k: 'ka', q: 'ky', z: 'zɛd' };
for (const l of Object.values(LETTER_SPEECH)) {
  const x = LETTER_IPA[l.name];
  if (x) {
    addSay(`Voici la lettre : ${l.name}, comme ${l.ex}.`, `Voici la lettre : /${x}/, comme ${l.ex}.`);
    addSay(`${l.name}, comme ${l.ex} !`, `/${x}/, comme ${l.ex} !`);
  } else {
    add(`Voici la lettre : ${l.name}, comme ${l.ex}.`);
    add(`${l.name}, comme ${l.ex} !`);
  }
}
for (const n of range(0, 9)) add(`Voici le chiffre : ${W[n]}.`);

// ---------------------------------------------------------------- Compter
// each template only with the numbers the games can use
const each = (a: number, b: number, f: (n: number) => string) => range(a, b).forEach((n) => add(f(n)));
addSay(W[7], '/sɛt/.'); // alone, « sept » was read « septembre »
each(1, 20, (n) => W[n]); // counting one by one, the race, 11 to 20
each(0, 9, (n) => `${W[n]} !`); // a die roll, a traced digit
each(1, 10, (n) => `Ça, c'est le nombre ${W[n]}.`);
each(1, 10, (n) => `Ça, c'est ${W[n]}.`);
each(1, 6, (n) => `Ce tas a ${W[n]} blocs.`);
each(1, 10, (n) => `Il y a ${W[n]} bloc${n > 1 ? 's' : ''} !`);
each(3, 10, (n) => `Il y a ${W[n]} blocs.`);
each(3, 10, (n) => `Il y avait ${W[n]} blocs.`);
each(1, 9, (n) => `Il en reste ${W[n]} dehors.`);
each(1, 9, (n) => (n === 1 ? 'Un caché !' : `${cap(W[n])} cachés !`));
each(1, 19, (n) => `Tu es sur le ${W[n]}.`);
each(1, 6, (n) => `Tu avances de ${W[n]}.`);
each(1, 6, (n) => `Le dé dit : ${W[n]}.`);
add('Tu es sur le départ.');
add('Dix…');
for (const x of ['le plus grand', 'le plus petit']) {
  add(`Cherche ${x} !`);
  add(`Touche le nombre ${x} !`);
}
for (const x of ['le plus', 'le moins']) {
  add(`Cherche le tas qui en a ${x} !`);
  add(`Touche le tas qui a ${x} de blocs !`);
}
for (const big of range(1, 10))
  for (const small of range(1, big - 1)) {
    add(`${W[big]}, c'est plus que ${W[small]} !`);
    add(`${W[small]}, c'est moins que ${W[big]} !`);
  }
for (const t of range(6, 10)) add(`Cinq… et ${W[t - 5]}… ${W[t]} !`);
for (const n of range(3, 10)) for (const k of range(1, n - 1)) add(`${W[n - k]} et ${W[k]}, ça fait ${W[n]}.`);
for (const n of range(1, 9)) add(`${W[n]} et ${W[10 - n]}, ça fait dix !`);
for (const t of range(2, 10))
  for (const a of range(1, t - 1)) {
    add(`${W[a]}… plus… ${W[t - a]}… ça fait : ${W[t]} !`);
    add(`Combien font : ${W[a]}… plus… ${W[t - a]} ?`);
  }
for (const n of range(11, 19)) add(`Dix et ${W[n - 10]} : ${W[n]} !`);
// story problems
const one = (n: number, fem: boolean) => (n === 1 ? (fem ? 'une' : 'un') : W[n]);
for (const th of THINGS) {
  for (const a of range(1, 10)) add(`Pixel a ${a === 1 ? th.one : `${W[a]} ${th.many}`}.`);
  for (const b of range(1, 4)) {
    add(th.gone.replace('{n}', one(b, th.fem)));
    add(`Il en trouve ${one(b, th.fem)} de plus.`);
  }
  add(`Compte les ${th.many} qui restent !`);
  add(`Compte ${th.fem ? 'toutes' : 'tous'} les ${th.many} !`);
}
for (const a of range(1, 10))
  for (const b of range(1, 4)) {
    if (a + b <= 10) add(`${W[a]} plus ${W[b]}, ça fait ${W[a + b]} !`);
    if (a - b >= 1) add(`${W[a]} moins ${W[b]}, ça fait ${W[a - b]} !`);
  }

const out = [...lines].map(([key, v]) => ({ key, text: v.text, ...(v.tag ? { tag: v.tag } : {}), ...(v.say ? { say: v.say } : {}), ...(v.marks ? { marks: v.marks } : {}) }));
writeFileSync(join(ROOT, 'scripts/voice/lines.json'), JSON.stringify(out, null, 1) + '\n');
const chars = out.reduce((a, b) => a + b.text.length, 0);
console.log(`${out.length} phrases, ${chars} caractères → scripts/voice/lines.json`);
