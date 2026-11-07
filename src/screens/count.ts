// Activité « Compter » : 6 niveaux.
// 1–3 : toucher chaque bloc pour le compter (la voix dit « un, deux… ») puis choisir le chiffre (jusqu'à 4, 6, 10).
// 4   : coup d'œil — les blocs (rangés comme sur un dé) se cachent après 2 secondes.
// 5–6 : additions avec deux tas de blocs (jusqu'à 6, puis 10).
import { say, sfx } from '../audio';
import { foxSVG } from '../pixel';
import { currentLevel, endSession } from '../levels';
import { BLOCK_TYPES, pickWeighted, record, type BlockType } from '../state';
import { blockImg, giveBlock, h, levelButton, rand, rewardType, shuffle, SPEAKER_SVG, topBar, wait } from '../ui';
import { rewardScreen } from './reward';
import type { Ctx } from './types';

const WORDS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix'];

interface Level {
  name: string;
  mode: 'count' | 'flash' | 'add';
  min: number;
  max: number;
  choices: number;
}

const LEVELS: Level[] = [
  { name: "Compter jusqu'à 4", mode: 'count', min: 1, max: 4, choices: 3 },
  { name: "Compter jusqu'à 6", mode: 'count', min: 1, max: 6, choices: 3 },
  { name: "Compter jusqu'à 10", mode: 'count', min: 3, max: 10, choices: 4 },
  { name: "Coup d'œil", mode: 'flash', min: 1, max: 6, choices: 4 },
  { name: 'Additions petites', mode: 'add', min: 2, max: 6, choices: 3 },
  { name: 'Additions grandes', mode: 'add', min: 4, max: 10, choices: 4 },
];
export const COUNT_MAX_LEVEL = LEVELS.length;

/** dice layout on a 3×3 grid */
const DICE: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};
const FLASH_MS = 2000;
const ROUNDS = 5;

