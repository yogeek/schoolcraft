// Jeux de l'activité « Lire » (contenu : src/content/reading.ts).
//   clap     : la voix dit un mot (image) → taper une fois par syllabe sur le tambour
//   rhyme    : quelle image finit comme le mot ? · initial : laquelle commence pareil ?
//   sound    : la voix dit un son / une syllabe → toucher le bon bloc
//   word     : la voix dit un mot → toucher le mot écrit
//   build    : la voix dit un mot → poser les syllabes dans l'ordre
//   spell    : la voix dit une syllabe ou un mot → l'écrire avec des lettres (encodage)
//   read     : le mot est écrit, la voix ne le dit pas → toucher la bonne image
//   sentence : lire une phrase → vrai ou faux ?  · riddle : lire une devinette → la bonne image
// La voix ne lit jamais ce que l'enfant doit lire lui-même, sauf pour l'aider après une erreur.
import { sfx } from '../audio';
import {
  DECOY_SYLLABLES,
  graphemes,
  LOOKALIKE,
  PIC_WORDS,
  type Item,
  type PicWord,
  type ReadingLevel,
  type Riddle,
  type Sentence,
} from '../content/reading';
import type { Game, Round } from '../game';
import { pickWeighted } from '../state';
import { blockImg, h, rand, shuffle } from '../ui';

/** A block with a letter, syllable, word or picture on it. */
export function plaque(text: string, cls = '', label = text): HTMLButtonElement {
  return h('button', { class: `choice ${cls}`.trim(), 'aria-label': label }, blockImg('plaque'), h('span', { class: `glyph len${Math.min([...text].length, 4)}` }, text));
}

export function picture(pic: string, label: string, cls = ''): HTMLButtonElement {
  return h('button', { class: `choice ${cls}`.trim(), 'aria-label': label }, blockImg('plaque'), h('span', { class: 'glyph pic', 'aria-hidden': 'true' }, pic));
}

const slowly = { rate: 0.75 };

/** after two mistakes, the right answer shines (help grows with each mistake, then the child finds it) */
async function showAnswer(r: Round, el: Element | null | undefined): Promise<void> {
  if (!el || !r.open()) return;
  el.classList.add('hint');
  await r.say('Regarde celui qui brille !');
}

export function readingGame(level: ReadingLevel): Game {
  switch (level.kind) {
    case 'sound':
    case 'word':
    case 'read':
      return choiceGame(level);
    case 'build':
      return buildGame(level.items);
    case 'spell':
      return spellGame(level.items);
    case 'clap':
      return clapGame(level.words);
    case 'rhyme':
    case 'initial':
      return soundPicGame(level.words, level.kind, level.choices);
    case 'sentence':
      return sentenceGame(level.sentences);
    case 'riddle':
      return riddleGame(level.riddles);
  }
}

// ---------------------------------------------------------------- sound / word / read
/** How alike two items are: shared consonant / vowel / syllable. */
function likeness(a: Item, b: Item): number {
  if (a.parts && b.parts) {
    let s = a.parts.filter((p) => b.parts!.includes(p)).length * 2;
    if (a.parts[0] === b.parts[0]) s += 1;
    if (a.parts[a.parts.length - 1] === b.parts[b.parts.length - 1]) s += 2; // bateau / gâteau : il faut lire le début
    if (a.parts.length === b.parts.length) s += 1;
    return s;
  }
  const cons = (t: string) => t.replace(/[aiouéeny]+$/, '');
  const vow = (t: string) => t.slice(cons(t).length);
  let s = 0;
  if (cons(a.text) && cons(a.text) === cons(b.text)) s += 2;
  if (vow(a.text) === vow(b.text)) s += 2;
  // confusions visuelles classiques
  const pairs = ['bd', 'db', 'pb', 'bp', 'pq', 'mn', 'nm', 'ft', 'tf'];
  if (pairs.includes(a.text[0] + b.text[0])) s += 3;
  return s;
}

const statKey = (it: Item) => `snd:${it.text}`;

