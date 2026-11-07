// Activité « Compter » : l'enfant touche chaque bloc pour le compter (la voix dit « un, deux, trois… »),
// puis choisit le bon chiffre. On travaille le dénombrement ET la reconnaissance du chiffre.
import { say, sfx } from '../audio';
import { foxSVG } from '../pixel';
import { BLOCK_TYPES, pickWeighted, record, type BlockType } from '../state';
import { blockImg, giveBlock, h, rand, rewardType, shuffle, SPEAKER_SVG, topBar, wait } from '../ui';
import { rewardScreen } from './reward';
import type { Ctx } from './types';

const WORDS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix'];
const NUMBERS = ['1', '2', '3', '4', '5', '6'] as const;
const ROUNDS = 5;

export function countScreen(ctx: Ctx): void {
  let round = 0;
  let streak = 0;
  let target = 1;
  let counted = 0;
  let locked = false;
  const won: BlockType[] = [];

  const progress = h('div', { class: 'progress' });
  for (let i = 0; i < ROUNDS; i++) progress.append(h('span'));
  const bubble = h('div', { class: 'bubble' }, '');
  const pile = h('div', { class: 'pile' });
  const answers = h('div', { class: 'choices numbers' });
  const replay = h('button', { class: 'btn-icon speaker', 'aria-label': 'Réécouter', html: SPEAKER_SVG });
  replay.onclick = () => ask();

  ctx.root.append(
    h(
      'main',
      { class: 'screen activity' },
      topBar(() => ctx.go('home'), 'Compter'),
      progress,
      h('div', { class: 'hero small' }, h('div', { class: 'fox-btn', html: foxSVG(90) }), bubble, replay),
      pile,
      answers,
      h('div', { class: 'ground' }),
    ),
  );

  function ask(): Promise<void> {
    bubble.textContent = 'Combien de blocs ?';
    return say(counted === 0 ? 'Combien y a-t-il de blocs ? Touche-les pour les compter !' : 'Combien y a-t-il de blocs ?');
  }

  function nextRound(): void {
    if (round >= ROUNDS) return rewardScreen(ctx, won, 'count');
    locked = false;
    counted = 0;
    // first rounds stay small, then up to 6
    const pool = round < 2 ? NUMBERS.slice(0, 4) : NUMBERS;
    target = Number(pickWeighted(pool, String(target) as (typeof NUMBERS)[number]));
    const type = rand(BLOCK_TYPES.filter((t) => t !== 'glass'));
    pile.replaceChildren();
    for (let i = 0; i < target; i++) {
      const b = h('button', { class: 'pile-block', 'aria-label': 'bloc' }, blockImg(type));
      b.onclick = () => countBlock(b);
      pile.append(b);
    }
    const options = new Set<number>([target]);
    while (options.size < 3) options.add(1 + Math.floor(Math.random() * 6));
    answers.replaceChildren(...shuffle([...options]).map(makeAnswer));
    void ask();
  }

  function countBlock(b: HTMLElement): void {
    if (b.classList.contains('counted')) return;
    sfx.tap();
    counted++;
    b.classList.add('counted');
    b.dataset.n = String(counted);
    void say(WORDS[counted], { rate: 1 });
  }

  function makeAnswer(n: number): HTMLElement {
    const b = h('button', { class: 'choice', 'aria-label': String(n) }, blockImg('plaque'), h('span', { class: 'glyph' }, String(n)));
    b.onclick = () => void pick(n, b);
    return b;
  }

  async function pick(n: number, el: HTMLElement): Promise<void> {
    if (locked) return;
    sfx.unlock();
    if (n === target) {
      locked = true;
      record(`count:${target}`, true);
      streak++;
      sfx.good();
      el.classList.add('good');
      const t = rewardType(streak);
      won.push(t);
      giveBlock(t, el);
      progress.children[round]?.classList.add('done');
      round++;
      bubble.textContent = `Oui, ${target} !`;
      await say(`Oui ! Il y a ${WORDS[target]} bloc${target > 1 ? 's' : ''} !`);
      await wait(250);
      nextRound();
    } else {
      record(`count:${target}`, false);
      streak = 0;
      sfx.oops();
      el.classList.remove('shake');
      void el.offsetWidth;
      el.classList.add('shake');
      bubble.textContent = 'Essaie encore !';
      // help: reset the counting so the child can count again, one by one
      pile.querySelectorAll('.counted').forEach((b) => b.classList.remove('counted'));
      counted = 0;
      await say(`Ça, c'est ${WORDS[n]}. Compte encore les blocs avec ton doigt !`);
    }
  }

  void say('On va compter les blocs !').then(() => wait(200)).then(nextRound);
}
