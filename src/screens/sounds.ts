// Activité « Les sons » : la voix dit un son, une syllabe ou un mot ; l'enfant touche le bon bloc.
// 6 niveaux : voyelles → voyelles majuscules/minuscules → syllabes (m, l, r, s) → autres consonnes
// → syllabes qui se ressemblent (b/d, p/b, m/n…) → mots.
import { say, sfx } from '../audio';
import { foxSVG } from '../pixel';
import { currentLevel, endSession } from '../levels';
import { pickWeighted, record, type BlockType } from '../state';
import { blockImg, giveBlock, h, levelButton, rand, rewardType, shuffle, SPEAKER_SVG, topBar, wait } from '../ui';
import { rewardScreen } from './reward';
import type { Ctx } from './types';

interface Item {
  /** what is printed on the block */
  text: string;
  /** what the voice says (spelled so speech engines say the sound, not the letter name) */
  speak: string;
  /** for words: syllables, read one by one after a success */
  parts?: string[];
  /** for vowels: an anchor word */
  example?: string;
}

const VOWELS: Item[] = [
  { text: 'a', speak: 'a', example: 'comme dans ananas' },
  { text: 'i', speak: 'i', example: 'comme dans souris' },
  { text: 'o', speak: 'o', example: 'comme dans moto' },
  { text: 'u', speak: 'u', example: 'comme dans tortue' },
  // « e » seul est lu « u » ou « eu » selon les voix ; « euh » donne le bon son
  { text: 'e', speak: 'euh', example: 'comme dans cheval' },
  { text: 'é', speak: 'é', example: 'comme dans école' },
];

const SYL_VOWELS = ['a', 'i', 'o', 'u', 'é'];
function syllables(consonants: string[]): Item[] {
  return consonants.flatMap((c) => SYL_VOWELS.map((v) => ({ text: c + v, speak: c + v })));
}

const WORDS: Item[] = [
  ['mo', 'to'],
  ['la', 'ma'],
  ['vé', 'lo'],
  ['so', 'fa'],
  ['ju', 'do'],
  ['pa', 'pa'],
  ['ma', 'mi'],
  ['ra', 'di', 'o'],
  ['do', 'mi', 'no'],
  ['to', 'ma', 'te'],
  ['sa', 'la', 'de'],
  ['ba', 'na', 'ne'],
  ['pi', 'ra', 'te'],
  ['ca', 'na', 'pé'],
  ['ca', 'fé'],
  ['ki', 'wi'],
  ['li', 'mo', 'na', 'de'],
  ['bé', 'bé'],
].map((parts) => {
  const text = parts.join('');
  return { text, speak: text, parts };
});

interface Level {
  name: string;
  items: Item[];
  choices: number;
  /** pick distractors that look/sound alike */
  similar?: boolean;
  /** show some letters in capitals */
  mixedCase?: boolean;
  kind: 'sound' | 'word';
}

const LEVELS: Level[] = [
  { name: 'Les voyelles', items: VOWELS, choices: 3, kind: 'sound' },
  { name: 'Grandes et petites lettres', items: VOWELS, choices: 5, mixedCase: true, kind: 'sound' },
  { name: 'Premières syllabes', items: syllables(['m', 'l', 'r', 's']), choices: 4, kind: 'sound' },
  { name: 'Nouvelles consonnes', items: syllables(['p', 't', 'n', 'v', 'f', 'ch', 'j']), choices: 4, similar: true, kind: 'sound' },
  { name: 'Syllabes jumelles', items: syllables(['b', 'd', 'p', 'm', 'n', 't']), choices: 5, similar: true, kind: 'sound' },
  { name: 'Lire des mots', items: WORDS, choices: 4, similar: true, kind: 'word' },
];
export const SOUNDS_MAX_LEVEL = LEVELS.length;

const ROUNDS = 6;
const PRAISE = ['Bravo !', 'Super !', 'Génial !', 'Oui, bien joué !', 'Tu es trop fort !', 'Excellent !'];

/** How alike two items are: shared consonant / vowel / syllable. */
function likeness(a: Item, b: Item): number {
  if (a.parts && b.parts) return a.parts.filter((p) => b.parts!.includes(p)).length + (a.parts[0] === b.parts[0] ? 1 : 0);
  const cons = (t: string) => t.slice(0, -1);
  const vow = (t: string) => t.slice(-1);
  let s = 0;
  if (cons(a.text) === cons(b.text)) s += 2;
  if (vow(a.text) === vow(b.text)) s += 2;
  // classic visual confusions
  const pairs = ['bd', 'db', 'pb', 'bp', 'pq', 'mn', 'nm', 'ft', 'tf'];
  if (pairs.includes(a.text[0] + b.text[0])) s += 3;
  return s;
}