function choiceGame(level: Extract<ReadingLevel, { items: Item[] }>): Game {
  let target: Item = level.items[0];
  let prev: Item | undefined;
  let answer: HTMLElement | null = null;

  function distractors(n: number): Item[] {
    const others = level.items.filter((i) => i.text !== target.text);
    if (level.similar) {
      // half alike, half random, so it stays fair
      const alike = shuffle([...others]).sort((a, b) => likeness(target, b) - likeness(target, a));
      const strong = alike.slice(0, Math.ceil(n / 2));
      const rest = shuffle(others.filter((o) => !strong.includes(o))).slice(0, n - strong.length);
      return [...strong, ...rest];
    }
    return shuffle(others).slice(0, n);
  }

  async function after(r: Round): Promise<void> {
    r.bubble(`« ${target.text} »`);
    if (target.parts && target.parts.length > 1) await r.say(`${target.parts.join('… ')}… ${target.speak} !`, slowly);
    else if (target.example) await r.say(`${target.speak}, ${target.example}.`);
    else await r.say(`${target.speak} !`);
  }

  async function pick(r: Round, it: Item, el: HTMLElement): Promise<void> {
    if (!r.open()) return;
    sfx.unlock();
    if (it.text === target.text) return r.win(el, () => after(r));
    r.miss(el);
    if (level.kind === 'read') {
      await r.say(`Ça, c'est : ${it.speak}. Lis encore le mot !`);
      // after two mistakes, help by reading the syllables slowly; after three, show the picture
      if (r.misses === 2 && target.parts && r.open()) await r.say(`Écoute : ${target.parts.join('… ')}.`, { rate: 0.7 });
      if (r.misses >= 3) await showAnswer(r, answer);
    } else if (r.misses >= 2) {
      await r.say(`Celui-là, c'est : ${it.speak}.`);
      await showAnswer(r, answer);
    } else {
      await r.say(`Celui-là, c'est : ${it.speak}. Essaie encore !`);
      if (r.open()) await r.say(`Cherche : ${target.speak}.`);
    }
  }

  return {
    praise: level.kind === 'read' ? ['Bien lu !', 'Bravo, tu as lu le mot !', 'Super lecture !', 'Oui, bravo !'] : undefined,
    setup(r) {
      target = pickWeighted(level.items, statKey, prev);
      prev = target;
      r.choices.classList.add(`kind-${level.kind}`);
      if (level.kind === 'read') {
        r.bubble('Lis le mot !');
        r.stage.append(h('div', { class: 'word-card', lang: 'fr' }, target.text));
        r.choices.append(...shuffle([target, ...distractors(level.choices - 1)]).map((it) => {
          const b = picture(it.pic ?? '?', it.text);
          b.onclick = () => void pick(r, it, b);
          if (it === target) answer = b;
          return b;
        }));
      } else {
        r.bubble('Écoute bien…');
        r.choices.append(
          ...shuffle([target, ...distractors(level.choices - 1)]).map((it) => {
            const text = level.mixedCase && Math.random() < 0.5 ? it.text.toUpperCase() : it.text;
            const b = plaque(text);
            b.onclick = () => void pick(r, it, b);
            if (it === target) answer = b;
            return b;
          }),
        );
      }
      return statKey(target);
    },
    ask(r) {
      // never print the answer before the child finds it (except in "read" mode, where reading IS the task)
      switch (level.kind) {
        case 'sound':
          r.bubble('Écoute bien…');
          return r.say(`Touche le bloc qui fait le son : ${target.speak} !`);
        case 'word':
          r.bubble('Écoute bien…');
          return r.say(`Touche le mot : ${target.speak} !`);
        default:
          r.bubble('Lis le mot !');
          return r.say('Lis le mot, et touche la bonne image.');
      }
    },
  };
}

// ---------------------------------------------------------------- build words from syllables
function buildGame(items: Item[]): Game {
  let target: Item = items[0];
  let prev: Item | undefined;
  let built = 0;

  return {
    setup(r) {
      target = pickWeighted(items, statKey, prev);
      prev = target;
      built = 0;
      r.bubble('Construis le mot !');
      r.choices.classList.add('kind-build');
      const parts = target.parts!;
      const slots = h('div', { class: 'slots' });
      parts.forEach(() => slots.append(h('div', { class: 'slot-box' })));
      r.stage.append(slots);
      const decoys = shuffle(DECOY_SYLLABLES.filter((s) => !parts.includes(s))).slice(0, Math.max(2, 5 - parts.length));
      r.choices.append(
        ...shuffle([...parts, ...decoys]).map((s) => {
          const b = plaque(s);
          b.onclick = async () => {
            if (!r.open() || b.classList.contains('used')) return;
            sfx.unlock();
            if (s === parts[built]) {
              sfx.place();
              b.classList.add('used');
              const box = slots.children[built] as HTMLElement;
              box.replaceChildren(blockImg('plaque'), h('span', { class: `glyph len${Math.min(s.length, 4)}` }, s));
              box.classList.add('filled');
              built++;
              r.choices.querySelectorAll('.hint').forEach((x) => x.classList.remove('hint'));
              if (built === parts.length) {
                return r.win(box, async () => {
                  r.bubble(`« ${target.text} »`);
                  await r.say(`${parts.join('… ')}… ${target.speak} !`, slowly);
                });
              }
              void r.say(s, { rate: 0.8 });
            } else {
              r.miss(b);
              await r.say(`Celui-là, c'est : ${s}.`);
              if (r.misses >= 2) {
                // the next syllable shines
                const next = [...r.choices.querySelectorAll<HTMLElement>('.choice:not(.used)')].find((x) => x.getAttribute('aria-label') === parts[built]);
                await showAnswer(r, next);
              } else if (r.open()) await r.say(`Écoute : ${parts.join('… ')}.`, slowly);
            }
          };
          return b;
        }),
      );
      return statKey(target);
    },
    ask(r) {
      r.bubble('Construis le mot !');
      return r.say(`Construis le mot : ${target.speak} !`);
    },
  };
}

