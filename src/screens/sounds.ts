// Activité « Lire » : 12 niveaux, des voyelles jusqu'à la lecture de mots en autonomie.
// Les contenus sont dans src/content/reading.ts.
//   sound : la voix dit un son / une syllabe → toucher le bon bloc
//   word  : la voix dit un mot → toucher le mot écrit
//   build : la voix dit un mot → poser les syllabes dans l'ordre
//   read  : le mot est écrit, la voix ne le dit pas → toucher la bonne image
import { say, sfx } from '../audio';
import { DECOY_SYLLABLES, READING_LEVELS, type Item } from '../content/reading';
import { currentLevel, endSession } from '../levels';
import { foxSVG } from '../pixel';
import { pickWeighted, record, type BlockType } from '../state';
import { blockImg, giveBlock, h, levelButton, rand, rewardType, shuffle, SPEAKER_SVG, topBar, wait } from '../ui';
import { rewardScreen } from './reward';
import type { Ctx } from './types';

export const SOUNDS_MAX_LEVEL = READING_LEVELS.length;
export const SOUNDS_LEVEL_NAMES = READING_LEVELS.map((l) => l.name);

const ROUNDS = 6;
const PRAISE = ['Bravo !', 'Super !', 'Génial !', 'Oui, bien joué !', 'Tu es trop fort !', 'Magnifique !'];

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