export function soundsScreen(ctx: Ctx): void {
  const levelNo = currentLevel('sounds');
  const level = LEVELS[levelNo - 1];
  const ids = level.items.map((i) => i.text);
  let round = 0;
  let firstTry = 0;
  let missed = false;
  let streak = 0;
  let target: Item = level.items[0];
  let locked = false;
  const won: BlockType[] = [];

  const progress = h('div', { class: 'progress' });
  for (let i = 0; i < ROUNDS; i++) progress.append(h('span'));
  const bubble = h('div', { class: 'bubble' }, '');
  const choices = h('div', { class: `choices${level.kind === 'word' ? ' words' : ''}` });
  const replay = h('button', { class: 'btn-icon speaker', 'aria-label': 'Réécouter', html: SPEAKER_SVG });
  replay.onclick = () => void ask();

  ctx.root.append(
    h(
      'main',
      { class: 'screen activity' },
      topBar(() => ctx.go('home'), levelButton('sounds', levelNo, SOUNDS_MAX_LEVEL, LEVELS.map((l) => l.name), () => ctx.go('sounds'))),
      progress,
      h('div', { class: 'hero small' }, h('div', { class: 'fox-btn', html: foxSVG(90) }), bubble, replay),
      choices,
      h('div', { class: 'ground' }),
    ),
  );

  function ask(): Promise<void> {
    // never print the answer: the child has to listen
    bubble.textContent = 'Écoute bien…';
    return say(level.kind === 'word' ? `Touche le mot… ${target.speak} !` : `Touche le bloc qui fait… ${target.speak} !`);
  }

  function distractors(): Item[] {
    const others = level.items.filter((i) => i.text !== target.text);
    if (level.similar) {
      // half alike, half random, so it stays fair
      const alike = shuffle([...others]).sort((a, b) => likeness(target, b) - likeness(target, a));
      const n = level.choices - 1;
      const strong = alike.slice(0, Math.ceil(n / 2));
      const rest = shuffle(others.filter((o) => !strong.includes(o))).slice(0, n - strong.length);
      return [...strong, ...rest];
    }
    return shuffle(others).slice(0, level.choices - 1);
  }

  function nextRound(): void {
    if (round >= ROUNDS) return rewardScreen(ctx, won, 'sounds', endSession('sounds', firstTry, ROUNDS, SOUNDS_MAX_LEVEL));
    locked = false;
    missed = false;
    const id = pickWeighted(ids, round > 0 ? target.text : undefined);
    target = level.items.find((i) => i.text === id)!;
    choices.replaceChildren(...shuffle([target, ...distractors()]).map(makeChoice));
    void ask();
  }

  function makeChoice(item: Item): HTMLElement {
    const upper = level.mixedCase && Math.random() < 0.5;
    const text = upper ? item.text.toUpperCase() : item.text;
    const glyph = h('span', { class: `glyph len${Math.min(text.length, 4)}` }, text);
    const b = h('button', { class: 'choice', 'aria-label': text }, blockImg('plaque'), glyph);
    b.onclick = () => void pick(item, b);
    return b;
  }

  async function pick(item: Item, el: HTMLElement): Promise<void> {
    if (locked) return;
    sfx.unlock();
    const statId = `snd:${target.text}`;
    if (item.text === target.text) {
      locked = true;
      record(statId, !missed);
      if (!missed) firstTry++;
      streak++;
      sfx.good();
      el.classList.add('good');
      const t = rewardType(streak);
      won.push(t);
      giveBlock(t, el);
      progress.children[round]?.classList.add('done');
      round++;
      const praise = rand(PRAISE);
      bubble.textContent = `${praise} « ${target.text} »`;
      if (target.parts) await say(`${praise} ${target.parts.join('… ')}… ${target.speak} !`);
      else if (target.example) await say(`${praise} ${target.speak}, ${target.example}.`);
      else await say(`${praise} ${target.speak} !`);
      await wait(250);
      nextRound();
    } else {
      if (!missed) record(statId, false);
      missed = true;
      streak = 0;
      sfx.oops();
      el.classList.remove('shake');
      void el.offsetWidth; // restart the CSS animation
      el.classList.add('shake');
      bubble.textContent = 'Essaie encore !';
      await say(`Ça, c'est ${item.speak}. Essaie encore ! Cherche… ${target.speak}.`);
    }
  }

  void say(`Niveau ${levelNo} : ${level.name.toLowerCase()} ! Écoute bien.`)
    .then(() => wait(200))
    .then(nextRound);
}