// ---------------------------------------------------------------- spell with letters (encoding)
function spellGame(items: Item[]): Game {
  let target: Item = items[0];
  let prev: Item | undefined;
  let built = 0;
  const key = (it: Item) => `spell:${it.text}`;
  const isWord = (it: Item) => !!it.parts && it.parts.length > 1;

  return {
    praise: ['Bien écrit !', 'Bravo, tu as écrit le mot !', 'Super !', 'Oui, bravo !'],
    setup(r) {
      target = pickWeighted(items, key, prev);
      prev = target;
      built = 0;
      const gs = graphemes(target.text);
      r.bubble(isWord(target) ? 'Écris le mot !' : 'Écris la syllabe !');
      r.choices.classList.add('kind-spell');
      const slots = h('div', { class: 'slots letters' });
      gs.forEach(() => slots.append(h('div', { class: 'slot-box' })));
      r.stage.append(slots);
      // pièges : lettres qui se ressemblent, puis d'autres lettres
      const decoys = new Set<string>();
      for (const x of gs) for (const l of LOOKALIKE[x] ?? '') if (!gs.includes(l)) decoys.add(l);
      for (const l of shuffle([...'mlrsptaioué'])) if (decoys.size < Math.max(3, 7 - gs.length) && !gs.includes(l)) decoys.add(l);
      const tiles = shuffle([...gs, ...shuffle([...decoys]).slice(0, Math.max(2, 7 - gs.length))]);
      r.choices.append(
        ...tiles.map((t) => {
          const b = plaque(t, 'letter');
          b.onclick = async () => {
            if (!r.open() || b.classList.contains('used')) return;
            sfx.unlock();
            if (t === gs[built]) {
              sfx.place();
              b.classList.add('used');
              const box = slots.children[built] as HTMLElement;
              box.replaceChildren(blockImg('plaque'), h('span', { class: 'glyph len1' }, t));
              box.classList.add('filled');
              built++;
              r.choices.querySelectorAll('.hint').forEach((x) => x.classList.remove('hint'));
              if (built === gs.length) {
                return r.win(box, async () => {
                  r.bubble(`« ${target.text} »`);
                  if (isWord(target)) await r.say(`${target.parts!.join('… ')}… ${target.speak} !`, slowly);
                  else await r.say(`${target.speak} !`);
                });
              }
            } else {
              r.miss(b);
              await r.say(`Écoute bien : ${target.speak}.`, slowly);
              // after two mistakes, the next letter shines
              if (r.misses >= 2 && r.open()) {
                const next = [...r.choices.querySelectorAll<HTMLElement>('.choice:not(.used)')].find((x) => x.getAttribute('aria-label') === gs[built]);
                next?.classList.add('hint');
              }
            }
          };
          return b;
        }),
      );
      return key(target);
    },
    ask(r) {
      r.bubble(isWord(target) ? 'Écris le mot !' : 'Écris la syllabe !');
      return r.say(isWord(target) ? `Écris le mot : ${target.speak} !` : `Écris la syllabe : ${target.speak} !`);
    },
  };
}