export function soundsScreen(ctx: Ctx): void {
  const levelNo = currentLevel('sounds');
  const level = READING_LEVELS[levelNo - 1];
  const ids = level.items.map((i) => i.text);
  let round = 0;
  let firstTry = 0;
  let misses = 0;
  let streak = 0;
  let target: Item = level.items[0];
  let locked = false;
  let built = 0; // build mode: syllables already placed
  const won: BlockType[] = [];

  const progress = h('div', { class: 'progress' });
  for (let i = 0; i < ROUNDS; i++) progress.append(h('span'));
  const bubble = h('div', { class: 'bubble' }, '');
  const stage = h('div', { class: 'stage' });
  const choices = h('div', { class: `choices kind-${level.kind}` });
  const replay = h('button', { class: 'btn-icon speaker', 'aria-label': 'Réécouter', html: SPEAKER_SVG });
  replay.onclick = () => void ask();

  ctx.root.append(
    h(
      'main',
      { class: 'screen activity' },
      topBar(() => ctx.go('home'), levelButton('sounds', levelNo, SOUNDS_MAX_LEVEL, SOUNDS_LEVEL_NAMES, () => ctx.go('sounds'))),
      progress,
      h('div', { class: 'hero small' }, h('div', { class: 'fox-btn', html: foxSVG(90) }), bubble, replay),
      stage,
      choices,
      h('div', { class: 'ground' }),
    ),
  );

  function ask(): Promise<void> {
    // never print the answer before the child finds it (except in "read" mode, where reading IS the task)
    switch (level.kind) {
      case 'sound':
        bubble.textContent = 'Écoute bien…';
        return say(`Touche le bloc qui fait le son : ${target.speak} !`);
      case 'word':
        bubble.textContent = 'Écoute bien…';
        return say(`Touche le mot : ${target.speak} !`);
      case 'build':
        bubble.textContent = 'Construis le mot !';
        return say(`Construis le mot : ${target.speak} !`);
      case 'read':
        bubble.textContent = 'Lis le mot !';
        return say('Lis le mot, et touche la bonne image.');
    }
  }

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

  function nextRound(): void {
    if (round >= ROUNDS) return rewardScreen(ctx, won, 'sounds', endSession('sounds', firstTry, ROUNDS, SOUNDS_MAX_LEVEL));
    locked = false;
    misses = 0;
    built = 0;
    const id = pickWeighted(ids, round > 0 ? target.text : undefined);
    target = level.items.find((i) => i.text === id)!;
    stage.replaceChildren();

    if (level.kind === 'build') {
      const parts = target.parts!;
      const slots = h('div', { class: 'slots' });
      parts.forEach(() => slots.append(h('div', { class: 'slot-box' })));
      stage.append(slots);
      const decoys = shuffle(DECOY_SYLLABLES.filter((s) => !parts.includes(s))).slice(0, Math.max(2, 5 - parts.length));
      choices.replaceChildren(...shuffle([...parts, ...decoys]).map((s) => makeChoice(s, () => void pickSyllable(s))));
    } else if (level.kind === 'read') {
      stage.append(h('div', { class: 'word-card' }, target.text));
      choices.replaceChildren(...shuffle([target, ...distractors(level.choices - 1)]).map((it) => makePicture(it)));
    } else {
      choices.replaceChildren(
        ...shuffle([target, ...distractors(level.choices - 1)]).map((it) => {
          const text = level.mixedCase && Math.random() < 0.5 ? it.text.toUpperCase() : it.text;
          return makeChoice(text, (el) => void pick(it, el));
        }),
      );
    }
    void ask();
  }

  function makeChoice(text: string, onPick: (el: HTMLElement) => void): HTMLElement {
    const b = h('button', { class: 'choice', 'aria-label': text }, blockImg('plaque'), h('span', { class: `glyph len${Math.min(text.length, 4)}` }, text));
    b.onclick = () => onPick(b);
    return b;
  }

  function makePicture(it: Item): HTMLElement {
    const b = h('button', { class: 'choice', 'aria-label': it.text }, blockImg('plaque'), h('span', { class: 'glyph pic' }, it.pic ?? '?'));
    b.onclick = () => void pick(it, b);
    return b;
  }

  async function success(el: HTMLElement): Promise<void> {
    locked = true;
    record(`snd:${target.text}`, misses === 0);
    if (misses === 0) firstTry++;
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
    // praise and item are said separately: no liaison can glue them together
    await say(praise);
    if (target.parts && target.parts.length > 1) await say(`${target.parts.join('… ')}… ${target.speak} !`, { rate: 0.75 });
    else if (target.example) await say(`${target.speak}, ${target.example}.`);
    else await say(`${target.speak} !`);
    await wait(250);
    nextRound();
  }

  function oops(el: HTMLElement): void {
    if (misses === 0) record(`snd:${target.text}`, false);
    misses++;
    streak = 0;
    sfx.oops();
    el.classList.remove('shake');
    void el.offsetWidth; // restart the CSS animation
    el.classList.add('shake');
    bubble.textContent = 'Essaie encore !';
  }

  async function pick(it: Item, el: HTMLElement): Promise<void> {
    if (locked) return;
    sfx.unlock();
    if (it.text === target.text) return success(el);
    oops(el);
    if (level.kind === 'read') {
      await say(`Ça, c'est : ${it.speak}. Lis encore le mot !`);
      // after two mistakes, help by reading the syllables slowly
      if (misses >= 2 && target.parts) await say(`Écoute : ${target.parts.join('… ')}.`, { rate: 0.7 });
    } else {
      await say(`Celui-là, c'est : ${it.speak}. Essaie encore !`);
      await say(`Cherche : ${target.speak}.`);
    }
  }

  async function pickSyllable(s: string): Promise<void> {
    if (locked) return;
    sfx.unlock();
    const parts = target.parts!;
    const el = [...choices.querySelectorAll<HTMLElement>('.choice:not(.used)')].find((c) => c.getAttribute('aria-label') === s);
    if (!el) return;
    if (s === parts[built]) {
      sfx.place();
      el.classList.add('used');
      const box = stage.querySelectorAll('.slot-box')[built];
      box.replaceChildren(blockImg('plaque'), h('span', { class: `glyph len${Math.min(s.length, 4)}` }, s));
      box.classList.add('filled');
      built++;
      if (built === parts.length) return success(box as HTMLElement);
      void say(s, { rate: 0.8 });
    } else {
      oops(el);
      await say(`Celui-là, c'est : ${s}.`);
      await say(`Écoute : ${parts.join('… ')}.`, { rate: 0.75 });
    }
  }

  void say(`Niveau ${levelNo}. ${level.intro}`)
    .then(() => wait(200))
    .then(nextRound);
}