export function countScreen(ctx: Ctx): void {
  const levelNo = currentLevel('count');
  const level = LEVELS[levelNo - 1];
  const pool = Array.from({ length: level.max - level.min + 1 }, (_, i) => String(level.min + i));
  let round = 0;
  let firstTry = 0;
  let missed = false;
  let streak = 0;
  let target = 0;
  let a = 0; // first term of an addition
  let counted = 0;
  let locked = false;
  const won: BlockType[] = [];

  const progress = h('div', { class: 'progress' });
  for (let i = 0; i < ROUNDS; i++) progress.append(h('span'));
  const bubble = h('div', { class: 'bubble' }, '');
  const pile = h('div', { class: 'pile' });
  const answers = h('div', { class: 'choices numbers' });
  const replay = h('button', { class: 'btn-icon speaker', 'aria-label': 'Réécouter', html: SPEAKER_SVG });
  replay.onclick = () => void (level.mode === 'flash' ? flash() : ask());

  ctx.root.append(
    h(
      'main',
      { class: 'screen activity' },
      topBar(() => ctx.go('home'), levelButton('count', levelNo, COUNT_MAX_LEVEL, LEVELS.map((l) => l.name), () => ctx.go('count'))),
      progress,
      h('div', { class: 'hero small' }, h('div', { class: 'fox-btn', html: foxSVG(90) }), bubble, replay),
      pile,
      answers,
      h('div', { class: 'ground' }),
    ),
  );

  function ask(): Promise<void> {
    if (level.mode === 'add') {
      bubble.textContent = `${a} + ${target - a} = ?`;
      return say(`Combien font ${WORDS[a]} plus ${WORDS[target - a]} ?`);
    }
    bubble.textContent = 'Combien de blocs ?';
    if (level.mode === 'flash') return say('Combien y avait-il de blocs ?');
    return say(counted === 0 ? 'Combien y a-t-il de blocs ? Touche-les pour les compter !' : 'Combien y a-t-il de blocs ?');
  }

  async function flash(): Promise<void> {
    pile.classList.remove('covered');
    bubble.textContent = 'Regarde bien !';
    await say('Regarde bien !');
    await wait(FLASH_MS);
    pile.classList.add('covered');
    await ask();
  }

  function blockButton(type: BlockType): HTMLElement {
    const b = h('button', { class: 'pile-block', 'aria-label': 'bloc' }, blockImg(type));
    if (level.mode !== 'flash') b.onclick = () => countBlock(b);
    return b;
  }

  function nextRound(): void {
    if (round >= ROUNDS) return rewardScreen(ctx, won, 'count', endSession('count', firstTry, ROUNDS, COUNT_MAX_LEVEL));
    locked = false;
    missed = false;
    counted = 0;
    target = Number(pickWeighted(pool, String(target)));
    const type = rand(BLOCK_TYPES.filter((t) => t !== 'glass'));
    pile.replaceChildren();
    pile.className = 'pile';

    if (level.mode === 'add') {
      a = 1 + Math.floor(Math.random() * (target - 1));
      const typeB = rand(BLOCK_TYPES.filter((t) => t !== 'glass' && t !== type));
      const groupA = h('div', { class: 'group' });
      const groupB = h('div', { class: 'group' });
      for (let i = 0; i < a; i++) groupA.append(blockButton(type));
      for (let i = 0; i < target - a; i++) groupB.append(blockButton(typeB));
      pile.classList.add('sum');
      pile.append(groupA, h('div', { class: 'plus' }, '+'), groupB);
    } else if (level.mode === 'flash') {
      pile.classList.add('dice');
      const cells = DICE[target];
      for (let i = 0; i < 9; i++) pile.append(cells.includes(i) ? blockButton(type) : h('span'));
    } else {
      for (let i = 0; i < target; i++) pile.append(blockButton(type));
    }

    const options = new Set<number>([target]);
    const lo = Math.max(1, target - 3);
    const hi = Math.min(10, target + 3);
    while (options.size < level.choices) options.add(lo + Math.floor(Math.random() * (hi - lo + 1)));
    answers.replaceChildren(...shuffle([...options]).map(makeAnswer));
    void (level.mode === 'flash' ? flash() : ask());
  }

  function countBlock(b: HTMLElement): void {
    if (b.classList.contains('counted')) return;
    sfx.tap();
    counted++;
    b.classList.add('counted');
    b.dataset.n = String(counted);
    void say(WORDS[counted] ?? String(counted), { rate: 1 });
  }

  function makeAnswer(n: number): HTMLElement {
    const label = String(n);
    const b = h('button', { class: 'choice', 'aria-label': label }, blockImg('plaque'), h('span', { class: `glyph len${label.length}` }, label));
    b.onclick = () => void pick(n, b);
    return b;
  }

  async function pick(n: number, el: HTMLElement): Promise<void> {
    if (locked) return;
    sfx.unlock();
    const statId = `count:${level.mode}:${target}`;
    if (n === target) {
      locked = true;
      record(statId, !missed);
      if (!missed) firstTry++;
      streak++;
      sfx.good();
      el.classList.add('good');
      pile.classList.remove('covered');
      const t = rewardType(streak);
      won.push(t);
      giveBlock(t, el);
      progress.children[round]?.classList.add('done');
      round++;
      if (level.mode === 'add') {
        bubble.textContent = `${a} + ${target - a} = ${target}`;
        await say(`Oui ! ${WORDS[a]} plus ${WORDS[target - a]}, ça fait ${WORDS[target]} !`);
      } else {
        bubble.textContent = `Oui, ${target} !`;
        await say(`Oui ! Il y a ${WORDS[target]} bloc${target > 1 ? 's' : ''} !`);
      }
      await wait(300);
      nextRound();
    } else {
      if (!missed) record(statId, false);
      missed = true;
      streak = 0;
      sfx.oops();
      el.classList.remove('shake');
      void el.offsetWidth;
      el.classList.add('shake');
      bubble.textContent = 'Essaie encore !';
      if (level.mode === 'flash') {
        await say(`Ça, c'est ${WORDS[n]}. Regarde encore !`);
        await flash();
        return;
      }
      // help: reset the counting so the child can count again, one by one
      pile.querySelectorAll('.counted').forEach((b) => b.classList.remove('counted'));
      counted = 0;
      await say(`Ça, c'est ${WORDS[n]}. Compte ${level.mode === 'add' ? 'tous ' : ''}les blocs avec ton doigt !`);
    }
  }

  void say(`Niveau ${levelNo} : ${level.name.toLowerCase()} !`)
    .then(() => wait(200))
    .then(nextRound);
}