// ---------------------------------------------------------------- clap the syllables
function clapGame(words: PicWord[]): Game {
  let target: PicWord = words[0];
  let prev: PicWord | undefined;
  const key = (w: PicWord) => `clap:${w.word}`;

  return {
    praise: ['Bravo, bien tapé !', 'Super, tu as bien écouté !', 'Oui, bravo !', 'Génial !'],
    setup(r) {
      target = pickWeighted(words, key, prev);
      prev = target;
      let taps = 0;
      let tapSeq = 0;
      const n = target.syl.length;
      r.bubble('Tape les syllabes !');
      const card = h('button', { class: 'pic-card', 'aria-label': `${target.word} : réécouter` }, h('span', { 'aria-hidden': 'true' }, target.pic));
      card.onclick = () => void r.say(target.word);
      const beats = h('div', { class: 'beats', 'aria-live': 'polite' });
      r.stage.classList.add('clap-stage');
      r.stage.append(card, beats);
      const drum = h('button', { class: 'drum', 'aria-label': 'Tambour : taper une syllabe' }, h('span', { 'aria-hidden': 'true' }, '🥁'));
      r.choices.classList.add('kind-clap');
      r.choices.append(drum);

      const light = async (count: number) => {
        // say the syllables one by one, a beat lights up with each
        beats.replaceChildren();
        for (let i = 0; i < count; i++) beats.append(h('span', { class: 'beat' }));
        for (let i = 0; i < count; i++) {
          beats.children[i]?.classList.add('on');
          sfx.drum();
          await r.say(target.syl[i], { rate: 0.8 });
        }
      };

      drum.onclick = async () => {
        if (!r.open()) return;
        sfx.unlock();
        sfx.drum();
        drum.classList.remove('hit');
        void drum.offsetWidth;
        drum.classList.add('hit');
        if (taps >= 6) return;
        taps++;
        beats.append(h('span', { class: 'beat on' }));
        const my = ++tapSeq;
        // the child stops tapping (a young child thinks between two syllables): count the taps
        if (!(await r.wait(2200)) || my !== tapSeq || !r.open()) return;
        if (taps === n) {
          return r.win(drum, async () => {
            r.bubble(`${n} syllabe${n > 1 ? 's' : ''}`);
            await light(n);
            await r.say(`${target.word} ! ${n === 1 ? 'Une syllabe' : `${['', '', 'Deux', 'Trois', 'Quatre'][n]} syllabes`} !`);
          });
        }
        r.miss(drum);
        r.hold(true);
        await r.say(taps < n ? 'Il en manque ! Écoute :' : "C'est trop ! Écoute :");
        await light(n);
        await r.wait(400);
        beats.replaceChildren();
        taps = 0;
        r.hold(false);
        if (r.open()) await r.say('À toi ! Tape les syllabes.');
      };
      return key(target);
    },
    ask(r) {
      r.bubble('Tape les syllabes !');
      return r.say(`Tape les syllabes du mot : ${target.word} !`);
    },
  };
}

// ---------------------------------------------------------------- rhymes and first sounds
function soundPicGame(words: PicWord[], kind: 'rhyme' | 'initial', choices: number): Game {
  const prop = (w: PicWord) => (kind === 'rhyme' ? w.rime : w.onset);
  const key = (w: PicWord) => `${kind === 'rhyme' ? 'rime' : 'onset'}:${w.word}`;
  let model: PicWord = words[0];
  let answer: PicWord = words[0];
  let prev: PicWord | undefined;
  let options: { w: PicWord; el: HTMLElement }[] = [];
  const question = () => (kind === 'rhyme' ? `Quelle image finit comme : ${model.word} ?` : `Quelle image commence comme : ${model.word} ?`);

  /** the voice names each picture while it lights up (the child cannot read) */
  async function name(r: Round): Promise<void> {
    for (const o of options) {
      if (!r.open()) break;
      o.el.classList.add('naming');
      await r.say(o.w.word);
      o.el.classList.remove('naming');
      if (!(await r.wait(150))) break;
    }
    options.forEach((o) => o.el.classList.remove('naming'));
  }

  return {
    praise: kind === 'rhyme' ? ['Oui, ça rime !', 'Bravo, bien écouté !', 'Super oreille !'] : ['Oui, le même son !', 'Bravo, bien écouté !', 'Super oreille !'],
    setup(r) {
      model = pickWeighted(words, key, prev);
      prev = model;
      const same = PIC_WORDS.filter((w) => w !== model && prop(w) === prop(model));
      answer = rand(same);
      // wrong pictures: another sound, and not the same last (or first) syllable either
      const syl = (w: PicWord) => (kind === 'rhyme' ? w.syl[w.syl.length - 1] : w.syl[0]);
      const others = shuffle(PIC_WORDS.filter((w) => w !== model && prop(w) && prop(w) !== prop(model) && syl(w) !== syl(model)));
      const wrong: PicWord[] = [];
      for (const w of others) if (wrong.length < choices - 1 && !wrong.some((x) => prop(x) === prop(w))) wrong.push(w);
      r.bubble(kind === 'rhyme' ? 'Ça rime ?' : 'Le même début ?');
      const card = h('button', { class: 'pic-card', 'aria-label': `${model.word} : réécouter` }, h('span', { 'aria-hidden': 'true' }, model.pic));
      card.onclick = () => void r.say(model.word);
      r.stage.append(card);
      r.choices.classList.add('kind-pic');
      options = shuffle([answer, ...wrong]).map((w) => {
        const b = picture(w.pic, w.word);
        b.onclick = async () => {
          if (!r.open()) return;
          sfx.unlock();
          if (w === answer) {
            return r.win(b, async () => {
              r.bubble(kind === 'rhyme' ? 'Ça rime !' : 'Le même son !');
              await r.say(`${model.word}… ${answer.word}…`, slowly);
              await r.say(kind === 'rhyme' ? 'Ça finit pareil !' : 'Ça commence pareil !');
            });
          }
          r.miss(b);
          await r.say(`${model.word}… ${w.word}…`, slowly);
          if (r.misses >= 2) await showAnswer(r, options.find((o) => o.w === answer)?.el);
          else if (r.open()) await r.say(kind === 'rhyme' ? 'Ça ne finit pas pareil. Essaie encore !' : 'Ça ne commence pas pareil. Essaie encore !');
        };
        return { w, el: b };
      });
      r.choices.append(...options.map((o) => o.el));
      return key(model);
    },
    async ask(r) {
      r.bubble(kind === 'rhyme' ? 'Ça rime ?' : 'Le même début ?');
      r.hold(true);
      await r.say(`Écoute : ${model.word}. ${question()}`);
      r.hold(false);
      await name(r);
    },
  };
}

// ---------------------------------------------------------------- true or false
function sentenceGame(sentences: Sentence[]): Game {
  let target: Sentence = sentences[0];
  let prev: Sentence | undefined;
  const key = (s: Sentence) => `phrase:${s.text}`;

  return {
    praise: ['Bien lu !', 'Bravo, tu as compris !', 'Super lecture !'],
    setup(r) {
      target = pickWeighted(sentences, key, prev);
      prev = target;
      r.bubble('Lis la phrase !');
      r.stage.append(h('div', { class: 'word-card sentence', lang: 'fr' }, target.text));
      r.choices.classList.add('kind-truth');
      const make = (truth: boolean) => {
        const b = h('button', { class: `truth ${truth ? 'yes' : 'no'}`, 'aria-label': truth ? 'Vrai' : 'Faux' }, h('span', { class: 'truth-icon', 'aria-hidden': 'true' }, truth ? '👍' : '👎'), h('span', {}, truth ? 'Vrai' : 'Faux'));
        b.onclick = async () => {
          if (!r.open()) return;
          sfx.unlock();
          if (truth === target.truth) {
            return r.win(b, async () => {
              await r.say(target.text);
              await r.say(target.truth ? "C'est vrai !" : "C'est faux !");
            });
          }
          r.miss(b);
          await r.say('Écoute bien :');
          await r.say(target.text, slowly);
          if (r.open()) await r.say('Alors : vrai, ou faux ?');
        };
        return b;
      };
      r.choices.append(make(true), make(false));
      return key(target);
    },
    ask(r) {
      r.bubble('Lis la phrase !');
      return r.say('Lis la phrase. Est-ce que c’est vrai, ou faux ?');
    },
  };
}

// ---------------------------------------------------------------- riddles
function riddleGame(riddles: Riddle[]): Game {
  let target: Riddle = riddles[0];
  let prev: Riddle | undefined;
  const key = (x: Riddle) => `devinette:${x.pic}`;

  return {
    praise: ['Bien lu !', 'Bravo, tu as trouvé !', 'Super lecture !'],
    setup(r) {
      target = pickWeighted(riddles, key, prev);
      prev = target;
      r.bubble('Qui suis-je ?');
      r.stage.append(h('div', { class: 'word-card sentence', lang: 'fr' }, target.text));
      r.choices.classList.add('kind-pic');
      r.choices.append(
        ...shuffle([target.pic, ...target.wrong]).map((pic, i) => {
          const b = picture(pic, `image ${i + 1}`);
          b.onclick = async () => {
            if (!r.open()) return;
            sfx.unlock();
            if (pic === target.pic) return r.win(b, () => r.say(target.text));
            r.miss(b);
            // the child must read: first a nudge, then the voice reads it
            if (r.misses < 2) {
              await r.say('Relis bien la devinette !');
              return;
            }
            await r.say('Écoute bien :');
            await r.say(target.text, slowly);
          };
          return b;
        }),
      );
      return key(target);
    },
    ask(r) {
      r.bubble('Qui suis-je ?');
      return r.say('Lis la devinette, et touche la bonne image.');
    },
  };
}
